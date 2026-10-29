# Checkpoint 29 Oktober 2026: perbaikan integrasi Jev dan pengukuran

Ringkasan keadaan pekerjaan di branch `fix/jev-remediation` supaya bisa dilanjutkan dari titik ini tanpa riwayat percakapan. Rencana awalnya ada di [JEV_REMEDIATION_PLAN.md](JEV_REMEDIATION_PLAN.md), dan angka lengkapnya di [BENCHMARK_RESULTS_2026-10-29.md](../eval/BENCHMARK_RESULTS_2026-10-29.md).

## 0. Pembaruan sesudah versi pertama dokumen ini

Bagian di bawah ini ditulis sebelum langkah-langkah berikut; bila ada yang bertentangan, bagian 0 ini yang berlaku.

- **Hold-out kedua** dibangun dan diukur sebagai baseline (`ccb101d`): aturan murni 109/120, alur lengkap dengan Jev **116/120**. Lihat dokumen hasil. Pengaman "harus ada angka" untuk Jev (masalah terbuka nomor 1 di bawah) **dinilai berdampak kecil**: dari enam positif palsu ACHIEVEMENT dan LEADERSHIP di dua hold-out, ia hanya menangkap dua; penyebab dominan adalah domain yang salah (data, gudang, pemasaran, penjualan).
- **Nama dari nama file** diperbaiki (`e8ed52f`): nama file hanya boleh melengkapi nama dokumen bila ada kata yang sama.
- **Kebocoran nama kandidat** ditemukan dan diperbaiki dua lapis (belum di-commit saat catatan ini ditulis): sebelumnya 15 dari 54 CV membawa nama asli di teks "tersensor" dan 62 dari 63 verifikasi untuk CV itu akan mengirimnya ke Jev. Kini 0 dari 54 dan 0 dari 378. Akurasi netral. Penyebabnya: kotak "FOTO" di PDF dua kolom terbaca sebagai nama, serta email dan URL yang terpecah OCR pada PDF scan. Pengaman: sensor token email di seluruh teks, nama dicari lewat jangkar email, dan header dipotong dari bukti.
- **Koreksi atas klaim lama:** jaminan Tahap 1 ("hanya teks tersensor sampai ke Jev") tidak berlaku untuk dua kolom dan scan sampai perbaikan di atas; test sensor lama hanya memeriksa email dan telepon.
- **Nama file deskriptif** (`K09_platform_head_…`) pada set uji ternyata ikut memengaruhi deteksi nama; set uji kini diberi catatan itu.
- **Daftar pilihan berikutnya yang diperbarui:** (1) fitur spec yang belum ada: mahasiswa aktif maksimal PARTIAL (K08.R7) dan kedaluwarsa sertifikat (H10.R8); (2) ekstraksi: header sebaris "Judul di Perusahaan, Kota (tanggal)" (K10) menghasilkan judul = kota, dan tata letak "tanggal dulu" dengan dua pekerjaan atau lebih (H02); (3) kesadaran domain untuk Jev pada ACHIEVEMENT dan LEADERSHIP (empat positif palsu lintas set), idealnya dengan hold-out ketiga yang memuat jebakan domain; (4) Tahap 4, cache hasil Jev.

## 1. Status

- **Branch:** `fix/jev-remediation`, 21 commit di atas `main` (`639df75`). **Belum di-push dan belum menjadi PR.**
- **Working tree:** bersih (hanya folder `.claude/` yang tidak dilacak).
- **Test terakhir:** 348 passed, 3 skipped. Lint dan mypy tidak bertambah dibanding awal (mypy: 9 error lama di 3 file).
- **Rencana awal:** Tahap 1, 2, 3, 5, 6 selesai. Tahap 7 (pengukuran) sebagian besar selesai. **Tahap 4 (cache hasil Jev) belum dikerjakan.**

## 2. Yang sudah dikerjakan

| Tema | Commit | Isi singkat |
|---|---|---|
| Privasi | `9131e03`, `21d756d` | Teks CV disensor sebelum ke Jev; kemudian Jev hanya menerima entri pengalaman yang sudah disensor |
| Ambang confidence | `b444a05` | `VERIFIER_MIN_CONFIDENCE` (0,60): jawaban Jev yang ragu tidak menimpa status aturan |
| Validasi pengalaman | `21d756d` | Jev menilai tiap entri pengalaman (ya/tidak pengalaman kerja); entri ditolak diberi flag, tidak dihapus |
| Kutipan terhubung ke Jev | `2aee0fe` | Jev menilai tiap potongan bukti terpisah; kutipan diambil dari potongan penentu; teks CV lengkap tidak lagi dikirim |
| Pembersihan | `d283da1` | Hapus mock dari kode produksi dan monkeypatch SDK; satu pembaca konfigurasi TypeSafe |
| Urutan seri | `ba816ae` | Pembeda terakhir ranking memakai `candidate_id` saja, tidak lagi `run_id` |
| Token terukur | `48d96c9` | Token Jev diambil dari `Usage` API, bukan konstanta |
| Kutipan skill | `5a6528e` | Kutipan skill selalu memuat kata kunci yang cocok (sebelumnya dipotong 120 karakter pertama) |
| Bukti terstruktur | `9a60d04` | Bukti membawa jenis bagian CV (pekerjaan, proyek, daftar keahlian); skill dari proyek atau daftar keahlian maksimal PARTIAL |
| **Pembaca DOCX** | `8d96ad1` | Isi tabel DOCX kini terbaca; sebelumnya judul, perusahaan, dan tanggal di tabel hilang. Flag `EXPERIENCE_NOT_PARSED` dan `DOCX_TEXT_EXTRACTION_FAILED` |
| Jumlah bukti | `0935078`, `2814ce9` | `EVIDENCE_TOP_K` jadi pengaturan; default 3 diubah ke **8** |
| Aturan sesuai spec | `9a29a07` | EDUCATION `partial_fields` tidak dinaikkan oleh kata "terkait"; ACHIEVEMENT dari proyek atau domain berdekatan = PARTIAL |
| Alat ukur | `a029ceb`, `959fa1a`, `495a2f1`, `72a0184` | Skrip pengukur jalur produksi, percobaan pendapat kedua, set parafrase, set hold-out |
| Dokumen | `8b8cf13`, `1b8141e`, `71800ae`, `a08d4e1` | Dokumen benchmark lama ditandai usang; hasil terukur dicatat |

## 3. Angka kunci

Akurasi status per kriteria. "Alur lengkap" adalah jalur produksi dengan Jev asli (8 potongan bukti).

| Set | Aturan murni | Alur lengkap | Catatan |
|---|---|---|---|
| Golden, 15 CV × 10 | 132 → 143 → **149**/150 | 134 → 143 → 144 → **150**/150 | Alur lengkap: 135 setelah bukti terstruktur, 143 setelah perbaikan DOCX, 144 dengan 8 potongan, 150 setelah perbaikan aturan |
| Parafrase, 15 CV × 10 | 127 → **130**/150 | 138 → 143 → **146**/150 | Uji stres recall: 31 bullet ditulis ulang dengan kata lain |
| Hold-out, 12 CV × 10 | 112 → 114/120 | 114 → **115**/120 | Hanya informasi; sebagian tidak lagi bersih |

**Cara membacanya dengan jujur:**
- Perbaikan terbesar berasal dari **ekstraksi DOCX** (132 → 143), bukan dari Jev. Setelah itu, Jev di golden hampir tidak mengubah apa pun.
- Nilai Jev terlihat jelas di **set parafrase** (aturan murni 130 → alur lengkap 146): saat kata di CV tidak cocok dengan kamus aturan, Jev memulihkan sebagian besar.
- **150/150 di golden bukan bukti kualitas umum.** Set itu diamati berkali-kali dan perbaikannya dirancang dari kegagalannya. Hold-out lebih mendekati kenyataan: 115/120.
- Biaya satu pengukuran penuh sekitar $0,007 sampai $0,013 (sekitar 200 panggilan, 60 detik untuk 15 CV). Aturan murni 0,1 detik.

## 4. Eksperimen yang ditolak (jangan diulang tanpa alasan baru)

- **Pendapat kedua Jev pada klaim STRONG dari aturan:** bersih −10 (primitive produksi) dan −3 (Choice generik) pada 57 klaim. Jev menurunkan STRONG skill yang benar karena rubriknya menilai kedalaman keahlian. Skrip: `scripts/eval_second_opinion.py`.
- **Primitive ACHIEVEMENT lain** (Choice generik, dan pertanyaan sesuai definisi spec): masing-masing bersih −1, di bawah syarat +2. Sisa kesalahan ada di confidence 0,58 sampai 0,64 (dekat ambang) dan pembacaan harfiah "di bidang backend".
- **Batas syarat penerimaan:** perubahan diterima hanya bila lebih banyak memperbaiki daripada merusak pada pengukuran, dengan syarat ditetapkan sebelum melihat hasil.

## 5. Masalah yang masih terbuka

1. **Jev menaikkan ACHIEVEMENT tanpa dasar.** Di hold-out, H04.R9 dan H09.R9 dinilai PARTIAL padahal CV tidak memuat satu angka hasil pun; H06.R9 dinaikkan dari PARTIAL (benar) ke STRONG. Calon perbaikan: pengaman kode, "Jev tidak boleh menaikkan ACHIEVEMENT dari NOT_DEMONSTRATED kecuali kutipan memuat angka". Tidak menutup kasus H06.R9.
2. **Parser pengalaman gagal pada tata letak "tanggal dulu, baru judul"** (umum pada CV bertabel): judul pekerjaan terbaca salah tanpa peringatan (H02). Akurasi tidak terganggu pada kasus itu, datanya keliru.
3. **Sertifikat kedaluwarsa tidak ditangani** (`eval_certification` tidak punya logika kedaluwarsa, padahal spec mensyaratkan PARTIAL). Dampak kecil: R8 berbobot 5 dari 100, setara sekitar 2,5 poin skor. Ditunda; Anda bertanya manfaatnya dan belum memutuskan.
4. **Jev tidak sepenuhnya deterministik.** Jawaban di sekitar confidence 0,6 berubah antar run pada input yang sama. Inilah alasan **Tahap 4 (cache)**, dengan ambang simpan lebih tinggi dari ambang keputusan (misalnya 0,80), opsi `refresh`, flag `JEV_CACHED`, dan versi prompt dan model di kunci cache. Belum dikerjakan.
5. **Pencarian bukti di alur screening** hanya mencocokkan kata dengan deskripsi kriteria; cabang pgvector (embedding multibahasa) tidak pernah dipakai karena konteksnya tidak membawa `profile_id` dan `tenant_id`.
6. **Flag `LOW_CONFIDENCE` menyesatkan:** sebenarnya berarti "Jev yakin tidak ada bukti" (confidence Jev tinggi). Usul nama: `NO_EVIDENCE_FOUND`.
7. **DOCX yang belum ditangani:** kotak teks, header/footer, `.doc` lama. Teks DOCX di sanitizer (untuk `full_text_redacted`) masih satu baris panjang.
8. **Label hold-out belum ditinjau manusia.** Ditulis dari spec oleh asisten yang juga mengerjakan sistemnya, jadi bukan wasit independen. Kasus yang perlu perhatian: H05.R9.
9. **Sisa kesalahan aturan murni di golden:** hanya M3.R10 (LEADERSHIP di organisasi); Jev memperbaikinya, sehingga alur lengkap 150/150.

## 6. Kesepakatan kerja

- **Set hold-out hanya untuk mengukur.** Jangan menyetel aturan, prompt, ambang, atau pengaturan terhadapnya. Bila sistem tidak setuju dengan label, tinjau kasusnya; keduanya bisa salah. Bila hold-out pernah dipakai menyetel, buat yang baru (rencana: hold-out kedua).
- **Golden dataset adalah wasit:** label tidak boleh diubah agar test lulus (aturan #8 di `CLAUDE.md`).
- **Terima perubahan hanya dengan bukti** dari pengukuran, dengan syarat penerimaan ditulis lebih dulu.
- **Commit tanpa baris `Co-Authored-By`.**
- **Panggilan ke API Jev berbayar:** jalankan hanya bila bagian dari tugas yang disetujui; test otomatis tidak memanggil API sungguhan (kunci dikosongkan oleh `tests/conftest.py` kecuali `RUN_LIVE_JEV=1`).
- **Nama "agent":** `ScreeningAgent` sebenarnya alur bertahap tetap, bukan agent otonom (hanya Jev yang memakai model). Penggantian nama kode **ditunda dan belum diputuskan**. Pilihan cakupan: internal saja (nilai DB `react_agent` dan field API `use_agent` dipertahankan), hanya istilah di dokumen, atau penuh termasuk DB dan API (butuh migrasi). Calon nama: `ScreeningWorkflow`, `EvidencePipeline`, `CandidateEvaluator`.

## 7. Langkah berikutnya (menunggu keputusan)

1. **Hold-out kedua** (12 CV baru, tata letak dan kasus berbeda, termasuk CV tanpa angka hasil dan angka di domain berbeda). Prasyarat bagi pengukuran bersih berikutnya. Label perlu ditinjau manusia.
2. **Pengaman angka hasil untuk Jev pada ACHIEVEMENT** (masalah terbuka nomor 1), diukur pada hold-out kedua serta golden dan parafrase untuk memeriksa regresi.
3. **Tahap 4, cache hasil Jev** (masalah terbuka nomor 4).
4. Opsional: parser "tanggal dulu" (nomor 2), sertifikat kedaluwarsa (nomor 3), ganti nama flag `LOW_CONFIDENCE` (nomor 6), keputusan penggantian nama "agent".
5. **Push dan PR:** ringkasan 21 commit untuk deskripsi PR bisa disiapkan; tidak ada yang dikirim tanpa instruksi.

## 8. Cara mengulang pengukuran

Semua perintah dijalankan dari root repo. Database tes sudah ada di `.env` tetapi tidak dimuat otomatis, jadi diekspor dulu:

```bash
export TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)"
pytest -q                                   # test otomatis, tanpa API sungguhan

export DATABASE_URL="$TEST_DATABASE_URL"    # telemetri jev_calls ke database tes, bukan database aplikasi

# Alur produksi dengan Jev asli (live, sekitar $0,01)
python scripts/eval_agent_path.py --output-json out/golden.json
python scripts/eval_agent_path.py --cvs-dir docs/eval/paraphrase_set/cvs/core \
  --labels docs/eval/paraphrase_set/labels/expected_JD-01.json --output-json out/para.json
python scripts/eval_agent_path.py --cvs-dir docs/eval/holdout_set/cvs/core \
  --labels docs/eval/holdout_set/labels/expected_JD-01.json --output-json out/hold.json

python scripts/eval_agent_path.py --mock-jev --output-json out/rules.json   # hanya aturan murni, gratis; BUKAN pengukuran Jev
```

CV set parafrase dan hold-out (PDF dan DOCX diabaikan git) dibangun ulang dengan:

```bash
python scripts/build_paraphrase_set.py
python scripts/build_holdout_set.py
```

Pengaturan yang relevan di `.env`: `VERIFIER_MIN_CONFIDENCE` (0,60), `EVIDENCE_TOP_K` (8), `TYPESAFE_API_KEY`, `SCORING_MODE=jev_hybrid`.

## 9. Peta file baru

| File | Fungsi |
|---|---|
| `src/domain/evidence_chunks.py` | Menyusun bukti per bagian CV untuk pencarian |
| `src/worker/docx_text.py` | Membaca isi DOCX berurutan, termasuk tabel |
| `src/infrastructure/typesafe.py` | Satu sumber konfigurasi koneksi TypeSafe |
| `scripts/eval_agent_path.py` | Mengukur alur produksi pada satu set CV |
| `scripts/eval_second_opinion.py` | Percobaan pendapat kedua Jev (ditolak) |
| `scripts/build_paraphrase_set.py`, `docs/eval/paraphrase_set/` | Set uji stres recall |
| `scripts/build_holdout_set.py`, `docs/eval/holdout_set/` | Set hold-out |
| `tests/test_evidence_chunks.py`, `test_docx_text.py`, `test_rules_spec_alignment.py`, `test_typesafe_config.py` | Test untuk perubahan di atas |

File hasil mentah pengukuran (JSON) ada di folder sementara sesi dan tidak masuk repo; angka yang penting sudah tercatat di dokumen hasil.
