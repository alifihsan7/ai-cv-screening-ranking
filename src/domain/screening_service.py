"""Screening execution service handling asynchronous scoring, eligibility evaluation, and ranking (FX-30)."""

from __future__ import annotations

import asyncio
import contextlib
import json
import re
import uuid
from datetime import date
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from src.domain.verifier import BaseVerifierProvider

from src.domain.agent import run_screening_agent
from src.domain.eligibility import evaluate_all
from src.domain.kind_rules import (
    eval_achievement,
    eval_certification,
    eval_education,
    eval_experience_duration,
    eval_leadership,
    eval_responsibility,
    eval_skill,
)
from src.domain.scorer import rank, score
from src.domain.verifier import resolve_jev_primitive_params, verify_requirement_with_llm
from src.infrastructure.config import settings
from src.infrastructure.database import get_connection
from src.infrastructure.logging import logger


async def execute_screening_run(
    run_id: uuid.UUID,
    use_agent: bool | None = None,
    verifier_provider: BaseVerifierProvider | None = None,
) -> dict[str, Any]:
    """Executes an immutable screening run asynchronously over all ready CVs for the job."""
    try:
        return await _execute_screening_run_internal(
            run_id, use_agent=use_agent, verifier_provider=verifier_provider
        )
    except Exception as e:
        logger.exception(f"Screening run {run_id} failed: {e}")
        with contextlib.suppress(Exception):
            async with get_connection() as err_conn, err_conn.cursor() as err_cur:
                await err_cur.execute(
                    "UPDATE screening_runs SET status = 'FAILED', finished_at = now() WHERE id = %s",
                    (run_id,),
                )
                await err_conn.commit()
        raise


async def _execute_screening_run_internal(
    run_id: uuid.UUID,
    use_agent: bool | None = None,
    verifier_provider: BaseVerifierProvider | None = None,
) -> dict[str, Any]:
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, tenant_id, job_id, requirement_set_id, status, as_of, params, eligibility_snapshot
            FROM screening_runs
            WHERE id = %s
            FOR UPDATE
            """,
            (run_id,),
        )
        run_row = await cur.fetchone()
        if not run_row:
            raise ValueError(f"Screening run {run_id} not found.")

        # Immutability check
        if run_row["status"] in ("COMPLETED", "DONE"):
            logger.info(f"Screening run {run_id} is already completed. Skipping rerun.")
            return {"status": run_row["status"], "run_id": str(run_id)}

        tenant_id = run_row["tenant_id"]
        job_id = run_row["job_id"]
        req_set_id = run_row["requirement_set_id"]
        effective_as_of = str(run_row["as_of"]) if run_row["as_of"] else date.today().isoformat()
        raw_params = run_row["params"] or {}
        params = dict(raw_params) if isinstance(raw_params, dict) else json.loads(raw_params or "{}")
        use_verifier = params.get("use_verifier", False)
        elig_snapshot = run_row["eligibility_snapshot"] or []
        scoring_mode = params.get("scoring_mode") or getattr(settings, "SCORING_MODE", "rules")

        if use_agent is not None:
            effective_use_agent = use_agent
        elif "use_agent" in params:
            effective_use_agent = bool(params["use_agent"])
        else:
            effective_use_agent = getattr(settings, "USE_SCREENING_AGENT", True)

        # Harmonize verifier provider and persist metadata to params
        chosen_verifier: BaseVerifierProvider | None = verifier_provider
        configured_provider_name = params.get("verifier_provider")

        if scoring_mode == "jev_hybrid":
            params["scoring_mode"] = "jev_hybrid"
            if chosen_verifier is None:
                from src.domain.verifier import JevTypeSafeVerifierProvider

                chosen_verifier = JevTypeSafeVerifierProvider()
                provider_name = "JEV_TYPESAFE"
            else:
                provider_name = getattr(chosen_verifier, "provider_name", "JEV_TYPESAFE")
        elif effective_use_agent:
            if chosen_verifier is None:
                if configured_provider_name in ("LLM", "LLM_GATEWAY") or (use_verifier and not configured_provider_name):
                    from src.domain.verifier import LLMGatewayVerifierProvider

                    chosen_verifier = LLMGatewayVerifierProvider()
                    provider_name = "LLM"
                else:
                    from src.domain.verifier import JevTypeSafeVerifierProvider

                    chosen_verifier = JevTypeSafeVerifierProvider()
                    provider_name = "JEV_TYPESAFE"
            else:
                provider_name = getattr(chosen_verifier, "provider_name", "CUSTOM")
        else:
            if chosen_verifier is None and use_verifier:
                from src.domain.verifier import LLMGatewayVerifierProvider

                chosen_verifier = LLMGatewayVerifierProvider()
                provider_name = "LLM"
            elif chosen_verifier is not None:
                provider_name = getattr(chosen_verifier, "provider_name", "CUSTOM")
            else:
                provider_name = configured_provider_name or "NONE"

        # Explicitly harmonize metadata in screening_runs.params
        params["use_agent"] = effective_use_agent
        params["verifier_provider"] = provider_name
        params["scoring_mode"] = scoring_mode

        # Mark RUNNING and save harmonized params
        await cur.execute(
            """
            UPDATE screening_runs
            SET status = 'RUNNING', started_at = COALESCE(started_at, now()), params = %s
            WHERE id = %s
            """,
            (json.dumps(params), run_id),
        )
        await conn.commit()

        # Fetch requirement set
        await cur.execute(
            "SELECT category_weights FROM requirement_sets WHERE id = %s AND tenant_id = %s",
            (req_set_id, tenant_id),
        )
        set_row = await cur.fetchone()
        cat_weights = set_row["category_weights"] if set_row else {}

        await cur.execute(
            """
            SELECT requirement_id, description, category, kind, importance, weight, concepts, params, source_text, lint_flags
            FROM requirements
            WHERE requirement_set_id = %s AND tenant_id = %s
            ORDER BY requirement_id
            """,
            (req_set_id, tenant_id),
        )
        raw_reqs = await cur.fetchall()
        requirements: list[dict[str, Any]] = [dict(r) for r in raw_reqs]
        req_set_dict: dict[str, Any] = {
            "category_weights": cat_weights,
            "requirements": requirements,
        }

        # Fetch all documents and candidate profiles
        await cur.execute(
            """
            SELECT d.id as document_id, d.original_filename as file_name, d.sha256 as file_hash,
                   d.status as quality_status, d.flags, d.reasons, d.candidate_id,
                   cp.id as profile_id, cp.matching_profile, cp.full_text_redacted
            FROM documents d
            LEFT JOIN candidate_profiles cp ON cp.document_id = d.id AND cp.tenant_id = d.tenant_id
            WHERE d.job_id = %s AND d.tenant_id = %s
            ORDER BY d.created_at ASC, d.id ASC
            """,
            (job_id, tenant_id),
        )
        raw_cv_rows = await cur.fetchall()
        # Only evaluate documents with terminal quality status or READY, never un-ingested RECEIVED/PROCESSING
        cv_rows = [
            cv for cv in raw_cv_rows
            if cv["quality_status"] in ("READY", "REJECTED", "NEEDS_REVIEW", "DUPLICATE")
        ]
        total_docs = len(cv_rows)

        # Update initial progress
        await cur.execute(
            "UPDATE screening_runs SET progress = %s WHERE id = %s",
            (json.dumps({"done": 0, "total": total_docs}), run_id),
        )
        await conn.commit()

        scoring_items: list[dict[str, Any]] = []
        eval_cache: dict[str, dict[str, Any]] = {}

        verifier_provider = chosen_verifier

        verifier_semaphore = asyncio.Semaphore(settings.VERIFIER_CONCURRENCY)

        for idx, cv in enumerate(cv_rows, 1):
            doc_id = cv["document_id"]
            cand_id = cv["candidate_id"] or doc_id
            file_name = cv["file_name"]
            matching_prof = cv["matching_profile"] or {}
            full_text = cv.get("full_text_redacted") or ""
            flags = list(cv["flags"] or [])
            reasons = list(cv["reasons"] or [])

            if cv["quality_status"] in ("REJECTED", "NEEDS_REVIEW", "DUPLICATE"):
                eval_cache[str(cand_id)] = {
                    "cv_id": cand_id,
                    "document_id": doc_id,
                    "file_name": file_name,
                    "status": cv["quality_status"],
                    "states": {},
                    "metrics": {},
                    "evidence": {},
                    "flags": flags,
                    "reasons": reasons,
                    "score_res": None,
                    "reasoning_trajectory": [],
                    "req_evals": {},
                }
                continue

            if cv["quality_status"] != "READY":
                continue

            if effective_use_agent:
                try:
                    agent_state = await run_screening_agent(
                        job_id=str(job_id),
                        candidate_id=str(cand_id),
                        requirements=requirements,
                        profile=matching_prof,
                        raw_cv_text=full_text,
                        as_of=effective_as_of,
                        category_weights=cat_weights,
                        verifier_provider=verifier_provider,
                        run_id=str(run_id),
                    )

                    states_map: dict[str, str] = {}
                    metrics_map: dict[str, Any] = {}
                    ev_map: dict[str, list[dict[str, Any]]] = {}
                    req_evals: dict[str, dict[str, Any]] = {}
                    cand_flags = list(flags)
                    cand_reasons = list(reasons)

                    for req_obj in req_set_dict["requirements"]:
                        rid = req_obj["requirement_id"]
                        res = agent_state.evaluation_results.get(rid)
                        if res:
                            states_map[rid] = res.state.value
                            metrics_map.update(res.metrics.model_dump(mode="json"))
                            cand_flags.extend(res.flags)
                            cand_reasons.extend(res.reasons)
                            citations = []
                            for ev in res.evidences:
                                citations.append(
                                    {
                                        "quote": ev.verbatim_quote,
                                        "context": ev.source_section,
                                        "verified": ev.is_grounded,
                                        "char_start": ev.char_start,
                                        "char_end": ev.char_end,
                                    }
                                )
                            ev_map[rid] = citations
                            req_evals[rid] = {
                                "state": res.state.value,
                                "confidence": float(res.confidence),
                                "method": "react_agent",
                                "metrics": res.metrics.model_dump(mode="json"),
                            }
                        else:
                            states_map[rid] = "NOT_DEMONSTRATED"
                            ev_map[rid] = []
                            req_evals[rid] = {
                                "state": "NOT_DEMONSTRATED",
                                "confidence": 0.0,
                                "method": "react_agent",
                                "metrics": {},
                            }

                    score_res = score(states_map, req_set_dict)
                    strong_count = sum(1 for v in states_map.values() if v == "STRONG")
                    trajectory = [step.model_dump(mode="json") for step in agent_state.reasoning_trajectory]

                    scoring_items.append(
                        {
                            "candidate_id": str(cand_id),
                            "cv_id": cand_id,
                            "document_id": doc_id,
                            "file_name": file_name,
                            "result": score_res,
                            "strong_count": strong_count,
                        }
                    )
                    eval_cache[str(cand_id)] = {
                        "cv_id": cand_id,
                        "document_id": doc_id,
                        "file_name": file_name,
                        "status": "SCORED",
                        "states": states_map,
                        "metrics": metrics_map,
                        "evidence": ev_map,
                        "flags": list(set(cand_flags)),
                        "reasons": cand_reasons,
                        "score_res": score_res,
                        "reasoning_trajectory": trajectory,
                        "req_evals": req_evals,
                    }
                except Exception as agent_err:
                    logger.error(
                        f"Autonomous agent failed for candidate {cand_id} (doc {doc_id}): {agent_err}",
                        exc_info=True,
                    )
                    # Error isolation: isolate to this candidate, mark NEEDS_REVIEW, do not crash the run
                    eval_cache[str(cand_id)] = {
                        "cv_id": cand_id,
                        "document_id": doc_id,
                        "file_name": file_name,
                        "status": "NEEDS_REVIEW",
                        "states": {},
                        "metrics": {},
                        "evidence": {},
                        "flags": list(set(flags + ["AGENT_EVALUATION_ERROR"])),
                        "reasons": list(reasons + [f"Agent evaluation error: {agent_err}"]),
                        "score_res": None,
                        "reasoning_trajectory": [],
                        "req_evals": {},
                    }
            else:
                # Legacy rule-based evaluation
                states_map = {}
                metrics_map = {}
                ev_map = {}
                req_evals = {}
                cand_flags = list(flags)

                for r in req_set_dict["requirements"]:
                    rid = r["requirement_id"]
                    kind = r["kind"]
                    st: str = "NOT_DEMONSTRATED"
                    conf: float = 0.95
                    m: dict[str, Any] = {}
                    evs: list[dict[str, Any]] = []
                    flgs: list[str] = []

                    if kind == "EXPERIENCE_DURATION":
                        use_j = (
                            verifier_provider is not None
                            and getattr(verifier_provider, "provider_name", "") == "JEV_TYPESAFE"
                        ) or (scoring_mode == "jev_hybrid")
                        v_client = getattr(verifier_provider, "_client", None) if verifier_provider else None
                        st, conf, m, evs, flgs = await eval_experience_duration(
                            matching_prof,
                            r,
                            as_of=effective_as_of,
                            client=v_client,
                            candidate_id=str(cand_id),
                            run_id=str(run_id),
                            use_jev=use_j,
                        )
                        metrics_map.update(m)
                    elif kind == "SKILL":
                        st, conf, m, evs, flgs = eval_skill(matching_prof, r)
                    elif kind == "RESPONSIBILITY":
                        st, conf, m, evs, flgs = eval_responsibility(matching_prof, r)
                    elif kind == "EDUCATION":
                        st, conf, m, evs, flgs = eval_education(matching_prof, r)
                    elif kind == "CERTIFICATION":
                        st, conf, m, evs, flgs = eval_certification(matching_prof, r)
                    elif kind == "ACHIEVEMENT":
                        st, conf, m, evs, flgs = eval_achievement(matching_prof, r)
                    elif kind == "LEADERSHIP":
                        st, conf, m, evs, flgs = eval_leadership(matching_prof, r)
                    else:
                        st, conf, m, evs, flgs = "NOT_DEMONSTRATED", 0.9, {}, [], []

                    # Hybrid semantic retrieval fallback (FX-32 / Mode 3 Jev Hybrid)
                    if (
                        scoring_mode in ("hybrid", "jev_hybrid")
                        and kind in ("SKILL", "RESPONSIBILITY", "ACHIEVEMENT", "LEADERSHIP")
                        and st == "NOT_DEMONSTRATED"
                        and cv.get("profile_id")
                    ):
                        from src.domain.retrieval import extract_granular_evidence_quote, retrieve_evidence, split_sentences

                        top_chunks, sim = await retrieve_evidence(
                            profile_id=cand_id,
                            requirement=r,
                            tenant_id=tenant_id,
                        )
                        if sim >= settings.SEMANTIC_THRESHOLD and top_chunks:
                            st = "PARTIAL"
                            flgs = list(flgs) + ["SEMANTIC_MATCH"]
                            terms_to_match = list(r.get("concepts", []))
                            if not terms_to_match and r.get("description"):
                                terms_to_match = [w for w in re.findall(r"\w+", r["description"].lower()) if len(w) > 2]
                            sample_sentence = extract_granular_evidence_quote(
                                top_chunks[0]["text"],
                                target_terms=terms_to_match,
                                max_chars=120,
                            )
                            evs = [{"quote": sample_sentence, "context": top_chunks[0]["kind"], "verified": True}]

                    cand_flags.extend(flgs)

                    eval_method = "rule"
                    # Optional verifier bounded with semaphore
                    if (use_verifier or scoring_mode == "jev_hybrid") and st in ("PARTIAL", "STRONG") and evs:
                        async with verifier_semaphore:
                            if verifier_provider is not None and getattr(verifier_provider, "provider_name", "") == "JEV_TYPESAFE":
                                prim_kwargs = resolve_jev_primitive_params(
                                    kind=kind,
                                    importance=r.get("importance"),
                                    concepts=r.get("concepts"),
                                )
                                v_dec = await verifier_provider.verify(
                                    criterion_id=rid,
                                    criterion_description=str(r.get("description", "")),
                                    candidate_chunks=[str(e.get("quote", "")) for e in evs if e.get("quote")],
                                    cv_full_text=full_text,
                                    rule_state=st,
                                    kind=kind,
                                    run_id=str(run_id),
                                    candidate_id=str(cand_id),
                                    **prim_kwargs,
                                )
                                cand_flags.extend(v_dec.flags)
                                if v_dec.confidence < settings.VERIFIER_MIN_CONFIDENCE:
                                    # Low-confidence answer: keep rule state and evidence, surface for review
                                    if "GROUNDING_FAIL" not in v_dec.flags:
                                        cand_flags.append("JEV_LOW_CONFIDENCE")
                                else:
                                    st = v_dec.state.value
                                    eval_method = "verifier"
                                    conf = v_dec.confidence

                                    # Synchronize evidence with verified grounded quote
                                    if st == "NOT_DEMONSTRATED":
                                        evs = []
                                    elif v_dec.quote:
                                        evs = [
                                            {
                                                "quote": v_dec.quote,
                                                "context": str(v_dec.context_type.value if hasattr(v_dec.context_type, "value") else v_dec.context_type),
                                                "verified": True,
                                                "char_start": v_dec.char_start,
                                                "char_end": v_dec.char_end,
                                            }
                                        ]
                            else:
                                v_st, v_quote, v_flgs = await verify_requirement_with_llm(
                                    full_text, r, st, [e.get("quote", "") for e in evs]
                                )
                                st = v_st
                                cand_flags.extend(v_flgs)
                                eval_method = "verifier"
                                if st == "NOT_DEMONSTRATED":
                                    evs = []
                                elif v_quote:
                                    evs = [{"quote": v_quote, "context": "experience", "verified": True}]

                    states_map[rid] = st
                    ev_map[rid] = evs
                    req_evals[rid] = {
                        "state": st,
                        "confidence": float(conf) if "conf" in locals() else 0.95,
                        "method": eval_method,
                        "metrics": m if "m" in locals() else {},
                    }

                score_res = score(states_map, req_set_dict)
                strong_count = sum(1 for v in states_map.values() if v == "STRONG")

                scoring_items.append(
                    {
                        "candidate_id": str(cand_id),
                        "cv_id": cand_id,
                        "document_id": doc_id,
                        "file_name": file_name,
                        "result": score_res,
                        "strong_count": strong_count,
                    }
                )
                eval_cache[str(cand_id)] = {
                    "cv_id": cand_id,
                    "document_id": doc_id,
                    "file_name": file_name,
                    "status": "SCORED",
                    "states": states_map,
                    "metrics": metrics_map,
                    "evidence": ev_map,
                    "flags": list(set(cand_flags)),
                    "reasons": reasons,
                    "score_res": score_res,
                    "reasoning_trajectory": [],
                    "req_evals": req_evals,
                }

            # Periodic progress update every 10 CVs
            if idx % 10 == 0 or idx == total_docs:
                await cur.execute(
                    "UPDATE screening_runs SET progress = %s WHERE id = %s",
                    (json.dumps({"done": idx, "total": total_docs}), run_id),
                )
                await conn.commit()

        # Deterministic tie-broken ranking
        ranked_items = rank(scoring_items, run_id=str(run_id))
        rank_lookup = {str(item["cv_id"]): r_idx + 1 for r_idx, item in enumerate(ranked_items)}

        # Persist candidate scores, requirement scores, evidence, and eligibility
        for str_cid, c_data in eval_cache.items():
            cv_id_val = c_data["cv_id"]
            doc_id_val = c_data["document_id"]
            cand_rank = rank_lookup.get(str_cid, 999)
            s_res = c_data["score_res"]

            # Ensure candidate record exists in `candidates` table
            await cur.execute("SELECT id FROM candidates WHERE id = %s AND tenant_id = %s", (cv_id_val, tenant_id))
            if not await cur.fetchone():
                await cur.execute("SELECT nextval('candidate_code_seq') as seq")
                seq_row = await cur.fetchone()
                seq_val = seq_row["seq"] if seq_row and seq_row["seq"] else 1
                cand_code = f"C-{seq_val:04d}"
                await cur.execute(
                    """
                    INSERT INTO candidates (id, tenant_id, candidate_code, status)
                    VALUES (%s, %s, %s, 'ACTIVE')
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (cv_id_val, tenant_id, cand_code),
                )
                await cur.execute(
                    "UPDATE documents SET candidate_id = %s WHERE id = %s AND tenant_id = %s AND candidate_id IS NULL",
                    (cv_id_val, doc_id_val, tenant_id),
                )

            raw_sc = s_res.raw_score if s_res else 0.0
            fin_sc = s_res.final_score if s_res else 0.0
            bnd = s_res.band if s_res else "R"
            rec = s_res.recommendation if s_res else "MANUAL_CHECK"
            if rec not in ("SHORTLIST", "REVIEW", "LOW_PRIORITY", "MANUAL_CHECK"):
                rec = "MANUAL_CHECK"
            cat_b = s_res.category_breakdown if s_res else {}
            cov = s_res.coverage if s_res else 1.0
            cand_flags = list(set(c_data["flags"] + (s_res.flags if s_res else [])))
            traj_json = json.dumps(c_data.get("reasoning_trajectory", []))

            await cur.execute(
                """
                INSERT INTO candidate_scores (
                    run_id, candidate_id, tenant_id, document_id, rank, band,
                    raw_score, final_score, capped, recommendation, category_scores, flags, coverage,
                    reasoning_trajectory
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, false, %s, %s, %s, %s, %s)
                ON CONFLICT (run_id, candidate_id) DO UPDATE SET
                    rank = EXCLUDED.rank,
                    final_score = EXCLUDED.final_score,
                    raw_score = EXCLUDED.raw_score,
                    band = EXCLUDED.band,
                    recommendation = EXCLUDED.recommendation,
                    category_scores = EXCLUDED.category_scores,
                    flags = EXCLUDED.flags,
                    coverage = EXCLUDED.coverage,
                    reasoning_trajectory = EXCLUDED.reasoning_trajectory
                """,
                (
                    run_id,
                    cv_id_val,
                    tenant_id,
                    doc_id_val,
                    cand_rank,
                    bnd,
                    raw_sc,
                    fin_sc,
                    rec,
                    json.dumps(cat_b),
                    cand_flags,
                    cov,
                    traj_json,
                ),
            )

            # Batch insert requirement scores & evidence via executemany
            req_params = []
            req_evals = c_data.get("req_evals", {})
            for req_obj in req_set_dict["requirements"]:
                req_id_str = req_obj["requirement_id"]
                if req_id_str in req_evals:
                    r_inf = req_evals[req_id_str]
                    req_params.append(
                        (
                            run_id,
                            cv_id_val,
                            req_id_str,
                            tenant_id,
                            r_inf["state"],
                            float(r_inf["confidence"]),
                            r_inf["method"],
                            json.dumps(r_inf.get("metrics", {})),
                        )
                    )
                else:
                    st_val = c_data["states"].get(req_id_str, "NOT_DEMONSTRATED")
                    req_params.append(
                        (
                            run_id,
                            cv_id_val,
                            req_id_str,
                            tenant_id,
                            st_val,
                            0.95,
                            "rule",
                            json.dumps({}),
                        )
                    )
            if req_params:
                await cur.executemany(
                    """
                    INSERT INTO requirement_scores (
                        run_id, candidate_id, requirement_id, tenant_id, state, confidence, method, metrics
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (run_id, candidate_id, requirement_id) DO UPDATE SET
                        state = EXCLUDED.state,
                        confidence = EXCLUDED.confidence,
                        method = EXCLUDED.method,
                        metrics = EXCLUDED.metrics
                    """,
                    req_params,
                )

            ev_params = []
            for req_obj in req_set_dict["requirements"]:
                req_id_str = req_obj["requirement_id"]
                for ev_item in c_data["evidence"].get(req_id_str, []):
                    ev_params.append(
                        (
                            uuid.uuid4(),
                            run_id,
                            cv_id_val,
                            req_id_str,
                            tenant_id,
                            ev_item.get("quote", ""),
                            ev_item.get("context", "experience"),
                            bool(ev_item.get("verified", True)),
                            ev_item.get("char_start"),
                            ev_item.get("char_end"),
                        )
                    )
            if ev_params:
                await cur.executemany(
                    """
                    INSERT INTO evidence (
                        id, run_id, candidate_id, requirement_id, tenant_id, quote, context, verified, char_start, char_end
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    ev_params,
                )

            # Evaluate candidate administrative eligibility
            await cur.execute(
                """
                SELECT pgp_sym_decrypt(other_personal, %s) as decrypted_personal, other_personal
                FROM candidate_identities
                WHERE candidate_id = %s AND tenant_id = %s
                """,
                (settings.PII_ENCRYPTION_KEY, cv_id_val, tenant_id),
            )
            id_row = await cur.fetchone()
            parsed_other_p = {}
            if id_row:
                dec = id_row.get("decrypted_personal")
                if dec:
                    with contextlib.suppress(Exception):
                        parsed_other_p = json.loads(dec)
                elif id_row.get("other_personal"):
                    with contextlib.suppress(Exception):
                        raw_bytes = id_row["other_personal"]
                        if isinstance(raw_bytes, (bytes, memoryview)):
                            parsed_other_p = json.loads(bytes(raw_bytes).decode("utf-8"))
                        elif isinstance(raw_bytes, str):
                            parsed_other_p = json.loads(raw_bytes)

            elig_eval = evaluate_all(elig_snapshot, parsed_other_p)
            await cur.execute(
                """
                INSERT INTO candidate_eligibility (
                    run_id, candidate_id, tenant_id, document_id, overall_status, details
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (run_id, candidate_id) DO UPDATE SET
                    overall_status = EXCLUDED.overall_status, details = EXCLUDED.details, evaluated_at = now()
                """,
                (
                    run_id,
                    cv_id_val,
                    tenant_id,
                    doc_id_val,
                    elig_eval["overall_status"],
                    json.dumps(elig_eval["details"]),
                ),
            )

        # Mark screening run COMPLETED
        await cur.execute(
            """
            UPDATE screening_runs
            SET status = 'COMPLETED', progress = %s, finished_at = now()
            WHERE id = %s
            """,
            (json.dumps({"done": total_docs, "total": total_docs}), run_id),
        )
        await conn.commit()
        logger.info(f"Screening run {run_id} completed successfully ({total_docs} candidates evaluated).")
        return {"status": "COMPLETED", "run_id": str(run_id), "total_candidates": total_docs}
