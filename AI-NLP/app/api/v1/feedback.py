"""
Feedback API endpoints.

Provides endpoints for generating dual-perspective feedback (HR + Candidate)
for each pipeline stage, as well as a final summary endpoint.

These endpoints can be called by:
  - The .NET backend (to generate and persist feedback)
  - Internally by the CV/test/interview pipelines
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings
from app.core.feedback_engine import (
    generate_cv_feedback,
    generate_final_summary,
    generate_interview_feedback,
    generate_test_feedback,
)
from app.models.feedback import (
    FeedbackContent,
    FeedbackGenerateRequest,
    FeedbackGenerateResponse,
    FeedbackStage,
    FinalSummaryRequest,
    FullFeedbackResponse,
    StageFeedback,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["Feedback"])


# ── Request/Response models for Backend integration (camelCase) ─────


class FeedbackContentDto(BaseModel):
    """camelCase DTO matching Backend expectations."""
    model_config = ConfigDict(populate_by_name=True)

    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    overall: str = ""


class StageFeedbackDto(BaseModel):
    """camelCase DTO for a single stage's feedback."""
    model_config = ConfigDict(populate_by_name=True)

    stage: str
    hr_feedback: FeedbackContentDto = Field(alias="hrFeedback", default_factory=FeedbackContentDto)
    candidate_feedback: FeedbackContentDto = Field(alias="candidateFeedback", default_factory=FeedbackContentDto)


def _to_dto(sf: StageFeedback) -> dict:
    """Convert internal StageFeedback to camelCase dict for Backend."""
    return {
        "stage": sf.stage.value,
        "hrFeedback": {
            "strengths": sf.hr_feedback.strengths,
            "weaknesses": sf.hr_feedback.weaknesses,
            "overall": sf.hr_feedback.overall,
        },
        "candidateFeedback": {
            "strengths": sf.candidate_feedback.strengths,
            "weaknesses": sf.candidate_feedback.weaknesses,
            "overall": sf.candidate_feedback.overall,
        },
    }


# ═══════════════════════════════════════════════════════════════════
# CV Feedback
# ═══════════════════════════════════════════════════════════════════


class CvFeedbackRequest(BaseModel):
    """Input for generating CV analysis feedback."""
    model_config = ConfigDict(populate_by_name=True)

    application_id: str = Field(..., alias="applicationId")
    job_title: str = Field(..., alias="jobTitle")
    department: str = Field("N/A", alias="department")
    required_qualifications: str = Field("N/A", alias="requiredQualifications")
    required_skills: str = Field("N/A", alias="requiredSkills")
    analysis_score: float = Field(..., alias="analysisScore")
    experience_match_score: float = Field(0.0, alias="experienceMatchScore")
    education_match_score: float = Field(0.0, alias="educationMatchScore")
    matching_skills: str = Field("", alias="matchingSkills")
    missing_skills: str = Field("", alias="missingSkills")
    overall_assessment: str = Field("", alias="overallAssessment")


@router.post("/cv")
async def generate_cv_feedback_endpoint(request: CvFeedbackRequest):
    """Generate dual-perspective feedback for CV analysis results."""
    logger.info("Generating CV feedback for application %s", request.application_id)

    feedback = await generate_cv_feedback(
        job_title=request.job_title,
        department=request.department,
        required_qualifications=request.required_qualifications,
        required_skills=request.required_skills,
        analysis_score=request.analysis_score,
        experience_match_score=request.experience_match_score,
        education_match_score=request.education_match_score,
        matching_skills=request.matching_skills,
        missing_skills=request.missing_skills,
        overall_assessment=request.overall_assessment,
    )

    return {
        "applicationId": request.application_id,
        **_to_dto(feedback),
    }


# ═══════════════════════════════════════════════════════════════════
# Test Feedback (English / Skills)
# ═══════════════════════════════════════════════════════════════════


class TestFeedbackRequest(BaseModel):
    """Input for generating test feedback."""
    model_config = ConfigDict(populate_by_name=True)

    application_id: str = Field(..., alias="applicationId")
    job_title: str = Field(..., alias="jobTitle")
    test_type: str = Field(..., alias="testType")
    total_questions: int = Field(10, alias="totalQuestions")
    correct_answers: int = Field(0, alias="correctAnswers")
    score: float = Field(0.0, alias="score")
    passed: bool = Field(False, alias="passed")
    question_breakdown: str = Field("", alias="questionBreakdown")


@router.post("/test")
async def generate_test_feedback_endpoint(request: TestFeedbackRequest):
    """Generate dual-perspective feedback for test results (English or Skills)."""
    logger.info(
        "Generating %s feedback for application %s",
        request.test_type, request.application_id,
    )

    feedback = await generate_test_feedback(
        test_type=request.test_type,
        job_title=request.job_title,
        total_questions=request.total_questions,
        correct_answers=request.correct_answers,
        score=request.score,
        passed=request.passed,
        question_breakdown=request.question_breakdown,
    )

    return {
        "applicationId": request.application_id,
        **_to_dto(feedback),
    }


# ═══════════════════════════════════════════════════════════════════
# Interview Feedback
# ═══════════════════════════════════════════════════════════════════


class InterviewFeedbackRequest(BaseModel):
    """Input for generating interview feedback."""
    model_config = ConfigDict(populate_by_name=True)

    application_id: str = Field(..., alias="applicationId")
    job_title: str = Field(..., alias="jobTitle")
    required_skills: str = Field("N/A", alias="requiredSkills")
    overall_interview_score: float = Field(0.0, alias="overallInterviewScore")
    communication_score: float = Field(0.0, alias="communicationScore")
    technical_knowledge_score: float = Field(0.0, alias="technicalKnowledgeScore")
    job_match_score: float = Field(0.0, alias="jobMatchScore")
    experience_alignment_score: float = Field(0.0, alias="experienceAlignmentScore")
    average_confidence_score: float = Field(0.0, alias="averageConfidenceScore")
    summary_text: str = Field("", alias="summaryText")
    strengths: str = Field("", alias="strengths")
    weaknesses: str = Field("", alias="weaknesses")


@router.post("/interview")
async def generate_interview_feedback_endpoint(request: InterviewFeedbackRequest):
    """Generate dual-perspective feedback for AI interview results."""
    logger.info("Generating interview feedback for application %s", request.application_id)

    feedback = await generate_interview_feedback(
        job_title=request.job_title,
        required_skills=request.required_skills,
        overall_interview_score=request.overall_interview_score,
        communication_score=request.communication_score,
        technical_knowledge_score=request.technical_knowledge_score,
        job_match_score=request.job_match_score,
        experience_alignment_score=request.experience_alignment_score,
        average_confidence_score=request.average_confidence_score,
        summary_text=request.summary_text,
        strengths=request.strengths,
        weaknesses=request.weaknesses,
    )

    return {
        "applicationId": request.application_id,
        **_to_dto(feedback),
    }


# ═══════════════════════════════════════════════════════════════════
# Final Summary
# ═══════════════════════════════════════════════════════════════════


class StageSummaryInput(BaseModel):
    """Summary data for one stage to use in final summary generation."""
    model_config = ConfigDict(populate_by_name=True)

    score: Optional[float] = None
    hr_overall: str = Field("", alias="hrOverall")
    candidate_overall: str = Field("", alias="candidateOverall")


class FinalSummaryApiRequest(BaseModel):
    """Input for generating final summary feedback across all stages."""
    model_config = ConfigDict(populate_by_name=True)

    application_id: str = Field(..., alias="applicationId")
    cv: Optional[StageSummaryInput] = Field(None, alias="cv")
    english_test: Optional[StageSummaryInput] = Field(None, alias="englishTest")
    skills_test: Optional[StageSummaryInput] = Field(None, alias="skillsTest")
    interview: Optional[StageSummaryInput] = Field(None, alias="interview")


@router.post("/summary")
async def generate_final_summary_endpoint(request: FinalSummaryApiRequest):
    """Generate a final summary feedback synthesizing all stage results."""
    logger.info("Generating final summary feedback for application %s", request.application_id)

    # Build StageFeedback objects from the summary inputs so the engine can extract overalls
    def _build_stage_fb(stage: FeedbackStage, inp: Optional[StageSummaryInput]) -> Optional[StageFeedback]:
        if inp is None:
            return None
        return StageFeedback(
            stage=stage,
            hr_feedback=FeedbackContent(overall=inp.hr_overall),
            candidate_feedback=FeedbackContent(overall=inp.candidate_overall),
        )

    feedback = await generate_final_summary(
        cv_score=request.cv.score if request.cv else None,
        cv_feedback=_build_stage_fb(FeedbackStage.CV_ANALYSIS, request.cv),
        english_score=request.english_test.score if request.english_test else None,
        english_feedback=_build_stage_fb(FeedbackStage.ENGLISH_TEST, request.english_test),
        skills_score=request.skills_test.score if request.skills_test else None,
        skills_feedback=_build_stage_fb(FeedbackStage.SKILLS_TEST, request.skills_test),
        interview_score=request.interview.score if request.interview else None,
        interview_feedback=_build_stage_fb(FeedbackStage.AI_INTERVIEW, request.interview),
    )

    return {
        "applicationId": request.application_id,
        **_to_dto(feedback),
    }
