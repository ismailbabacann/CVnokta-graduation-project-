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

from app.core.test_engine import TestEngine
from app.models.job_posting import JobPostingInput
from app.core.prompts.test_evaluation import (
    TEST_EVALUATION_SYSTEM_PROMPT,
    TEST_EVALUATION_USER_PROMPT_TEMPLATE,
)
from app.services.openai_service import OpenAIService
from app.config import get_settings
from app.api.deps import get_test_engine

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
    logger.info("OpenAI Key present: %s", bool(settings.openai_api_key))
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
    logger.info("OpenAI Key present: %s", bool(settings.openai_api_key))
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM unavailable: OPENAI_API_KEY is required.",
        )

    context_lower = request.test_context.lower()
    # Broaden detection for English (explicit prefix from backend + keywords)
    is_english = any(kw in context_lower for kw in [
        "english_proficiency_test", 
        "ingilizce", 
        "english", 
        "i̇ngilizce", # handles Turkish dotless 'i' vs 'İ' issues
    ])

    logger.info("Generating exam. Type: %s, Context: %s", "ENGLISH" if is_english else "TECHNICAL", request.test_context)

    engine: TestEngine = get_test_engine()

    try:
        if is_english:
            # Extract language level from context if provided (e.g. "english_proficiency_test B2")
            language_level = None
            for lvl in ["C1", "B2", "B1", "A2"]:
                if lvl.lower() in context_lower:
                    language_level = lvl
                    break
            questions = await engine.generate_english_test(
                "backend-exam", count=30, language_level=language_level,
            )
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
            questions = await engine.generate_technical_test(job_posting, count=20)
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


# ── Exam Analysis ───────────────────────────────────────────────────


class QuestionAnalysisItem(BaseModel):
    """Input from backend for one question's result."""
    model_config = ConfigDict(populate_by_name=True)

    question_text: str = Field(..., alias="questionText")
    your_answer: str = Field(..., alias="yourAnswer")
    correct_answer: str = Field(..., alias="correctAnswer")
    is_correct: bool = Field(True, alias="isCorrect")


class AnalyzeTestRequest(BaseModel):
    """Input for analyzing exam submission."""
    model_config = ConfigDict(populate_by_name=True)

    application_id: str = Field(..., alias="applicationId")
    job_title: str = Field(..., alias="jobTitle")
    total_questions: int = Field(10, alias="totalQuestions")
    correct_answers: int = Field(0, alias="correctAnswers")
    score: float = Field(0.0, alias="score")
    passed: bool = Field(False, alias="passed")
    results: List[QuestionAnalysisItem] = Field(default_factory=list, alias="results")


@router.post("/analyze-test-results")
async def analyze_test_results(request: AnalyzeTestRequest):
    """
    Generate professional AI feedback for a candidate based on their exam performance.

    Returns both the original single-perspective feedback (backward compatible)
    AND dual-perspective feedback (hrFeedback + candidateFeedback).
    """
    settings = get_settings()
    logger.info("OpenAI Key present: %s", bool(settings.openai_api_key))
    if not settings.openai_api_key:
        return {"feedback": "AI değerlendirmesi şu an yapılamıyor, lütfen manuel olarak devam ediniz."}

    # Format question breakdown for LLM
    breakdown = ""
    for idx, res in enumerate(request.results, 1):
        status = "✅ DOĞRU" if res.isCorrect else "❌ YANLIŞ"
        breakdown += f"Soru {idx}: {res.questionText}\n"
        breakdown += f"   - Adayın Cevabı: {res.yourAnswer}\n"
        breakdown += f"   - Doğru Cevap: {res.correctAnswer}\n"
        breakdown += f"   - Durum: {status}\n\n"

    # Original single-perspective feedback (backward compatibility)
    user_prompt = TEST_EVALUATION_USER_PROMPT_TEMPLATE.format(
        job_title=request.jobTitle,
        total_questions=request.totalQuestions,
        correct_answers=request.correctAnswers,
        score=request.score,
        result_status="BAŞARILI" if request.passed else "BAŞARISIZ (Elenmiş)",
        question_breakdown=breakdown,
    )

    service = OpenAIService()
    original_result = {}
    try:
        original_result = await service.generate_json(TEST_EVALUATION_SYSTEM_PROMPT, user_prompt)
    except Exception as exc:
        logger.error("Test evaluation failed: %s", exc)
        original_result = {
            "feedback": "Sınav sonucunuz sistem tarafından değerlendirildi. Detaylar için IK ekibiyle iletişime geçebilirsiniz.",
            "strengths": [],
            "weaknesses": [],
        }

    # Dual-perspective feedback (new)
    try:
        from app.core.feedback_engine import generate_test_feedback

        test_type = "english" if any(
            kw in request.jobTitle.lower()
            for kw in ["english", "ingilizce", "i̇ngilizce"]
        ) else "technical"

        dual_feedback = await generate_test_feedback(
            test_type=test_type,
            job_title=request.jobTitle,
            total_questions=request.totalQuestions,
            correct_answers=request.correctAnswers,
            score=request.score,
            passed=request.passed,
            question_breakdown=breakdown,
        )

        original_result["dualFeedback"] = {
            "stage": dual_feedback.stage.value,
            "hrFeedback": {
                "strengths": dual_feedback.hr_feedback.strengths,
                "weaknesses": dual_feedback.hr_feedback.weaknesses,
                "overall": dual_feedback.hr_feedback.overall,
            },
            "candidateFeedback": {
                "strengths": dual_feedback.candidate_feedback.strengths,
                "weaknesses": dual_feedback.candidate_feedback.weaknesses,
                "overall": dual_feedback.candidate_feedback.overall,
            },
        }

        # Also push feedback to backend
        from app.services.backend_client import push_feedback
        await push_feedback(
            application_id=request.applicationId,
            feedback=dual_feedback,
        )
    except Exception as exc:
        logger.error("Dual test feedback generation failed: %s", exc)

    return original_result


# ── Job Stats Extraction ─────────────────────────────────────────────


class ExtractJobStatsRequest(BaseModel):
    """Input from backend when a job posting is published."""
    model_config = ConfigDict(populate_by_name=True)

    job_title: str = Field(..., alias="jobTitle", description="İş ilanı başlığı")
    required_skills: Optional[str] = Field(None, alias="requiredSkills", description="Virgülle ayrılmış beceri listesi")
    location: Optional[str] = Field(None, alias="location", description="Şehir / Konum")
    responsibilities: Optional[str] = Field(None, alias="responsibilities", description="Sorumluluklar metni")
    required_qualifications: Optional[str] = Field(None, alias="requiredQualifications", description="Gerekli nitelikler metni")


class ExtractJobStatsResponse(BaseModel):
    """Extracted stats ready to be upserted into Market*Stat tables."""
    model_config = ConfigDict(populate_by_name=True)

    skills: List[str] = Field(default_factory=list)
    positions: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)


def _fallback_extract(request: ExtractJobStatsRequest) -> ExtractJobStatsResponse:
    """
    Simple rule-based extraction used when OpenAI is not available.
    - skills: comma-split from requiredSkills field
    - positions: the job title itself
    - locations: the location field (split on '/' or ',')
    """
    skills: List[str] = []
    positions: List[str] = []
    locations: List[str] = []

    # Skills — parse comma/semicolon separated list from requiredSkills
    if request.required_skills:
        raw_skills = [s.strip() for s in request.required_skills.replace(";", ",").split(",")]
        skills = [s for s in raw_skills if s and len(s) <= 60]

    # Position — use the job title directly
    if request.job_title:
        positions = [request.job_title.strip()]

    # Location — split on '/', ',', or '-'
    if request.location:
        import re
        parts = re.split(r"[/,\-]", request.location)
        locations = [p.strip() for p in parts if p.strip() and len(p.strip()) >= 2]

    return ExtractJobStatsResponse(skills=skills, positions=positions, locations=locations)


@router.post("/extract-job-stats", response_model=ExtractJobStatsResponse)
async def extract_job_stats(request: ExtractJobStatsRequest):
    """
    Extract skills, positions and locations from a published job posting.

    Called by the .NET backend when a job posting is published (Status → Active).
    The extracted data is upserted into Market*Stat tables for the statistics dashboard.

    Uses LLM when available, falls back to simple text parsing otherwise.
    """
    settings = get_settings()

    # ── LLM Path ─────────────────────────────────────────────────────
    if settings.openai_api_key:
        combined_text = f"""
İş Başlığı: {request.job_title}
Konum: {request.location or 'Belirtilmemiş'}
Gerekli Beceriler: {request.required_skills or 'Belirtilmemiş'}
Sorumluluklar: {request.responsibilities or ''}
Gerekli Nitelikler: {request.required_qualifications or ''}
""".strip()

        system_prompt = """Sen bir insan kaynakları analitiği asistanısın.
Sana verilen iş ilanı metninden aşağıdaki bilgileri JSON formatında çıkar:
- skills: İş ilanında geçen somut teknik beceriler ve araçlar (ör: Python, Java, SQL, Docker). Maksimum 15 madde. Kısa ve öz (max 40 karakter).
- positions: İş unvanı/pozisyon adı. Genellikle 1-2 madde.
- locations: Şehir isimleri (ör: İstanbul, Ankara). Ülke veya ilçe adı değil.

Sadece JSON döndür, başka hiçbir şey yok:
{"skills": [...], "positions": [...], "locations": [...]}"""

        service = OpenAIService()
        try:
            result = await service.generate_json(system_prompt, combined_text)
            extracted_skills = result.get("skills", [])
            extracted_positions = result.get("positions", [])
            extracted_locations = result.get("locations", [])

            # Validate and clean
            if isinstance(extracted_skills, list):
                extracted_skills = [str(s).strip() for s in extracted_skills if s and len(str(s).strip()) <= 80]
            else:
                extracted_skills = []

            if isinstance(extracted_positions, list):
                extracted_positions = [str(p).strip() for p in extracted_positions if p and len(str(p).strip()) <= 120]
            else:
                extracted_positions = []

            if isinstance(extracted_locations, list):
                extracted_locations = [str(loc).strip() for loc in extracted_locations if loc and len(str(loc).strip()) <= 80]
            else:
                extracted_locations = []

            logger.info(
                "Job stats extracted via LLM — skills: %d, positions: %d, locations: %d",
                len(extracted_skills), len(extracted_positions), len(extracted_locations)
            )

            return ExtractJobStatsResponse(
                skills=extracted_skills,
                positions=extracted_positions,
                locations=extracted_locations,
            )
        except Exception as exc:
            logger.warning("LLM extraction failed, using fallback: %s", exc)

    # ── Fallback Path ─────────────────────────────────────────────────
    result = _fallback_extract(request)
    logger.info(
        "Job stats extracted via fallback — skills: %d, positions: %d, locations: %d",
        len(result.skills), len(result.positions), len(result.locations)
    )
    return result
