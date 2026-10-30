#!/usr/bin/env python3
"""Builds the civil engineering development set: 12 fictional CVs (C01..C12) scored against a civil vacancy.

Why it exists: the first run of the system on a non-software vacancy ("Civil Engineer (Struktur & Pelaksana)", 13 real
CVs) rated the experience-duration criterion (R2) NOT_DEMONSTRATED for every candidate, because role classification
only knew software roles. See docs/plan/ROLE_PROFILE_DESIGN.md.

This is a DEVELOPMENT set, not a hold-out: it was written after seeing that failure in the same field. It shows that
the defect is gone, not that other professions will be read correctly. The real CVs stay out of the repository
(they hold personal data); everything here is fictional.

Only R1 (education) and R2 (experience duration) are labelled. The other criteria of this vacancy have problems of
their own that are out of scope for this step, and a wrong label there would only add noise. Labels follow
docs/spec/02_SCORING_RUBRIC_SPEC.md section 4.2 (months of overlapping jobs are merged, internships count 50%,
student organizations are not work experience), written BEFORE the system was run on these CVs.

Usage:  python scripts/build_civil_set.py     # writes docs/eval/civil_set/{cvs,labels,job_descriptions,README.md}
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_holdout2_set as h2  # noqa: E402
from build_holdout_set import N, P, S, ident, job  # noqa: E402
from cv_data import AS_OF  # noqa: E402

REQUIREMENTS = json.loads((Path(__file__).resolve().parent / "civil_requirements.json").read_text())


def cv(n, fmt, lang, name, headline, summary, experience, education, skills, grade, r1, r2, note, **extra):
    return {
        "id": f"C{n:02d}", "format": fmt, "lang": lang, "grade": grade,
        "file": f"C{n:02d}_{fmt}_{lang}.{'docx' if fmt.startswith('docx') else 'pdf'}",
        "identity": ident(name, 60 + n, extra.pop("city", "Bandung")),
        "headline": headline, "summary": summary, "experience": experience, "education": education,
        "certifications": extra.pop("certifications", []), "skills": skills,
        "languages": ["Indonesia", "Inggris"] if lang == "id" else ["Indonesian", "English"],
        "expected": {"states": {"R1": [r1], "R2": [r2]}, "note": note},
        **extra,
    }


def edu(degree, inst, dates):
    return [{"degree": degree, "institution": inst, "dates": dates}]


CVS: list[dict] = [
    cv(1, "docx_para", "id", "Hadi Prasetyo", "Site Engineer", "Site engineer untuk proyek gedung bertingkat.",
       [job("Site Engineer", "PT Karya Bangun Nusantara", "Bandung", "Januari 2021 – Sekarang", "full_time", [
           "Mengawasi pekerjaan pondasi tiang pancang dan struktur beton bertulang pada gedung 8 lantai.",
           "Memeriksa gambar kerja dan mengoordinasikan mandor serta subkontraktor di lapangan.",
           "Menyusun laporan progres mingguan dan opname pekerjaan."])],
       edu("S1 Teknik Sipil", "Institut Teknologi Pasundan Raya", "2016 – 2020"),
       ["AutoCAD", "MS Project", "Microsoft Excel"], 3, S, S,
       "Site Engineer sejak Januari 2021 = 70 bulan; judul 'site engineer' ada di taksonomi lama."),
    cv(2, "pdf_single", "id", "Rina Maharani", "Pelaksana Lapangan", "Pelaksana lapangan proyek jalan dan drainase.",
       [job("Pelaksana Lapangan", "CV Mitra Konstruksi", "Cirebon", "2022 – 2024", "full_time", [
           "Memimpin pekerjaan galian, timbunan, dan pemasangan saluran drainase di lapangan.",
           "Mengatur tenaga kerja dan mandor serta mengontrol kurva S pekerjaan."])],
       edu("D3 Teknik Sipil", "Politeknik Negeri Cirebon Raya", "2018 – 2021"),
       ["AutoCAD", "Kurva S"], 3, S, S,
       "Tanggal hanya tahun: 2022 – 2024 = Jul 2022 sampai Jun 2024 = 24 bulan. Judul 'pelaksana lapangan' tidak ada di taksonomi lama."),
    cv(3, "pdf_inline", "id", "Agus Setiadi", "Quantity Surveyor", "Quantity surveyor untuk proyek infrastruktur.",
       [job("Quantity Surveyor", "PT Cipta Estimasi Utama", "Jakarta", "Maret 2025 – Sekarang", "full_time", [
           "Menyusun RAB dan bill of quantity untuk pekerjaan struktur dan jalan.",
           "Menghitung volume pekerjaan beton dan menyiapkan opname bulanan."])],
       edu("S1 Teknik Sipil", "Universitas Parahyangan Timur", "2017 – 2021"),
       ["RAB", "BOQ", "Microsoft Excel"], 3, S, S,
       "Maret 2025 sampai Oktober 2026 = 20 bulan. 'Quantity surveyor' tidak ada di taksonomi lama."),
    cv(4, "docx_table3", "id", "Dewi Lestari", "Drafter", "Drafter gambar teknik bangunan.",
       [job("Drafter", "Studio Gambar Teknik Prima", "Bandung", "Juni 2025 – Maret 2026", "full_time", [
           "Menyusun shop drawing struktur beton dan gambar as built bangunan gedung dengan AutoCAD.",
           "Merevisi gambar kerja berdasarkan arahan insinyur struktur."])],
       edu("D3 Teknik Sipil", "Politeknik Negeri Bandung Barat", "2021 – 2024"),
       ["AutoCAD", "Shop drawing"], 2, S, P,
       "Juni 2025 sampai Maret 2026 = 10 bulan < 12 = PARTIAL."),
    cv(5, "pdf_prose", "id", "Fajar Nugroho", "Lulusan Teknik Sipil", "Lulusan baru dengan magang di proyek gedung.",
       [job("Magang Pelaksana Proyek", "PT Wijaya Karya Konstruksi Mandiri", "Surabaya", "Juli 2025 – September 2025", "internship", [
           "Membantu pengukuran lapangan dan pengawasan pekerjaan pondasi serta struktur beton bertulang.",
           "Mencatat progres harian pekerjaan struktur."])],
       edu("S1 Teknik Sipil", "Institut Teknologi Surabaya Timur", "2021 – 2025"),
       ["AutoCAD", "Microsoft Excel"], 2, S, P,
       "Magang 3 bulan dihitung 50% = 1,5 bulan = PARTIAL (lowongan terbuka untuk fresh graduate dengan magang)."),
    cv(6, "pdf_single", "id", "Maya Anggraini", "Lulusan Teknik Sipil", "Lulusan baru, aktif di organisasi mahasiswa.",
       [],
       edu("S1 Teknik Sipil", "Universitas Gadjah Raya Selatan", "2020 – 2024"),
       ["AutoCAD", "SAP2000"], 1, S, N,
       "Hanya organisasi mahasiswa (Himpunan Mahasiswa Teknik Sipil): bukan pengalaman kerja = NOT_DEMONSTRATED.",
       organizations=[job("Ketua Himpunan Mahasiswa Teknik Sipil", "Universitas Gadjah Raya Selatan", None, "2022 – 2023", None, [
           "Memimpin 40 pengurus dan mengoordinasikan kunjungan lapangan ke proyek jembatan dan gedung bertingkat.",
           "Menyelenggarakan pelatihan AutoCAD dan perhitungan struktur untuk 120 mahasiswa."])]),
    cv(7, "pdf_single", "en", "Daniel Wijaya", "Backend Developer", "Backend developer on billing services.",
       [job("Backend Developer", "Kite Systems", "Jakarta", "Feb 2021 – Present", "full_time", [
           "Developed REST APIs in Python (Django) and tuned PostgreSQL queries for the billing service.",
           "Containerized services with Docker and reviewed pull requests."])],
       edu("Bachelor of Informatics Engineering", "Universitas Garuda Timur", "2016 – 2020"),
       ["Python", "Django", "PostgreSQL", "Docker"], 0, N, N,
       "Insinyur perangkat lunak: di luar bidang = NOT_DEMONSTRATED untuk durasi dan pendidikan."),
    cv(8, "docx_table2", "id", "Sari Wulandari", "Digital Marketing Manager", "Manajer pemasaran digital untuk merek konsumen.",
       [job("Digital Marketing Manager", "PT Lumen Brands", "Jakarta", "Januari 2018 – Sekarang", "full_time", [
           "Memimpin tim 7 pemasar konten untuk tiga merek.",
           "Meningkatkan lalu lintas organik sebesar 150% lewat strategi SEO."])],
       edu("S1 Manajemen", "Universitas Persada Baru", "2012 – 2016"),
       ["SEO", "Google Analytics"], 0, N, N,
       "Pemasaran: di luar bidang."),
    cv(9, "docx_para", "id", "Bambang Hartono", "Staff Teknik", "Staf teknik pada kontraktor gedung.",
       [job("Staff Teknik", "PT Wijaya Bangun Persada", "Bekasi", "Januari 2023 – Juni 2025", "full_time", [
           "Menghitung kebutuhan tulangan dan bekisting untuk pekerjaan struktur beton bertulang.",
           "Mengawasi pekerjaan pondasi dan menyiapkan laporan progres proyek gedung."])],
       edu("S1 Teknik Sipil", "Universitas Trisakti Barat", "2017 – 2021"),
       ["AutoCAD", "SAP2000"], 3, S, S,
       "Judul 'Staff Teknik' ambigu; bulletnya (tulangan, bekisting, beton bertulang, pondasi, proyek gedung) menunjukkan pekerjaan sipil. Januari 2023 sampai Juni 2025 = 30 bulan."),
    cv(10, "pdf_inline", "id", "Eko Susilo", "Pengawas Lapangan", "Pengawas lapangan proyek jalan dan jembatan.",
       [job("Pengawas Lapangan", "PT Bina Marga Konsultan", "Semarang", "Maret 2024 – Sekarang", "full_time", [
           "Mengawasi pekerjaan perkerasan jalan, struktur jembatan, dan drainase di lapangan.",
           "Memeriksa mutu beton dan membuat berita acara pekerjaan."])],
       edu("D3 Teknik Sipil", "Politeknik Negeri Semarang Tengah", "2018 – 2021"),
       ["AutoCAD", "Microsoft Excel"], 3, S, S,
       "Maret 2024 sampai Oktober 2026 = 32 bulan; 'pengawas lapangan' tidak ada di taksonomi lama."),
    cv(11, "docx_para", "id", "Lina Marlina", "Akuntan Proyek", "Akuntan untuk proyek konstruksi pada kontraktor.",
       [job("Akuntan Proyek", "PT Karya Bangun Nusantara", "Bandung", "Februari 2022 – Agustus 2025", "full_time", [
           "Menyusun laporan keuangan proyek konstruksi gedung dan jalan setiap bulan.",
           "Merekonsiliasi pembayaran subkontraktor dan menyiapkan penagihan termin ke pemilik proyek."])],
       edu("S1 Akuntansi", "Universitas Padjadjaran Utara", "2016 – 2020"),
       ["Accurate", "Microsoft Excel"], 0, N, N,
       "JEBAKAN PRESISI: akuntan di kontraktor. Isinya menyebut konstruksi, gedung, jalan, proyek, tetapi pekerjaannya akuntansi, bukan pekerjaan sipil = NOT_DEMONSTRATED."),
    cv(12, "pdf_prose", "id", "Yoga Permana", "Site Engineer", "Site engineer dengan pekerjaan lepas sebagai pengawas.",
       [job("Site Engineer", "PT Graha Struktur Mandiri", "Jakarta", "Januari 2024 – Desember 2025", "full_time", [
           "Mengawasi pekerjaan struktur beton bertulang dan pondasi pada proyek gedung perkantoran."]),
        job("Pengawas Lepas", "Proyek Rumah Tinggal", "Jakarta", "Januari 2025 – Juni 2025", "freelance", [
           "Mengawasi pekerjaan pondasi dan struktur rumah dua lantai sebagai pengawas lepas."])],
       edu("S1 Teknik Sipil", "Universitas Indonesia Timur", "2018 – 2022"),
       ["AutoCAD", "SAP2000"], 3, S, S,
       "Dua pekerjaan tumpang tindih sepenuhnya: Jan 2024 sampai Des 2025 = 24 bulan, tidak dijumlahkan dua kali."),
]


def build_labels() -> dict:
    return {
        "job_id": "JD-CIVIL",
        "as_of": AS_OF,
        "requirement_set": "docs/eval/civil_set/job_descriptions/JD-CIVIL_requirements.approved.json",
        "authoring": "Only R1 and R2 are labelled, from docs/spec/02_SCORING_RUBRIC_SPEC.md section 4.2, before the system "
                     "was run on these CVs. Written by the assistant that worked on the system; needs human review. "
                     "This is a development set (written after seeing the failure in the same field), not a hold-out.",
        "reference_ranking": [c["id"] for c in sorted(CVS, key=lambda c: (-c["grade"], c["id"]))],
        "candidates": [
            {
                "cv_id": c["id"], "file": f"cvs/core/{c['file']}", "format": c["format"], "language": c["lang"],
                "relevance_grade": c["grade"], "expected_states": c["expected"]["states"], "note": c["expected"]["note"],
            }
            for c in CVS
        ],
    }


def readme(labels: dict) -> str:
    rows = "\n".join(
        f"| {c['cv_id']} | {c['format']} | {c['language']} | `{c['expected_states']['R1'][0][0]} {c['expected_states']['R2'][0][0]}` | {c['note']} |"
        for c in labels["candidates"]
    )
    return (
        "# Civil engineering development set\n\n"
        "Twelve fictional CVs (C01 to C12) scored against a civil vacancy (`JD-CIVIL`). See the docstring of "
        "`scripts/build_civil_set.py` and `docs/plan/ROLE_PROFILE_DESIGN.md`.\n\n"
        "**This is a development set, not a hold-out.** It was written after the first real run on a civil vacancy "
        "failed, so it shows that the defect is gone, not that other professions will be read correctly. "
        "Only R1 (education) and R2 (experience duration) are labelled. The labels were written from the scoring spec "
        "before the system was run, by the assistant that worked on the system; a human should review them.\n\n"
        "Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_civil_set.py`, then:\n\n"
        "```\npython scripts/eval_agent_path.py --jd docs/eval/civil_set/job_descriptions/JD-CIVIL_requirements.approved.json "
        "--cvs-dir docs/eval/civil_set/cvs/core --labels docs/eval/civil_set/labels/expected_JD-CIVIL.json --output-json out.json\n```\n\n"
        "## Expected states (R1 education, R2 experience duration; S = STRONG, P = PARTIAL, N = NOT_DEMONSTRATED)\n\n"
        "| CV | Layout | Lang | R1 R2 | Notes |\n|---|---|---|---|---|\n" + rows + "\n"
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="Build the civil engineering development set")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "docs/eval/civil_set")
    args = ap.parse_args()

    core = args.out / "cvs" / "core"
    core.mkdir(parents=True, exist_ok=True)
    for c in CVS:
        h2.RENDER[c["format"]](c, core / c["file"])
        print("wrote", c["file"])

    (args.out / "job_descriptions").mkdir(parents=True, exist_ok=True)
    (args.out / "job_descriptions" / "JD-CIVIL_requirements.approved.json").write_text(json.dumps({
        "job_id": "JD-CIVIL", "requirement_set_version": 1, "status": "APPROVED",
        "note": "Kriteria lowongan 'Civil Engineer (Struktur & Pelaksana)' sebagaimana dikompilasi dan disetujui di aplikasi.",
        "category_weights": {"EXPERIENCE": 40, "HARD_SKILLS": 30, "EDUCATION_CERT": 15, "ACHIEVEMENT": 15},
        "requirements": REQUIREMENTS,
    }, indent=2, ensure_ascii=False))
    labels = build_labels()
    (args.out / "labels").mkdir(parents=True, exist_ok=True)
    (args.out / "labels" / "expected_JD-CIVIL.json").write_text(json.dumps(labels, indent=2, ensure_ascii=False))
    (args.out / "README.md").write_text(readme(labels))
    print(f"\n{len(CVS)} CVs -> {args.out}")


if __name__ == "__main__":
    main()
