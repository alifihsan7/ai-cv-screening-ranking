# Civil engineering development set

Twelve fictional CVs (C01 to C12) scored against a civil vacancy (`JD-CIVIL`). See the docstring of `scripts/build_civil_set.py` and `docs/plan/ROLE_PROFILE_DESIGN.md`.

**This is a development set, not a hold-out.** It was written after the first real run on a civil vacancy failed, so it shows that the defect is gone, not that other professions will be read correctly. Only R1 (education) and R2 (experience duration) are labelled. The labels were written from the scoring spec before the system was run, by the assistant that worked on the system; a human should review them.

Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_civil_set.py`, then:

```
python scripts/eval_agent_path.py --jd docs/eval/civil_set/job_descriptions/JD-CIVIL_requirements.approved.json --cvs-dir docs/eval/civil_set/cvs/core --labels docs/eval/civil_set/labels/expected_JD-CIVIL.json --output-json out.json
```

## Expected states (R1 education, R2 experience duration; S = STRONG, P = PARTIAL, N = NOT_DEMONSTRATED)

| CV | Layout | Lang | R1 R2 | Notes |
|---|---|---|---|---|
| C01 | docx_para | id | `S S` | Site Engineer sejak Januari 2021 = 70 bulan; judul 'site engineer' ada di taksonomi lama. |
| C02 | pdf_single | id | `S S` | Tanggal hanya tahun: 2022 – 2024 = Jul 2022 sampai Jun 2024 = 24 bulan. Judul 'pelaksana lapangan' tidak ada di taksonomi lama. |
| C03 | pdf_inline | id | `S S` | Maret 2025 sampai Oktober 2026 = 20 bulan. 'Quantity surveyor' tidak ada di taksonomi lama. |
| C04 | docx_table3 | id | `S P` | Juni 2025 sampai Maret 2026 = 10 bulan < 12 = PARTIAL. |
| C05 | pdf_prose | id | `S P` | Magang 3 bulan dihitung 50% = 1,5 bulan = PARTIAL (lowongan terbuka untuk fresh graduate dengan magang). |
| C06 | pdf_single | id | `S N` | Hanya organisasi mahasiswa (Himpunan Mahasiswa Teknik Sipil): bukan pengalaman kerja = NOT_DEMONSTRATED. |
| C07 | pdf_single | en | `N N` | Insinyur perangkat lunak: di luar bidang = NOT_DEMONSTRATED untuk durasi dan pendidikan. |
| C08 | docx_table2 | id | `N N` | Pemasaran: di luar bidang. |
| C09 | docx_para | id | `S S` | Judul 'Staff Teknik' ambigu; bulletnya (tulangan, bekisting, beton bertulang, pondasi, proyek gedung) menunjukkan pekerjaan sipil. Januari 2023 sampai Juni 2025 = 30 bulan. |
| C10 | pdf_inline | id | `S S` | Maret 2024 sampai Oktober 2026 = 32 bulan; 'pengawas lapangan' tidak ada di taksonomi lama. |
| C11 | docx_para | id | `N N` | JEBAKAN PRESISI: akuntan di kontraktor. Isinya menyebut konstruksi, gedung, jalan, proyek, tetapi pekerjaannya akuntansi, bukan pekerjaan sipil = NOT_DEMONSTRATED. |
| C12 | pdf_prose | id | `S S` | Dua pekerjaan tumpang tindih sepenuhnya: Jan 2024 sampai Des 2025 = 24 bulan, tidak dijumlahkan dua kali. |
