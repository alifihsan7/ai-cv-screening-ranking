"""Vacancy role profiles: relevance of work experience for vacancies outside software (ROLE_PROFILE_DESIGN.md)."""

from __future__ import annotations

import asyncio

import src.domain.verifier  # noqa: F401  (import order: avoids a circular import)
from src.domain.jd_compiler import attach_role_profiles, propose_role_profile
from src.domain.kind_rules import eval_experience_duration
from src.domain.role_profile import (
    infer_accepted_families,
    is_relevant_experience,
    resolve_role_profile,
    sanitize_proposal,
    uses_profile_path,
)

CIVIL_R2 = {
    "requirement_id": "R2",
    "kind": "EXPERIENCE_DURATION",
    "description": "Pengalaman kerja minimal 1-3 tahun di bidang konstruksi sipil, pengawasan proyek, atau kontraktor pelaksana.",
    "concepts": ["role_family:civil_engineer"],
    "params": {},
}
BACKEND_R1 = {"requirement_id": "R1", "kind": "EXPERIENCE_DURATION", "description": "Minimal 3 tahun sebagai Backend Engineer",
              "concepts": [], "params": {"accepted_role_families": ["backend", "fullstack"]}}


def _job(title, start, end, bullets, kind="full_time"):
    return {"title": title, "start": {"value": start}, "end": {"value": end}, "employment_type": kind,
            "bullets": [{"text": b} for b in bullets]}


def test_a_short_field_word_does_not_match_inside_a_longer_word():
    # "bi" (business intelligence) used to match inside "bidang" and add the data family to a civil vacancy
    assert infer_accepted_families(CIVIL_R2) == ["civil_engineering"]


def test_explicit_families_and_the_software_fallback_are_kept():
    assert infer_accepted_families(BACKEND_R1) == ["backend", "fullstack"]
    assert infer_accepted_families({"description": "tidak menyebut bidang apa pun", "concepts": [], "params": {}}) == ["backend", "fullstack"]


def test_the_profile_path_is_for_vacancies_outside_software_only():
    assert uses_profile_path(["civil_engineering"], {})
    assert uses_profile_path(["hr"], {})
    assert not uses_profile_path(["backend", "fullstack"], {})
    assert not uses_profile_path(["civil_engineering", "data"], {})  # any software family keeps the software path
    assert uses_profile_path(["backend"], {"role_profile": {"titles": ["x"]}})  # an approved profile always wins


def test_a_job_title_in_the_profile_makes_the_experience_relevant():
    profile = resolve_role_profile(CIVIL_R2, ["civil_engineering"])
    assert is_relevant_experience(profile, _job("Pelaksana Lapangan", "2022-01", "2023-01", []))
    assert is_relevant_experience(profile, _job("Magang Pelaksana Proyek", "2025-07", "2025-09", [], "internship"))


def test_an_unknown_title_needs_two_field_words_in_the_work_described():
    profile = resolve_role_profile(CIVIL_R2, ["civil_engineering"])
    two = _job("Staff Teknik", "2023-01", "2024-01", ["Menghitung kebutuhan tulangan dan bekisting untuk struktur beton bertulang."])
    one = _job("Staff Teknik", "2023-01", "2024-01", ["Membuat laporan mingguan untuk atasan."])
    assert is_relevant_experience(profile, two)
    assert not is_relevant_experience(profile, one)


def test_student_organizations_are_not_work_experience():
    profile = resolve_role_profile(CIVIL_R2, ["civil_engineering"])
    org = _job("Ketua Himpunan Mahasiswa Teknik Sipil", "2022-01", "2023-01", ["Mengoordinasikan kunjungan ke proyek jembatan dan gedung."])
    assert not is_relevant_experience(profile, org)


def test_a_title_from_another_profession_is_not_rescued_by_field_words():
    profile = resolve_role_profile(CIVIL_R2, ["civil_engineering"])
    accountant = _job("Akuntan Proyek", "2022-02", "2025-08", ["Menyusun laporan keuangan proyek konstruksi gedung dan jalan."])
    developer = _job("Backend Developer", "2021-01", "2024-01", ["Membangun API untuk sistem konstruksi gedung."])
    assert not is_relevant_experience(profile, accountant)
    assert not is_relevant_experience(profile, developer)


def test_an_approved_profile_extends_the_taxonomy_seed():
    req = {**CIVIL_R2, "params": {"role_profile": {"titles": ["koordinator geoteknik"], "domain_terms": ["terowongan", "geoteknik"]}}}
    profile = resolve_role_profile(req, ["civil_engineering"])
    assert "koordinator geoteknik" in profile.titles and "pondasi" in profile.domain_terms and profile.source == "taxonomy+approved"
    assert is_relevant_experience(profile, _job("Koordinator Geoteknik", "2024-05", "2024-12", []))
    assert is_relevant_experience(profile, _job("Balai Teknik", "2024-05", "2024-12", ["Survei geoteknik untuk terowongan."]))


def test_months_are_merged_internships_count_half_and_organizations_count_nothing():
    jobs = [
        _job("Site Engineer", "2024-01", "2025-12", ["Mengawasi pondasi dan struktur beton bertulang."]),
        _job("Pengawas Lepas", "2025-01", "2025-06", ["Mengawasi pondasi dan struktur rumah."], "freelance"),
        _job("Magang Pelaksana Proyek", "2022-07", "2022-09", [], "internship"),
        _job("Ketua Himpunan Mahasiswa Teknik Sipil", "2021-01", "2021-12", ["Kunjungan ke proyek gedung dan jembatan."]),
    ]
    state, _, metrics, _, _ = eval_experience_duration({"experiences": jobs}, CIVIL_R2, as_of="2026-10-01")
    assert state == "STRONG"
    assert metrics["total_months"] == 25.5  # 24 merged + 3 internship months at 50%


def test_the_production_path_does_not_need_the_software_classifier_for_a_civil_vacancy():
    jobs = [_job("Pelaksana Lapangan", "2022-07", "2024-06", ["Mengatur mandor di lapangan."])]

    async def go():
        return await eval_experience_duration({"experiences": jobs}, CIVIL_R2, as_of="2026-10-01", use_jev=True)

    state, _, metrics, _, _ = asyncio.run(go())
    assert state == "STRONG" and metrics["total_months"] == 24.0


def test_a_hr_vacancy_is_read_through_its_own_family_too():
    hr_r1 = {"requirement_id": "R1", "kind": "EXPERIENCE_DURATION", "description": "Minimal 2 tahun pengalaman di bidang HR",
             "concepts": [], "params": {"min_months": 24, "accepted_role_families": ["hr"]}}
    jobs = [_job("HR Generalist", "2022-01", "2026-09", ["Mengelola payroll dan rekrutmen."])]
    async def go():
        return await eval_experience_duration({"experiences": jobs}, hr_r1, as_of="2026-10-01", use_jev=True)
    assert asyncio.run(go())[0] == "STRONG"


def test_a_software_vacancy_keeps_the_software_path():
    jobs = [_job("Backend Developer", "2021-01", "2026-09", ["Membangun REST API dengan Python."])]
    state, _, metrics, _, _ = eval_experience_duration({"experiences": jobs}, BACKEND_R1, as_of="2026-10-01")
    assert state == "STRONG" and "total_months" not in metrics  # the profile path adds total_months; this one does not


def test_a_proposal_is_cleaned_before_it_is_kept():
    raw = {
        "titles": ["Pelaksana Lapangan", "  site   engineer ", "engineer", 42, "x" * 80, "<script>", "Pelaksana Lapangan"],
        "domain_terms": ["Pondasi", "https://x.example", "proyek", "beton bertulang", None],
    }
    assert sanitize_proposal(raw) == {"titles": ["pelaksana lapangan", "site engineer"], "domain_terms": ["pondasi", "beton bertulang"]}
    assert sanitize_proposal("not a dict") == {"titles": [], "domain_terms": []}
    assert len(sanitize_proposal({"titles": [f"judul {chr(97 + i % 26)}{i}" for i in range(80)]})["titles"]) == 24


class _Gateway:
    def __init__(self, answer=None, fail=False):
        self.answer, self.fail, self.calls = answer, fail, 0

    async def call_chat(self, **kwargs):
        self.calls += 1
        if self.fail:
            raise RuntimeError("gateway down")
        return self.answer


def test_the_compiler_stores_a_cleaned_proposal_for_a_civil_vacancy():
    gw = _Gateway({"titles": ["Pelaksana Lapangan", "pengawas pekerjaan"], "domain_terms": ["pondasi", "kurva s"]})
    reqs = [{**CIVIL_R2, "params": {}}, {"kind": "SKILL", "description": "AutoCAD", "params": {}}]
    asyncio.run(attach_role_profiles(reqs, "teks lowongan sipil", gw))
    assert reqs[0]["params"]["role_profile"] == {"titles": ["pelaksana lapangan", "pengawas pekerjaan"], "domain_terms": ["pondasi", "kurva s"], "source": "llm_proposal"}
    assert "role_profile" not in reqs[1]["params"]
    assert gw.calls == 1


def test_the_compiler_does_not_ask_the_model_for_a_software_vacancy():
    gw = _Gateway({"titles": ["x y"], "domain_terms": ["a b"]})
    reqs = [dict(BACKEND_R1, params={"accepted_role_families": ["backend"]})]
    asyncio.run(attach_role_profiles(reqs, "lowongan backend", gw))
    assert "role_profile" not in reqs[0]["params"] and gw.calls == 0


def test_a_failing_model_leaves_the_taxonomy_seed_in_charge():
    gw = _Gateway(fail=True)
    reqs = [{**CIVIL_R2, "params": {}}]
    asyncio.run(attach_role_profiles(reqs, "teks", gw))
    assert reqs[0]["params"] == {}
    assert asyncio.run(propose_role_profile("teks", gw)) == {"titles": [], "domain_terms": []}


def test_protected_attributes_proposed_by_the_model_are_dropped():
    gw = _Gateway({"titles": ["pelaksana lapangan", "pria berpenampilan menarik"], "domain_terms": ["pondasi", "wanita muda"]})
    proposal = asyncio.run(propose_role_profile("teks", gw))
    assert "pelaksana lapangan" in proposal["titles"] and "pondasi" in proposal["domain_terms"]
    assert "pria berpenampilan menarik" not in proposal["titles"]
    assert "wanita muda" not in proposal["domain_terms"]
