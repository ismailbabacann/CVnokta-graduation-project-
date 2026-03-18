"""
Test Engine — serves and grades multiple-choice tests.

Handles both General Aptitude and English Proficiency tests.
Questions are loaded from JSON files under data/tests/.
"""

from __future__ import annotations

import json
import logging
import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from app.config import get_settings
from app.models.test import (
    AnswerItem,
    CategoryBreakdown,
    TestQuestion,
    TestQuestionOut,
    TestQuestionsResponse,
    TestResult,
    TestSubmission,
)

logger = logging.getLogger(__name__)

# ── Friendly names for backend entity compatibility ─────────────────

_TEST_NAMES = {
    "general_aptitude": "General Aptitude Test",
    "english_proficiency": "English Proficiency Test",
}


class TestEngine:
    """
    Stateless test engine — loads questions on demand from JSON files.

    Thread-safe: no mutable instance state beyond the cache.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._question_cache: Dict[str, List[TestQuestion]] = {}

    # ── Question loading ────────────────────────────────────────────

    def _load_questions(self, test_type: str) -> List[TestQuestion]:
        """
        Load all questions for a given test type from JSON files.

        Results are cached in memory for the lifetime of the engine.
        """
        if test_type in self._question_cache:
            return self._question_cache[test_type]

        test_dir = self._settings.test_questions_dir / test_type
        if not test_dir.exists():
            logger.warning("Test directory not found: %s", test_dir)
            return []

        questions: list[TestQuestion] = []
        for json_file in sorted(test_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                items = data if isinstance(data, list) else data.get("questions", [])
                for item in items:
                    questions.append(TestQuestion(**item))
            except Exception as exc:
                logger.error("Failed to load %s: %s", json_file, exc)

        logger.info("Loaded %d questions for %s", len(questions), test_type)
        self._question_cache[test_type] = questions
        return questions

    def _get_answer_key(self, test_type: str) -> Dict[str, int]:
        """Build a question_id → correct_answer (index) mapping."""
        questions = self._load_questions(test_type)
        return {q.id: q.correct_answer for q in questions}

    # ── Public API ──────────────────────────────────────────────────

    def get_questions(
        self,
        test_type: str,
        count: Optional[int] = None,
        categories: Optional[List[str]] = None,
        seed: Optional[int] = None,
    ) -> TestQuestionsResponse:
        """
        Return a randomised subset of questions for a test session.

        Args:
            test_type: "general_aptitude" or "english_proficiency"
            count: number of questions (default from config)
            categories: optional category filter
            seed: RNG seed for reproducible tests
        """
        all_questions = self._load_questions(test_type)

        if categories:
            cat_set = {c.lower() for c in categories}
            all_questions = [q for q in all_questions if q.category.lower() in cat_set]

        if count is None:
            count = (
                self._settings.general_test_question_count
                if test_type == "general_aptitude"
                else self._settings.english_test_question_count
            )

        # Balanced sampling: equal questions per category
        by_category: Dict[str, list[TestQuestion]] = defaultdict(list)
        for q in all_questions:
            by_category[q.category].append(q)

        rng = random.Random(seed)
        selected: list[TestQuestion] = []

        if by_category:
            per_cat = max(1, count // len(by_category))
            remainder = count - per_cat * len(by_category)

            for cat, cat_questions in by_category.items():
                rng.shuffle(cat_questions)
                selected.extend(cat_questions[:per_cat])

            # Fill remainder from all remaining questions
            remaining = [q for q in all_questions if q not in selected]
            rng.shuffle(remaining)
            selected.extend(remaining[:max(0, remainder)])
        else:
            selected = all_questions

        # Shuffle final selection
        rng.shuffle(selected)
        selected = selected[:count]

        # Strip correct answers for client
        questions_out = [
            TestQuestionOut(
                id=q.id,
                category=q.category,
                difficulty=q.difficulty,
                question=q.question,
                options=q.options,
            )
            for q in selected
        ]

        time_limit = (
            self._settings.general_test_time_limit_minutes
            if test_type == "general_aptitude"
            else self._settings.english_test_time_limit_minutes
        )

        return TestQuestionsResponse(
            test_type=test_type,
            questions=questions_out,
            total_questions=len(questions_out),
            time_limit_minutes=time_limit,
        )

    def grade_submission(self, submission: TestSubmission) -> TestResult:
        """
        Grade a test submission and return a TestResult.

        Maps directly to the backend GeneralTestResult entity fields.
        """
        answer_key = self._get_answer_key(submission.test_type)
        all_questions = self._load_questions(submission.test_type)
        question_map = {q.id: q for q in all_questions}

        correct = 0
        wrong = 0
        category_stats: Dict[str, Dict[str, int]] = defaultdict(
            lambda: {"correct": 0, "total": 0}
        )

        for answer in submission.answers:
            expected = answer_key.get(answer.question_id)
            q = question_map.get(answer.question_id)
            category = q.category if q else "unknown"

            category_stats[category]["total"] += 1
            if expected is not None and answer.selected_option == expected:
                correct += 1
                category_stats[category]["correct"] += 1
            else:
                wrong += 1

        total = len(submission.answers)
        score = round((correct / total) * 100, 1) if total > 0 else 0.0

        breakdown = {
            cat: CategoryBreakdown(correct=vals["correct"], total=vals["total"])
            for cat, vals in category_stats.items()
        }

        return TestResult(
            application_id=submission.application_id,
            test_name=_TEST_NAMES.get(submission.test_type, submission.test_type),
            total_questions=total,
            correct_answers=correct,
            wrong_answers=wrong,
            score=score,
            duration_seconds=submission.duration_seconds,
            passed=None,  # Threshold is decided by the backend / job posting
            test_date=datetime.utcnow(),
            category_breakdown=breakdown,
        )
