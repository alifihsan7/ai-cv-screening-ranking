"""TypeSafe Domain Verifier: Decoupled Provider Pattern, Jev Micro-Verifier, and Strict Code-Level Grounding Guardrails."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
import unicodedata
import uuid
from abc import ABC, abstractmethod
from typing import Any

import httpx
from pydantic import BaseModel, Field
from typesafe_sdk import (
    AsyncTypeSafeClient,
    Choice,
    ChoiceAnswer,
    Noul,
    NoulAnswer,
    NoulCriteria,
    Question,
    Score,
    ScoreAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
    TypeSafeError,
)

from src.domain.models import ContextSectionType, CriterionKind, EvaluationStatus, split_quote_spans
from src.domain.retrieval import extract_granular_evidence_quote
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.infrastructure.gateway import gateway
from src.infrastructure.logging import logger
from src.infrastructure.typesafe import load_typesafe_config

VALID_STATES = {"STRONG", "PARTIAL", "NOT_DEMONSTRATED"}
VERIFIER_PROMPT_VERSION = "v1"


class TypeSafeUnconfiguredError(RuntimeError):
    """Raised when TypeSafe Jev System One is invoked without valid credentials."""
    pass


async def record_jev_call(
    criterion_id: str,
    primitive_type: str,
    model: str,
    latency_ms: float,
    input_tokens: int,
    output_tokens: int,
    decision_value: str,
    confidence: float,
    grounding_valid: bool,
    run_id: str | uuid.UUID | None = None,
    candidate_id: str | None = None,
) -> None:
    """Records a live TypeSafe Jev System One call telemetry to `jev_calls` table."""
    try:
        parsed_run_id = None
        if run_id:
            try:
                parsed_run_id = uuid.UUID(str(run_id))
            except ValueError:
                parsed_run_id = None

        cand_str = str(candidate_id) if candidate_id is not None else None

        async with get_connection() as conn, conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO jev_calls (
                    run_id, candidate_id, criterion_id, primitive_type,
                    model, latency_ms, input_tokens, output_tokens,
                    decision_value, confidence, grounding_valid
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    parsed_run_id,
                    cand_str,
                    criterion_id,
                    primitive_type,
                    model,
                    float(latency_ms),
                    int(input_tokens),
                    int(output_tokens),
                    str(decision_value),
                    float(confidence),
                    bool(grounding_valid),
                ),
            )
            await conn.commit()
    except Exception as e:
        logger.warning(f"Failed to record jev call telemetry: {e}")


STANDARD_ROLE_FAMILIES: list[str] = [
    "BACKEND",
    "FRONTEND",
    "FULLSTACK",
    "DEVOPS_SRE",
    "DATA_AI",
    "MOBILE",
    "NON_TECHNICAL",
]

ROLE_FAMILY_CRITERIA: dict[str, str] = {
    "BACKEND": "Backend engineering, server-side APIs, microservices, databases, distributed systems, and core backend logic.",
    "FRONTEND": "Frontend web development, UI/UX engineering, client-side web applications, HTML/CSS, React, Vue, Angular.",
    "FULLSTACK": "Both server-side backend and client-side frontend web engineering across the entire technology stack.",
    "DEVOPS_SRE": "DevOps, Site Reliability Engineering (SRE), CI/CD pipelines, cloud infrastructure, Kubernetes, Docker, and Linux sysadmin.",
    "DATA_AI": "Data engineering, data science, machine learning, AI, ETL pipelines, analytics, and business intelligence (BI).",
    "MOBILE": "Mobile application development for iOS, Android, Flutter, React Native, Swift, or Kotlin.",
    "NON_TECHNICAL": "Non-technical or non-software roles, such as HR, recruiting, sales, marketing, finance, accounting, or civil construction.",
}

ROLE_FAMILY_INSTRUCTIONS: str = (
    "Classify the candidate's work experience role into exactly one standard role family "
    "based on the job title and achievement/responsibility context."
)


class RoleFamilyChoiceResult(BaseModel):
    """Structured result of TypeSafe Jev System One CHOICE classification for role family."""

    role_family: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    raw_choice: str
    latency_ms: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0


def build_role_family_state(title: str, bullets: list[Any] | str = "") -> dict[str, Any]:
    """Formats job title and responsibility/achievement context into typed Jev state."""
    if isinstance(bullets, list):
        bullet_lines = []
        for b in bullets:
            t = str(b.get("text", "")).strip() if isinstance(b, dict) else str(b).strip()
            if t:
                bullet_lines.append(f"- {t}")
        formatted_bullets = "\n".join(bullet_lines)
    elif isinstance(bullets, str):
        formatted_bullets = bullets.strip()
    else:
        formatted_bullets = ""

    cleaned_title = title.strip() or "Untitled Role"
    if "\n" in cleaned_title and not formatted_bullets:
        lines = [line.strip() for line in cleaned_title.splitlines() if line.strip()]
        if lines:
            cleaned_title = lines[0]
            formatted_bullets = "\n".join(lines[1:])

    return {
        "job_title": cleaned_title,
        "responsibilities_and_achievements": formatted_bullets or "No details provided.",
    }


_ROLE_FAMILY_TOKENS: tuple[tuple[str, frozenset[str]], ...] = (
    ("BACKEND", frozenset({"BACKEND"})),
    ("FRONTEND", frozenset({"FRONTEND"})),
    ("FULLSTACK", frozenset({"FULLSTACK"})),
    ("DEVOPS_SRE", frozenset({"DEVOPS", "SRE", "INFRA", "INFRASTRUCTURE"})),
    ("DATA_AI", frozenset({"DATA", "AI", "ML", "ANALYTICS", "LEARNING", "MACHINE"})),
    ("MOBILE", frozenset({"MOBILE", "IOS", "ANDROID", "FLUTTER"})),
)


def normalize_role_family_choice(raw_choice: str) -> str:
    """Normalizes raw Jev CHOICE output to one of STANDARD_ROLE_FAMILIES by whole tokens.

    Whole-token matching keeps e.g. "RETAIL" or "MAINTAINER" from being read as "AI".
    """
    cleaned = raw_choice.strip().upper()
    if cleaned in STANDARD_ROLE_FAMILIES:
        return cleaned

    tokens = {t for t in re.split(r"[^A-Z0-9]+", cleaned) if t}
    if {"FULL", "STACK"} <= tokens:
        return "FULLSTACK"
    for family, family_tokens in _ROLE_FAMILY_TOKENS:
        if tokens & family_tokens:
            return family
    return "NON_TECHNICAL"


async def classify_role_family_jev(
    title: str,
    bullets: list[Any] | str = "",
    client: AsyncTypeSafeClient | None = None,
    model: str | None = None,
    timeout: float | None = None,
    candidate_id: str | None = None,
    run_id: str | uuid.UUID | None = None,
    criterion_id: str = "EXPERIENCE_DURATION",
) -> RoleFamilyChoiceResult:
    """Pure Honest Fail-Fast Role Family Classifier using TypeSafe Jev System One CHOICE primitive.

    Invariants enforced:
    1. Honest Fail-Fast: No silent fallback to regex. Raises TypeSafeUnconfiguredError if unconfigured,
       and TypeSafeAPIConnectionError on network/connection failure.
    2. Discrete Standard Label Space: One of STANDARD_ROLE_FAMILIES.
    3. Contextual Grounding: Incorporates job title and responsibilities/achievements bullets.
    4. Full Telemetry Audit: Persists call metrics to `jev_calls`.
    """
    cfg = load_typesafe_config(model=model, timeout=timeout)
    if client is None and not cfg.is_configured:
        raise TypeSafeUnconfiguredError(
            "TypeSafe Jev System One credentials (TYPESAFE_API_KEY) are not configured. "
            "Local emulation is disabled by sovereign architecture doctrine. "
            "Provide a valid API key from https://console.typesafe.ai to execute role family classification."
        )

    state = build_role_family_state(title, bullets)
    choice_q = Choice(
        instructions=ROLE_FAMILY_INSTRUCTIONS,
        criteria=ROLE_FAMILY_CRITERIA,
    )

    start_t = time.perf_counter()
    try:
        if client is not None:
            res = await client.system_one(
                state=state,
                questions={"role_family": choice_q},
                model=cfg.model,
                timeout=cfg.timeout,
            )
        else:
            async with AsyncTypeSafeClient(
                api_key=cfg.api_key,
                base_url=cfg.base_url,
                model=cfg.model,
                timeout=cfg.timeout,
            ) as session_client:
                res = await session_client.system_one(
                    state=state,
                    questions={"role_family": choice_q},
                    model=cfg.model,
                    timeout=cfg.timeout,
                )
    except (TypeSafeAPIConnectionError, TypeSafeAPITimeoutError):
        raise
    except (httpx.ConnectError, httpx.TimeoutException, TimeoutError) as net_err:
        raise TypeSafeAPIConnectionError(f"TypeSafe Jev connection failed: {net_err}") from net_err
    except TypeSafeError:
        raise
    except Exception as err:
        err_str = str(err).lower()
        if any(k in err_str for k in ("connection", "timeout", "connect", "network")):
            raise TypeSafeAPIConnectionError(f"TypeSafe Jev connection error: {err}") from err
        raise

    latency_ms = (time.perf_counter() - start_t) * 1000.0

    choice_ans = res.choices.get("role_family")
    if choice_ans is None:
        raise ValueError("Missing role_family choice answer from System One response")

    raw_choice = choice_ans.choice.upper().strip()
    confidence = float(choice_ans.confidence)
    normalized_choice = normalize_role_family_choice(raw_choice)
    if raw_choice not in STANDARD_ROLE_FAMILIES:
        logger.warning(f"Jev returned non-standard role family '{raw_choice}', normalized to {normalized_choice}")

    input_tokens = int(res.usage.input_tokens or 0) if res.usage else 0
    output_tokens = int(res.usage.output_tokens or 0) if res.usage else 0
    model_used = res.model or cfg.model

    await record_jev_call(
        criterion_id=criterion_id,
        primitive_type="CHOICE",
        model=model_used,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        decision_value=normalized_choice,
        confidence=confidence,
        grounding_valid=True,
        run_id=run_id,
        candidate_id=candidate_id,
    )

    return RoleFamilyChoiceResult(
        role_family=normalized_choice,
        confidence=confidence,
        raw_choice=raw_choice,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )


def normalize_text_nfkc(text: str) -> str:
    """Normalizes text with Unicode NFKC and collapses consecutive whitespace."""
    if not text:
        return ""
    nfkc = unicodedata.normalize("NFKC", text)
    return " ".join(nfkc.split())


def verify_grounding(
    quote: str | list[str],
    raw_cv_text: str,
    context_snippets: list[str] | None = None,
) -> tuple[bool, str]:
    """Strict code-level invariant: Zero hallucination quote verification.

    Supports single-span and multi-span / segmented verbatim quotes.
    Segments may be passed as a list of strings or connected via canonical delimiters:
    e.g., '\\n...\\n' or ' [...] '.

    Invariants enforced:
    1. Unicode canonical NFKC normalization & whitespace collapsing.
    2. Minimum quote length: at least 5 non-whitespace characters total;
       each individual span must be substantive.
    3. Exact substring match in raw CV text (case-insensitive NFKC normalized)
       for EVERY constituent span independently.
    4. Exact substring match in supplied context snippets (case-insensitive normalized)
       for single-span claims. Multi-span qualifications whose evidence is distributed
       across disparate sections or pages are verified against raw CV text.

    Returns:
        (is_grounded: bool, reason: str)
        where reason is 'VERIFIED', 'QUOTE_TOO_SHORT',
        'GROUNDING_FAIL_NOT_IN_CV', or 'GROUNDING_FAIL_NOT_IN_SNIPPET'.
    """
    spans = split_quote_spans(quote)
    if not spans:
        return False, "QUOTE_TOO_SHORT"

    total_clean_chars = sum(len(normalize_text_nfkc(s)) for s in spans)
    if total_clean_chars < 5:
        return False, "QUOTE_TOO_SHORT"

    clean_cv = normalize_text_nfkc(raw_cv_text or "").lower()

    # Verify each span independently in raw_cv_text
    for s in spans:
        clean_span = normalize_text_nfkc(s)
        if len(clean_span) < 3 or (len(spans) == 1 and len(clean_span) < 5):
            return False, "QUOTE_TOO_SHORT"

        span_core = clean_span.strip(".… ")
        if len(span_core) < 3:
            span_core = clean_span

        if clean_span.lower() not in clean_cv and span_core.lower() not in clean_cv:
            return False, "GROUNDING_FAIL_NOT_IN_CV"

    # Context snippet check: all spans must appear in supplied context snippets
    if context_snippets:
        all_snippets = normalize_text_nfkc(" ".join(context_snippets)).lower()
        for s in spans:
            clean_span = normalize_text_nfkc(s)
            span_core = clean_span.strip(".… ")
            if len(span_core) < 3:
                span_core = clean_span
            if clean_span.lower() not in all_snippets and span_core.lower() not in all_snippets:
                return False, "GROUNDING_FAIL_NOT_IN_SNIPPET"

    return True, "VERIFIED"


def apply_context_elevation_guard(
    state: EvaluationStatus | str,
    kind: CriterionKind | str,
    context_type: ContextSectionType | str,
) -> tuple[EvaluationStatus, list[str]]:
    """Context-Elevation Invariant:
    Evidence originating exclusively from a skills block (SKILL_LIST) or biodata/projects
    cannot be established as STRONG for responsibility or duration criteria;
    automatically downgraded to PARTIAL.
    """
    st_val = state.value if isinstance(state, EvaluationStatus) else str(state).upper()
    k_val = kind.value if isinstance(kind, CriterionKind) else str(kind).upper()
    ctx_val = context_type.value if isinstance(context_type, ContextSectionType) else str(context_type).upper()

    try:
        current_status = EvaluationStatus(st_val)
    except ValueError:
        current_status = EvaluationStatus.PARTIAL

    if current_status == EvaluationStatus.STRONG:
        # For responsibility or experience duration requirements:
        if k_val in ("RESPONSIBILITY", "EXPERIENCE_DURATION", "DURATION", "LEADERSHIP"):
            if ctx_val != ContextSectionType.WORK_EXPERIENCE.value:
                return EvaluationStatus.PARTIAL, ["CONTEXT_ELEVATION_DOWNGRADE"]
        elif ctx_val == ContextSectionType.SKILL_LIST.value:
            # Standalone skill list cannot elevate state to STRONG
            return EvaluationStatus.PARTIAL, ["CONTEXT_ELEVATION_DOWNGRADE"]

    return current_status, []


_BINARY_SKILL_WORDS = frozenset({"docker", "git", "github", "gitlab", "linux", "jira", "degree"})


def resolve_jev_primitive_params(
    kind: str | CriterionKind,
    importance: str | None = None,
    concepts: list[str] | None = None,
) -> dict[str, Any]:
    """Resolves TypeSafe System One primitive configuration based on criterion properties.

    Trio Primitives Alignment:
    - RESPONSIBILITY / LEADERSHIP: CHOICE with role polarity (CANDIDATE_DID_IT, OTHERS_DID_IT, etc.)
    - ACHIEVEMENT: SCORE (0-3 proficiency depth)
    - SKILL:
        - Binary tools / nice-to-have: NOUL (binary requirement gate)
        - Core technical skills: SCORE (0-3 proficiency depth)
    - Others: CHOICE (default fallback)
    """
    kind_str = kind.value if isinstance(kind, CriterionKind) else str(kind).upper()
    if kind_str in ("RESPONSIBILITY", "LEADERSHIP"):
        return {"primitive": "polarity", "use_noul": False, "use_score": False}
    elif kind_str == "ACHIEVEMENT":
        return {"primitive": "score", "use_noul": False, "use_score": True}
    elif kind_str == "SKILL":
        is_binary = any(
            c.startswith("cert:") or bool(set(re.findall(r"[a-z0-9+#]+", c)) & _BINARY_SKILL_WORDS)
            for c in (str(c).lower() for c in (concepts or []))
        )
        if is_binary or (importance and str(importance).upper() == "NICE_TO_HAVE"):
            return {"primitive": "noul", "use_noul": True, "use_score": False}
        else:
            return {"primitive": "score", "use_noul": False, "use_score": True}
    return {"primitive": "choice", "use_noul": False, "use_score": False}


class VerifierDecision(BaseModel):
    """Immutable, strongly-typed verifier outcome with grounded provenance."""

    state: EvaluationStatus
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    quote: str | None = None
    spans: list[str] = Field(default_factory=list)
    char_start: int | None = None
    char_end: int | None = None
    context_type: ContextSectionType = ContextSectionType.UNKNOWN
    flags: list[str] = Field(default_factory=list)
    reason: str = ""
    provider_name: str = "base"


def extract_verbatim_quote(
    criterion_description: str,
    candidate_chunks: list[str],
) -> tuple[str | None, float]:
    """Deterministically extracts candidate verbatim quote and keyword density from candidate chunks.

    Integrates extract_granular_evidence_quote as primary driver to isolate qualification
    evidence quotes tightly (< 120 chars) around target keywords and strip foreign section bleed.
    """
    if not candidate_chunks:
        return None, 0.0

    desc_clean = normalize_text_nfkc(criterion_description).lower()
    stopwords = {"with", "and", "the", "for", "years", "experience", "dalam", "yang", "pada", "untuk", "tahun"}
    req_terms = [t for t in re.findall(r"[\w\+\#\.\-]+", desc_clean) if len(t) > 1 and t not in stopwords]
    if not req_terms:
        req_terms = [t for t in re.findall(r"\w+", desc_clean) if len(t) > 2 and t not in stopwords]
    if not req_terms:
        req_terms = re.findall(r"\w+", desc_clean)

    best_score = 0.0
    best_quote: str | None = None

    for chunk in candidate_chunks:
        clean_chunk = normalize_text_nfkc(chunk)
        if not clean_chunk:
            continue

        chunk_lower = clean_chunk.lower()
        matched = [term for term in req_terms if term in chunk_lower]
        if not matched:
            continue

        density = len(matched) / max(len(req_terms), 1)

        candidate_quote = extract_granular_evidence_quote(
            text=clean_chunk,
            target_terms=req_terms,
            max_chars=119,
        )

        if candidate_quote and len(candidate_quote) >= 5 and (density > best_score or best_quote is None):
            best_score = density
            best_quote = candidate_quote

    return best_quote, best_score


_extract_verbatim_quote = extract_verbatim_quote


class BaseVerifierProvider(ABC):
    """Abstract protocol for evidence verification providers."""

    provider_name: str = "base"

    def _extract_verbatim_quote(
        self,
        criterion_description: str,
        candidate_chunks: list[str],
    ) -> tuple[str | None, float]:
        """Deterministically extracts candidate verbatim quote and keyword density from candidate chunks."""
        return extract_verbatim_quote(criterion_description, candidate_chunks)

    @abstractmethod
    async def verify(
        self,
        criterion_id: str,
        criterion_description: str,
        candidate_chunks: list[str],
        cv_full_text: str,
        rule_state: EvaluationStatus | str = EvaluationStatus.PARTIAL,
        kind: CriterionKind | str = CriterionKind.SKILL,
        context_type: ContextSectionType | str = ContextSectionType.UNKNOWN,
        **kwargs: Any,
    ) -> VerifierDecision:
        """Verifies candidate evidence against a criterion."""
        ...


class JevTypeSafeVerifierProvider(BaseVerifierProvider):
    """Jev (TypeSafe) Verifier Provider.

    Strict Production Doctrine:
    - Pure TypeSafe System One live API execution via official `typesafe-sdk`.
    - Honest Fail-Fast: Dilarang keras menggunakan pseudo-Jev / emulasi lokal tiruan.
      Jika `TYPESAFE_API_KEY` belum dikonfigurasi, sistem melempar `TypeSafeUnconfiguredError`.
    - Zero hallucination invariant verified via `verify_grounding()`.
    - Context elevation guard applied via `apply_context_elevation_guard()`.
    """

    provider_name: str = "JEV_TYPESAFE"

    def __init__(
        self,
        endpoint_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
        client: AsyncTypeSafeClient | None = None,
    ) -> None:
        cfg = load_typesafe_config(api_key=api_key, base_url=endpoint_url, model=model, timeout=timeout)
        self.endpoint_url = cfg.base_url
        self.api_key = cfg.api_key
        self.model = cfg.model
        self.timeout = cfg.timeout
        self._client = client

    @property
    def is_live(self) -> bool:
        """Determines whether Live System One mode is enabled."""
        return bool(self._client is not None or self.api_key)

    def _extract_verbatim_quote(
        self,
        criterion_description: str,
        candidate_chunks: list[str],
    ) -> tuple[str | None, float]:
        """Deterministically extracts candidate verbatim quote and keyword density from candidate chunks."""
        return extract_verbatim_quote(criterion_description, candidate_chunks)

    @staticmethod
    def _build_question(criterion_description: str, chunk_key: str, primitive: str) -> Question:
        """Builds one closed question scoped to a single evidence chunk carried in the state."""
        scope = (
            f"Judge only evidence chunk '{chunk_key}' in the state; "
            "'evidence_section' names the CV section the chunks were taken from. "
        )
        if primitive == "noul":
            return Noul(
                instructions=scope + f"Does this evidence satisfy the criterion: '{criterion_description}'?",
                criteria=NoulCriteria(
                    true="The evidence clearly demonstrates or satisfies the criterion.",
                    false="The evidence does not satisfy or demonstrate the criterion.",
                ),
            )
        if primitive == "score":
            return Score(
                instructions=scope
                + (
                    f"Evaluate the candidate's proficiency depth for criterion: '{criterion_description}'. "
                    "0: Unmentioned or no relevant evidence. "
                    "1: Basic, theoretical, academic, or introductory. "
                    "2: Proficient practitioner with direct production experience. "
                    "3: Advanced expert, lead, or architect."
                ),
                criteria=[
                    "No evidence or unmentioned.",
                    "Basic or introductory familiarity.",
                    "Proficient professional practitioner in production.",
                    "Advanced expert, architect, or leadership level.",
                ],
            )
        if primitive == "polarity":
            return Choice(
                instructions=scope
                + (
                    f"Determine candidate role polarity for criterion: '{criterion_description}'. "
                    "CANDIDATE_DID_IT: Candidate directly performed, led, or architected this work. "
                    "OTHERS_DID_IT: Performed by team/external party; candidate only assisted. "
                    "NOT_STATED: Evidence does not mention or establish this criterion. "
                    "NEGATED: Explicitly denies experience in this area. "
                    "ASPIRATIONAL: Theoretical interest or future aspiration without execution."
                ),
                criteria={
                    "CANDIDATE_DID_IT": "Candidate directly executed or led the work.",
                    "OTHERS_DID_IT": "Collaborated or external party led the work.",
                    "NOT_STATED": "No mention or unstated in evidence.",
                    "NEGATED": "Explicitly lacks or denies this experience.",
                    "ASPIRATIONAL": "Interest without production execution.",
                },
            )
        return Choice(
            instructions=scope
            + (
                f"Evaluate the candidate's evidence for criterion: '{criterion_description}'. "
                "Choose STRONG if evidence clearly and directly demonstrates the requirement in professional experience. "
                "Choose PARTIAL if evidence is partial, basic, academic/project, or related without full context. "
                "Choose NOT_DEMONSTRATED if evidence is absent or unaddressed."
            ),
            criteria={
                "STRONG": "Clear, direct, and substantial evidence in professional experience.",
                "PARTIAL": "Partial, academic, introductory, or indirect evidence.",
                "NOT_DEMONSTRATED": "No evidence or not demonstrated.",
            },
        )

    @staticmethod
    def _interpret_answer(primitive: str, chunk_key: str, ans: Any) -> tuple[EvaluationStatus, float, str]:
        """Maps one closed Jev answer to (state, confidence, decision_value)."""
        if primitive == "noul":
            if not isinstance(ans, NoulAnswer):
                raise ValueError(f"Missing noul answer for key '{chunk_key}'")
            prob = float(ans.noul)
            if prob >= 0.70:
                return EvaluationStatus.STRONG, prob, f"{prob:.4f}"
            if prob >= 0.35:
                return EvaluationStatus.PARTIAL, max(0.5, 1.0 - abs(prob - 0.5) * 2), f"{prob:.4f}"
            return EvaluationStatus.NOT_DEMONSTRATED, 1.0 - prob, f"{prob:.4f}"

        if primitive == "score":
            if not isinstance(ans, ScoreAnswer):
                raise ValueError(f"Missing score answer for key '{chunk_key}'")
            score_val = float(ans.score)
            if score_val >= 2.0:
                st = EvaluationStatus.STRONG
            elif score_val >= 0.8:
                st = EvaluationStatus.PARTIAL
            else:
                st = EvaluationStatus.NOT_DEMONSTRATED
            return st, float(ans.confidence), f"{score_val:.2f}"

        if not isinstance(ans, ChoiceAnswer):
            raise ValueError(f"Missing choice answer for key '{chunk_key}'")
        raw_choice = ans.choice.upper()
        if raw_choice == "CANDIDATE_DID_IT":
            st = EvaluationStatus.STRONG
        elif raw_choice in ("OTHERS_DID_IT", "ASPIRATIONAL"):
            st = EvaluationStatus.PARTIAL
        elif raw_choice in ("NEGATED", "NOT_STATED"):
            st = EvaluationStatus.NOT_DEMONSTRATED
        else:
            try:
                st = EvaluationStatus(raw_choice)
            except ValueError:
                st = EvaluationStatus.PARTIAL
        return st, float(ans.confidence), raw_choice

    async def _call_system_one_live(
        self,
        criterion_description: str,
        candidate_chunks: list[str],
        section: ContextSectionType = ContextSectionType.UNKNOWN,
        use_noul: bool = False,
        use_score: bool = False,
        primitive: str | None = None,
    ) -> tuple[EvaluationStatus, float, list[str], dict[str, Any], int]:
        """Judges every evidence chunk separately in one System One call and selects the decisive chunk.

        Only the criterion, the source CV section name, and the evidence chunks are sent; the full CV
        text never leaves the system.
        Returns (state, confidence, flags, telemetry, index of the chunk the decision rests on).
        """
        prim_req = (primitive or "").lower()
        if prim_req == "noul" or use_noul:
            prim, primitive_type = "noul", "NOUL"
        elif prim_req == "score" or use_score:
            prim, primitive_type = "score", "SCORE"
        elif prim_req == "polarity":
            prim, primitive_type = "polarity", "CHOICE"
        else:
            prim, primitive_type = "choice", "CHOICE"

        keys = [f"chunk_{i}" for i in range(len(candidate_chunks))]
        state: dict[str, Any] = {
            "criterion": criterion_description,
            "evidence_section": section.value,
            "evidence_chunks": dict(zip(keys, candidate_chunks, strict=True)),
        }
        questions: dict[str, Question] = {k: self._build_question(criterion_description, k, prim) for k in keys}

        start_time = time.perf_counter()
        if self._client is not None:
            response: SystemOneResponse = await self._client.system_one(
                state=state,
                questions=questions,
                model=self.model,
                timeout=self.timeout,
            )
        else:
            async with AsyncTypeSafeClient(
                api_key=self.api_key,
                base_url=self.endpoint_url,
                model=self.model,
                timeout=self.timeout,
            ) as client:
                response = await client.system_one(
                    state=state,
                    questions=questions,
                    model=self.model,
                    timeout=self.timeout,
                )
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        judged = [
            (*self._interpret_answer(prim, k, response.answers.get(k)), idx) for idx, k in enumerate(keys)
        ]

        # Strongest state among confident judgements (ties: higher confidence, then earlier chunk);
        # if none is confident, the most confident one, which callers then treat as low confidence.
        state_rank = {EvaluationStatus.STRONG: 2, EvaluationStatus.PARTIAL: 1}
        confident = [j for j in judged if j[1] >= settings.VERIFIER_MIN_CONFIDENCE]
        if confident:
            eval_st, conf, decision_value, best_idx = max(confident, key=lambda j: (state_rank.get(j[0], 0), j[1], -j[3]))
        else:
            eval_st, conf, decision_value, best_idx = max(judged, key=lambda j: (j[1], -j[3]))

        in_tokens = int(response.usage.input_tokens) if response.usage and response.usage.input_tokens is not None else 0
        out_tokens = int(response.usage.output_tokens) if response.usage and response.usage.output_tokens is not None else 0

        telemetry = {
            "primitive_type": primitive_type,
            "model": response.model or self.model,
            "latency_ms": latency_ms,
            "input_tokens": in_tokens,
            "output_tokens": out_tokens,
            "decision_value": decision_value,
            "confidence": conf,
        }

        return eval_st, conf, ["TYPESAFE_LIVE"], telemetry, best_idx

    def _quote_from_chunk(self, criterion_description: str, chunk: str) -> str | None:
        """Verbatim quote taken from the chunk Jev's decision rests on."""
        quote, _ = self._extract_verbatim_quote(criterion_description, [chunk])
        if quote:
            return quote
        clean = normalize_text_nfkc(chunk)
        if len(clean) <= 119:
            return clean or None
        cut = clean.rfind(" ", 0, 119)
        return clean[: cut if cut > 0 else 119]

    async def verify(
        self,
        criterion_id: str,
        criterion_description: str,
        candidate_chunks: list[str],
        cv_full_text: str,
        rule_state: EvaluationStatus | str = EvaluationStatus.PARTIAL,
        kind: CriterionKind | str = CriterionKind.SKILL,
        context_type: ContextSectionType | str = ContextSectionType.UNKNOWN,
        **kwargs: Any,
    ) -> VerifierDecision:
        rule_st = EvaluationStatus(rule_state) if isinstance(rule_state, str) else rule_state
        ctx_t = ContextSectionType(context_type) if isinstance(context_type, str) else context_type

        chunks = [c for c in candidate_chunks if c and c.strip()]
        if not chunks or not cv_full_text:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=[],
                reason="No candidate chunks or CV text available.",
                provider_name=self.provider_name,
            )

        use_noul = bool(
            kwargs.get("use_noul", False)
            or kwargs.get("binary_gate", False)
            or kwargs.get("hard_gate", False)
            or kwargs.get("primitive") == "noul"
            or kwargs.get("primitive_type") == "NOUL"
        )
        use_score = bool(
            kwargs.get("use_score", False)
            or kwargs.get("primitive") == "score"
            or kwargs.get("primitive_type") == "SCORE"
        )
        prim = kwargs.get("primitive") or kwargs.get("primitive_type")

        flags: list[str] = []
        eval_state: EvaluationStatus
        confidence: float

        # 1. Evaluate via Live System One (Honest Fail-Fast: No Local Mock/Emulation)
        if not self.is_live:
            raise TypeSafeUnconfiguredError(
                "TypeSafe Jev System One credentials (TYPESAFE_API_KEY) are not configured. "
                "Local emulation is disabled by sovereign architecture doctrine. "
                "Provide a valid API key from https://console.typesafe.ai to execute evaluations."
            )

        eval_state, confidence, live_flags, telemetry, decisive_idx = await self._call_system_one_live(
            criterion_description=criterion_description,
            candidate_chunks=chunks,
            section=ctx_t,
            use_noul=use_noul,
            use_score=use_score,
            primitive=prim,
        )
        flags.extend(live_flags)

        # 2. Quote comes from the chunk Jev's decision rests on, never from a separate keyword pass
        selected_quote: str | None = (
            None
            if eval_state == EvaluationStatus.NOT_DEMONSTRATED
            else self._quote_from_chunk(criterion_description, chunks[decisive_idx])
        )

        # 3. Strict Grounding Verification on verbatim quote
        char_start: int | None = None
        char_end: int | None = None

        run_id_val = kwargs.get("run_id")
        cand_id_val = kwargs.get("candidate_id")

        quote_spans: list[str] = []
        if selected_quote:
            quote_spans = split_quote_spans(selected_quote)
            is_grounded, g_reason = verify_grounding(selected_quote, cv_full_text, chunks)
            if not is_grounded:
                # Telemetry record even if grounding fails, with grounding_valid=False
                await record_jev_call(
                    criterion_id=criterion_id,
                    primitive_type=telemetry["primitive_type"],
                    model=telemetry["model"],
                    latency_ms=telemetry["latency_ms"],
                    input_tokens=telemetry["input_tokens"],
                    output_tokens=telemetry["output_tokens"],
                    decision_value=telemetry["decision_value"],
                    confidence=telemetry["confidence"],
                    grounding_valid=False,
                    run_id=run_id_val,
                    candidate_id=cand_id_val,
                )
                # Grounding failed: verifier decision annulled, fallback to rule_state
                return VerifierDecision(
                    state=rule_st,
                    confidence=0.5,
                    quote=None,
                    spans=[],
                    char_start=None,
                    char_end=None,
                    context_type=ctx_t,
                    flags=["GROUNDING_FAIL", g_reason],
                    reason=f"Grounding invariant violation: {g_reason}",
                    provider_name=self.provider_name,
                )

            # Record successful telemetry with grounding_valid=True
            await record_jev_call(
                criterion_id=criterion_id,
                primitive_type=telemetry["primitive_type"],
                model=telemetry["model"],
                latency_ms=telemetry["latency_ms"],
                input_tokens=telemetry["input_tokens"],
                output_tokens=telemetry["output_tokens"],
                decision_value=telemetry["decision_value"],
                confidence=telemetry["confidence"],
                grounding_valid=True,
                run_id=run_id_val,
                candidate_id=cand_id_val,
            )

            # Compute character offsets across spans in cv_full_text
            norm_cv = normalize_text_nfkc(cv_full_text).lower()
            found_starts: list[int] = []
            found_ends: list[int] = []
            for sp in quote_spans:
                norm_sp = normalize_text_nfkc(sp).lower()
                idx = norm_cv.find(norm_sp)
                if idx >= 0:
                    found_starts.append(idx)
                    found_ends.append(idx + len(norm_sp))

            if found_starts and found_ends and max(found_ends) > min(found_starts):
                char_start = min(found_starts)
                char_end = max(found_ends)
            else:
                norm_quote = normalize_text_nfkc(selected_quote).lower()
                idx = norm_cv.find(norm_quote)
                if idx >= 0:
                    char_start = idx
                    char_end = idx + len(norm_quote)
                else:
                    char_start = 0
                    char_end = max(5, len(selected_quote))
        else:
            # NOT_DEMONSTRATED has no quote claimed, record telemetry with grounding_valid=True
            await record_jev_call(
                criterion_id=criterion_id,
                primitive_type=telemetry["primitive_type"],
                model=telemetry["model"],
                latency_ms=telemetry["latency_ms"],
                input_tokens=telemetry["input_tokens"],
                output_tokens=telemetry["output_tokens"],
                decision_value=telemetry["decision_value"],
                confidence=telemetry["confidence"],
                grounding_valid=True,
                run_id=run_id_val,
                candidate_id=cand_id_val,
            )

        # 4. Context-Elevation Invariant
        elev_state, elev_flags = apply_context_elevation_guard(
            state=eval_state,
            kind=kind,
            context_type=ctx_t,
        )
        flags.extend(elev_flags)

        reason = f"TypeSafe System One ({self.model}) verified."

        return VerifierDecision(
            state=elev_state,
            confidence=confidence,
            quote=selected_quote,
            spans=quote_spans if quote_spans else ([selected_quote] if selected_quote else []),
            char_start=char_start,
            char_end=char_end,
            context_type=ctx_t,
            flags=flags,
            reason=reason,
            provider_name=self.provider_name,
        )


async def _get_db_cache(cache_key: str) -> dict[str, Any] | None:
    try:
        async with get_connection() as conn, conn.cursor() as cur:
            await cur.execute("SELECT output FROM llm_cache WHERE key = %s", (cache_key,))
            row = await cur.fetchone()
            if row and row["output"]:
                return row["output"] if isinstance(row["output"], dict) else json.loads(row["output"])
    except Exception:
        pass
    return None


async def _save_db_cache(cache_key: str, data: dict[str, Any]) -> None:
    try:
        async with get_connection() as conn, conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO llm_cache (key, task, output)
                VALUES (%s, 'verifier', %s)
                ON CONFLICT (key) DO UPDATE SET output = EXCLUDED.output
                """,
                (cache_key, json.dumps(data)),
            )
            await conn.commit()
    except Exception:
        pass


class LLMGatewayVerifierProvider(BaseVerifierProvider):
    """Fallback verifier provider querying local 9Router gateway (http://127.0.0.1:20128/v1)."""

    provider_name: str = "LLM_VERIFIED"

    def __init__(self, endpoint_url: str | None = None, timeout: float = 10.0) -> None:
        self.endpoint_url = endpoint_url
        self.timeout = timeout

    async def verify(
        self,
        criterion_id: str,
        criterion_description: str,
        candidate_chunks: list[str],
        cv_full_text: str,
        rule_state: EvaluationStatus | str = EvaluationStatus.PARTIAL,
        kind: CriterionKind | str = CriterionKind.SKILL,
        context_type: ContextSectionType | str = ContextSectionType.UNKNOWN,
        **kwargs: Any,
    ) -> VerifierDecision:
        rule_st_val = rule_state.value if isinstance(rule_state, EvaluationStatus) else str(rule_state).upper()
        rule_st = EvaluationStatus(rule_st_val) if rule_st_val in VALID_STATES else EvaluationStatus.PARTIAL
        ctx_t = ContextSectionType(context_type) if isinstance(context_type, str) else context_type

        if not cv_full_text or not candidate_chunks:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=[],
                reason="Empty CV text or candidate chunks.",
                provider_name=self.provider_name,
            )

        cache_payload = (
            f"{VERIFIER_PROMPT_VERSION}:{settings.LLM_MODEL_VERIFIER}:"
            f"{criterion_id}:{criterion_description}:{kind}:{rule_st_val}:{':'.join(candidate_chunks)}"
        )
        cache_key = hashlib.sha256(cache_payload.encode()).hexdigest()

        cached_item = await _get_db_cache(cache_key)
        if cached_item:
            cached_st = cached_item.get("state", rule_st_val)
            cached_quote = cached_item.get("quote", "")
            return VerifierDecision(
                state=EvaluationStatus(cached_st),
                confidence=0.9,
                quote=cached_quote if cached_quote else None,
                context_type=ctx_t,
                flags=cached_item.get("flags", []),
                reason="Retrieved from verifier cache.",
                provider_name=self.provider_name,
            )

        prompt = f"""Kamu adalah verifier kualifikasi kandidat CV.
Tugas: Periksa apakah bukti CV mendukung kualifikasi berikut.

Kriteria: {criterion_description}
Kind: {kind}

Potongan teks relevan dari CV kandidat:
{chr(10).join(f"- {s}" for s in candidate_chunks[:3])}

Pilihan status yang diizinkan HANYA:
- STRONG: Bukti sangat jelas dan kuat di pekerjaan yang relevan
- PARTIAL: Bukti sebagian, di proyek, atau relevansi terbatas
- NOT_DEMONSTRATED: Bukti tidak ditemukan atau tidak memadai

Instruksi PENTING:
- JANGAN PERNAH mengeluarkan skor angka!
- Keluarkan JSON persis format:
{{
  "state": "STRONG" | "PARTIAL" | "NOT_DEMONSTRATED",
  "quote": "kutipan persis kata demi kata dari potongan teks di atas",
  "reason": "alasan singkat 1 kalimat"
}}
"""
        messages = [
            {
                "role": "system",
                "content": "Kamu adalah JSON-only assistant. Jawab HANYA dalam JSON valid tanpa markdown formatting.",
            },
            {"role": "user", "content": prompt},
        ]

        try:
            res = await asyncio.wait_for(
                gateway.call_chat(messages, task="verification", json_mode=True),
                timeout=self.timeout,
            )
        except TimeoutError:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=["VERIFIER_TIMEOUT"],
                reason="Verifier call timed out.",
                provider_name=self.provider_name,
            )
        except Exception:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=["VERIFIER_ERROR"],
                reason="Verifier gateway error.",
                provider_name=self.provider_name,
            )

        if not res:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=[],
                reason="Empty gateway response.",
                provider_name=self.provider_name,
            )

        try:
            data = res
            if isinstance(res, str):
                text_str = res.strip()
                m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text_str)
                if m:
                    text_str = m.group(1).strip()
                data = json.loads(text_str)

            if not isinstance(data, dict):
                return VerifierDecision(
                    state=rule_st,
                    confidence=0.5,
                    quote=None,
                    context_type=ctx_t,
                    flags=["INVALID_LLM_STATE"],
                    reason="Gateway returned non-dict payload.",
                    provider_name=self.provider_name,
                )

            state_str = str(data.get("state", "")).upper()
            quote_str = str(data.get("quote", "")).strip()

            if state_str not in VALID_STATES:
                return VerifierDecision(
                    state=rule_st,
                    confidence=0.5,
                    quote=None,
                    context_type=ctx_t,
                    flags=["INVALID_LLM_STATE"],
                    reason=f"Invalid state from gateway: {state_str}",
                    provider_name=self.provider_name,
                )

            # Strict Grounding Verification
            is_grounded, g_reason = verify_grounding(quote_str, cv_full_text, candidate_chunks)
            if not is_grounded:
                saved_data = {"state": rule_st_val, "quote": "", "flags": ["GROUNDING_FAIL"]}
                await _save_db_cache(cache_key, saved_data)
                return VerifierDecision(
                    state=rule_st,
                    confidence=0.5,
                    quote=None,
                    context_type=ctx_t,
                    flags=["GROUNDING_FAIL", g_reason],
                    reason=f"Grounding failure: {g_reason}",
                    provider_name=self.provider_name,
                )

            # Experience context elevation check
            if rule_st_val == "PARTIAL" and state_str == "STRONG":
                is_experience_context = (
                    context_type == ContextSectionType.WORK_EXPERIENCE
                    or any(
                        s.lower().startswith("experience")
                        or "experience" in s.lower()
                        or "pengalaman" in s.lower()
                        or "bekerja" in s.lower()
                        or "pekerjaan" in s.lower()
                        for s in candidate_chunks
                    )
                )
                if not is_experience_context:
                    state_str = "PARTIAL"

            final_state = EvaluationStatus(state_str)
            flags: list[str] = []

            # Context-Elevation Invariant
            final_state, elev_flags = apply_context_elevation_guard(
                state=final_state,
                kind=kind,
                context_type=ctx_t,
            )
            flags.extend(elev_flags)

            saved_data = {"state": final_state.value, "quote": quote_str, "flags": flags}
            await _save_db_cache(cache_key, saved_data)

            quote_spans = split_quote_spans(quote_str)
            norm_cv = normalize_text_nfkc(cv_full_text).lower()
            found_starts = []
            found_ends = []
            for sp in quote_spans:
                norm_sp = normalize_text_nfkc(sp).lower()
                idx = norm_cv.find(norm_sp)
                if idx >= 0:
                    found_starts.append(idx)
                    found_ends.append(idx + len(norm_sp))

            if found_starts and found_ends and max(found_ends) > min(found_starts):
                char_start = min(found_starts)
                char_end = max(found_ends)
            else:
                norm_quote = normalize_text_nfkc(quote_str).lower()
                idx = norm_cv.find(norm_quote)
                char_start = idx if idx >= 0 else 0
                char_end = idx + len(norm_quote) if idx >= 0 else max(5, len(quote_str))

            return VerifierDecision(
                state=final_state,
                confidence=0.85,
                quote=quote_str,
                spans=quote_spans if quote_spans else ([quote_str] if quote_str else []),
                char_start=char_start,
                char_end=char_end,
                context_type=ctx_t,
                flags=flags,
                reason=str(data.get("reason", "LLM verified.")),
                provider_name=self.provider_name,
            )

        except Exception:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=["LLM_PARSE_ERROR"],
                reason="Failed to parse gateway response.",
                provider_name=self.provider_name,
            )


async def verify_requirement_with_llm(
    cv_full_text: str,
    requirement: dict[str, Any],
    rule_state: str,
    snippets: list[str],
) -> tuple[str, str, list[str]]:
    """Backward-compatible entry point calling LLMGatewayVerifierProvider."""
    provider = LLMGatewayVerifierProvider(timeout=10.0)
    decision = await provider.verify(
        criterion_id=str(requirement.get("requirement_id", "R_UNKNOWN")),
        criterion_description=str(requirement.get("description", "")),
        candidate_chunks=snippets,
        cv_full_text=cv_full_text,
        rule_state=rule_state,
        kind=str(requirement.get("kind", "SKILL")),
    )
    # Ensure GROUNDING_FAIL is consistently in flags for backward compatibility
    res_flags = list(decision.flags)
    if any(f.startswith("GROUNDING_FAIL") for f in res_flags) and "GROUNDING_FAIL" not in res_flags:
        res_flags.insert(0, "GROUNDING_FAIL")
    return decision.state.value, decision.quote or "", res_flags


# Re-exports for TypeSafe Jev System One Work Experience Extraction
from src.domain.experience_extractor import (
    WorkExperienceEntity,
    calculate_experience_duration,
    extract_work_experiences_jev,
)

__all__ = [
    "WorkExperienceEntity",
    "calculate_experience_duration",
    "extract_work_experiences_jev",
]
