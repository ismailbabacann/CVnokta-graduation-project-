"""
Phase I — CV threshold calibration tests.

Validates that the default cv_pass_threshold (85) produces sensible
pass / fail decisions across synthetic candidate profiles.

Uses the deterministic _fallback_scores function so results are
reproducible without an LLM call.
"""

from __future__ import annotations

import pytest

from app.core.cv_scorer import _fallback_scores
from app.models.cv import Education, Experience, ParsedCV
from app.models.job_posting import JobPostingInput

# ── Helpers ──────────────────────────────────────────────────────────

DEFAULT_THRESHOLD = 85  # server default

JOB = JobPostingInput(
    job_title="Senior Backend Engineer",
    department="Engineering",
    required_skills="Python, Django, PostgreSQL, Docker, AWS",
    required_qualifications="5+ years backend experience",
    responsibilities="Design and implement scalable APIs",
)


def _make_cv(
    skills: list[str],
    experience_count: int = 0,
    education_count: int = 0,
) -> ParsedCV:
    return ParsedCV(
        full_name="Test Candidate",
        skills=skills,
        experience=[
            Experience(title=f"Role {i}", company=f"Co {i}", duration_months=24)
            for i in range(experience_count)
        ],
        education=[
            Education(degree="BSc", institution=f"Uni {i}")
            for i in range(education_count)
        ],
    )


# ── Strong candidate (all skills, deep experience) ──────────────────

class TestStrongCandidate:
    """A candidate matching all required skills with solid experience should PASS."""

    def test_perfect_match_passes(self):
        cv = _make_cv(
            skills=["Python", "Django", "PostgreSQL", "Docker", "AWS"],
            experience_count=5,
            education_count=2,
        )
        scores = _fallback_scores(cv, JOB)
        assert scores["analysis_score"] >= DEFAULT_THRESHOLD
        assert scores["missing_skills"] == ""

    def test_strong_with_four_of_five_skills(self):
        cv = _make_cv(
            skills=["Python", "Django", "PostgreSQL", "Docker"],
            experience_count=4,
            education_count=1,
        )
        scores = _fallback_scores(cv, JOB)
        # 4/5 skills = 80% skill score; with good experience should be close
        assert scores["analysis_score"] >= 75


# ── Moderate candidate ──────────────────────────────────────────────

class TestModerateCandidate:
    """A candidate matching ~60% skills with moderate experience — borderline."""

    def test_three_of_five_skills_moderate_exp(self):
        cv = _make_cv(
            skills=["Python", "Django", "PostgreSQL"],
            experience_count=2,
            education_count=1,
        )
        scores = _fallback_scores(cv, JOB)
        # Should be below threshold (3/5 = 60% skill match)
        assert 60 <= scores["analysis_score"] < DEFAULT_THRESHOLD

    def test_half_skills_good_experience(self):
        cv = _make_cv(
            skills=["Python", "Docker"],
            experience_count=5,
            education_count=2,
        )
        scores = _fallback_scores(cv, JOB)
        # Good exp but only 40% skill match — shouldn't pass
        assert scores["analysis_score"] < DEFAULT_THRESHOLD


# ── Weak candidate ──────────────────────────────────────────────────

class TestWeakCandidate:
    """A candidate with few or no matching skills should clearly FAIL."""

    def test_no_matching_skills(self):
        cv = _make_cv(
            skills=["Java", "Spring Boot", "Oracle"],
            experience_count=3,
            education_count=1,
        )
        scores = _fallback_scores(cv, JOB)
        assert scores["analysis_score"] < DEFAULT_THRESHOLD
        assert scores["matching_skills"] == ""

    def test_empty_cv(self):
        cv = _make_cv(skills=[], experience_count=0, education_count=0)
        scores = _fallback_scores(cv, JOB)
        assert scores["analysis_score"] < DEFAULT_THRESHOLD

    def test_single_matching_skill_no_exp(self):
        cv = _make_cv(skills=["Python"], experience_count=0, education_count=0)
        scores = _fallback_scores(cv, JOB)
        assert scores["analysis_score"] < 70


# ── Threshold boundary ──────────────────────────────────────────────

class TestThresholdBoundary:
    """Verify the 85 threshold sits at a reasonable boundary."""

    def test_threshold_separates_profiles(self):
        """Strong profiles pass, weak profiles fail — threshold is discriminating."""
        strong = _make_cv(
            skills=["Python", "Django", "PostgreSQL", "Docker", "AWS"],
            experience_count=5, education_count=2,
        )
        weak = _make_cv(skills=["Java"], experience_count=1, education_count=0)

        strong_score = _fallback_scores(strong, JOB)["analysis_score"]
        weak_score = _fallback_scores(weak, JOB)["analysis_score"]

        assert strong_score >= DEFAULT_THRESHOLD
        assert weak_score < DEFAULT_THRESHOLD
        assert strong_score - weak_score > 15  # meaningful gap

    def test_custom_lower_threshold_passes_more(self):
        """A lower min_match_score lets moderate candidates pass."""
        moderate = _make_cv(
            skills=["Python", "Django", "PostgreSQL"],
            experience_count=2, education_count=1,
        )
        score = _fallback_scores(moderate, JOB)["analysis_score"]

        # At 85: fail. At 65: pass.
        assert score < 85
        assert score >= 65

    def test_score_components_bounded(self):
        """All individual scores must be in [0, 100]."""
        cv = _make_cv(
            skills=["Python", "Django", "PostgreSQL", "Docker", "AWS"],
            experience_count=10, education_count=5,
        )
        scores = _fallback_scores(cv, JOB)
        assert 0 <= scores["analysis_score"] <= 100
        assert 0 <= scores["experience_match_score"] <= 100
        assert 0 <= scores["education_match_score"] <= 100


# ── Configurable threshold via JobPostingInput ──────────────────────

class TestConfigurableThreshold:
    """min_match_score on JobPostingInput overrides the global default."""

    def test_per_posting_threshold(self):
        """Lower per-posting threshold lets a moderate candidate pass."""
        lenient_job = JobPostingInput(
            job_title="Junior Dev",
            required_skills="Python, Git",
            min_match_score=60,
        )
        cv = _make_cv(skills=["Python"], experience_count=1, education_count=1)
        score = _fallback_scores(cv, lenient_job)["analysis_score"]
        assert score >= lenient_job.min_match_score

    def test_strict_threshold(self):
        """Higher threshold rejects even decent candidates."""
        strict_job = JobPostingInput(
            job_title="Principal Engineer",
            required_skills="Python, Django, PostgreSQL, Docker, AWS, Kubernetes, Terraform",
            min_match_score=95,
        )
        cv = _make_cv(
            skills=["Python", "Django", "Docker"],
            experience_count=3, education_count=1,
        )
        score = _fallback_scores(cv, strict_job)["analysis_score"]
        assert score < strict_job.min_match_score
