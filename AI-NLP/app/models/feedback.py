"""
Dual-perspective feedback models (HR + Candidate).

Each pipeline stage produces two versions of feedback:
  - HR perspective:        third-person ("Aday ...")
  - Candidate perspective: second-person ("Siz ...")

Both share the same structure: strengths, weaknesses, overall summary.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class FeedbackStage(str, Enum):
    """Pipeline stages that produce feedback."""
    CV_ANALYSIS = "CV_ANALYSIS"
    ENGLISH_TEST = "ENGLISH_TEST"
    SKILLS_TEST = "SKILLS_TEST"
    AI_INTERVIEW = "AI_INTERVIEW"
    FINAL_SUMMARY = "FINAL_SUMMARY"


class FeedbackContent(BaseModel):
    """Structured feedback for one perspective (HR or Candidate)."""
    strengths: List[str] = Field(default_factory=list, description="List of strength points")
    weaknesses: List[str] = Field(default_factory=list, description="List of weakness/improvement points")
    overall: str = Field("", description="Overall feedback paragraph")


class StageFeedback(BaseModel):
    """Dual-perspective feedback for a single pipeline stage."""
    stage: FeedbackStage
    hr_feedback: FeedbackContent = Field(default_factory=FeedbackContent)
    candidate_feedback: FeedbackContent = Field(default_factory=FeedbackContent)


class FeedbackGenerateRequest(BaseModel):
    """Request to generate feedback for a specific stage."""
    application_id: str
    stage: FeedbackStage
    data: dict = Field(default_factory=dict, description="Stage-specific scoring data")


class FeedbackGenerateResponse(BaseModel):
    """Response containing the generated dual feedback."""
    application_id: str
    feedback: StageFeedback


class FinalSummaryRequest(BaseModel):
    """Request to generate a final summary across all stages."""
    application_id: str
    cv_score: Optional[float] = None
    cv_feedback: Optional[StageFeedback] = None
    english_test_score: Optional[float] = None
    english_feedback: Optional[StageFeedback] = None
    skills_test_score: Optional[float] = None
    skills_feedback: Optional[StageFeedback] = None
    interview_score: Optional[float] = None
    interview_feedback: Optional[StageFeedback] = None


class FullFeedbackResponse(BaseModel):
    """All stage feedbacks for an application."""
    application_id: str
    feedbacks: List[StageFeedback] = Field(default_factory=list)
