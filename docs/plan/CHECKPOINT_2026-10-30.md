# Checkpoint 30 Oktober 2026: profil peran lowongan

Lanjutan dari [CHECKPOINT_2026-10-29.md](CHECKPOINT_2026-10-29.md) (yang tetap berlaku untuk Jev, parser, dan privasi). Dokumen ini hanya mencatat pekerjaan **profil peran lowongan**. Rancangan, kriteria penerimaan, dan angka ada di [ROLE_PROFILE_DESIGN.md](ROLE_PROFILE_DESIGN.md).

## 1. Status

- **Branch kerja:** `fix/vacancy-role-profile`, sudah di-push dan dibuka sebagai **PR #6** (https://github.com/alifihsan7/ai-cv-screening-ranking/pull/6, 12 commit dari `main`). Belum digabung.
- **Test:** 459 lulus, 3 dilewati; Playwright 10 lulus; `tsc -b` dan `oxlint` bersih; ruff bersih pada berkas yang disentuh.
- **Belum berubah:** PR #5 (`chore/repo-cleanup`) masih terbuka; `fix/jev-remediation` tidak boleh dihapus sampai pemilik bilang; Tahap 4 (cache Jev) tetap paling akhir; buku panduan (dua PDF) belum dimulai.

## 2. Masalah dan hasilnya

Kriteria pengalaman pada lowongan non-software selalu `NOT_DEMONSTRATED` karena pengklasifikasi peran Jev hanya mengenal peran software. Lowongan sipil: 13 CV nyata semua N; lowongan HR golden (JD-02) juga rusak di produksi. Kini lowongan mendefinisikan sendiri apa yang relevan (profil peran), dan model hanya mengusulkan data, tidak menghitung.

| Langkah | Isi | Status |
|---|---|---|
| 1 | Backend: `src/domain/role_profile.py`, jalur profil di `kind_rules.py`, usulan model di `jd_compiler.py`, benih taksonomi sipil | selesai |
| 2 | Panel "Pekerjaan yang dihitung relevan" di Criteria Studio | selesai |
| 3 | Penyuntingan profil oleh recruiter, dibersihkan dan di-lint di server saat disimpan | selesai |
| 4 | Pertanyaan relevansi Jev (RELEVAN/BERDEKATAN/TIDAK) untuk entri ambigu | **ditunda**; rancangan dan kriteria penerimaan sudah ditulis (ROLE_PROFILE_DESIGN §8), belum ada kode |
| 5 | ACHIEVEMENT, LEADERSHIP, `JEV_DOMAIN_GUARD` relatif terhadap lowongan; set bidang kedua (akuntansi atau pemasaran) | belum |

Angka: R2 set sipil sintetis (alur produksi) 4/12 → **12/12**; uji alur penuh lewat API dengan Jev sungguhan juga 12/12; HR JD-02 R1 N → STRONG (76 bulan); 13 CV nyata R2 13 N → 3 STRONG, 4 PARTIAL, 5 N dengan usulan model; software tidak bergeser (golden 150/150, hold-out 3 117/120, aturan murni 0 sel berubah).

## 3. Aturan yang berlaku

- Profil yang tersimpan di `params.role_profile` dipakai **persis seperti tersimpan** (terkunci bersama versi kriteria): kata yang dihapus recruiter tidak kembali dari taksonomi. Tanpa profil tersimpan, benih taksonomi dipakai.
- Lowongan software tetap di jalur Jev lama; jalur profil hanya bila keluarga yang diterima bukan software atau `params.role_profile` ada. Profil yang kosong setelah dibersihkan dibuang agar tidak memindahkan lowongan software ke jalur profil.
- Linter proyek mengizinkan agama dan gender secara default (`ALLOW_RELIGION_CRITERIA`, `ALLOW_GENDER_CRITERIA`); jadi kata seperti itu lolos ke profil. Itu konfigurasi yang ada, bukan perubahan ini.

## 4. Batas yang harus diingat

- Set sipil adalah **set pengembangan, sebagian melingkar**; ia membuktikan mekanisme dan jalur data, bukan kemampuan membaca profesi yang belum diduga. Usulan model sungguhan diuji pada satu lowongan.
- Pada CV nyata, kosakata adalah batasnya. Lima kandidat nyata masih N dan **belum ditinjau pemilik** (berapa yang memang tidak relevan, berapa yang terlewat kosakata). Itu bukti yang menentukan apakah langkah 4 perlu.
- Lowongan tanpa keluarga di taksonomi dan dengan usulan model gagal tetap jatuh ke jalur software.
- Kriteria sipil R3 sampai R8 belum diperiksa (R7 sertifikasi N untuk hampir semua kandidat).
- Panel UI diuji dengan respons compile palsu di Playwright dan dengan backend sungguhan lewat API; alur klik penuh di browser dengan backend sungguhan belum.
- `cv_screener.db` (0 byte, tidak terlacak) dan `.claude/` tidak masuk commit; asal berkas pertama tidak diketahui.

## 5. Langkah berikutnya (urutan usulan)

1. Pemilik meninjau lima kandidat nyata yang masih N (daftar judul relevan dan tidak relevan diberikan terpisah, tidak masuk repo). Hasilnya memutuskan langkah 4.
2. Periksa kriteria sipil R3 sampai R8, terutama R7.
3. Langkah 4 atau 5 sesuai hasil butir 1.
4. Gabungkan PR #6 setelah pemilik puas. Bila PR #5 digabung lebih dulu, `CLAUDE.md` dan `docs/README.md` akan konflik pada baris status/checkpoint yang sama.

## 6. Konteks kerja untuk agen berikutnya (serah terima dari Claude Code ke Codex)

Bagian ini menyalin "memori" yang selama ini hanya ada di sisi Claude Code, supaya agen lain bisa melanjutkan tanpa riwayat percakapan. Baca juga `CLAUDE.md` (aturan emas, peta kode, perintah); dokumen itu tetap berlaku untuk agen mana pun.

### Preferensi pemilik (Alif Ihsan)

- **Bahasa:** komunikasi dalam Bahasa Indonesia, ringkas, dan jujur soal hasil. Bila tes gagal atau sesuatu tidak diperiksa, katakan apa adanya.
- **Commit tanpa `Co-Authored-By`** dan tanpa atribusi agen apa pun, walau alat atau sistem menawarkannya. Pemilik dua kali memintanya eksplisit dan pernah meminta satu commit ditulis ulang.
- **Jangan menyebut alur skrining sebagai "agent".** `ScreeningAgent` (`src/domain/agent.py`) adalah urutan fase tetap dengan percobaan ulang terbatas; hanya Jev yang memakai model. Sebut "alur skrining" atau "jalur produksi". Penggantian nama kode **ditunda** dan belum diputuskan; jangan memulai atau menanyakannya lagi sebelum pemilik membahasnya (nama ada di 69 baris `src`, 60 baris tes, kolom DB `react_agent`, dan field API `use_agent`).
- **Dua fitur spec 4.2 sengaja tidak dikerjakan** (keputusan 29 Oktober 2026): mahasiswa aktif maksimal PARTIAL (K08.R7) dan sertifikat kedaluwarsa PARTIAL (H10.R8). Dampak skornya kecil dan keputusan akhir tetap di recruiter. Jangan menawarkannya lagi sebagai langkah berikutnya; kasus itu di hold-out memang masih salah dan itu diketahui.
- **Bersih-bersih repo:** hapus yang jelas mati dan tanpa rujukan; berkas `.md` atau apa pun yang dirujuk dokumen, Makefile, atau tes **diperbarui, bukan dihapus**. Lakukan di branch terpisah dan laporkan apa yang dihapus beserta cara memulihkannya. Jangan menyentuh `data/` (berisi CV nyata) tanpa perintah eksplisit.
- **Push dan PR hanya bila diminta.** Pemilik biasa meminta keduanya di akhir pekerjaan ("akhiran aja"). Jangan menghapus branch `fix/jev-remediation` sampai pemilik bilang. Hal luar (push, PR, hapus branch) dikonfirmasi dulu.
- **Disiplin pengukuran:** tulis kriteria penerimaan **sebelum** mengukur; set hold-out (`docs/eval/holdout_set*/`) hanya untuk mengukur, tidak untuk menyetel; label golden dataset tidak pernah diubah demi meluluskan tes. Laporkan batas dan klaim yang tidak terbukti, bukan hanya angka bagus.
- **Pemilik meminta penjelasan sederhana** bila istilahnya terlalu teknis ("jadi ini ngapain?"); jelaskan masalah, apa yang sudah dikerjakan, dan apa yang ditunda dengan bahasa awam.

### Perintah dan jebakan yang sudah terbukti

- **Tes:** ekspor `TEST_DATABASE_URL` dari `.env` dan setel `DATABASE_URL` sama dengannya sebelum `pytest`; tes memakai database `cv_screening_test`, **bukan** `cv_screening` (produksi). Tanpa itu, sebagian tes gagal karena lingkungan, bukan karena kode. Enam tes gagal di worktree bersih tanpa `.env` dan PDF golden (lingkungan, bukan regresi).
  ```bash
  export TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)" DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)"
  .venv/bin/pytest -q
  ```
- **Frontend:** `cd frontend && npx tsc -b && npx oxlint src && npx playwright test` (Playwright menyalakan dev server sendiri).
- **Uji alur penuh tanpa menyentuh produksi:** API di port 8110 dan worker produksi sedang berjalan dari pohon kerja ini dan **tidak memuat ulang kode** (tanpa `--reload`); jangan dimatikan. Untuk uji end-to-end, jalankan API di port lain (mis. 8199) dan worker kedua dengan `DATABASE_URL` diarahkan ke `cv_screening_test`, `STORAGE_VAULT_PATH` ke direktori sementara, lalu `PYTHONPATH=. python scripts/seed_users.py`. Setelah selesai matikan **berdasarkan PID**. `pkill -f` dengan pola yang juga muncul di baris perintah shell sendiri akan membunuh shell itu, dan `pkill -n` bisa mengenai proses yang salah.
- **Ukur jalur produksi pada CV:** `scripts/eval_agent_path.py` (nama berkas tetap, lihat catatan "agent" di atas), mis. set sipil: `--jd docs/eval/civil_set/job_descriptions/JD-CIVIL_requirements.approved.json --cvs-dir docs/eval/civil_set/cvs/core --labels docs/eval/civil_set/labels/expected_JD-CIVIL.json`. Label boleh sebagian.
- **Jev tidak deterministik** di sekitar keyakinan 0,6; sampai cache Tahap 4 ada, dua kali jalan bisa berbeda pada entri ambigu.
- **Saat memotong berkas dengan skrip,** periksa bahwa fungsi berikutnya tidak ikut terhapus (pernah menghapus `determine_importance` di `jd_compiler.py`; ruff F821 menangkapnya).
- Ruff dan mypy punya temuan lama (sekitar 105 ruff, 9 mypy) yang bukan dari pekerjaan ini; jangan dihitung sebagai regresi. `scripts/compile_spec_pdf.py` sudah rusak sebelum pekerjaan ini.

### Janji dan permintaan yang masih terbuka

- **Buku panduan dua PDF** (pembaca recruiter/HR dan pembaca developer/operator; diperbarui di tempat, bukan berkas baru) disetujui secara konsep tetapi **belum dimulai**.
- **PR #5** (`chore/repo-cleanup`, bersih-bersih dokumen dan skrip, keputusan D16 sampai D22) masih terbuka.
- **Tahap 4 (cache hasil Jev)** sengaja paling akhir; pgvector yang ditunda juga belum disentuh.
- **Opsi 1 lint/mypy/path di `tests/conftest.py:15`** ditunda.
- **Langkah 4 profil peran** ditunda atas permintaan pemilik ("tunda dulu"); keputusannya bergantung pada tinjauan pemilik atas lima CV nyata yang masih N (pemilik yang mengenal CV-nya).
- Berkas tidak terlacak `.claude/` dan `cv_screener.db` (0 byte, asal tidak diketahui) jangan ikut commit.
