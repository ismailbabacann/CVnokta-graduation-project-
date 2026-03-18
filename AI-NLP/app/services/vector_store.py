"""
FAISS-backed vector store for similarity search.

Lightweight wrapper – no persistence needed because we rebuild per-request
(job postings change; no point in long-lived indexes for now).
"""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np

from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class VectorStore:
    """
    In-memory FAISS index.

    Usage:
        vs = VectorStore(embedding_service)
        vs.add_texts(["req 1", "req 2", ...])
        matches = vs.search("candidate skill text", top_k=5)
    """

    def __init__(self, embedding_service: EmbeddingService) -> None:
        import faiss as _faiss

        self._faiss = _faiss
        self._emb = embedding_service
        self._index = None
        self._texts: List[str] = []

    def add_texts(self, texts: List[str]) -> None:
        """Embed and index a list of texts."""
        if not texts:
            return
        vectors = self._emb.embed(texts)
        # Normalise so inner-product ≈ cosine similarity
        self._faiss.normalize_L2(vectors)
        self._index = self._faiss.IndexFlatIP(vectors.shape[1])
        self._index.add(vectors)
        self._texts = list(texts)
        logger.debug("Indexed %d texts (%d dim)", len(texts), vectors.shape[1])

    def search(self, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Return the *top_k* most similar texts with their similarity scores.

        Returns:
            List of (text, score) tuples sorted by descending score.
        """
        if self._index is None or self._index.ntotal == 0:
            return []

        query_vec = self._emb.embed_single(query).reshape(1, -1).copy()
        self._faiss.normalize_L2(query_vec)

        k = min(top_k, self._index.ntotal)
        scores, indices = self._index.search(query_vec, k)

        results: List[Tuple[str, float]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            results.append((self._texts[idx], float(score)))
        return results
