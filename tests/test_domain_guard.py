from src.domain.domain_guard import (
    DOMAIN_GUARD_FLAG,
    apply_domain_guard,
    find_experience_for_quote,
    names_non_technical_team,
    vacancy_is_technical,
)
from src.domain.kind_rules import eval_achievement, eval_leadership
from src.domain.models import EvaluationStatus

TECH_REQS = [{"kind": "EXPERIENCE_DURATION", "params": {"accepted_role_families": ["backend", "fullstack"]}}]
HR_REQS = [{"kind": "EXPERIENCE_DURATION", "params": {"accepted_role_families": ["hr"]}}]


def _exp(title: str, *bullets: str) -> dict:
    return {"title": title, "bullets": [{"text": b} for b in bullets]}


MARKETING = {"experiences": [_exp("Digital Marketing Manager", "Led a team of 7 content marketers across three consumer brands.")]}
BACKEND_RELOCATION = {
    "experiences": [
        _exp(
            "Backend Developer",
            "Membangun REST API dengan Python (Django) untuk layanan keanggotaan.",
            "Memimpin tim panitia relokasi kantor beranggotakan 8 orang.",
        )
    ]
}
BACKEND_TEAM = {"experiences": [_exp("Backend Developer", "Led a team of 5 backend engineers building the payments platform.")]}


def test_non_technical_team_needs_no_technical_term():
    assert names_non_technical_team("Memimpin tim panitia relokasi kantor beranggotakan 8 orang.")
    assert not names_non_technical_team("Led the engineering team that migrated the office network.")


def test_leadership_ignores_a_lead_verb_over_a_non_technical_team_in_a_backend_job():
    state, *_ = eval_leadership(BACKEND_RELOCATION, {})
    assert state == "NOT_DEMONSTRATED"


def test_leadership_still_credits_a_technical_team():
    state, *_ = eval_leadership(BACKEND_TEAM, {})
    assert state == "STRONG"


def test_team_size_alone_is_not_a_measured_result():
    state, *_ = eval_achievement(BACKEND_RELOCATION, {"concepts": []})
    assert state == "NOT_DEMONSTRATED"


def test_team_size_next_to_a_real_result_still_counts():
    profile = {"experiences": [_exp("Backend Developer", "Memimpin tim 5 orang dan menurunkan latensi sebesar 40%.")]}
    state, *_ = eval_achievement(profile, {"concepts": []})
    assert state == "STRONG"


def test_vacancy_is_technical_from_accepted_role_families():
    assert vacancy_is_technical(TECH_REQS)
    assert not vacancy_is_technical(HR_REQS)


def test_find_experience_for_quote_returns_the_job_or_none():
    quote = "Led a team of 7 content marketers across three consumer brands."
    assert find_experience_for_quote(MARKETING, quote)["title"] == "Digital Marketing Manager"
    assert find_experience_for_quote(MARKETING, "Something that is not in the CV at all") is None


def test_guard_blocks_a_raise_from_a_non_technical_job():
    state, flags = apply_domain_guard(
        kind="LEADERSHIP",
        verifier_state=EvaluationStatus.STRONG,
        rule_state="NOT_DEMONSTRATED",
        quote="Led a team of 7 content marketers across three consumer brands.",
        profile=MARKETING,
        technical_vacancy=True,
    )
    assert state == EvaluationStatus.NOT_DEMONSTRATED
    assert flags == [DOMAIN_GUARD_FLAG]


def test_guard_leaves_a_technical_job_a_non_technical_vacancy_and_other_kinds_alone():
    quote = "Led a team of 5 backend engineers building the payments platform."
    kwargs = dict(verifier_state=EvaluationStatus.STRONG, rule_state="NOT_DEMONSTRATED", quote=quote)
    assert apply_domain_guard(kind="LEADERSHIP", profile=BACKEND_TEAM, technical_vacancy=True, **kwargs)[1] == []
    marketing_quote = "Led a team of 7 content marketers across three consumer brands."
    marketing = dict(verifier_state=EvaluationStatus.STRONG, rule_state="NOT_DEMONSTRATED", quote=marketing_quote)
    assert apply_domain_guard(kind="LEADERSHIP", profile=MARKETING, technical_vacancy=False, **marketing)[1] == []
    assert apply_domain_guard(kind="SKILL", profile=MARKETING, technical_vacancy=True, **marketing)[1] == []


def test_guard_never_blocks_agreeing_with_or_lowering_the_rules():
    quote = "Led a team of 7 content marketers across three consumer brands."
    state, flags = apply_domain_guard(
        kind="LEADERSHIP",
        verifier_state=EvaluationStatus.PARTIAL,
        rule_state="STRONG",
        quote=quote,
        profile=MARKETING,
        technical_vacancy=True,
    )
    assert (state, flags) == (EvaluationStatus.PARTIAL, [])
