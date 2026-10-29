"""Evidence chunks carry their CV section, and the retrieval step respects it."""

from __future__ import annotations

import pytest

from src.domain.evidence_chunks import RULE_EVIDENCE_BOOST, build_candidate_chunks
from src.domain.models import ContextSectionType, RetrievalActionInput
from src.domain.tools.retrieval import HybridRetrievalTool

RAW_TEXT = (
    "Backend Developer Intern di PT Contoh. Membangun REST API untuk modul pelaporan. "
    "Tugas Akhir: Sistem Informasi Perpustakaan. Dibangun dengan FastAPI, PostgreSQL, dan Docker. "
    "Keahlian: Python, FastAPI, PostgreSQL, Docker, Git"
)
PROFILE = {
    "experiences": [
        {"title": "Backend Developer Intern", "bullets": [{"text": "Membangun REST API untuk modul pelaporan."}]}
    ],
    "projects": [{"text": "Tugas Akhir: Sistem Informasi Perpustakaan. Dibangun dengan FastAPI, PostgreSQL, dan Docker."}],
    "organizations": [{"text": "Anggota Himpunan Mahasiswa Informatika"}],
    "skills": [{"name": "Python"}, {"name": "FastAPI"}, {"name": "PostgreSQL"}, {"name": "Docker"}, {"name": "Git"}],
}


def by_text(chunks: list[dict], needle: str) -> dict:
    return next(c for c in chunks if needle in c["text"])


def test_profile_entries_keep_their_section():
    chunks = build_candidate_chunks(PROFILE, RAW_TEXT)

    assert by_text(chunks, "REST API")["context_type"] == "WORK_EXPERIENCE"
    assert by_text(chunks, "Sistem Informasi Perpustakaan")["context_type"] == "PROJECT"
    assert by_text(chunks, "Himpunan")["context_type"] == "PROJECT"


def test_skills_line_is_tagged_from_the_cv_text_and_stays_verbatim():
    chunks = build_candidate_chunks(PROFILE, RAW_TEXT)

    skills = by_text(chunks, "Keahlian")
    assert skills["context_type"] == "SKILL_LIST"
    assert skills["text"] in RAW_TEXT


def test_skills_heading_is_enough_to_tag_a_skill_line():
    """The profile may know fewer than three of the listed skills; the heading still marks the line."""
    chunks = build_candidate_chunks({"skills": [{"name": "Docker"}]}, "Keahlian: Python, FastAPI, Docker, Git")

    assert by_text(chunks, "Keahlian")["context_type"] == "SKILL_LIST"


def test_prose_mentioning_skills_is_not_a_skill_line():
    chunks = build_candidate_chunks({}, "Meningkatkan soft skills tim melalui pelatihan mingguan.")

    assert chunks[0]["context_type"] == "UNKNOWN"


def test_every_chunk_is_verbatim_cv_text():
    for chunk in build_candidate_chunks(PROFILE, RAW_TEXT):
        assert chunk["text"] in RAW_TEXT or chunk["text"] in str(PROFILE)


def test_rule_evidence_comes_first_and_duplicates_are_dropped():
    rule_evidence = [{"quote": "Dibangun dengan FastAPI, PostgreSQL, dan Docker.", "context": "project"}]

    chunks = build_candidate_chunks(PROFILE, RAW_TEXT, rule_evidence)

    assert chunks[0]["kind"] == "RULE_EVIDENCE"
    assert chunks[0]["boost"] == RULE_EVIDENCE_BOOST
    assert chunks[0]["context_type"] == "PROJECT"
    texts = [" ".join(c["text"].lower().split()) for c in chunks]
    assert len(texts) == len(set(texts))


def test_unparsed_sentences_remain_available_as_unknown():
    """With no parsed profile, plain sentences stay searchable but carry no section."""
    chunks = build_candidate_chunks({}, "Membangun REST API untuk modul pelaporan. Mengelola basis data klinik.")

    assert len(chunks) == 2
    assert {c["context_type"] for c in chunks} == {"UNKNOWN"}


@pytest.mark.asyncio
async def test_retrieval_returns_the_section_and_ranks_rule_evidence_first():
    rule_evidence = [{"quote": "Anggota Himpunan Mahasiswa Informatika", "context": "organization"}]
    pool = build_candidate_chunks(PROFILE, RAW_TEXT, rule_evidence)

    # The query shares no word with the rule evidence, yet the evidence the rules found is ranked first
    result = await HybridRetrievalTool().run(
        RetrievalActionInput(
            action_type="HYBRID_RETRIEVAL", query="Docker", top_k=3, candidate_id="C1", criterion_id="R5"
        ),
        context={"chunks": pool},
    )

    assert result[0].text.startswith("Anggota Himpunan")
    assert result[0].context_type == ContextSectionType.PROJECT
    docker = next(r for r in result if "Docker" in r.text)
    assert docker.context_type in (ContextSectionType.PROJECT, ContextSectionType.SKILL_LIST)


DOCKER_REQ = {
    "requirement_id": "R5",
    "description": "Docker",
    "kind": "SKILL",
    "category": "HARD_SKILLS",
    "importance": "STRONG_PREFERENCE",
    "weight": 6,
    "concepts": ["skill:docker"],
    "params": {},
}


def keyword_aware_jev_client(keyword: str):
    """Jev stand-in that says yes only to chunks that actually mention the keyword, like a real verifier would."""
    from unittest.mock import AsyncMock

    from typesafe_sdk import NoulAnswer, SystemOneResponse, Usage

    async def _system_one(state, questions, **kwargs):
        answers = {
            key: NoulAnswer(type="noul", noul=0.95 if keyword in state["evidence_chunks"][key].lower() else 0.02)
            for key in questions
        }
        return SystemOneResponse(model="jev-latest", usage=Usage(), answers=answers)

    client = AsyncMock()
    client.system_one.side_effect = _system_one
    return client


async def _screen(profile: dict, raw_text: str):
    from src.domain.agent import ScreeningAgent
    from src.domain.verifier import JevTypeSafeVerifierProvider

    screening = ScreeningAgent(
        job_id="JD-T",
        candidate_id="C-T",
        requirements=[DOCKER_REQ],
        profile=profile,
        raw_cv_text=raw_text,
        verifier_provider=JevTypeSafeVerifierProvider(client=keyword_aware_jev_client("docker")),
        as_of="2026-10-01",
    )
    return (await screening.run()).evaluation_results["R5"]


@pytest.mark.asyncio
async def test_skill_shown_only_in_a_student_project_is_partial_even_when_jev_says_yes():
    """The M3 case: Jev confirms Docker, but the evidence is a thesis project, not a job."""
    profile = {
        "experiences": [{"title": "Backend Developer Intern", "start": "2025-01", "end": "2025-06", "bullets": [
            {"text": "Membangun REST API untuk modul pelaporan."}]}],
        "projects": [{"text": "Tugas Akhir: Sistem Informasi Perpustakaan. Dibangun dengan FastAPI, PostgreSQL, dan Docker."}],
        "skills": [{"name": "Python"}, {"name": "Docker"}],
    }

    result = await _screen(profile, RAW_TEXT)

    assert result.state.value == "PARTIAL"
    assert result.evidences and "Docker" in result.evidences[0].verbatim_quote
    assert result.evidences[0].context_type == ContextSectionType.PROJECT


@pytest.mark.asyncio
async def test_skill_shown_in_a_job_bullet_is_strong():
    bullet = "Mengemas seluruh layanan backend memakai Docker pada lingkungan produksi."
    profile = {
        "experiences": [{"title": "Backend Developer", "start": "2022-01", "end": "2024-12", "bullets": [{"text": bullet}]}],
        "projects": [],
        "skills": [{"name": "Docker"}],
    }

    result = await _screen(profile, f"Backend Developer di PT Contoh. {bullet}")

    assert result.state.value == "STRONG"


def _many_bullets_profile(count: int) -> dict:
    return {
        "experiences": [
            {
                "title": "Backend Developer",
                "start": "2022-01",
                "end": "2024-12",
                "bullets": [{"text": f"Menjaga keandalan layanan produksi nomor {i} pada jam sibuk."} for i in range(count)],
            }
        ],
        "skills": [],
    }


@pytest.mark.parametrize("top_k", [2, 6])
@pytest.mark.asyncio
async def test_number_of_chunks_sent_to_jev_follows_the_setting(top_k):
    """EVIDENCE_TOP_K bounds how many chunks the first verification cycle sends."""
    from unittest.mock import patch

    from src.domain.agent import ScreeningAgent
    from src.domain.verifier import JevTypeSafeVerifierProvider
    from src.infrastructure.config import settings
    from tests.conftest import mock_jev_client

    client = mock_jev_client(choice="NOT_DEMONSTRATED")
    requirement = {
        "requirement_id": "R_REL",
        "description": "Menjaga keandalan layanan produksi",
        "kind": "ACHIEVEMENT",
        "category": "EXPERIENCE",
        "importance": "NICE_TO_HAVE",
        "weight": 5,
        "concepts": [],
        "params": {},
    }
    profile = _many_bullets_profile(10)
    raw_text = " ".join(b["text"] for b in profile["experiences"][0]["bullets"])

    with patch.object(settings, "EVIDENCE_TOP_K", top_k):
        agent = ScreeningAgent(
            job_id="JD-T",
            candidate_id="C-T",
            requirements=[requirement],
            profile=profile,
            raw_cv_text=raw_text,
            verifier_provider=JevTypeSafeVerifierProvider(client=client),
            as_of="2026-10-01",
        )
        await agent.run()

    first_call_state = client.system_one.call_args_list[0].kwargs["state"]
    assert len(first_call_state["evidence_chunks"]) == top_k
