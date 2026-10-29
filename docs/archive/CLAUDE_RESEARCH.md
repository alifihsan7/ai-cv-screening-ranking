> **Status (diperbarui 2026-10-29):** catatan riset awal untuk arsitektur agent. Sebagian isinya (misalnya `ScreeningAgent` sebagai agent otonom) tidak sama dengan implementasi: alur saat ini bertahap tetap, bukan agent otonom. Panduan yang berlaku ada di [`CLAUDE.md`](../../CLAUDE.md).

# CLAUDE_RESEARCH.md — Deep Research & Architectural Specification: Typesafe Autonomous AI Agent & Jev (TypeSafe) Verifier

> **Dokumen Riset Mendalam & Panduan Eksekusi untuk Claude Code / Anthropic Claude**  
> **Repository:** `alifihsan7/agentic-cv-screener` (Private)  
> **Author & Sovereign Maintainer:** Alif Ihsan (`49711087+alifihsan7@users.noreply.github.com`)  
> **Target:** Transformasi total dari *Deterministic Procedural Pipeline* ke *Fully Autonomous Typesafe AI Agent Pipeline*, mengintegrasikan **Jev (TypeSafe)** sebagai dedicated verifier engine.

---

## 1. LATAR BELAKANG RISET & PROBLEM STATEMENT

### 1.1 Masalah pada Pipeline Konvensional (As-Is State)
Codebase saat ini bekerja secara linier statis ($A \rightarrow B \rightarrow C$):
1. Dokumen CV diurai (*parse*) secara kaku satu kali.
2. Kriteria Job Description (JD) dievaluasi berurutan dengan loop sederhana.
3. Jika pencocokan string gagal, sistem memanggil hybrid retrieval semantik secara pasif.
4. Jika kandidat menulis istilah teknis yang tidak ada dalam taksonomi statis atau memiliki format layout CV yang kompleks, sistem langsung menyerah dan menandai status `NOT_DEMONSTRATED` atau `NEEDS_REVIEW`.

### 1.2 Tujuan Riset (To-Be Goal)
Membangun **Autonomous AI Agent** yang bertindak sebagai *Senior Technical Recruiter*:
* **Tujuan (Goal-Oriented):** Menguji kelayakan kandidat secara adil, berbasis bukti nyata (*evidence-based*), tanpa bias identitas (*blind screening*), dan tahan terhadap manipulasi teks (*anti-prompt injection*).
* **Otonom & Adaptif:** Jika bukti ambigu, agen secara cerdas merencanakan aksi alternatif (misal: mencari variasi sinonim dalam ontologi taksonomi, membaca ulang seksi pengalaman kerja terkait, atau memvalidasi konteks proyek).
* **Typesafe End-to-End:** Seluruh perpindahan status, pemanggilan alat (*tool calling*), state internal, dan respons API dibungkus oleh model **Pydantic v2** yang ketat tanpa celah `dict[str, Any]` atau `tuple` tanpa tipe.
* **Integrasi Dedicated Verifier Jev (TypeSafe):** Menguji dan mengimplementasikan provider verifikasi khusus dari TypeSafe (**Jev**) yang mengkhususkan diri pada klasifikasi pilihan tertutup (*closed choices*) berprobabilitas tinggi untuk membasmi halusinasi kutipan.
* **Non-Hallucinatory Mathematical Rigor:** LLM / Model **dilarang menghitung angka skor**. Skor dihitung 100% oleh formula matematika deterministik dengan pembuktian kutipan verbatim di level kode Python.

---

## 2. ARSITEKTUR AGEN: SIKLUS HIDUP & STATE MACHINE

Agen dirancang menggunakan pola **Goal-Driven ReAct (Reason + Act) State Machine** dengan checkpointing state.

### 2.1 State Graph Topology
```
                     ┌─────────────────────────────┐
                     │       INIT_SESSION          │
                     │  (Load JD & Requirements)   │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │    INGESTION & REDACTION    │
                     │ (Sanitize, Parse, Mask PII) │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │    PLANNING_EVALUATION      │
                     │ (Order criteria: Must/Nice) │
                     └──────────────┬──────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│      DETERMINISTIC PASS      │              │      ADAPTIVE AGENT LOOP     │
│ - Degree & Education match   │              │ (Contextual Skills & Proof)  │
│ - Date overlap & total exp   │              │                              │
└──────────────┬───────────────┘              │ 1. Reason (Evaluate missing) │
               │                              │ 2. Tool Call (Vector/FTS)    │
               │                              │ 3. Reflect (Taxonomy Syns)   │
               │                              │ 4. Grounded Verifier Gate:   │
               │                              │    • Jev (TypeSafe) Provider │
               │                              │    • LLM Gateway Fallback    │
               │                              └──────────────┬───────────────┘
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────┐
                     │    DETERMINISTIC SCORER     │
                     │ (Category Weights, Band Cap)│
                     └──────────────┬──────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────┐
                     │      DOSSIER SYNTHESIS      │
                     │ (Rank, Citations, Outliers) │
                     └──────────────┬──────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────┐
                     │    HUMAN-IN-THE-LOOP (UI)   │
                     │  (Recruiter Final Decision) │
                     └─────────────────────────────┘
```

---

## 3. SPESIFIKASI TYPESAFE DOMAIN CONTRACTS (PYDANTIC V2)

Claude harus meriset dan mengimplementasikan kontrak typesafe berikut pada `src/domain/models.py`:

### 3.1 Profil Kandidat & Pengalaman Kerja
```python
from datetime import date
from typing import Any, Literal
from pydantic import BaseModel, Field, HttpUrl

class DateInterval(BaseModel):
    start_date: str = Field(description="Normalized YYYY-MM or YYYY")
    end_date: str | None = Field(default=None, description="None indicates 'Present'")
    duration_months: int = Field(ge=0)
    is_current: bool = False

class WorkExperience(BaseModel):
    company_name: str
    role_title: str
    interval: DateInterval
    responsibilities: list[str] = Field(default_factory=list)
    skills_extracted: list[str] = Field(default_factory=list)
    raw_snippet: str

class Education(BaseModel):
    institution: str
    degree_level: Literal["D3", "D4", "S1", "S2", "S3", "BOOTCAMP", "HIGH_SCHOOL", "OTHER"]
    field_of_study: str | None = None
    graduation_year: int | None = None
    gpa: float | None = None

class CandidateProfileDomain(BaseModel):
    candidate_id: str
    anonymized_id: str = Field(description="Masked ID for blind screening")
    educations: list[Education] = Field(default_factory=list)
    work_experiences: list[WorkExperience] = Field(default_factory=list)
    skills_demonstrated: list[str] = Field(default_factory=list)
    total_experience_months: int = Field(ge=0)
    raw_redacted_text: str
```

### 3.2 Bukti & Hasil Evaluasi Kriteria
```python
class EvidenceCitation(BaseModel):
    criterion_id: str
    verbatim_quote: str = Field(min_length=5, description="Exact substring from original CV")
    char_start: int
    char_end: int
    source_section: str = Field(description="e.g. Work Experience, Projects")
    context_window: str
    confidence: float = Field(ge=0.0, le=1.0)
    is_grounded: bool = True

class EvaluationResult(BaseModel):
    criterion_id: str
    state: Literal["STRONG", "PARTIAL", "NOT_DEMONSTRATED", "UNKNOWN"]
    confidence: float = Field(ge=0.0, le=1.0)
    metrics: dict[str, Any] = Field(default_factory=dict)
    evidences: list[EvidenceCitation] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list, description="Audit warnings e.g. SEMANTIC_MATCH, LOW_CONFIDENCE")
    evaluation_method: Literal["DETERMINISTIC_RULE", "HYBRID_SEMANTIC", "JEV_TYPESAFE", "LLM_VERIFIED", "HUMAN_OVERRIDE"]
```

### 3.3 Stateful Reasoning Trajectory (Agent State)
```python
class ReasoningStep(BaseModel):
    step_number: int
    timestamp_utc: str
    thought: str = Field(description="Internal reasoning explanation")
    action: str = Field(description="Tool invoked or decision branch")
    action_input: dict[str, Any] = Field(default_factory=dict)
    observation: str = Field(description="Tool output summary")
    state_mutation: str = Field(description="Which criterion was updated")

class ScreeningAgentState(BaseModel):
    session_id: str
    job_id: str
    candidate_id: str
    current_phase: Literal["INIT", "PARSING", "EVALUATING", "CRITIQUE_REFLECT", "SCORING", "COMPLETED"]
    profile: CandidateProfileDomain | None = None
    evaluation_results: dict[str, EvaluationResult] = Field(default_factory=dict)
    reasoning_trajectory: list[ReasoningStep] = Field(default_factory=list)
    retry_count: int = 0
    max_retries: int = 3
    is_terminal: bool = False
```

---

## 4. STANDARISASI INTERFACE TOOLS & DEDICATED VERIFIERS

Agen tidak boleh memanggil fungsi database atau LLM secara langsung di tengah alur logika. Seluruh aksi eksternal wajib diabstraksikan sebagai tool dengan skema Pydantic:

### 1. `DoclingParserTool`
* **Input Schema:** `{ file_path: Path, extract_tables: bool }`
* **Output Schema:** `{ raw_text: str, sections: dict[str, str], tables: list[dict], char_map: dict }`
* **Deskripsi:** Memproses PDF/DOCX multi-kolom menggunakan model IBM Docling TableFormer, menghasilkan representasi teks terstruktur beserta koordinat karakter asli.

### 2. `HybridRetrievalTool`
* **Input Schema:** `{ candidate_id: str, query: str, top_k: int = 5, rrf_k: int = 60 }`
* **Output Schema:** `{ chunks: list[RetrievedChunk] }`
* **Algoritma:**
  $$\text{RRF Score} = \frac{1}{60 + \text{rank}_{\text{dense}}} + \frac{1}{60 + \text{rank}_{\text{sparse}}}$$
  * Dense: Cosine distance pgvector (`microsoft/harrier-o`, 640-dim).
  * Sparse: PostgreSQL `to_tsvector('simple', text) @@ plainto_tsquery('simple', query)`.

### 3. `TaxonomyReflectorTool`
* **Input Schema:** `{ skill_or_role: str, depth: int = 2 }`
* **Output Schema:** `{ canonical_name: str, synonyms: list[str], parents: list[str], children: list[str] }`
* **Fungsi:** Mengambil relasi taksonomi dari `config/taxonomy/` untuk mengekspansi query saat pencarian awal tidak menemukan bukti (*reflection loop*).

### 4. `GroundedVerifierTool` & Jev (TypeSafe) Provider
Sesuai dokumen spesifikasi `docs/spec/02_SCORING_RUBRIC_SPEC.md` (bagian 8):
> *"Provider verifier bisa diganti lewat model gateway (LLM lokal, API, atau Jev dari TypeSafe sebagai eksperimen; Jev cocok karena outputnya pilihan tertutup + probabilitas, tapi tidak memberi kutipan, jadi evidence_id dipilih kode dari kandidat bukti teratas)."*

#### Arsitektur Verifier Provider Pattern:
```python
class VerifierDecision(BaseModel):
    state: Literal["STRONG", "PARTIAL", "NOT_DEMONSTRATED"]
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_id: str | None = None
    quote: str | None = None
    provider_name: str

class JevTypeSafeVerifierProvider:
    """Provider verifikasi berbasis Jev dari TypeSafe."""
    def __init__(self, endpoint_url: str | None = None, api_key: str | None = None):
        self.endpoint_url = endpoint_url
        self.api_key = api_key

    async def verify(self, criterion: RequirementItem, candidate_chunks: list[RetrievedChunk]) -> VerifierDecision:
        # Jev mengevaluasi kecocokan bukti terhadap aturan tertutup
        # Jev mengembalikan status + probabilitas
        # Kode Python memilih kutipan verbatim dari candidate_chunks[0] untuk menjamin zero hallucination
        ...
```

#### Strict Grounding Invariant:
```python
def verify_grounding(quote: str, raw_cv_text: str) -> bool:
    if len(quote.strip()) < 5:
        return False
    return quote.strip().lower() in raw_cv_text.lower()
```
Jika `verify_grounding == False`, output verifier **dianulir seketika**, di-fallback ke `rule_state` dengan flag `GROUNDING_FAIL`.

---

## 5. MESIN SKOR DETERMINISTIK (THE UNTOUCHABLE MATHEMATICS)

Claude **TIDAK BOLEH** mengganti logika penilaian ini dengan penilaian skor generatif LLM.

### 5.1 Bobot Kategori
Total skor dihitung dari rata-rata terbobot kategori:
$$S_{\text{raw}} = \sum_{c \in \text{Categories}} W_c \times S_c$$
Di mana:
* $S_{\text{EXPERIENCE}}$ (Bobot default: 35%)
* $S_{\text{HARD_SKILLS}}$ (Bobot default: 40%)
* $S_{\text{EDUCATION_CERT}}$ (Bobot default: 15%)
* $S_{\text{ACHIEVEMENT}}$ (Bobot default: 10%)

### 5.2 Deterministic Band Capping
Setelah $S_{\text{raw}}$ diperoleh, skor akhir diikat oleh *Band Invariant*:
* **Band A:** $100\%$ kriteria `MUST_HAVE` berstatus `STRONG`. (Skor: $S_{\text{raw}}$ tanpa batas, rentang 75.0 – 100.0).
* **Band B:** Tepat 1 kriteria `MUST_HAVE` bernilai selain `STRONG`. Skor **dibatasi maksimal 74.0** ($\min(S_{\text{raw}}, 74.0)$).
* **Band C:** Lebih dari 1 kriteria `MUST_HAVE` gagal. Skor **dibatasi maksimal 49.0** ($\min(S_{\text{raw}}, 49.0)$).
* **Band R (Review):** Terdapat `MUST_HAVE` berstatus `UNKNOWN` atau terindikasi manipulasi. Wajib ditinjau manual oleh recruiter.

### 5.3 Deterministic Tie-Breaking
Jika dua kandidat memiliki skor numerik identik, urutan ranking ditentukan oleh:
1. Skor numerik akhir (descending).
2. Jumlah kriteria `MUST_HAVE` berstatus `STRONG` (descending).
3. Jumlah kriteria `NICE_TO_HAVE` berstatus `STRONG` (descending).
4. Total akumulasi durasi pengalaman kerja relevan dalam bulan (descending).
5. SHA-256 hash deterministik (`candidate_id` + `screening_run_id`).

---

## 6. PERTANYAAN RISET MENDALAM (DEEP RESEARCH INQUIRIES FOR CLAUDE)

Claude Code diharapkan melakukan investigasi terhadap 8 area riset ini sebelum dan selama implementasi:

1. **Eksperimen & Arsitektur Integrasi Jev (TypeSafe) vs LLM Verifier:**  
   Bagaimana implementasi terbaik Jev dari TypeSafe sebagai provider verifikasi bukti?
   * Evaluasi karakteristik output Jev (probabilitas terkalibrasi + pilihan tertutup).
   * Bandingkan akurasi klasifikasi status (`STRONG`/`PARTIAL`/`NOT_DEMONSTRATED`) antara Jev vs LLM (Gemini-3.8-Flash) pada 24 CV di Golden Dataset.
   * Ukur penurunan latensi dan risiko halusinasi kutipan dengan pendekatan deterministik Jev.
2. **State Engine Selection:**  
   *Apakah lebih optimal membangun custom Pydantic-based state runner ringan (100% no-dependency overhead), atau mengadopsi LangGraph / PydanticAI?*  
   *Catatan:* Codebase ini mengutamakan low-latency execution, determinisme tinggi, dan integrasi erat dengan connection pool `psycopg 3` dan tabel PostgreSQL `jobs_queue`.
3. **Handling OCR Bounding-Box vs Verbatim Matching:**  
   Bagaimana strategi terbaik menangani typo minor OCR (misal ligatur `fi` atau spasi ganda) pada PDF tanpa merusak *strict verbatim grounding invariant*? Apakah perlu normalisasi whitespace deterministik sebelum komparasi substring?
4. **Multi-Pass Query Reflection Budget:**  
   Berapa batas *reflection loop* maksimal agar agen tidak terjebak dalam *infinite loop* saat mencari skill langka, sekaligus menjaga batas latency inferensi tetap di bawah 15 detik per CV?
5. **9Router Concurrency & Rate Limiting:**  
   Bagaimana mengoptimalkan `asyncio.Semaphore(5)` pada `gateway.py` agar sinkron dengan throughput 9Router lokal (`http://127.0.0.1:20128/v1`) saat mengevaluasi 50 CV secara paralel?
6. **PII Masking Sanitization Leakage:**  
   Bagaimana memastikan nama universitas atau nama perusahaan ternama tidak ikut terhapus saat modul redaction menyamarkan nama entitas personal?
7. **Zero-Downtime Database Migration:**  
   Bagaimana merancang migrasi Alembic untuk kolom baru `reasoning_trajectory` (JSONB) dan `agent_version` (VARCHAR) tanpa mengunci tabel `screenings` yang sedang aktif?
8. **Golden Dataset Regression Test:**  
   Bagaimana memastikan akurasi scoring tetap $\ge 95\%$ pada 24 CV sintetis di `docs/spec/golden_dataset/evaluate.py` setelah seluruh pipeline diubah menjadi agentic?

---

## 7. ACTIONABLE IMPLEMENTATION PROTOCOL (STEP-BY-STEP)

Claude disarankan bekerja dengan urutan iteratif berikut:

### Langkah 1: Path Decoupling & Configuration Audit
* Ubah `src/infrastructure/config.py`:
  Hapus semua string `/srv/hermes-control/services/cv-screening`.
  Ganti dengan path relatif dinamis:
  ```python
  BASE_DIR = Path(__file__).resolve().parent.parent.parent
  STORAGE_VAULT_PATH = BASE_DIR / "data" / "cv-vault"
  TAXONOMY_DIR = BASE_DIR / "config" / "taxonomy"
  ```
* Pastikan `.env.example` mencerminkan konfigurasi portabel.

### Langkah 2: Pydantic Domain Foundation
* Tulis `src/domain/models.py` yang mencakup seluruh kontrak typesafe di Bagian 3.
* Refactor `src/domain/kind_rules.py` untuk mengembalikan `EvaluationResult` (hapus 5-tuple).
* Ubah `ScoreResult` di `src/domain/scorer.py` menjadi Pydantic v2 `BaseModel`.

### Langkah 3: Tool Interface & Jev Verifier Implementation
* Buat modul `src/domain/tools/` yang membungkus:
  * `parser.py` (Docling & Sanitizer).
  * `retrieval.py` (Hybrid Search).
  * `reflector.py` (Taxonomy Resolver).
  * `verifier.py` (Provider Pattern: Jev TypeSafe + LLM Gateway).

### Langkah 4: Agent Orchestrator & State Machine
* Bangun `src/domain/agent.py` yang menjalankan ReAct loop stateful.
* Hubungkan agent orchestrator dengan worker `src/worker/processor.py`.
* Rekam `reasoning_trajectory` secara lengkap ke kolom database `screenings.trajectory`.

### Langkah 5: Strict MyPy & Test Verification
* Aktifkan strict flags di `pyproject.toml`:
  ```toml
  [tool.mypy]
  python_version = "3.12"
  disallow_untyped_defs = true
  disallow_incomplete_defs = true
  check_untyped_defs = true
  no_implicit_optional = true
  warn_return_any = true
  warn_unused_ignores = true
  ```
* Jalankan `mypy src/` hingga **0 errors**.
* Jalankan `pytest tests/` dan `python docs/spec/golden_dataset/evaluate.py` hingga **100% lulus**.

---

*Spesifikasi riset ini disusun oleh AI7 Solaris Ecosystem (Nexus & Zephyr) sebagai instruksi operasional resmi untuk Claude Code.*
