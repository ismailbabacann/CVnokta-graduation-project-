"""
Feedback Generation Engine — produces dual-perspective feedback (HR + Candidate).

Each function takes stage-specific data and returns a StageFeedback with both perspectives.
Uses OpenAI GPT to generate Turkish-language feedback in a single call per stage.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.models.feedback import (
    FeedbackContent,
    FeedbackStage,
    StageFeedback,
)

logger = logging.getLogger(__name__)


def _parse_feedback_response(raw: Dict[str, Any]) -> tuple[FeedbackContent, FeedbackContent]:
    """Parse GPT JSON response into (hr_feedback, candidate_feedback) tuple."""

    def _to_content(d: Dict[str, Any]) -> FeedbackContent:
        strengths = d.get("strengths") or []
        if isinstance(strengths, str):
            strengths = [s.strip() for s in strengths.split(",") if s.strip()]
        weaknesses = d.get("weaknesses") or []
        if isinstance(weaknesses, str):
            weaknesses = [s.strip() for s in weaknesses.split(",") if s.strip()]
        overall = str(d.get("overall") or "").strip()
        return FeedbackContent(strengths=strengths, weaknesses=weaknesses, overall=overall)

    hr_raw = raw.get("hr_feedback", {})
    candidate_raw = raw.get("candidate_feedback", {})

    return _to_content(hr_raw), _to_content(candidate_raw)


def _fallback_content(message: str) -> FeedbackContent:
    """Fallback content when GPT is unavailable."""
    return FeedbackContent(strengths=[], weaknesses=[], overall=message)


# ═══════════════════════════════════════════════════════════════════
# CV ANALYSIS FEEDBACK
# ═══════════════════════════════════════════════════════════════════


async def generate_cv_feedback(
    *,
    job_title: str,
    department: str = "N/A",
    required_qualifications: str = "N/A",
    required_skills: str = "N/A",
    analysis_score: float,
    experience_match_score: float,
    education_match_score: float,
    matching_skills: str,
    missing_skills: str,
    overall_assessment: str,
) -> StageFeedback:
    """Generate dual-perspective feedback for CV analysis results."""
    from app.core.prompts.feedback import (
        CV_FEEDBACK_SYSTEM_PROMPT,
        CV_FEEDBACK_USER_PROMPT,
    )
    from app.services.openai_service import OpenAIService

    settings = get_settings()

    if not settings.openai_api_key:
        logger.warning("OpenAI unavailable — returning fallback CV feedback")
        fb = _fallback_content("AI geri bildirim servisi şu an kullanılamıyor.")
        return StageFeedback(stage=FeedbackStage.CV_ANALYSIS, hr_feedback=fb, candidate_feedback=fb)

    user_prompt = CV_FEEDBACK_USER_PROMPT.format(
        job_title=job_title,
        department=department,
        required_qualifications=required_qualifications,
        required_skills=required_skills,
        analysis_score=analysis_score,
        experience_match_score=experience_match_score,
        education_match_score=education_match_score,
        matching_skills=matching_skills or "Yok",
        missing_skills=missing_skills or "Yok",
        overall_assessment=overall_assessment or "N/A",
    )

    try:
        service = OpenAIService()
        raw = await service.generate_json(
            CV_FEEDBACK_SYSTEM_PROMPT, user_prompt, use_cache=False
        )
        hr_fb, candidate_fb = _parse_feedback_response(raw)
        return StageFeedback(
            stage=FeedbackStage.CV_ANALYSIS,
            hr_feedback=hr_fb,
            candidate_feedback=candidate_fb,
        )
    except Exception as exc:
        logger.error("CV feedback generation failed: %s", exc)
        fb = _fallback_content("CV geri bildirimi oluşturulamadı.")
        return StageFeedback(stage=FeedbackStage.CV_ANALYSIS, hr_feedback=fb, candidate_feedback=fb)


# ═══════════════════════════════════════════════════════════════════
# TEST (ENGLISH / SKILLS) FEEDBACK
# ═══════════════════════════════════════════════════════════════════


async def generate_test_feedback(
    *,
    test_type: str,
    job_title: str,
    total_questions: int,
    correct_answers: int,
    score: float,
    passed: bool,
    question_breakdown: str = "",
) -> StageFeedback:
    """Generate dual-perspective feedback for test results (English or Skills)."""
    from app.core.prompts.feedback import (
        TEST_FEEDBACK_SYSTEM_PROMPT,
        TEST_FEEDBACK_USER_PROMPT,
    )
    from app.services.openai_service import OpenAIService

    settings = get_settings()

    # Determine stage type
    test_lower = test_type.lower()
    if any(kw in test_lower for kw in ["english", "ingilizce", "i̇ngilizce"]):
        stage = FeedbackStage.ENGLISH_TEST
        test_type_display = "İngilizce Yeterlilik Testi"
    else:
        stage = FeedbackStage.SKILLS_TEST
        test_type_display = "Teknik Beceri Testi"

    if not settings.openai_api_key:
        logger.warning("OpenAI unavailable — returning fallback test feedback")
        fb = _fallback_content("AI geri bildirim servisi şu an kullanılamıyor.")
        return StageFeedback(stage=stage, hr_feedback=fb, candidate_feedback=fb)

    result_status = "BAŞARILI" if passed else "BAŞARISIZ"

    user_prompt = TEST_FEEDBACK_USER_PROMPT.format(
        test_type=test_type_display,
        job_title=job_title,
        total_questions=total_questions,
        correct_answers=correct_answers,
        score=score,
        result_status=result_status,
        question_breakdown=question_breakdown or "Detay mevcut değil.",
    )

    try:
        service = OpenAIService()
        raw = await service.generate_json(
            TEST_FEEDBACK_SYSTEM_PROMPT, user_prompt, use_cache=False
        )
        hr_fb, candidate_fb = _parse_feedback_response(raw)
        return StageFeedback(stage=stage, hr_feedback=hr_fb, candidate_feedback=candidate_fb)
    except Exception as exc:
        logger.error("Test feedback generation failed: %s", exc)
        fb = _fallback_content("Sınav geri bildirimi oluşturulamadı.")
        return StageFeedback(stage=stage, hr_feedback=fb, candidate_feedback=fb)


# ═══════════════════════════════════════════════════════════════════
# AI INTERVIEW FEEDBACK
# ═══════════════════════════════════════════════════════════════════


async def generate_interview_feedback(
    *,
    job_title: str,
    required_skills: str = "N/A",
    overall_interview_score: float,
    communication_score: float,
    technical_knowledge_score: float,
    job_match_score: float,
    experience_alignment_score: float,
    average_confidence_score: float,
    summary_text: str,
    strengths: str,
    weaknesses: str,
) -> StageFeedback:
    """Generate dual-perspective feedback for AI interview results."""
    from app.core.prompts.feedback import (
        INTERVIEW_FEEDBACK_SYSTEM_PROMPT,
        INTERVIEW_FEEDBACK_USER_PROMPT,
    )
    from app.services.openai_service import OpenAIService

    settings = get_settings()

    if not settings.openai_api_key:
        logger.warning("OpenAI unavailable — returning fallback interview feedback")
        fb = _fallback_content("AI geri bildirim servisi şu an kullanılamıyor.")
        return StageFeedback(stage=FeedbackStage.AI_INTERVIEW, hr_feedback=fb, candidate_feedback=fb)

    user_prompt = INTERVIEW_FEEDBACK_USER_PROMPT.format(
        job_title=job_title,
        required_skills=required_skills,
        overall_interview_score=overall_interview_score,
        communication_score=communication_score,
        technical_knowledge_score=technical_knowledge_score,
        job_match_score=job_match_score,
        experience_alignment_score=experience_alignment_score,
        average_confidence_score=average_confidence_score,
        summary_text=summary_text or "N/A",
        strengths=strengths or "N/A",
        weaknesses=weaknesses or "N/A",
    )

    try:
        service = OpenAIService()
        raw = await service.generate_json(
            INTERVIEW_FEEDBACK_SYSTEM_PROMPT, user_prompt, use_cache=False
        )
        hr_fb, candidate_fb = _parse_feedback_response(raw)
        return StageFeedback(
            stage=FeedbackStage.AI_INTERVIEW,
            hr_feedback=hr_fb,
            candidate_feedback=candidate_fb,
        )
    except Exception as exc:
        logger.error("Interview feedback generation failed: %s", exc)
        fb = _fallback_content("Mülakat geri bildirimi oluşturulamadı.")
        return StageFeedback(stage=FeedbackStage.AI_INTERVIEW, hr_feedback=fb, candidate_feedback=fb)


# ═══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════


async def generate_final_summary(
    *,
    cv_score: Optional[float] = None,
    cv_feedback: Optional[StageFeedback] = None,
    english_score: Optional[float] = None,
    english_feedback: Optional[StageFeedback] = None,
    skills_score: Optional[float] = None,
    skills_feedback: Optional[StageFeedback] = None,
    interview_score: Optional[float] = None,
    interview_feedback: Optional[StageFeedback] = None,
) -> StageFeedback:
    """Generate a final summary feedback synthesizing all stage results."""
    from app.core.prompts.feedback import (
        FINAL_SUMMARY_SYSTEM_PROMPT,
        FINAL_SUMMARY_USER_PROMPT,
    )
    from app.services.openai_service import OpenAIService

    settings = get_settings()

    if not settings.openai_api_key:
        logger.warning("OpenAI unavailable — returning fallback final summary")
        fb = _fallback_content("AI geri bildirim servisi şu an kullanılamıyor.")
        return StageFeedback(stage=FeedbackStage.FINAL_SUMMARY, hr_feedback=fb, candidate_feedback=fb)

    def _get_overall(fb: Optional[StageFeedback], perspective: str) -> str:
        if fb is None:
            return "Bu aşama henüz tamamlanmadı."
        content = fb.hr_feedback if perspective == "hr" else fb.candidate_feedback
        return content.overall or "Geri bildirim mevcut değil."

    user_prompt = FINAL_SUMMARY_USER_PROMPT.format(
        cv_score=cv_score if cv_score is not None else "N/A",
        cv_hr_overall=_get_overall(cv_feedback, "hr"),
        cv_candidate_overall=_get_overall(cv_feedback, "candidate"),
        english_score=english_score if english_score is not None else "N/A",
        english_hr_overall=_get_overall(english_feedback, "hr"),
        english_candidate_overall=_get_overall(english_feedback, "candidate"),
        skills_score=skills_score if skills_score is not None else "N/A",
        skills_hr_overall=_get_overall(skills_feedback, "hr"),
        skills_candidate_overall=_get_overall(skills_feedback, "candidate"),
        interview_score=interview_score if interview_score is not None else "N/A",
        interview_hr_overall=_get_overall(interview_feedback, "hr"),
        interview_candidate_overall=_get_overall(interview_feedback, "candidate"),
    )

    try:
        service = OpenAIService()
        raw = await service.generate_json(
            FINAL_SUMMARY_SYSTEM_PROMPT, user_prompt, use_cache=False
        )
        hr_fb, candidate_fb = _parse_feedback_response(raw)
        return StageFeedback(
            stage=FeedbackStage.FINAL_SUMMARY,
            hr_feedback=hr_fb,
            candidate_feedback=candidate_fb,
        )
    except Exception as exc:
        logger.error("Final summary feedback generation failed: %s", exc)
        fb = _fallback_content("Genel özet geri bildirimi oluşturulamadı.")
        return StageFeedback(stage=FeedbackStage.FINAL_SUMMARY, hr_feedback=fb, candidate_feedback=fb)
