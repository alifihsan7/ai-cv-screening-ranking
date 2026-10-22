"""Comprehensive unit tests for Fase 1: Typesafe Pydantic Domain & Anti-Adversarial PDF Inspection."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pymupdf as fitz
import pytest
from pydantic import ValidationError

from src.domain.models import (
    AgentPhase,
    ContextSectionType,
    CriterionCategory,
    CriterionImportance,
    CriterionKind,
    CriterionParams,
    DateInterval,
    EvaluationMethod,
    EvaluationMetrics,
    EvaluationStatus,
    EvidenceCitation,
    GeneralActionInput,
    ReasoningStep,
    RetrievalActionInput,
    ScreeningAgentState,
    TaxonomyActionInput,
    VerifierActionInput,
    compute_calendar_duration_months,
)
from src.worker.pdf_inspector import (
    calculate_contrast_against_white,
    inspect_pdf_adversarial,
    normalize_canonical_text,
)
from src.worker.sanitizer import sanitize_file

# ===========================================================================
# 1. Domain Models & Pydantic Typesafety Tests
# ===========================================================================


class TestEvaluationStatusAndEnums:
    def test_evaluation_status_has_unknown(self):
        assert EvaluationStatus.UNKNOWN.value == "UNKNOWN"
        assert set(s.value for s in EvaluationStatus) == {
            "STRONG",
            "PARTIAL",
            "NOT_DEMONSTRATED",
            "UNKNOWN",
        }

    def test_evaluation_method_members(self):
        assert EvaluationMethod.DETERMINISTIC_RULE.value == "DETERMINISTIC_RULE"
        assert EvaluationMethod.JEV_TYPESAFE.value == "JEV_TYPESAFE"
        assert EvaluationMethod.HYBRID_SEMANTIC.value == "HYBRID_SEMANTIC"
        assert EvaluationMethod.LLM_VERIFIED.value == "LLM_VERIFIED"
        assert EvaluationMethod.HUMAN_OVERRIDE.value == "HUMAN_OVERRIDE"

    def test_criterion_enums(self):
        assert CriterionKind.EXPERIENCE_DURATION.value == "EXPERIENCE_DURATION"
        assert CriterionImportance.MUST_HAVE.value == "MUST_HAVE"
        assert CriterionCategory.EXPERIENCE.value == "EXPERIENCE"
        assert AgentPhase.INIT.value == "INIT"
        assert ContextSectionType.WORK_EXPERIENCE.value == "WORK_EXPERIENCE"


class TestDateIntervalValidation:
    def test_valid_calendar_months(self):
        iv = DateInterval(start_date="2020-01", end_date="2020-12")
        assert iv.duration_months == 12

        iv2 = DateInterval(start_date="2020-03", end_date="2022-05")
        # (2022 - 2020) * 12 + (5 - 3) + 1 = 24 + 2 + 1 = 27 months
        assert iv2.duration_months == 27

        iv3 = DateInterval(start_date="2021-06", end_date="2021-06")
        assert iv3.duration_months == 1

    def test_rejects_invalid_calendar_months(self):
        # Month 13 is invalid
        with pytest.raises(ValidationError):
            DateInterval(start_date="2020-13", end_date="2021-05")

        # Month 00 is invalid
        with pytest.raises(ValidationError):
            DateInterval(start_date="2020-00", end_date="2021-05")

        # Invalid end month 99
        with pytest.raises(ValidationError):
            DateInterval(start_date="2020-01", end_date="2021-99")

    def test_rejects_reversed_date_range(self):
        with pytest.raises(ValidationError, match="must be greater than or equal to start_date"):
            DateInterval(start_date="2023-05", end_date="2021-03")

    def test_year_only_dates_and_arithmetic(self):
        iv = DateInterval(start_date="2020", end_date="2022")
        # (2022 - 2020) * 12 + (12 - 1) + 1 = 24 + 11 + 1 = 36 months
        assert iv.duration_months == 36

    def test_current_date_duration(self):
        iv = DateInterval(start_date="2020-01", is_current=True)
        now_utc = datetime.now(UTC).date()
        expected = (now_utc.year - 2020) * 12 + (now_utc.month - 1) + 1
        assert iv.duration_months == expected

    def test_compute_calendar_duration_helper(self):
        res = compute_calendar_duration_months("2021-01", "2021-06")
        assert res == 6


class TestEvidenceCitationValidation:
    def test_valid_evidence_citation(self):
        cit = EvidenceCitation(
            criterion_id="R1",
            verbatim_quote="Developed distributed backend systems in Python",
            char_start=150,
            char_end=198,
            source_section="Work Experience",
            context_type=ContextSectionType.WORK_EXPERIENCE,
        )
        assert cit.criterion_id == "R1"
        assert cit.char_start == 150
        assert cit.char_end == 198
        assert cit.is_grounded is True

    def test_rejects_inverted_char_offsets(self):
        with pytest.raises(ValidationError, match="char_end must be strictly greater than char_start"):
            EvidenceCitation(
                criterion_id="R1",
                verbatim_quote="Sample verbatim quote text",
                char_start=100,
                char_end=50,
            )

    def test_rejects_equal_char_offsets(self):
        with pytest.raises(ValidationError, match="char_end must be strictly greater than char_start"):
            EvidenceCitation(
                criterion_id="R1",
                verbatim_quote="Sample verbatim quote text",
                char_start=100,
                char_end=100,
            )

    def test_rejects_short_quote(self):
        with pytest.raises(ValidationError):
            EvidenceCitation(
                criterion_id="R1",
                verbatim_quote="abc",
                char_start=0,
                char_end=3,
            )

    def test_rejects_negative_offset(self):
        with pytest.raises(ValidationError):
            EvidenceCitation(
                criterion_id="R1",
                verbatim_quote="Valid text quote",
                char_start=-5,
                char_end=10,
            )


class TestStronglyTypedMetricsAndParams:
    def test_evaluation_metrics_fields(self):
        metrics = EvaluationMetrics(
            backend_months=88.0,
            similarity_score=0.95,
            matched_skills=["python", "postgresql"],
        )
        assert metrics.backend_months == 88.0
        assert metrics.similarity_score == 0.95
        assert metrics.matched_skills == ["python", "postgresql"]

    def test_evaluation_metrics_forbids_arbitrary_keys(self):
        with pytest.raises(ValidationError):
            EvaluationMetrics(unregistered_loose_key="slop")  # type: ignore[call-arg]

    def test_criterion_params_typed(self):
        params = CriterionParams(min_months=36, keywords=["python", "fastapi"])
        assert params.min_months == 36
        assert params.keywords == ["python", "fastapi"]

        with pytest.raises(ValidationError):
            CriterionParams(unknown_param=123)  # type: ignore[call-arg]


class TestDiscriminatedUnionActionInput:
    def test_retrieval_action_input(self):
        inp = RetrievalActionInput(query="Python backend engineer", top_k=3)
        assert inp.action_type == "HYBRID_RETRIEVAL"
        assert inp.top_k == 3

    def test_taxonomy_action_input(self):
        inp = TaxonomyActionInput(concept_id="skill:postgresql", expansion_depth=2)
        assert inp.action_type == "TAXONOMY_REFLECTOR"
        assert inp.expansion_depth == 2

    def test_verifier_action_input(self):
        inp = VerifierActionInput(
            criterion_id="R2",
            context_snippets=["Managed PostgreSQL cluster with 10M rows"],
            provider="JEV_TYPESAFE",
        )
        assert inp.action_type == "GROUNDED_VERIFIER"
        assert inp.provider == "JEV_TYPESAFE"

    def test_general_action_input(self):
        inp = GeneralActionInput(parameters=["mode:deep_eval"])
        assert inp.action_type == "GENERAL"
        assert inp.parameters == ["mode:deep_eval"]

    def test_reasoning_step_with_utc_timestamp(self):
        step = ReasoningStep(
            step_number=1,
            thought="Candidate lacks explicit mention of Kubernetes",
            action="HYBRID_RETRIEVAL",
            action_input=RetrievalActionInput(query="kubernetes k8s orchestration"),
            observation="Found 1 match in Projects section",
            state_mutation="R5",
        )
        assert step.step_number == 1
        assert isinstance(step.timestamp_utc, datetime)
        assert step.timestamp_utc.tzinfo is not None

    def test_screening_agent_state(self):
        state = ScreeningAgentState(
            session_id="sess_123",
            job_id="job_456",
            candidate_id="cand_789",
            current_phase=AgentPhase.EVALUATING,
        )
        assert state.session_id == "sess_123"
        assert state.is_terminal is False
        assert state.reflection_budget_spent == 0


# ===========================================================================
# 2. Anti-Adversarial PDF Inspection & Canonical Text Normalization Tests
# ===========================================================================


class TestContrastRatioCalculation:
    def test_pure_white_text_gives_one_to_one_ratio(self):
        # Pure white text (RGB 255, 255, 255)
        cr = calculate_contrast_against_white((255, 255, 255))
        assert abs(cr - 1.0) < 0.01

    def test_pure_black_text_gives_maximum_contrast(self):
        # Pure black text (RGB 0, 0, 0)
        cr = calculate_contrast_against_white((0, 0, 0))
        # 1.05 / 0.05 = 21.0
        assert abs(cr - 21.0) < 0.01

    def test_near_white_fails_wcag_threshold(self):
        # Near-white text RGB (250, 250, 250)
        cr = calculate_contrast_against_white((250, 250, 250))
        assert cr < 1.20


class TestCanonicalTextNormalization:
    def test_dehyphenation_across_lines(self):
        raw = "We are look-\ning for an experi-\nenced backend developer."
        canonical = normalize_canonical_text(raw)
        assert "looking for an experienced backend developer." in canonical

    def test_zero_width_unicode_stripped_in_canonical(self):
        raw = "Senior\u200b Backend\ufeff Engineer\u200c with\u200d Python"
        canonical = normalize_canonical_text(raw)
        assert canonical == "Senior Backend Engineer with Python"

    def test_nfkc_unicode_normalization(self):
        # Compatibility character e.g. ligature ﬁ (U+FB01)
        raw = "Proﬁcient in PostgreSQL"
        canonical = normalize_canonical_text(raw)
        assert canonical == "Proficient in PostgreSQL"


class TestPdfAdversarialScanner:
    def test_detects_tiny_font(self):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Standard visible text here", fontsize=11, color=(0, 0, 0))
        page.insert_text((50, 70), "Secret adversarial prompt injection", fontsize=1.2, color=(0, 0, 0))
        pdf_bytes = doc.tobytes()
        doc.close()

        report = inspect_pdf_adversarial(pdf_bytes)
        assert report.has_hidden_text is True
        assert "HIDDEN_TEXT" in report.flags
        tiny_findings = [f for f in report.findings if f.finding_type == "TINY_FONT"]
        assert len(tiny_findings) >= 1
        assert "1.20 pt < 2.0 pt" in tiny_findings[0].detail

    def test_detects_low_contrast_white_text(self):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Senior Python Engineer", fontsize=12, color=(0, 0, 0))
        page.insert_text((50, 100), "Hidden white prompt injection keywords", fontsize=12, color=(1.0, 1.0, 1.0))
        pdf_bytes = doc.tobytes()
        doc.close()

        report = inspect_pdf_adversarial(pdf_bytes)
        assert report.has_hidden_text is True
        assert "HIDDEN_TEXT" in report.flags
        white_findings = [f for f in report.findings if f.finding_type == "LOW_CONTRAST_WHITE"]
        assert len(white_findings) >= 1

    def test_detects_zero_width_unicode_in_pdf(self):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Senior Engineer", fontsize=12, color=(0, 0, 0))
        pdf_bytes = doc.tobytes()
        doc.close()

        # Injects UTF-8 zero-width byte \xe2\x80\x8b (U+200B) into the PDF stream
        tampered_pdf = pdf_bytes + b"\n% Invisible: \xe2\x80\x8b\n"

        report = inspect_pdf_adversarial(tampered_pdf)
        assert report.has_hidden_text is True
        assert "HIDDEN_TEXT" in report.flags
        zw_findings = [f for f in report.findings if f.finding_type == "ZERO_WIDTH_UNICODE"]
        assert len(zw_findings) >= 1

    def test_clean_pdf_has_no_adversarial_flags(self):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Budi Santoso - Senior Backend Engineer", fontsize=12, color=(0, 0, 0))
        page.insert_text((50, 70), "5 years of experience in Python and PostgreSQL", fontsize=10, color=(0.1, 0.1, 0.1))
        pdf_bytes = doc.tobytes()
        doc.close()

        report = inspect_pdf_adversarial(pdf_bytes)
        assert report.has_hidden_text is False
        assert report.flags == []
        assert len(report.findings) == 0


class TestGoldenDatasetE3HiddenPromptInjection:
    def test_e3_edge_case_triggers_hidden_text_flag(self):
        e3_path = Path("docs/spec/golden_dataset/cvs/edge/E3_hidden_prompt_injection.pdf")
        assert e3_path.exists(), f"E3 edge case file missing at {e3_path}"

        content = e3_path.read_bytes()
        san = sanitize_file(content, "E3_hidden_prompt_injection.pdf")

        assert san.is_valid is True
        assert "HIDDEN_TEXT" in san.flags
        assert "PROMPT_INJECTION" in san.flags
        assert san.has_hidden_text is True
        assert san.has_injection is True
        assert len(san.hidden_text_findings) >= 1
