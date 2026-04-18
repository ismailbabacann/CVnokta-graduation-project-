"""
Backend Integration API endpoints.

These endpoints are called by the .NET backend (not directly by the frontend).
They return camelCase JSON matching backend DTO contracts.

POST /api/v1/backend/generate-job-posting  — AI job posting generation
POST /api/v1/backend/generate-exam         — AI exam generation (backend format)
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import get_test_engine
from app.config import get_settings
from app.core.test_engine import TestEngine
from app.models.job_posting import JobPostingInput

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backend", tags=["Backend Integration"])


# ── Job Posting Generation ──────────────────────────────────────────


class GenerateJobPostingRequest(BaseModel):
    """Input from backend — free-text context to generate a job posting."""
    context: str = Field(..., min_length=5, description="Free-text description of the desired job posting")


class GeneratedJobPostingResponse(BaseModel):
    """Matches backend GeneratedJobPostingDto (camelCase via alias)."""

    model_config = ConfigDict(populate_by_name=True)

    job_title: str = Field(..., alias="jobTitle")
    department: Optional[str] = Field(None, alias="department")
    location: Optional[str] = Field(None, alias="location")
    work_type: Optional[str] = Field(None, alias="workType")
    work_model: Optional[str] = Field(None, alias="workModel")
    about_company: Optional[str] = Field(None, alias="aboutCompany")
    about_role: Optional[str] = Field(None, alias="aboutRole")
    responsibilities: Optional[str] = Field(None, alias="responsibilities")
    required_qualifications: Optional[str] = Field(None, alias="requiredQualifications")
    required_skills: Optional[str] = Field(None, alias="requiredSkills")
    salary_min: Optional[float] = Field(None, alias="salaryMin")
    salary_max: Optional[float] = Field(None, alias="salaryMax")
    total_positions: int = Field(1, alias="totalPositions")
    benefits: Optional[str] = Field(None, alias="benefits")


@router.post("/generate-job-posting")
async def generate_job_posting(request: GenerateJobPostingRequest):
    """
    Generate a complete job posting from free-text context using LLM.

    Called by the .NET backend's IAiJobPostingGenerationService.
    Returns camelCase JSON matching GeneratedJobPostingDto.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM unavailable: OPENAI_API_KEY is required.",
        )

    from app.core.prompts.job_posting import (
        JOB_POSTING_SYSTEM_PROMPT,
        JOB_POSTING_USER_PROMPT_TEMPLATE,
    )
    from app.services.openai_service import OpenAIService

    service = OpenAIService()
    user_prompt = JOB_POSTING_USER_PROMPT_TEMPLATE.format(context=request.context)

    try:
        result = await service.generate_json(JOB_POSTING_SYSTEM_PROMPT, user_prompt)
    except Exception as exc:
        logger.error("Job posting generation failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"Generation failed: {exc}")

    # Ensure required field exists
    if not result.get("jobTitle"):
        raise HTTPException(status_code=500, detail="LLM did not return a valid job posting.")

    return result


# ── Exam Generation (Backend Format) ────────────────────────────────


class GenerateExamRequest(BaseModel):
    """Matches backend GenerateEnglishExamQuery."""

    model_config = ConfigDict(populate_by_name=True)

    test_context: str = Field(
        ...,
        alias="testContext",
        min_length=3,
        description="Context describing what kind of exam to generate",
    )


class ExamQuestionDto(BaseModel):
    """Matches backend GeneratedExamQuestionDto (camelCase)."""

    model_config = ConfigDict(populate_by_name=True)

    question_text: str = Field(..., alias="questionText")
    options: List[str]
    correct_answer: str = Field(..., alias="correctAnswer")


class GeneratedExamResponse(BaseModel):
    """Matches backend GeneratedExamDto (camelCase)."""

    model_config = ConfigDict(populate_by_name=True)

    title: str
    description: str
    questions: List[ExamQuestionDto]


@router.post("/generate-exam")
async def generate_exam(request: GenerateExamRequest):
    """
    Generate an exam from free-text context — returns backend-compatible camelCase format.

    Called by the .NET backend's IAiJobPostingGenerationService.GenerateEnglishExamAsync().

    The test_context determines the type:
    - Contains "ingilizce" / "english" → English proficiency test
    - Otherwise → technical/aptitude test
    """
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM unavailable: OPENAI_API_KEY is required.",
        )

    context_lower = request.test_context.lower()
    is_english = any(kw in context_lower for kw in ["ingilizce", "english", "İngilizce"])

    engine: TestEngine = get_test_engine()

    try:
        if is_english:
            questions = await engine.generate_english_test("backend-exam", count=10)
            title = "İngilizce Yeterlilik Testi"
            description = "Adayların iş İngilizcesi bilgilerini ölçen çoktan seçmeli sorular."
        else:
            # Build a minimal job posting from context for technical test
            job_posting = JobPostingInput(
                job_title=request.test_context[:100],
                required_skills=request.test_context,
                required_qualifications=request.test_context,
                responsibilities=request.test_context,
            )
            questions = await engine.generate_technical_test(job_posting, count=10)
            title = "Genel Yetenek Testi"
            description = request.test_context
    except Exception as exc:
        logger.error("Exam generation failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"Exam generation failed: {exc}")

    if not questions:
        raise HTTPException(status_code=500, detail="LLM could not generate valid questions.")

    # Convert to backend format (camelCase, correct_answer as text not index)
    exam_questions = []
    for q in questions:
        correct_text = q.options[q.correct_answer] if q.correct_answer < len(q.options) else q.options[0]
        exam_questions.append({
            "questionText": q.question,
            "options": q.options,
            "correctAnswer": correct_text,
        })

    return {
        "title": title,
        "description": description,
        "questions": exam_questions,
    }
