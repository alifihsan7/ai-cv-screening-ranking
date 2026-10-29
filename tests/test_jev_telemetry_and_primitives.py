"""Unit and integration tests for Jev telemetry logging and Trio Primitives."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from typesafe_sdk import (
    AsyncTypeSafeClient,
    Choice,
    ChoiceAnswer,
    Noul,
    NoulAnswer,
    Score,
    ScoreAnswer,
    SystemOneResponse,
    Usage,
)

from src.domain.models import ContextSectionType, CriterionKind, EvaluationStatus
from src.domain.verifier import JevTypeSafeVerifierProvider, record_jev_call
from src.infrastructure.database import get_connection


@pytest.mark.asyncio
async def test_record_jev_call_persists_to_db():
    run_id = uuid.uuid4()
    candidate_id = "CAND-TEST-001"
    criterion_id = "R_PYTHON"
    primitive_type = "CHOICE"
    model = "jev-latest"
    latency_ms = 145.2
    input_tokens = 42
    output_tokens = 3
    decision_value = "STRONG"
    confidence = 0.95
    grounding_valid = True

    await record_jev_call(
        criterion_id=criterion_id,
        primitive_type=primitive_type,
        model=model,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        decision_value=decision_value,
        confidence=confidence,
        grounding_valid=grounding_valid,
        run_id=run_id,
        candidate_id=candidate_id,
    )

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, run_id, candidate_id, criterion_id, primitive_type, model,
                   latency_ms, input_tokens, output_tokens, decision_value,
                   confidence, grounding_valid, created_at
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["run_id"] == run_id
        assert row["candidate_id"] == candidate_id
        assert row["criterion_id"] == criterion_id
        assert row["primitive_type"] == "CHOICE"
        assert row["model"] == "jev-latest"
        assert abs(row["latency_ms"] - 145.2) < 0.1
        assert row["input_tokens"] == 42
        assert row["output_tokens"] == 3
        assert row["decision_value"] == "STRONG"
        assert abs(row["confidence"] - 0.95) < 0.01
        assert row["grounding_valid"] is True
        assert row["created_at"] is not None


@pytest.mark.asyncio
async def test_score_primitive_evaluation():
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    score_ans = ScoreAnswer(
        type="score",
        score=2.65,
        confidence=0.92,
        legend={
            0: "No evidence",
            1: "Basic",
            2: "Proficient",
            3: "Advanced",
        },
        probabilities={0: 0.01, 1: 0.04, 2: 0.25, 3: 0.70},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=35, output_tokens=2),
        answers={"chunk_0": score_ans},
    )
    mock_client.system_one.return_value = mock_response

    provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

    run_id = uuid.uuid4()
    candidate_id = "CAND-K8S-01"

    cv_text = "Designed network policies, Falco audit rules, and CIS benchmark automation on Kubernetes clusters."
    snippets = ["Designed network policies, Falco audit rules, and CIS benchmark automation on Kubernetes clusters"]

    decision = await provider.verify(
        criterion_id="R_K8S_SEC",
        criterion_description="Kubernetes Security Hardening and Policy Automation",
        candidate_chunks=snippets,
        cv_full_text=cv_text,
        kind=CriterionKind.SKILL,
        context_type=ContextSectionType.WORK_EXPERIENCE,
        use_score=True,
        run_id=run_id,
        candidate_id=candidate_id,
    )

    assert decision.state == EvaluationStatus.STRONG
    assert decision.confidence == 0.92
    assert "TYPESAFE_LIVE" in decision.flags

    # Verify telemetry was recorded into jev_calls
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, decision_value, input_tokens, output_tokens, grounding_valid
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["primitive_type"] == "SCORE"
        assert row["decision_value"] == "2.65"
        assert row["input_tokens"] == 35
        assert row["output_tokens"] == 2
        assert row["grounding_valid"] is True


@pytest.mark.asyncio
async def test_polarity_choice_evaluation_others_did_it():
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    choice_ans = ChoiceAnswer(
        type="choice",
        choice="OTHERS_DID_IT",
        confidence=0.88,
        probabilities={"CANDIDATE_DID_IT": 0.05, "OTHERS_DID_IT": 0.88, "NOT_STATED": 0.07},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=40, output_tokens=1),
        answers={"chunk_0": choice_ans},
    )
    mock_client.system_one.return_value = mock_response

    provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

    run_id = uuid.uuid4()
    candidate_id = "CAND-INC-02"

    cv_text = "Collaborated with external SOC team during ransomware incident where external team led forensics."
    snippets = ["external team led forensics"]

    decision = await provider.verify(
        criterion_id="R_INCIDENT_LEAD",
        criterion_description="Incident Response Lead",
        candidate_chunks=snippets,
        cv_full_text=cv_text,
        kind=CriterionKind.RESPONSIBILITY,
        context_type=ContextSectionType.WORK_EXPERIENCE,
        primitive="polarity",
        run_id=run_id,
        candidate_id=candidate_id,
    )

    # OTHERS_DID_IT results in PARTIAL status
    assert decision.state == EvaluationStatus.PARTIAL
    assert decision.confidence == 0.88

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, decision_value, grounding_valid
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["primitive_type"] == "CHOICE"
        assert row["decision_value"] == "OTHERS_DID_IT"
        assert row["grounding_valid"] is True


@pytest.mark.asyncio
async def test_grounding_failure_records_telemetry_with_grounding_false():
    mock_client = AsyncMock(spec=AsyncTypeSafeClient)
    choice_ans = ChoiceAnswer(
        type="choice",
        choice="STRONG",
        confidence=0.98,
        probabilities={"STRONG": 0.98, "PARTIAL": 0.01, "NOT_DEMONSTRATED": 0.01},
    )
    mock_response = SystemOneResponse(
        model="jev-latest",
        usage=Usage(input_tokens=22, output_tokens=1),
        answers={"chunk_0": choice_ans},
    )
    mock_client.system_one.return_value = mock_response

    provider = JevTypeSafeVerifierProvider(api_key="ts_test_key", client=mock_client)

    run_id = uuid.uuid4()
    candidate_id = "CAND-HALLUCINATED-01"

    cv_text = "Junior backend programmer in Node.js."
    snippets = ["Fabricated claim: Led 50 person engineering org at Google."]

    decision = await provider.verify(
        criterion_id="R_LEADERSHIP",
        criterion_description="Enterprise engineering leadership",
        candidate_chunks=snippets,
        cv_full_text=cv_text,
        rule_state=EvaluationStatus.PARTIAL,
        kind=CriterionKind.RESPONSIBILITY,
        run_id=run_id,
        candidate_id=candidate_id,
    )

    assert "GROUNDING_FAIL" in decision.flags
    assert decision.state == EvaluationStatus.PARTIAL

    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute(
            """
            SELECT primitive_type, decision_value, grounding_valid
            FROM jev_calls
            WHERE run_id = %s AND candidate_id = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (run_id, candidate_id),
        )
        row = await cur.fetchone()
        assert row is not None
        assert row["primitive_type"] == "CHOICE"
        assert row["grounding_valid"] is False
