"""
Local embedding service backed by sentence-transformers.

Downloads the model on first use and caches it.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, List

import numpy as np

from app.config import get_settings

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_model_cache: dict = {}


class EmbeddingService:
    """Generate dense vector embeddings from text."""

    def __init__(self) -> None:
        from sentence_transformers import SentenceTransformer as ST

        settings = get_settings()
        model_name = settings.embedding_model
        if model_name not in _model_cache:
            logger.info("Loading embedding model: %s", model_name)
            _model_cache[model_name] = ST(model_name)
        self._model = _model_cache[model_name]

    def embed(self, texts: List[str]) -> np.ndarray:
        """
        Embed a list of texts into a 2-D numpy array (n_texts × dim).
        """
        if not texts:
            return np.empty((0, self._model.get_sentence_embedding_dimension()))
        return self._model.encode(texts, show_progress_bar=False, convert_to_numpy=True)

    def embed_single(self, text: str) -> np.ndarray:
        """Embed a single text into a 1-D numpy array."""
        return self.embed([text])[0]

    @property
    def dimension(self) -> int:
        return self._model.get_sentence_embedding_dimension()
