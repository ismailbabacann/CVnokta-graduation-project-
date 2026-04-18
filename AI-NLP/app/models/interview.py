"""
AI Video Interview models (future implementation).

Maps to backend entities:
  - AiInterviewSession
  - AiInterviewQa
  - AiInterviewSummary
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class InterviewSession(BaseModel):
    """Mirrors AiInterviewSession entity."""

    id: Optional[UUID] = None
    application_id: UUID
    stage_id: UUID
    cv_id: UUID
    job_posting_id: UUID
    session_status: str = "Started"   # Started | InProgress | Completed
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    ai_agent_version: Optional[str] = None


class InterviewQA(BaseModel):
    """Mirrors AiInterviewQa entity."""

    session_id: UUID
    question_sequence: int
    question_category: Optional[str] = None
    question_text: str
    candidate_answer_text: Optional[str] = None
    candidate_answer_audio_path: Optional[str] = None
    ai_evaluation_score: Optional[float] = Field(None, ge=0, le=100)
    ai_evaluation_notes: Optional[str] = None
    asked_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None


class InterviewSummary(BaseModel):
    """Mirrors AiInterviewSummary entity."""

    session_id: UUID
    application_id: UUID
    total_questions_asked: Optional[int] = None
    total_questions_answered: Optional[int] = None

    average_confidence_score: Optional[float] = Field(None, ge=0, le=100)
    job_match_score: Optional[float] = Field(None, ge=0, le=100)
    experience_alignment_score: Optional[float] = Field(None, ge=0, le=100)
    communication_score: Optional[float] = Field(None, ge=0, le=100)
    technical_knowledge_score: Optional[float] = Field(None, ge=0, le=100)
    overall_interview_score: Optional[float] = Field(None, ge=0, le=100)

    summary_text: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    recommendations: Optional[str] = None
    is_passed: Optional[bool] = None


# ── Realtime Interview models ──────────────────────────────────────


class RealtimeSessionStatus(str, Enum):
    """State machine for realtime interview sessions."""
    CONNECTING = "connecting"
    ACTIVE = "active"
    ENDING = "ending"
    COMPLETED = "completed"
    INTERRUPTED = "interrupted"
    FAILED = "failed"


class RealtimeSession(BaseModel):
    """Tracks a realtime (WebSocket) interview session."""
    session_id: str
    application_id: str
    job_posting: dict
    cv_summary: str
    candidate_name: str
    status: RealtimeSessionStatus = RealtimeSessionStatus.CONNECTING
    questions_asked: List[dict] = Field(default_factory=list)
    transcript: List[dict] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    end_reason: Optional[str] = None


# ── WebSocket message schemas (future) ──────────────────────────────


class InterviewStartRequest(BaseModel):
    application_id: UUID
    job_posting_id: UUID


class AudioChunkMessage(BaseModel):
    type: str = "audio_chunk"
    data: str  # base64-encoded audio


class QuestionMessage(BaseModel):
    type: str = "question"
    text: str
    audio: Optional[str] = None    # base64-encoded TTS audio
    visemes: Optional[list] = None  # [{time: float, viseme: str}, ...]


class SessionCompleteMessage(BaseModel):
    type: str = "session_complete"
    summary: InterviewSummary
