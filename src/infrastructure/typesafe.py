"""Single source of truth for TypeSafe (Jev) connection settings."""

from __future__ import annotations

import os
from dataclasses import dataclass

from src.infrastructure.config import settings


@dataclass(frozen=True)
class TypeSafeConfig:
    api_key: str | None
    base_url: str | None
    model: str
    timeout: float

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)


def load_typesafe_config(
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    timeout: float | None = None,
) -> TypeSafeConfig:
    """Resolves TypeSafe settings: explicit argument > environment variable > `settings`.

    An empty `TYPESAFE_API_KEY` in the environment counts as set, so it deliberately disables the
    key from `.env` (used by the test suite to forbid live API calls).
    """
    if api_key is None:
        env_key = os.environ.get("TYPESAFE_API_KEY")
        api_key = env_key if env_key is not None else settings.TYPESAFE_API_KEY
    return TypeSafeConfig(
        api_key=str(api_key).strip() or None,
        base_url=base_url or os.environ.get("TYPESAFE_BASE_URL") or settings.TYPESAFE_BASE_URL or None,
        model=model or os.environ.get("TYPESAFE_MODEL") or settings.TYPESAFE_MODEL or "jev-latest",
        timeout=timeout if timeout is not None else settings.TYPESAFE_TIMEOUT,
    )
