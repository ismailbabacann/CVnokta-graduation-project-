"""
Test models — General Aptitude & English Proficiency.

Maps to backend entity: CleanArchitecture.Core.Entities.GeneralTestResult
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Question models ─────────────────────────────────────────────────


class TestQuestion(BaseModel):
    """Internal model: includes correct answer (never sent to client)."""

    id: str = Field(..., description="Unique question id e.g. lr-001")
    category: str
    difficulty: str = "medium"
    question: str
    options: List[str] = Field(..., description="List of answer options")
    correct_answer: int = Field(..., description="0-based index of correct option")
    explanation: Optional[str] = None


class TestQuestionOut(BaseModel):
    """Question as delivered to the frontend – no correct_answer."""

    id: str
    category: str
    difficulty: str
    question: str
    options: List[str]


class TestQuestionWithAnswer(BaseModel):
    """Question with correct_answer included – for server-to-server calls."""

    id: str
    category: str
    difficulty: str
    question: str
    options: List[str]
    correct_answer: int


class TestQuestionsResponse(BaseModel):
    """Response when the frontend requests a test session."""

    test_type: str
    questions: List[TestQuestionOut]
    total_questions: int
    time_limit_minutes: int


class TestQuestionsWithAnswersResponse(BaseModel):
    """Response with correct answers – for backend integration."""

    test_type: str
    questions: List[TestQuestionWithAnswer]
    total_questions: int
    time_limit_minutes: int


# ── Answer submission ───────────────────────────────────────────────


class AnswerItem(BaseModel):
    question_id: str
    selected_option: int = Field(..., ge=0, description="0-based index of chosen option")


class TestSubmission(BaseModel):
    application_id: str = Field(..., description="Application UUID as string")
    test_type: str  # "technical_assessment" | "english_test"
    job_posting_id: Optional[str] = Field(None, description="Job posting ID for question lookup")
    answers: List[AnswerItem]
    duration_seconds: int = 0


# ── Grading result ──────────────────────────────────────────────────


class CategoryBreakdown(BaseModel):
    correct: int
    total: int


class TestResult(BaseModel):
    """
    Maps to backend entity GeneralTestResult.
    TestName distinguishes between aptitude and English tests.
    """

    application_id: str
    test_name: str  # "General Aptitude Test" | "English Proficiency Test"
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    wrong_answers: Optional[int] = None
    score: Optional[float] = Field(None, ge=0, le=100)
    duration_seconds: Optional[int] = None
    passed: Optional[bool] = None
    test_date: datetime = Field(default_factory=datetime.utcnow)

    # Extra detail not mapped 1:1 to backend but useful for frontend display
    category_breakdown: Optional[Dict[str, CategoryBreakdown]] = None
