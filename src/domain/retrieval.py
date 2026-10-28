"""Hybrid retrieval module combining semantic vector similarity and keyword FTS with Reciprocal Rank Fusion (FX-32)."""

from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any

from src.domain.taxonomy import get_taxonomy
from src.infrastructure.database import get_connection
from src.infrastructure.logging import logger
from src.services.embedding import embed_texts


def split_sentences(text: str) -> list[str]:
    """Splits text into bounded clean sentences."""
    if not text:
        return []
    raw_splits = re.split(r"(?<=[.!?\n])\s+", text)
    return [s.strip() for s in raw_splits if len(s.strip()) > 5]


# Spaced capital section titles: e.g. "E D U C A T I O N", "P E N D I D I K A N"
SPACED_SECTION_PATTERN = re.compile(r"\b(?:[A-Z]\s+){2,}[A-Z]\b")

KNOWN_SPACED_SECTIONS = {
    "EDUCATION", "PENDIDIKAN", "EXPERIENCE", "PENGALAMAN", "SKILLS", "KEAHLIAN",
    "ORGANIZATION", "ORGANISASI", "AWARDS", "PRESTASI", "CERTIFICATIONS", "SERTIFIKASI",
    "PROJECTS", "PROYEK", "SUMMARY", "RINGKASAN", "PROFILE", "PROFIL", "LANGUAGES", "BAHASA",
}

# Multi-word section headers (case-insensitive)
MULTIWORD_SECTION_KEYWORDS = re.compile(
    r"\b(?:"
    r"work\s+experience|professional\s+experience|employment\s+history|"
    r"pengalaman\s+kerja|pengalaman\s+profesional|riwayat\s+pekerjaan|"
    r"academic\s+background|riwayat\s+pendidikan|pendidikan\s+formal|"
    r"technical\s+skills?|hard\s+skills?|kemampuan\s+teknikal|"
    r"organizational\s+experience|pengalaman\s+organisasi|"
    r"prestasi\s+dan\s+penghargaan|prestasi\s+akademik|"
    r"professional\s+summary|ringkasan\s+profil|tentang\s+saya|profil\s+singkat|data\s+pribadi|personal\s+details?"
    r")\b",
    re.IGNORECASE,
)

# Uppercase single-word headers (strictly uppercase to prevent collision with common prose words)
UPPERCASE_SECTION_KEYWORDS = re.compile(
    r"\b(?:"
    r"EDUCATION|PENDIDIKAN|"
    r"EXPERIENCE|PENGALAMAN|"
    r"SKILLS?|KEAHLIAN|KOMPETENSI|"
    r"ORGANIZATION|ORGANISASI|"
    r"AWARDS?|ACHIEVEMENTS?|PRESTASI|PENGHARGAAN|"
    r"CERTIFICATIONS?|CERTIFICATES?|SERTIFIKASI|SERTIFIKAT|LICENSES?|"
    r"PROJECTS?|PROYEK|PORTFOLIO|"
    r"PUBLICATIONS?|PUBLIKASI|"
    r"LANGUAGES?|BAHASA|"
    r"SUMMARY|RINGKASAN|PROFILE|PROFIL"
    r")\b"
)

# Academic institution bleed pattern (e.g. named university attached to experience without headers)
ACADEMIC_BLEED_KEYWORDS = re.compile(
    r"\b(?:"
    r"universitas\s+[A-Za-z]+|university\s+of\s+[A-Za-z]+|"
    r"institut\s+teknologi\s+[A-Za-z]+|politeknik\s+[A-Za-z]+|"
    r"sekolah\s+tinggi\s+[A-Za-z]+"
    r")\b",
    re.IGNORECASE,
)

ACADEMIC_TARGET_TERMS = {
    "education", "pendidikan", "academic", "university", "universitas", "degree",
    "bachelor", "sarjana", "master", "magister", "diploma", "gpa", "ipk", "stem", "s1", "s2", "s3",
}


def find_section_boundary_spans(text: str, lower_terms: list[str]) -> list[tuple[int, int]]:
    """Identifies boundaries separating distinct CV sections or multi-column flattenings."""
    spans: list[tuple[int, int]] = []

    # 1. Spaced capital section titles: e.g. "E D U C A T I O N"
    for m in SPACED_SECTION_PATTERN.finditer(text):
        collapsed = re.sub(r"\s+", "", m.group(0)).upper()
        if collapsed in KNOWN_SPACED_SECTIONS and not any(term in m.group(0).lower() for term in lower_terms):
            spans.append((m.start(), m.end()))

    # 2. Multi-word section headers (case-insensitive)
    for m in MULTIWORD_SECTION_KEYWORDS.finditer(text):
        m_text = m.group(0).lower()
        if not any(term in m_text for term in lower_terms):
            spans.append((m.start(), m.end()))

    # 3. Uppercase single-word headers (strictly uppercase)
    for m in UPPERCASE_SECTION_KEYWORDS.finditer(text):
        m_text = m.group(0).lower()
        if not any(term in m_text for term in lower_terms):
            spans.append((m.start(), m.end()))

    # 4. Academic bleed (foreign only when criterion is non-academic)
    is_academic_criterion = any(
        any(ak in term for ak in ACADEMIC_TARGET_TERMS)
        for term in lower_terms
    )
    if not is_academic_criterion:
        for m in ACADEMIC_BLEED_KEYWORDS.finditer(text):
            m_text = m.group(0).lower()
            if not any(term in m_text for term in lower_terms):
                spans.append((m.start(), m.end()))

    if not spans:
        return []

    spans.sort(key=lambda x: x[0])
    merged: list[tuple[int, int]] = [spans[0]]
    for cur_start, cur_end in spans[1:]:
        last_start, last_end = merged[-1]
        if cur_start <= last_end:
            merged[-1] = (last_start, max(last_end, cur_end))
        else:
            merged.append((cur_start, cur_end))

    return merged


def segment_text_by_boundaries(text: str, boundary_spans: list[tuple[int, int]]) -> list[str]:
    """Splits text into isolated section blocks based on boundary spans."""
    if not boundary_spans:
        return [text]

    segments: list[str] = []
    prev_end = 0
    for b_start, b_end in boundary_spans:
        if b_start > prev_end:
            seg = text[prev_end:b_start].strip()
            if len(seg) >= 3:
                segments.append(seg)
        prev_end = b_end

    if prev_end < len(text):
        seg = text[prev_end:].strip()
        if len(seg) >= 3:
            segments.append(seg)

    return segments or [text]


def extract_granular_evidence_quote(text: str, target_terms: list[str], max_chars: int = 120) -> str:
    """Extracts the most granular sentence or phrase matching target terms to prevent chunk bleed."""
    if not text:
        return ""
    clean_text = text.strip()
    max_limit = min(max_chars, 119)
    if not target_terms:
        return clean_text[:max_limit].strip()

    lower_terms = [t.lower().strip() for t in target_terms if t and t.strip()]
    if not lower_terms:
        return clean_text[:max_limit].strip()

    # Partition by multi-column section boundaries first to eliminate foreign section bleed
    boundary_spans = find_section_boundary_spans(clean_text, lower_terms)
    section_segments = segment_text_by_boundaries(clean_text, boundary_spans)

    candidate_units: list[str] = []
    for seg in section_segments:
        seg_sentences = split_sentences(seg)
        if seg_sentences:
            candidate_units.extend(seg_sentences)
        else:
            candidate_units.append(seg)

    if not candidate_units:
        candidate_units = [clean_text]

    # Select best candidate unit maximizing matched target terms
    best_unit = ""
    best_matches = 0
    best_matched_terms: list[str] = []

    for unit in candidate_units:
        u_low = unit.lower()
        matched = [term for term in lower_terms if term in u_low]
        m_count = len(matched)
        if m_count > best_matches:
            best_matches = m_count
            best_unit = unit
            best_matched_terms = matched
        elif m_count == best_matches and m_count > 0:
            if len(unit) < len(best_unit):
                best_unit = unit
                best_matched_terms = matched

    if not best_unit:
        best_unit = candidate_units[0]

    # If best unit fits within max_limit, return directly
    if len(best_unit) <= max_limit:
        return best_unit.strip(" ,;:-–—\t\r\n")

    # If best unit exceeds max_limit, isolate tight window around matched target term
    if best_matched_terms:
        u_low = best_unit.lower()
        earliest_idx = -1
        matched_kw = ""
        for term in best_matched_terms:
            idx = u_low.find(term)
            if idx != -1 and (earliest_idx == -1 or idx < earliest_idx):
                earliest_idx = idx
                matched_kw = term

        if earliest_idx != -1:
            kw_len = len(matched_kw)
            # Window of 15–30 chars before and after target keyword
            lead = 25
            tail = min(max_limit - lead - kw_len, 35)
            if tail < 15:
                tail = 15
                lead = max(0, max_limit - kw_len - tail)

            start = max(0, earliest_idx - lead)
            end = min(len(best_unit), earliest_idx + kw_len + tail)

            # Snap to word boundaries
            if start > 0:
                space_after = best_unit.find(" ", start)
                if space_after != -1 and space_after < earliest_idx:
                    start = space_after + 1

            if end < len(best_unit):
                space_before = best_unit.rfind(" ", earliest_idx + kw_len, end)
                if space_before != -1:
                    end = space_before

            snippet = best_unit[start:end].strip(" ,;:-–—\t\r\n")
            if len(snippet) >= 5 and matched_kw in snippet.lower() and len(snippet) <= max_limit:
                return snippet

    return best_unit[:max_limit].strip(" ,;:-–—\t\r\n")


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
