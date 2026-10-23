# Agentic CV Screener & Talent Ranking Engine

*Autonomous ReAct Screening Loop, Jev TypeSafe Deterministic Verifier, Anti-Adversarial PDF Inspection, and Executive Decision Workbench.*

[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-4169E1.svg?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Vite + React](https://img.shields.io/badge/Vite-React%2019%20TS-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Mypy Strict](https://img.shields.io/badge/mypy-strict%20(94%20files)-2A6DB2.svg?style=flat-square)](https://mypy-lang.org/)
[![Ruff Clean](https://img.shields.io/badge/ruff-clean-D7FF64.svg?style=flat-square&logo=ruff&logoColor=black)](https://docs.astral.sh/ruff/)
[![Accessibility](https://img.shields.io/badge/accessibility-WCAG%20AAA-brightgreen.svg?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Benchmark](https://img.shields.io/badge/Golden%20Dataset-NDCG%4010%201.000-success.svg?style=flat-square)](docs/spec/golden_dataset/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Capabilities](#core-capabilities)
  - [1. Autonomous ReAct Reasoning Loop](#1-autonomous-react-reasoning-loop)
  - [2. Jev TypeSafe Dual-Mode Verification](#2-jev-typesafe-dual-mode-verification)
  - [3. Anti-Adversarial PDF Sanitation & Defense](#3-anti-adversarial-pdf-sanitation--defense)
  - [4. Executive Decision Studio (Tactile Light UI)](#4-executive-decision-studio-tactile-light-ui)
  - [5. Golden Dataset Benchmark & Scorer Parity](#5-golden-dataset-benchmark--scorer-parity)
- [Tech Stack](#tech-stack)
- [Quickstart & Installation](#quickstart--installation)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Python Environment](#1-clone--python-environment)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Database Migration & Seeding](#3-database-migration--seeding)
  - [4. Running the Backend Services](#4-running-the-backend-services)
  - [5. Running & Building the Frontend](#5-running--building-the-frontend)
- [Quality Gates & Automated Verification](#quality-gates--automated-verification)
- [Provenance & Attribution](#provenance--attribution)
- [License](#license)

---

## Overview

**Agentic CV Screener** is an enterprise-grade talent screening and ranking engine built to eliminate hallucination, prompt injection vulnerabilities, and heuristic bias from technical hiring workflows.

Unlike conventional heuristic parsers or opaque generative chatbots, Agentic CV Screener implements a decoupled, evidence-grounded architecture:
1. **Mathematical Determinism**: Scoring calculations are 100% deterministic (`scorer.py`). Generative models and verifiers are strictly prohibited from generating raw numerical scores.
2. **Code-Level Verbatim Grounding**: Every qualification claim requires exact verbatim substring quotes from the applicant's raw CV text. If a quote cannot be verified verbatim at length $\ge 5$, the claim is unconditionally repudiated (`GROUNDING_FAIL`).
3. **Adversarial Resilience**: Binary-level PDF inspection detects invisible zero-point typography, white-on-white text overlays, and zero-width Unicode injection vectors before files reach parsing pipelines.
4. **Human-in-the-Loop Sovereignty**: Recruiters and hiring managers retain final decision authority via structured band recommendations (Band A, B, C, R) and real-time forensic reasoning inspection.

---

## System Architecture

```
                               ┌───────────────────────────────────────────────────────────┐
                               │                    DOCUMENT INGESTION                     │
                               │                                                           │
                               │   Candidate CV (PDF / DOCX) ──► Anti-Adversarial Inspector│
                               │   (Zero-font / White-on-white / Zero-width Unicode Strip)  │
                               │                                  │                        │
                               │                                  ▼                        │
                               │   MIME Sanitizer ──► PII Redactor (pgp_sym_encrypt)       │
                               │                                  │                        │
                               │                                  ▼                        │
                               │   IBM Docling Engine ──► Profile Chunker & Embeddings     │
                               │                          (Harrier-270M, 640-dim pgvector) │
                               └───────────────────────────────┬───────────────────────────┘
                                                               │
                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                   AUTONOMOUS REACT REASONING LOOP (agent.py)                             │
│                                                                                          │
│  State: ScreeningAgentState                                                              │
│  Phase: Thought ──► Action (Discriminated Tool Call) ──► Observation ──► Grounding        │
│                                                                                          │
│  ┌─────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────┐  │
│  │     Tool: ParserTool    │   │ Tool: HybridRetrievalTool │   │ Tool: TaxonomyTool   │  │
│  │ (Profile Sections / XP) │   │ (pgvector HNSW + FTS RRF) │   │ (Ontology Expansion) │  │
│  └─────────────────────────┘   └───────────────────────────┘   └──────────────────────┘  │
│                                              │                                           │
│                                              ▼                                           │
│                                ┌───────────────────────────┐                             │
│                                │ Tool: GroundedVerifierTool│                             │
│                                └─────────────┬─────────────┘                             │
└──────────────────────────────────────────────┼───────────────────────────────────────────┘
                                               │
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│             CALIBRATED MICRO-VERIFIER (Jev TypeSafe & Grounding Guardrails)              │
│                                                                                          │
│  Evidence Snippets ──► Jev Micro-Verifier ──► Discrete Probabilities Y ∈ {STRONG,        │
│                        (Local / System One)                           PARTIAL,           │
│                                                                       NOT_DEMONSTRATED}  │
│                                     │                                                    │
│  Raw Document Text ──► Python Verbatim Match ──► Guardrail Verification (NFKC Substring) │
└──────────────────────────────────────┬───────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│               DETERMINISTIC MATHEMATICAL SCORER (scorer.py)                              │
│                                                                                          │
│  - Category Weights: Experience (40%), Hard Skills (30%), Education (15%), Achv (15%)   │
│  - Must-Have Constraints: Failure on mandatory requirement caps candidate score to Band B│
│  - Tie-Breaking & Decision Bands: Band A (Interview), Band B (Review), Band C / R        │
└──────────────────────────────────────┬───────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE & EXECUTIVE DECISION STUDIO                            │
│                                                                                          │
│  PostgreSQL 16 Storage (Reasoning Trajectory JSONB, PII Vault, Candidate Dossier)         │
│                                      │                                                   │
│                                      ▼                                                   │
│  Executive Decision Studio (Vite + React 19, Nordic Pine & Chalk Sage)                   │
│  - 38% Candidate Roster (Live Rank & Badges)                                             │
│  - 62% Evaluation Canvas (Criterion Breakdown & Verbatim Citations)                      │
│  - Instant Slide-Over Forensic Audit Drawer ([D] Shortcut for Full ReAct Trace)          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Capabilities

### 1. Autonomous ReAct Reasoning Loop
Instead of rigid linear evaluation pipelines, the screening engine employs a goal-driven **ReAct State Machine** (`src/domain/agent.py`):
- **Iterative Reasoning Cycle**: Cycles through `Thought` $\rightarrow$ `Action` $\rightarrow$ `Observation` $\rightarrow$ `Reflection` per evaluation criterion.
- **Discriminated Tool Registry**: The agent interacts with the CV through strictly typed tool definitions:
  - `ParserTool`: Queries parsed structured sections (work experience, education, certifications).
  - `HybridRetrievalTool`: Executes dense semantic search (640-dim vector cosine similarity via `pgvector` HNSW) blended with lexical Full-Text Search using Reciprocal Rank Fusion (RRF, $k=60$):
    $$\text{RRF Score}(d) = \frac{1}{60 + \text{rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{rank}_{\text{sparse}}(d)}$$
  - `TaxonomyReflectorTool`: Queries hierarchical skills ontology (`config/taxonomy/`) for synonym and parent concept expansion when direct mentions are ambiguous.
  - `GroundedVerifierTool`: Submits curated evidence snippets to the micro-verifier with isolated context.
- **Reflection Budgeting & Latency Guarantees**: Reflection cycles are strictly capped at $K \le 3$ iterations per criterion with a 15-second total document processing cap, preventing runaway execution loops.
- **Auditable Trajectory Persistence**: Every step, reasoning trace, tool invocation, and observation is persisted as structured JSONB (`reasoning_trajectory`) for forensic auditing.

### 2. Jev TypeSafe Dual-Mode Verification
Traditional LLMs suffer from probabilistic overconfidence and hallucinated text generation. The verifier subsystem (`src/domain/verifier.py`) solves this by utilizing **Jev (TypeSafe)** closed-choice discrete classification:
- **Discrete Probability Space**: Rather than open-ended natural language generation, the verifier operates strictly on a closed classification space:
  $$\mathcal{Y} = \{\text{STRONG}, \text{PARTIAL}, \text{NOT\_DEMONSTRATED}\}$$
  Confidence scores are derived directly from the calibrated probability distribution:
  $$y^* = \arg\max_{y \in \mathcal{Y}} p_y, \quad c = p(y^*)$$
- **Dual-Mode Architecture**:
  - **Mode 1 (Local Heuristic Rule Engine)**: Deterministic, high-throughput offline evaluation utilizing taxonomy matching and rule sets—ideal for development and air-gapped environments.
  - **Mode 2 (Remote Jev System One Provider)**: Production-grade calibrated micro-verification via the official `typesafe-sdk`, eliminating subjective prompt drift.
- **Code-Level Verbatim Grounding Guardrails**:
  - Unicode canonical NFKC normalization and whitespace collapsing.
  - Length invariant: Quotes must be $\ge 5$ characters.
  - Substring verification: Quotes must exist verbatim in both the raw document and the retrieved evidence context.
  - Context Elevation Guard: Guarantees candidate claims cannot be elevated beyond the evidence present in the source text.

### 3. Anti-Adversarial PDF Sanitation & Defense
Modern candidates frequently employ prompt injection or SEO-style "keyword stuffing" techniques to manipulate automated ranking. The ingestion pipeline (`src/worker/pdf_inspector.py`) enforces binary-level security checks:
- **Invisible Text Detection**: Scans PDF content streams for Text Render Mode 3 (`3 Tr`), where glyphs are neither stroked nor filled.
- **Micro-Font Trap Mitigation**: Identifies and flags glyphs rendered at font sizes $< 2.0\text{ pt}$.
- **Low-Contrast / White-on-White Text**: Calculates color luminance contrast ratios; flags any text rendered with a contrast ratio $< 1.20:1$ against the document background.
- **Zero-Width Unicode Cleansing**: Strips non-rendering Unicode sequences (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`, `U+2060`) across document payloads.
- **Prompt Injection Neutralization**: Treats all extracted document content as passive text data within isolated evaluation contexts.

### 4. Executive Decision Studio (Tactile Light UI)
The frontend workbench (`frontend/`) delivers a bespoke, non-generic recruiter experience designed under strict ergonomic and accessibility principles:
- **Nordic Pine & Chalk Sage Palette**: High-contrast, calming tactile light mode designed for sustained cognitive focus without eye fatigue.
- **Progressive 4-Step Funnel**:
  1. *Job Description Specification*: Define role criteria, weights, and must-have constraints.
  2. *CV Ingestion & Pipeline Status*: Batch drag-and-drop upload with real-time processing indicators.
  3. *Screening & Verification*: Execution monitoring with streaming status.
  4. *Executive Dossier Workbench*: Deep-dive candidate comparison.
- **Master-Detail Dual Pane Workbench**:
  - **Left Roster (38% width)**: Sorted candidate roster with dynamic score badges, recommendation bands (Band A/B/C/R), and quick-filter controls.
  - **Right Canvas (62% width)**: Candidate dossier, score category radars, must-have compliance checklist, and expandable verbatim quotes.
- **Slide-Over Forensic Audit Drawer (`[D]`)**:
  - On-demand drawer triggered via keyboard shortcut `[D]` or UI toggle.
  - Exposes the raw autonomous ReAct trajectory, tool calls, verifier confidence scores, and verbatim grounding validation statuses.
- **Accessibility**: Zero unstyled components, strict keyboard navigation, and WCAG AAA compliance.

### 5. Golden Dataset Benchmark & Scorer Parity
System precision is validated against a golden evaluation dataset (`docs/spec/golden_dataset/`):
- **Benchmark Metrics**:
  - **NDCG@10**: $1.000$ (Optimal ranked order parity)
  - **Precision@5**: $1.000$ (Flawless top-5 candidate selection)
  - **Status Accuracy**: $100\%$ ($150/150$ criteria evaluations matched ground truth)
- **Scorer Determinism**: Golden dataset evaluation guarantees mathematical scoring parity across must-have violations, score capping, and tie-breaking algorithms.

---

## Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Language** | Python 3.12 | Core domain, ReAct state machine, typing |
| **API Framework** | FastAPI (uvicorn) | High-performance asynchronous REST API |
| **Database & Vector** | PostgreSQL 16 + `pgvector` | Relational storage + 640-dim HNSW vector indexing |
| **Async Worker** | Python Queue Daemon | `FOR UPDATE SKIP LOCKED` background job processor |
| **Micro-Verifier** | `typesafe-sdk` / Jev System One | Calibrated closed-choice verification |
| **Document Processing**| PyMuPDF + IBM Docling | Multi-format parsing & anti-adversarial PDF inspection |
| **Frontend Runtime** | Node.js 20+ / Vite | High-speed frontend bundling |
| **Frontend Framework**| React 19 + TypeScript | Master-detail UI with strict component typing |
| **Styling & Icons** | Tailwind CSS + Lucide Icons | Nordic Pine & Chalk Sage tactile light interface |
| **Code Quality** | Ruff + Mypy Strict | Linting and strict static typing (94 source files) |
| **Testing** | Pytest + Pytest-Asyncio | Deterministic test suites and benchmark runners |

---

## Quickstart & Installation

### Prerequisites
- **Linux / macOS** operating system
- **Python 3.12+**
- **PostgreSQL 16** with the `pgvector` extension installed
- **Node.js 20+** and **npm**

### 1. Clone & Python Environment
```bash
git clone https://github.com/alifihsan7/agentic-cv-screener.git
cd agentic-cv-screener

# Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# Install locked production and development dependencies
pip install -r requirements.lock
```

### 2. Environment Variables
Copy `.env.example` to `.env` and configure your environment:
```bash
cp .env.example .env
```

Key environment settings:
```ini
APP_ENV=development
APP_PORT=8110
APP_HOST=127.0.0.1

# Database Configuration
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/cv_screening

# Security Keys (Generate with openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here
PII_ENCRYPTION_KEY=your_pii_encryption_key_here

# TypeSafe System One Configuration (Jev Verifier)
TYPESAFE_API_KEY=your_typesafe_api_key_here
TYPESAFE_MODEL=jev-latest

# Storage Path for Uploaded Documents
STORAGE_VAULT_PATH=data/cv-vault
```

### 3. Database Migration & Seeding
Apply database schema migrations and seed default administrative credentials:
```bash
# Run Alembic migrations
make migrate
# (or: .venv/bin/alembic upgrade head)

# Seed default demo roles (Admin, Recruiter, Hiring Manager)
make seed
```

### 4. Running the Backend Services

#### Development Mode:
Open two terminal windows:
```bash
# Terminal 1: REST API Backend (Port 8110)
make run-api
# (or: .venv/bin/uvicorn src.api.main:app --host 127.0.0.1 --port 8110 --reload)

# Terminal 2: Background Screening Worker
make run-worker
# (or: PYTHONPATH=. .venv/bin/python -m src.worker.main)
```

#### Production Mode (Systemd):
```bash
# Check service statuses
sudo systemctl status cv-screening-api
sudo systemctl status cv-screening-worker

# Restart services after code updates
sudo systemctl restart cv-screening-api cv-screening-worker
```

### 5. Running & Building the Frontend
```bash
cd frontend

# Install npm dependencies
npm install

# Start local Vite development server
npm run dev

# Build optimized production bundle to dist/
npm run build
```

---

## Quality Gates & Automated Verification

The repository enforces strict continuous verification across typing, code style, benchmarks, and unit tests:

```bash
# 1. Static Type Checking (Strict Mypy across 94 source files)
make typecheck

# 2. Linting & Formatting Check (Ruff)
make lint

# 3. Golden Dataset Evaluation Benchmark (NDCG@10 validation)
make eval

# 4. Automated Pytest Test Suite
make test
```

---

## Provenance & Attribution

This project evolved from the initial CV screening and ranking foundation created by **[Rifqi Setiawan](https://github.com/Rifqi-Setiawan)** ([`Rifqi-Setiawan/ai-cv-screening-ranking`](https://github.com/Rifqi-Setiawan/ai-cv-screening-ranking.git)).

Subsequent architectural evolution, autonomous re-engineering, and extensions were developed by **[Alif Ihsan](https://github.com/alifihsan7)**:
- **Autonomous ReAct Agent Loop**: Transitioned from linear screening to an autonomous state machine with explicit reasoning trajectories, evidence grounding, and tool calls.
- **Jev TypeSafe Deterministic Verifier**: Integration of `typesafe-sdk` dual-mode verification (heuristic rule engine + System One LLM verifier) to eliminate hallucinated qualifications.
- **Adversarial Defense**: Anti-adversarial PDF inspection, invisible/zero-font text detection, and prompt-injection sanitization.
- **Executive Decision Studio**: Complete frontend redesign (Nordic Pine & Chalk Sage) featuring a 4-step progressive funnel, master-detail workbench, and an on-demand slide-over forensic audit drawer.
- **Golden Dataset & Quality Hardening**: End-to-end evaluation benchmark (NDCG@10), strict Pydantic v2 schemas, and 94-file static type checking.

---

## License

This project is licensed under the [MIT License](LICENSE).
