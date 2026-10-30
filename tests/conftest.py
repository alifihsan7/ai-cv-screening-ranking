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

# Auto-load TEST_DATABASE_URL from .env if not already present in environment
if not os.environ.get("TEST_DATABASE_URL"):
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("TEST_DATABASE_URL=") and not line.startswith("#"):
                    os.environ["TEST_DATABASE_URL"] = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

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
from typesafe_sdk import ChoiceAnswer, NoulAnswer, ScoreAnswer, SystemOneResponse, Usage

from src.api.main import app
from src.domain.auth import create_access_token
from src.domain.models import UserRole

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def mock_jev_client(role_family: str = "BACKEND", choice: str = "STRONG", confidence: float = 0.95) -> AsyncMock:
    """TypeSafe client stand-in. Role-family questions get `role_family`; every other question gets an answer
    of its own type that means `choice` (STRONG, PARTIAL or NOT_DEMONSTRATED)."""

    score_for = {"STRONG": 2.4, "PARTIAL": 1.2, "NOT_DEMONSTRATED": 0.1}
    noul_for = {"STRONG": confidence, "PARTIAL": 0.5, "NOT_DEMONSTRATED": 1.0 - confidence}

    def _choice(label: str) -> ChoiceAnswer:
        return ChoiceAnswer(type="choice", choice=label, confidence=confidence, probabilities={label: confidence})

    async def _system_one(state, questions, **kwargs):
        answers: dict = {}
        for key, question in questions.items():
            qtype = getattr(question, "type", "choice")
            if qtype == "noul":
                answers[key] = NoulAnswer(type="noul", noul=noul_for[choice])
            elif qtype == "score":
                levels = {i: f"level {i}" for i in range(len(question.criteria))}
                probs = {i: (1.0 if i == 2 else 0.0) for i in levels}
                answers[key] = ScoreAnswer(
                    type="score", score=score_for[choice], confidence=confidence, legend=levels, probabilities=probs
                )
            else:
                answers[key] = _choice(role_family if key == "role_family" else choice)
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
