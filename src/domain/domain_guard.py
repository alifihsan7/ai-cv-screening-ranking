"""Domain guards: keep leadership and measured results from the wrong domain out of a technical vacancy.

Spec 02 (4.2): leading a non-technical team is NOT_DEMONSTRATED for LEADERSHIP, and a number from a totally different
domain (a sales target) is NOT_DEMONSTRATED for ACHIEVEMENT. The rules cover this through the role family of a job, but
they credit any lead verb inside a technical job, and the external verifier can raise a status from a marketing or
warehouse job. Everything here is plain code over closed word lists in config/taxonomy/leadership.yaml.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any

from src.domain.models import EvaluationStatus
from src.domain.taxonomy import get_taxonomy

TECHNICAL_ROLE_FAMILIES = frozenset({"backend", "fullstack", "frontend", "devops", "qa", "data", "mobile", "sre"})
GUARDED_KINDS = frozenset({"LEADERSHIP", "ACHIEVEMENT"})
DOMAIN_GUARD_FLAG = "JEV_DOMAIN_GUARD"

_STATUS_RANK = {"UNKNOWN": 0, "NOT_DEMONSTRATED": 0, "PARTIAL": 1, "STRONG": 2}
_HEADCOUNT = re.compile(r"\b\d+\s*(?:orang|karyawan|staf|staff|anggota|people|members?|persons?)\b", re.IGNORECASE)


def has_technical_terms(text: str) -> bool:
    return any(p.search(text) for p in get_taxonomy().compiled_technical_domain_terms)


def names_non_technical_team(text: str) -> bool:
    """True when `text` names a non-technical team and no technical term, e.g. an office relocation committee."""
    tax = get_taxonomy()
    return any(p.search(text) for p in tax.compiled_non_technical_team_terms) and not has_technical_terms(text)


def is_headcount_only(text: str, outcome_pattern: re.Pattern[str]) -> bool:
    """True when every number in `text` that looks like a result is only the size of a team."""
    stripped = _HEADCOUNT.sub(" ", text)
    return not outcome_pattern.search(stripped)


def vacancy_is_technical(requirements: Iterable[dict[str, Any]]) -> bool:
    """True when the vacancy accepts a technical role family (from its EXPERIENCE_DURATION params)."""
    for req in requirements:
        params = req.get("params") or {}
        accepted = {str(f).lower() for f in params.get("accepted_role_families", [])}
        if accepted & TECHNICAL_ROLE_FAMILIES:
            return True
    return False


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def find_experience_for_quote(profile: dict[str, Any], quote: str | None) -> dict[str, Any] | None:
    """The job entry whose bullets (or title) hold `quote`, or None when it comes from elsewhere in the CV."""
    q = _norm(quote or "")
    if len(q) < 5:
        return None
    for exp in profile.get("experiences", []):
        bullets = [_norm(b.get("text", "")) for b in exp.get("bullets", [])]
        if any(q in b or (len(b) >= 5 and b in q) for b in bullets):
            return exp
    return None


def experience_is_technical(exp: dict[str, Any]) -> bool:
    text = " ".join([exp.get("title", ""), *(b.get("text", "") for b in exp.get("bullets", []))])
    return has_technical_terms(text)


def apply_domain_guard(
    *,
    kind: str,
    verifier_state: EvaluationStatus,
    rule_state: str,
    quote: str | None,
    profile: dict[str, Any],
    technical_vacancy: bool,
) -> tuple[EvaluationStatus, list[str]]:
    """Returns the state to keep: the rule state when the verifier raised it using a non-technical job.

    Only a raise above the rule state is touched; agreeing with the rules or lowering them is never blocked.
    Evidence outside a job (organization, project, achievements section) is left alone.
    """
    if not technical_vacancy or kind.upper() not in GUARDED_KINDS:
        return verifier_state, []
    if _STATUS_RANK[verifier_state.value] <= _STATUS_RANK.get(rule_state, 0):
        return verifier_state, []
    exp = find_experience_for_quote(profile, quote)
    if exp is None or experience_is_technical(exp):
        return verifier_state, []
    kept = EvaluationStatus(rule_state) if rule_state in ("STRONG", "PARTIAL") else EvaluationStatus.NOT_DEMONSTRATED
    return kept, [DOMAIN_GUARD_FLAG]
