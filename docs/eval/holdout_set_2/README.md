# Second hold-out set

Twelve more fictional CVs (K01 to K12), scored against JD-01. See the docstring of `scripts/build_holdout2_set.py` for how it differs from the first hold-out.

**Measure only. Do not tune rules, prompts, thresholds, or settings against this set.** If the system disagrees with a label, review the case: either may be wrong.

**The labels are not independent.** They were written from the scoring spec (section 4) before the system was run on these CVs, but by the assistant that worked on the system. A human recruiter should review them.

**It is not a random sample.** It was designed after the first hold-out was measured and deliberately includes cases for behaviors already under suspicion: ACHIEVEMENT with no numeric result or with numbers in an unrelated domain, and numeric results written as words or only in a project. K03 uses a date-first layout but has a single job, so it does not exercise the known multi-job parser defect.

File names are descriptive for readability, but the system infers a candidate name from the file name; K09 (`platform_head`) shows the effect: its job title was redacted as if it were a name.

Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_holdout2_set.py`, then:

```
python scripts/eval_agent_path.py --cvs-dir docs/eval/holdout_set_2/cvs/core --labels docs/eval/holdout_set_2/labels/expected_JD-01.json --output-json out.json
```

## Expected states (R1 to R10: S = STRONG, P = PARTIAL, N = NOT_DEMONSTRATED)

| CV | Layout | Lang | Grade | R1..R10 | Notes |
|---|---|---|---|---|---|
| K01 | docx_table2 | id | 3 | `S S S S S S S S S N` | Hasil terukur ditulis dengan kata ('tiga kali lipat') = angka hasil di pekerjaan backend. 'Amazon EKS' = Kubernetes di AWS. 66 + 22 bulan. |
| K02 | pdf_inline | en | 2 | `S S S S N P S S P N` | Tanggal hanya tahun: '2019 - 2022' = Jul 2019-Jun 2022 = 36 bulan, '2022 - Present' = Jul 2022-Okt 2026 = 52 bulan (aturan year-only). Azure hanya di daftar skill = PARTIAL. Angka hanya di proyek = PARTIAL. |
| K03 | docx_dates_first | id | 2 | `P S S S N N S N S N` | Tata letak 'tanggal dulu, baru judul', tetapi hanya satu pekerjaan, sehingga cacat parser yang diketahui (butuh dua pekerjaan atau lebih) tidak teruji di sini. Jan 2024-Okt 2026 = 34 bulan < 36. |
| K04 | pdf_single | en | 2 | `S S N S N S S N S S` | Tanpa Python. Docker tidak disebut. 'Mentored three junior engineers' = mentoring tim teknis = STRONG untuk R10. |
| K05 | docx_para | id | 0 | `N N N N N N N N N N` | Angka hasil ada tetapi di domain pemasaran (domain sama sekali berbeda) = NOT_DEMONSTRATED. Tim konten non-teknis = NOT_DEMONSTRATED untuk R10. |
| K06 | pdf_prose | id | 1 | `S S N S S N S N N N` | Fullstack diterima untuk R1 (Okt 2022-Okt 2026 = 49 bulan). D4 setara S1 dengan jurusan utama = STRONG. Tidak ada angka hasil sama sekali. |
| K07 | docx_sidebar | en | 2 | `S S S N S S P S N N` | Seluruh CV berupa satu tabel dua kolom (sidebar). Matematika ada di partial_fields = PARTIAL. PostgreSQL tidak disebut. Tidak ada angka hasil. |
| K08 | pdf_two_col | id | 1 | `N P P P P N P N P N` | Tanpa pengalaman kerja: semua bukti di proyek (PARTIAL). Mahasiswa aktif belum lulus = maksimal PARTIAL (spec 4.2 EDUCATION). Angka hasil hanya di proyek = PARTIAL. |
| K09 | docx_table2 | en | 1 | `N N S N S S S S S S` | Role family devops tidak diterima untuk R1. Tooling CLI bukan REST API. Python di pekerjaan = STRONG. 'API latency' = kinerja backend = angka hasil relevan. Judul 'Head of' = STRONG untuk R10. |
| K10 | pdf_inline | id | 3 | `S S S S S S S N N N` | Freelance 2022 tumpang tindih penuh dengan pekerjaan utama: tidak dijumlahkan dua kali (59 + 34 = 93). Tidak ada angka hasil sama sekali. |
| K11 | docx_para | en | 0 | `N P P P P P N N N N` | Bukti teknis hanya di proyek bootcamp (PARTIAL). Angka hasil (22 persen) ada tetapi di domain gudang = NOT_DEMONSTRATED. Memimpin tim non-teknis = NOT_DEMONSTRATED untuk R10. Teknik Industri bukan jurusan komputasi. |
| K12 | pdf_single | id | 3 | `S S S S S S S N S S` | Judul 'Koordinator Tim Backend' = STRONG untuk R10 (spec 4.2 LEADERSHIP). Heading 'Pengalaman' saja. |
