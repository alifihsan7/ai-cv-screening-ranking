"""EDUCATION and ACHIEVEMENT rules follow the state definitions in the scoring spec (section 4.2)."""

from __future__ import annotations

import pytest

from src.domain.kind_rules import eval_achievement, eval_education

EDU_REQ_EXPLICIT = {
    "requirement_id": "R7",
    "description": "S1 Teknik Informatika, Ilmu Komputer, Sistem Informasi, atau terkait",
    "kind": "EDUCATION",
    "concepts": ["field:computing"],
    "params": {
        "min_level": "S1",
        "strong_fields": ["Teknik Informatika", "Ilmu Komputer", "Sistem Informasi"],
        "partial_fields": ["Teknik Elektro", "Matematika", "Statistika"],
    },
}


def education_of(degree_raw: str) -> dict:
    return {"education": [{"level": "S1", "degree_raw": degree_raw, "institution": "Universitas Contoh"}]}


@pytest.mark.parametrize(
    ("degree", "expected"),
    [
        ("S1 Teknik Informatika", "STRONG"),
        ("S1 Statistika", "PARTIAL"),
        ("S1 Teknik Elektro (Electrical Engineering)", "PARTIAL"),
        ("S1 Akuntansi", "NOT_DEMONSTRATED"),
    ],
)
def test_explicit_partial_fields_stay_partial_even_when_the_description_says_related(degree, expected):
    state, *_ = eval_education(education_of(degree), EDU_REQ_EXPLICIT)

    assert state == expected


def test_related_wording_still_widens_fields_when_the_recruiter_gave_no_partial_list():
    req = {
        "requirement_id": "R7",
        "description": "S1 Teknik Informatika atau terkait",
        "kind": "EDUCATION",
        "concepts": ["field:computing"],
        "params": {"min_level": "S1", "strong_fields": ["Teknik Informatika"]},
    }

    state, *_ = eval_education(education_of("S1 Matematika"), req)

    assert state == "STRONG"


ACH_REQ = {"requirement_id": "R9", "kind": "ACHIEVEMENT", "concepts": ["achievement:quantified_backend"]}
HR_ACH_REQ = {"requirement_id": "R9", "kind": "ACHIEVEMENT", "concepts": ["achievement:quantified_hr"]}


def job(title: str, bullet: str) -> dict:
    return {"experiences": [{"title": title, "start": "2022-01", "end": "2024-12", "bullets": [{"text": bullet}]}]}


LATENCY = "Menurunkan latensi p95 API dari 900 ms menjadi 180 ms dengan optimasi query."


def test_number_in_a_backend_job_is_strong():
    state, *_ = eval_achievement(job("Backend Engineer", LATENCY), ACH_REQ)

    assert state == "STRONG"


def test_number_in_a_project_is_only_partial():
    profile = {"projects": [{"text": "Tugas Akhir: sistem antrian yang memangkas waktu tunggu rata-rata 25%."}]}

    state, _, _, evidence, _ = eval_achievement(profile, ACH_REQ)

    assert state == "PARTIAL"
    assert evidence and evidence[0]["context"] == "project"


def test_number_in_a_job_of_an_adjacent_domain_is_only_partial():
    state, *_ = eval_achievement(job("Data Analyst", "Mempercepat pembuatan laporan dari 2 hari menjadi 2 jam."), ACH_REQ)

    assert state == "PARTIAL"


def test_no_number_is_not_demonstrated():
    state, *_ = eval_achievement(job("Backend Engineer", "Membangun layanan pembayaran dengan Python."), ACH_REQ)

    assert state == "NOT_DEMONSTRATED"


def test_hr_number_still_counts_as_strong_for_an_hr_criterion():
    state, *_ = eval_achievement(job("HR Generalist", "Mempercepat time-to-hire dari 45 hari menjadi 30 hari."), HR_ACH_REQ)

    assert state == "STRONG"


def test_education_listed_field_also_matches_its_taxonomy_aliases():
    req = {
        "kind": "EDUCATION",
        "description": "S1 Teknik Informatika, Ilmu Komputer, atau terkait",
        "params": {"min_level": "S1", "strong_fields": ["Teknik Informatika", "Ilmu Komputer"], "partial_fields": ["Matematika"]},
    }
    english = {"education": [{"level": "S1", "degree_raw": "Bachelor of Informatics Engineering", "institution": "Universitas X"}]}
    state, *_ = eval_education(english, req)
    assert state == "STRONG"
    unrelated = {"education": [{"level": "S1", "degree_raw": "Bachelor of Business Administration", "institution": "Universitas X"}]}
    assert eval_education(unrelated, req)[0] == "NOT_DEMONSTRATED"
