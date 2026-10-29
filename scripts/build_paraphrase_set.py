#!/usr/bin/env python3
"""Builds the paraphrase stress set from the golden dataset's CV source data.

Every CV keeps its facts, skills, names, dates, and layout; only the wording of selected experience, project, and
organization bullets changes. Each pair below is a meaning-preserving rewrite that avoids the verbs, units, and
phrases the keyword rules look for (build verbs, "memimpin ... tim", "mentoring", "%", "ms", "+", digits with units).
Because meaning is preserved, the golden `expected_states` stay valid and are copied unchanged.

This is a recall stress test, not a sample of real CVs: the rewrites target the vocabulary gaps of the rules on
purpose. It measures whether the screening flow still finds evidence the rules miss, nothing more.

Usage:
  python scripts/build_paraphrase_set.py            # writes docs/eval/paraphrase_set/{cvs,labels,README.md}
The golden dataset itself is read, never modified (rule: golden labels are the referee).
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GOLDEN = REPO_ROOT / "docs/spec/golden_dataset"
sys.path.insert(0, str(GOLDEN / "generator"))

import cv_data  # noqa: E402
import generate_cvs  # noqa: E402

# original bullet -> paraphrase. Keys must match the source data exactly (checked below).
PARAPHRASES: dict[str, str] = {
    # --- S1
    "Memimpin tim 4 backend engineer, termasuk code review dan mentoring engineer junior.":
        "Mengarahkan 4 backend engineer, termasuk code review dan pendampingan teknis bagi engineer junior.",
    "Mendesain arsitektur microservices berbasis Python (FastAPI) untuk sistem pelacakan paket.":
        "Merancang arsitektur microservices berbasis Python (FastAPI) untuk sistem pelacakan paket.",
    "Menurunkan latensi p95 API tracking dari 900 ms menjadi 180 ms dengan optimasi query PostgreSQL dan caching Redis.":
        "Menurunkan latensi p95 API tracking dari 0,9 s menjadi 0,18 s dengan optimasi query PostgreSQL dan caching Redis.",
    "Membangun REST API pembayaran dengan Python (Django REST Framework) dan PostgreSQL.":
        "Mengimplementasikan REST API pembayaran dengan Python (Django REST Framework) dan PostgreSQL.",
    "Menangani lebih dari 1,2 juta transaksi per hari dengan uptime 99,9%.":
        "Menangani lebih dari 1,2 jt transaksi per hari dengan uptime 99,9 persen.",
    "Membuat API inventori untuk 3 toko UMKM dengan Flask.":
        "Menciptakan API inventori untuk 3 toko UMKM dengan Flask.",
    # --- S2
    "Built and maintained REST APIs in Python (FastAPI) serving 300k monthly active users.":
        "Engineered and maintained REST APIs in Python (FastAPI) serving 300 thousand monthly active users.",
    "Designed PostgreSQL schemas and reduced slow queries by 60% through indexing and query rewrites.":
        "Architected PostgreSQL schemas and reduced slow queries by 60 percent through indexing and query rewrites.",
    "Developed Django REST Framework endpoints for client projects.":
        "Implemented Django REST Framework endpoints for client projects.",
    # --- S3
    "Developed REST APIs with Python (Flask) for the inventory module used by 40 retail stores in production.":
        "Implemented REST APIs with Python (Flask) for the inventory module used by 40 retail stores in production.",
    "Built with Flask and Redis, packaged with Docker; handled 10k requests/day in a load test.":
        "Implemented with Flask and Redis, packaged with Docker; handled 10 thousand requests per day in a load test.",
    # --- S4
    "Mentored 5 backend engineers and ran weekly design reviews.":
        "Coached 5 backend engineers and ran weekly design reviews.",
    "Cut infrastructure cost by 35% by right-sizing clusters and caching.":
        "Cut infrastructure cost by 35 percent by right-sizing clusters and caching.",
    "Built Python (FastAPI) services backed by PostgreSQL.":
        "Implemented Python (FastAPI) services backed by PostgreSQL.",
    "Exposed REST APIs for 20+ courier partners.":
        "Exposed REST APIs for more than 20 courier partners.",
    # --- S5
    "Membangun microservices reservasi klinik dengan Python (Django) dan PostgreSQL.":
        "Merealisasikan microservices reservasi klinik dengan Python (Django) dan PostgreSQL.",
    "Mengembangkan backend aplikasi web klien dengan Python (Flask) dan PHP.":
        "Mengimplementasikan backend aplikasi web klien dengan Python (Flask) dan PHP.",
    "Sistem antrian berbasis web yang dipakai 3 puskesmas dan memangkas waktu tunggu rata-rata 25%.":
        "Sistem antrian berbasis web yang dipakai 3 puskesmas dan memangkas waktu tunggu rata-rata 25 persen.",
    "Memimpin 30 pengurus himpunan.":
        "Mengarahkan 30 pengurus himpunan.",
    # --- M1
    "Built REST APIs with Node.js (Express) and PostgreSQL for the ordering platform.":
        "Engineered REST APIs with Node.js (Express) and PostgreSQL for the ordering platform.",
    "Improved checkout API response time by 40% by adding database indexes.":
        "Improved checkout API response time by 40 percent by adding database indexes.",
    # --- M2
    "Membuat API internal sederhana dengan Flask untuk menyuplai data dashboard.":
        "Menciptakan API internal sederhana dengan Flask untuk menyuplai data dashboard.",
    "Mempercepat pembuatan laporan mingguan dari 2 hari menjadi 2 jam.":
        "Mempercepat pembuatan laporan mingguan dari dua hari menjadi dua jam.",
    # --- M3
    "Membuat endpoint REST API dengan Python (FastAPI) untuk modul absensi.":
        "Menciptakan endpoint REST API dengan Python (FastAPI) untuk modul absensi.",
    # --- M4
    "Built API test automation with Python (pytest, requests) covering 120+ REST endpoints.":
        "Engineered API test automation with Python (pytest, requests) covering more than 120 REST endpoints.",
    "Led a QA team of 3 engineers.":
        "Directed a QA group of 3 engineers.",
    "Reduced regression testing time from 3 days to 4 hours.":
        "Reduced regression testing time from three days to four hours.",
    # --- M5
    "Membangun REST API dengan Laravel (PHP) dan MySQL.":
        "Merealisasikan REST API dengan Laravel (PHP) dan MySQL.",
    "Meningkatkan kecepatan muat halaman katalog sebesar 50%.":
        "Meningkatkan kecepatan muat halaman katalog sebesar 50 persen.",
    # --- I4 (sales: leadership and achievement are real but not technical)
    "Memimpin 6 sales executive untuk wilayah Jawa Timur.":
        "Mengarahkan 6 sales executive untuk wilayah Jawa Timur.",
    "Mencapai 120% target penjualan tahunan pada 2024.":
        "Mencapai 120 persen dari target penjualan tahunan pada 2024.",
}


def iter_bullets(cv: dict):
    for key in ("experience", "projects", "organizations"):
        yield from cv.get(key, [])


def paraphrase_cvs() -> list[dict]:
    source = copy.deepcopy(cv_data.CVS)
    for cv in source:
        for entry in iter_bullets(cv):
            entry["bullets"] = [PARAPHRASES.get(b, b) for b in entry.get("bullets", [])]
    return source


def validate() -> None:
    present = {b for cv in cv_data.CVS for entry in iter_bullets(cv) for b in entry.get("bullets", [])}
    missing = [k for k in PARAPHRASES if k not in present]
    same = [k for k, v in PARAPHRASES.items() if k == v]
    if missing or same:
        raise SystemExit(f"paraphrase table out of sync with cv_data: missing={missing} unchanged={same}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Build the paraphrase stress set")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "docs/eval/paraphrase_set")
    args = ap.parse_args()

    validate()
    core = args.out / "cvs" / "core"
    core.mkdir(parents=True, exist_ok=True)
    for cv in paraphrase_cvs():
        generate_cvs.RENDER[cv["format"]](cv, core / cv["file"])
        print("wrote", cv["file"])

    labels = json.loads((GOLDEN / "labels/expected_JD-01.json").read_text())
    labels["derived_from"] = (
        "docs/spec/golden_dataset/labels/expected_JD-01.json, unchanged: the paraphrases preserve meaning, "
        "so expected states, ranking, and scores still apply"
    )
    (args.out / "labels").mkdir(parents=True, exist_ok=True)
    (args.out / "labels" / "expected_JD-01.json").write_text(json.dumps(labels, indent=2, ensure_ascii=False))

    rows = "\n".join(f"| {k} | {v} |" for k, v in PARAPHRASES.items())
    (args.out / "README.md").write_text(
        "# Paraphrase stress set\n\n"
        "The 15 core CVs of the golden dataset with the wording of "
        f"{len(PARAPHRASES)} bullets rewritten. Facts, skills, dates, and layout are unchanged, so the golden labels "
        "apply as they are. The rewrites avoid the vocabulary the keyword rules rely on, which makes this a recall "
        "stress test for the verifier, not a sample of real CVs.\n\n"
        "Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_paraphrase_set.py`, then "
        "measure with `python scripts/eval_agent_path.py --cvs-dir docs/eval/paraphrase_set/cvs/core "
        "--labels docs/eval/paraphrase_set/labels/expected_JD-01.json --output-json out.json`.\n\n"
        "## Rewrites\n\n| Original | Paraphrase |\n|---|---|\n" + rows + "\n"
    )
    print(f"\n{len(PARAPHRASES)} bullets rewritten -> {args.out}")


if __name__ == "__main__":
    main()
