# Hold-out set

Twelve new fictional CVs in layouts the golden dataset does not cover (DOCX with paragraphs only, DOCX with a three-column job table, PDF with prose instead of bullets, other date formats), scored against JD-01.

**Measure only. Do not tune rules, prompts, thresholds, or settings against this set.** If the system disagrees with a label, review the case: either may be wrong. The golden set stays the referee.

**The labels are not independent.** They were written from the scoring spec (section 4) before the system was run on these CVs, but by the assistant that worked on the system. A human recruiter should review them.

Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_holdout_set.py`, then:

```
python scripts/eval_agent_path.py --cvs-dir docs/eval/holdout_set/cvs/core --labels docs/eval/holdout_set/labels/expected_JD-01.json --output-json out.json
```

## Expected states (R1 to R10: S = STRONG, P = PARTIAL, N = NOT_DEMONSTRATED)

| CV | Layout | Lang | Grade | R1..R10 | Notes |
|---|---|---|---|---|---|
| H01 | docx_para | id | 3 | `S S S S S S S S S N` | Alias di teks: 'Postgres' (R4), 'k8s' dan 'Amazon Web Services' (R6). 58 + 22 bulan tanpa tumpang tindih. |
| H02 | docx_table3 | en | 3 | `S S S S S S S N S S` | Job header and dates sit in a three-column table. 69 + 32 months. Title 'Tech Lead' plus 'led a team of 5'. |
| H03 | pdf_prose | id | 1 | `P S S N P N S N N N` | Heading 'Riwayat Karir' sengaja tidak umum. MySQL bukan alternatif PostgreSQL (spec 4.2). 32 bulan < 36. |
| H04 | pdf_single | en | 2 | `S S S S S N S N N N` | Tanggal MM/YYYY. Fullstack diterima; 03/2021-02/2024 = tepat 36 bulan = batas STRONG. Frontend tidak dihitung. |
| H05 | pdf_two_col | id | 0 | `N P N N N N S N P N` | R2: hanya menyebut REST API tanpa membangun = PARTIAL (spec 4.2). R9: angka di pekerjaan tapi domain frontend = PARTIAL. |
| H06 | docx_para | en | 1 | `N N S S N S P N P N` | Role family data tidak diterima untuk R1. Statistika = partial_fields. R9: angka di pekerjaan, domain data = PARTIAL. |
| H07 | pdf_prose | en | 1 | `N N N N S S P S N N` | Role family devops tidak diterima. D3 di bawah S1 tapi jurusan cocok = PARTIAL (spec 4.2). Sertifikat Google Cloud = STRONG. |
| H08 | docx_table3 | id | 1 | `P P S S P N S N P P` | Magang 6 bulan x 50% = 3. R2: hanya magang = PARTIAL. R3/R4: pekerjaan bertanggal termasuk magang = STRONG. R5 hanya di proyek. |
| H09 | pdf_single | id | 0 | `N P P P N N N N N N` | Semua bukti teknis hanya di proyek (PARTIAL). Akuntansi bukan jurusan komputasi. Sertifikat bootcamp bukan sertifikasi cloud. |
| H10 | pdf_two_col | en | 3 | `S S S S P S S P S S` | 53 bulan sebagai Senior Backend Engineer (99 jika masa manajer dihitung; STRONG di keduanya). Docker hanya di daftar skill = PARTIAL. Sertifikat kedaluwarsa tertulis = PARTIAL. |
| H11 | docx_para | id | 1 | `N N/P S P S N S N P S/P` | Mengikuti konvensi golden M4: menguji API bukan membangun (NOT_DEMONSTRATED atau PARTIAL); tim QA untuk lowongan backend boleh STRONG atau PARTIAL. PostgreSQL hanya di daftar skill. |
| H12 | pdf_prose | id | 2 | `S S N S S S S N S N` | Tanpa Python (Java bukan alternatif, spec 4.2 butir 5). Azure di pekerjaan = STRONG untuk R6. |
