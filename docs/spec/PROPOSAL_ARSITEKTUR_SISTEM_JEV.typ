#set document(
  title: "Proposal Arsitektur Sistem AI CV Screening & Ranking Berbasis Bukti",
  author: ("Alif Ihsan", "AI7 Solaris")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #grid(
      columns: (1fr, 1fr),
      align(left)[*Proposal Arsitektur Sistem* — AI CV Screening & Ranking],
      align(right)[AI7 Solaris • TypeSafe Jev System One]
    )
    #v(-3pt)
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
  ],
  footer: context text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
    #v(3pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[Blueprint Sistem: `v2.0-Production-Proposal` | Klasifikasi: Engineering Proposal],
      align(right)[Halaman #counter(page).display() dari #counter(page).final().first()]
    )
  ]
)

#set text(
  font: "Liberation Sans",
  size: 9.5pt,
  fill: rgb("#1e293b"),
  spacing: 120%
)

#set par(justify: true, leading: 0.65em)

#show heading: set text(hyphenate: false)

#show heading.where(level: 1): it => block(
  above: 22pt, below: 10pt, breakable: false,
  [
    #text(font: "DejaVu Serif", size: 13.5pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
    #v(3pt)
    #line(length: 100%, stroke: 0.8pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 15pt, below: 8pt, breakable: false,
  text(font: "Liberation Sans", size: 11pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 12pt, below: 6pt, breakable: false,
  text(font: "Liberation Sans", size: 10pt, weight: "bold", fill: rgb("#334155"))[#it.body]
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
#let blockquote(body) = quote(body)

#show quote: it => block(
  fill: rgb("#f8fafc"),
  stroke: (left: 3.5pt + rgb("#2563eb")),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 8pt),
  width: 100%,
  breakable: false,
  text(font: "Liberation Sans", size: 9pt, fill: rgb("#1e293b"))[#it.body]
)

#show raw.where(block: true): it => block(
  fill: rgb("#f8fafc"),
  stroke: 0.5pt + rgb("#e2e8f0"),
  radius: 4pt,
  inset: (x: 8pt, y: 6pt),
  width: 100%,
  breakable: true,
  [
    #set par(leading: 0.28em)
    #set text(font: "DejaVu Sans Mono", size: 6.8pt, fill: rgb("#0f172a"))
    #it
  ]
)

#show raw.where(block: false): set text(font: "DejaVu Sans Mono", size: 8pt, fill: rgb("#0f172a"))

#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f8fafc") } else if calc.even(row) { rgb("#fcfcfd") } else { none },
  inset: (x: 8pt, y: 7pt)
)

// Document Title & Metadata Card
#v(-5pt)
#text(font: "DejaVu Serif", size: 20pt, weight: "bold", fill: rgb("#0f172a"), hyphenate: false)[
  Proposal Arsitektur & Rekayasa Sistem \
  AI CV Screening & Ranking Berbasis Bukti
]
#v(4pt)
#text(font: "Liberation Sans", size: 10.5pt, fill: rgb("#475569"))[
  Evaluasi Semantik Terstruktur TypeSafe Jev System One & Perankingan Deterministik
]
#v(6pt)

#rect(
  width: 100%,
  fill: rgb("#f8fafc"),
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 5pt,
  inset: (x: 12pt, y: 9pt)
)[
  #grid(
    columns: (1fr, 1.2fr),
    row-gutter: 7pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:] Alif Ihsan (AI7 Solaris)],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Engineering Proposal / Technical Blueprint],
    [#text(weight: "bold", fill: rgb("#475569"))[Status:] Siap Dipresentasikan (Bimbingan)],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori:] `https://github.com/alifihsan7/ai-cv-screening-ranking.git`]
  )
]
#v(10pt)

#outline(title: [Daftar Isi], indent: 1.5em, depth: 2)
#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
#v(1.5em)
= PROPOSAL & CETAK BIRU REKAYASA SISTEM
<proposal-cetak-biru-rekayasa-sistem>
== End-to-End AI Talent Acquisition & Screening Platform: Dari
Dekonstruksi Job Desc Hingga Perankingan Bukti
<end-to-end-ai-talent-acquisition-screening-platform-dari-dekonstruksi-job-desc-hingga-perankingan-bukti>
=== Evaluasi Komparatif Arsitektur: Full AI Jev System One vs Full LLM
Biasa vs Sistem Hibrida
<evaluasi-komparatif-arsitektur-full-ai-jev-system-one-vs-full-llm-biasa-vs-sistem-hibrida>

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 1. PENDAHULUAN & CAKUPAN END-TO-END
<pendahuluan-cakupan-end-to-end>
Berdasarkan diskusi dan arahan bimbingan terbaru, cakupan sistem ini
#strong[bukan hanya menyaring CV di tahap hilir], melainkan mencakup
seluruh siklus rekrutmen dari hulu ke hilir:

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

Dokumen ini membedah arsitektur sistem secara menyeluruh, mengulas
bagaimana sistem menangani input teks mentah Job Description (JD),
membandingkan secara objektif #strong[tiga paradigma arsitektur (Full
Jev, Non-Jev / Full LLM, dan Hibrida)] di setiap komponen, serta
menetapkan rekomendasi teknis terbaik yang siap dipresentasikan ke tim
penguji dan dosen pembimbing.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 2. ALUR END-TO-END: DARI JOB DESC HINGGA REKRUTER COCKPIT
<alur-end-to-end-dari-job-desc-hingga-rekruter-cockpit>
== Tahap 1: Ingestion & Dekonstruksi Job Description (JD Compiler)
<tahap-1-ingestion-dekonstruksi-job-description-jd-compiler>
- #strong[Input Mentah]: Dokumen lowongan bebas dari HR (bisa berupa
  teks memo, PDF draft lowongan, atau bullet points deskripsi
  pekerjaan).
- #strong[Proses]: Sistem mendekonstruksi teks JD menjadi unit-unit
  kualifikasi diskrit (#emph[Atomic Requirements]).
- #strong[Ekstraksi Komponen]:
  + #emph[Role Family & Seniority Level] (misal: Backend Engineer,
    Minimal 3 Tahun).
  + #emph[Hard Gate Requirements] (Syarat mutlak: Gelar S1, Sertifikasi
    Lisensi Tertentu).
  + #emph[Core Competencies & Stack] (Python, FastAPI, PostgreSQL,
    Docker).
  + #emph[Project Responsibilities & Metrics] (Pengalaman merancang
    sistem high-concurrency, optimasi latensi query).

== Tahap 2: Validasi & Approval Rubrik oleh HR (Human-in-the-Loop Gate
1)
<tahap-2-validasi-approval-rubrik-oleh-hr-human-in-the-loop-gate-1>
- Sebelum CV diproses, HR memeriksa hasil dekonstruksi JD di antarmuka
  web.
- HR menetapkan:
  - Kategori Kriteria: #emph[MUST\_HAVE] (Syarat Wajib),
    #emph[STRONG\_PREFERENCE], atau #emph[NICE\_TO\_HAVE].
  - Pembobotan Persentase: Total bobot $100 percent$ terdistribusi pada
    kategori Pengalaman, Keahlian Teknis, dan Prestasi.
- #strong[Hasil]: Berkas spesifikasi kriteria terstruktur yang dikunci
  (`requirement_set.json`).

== Tahap 3: Ingestion & Zonasi Dokumen Pelamar (CV & Bundel Lampiran)
<tahap-3-ingestion-zonasi-dokumen-pelamar-cv-bundel-lampiran>
- Pelamar mengunggah berkas (PDF atau DOCX tunggal maupun bundel
  multi-halaman berisi sertifikat/penghargaan).
- Parser IBM Docling mengekstrak struktur teks, layout tabel 2-kolom,
  dan mempartisi halaman ke dalam zona:
  - `ZONE_RESUME`: Teks riwayat kerja, deskripsi proyek, dan pendidikan.
  - `ZONE_CERTIFICATE`: Sertifikat pelatihan, lisensi profesi, atau
    bootcamps.
  - `ZONE_AWARDS`: Dokumen penghargaan atau kompetisi.

== Tahap 4: Normalisasi & Verifikasi Grounding NFKC (Zero-Hallucination
Guard)
<tahap-4-normalisasi-verifikasi-grounding-nfkc-zero-hallucination-guard>
- Seluruh teks dinormalisasi ke standar Unicode NFKC.
- Setiap klaim atau kutipan yang diajukan dalam analisis diuji secara
  deterministik menggunakan #emph[Exact Substring Matching].
- Jika ada klaim kualifikasi yang tidak ditemukan dalam teks asli
  dokumen, sistem menandai sebagai #emph[Unverified Claim] (Toleransi
  halusinasi: 0%).

== Tahap 5: Evaluasi Semantik Kualifikasi (Matching Layer)
<tahap-5-evaluasi-semantik-kualifikasi-matching-layer>
- Setiap kriteria dari JD dicocokkan terhadap zona pengalaman kandidat
  yang relevan.
- Menguji kualifikasi mutlak, tingkat demonstrasi bukti proyek nyata,
  serta kedalaman teknis kandidat.

== Tahap 6: Agregasi Skor & Perankingan Leaderboard (Ranking Engine)
<tahap-6-agregasi-skor-perankingan-leaderboard-ranking-engine>
- Sistem lokal menghitung nilai akhir terbobot (skala 0–100) dan
  menentukan pemetaan ke dalam 4 talent bands (`Band A`, `Band B`,
  `Band C`, `Band R`).
- Leaderboard Top 3 / Top N disusun secara matematis untuk diberikan
  kepada rekruter.

== Tahap 7: Recruiter Cockpit (Human-in-the-Loop Gate 2)
<tahap-7-recruiter-cockpit-human-in-the-loop-gate-2>
- Rekruter meninjau kandidat di dashboard modern anti-slop:
  - Tab 1: Evaluasi Kriteria (Rincian bukti per butir JD).
  - Tab 2: Telemetri Keputusan (Latensi komputasi & reasoning trace).
  - Tab 3: Kutipan CV Terverifikasi (Highlight teks asli dokumen).
- Rekruter mengambil keputusan akhir: #emph[Shortlist], #emph[Hold],
  #emph[Reject], atau #emph[Jadwalkan Wawancara].

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 3. ANALISIS PERBANDINGAN KOMPONEN: FULL JEV VS BUKAN JEV (FULL LLM) VS
HIBRIDA
<analisis-perbandingan-komponen-full-jev-vs-bukan-jev-full-llm-vs-hibrida>
Berikut adalah analisis komparatif mendalam untuk setiap modul utama
sistem:

== 3.1 Komponen 1: Dekonstruksi & Ekstraksi Job Description (JD
Compiler)
<komponen-1-dekonstruksi-ekstraksi-job-description-jd-compiler>
- #strong[Opsi A: Full Jev System One]
  - #emph[Cara Kerja]: Jev adalah model keputusan diskrit
    (#emph[Decisions API]), bukan model generatif percakapan
    (#emph[autoregressive text generator]). Untuk mendekonstruksi JD,
    sistem harus mendefinisikan taksonomi kriteria tertutup terlebih
    dahulu (misal: 100 pilihan skill standar). Jev lalu mengevaluasi
    opsi mana yang terkandung di dalam teks JD (`Noul`/`Choice`).
  - #emph[Kelebihan]: Ekstraksi sangat terkontrol dan patuh pada
    taksonomi baku. Tidak ada risiko AI mengarang skill aneh yang tidak
    ada di industri.
  - #emph[Kelemahan]: Kaku. Jika ada istilah baru atau penulisan peran
    non-standar di JD HR, Jev tidak bisa menghasilkan teks bebas untuk
    deskripsi kriteria baru tanpa taksonomi awal.
- #strong[Opsi B: Bukan Jev (Full LLM Generatif Biasa, misal Llama/GPT)]
  - #emph[Cara Kerja]: Memberikan prompt panjang ke LLM: #emph["Ekstrak
    kriteria, bobot, dan syarat mutlak dari teks JD berikut menjadi
    JSON"].
  - #emph[Kelebihan]: Sangat fleksibel, mampu merangkum teks JD yang
    berantakan, dan mampu menuliskan narasi deskripsi requirement secara
    otomatis.
  - #emph[Kelemahan]: Rentan halusinasi skema JSON, ekstraksi sering
    tidak konsisten (tiap run bisa menghasilkan jumlah kriteria
    berbeda), dan boros token ($med 3.000$ token per JD).
- #strong[Opsi C: Pendekatan Hibrida (Rekomendasi)]
  - #emph[Cara Kerja]: Menggunakan parser rule-based/regex terstruktur
    untuk menangkap seksi JD baku, dibantu model generatif terisolasi
    untuk ekstraksi teks bebas ke skema JSON, lalu diverifikasi oleh HR
    pada Approval Gate sebelum dikunci.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.2 Komponen 2: Parsing & Zonasi Dokumen Pelamar (CV & Bundel)
<komponen-2-parsing-zonasi-dokumen-pelamar-cv-bundel>
- #strong[Opsi A: Full Jev System One]
  - #emph[Cara Kerja]: Jev tidak memiliki engine OCR atau visual layout
    rendering native. Dokumen harus diubah ke plain text terlebih dahulu
    oleh script eksternal sebelum diproses oleh Jev.
  - #emph[Kelebihan]: Tidak membebani model dengan token visual mentah.
  - #emph[Kelemahan]: Tidak bisa membedakan tata letak dua kolom atau
    tabel visual secara mandiri tanpa parser dokumen eksternal.
- #strong[Opsi B: Bukan Jev (Full LLM Multimodal / Vision)]
  - #emph[Cara Kerja]: Mengirimkan seluruh halaman PDF sebagai gambar ke
    LLM Multimodal (Vision API).
  - #emph[Kelebihan]: Mampu membaca layout visual dan grafis sertifikat
    secara langsung.
  - #emph[Kelemahan]: Biaya komputasi dan token astronomis ($med 1.500$
    token per gambar halaman; CV 10 halaman \= 15.000 token per
    pelamar). Latensi sangat lambat (5–12 detik per CV), dan rawan salah
    membaca teks kecil pada transkrip ijazah.
- #strong[Opsi C: Pendekatan Hibrida (Rekomendasi)]
  - #emph[Cara Kerja]: Menggunakan engine lokal #strong[IBM Docling].
    Docling membedah dokumen PDF/DOCX secara layout-aware
    (mempertahankan tabel dan membaca 2 kolom dengan benar) serta
    mempartisi dokumen ke dalam zona (`ZONE_RESUME`, `ZONE_CERTIFICATE`,
    `ZONE_AWARDS`) dengan latensi $lt 500$ ms tanpa biaya token.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.3 Komponen 3: Verifikasi Integritas & Anti-Halusinasi Bukti
<komponen-3-verifikasi-integritas-anti-halusinasi-bukti>
- #strong[Opsi A: Full Jev System One]
  - #emph[Cara Kerja]: Jev mengevaluasi probabilitas kebenaran klaim
    berdasarkan potongan teks CV yang diberikan secara eksplisit.
  - #emph[Kelebihan]: Karena Jev tidak menggenerasi teks bebas, risiko
    model mengarang kalimat buatan sendiri bernilai 0%.
  - #emph[Kelemahan]: Masih memerlukan verifikasi substring string di
    memori untuk memastikan token offset kutipan akurat di karakter
    dokumen.
- #strong[Opsi B: Bukan Jev (Full LLM Generatif Biasa)]
  - #emph[Cara Kerja]: Meminta LLM: #emph["Kutip kalimat dari CV yang
    membuktikan kandidat menguasai Python"].
  - #emph[Kelebihan]: Menghasilkan penjelasan bahasa alami yang lancar
    bagi pembaca manusia.
  - #emph[Kelemahan]: #strong[Kelemahan fatal rekrutmen]: LLM generatif
    sering memparafrasekan kalimat kandidat atau bahkan menyisipkan
    pengalaman fiktif yang tidak pernah ada di berkas asli pelamar
    (#emph[hallucinatory citation]).
- #strong[Opsi C: Pendekatan Hibrida (Rekomendasi)]
  - #emph[Cara Kerja]: Menerapkan #strong[Unicode NFKC Exact Substring
    Matcher] di Python lokal. Sistem mewajibkan setiap kutipan bukti
    cocok 100% karakter per karakter dengan teks asli dokumen. Evaluasi
    relevansi semantik diserahkan ke Jev, sementara bukti fisik dikunci
    oleh verifier deterministik.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.4 Komponen 4: Evaluasi Kecocokan Kualifikasi (Semantic Matching)
<komponen-4-evaluasi-kecocokan-kualifikasi-semantic-matching>
- #strong[Opsi A: Full Jev System One]
  - #emph[Cara Kerja]: Menggunakan tiga primitif Jev secara penuh:
    + `Noul`: Evaluasi kualifikasi mutlak (#emph[Hard Gate Yes/No]).
    + `Choice`: Klasifikasi level pembuktian tertutup (`STRONG` /
      `PARTIAL` / `NOT_DEMONSTRATED`).
    + `Score`: Evaluasi skalar kontinu kedalaman semantik pengalaman
      teknis ($0.00 minus 1.00$).
  - #emph[Kelebihan]: Deterministik, luaran berupa distribusi
    probabilitas terstruktur, waktu inferensi sangat cepat ($lt 150$
    ms), biaya token sangat murah ($dollar 0.042$ / 1M token input,
    $dollar 0$ output), dan bebas bias kata-kata berbunga di CV.
  - #emph[Kelemahan]: Tidak menghasilkan paragraf opini atau saran
    wawancara dalam bahasa bebas secara otomatis.
- #strong[Opsi B: Bukan Jev (Full LLM Generatif Biasa)]
  - #emph[Cara Kerja]: Prompt perbandingan panjang berisi teks CV dan
    syarat lowongan, meminta LLM memberikan narasi analisis kecocokan.
  - #emph[Kelebihan]: Memberikan narasi umpan balik yang terdengar
    cerdas dan manusiawi.
  - #emph[Kelemahan]: #emph[Prompt sensitivity] tinggi (perubahan minor
    pada template prompt bisa mengubah penilaian kandidat), rentan
    manipulasi #emph[prompt injection] tersembunyi di CV (misal:
    instruksi putih transparan di PDF), serta waktu inferensi lambat
    (2–5 detik per evaluasi kriteria).
- #strong[Opsi C: Pendekatan Hibrida (Rekomendasi)]
  - #emph[Cara Kerja]: Seluruh evaluasi kecocokan inti dieksekusi oleh
    Jev System One. Jev bertindak sebagai hakim semantik objektif bebas
    halusinasi.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.5 Komponen 5: Perhitungan Skor & Perankingan Kandidat (Ranking
Engine)
<komponen-5-perhitungan-skor-perankingan-kandidat-ranking-engine>
- #strong[Opsi A: Full Jev System One (Pure Single-Model Ranking)]
  - #emph[Cara Kerja]: Menggunakan model untuk membandingkan pasangan
    kandidat secara langsung (#emph[pairwise classification]):
    #emph["Antara Kandidat A dan Kandidat B, mana yang lebih memenuhi
    syarat?"].
  - #emph[Kelebihan]: Mampu menangkap nuansa komparasi langsung antar
    kandidat.
  - #emph[Kelemahan]: Kompleksitas komputasi melonjak secara kuadratik
    $cal(O) lr((N^2))$. Jika ada 100 pelamar, sistem harus melakukan
    4.950 perbandingan pasangan! Ini sangat tidak efisien dan rentan
    terhadap inkonsistensi siklik (A \> B, B \> C, tapi C \> A).
- #strong[Opsi B: Bukan Jev (Full LLM Listwise Ranking)]
  - #emph[Cara Kerja]: Memasukkan 10 CV sekaligus ke dalam satu prompt
    konteks besar, lalu menyuruh LLM: #emph["Urutkan kandidat dari
    peringkat 1 sampai 10"].
  - #emph[Kelebihan]: Sangat mudah diprogram (hanya satu prompt
    pemanggilan).
  - #emph[Kelemahan]: #strong[Cacat fatal metodologi AI]: Dipengaruhi
    oleh bias posisi (#emph[Lost in the Middle / Primacy-Recency Bias] —
    kandidat yang diletakkan di awal atau akhir prompt cenderung diberi
    skor lebih tinggi daripada yang di tengah). Tidak ada rumus
    matematis yang konsisten dan tidak bisa diaudit secara hukum
    ketenagakerjaan.
- #strong[Opsi C: Pendekatan Hibrida (Rekomendasi)]
  - #emph[Cara Kerja]: #strong[AI Tidak Boleh Berhitung]. Jev hanya
    bertugas menilai status kriteria per kandidat secara independen
    $cal(O) lr((N))$. Skor total 0–100 dihitung oleh mesin lokal Python
    menggunakan rumus agregasi berbobot. Leaderboard diurutkan secara
    matematis transparan dan deterministik.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 4. TABEL MATRIKS PERBANDINGAN KOMPREHENSIF PER KOMPONEN
<tabel-matriks-perbandingan-komprehensif-per-komponen>
#align(center)[#table(
  columns: 5,
  align: (col, row) => (left,left,left,left,left,).at(col),
  inset: 6pt,
  [Modul / Komponen Sistem], [Opsi A: Full Jev System One], [Opsi B:
  Bukan Jev (Full LLM Biasa)], [Opsi C: Sistem Hibrida (Rekomendasi)],
  [Mengapa Opsi C Terbaik?],
  [#strong[1. Dekonstruksi Job Desc (JD Ingestion)]],
  [Pemetaan tertutup via Noul/Choice ke taksonomi baku. #emph[(Akurat,
  tapi kaku jika ada role baru)]],
  [Ekstraksi teks bebas via prompt generatif. #emph[(Fleksibel, tapi
  rawan halusinasi format)]],
  [Ekstraksi terstruktur berbasis skema + validasi Approval Gate HR.],
  [Menjamin skema kriteria valid dan HR memegang kendali atas bobot
  sebelum screening dimulai.],
  [#strong[2. Parsing Dokumen & Zonasi Lampiran]],
  [Hanya membaca teks polos; butuh pra-pemrosesan teks eksternal.],
  [Vision API multimodal per halaman. #emph[(Sangat mahal: \$0.01 per
  halaman, latensi lambat)]],
  [IBM Docling lokal: Layout-aware + zonasi `ZONE_RESUME` &
  `ZONE_CERT`.],
  [Menangani 2 kolom dan bundel lampiran secara akurat dengan latensi
  $lt 500$ ms tanpa biaya token.],
  [#strong[3. Grounding & Anti-Halusinasi Teks]],
  [Evaluasi probabilitas klaim semantik tanpa teks bebas.],
  [Model diminta mengutip dan menjelaskan kalimat CV. #emph[(Rawan
  parafrase palsu)]],
  [Unicode NFKC Exact Substring Matcher deterministik di Python.],
  [Memastikan kutipan bukti di dashboard 100% identik dengan naskah asli
  pelamar.],
  [#strong[4. Evaluasi Semantik Kriteria]],
  [Trio Primitif: `Noul` (Gate), `Choice` (Level Bukti), dan `Score`
  (Kedalaman).],
  [Penalaran teks bebas dengan prompt panjang. #emph[(Rawan bias dan
  prompt injection)]],
  [Evaluasi Semantik Murni via API resmi TypeSafe Jev
  (`api.typesafe.ai`).],
  [Menjamin keputusan bebas halusinasi, latensi $lt 150$ ms, dan tarif
  sangat murah (\$0.042/1M token).],
  [#strong[5. Perhitungan Skor & Leaderboard]],
  [Pairwise ranking antar pasangan kandidat $cal(O) lr((N^2))$.
  #emph[(Tidak efisien untuk volume ratusan CV)]],
  [Listwise ranking di dalam prompt generatif. #emph[(Cacat bias posisi
  & tidak konsisten)]],
  [Scorer Deterministik Python: Rumus agregasi bobot HR + Tie-Breaker
  kontinu.],
  [Adil, transparan, matematis terukur, konsisten antar pemanggilan, dan
  memenuhi kepatuhan regulasi.],
  [#strong[6. Penanganan Lampiran Sertifikat]],
  [Evaluasi biner apakah dokumen ada di teks.],
  [Model membaca seluruh lampiran dan rentan melebih-lebihkan sertifikat
  kursus 2 jam.],
  [#emph[Claim-to-Artifact Matching]: Pengalaman proyek nyata diutamakan
  di atas kertas sertifikat.],
  [Menjamin keadilan bagi kandidat CV 1 halaman agar tidak kalah oleh
  kandidat pengumpul sertifikat.],
  [#strong[7. Dashboard Antarmuka Pengguna]],
  [Data mentah probabilitas numerik saja.],
  [Ringkasan teks panjang generatif yang sering bertele-tele.],
  [Recruiter Cockpit Taktil: 3 Tab (Evaluasi, Telemetri, Kutipan Teks) +
  Decision Bar.],
  [Ergonomi tinggi, kecepatan peninjauan HR maksimal, dan keputusan
  akhir tetap di tangan manusia.],
)
]

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 5. FORMULASI MATEMATIS AGREGASI DETERMINISTIK PADA SISTEM HIBRIDA
<formulasi-matematis-agregasi-deterministik-pada-sistem-hibrida>
Untuk membuktikan kepada dosen dan penguji bahwa sistem ini objektif dan
tidak bergantung pada "tebakan liar" LLM, perhitungan skor dirumuskan
secara formal:

=== 1. Hard Gate Qualification ($Gamma$)
<hard-gate-qualification-gamma>
$ Gamma eq product_(k in cal(K)_(upright("must"))) bb(I) lr((P_(upright("noul")) lr((k)) gt.eq tau_k)) $
Jika salah satu syarat mutlak tidak terpenuhi ($Gamma eq 0$), kandidat
langsung dialokasikan ke #strong[Band R (Rejected)] dengan status tidak
memenuhi kualifikasi dasar.

=== 2. Weighted Evidence Score ($S_(upright("evidence"))$)
<weighted-evidence-score-s_textevidence>
Untuk kandidat yang lolos hard gate ($Gamma eq 1$), skor bukti dihitung
berdasarkan bobot kriteria yang disetujui HR:
$ S_(upright("evidence")) eq sum_(j in cal(K)_(upright("eval"))) w_j dot.op v lr((upright("Choice")_j)) $
Dimana: \* $w_j$ adalah bobot persentase kriteria ke-$j$ dengan
$sum w_j eq 100$. \* $v lr((upright("Choice")_j))$ adalah fungsi nilai
diskrit:
$ v lr((upright("Choice")_j)) eq cases(delim: "{", 1.0 & upright("jika ") upright("STRONG"), 0.5 & upright("jika ") upright("PARTIAL"), 0.0 & upright("jika ") upright("NOT_DEMONSTRATED")) $

=== 3. Continuous Semantic Depth ($S_(upright("depth"))$) & Tie-Breaker
<continuous-semantic-depth-s_textdepth-tie-breaker>
Sebagai pembeda kualitas ketika kandidat memiliki kesamaan level bukti
(sama-sama `STRONG`):
$ S_(upright("final")) eq S_(upright("evidence")) plus alpha dot.op lr((1 / lr(|cal(K)_(upright("eval"))|) sum_(j in cal(K)_(upright("eval"))) upright("Score")_j)) $
Faktor $alpha$ disetel pada rentang $0.05$ (bobot 5%), sehingga nilai
kedalaman semantik kontinu dari Jev ($0.00 minus 1.00$) bertindak
sebagai #emph[tie-breaker] desimal yang adil dan elegan tanpa merusak
bobot utama HR.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 6. ESTIMASI EFISIENSI OPERASIONAL & EKONOMI SISTEM
<estimasi-efisiensi-operasional-ekonomi-sistem>
#align(center)[#table(
  columns: 4,
  align: (col, row) => (left,center,center,center,).at(col),
  inset: 6pt,
  [Parameter], [Pendekatan Full Generative LLM], [Arsitektur Hibrida
  TypeSafe Jev], [Selisih Efisiensi],
  [#strong[Tarif Token Input]],
  [\$1.00 – \$3.00 / 1M token],
  [#strong[\$0.042 / 1M token]],
  [Lebih hemat $approx 96 percent$],
  [#strong[Tarif Token Output]],
  [\$2.00 – \$10.00 / 1M token],
  [#strong[\$0.00 (Tanpa Biaya Output)]],
  [Hemat $100 percent$],
  [#strong[Konsumsi Token per CV]],
  [6.000 – 12.000 token],
  [$approx 600 minus 1.000$ token],
  [Reduksi token $10 times$],
  [#strong[Biaya Screening 1.000 CV]],
  [\$15.00 – \$40.00],
  [#strong[\$0.025 – \$0.040]],
  [#strong[$gt 99 percent$ Lebih Hemat]],
  [#strong[Kapasitas Anggaran \$5]],
  [300 – 800 CV],
  [#strong[150.000 – 200.000 CV]],
  [Skalabilitas Enterprise],
  [#strong[Latensi per Kandidat]],
  [8 – 20 detik],
  [#strong[1.2 – 2.5 detik]],
  [$5 times minus 8 times$ Lebih Cepat],
  [#strong[Jaminan Halusinasi]],
  [Rawan parafrase salah],
  [#strong[0% (NFKC Exact Substring)]],
  [Terverifikasi Mutlak],
)
]

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 7. KESIMPULAN & REKOMENDASI UNTUK SIDANG / BIMBINGAN
<kesimpulan-rekomendasi-untuk-sidang-bimbingan>
+ #strong[Bukan Sekadar CV Screening Hilir]:
  - Sistem mengawal siklus seleksi secara utuh: mulai dari dekonstruksi
    teks mentah Job Description oleh HR, penyusunan rubrik berbobot,
    zonasi berkas pelamar, hingga penyusunan leaderboard ranking.
+ #strong[Keunggulan Sistem Hibrida Di Atas Paradigma Ekstrem]:
  - Menolak pendekatan #emph[Full Generative LLM] karena cacat bias
    posisi, boros biaya, dan rawan halusinasi kutipan.
  - Menolak #emph[Full Jev Pairwise] untuk ranking karena ledakan
    komputasi kuadratik $cal(O) lr((N^2))$.
  - Mengadopsi #strong[Sistem Hibrida]: AI mengevaluasi semantik bukti
    kualifikasi secara objektif via TypeSafe Jev System One, sementara
    mesin lokal Python mengunci kepastian parsing (Docling), validasi
    kutipan eksak (NFKC), dan kalkulasi leaderboard matematis.
+ #strong[Keadilan Dokumen Terjamin]:
  - Pelamar dengan CV 1 halaman padat tetap memiliki peluang setara
    meraih peringkat teratas (Band A), karena sistem mengutamakan
    kedalaman bukti proyek nyata di atas jumlah tumpukan lembar
    sertifikat.
