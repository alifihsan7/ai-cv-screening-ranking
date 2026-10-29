# Hasil Pengukuran: Jev (TypeSafe) vs LLM vs Aturan Murni

Pengukuran ini memakai TypeSafe Jev asli (`jev-latest`) dan gateway LLM lokal, pada golden dataset JD-01. Dokumen [BENCHMARK_JEV_VS_LLM.md](BENCHMARK_JEV_VS_LLM.md) mendeskripsikan sistem lama dan tidak dapat dibandingkan langsung dengan angka di sini.

- **Tanggal:** 29 Oktober 2026
- **Data:** 15 CV core × 10 kriteria JD-01 = 150 status, pembanding label `expected_JD-01.json` (label dibuat sebelum Jev ada)
- **Kode:** commit `d283da1` (semua mode); Mode 3 juga dijalankan pada `21d756d` (sebelum Tahap 3)
- **Cara menjalankan:** `python scripts/compare_engines.py --modes 1,2,3,4` (database tes lewat `DATABASE_URL`)
- **Batasan penting:** satu run per konfigurasi. Keterulangan Jev antar run belum diuji.

## 1. Akurasi status per kriteria

| Mode | Benar | Akurasi | Terlalu tinggi | Terlalu rendah |
|---|---|---|---|---|
| 1. Aturan murni | 132/150 | 88,0% | 6 | 12 |
| 2. Aturan + LLM | 127/150 | 84,7% | 3 | 20 |
| 3. Aturan + Jev (hybrid) | 132/150 | 88,0% | 5 | 13 |
| 3. sebelum Tahap 3 | 133/150 | 88,7% | – | – |
| 4. Jev penuh (semua kriteria) | 110/150 | 73,3% | 4 | 36 |

Yang diubah verifier dibanding aturan murni:

| Verifier | Status diubah | Diperbaiki | Dirusak | Netral / tetap salah |
|---|---|---|---|---|
| Jev (Mode 3) | 7 | 3 | 3 | 1 |
| LLM (Mode 2) | 8 | 0 | 5 | 3 |

Dengan selisih sekecil ini (±1 dari 150), Jev tidak terbukti menambah akurasi pada dataset ini.

## 2. Ranking

NDCG@5 = 0,925 dan NDCG@10 = 0,983 di keempat mode, dan top-5 beririsan 4/5 (80%). Kandidat S5 berada di peringkat 9 di keempat mode, termasuk aturan murni, sehingga penyebabnya ada di aturan atau ekstraksi, bukan di verifier.

## 3. Latensi dan biaya (terukur dari tabel `jev_calls`)

| | Panggilan | Token masuk / keluar | Latensi per panggilan (p50) | Biaya* |
|---|---|---|---|---|
| Mode 3 | 30 | 17.535 / 2.023 | ~335 ms | ~$0,0007 |
| Mode 3 sebelum Tahap 3 | 30 | 20.277 / 1.830 | ~324 ms | ~$0,0009 |
| Mode 4 | 150 | 140.675 / 13.397 | ~346 ms | ~$0,0059 |
| Mode 2 (LLM) | – | tidak terukur | p50 19,7 detik per CV (p95 32,3 detik) | tidak terukur |

\* Tarif input $0,042 per 1 juta token, token keluar gratis, sesuai konstanta di `compare_engines.py`.

Per CV (mencakup beberapa panggilan berurutan), Mode 3 p50 736 ms dan p95 1.415 ms.

## 4. Tahap 3: Jev menerima potongan bukti, bukan seluruh CV

Dari 150 kriteria, 149 hasilnya identik sebelum dan sesudah Tahap 3. Satu yang berbeda adalah M3.R5: aturan dan Jev lama menjawab PARTIAL (benar), Jev baru menjawab NOT_DEMONSTRATED (salah). Token masuk turun 14%. Karena satu run per versi, satu selisih ini belum dapat dibedakan dari variasi acak Jev.

## 5. Urutan kandidat seri

S1 dan S4 seri sempurna (skor 100, status identik), tetapi urutannya terbalik antar run karena pembeda terakhir memakai hash `run_id`. Pembeda diganti menjadi hash `candidate_id` saja, sehingga urutan kandidat seri tetap sama saat screening diulang. Dicakup oleh `test_tied_candidates_keep_the_same_order_across_runs`.

## 6. Keterbatasan dan hal yang belum diverifikasi

- **Tabel token dan biaya di keluaran `compare_engines.py` tidak akurat.** Skrip memakai konstanta per panggilan (Mode 3: 315/12, Mode 4: 320/15) dan perkiraan panjang teks untuk LLM, bukan hasil ukur. Gunakan angka dari `jev_calls` seperti di tabel di atas. Skripnya sendiri belum diperbaiki.
- **Hasil LLM kurang bisa dipercaya.** Latensinya melewati timeout 12 detik per panggilan, sehingga sebagian panggilan mungkin gagal dan diam-diam kembali ke status aturan. Belum diperiksa.
- **Keterulangan Jev belum diuji.** Uji ulang dihentikan atas keputusan pengguna.
- **Penyebab Mode 4 (73,3%) belum diketahui.** Mode 4 adalah pembanding, tidak dipakai di produksi.
