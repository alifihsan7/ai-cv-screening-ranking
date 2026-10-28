"""Tests for embedding service batch inference, CPU optimization, and transparent telemetry."""

from __future__ import annotations

import logging
import math
from unittest.mock import MagicMock, patch

import pytest

from src.infrastructure.config import settings
from src.services.embedding import embed_texts, get_embedding_model
from src.worker.embedding import embed_texts as worker_embed_texts
from src.worker.embedding import get_embedding_model as worker_get_model


def test_reexport_parity():
    """Verify src.worker.embedding re-exports src.services.embedding identically."""
    assert worker_embed_texts is embed_texts
    assert worker_get_model is get_embedding_model


def test_embed_texts_empty():
    """Empty list should short-circuit and return [] without model inference."""
    result = embed_texts([])
    assert result == []


def test_embed_texts_batching_and_telemetry(caplog: pytest.LogCaptureFixture):
    """Verify batching splits inputs properly and emits telemetry logs per batch."""
    caplog.set_level(logging.INFO, logger="cv_screening")

    texts = [
        "Python backend engineer with FastAPI experience",
        "PostgreSQL database query optimization and indexing",
        "Docker containerization and Kubernetes orchestration",
        "Machine learning model deployment and inference pipeline",
        "CI/CD pipeline with GitHub Actions and automated testing",
    ]

    # Run with batch_size=2 on 5 items -> 3 batches (2, 2, 1)
    results = embed_texts(texts, batch_size=2)

    assert len(results) == 5
    for vec in results:
        assert len(vec) == settings.EMBEDDING_DIM
        # Harrier normalizes embeddings: L2 norm should be ~ 1.0
        norm = math.sqrt(sum(x * x for x in vec))
        assert abs(norm - 1.0) < 1e-3

    # Check telemetry logs
    log_texts = [r.message for r in caplog.records]
    assert any("Embedding batch 1/3 (2 items) completed in" in msg for msg in log_texts)
    assert any("Embedding batch 2/3 (2 items) completed in" in msg for msg in log_texts)
    assert any("Embedding batch 3/3 (1 items) completed in" in msg for msg in log_texts)
    assert any("Completed embedding 5 texts across 3 batch(es)" in msg for msg in log_texts)


def test_embed_texts_uses_inference_mode():
    """Verify torch.inference_mode is used during inference."""
    import torch  # type: ignore[import-not-found]

    inference_mode_active = []

    mock_model = MagicMock()

    def fake_encode(batch, **kwargs):
        # torch.is_inference_mode_enabled() indicates whether inference_mode context is active
        inference_mode_active.append(torch.is_inference_mode_enabled())
        return [[0.1] * 640 for _ in batch]

    mock_model.encode.side_effect = fake_encode

    with patch("src.services.embedding.get_embedding_model", return_value=mock_model):
        res = embed_texts(["Test sentence A", "Test sentence B"], batch_size=1)
        assert len(res) == 2
        assert len(inference_mode_active) == 2
        assert all(inference_mode_active)


def test_cpu_thread_configuration():
    """Verify CPU thread setting is applied when configured."""
    import torch  # type: ignore[import-not-found]

    with patch("src.services.embedding._model", None), patch.object(settings, "EMBEDDING_NUM_THREADS", 2):
        get_embedding_model()
        assert torch.get_num_threads() == 2
