"""Unit tests for TypeSafe SDK integration and Dual-Mode Jev Verifier Provider."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from typesafe_sdk import (
    AsyncTypeSafeClient,
    Choice,
    ChoiceAnswer,
    Noul,
    NoulAnswer,
    SystemOneResponse,
    TypeSafeAPIConnectionError,
    Usage,
)

from src.domain.models import ContextSectionType, CriterionKind, EvaluationStatus, VerifierActionInput
from src.domain.tools.verifier import GroundedVerifierTool
from src.domain.verifier import JevTypeSafeVerifierProvider, VerifierDecision

# ===========================================================================
# 1. Local Emulation Mode (Fallback Path) Tests
# ===========================================================================


class TestFailFastUnconfiguredMode:
    @pytest.mark.asyncio
    async def test_is_live_false_when_no_key(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
        provider = JevTypeSafeVerifierProvider(api_key="")
        assert provider.is_live is False

    @pytest.mark.asyncio
    async def test_unconfigured_provider_raises_fail_fast_error(self, monkeypatch: pytest.MonkeyPatch):
        from src.domain.verifier import TypeSafeUnconfiguredError

        monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
        provider = JevTypeSafeVerifierProvider(api_key="")

        cv_text = "Staff Backend Engineer at Enterprise Corp. Python, FastAPI, and PostgreSQL."
        snippets = ["Python, FastAPI, and PostgreSQL."]

        with pytest.raises(TypeSafeUnconfiguredError, match="TypeSafe Jev System One credentials"):
            await provider.verify(
                criterion_id="R_ARCH",
                criterion_description="Python distributed microservices architecture",
                candidate_chunks=snippets,
                cv_full_text=cv_text,
                kind=CriterionKind.SKILL,
                context_type=ContextSectionType.WORK_EXPERIENCE,
            )


# ===========================================================================
# 2. Live System One Mode (Mocked Client Path) Tests
# ===========================================================================


class TestLiveSystemOneMode:
    @pytest.fixture
    def mock_client(self) -> AsyncMock:
        return AsyncMock(spec=AsyncTypeSafeClient)

    @pytest.mark.asyncio
    async def test_live_mode_choice_primitive_strong(self, mock_client: AsyncMock):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="STRONG",
            confidence=0.96,
            probabilities={"STRONG": 0.96, "PARTIAL": 0.03, "NOT_DEMONSTRATED": 0.01},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(input_tokens=25, output_tokens=1),
            answers={"criterion_evaluation": choice_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(
            api_key="ts_test_key_live",
            client=mock_client,
            model="jev-latest",
        )
        assert provider.is_live is True

        cv_text = "Senior Software Engineer with 6 years experience in FastAPI and PostgreSQL microservices."
        snippets = ["6 years experience in FastAPI and PostgreSQL microservices"]

        decision = await provider.verify(
            criterion_id="R_FASTAPI",
            criterion_description="FastAPI microservices experience",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.SKILL,
            context_type=ContextSectionType.WORK_EXPERIENCE,
        )

        # 1. Assert AsyncTypeSafeClient.system_one was invoked
        mock_client.system_one.assert_awaited_once()
        _, kwargs = mock_client.system_one.call_args

        # 2. Validate request payload structure
        state_sent = kwargs["state"]
        assert isinstance(state_sent, dict)
        assert state_sent["criterion"] == "FastAPI microservices experience"
        assert state_sent["candidate_evidence"] == snippets
        assert state_sent["cv_text"] == cv_text

        questions_sent = kwargs["questions"]
        assert "criterion_evaluation" in questions_sent
        q = questions_sent["criterion_evaluation"]
        assert isinstance(q, Choice)
        assert "STRONG" in q.criteria
        assert "PARTIAL" in q.criteria
        assert "NOT_DEMONSTRATED" in q.criteria

        # 3. Validate mapped VerifierDecision
        assert decision.state == EvaluationStatus.STRONG
        assert decision.confidence == 0.96
        assert decision.provider_name == "JEV_TYPESAFE"
        assert "TYPESAFE_LIVE" in decision.flags
        assert decision.quote == "6 years experience in FastAPI and PostgreSQL microservices"
        assert decision.char_start is not None
        assert decision.char_end is not None

    @pytest.mark.asyncio
    async def test_live_mode_choice_primitive_partial(self, mock_client: AsyncMock):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="PARTIAL",
            confidence=0.81,
            probabilities={"STRONG": 0.10, "PARTIAL": 0.81, "NOT_DEMONSTRATED": 0.09},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(input_tokens=20, output_tokens=1),
            answers={"criterion_evaluation": choice_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "Studied Docker in online university course with Docker."
        snippets = ["online university course with Docker"]

        decision = await provider.verify(
            criterion_id="R_DOCKER",
            criterion_description="Production Docker containerization",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.SKILL,
            context_type=ContextSectionType.PROJECT,
        )

        assert decision.state == EvaluationStatus.PARTIAL
        assert decision.confidence == 0.81
        assert "TYPESAFE_LIVE" in decision.flags

    @pytest.mark.asyncio
    async def test_live_mode_choice_primitive_not_demonstrated(self, mock_client: AsyncMock):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="NOT_DEMONSTRATED",
            confidence=0.97,
            probabilities={"STRONG": 0.01, "PARTIAL": 0.02, "NOT_DEMONSTRATED": 0.97},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(input_tokens=20, output_tokens=1),
            answers={"criterion_evaluation": choice_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "Experienced in PHP and WordPress."
        snippets = ["Experienced in PHP and WordPress"]

        decision = await provider.verify(
            criterion_id="R_RUST",
            criterion_description="Rust systems programming",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.SKILL,
        )

        assert decision.state == EvaluationStatus.NOT_DEMONSTRATED
        assert decision.confidence == 0.97
        assert decision.quote is None

    @pytest.mark.asyncio
    async def test_live_mode_noul_primitive_hard_gate(self, mock_client: AsyncMock):
        noul_ans = NoulAnswer(
            type="noul",
            noul=0.93,
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(input_tokens=18, output_tokens=1),
            answers={"criterion_evaluation": noul_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "Master of Science in Artificial Intelligence from ITB."
        snippets = ["Master of Science in Artificial Intelligence from ITB"]

        decision = await provider.verify(
            criterion_id="R_MASTER",
            criterion_description="Master degree in AI or Computer Science",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.EDUCATION,
            binary_gate=True,
        )

        mock_client.system_one.assert_awaited_once()
        _, kwargs = mock_client.system_one.call_args
        q = kwargs["questions"]["criterion_evaluation"]
        assert isinstance(q, Noul)

        assert decision.state == EvaluationStatus.STRONG
        assert decision.confidence == 0.93
        assert "TYPESAFE_LIVE" in decision.flags

    @pytest.mark.asyncio
    async def test_live_mode_noul_negative_probability(self, mock_client: AsyncMock):
        noul_ans = NoulAnswer(
            type="noul",
            noul=0.12,
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(input_tokens=18, output_tokens=1),
            answers={"criterion_evaluation": noul_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "High school graduate."
        snippets = ["High school graduate."]

        decision = await provider.verify(
            criterion_id="R_DEGREE",
            criterion_description="Bachelor degree in STEM",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.EDUCATION,
            use_noul=True,
        )

        assert decision.state == EvaluationStatus.NOT_DEMONSTRATED
        assert decision.confidence >= 0.85
        assert decision.quote is None

    @pytest.mark.asyncio
    async def test_live_mode_context_elevation_guard_applied(self, mock_client: AsyncMock):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="STRONG",
            confidence=0.92,
            probabilities={"STRONG": 0.92, "PARTIAL": 0.05, "NOT_DEMONSTRATED": 0.03},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(),
            answers={"criterion_evaluation": choice_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "Skills: Team Leadership, Engineering Management, Agile."
        snippets = ["Skills: Team Leadership, Engineering Management, Agile"]

        decision = await provider.verify(
            criterion_id="R_LEAD",
            criterion_description="Engineering leadership and team management",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            kind=CriterionKind.RESPONSIBILITY,
            context_type=ContextSectionType.SKILL_LIST,
        )

        # Context elevation invariant must downgrade STRONG to PARTIAL in SKILL_LIST
        assert decision.state == EvaluationStatus.PARTIAL
        assert "CONTEXT_ELEVATION_DOWNGRADE" in decision.flags

    @pytest.mark.asyncio
    async def test_live_mode_grounding_failure_annulment(self, mock_client: AsyncMock):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="STRONG",
            confidence=0.98,
            probabilities={"STRONG": 0.98, "PARTIAL": 0.01, "NOT_DEMONSTRATED": 0.01},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(),
            answers={"criterion_evaluation": choice_ans},
        )
        mock_client.system_one.return_value = mock_response

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "Junior developer with basic Python."
        # Snippets has hallucinated quote not present in cv_text
        snippets = ["Led cloud architecture on AWS with Kubernetes and Terraform."]

        decision = await provider.verify(
            criterion_id="R_CLOUD",
            criterion_description="Cloud architecture with Kubernetes",
            candidate_chunks=snippets,
            cv_full_text=cv_text,
            rule_state=EvaluationStatus.PARTIAL,
            kind=CriterionKind.SKILL,
        )

        assert decision.state == EvaluationStatus.PARTIAL
        assert "GROUNDING_FAIL" in decision.flags
        assert decision.quote is None

    @pytest.mark.asyncio
    async def test_live_mode_network_exception_propagates_honestly(self, mock_client: AsyncMock):
        mock_client.system_one.side_effect = TypeSafeAPIConnectionError("Connection refused to https://api.typesafe.ai")

        provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

        cv_text = "Architected backend microservices in Python."
        snippets = ["Architected backend microservices in Python"]

        # Must not disguise as pseudo-Jev; fail-fast and propagate TypeSafe error honestly
        with pytest.raises(TypeSafeAPIConnectionError):
            await provider.verify(
                criterion_id="R_PY",
                criterion_description="Python backend microservices",
                candidate_chunks=snippets,
                cv_full_text=cv_text,
                kind=CriterionKind.SKILL,
                context_type=ContextSectionType.WORK_EXPERIENCE,
            )

    @pytest.mark.asyncio
    async def test_live_mode_client_context_manager_lifecycle(self):
        choice_ans = ChoiceAnswer(
            type="choice",
            choice="STRONG",
            confidence=0.90,
            probabilities={"STRONG": 0.90, "PARTIAL": 0.08, "NOT_DEMONSTRATED": 0.02},
        )
        mock_response = SystemOneResponse(
            model="jev-latest",
            usage=Usage(),
            answers={"criterion_evaluation": choice_ans},
        )

        mock_inst = AsyncMock(spec=AsyncTypeSafeClient)
        mock_inst.__aenter__.return_value = mock_inst
        mock_inst.system_one.return_value = mock_response

        with patch("src.domain.verifier.AsyncTypeSafeClient", return_value=mock_inst) as mock_cls:
            provider = JevTypeSafeVerifierProvider(api_key="ts_custom_key", client=None)
            assert provider.is_live is True

            cv_text = "Senior Python Engineer."
            snippets = ["Senior Python Engineer"]

            decision = await provider.verify(
                criterion_id="R1",
                criterion_description="Python Engineer",
                candidate_chunks=snippets,
                cv_full_text=cv_text,
            )

            mock_cls.assert_called_once_with(
                api_key="ts_custom_key",
                base_url=None,
                model="jev-latest",
                timeout=10.0,
            )
            mock_inst.system_one.assert_awaited_once()
            assert decision.state == EvaluationStatus.STRONG
            assert "TYPESAFE_LIVE" in decision.flags


# ===========================================================================
# 3. GroundedVerifierTool Dispatch Tests
# ===========================================================================


class TestGroundedVerifierToolFailFast:
    @pytest.mark.asyncio
    async def test_tool_fails_fast_when_jev_unconfigured(self, monkeypatch: pytest.MonkeyPatch):
        from src.domain.verifier import TypeSafeUnconfiguredError

        monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)
        tool = GroundedVerifierTool()
        input_data = VerifierActionInput(
            action_type="GROUNDED_VERIFIER",
            criterion_id="R_PYTHON",
            context_snippets=["Built microservices using Python and PostgreSQL."],
            provider="JEV_TYPESAFE",
        )
        ctx = {
            "criterion_description": "Python microservices",
            "cv_full_text": "Built microservices using Python and PostgreSQL.",
            "context_type": ContextSectionType.WORK_EXPERIENCE,
        }

        with pytest.raises(TypeSafeUnconfiguredError):
            await tool.run(input_data, context=ctx)
