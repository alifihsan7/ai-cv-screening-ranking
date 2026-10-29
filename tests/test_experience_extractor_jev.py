"""Comprehensive test suite for TypeSafe Jev System One Work Experience Extraction & Deterministic Duration.

Architecture & Verification Invariants:
0. Extraction vs Validation:
   - Entries are regex-extracted; Jev only validates each one with a NOUL question.
   - Confident rejections are flagged JEV_NOT_WORK_EXPERIENCE (never dropped) and excluded from duration.
1. Pure Honest Fail-Fast:
   - Missing or empty TYPESAFE_API_KEY MUST raise TypeSafeUnconfiguredError.
   - Network drop or timeout MUST propagate as TypeSafeAPIConnectionError / TypeSafeAPITimeoutError.
   - Local pseudo-Jev imitation mocks are strictly prohibited.
2. Deterministic Calendar Non-Overlapping Duration:
   - Parallel / freelance positions MUST NOT be double-counted.
   - Full-time weighted at 1.0; internships weighted at 0.5.
   - Pure year dates are inferred (start: July, end: June) and flagged with DATE_YEAR_ONLY_INFERRED.
3. Dynamic Dates & Normalization:
   - "now", "sekarang", "present" anchored deterministically to as_of reference.
   - En-dash (–), em-dash (—), parentheses, and format variations parsed without entity loss.
4. Section Adapter Robustness:
   - Heading variations: RELATED EXPERIENCE, PROJECT & WORK EXPERIENCE, PROFESSIONAL BACKGROUND, etc.
5. Clean Re-Exports:
   - Verified on src.domain.verifier.
"""

from __future__ import annotations

import os
import uuid
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from typesafe_sdk import (
    AsyncTypeSafeClient,
    NoulAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
    Usage,
)

from src.domain.experience_extractor import (
    WorkExperienceEntity,
    calculate_experience_duration,
    extract_work_experiences_jev,
    validate_work_experiences_jev,
)
from src.domain.kind_rules import eval_experience_duration
from src.domain.verifier import (
    TypeSafeUnconfiguredError,
)
from src.domain.verifier import (
    WorkExperienceEntity as reexported_WorkExperienceEntity,
)
from src.domain.verifier import (
    calculate_experience_duration as reexported_calc_duration,
)
from src.domain.verifier import (
    extract_work_experiences_jev as reexported_extract_jev,
)
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.worker.adapter import _FallbackExtractorService, parse_experiences

CV_WITH_ONE_ENTRY = """Software Engineer
PT Solusi Awam
(11/2024 – 06/2025)
- Built FastAPI microservices"""


def _noul_response(*validities: float) -> SystemOneResponse:
    return SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=120, output_tokens=len(validities)),
        answers={f"exp_{i}": NoulAnswer(type="noul", noul=v) for i, v in enumerate(validities)},
    )

# =============================================================================
# 1. Re-Export Verification
# =============================================================================

def test_verifier_module_reexports():
    """Verify that verifier.py properly re-exports Jev extraction primitives."""
    assert reexported_extract_jev is extract_work_experiences_jev
    assert reexported_calc_duration is calculate_experience_duration
    assert reexported_WorkExperienceEntity is WorkExperienceEntity


# =============================================================================
# 2. Pure Fail-Fast Invariant Tests
# =============================================================================

@pytest.mark.asyncio
async def test_fail_fast_when_api_key_unconfigured():
    """Missing or empty TYPESAFE_API_KEY MUST raise TypeSafeUnconfiguredError."""
    with patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=False), patch.object(
        settings, "TYPESAFE_API_KEY", ""
    ):
        with pytest.raises(TypeSafeUnconfiguredError) as exc_info:
            await extract_work_experiences_jev("Curriculum Vitae text", client=None)
        assert "TYPESAFE_API_KEY" in str(exc_info.value)
        assert "Local emulation is disabled" in str(exc_info.value)


@pytest.mark.asyncio
async def test_fail_fast_connection_error_propagates():
    """Network connection failure MUST propagate honestly without silent fallback."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.side_effect = httpx.ConnectError("Failed to connect to api.typesafe.ai")

    with pytest.raises(TypeSafeAPIConnectionError) as exc_info:
        await extract_work_experiences_jev(CV_WITH_ONE_ENTRY, client=mock_client)
    assert "connect" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_fail_fast_timeout_error_propagates():
    """Request timeout MUST propagate honestly as TypeSafeAPITimeoutError."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.side_effect = TypeSafeAPITimeoutError(10.0)

    with pytest.raises(TypeSafeAPITimeoutError):
        await extract_work_experiences_jev(CV_WITH_ONE_ENTRY, client=mock_client)


# =============================================================================
# 3. Deterministic Non-Overlapping Calendar Duration Tests
# =============================================================================

def test_parallel_freelance_non_overlapping_duration():
    """Concurrent/parallel positions must NOT be double-counted.

    Job 1 (Full-Time): 2023-01 to 2023-12 (12 months)
    Job 2 (Freelance): 2023-06 to 2023-12 (7 months, concurrent with Job 1)
    Expected non-overlapping duration: 12.0 months (not 19.0).
    """
    experiences = [
        WorkExperienceEntity(
            title="Senior Backend Engineer",
            company="Enterprise Cloud Solutions",
            start="2023-01",
            end="2023-12",
            context="experience",
            employment_type="full_time",
        ),
        WorkExperienceEntity(
            title="Freelance API Consultant",
            company="Startup Client",
            start="2023-06",
            end="2023-12",
            context="freelance",
            employment_type="freelance",
        ),
    ]

    res = calculate_experience_duration(experiences, as_of="2026-01-01")
    assert res["total_months"] == 12.0
    assert res["full_time_months"] == 12
    assert res["internship_months"] == 0
    assert len(res["merged_full_intervals"]) == 1


def test_overlapping_multiple_roles_with_calendar_gap():
    """Overlapping roles are merged into single interval; non-overlapping add up.

    Role A: 2021-01 to 2022-06 (18 months)
    Role B: 2022-01 to 2022-12 (overlaps Role A; extends to 2022-12 -> 24 months total)
    [Gap: 2023-01 to 2023-02]
    Role C: 2023-03 to 2023-08 (6 months)
    Expected total: 24 + 6 = 30.0 months.
    """
    experiences = [
        {"title": "Software Engineer", "start": "2021-01", "end": "2022-06", "employment_type": "full_time"},
        {"title": "Backend Lead", "start": "2022-01", "end": "2022-12", "employment_type": "full_time"},
        {"title": "Principal Architect", "start": "2023-03", "end": "2023-08", "employment_type": "full_time"},
    ]

    res = calculate_experience_duration(experiences, as_of="2026-01-01")
    assert res["total_months"] == 30.0
    assert res["full_time_months"] == 30
    assert len(res["merged_full_intervals"]) == 2


def test_internship_weighting_at_half_credit():
    """Internship duration receives exactly 0.5x multiplier.

    Full-time: 2022-01 to 2022-12 (12 months * 1.0 = 12.0)
    Internship: 2023-01 to 2023-12 (12 months * 0.5 = 6.0)
    Total expected: 18.0 months.
    """
    experiences = [
        WorkExperienceEntity(
            title="Backend Developer",
            company="Tech Corp",
            start="2022-01",
            end="2022-12",
            context="experience",
            employment_type="full_time",
        ),
        WorkExperienceEntity(
            title="Engineering Intern",
            company="Research Lab",
            start="2023-01",
            end="2023-12",
            context="internship",
            employment_type="internship",
        ),
    ]

    res = calculate_experience_duration(experiences, as_of="2026-01-01")
    assert res["full_time_months"] == 12
    assert res["internship_months"] == 12
    assert res["total_months"] == 18.0


# =============================================================================
# 4. Dynamic Dates, En-dash, Em-dash & Year-Only Inferences
# =============================================================================

def test_dynamic_date_handling_now_and_sekarang():
    """Dynamic dates 'now' and 'Sekarang' must resolve against as_of reference."""
    as_of_ref = "2025-06-15"

    # Job 1: 2023-01 to "now" (2023-01 to 2025-06 = 30 months)
    exp_now = [
        WorkExperienceEntity(
            title="Senior Engineer",
            company="Digital Platform",
            start="2023-01",
            end="now",
        )
    ]
    res_now = calculate_experience_duration(exp_now, as_of=as_of_ref)
    assert res_now["total_months"] == 30.0

    # Job 2: 2024-01 to "Sekarang" (2024-01 to 2025-06 = 18 months)
    exp_sekarang = [
        WorkExperienceEntity(
            title="Team Lead",
            company="Fintech ID",
            start="2024-01",
            end="Sekarang",
        )
    ]
    res_sekarang = calculate_experience_duration(exp_sekarang, as_of=as_of_ref)
    assert res_sekarang["total_months"] == 18.0


def test_dash_variations_en_dash_and_em_dash():
    """En-dash (–) and em-dash (—) must be normalized without parsing disruption."""
    as_of_ref = "2026-01-01"

    # Using en-dash in start/end strings
    exp_endash = [
        {"title": "Developer", "start": "2022–01", "end": "2023–12", "employment_type": "full_time"}
    ]
    res_endash = calculate_experience_duration(exp_endash, as_of=as_of_ref)
    assert res_endash["total_months"] == 24.0

    # Using em-dash in start/end strings
    exp_emdash = [
        {"title": "Architect", "start": "2023—01", "end": "2023—12", "employment_type": "full_time"}
    ]
    res_emdash = calculate_experience_duration(exp_emdash, as_of=as_of_ref)
    assert res_emdash["total_months"] == 12.0


def test_pure_year_inference_and_flag():
    """Pure year dates must be inferred per doctrine and raise DATE_YEAR_ONLY_INFERRED.

    Start: 2020 (defaults to 2020-07)
    End: 2022 (defaults to 2022-06)
    Duration: 24 months (2 full calendar years).
    """
    exp_year = [
        WorkExperienceEntity(
            title="Backend Engineer",
            company="Inovasi Digital",
            start="2020",
            end="2022",
        )
    ]

    res = calculate_experience_duration(exp_year, as_of="2026-01-01")
    assert res["total_months"] == 24.0
    assert "DATE_YEAR_ONLY_INFERRED" in res["flags"]


def test_pure_year_to_now_inference():
    """Pure year start '2023' to 'now' with as_of reference.

    Start: 2023 (inferred 2023-07)
    End: now as of 2025-06-15 (2025-06)
    Duration: (2025*12 + 6) - (2023*12 + 7) + 1 = 24 months.
    """
    exp_year_now = [
        {"title": "Staff Engineer", "start": "2023", "end": "now", "employment_type": "full_time"}
    ]

    res = calculate_experience_duration(exp_year_now, as_of="2025-06-15")
    assert res["total_months"] == 24.0
    assert "DATE_YEAR_ONLY_INFERRED" in res["flags"]


# =============================================================================
# 5. Section Classification & Heading Variations
# =============================================================================

def test_heading_map_variations_in_fallback_extractor():
    """Verify _FallbackExtractorService recognizes diverse section heading variations."""
    extractor = _FallbackExtractorService()

    headings_to_test = [
        "RELATED EXPERIENCE",
        "PROJECT & WORK EXPERIENCE",
        "WORK & PROJECT EXPERIENCE",
        "PROFESSIONAL BACKGROUND",
        "RELEVANT EXPERIENCE",
        "CAREER HISTORY",
        "WORK HISTORY",
        "WORKING EXPERIENCE",
        "EXPERIENCE",
        "EXPERIENCES",
        "PENGALAMAN KERJA",
        "PENGALAMAN PROFESIONAL",
        "RIWAYAT PEKERJAAN",
    ]

    for heading in headings_to_test:
        raw_cv = f"""John Doe
john.doe@example.com

{heading}
Software Engineer
PT Inovasi Teknologi
Jan 2022 – Present
- Built high performance backend microservices
"""
        result = extractor.extract(raw_cv.encode("utf-8"), "resume.txt")
        data = result.to_dict()
        exp_sections = [s for s in data["sections"] if s["label"] == "experience"]
        assert len(exp_sections) >= 1, f"Heading '{heading}' was not recognized as experience section"


# =============================================================================
# 6. Adapter Experience Parsing (Parentheses, Dashes, Year-Only)
# =============================================================================

def test_parse_experiences_with_parentheses_and_en_dash():
    """Dates formatted as (11/2024 – 06/2025) must be parsed without losing title."""
    text = """Software Engineer
PT Teknologi Unggul
(11/2024 – 06/2025)
- Managed production databases
- Implemented gRPC endpoints"""

    exps = parse_experiences(text, text)
    assert len(exps) == 1
    assert exps[0]["title"] == "Software Engineer"
    assert exps[0]["organization"] == "PT Teknologi Unggul"
    assert exps[0]["start"]["value"] == "2024-11"
    assert exps[0]["end"]["value"] == "2025-06"
    assert len(exps[0]["bullets"]) >= 1


def test_parse_experiences_inline_parentheses_and_em_dash():
    """Title and dates on the same line with em-dash: Backend Engineer (01/2023 — 12/2023)."""
    text = """Backend Engineer (01/2023 — 12/2023)
PT Nusantara Cloud
- Scaled Kubernetes clusters"""

    exps = parse_experiences(text, text)
    assert len(exps) == 1
    assert exps[0]["title"] == "Backend Engineer"
    assert exps[0]["start"]["value"] == "2023-01"
    assert exps[0]["end"]["value"] == "2023-12"


def test_parse_experiences_year_to_now_and_sekarang():
    """Dates formatted as '2023 - now' and '2024 - Sekarang'."""
    text = """Backend Engineer
PT Digital Satu
2023 - now
- Core banking APIs

Frontend Engineer
PT Digital Dua
2024 - Sekarang
- React component design"""

    exps = parse_experiences(text, text)
    assert len(exps) == 2

    assert exps[0]["title"] == "Backend Engineer"
    assert exps[0]["start"]["value"] == "2023"
    assert exps[0]["end"]["value"] == "present"

    assert exps[1]["title"] == "Frontend Engineer"
    assert exps[1]["start"]["value"] == "2024"
    assert exps[1]["end"]["value"] == "present"


def test_parse_experiences_pure_year_not_lost():
    """Pure year entries like '2020 – 2022' must preserve candidate work experience entity."""
    text = """Fullstack Developer
PT Kreasi Bangsa
2020 – 2022
- Maintained distributed systems"""

    exps = parse_experiences(text, text)
    assert len(exps) == 1
    assert exps[0]["title"] == "Fullstack Developer"
    assert exps[0]["start"]["value"] == "2020"
    assert exps[0]["end"]["value"] == "2022"


# =============================================================================
# 7. Live TypeSafe SDK Execution & Telemetry Recording
# =============================================================================

@pytest.mark.asyncio
async def test_extract_work_experiences_jev_with_mock_client():
    """Regex extracts the entry, Jev validates it with NOUL, and telemetry is logged per entry."""
    run_id = uuid.uuid4()
    candidate_id = "CAND-JEV-EXP-001"

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = _noul_response(0.97)

    entities = await extract_work_experiences_jev(
        text=CV_WITH_ONE_ENTRY,
        client=mock_client,
        candidate_id=candidate_id,
        run_id=run_id,
    )

    assert mock_client.system_one.call_count == 1
    sent_state = mock_client.system_one.call_args.kwargs["state"]
    assert sent_state["experiences"]["exp_0"]["title"] == "Software Engineer"

    assert len(entities) == 1
    first = entities[0]
    assert first.title == "Software Engineer"
    assert first.company == "PT Solusi Awam"
    assert first.start == "2024-11"
    assert first.end == "2025-06"
    assert first.jev_validity == pytest.approx(0.97)
    assert first.flags == []

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT criterion_id, primitive_type, model, decision_value, confidence, grounding_valid
            FROM jev_calls
            WHERE candidate_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (candidate_id,),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["criterion_id"] == "EXPERIENCE_VALIDATION"
        assert row["primitive_type"] == "NOUL"
        assert row["model"] == "jev-latest"
        assert row["decision_value"] == "0.9700"
        assert row["confidence"] == pytest.approx(0.97, abs=0.01)
        assert row["grounding_valid"] is True


# =============================================================================
# 8. Jev Validation of Regex-Extracted Entries
# =============================================================================

_ENTRIES = [
    {"title": "Backend Engineer", "organization": "PT A", "start": "2021-01", "end": "2022-12", "bullets": []},
    {"title": "Ketua Himpunan Mahasiswa", "organization": "Kampus", "start": "2019-01", "end": "2019-12"},
    {"title": "Data Analyst", "organization": "PT B", "start": "2023-01", "end": "2023-06", "flags": ["X"]},
]


@pytest.mark.asyncio
async def test_validate_flags_confident_rejection_without_dropping_entries():
    """Confident rejection is flagged; uncertain answers are left untouched; nothing is dropped."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = _noul_response(0.95, 0.10, 0.50)

    validated = await validate_work_experiences_jev(_ENTRIES, client=mock_client)

    assert mock_client.system_one.call_count == 1
    assert [e["title"] for e in validated] == [e["title"] for e in _ENTRIES]
    assert validated[0]["flags"] == []
    assert validated[1]["flags"] == ["JEV_NOT_WORK_EXPERIENCE"]
    assert validated[2]["flags"] == ["X"]  # 0.50 is uncertain: existing flags kept, no rejection
    assert validated[1]["jev_validity"] == pytest.approx(0.10)
    assert "flags" not in _ENTRIES[0]  # inputs are not mutated


@pytest.mark.asyncio
async def test_validate_skips_jev_when_no_entries():
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)

    assert await validate_work_experiences_jev([], client=mock_client) == []
    mock_client.system_one.assert_not_called()


@pytest.mark.asyncio
async def test_validate_fails_fast_on_missing_answer():
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = _noul_response(0.95)  # only exp_0 answered

    with pytest.raises(ValueError, match="exp_1"):
        await validate_work_experiences_jev(_ENTRIES[:2], client=mock_client)


def test_duration_excludes_jev_rejected_entries():
    """Rejected entries keep their place in the profile but do not count toward duration."""
    profile = {
        "experiences": [
            {"title": "Backend Developer", "start": "2022-01", "end": "2023-12", "context": "experience",
             "bullets": [{"text": "FastAPI REST API"}]},
            {"title": "Backend Developer", "start": "2020-01", "end": "2021-12", "context": "experience",
             "bullets": [{"text": "FastAPI REST API"}], "flags": ["JEV_NOT_WORK_EXPERIENCE"]},
        ]
    }
    req = {"kind": "EXPERIENCE_DURATION", "params": {"min_months": 36, "accepted_role_families": ["backend"]}}

    st, conf, metrics, evs, flgs = eval_experience_duration(profile, req, as_of="2026-01-01")

    assert metrics["backend_months"] == 24.0
    assert st == "PARTIAL"
    assert "JEV_EXCLUDED_NON_WORK_ENTRY" in flgs
