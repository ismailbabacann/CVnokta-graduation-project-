"""
Interview Engine — AI-powered video interview system.

Turn-based flow:
  1. Start session → generate all questions upfront (GPT)
  2. For each question: deliver TTS audio → receive STT answer
  3. End session → batch rubric scoring of all Q&A pairs (GPT)
  4. Return InterviewSummary with scores

State is held in-process with TTL-based expiry.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from app.config import get_settings
from app.core.prompts.interview import (
    INTERVIEW_EVALUATION_TEMPLATE,
    INTERVIEW_FIRST_QUESTION_TEMPLATE,
    INTERVIEW_FOLLOWUP_TEMPLATE,
    INTERVIEW_SYSTEM_PROMPT,
)
from app.models.interview import (
    InterviewQA,
    InterviewSession,
    InterviewSummary,
)
from app.models.job_posting import JobPostingInput

logger = logging.getLogger(__name__)

INTERVIEW_ENGINE_VERSION = "1.0.0"


# ── In-process session store with TTL ──────────────────────────────

class _SessionEntry:
    __slots__ = ("session", "job_posting", "cv_summary", "questions", "qa_pairs", "created_at")

    def __init__(
        self,
        session: InterviewSession,
        job_posting: JobPostingInput,
        cv_summary: str,
        questions: List[str],
    ) -> None:
        self.session = session
        self.job_posting = job_posting
        self.cv_summary = cv_summary
        self.questions = questions
        self.qa_pairs: List[InterviewQA] = []
        self.created_at = time.monotonic()


class InterviewEngine:
    """
    AI-powered interview engine.

    Generates questions per job posting via GPT, stores session state
    in-process, and batch-scores all Q&A pairs at session end.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._sessions: Dict[str, _SessionEntry] = {}

    def _cleanup_expired(self) -> None:
        """Remove sessions older than TTL."""
        ttl = self._settings.interview_session_ttl_seconds
        now = time.monotonic()
        expired = [
            sid for sid, entry in self._sessions.items()
            if now - entry.created_at > ttl
        ]
        for sid in expired:
            del self._sessions[sid]
            logger.info("Expired interview session: %s", sid)

    def get_session(self, session_id: str) -> Optional[_SessionEntry]:
        """Get a session entry, returning None if expired or missing."""
        self._cleanup_expired()
        return self._sessions.get(session_id)

    # ── Start session ──────────────────────────────────────────────

    async def start_session(
        self,
        application_id: str,
        job_posting: JobPostingInput,
        cv_summary: str = "",
        candidate_name: str = "Candidate",
        question_count: Optional[int] = None,
    ) -> InterviewSession:
        """
        Create a new interview session and generate all questions upfront.

        Returns the InterviewSession with status 'in_progress'.
        """
        if question_count is None:
            question_count = self._settings.interview_question_count

        self._cleanup_expired()

        session_id = uuid4()
        now = datetime.utcnow()

        # Generate questions via LLM
        questions = await self._generate_questions(
            job_posting, cv_summary, question_count
        )

        session = InterviewSession(
            id=session_id,
            application_id=UUID(application_id) if isinstance(application_id, str) else application_id,
            stage_id=uuid4(),
            cv_id=uuid4(),
            job_posting_id=job_posting.id or uuid4(),
            session_status="in_progress",
            started_at=now,
            ai_agent_version=INTERVIEW_ENGINE_VERSION,
        )

        entry = _SessionEntry(
            session=session,
            job_posting=job_posting,
            cv_summary=cv_summary,
            questions=questions,
        )
        self._sessions[str(session_id)] = entry

        logger.info(
            "Interview session started: %s (%d questions for '%s')",
            session_id, len(questions), job_posting.job_title,
        )

        return session

    # ── Get next question ──────────────────────────────────────────

    def get_current_question(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current (next unanswered) question for the session.

        Returns dict with question_index, question_text, total_questions
        or None if all questions have been answered.
        """
        entry = self.get_session(session_id)
        if entry is None:
            return None

        answered = len(entry.qa_pairs)
        if answered >= len(entry.questions):
            return None

        return {
            "question_index": answered,
            "question_text": entry.questions[answered],
            "total_questions": len(entry.questions),
            "remaining": len(entry.questions) - answered,
        }

    # ── Submit answer ──────────────────────────────────────────────

    def submit_answer(
        self,
        session_id: str,
        question_index: int,
        answer_text: str,
    ) -> InterviewQA:
        """
        Record a candidate's answer for the given question.

        Returns the InterviewQA entry (without evaluation — that's batch at end).
        """
        entry = self.get_session(session_id)
        if entry is None:
            raise ValueError(f"Session not found or expired: {session_id}")

        if question_index != len(entry.qa_pairs):
            raise ValueError(
                f"Expected answer for question {len(entry.qa_pairs)}, "
                f"got {question_index}"
            )

        if question_index >= len(entry.questions):
            raise ValueError("All questions already answered")

        qa = InterviewQA(
            session_id=UUID(session_id),
            question_sequence=question_index + 1,
            question_text=entry.questions[question_index],
            candidate_answer_text=answer_text,
            asked_at=datetime.utcnow(),
            answered_at=datetime.utcnow(),
        )
        entry.qa_pairs.append(qa)

        logger.info(
            "Answer submitted: session=%s question=%d/%d",
            session_id, question_index + 1, len(entry.questions),
        )

        return qa

    # ── End session & batch score ──────────────────────────────────

    async def end_session(self, session_id: str) -> InterviewSummary:
        """
        End the interview session and perform batch evaluation.

        All Q&A pairs are sent to GPT for rubric-based scoring.
        Returns InterviewSummary with all score dimensions.
        """
        entry = self.get_session(session_id)
        if entry is None:
            raise ValueError(f"Session not found or expired: {session_id}")

        now = datetime.utcnow()
        entry.session.session_status = "completed"
        entry.session.completed_at = now
        if entry.session.started_at:
            entry.session.duration_seconds = int(
                (now - entry.session.started_at).total_seconds()
            )

        # Batch evaluate via LLM
        summary = await self._batch_evaluate(entry)

        # Cleanup session
        del self._sessions[session_id]

        logger.info(
            "Interview session completed: %s score=%.1f",
            session_id,
            summary.overall_interview_score or 0,
        )

        return summary

    # ── Internal: Question generation ──────────────────────────────

    async def _generate_questions(
        self,
        job_posting: JobPostingInput,
        cv_summary: str,
        count: int,
    ) -> List[str]:
        """Generate interview questions via GPT."""
        from app.services.openai_service import OpenAIService

        service = OpenAIService()
        questions: List[str] = []

        # First question
        first_prompt = INTERVIEW_FIRST_QUESTION_TEMPLATE.format(
            job_title=job_posting.job_title,
            responsibilities=job_posting.responsibilities or "N/A",
            required_skills=job_posting.required_skills or "N/A",
            cv_summary=cv_summary or "No CV summary available",
        )
        q1 = await service.generate_text(INTERVIEW_SYSTEM_PROMPT, first_prompt)
        questions.append(q1.strip())

        # Follow-up questions
        for i in range(1, count):
            covered = ", ".join(
                [f"Q{j+1}" for j in range(len(questions))]
            )
            prev_qa = "\n".join(
                [f"Q{j+1}: {q}" for j, q in enumerate(questions)]
            )
            followup_prompt = INTERVIEW_FOLLOWUP_TEMPLATE.format(
                job_title=job_posting.job_title,
                question_number=i + 1,
                covered_topics=covered,
                previous_qa=prev_qa,
                last_answer="(Questions are being pre-generated; no answer yet)",
            )
            q = await service.generate_text(INTERVIEW_SYSTEM_PROMPT, followup_prompt)
            questions.append(q.strip())

        logger.info("Generated %d interview questions for '%s'", len(questions), job_posting.job_title)
        return questions

    # ── Internal: Batch evaluation ─────────────────────────────────

    async def _batch_evaluate(self, entry: _SessionEntry) -> InterviewSummary:
        """Batch-score all Q&A pairs via GPT rubric."""
        from app.services.openai_service import OpenAIService

        # Build transcript
        transcript_parts: List[str] = []
        for qa in entry.qa_pairs:
            transcript_parts.append(
                f"Q{qa.question_sequence}: {qa.question_text}\n"
                f"A{qa.question_sequence}: {qa.candidate_answer_text or '(no answer)'}"
            )
        transcript = "\n\n".join(transcript_parts)

        job_requirements = (
            f"Title: {entry.job_posting.job_title}\n"
            f"Skills: {entry.job_posting.required_skills or 'N/A'}\n"
            f"Qualifications: {entry.job_posting.required_qualifications or 'N/A'}\n"
            f"Responsibilities: {entry.job_posting.responsibilities or 'N/A'}"
        )

        eval_prompt = INTERVIEW_EVALUATION_TEMPLATE.format(
            job_requirements=job_requirements,
            transcript=transcript,
        )

        try:
            service = OpenAIService()
            raw = await service.generate_json(
                INTERVIEW_SYSTEM_PROMPT, eval_prompt, use_cache=False
            )
        except Exception as exc:
            logger.error("Interview evaluation LLM call failed: %s", exc)
            raw = self._fallback_evaluation(entry)

        return self._build_summary(entry, raw)

    def _fallback_evaluation(self, entry: _SessionEntry) -> Dict[str, Any]:
        """Deterministic fallback if LLM evaluation fails."""
        answered = len([qa for qa in entry.qa_pairs if qa.candidate_answer_text])
        total = len(entry.questions)
        answer_ratio = answered / max(1, total)

        base_score = round(answer_ratio * 70, 1)

        return {
            "average_confidence_score": base_score,
            "job_match_score": base_score,
            "experience_alignment_score": base_score,
            "communication_score": base_score,
            "technical_knowledge_score": base_score,
            "overall_interview_score": base_score,
            "summary_text": (
                f"Fallback evaluation: candidate answered {answered}/{total} questions. "
                f"LLM evaluation was unavailable."
            ),
            "strengths": "Completed interview session",
            "weaknesses": "Unable to perform AI evaluation",
            "recommendations": "Manual review recommended",
        }

    def _build_summary(
        self, entry: _SessionEntry, raw: Dict[str, Any]
    ) -> InterviewSummary:
        """Build InterviewSummary from LLM evaluation output."""

        def _score(key: str) -> Optional[float]:
            v = raw.get(key)
            if v is None:
                return None
            try:
                return max(0.0, min(100.0, round(float(v), 1)))
            except (TypeError, ValueError):
                return None

        answered = len([qa for qa in entry.qa_pairs if qa.candidate_answer_text])
        overall = _score("overall_interview_score")

        return InterviewSummary(
            session_id=entry.session.id or uuid4(),
            application_id=entry.session.application_id,
            total_questions_asked=len(entry.questions),
            total_questions_answered=answered,
            average_confidence_score=_score("average_confidence_score"),
            job_match_score=_score("job_match_score"),
            experience_alignment_score=_score("experience_alignment_score"),
            communication_score=_score("communication_score"),
            technical_knowledge_score=_score("technical_knowledge_score"),
            overall_interview_score=overall,
            summary_text=str(raw.get("summary_text") or ""),
            strengths=str(raw.get("strengths") or ""),
            weaknesses=str(raw.get("weaknesses") or ""),
            recommendations=str(raw.get("recommendations") or ""),
            is_passed=overall >= 60.0 if overall is not None else None,
        )
