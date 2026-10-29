"""Comprehensive unit test suite for Fase 2: Domain Tools, Jev TypeSafe Micro-Verifier, and ReAct State Machine."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from src.domain.agent import ScreeningAgent, run_screening_agent
from src.domain.models import (
    AgentPhase,
    ContextSectionType,
    CriterionKind,
    EvaluationMethod,
    EvaluationStatus,
    ParserActionInput,
    RetrievalActionInput,
    TaxonomyActionInput,
    VerifierActionInput,
)
from src.domain.tools.base import default_registry
from src.domain.tools.parser import DoclingParserTool
from src.domain.tools.retrieval import HybridRetrievalTool
from src.domain.tools.taxonomy_reflector import TaxonomyReflectorTool
from src.domain.tools.verifier import GroundedVerifierTool
from typesafe_sdk import ChoiceAnswer, SystemOneResponse, Usage
from src.domain.verifier import (
    JevTypeSafeVerifierProvider,
    LLMGatewayVerifierProvider,
    VerifierDecision,
    apply_context_elevation_guard,
    normalize_text_nfkc,
    verify_grounding,
)
from tests.conftest import RUN_LIVE_JEV, mock_jev_client

# ===========================================================================
# 1. Guardrail verify_grounding Tests
# ===========================================================================


class TestVerifyGroundingGuardrail:
    def test_valid_grounding_substring(self):
        raw_cv = "Senior Software Engineer with 5 years of Python and PostgreSQL experience."
        snippets = ["Senior Software Engineer with 5 years of Python and PostgreSQL experience."]
        quote = "Python and PostgreSQL"

        is_grounded, reason = verify_grounding(quote, raw_cv, snippets)
        assert is_grounded is True
        assert reason == "VERIFIED"

    def test_unicode_nfkc_normalization(self):
        # Quote with non-breaking space and full-width characters
        raw_cv = "Architected high-throughput microservices using FastAPI."
        snippets = ["Architected high-throughput microservices using FastAPI."]
        # Use full-width 'F' or non-breaking space
        quote = "high-throughput\u00a0microservices"

        is_grounded, reason = verify_grounding(quote, raw_cv, snippets)
        assert is_grounded is True
        assert reason == "VERIFIED"

    def test_whitespace_collapsing(self):
        raw_cv = "Designed and   deployed\n\n\tdistributed   systems."
        snippets = ["Designed and deployed distributed systems."]
        quote = "Designed   and  deployed distributed"

        is_grounded, reason = verify_grounding(quote, raw_cv, snippets)
        assert is_grounded is True
        assert reason == "VERIFIED"

    def test_quote_too_short(self):
        raw_cv = "Proficient in Go, C++, and Python."
        snippets = ["Proficient in Go, C++, and Python."]

        # Empty quote
        assert verify_grounding("", raw_cv, snippets) == (False, "QUOTE_TOO_SHORT")

        # 2 characters
        assert verify_grounding("Go", raw_cv, snippets) == (False, "QUOTE_TOO_SHORT")

        # 4 characters
        assert verify_grounding("C++", raw_cv, snippets) == (False, "QUOTE_TOO_SHORT")

        # Whitespace padded short quote
        assert verify_grounding("   Py   ", raw_cv, snippets) == (False, "QUOTE_TOO_SHORT")

    def test_quote_not_in_cv(self):
        raw_cv = "Worked as a Frontend React Developer."
        snippets = ["Senior Kubernetes Cluster Administrator with 10 years experience."]
        quote = "Kubernetes Cluster Administrator"

        is_grounded, reason = verify_grounding(quote, raw_cv, snippets)
        assert is_grounded is False
        assert reason == "GROUNDING_FAIL_NOT_IN_CV"

    def test_quote_not_in_snippet(self):
        raw_cv = "Led team of 8 backend engineers. Spearheaded migration to AWS."
        snippets = ["Graduated from Institut Teknologi Bandung in Computer Science."]
        quote = "Spearheaded migration to AWS"

        is_grounded, reason = verify_grounding(quote, raw_cv, snippets)
        assert is_grounded is False
        assert reason == "GROUNDING_FAIL_NOT_IN_SNIPPET"

    def test_normalize_text_nfkc_helper(self):
        res = normalize_text_nfkc("Hello\u00a0\u00a0\n\tWorld   123")
        assert res == "Hello World 123"


# ===========================================================================
# 2. Context-Elevation Invariant Tests
# ===========================================================================


class TestContextElevationInvariant:
    def test_responsibility_in_skill_list_downgraded_to_partial(self):
        # A responsibility claim appearing only in a skills list block must NOT be STRONG
        status, flags = apply_context_elevation_guard(
            state=EvaluationStatus.STRONG,
            kind=CriterionKind.RESPONSIBILITY,
            context_type=ContextSectionType.SKILL_LIST,
        )
        assert status == EvaluationStatus.PARTIAL
        assert "CONTEXT_ELEVATION_DOWNGRADE" in flags

    def test_duration_in_project_downgraded_to_partial(self):
        # Experience duration in academic project context cannot be STRONG
        status, flags = apply_context_elevation_guard(
            state=EvaluationStatus.STRONG,
            kind=CriterionKind.EXPERIENCE_DURATION,
            context_type=ContextSectionType.PROJECT,
        )
        assert status == EvaluationStatus.PARTIAL
        assert "CONTEXT_ELEVATION_DOWNGRADE" in flags

    def test_responsibility_in_work_experience_stays_strong(self):
        # In work experience context, STRONG is preserved
        status, flags = apply_context_elevation_guard(
            state=EvaluationStatus.STRONG,
            kind=CriterionKind.RESPONSIBILITY,
            context_type=ContextSectionType.WORK_EXPERIENCE,
        )
        assert status == EvaluationStatus.STRONG
        assert flags == []

    def test_partial_state_not_mutated(self):
        status, flags = apply_context_elevation_guard(
            state=EvaluationStatus.PARTIAL,
            kind=CriterionKind.RESPONSIBILITY,
            context_type=ContextSectionType.SKILL_LIST,
        )
        assert status == EvaluationStatus.PARTIAL
        assert flags == []


# ===========================================================================
# 3. Provider Decoupling: Jev vs LLM Gateway
# ===========================================================================


def _mock_jev_client(choice: str, confidence: float) -> AsyncMock:
    """Mocked TypeSafe client answering every per-chunk question with the same Choice."""
    answer = ChoiceAnswer(type="choice", choice=choice, confidence=confidence, probabilities={choice: confidence})

    async def _system_one(state, questions, **kwargs):
        return SystemOneResponse(model="jev-latest", usage=Usage(), answers={k: answer for k in questions})

    client = AsyncMock()
    client.system_one.side_effect = _system_one
    return client


_PY_CV_TEXT = (
    "Professional Experience:\n"
    "Senior Backend Engineer at TechCorp (2020 - 2024).\n"
    "Built distributed microservices architecture using Python, FastAPI, and PostgreSQL."
)
_PY_SNIPPETS = ["Built distributed microservices architecture using Python, FastAPI, and PostgreSQL."]


class TestVerifierProviders:
    @pytest.mark.asyncio
    async def test_jev_typesafe_verifier_strong_decision(self):
        mock_client = _mock_jev_client("STRONG", 0.91)
        provider = JevTypeSafeVerifierProvider(client=mock_client)

        decision = await provider.verify(
            criterion_id="R_PYTHON",
            criterion_description="Python microservices architecture",
            candidate_chunks=_PY_SNIPPETS,
            cv_full_text=_PY_CV_TEXT,
            kind=CriterionKind.SKILL,
            context_type=ContextSectionType.WORK_EXPERIENCE,
        )

        sent_state = mock_client.system_one.call_args.kwargs["state"]
        assert sent_state["evidence_sections"] == {"chunk_0": "WORK_EXPERIENCE"}
        assert sent_state["evidence_chunks"] == {"chunk_0": _PY_SNIPPETS[0]}
        assert "Professional Experience" not in str(sent_state)  # full CV text never sent

        assert isinstance(decision, VerifierDecision)
        assert decision.state == EvaluationStatus.STRONG
        assert decision.confidence == pytest.approx(0.91)
        assert decision.provider_name == "JEV_TYPESAFE"
        assert decision.quote is not None
        assert "Python" in decision.quote
        assert decision.char_start is not None
        assert decision.char_end is not None
        assert decision.char_end > decision.char_start

    @pytest.mark.asyncio
    async def test_jev_quote_comes_from_the_chunk_jev_judged_strong(self):
        """With several chunks, the decision and its quote rest on the same chunk."""
        weak = "Attended a Python microservices webinar in 2021."
        strong = "Led the migration of 14 Python microservices to Kubernetes at TechCorp."
        verdicts = {"chunk_0": ("NOT_DEMONSTRATED", 0.88), "chunk_1": ("STRONG", 0.93)}

        async def _system_one(state, questions, **kwargs):
            answers = {
                k: ChoiceAnswer(type="choice", choice=c, confidence=p, probabilities={c: p})
                for k, (c, p) in verdicts.items()
            }
            return SystemOneResponse(model="jev-latest", usage=Usage(), answers=answers)

        mock_client = AsyncMock()
        mock_client.system_one.side_effect = _system_one
        provider = JevTypeSafeVerifierProvider(client=mock_client)

        decision = await provider.verify(
            criterion_id="R_MS",
            criterion_description="Python microservices",
            candidate_chunks=[weak, strong],
            cv_full_text=f"{weak}\n{strong}",
            kind=CriterionKind.SKILL,
            context_type=ContextSectionType.WORK_EXPERIENCE,
        )

        assert decision.state == EvaluationStatus.STRONG
        assert decision.confidence == pytest.approx(0.93)
        assert decision.quote is not None
        assert decision.quote in strong
        assert "webinar" not in decision.quote

    @pytest.mark.asyncio
    async def test_decision_context_and_guard_follow_the_decisive_chunk(self):
        """Each chunk is sent with its own section, and the guard uses the section of the chunk decided on."""
        project = "Tugas akhir sistem perpustakaan dibangun dengan FastAPI, PostgreSQL, dan Docker."
        skills = "Keahlian: Python, FastAPI, PostgreSQL, Docker, Git"
        mock_client = _mock_jev_client("STRONG", 0.92)
        provider = JevTypeSafeVerifierProvider(client=mock_client)

        decision = await provider.verify(
            criterion_id="R5",
            criterion_description="Docker",
            candidate_chunks=[project, skills],
            cv_full_text=f"{project}\n{skills}",
            kind=CriterionKind.SKILL,
            context_type=ContextSectionType.UNKNOWN,
            chunk_contexts=[ContextSectionType.PROJECT, ContextSectionType.SKILL_LIST],
        )

        sent = mock_client.system_one.call_args.kwargs["state"]
        assert sent["evidence_sections"] == {"chunk_0": "PROJECT", "chunk_1": "SKILL_LIST"}
        # Project-only evidence cannot be STRONG for a skill
        assert decision.state == EvaluationStatus.PARTIAL
        assert "CONTEXT_ELEVATION_DOWNGRADE" in decision.flags
        assert decision.context_type == ContextSectionType.PROJECT

    @pytest.mark.asyncio
    async def test_job_evidence_for_a_skill_stays_strong(self):
        bullet = "Mengemas seluruh layanan backend memakai Docker pada lingkungan produksi."
        provider = JevTypeSafeVerifierProvider(client=_mock_jev_client("STRONG", 0.92))

        decision = await provider.verify(
            criterion_id="R5",
            criterion_description="Docker",
            candidate_chunks=[bullet],
            cv_full_text=bullet,
            kind=CriterionKind.SKILL,
            chunk_contexts=[ContextSectionType.WORK_EXPERIENCE],
        )

        assert decision.state == EvaluationStatus.STRONG
        assert decision.context_type == ContextSectionType.WORK_EXPERIENCE
        assert "CONTEXT_ELEVATION_DOWNGRADE" not in decision.flags

    @pytest.mark.asyncio
    async def test_capped_chunk_cannot_outrank_an_equally_strong_job_chunk(self):
        """A skills line judged STRONG with higher confidence must lose to a STRONG job bullet."""
        skills_line = "Keahlian: Python, Django, Flask, PostgreSQL, Docker, AWS"
        job_bullet = "Mengintegrasikan layanan backend dengan AWS (S3 dan SQS) pada produksi."
        verdicts = {"chunk_0": 0.97, "chunk_1": 0.90}  # both STRONG; the skills line is the more confident

        async def _system_one(state, questions, **kwargs):
            answers = {
                k: ChoiceAnswer(type="choice", choice="STRONG", confidence=c, probabilities={"STRONG": c})
                for k, c in verdicts.items()
            }
            return SystemOneResponse(model="jev-latest", usage=Usage(), answers=answers)

        mock_client = AsyncMock()
        mock_client.system_one.side_effect = _system_one
        provider = JevTypeSafeVerifierProvider(client=mock_client)

        decision = await provider.verify(
            criterion_id="R6",
            criterion_description="AWS",
            candidate_chunks=[skills_line, job_bullet],
            cv_full_text=f"{skills_line}\n{job_bullet}",
            kind=CriterionKind.SKILL,
            chunk_contexts=[ContextSectionType.SKILL_LIST, ContextSectionType.WORK_EXPERIENCE],
        )

        assert decision.state == EvaluationStatus.STRONG
        assert decision.context_type == ContextSectionType.WORK_EXPERIENCE
        assert decision.quote is not None and "S3" in decision.quote
        assert "CONTEXT_ELEVATION_DOWNGRADE" not in decision.flags

    @pytest.mark.asyncio
    @pytest.mark.skipif(not RUN_LIVE_JEV, reason="Live TypeSafe API test; set RUN_LIVE_JEV=1 to run")
    async def test_jev_typesafe_live_api_strong_decision(self):
        """Opt-in smoke test against the real TypeSafe API using the key from .env."""
        provider = JevTypeSafeVerifierProvider()

        decision = await provider.verify(
            criterion_id="R_PYTHON",
            criterion_description="Python microservices architecture",
            candidate_chunks=_PY_SNIPPETS,
            cv_full_text=_PY_CV_TEXT,
            kind=CriterionKind.SKILL,
            context_type=ContextSectionType.WORK_EXPERIENCE,
        )

        assert decision.state == EvaluationStatus.STRONG
        assert decision.confidence >= 0.60
        assert decision.quote is not None and "Python" in decision.quote

    @pytest.mark.asyncio
    async def test_jev_typesafe_grounding_failure_annulment(self):
        provider = JevTypeSafeVerifierProvider(client=_mock_jev_client("STRONG", 0.9))
        cv_text = "Experienced in Java Spring Boot development."
        # Snippets has a hallucinated or external quote
        snippets = ["Spearheaded Kubernetes architecture on Google Cloud Platform."]

        decision = await provider.verify(
            criterion_id="R_K8S",
            criterion_description="Kubernetes architecture",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            rule_state=EvaluationStatus.PARTIAL,
            kind=CriterionKind.SKILL,
        )

        # Grounding check failed because quote is not in cv_text
        assert decision.state == EvaluationStatus.PARTIAL
        assert "GROUNDING_FAIL" in decision.flags
        assert decision.quote is None

    @pytest.mark.asyncio
    async def test_jev_typesafe_context_elevation_enforced(self):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="STRONG",
            confidence=0.92,
            probabilities={"STRONG": 0.92, "PARTIAL": 0.05, "NOT_DEMONSTRATED": 0.03},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(),
            answers={"chunk_0": choice_ans},
        )
        mock_client = AsyncMock()
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(client=mock_client)
        cv_text = "Skills: Microservices, Architecture, Distributed Systems, Python."
        snippets = ["Skills: Microservices, Architecture, Distributed Systems, Python."]

        decision = await provider.verify(
            criterion_id="R_RESP",
            criterion_description="Architecture and Distributed Systems",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.RESPONSIBILITY,
            context_type=ContextSectionType.SKILL_LIST,
        )

        # Even though terms match, context is SKILL_LIST for a RESPONSIBILITY criterion -> downgraded to PARTIAL
        assert decision.state == EvaluationStatus.PARTIAL
        assert "CONTEXT_ELEVATION_DOWNGRADE" in decision.flags

    @pytest.mark.asyncio
    async def test_llm_gateway_provider_success(self):
        provider = LLMGatewayVerifierProvider()
        cv_text = "Senior Python Engineer with 6 years experience."
        snippets = ["Senior Python Engineer with 6 years experience."]

        mock_response = {
            "state": "STRONG",
            "quote": "Senior Python Engineer with 6 years experience",
            "reason": "Clear senior python experience.",
        }

        with (
            patch("src.domain.verifier._get_db_cache", return_value=None),
            patch("src.domain.verifier.gateway.call_chat", new_callable=AsyncMock) as mock_call,
        ):
            mock_call.return_value = mock_response
            decision = await provider.verify(
                criterion_id="R_PY",
                criterion_description="Senior Python",
                candidate_chunks=snippets,
                cv_full_text=cv_text,
                kind=CriterionKind.SKILL,
                context_type=ContextSectionType.WORK_EXPERIENCE,
            )

            assert decision.state == EvaluationStatus.STRONG
            assert decision.quote == "Senior Python Engineer with 6 years experience"
            assert decision.provider_name == "LLM_VERIFIED"
            assert decision.flags == []

    @pytest.mark.asyncio
    async def test_llm_gateway_provider_timeout(self):
        provider = LLMGatewayVerifierProvider(timeout=0.01)
        cv_text = "Python engineer."
        snippets = ["Python engineer."]

        async def slow_call(*args, **kwargs):
            await asyncio.sleep(0.5)
            return {"state": "STRONG", "quote": "Python engineer"}

        with patch("src.domain.verifier.gateway.call_chat", side_effect=slow_call):
            decision = await provider.verify(
                criterion_id="R_PY",
                criterion_description="Python",
                candidate_chunks=snippets,
                cv_full_text=cv_text,
                rule_state=EvaluationStatus.PARTIAL,
            )

            assert decision.state == EvaluationStatus.PARTIAL
            assert "VERIFIER_TIMEOUT" in decision.flags


# ===========================================================================
# 4. Domain Tools Abstraction Tests
# ===========================================================================


class TestDomainTools:
    def test_default_registry_contains_tools(self):
        tools = default_registry.list_tools()
        assert "hybrid_retrieval" in tools
        assert "taxonomy_reflector" in tools
        assert "docling_parser" in tools
        assert "grounded_verifier" in tools

    @pytest.mark.asyncio
    async def test_taxonomy_reflector_expansion(self):
        tool = TaxonomyReflectorTool()
        input_data = TaxonomyActionInput(
            action_type="TAXONOMY_REFLECTOR",
            concept_id="python",
            expansion_depth=1,
        )
        res = await tool.run(input_data)
        assert res.canonical_name.lower() == "python"
        assert len(res.synonyms) > 0
        assert any("py" in s.lower() for s in res.synonyms)

    @pytest.mark.asyncio
    async def test_docling_parser_sections(self):
        tool = DoclingParserTool()
        cv_markdown = (
            "# Work Experience\n"
            "Backend Developer at Alpha Corp (2021-2023).\n\n"
            "# Education\n"
            "Bachelor of Computer Science, Universitas Indonesia.\n\n"
            "# Skills\n"
            "Python, FastAPI, Docker, PostgreSQL."
        )
        input_data = ParserActionInput(
            action_type="DOCLING_PARSER",
            document_id="cand_123",
        )
        res = await tool.run(input_data, context={"raw_cv_text": cv_markdown})

        assert len(res.sections) == 3
        types = [s.section_type for s in res.sections]
        assert ContextSectionType.WORK_EXPERIENCE in types
        assert ContextSectionType.EDUCATION in types
        assert ContextSectionType.SKILL_LIST in types

    @pytest.mark.asyncio
    async def test_hybrid_retrieval_tool(self):
        tool = HybridRetrievalTool()
        raw_text = (
            "Developed high-performance ingestion engines in Python.\n"
            "Designed relational schemas in PostgreSQL.\n"
            "Built frontend components in React."
        )
        input_data = RetrievalActionInput(
            action_type="HYBRID_RETRIEVAL",
            query="Python ingestion engine",
            top_k=2,
            candidate_id="cand_123",
        )
        chunks = await tool.run(input_data, context={"raw_cv_text": raw_text})
        assert len(chunks) > 0
        assert "ingestion engines in Python" in chunks[0].text
        assert chunks[0].score > 0.0

    @pytest.mark.asyncio
    async def test_grounded_verifier_tool_dispatch(self):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="STRONG",
            confidence=0.95,
            probabilities={"STRONG": 0.95, "PARTIAL": 0.04, "NOT_DEMONSTRATED": 0.01},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(),
            answers={"chunk_0": choice_ans},
        )
        mock_client = AsyncMock()
        mock_client.system_one.return_value = mock_response

        tool = GroundedVerifierTool(jev_provider=JevTypeSafeVerifierProvider(client=mock_client))
        input_data = VerifierActionInput(
            action_type="GROUNDED_VERIFIER",
            criterion_id="R1",
            context_snippets=["Built microservices in Python."],
            provider="JEV_TYPESAFE",
        )
        decision = await tool.run(
            input_data,
            context={
                "criterion_description": "Python microservices",
                "cv_full_text": "Built microservices in Python.",
                "context_type": ContextSectionType.WORK_EXPERIENCE,
            },
        )
        assert isinstance(decision, VerifierDecision)
        assert decision.state == EvaluationStatus.STRONG
        assert decision.provider_name == "JEV_TYPESAFE"


# ===========================================================================
# 5. ReAct State Machine & Reflection Budget (K=3) Tests
# ===========================================================================


class TestReActStateMachineAndBudget:
    @pytest.mark.asyncio
    async def test_deterministic_pass_executes_without_react_loop(self):
        requirements = [
            {
                "requirement_id": "R_EDU",
                "description": "Minimal S1 Ilmu Komputer",
                "kind": "EDUCATION",
                "category": "EDUCATION_CERT",
                "importance": "MUST_HAVE",
                "weight": 15.0,
                "params": {"min_degree": "S1", "fields": ["Ilmu Komputer", "Informatika"]},
            },
            {
                "requirement_id": "R_EXP",
                "description": "Minimal 3 tahun pengalaman kerja",
                "kind": "EXPERIENCE_DURATION",
                "category": "EXPERIENCE",
                "importance": "MUST_HAVE",
                "weight": 35.0,
                "params": {"min_months": 36},
            },
        ]
        profile = {
            "educations": [
                {
                    "institution": "Universitas Indonesia",
                    "degree": "S1",
                    "field_of_study": "Ilmu Komputer",
                    "graduation_year": 2020,
                }
            ],
            "work_experiences": [
                {
                    "company": "Tech Corp",
                    "role": "Backend Engineer",
                    "start_date": "2020-01",
                    "end_date": "2023-12",
                    "responsibilities": ["Developed backend systems"],
                }
            ],
        }

        agent = ScreeningAgent(
            job_id="job_01",
            candidate_id="cand_det_01",
            requirements=requirements,
            profile=profile,
            raw_cv_text="S1 Ilmu Komputer UI. Backend Engineer at Tech Corp 2020-01 to 2023-12.",
            verifier_provider=JevTypeSafeVerifierProvider(client=mock_jev_client()),
        )
        state = await agent.run()

        assert state.is_terminal is True
        assert state.current_phase == AgentPhase.COMPLETED
        assert len(state.evaluation_results) == 2

        # Check deterministic evaluation methods
        for rid in ("R_EDU", "R_EXP"):
            res = state.evaluation_results[rid]
            assert res.evaluation_method == EvaluationMethod.DETERMINISTIC_RULE
            assert res.state == EvaluationStatus.STRONG

        # Check that reflection budget was not spent for deterministic pass
        assert state.reflection_budget_spent == 0

    @pytest.mark.asyncio
    async def test_react_loop_resolves_contextual_skill(self):
        requirements = [
            {
                "requirement_id": "R_FASTAPI",
                "description": "Experience building REST APIs with FastAPI",
                "kind": "SKILL",
                "category": "HARD_SKILLS",
                "importance": "MUST_HAVE",
                "weight": 20.0,
                "concepts": ["fastapi", "python"],
            }
        ]
        cv_text = (
            "# Experience\n"
            "Backend Engineer at CloudCorp (2021 - 2024).\n"
            "Developed robust asynchronous REST APIs using FastAPI and Pydantic.\n\n"
            "# Skills\n"
            "Python, FastAPI, Docker, PostgreSQL."
        )
        profile = {
            "skills": ["Python", "FastAPI"],
            "work_experiences": [
                {
                    "company": "CloudCorp",
                    "role": "Backend Engineer",
                    "start_date": "2021-01",
                    "end_date": "2024-01",
                    "responsibilities": ["Developed robust asynchronous REST APIs using FastAPI and Pydantic."],
                }
            ],
        }

        agent = ScreeningAgent(
            job_id="job_01",
            candidate_id="cand_fastapi_01",
            requirements=requirements,
            profile=profile,
            raw_cv_text=cv_text,
        )
        state = await agent.run()

        assert state.is_terminal is True
        res = state.evaluation_results["R_FASTAPI"]
        assert res.state == EvaluationStatus.STRONG
        assert res.confidence >= 0.70
        assert len(res.evidences) > 0
        assert "FastAPI" in res.evidences[0].verbatim_quote
        assert res.evidences[0].is_grounded is True

    @pytest.mark.asyncio
    async def test_react_loop_enforces_max_reflection_budget_k_3_termination(self):
        # A requirement for an obscure skill completely absent from CV
        requirements = [
            {
                "requirement_id": "R_COBOL",
                "description": "10+ years mainframe COBOL legacy banking systems migration",
                "kind": "SKILL",
                "category": "HARD_SKILLS",
                "importance": "MUST_HAVE",
                "weight": 25.0,
                "concepts": ["cobol"],
            }
        ]
        cv_text = (
            "# Experience\n"
            "Junior Frontend Developer (2023 - 2024).\n"
            "Built user interfaces with Vue.js and Tailwind CSS."
        )
        profile = {
            "skills": ["Vue.js", "Tailwind CSS"],
            "work_experiences": [
                {
                    "company": "Frontend Studio",
                    "role": "Junior Frontend Developer",
                    "start_date": "2023-01",
                    "end_date": "2024-01",
                    "responsibilities": ["Built user interfaces with Vue.js and Tailwind CSS."],
                }
            ],
        }

        agent = ScreeningAgent(
            job_id="job_01",
            candidate_id="cand_cobol_absent",
            requirements=requirements,
            profile=profile,
            raw_cv_text=cv_text,
            max_reflection_budget=3,
        )
        state = await agent.run()

        # Invariant checks:
        # 1. Terminal state reached
        assert state.is_terminal is True
        assert state.current_phase == AgentPhase.COMPLETED

        # 2. Reflection budget exactly exhausted (K = 3)
        assert state.reflection_budget_spent == 3

        # 3. Termination rule enforced: fallback to NOT_DEMONSTRATED with LOW_CONFIDENCE flag
        res = state.evaluation_results["R_COBOL"]
        assert res.state == EvaluationStatus.NOT_DEMONSTRATED
        assert "LOW_CONFIDENCE" in res.flags
        assert any("Reflection budget exhausted (K=3)" in r for r in res.reasons)

        # 4. Trajectory contains termination step
        traj_actions = [s.action for s in state.reasoning_trajectory]
        assert "TERMINATION_RULE_FALLBACK" in traj_actions

    @pytest.mark.asyncio
    async def test_state_trajectory_records_typed_steps(self):
        requirements = [
            {
                "requirement_id": "R1",
                "description": "Python skill",
                "kind": "SKILL",
                "category": "HARD_SKILLS",
                "importance": "MUST_HAVE",
                "weight": 20.0,
                "concepts": ["python"],
            }
        ]
        cv_text = "Senior Python developer building services."
        profile = {"skills": ["Python"]}

        state = await run_screening_agent(
            job_id="job_01",
            candidate_id="cand_test_01",
            requirements=requirements,
            profile=profile,
            raw_cv_text=cv_text,
        )

        assert len(state.reasoning_trajectory) >= 4

        # Verify step properties
        for idx, step in enumerate(state.reasoning_trajectory, 1):
            assert step.step_number == idx
            assert step.thought != ""
            assert step.action != ""
            assert step.observation != ""
            assert step.state_mutation != ""
            assert hasattr(step.action_input, "action_type")
