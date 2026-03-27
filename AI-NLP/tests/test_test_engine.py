"""Tests for the AI-powered test engine module."""

from __future__ import annotations

import pytest

from app.core.test_engine import TestEngine, _parse_questions_from_response
from app.models.test import AnswerItem, TestQuestion, TestSubmission


# ── Helper: build mock questions (no LLM needed) ───────────────────

def _mock_questions() -> list[TestQuestion]:
    """Return a small set of test questions for unit testing."""
    return [
        TestQuestion(
            id="tq-001",
            category="python",
            difficulty="easy",
            question="What is the output of print(type([])) in Python?",
            options=["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"],
            correct_answer=0,
            explanation="[] creates a list in Python.",
        ),
        TestQuestion(
            id="tq-002",
            category="docker",
            difficulty="medium",
            question="Which command is used to build a Docker image?",
            options=["docker run", "docker build", "docker create", "docker start"],
            correct_answer=1,
            explanation="docker build creates an image from a Dockerfile.",
        ),
        TestQuestion(
            id="tq-003",
            category="git",
            difficulty="easy",
            question="What does 'git clone' do?",
            options=["Deletes a repo", "Creates a branch", "Copies a remote repo", "Merges branches"],
            correct_answer=2,
            explanation="git clone copies a remote repository to local.",
        ),
    ]


class TestTestEngineGrading:
    """Unit tests for TestEngine grading (no LLM calls)."""

    def test_grade_submission_perfect_score(self):
        engine = TestEngine()
        questions = _mock_questions()

        answers = [
            AnswerItem(question_id=q.id, selected_option=q.correct_answer)
            for q in questions
        ]
        submission = TestSubmission(
            application_id="test-perfect",
            test_type="technical_assessment",
            answers=answers,
            duration_seconds=60,
        )
        result = engine.grade_submission(submission, questions)
        assert result.score == 100.0
        assert result.correct_answers == 3
        assert result.wrong_answers == 0

    def test_grade_submission_zero_score(self):
        engine = TestEngine()
        questions = _mock_questions()

        # All wrong answers (pick the option that's NOT correct)
        answers = [
            AnswerItem(question_id=q.id, selected_option=(q.correct_answer + 1) % len(q.options))
            for q in questions
        ]
        submission = TestSubmission(
            application_id="test-zero",
            test_type="technical_assessment",
            answers=answers,
            duration_seconds=120,
        )
        result = engine.grade_submission(submission, questions)
        assert result.score == 0.0
        assert result.correct_answers == 0
        assert result.wrong_answers == 3

    def test_grade_submission_partial_score(self):
        engine = TestEngine()
        questions = _mock_questions()

        # First correct, rest wrong
        answers = [
            AnswerItem(question_id=questions[0].id, selected_option=questions[0].correct_answer),
            AnswerItem(question_id=questions[1].id, selected_option=3),
            AnswerItem(question_id=questions[2].id, selected_option=3),
        ]
        submission = TestSubmission(
            application_id="test-partial",
            test_type="technical_assessment",
            answers=answers,
            duration_seconds=90,
        )
        result = engine.grade_submission(submission, questions)
        assert result.score == pytest.approx(33.3, abs=0.1)
        assert result.correct_answers == 1
        assert result.wrong_answers == 2

    def test_grade_submission_with_category_breakdown(self):
        engine = TestEngine()
        questions = _mock_questions()

        answers = [
            AnswerItem(question_id=q.id, selected_option=q.correct_answer)
            for q in questions
        ]
        submission = TestSubmission(
            application_id="test-breakdown",
            test_type="technical_assessment",
            answers=answers,
            duration_seconds=90,
        )
        result = engine.grade_submission(submission, questions)
        assert result.category_breakdown is not None
        assert len(result.category_breakdown) == 3  # python, docker, git
        for cat, bd in result.category_breakdown.items():
            assert bd.correct == 1
            assert bd.total == 1

    def test_grade_submission_test_name(self):
        engine = TestEngine()
        questions = _mock_questions()

        answers = [AnswerItem(question_id="tq-001", selected_option=0)]
        submission = TestSubmission(
            application_id="test-name",
            test_type="technical_assessment",
            answers=answers,
            duration_seconds=30,
        )
        result = engine.grade_submission(submission, questions)
        assert result.test_name == "Technical Assessment"

    def test_grade_english_test_name(self):
        engine = TestEngine()
        questions = [
            TestQuestion(
                id="eq-001", category="grammar", difficulty="medium",
                question="Choose the correct form.",
                options=["A", "B", "C", "D"], correct_answer=1,
            )
        ]
        submission = TestSubmission(
            application_id="test-eng",
            test_type="english_test",
            answers=[AnswerItem(question_id="eq-001", selected_option=1)],
            duration_seconds=10,
        )
        result = engine.grade_submission(submission, questions)
        assert result.test_name == "English Proficiency Test"


class TestBuildQuestionsResponse:
    """Test the response builder strips correct answers."""

    def test_build_response_strips_answers(self):
        engine = TestEngine()
        questions = _mock_questions()
        response = engine.build_questions_response("technical_assessment", questions)

        assert response.test_type == "technical_assessment"
        assert response.total_questions == 3
        for q in response.questions:
            # TestQuestionOut should not expose correct_answer
            assert not hasattr(q, "correct_answer") or "correct_answer" not in q.model_fields


class TestParseQuestionsFromResponse:
    """Test LLM response parsing and validation."""

    def test_parse_valid_response(self):
        raw = {
            "questions": [
                {
                    "id": "tq-001",
                    "category": "python",
                    "difficulty": "easy",
                    "question": "What is Python?",
                    "options": ["Language", "Snake", "Framework", "OS"],
                    "correct_answer": 0,
                    "explanation": "Python is a programming language.",
                }
            ]
        }
        questions = _parse_questions_from_response(raw)
        assert len(questions) == 1
        assert questions[0].id == "tq-001"
        assert questions[0].correct_answer == 0

    def test_parse_empty_response(self):
        assert _parse_questions_from_response({}) == []
        assert _parse_questions_from_response({"questions": []}) == []

    def test_parse_invalid_correct_answer_bounds(self):
        raw = {
            "questions": [
                {
                    "id": "tq-001",
                    "category": "test",
                    "question": "Q?",
                    "options": ["A", "B", "C", "D"],
                    "correct_answer": 99,  # out of bounds
                }
            ]
        }
        questions = _parse_questions_from_response(raw)
        assert len(questions) == 1
        assert questions[0].correct_answer == 0  # clamped to 0

    def test_parse_malformed_items_skipped(self):
        raw = {
            "questions": [
                {"id": "good", "category": "x", "question": "Q?", "options": ["A", "B"], "correct_answer": 0},
                "not_a_dict",
            ]
        }
        questions = _parse_questions_from_response(raw)
        assert len(questions) == 1


class TestValidateTestType:
    """Test validator changes."""

    def test_valid_types(self):
        from app.utils.validators import validate_test_type

        assert validate_test_type("technical_assessment") == "technical_assessment"
        assert validate_test_type("english_test") == "english_test"
        assert validate_test_type("TECHNICAL_ASSESSMENT") == "technical_assessment"

    def test_invalid_type(self):
        from app.utils.validators import validate_test_type

        with pytest.raises(ValueError, match="Invalid test_type"):
            validate_test_type("general_aptitude")

        with pytest.raises(ValueError, match="Invalid test_type"):
            validate_test_type("nonexistent")
