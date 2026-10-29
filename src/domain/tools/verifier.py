"""Grounded verifier tool wrapping Jev TypeSafe and LLM Gateway providers."""

from __future__ import annotations

from typing import Any

from src.domain.models import ActionInput, ContextSectionType, CriterionKind, EvaluationStatus, VerifierActionInput
from src.domain.tools.base import BaseTool, agent_tool
from src.domain.verifier import (
    BaseVerifierProvider,
    JevTypeSafeVerifierProvider,
    LLMGatewayVerifierProvider,
    VerifierDecision,
)


@agent_tool(action_type="GROUNDED_VERIFIER")
class GroundedVerifierTool(BaseTool):
    """Tool that executes a micro-verifier against selected candidate evidence snippets."""

    name: str = "grounded_verifier"
    action_type: str = "GROUNDED_VERIFIER"

    def __init__(
        self,
        jev_provider: BaseVerifierProvider | None = None,
        llm_provider: BaseVerifierProvider | None = None,
    ) -> None:
        self.jev_provider = jev_provider or JevTypeSafeVerifierProvider()
        self.llm_provider = llm_provider or LLMGatewayVerifierProvider()

    async def run(
        self,
        action_input: ActionInput,
        context: dict[str, Any] | None = None,
    ) -> VerifierDecision:
        if not isinstance(action_input, VerifierActionInput):
            raise TypeError(f"Expected VerifierActionInput, got {type(action_input)}")

        ctx = context or {}
        criterion_id = action_input.criterion_id
        criterion_desc = ctx.get("criterion_description") or ctx.get("description") or criterion_id
        snippets = action_input.context_snippets or ctx.get("snippets") or []
        cv_full_text = ctx.get("cv_full_text") or ctx.get("raw_cv_text") or ""
        rule_state = ctx.get("rule_state") or EvaluationStatus.PARTIAL
        kind = ctx.get("kind") or CriterionKind.SKILL
        context_type = ctx.get("context_type") or ContextSectionType.UNKNOWN

        # Select provider based on context override or action_input.provider
        custom_provider = ctx.get("verifier_provider")
        if custom_provider is not None:
            provider = custom_provider
        else:
            provider = self.llm_provider if action_input.provider == "LLM_VERIFIED" else self.jev_provider

        decision = await provider.verify(
            criterion_id=criterion_id,
            criterion_description=criterion_desc,
            candidate_chunks=snippets,
            cv_full_text=cv_full_text,
            rule_state=rule_state,
            kind=kind,
            context_type=context_type,
            chunk_contexts=ctx.get("chunk_contexts"),
            run_id=ctx.get("run_id"),
            candidate_id=ctx.get("candidate_id"),
            **{k: v for k, v in ctx.items() if k in ("binary_gate", "use_noul", "primitive", "primitive_type", "hard_gate", "use_score")},
        )
        return decision
