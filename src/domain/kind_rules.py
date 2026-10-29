"""Pure functional evaluation rules per requirement kind (02_SCORING Section 4.2)."""

from __future__ import annotations

import asyncio
import os
import re
import uuid
from datetime import date
from typing import Any

from typesafe_sdk import AsyncTypeSafeClient

from src.domain.taxonomy import get_taxonomy
from src.domain.text_match import match_skill
from src.domain.verifier import (
    STANDARD_ROLE_FAMILIES,
    RoleFamilyChoiceResult,
    TypeSafeUnconfiguredError,
    classify_role_family_jev,
    record_jev_call,
)
from src.infrastructure.config import settings


def get_concept_aliases() -> dict[str, list[str]]:
    tax = get_taxonomy()
    return {cid: list(sk.aliases) for cid, sk in tax.skills.items()}


class _ConceptAliasesProxy(dict):
    def get(self, key, default=None):
        return get_concept_aliases().get(key, default)

    def __getitem__(self, key):
        return get_concept_aliases()[key]

    def __contains__(self, key):
        return key in get_concept_aliases()


CONCEPT_ALIASES = _ConceptAliasesProxy()


def classify_role_family(title: str, text: str = "") -> str:
    if not title:
        return "other"
    tax = get_taxonomy()
    t_clean = title.strip().lower()

    for rf, patterns in tax.compiled_role_titles.items():
        if rf in ("ambiguous", "other"):
            continue
        for pat in patterns:
            if pat.search(t_clean):
                return rf

    comb = f"{title} {text}".lower()
    for rf, patterns in tax.compiled_role_titles.items():
        if rf in ("ambiguous", "other"):
            continue
        for pat in patterns:
            if pat.search(comb):
                return rf
    return "other"


def parse_ym(val: str | None, as_of: str | None = None, is_end: bool = False) -> tuple[int, int] | None:
    if not as_of:
        as_of = date.today().isoformat()
    if not val:
        return None
    val_clean = val.strip().strip("()[]{} \t.,").lower()
    val_clean = re.sub(r"[–—―−]", "-", val_clean)
    if val_clean in ("present", "sekarang", "saat ini", "kini", "now", "current"):
        as_of_date = date.fromisoformat(as_of)
        return as_of_date.year, as_of_date.month

    m = re.match(r"^(\d{4})-(\d{2})$", val_clean)
    if m:
        return int(m.group(1)), int(m.group(2))

    m_y = re.match(r"^(\d{4})$", val_clean)
    if m_y:
        y = int(m_y.group(1))
        return y, (6 if is_end else 7)

    return None


def merge_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not intervals:
        return []
    sorted_ivs = sorted(intervals, key=lambda x: (x[0], x[1]))
    merged = [sorted_ivs[0]]
    for cur_start, cur_end in sorted_ivs[1:]:
        prev_start, prev_end = merged[-1]
        if cur_start <= prev_end + 1:
            merged[-1] = (prev_start, max(prev_end, cur_end))
        else:
            merged.append((cur_start, cur_end))
    return merged


def is_role_family_accepted(rf_str: str, accepted: list[str]) -> bool:
    """Checks whether a classified role family matches accepted role families."""
    rf_norm = rf_str.strip().lower()
    if rf_norm in accepted:
        return True
    if rf_norm == "devops_sre" and any(r in accepted for r in ("devops", "sre", "devops_sre")):
        return True
    if rf_norm == "data_ai" and any(r in accepted for r in ("data", "ai", "data_ai", "ml")):
        return True
    if rf_norm == "fullstack" and "backend" in accepted:
        return True
    if rf_norm == "backend" and "fullstack" in accepted:
        return True
    return False


def split_jev_rejected_experiences(
    experiences: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    """Drops entries Jev confidently rejected as non-work from duration scoring, returning a flag if any."""
    kept = [e for e in experiences if "JEV_NOT_WORK_EXPERIENCE" not in (e.get("flags") or [])]
    return kept, (["JEV_EXCLUDED_NON_WORK_ENTRY"] if len(kept) < len(experiences) else [])


class DualEvaluationResult:
    """Hybrid outcome that is awaitable in async workflows and unpackable in legacy synchronous calls."""

    def __init__(self, coro_func: Any, sync_func: Any) -> None:
        self._coro_func = coro_func
        self._sync_func = sync_func
        self._cached_sync: tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]] | None = None

    def __await__(self) -> Any:
        return self._coro_func().__await__()

    def _get_sync(self) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
        if self._cached_sync is None:
            self._cached_sync = self._sync_func()
        assert self._cached_sync is not None
        return self._cached_sync

    def __iter__(self) -> Any:
        return iter(self._get_sync())

    def __getitem__(self, idx: int) -> Any:
        return self._get_sync()[idx]

    def __len__(self) -> int:
        return len(self._get_sync())

    def __eq__(self, other: Any) -> bool:
        return tuple(self) == other

    def __repr__(self) -> str:
        return repr(self._get_sync())


async def eval_experience_duration_async(
    profile: dict[str, Any],
    req: dict[str, Any],
    as_of: str | None = None,
    client: AsyncTypeSafeClient | None = None,
    candidate_id: str | None = None,
    run_id: str | uuid.UUID | None = None,
    use_jev: bool = True,
    role_classifier: Any = None,
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates EXPERIENCE_DURATION with concurrent Jev CHOICE role classification (Pure Fail-Fast)."""
    if not as_of:
        as_of = date.today().isoformat()
    params = req.get("params", {})
    accepted_rfs = [rf.lower() for rf in params.get("accepted_role_families", [])]
    desc_text = ((req.get("description") or "") + " " + (req.get("source_text") or "")).lower()

    if not accepted_rfs:
        concepts = [c.lower() for c in req.get("concepts", [])]
        tax = get_taxonomy()
        for rf_name, rf_entry in tax.role_families.items():
            if any(term in desc_text for term in rf_entry.domain_terms) or any(rf_name in c for c in concepts):
                accepted_rfs.append(rf_name)
                accepted_rfs.extend(rf_entry.related)
        if not accepted_rfs:
            accepted_rfs = ["backend", "fullstack"]

    min_months = params.get("min_months")
    if min_months is None:
        m_dur = re.search(r"(\d+)\s*(?:-\s*(\d+))?\s*(?:tahun|year)", desc_text)
        min_months = int(m_dur.group(1)) * 12 if m_dur else 36

    as_of_y, as_of_m = parse_ym("present", as_of)  # type: ignore[misc]
    as_of_total_m = as_of_y * 12 + as_of_m

    experiences, excluded_flags = split_jev_rejected_experiences(profile.get("experiences", []))
    if not experiences:
        return "NOT_DEMONSTRATED", 0.95, {"backend_months": 0.0}, [], excluded_flags

    req_id = str(req.get("requirement_id") or req.get("id") or "EXPERIENCE_DURATION")

    classified_experiences: list[tuple[dict[str, Any], str, float]]
    if use_jev:
        async def _classify(exp_item: dict[str, Any], cl: AsyncTypeSafeClient | None) -> tuple[dict[str, Any], str, float]:
            title = exp_item.get("title", "")
            bullets = exp_item.get("bullets", [])
            if role_classifier is not None:
                res = await role_classifier(title, bullets)
                rf = res.role_family if hasattr(res, "role_family") else str(res)
                conf = res.confidence if hasattr(res, "confidence") else 0.95
            else:
                res = await classify_role_family_jev(
                    title=title,
                    bullets=bullets,
                    client=cl,
                    candidate_id=candidate_id,
                    run_id=run_id,
                    criterion_id=req_id,
                )
                rf = res.role_family
                conf = res.confidence
            return exp_item, rf, conf

        env_key = os.environ.get("TYPESAFE_API_KEY")
        raw_key = env_key if env_key is not None else (getattr(settings, "TYPESAFE_API_KEY", "") or "")
        resolved_key = str(raw_key).strip()
        if client is None and resolved_key:
            async with AsyncTypeSafeClient(
                api_key=resolved_key,
                base_url=os.environ.get("TYPESAFE_BASE_URL") or getattr(settings, "TYPESAFE_BASE_URL", None) or None,
                model=os.environ.get("TYPESAFE_MODEL") or getattr(settings, "TYPESAFE_MODEL", "jev-latest"),
                timeout=getattr(settings, "TYPESAFE_TIMEOUT", 10.0),
            ) as session_client:
                classified_experiences = await asyncio.gather(
                    *[_classify(e, session_client) for e in experiences]
                )
        else:
            classified_experiences = await asyncio.gather(
                *[_classify(e, client) for e in experiences]
            )
    else:
        classified_experiences = []
        for e in experiences:
            title = e.get("title", "")
            bullet_text = " ".join(b.get("text", "") for b in e.get("bullets", []) if isinstance(b, dict))
            rf = classify_role_family(title, bullet_text)
            classified_experiences.append((e, rf.upper(), 0.95))

    full_intervals: list[tuple[int, int]] = []
    intern_intervals: list[tuple[int, int]] = []
    flags: list[str] = list(excluded_flags)
    evidence: list[dict[str, Any]] = []

    # Low-confidence Jev role families fall back to the deterministic classifier, flagged for review
    if use_jev:
        reclassified: list[tuple[dict[str, Any], str, float]] = []
        for exp, rf, conf in classified_experiences:
            if conf < settings.VERIFIER_MIN_CONFIDENCE:
                bullet_text = " ".join(b.get("text", "") for b in exp.get("bullets", []) if isinstance(b, dict))
                rf = classify_role_family(exp.get("title", ""), bullet_text).upper()
                if "JEV_ROLE_FAMILY_LOW_CONFIDENCE" not in flags:
                    flags.append("JEV_ROLE_FAMILY_LOW_CONFIDENCE")
            reclassified.append((exp, rf, conf))
        classified_experiences = reclassified

    for exp, rf, conf in classified_experiences:
        if not is_role_family_accepted(rf, accepted_rfs):
            continue

        title = exp.get("title", "")
        start_obj = exp.get("start")
        end_obj = exp.get("end")
        s_val = start_obj.get("value") if isinstance(start_obj, dict) else start_obj
        e_val = end_obj.get("value") if isinstance(end_obj, dict) else end_obj

        s_val_str = str(s_val or "").strip()
        e_val_str = str(e_val or "").strip()
        if re.match(r"^\d{4}$", s_val_str) or re.match(r"^\d{4}$", e_val_str):
            flags.append("DATE_YEAR_ONLY_INFERRED")

        s_ym = parse_ym(s_val, as_of, is_end=False)
        e_ym = parse_ym(e_val, as_of, is_end=True)

        if not s_ym or not e_ym:
            continue

        s_tot = s_ym[0] * 12 + s_ym[1]
        e_tot = e_ym[0] * 12 + e_ym[1]

        if s_tot > as_of_total_m or e_tot > as_of_total_m or e_tot < s_tot:
            flags.append("DATE_ANOMALY")
            continue

        is_intern = exp.get("context") == "internship" or exp.get("employment_type") == "internship"
        if is_intern:
            intern_intervals.append((s_tot, e_tot))
        else:
            full_intervals.append((s_tot, e_tot))

        evidence.append(
            {
                "quote": f"{title} ({s_val}..{e_val})",
                "context": exp.get("context", "experience"),
                "verified": True,
            }
        )

    merged_full = merge_intervals(full_intervals)
    merged_intern = merge_intervals(intern_intervals)

    full_m = sum(end - start + 1 for start, end in merged_full)
    intern_m = sum(end - start + 1 for start, end in merged_intern)

    total_months = round(full_m + (intern_m * 0.5), 1)

    if total_months >= min_months:
        state = "STRONG"
    elif total_months > 0:
        state = "PARTIAL"
    else:
        state = "NOT_DEMONSTRATED"

    metrics = {"backend_months": total_months}
    confidence = 0.95
    return state, confidence, metrics, evidence, flags


def _eval_experience_duration_sync(
    profile: dict[str, Any],
    req: dict[str, Any],
    as_of: str | None = None,
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Synchronous deterministic experience duration evaluation using local taxonomy regex."""
    if not as_of:
        as_of = date.today().isoformat()
    params = req.get("params", {})
    accepted_rfs = [rf.lower() for rf in params.get("accepted_role_families", [])]
    desc_text = ((req.get("description") or "") + " " + (req.get("source_text") or "")).lower()

    if not accepted_rfs:
        concepts = [c.lower() for c in req.get("concepts", [])]
        tax = get_taxonomy()
        for rf_name, rf_entry in tax.role_families.items():
            if any(term in desc_text for term in rf_entry.domain_terms) or any(rf_name in c for c in concepts):
                accepted_rfs.append(rf_name)
                accepted_rfs.extend(rf_entry.related)
        if not accepted_rfs:
            accepted_rfs = ["backend", "fullstack"]

    min_months = params.get("min_months")
    if min_months is None:
        m_dur = re.search(r"(\d+)\s*(?:-\s*(\d+))?\s*(?:tahun|year)", desc_text)
        min_months = int(m_dur.group(1)) * 12 if m_dur else 36

    as_of_y, as_of_m = parse_ym("present", as_of)  # type: ignore[misc]
    as_of_total_m = as_of_y * 12 + as_of_m

    experiences, excluded_flags = split_jev_rejected_experiences(profile.get("experiences", []))
    full_intervals: list[tuple[int, int]] = []
    intern_intervals: list[tuple[int, int]] = []
    flags: list[str] = list(excluded_flags)
    evidence: list[dict[str, Any]] = []

    for exp in experiences:
        title = exp.get("title", "")
        bullet_text = " ".join(b.get("text", "") for b in exp.get("bullets", []) if isinstance(b, dict))
        rf = classify_role_family(title, bullet_text)
        if not is_role_family_accepted(rf, accepted_rfs):
            continue

        start_obj = exp.get("start")
        end_obj = exp.get("end")
        s_val = start_obj.get("value") if isinstance(start_obj, dict) else start_obj
        e_val = end_obj.get("value") if isinstance(end_obj, dict) else end_obj

        s_val_str = str(s_val or "").strip()
        e_val_str = str(e_val or "").strip()
        if re.match(r"^\d{4}$", s_val_str) or re.match(r"^\d{4}$", e_val_str):
            flags.append("DATE_YEAR_ONLY_INFERRED")

        s_ym = parse_ym(s_val, as_of, is_end=False)
        e_ym = parse_ym(e_val, as_of, is_end=True)

        if not s_ym or not e_ym:
            continue

        s_tot = s_ym[0] * 12 + s_ym[1]
        e_tot = e_ym[0] * 12 + e_ym[1]

        if s_tot > as_of_total_m or e_tot > as_of_total_m or e_tot < s_tot:
            flags.append("DATE_ANOMALY")
            continue

        is_intern = exp.get("context") == "internship" or exp.get("employment_type") == "internship"
        if is_intern:
            intern_intervals.append((s_tot, e_tot))
        else:
            full_intervals.append((s_tot, e_tot))

        evidence.append(
            {
                "quote": f"{title} ({s_val}..{e_val})",
                "context": exp.get("context", "experience"),
                "verified": True,
            }
        )

    merged_full = merge_intervals(full_intervals)
    merged_intern = merge_intervals(intern_intervals)

    full_m = sum(end - start + 1 for start, end in merged_full)
    intern_m = sum(end - start + 1 for start, end in merged_intern)

    total_months = round(full_m + (intern_m * 0.5), 1)

    if total_months >= min_months:
        state = "STRONG"
    elif total_months > 0:
        state = "PARTIAL"
    else:
        state = "NOT_DEMONSTRATED"

    metrics = {"backend_months": total_months}
    confidence = 0.95
    return state, confidence, metrics, evidence, flags


def eval_experience_duration(
    profile: dict[str, Any],
    req: dict[str, Any],
    as_of: str | None = None,
    client: AsyncTypeSafeClient | None = None,
    candidate_id: str | None = None,
    run_id: str | uuid.UUID | None = None,
    use_jev: bool | None = None,
    role_classifier: Any = None,
) -> Any:
    """Evaluates EXPERIENCE_DURATION requirements (e.g. R1: min 3 years).

    Dual-mode architecture:
    - Awaited (`await eval_experience_duration(...)`): Runs high-throughput concurrent
      TypeSafe Jev System One CHOICE role classification with Pure Fail-Fast (Opsi 1).
    - Unpacked synchronously (`st, conf, m, ev, flg = eval_experience_duration(...)`):
      Executes deterministic local regex rules without stalling synchronous test suites.
    """
    effective_use_jev = (
        True
        if (use_jev is True or (use_jev is None and (client is not None or bool(os.environ.get("TYPESAFE_API_KEY") or getattr(settings, "TYPESAFE_API_KEY", "")))))
        else (False if use_jev is False else True)
    )

    async def _coro() -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
        return await eval_experience_duration_async(
            profile=profile,
            req=req,
            as_of=as_of,
            client=client,
            candidate_id=candidate_id,
            run_id=run_id,
            use_jev=effective_use_jev,
            role_classifier=role_classifier,
        )

    def _sync() -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
        return _eval_experience_duration_sync(
            profile=profile,
            req=req,
            as_of=as_of,
        )

    return DualEvaluationResult(_coro, _sync)


def eval_skill(
    profile: dict[str, Any],
    req: dict[str, Any],
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates SKILL requirements respecting hierarchy of evidence context."""
    concepts = [c.lower() for c in req.get("concepts", [])]
    acceptable_alt = [a.lower() for a in req.get("params", {}).get("acceptable_alternatives", [])]
    all_target_concepts = set(concepts + acceptable_alt)

    target_keywords: list[str] = []
    for c in all_target_concepts:
        base = c.split(":")[-1]
        target_keywords.extend(CONCEPT_ALIASES.get(c, [base, base.replace("_", " "), base.replace("_", "-")]))

    if not target_keywords:
        desc = (req.get("description") or "") + " " + (req.get("source_text") or "")
        potential = re.findall(r"[A-Za-z0-9+#]+", desc)
        tax = get_taxonomy()
        stop_set = set(tax.stopwords) | {"memahami", "mampu", "menguasai", "melakukan", "minimal", "sebagai"}
        for term in potential:
            t_lower = term.lower()
            if len(t_lower) >= 3 and t_lower not in stop_set:
                target_keywords.extend(CONCEPT_ALIASES.get(f"skill:{t_lower}", [t_lower]))

    evidence = []

    # Context 1: Dated jobs (STRONG)
    for exp in profile.get("experiences", []):
        combined_text = f"{exp.get('title', '')} " + " ".join(b.get("text", "") for b in exp.get("bullets", []))
        for kw in target_keywords:
            if match_skill(combined_text, kw):
                # Isolate matching bullet or title directly for granular precision
                matched_quote = exp.get("title", "")
                for b in exp.get("bullets", []):
                    b_txt = b.get("text", "")
                    if match_skill(b_txt, kw):
                        matched_quote = b_txt
                        break
                evidence.append({"quote": matched_quote[:120], "context": "experience", "verified": True})
                return "STRONG", 0.95, {}, evidence, []

    # Context 2: Projects, Organizations, or only in skills list (PARTIAL)
    for prj in profile.get("projects", []):
        prj_text = prj.get("text", "") or prj.get("title", "")
        for kw in target_keywords:
            if match_skill(prj_text, kw):
                evidence.append({"quote": prj_text[:120], "context": "project", "verified": True})
                return "PARTIAL", 0.85, {}, evidence, []

    for sk in profile.get("skills", []):
        sk_name = sk.get("name", "") if isinstance(sk, dict) else str(sk)
        for kw in target_keywords:
            if match_skill(sk_name, kw):
                evidence.append({"quote": sk_name, "context": "skills_list", "verified": True})
                return "PARTIAL", 0.85, {}, evidence, []

    # Fallback context: In summary or headline
    summary_text = f"{profile.get('summary', '')} {profile.get('headline', '')}".strip()
    for kw in target_keywords:
        if match_skill(summary_text, kw):
            evidence.append({"quote": summary_text[:120].strip(), "context": "summary", "verified": True})
            return "PARTIAL", 0.80, {}, evidence, []

    return "NOT_DEMONSTRATED", 0.95, {}, [], []


def eval_responsibility(
    profile: dict[str, Any],
    req: dict[str, Any],
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates RESPONSIBILITY (e.g. building REST API, microservices, or domain admin)."""
    concepts = [c.lower() for c in req.get("concepts", [])]
    target_kws: list[str] = []
    for c in concepts:
        base = c.split(":")[-1]
        target_kws.extend(CONCEPT_ALIASES.get(c, [base, base.replace("_", " "), base.replace("_", "-")]))

    if not target_kws:
        desc = (req.get("description") or "") + " " + (req.get("source_text") or "")
        potential = re.findall(r"[A-Za-z0-9+#]+", desc)
        for term in potential:
            t_lower = term.lower()
            if len(t_lower) >= 3 and t_lower not in {
                "dan",
                "yang",
                "atau",
                "dengan",
                "untuk",
                "dalam",
                "serta",
                "ke",
                "di",
                "dari",
                "memahami",
                "mampu",
                "menguasai",
                "melakukan",
                "minimal",
                "sebagai",
                "merupakan",
                "nilai",
                "tambah",
                "proyek",
                "pekerjaan",
            }:
                target_kws.extend(CONCEPT_ALIASES.get(f"skill:{t_lower}", [t_lower]))

    # For API building
    build_verbs = [
        r"membangun",
        r"mendesain",
        r"mengembangkan",
        r"membuat",
        r"built",
        r"designed",
        r"developed",
        r"created",
    ]
    target_terms = [r"rest\s+api", r"microservices", r"layanan\s+mikro", r"api\b"]

    evidence = []
    has_building_job = False
    has_building_proj = False
    has_testing_only = False

    for exp in profile.get("experiences", []):
        is_intern = exp.get("context") == "internship" or exp.get("employment_type") == "internship"
        bullets = [b.get("text", "") for b in exp.get("bullets", [])]
        for b in bullets:
            b_lower = b.lower()

            is_test_automation = (
                "test" in b_lower
                or "pengujian" in b_lower
                or "qa" in b_lower
                or "pytest" in b_lower
                or "automation" in b_lower
            )

            # Concept matching for domain responsibilities (like domain administration in JD-02)
            if target_kws and not any("api" in kw for kw in target_kws):
                for kw in target_kws:
                    if re.search(rf"\b{re.escape(kw)}", b_lower):
                        evidence.append({"quote": b, "context": "experience", "verified": True})
                        return "STRONG", 0.95, {}, evidence, []

            is_build = any(re.search(v, b_lower) for v in build_verbs)
            is_target = any(re.search(t, b_lower) for t in target_terms)

            if is_build and is_target:
                if is_test_automation:
                    has_testing_only = True
                elif not is_intern and "internal sederhana" not in b_lower:
                    has_building_job = True
                    evidence.append({"quote": b, "context": "experience", "verified": True})
                else:
                    has_building_proj = True
                    evidence.append({"quote": b, "context": "internship", "verified": True})

    # Also check job titles for responsibility concepts
    if target_kws and not any("api" in kw for kw in target_kws):
        for exp in profile.get("experiences", []):
            t_lower = exp.get("title", "").lower()
            for kw in target_kws:
                if re.search(rf"\b{re.escape(kw)}", t_lower):
                    evidence.append({"quote": exp.get("title", ""), "context": "experience", "verified": True})
                    return "STRONG", 0.95, {}, evidence, []

    for prj in profile.get("projects", []):
        p_text = prj.get("text", "")
        if target_kws and not any("api" in kw for kw in target_kws):
            for kw in target_kws:
                if re.search(rf"\b{re.escape(kw)}", p_text.lower()):
                    evidence.append({"quote": p_text[:120], "context": "project", "verified": True})
                    return "PARTIAL", 0.85, {}, evidence, []
        if any(re.search(v, p_text.lower()) for v in build_verbs) and any(
            re.search(t, p_text.lower()) for t in target_terms
        ):
            has_building_proj = True
            evidence.append({"quote": p_text[:100], "context": "project", "verified": True})

    if target_kws and not any("api" in kw for kw in target_kws):
        for sk in profile.get("skills", []):
            for kw in target_kws:
                if re.search(rf"\b{re.escape(kw)}", sk.lower()):
                    evidence.append({"quote": sk, "context": "skills_list", "verified": True})
                    return "PARTIAL", 0.85, {}, evidence, []

        summary_comb = f"{profile.get('summary', '')} {profile.get('headline', '')}".strip()
        for kw in target_kws:
            if re.search(rf"\b{re.escape(kw)}", summary_comb.lower()):
                evidence.append({"quote": summary_comb[:120].strip(), "context": "summary", "verified": True})
                return "PARTIAL", 0.80, {}, evidence, []

    if has_building_job:
        return "STRONG", 0.95, {}, evidence, []
    if has_building_proj or has_testing_only:
        return "PARTIAL", 0.85, {}, evidence, []

    return "NOT_DEMONSTRATED", 0.95, {}, [], []


def eval_education(
    profile: dict[str, Any],
    req: dict[str, Any],
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates EDUCATION requirements."""
    params = req.get("params", {})
    desc_text = ((req.get("description") or "") + " " + (req.get("source_text") or "")).lower()
    concepts = [c.lower() for c in req.get("concepts", [])]

    min_level = params.get("min_level")
    if not min_level:
        if "d3" in desc_text and ("s1" in desc_text or "bachelor" in desc_text or "sarjana" in desc_text):
            min_level = "D3"
        elif any(deg in desc_text for deg in ["s1", "bachelor", "sarjana", "s-1", "undergraduate"]):
            min_level = "S1"
        elif any(deg in desc_text for deg in ["s2", "master", "magister", "postgraduate"]):
            min_level = "S2"
        elif any(deg in desc_text for deg in ["d3", "diploma 3", "diploma iii"]):
            min_level = "D3"
        elif any(deg in desc_text for deg in ["d4", "diploma 4", "diploma iv", "sarjana terapan"]):
            min_level = "D4"
        elif any(deg in desc_text for deg in ["sma", "smk", "high school"]):
            min_level = "SMA"
        else:
            min_level = "S1"

    allow_related = any(r_term in desc_text for r_term in ["related", "terkait", "serumpun", "relevan", "sejenis"])

    tax = get_taxonomy()
    strong_fields = [f.lower() for f in params.get("strong_fields", [])]
    partial_fields = [f.lower() for f in params.get("partial_fields", [])]

    if not strong_fields:
        for field_id, field_skill in tax.skills.items():
            if field_id.startswith("field:"):
                f_name = field_id.replace("field:", "")
                aliases = [a.lower() for a in getattr(field_skill, "aliases", [])]
                related = [r.lower() for r in getattr(field_skill, "related", [])]
                if any(f_name in c for c in concepts) or any(term in desc_text for term in aliases):
                    strong_fields.extend(aliases)
                    partial_fields.extend(related)

    if not strong_fields:
        for field_id, field_skill in tax.skills.items():
            if field_id.startswith("field:"):
                strong_fields.extend([a.lower() for a in getattr(field_skill, "aliases", [])])

    if not partial_fields:
        partial_fields = ["teknik komputer", "matematika", "rekayasa", "arsitektur", "teknik pengelasan", "welding"]

    level_rank = {"SMA": 1, "SMK": 1, "D3": 2, "D4": 3, "S1": 3, "S2": 4, "S3": 5}
    min_r = level_rank.get(min_level, 3)

    evidence = []
    state = "NOT_DEMONSTRATED"

    edu_list = list(profile.get("education", []))
    for prj in profile.get("projects", []):
        p_txt = prj.get("text", "")
        if "s1 informatika" in p_txt.lower() or "universitas" in p_txt.lower():
            edu_list.append({"level": "S1", "degree_raw": p_txt, "institution": ""})

    # Also search in profile summary if education list is empty
    if not edu_list:
        summary_txt = profile.get("summary", "")
        for deg in ["s1", "d3", "d4", "sarjana", "diploma", "bachelor"]:
            if deg in summary_txt.lower():
                edu_list.append({"level": deg.upper(), "degree_raw": summary_txt[:150], "institution": ""})
                break

    for edu in edu_list:
        lvl = edu.get("level", "S1")
        lvl_r = level_rank.get(lvl, 3)
        comb = f"{edu.get('degree_raw', '')} {edu.get('major', '')} {edu.get('degree', '')} {edu.get('institution', '')} {edu.get('text', '')}".lower()

        is_strong_f = any(f in comb for f in strong_fields)
        is_partial_f = any(f in comb for f in partial_fields)

        if (is_strong_f or (is_partial_f and allow_related)) and lvl_r >= min_r:
            state = "STRONG"
            evidence.append({"quote": comb[:100], "context": "education", "verified": True})
            return state, 0.95, {}, evidence, []
        elif (is_strong_f and lvl_r < min_r) or is_partial_f:
            state = "PARTIAL"
            evidence.append({"quote": comb[:100], "context": "education", "verified": True})

    if state == "NOT_DEMONSTRATED":
        summary_comb = f"{profile.get('summary', '')} {profile.get('headline', '')}".lower()
        if any(f in summary_comb for f in strong_fields) and any(
            lvl.lower() in summary_comb for lvl in ["s1", "s2", "sarjana", "bachelor", "master", "magister"]
        ):
            evidence.append({"quote": summary_comb[:100], "context": "summary", "verified": True})
            return "STRONG", 0.90, {}, evidence, []
        elif any(f in summary_comb for f in partial_fields):
            evidence.append({"quote": summary_comb[:100], "context": "summary", "verified": True})
            return "PARTIAL", 0.80, {}, evidence, []

    return state, 0.95, {}, evidence, []


def eval_certification(
    profile: dict[str, Any],
    req: dict[str, Any],
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates CERTIFICATION requirements using taxonomy mappings."""
    concepts = [c.lower() for c in req.get("concepts", [])]
    desc_text = ((req.get("description") or "") + " " + (req.get("source_text") or "")).lower()
    cert_certs = list(profile.get("certifications", []))
    for sk in profile.get("skills", []):
        sk_val = sk.get("name", "") if isinstance(sk, dict) else str(sk)
        if any(
            term in sk_val.lower()
            for term in ["k3", "sertifikat", "certificate", "competence", "kompetensi", "ahli", "bnsp", "inspektur"]
        ):
            cert_certs.append(sk_val)

    evidence = []
    tax = get_taxonomy()
    for c in cert_certs:
        c_lower = c.lower()
        for cert_concept, terms in tax.certifications.items():
            if (cert_concept in concepts or any(t in desc_text for t in terms)) and any(t in c_lower for t in terms):
                evidence.append({"quote": c, "context": "certification", "verified": True})
                return "STRONG", 0.95, {}, evidence, []

    return "NOT_DEMONSTRATED", 0.95, {}, [], []


def eval_achievement(
    profile: dict[str, Any],
    req: dict[str, Any],
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates ACHIEVEMENT requirements (quantified metrics in relevant domain or competition awards)."""
    concepts = [c.lower() for c in req.get("concepts", [])]
    num_pat = re.compile(
        r"\b\d+(?:[.,]\d+)?\s*(?:%|ms|detik|menit|jam|hari|juta|k|m|ribu|x\s*lipat|posisi|karyawan|orang|akun|\+)",
        re.IGNORECASE,
    )
    award_pat = re.compile(
        r"\b(?:juara|winner|place|terbaik|best|olympiad|olimpiade|penghargaan|award|competition|kompetisi)\b",
        re.IGNORECASE,
    )

    is_hr_achievement = "achievement:quantified_hr" in concepts
    is_biz_comp = any(
        c in concepts
        for c in (
            "achievement:business_competition",
            "skill:business_competition",
            "achievement:competition",
            "competition",
        )
    )
    evidence = []
    has_tech_num = False
    has_hr_num = False
    has_biz_num = False
    has_comp_award = False
    has_unrelated_num = False

    # 1. Inspect explicit achievements section
    for ach in profile.get("achievements", []):
        txt = ach.get("text", "") or ach.get("title", "")
        if award_pat.search(txt) or num_pat.search(txt):
            has_comp_award = True
            evidence.append({"quote": txt[:120], "context": "achievements", "verified": True})

    # 2. Inspect experiences bullets
    for exp in profile.get("experiences", []):
        bullet_text = " ".join(b.get("text", "") for b in exp.get("bullets", []))
        rf = classify_role_family(exp.get("title", ""), bullet_text)
        for b in exp.get("bullets", []):
            txt = b.get("text", "")
            if award_pat.search(txt):
                has_comp_award = True
                evidence.append({"quote": txt[:120], "context": "experience", "verified": True})
            if num_pat.search(txt):
                if rf == "hr":
                    has_hr_num = True
                    evidence.append({"quote": txt[:120], "context": "experience", "verified": True})
                elif rf in ("backend", "fullstack", "devops"):
                    has_tech_num = True
                    evidence.append({"quote": txt[:120], "context": "experience", "verified": True})
                elif rf in ("business_analyst", "financial_analyst", "consultant", "data"):
                    has_biz_num = True
                    evidence.append({"quote": txt[:120], "context": "experience", "verified": True})
                else:
                    has_unrelated_num = True

    # 3. Inspect projects
    for prj in profile.get("projects", []):
        txt = prj.get("text", "")
        if award_pat.search(txt):
            has_comp_award = True
            evidence.append({"quote": txt[:100], "context": "project", "verified": True})
        if num_pat.search(txt):
            has_biz_num = True
            evidence.append({"quote": txt[:100], "context": "project", "verified": True})

    if is_biz_comp and (has_comp_award or has_biz_num):
        return "STRONG", 0.95, {}, evidence, []
    if has_comp_award:
        return "STRONG", 0.95, {}, evidence, []
    if is_hr_achievement and has_hr_num:
        return "STRONG", 0.95, {}, evidence, []
    if not is_hr_achievement and has_tech_num:
        return "STRONG", 0.95, {}, evidence, []
    if has_biz_num:
        return "STRONG", 0.95, {}, evidence, []
    if has_unrelated_num:
        has_tech_rf = any(
            classify_role_family(e.get("title", ""))
            in (
                "backend",
                "fullstack",
                "data",
                "qa",
                "devops",
                "business_analyst",
                "financial_analyst",
                "consultant",
            )
            for e in profile.get("experiences", [])
        )
        if has_tech_rf and not is_hr_achievement:
            return "PARTIAL", 0.85, {}, [], []
    return "NOT_DEMONSTRATED", 0.95, {}, [], []


def eval_leadership(
    profile: dict[str, Any],
    req: dict[str, Any],
) -> tuple[str, float, dict[str, Any], list[dict[str, Any]], list[str]]:
    """Evaluates LEADERSHIP requirements using taxonomy mappings."""
    tax = get_taxonomy()
    evidence = []
    has_tech_lead = False
    has_qa_or_org_lead = False
    has_sales_lead = False

    for exp in profile.get("experiences", []):
        title = exp.get("title", "")
        rf = classify_role_family(title)
        bullets_text = " ".join(b.get("text", "") for b in exp.get("bullets", []))

        is_lead = any(v.search(bullets_text) for v in tax.compiled_leadership_verbs) or any(
            t.search(title) for t in tax.compiled_leadership_titles
        )

        if is_lead:
            lead_quote = (bullets_text[:120].strip() or title).strip()
            if rf in ("backend", "fullstack", "devops"):
                has_tech_lead = True
                evidence.append({"quote": lead_quote, "context": "experience", "verified": True})
            elif rf in ("qa", "data"):
                has_qa_or_org_lead = True
                evidence.append({"quote": lead_quote, "context": "experience", "verified": True})
            elif "sales" in title.lower() or "marketing" in title.lower():
                has_sales_lead = True

    for org in profile.get("organizations", []):
        txt = org.get("text", "") or org.get("title", "")
        if any(v.search(txt) for v in tax.compiled_leadership_verbs):
            has_qa_or_org_lead = True
            evidence.append({"quote": txt[:100], "context": "organization", "verified": True})

    for prj in profile.get("projects", []):
        txt = prj.get("text", "")
        if any(v.search(txt) for v in tax.compiled_leadership_verbs):
            has_qa_or_org_lead = True
            evidence.append({"quote": txt[:100], "context": "project", "verified": True})

    if has_tech_lead:
        return "STRONG", 0.95, {}, evidence, []
    if has_qa_or_org_lead:
        return "PARTIAL", 0.85, {}, evidence, []
    if has_sales_lead:
        return "NOT_DEMONSTRATED", 0.95, {}, [], []

    return "NOT_DEMONSTRATED", 0.95, {}, [], []
