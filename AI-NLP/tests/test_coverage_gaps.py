"""
Phase F — Coverage Gap Tests.

Tests specifically targeting uncovered lines in:
  - openai_service.py (response coercion, JSON extraction)
  - vector_store.py (FAISS indexing and search)
  - cv_scorer.py (score_cv pipeline with mocks)
  - test_engine.py (cache key, get_cached_questions)
  - logging.py (track_latency)
  - cv_analysis.py (upload endpoints)
"""

from __future__ import annotations

import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

# ── OpenAI Service: response coercion & JSON extraction ───────────


class TestCoerceResponseText:
    """Cover _coerce_response_text helper."""

    def test_string_input(self):
        from app.services.openai_service import _coerce_response_text

        assert _coerce_response_text("  hello  ") == "hello"

    def test_list_of_strings(self):
        from app.services.openai_service import _coerce_response_text

        result = _coerce_response_text(["part1", "part2"])
        assert "part1" in result
        assert "part2" in result

    def test_list_of_dicts_with_text(self):
        from app.services.openai_service import _coerce_response_text

        result = _coerce_response_text([{"text": "hello"}, {"text": "world"}])
        assert "hello" in result
        assert "world" in result

    def test_other_type(self):
        from app.services.openai_service import _coerce_response_text

        result = _coerce_response_text(42)
        assert result == "42"

    def test_none_input(self):
        from app.services.openai_service import _coerce_response_text

        result = _coerce_response_text(None)
        assert result == "None"


class TestExtractJsonPayload:
    """Cover _extract_json_payload helper."""

    def test_direct_json(self):
        from app.services.openai_service import _extract_json_payload

        result = _extract_json_payload('{"key": "value"}')
        assert result == {"key": "value"}

    def test_fenced_json_block(self):
        from app.services.openai_service import _extract_json_payload

        text = 'Here is the result:\n```json\n{"score": 85}\n```\nDone.'
        result = _extract_json_payload(text)
        assert result == {"score": 85}

    def test_json_in_noisy_text(self):
        from app.services.openai_service import _extract_json_payload

        text = 'Some preamble text... {"analysis_score": 90, "skills": ["Python"]} ...trailing'
        result = _extract_json_payload(text)
        assert result["analysis_score"] == 90

    def test_no_json_raises_error(self):
        from app.services.openai_service import _extract_json_payload

        with pytest.raises(json.JSONDecodeError):
            _extract_json_payload("no json here at all")

    def test_array_not_dict_skipped(self):
        from app.services.openai_service import _extract_json_payload

        # Should skip top-level array and raise since no dict found
        with pytest.raises(json.JSONDecodeError):
            _extract_json_payload('[1, 2, 3]')

    def test_fenced_block_without_json_label(self):
        from app.services.openai_service import _extract_json_payload

        text = '```\n{"data": true}\n```'
        result = _extract_json_payload(text)
        assert result == {"data": True}


# ── Vector Store: FAISS operations ────────────────────────────────


class TestVectorStore:
    """Cover VectorStore add_texts and search."""

    def test_add_texts_and_search(self):
        from app.services.embedding_service import EmbeddingService
        from app.services.vector_store import VectorStore

        emb = EmbeddingService()
        vs = VectorStore(emb)

        texts = [
            "Python programming language",
            "Docker containerization",
            "Kubernetes orchestration",
            "SQL database management",
        ]
        vs.add_texts(texts)

        results = vs.search("Python programming", top_k=2)
        assert len(results) >= 1
        assert isinstance(results[0], tuple)
        assert isinstance(results[0][0], str)  # text
        assert isinstance(results[0][1], float)  # score

    def test_search_empty_index(self):
        from app.services.embedding_service import EmbeddingService
        from app.services.vector_store import VectorStore

        emb = EmbeddingService()
        vs = VectorStore(emb)

        results = vs.search("anything")
        assert results == []

    def test_add_empty_texts(self):
        from app.services.embedding_service import EmbeddingService
        from app.services.vector_store import VectorStore

        emb = EmbeddingService()
        vs = VectorStore(emb)
        vs.add_texts([])  # should not crash
        results = vs.search("test")
        assert results == []

    def test_search_top_k_larger_than_index(self):
        from app.services.embedding_service import EmbeddingService
        from app.services.vector_store import VectorStore

        emb = EmbeddingService()
        vs = VectorStore(emb)
        vs.add_texts(["single item"])
        results = vs.search("single", top_k=100)
        assert len(results) == 1


# ── CV Scorer: score_cv pipeline with mocked OpenAI ──────────────


class TestScoreCVPipeline:
    """Cover score_cv / score_cv_from_text with mocked LLM."""

    @pytest.mark.asyncio
    async def test_score_cv_from_text_with_mock_openai(self):
        from app.core.cv_scorer import score_cv_from_text
        from app.models.job_posting import JobPostingInput
        from app.services.embedding_service import EmbeddingService

        mock_openai = AsyncMock()
        mock_openai.generate_json = AsyncMock(return_value={
            "analysis_score": 85.0,
            "experience_match_score": 80.0,
            "education_match_score": 75.0,
            "matching_skills": "Python, Docker",
            "missing_skills": "Kubernetes",
            "overall_assessment": "Good candidate.",
        })

        job = JobPostingInput(
            job_title="Developer",
            required_skills="Python, Docker, Kubernetes",
        )

        result = await score_cv_from_text(
            raw_cv_text="John Doe\nSKILLS\nPython, Docker",
            job_posting=job,
            application_id=str(uuid4()),
            stage_id=str(uuid4()),
            cv_id=str(uuid4()),
            openai_service=mock_openai,
            embedding_service=EmbeddingService(),
        )

        assert result.analysis_score == 85.0
        assert result.fallback_used is False

    @pytest.mark.asyncio
    async def test_score_cv_from_text_fallback_on_llm_error(self):
        from app.core.cv_scorer import score_cv_from_text
        from app.models.job_posting import JobPostingInput
        from app.services.embedding_service import EmbeddingService

        mock_openai = AsyncMock()
        mock_openai.generate_json = AsyncMock(side_effect=RuntimeError("API down"))

        job = JobPostingInput(
            job_title="Developer",
            required_skills="Python",
        )

        result = await score_cv_from_text(
            raw_cv_text="Jane\nSKILLS\nPython",
            job_posting=job,
            application_id=str(uuid4()),
            stage_id=str(uuid4()),
            cv_id=str(uuid4()),
            openai_service=mock_openai,
            embedding_service=EmbeddingService(),
        )

        assert result.fallback_used is True
        assert "API down" in (result.fallback_reason or "")

    @pytest.mark.asyncio
    async def test_score_cv_from_text_no_openai_service(self, monkeypatch):
        """No OpenAI service → fallback used."""
        from app.config import get_settings
        from app.core.cv_scorer import score_cv_from_text
        from app.models.job_posting import JobPostingInput
        from app.services.embedding_service import EmbeddingService

        settings = get_settings()
        monkeypatch.setattr(settings, "openai_api_key", "")
        monkeypatch.setattr(settings, "use_mock_data", True)

        job = JobPostingInput(
            job_title="Developer",
            required_skills="Python",
        )

        result = await score_cv_from_text(
            raw_cv_text="Test User\nSKILLS\nPython, SQL",
            job_posting=job,
            application_id=str(uuid4()),
            stage_id=str(uuid4()),
            cv_id=str(uuid4()),
            openai_service=None,
            embedding_service=EmbeddingService(),
        )

        assert result.fallback_used is True
        assert result.fallback_reason == "OpenAI service not configured"

    @pytest.mark.asyncio
    async def test_score_cv_full_pipeline_with_mock(self, tmp_path):
        """Full score_cv with a real PDF file and mocked OpenAI."""
        from app.core.cv_scorer import score_cv
        from app.models.cv import CVAnalysisRequest
        from app.models.job_posting import JobPostingInput
        from app.services.embedding_service import EmbeddingService

        # Create a minimal PDF with text
        import fitz

        pdf_path = tmp_path / "test_cv.pdf"
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "Jane Smith\nSKILLS\nPython, Docker\nEDUCATION\nBSc CS MIT 2020")
        doc.save(str(pdf_path))
        doc.close()

        mock_openai = AsyncMock()
        mock_openai.generate_json = AsyncMock(return_value={
            "analysis_score": 78.0,
            "experience_match_score": 70.0,
            "education_match_score": 80.0,
            "matching_skills": "Python",
            "missing_skills": "Docker",
            "overall_assessment": "Decent.",
        })

        request = CVAnalysisRequest(
            application_id=uuid4(),
            stage_id=uuid4(),
            cv_id=uuid4(),
            cv_file_path=str(pdf_path),
            job_posting=JobPostingInput(
                job_title="Dev",
                required_skills="Python, Docker",
            ),
        )

        result = await score_cv(
            request,
            openai_service=mock_openai,
            embedding_service=EmbeddingService(),
        )

        assert result.analysis_score == 78.0
        assert result.parsed_cv is not None


# ── Test Engine: cache key & get_cached_questions ─────────────────


class TestTestEngineCaching:
    """Cover cache key generation and retrieval."""

    def test_posting_cache_key_deterministic(self):
        from app.core.test_engine import _posting_cache_key
        from app.models.job_posting import JobPostingInput

        job = JobPostingInput(job_title="Dev", required_skills="Python")
        key1 = _posting_cache_key(job, "technical")
        key2 = _posting_cache_key(job, "technical")
        assert key1 == key2

    def test_posting_cache_key_differs_by_type(self):
        from app.core.test_engine import _posting_cache_key
        from app.models.job_posting import JobPostingInput

        job = JobPostingInput(job_title="Dev", required_skills="Python")
        k1 = _posting_cache_key(job, "technical")
        k2 = _posting_cache_key(job, "english")
        assert k1 != k2

    def test_get_cached_questions_empty(self):
        engine = __import__("app.core.test_engine", fromlist=["TestEngine"]).TestEngine()
        result = engine.get_cached_questions("technical_assessment", "unknown-id")
        assert result is None

    def test_get_cached_questions_invalid_type(self):
        engine = __import__("app.core.test_engine", fromlist=["TestEngine"]).TestEngine()
        result = engine.get_cached_questions("nonexistent", "some-id")
        assert result is None


# ── Logging: track_latency ────────────────────────────────────────


class TestTrackLatency:
    """Cover track_latency context manager."""

    def test_track_latency_success(self):
        from app.utils.logging import track_latency

        with track_latency("test_stage") as ctx:
            x = 1 + 1  # trivial work
        assert "latency_ms" in ctx
        assert ctx["latency_ms"] >= 0

    def test_track_latency_with_extra(self):
        from app.utils.logging import track_latency

        with track_latency("test_stage", {"model": "gpt-4o-mini"}) as ctx:
            pass
        assert ctx["model"] == "gpt-4o-mini"
        assert "latency_ms" in ctx

    def test_track_latency_on_error(self):
        from app.utils.logging import track_latency

        with pytest.raises(ValueError):
            with track_latency("failing_stage") as ctx:
                raise ValueError("boom")

        assert "latency_ms" in ctx
        assert "error" in ctx
        assert ctx["error"] == "boom"


# ── CV Analysis API: additional endpoint coverage ─────────────────


class TestCVAnalysisEndpoints:
    """Cover uncovered paths in cv_analysis.py."""

    def test_parse_endpoint_with_valid_pdf(self, test_client, tmp_path):
        """POST /parse with a real PDF that has text → 200."""
        import fitz

        pdf_path = tmp_path / "test.pdf"
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "Test User\nSKILLS\nPython")
        doc.save(str(pdf_path))
        doc.close()

        with open(pdf_path, "rb") as f:
            resp = test_client.post(
                "/api/v1/cv/parse",
                files={"file": ("test.pdf", f, "application/pdf")},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "skills" in data

    def test_analyze_endpoint_missing_file(self, test_client):
        """POST /analyze with nonexistent file → 404."""
        resp = test_client.post(
            "/api/v1/cv/analyze",
            json={
                "application_id": str(uuid4()),
                "stage_id": str(uuid4()),
                "cv_id": str(uuid4()),
                "cv_file_path": "data/uploads/nonexistent.pdf",
                "job_posting": {"job_title": "Dev", "required_skills": "Python"},
            },
        )
        assert resp.status_code == 404

    def test_analyze_mock_body(self, test_client):
        """POST /analyze-mock with JSON body."""
        resp = test_client.post(
            "/api/v1/cv/analyze-mock",
            json={
                "application_id": "body-test-123",
                "required_skills": "Python, SQL, Docker",
                "min_match_score": 70,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["application_id"] == "body-test-123"

    def test_analyze_mock_missing_id(self, test_client):
        """POST /analyze-mock with no body and no query → 400."""
        resp = test_client.post("/api/v1/cv/analyze-mock")
        assert resp.status_code == 400


# ── Embedding Service: property ──────────────────────────────────


class TestEmbeddingServiceProperty:
    """Cover embedding_service.dimension property."""

    def test_dimension_positive(self):
        from app.services.embedding_service import EmbeddingService

        emb = EmbeddingService()
        assert emb.dimension > 0

    def test_embed_empty_list(self):
        from app.services.embedding_service import EmbeddingService

        emb = EmbeddingService()
        result = emb.embed([])
        assert result.shape[0] == 0

    def test_embed_single(self):
        from app.services.embedding_service import EmbeddingService

        emb = EmbeddingService()
        vec = emb.embed_single("test text")
        assert vec.ndim == 1
        assert len(vec) > 0
