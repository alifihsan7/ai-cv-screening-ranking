#!/usr/bin/env python3
"""Would a Jev second opinion on STRONG claims made by the rules fix more than it breaks?

For every STRONG the rules assign on the golden set, ask Jev about the rule's own evidence and apply the policy
"a confident disagreement lowers STRONG to PARTIAL, never further". Two ways of asking are compared: the
production primitive for the criterion kind, and the generic STRONG/PARTIAL/NOT_DEMONSTRATED choice.

Result on 2026-10-29 (see docs/eval/BENCHMARK_RESULTS_2026-10-29.md): net -10 and -3, so the policy was rejected.

Usage (live, about 115 Jev calls, under $0.01; point DATABASE_URL at a test database):
  python scripts/eval_second_opinion.py --output-json out/second_opinion.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import eval_agent_path as ev  # noqa: E402

from src.domain import kind_rules as kr  # noqa: E402
from src.domain.agent import normalize_profile_dict  # noqa: E402
from src.domain.evidence_chunks import RULE_CONTEXT_SECTIONS  # noqa: E402
from src.domain.models import ContextSectionType  # noqa: E402
from src.domain.verifier import JevTypeSafeVerifierProvider, resolve_jev_primitive_params  # noqa: E402
from src.infrastructure.config import settings  # noqa: E402
from src.infrastructure.typesafe import load_typesafe_config  # noqa: E402

GOLDEN = REPO_ROOT / "docs/spec/golden_dataset"
RULE_FUNCTIONS = {
    "SKILL": kr.eval_skill,
    "RESPONSIBILITY": kr.eval_responsibility,
    "ACHIEVEMENT": kr.eval_achievement,
    "LEADERSHIP": kr.eval_leadership,
    "EDUCATION": kr.eval_education,
}
VARIANTS = ("production primitive", "generic choice")


def primitive_kwargs(variant: str, req: dict[str, Any]) -> dict[str, Any]:
    production = resolve_jev_primitive_params(
        kind=req["kind"], importance=req.get("importance"), concepts=req.get("concepts")
    )
    if variant == "generic choice" and req["kind"] not in ("RESPONSIBILITY", "LEADERSHIP"):
        return {"primitive": "choice", "use_noul": False, "use_score": False}
    return production


async def main_async() -> int:
    ap = argparse.ArgumentParser(description="Evaluate a Jev second opinion on rule STRONG claims")
    ap.add_argument("--cvs-dir", type=Path, default=GOLDEN / "cvs/core")
    ap.add_argument("--labels", type=Path, default=GOLDEN / "labels/expected_JD-01.json")
    ap.add_argument("--jd", type=Path, default=GOLDEN / "job_descriptions/JD-01_requirements.approved.json")
    ap.add_argument("--output-json", type=Path, required=True)
    args = ap.parse_args()

    if not load_typesafe_config().is_configured:
        print("TYPESAFE_API_KEY is not configured; refusing to run.")
        return 2

    jd = json.loads(args.jd.read_text())
    labels = json.loads(args.labels.read_text())
    expected = {c["cv_id"]: c["expected_states"] for c in labels["candidates"]}
    corpus = ev.build_corpus(args.cvs_dir, labels)

    claims = []
    for cand in corpus:
        profile = normalize_profile_dict(cand["matching"])
        for req in jd["requirements"]:
            rule_fn = RULE_FUNCTIONS.get(req["kind"])
            if rule_fn is None:
                continue
            state, _conf, _metrics, evidence, _flags = rule_fn(profile, req)
            if state == "STRONG" and evidence:
                claims.append((cand, req, evidence))
    print(f"rule STRONG claims with evidence: {len(claims)}")

    run_id = str(uuid.uuid4())
    provider = JevTypeSafeVerifierProvider()
    results: dict[str, list[dict[str, Any]]] = {v: [] for v in VARIANTS}

    for cand, req, evidence in claims:
        cid, rid = cand["cv_id"], req["requirement_id"]
        quotes = [e for e in evidence[:3] if e.get("quote")]
        chunks = [e["quote"] for e in quotes]
        sections = [RULE_CONTEXT_SECTIONS.get(str(e.get("context", "")).lower(), ContextSectionType.UNKNOWN) for e in quotes]
        for variant in VARIANTS:
            kwargs = primitive_kwargs(variant, req)
            decision = await provider.verify(
                criterion_id=rid,
                criterion_description=str(req.get("description", "")),
                candidate_chunks=chunks,
                cv_full_text=cand["full_text_redacted"],
                rule_state="STRONG",
                kind=req["kind"],
                chunk_contexts=sections,
                run_id=run_id,
                candidate_id=cid,
                **kwargs,
            )
            confident = decision.confidence >= settings.VERIFIER_MIN_CONFIDENCE
            final = "PARTIAL" if (confident and decision.state.value != "STRONG") else "STRONG"
            rule_ok = "STRONG" in expected[cid][rid]
            final_ok = final in expected[cid][rid]
            results[variant].append(
                {
                    "cv": cid,
                    "req": rid,
                    "kind": req["kind"],
                    "primitive": kwargs.get("primitive"),
                    "jev": decision.state.value,
                    "confidence": round(decision.confidence, 2),
                    "final": final,
                    "expected": "/".join(expected[cid][rid]),
                    "rule_ok": rule_ok,
                    "final_ok": final_ok,
                    "effect": "FIXED" if final_ok and not rule_ok else "BROKE" if rule_ok and not final_ok else "same",
                }
            )

    for variant, rows in results.items():
        per_kind: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0])
        for row in rows:
            counts = per_kind[row["kind"]]
            counts[0] += row["effect"] == "FIXED"
            counts[1] += row["effect"] == "BROKE"
            counts[2] += 1
        fixed = sum(r["effect"] == "FIXED" for r in rows)
        broke = sum(r["effect"] == "BROKE" for r in rows)
        wrong = sum(not r["rule_ok"] for r in rows)
        print(f"\n=== {variant}: fixed={fixed} broke={broke} net={fixed - broke} of {len(rows)} STRONG claims (rule wrong on {wrong})")
        print("   by kind (fixed/broke/claims):", {k: tuple(v) for k, v in sorted(per_kind.items())})
        for row in rows:
            if row["effect"] != "same" or not row["rule_ok"]:
                print(
                    f"   {row['cv']}.{row['req']:<3} {row['kind']:<12} {row['primitive']:<8} jev={row['jev']:<16} "
                    f"conf={row['confidence']:<5} final={row['final']:<8} expected={row['expected']:<14} {row['effect']}"
                )

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(results, indent=1, ensure_ascii=False))
    print(f"\nsaved: {args.output_json}")
    return 0


def main() -> None:
    sys.exit(asyncio.run(main_async()))


if __name__ == "__main__":
    main()
