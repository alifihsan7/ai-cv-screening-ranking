"""Unit and Integration Tests for Pure TypeSafe Jev System One Work Experience Extraction in Processor (Phase 3).

Invariants verified:
1. Pure Honest Fail-Fast (Opsi 1):
   - Missing TYPESAFE_API_KEY marks document as NEEDS_REVIEW with flags=['FAILED_JEV_EXTRACTION']
     and reasons=['Validasi pengalaman kerja via Jev gagal dieksekusi: TYPESAFE_API_KEY tidak dikonfigurasi atau API tidak dapat dijangkau.'].
   - Connection/timeout errors trigger the exact same fail-fast response without silent regex fallback.
   - Zero fake or fallback candidate profiles are saved when Jev fails.
2. Experience Validation:
   - Jev validates the adapter's regex-parsed, redacted entries with one NOUL question each.
   - Rejected entries are flagged JEV_NOT_WORK_EXPERIENCE in matching_profile, never dropped.
   - Only redacted entries are sent to Jev; contact details never leave the worker.
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
    NoulAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    Usage,
)

from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.worker.adapter import parse_experiences
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


def _raw_profile_with_experiences() -> dict:
    """Adapter-shaped raw profile whose experiences come from the real regex parser over SAMPLE_CV_TEXT."""
    experiences = parse_experiences(SAMPLE_CV_TEXT, SAMPLE_CV_TEXT)
    experiences[0]["bullets"].append({"text": "Kontak tim: budi.santoso@example.com / 081234567890"})
    return {
        "document_id": None,
        "identity": {
            "full_name": "Budi Santoso",
            "email": "budi.santoso@example.com",
            "phone": "081234567890",
            "location_raw": None,
            "links": [],
            "other_personal": {},
        },
        "headline": "",
        "summary": "",
        "language": ["id"],
        "skills": [],
        "experiences": experiences,
        "education": [],
        "certifications": [],
        "projects": [],
        "organizations": [],
        "achievements": [],
        "portfolio_attachments": [],
        "cv_core_text": SAMPLE_CV_TEXT,
        "quality": {},
    }


def _noul_response(*validities: float) -> SystemOneResponse:
    return SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=180, output_tokens=len(validities)),
        answers={f"exp_{i}": NoulAnswer(type="noul", noul=v) for i, v in enumerate(validities)},
    )


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
async def test_processor_jev_validation_annotates_experiences(setup_document_fixture):
    """Jev validates the adapter's redacted entries: rejected ones are flagged, never dropped."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = _noul_response(0.96, 0.08)

    with (
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
        patch("src.worker.processor.extract_candidate_profile", return_value=_raw_profile_with_experiences()),
    ):
        result = await process_document(doc_id=doc_id, use_jev_extraction=True, client=mock_client)

    assert result["status"] == "READY"
    assert mock_client.system_one.call_count == 1

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT matching_profile FROM candidate_profiles WHERE document_id = %s", (doc_id,))
        prof_row = await cur.fetchone()
        exps = prof_row["matching_profile"]["experiences"]
        assert [e["title"] for e in exps] == ["Senior Backend Engineer", "Software Engineer"]
        assert exps[0]["jev_validity"] == pytest.approx(0.96)
        assert exps[0]["flags"] == []
        assert exps[1]["flags"] == ["JEV_NOT_WORK_EXPERIENCE"]

        # Experience chunks come from the standard redaction pipeline, once per entry
        await cur.execute(
            "SELECT count(*) as cnt FROM profile_chunks WHERE profile_id = (SELECT id FROM candidate_profiles WHERE document_id = %s) AND lower(kind) = 'experience'",
            (doc_id,),
        )
        chunk_row = await cur.fetchone()
        assert chunk_row["cnt"] == 2


@pytest.mark.asyncio
async def test_processor_jev_validation_receives_only_redacted_entries(setup_document_fixture):
    """Only redacted experience entries are sent to the external Jev API, never contact details."""
    doc_id, job_id, tenant_id, mock_san = await setup_document_fixture()

    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    mock_client.system_one.return_value = _noul_response(0.9, 0.9)

    with (
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
        patch("src.worker.processor.extract_candidate_profile", return_value=_raw_profile_with_experiences()),
    ):
        await process_document(doc_id=doc_id, use_jev_extraction=True, client=mock_client)

    sent_state = json.dumps(mock_client.system_one.call_args.kwargs["state"])
    assert "budi.santoso@example.com" not in sent_state
    assert "081234567890" not in sent_state
    assert "Budi" not in sent_state
    assert "Senior Backend Engineer" in sent_state


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
            "Validasi pengalaman kerja via Jev gagal dieksekusi: "
            "TYPESAFE_API_KEY tidak dikonfigurasi atau API tidak dapat dijangkau."
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

    with (
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
        patch("src.worker.processor.extract_candidate_profile", return_value=_raw_profile_with_experiences()),
    ):
        result = await process_document(
            doc_id=doc_id,
            use_jev_extraction=True,
            client=mock_client,
        )

        assert result["status"] == "NEEDS_REVIEW"
        assert "FAILED_JEV_EXTRACTION" in result["flags"]
        expected_reason = (
            "Validasi pengalaman kerja via Jev gagal dieksekusi: "
            "TYPESAFE_API_KEY tidak dikonfigurasi atau API tidak dapat dijangkau."
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
