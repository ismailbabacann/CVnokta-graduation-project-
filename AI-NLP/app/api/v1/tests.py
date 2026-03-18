"""
Test API endpoints — General Aptitude & English Proficiency.

GET  /api/v1/tests/{test_type}/questions  — Get randomised questions
POST /api/v1/tests/{test_type}/submit     — Submit answers & get grade
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_test_engine
from app.core.test_engine import TestEngine
from app.models.test import TestQuestionsResponse, TestResult, TestSubmission
from app.utils.validators import validate_test_type

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tests", tags=["Tests"])


@router.get("/{test_type}/questions", response_model=TestQuestionsResponse)
async def get_questions(
    test_type: str,
    count: Optional[int] = Query(None, ge=1, le=100, description="Number of questions"),
    categories: Optional[str] = Query(None, description="Comma-separated category filter"),
    engine: TestEngine = Depends(get_test_engine),
):
    """
    Retrieve a randomised set of questions for a test session.

    - **test_type**: `general_aptitude` or `english_proficiency`
    - **count**: Override default question count (optional)
    - **categories**: Filter by category, comma-separated (optional)

    Response does NOT include correct answers.
    """
    try:
        test_type = validate_test_type(test_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    cat_list: Optional[List[str]] = None
    if categories:
        cat_list = [c.strip() for c in categories.split(",") if c.strip()]

    response = engine.get_questions(test_type, count=count, categories=cat_list)

    if not response.questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for test type '{test_type}'. "
            f"Ensure question files exist in data/tests/{test_type}/",
        )

    return response


@router.post("/{test_type}/submit", response_model=TestResult)
async def submit_test(
    test_type: str,
    submission: TestSubmission,
    engine: TestEngine = Depends(get_test_engine),
):
    """
    Submit test answers and receive grading results.

    The grading is immediate and deterministic (no GPT involved).
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

    result = engine.grade_submission(submission)
    return result
