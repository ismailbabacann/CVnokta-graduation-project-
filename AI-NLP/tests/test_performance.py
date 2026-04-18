"""
Phase H — Performance tests.

Tests for:
  - H1: Latency collector
  - H2: LLM response cache
  - H3: Multilingual embedding model config
  - H4: FAISS per-request isolation
"""

from __future__ import annotations

import time

import pytest

from app.config import get_settings


# ── H1: Latency Collector ──────────────────────────────────────────

class TestLatencyCollector:
    def test_record_and_stats(self):
        from app.utils.logging import LatencyCollector

        c = LatencyCollector()
        for ms in [10, 20, 30, 40, 50]:
            c.record("parsing", ms)

        stats = c.get_stats()
        assert "parsing" in stats
        assert stats["parsing"]["count"] == 5
        assert stats["parsing"]["avg_ms"] == 30.0
        assert stats["parsing"]["min_ms"] == 10.0
        assert stats["parsing"]["max_ms"] == 50.0
        assert stats["parsing"]["p50_ms"] == 30.0

    def test_empty_stats(self):
        from app.utils.logging import LatencyCollector

        c = LatencyCollector()
        assert c.get_stats() == {}

    def test_clear(self):
        from app.utils.logging import LatencyCollector

        c = LatencyCollector()
        c.record("x", 100)
        c.clear()
        assert c.get_stats() == {}

    def test_track_latency_records(self):
        from app.utils.logging import LatencyCollector, track_latency

        c = LatencyCollector()
        c.clear()

        # Use the context manager — it records into the global collector
        with track_latency("test_stage"):
            pass  # no-op

        # The global collector should have the sample
        from app.utils.logging import get_latency_collector
        global_c = get_latency_collector()
        stats = global_c.get_stats()
        assert "test_stage" in stats


# ── H2: LLM Response Cache ────────────────────────────────────────

class TestLLMCache:
    def test_put_and_get(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from app.services.openai_service import LLMCache

        cache = LLMCache(max_size=10, ttl_seconds=3600)
        data = {"score": 85.5}
        cache.put("sys", "user", data)

        result = cache.get("sys", "user")
        assert result == data
        assert cache.stats["hits"] == 1
        assert cache.stats["size"] == 1

    def test_miss(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from app.services.openai_service import LLMCache

        cache = LLMCache()
        result = cache.get("sys", "nonexistent")
        assert result is None
        assert cache.stats["misses"] == 1

    def test_ttl_expiry(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from app.services.openai_service import LLMCache

        cache = LLMCache(max_size=10, ttl_seconds=0)  # instant expiry
        cache.put("sys", "user", {"data": 1})
        time.sleep(0.01)
        result = cache.get("sys", "user")
        assert result is None

    def test_lru_eviction(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from app.services.openai_service import LLMCache

        cache = LLMCache(max_size=2, ttl_seconds=3600)
        cache.put("sys", "a", {"a": 1})
        cache.put("sys", "b", {"b": 2})
        cache.put("sys", "c", {"c": 3})  # evicts "a"

        assert cache.get("sys", "a") is None
        assert cache.get("sys", "b") == {"b": 2}
        assert cache.get("sys", "c") == {"c": 3}
        assert cache.stats["size"] == 2

    def test_clear(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from app.services.openai_service import LLMCache

        cache = LLMCache()
        cache.put("sys", "user", {"x": 1})
        cache.clear()
        assert cache.stats["size"] == 0
        assert cache.stats["hits"] == 0

    def test_hit_rate(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        from app.services.openai_service import LLMCache

        cache = LLMCache(max_size=10, ttl_seconds=3600)
        cache.put("sys", "user", {"x": 1})
        cache.get("sys", "user")  # hit
        cache.get("sys", "miss")  # miss
        assert cache.stats["hit_rate"] == 0.5


# ── H3: Multilingual Embedding Model ──────────────────────────────

class TestMultilingualEmbedding:
    def test_config_uses_multilingual_model(self):
        settings = get_settings()
        assert "multilingual" in settings.embedding_model.lower()

    def test_embedding_service_loads(self):
        """Verify the multilingual model loads and produces embeddings."""
        from app.services.embedding_service import EmbeddingService

        svc = EmbeddingService()
        vecs = svc.embed(["Merhaba dünya", "Hello world"])
        assert vecs.shape[0] == 2
        assert vecs.shape[1] > 0

    def test_turkish_english_similarity(self):
        """Turkish and English versions of same concept should be more similar than unrelated."""
        import numpy as np
        from app.services.embedding_service import EmbeddingService

        svc = EmbeddingService()
        vecs = svc.embed([
            "Python programlama deneyimi",   # TR: Python programming experience
            "Python programming experience",  # EN
            "Çiçek yetiştirme hobisi",        # TR: Flower growing hobby (unrelated)
        ])

        # Cosine similarity
        def cosine(a, b):
            return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

        sim_related = cosine(vecs[0], vecs[1])
        sim_unrelated = cosine(vecs[0], vecs[2])

        assert sim_related > sim_unrelated, (
            f"Related similarity ({sim_related:.3f}) should exceed "
            f"unrelated ({sim_unrelated:.3f})"
        )


# ── H4: FAISS Per-Request Isolation ───────────────────────────────

class TestFAISSIsolation:
    def test_separate_instances_dont_share_state(self):
        """Two VectorStore instances must not share indexes."""
        from app.services.embedding_service import EmbeddingService
        from app.services.vector_store import VectorStore

        emb = EmbeddingService()
        vs1 = VectorStore(emb)
        vs2 = VectorStore(emb)

        vs1.add_texts(["Python developer needed"])
        # vs2 should have no texts indexed
        results = vs2.search("Python", top_k=1)
        assert len(results) == 0

    def test_per_request_index_is_independent(self):
        """Each VectorStore builds its own FAISS index."""
        from app.services.embedding_service import EmbeddingService
        from app.services.vector_store import VectorStore

        emb = EmbeddingService()

        vs1 = VectorStore(emb)
        vs1.add_texts(["data science", "machine learning"])

        vs2 = VectorStore(emb)
        vs2.add_texts(["web development", "frontend"])

        r1 = vs1.search("ML models", top_k=1)
        r2 = vs2.search("ML models", top_k=1)

        # vs1 should match data-science content, vs2 should match web content
        assert r1[0][0] != r2[0][0]
