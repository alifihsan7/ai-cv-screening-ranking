const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function encodeImageBase64(filePath) {
  const fileData = fs.readFileSync(filePath);
  return `data:image/png;base64,${fileData.toString('base64')}`;
}

async function run() {
  const imagesDir = path.join(__dirname, '../docs/images');
  const img1 = encodeImageBase64(path.join(imagesDir, '01_landing_job_setup.png'));
  const img2 = encodeImageBase64(path.join(imagesDir, '02_criteria_studio.png'));
  const img3 = encodeImageBase64(path.join(imagesDir, '03_upload_cv.png'));
  const img4 = encodeImageBase64(path.join(imagesDir, '04_workbench_roster.png'));
  const img5 = encodeImageBase64(path.join(imagesDir, '05_inspector_evaluation.png'));
  const img6 = encodeImageBase64(path.join(imagesDir, '06_inspector_scoring.png'));
  const img7 = encodeImageBase64(path.join(imagesDir, '07_inspector_trajectory.png'));
  const img8 = encodeImageBase64(path.join(imagesDir, '08_inspector_grounding.png'));

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Buku Panduan Pengguna (User Manual) - AI CV Screening Platform</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
  }
  :root {
    --primary: #0f172a;
    --primary-light: #1e293b;
    --emerald-600: #059669;
    --emerald-50: #ecfdf5;
    --emerald-900: #064e3b;
    --slate-800: #1e293b;
    --slate-700: #334155;
    --slate-600: #475569;
    --slate-500: #64748b;
    --slate-200: #e2e8f0;
    --slate-100: #f1f5f9;
    --slate-50: #f8fafc;
    --amber-600: #d97706;
    --rose-600: #e11d48;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--slate-800);
    line-height: 1.55;
    font-size: 9.5pt;
    background: #ffffff;
  }
  
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
    padding: 30pt 10pt;
  }
  .cover-header {
    border-bottom: 2pt solid var(--emerald-600);
    padding-bottom: 12pt;
  }
  .cover-badge {
    display: inline-block;
    background: var(--emerald-50);
    color: var(--emerald-900);
    border: 1pt solid #a7f3d0;
    padding: 3pt 8pt;
    border-radius: 4pt;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8pt;
    margin-bottom: 10pt;
  }
  .cover-title {
    font-size: 26pt;
    font-weight: 800;
    color: var(--primary);
    line-height: 1.15;
    margin-bottom: 8pt;
  }
  .cover-subtitle {
    font-size: 13pt;
    font-weight: 500;
    color: var(--slate-600);
    line-height: 1.4;
  }
  .cover-meta {
    background: var(--slate-50);
    border: 1pt solid var(--slate-200);
    border-radius: 8pt;
    padding: 16pt;
  }
  .cover-meta table {
    width: 100%;
    border-collapse: collapse;
  }
  .cover-meta td {
    padding: 4pt 6pt;
    font-size: 9pt;
  }
  .cover-meta td.label {
    width: 130pt;
    font-weight: 600;
    color: var(--slate-600);
  }
  .cover-meta td.value {
    color: var(--primary);
    font-weight: 500;
  }
  .cover-footer {
    border-top: 1pt solid var(--slate-200);
    padding-top: 12pt;
    font-size: 8.5pt;
    color: var(--slate-500);
    display: flex;
    justify-content: space-between;
  }

  .chapter {
    page-break-before: always;
  }
  .chapter-header {
    margin-bottom: 14pt;
    padding-bottom: 8pt;
    border-bottom: 1.5pt solid var(--slate-200);
  }
  .chapter-num {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--emerald-600);
    letter-spacing: 1pt;
  }
  h1 {
    font-size: 18pt;
    font-weight: 800;
    color: var(--primary);
    margin-top: 2pt;
  }
  h2 {
    font-size: 13pt;
    font-weight: 700;
    color: var(--slate-800);
    margin-top: 14pt;
    margin-bottom: 6pt;
    padding-bottom: 3pt;
    border-bottom: 0.5pt solid var(--slate-200);
  }
  h3 {
    font-size: 10.5pt;
    font-weight: 700;
    color: var(--primary-light);
    margin-top: 10pt;
    margin-bottom: 4pt;
  }
  p {
    margin-bottom: 8pt;
    color: var(--slate-700);
    text-align: justify;
  }
  ul, ol {
    margin-left: 18pt;
    margin-bottom: 8pt;
    color: var(--slate-700);
  }
  li {
    margin-bottom: 3pt;
  }

  .callout {
    background: var(--slate-50);
    border-left: 3pt solid var(--emerald-600);
    padding: 8pt 12pt;
    border-radius: 0 6pt 6pt 0;
    margin: 10pt 0;
    font-size: 9pt;
  }
  .callout-title {
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 2pt;
  }
  .callout-warning {
    border-left-color: var(--amber-600);
    background: #fffbeb;
  }

  .figure-card {
    background: #ffffff;
    border: 1pt solid var(--slate-200);
    border-radius: 6pt;
    padding: 8pt;
    margin: 10pt 0 14pt 0;
    box-shadow: 0 1pt 3pt rgba(0,0,0,0.04);
    page-break-inside: avoid;
  }
  .figure-card img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 4pt;
    border: 0.5pt solid var(--slate-200);
  }
  .figure-caption {
    margin-top: 6pt;
    font-size: 8pt;
    color: var(--slate-500);
    text-align: center;
    font-weight: 500;
  }
  .figure-caption strong {
    color: var(--slate-700);
  }

  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 12pt 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }
  table.data-table th {
    background: var(--slate-100);
    color: var(--primary);
    font-weight: 700;
    text-align: left;
    padding: 6pt 8pt;
    border: 0.5pt solid var(--slate-200);
  }
  table.data-table td {
    padding: 5pt 8pt;
    border: 0.5pt solid var(--slate-200);
    vertical-align: top;
  }
  table.data-table tr:nth-child(even) td {
    background: var(--slate-50);
  }

  .badge {
    display: inline-block;
    padding: 1.5pt 5pt;
    border-radius: 3pt;
    font-size: 7.5pt;
    font-weight: 700;
  }
  .badge-strong { background: #dcfce7; color: #15803d; }
  .badge-partial { background: #fef3c7; color: #b45309; }
  .badge-unproven { background: #fee2e2; color: #b91c1c; }
  .badge-band-a { background: #dcfce7; color: #166534; font-weight: 800; }
  .badge-band-b { background: #fef3c7; color: #92400e; font-weight: 800; }
  .badge-band-c { background: #fee2e2; color: #991b1b; font-weight: 800; }

  .toc-list {
    list-style: none;
    margin-left: 0;
  }
  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 4pt 0;
    border-bottom: 0.5pt dotted var(--slate-200);
    font-size: 9.5pt;
  }
  .toc-title {
    font-weight: 600;
    color: var(--primary);
  }
</style>
</head>
<body>

<!-- HALAMAN COVER -->
<div class="cover">
  <div class="cover-header">
    <span class="cover-badge">Dokumen Operasional Resmi</span>
    <h1 class="cover-title">BUKU PANDUAN PENGGUNA<br>(USER MANUAL)</h1>
    <div class="cover-subtitle">Platform Seleksi & Pemeringkatan CV Berbasis Bukti</div>
  </div>

  <div class="cover-meta">
    <table>
      <tr>
        <td class="label">Sistem Aplikasi:</td>
        <td class="value">AI CV Screening & Candidate Ranking Platform</td>
      </tr>
      <tr>
        <td class="label">URL Akses Web:</td>
        <td class="value"><strong>https://screening.alifihsan.my.id</strong></td>
      </tr>
      <tr>
        <td class="label">Arsitektur Inti:</td>
        <td class="value">Dual-Engine AI (9Router Local Gateway + TypeSafe Jev System One)</td>
      </tr>
      <tr>
        <td class="label">Penulis & Pemilik:</td>
        <td class="value">Alif Ihsan (Engineering & Product Lead)</td>
      </tr>
      <tr>
        <td class="label">Tanggal Publikasi:</td>
        <td class="value">Oktober 2026</td>
      </tr>
    </table>
  </div>

  <div class="cover-footer">
    <span>Klasifikasi: Dokumen Resmi Pengguna (Enterprise Release)</span>
    <span>AI CV Screening & Candidate Ranking Platform</span>
  </div>
</div>

<!-- DAFTAR ISI & PENDAHULUAN -->
<div class="chapter">
  <div class="chapter-header">
    <div class="chapter-num">Ringkasan Eksekutif</div>
    <h1>Pendahuluan & Konsep Utama</h1>
  </div>

  <h2>1. Karakteristik Sistem</h2>
  <p>
    Platform <strong>AI CV Screening</strong> dirancang untuk menyelesaikan kelemahan umum pada sistem penyaring CV konvensional yang kerap menghasilkan penilaian acak atau tidak dapat diverifikasi keabsahannya.
  </p>
  <p>
    Sistem ini memisahkan secara tegas antara <em>persepsi pembacaan dokumen</em> dan <em>agregasi skor matematis</em> melalui tiga prinsip kepatuhan:
  </p>

  <div class="callout">
    <div class="callout-title">Tiga Prinsip Baku Sistem</div>
    <ol>
      <li><strong>Pencocokan Bukti Hibrida (Verbatim & Semantik)</strong>: Kualifikasi pelamar diverifikasi melalui kombinasi pencocokan kata-demi-kata (<em>exact verbatim substring</em>) dan pencarian semantik (<em>dense vector embedding + Full-Text Search</em>) untuk mendeteksi variasi istilah atau sinonim kompetensi yang relevan pada dokumen pelamar.</li>
      <li><strong>Aritmatika Deterministik</strong>: Skor akhir dihitung 100% menggunakan formula matematis bobot kriteria. Model AI dilarang keras mengeluarkan angka skor mentah secara langsung.</li>
      <li><strong>Hard Band Capping (Hukuman Syarat Wajib)</strong>: Kegagalan pelamar pada syarat wajib (<em>MUST_HAVE</em>) secara otomatis memotong batas skor maksimal kandidat (maksimal 74.0 untuk Band B, dan maksimal 49.0 untuk Band C).</li>
    </ol>
  </div>

  <h2>2. Panduan Akses Sistem</h2>
  <p>
    Sistem dapat diakses secara langsung melalui peramban web modern tanpa instalasi aplikasi tambahan pada alamat resmi:
  </p>
  <p style="text-align: center; font-size: 11pt; padding: 6pt; background: var(--slate-100); border-radius: 4pt;">
    <strong>https://screening.alifihsan.my.id</strong>
  </p>
</div>

<!-- LANGKAH 1 & 2 -->
<div class="chapter">
  <div class="chapter-header">
    <div class="chapter-num">Alur Kerja Bagian I</div>
    <h1>Langkah 1: Setup Lowongan & Template Industri</h1>
  </div>

  <p>
    Halaman pertama memandu recruiter dalam menentukan posisi pekerjaan dan kualifikasi yang dicari:
  </p>

  <div class="figure-card">
    <img src="${img1}" alt="Setup Lowongan Kerja">
    <div class="figure-caption"><strong>Gambar 1.1</strong>: Antarmuka Setup Lowongan Kerja dan Pemilihan Template Industri Cerdas.</div>
  </div>

  <h3>Fitur Unggulan Langkah 1:</h3>
  <ul>
    <li><strong>Input Fleksibel</strong>: Tuliskan judul posisi dan tempelkan naskah kualifikasi pekerjaan (Job Description) ke dalam kotak teks.</li>
    <li><strong>Template Industri Instan</strong>: Tersedia tombol pintas untuk peran umum seperti <em>Civil Engineer</em>, <em>Backend Go Developer</em>, dan <em>Data Analyst</em>.</li>
    <li><strong>Smart Switch (Perlindungan Data)</strong>: Jika Anda memilih template yang sebelumnya sudah pernah dibuat dan telah memuat data pelamar, sistem secara cerdas akan mengarahkan Anda ke lowongan aktif tersebut tanpa menimpa atau menghapus berkas yang sudah ada.</li>
  </ul>

  <h2 style="margin-top: 20pt;">Langkah 2: Studio Kriteria & Pengaturan Bobot</h2>
  <p>
    Pada tahap ini, mesin kompilator mengekstrak syarat-syarat pekerjaan menjadi kartu kriteria terstruktur:
  </p>

  <div class="figure-card">
    <img src="${img2}" alt="Studio Kriteria">
    <div class="figure-caption"><strong>Gambar 1.2</strong>: Studio Kriteria dengan pembagian Tri-Tier (Wajib, Diutamakan, Nilai Tambah).</div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Tingkat Kriteria</th>
        <th style="width: 35%;">Definisi Operasional</th>
        <th style="width: 40%;">Dampak terhadap Penilaian</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Wajib (MUST_HAVE)</strong></td>
        <td>Syarat mutlak yang tidak dapat ditawar (contoh: Pendidikan S1, Minimal Pengalaman 3 Tahun).</td>
        <td>Jika tidak terpenuhi, kandidat langsung dijatuhi sanksi <em>Band Capping Penalty</em> (maksimal Band B atau C).</td>
      </tr>
      <tr>
        <td><strong>Diutamakan (PREFERRED)</strong></td>
        <td>Kompetensi inti yang sangat diharapkan (contoh: Pengalaman proyek gedung bertingkat, K3).</td>
        <td>Memberikan kontribusi bobot nilai utama pada skor akhir kandidat.</td>
      </tr>
      <tr>
        <td><strong>Nilai Tambah (NICE_TO_HAVE)</strong></td>
        <td>Keahlian pendukung tambahan (contoh: Penguasaan software Primavera, kemampuan bahasa).</td>
        <td>Memberikan poin penguat tambahan dalam pemeringkatan skor.</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- LANGKAH 3 & 4 -->
<div class="chapter">
  <div class="chapter-header">
    <div class="chapter-num">Alur Kerja Bagian II</div>
    <h1>Langkah 3: Unggah Berkas & Pemindaian Keamanan</h1>
  </div>

  <p>
    Tahap penerimaan berkas lamaran mendukung unggahan banyak berkas secara serentak (<em>batch upload</em>):
  </p>

  <div class="figure-card">
    <img src="${img3}" alt="Unggah Berkas Lamaran">
    <div class="figure-caption"><strong>Gambar 1.3</strong>: Modul Unggah CV dengan pemindaian keamanan biner anti-kecurangan.</div>
  </div>

  <h3>Mekanisme Keamanan Otomatis Saat Unggah:</h3>
  <ul>
    <li><strong>Format Dokumen</strong>: Mendukung berkas <strong>PDF</strong> dan <strong>DOCX</strong> (Microsoft Word).</li>
    <li><strong>Deteksi Teks Tersembunyi (Anti-Adversarial)</strong>: Mesin secara otomatis mendeteksi font berukuran 0-point, teks warna putih di atas kertas putih, dan karakter Unicode tak terlihat yang kerap disisipkan pelamar nakal untuk mengelabui filter pencarian.</li>
    <li><strong>Enkripsi PII Otomatis</strong>: Data kontak kandidat (telepon, email, alamat) dienkripsi simetris menggunakan algoritma AES-256 untuk menjaga privasi.</li>
  </ul>

  <h2 style="margin-top: 20pt;">Langkah 4: Workbench Seleksi & Roster Peringkat</h2>
  <p>
    Pusat kendali evaluasi di mana seluruh kandidat diperingkat secara transparan:
  </p>

  <div class="figure-card">
    <img src="${img4}" alt="Workbench Seleksi">
    <div class="figure-caption"><strong>Gambar 1.4</strong>: Workbench Seleksi dengan Roster Pelamar, Skor Deterministik, dan Rekomendasi Band.</div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Kategori Band</th>
        <th>Rentang Skor</th>
        <th>Kondisi Syarat Wajib</th>
        <th>Rekomendasi Tindakan Recruiter</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-band-a">BAND A</span></td>
        <td>75.0 – 100.0</td>
        <td>Seluruh syarat wajib (Must-Have) terpenuhi</td>
        <td><strong>Sangat Direkomendasikan</strong>: Lanjutkan langsung ke tahap wawancara kerja.</td>
      </tr>
      <tr>
        <td><span class="badge badge-band-b">BAND B</span></td>
        <td>50.0 – 74.0</td>
        <td>Terdapat 1 syarat wajib yang belum terbukti</td>
        <td><strong>Dipertimbangkan</strong>: Perlu klarifikasi pengalaman pada aspek yang kurang.</td>
      </tr>
      <tr>
        <td><span class="badge badge-band-c">BAND C</span></td>
        <td>0.0 – 49.0</td>
        <td>2 atau lebih syarat wajib tidak terpenuhi</td>
        <td><strong>Tidak Disarankan</strong>: Kualifikasi dasar pelamar belum memenuhi standar.</td>
      </tr>
      <tr>
        <td><span class="badge" style="background:#e2e8f0; color:#334155;">BAND R</span></td>
        <td>Variatif</td>
        <td>Status bukti membutuhkan audit manual</td>
        <td><strong>Tinjauan Manual</strong>: Dokumen pelamar memiliki format yang memerlukan verifikasi manual tim HR.</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- INSPEKSI FORENSIK 4 TAB (TAB 1 & 2) -->
<div class="chapter">
  <div class="chapter-header">
    <div class="chapter-num">Audit Forensik Kandidat</div>
    <h1>Inspeksi Forensik: Tab 1 & Tab 2</h1>
  </div>

  <p>
    Klik pada baris kandidat di tabel pelamar untuk membuka panel dialog inspeksi kualifikasi secara lengkap.
  </p>

  <h2>Tab 1: Matriks Evaluasi & Bukti Verbatim</h2>
  <div class="figure-card">
    <img src="${img5}" alt="Tab Evaluasi">
    <div class="figure-caption"><strong>Gambar 2.1</strong>: Tab Evaluasi Kualifikasi menampilkan status pemenuhan kriteria beserta rincian bukti kutipan.</div>
  </div>
  <p>
    Pada tab ini, setiap butir kualifikasi lowongan dinilai dengan salah satu dari 3 status kepatuhan:
  </p>
  <ul>
    <li><span class="badge badge-strong">STRONG</span>: Terbukti penuh dengan kutipan kalimat eksak dari CV pelamar.</li>
    <li><span class="badge badge-partial">PARTIAL</span>: Terpenuhi sebagian namun ada bagian kualifikasi yang belum komprehensif.</li>
    <li><span class="badge badge-unproven">UNPROVEN</span>: Tidak ada bukti sah yang dapat ditemukan pada berkas pelamar.</li>
  </ul>

  <h2 style="margin-top: 18pt;">Tab 2: Transparansi Perhitungan Skor & Band Capping</h2>
  <div class="figure-card">
    <img src="${img6}" alt="Tab Perhitungan Skor">
    <div class="figure-caption"><strong>Gambar 2.2</strong>: Tab Perhitungan Skor menampilkan audit formula matematis, perbandingan skor mentah vs akhir, dan breakdown kategori.</div>
  </div>
  <p>
    Tab ini menjelaskan secara gamblang bagaimana angka skor akhir kandidat terbentuk:
  </p>
  <ul>
    <li><strong>Skor Mentah vs Skor Akhir</strong>: Menampilkan perbandingan antara nilai murni hasil akumulasi bobot dengan nilai akhir setelah dikenakan sanksi <em>Band Capping</em> jika ada syarat wajib yang gagal.</li>
    <li><strong>Kontribusi per Kategori</strong>: Visualisasi persentase pemenuhan pada kelompok Pengalaman Kerja, Keterampilan Teknis, Pendidikan, dan Prestasi/Sertifikasi.</li>
    <li><strong>Tabel Audit Lengkap</strong>: Rincian setiap kriteria, bobot ($W$), nilai pemenuhan ($V$), dan poin kontribusinya.</li>
  </ul>
</div>

<!-- INSPEKSI FORENSIK 4 TAB (TAB 3 & 4) -->
<div class="chapter">
  <div class="chapter-header">
    <div class="chapter-num">Audit Forensik Kandidat</div>
    <h1>Inspeksi Forensik: Tab 3 & Tab 4</h1>
  </div>

  <h2>Tab 3: Jejak Penalaran AI (ReAct Logic Trace)</h2>
  <p>
    Menyediakan transparansi alur berpikir bagi manajer dan auditor yang ingin mengetahui logika sistem:
  </p>
  <div class="figure-card">
    <img src="${img7}" alt="Tab Jejak Penalaran">
    <div class="figure-caption"><strong>Gambar 2.3</strong>: Tab Jejak Penalaran menampilkan urutan observasi logika verifikasi langkah demi langkah.</div>
  </div>
  <p>
    Sistem bekerja secara bertahap dan mencatat setiap interaksinya: mulai dari memanggil alat pemilah pengalaman kerja, mengecek kamus taksonomi peran, hingga mengirimkan cuplikan teks ke mesin verifikator TypeSafe Jev System One.
  </p>

  <h2>Tab 4: Grounding Naskah Dokumen CV Asli</h2>
  <p>
    Menghilangkan keraguan dengan menampilkan naskah utuh hasil konversi berkas pelamar:
  </p>
  <div class="figure-card">
    <img src="${img8}" alt="Tab Grounding Naskah Asli">
    <div class="figure-caption"><strong>Gambar 2.4</strong>: Tab Kutipan CV menampilkan penyorot interaktif naskah asli pelamar berdasarkan koordinat karakter dokumen.</div>
  </div>
  <p>
    Ketika Anda mengklik kutipan bukti di Tab 1, sistem secara otomatis melompat dan menyorot kalimat tersebut pada teks lengkap di Tab 4 berdasarkan koordinat karakter dokumen. Recruiter dapat langsung membaca konteks kalimat pendukungnya.
  </p>
</div>

<!-- KEPUTUSAN & EKSPOR -->
<div class="chapter">
  <div class="chapter-header">
    <div class="chapter-num">Kolaborasi & Integrasi</div>
    <h1>Keputusan Hiring Manager & Ekspor Data</h1>
  </div>

  <h2>1. Mode Buta (Blind Review Mode)</h2>
  <p>
    Untuk menjaga integritas seleksi dan meniadakan bias subjektif (seperti bias gender, usia, atau almamater tertentu), aktifkan saklar <strong>Mode Buta</strong> di atas tabel workbench.
  </p>
  <p>
    Sistem akan menyamarkan nama dan informasi identitas pelamar menjadi kode anonim (contoh: <code>Kandidat #C01</code>, <code>Kandidat #C02</code>), sehingga evaluasi benar-benar berfokus pada kecakapan kompetensi.
  </p>

  <h2>2. Catatan & Keputusan Hiring Manager</h2>
  <p>
    Di bagian atas panel inspeksi kandidat, Hiring Manager dapat menetapkan keputusan seleksi:
  </p>
  <ul>
    <li><strong>Status Keputusan</strong>: Pilih tombol <code>Shortlist</code>, <code>Hold</code>, atau <code>Tolak</code>.</li>
    <li><strong>Catatan Evaluator</strong>: Ketikkan pertimbangan kualitatif Anda pada kolom textarea (contoh: <em>"Portofolio proyek flyover sangat relevan, agendakan interview teknis"</em>).</li>
    <li><strong>Penyimpanan Persisten</strong>: Seluruh status keputusan dan catatan ini tersimpan secara otomatis dan aman di browser Anda (<em>localStorage</em>), serta muncul sebagai cuplikan langsung pada tabel pelamar.</li>
  </ul>

  <h2>3. Ekspor Rekapitulasi ke Excel / CSV</h2>
  <p>
    Setelah seluruh proses seleksi dan pemberian catatan selesai:
  </p>
  <ol>
    <li>Klik tombol <strong>Ekspor CSV</strong> di pojok kanan atas tabel pelamar.</li>
    <li>Sistem mengunduh berkas spreadsheet yang telah disematkan format khusus <strong>UTF-8 BOM</strong>.</li>
    <li>Berkas dapat langsung dibuka dengan rapi di <strong>Microsoft Excel</strong>, <strong>Google Sheets</strong>, atau diimpor ke sistem HRIS perusahaan tanpa masalah karakter rusak atau kolom yang berantakan.</li>
  </ol>
</div>

</body>
</html>`;

  console.log("Membuka browser Chromium untuk konversi ke PDF...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const outputPath = path.join(__dirname, '../docs/BUKU_PANDUAN_PENGGUNA_AI_CV_SCREENING.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      bottom: '16mm',
      left: '14mm',
      right: '14mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size: 7.5pt; font-family: sans-serif; width: 100%; text-align: right; padding-right: 14mm; color: #94a3b8;">AI CV Screening Platform — Buku Panduan Pengguna (User Manual)</div>',
    footerTemplate: '<div style="font-size: 7.5pt; font-family: sans-serif; width: 100%; text-align: center; color: #94a3b8;">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>'
  });

  await browser.close();
  console.log("PDF Berhasil dibuat di:", outputPath);
}

run().catch(err => {
  console.error("Error creating PDF:", err);
  process.exit(1);
});
