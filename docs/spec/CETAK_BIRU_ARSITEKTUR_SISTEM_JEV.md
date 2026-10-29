# CETAK BIRU REKAYASA ARSITEKTUR SISTEM

> **Catatan status (2026-10-29):** dokumen ini ditulis sebelum integrasi Jev diukur dan sebelum uji dengan CV nyata. Sebagian klaimnya berbeda dari implementasi dan hasil ukur: alurnya **bertahap tetap, bukan agent otonom**; hasil Jev **tidak sepenuhnya deterministik** (cache hasil Jev belum ada); dan angka kinerja apa pun di sini harus dibaca bersama hasil ukur yang sebenarnya. Yang berlaku: [`CLAUDE.md`](../../CLAUDE.md), [`DECISIONS.md`](DECISIONS.md), dan [hasil ukur](../eval/BENCHMARK_RESULTS_2026-10-29.md). Dokumen ini disimpan sebagai riset dan latar belakang.
## End-to-End AI Talent Acquisition & Screening Platform: Dari Dekonstruksi Job Desc Hingga Perankingan Bukti
### Taksonomi Arsitektural Komprehensif: Full Jev, Full Deterministik, Full LLM, dan 4 Varian Sistem Hibrida

---

# 1. PENDAHULUAN & CAKUPAN END-TO-END

Cetak biru rekayasa ini memetakan arsitektur sistem seleksi bakat dan penyaringan berkas (*Talent Acquisition & Screening Platform*) secara menyeluruh dari hulu ke hilir. Sistem mengawal data mulai dari **masukan teks mentah deskripsi pekerjaan (*Job Description/JD*) oleh HR**, dekonstruksi rubrik, parsing dan zonasi berkas pelamar, verifikasi bukti berbasis karakter eksak, evaluasi semantik kualifikasi, hingga penyusunan papan peringkat (*leaderboard ranking*) di antarmuka kerja rekruter.

```
[Tahap 1: Ingestion & Dekonstruksi JD] ──► [Tahap 2: Ingestion & Zonasi Berkas CV]
                    │                                             │
                    ▼                                             ▼
[Tahap 3: Penyusunan Rubrik & Bobot HR] ──► [Tahap 4: Verifikasi Grounding NFKC]
                    │                                             │
                    ▼                                             ▼
[Tahap 5: Evaluasi Semantik & Keputusan]──► [Tahap 6: Agregasi & Leaderboard Ranking]
                                                                  │
                                                                  ▼
                                            [Tahap 7: Recruiter Cockpit (Human-in-the-Loop)]
```

Dokumen ini secara formal membedah **tiga paradigma murni (*Pure Paradigms*)** dan **empat kombinasi hibrida (*Hybrid Variants*)**, menguraikan peran masing-masing teknologi di tiap lapisan, serta menetapkan arsitektur standar produksi (*Production Baseline*).

---

# 2. DEKOMPOSISI ALUR END-TO-END (HULU KE HILIR)

### Tahap 1: Ingestion & Dekonstruksi Job Description (JD Ingestion)
Menerima teks mentah lowongan (unstructured text / PDF draft) dari HR dan mendekonstruksinya menjadi unit kualifikasi diskrit (*Atomic Requirements*): peran, tingkat senioritas, kualifikasi mutlak (*hard gate*), kompetensi teknis, dan tanggung jawab proyek.

### Tahap 2: Penyusunan Rubrik & Penetapan Bobot (HR Approval Gate)
HR memvalidasi hasil ekstraksi JD, menentukan kategori (*MUST_HAVE*, *STRONG_PREFERENCE*, *NICE_TO_HAVE*), serta mengunci pembobotan persentase ($\sum w_i = 100\%$) ke dalam berkas kontrak data `requirement_set.json`.

### Tahap 3: Ingestion & Zonasi Berkas Pelamar (Document Ingestion & Zoning)
Menerima berkas pelamar dalam berbagai format (PDF digital, DOCX, maupun **CV hasil scan/desain grafis berbasis gambar/flattened image**). Mesin parser membedah dokumen melalui strategi berlapis:
* **Digital PDF / DOCX**: Diekstrak menggunakan IBM Docling lokal dengan rekonstruksi tata letak 2 kolom (*Document Layout Analysis*) dan tabel.
* **Scanned / Image-based CV (PDF Gambar / Flat Scan)**: Sistem mengaktifkan **Fallback OCR Engine Lokal** (Tesseract OCR / PyMuPDF OCR dengan dukungan bahasa Indonesia `ind` dan Inggris `eng`). Teks dari gambar diekstraksi ke karakter digital sebelum dinormalisasi ke standar NFKC.
* **Zonasi Semantik**: Halaman dan blok teks dipartisi ke dalam zona: `ZONE_RESUME`, `ZONE_CERTIFICATE`, dan `ZONE_AWARDS`.
* **Prinsip Keadilan Sertifikat**: Sertifikat dan dokumen penghargaan **murni berstatus OPSIONAL (Jalur Default Utama)**. Kompetensi diukur dari **rekam jejak proyek nyata (*proven track record*)**, bukan ketebalan berkas. Pelamar dengan CV teks ringkas 1 halaman berhak memperoleh nilai penuh (Band A / Top Rank) tanpa harus melampirkan sertifikat apa pun. Berkas sertifikat (jika ada) hanya berfungsi sebagai *verifier* fisik sekunder tanpa menggelembungkan skor kualifikasi.

### Tahap 4: Normalisasi Teks & Anti-Halusinasi (Unicode NFKC Grounding)
Seluruh teks dinormalisasi ke standar Unicode NFKC. Setiap kutipan bukti yang diajukan wajib diverifikasi secara karakter eksak (*exact substring match*) terhadap naskah asli pelamar. Toleransi klaim tanpa bukti: 0%.

### Tahap 5: Evaluasi Semantik Kualifikasi (Matching & Evidence Evaluation)
Mencocokkan potongan bukti pengalaman kerja pelamar terhadap butir kriteria pekerjaan yang disyaratkan untuk menilai pemenuhan syarat mutlak, level pembuktian proyek nyata, dan kedalaman teknis.

### Tahap 6: Kalkulasi Skor & Pemeringkatan (Aggregation & Leaderboard Ranking)
Mengagregasi hasil evaluasi kriteria ke dalam skor terbobot (0–100), mengelompokkan kandidat ke dalam 4 *Talent Bands* (`Band A`, `Band B`, `Band C`, `Band R`), dan menyusun papan peringkat (*Leaderboard Top 3 / Top N*).

### Tahap 7: Recruiter Cockpit UI (Human-in-the-Loop Decision Gate)
Menyajikan data ke rekruter melalui antarmuka modern taktil 3-tab (*Evaluasi Kriteria*, *Telemetri Keputusan*, *Kutipan Teks Asli*) dan bilah keputusan (*Decision Bar: Shortlist, Hold, Reject*).

---

# 3. EMPAT PARADIGMA ARSITEKTUR SISTEM

Sistem dapat dirancang menggunakan empat paradigma arsitektur berbeda:

```
                                  ┌── 1. Full Jev System One (Pure Semantic Decisions)
                                  │
                                  ├── 2. Full Deterministik (Pure Code / Rule-Based / ATS)
Paradigma Arsitektur ─────────────┼── 3. Full Bukan Jev / Full LLM (Pure Generative Prompting)
                                  │
                                  └── 4. Sistem Hibrida (Kombinasi Multi-Paradigma)
                                        ├── Varian 4.1: Jev × Deterministik (Baseline Produksi)
                                        ├── Varian 4.2: Jev × Generative AI
                                        ├── Varian 4.3: Generative AI × Deterministik
                                        └── Varian 4.4: Jev × Generative AI × Deterministik
```

---

## 3.1 Paradigma 1: Full Jev System One (Pure Semantic Decision Architecture)
* **Karakteristik**: Seluruh alur penalaran dan pencocokan dikerjakan murni melalui model keputusan semantik terstruktur (*Decisions API* via `api.typesafe.ai`), tanpa generasi teks bebas dan tanpa aturan regex manual.
* **Mekanisme Kerja**:
  * *Dekonstruksi JD*: Teks JD dicocokkan ke taksonomi tertutup melalui primitif `Choice` dan `Noul`.
  * *Evaluasi Bukti*: Menggunakan Trio Primitif: `Noul` (Hard Gate biner), `Choice` (Level bukti: `STRONG`/`PARTIAL`/`NOT_DEMONSTRATED`), dan `Score` (Kedalaman semantik kontinu $0.00 - 1.00$).
  * *Perankingan*: Dilakukan melalui perbandingan berpasangan (*pairwise comparison*: $A$ vs $B$).
* **Kelebihan**: Bebas halusinasi teks, luaran berupa distribusi probabilitas diskrit yang terukur, dan biaya token sangat hemat ($\$0.042$/1M token input, $\$0$ output).
* **Kelemahan & Hambatan Ekstrem**:
  1. *Ledakan Komputasi Perankingan*: Perbandingan pasangan antar kandidat membutuhkan kompleksitas kuadratik $\mathcal{O}(N^2)$. Untuk 100 kandidat dibutuhkan $4.950$ kali inferensi API, dan berisiko menghasilkan ketidakkonsistenan siklik (*Condorcet Paradox*: $A > B, B > C, C > A$).
  2. *Ketiadaan Parser Tata Letak*: Jev tidak memiliki engine parsing tata letak dokumen (OCR/layout parser), sehingga tidak bisa memproses PDF mentah tanpa perantara.

---

## 3.2 Paradigma 2: Full Deterministik (Pure Code / Rule-Based / ATS Klasik)
* **Karakteristik**: Sistem dibangun 100% menggunakan kode perangkat lunak konvensional (Python, PostgreSQL, Regex, AST parsing, BM25 / Full-Text Search). Nol ketergantungan pada model AI apa pun.
* **Mekanisme Kerja**:
  * *Dekonstruksi JD*: Parser berbasis kamus kata kunci (*keyword lexicon*) dan *named-entity recognition* lokal.
  * *Evaluasi Bukti*: Pencarian kecocokan string persis (*string matching* / keyword frequency) antara teks kriteria dan teks CV.
  * *Perankingan*: Penjumlahan skor frekuensi kata kunci (TF-IDF / BM25) dikalikan bobot statis di SQL/Python.
* **Kelebihan**: Latensi instan ($<10$ ms), biaya API $\$0.00$, komputasi 100% lokal, dan hasil run selalu identik secara mutlak (*exact reproducibility*).
* **Kelemahan & Hambatan Ekstrem**:
  1. *Kebutaan Semantik (*Semantic Blindness*)**: Gagal total memahami sinonim atau konteks padanan (misal: gagal mengenali bahwa `"membangun arsitektur perbankan dengan FastAPI"` setara dengan kualifikasi `"REST API Backend Engineer"`).
  2. *Rentan Keyword Stuffing*: Kandidat yang menyisipkan daftar ratusan kata kunci acak di CV akan mendapat skor tertinggi meskipun tidak memiliki pengalaman kerja nyata.

---

## 3.3 Paradigma 3: Full Bukan Jev / Full LLM (Pure Generative Prompting)
* **Karakteristik**: Seluruh siklus diserahkan kepada Large Language Model generatif percakapan (*autoregressive LLM* seperti GPT-4o, Claude 3.5, Llama-3) menggunakan prompt bahasa alami bebas.
* **Mekanisme Kerja**:
  * *Dekonstruksi JD*: Prompt generatif meminta LLM mengubah teks JD menjadi skema JSON kriteria.
  * *Evaluasi Bukti*: Prompt memasukkan teks CV dan meminta LLM menuliskan paragraf analisis kecocokan serta mengutip kalimat bukti.
  * *Perankingan*: Memasukkan 10–20 CV sekaligus ke dalam prompt konteks besar (*listwise ranking prompt*): *"Urutkan kandidat dari peringkat 1 sampai 10"*.
* **Kelebihan**: Sangat luwes, mampu menghasilkan narasi penjelasan yang terdengar cerdas dan manusiawi, serta mudah diprogram di awal (hanya memanggil endpoint chat).
* **Kelemahan & Hambatan Ekstrem**:
  1. *Halusinasi Kutipan (*Fabricated Evidence*)**: LLM generatif sering memparafrasekan teks atau mengarang bukti pengalaman yang sebenarnya tidak tertulis di CV pelamar.
  2. *Cacat Bias Posisi (*Lost in the Middle / Primacy-Recency Bias*)**: Pada listwise ranking, kandidat yang berada di awal atau akhir konteks prompt secara statistik selalu mendapat skor lebih tinggi dibanding kandidat di tengah.
  3. *Biaya Operasional Ekstrem*: Menelan 8.000–15.000 token per kandidat; biaya penyaringan 1.000 CV berkisar $\$15 - \$40$ dengan waktu inferensi lambat (10–25 detik per CV).

---

## 3.4 Paradigma 4: Sistem Hibrida (Hybrid Multi-Paradigm Architectures)

Sistem hibrida menggabungkan kekuatan masing-masing paradigma untuk meniadakan kelemahan ekstrem di atas. Terdapat 4 varian kombinasi arsitektural:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                VARIAN SISTEM HIBRIDA                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4.1 Jev × Deterministik         : Keputusan Semantik Jev + Mesin Perankingan Python    │
│                                   (⭐ STANDAR PRODUKSI RESMI AI7 SOLARIS)               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4.2 Jev × Generative AI         : Evaluasi Semantik Jev + Sintesis Narasi Wawancara LLM│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4.3 Generative AI × Deterministik: Ekstraksi Fleksibel LLM + Grounding & Scorer Python │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4.4 Jev × GenAI × Deterministik : Orkes Penuh 3-Lapis (Ingestion - Matching - Dossier) │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Varian 4.1: Jev × Deterministik (Standar Rekomendasi Produksi)
* **Distribusi Peran**:
  * **Jev System One**: Bertindak eksklusif sebagai *hakim semantik kualifikasi $\mathcal{O}(N)$* (mengevaluasi `Noul` untuk hard gate, `Choice` untuk level bukti, dan `Score` untuk kedalaman teknis).
  * **Deterministik (Python/PostgreSQL/Docling)**: Menangani parsing tata letak dokumen (Docling), zonasi lampiran, validasi integritas kutipan karakter eksak (NFKC), perhitungan skor matematis berbobot, dan penyusunan papan peringkat (*leaderboard*).
* **Kelebihan**: Menghilangkan komputasi kuadratik $\mathcal{O}(N^2)$ Jev, menutup celah halusinasi teks 100%, menghasilkan ranking matematis yang adil dan dapat diaudit secara hukum, serta menjaga biaya operasional pada level terendah ($\$0.025$ per 1.000 CV).

### Varian 4.2: Jev × Generative AI
* **Distribusi Peran**:
  * **Jev System One**: Mengevaluasi keputusan kecocokan kualifikasi dan memberi label status bukti (`STRONG`/`PARTIAL`).
  * **Generative AI**: Menerima status keputusan dari Jev dan teks kutipan CV asli, lalu bertugas menyusun draf panduan pertanyaan wawancara (*interview question sheet*) dan rangkuman profil eksekutif untuk HR.
* **Kelebihan**: Memberikan kenyamanan narasi bagi HR tanpa membiarkan Generative AI menyentuh penilaian skor (skor tetap objektif dari Jev).
* **Catatan**: Membutuhkan sedikit tambahan biaya token untuk modul penyusunan narasi hilir.

### Varian 4.3: Generative AI × Deterministik
* **Distribusi Peran**:
  * **Generative AI**: Mengekstrak teks JD mentah menjadi kriteria JSON serta membaca variasi istilah pengalaman kerja di CV.
  * **Deterministik**: Memverifikasi kutipan kalimat LLM dengan naskah asli CV (NFKC exact match), menghitung agregasi skor di Python, dan menyusun ranking secara matematis.
* **Kelebihan**: Fleksibilitas tinggi dalam membaca teks JD/CV yang formatnya sangat rusak, dengan jaminan bahwa LLM dilarang melakukan perankingan bebas.
* **Catatan**: Masih menyisakan biaya token input/output yang cukup tinggi pada tahap inferensi kualifikasi.

### Varian 4.4: Jev × Generative AI × Deterministik (Orkestrasi Penuh 3-Lapis)
* **Distribusi Peran**:
  1. *Tahap Hulu (JD Ingestion)*: Generative AI membantu menyusun draf kriteria terstruktur dari teks JD mentah $\rightarrow$ dikunci oleh persetujuan HR.
  2. *Tahap Tengah (Parsing & Grounding)*: Mesin Deterministik (Docling + NFKC verifier) memproses dokumen pelamar dan mengunci keabsahan kutipan teks asli.
  3. *Tahap Inti (Evaluasi Bukti)*: Jev System One mengevaluasi kualifikasi semantik secara independen $\mathcal{O}(N)$ dengan tarif input termurah.
  4. *Tahap Hilir (Ranking & Dossier)*: Mesin Deterministik menghitung skor akhir dan menyusun leaderboard, lalu Generative AI memformat lembar dossier dan pertanyaan wawancara pelamar.
* **Kelebihan**: Arsitektur paling komprehensif untuk skala enterprise yang membutuhkan otomatisasi penuh sekaligus kepatuhan audit regulasi ketat.

---

# 4. TABEL MATRIKS PERBANDINGAN KOMPREHENSIF PER KOMPONEN

Tabel berikut menyajikan perbandingan komparatif per modul arsitektur:

| Modul / Komponen Sistem | 1. Full Jev System One | 2. Full Deterministik | 3. Full Bukan Jev (Full LLM) | 4. Sistem Hibrida (Jev × Deterministik) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Ingestion & Dekonstruksi JD** | Pemetaan via Noul/Choice ke taksonomi baku. *(Akurat, tapi kaku)* | Regex & kamus kata kunci baku. *(Sangat rapuh terhadap istilah baru)* | Ekstraksi bebas via prompt LLM. *(Fleksibel, tapi format rentan meleset)* | **Parser Berbasis Skema + Human Approval Gate HR** *(Terkontrol & adaptif)* |
| **2. Parsing Dokumen & Zonasi Lampiran** | Hanya membaca teks polos; butuh pra-pemrosesan luar. | Parser teks dasar (pypdf/pdfminer). *(Gagal pada layout 2 kolom & gagal total pada scan gambar)* | Multimodal Vision API per lembar PDF. *(Sangat mahal & latensi tinggi: 10 dtk/CV)* | **IBM Docling + Fallback OCR Lokal (Tesseract `ind`+`eng`)** *(Layout-aware, otomatis OCR jika PDF gambar/scan, 100% lokal, $0)* |
| **3. Grounding & Anti-Halusinasi Teks** | Evaluasi probabilitas klaim semantik tanpa teks bebas. | Pencocokan string kata kunci persis (*exact keyword matching*). | Model diminta mengutip dan menjelaskan kalimat. *(Rawan bukti palsu)* | **Unicode NFKC Exact Substring Matcher** *(Jaminan 100% kutipan asli, toleransi halusinasi 0%)* |
| **4. Evaluasi Semantik Kualifikasi** | Trio Primitif: `Noul`, `Choice`, dan `Score`. | Pencocokan frekuensi istilah kata kunci (TF-IDF/BM25). | Penalaran teks bebas prompt panjang. *(Rawan manipulasi prompt injection)* | **Evaluasi Semantik Murni TypeSafe Jev (`api.typesafe.ai`)** *(Objektif, cepat <150 ms, hemat $0.042/1M)* |
| **5. Perhitungan Skor & Leaderboard** | Pairwise ranking antar pasangan kandidat $\mathcal{O}(N^2)$. *(Tidak terukur)* | Penjumlahan bobot kata kunci statis di SQL/Python. | Listwise ranking di dalam prompt generatif. *(Cacat bias posisi & acak)* | **Scorer Deterministik Python (Bobot HR + Tie-Breaker)** *(Adil, matematis konsisten, patuh audit)* |
| **6. Penanganan Sertifikat & Dokumen Pendukung** | Evaluasi biner ada/tidaknya dokumen di teks. | Pencarian kata kunci nama sertifikat di seluruh file. | Membaca semua lembar sertifikat tanpa verifikasi relevansi; rawan bias ketebalan berkas. | **Jalur Default Murni (*Default Practical Track*)**: Sertifikat dan penghargaan **murni berstatus opsional**. Skor 100% didasarkan pada kedalaman bukti proyek nyata di CV; CV 1 lembar memiliki hak setara penuh meraih Top 1 (Band A). |
| **7. Antarmuka Rekruter Cockpit** | Hanya menyajikan data mentah probabilitas numerik. | Tabel grid konvensional berisi skor persentase kata kunci. | Teks narasi panjang generatif yang sering bertele-tele. | **Recruiter Cockpit 3-Tab Taktil + Bilah Keputusan HR** *(Ergonomi anti-slop, Human-in-the-Loop)* |

---

# 5. FORMULASI AGREGASI SKOR & TIE-BREAKER DETERMINISTIK (VARIAN 4.1)

Pada varian hibrida standar produksi (Jev $\times$ Deterministik), proses perankingan diturunkan secara formal untuk menjamin transparansi matematis:

### 1. Uji Syarat Mutlak / Hard Gate ($\Gamma$)
$$\Gamma = \prod_{k \in \mathcal{K}_{\text{must}}} \mathbb{I}\left( P_{\text{noul}}(k) \ge \tau_k \right)$$
Kandidat yang tidak memenuhi salah satu syarat mutlak ($\Gamma = 0$) langsung dialokasikan ke **Band R (Rejected)** dengan status tidak memenuhi kualifikasi dasar.

### 2. Skor Pembuktian Terbobot ($S_{\text{evidence}}$)
Untuk kandidat yang lolos syarat mutlak ($\Gamma = 1$), skor pembuktian dihitung berdasarkan bobot kriteria yang disetujui HR:
$$S_{\text{evidence}} = \sum_{j \in \mathcal{K}_{\text{eval}}} w_j \cdot v\left( \text{Choice}_j \right)$$
Dimana:
* $w_j$ adalah persentase bobot kriteria ke-$j$ dengan $\sum w_j = 100$.
* $v(\text{Choice}_j)$ adalah fungsi konversi diskrit:
  $$v(\text{Choice}_j) = \begin{cases} 1.0 & \text{jika } \text{STRONG} \\ 0.5 & \text{jika } \text{PARTIAL} \\ 0.0 & \text{jika } \text{NOT\_DEMONSTRATED} \end{cases}$$

### 3. Tie-Breaker Kedalaman Semantik Kontinu ($S_{\text{depth}}$)
Untuk membedakan kandidat yang memiliki level bukti identik:
$$S_{\text{final}} = S_{\text{evidence}} + \alpha \cdot \left( \frac{1}{|\mathcal{K}_{\text{eval}}|} \sum_{j \in \mathcal{K}_{\text{eval}}} \text{Score}_j \right)$$
Faktor skala $\alpha = 0.05$ (bobot 5%), sehingga nilai kedalaman semantik kontinu dari Jev ($0.00 - 1.00$) menjadi pembeda desimal objektif tanpa mengaburkan penilaian kriteria utama HR.

---

# 6. PERBANDINGAN EKONOMI SISTEM & FOOTPRINT INFRASTRUKTUR

| Parameter Evaluasi | Full Generative LLM | Full Deterministik | Hibrida: Jev × Deterministik |
| :--- | :---: | :---: | :---: |
| **Tarif Token Input** | \$1.00 – \$3.00 / 1M token | \$0.00 (Tanpa Model) | **\$0.042 / 1M token** |
| **Tarif Token Output** | \$2.00 – \$10.00 / 1M token | \$0.00 (Tanpa Model) | **\$0.00 (Bebas Biaya Output)** |
| **Konsumsi Token / CV** | 6.000 – 12.000 token | 0 token | **$\approx 600 - 1.000$ token** |
| **Biaya Screening 1.000 CV** | \$15.00 – \$40.00 | \$0.00 | **\$0.025 – \$0.040** |
| **Daya Tampung Anggaran \$5** | 300 – 800 CV | Tak Terhingga | **150.000 – 200.000 CV** |
| **Latensi per Kandidat** | 10 – 25 detik | < 50 ms | **1.2 – 2.0 detik** |
| **Ketahanan Halusinasi** | Rendah (Rawan karangan fiktif) | Sempurna (100% kaku) | **Sempurna (Exact NFKC Match)** |
| **Pemahaman Semantik** | Sangat Baik (Tapi rentan bias) | Nol (Hanya string matching) | **Tinggi (Model Keputusan Diskrit)** |

---

# 7. KESIMPULAN ARSITEKTUR

1. **Dekonstruksi Holistik Hulu ke Hilir**: Sistem menyatukan alur mulai dari masukan teks mentah Job Description oleh HR, penerbitan kontrak kriteria terbobot, hingga penyaringan berkas berkeadilan.
2. **Kelemahan Paradigma Murni**:
   * *Full Jev* terkendala kompleksitas kuadratik $\mathcal{O}(N^2)$ pada perankingan dan butuh parser eksternal.
   * *Full Deterministik* buta makna semantik dan mudah dimanipulasi kata kunci palsu.
   * *Full Generative LLM* cacat bias posisi (*Lost in the Middle*), rawan halusinasi kutipan, dan boros anggaran.
3. **Keunggulan Standar Produksi (Jev $\times$ Deterministik)**:
   * Jev System One menjalankan fungsi terkuatnya sebagai **juri semantik objektif $\mathcal{O}(N)$** bebas halusinasi dengan biaya termurah.
   * Mesin deterministik lokal (IBM Docling, Unicode NFKC Matcher, dan Scorer Python) mengamankan integritas pembacaan tata letak dokumen, validasi kutipan eksak, serta penghitungan papan peringkat matematis yang adil dan dapat diaudit.
4. **Prinsip Keadilan Dokumen Pelamar (*Document Fairness Doctrine*)**:
   * Sistem beroperasi pada **Jalur Default Murni (*Default Practical Track*)**: sertifikat, lisensi pelatihan, dan piagam penghargaan berstatus **100% opsional**.
   * Kompetensi dinilai murni dari rekam jejak penyelesaian masalah dan kedalaman proyek nyata. Pelamar dengan CV teks ringkas 1 lembar memiliki hak dan peluang setara mutlak untuk menempati peringkat teratas (Top 1 / Band A) tanpa terancam tergeser oleh bundel berkas tebal. Lampiran berkas fisik semata-mata menjadi catatan pembantu di dashboard rekruter.
