# Dokumentasi

| Folder / berkas | Isi |
|---|---|
| [`spec/`](spec/) | Spesifikasi produk. Inti (milik Muhammad Rifqi Setiawan): `00` sampai `09`, [`DECISIONS.md`](spec/DECISIONS.md) (keputusan D1 sampai D22), [`02_SCORING_RUBRIC_SPEC.md`](spec/02_SCORING_RUBRIC_SPEC.md) (aturan skor). Dokumen arsitektur dan perbandingan (milik Alif Ihsan) memuat catatan status karena sebagian klaimnya berbeda dari sistem yang terukur. `golden_dataset/` adalah wasit, label tidak boleh diubah |
| [`eval/`](eval/README.md) | Set uji tambahan, hasil ukur ([`BENCHMARK_RESULTS_2026-10-29.md`](eval/BENCHMARK_RESULTS_2026-10-29.md) adalah acuan), dan aturan pakainya |
| [`plan/`](plan/) | Keadaan terkini ([`CHECKPOINT_2026-10-29.md`](plan/CHECKPOINT_2026-10-29.md)) dan rencana perbaikan Jev |
| [`research/`](research/) | Riset dan latar belakang arsitektur; bukan acuan implementasi |
| [`archive/`](archive/README.md) | Catatan perencanaan lama yang disimpan untuk riwayat |
| [`DEPLOYMENT_AND_RUNBOOK.md`](DEPLOYMENT_AND_RUNBOOK.md) | Deploy, backup, restart, pemrosesan ulang, dan pembersihan data pribadi |
| [`TAXONOMY.md`](TAXONOMY.md) | Cara memperluas taksonomi (peran, keahlian, alias bidang, daftar kata domain) |
| [`ANSWERS.md`](ANSWERS.md) | Hasil eksekusi M0 sampai M3 (audit VPS, jawaban atas pertanyaan di `spec/09_QUESTIONS_FOR_AGENT.md`), tanggal 9 Oktober; sebagian sudah usang |

## Membangun ulang PDF

Sumber dokumen adalah `.md`; `.typ` dan `.pdf` dihasilkan darinya. Perlu `pandoc` dan modul Python `typst` (`.venv/bin/pip install typst`).

| Dokumen | Perintah | Keadaan |
|---|---|---|
| `spec/CETAK_BIRU_ARSITEKTUR_SISTEM_JEV` | `python scripts/compile_blueprint_pdf.py` | Berhasil. `.typ` tidak dilacak git (dihasilkan) |
| `spec/PROPOSAL_ARSITEKTUR_SISTEM_JEV` | `python scripts/compile_proposal_pdf.py` | Berhasil. `.typ` tidak dilacak git (dihasilkan) |
| `spec/PRODUCT_ARCHITECTURE_SPECIFICATION` | `python scripts/compile_spec_pdf.py` | **Rusak** sejak sebelum 29 Okt (Typst: `unclosed delimiter`, pada `.md` asli juga). `.typ` yang dilacak dipertahankan karena tidak bisa dibangun ulang |
| `research/SYSTEM_ARCHITECTURE_RESEARCH_MEMO` | `python scripts/generate_research_pdf.py` | Berjalan, tetapi hasilnya menjadikan 3 baris header `UNTRUSTED_AGENT_OUTPUT` sebagai judul; `.typ` yang dilacak dipertahankan |
| `research/AI_CV_SCREENER_RESEARCH_REPORT` | `python scripts/build_pdf_report.py` | Membaca `/tmp/body_raw.typ` dari langkah pandoc manual yang tidak tercatat |
| `spec/KOMPARASI_*` | tidak ada skrip | `.typ` yang dilacak adalah sumbernya |
