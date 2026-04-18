"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Dict, List

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

    # ── LLM Cache ───────────────────────────────────────────
    llm_cache_enabled: bool = True
    llm_cache_max_size: int = 128
    llm_cache_ttl_seconds: int = 3600

    # ── Embedding ───────────────────────────────────────────
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"

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

    # ── API Security ────────────────────────────────────────
    ai_nlp_api_key: str = ""  # Inbound API key for Backend → AI-NLP calls

    # ── CV Analysis ─────────────────────────────────────────
    cv_pass_threshold: int = 85
    cv_upload_dir: str = "./data/uploads"
    cv_max_upload_size_mb: int = 10

    # ── Ranking ──────────────────────────────────────────────
    ranking_weight_cv: float = 0.30
    ranking_weight_general_test: float = 0.25
    ranking_weight_english_test: float = 0.15
    ranking_weight_interview: float = 0.30

    @property
    def ranking_weights(self) -> Dict[str, float]:
        return {
            "cv": self.ranking_weight_cv,
            "general_test": self.ranking_weight_general_test,
            "english_test": self.ranking_weight_english_test,
            "interview": self.ranking_weight_interview,
        }

    # ── Tests ───────────────────────────────────────────────
    technical_test_question_count: int = 10
    technical_test_time_limit_minutes: int = 30
    english_test_question_count: int = 10
    english_test_time_limit_minutes: int = 25

    # ── Interview ───────────────────────────────────────────
    interview_question_count: int = 6
    interview_session_ttl_seconds: int = 1800
    interview_tts_model: str = "tts-1"
    interview_tts_voice: str = "nova"
    interview_stt_model: str = "whisper-1"

    # ── Realtime Interview ──────────────────────────────────
    realtime_model: str = "gpt-4o-mini-realtime-preview"
    realtime_voice: str = "alloy"
    realtime_vad_threshold: float = 0.5
    realtime_turn_detection: str = "server_vad"
    realtime_max_questions: int = 12
    realtime_min_questions: int = 5
    realtime_input_audio_format: str = "pcm16"
    realtime_output_audio_format: str = "pcm16"
    realtime_max_session_duration_seconds: int = 900
    realtime_max_silence_seconds: int = 30
    realtime_max_transcript_entries: int = 200

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
