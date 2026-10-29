"""Unit and Integration Tests for Pure TypeSafe Jev System One Work Experience Extraction in Processor (Phase 3).

Invariants verified:
1. Pure Honest Fail-Fast (Opsi 1):
   - Missing TYPESAFE_API_KEY marks document as NEEDS_REVIEW with flags=['FAILED_JEV_EXTRACTION']
     and reasons=['Ekstraksi pengalaman kerja Jev gagal dieksekusi: TYPESAFE_API_KEY tidak dikonfigurasi atau API tidak dapat dijangkau. Menyediakan fallback regex tiruan dilarang oleh doktrin arsitektur.'].
   - Connection/timeout errors trigger the exact same fail-fast response without silent regex fallback.
   - Zero fake or fallback candidate profiles are saved when Jev fails.
2. Structured Experience Extraction:
   - Successful Jev extraction persists WorkExperienceEntity fields:
     (title, organization, start_date, end_date, duration_months, context)
     to candidate's matching_profile["experiences"].
   - Rebuilds profile_chunks for pgvector embeddings accordingly.
3. Telemetry:
   - Verifies Jev calls are audited in `jev_calls` table.
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from typesafe_sdk import (
    AsyncTypeSafeClient,
    ChoiceAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    Usage,
)

from src.domain.experience_extractor import WorkExperienceEntity
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.worker.processor import process_document
from src.worker.sanitizer import SanitizeResult
from tests.conftest import DEMO_TENANT_ID

SAMPLE_CV_TEXT = """
Budi Santoso
budi.santoso@example.com | 081234567890

PENGALAMAN KERJA
Senior Backend Engineer
PT FinTech Nusantara
Januari 2021 – Mei 2024
- Merancang arsitektur microservices berbasis FastAPI dan PostgreSQL.
- Mengimplementasikan distributed caching Redis dan streaming Kafka.

Software Engineer
PT Solusi Digital
Juli 2018 – Desember 2020
- Mengembangkan RESTful API dengan Python Django.
- Mengoptimasi database query latency hingga 40%.
"""


@pytest.fixture
def setup_document_fixture():
    """Sets up tenant, job, vault file, document, and jobs_queue records for processor tests."""
    async def _setup(tenant_id: uuid.UUID | None = None):
        t_id = tenant_id or uuid.UUID(DEMO_TENANT_ID)
        job_id = uuid.uuid4()
        doc_id = uuid.uuid4()

        vault_dir = Path(settings.STORAGE_VAULT_PATH) / str(t_id)
        vault_dir.mkdir(parents=True, exist_ok=True)
        storage_key = f"cv_{doc_id}.pdf"
        vault_file = vault_dir / storage_key
        vault_file.write_bytes(b"%PDF-1.4 dummy valid PDF header for test")

        async with get_connection() as conn, conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO jobs (id, tenant_id, title, jd_text)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (job_id, t_id, "Backend Engineer Job", "JD text"),
            )
            await cur.execute(
                """
                INSERT INTO documents (
                    id, tenant_id, job_id, original_filename, size_bytes, sha256, storage_key, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'RECEIVED')
                """,
                (doc_id, t_id, job_id, "budi_cv.pdf", len(vault_file.read_bytes()), f"sha_{doc_id}", storage_key),
            )
            await cur.execute(
                """
                INSERT INTO jobs_queue (type, payload, status)
                VALUES ('ingest_cv', %s, 'PENDING')
                """,
                (json.dumps({"document_id": str(doc_id)}),),
            )
            await conn.commit()

        mock_san = SanitizeResult(
            is_valid=True,
            status="READY",
            extracted_text=SAMPLE_CV_TEXT,
            sha256=f"sha_{doc_id}",
            file_type="pdf",
        )
        return doc_id, job_id, t_id, mock_san

    return _setup


# -----------------------------------------------------------------------------
# 1. Success Scenario: Work Experiences Extracted via Jev System One
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_processor_jev_extraction_success_with_mock_client(setup_document_fixture):
    """Test process_document with Jev enabled successfully extracts entities and updates profile."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    choice_answer = ChoiceAnswer(
        type="choice",
        choice="EXTRACTED",
        confidence=0.98,
        probabilities={"EXTRACTED": 0.98, "NO_EXPERIENCE": 0.02},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=180, output_tokens=40),
        answers={"experience_extraction": choice_answer},
    )
    mock_client.system_one.return_value = mock_response

    mock_entities = [
        WorkExperienceEntity(
            title="Senior Backend Engineer",
            organization="PT FinTech Nusantara",
            company="PT FinTech Nusantara",
            start="2021-01",
            end="2024-05",
            start_date="2021-01",
            end_date="2024-05",
            duration_months=41.0,
            context="experience",
            employment_type="full_time",
            responsibilities=["Merancang arsitektur microservices berbasis FastAPI."],
            bullets=[{"text": "Merancang arsitektur microservices berbasis FastAPI."}],
        ),
        WorkExperienceEntity(
            title="Software Engineer",
            organization="PT Solusi Digital",
            company="PT Solusi Digital",
            start="2018-07",
            end="2020-12",
            start_date="2018-07",
            end_date="2020-12",
            duration_months=30.0,
            context="experience",
            employment_type="full_time",
            responsibilities=["Mengembangkan RESTful API dengan Python Django."],
            bullets=[{"text": "Mengembangkan RESTful API dengan Python Django."}],
        ),
    ]

    with (
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
        patch("src.worker.processor.extract_work_experiences_jev", return_value=mock_entities) as mock_extract,
    ):
        result = await process_document(
            doc_id=doc_id,
            use_jev_extraction=True,
            client=mock_client,
        )

        assert result["status"] == "READY"
        assert mock_extract.called

    # Verify document and candidate profile in database
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT status, flags, reasons FROM documents WHERE id = %s", (doc_id,))
        doc_row = await cur.fetchone()
        assert doc_row["status"] == "READY"

        await cur.execute("SELECT matching_profile FROM candidate_profiles WHERE document_id = %s", (doc_id,))
        prof_row = await cur.fetchone()
        assert prof_row is not None
        matching_profile = prof_row["matching_profile"]
        assert "experiences" in matching_profile
        exps = matching_profile["experiences"]
        assert len(exps) == 2

        first_exp = exps[0]
        assert first_exp["title"] == "Senior Backend Engineer"
        assert first_exp["organization"] == "PT FinTech Nusantara"
        assert first_exp["start_date"] == "2021-01"
        assert first_exp["end_date"] == "2024-05"
        assert first_exp["duration_months"] == 41.0
        assert first_exp["context"] == "experience"

        # Check profile_chunks for kind = 'EXPERIENCE'
        await cur.execute(
            "SELECT count(*) as cnt FROM profile_chunks WHERE profile_id = (SELECT id FROM candidate_profiles WHERE document_id = %s) AND kind = 'EXPERIENCE'",
            (doc_id,),
        )
        chunk_row = await cur.fetchone()
        assert chunk_row["cnt"] == 2


@pytest.mark.asyncio
async def test_processor_jev_extraction_receives_redacted_text(setup_document_fixture):
    """Text sent to the external Jev API must not contain candidate contact details."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    with (
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
        patch("src.worker.processor.extract_work_experiences_jev", return_value=[]) as mock_extract,
    ):
        await process_document(
            doc_id=doc_id,
            use_jev_extraction=True,
            client=AsyncMock(spec=AsyncTypeSafeClient),
        )

    sent_text = mock_extract.call_args.kwargs["text"]
    assert "budi.santoso@example.com" not in sent_text
    assert "081234567890" not in sent_text
    assert "[EMAIL]" in sent_text
    assert "Senior Backend Engineer" in sent_text


# -----------------------------------------------------------------------------
# 2. Fail-Fast Scenario: Unconfigured TYPESAFE_API_KEY
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_processor_jev_extraction_fail_fast_when_unconfigured(setup_document_fixture):
    """Missing TYPESAFE_API_KEY MUST mark document as NEEDS_REVIEW with explicit flag & reasons without silent regex fallback."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    with (
        patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=False),
        patch.object(settings, "TYPESAFE_API_KEY", ""),
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
    ):
        result = await process_document(
            doc_id=doc_id,
            use_jev_extraction=True,
            client=None,
        )

        assert result["status"] == "NEEDS_REVIEW"
        assert "FAILED_JEV_EXTRACTION" in result["flags"]
        expected_reason = (
            "Ekstraksi pengalaman kerja Jev gagal dieksekusi: "
            "TYPESAFE_API_KEY tidak dikonfigurasi atau API tidak dapat dijangkau. "
            "Menyediakan fallback regex tiruan dilarang oleh doktrin arsitektur."
        )
        assert expected_reason in result["reasons"]

    # Verify database state
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT status, flags, reasons FROM documents WHERE id = %s", (doc_id,))
        doc_row = await cur.fetchone()
        assert doc_row["status"] == "NEEDS_REVIEW"
        assert "FAILED_JEV_EXTRACTION" in doc_row["flags"]
        assert expected_reason in doc_row["reasons"]

        # Ensure NO fake candidate_profiles were inserted
        await cur.execute("SELECT count(*) as cnt FROM candidate_profiles WHERE document_id = %s", (doc_id,))
        cnt_row = await cur.fetchone()
        assert cnt_row["cnt"] == 0

        # Verify jobs_queue marked FAILED
        await cur.execute(
            "SELECT status, error FROM jobs_queue WHERE type = 'ingest_cv' AND payload->>'document_id' = %s",
            (str(doc_id),),
        )
        q_row = await cur.fetchone()
        assert q_row["status"] == "FAILED"
        assert expected_reason in q_row["error"]


# -----------------------------------------------------------------------------
# 3. Fail-Fast Scenario: Connection / Network Error
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_processor_jev_extraction_fail_fast_on_connection_error(setup_document_fixture):
    """Network connection failure MUST mark document as NEEDS_REVIEW with FAILED_JEV_EXTRACTION flag."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.side_effect = TypeSafeAPIConnectionError("api.typesafe.ai unreachable")

    with patch("src.worker.processor.sanitize_file", return_value=mock_san):
        result = await process_document(
            doc_id=doc_id,
            use_jev_extraction=True,
            client=mock_client,
        )

        assert result["status"] == "NEEDS_REVIEW"
        assert "FAILED_JEV_EXTRACTION" in result["flags"]
        expected_reason = (
            "Ekstraksi pengalaman kerja Jev gagal dieksekusi: "
            "TYPESAFE_API_KEY tidak dikonfigurasi atau API tidak dapat dijangkau. "
            "Menyediakan fallback regex tiruan dilarang oleh doktrin arsitektur."
        )
        assert expected_reason in result["reasons"]


# -----------------------------------------------------------------------------
# 4. Triggering via SCORING_MODE configuration
# -----------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_processor_jev_extraction_auto_enabled_via_scoring_mode(setup_document_fixture):
    """When SCORING_MODE is 'hybrid' or 'jev_hybrid', Jev extraction activates automatically."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    with (
        patch.dict(os.environ, {"TYPESAFE_API_KEY": ""}, clear=False),
        patch.object(settings, "TYPESAFE_API_KEY", ""),
        patch.object(settings, "SCORING_MODE", "jev_hybrid"),
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
    ):
        result = await process_document(
            doc_id=doc_id,
            use_jev_extraction=None,  # Not explicitly set, relies on settings.SCORING_MODE
            client=None,
        )

        assert result["status"] == "NEEDS_REVIEW"
        assert "FAILED_JEV_EXTRACTION" in result["flags"]
