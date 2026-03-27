"""
CV Scorer — RAG pipeline + GPT scoring.

Orchestrates:
  1. Chunk job posting into embedable segments
  2. Embed CV sections + job requirements via local model
  3. FAISS similarity search to find matched context
  4. GPT-4o-mini scores the candidate against matched context
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, List

from app.config import get_settings
from app.core.cv_parser import parse_cv_from_pdf, parse_cv_from_text
from app.core.prompts.cv_analysis import (
    CV_ANALYSIS_SYSTEM_PROMPT,
    CV_ANALYSIS_USER_PROMPT_TEMPLATE,
    PROMPT_VERSION,
)
from app.models.cv import CVAnalysisRequest, CVAnalysisResult, ParsedCV
from app.models.job_posting import JobPostingInput
from app.utils.logging import track_latency
from app.utils.text_cleaner import clean_text, mask_personal_info, strip_html

logger = logging.getLogger(__name__)

PIPELINE_VERSION = "1.0.0"


class LLMUnavailableError(RuntimeError):
    """Raised when LLM scoring is required but OpenAI service is unavailable."""


def _to_bounded_score(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(100.0, round(parsed, 1)))


def _to_csv_text(value: Any, default: str = "") -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if str(v).strip())
    return default


def _fallback_scores(parsed_cv: ParsedCV, job_posting: JobPostingInput) -> dict[str, Any]:
    required_skills = [
        s.strip().lower()
        for s in (job_posting.required_skills or "").split(",")
        if s.strip()
    ]
    candidate_skills = [s.strip().lower() for s in parsed_cv.skills if s and s.strip()]

    required_set = set(required_skills)
    candidate_set = set(candidate_skills)
    matching = sorted(required_set & candidate_set)
    missing = sorted(required_set - candidate_set)

    if required_set:
        skill_ratio = len(matching) / len(required_set)
        skill_score = round(skill_ratio * 100.0, 1)
    else:
        skill_score = 70.0

    exp_signal = 70.0
    if parsed_cv.experience:
        exp_signal = min(100.0, 60.0 + len(parsed_cv.experience) * 8.0)

    edu_signal = 65.0
    if parsed_cv.education:
        edu_signal = min(100.0, 60.0 + len(parsed_cv.education) * 12.0)

    overall = round((exp_signal * 0.4) + (edu_signal * 0.25) + (skill_score * 0.35), 1)

    return {
        "analysis_score": overall,
        "experience_match_score": exp_signal,
        "education_match_score": edu_signal,
        "matching_skills": ", ".join(s.title() for s in matching),
        "missing_skills": ", ".join(s.title() for s in missing),
        "overall_assessment": (
            "Fallback scoring was used due to unavailable or malformed LLM response. "
            "The result is based on deterministic skill and profile heuristics."
        ),
    }


def _normalize_scores(scores: dict[str, Any]) -> dict[str, Any]:
    return {
        "analysis_score": _to_bounded_score(scores.get("analysis_score"), 0.0),
        "experience_match_score": _to_bounded_score(scores.get("experience_match_score"), 0.0),
        "education_match_score": _to_bounded_score(scores.get("education_match_score"), 0.0),
        "matching_skills": _to_csv_text(scores.get("matching_skills"), ""),
        "missing_skills": _to_csv_text(scores.get("missing_skills"), ""),
        "overall_assessment": str(scores.get("overall_assessment") or "").strip(),
    }


def _chunk_job_posting(job: JobPostingInput) -> List[str]:
    """
    Break a job posting into meaningful chunks for embedding.

    Each chunk represents a distinct aspect of the job requirements.
    """
    chunks: list[str] = []

    if job.required_qualifications:
        text = strip_html(job.required_qualifications)
        chunks.append(f"Required Qualifications: {text}")

    if job.required_skills:
        chunks.append(f"Required Skills: {job.required_skills}")

    if job.responsibilities:
        text = strip_html(job.responsibilities)
        chunks.append(f"Responsibilities: {text}")

    if job.about_company:
        text = strip_html(job.about_company)
        chunks.append(f"About the Company: {text}")

    # Also chunk by individual skill if comma-separated
    if job.required_skills:
        for skill in job.required_skills.split(","):
            skill = skill.strip()
            if skill:
                chunks.append(f"Required Skill: {skill}")

    return chunks


def _build_matched_context(
    cv: ParsedCV,
    job: JobPostingInput,
    embedding_service: EmbeddingService,
    top_k: int = 8,
) -> str:
    """
    Build RAG matched context by:
    1. Indexing job posting chunks in FAISS
    2. Querying with each CV section
    3. Deduplicating and returning top matches
    """
    from app.services.vector_store import VectorStore

    job_chunks = _chunk_job_posting(job)
    if not job_chunks:
        return "No job requirements available for matching."

    vs = VectorStore(embedding_service)
    vs.add_texts(job_chunks)

    cv_sections = cv.sections_text
    if not cv_sections:
        return "No CV content available for matching."

    seen: set[str] = set()
    matched_pairs: list[str] = []

    for section in cv_sections:
        results = vs.search(section, top_k=3)
        for matched_text, score in results:
            if matched_text not in seen and score > 0.2:
                seen.add(matched_text)
                matched_pairs.append(
                    f"[Relevance: {score:.2f}] {matched_text}\n  ↔ CV: {section[:200]}"
                )

    # Sort by relevance (already implicit from search order, but be explicit)
    matched_pairs = matched_pairs[:top_k]

    if not matched_pairs:
        return "No strong matches found between CV and job requirements."

    return "\n\n".join(matched_pairs)


async def score_cv(
    request: CVAnalysisRequest,
    *,
    openai_service: OpenAIService | None = None,
    embedding_service: EmbeddingService | None = None,
) -> CVAnalysisResult:
    """
    Full CV analysis pipeline:
      1. Parse PDF → structured CV
      2. Build RAG context via embeddings + FAISS
      3. Score via GPT
      4. Return populated CVAnalysisResult

    If openai_service is None, creates a new instance (useful for DI).
    """
    from app.services.embedding_service import EmbeddingService
    from app.services.openai_service import OpenAIService

    settings = get_settings()

    if openai_service is None:
        if settings.openai_api_key:
            openai_service = OpenAIService()
        elif not settings.use_mock_data:
            raise LLMUnavailableError(
                "LLM scoring unavailable: OPENAI_API_KEY is missing while USE_MOCK_DATA=false."
            )
    if embedding_service is None:
        embedding_service = EmbeddingService()

    # Step 1: Parse CV
    logger.info("Step 1: Parsing CV from %s", request.cv_file_path)
    with track_latency("cv_parsing"):
        parsed_cv = parse_cv_from_pdf(request.cv_file_path)

    # Step 2: Build RAG context
    logger.info("Step 2: Building RAG context")
    with track_latency("rag_context"):
        matched_context = _build_matched_context(
            parsed_cv, request.job_posting, embedding_service
        )

    # Step 3: Prepare anonymised CV text for GPT
    cv_text = mask_personal_info("\n".join(parsed_cv.sections_text))

    # Step 4: Call GPT for scoring
    logger.info("Step 3: Calling GPT for scoring")
    user_prompt = CV_ANALYSIS_USER_PROMPT_TEMPLATE.format(
        job_title=request.job_posting.job_title,
        department=request.job_posting.department or "N/A",
        required_qualifications=strip_html(
            request.job_posting.required_qualifications or "N/A"
        ),
        required_skills=request.job_posting.required_skills or "N/A",
        responsibilities=strip_html(
            request.job_posting.responsibilities or "N/A"
        ),
        matched_context=matched_context,
        cv_text=cv_text,
    )

    fallback_used = False
    fallback_reason = None

    if openai_service is None:
        if not settings.llm_fallback_enabled:
            raise LLMUnavailableError(
                "LLM scoring unavailable and LLM_FALLBACK_ENABLED is false."
            )
        logger.warning("OpenAI service unavailable, using fallback scoring.")
        fallback_used = True
        fallback_reason = "OpenAI service not configured"
        with track_latency("fallback_scoring"):
            raw_scores = _fallback_scores(parsed_cv, request.job_posting)
    else:
        try:
            with track_latency("llm_scoring", {"model": settings.openai_model}):
                raw_scores = await openai_service.generate_json(
                    CV_ANALYSIS_SYSTEM_PROMPT, user_prompt
                )
        except Exception as exc:
            if not settings.llm_fallback_enabled:
                raise LLMUnavailableError(
                    f"LLM scoring failed and fallback is disabled: {exc}"
                ) from exc
            logger.warning("LLM scoring failed, using fallback scoring: %s", exc)
            fallback_used = True
            fallback_reason = f"LLM error: {exc}"
            with track_latency("fallback_scoring"):
                raw_scores = _fallback_scores(parsed_cv, request.job_posting)

    scores = _normalize_scores(raw_scores)

    # Step 5: Build result
    analysis_score = _to_bounded_score(scores.get("analysis_score"), 0.0)
    threshold = request.job_posting.min_match_score or settings.cv_pass_threshold

    return CVAnalysisResult(
        application_id=request.application_id,
        stage_id=request.stage_id,
        cv_id=request.cv_id,
        analysis_score=analysis_score,
        experience_match_score=_to_bounded_score(scores.get("experience_match_score"), 0.0),
        education_match_score=_to_bounded_score(scores.get("education_match_score"), 0.0),
        matching_skills=scores.get("matching_skills", ""),
        missing_skills=scores.get("missing_skills", ""),
        overall_assessment=scores.get("overall_assessment", ""),
        is_passed=analysis_score >= threshold,
        analysis_date=datetime.utcnow(),
        pipeline_version=PIPELINE_VERSION,
        prompt_version=PROMPT_VERSION,
        model_id=settings.openai_model if not fallback_used else None,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
        parsed_cv=parsed_cv,
    )


async def score_cv_from_text(
    raw_cv_text: str,
    job_posting: JobPostingInput,
    application_id: str,
    stage_id: str,
    cv_id: str,
    *,
    openai_service: OpenAIService | None = None,
    embedding_service: EmbeddingService | None = None,
) -> CVAnalysisResult:
    """
    Convenience: score a CV from raw text (no PDF file needed).
    Useful for testing or when text is already extracted.
    """
    from uuid import UUID

    from app.services.embedding_service import EmbeddingService
    from app.services.openai_service import OpenAIService

    settings = get_settings()

    if openai_service is None:
        if settings.openai_api_key:
            openai_service = OpenAIService()
        elif not settings.use_mock_data:
            raise LLMUnavailableError(
                "LLM scoring unavailable: OPENAI_API_KEY is missing while USE_MOCK_DATA=false."
            )
    if embedding_service is None:
        embedding_service = EmbeddingService()

    parsed_cv = parse_cv_from_text(raw_cv_text)

    matched_context = _build_matched_context(
        parsed_cv, job_posting, embedding_service
    )
    cv_text = mask_personal_info("\n".join(parsed_cv.sections_text))

    user_prompt = CV_ANALYSIS_USER_PROMPT_TEMPLATE.format(
        job_title=job_posting.job_title,
        department=job_posting.department or "N/A",
        required_qualifications=strip_html(
            job_posting.required_qualifications or "N/A"
        ),
        required_skills=job_posting.required_skills or "N/A",
        responsibilities=strip_html(
            job_posting.responsibilities or "N/A"
        ),
        matched_context=matched_context,
        cv_text=cv_text,
    )

    if openai_service is None:
        if not settings.llm_fallback_enabled:
            raise LLMUnavailableError(
                "LLM scoring unavailable and LLM_FALLBACK_ENABLED is false."
            )
        logger.warning("OpenAI service unavailable, using fallback scoring.")
        fallback_used = True
        fallback_reason = "OpenAI service not configured"
        raw_scores = _fallback_scores(parsed_cv, job_posting)
    else:
        fallback_used = False
        fallback_reason = None
        try:
            raw_scores = await openai_service.generate_json(
                CV_ANALYSIS_SYSTEM_PROMPT, user_prompt
            )
        except Exception as exc:
            if not settings.llm_fallback_enabled:
                raise LLMUnavailableError(
                    f"LLM scoring failed and fallback is disabled: {exc}"
                ) from exc
            logger.warning("LLM scoring failed, using fallback scoring: %s", exc)
            fallback_used = True
            fallback_reason = f"LLM error: {exc}"
            raw_scores = _fallback_scores(parsed_cv, job_posting)

    scores = _normalize_scores(raw_scores)

    analysis_score = _to_bounded_score(scores.get("analysis_score"), 0.0)
    threshold = job_posting.min_match_score or settings.cv_pass_threshold

    return CVAnalysisResult(
        application_id=UUID(application_id),
        stage_id=UUID(stage_id),
        cv_id=UUID(cv_id),
        analysis_score=analysis_score,
        experience_match_score=_to_bounded_score(scores.get("experience_match_score"), 0.0),
        education_match_score=_to_bounded_score(scores.get("education_match_score"), 0.0),
        matching_skills=scores.get("matching_skills", ""),
        missing_skills=scores.get("missing_skills", ""),
        overall_assessment=scores.get("overall_assessment", ""),
        is_passed=analysis_score >= threshold,
        analysis_date=datetime.utcnow(),
        pipeline_version=PIPELINE_VERSION,
        prompt_version=PROMPT_VERSION,
        model_id=settings.openai_model if not fallback_used else None,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
        parsed_cv=parsed_cv,
    )
