from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.api.main import app
from src.domain.jd_compiler import (
    JDCompilationError,
    compile_jd_rule_based,
    compile_job_requirements,
)


def test_rule_based_importance_keywords():
    jd_nice = "- Menguasai Docker merupakan nilai tambah"
    reqs_nice = compile_jd_rule_based(jd_nice)
    assert len(reqs_nice) >= 1
    assert reqs_nice[0]["importance"] == "NICE_TO_HAVE"

    jd_must = "- Wajib memiliki pengalaman 3 tahun backend"
    reqs_must = compile_jd_rule_based(jd_must)
    assert len(reqs_must) >= 1
    assert reqs_must[0]["importance"] == "MUST_HAVE"


def test_section_parser_importance_and_order_invariance():
    jd1 = """Kualifikasi Wajib:
- Menguasai Microsoft Excel
- Pengalaman di bidang keuangan

Nilai tambah:
- Pengalaman di perbankan
- Memiliki sertifikasi CFA"""

    jd2 = """Nilai tambah:
- Memiliki sertifikasi CFA
- Pengalaman di perbankan

Kualifikasi Wajib:
- Pengalaman di bidang keuangan
- Menguasai Microsoft Excel"""

    res1 = compile_jd_rule_based(jd1)
    res2 = compile_jd_rule_based(jd2)

    # Check importance by description
    imp1 = {r["description"]: r["importance"] for r in res1}
    imp2 = {r["description"]: r["importance"] for r in res2}

    assert imp1["Menguasai Microsoft Excel"] == "MUST_HAVE"
    assert imp1["Pengalaman di bidang keuangan"] == "MUST_HAVE"
    assert imp1["Pengalaman di perbankan"] == "NICE_TO_HAVE"
    assert imp1["Memiliki sertifikasi CFA"] == "NICE_TO_HAVE"

    assert imp2["Menguasai Microsoft Excel"] == "MUST_HAVE"
    assert imp2["Pengalaman di bidang keuangan"] == "MUST_HAVE"
    assert imp2["Pengalaman di perbankan"] == "NICE_TO_HAVE"
    assert imp2["Memiliki sertifikasi CFA"] == "NICE_TO_HAVE"


def test_concept_regex_boundaries():
    # 'Familiar dengan Azure DevOps' should NOT match kubernetes
    jd = "- Familiar dengan Azure DevOps dan pipeline CI/CD"
    res = compile_jd_rule_based(jd)
    assert len(res) >= 1
    concepts = res[0]["concepts"]
    assert "skill:kubernetes" not in concepts


@pytest.mark.asyncio
async def test_llm_invalid_importance_coerced():
    mock_llm_res = {
        "requirements": [
            {
                "requirement_id": "R1",
                "description": "Menguasai Kubernetes merupakan nilai tambah",
                "importance": "SUPER_IMPORTANT",
                "weight": 500,
            }
        ]
    }

    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_llm_res
        res = await compile_job_requirements("Sample JD text")
        reqs = res["requirements"]
        assert len(reqs) >= 1
        assert reqs[0]["importance"] == "NICE_TO_HAVE"
        # Weight clamped to max 30.0
        assert reqs[0]["weight"] <= 30.0


@pytest.mark.asyncio
async def test_compile_job_requirements_llm_exception_raises_fail_fast():
    """Verify Honest Fail-Fast: when LLM gateway fails, JDCompilationError is raised without silent rule-based fallback."""
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.side_effect = RuntimeError("Upstream 9Router connection timeout")
        with pytest.raises(JDCompilationError) as exc_info:
            await compile_job_requirements("Lowongan Backend Engineer\n- Minimal 3 tahun pengalaman Python")
        assert "Gagal memanggil model AI" in str(exc_info.value)
        assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_compile_job_requirements_none_response_raises_fail_fast():
    """Verify Honest Fail-Fast: when LLM gateway returns None, JDCompilationError is raised."""
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = None
        with pytest.raises(JDCompilationError) as exc_info:
            await compile_job_requirements("Lowongan Backend Engineer\n- Minimal 3 tahun pengalaman Python")
        assert "tidak mengembalikan hasil" in str(exc_info.value)
        assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_compile_job_requirements_invalid_schema_raises_fail_fast():
    """Verify Honest Fail-Fast: invalid schema from LLM raises JDCompilationError."""
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = {"something_else": 123}
        with pytest.raises(JDCompilationError) as exc_info:
            await compile_job_requirements("Lowongan Backend Engineer\n- Minimal 3 tahun pengalaman Python")
        assert "Format respons model AI tidak sesuai skema" in str(exc_info.value)
        assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_compile_job_requirements_empty_requirements_raises_fail_fast():
    """Verify Honest Fail-Fast: empty requirements from LLM raises JDCompilationError."""
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = {"requirements": []}
        with pytest.raises(JDCompilationError) as exc_info:
            await compile_job_requirements("Lowongan Backend Engineer\n- Minimal 3 tahun pengalaman Python")
        assert "tidak menghasilkan kriteria screening" in str(exc_info.value)
        assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_compile_preview_endpoint_returns_502_on_llm_failure(recruiter_token: str):
    """Verify POST /api/v1/requirements/compile-preview returns HTTP 502 on upstream LLM failure."""
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.side_effect = RuntimeError("504 Gateway Timeout")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/requirements/compile-preview",
                json={"jd_text": "Lowongan Senior Python Developer dengan minimal 5 tahun pengalaman kerja"},
                headers={"Authorization": f"Bearer {recruiter_token}"},
            )
        assert resp.status_code == 502
        assert "Gagal memanggil model AI" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_compile_preview_endpoint_returns_422_on_unparseable_output(recruiter_token: str):
    """Verify POST /api/v1/requirements/compile-preview returns HTTP 422 on invalid/empty LLM output."""
    with patch("src.domain.jd_compiler.gateway.call_chat", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = {"requirements": []}
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/requirements/compile-preview",
                json={"jd_text": "Lowongan Senior Python Developer dengan minimal 5 tahun pengalaman kerja"},
                headers={"Authorization": f"Bearer {recruiter_token}"},
            )
        assert resp.status_code == 422
        assert "tidak menghasilkan kriteria screening" in resp.json()["detail"]
