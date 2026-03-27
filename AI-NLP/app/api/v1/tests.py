"""
Test API endpoints — Technical Assessment & English Proficiency.

POST /api/v1/tests/{test_type}/generate  — Generate test for a job posting
POST /api/v1/tests/{test_type}/submit    — Submit answers & get grade
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_test_engine
from app.core.test_engine import TestEngine
from app.models.job_posting import JobPostingInput
from app.models.test import TestQuestionsResponse, TestResult, TestSubmission
from app.utils.validators import validate_test_type

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tests", tags=["Tests"])


class GenerateTestRequest(BaseModel):
    """Request to generate a test for a job posting."""
    job_posting: JobPostingInput
    question_count: Optional[int] = None


@router.post("/{test_type}/generate", response_model=TestQuestionsResponse)
async def generate_test(
    test_type: str,
    request: GenerateTestRequest,
    engine: TestEngine = Depends(get_test_engine),
):
    """
    Generate AI-powered test questions for a specific job posting.

    - **test_type**: `technical_assessment` or `english_test`
    - **job_posting**: The job posting to generate questions for
    - **question_count**: Override default question count (optional)

    Questions are cached per job posting — subsequent calls return the same test.
    Response does NOT include correct answers.
    """
    try:
        test_type = validate_test_type(test_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        if test_type == "technical_assessment":
            questions = await engine.generate_technical_test(
                request.job_posting,
                count=request.question_count,
            )
        else:
            questions = await engine.generate_english_test(
                request.job_posting.id or "default",
                count=request.question_count,
            )
    except Exception as exc:
        logger.error("Test generation failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Test generation failed: {exc}",
        )

    if not questions:
        raise HTTPException(
            status_code=500,
            detail="AI could not generate valid test questions. Please try again.",
        )

    return engine.build_questions_response(test_type, questions)


@router.post("/{test_type}/submit", response_model=TestResult)
async def submit_test(
    test_type: str,
    submission: TestSubmission,
    engine: TestEngine = Depends(get_test_engine),
):
    """
    Submit test answers and receive grading results.

    The grading is immediate and deterministic (no GPT involved).
    Questions must have been generated previously for this job posting.
    """
    try:
        validated_type = validate_test_type(test_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if validated_type != submission.test_type:
        raise HTTPException(
            status_code=400,
            detail=f"URL test_type '{test_type}' doesn't match body test_type '{submission.test_type}'",
        )

    if not submission.answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    # Retrieve cached questions for grading
    questions = engine.get_cached_questions(
        validated_type,
        submission.job_posting_id or "default",
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No generated test found for this job posting. Generate a test first.",
        )

    result = engine.grade_submission(submission, questions)
    return result
