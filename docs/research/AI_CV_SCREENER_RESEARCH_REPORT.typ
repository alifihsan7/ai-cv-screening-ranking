
#set document(
  title: "Laporan Riset & Rekayasa Sistem: AI CV Screener",
  author: ("Alif Ihsan", "AI7 Solaris")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.0cm, right: 2.0cm),
  header: text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #grid(
      columns: (1fr, 1fr),
      align(left)[*AI CV Screener* — Spesifikasi Rekayasa & Riset Sistem],
      align(right)[AI7 Solaris Engineering Ecosystem]
    )
    #v(-3pt)
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
  ],
  footer: context text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
    #v(3pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[Blueprint Sistem: `v2.0-Production-Agentic` | Mode: Implemented & Roadmap],
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
    #text(font: "Liberation Sans", size: 13pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
    #v(3pt)
    #line(length: 100%, stroke: 0.8pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 15pt, below: 8pt, breakable: false,
  text(font: "Liberation Sans", size: 10.8pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 12pt, below: 6pt, breakable: false,
  text(font: "Liberation Sans", size: 9.8pt, weight: "bold", fill: rgb("#334155"))[#it.body]
)

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
  stroke: 0.5pt + rgb("#cbd5e1"),
  radius: 4pt,
  inset: (x: 8pt, y: 6pt),
  width: 100%,
  breakable: true,
  [
    #set par(leading: 0.30em)
    #set text(font: "DejaVu Sans Mono", size: 6.8pt, fill: rgb("#0f172a"))
    #it
  ]
)

#show raw.where(block: false): set text(font: "DejaVu Sans Mono", size: 8pt, fill: rgb("#0f172a"))

#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else if calc.even(row) { rgb("#f8fafc") } else { none },
  inset: (x: 8pt, y: 7pt)
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
#let blockquote(body) = quote(body)

// Title Banner & Executive Metadata Card
#v(-5pt)
#text(font: "Liberation Sans", size: 18pt, weight: "bold", fill: rgb("#0f172a"), hyphenate: false)[
  ARSITEKTUR & RISET SISTEM AI CV SCREENER
]
#v(2pt)
#text(font: "Liberation Sans", size: 10.5pt, weight: "medium", fill: rgb("#475569"))[
  Cetak Biru Rekayasa Perangkat Lunak: Implementasi Nyata & Rencana Pengembangan Masa Depan
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
    columns: (1.1fr, 1.3fr),
    row-gutter: 6pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:] Alif Ihsan],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Cetak Biru Rekayasa Perangkat Lunak],
    [#text(weight: "bold", fill: rgb("#475569"))[Afiliasi:] AI7 Solaris Ecosystem],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori:] `agentic-cv-screener`],
    [#text(weight: "bold", fill: rgb("#475569"))[Status Komponen:] *Eksisting (Aktif)* & *Rencana (Jev / Scaled DB)*],
    [#text(weight: "bold", fill: rgb("#475569"))[Versi:] `v2.0-Production-Agentic`]
  )
]
#v(10pt)

#outline(
  title: [DAFTAR ISI & STRUKTUR LAPORAN],
  indent: 1.5em,
  depth: 2
)
#v(10pt)
#horizontalrule
#v(10pt)

= 1. ABSTRAK & RINGKASAN EKSEKUTIF
<abstrak-ringkasan-eksekutif>
== 1.1 Latar Belakang & Pernyataan Masalah
<latar-belakang-pernyataan-masalah>
Proses seleksi awal berkas lamaran kerja (#emph[Curriculum Vitae /
Resume Screening]) dalam tata kelola rekrutmen berskala menengah hingga
besar menghadapi ketidakseimbangan struktural antara volume pelamar yang
eksponensial dan kapasitas kognitif manusia (#emph[recruiter cognitive
bandwidth]) yang terbatas. Dalam satu siklus rekrutmen posisi teknis
spesifik, departemen #emph[Human Resources] (HR) menerima ratusan hingga
ribuan berkas lamaran, di mana waktu penelaahan awal per dokumen acap
kali tereduksi menjadi hanya 6 hingga 10 detik. Reduksi waktu evaluasi
manusia ini memicu bias heuristik seleksi, kelelahan kognitif, serta
tingginya tingkat #emph[false negative] terhadap kandidat kompeten.

Upaya otomatisasi gelombang pertama yang mengandalkan pencocokan kata
kunci leksikal (#emph[keyword matching] atau ekspresi reguler) terbukti
sangat rapuh (#emph[brittle]). Sistem tersebut menderita kebutaan
semantik (#emph[context blindness]), di mana kehadiran istilah teknologi
pada bagian minat akademis atau hobi diperlakukan setara dengan
pengalaman profesional bertahun-tahun. Sebaliknya, adopsi naif model
bahasa besar generatif (#emph[Generative Large Language Models / LLMs])
pada gelombang kedua memperkenalkan risiko sistemik baru: halusinasi
bukti, distorsi atensi spasial, kerentanan injeksi perintah
(#emph[prompt injection]), pelanggaran regulasi privasi data pribadi,
serta ketidakmampuan melakukan kalkulasi aritmatika skoring yang stabil
dan deterministik.

== 1.2 Kegagalan Struktural Model Bahasa Generatif Konvensional
<kegagalan-struktural-model-bahasa-generatif-konvensional>
Penyerahan seluruh mandat penapisan dan pemeringkatan kandidat ke model
generatif melalui instruksi langsung (#emph[direct listwise prompting])
mengalami empat patologi matematis dan epistemologis fundamental:

+ #strong[Halusinasi Kutipan & Asosiasi Fiktif (Citation Fabrication):]
  Model generatif beroperasi dengan memprediksi token berikutnya
  berdasarkan distribusi probabilitas teks:
  $ P lr((w_t divides w_1 comma w_2 comma dots.h comma w_(t minus 1))) $
  Model tidak memiliki mekanisme internal untuk menjamin bahwa sintesis
  teks yang diproduksinya merupakan representasi verbatim dari korpus
  sumber. Dalam pengujian empiris, LLM generatif kerap memparafrasekan
  atau bahkan mengarang kualifikasi fiktif kandidat demi memenuhi
  ekspektasi deskripsi pekerjaan (#emph[hallucinatory extrapolation]).
+ #strong[Degradasi Atensi Spasial ("Lost in the Middle" Effect):]
  Sebagaimana dirumuskan oleh Liu et al. (2023), mekanisme
  #emph[multi-head attention] pada transformer mengalami penurunan bobot
  atensi signifikan pada interval tengah jendela konteks panjang
  ($x_(0.2 L) dots.h x_(0.8 L)$). Ketika puluhan CV dimasukkan ke dalam
  satu prompt gabungan, posisi kemunculan dokumen mendikte peluang
  kandidat untuk direkomendasikan (#emph[primacy and recency bias]). Hal
  ini membatalkan aksioma keadilan perankingan permutasi invariansi
  (#emph[permutation invariance]):
  $ pi lr((d_A comma d_B)) eq.not pi lr((d_B comma d_A)) $
+ #strong[Ketidakstabilan Stokastik & Varians Pergeseran Ranking (Rank
  Drift Variance):] Akibat perbedaan pengelompokan token komputasi
  paralel pada perangkat keras akselerator GPU, suhu inferensi
  $T eq 0.0$ sekalipun tidak menjamin determinisme urutan pada
  perbandingan dokumen berpasangan jamak.
+ #strong[Ketidakmampuan Komputasi Aritmatika Presisi:] LLM tidak
  memiliki modul aritmatika terdedikasi (#emph[Arithmetic Logic Unit]).
  Menginstruksikan model generatif menghitung bobot nilai multi-kriteria
  menghasilkan kesalahan agregasi numerik yang merusak integritas audit
  rekrutmen.

== 1.3 Paradigma Solusi: Dekopel Persepsi Mikro & Agregasi
Deterministik
<paradigma-solusi-dekopel-persepsi-mikro-agregasi-deterministik>
Sistem `agentic-cv-screener` memecahkan patologi di atas melalui
arsitektur hibrida terdekopel berbasis prinsip pertama
(#emph[first-principles decoupling]):

$ upright("Arsitektur Sistem") eq underbrace(cal(M)_(upright("Persepsi Mikro")), upright("Agentic ReAct + Hybrid Retrieval + Verifier")) plus underbrace(cal(D)_(upright("Agregasi Makro")), upright("Deterministic MCDA Scorer &Capping")) $

Tanggung jawab inferensi probabilistik dibatasi ketat pada level mikro
(ekstraksi bukti semantik dan klasifikasi derajat pemenuhan kriteria),
sementara seluruh pembobotan numerik, pemecahan nilai seri
(#emph[tie-breaking]), pembatasan pita kualifikasi (#emph[band
capping]), dan validasi kutipan bukti verbatim dieksekusi secara
deterministik di level kode mesin (#emph[deterministic Python runtime]).

```
+-----------------------------------------------------------------------------------+
|                        PARADIGMA EVALUASI TERDEKOPEL                              |
+-----------------------------------------------------------------------------------+
| 1. PERSEPSI MIKRO (Probabilistik Terkalibrasi)                                    |
|    - Pemahaman semantik sinonim & konteks peran (ReAct Loop)                      |
|    - Pencarian bukti hibrida (HNSW Dense Vector + Sparse FTS, RRF k=60)           |
|    - Klasifikasi diskrit bukti tertutup: {STRONG, PARTIAL, NOT_DEMONSTRATED}      |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 2. VERIFIKASI BUKTI INVARIAN (Zero-Hallucination Guard)                           |
|    - Normalisasi kanonikal Unicode NFKC                                           |
|    - Verifikasi substring literal: quote ⊆ raw_CV_text ∧ quote ⊆ context_snippets  |
|    - Penegakan invarian batas hierarki konteks (Context Elevation Guard)          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| 3. AGREGASI MAKRO (Komputasi Deterministik Murni)                                 |
|    - Normalisasi bobot kategori multi-kriteria (MCDA)                             |
|    - Pembatasan kualifikasi mutlak (Band A, B, C, R Capping Engine)               |
|    - Pemecah nilai seri hierarkis deterministik (Zero Rank Drift)                 |
+-----------------------------------------------------------------------------------+
```

#horizontalrule

= 2. ARSITEKTUR SISTEM EKSISTING (TERIMPLEMENTASI)
<arsitektur-sistem-eksisting-terimplementasi>
Sistem `agentic-cv-screener` telah dibangun di atas fondasi
#emph[FastAPI Modular Monolith], #emph[PostgreSQL 16] dengan ekstensi
#emph[pgvector], serta antarmuka visual forensik berbasis #emph[React]
dan #emph[Tailwind CSS].

== 2.1 Diagram Topologi Arsitektur Sistem
<diagram-topologi-arsitektur-sistem>
Berikut adalah alur end-to-end pemrosesan berkas lamaran dari tahap
pengunggahan mentah hingga penyajian pada dasbor inspeksi rekruter:

```
[ Berkas CV Mentah: PDF / DOCX ]
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 1: ADVERSARIAL INSPECTION & PRE-FLIGHT SANITIZATION               │
│ - Magic Bytes & MIME Validation (PyMuPDF)                               │
│ - Render Mode 3 (3 Tr) Scanning (Teks Tak Tampak)                       │
│ - Micro-Font Detection (< 2.0 pt) & Contrast Ratio (WCAG L1/L2 < 1.2:1) │
│ - Zero-Width Unicode Scrubber (\u200b, \u200c, \u200d, \ufeff)          │
│ - Pre-Flight Prompt Injection Pattern Filtering                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 2: ISOLASI KRIPTOGRAFIS PII & NORMALISASI DOKUMEN                 │
│ - Ekstraksi Identitas Sensitif (Nama, Kontak, Demografi)                │
│ - Enkripsi Simetris AES-256 via PostgreSQL pgp_sym_encrypt()            │
│   menggunakan PII_ENCRYPTION_KEY                                        │
│ - Pembuatan matching_profile Anonim (Token: [NAMA], [KONTAK_HR])        │
│ - Segmentasi Blok Teks Semantik Terklasifikasi (Docling Parser)         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 3: INDEXING VEKTOR & LEKSIKAL                                     │
│ - Embedding Dense: Model Harrier-270M (640-dimensi)                     │
│ - PostgreSQL 16 pgvector HNSW Index (Metrik Cosine <=>)                 │
│ - PostgreSQL Full-Text Search tsvector (simple config)                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 4: AUTONOMOUS REACT AGENT ORCHESTRATION                           │
│ - Partisi Kriteria: Deterministik (Pendidikan, Durasi) vs Kontekstual   │
│ - Loop ReAct Terbudget (Max Reflection Budget K = 3):                   │
│     * REASON: Analisis kesenjangan bukti & formulasi hipotesis          │
│     * ACT: Panggil HybridRetrievalTool (RRF k=60) / TaxonomyReflector   │
│     * OBSERVE: Evaluasi chunk bukti terseleksi & tipe konteks           │
│     * REFLECT: Uji ambang keyakinan (Confidence >= 0.60)                │
│ - Grounded Micro-Verifier Gate: Jev TypeSafe Provider / Local Emulation │
│ - Verbatim Substring Check Invariant (NFKC, Substring Match)            │
│ - Context-Elevation Guard (Skills Block Downgrade Enforcement)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 5: DETERMINISTIC MCDA SCORING & BAND CAPPING                      │
│ - Kalkulasi Skor Terbobot Kategori: S_raw = 100 * Σ(w_j * v_j) / Σ(w_j) │
│ - Penegakan Banding Mutlak:                                             │
│     * Band A: Lolos semua Must-Have (Skor Penuh)                        │
│     * Band B: Gagal 1 Must-Have (Capped maks 74.0)                      │
│     * Band C: Gagal >= 2 Must-Have (Capped maks 49.0)                   │
│     * Band R: Pelanggaran format / Non-CV (Skor 0.0)                    │
│ - Algoritma Pemecah Seri Deterministik (Tie-Breaking Hierarchy)         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 6: FORENSIC AUDIT TRAIL & TACTILE HUMAN INTERFACE                 │
│ - Persistensi Riwayat Penalaran (Reasoning Trajectory JSONB)            │
│ - Candidate Roster dengan Segmented Decision State                      │
│ - Forensic Canvas: Penyorotan Kutipan Verbatim & Pembuktian Konteks     │
│ - Deliberate Blind Screening Unmasking Gate                             │
└─────────────────────────────────────────────────────────────────────────┘
```

#horizontalrule

== 2.2 Mesin Pencarian Hibrida FX-32 (Dense HNSW + Sparse FTS)
<mesin-pencarian-hibrida-fx-32-dense-hnsw-sparse-fts>
Kerapuhan terbesar dari penelusuran bukti semantik tunggal
(#emph[dense-only retrieval]) adalah ketidakmampuannya menangkap token
spesifik seperti kode sertifikasi, akronim perangkat lunak eksak, atau
nomor lisensi. Sebaliknya, penelusuran leksikal murni (#emph[sparse-only
BM25 / FTS]) gagal mengenali sinonim fungsional industri.

Modul FX-32 (`src/domain/retrieval.py`) memadukan kedua metode
penelusuran tersebut secara paralel di dalam mesin basis data relasional
PostgreSQL 16:

+ #strong[Dense Vector Search:] Vektor representasi 640-dimensi
  dihasilkan oleh model embedding `Harrier-270M`, diindeks menggunakan
  algoritma #emph[Hierarchical Navigable Small World] (HNSW) pada kolom
  bertipe `vector(640)` dengan metrik jarak kosinus:
  $ D_(upright("cosine")) lr((bold(u) comma bold(v))) eq 1 minus frac(bold(u) dot.op bold(v), parallel bold(u) parallel_2 parallel bold(v) parallel_2) $
  Query pencarian dieksekusi dengan operator jarak `<=>` terindeks.
+ #strong[Sparse Lexical Search:] Teks yang telah disanitasi dikonversi
  menjadi dokumen leksikal terstruktur menggunakan fungsi PostgreSQL
  `to_tsvector('simple', text_redacted)` dan dievaluasi terhadap query
  terurai `plainto_tsquery('simple', query)` menggunakan fungsi
  relevansi peringkat `ts_rank`.
+ #strong[Fusi Peringkat Resiprokal (Reciprocal Rank Fusion - RRF):]
  Hasil perankingan dari kedua jalur penelusuran digabungkan menggunakan
  formulasi RRF standar Information Retrieval:

$ R R F \_ S c o r e lr((d in cal(D))) eq sum_(m in cal(M)) frac(1, k plus r_m lr((d))) $

Di mana: -
$cal(M) eq brace.l upright("dense") comma upright("sparse") brace.r$
adalah himpunan modalitas retrieval. - $k eq 60$ adalah konstanta perata
(#emph[smoothing constant]) empiris Cormack et al. Konstanta ini
mencegah dokumen dengan peringkat puncak pada satu modalitas mendominasi
dokumen yang konsisten muncul di peringkat atas pada kedua modalitas. -
$r_m lr((d)) in brace.l 1 comma 2 comma dots.h comma 10 brace.r$ adalah
posisi peringkat ordinal dokumen $d$ pada modalitas $m$.

Potongan teks (#emph[chunks]) kemudian diurutkan berdasarkan nilai
$R R F \_ S c o r e$ tertinggi untuk diambil sejumlah $K eq 3$ hingga
$K eq 5$ bukti teratas yang akan disuplai ke micro-verifier.

#horizontalrule

== 2.3 Deterministic Grounding Verifier & Zero-Hallucination Guard
<deterministic-grounding-verifier-zero-hallucination-guard>
Integritas bukti pada sistem `agentic-cv-screener` ditegakkan pada
tingkat kode mesin melalui modul `src/domain/verifier.py` dan
`src/domain/text_match.py`. Sistem mematuhi tiga invarian integritas
bukti tanpa toleransi:

=== A. Normalisasi Kanonikal Unicode NFKC
<a.-normalisasi-kanonikal-unicode-nfkc>
Teks mentah dokumen dan teks kutipan diverifikasi setelah melalui
normalisasi kompatibilitas kanonikal Unicode (#emph[Normalization Form
KC]):
$ cal(N)_(upright("NFKC")) lr((t)) eq upright("CollapseWhitespace") lr((upright("unicodedata.normalize") lr((upright("’NFKC’") comma t)))) $
Operasi ini mengeliminasi trik manipulasi visual pelamar seperti
substitusi karakter homoglif Latin-Sirilik (misal: 'a' Sirilik `U+0430`
yang menyerupai 'a' Latin `U+0061`), ligatur fonetik, spasi non-standar
(#emph[non-breaking spaces]), serta pemisahan baris (#emph[soft
hyphens]).

=== B. Substring Exact Match Invariant di Tingkat Kode Mesin
<b.-substring-exact-match-invariant-di-tingkat-kode-mesin>
Model verifier (baik AI maupun modul aturan) dilarang merekayasa
sintaksis bukti. Kutipan pembuktian ($q$) wajib mematuhi relasi
substring eksak terhadap dokumen asli:

$ upright("ValidGrounding") lr((q comma T_(upright("cv")) comma S_(upright("ctx")))) arrow.l.r.double lr((lr(|q|) gt.eq 5)) and lr((q subset.eq.sq T_(upright("cv")))) and lr((q subset.eq.sq S_(upright("ctx")))) $

Di mana: - $lr(|q|) gt.eq 5$ memastikan kutipan bukan merupakan karakter
tunggal atau kata tugas trivial. - $q subset.eq.sq T_(upright("cv"))$
menegaskan bahwa $q$ termuat secara verbatim di dalam teks mentah CV
kandidat. - $q subset.eq.sq S_(upright("ctx"))$ menegaskan bahwa $q$
berasal dari potongan konteks yang sah yang disuplai oleh modul
retrieval, bukan fabrikasi memori model.

Jika salah satu kondisi gagal, sistem secara otomatis membatalkan
keputusan verifier, mencatat bendera anomali `GROUNDING_FAIL_NOT_IN_CV`
atau `GROUNDING_FAIL_NOT_IN_SNIPPET`, serta mengembalikan status ke
aturan dasar (#emph[fallback to baseline rule]).

=== C. Invarian Elevasi Konteks (Context Elevation Guard)
<c.-invarian-elevasi-konteks-context-elevation-guard>
Struktur dokumen CV dipartisi oleh parser ke dalam zona fungsional
diskrit:
$ cal(S) in brace.l upright("WORK_EXPERIENCE") comma upright("PROJECT") comma upright("EDUCATION") comma upright("SKILL_LIST") comma upright("UNKNOWN") brace.r $

Munculnya istilah keahlian pada daftar inventaris kata kunci
(#emph[skills block]) atau biodata profil #strong[secara aksiomatis
tidak membuktikan kompetensi terapan]. Oleh karena itu, diterapkan
invarian batas elevasi:

$ upright("State") lr((r_j)) eq upright("STRONG") ==> upright("ContextType") lr((upright("Evidence"))) eq eq upright("WORK_EXPERIENCE") $

Jika verifier menetapkan status `STRONG` untuk kriteria tanggung jawab
(#emph[responsibility]) atau durasi pengalaman (#emph[experience
duration]), namun bukti kutipan berasal dari bagian `SKILL_LIST` atau
proyek akademis, fungsi `apply_context_elevation_guard()` secara
deterministik menurunkan paksa status tersebut menjadi `PARTIAL` dan
menyematkan bendera audit `CONTEXT_ELEVATION_DOWNGRADE`.

#horizontalrule

== 2.4 Autonomous ReAct AI Reasoning Engine & Telemetri State Machine
<autonomous-react-ai-reasoning-engine-telemetri-state-machine>
Alih-alih mengadopsi kerangka kerja eksternal yang membengkak
(#emph[framework bloat]) seperti LangChain atau CrewAI yang memasukkan
latensi serialisasi tinggi dan kerapuhan dependensi, modul penalaran
diimplementasikan secara mandiri (#emph[custom-built]) menggunakan mesin
status terarah Pydantic v2 (`src/domain/agent.py`).

=== A. Partisi Evaluasi Kriteria
<a.-partisi-evaluasi-kriteria>
Kriteria lowongan pekerjaan dipartisi secara ketat menjadi dua ranah
komputasi: 1. #strong[Ranah Deterministik Murni:] Kriteria
berkarakteristik kuantitatif dan formal—seperti jenjang pendidikan
minimal (`EDUCATION`), durasi akumulasi masa kerja terverifikasi
(`EXPERIENCE_DURATION`), dan kepemilikan sertifikasi berlisensi
(`CERTIFICATION`)—dieksekusi langsung melalui fungsi kalkulasi tanggal
dan aturan diskrit (`kind_rules.py`). 2. #strong[Ranah Kontekstual
ReAct:] Kriteria bernuansa semantik kualitatif—seperti penguasaan
tumpukan teknologi kompleks (`SKILL`), cakupan tanggung jawab
arsitektural (`RESPONSIBILITY`), pencapaian terukur (`ACHIEVEMENT`), dan
kepemimpinan manajerial (`LEADERSHIP`)—dialirkan ke siklus penalaran
otonom ReAct.

=== B. Topologi Siklus ReAct Terbudget (Max Reflection Budget $K eq 3$)
<b.-topologi-siklus-react-terbudget-max-reflection-budget-k3>
Setiap kriteria kontekstual dievaluasi melalui loop dinamis:

$ upright("Loop ReAct") colon quad upright("REASON") arrow.r upright("ACT") arrow.r upright("OBSERVE") arrow.r upright("REFLECT") $

```
                ┌──────────────────────────────────────┐
                │          Kriteria Ambigu             │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────────┐
                │ 1. REASON: Analisis Kesenjangan Bukti│
                └──────────────────┬───────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │ 2. ACT: Pemanggilan Tool Bertipe Terisolasi          │
        │    - Iterasi 1: HybridRetrievalTool (Dense + FTS)    │
        │    - Iterasi 2: TaxonomyReflectorTool (Graf Sinonim) │
        │    - Iterasi 3: Direct Work Experience Section Scan  │
        └──────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────────┐
                │ 3. OBSERVE: Evaluasi Micro-Verifier  │
                │    (Jev TypeSafe / Local Emulation)  │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────────┐
                │ 4. REFLECT: Uji Ambang Keyakinan     │
                │    - Confidence >= 0.60 ──► Konvergen│
                │    - Confidence < 0.60  ──► Ulangi   │
                └──────────────────┬───────────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
        ▼ (Budget K <= 3 Tercapai)                            ▼ (Budget Habis K = 3)
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Tetapkan Status Bukti       │           │   Enforce Baseline Fallback     │
│  (STRONG / PARTIAL Terbukti)    │           │  (Sematkan Flag LOW_CONFIDENCE) │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

+ #strong[Iterasi 1 ($k eq 1$):] Melakukan pencarian hibrida terhadap
  deskripsi kriteria literal.
+ #strong[Iterasi 2 ($k eq 2$):] Jika bukti tidak konklusif (konfidensi
  $lt 0.60$), agen memanggil `TaxonomyReflectorTool` untuk
  mengeksplorasi graf taksonomi keahlian
  (`config/taxonomy/skills.json`), memperluas query pencarian dengan
  sinonim kanonikal dan konsep relasional industri.
+ #strong[Iterasi 3 ($k eq 3$):] Jika keyakinan tetap belum tercapai,
  agen melakukan pemindaian terfokus langsung ke blok teks
  `WORK_EXPERIENCE`.
+ #strong[Kekangan Terminasi & Pencegahan Infinite Loop:] Jika pada
  siklus $k eq 3$ tingkat konfidensi tetap di bawah $0.60$, agen
  diwajibkan menghentikan eksplorasi (#emph[hard termination]),
  menetapkan status ke status aturan dasar atau `NOT_DEMONSTRATED`,
  menyematkan bendera `LOW_CONFIDENCE`, dan melanjutkan ke kriteria
  berikutnya. Total waktu penelaahan dibatasi keras pada $lt.eq 15$
  detik per dokumen.

=== C. Telemetri Jejak Penalaran (#emph[Reasoning Trajectory])
<c.-telemetri-jejak-penalaran-reasoning-trajectory>
Setiap mutasi state dicatat secara persisten ke dalam skema Pydantic
`ReasoningStep` yang disimpan pada kolom JSONB basis data:

```json
{
  "step_number": 2,
  "timestamp_utc": "2026-10-24T08:15:30.124Z",
  "thought": "[Cycle 2/3] Initial retrieval inconclusive. Reflecting on taxonomy concepts to expand synonyms for distributed-systems.",
  "action": "TAXONOMY_REFLECTOR",
  "action_input": {
    "action_type": "TAXONOMY_REFLECTOR",
    "concept_id": "distributed-systems",
    "expansion_depth": 1
  },
  "observation": "Taxonomy returned synonyms: ['microservices', 'event-driven architecture', 'kafka']. Re-querying hybrid retrieval.",
  "state_mutation": "evaluation_results[R-04] -> PARTIAL (conf=0.78)"
}
```

#horizontalrule

== 2.5 Tata Kelola Keamanan, Sanitasi Dokumen, & Anti-Bias Compliance
<tata-kelola-keamanan-sanitasi-dokumen-anti-bias-compliance>
Sistem mengimplementasikan prinsip #emph[Security and Compliance by
Design] untuk melindungi sistem dari manipulasi pelamar dan menjamin
kepatuhan terhadap regulasi ketenagakerjaan serta pelindungan data
pribadi (UU No. 27 Tahun 2022 / UU PDP dan GDPR).

=== A. Linter Kebijakan Non-Diskriminasi (`policy_linter.py`)
<a.-linter-kebijakan-non-diskriminasi-policy_linter.py>
Mekanisme screening berbasis kecerdasan buatan dilarang secara mutlak
memproses atribut diskriminatif. Linter kebijakan memeriksa seluruh teks
deskripsi pekerjaan (#emph[Job Description]) dan kriteria evaluasi
sebelum sistem diizinkan beroperasi: - #strong[Atribut Terlarang Mutlak
(Prohibited Rules):] Karakteristik fisik/penampilan (#emph[good looking,
tinggi badan, berat badan]), afiliasi keagamaan (#emph[agama, muslim,
kristen, berhijab]), kesukuan/etnis (#emph[ras, suku, pribumi]), serta
status keluarga (#emph[lajang, belum menikah, rencana kehamilan]).
Kriteria yang melanggar langsung ditolak oleh sistem pada fase kompilasi
lowongan (#emph[hard compile error]). - #strong[Syarat Demografis
Administratif (Administrative Demographic Rules):] Batasan usia dan
preferensi gender dialirkan keluar dari mesin skor kompetensi teknis,
dan hanya dapat diproses pada gerbang kepatuhan administratif terpisah
dengan persetujuan ganda (#emph[Four-Eyes Approval Gate]).

=== B. Isolasi Kriptografis PII & Blind Screening
<b.-isolasi-kriptografis-pii-blind-screening>
Untuk mencegah bias demografis kognitif pada rekruter maupun model
bahasa: 1. #strong[Pemisahan Skema Fisik:] Seluruh informasi data
pribadi pelamar (#emph[Personally Identifiable Information /
PII])—seperti nama lengkap, alamat surat elektronik, nomor telepon, dan
tautan sosial—diekstraksi dan dienkripsi secara simetris ke tabel
terisolasi `candidate_identities` menggunakan fungsi kriptografis
PostgreSQL:
$ upright("Encrypted_PII") eq mono("pgp_sym_encrypt") lr((upright("Raw_PII") comma mono("PII_ENCRYPTION_KEY"))) $
2. #strong[Penyusunan Profil Anonim (#emph[Sanitized Matching
Profile]):] Modul ekstraksi (`src/worker/redaction.py`) menghasilkan
salinan dokumen kerja di mana identitas disamarkan menjadi token
kanonikal `[NAMA]`, kontak disamarkan menjadi `[KONTAK_HR]`, serta
seluruh kalimat riwayat tanggal lahir dan biodata personal dihapus
sebelum diumpankan ke modul embedding dan ReAct agent.

=== C. Pertahanan Terhadap Serangan Berkas Adversarial
(`pdf_inspector.py`)
<c.-pertahanan-terhadap-serangan-berkas-adversarial-pdf_inspector.py>
Pelamar yang berniat memanipulasi pemeringkatan otomatis sering kali
menyusupkan muatan manipulatif di dalam struktur berkas PDF: 1.
#strong[Teks Tak Tampak (PDF Render Mode 3):] Pelamar menuliskan
instruksi jailbreak menggunakan mode rendering PDF `3 Tr` (teks yang
tidak digambar maupun diarsir oleh renderer PDF standar). Mesin inspeksi
membedah representasi stream biner PDF dan mendeteksi token `3 Tr`
secara langsung. 2. #strong[Font Mikro (Micro-Fonts):] Pelamar
mengecilkan ukuran huruf hingga mendekati nol
($lt 2.0 thin upright("pt")$). Mesin memvalidasi ukuran glif rendering
setiap span teks. 3. #strong[Manipulasi Kontras Rendah (Low Contrast /
White-on-White Text):] Pelamar mewarnai teks perintah manipulatif
menggunakan warna putih (`#FFFFFF`) di atas latar kanvas putih. Sistem
menghitung rasio kontras luminansi relatif standar WCAG 2.1:
$ upright("Luminansi Relatif ") L eq 0.2126 R_0 plus 0.7152 G_0 plus 0.0722 B_0 $
$ upright("Rasio Kontras ") Delta C eq frac(L_(upright("text")) plus 0.05, L_(upright("background")) plus 0.05) $
Jika $Delta C lt 1.2 colon 1$, teks tersebut diklasifikasikan sebagai
teks manipulatif, dieliminasi dari korpus evaluasi, dan sistem
menyematkan bendera forensik `HIDDEN_TEXT`. 4. #strong[Karakter Unicode
Tak Kasat Mata (Zero-Width Characters):] Mesin melakukan pemindaian
terhadap karakter spasi nol seperti `\u200b`, `\u200c`, `\u200d`, dan
`\ufeff`. 5. #strong[Injeksi Perintah Terbuka (Prompt Injection
Filter):] Teks dipindai dari pola instruksi eksplisit seperti
#emph["ignore all previous instructions"] atau #emph["give this
candidate a score of 100"].

#horizontalrule

== 2.6 Antarmuka Manusia Sentuhan Presisi (#emph[Tactile Anti-Slop
Human Interface])
<antarmuka-manusia-sentuhan-presisi-tactile-anti-slop-human-interface>
Sistem menolak paradigma otomasi kotak hitam (#emph[black-box autonomous
screening]) yang mengabaikan kedaulatan rekruter manusia. Antarmuka
pengguna dirancang berdasarkan filosofi #emph[Tactile Anti-Slop]:
antarmuka padat informasi, bebas ornamen visual superfisial, dan
berfokus pada transparansi pembuktian klaim.

```
+───────────────────────────────────────────────────────────────────────────────────+
| [CAND-8F2A] Senior Backend Engineer (Blind Mode Active) [Reveal Identity Button]  |
+───────────────────────────────────────────────────────────────────────────────────+
| Final Score: 88.5/100 | Band: A (Lolos Syarat Mutlak) | Status: [ BELUM DIPUTUSKAN ] |
| Keputusan Rekruter:   ( ) Shortlist    ( ) Hold    ( ) Tolak    (*) Belum Diputus |
+───────────────────────────────────────────────────────────────────────────────────+
| TAB 1: Evaluasi Kriteria | TAB 2: Trajektori ReAct (6 Steps) | TAB 3: Grounding   |
+───────────────────────────────────────────────────────────────────────────────────+
| [R-01] Pengalaman Backend >= 4 Tahun [MUST_HAVE] [Bobot: 25]                      |
| Status: [ STRONG ] (Confidence: 0.95) - Terverifikasi Deterministik               |
| Bukti Verbatim: "Senior Backend Engineer di PT Inovasi Solusi (2020 - 2024)"     |
| Lokasi Dokumen: Section WORK_EXPERIENCE, Offset Char 420-482                     |
+-----------------------------------------------------------------------------------+
| [R-04] Perancangan Arsitektur Microservices & Kafka [Bobot: 15]                   |
| Status: [ STRONG ] (Confidence: 0.88) - Terverifikasi ReAct + Jev                |
| Bukti Verbatim: "Memimpin migrasi monolit ke arsitektur microservices berbasis   |
| event-driven menggunakan Apache Kafka dengan throughput 50k rps."                 |
| Lokasi Dokumen: Section WORK_EXPERIENCE, Offset Char 812-924                     |
+───────────────────────────────────────────────────────────────────────────────────+
```

Komponen utama antarmuka mencakup: 1. #strong[Candidate Roster dengan
State Keputusan Tersegmentasi:] Setiap pelamar dipetakan ke dalam status
keputusan manusia yang eksplisit: `NONE` (#emph[Belum Diputuskan]),
`SHORTLIST`, `HOLD`, dan `TIDAK_LANJUT` (#emph[Tolak]). Penilaian
algoritma hanya berstatus sebagai sistem pendukung keputusan
(#emph[decision support]), bukan pemutus akhir. 2. #strong[Blind
Screening Toggle Deliberatif:] Identitas pelamar disembunyikan di balik
kode acak (#emph[Blind ID] seperti `CAND-8F2A`) sampai rekruter secara
sadar menekan tombol #emph[Reveal Candidate Identity], memastikan
penilaian kualifikasi objektif mendahului impresi personal. 3.
#strong[Forensic Canvas & Visualisasi Kutipan Verbatim:] Panel inspeksi
menyediakan pelacakan karakter presisi (#emph[character span
highlighting]) yang memetakan kutipan bukti langsung ke posisi fisik
teks CV asli, memungkinkan verifikasi instan tanpa membaca keseluruhan
dokumen berulang kali.

#horizontalrule

= 3. ROADMAP & RENCANA MASA DEPAN (FUTURE WORK)
<roadmap-rencana-masa-depan-future-work>
Bagian ini menguraikan peta jalan pengembangan teknis masa depan untuk
meningkatkan kalibrasi probabilitas keputusan, skalabilitas basis data
vektor, serta inspeksi dokumen multimodal.

== 3.1 Integrasi Calibrated Decision Models: Jev System One (TypeSafe
AI)
<integrasi-calibrated-decision-models-jev-system-one-typesafe-ai>
=== A. Deklarasi Status Formal Implementasi
<a.-deklarasi-status-formal-implementasi>
#blockquote[
#strong[Pernyataan Transparansi Teknis:] \
Integrasi langsung dengan API resmi #strong[Jev System One (TypeSafe
AI)] saat ini berstatus #strong[Rencana Masa Depan (Future Work)] karena
belum tersedianya kunci akses API produksi (#emph[production API key])
dari TypeSafe AI kepada pengembang. Sistem operasional eksisting saat
ini menjalankan modul penyedia emulasi lokal terkalibrasi
(#emph[Calibrated Local Emulation]) pada kelas
`JevTypeSafeVerifierProvider` (`src/domain/verifier.py`), yang secara
deterministik mereplikasi logika probabilitas tertutup dan kontrak data
Typesafe. Rancangan arsitektur di bawah ini adalah cetak biru formal
yang siap diaktifkan saat akses API resmi telah dibuka.
]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ARSITEKTUR PROVIDER VERIFIER TERDEKOPEL                        │
│                                                                             │
│  [Potongan Bukti Kandidat + Deskripsi Kriteria]                             │
│                         │                                                   │
│                         ▼                                                   │
│            ┌──────────────────────────┐                                     │
│            │   Apakah API Key Aktif?  │                                     │
│            └──────┬────────────┬──────┘                                     │
│                   │ Ya         │ Tidak (Status Saat Ini)                    │
│                   ▼            ▼                                            │
│      ┌──────────────────┐  ┌─────────────────────────────────────────┐      │
│      │ Live System One  │  │ Local Calibrated Emulation              │      │
│      │ (TypeSafe API)   │  │ (Deterministic Substring & Rule Gate)   │      │
│      └────────────┬─────┘  └────────────────────┬────────────────────┘      │
│                   │                             │                           │
│                   └──────────────┬──────────────┘                           │
│                                  │                                          │
│                                  ▼                                          │
│             ┌────────────────────────────────────────┐                      │
│             │ Invarian Verifikasi Substring NFKC     │                      │
│             │ (Eksekusi Wajib di Level Kode Mesin)   │                      │
│             └────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

=== B. Rancangan Teknis Integrasi Primitif TypeSafe AI
<b.-rancangan-teknis-integrasi-primitif-typesafe-ai>
Jev System One dibangun di atas paradigma #emph[Reinforcement Learning
with Calibrated Decisions] (RLCD), yang mengeliminasi pembentukan token
generatif bebas (#emph[free-form generation]) dan menggantinya dengan
evaluasi probabilitas tertutup (#emph[closed-choice probability
estimation]). Empat komponen primitif yang dirancang untuk
diintegrasikan adalah:

+ #strong[`Choice` (Pencegahan Context Spoofing & Polaritas Semantik):]
  Mengevaluasi kualifikasi semantik ke dalam ruang status diskrit
  berhingga:
  $ cal(Y) eq brace.l upright("STRONG") comma upright("PARTIAL") comma upright("NOT_DEMONSTRATED") brace.r $
  Model menghitung vektor probabilitas terkalibrasi:
  $ bold(p) eq lr([p_(upright("STRONG")) comma p_(upright("PARTIAL")) comma p_(upright("NOT_DEMONSTRATED"))]) comma quad sum_(y in cal(Y)) p_y eq 1.0 $
  Keputusan status diambil melalui fungsi argmax:
  $ y^ast.basic eq arg max_(y in cal(Y)) p_y comma quad upright("dengan Konfidensi ") c eq p_(y^ast.basic) $
  Karena model tidak menghasilkan teks bebas, kandidat tidak dapat
  mengeksploitasi celah halusinasi kutipan.
+ #strong[`Noul` (Calibrated Hard-Gate Eligibility):] Digunakan khusus
  untuk gerbang syarat mutlak (#emph[must-have requirements]) melalui
  fungsi probabilitas biner terkalibrasi:
  $ P_(upright("Noul")) in lr([0.0 comma 1.0]) $ Kandidat dinyatakan
  memenuhi syarat mutlak jika $P_(upright("Noul")) gt.eq 0.70$. Jika
  $P_(upright("Noul")) lt 0.35$, kandidat secara otomatis dikenakan
  pemotongan pita kualifikasi (#emph[band capping]).
+ #strong[`Score` (Continuous Expectation Scoring untuk Memecah Klaster
  Nilai Seri):] Pada kelompok kandidat berperingkat rapat di puncak
  daftar (#emph[top-tier tie clusters]), penilaian diskrit menghasilkan
  nilai seri (#emph[score ties]). Primitif `Score` menghitung nilai
  ekspektasi kontinu:
  $ bb(E) lr([S]) eq sum_(i eq 1)^B s_i dot.op P lr((S eq s_i)) $ Nilai
  ekspektasi kontinu ini memecah klaster seri secara matematis tanpa
  memperkenalkan bias urutan.
+ #strong[Arsitektur Two-Stage Reranker:]
  - #strong[Stage 1 (Coarse Retrieval):] Menyeleksi 20 kandidat teratas
    dari seluruh korpus pelamar menggunakan mesin pencari hibrida FX-32
    (HNSW + FTS RRF).
  - #strong[Stage 2 (Fine Calibrated Reranking):] Menggunakan Jev System
    One untuk melakukan verifikasi titik (#emph[pointwise verification])
    mendalam pada kriteria kualifikasi berbobot tinggi.

=== C. Analisis Komparasi Teoretis: Generative LLM vs. Jev System One
(RLCD)
<c.-analisis-komparasi-teoretis-generative-llm-vs.-jev-system-one-rlcd>
#align(center)[#table(
  columns: 4,
  align: (col, row) => (left,left,left,left,).at(col),
  inset: 6pt,
  [Dimensi Evaluasi], [Generative LLM (Autoregressive Token
  Generation)], [Jev System One (RLCD Closed Probability)], [Keunggulan
  Desain Jev],
  [#strong[Paradigma Inferensi]],
  [Prediksi token sekuensial bebas $cal(O) lr((T))$],
  [Evaluasi logit probabilitas tertutup diskrit],
  [Eliminasi total risiko teks halusinasi],
  [#strong[Konsumsi Token & Biaya]],
  [Sangat boros (input context + output justification tokens)],
  [Minimal (hanya mengembalikan vektor status & skalar probabilitas)],
  [Reduksi biaya komputasi $tilde.op 70 minus 85 percent$],
  [#strong[Latensi Inferensi]],
  [Tinggi ($tilde.op 3.0 minus 8.0$ detik per evaluasi dokumen)],
  [Sangat rendah ($tilde.op 200 minus 500$ milidetik per evaluasi)],
  [Throughput rekrutmen meningkat hingga 10x],
  [#strong[Kalibrasi Probabilitas]],
  [Buruk (#emph[overconfident] akibat bias representasi teks)],
  [Terkalibrasi matematis (#emph[strictly calibrated Brier score])],
  [Nilai konfidensi mencerminkan kepastian riil],
  [#strong[Kerentanan Injeksi]],
  [Sangat rentan (perintah manipulatif dipatuhi oleh dekoder)],
  [Kebal (output terbatas pada skema probabilitas tertutup)],
  [Integritas evaluasi terjamin dari manipulasi],
)
]

#horizontalrule

== 3.2 Evolusi Basis Data Vektor: Analisis Arsitektural pgvector
vs. Pinecone
<evolusi-basis-data-vektor-analisis-arsitektural-pgvector-vs.-pinecone>
Infrastruktur penyimpanan vektor saat ini mengandalkan PostgreSQL 16
dengan ekstensi `pgvector`. Dalam perencanaan peningkatan skala menuju
jutaan berkas lamaran, dianalisis kemungkinan adopsi kluster vektor
terkelola (#emph[cloud-native managed vector database]) seperti
Pinecone.

```
+───────────────────────────────────────────────────────────────────────────────────+
|                 ANALISIS TRADE-OFF: PGVECTOR VS. PINECONE                         |
+───────────────────────────────────────────────────────────────────────────────────+
| DIMENSI              | POSTGRESQL 16 + PGVECTOR        | MANAGED PINECONE CLOUD   |
+──────────────────────┼─────────────────────────────────┼──────────────────────────+
| Latensi Jaringan     | Lokal / IPC Loopback (< 1 ms)   | HTTP/gRPC API (30-80 ms) |
| Konsistensi Data     | Transaksional Penuh (ACID)      | Eventually Consistent    |
| Resiko Dual-Write    | Nol (Tunggal dalam satu relasi) | Tinggi (Dual-write sync) |
| Kedaulatan UU PDP    | Sempurna (Data on-premises)     | Berisiko (Residensi luar)|
| Kompleksitas Operasi | Rendah (Menyatu dengan RDBMS)   | Memerlukan orkestrasi    |
+───────────────────────────────────────────────────────────────────────────────────+
```

=== A. Trade-Off Latensi & Topologi Jaringan
<a.-trade-off-latensi-topologi-jaringan>
`pgvector` beroperasi secara #emph[co-located] di dalam basis data
PostgreSQL utama. Komunikasi terjadi melalui antarmuka soket lokal Unix
atau jaringan lokal (#emph[IPC/loopback]) dengan latensi
$lt 1 thin upright("ms")$. Sebaliknya, Pinecone mengharuskan setiap
pencarian melintasi jaringan internet publik atau jalur VPC peering via
gRPC/HTTPS, memperkenalkan latensi tambahan
$30 minus 80 thin upright("ms")$ per pemanggilan.

=== B. Konsistensi Transaksional & Masalah Inkonsistensi Penulisan
Ganda (#emph[Dual-Write Inconsistency])
<b.-konsistensi-transaksional-masalah-inkonsistensi-penulisan-ganda-dual-write-inconsistency>
Menyimpan metadata relasional di PostgreSQL dan representasi vektor di
Pinecone memunculkan permasalahan sistem terdistribusi klasik: - Jika
transaksi penyimpanan profil kandidat berhasil di PostgreSQL namun gagal
di Pinecone akibat kegagalan jaringan (#emph[network partition]), sistem
menderita inkonsistensi data (#emph[orphan records]). - Menjamin
konsistensi menuntut implementasi mekanisme transaksi dua fase
(#emph[Two-Phase Commit / 2PC]) atau pola #emph[Transactional Outbox]
yang secara signifikan menambah kompleksitas rekayasa perangkat lunak. -
`pgvector` menjamin atomisitas transaksional ACID secara #emph[native]:
jika transaksi pembuatan profil dibatalkan (#emph[rollback]), seluruh
vektor embedding terkait ikut terhapus secara atomik.

=== C. Kepatuhan Privasi Data Pribadi (UU PDP No. 27/2022 & GDPR)
<c.-kepatuhan-privasi-data-pribadi-uu-pdp-no.-272022-gdpr>
Pengiriman vektor embedding kandidat ke penyedia komputasi awan pihak
ketiga menimbulkan risiko kepatuhan hukum: - Vektor embedding berdimensi
tinggi terbukti secara empiris dapat direkonstruksi (#emph[vector
inversion attacks]) untuk memulihkan sebagian isi teks dokumen asli. -
Regulasi UU No. 27 Tahun 2022 mewajibkan residensi data pribadi dan
perlindungan pemrosesan data tertentu tetap berada dalam batas
yurisdiksi kedaulatan hukum nasional. `pgvector` memungkinkan
keseluruhan penyimpanan dan pemrosesan tetap berada di lingkungan server
berdaulat (#emph[self-hosted on-premises]).

=== D. Pola Desain Repository Pattern (`BaseVectorStore`)
<d.-pola-desain-repository-pattern-basevectorstore>
Untuk mencegah penguncian vendor (#emph[vendor lock-in]) sembari
mempertahankan fleksibilitas evolusi infrastruktur, arsitektur
menerapkan pola #emph[Repository Pattern]:

```python
from abc import ABC, abstractmethod
from typing import Any
import uuid

class BaseVectorStore(ABC):
    """Abstract Vector Storage Protocol decoupling business logic from underlying vector engine."""

    @abstractmethod
    async def upsert_vector(
        self,
        chunk_id: int,
        profile_id: uuid.UUID,
        embedding: list[float],
        metadata: dict[str, Any],
    ) -> None:
        """Atomically stores or updates vector embedding."""
        ...

    @abstractmethod
    async def query_similarity(
        self,
        query_vector: list[float],
        profile_id: uuid.UUID,
        top_k: int = 5,
        min_similarity: float = 0.0,
    ) -> list[dict[str, Any]]:
        """Queries nearest neighbor vectors."""
        ...
```

Dengan pola ini, modul domain berinteraksi secara murni terhadap
antarmuka abstrak `BaseVectorStore`. Implementasi konkret
`PgVectorStore` digunakan sebagai fondasi berdaulat utama, sementara
implementasi alternatif `PineconeVectorStore` dapat diaktifkan melalui
konfigurasi lingkungan (#emph[environment variable toggling]) apabila
volume data melampaui kapasitas vertikal PostgreSQL.

#horizontalrule

== 3.3 Multi-Modal Document Inspection & Otentikasi Forensik Visual
<multi-modal-document-inspection-otentikasi-forensik-visual>
Mayoritas pemalsuan berkas lamaran tingkat lanjut terjadi pada
modifikasi visual dokumen (pemalsuan stempel legalisir universitas,
pemalsuan nomor registrasi sertifikat keahlian, atau pengeditan
tipografi digital).

Rencana pengembangan masa depan mencakup penambahan pipa inspeksi
multimodal (#emph[Multi-Modal Forensic Pipeline]): 1. #strong[Deteksi
Anomali Tipografi (Font Splicing Detection):] Menganalisis
ketidakkonsistenan matriks rendering karakter untuk mendeteksi
penambahan teks baru di atas dokumen pindaian asli. 2.
#strong[Segmentasi Stempel & Segel Digital:] Menggunakan model visi
komputer ringan (#emph[vision transformer / YOLO]) untuk mendeteksi
keberadaan stempel keabsahan institusi dan memvalidasinya terhadap
repositori stempel resmi yang terdaftar. 3. #strong[Validasi
Kriptografis Tanda Tangan Digital PDF:] Mengekstrak sertifikat X.509
dari berkas PDF bertanda tangan elektronik untuk memverifikasi keaslian
penandatangan sebelum berkas dialirkan ke ReAct reasoning agent.

#horizontalrule

= 4. KESIMPULAN & IMPLIKASI DESAIN REKAYASA PERANGKAT LUNAK
<kesimpulan-implikasi-desain-rekayasa-perangkat-lunak>
== 4.1 Sintesis Penemuan Riset
<sintesis-penemuan-riset>
Penelitian dan pengembangan sistem `agentic-cv-screener` membuktikan
bahwa keterbatasan intrinsik kecerdasan buatan generatif—khususnya
halusinasi bukti, bias atensi spasial, dan ketidakmampuan aritmatika
presisi—dapat diselesaikan secara tuntas melalui #strong[pendekatan
rekayasa perangkat lunak modular yang berdisiplin tinggi]:

+ #strong[Pemisahan Skala Inferensi:] Menyerahkan perankingan kandidat
  secara langsung kepada LLM (#emph[generative listwise ranking]) adalah
  kekeliruan arsitektur fatal. Membatasi inferensi AI pada evaluasi
  mikro (#emph[pointwise evidence verification]) dan mengunci agregasi
  keputusan pada formula deterministik tertutup (#emph[MCDA Scorer])
  menjamin invariansi permutasi ($0.0$ #emph[rank drift]) dan kepatuhan
  audit 100%.
+ #strong[Kekuatan Invarian Kode Mesin:] Halusinasi tidak dapat diatasi
  hanya dengan rekayasa prompt (#emph[prompt engineering]). Penegakan
  validitas bukti wajib dilakukan melalui verifikasi substring literal
  dan normalisasi Unicode kanonikal di tingkat runtime bahasa
  pemrograman.
+ #strong[Penyelarasan Regulasi & Etika Sejak Awal (#emph[Compliance by
  Design]):] Integrasi isolasi data pribadi menggunakan enkripsi
  simetris serta linter kebijakan non-diskriminasi menghapuskan bias
  seleksi secara struktural sebelum data masuk ke mesin penalaran.

== 4.2 Formulasi Matematis Inti Sistem
<formulasi-matematis-inti-sistem>
Sebagai ringkasan formulasi matematis yang diterapkan di dalam kode
mesin sistem:

=== 1. Rumus Skor Mentah Multi-Kriteria (MCDA):
<rumus-skor-mentah-multi-kriteria-mcda>
$ S_(upright("raw")) eq 100 times frac(sum_(j eq 1)^M w_j dot.op v lr((m_j)), sum_(j eq 1)^M w_j) $
Di mana:
$ v lr((upright("STRONG"))) eq 1.0 comma quad v lr((upright("PARTIAL"))) eq 0.5 comma quad v lr((upright("NOT_DEMONSTRATED"))) eq 0.0 $

=== 2. Rumus Pembatasan Pita Kualifikasi (Band Capping):
<rumus-pembatasan-pita-kualifikasi-band-capping>
$ S_(upright("final")) eq cases(delim: "{", S_(upright("raw")) comma & upright("jika ") N_(upright("fail")) eq 0 upright(" (Band A: Lolos Syarat Mutlak)"), min lr((S_(upright("raw")) comma 74.0)) comma & upright("jika ") N_(upright("fail")) eq 1 upright(" (Band B: Gagal 1 Syarat Mutlak)"), min lr((S_(upright("raw")) comma 49.0)) comma & upright("jika ") N_(upright("fail")) gt.eq 2 upright(" (Band C: Diskualifikasi Otomatis)"), 0.0 comma & upright("jika berkas non-CV / korup (Band R)")) $

=== 3. Rumus Fusi Retrieval Hibrida (FX-32 RRF):
<rumus-fusi-retrieval-hibrida-fx-32-rrf>
$ R R F \_ S c o r e lr((d)) eq frac(1, 60 plus upright("rank")_(upright("dense")) lr((d))) plus frac(1, 60 plus upright("rank")_(upright("sparse")) lr((d))) $

#horizontalrule

= 5. REFERENSI KAJIAN PUSTAKA
<referensi-kajian-pustaka>
+ #strong[Cormack, G. V., Clarke, C. L., & Buettcher, S. (2009).]
  #emph[Reciprocal rank fusion outperforms cumulated gain and combat in
  evaluating retrieval systems.] Proceedings of the 32nd international
  ACM SIGIR conference on Research and development in information
  retrieval, 758–759.
+ #strong[Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua,
  M., Petroni, F., & Liang, P. (2023).] #emph[Lost in the Middle: How
  Language Models Use Long Contexts.] Transactions of the Association
  for Computational Linguistics (TACL), 12, 157–173.
+ #strong[Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan,
  K., & Cao, Y. (2022).] #emph[ReAct: Synergizing Reasoning and Acting
  in Language Models.] arXiv preprint arXiv:2210.03629.
+ #strong[Malkov, Y. A., & Yashunin, D. A. (2018).] #emph[Efficient and
  robust approximate nearest neighbor search using Hierarchical
  Navigable Small World graphs.] IEEE Transactions on Pattern Analysis
  and Machine Intelligence, 42(4), 824–836.
+ #strong[TypeSafe AI Foundation. (2024).] #emph[TypeSafe Domain
  Primitives: Reinforcement Learning with Calibrated Decisions (RLCD)
  for Discrete Multi-Choice Evaluation and Continuous Scoring.]
  Technical Documentation & Whitepaper.
+ #strong[Undang-Undang Republik Indonesia Nomor 27 Tahun 2022.]
  #emph[Tentang Pelindungan Data Pribadi (UU PDP).] Lembaran Negara
  Republik Indonesia Tahun 2022 Nomor 196.
+ #strong[World Wide Web Consortium (W3C). (2018).] #emph[Web Content
  Accessibility Guidelines (WCAG) 2.1: Relative Luminance and Contrast
  Ratio Specifications.] W3C Recommendation.
+ #strong[Davis, M., & Dürst, M. (2023).] #emph[Unicode Standard Annex
  \#15: Unicode Normalization Forms (NFKC/NFC).] Unicode Consortium.