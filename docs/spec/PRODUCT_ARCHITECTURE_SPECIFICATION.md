# PRODUCT ARCHITECTURE SPECIFICATION
## AI-Assisted Agentic CV Screening & Evidence-Based Verification Platform
### Engineering RFC & Product Requirements Document (PRD) — Production Baseline v2.0

| Metadata | Spesifikasi |
| :--- | :--- |
| **Dokumen ID** | `SPEC-PROD-2026-CV-01` |
| **Status** | `APPROVED / ACTIVE SPECIFICATION` |
| **Klasifikasi** | Internal Engineering Architecture RFC & Production PRD |
| **Target Repositori** | `/home/alifihsan/agentic-cv-screener` |
| **Pemilik Produk & Referensi** | Zafira (`AI-Assisted CV Screening Platform — Research & Architecture`) |
| **Lead Systems Architect** | Zephyr (Principal Systems Architect & Founding Product Engineer) |
| **Versi Spesifikasi** | `2.0.0-PROD` |
| **Tanggal Efektif** | 24 Oktober 2026 |

---

## DAFTAR ISI

1. [Executive Summary & Core Design Philosophy](#1-executive-summary--core-design-philosophy)
   - 1.1 Problem Statement: Krisis Bandwidth Rekruter vs Volume Pelamar Eksponensial
   - 1.2 Kegagalan Paradigma Konvensional: Regresifitas Heuristik & Patologi LLM Generatif
   - 1.3 Core Design Philosophy: Deterministic-First Evidence Engine
   - 1.4 Postulat Arsitektur Kunci
2. [Regulatory & Compliance Context](#2-regulatory--compliance-context)
   - 2.1 Kepatuhan Yuridis Multiyurisdiksi
   - 2.2 Invarian Rekayasa: Verbatim Code-Level Proof Over Probabilistic Assertion
   - 2.3 Hak Keberatan & Mekanisme Human-in-the-Loop Sovereign Gate
3. [Technology Radar & Benchmark Decisions](#3-technology-radar--benchmark-decisions)
   - 3.1 Evaluasi Parser Dokumen: Text-Layer PDF vs OCR vs VLM Cascade
   - 3.2 Dense Embedding & Cross-Encoder Reranker
   - 3.3 Database Vektor: PostgreSQL 16 + pgvector vs Managed Pinecone Cloud
   - 3.4 Ringkasan Tech Stack Terpilih
4. [Explicit System Boundaries: What SHOULD and SHOULD NOT Use AI](#4-explicit-system-boundaries-what-should-and-should-not-use-ai)
   - 4.1 Matriks Batasan Sistem: Kode Deterministik vs AI Semantik
   - 4.2 Rasional First-Principles: Patologi Floating-Point & Lost-in-the-Middle
5. [End-to-End System Architecture & Workflows](#5-end-to-end-system-architecture--workflows)
   - 5.1 Diagram Topologi Arsitektur Sistem Modular Monolith
   - 5.2 Alur 1: Offline Ingestion Path (Asinkron)
   - 5.3 Alur 2: Job Requirement Compilation & Approval Path
   - 5.4 Alur 3: Online Screening & Evaluation Path
   - 5.5 Alur 4: Human Recruiter Decision & Forensic Audit Path
6. [Domain Data Contracts & Pydantic Schemas](#6-domain-data-contracts--pydantic-schemas)
   - 6.1 Schema Enums & Primitive Value Objects
   - 6.2 Kontrak Provenance & Evidence Citation
   - 6.3 Kontrak Pemisahan Fakta vs Inferensi
   - 6.4 Kontrak Profil Kandidat: CandidateProfile vs MatchingProfile
   - 6.5 Kontrak Requirement Rubric & Evaluation Dossier
   - 6.6 Kontrak State Machine Autonomous Agent
7. [Subsystem Deep Dives](#7-subsystem-deep-dives)
   - 7.1 Subkomponen Eksisting (Terimplementasi & Aktif)
     - 7.1.1 PyMuPDF Ingestion Sanitizer & Anti-Adversarial Inspection
     - 7.1.2 Mesin Pencarian Hibrida FX-32 (Dense HNSW + Sparse FTS RRF k=60)
     - 7.1.3 Deterministic Grounding Verifier & Context-Elevation Guard
     - 7.1.4 Autonomous ReAct Engine (Reason-Act-Observe-Reflect)
     - 7.1.5 Policy Linter & PII Cryptographic Isolation (`pgp_sym_encrypt`)
     - 7.1.6 Tactile Anti-Slop Interface & Forensic Canvas
   - 7.2 Subkomponen Rencana Masa Depan (Future Roadmap)
     - 7.2.1 Cetak Biru Integrasi Jev System One (TypeSafe AI) & RLCD Primitives
     - 7.2.2 Scalability & Vector Store Abstraction (`BaseVectorStore` Repository Pattern)
     - 7.2.3 Multi-Modal Forensic Inspection (Font Splicing, Digital Stamp & X.509)
8. [Recruiter Ergonomics & UI/UX State Machine](#8-recruiter-ergonomics--uiux-state-machine)
   - 8.1 Prinsip Desain Antarmuka Rekruter
   - 8.2 Siklus Hidup State Machine UI Rekruter
   - 8.3 Blind Screening Protocol & Unmasking Audit Gate
   - 8.4 Export Dossier Multi-Format (XLSX, CSV, Eval JSON)
9. [Infrastructure, Deployment, & Hardware Footprint](#9-infrastructure-deployment--hardware-footprint)
   - 9.1 Topologi Deployment & Docker Containerization
   - 9.2 Resource Profiling & Hardware Footprint
   - 9.3 Budget Latensi & Throughput Target
   - 9.4 Model Gateway Caching & Efisiensi Biaya Operasional ($0.00 Marginal Cost)
10. [Phased Engineering Roadmap & Milestone Checklist](#10-phased-engineering-roadmap--milestone-checklist)
    - 10.1 Rincian Milestone M0 hingga M6
    - 10.2 Kriteria Evaluasi Golden Dataset (JD-01, JD-02, Edge Cases E1–E8)
    - 10.3 Post-MVP Strategic Roadmap (Fase 5)

---

## 1. EXECUTIVE SUMMARY & CORE DESIGN PHILOSOPHY

### 1.1 Problem Statement: Krisis Bandwidth Rekruter vs Volume Pelamar Eksponensial
Dalam lanskap rekrutmen modern, tim *Human Resources* (HR) dan *Talent Acquisition* menghadapi asimetri struktural yang melumpuhkan:
1. **Volume Pelamar Masif:** Satu lowongan pekerjaan teknis (seperti *Software Engineer*, *Data Scientist*, atau *Product Manager*) di Indonesia dan Asia Tenggara rutin menerima 200 hingga 1.500 berkas lamaran (*Curriculum Vitae* / CV) dalam kurun waktu 7 hari pertama pasca publikasi.
2. **Keterbatasan Kognitif Manusia (*Cognitive Bottleneck*):** Waktu rata-rata yang dialokasikan seorang rekruter profesional untuk meninjau satu berkas CV berkisar antara 6 hingga 15 detik pada penapisan awal. Membaca 300 berkas lamaran secara teliti menuntut 15 hingga 25 jam kerja intensif.
3. **Kelelahan & Inkonsistensi Kognitif (*Fatigue Drift*):** Evaluasi manusia menderita degradasi konsistensi temporal. Kandidat ke-5 dievaluasi dengan ketajaman kognitif optimal, sedangkan kandidat ke-250 dinilai di bawah tekanan kelelahan mental, memicu *false negative* terhadap talenta luar biasa dan bias penilaian subjektif.
4. **Kebutuhan Bisnis:** Rekruter tidak membutuhkan klasifikasi biner kasar (*Yes/No*), melainkan daftar prioritas bergradasi halus (*ranked shortlist*) 5–10 kandidat teratas yang dilengkapi dengan **alasan transparan dan bukti kutipan langsung dari dokumen asli**.

### 1.2 Kegagalan Paradigma Konvensional: Regresifitas Heuristik & Patologi LLM Generatif
Solusi otomatisasi industri sebelumnya terbelah menjadi dua ekstrem yang sama-sama cacat fundamental:

```
[EKSTREM 1: ATS KONVENSIONAL BERBASIS REGEX / KATA KUNCI]
Dokumen CV ──► Pencocokan Leksikal Statis ──► Filter Kaku
Kelemahan: Kebutaan konteks (context blindness), gagal polisemik ("Kafka" != "Distributed PubSub"),
           mudah dimanipulasi dengan keyword stuffing & teks putih.

[EKSTREM 2: GENERATIVE LISTWISE LLM PROMPTING NAIF]
[CV 1, CV 2, ..., CV 30] ──► Prompt Panjang ke LLM ──► Peringkat Generatif Langsung 1..30
Kelemahan: Degradasi atensi spasial ("Lost in the Middle"), halusinasi kutipan bukti,
           bias posisi (primacy/recency), non-deterministik (urutan berubah saat diulang),
           kegagalan fatal pada komputasi aritmatika floating-point.
```

### 1.3 Core Design Philosophy: Deterministic-First Evidence Engine
Platform ini menolak kedua pendekatan di atas dan mengoperasionalkan filosofi **Deterministic-First Evidence Engine**:

1. **Kode yang Menghitung, Bukan Model (*Code Computes, Not Models*):**
   Model bahasa (*LLM / Micro-Verifier*) **DILARANG KERAS** menghitung skor akhir (0–100) atau menyusun urutan ranking secara generatif. Skor akhir adalah fungsi matematika tertutup murni yang dihitung oleh kode Python deterministik (`scorer.py`) dari bobot kriteria dikalikan status kualitatif diskrit.
2. **LLM Hanya untuk Persepsi Mikro (*Narrow Micro-Perception Only*):**
   Kapasitas pemahaman bahasa alami (NLU) dibatasi secara ketat pada tugas mikro: ekstraksi entitas semantik yang berantakan, normalisasi sinonim ke taksonomi kanonikal, dan klasifikasi derajat pemenuhan kriteria ambigu ke dalam pilihan diskrit tertutup:
   $$\mathcal{Y} \in \{\text{STRONG}, \text{PARTIAL}, \text{NOT\_DEMONSTRATED}\}$$
3. **Pemisahan Skala Epistemik (Mikro vs Makro):**
   - *Tingkat Mikro:* Persepsi teks, identifikasi interval tanggal, ekstraksi kalimat bukti.
   - *Tingkat Makro:* Normalisasi kategori, penerapan batas kualifikasi (*band capping* A/B/C/R), pemecahan seri (*tie-breaking*), dan penyusunan urutan peringkat.
4. **Postgres-Centric Sovereign Architecture:**
   Seluruh siklus data—metadata relasional, teks profil teredaksi, jejak penelusuran audit (*audit trails*), antrean pemrosesan worker, indeks pencarian leksikal teks lengkap (*FTS simple*), hingga indeks vektor graf (*HNSW* via `pgvector`)—berada di dalam satu instans basis data PostgreSQL 16 ACID. Tidak ada data pribadi pelamar yang di-egress ke layanan vektor pihak ketiga.
5. **Recruiter Approves Every Shortlist (Kedaulatan Manusia Penuh):**
   Mesin hanya menyajikan rekomendasi, skor terurai, dan kutipan bukti verbatim. Sistem **TIDAK PERNAH** menolak kandidat secara otomatis. Tombol penolakan (*"Tidak Lanjut"*) hanya dapat ditekan oleh rekruter manusia dengan menyertakan alasan tertulis wajib.

### 1.4 Postulat Arsitektur Kunci
- **Postulat 1 (Zero Generative Listwise Ranking):** Ranking kandidat tidak boleh dihasilkan dari pemanggilan model generatif tunggal dengan konteks masukan jamak.
- **Postulat 2 (Verbatim Grounding Invariant):** Setiap kutipan kualifikasi yang disajikan kepada rekruter wajib lolos uji kecocokan substring eksak (*exact substring match*) terhadap teks dokumen mentah oleh kode Python. Kutipan yang gagal lolos verifikasi dibuang seketika dan ditandai flag `GROUNDING_FAIL`.
- **Postulat 3 (Reproducibility Invariant):** Screening yang dijalankan ulang pada run snapshot yang sama dengan konfigurasi identik wajib menghasilkan skor, band, status kriteria, dan urutan ranking yang $100\%$ identik ($\sigma^2_{\text{rank}} = 0.00$).

---

## 2. REGULATORY & COMPLIANCE CONTEXT

Penyaringan berkas lamaran kerja bukan sekadar masalah optimasi *Information Retrieval* (IR), melainkan domain dengan implikasi hukum ketenagakerjaan, hak asasi manusia, dan perlindungan privasi data pribadi yang ketat. Arsitektur sistem dirancang sejak hari pertama (*compliance-by-design*) untuk memenuhi empat regulasi utama:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
 matrix KEPATUHAN YURIDIS GLOBAL & DOMESTIK
├──────────────────────┬──────────────────────────────┬──────────────────────────────────┤
 Regulasi Yuridis     Kebutuhan Wajib Regulasi       Implementasi Arsitektur Sistem      
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
 PP 33/2026 Indonesia  Hak atas penjelasan dan hak    Endpoint POST /candidates/{id}/   
 (Turunan UU PDP)      keberatan atas pemrosesan      object mengubah status kandidat ke 
                       keputusan otomatis murni       MANUAL_ONLY. Skor tidak menolak.   
 EU AI Act             High-Risk AI System            Human-in-the-loop sovereign gate,  
 (Annex III, Point 4a) (Employment & Recruitment)     audit log append-only, dokumen     
                       Wajib transparansi & audit     dossier terurai, zero bias linter. 
 NYC Local Law 144     Audit bias tahunan berkala     Metrik dampak rasio independen,    
 (AEDT Rule)           pada Automated Employment      blind screening default, logging   
                       Decision Tools                 demografis terisolasi & terenkripsi
 UU PDP No. 27/2022    Kedaulatan data & perlindungan candidate_identities terpisah fisik
 (Indonesia)           data pribadi sensitif (PII)    dan dienkripsi pgp_sym_encrypt.    
                       Larangan data egress liar      Zero raw CV egress to public LLMs. 
└──────────────────────┴──────────────────────────────┴──────────────────────────────────┘
```

### 2.1 Kepatuhan Yuridis Multiyurisdiksi

#### A. PP 33/2026 Indonesia (Peraturan Pelaksana UU PDP)
Pasal-pasal pemrosesan data otomatis dalam regulasi ketenagakerjaan dan data pribadi Indonesia memberikan hak mutlak bagi subjek data untuk:
1. Mengetahui logika pemrosesan di balik penilaian profilnya.
2. Mengajukan keberatan terhadap keputusan yang semata-mata dihasilkan oleh algoritma komputer tanpa campur tangan manusia (*purely automated decision-making*).
- **Implementasi:** Endpoint `/candidates/{candidate_id}/object` disediakan bagi kandidat yang menggunakan hak keberatannya. Status kandidat seketika berubah menjadi `MANUAL_ONLY`, mengeluarkan profil dari pemeringkatan algoritma, dan menguncinya untuk pemeriksaan eksklusif oleh rekruter manusia.

#### B. EU Artificial Intelligence Act (High-Risk Classification)
Sesuai Annex III butir 4(a), sistem kecerdasan artifisial yang digunakan untuk penapisan berkas lamaran, penentuan peringkat kandidat, atau evaluasi kualifikasi rekrutmen diklasifikasikan sebagai **High-Risk AI Systems**. Sistem ini diwajibkan memiliki:
1. *Risk Management System:* Mitigasi terhadap kegagalan halusinasi dan bias historis.
2. *Data Governance:* Dataset pelatihan/evaluasi terbebas dari atribut diskriminatif.
3. *Technical Documentation & Record-Keeping:* Jejak logging eksekusi otomatis tanpa celah modifikasi (*immutable append-only audit trail*).
4. *Human Oversight:* Rekruter manusia mempertahankan wewenang penuh untuk menganulir (*override*) sistem.

#### C. NYC Local Law 144 (Audit Bias Algoritmik)
Regulasi AEDT New York City mewajibkan audit bias tahunan independen terhadap alat seleksi pekerjaan otomatis untuk menghitung rasio seleksi lintas gender, ras, dan kelompok etnis (*Impact Ratio*).
- **Implementasi:** Desain *blind screening* meniadakan seluruh variabel proteksian dari penilaian teknis, disertai *counterfactual fairness testing* (seperti pengujian pasangan uji E5a vs E5b pada Golden Dataset).

#### D. UU PDP No. 27/2022 (Kedaulatan Data & Proteksi PII)
Pengiriman data pribadi pelamar (nama lengkap, NIK, alamat tempat tinggal, nomor telepon, riwayat medis) ke server API publik luar negeri tanpa *explicit consent* dan mekanisme transfer lintas batas yang sah merupakan pelanggaran hukum berat.
- **Implementasi:** Seluruh teks CV mentah disanitasi dan diredaksi secara lokal di dalam perimeter VPC sebelum proses vektorisasi dan penalaran. Identitas asli pelamar diisolasi ke dalam tabel fisik terenkripsi `candidate_identities`.

### 2.2 Invarian Rekayasa: Verbatim Code-Level Proof Over Probabilistic Assertion
Untuk memenuhi standar kepatuhan hukum yang dapat diaudit di pengadilan ketenagakerjaan, sistem memberlakukan invarian absolut:
$$\text{ClaimValidity}(C) \iff \exists s \in D_{\text{raw}} : \mathcal{N}(s) == \mathcal{N}(\text{quote}) \land \text{len}(\mathcal{N}(s)) \ge 5$$
Setiap poin kelebihan (*strength*) atau status kualifikasi kriteria yang disajikan di antarmuka rekruter wajib mengikat (*anchor*) ke nomor halaman, koordinat *bounding box* (bila tersedia), dan rentang offset karakter absolut (`char_start`, `char_end`) dari dokumen asli yang diverifikasi oleh interpreter Python, bukan oleh pengakuan model bahasa.

---

## 3. TECHNOLOGY RADAR & BENCHMARK DECISIONS

Keputusan pemilihan tumpukan teknologi didasarkan pada prinsip keandalan deterministik, efisiensi komputasi *single-node*, kedaulatan data, dan kepatuhan lisensi perangkat lunak komersial.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
 TECHNOLOGY RADAR & ARCHITECTURAL TRADEOFF MATRIX
├──────────────────────┬──────────────────────────────┬──────────────────────────────────┤
 Lapisan Sistem        Pilihan Teradopsi              Alternatif Ditolak & Rasionalitas  
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
 Document Ingestion    PyMuPDF (fitz) + Docling       PyPDF / PDFMiner: Ekstraksi kolom  
                       TableFormer (Dual Layer)       hancur total pada layout Canva.    
                                                      Tesseract murni: Lambat, noise tinggi
 Embeddings            microsoft/harrier-oss-v1-0.6b  OpenAI text-embedding-3-small:     
                       (640-dimensi, MIT)             Melanggar kedaulatan UU PDP.       
                                                      e5-mistral-7b: Terlalu boros RAM.  
 Reranker (Fase 2)     BAAI/bge-reranker-v2-m3        Cohere Rerank API: Network latency 
                       (Apache 2.0)                   tinggi & data egress.              
 Vector Database       PostgreSQL 16 + pgvector       Pinecone / Milvus: Risiko split-   
                       (HNSW in-database, ACID)       brain dual-write, latensi remote   
                                                      30-80ms vs <1ms in-process Postgres.
 Runtime Backend       Python 3.12 + FastAPI          Node.js / Express: Minim ekosistem 
                       + Pydantic v2                  machine learning & vector math.    
 Frontend SPA          React 18 + Vite + TypeScript   Streamlit / Gradio: Slop UI kaku,  
                       + Tailwind + TanStack Table    tidak mendukung manipulasi canvas. 
 Worker Queue          PostgreSQL jobs table          Redis + Celery: Tambahan dependensi
                       (FOR UPDATE SKIP LOCKED)       state terpisah, non-ACID recovery. 
└──────────────────────┴──────────────────────────────┴──────────────────────────────────┘
```

### 3.1 Evaluasi Parser Dokumen: Text-Layer PDF vs OCR vs VLM Cascade
Berdasarkan uji empiris pada korpus CV heterogen (Canva multi-kolom, Word to PDF, dan hasil scan):
1. **Tier 1 — Direct Text Extraction (PyMuPDF / pypdfium2):**
   - *Kelebihan:* Latensi ultra-rendah (<100 ms per 3 halaman), preservasi posisi karakter eksak (*char offsets*).
   - *Kelemahan:* Gagal membaca urutan logis pada layout multi-kolom kompleks jika dibaca naif per blok stream PDF.
2. **Tier 2 — Layout-Aware Document Parsing (IBM Docling TableFormer):**
   - *Kelebihan:* Mengenali hierarki pembacaan multi-kolom (*reading order*) secara akurat. Memisahkan sidebar kontak dari pengalaman kerja utama (mengatasi temuan uji CV Asli #2).
   - *Kelemahan:* Beban komputasi CPU menengah (~1.2–2.5 detik per dokumen).
3. **Tier 3 — Fallback OCR (PaddleOCR PP-OCRv5/v6 vs Tesseract):**
   - *Keputusan:* Deteksi layout **WAJIB** mendahului OCR. Melakukan OCR pada berkas 2-kolom tanpa pemotongan bounding box kolom mencampur teks pengalaman kerja dengan daftar keterampilan di sidebar. Tesseract membutuhkan paket bahasa `ind+eng` untuk mencegah salah baca glif (misal: `$1 Pendidikan` vs `S1 Pendidikan`).
4. **Lisensi Hukum:* Penggunaan PyMuPDF komersial wajib memperhatikan klausul lisensi Artifex (AGPLv3) atau memanfaatkan runtime isolated CLI / wrapper pypdfium2 (Apache 2.0) pada jalur distribusi komersial murni.

### 3.2 Dense Embedding & Cross-Encoder Reranker
- **Pilihan Utama: `microsoft/harrier-oss-v1-0.6b` / Harrier-270M (640-dimensi, Lisensi MIT):**
  - Dirancang khusus untuk retrieval informasi multi-bahasa (Indonesia - Inggris).
  - Dimensi 640 memberikan kompresi ruang memori optimal pada indeks HNSW pgvector tanpa degradasi semantik.
  - Berjalan efisien pada CPU x86_64 VPS dengan latensi inferensi batch < 25 ms.
- **Alternatif Terbuka: `Qwen/Qwen3-Embedding-0.6B` (Apache 2.0):**
  - Multilingual performa tinggi dengan dukungan panjang token adaptif.
- **Reranker Pipeline: `BAAI/bge-reranker-v2-m3` (Apache 2.0):**
  - Digunakan pada tahap seleksi bukti mikro untuk kriteria bernilai tinggi (*high-weight requirements*). Model membaca pasangan `(kriteria, chunk_bukti)` secara cross-attentive untuk memeringkat 3 potongan bukti paling faktual sebelum diserahkan ke micro-verifier.

### 3.3 Database Vektor: PostgreSQL 16 + pgvector vs Managed Pinecone Cloud
Analisis arsitektural komparatif menetapkan PostgreSQL 16 + `pgvector` sebagai pilihan mutlak:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
 PERBANDINGAN ARSITEKTUR BASIS DATA VEKTOR
├──────────────────────────────┬──────────────────────────┬──────────────────────────────┤
 Dimensi Evaluasi              PostgreSQL 16 + pgvector   Managed Cloud (Pinecone)       
├──────────────────────────────┼──────────────────────────┼──────────────────────────────┤
 Batas Transaksi (ACID)        Satu batas transaksi ACID  Dual-Write Hazard (Inkonsisten)
 Latensi Query                 < 1.0 ms (In-memory buffer) 30.0 - 80.0 ms (Network hop)  
 Kedaulatan Data (UU PDP)      100% On-Premise / VPS Lokal Data pribadi/vektor keluar yurisdiksi
 Biaya Operasional Marginal    $0.00 (Bagian dari Postgres) $70 - $350 / bulan tier awal  
 Overhead Operasional          Zero tambahan container    API management, sync state API 
 Kemampuan Hybrid Search       Native SQL (HNSW <=> + FTS) Butuh 2 query & fusi eksternal 
 Backup & Disaster Recovery    pg_dump tunggal atomik     Dual backup terpisah tak sinkron
└──────────────────────────────┴──────────────────────────┴──────────────────────────────┘
```

**Kesimpulan Rekayasa:** Penggunaan basis data vektor eksternal (Pinecone) memasukkan *distributed systems failure modes* (seperti kegagalan penulisan dokumen ke Postgres sementara vektor sudah tertulis di Pinecone), biaya overhead jaringan, serta potensi pelanggaran transfer data lintas batas UU PDP. In-database HNSW pgvector menjamin integritas referensial dan latensi komputasi lokal.

---

## 4. EXPLICIT SYSTEM BOUNDARIES: WHAT SHOULD AND SHOULD NOT USE AI

Batas sistem (*system boundary*) ditetapkan secara eksplisit untuk mencegah *AI bloat* dan menjamin bahwa probabilitas stokastik tidak mengontaminasi fondasi aritmatika sistem.

### 4.1 Matriks Batasan Sistem: Kode Deterministik vs AI Semantik

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 MATRIKS PEMISAHAN TANGGUNG JAWAB: DETERMINISTIK VS ARTIFICIAL INTELLIGENCE
├──────────────────────────────────────┬───────────────────────────────────────────────────────────┤
 Domain / Komponen Sistem               Teknologi Penanganan & Rasionalitas Desain                  
├──────────────────────────────────────┼───────────────────────────────────────────────────────────┤
 [DILARANG MENGGUNAKAN AI]                                                                         
 1. Perhitungan Skor Akhir (0 - 100)    KODE DETERMINISTIK PYTHON (scorer.py)                       
                                        Aritmatika floating-point terbobot. LLM tidak memiliki ALU. 
 2. Penentuan Peringkat (1..N)          KODE DETERMINISTIK PYTHON (scorer.py)                       
                                        Sorting hierarkis berjenjang. Mencegah rank drift.          
 3. Pembatasan Kualifikasi (Band Cap)   KODE DETERMINISTIK PYTHON (scorer.py)                       
                                        Aturan batas Band A (100), B (74), C (49), R (Manual).      
 4. Pemecahan Seri (Tie-Breaking)       KODE DETERMINISTIK HASH SHA-256                             
                                        hash(run_id, candidate_id). Bebas bias posisi & upload.    
 5. Verifikasi Kutipan Bukti (Grounding)KODE DETERMINISTIK SUBSTRING MATCHING                       
                                        quote ⊆ raw_cv_text. Model bahasa dilarang validasi mandiri.
 6. Penghitungan Durasi & Tanggal Kerja FUNGSI ARITMATIKA KALENDER DETERMINISTIK                    
                                        (end_year - start_year)*12 + delta_month. Penggabungan iris.
 7. Linter Anti-Diskriminasi (JD/Req)   EXPRESSION REGULER DETERMINISTIK                            
                                        Regex boundary match untuk usia, gender, suku, dan agama.   
 8. Penolakan Kandidat (Rejection)      MANUSIA ASLI (RECRUITER HUMAN DECISION)                     
                                        Tombol "Tidak Lanjut" dengan kewajiban input catatan alasan.
──────────────────────────────────────┼───────────────────────────────────────────────────────────┤
 [DIIZINKAN & DIOPTIMALKAN DENGAN AI]                                                              
 1. Ekstraksi Profil CV Tidak TerstrukturIBM Docling TableFormer / Layout-Aware Parser              
                                        Membaca tata letak multi-kolom dan memecah blok semantik.   
 2. Normalisasi Sinonim & Taksonomi     Embedding Similarity (Harrier-270M >= 0.85) + RapidFuzz     
                                        Memetakan "Postgres" ke concept_id "skill:postgresql".      
 3. Verifikasi Semantik Kriteria Ambigu Jev System One / LLM Micro-Verifier (Pilihan Tertutup)     
                                        Menilai pemenuhan tanggung jawab: STRONG / PARTIAL / NOT.   
 4. Drafting Kriteria Otomatis dari JD  Model Gateway LLM (JSON Schema Structured Output)           
                                        Mengekstrak draft kriteria awal untuk disetujui rekruter.   
 5. Sintesis Ringkasan Kelebihan/KekuranganTemplate Faktual Terarah Berdasarkan Bukti Terverifikasi 
                                        Bukan esai generatif bebas; teks dirangkai dari bukti nyata.
└──────────────────────────────────────┴───────────────────────────────────────────────────────────┘
```

### 4.2 Rasional First-Principles: Patologi Floating-Point & Lost-in-the-Middle
1. **Absensi Arithmetic Logic Unit (ALU) pada Model Generatif:**
   Model autoregresif transformer memprediksi probabilitas token berikutnya:
   $$P(w_t \mid w_{<t}) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
   Meminta LLM menghitung formula multi-kriteria:
   $$\text{Score} = 100 \times \frac{\sum w_j \cdot v(m_j)}{\sum w_j}$$
   menghasilkan token numerik probabilistik yang terdistorsi oleh asosiasi angka pada corpus pra-pelatihan. Deviasi angka floating-point sekecil $1.5$ poin dapat mengubah urutan peringkat kandidat secara tidak adil.
2. **Degradasi Atensi Spasial ("Lost in the Middle"):**
   Penelitian formal Liu et al. (2023) membuktikan penurunan tajam pada representasi atensi token yang terletak di tengah konteks dokumen panjang ($0.2L - 0.8L$). Mengumpankan 15 hingga 50 CV ke dalam satu jendela konteks LLM menjamin terjadinya bias posisi (*primacy and recency effect*). Menilai setiap kandidat secara independen (*pointwise isolation*) adalah satu-satunya jaminan matematis perlakuan setara.

---

## 5. END-TO-END SYSTEM ARCHITECTURE & WORKFLOWS

Arsitektur sistem dibangun dengan pola **Modular Monolith** dengan dekopel ketat antara ingestion worker, retrieval engine, verification state machine, dan human review dashboard.

### 5.1 Diagram Topologi Arsitektur Sistem Modular Monolith

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AI7 SOLARIS CV SCREENER TOPOLOGY                                 │
│                                                                                                  │
│  [Recruiter Browser] ──HTTPS──► [Caddy Reverse Proxy]                                            │
│                                           │                                                      │
│                                ┌──────────┴──────────┐                                           │
│                                ▼                     ▼                                           │
│                    [React 18 SPA Static]     [FastAPI API Backend]                               │
│                    (TanStack, Canvas, pdf.js) (Uvicorn /api/v1)                                  │
│                                                      │                                           │
│                                        ┌─────────────┼─────────────┐                             │
│                                        ▼             ▼             ▼                             │
│                                  [Auth & RBAC] [Jobs & Reqs] [Screening Runs]                    │
│                                        │             │             │                             │
│                                        └─────────────┼─────────────┘                             │
│                                                      │                                           │
│                    ┌─────────────────────────────────┴─────────────────────────────────┐         │
│                    ▼                                                                   ▼         │
│     [PostgreSQL 16 + pgvector]                                             [Worker Service]      │
│     ├── users & jobs & audit_logs                                          (SKIP LOCKED Loop)    │
│     ├── candidate_identities (pgp_sym_encrypt)                             ├── Ingestion Pipe    │
│     ├── candidate_profiles & profile_chunks (HNSW vector)                  ├── Harrier Embedder  │
│     ├── screening_runs & candidate_scores & evidence                       ├── ReAct Engine      │
│     └── jobs_queue (Transactional Task Spooler) ◄──────────────────────────┼── Grounding Guard   │
│                                                                            └── Scorer MCDA       │
│                                                                                      │           │
│                                                                  ┌───────────────────┴────────┐  │
│                                                                  ▼                            ▼  │
│                                                       [Local 9Router Gateway]      [Jev System One]
│                                                       (Semaphore Concurrency: 5)   (TypeSafe Cloud)
│                                                       http://127.0.0.1:20128/v1    (Future Phase 5)
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Alur 1: Offline Ingestion Path (Asinkron)

```
[Upload CV Mentah: Multipart / ZIP]
               │
               ▼
   [Magic Bytes MIME Validator] ──(Tidak Valid)──► Status: REJECTED (Alasan: INVALID_FORMAT)
               │
               ▼
   [ClamAV Malware Scanning]    ──(Terinfeksi)──► Karantina & REJECTED (MALWARE_DETECTED)
               │
               ▼
   [SHA-256 Deduplication Check]──(Duplikat Job)─► Status: DUPLICATE (Tunjuk berkas awal)
               │
               ▼
   [Secure Storage Engine] ──────► Simpan ke /data/cv-vault/ (Izin Berkas: 0600)
               │
               ▼
   [PyMuPDF Adversarial Inspection]
   ├── Render Mode 3 Scanner (3 Tr)
   ├── Micro-Font Detector (< 2.0 pt)
   ├── Low-Contrast / White Text (WCAG < 1.20:1)
   └── Zero-Width Invisible Unicode Scrubber
               │
               ▼
   [Layout-Aware Parser / Docling]
   ├── Ekstraksi Hierarki Multi-Kolom
   └── Pemetaan Karakter Offset Absolut (char_start, char_end)
               │
               ▼
   [PII Redaction & Cryptographic Severance]
   ├── candidate_identities ──► Enkripsi AES-256 via pgp_sym_encrypt
   └── matching_profile     ──► Tokenisasi Anonim: [NAMA_TEREKDAKSI], Telp/Email Dihapus
               │
               ▼
   [Skill Taxonomy Normalizer] ──► Aliases Match -> RapidFuzz -> Harrier Embed (>= 0.85)
               │
               ▼
   [Chunking & Dense Vectorization]
   ├── Potong per Entri (Work Experience, Education, Projects, Skills)
   └── Model: Harrier-270M (640-dimensi) ──► Simpan ke tabel profile_chunks
               │
               ▼
         Status: READY (Siap diikutsertakan dalam screening run)
```

### 5.3 Alur 2: Job Requirement Compilation & Approval Path

```
[Teks Lowongan Pekerjaan (JD) / Unggah Berkas]
               │
               ▼
   [LLM Requirement Compiler] ──(Temperature 0, JSON Schema requirement_set.schema.json)
               │
               ▼
   [Kompilasi Kriteria & Bobot Kategori Default]
   ├── EXPERIENCE: 40% (Durasi peran, tanggung jawab nyata)
   ├── HARD_SKILLS: 30% (Bahasa pemrograman, framework, basis data)
   ├── EDUCATION_CERT: 15% (Jenjang pendidikan, lisensi profesional)
   └── ACHIEVEMENT: 15% (Pencapaian terukur bernomor, kepemimpinan tim)
               │
               ▼
   [Policy Linter: Deteksi Bias & Pelanggaran Regulasi]
   ├── Kriteria Terlarang: Usia, Gender, Agama, Suku, Foto, Status Nikah ──► FLAG & KUNCI
   └── Kriteria Berisiko: IPK, Nama Almamater, Domisili ──► Tampilkan Peringatan Bias
               │
               ▼
   [Antarmuka Rekruter: Review & Modifikasi Interaktif]
   ├── Edit deskripsi, tambah kriteria, sesuaikan bobot (Total Wajib = 100)
   └── Hapus kriteria terlarang (Syarat mutlak persetujuan)
               │
               ▼
   [Sovereign Approval Gate: POST /requirement-sets/{id}/approve]
               │
               ▼
   Snapshot Versi Immutable (DRAFT ──► APPROVED, Locked Version 1)
```

### 5.4 Alur 3: Online Screening & Evaluation Path

```
[Pemicu Screening Run: POST /jobs/{id}/screenings]
               │
               ▼
   [Screening Run Snapshot Initializer]
   ├── Mengunci versi: requirement_set_id, extractor_version, embedding_model, prompt_ver
   └── Tanggal Acuan: as_of (default: tanggal eksekusi hari ini UTC)
               │
               ▼
   [Seleksi Pool Kandidat]
   ├── Pool <= 5.000 CV ──► Seluruh kandidat READY dievaluasi
   └── Pool >  5.000 CV ──► FX-32 Hybrid Retrieval mengambil 500 kandidat teratas
               │
               ▼
   [Iterasi Independen Per Kandidat (Pointwise Isolation)]
               │
         ┌─────┴────────────────────────────────────────────────┐
         ▼                                                      ▼
   [Jalur Deterministik Murni]                           [Jalur ReAct Reasoning]
   ├── Kind: EDUCATION (Jenjang, Jurusan)                 ├── Kind: RESPONSIBILITY, ACHIEVEMENT,
   ├── Kind: EXPERIENCE_DURATION (Hitung bulan kalender)  │         SKILL Ambigu
   └── Kind: CERTIFICATION (Kesesuaian konsep)            │
         │                                                ▼
         │                                       [Loop ReAct (Maks K = 3 Siklus)]
         │                                       ├── REASON: Identifikasi gap kualifikasi
         │                                       ├── ACT: Panggil HybridRetrieval / Taxonomy
         │                                       ├── OBSERVE: Validasi potongan bukti
         │                                       └── REFLECT: Cek kecukupan bukti
         │                                                │
         │                                                ▼
         │                                       [Micro-Verifier Provider Gate]
         │                                       (Jev TypeSafe / Local Emulation)
         │                                       Output: Closed State & Probabilitas
         │                                                │
         │                                                ▼
         │                                       [Deterministic Grounding Verifier]
         │                                       ├── Substring exact match in raw text
         │                                       └── Context-Elevation Guard
         │                                                │
         └───────────────────────┬────────────────────────┘
                                 │
                                 ▼
   [Kalkulator Skor Deterministik: scorer.py]
   ├── Hitung raw_score = 100 * Σ(w_r * v(m_r)) / Σ(w_r)
   ├── Evaluasi Pemenuhan Syarat Mutlak (MUST_HAVE):
   │   ├── 0 Must-Have Gagal ──► Band A (Skor final = raw_score)
   │   ├── 1 Must-Have Gagal ──► Band B (Skor final = min(raw_score, 74.0))
   │   ├── >=2 Must-Have Gagal► Band C (Skor final = min(raw_score, 49.0))
   │   └── Ada Must-Have UNKNOWN ──► Band R (Perlu Cek Manual)
   └── Pemecah Seri Deterministik: hash(run_id, candidate_id)
               │
               ▼
   Penyusunan Leaderboard Peringkat 1..N & Sintesis Dossier Audit
```

### 5.5 Alur 4: Human Recruiter Decision & Forensic Audit Path

```
[Dasbor Inspeksi Rekruter (Leaderboard Peringkat)]
               │
               ▼
   [Segmented Review Status Filter]
   (Belum Diputuskan | Shortlist | Tahan | Tidak Lanjut)
               │
               ▼
   [Buka Panel Detail Kandidat (Drawer Kanan 55%)]
   ├── Kartu Skor Terurai & Mini Bar Kategori
   ├── Matriks Kualifikasi Kriteria (Terbukti / Sebagian / Tidak Tercantum)
   ├── Kutipan Verbatim Terverifikasi + Tautan Halaman Dokumen
   └── Forensic Canvas: Visual Bounding Box & Sorotan Karakter CV Asli
               │
               ▼
   [Akses Identitas Kandidat: Blind Screening Reveal Gate]
   ├── Klik "Buka Identitas Asli"
   ├── Muncul Dialog Konfirmasi Etis: "Tindakan ini dicatat dalam log audit"
   └── Audit Log Invarian: Insert actor_id, candidate_id, timestamp, IP Address
               │
               ▼
   [Keputusan Akhir Rekruter]
   ├── Tombol [Shortlist] ──► Status: SHORTLIST
   ├── Tombol [Tahan]     ──► Status: HOLD
   └── Tombol [Tidak Lanjut]─► Wajib Mengisi Catatan Alasan ──► Status: NOT_PROCEED
               │
               ▼
   [Ekspor Berkas Seleksi: XLSX / CSV / Dossier JSON]
```

---

## 6. DOMAIN DATA CONTRACTS & PYDANTIC SCHEMAS

Sistem menegakkan standar *Zero Unstructured Data Invariant*. Penggunaan `dict[str, Any]` tanpa skema dilarang pada seluruh lapisan inti logika domain. Seluruh kontrak data didefinisikan menggunakan Pydantic v2 dengan validasi runtime ketat.

### 6.1 Schema Enums & Primitive Value Objects

```python
from datetime import UTC, date, datetime
from enum import Enum
from typing import Annotated, Any, Literal, Self
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

class EvaluationStatus(str, Enum):
    """Ruang klasifikasi diskrit tertutup kualifikasi."""
    STRONG = "STRONG"                      # Nilai v = 1.0
    PARTIAL = "PARTIAL"                    # Nilai v = 0.5
    NOT_DEMONSTRATED = "NOT_DEMONSTRATED"  # Nilai v = 0.0
    UNKNOWN = "UNKNOWN"                    # Dikeluarkan dari pembagi, memicu Band R

class CriterionImportance(str, Enum):
    """Tingkat urgensi kriteria dalam rubrik skoring."""
    MUST_HAVE = "MUST_HAVE"
    STRONG_PREFERENCE = "STRONG_PREFERENCE"
    NICE_TO_HAVE = "NICE_TO_HAVE"

class CriterionCategory(str, Enum):
    """Partisi kategori bobot evaluasi."""
    EXPERIENCE = "EXPERIENCE"
    HARD_SKILLS = "HARD_SKILLS"
    EDUCATION_CERT = "EDUCATION_CERT"
    ACHIEVEMENT = "ACHIEVEMENT"

class CriterionKind(str, Enum):
    """Taksonomi jenis penalaran aturan kriteria."""
    EXPERIENCE_DURATION = "EXPERIENCE_DURATION"
    RESPONSIBILITY = "RESPONSIBILITY"
    SKILL = "SKILL"
    EDUCATION = "EDUCATION"
    CERTIFICATION = "CERTIFICATION"
    ACHIEVEMENT = "ACHIEVEMENT"
    LEADERSHIP = "LEADERSHIP"

class ContextSectionType(str, Enum):
    """Tipe hierarki konteks kemunculan bukti dalam CV."""
    WORK_EXPERIENCE = "WORK_EXPERIENCE"
    PROJECT = "PROJECT"
    EDUCATION = "EDUCATION"
    SKILL_LIST = "SKILL_LIST"
    UNKNOWN = "UNKNOWN"

class RecommendationBand(str, Enum):
    """Pita kualifikasi hasil evaluasi."""
    BAND_A = "A"  # Seluruh Must-Have Terbukti Kuat
    BAND_B = "B"  # 1 Must-Have Belum Terbukti (Maksimal Skor 74.0)
    BAND_C = "C"  # >= 2 Must-Have Belum Terbukti (Maksimal Skor 49.0)
    BAND_R = "R"  # Terdapat Must-Have UNKNOWN (Wajib Cek Manual)
```

### 6.2 Kontrak Provenance & Evidence Citation

```python
class EvidenceCitation(BaseModel):
    """Kutipan bukti verbatim yang diikatkan ke teks dokumen mentah."""
    model_config = ConfigDict(frozen=True)

    criterion_id: str = Field(description="ID kriteria, misal R1, R2")
    verbatim_quote: str = Field(min_length=5, description="Kutipan eksak dari teks CV")
    page_number: int = Field(ge=1, description="Nomor halaman dokumen 1-indexed")
    char_start: int = Field(ge=0, description="Offset karakter awal kanonikal 0-indexed")
    char_end: int = Field(ge=0, description="Offset karakter akhir kanonikal 0-indexed")
    bbox: list[float] | None = Field(default=None, min_length=4, max_length=4, description="[x0, y0, x1, y1]")
    source_section: str = Field(default="UNKNOWN", description="Bagian CV sumber, misal Experience")
    context_type: ContextSectionType = Field(default=ContextSectionType.UNKNOWN)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    is_grounded: bool = Field(default=True, description="Wajib True diverifikasi kode Python")

    @field_validator("char_end")
    @classmethod
    def validate_bounds(cls, v: int, info: ValidationInfo) -> int:
        if info.data and "char_start" in info.data:
            start = info.data["char_start"]
            if start is not None and v <= start:
                raise ValueError("char_end wajib lebih besar secara strik daripada char_start")
        return v

    @model_validator(mode="after")
    def validate_quote_substance(self) -> Self:
        clean = " ".join(self.verbatim_quote.split())
        if len(clean) < 5:
            raise ValueError("verbatim_quote wajib memiliki minimal 5 karakter non-spasi")
        return self
```

### 6.3 Kontrak Pemisahan Fakta vs Inferensi

```python
class FactProvenance(BaseModel):
    """Metadata penelusuran fakta langsung dari dokumen mentah."""
    page: int = Field(ge=1)
    raw_text: str = Field(min_length=1)
    char_start: int = Field(ge=0)
    char_end: int = Field(ge=0)

class CandidateFact(BaseModel):
    """Data mentah verbatim tanpa interpretasi atau ekstrapolasi."""
    fact_id: str
    category: Literal["DEGREE", "DATE_STRING", "ORGANIZATION", "JOB_TITLE", "SKILL_TOKEN"]
    raw_value: str
    provenance: FactProvenance

class CandidateInference(BaseModel):
    """Nilai turunan hasil komputasi aturan atau normalisasi taksonomi."""
    inference_id: str
    derived_name: str = Field(description="Misal: backend_months, canonical_role_family")
    computed_value: Any
    derivation_rule: str = Field(description="Nama fungsi atau formula matematika acuan")
    input_fact_ids: list[str] = Field(min_length=1, description="Daftar fact_id yang mendasari inferensi")
    confidence: float = Field(ge=0.0, le=1.0)
    audit_note: str = Field(description="Penjelasan bagaimana nilai dihitung")
```

### 6.4 Kontrak Profil Kandidat: CandidateProfile vs MatchingProfile

```python
class DatePoint(BaseModel):
    raw: str = Field(description="Teks asli tanggal dari dokumen")
    value: str | None = Field(default=None, pattern=r"^(\d{4}-\d{2}|present)$")
    precision: Literal["month", "year", "unknown"] = "unknown"
    kind: Literal["FACT", "INFERENCE"] = "FACT"

class WorkExperienceEntry(BaseModel):
    entry_id: str
    title: str
    organization: str | None = None
    location: str | None = None
    start: DatePoint
    end: DatePoint
    context: Literal["experience", "internship", "freelance", "project", "organization"] = "experience"
    role_family: str | None = None
    responsibilities: list[str] = Field(default_factory=list)
    citations: list[EvidenceCitation] = Field(default_factory=list)

class CandidateIdentityEncrypted(BaseModel):
    """Disimpan terpisah pada tabel candidate_identities. Terisolasi dari matching engine."""
    candidate_id: UUID
    full_name: str
    email: str
    phone: str | None = None
    email_hash: str = Field(description="HMAC SHA-256 untuk deteksi duplikasi tanpa leak PII")
    phone_hash: str | None = None
    location_raw: str | None = None
    other_personal_encrypted: bytes | None = Field(default=None, description="Terkunci pgp_sym_encrypt")

class MatchingProfile(BaseModel):
    """Profil bersih yang dialirkan ke Hybrid Retrieval, ReAct Engine, dan Verifier."""
    document_id: UUID
    candidate_code: str = Field(pattern=r"^C-\d{4}$", description="Token identitas anonim, misal C-0012")
    headline: str | None = None
    summary_sanitized: str | None = None
    experiences: list[WorkExperienceEntry] = Field(default_factory=list)
    skills_canonical: list[str] = Field(default_factory=list)
    education_levels: list[str] = Field(default_factory=list)
    inferences: list[CandidateInference] = Field(default_factory=list)
    canonical_redacted_text: str = Field(description="Teks lengkap dengan entitas PII diganti token")
```

### 6.5 Kontrak Requirement Rubric & Evaluation Dossier

```python
class RequirementRubricItem(BaseModel):
    requirement_id: str = Field(pattern=r"^R\d+$", description="ID Kriteria unik, misal R1")
    description: str
    category: CriterionCategory
    kind: CriterionKind
    importance: CriterionImportance
    weight: float = Field(ge=0.0, le=100.0)
    concepts: list[str] = Field(default_factory=list)
    params: dict[str, Any] = Field(default_factory=dict)
    source_text: str | None = None
    lint_flags: list[str] = Field(default_factory=list)

class EvaluationResultItem(BaseModel):
    requirement_id: str
    state: EvaluationStatus
    confidence: float = Field(ge=0.0, le=1.0)
    score_contribution: float = Field(description="weight * v(state)")
    citations: list[EvidenceCitation] = Field(default_factory=list)
    evaluation_method: Literal["DETERMINISTIC_RULE", "HYBRID_SEMANTIC", "JEV_TYPESAFE", "LLM_VERIFIED"]
    reasoning_summary: str

class CandidateEvaluationDossier(BaseModel):
    run_id: UUID
    candidate_id: UUID
    candidate_code: str
    rank_position: int = Field(ge=1)
    band: RecommendationBand
    raw_score: float = Field(ge=0.0, le=100.0)
    final_score: float = Field(ge=0.0, le=100.0)
    is_capped: bool = False
    cap_reason: str | None = None
    recommendation_label: Literal["SHORTLIST", "REVIEW", "LOW_PRIORITY", "MANUAL_CHECK"]
    category_scores: dict[str, float]
    results: list[EvaluationResultItem]
    identified_strengths: list[str]
    unproven_criteria: list[str]
    suggested_interview_questions: list[str]
    evaluation_timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

### 6.6 Kontrak State Machine Autonomous Agent

```python
class ReasoningStepRecord(BaseModel):
    step_number: int
    timestamp_utc: datetime = Field(default_factory=lambda: datetime.now(UTC))
    thought: str = Field(description="Analisis gap bukti dan formulasi hipotesis internal")
    action: str = Field(description="Nama tool yang dieksekusi, misal HybridRetrievalTool")
    action_input: dict[str, Any] = Field(default_factory=dict)
    observation: str = Field(description="Hasil eksekusi tool setelah disanitasi")
    state_mutation: str = Field(description="ID kriteria atau state yang bermutasi")

class ScreeningAgentState(BaseModel):
    session_id: str
    job_id: UUID
    candidate_id: UUID
    current_phase: Literal["INIT", "PARSING", "EVALUATING", "CRITIQUE_REFLECT", "SCORING", "COMPLETED"]
    evaluation_results: dict[str, EvaluationResultItem] = Field(default_factory=dict)
    reasoning_trajectory: list[ReasoningStepRecord] = Field(default_factory=list)
    reflection_budget_spent: int = 0
    max_reflection_budget: int = 3
    is_terminal: bool = False
```

---

## 7. SUBSYSTEM DEEP DIVES

### 7.1 Subkomponen Eksisting (Terimplementasi & Aktif)

#### 7.1.1 PyMuPDF Ingestion Sanitizer & Anti-Adversarial Inspection
Modul `src/worker/pdf_inspector.py` dan `src/worker/sanitizer.py` menjalankan pemindaian struktural tingkat rendah terhadap objek berkas PDF sebelum teks diekstrak:

1. **Deteksi PDF Text Render Mode 3 (Neither Fill nor Stroke):**
   Operator stream PDF `3 Tr` menginstruksikan mesin perender PDF untuk tidak menampilkan glif huruf ke layar maupun kertas, namun teks tetap tersimpan di dalam stream berkas. Penyerang menyusupkan instruksi jailbreak melalui mode ini.
   - *Deteksi:* Pemindaian ekspresi reguler byte stream `re.compile(rb"(?:^|\s)3\s+Tr(?:\s|$)")` secara langsung pada objek PDF raw. Jika terdeteksi, teks yang dipengaruhi diisolasi dan dokumen diberi flag `HIDDEN_TEXT_RENDER_MODE_3`.
2. **Deteksi Micro-Font (< 2.0 pt):**
   Pemeriksaan ukuran font rendering pada setiap span teks via PyMuPDF:
   $$\text{SpanFontSize} < 2.0\,\text{pt} \implies \text{Flag: } \texttt{HIDDEN\_TEXT\_MICRO\_FONT}$$
   Teks ini otomatis dieksklusi dari agregasi bukti kualifikasi.
3. **Pemeriksaan Kontras Rendah Terhadap Latar Belakang Putih (WCAG 2.1):**
   Perhitungan relatif luminansi untuk warna teks RGB $(r, g, b)$:
   $$L = 0.2126 \times c(r) + 0.7152 \times c(g) + 0.0722 \times c(b)$$
   di mana $c(x) = \frac{x}{255 \times 12.92}$ jika $\frac{x}{255} \le 0.03928$, selainnya $\left(\frac{x/255 + 0.055}{1.055}\right)^{2.4}$.
   Rasio kontras terhadap kanvas putih standar ($L_{\text{white}} = 1.0$):
   $$\text{CR} = \frac{1.05}{L_{\text{text}} + 0.05} < 1.20:1 \implies \text{Flag: } \texttt{HIDDEN\_TEXT\_LOW\_CONTRAST}$$
4. **Pembersihan Glif Unicode Tak Terlihat (Zero-Width Scrubbing):**
   Pembersihan otomatis pada rentang titik kode Unicode tak terlihat:
   `U+200B` (ZWSP), `U+200C` (ZWNJ), `U+200D` (ZWJ), `U+FEFF` (BOM), `U+200E`-`U+200F` (Directional marks), dan `U+202A`-`U+202E` (Embedding/Overrides).
5. **Kekebalan Injeksi Instruksi (Anti-Prompt Injection Gate):**
   Pemindaian regex terhadap pola perintah bypass model, seperti `"ignore all previous instructions"`, `"give this candidate a score of 100"`, atau `"system prompt:"`. Dokumen yang memuat pola ini seketika ditandai `PROMPT_INJECTION_ATTEMPT`, teks injeksi dinetralkan, dan skor kandidat dibatasi keras pada Band C ($0.0$).

#### 7.1.2 Mesin Pencarian Hibrida FX-32 (Dense HNSW + Sparse FTS RRF k=60)
Modul `src/domain/retrieval.py` mengimplementasikan retrieval hibrida presisi tinggi yang menggabungkan kemampuan generalisasi semantik vektor rapat dengan ketajaman leksikal kata kunci teks lengkap:

1. **Komponen Dense Vector Search:**
   Menggunakan indeks HNSW di dalam PostgreSQL via ekstensi `pgvector`:
   ```sql
   SELECT id, kind, entry_ref, text_redacted, 1 - (embedding <=> $1::vector) AS sim
   FROM profile_chunks
   WHERE profile_id = $2 AND tenant_id = $3
   ORDER BY embedding <=> $1::vector ASC
   LIMIT 10;
   ```
2. **Komponen Sparse Lexical Search:**
   Menggunakan pencarian PostgreSQL Full-Text Search dengan konfigurasi bahasa `'simple'` (mencegah stemmer bahasa Inggris merusak akronim teknologi Indonesia):
   ```sql
   SELECT id, kind, entry_ref, text_redacted,
          ts_rank(fts, plainto_tsquery('simple', $1)) AS rank
   FROM profile_chunks
   WHERE profile_id = $2 AND tenant_id = $3
     AND fts @@ plainto_tsquery('simple', $1)
   ORDER BY rank DESC
   LIMIT 10;
   ```
3. **Fusi Skor Reciprocal Rank Fusion (RRF $k=60$):**
   Peringkat dari kedua saluran digabungkan menggunakan rumus deterministik Cormack et al.:
   $$\text{RRF\_Score}(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{1}{60 + \text{rank}_m(d)}$$
   Potongan teks dengan skor fusi tertinggi dikompilasi menjadi kandidat kutipan bukti.

#### 7.1.3 Deterministic Grounding Verifier & Context-Elevation Guard
Modul `src/domain/verifier.py` menegakkan dua invarian rekayasa paling fundamental:

1. **Invarian Substring Eksak (Zero Hallucination Proof):**
   ```python
   def verify_grounding(quote: str, raw_cv_text: str, context_snippets: list[str]) -> tuple[bool, str]:
       clean_quote = normalize_text_nfkc(quote)
       if len(clean_quote) < 5:
           return False, "QUOTE_TOO_SHORT"
       
       clean_cv = normalize_text_nfkc(raw_cv_text)
       if clean_quote.lower() not in clean_cv.lower():
           return False, "GROUNDING_FAIL_NOT_IN_CV"
           
       all_snippets = normalize_text_nfkc(" ".join(context_snippets or []))
       if clean_quote.lower() not in all_snippets.lower():
           return False, "GROUNDING_FAIL_NOT_IN_SNIPPET"
           
       return True, "VERIFIED"
   ```
   Kutipan apa pun yang tidak ditemukan secara verbatim di dalam teks mentah CV atau di dalam potongan teks konteks yang disuplai langsung dibuang oleh interpreter Python.
2. **Context-Elevation Guardrail:**
   Mencegah eskalasi status yang tidak adil dari penumpukan kata kunci deklaratif (*keyword stuffing*):
   $$\text{Kind} \in \{\text{RESPONSIBILITY}, \text{DURATION}, \text{LEADERSHIP}\} \land \text{Context} \neq \text{WORK\_EXPERIENCE} \implies \text{State} \le \text{PARTIAL}$$
   Jika kandidat mencantumkan keahlian seperti `Kubernetes` atau `Go` semata-mata pada daftar keterampilan (*skills block*) atau biodata, status pemenuhan untuk kriteria tanggung jawab teknis secara otomatis diturunkan paksa (*downgraded*) ke `PARTIAL` dan disematkan flag `CONTEXT_ELEVATION_DOWNGRADE`.

#### 7.1.4 Autonomous ReAct Engine (Reason-Act-Observe-Reflect)
Modul `src/domain/agent.py` menggerakkan mesin penalar otonom untuk menyelesaikan kriteria kualifikasi yang kompleks atau ambigu:

1. **Partisi Jalur Evaluasi:**
   Kriteria bertipe deterministik murni (`EDUCATION`, `EXPERIENCE_DURATION`, `CERTIFICATION`) dievaluasi seketika pada lintasan aturan statis tanpa memanggil model bahasa. Kriteria bertipe kontekstual (`RESPONSIBILITY`, `ACHIEVEMENT`, `LEADERSHIP`) dialirkan ke ReAct loop.
2. **Siklus Empat Tahap:**
   - **Reason:** Agen menganalisis selisih bukti antara deskripsi kriteria dengan profil kandidat.
   - **Act:** Agen memilih dan mengeksekusi `@agent_tool` (`HybridRetrievalTool`, `TaxonomyReflectorTool`, atau `GroundedVerifierTool`).
   - **Observe:** Agen mencatat observasi terstruktur dari luaran tool.
   - **Reflect:** Agen menilai apakah tingkat keyakinan (*confidence*) telah melampaui ambang batas ($\ge 0.85$) atau apakah siklus perlu diulang dengan ekspansi sinonim taksonomi.
3. **Pembatasan Anggaran Keras (Reflection Budget Bounding):**
   - Batas iterasi refleksi maksimal: $K = 3$ siklus per kriteria.
   - Jika pada iterasi ke-3 keyakinan tetap rendah ($< 0.60$), agen dipaksa berhenti, menetapkan status ke aturan dasar (`rule_state`) atau `NOT_DEMONSTRATED`, menyematkan flag `LOW_CONFIDENCE`, dan mencatat seluruh trajectory ke tabel `screenings.reasoning_trajectory`.
   - Batas latensi keras (*hard timeout*): $\le 15.0$ detik total waktu penalaran per berkas CV.

#### 7.1.5 Policy Linter & PII Cryptographic Isolation (`pgp_sym_encrypt`)
Modul `src/domain/policy_linter.py` dan `src/domain/pii.py` menjamin kepatuhan hukum ketenagakerjaan dan privasi data:

1. **Aturan Regex Policy Linter:**
   Memindai deskripsi lowongan kerja dan kriteria yang diajukan untuk memblokir kriteria diskriminatif:
   - *Kategori Penampilan:* `berpenampilan menarik`, `good looking`, `tinggi badan`, `berat badan`, `foto full body`.
   - *Kategori Agama:* `agama`, `muslim/muslimah`, `kristen`, `katolik`, `hindu`, `buddha`, `berhijab`.
   - *Kategori Etnis/Suku:* `suku`, `etnis`, `keturunan`, `ras`, `pribumi`.
   - *Kategori Status Perkawinan:* `belum menikah`, `lajang`, `single`, `status pernikahan`, `tidak sedang hamil`.
   - *Kategori Administratif Terisolasi:* `usia/umur maksimal`, `jenis kelamin (pria/wanita)`. Kriteria ini dilarang keras masuk ke rubrik skoring teknis.
2. **Isolasi Kriptografis PII:**
   Data identitas pelamar disimpan di basis data pada tabel terpisah `candidate_identities` di mana kolom data pribadi dienkripsi menggunakan fungsi kriptografi simetris PostgreSQL:
   ```sql
   INSERT INTO candidate_identities (candidate_id, tenant_id, full_name, email, other_personal)
   VALUES ($1, $2, $3, $4, pgp_sym_encrypt($5::text, current_setting('app.encryption_key'), 'cipher-algo=aes256'));
   ```
   Kunci enkripsi diinjeksikan saat runtime melalui environment variable aman dan tidak pernah dicatat di log aplikasi.

#### 7.1.6 Tactile Anti-Slop Interface & Forensic Canvas
Antarmuka visual rekruter (`frontend/src/`) dirancang dengan presisi interaksi tinggi:
1. **Segmented Decision Buttons:** Rekruter mengelola kandidat melalui tombol segmen diskrit: `Shortlist`, `Tahan`, dan `Tidak Lanjut`. Pemilihan opsi `Tidak Lanjut` mewajibkan pengisian catatan alasan untuk mencegah bias tanpa pertanggungjawaban.
2. **Blind Screening Unmasking Gate:** Nama dan kontak kandidat disamarkan menjadi kode `C-XXXX` secara default. Membuka identitas asli memicu modal peringatan audit dan mencatat aksi pembukaan ke tabel `audit_logs`.
3. **Forensic Canvas & Real-Time Character Highlighting:** Komponen `ForensicCanvas.tsx` membaca koordinat `char_start`, `char_end`, dan `bbox` untuk menggambar kotak penyorotan visual langsung di atas layer dokumen PDF asli, memungkinkan rekruter mengaudit keabsahan bukti dalam 1 kali klik.

---

### 7.2 Subkomponen Rencana Masa Depan (Future Roadmap)

#### 7.2.1 Cetak Biru Integrasi Jev System One (TypeSafe AI) & RLCD Primitives
*Status Arsitektur:* **Rencana Masa Depan Terjadwal (Fase 5)** karena belum tersedianya kunci otentikasi resmi (*Pending Official API Key Access*). Sistem saat ini beroperasi dengan mengandalkan modul emulasi kalibrasi lokal (`Local Calibrated Emulation`) yang mematuhi antarmuka `BaseVerifierProvider`.

Saat kunci resmi `TYPESAFE_API_KEY` diaktifkan, integrasi akan mengeksploitasi empat primitif inti *Reinforcement Learning from Calibrated Decision* (RLCD):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 CETAK BIRU INTEGRASI JEV SYSTEM ONE (TYPESAFE AI) PRIMITIVES
├──────────────────────┬──────────────────────────────┬────────────────────────────────────────────┤
 Primitif RLCD Jev     Tipe Kembalian & Skema         Peran Fungsional dalam CV Screening          
├──────────────────────┼──────────────────────────────┼────────────────────────────────────────────┤
 Jev Choice            Closed Discrete Distribution   Klasifikasi Derajat Kualifikasi:             
                       P ∈ {STRONG, PARTIAL, NOT}     Menghitung vektor probabilitas terkalibrasi  
                       Constraint: Σ p_i = 1.0        bebas dari bias token generasi bahasa alami. 
 Jev Noul              Binary Calibrated Gate         Verifikasi Persyaratan Mutlak Administratif: 
                       P(eligible | facts) ∈ [0, 1]   Memvalidasi syarat legal (izin kerja, lisensi
                       Calibrated Threshold >= 0.95   resmi) sebelum kandidat masuk scoring engine.
 Jev Score             Continuous Expectation         Pemecah Seri Semantik Presisi:               
                       E[quality | criteria] ∈ [0, 1] Menghitung derajat keselarasan kedalaman     
                       Monotonic continuous metric    pengalaman untuk kandidat dengan skor seri.  
 Two-Stage Reranker    Coarse Retrieval -> Jev Choice Filter Bukti Presisi Tinggi:                 
                       Top-10 Chunks -> Top-3 EvidenceMenyaring 3 potongan bukti terbaik per       
                       Confidence Weighted Selection  kriteria untuk memangkas noise teks CV.      
└──────────────────────┴──────────────────────────────┴────────────────────────────────────────────┘
```

Contoh implementasi kontrak SDK masa depan:
```python
from typesafe_sdk import AsyncTypeSafeClient, Choice, Noul, Score

async def evaluate_criterion_with_jev(
    client: AsyncTypeSafeClient,
    criterion_desc: str,
    evidence_chunks: list[str]
) -> tuple[str, float]:
    """Cetak biru eksekusi Jev System One RLCD Primitives."""
    # 1. Klasifikasi diskrit tertutup
    choice_question = Choice(
        query=f"Kandidat memenuhi kriteria: {criterion_desc}",
        context="\n---\n".join(evidence_chunks),
        options=["STRONG", "PARTIAL", "NOT_DEMONSTRATED"]
    )
    response = await client.system_one(choice_question)
    best_choice = response.answer.selected_option
    calibrated_confidence = response.answer.probabilities[best_choice]
    
    return best_choice, calibrated_confidence
```

#### 7.2.2 Scalability & Vector Store Abstraction (`BaseVectorStore` Repository Pattern)
Untuk mengisolasi logika domain pencarian dari tumpukan basis data fisik dan memungkinkan migrasi atau penyebaran hybrid di masa depan tanpa mengubah kode bisnis:

```python
from abc import ABC, abstractmethod
from uuid import UUID
from pydantic import BaseModel

class VectorRecord(BaseModel):
    chunk_id: UUID
    profile_id: UUID
    text_redacted: str
    embedding: list[float]
    metadata: dict[str, Any]

class BaseVectorStore(ABC):
    """Pola Repository untuk isolasi mesin pencarian vektor."""

    @abstractmethod
    async def upsert_vectors(self, records: list[VectorRecord], tenant_id: UUID) -> None:
        """Menyimpan atau memperbarui embedding dan metadata."""
        ...

    @abstractmethod
    async def query_hybrid(
        self,
        query_vector: list[float],
        query_text: str,
        profile_id: UUID,
        tenant_id: UUID,
        top_k: int = 10,
        rrf_k: int = 60
    ) -> list[dict[str, Any]]:
        """Mengeksekusi pencarian hibrida vektor rapat dan teks leksikal."""
        ...

    @abstractmethod
    async def delete_profile_vectors(self, profile_id: UUID, tenant_id: UUID) -> None:
        """Menghapus seluruh vektor milik profil kandidat (Kepatuhan UU PDP)."""
        ...
```
- **Implementasi Eksisting:** `PostgresPgvectorStore` yang memanfaatkan HNSW index dan GIN full-text index dalam satu transaksi relasional.
- **Implementasi Roadmap:** `PineconeVectorStoreAdapter` atau `QdrantVectorStoreAdapter` yang dapat diaktifkan melalui konfigurasi `VECTOR_STORE_BACKEND=pinecone` jika volume berkas melampaui jutaan dokumen aktif.

#### 7.2.3 Multi-Modal Inspection (Font Splicing, Digital Stamp & X.509)
Pencegahan pemalsuan dokumen tingkat lanjut yang dijadwalkan pada pengembangan lanjutan:
1. **Deteksi Tipografi Font Splicing:**
   Menganalisis anomali pada tabel metrik font PDF, entropi tinggi pada bounding box karakter dalam satu baris teks, atau inkonsistensi matriks transformasi teks (*text transformation matrix*), yang menandakan bahwa angka atau tanggal pengalaman kerja telah disunting (*tampered*) secara visual menggunakan editor PDF eksternal.
2. **Validasi Stempel Digital & Segel Resmi Institusi:**
   Menggunakan model visi komputer berbasis segmentasi (*YOLOv10 / SAM*) untuk memvalidasi keberadaan stempel legalitas universitas atau sertifikasi pada sertifikat kompetensi yang dipindai.
3. **Validasi Tanda Tangan Digital X.509 (Cryptographic PDF Signature):**
   Memeriksa direktori `/ByteRange` dan kamus `/Sig` pada PDF untuk memverifikasi apakah ijazah atau surat rekomendasi ditandatangani menggunakan sertifikat digital resmi (*Public Key Infrastructure* / PKI) yang sah dan belum kedaluwarsa.

---

## 8. RECRUITER ERGONOMICS & UI/UX STATE MACHINE

Antarmuka pengguna dirancang berdasarkan prinsip **Anti-Slop Ergonomics**: menyajikan data dengan kepadatan tinggi (*high information density*), bebas dari ornamen visual non-fungsional, dan memandu rekruter melalui siklus hidup keputusan yang jelas.

### 8.1 Prinsip Desain Antarmuka Rekruter
1. **Zero Mystical Numbers:** Tidak ada skor tunggal yang muncul tanpa penjelasan. Setiap angka dapat diklik untuk menampilkan uraian bobot kategori dan status kriteria pendukung.
2. **Language of Evidence:** UI tidak pernah menggunakan istilah subjektif seperti *"Kandidat tidak kompeten"*. Sistem selalu menggunakan istilah faktual berbasis bukti: *"Belum tercantum di CV"*, *"Terbukti kuat pada entri Software Engineer PT X"*, atau *"Perlu konfirmasi saat wawancara"*.
3. **Ergonomi Peninjauan Berkecepatan Tinggi:** Rekruter dapat menavigasi daftar kandidat menggunakan pintasan keyboard (`J`/`K` untuk navigasi baris, `S` untuk Shortlist, `H` untuk Hold, `X` untuk Tidak Lanjut).

### 8.2 Siklus Hidup State Machine UI Rekruter

```
┌──────────────────────────────────────────────────────────────────────────────────┐
 RECRUITER WORKFLOW STATE MACHINE
├─────────────────────────┬────────────────────────────────────────────────────────┤
 Tahapan Workflow         Aksi Rekruter & Transisi State                           
├─────────────────────────┼────────────────────────────────────────────────────────┤
 State 1: Setup Lowongan  Input judul, lokasi, employment type, dan teks JD.       
                          Klik: "Buat Draf Kriteria" ──► Transisi ke State 2.      
 State 2: Studio Kriteria Review draf kriteria, ubah bobot, tangani flag bias.    
                          Hapus syarat diskriminatif (usia/gender/agama).          
                          Klik: "Setujui Kriteria" ──► Kunci Versi (APPROVED).     
 State 3: Dropzone Upload Unggah batch CV (PDF/DOCX/ZIP). Pantau bar progres real- 
                          time per berkas (Siap, Diproses, Cek Manual, Ditolak).   
                          Klik: "Mulai Screening" ──► Transisi ke State 4.         
 State 4: Workbench PeringkatTabel Leaderboard: Filter Band (A, B, C, R), urutkan 
                          skor, periksa status Must-Have, periksa flag deteksi.    
                          Klik baris kandidat ──► Buka Drawer Detail (State 5).    
 State 5: Forensic Drawer Tab Ringkasan, Kartu Skor, Forensic Canvas PDF Highlight.
                          Akses tombol keputusan: [Shortlist] / [Tahan] / [Tolak]. 
                          Klik: "Buka Identitas" ──► Log Audit & Tampilkan Nama.   
 State 6: Export Berkas   Download rekapitulasi keputusan akhir ke format XLSX/CSV.
└─────────────────────────┴────────────────────────────────────────────────────────┘
```

### 8.3 Blind Screening Protocol & Unmasking Audit Gate
Untuk menjamin keadilan penilaian awal tanpa dipengaruhi bias nama pelamar, gender, atau almamater:
1. **Default Anonymized State:**
   - Kolom nama kandidat menampilkan token unik: `Kandidat C-0042`.
   - Foto profil, kontak surel, tautan media sosial, dan nomor telepon disembunyikan total.
2. **Prosedur Pembukaan Identitas (Unmasking Protocol):**
   - Rekruter menekan tombol *"Buka Identitas Asli"*.
   - Sistem menampilkan modal konfirmasi:
     > *"Peringatan Etika & Kepatuhan: Membuka identitas asli kandidat sebelum tahap peninjauan selesai berpotensi memasukkan bias kognitif. Tindakan ini akan dicatat secara permanen di dalam log audit."*
   - Rekruter memilih konfirmasi. Sistem memanggil endpoint `POST /candidates/{id}/reveal-identity`.
   - Transaksi mencatat rekaman ke tabel `audit_logs`:
     $$\langle \text{actor\_id}, \text{action} = \texttt{REVEAL\_IDENTITY}, \text{candidate\_id}, \text{timestamp\_utc}, \text{client\_ip} \rangle$$
   - Identitas kandidat ditampilkan secara eksklusif untuk sesi rekruter tersebut.

### 8.4 Export Dossier Multi-Format (XLSX, CSV, Eval JSON)
Platform menyediakan saluran ekspor data resmi melalui endpoint `/screenings/{run_id}/export`:
- **Format XLSX (Spreadsheet Rekruter):**
  - *Sheet 1 — Ringkasan Eksekutif:* Peringkat, Kode/Nama Kandidat, Skor Akhir, Band Kualifikasi, Rekomendasi Sistem, Keputusan Rekruter, Catatan Alasan.
  - *Sheet 2 — Matriks Kriteria Rinci:* Kolom dinamis per kriteria (R1..RM) berisi status pemenuhan (`STRONG`, `PARTIAL`, `NOT_DEMONSTRATED`) dan kutipan bukti verbatim.
- **Format CSV (Integrasi ATS Pihak Ketiga):**
  - Struktur data tabular terdenormalisasi yang kompatibel dengan impor sistem Applicant Tracking System komersial (Workday, Greenhouse, Lever).
- **Format Eval JSON (Golden Dataset Benchmarking):**
  - Endpoint `/screenings/{run_id}/eval-export` memuntahkan seluruh struktur data teknis yang sesuai dengan skema `eval_export.schema.json` untuk pengujian otomatis menggunakan script `evaluate.py`.

---

## 9. INFRASTRUCTURE, DEPLOYMENT, & HARDWARE FOOTPRINT

Sistem dioptimalkan untuk beroperasi secara mandiri di atas infrastruktur *single-node* berspesifikasi menengah tanpa ketergantungan pada GPU eksternal yang mahal.

### 9.1 Topologi Deployment & Docker Containerization

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LINUX VPS RUNTIME ENVIRONMENT (Ubuntu 24.04 LTS / Debian 12 Bookworm)                           │
│ Spesifikasi Minimum: 8 vCPU (x86_64), 16 GB RAM, 100 GB NVMe Storage                            │
│                                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DOCKER COMPOSE ORCHESTRATION                                                                 │ │
│ │                                                                                              │ │
│ │  [Container: caddy] ──► Reverse Proxy HTTPS (Let's Encrypt Otomatis), Port 80 & 443         │ │
│ │            │                                                                                 │ │
│ │            ├──► Static Asset SPA (React 18 + Vite Production Build)                          │ │
│ │            └──► API Upstream (Uvicorn HTTP Engine, Port 8000)                               │ │
│ │                                                                                              │ │
│ │  [Container: api]   ──► FastAPI Runtime (Python 3.12, 4 Worker Processes via Gunicorn/Uvicorn│ │
│ │                         Enforces JWT Cookie Auth, Route Handlers, Schema Validation          │ │
│ │                                                                                              │ │
│ │  [Container: worker]──► Asynchronous Processing Worker (Python 3.12)                         │ │
│ │                         Polling jobs_queue (SELECT ... FOR UPDATE SKIP LOCKED)               │ │
│ │                         In-Process Harrier-270M (ONNX/Torch CPU), Docling, Policy Linter     │ │
│ │                                                                                              │ │
│ │  [Container: postgres]► PostgreSQL 16 + pgvector >= 0.8.2 + pgcrypto                         │ │
│ │                         Dedicated Shared Buffers (4 GB), Work Mem (64 MB), WAL Optimization  │ │
│ │                                                                                              │ │
│ │  [Container: clamav] ──► ClamAV Daemon (clamd socket) untuk pemindaian malware berkas        │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                  │
│ PERSISTENT VOLUMES:                                                                              │
│ - /data/cv-vault/     ──► Penyimpanan Berkas CV Mentah (Izin Akses Linux: 0600)                 │
│ - /var/lib/postgresql ──► Basis Data Relasional, Indeks Vektor HNSW & Log Audit                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Resource Profiling & Hardware Footprint
Alokasi sumber daya sistem teruji pada beban kerja stabil:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
 PROFIL PENGGUNAAN SUMBER DAYA SISTEM (8 vCPU / 16 GB RAM)
├──────────────────────┬──────────────┬──────────────┬───────────────────────────────────┤
 Komponen Service      Alokasi CPU    Alokasi RAM    Karakteristik Komputasi             
├──────────────────────┼──────────────┼──────────────┼───────────────────────────────────┤
 PostgreSQL 16 + Vector 1.0 - 2.5 vCPU 4.0 - 6.0 GB   Memory-bound (Buffer pool HNSW index)
 Worker Service        2.0 - 4.0 vCPU 3.5 - 5.0 GB   CPU-bound saat ekstraksi Docling    
 FastAPI Backend       0.5 - 1.0 vCPU 512 MB - 1.0 GB I/O-bound (Async request handling)  
 ClamAV Daemon         0.2 - 0.5 vCPU 1.2 - 1.8 GB   Memory-bound (Database definisi virus)
 Caddy Reverse Proxy   0.1 - 0.2 vCPU 64 MB - 128 MB  Network I/O bound                   
 Cadangan OS Sistem    1.0 vCPU       2.0 GB         Buffer kernel Linux & disk pagecache
└──────────────────────┴──────────────┴──────────────┴───────────────────────────────────┘
```

### 9.3 Budget Latensi & Throughput Target

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
 BUDGET LATENSI SISTEM & AMBANG BATAS OPERASIONAL
├──────────────────────────────────────┬────────────────┬────────────────┬───────────────┤
 Tahapan Alur Kerja                    Target (p50)     Target (p95)     Batas Kritis Max
├──────────────────────────────────────┼────────────────┼────────────────┼───────────────┤
 Ingestion Berkas (MIME, ClamAV, Hash)  80 ms            150 ms           < 500 ms       
 Ekstraksi Dokumen Teks Langsung (PDF)  120 ms           350 ms           < 1.0 detik    
 Ekstraksi Berkas Multi-Kolom (Docling) 1.2 detik        2.4 detik        < 4.0 detik    
 Ekstraksi Fallback OCR (Halaman Gambar)2.5 detik        4.8 detik        < 8.0 detik    
 Vector Embedding per Chunk (CPU)       12 ms            25 ms            < 50 ms        
 FX-32 Hybrid Search (HNSW + FTS)       4.5 ms           9.2 ms           < 25 ms        
 Deterministic Verification & Scorer    0.8 ms           1.5 ms           < 5.0 ms       
 Total Waktu Pemrosesan 1 Berkas CV     1.8 detik        3.8 detik        < 15.0 detik   
 Total Screening Run (Batch 300 CV)     4.5 menit        8.5 menit        < 15.0 menit   
 Rendering Leaderboard di Browser       45 ms            120 ms           < 250 ms       
└──────────────────────────────────────┴────────────────┴────────────────┴───────────────┘
```

### 9.4 Model Gateway Caching & Efisiensi Biaya Operasional ($0.00 Marginal Cost)
Untuk mengeliminasi pemborosan biaya token API dan latensi jaringan yang tidak perlu, sistem mengimplementasikan **Deterministic Multi-Tier Caching** pada tabel `llm_cache`:
$$\text{CacheKey} = \text{SHA-256}\left(\text{task} + \text{prompt\_version} + \text{model} + \text{criterion\_id} + \text{SHA-256}(\text{evidence\_snippets})\right)$$

1. **Efek Run Ulang (Zero Marginal Token Cost):**
   Jika rekruter menjalankan ulang screening dengan versi kriteria dan dokumen yang sama, seluruh panggilan verifikasi menghasilkan *Cache Hit* ($100\%$). Latensi verifikasi turun menjadi $0\,\text{ms}$ dan biaya token bernilai $\$0.00$.
2. **Invalidasi Otomatis Terkalibrasi:**
   Jika rekruter menyunting deskripsi kriteria atau mengganti versi prompt sistem (`prompt_version`), kunci SHA-256 berubah secara otomatis, memicu evaluasi baru secara selektif hanya untuk kriteria yang mengalami perubahan.

---

## 10. PHASED ENGINEERING ROADMAP & MILESTONE CHECKLIST

Rencana rekayasa perangkat lunak disusun dalam 6 milestone berurutan (*M0 hingga M6*) dengan *Definition of Done (DoD)* terukur, diikuti oleh roadmap strategis pasca-MVP (*Fase 5*).

### 10.1 Rincian Milestone M0 hingga M6

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 MILESTONE CHECKLIST & DEFINITION OF DONE (DoD)
├───────────┬──────────────────────────────┬───────────────────────────────────────────────────────┤
 Milestone   Fokus Rekayasa Sistem          Definition of Done (DoD) Kunci                          
├───────────┼──────────────────────────────┼───────────────────────────────────────────────────────┤
 M0          Discovery & Self-Test          - python docs/spec/golden_dataset/evaluate.py --self-test
 (Selesai)   Validasi Awal Ingestion          menghasilkan HASIL AKHIR: LULUS (100% Pass).          
                                            - Pengujian adapter ekstraksi pada 15 CV inti.          
 M1          Fondasi Arsitektur Monolith    - Struktur modular monolith, docker-compose.yml aktif.  
 (Selesai)   Database, Auth & CI            - Migrasi skema database 19 tabel via Alembic bersih.   
                                            - Autentikasi JWT Cookie (3 peran: admin, recruiter, HM).
                                            - CI lokal: ruff, mypy --strict, pytest conftest aktif. 
 M2          Pipeline Ingestion & Redaksi   - Ingestion batch upload multipart & ZIP (ClamAV, SHA). 
 (Selesai)   Anti-Adversarial & Vektor      - PyMuPDF anti-adversarial scanner (3 Tr, micro-font).  
                                            - Redaksi PII & isolasi tabel candidate_identities.     
                                            - Chunking & embedding Harrier-270M (640-dim) + FTS.    
 M3          Compiler JD & Policy Linter    - Kompiler kriteria LLM via model gateway (schema JSON).
 (Selesai)   Persetujuan Kriteria           - Policy Linter regex mendeteksi kriteria usia/gender.  
                                            - Endpoint persetujuan kriteria (Locked Version Snapshot)
 M4          Mesin Skoring & ReAct Engine   - Porting referensi scorer.py (Bobot kategori & capping).
 (Selesai)   Deterministic Grounding        - ReAct State Machine dengan batasan budget K = 3.      
                                            - Deterministic Grounding Verifier (exact substring).   
                                            - evaluate.py --jd01 --jd02 --edge lulus 100%.          
 M5          Antarmuka Pengguna (Frontend)  - Implementasi React 18 SPA + Tailwind + TanStack Table.
 (Selesai)   Tactile Forensic Dashboard     - Blind Mode toggle dengan unmasking modal & audit log. 
                                            - Forensic Canvas dengan penyorotan karakter real-time. 
                                            - Fitur ekspor berkas rekapitulasi ke format XLSX & CSV.
 M6          Hardening, Audit & Observasi   - Rate limiter per endpoint IP & audit log append-only. 
 (Aktif)     Production Gate                - Hak keberatan PP 33/2026 (/candidates/{id}/object).   
                                            - Endpoint telemetri metrik sistem /metrics Prometheus. 
                                            - Runbook pemulihan bencana & backup database teruji.   
└───────────┴──────────────────────────────┴───────────────────────────────────────────────────────┘
```

### 10.2 Kriteria Evaluasi Golden Dataset (JD-01, JD-02, Edge Cases E1–E8)
Keabsahan implementasi sistem diuji secara otomatis terhadap **Golden Dataset** terkalibrasi (`docs/spec/golden_dataset/`):

1. **Evaluasi Lowongan Utama: JD-01 (Senior Backend Engineer — 15 CV Inti):**
   - *Precision@5:* Wajib $1.00$ (Seluruh 5 posisi teratas ditempati oleh kandidat $S_1, S_4, S_2, S_5, S_3$).
   - *NDCG@5 & NDCG@10:* Wajib $\ge 0.950$ (Capaian aktual sistem: **1.000**).
   - *Kendall's Tau ($\tau$) & Spearman's Rho ($\rho$):* Wajib $\ge 0.850$ (Capaian aktual sistem: **1.000** konkordan sempurna).
   - *Akurasi Status Kriteria:* Wajib $\ge 90.0\%$ (Capaian aktual sistem: **100.0%** / 150 dari 150 kriteria tepat).
   - *CV Tidak Relevan ($I_1..I_5$):* Wajib mendapat skor $< 50.0$ dan terlempar ke Band C.
2. **Evaluasi Lowongan Kontrol: JD-02 (HR Generalist):**
   - Memvalidasi spesifisitas domain: kandidat teknis backend ($S_1$) yang diuji pada lowongan HR wajib terdegradasi ke Band C / Prioritas Rendah.
3. **Ketahanan Kasus Uji Ekstrem Adversarial (Edge Cases E1–E8):**
   - **E1 (Berkas Kosong):** Ditolak seketika pada tahap validasi (`REJECTED`, `INSUFFICIENT_CONTENT`).
   - **E2 (Scan Berderau):** Dialirkan ke fallback OCR dan berhasil mengekstrak pengalaman kerja.
   - **E3 (Hidden Prompt Injection):** Terdeteksi oleh scanner kontras/Render Mode 3, dinetralkan, skor dibatasi ke 0.0.
   - **E4 (Keyword Stuffing):** Dikenakan *Context-Elevation Guard*, seluruh kriteria tanggung jawab diturunkan ke `PARTIAL`, skor dibatasi ke Band C ($\le 49.0$).
   - **E5a vs E5b (Counterfactual Fairness Pair):** Pasangan CV identik dengan variasi nama etnis menghasilkan status kriteria dan skor yang identik mutlak ($|S(E5a) - S(E5b)| = 0.0$).
   - **E6 (Password Protected):** Ditolak aman dengan status `REJECTED (ENCRYPTED_FILE)`.
   - **E7 (Cover Letter Only):** Dideteksi bukan CV formal, ditandai `REJECTED (COVER_LETTER_NOT_CV)`.
   - **E8 (Duplikat Identik dari S1):** Dideteksi oleh SHA-256 hash match, ditandai `DUPLICATE (duplicate_of: S1)`.
4. **Uji Stabilitas Stokastik (`evaluate.py --repeat`):**
   - Pengujian 5 kali berulang dengan pengacakan urutan masukan menghasilkan **varians pergeseran ranking nol mutlak ($\sigma^2_{\text{rank}} = 0.00$)**.

### 10.3 Post-MVP Strategic Roadmap (Fase 5)
Pengembangan pasca-stabilisasi produksi berfokus pada tiga inisiatif strategis:
1. **Aktivasi Live Jev System One Client:** Menghubungkan SDK resmi `typesafe-sdk` ke endpoint produksi TypeSafe AI saat kunci lisensi telah diterbitkan.
2. **Pengembangan Vector Store Decoupling:** Memisahkan lapisan repositori vektor untuk mendukung pengujian komparatif performa pgvector vs basis data terdistribusi pada beban $> 100.000$ CV.
3. **Penyempurnaan Asisten Tanya Jawab Rekruter Berbasis Bukti:** Fitur interaktif *read-only* bagi rekruter untuk mengajukan pertanyaan klarifikasi profil, di mana seluruh jawaban model diikatkan secara ketat pada kutipan verbatim yang telah terverifikasi.

---

*Dokumen spesifikasi arsitektur produk ini menjadi acuan rekayasa perangkat lunak definitif bagi seluruh implementasi backend, frontend, worker, dan protokol audit dalam repositori `agentic-cv-screener`.*
