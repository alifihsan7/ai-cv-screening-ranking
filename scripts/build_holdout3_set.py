#!/usr/bin/env python3
"""Builds the third hold-out set: 12 fictional CVs (L01..L12) with labels, aimed at DOMAIN traps.

Same discipline as the first two hold-outs: measure only, never tune rules, prompts, thresholds, or settings against
it. Labels come from docs/spec/02_SCORING_RUBRIC_SPEC.md (section 4), written BEFORE the system was run on these CVs,
by the assistant that worked on the system; a human should review them.

Why this set exists: across the two earlier hold-outs and the golden set, the false positives that Jev produced on
ACHIEVEMENT (R9) and LEADERSHIP (R10) were mostly caused by a number or a leadership claim in the WRONG DOMAIN (data,
warehouse, marketing, sales), not by a missing number. A third set is needed to measure that behavior cleanly, because
the earlier sets have already been looked at in detail.

The CVs are built so that R9 and R10 are the interesting cells:
  - a number or a lead role in a totally different domain (L02 sales target in another job, L04 marketing, L05 sales
    supervisor, L06 logistics, L11 product) -> NOT_DEMONSTRATED,
  - an adjacent technical domain (L03 data, L09 QA) -> PARTIAL for R9,
  - a lead role or numbers only in an organization or project (L07, L08) -> PARTIAL,
  - a lead role over a NON-technical team inside a backend job (L12) -> NOT_DEMONSTRATED for R10,
  - two controls where R9/R10 are genuinely right (L01 R9, L10 R9 and R10) -> STRONG.
File names are deliberately neutral: the system infers a candidate name from the file name.

Usage:  python scripts/build_holdout3_set.py     # writes docs/eval/holdout_set_3/{cvs,labels,README.md}
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_holdout2_set as h2  # noqa: E402
from build_holdout_set import GOLDEN, N, P, S, ident, job  # noqa: E402
from cv_data import AS_OF  # noqa: E402
from reference_scorer import rank, score  # noqa: E402


def states(r1, r2, r3, r4, r5, r6, r7, r8, r9, r10) -> dict:
    return {f"R{i}": v for i, v in enumerate([r1, r2, r3, r4, r5, r6, r7, r8, r9, r10], start=1)}


CVS: list[dict] = [
    {
        "id": "L01", "group": "strong", "format": "docx_para", "lang": "id", "grade": 3,
        "file": "L01_docx_para_id.docx",
        "identity": ident("Rangga Prasetya", 41, "Jakarta"),
        "headline": "Backend Engineer",
        "summary": "Backend engineer untuk layanan pembayaran.",
        "experience": [
            job("Backend Engineer", "PT Kirana Digital", "Jakarta", "Januari 2021 – Sekarang", "full_time", [
                "Membangun REST API dengan Python (FastAPI) dan PostgreSQL untuk layanan pembayaran.",
                "Menjalankan layanan dalam container Docker di Google Cloud Platform.",
                "Menurunkan latensi p95 endpoint pembayaran dari 900 ms menjadi 210 ms.",
            ]),
        ],
        "education": [{"degree": "S1 Teknik Informatika", "institution": "Universitas Bumi Lestari", "dates": "2016 – 2020"}],
        "certifications": [{"name": "Google Cloud Associate Cloud Engineer", "issuer": "Google Cloud", "date": "2022"}],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "GCP"],
        "languages": ["Indonesia", "Inggris"],
        "expected": {
            "states": states([S], [S], [S], [S], [S], [S], [S], [S], [S], [N]),
            "backend_months": 70,
            "note": "Kontrol positif: angka hasil latensi di pekerjaan backend = STRONG. Tanpa peran memimpin.",
        },
    },
    {
        "id": "L02", "group": "marginal", "format": "pdf_single", "lang": "en", "grade": 2,
        "file": "L02_pdf_single_en.pdf",
        "identity": ident("Nadia Kusumawardhani", 42, "Surabaya"),
        "headline": "Backend Developer",
        "summary": "Backend developer, previously in sales.",
        "experience": [
            job("Backend Developer", "Tirta Subscriptions", "Surabaya", "Mar 2022 – Present", "full_time", [
                "Developed REST APIs in Python (Django) for the subscription service in production.",
                "Maintained PostgreSQL schemas and wrote migrations.",
            ]),
            job("Account Executive", "Mega Niaga", "Surabaya", "Jan 2019 – Feb 2022", "full_time", [
                "Met the annual subscription sales target at 120%, ranking first among 14 account executives.",
            ]),
        ],
        "education": [{"degree": "Bachelor of Information Systems", "institution": "Institut Teknologi Pantai Timur", "dates": "2014 – 2018"}],
        "certifications": [],
        "skills": ["Python", "Django", "PostgreSQL", "Git"],
        "languages": ["Indonesian", "English"],
        "expected": {
            "states": states([S], [S], [S], [S], [N], [N], [S], [N], [N], [N]),
            "backend_months": 56,
            "note": "Jebakan domain: angka hasil (120%) ada di pekerjaan LAIN dan berupa target penjualan; pekerjaan backend tidak punya angka hasil. R9 = NOT_DEMONSTRATED. Account Executive tidak dihitung untuk R1 (56 bulan backend).",
        },
    },
    {
        "id": "L03", "group": "irrelevant", "format": "pdf_prose", "lang": "id", "grade": 1,
        "file": "L03_pdf_prose_id.pdf",
        "identity": ident("Fitri Handayani", 43, "Yogyakarta"),
        "headline": "Data Analyst",
        "summary": "Data analyst untuk pelaporan operasional.",
        "experience": [
            job("Data Analyst", "PT Lensa Data", "Yogyakarta", "Februari 2020 – Sekarang", "full_time", [
                "Menulis query SQL pada PostgreSQL untuk laporan bulanan.",
                "Mengotomatiskan laporan dengan Python (pandas).",
                "Memangkas waktu penyusunan laporan dari 8 jam menjadi 30 menit.",
            ]),
        ],
        "education": [{"degree": "S1 Statistika", "institution": "Universitas Gunung Mas", "dates": "2015 – 2019"}],
        "certifications": [],
        "skills": ["SQL", "PostgreSQL", "Python", "pandas", "Tableau"],
        "languages": ["Indonesia", "Inggris"],
        "expected": {
            "states": states([N], [N], [S], [S], [N], [N], [P], [N], [P], [N]),
            "backend_months": 0,
            "note": "Domain berdekatan: angka hasil di pekerjaan data analyst untuk lowongan backend = PARTIAL (spec 4.2 ACHIEVEMENT). Role family data tidak diterima untuk R1. Statistika = partial_fields.",
        },
    },
    {
        "id": "L04", "group": "irrelevant", "format": "docx_para", "lang": "en", "grade": 0,
        "file": "L04_docx_para_en.docx",
        "identity": ident("Vanessa Lim", 44, "Jakarta"),
        "headline": "Digital Marketing Manager",
        "summary": "Marketing manager for consumer brands.",
        "experience": [
            job("Digital Marketing Manager", "Lumen Brands", "Jakarta", "Jan 2018 – Present", "full_time", [
                "Led a team of 7 content marketers across three consumer brands.",
                "Increased organic website traffic by 150% through a new SEO strategy.",
                "Managed a monthly advertising budget of 400 million rupiah.",
            ]),
        ],
        "education": [{"degree": "Bachelor of Management", "institution": "Universitas Persada Baru", "dates": "2012 – 2016"}],
        "certifications": [],
        "skills": ["SEO", "Google Analytics", "Content Strategy"],
        "languages": ["Indonesian", "English"],
        "expected": {
            "states": states([N], [N], [N], [N], [N], [N], [N], [N], [N], [N]),
            "backend_months": 0,
            "note": "Jebakan domain: angka hasil (150%) dan memimpin tim 7 orang, tetapi di pemasaran = NOT_DEMONSTRATED untuk R9 dan R10 (tim non-teknis).",
        },
    },
    {
        "id": "L05", "group": "irrelevant", "format": "pdf_single", "lang": "id", "grade": 0,
        "file": "L05_pdf_single_id.pdf",
        "identity": ident("Bambang Sutrisno", 45, "Semarang"),
        "headline": "Sales Supervisor",
        "summary": "Supervisor penjualan untuk jaringan toko ritel.",
        "experience": [
            job("Sales Supervisor", "PT Maju Retail", "Semarang", "Juni 2016 – Sekarang", "full_time", [
                "Memimpin tim 12 tenaga penjualan di lima cabang.",
                "Mencapai target penjualan 135% pada tahun 2025.",
                "Menyusun jadwal kerja dan pelatihan produk.",
            ]),
        ],
        "education": [{"degree": "D3 Manajemen Pemasaran", "institution": "Politeknik Niaga Tengah", "dates": "2011 – 2014"}],
        "certifications": [],
        "skills": ["Penjualan", "Negosiasi", "Microsoft Excel"],
        "languages": ["Indonesia"],
        "expected": {
            "states": states([N], [N], [N], [N], [N], [N], [N], [N], [N], [N]),
            "backend_months": 0,
            "note": "Jebakan domain: jabatan memuat 'Supervisor' dan memimpin tim 12 orang, tetapi tim penjualan (non-teknis) = NOT_DEMONSTRATED untuk R10. Target penjualan 135% bukan domain backend = NOT_DEMONSTRATED untuk R9 (contoh langsung dari spec).",
        },
    },
    {
        "id": "L06", "group": "irrelevant", "format": "docx_para", "lang": "id", "grade": 0,
        "file": "L06_docx_para_id.docx",
        "identity": ident("Agus Setiawan", 46, "Bekasi"),
        "headline": "Koordinator Logistik",
        "summary": "Koordinator logistik pusat distribusi.",
        "experience": [
            job("Koordinator Logistik", "PT Sentra Distribusi", "Bekasi", "Maret 2017 – Sekarang", "full_time", [
                "Mengoordinasikan 15 staf gudang dan 8 pengemudi.",
                "Menurunkan waktu pengiriman rata-rata sebesar 25% lewat perbaikan rute.",
                "Mengelola stok 3.000 SKU di gudang pusat.",
            ]),
        ],
        "education": [{"degree": "S1 Teknik Industri", "institution": "Universitas Bekasi Raya", "dates": "2012 – 2016"}],
        "certifications": [],
        "skills": ["Manajemen Gudang", "Perencanaan Rute", "Microsoft Excel"],
        "languages": ["Indonesia"],
        "expected": {
            "states": states([N], [N], [N], [N], [N], [N], [N], [N], [N], [N]),
            "backend_months": 0,
            "note": "Jebakan domain: jabatan 'Koordinator' dan angka hasil 25%, tetapi logistik/gudang = NOT_DEMONSTRATED untuk R9 dan R10 (tim non-teknis). Teknik Industri bukan jurusan komputasi.",
        },
    },
    {
        "id": "L07", "group": "strong", "format": "pdf_inline", "lang": "id", "grade": 2,
        "file": "L07_pdf_inline_id.pdf",
        "identity": ident("Dimas Aryanto", 47, "Bandung"),
        "headline": "Backend Developer",
        "summary": "Backend developer dengan pengalaman organisasi kampus.",
        "experience": [
            job("Backend Developer", "PT Rasa Teknologi", "Bandung", "Agustus 2022 – Sekarang", "full_time", [
                "Membangun REST API dengan Python (Flask) dan PostgreSQL untuk aplikasi pemesanan.",
                "Menjalankan layanan dalam container Docker.",
            ]),
        ],
        "organizations": [job("Ketua Himpunan Mahasiswa Informatika", "Universitas Citra Mandiri", None, "2017 – 2018", None, [
            "Memimpin 30 pengurus dan menaikkan jumlah peserta pelatihan dari 40 menjadi 120 orang.",
        ])],
        "education": [{"degree": "S1 Teknik Informatika", "institution": "Universitas Citra Mandiri", "dates": "2014 – 2018"}],
        "certifications": [],
        "skills": ["Python", "Flask", "PostgreSQL", "Docker"],
        "languages": ["Indonesia", "Inggris"],
        "expected": {
            "states": states([S], [S], [S], [S], [S], [N], [S], [N], [P], [P]),
            "backend_months": 51,
            "note": "Angka hasil dan kepemimpinan hanya di organisasi kampus = PARTIAL untuk R9 dan R10; pekerjaan backend tidak punya angka hasil maupun peran memimpin.",
        },
    },
    {
        "id": "L08", "group": "strong", "format": "pdf_prose", "lang": "en", "grade": 2,
        "file": "L08_pdf_prose_en.pdf",
        "identity": ident("Hannah Wijaya", 48, "Malang"),
        "headline": "Backend Developer",
        "summary": "Backend developer on inventory services, maintainer of an open-source library.",
        "experience": [
            job("Backend Developer", "Tigaroda Labs", "Malang", "Apr 2023 – Present", "full_time", [
                "Developed REST APIs in Python (FastAPI) for the inventory service in production.",
                "Wrote PostgreSQL queries and migrations.",
                "Packaged services in Docker.",
            ]),
        ],
        "projects": [job("Open-source project: Queue Library", "GitHub", None, "2024", None, [
            "Reduced message processing time by 60% and led a team of 4 contributors.",
        ])],
        "education": [{"degree": "Bachelor of Computer Science", "institution": "Universitas Arjuna Timur", "dates": "2018 – 2022"}],
        "certifications": [],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "languages": ["Indonesian", "English"],
        "expected": {
            "states": states([S], [S], [S], [S], [S], [N], [S], [N], [P], [P]),
            "backend_months": 43,
            "note": "Angka hasil dan memimpin tim 4 orang hanya di proyek open source = PARTIAL untuk R9 dan R10; pekerjaan backend tidak punya keduanya.",
        },
    },
    {
        "id": "L09", "group": "marginal", "format": "pdf_single", "lang": "en", "grade": 1,
        "file": "L09_pdf_single_en.pdf",
        "identity": ident("Marcus Tan", 49, "Jakarta"),
        "headline": "QA Lead",
        "summary": "QA lead automating regression suites.",
        "experience": [
            job("QA Lead", "Nusa Commerce", "Jakarta", "Jan 2019 – Present", "full_time", [
                "Led a team of 4 QA engineers testing checkout and payment flows.",
                "Cut regression test time by 70% with automated suites written in Python (pytest).",
            ]),
        ],
        "education": [{"degree": "Bachelor of Informatics Engineering", "institution": "Universitas Kenari Jaya", "dates": "2013 – 2017"}],
        "certifications": [],
        "skills": ["Python", "pytest", "Selenium", "Jira"],
        "languages": ["Indonesian", "English"],
        "expected": {
            "states": states([N], [N], [S], [N], [N], [N], [S], [N], [P], [S, P]),
            "backend_months": 0,
            "note": "Domain QA berdekatan: angka hasil di pekerjaan QA = PARTIAL untuk R9; tim QA untuk lowongan backend boleh STRONG atau PARTIAL untuk R10 (spec 4.2 LEADERSHIP). Role family qa tidak diterima untuk R1.",
        },
    },
    {
        "id": "L10", "group": "strong", "format": "docx_table3", "lang": "en", "grade": 3,
        "file": "L10_docx_table3_en.docx",
        "identity": ident("Stefanus Gunawan", 50, "Jakarta"),
        "headline": "Backend Team Lead",
        "summary": "Backend team lead running payments infrastructure on AWS.",
        "experience": [
            job("Backend Team Lead", "Pasar Nusa", "Jakarta", "Jan 2019 – Present", "full_time", [
                "Led a team of 9 backend engineers building payment services.",
                "Designed REST APIs and microservices in Python (Django) on PostgreSQL, running in production.",
                "Reduced monthly cloud cost by 35% by right-sizing Kubernetes clusters on AWS.",
            ]),
        ],
        "education": [{"degree": "Bachelor of Information Systems", "institution": "Universitas Samudra Barat", "dates": "2010 – 2014"}],
        "certifications": [],
        "skills": ["Python", "Django", "PostgreSQL", "Kubernetes", "AWS"],
        "languages": ["Indonesian", "English"],
        "expected": {
            "states": states([S], [S], [S], [S], [N], [S], [S], [N], [S], [S]),
            "backend_months": 94,
            "note": "Kontrol positif: jabatan Team Lead dan memimpin 9 engineer backend = STRONG untuk R10; penghematan biaya cloud 35% di pekerjaan backend = efisiensi = STRONG untuk R9. Docker tidak disebut.",
        },
    },
    {
        "id": "L11", "group": "irrelevant", "format": "docx_para", "lang": "en", "grade": 0,
        "file": "L11_docx_para_en.docx",
        "identity": ident("Priscilla Darmawan", 51, "Bandung"),
        "headline": "Product Manager",
        "summary": "Product manager for a consumer app.",
        "experience": [
            job("Product Manager", "Warna Apps", "Bandung", "Sep 2019 – Present", "full_time", [
                "Led a team of 6 content and marketing specialists for the consumer app.",
                "Increased checkout conversion by 18% through pricing experiments.",
                "Wrote product requirements and managed the roadmap.",
            ]),
        ],
        "education": [{"degree": "Bachelor of Business Administration", "institution": "Universitas Dwipa Mandala", "dates": "2013 – 2017"}],
        "certifications": [],
        "skills": ["Roadmapping", "A/B Testing", "Jira"],
        "languages": ["Indonesian", "English"],
        "expected": {
            "states": states([N], [N], [N], [N], [N], [N], [N], [N], [N], [N]),
            "backend_months": 0,
            "note": "Jebakan domain: memimpin tim 6 orang dan angka konversi 18%, tetapi tim konten/pemasaran dan metrik bisnis = NOT_DEMONSTRATED untuk R10 dan R9.",
        },
    },
    {
        "id": "L12", "group": "strong", "format": "docx_table3", "lang": "id", "grade": 2,
        "file": "L12_docx_table3_id.docx",
        "identity": ident("Yusuf Ramadhan", 52, "Depok"),
        "headline": "Backend Developer",
        "summary": "Backend developer untuk layanan keanggotaan.",
        "experience": [
            job("Backend Developer", "PT Sinar Komunitas", "Depok", "Januari 2020 – Desember 2023", "full_time", [
                "Membangun REST API dengan Python (Django) untuk layanan keanggotaan di produksi.",
                "Mengelola basis data PostgreSQL.",
                "Memimpin tim panitia relokasi kantor beranggotakan 8 orang.",
            ]),
        ],
        "education": [{"degree": "S1 Sistem Informasi", "institution": "Universitas Wijaya Sentosa", "dates": "2015 – 2019"}],
        "certifications": [],
        "skills": ["Python", "Django", "PostgreSQL"],
        "languages": ["Indonesia", "Inggris"],
        "expected": {
            "states": states([S], [S], [S], [S], [N], [N], [S], [N], [N], [N]),
            "backend_months": 48,
            "note": "Jebakan domain: memimpin tim 8 orang di dalam pekerjaan backend, tetapi timnya panitia relokasi kantor (non-teknis) = NOT_DEMONSTRATED untuk R10. Tidak ada angka hasil = NOT_DEMONSTRATED untuk R9.",
        },
    },
]


def build_labels() -> dict:
    jd = json.loads((GOLDEN / "job_descriptions/JD-01_requirements.approved.json").read_text())
    candidates, scored = [], []
    for cv in CVS:
        sts = cv["expected"]["states"]
        candidates.append({
            "cv_id": cv["id"],
            "file": f"cvs/core/{cv['file']}",
            "group": cv["group"],
            "format": cv["format"],
            "language": cv["lang"],
            "relevance_grade": cv["grade"],
            "expected_states": sts,
            "expected_backend_months": cv["expected"]["backend_months"],
            "note": cv["expected"]["note"],
        })
        first = {k: v[0] for k, v in sts.items()}
        scored.append({
            "candidate_id": cv["id"],
            "result": score(first, jd),
            "strong_count": sum(v == S for v in first.values()),
        })
    return {
        "job_id": "JD-01",
        "as_of": AS_OF,
        "requirement_set": "docs/spec/golden_dataset/job_descriptions/JD-01_requirements.approved.json",
        "authoring": "Labels derived from docs/spec/02_SCORING_RUBRIC_SPEC.md section 4 before the system was run on "
                     "these CVs. Written by the assistant that worked on the system; needs human review.",
        "reference_ranking": [r["candidate_id"] for r in rank(scored)],
        "candidates": candidates,
    }


def readme(labels: dict) -> str:
    rows = []
    for c in labels["candidates"]:
        st = " ".join("/".join(s[0] for s in c["expected_states"][f"R{i}"]) for i in range(1, 11))
        rows.append(f"| {c['cv_id']} | {c['format']} | {c['language']} | {c['relevance_grade']} | `{st}` | {c['note']} |")
    return (
        "# Third hold-out set\n\n"
        "Twelve fictional CVs (L01 to L12), scored against JD-01. See the docstring of "
        "`scripts/build_holdout3_set.py` for why it exists.\n\n"
        "**Measure only. Do not tune rules, prompts, thresholds, or settings against this set.** If the system disagrees "
        "with a label, review the case: either may be wrong.\n\n"
        "**The labels are not independent.** They were written from the scoring spec (section 4) before the system was "
        "run on these CVs, but by the assistant that worked on the system. A human recruiter should review them.\n\n"
        "**It is not a random sample.** It deliberately targets ACHIEVEMENT (R9) and LEADERSHIP (R10) with numbers and "
        "lead roles in the wrong domain, in an adjacent technical domain, in an organization or project, and in a "
        "non-technical team inside a backend job, plus two controls where STRONG is correct (L01 R9, L10 R9 and R10). "
        "File names are neutral on purpose.\n\n"
        "Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_holdout3_set.py`, then:\n\n"
        "```\npython scripts/eval_agent_path.py --cvs-dir docs/eval/holdout_set_3/cvs/core "
        "--labels docs/eval/holdout_set_3/labels/expected_JD-01.json --output-json out.json\n```\n\n"
        "## Expected states (R1 to R10: S = STRONG, P = PARTIAL, N = NOT_DEMONSTRATED)\n\n"
        "| CV | Layout | Lang | Grade | R1..R10 | Notes |\n|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n"
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="Build the third hold-out set")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "docs/eval/holdout_set_3")
    args = ap.parse_args()

    core = args.out / "cvs" / "core"
    core.mkdir(parents=True, exist_ok=True)
    for cv in CVS:
        h2.RENDER[cv["format"]](cv, core / cv["file"])
        print("wrote", cv["file"])

    labels = build_labels()
    (args.out / "labels").mkdir(parents=True, exist_ok=True)
    (args.out / "labels" / "expected_JD-01.json").write_text(json.dumps(labels, indent=2, ensure_ascii=False))
    (args.out / "README.md").write_text(readme(labels))
    print(f"\n{len(CVS)} CVs -> {args.out}; reference ranking: {labels['reference_ranking']}")


if __name__ == "__main__":
    main()
