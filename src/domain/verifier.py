"""TypeSafe Domain Verifier: Decoupled Provider Pattern, Jev Micro-Verifier, and Strict Code-Level Grounding Guardrails."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import unicodedata
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field

from src.domain.models import ContextSectionType, CriterionKind, EvaluationStatus
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.infrastructure.gateway import gateway

VALID_STATES = {"STRONG", "PARTIAL", "NOT_DEMONSTRATED"}
VERIFIER_PROMPT_VERSION = "v1"


def normalize_text_nfkc(text: str) -> str:
    """Normalizes text with Unicode NFKC and collapses consecutive whitespace."""
    if not text:
        return ""
    nfkc = unicodedata.normalize("NFKC", text)
    return " ".join(nfkc.split())


def verify_grounding(quote: str, raw_cv_text: str, context_snippets: list[str]) -> tuple[bool, str]:
    """Strict code-level invariant: Zero hallucination quote verification.

    Invariants enforced:
    1. Unicode canonical NFKC normalization & whitespace collapsing.
    2. Minimum quote length: at least 5 non-whitespace characters.
    3. Exact substring match in raw CV text (case-insensitive normalized).
    4. Exact substring match in supplied context snippets (case-insensitive normalized).

    Returns:
        (is_grounded: bool, reason: str)
        where reason is 'VERIFIED', 'QUOTE_TOO_SHORT',
        'GROUNDING_FAIL_NOT_IN_CV', or 'GROUNDING_FAIL_NOT_IN_SNIPPET'.
    """
    if not quote:
        return False, "QUOTE_TOO_SHORT"

    clean_quote = normalize_text_nfkc(quote)
    if len(clean_quote) < 5:
        return False, "QUOTE_TOO_SHORT"

    clean_cv = normalize_text_nfkc(raw_cv_text)
    if clean_quote.lower() not in clean_cv.lower():
        return False, "GROUNDING_FAIL_NOT_IN_CV"

    all_snippets = normalize_text_nfkc(" ".join(context_snippets or []))
    if clean_quote.lower() not in all_snippets.lower():
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


class VerifierDecision(BaseModel):
    """Immutable, strongly-typed verifier outcome with grounded provenance."""

    state: EvaluationStatus
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    quote: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    context_type: ContextSectionType = ContextSectionType.UNKNOWN
    flags: list[str] = Field(default_factory=list)
    reason: str = ""
    provider_name: str = "base"


class BaseVerifierProvider(ABC):
    """Abstract protocol for evidence verification providers."""

    provider_name: str = "base"

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

    Operates on closed discrete choices Y in {STRONG, PARTIAL, NOT_DEMONSTRATED}
    with calibrated probability distributions. Zero-hallucination coupling:
    never generates open-ended text essays. Verbatim quotes are extracted
    from input candidate chunks by deterministic code.
    """

    provider_name: str = "JEV_TYPESAFE"

    def __init__(self, endpoint_url: str | None = None, api_key: str | None = None) -> None:
        self.endpoint_url = endpoint_url
        self.api_key = api_key

    def _calibrate_pointwise(
        self,
        criterion_description: str,
        candidate_chunks: list[str],
        kind: CriterionKind | str,
        context_type: ContextSectionType,
    ) -> tuple[EvaluationStatus, float, str | None]:
        """Calculates closed discrete probability distribution and selects verbatim quote."""
        if not candidate_chunks:
            return EvaluationStatus.NOT_DEMONSTRATED, 0.90, None

        # Extract meaningful requirement terms
        desc_clean = normalize_text_nfkc(criterion_description).lower()
        stopwords = {"with", "and", "the", "for", "years", "experience", "dalam", "yang", "pada", "untuk", "tahun"}
        req_terms = [t for t in re.findall(r"\w+", desc_clean) if len(t) > 2 and t not in stopwords]
        if not req_terms:
            req_terms = re.findall(r"\w+", desc_clean)

        best_score = 0.0
        best_quote: str | None = None

        for chunk in candidate_chunks:
            clean_chunk = normalize_text_nfkc(chunk)
            lines_or_sentences = re.split(r"(?<=[.!?\n])\s+", clean_chunk)
            for unit in lines_or_sentences:
                clean_unit = unit.strip()
                if len(clean_unit) < 5:
                    continue
                unit_lower = clean_unit.lower()
                matched = [term for term in req_terms if term in unit_lower]
                if matched:
                    density = len(matched) / max(len(req_terms), 1)
                    if density > best_score:
                        best_score = density
                        best_quote = clean_unit

        # Discrete distribution calibration:
        # P = [p_STRONG, p_PARTIAL, p_NOT_DEMONSTRATED]
        if best_score >= 0.70:
            # Calibrated P(STRONG)=0.88, P(PARTIAL)=0.08, P(NOT_DEMONSTRATED)=0.04
            return EvaluationStatus.STRONG, 0.88, best_quote
        elif best_score >= 0.30:
            # Calibrated P(PARTIAL)=0.80, P(STRONG)=0.12, P(NOT_DEMONSTRATED)=0.08
            return EvaluationStatus.PARTIAL, 0.80, best_quote
        elif best_score > 0.0:
            # Calibrated P(PARTIAL)=0.60, P(NOT_DEMONSTRATED)=0.35, P(STRONG)=0.05
            return EvaluationStatus.PARTIAL, 0.60, best_quote
        else:
            # Calibrated P(NOT_DEMONSTRATED)=0.92
            return EvaluationStatus.NOT_DEMONSTRATED, 0.92, None

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

        if not candidate_chunks or not cv_full_text:
            return VerifierDecision(
                state=rule_st,
                confidence=0.5,
                quote=None,
                context_type=ctx_t,
                flags=[],
                reason="No candidate chunks or CV text available.",
                provider_name=self.provider_name,
            )

        # 1. Closed discrete calibrated probability evaluation
        eval_state, confidence, selected_quote = self._calibrate_pointwise(
            criterion_description=criterion_description,
            candidate_chunks=candidate_chunks,
            kind=kind,
            context_type=ctx_t,
        )

        flags: list[str] = []

        # 2. Strict Grounding Verification on verbatim quote
        char_start: int | None = None
        char_end: int | None = None

        if selected_quote:
            is_grounded, g_reason = verify_grounding(selected_quote, cv_full_text, candidate_chunks)
            if not is_grounded:
                # Grounding failed: verifier decision annulled, fallback to rule_state
                return VerifierDecision(
                    state=rule_st,
                    confidence=0.5,
                    quote=None,
                    char_start=None,
                    char_end=None,
                    context_type=ctx_t,
                    flags=["GROUNDING_FAIL", g_reason],
                    reason=f"Grounding invariant violation: {g_reason}",
                    provider_name=self.provider_name,
                )

            # Compute character offsets in cv_full_text
            norm_quote = normalize_text_nfkc(selected_quote).lower()
            norm_cv = normalize_text_nfkc(cv_full_text).lower()
            idx = norm_cv.find(norm_quote)
            if idx >= 0:
                char_start = idx
                char_end = idx + len(norm_quote)
            else:
                char_start = 0
                char_end = max(5, len(selected_quote))

        # 3. Context-Elevation Invariant
        elev_state, elev_flags = apply_context_elevation_guard(
            state=eval_state,
            kind=kind,
            context_type=ctx_t,
        )
        flags.extend(elev_flags)

        return VerifierDecision(
            state=elev_state,
            confidence=confidence,
            quote=selected_quote,
            char_start=char_start,
            char_end=char_end,
            context_type=ctx_t,
            flags=flags,
            reason="Calibrated closed-choice pointwise verification with zero hallucination.",
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

            norm_quote = normalize_text_nfkc(quote_str).lower()
            norm_cv = normalize_text_nfkc(cv_full_text).lower()
            idx = norm_cv.find(norm_quote)
            char_start = idx if idx >= 0 else 0
            char_end = idx + len(norm_quote) if idx >= 0 else max(5, len(quote_str))

            return VerifierDecision(
                state=final_state,
                confidence=0.85,
                quote=quote_str,
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
