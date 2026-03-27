"""
Test Engine — AI-generated tests per job posting.

Two test types:
  - technical_assessment: GPT generates questions based on job posting requirements
  - english_test: GPT generates B1-B2 level English questions

Tests are generated once per job posting and cached in-memory.
All candidates applying to the same posting get the same questions.
"""

from __future__ import annotations

import hashlib
import logging
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.core.prompts.test_generation import (
    ENGLISH_SYSTEM_PROMPT,
    ENGLISH_USER_PROMPT_TEMPLATE,
    TECHNICAL_SYSTEM_PROMPT,
    TECHNICAL_USER_PROMPT_TEMPLATE,
)
from app.models.job_posting import JobPostingInput
from app.models.test import (
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
    "technical_assessment": "Technical Assessment",
    "english_test": "English Proficiency Test",
}


def _posting_cache_key(job_posting: JobPostingInput, test_type: str) -> str:
    """Deterministic cache key from job posting content + test type."""
    content = f"{test_type}:{job_posting.job_title}:{job_posting.required_skills}:{job_posting.required_qualifications}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def _parse_questions_from_response(raw: Dict[str, Any]) -> List[TestQuestion]:
    """Parse LLM JSON response into TestQuestion list with validation."""
    items = raw.get("questions", [])
    if not isinstance(items, list):
        return []

    questions: list[TestQuestion] = []
    for item in items:
        try:
            options = item.get("options", [])
            correct = item.get("correct_answer", 0)
            if not isinstance(correct, int) or correct < 0 or correct >= len(options):
                correct = 0

            questions.append(TestQuestion(
                id=str(item.get("id", f"gen-{len(questions)+1:03d}")),
                category=str(item.get("category", "general")),
                difficulty=str(item.get("difficulty", "medium")),
                question=str(item.get("question", "")),
                options=options,
                correct_answer=correct,
                explanation=item.get("explanation"),
            ))
        except Exception as exc:
            logger.warning("Skipping malformed question: %s", exc)

    return questions


class TestEngine:
    """
    AI-powered test engine — generates questions per job posting via GPT.

    Thread-safe: cache is append-only dict.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._question_cache: Dict[str, List[TestQuestion]] = {}

    # ── Question generation ─────────────────────────────────────────

    async def generate_technical_test(
        self,
        job_posting: JobPostingInput,
        count: Optional[int] = None,
    ) -> List[TestQuestion]:
        """Generate technical assessment questions from job posting via LLM."""
        if count is None:
            count = self._settings.technical_test_question_count

        cache_key = _posting_cache_key(job_posting, "technical")
        if cache_key in self._question_cache:
            logger.info("Technical test cache hit: %s", cache_key)
            return self._question_cache[cache_key]

        from app.services.openai_service import OpenAIService

        service = OpenAIService()
        user_prompt = TECHNICAL_USER_PROMPT_TEMPLATE.format(
            count=count,
            job_title=job_posting.job_title,
            department=job_posting.department or "N/A",
            required_skills=job_posting.required_skills or "N/A",
            required_qualifications=job_posting.required_qualifications or "N/A",
            responsibilities=job_posting.responsibilities or "N/A",
        )

        raw = await service.generate_json(TECHNICAL_SYSTEM_PROMPT, user_prompt)
        questions = _parse_questions_from_response(raw)

        if questions:
            self._question_cache[cache_key] = questions
            logger.info("Generated %d technical questions for '%s'", len(questions), job_posting.job_title)
        else:
            logger.error("LLM returned no valid technical questions")

        return questions

    async def generate_english_test(
        self,
        job_posting_id: str,
        count: Optional[int] = None,
    ) -> List[TestQuestion]:
        """Generate B1-B2 English proficiency questions via LLM."""
        if count is None:
            count = self._settings.english_test_question_count

        cache_key = f"english:{job_posting_id}"
        if cache_key in self._question_cache:
            logger.info("English test cache hit: %s", cache_key)
            return self._question_cache[cache_key]

        from app.services.openai_service import OpenAIService

        service = OpenAIService()

        grammar_count = count // 3
        vocab_count = count // 3
        reading_count = count - grammar_count - vocab_count

        user_prompt = ENGLISH_USER_PROMPT_TEMPLATE.format(
            count=count,
            grammar_count=grammar_count,
            vocab_count=vocab_count,
            reading_count=reading_count,
        )

        raw = await service.generate_json(ENGLISH_SYSTEM_PROMPT, user_prompt)
        questions = _parse_questions_from_response(raw)

        if questions:
            self._question_cache[cache_key] = questions
            logger.info("Generated %d English questions for posting %s", len(questions), job_posting_id)
        else:
            logger.error("LLM returned no valid English questions")

        return questions

    # ── Public API ──────────────────────────────────────────────────

    def get_cached_questions(
        self,
        test_type: str,
        job_posting_id: str,
        job_posting: Optional[JobPostingInput] = None,
    ) -> Optional[List[TestQuestion]]:
        """Return cached questions if available, None otherwise."""
        if test_type == "technical_assessment" and job_posting:
            cache_key = _posting_cache_key(job_posting, "technical")
        elif test_type == "english_test":
            cache_key = f"english:{job_posting_id}"
        else:
            return None
        return self._question_cache.get(cache_key)

    def build_questions_response(
        self,
        test_type: str,
        questions: List[TestQuestion],
    ) -> TestQuestionsResponse:
        """Build a response stripping correct answers."""
        questions_out = [
            TestQuestionOut(
                id=q.id,
                category=q.category,
                difficulty=q.difficulty,
                question=q.question,
                options=q.options,
            )
            for q in questions
        ]

        time_limit = (
            self._settings.technical_test_time_limit_minutes
            if test_type == "technical_assessment"
            else self._settings.english_test_time_limit_minutes
        )

        return TestQuestionsResponse(
            test_type=test_type,
            questions=questions_out,
            total_questions=len(questions_out),
            time_limit_minutes=time_limit,
        )

    def grade_submission(
        self,
        submission: TestSubmission,
        questions: List[TestQuestion],
    ) -> TestResult:
        """
        Grade a test submission against provided questions.

        Deterministic — no LLM involved in grading.
        """
        answer_key = {q.id: q.correct_answer for q in questions}
        question_map = {q.id: q for q in questions}

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
            passed=None,
            test_date=datetime.utcnow(),
            category_breakdown=breakdown,
        )
