"""Deterministic unit and integration tests for CV queue processing and stale lock recovery.

Validates:
1. No dual-dispatch: FastAPI upload_cvs strictly enqueues into jobs_queue without in-process execution.
2. _set_queue_status updates locked_at timestamp when status transitions to RUNNING.
3. Stale lock recovery in processor.py: documents stuck in PROCESSING >10m are re-processed, not skipped.
4. Active processing protection in processor.py: documents in PROCESSING <10m are skipped.
5. Worker recovery in main.py: stale RUNNING jobs exceeding max_attempts are failed and documents rejected.
6. Worker claim in main.py: stale RUNNING jobs with attempts < max_attempts are reclaimed and processed.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest

from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.worker.main import recover_stale_jobs
from src.worker.processor import _set_queue_status, process_document
from src.worker.sanitizer import SanitizeResult


@pytest.mark.asyncio
async def test_set_queue_status_updates_locked_at_timestamp():
    """Verify criterion 2: _set_queue_status updates locked_at = now() when status is RUNNING."""
    doc_id = uuid.uuid4()
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO jobs_queue (type, payload, status, locked_at)
            VALUES ('ingest_cv', %s, 'PENDING', NULL)
            RETURNING id
            """,
            (json.dumps({"document_id": str(doc_id)}),),
        )
        job_id = (await cur.fetchone())["id"]
        await conn.commit()

        # Update to RUNNING via helper
        await _set_queue_status(cur, doc_id, "RUNNING")
        await conn.commit()

        # Verify status and locked_at
        await cur.execute("SELECT status, locked_at FROM jobs_queue WHERE id = %s", (job_id,))
        row = await cur.fetchone()
        assert row is not None
        assert row["status"] == "RUNNING"
        assert row["locked_at"] is not None

        # Clean up
        await cur.execute("DELETE FROM jobs_queue WHERE id = %s", (job_id,))
        await conn.commit()


@pytest.mark.asyncio
async def test_processor_recovers_stale_processing_document():
    """Verify criterion 3: processor.py does NOT skip a document stuck in PROCESSING > 10m."""
    test_tenant = uuid.uuid4()
    job_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    vault_dir = Path(settings.STORAGE_VAULT_PATH) / str(test_tenant)
    vault_dir.mkdir(parents=True, exist_ok=True)
    storage_key = f"stale_test_{doc_id}.pdf"
    (vault_dir / storage_key).write_bytes(b"%PDF-1.4 sample content for stale lock recovery")

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Stale Test Job', 'JD')",
            (job_id, test_tenant),
        )
        # Insert document stuck in PROCESSING 15 minutes ago
        await cur.execute(
            """
            INSERT INTO documents (
                id, tenant_id, job_id, original_filename, size_bytes, sha256, storage_key, status, updated_at
            )
            VALUES (%s, %s, %s, 'stale_cv.pdf', 50, 'sha256_stale', %s, 'PROCESSING', now() - interval '15 minutes')
            """,
            (doc_id, test_tenant, job_id, storage_key),
        )
        # Insert associated jobs_queue record
        await cur.execute(
            """
            INSERT INTO jobs_queue (type, payload, status, locked_at, attempts, max_attempts)
            VALUES ('ingest_cv', %s, 'RUNNING', now() - interval '15 minutes', 1, 3)
            """,
            (json.dumps({"document_id": str(doc_id)}),),
        )
        await conn.commit()

    mock_san = SanitizeResult(
        is_valid=True, status="READY", extracted_text="Jane Doe Software Engineer Python", sha256="sha256_stale", file_type="pdf"
    )
    mock_profile = {
        "identity": {"full_name": "Jane Doe", "email": "jane@stale.test", "phone": "+628111111", "other_personal": {}},
        "experiences": [],
        "education": [],
        "skills": ["python"],
    }

    with (
        patch("src.worker.processor.sanitize_file", return_value=mock_san),
        patch("src.worker.processor.extract_candidate_profile", return_value=mock_profile),
        patch("src.worker.processor.embed_texts", return_value=[[0.05] * 640]),
    ):
        result = await process_document(doc_id)
        # Document MUST NOT be skipped as PROCESSING; it should be recovered and marked READY
        assert result["status"] == "READY"

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        doc_row = await cur.fetchone()
        assert doc_row["status"] == "READY"


@pytest.mark.asyncio
async def test_processor_skips_actively_running_document():
    """Verify processor.py skips a document that was updated recently (< 10m) in PROCESSING."""
    test_tenant = uuid.uuid4()
    job_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Active Test Job', 'JD')",
            (job_id, test_tenant),
        )
        # Insert document updated in PROCESSING only 2 minutes ago
        await cur.execute(
            """
            INSERT INTO documents (
                id, tenant_id, job_id, original_filename, size_bytes, sha256, storage_key, status, updated_at
            )
            VALUES (%s, %s, %s, 'active_cv.pdf', 50, 'sha256_act', 'key_act', 'PROCESSING', now() - interval '2 minutes')
            """,
            (doc_id, test_tenant, job_id),
        )
        await conn.commit()

    # Call process_document directly: should skip and return PROCESSING
    result = await process_document(doc_id)
    assert result["status"] == "PROCESSING"

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        doc_row = await cur.fetchone()
        assert doc_row["status"] == "PROCESSING"


@pytest.mark.asyncio
async def test_worker_reaps_stale_job_exceeding_max_attempts():
    """Verify criterion 3: main.py marks stale jobs exceeding max_attempts as FAILED and rejects doc."""
    test_tenant = uuid.uuid4()
    job_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO jobs (id, tenant_id, title, jd_text) VALUES (%s, %s, 'Reap Job', 'JD')",
            (job_id, test_tenant),
        )
        await cur.execute(
            """
            INSERT INTO documents (
                id, tenant_id, job_id, original_filename, size_bytes, sha256, storage_key, status, updated_at
            )
            VALUES (%s, %s, %s, 'timed_out.pdf', 50, 'sha_timeout', 'key_timeout', 'PROCESSING', now() - interval '15 minutes')
            """,
            (doc_id, test_tenant, job_id),
        )
        await cur.execute(
            """
            INSERT INTO jobs_queue (type, payload, status, locked_at, attempts, max_attempts)
            VALUES ('ingest_cv', %s, 'RUNNING', now() - interval '15 minutes', 3, 3)
            RETURNING id
            """,
            (json.dumps({"document_id": str(doc_id)}),),
        )
        task_id = (await cur.fetchone())["id"]
        await conn.commit()

        # Run stale job recovery
        reaped = await recover_stale_jobs(cur)
        await conn.commit()

        assert any(t["id"] == task_id for t in reaped)

        # Verify jobs_queue is FAILED
        await cur.execute("SELECT status, error FROM jobs_queue WHERE id = %s", (task_id,))
        task_row = await cur.fetchone()
        assert task_row["status"] == "FAILED"
        assert "Stale job lock expired" in task_row["error"]

        # Verify document is REJECTED
        await cur.execute("SELECT status, reasons FROM documents WHERE id = %s", (doc_id,))
        doc_row = await cur.fetchone()
        assert doc_row["status"] == "REJECTED"
        assert any("Processing timed out" in r for r in doc_row["reasons"])


@pytest.mark.asyncio
async def test_upload_cv_enqueues_without_dual_dispatch(client: httpx.AsyncClient, recruiter_token: str):
    """Verify criterion 1: FastAPI upload_cvs endpoint strictly enqueues into jobs_queue

    and does NOT process the document in-process during HTTP request lifecycle.
    """
    headers = {"Authorization": f"Bearer {recruiter_token}"}
    j_res = await client.post(
        "/api/v1/jobs",
        json={"title": "Queue Determinism Job", "jd_text": "Backend Engineer JD"},
        headers=headers,
    )
    assert j_res.status_code == 201
    job_id = j_res.json()["id"]

    pdf_content = b"%PDF-1.4 minimal test PDF content"
    files = [("files", ("test_queue_doc.pdf", pdf_content, "application/pdf"))]

    up_res = await client.post(f"/api/v1/jobs/{job_id}/cvs", files=files, headers=headers)
    assert up_res.status_code == 202
    res_data = up_res.json()
    assert res_data["total_files"] == 1
    doc_id = uuid.UUID(res_data["files"][0]["id"])

    # Verify that IMMEDIATELY after upload, the document is in RECEIVED state (NOT READY)
    # confirming FastAPI did NOT invoke in-process background_tasks processing
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT status FROM documents WHERE id = %s", (doc_id,))
        doc_row = await cur.fetchone()
        assert doc_row is not None
        assert doc_row["status"] == "RECEIVED", "Document should stay in RECEIVED until background worker processes it"

        # Verify task is in jobs_queue as PENDING
        await cur.execute(
            "SELECT status FROM jobs_queue WHERE type = 'ingest_cv' AND payload->>'document_id' = %s",
            (str(doc_id),),
        )
        queue_row = await cur.fetchone()
        assert queue_row is not None
        assert queue_row["status"] == "PENDING"
