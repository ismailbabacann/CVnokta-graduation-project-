"""
Shared FastAPI dependencies (Dependency Injection).

Provides service singletons that can be swapped for mocks during testing.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.core.test_engine import TestEngine
from app.core.interview_engine import InterviewEngine


@lru_cache()
def get_test_engine() -> TestEngine:
    """Singleton TestEngine instance."""
    return TestEngine()


@lru_cache()
def get_interview_engine() -> InterviewEngine:
    """Singleton InterviewEngine instance."""
    return InterviewEngine()


def get_openai_service():
    """
    Lazy-import to avoid loading the model at module level.
    Returns None when USE_MOCK_DATA=true and no API key is set.
    """
    settings = get_settings()
    if settings.use_mock_data and not settings.openai_api_key:
        return None
    from app.services.openai_service import OpenAIService
    return OpenAIService()


def get_embedding_service():
    """Lazy-import embedding service."""
    from app.services.embedding_service import EmbeddingService
    return EmbeddingService()
