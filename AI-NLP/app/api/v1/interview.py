"""
Interview API endpoints — AI Video Interview.

POST   /api/v1/interview/start       — Start a new AI interview session
GET    /api/v1/interview/{id}/question — Get current question (+ optional TTS)
POST   /api/v1/interview/{id}/answer  — Submit answer text
POST   /api/v1/interview/{id}/answer-audio — Submit answer as audio (STT)
POST   /api/v1/interview/{id}/end     — End session & get evaluation
GET    /api/v1/interview/{id}/status  — Check session status
"""

from __future__ import annotations

import base64
import json
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from app.api.deps import get_interview_engine
from app.config import get_settings
from app.core.interview_engine import InterviewEngine
from app.models.interview import InterviewQA, InterviewSession, InterviewSummary
from app.models.job_posting import JobPostingInput

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["Interview"])


# ── Request / Response schemas ─────────────────────────────────────

class StartInterviewRequest(BaseModel):
    application_id: str = Field(..., description="Guid of JobApplication")
    job_posting: JobPostingInput = Field(..., description="Job posting for question generation")
    cv_summary: str = Field("", description="Brief summary of candidate's CV for context")
    candidate_name: str = Field("Candidate", description="Display name")
    question_count: Optional[int] = Field(
        None, ge=3, le=12,
        description="Number of questions (default: server config, typically 6)",
    )


class StartInterviewResponse(BaseModel):
    session: InterviewSession
    first_question: dict


class AnswerRequest(BaseModel):
    question_index: int = Field(..., ge=0, description="0-based question index")
    answer_text: str = Field(..., min_length=1, description="Candidate's answer")


class AnswerResponse(BaseModel):
    qa: InterviewQA
    next_question: Optional[dict] = None
    is_complete: bool = False


class QuestionResponse(BaseModel):
    question_index: int
    question_text: str
    total_questions: int
    remaining: int
    audio_base64: Optional[str] = Field(None, description="Base64 mp3 audio (if TTS enabled)")


# ── Endpoints ──────────────────────────────────────────────────────


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    req: StartInterviewRequest,
    engine: InterviewEngine = Depends(get_interview_engine),
):
    """
    Start a new AI interview session.

    Generates all questions upfront (via GPT) based on the job posting.
    Returns the session object and the first question.
    """
    try:
        session = await engine.start_session(
            application_id=req.application_id,
            job_posting=req.job_posting,
            cv_summary=req.cv_summary,
            candidate_name=req.candidate_name,
            question_count=req.question_count,
        )
    except Exception as exc:
        logger.error("Failed to start interview session: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"Failed to start interview session: {exc}",
        )

    session_id = str(session.id)
    first_q = engine.get_current_question(session_id)
    if not first_q:
        raise HTTPException(status_code=500, detail="No questions generated")

    return StartInterviewResponse(session=session, first_question=first_q)


@router.get("/{session_id}/question", response_model=QuestionResponse)
async def get_question(
    session_id: str,
    tts: bool = False,
    engine: InterviewEngine = Depends(get_interview_engine),
):
    """
    Get the current (next unanswered) question.

    Set `tts=true` to include base64-encoded mp3 audio.
    """
    q = engine.get_current_question(session_id)
    if q is None:
        entry = engine.get_session(session_id)
        if entry is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")
        raise HTTPException(status_code=410, detail="All questions already answered. Call /end.")

    audio_b64 = None
    if tts:
        settings = get_settings()
        if settings.openai_api_key:
            try:
                from app.services.speech_service import SpeechService
                svc = SpeechService()
                audio_b64 = await svc.text_to_speech_base64(q["question_text"])
            except Exception as exc:
                logger.warning("TTS failed, returning text only: %s", exc)

    return QuestionResponse(
        question_index=q["question_index"],
        question_text=q["question_text"],
        total_questions=q["total_questions"],
        remaining=q["remaining"],
        audio_base64=audio_b64,
    )


@router.post("/{session_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    session_id: str,
    req: AnswerRequest,
    engine: InterviewEngine = Depends(get_interview_engine),
):
    """
    Submit a text answer for the current question.

    Returns the Q&A entry and the next question (if any).
    """
    try:
        qa = engine.submit_answer(session_id, req.question_index, req.answer_text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    next_q = engine.get_current_question(session_id)
    return AnswerResponse(
        qa=qa,
        next_question=next_q,
        is_complete=next_q is None,
    )


@router.post("/{session_id}/answer-audio", response_model=AnswerResponse)
async def submit_answer_audio(
    session_id: str,
    question_index: int,
    audio: UploadFile = File(..., description="Audio file (webm, mp3, wav)"),
    engine: InterviewEngine = Depends(get_interview_engine),
):
    """
    Submit an audio answer — transcribed via Whisper STT, then recorded.

    Supported formats: webm, mp3, wav, m4a.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key required for audio transcription")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Transcribe
    try:
        from app.services.speech_service import SpeechService
        svc = SpeechService()
        text = await svc.speech_to_text(audio_bytes, audio.filename or "audio.webm")
    except Exception as exc:
        logger.error("STT transcription failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"Audio transcription failed: {exc}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not transcribe any speech from audio")

    # Submit transcribed text
    try:
        qa = engine.submit_answer(session_id, question_index, text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    next_q = engine.get_current_question(session_id)
    return AnswerResponse(
        qa=qa,
        next_question=next_q,
        is_complete=next_q is None,
    )


@router.post("/{session_id}/end", response_model=InterviewSummary)
async def end_interview(
    session_id: str,
    engine: InterviewEngine = Depends(get_interview_engine),
):
    """
    End the interview session and get batch evaluation.

    All Q&A pairs are scored via GPT rubric. Returns comprehensive
    InterviewSummary with dimension scores (communication, technical,
    job match, etc.) and overall score.
    """
    try:
        summary = await engine.end_session(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Interview evaluation failed: %s", exc)
        raise HTTPException(status_code=503, detail=f"Interview evaluation failed: {exc}")

    return summary


@router.get("/{session_id}/status")
async def get_session_status(
    session_id: str,
    engine: InterviewEngine = Depends(get_interview_engine),
):
    """Check the status of an interview session."""
    entry = engine.get_session(session_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    answered = len(entry.qa_pairs)
    total = len(entry.questions)

    return {
        "session_id": session_id,
        "status": entry.session.session_status,
        "total_questions": total,
        "answered": answered,
        "remaining": total - answered,
        "started_at": entry.session.started_at,
    }


# ── Helper endpoints for Interview Room UI ─────────────────────────


@router.get("/setup/job-postings")
async def get_job_postings():
    """Return available job postings for interview setup."""
    mock_dir = get_settings().mock_data_dir
    path = mock_dir / "sample_job_postings.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


@router.post("/setup/parse-cv")
async def parse_cv_for_interview(
    file: UploadFile = File(..., description="CV in PDF format"),
):
    """
    Upload and parse a CV PDF, return a structured summary for interview context.

    The summary includes name, skills, experience, and education extracted from the CV.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        from app.core.cv_parser import parse_cv_from_pdf
        parsed = parse_cv_from_pdf(tmp_path)
    except Exception as exc:
        logger.error("CV parse failed: %s", exc)
        raise HTTPException(status_code=422, detail=f"CV parse failed: {exc}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    # Build summary text
    parts = []
    if parsed.full_name:
        parts.append(f"Name: {parsed.full_name}")
    if parsed.summary:
        parts.append(f"Summary: {parsed.summary}")
    if parsed.skills:
        parts.append(f"Skills: {', '.join(parsed.skills[:20])}")
    if parsed.experience:
        exp_items = []
        for exp in parsed.experience[:5]:
            title = exp.title or ""
            company = exp.company or ""
            duration = f" ({exp.duration_months} months)" if exp.duration_months else ""
            if title or company:
                exp_items.append(f"{title} at {company}{duration}".strip())
        if exp_items:
            parts.append(f"Experience: {'; '.join(exp_items)}")
    if parsed.education:
        edu_items = []
        for edu in parsed.education[:3]:
            degree = edu.degree or ""
            institution = edu.institution or ""
            if degree or institution:
                edu_items.append(f"{degree} - {institution}".strip(" -"))
        if edu_items:
            parts.append(f"Education: {'; '.join(edu_items)}")
    if parsed.languages:
        parts.append(f"Languages: {', '.join(parsed.languages)}")

    summary_text = "\n".join(parts) if parts else "CV uploaded — no structured data extracted"

    return {
        "full_name": parsed.full_name or "",
        "summary_text": summary_text,
        "skills": parsed.skills,
        "experience_count": len(parsed.experience),
        "education_count": len(parsed.education),
        "total_experience_years": parsed.total_experience_years,
    }
