"""
Phase F — Ranking Edge Case Tests (F4).

Tests ranking engine with boundary conditions:
- All zero scores
- Missing stage scores (weight normalization)
- Duplicate candidates
- Tie-breaking determinism
- Single candidate
"""

from __future__ import annotations

import pytest

from app.core.ranking_engine import (
    build_final_evaluation,
    compute_weighted_score,
    rank_candidates,
)
from app.models.ranking import FinalEvaluation


class TestAllZeroScores:
    """F4: All candidates score 0 → no division-by-zero."""

    def test_weighted_score_zero_when_no_scores(self):
        assert compute_weighted_score() == 0.0

    def test_weighted_score_zero_when_all_zero(self):
        result = compute_weighted_score(
            cv_score=0.0, general_test_score=0.0,
            english_test_score=0.0, interview_score=0.0,
        )
        assert result == 0.0

    def test_rank_candidates_all_zero(self):
        evals = [
            build_final_evaluation("a1", "c1", "Zero-A", cv_score=0.0, general_test_score=0.0),
            build_final_evaluation("a2", "c2", "Zero-B", cv_score=0.0, general_test_score=0.0),
        ]
        rankings = rank_candidates(evals)
        assert len(rankings) == 2
        for r in rankings:
            assert r.weighted_total == 0.0


class TestMissingStageScores:
    """F4: Missing stage scores → weights re-normalized correctly."""

    def test_only_cv_score(self):
        score = compute_weighted_score(cv_score=80.0)
        assert score == 80.0  # 100% weight goes to CV

    def test_cv_and_english_only(self):
        score = compute_weighted_score(cv_score=80.0, english_test_score=60.0)
        # normalized: cv_weight + english_weight with interview weights redistributed
        assert 60.0 <= score <= 80.0

    def test_evaluation_status_pending_when_no_scores(self):
        ev = build_final_evaluation("a1", "c1", "No Scores")
        assert ev.evaluation_status == "Pending"
        assert ev.evaluated_at is None

    def test_evaluation_status_evaluated_with_scores(self):
        ev = build_final_evaluation("a1", "c1", "Has Scores", cv_score=75.0)
        assert ev.evaluation_status == "Evaluated"
        assert ev.evaluated_at is not None


class TestDuplicateCandidates:
    """F4: Duplicate application_ids → all included in rankings."""

    def test_duplicate_application_ids_ranked(self):
        evals = [
            build_final_evaluation("a1", "c1", "Alice", cv_score=90.0),
            build_final_evaluation("a1", "c1", "Alice Copy", cv_score=85.0),
            build_final_evaluation("a2", "c2", "Bob", cv_score=70.0),
        ]
        rankings = rank_candidates(evals)
        assert len(rankings) == 3
        assert rankings[0].rank_position == 1
        assert rankings[2].rank_position == 3


class TestTieBreaking:
    """F4: Candidates with identical scores → deterministic ordering."""

    def test_tied_scores_deterministic(self):
        evals = [
            build_final_evaluation("a1", "c1", "A", cv_score=80.0),
            build_final_evaluation("a2", "c2", "B", cv_score=80.0),
            build_final_evaluation("a3", "c3", "C", cv_score=80.0),
        ]
        rankings1 = rank_candidates(evals)
        rankings2 = rank_candidates(evals)

        ids1 = [r.application_id for r in rankings1]
        ids2 = [r.application_id for r in rankings2]
        assert ids1 == ids2  # same order both runs

    def test_tied_scores_positions_assigned(self):
        evals = [
            build_final_evaluation("a1", "c1", "A", cv_score=80.0, general_test_score=70.0),
            build_final_evaluation("a2", "c2", "B", cv_score=80.0, general_test_score=70.0),
        ]
        rankings = rank_candidates(evals)
        assert rankings[0].rank_position == 1
        assert rankings[1].rank_position == 2


class TestEmptyAndSingleCandidate:
    """F4: Edge cases for 0 and 1 candidates."""

    def test_empty_candidates_list(self):
        rankings = rank_candidates([])
        assert rankings == []

    def test_single_candidate_is_rank_1(self):
        evals = [build_final_evaluation("a1", "c1", "Solo", cv_score=42.0)]
        rankings = rank_candidates(evals)
        assert len(rankings) == 1
        assert rankings[0].rank_position == 1
        assert rankings[0].weighted_total == 42.0


class TestCustomWeights:
    """F4: Custom weight maps behave correctly."""

    def test_custom_weights_override(self):
        custom = {"cv": 1.0, "general_test": 0.0, "english_test": 0.0, "interview": 0.0}
        score = compute_weighted_score(
            cv_score=90.0,
            general_test_score=50.0,
            english_test_score=50.0,
            weights=custom,
        )
        assert score == 90.0  # only CV counts

    def test_equal_weights(self):
        equal = {"cv": 0.25, "general_test": 0.25, "english_test": 0.25, "interview": 0.25}
        score = compute_weighted_score(
            cv_score=80.0,
            general_test_score=60.0,
            english_test_score=40.0,
            interview_score=100.0,
            weights=equal,
        )
        assert score == 70.0  # (80+60+40+100)/4
