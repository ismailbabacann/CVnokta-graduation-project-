"""
Ranking Engine — aggregates stage scores into final evaluation & rank.

Maps to backend entities:
  - FinalEvaluationScore
  - CandidateRankingView
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List, Optional

from app.config import get_settings
from app.models.ranking import CandidateRanking, FinalEvaluation

logger = logging.getLogger(__name__)


def _get_default_weights(include_interview: bool = True) -> Dict[str, float]:
    """Load default weights from settings, redistributing if interview is excluded."""
    settings = get_settings()
    weights = dict(settings.ranking_weights)
    if not include_interview:
        weights["interview"] = 0.0
    return weights


def compute_weighted_score(
    cv_score: Optional[float] = None,
    general_test_score: Optional[float] = None,
    english_test_score: Optional[float] = None,
    interview_score: Optional[float] = None,
    weights: Optional[Dict[str, float]] = None,
) -> float:
    """
    Compute a weighted final score from available stage scores.

    Only stages with non-None scores are included; weights are renormalised
    so missing stages don't penalise the candidate.
    """
    if weights is None:
        weights = _get_default_weights(include_interview=interview_score is not None)

    score_map = {
        "cv": cv_score,
        "general_test": general_test_score,
        "english_test": english_test_score,
        "interview": interview_score,
    }

    available = {k: v for k, v in score_map.items() if v is not None}
    if not available:
        return 0.0

    # Renormalise weights
    total_weight = sum(weights.get(k, 0) for k in available)
    if total_weight == 0:
        return 0.0

    weighted_sum = sum(
        (weights.get(k, 0) / total_weight) * v for k, v in available.items()
    )
    return round(weighted_sum, 1)


def build_final_evaluation(
    application_id: str,
    candidate_id: str = "",
    candidate_name: str = "",
    cv_score: Optional[float] = None,
    general_test_score: Optional[float] = None,
    english_test_score: Optional[float] = None,
    interview_score: Optional[float] = None,
    weights: Optional[Dict[str, float]] = None,
) -> FinalEvaluation:
    """Build a FinalEvaluation object with computed weighted score."""
    weighted = compute_weighted_score(
        cv_score,
        general_test_score,
        english_test_score,
        interview_score,
        weights=weights,
    )

    return FinalEvaluation(
        application_id=application_id,
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        cv_score=cv_score,
        general_test_score=general_test_score,
        english_test_score=english_test_score,
        interview_score=interview_score,
        weighted_total=weighted,
        evaluation_status="Evaluated" if weighted > 0 else "Pending",
        evaluated_at=datetime.utcnow() if weighted > 0 else None,
    )


def rank_candidates(
    evaluations: List[FinalEvaluation],
) -> List[CandidateRanking]:
    """
    Rank candidates by weighted_total (descending).

    Returns a list of CandidateRanking with rank_position set.
    """
    # Sort by weighted score descending
    sorted_evals = sorted(
        evaluations,
        key=lambda e: e.weighted_total,
        reverse=True,
    )

    rankings: List[CandidateRanking] = []
    for position, ev in enumerate(sorted_evals, start=1):
        rankings.append(
            CandidateRanking(
                application_id=ev.application_id,
                candidate_id=ev.candidate_id,
                candidate_name=ev.candidate_name,
                cv_score=ev.cv_score,
                general_test_score=ev.general_test_score,
                english_test_score=ev.english_test_score,
                interview_score=ev.interview_score,
                weighted_total=ev.weighted_total,
                rank_position=position,
            )
        )

    return rankings
