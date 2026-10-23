"""Executes fresh screening runs with ReAct autonomous agent and Jev TypeSafe verifier
on active jobs in the operational application database (cv_screening).
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import date

from src.domain.screening_service import execute_screening_run
from src.domain.verifier import JevTypeSafeVerifierProvider
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.infrastructure.logging import logger


async def refresh_operational_job_screenings() -> None:
    jev_provider = JevTypeSafeVerifierProvider()
    today_str = date.today().isoformat()

    async with get_connection() as conn, conn.cursor() as cur:
        # 1. Fetch active/open jobs with ready documents
        await cur.execute(
            """
            SELECT j.id, j.tenant_id, j.title, count(d.id) as cv_count
            FROM jobs j
            JOIN documents d ON d.job_id = j.id AND d.tenant_id = j.tenant_id
            WHERE d.status IN ('READY', 'REJECTED', 'NEEDS_REVIEW', 'DUPLICATE')
            GROUP BY j.id, j.tenant_id, j.title
            ORDER BY j.created_at ASC
            """
        )
        jobs = await cur.fetchall()
        print(f"[*] Found {len(jobs)} jobs with candidates in operational database:")
        for j in jobs:
            print(f"    - Job ID: {j['id']} | Title: '{j['title']}' | Candidates: {j['cv_count']}")

        # Ensure jobs are in OPEN status
        await cur.execute("UPDATE jobs SET status = 'OPEN' WHERE status = 'DRAFT'")
        await conn.commit()

        run_ids: list[tuple[uuid.UUID, uuid.UUID, str]] = []

        for j in jobs:
            job_id = j["id"]
            tenant_id = j["tenant_id"]
            title = j["title"]

            # 2. Get latest approved requirement set
            await cur.execute(
                """
                SELECT id, version FROM requirement_sets
                WHERE job_id = %s AND tenant_id = %s AND status = 'APPROVED'
                ORDER BY version DESC LIMIT 1
                """,
                (job_id, tenant_id),
            )
            req_set = await cur.fetchone()
            if not req_set:
                print(f"[!] Warning: Job {job_id} ({title}) has no approved requirement set. Skipping.")
                continue

            req_set_id = req_set["id"]

            # 3. Snapshot eligibility rules
            await cur.execute(
                """
                SELECT id, rule_type, value, basis_category, reference_date
                FROM eligibility_rules
                WHERE job_id = %s AND tenant_id = %s AND status = 'APPROVED'
                ORDER BY created_at ASC
                """,
                (job_id, tenant_id),
            )
            approved_rules = [dict(r) for r in await cur.fetchall()]
            elig_snapshot = [
                {
                    "id": str(r["id"]),
                    "rule_type": r["rule_type"],
                    "value": r["value"],
                    "basis_category": r["basis_category"],
                    "reference_date": str(r["reference_date"]),
                }
                for r in approved_rules
            ]

            # 4. Create immutable screening run record in QUEUED state
            run_id = uuid.uuid4()
            versions_info = {
                "extractor": f"cv-extractor {settings.EXTRACTOR_VERSION}",
                "embedding": settings.EMBEDDING_MODEL,
                "scoring": settings.SCORING_VERSION,
                "scoring_mode": settings.SCORING_MODE,
                "semantic_threshold": settings.SEMANTIC_THRESHOLD,
            }
            run_params = {
                "use_verifier": False,
                "use_agent": True,
                "verifier_provider": "JEV_TYPESAFE",
                "as_of": today_str,
            }

            await cur.execute(
                """
                INSERT INTO screening_runs (
                    id, tenant_id, job_id, requirement_set_id, status, as_of, versions, params,
                    eligibility_snapshot, progress, started_at
                )
                VALUES (%s, %s, %s, %s, 'QUEUED', %s, %s, %s, %s, '{"done": 0, "total": 0}'::jsonb, now())
                """,
                (
                    run_id,
                    tenant_id,
                    job_id,
                    req_set_id,
                    today_str,
                    json.dumps(versions_info),
                    json.dumps(run_params),
                    json.dumps(elig_snapshot),
                ),
            )
            await conn.commit()
            print(f"[+] Created fresh screening run {run_id} for job '{title}'")
            run_ids.append((job_id, run_id, title))

    # 5. Execute each screening run
    for job_id, run_id, title in run_ids:
        print(f"\n[>] Executing screening run {run_id} for '{title}' with JevTypeSafeVerifierProvider...")
        res = await execute_screening_run(
            run_id=run_id,
            use_agent=True,
            verifier_provider=jev_provider,
        )
        print(f"[✓] Completed screening run {run_id}: status={res.get('status')} | total_candidates={res.get('total_candidates')}")

    # 6. Audit and verify operational database persistence
    print("\n" + "=" * 60)
    print("OPERATIONAL DATABASE AUDIT: cv_screening")
    print("=" * 60)

    async with get_connection() as conn, conn.cursor() as cur:
        for job_id, run_id, title in run_ids:
            print(f"\n--- Audit for Run {run_id} ('{title}') ---")
            await cur.execute(
                "SELECT id, status, params, progress, finished_at FROM screening_runs WHERE id = %s",
                (run_id,),
            )
            run_row = await cur.fetchone()
            print(f"Status: {run_row['status']}")
            print(f"Finished at: {run_row['finished_at']}")
            print(f"Params: {run_row['params']}")

            await cur.execute(
                """
                SELECT count(*) as total_scores,
                       count(*) FILTER (WHERE jsonb_array_length(reasoning_trajectory) > 0) as with_trajectory
                FROM candidate_scores
                WHERE run_id = %s
                """,
                (run_id,),
            )
            stats = await cur.fetchone()
            print(f"Total candidate scores: {stats['total_scores']}")
            print(f"Candidate scores with reasoning_trajectory: {stats['with_trajectory']}")

            # Fetch sample candidate score with trajectory
            await cur.execute(
                """
                SELECT cs.candidate_id, d.original_filename, cs.rank, cs.band, cs.final_score,
                       cs.recommendation, cs.reasoning_trajectory
                FROM candidate_scores cs
                LEFT JOIN documents d ON d.id = cs.document_id
                WHERE cs.run_id = %s AND jsonb_array_length(cs.reasoning_trajectory) > 0
                ORDER BY cs.rank ASC LIMIT 1
                """,
                (run_id,),
            )
            top_cand = await cur.fetchone()
            if top_cand:
                traj = top_cand["reasoning_trajectory"]
                if isinstance(traj, str):
                    traj = json.loads(traj)
                actions = [step.get("action") for step in traj]
                print(f"Top Candidate: {top_cand['original_filename']} (Rank #{top_cand['rank']}, Band {top_cand['band']}, Score {top_cand['final_score']})")
                print(f"Reasoning Trajectory Steps ({len(traj)} steps):")
                for s in traj:
                    action_input_prov = s.get("action_input", {}).get("provider") if isinstance(s.get("action_input"), dict) else None
                    prov_str = f" [provider={action_input_prov}]" if action_input_prov else ""
                    print(f"   Step {s.get('step_number')}: {s.get('action')}{prov_str} -> {s.get('state_mutation', '')[:60]}")

                # Check required steps
                required = [
                    "INITIALIZE_SESSION",
                    "DOCLING_PARSER",
                    "GROUNDED_VERIFIER",
                    "CRITIQUE_REFLECT",
                    "DETERMINISTIC_SCORER",
                    "FINALIZE_RUN",
                ]
                missing = [r for r in required if r not in actions]
                if missing:
                    print(f"[!] Warning: Missing expected steps in top candidate: {missing}")
                else:
                    print(f"[✓] All 6 canonical ReAct phases confirmed present in reasoning_trajectory!")


if __name__ == "__main__":
    asyncio.run(refresh_operational_job_screenings())
