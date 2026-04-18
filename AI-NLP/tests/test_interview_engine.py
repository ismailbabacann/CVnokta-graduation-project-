"""
Phase K — Interview Engine tests.

Tests the interview engine, session management, answer submission,
batch evaluation, and API endpoints without requiring OpenAI API calls.
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.interview import InterviewQA, InterviewSession, InterviewSummary
from app.models.job_posting import JobPostingInput


# ── Fixtures ───────────────────────────────────────────────────────

JOB_POSTING = JobPostingInput(
    job_title="Senior Python Developer",
    department="Engineering",
    required_skills="Python, FastAPI, PostgreSQL",
    required_qualifications="5+ years backend experience",
    responsibilities="Design scalable APIs, mentor junior developers",
)

MOCK_QUESTIONS = [
    "Tell me about your experience with Python web frameworks.",
    "How do you approach designing a scalable API?",
    "Describe a challenging technical problem you solved.",
    "What's your experience with PostgreSQL optimization?",
    "How do you handle code reviews and mentoring?",
    "Where do you see yourself in 3 years?",
]

MOCK_EVALUATION = {
    "average_confidence_score": 72.5,
    "job_match_score": 78.0,
    "experience_alignment_score": 80.0,
    "communication_score": 75.0,
    "technical_knowledge_score": 82.0,
    "overall_interview_score": 77.5,
    "summary_text": "Strong candidate with solid Python experience.",
    "strengths": "Technical depth, clear communication",
    "weaknesses": "Limited DevOps exposure",
    "recommendations": "Consider for senior role with mentoring support.",
}


def _make_engine_with_mock_llm():
    """Create an InterviewEngine with mocked LLM calls."""
    from app.core.interview_engine import InterviewEngine

    engine = InterviewEngine()

    async def mock_generate_text(system, user):
        # Return a different question each time
        idx = getattr(mock_generate_text, '_call_count', 0)
        mock_generate_text._call_count = idx + 1
        if idx < len(MOCK_QUESTIONS):
            return MOCK_QUESTIONS[idx]
        return f"Follow-up question #{idx + 1}"

    async def mock_generate_json(system, user, use_cache=True):
        return dict(MOCK_EVALUATION)

    return engine, mock_generate_text, mock_generate_json


# ── Session lifecycle tests ────────────────────────────────────────

class TestInterviewSessionLifecycle:

    @pytest.mark.asyncio
    async def test_start_session(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        engine, mock_text, mock_json = _make_engine_with_mock_llm()

        with patch("app.services.openai_service.OpenAIService") as MockService:
            instance = MockService.return_value
            instance.generate_text = AsyncMock(side_effect=mock_text)

            session = await engine.start_session(
                application_id=str(uuid4()),
                job_posting=JOB_POSTING,
                cv_summary="Experienced Python developer",
                question_count=3,
            )

        assert session.session_status == "in_progress"
        assert session.started_at is not None
        assert session.id is not None

        # Session stored
        entry = engine.get_session(str(session.id))
        assert entry is not None
        assert len(entry.questions) == 3

    @pytest.mark.asyncio
    async def test_full_interview_flow(self, monkeypatch):
        """Full flow: start → answer all → end."""
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        engine, mock_text, mock_json = _make_engine_with_mock_llm()

        with patch("app.services.openai_service.OpenAIService") as MockService:
            instance = MockService.return_value
            instance.generate_text = AsyncMock(side_effect=mock_text)
            instance.generate_json = AsyncMock(side_effect=mock_json)

            # Start
            session = await engine.start_session(
                application_id=str(uuid4()),
                job_posting=JOB_POSTING,
                question_count=3,
            )
            sid = str(session.id)

            # Answer all questions
            for i in range(3):
                q = engine.get_current_question(sid)
                assert q is not None
                assert q["question_index"] == i
                engine.submit_answer(sid, i, f"My answer to question {i+1}")

            # All answered — no more questions
            assert engine.get_current_question(sid) is None

            # End session
            summary = await engine.end_session(sid)

        assert summary.overall_interview_score == 77.5
        assert summary.total_questions_asked == 3
        assert summary.total_questions_answered == 3
        assert summary.is_passed is True  # 77.5 >= 60

    @pytest.mark.asyncio
    async def test_session_not_found(self):
        from app.core.interview_engine import InterviewEngine
        engine = InterviewEngine()

        assert engine.get_session("nonexistent") is None
        assert engine.get_current_question("nonexistent") is None

    @pytest.mark.asyncio
    async def test_session_ttl_expiry(self):
        from app.core.interview_engine import InterviewEngine, _SessionEntry
        engine = InterviewEngine()

        # Mock settings to have TTL of 0 (immediate expiry)
        engine._settings = MagicMock(interview_session_ttl_seconds=0)

        # Manually insert an expired session
        sid = str(uuid4())
        entry = _SessionEntry(
            session=InterviewSession(
                id=uuid4(),
                application_id=uuid4(),
                stage_id=uuid4(),
                cv_id=uuid4(),
                job_posting_id=uuid4(),
            ),
            job_posting=JOB_POSTING,
            cv_summary="",
            questions=["Q1"],
        )
        entry.created_at = time.monotonic() - 10  # expired
        engine._sessions[sid] = entry

        # Should be cleaned up
        assert engine.get_session(sid) is None


# ── Answer submission tests ────────────────────────────────────────

class TestAnswerSubmission:

    def _setup_engine_with_session(self):
        from app.core.interview_engine import InterviewEngine, _SessionEntry

        engine = InterviewEngine()
        sid = str(uuid4())
        entry = _SessionEntry(
            session=InterviewSession(
                id=uuid4(),
                application_id=uuid4(),
                stage_id=uuid4(),
                cv_id=uuid4(),
                job_posting_id=uuid4(),
            ),
            job_posting=JOB_POSTING,
            cv_summary="",
            questions=["Q1?", "Q2?", "Q3?"],
        )
        engine._sessions[sid] = entry
        return engine, sid

    def test_submit_answer_sequential(self):
        engine, sid = self._setup_engine_with_session()

        qa = engine.submit_answer(sid, 0, "Answer 1")
        assert qa.question_sequence == 1
        assert qa.question_text == "Q1?"
        assert qa.candidate_answer_text == "Answer 1"

        qa2 = engine.submit_answer(sid, 1, "Answer 2")
        assert qa2.question_sequence == 2

    def test_submit_wrong_index_raises(self):
        engine, sid = self._setup_engine_with_session()

        with pytest.raises(ValueError, match="Expected answer for question 0"):
            engine.submit_answer(sid, 1, "Wrong index")

    def test_submit_all_answered_raises(self):
        engine, sid = self._setup_engine_with_session()

        engine.submit_answer(sid, 0, "A1")
        engine.submit_answer(sid, 1, "A2")
        engine.submit_answer(sid, 2, "A3")

        with pytest.raises(ValueError, match="All questions already answered"):
            engine.submit_answer(sid, 3, "Extra")

    def test_submit_session_not_found(self):
        from app.core.interview_engine import InterviewEngine
        engine = InterviewEngine()

        with pytest.raises(ValueError, match="Session not found"):
            engine.submit_answer("nonexistent", 0, "answer")


# ── Batch evaluation tests ─────────────────────────────────────────

class TestBatchEvaluation:

    def test_fallback_evaluation(self):
        from app.core.interview_engine import InterviewEngine, _SessionEntry

        engine = InterviewEngine()
        entry = _SessionEntry(
            session=InterviewSession(
                id=uuid4(),
                application_id=uuid4(),
                stage_id=uuid4(),
                cv_id=uuid4(),
                job_posting_id=uuid4(),
            ),
            job_posting=JOB_POSTING,
            cv_summary="",
            questions=["Q1?", "Q2?", "Q3?"],
        )
        # 2 of 3 answered
        entry.qa_pairs = [
            InterviewQA(session_id=uuid4(), question_sequence=1, question_text="Q1?", candidate_answer_text="A1"),
            InterviewQA(session_id=uuid4(), question_sequence=2, question_text="Q2?", candidate_answer_text="A2"),
        ]

        result = engine._fallback_evaluation(entry)
        # 2/3 answered = 66.7% * 70 ≈ 46.7
        assert 40 <= result["overall_interview_score"] <= 50
        assert "Fallback" in result["summary_text"]

    def test_build_summary_from_raw(self):
        from app.core.interview_engine import InterviewEngine, _SessionEntry

        engine = InterviewEngine()
        entry = _SessionEntry(
            session=InterviewSession(
                id=uuid4(),
                application_id=uuid4(),
                stage_id=uuid4(),
                cv_id=uuid4(),
                job_posting_id=uuid4(),
            ),
            job_posting=JOB_POSTING,
            cv_summary="",
            questions=["Q1?"],
        )
        entry.qa_pairs = [
            InterviewQA(session_id=uuid4(), question_sequence=1, question_text="Q1?", candidate_answer_text="A1"),
        ]

        summary = engine._build_summary(entry, MOCK_EVALUATION)
        assert summary.overall_interview_score == 77.5
        assert summary.communication_score == 75.0
        assert summary.is_passed is True
        assert summary.total_questions_asked == 1
        assert summary.total_questions_answered == 1

    def test_build_summary_clamps_scores(self):
        from app.core.interview_engine import InterviewEngine, _SessionEntry

        engine = InterviewEngine()
        entry = _SessionEntry(
            session=InterviewSession(
                id=uuid4(),
                application_id=uuid4(),
                stage_id=uuid4(),
                cv_id=uuid4(),
                job_posting_id=uuid4(),
            ),
            job_posting=JOB_POSTING,
            cv_summary="",
            questions=["Q1?"],
        )
        entry.qa_pairs = []

        # Out-of-range scores
        raw = {"overall_interview_score": 150, "communication_score": -20}
        summary = engine._build_summary(entry, raw)
        assert summary.overall_interview_score == 100.0
        assert summary.communication_score == 0.0


# ── API endpoint tests ─────────────────────────────────────────────

class TestInterviewAPI:

    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        from app.api.deps import get_interview_engine
        from app.core.interview_engine import InterviewEngine

        engine = InterviewEngine()
        app.dependency_overrides[get_interview_engine] = lambda: engine
        yield TestClient(app)
        app.dependency_overrides.clear()

    def test_start_returns_200_with_mock(self, client):
        """Test /interview/start with mocked LLM."""
        mock_text = AsyncMock(return_value="What is your experience with Python?")

        with patch("app.services.openai_service.OpenAIService") as MockService:
            MockService.return_value.generate_text = mock_text

            resp = client.post("/api/v1/interview/start", json={
                "application_id": str(uuid4()),
                "job_posting": {
                    "job_title": "Developer",
                    "required_skills": "Python",
                },
                "question_count": 3,
            })

        assert resp.status_code == 200
        data = resp.json()
        assert "session" in data
        assert "first_question" in data
        assert data["session"]["session_status"] == "in_progress"

    def test_session_status_404(self, client):
        resp = client.get("/api/v1/interview/nonexistent/status")
        assert resp.status_code == 404

    def test_end_session_404(self, client):
        resp = client.post("/api/v1/interview/nonexistent/end")
        assert resp.status_code == 404

    def test_submit_answer_404(self, client):
        resp = client.post("/api/v1/interview/nonexistent/answer", json={
            "question_index": 0,
            "answer_text": "My answer",
        })
        assert resp.status_code == 400  # ValueError → 400

    def test_full_api_flow(self, client):
        """Start → answer all → end via API."""
        mock_text = AsyncMock(return_value="Tell me about yourself")
        mock_json = AsyncMock(return_value=dict(MOCK_EVALUATION))

        with patch("app.services.openai_service.OpenAIService") as MockService:
            MockService.return_value.generate_text = mock_text
            MockService.return_value.generate_json = mock_json

            # Start
            resp = client.post("/api/v1/interview/start", json={
                "application_id": str(uuid4()),
                "job_posting": {"job_title": "Dev", "required_skills": "Python"},
                "question_count": 3,
            })
            assert resp.status_code == 200
            session_id = resp.json()["session"]["id"]

            # Answer question 0 
            resp = client.post(f"/api/v1/interview/{session_id}/answer", json={
                "question_index": 0,
                "answer_text": "I have 5 years of Python experience",
            })
            assert resp.status_code == 200
            assert resp.json()["is_complete"] is False

            # Answer question 1
            resp = client.post(f"/api/v1/interview/{session_id}/answer", json={
                "question_index": 1,
                "answer_text": "I love building scalable systems",
            })
            assert resp.status_code == 200
            assert resp.json()["is_complete"] is False

            # Answer question 2
            resp = client.post(f"/api/v1/interview/{session_id}/answer", json={
                "question_index": 2,
                "answer_text": "I mentor junior developers regularly",
            })
            assert resp.status_code == 200
            assert resp.json()["is_complete"] is True

            # End
            resp = client.post(f"/api/v1/interview/{session_id}/end")
            assert resp.status_code == 200
            summary = resp.json()
            assert summary["overall_interview_score"] == 77.5
            assert summary["is_passed"] is True


# ── Speech service tests (mocked) ──────────────────────────────────

class TestSpeechService:

    @pytest.mark.asyncio
    async def test_tts_requires_api_key(self):
        from app.services.speech_service import SpeechService

        svc = SpeechService()
        # Patch settings to have empty API key
        svc._settings = MagicMock(openai_api_key="")

        with pytest.raises(RuntimeError, match="API key required"):
            await svc.text_to_speech("Hello")

    @pytest.mark.asyncio
    async def test_stt_requires_api_key(self):
        from app.services.speech_service import SpeechService

        svc = SpeechService()
        svc._settings = MagicMock(openai_api_key="")

        with pytest.raises(RuntimeError, match="API key required"):
            await svc.speech_to_text(b"fake audio")

    @pytest.mark.asyncio
    async def test_tts_calls_openai(self):
        from app.services.speech_service import SpeechService

        svc = SpeechService()
        svc._settings = MagicMock(
            openai_api_key="test-key",
            interview_tts_model="tts-1",
            interview_tts_voice="nova",
        )

        mock_response = MagicMock()
        mock_response.content = b"fake-mp3-bytes"

        mock_client = MagicMock()
        mock_client.audio.speech.create.return_value = mock_response
        svc._get_client = MagicMock(return_value=mock_client)

        result = await svc.text_to_speech("Hello world")
        assert result == b"fake-mp3-bytes"
        mock_client.audio.speech.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_stt_calls_whisper(self):
        from app.services.speech_service import SpeechService

        svc = SpeechService()
        svc._settings = MagicMock(
            openai_api_key="test-key",
            interview_stt_model="whisper-1",
        )

        mock_transcript = MagicMock()
        mock_transcript.text = "  transcribed text  "

        mock_client = MagicMock()
        mock_client.audio.transcriptions.create.return_value = mock_transcript
        svc._get_client = MagicMock(return_value=mock_client)

        result = await svc.speech_to_text(b"fake audio bytes")
        assert result == "transcribed text"
        mock_client.audio.transcriptions.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_tts_base64(self):
        import base64
        from app.services.speech_service import SpeechService

        svc = SpeechService()
        svc._settings = MagicMock(
            openai_api_key="test-key",
            interview_tts_model="tts-1",
            interview_tts_voice="nova",
        )

        mock_response = MagicMock()
        mock_response.content = b"mp3data"
        mock_client = MagicMock()
        mock_client.audio.speech.create.return_value = mock_response
        svc._get_client = MagicMock(return_value=mock_client)

        result = await svc.text_to_speech_base64("Test")
        assert result == base64.b64encode(b"mp3data").decode("utf-8")
