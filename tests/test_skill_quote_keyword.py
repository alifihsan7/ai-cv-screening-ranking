"""SKILL evidence quotes must contain the keyword that triggered them, even when it sits late in long text."""

from __future__ import annotations

import pytest

from src.domain.kind_rules import eval_skill
from src.domain.verifier import verify_grounding

DOCKER_REQ = {"requirement_id": "R5", "description": "Docker", "kind": "SKILL", "concepts": ["skill:docker"]}

# Mirrors candidate M3 of the golden set: OCR noise and a long title before the sentence naming Docker
LONG_PROJECT = (
    "ata\nKn\nTugas Akhir: Sistem Informasi Perpustakaan — Universitas Nusantara Raya2025\n"
    "* Dibangun dengan FastAPI, PostgreSQL, dan Docker; dipakai 200 mahasiswa."
)


def test_project_quote_keeps_a_keyword_that_sits_past_120_chars():
    assert LONG_PROJECT.lower().index("docker") > 120

    state, _, _, evidence, _ = eval_skill({"projects": [{"text": LONG_PROJECT}]}, DOCKER_REQ)

    assert state == "PARTIAL"
    quote = evidence[0]["quote"]
    assert "docker" in quote.lower()
    assert len(quote) <= 120
    assert verify_grounding(quote, LONG_PROJECT)[0]


def test_experience_bullet_quote_keeps_a_late_keyword():
    bullet = (
        "Merancang dan memelihara pipeline integrasi berkelanjutan untuk seluruh layanan internal perusahaan, "
        "termasuk pengemasan seluruh layanan memakai Docker pada lingkungan produksi."
    )
    assert bullet.lower().index("docker") > 120

    profile = {"experiences": [{"title": "Backend Engineer", "bullets": [{"text": bullet}]}]}
    state, _, _, evidence, _ = eval_skill(profile, DOCKER_REQ)

    assert state == "STRONG"
    assert "docker" in evidence[0]["quote"].lower()
    assert evidence[0]["quote"].strip(" ,;:-") in bullet


def test_summary_quote_keeps_a_late_keyword():
    summary = (
        "Lulusan baru Teknik Informatika dengan minat pada pengembangan layanan web dan analisis data skala kecil, "
        "terbiasa mengemas aplikasi memakai Docker untuk keperluan pengujian."
    )
    assert summary.lower().index("docker") > 120

    state, _, _, evidence, _ = eval_skill({"summary": summary}, DOCKER_REQ)

    assert state == "PARTIAL"
    assert "docker" in evidence[0]["quote"].lower()


@pytest.mark.parametrize("text", ["Membangun API dengan Docker", "Docker dan Kubernetes untuk deployment"])
def test_short_text_is_returned_whole(text):
    _, _, _, evidence, _ = eval_skill({"projects": [{"text": text}]}, DOCKER_REQ)

    assert evidence[0]["quote"] == text
