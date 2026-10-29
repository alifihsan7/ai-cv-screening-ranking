# Checkpoint 29 Oktober 2026: Jev, CV nyata, dan keadaan akhir

Keadaan pekerjaan di akhir hari, supaya bisa dilanjutkan tanpa riwayat percakapan. Rencana awalnya ada di [JEV_REMEDIATION_PLAN.md](JEV_REMEDIATION_PLAN.md), angka lengkap di [BENCHMARK_RESULTS_2026-10-29.md](../eval/BENCHMARK_RESULTS_2026-10-29.md), dan keputusan desain di [DECISIONS.md](../spec/DECISIONS.md) (D16 sampai D22). Dokumen ini menggantikan versi sebelumnya yang berisi tambalan "bagian 0".

## 1. Status

- **`main` (GitHub)** sudah memuat seluruh pekerjaan: branch `fix/jev-remediation` (44 commit) di-merge bertahap lewat PR #1 sampai #4; merge terakhir `a474905` (PR #4) sudah memuat commit terakhir `5ec3bbf`.
- **Branch `chore/repo-cleanup`** (lokal, belum di-push): bersih-bersih dokumen dan skrip, tanpa perubahan kode.
- **Test:** 424 lulus, 3 dilewati. Ruff dan mypy tidak bertambah dibanding awal (sekitar 105 temuan ruff dan 9 error mypy yang lama masih ada).
- **Rencana awal:** Tahap 1, 2, 3, 5, 6, 7 selesai. **Tahap 4 (cache hasil Jev) belum dikerjakan**, sengaja diletakkan paling akhir.

## 2. Yang sudah dikerjakan

| Tema | Commit | Isi singkat |
|---|---|---|
| Privasi ke Jev | `9131e03`, `21d756d`, `2aee0fe` | Teks CV disensor sebelum ke Jev; Jev hanya menerima entri pengalaman tersensor dan potongan bukti, tidak seluruh CV |
| Nama kandidat | `e8ed52f`, `4b8af56` | Nama file tidak menimpa nama di dokumen; kotak "FOTO" bukan nama; nama dicari lewat token email; header dipotong dari bukti |
| **Data pribadi di basis data** | `521d6b6` | `candidate_profiles.profile` menyimpan profil mentah (nama, email, telepon, teks CV) tanpa enkripsi; kini tampilan tersensor. Sampel teks pada temuan teks tersembunyi disensor. `scripts/scrub_stored_pii.py` membersihkan baris lama (D21) |
| Verifier Jev | `b444a05`, `2aee0fe`, `9a60d04`, `48d96c9`, `5a6528e`, `d283da1` | Ambang confidence 0,60; Jev menilai tiap potongan bukti; bukti membawa jenis bagian CV; token terukur dari `Usage`; mock dihapus dari kode produksi |
| Pembaca DOCX | `8d96ad1` | Isi tabel DOCX terbaca (sebelumnya judul, perusahaan, tanggal di tabel hilang) |
| **Parser CV nyata** | `1ff13ba`, `14f0188`, `a314fae`, `3e71c43` | Tata letak LinkedIn, `Judul, Perusahaan` + `tanggal \| Kota`, pipa, koma setelah bulan, tanggal dulu dengan bullet berglyph, `Perusahaan / tanggal / Judul`, `Perusahaan / Kota, / tanggal / Judul`; peringatan `EXPERIENCE_NOT_PARSED` untuk teks terpecah |
| **Urutan baca PDF** | `437a150`, `5ec3bbf` | Blok teks halaman diurutkan menurut posisi (kolom, baris visual), bukan urutan file; pengaman agar tidak ada teks hilang, dengan tes permanen |
| Teks tersembunyi | `c9bad1f`, `2d4a524`, `43cbc64`, `b52dd2a` | Latar nyata, span satu karakter, zero-width hanya bila mencurigakan; satu detektor kasar kedua di sanitizer disamakan (D22) |
| Domain LEADERSHIP/ACHIEVEMENT | `eaab45f` | Tim non-teknis dan jumlah anggota tim tidak dihitung; pengaman `JEV_DOMAIN_GUARD` (D17, D18) |
| Aturan sesuai spec | `9a29a07`, `e1a3fd2` | EDUCATION `partial_fields`; ACHIEVEMENT dari proyek = PARTIAL; alias bidang untuk daftar jurusan recruiter (D16) |
| Flag | `c05f576`, `a3ffa4a` | `NO_EVIDENCE_FOUND` dipisah dari `LOW_CONFIDENCE` (D19); `HYBRID_PORTFOLIO_CV` hanya untuk dokumen dengan lampiran |
| Urutan seri | `ba816ae` | Pembeda terakhir ranking memakai `candidate_id` saja |
| Alat ukur | `a029ceb` dan seterusnya, `ccb101d`, `51e2c87` | `scripts/eval_agent_path.py`, set parafrase, tiga set hold-out |

## 3. Angka kunci

Akurasi status per kriteria. "Alur lengkap" adalah jalur produksi dengan Jev asli (8 potongan bukti).

| Set | Aturan murni | Alur lengkap |
|---|---|---|
| Golden, 15 CV × 10 | 132 → **149**/150 | 134 → **150**/150 |
| Parafrase, 15 CV × 10 | 127 → **130**/150 | 138 → **146**/150 (run lain: 143 sampai 144) |
| Hold-out 1, 12 CV × 10 | 112 → 114/120 | 114 → 115/120 |
| Hold-out 2, 12 CV × 10 | 109 → 110/120 | 116 → 117/120 |
| Hold-out 3, 12 CV × 10 (informasi) | 115 → 118/120 | 114 → 116/120 |

**19 CV nyata** (uji manual; tidak masuk repo karena berisi data pribadi): awalnya 12 tersimpan dengan 0 pengalaman tanpa peringatan. Sekarang 91 entri di 16 CV, 3 CV tanpa pengalaman semuanya ditandai `EXPERIENCE_NOT_PARSED`, `HIDDEN_TEXT` turun dari 10 menjadi 0 CV, dan `HYBRID_PORTFOLIO_CV` dari 19 menjadi 3.

**Cara membacanya dengan jujur:**
- Kenaikan terbesar di golden berasal dari **ekstraksi** (DOCX, lalu parser dan urutan baca), bukan dari Jev. Nilai Jev terlihat di parafrase dan hold-out, ketika kata di CV tidak cocok dengan kamus aturan.
- **150/150 di golden bukan bukti kualitas umum**: set itu diamati berkali-kali dan perbaikannya dirancang dari kegagalannya. Set sintetis juga tidak mewakili CV nyata; 19 CV nyata menemukan kegagalan yang tidak terlihat di semua set sintetis.
- **Jev tidak deterministik**: parafrase 143 sampai 146 pada kode yang sama. Itulah alasan Tahap 4.
- Hold-out 3 hanya informasi: sebagian sel ikut membentuk rancangan perbaikan domain.
- Biaya satu pengukuran penuh dengan Jev sekitar $0,007 sampai $0,013 (sekitar 200 panggilan, 60 detik untuk 15 CV). Aturan murni 0,1 detik.

## 4. Eksperimen yang ditolak (jangan diulang tanpa alasan baru)

- **Pendapat kedua Jev pada klaim STRONG dari aturan:** bersih −10 (primitive produksi) dan −3 (Choice generik) pada 57 klaim. Jev menurunkan STRONG skill yang benar karena rubriknya menilai kedalaman keahlian.
- **Primitive ACHIEVEMENT lain** (Choice generik, dan pertanyaan sesuai definisi spec): masing-masing bersih −1.
- **Pengaman "harus ada angka" untuk ACHIEVEMENT:** merusak K01 (hasil ditulis dengan kata) dan L07.R9.
- **Pengaman "kutipan harus memuat besaran":** parafrase 143 (kriteria ≥ 144), tahun dihitung sebagai angka, dan merusak M2.R9, K08.R9, L07.R9 karena kutipan hanya sebagian dari bukti yang dinilai Jev. Bila dicoba lagi: kecualikan tahun dan tanggal, uji seluruh potongan bukti (bukan kutipan), pada set yang belum pernah dilihat, dengan kriteria baru. Rincian di dokumen hasil.
- **Aturan penerimaan:** perubahan diterima hanya bila memenuhi kriteria yang ditulis sebelum pengukuran. Satu kali kriteria itu lolos tetapi terlalu sempit (urutan baca menghilangkan blok kontak, yang tidak terukur oleh jumlah entri); sejak itu pengukuran urutan baca menyertakan tes "tidak ada kata yang hilang".

## 5. Masalah yang masih terbuka

1. **Jev tidak deterministik** di sekitar confidence 0,6 (Tahap 4, cache; D14 sudah menyebutnya tetapi belum berlaku untuk Jev). Rancangan: ambang simpan lebih tinggi dari ambang keputusan (mis. 0,80), opsi `refresh`, flag `JEV_CACHED`, versi prompt dan model di kunci cache, kolom `cached` di `jev_calls`.
2. **Jev menaikkan ACHIEVEMENT dari kutipan tanpa angka** (K11.R9, L02.R9; sebagian H09.R9). Pengaman domain tidak menjangkaunya.
3. **Teks yang tidak bisa dibaca parser:** C-0037, C-0038, C-0046 (teks terpecah per kata, ditandai) dan C-0090 (hasil scan, dua judul salah). C-0035 punya entri dari sidebar. Perbaikan urutan baca diukur pada 19 CV yang sama dengan yang membentuk rancangannya, jadi itu bukan bukti bahwa tata letak lain akan terbaca.
4. **Label ketiga hold-out ditulis dari spec oleh asisten yang juga mengerjakan sistemnya,** bukan wasit independen. Perlu ditinjau manusia (perhatikan H05.R9).
5. **Cabang pgvector di alur screening tidak pernah terpakai** (konteks tidak membawa `profile_id` dan `tenant_id`). Ditunda; bila dikerjakan, sebagai tambahan bukti per bagian CV, diukur dengan `profile_chunks` terisi, dan dengan bukti determinisme (D13).
6. **Dua fitur spec 4.2 tidak diimplementasikan** (mahasiswa aktif, sertifikat kedaluwarsa): keputusan pemilik, D20.
7. **Sisa kualitas kode (pilihan "kode" di bersih-bersih, belum dikerjakan):** sekitar 105 temuan ruff, 9 error mypy, `disallow_untyped_defs = false`, path `/srv/hermes-control` di `tests/conftest.py:15`, dan impor melingkar antara `processor`, `experience_extractor`, `verifier`.
8. **Pembuat PDF dokumen spec rusak:** `scripts/compile_spec_pdf.py` gagal (Typst `unclosed delimiter`) sejak sebelum 29 Okt; `PRODUCT_ARCHITECTURE_SPECIFICATION.typ` yang dilacak tidak bisa dibangun ulang darinya. Pembuat memo riset juga menjadikan header `UNTRUSTED_AGENT_OUTPUT` sebagai judul. Rincian di [`docs/README.md`](../README.md).
9. **Nama `ScreeningAgent`** (alur bertahap tetap, bukan agent otonom) belum diganti. Cakupan: internal saja (nilai DB `react_agent` dan field API `use_agent` dipertahankan), hanya istilah di dokumen, atau penuh termasuk DB dan API (butuh migrasi). Calon nama: `ScreeningWorkflow`, `EvidencePipeline`, `CandidateEvaluator`.

## 6. Kesepakatan kerja

- **Set hold-out hanya untuk mengukur.** Jangan menyetel aturan, prompt, ambang, atau pengaturan terhadapnya. Bila sistem tidak setuju dengan label, tinjau kasusnya; keduanya bisa salah. Bila hold-out pernah dipakai menyetel, buat yang baru.
- **Golden dataset adalah wasit:** label tidak boleh diubah agar test lulus (aturan #8 di `CLAUDE.md`).
- **Terima perubahan hanya dengan bukti** dari pengukuran, dengan syarat penerimaan ditulis lebih dulu.
- **Commit tanpa baris `Co-Authored-By`.** Commit atau push hanya bila diminta.
- **Panggilan ke API Jev berbayar:** hanya bila bagian dari tugas yang disetujui; test otomatis tidak memanggil API sungguhan (`RUN_LIVE_JEV=1` untuk opt-in).
- **Bersih-bersih:** hapus yang jelas tidak terpakai, tetapi dokumen yang penting (terutama `.md`) diperbarui, bukan dihapus. Jangan menyentuh `data/` (berisi CV nyata) tanpa perintah eksplisit.
- **`gh` tanpa repo default:** selalu pakai `--repo alifihsan7/ai-cv-screening-ranking` (bisa menunjuk ke upstream publik). `gh pr edit` gagal karena error GraphQL Projects classic; ubah isi PR lewat `gh api -X PATCH repos/alifihsan7/ai-cv-screening-ranking/pulls/<n> -F body=@file`.
- **Worker dan taksonomi dimuat sekali saat mulai:** restart setelah kode atau YAML berubah (lihat bagian 7 di [runbook](../DEPLOYMENT_AND_RUNBOOK.md)).

## 7. Langkah berikutnya

1. **Push `chore/repo-cleanup` dan buka PR** (draf deskripsi perlu disesuaikan dengan commit terbaru); hapus branch `fix/jev-remediation` yang sudah merged setelah pemilik setuju.
2. **Tahap 4, cache hasil Jev:** tulis rancangan dan kriteria penerimaan lebih dulu; alat ukur harus punya mode tanpa cache atau `refresh`, supaya yang diukur bukan cache.
3. **Sisa kualitas kode** (butir 5.7), bila pemilik mau.
4. **Peninjauan label hold-out oleh manusia;** hold-out keempat bila perlu pengukuran bersih untuk perbaikan domain.

## 8. Cara mengulang pengukuran

Semua perintah dari root repo. Database tes ada di `.env` tetapi tidak dimuat otomatis, jadi diekspor dulu:

```bash
export TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)"
pytest -q                                   # test otomatis, tanpa API sungguhan

export DATABASE_URL="$TEST_DATABASE_URL"    # telemetri jev_calls ke database tes, bukan database aplikasi

# Alur produksi dengan Jev asli (live, sekitar $0,01 per set)
python scripts/eval_agent_path.py --output-json out/golden.json
for set in paraphrase_set holdout_set holdout_set_2 holdout_set_3; do
  python scripts/eval_agent_path.py --cvs-dir docs/eval/$set/cvs/core \
    --labels docs/eval/$set/labels/expected_JD-01.json --output-json out/$set.json
done

python scripts/eval_agent_path.py --mock-jev --output-json out/rules.json   # hanya aturan murni, gratis; BUKAN pengukuran Jev
```

CV set parafrase dan hold-out (PDF dan DOCX diabaikan git) dibangun ulang dengan:

```bash
python scripts/build_paraphrase_set.py
python scripts/build_holdout_set.py && python scripts/build_holdout2_set.py && python scripts/build_holdout3_set.py
```

Pengaturan yang relevan di `.env`: `VERIFIER_MIN_CONFIDENCE` (0,60), `EVIDENCE_TOP_K` (8), `TYPESAFE_API_KEY`, `SCORING_MODE=jev_hybrid`. Untuk memproses ulang dokumen di basis data (status `READY` dilewati) dan membersihkan data pribadi lama, lihat bagian 7 di [runbook](../DEPLOYMENT_AND_RUNBOOK.md).

## 9. Peta file baru

| File | Fungsi |
|---|---|
| `src/domain/evidence_chunks.py` | Menyusun bukti per bagian CV untuk pencarian |
| `src/domain/domain_guard.py` | Aturan domain: tim non-teknis, pengaman `JEV_DOMAIN_GUARD` |
| `src/worker/docx_text.py` | Membaca isi DOCX berurutan, termasuk tabel |
| `src/worker/pdf_reading_order.py` | Urutan baca halaman PDF (kolom, baris visual) |
| `src/worker/pii_scrub.py` | Apa yang boleh disimpan di kolom JSON biasa |
| `src/infrastructure/typesafe.py` | Satu sumber konfigurasi koneksi TypeSafe |
| `scripts/eval_agent_path.py` | Mengukur alur produksi pada satu set CV |
| `scripts/eval_second_opinion.py` | Percobaan pendapat kedua Jev (ditolak) |
| `scripts/scrub_stored_pii.py` | Membersihkan data pribadi di baris lama (dry run secara bawaan) |
| `scripts/build_paraphrase_set.py`, `build_holdout_set.py`, `build_holdout2_set.py`, `build_holdout3_set.py` | Membangun set uji di `docs/eval/` |
| `tests/test_domain_guard.py`, `test_parser_real_layouts.py`, `test_pdf_reading_order.py`, `test_hidden_text_background.py`, `test_pii_scrub.py` | Test untuk perubahan di atas |

File hasil mentah pengukuran (JSON) ada di folder sementara dan tidak masuk repo; angka yang penting sudah tercatat di dokumen hasil.
