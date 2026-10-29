# Hasil Pengukuran: Jev (TypeSafe) vs LLM vs Aturan Murni

Pengukuran ini memakai TypeSafe Jev asli (`jev-latest`) dan gateway LLM lokal, pada golden dataset JD-01. Dokumen [BENCHMARK_JEV_VS_LLM.md](BENCHMARK_JEV_VS_LLM.md) mendeskripsikan sistem lama dan tidak dapat dibandingkan langsung dengan angka di sini.

- **Tanggal:** 29 Oktober 2026
- **Data:** 15 CV core × 10 kriteria JD-01 = 150 status, pembanding label `expected_JD-01.json` (label dibuat sebelum Jev ada)
- **Kode:** bagian 1 sampai 6 pada commit `d283da1` (semua mode; Mode 3 juga pada `21d756d`, sebelum Tahap 3); bagian pembaruan pada commit berikutnya
- **Cara menjalankan:** `python scripts/compare_engines.py --modes 1,2,3,4` (database tes lewat `DATABASE_URL`)
- **Batasan penting:** satu run per konfigurasi, kecuali Mode 3 yang dijalankan beberapa kali (lihat bagian 4 dan 6).

## Pembaruan: ekstraksi DOCX, jalur produksi, dan pendapat kedua Jev

> Bagian 1 sampai 6 di bawah diukur dengan skrip `compare_engines.py` **sebelum** perbaikan ekstraksi DOCX. Angka terkini ada di bagian ini.

**Akar kesalahan terbesar ada di ekstraksi, bukan di Jev.** Tiga CV golden berformat DOCX (S5, M4, I2) menghasilkan 0 pengalaman terparse, karena judul pekerjaan, perusahaan, dan tanggal berada di dalam tabel, sedangkan ekstraktor hanya membaca paragraf. Pembaca DOCX baru (`src/worker/docx_text.py`) membaca isi dokumen sesuai urutan, termasuk tabel. Kegagalan membaca DOCX kini dilaporkan (`DOCX_TEXT_EXTRACTION_FAILED`), dan bagian pengalaman yang tidak menghasilkan entri diberi flag `EXPERIENCE_NOT_PARSED`.

| JD-01, 15 CV × 10 kriteria | Sebelum | Sesudah |
|---|---|---|
| Aturan murni | 132/150 (88,0%) | **143/150 (95,3%)**, 11 diperbaiki, 0 dirusak |
| NDCG@5 | 0,925 | **1,000** (top-5 persis S1 sampai S5) |
| Peringkat S5 (acuan: 4) | 9 | 3 |

**Jalur produksi dengan Jev asli** (`scripts/eval_agent_path.py`, meniru `screening_service`: validasi pengalaman saat ingest, loop pencarian dan verifikasi, lalu skor dan ranking):

| Konfigurasi | Akurasi | Dibanding aturan murni |
|---|---|---|
| Awal | 134/150 | 4 diperbaiki, 2 dirusak |
| Bukti terstruktur dengan jenis bagian CV | 133/150 | 2 diperbaiki, 1 dirusak |
| + bukti dibatasi per potongan sebelum memilih potongan penentu | 135/150 | 3 diperbaiki, 0 dirusak |
| + ekstraksi DOCX diperbaiki | **143/150** | **0 diubah** (sama dengan aturan murni) |

Pada pengukuran terakhir Jev memutuskan hanya 5 dari 150 kriteria dan tidak mengubah satu pun status. Biayanya 203 panggilan, 170.281 token masuk (sekitar $0,007), 59,7 detik untuk 15 CV (p50 3,3 detik per CV), dibanding 0,1 detik untuk aturan murni. **Pada golden dataset ini Jev tidak terbukti menambah akurasi.**

Flag `LOW_CONFIDENCE` pada 53 kriteria menyesatkan: confidence Jev tinggi (rata-rata 0,99), tetapi sekitar 147 dari 160 jawaban verifikasi adalah "tidak ditemukan bukti". Loop berhenti setelah 3 siklus lalu kembali ke status aturan. Pencarian bukti di loop ini juga tidak pernah memakai pgvector (konteksnya tidak membawa `profile_id` dan `tenant_id`), hanya pencocokan token kata.

**7 kesalahan yang tersisa semuanya diputuskan aturan, tidak ada yang melewati Jev:** 4 ACHIEVEMENT (M2.R9, M3.R9, S3.R9, S5.R9: STRONG, seharusnya PARTIAL), 2 EDUCATION (M2.R7, S4.R7: STRONG, seharusnya PARTIAL), 1 LEADERSHIP (M3.R10).

### Pendapat kedua Jev pada klaim STRONG dari aturan: ditolak

`scripts/eval_second_opinion.py` menguji kebijakan "jika Jev yakin (confidence minimal 0,60) bukti tidak sekuat STRONG, turunkan ke PARTIAL, tidak lebih rendah" pada semua 57 klaim STRONG dari aturan (aturan salah pada 6 di antaranya):

| Cara bertanya | Diperbaiki | Dirusak | Bersih |
|---|---|---|---|
| Primitive produksi (Score untuk skill dan pencapaian) | 2 | 12 | **−10** |
| Choice generik (STRONG/PARTIAL/NOT_DEMONSTRATED) | 2 | 5 | **−3** |

Jev menurunkan STRONG skill yang sebenarnya benar (10 dari 29 klaim dengan Score, 4 dengan Choice): rubriknya menilai kedalaman keahlian, sedangkan label menilai keberadaan skill di pekerjaan bertanggal. Pada EDUCATION Jev tidak membantu (confidence 0,5 pada kedua kesalahan). Satu-satunya hasil positif adalah ACHIEVEMENT dengan Choice generik (2 diperbaiki, 0 dirusak dari 9 klaim). Itu subkelompok yang dipilih setelah melihat hasil, kedua perbaikannya berada di confidence 0,64 dan 0,66 (dekat ambang 0,60), dan bobot R9 kecil, sehingga tidak diterapkan.

### Set uji parafrase: di sinilah Jev terbukti berguna

Golden dataset terlalu mudah bagi aturan (143/150), sehingga nilai Jev tidak terlihat. `scripts/build_paraphrase_set.py` membangun `docs/eval/paraphrase_set/`: 15 CV yang sama dengan 31 bullet ditulis ulang. Fakta, skill, tanggal, dan tata letak tidak berubah, hanya kata kerja dan satuannya (misalnya "Memimpin tim … mentoring" menjadi "Mengarahkan … pendampingan teknis", "60%" menjadi "60 persen", "Built" menjadi "Engineered"). Maknanya tetap, sehingga label golden berlaku apa adanya. Setiap pasangan kalimat tercatat di `docs/eval/paraphrase_set/README.md`. **Ini uji stres recall yang sengaja menarget celah kosakata aturan, bukan sampel CV nyata.**

| Set parafrase, 15 CV × 10 kriteria | Akurasi |
|---|---|
| Aturan murni | 127/150 (84,7%), turun dari 143 |
| Jalur produksi dengan Jev asli | **138/150 (92,0%)**: 12 diperbaiki, 1 dirusak |

Per jenis kriteria (aturan murni → dengan Jev): RESPONSIBILITY 7/15 → 14/15, ACHIEVEMENT 5/15 → 8/15, LEADERSHIP 12/15 → 13/15, sisanya tidak berubah. Jev memutuskan 18 kriteria dengan 224 panggilan, 192.462 token masuk, sekitar $0,008, dan 66,6 detik untuk 15 CV.

**12 kesalahan yang tersisa:** 5 sudah ada sejak golden dataset (M2.R7, S4.R7, M3.R9, M3.R10, S5.R9). Dari 7 yang baru, **5 terjadi karena bukti tidak pernah sampai ke Jev**: pencarian memakai kecocokan token kata dengan deskripsi kriteria, sehingga kalimat yang relevan tidak masuk 3 teratas (M1.R9, S1.R9, S4.R9, M4.R9, M4.R10). Penyebabnya antara lain kueri berbahasa Indonesia terhadap bullet berbahasa Inggris (skor 0), dan blok teks panjang yang ikut terambil karena memuat banyak kata umum. Satu lagi Jev terlalu rendah (S2.R9: PARTIAL, seharusnya STRONG), dan satu terlalu tinggi (M2.R2: STRONG untuk "API internal sederhana", sedangkan aturan lama mengenali kata "internal sederhana" sebagai PARTIAL).

Kesimpulan: dengan bukti yang sampai kepadanya, Jev memulihkan sebagian besar kriteria yang meleset dari kosakata aturan. Hambatan berikutnya adalah pencarian bukti, bukan penilaian Jev.

### Jumlah potongan bukti per siklus (`EVIDENCE_TOP_K`)

Kesimpulan di atas mengarah ke pencarian bukti, jadi jumlah potongan yang dikirim ke Jev per siklus dibuat menjadi pengaturan `EVIDENCE_TOP_K` (default tetap 3) dan diuji dengan 8. Nilai 8 ditentukan sebelum pengukuran, satu nilai saja, bukan hasil menyisir beberapa angka.

| | 3 potongan | 8 potongan |
|---|---|---|
| Golden | 143/150 (Jev memutuskan 5, mengubah 0) | **144/150** (Jev memutuskan 8; 1 diperbaiki, 0 dirusak) |
| Set parafrase | 138/150 | **143/150** (17 diperbaiki, 1 dirusak) |
| Token masuk, golden / parafrase | 170 ribu / 192 ribu | 266 ribu / 311 ribu (naik 56 sampai 62%) |
| Biaya per 15 CV, golden / parafrase | $0,007 / $0,008 | $0,011 / $0,013 |
| Waktu 15 CV | 60 / 67 detik | 59 / 68 detik |

Tidak ada regresi pada golden. Perbaikan golden adalah M3.R10 (NOT_DEMONSTRATED menjadi PARTIAL, benar), kesalahan yang selama ini tidak terjangkau karena bukti kepemimpinan magang tidak masuk 3 teratas. Pada set parafrase, LEADERSHIP pulih penuh (15/15) dan ACHIEVEMENT naik ke 11/15. Jumlah panggilan hampir sama, jadi waktu tidak berubah; yang naik hanya token per panggilan.

Tujuh kesalahan tersisa pada set parafrase: M2.R2 (Jev terlalu tinggi pada "API internal sederhana"), M2.R7 dan S4.R7 (EDUCATION, keputusan aturan), M3.R9 (aturan terlalu tinggi), serta M4.R9, S1.R9, S5.R9 (ACHIEVEMENT yang tetap dinilai NOT_DEMONSTRATED). Dugaan untuk yang terakhir: primitive Score untuk ACHIEVEMENT menilai "kedalaman keahlian", bukan "pencapaian terukur", sehingga tidak cocok; belum diuji. Nilai 8 hanyalah satu titik; optimum antara 5 dan 12 belum diukur.

### Keterbatasan pembaruan ini

- Dataset kecil (15 CV) dan sudah berkali-kali diamati. Perbaikan di atas tidak boleh dibaca sebagai estimasi akurasi pada CV nyata.
- Golden dataset ditulis dengan kata yang dikenali taksonomi aturan, jadi kemungkinan terlalu mudah untuk menunjukkan nilai Jev (pemahaman bahasa di luar kamus aturan). Hal itu diuji pada set parafrase di bawah.
- Hanya 3 contoh DOCX. Kotak teks, header/footer, dan file `.doc` lama belum ditangani.
- Teks DOCX di sanitizer (untuk `full_text_redacted`) masih berupa satu baris panjang.

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
