"""Comprehensive test suite for TypeSafe Jev CHOICE Role Family Classification (Pure Fail-Fast).

Invariants verified:
1. Pure Honest Fail-Fast (Opsi 1): Unconfigured credentials or network connection failures
   MUST raise explicit exceptions (TypeSafeUnconfiguredError / TypeSafeAPIConnectionError)
   with ZERO silent fallback to regex.
2. High-Throughput Concurrency: Multiple candidate experiences evaluated concurrently via asyncio.gather().
3. Discrete Standard Label Space: One of ["BACKEND", "FRONTEND", "FULLSTACK", "DEVOPS_SRE", "DATA_AI", "MOBILE", "NON_TECHNICAL"].
4. Typed Prompt & State Context: Title and responsibility/achievement bullets formatted into typed Jev state.
5. Telemetry Logging: Every CHOICE call persists full telemetry to `jev_calls` table.
6. Mathematical Duration Integration: Merge intervals, 0.5 internship weighting, and date anomalies preserved.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from typesafe_sdk import (
    AsyncTypeSafeClient,
    ChoiceAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
    TypeSafeAuthenticationError,
    Usage,
)

from src.domain.agent import ScreeningAgent
from src.domain.kind_rules import (
    STANDARD_ROLE_FAMILIES,
    DualEvaluationResult,
    eval_experience_duration,
    eval_experience_duration_async,
    is_role_family_accepted,
)
from src.domain.models import ContextSectionType, CriterionKind, EvaluationStatus
from src.domain.verifier import (
    JevTypeSafeVerifierProvider,
    RoleFamilyChoiceResult,
    TypeSafeUnconfiguredError,
    build_role_family_state,
    classify_role_family_jev,
    normalize_role_family_choice,
    resolve_jev_primitive_params,
)
from src.infrastructure.database import get_connection


# -----------------------------------------------------------------------------
# 1. Unit Tests: Choice State Building and Label Normalization
# -----------------------------------------------------------------------------


def test_build_role_family_state_formats_bullets_and_title():
    title = "Senior Distributed Systems Engineer"
    bullets = [
        {"text": "Designed high-throughput Kafka streaming pipelines processing 50k events/sec."},
        {"text": "Implemented distributed locking and ACID transaction coordination in PostgreSQL."},
    ]
    state = build_role_family_state(title, bullets)
    assert state["job_title"] == "Senior Distributed Systems Engineer"
    assert "Kafka streaming" in state["responsibilities_and_achievements"]
    assert "distributed locking" in state["responsibilities_and_achievements"]


def test_build_role_family_state_handles_string_and_empty():
    state_str = build_role_family_state("Backend Developer", "Handled REST APIs.")
    assert state_str["job_title"] == "Backend Developer"
    assert state_str["responsibilities_and_achievements"] == "Handled REST APIs."

    state_empty = build_role_family_state("", [])
    assert state_empty["job_title"] == "Untitled Role"
    assert "No details provided" in state_empty["responsibilities_and_achievements"]


def test_normalize_role_family_choice_standard_labels():
    for label in STANDARD_ROLE_FAMILIES:
        assert normalize_role_family_choice(label) == label
        assert normalize_role_family_choice(label.lower()) == label

    assert normalize_role_family_choice("SRE") == "DEVOPS_SRE"
    assert normalize_role_family_choice("MACHINE_LEARNING") == "DATA_AI"
    assert normalize_role_family_choice("IOS_DEVELOPER") == "MOBILE"
    assert normalize_role_family_choice("HR_MANAGER") == "NON_TECHNICAL"
    assert normalize_role_family_choice("UNKNOWN_ROLE") == "NON_TECHNICAL"


def test_normalize_role_family_choice_matches_whole_tokens_only():
    """Substring look-alikes must not be read as a technical family (e.g. 'AI' inside 'RETAIL')."""
    for label in ("RETAIL", "MAINTAINER", "AIRFLOW_ADMIN", "DATABASE_CLERK", "SALESFORCE"):
        assert normalize_role_family_choice(label) == "NON_TECHNICAL", label

    assert normalize_role_family_choice("FULL_STACK") == "FULLSTACK"
    assert normalize_role_family_choice("full-stack developer") == "FULLSTACK"
    assert normalize_role_family_choice("AI_ENGINEER") == "DATA_AI"
    assert normalize_role_family_choice("BACKEND_ENGINEER") == "BACKEND"


def test_resolve_jev_primitive_params_binary_tools_match_whole_words():
    def prim(*concepts: str) -> str:
        return resolve_jev_primitive_params("SKILL", importance="MUST_HAVE", concepts=list(concepts))["primitive"]

    assert prim("git") == "noul"
    assert prim("docker-compose") == "noul"
    assert prim("github actions") == "noul"
    assert prim("cert:aws") == "noul"
    # look-alikes are proficiency skills, not binary tools
    assert prim("digital marketing") == "score"
    assert prim("legit") == "score"
    assert prim("python") == "score"


# -----------------------------------------------------------------------------
# 2. Asynchronous Role Family Classification via Jev CHOICE
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_classify_role_family_jev_backend_success():
    run_id = uuid.uuid4()
    candidate_id = "CAND-BE-001"

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    choice_ans = ChoiceAnswer(
        type="choice",
        choice="BACKEND",
        confidence=0.96,
        probabilities={"BACKEND": 0.96, "FULLSTACK": 0.03, "FRONTEND": 0.01},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=55, output_tokens=2),
        answers={"role_family": choice_ans},
    )
    mock_client.system_one.return_value = mock_response

    result: RoleFamilyChoiceResult = await classify_role_family_jev(
        title="Backend Engineer",
        bullets=[{"text": "Built FastAPI microservices and optimized PostgreSQL queries."}],
        client=mock_client,
        candidate_id=candidate_id,
        run_id=run_id,
        criterion_id="EXPERIENCE_DURATION",
    )

    assert result.role_family == "BACKEND"
    assert abs(result.confidence - 0.96) < 0.01
    assert result.latency_ms > 0

    # Verify telemetry in jev_calls
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, decision_value, confidence, input_tokens, output_tokens, grounding_valid
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["primitive_type"] == "CHOICE"
        assert row["decision_value"] == "BACKEND"
        assert abs(row["confidence"] - 0.96) < 0.01
        assert row["input_tokens"] == 55
        assert row["output_tokens"] == 2
        assert row["grounding_valid"] is True


# -----------------------------------------------------------------------------
# 3. Pure Honest Fail-Fast (Opsi 1) Tests
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pure_fail_fast_unconfigured_api_key():
    """Invariant 3: Missing credentials MUST raise TypeSafeUnconfiguredError without fallback to regex."""
    with patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=True):
        with pytest.raises(TypeSafeUnconfiguredError) as exc_info:
            await classify_role_family_jev(
                title="Backend Developer",
                bullets=[{"text": "Python APIs"}],
                client=None,
            )
        assert "TYPESAFE_API_KEY" in str(exc_info.value)

        # Invariant: eval_experience_duration_async also raises TypeSafeUnconfiguredError!
        profile = {
            "experiences": [
                {
                    "title": "Backend Developer",
                    "start": "2021-01",
                    "end": "2024-01",
                    "bullets": [{"text": "Python FastAPI"}],
                }
            ]
        }
        req = {"kind": "EXPERIENCE_DURATION", "params": {"min_months": 24}}
        with pytest.raises(TypeSafeUnconfiguredError):
            await eval_experience_duration_async(
                profile=profile,
                req=req,
                client=None,
                use_jev=True,
            )


@pytest.mark.asyncio
async def test_pure_fail_fast_network_connection_error():
    """Invariant 3: Network drop/timeout MUST raise TypeSafeAPIConnectionError without fallback to regex."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.side_effect = httpx.ConnectError("Failed to connect to https://api.typesafe.ai")

    with pytest.raises(TypeSafeAPIConnectionError) as exc_info:
        await classify_role_family_jev(
            title="Backend Developer",
            bullets=[{"text": "FastAPI"}],
            client=mock_client,
        )
    assert "connection" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_pure_fail_fast_network_timeout_error():
    """Invariant 3: Timeout error MUST raise TypeSafeAPIConnectionError."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.side_effect = TypeSafeAPITimeoutError(10.0)

    with pytest.raises(TypeSafeAPITimeoutError):
        await classify_role_family_jev(
            title="SRE Engineer",
            bullets=[{"text": "Kubernetes"}],
            client=mock_client,
        )


# -----------------------------------------------------------------------------
# 4. High-Throughput Concurrency (asyncio.gather) Test
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_high_throughput_concurrency_multiple_experiences():
    """Invariant 5: Evaluates all experiences concurrently via asyncio.gather()."""
    run_id = uuid.uuid4()
    candidate_id = "CAND-CONCURRENT-001"

    role_mapping = {
        "Senior Backend Lead": "BACKEND",
        "Frontend Developer": "FRONTEND",
        "DevOps Platform Engineer": "DEVOPS_SRE",
        "Fullstack Intern": "FULLSTACK",
    }

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)

    async def mock_system_one(state, questions, **kwargs):
        title = state.get("job_title", "")
        choice_val = role_mapping.get(title, "NON_TECHNICAL")
        choice_ans = ChoiceAnswer(
            type="choice",
            choice=choice_val,
            confidence=0.95,
            probabilities={choice_val: 0.95},
        )
        return SystemOneResponse(
            model="jev-latest",
            usage=Usage(input_tokens=40, output_tokens=1),
            answers={"role_family": choice_ans},
        )

    mock_client.system_one.side_effect = mock_system_one

    profile = {
        "experiences": [
            {
                "title": "Senior Backend Lead",
                "start": "2023-01",
                "end": "2024-12",  # 24 months inclusive (2023-01 to 2024-12)
                "context": "experience",
                "bullets": [{"text": "Go microservices"}],
            },
            {
                "title": "Frontend Developer",
                "start": "2022-01",
                "end": "2022-12",  # 12 months (FRONTEND, not accepted for backend req)
                "context": "experience",
                "bullets": [{"text": "React Tailwind"}],
            },
            {
                "title": "DevOps Platform Engineer",
                "start": "2021-01",
                "end": "2021-12",  # 12 months (DEVOPS_SRE)
                "context": "experience",
                "bullets": [{"text": "Kubernetes CI/CD"}],
            },
            {
                "title": "Fullstack Intern",
                "start": "2020-01",
                "end": "2020-12",  # 12 months internship -> 6 months weighted (FULLSTACK accepted)
                "context": "internship",
                "employment_type": "internship",
                "bullets": [{"text": "Node.js React"}],
            },
        ]
    }

    req = {
        "requirement_id": "R_EXP_BACKEND",
        "description": "Minimal 2.5 tahun (30 bulan) pengalaman backend atau fullstack development",
        "kind": "EXPERIENCE_DURATION",
        "params": {
            "min_months": 30,
            "accepted_role_families": ["backend", "fullstack"],
        },
    }

    state, conf, metrics, evs, flags = await eval_experience_duration_async(
        profile=profile,
        req=req,
        as_of="2026-01-01",
        client=mock_client,
        candidate_id=candidate_id,
        run_id=run_id,
        use_jev=True,
    )

    # 24 months Backend + 6 months Fullstack intern (12 * 0.5) = 30.0 months -> STRONG
    assert metrics["backend_months"] == 30.0
    assert state == "STRONG"
    assert len(evs) == 2  # Backend Lead + Fullstack Intern
    assert conf == 0.95

    # Invariant 4: Verify 4 separate Jev CHOICE records in jev_calls
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT count(*) as total_calls
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s AND primitive_type = 'CHOICE'
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["total_calls"] == 4


# -----------------------------------------------------------------------------
# 5. Dual-Mode Dispatch & Backward Compatibility
# -----------------------------------------------------------------------------


def test_eval_experience_duration_dual_mode_synchronous_unpacked():
    """Verifies that calling eval_experience_duration synchronously unpacks seamlessly."""
    profile = {
        "experiences": [
            {
                "title": "Backend Developer",
                "start": "2022-01",
                "end": "2024-12",  # 36 months
                "context": "experience",
                "bullets": [{"text": "FastAPI REST API"}],
            }
        ]
    }
    req = {
        "kind": "EXPERIENCE_DURATION",
        "params": {"min_months": 36, "accepted_role_families": ["backend"]},
    }

    # Synchronous unpacking:
    st, conf, metrics, evs, flgs = eval_experience_duration(profile, req, as_of="2026-01-01")
    assert st == "STRONG"
    assert metrics["backend_months"] == 36.0
    assert len(evs) == 1


@pytest.mark.asyncio
async def test_eval_experience_duration_dual_mode_awaited_with_jev():
    """Verifies that awaiting eval_experience_duration executes asynchronous Jev flow."""
    run_id = uuid.uuid4()
    candidate_id = "CAND-DUAL-001"

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=30, output_tokens=1),
        answers={
            "role_family": ChoiceAnswer(
                type="choice",
                choice="BACKEND",
                confidence=0.92,
                probabilities={"BACKEND": 0.92},
            )
        },
    )

    profile = {
        "experiences": [
            {
                "title": "Backend Developer",
                "start": "2023-01",
                "end": "2023-12",  # 12 months -> PARTIAL for 36 months requirement
                "context": "experience",
                "bullets": [{"text": "FastAPI REST API"}],
            }
        ]
    }
    req = {
        "kind": "EXPERIENCE_DURATION",
        "params": {"min_months": 36, "accepted_role_families": ["backend"]},
    }

    st, conf, metrics, evs, flgs = await eval_experience_duration(
        profile=profile,
        req=req,
        as_of="2026-01-01",
        client=mock_client,
        candidate_id=candidate_id,
        run_id=run_id,
        use_jev=True,
    )
    assert st == "PARTIAL"
    assert metrics["backend_months"] == 12.0


def _stub_role_classifier(role_family: str, confidence: float):
    async def _classify(title, bullets):
        return RoleFamilyChoiceResult(role_family=role_family, confidence=confidence, raw_choice=role_family)

    return _classify


_BACKEND_PROFILE = {
    "experiences": [
        {
            "title": "Backend Developer",
            "start": "2022-01",
            "end": "2024-12",  # 36 months
            "context": "experience",
            "bullets": [{"text": "FastAPI REST API"}],
        }
    ]
}
_BACKEND_REQ = {
    "kind": "EXPERIENCE_DURATION",
    "params": {"min_months": 36, "accepted_role_families": ["backend"]},
}


@pytest.mark.asyncio
async def test_low_confidence_role_family_falls_back_to_rule_classifier():
    """A low-confidence Jev role family must not exclude the experience; rule classifier decides, flagged."""
    st, conf, metrics, evs, flgs = await eval_experience_duration_async(
        profile=_BACKEND_PROFILE,
        req=_BACKEND_REQ,
        as_of="2026-01-01",
        use_jev=True,
        role_classifier=_stub_role_classifier("NON_TECHNICAL", 0.30),
    )
    assert st == "STRONG"
    assert metrics["backend_months"] == 36.0
    assert flgs.count("JEV_ROLE_FAMILY_LOW_CONFIDENCE") == 1


@pytest.mark.asyncio
async def test_confident_role_family_is_trusted():
    """A confident Jev role family overrides the rule classifier without a low-confidence flag."""
    st, conf, metrics, evs, flgs = await eval_experience_duration_async(
        profile=_BACKEND_PROFILE,
        req=_BACKEND_REQ,
        as_of="2026-01-01",
        use_jev=True,
        role_classifier=_stub_role_classifier("NON_TECHNICAL", 0.95),
    )
    assert st == "NOT_DEMONSTRATED"
    assert "JEV_ROLE_FAMILY_LOW_CONFIDENCE" not in flgs


# -----------------------------------------------------------------------------
# 6. Autonomous ScreeningAgent Integration Test
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_screening_agent_evaluates_experience_duration_with_jev():
    """Verifies that ScreeningAgent seamlessly uses Jev CHOICE for EXPERIENCE_DURATION."""
    run_id = uuid.uuid4()
    candidate_id = "CAND-AGENT-001"

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=42, output_tokens=1),
        answers={
            "role_family": ChoiceAnswer(
                type="choice",
                choice="BACKEND",
                confidence=0.95,
                probabilities={"BACKEND": 0.95},
            ),
            "chunk_0": ChoiceAnswer(
                type="choice",
                choice="STRONG",
                confidence=0.95,
                probabilities={"STRONG": 0.95},
            ),
        },
    )

    provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

    profile = {
        "candidate_id": candidate_id,
        "experiences": [
            {
                "title": "Principal Backend Architect",
                "start": "2020-01",
                "end": "2023-12",  # 48 months
                "context": "experience",
                "bullets": [{"text": "Designed core banking backend microservices in Go and Python."}],
            }
        ],
        "educations": [],
        "certifications": [],
        "skills": ["python", "go", "postgresql"],
        "projects": [],
    }

    cv_text = "Principal Backend Architect. Designed core banking backend microservices in Go and Python."

    requirements = [
        {
            "requirement_id": "R_DUR_01",
            "kind": CriterionKind.EXPERIENCE_DURATION.value,
            "description": "Minimal 3 tahun pengalaman sebagai backend engineer",
            "weight": 1.0,
            "importance": "MUST_HAVE",
            "category": "EXPERIENCE",
            "params": {"min_months": 36, "accepted_role_families": ["backend"]},
        }
    ]

    agent = ScreeningAgent(
        job_id="JOB-01",
        candidate_id=candidate_id,
        run_id=str(run_id),
        requirements=requirements,
        profile=profile,
        raw_cv_text=cv_text,
        verifier_provider=provider,
        as_of="2026-01-01",
    )

    state = await agent.run()

    res = state.evaluation_results.get("R_DUR_01")
    assert res is not None
    assert res.state == EvaluationStatus.STRONG
    assert res.metrics.backend_months == 48.0
    assert len(res.evidences) == 1
    assert "Principal Backend Architect" in res.evidences[0].verbatim_quote

    # Verify jev_calls has recorded the CHOICE call
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, decision_value, candidate_id
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s AND primitive_type = 'CHOICE'
            LIMIT 1
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["primitive_type"] == "CHOICE"
        assert row["decision_value"] == "BACKEND"
