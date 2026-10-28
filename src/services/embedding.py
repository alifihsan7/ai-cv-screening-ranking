"""Embedding service using Harrier on CPU with batched inference and thread optimization (FX-32)."""

from __future__ import annotations

import time
from typing import Any

from src.infrastructure.config import settings
from src.infrastructure.logging import logger

_model: Any | None = None


def get_embedding_model() -> Any:
    """Loads and caches the SentenceTransformer model on CPU with configured thread pool."""
    global _model
    if _model is None:
        try:
            import torch  # type: ignore[import-not-found]
            from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]
        except ImportError as e:
            raise RuntimeError(
                f"sentence-transformers/torch not installed. Run 'pip install sentence-transformers torch' to enable embeddings: {e}"
            ) from e

        if settings.EMBEDDING_NUM_THREADS > 0:
            current_threads = torch.get_num_threads()
            if current_threads != settings.EMBEDDING_NUM_THREADS:
                torch.set_num_threads(settings.EMBEDDING_NUM_THREADS)
                logger.info(
                    f"Configured PyTorch CPU threads: {settings.EMBEDDING_NUM_THREADS} (was {current_threads})"
                )

        logger.info(f"Loading embedding model {settings.EMBEDDING_MODEL} on CPU...")
        _model = SentenceTransformer(
            settings.EMBEDDING_MODEL, device="cpu", model_kwargs={"torch_dtype": torch.float32}
        )
        max_seq = getattr(_model, "max_seq_length", "unknown")
        logger.info(f"Embedding model loaded successfully (max_seq_length: {max_seq}).")
    return _model


def embed_texts(texts: list[str], batch_size: int | None = None) -> list[list[float]]:
    """Encodes texts into normalized embedding vectors using batched inference.

    Uses torch.inference_mode() and logs measured duration per batch for transparent worker telemetry.
    """
    if not texts:
        return []

    effective_batch_size = batch_size if batch_size and batch_size > 0 else (settings.EMBEDDING_BATCH_SIZE or 16)
    model = get_embedding_model()
    import torch  # type: ignore[import-not-found]

    total_texts = len(texts)
    total_batches = (total_texts + effective_batch_size - 1) // effective_batch_size
    all_embeddings: list[list[float]] = []
    total_start = time.perf_counter()

    for batch_idx, start_idx in enumerate(range(0, total_texts, effective_batch_size), start=1):
        batch = texts[start_idx : start_idx + effective_batch_size]
        batch_start = time.perf_counter()
        with torch.inference_mode():
            encoded = model.encode(
                batch,
                batch_size=len(batch),
                show_progress_bar=False,
                normalize_embeddings=True,
            )
        batch_dur_ms = (time.perf_counter() - batch_start) * 1000
        avg_item_ms = batch_dur_ms / len(batch) if batch else 0.0
        logger.info(
            f"Embedding batch {batch_idx}/{total_batches} ({len(batch)} items) "
            f"completed in {batch_dur_ms:.2f}ms (avg {avg_item_ms:.2f}ms/item)"
        )
        if hasattr(encoded, "tolist"):
            all_embeddings.extend(encoded.tolist())
        else:
            all_embeddings.extend([list(x) for x in encoded])

    total_dur_ms = (time.perf_counter() - total_start) * 1000
    logger.info(
        f"Completed embedding {total_texts} texts across {total_batches} batch(es) "
        f"in {total_dur_ms:.2f}ms (effective throughput: {total_texts / (total_dur_ms / 1000):.1f} texts/sec)"
    )
    return all_embeddings
