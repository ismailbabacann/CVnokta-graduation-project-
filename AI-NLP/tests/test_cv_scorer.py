"""Tests for CV scorer robustness helpers."""

from __future__ import annotations


class TestCVScorerRobustness:
    """Covers score clamping and fallback score generation."""

    def test_to_bounded_score_clamps_values(self):
        from app.core.cv_scorer import _to_bounded_score

        assert _to_bounded_score(120) == 100.0
        assert _to_bounded_score(-10) == 0.0
        assert _to_bounded_score("88.27") == 88.3
        assert _to_bounded_score("bad", default=50.0) == 50.0

    def test_fallback_scores_returns_stable_shape(self):
        from app.core.cv_scorer import _fallback_scores
        from app.models.cv import ParsedCV
        from app.models.job_posting import JobPostingInput

        parsed = ParsedCV(
            skills=["Python", "SQL", "FastAPI"],
            experience=[],
            education=[],
        )
        job = JobPostingInput(
            job_title="Backend Developer",
            required_skills="Python, SQL, Kubernetes",
        )

        scores = _fallback_scores(parsed, job)
        assert "analysis_score" in scores
        assert "experience_match_score" in scores
        assert "education_match_score" in scores
        assert "matching_skills" in scores
        assert "missing_skills" in scores
        assert 0 <= float(scores["analysis_score"]) <= 100

    def test_normalize_scores_accepts_partial_and_invalid_payload(self):
        from app.core.cv_scorer import _normalize_scores

        normalized = _normalize_scores(
            {
                "analysis_score": "101",
                "experience_match_score": None,
                "education_match_score": "-4",
                "matching_skills": ["Python", "SQL"],
                "overall_assessment": None,
            }
        )

        assert normalized["analysis_score"] == 100.0
        assert normalized["experience_match_score"] == 0.0
        assert normalized["education_match_score"] == 0.0
        assert normalized["matching_skills"] == "Python, SQL"
        assert normalized["overall_assessment"] == ""
