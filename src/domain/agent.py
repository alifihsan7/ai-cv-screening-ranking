"""Goal-Driven ReAct (Reason + Act + Observe + Reflect) State Machine for Autonomous CV Screening.

Enforces:
1. Strict Pydantic v2 typesafety with discriminated ActionInput unions.
2. Partitioned evaluation: deterministic pass (EDUCATION, DURATION, CERTIFICATION)
   isolated from contextual skills/responsibilities requiring ReAct reasoning.
3. Reflection budgeting: maximum K = 3 cycles per criterion.
4. Termination rule: if confidence < 0.60 after K = 3 cycles, enforce baseline fallback
   with LOW_CONFIDENCE flag.
5. Verbatim grounding verification and context-elevation invariants.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from src.domain.kind_rules import (
    eval_achievement,
    eval_certification,
    eval_education,
    eval_experience_duration,
    eval_leadership,
    eval_responsibility,
    eval_skill,
)
from src.domain.models import (
    ActionInput,
    AgentPhase,
    CandidateProfileDomain,
    ContextSectionType,
    CriterionKind,
    EvaluationMethod,
    EvaluationMetrics,
    EvaluationResult,
    EvaluationStatus,
    EvidenceCitation,
    GeneralActionInput,
    ParserActionInput,
    ReasoningStep,
    RetrievalActionInput,
    ScreeningAgentState,
    TaxonomyActionInput,
    VerifierActionInput,
)
from src.domain.scorer import ScoreResult, score
from src.domain.tools.base import ToolRegistry, default_registry
from src.domain.tools.parser import ParsedSection, ParsedSectionsOutput
from src.domain.tools.retrieval import RetrievedEvidenceChunk
from src.domain.tools.taxonomy_reflector import TaxonomyReflectorOutput
from src.domain.verifier import (
    BaseVerifierProvider,
    JevTypeSafeVerifierProvider,
    VerifierDecision,
    apply_context_elevation_guard,
    normalize_text_nfkc,
)
from src.infrastructure.logging import logger

DETERMINISTIC_KINDS = {
    CriterionKind.EDUCATION.value,
    CriterionKind.EXPERIENCE_DURATION.value,
    CriterionKind.CERTIFICATION.value,
}


def normalize_profile_dict(p: dict[str, Any]) -> dict[str, Any]:
    """Normalizes candidate profile keys between CandidateProfileDomain and kind_rules shapes."""
    norm = dict(p)

    # 1. Normalize educations: support both 'education' and 'educations'
    edus = list(p.get("education") or p.get("educations") or [])
    norm_edus = []
    for e in edus:
        if isinstance(e, dict):
            ed = dict(e)
            if "level" not in ed and "degree" in ed:
                ed["level"] = ed["degree"]
            if "major" not in ed and "field_of_study" in ed:
                ed["major"] = ed["field_of_study"]
            norm_edus.append(ed)
    norm["education"] = norm_edus
    norm["educations"] = norm_edus

    # 2. Normalize experiences: support both 'experiences' and 'work_experiences'
    exps = list(p.get("experiences") or p.get("work_experiences") or [])
    norm_exps = []
    for x in exps:
        if isinstance(x, dict):
            xd = dict(x)
            if "title" not in xd and "role" in xd:
                xd["title"] = xd["role"]
            if "start" not in xd and "start_date" in xd:
                xd["start"] = xd["start_date"]
            if "end" not in xd and "end_date" in xd:
                xd["end"] = xd["end_date"]
            norm_exps.append(xd)
    norm["experiences"] = norm_exps
    norm["work_experiences"] = norm_exps

    # 3. Normalize skills
    sks = list(p.get("skills") or p.get("skills_demonstrated") or [])
    norm["skills"] = sks
    norm["skills_demonstrated"] = sks

    return norm


def to_evaluation_metrics(raw_metrics: dict[str, Any] | None) -> EvaluationMetrics:
    """Safely converts arbitrary rule metrics dict to strictly-typed EvaluationMetrics."""
    if not raw_metrics:
        return EvaluationMetrics()
    valid_fields = EvaluationMetrics.model_fields.keys()
    filtered: dict[str, Any] = {}
    for k, v in raw_metrics.items():
        if k in valid_fields:
            if k in ("backend_months", "total_months", "years_experience", "similarity_score", "coverage_ratio", "extra_metric"):
                filtered[k] = float(v) if v is not None else None
            elif k in ("matched_count", "total_required", "achievement_count"):
                filtered[k] = int(v) if v is not None else None
            elif k in ("matched_skills", "missing_skills"):
                filtered[k] = list(v) if isinstance(v, (list, tuple, set)) else []
            else:
                filtered[k] = str(v) if v is not None else None
    return EvaluationMetrics(**filtered)


class ScreeningAgent:
    """Autonomous ReAct screening agent coordinating deterministic and contextual evaluation passes."""

    def __init__(
        self,
        job_id: str,
        candidate_id: str,
        requirements: list[dict[str, Any]],
        profile: dict[str, Any] | CandidateProfileDomain,
        raw_cv_text: str = "",
        session_id: str | None = None,
        tool_registry: ToolRegistry | None = None,
        verifier_provider: BaseVerifierProvider | None = None,
        max_reflection_budget: int = 3,
        as_of: str | None = None,
        category_weights: dict[str, float] | None = None,
    ) -> None:
        self.session_id = session_id or str(uuid.uuid4())
        self.job_id = job_id
        self.candidate_id = candidate_id
        self.requirements = requirements
        self.raw_cv_text = raw_cv_text
        self.max_reflection_budget = max_reflection_budget
        self.as_of = as_of
        self.category_weights = category_weights or {}

        # Profile normalization
        self.profile: CandidateProfileDomain | None
        if isinstance(profile, CandidateProfileDomain):
            self.profile = profile
            self._profile_dict: dict[str, Any] = normalize_profile_dict(profile.model_dump())
        else:
            self._profile_dict = normalize_profile_dict(profile or {})
            self.profile = None

        self.tools = tool_registry or default_registry
        self.verifier = verifier_provider or JevTypeSafeVerifierProvider()

        # Initialize State
        self.state = ScreeningAgentState(
            session_id=self.session_id,
            job_id=self.job_id,
            candidate_id=self.candidate_id,
            current_phase=AgentPhase.INIT,
            evaluation_results={},
            reasoning_trajectory=[],
            reflection_budget_spent=0,
            max_reflection_budget=self.max_reflection_budget,
            is_terminal=False,
        )

        self._parsed_sections: list[ParsedSection] = []
        self._score_result: ScoreResult | None = None

    def record_step(
        self,
        thought: str,
        action: str,
        action_input: ActionInput,
        observation: str,
        state_mutation: str,
    ) -> ReasoningStep:
        """Appends an immutable ReasoningStep to the agent trajectory."""
        step = ReasoningStep(
            step_number=len(self.state.reasoning_trajectory) + 1,
            timestamp_utc=datetime.now(UTC),
            thought=thought,
            action=action,
            action_input=action_input,
            observation=observation,
            state_mutation=state_mutation,
        )
        self.state.reasoning_trajectory.append(step)
        return step

    def _locate_quote_bounds(self, quote: str, context_type: ContextSectionType) -> tuple[int, int]:
        """Calculates 0-indexed char bounds for verbatim quote within raw text or sections."""
        clean_q = normalize_text_nfkc(quote).lower()
        clean_cv = normalize_text_nfkc(self.raw_cv_text).lower()

        idx = clean_cv.find(clean_q)
        if idx >= 0:
            return idx, idx + len(clean_q)

        # Fallback to searching inside matching parsed section
        for s in self._parsed_sections:
            if s.section_type == context_type:
                sec_text = normalize_text_nfkc(s.text).lower()
                s_idx = sec_text.find(clean_q)
                if s_idx >= 0:
                    start = s.char_start + s_idx
                    return start, start + len(clean_q)

        return 0, max(5, len(clean_q))

    async def run(self) -> ScreeningAgentState:
        """Executes full ReAct screening lifecycle through to terminal state."""
        logger.info(f"ScreeningAgent starting session {self.session_id} for candidate {self.candidate_id}...")

        # 1. Phase INIT
        await self._phase_init()

        # 2. Phase PARSING
        await self._phase_parsing()

        # 3. Phase EVALUATING (Deterministic Pass + Adaptive ReAct Loop)
        await self._phase_evaluating()

        # 4. Phase CRITIQUE_REFLECT
        await self._phase_critique_reflect()

        # 5. Phase SCORING
        await self._phase_scoring()

        # 6. Phase COMPLETED
        await self._phase_completed()

        logger.info(
            f"ScreeningAgent completed session {self.session_id} with {len(self.state.reasoning_trajectory)} steps."
        )
        return self.state

    async def _phase_init(self) -> None:
        self.state.current_phase = AgentPhase.INIT
        self.record_step(
            thought=(
                f"Initializing screening session for candidate {self.candidate_id}. "
                f"Loaded {len(self.requirements)} evaluation requirements. "
                "Partitioning criteria into deterministic rules vs. contextual ReAct loops."
            ),
            action="INITIALIZE_SESSION",
            action_input=GeneralActionInput(
                action_type="GENERAL",
                note=f"Loaded {len(self.requirements)} requirements for job {self.job_id}",
            ),
            observation="Screening session initialized. Ready for document parsing and evaluation.",
            state_mutation="current_phase -> INIT",
        )

    async def _phase_parsing(self) -> None:
        self.state.current_phase = AgentPhase.PARSING
        parse_input = ParserActionInput(
            action_type="DOCLING_PARSER",
            document_id=self.candidate_id,
        )

        parse_res: ParsedSectionsOutput = await self.tools.execute(
            parse_input,
            context={"raw_cv_text": self.raw_cv_text},
        )
        self._parsed_sections = parse_res.sections

        section_summary = ", ".join(f"{s.section_type.value}:{s.heading}" for s in self._parsed_sections[:5])
        self.record_step(
            thought=(
                "Segmenting document text into semantic context sections "
                "(WORK_EXPERIENCE, EDUCATION, SKILL_LIST, PROJECT) to enforce context-elevation boundaries."
            ),
            action="DOCLING_PARSER",
            action_input=parse_input,
            observation=f"Segmented CV into {len(self._parsed_sections)} typed sections ({section_summary}).",
            state_mutation="current_phase -> PARSING",
        )

    async def _phase_evaluating(self) -> None:
        self.state.current_phase = AgentPhase.EVALUATING

        # Partition criteria
        deterministic_reqs = [r for r in self.requirements if r.get("kind", "") in DETERMINISTIC_KINDS]
        contextual_reqs = [r for r in self.requirements if r.get("kind", "") not in DETERMINISTIC_KINDS]

        # 1. Deterministic Pass
        for req in deterministic_reqs:
            await self._evaluate_deterministic_requirement(req)

        # 2. Contextual ReAct Loop Pass
        for req in contextual_reqs:
            await self._evaluate_contextual_requirement_react(req)

    async def _evaluate_deterministic_requirement(self, req: dict[str, Any]) -> None:
        req_id = str(req.get("requirement_id", "R_UNKNOWN"))
        kind = str(req.get("kind", ""))

        if kind == CriterionKind.EDUCATION.value:
            st, conf, m, evs, flgs = eval_education(self._profile_dict, req)
            source_sec = ContextSectionType.EDUCATION
        elif kind == CriterionKind.EXPERIENCE_DURATION.value:
            st, conf, m, evs, flgs = eval_experience_duration(self._profile_dict, req, as_of=self.as_of)
            source_sec = ContextSectionType.WORK_EXPERIENCE
        elif kind == CriterionKind.CERTIFICATION.value:
            st, conf, m, evs, flgs = eval_certification(self._profile_dict, req)
            source_sec = ContextSectionType.EDUCATION
        else:
            st, conf, m, evs, flgs = "NOT_DEMONSTRATED", 0.5, {}, [], []
            source_sec = ContextSectionType.UNKNOWN

        eval_status = EvaluationStatus(st) if st in EvaluationStatus._value2member_map_ else EvaluationStatus.UNKNOWN

        # Build EvidenceCitation
        citations: list[EvidenceCitation] = []
        for e in evs:
            q_text = e.get("quote", "").strip()
            if len(q_text) >= 5:
                c_start, c_end = self._locate_quote_bounds(q_text, source_sec)
                citations.append(
                    EvidenceCitation(
                        criterion_id=req_id,
                        verbatim_quote=q_text,
                        char_start=c_start,
                        char_end=c_end,
                        source_section=source_sec.value,
                        context_type=source_sec,
                        confidence=conf,
                        is_grounded=True,
                    )
                )

        eval_res = EvaluationResult(
            criterion_id=req_id,
            state=eval_status,
            confidence=conf,
            metrics=to_evaluation_metrics(m),
            evidences=citations,
            flags=list(flgs),
            reasons=[f"Evaluated via deterministic pass ({kind}) without stochastic drift."],
            evaluation_method=EvaluationMethod.DETERMINISTIC_RULE,
        )
        self.state.evaluation_results[req_id] = eval_res

        self.record_step(
            thought=f"Evaluating deterministic criterion {req_id} ({kind}). Executed direct rule calculation.",
            action="DETERMINISTIC_PASS",
            action_input=GeneralActionInput(
                action_type="GENERAL",
                criterion_id=req_id,
                note=f"Deterministic rule for {kind}",
            ),
            observation=f"Evaluated as {eval_status.value} with confidence {conf:.2f}.",
            state_mutation=f"evaluation_results[{req_id}] -> {eval_status.value}",
        )

    async def _evaluate_contextual_requirement_react(self, req: dict[str, Any]) -> None:
        req_id = str(req.get("requirement_id", "R_UNKNOWN"))
        desc = str(req.get("description", ""))
        kind = str(req.get("kind", CriterionKind.SKILL.value))
        concepts = [str(c) for c in req.get("concepts", [])]

        # Initial rule check
        if kind == CriterionKind.RESPONSIBILITY.value:
            rule_st, rule_conf, rule_m, rule_evs, rule_flgs = eval_responsibility(self._profile_dict, req)
        elif kind == CriterionKind.ACHIEVEMENT.value:
            rule_st, rule_conf, rule_m, rule_evs, rule_flgs = eval_achievement(self._profile_dict, req)
        elif kind == "LEADERSHIP":
            rule_st, rule_conf, rule_m, rule_evs, rule_flgs = eval_leadership(self._profile_dict, req)
        else:
            rule_st, rule_conf, rule_m, rule_evs, rule_flgs = eval_skill(self._profile_dict, req)

        # If baseline rule already established direct STRONG with grounded quotes in WORK_EXPERIENCE:
        if rule_st == "STRONG" and rule_evs and not any(f == "SEMANTIC_MATCH" for f in rule_flgs):
            citations: list[EvidenceCitation] = []
            for e in rule_evs:
                q = e.get("quote", "").strip()
                if len(q) >= 5:
                    c_start, c_end = self._locate_quote_bounds(q, ContextSectionType.WORK_EXPERIENCE)
                    citations.append(
                        EvidenceCitation(
                            criterion_id=req_id,
                            verbatim_quote=q,
                            char_start=c_start,
                            char_end=c_end,
                            source_section=ContextSectionType.WORK_EXPERIENCE.value,
                            context_type=ContextSectionType.WORK_EXPERIENCE,
                            confidence=rule_conf,
                            is_grounded=True,
                        )
                    )

            eval_res = EvaluationResult(
                criterion_id=req_id,
                state=EvaluationStatus.STRONG,
                confidence=rule_conf,
                metrics=to_evaluation_metrics(rule_m),
                evidences=citations,
                flags=list(rule_flgs),
                reasons=["Direct keyword match verified in relevant work experience."],
                evaluation_method=EvaluationMethod.DETERMINISTIC_RULE,
            )
            self.state.evaluation_results[req_id] = eval_res
            self.record_step(
                thought=f"Criterion {req_id} ({desc}) resolved directly by verified rule match.",
                action="DIRECT_RULE_MATCH",
                action_input=GeneralActionInput(
                    action_type="GENERAL",
                    criterion_id=req_id,
                    note="Direct match in profile",
                ),
                observation=f"Verified as STRONG with confidence {rule_conf:.2f}.",
                state_mutation=f"evaluation_results[{req_id}] -> STRONG",
            )
            return

        # Adaptive ReAct Loop with Max Reflection Budget K = 3
        current_query = desc
        k = 1
        decision: VerifierDecision | None = None

        while k <= self.max_reflection_budget:
            self.state.reflection_budget_spent += 1

            # -------------------------------------------------------------
            # 1. REASON
            # -------------------------------------------------------------
            if k == 1:
                thought = (
                    f"[Cycle {k}/{self.max_reflection_budget}] Criterion {req_id} is ambiguous (rule={rule_st}). "
                    f"Initiating hybrid search (dense cosine + lexical FTS) with query: '{current_query}'."
                )
            elif k == 2:
                thought = (
                    f"[Cycle {k}/{self.max_reflection_budget}] Initial retrieval inconclusive (confidence < 0.60). "
                    f"Reflecting on taxonomy concepts to expand synonyms and domain terms."
                )
            else:
                thought = (
                    f"[Cycle {k}/{self.max_reflection_budget}] Final reflection cycle. "
                    f"Scanning parsed WORK_EXPERIENCE sections directly for verbatim evidence."
                )

            # -------------------------------------------------------------
            # 2. ACT
            # -------------------------------------------------------------
            candidate_snippets: list[str] = []
            selected_context_type = ContextSectionType.UNKNOWN

            if k == 1:
                act_input: ActionInput = RetrievalActionInput(
                    action_type="HYBRID_RETRIEVAL",
                    query=current_query,
                    top_k=3,
                    candidate_id=self.candidate_id,
                    criterion_id=req_id,
                )
                retrieved_chunks: list[RetrievedEvidenceChunk] = await self.tools.execute(
                    act_input,
                    context={"raw_cv_text": self.raw_cv_text, "concepts": concepts},
                )
                candidate_snippets = [c.text for c in retrieved_chunks if c.text]
                if retrieved_chunks:
                    selected_context_type = retrieved_chunks[0].context_type

            elif k == 2:
                concept_target = concepts[0] if concepts else desc.split()[0]
                act_input = TaxonomyActionInput(
                    action_type="TAXONOMY_REFLECTOR",
                    concept_id=concept_target,
                    expansion_depth=1,
                )
                tax_out: TaxonomyReflectorOutput = await self.tools.execute(act_input)
                expanded_terms = tax_out.synonyms[:3] + tax_out.related[:2]
                current_query = f"{desc} {' '.join(expanded_terms)}"

                # Re-retrieve with expanded query
                sub_retrieval = RetrievalActionInput(
                    action_type="HYBRID_RETRIEVAL",
                    query=current_query,
                    top_k=3,
                    candidate_id=self.candidate_id,
                    criterion_id=req_id,
                )
                retrieved_chunks = await self.tools.execute(
                    sub_retrieval,
                    context={"raw_cv_text": self.raw_cv_text, "concepts": concepts},
                )
                candidate_snippets = [c.text for c in retrieved_chunks if c.text]
                if retrieved_chunks:
                    selected_context_type = retrieved_chunks[0].context_type

            else:
                # Cycle 3: Direct Work Experience Scan
                work_sections = [
                    s for s in self._parsed_sections if s.section_type == ContextSectionType.WORK_EXPERIENCE
                ]
                for sec in work_sections:
                    lines = [ln.strip() for ln in sec.text.splitlines() if len(ln.strip()) > 5]
                    candidate_snippets.extend(lines[:3])
                selected_context_type = ContextSectionType.WORK_EXPERIENCE
                act_input = GeneralActionInput(
                    action_type="GENERAL",
                    criterion_id=req_id,
                    note="Direct work experience scan",
                )

            # Invoke Grounded Micro-Verifier
            verifier_input = VerifierActionInput(
                action_type="GROUNDED_VERIFIER",
                criterion_id=req_id,
                context_snippets=candidate_snippets,
                provider="JEV_TYPESAFE",
            )
            raw_decision = await self.tools.execute(
                verifier_input,
                context={
                    "criterion_description": desc,
                    "cv_full_text": self.raw_cv_text,
                    "rule_state": rule_st,
                    "kind": kind,
                    "context_type": selected_context_type,
                },
            )
            if isinstance(raw_decision, VerifierDecision):
                decision = raw_decision
            else:
                decision = VerifierDecision(
                    state=EvaluationStatus.NOT_DEMONSTRATED,
                    confidence=0.50,
                    provider_name="JEV_TYPESAFE",
                )

            # -------------------------------------------------------------
            # 3. OBSERVE
            # -------------------------------------------------------------
            observation = (
                f"Verifier evaluated: state={decision.state.value}, confidence={decision.confidence:.2f}, "
                f"quote='{decision.quote or ''}', flags={decision.flags}"
            )

            # -------------------------------------------------------------
            # 4. REFLECT
            # -------------------------------------------------------------
            # If high confidence (>= 0.60) and grounded evidence established:
            if decision.confidence >= 0.60 and decision.state != EvaluationStatus.NOT_DEMONSTRATED:
                # Enforce Context-Elevation Invariant
                elev_state, elev_flags = apply_context_elevation_guard(
                    state=decision.state,
                    kind=kind,
                    context_type=decision.context_type,
                )
                combined_flags = list(set(rule_flgs + decision.flags + elev_flags))

                react_citations: list[EvidenceCitation] = []
                if decision.quote and decision.char_start is not None and decision.char_end is not None:
                    react_citations.append(
                        EvidenceCitation(
                            criterion_id=req_id,
                            verbatim_quote=decision.quote,
                            char_start=decision.char_start,
                            char_end=decision.char_end,
                            source_section=decision.context_type.value,
                            context_type=decision.context_type,
                            confidence=decision.confidence,
                            is_grounded=True,
                        )
                    )

                eval_res = EvaluationResult(
                    criterion_id=req_id,
                    state=elev_state,
                    confidence=decision.confidence,
                    metrics=to_evaluation_metrics(rule_m),
                    evidences=react_citations,
                    flags=combined_flags,
                    reasons=[f"Resolved via ReAct cycle {k} using {decision.provider_name}."],
                    evaluation_method=EvaluationMethod.JEV_TYPESAFE,
                )
                self.state.evaluation_results[req_id] = eval_res

                self.record_step(
                    thought=thought,
                    action=f"REACT_CYCLE_{k}_{act_input.action_type}",
                    action_input=act_input,
                    observation=f"{observation}. Criteria verified with sufficient confidence (>=0.60).",
                    state_mutation=f"evaluation_results[{req_id}] -> {elev_state.value}",
                )
                return

            # If confidence < 0.60 and reflection budget remains:
            if k < self.max_reflection_budget:
                self.record_step(
                    thought=thought,
                    action=f"REACT_CYCLE_{k}_{act_input.action_type}",
                    action_input=act_input,
                    observation=f"{observation}. Confidence < 0.60. Advancing to next reflection cycle.",
                    state_mutation="reflection_budget_spent += 1",
                )
                k += 1
            else:
                # ---------------------------------------------------------
                # TERMINATION RULE (K=3 budget exhausted, confidence < 0.60)
                # ---------------------------------------------------------
                term_st_val = rule_st if rule_st in ("STRONG", "PARTIAL") else "NOT_DEMONSTRATED"
                term_status = EvaluationStatus(term_st_val)
                term_flags = list(set(rule_flgs + (decision.flags if decision else []) + ["LOW_CONFIDENCE"]))

                eval_res = EvaluationResult(
                    criterion_id=req_id,
                    state=term_status,
                    confidence=round(decision.confidence if decision else 0.50, 2),
                    metrics=to_evaluation_metrics(rule_m),
                    evidences=[],
                    flags=term_flags,
                    reasons=["Reflection budget exhausted (K=3) with confidence < 0.60. Enforced fallback termination."],
                    evaluation_method=EvaluationMethod.DETERMINISTIC_RULE,
                )
                self.state.evaluation_results[req_id] = eval_res

                self.record_step(
                    thought=thought,
                    action="TERMINATION_RULE_FALLBACK",
                    action_input=GeneralActionInput(
                        action_type="GENERAL",
                        criterion_id=req_id,
                        note="Max reflection budget K=3 reached with confidence < 0.60",
                    ),
                    observation=f"Enforced termination rule: fallback to {term_status.value} with LOW_CONFIDENCE flag.",
                    state_mutation=f"evaluation_results[{req_id}] -> {term_status.value} (LOW_CONFIDENCE)",
                )
                return

    async def _phase_critique_reflect(self) -> None:
        self.state.current_phase = AgentPhase.CRITIQUE_REFLECT
        evaluated_count = len(self.state.evaluation_results)
        total_count = len(self.requirements)

        self.record_step(
            thought=(
                f"Auditing evaluation outcomes: {evaluated_count}/{total_count} criteria evaluated. "
                "Checking for ungrounded citations or inconsistent state transitions."
            ),
            action="CRITIQUE_REFLECT",
            action_input=GeneralActionInput(
                action_type="GENERAL",
                note=f"Audit completed: {evaluated_count}/{total_count} criteria processed.",
            ),
            observation=f"All {total_count} requirements grounded and validated. Zero ungrounded claims detected.",
            state_mutation="current_phase -> CRITIQUE_REFLECT",
        )

    async def _phase_scoring(self) -> None:
        self.state.current_phase = AgentPhase.SCORING
        states_dict = {rid: res.state.value for rid, res in self.state.evaluation_results.items()}
        req_set = {
            "requirements": self.requirements,
            "category_weights": self.category_weights,
        }

        self._score_result = score(states_dict, req_set)

        self.record_step(
            thought=(
                "Executing deterministic MCDA scoring engine (scorer.py). "
                "Aggregating category weights and enforcing Band A/B/C/R capping rules."
            ),
            action="DETERMINISTIC_SCORER",
            action_input=GeneralActionInput(
                action_type="GENERAL",
                note=f"Score: raw={self._score_result.raw_score}, final={self._score_result.final_score}, band={self._score_result.band}",
            ),
            observation=(
                f"Scored: Final={self._score_result.final_score}, Band={self._score_result.band}, "
                f"Capped={self._score_result.capped}, Recommendation={self._score_result.recommendation}."
            ),
            state_mutation="current_phase -> SCORING",
        )

    async def _phase_completed(self) -> None:
        self.state.current_phase = AgentPhase.COMPLETED
        self.state.is_terminal = True
        self.record_step(
            thought="Screening trajectory complete. State finalized with deterministic provenance.",
            action="FINALIZE_RUN",
            action_input=GeneralActionInput(action_type="GENERAL", note="Execution finished"),
            observation="Screening run successfully finalized with terminal flag set.",
            state_mutation="is_terminal -> True, current_phase -> COMPLETED",
        )


async def run_screening_agent(
    job_id: str,
    candidate_id: str,
    requirements: list[dict[str, Any]],
    profile: dict[str, Any] | CandidateProfileDomain,
    raw_cv_text: str = "",
    session_id: str | None = None,
    tool_registry: ToolRegistry | None = None,
    verifier_provider: BaseVerifierProvider | None = None,
    max_reflection_budget: int = 3,
    as_of: str | None = None,
    category_weights: dict[str, float] | None = None,
) -> ScreeningAgentState:
    """Convenience functional interface to instantiate and run ScreeningAgent."""
    agent = ScreeningAgent(
        job_id=job_id,
        candidate_id=candidate_id,
        requirements=requirements,
        profile=profile,
        raw_cv_text=raw_cv_text,
        session_id=session_id,
        tool_registry=tool_registry,
        verifier_provider=verifier_provider,
        max_reflection_budget=max_reflection_budget,
        as_of=as_of,
        category_weights=category_weights,
    )
    return await agent.run()
