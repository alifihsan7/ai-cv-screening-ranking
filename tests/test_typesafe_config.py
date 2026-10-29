"""Tests for the single TypeSafe connection-settings resolver."""

from __future__ import annotations

from unittest.mock import patch

from src.infrastructure.config import settings
from src.infrastructure.typesafe import load_typesafe_config


def test_environment_overrides_settings():
    with (
        patch.dict("os.environ", {"TYPESAFE_API_KEY": "env-key", "TYPESAFE_MODEL": "jev-env"}),
        patch.object(settings, "TYPESAFE_API_KEY", "settings-key"),
        patch.object(settings, "TYPESAFE_MODEL", "jev-settings"),
    ):
        cfg = load_typesafe_config()

    assert cfg.api_key == "env-key"
    assert cfg.model == "jev-env"
    assert cfg.is_configured


def test_empty_environment_key_disables_key_from_settings():
    """An empty env var is an explicit 'unconfigured', not a fall-through to the .env key."""
    with (
        patch.dict("os.environ", {"TYPESAFE_API_KEY": ""}),
        patch.object(settings, "TYPESAFE_API_KEY", "settings-key"),
    ):
        cfg = load_typesafe_config()

    assert cfg.api_key is None
    assert not cfg.is_configured


def test_explicit_arguments_win_and_blank_key_is_none():
    with patch.dict("os.environ", {"TYPESAFE_API_KEY": "env-key"}):
        cfg = load_typesafe_config(api_key="  ", base_url="https://x.test", model="m", timeout=3.0)

    assert cfg.api_key is None
    assert (cfg.base_url, cfg.model, cfg.timeout) == ("https://x.test", "m", 3.0)
