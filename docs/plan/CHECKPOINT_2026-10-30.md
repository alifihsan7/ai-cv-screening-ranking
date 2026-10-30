# Checkpoint 30 Oktober 2026: profil peran, UI, dan audit taksonomi

Lanjutan dari [CHECKPOINT_2026-10-29.md](CHECKPOINT_2026-10-29.md) (yang tetap berlaku untuk Jev, parser, dan privasi). Rancangan profil peran, kriteria penerimaan, dan angka ada di [ROLE_PROFILE_DESIGN.md](ROLE_PROFILE_DESIGN.md). **Pembaruan terakhir sesi Codex: perubahan UI dan audit sementara taksonomi ada di bagian 7–8. Pemilik meminta checkpoint terlebih dahulu; audit belum selesai dan belum ada perbaikan evaluator.**

## 1. Status

- **Branch lokal saat checkpoint:** `main`, HEAD `628226d` (`docs: add AGENTS.md pointing agents to CLAUDE.md and the latest checkpoint`). Riwayat lokal sudah memuat merge PR #5 (`5433410`) dan PR #6 (`49d33f4`). Status ini diperiksa dari Git lokal; GitHub tidak ditanya ulang dalam sesi ini.
- **Pengujian profil peran sebelumnya:** 459 lulus, 3 dilewati; Playwright 10 lulus; `tsc -b` dan `oxlint` bersih; ruff bersih pada berkas yang disentuh. Angka ini riwayat, **bukan suite penuh yang dijalankan ulang sesi ini**.
- **Pemeriksaan sesi ini:** build frontend/TypeScript berhasil, lint tanpa error dengan **8 peringatan yang sudah ada**, dan 39 tes terkait taksonomi/profil/compiler lulus. Rincian bagian 7–8.
- **Belum berubah:** `fix/jev-remediation` tidak boleh dihapus sampai pemilik bilang; Tahap 4 (cache Jev) tetap paling akhir; buku panduan (dua PDF) belum dimulai. Perubahan sesi ini belum di-commit atau di-push.

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
- Audit awal R1–R8 dimulai dengan kriteria tersimpan dan contoh sintetis; temuan ada di bagian 8. Dampaknya pada kandidat nyata belum dihitung. Angka evaluasi sebelumnya belum membuktikan R3–R8 benar.
- Panel UI diuji dengan respons compile palsu di Playwright dan dengan backend sungguhan lewat API; alur klik penuh di browser dengan backend sungguhan belum.
- `cv_screener.db` (0 byte, tidak terlacak) dan `.claude/` tidak masuk commit; asal berkas pertama tidak diketahui.

## 5. Langkah berikutnya (urutan usulan)

1. Pemilik meninjau lima kandidat nyata yang masih N (daftar judul relevan dan tidak relevan diberikan terpisah, tidak masuk repo). Hasilnya memutuskan langkah 4.
2. Lanjutkan audit kriteria sipil dan mekanisme profil dari bagian 8. Jangan menganggap kamus sipil umum memenuhi R8 yang meminta jenis proyek tertentu.
3. Langkah 4 atau 5 sesuai hasil butir 1.
4. Setelah audit, tulis rancangan dan kriteria penerimaan perbaikan sebelum mengubah aturan. PR #5 dan #6 sudah tercatat merged dalam riwayat lokal; tidak perlu menggabungkannya lagi.

## 6. Konteks kerja untuk agen berikutnya (serah terima dari Claude Code ke Codex)

Bagian ini menyalin "memori" yang selama ini hanya ada di sisi Claude Code, supaya agen lain bisa melanjutkan tanpa riwayat percakapan. Baca juga `CLAUDE.md` (aturan emas, peta kode, perintah); dokumen itu tetap berlaku untuk agen mana pun.

### Preferensi pemilik (Alif Ihsan)

- **Bahasa:** komunikasi dalam Bahasa Indonesia, ringkas, dan jujur soal hasil. Bila tes gagal atau sesuatu tidak diperiksa, katakan apa adanya.
- **Commit tanpa `Co-Authored-By`** dan tanpa atribusi agen apa pun, walau alat atau sistem menawarkannya. Pemilik dua kali memintanya eksplisit dan pernah meminta satu commit ditulis ulang.
- **Jangan menyebut alur screening sebagai "agent".** `ScreeningAgent` (`src/domain/agent.py`) adalah urutan fase tetap dengan percobaan ulang terbatas; hanya Jev yang memakai model. Sebut "alur screening" atau "jalur produksi". Penggantian nama kode **ditunda** dan belum diputuskan; jangan memulai atau menanyakannya lagi sebelum pemilik membahasnya (nama ada di 69 baris `src`, 60 baris tes, kolom DB `react_agent`, dan field API `use_agent`).
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
- **PR #5** (`chore/repo-cleanup`) dan **PR #6** (`fix/vacancy-role-profile`) sudah tercatat merged dalam riwayat lokal; catatan sebelumnya yang menyebut keduanya terbuka sudah usang.
- **Tahap 4 (cache hasil Jev)** sengaja paling akhir; pgvector yang ditunda juga belum disentuh.
- **Opsi 1 lint/mypy/path di `tests/conftest.py:15`** ditunda.
- **Langkah 4 profil peran** ditunda atas permintaan pemilik ("tunda dulu"); keputusannya bergantung pada tinjauan pemilik atas lima CV nyata yang masih N (pemilik yang mengenal CV-nya).
- Berkas tidak terlacak `.claude/` dan `cv_screener.db` (0 byte, asal tidak diketahui) jangan ikut commit.

## 7. Perubahan UI pada sesi Codex (selesai, belum commit)

Permintaan pemilik: ganti label kiri atas "Deterministic Verifier", buat logo baru, lalu gunakan istilah **screening** secara konsisten.

- `frontend/src/components/Topbar.tsx`: label sekarang **Screening Berbasis Bukti**; monogram AI diganti logo dokumen dengan tanda centang hijau.
- Logo SVG baru: `frontend/src/assets/brand-mark.svg`; salinan favicon ada di `frontend/public/favicon.svg`. `frontend/index.html` menunjuk aset sumber SVG supaya Vite menghasilkan URL ber-hash di `/assets/`; rute `/favicon.svg` pada backend yang berjalan menghasilkan 404, sehingga favicon tidak bergantung pada rute tersebut.
- Istilah screening diseragamkan pada Topbar, WorkflowStepper, UploadStep, UploadModal, toast App, smoke test terkait, `AGENTS.md`, dokumen rancangan profil, dan checkpoint ini. Tidak mengubah nama API atau skema database.
- `npm run build` sudah dijalankan di `frontend/`, memperbarui `frontend/dist` yang disajikan backend. Verifikasi HTTP lokal pada `127.0.0.1:8110` membuktikan HTML, aset logo, dan bundle berlabel baru tersedia. Tidak me-restart API atau worker.
- `npm run lint`: tanpa error, 8 peringatan lama pada App, CustomSelect, dan JobSetupStep. `git diff --check` lulus. Playwright **belum dijalankan ulang** pada perubahan UI ini.
- File yang sudah berubah sebelum penulisan checkpoint: `AGENTS.md`, `docs/plan/ROLE_PROFILE_DESIGN.md`, `frontend/e2e/smoke.spec.ts`, `frontend/index.html`, `frontend/public/favicon.svg`, `frontend/src/App.tsx`, dan komponen Topbar, UploadModal, UploadStep, WorkflowStepper. Logo baru masih untracked. Jangan kehilangan perubahan ini saat melanjutkan.

## 8. Audit sementara taksonomi dan profil relevansi (belum selesai, belum diperbaiki)

### Permintaan dan cakupan

Pemilik menunjukkan R8: "Pengalaman lapangan pada proyek fasilitas lapangan olahraga, gedung bertingkat, atau kolam renang", tetapi panelnya berisi seluruh daftar jabatan/kata bidang sipil umum. Pemilik meminta memeriksa kebenarannya dan kriteria lain, lalu meminta **checkpoint terlebih dahulu**.

Pemeriksaan yang sudah dilakukan:

- Membaca compiler JD, `role_profile.py`, `kind_rules.py`, kamus YAML, jalur evaluasi di `agent.py`, UI Criteria Studio, dan aturan persetujuan.
- Membaca **hanya kriteria lowongan** sipil terbaru di database melalui koneksi dengan `default_transaction_read_only=on` dan `statement_timeout=5000`. Tidak membaca profil/CV kandidat, tidak menyentuh `data/`, dan tidak mengubah data produksi.
- Lowongan yang diperiksa: **Civil Engineer (Struktur & Pelaksana)**, versi 1, APPROVED. R8 yang tersimpan benar-benar `EXPERIENCE_DURATION`; profil R2 dan R8 **identik**, masing-masing 24 judul dan 24 kata bidang. `params.min_months` R8 tidak ada.
- Membandingkan dengan fixture `docs/eval/civil_set/job_descriptions/JD-CIVIL_requirements.approved.json`: R8 di fixture adalah **RESPONSIBILITY**, berbeda dari lowongan tersimpan. Jangan memakai fixture itu sebagai bukti bahwa R8 produksi benar. Evaluasi sipil sebelumnya hanya mengukur R1/R2.
- Reproduksi memakai profil sintetis lokal dan kriteria tersimpan, **tanpa API Jev/LLM**. Skrip sementara `/tmp/cv-taxonomy-audit-20261030.py`, hasil `/tmp/cv-taxonomy-audit-20261030.json`; keduanya bukan artefak permanen repo dan bisa hilang. Bukti penting dicatat di bawah agar tidak bergantung pada `/tmp`.

### Temuan yang sudah direproduksi

**Prioritas tinggi — R8 kehilangan makna jenis proyek dan mendapat syarat durasi yang tidak ada.**

`jd_compiler.attach_role_profiles` membuat satu usulan dari seluruh JD dan menggabungkannya dengan benih keluarga peran, lalu menggunakannya ulang untuk kriteria durasi. `role_profile.is_relevant_experience` langsung menerima judul yang cocok, tanpa mensyaratkan jenis proyek. `kind_rules.eval_experience_duration_async` memasang minimum **36 bulan** bila deskripsi tidak menyebut durasi dan `min_months` kosong. Akibat yang terukur:

| Kasus sintetis dengan kriteria tersimpan | Hasil sekarang | Masalah |
|---|---|---|
| R8: Site Engineer 48 bulan, hanya proyek jalan dan drainase | STRONG | Tidak membuktikan olahraga, gedung bertingkat, atau kolam renang |
| R8: Site Engineer 2 bulan, jelas membangun kolam renang | PARTIAL | Dikenai ambang tiga tahun yang tidak diminta JD |
| R2: Surveyor Asuransi 48 bulan, menilai klaim kendaraan | STRONG | Kata judul `surveyor` langsung dianggap pengalaman sipil |
| R2: Mechanical Drafter 48 bulan, komponen otomotif | STRONG | Kata judul `drafter` langsung dianggap pengalaman sipil |
| R2: Staf Administrasi 48 bulan, bullet "Tidak memiliki pengalaman konstruksi sipil." | STRONG | Aturan profil tidak memeriksa negasi |
| R3: bullet menyebut pekerjaan tanah, pondasi, beton bertulang, drainase, finishing dalam bahasa Indonesia | NOT_DEMONSTRATED pada aturan | Lima ID konsep tersimpan tidak ada dalam kamus skill |
| R4: hanya "Membaca gambar teknik secara manual." | STRONG | Tidak membuktikan pengoperasian AutoCAD yang juga diminta |
| R5: hanya "Mengirim invoice ke vendor alat tulis kantor." | STRONG | Alias `vendor` dianggap bukti koordinasi lapangan/opname |
| R6: hanya Excel untuk absensi karyawan | STRONG | Tidak membuktikan RAB, BoQ, atau kurva S |
| R6: hanya kata `project` dalam administrasi umum | STRONG | `project` adalah alias `skill:microsoft_project` |
| R7: "Sertifikasi BNSP Administrasi Perkantoran" | STRONG | Kelompok sertifikasi sipil menerima `bnsp` tanpa membuktikan bidang |
| R7: "Pelatihan Lanskap Dasar" | STRONG | Substring `ska` cocok di dalam `lanskap` |
| R7: "Sertifikat Keahlian Ahli Muda Teknik Bangunan Gedung" | NOT_DEMONSTRATED | Nama lengkap yang relevan terlewat bila tanpa singkatan yang dikenal |

Untuk R4, R5, dan R6, hasil STRONG juga direproduksi dengan **metode evaluasi kontekstual yang dipakai produksi**, memakai verifier dummy tanpa kapabilitas API. Jalur `DIRECT_RULE_MATCH` menerima STRONG dari aturan dan langsung kembali, sehingga Jev tidak otomatis membetulkan hasil yang terlalu longgar. Untuk R3, yang terbukti baru kegagalan aturan: hasil akhir dengan Jev sungguhan **belum diukur**, bisa berbeda.

**Ketidakcocokan ID konsep.** Compiler membiarkan model menulis ID bebas, tanpa normalisasi/validasi terhadap registry. Contoh lowongan tersimpan:

- R3: `skill:earthworks`, `skill:foundation_works`, `skill:reinforced_concrete`, `skill:drainage_system`, `skill:construction_finishing` semuanya tidak terdaftar. Kamus memakai nama lain seperti `skill:earthwork`, `skill:foundation`, `skill:concrete_work`, `skill:drainage`, `skill:finishing_work`.
- R4: `skill:as_built_drawing` tidak terdaftar; tiga konsep lainnya ada, tetapi alias AutoCAD/gambar teknik/shop drawing saling terlalu lebar.
- R5: hanya `skill:subcontractor_management` dari empat konsep yang terdaftar.
- R6: `skill:rab`, `skill:bill_of_quantities`, `skill:s_curve` tidak terdaftar; Excel dan Microsoft Project terdaftar.
- R7: konsep memakai awalan `certification:*`, sedangkan evaluator membaca kamus terpisah `certifications.yaml` dengan kelompok `cert:*`. Pencocokan deskripsi kadang menyelamatkan hasil tetapi kelompok `cert:safety_civil` terlalu luas. Entri `cert:ska` di `skills.yaml` bukan registry yang dipakai `eval_certification`.

**Kriteria gabungan diperlakukan sebagai salah satu kata cocok.** `eval_skill`/`eval_responsibility` mengembalikan STRONG pada kecocokan pertama; belum memodelkan bahwa membaca gambar **dan** AutoCAD, atau menyusun anggaran **dengan** Excel, membutuhkan beberapa bukti. Memperbanyak alias saja tidak menyelesaikan masalah ini.

**Aturan profil dan penyimpanan punya batas tambahan yang sudah direproduksi:**

- "Produk beton bertulang" dihitung **dua** hit (`beton` dan `beton bertulang`), lalu dianggap relevan meskipun hanya satu frasa yang tumpang tindih. Angka dua bukan dua bukti kompetensi independen.
- Benih sipil mempunyai 31 kata bidang; `clean_stored_role_profile` memakai batas 24 dari sanitizer usulan model. Menyimpan benih murni membuang `lapangan` karena terlalu umum, lalu membuang enam istilah di akhir karena batas panjang daftar: `shop drawing`, `as built`, `tiang pancang`, `pekerjaan tanah`, `sap2000`, `etabs`. Jadi isi yang ditampilkan sebelum disimpan bisa berbeda dari yang dipakai setelah disimpan.
- Bila semua chip dihapus, profil kosong dibuang; resolver kembali ke benih 19 judul, sehingga menghapus seluruh daftar tidak berarti menonaktifkan semua kecocokan.
- "Minimal 2 tahun pengalaman marketing" jatuh ke keluarga `backend/fullstack` dan tidak mendapat profil. "Minimal 2 tahun pengalaman sipil dengan reporting proyek" menerima `data` + `civil_engineering`; keberadaan `data` memindahkannya ke jalur software bila belum ada profil tersimpan. Akuntansi justru terdeteksi sebagai `finance`; catatan lama bahwa akuntansi tidak ada di kamus sudah tidak tepat untuk kode sekarang.

**R1 dan fitur bidang lain:** dua kontrol R1 bekerja: D3 Teknik Sipil → STRONG; S1 Informatika → NOT_DEMONSTRATED. Namun syarat kampus terakreditasi pada teks tidak diperiksa evaluator; contoh eksplisit institusi belum terakreditasi tetap STRONG. Untuk kriteria sintetis tambahan di luar R1–R8, pencapaian terukur dan kepemimpinan Site Engineer masih N, sedangkan penghematan biaya cloud Backend Developer mendapat STRONG pada kriteria pencapaian sipil. Ini memperkuat batas langkah 5 yang sudah diketahui; belum mengukur hasil akhir dengan Jev atau dampak kandidat nyata.

### Temuan kode yang perlu diverifikasi lanjutan

- Snapshot persetujuan di `frontend/src/App.tsx:createCriteriaSnapshot` dan fallback CriteriaStudio hanya memuat ID, deskripsi, kategori, importance, bobot; **tidak memuat `params.role_profile`, `kind`, atau `concepts`**. Mengubah chip saja tampaknya tidak menandai kriteria berubah; tombol persetujuan bisa tetap terkunci. Belum direproduksi lewat browser.
- Label `Bobot: ... %` per kriteria bisa menyesatkan: scorer memakai bobot relatif **di dalam kategori**, lalu bobot kategori untuk skor akhir (`src/domain/scorer.py`). Belum diuji lewat tampilan/simulator.
- Usulan per kriteria, fallback keluarga tak dikenal, negasi, batas kata sertifikasi, pengelompokan syarat AND/OR, dan penyimpanan profil perlu rancangan terpadu. Sekadar mengganti semua R8 menjadi RESPONSIBILITY tidak cukup karena evaluator responsibility juga punya kecocokan kata yang terlalu luas.

### Validasi dan kelanjutan

- Tes yang dijalankan: `tests/test_role_profile.py`, `tests/test_kind_rules.py`, `tests/test_taxonomy_integrity.py`, `tests/test_taxonomy_extensible.py`, `tests/test_jd_compiler_jev.py`: **39 passed**. `TEST_DATABASE_URL` dan `DATABASE_URL` diarahkan ke `cv_screening_test`, `RUN_LIVE_JEV=0`. Tes lama lulus meskipun kasus audit di atas masih bermasalah; belum ada tes regresi baru untuk temuan ini.
- Tidak ada perubahan kode evaluator, kamus YAML, label golden/hold-out, atau kriteria produksi dalam audit ini. Tidak ada screening ulang CV nyata atau panggilan Jev/LLM sungguhan.
- Saat dilanjutkan: verifikasi masalah persetujuan di browser dengan API tiruan; selesaikan laporan dan prioritaskan R8, ID konsep, kriteria gabungan, sertifikasi, dan penyuntingan profil. Tulis kriteria penerimaan sebelum perbaikan; gunakan kasus sintetis baru untuk pengembangan, golden sebagai wasit dan hold-out hanya untuk pengukuran.
- Tinjauan lima CV nyata oleh pemilik dan penundaan langkah 4 tetap berlaku. Audit ini tidak memberi izin untuk mengubah label, membuka PR, commit/push, atau menjalankan API berbayar.
