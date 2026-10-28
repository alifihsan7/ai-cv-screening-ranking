"""Unit and Integration Tests for Pure TypeSafe Jev System One JD Compilation (Phase 1).

Invariants verified:
1. Pure Honest Fail-Fast (Opsi 1):
   - Missing TYPESAFE_API_KEY raises HTTPException(503) with explicit honest error message.
   - Network connection errors or timeouts raise HTTPException(503) without silent regex fallback.
2. Structured Role Family Integration:
   - Successful Jev System One CHOICE classification maps role family to requirement metadata.
   - Relevant requirements (EXPERIENCE / EXPERIENCE_DURATION) have their concepts augmented with role_family.
3. Telemetry Persistence:
   - Invocations persist call metrics into `jev_calls` table with criterion_id='JD_ROLE_FAMILY'.
"""

from __future__ import annotations

import os
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from typesafe_sdk import (
    AsyncTypeSafeClient,
    ChoiceAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    Usage,
)

from src.api.main import app
from src.domain.jd_compiler import compile_job_requirements
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from tests.conftest import DEMO_TENANT_ID

SAMPLE_JD = """
Lowongan Senior Backend Engineer
PT Teknologi Nusantara Mandiri

Tanggung Jawab:
- Merancang dan membangun arsitektur microservices performa tinggi menggunakan Python dan FastAPI.
- Mengelola database PostgreSQL berskala besar dengan ACID transaction guarantees.
- Mengimplementasikan streaming pipelines Kafka dan caching Redis.

Persyaratan:
- Pengalaman kerja minimal 4 tahun di bidang backend development.
- Menguasai bahasa pemrograman Python dan Docker containerization.
- Terbiasa dengan REST API design dan clean architecture.
"""


# -----------------------------------------------------------------------------
# 1. Domain Level: compile_job_requirements with Jev System One
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_jd_compiler_jev_success_with_mock_client():
    """Verify live System One CHOICE classification augments concepts, metadata, and records telemetry."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    choice_answer = ChoiceAnswer(
        type="choice",
        choice="BACKEND",
        confidence=0.97,
        probabilities={"BACKEND": 0.97, "FULLSTACK": 0.02, "FRONTEND": 0.01},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=120, output_tokens=3),
        answers={"role_family": choice_answer},
    )
    mock_client.system_one.return_value = mock_response

    res = await compile_job_requirements(
        jd_text=SAMPLE_JD,
        tenant_id=uuid.UUID(DEMO_TENANT_ID),
        use_jev=True,
        client=mock_client,
    )

    # 1. Check returned metadata
    assert res.get("role_family") == "role_family:backend"
    assert "metadata" in res
    assert res["metadata"]["role_family"] == "role_family:backend"
    assert res["metadata"]["source"] == "jev_system_one"
    assert res["metadata"]["confidence"] == pytest.approx(0.97, abs=0.01)

    # 2. Check concept augmentation on relevant requirements
    exp_reqs = [
        r
        for r in res["requirements"]
        if r.get("category") == "EXPERIENCE" or r.get("kind") == "EXPERIENCE_DURATION"
    ]
    assert len(exp_reqs) > 0
    assert any("role_family:backend" in r.get("concepts", []) for r in exp_reqs)

    # 3. Check telemetry persistence in jev_calls table
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, model, decision_value, confidence, criterion_id, grounding_valid
            FROM jev_calls
            WHERE criterion_id = 'JD_ROLE_FAMILY'
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["primitive_type"] == "CHOICE"
        assert row["decision_value"] == "BACKEND"
        assert row["confidence"] == pytest.approx(0.97, abs=0.01)
        assert row["grounding_valid"] is True


@pytest.mark.asyncio
async def test_jd_compiler_jev_fail_fast_when_unconfigured():
    """Missing TYPESAFE_API_KEY MUST raise HTTPException(503) without silent regex fallback."""
    with patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=False), patch.object(
        settings, "TYPESAFE_API_KEY", ""
    ):
        with pytest.raises(HTTPException) as exc_info:
            await compile_job_requirements(
                jd_text=SAMPLE_JD,
                tenant_id=uuid.UUID(DEMO_TENANT_ID),
                use_jev=True,
                client=None,
            )

        assert exc_info.value.status_code == 503
        expected_msg = (
            "Gagal mengompilasi lowongan via TypeSafe Jev: "
            "TYPESAFE_API_KEY belum dikonfigurasi atau API tidak dapat dijangkau. "
            "Sediakan API key resmi dari https://console.typesafe.ai."
        )
        assert exc_info.value.detail == expected_msg


@pytest.mark.asyncio
async def test_jd_compiler_jev_fail_fast_on_connection_error():
    """Network connection failure MUST raise HTTPException(503) without silent fallback."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.side_effect = TypeSafeAPIConnectionError("Failed to reach api.typesafe.ai")

    with pytest.raises(HTTPException) as exc_info:
        await compile_job_requirements(
            jd_text=SAMPLE_JD,
            tenant_id=uuid.UUID(DEMO_TENANT_ID),
            use_jev=True,
            client=mock_client,
        )

    assert exc_info.value.status_code == 503
    expected_msg = (
        "Gagal mengompilasi lowongan via TypeSafe Jev: "
        "TYPESAFE_API_KEY belum dikonfigurasi atau API tidak dapat dijangkau. "
        "Sediakan API key resmi dari https://console.typesafe.ai."
    )
    assert exc_info.value.detail == expected_msg


# -----------------------------------------------------------------------------
# 2. API Route Level: /compile and /compile-preview
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compile_endpoint_jev_success(recruiter_token: str):
    """Test POST /api/v1/jobs/{job_id}/requirements/compile?use_jev=true with mock Jev client."""
    job_id = uuid.uuid4()
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO jobs (id, tenant_id, title, jd_text)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (job_id, uuid.UUID(DEMO_TENANT_ID), "Backend Engineer", SAMPLE_JD),
        )
        await conn.commit()

    with patch("src.domain.jd_compiler.classify_role_family_jev") as mock_classify:
        from src.domain.verifier import RoleFamilyChoiceResult

        mock_classify.return_value = RoleFamilyChoiceResult(
            role_family="BACKEND",
            confidence=0.99,
            raw_choice="BACKEND",
            latency_ms=12.5,
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/v1/jobs/{job_id}/requirements/compile?use_jev=true",
                headers={"Authorization": f"Bearer {recruiter_token}"},
            )

        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "DRAFT"
        assert data.get("role_family") == "role_family:backend"
        assert "metadata" in data
        assert data["metadata"]["role_family"] == "role_family:backend"


@pytest.mark.asyncio
async def test_compile_endpoint_jev_unconfigured_fail_fast_503(recruiter_token: str):
    """Test POST /api/v1/jobs/{job_id}/requirements/compile?use_jev=true fails fast with 503 when unconfigured."""
    job_id = uuid.uuid4()
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO jobs (id, tenant_id, title, jd_text)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (job_id, uuid.UUID(DEMO_TENANT_ID), "Backend Engineer", SAMPLE_JD),
        )
        await conn.commit()

    with patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=False), patch.object(
        settings, "TYPESAFE_API_KEY", ""
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/v1/jobs/{job_id}/requirements/compile?use_jev=true",
                headers={"Authorization": f"Bearer {recruiter_token}"},
            )

        assert resp.status_code == 503
        data = resp.json()
        expected_msg = (
            "Gagal mengompilasi lowongan via TypeSafe Jev: "
            "TYPESAFE_API_KEY belum dikonfigurasi atau API tidak dapat dijangkau. "
            "Sediakan API key resmi dari https://console.typesafe.ai."
        )
        assert data["detail"] == expected_msg


@pytest.mark.asyncio
async def test_compile_preview_endpoint_jev_unconfigured_fail_fast_503(recruiter_token: str):
    """Test POST /api/v1/requirements/compile-preview with use_jev=true fails fast with 503."""
    with patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=False), patch.object(
        settings, "TYPESAFE_API_KEY", ""
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/requirements/compile-preview",
                headers={"Authorization": f"Bearer {recruiter_token}"},
                json={"jd_text": SAMPLE_JD, "use_jev": True},
            )

        assert resp.status_code == 503
        data = resp.json()
        assert "TYPESAFE_API_KEY belum dikonfigurasi" in data["detail"]
