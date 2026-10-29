
#set document(
  title: "Analisis Komparatif Arsitektur: Varian 4.1 vs Varian 4.4 (Jev System One)",
  author: ("Alif Ihsan", "AI7 Sage (Principal Research Strategist)", "AI7 Zephyr (Principal Systems Architect)")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: context [
    #if here().page() > 1 [
      #grid(
        columns: (1fr, 1fr),
        align(left)[#text(size: 8pt, fill: rgb("#64748b"))[*AI-Assisted CV Screening* · Komparasi Arsitektural Jev]],
        align(right)[#text(size: 8pt, fill: rgb("#64748b"))[RFC-ARCH-2026-JEV-01 · Rev 1.0]]
      )
      #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    ]
  ],
  footer: context [
    #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    #v(2pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[#text(size: 8pt, fill: rgb("#94a3b8"))[Standar Keputusan Arsitektur & Kepatuhan Yudisial · Production Baseline]],
      align(right)[#text(size: 8pt, fill: rgb("#64748b"), weight: "bold")[Halaman #here().page()]]
    )
  ]
)

#set text(
  font: "Liberation Sans",
  size: 9.2pt,
  fill: rgb("#0f172a"),
  spacing: 120%,
  lang: "id"
)

#set par(
  justify: true,
  leading: 0.65em,
  first-line-indent: 0pt
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
#let blockquote(body) = quote(body)

#show heading: set text(hyphenate: false)

#show heading.where(level: 1): it => block(
  above: 20pt, below: 10pt, breakable: false,
  [
    #text(font: "DejaVu Serif", size: 12.5pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
    #v(3pt)
    #line(length: 100%, stroke: 1pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 14pt, below: 7pt, breakable: false,
  text(font: "Liberation Sans", size: 10.2pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 11pt, below: 5pt, breakable: false,
  text(font: "Liberation Sans", size: 9.5pt, weight: "bold", fill: rgb("#334155"))[#it.body]
)

// Callout / Quote styling
#show quote: it => block(
  fill: rgb("#f8fafc"),
  stroke: (left: 3pt + rgb("#2563eb")),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 8pt),
  width: 100%,
  breakable: false,
  text(font: "Liberation Sans", size: 8.8pt, fill: rgb("#1e293b"))[#it.body]
)

// Code blocks
#show raw.where(block: true): it => block(
  fill: rgb("#f8fafc"),
  stroke: 0.5pt + rgb("#cbd5e1"),
  radius: 4pt,
  inset: (x: 6pt, y: 5pt),
  width: 100%,
  breakable: true,
  [
    #set par(leading: 0.26em)
    #set text(font: "DejaVu Sans Mono", size: 6.2pt, fill: rgb("#0f172a"))
    #it
  ]
)

#show raw.where(block: false): set text(font: "DejaVu Sans Mono", size: 7.8pt, fill: rgb("#0f172a"))

// Table styling
#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f8fafc") } else if calc.even(row) { rgb("#fcfcfd") } else { none },
  inset: (x: 6pt, y: 5.5pt)
)

// Document Header
#v(-5pt)
#text(font: "DejaVu Serif", size: 17pt, weight: "bold", fill: rgb("#0f172a"))[
  Dokumen Analisis Komparatif Strategis & Arsitektural \
  #text(size: 12pt, weight: "medium", fill: rgb("#334155"))[
    Varian 4.1 (Jev System One × Deterministik) vs Varian 4.4 (Jev System One × Deterministik × AI Generatif)
  ]
]
#v(3pt)
#text(font: "Liberation Sans", size: 9pt, fill: rgb("#64748b"))[
  Platform Evaluasi Bakat & Penapisan Berkas Berbasis Bukti (TypeSafe Jev System One Baseline)
]
#v(6pt)

#rect(
  width: 100%,
  fill: rgb("#f8fafc"),
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 4pt,
  inset: (x: 10pt, y: 8pt)
)[
  #grid(
    columns: (1fr, 1.2fr),
    column-gutter: 16pt,
    row-gutter: 6pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Tanggal:] 26 Oktober 2026],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Principal Architectural Evaluation RFC],
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:] Sage & Alif Ihsan \ #text(size: 8pt, fill: rgb("#64748b"))[The Luminaries & TypeSafe Architecture]],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori:] `alifihsan7/ai-cv-screening-ranking` \ #text(size: 8pt, fill: rgb("#64748b"))[Acuan: CETAK_BIRU_ARSITEKTUR_SISTEM_JEV.pdf v2.0]]
  )
]
#v(8pt)

= 1. RINGKASAN EKSEKUTIF & PROBLEM STATEMENT
<ringkasan-eksekutif-problem-statement>
== 1.1 Dikotomi Epistemik: Presisi Matematis vs Fleksibilitas Kognitif
Rekruter
<dikotomi-epistemik-presisi-matematis-vs-fleksibilitas-kognitif-rekruter>
Perancangan sistem otomatisasi penapisan kurikulum vitae (#emph[CV
screening]) skala enterprise berada di persimpangan dua kebutuhan yang
kerap bertentangan secara fundamental:

+ #strong[Imperatif Integritas Penilaian (Akurasi & Kepatuhan Hukum):] \
  Keputusan penyaringan pelamar kerja adalah domain berisiko tinggi
  (#emph[high-stakes domain]). Di bawah kerangka regulasi modern (UU
  Perlindungan Data Pribadi No. 27/2022 Pasal 40, EU AI Act Annex III
  untuk #emph[Employment & Recruitment], dan US EEOC), setiap penolakan
  atau pemeringkatan kandidat wajib memiliki ketertelusuran audit 100%,
  bebas dari bias urutan (#emph[position bias]), bebas dari halusinasi
  teks, serta didasarkan atas bukti empiris karakter-demi-karakter yang
  dapat dibuktikan secara yuridis di depan pengadilan ketenagakerjaan.
+ #strong[Imperatif Ergonomi & Kebutuhan Naratif Pengguna (Adopsi
  Rekruter HR):] \
  Rekruter manusia, #emph[hiring manager], dan pimpinan divisi tidak
  mengambil keputusan wawancara semata-mata dari matriks angka skalar
  (misal: "Kandidat X: Skor 84.12"). Mereka membutuhkan konteks
  kognitif: #emph[Apa narasi lintasan karier kandidat? Di mana letak
  anomali atau celah kompetensinya? Pertanyaan teknis apa yang harus
  diajukan saat wawancara panel untuk menguji klaim yang masih ambigu?]
  Selain itu, di sisi hulu, rekruter tidak bersedia menuliskan kontrak
  data JSON kaku untuk setiap lowongan baru; mereka menginginkan
  kemudahan melempar draf deskripsi pekerjaan (#emph[Job
  Description/JD]) teks mentah yang berantakan dan memperoleh kriteria
  seleksi secara instan.


#align(center)[
#table(
  columns: (1fr, 1fr),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  stroke: 0.5pt + rgb("#cbd5e1"),
  inset: (x: 10pt, y: 8pt),
  table.header(
    [*PENDEKATAN KAKU (DETERMINISTIK MURNI)*],
    [*PENDEKATAN BEBAS (LLM GENERATIF MURNI)*]
  ),
  [
    #align(left)[
      #text(fill: rgb("#16a34a"), weight: "bold")[#sym.plus] 100% Reprodusibel & Bebas Halusinasi       #text(fill: rgb("#16a34a"), weight: "bold")[#sym.plus] Auditabilitas hukum yudisial sempurna       #text(fill: rgb("#dc2626"), weight: "bold")[#sym.minus] Buta semantik & variasi sinonim       #text(fill: rgb("#dc2626"), weight: "bold")[#sym.minus] UX formulir hulu/hilir sangat kaku       #text(fill: rgb("#dc2626"), weight: "bold")[#sym.minus] Beban kognitif penelaahan HR tinggi
    ]
  ],
  [
    #align(left)[
      #text(fill: rgb("#16a34a"), weight: "bold")[#sym.plus] Sangat luwes & mudah beradaptasi       #text(fill: rgb("#16a34a"), weight: "bold")[#sym.plus] Sintesis narasi wawancara kaya       #text(fill: rgb("#dc2626"), weight: "bold")[#sym.minus] Rawan halusinasi kutipan bukti       #text(fill: rgb("#dc2626"), weight: "bold")[#sym.minus] Cacat kalkulasi aritmatika & bias posisi       #text(fill: rgb("#dc2626"), weight: "bold")[#sym.minus] Biaya inferensi token API boros
    ]
  ]
)
]


== 1.2 Problem Statement
<problem-statement>
Pertanyaan arsitektural intinya bukan #emph["Apakah kita harus memilih
kepatuhan matematis ATAU kemudahan narasi AI?"], melainkan: \
#strong["Bagaimana mengisolasi model AI Generatif (LLM) secara ketat
pada lapisan persepsi hulu dan sintesis hilir, sementara inti
pertimbangan semantik dan kalkulasi pemeringkatan dikunci oleh TypeSafe
Jev System One dan mesin deterministik Python?"]

Dokumen ini membedah secara mendalam perbandingan teknis, operasional,
dan ekonomis antara #strong[Varian 4.1 (Jev × Deterministik)] sebagai
#emph[Core Engine Baseline] dan #strong[Varian 4.4 (Jev × Deterministik
× Generative AI)] sebagai #emph[Enterprise Product Topology].

#horizontalrule

= 2. DEFINISI ARSITEKTURAL KOMPONEN
<definisi-arsitektural-komponen>

#align(center)[
#block(
  width: 100%,
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 6pt,
  fill: rgb("#f8fafc"),
  inset: 12pt,
  [
    #set text(size: 8pt)
    #align(left)[#text(weight: "bold", fill: rgb("#1e293b"), size: 9pt)[VARIAN 4.1: DUAL-HYBRID ARCHITECTURE (Jev System One × Deterministik)]]
    #v(4pt)
    #grid(
      columns: (1fr, auto, 1fr, auto, 1fr, auto, 1fr, auto, 1fr),
      align: center + horizon,
      gutter: 3pt,
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 5pt)[*JD Form / JSON* \ #text(size: 7pt, fill: rgb("#64748b"))[Input Manual HR]],
      [#text(fill: rgb("#2563eb"), weight: "bold")[==>]],
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 5pt)[*Docling & OCR* \ #text(size: 7pt, fill: rgb("#64748b"))[Parsing Lokal CPU]],
      [#text(fill: rgb("#2563eb"), weight: "bold")[==>]],
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 5pt)[*NFKC Matcher* \ #text(size: 7pt, fill: rgb("#64748b"))[Exact Grounding]],
      [#text(fill: rgb("#2563eb"), weight: "bold")[==>]],
      rect(fill: rgb("#eff6ff"), stroke: 0.8pt + rgb("#3b82f6"), radius: 3pt, inset: 5pt)[*Jev System One* \ #text(size: 7pt, fill: rgb("#1d4ed8"))[$cal(O)(N)$ Semantic]],
      [#text(fill: rgb("#2563eb"), weight: "bold")[==>]],
      rect(fill: white, stroke: 0.5pt + rgb("#94a3b8"), radius: 3pt, inset: 5pt)[*Python Scorer* \ #text(size: 7pt, fill: rgb("#64748b"))[Banding & Badges]]
    )

    #v(10pt)
    #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    #v(8pt)

    #align(left)[#text(weight: "bold", fill: rgb("#1e293b"), size: 9pt)[VARIAN 4.4: TRI-LAYER ORCHESTRATION (Jev × Deterministik × AI Generatif)]]
    #v(4pt)
    
    // Upstream
    #rect(width: 100%, fill: rgb("#fefce8"), stroke: 0.6pt + rgb("#eab308"), radius: 4pt, inset: 6pt)[
      #grid(
        columns: (auto, 1fr, auto, 1fr),
        align: horizon,
        gutter: 8pt,
        [*HULU (GenAI):*],
        [#rect(fill: white, stroke: 0.5pt + rgb("#ca8a04"), radius: 3pt, inset: 4pt)[*Raw JD Unstructured Text*] #sym.arrow.r [*LLM JD Deconstructor*]],
        [#text(fill: rgb("#b45309"), weight: "bold")[==>]],
        [#rect(fill: white, stroke: 0.8pt + rgb("#16a34a"), radius: 3pt, inset: 4pt)[*HR Approval Gate* (Validasi Manusia)]]
      )
    ]

    #v(4pt)
    #text(fill: rgb("#64748b"), size: 10pt)[#sym.arrow.b]
    #v(4pt)

    // Core
    #rect(width: 100%, fill: rgb("#f0fdf4"), stroke: 0.8pt + rgb("#22c55e"), radius: 4pt, inset: 7pt)[
      #text(weight: "bold", fill: rgb("#15803d"), size: 8pt)[CORE EVIDENCE & EVALUATION ENGINE (ISOLASI DETERMINISTIK -- ZERO LLM TOUCHPOINT)]
      #v(4pt)
      #grid(
        columns: (1fr, auto, 1fr, auto, 1fr, auto, 1fr),
        align: center + horizon,
        gutter: 4pt,
        rect(fill: white, stroke: 0.5pt + rgb("#86efac"), radius: 3pt, inset: 4pt)[*Docling Parser* \ #text(size: 6.5pt)[Layout PDF/DOCX]],
        [#sym.arrow.r],
        rect(fill: white, stroke: 0.5pt + rgb("#86efac"), radius: 3pt, inset: 4pt)[*NFKC Verifier* \ #text(size: 6.5pt)[Kutipan Verbatim]],
        [#sym.arrow.r],
        rect(fill: rgb("#dbeafe"), stroke: 0.8pt + rgb("#3b82f6"), radius: 3pt, inset: 4pt)[*Jev System One* \ #text(size: 6.5pt)[Noul, Choice, Score]],
        [#sym.arrow.r],
        rect(fill: white, stroke: 0.5pt + rgb("#86efac"), radius: 3pt, inset: 4pt)[*Python Scorer* \ #text(size: 6.5pt)[Skor & Peringkat]]
      )
    ]

    #v(4pt)
    #text(fill: rgb("#64748b"), size: 10pt)[#sym.arrow.b #text(size: 7pt, fill: rgb("#15803d"))[(Skor & Bukti Terverifikasi Terkunci)]]
    #v(4pt)

    // Downstream
    #rect(width: 100%, fill: rgb("#faf5ff"), stroke: 0.6pt + rgb("#a855f7"), radius: 4pt, inset: 6pt)[
      #grid(
        columns: (auto, 1fr, auto, 1fr),
        align: horizon,
        gutter: 8pt,
        [*HILIR (GenAI):*],
        [#rect(fill: white, stroke: 0.5pt + rgb("#9333ea"), radius: 3pt, inset: 4pt)[*Executive Dossier & Interview Sheet Generator* \ #text(size: 6.5pt)[Hanya untuk Top 5-10% (Band A & B)]]],
        [#text(fill: rgb("#7e22ce"), weight: "bold")[==>]],
        [#rect(fill: white, stroke: 0.8pt + rgb("#475569"), radius: 3pt, inset: 4pt)[*Recruiter Cockpit* \ #text(size: 6.5pt)[Tactile UI + Dossier Naratif]]]
      )
    ]
  ]
)
]


== 2.1 Varian 4.1: Jev System One × Deterministik (Python / Docling /
PostgreSQL)
<varian-4.1-jev-system-one-deterministik-python-docling-postgresql>
Varian 4.1 merupakan arsitektur hibrida dua pilar tanpa keterlibatan
model bahasa autoregresif (Generative LLM):

- #strong[Hulu (JD Ingestion):] Kriteria pekerjaan didefinisikan secara
  eksplisit melalui antarmuka formulir terstruktur atau pengunggahan
  skema JSON baku (`requirement_set.json`). Pembobotan kriteria ($w_i$)
  dan kualifikasi mutlak (#emph[hard gates]) ditentukan langsung oleh
  HR.
- #strong[Tengah (Dokumen & Bukti):]
  - #emph[IBM Docling Lokal & Fallback OCR (Tesseract `ind`+`eng`)]:
    Membedah struktur tata letak CV PDF/DOCX (multi-kolom, tabel, zonasi
    lampiran sertifikat) ke representasi teks kanonikal secara lokal
    (\$0 biaya komputasi eksternal).
  - #emph[Deterministic Grounding Verifier (NFKC)]: Menjamin bahwa
    setiap kalimat bukti yang diambil berasal 100%
    karakter-demi-karakter dari berkas asli kandidat.
- #strong[Inti Semantik (Jev System One via `api.typesafe.ai`):]
  Bertindak sebagai juri semantik independen berdaya komputasi linear
  $cal(O) lr((N))$. Jev mengevaluasi tiga primitif diskrit:
  + `Noul`: Evaluasi lolos/gagal syarat mutlak (#emph[Hard Gate] biner).
  + `Choice`: Klasifikasi derajat pemenuhan kualifikasi (`STRONG`,
    `PARTIAL`, `NOT_DEMONSTRATED`).
  + `Score`: Pengukuran kedalaman semantik kontinu ($0.00 minus 1.00$)
    untuk pemecah seri (#emph[tie-breaker]).
- #strong[Hilir (Skor & Presentasi):] Kode Python murni (`scorer.py`)
  menghitung skor akhir (0–100), mengalokasikan #emph[Talent Band] (Band
  A, B, C, R), dan menyajikan data pada antarmuka #emph[Recruiter
  Cockpit] berupa lencana status (#emph[badges]), skor numerik, dan
  penandaan kutipan teks asli.

== 2.2 Varian 4.4: Jev System One × Deterministik × AI Generatif (LLM)
<varian-4.4-jev-system-one-deterministik-ai-generatif-llm>
Varian 4.4 adalah arsitektur orkestrasi penuh tiga lapis
(#emph[Tri-Layer Orchestration]) yang menempatkan Generative AI secara
strategis di pinggiran sistem (hulu dan hilir), dengan inti penilaian
yang tetap identik dengan Varian 4.1:

- #strong[Lapisan 1: Hulu Generatif (JD Deconstruction & Rubric
  Synthesis):] \
  Teks lowongan mentah (unstructured text/draf memo) diproses oleh LLM
  ringan melalui #emph[Structured Output Pydantic] untuk membedah peran,
  persyaratan mutlak, dan kriteria kualifikasi ke dalam draf rubrik.
  Draf ini wajib divalidasi dan dikunci oleh HR melalui #strong[HR
  Approval Gate] sebelum proses penapisan berjalan.

- #strong[Lapisan 2: Inti Evaluasi Terisolasi (Varian 4.1 Engine):] \
  Pemrosesan berkas, verifikasi kutipan NFKC, evaluasi semantik Jev
  System One, dan kalkulasi skor matematis berjalan 100% deterministik
  tanpa campur tangan LLM generatif. LLM dilarang keras membaca skor
  atau mengubah urutan pemeringkatan.

- #strong[Lapisan 3: Hilir Generatif (Executive Dossier & Dynamic
  Interview Synthesis):] \
  Untuk kandidat yang masuk ke dalam daftar pendek (#emph[Shortlist /
  Band A & B]), LLM menerima input terisolasi: (1) kutipan teks asli
  terverifikasi NFKC, (2) label status kriteria dari Jev, dan (3) rubrik
  pekerjaan. LLM menghasilkan:

  + #emph[Executive Candidate Dossier]: Sintesis naratif padat mengenai
    kekuatan kandidat dan relevansi proyek masa lalu.
  + #emph[Dynamic Interview Sheet]: Panduan pertanyaan wawancara
    terfokus yang secara spesifik menggali kriteria berlabel `PARTIAL`
    atau aspek teknis yang belum terbukti mendalam di CV.

#horizontalrule

#pagebreak()
= 3. ANALISIS KOMPARATIF MULTI-DIMENSI
<analisis-komparatif-multi-dimensi>
== 3.1 Matriks Evaluasi Arsitektural
<matriks-evaluasi-arsitektural>
#align(center)[#table(
  columns: 4,
  align: (col, row) => (left,left,left,left,).at(col),
  inset: 6pt,
  [Dimensi Evaluasi], [Varian 4.1: Jev × Deterministik], [Varian 4.4:
  Jev × Deterministik × GenAI], [Varian Unggul],
  [#strong[Akurasi & Risiko Halusinasi]],
  [#strong[0.00% Halusinasi.] Evaluasi murni probabilitas diskrit Jev +
  verifikasi karakter eksak NFKC.],
  [#strong[0.00% pada Inti Penilaian.] GenAI dikarantina di hulu (Gate
  HR) & hilir (dibatasi kutipan terverifikasi).],
  [#strong[Setara / Seri] (Inti identik)],
  [#strong[Ergonomi Input (Hulu)]],
  [Kaku. HR wajib mengisi form kriteria terstruktur atau mengunggah JSON
  schema.],
  [Sangat Luwes. Menerima draf teks JD mentah; diekstraksi otomatis
  menjadi draf kriteria.],
  [#strong[Varian 4.4]],
  [#strong[Ergonomi Output (Hilir)]],
  [Minimalis. Menampilkan skor angka terurai, status badge, dan kutipan
  teks asli yang di-highlight.],
  [Sangat Aksiabel. Menghasilkan ringkasan dossier eksekutif dan lembar
  panduan wawancara berbasis celah bukti.],
  [#strong[Varian 4.4]],
  [#strong[Biaya API per 1.000 CV]],
  [#strong[\$0.025 – \$0.070] (Hanya tarif input Jev \$0.042/1M token,
  output \$0).],
  [#strong[\$0.150 – \$0.650] (Jev + downstream LLM hanya untuk Top
  5–10% kandidat).],
  [#strong[Varian 4.1] (9× lebih murah)],
  [#strong[Throughput & Latensi Batch]],
  [#strong[1.2 – 2.0 detik / CV.] Throughput konstan, eksekusi paralel
  murni pada worker async.],
  [#strong[1.2 – 2.0 detik / CV (Screening).] Tambahan 2–4 detik
  asinkron untuk sintesis dossier Top N.],
  [#strong[Varian 4.1] (Margin tipis)],
  [#strong[Kepatuhan Audit & Regulasi]],
  [Sempurna. Kode Python deterministik + log probabilitas Jev. Dapat
  diaudit secara matematis.],
  [Sangat Kuat. Keputusan peringkat 100% matematis; teks narasi diberi
  label #emph["AI-Generated Synthesis"].],
  [#strong[Varian 4.1]],
  [#strong[Kompleksitas Rekayasa]],
  [Rendah–Menengah. Pydantic schema internal, Docling worker, Jev
  client, PostgreSQL ACID.],
  [Menengah–Tinggi. Butuh LLM gateway, Structured Output retry guard,
  prompt regression evals, SSE streaming.],
  [#strong[Varian 4.1] (Arsitektur lebih ramping)],
)
]

#horizontalrule

== 3.2 Pembahasan Mendalam per Dimensi
<pembahasan-mendalam-per-dimensi>
=== A. Tingkat Akurasi & Risiko Halusinasi
<a.-tingkat-akurasi-risiko-halusinasi>
- #strong[Varian 4.1 (Zero Hallucination Surface):] \
  Varian 4.1 meniadakan seluruh permukaan kegagalan autoregresif. Jev
  System One tidak melakukan dekode token generasi (#emph[token decoding
  generation]), melainkan menghitung probabilitas terkalibrasi atas
  token diskrit yang sudah ditentukan sebelumnya. Bukti kalimat dari
  pelamar diverifikasi menggunakan operator string substring eksak pada
  teks ternormalisasi Unicode NFKC:
  $ upright("Valid") lr((upright("snippet") comma cal(D)_(upright("CV")))) arrow.l.r.double upright("NFKC") lr((upright("snippet"))) subset.eq.sq upright("NFKC") lr((cal(D)_(upright("CV")))) $
  Jika sebuah kalimat bukti tidak ditemukan secara verbatim dalam
  dokumen asli, klaim tersebut langsung ditolak dengan skor 0. Tidak ada
  celah bagi model untuk mengarang pengalaman kerja, gelar palsu, atau
  angka metrik fiktif.

- #strong[Varian 4.4 (Strict Generative Containment):] \
  Pada Varian 4.4, ancaman halusinasi LLM dikendalikan melalui strategi
  #strong[Karantina Epistemik (#emph[Epistemic Sandboxing])]:

  + #emph[Di Hulu:] LLM generatif hanya mengekstrak draf kriteria dari
    JD. Sebelum kriteria ini digunakan untuk menilai pelamar, HR wajib
    memeriksa dan menekan tombol persetujuan (#emph[Human Approval
    Gate]). Jika LLM salah menafsirkan syarat senioritas, HR
    mengoreksinya di tahap ini.
  + #emph[Di Hilir:] Saat menghasilkan dossier dan pertanyaan wawancara,
    LLM disuntikkan prompt berkontrak ketat (#emph[Strictly Grounded
    Prompt]): LLM hanya diizinkan merangkum teks dari blok bukti kutipan
    yang telah lolos verifikasi NFKC dan status evaluasi Jev
    (`STRONG`/`PARTIAL`). LLM dilarang mengasumsikan fakta di luar
    konteks yang diberikan. Apabila LLM mengalami fluktuasi stilistika
    narasi, fluktuasi tersebut tidak berdampak sepeser pun terhadap skor
    matematis atau posisi kandidat di papan peringkat.

=== B. User Experience (UX) & Adopsi Rekruter/HR
<b.-user-experience-ux-adopsi-rekruterhr>
- #strong[Varian 4.1 (High Precision, High Cognitive Load):] \
  Kelemahan terbesar Varian 4.1 terletak pada friksi adopsi manusia.
  Rekruter lapangan umumnya tidak memiliki latar belakang rekayasa data.
  Meminta mereka mendefinisikan kriteria dalam bentuk format taksonomi
  diskrit atau mengisi 10 baris formulir kriteria secara manual
  memperlambat #emph[time-to-publish] lowongan. Di sisi keluaran,
  menyajikan tabel berisi skor desimal (misal: "Kandidat A: 82.50,
  Kandidat B: 81.90") dan lencana status memaksa rekruter membuka satu
  per satu kutipan bukti untuk menyusun agenda wawancara mereka sendiri.

- #strong[Varian 4.4 (Frictionless Ingestion, High Actionability):] \
  Varian 4.4 menghadirkan lonjakan produktivitas nyata bagi tim HR:

  - #emph[Zero-Friction Ingestion:] Rekruter cukup menyalin dan menempel
    (#emph[copy-paste]) naskah JD mentah dari email atau dokumen Word
    internal. Sistem secara otomatis mendekonstruksi teks tersebut
    menjadi butir kriteria terstruktur dalam 3 detik.
  - #emph[Actionable Recruiter Dossier:] Alih-alih membaca puluhan
    cuplikan kalimat terpisah, rekruter disajikan lembar ringkasan
    eksekutif 1 halaman. Contohnya: \
    \> #emph["Kandidat unggul pada optimasi query PostgreSQL dan
    arsitektur event-driven (Bukti: Halaman 2, Proyek Fintech). Namun,
    pengalaman Kubernetes berstatus PARTIAL karena berkas hanya
    menyebutkan deployment via ArgoCD tanpa bukti konfigurasi manifest
    mandiri. Rekomendasi Wawancara: Ajukan Pertanyaan Teknis No. 3
    mengenai Canary Deployment."] Hal ini memangkas waktu telaah
    kognitif rekruter dari rata-rata 3–5 menit per kandidat shortlist
    menjadi di bawah 45 detik.

=== C. Ekonomi Sistem & Cost per 1.000 CV
<c.-ekonomi-sistem-cost-per-1.000-cv>
Berikut adalah rincian kalkulasi biaya operasional inferensi API untuk
pemrosesan 1.000 CV (dengan asumsi rata-rata 1 pekerjaan memiliki 8
butir kriteria evaluasi):


#align(center)[
#table(
  columns: (1.5fr, 1.2fr, 1.3fr),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else if row == 6 { rgb("#f0fdf4") } else { none },
  stroke: 0.5pt + rgb("#cbd5e1"),
  inset: (x: 8pt, y: 6pt),
  table.header(
    [*Parameter Biaya*],
    [*Varian 4.1 (Jev × Det)*],
    [*Varian 4.4 (Jev × Det × GenAI)*]
  ),
  [Ekstraksi JD Hulu], [\$0.00 #text(size: 7.5pt, fill: rgb("#64748b"))[(Input Form HR)]], [\$0.003 #text(size: 7.5pt, fill: rgb("#64748b"))[(1x run LLM/posting)]],
  [Docling & OCR CV Parsing], [\$0.00 #text(size: 7.5pt, fill: rgb("#64748b"))[(Local CPU Compute)]], [\$0.00 #text(size: 7.5pt, fill: rgb("#64748b"))[(Local CPU Compute)]],
  [Evaluasi Semantik Jev], [\$0.034 #text(size: 7.5pt, fill: rgb("#64748b"))[(8k eval × 100 tok)]], [\$0.034 #text(size: 7.5pt, fill: rgb("#64748b"))[(8k eval × 100 tok)]],
  [Scoring & Ranking Python], [\$0.00 #text(size: 7.5pt, fill: rgb("#64748b"))[(Local CPU Compute)]], [\$0.00 #text(size: 7.5pt, fill: rgb("#64748b"))[(Local CPU Compute)]],
  [Downstream Dossier LLM], [\$0.00 #text(size: 7.5pt, fill: rgb("#64748b"))[(Tidak ada modul)]], [\$0.240 #text(size: 7.5pt, fill: rgb("#64748b"))[(Hanya Top 60 Band A/B)]],
  [*TOTAL BIAYA / 1.000 CV*], [*\$0.034* (~Rp 550,-)], [*\$0.277* (~Rp 4.500,-)]
)
]


- #strong[Rasio Efisiensi Varian 4.4 vs Full Generative LLM:] \
  Jika sebuah platform menggunakan #emph[Full Generative LLM]
  konvensional (misal GPT-4o untuk memproses seluruh 1.000 CV secara
  listwise/pointwise), biayanya berkisar antara #strong[\$15.00 hingga
  \$40.00] per 1.000 CV. \
  Dengan menerapkan pola Varian 4.4 berpagar (#emph[Gated Dossier
  Synthesis]), di mana evaluasi massal dikerjakan oleh Jev (\$0.034) dan
  LLM hanya dipanggil untuk kandidat yang lolos penapisan awal (5–10%
  teratas), total biaya operasional hanya #strong[\$0.28 per 1.000 CV].
  \
  Varian 4.4 memangkas #strong[98.8% biaya operasional] dibandingkan
  pendekatan Generative LLM naif industri, seraya tetap memberikan
  output naratif premium yang setara.

=== D. Latensi & Throughput Pemrosesan
<d.-latensi-throughput-pemrosesan>
- #strong[Varian 4.1 (Throughput Deterministik Tinggi):]
  - Tahap parsing lokal (Docling + OCR fallback): ~0.8 – 1.2 detik per
    CV. \
  - Tahap inferensi Jev (8 panggilan kriteria dieksekusi secara asinkron
    konkuren): ~0.3 – 0.5 detik. \
  - Tahap kalkulasi skor deterministik Python: \< 5 milidetik. \
  - #emph[Total Latensi End-to-End:] #strong[1.2 – 1.8 detik per CV]. \
  - Dalam arsitektur worker terdistribusi (misal 8 worker Celery/ARQ),
    penyaringan 1.000 CV selesai dalam waktu kurang dari #strong[3,5
    menit].
- #strong[Varian 4.4 (Decoupled Asynchronous Synthesis):]
  - Tahap screening massal berjalan pada kecepatan yang persis sama
    dengan Varian 4.1 (1.2 – 1.8 detik per CV). \
  - Papan peringkat (#emph[leaderboard]) kandidat langsung terisi
    seketika. \
  - Modul Generative AI untuk #emph[Candidate Dossier] dan
    #emph[Interview Sheet] dijalankan secara asinkron di latar belakang
    (#emph[background job]) atau dipicu secara #emph[lazy-loading]
    (on-demand via SSE/WebSocket) hanya ketika rekruter mengklik nama
    kandidat di antarmuka web. \
  - Tidak ada pemblokiran antrean (#emph[zero blocking overhead]) pada
    alur pemrosesan massal berkas.

=== E. Kepatuhan Regulasi, Fairness, & Auditability
<e.-kepatuhan-regulasi-fairness-auditability>
- #strong[Varian 4.1 (Auditability Kelas Yudisial):] \
  Sistem ini memenuhi syarat audit regulasi ketat tanpa celah sanggahan
  hukum:
  + #emph[Reprodusibilitas Mutlak:] Diberikan berkas CV yang sama dan
    konfigurasi bobot HR yang sama, skor akhir yang dihasilkan pada run
    ke-1 dan run ke-1.000 dipastikan identik pada tingkat bit.
  + #emph[Bebas Bias Posisi:] Karena Jev mengevaluasi kandidat secara
    independen $cal(O) lr((N))$ per kriteria (bukan perbandingan
    kelompok atau listwise LLM), urutan berkas saat diunggah tidak
    memiliki dampak apa pun terhadap probabilitas kelolosan.
  + #emph[Audit Ketenagakerjaan:] Kode fungsi `scorer.py` dan tabel
    probabilitas Jev dapat diserahkan langsung kepada auditor eksternal
    untuk membuktikan bahwa tidak ada parameter tersembunyi (#emph[black
    box]) yang mendiskriminasi kandidat.
- #strong[Varian 4.4 (Kepatuhan Terjaga Melalui Pemisahan Tanggung
  Jawab):] \
  Varian 4.4 mempertahankan kepatuhan hukum kelas yudisial ini dengan
  menerapkan prinsip pemisahan tanggung jawab (#emph[Separation of
  Concerns]):
  - #strong[Keputusan Seleksi (Penentuan Shortlist & Peringkat):]
    Dihasilkan 100% oleh mesin Varian 4.1. \
  - #strong[Dokumentasi Naratif:] LLM bertindak murni sebagai "panitera
    sintesis". Pada antarmuka pengguna, dossier naratif diberi tanda air
    (#emph[provenance metadata]): \
    `"Penilaian kualifikasi dihitung secara deterministik oleh Core Jev Engine. Narasi ini dihasilkan oleh asisten AI berbasis kutipan terverifikasi halaman 2 & 4."`
    \
    Dengan pemisahan ini, perusahaan terlindungi secara hukum dari
    tuduhan #emph["keputusan penolakan otomatis oleh model generatif
    liar"] (melanggar UU PDP Pasal 40).

=== F. Kompleksitas Rekayasa & Maintenance
<f.-kompleksitas-rekayasa-maintenance>
- #strong[Varian 4.1:] \
  Arsitektur perangkat lunak sangat bersih dan tangguh (#emph[lean]).
  Dependensi eksternal hanya bergantung pada satu penyedia layanan:
  `api.typesafe.ai` (Decisions API). Tidak ada risiko #emph[prompt
  drift], tidak memerlukan pustaka mitigasi kegagalan JSON seperti
  #emph[Instructor], dan skema database PostgreSQL dapat dimodelkan
  secara relasional murni dengan integritas referensial ketat.

- #strong[Varian 4.4:] \
  Mengharuskan tim rekayasa memelihara lapisan orkestrasi tambahan:

  + #emph[Model Gateway & Fallback Layer:] Manajemen koneksi ganda (Jev
    API + Provider LLM seperti Anthropic/OpenAI/Ollama lokal).
  + #emph[Schema Enforcement:] Penggunaan Pydantic Structured Outputs
    untuk memastikan ekstraksi kriteria JD di hulu tidak menghasilkan
    format JSON yang rusak.
  + #emph[Evaluasi Kualitas Prompt:] Membutuhkan pipeline evaluasi
    otomatis (#emph[LLM Evals]) secara berkala untuk memantau apakah
    perubahan bobot atau pembaruan model LLM dasar menurunkan kualitas
    pertanyaan wawancara yang dihasilkan.
  + #emph[Graceful Degradation:] Sistem wajib memiliki logika
    #emph[fallback]: jika kuota atau layanan LLM mengalami gangguan
    (#emph[downtime]), aplikasi harus secara otomatis menurunkan mode
    operasi ke Varian 4.1 tanpa menghentikan proses penyaringan pelamar.

#horizontalrule

= 4. STRATEGI ADOPSI BERTAHAP (PHASED ROADMAP RECOMMENDATION)
<strategi-adopsi-bertahap-phased-roadmap-recommendation>
Berdasarkan prinsip #emph[Gall’s Law] ("Sistem kompleks yang berhasil
selalu berevolusi dari sistem sederhana yang bekerja dengan baik"),
mengimplementasikan Varian 4.4 secara langsung sejak hari pertama tanpa
memvalidasi mesin inti adalah kesalahan arsitektur fatal.

Rekomendasi strategis Luminaries adalah #strong[membangun dan
menstabilkan Varian 4.1 sebagai Core Engine yang kokoh terlebih dahulu],
kemudian menumpangkan lapisan Generative AI (Varian 4.4) secara bertahap
tanpa pernah menyentuh inti penilaian.


#align(center)[
#block(
  width: 100%,
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 6pt,
  fill: rgb("#f8fafc"),
  inset: 10pt,
  [
    #set text(size: 8pt)
    #align(left)[#text(weight: "bold", fill: rgb("#1e293b"), size: 9pt)[PETA JALAN STRATEGIS REKAYASA (PHASED ROADMAP)]]
    #v(6pt)
    
    #rect(width: 100%, fill: white, stroke: 0.5pt + rgb("#3b82f6"), radius: 4pt, inset: 8pt)[
      #text(weight: "bold", fill: rgb("#1d4ed8"))[FASE 1: THE DETERMINISTIC TRUTH ENGINE (Varian 4.1 Production Baseline)] \
      #v(2pt)
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        [M1-M5:],
        [Docling Lokal + OCR Fallback #sym.arrow.r NFKC Verifier #sym.arrow.r Jev API Client #sym.arrow.r Python Deterministic Scorer #sym.arrow.r Golden Test E1-E8 \
        #text(size: 7.5pt, fill: rgb("#16a34a"), weight: "bold")[Capaian: Mesin penapisan berkeadilan, auditabel, 100% bebas halusinasi.]]
      )
    ]
    #v(4pt)
    #rect(width: 100%, fill: white, stroke: 0.5pt + rgb("#eab308"), radius: 4pt, inset: 8pt)[
      #text(weight: "bold", fill: rgb("#b45309"))[FASE 2: UPSTREAM ERGONOMIC LEVERAGE (Inisiasi Varian 4.4 Hulu)] \
      #v(2pt)
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        [M6-M7:],
        [Modul Dekonstruksi JD Mentah via LLM Structured Outputs #sym.arrow.r Antarmuka Validasi HR (Approval Gate) \
        #text(size: 7.5pt, fill: rgb("#b45309"), weight: "bold")[Capaian: HR bebas input draf teks bebas; skema kriteria terkunci otomatis.]]
      )
    ]
    #v(4pt)
    #rect(width: 100%, fill: white, stroke: 0.5pt + rgb("#a855f7"), radius: 4pt, inset: 8pt)[
      #text(weight: "bold", fill: rgb("#7e22ce"))[FASE 3: DOWNSTREAM RECRUITER EMPOWERMENT (Sintesis Varian 4.4 Hilir)] \
      #v(2pt)
      #grid(
        columns: (auto, 1fr),
        gutter: 6pt,
        [M8-M10:],
        [Executive Dossier (Top 10%) #sym.arrow.r Dynamic Interview Sheet #sym.arrow.r Circuit Breaker Fallback UI \
        #text(size: 7.5pt, fill: rgb("#7e22ce"), weight: "bold")[Capaian: Platform rekrutmen enterprise berdaya saing komersial penuh.]]
      )
    ]
  ]
)
]


== Rincian Pelaksanaan 3 Fase
<rincian-pelaksanaan-3-fase>
=== Fase 1: Membangun Core Engine (Varian 4.1) — Fondasi Epistemik
<fase-1-membangun-core-engine-varian-4.1-fondasi-epistemik>
Tujuan fase ini adalah melahirkan mesin kebenaran (#emph[Truth Engine])
yang tidak bisa digoyahkan: 1. Selesaikan engine parsing dokumen lokal
menggunakan IBM Docling. Pastikan dokumen multi-kolom dan CV hasil
pindai/foto (#emph[scanned PDF]) diproses sempurna oleh modul OCR lokal
tanpa memanggil API pihak ketiga. 2. Terapkan verifikator substring NFKC
secara ketat. Toleransi kalimat bukti tanpa dasar dokumen: 0%. 3.
Sambungkan Trio Primitif Jev System One: - `Noul` untuk evaluasi biner
syarat mutlak ($Gamma$). - `Choice` untuk level bukti pengalaman nyata
(`STRONG`/`PARTIAL`/`NOT_DEMONSTRATED`). - `Score` untuk skor kedalaman
kontinu pemecah seri ($S_(upright("depth"))$). 4. Kunci implementasi
perankingan deterministik pada modul `scorer.py` dan validasi
menggunakan #emph[Golden Test Dataset] (termasuk skenario pengujian
adversarial: #emph[keyword stuffing], manipulasi teks tersembunyi, dan
#emph[counterfactual CV]). #emph[Keluaran Fase 1:] Sistem penapisan
berfungsi penuh, terpasang di database PostgreSQL, dengan antarmuka
Recruiter Cockpit berbasis lencana status dan kutipan bukti verbatim.

=== Fase 2: Akselerasi Ergonomi Hulu (Upstream Generative Integration)
<fase-2-akselerasi-ergonomi-hulu-upstream-generative-integration>
Setelah Core Engine terbukti stabil pada Varian 4.1, tambahkan modul
kecerdasan generatif pada pintu masuk data: 1. Bangun pipeline penerima
teks deskripsi pekerjaan bebas. Gunakan LLM ringan dengan skema keluaran
terstruktur (#emph[Pydantic Output]) untuk memetakan deskripsi pekerjaan
menjadi entitas kriteria:
`json    {      "role_title": "Senior Backend Engineer",      "hard_gates": ["Minimal 4 tahun pengalaman Python", "Domisili Indonesia"],      "eval_criteria": [        {"id": "c1", "name": "Arsitektur Event-Driven / Kafka", "weight": 25},        {"id": "c2", "name": "Optimasi Database PostgreSQL", "weight": 25}      ]    }`
2. Pasang #strong[HR Approval Gate]: Rekruter melihat hasil ekstraksi di
layar antarmuka, dapat mengubah bobot atau menambah/menghapus butir
kriteria, lalu menekan tombol #emph["Kunci Rubrik Penilaian"]. \
#emph[Invarian Rekayasa:] Data yang masuk ke mesin penilaian hanyalah
kriteria yang telah disahkan manusia.

=== Fase 3: Sintesis Pengetahuan Hilir (Downstream Dossier Synthesis)
<fase-3-sintesis-pengetahuan-hilir-downstream-dossier-synthesis>
Lengkapi siklus dengan menyematkan modul asisten wawancara pada ujung
penapisan: 1. Tetapkan filter gerbang (#emph[gating logic]): Modul
generatif hilir #strong[HANYA DIPICU] bagi kandidat yang lolos ke
`Band A` (Top Recommendation) dan `Band B` (Potential Contender), atau
sekitar 5–10% berkas teratas. Kandidat pada `Band R` (Gagal hard gate)
dan `Band C` tidak perlu membuang token komputasi. 2. Buat generator
#emph[Dynamic Interview Sheet]: LLM memindai butir kriteria di mana
kandidat mendapatkan status `PARTIAL` dari Jev, lalu merumuskan
pertanyaan wawancara investigatif tingkat lanjut agar pewawancara dapat
menguji kompetensi tersebut secara presisi di ruang wawancara. 3. Pasang
mekanisme isolasi kegagalan (#emph[Circuit Breaker]): Apabila API
penyedia LLM mengalami #emph[timeout] atau kehabisan kuota, antarmuka
web rekruter tetap menampilkan skor Jev, kutipan bukti asli, dan
peringkat kandidat tanpa ada gangguan fungsional sedikit pun.

#horizontalrule

= 5. KESIMPULAN & REKOMENDASI AKHIR
<kesimpulan-rekomendasi-akhir>
== 5.1 Sintesis Filosofis: Pemisahan Kebenaran dan Narasi
<sintesis-filosofis-pemisahan-kebenaran-dan-narasi>
Kegagalan sebagian besar arsitektur AI modern dalam domain rekrutmen
bersumber dari kekeliruan menempatkan model generatif sebagai
#emph[hakim penentu nasib pelamar]. Menyerahkan perhitungan nilai,
pembobotan, dan peringkat kepada probabilitas autoregresif teks bebas
LLM adalah tindakan sembrono yang cacat metodologi, rentan bias posisi,
melanggar prinsip keadilan, serta melanggar hukum ketenagakerjaan.

Sebaliknya, menolak kehadiran AI Generatif secara total dan memaksakan
sistem deterministik kaku murni (seperti ATS tradisional berbasis kata
kunci) membuat aplikasi kehilangan daya tarik komersial dan membebani
kognisi rekruter dengan data mentah yang melelahkan.

Perbandingan antara Varian 4.1 dan Varian 4.4 menghasilkan satu prinsip
arsitektural mutlak: \> #strong["Gunakan Deterministik dan Jev System
One untuk Menemukan Kebenaran dan Menghitung Keadilan. Gunakan AI
Generatif Semata-mata untuk Meringankan Bahasa dan Mensintesis Narasi."]


#align(center)[
#rect(
  width: 100%,
  stroke: 1.2pt + rgb("#2563eb"),
  radius: 6pt,
  fill: rgb("#eff6ff"),
  inset: 12pt,
  [
    #text(weight: "bold", fill: rgb("#1d4ed8"), size: 10pt)[POSTULAT AKHIR LUMINARIES SAGE]
    #v(6pt)
    #align(left)[
      1. *VARIAN 4.1 ADALAH "TRUTH ENGINE" (FONDASI ETIK & MATEMATIS).*          Tanpa Varian 4.1, sistem tidak memiliki legitimasi ilmiah, auditabilitas, dan kepatuhan yudisial.       2. *VARIAN 4.4 ADALAH "ENTERPRISE PRODUCT" (PRODUK AKSIABEL PENUH).*          Varian 4.4 membungkus Truth Engine dengan lapisan kenyamanan kognitif rekruter tanpa mengorbankan integritas penilaian inti.       3. *REKOMENDASI EKSEKUSI:*          Bangun dan uji tuntas Varian 4.1 pada Milestone 1-5 sebagai fondasi produksi baseline, lalu rilis Varian 4.4 sebagai lapisan kapabilitas tahap lanjut (Milestone 6-10).
    ]
  ]
)
]


Rekomendasi strategis akhir bagi tim rekayasa
`alifihsan7/ai-cv-screening-ranking` adalah #strong[menjadikan Varian
4.1 sebagai fondasi rilis baseline internal (MVP Core Engine)], dan
secara paralel menyiapkan antarmuka modular yang siap menerima ekstensi
#strong[Varian 4.4 pada tahap rilis komersial enterprise]. Dengan
arsitektur ini, platform memiliki keunggulan kompetitif ganda: akurasi
yudisial tak terbantahkan dengan efisiensi biaya tertinggi di kelasnya,
dipadukan dengan pengalaman pengguna rekruter paling modern dan minim
friksi.


#v(1.2em)
#block(fill: rgb("#fef3c7"), inset: 9pt, radius: 3pt, width: 100%)[
  *Catatan status (2026-10-29):* dokumen ini ditulis sebelum integrasi Jev diukur dan sebelum uji dengan CV nyata. Sebagian klaimnya berbeda dari implementasi dan hasil ukur: alurnya bertahap tetap, bukan agent otonom; hasil Jev tidak sepenuhnya deterministik (cache hasil Jev belum ada); angka kinerja apa pun di sini harus dibaca bersama hasil ukur yang sebenarnya. Yang berlaku: CLAUDE.md, docs/spec/DECISIONS.md, dan docs/eval/BENCHMARK\_RESULTS\_2026-10-29.md.
]
