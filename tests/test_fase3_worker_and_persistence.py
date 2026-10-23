"""Test suite for Fase 3: Agent Orchestrator screening integration, PostgreSQL trajectory persistence, and typesafe audit exposition."""

from __future__ import annotations

import json
import uuid
from typing import Any
from unittest.mock import patch

import httpx
import pytest
import pytest_asyncio

import src.domain.screening_service as screening_svc_module
from src.domain.agent import run_screening_agent
from src.domain.auth import create_access_token
from src.domain.models import UserRole
from src.domain.screening_service import execute_screening_run
from src.infrastructure.database import get_connection

TEST_TENANT = uuid.uuid4()
ADMIN_USER = uuid.uuid4()


@pytest_asyncio.fixture
async def setup_fase3_env():
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO users (id, tenant_id, email, password_hash, role)
            VALUES (%s, %s, %s, 'hash', 'admin')
            ON CONFLICT (email) DO NOTHING
            """,
            (ADMIN_USER, TEST_TENANT, f"admin_fase3_{ADMIN_USER}@test.com"),
        )
        await conn.commit()


@pytest.fixture
def auth_headers(setup_fase3_env) -> dict[str, str]:
    token = create_access_token(
        {
            "sub": str(ADMIN_USER),
            "tenant_id": str(TEST_TENANT),
            "email": f"admin_fase3_{ADMIN_USER}@test.com",
            "role": UserRole.ADMIN.value,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_full_screening_execution_with_agent_persists_trajectory_and_metrics(
    client: httpx.AsyncClient, auth_headers: dict[str, str]
):
    """Verifies that execute_screening_run with use_agent=True persists reasoning_trajectory,

    offsets (char_start/char_end) in evidence, and react_agent method in requirement_scores.
    """
    job_id = uuid.uuid4()
    set_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    cand_id = uuid.uuid4()
    run_id = uuid.uuid4()

    cv_text = """
    # Work Experience
    Senior Software Engineer at ACME Corp (2020-01 to 2024-01)
    - Architected distributed backend services in Python and PostgreSQL.
    - Mentored junior engineers and improved test coverage.

    # Education
    Universitas Indonesia - Bachelor in Computer Science (2015 to 2019)
    """

    profile_data = {
        "work_experiences": [
            {
                "company": "ACME Corp",
                "role": "Senior Software Engineer",
                "title": "Senior Software Engineer",
                "start": "2020-01",
                "end": "2024-01",
                "start_date": "2020-01",
                "end_date": "2024-01",
                "duration_months": 48,
                "responsibilities": ["Architected distributed backend services in Python and PostgreSQL."],
                "skills": ["Python", "PostgreSQL"],
                "bullets": [{"text": "Architected distributed backend services in Python and PostgreSQL."}],
            }
        ],
        "educations": [
            {
                "institution": "Universitas Indonesia",
                "degree": "Bachelor",
                "major": "Computer Science",
            }
        ],
        "skills": ["Python", "PostgreSQL"],
    }

    async with get_connection() as conn, conn.cursor() as cur:
        # 1. Job & Requirement Set
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Senior Python Engineer', 'Job Desc')",
            (job_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
            VALUES (%s, %s, %s, 1, 'APPROVED', '{"HARD_SKILLS": 50, "EXPERIENCE": 50}'::jsonb)
            """,
            (set_id, TEST_TENANT, job_id),
        )
        await cur.execute(
            """
            INSERT INTO requirements (id, tenant_id, requirement_set_id, requirement_id, description, category, kind, importance, weight, concepts, params)
            VALUES
            (%s, %s, %s, 'R_SKILL_PY', 'Python programming skills', 'HARD_SKILLS', 'SKILL', 'MUST_HAVE', 10, ARRAY['python'], '{}'::jsonb),
            (%s, %s, %s, 'R_EXP_DUR', 'Minimum 3 years experience', 'EXPERIENCE', 'EXPERIENCE_DURATION', 'MUST_HAVE', 10, ARRAY['backend'], '{"min_months": 36}'::jsonb)
            """,
            (uuid.uuid4(), TEST_TENANT, set_id, uuid.uuid4(), TEST_TENANT, set_id),
        )

        # 2. Candidates, Document & Candidate Profile
        await cur.execute(
            "INSERT INTO candidates (id, tenant_id, candidate_code) VALUES (%s, %s, %s)",
            (cand_id, TEST_TENANT, f"C-{uuid.uuid4().hex[:6]}"),
        )
        await cur.execute(
            """
            INSERT INTO documents (id, tenant_id, job_id, candidate_id, original_filename, size_bytes, sha256, status)
            VALUES (%s, %s, %s, %s, 'candidate_cv.pdf', 1024, 'sha_cand_1', 'READY')
            """,
            (doc_id, TEST_TENANT, job_id, cand_id),
        )
        await cur.execute(
            """
            INSERT INTO candidate_profiles (id, tenant_id, document_id, profile, matching_profile, full_text_redacted, extractor_version)
            VALUES (%s, %s, %s, %s, %s, %s, '1.0')
            """,
            (
                uuid.uuid4(),
                TEST_TENANT,
                doc_id,
                json.dumps(profile_data),
                json.dumps(profile_data),
                cv_text,
            ),
        )

        # 3. Create screening run in QUEUED status
        await cur.execute(
            """
            INSERT INTO screening_runs (id, tenant_id, job_id, requirement_set_id, status, as_of, versions, params)
            VALUES (%s, %s, %s, %s, 'QUEUED', '2026-10-01', '{"scoring": "2.0.0"}'::jsonb, '{"use_agent": true}'::jsonb)
            """,
            (run_id, TEST_TENANT, job_id, set_id),
        )
        await conn.commit()

    # Execute screening run with use_agent=True
    exec_res = await execute_screening_run(run_id, use_agent=True)
    assert exec_res["status"] == "COMPLETED"
    assert exec_res["total_candidates"] == 1

    # Database Verification
    async with get_connection() as conn, conn.cursor() as cur:
        # Check screening_run status
        await cur.execute("SELECT status, finished_at FROM screening_runs WHERE id = %s", (run_id,))
        run_row = await cur.fetchone()
        assert run_row["status"] == "COMPLETED"
        assert run_row["finished_at"] is not None

        # Check candidate_scores
        await cur.execute(
            """
            SELECT rank, final_score, band, recommendation, reasoning_trajectory
            FROM candidate_scores
            WHERE run_id = %s AND candidate_id = %s
            """,
            (run_id, cand_id),
        )
        score_row = await cur.fetchone()
        assert score_row is not None
        assert score_row["band"] in ("A", "B")
        assert score_row["recommendation"] in ("SHORTLIST", "REVIEW")

        traj = score_row["reasoning_trajectory"]
        assert isinstance(traj, list)
        assert len(traj) >= 5, f"Expected at least 5 reasoning steps, got {len(traj)}"

        step_actions = [s["action"] for s in traj]
        assert "INITIALIZE_SESSION" in step_actions
        assert "DOCLING_PARSER" in step_actions
        assert "CRITIQUE_REFLECT" in step_actions
        assert "DETERMINISTIC_SCORER" in step_actions
        assert "FINALIZE_RUN" in step_actions

        for idx, step in enumerate(traj, 1):
            assert step["step_number"] == idx
            assert isinstance(step["thought"], str) and len(step["thought"]) > 0
            assert isinstance(step["action"], str) and len(step["action"]) > 0
            assert isinstance(step["observation"], str) and len(step["observation"]) > 0
            assert isinstance(step["state_mutation"], str)

        # Check requirement_scores
        await cur.execute(
            """
            SELECT requirement_id, state, confidence, method, metrics
            FROM requirement_scores
            WHERE run_id = %s AND candidate_id = %s
            ORDER BY requirement_id
            """,
            (run_id, cand_id),
        )
        req_rows = await cur.fetchall()
        assert len(req_rows) == 2
        for r_row in req_rows:
            assert r_row["method"] == "react_agent"
            assert float(r_row["confidence"]) > 0.0
            assert isinstance(r_row["metrics"], dict)

        # Check evidence citations with character offsets
        await cur.execute(
            """
            SELECT quote, context, verified, char_start, char_end
            FROM evidence
            WHERE run_id = %s AND candidate_id = %s
            """,
            (run_id, cand_id),
        )
        ev_rows = await cur.fetchall()
        assert len(ev_rows) > 0
        for ev in ev_rows:
            assert ev["quote"]
            assert ev["context"]
            assert ev["verified"] is True
            assert ev["char_start"] is not None and ev["char_start"] >= 0
            assert ev["char_end"] is not None and ev["char_end"] > ev["char_start"]


@pytest.mark.asyncio
async def test_get_candidate_detail_exposes_reasoning_trajectory(
    client: httpx.AsyncClient, auth_headers: dict[str, str]
):
    """Verifies that GET /api/v1/jobs/{job_id}/screenings/{run_id}/candidates/{cv_id}

    exposes reasoning_trajectory in the response JSON.
    """
    job_id = uuid.uuid4()
    set_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    cand_id = uuid.uuid4()
    run_id = uuid.uuid4()

    sample_traj = [
        {
            "step_number": 1,
            "timestamp_utc": "2026-10-23T12:00:00Z",
            "thought": "Initializing screening session.",
            "action": "INITIALIZE_SESSION",
            "action_input": {"action_type": "GENERAL"},
            "observation": "Ready for evaluation.",
            "state_mutation": "current_phase -> INIT",
        },
        {
            "step_number": 2,
            "timestamp_utc": "2026-10-23T12:00:01Z",
            "thought": "Direct rule matched.",
            "action": "DIRECT_RULE_MATCH",
            "action_input": {"action_type": "GENERAL"},
            "observation": "Verified as STRONG.",
            "state_mutation": "evaluation_results[R1] -> STRONG",
        },
    ]

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Detail Test Job', 'JD')",
            (job_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
            VALUES (%s, %s, %s, 1, 'APPROVED', '{"HARD_SKILLS": 100}'::jsonb)
            """,
            (set_id, TEST_TENANT, job_id),
        )
        await cur.execute(
            """
            INSERT INTO requirements (id, tenant_id, requirement_set_id, requirement_id, description, category, kind, importance, weight)
            VALUES (%s, %s, %s, 'R1', 'Python dev', 'HARD_SKILLS', 'SKILL', 'MUST_HAVE', 10)
            """,
            (uuid.uuid4(), TEST_TENANT, set_id),
        )
        await cur.execute(
            "INSERT INTO candidates (id, tenant_id, candidate_code) VALUES (%s, %s, %s)",
            (cand_id, TEST_TENANT, f"C-{uuid.uuid4().hex[:6]}"),
        )
        await cur.execute(
            """
            INSERT INTO documents (id, tenant_id, job_id, candidate_id, original_filename, size_bytes, sha256, status)
            VALUES (%s, %s, %s, %s, 'detail_test.pdf', 500, 'sha_detail', 'READY')
            """,
            (doc_id, TEST_TENANT, job_id, cand_id),
        )
        await cur.execute(
            """
            INSERT INTO screening_runs (id, tenant_id, job_id, requirement_set_id, status, as_of, versions, params)
            VALUES (%s, %s, %s, %s, 'COMPLETED', '2026-10-01', '{}'::jsonb, '{}'::jsonb)
            """,
            (run_id, TEST_TENANT, job_id, set_id),
        )
        await cur.execute(
            """
            INSERT INTO candidate_scores (
                run_id, candidate_id, tenant_id, document_id, rank, band,
                raw_score, final_score, capped, recommendation, category_scores, flags, coverage,
                reasoning_trajectory
            )
            VALUES (%s, %s, %s, %s, 1, 'A', 95.0, 95.0, false, 'SHORTLIST', '{"HARD_SKILLS": 95}'::jsonb, '{}', 1.0, %s)
            """,
            (run_id, cand_id, TEST_TENANT, doc_id, json.dumps(sample_traj)),
        )
        await cur.execute(
            """
            INSERT INTO requirement_scores (run_id, candidate_id, requirement_id, tenant_id, state, confidence, method, metrics)
            VALUES (%s, %s, 'R1', %s, 'STRONG', 0.95, 'react_agent', '{}'::jsonb)
            """,
            (run_id, cand_id, TEST_TENANT),
        )
        await conn.commit()

    resp = await client.get(
        f"/api/v1/jobs/{job_id}/screenings/{run_id}/candidates/{cand_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    assert data["cv_id"] == str(cand_id)
    assert data["file_name"] == "detail_test.pdf"
    assert float(data["score"]) == 95.0
    assert data["band"] == "A"
    assert data["recommendation"] == "SHORTLIST"
    assert "reasoning_trajectory" in data
    assert isinstance(data["reasoning_trajectory"], list)
    assert len(data["reasoning_trajectory"]) == 2
    assert data["reasoning_trajectory"][0]["action"] == "INITIALIZE_SESSION"
    assert data["reasoning_trajectory"][1]["action"] == "DIRECT_RULE_MATCH"


@pytest.mark.asyncio
async def test_screening_run_idempotency(auth_headers: dict[str, str]):
    """Verifies that executing a run that is already COMPLETED is an idempotent no-op."""
    job_id = uuid.uuid4()
    set_id = uuid.uuid4()
    run_id = uuid.uuid4()

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Idempotency Job', 'JD')",
            (job_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
            VALUES (%s, %s, %s, 1, 'APPROVED', '{"HARD_SKILLS": 100}'::jsonb)
            """,
            (set_id, TEST_TENANT, job_id),
        )
        await cur.execute(
            """
            INSERT INTO screening_runs (id, tenant_id, job_id, requirement_set_id, status, as_of, versions, params)
            VALUES (%s, %s, %s, %s, 'COMPLETED', '2026-10-01', '{}'::jsonb, '{}'::jsonb)
            """,
            (run_id, TEST_TENANT, job_id, set_id),
        )
        await conn.commit()

    # Rerun already COMPLETED run
    res = await execute_screening_run(run_id)
    assert res["status"] == "COMPLETED"
    assert res["run_id"] == str(run_id)


@pytest.mark.asyncio
async def test_error_isolation_on_faulty_candidate(auth_headers: dict[str, str]):
    """Verifies that an unexpected exception during agent evaluation of one CV is isolated

    to that candidate (marked NEEDS_REVIEW) without aborting or failing the overall run.
    """
    job_id = uuid.uuid4()
    set_id = uuid.uuid4()
    good_doc_id = uuid.uuid4()
    good_cand_id = uuid.uuid4()
    faulty_doc_id = uuid.uuid4()
    faulty_cand_id = uuid.uuid4()
    run_id = uuid.uuid4()

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Isolation Test Job', 'JD')",
            (job_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
            VALUES (%s, %s, %s, 1, 'APPROVED', '{"HARD_SKILLS": 100}'::jsonb)
            """,
            (set_id, TEST_TENANT, job_id),
        )
        await cur.execute(
            """
            INSERT INTO requirements (id, tenant_id, requirement_set_id, requirement_id, description, category, kind, importance, weight)
            VALUES (%s, %s, %s, 'R_ISO', 'General Skill', 'HARD_SKILLS', 'SKILL', 'MUST_HAVE', 10)
            """,
            (uuid.uuid4(), TEST_TENANT, set_id),
        )

        # Good Candidate
        await cur.execute(
            "INSERT INTO candidates (id, tenant_id, candidate_code) VALUES (%s, %s, 'C-GOOD')",
            (good_cand_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO documents (id, tenant_id, job_id, candidate_id, original_filename, size_bytes, sha256, status)
            VALUES (%s, %s, %s, %s, 'good.pdf', 100, 'sha_good', 'READY')
            """,
            (good_doc_id, TEST_TENANT, job_id, good_cand_id),
        )
        await cur.execute(
            """
            INSERT INTO candidate_profiles (id, tenant_id, document_id, profile, matching_profile, full_text_redacted, extractor_version)
            VALUES (%s, %s, %s, '{}'::jsonb, '{"skills": ["General Skill"]}'::jsonb, 'Work experience text', '1.0')
            """,
            (uuid.uuid4(), TEST_TENANT, good_doc_id),
        )

        # Faulty Candidate
        await cur.execute(
            "INSERT INTO candidates (id, tenant_id, candidate_code) VALUES (%s, %s, 'C-FAULT')",
            (faulty_cand_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO documents (id, tenant_id, job_id, candidate_id, original_filename, size_bytes, sha256, status)
            VALUES (%s, %s, %s, %s, 'faulty.pdf', 100, 'sha_faulty', 'READY')
            """,
            (faulty_doc_id, TEST_TENANT, job_id, faulty_cand_id),
        )
        await cur.execute(
            """
            INSERT INTO candidate_profiles (id, tenant_id, document_id, profile, matching_profile, full_text_redacted, extractor_version)
            VALUES (%s, %s, %s, '{}'::jsonb, '{}'::jsonb, 'Corrupt profile', '1.0')
            """,
            (uuid.uuid4(), TEST_TENANT, faulty_doc_id),
        )

        await cur.execute(
            """
            INSERT INTO screening_runs (id, tenant_id, job_id, requirement_set_id, status, as_of, versions, params)
            VALUES (%s, %s, %s, %s, 'QUEUED', '2026-10-01', '{}'::jsonb, '{"use_agent": true}'::jsonb)
            """,
            (run_id, TEST_TENANT, job_id, set_id),
        )
        await conn.commit()

    # Monkeypatch run_screening_agent so faulty candidate raises an exception
    real_run_agent = run_screening_agent

    async def mock_run_screening_agent(*args: Any, **kwargs: Any):
        cid = kwargs.get("candidate_id") or (args[1] if len(args) > 1 else "")
        if str(cid) == str(faulty_cand_id):
            raise RuntimeError("Simulated unhandled LLM service crash on corrupt document")
        return await real_run_agent(*args, **kwargs)

    with patch.object(screening_svc_module, "run_screening_agent", side_effect=mock_run_screening_agent):
        res = await execute_screening_run(run_id, use_agent=True)
        assert res["status"] == "COMPLETED"

    # Verify candidate records in DB
    async with get_connection() as conn, conn.cursor() as cur:
        # Good candidate should be scored normally
        await cur.execute(
            "SELECT rank, band, recommendation, reasoning_trajectory FROM candidate_scores WHERE run_id = %s AND candidate_id = %s",
            (run_id, good_cand_id),
        )
        good_row = await cur.fetchone()
        assert good_row is not None
        assert good_row["band"] in ("A", "B")
        assert len(good_row["reasoning_trajectory"]) > 0

        # Faulty candidate should be isolated with NEEDS_REVIEW / MANUAL_CHECK
        await cur.execute(
            "SELECT rank, band, recommendation, flags FROM candidate_scores WHERE run_id = %s AND candidate_id = %s",
            (run_id, faulty_cand_id),
        )
        faulty_row = await cur.fetchone()
        assert faulty_row is not None
        assert faulty_row["band"] == "R"
        assert faulty_row["recommendation"] == "MANUAL_CHECK"
        assert "AGENT_EVALUATION_ERROR" in faulty_row["flags"]


@pytest.mark.asyncio
async def test_trigger_screening_endpoint_supports_use_agent(
    client: httpx.AsyncClient, auth_headers: dict[str, str]
):
    """Verifies that POST /api/v1/jobs/{job_id}/screenings accepts use_agent in payload."""
    job_id = uuid.uuid4()
    set_id = uuid.uuid4()

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'API Payload Test Job', 'JD')",
            (job_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
            VALUES (%s, %s, %s, 1, 'APPROVED', '{"HARD_SKILLS": 100}'::jsonb)
            """,
            (set_id, TEST_TENANT, job_id),
        )
        await conn.commit()

    resp = await client.post(
        f"/api/v1/jobs/{job_id}/screenings",
        json={"as_of": "2026-10-01", "use_agent": True, "use_verifier": False},
        headers=auth_headers,
    )
    assert resp.status_code == 202
    run_id = uuid.UUID(resp.json()["screening_run_id"])

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT params FROM screening_runs WHERE id = %s", (run_id,))
        row = await cur.fetchone()
        assert row is not None
        assert row["params"].get("use_agent") is True


@pytest.mark.asyncio
async def test_legacy_screening_execution_without_agent_fallback(auth_headers: dict[str, str]):
    """Verifies that execute_screening_run with use_agent=False completes using legacy rule engine

    with empty trajectory and method='rule'.
    """
    job_id = uuid.uuid4()
    set_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    cand_id = uuid.uuid4()
    run_id = uuid.uuid4()

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Legacy Rule Job', 'JD')",
            (job_id, TEST_TENANT),
        )
        await cur.execute(
            """
            INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
            VALUES (%s, %s, %s, 1, 'APPROVED', '{"HARD_SKILLS": 100}'::jsonb)
            """,
            (set_id, TEST_TENANT, job_id),
        )
        await cur.execute(
            """
            INSERT INTO requirements (id, tenant_id, requirement_set_id, requirement_id, description, category, kind, importance, weight)
            VALUES (%s, %s, %s, 'R_LEGACY', 'Python skill', 'HARD_SKILLS', 'SKILL', 'MUST_HAVE', 10)
            """,
            (uuid.uuid4(), TEST_TENANT, set_id),
        )
        await cur.execute(
            "INSERT INTO candidates (id, tenant_id, candidate_code) VALUES (%s, %s, %s)",
            (cand_id, TEST_TENANT, f"C-{uuid.uuid4().hex[:6]}"),
        )
        await cur.execute(
            """
            INSERT INTO documents (id, tenant_id, job_id, candidate_id, original_filename, size_bytes, sha256, status)
            VALUES (%s, %s, %s, %s, 'legacy.pdf', 500, 'sha_legacy', 'READY')
            """,
            (doc_id, TEST_TENANT, job_id, cand_id),
        )
        await cur.execute(
            """
            INSERT INTO candidate_profiles (id, tenant_id, document_id, profile, matching_profile, full_text_redacted, extractor_version)
            VALUES (%s, %s, %s, '{}'::jsonb, '{"skills": ["Python skill"]}'::jsonb, 'Python experience', '1.0')
            """,
            (uuid.uuid4(), TEST_TENANT, doc_id),
        )
        await cur.execute(
            """
            INSERT INTO screening_runs (id, tenant_id, job_id, requirement_set_id, status, as_of, versions, params)
            VALUES (%s, %s, %s, %s, 'QUEUED', '2026-10-01', '{}'::jsonb, '{"use_agent": false}'::jsonb)
            """,
            (run_id, TEST_TENANT, job_id, set_id),
        )
        await conn.commit()

    exec_res = await execute_screening_run(run_id, use_agent=False)
    assert exec_res["status"] == "COMPLETED"

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "SELECT rank, band, reasoning_trajectory FROM candidate_scores WHERE run_id = %s AND candidate_id = %s",
            (run_id, cand_id),
        )
        score_row = await cur.fetchone()
        assert score_row is not None
        assert score_row["reasoning_trajectory"] == []

        await cur.execute(
            "SELECT method FROM requirement_scores WHERE run_id = %s AND candidate_id = %s",
            (run_id, cand_id),
        )
        req_row = await cur.fetchone()
        assert req_row is not None
        assert req_row["method"] == "rule"

