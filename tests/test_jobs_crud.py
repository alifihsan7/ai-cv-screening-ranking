import pytest
from httpx import ASGITransport, AsyncClient

from src.api.main import app
from src.domain.auth import create_access_token


@pytest.mark.asyncio
async def test_job_update_rename_and_delete():
    token = create_access_token(
        data={
            "sub": "ce12fcef-601b-4fb8-b8ed-f3eab5e8de6c",
            "role": "recruiter",
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "email": "recruiter@rifqisetiawan.my.id",
        }
    )
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a job
        res_create = await ac.post(
            "/api/v1/jobs",
            headers=headers,
            json={
                "title": "Temporary Test Job for Deletion",
                "jd_text": "Deskripsi singkat lowongan uji coba untuk pengujian delete dan rename.",
                "location": "Jakarta",
            },
        )
        assert res_create.status_code == 201
        job_data = res_create.json()
        job_id = job_data["id"]
        assert job_data["title"] == "Temporary Test Job for Deletion"

        # 2. Rename and update JD text of the job
        res_patch = await ac.patch(
            f"/api/v1/jobs/{job_id}",
            headers=headers,
            json={
                "title": "Renamed Test Job",
                "jd_text": "Updated JD Text with deterministic requirements.",
                "location": "Bandung",
                "employment_type": "Remote",
            },
        )
        assert res_patch.status_code == 200
        patched_data = res_patch.json()
        assert patched_data["title"] == "Renamed Test Job"
        assert patched_data["jd_text"] == "Updated JD Text with deterministic requirements."
        assert patched_data["location"] == "Bandung"
        assert patched_data["employment_type"] == "Remote"

        # Verify GET returns updated jd_text
        res_get = await ac.get(f"/api/v1/jobs/{job_id}", headers=headers)
        assert res_get.status_code == 200
        assert res_get.json()["jd_text"] == "Updated JD Text with deterministic requirements."

        # Import draft requirements and check X-Requirements-Status header
        res_import = await ac.post(
            f"/api/v1/jobs/{job_id}/requirements/import-approved",
            headers=headers,
            json={
                "requirement_set_version": 1,
                "category_weights": {"HARD_SKILLS": 100},
                "requirements": [
                    {
                        "requirement_id": "R1",
                        "description": "Python mastery",
                        "category": "HARD_SKILLS",
                        "kind": "SKILL",
                        "importance": "MUST_HAVE",
                        "weight": 10.0,
                    }
                ],
                "status": "DRAFT",
            },
        )
        assert res_import.status_code == 201
        assert res_import.json()["status"] == "DRAFT"

        res_reqs = await ac.get(f"/api/v1/jobs/{job_id}/requirements", headers=headers)
        assert res_reqs.status_code == 200
        assert res_reqs.headers.get("X-Requirements-Status") == "DRAFT"

        # 3. Delete the job
        res_del = await ac.delete(f"/api/v1/jobs/{job_id}", headers=headers)
        assert res_del.status_code == 200
        assert res_del.json()["message"] == "Job deleted successfully"

        # 4. Verify 404 on deleted job
        res_del_again = await ac.delete(f"/api/v1/jobs/{job_id}", headers=headers)
        assert res_del_again.status_code == 404


@pytest.mark.asyncio
async def test_requirement_version_shadowing_and_zombie_cleanup():
    from src.infrastructure.database import get_connection
    import uuid

    tenant_id = "00000000-0000-0000-0000-000000000001"
    token = create_access_token(
        data={
            "sub": "ce12fcef-601b-4fb8-b8ed-f3eab5e8de6c",
            "role": "recruiter",
            "tenant_id": tenant_id,
            "email": "recruiter@rifqisetiawan.my.id",
        }
    )
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a job
        res_create = await ac.post(
            "/api/v1/jobs",
            headers=headers,
            json={
                "title": "Version Shadowing Test Job",
                "jd_text": "Membutuhkan software engineer.",
                "location": "Jakarta",
            },
        )
        assert res_create.status_code == 201
        job_id = res_create.json()["id"]

        # 2. Import requirements version 1
        res_import_v1 = await ac.post(
            f"/api/v1/jobs/{job_id}/requirements/import-approved",
            headers=headers,
            json={
                "requirement_set_version": 1,
                "category_weights": {"HARD_SKILLS": 100},
                "requirements": [
                    {
                        "requirement_id": "R1",
                        "description": "Python mastery",
                        "category": "HARD_SKILLS",
                        "kind": "SKILL",
                        "importance": "MUST_HAVE",
                        "weight": 10.0,
                    }
                ],
                "status": "APPROVED",
            },
        )
        assert res_import_v1.status_code == 201

        # 3. Insert an empty requirement set v2 (e.g. zombie set from aborted compile)
        async with get_connection() as conn, conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO requirement_sets (id, tenant_id, job_id, version, status, category_weights)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (uuid.uuid4(), tenant_id, job_id, 2, "DRAFT", "{}"),
            )
            await conn.commit()

        # 4. Query get_job_requirements: must return v1 with criteria, not the empty v2
        res_get_reqs = await ac.get(f"/api/v1/jobs/{job_id}/requirements", headers=headers)
        assert res_get_reqs.status_code == 200
        reqs = res_get_reqs.json()
        assert len(reqs) == 1
        assert reqs[0]["requirement_id"] == "R1"
        assert res_get_reqs.headers.get("X-Requirements-Version") == "1"

        # 5. Import/save again at version 1: empty v2 should be purged as zombie
        res_import_again = await ac.post(
            f"/api/v1/jobs/{job_id}/requirements/import-approved",
            headers=headers,
            json={
                "requirement_set_version": 1,
                "category_weights": {"HARD_SKILLS": 100},
                "requirements": [
                    {
                        "requirement_id": "R1",
                        "description": "Python mastery updated",
                        "category": "HARD_SKILLS",
                        "kind": "SKILL",
                        "importance": "MUST_HAVE",
                        "weight": 10.0,
                    }
                ],
                "status": "APPROVED",
            },
        )
        assert res_import_again.status_code == 201

        # Verify zombie v2 was purged from DB
        async with get_connection() as conn, conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(*) as cnt FROM requirement_sets WHERE job_id = %s AND version = 2",
                (job_id,),
            )
            cnt = (await cur.fetchone())["cnt"]
            assert cnt == 0

        # Clean up job
        await ac.delete(f"/api/v1/jobs/{job_id}", headers=headers)
