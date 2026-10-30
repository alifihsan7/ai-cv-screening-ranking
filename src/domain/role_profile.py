"""Vacancy role profiles: what counts as relevant work experience for ONE vacancy.

Role classification used to be a fixed list of software roles, so a civil engineering or HR vacancy could never find a
single relevant job (docs/plan/ROLE_PROFILE_DESIGN.md). The vacancy now defines relevance:

  * the role families its text points at (`infer_accepted_families`),
  * a profile of job titles and field words, seeded from the taxonomy and extended by whatever the recruiter-approved
    criterion carries in `params.role_profile` (a language model may *propose* those words; code decides, a person
    approves, and the approved profile is frozen with the criteria version).

Everything here is plain code over closed lists, so the same CV and criteria always give the same answer.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from src.domain.policy_linter import lint_text
from src.domain.taxonomy import get_taxonomy

SOFTWARE_FAMILIES = frozenset({"backend", "fullstack", "frontend", "devops", "qa", "data", "mobile", "sre", "devops_sre", "data_ai"})
GENERIC_FAMILIES = frozenset({"ambiguous", "other"})
MIN_DOMAIN_TERM_HITS = 2  # distinct field words a job must mention when its title says nothing

# Student and volunteer organizations are not work experience (spec 4.2: internships count 50%, organizations 0%)
_ORGANIZATION_TITLE = re.compile(
    r"(?<![a-z0-9])(himpunan|bem|ukm|hmti|hmts|organisasi|komunitas|kepanitiaan|panitia|relawan|volunteer)(?![a-z0-9])",
    re.IGNORECASE,
)

MAX_PROPOSED_TERMS = 24
MAX_TERM_LENGTH = 40
_TOO_GENERIC = frozenset({
    "engineer", "manager", "staff", "staf", "karyawan", "pegawai", "kerja", "pekerjaan", "proyek", "project",
    "tim", "team", "perusahaan", "company", "jabatan", "posisi", "lapangan", "teknik", "teknis", "assistant", "asisten",
})


def _phrase(text: str, phrase: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])", text))


def infer_accepted_families(req: dict[str, Any]) -> list[str]:
    """Role families an EXPERIENCE_DURATION criterion accepts: explicit params, else from the vacancy's own words.

    Field words are matched as whole words. Substring matching let the short word "bi" (business intelligence) match
    inside "bidang" and add the data family to a civil vacancy.
    """
    params = req.get("params") or {}
    accepted = [rf.lower() for rf in params.get("accepted_role_families", [])]
    if accepted:
        return accepted

    desc_text = ((req.get("description") or "") + " " + (req.get("source_text") or "")).lower()
    concepts = [c.lower() for c in req.get("concepts", [])]
    tax = get_taxonomy()
    for rf_name, rf_entry in tax.role_families.items():
        concept_tokens = [c.split(":", 1)[1] for c in concepts if c.startswith("role_family:")]
        named_by_concept = any(rf_name in c for c in concepts) or any(len(t) >= 5 and t in rf_name for t in concept_tokens)
        if any(_phrase(desc_text, term) for term in rf_entry.domain_terms) or named_by_concept:
            accepted.append(rf_name)
            accepted.extend(rf_entry.related)
    return accepted or ["backend", "fullstack"]


def uses_profile_path(accepted: list[str], params: dict[str, Any] | None) -> bool:
    """Profile matching replaces the software role classifier for every vacancy that is not a software vacancy."""
    if params and params.get("role_profile"):
        return True
    return not (set(accepted) & SOFTWARE_FAMILIES)


@dataclass(frozen=True)
class RoleProfile:
    families: tuple[str, ...]
    titles: tuple[str, ...]
    domain_terms: tuple[str, ...]
    source: str

    def title_matches(self, title_lower: str) -> bool:
        return any(_phrase(title_lower, t) for t in self.titles)

    def term_hits(self, text_lower: str) -> int:
        return sum(1 for t in self.domain_terms if _phrase(text_lower, t))


def _dedupe(items: list[str]) -> tuple[str, ...]:
    seen: dict[str, None] = {}
    for it in items:
        key = it.strip().lower()
        if key:
            seen.setdefault(key, None)
    return tuple(seen)


def seed_profile(accepted: list[str]) -> RoleProfile:
    """Titles and field words the taxonomy holds for the accepted non-software families."""
    tax = get_taxonomy()
    families = [f for f in dict.fromkeys(accepted) if f in tax.role_families and f not in GENERIC_FAMILIES and f not in SOFTWARE_FAMILIES]
    titles: list[str] = []
    terms: list[str] = []
    for f in families:
        titles += list(tax.role_families[f].titles)
        terms += list(tax.role_families[f].domain_terms)
    return RoleProfile(tuple(families), _dedupe(titles), _dedupe(terms), "taxonomy")


def resolve_role_profile(req: dict[str, Any], accepted: list[str]) -> RoleProfile:
    """The profile this criterion is judged by.

    A profile stored in `params.role_profile` is the one the recruiter approved, and it is used exactly as stored: it
    is frozen with the criteria version, so removing a word from it must not bring the taxonomy's word back, and a
    later change of the taxonomy must not change an approved criterion. Without one, the taxonomy seed is used.
    """
    seed = seed_profile(accepted)
    carried = (req.get("params") or {}).get("role_profile") or {}
    titles = [str(t) for t in carried.get("titles", [])]
    terms = [str(t) for t in carried.get("domain_terms", [])]
    if not titles and not terms:
        return seed
    return RoleProfile(seed.families, _dedupe(titles), _dedupe(terms), str(carried.get("source") or "approved"))


def _title_belongs_elsewhere(title_lower: str, profile: RoleProfile) -> bool:
    """The title names a different profession ("Akuntan Proyek", "Backend Developer"): field words cannot rescue it."""
    tax = get_taxonomy()
    for name, patterns in tax.compiled_role_titles.items():
        if name in GENERIC_FAMILIES or name in profile.families:
            continue
        if any(p.search(title_lower) for p in patterns):
            return True
    return False


def is_relevant_experience(profile: RoleProfile, exp: dict[str, Any]) -> bool:
    """One job entry: does it count as work in this vacancy's field?"""
    title = str(exp.get("title") or "")
    title_lower = title.lower()
    if _ORGANIZATION_TITLE.search(title_lower):
        return False
    if profile.title_matches(title_lower):
        return True
    if _title_belongs_elsewhere(title_lower, profile):
        return False
    bullets = " ".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in exp.get("bullets", []))
    return profile.term_hits(f"{title_lower} {bullets.lower()}") >= MIN_DOMAIN_TERM_HITS


def sanitize_proposal(raw: Any) -> dict[str, list[str]]:
    """Cleans a role profile proposed by a language model. The proposal is data, never trusted as is.

    Keeps short lowercase phrases, drops duplicates, words too generic to mean anything on their own, and anything
    that is not a plain string. The caller still runs the policy linter before the profile is stored.
    """
    out: dict[str, list[str]] = {"titles": [], "domain_terms": []}
    if not isinstance(raw, dict):
        return out
    for key in out:
        items = raw.get(key)
        if not isinstance(items, list):
            continue
        cleaned: list[str] = []
        for it in items:
            if not isinstance(it, str):
                continue
            if re.search(r"[<>{}\[\]\\]|https?://", it):
                continue
            # "rencana anggaran biaya (rab)" and "ska / skt" can never match CV text as written: split them up
            for part in re.split(r"\s*[()/]\s*|\s+atau\s+", it.strip().lower()):
                phrase = re.sub(r"\s+", " ", part).strip(" ,;.")
                if not phrase or len(phrase) > MAX_TERM_LENGTH or phrase in _TOO_GENERIC or not re.search(r"[a-z]{2}", phrase):
                    continue
                cleaned.append(phrase)
        out[key] = list(_dedupe(cleaned))[:MAX_PROPOSED_TERMS]
    return out


def clean_proposal(raw: Any) -> dict[str, list[str]]:
    """`sanitize_proposal` plus the policy linter: a phrase naming a protected attribute is dropped."""
    cleaned = sanitize_proposal(raw)
    for key, items in cleaned.items():
        cleaned[key] = [it for it in items if not (lint_text(it)["prohibited_flags"] or lint_text(it)["admin_flags"])]
    return cleaned


def clean_stored_role_profile(params: dict[str, Any] | None) -> dict[str, Any]:
    """Params about to be saved, with `role_profile` cleaned the same way a model proposal is.

    The recruiter may type words into the profile, and the profile is frozen with the criteria version, so what is
    stored must pass the same checks as what a model proposes. Other params are returned untouched.
    """
    out = dict(params or {})
    profile = out.get("role_profile")
    if not isinstance(profile, dict):
        out.pop("role_profile", None)
        return out
    cleaned = clean_proposal(profile)
    if not (cleaned["titles"] or cleaned["domain_terms"]):
        out.pop("role_profile")  # an empty profile would switch a software vacancy to the profile path
        return out
    out["role_profile"] = {**cleaned, "source": str(profile.get("source") or "edited")}
    return out
