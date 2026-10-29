"""Tests for Multi-Span Verbatim Grounding and Hybrid CV/Portfolio Ingestion.

Covers:
1. Multi-span quote splitting with canonical delimiters (\\n...\\n, [...], list of strings)
2. Verbatim grounding invariant across multi-span quotes (zero-hallucination)
3. Elimination of synthetic prefixes in kind_rules
4. Pre-flight document classifier with hybrid CV/portfolio support
5. Smart boundary isolation for hybrid documents
"""

from typing import Any
import pytest

from src.domain.agent import ScreeningAgent
from src.domain.models import (
    ContextSectionType,
    EvaluationStatus,
    EvidenceCitation,
    QuoteSpan,
    split_quote_spans,
)
from src.domain.kind_rules import eval_leadership, eval_skill
from src.domain.verifier import VerifierDecision, verify_grounding
from src.worker.boundary import isolate_document_boundaries
from src.worker.classifier import classify_document_is_cv


class TestMultiSpanQuoteSplitting:
    """Tests for split_quote_spans and delimiter regex."""

    def test_single_span_without_delimiters(self):
        quote = "Developed scalable RESTful APIs using FastAPI and PostgreSQL."
        spans = split_quote_spans(quote)
        assert len(spans) == 1
        assert spans[0] == quote

    def test_split_with_newline_ellipsis(self):
        quote = "Led a squad of 6 engineers.\n...\nDelivered microservices on Kubernetes."
        spans = split_quote_spans(quote)
        assert len(spans) == 2
        assert spans[0] == "Led a squad of 6 engineers."
        assert spans[1] == "Delivered microservices on Kubernetes."

    def test_split_with_bracketed_ellipsis(self):
        quote = "Proficient in Python and Go [...] designed event-driven architecture with Kafka."
        spans = split_quote_spans(quote)
        assert len(spans) == 2
        assert spans[0] == "Proficient in Python and Go"
        assert spans[1] == "designed event-driven architecture with Kafka."

    def test_split_with_unicode_ellipsis(self):
        quote = "Managed PostgreSQL clusters\n…\nOptimized query latency by 45%."
        spans = split_quote_spans(quote)
        assert len(spans) == 2
        assert spans[0] == "Managed PostgreSQL clusters"
        assert spans[1] == "Optimized query latency by 45%."

    def test_split_with_bracketed_unicode_ellipsis(self):
        quote = "Backend Engineer at PT Tech [ … ] Responsible for cloud deployment on AWS."
        spans = split_quote_spans(quote)
        assert len(spans) == 2
        assert spans[0] == "Backend Engineer at PT Tech"
        assert spans[1] == "Responsible for cloud deployment on AWS."

    def test_list_of_strings_input(self):
        input_spans = [
            "Senior Backend Engineer (2020-2023)",
            "Implemented CI/CD pipelines with GitHub Actions",
        ]
        spans = split_quote_spans(input_spans)
        assert spans == input_spans

    def test_empty_or_whitespace_handling(self):
        assert split_quote_spans("") == []
        assert split_quote_spans(None) == []
        assert split_quote_spans("   \n\n  ") == []
        assert split_quote_spans(["", "   "]) == []


class TestMultiSpanVerbatimGrounding:
    """Verifies that multi-span quotes strictly satisfy zero-hallucination invariants."""

    @pytest.fixture
    def sample_cv(self):
        return (
            "Alif Ihsan\n"
            "alif@example.com | 08123456789\n\n"
            "PENGALAMAN KERJA\n"
            "PT Solaris Inovasi - Senior Backend Engineer (2021 - 2024)\n"
            "Membangun arsitektur microservices berbasis FastAPI dan asynchronous worker.\n"
            "Mengelola database PostgreSQL dengan migrasi otomatis menggunakan Alembic.\n\n"
            "PENDIDIKAN\n"
            "Institut Teknologi Bandung - S1 Teknik Informatika (2017 - 2021)\n\n"
            "KEAHLIAN\n"
            "Python, FastAPI, PostgreSQL, Docker, Redis\n"
        )

    def test_valid_multi_span_quote_passes(self, sample_cv):
        quote = (
            "Senior Backend Engineer (2021 - 2024)\n"
            "...\n"
            "Membangun arsitektur microservices berbasis FastAPI"
        )
        snippet = "PT Solaris Inovasi - Senior Backend Engineer (2021 - 2024)\nMembangun arsitektur microservices berbasis FastAPI dan asynchronous worker."

        ok, reason = verify_grounding(quote, sample_cv, [snippet])
        assert ok is True
        assert reason == "VERIFIED"

    def test_valid_multi_span_bracketed_passes(self, sample_cv):
        quote = "Membangun arsitektur microservices [...] Mengelola database PostgreSQL"
        snippets = [
            "Membangun arsitektur microservices berbasis FastAPI dan asynchronous worker.",
            "Mengelola database PostgreSQL dengan migrasi otomatis menggunakan Alembic.",
        ]
        ok, reason = verify_grounding(quote, sample_cv, snippets)
        assert ok is True
        assert reason == "VERIFIED"

    def test_multi_span_missing_from_cv_fails(self, sample_cv):
        # First span is in CV, second span is completely fabricated
        quote = (
            "Senior Backend Engineer (2021 - 2024)\n"
            "...\n"
            "Invented quantum computing algorithms for banking"
        )
        ok, reason = verify_grounding(quote, sample_cv, [sample_cv])
        assert ok is False
        assert reason == "GROUNDING_FAIL_NOT_IN_CV"

    def test_multi_span_missing_from_snippets_fails(self, sample_cv):
        # Both spans are in CV, but second span is NOT in retrieved snippets
        quote = (
            "Senior Backend Engineer (2021 - 2024)\n"
            "...\n"
            "Institut Teknologi Bandung - S1 Teknik Informatika"
        )
        # Snippets only contain work experience, not education
        snippet = "PT Solaris Inovasi - Senior Backend Engineer (2021 - 2024)\nMembangun arsitektur microservices berbasis FastAPI"

        ok, reason = verify_grounding(quote, sample_cv, [snippet])
        assert ok is False
        assert reason == "GROUNDING_FAIL_NOT_IN_SNIPPET"

    def test_multi_span_span_too_short_fails(self, sample_cv):
        quote = "FastAPI\n...\nIT"
        ok, reason = verify_grounding(quote, sample_cv, [sample_cv])
        assert ok is False
        assert reason == "QUOTE_TOO_SHORT"

    def test_nfkc_normalization_across_multispan(self):
        # Fullwidth and decomposed characters
        cv_text = "Experienced in Ｐｙｔｈｏｎ backend systems and Ｄｏｃｋｅｒ deployment."
        quote = "Python backend systems [...] Docker deployment"
        ok, reason = verify_grounding(quote, cv_text, [cv_text])
        assert ok is True
        assert reason == "VERIFIED"


class TestModelsAndAgentBoundsCalculation:
    """Verifies EvidenceCitation, QuoteSpan, and agent bounds calculation."""

    def test_agent_quote_bounds_multi_span(self):
        full_text = (
            "Header Information\n"
            "Line 1: Software Engineer\n"
            "Line 2: Middle filler content\n"
            "Line 3: Kubernetes clusters"
        )
        agent = ScreeningAgent(
            job_id="test_job",
            candidate_id="test_cand",
            requirements=[],
            profile={},
            raw_cv_text=full_text,
        )
        quote = "Software Engineer\n...\nKubernetes clusters"
        char_start, char_end = agent._locate_quote_bounds(quote, ContextSectionType.WORK_EXPERIENCE)
        assert char_start == full_text.index("Software Engineer")
        assert char_end == full_text.index("Kubernetes clusters") + len("Kubernetes clusters")
        assert char_end > char_start

    def test_evidence_citation_with_quote_spans(self):
        spans = [
            QuoteSpan(text="Software Engineer", char_start=10, char_end=27, source_section="experience"),
            QuoteSpan(text="Kubernetes clusters", char_start=60, char_end=79, source_section="experience"),
        ]
        citation = EvidenceCitation(
            criterion_id="crit_1",
            verbatim_quote="Software Engineer [...] Kubernetes clusters",
            char_start=10,
            char_end=79,
            source_section="experience",
            spans=["Software Engineer", "Kubernetes clusters"],
            detailed_spans=spans,
        )
        assert len(citation.detailed_spans) == 2
        assert citation.detailed_spans[0].text == "Software Engineer"
        assert citation.detailed_spans[1].text == "Kubernetes clusters"
        assert citation.spans == ["Software Engineer", "Kubernetes clusters"]

    def test_verifier_decision_spans_field(self):
        decision = VerifierDecision(
            state=EvaluationStatus.STRONG,
            confidence=0.95,
            quote="Python [...] FastAPI",
            reason="Valid qualification demonstrated",
            spans=["Python", "FastAPI"],
        )
        assert decision.spans == ["Python", "FastAPI"]
        assert decision.state == EvaluationStatus.STRONG


class TestZeroSyntheticPrefixesInKindRules:
    """Ensures deterministic rule verifiers do not inject synthetic labels."""

    def test_skill_profile_returns_raw_skill_name(self):
        cv = {
            "skills": ["Python", "PostgreSQL", "Docker"],
            "experiences": [],
            "summary": "Experienced software architect",
        }
        req = {"concepts": ["skill:python"], "params": {}}
        status, conf, params, evidence, flags = eval_skill(cv, req)
        assert status == "PARTIAL"
        assert len(evidence) > 0
        for ev in evidence:
            quote = ev.get("quote", "")
            assert not quote.startswith("Skills:")
            assert not quote.startswith("Summary:")
            assert quote == "Python"

    def test_skill_summary_fallback_returns_raw_text(self):
        cv = {
            "skills": [],
            "experiences": [],
            "summary": "Deep expertise in Python microservices development.",
        }
        req = {"concepts": ["skill:python"], "params": {}}
        status, conf, params, evidence, flags = eval_skill(cv, req)
        assert status == "PARTIAL"
        assert len(evidence) > 0
        for ev in evidence:
            quote = ev.get("quote", "")
            assert not quote.startswith("Skills:")
            assert not quote.startswith("Summary:")
            assert "Python" in quote

    def test_leadership_experience_returns_raw_quote(self):
        cv = {
            "experiences": [
                {
                    "title": "Lead Backend Engineer",
                    "bullets": [{"text": "Led a cross-functional team of 10 software engineers building core payments."}],
                    "start_date": "2020-01",
                    "end_date": "2023-01",
                }
            ],
            "skills": [],
        }
        req = {"concepts": ["leadership"], "params": {}}
        status, conf, params, evidence, flags = eval_leadership(cv, req)
        assert status == "STRONG"
        assert len(evidence) > 0
        for ev in evidence:
            quote = ev.get("quote", "")
            assert not quote.startswith("Lead Backend Engineer:")
            assert not quote.startswith("Leadership:")


class TestHybridPortfolioAndDocumentClassifier:
    """Verifies that hybrid CV/portfolio files are classified as CV with boundaries isolated."""

    def test_cv_followed_by_portfolio_is_classified_as_cv(self):
        # Simulates a document with portfolio attachment
        pages = [
            {
                "page_num": 1,
                "text": (
                    "CURRICULUM VITAE\n"
                    "Budi Santoso\n"
                    "Email: budi@example.com | Telp: +6281234567890\n\n"
                    "PROFIL PROFESIONAL\n"
                    "Software engineer berpengalaman dalam pengembangan web dan mobile.\n\n"
                    "RIWAYAT PENDIDIKAN\n"
                    "Universitas Indonesia - S1 Ilmu Komputer (2018 - 2022)\n\n"
                    "PENGALAMAN KERJA\n"
                    "Fullstack Developer di PT Solusi Digital (2022 - Sekarang)\n"
                    "Mengembangkan fitur frontend dan backend REST API.\n\n"
                    "KEAHLIAN\n"
                    "Python, JavaScript, React, PostgreSQL"
                ),
                "image_count": 1,
            },
            {
                "page_num": 2,
                "text": "LAMPIRAN PORTOFOLIO PROYEK\nProyek 1: E-Commerce Mobile App\nDesain antarmuka pengguna dan integrasi API payment.",
                "image_count": 3,
            },
            {
                "page_num": 3,
                "text": "Proyek 2: ERP Dashboard Perusahaan\nVisualisasi data analytics dan reporting keuangan.",
                "image_count": 4,
            },
        ]
        full_text = "\n\n".join(p["text"] for p in pages)

        res = classify_document_is_cv(full_text, page_count=3, total_images=8, pages=pages)
        assert res.is_cv is True
        assert res.doc_type == "CV"
        assert "NOT_A_CV" not in res.flags
        assert "HYBRID_PORTFOLIO_CV" in res.flags or "BOUNDARY_ISOLATED" in res.flags
        assert 1 in res.cv_core_pages

    def test_portfolio_followed_by_cv_is_classified_as_cv(self):
        pages = [
            {
                "page_num": 1,
                "text": "CREATIVE PORTFOLIO 2024\nShowcase Karya Arsitektur & Desain Produk",
                "image_count": 5,
            },
            {
                "page_num": 2,
                "text": "Project Showcase: Modern House 3D Visualization",
                "image_count": 4,
            },
            {
                "page_num": 3,
                "text": (
                    "DAFTAR RIWAYAT HIDUP\n"
                    "Budi Pratama\n"
                    "Kontak: budi@pratama.me | 081987654321\n"
                    "PENGALAMAN KERJA\n"
                    "Architectural Designer di Studio Rancang (2020-2023)\n"
                    "RIWAYAT PENDIDIKAN\n"
                    "S1 Arsitektur ITB\n"
                    "KEAHLIAN\n"
                    "AutoCAD, Revit, SketchUp, Blender"
                ),
                "image_count": 1,
            },
        ]
        full_text = "\n\n".join(p["text"] for p in pages)

        res = classify_document_is_cv(full_text, page_count=3, total_images=10, pages=pages)
        assert res.is_cv is True
        assert res.doc_type == "CV"
        assert "NOT_A_CV" not in res.flags

    def test_pure_portfolio_without_cv_sections_is_rejected(self):
        pages = [
            {
                "page_num": 1,
                "text": "CREATIVE PORTFOLIO 2024\nKoleksi Desain Grafis dan Branding Agensi",
                "image_count": 6,
            },
            {
                "page_num": 2,
                "text": "Brand Identity Design for Coffee Shop\nLogo, Packaging, and Social Media Kit",
                "image_count": 8,
            },
        ]
        full_text = "\n\n".join(p["text"] for p in pages)

        res = classify_document_is_cv(full_text, page_count=2, total_images=14, pages=pages)
        assert res.is_cv is False
        assert res.doc_type == "PURE_PORTFOLIO"
        assert "NOT_A_CV" in res.flags

    def test_boundary_isolator_on_hybrid_cv(self):
        pages = [
            {
                "text": (
                    "Ahmad Fauzan\n"
                    "ahmad@email.com\n"
                    "PENGALAMAN KERJA:\n"
                    "Backend Engineer (2021-2024)\n"
                    "RIWAYAT PENDIDIKAN:\n"
                    "S1 Teknik Informatika\n"
                    "KEAHLIAN:\n"
                    "Python, Django, PostgreSQL"
                ),
                "image_count": 0,
            },
            {
                "text": "LAMPIRAN PORTOFOLIO PROYEK\nScreenshots sistem pembayaran",
                "image_count": 3,
            },
        ]
        boundary = isolate_document_boundaries(pages)
        assert boundary.cv_core_pages == [1]
        assert boundary.attachment_pages == [2]


def test_an_ordinary_cv_is_not_a_hybrid_portfolio_even_when_it_links_a_portfolio():
    cv_page = {
        "page_num": 1,
        "text": (
            "Dewi Contoh\ndewi@example.com +62 812 0000 0000\nPortfolio: dewi.example.com (Portfolio)\n"
            "Pengalaman\nBackend Developer di PT Contoh (Januari 2022 - Sekarang)\nMembangun REST API.\n"
            "Pendidikan\nS1 Teknik Informatika, Universitas Contoh (2018 - 2022)\nKeahlian\nPython, PostgreSQL, Docker"
        ),
        "image_count": 0,
    }
    res = classify_document_is_cv(cv_page["text"], page_count=1, total_images=0, pages=[cv_page])
    assert res.is_cv is True
    assert "HYBRID_PORTFOLIO_CV" not in res.flags
