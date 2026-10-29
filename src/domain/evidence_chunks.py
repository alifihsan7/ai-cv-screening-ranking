"""Evidence chunks for the retrieval step, each tagged with the CV section it came from.

Retrieval used to rank loose sentences of the CV text, which carry no section: every hit was UNKNOWN, so the
context-elevation guard could never tell a job from a student project. These chunks keep the section, and put
evidence the rules already found ahead of everything else.
"""

from __future__ import annotations

import re
from typing import Any

from src.domain.models import ContextSectionType
from src.domain.retrieval import split_sentences
from src.domain.verifier import normalize_text_nfkc

RULE_EVIDENCE_BOOST = 1.0
RAW_SENTENCE_PENALTY = -0.05
MIN_SKILLS_ON_A_SKILL_LINE = 3

_RULE_CONTEXT_SECTIONS: dict[str, ContextSectionType] = {
    "experience": ContextSectionType.WORK_EXPERIENCE,
    "project": ContextSectionType.PROJECT,
    "organization": ContextSectionType.PROJECT,
    "skills_list": ContextSectionType.SKILL_LIST,
    "education": ContextSectionType.EDUCATION,
}


def _key(text: str) -> str:
    return normalize_text_nfkc(text).lower()


def _skill_names(profile: dict[str, Any]) -> set[str]:
    names = (s.get("name", "") if isinstance(s, dict) else str(s) for s in profile.get("skills", []))
    return {n.strip().lower() for n in names if n and n.strip()}


_SKILL_HEADING = re.compile(r"^\W*(?:keahlian|kemampuan|kompetensi|skills?|technical\s+skills|tech\s+stack)\b", re.IGNORECASE)


def _is_skill_line(sentence: str, skills: set[str]) -> bool:
    """A line under a skills heading, or one that lists several of the candidate's known skills."""
    if _SKILL_HEADING.match(sentence):
        return True
    low = sentence.lower()
    found = sum(1 for name in skills if re.search(rf"(?<![\w+#]){re.escape(name)}(?![\w+#])", low))
    return found >= MIN_SKILLS_ON_A_SKILL_LINE


def build_candidate_chunks(
    profile: dict[str, Any],
    raw_cv_text: str,
    rule_evidence: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Returns chunk dicts (`text`, `kind`, `context_type`, `boost`) for HybridRetrievalTool.

    Order of priority: evidence the rules found, then profile entries (job bullets, projects, organizations,
    achievements), then the remaining CV sentences. Every text is verbatim CV text, so quotes taken from a chunk
    pass the grounding check. Entries are de-duplicated; the first (highest priority) wins.
    """
    chunks: list[dict[str, Any]] = []
    seen: list[str] = []

    def add(text: str, section: ContextSectionType, kind: str, boost: float = 0.0) -> None:
        text = (text or "").strip()
        key = _key(text)
        if len(key) < 5 or any(key == s or key in s for s in seen):
            return
        seen.append(key)
        chunks.append({"text": text, "kind": kind, "context_type": section.value, "boost": boost})

    for ev in rule_evidence or []:
        section = _RULE_CONTEXT_SECTIONS.get(str(ev.get("context", "")).lower(), ContextSectionType.UNKNOWN)
        add(str(ev.get("quote", "")), section, "RULE_EVIDENCE", RULE_EVIDENCE_BOOST)

    for exp in profile.get("experiences", []):
        bullets = [b.get("text", "") if isinstance(b, dict) else str(b) for b in exp.get("bullets", [])]
        bullets = [b for b in bullets if b and b.strip()]
        for text in bullets or [str(exp.get("title", ""))]:
            add(text, ContextSectionType.WORK_EXPERIENCE, "EXPERIENCE")

    for key, kind in (("projects", "PROJECT"), ("organizations", "ORGANIZATION")):
        for item in profile.get(key, []):
            add(str(item.get("text") or item.get("title") or ""), ContextSectionType.PROJECT, kind)

    for item in profile.get("achievements", []):
        add(str(item.get("text") or item.get("title") or ""), ContextSectionType.UNKNOWN, "ACHIEVEMENT")

    skills = _skill_names(profile)
    for sentence in split_sentences(raw_cv_text or ""):
        if _is_skill_line(sentence, skills):
            add(sentence, ContextSectionType.SKILL_LIST, "SKILLS")
        else:
            add(sentence, ContextSectionType.UNKNOWN, "CV_TEXT", RAW_SENTENCE_PENALTY)

    return chunks
