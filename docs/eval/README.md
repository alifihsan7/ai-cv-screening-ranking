# Evaluasi: set uji, hasil ukur, dan aturannya

Folder ini memuat set uji tambahan di luar golden dataset (`docs/spec/golden_dataset/`), hasil pengukuran, dan panduan pelabelan. Semua CV di sini **fiktif** (bukan data pribadi).

## Set uji

| Set | CV | Tujuan | Cara membangun |
|---|---|---|---|
| Golden (`docs/spec/golden_dataset/`) | 15 inti + 9 edge case | **Wasit.** Label tidak boleh diubah agar test lulus (aturan #8 di `CLAUDE.md`) | sudah ada |
| [`paraphrase_set/`](paraphrase_set/README.md) | 15 (S1 sampai I5) | Uji stres recall: CV golden dengan 31 bullet ditulis ulang dengan kata lain, fakta tetap | `python scripts/build_paraphrase_set.py` |
| [`holdout_set/`](holdout_set/README.md) | 12 (H01 sampai H12) | Hold-out 1: tata letak dan bahasa yang berbeda dari golden | `python scripts/build_holdout_set.py` |
| [`holdout_set_2/`](holdout_set_2/README.md) | 12 (K01 sampai K12) | Hold-out 2: tata letak baru (tabel dua kolom, header sebaris, tahun saja) dan jebakan ACHIEVEMENT | `python scripts/build_holdout2_set.py` |
| [`holdout_set_3/`](holdout_set_3/README.md) | 12 (L01 sampai L12) | Hold-out 3: jebakan **domain** pada ACHIEVEMENT dan LEADERSHIP (penjualan, pemasaran, logistik, produk, data, QA) | `python scripts/build_holdout3_set.py` |

PDF dan DOCX hasil bangun diabaikan git (`.gitignore`), jadi set harus dibangun ulang dengan skrip di atas sebelum dipakai.

## Aturan pakai

- **Hold-out hanya untuk mengukur.** Jangan menyetel aturan, prompt, ambang, atau pengaturan terhadapnya. Bila sistem tidak setuju dengan label, tinjau kasusnya; keduanya bisa salah. Bila sebuah set pernah dipakai menyetel (sel-selnya ikut membentuk perbaikan), set itu tidak lagi bersih untuk sel tersebut: hold-out 3 sudah seperti itu untuk L04.R10, L06.R10, dan L12.
- **Label ketiga hold-out ditulis dari spec oleh asisten yang juga mengerjakan sistemnya,** bukan wasit independen. Perlu ditinjau manusia (lihat kolom catatan di README tiap set; perhatikan H05.R9).
- **Terima perubahan hanya dengan bukti pengukuran,** dengan syarat penerimaan ditulis lebih dulu.
- Panduan memberi label: [`LABELING_GUIDE.md`](LABELING_GUIDE.md).

## Mengukur

```bash
export TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)"
export DATABASE_URL="$TEST_DATABASE_URL"        # telemetri jev_calls ke database tes

# hanya aturan (gratis, 0,1 detik); BUKAN pengukuran Jev
python scripts/eval_agent_path.py --mock-jev --cvs-dir docs/eval/holdout_set/cvs/core \
  --labels docs/eval/holdout_set/labels/expected_JD-01.json --output-json out.json

# alur produksi dengan Jev asli (berbayar, sekitar $0,01 per set)
python scripts/eval_agent_path.py --cvs-dir docs/eval/holdout_set/cvs/core \
  --labels docs/eval/holdout_set/labels/expected_JD-01.json --output-json out.json
```

Golden dijalankan tanpa `--cvs-dir` dan `--labels`. Jev tidak sepenuhnya deterministik, jadi dua run Jev bisa berbeda satu atau dua sel; bandingkan aturan murni untuk memeriksa regresi, dan jangan menarik kesimpulan dari satu sel pada satu run.

## Hasil

- [`BENCHMARK_RESULTS_2026-10-29.md`](BENCHMARK_RESULTS_2026-10-29.md): angka per set, kesalahan yang tersisa, dan percobaan yang ditolak. **Acuan yang berlaku.**
- [`BENCHMARK_JEV_VS_LLM.md`](BENCHMARK_JEV_VS_LLM.md): dokumen historis (usang). Mengukur sistem lama berbasis aturan, bukan Jev asli; tabel metriknya jangan dipakai sebagai acuan.
