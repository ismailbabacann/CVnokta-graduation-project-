"""
Ranking API endpoints — Candidate ranking & final evaluation.

POST /api/v1/rankings/evaluate   — Compute final score for one candidate
POST /api/v1/rankings/rank       — Rank a batch of candidates
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.ranking_engine import build_final_evaluation, rank_candidates
from app.models.ranking import CandidateRanking, FinalEvaluation, RankingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rankings", tags=["Rankings"])


# ── Request schemas ────────────────────────────────────────────────────
class EvaluateRequest(BaseModel):
    """Input for a single candidate final evaluation."""

    application_id: str = Field(..., description="Guid of JobApplication")
    candidate_id: str = Field(..., description="Guid of CandidateProfile / User")
    candidate_name: str = Field("", description="Display name")
    cv_score: Optional[float] = Field(None, ge=0, le=100)
    general_test_score: Optional[float] = Field(None, ge=0, le=100)
    english_test_score: Optional[float] = Field(None, ge=0, le=100)
    interview_score: Optional[float] = Field(None, ge=0, le=100)


class RankRequest(BaseModel):
    """Input for a batch ranking request."""

    job_posting_id: str = Field(..., description="Guid of the JobPosting")
    candidates: List[EvaluateRequest] = Field(..., min_length=1)


# ── Endpoints ──────────────────────────────────────────────────────────


@router.post("/evaluate", response_model=FinalEvaluation)
async def evaluate_candidate(req: EvaluateRequest):
    """
    Compute the weighted final score for a single candidate.

    Weight distribution adapts automatically based on which
    stage scores are provided (non-null).
    """
    evaluation = build_final_evaluation(
        application_id=req.application_id,
        candidate_id=req.candidate_id,
        candidate_name=req.candidate_name,
        cv_score=req.cv_score,
        general_test_score=req.general_test_score,
        english_test_score=req.english_test_score,
        interview_score=req.interview_score,
    )
    return evaluation


@router.post("/rank", response_model=RankingResponse)
async def rank_candidates_endpoint(req: RankRequest):
    """
    Rank multiple candidates for a single job posting.

    Returns candidates sorted by weighted_total DESC with
    position numbers (1-indexed).
    """
    if not req.candidates:
        raise HTTPException(status_code=400, detail="No candidates provided")

    evaluations: List[FinalEvaluation] = []
    for c in req.candidates:
        ev = build_final_evaluation(
            application_id=c.application_id,
            candidate_id=c.candidate_id,
            candidate_name=c.candidate_name,
            cv_score=c.cv_score,
            general_test_score=c.general_test_score,
            english_test_score=c.english_test_score,
            interview_score=c.interview_score,
        )
        evaluations.append(ev)

    rankings = rank_candidates(evaluations)

    return RankingResponse(
        job_posting_id=req.job_posting_id,
        total_candidates=len(rankings),
        rankings=rankings,
    )
