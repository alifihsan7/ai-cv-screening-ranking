"""Unit tests for granular evidence quote extraction on multi-column layouts and foreign section sanitization."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from typesafe_sdk import AsyncTypeSafeClient, ChoiceAnswer, SystemOneResponse, Usage

from src.domain.models import ContextSectionType, CriterionKind, EvaluationStatus
from src.domain.retrieval import extract_granular_evidence_quote
from src.domain.verifier import JevTypeSafeVerifierProvider, extract_verbatim_quote, verify_grounding


def test_multi_column_cv_mauludy_rakhman_extraction():
    """Validates quote isolation on multi-column flattened text without punctuation or newlines (CV Mauludy Rakhman scenario)."""
    text = (
        "Koordinator Asistensi Al-Kamil FMIPA UNRI Pekanbaru Melakukan perencanaan program pembinaan mahasiswa islam "
        "E D U C A T I O N Universitas Riau Sarjana Komputer 2017 - 2021 "
        "KEMAMPUAN TEKNIKAL Python, MySQL, FastAPI, Docker untuk backend development"
    )

    quote = extract_granular_evidence_quote(
        text=text,
        target_terms=["fastapi", "docker"],
        max_chars=119,
    )

    # Core criteria keywords must be present
    assert "FastAPI" in quote
    assert "Docker" in quote

    # Foreign section artifacts must NOT bleed into quote
    assert "E D U C A T I O N" not in quote
    assert "Universitas Riau" not in quote
    assert "Sarjana Komputer" not in quote
    assert "Al-Kamil" not in quote
    assert "FMIPA" not in quote

    # Strictly isolated under 120 characters
    assert len(quote) < 120

    # Grounding invariant: exact verbatim substring
    assert quote in text
    is_grounded, reason = verify_grounding(quote, text, [text])
    assert is_grounded is True
    assert reason == "VERIFIED"


def test_extract_verbatim_quote_integrates_granular_extractor():
    """Validates that extract_verbatim_quote in verifier domain delegates to granular extractor."""
    candidate_chunk = (
        "Koordinator Asistensi Al-Kamil FMIPA UNRI 2021 program pembinaan "
        "E D U C A T I O N Universitas Riau Sarjana Komputer 2017-2021 "
        "KEMAMPUAN TEKNIKAL Python, MySQL, FastAPI, Docker"
    )

    best_quote, best_score = extract_verbatim_quote(
        criterion_description="Python and FastAPI backend engineering",
        candidate_chunks=[candidate_chunk],
    )

    assert best_quote is not None
    assert best_score > 0.0
    assert len(best_quote) < 120
    assert "FastAPI" in best_quote
    assert "E D U C A T I O N" not in best_quote
    assert "Universitas Riau" not in best_quote
    assert best_quote in candidate_chunk


def test_reverse_column_ordering_education_criterion():
    """Validates foreign work experience cutoff when evaluating an education criterion."""
    text = (
        "Senior Software Engineer PT Solusi Handal merancang microservices Golang Kubernetes Docker "
        "EDUCATION Universitas Indonesia Sarjana Ilmu Komputer IPK 3.85"
    )

    quote = extract_granular_evidence_quote(
        text=text,
        target_terms=["sarjana", "komputer"],
        max_chars=119,
    )

    assert "Sarjana" in quote or "Komputer" in quote
    assert "Senior Software Engineer" not in quote
    assert "Golang" not in quote
    assert "Kubernetes" not in quote
    assert len(quote) < 120
    assert quote in text

    is_grounded, reason = verify_grounding(quote, text, [text])
    assert is_grounded is True
    assert reason == "VERIFIED"


def test_long_continuous_text_windowing_around_keyword():
    """Validates tight 15-30 char windowing snapped to word boundaries for long text (> 150 chars)."""
    text = (
        "Bertanggung jawab secara penuh dalam perancangan arsitektur backend sistem perbankan "
        "skala enterprise menggunakan framework FastAPI dan database PostgreSQL dengan throughput "
        "ribuan request per detik secara stabil tanpa degradasi performa."
    )

    quote = extract_granular_evidence_quote(
        text=text,
        target_terms=["fastapi"],
        max_chars=119,
    )

    assert "FastAPI" in quote
    assert len(quote) < 120
    assert quote in text

    # Verify that windowing did not slice words in half
    words = quote.split()
    assert all(len(w) > 0 for w in words)
    assert not quote.startswith(" ")
    assert not quote.endswith(" ")

    is_grounded, reason = verify_grounding(quote, text, [text])
    assert is_grounded is True
    assert reason == "VERIFIED"


def test_foreign_section_at_beginning_stripped():
    """Validates that foreign section labels at the beginning of a segment are excluded."""
    text = (
        "PENGALAMAN ORGANISASI Ketua Himpunan Mahasiswa Komputer 2020 "
        "PENGALAMAN KERJA Backend Developer di PT Inovasi merancang REST API dengan Python dan FastAPI"
    )

    quote = extract_granular_evidence_quote(
        text=text,
        target_terms=["python", "fastapi"],
        max_chars=119,
    )

    assert "FastAPI" in quote
    assert "Himpunan" not in quote
    assert "ORGANISASI" not in quote
    assert len(quote) < 120
    assert quote in text


@pytest.mark.asyncio
async def test_live_verifier_provider_multi_column_grounded_decision():
    """Validates end-to-end JevTypeSafeVerifierProvider isolation on multi-column CV candidate evidence."""
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    choice_ans = ChoiceAnswer(
        type="choice",
        choice="STRONG",
        confidence=0.95,
        probabilities={"STRONG": 0.95, "PARTIAL": 0.04, "NOT_DEMONSTRATED": 0.01},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=30, output_tokens=1),
        answers={"chunk_0": choice_ans},
    )
    mock_client.system_one.return_value = mock_response

    provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

    cv_text = (
        "Curriculum Vitae Mauludy Rakhman. "
        "Koordinator Asistensi Al-Kamil FMIPA UNRI Pekanbaru Melakukan perencanaan program pembinaan mahasiswa islam "
        "E D U C A T I O N Universitas Riau Sarjana Komputer 2017 - 2021 "
        "KEMAMPUAN TEKNIKAL Python, MySQL, FastAPI, Docker untuk backend development."
    )
    snippets = [
        "Koordinator Asistensi Al-Kamil FMIPA UNRI Pekanbaru Melakukan perencanaan program pembinaan mahasiswa islam "
        "E D U C A T I O N Universitas Riau Sarjana Komputer 2017 - 2021 "
        "KEMAMPUAN TEKNIKAL Python, MySQL, FastAPI, Docker untuk backend development"
    ]

    decision = await provider.verify(
        criterion_id="R_FASTAPI",
        criterion_description="FastAPI backend development",
        candidate_chunks=snippets,
        cv_full_text=cv_text,
        kind=CriterionKind.SKILL,
        context_type=ContextSectionType.WORK_EXPERIENCE,
    )

    assert decision.state == EvaluationStatus.STRONG
    assert decision.confidence == 0.95
    assert decision.quote is not None
    assert len(decision.quote) < 120
    assert "FastAPI" in decision.quote
    assert "E D U C A T I O N" not in decision.quote
    assert "Universitas Riau" not in decision.quote
    assert "Al-Kamil" not in decision.quote
    assert "GROUNDING_FAIL" not in decision.flags
    assert decision.char_start is not None
    assert decision.char_end is not None
    assert decision.char_end > decision.char_start
    assert cv_text[decision.char_start:decision.char_end].lower() == decision.quote.lower()
