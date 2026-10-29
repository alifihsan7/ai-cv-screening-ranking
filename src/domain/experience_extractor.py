"""Work Experience Entities: regex extraction, TypeSafe Jev System One validation & Deterministic Calendar Duration.

Architecture Invariants:
1. Extraction is regex-based (`parse_experiences`); Jev only validates each extracted entry with a
   NOUL question ("is this genuine professional work experience?"). Jev never drops an entry: confident
   rejections are flagged `JEV_NOT_WORK_EXPERIENCE` and excluded from duration scoring downstream.
2. Pure Honest Fail-Fast:
   - Missing or empty TYPESAFE_API_KEY MUST immediately raise TypeSafeUnconfiguredError.
   - Network connection errors or timeouts MUST propagate honestly as TypeSafeAPIConnectionError /
     TypeSafeAPITimeoutError without silent fake mocks or silent downgrade.
3. Structured Extraction Schema:
   - title: Position or job title
   - company: Organization or company name (synced with organization)
   - start: Normalized date (YYYY-MM or YYYY)
   - end: Normalized date (YYYY-MM, YYYY, or "present" / "now" / "sekarang")
   - context / employment_type: "experience" / "internship" / "freelance" / "contract" / "part_time"
   - bullets / responsibilities: Provenance-tracked bullets and responsibility strings
   - jev_validity / flags: Jev NOUL probability that the entry is genuine work experience
4. Robust Anchor Date & Dash Normalization:
   - "present", "now", "sekarang", "saat ini", "kini" anchored to the caller-supplied as_of
   - Robust normalization for en-dash (–), em-dash (—), hyphen (-), and parentheses
5. Deterministic Calendar Duration:
   - Non-overlapping duration calculation via merge_intervals (eliminates parallel double-counting)
   - 0.5 weighting for internships, 1.0 for full-time
   - Flags date anomalies (e.g. DATE_YEAR_ONLY_INFERRED, DATE_REVERSED)
6. Comprehensive Telemetry:
   - Persists one `jev_calls` row per validated entry via record_jev_call.
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
    Noul,
    NoulCriteria,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
)

from src.domain.verifier import TypeSafeUnconfiguredError, record_jev_call
from src.infrastructure.config import settings

JEV_NOT_WORK_EXPERIENCE = "JEV_NOT_WORK_EXPERIENCE"

EXPERIENCE_VALIDATION_INSTRUCTIONS = (
    "Is the experience entry '{key}' in the state a genuine professional work experience "
    "(employment, internship, freelance, or contract work) rather than education, a coursework "
    "or personal project, an organization/volunteer role, or a stated interest?"
)
EXPERIENCE_VALIDATION_CRITERIA = NoulCriteria(
    true="The entry describes real professional work the candidate performed for an employer or client.",
    false="The entry is education, a coursework/personal project, an organization or volunteer role, or an interest.",
)


class WorkExperienceEntity(BaseModel):
    """Normalized structured work experience history entity."""

    title: str = Field(default="", description="Job title or role name")
    company: str = Field(default="", description="Company or organization name")
    organization: str = Field(default="", description="Alias for company")
    start: str = Field(default="", description="Start date in YYYY-MM or YYYY format")
    end: str = Field(default="", description="End date in YYYY-MM, YYYY, or 'present'/'now'/'sekarang'")
    start_date: str = Field(default="", description="Start date alias (synced with start)")
    end_date: str = Field(default="", description="End date alias (synced with end)")
    duration_months: float = Field(default=0.0, description="Duration in calendar months")
    context: str = Field(default="experience", description="Context: experience, internship, freelance, contract")
    employment_type: str = Field(
        default="full_time",
        description="Employment type: full_time, internship, freelance, contract, part_time",
    )
    bullets: list[dict[str, Any]] = Field(default_factory=list, description="Provenance bullets")
    responsibilities: list[str] = Field(default_factory=list, description="Textual responsibilities")
    source: dict[str, Any] = Field(default_factory=dict, description="Provenance source reference")
    jev_validity: float | None = Field(default=None, description="Jev NOUL probability of genuine work experience")
    flags: list[str] = Field(default_factory=list, description="Validation flags, e.g. JEV_NOT_WORK_EXPERIENCE")

    def model_post_init(self, __context: Any) -> None:
        if not self.organization and self.company:
            self.organization = self.company
        elif not self.company and self.organization:
            self.company = self.organization

        if not self.start_date and self.start:
            self.start_date = self.start
        elif not self.start and self.start_date:
            self.start = self.start_date

        if not self.end_date and self.end:
            self.end_date = self.end
        elif not self.end and self.end_date:
            self.end = self.end_date

        if self.duration_months == 0.0 and self.start:
            try:
                from src.domain.models import compute_calendar_duration_months
                is_curr = any(p in (self.end or "").lower() for p in ("present", "now", "sekarang", "saat ini", "kini"))
                end_val = None if is_curr else (self.end or None)
                self.duration_months = float(compute_calendar_duration_months(self.start, end_val, is_current=is_curr))
            except Exception:
                pass

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
            "start_date": self.start_date or self.start,
            "end_date": self.end_date or self.end,
            "duration_months": self.duration_months,
            "context": self.context,
            "employment_type": self.employment_type,
            "bullets": self.bullets,
            "responsibilities": self.responsibilities,
            "source": self.source,
            "jev_validity": self.jev_validity,
            "flags": self.flags,
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


def _resolve_client(
    client: AsyncTypeSafeClient | None,
    model: str,
    timeout: float,
) -> AsyncTypeSafeClient | None:
    """Returns None when the caller supplied a client; otherwise builds one or fails fast."""
    if client is not None:
        return None
    env_key = os.environ.get("TYPESAFE_API_KEY")
    raw_key = env_key if env_key is not None else (getattr(settings, "TYPESAFE_API_KEY", "") or "")
    resolved_key = str(raw_key).strip() or None
    if not resolved_key:
        raise TypeSafeUnconfiguredError(
            "TypeSafe Jev System One credentials (TYPESAFE_API_KEY) are not configured. "
            "Local emulation is disabled by sovereign architecture doctrine. "
            "Provide a valid API key from https://console.typesafe.ai to execute work experience validation."
        )
    base_url = os.environ.get("TYPESAFE_BASE_URL") or getattr(settings, "TYPESAFE_BASE_URL", None) or None
    return AsyncTypeSafeClient(api_key=resolved_key, base_url=base_url, model=model, timeout=timeout)


def _date_value(raw: Any) -> str:
    return str(raw.get("value") if isinstance(raw, dict) else raw or "")


def _experience_state_entry(exp: dict[str, Any]) -> dict[str, Any]:
    """Typed, already-redacted view of one entry passed to Jev as data (never as instructions)."""
    bullets = exp.get("bullets") or exp.get("responsibilities") or []
    return {
        "title": str(exp.get("title", "")),
        "organization": str(exp.get("organization") or exp.get("company") or ""),
        "start": _date_value(exp.get("start")),
        "end": _date_value(exp.get("end")),
        "context": str(exp.get("context", "")),
        "bullets": [b.get("text", "") if isinstance(b, dict) else str(b) for b in bullets if b],
    }


async def validate_work_experiences_jev(
    experiences: list[dict[str, Any]],
    client: AsyncTypeSafeClient | None = None,
    model: str | None = None,
    timeout: float | None = None,
    candidate_id: str | None = None,
    run_id: str | uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Validates regex-extracted (redacted) work experience entries with one Jev NOUL question each.

    Returns copies of the entries annotated with `jev_validity`. An entry Jev confidently rejects
    (1 - validity >= VERIFIER_MIN_CONFIDENCE) gains the `JEV_NOT_WORK_EXPERIENCE` flag; uncertain
    answers leave the entry untouched. Entries are never dropped.
    """
    model_to_use = str(model or settings.TYPESAFE_MODEL)
    timeout_to_use = float(timeout or settings.TYPESAFE_TIMEOUT)
    owned_client = _resolve_client(client, model_to_use, timeout_to_use)

    if not experiences:
        return []

    keys = [f"exp_{i}" for i in range(len(experiences))]
    state = {"experiences": {k: _experience_state_entry(e) for k, e in zip(keys, experiences, strict=True)}}
    questions = {
        k: Noul(instructions=EXPERIENCE_VALIDATION_INSTRUCTIONS.format(key=k), criteria=EXPERIENCE_VALIDATION_CRITERIA)
        for k in keys
    }

    t0 = time.perf_counter()
    try:
        if owned_client is not None:
            async with owned_client as session_client:
                res: SystemOneResponse = await session_client.system_one(
                    state=state, questions=questions, model=model_to_use, timeout=timeout_to_use
                )
        else:
            assert client is not None
            res = await client.system_one(state=state, questions=questions, model=model_to_use, timeout=timeout_to_use)
    except (TypeSafeAPIConnectionError, TypeSafeAPITimeoutError):
        raise
    except httpx.ConnectError as e:
        raise TypeSafeAPIConnectionError(f"Failed to connect to TypeSafe Jev API: {e}") from e
    except httpx.TimeoutException as e:
        raise TypeSafeAPITimeoutError(timeout_to_use) from e
    latency_ms = (time.perf_counter() - t0) * 1000

    input_tokens = int(res.usage.input_tokens or 0) if res.usage else 0
    output_tokens = int(res.usage.output_tokens or 0) if res.usage else 0
    used_model = res.model or model_to_use

    validated: list[dict[str, Any]] = []
    for i, (key, exp) in enumerate(zip(keys, experiences, strict=True)):
        ans = res.nouls.get(key)
        if ans is None:
            raise ValueError(f"Missing Jev NOUL answer for experience entry '{key}'")
        validity = float(ans.noul)
        flags = list(exp.get("flags") or [])
        if (1.0 - validity) >= settings.VERIFIER_MIN_CONFIDENCE and JEV_NOT_WORK_EXPERIENCE not in flags:
            flags.append(JEV_NOT_WORK_EXPERIENCE)
        validated.append({**exp, "jev_validity": validity, "flags": flags})

        # One batched call answers every entry: attribute its usage to the first row only
        await record_jev_call(
            criterion_id="EXPERIENCE_VALIDATION",
            primitive_type="NOUL",
            model=used_model,
            latency_ms=latency_ms,
            input_tokens=input_tokens if i == 0 else 0,
            output_tokens=output_tokens if i == 0 else 0,
            decision_value=f"{validity:.4f}",
            confidence=max(validity, 1.0 - validity),
            grounding_valid=True,
            run_id=run_id,
            candidate_id=candidate_id,
        )

    return validated


def _to_entity(item: dict[str, Any]) -> WorkExperienceEntity:
    s_val = re.sub(r"[–—―−]", "-", _date_value(item.get("start"))).strip()
    e_val = re.sub(r"[–—―−]", "-", _date_value(item.get("end"))).strip()

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

    company = item.get("company") or item.get("organization") or ""
    bullets = item.get("bullets", [])
    responsibilities = item.get("responsibilities", [])
    if not responsibilities and bullets:
        responsibilities = [b.get("text", "") if isinstance(b, dict) else str(b) for b in bullets if b]
    elif not bullets and responsibilities:
        bullets = [{"text": r} if isinstance(r, str) else r for r in responsibilities]

    return WorkExperienceEntity(
        title=str(item.get("title", "")).strip(),
        company=company,
        organization=company,
        start=s_val,
        end=e_val,
        start_date=s_val,
        end_date=e_val,
        context=item.get("context", "experience"),
        employment_type=item.get("employment_type", "full_time"),
        bullets=bullets,
        responsibilities=responsibilities,
        source=item.get("source", {}),
        jev_validity=item.get("jev_validity"),
        flags=list(item.get("flags") or []),
    )


async def extract_work_experiences_jev(
    text: str,
    client: AsyncTypeSafeClient | None = None,
    model: str | None = None,
    timeout: float | None = None,
    as_of: str | None = None,
    candidate_id: str | None = None,
    run_id: str | uuid.UUID | None = None,
) -> list[WorkExperienceEntity]:
    """Regex-extracts work experience entries from (redacted) text, then validates each with Jev.

    Extraction is `parse_experiences` (deterministic regex); Jev only validates via
    `validate_work_experiences_jev`. `as_of` is passed through unchanged so callers control date anchoring.
    """
    from src.worker.adapter import parse_experiences

    raw_exps = parse_experiences(text, text, as_of=as_of)
    validated = await validate_work_experiences_jev(
        raw_exps,
        client=client,
        model=model,
        timeout=timeout,
        candidate_id=candidate_id,
        run_id=run_id,
    )
    return [_to_entity(item) for item in validated]
