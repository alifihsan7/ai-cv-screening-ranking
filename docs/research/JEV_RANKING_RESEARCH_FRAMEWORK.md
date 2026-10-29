# KERANGKA RISET AKADEMIK: EVALUASI PERANKINGAN CV MENGGUNAKAN JEV (TYPESAFE) VS. MESIN DETERMINISTIK

**Catatan status (2026-10-29):** dokumen ini ditulis sebelum integrasi Jev diukur dan sebelum uji dengan CV nyata. Sebagian klaimnya berbeda dari implementasi dan hasil ukur: alurnya **bertahap tetap, bukan agent otonom**; hasil Jev **tidak sepenuhnya deterministik** (cache hasil Jev belum ada); dan angka kinerja apa pun di sini harus dibaca bersama hasil ukur yang sebenarnya. Yang berlaku: [`CLAUDE.md`](../../CLAUDE.md), [`DECISIONS.md`](../spec/DECISIONS.md), dan [hasil ukur](../eval/BENCHMARK_RESULTS_2026-10-29.md). Dokumen ini disimpan sebagai riset dan latar belakang.

> **Judul Riset:**  
> *Analisis Komparatif Paradigma Perankingan Berkas Lamaran Kerja (Curriculum Vitae): Evaluasi Keterbatasan Generative Listwise LLM vs. Deterministic Multi-Criteria Scoring Berbasis Verifikasi Semantik Mikro (Jev TypeSafe)*  
>
> **Peneliti:** Alif Ihsan (`49711087+alifihsan7@users.noreply.github.com`)  
> **Laboratorium / Ekosistem:** AI7 Solaris Research & Engineering  
> **Target Luaran:** Bab Metodologi & Hasil Eksperimen Skripsi / Publikasi Ilmiah

---

## 1. PENDAHULUAN & LATAR BELAKANG RISET

### 1.1 Kebutuhan Praktis Rekruter: Dari Klasifikasi Biner ke Perankingan Ordinal
Dalam proses rekrutmen skala menengah hingga besar (50 hingga ribuan CV per lowongan), keputusan Human Resources (HR) tidak pernah sesederhana keputusan biner **Yes/No (Lolos / Tolak)**.
1. **Keterbatasan Kuota Wawancara:** Rekruter memiliki *bandwidth* fisik dan waktu yang terbatas (misal: hanya dapat mewawancarai 5–10 kandidat teratas dari 200 pelamar).
2. **Kebutuhan Prioritas Gradual:** Rekruter memerlukan **Daftar Peringkat (Ranking $1, 2, 3, \dots, N$)** yang bergradasi halus berdasarkan derajat kesesuaian kompetensi, pengalaman kerja, dan pemenuhan syarat mutlak (*must-have requirements*).

### 1.2 Masalah Sentral & Pertanyaan Riset (Research Questions)
Kemunculan Large Language Models (LLM) memicu tren untuk menyerahkan seluruh proses rekrutmen ke model AI generatif dengan prompt langsung (*"Ranking-lah kandidat-kandidat ini"*). Pertanyaan kritis yang diajukan oleh penguji/dosen pembimbing adalah:
> **"Apakah model bahasa seperti Jev (TypeSafe) atau LLM generatif dapat menentukan ranking kandidat secara langsung dan reliabel?"**

Untuk menjawab pertanyaan tersebut secara ilmiah, riset ini membagi masalah ke dalam 3 pertanyaan penelitian (*Research Questions*):
* **RQ1:** Apakah LLM / Jev yang diinstruksikan melakukan perankingan langsung (*Direct Listwise Ranking*) mampu mempertahankan akurasi urutan ranking terhadap *ground truth* rekruter manusia?
* **RQ2:** Sejauh mana pengaruh variasi urutan dokumen masukan (*Positional Bias / Permutation Sensitivity*) terhadap konsistensi ranking yang dihasilkan model generatif?
* **RQ3:** Apakah pemisahan tanggung jawab (*Separation of Concerns*)—di mana Jev hanya bertindak sebagai verifier bukti semantik mikro (*pointwise*), sedangkan perankingan makro dihitung oleh mesin matematika deterministik—menghasilkan tingkat determinisme, korelasi peringkat (*NDCG/Kendall's Tau*), dan *explainability* yang lebih unggul?

---

## 2. KAJIAN TEORI & PERBANDINGAN PARADIGMA

Dalam ranah *Information Retrieval* (IR) dan *Learning-to-Rank* (LTR), terdapat tiga pendekatan utama yang dievaluasi dalam penelitian ini:

```
PARADIGMA 1: GENERATIVE LISTWISE RANKING (Pendekatan Naif)
[CV 1, CV 2, ..., CV 15] ──► [ Prompt LLM ] ──► [ Output Ranking 1..15 ]
Kelemahan: Positional bias, konteks penuh sesak, non-deterministik, tidak ada audit jejak skor.

PARADIGMA 2: PURE POINTWISE LLM SCORING (Pendekatan Skoring Langsung)
[CV k] ──► [ LLM Generatif ] ──► "Skor: 87.5"
Kelemahan: LLM buruk dalam matematika floating-point, kalibrasi skor antar kandidat tidak konsisten.

PARADIGMA 3 (METODE USULAN): HYBRID POINTWISE VERIFICATION + DETERMINISTIC MCDA
[Potongan Bukti CV] ──► [ Jev TypeSafe (Closed Choices) ] ──► Status: STRONG/PARTIAL (Prob: 0.82)
                                                                       │
                                                                       ▼
[Aturan Lowongan JD] ────────────────────────► [ Mesin Skoring & Banding Deterministik Python ]
                                                                       │
                                                                       ▼
                                                       [ Ranking 1..N Matematis & Terdokumentasi ]
```

### 2.1 Keterbatasan Fundamental Model Generatif dalam Listwise Ranking
Riset terdini (Liu et al., 2023 - *"Lost in the Middle"*; Wang et al., 2023) membuktikan bahwa LLM mengalami degradasi atensi spasial yang parah ketika disuapi banyak dokumen teks panjang:
1. **Primacy & Recency Bias:** Model cenderung memprioritaskan dokumen yang terletak pada awal prompt (posisi 1–2) atau akhir prompt (posisi $N$), sementara dokumen di posisi tengah mengalami atensi terendah.
2. **Non-Determinism & Rank Drift:** Pada temperatur inferensi bahkan sekecil $T = 0.0$ sekalipun, perbedaan token batching pada GPU dapat menghasilkan pergeseran ranking (*rank flip*) antar kandidat yang berdekatan.
3. **Halusinasi Komparatif:** Model generatif sering kali menciptakan alasan fiktif untuk membenarkan urutan yang dipilihnya jika kapasitas memorinya terdistorsi oleh panjangnya prompt gabungan 15 CV.

### 2.2 Keunggulan Karakteristik Jev (TypeSafe) sebagai Pointwise Verifier
Dokumen spesifikasi arsitektur (`02_SCORING_RUBRIC_SPEC.md`) menetapkan integrasi **Jev dari TypeSafe** dengan karakteristik spesifik:
* **Output Pilihan Tertutup (*Closed Choices*):** Jev tidak menghasilkan teks esai bebas, melainkan klasifikasi diskrit:
  $$\text{State} \in \{\text{STRONG}, \text{PARTIAL}, \text{NOT\_DEMONSTRATED}\}$$
* **Probabilitas Terkalibrasi:** Jev menghasilkan angka probabilitas/confidence terkalibrasi $p \in [0.0, 1.0]$.
* **Zero-Hallucination Coupling:** Karena Jev tidak memproduksi kutipan teks sendiri, kode Python memilih kutipan *verbatim* dari potongan teks CV teratas hasil *hybrid retrieval*, lalu memvalidasinya dengan fungsi strict matching:
  $$\text{VerifyGrounding}(\text{quote}, \text{CV\_text}) \iff \text{quote} \subseteq \text{CV\_text} \land \text{len}(\text{quote}) \ge 5$$

---

## 3. METODOLOGI EKSPERIMEN

### 3.1 Objek Penelitian: Golden Dataset CV Screening
Eksperimen menggunakan **Golden Dataset** sintetis yang telah terkalibrasi di direktori `docs/spec/golden_dataset/`:
* **Job Description Utama (JD-01):** Senior Backend Engineer (Memuat 10 kriteria evaluasi R1–R10 dengan bobot terdistribusi).
* **Dataset Kandidat (15 Core CVs):**
  * 5 Kandidat Sangat Layak / Strong ($S_1, S_2, S_3, S_4, S_5$)
  * 5 Kandidat Ambigu / Marginal ($M_1, M_2, M_3, M_4, M_5$)
  * 5 Kandidat Tidak Relevan / Irrelevant ($I_1, I_2, I_3, I_4, I_5$)
* **Ground Truth Acuan (`expected_JD-01.json`):**
  Peringkat resmi hasil penilaian konsensus HR profesional:
  $$\text{Ground Truth} = [S_1, S_4, S_2, S_5, S_3, M_1, M_3, M_4, M_2, M_5, I_1, I_2, I_3, I_4, I_5]$$

### 3.2 Desain Perlakuan (Treatment Arms)

#### Perlakuan A (Baseline: Direct Listwise LLM Ranking)
* Seluruh teks dari 15 CV dimasukkan ke dalam satu prompt besar ke LLM (Gemini-3.8-Flash / Llama-3-70B via gateway).
* Prompt menginstruksikan model untuk membaca deskripsi pekerjaan JD-01 dan menghasilkan daftar urutan 15 kandidat beserta justifikasi ranking.
* **Uji Permutasi:** Eksperimen diulang 5 kali ($k=1 \dots 5$) dengan mengacak urutan kemunculan CV di dalam prompt.

#### Perlakuan B (Metode Usulan: Jev Pointwise Verifier + Deterministic Scorer)
* Setiap CV dievaluasi secara independen (*pointwise*) per kriteria R1–R10.
* Jev (TypeSafe) mengevaluasi pemenuhan syarat semantik dan mengembalikan status kualitatif (`STRONG`, `PARTIAL`, `NOT_DEMONSTRATED`).
* Kode Python (`src/domain/scorer.py`) menghitung:
  1. Skor komposit terbobot kategori:
     $$S_{\text{raw}} = 100 \times \frac{\sum_{r} (w_r \times v(m_r))}{\sum_r w_r}$$
  2. Pembatasan kualifikasi (*Band Capping*):
     * Band A (Semua Must-Have terpenuhi): $S_{\text{final}} = S_{\text{raw}}$
     * Band B (1 Must-Have gagal): $S_{\text{final}} = \min(S_{\text{raw}}, 74.0)$
     * Band C ($\ge 2$ Must-Have gagal): $S_{\text{final}} = \min(S_{\text{raw}}, 49.0)$
  3. Algoritma pemecah seri deterministik (*Tie-Breaking Hierarchy*).

---

## 4. METRIK EVALUASI EMPIRIS

Data hasil uji akan dievaluasi menggunakan 5 metrik kuantitatif standar Information Retrieval:

### 1. Normalized Discounted Cumulative Gain (NDCG@10)
Mengukur kualitas urutan perankingan dengan memberikan bobot penalti logaritmik terhadap kandidat yang salah posisi:
$$\text{DCG}@K = \sum_{i=1}^K \frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)}, \quad \text{NDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K}$$
*Target Evaluasi:* NDCG@10 $\ge 0.95$.

### 2. Kendall's Rank Correlation Coefficient ($\tau$)
Mengukur konkordansi perbandingan pasangan (*pairwise order*) antara ranking sistem ($R_{\text{sys}}$) dan ranking acuan ($R_{\text{gt}}$):
$$\tau = \frac{C - D}{\frac{1}{2} n (n - 1)}$$
Di mana $C$ adalah jumlah pasangan konkordan dan $D$ adalah jumlah pasangan diskordan.

### 3. Rank Drift Variance ($\sigma^2_{\text{rank}}$)
Mengukur stabilitas urutan ketika input diacak pada 5 iterasi run:
$$\sigma^2_{\text{rank}}(c) = \frac{1}{5} \sum_{k=1}^5 \left( \text{Rank}_k(c) - \overline{\text{Rank}}(c) \right)^2$$
*Target Evaluasi:* Pada metode deterministik, $\sigma^2_{\text{rank}} = 0.0$ (sempurna, tidak berubah sama sekali).

### 4. Hallucination & Citation Grounding Rate
Persentase klaim kualifikasi yang didukung oleh kutipan teks nyata di CV kandidat:
$$\text{Grounding Rate} = \frac{\sum \mathbb{I}(\text{quote} \in \text{CV\_text})}{\text{Total Citations}} \times 100\%$$

### 5. Latency & Resource Efficiency
Rata-rata waktu eksekusi per kandidat dan konsumsi total token inferensi.

---

## 5. TABEL TEMPLATE PENGUMPULAN DATA HASIL RISET

Template tabel berikut akan diisi setelah eksekusi script uji komparasi dijalankan:

| Metrik Evaluasi | Treatment A: Direct Listwise LLM | Treatment B: Jev (TypeSafe) + Scorer | Ambang Batas Diterima (Threshold) |
| :--- | :---: | :---: | :---: |
| **NDCG@5** | *[Hasil Uji]* | *[Hasil Uji]* | $\ge 0.95$ |
| **NDCG@10** | *[Hasil Uji]* | *[Hasil Uji]* | $\ge 0.90$ |
| **Kendall's Tau ($\tau$)** | *[Hasil Uji]* | *[Hasil Uji]* | $\ge 0.85$ |
| **Spearman's Rho ($\rho$)** | *[Hasil Uji]* | *[Hasil Uji]* | $\ge 0.85$ |
| **Rata-rata Rank Drift ($\sigma^2$)** | *[Hasil Uji (Tinggi)]* | **0.00 (Zero Drift)** | $0.00$ |
| **Grounding Accuracy (%)** | *[Hasil Uji]* | **100.0% (Enforced)** | $\ge 98.0\%$ |
| **Sensitivitas Posisi Dokumen** | Ya (Terdampak) | **Tidak (Independen)** | Tidak Boleh Terdampak |
| **Explainability Skor (Audit Trail)** | Lemah (Opaque) | **Kuat (Formula Matematis)** | Wajib Terdokumentasi |

---

## 6. SIKLUS EKSEKUSI RISET (RUNBOOK)

1. **Persiapan Script Uji:**
   Menjalankan test harness berbasis `docs/spec/golden_dataset/evaluate.py`.
2. **Benchmark Eksekusi:**
   Mengumpulkan log eksekusi dan menghitung metrik statistik IR.
3. **Penyusunan Bab Skripsi:**
   Data empiris yang diperoleh disintesis menjadi draf bab pembahasan skripsi (Bab 4/5) yang siap dipertahankan di hadapan dosen pembimbing dan dewan penguji.

---

*Dokumen ini diterbitkan oleh AI7 Solaris Autonomous Orchestration System sebagai panduan riset formal dan instrumen validasi akademik.*
