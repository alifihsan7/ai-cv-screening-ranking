"""Embedding generator for candidate profile chunks and requirements using Harrier on CPU (FX-32)."""

from __future__ import annotations

from typing import Any

from src.infrastructure.config import settings
from src.infrastructure.logging import logger

_model: Any | None = None


def get_embedding_model() -> Any:
    global _model
    if _model is None:
        try:
            import torch  # type: ignore[import-not-found]
            from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]
        except ImportError as e:
            raise RuntimeError(
                f"sentence-transformers/torch not installed. Run 'pip install sentence-transformers torch' to enable embeddings: {e}"
            ) from e

        logger.info(f"Loading embedding model {settings.EMBEDDING_MODEL} on CPU...")
        _model = SentenceTransformer(
            settings.EMBEDDING_MODEL, device="cpu", model_kwargs={"torch_dtype": torch.float32}
        )
        logger.info(f"Embedding model loaded successfully (max_seq_length: {_model.max_seq_length}).")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Encodes texts into normalized embedding vectors.

    Harrier supports up to 32,768 tokens context window. Texts are normalized to cosine similarity.
    """
    if not texts:
        return []
    model = get_embedding_model()
    # Batch encoding with cosine normalization
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()
