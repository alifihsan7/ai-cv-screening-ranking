# PROPOSAL ARSITEKTUR & REKAYASA SISTEM
## AI CV Screening & Ranking Berbasis Bukti (Evidence-Grounded System)
### Evaluasi Semantik Terstruktur TypeSafe Jev System One & Agregasi Deterministik

---

# 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

## 1.1 Latar Belakang & Masalah Utama
Proses seleksi resume (CV) pada volume tinggi menghadapi dua dilema ekstrem dalam praktik industri dan rekayasa kecerdasan buatan:
1. **Pendekatan Keyword Matching Tradisional (Sintaktik / ATS Klasik)**: Sangat kaku, mudah dimanipulasi dengan *keyword stuffing*, dan gagal memahami konteks semantik pekerjaan.
2. **Pendekatan Generatif LLM Penuh (*Unconstrained Generative Prompting*)**: Rentan halusinasi, menghasilkan luaran acak (*non-deterministic*), tidak dapat diaudit (*black box*), dan membutuhkan biaya token yang sangat tinggi pada volume ratusan ribu dokumen.

Lebih jauh, temuan bimbingan lapangan mengidentifikasi kelemahan krusial pada sistem pencocokan semantik standar (seperti kombinasi naive embedding cosine similarity dan pgvector):
* Vektor embedding sering gagal menangkap kedalaman kualifikasi kandidat (misal: membedakan arsitek sistem terdistribusi vs *maintenance engineer* biasa).
* Rekruter di lapangan **tidak cukup hanya diberikan jawaban biner (Yes/No)**. Mereka membutuhkan rekomendasi berupa **daftar peringkat kandidat (*ranking*)** yang transparan, adil, dan berdasar bukti nyata (*evidence-grounded*).

## 1.2 Pernyataan Solusi: Evidence-Grounded AI Screening
Sistem ini dibangun untuk menghadirkan platform penyaringan CV hibrida (*hybrid semantic-deterministic system*) dengan prinsip kerja:
* **Evaluasi Semantik Terstruktur**: Menggunakan model keputusan terstruktur murni (*System One Model* via API resmi TypeSafe Jev / `api.typesafe.ai`) untuk menguji klaim kualifikasi terhadap teks dokumen asli tanpa generasi teks bebas.
* **Perankingan Deterministik di Sisi Mesin Lokal**: Penentuan skor akhir (0–100) dan *leaderboard ranking* dihitung secara matematis menggunakan rumus terukur di backend Python lokal, bukan diserahkan kepada tebakan LLM.
* **Verifikasi Teks Unicode NFKC**: Menjamin setiap bukti yang dijadikan dasar penilaian adalah kutipan eksak (*exact substring*) dari berkas pelamar. Halusinasi bernilai 0%.
* **Auditability & Recruiter Cockpit**: Antarmuka taktil anti-slop yang memberikan kendali akhir kepada rekruter manusia (*Human-in-the-Loop*).

```
   [ Berkas Pelamar (PDF/DOCX) ]
                 │
                 ▼
     [ 1. Ingestion & Zonasi ] ─── IBM Docling (Layout-Aware)
                 │                 - Partisi: Resume vs Sertifikat/Portofolio
                 ▼
     [ 2. Zero-Hallucination ] ─── Verifikasi NFKC (Exact Substring Match)
                 │
                 ▼
     [ 3. Evaluasi Semantik ]  ─── TypeSafe Jev System One (Decisions API)
                 │                 - Noul (Hard Gate), Choice (Bukti), Score (Kedalaman)
                 ▼
     [ 4. Scorer Deterministik]─── Kalkulasi Python Lokal (Bobot + Ranking)
                 │
                 ▼
     [ 5. Recruiter Cockpit ]  ─── Dashboard Interaktif & Pengambilan Keputusan HR
```

---

# 2. BATASAN SISTEM & KEPUTUSAN ARSITEKTUR

Berdasarkan kesepakatan dan hasil evaluasi bimbingan, sistem ini menetapkan batasan arsitektur yang sangat tegas:

## 2.1 Eliminasi Obsidian / Unstructured Memory
* **Keputusan**: Tidak menggunakan Obsidian atau *external graph memory* personal sebagai basis data agen.
* **Rasional**: Data rekrutmen bersifat entitas domain terstruktur (*Candidate, Job Requirement, Work Experience, Metric Impact*). Semua state disimpan langsung pada basis data relasional PostgreSQL dengan schema terindeks, sehingga latensi rendah, deterministik, dan dapat di-query secara instan.

## 2.2 Larangan OpenRouter & Mock Lokal: Wajib Pure TypeSafe SDK
* **Keputusan**: Mengakses model Jev secara langsung melalui client resmi `AsyncTypeSafeClient` (`api.typesafe.ai`), dilarang menggunakan gateway perantara pihak ketiga (OpenRouter) maupun model tiruan lokal.
* **Rasional**: Jev System One mengadopsi protokol *Decisions API* (`/v1/alpha/decisions`) yang mengembalikan distribusi probabilitas diskrit, bukan endpoint percakapan generatif (`/v1/chat/completions`).

## 2.3 Matriks Tanggung Jawab: Kode Deterministik vs AI Semantik

| Komponen / Tugas | Eksekutor | Mengapa Bukan Komponen Lain? |
| :--- | :---: | :--- |
| **Ekstraksi Tata Letak Dokumen** | IBM Docling (Engine Lokal) | Cepat, mempertahankan hierarki heading dan tabel dua kolom tanpa biaya token. |
| **Verifikasi Integritas Kutipan** | Python Regex & Unicode NFKC | Memastikan kutipan bukti benar-benar ada di naskah asli (toleransi kesalahan 0%). |
| **Pencocokan Bukti Kualifikasi** | TypeSafe Jev System One | Mengidentifikasi kedalaman semantik dan relevansi proyek tanpa risiko teks halusinasi. |
| **Kalkulasi Skor & Penentuan Ranking** | Algoritma Python Lokal | Matematika transparan, konsisten, tidak bergeser antar pemanggilan, dan terhindar dari bias LLM. |
| **Keputusan Final Rekrutmen** | Rekruter HR (*Human-in-the-Loop*) | Memenuhi regulasi etika AI (UU PDP & PP 33/2026), AI hanya memberi rekomendasi. |

---

# 3. MENJAWAB DILEMA: DARI KEPUTUSAN BINER KE PERANKINGAN DETERMINISTIK

Pertanyaan mendasar dalam perancangan sistem: *Jika model Jev berakar pada model keputusan, bagaimana menghasilkan ranking kualitas kandidat yang adil bagi HR?*

## 3.1 Trio Primitif Evaluasi Jev System One
Sistem tidak memperlakukan evaluasi sebagai sekadar *Yes/No* biner. Jev mengadopsi tiga lapisan keputusan:

1. **`Noul` (Hard Gate / Kualifikasi Mutlak)**:
   * Menguji syarat mati (misal: "Pendidikan minimal S1 Teknik" atau "Pengalaman minimal 3 tahun").
   * Luaran: Probabilitas keyakinan $[0.0, 1.0]$. Jika ambang batas tidak terpenuhi, kandidat masuk ke kelompok `Band R (Reject)` untuk ditinjau manual.
2. **`Choice` (Tingkat Pembuktian / Level of Evidence)**:
   * Mengklasifikasikan bukti ke dalam set tertutup (*closed-set evaluation*):
     * `STRONG`: Menunjukkan kepemilikan proyek skala besar (*production scale*), tanggung jawab arsitektural, atau metrik dampak yang jelas.
     * `PARTIAL`: Pernah menggunakan teknologi tersebut namun dalam kapasitas terbatas, magang, atau tugas akademis.
     * `NOT_DEMONSTRATED`: Hanya mencantumkan nama teknologi sebagai *buzzword* tanpa konteks proyek nyata.
3. **`Score` (Kedalaman Semantik / Tie-Breaker)**:
   * Menghasilkan nilai skalar kontinu $[0.00, 1.00]$ yang merepresentasikan tingkat kematangan implementasi teknis. Digunakan sebagai pembeda utama ketika dua kandidat memiliki status `Choice` yang sama.

```
                    ┌── NOUL   : Lolos Syarat Mutlak? (Yes / No)
                    │
Kandidat ── Evaluasi ┼── CHOICE : Tingkat Bukti (STRONG / PARTIAL / NOT_DEMONSTRATED)
                    │
                    └── SCORE  : Skor Kedalaman Semantik (0.00 - 1.00)
```

## 3.2 Algoritma Agregasi & Perankingan di Python
AI dilarang mengurutkan daftar kandidat secara bebas di dalam prompt. Pengurutan dilakukan oleh mesin lokal menggunakan formula matematis:

$$\text{Fit Score} = \sum_{i=1}^{M} \left( w_i \times S_{\text{choice}}(C_i) \right) + \lambda \cdot S_{\text{depth}}$$

Keterangan:
* $w_i$: Bobot kriteria lowongan yang ditentukan oleh HR (total bobot = 100).
* $S_{\text{choice}}(C_i)$: Konversi nilai bukti (`STRONG` = 1.0, `PARTIAL` = 0.5, `NOT_DEMONSTRATED` = 0.0).
* $\lambda$: Faktor pembobot kedalaman semantik (default: 5% dari total skor).
* $S_{\text{depth}}$: Rata-rata nilai kontinu dari primitif `Score` Jev.

## 3.3 Penetapan Band Kelayakan & Peringkat (Leaderboard)
Hasil kalkulasi skor memetakan kandidat ke dalam 4 *Talent Bands*:
* **Band A (Top Candidates / Skor 85–100)**: Memenuhi seluruh syarat mutlak dengan mayoritas bukti `STRONG`. Masuk ke antrean wawancara prioritas.
* **Band B (Potential Fits / Skor 70–84)**: Memenuhi syarat mutlak dengan kombinasi bukti `STRONG` dan `PARTIAL`.
* **Band C (Under Review / Skor 50–69)**: Sebagian bukti belum memadai atau pengalaman masih dangkal.
* **Band R (Rejected / Skor < 50 atau Gagal Noul)**: Tidak memenuhi syarat mutlak lowongan.

---

# 4. PRINSIP KEADILAN: BUNDEL SERTIFIKAT VS CV TEKS EGALITER

Bagaimana sistem memperlakukan pelamar yang melampirkan bundel ijazah/sertifikat 10 halaman dibandingkan pelamar yang hanya mengirimkan CV 1 lembar?

```
Pelamar X (CV + 5 Sertifikat) ──┐
                                ├── Zonasi & Evaluasi Bukti ──► Penilaian Adil (Kompentensi > Lembaran)
Pelamar Y (CV Padat 1 Lembar) ──┘
```

Sistem menerapkan **4 Kaidah Keadilan Algoritmik (*Algorithmic Fairness*)**:
1. **Zonasi Layout Dokumen (Docling)**: Sistem memecah dokumen menjadi beberapa zona: `ZONE_RESUME`, `ZONE_CERTIFICATE`, dan `ZONE_AWARDS`. Sistem tidak menghitung ketebalan dokumen secara kumulatif.
2. **Kesesuaian Terhadap Syarat Lowongan**:
   * Jika lowongan bersifat *Verifiable License* (misal: Dokter, Akuntan Publik, Lisensi Pilot), bukti sertifikat fisik di `ZONE_CERTIFICATE` adalah syarat wajib.
   * Jika lowongan bersifat *Practical Engineering* (misal: Backend Developer), pengalaman riil membangun arsitektur di `ZONE_RESUME` memiliki bobot penilaian yang jauh lebih tinggi daripada sekadar sertifikat kelulusan kursus online.
3. **Pemisahan Skor Kompetensi vs Indikator Verifikasi**:
   * Pelamar Y (hanya CV 1 halaman) **bisa meraih peringkat 1 (Band A)** jika pengalaman praktisnya sangat kuat.
   * Lampiran sertifikat pada Pelamar X tidak menambah poin curang, melainkan hanya menyalakan tanda status `EVIDENCE: CERTIFICATE_ATTACHED`. Pelamar Y tetap diberi status `EVIDENCE: PENDING_INTERVIEW_VERIFICATION`.
4. **Mencegah Kredensialisme Murah (*Anti-Credential Inflation*)**: Sistem mengevaluasi dampak nyata proyek, bukan kuantitas kertas kursus 2 jam.

---

# 5. ARSITEKTUR PIPELINE & TAHAPAN KERJA

Pipeline kerja sistem dibangun dalam 6 tahapan modular:

```
[Tahap 1: Ingestion & Parsing]
  │  - Input: PDF / DOCX (CV tunggal atau dokumen bundel)
  │  - IBM Docling: Ekstraksi layout dua kolom, teks, tabel, dan zonasi lampiran.
  ▼
[Tahap 2: Segmentasi Bukti & Penyimpanan Terstruktur]
  │  - PostgreSQL + pgvector: Penyimpanan profil, metadata kualifikasi, dan potongan teks.
  │  - Normalisasi teks: Pembersihan whitespace dan pembentukan representasi NFKC.
  ▼
[Tahap 3: Penyusunan Kriteria Pekerjaan (Job Requirement Spec)]
  │  - HR menyusun requirement rubrics: Kriteria wajib vs kriteria pendukung, pembobotan (%).
  │  - Penentuan tipe evaluasi per kriteria (Noul untuk gate, Choice untuk kompetensi).
  ▼
[Tahap 4: Eksekusi Semantik Jev System One]
  │  - Pengambilan potongan pengalaman kandidat yang relevan.
  │  - Panggilan API TypeSafe (`Noul`, `Choice`, `Score`) untuk setiap kriteria.
  │  - Verifikasi eksak: Validasi bahwa rujukan teks benar-benar ada di dokumen asli.
  ▼
[Tahap 5: Agregasi & Perankingan Deterministik]
  │  - Scorer Python menghitung nilai akhir terbobot dan memetakan kandidat ke Band A/B/C/R.
  │  - Penyusunan papan peringkat (Leaderboard Top 3 / Top N).
  ▼
[Tahap 6: Recruiter Cockpit UI (Human-in-the-Loop)]
     - Panel inspeksi detail: Evaluasi Kriteria, Telemetri Keputusan, dan Kutipan Teks Asli.
     - Keputusan akhir rekruter: Shortlist, Hold, Reject, atau Escalate.
```

---

# 6. EFISIENSI TOKEN & BIAYA INFRASTRUKTUR

Salah satu keunggulan utama arsitektur ini adalah efisiensi operasional yang sangat ekstrem jika dibandingkan dengan pendekatan LLM generatif penuh:

| Parameter Evaluasi | Full Generative LLM (Chat API) | TypeSafe Jev System One | Efisiensi & Keunggulan |
| :--- | :---: | :---: | :---: |
| **Model Biaya Input** | ~$1.00 – $3.00 / 1M token | $0.042 / 1M token | **95–98% Lebih Hemat Biaya** |
| **Biaya Output (Generasi)** | ~$2.00 – $10.00 / 1M token | $0.00 (Tanpa Biaya Output) | **Biaya Generasi Nol** |
| **Konsumsi Token / CV** | ~5,000 – 12,000 token | ~600 – 1,000 token | Mengurangi beban bandwidth |
| **Kapasitas Skala ($5)** | ~300 – 800 CV | **150,000 – 200,000 CV** | Skalabilitas skala korporasi |
| **Determinisasi Output** | Stokastik (Bisa berubah) | Deterministik (Probabilitas diskrit) | Auditabilitas hukum terjamin |
| **Risiko Halusinasi Teks** | Tinggi (Mengarang pengalaman) | **0%** (Exact substring match) | Integritas data mutlak |

---

# 7. SPESIFIKASI ANTARMUKA PENGGUNA (RECRUITER COCKPIT)

Antarmuka dibangun dengan standar ergonomi taktil anti-slop, mengutamakan kecepatan membaca data tanpa elemen dekoratif yang mubazir:
* **Tiga Tab Inspeksi Seimbang**:
  1. **Tab Evaluasi**: Rincian kriteria penilaian, bobot, status pembuktian (`STRONG` / `PARTIAL`), dan catatan analisis semantik.
  2. **Tab Telemetri**: Rekam jejak waktu komputasi, model confidence, dan catatan jejak reasoning.
  3. **Tab Kutipan CV**: Penampil teks asli dokumen kandidat yang disorot (*highlight*) secara interaktif, membuktikan bahwa alasan penilaian berakar langsung pada kalimat asli pelamar.
* **Segmented Decision Bar**: Memberikan kontrol cepat bagi rekruter untuk menetapkan status seleksi (*Shortlist*, *Hold*, *Reject*, *Wawancara*).

---

# 8. KESIMPULAN & TAHAP EKSEKUSI BERIKUTNYA

Pendekatan rekayasa sistem yang diusulkan berhasil menjembatani kebutuhan bisnis rekrutmen:
1. Menghadirkan **kecepatan dan kecerdasan semantik** melalui TypeSafe Jev System One tanpa risiko halusinasi.
2. Menghasilkan **rekomendasi peringkat (*ranking*) yang transparan dan dapat dijelaskan secara matematis**, bukan sekadar biner Yes/No.
3. Menjamin **keadilan evaluasi dokumen**, baik bagi pelamar berbundel sertifikat maupun pelamar dengan CV ringkas.
4. Memberikan **efisiensi biaya operasional masif**, memungkinkan pemrosesan ratusan ribu CV dengan biaya minimal.

### Tahap Tindak Lanjut:
* Mengintegrasikan API key resmi TypeSafe pada modul `src/domain/verifier.py`.
* Melakukan benchmark komparatif (akurasi ranking dan latensi) antara model dasar vs Jev System One.
* Melakukan uji coba golden dataset pada skenario CV nyata multi-halaman.
