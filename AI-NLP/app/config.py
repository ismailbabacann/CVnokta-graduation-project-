"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration – every value can be overridden via .env or env vars."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── OpenAI ──────────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_temperature: float = 0.1
    openai_max_tokens: int = 1500
    llm_fallback_enabled: bool = True

    # ── Embedding ───────────────────────────────────────────
    embedding_model: str = "all-MiniLM-L6-v2"

    # ── Application ─────────────────────────────────────────
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    use_mock_data: bool = True
    log_level: str = "INFO"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Backend (future) ────────────────────────────────────
    backend_api_url: str = "http://localhost:5000/api"
    backend_api_key: str = ""

    # ── CV Analysis ─────────────────────────────────────────
    cv_pass_threshold: int = 85
    cv_upload_dir: str = "./data/uploads"
    cv_max_upload_size_mb: int = 10
    direct_api_key_enabled: bool = False
    direct_api_key: str = ""

    # ── Tests ───────────────────────────────────────────────
    general_test_question_count: int = 20
    general_test_time_limit_minutes: int = 30
    english_test_question_count: int = 20
    english_test_time_limit_minutes: int = 25

    # ── Derived paths (not from env) ────────────────────────
    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parent.parent

    @property
    def data_dir(self) -> Path:
        return self.project_root / "data"

    @property
    def cv_upload_path(self) -> Path:
        raw = Path(self.cv_upload_dir)
        return raw.resolve() if raw.is_absolute() else (self.project_root / raw).resolve()

    @property
    def test_questions_dir(self) -> Path:
        return self.data_dir / "tests"

    @property
    def mock_data_dir(self) -> Path:
        return self.data_dir / "mock"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton – call this everywhere instead of constructing Settings()."""
    return Settings()
