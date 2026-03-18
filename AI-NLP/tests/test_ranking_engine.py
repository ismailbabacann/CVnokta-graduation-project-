"""Tests for the ranking engine module."""

from __future__ import annotations


class TestRankingEngine:
    """Unit tests for app.core.ranking_engine."""

    def test_build_final_evaluation_all_scores(self):
        from app.core.ranking_engine import build_final_evaluation

        ev = build_final_evaluation(
            application_id="app-001",
            candidate_id="cand-001",
            candidate_name="Test User",
            cv_score=85.0,
            general_test_score=70.0,
            english_test_score=80.0,
            interview_score=90.0,
        )
        assert ev.application_id == "app-001"
        assert 0 <= ev.weighted_total <= 100
        assert ev.cv_score == 85.0

    def test_build_final_evaluation_partial_scores(self):
        from app.core.ranking_engine import build_final_evaluation

        ev = build_final_evaluation(
            application_id="app-002",
            candidate_id="cand-002",
            candidate_name="Partial User",
            cv_score=80.0,
            general_test_score=None,
            english_test_score=75.0,
            interview_score=None,
        )
        assert 0 <= ev.weighted_total <= 100
        # Only cv and english provided

    def test_build_final_evaluation_no_scores(self):
        from app.core.ranking_engine import build_final_evaluation

        ev = build_final_evaluation(
            application_id="app-003",
            candidate_id="cand-003",
            candidate_name="No Scores",
        )
        assert ev.weighted_total == 0.0

    def test_rank_candidates(self):
        from app.core.ranking_engine import build_final_evaluation, rank_candidates

        evals = [
            build_final_evaluation("a1", "c1", "Alice", cv_score=90, general_test_score=80, english_test_score=85),
            build_final_evaluation("a2", "c2", "Bob", cv_score=70, general_test_score=60, english_test_score=65),
            build_final_evaluation("a3", "c3", "Charlie", cv_score=95, general_test_score=90, english_test_score=92),
        ]

        rankings = rank_candidates(evals)
        assert len(rankings) == 3
        # First should be highest scorer
        assert rankings[0].rank_position == 1
        assert rankings[0].weighted_total >= rankings[1].weighted_total
        assert rankings[1].weighted_total >= rankings[2].weighted_total

    def test_rank_candidates_single(self):
        from app.core.ranking_engine import build_final_evaluation, rank_candidates

        evals = [
            build_final_evaluation("a1", "c1", "Solo", cv_score=77),
        ]
        rankings = rank_candidates(evals)
        assert len(rankings) == 1
        assert rankings[0].rank_position == 1
