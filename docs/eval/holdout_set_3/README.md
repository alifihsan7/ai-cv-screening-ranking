# Third hold-out set

Twelve fictional CVs (L01 to L12), scored against JD-01. See the docstring of `scripts/build_holdout3_set.py` for why it exists.

**Measure only. Do not tune rules, prompts, thresholds, or settings against this set.** If the system disagrees with a label, review the case: either may be wrong.

**The labels are not independent.** They were written from the scoring spec (section 4) before the system was run on these CVs, but by the assistant that worked on the system. A human recruiter should review them.

**It is not a random sample.** It deliberately targets ACHIEVEMENT (R9) and LEADERSHIP (R10) with numbers and lead roles in the wrong domain, in an adjacent technical domain, in an organization or project, and in a non-technical team inside a backend job, plus two controls where STRONG is correct (L01 R9, L10 R9 and R10). File names are neutral on purpose.

Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_holdout3_set.py`, then:

```
python scripts/eval_agent_path.py --cvs-dir docs/eval/holdout_set_3/cvs/core --labels docs/eval/holdout_set_3/labels/expected_JD-01.json --output-json out.json
```

## Expected states (R1 to R10: S = STRONG, P = PARTIAL, N = NOT_DEMONSTRATED)

| CV | Layout | Lang | Grade | R1..R10 | Notes |
|---|---|---|---|---|---|
| L01 | docx_para | id | 3 | `S S S S S S S S S N` | Kontrol positif: angka hasil latensi di pekerjaan backend = STRONG. Tanpa peran memimpin. |
| L02 | pdf_single | en | 2 | `S S S S N N S N N N` | Jebakan domain: angka hasil (120%) ada di pekerjaan LAIN dan berupa target penjualan; pekerjaan backend tidak punya angka hasil. R9 = NOT_DEMONSTRATED. Account Executive tidak dihitung untuk R1 (56 bulan backend). |
| L03 | pdf_prose | id | 1 | `N N S S N N P N P N` | Domain berdekatan: angka hasil di pekerjaan data analyst untuk lowongan backend = PARTIAL (spec 4.2 ACHIEVEMENT). Role family data tidak diterima untuk R1. Statistika = partial_fields. |
| L04 | docx_para | en | 0 | `N N N N N N N N N N` | Jebakan domain: angka hasil (150%) dan memimpin tim 7 orang, tetapi di pemasaran = NOT_DEMONSTRATED untuk R9 dan R10 (tim non-teknis). |
| L05 | pdf_single | id | 0 | `N N N N N N N N N N` | Jebakan domain: jabatan memuat 'Supervisor' dan memimpin tim 12 orang, tetapi tim penjualan (non-teknis) = NOT_DEMONSTRATED untuk R10. Target penjualan 135% bukan domain backend = NOT_DEMONSTRATED untuk R9 (contoh langsung dari spec). |
| L06 | docx_para | id | 0 | `N N N N N N N N N N` | Jebakan domain: jabatan 'Koordinator' dan angka hasil 25%, tetapi logistik/gudang = NOT_DEMONSTRATED untuk R9 dan R10 (tim non-teknis). Teknik Industri bukan jurusan komputasi. |
| L07 | pdf_inline | id | 2 | `S S S S S N S N P P` | Angka hasil dan kepemimpinan hanya di organisasi kampus = PARTIAL untuk R9 dan R10; pekerjaan backend tidak punya angka hasil maupun peran memimpin. |
| L08 | pdf_prose | en | 2 | `S S S S S N S N P P` | Angka hasil dan memimpin tim 4 orang hanya di proyek open source = PARTIAL untuk R9 dan R10; pekerjaan backend tidak punya keduanya. |
| L09 | pdf_single | en | 1 | `N N S N N N S N P S/P` | Domain QA berdekatan: angka hasil di pekerjaan QA = PARTIAL untuk R9; tim QA untuk lowongan backend boleh STRONG atau PARTIAL untuk R10 (spec 4.2 LEADERSHIP). Role family qa tidak diterima untuk R1. |
| L10 | docx_table3 | en | 3 | `S S S S N S S N S S` | Kontrol positif: jabatan Team Lead dan memimpin 9 engineer backend = STRONG untuk R10; penghematan biaya cloud 35% di pekerjaan backend = efisiensi = STRONG untuk R9. Docker tidak disebut. |
| L11 | docx_para | en | 0 | `N N N N N N N N N N` | Jebakan domain: memimpin tim 6 orang dan angka konversi 18%, tetapi tim konten/pemasaran dan metrik bisnis = NOT_DEMONSTRATED untuk R10 dan R9. |
| L12 | docx_table3 | id | 2 | `S S S S N N S N N N` | Jebakan domain: memimpin tim 8 orang di dalam pekerjaan backend, tetapi timnya panitia relokasi kantor (non-teknis) = NOT_DEMONSTRATED untuk R10. Tidak ada angka hasil = NOT_DEMONSTRATED untuk R9. |
