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
= PROPOSAL ARSITEKTUR & REKAYASA SISTEM
<proposal-arsitektur-rekayasa-sistem>
== AI CV Screening & Ranking Berbasis Bukti (Evidence-Grounded System)
<ai-cv-screening-ranking-berbasis-bukti-evidence-grounded-system>
=== Evaluasi Semantik Terstruktur TypeSafe Jev System One & Agregasi
Deterministik
<evaluasi-semantik-terstruktur-typesafe-jev-system-one-agregasi-deterministik>

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)
<ringkasan-eksekutif-executive-summary>
== 1.1 Latar Belakang & Masalah Utama
<latar-belakang-masalah-utama>
Proses seleksi resume (CV) pada volume tinggi menghadapi dua dilema
ekstrem dalam praktik industri dan rekayasa kecerdasan buatan: 1.
#strong[Pendekatan Keyword Matching Tradisional (Sintaktik / ATS
Klasik)]: Sangat kaku, mudah dimanipulasi dengan #emph[keyword
stuffing], dan gagal memahami konteks semantik pekerjaan. 2.
#strong[Pendekatan Generatif LLM Penuh (#emph[Unconstrained Generative
Prompting])]: Rentan halusinasi, menghasilkan luaran acak
(#emph[non-deterministic]), tidak dapat diaudit (#emph[black box]), dan
membutuhkan biaya token yang sangat tinggi pada volume ratusan ribu
dokumen.

Lebih jauh, temuan bimbingan lapangan mengidentifikasi kelemahan krusial
pada sistem pencocokan semantik standar (seperti kombinasi naive
embedding cosine similarity dan pgvector): \* Vektor embedding sering
gagal menangkap kedalaman kualifikasi kandidat (misal: membedakan
arsitek sistem terdistribusi vs #emph[maintenance engineer] biasa). \*
Rekruter di lapangan #strong[tidak cukup hanya diberikan jawaban biner
(Yes/No)]. Mereka membutuhkan rekomendasi berupa #strong[daftar
peringkat kandidat (#emph[ranking])] yang transparan, adil, dan berdasar
bukti nyata (#emph[evidence-grounded]).

== 1.2 Pernyataan Solusi: Evidence-Grounded AI Screening
<pernyataan-solusi-evidence-grounded-ai-screening>
Sistem ini dibangun untuk menghadirkan platform penyaringan CV hibrida
(#emph[hybrid semantic-deterministic system]) dengan prinsip kerja: \*
#strong[Evaluasi Semantik Terstruktur]: Menggunakan model keputusan
terstruktur murni (#emph[System One Model] via API resmi TypeSafe Jev /
`api.typesafe.ai`) untuk menguji klaim kualifikasi terhadap teks dokumen
asli tanpa generasi teks bebas. \* #strong[Perankingan Deterministik di
Sisi Mesin Lokal]: Penentuan skor akhir (0–100) dan #emph[leaderboard
ranking] dihitung secara matematis menggunakan rumus terukur di backend
Python lokal, bukan diserahkan kepada tebakan LLM. \* #strong[Verifikasi
Teks Unicode NFKC]: Menjamin setiap bukti yang dijadikan dasar penilaian
adalah kutipan eksak (#emph[exact substring]) dari berkas pelamar.
Halusinasi bernilai 0%. \* #strong[Auditability & Recruiter Cockpit]:
Antarmuka taktil anti-slop yang memberikan kendali akhir kepada rekruter
manusia (#emph[Human-in-the-Loop]).

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

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 2. BATASAN SISTEM & KEPUTUSAN ARSITEKTUR
<batasan-sistem-keputusan-arsitektur>
Berdasarkan kesepakatan dan hasil evaluasi bimbingan, sistem ini
menetapkan batasan arsitektur yang sangat tegas:

== 2.1 Eliminasi Obsidian / Unstructured Memory
<eliminasi-obsidian-unstructured-memory>
- #strong[Keputusan]: Tidak menggunakan Obsidian atau #emph[external
  graph memory] personal sebagai basis data agen.
- #strong[Rasional]: Data rekrutmen bersifat entitas domain terstruktur
  (#emph[Candidate, Job Requirement, Work Experience, Metric Impact]).
  Semua state disimpan langsung pada basis data relasional PostgreSQL
  dengan schema terindeks, sehingga latensi rendah, deterministik, dan
  dapat di-query secara instan.

== 2.2 Larangan OpenRouter & Mock Lokal: Wajib Pure TypeSafe SDK
<larangan-openrouter-mock-lokal-wajib-pure-typesafe-sdk>
- #strong[Keputusan]: Mengakses model Jev secara langsung melalui client
  resmi `AsyncTypeSafeClient` (`api.typesafe.ai`), dilarang menggunakan
  gateway perantara pihak ketiga (OpenRouter) maupun model tiruan lokal.
- #strong[Rasional]: Jev System One mengadopsi protokol #emph[Decisions
  API] (`/v1/alpha/decisions`) yang mengembalikan distribusi
  probabilitas diskrit, bukan endpoint percakapan generatif
  (`/v1/chat/completions`).

== 2.3 Matriks Tanggung Jawab: Kode Deterministik vs AI Semantik
<matriks-tanggung-jawab-kode-deterministik-vs-ai-semantik>
#align(center)[#table(
  columns: 3,
  align: (col, row) => (left,center,left,).at(col),
  inset: 6pt,
  [Komponen / Tugas], [Eksekutor], [Mengapa Bukan Komponen Lain?],
  [#strong[Ekstraksi Tata Letak Dokumen]],
  [IBM Docling (Engine Lokal)],
  [Cepat, mempertahankan hierarki heading dan tabel dua kolom tanpa
  biaya token.],
  [#strong[Verifikasi Integritas Kutipan]],
  [Python Regex & Unicode NFKC],
  [Memastikan kutipan bukti benar-benar ada di naskah asli (toleransi
  kesalahan 0%).],
  [#strong[Pencocokan Bukti Kualifikasi]],
  [TypeSafe Jev System One],
  [Mengidentifikasi kedalaman semantik dan relevansi proyek tanpa risiko
  teks halusinasi.],
  [#strong[Kalkulasi Skor & Penentuan Ranking]],
  [Algoritma Python Lokal],
  [Matematika transparan, konsisten, tidak bergeser antar pemanggilan,
  dan terhindar dari bias LLM.],
  [#strong[Keputusan Final Rekrutmen]],
  [Rekruter HR (#emph[Human-in-the-Loop])],
  [Memenuhi regulasi etika AI (UU PDP & PP 33/2026), AI hanya memberi
  rekomendasi.],
)
]

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 3. MENJAWAB DILEMA: DARI KEPUTUSAN BINER KE PERANKINGAN DETERMINISTIK
<menjawab-dilema-dari-keputusan-biner-ke-perankingan-deterministik>
Pertanyaan mendasar dalam perancangan sistem: #emph[Jika model Jev
berakar pada model keputusan, bagaimana menghasilkan ranking kualitas
kandidat yang adil bagi HR?]

== 3.1 Trio Primitif Evaluasi Jev System One
<trio-primitif-evaluasi-jev-system-one>
Sistem tidak memperlakukan evaluasi sebagai sekadar #emph[Yes/No] biner.
Jev mengadopsi tiga lapisan keputusan:

+ #strong[`Noul` (Hard Gate / Kualifikasi Mutlak)]:
  - Menguji syarat mati (misal: "Pendidikan minimal S1 Teknik" atau
    "Pengalaman minimal 3 tahun").
  - Luaran: Probabilitas keyakinan $lr([0.0 comma 1.0])$. Jika ambang
    batas tidak terpenuhi, kandidat masuk ke kelompok `Band R (Reject)`
    untuk ditinjau manual.
+ #strong[`Choice` (Tingkat Pembuktian / Level of Evidence)]:
  - Mengklasifikasikan bukti ke dalam set tertutup (#emph[closed-set
    evaluation]):
    - `STRONG`: Menunjukkan kepemilikan proyek skala besar
      (#emph[production scale]), tanggung jawab arsitektural, atau
      metrik dampak yang jelas.
    - `PARTIAL`: Pernah menggunakan teknologi tersebut namun dalam
      kapasitas terbatas, magang, atau tugas akademis.
    - `NOT_DEMONSTRATED`: Hanya mencantumkan nama teknologi sebagai
      #emph[buzzword] tanpa konteks proyek nyata.
+ #strong[`Score` (Kedalaman Semantik / Tie-Breaker)]:
  - Menghasilkan nilai skalar kontinu $lr([0.00 comma 1.00])$ yang
    merepresentasikan tingkat kematangan implementasi teknis. Digunakan
    sebagai pembeda utama ketika dua kandidat memiliki status `Choice`
    yang sama.

```
                    ┌── NOUL   : Lolos Syarat Mutlak? (Yes / No)
                    │
Kandidat ── Evaluasi ┼── CHOICE : Tingkat Bukti (STRONG / PARTIAL / NOT_DEMONSTRATED)
                    │
                    └── SCORE  : Skor Kedalaman Semantik (0.00 - 1.00)
```

== 3.2 Algoritma Agregasi & Perankingan di Python
<algoritma-agregasi-perankingan-di-python>
AI dilarang mengurutkan daftar kandidat secara bebas di dalam prompt.
Pengurutan dilakukan oleh mesin lokal menggunakan formula matematis:

$ upright("Fit Score") eq sum_(i eq 1)^M lr((w_i times S_(upright("choice")) lr((C_i)))) plus lambda dot.op S_(upright("depth")) $

Keterangan: \* $w_i$: Bobot kriteria lowongan yang ditentukan oleh HR
(total bobot \= 100). \* $S_(upright("choice")) lr((C_i))$: Konversi
nilai bukti (`STRONG` \= 1.0, `PARTIAL` \= 0.5, `NOT_DEMONSTRATED` \=
0.0). \* $lambda$: Faktor pembobot kedalaman semantik (default: 5% dari
total skor). \* $S_(upright("depth"))$: Rata-rata nilai kontinu dari
primitif `Score` Jev.

== 3.3 Penetapan Band Kelayakan & Peringkat (Leaderboard)
<penetapan-band-kelayakan-peringkat-leaderboard>
Hasil kalkulasi skor memetakan kandidat ke dalam 4 #emph[Talent Bands]:
\* #strong[Band A (Top Candidates / Skor 85–100)]: Memenuhi seluruh
syarat mutlak dengan mayoritas bukti `STRONG`. Masuk ke antrean
wawancara prioritas. \* #strong[Band B (Potential Fits / Skor 70–84)]:
Memenuhi syarat mutlak dengan kombinasi bukti `STRONG` dan `PARTIAL`. \*
#strong[Band C (Under Review / Skor 50–69)]: Sebagian bukti belum
memadai atau pengalaman masih dangkal. \* #strong[Band R (Rejected /
Skor \< 50 atau Gagal Noul)]: Tidak memenuhi syarat mutlak lowongan.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 4. PRINSIP KEADILAN: BUNDEL SERTIFIKAT VS CV TEKS EGALITER
<prinsip-keadilan-bundel-sertifikat-vs-cv-teks-egaliter>
Bagaimana sistem memperlakukan pelamar yang melampirkan bundel
ijazah/sertifikat 10 halaman dibandingkan pelamar yang hanya mengirimkan
CV 1 lembar?

```
Pelamar X (CV + 5 Sertifikat) ──┐
                                ├── Zonasi & Evaluasi Bukti ──► Penilaian Adil (Kompentensi > Lembaran)
Pelamar Y (CV Padat 1 Lembar) ──┘
```

Sistem menerapkan #strong[4 Kaidah Keadilan Algoritmik
(#emph[Algorithmic Fairness])]: 1. #strong[Zonasi Layout Dokumen
(Docling)]: Sistem memecah dokumen menjadi beberapa zona: `ZONE_RESUME`,
`ZONE_CERTIFICATE`, dan `ZONE_AWARDS`. Sistem tidak menghitung ketebalan
dokumen secara kumulatif. 2. #strong[Kesesuaian Terhadap Syarat
Lowongan]: \* Jika lowongan bersifat #emph[Verifiable License] (misal:
Dokter, Akuntan Publik, Lisensi Pilot), bukti sertifikat fisik di
`ZONE_CERTIFICATE` adalah syarat wajib. \* Jika lowongan bersifat
#emph[Practical Engineering] (misal: Backend Developer), pengalaman riil
membangun arsitektur di `ZONE_RESUME` memiliki bobot penilaian yang jauh
lebih tinggi daripada sekadar sertifikat kelulusan kursus online. 3.
#strong[Pemisahan Skor Kompetensi vs Indikator Verifikasi]: \* Pelamar Y
(hanya CV 1 halaman) #strong[bisa meraih peringkat 1 (Band A)] jika
pengalaman praktisnya sangat kuat. \* Lampiran sertifikat pada Pelamar X
tidak menambah poin curang, melainkan hanya menyalakan tanda status
`EVIDENCE: CERTIFICATE_ATTACHED`. Pelamar Y tetap diberi status
`EVIDENCE: PENDING_INTERVIEW_VERIFICATION`. 4. #strong[Mencegah
Kredensialisme Murah (#emph[Anti-Credential Inflation])]: Sistem
mengevaluasi dampak nyata proyek, bukan kuantitas kertas kursus 2 jam.

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 5. ARSITEKTUR PIPELINE & TAHAPAN KERJA
<arsitektur-pipeline-tahapan-kerja>
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

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 6. EFISIENSI TOKEN & BIAYA INFRASTRUKTUR
<efisiensi-token-biaya-infrastruktur>
Salah satu keunggulan utama arsitektur ini adalah efisiensi operasional
yang sangat ekstrem jika dibandingkan dengan pendekatan LLM generatif
penuh:

#align(center)[#table(
  columns: 4,
  align: (col, row) => (left,center,center,center,).at(col),
  inset: 6pt,
  [Parameter Evaluasi], [Full Generative LLM (Chat API)], [TypeSafe Jev
  System One], [Efisiensi & Keunggulan],
  [#strong[Model Biaya Input]],
  [~\$1.00 – \$3.00 / 1M token],
  [\$0.042 / 1M token],
  [#strong[95–98% Lebih Hemat Biaya]],
  [#strong[Biaya Output (Generasi)]],
  [~\$2.00 – \$10.00 / 1M token],
  [\$0.00 (Tanpa Biaya Output)],
  [#strong[Biaya Generasi Nol]],
  [#strong[Konsumsi Token / CV]],
  [~5,000 – 12,000 token],
  [~600 – 1,000 token],
  [Mengurangi beban bandwidth],
  [#strong[Kapasitas Skala (\$5)]],
  [~300 – 800 CV],
  [#strong[150,000 – 200,000 CV]],
  [Skalabilitas skala korporasi],
  [#strong[Determinisasi Output]],
  [Stokastik (Bisa berubah)],
  [Deterministik (Probabilitas diskrit)],
  [Auditabilitas hukum terjamin],
  [#strong[Risiko Halusinasi Teks]],
  [Tinggi (Mengarang pengalaman)],
  [#strong[0%] (Exact substring match)],
  [Integritas data mutlak],
)
]

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 7. SPESIFIKASI ANTARMUKA PENGGUNA (RECRUITER COCKPIT)
<spesifikasi-antarmuka-pengguna-recruiter-cockpit>
Antarmuka dibangun dengan standar ergonomi taktil anti-slop,
mengutamakan kecepatan membaca data tanpa elemen dekoratif yang mubazir:
\* #strong[Tiga Tab Inspeksi Seimbang]: 1. #strong[Tab Evaluasi]:
Rincian kriteria penilaian, bobot, status pembuktian (`STRONG` /
`PARTIAL`), dan catatan analisis semantik. 2. #strong[Tab Telemetri]:
Rekam jejak waktu komputasi, model confidence, dan catatan jejak
reasoning. 3. #strong[Tab Kutipan CV]: Penampil teks asli dokumen
kandidat yang disorot (#emph[highlight]) secara interaktif, membuktikan
bahwa alasan penilaian berakar langsung pada kalimat asli pelamar. \*
#strong[Segmented Decision Bar]: Memberikan kontrol cepat bagi rekruter
untuk menetapkan status seleksi (#emph[Shortlist], #emph[Hold],
#emph[Reject], #emph[Wawancara]).

#line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

= 8. KESIMPULAN & TAHAP EKSEKUSI BERIKUTNYA
<kesimpulan-tahap-eksekusi-berikutnya>
Pendekatan rekayasa sistem yang diusulkan berhasil menjembatani
kebutuhan bisnis rekrutmen: 1. Menghadirkan #strong[kecepatan dan
kecerdasan semantik] melalui TypeSafe Jev System One tanpa risiko
halusinasi. 2. Menghasilkan #strong[rekomendasi peringkat
(#emph[ranking]) yang transparan dan dapat dijelaskan secara matematis],
bukan sekadar biner Yes/No. 3. Menjamin #strong[keadilan evaluasi
dokumen], baik bagi pelamar berbundel sertifikat maupun pelamar dengan
CV ringkas. 4. Memberikan #strong[efisiensi biaya operasional masif],
memungkinkan pemrosesan ratusan ribu CV dengan biaya minimal.

=== Tahap Tindak Lanjut:
<tahap-tindak-lanjut>
- Mengintegrasikan API key resmi TypeSafe pada modul
  `src/domain/verifier.py`.
- Melakukan benchmark komparatif (akurasi ranking dan latensi) antara
  model dasar vs Jev System One.
- Melakukan uji coba golden dataset pada skenario CV nyata
  multi-halaman.
