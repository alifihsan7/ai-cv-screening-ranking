"""Embedding generator for candidate profile chunks and requirements using Harrier on CPU (FX-32).

Re-exports core routines from src.services.embedding for backward compatibility.
"""

from __future__ import annotations

from src.services.embedding import embed_texts, get_embedding_model

__all__ = ["embed_texts", "get_embedding_model"]
