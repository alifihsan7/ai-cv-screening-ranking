#set document(
  title: "Cetak Biru Rekayasa Arsitektur Sistem AI Talent Acquisition & CV Screening Platform",
  author: ("Alif Ihsan", "AI7 Zephyr (Principal Systems Architect)")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #grid(
      columns: (1fr, 1fr),
      align(left)[*Cetak Biru Arsitektur* — AI Talent Acquisition & Screening Platform],
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
      align(left)[Cetak Biru Sistem: `v2.0-Production-Baseline` | Dokumen: Technical Architecture Blueprint],
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
  inset: (x: 7pt, y: 6.5pt)
)

// Document Title & Metadata Card
#v(-5pt)
#text(font: "DejaVu Serif", size: 20pt, weight: "bold", fill: rgb("#0f172a"), hyphenate: false)[
  Cetak Biru Rekayasa Arsitektur Sistem \
  AI Talent Acquisition & Screening Platform
]
#v(4pt)
#text(font: "Liberation Sans", size: 10.5pt, fill: rgb("#475569"))[
  Taksonomi Arsitektural: Full Jev, Full Deterministik, Full LLM, dan 4 Varian Sistem Hibrida
]
#v(6pt)

#rect(
  width: 100%,
  fill: rgb("#f8fafc"),
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 5pt,
  inset: (x: 12pt, y: 10pt)
)[
  #grid(
    columns: (1fr, 1fr),
    column-gutter: 16pt,
    row-gutter: 8pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:]\ Alif Ihsan & AI7 Zephyr\ #text(size: 8pt, fill: rgb("#64748b"))[(Principal Systems Architect)]],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi Dokumen:]\ Cetak Biru Rekayasa\ #text(size: 8pt, fill: rgb("#64748b"))[(Technical Architecture Blueprint)]],
    [#text(weight: "bold", fill: rgb("#475569"))[Status Siklus Sistem:]\ Standar Arsitektur Produksi],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori Proyek:]\ #text(size: 7.8pt)[`alifihsan7/ai-cv-screening-ranking`]]
  )
]
#v(10pt)

#outline(title: [Daftar Isi], indent: 1.5em, depth: 2)
#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
#v(1.5em)
= CETAK BIRU REKAYASA ARSITEKTUR SISTEM
<cetak-biru-rekayasa-arsitektur-sistem>
== End-to-End AI Talent Acquisition & Screening Platform: Dari
Dekonstruksi Job Desc Hingga Perankingan Bukti
<end-to-end-ai-talent-acquisition-screening-platform-dari-dekonstruksi-job-desc-hingga-perankingan-bukti>
=== Taksonomi Arsitektural Komprehensif: Full Jev, Full Deterministik,
Full LLM, dan 4 Varian Sistem Hibrida
<taksonomi-arsitektural-komprehensif-full-jev-full-deterministik-full-llm-dan-4-varian-sistem-hibrida>

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 1. PENDAHULUAN & CAKUPAN END-TO-END
<pendahuluan-cakupan-end-to-end>
Cetak biru rekayasa ini memetakan arsitektur sistem seleksi bakat dan
penyaringan berkas (#emph[Talent Acquisition & Screening Platform])
secara menyeluruh dari hulu ke hilir. Sistem mengawal data mulai dari
#strong[masukan teks mentah deskripsi pekerjaan (#emph[Job
Description/JD]) oleh HR], dekonstruksi rubrik, parsing dan zonasi
berkas pelamar, verifikasi bukti berbasis karakter eksak, evaluasi
semantik kualifikasi, hingga penyusunan papan peringkat
(#emph[leaderboard ranking]) di antarmuka kerja rekruter.

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

Dokumen ini secara formal membedah #strong[tiga paradigma murni
(#emph[Pure Paradigms])] dan #strong[empat kombinasi hibrida
(#emph[Hybrid Variants])], menguraikan peran masing-masing teknologi di
tiap lapisan, serta menetapkan arsitektur standar produksi
(#emph[Production Baseline]).

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 2. DEKOMPOSISI ALUR END-TO-END (HULU KE HILIR)
<dekomposisi-alur-end-to-end-hulu-ke-hilir>
=== Tahap 1: Ingestion & Dekonstruksi Job Description (JD Ingestion)
<tahap-1-ingestion-dekonstruksi-job-description-jd-ingestion>
Menerima teks mentah lowongan (unstructured text / PDF draft) dari HR
dan mendekonstruksinya menjadi unit kualifikasi diskrit (#emph[Atomic
Requirements]): peran, tingkat senioritas, kualifikasi mutlak
(#emph[hard gate]), kompetensi teknis, dan tanggung jawab proyek.

=== Tahap 2: Penyusunan Rubrik & Penetapan Bobot (HR Approval Gate)
<tahap-2-penyusunan-rubrik-penetapan-bobot-hr-approval-gate>
HR memvalidasi hasil ekstraksi JD, menentukan kategori
(#emph[MUST\_HAVE], #emph[STRONG\_PREFERENCE], #emph[NICE\_TO\_HAVE]),
serta mengunci pembobotan persentase ($sum w_i eq 100 percent$) ke dalam
berkas kontrak data `requirement_set.json`.

=== Tahap 3: Ingestion & Zonasi Berkas Pelamar (Document Ingestion &
Zoning)
<tahap-3-ingestion-zonasi-berkas-pelamar-document-ingestion-zoning>
Menerima berkas pelamar dalam berbagai format (PDF digital, DOCX, maupun
#strong[CV hasil scan/desain grafis berbasis gambar/flattened image]).
Mesin parser membedah dokumen melalui strategi berlapis: \*
#strong[Digital PDF / DOCX]: Diekstrak menggunakan IBM Docling lokal
dengan rekonstruksi tata letak 2 kolom (#emph[Document Layout Analysis])
dan tabel. \* #strong[Scanned / Image-based CV (PDF Gambar / Flat
Scan)]: Sistem mengaktifkan #strong[Fallback OCR Engine Lokal]
(Tesseract OCR / PyMuPDF OCR dengan dukungan bahasa Indonesia `ind` dan
Inggris `eng`). Teks dari gambar diekstraksi ke karakter digital sebelum
dinormalisasi ke standar NFKC. \* #strong[Zonasi Semantik]: Halaman dan
blok teks dipartisi ke dalam zona: `ZONE_RESUME`, `ZONE_CERTIFICATE`,
dan `ZONE_AWARDS`. \* #strong[Prinsip Keadilan Sertifikat]: Sertifikat
dan dokumen penghargaan #strong[murni berstatus OPSIONAL (Jalur Default
Utama)]. Kompetensi diukur dari #strong[rekam jejak proyek nyata
(#emph[proven track record])], bukan ketebalan berkas. Pelamar dengan CV
teks ringkas 1 halaman berhak memperoleh nilai penuh (Band A / Top Rank)
tanpa harus melampirkan sertifikat apa pun. Berkas sertifikat (jika ada)
hanya berfungsi sebagai #emph[verifier] fisik sekunder tanpa
menggelembungkan skor kualifikasi.

=== Tahap 4: Normalisasi Teks & Anti-Halusinasi (Unicode NFKC Grounding)
<tahap-4-normalisasi-teks-anti-halusinasi-unicode-nfkc-grounding>
Seluruh teks dinormalisasi ke standar Unicode NFKC. Setiap kutipan bukti
yang diajukan wajib diverifikasi secara karakter eksak (#emph[exact
substring match]) terhadap naskah asli pelamar. Toleransi klaim tanpa
bukti: 0%.

=== Tahap 5: Evaluasi Semantik Kualifikasi (Matching & Evidence
Evaluation)
<tahap-5-evaluasi-semantik-kualifikasi-matching-evidence-evaluation>
Mencocokkan potongan bukti pengalaman kerja pelamar terhadap butir
kriteria pekerjaan yang disyaratkan untuk menilai pemenuhan syarat
mutlak, level pembuktian proyek nyata, dan kedalaman teknis.

=== Tahap 6: Kalkulasi Skor & Pemeringkatan (Aggregation & Leaderboard
Ranking)
<tahap-6-kalkulasi-skor-pemeringkatan-aggregation-leaderboard-ranking>
Mengagregasi hasil evaluasi kriteria ke dalam skor terbobot (0–100),
mengelompokkan kandidat ke dalam 4 #emph[Talent Bands] (`Band A`,
`Band B`, `Band C`, `Band R`), dan menyusun papan peringkat
(#emph[Leaderboard Top 3 / Top N]).

=== Tahap 7: Recruiter Cockpit UI (Human-in-the-Loop Decision Gate)
<tahap-7-recruiter-cockpit-ui-human-in-the-loop-decision-gate>
Menyajikan data ke rekruter melalui antarmuka modern taktil 3-tab
(#emph[Evaluasi Kriteria], #emph[Telemetri Keputusan], #emph[Kutipan
Teks Asli]) dan bilah keputusan (#emph[Decision Bar: Shortlist, Hold,
Reject]).

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 3. EMPAT PARADIGMA ARSITEKTUR SISTEM
<empat-paradigma-arsitektur-sistem>
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

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.1 Paradigma 1: Full Jev System One (Pure Semantic Decision
Architecture)
<paradigma-1-full-jev-system-one-pure-semantic-decision-architecture>
- #strong[Karakteristik]: Seluruh alur penalaran dan pencocokan
  dikerjakan murni melalui model keputusan semantik terstruktur
  (#emph[Decisions API] via `api.typesafe.ai`), tanpa generasi teks
  bebas dan tanpa aturan regex manual.
- #strong[Mekanisme Kerja]:
  - #emph[Dekonstruksi JD]: Teks JD dicocokkan ke taksonomi tertutup
    melalui primitif `Choice` dan `Noul`.
  - #emph[Evaluasi Bukti]: Menggunakan Trio Primitif: `Noul` (Hard Gate
    biner), `Choice` (Level bukti:
    `STRONG`/`PARTIAL`/`NOT_DEMONSTRATED`), dan `Score` (Kedalaman
    semantik kontinu $0.00 minus 1.00$).
  - #emph[Perankingan]: Dilakukan melalui perbandingan berpasangan
    (#emph[pairwise comparison]: $A$ vs $B$).
- #strong[Kelebihan]: Bebas halusinasi teks, luaran berupa distribusi
  probabilitas diskrit yang terukur, dan biaya token sangat hemat
  ($dollar 0.042$/1M token input, $dollar 0$ output).
- #strong[Kelemahan & Hambatan Ekstrem]:
  + #emph[Ledakan Komputasi Perankingan]: Perbandingan pasangan antar
    kandidat membutuhkan kompleksitas kuadratik $cal(O) lr((N^2))$.
    Untuk 100 kandidat dibutuhkan $4.950$ kali inferensi API, dan
    berisiko menghasilkan ketidakkonsistenan siklik (#emph[Condorcet
    Paradox]: $A gt B comma B gt C comma C gt A$).
  + #emph[Ketiadaan Parser Tata Letak]: Jev tidak memiliki engine
    parsing tata letak dokumen (OCR/layout parser), sehingga tidak bisa
    memproses PDF mentah tanpa perantara.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.2 Paradigma 2: Full Deterministik (Pure Code / Rule-Based / ATS
Klasik)
<paradigma-2-full-deterministik-pure-code-rule-based-ats-klasik>
- #strong[Karakteristik]: Sistem dibangun 100% menggunakan kode
  perangkat lunak konvensional (Python, PostgreSQL, Regex, AST parsing,
  BM25 / Full-Text Search). Nol ketergantungan pada model AI apa pun.
- #strong[Mekanisme Kerja]:
  - #emph[Dekonstruksi JD]: Parser berbasis kamus kata kunci
    (#emph[keyword lexicon]) dan #emph[named-entity recognition] lokal.
  - #emph[Evaluasi Bukti]: Pencarian kecocokan string persis
    (#emph[string matching] / keyword frequency) antara teks kriteria
    dan teks CV.
  - #emph[Perankingan]: Penjumlahan skor frekuensi kata kunci (TF-IDF /
    BM25) dikalikan bobot statis di SQL/Python.
- #strong[Kelebihan]: Latensi instan ($lt 10$ ms), biaya API
  $dollar 0.00$, komputasi 100% lokal, dan hasil run selalu identik
  secara mutlak (#emph[exact reproducibility]).
- #strong[Kelemahan & Hambatan Ekstrem]:
  + #emph[Kebutaan Semantik (]Semantic Blindness\*)\*\*: Gagal total
    memahami sinonim atau konteks padanan (misal: gagal mengenali bahwa
    `"membangun arsitektur perbankan dengan FastAPI"` setara dengan
    kualifikasi `"REST API Backend Engineer"`).
  + #emph[Rentan Keyword Stuffing]: Kandidat yang menyisipkan daftar
    ratusan kata kunci acak di CV akan mendapat skor tertinggi meskipun
    tidak memiliki pengalaman kerja nyata.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.3 Paradigma 3: Full Bukan Jev / Full LLM (Pure Generative
Prompting)
<paradigma-3-full-bukan-jev-full-llm-pure-generative-prompting>
- #strong[Karakteristik]: Seluruh siklus diserahkan kepada Large
  Language Model generatif percakapan (#emph[autoregressive LLM] seperti
  GPT-4o, Claude 3.5, Llama-3) menggunakan prompt bahasa alami bebas.
- #strong[Mekanisme Kerja]:
  - #emph[Dekonstruksi JD]: Prompt generatif meminta LLM mengubah teks
    JD menjadi skema JSON kriteria.
  - #emph[Evaluasi Bukti]: Prompt memasukkan teks CV dan meminta LLM
    menuliskan paragraf analisis kecocokan serta mengutip kalimat bukti.
  - #emph[Perankingan]: Memasukkan 10–20 CV sekaligus ke dalam prompt
    konteks besar (#emph[listwise ranking prompt]): #emph["Urutkan
    kandidat dari peringkat 1 sampai 10"].
- #strong[Kelebihan]: Sangat luwes, mampu menghasilkan narasi penjelasan
  yang terdengar cerdas dan manusiawi, serta mudah diprogram di awal
  (hanya memanggil endpoint chat).
- #strong[Kelemahan & Hambatan Ekstrem]:
  + #emph[Halusinasi Kutipan (]Fabricated Evidence\*)\*\*: LLM generatif
    sering memparafrasekan teks atau mengarang bukti pengalaman yang
    sebenarnya tidak tertulis di CV pelamar.
  + #emph[Cacat Bias Posisi (]Lost in the Middle / Primacy-Recency
    Bias\*)\*\*: Pada listwise ranking, kandidat yang berada di awal
    atau akhir konteks prompt secara statistik selalu mendapat skor
    lebih tinggi dibanding kandidat di tengah.
  + #emph[Biaya Operasional Ekstrem]: Menelan 8.000–15.000 token per
    kandidat; biaya penyaringan 1.000 CV berkisar
    $dollar 15 minus dollar 40$ dengan waktu inferensi lambat (10–25
    detik per CV).

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

== 3.4 Paradigma 4: Sistem Hibrida (Hybrid Multi-Paradigm Architectures)
<paradigma-4-sistem-hibrida-hybrid-multi-paradigm-architectures>
Sistem hibrida menggabungkan kekuatan masing-masing paradigma untuk
meniadakan kelemahan ekstrem di atas. Terdapat 4 varian kombinasi
arsitektural:

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

=== Varian 4.1: Jev × Deterministik (Standar Rekomendasi Produksi)
<varian-4.1-jev-deterministik-standar-rekomendasi-produksi>
- #strong[Distribusi Peran]:
  - #strong[Jev System One]: Bertindak eksklusif sebagai #emph[hakim
    semantik kualifikasi $cal(O) lr((N))$] (mengevaluasi `Noul` untuk
    hard gate, `Choice` untuk level bukti, dan `Score` untuk kedalaman
    teknis).
  - #strong[Deterministik (Python/PostgreSQL/Docling)]: Menangani
    parsing tata letak dokumen (Docling), zonasi lampiran, validasi
    integritas kutipan karakter eksak (NFKC), perhitungan skor matematis
    berbobot, dan penyusunan papan peringkat (#emph[leaderboard]).
- #strong[Kelebihan]: Menghilangkan komputasi kuadratik
  $cal(O) lr((N^2))$ Jev, menutup celah halusinasi teks 100%,
  menghasilkan ranking matematis yang adil dan dapat diaudit secara
  hukum, serta menjaga biaya operasional pada level terendah
  ($dollar 0.025$ per 1.000 CV).

=== Varian 4.2: Jev × Generative AI
<varian-4.2-jev-generative-ai>
- #strong[Distribusi Peran]:
  - #strong[Jev System One]: Mengevaluasi keputusan kecocokan
    kualifikasi dan memberi label status bukti (`STRONG`/`PARTIAL`).
  - #strong[Generative AI]: Menerima status keputusan dari Jev dan teks
    kutipan CV asli, lalu bertugas menyusun draf panduan pertanyaan
    wawancara (#emph[interview question sheet]) dan rangkuman profil
    eksekutif untuk HR.
- #strong[Kelebihan]: Memberikan kenyamanan narasi bagi HR tanpa
  membiarkan Generative AI menyentuh penilaian skor (skor tetap objektif
  dari Jev).
- #strong[Catatan]: Membutuhkan sedikit tambahan biaya token untuk modul
  penyusunan narasi hilir.

=== Varian 4.3: Generative AI × Deterministik
<varian-4.3-generative-ai-deterministik>
- #strong[Distribusi Peran]:
  - #strong[Generative AI]: Mengekstrak teks JD mentah menjadi kriteria
    JSON serta membaca variasi istilah pengalaman kerja di CV.
  - #strong[Deterministik]: Memverifikasi kutipan kalimat LLM dengan
    naskah asli CV (NFKC exact match), menghitung agregasi skor di
    Python, dan menyusun ranking secara matematis.
- #strong[Kelebihan]: Fleksibilitas tinggi dalam membaca teks JD/CV yang
  formatnya sangat rusak, dengan jaminan bahwa LLM dilarang melakukan
  perankingan bebas.
- #strong[Catatan]: Masih menyisakan biaya token input/output yang cukup
  tinggi pada tahap inferensi kualifikasi.

=== Varian 4.4: Jev × Generative AI × Deterministik (Orkestrasi Penuh
3-Lapis)
<varian-4.4-jev-generative-ai-deterministik-orkestrasi-penuh-3-lapis>
- #strong[Distribusi Peran]:
  + #emph[Tahap Hulu (JD Ingestion)]: Generative AI membantu menyusun
    draf kriteria terstruktur dari teks JD mentah $arrow.r$ dikunci oleh
    persetujuan HR.
  + #emph[Tahap Tengah (Parsing & Grounding)]: Mesin Deterministik
    (Docling + NFKC verifier) memproses dokumen pelamar dan mengunci
    keabsahan kutipan teks asli.
  + #emph[Tahap Inti (Evaluasi Bukti)]: Jev System One mengevaluasi
    kualifikasi semantik secara independen $cal(O) lr((N))$ dengan tarif
    input termurah.
  + #emph[Tahap Hilir (Ranking & Dossier)]: Mesin Deterministik
    menghitung skor akhir dan menyusun leaderboard, lalu Generative AI
    memformat lembar dossier dan pertanyaan wawancara pelamar.
- #strong[Kelebihan]: Arsitektur paling komprehensif untuk skala
  enterprise yang membutuhkan otomatisasi penuh sekaligus kepatuhan
  audit regulasi ketat.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 4. TABEL MATRIKS PERBANDINGAN KOMPREHENSIF PER KOMPONEN
<tabel-matriks-perbandingan-komprehensif-per-komponen>
Tabel berikut menyajikan perbandingan komparatif per modul arsitektur:

#align(center)[#table(
  columns: 5,
  align: (col, row) => (left,left,left,left,left,).at(col),
  inset: 6pt,
  [Modul / Komponen Sistem], [1. Full Jev System One], [2. Full
  Deterministik], [3. Full Bukan Jev (Full LLM)], [4. Sistem Hibrida
  (Jev × Deterministik)],
  [#strong[1. Ingestion & Dekonstruksi JD]],
  [Pemetaan via Noul/Choice ke taksonomi baku. #emph[(Akurat, tapi
  kaku)]],
  [Regex & kamus kata kunci baku. #emph[(Sangat rapuh terhadap istilah
  baru)]],
  [Ekstraksi bebas via prompt LLM. #emph[(Fleksibel, tapi format rentan
  meleset)]],
  [#strong[Parser Berbasis Skema + Human Approval Gate HR]
  #emph[(Terkontrol & adaptif)]],
  [#strong[2. Parsing Dokumen & Zonasi Lampiran]],
  [Hanya membaca teks polos; butuh pra-pemrosesan luar.],
  [Parser teks dasar (pypdf/pdfminer). #emph[(Gagal pada layout 2 kolom
  & gagal total pada scan gambar)]],
  [Multimodal Vision API per lembar PDF. #emph[(Sangat mahal & latensi
  tinggi: 10 dtk/CV)]],
  [#strong[IBM Docling + Fallback OCR Lokal (Tesseract `ind`+`eng`)]
  #emph[(Layout-aware, otomatis OCR jika PDF gambar/scan, 100% lokal,
  \$0)]],
  [#strong[3. Grounding & Anti-Halusinasi Teks]],
  [Evaluasi probabilitas klaim semantik tanpa teks bebas.],
  [Pencocokan string kata kunci persis (#emph[exact keyword
  matching]).],
  [Model diminta mengutip dan menjelaskan kalimat. #emph[(Rawan bukti
  palsu)]],
  [#strong[Unicode NFKC Exact Substring Matcher] #emph[(Jaminan 100%
  kutipan asli, toleransi halusinasi 0%)]],
  [#strong[4. Evaluasi Semantik Kualifikasi]],
  [Trio Primitif: `Noul`, `Choice`, dan `Score`.],
  [Pencocokan frekuensi istilah kata kunci (TF-IDF/BM25).],
  [Penalaran teks bebas prompt panjang. #emph[(Rawan manipulasi prompt
  injection)]],
  [#strong[Evaluasi Semantik Murni TypeSafe Jev (`api.typesafe.ai`)]
  #emph[(Objektif, cepat \<150 ms, hemat \$0.042/1M)]],
  [#strong[5. Perhitungan Skor & Leaderboard]],
  [Pairwise ranking antar pasangan kandidat $cal(O) lr((N^2))$.
  #emph[(Tidak terukur)]],
  [Penjumlahan bobot kata kunci statis di SQL/Python.],
  [Listwise ranking di dalam prompt generatif. #emph[(Cacat bias posisi
  & acak)]],
  [#strong[Scorer Deterministik Python (Bobot HR + Tie-Breaker)]
  #emph[(Adil, matematis konsisten, patuh audit)]],
  [#strong[6. Penanganan Sertifikat & Dokumen Pendukung]],
  [Evaluasi biner ada/tidaknya dokumen di teks.],
  [Pencarian kata kunci nama sertifikat di seluruh file.],
  [Membaca semua lembar sertifikat tanpa verifikasi relevansi; rawan
  bias ketebalan berkas.],
  [#strong[Jalur Default Murni (#emph[Default Practical Track])]:
  Sertifikat dan penghargaan #strong[murni berstatus opsional]. Skor
  100% didasarkan pada kedalaman bukti proyek nyata di CV; CV 1 lembar
  memiliki hak setara penuh meraih Top 1 (Band A).],
  [#strong[7. Antarmuka Rekruter Cockpit]],
  [Hanya menyajikan data mentah probabilitas numerik.],
  [Tabel grid konvensional berisi skor persentase kata kunci.],
  [Teks narasi panjang generatif yang sering bertele-tele.],
  [#strong[Recruiter Cockpit 3-Tab Taktil + Bilah Keputusan HR]
  #emph[(Ergonomi anti-slop, Human-in-the-Loop)]],
)
]

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 5. FORMULASI AGREGASI SKOR & TIE-BREAKER DETERMINISTIK (VARIAN 4.1)
<formulasi-agregasi-skor-tie-breaker-deterministik-varian-4.1>
Pada varian hibrida standar produksi (Jev $times$ Deterministik), proses
perankingan diturunkan secara formal untuk menjamin transparansi
matematis:

=== 1. Uji Syarat Mutlak / Hard Gate ($Gamma$)
<uji-syarat-mutlak-hard-gate-gamma>
$ Gamma eq product_(k in cal(K)_(upright("must"))) bb(I) lr((P_(upright("noul")) lr((k)) gt.eq tau_k)) $
Kandidat yang tidak memenuhi salah satu syarat mutlak ($Gamma eq 0$)
langsung dialokasikan ke #strong[Band R (Rejected)] dengan status tidak
memenuhi kualifikasi dasar.

=== 2. Skor Pembuktian Terbobot ($S_(upright("evidence"))$)
<skor-pembuktian-terbobot-s_textevidence>
Untuk kandidat yang lolos syarat mutlak ($Gamma eq 1$), skor pembuktian
dihitung berdasarkan bobot kriteria yang disetujui HR:
$ S_(upright("evidence")) eq sum_(j in cal(K)_(upright("eval"))) w_j dot.op v lr((upright("Choice")_j)) $
Dimana: \* $w_j$ adalah persentase bobot kriteria ke-$j$ dengan
$sum w_j eq 100$. \* $v lr((upright("Choice")_j))$ adalah fungsi
konversi diskrit:
$ v lr((upright("Choice")_j)) eq cases(delim: "{", 1.0 & upright("jika ") upright("STRONG"), 0.5 & upright("jika ") upright("PARTIAL"), 0.0 & upright("jika ") upright("NOT_DEMONSTRATED")) $

=== 3. Tie-Breaker Kedalaman Semantik Kontinu ($S_(upright("depth"))$)
<tie-breaker-kedalaman-semantik-kontinu-s_textdepth>
Untuk membedakan kandidat yang memiliki level bukti identik:
$ S_(upright("final")) eq S_(upright("evidence")) plus alpha dot.op lr((1 / lr(|cal(K)_(upright("eval"))|) sum_(j in cal(K)_(upright("eval"))) upright("Score")_j)) $
Faktor skala $alpha eq 0.05$ (bobot 5%), sehingga nilai kedalaman
semantik kontinu dari Jev ($0.00 minus 1.00$) menjadi pembeda desimal
objektif tanpa mengaburkan penilaian kriteria utama HR.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 6. PERBANDINGAN EKONOMI SISTEM & FOOTPRINT INFRASTRUKTUR
<perbandingan-ekonomi-sistem-footprint-infrastruktur>
#align(center)[#table(
  columns: 4,
  align: (col, row) => (left,center,center,center,).at(col),
  inset: 6pt,
  [Parameter Evaluasi], [Full Generative LLM], [Full Deterministik],
  [Hibrida: Jev × Deterministik],
  [#strong[Tarif Token Input]],
  [\$1.00 – \$3.00 / 1M token],
  [\$0.00 (Tanpa Model)],
  [#strong[\$0.042 / 1M token]],
  [#strong[Tarif Token Output]],
  [\$2.00 – \$10.00 / 1M token],
  [\$0.00 (Tanpa Model)],
  [#strong[\$0.00 (Bebas Biaya Output)]],
  [#strong[Konsumsi Token / CV]],
  [6.000 – 12.000 token],
  [0 token],
  [#strong[$approx 600 minus 1.000$ token]],
  [#strong[Biaya Screening 1.000 CV]],
  [\$15.00 – \$40.00],
  [\$0.00],
  [#strong[\$0.025 – \$0.040]],
  [#strong[Daya Tampung Anggaran \$5]],
  [300 – 800 CV],
  [Tak Terhingga],
  [#strong[150.000 – 200.000 CV]],
  [#strong[Latensi per Kandidat]],
  [10 – 25 detik],
  [\< 50 ms],
  [#strong[1.2 – 2.0 detik]],
  [#strong[Ketahanan Halusinasi]],
  [Rendah (Rawan karangan fiktif)],
  [Sempurna (100% kaku)],
  [#strong[Sempurna (Exact NFKC Match)]],
  [#strong[Pemahaman Semantik]],
  [Sangat Baik (Tapi rentan bias)],
  [Nol (Hanya string matching)],
  [#strong[Tinggi (Model Keputusan Diskrit)]],
)
]

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 7. KESIMPULAN ARSITEKTUR
<kesimpulan-arsitektur>
+ #strong[Dekonstruksi Holistik Hulu ke Hilir]: Sistem menyatukan alur
  mulai dari masukan teks mentah Job Description oleh HR, penerbitan
  kontrak kriteria terbobot, hingga penyaringan berkas berkeadilan.
+ #strong[Kelemahan Paradigma Murni]:
  - #emph[Full Jev] terkendala kompleksitas kuadratik $cal(O) lr((N^2))$
    pada perankingan dan butuh parser eksternal.
  - #emph[Full Deterministik] buta makna semantik dan mudah dimanipulasi
    kata kunci palsu.
  - #emph[Full Generative LLM] cacat bias posisi (#emph[Lost in the
    Middle]), rawan halusinasi kutipan, dan boros anggaran.
+ #strong[Keunggulan Standar Produksi (Jev $times$ Deterministik)]:
  - Jev System One menjalankan fungsi terkuatnya sebagai #strong[juri
    semantik objektif $cal(O) lr((N))$] bebas halusinasi dengan biaya
    termurah.
  - Mesin deterministik lokal (IBM Docling, Unicode NFKC Matcher, dan
    Scorer Python) mengamankan integritas pembacaan tata letak dokumen,
    validasi kutipan eksak, serta penghitungan papan peringkat matematis
    yang adil dan dapat diaudit.
+ #strong[Prinsip Keadilan Dokumen Pelamar (#emph[Document Fairness
  Doctrine])]:
  - Sistem beroperasi pada #strong[Jalur Default Murni (#emph[Default
    Practical Track])]: sertifikat, lisensi pelatihan, dan piagam
    penghargaan berstatus #strong[100% opsional].
  - Kompetensi dinilai murni dari rekam jejak penyelesaian masalah dan
    kedalaman proyek nyata. Pelamar dengan CV teks ringkas 1 lembar
    memiliki hak dan peluang setara mutlak untuk menempati peringkat
    teratas (Top 1 / Band A) tanpa terancam tergeser oleh bundel berkas
    tebal. Lampiran berkas fisik semata-mata menjadi catatan pembantu di
    dashboard rekruter.
