"""Pytest configuration and shared test fixtures."""

from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path
from urllib.parse import urlparse

# Add root directory to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Add cv-extractor to python path for full extraction fidelity
cv_extractor_src = "/srv/hermes-control/services/cv-extractor/src"
if cv_extractor_src not in sys.path:
    sys.path.insert(0, cv_extractor_src)

# Set test environment before importing application
os.environ.setdefault("APP_ENV", "test")

test_db_url = os.environ.get("TEST_DATABASE_URL")
if not test_db_url:
    raise RuntimeError("Set TEST_DATABASE_URL ke database TES (bukan production).")

parsed = urlparse(test_db_url)
db_name = parsed.path.lstrip("/")
if not db_name.endswith("_test"):
    raise RuntimeError(f"Ditolak: database testing '{db_name}' harus berakhiran '_test' demi keamanan production.")

os.environ["DATABASE_URL"] = test_db_url
os.environ.setdefault("JWT_SECRET", secrets.token_hex(32))
os.environ.setdefault("METRICS_TOKEN", secrets.token_hex(32))
os.environ.setdefault("PII_ENCRYPTION_KEY", secrets.token_hex(32))
os.environ.setdefault("ALLOW_RELIGION_CRITERIA", "false")
os.environ.setdefault("ALLOW_GENDER_CRITERIA", "false")
os.environ.setdefault("LLM_DATA_POLICY", "paid_or_local_only")
os.environ.setdefault("SCORING_MODE", "rules")

# Tests never reach the real TypeSafe API unless explicitly opted in; the env var overrides the
# key in .env, so unmocked Jev code paths fail fast instead of making live (paid) calls.
RUN_LIVE_JEV = os.environ.get("RUN_LIVE_JEV") == "1"
if not RUN_LIVE_JEV:
    os.environ["TYPESAFE_API_KEY"] = ""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import httpx
import pytest
import pytest_asyncio
from typesafe_sdk import ChoiceAnswer, SystemOneResponse, Usage

from src.api.main import app
from src.domain.auth import create_access_token
from src.domain.models import UserRole

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def mock_jev_client(role_family: str = "BACKEND", choice: str = "STRONG", confidence: float = 0.95) -> AsyncMock:
    """TypeSafe client stand-in: answers role-family questions with `role_family`, every other
    (per-chunk evidence) question with `choice`."""

    def _answer(label: str) -> ChoiceAnswer:
        return ChoiceAnswer(type="choice", choice=label, confidence=confidence, probabilities={label: confidence})

    async def _system_one(state, questions, **kwargs):
        answers = {k: _answer(role_family if k == "role_family" else choice) for k in questions}
        return SystemOneResponse(model="jev-latest", usage=Usage(), answers=answers)

    client = AsyncMock()
    client.system_one.side_effect = _system_one
    return client


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def admin_token() -> str:
    return create_access_token(
        {
            "sub": "adbbfe35-43d1-40ef-a02b-10c975110219",
            "tenant_id": DEMO_TENANT_ID,
            "email": "admin@alifihsan.my.id",
            "role": UserRole.ADMIN.value,
        }
    )


@pytest.fixture
def recruiter_token() -> str:
    return create_access_token(
        {
            "sub": "ce12fcef-601b-4fb8-b8ed-f3eab5e8de6c",
            "tenant_id": DEMO_TENANT_ID,
            "email": "recruiter@alifihsan.my.id",
            "role": UserRole.RECRUITER.value,
        }
    )


@pytest.fixture
def hiring_manager_token() -> str:
    return create_access_token(
        {
            "sub": "fffb4b73-f806-46df-89b4-3318143ece4a",
            "tenant_id": DEMO_TENANT_ID,
            "email": "manager@alifihsan.my.id",
            "role": UserRole.HIRING_MANAGER.value,
        }
    )
