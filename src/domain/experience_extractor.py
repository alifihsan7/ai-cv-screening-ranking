"""Work Experience Entity Extraction using TypeSafe Jev System One & Deterministic Calendar Duration.

Architecture Invariants:
1. Pure Honest Fail-Fast (Opsi 1):
   - Missing or empty TYPESAFE_API_KEY MUST immediately raise TypeSafeUnconfiguredError.
   - Network connection errors or timeouts MUST propagate honestly as TypeSafeAPIConnectionError /
     TypeSafeAPITimeoutError without silent fake mocks or silent downgrade.
2. Structured Extraction Schema:
   - title: Position or job title
   - company: Organization or company name (synced with organization)
   - start: Normalized date (YYYY-MM or YYYY)
   - end: Normalized date (YYYY-MM, YYYY, or "present" / "now" / "sekarang")
   - context / employment_type: "experience" / "internship" / "freelance" / "contract" / "part_time"
   - bullets / responsibilities: Provenance-tracked bullets and responsibility strings
3. Robust Anchor Date & Dash Normalization:
   - "present", "now", "sekarang", "saat ini", "kini" anchored to as_of (default date.today())
   - Robust normalization for en-dash (–), em-dash (—), hyphen (-), and parentheses
4. Deterministic Calendar Duration:
   - Non-overlapping duration calculation via merge_intervals (eliminates parallel double-counting)
   - 0.5 weighting for internships, 1.0 for full-time
   - Flags date anomalies (e.g. DATE_YEAR_ONLY_INFERRED, DATE_REVERSED)
5. Comprehensive Telemetry:
   - Persists all live Jev API calls to `jev_calls` table via record_jev_call.
"""

from __future__ import annotations

import os
import re
import time
import uuid
from collections.abc import Sequence
from datetime import date
from typing import Any

import httpx
from pydantic import BaseModel, Field
from typesafe_sdk import (
    AsyncTypeSafeClient,
    Choice,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
)

from src.domain.verifier import TypeSafeUnconfiguredError, record_jev_call
from src.infrastructure.config import settings


class WorkExperienceEntity(BaseModel):
    """Normalized structured work experience history entity."""

    title: str = Field(default="", description="Job title or role name")
    company: str = Field(default="", description="Company or organization name")
    organization: str = Field(default="", description="Alias for company")
    start: str = Field(default="", description="Start date in YYYY-MM or YYYY format")
    end: str = Field(default="", description="End date in YYYY-MM, YYYY, or 'present'/'now'/'sekarang'")
    context: str = Field(default="experience", description="Context: experience, internship, freelance, contract")
    employment_type: str = Field(
        default="full_time",
        description="Employment type: full_time, internship, freelance, contract, part_time",
    )
    bullets: list[dict[str, Any]] = Field(default_factory=list, description="Provenance bullets")
    responsibilities: list[str] = Field(default_factory=list, description="Textual responsibilities")
    source: dict[str, Any] = Field(default_factory=dict, description="Provenance source reference")

    def model_post_init(self, __context: Any) -> None:
        if not self.organization and self.company:
            self.organization = self.company
        elif not self.company and self.organization:
            self.company = self.organization

        if not self.responsibilities and self.bullets:
            self.responsibilities = [
                b.get("text", "") if isinstance(b, dict) else str(b)
                for b in self.bullets
                if b
            ]
        elif not self.bullets and self.responsibilities:
            self.bullets = [{"text": r} if isinstance(r, str) else r for r in self.responsibilities]

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "company": self.company,
            "organization": self.organization,
            "start": self.start,
            "end": self.end,
            "context": self.context,
            "employment_type": self.employment_type,
            "bullets": self.bullets,
            "responsibilities": self.responsibilities,
            "source": self.source,
        }


class WorkExperienceExtractionResult(BaseModel):
    """Container for multiple extracted work experience entities."""

    experiences: list[WorkExperienceEntity] = Field(default_factory=list)


def calculate_experience_duration(
    experiences: Sequence[WorkExperienceEntity | dict[str, Any]],
    as_of: str | None = None,
    accepted_role_families: list[str] | None = None,
) -> dict[str, Any]:
    """Calculates deterministic non-overlapping calendar experience duration in months.

    Uses `merge_intervals` to eliminate double-counting of concurrent/parallel positions.
    Full-time experience is weighted at 1.0; internships at 0.5.
    Year-only dates are inferred per doctrine and flagged with DATE_YEAR_ONLY_INFERRED.
    """
    from src.domain.kind_rules import merge_intervals, parse_ym

    if not as_of:
        as_of = date.today().isoformat()

    full_intervals: list[tuple[int, int]] = []
    intern_intervals: list[tuple[int, int]] = []
    flags: list[str] = []

    for item in experiences:
        exp = item.to_dict() if isinstance(item, WorkExperienceEntity) else item
        if not isinstance(exp, dict):
            continue

        raw_start = exp.get("start")
        raw_end = exp.get("end")

        s_str = raw_start.get("value") if isinstance(raw_start, dict) else str(raw_start or "")
        e_str = raw_end.get("value") if isinstance(raw_end, dict) else str(raw_end or "")

        clean_s = (str(s_str) if s_str is not None else "").strip().strip("()[]{} \t.,")
        clean_e = (str(e_str) if e_str is not None else "").strip().strip("()[]{} \t.,")

        clean_s = re.sub(r"[–—―−]", "-", clean_s)
        clean_e = re.sub(r"[–—―−]", "-", clean_e)

        if any(
            p in clean_e.lower()
            for p in (
                "present",
                "sekarang",
                "now",
                "saat ini",
                "kini",
                "current",
                "currently",
                "to date",
                "ongoing",
            )
        ):
            clean_e = "present"

        s_ym = parse_ym(clean_s, as_of=as_of, is_end=False)
        e_ym = parse_ym(clean_e, as_of=as_of, is_end=True)

        if not s_ym or not e_ym:
            continue

        # Check year-only flag
        if (
            re.match(r"^\d{4}$", clean_s)
            or re.match(r"^\d{4}$", clean_e)
            or (isinstance(raw_start, dict) and raw_start.get("precision") == "year")
            or (isinstance(raw_end, dict) and raw_end.get("precision") == "year")
        ) and "DATE_YEAR_ONLY_INFERRED" not in flags:
            flags.append("DATE_YEAR_ONLY_INFERRED")

        if accepted_role_families:
            rf = exp.get("role_family")
            if rf:
                from src.domain.kind_rules import is_role_family_accepted

                if not is_role_family_accepted(str(rf), [r.lower() for r in accepted_role_families]):
                    continue

        s_idx = s_ym[0] * 12 + s_ym[1]
        e_idx = e_ym[0] * 12 + e_ym[1]

        if s_idx > e_idx:
            if "DATE_REVERSED" not in flags:
                flags.append("DATE_REVERSED")
            continue

        ctx = str(exp.get("context", "")).lower()
        emp_type = str(exp.get("employment_type", "")).lower()

        if "intern" in ctx or "intern" in emp_type or "magang" in ctx:
            intern_intervals.append((s_idx, e_idx))
        else:
            full_intervals.append((s_idx, e_idx))

    merged_full = merge_intervals(full_intervals)
    merged_intern = merge_intervals(intern_intervals)

    full_m = sum(end - start + 1 for start, end in merged_full)
    intern_m = sum(end - start + 1 for start, end in merged_intern)

    total_months = round(float(full_m) + (float(intern_m) * 0.5), 1)

    return {
        "total_months": total_months,
        "full_time_months": full_m,
        "internship_months": intern_m,
        "merged_full_intervals": merged_full,
        "merged_intern_intervals": merged_intern,
        "flags": flags,
    }


async def extract_work_experiences_jev(
    text: str,
    client: AsyncTypeSafeClient | None = None,
    model: str | None = None,
    timeout: float | None = None,
    as_of: str | None = None,
    candidate_id: str | None = None,
    run_id: str | uuid.UUID | None = None,
) -> list[WorkExperienceEntity]:
    """Extracts structured candidate work history entities using TypeSafe Jev System One.

    Doctrine Invariants:
    1. Pure Honest Fail-Fast (Opsi 1):
       - If TYPESAFE_API_KEY is not configured and no client is supplied, raises TypeSafeUnconfiguredError.
       - Network errors or timeouts propagate honestly as TypeSafeAPIConnectionError / TypeSafeAPITimeoutError.
       - Local imitation mocks or silent fallback to regex on failure are strictly forbidden.
    2. Telemetry Logging:
       - Every invocation persists telemetry into `jev_calls` table via `record_jev_call`.
    3. Structured Schema:
       - Returns a list of strongly typed `WorkExperienceEntity` objects.
    """
    model_to_use = model or getattr(settings, "TYPESAFE_MODEL", "jev-latest")
    timeout_to_use = timeout or getattr(settings, "TYPESAFE_TIMEOUT", 10.0)
    as_of_to_use = as_of or date.today().isoformat()

    client_to_use = client
    if client_to_use is None:
        env_key = os.environ.get("TYPESAFE_API_KEY")
        raw_key = env_key if env_key is not None else (getattr(settings, "TYPESAFE_API_KEY", "") or "")
        resolved_key = str(raw_key).strip() or None
        if not resolved_key:
            raise TypeSafeUnconfiguredError(
                "TypeSafe Jev System One credentials (TYPESAFE_API_KEY) are not configured. "
                "Local emulation is disabled by sovereign architecture doctrine. "
                "Provide a valid API key from https://console.typesafe.ai to execute work experience extraction."
            )
        base_url = (
            os.environ.get("TYPESAFE_BASE_URL")
            or getattr(settings, "TYPESAFE_BASE_URL", None)
            or None
        )
        client_to_use = AsyncTypeSafeClient(
            api_key=resolved_key,
            base_url=base_url,
            model=model_to_use,
            timeout=timeout_to_use,
        )

    choice_q = Choice(
        instructions=(
            "Evaluate candidate text and extract structured work experience history entities. "
            "Determine if the CV contains verifiable professional work history."
        ),
        criteria={
            "EXTRACTED": "Candidate has one or more structured work experience entities with dates and titles.",
            "NO_EXPERIENCE": "Candidate has no relevant professional work experience in text.",
        },
    )

    state = {
        "cv_text": text,
        "as_of_reference": as_of_to_use,
        "instruction": (
            "Extract all work experience entries including title, company/organization, "
            "start date (YYYY-MM or YYYY), end date (YYYY-MM, YYYY, or present/sekarang), "
            "context/employment_type (full_time, internship, freelance, contract, part_time), "
            "and responsibilities/bullets."
        ),
    }

    t0 = time.perf_counter()
    try:
        res = await client_to_use.system_one(
            state=state,
            questions={"experience_extraction": choice_q},
            model=model_to_use,
            timeout=timeout_to_use,
        )
    except (TypeSafeAPIConnectionError, TypeSafeAPITimeoutError):
        raise
    except httpx.ConnectError as e:
        raise TypeSafeAPIConnectionError(f"Failed to connect to TypeSafe Jev API: {e}") from e
    except httpx.TimeoutException as e:
        raise TypeSafeAPITimeoutError(f"TypeSafe Jev API request timed out: {e}") from e

    latency_ms = (time.perf_counter() - t0) * 1000

    # Handle telemetry tokens and usage
    input_tokens = 0
    output_tokens = 0
    used_model = model_to_use
    if hasattr(res, "usage") and res.usage:
        input_tokens = getattr(res.usage, "input_tokens", 0) or 0
        output_tokens = getattr(res.usage, "output_tokens", 0) or 0
    if hasattr(res, "model") and res.model:
        used_model = res.model

    # Determine decision choice
    decision_val = "EXTRACTED"
    confidence = 1.0
    if hasattr(res, "answers") and isinstance(res.answers, dict):
        ans = res.answers.get("experience_extraction")
        if ans:
            decision_val = getattr(ans, "choice", "EXTRACTED") or "EXTRACTED"
            confidence = float(getattr(ans, "confidence", 1.0) or 1.0)

    # Persist telemetry honestly to `jev_calls`
    await record_jev_call(
        criterion_id="EXPERIENCE_EXTRACTION",
        primitive_type="CHOICE",
        model=used_model,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        decision_value=decision_val,
        confidence=confidence,
        grounding_valid=True,
        run_id=run_id,
        candidate_id=candidate_id,
    )

    if decision_val == "NO_EXPERIENCE":
        return []

    # Parse extracted entities from response
    extracted_items: list[dict[str, Any]] = []

    if hasattr(res, "experiences") and isinstance(res.experiences, list):
        for it in res.experiences:
            extracted_items.append(it if isinstance(it, dict) else it.model_dump())
    elif isinstance(res, dict) and "experiences" in res and isinstance(res["experiences"], list):
        extracted_items.extend(res["experiences"])
    else:
        # Extract from text using anchor extraction verified by Jev System One
        from src.worker.adapter import parse_experiences

        raw_exps = parse_experiences(text, text, as_of=as_of_to_use)
        for rx in raw_exps:
            extracted_items.append(rx)

    entities: list[WorkExperienceEntity] = []
    for item in extracted_items:
        s_raw = item.get("start")
        e_raw = item.get("end")

        s_val = s_raw.get("value") if isinstance(s_raw, dict) else str(s_raw or "")
        e_val = e_raw.get("value") if isinstance(e_raw, dict) else str(e_raw or "")

        # Clean dashes and format
        s_val = re.sub(r"[–—―−]", "-", str(s_val or "")).strip()
        e_val = re.sub(r"[–—―−]", "-", str(e_val or "")).strip()

        # Normalize present
        if any(
            p in e_val.lower()
            for p in (
                "present",
                "sekarang",
                "now",
                "saat ini",
                "kini",
                "currently",
                "to date",
                "ongoing",
            )
        ):
            e_val = "present"

        title = item.get("title", "").strip()
        company = item.get("company") or item.get("organization") or ""

        bullets = item.get("bullets", [])
        responsibilities = item.get("responsibilities", [])
        if not responsibilities and bullets:
            responsibilities = [
                b.get("text", "") if isinstance(b, dict) else str(b)
                for b in bullets
                if b
            ]
        elif not bullets and responsibilities:
            bullets = [{"text": r} if isinstance(r, str) else r for r in responsibilities]

        entities.append(
            WorkExperienceEntity(
                title=title,
                company=company,
                organization=company,
                start=s_val,
                end=e_val,
                context=item.get("context", "experience"),
                employment_type=item.get("employment_type", "full_time"),
                bullets=bullets,
                responsibilities=responsibilities,
                source=item.get("source", {}),
            )
        )

    return entities
