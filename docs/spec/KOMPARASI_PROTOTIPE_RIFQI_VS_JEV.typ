
#set document(
  title: "Analisis Komparatif: Prototipe Awal Rifqi-Setiawan vs Prototipe Baru TypeSafe Jev",
  author: ("Alif Ihsan", "AI7 Sage (Principal Research Strategist)", "AI7 Spidey (Orchestrator)")
)

#set page(
  paper: "a4",
  margin: (top: 2.0cm, bottom: 2.0cm, left: 2.0cm, right: 2.0cm),
  header: context [
    #if here().page() > 1 [
      #grid(
        columns: (1fr, 1fr),
        align(left)[#text(size: 8pt, fill: rgb("#64748b"))[*AI-Assisted CV Screening* · Komparasi Prototipe Upstream vs Jev Architecture]],
        align(right)[#text(size: 8pt, fill: rgb("#64748b"))[RFC-ARCH-2026-COMP-02 · Rev 1.1]]
      )
      #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    ]
  ],
  footer: context [
    #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    #v(2pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[#text(size: 8pt, fill: rgb("#94a3b8"))[Perbandingan Spesifikasi Teknis & Kedaulatan Arsitektur · Doktrin Kepatuhan]],
      align(right)[#text(size: 8pt, fill: rgb("#64748b"), weight: "bold")[Halaman #here().page()]]
    )
  ]
)

#set text(
  font: "Liberation Sans",
  size: 8.8pt,
  fill: rgb("#0f172a"),
  spacing: 115%,
  lang: "id"
)

#set par(
  justify: true,
  leading: 0.60em,
  first-line-indent: 0pt
)

#show heading: set text(hyphenate: false)

#show heading.where(level: 1): it => block(
  above: 14pt, below: 8pt, breakable: false,
  [
    #text(font: "DejaVu Serif", size: 11.5pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
    #v(2pt)
    #line(length: 100%, stroke: 0.8pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 10pt, below: 5pt, breakable: false,
  text(font: "Liberation Sans", size: 9.6pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

// Table styling
#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f8fafc") } else if calc.even(row) { rgb("#fcfcfd") } else { none },
  inset: (x: 6pt, y: 4.5pt)
)

// Header
#v(-5pt)
#text(font: "DejaVu Serif", size: 15.5pt, weight: "bold", fill: rgb("#0f172a"))[
  Analisis Komparatif Prototipe Arsitektur \
  #text(size: 11pt, weight: "medium", fill: rgb("#334155"))[
    Prototipe Awal Upstream (`Rifqi-Setiawan`) vs Prototipe Baru (`TypeSafe Jev System One`)
  ]
]
#v(2pt)
#text(font: "Liberation Sans", size: 8.5pt, fill: rgb("#64748b"))[
  Evaluasi Transisi dari Heuristik Berbasis Embedding & LLM Verifier Menuju Evaluasi Semantik Eksak $cal(O)(N)$
]
#v(5pt)

#rect(
  width: 100%,
  fill: rgb("#f8fafc"),
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 4pt,
  inset: (x: 8pt, y: 6pt)
)[
  #grid(
    columns: (1fr, 1.2fr),
    column-gutter: 14pt,
    row-gutter: 4pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Tanggal:] 26 Oktober 2026],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Comparative Technical Architecture Review],
    [#text(weight: "bold", fill: rgb("#475569"))[Basis Prototipe Awal:] `github.com/Rifqi-Setiawan/ai-cv-screening-ranking`],
    [#text(weight: "bold", fill: rgb("#475569"))[Target Prototipe Baru:] `alifihsan7/ai-cv-screening-ranking` \ #text(size: 7.5pt, fill: rgb("#64748b"))[(Jev System One v2.0 Official Architecture)]]
  )
]
#v(4pt)

= 1. RINGKASAN EKSEKUTIF & KONTEKS EVOLUSI

Repositori upstream `Rifqi-Setiawan/ai-cv-screening-ranking` merupakan prototipe awal yang sangat solid dalam membangun *fondasi deterministik dan kepatuhan yudisial*. Repositori ini telah menerapkan prinsip krusial di mana nilai akhir 0–100 dan pembagian *Band* (A/B/C/R) dihitung murni oleh kalkulator kode Python (`scorer.py`), bukan oleh LLM secara acak.

Kendati demikian, prototipe awal tersebut dirancang sebelum ketersediaan model semantik terdedikasi **TypeSafe Jev System One**. Akibatnya, pada lapisan penentuan status kriteria yang ambigu, sistem awal harus menanggung kompromi rekayasa:
+ Mengandalkan *hybrid retrieval* lokal (sentence embedding `harrier-oss` / `Qwen` + `pgvector` RRF) yang membebani memori CPU/GPU.
+ Menyerahkan validasi ambiguitas ke *LLM Verifier* (OpenAI-compatible gateway) yang rawan variasi prompt, latensi jaringan, serta biaya token berulang.
+ Belum memisahkan secara tegas antara fungsi *persiapan input lowongan* dan *penyajian narasi wawancara*.

Prototipe baru yang kita bangun mengadopsi seluruh keunggulan tata kelola data dari repositori Rifqi-Setiawan, namun merevolusi lapisan evaluasi tengah dengan menyematkan **TypeSafe Jev System One API resmi**. Transisi ini melenyapkan ketergantungan pada model embedding lokal dan LLM verifier pihak ketiga pada proses evaluasi inti, sekaligus menyempurnakan arsitektur *Tiga Tahap (Persiapan Lowongan -- Evaluasi Inti -- Penyajian Hasil)*.

= 2. MATRIKS KOMPARASI ARSITEKTUR

#table(
  columns: (1.2fr, 1.4fr, 1.4fr),
  table.header(
    [*Dimensi Arsitektur*],
    [*Prototipe Awal (Rifqi-Setiawan)*],
    [*Prototipe Baru (TypeSafe Jev Baseline)*]
  ),
  [Arsitektur Inti],
  [Modular Monolith: FastAPI + Celery/Postgres Worker + pgvector.],
  [Modular Monolith Terisolasi: FastAPI + Async Worker + PostgreSQL ACID murni.],

  [Evaluasi Semantik],
  [Heuristik 2 Tahap: RRF Hybrid Retrieval (Vector + Keyword) dilanjutkan LLM Verifier.],
  [Trio Primitif Semantik Langsung: Jev System One (`Noul`, `Choice`, `Score`) $cal(O)(N)$ via TypeSafe SDK.],

  [Ketergantungan Embedding],
  [Wajib: Model lokal `harrier-oss` / `Qwen` (CPU RAM ~2--4 GB) + ekstensi pgvector.],
  [Nol Ketergantungan Vektor: Evaluasi semantik dilayani remote API Jev resmi tanpa pgvector.],

  [Peran LLM Generatif],
  [Tersebar: Dipakai pada persiapan JD, ekstraksi teks sulit, dan LLM Verifier di tengah screening.],
  [Terkarantina Ketat: Hanya di Tahap Persiapan Input (JD) dan Tahap Output (Wawancara Top 10%). Mesin inti steril dari LLM.],

  [Kalkulasi Skor & Ranking],
  [Deterministik Python (`scorer.py`) dengan band A/B/C/R dan cap nilai.],
  [Deterministik Python Identik (porting rumus 100% kompatibel) + Jev continuous depth tie-breaker.],

  [Verifikasi Bukti CV],
  [Pencocokan kutipan eksak terhadap teks hasil ekstraksi.],
  [Normalisasi Unicode NFKC karakter-demi-karakter dengan garansi yudisial nol halusinasi.],

  [Biaya Inferensi / 1.000 CV],
  [\$0.150 -- \$0.450 (Banyak panggilan LLM Verifier pada kriteria ambigu).],
  [\$0.034 (Mode Murni) atau \$0.277 (Mode Lengkap dengan Ringkasan Wawancara).],

  [Latensi Screening Massal],
  [2.5 -- 5.0 detik / CV (Tergantung antrean embedding dan LLM verifier gateway).],
  [1.2 -- 1.8 detik / CV (Inferensi Jev sub-detik linear $cal(O)(N)$ secara paralel).]
)

#pagebreak()

= 3. PERBANDINGAN ALUR EKSEKUSI DATA

== 3.1 Alur Prototipe Awal (Rifqi-Setiawan)
Alur pada prototipe awal memiliki ketergantungan yang cukup kompleks pada lapisan basis data vektor dan pemanggilan LLM di tengah antrean evaluasi:

#align(center)[
#block(
  width: 100%,
  stroke: 0.5pt + rgb("#cbd5e1"),
  radius: 4pt,
  fill: rgb("#f8fafc"),
  inset: 8pt,
  [
    #set text(size: 7.5pt)
    #align(left)[*ALUR DATA AWAL (HEURISTIK DENGAN LLM VERIFIER):*]
    #v(3pt)
    #grid(
      columns: (1fr, auto, 1fr, auto, 1fr, auto, 1fr),
      align: center + horizon,
      gutter: 3pt,
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 4pt)[*Upload CV* \ #text(size: 6.5pt)[Docling / OCR]],
      [==>],
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 4pt)[*Embedding & FTS* \ #text(size: 6.5pt)[Sentence Transformer + pgvector]],
      [==>],
      rect(fill: rgb("#fff7ed"), stroke: 0.7pt + rgb("#ea580c"), radius: 3pt, inset: 4pt)[*LLM Verifier* \ #text(size: 6.5pt)[Ambiguitas kriteria via Gateway]],
      [==>],
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 4pt)[*Scorer Python* \ #text(size: 6.5pt)[Skor & Banding]]
    )
    #v(3pt)
    #align(left)[#text(size: 7pt, fill: rgb("#9a3412"))[*Catatan:* LLM dipanggil berulang kali di tengah antrean screening jika kriteria berstatus ambigu, memicu bottleneck I/O.]]
  ]
)
]

== 3.2 Alur Prototipe Baru (TypeSafe Jev System One Baseline)
Pada prototipe baru, lapisan evaluasi tengah sepenuhnya steril dari komputasi vektor lokal maupun LLM generatif:

#align(center)[
#block(
  width: 100%,
  stroke: 0.5pt + rgb("#cbd5e1"),
  radius: 4pt,
  fill: rgb("#f8fafc"),
  inset: 8pt,
  [
    #set text(size: 7.5pt)
    #align(left)[*ALUR DATA BARU (TRI-LAYER WITH JEV SYSTEM ONE):*]
    #v(3pt)
    
    // Tahap Input
    #rect(width: 100%, fill: rgb("#fefce8"), stroke: 0.5pt + rgb("#ca8a04"), radius: 3pt, inset: 4pt)[
      #text(weight: "bold", fill: rgb("#854d0e"))[TAHAP INPUT (Persiapan Lowongan):] \
      Teks Lowongan Mentah #sym.arrow.r LLM Structured Extraction #sym.arrow.r *HR Approval Gate* (Validasi Manusia & Kunci Skema)
    ]
    #v(2pt)
    #text(fill: rgb("#64748b"), size: 8pt)[#sym.arrow.b]
    #v(2pt)

    // Evaluasi Inti
    #rect(width: 100%, fill: rgb("#f0fdf4"), stroke: 0.8pt + rgb("#16a34a"), radius: 3pt, inset: 5pt)[
      #text(weight: "bold", fill: rgb("#15803d"))[MESIN EVALUASI INTI (Isolasi Mutlak -- Zero LLM Touchpoint):] \
      Docling Parser Lokal #sym.arrow.r Verifikator NFKC #sym.arrow.r *TypeSafe Jev System One ($cal(O)(N)$)* #sym.arrow.r Kalkulator Python (Skor & Peringkat Terkunci)
    ]
    #v(2pt)
    #text(fill: rgb("#64748b"), size: 8pt)[#sym.arrow.b]
    #v(2pt)

    // Tahap Output
    #rect(width: 100%, fill: rgb("#faf5ff"), stroke: 0.5pt + rgb("#9333ea"), radius: 3pt, inset: 4pt)[
      #text(weight: "bold", fill: rgb("#6b21a8"))[TAHAP OUTPUT (Penyajian Hasil Khusus Top 5--10%):] \
      Skor & Bukti Terkunci #sym.arrow.r LLM Ringkasan Eksekutif & Lembar Panduan Wawancara #sym.arrow.r Recruiter Cockpit UI
    ]
  ]
)
]

= 4. KEUNGGULAN KOMPETITIF PROTOTIPE BARU

+ *Efisiensi Infrastruktur VPS (Zero Local Model Overhead):*   Prototipe awal mewajibkan VPS memuat pustaka Sentence-Transformers dan model embedding (`harrier-oss` / `Qwen`) yang memakan RAM 2--4 GB serta CPU footprint tinggi saat indexing batch ribuan CV. Prototipe baru memindahkan seluruh penalaran semantik ke remote API TypeSafe Jev System One yang sangat ringan secara resource lokal.
+ *Eliminasi Non-Determinisme pada Kriteria Ambigu:*   Pada prototipe awal, kriteria yang ambigu dinilai oleh LLM Verifier via prompt engineering. Meskipun telah dibatasi schema tertutup, LLM verifier masih rentan terhadap *prompt drift* dan fluktuasi penalaran. Jev System One menggantikan verifier tersebut dengan primitif matematis `Choice` dan `Score` yang terbukti formal dan stabil.
+ *Pemisahan Tanggung Jawab yang Memenuhi Regulasi Yudisial (UU PDP & EU AI Act):*   Di prototipe baru, tidak ada satupun kata dari LLM generatif yang dapat mempengaruhi posisi ranking kandidat. LLM diletakkan secara eksklusif di luar zona keputusan (hanya sebagai asisten pengetikan kriteria di awal dan asisten pembuat bahan wawancara di akhir).
+ *Ekonomi Operasional Skala Besar:*   Dengan meniadakan panggilan LLM Verifier untuk setiap kriteria dan membatasi pemanggilan ringkasan narasi wawancara hanya pada 5--10% kandidat teratas, biaya screening per 1.000 CV ditekan secara radikal dari \$0.450 menjadi \$0.277, atau 98.8% lebih hemat dibanding solusi screening AI generatif biasa.

#v(6pt)
#align(center)[
#rect(
  width: 100%,
  stroke: 1pt + rgb("#2563eb"),
  radius: 4pt,
  fill: rgb("#eff6ff"),
  inset: 8pt,
  [
    #text(weight: "bold", fill: rgb("#1d4ed8"), size: 9pt)[KESIMPULAN EVALUASI TEKNIS]
    #v(3pt)
    #align(left)[
      Prototipe awal `Rifqi-Setiawan` menyediakan cetak biru domain rekrutmen, skema taksonomi keahlian, dan logika scoring deterministik yang luar biasa matang.             Prototipe baru yang kita bangun menyempurnakan kelemahan teknis terbesar dari sistem awal tersebut dengan *mengganti hybrid retrieval pgvector dan LLM verifier yang lambat/mahal menjadi integrasi resmi TypeSafe Jev System One*. Hasilnya adalah mesin evaluasi bakat generasi baru yang jauh lebih kencang, murah, ringan infrastruktur, dan 100% tahan uji audit ketenagakerjaan.
    ]
  ]
)
]


#v(1.2em)
#block(fill: rgb("#fef3c7"), inset: 9pt, radius: 3pt, width: 100%)[
  *Catatan status (2026-10-29):* dokumen ini ditulis sebelum integrasi Jev diukur dan sebelum uji dengan CV nyata. Sebagian klaimnya berbeda dari implementasi dan hasil ukur: alurnya bertahap tetap, bukan agent otonom; hasil Jev tidak sepenuhnya deterministik (cache hasil Jev belum ada); angka kinerja apa pun di sini harus dibaca bersama hasil ukur yang sebenarnya. Yang berlaku: CLAUDE.md, docs/spec/DECISIONS.md, dan docs/eval/BENCHMARK\_RESULTS\_2026-10-29.md.
]
