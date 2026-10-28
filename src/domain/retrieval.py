"""Hybrid retrieval module combining semantic vector similarity and keyword FTS with Reciprocal Rank Fusion (FX-32)."""

from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any

from src.domain.taxonomy import get_taxonomy
from src.infrastructure.database import get_connection
from src.infrastructure.logging import logger
from src.worker.embedding import embed_texts


def split_sentences(text: str) -> list[str]:
    """Splits text into bounded clean sentences."""
    if not text:
        return []
    raw_splits = re.split(r"(?<=[.!?\n])\s+", text)
    return [s.strip() for s in raw_splits if len(s.strip()) > 5]


def extract_granular_evidence_quote(text: str, target_terms: list[str], max_chars: int = 120) -> str:
    """Extracts the most granular sentence or phrase matching target terms to prevent chunk bleed."""
    if not text:
        return ""
    clean_text = text.strip()
    if not target_terms:
        return clean_text[:max_chars]

    sentences = split_sentences(clean_text)
    if not sentences:
        sentences = [clean_text]

    lower_terms = [t.lower().strip() for t in target_terms if t.strip()]

    best_sentence = ""
    best_matches = 0
    for s in sentences:
        s_low = s.lower()
        match_count = sum(1 for term in lower_terms if term in s_low)
        if match_count > best_matches:
            best_matches = match_count
            best_sentence = s

    if not best_sentence:
        best_sentence = sentences[0]

    # If sentence is still wider than max_chars, isolate the immediate window around the target term
    if len(best_sentence) > max_chars and lower_terms:
        s_low = best_sentence.lower()
        earliest_idx = -1
        matched_term = ""
        for term in lower_terms:
            idx = s_low.find(term)
            if idx != -1 and (earliest_idx == -1 or idx < earliest_idx):
                earliest_idx = idx
                matched_term = term

        if earliest_idx != -1:
            start = max(0, earliest_idx - 25)
            end = min(len(best_sentence), earliest_idx + len(matched_term) + (max_chars - 25))
            snippet = best_sentence[start:end].strip()
            if start > 0:
                snippet = "..." + snippet
            if end < len(best_sentence):
                snippet = snippet + "..."
            return snippet

    return best_sentence[:max_chars]


async def retrieve_evidence(
    profile_id: uuid.UUID,
    requirement: dict[str, Any],
    tenant_id: uuid.UUID,
    k: int = 5,
) -> tuple[list[dict[str, Any]], float]:
    """Retrieves top evidence chunks using hybrid search (HNSW cosine vector + FTS) with RRF (k=60).

    Returns:
        (top_chunks: list[dict], max_cosine_sim: float)
    """
    desc = requirement.get("description", "")
    concepts = requirement.get("concepts", [])
    tax = get_taxonomy()

    # Keyword terms for FTS
    terms: list[str] = []
    for c in concepts:
        sk = tax.skills.get(c)
        if sk:
            terms.extend(sk.aliases[:3])
    if not terms:
        terms = [t for t in desc.split() if len(t) > 3][:5]
    query_text = " ".join(terms) if terms else desc

    # Vector embedding for requirement
    req_emb = (await asyncio.to_thread(embed_texts, [desc]))[0] if desc else []

    async with get_connection() as conn, conn.cursor() as cur:
        # 1. Vector Search
        vector_results: list[dict[str, Any]] = []
        max_sim = 0.0
        if req_emb:
            await cur.execute(
                """
                SELECT id, kind, entry_ref, text_redacted, 1 - (embedding <=> %s::vector) AS sim
                FROM profile_chunks
                WHERE profile_id = %s AND tenant_id = %s
                ORDER BY embedding <=> %s::vector ASC
                LIMIT 10
                """,
                (req_emb, profile_id, tenant_id, req_emb),
            )
            v_rows = await cur.fetchall()
            for r in v_rows:
                sim_val = float(r.get("sim") or 0.0)
                max_sim = max(max_sim, sim_val)
                vector_results.append(
                    {
                        "id": r["id"],
                        "kind": r["kind"],
                        "entry_ref": r["entry_ref"],
                        "text": r["text_redacted"],
                        "sim": sim_val,
                    }
                )

        # 2. Full-Text Search
        fts_results: list[dict[str, Any]] = []
        if query_text:
            try:
                await cur.execute(
                    """
                    SELECT id, kind, entry_ref, text_redacted,
                           ts_rank(fts, plainto_tsquery('simple', %s)) AS rank
                    FROM profile_chunks
                    WHERE profile_id = %s AND tenant_id = %s
                      AND fts @@ plainto_tsquery('simple', %s)
                    ORDER BY rank DESC
                    LIMIT 10
                    """,
                    (query_text, profile_id, tenant_id, query_text),
                )
                for r in await cur.fetchall():
                    fts_results.append(
                        {
                            "id": r["id"],
                            "kind": r["kind"],
                            "entry_ref": r["entry_ref"],
                            "text": r["text_redacted"],
                            "rank": float(r.get("rank") or 0.0),
                        }
                    )
            except Exception as e:
                logger.debug(f"FTS search fallback note: {e}")

    # 3. Reciprocal Rank Fusion (RRF k=60)
    rrf_scores: dict[int, float] = {}
    chunk_map: dict[int, dict[str, Any]] = {}

    for rank_idx, item in enumerate(vector_results):
        cid = item["id"]
        chunk_map[cid] = item
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (60.0 + rank_idx + 1))

    for rank_idx, item in enumerate(fts_results):
        cid = item["id"]
        if cid not in chunk_map:
            chunk_map[cid] = item
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (60.0 + rank_idx + 1))

    # Sort chunks by RRF score
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:k]
    top_chunks = [chunk_map[cid] for cid in sorted_ids]

    return top_chunks, max_sim
