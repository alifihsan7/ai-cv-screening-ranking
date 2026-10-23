"""Hybrid semantic vector and lexical retrieval tool."""

from __future__ import annotations

import re
import uuid
from typing import Any

from pydantic import BaseModel

from src.domain.models import ActionInput, ContextSectionType, RetrievalActionInput
from src.domain.retrieval import retrieve_evidence, split_sentences
from src.domain.tools.base import BaseTool, agent_tool


class RetrievedEvidenceChunk(BaseModel):
    text: str
    section: str = "UNKNOWN"
    context_type: ContextSectionType = ContextSectionType.UNKNOWN
    score: float = 0.0
    char_start: int | None = None
    char_end: int | None = None


@agent_tool(action_type="HYBRID_RETRIEVAL")
class HybridRetrievalTool(BaseTool):
    """Hybrid retrieval tool combining dense cosine similarity and sparse lexical search."""

    name: str = "hybrid_retrieval"
    action_type: str = "HYBRID_RETRIEVAL"

    async def run(
        self,
        action_input: ActionInput,
        context: dict[str, Any] | None = None,
    ) -> list[RetrievedEvidenceChunk]:
        if not isinstance(action_input, RetrievalActionInput):
            raise TypeError(f"Expected RetrievalActionInput, got {type(action_input)}")

        query = action_input.query
        top_k = action_input.top_k
        ctx = context or {}

        # 1. Database hybrid search if profile_id and tenant_id are present in context
        profile_id_val = ctx.get("profile_id")
        tenant_id_val = ctx.get("tenant_id")
        if profile_id_val and tenant_id_val:
            try:
                pid = uuid.UUID(str(profile_id_val))
                tid = uuid.UUID(str(tenant_id_val))
                req_dummy = {"description": query, "concepts": ctx.get("concepts", [])}
                top_chunks, sim = await retrieve_evidence(profile_id=pid, requirement=req_dummy, tenant_id=tid, k=top_k)
                if top_chunks:
                    results = []
                    for c in top_chunks:
                        k_val = str(c.get("kind", "UNKNOWN")).upper()
                        ctx_t = ContextSectionType.WORK_EXPERIENCE if "EXP" in k_val else ContextSectionType.UNKNOWN
                        results.append(
                            RetrievedEvidenceChunk(
                                text=c.get("text", ""),
                                section=c.get("entry_ref") or c.get("kind", "UNKNOWN"),
                                context_type=ctx_t,
                                score=float(c.get("sim") or sim),
                            )
                        )
                    return results
            except Exception:
                pass  # Fall back to in-memory search

        # 2. In-memory search over candidate profile, chunks, or raw text in context
        raw_text = ctx.get("raw_cv_text") or ctx.get("full_text") or ""
        provided_chunks = ctx.get("chunks") or []

        candidate_texts: list[tuple[str, ContextSectionType, str]] = []
        if provided_chunks:
            for ch in provided_chunks:
                txt = ch.get("text", "") if isinstance(ch, dict) else str(ch)
                kind = ch.get("kind", "UNKNOWN") if isinstance(ch, dict) else "UNKNOWN"
                ctx_type = ContextSectionType.WORK_EXPERIENCE if "EXP" in kind.upper() else ContextSectionType.UNKNOWN
                candidate_texts.append((txt, ctx_type, kind))
        elif raw_text:
            sentences = split_sentences(raw_text)
            for s in sentences:
                candidate_texts.append((s, ContextSectionType.UNKNOWN, "CV_TEXT"))

        if not candidate_texts:
            return []

        # Token overlap ranking
        q_tokens = set(re.findall(r"\w+", query.lower()))
        scored: list[tuple[float, str, ContextSectionType, str]] = []

        for txt, ctype, sec in candidate_texts:
            t_tokens = set(re.findall(r"\w+", txt.lower()))
            overlap = len(q_tokens & t_tokens)
            score = overlap / max(len(q_tokens), 1)
            scored.append((score, txt, ctype, sec))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [
            RetrievedEvidenceChunk(
                text=txt,
                section=sec,
                context_type=ctype,
                score=round(sc, 4),
            )
            for sc, txt, ctype, sec in scored[:top_k]
        ]
        return results
