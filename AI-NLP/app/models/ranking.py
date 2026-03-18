"""
Ranking & final evaluation models.

Maps to backend entities:
  - FinalEvaluationScore
  - CandidateRankingView
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class FinalEvaluation(BaseModel):
    """Weighted final evaluation for a single candidate."""

    application_id: str
    candidate_id: str = ""
    candidate_name: str = ""
    cv_score: Optional[float] = None
    general_test_score: Optional[float] = None
    english_test_score: Optional[float] = None
    interview_score: Optional[float] = None
    weighted_total: float = 0.0
    evaluation_status: str = "Pending"
    evaluated_at: Optional[datetime] = None


class CandidateRanking(BaseModel):
    """A candidate in a ranked list."""

    application_id: str
    candidate_id: str = ""
    candidate_name: str = ""
    cv_score: Optional[float] = None
    general_test_score: Optional[float] = None
    english_test_score: Optional[float] = None
    interview_score: Optional[float] = None
    weighted_total: float = 0.0
    rank_position: int = 0


class RankingResponse(BaseModel):
    """API response wrapping a list of ranked candidates."""

    job_posting_id: str
    total_candidates: int = 0
    rankings: List[CandidateRanking] = Field(default_factory=list)
