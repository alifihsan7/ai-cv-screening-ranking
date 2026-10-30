# Panduan Lengkap Pengguna & Recruiter (User Guide)
## Platform Seleksi & Pemeringkatan CV Berbasis Bukti (AI CV Screening)

Dokumen ini adalah panduan resmi operasional bagi Recruiter, Hiring Manager, dan Penilai Teknis dalam menggunakan platform seleksi CV cerdas berbasis bukti (*evidence-grounded*).

---

### Daftar Isi
1. [Prinsip Utama: Verifikasi Tanpa Halusinasi](#1-prinsip-utama-verifikasi-tanpa-halusinasi)
2. [Langkah 1: Setup Lowongan & Template Industri](#langkah-1-setup-lowongan--template-industri)
3. [Langkah 2: Studio Kriteria & Pembobotan](#langkah-2-studio-kriteria--pembobotan)
4. [Langkah 3: Unggah Berkas CV](#langkah-3-unggah-berkas-cv)
5. [Langkah 4: Workbench Seleksi & Roster Peringkat](#langkah-4-workbench-seleksi--roster-peringkat)
6. [Inspeksi Forensik Kandidat (4 Tab Navigasi)](#inspeksi-forensik-kandidat-4-tab-navigasi)
   - [Tab 1: Matriks Evaluasi & Bukti Verbatim](#tab-1-matriks-evaluasi--bukti-verbatim)
   - [Tab 2: Audit Perhitungan Skor & Band Capping](#tab-2-audit-perhitungan-skor--band-capping)
   - [Tab 3: Jejak Penalaran ReAct](#tab-3-jejak-penalaran-react)
   - [Tab 4: Grounding Dokumen CV Asli](#tab-4-grounding-dokumen-cv-asli)
7. [Catatan Hiring Manager & Ekspor CSV](#catatan-hiring-manager--ekspor-csv)

---

### 1. Prinsip Utama: Verifikasi Tanpa Halusinasi

Berbeda dengan AI generatif biasa (ChatGPT) yang kerap mengarang klaim atau memberikan skor sembarangan, platform ini bekerja dengan 3 hukum pasti:
1. **Verbatim Grounding Mutlak**: Suatu kualifikasi hanya diakui terbukti (*STRONG*) jika ada kutipan kata-demi-kata (*exact substring*) dari teks dokumen CV pelamar.
2. **Perhitungan Matematis Deterministik**: Skor dihitung murni dengan formula aritmatika bobot kriteria ($\sum W \times V$). AI tidak diizinkan mengeluarkan angka skor sendiri.
3. **Band Capping Penalty**: Jika syarat wajib (*MUST_HAVE*) tidak terbukti, batas skor kandidat langsung dipotong secara matematis (Band B maks 74.0, Band C maks 49.0), mencegah kandidat yang tidak memenuhi syarat dasar menempati peringkat teratas.

---

### Langkah 1: Setup Lowongan & Template Industri

Halaman awal memungkinkan Anda membuat draf lowongan baru atau memilih template industri yang telah terstandardisasi.

![Setup Lowongan Kerja](images/01_landing_job_setup.png)

* **Pemilihan Template Cerdas**: Mengklik template industri (misal *Civil Engineer*, *Backend Go*, *Data Analyst*) akan otomatis mengarahkan ke lowongan aktif yang sudah ada jika pernah dibuat sebelumnya, tanpa menduplikasi data atau menimpa lowongan lain.
* **Smart Switch**: Lowongan yang sudah berisi CV aman dan tidak akan tertimpa.

---

### Langkah 2: Studio Kriteria & Pembobotan

Di tahap ini, teks Deskripsi Pekerjaan (JD) dikompilasi menjadi daftar kriteria terstruktur dengan klasifikasi 3-tier:

![Studio Kriteria](images/02_criteria_studio.png)

1. **Wajib (MUST_HAVE)**: Syarat mutlak (e.g. Minimal Pendidikan, Pengalaman Bidang). Menentukan Band A/B/C.
2. **Diutamakan (PREFERRED)**: Nilai kompetensi inti yang diharapkan.
3. **Nilai Tambah (NICE_TO_HAVE)**: Keahlian pendukung atau sertifikasi tambahan.
* **Penguncian Versi**: Saat kriteria disetujui (*Approve*), versi kriteria dikunci bersama kamus taksonomi industri terkait demi objektivitas audit seleksi.

---

### Langkah 3: Unggah Berkas CV

Platform mendukung unggahan berkas dalam format PDF maupun DOCX:

![Unggah Berkas CV](images/03_upload_cv.png)

* **Sanitasi Anti-Adversarial**: Sebelum dianalisis, berkas dipindai secara biner dari upaya kecurangan (teks putih tak terlihat, font ukuran nol, karakter injeksi unicode).
* **Anonimisasi PII**: Data kontak dan nama pelamar disamarkan secara otomatis untuk mencegah bias subjektif penilai (*Blind Review Mode*).

---

### Langkah 4: Workbench Seleksi & Roster Peringkat

Pusat kendali evaluasi di mana seluruh pelamar diperingkat secara otomatis berdasarkan skor fit deterministik:

![Workbench Roster](images/04_workbench_roster.png)

* **Mode Buta (Blind Mode)**: Anda dapat menyembunyikan identitas pelamar (menjadi kode seperti `Kandidat #C01`) agar penilaian 100% fokus pada bukti kompetensi.
* **Filter Rekomendasi**: Filter cepat berdasarkan rekomendasi AI: *Shortlist*, *Review*, atau *Tidak Lanjut*.
* **Ekspor CSV**: Tombol di pojok kanan atas untuk mengunduh seluruh rekap evaluasi pelamar langsung ke format Excel/CSV.

---

### Inspeksi Forensik Kandidat (4 Tab Navigasi)

Klik tombol **Inspeksi Bukti** pada salah satu baris pelamar untuk membuka panel audit mendalam:

#### Tab 1: Matriks Evaluasi & Bukti Verbatim
Menampilkan setiap kriteria kualifikasi lowongan dan status pemenuhan pelamar:

![Tab Evaluasi](images/05_inspector_evaluation.png)

* **Status Evaluasi**:
  - `STRONG`: Terbukti penuh dengan kutipan kata-demi-kata di CV.
  - `PARTIAL`: Terpenuhi sebagian atau ada kualifikasi yang belum optimal.
  - `UNPROVEN`: Tidak ditemukan bukti pada berkas.
* **Lihat Bukti Kutipan**: Klik untuk membuka rentang karakter teks asli yang membuktikan klaim tersebut.

---

#### Tab 2: Audit Perhitungan Skor & Band Capping
Menjelaskan secara transparan bagaimana skor akhir kandidat terbentuk:

![Tab Perhitungan Skor](images/06_inspector_scoring.png)

* **Komparasi Skor**: Skor Mentah vs Pemotongan Band Cap vs Skor Akhir.
* **Breakdown Kategori**: Grafik capaian per kelompok kompetensi (Pengalaman Kerja, Keterampilan Teknis, Pendidikan, dll).
* **Tabel Audit Bobot**: Rincian setiap kriteria, bobot ($W$), pengali status ($V$), dan poin kontribusinya secara matematis.

---

#### Tab 3: Jejak Penalaran ReAct
Menampilkan alur observasi forensik saat membedah berkas CV:

![Tab Jejak Penalaran](images/07_inspector_trajectory.png)

* Memperlihatkan langkah demi langkah bagaimana sistem mengekstrak riwayat kerja, mencocokkan taksonomi jabatan, dan memvalidasi keaslian masa kerja.

---

#### Tab 4: Grounding Dokumen CV Asli
Menampilkan teks lengkap hasil ekstraksi dokumen pelamar dengan penyorot otomatis (*highlight*):

![Tab Grounding Teks](images/08_inspector_grounding.png)

* Klik kutipan bukti pada kriteria mana pun, dan sistem akan langsung melompat serta menyorot kalimat tersebut pada naskah dokumen asli.

---

### Catatan Hiring Manager & Ekspor CSV

1. **Keputusan & Catatan HM**:
   - Di bagian atas panel inspeksi, pilih status keputusan: `[Shortlist]`, `[Hold]`, atau `[Tolak]`.
   - Ketik feedback atau alasan di kolom **Catatan Hiring Manager** (tersimpan otomatis secara persisten). Catatan ini akan muncul sebagai preview pada tabel utama.
2. **Ekspor Hasil Laporan**:
   - Klik tombol **Ekspor CSV** di tabel workbench.
   - File CSV yang dihasilkan sudah disematkan UTF-8 BOM, sehingga langsung rapi dibuka di Microsoft Excel atau Google Sheets tanpa teks berantakan.
