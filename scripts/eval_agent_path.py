#!/usr/bin/env python3
"""Measures the production screening path (ScreeningAgent + Jev) on the golden dataset.

`compare_engines.py` re-implements screening modes in a script, so its numbers do not describe the system
that actually runs. This harness drives the same code as `screening_service`:
  ingest : sanitize -> extract -> redact -> Jev validation of experience entries (when Jev is enabled)
  screen : run_screening_agent (ReAct loop, confidence threshold, Jev verifier) -> score() -> rank()
and reports status accuracy against the golden labels next to the pure-rules baseline.

Usage:
  python scripts/eval_agent_path.py --output-json out.json            # live (needs TYPESAFE_API_KEY)
  python scripts/eval_agent_path.py --mock-jev --output-json out.json # plumbing check, NOT a measurement

Point DATABASE_URL at a test database: Jev telemetry is written to `jev_calls`.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
import uuid
from collections import Counter
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import compare_engines as ce  # noqa: E402
from typesafe_sdk import ChoiceAnswer, NoulAnswer, ScoreAnswer, SystemOneResponse, Usage  # noqa: E402

from src.domain.agent import run_screening_agent  # noqa: E402
from src.domain.experience_extractor import validate_work_experiences_jev  # noqa: E402
from src.domain.scorer import rank, score  # noqa: E402
from src.domain.verifier import JevTypeSafeVerifierProvider  # noqa: E402
from src.infrastructure.database import get_connection  # noqa: E402
from src.infrastructure.typesafe import load_typesafe_config  # noqa: E402
from src.worker.adapter import extract_candidate_profile  # noqa: E402
from src.worker.redaction import extract_identity_and_redact, redact_text  # noqa: E402
from src.worker.sanitizer import sanitize_file  # noqa: E402

GOLDEN = REPO_ROOT / "docs/spec/golden_dataset"
JEV_INPUT_USD_PER_TOKEN = 0.042 / 1_000_000.0
RANK = {"NOT_DEMONSTRATED": 0, "UNKNOWN": 0, "PARTIAL": 1, "STRONG": 2}


def override_achievement_primitive(primitive: str) -> None:
    """Experiment switch: ask ACHIEVEMENT criteria with `primitive` instead of the production one."""
    import src.domain.agent as flow

    original = flow.resolve_jev_primitive_params

    def patched(kind: Any, importance: str | None = None, concepts: list[str] | None = None) -> dict[str, Any]:
        if str(getattr(kind, "value", kind)).upper() == "ACHIEVEMENT":
            return {"primitive": primitive, "use_noul": False, "use_score": False}
        return original(kind, importance, concepts)

    flow.resolve_jev_primitive_params = patched  # type: ignore[assignment]


def mock_jev_client() -> AsyncMock:
    """Stand-in client for plumbing checks only: STRONG / score 2.4 / BACKEND / valid work experience."""

    async def _system_one(state: Any, questions: dict[str, Any], **kwargs: Any) -> SystemOneResponse:
        answers: dict[str, Any] = {}
        for key, question in questions.items():
            qtype = getattr(question, "type", "")
            if qtype == "noul":
                answers[key] = NoulAnswer(type="noul", noul=0.95)
            elif qtype == "score":
                levels = {i: f"level {i}" for i in range(len(question.criteria))}
                probs = {i: (1.0 if i == 2 else 0.0) for i in levels}
                answers[key] = ScoreAnswer(type="score", score=2.4, confidence=0.9, legend=levels, probabilities=probs)
            else:
                label = "BACKEND" if key == "role_family" else "STRONG"
                answers[key] = ChoiceAnswer(type="choice", choice=label, confidence=0.9, probabilities={label: 0.9})
        return SystemOneResponse(model="mock", usage=Usage(input_tokens=1, output_tokens=1), answers=answers)

    client = AsyncMock()
    client.system_one.side_effect = _system_one
    return client


def build_corpus(cvs_dir: Path, labels: dict[str, Any]) -> list[dict[str, Any]]:
    """Mirrors worker/processor.py: the agent gets the redacted matching profile and full_text_redacted."""
    by_file = {Path(c["file"]).name: c for c in labels["candidates"]}
    corpus = []
    for path in sorted(list(cvs_dir.glob("*.pdf")) + list(cvs_dir.glob("*.docx"))):
        meta = by_file.get(path.name)
        if meta is None:
            continue
        raw = path.read_bytes()
        san = sanitize_file(raw, path.name)
        if san.status in ("REJECTED", "NEEDS_REVIEW"):
            continue
        profile = extract_candidate_profile(raw, path.name)
        identity, matching, chunks = extract_identity_and_redact(profile)
        email, phone = identity.get("email"), identity.get("phone")
        full_text_redacted = redact_text(
            san.extracted_text,
            identity["full_name"],
            [email] if email else [],
            [phone] if phone else [],
            links=identity.get("links") or [],
        )
        corpus.append(
            {
                "cv_id": meta["cv_id"],
                "file": path,
                "grade": meta.get("relevance_grade", 0),
                "matching": matching,
                "full_text_redacted": full_text_redacted,
                # shape expected by compare_engines for the rules baseline (identical to its Mode 1 input)
                "cache_item": ce.CandidateCacheItem(
                    cv_id=meta["cv_id"],
                    file_path=path,
                    raw_bytes=raw,
                    matching_profile=matching,
                    full_text=" ".join(c.get("text_redacted", "") for c in chunks),
                    candidate_chunks=chunks,
                    relevance_grade=meta.get("relevance_grade", 0),
                ),
            }
        )
    return corpus


async def telemetry(run_id: uuid.UUID) -> dict[str, Any]:
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, count(*) AS calls, coalesce(sum(input_tokens), 0) AS tin,
                   coalesce(sum(output_tokens), 0) AS tout,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50
            FROM jev_calls WHERE run_id = %s GROUP BY primitive_type ORDER BY primitive_type
            """,
            (run_id,),
        )
        rows = await cur.fetchall()
    by_type = {r["primitive_type"]: {"calls": r["calls"], "input_tokens": int(r["tin"]), "p50_ms": float(r["p50"])} for r in rows}
    tin = sum(v["input_tokens"] for v in by_type.values())
    tout = sum(int(r["tout"]) for r in rows)
    return {
        "calls": sum(v["calls"] for v in by_type.values()),
        "input_tokens": tin,
        "output_tokens": tout,
        "cost_usd": tin * JEV_INPUT_USD_PER_TOKEN,
        "by_primitive": by_type,
    }


def accuracy(states: dict[str, dict[str, str]], expected: dict[str, dict[str, list[str]]], kinds: dict[str, str]) -> dict[str, Any]:
    total = ok = over = under = 0
    per_kind: dict[str, list[int]] = {}
    for cid, per_req in states.items():
        for rid, got in per_req.items():
            exp = expected[cid][rid]
            total += 1
            hit = got in exp
            ok += hit
            k = per_kind.setdefault(kinds[rid], [0, 0])
            k[0] += hit
            k[1] += 1
            if not hit:
                if RANK.get(got, 0) > max(RANK[e] for e in exp):
                    over += 1
                else:
                    under += 1
    return {
        "correct": ok,
        "total": total,
        "pct": round(100 * ok / total, 1) if total else 0.0,
        "over_claimed": over,
        "under_claimed": under,
        "per_kind": {k: f"{v[0]}/{v[1]}" for k, v in sorted(per_kind.items())},
    }


def ranking_metrics(states: dict[str, dict[str, str]], req_set: dict[str, Any], grades: dict[str, int], ref: list[str]) -> dict[str, Any]:
    items = []
    for cid, per_req in states.items():
        items.append(
            {
                "candidate_id": cid,
                "cv_id": cid,
                "result": score(per_req, req_set),
                "strong_count": sum(1 for v in per_req.values() if v == "STRONG"),
            }
        )
    ids = [str(i["cv_id"]) for i in rank(items)]
    return {
        "ranked_ids": ids,
        "ndcg5": round(ce.calculate_ndcg_at_k(ids, grades, 5), 3),
        "ndcg10": round(ce.calculate_ndcg_at_k(ids, grades, 10), 3),
        "spearman": round(ce.calculate_spearman_rho(ref, ids), 3),
        "top5_overlap": len(set(ids[:5]) & set(ref[:5])),
    }


async def main_async() -> int:
    ap = argparse.ArgumentParser(description="Measure the production agent path on the golden dataset")
    ap.add_argument("--jd", type=Path, default=GOLDEN / "job_descriptions/JD-01_requirements.approved.json")
    ap.add_argument("--labels", type=Path, default=GOLDEN / "labels/expected_JD-01.json")
    ap.add_argument("--cvs-dir", type=Path, default=GOLDEN / "cvs/core")
    ap.add_argument("--as-of", default="2026-10-01")
    ap.add_argument("--output-json", type=Path, required=True)
    ap.add_argument("--mock-jev", action="store_true", help="plumbing check with a stub client; NOT a measurement")
    ap.add_argument("--skip-ingest-validation", action="store_true", help="skip the ingest-time Jev experience validation")
    ap.add_argument(
        "--achievement-primitive",
        choices=("production", "choice"),
        default="production",
        help="experiment: ask ACHIEVEMENT criteria with the generic choice instead of the production primitive",
    )
    args = ap.parse_args()
    if args.achievement_primitive == "choice":
        override_achievement_primitive("choice")

    client = mock_jev_client() if args.mock_jev else None
    if client is None and not load_typesafe_config().is_configured:
        print("TYPESAFE_API_KEY is not configured: the agent would silently fall back to rules. Refusing to run.")
        return 2

    req_set = json.loads(args.jd.read_text())
    labels = json.loads(args.labels.read_text())
    expected = {c["cv_id"]: c["expected_states"] for c in labels["candidates"]}
    grades = {c["cv_id"]: c.get("relevance_grade", 0) for c in labels["candidates"]}
    ref = labels["reference_ranking"]
    kinds = {r["requirement_id"]: r["kind"] for r in req_set["requirements"]}
    requirements = req_set["requirements"]

    print(f"Preparing corpus from {args.cvs_dir} ...")
    corpus = build_corpus(args.cvs_dir, labels)
    print(f"{len(corpus)} candidates")

    rules = await ce.run_mode_1_deterministic([c["cache_item"] for c in corpus], req_set, as_of=args.as_of)
    rule_states = {r["file_name"].split("_")[0]: r["states"] for r in rules["candidate_results"]}

    run_id = uuid.uuid4()
    provider = JevTypeSafeVerifierProvider(client=client)
    agent_states: dict[str, dict[str, str]] = {}
    details: dict[str, dict[str, Any]] = {}
    latencies: list[float] = []
    flag_counts: Counter[str] = Counter()
    method_counts: Counter[str] = Counter()
    excluded_entries = 0

    t_total = time.perf_counter()
    for cand in corpus:
        cid = cand["cv_id"]
        t0 = time.perf_counter()
        profile = cand["matching"]
        if not args.skip_ingest_validation and profile.get("experiences"):
            profile["experiences"] = await validate_work_experiences_jev(
                profile["experiences"], client=client, candidate_id=cid, run_id=run_id
            )
            excluded_entries += sum(1 for e in profile["experiences"] if "JEV_NOT_WORK_EXPERIENCE" in e.get("flags", []))

        state = await run_screening_agent(
            job_id="JD-01",
            candidate_id=cid,
            requirements=requirements,
            profile=profile,
            raw_cv_text=cand["full_text_redacted"],
            as_of=args.as_of,
            category_weights=req_set.get("category_weights", {}),
            verifier_provider=provider,
            run_id=str(run_id),
        )
        latencies.append((time.perf_counter() - t0) * 1000.0)

        per_req: dict[str, str] = {}
        per_detail: dict[str, Any] = {}
        for req in requirements:
            rid = req["requirement_id"]
            res = state.evaluation_results.get(rid)
            per_req[rid] = res.state.value if res else "NOT_DEMONSTRATED"
            if res:
                flag_counts.update(res.flags)
                method_counts[res.evaluation_method.value] += 1
                per_detail[rid] = {
                    "confidence": round(res.confidence, 2),
                    "method": res.evaluation_method.value,
                    "flags": res.flags,
                    "quote": (res.evidences[0].verbatim_quote[:100] if res.evidences else None),
                }
        agent_states[cid] = per_req
        details[cid] = {"criteria": per_detail, "reflection_cycles": state.reflection_budget_spent}
    total_s = time.perf_counter() - t_total

    if not args.mock_jev and flag_counts.get("TYPESAFE_UNCONFIGURED_FALLBACK"):
        print("Some criteria fell back to rules because Jev was unavailable: the measurement is invalid.")
        return 3

    tel = await telemetry(run_id)
    changes = []
    for cid, per_req in agent_states.items():
        for rid, got in per_req.items():
            base = rule_states[cid][rid]
            if got != base:
                exp = expected[cid][rid]
                tag = "FIXED" if got in exp and base not in exp else "BROKE" if base in exp and got not in exp else "neutral"
                changes.append({"cv": cid, "req": rid, "kind": kinds[rid], "rules": base, "agent": got, "expected": "/".join(exp), "effect": tag})

    report = {
        "measurement": not args.mock_jev,
        "achievement_primitive": args.achievement_primitive,
        "as_of": args.as_of,
        "candidates": len(corpus),
        "rules_baseline": {"accuracy": accuracy(rule_states, expected, kinds), "ranking": ranking_metrics(rule_states, req_set, grades, ref)},
        "agent_path": {
            "accuracy": accuracy(agent_states, expected, kinds),
            "ranking": ranking_metrics(agent_states, req_set, grades, ref),
            "total_seconds": round(total_s, 1),
            "latency_per_cv_ms": {"p50": round(ce.calculate_percentile(latencies, 50), 0), "p95": round(ce.calculate_percentile(latencies, 95), 0)},
            "telemetry": tel,
            "evaluation_methods": dict(method_counts),
            "flags": dict(flag_counts),
            "experience_entries_excluded_by_jev": excluded_entries,
        },
        "changes_vs_rules": changes,
        "details": details,
        "states": agent_states,
        "rules_states": rule_states,
    }
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str))

    a, b = report["rules_baseline"], report["agent_path"]
    banner = "MEASUREMENT" if report["measurement"] else "MOCK (plumbing only, not a measurement)"
    print(f"\n=== {banner} | {len(corpus)} CVs x {len(requirements)} criteria ===")
    print(f"rules  : {a['accuracy']['correct']}/{a['accuracy']['total']} ({a['accuracy']['pct']}%)  over={a['accuracy']['over_claimed']} under={a['accuracy']['under_claimed']}  ndcg5={a['ranking']['ndcg5']}")
    print(f"agent  : {b['accuracy']['correct']}/{b['accuracy']['total']} ({b['accuracy']['pct']}%)  over={b['accuracy']['over_claimed']} under={b['accuracy']['under_claimed']}  ndcg5={b['ranking']['ndcg5']}")
    print(f"by kind: rules={a['accuracy']['per_kind']}\n         agent={b['accuracy']['per_kind']}")
    print(f"changed vs rules: {len(changes)} (fixed={sum(c['effect']=='FIXED' for c in changes)}, broke={sum(c['effect']=='BROKE' for c in changes)})")
    print(f"Jev calls: {tel['calls']}  tokens in/out: {tel['input_tokens']:,}/{tel['output_tokens']:,}  cost: ${tel['cost_usd']:.5f}  {tel['by_primitive']}")
    print(f"time: {total_s:.1f}s  per-CV p50/p95: {b['latency_per_cv_ms']['p50']:.0f}/{b['latency_per_cv_ms']['p95']:.0f} ms")
    print(f"methods: {dict(method_counts)}  top flags: {dict(flag_counts.most_common(6))}")
    print(f"saved: {args.output_json}")
    return 0


def main() -> None:
    sys.exit(asyncio.run(main_async()))


if __name__ == "__main__":
    main()
