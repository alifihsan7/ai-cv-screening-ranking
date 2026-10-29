# Hasil Pengukuran: Jev (TypeSafe) vs LLM vs Aturan Murni

Pengukuran ini memakai TypeSafe Jev asli (`jev-latest`) dan gateway LLM lokal, pada golden dataset JD-01. Dokumen [BENCHMARK_JEV_VS_LLM.md](BENCHMARK_JEV_VS_LLM.md) mendeskripsikan sistem lama dan tidak dapat dibandingkan langsung dengan angka di sini.

- **Tanggal:** 29 Oktober 2026
- **Data:** 15 CV core × 10 kriteria JD-01 = 150 status, pembanding label `expected_JD-01.json` (label dibuat sebelum Jev ada)
- **Kode:** commit `d283da1` (semua mode); Mode 3 juga dijalankan pada `21d756d` (sebelum Tahap 3)
- **Cara menjalankan:** `python scripts/compare_engines.py --modes 1,2,3,4` (database tes lewat `DATABASE_URL`)
- **Batasan penting:** satu run per konfigurasi, kecuali Mode 3 yang dijalankan beberapa kali (lihat bagian 4 dan 6).

## 1. Akurasi status per kriteria

| Mode | Benar | Akurasi | Terlalu tinggi | Terlalu rendah |
|---|---|---|---|---|
| 1. Aturan murni | 132/150 | 88,0% | 6 | 12 |
| 2. Aturan + LLM | 127/150 | 84,7% | 3 | 20 |
| 3. Aturan + Jev (hybrid) | 132/150 | 88,0% | 5 | 13 |
| 3. sebelum Tahap 3 | 133/150 | 88,7% | – | – |
| 3. setelah perbaikan kutipan skill | 134/150 | 89,3% | – | – |
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

Token Jev kini diambil dari `Usage` yang dikembalikan API dan dibawa di `VerifierDecision`, sehingga keluaran `compare_engines.py` cocok dengan `jev_calls` (diverifikasi pada Mode 3: 17.535 masuk, 2.023 keluar, $0,00074). Token Mode 2 tetap perkiraan karena gateway LLM tidak melaporkan pemakaian, dan ditandai `~` di keluaran skrip.

Per CV (mencakup beberapa panggilan berurutan), Mode 3 p50 736 ms dan p95 1.415 ms.

## 4. Tahap 3: Jev menerima potongan bukti, bukan seluruh CV

Dari 150 kriteria, 149 hasilnya identik sebelum dan sesudah Tahap 3. Satu yang berbeda adalah M3.R5: aturan dan Jev lama menjawab PARTIAL (benar), Jev baru menjawab NOT_DEMONSTRATED (salah). Token masuk turun 14%. Dua run Mode 3 sesudah Tahap 3 sama-sama menghasilkan M3.R5 = NOT_DEMONSTRATED, jadi selisihnya konsisten.

**Penyebabnya bug lama di pemilihan kutipan aturan, bukan penilaian Jev.** `eval_skill` memotong kutipan proyek, ringkasan, dan pengalaman pada 120 karakter pertama. Untuk M3 kalimat "…dan Docker" ada setelah karakter ke-120, sehingga Jev menerima potongan tanpa kata Docker dan menjawab NOT_DEMONSTRATED. Sebelum Tahap 3 bug ini tertutupi karena Jev juga diberi seluruh teks CV. Audit 32 kutipan skill di golden dataset menemukan hanya 1 yang kehilangan kata kuncinya (M3.R5).

**Perbaikan:** kutipan kini selalu memuat kata kunci yang cocok. Hasilnya M3.R5 = PARTIAL (benar) dan akurasi Mode 3 naik ke 134/150. Mode 1 (aturan murni) tidak berubah: 132/150, grounding 66/80, ranking sama. Pola potong 120 karakter yang sama masih ada di sekitar 19 titik lain di `kind_rules.py` (tanggung jawab, pendidikan, pencapaian, kepemimpinan); belum terbukti merusak dan tidak diubah.

## 5. Urutan kandidat seri

S1 dan S4 seri sempurna (skor 100, status identik), tetapi urutannya terbalik antar run karena pembeda terakhir memakai hash `run_id`. Pembeda diganti menjadi hash `candidate_id` saja, sehingga urutan kandidat seri tetap sama saat screening diulang (S1 lalu S4 pada run Mode 3 kedua). Dicakup oleh `test_tied_candidates_keep_the_same_order_across_runs`.

## 6. Keterbatasan dan hal yang belum diverifikasi

- **Token Mode 2 (LLM) hanya perkiraan** berdasarkan panjang teks. Angka Jev sudah terukur. Run bagian 1 dan 3 dibuat sebelum skrip diperbaiki, sehingga tabel token di keluaran lamanya (Mode 3: 9.450, Mode 4: 48.000) tidak dipakai; angka di dokumen ini berasal dari `jev_calls`.
- **Hasil LLM kurang bisa dipercaya.** Latensinya melewati timeout 12 detik per panggilan, sehingga sebagian panggilan mungkin gagal dan diam-diam kembali ke status aturan. Belum diperiksa.
- **Jev tidak sepenuhnya deterministik.** Tiga run Mode 3 berturut-turut menghasilkan status identik, tetapi run keempat mengubah M2.R9 dari STRONG ke PARTIAL padahal potongan bukti yang dikirim identik (kriteria ACHIEVEMENT tidak tersentuh perbaikan kutipan; dicek pada kode lama dan baru). Satu kriteria dari 150, dan kebetulan ke arah yang benar, tetapi artinya hasil Jev bisa berubah antar run. Ini alasan cache hasil Jev (Tahap 4) diperlukan. Mode 2 dan Mode 4 tidak diulang.
- **Kutipan dari daftar keahlian bisa terlalu pendek** (S5.R6: "AWS", 3 karakter, di bawah batas minimal 5 karakter untuk grounding). Masalah lama, belum ditangani.
- **Penyebab Mode 4 (73,3%) belum diketahui.** Mode 4 adalah pembanding, tidak dipakai di produksi.
