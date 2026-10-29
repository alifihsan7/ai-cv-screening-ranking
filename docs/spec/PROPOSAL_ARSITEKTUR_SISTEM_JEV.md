# PROPOSAL & CETAK BIRU REKAYASA SISTEM

> **Catatan status (2026-10-29):** dokumen ini ditulis sebelum integrasi Jev diukur dan sebelum uji dengan CV nyata. Sebagian klaimnya berbeda dari implementasi dan hasil ukur: alurnya **bertahap tetap, bukan agent otonom**; hasil Jev **tidak sepenuhnya deterministik** (cache hasil Jev belum ada); dan angka kinerja apa pun di sini harus dibaca bersama hasil ukur yang sebenarnya. Yang berlaku: [`CLAUDE.md`](../../CLAUDE.md), [`DECISIONS.md`](DECISIONS.md), dan [hasil ukur](../eval/BENCHMARK_RESULTS_2026-10-29.md). Dokumen ini disimpan sebagai riset dan latar belakang.
## End-to-End AI Talent Acquisition & Screening Platform: Dari Dekonstruksi Job Desc Hingga Perankingan Bukti
### Evaluasi Komparatif Arsitektur: Full AI Jev System One vs Full LLM Biasa vs Sistem Hibrida

---

# 1. PENDAHULUAN & CAKUPAN END-TO-END

Berdasarkan diskusi dan arahan bimbingan terbaru, cakupan sistem ini **bukan hanya menyaring CV di tahap hilir**, melainkan mencakup seluruh siklus rekrutmen dari hulu ke hilir:

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

Dokumen ini membedah arsitektur sistem secara menyeluruh, mengulas bagaimana sistem menangani input teks mentah Job Description (JD), membandingkan secara objektif **tiga paradigma arsitektur (Full Jev, Non-Jev / Full LLM, dan Hibrida)** di setiap komponen, serta menetapkan rekomendasi teknis terbaik yang siap dipresentasikan ke tim penguji dan dosen pembimbing.

---

# 2. ALUR END-TO-END: DARI JOB DESC HINGGA REKRUTER COCKPIT

## Tahap 1: Ingestion & Dekonstruksi Job Description (JD Compiler)
* **Input Mentah**: Dokumen lowongan bebas dari HR (bisa berupa teks memo, PDF draft lowongan, atau bullet points deskripsi pekerjaan).
* **Proses**: Sistem mendekonstruksi teks JD menjadi unit-unit kualifikasi diskrit (*Atomic Requirements*).
* **Ekstraksi Komponen**:
  1. *Role Family & Seniority Level* (misal: Backend Engineer, Minimal 3 Tahun).
  2. *Hard Gate Requirements* (Syarat mutlak: Gelar S1, Sertifikasi Lisensi Tertentu).
  3. *Core Competencies & Stack* (Python, FastAPI, PostgreSQL, Docker).
  4. *Project Responsibilities & Metrics* (Pengalaman merancang sistem high-concurrency, optimasi latensi query).

## Tahap 2: Validasi & Approval Rubrik oleh HR (Human-in-the-Loop Gate 1)
* Sebelum CV diproses, HR memeriksa hasil dekonstruksi JD di antarmuka web.
* HR menetapkan:
  * Kategori Kriteria: *MUST_HAVE* (Syarat Wajib), *STRONG_PREFERENCE*, atau *NICE_TO_HAVE*.
  * Pembobotan Persentase: Total bobot $100\%$ terdistribusi pada kategori Pengalaman, Keahlian Teknis, dan Prestasi.
* **Hasil**: Berkas spesifikasi kriteria terstruktur yang dikunci (`requirement_set.json`).

## Tahap 3: Ingestion & Zonasi Dokumen Pelamar (CV & Bundel Lampiran)
* Pelamar mengunggah berkas (PDF atau DOCX tunggal maupun bundel multi-halaman berisi sertifikat/penghargaan).
* Parser IBM Docling mengekstrak struktur teks, layout tabel 2-kolom, dan mempartisi halaman ke dalam zona:
  * `ZONE_RESUME`: Teks riwayat kerja, deskripsi proyek, dan pendidikan.
  * `ZONE_CERTIFICATE`: Sertifikat pelatihan, lisensi profesi, atau bootcamps.
  * `ZONE_AWARDS`: Dokumen penghargaan atau kompetisi.

## Tahap 4: Normalisasi & Verifikasi Grounding NFKC (Zero-Hallucination Guard)
* Seluruh teks dinormalisasi ke standar Unicode NFKC.
* Setiap klaim atau kutipan yang diajukan dalam analisis diuji secara deterministik menggunakan *Exact Substring Matching*.
* Jika ada klaim kualifikasi yang tidak ditemukan dalam teks asli dokumen, sistem menandai sebagai *Unverified Claim* (Toleransi halusinasi: 0%).

## Tahap 5: Evaluasi Semantik Kualifikasi (Matching Layer)
* Setiap kriteria dari JD dicocokkan terhadap zona pengalaman kandidat yang relevan.
* Menguji kualifikasi mutlak, tingkat demonstrasi bukti proyek nyata, serta kedalaman teknis kandidat.

## Tahap 6: Agregasi Skor & Perankingan Leaderboard (Ranking Engine)
* Sistem lokal menghitung nilai akhir terbobot (skala 0–100) dan menentukan pemetaan ke dalam 4 talent bands (`Band A`, `Band B`, `Band C`, `Band R`).
* Leaderboard Top 3 / Top N disusun secara matematis untuk diberikan kepada rekruter.

## Tahap 7: Recruiter Cockpit (Human-in-the-Loop Gate 2)
* Rekruter meninjau kandidat di dashboard modern anti-slop:
  * Tab 1: Evaluasi Kriteria (Rincian bukti per butir JD).
  * Tab 2: Telemetri Keputusan (Latensi komputasi & reasoning trace).
  * Tab 3: Kutipan CV Terverifikasi (Highlight teks asli dokumen).
* Rekruter mengambil keputusan akhir: *Shortlist*, *Hold*, *Reject*, atau *Jadwalkan Wawancara*.

---

# 3. ANALISIS PERBANDINGAN KOMPONEN: FULL JEV VS BUKAN JEV (FULL LLM) VS HIBRIDA

Berikut adalah analisis komparatif mendalam untuk setiap modul utama sistem:

## 3.1 Komponen 1: Dekonstruksi & Ekstraksi Job Description (JD Compiler)

* **Opsi A: Full Jev System One**
  * *Cara Kerja*: Jev adalah model keputusan diskrit (*Decisions API*), bukan model generatif percakapan (*autoregressive text generator*). Untuk mendekonstruksi JD, sistem harus mendefinisikan taksonomi kriteria tertutup terlebih dahulu (misal: 100 pilihan skill standar). Jev lalu mengevaluasi opsi mana yang terkandung di dalam teks JD (`Noul`/`Choice`).
  * *Kelebihan*: Ekstraksi sangat terkontrol dan patuh pada taksonomi baku. Tidak ada risiko AI mengarang skill aneh yang tidak ada di industri.
  * *Kelemahan*: Kaku. Jika ada istilah baru atau penulisan peran non-standar di JD HR, Jev tidak bisa menghasilkan teks bebas untuk deskripsi kriteria baru tanpa taksonomi awal.
* **Opsi B: Bukan Jev (Full LLM Generatif Biasa, misal Llama/GPT)**
  * *Cara Kerja*: Memberikan prompt panjang ke LLM: *"Ekstrak kriteria, bobot, dan syarat mutlak dari teks JD berikut menjadi JSON"*.
  * *Kelebihan*: Sangat fleksibel, mampu merangkum teks JD yang berantakan, dan mampu menuliskan narasi deskripsi requirement secara otomatis.
  * *Kelemahan*: Rentan halusinasi skema JSON, ekstraksi sering tidak konsisten (tiap run bisa menghasilkan jumlah kriteria berbeda), dan boros token ($~3.000$ token per JD).
* **Opsi C: Pendekatan Hibrida (Rekomendasi)**
  * *Cara Kerja*: Menggunakan parser rule-based/regex terstruktur untuk menangkap seksi JD baku, dibantu model generatif terisolasi untuk ekstraksi teks bebas ke skema JSON, lalu diverifikasi oleh HR pada Approval Gate sebelum dikunci.

---

## 3.2 Komponen 2: Parsing & Zonasi Dokumen Pelamar (CV & Bundel)

* **Opsi A: Full Jev System One**
  * *Cara Kerja*: Jev tidak memiliki engine OCR atau visual layout rendering native. Dokumen harus diubah ke plain text terlebih dahulu oleh script eksternal sebelum diproses oleh Jev.
  * *Kelebihan*: Tidak membebani model dengan token visual mentah.
  * *Kelemahan*: Tidak bisa membedakan tata letak dua kolom atau tabel visual secara mandiri tanpa parser dokumen eksternal.
* **Opsi B: Bukan Jev (Full LLM Multimodal / Vision)**
  * *Cara Kerja*: Mengirimkan seluruh halaman PDF sebagai gambar ke LLM Multimodal (Vision API).
  * *Kelebihan*: Mampu membaca layout visual dan grafis sertifikat secara langsung.
  * *Kelemahan*: Biaya komputasi dan token astronomis ($~1.500$ token per gambar halaman; CV 10 halaman = 15.000 token per pelamar). Latensi sangat lambat (5–12 detik per CV), dan rawan salah membaca teks kecil pada transkrip ijazah.
* **Opsi C: Pendekatan Hibrida (Rekomendasi)**
  * *Cara Kerja*: Menggunakan engine lokal **IBM Docling**. Docling membedah dokumen PDF/DOCX secara layout-aware (mempertahankan tabel dan membaca 2 kolom dengan benar) serta mempartisi dokumen ke dalam zona (`ZONE_RESUME`, `ZONE_CERTIFICATE`, `ZONE_AWARDS`) dengan latensi $<500$ ms tanpa biaya token.

---

## 3.3 Komponen 3: Verifikasi Integritas & Anti-Halusinasi Bukti

* **Opsi A: Full Jev System One**
  * *Cara Kerja*: Jev mengevaluasi probabilitas kebenaran klaim berdasarkan potongan teks CV yang diberikan secara eksplisit.
  * *Kelebihan*: Karena Jev tidak menggenerasi teks bebas, risiko model mengarang kalimat buatan sendiri bernilai 0%.
  * *Kelemahan*: Masih memerlukan verifikasi substring string di memori untuk memastikan token offset kutipan akurat di karakter dokumen.
* **Opsi B: Bukan Jev (Full LLM Generatif Biasa)**
  * *Cara Kerja*: Meminta LLM: *"Kutip kalimat dari CV yang membuktikan kandidat menguasai Python"*.
  * *Kelebihan*: Menghasilkan penjelasan bahasa alami yang lancar bagi pembaca manusia.
  * *Kelemahan*: **Kelemahan fatal rekrutmen**: LLM generatif sering memparafrasekan kalimat kandidat atau bahkan menyisipkan pengalaman fiktif yang tidak pernah ada di berkas asli pelamar (*hallucinatory citation*).
* **Opsi C: Pendekatan Hibrida (Rekomendasi)**
  * *Cara Kerja*: Menerapkan **Unicode NFKC Exact Substring Matcher** di Python lokal. Sistem mewajibkan setiap kutipan bukti cocok 100% karakter per karakter dengan teks asli dokumen. Evaluasi relevansi semantik diserahkan ke Jev, sementara bukti fisik dikunci oleh verifier deterministik.

---

## 3.4 Komponen 4: Evaluasi Kecocokan Kualifikasi (Semantic Matching)

* **Opsi A: Full Jev System One**
  * *Cara Kerja*: Menggunakan tiga primitif Jev secara penuh:
    1. `Noul`: Evaluasi kualifikasi mutlak (*Hard Gate Yes/No*).
    2. `Choice`: Klasifikasi level pembuktian tertutup (`STRONG` / `PARTIAL` / `NOT_DEMONSTRATED`).
    3. `Score`: Evaluasi skalar kontinu kedalaman semantik pengalaman teknis ($0.00 - 1.00$).
  * *Kelebihan*: Deterministik, luaran berupa distribusi probabilitas terstruktur, waktu inferensi sangat cepat ($<150$ ms), biaya token sangat murah ($\$0.042$ / 1M token input, $\$0$ output), dan bebas bias kata-kata berbunga di CV.
  * *Kelemahan*: Tidak menghasilkan paragraf opini atau saran wawancara dalam bahasa bebas secara otomatis.
* **Opsi B: Bukan Jev (Full LLM Generatif Biasa)**
  * *Cara Kerja*: Prompt perbandingan panjang berisi teks CV dan syarat lowongan, meminta LLM memberikan narasi analisis kecocokan.
  * *Kelebihan*: Memberikan narasi umpan balik yang terdengar cerdas dan manusiawi.
  * *Kelemahan*: *Prompt sensitivity* tinggi (perubahan minor pada template prompt bisa mengubah penilaian kandidat), rentan manipulasi *prompt injection* tersembunyi di CV (misal: instruksi putih transparan di PDF), serta waktu inferensi lambat (2–5 detik per evaluasi kriteria).
* **Opsi C: Pendekatan Hibrida (Rekomendasi)**
  * *Cara Kerja*: Seluruh evaluasi kecocokan inti dieksekusi oleh Jev System One. Jev bertindak sebagai hakim semantik objektif bebas halusinasi.

---

## 3.5 Komponen 5: Perhitungan Skor & Perankingan Kandidat (Ranking Engine)

* **Opsi A: Full Jev System One (Pure Single-Model Ranking)**
  * *Cara Kerja*: Menggunakan model untuk membandingkan pasangan kandidat secara langsung (*pairwise classification*): *"Antara Kandidat A dan Kandidat B, mana yang lebih memenuhi syarat?"*.
  * *Kelebihan*: Mampu menangkap nuansa komparasi langsung antar kandidat.
  * *Kelemahan*: Kompleksitas komputasi melonjak secara kuadratik $\mathcal{O}(N^2)$. Jika ada 100 pelamar, sistem harus melakukan 4.950 perbandingan pasangan! Ini sangat tidak efisien dan rentan terhadap inkonsistensi siklik (A > B, B > C, tapi C > A).
* **Opsi B: Bukan Jev (Full LLM Listwise Ranking)**
  * *Cara Kerja*: Memasukkan 10 CV sekaligus ke dalam satu prompt konteks besar, lalu menyuruh LLM: *"Urutkan kandidat dari peringkat 1 sampai 10"*.
  * *Kelebihan*: Sangat mudah diprogram (hanya satu prompt pemanggilan).
  * *Kelemahan*: **Cacat fatal metodologi AI**: Dipengaruhi oleh bias posisi (*Lost in the Middle / Primacy-Recency Bias* — kandidat yang diletakkan di awal atau akhir prompt cenderung diberi skor lebih tinggi daripada yang di tengah). Tidak ada rumus matematis yang konsisten dan tidak bisa diaudit secara hukum ketenagakerjaan.
* **Opsi C: Pendekatan Hibrida (Rekomendasi)**
  * *Cara Kerja*: **AI Tidak Boleh Berhitung**. Jev hanya bertugas menilai status kriteria per kandidat secara independen $\mathcal{O}(N)$. Skor total 0–100 dihitung oleh mesin lokal Python menggunakan rumus agregasi berbobot. Leaderboard diurutkan secara matematis transparan dan deterministik.

---

# 4. TABEL MATRIKS PERBANDINGAN KOMPREHENSIF PER KOMPONEN

| Modul / Komponen Sistem | Opsi A: Full Jev System One | Opsi B: Bukan Jev (Full LLM Biasa) | Opsi C: Sistem Hibrida (Rekomendasi) | Mengapa Opsi C Terbaik? |
| :--- | :--- | :--- | :--- | :--- |
| **1. Dekonstruksi Job Desc (JD Ingestion)** | Pemetaan tertutup via Noul/Choice ke taksonomi baku. *(Akurat, tapi kaku jika ada role baru)* | Ekstraksi teks bebas via prompt generatif. *(Fleksibel, tapi rawan halusinasi format)* | Ekstraksi terstruktur berbasis skema + validasi Approval Gate HR. | Menjamin skema kriteria valid dan HR memegang kendali atas bobot sebelum screening dimulai. |
| **2. Parsing Dokumen & Zonasi Lampiran** | Hanya membaca teks polos; butuh pra-pemrosesan teks eksternal. | Vision API multimodal per halaman. *(Sangat mahal: \$0.01 per halaman, latensi lambat)* | IBM Docling lokal: Layout-aware + zonasi `ZONE_RESUME` & `ZONE_CERT`. | Menangani 2 kolom dan bundel lampiran secara akurat dengan latensi $<500$ ms tanpa biaya token. |
| **3. Grounding & Anti-Halusinasi Teks** | Evaluasi probabilitas klaim semantik tanpa teks bebas. | Model diminta mengutip dan menjelaskan kalimat CV. *(Rawan parafrase palsu)* | Unicode NFKC Exact Substring Matcher deterministik di Python. | Memastikan kutipan bukti di dashboard 100% identik dengan naskah asli pelamar. |
| **4. Evaluasi Semantik Kriteria** | Trio Primitif: `Noul` (Gate), `Choice` (Level Bukti), dan `Score` (Kedalaman). | Penalaran teks bebas dengan prompt panjang. *(Rawan bias dan prompt injection)* | Evaluasi Semantik Murni via API resmi TypeSafe Jev (`api.typesafe.ai`). | Menjamin keputusan bebas halusinasi, latensi $<150$ ms, dan tarif sangat murah (\$0.042/1M token). |
| **5. Perhitungan Skor & Leaderboard** | Pairwise ranking antar pasangan kandidat $\mathcal{O}(N^2)$. *(Tidak efisien untuk volume ratusan CV)* | Listwise ranking di dalam prompt generatif. *(Cacat bias posisi & tidak konsisten)* | Scorer Deterministik Python: Rumus agregasi bobot HR + Tie-Breaker kontinu. | Adil, transparan, matematis terukur, konsisten antar pemanggilan, dan memenuhi kepatuhan regulasi. |
| **6. Penanganan Lampiran Sertifikat** | Evaluasi biner apakah dokumen ada di teks. | Model membaca seluruh lampiran dan rentan melebih-lebihkan sertifikat kursus 2 jam. | *Claim-to-Artifact Matching*: Pengalaman proyek nyata diutamakan di atas kertas sertifikat. | Menjamin keadilan bagi kandidat CV 1 halaman agar tidak kalah oleh kandidat pengumpul sertifikat. |
| **7. Dashboard Antarmuka Pengguna** | Data mentah probabilitas numerik saja. | Ringkasan teks panjang generatif yang sering bertele-tele. | Recruiter Cockpit Taktil: 3 Tab (Evaluasi, Telemetri, Kutipan Teks) + Decision Bar. | Ergonomi tinggi, kecepatan peninjauan HR maksimal, dan keputusan akhir tetap di tangan manusia. |

---

# 5. FORMULASI MATEMATIS AGREGASI DETERMINISTIK PADA SISTEM HIBRIDA

Untuk membuktikan kepada dosen dan penguji bahwa sistem ini objektif dan tidak bergantung pada "tebakan liar" LLM, perhitungan skor dirumuskan secara formal:

### 1. Hard Gate Qualification ($\Gamma$)
$$\Gamma = \prod_{k \in \mathcal{K}_{\text{must}}} \mathbb{I}\left( P_{\text{noul}}(k) \ge \tau_k \right)$$
Jika salah satu syarat mutlak tidak terpenuhi ($\Gamma = 0$), kandidat langsung dialokasikan ke **Band R (Rejected)** dengan status tidak memenuhi kualifikasi dasar.

### 2. Weighted Evidence Score ($S_{\text{evidence}}$)
Untuk kandidat yang lolos hard gate ($\Gamma = 1$), skor bukti dihitung berdasarkan bobot kriteria yang disetujui HR:
$$S_{\text{evidence}} = \sum_{j \in \mathcal{K}_{\text{eval}}} w_j \cdot v\left( \text{Choice}_j \right)$$
Dimana:
* $w_j$ adalah bobot persentase kriteria ke-$j$ dengan $\sum w_j = 100$.
* $v(\text{Choice}_j)$ adalah fungsi nilai diskrit:
  $$v(\text{Choice}_j) = \begin{cases} 1.0 & \text{jika } \text{STRONG} \\ 0.5 & \text{jika } \text{PARTIAL} \\ 0.0 & \text{jika } \text{NOT\_DEMONSTRATED} \end{cases}$$

### 3. Continuous Semantic Depth ($S_{\text{depth}}$) & Tie-Breaker
Sebagai pembeda kualitas ketika kandidat memiliki kesamaan level bukti (sama-sama `STRONG`):
$$S_{\text{final}} = S_{\text{evidence}} + \alpha \cdot \left( \frac{1}{|\mathcal{K}_{\text{eval}}|} \sum_{j \in \mathcal{K}_{\text{eval}}} \text{Score}_j \right)$$
Faktor $\alpha$ disetel pada rentang $0.05$ (bobot 5%), sehingga nilai kedalaman semantik kontinu dari Jev ($0.00 - 1.00$) bertindak sebagai *tie-breaker* desimal yang adil dan elegan tanpa merusak bobot utama HR.

---

# 6. ESTIMASI EFISIENSI OPERASIONAL & EKONOMI SISTEM

| Parameter | Pendekatan Full Generative LLM | Arsitektur Hibrida TypeSafe Jev | Selisih Efisiensi |
| :--- | :---: | :---: | :---: |
| **Tarif Token Input** | \$1.00 – \$3.00 / 1M token | **\$0.042 / 1M token** | Lebih hemat $\approx 96\%$ |
| **Tarif Token Output** | \$2.00 – \$10.00 / 1M token | **\$0.00 (Tanpa Biaya Output)** | Hemat $100\%$ |
| **Konsumsi Token per CV** | 6.000 – 12.000 token | $\approx 600 - 1.000$ token | Reduksi token $10\times$ |
| **Biaya Screening 1.000 CV** | \$15.00 – \$40.00 | **\$0.025 – \$0.040** | **$>99\%$ Lebih Hemat** |
| **Kapasitas Anggaran \$5** | 300 – 800 CV | **150.000 – 200.000 CV** | Skalabilitas Enterprise |
| **Latensi per Kandidat** | 8 – 20 detik | **1.2 – 2.5 detik** | $5\times - 8\times$ Lebih Cepat |
| **Jaminan Halusinasi** | Rawan parafrase salah | **0% (NFKC Exact Substring)** | Terverifikasi Mutlak |

---

# 7. KESIMPULAN & REKOMENDASI UNTUK SIDANG / BIMBINGAN

1. **Bukan Sekadar CV Screening Hilir**:
   * Sistem mengawal siklus seleksi secara utuh: mulai dari dekonstruksi teks mentah Job Description oleh HR, penyusunan rubrik berbobot, zonasi berkas pelamar, hingga penyusunan leaderboard ranking.
2. **Keunggulan Sistem Hibrida Di Atas Paradigma Ekstrem**:
   * Menolak pendekatan *Full Generative LLM* karena cacat bias posisi, boros biaya, dan rawan halusinasi kutipan.
   * Menolak *Full Jev Pairwise* untuk ranking karena ledakan komputasi kuadratik $\mathcal{O}(N^2)$.
   * Mengadopsi **Sistem Hibrida**: AI mengevaluasi semantik bukti kualifikasi secara objektif via TypeSafe Jev System One, sementara mesin lokal Python mengunci kepastian parsing (Docling), validasi kutipan eksak (NFKC), dan kalkulasi leaderboard matematis.
3. **Keadilan Dokumen Terjamin**:
   * Pelamar dengan CV 1 halaman padat tetap memiliki peluang setara meraih peringkat teratas (Band A), karena sistem mengutamakan kedalaman bukti proyek nyata di atas jumlah tumpukan lembar sertifikat.
