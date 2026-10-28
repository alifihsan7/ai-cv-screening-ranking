"""Unit tests for dense paragraph and inline multi-job experience ingestion.

Validates that CVs with dense, inline, or flattened multi-column layouts containing
multiple date ranges per line are fully parsed into distinct job experience entities,
with properly isolated titles, organizations, bullets, and accurate interval-merged
total duration (>10 years / >120 months).
"""

from __future__ import annotations

import pytest

from src.domain.kind_rules import eval_experience_duration
from src.worker.adapter import parse_experiences


def test_dense_inline_experience_parsing_multi_entry_12_years():
    """Validates that a dense single-line paragraph with 6 distinct job entries

    spanning 2012 to 2025 (>12 years) is parsed completely into 6 separate entities
    without swallowing subsequent job titles into prior bullets, and stops at section boundary.
    """
    dense_text = (
        "RIWAYAT PENGALAMAN KERJA\n"
        "Senior Full Stack Developer - PT Solusi Digital (11/2024 – 06/2025) Mengembangkan arsitektur backend berbasis FastAPI dan microservices PostgreSQL. "
        "Lead Software Engineer - PT Inovasi Teknologi (07/2024 – 11/2024) Merancang message broker RabbitMQ dan caching Redis. "
        "Backend Developer - PT Karya Cipta (01/2024 – 07/2024) Mengimplementasikan RESTful API dan unit testing dengan pytest. "
        "Senior Programmer - PT Mandiri Sejahtera (06/2021 – 12/2023) Memelihara database MySQL dan query optimization. "
        "Web Developer - PT Cyber Nusantara (01/2018 – 05/2021) Membangun web application dengan PHP dan Vue.js. "
        "Junior Programmer - PT Sentra Media (06/2012 – 12/2017) Pengembangan modul ERP internal dan pelaporan transaksi.\n"
        "PENDIDIKAN\n"
        "S1 Teknik Informatika Universitas Indonesia (2008 – 2012)"
    )

    exps = parse_experiences(dense_text, dense_text, as_of="2025-06-30")

    # Invariant 1: Exactly the 6 jobs must be captured (no truncation at the first match, and stops at PENDIDIKAN)
    assert len(exps) == 6

    # Invariant 2: Dates are mapped accurately to start and end
    assert exps[0]["start"]["value"] == "2024-11"
    assert exps[0]["end"]["value"] == "2025-06"

    assert exps[1]["start"]["value"] == "2024-07"
    assert exps[1]["end"]["value"] == "2024-11"

    assert exps[2]["start"]["value"] == "2024-01"
    assert exps[2]["end"]["value"] == "2024-07"

    assert exps[3]["start"]["value"] == "2021-06"
    assert exps[3]["end"]["value"] == "2023-12"

    assert exps[4]["start"]["value"] == "2018-01"
    assert exps[4]["end"]["value"] == "2021-05"

    assert exps[5]["start"]["value"] == "2012-06"
    assert exps[5]["end"]["value"] == "2017-12"

    # Invariant 3: Title and organization isolation
    assert exps[0]["title"] == "Senior Full Stack Developer"
    assert exps[0]["organization"] == "PT Solusi Digital"

    assert exps[1]["title"] == "Lead Software Engineer"
    assert exps[1]["organization"] == "PT Inovasi Teknologi"

    assert exps[2]["title"] == "Backend Developer"
    assert exps[2]["organization"] == "PT Karya Cipta"

    assert exps[3]["title"] == "Senior Programmer"
    assert exps[3]["organization"] == "PT Mandiri Sejahtera"

    assert exps[4]["title"] == "Web Developer"
    assert exps[4]["organization"] == "PT Cyber Nusantara"

    assert exps[5]["title"] == "Junior Programmer"
    assert exps[5]["organization"] == "PT Sentra Media"

    # Invariant 4: Boundary isolation - bullets must belong to their respective job
    # and must NEVER swallow the next job's title or organization.
    b0_texts = [b["text"] for b in exps[0]["bullets"]]
    assert any("FastAPI" in t for t in b0_texts)
    assert not any("Lead Software Engineer" in t for t in b0_texts)
    assert not any("PT Inovasi Teknologi" in t for t in b0_texts)

    b1_texts = [b["text"] for b in exps[1]["bullets"]]
    assert any("RabbitMQ" in t for t in b1_texts)
    assert not any("Backend Developer" in t for t in b1_texts)

    b2_texts = [b["text"] for b in exps[2]["bullets"]]
    assert any("pytest" in t for t in b2_texts)
    assert not any("Senior Programmer" in t for t in b2_texts)

    b3_texts = [b["text"] for b in exps[3]["bullets"]]
    assert any("MySQL" in t for t in b3_texts)
    assert not any("Web Developer" in t for t in b3_texts)

    b4_texts = [b["text"] for b in exps[4]["bullets"]]
    assert any("PHP" in t for t in b4_texts)
    assert not any("Junior Programmer" in t for t in b4_texts)

    b5_texts = [b["text"] for b in exps[5]["bullets"]]
    assert any("ERP" in t for t in b5_texts)
    assert not any("PENDIDIKAN" in t for t in b5_texts)

    # Invariant 5: No duplicate bullets on single line entries
    for exp in exps:
        bullet_texts = [b["text"] for b in exp["bullets"]]
        assert len(bullet_texts) == len(set(bullet_texts))


def test_dense_inline_experience_duration_eval_greater_than_10_years():
    """Validates that interval merge in kind_rules accurately calculates the true total

    duration (>120 months / >10 years) and cites all relevant jobs in evidence.
    """
    dense_text = (
        "PENGALAMAN KERJA\n"
        "Senior Full Stack Developer - PT Solusi Digital (11/2024 – 06/2025) Mengembangkan arsitektur backend berbasis FastAPI dan microservices PostgreSQL. "
        "Lead Backend Engineer - PT Inovasi Teknologi (07/2024 – 11/2024) Merancang backend microservices, message broker RabbitMQ dan caching Redis. "
        "Backend Developer - PT Karya Cipta (01/2024 – 07/2024) Mengimplementasikan RESTful API dan unit testing dengan pytest. "
        "Senior Backend Programmer - PT Mandiri Sejahtera (06/2021 – 12/2023) Memelihara database MySQL dan optimasi backend query. "
        "Full Stack Developer - PT Cyber Nusantara (01/2018 – 05/2021) Membangun web application backend dengan PHP dan Vue.js. "
        "Junior Backend Programmer - PT Sentra Media (06/2012 – 12/2017) Pengembangan backend modul ERP internal dan pelaporan transaksi."
    )

    exps = parse_experiences(dense_text, dense_text, as_of="2025-06-30")
    profile = {"experiences": exps}

    req = {
        "id": "REQ-EXP-DURATION",
        "description": "Minimal 3 tahun pengalaman sebagai software developer / engineer",
        "params": {
            "min_months": 36,
            "accepted_role_families": ["backend", "fullstack"],
        },
    }

    state, confidence, metrics, evidence, flags = eval_experience_duration(
        profile=profile,
        req=req,
        as_of="2025-06-30",
        use_jev=False,
    )

    assert state == "STRONG"
    # Total duration from 2012-06 to 2025-06 should be > 120 months (> 10 years, ~157 months)
    total_months = metrics.get("backend_months", 0.0)
    assert total_months > 120.0, f"Expected > 120 months (>10 years), got {total_months}"

    # Evidence must cite all relevant entries, not just 1
    assert len(evidence) >= 5
    evidence_quotes = [e["quote"] for e in evidence]
    assert any("Senior Full Stack Developer" in q for q in evidence_quotes)
    assert any("Lead Backend Engineer" in q for q in evidence_quotes)
    assert any("Junior Backend Programmer" in q for q in evidence_quotes)

    # Ensure none were misclassified as internship due to substring 'internal'
    for ev in evidence:
        assert ev.get("context") != "internship"


def test_dense_inline_experience_bullet_delimited_and_pipes():
    """Validates inline jobs separated by pipes, bullet symbols, and commas."""
    text = (
        "PENGALAMAN KERJA\n"
        "Full Stack Developer | PT Alpha | 11/2024 – 06/2025 | Developed backend microservices • "
        "Senior Programmer | PT Beta | 01/2020 – 10/2024 | Maintained database systems"
    )

    exps = parse_experiences(text, text, as_of="2025-06-30")
    assert len(exps) == 2

    assert exps[0]["title"] == "Full Stack Developer"
    assert exps[0]["organization"] == "PT Alpha"
    assert exps[0]["start"]["value"] == "2024-11"
    assert exps[0]["end"]["value"] == "2025-06"
    assert any("Developed backend microservices" in b["text"] for b in exps[0]["bullets"])

    assert exps[1]["title"] == "Senior Programmer"
    assert exps[1]["organization"] == "PT Beta"
    assert exps[1]["start"]["value"] == "2020-01"
    assert exps[1]["end"]["value"] == "2024-10"
    assert any("Maintained database systems" in b["text"] for b in exps[1]["bullets"])


def test_dense_inline_mixed_multiline_and_same_line_entries():
    """Validates that a mix of inline multiple jobs and traditional multiline jobs parse cleanly."""
    text = (
        "Senior Software Engineer PT Horizon (01/2024 - 06/2025) Built cloud native APIs. Backend Engineer PT Vertex (01/2023 - 12/2023)\n"
        "- Scaled database cluster\n"
        "- Implemented event streaming\n"
        "Junior Developer\n"
        "PT Genesis\n"
        "2021 - 2022\n"
        "- Front-end and backend maintenance"
    )

    exps = parse_experiences(text, text, as_of="2025-06-30")
    assert len(exps) == 3

    assert exps[0]["title"] == "Senior Software Engineer"
    assert exps[0]["organization"] == "PT Horizon"
    assert exps[0]["start"]["value"] == "2024-01"
    assert exps[0]["end"]["value"] == "2025-06"

    assert exps[1]["title"] == "Backend Engineer"
    assert exps[1]["organization"] == "PT Vertex"
    assert exps[1]["start"]["value"] == "2023-01"
    assert exps[1]["end"]["value"] == "2023-12"
    assert len(exps[1]["bullets"]) >= 1

    assert exps[2]["title"] == "Junior Developer"
    assert exps[2]["organization"] == "PT Genesis"
    assert exps[2]["start"]["value"] == "2021"
    assert exps[2]["end"]["value"] == "2022"
