from unittest.mock import AsyncMock, patch

import pytest

from src.domain.jd_compiler import compile_job_requirements


@pytest.mark.asyncio
async def test_jd_compilation_with_hr_contacts_succeeds():
    jd_with_contacts = """
    # Lowongan Backend Engineer
    Kualifikasi:
    - Minimal 3 tahun pengalaman dengan Python dan PostgreSQL
    - Menguasai Docker dan REST API
    
    Kirimkan CV dan portofolio Anda ke hr@perusahaan.com atau hubungi WA HR: 081234567890.
    """
    mock_llm_res = {
        "requirements": [
            {
                "requirement_id": "R1",
                "description": "Minimal 3 tahun pengalaman dengan Python dan PostgreSQL",
                "category": "EXPERIENCE",
                "kind": "EXPERIENCE_DURATION",
                "importance": "MUST_HAVE",
                "weight": 20.0,
                "concepts": ["skill:python", "skill:postgresql"],
            },
            {
                "requirement_id": "R2",
                "description": "Menguasai Docker dan REST API",
                "category": "HARD_SKILLS",
                "kind": "SKILL",
                "importance": "MUST_HAVE",
                "weight": 15.0,
                "concepts": ["skill:docker", "skill:rest_api"],
            },
        ]
    }
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock, return_value=mock_llm_res):
        res = await compile_job_requirements(jd_with_contacts)
        assert res is not None
        assert "requirements" in res
        assert len(res["requirements"]) > 0
        # Prohibited flags should not complain about HR contact
        assert not any("PROHIBITED" in f for f in res.get("prohibited_flags", []))
