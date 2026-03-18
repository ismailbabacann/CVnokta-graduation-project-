"""Tests for the test engine module (aptitude & english tests)."""

from __future__ import annotations

import pytest


class TestTestEngine:
    """Unit tests for app.core.test_engine.TestEngine."""

    def test_get_questions_general_aptitude(self):
        from app.core.test_engine import TestEngine

        engine = TestEngine()
        response = engine.get_questions("general_aptitude")
        assert response.test_type == "general_aptitude"
        assert len(response.questions) > 0
        # Questions should NOT have correct_answer exposed
        for q in response.questions:
            assert not hasattr(q, "correct_answer") or q.correct_answer is None

    def test_get_questions_english_proficiency(self):
        from app.core.test_engine import TestEngine

        engine = TestEngine()
        response = engine.get_questions("english_proficiency")
        assert response.test_type == "english_proficiency"
        assert len(response.questions) > 0

    def test_get_questions_with_count(self):
        from app.core.test_engine import TestEngine

        engine = TestEngine()
        response = engine.get_questions("general_aptitude", count=5)
        assert len(response.questions) <= 5

    def test_get_questions_with_category_filter(self):
        from app.core.test_engine import TestEngine

        engine = TestEngine()
        response = engine.get_questions(
            "general_aptitude",
            categories=["logical_reasoning"],
        )
        # All returned questions should be from the filtered category
        for q in response.questions:
            assert q.category == "logical_reasoning"

    def test_grade_submission(self):
        from app.core.test_engine import TestEngine
        from app.models.test import AnswerItem, TestSubmission

        engine = TestEngine()

        # First get questions to know valid IDs
        questions_resp = engine.get_questions("general_aptitude", count=5)
        question_ids = [q.id for q in questions_resp.questions]

        # Build a submission with dummy answers (all option 0)
        answers = [AnswerItem(question_id=qid, selected_option=0) for qid in question_ids]

        submission = TestSubmission(
            application_id="test-app-001",
            test_type="general_aptitude",
            answers=answers,
            duration_seconds=120,
        )

        result = engine.grade_submission(submission)
        assert "aptitude" in result.test_name.lower() or "general" in result.test_name.lower()
        assert result.total_questions == len(question_ids)
        assert result.correct_answers + result.wrong_answers == result.total_questions
        assert 0 <= result.score <= 100

    def test_grade_submission_perfect_score(self):
        """Grade with all correct answers should yield 100."""
        from app.core.test_engine import TestEngine
        from app.models.test import AnswerItem, TestSubmission

        engine = TestEngine()
        # Load raw questions to get correct answers
        all_q = engine._load_questions("general_aptitude")
        selected = all_q[:3]

        answers = [
            AnswerItem(question_id=q.id, selected_option=q.correct_answer)
            for q in selected
        ]
        submission = TestSubmission(
            application_id="test-perfect",
            test_type="general_aptitude",
            answers=answers,
            duration_seconds=60,
        )
        result = engine.grade_submission(submission)
        assert result.score == 100.0
        assert result.correct_answers == 3
        assert result.wrong_answers == 0

    def test_grade_submission_with_category_breakdown(self):
        from app.core.test_engine import TestEngine
        from app.models.test import AnswerItem, TestSubmission

        engine = TestEngine()
        all_q = engine._load_questions("english_proficiency")
        selected = all_q[:5]

        answers = [
            AnswerItem(question_id=q.id, selected_option=q.correct_answer)
            for q in selected
        ]
        submission = TestSubmission(
            application_id="test-breakdown",
            test_type="english_proficiency",
            answers=answers,
            duration_seconds=90,
        )
        result = engine.grade_submission(submission)
        assert result.category_breakdown is not None
        assert len(result.category_breakdown) > 0

    def test_invalid_test_type(self):
        from app.core.test_engine import TestEngine

        engine = TestEngine()
        # Should return empty or handle gracefully
        response = engine.get_questions("nonexistent_type")
        assert len(response.questions) == 0
