# CLAUDE.md — Agentic CV Screener

> **Panduan Riset, Arsitektur, dan Eksekusi untuk Claude Code**  
> Repository: `alifihsan7/agentic-cv-screener` (Private)  
> Author / Maintainer: Alif Ihsan (`49711087+alifihsan7@users.noreply.github.com`)  
> Base Provenance: Cloned from `Rifqi-Setiawan/ai-cv-screening-ranking` (100% commit history preserved).

---

## 1. MISI & VISI PROYEK

Proyek ini bertujuan mentransformasi sistem evaluasi CV (*CV screening and ranking engine*) yang awalnya bersifat **procedural pipeline & deterministic rules-based** menjadi sebuah **Fully Autonomous Typesafe AI Agent Pipeline**.

Sistem ini dirancang untuk recruiter perusahaan:
1. Recruiter memasukkan deskripsi lowongan (*Job Description*).
2. Mengunggah puluhan hingga ratusan CV kandidat (PDF/DOCX/ZIP).
3. Agen otonom memproses, mengekstrak, memvalidasi bukti (*evidence-based*), melakukan penalaran bertingkat, dan menghasilkan daftar kandidat teratas (*ranked dossier*) dengan kutipan bukti verbatim dari CV.
4. **Keputusan akhir tetap berada di tangan manusia (Human-in-the-Loop)**.

---

## 2. ATURAN EMAS & INVARIAN KETAT (NON-NEGOTIABLE)

Dalam mengembangkan sistem ini, ada 8 aturan fundamental dari PRD yang **TIDAK BOLEH DILANGGAR**:

1. **LLM Tidak Pernah Menghitung Skor Angka:**  
   Skor numerik dihitung 100% oleh kode matematika deterministik (`scorer.py`) berbasis bobot kriteria dan status tertutup (`STRONG`, `PARTIAL`, `NOT_DEMONSTRATED`, `UNKNOWN`). LLM dilarang keras menghasilkan skor angka langsung.
2. **Code-Level Verbatim Grounding:**  
   Setiap klaim kualifikasi wajib memiliki kutipan teks (`quote`) dari CV. Kode Python memvalidasi bahwa kutipan tersebut **benar-benar ada secara verbatim (panjang $\ge$ 5 karakter)** di teks asli CV. Jika tidak ditemukan, klaim otomatis dianulir (`GROUNDING_FAIL`).
3. **Teks CV Adalah Data, Bukan Instruksi (Anti-Prompt Injection):**  
   Teks CV tidak pernah digabungkan langsung ke instruksi prompt LLM tanpa sanitasi. CV diperlakukan sebagai dokumen pasif untuk mencegah serangan *prompt injection* yang diselundupkan oleh kandidat.
4. **Pemisahan Fisik PII & Blind Screening:**  
   Nama, foto, kontak, tanggal lahir, gender, agama, dan alamat lengkap kandidat **wajib dipisahkan dan dienkripsi** (`pgp_sym_encrypt`) sebelum masuk ke embedding, prompt LLM, atau penilaian kompetensi. Penilaian kompetensi murni anonim (*blind*).
5. **Kriteria Administratif Dipisah (Eligibility Gate):**  
   Kriteria demografis (usia, gender) tidak boleh mencemari skor teknis. Kriteria ini dievaluasi terpisah di *Eligibility Gate* dengan mekanisme persetujuan ganda (*four-eyes approval*).
6. **Tidak Ada Penolakan Otomatis (No Automated Rejection):**  
   Mesin hanya memberikan rekomendasi bergradasi (*Band A, B, C, R*). Recruiter manusia yang membuat keputusan final.
7. **Hasil 100% Dapat Direproduksi (Deterministic & Idempotent):**  
   Input CV dan Job Description yang sama wajib menghasilkan skor, status bukti, dan urutan ranking yang identik setiap kali dijalankan.
8. **Golden Test Dataset Adalah Wasit:**  
   Terdapat 24 CV sintetis dengan kunci jawaban terverifikasi di `docs/spec/golden_dataset/`. Dilarang mengubah label golden dataset untuk meluluskan unit test.

---

## 3. PETA ARSITEKTUR CODEBASE SAAT INI

```
agentic-cv-screener/
|-- alembic.ini                   # Konfigurasi migrasi PostgreSQL
|-- pyproject.toml                # Project manifest, dependensi, ruff & mypy
|-- Makefile                      # Task automation (test, lint, migrate)
|-- config/
|   `-- taxonomy/                 # Kamus ontologi domain (skills, certs, role_families)
|-- docs/
|   |-- spec/                     # Spesifikasi lengkap (PRD, Rubrik Skor, API Contract)
|   `-- DEPLOYMENT_AND_RUNBOOK.md # Dokumentasi deployment & operasional
|-- src/
|   |-- api/                      # REST Interface (FastAPI)
|   |   |-- main.py               # Factory app, router inclusion, CORS, middleware
|   |   |-- dependencies.py       # Auth guards (JWT), tenant verification
|   |   `-- routes/               # Endpoints: auth, jobs, cvs, screenings, requirements
|   |-- domain/                   # Business & Algorithmic Core
|   |   |-- kind_rules.py         # Evaluasi aturan per kriteria (EXPERIENCE, SKILL, EDU, CERT)
|   |   |-- scorer.py             # Mesin skoring 2 lapis, band capping, ranking tie-break
|   |   |-- verifier.py           # LLM-based verification dengan verbatim grounding
|   |   |-- retrieval.py          # Hybrid search (pgvector HNSW cosine + FTS via RRF k=60)
|   |   |-- jd_compiler.py        # Ekstraksi requirement dari teks Job Description
|   |   |-- eligibility.py        # Pemeriksaan administratif terpisah (usia, gender)
|   |   |-- explainer.py          # Pembuat resume dossier penalaran untuk recruiter
|   |   |-- taxonomy.py           # Loader YAML taksonomi ke memori & regex compiler
|   |   |-- policy_linter.py      # Pencegah kriteria diskriminatif / SARA
|   |   `-- models.py             # Domain models (SEKARANG MASIH SANGAT MINIM)
|   |-- infrastructure/           # Drivers & Technical Adapters
|   |   |-- config.py             # Pydantic BaseSettings
|   |   |-- database.py           # Connection pool PostgreSQL via psycopg 3
|   |   |-- gateway.py            # HTTP client ke 9Router LLM (port 20128)
|   |   `-- logging.py            # Structured JSON logger
|   `-- worker/                   # Asynchronous Job Execution (jobs_queue)
|       |-- main.py               # Daemon polling loop (FOR UPDATE SKIP LOCKED)
|       |-- processor.py          # Ingestion orchestrator
|       |-- sanitizer.py          # Magic-bytes & integrity checker
|       |-- boundary.py           # Isolasi halaman CV vs berkas kompilasi
|       |-- docling_parser.py     # IBM Docling TableFormer parser
|       |-- redaction.py          # Ekstraksi dan enkripsi PII
|       `-- embedding.py          # Batch embedding generator (Harrier-270M, 640-dim)
`-- tests/                        # 45+ suite pengujian pytest
```

---

## 4. TEMUAN AUDIT TEKNIS & TECHNICAL DEBT (ZEPHYR AUDIT)

Berdasarkan audit teknis komprehensif oleh AI7 Zephyr, berikut adalah daftar masalah arsitektur yang perlu diperbaiki:

### A. Loose Typing & Ketiadaan Pydantic Models di Domain Core (Kritis)
- **Problem:** Entitas data utama (`Candidate`, `Document`, `CandidateProfile`, `Requirement`, `RequirementScore`, `Evidence`) tidak memiliki class Pydantic v2. Data mengalir antar layer sebagai `dict[str, Any]` mentah langsung dari database.
- **Untyped 5-Tuple:** Modul `kind_rules.py` mengembalikan 5-tuple:
  `tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]`. Pola ini sangat rapuh terhadap kesalahan indeks array.
- **API Response Skema Lepas:** Rute FastAPI kritis (`/screenings`, `/cvs`, `/reveal-identity`) mengembalikan `dict[str, Any]` atau `JSONResponse` tanpa deklarasi `response_model`, menyebabkan Swagger OpenAPI tidak memiliki kontrak typesafe.
- **MyPy Terlalu Longgar:** `pyproject.toml` mematikan strict typing (`disallow_untyped_defs = false`).

### B. Path Hardcoding (Pelanggaran Portabilitas)
- **Problem:** Terdapat path server absolut `/srv/hermes-control/services/cv-screening/...` yang tertanam di:
  - `src/infrastructure/config.py` (`STORAGE_VAULT_PATH`)
  - `src/domain/taxonomy.py`
  - `src/api/main.py`
  - `src/worker/adapter.py`
- **Dampak:** Repo tidak dapat langsung dijalankan di lingkungan lokal pengembang atau Docker tanpa memodifikasi kode.

### C. Arsitektur Masih Bersifat Prosedural, Bukan AI Agent
- Pipeline saat ini berjalan linier statis (`A -> B -> C`).
- Tidak ada konsep `AgentState` yang merekam lintasan penalaran (*reasoning trajectory*).
- Modul internal (Docling, PgVector Hybrid Retrieval, Verifier) belum diabstraksikan sebagai *Standardized Declarative Tools* yang dapat dipanggil secara adaptif.
- Ketiadaan *Self-Reflection & Critic Loop*: Jika ekstraksi profil ambigu atau skor confidence rendah, sistem tidak memiliki kemampuan melakukan evaluasi ulang dengan strategi alternatif.

---

## 5. CETAK BIRU TARGET: FULLY AUTONOMOUS TYPESAFE AI AGENT

Untuk mewujudkan sistem yang typesafe end-to-end dan otonom, Claude diarahkan untuk membangun arsitektur berikut:

### 1. Definisi Pydantic v2 Domain Models Lengkap (`src/domain/models.py`)
Gantikan semua `dict[str, Any]` dengan model deklaratif yang immutable:
```python
class WorkExperience(BaseModel):
    company: str
    role: str
    start_date: str
    end_date: str | None
    duration_months: int
    responsibilities: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)

class CandidateProfileDomain(BaseModel):
    candidate_id: str
    experiences: list[WorkExperience]
    educations: list[Education]
    certifications: list[Certification]
    skills_demonstrated: list[str]
    raw_redacted_text: str

class EvaluationResult(BaseModel):
    state: Literal["STRONG", "PARTIAL", "NOT_DEMONSTRATED", "UNKNOWN"]
    confidence: float = Field(ge=0.0, le=1.0)
    metrics: dict[str, Any] = Field(default_factory=dict)
    evidences: list[EvidenceRecord] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)
```

### 2. Pydantic-based `ScreeningAgentState`
Representasi stateful dari proses berpikir dan evaluasi agen:
```python
class ScreeningAgentState(BaseModel):
    run_id: str
    job_id: str
    candidate_id: str
    current_phase: Literal["INGEST", "PARSE", "EVALUATE_RULES", "SEMANTIC_FALLBACK", "GROUNDED_VERIFY", "SCORE"]
    profile: CandidateProfileDomain | None = None
    requirements: list[RequirementItem]
    evaluations: dict[str, EvaluationResult] = Field(default_factory=dict)
    reasoning_traces: list[ReasoningStep] = Field(default_factory=list)
    confidence_score: float = 1.0
    is_completed: bool = False
```

### 3. Abstraksi Tool Deklaratif (`@agent_tool`)
Bungkus kapabilitas sistem menjadi interface tool terstandarisasi:
- `DocumentParserTool`: Parse PDF/DOCX via Docling TableFormer / PyPDF.
- `HybridRetrievalTool`: Query pgvector HNSW cosine + Postgres FTS via RRF k=60.
- `GroundedVerifierTool`: Validasi kutipan LLM dengan kode Python verbatim checker.
- `PolicyLinterTool`: Audit kriteria SARA dan diskriminasi.

### 4. Adaptive ReAct / Plan-and-Solve Loop
Gantikan for-loop kaku dengan alur evaluasi adaptif:
1. **Plan:** Analisis kualifikasi yang dibutuhkan vs profil kandidat.
2. **Execute:** Jalankan aturan deterministik untuk kriteria mudah (pendidikan, tahun pengalaman).
3. **Reflect & Search:** Jika kriteria skill berstatus `NOT_DEMONSTRATED`, agen memanggil `HybridRetrievalTool` dengan variasi sinonim dari taksonomi.
4. **Verify:** Panggil `GroundedVerifierTool` jika terdapat bukti ambigu, pastikan lolos validasi verbatim.
5. **Synthesize:** Scorer menghitung Band dan skor akhir matematis.

---

## 6. ROADMAP PENGERJAAN UNTUK CLAUDE CODE

Claude Code disarankan mengeksekusi refactoring dengan tahapan berikut:

### Phase 1: Environment & Path Decoupling (Prioritas Tinggi)
1. Periksa seluruh kemunculan `/srv/hermes-control/services/cv-screening`.
2. Ubah konfigurasi path di `src/infrastructure/config.py` agar berbasis project root:
   ```python
   PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
   STORAGE_VAULT_PATH = PROJECT_ROOT / "data" / "cv-vault"
   TAXONOMY_DIR = PROJECT_ROOT / "config" / "taxonomy"
   ```
3. Pastikan path dapat dioverride melalui environment variables `.env`.

### Phase 2: Domain Modeling & End-to-End Type Safety (Prioritas Tinggi)
1. Rancang model domain lengkap di `src/domain/models.py`.
2. Refactor `src/domain/kind_rules.py` agar mengembalikan `EvaluationResult` (bukan 5-tuple).
3. Konversi `ScoreResult` di `src/domain/scorer.py` menjadi Pydantic v2 `BaseModel`.
4. Pasang `response_model` pada seluruh routes di `src/api/routes/`.
5. Perbarui `pyproject.toml` dengan mode MyPy yang lebih ketat (`disallow_untyped_defs = true`) dan tuntaskan semua error typing.

### Phase 3: Agentic State Machine & Tool Registry (Prioritas Sedang)
1. Implementasikan `ScreeningAgentState` dan `ReasoningStep`.
2. Daftarkan tools sistem ke dalam registry terstandarisasi.
3. Rancang loop orkestrasi otonom yang adaptif di `src/domain/screening_service.py`.
4. Dokumentasikan setiap reasoning step ke dalam laporan dossier kandidat.

### Phase 4: Observability & Verifikasi Golden Dataset (Prioritas Sedang)
1. Jalankan `pytest` untuk memastikan tidak ada regresi pada tes yang sudah ada.
2. Jalankan evaluasi golden dataset:
   ```bash
   python docs/spec/golden_dataset/evaluate.py
   ```
   Pastikan akurasi evaluasi tetap mencapai passing criteria PRD.

---

## 7. DEVELOPER RUNBOOK & COMMANDS

### Setup Lingkungan Lokal
```bash
# Buat dan aktifkan virtual environment (Python >= 3.12)
python3 -m venv .venv
source .venv/bin/activate

# Install dependensi
pip install -e .
pip install -e ".[dev]"

# Setup konfigurasi environment
cp .env.example .env
# Sesuaikan DATABASE_URL dan JWT_SECRET di .env
```

### LLM Gateway (9Router)
Sistem menggunakan 9Router lokal di port `20128`:
- `LLM_GATEWAY_URL=http://127.0.0.1:20128/v1`
- Model default: `ag/gemini-3.8-flash-high`

### Testing, Linting & Type Checking
```bash
# Menjalankan test suite
pytest -v

# Linter & formatter
ruff check src/ tests/
ruff format --check src/ tests/

# Type checking statis
mypy src/
```

### Menjalankan Service
```bash
# Menjalankan API Server
uvicorn src.api.main:app --host 127.0.0.1 --port 8110 --reload

# Menjalankan Worker Queue
python -m src.worker.main
```

---
*Dokumen ini disusun oleh AI7 Nexus berdasarkan audit arsitektural AI7 Zephyr untuk Alif Ihsan. Seluruh hak cipta dan kepemilikan kode berada di bawah Alif Ihsan.*
