"""
Realtime Interview Engine tests.

Tests session lifecycle, state machine, transcript accumulation,
Q&A extraction, evaluation bridge, config validation, server-enforced
limits, WebSocket endpoint, and concurrency/race conditions.

No real OpenAI API calls — all external interactions are mocked.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.realtime_engine import (
    MAX_AUDIO_CHUNK_SIZE,
    RealtimeInterviewEngine,
    _RealtimeSessionEntry,
    _VALID_TRANSITIONS,
)
from app.models.interview import (
    InterviewQA,
    InterviewSummary,
    RealtimeSession,
    RealtimeSessionStatus,
)


# ── Fixtures ──────────────────────────────────────────────────────

JOB_POSTING = {
    "job_title": "Senior Python Developer",
    "department": "Engineering",
    "required_skills": "Python, FastAPI, PostgreSQL",
    "required_qualifications": "5+ years backend experience",
    "responsibilities": "Design scalable APIs, mentor junior developers",
}

MOCK_EVALUATION = {
    "average_confidence_score": 72.5,
    "job_match_score": 78.0,
    "experience_alignment_score": 80.0,
    "communication_score": 75.0,
    "technical_knowledge_score": 82.0,
    "overall_interview_score": 77.5,
    "summary_text": "Strong candidate with solid Python experience.",
    "strengths": "Technical depth, clear communication",
    "weaknesses": "Limited cloud experience",
    "recommendations": "Consider AWS certification",
}


def _make_engine() -> RealtimeInterviewEngine:
    """Create a fresh engine instance."""
    return RealtimeInterviewEngine()


def _create_test_session(
    engine: RealtimeInterviewEngine,
    session_id: str = None,
) -> str:
    """Create a test session and return session_id."""
    sid = session_id or str(uuid4())
    engine.create_session(
        session_id=sid,
        application_id=str(uuid4()),
        job_posting=JOB_POSTING,
        cv_summary="Experienced Python developer with 6 years backend experience.",
        candidate_name="Test Candidate",
    )
    return sid


# ── Session Lifecycle Tests ───────────────────────────────────────


class TestSessionLifecycle:
    """Test session creation, retrieval, and state transitions."""

    def test_create_session(self):
        engine = _make_engine()
        sid = str(uuid4())
        session = engine.create_session(
            session_id=sid,
            application_id=str(uuid4()),
            job_posting=JOB_POSTING,
            cv_summary="Test CV",
            candidate_name="Alice",
        )
        assert session.session_id == sid
        assert session.status == RealtimeSessionStatus.CONNECTING
        assert session.candidate_name == "Alice"

    def test_get_session(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        session = engine.get_session(sid)
        assert session is not None
        assert session.session_id == sid

    def test_get_nonexistent_session(self):
        engine = _make_engine()
        assert engine.get_session("nonexistent") is None

    def test_duplicate_session_id_raises(self):
        engine = _make_engine()
        sid = str(uuid4())
        _create_test_session(engine, sid)
        with pytest.raises(ValueError, match="Duplicate session_id"):
            _create_test_session(engine, sid)

    def test_remove_session(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine.remove_session(sid)
        assert engine.get_session(sid) is None

    def test_remove_nonexistent_session_no_error(self):
        engine = _make_engine()
        engine.remove_session("nonexistent")  # should not raise


# ── State Machine Tests ───────────────────────────────────────────


class TestStateMachine:
    """Test valid and invalid state transitions."""

    def test_valid_transition_connecting_to_active(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        assert engine.get_session(sid).status == RealtimeSessionStatus.ACTIVE

    def test_valid_transition_connecting_to_failed(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.FAILED)
        assert engine.get_session(sid).status == RealtimeSessionStatus.FAILED

    def test_valid_transition_active_to_ending(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        assert engine.get_session(sid).status == RealtimeSessionStatus.ENDING

    def test_valid_transition_active_to_interrupted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.INTERRUPTED)
        assert engine.get_session(sid).status == RealtimeSessionStatus.INTERRUPTED

    def test_invalid_transition_completed_to_active(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._transition(sid, RealtimeSessionStatus.COMPLETED)
        with pytest.raises(ValueError, match="Invalid transition"):
            engine._transition(sid, RealtimeSessionStatus.ACTIVE)

    def test_invalid_transition_connecting_to_ending(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        with pytest.raises(ValueError, match="Invalid transition"):
            engine._transition(sid, RealtimeSessionStatus.ENDING)

    def test_transition_nonexistent_session_raises(self):
        engine = _make_engine()
        with pytest.raises(ValueError, match="Session not found"):
            engine._transition("nonexistent", RealtimeSessionStatus.ACTIVE)

    def test_all_terminal_states_have_no_transitions(self):
        for status in [RealtimeSessionStatus.COMPLETED, RealtimeSessionStatus.FAILED]:
            assert _VALID_TRANSITIONS[status] == set()


# ── Transcript Accumulation Tests ─────────────────────────────────


class TestTranscriptAccumulation:
    """Test transcript recording and ordering."""

    def test_add_transcript_entries(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        engine._add_transcript(entry, "assistant", "Hello, welcome!")
        engine._add_transcript(entry, "user", "Thank you!")
        engine._add_transcript(entry, "assistant", "Tell me about your experience.")

        assert len(entry.session.transcript) == 3
        assert entry.session.transcript[0]["role"] == "assistant"
        assert entry.session.transcript[1]["role"] == "user"
        assert entry.session.transcript[2]["role"] == "assistant"

    def test_transcript_respects_max_limit(self, monkeypatch):
        monkeypatch.setenv("REALTIME_MAX_TRANSCRIPT_ENTRIES", "3")
        engine = _make_engine()
        # Override the settings value directly
        engine._settings.realtime_max_transcript_entries = 3
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        for i in range(5):
            engine._add_transcript(entry, "user", f"Message {i}")

        assert len(entry.session.transcript) == 3

    def test_transcript_entries_have_timestamps(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        engine._add_transcript(entry, "user", "Hello")
        assert "timestamp" in entry.session.transcript[0]


# ── Q&A Extraction Tests ─────────────────────────────────────────


class TestQAExtraction:
    """Test Q&A pair extraction from transcript."""

    def test_extraction_with_logged_questions(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        # Simulate logged questions
        ts1 = "2026-03-31T10:00:00"
        ts2 = "2026-03-31T10:02:00"
        entry.session.questions_asked = [
            {"text": "Tell me about yourself", "category": "introduction", "timestamp": ts1, "sequence": 1},
            {"text": "What is your experience with Python?", "category": "technical", "timestamp": ts2, "sequence": 2},
        ]

        # Simulate transcript
        entry.session.transcript = [
            {"role": "assistant", "text": "Tell me about yourself", "timestamp": ts1},
            {"role": "user", "text": "I am a developer with 6 years experience.", "timestamp": "2026-03-31T10:01:00"},
            {"role": "assistant", "text": "What is your experience with Python?", "timestamp": ts2},
            {"role": "user", "text": "I've been using Python for 5 years.", "timestamp": "2026-03-31T10:03:00"},
        ]

        qa_pairs = engine._build_qa_from_transcript(entry)
        assert len(qa_pairs) == 2
        assert qa_pairs[0].question_text == "Tell me about yourself"
        assert "developer" in qa_pairs[0].candidate_answer_text
        assert qa_pairs[1].question_text == "What is your experience with Python?"

    def test_fallback_extraction_no_logged_questions(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        # No logged questions — only transcript
        entry.session.questions_asked = []
        entry.session.transcript = [
            {"role": "assistant", "text": "Welcome! Tell me about yourself.", "timestamp": "2026-03-31T10:00:00"},
            {"role": "user", "text": "I'm a backend developer.", "timestamp": "2026-03-31T10:01:00"},
            {"role": "assistant", "text": "What do you know about FastAPI?", "timestamp": "2026-03-31T10:02:00"},
            {"role": "user", "text": "I've built several services with it.", "timestamp": "2026-03-31T10:03:00"},
        ]

        qa_pairs = engine._build_qa_from_transcript(entry)
        assert len(qa_pairs) == 2
        assert qa_pairs[0].question_text == "Welcome! Tell me about yourself."
        assert qa_pairs[1].candidate_answer_text == "I've built several services with it."

    def test_extraction_empty_transcript(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]
        entry.session.transcript = []

        qa_pairs = engine._build_qa_from_transcript(entry)
        assert qa_pairs == []

    def test_fallback_extraction_unanswered_question(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        entry.session.questions_asked = []
        entry.session.transcript = [
            {"role": "assistant", "text": "Tell me about yourself.", "timestamp": "2026-03-31T10:00:00"},
            # No user response
        ]

        qa_pairs = engine._build_qa_from_transcript(entry)
        assert len(qa_pairs) == 1
        assert qa_pairs[0].candidate_answer_text is None

    def test_barge_in_merged_answers(self):
        """When user speaks in multiple consecutive turns, they should be merged."""
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        entry.session.questions_asked = []
        entry.session.transcript = [
            {"role": "assistant", "text": "Tell me about your experience.", "timestamp": "2026-03-31T10:00:00"},
            {"role": "user", "text": "I have worked", "timestamp": "2026-03-31T10:01:00"},
            {"role": "user", "text": "for 5 years in Python.", "timestamp": "2026-03-31T10:01:05"},
            {"role": "assistant", "text": "What about databases?", "timestamp": "2026-03-31T10:02:00"},
        ]

        qa_pairs = engine._build_qa_from_transcript(entry)
        assert len(qa_pairs) == 2
        assert "I have worked for 5 years in Python." == qa_pairs[0].candidate_answer_text


# ── Evaluation Bridge Tests ───────────────────────────────────────


class TestEvaluationBridge:
    """Test transcript to evaluation summary pipeline."""

    def test_build_summary_from_raw(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        qa_pairs = [
            InterviewQA(
                session_id=uuid4(),
                question_sequence=1,
                question_text="Q1",
                candidate_answer_text="A1",
            ),
        ]

        summary = engine._build_summary(entry, qa_pairs, MOCK_EVALUATION)
        assert summary.overall_interview_score == 77.5
        assert summary.is_passed is True
        assert summary.total_questions_asked == 1
        assert summary.total_questions_answered == 1

    def test_build_summary_clamps_scores(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        entry = engine._sessions[sid]

        raw = {**MOCK_EVALUATION, "overall_interview_score": 150, "communication_score": -10}
        summary = engine._build_summary(entry, [], raw)
        assert summary.overall_interview_score == 100.0
        assert summary.communication_score == 0.0

    def test_fallback_evaluation(self):
        engine = _make_engine()

        qa_pairs = [
            InterviewQA(session_id=uuid4(), question_sequence=1, question_text="Q1", candidate_answer_text="A1"),
            InterviewQA(session_id=uuid4(), question_sequence=2, question_text="Q2", candidate_answer_text=None),
            InterviewQA(session_id=uuid4(), question_sequence=3, question_text="Q3", candidate_answer_text="A3"),
        ]

        raw = engine._fallback_evaluation(qa_pairs)
        # 2/3 answered = 66.7% * 70 = 46.7
        expected = round(2 / 3 * 70, 1)
        assert raw["overall_interview_score"] == expected
        assert "Fallback" in raw["summary_text"]


# ── OpenAI Event Handling Tests ───────────────────────────────────


class TestOpenAIEventHandling:
    """Test how OpenAI events are processed."""

    @pytest.mark.asyncio
    async def test_session_created_transitions_to_active(self):
        engine = _make_engine()
        sid = _create_test_session(engine)

        result = await engine.handle_openai_event(sid, {"type": "session.created"})
        assert result == {"type": "ready"}
        assert engine.get_session(sid).status == RealtimeSessionStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_audio_delta_forwarded(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)

        result = await engine.handle_openai_event(sid, {
            "type": "response.audio.delta",
            "delta": "AQID",
        })
        assert result == {"type": "audio", "data": "AQID"}

    @pytest.mark.asyncio
    async def test_transcript_done_recorded(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)

        result = await engine.handle_openai_event(sid, {
            "type": "response.audio_transcript.done",
            "transcript": "Hello, welcome to the interview.",
        })
        assert result["type"] == "transcript"
        assert result["is_final"] is True

        entry = engine._sessions[sid]
        assert len(entry.session.transcript) == 1
        assert entry.session.transcript[0]["text"] == "Hello, welcome to the interview."

    @pytest.mark.asyncio
    async def test_user_transcript_recorded(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)

        result = await engine.handle_openai_event(sid, {
            "type": "conversation.item.input_audio_transcription.completed",
            "transcript": "I have 5 years of experience.",
        })
        assert result["type"] == "transcript"
        assert result["role"] == "user"

        entry = engine._sessions[sid]
        assert entry.session.transcript[0]["role"] == "user"

    @pytest.mark.asyncio
    async def test_error_event(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)

        result = await engine.handle_openai_event(sid, {
            "type": "error",
            "error": {"message": "Rate limit exceeded"},
        })
        assert result["type"] == "error"
        assert "Rate limit" in result["message"]

    @pytest.mark.asyncio
    async def test_log_question_function_call(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)

        # Mock the OpenAI websocket
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        result = await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "log_question",
            "call_id": "call_123",
            "arguments": json.dumps({
                "question_text": "Tell me about yourself",
                "category": "introduction",
            }),
        })

        # Should return None (no client message for log_question)
        assert result is None
        # But question should be tracked
        entry = engine._sessions[sid]
        assert entry.question_count == 1
        assert len(entry.session.questions_asked) == 1
        assert entry.session.questions_asked[0]["text"] == "Tell me about yourself"

    @pytest.mark.asyncio
    async def test_end_interview_function_call_accepted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # Simulate enough questions asked
        engine._sessions[sid].question_count = 6

        result = await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "end_interview",
            "call_id": "call_456",
            "arguments": json.dumps({
                "reason": "sufficient_signal",
                "summary_notes": "Good interview overall.",
            }),
        })

        assert result["type"] == "interview_complete"
        assert "ai_decided" in result["reason"]

    @pytest.mark.asyncio
    async def test_end_interview_rejected_below_min(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)

        # Mock OpenAI WS for rejection message
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws
        engine._sessions[sid].question_count = 2  # below min (5)

        result = await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "end_interview",
            "call_id": "call_789",
            "arguments": json.dumps({
                "reason": "sufficient_signal",
                "summary_notes": "Done.",
            }),
        })

        # Should be rejected — no interview_complete message
        assert result is None
        # WS should have received rejection
        assert mock_ws.send.called


# ── Server-Enforced Limits Tests ──────────────────────────────────


class TestServerEnforcedLimits:
    """Test max_questions, max_duration, max_silence enforcement."""

    def test_max_questions_triggers_end(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._sessions[sid].question_count = 12  # equals max

        result = engine.check_server_limits(sid)
        assert result is not None
        assert result["type"] == "interview_complete"
        assert result["reason"] == "max_questions"

    def test_max_duration_triggers_end(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # Simulate session started 16 minutes ago
        engine._sessions[sid].created_at = time.monotonic() - 960

        result = engine.check_server_limits(sid)
        assert result is not None
        assert result["type"] == "interview_complete"
        assert result["reason"] == "max_duration"

    def test_silence_warning(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # Simulate 35 seconds of silence
        engine._sessions[sid].last_activity = time.monotonic() - 35

        result = engine.check_server_limits(sid)
        assert result is not None
        assert result["type"] == "warning"

    def test_extended_silence_triggers_end(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # Simulate 65 seconds of silence (> max_silence * 2)
        engine._sessions[sid].last_activity = time.monotonic() - 65

        result = engine.check_server_limits(sid)
        assert result is not None
        assert result["type"] == "interview_complete"
        assert result["reason"] == "max_silence"

    def test_no_limits_triggered_during_normal_session(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # Fresh session with recent activity
        engine._sessions[sid].question_count = 3

        result = engine.check_server_limits(sid)
        assert result is None

    def test_limits_not_checked_when_not_active(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        # Session is CONNECTING, not ACTIVE
        result = engine.check_server_limits(sid)
        assert result is None


# ── Audio Relay Tests ─────────────────────────────────────────────


class TestAudioRelay:
    """Test audio chunk validation and relay."""

    @pytest.mark.asyncio
    async def test_valid_audio_relayed(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        import base64
        audio = base64.b64encode(b"\x00" * 100).decode()
        await engine.relay_client_audio(sid, audio)
        assert mock_ws.send.called

    @pytest.mark.asyncio
    async def test_oversized_audio_dropped(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        import base64
        # Create audio larger than MAX_AUDIO_CHUNK_SIZE
        audio = base64.b64encode(b"\x00" * (MAX_AUDIO_CHUNK_SIZE + 1000)).decode()
        await engine.relay_client_audio(sid, audio)
        assert not mock_ws.send.called

    @pytest.mark.asyncio
    async def test_invalid_base64_handled(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        await engine.relay_client_audio(sid, "not-valid-base64!!!")
        assert not mock_ws.send.called

    @pytest.mark.asyncio
    async def test_relay_to_missing_session_no_error(self):
        engine = _make_engine()
        await engine.relay_client_audio("nonexistent", "AQID")
        # Should not raise


# ── End Session Tests ─────────────────────────────────────────────


class TestEndSession:
    """Test session end and evaluation flow."""

    @pytest.mark.asyncio
    async def test_end_session_with_transcript(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[sid]

        # Add transcript data
        engine._add_transcript(entry, "assistant", "Tell me about yourself.")
        engine._add_transcript(entry, "user", "I'm a developer with 6 years experience.")
        entry.session.questions_asked = []  # force fallback extraction

        # Mock the LLM evaluation
        with patch("app.services.openai_service.OpenAIService") as mock_cls:
            mock_service = MagicMock()
            mock_service.generate_json = AsyncMock(return_value=MOCK_EVALUATION)
            mock_cls.return_value = mock_service

            summary = await engine.end_session(sid, "test")

        assert summary is not None
        assert summary.overall_interview_score == 77.5
        assert summary.is_passed is True

    @pytest.mark.asyncio
    async def test_end_session_empty_transcript_returns_none(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # No transcript data

        summary = await engine.end_session(sid, "test")
        assert summary is None

    @pytest.mark.asyncio
    async def test_end_session_nonexistent_raises(self):
        engine = _make_engine()
        with pytest.raises(ValueError, match="Session not found"):
            await engine.end_session("nonexistent", "test")

    @pytest.mark.asyncio
    async def test_end_session_already_completed_returns_none(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._transition(sid, RealtimeSessionStatus.COMPLETED)

        summary = await engine.end_session(sid, "test")
        assert summary is None

    @pytest.mark.asyncio
    async def test_end_session_with_llm_failure_uses_fallback(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[sid]

        engine._add_transcript(entry, "assistant", "Q1")
        engine._add_transcript(entry, "user", "A1")
        entry.session.questions_asked = []

        with patch("app.services.openai_service.OpenAIService") as mock_cls:
            mock_service = MagicMock()
            mock_service.generate_json = AsyncMock(side_effect=RuntimeError("API down"))
            mock_cls.return_value = mock_service

            summary = await engine.end_session(sid, "test")

        assert summary is not None
        assert "Fallback" in summary.summary_text


# ── Config Validation Tests ───────────────────────────────────────


class TestConfigValidation:
    """Test config-related behaviors."""

    def test_default_config_values(self):
        engine = _make_engine()
        s = engine._settings
        assert s.realtime_min_questions == 5
        assert s.realtime_max_questions == 12
        assert s.realtime_max_session_duration_seconds == 900
        assert s.realtime_max_silence_seconds == 30
        assert s.realtime_model == "gpt-4o-mini-realtime-preview"
        assert s.realtime_voice == "nova"

    @pytest.mark.asyncio
    async def test_connect_without_api_key_fails(self, monkeypatch):
        engine = _make_engine()
        engine._settings.openai_api_key = ""
        sid = _create_test_session(engine)

        with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
            await engine.connect_to_openai(sid)

        assert engine.get_session(sid).status == RealtimeSessionStatus.FAILED


# ── WebSocket API Integration Tests ──────────────────────────────


class TestWebSocketAPI:
    """Test the WebSocket endpoint via TestClient."""

    def test_realtime_status_endpoint_404(self, test_client):
        res = test_client.get("/api/v1/interview/realtime/nonexistent/status")
        assert res.status_code == 404

    def test_realtime_end_endpoint_404(self, test_client):
        res = test_client.post("/api/v1/interview/realtime/nonexistent/end")
        assert res.status_code == 404

    def test_ws_missing_init_fields(self, test_client):
        with test_client.websocket_connect("/api/v1/interview/realtime/ws") as ws:
            ws.send_json({"type": "init", "application_id": ""})
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert "Missing required fields" in msg["message"]

    def test_ws_wrong_first_message(self, test_client):
        with test_client.websocket_connect("/api/v1/interview/realtime/ws") as ws:
            ws.send_json({"type": "audio", "data": "test"})
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert "init" in msg["message"]


# ── Concurrency / Race Condition Tests ────────────────────────────


class TestConcurrency:
    """Test race conditions and concurrent operations."""

    def test_simultaneous_limit_check_and_end(self):
        """If both AI end and server limit trigger, first one wins."""
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._sessions[sid].question_count = 12

        # Server limit triggers end
        result = engine.check_server_limits(sid)
        assert result["type"] == "interview_complete"

        # Session end_reason should be set
        session = engine.get_session(sid)
        assert session.end_reason == "max_questions"

    @pytest.mark.asyncio
    async def test_double_end_session(self):
        """Calling end_session twice should not crash."""
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[sid]
        engine._add_transcript(entry, "assistant", "Q1")
        engine._add_transcript(entry, "user", "A1")
        entry.session.questions_asked = []

        with patch("app.services.openai_service.OpenAIService") as mock_cls:
            mock_service = MagicMock()
            mock_service.generate_json = AsyncMock(return_value=MOCK_EVALUATION)
            mock_cls.return_value = mock_service

            summary1 = await engine.end_session(sid, "test")
            assert summary1 is not None

            # Second call — session is now COMPLETED
            summary2 = await engine.end_session(sid, "test")
            assert summary2 is None

    @pytest.mark.asyncio
    async def test_event_on_nonexistent_session_returns_none(self):
        """Processing events for a removed session should not crash."""
        engine = _make_engine()
        result = await engine.handle_openai_event("nonexistent", {"type": "session.created"})
        assert result is None

    def test_relay_after_session_removed(self):
        """Relaying audio after session removal should not crash."""
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine.remove_session(sid)

        # This should not raise
        asyncio.get_event_loop().run_until_complete(
            engine.relay_client_audio(sid, "AQID")
        )


# ── Duration Warning & Slot Fix Tests ───────────────────────────


class TestDurationWarning:
    """Test that duration warning works without AttributeError (issue #1)."""

    def test_duration_warning_sent_without_crash(self):
        """_duration_warning_sent must exist in __slots__ and not raise AttributeError."""
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        # Simulate session near max duration (within 30 sec warning window)
        max_dur = engine._settings.realtime_max_session_duration_seconds
        engine._sessions[sid].created_at = time.monotonic() - (max_dur - 15)

        result = engine.check_server_limits(sid)
        assert result is not None
        assert result["type"] == "warning"
        assert engine._sessions[sid]._duration_warning_sent is True

    def test_duration_warning_not_repeated(self):
        """Once duration warning is sent, it should not be sent again."""
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        max_dur = engine._settings.realtime_max_session_duration_seconds
        engine._sessions[sid].created_at = time.monotonic() - (max_dur - 15)

        result1 = engine.check_server_limits(sid)
        assert result1["type"] == "warning"

        # Second check — should return None (warning already sent), or max_questions/silence
        # but NOT another warning
        result2 = engine.check_server_limits(sid)
        # Either None or some other type, but not a duplicate warning for duration
        if result2 is not None:
            assert result2.get("reason") != "max_duration" or result2["type"] != "warning"


# ── Transcript Limit End Behavior Tests ──────────────────────────


class TestTranscriptLimitEnd:
    """Test that transcript limit triggers interview end (issue #6)."""

    @pytest.mark.asyncio
    async def test_transcript_limit_triggers_end_on_user_message(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[sid]

        # Fill transcript to the limit
        engine._settings.realtime_max_transcript_entries = 2
        engine._add_transcript(entry, "assistant", "Q1")
        engine._add_transcript(entry, "user", "A1")

        # Next transcript should trigger interview_complete
        result = await engine.handle_openai_event(sid, {
            "type": "conversation.item.input_audio_transcription.completed",
            "transcript": "This should hit the limit",
        })
        assert result is not None
        assert result["type"] == "interview_complete"
        assert result["reason"] == "transcript_limit"

    @pytest.mark.asyncio
    async def test_transcript_limit_triggers_end_on_assistant_message(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[sid]

        engine._settings.realtime_max_transcript_entries = 1
        engine._add_transcript(entry, "assistant", "Q1")

        result = await engine.handle_openai_event(sid, {
            "type": "response.audio_transcript.done",
            "transcript": "This should hit the limit",
        })
        assert result is not None
        assert result["type"] == "interview_complete"
        assert result["reason"] == "transcript_limit"


# ── Session Eviction Tests ───────────────────────────────────────


class TestSessionEviction:
    """Test TTL-based session eviction (issue #12)."""

    def test_evict_expired_completed_sessions(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._transition(sid, RealtimeSessionStatus.COMPLETED)

        # Session is completed but not yet expired
        assert engine.evict_expired_sessions() == 0
        assert engine.get_session(sid) is not None

        # Simulate passage of time beyond TTL
        engine._sessions[sid].created_at = time.monotonic() - (engine._SESSION_TTL_SECONDS + 10)
        assert engine.evict_expired_sessions() == 1
        assert engine.get_session(sid) is None

    def test_active_sessions_not_evicted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._sessions[sid].created_at = time.monotonic() - 99999

        assert engine.evict_expired_sessions() == 0
        assert engine.get_session(sid) is not None


# ── Edge Case Tests ─────────────────────────────────────────────


class TestEdgeCaseStaleEviction:
    """Edge case #1: ENDING/INTERRUPTED sessions are evicted after TTL."""

    def test_ending_session_evicted_after_ttl(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._sessions[sid].ended_at_monotonic = time.monotonic() - (engine._SESSION_TTL_SECONDS + 10)

        assert engine.evict_expired_sessions() == 1
        assert engine.get_session(sid) is None

    def test_interrupted_session_evicted_after_ttl(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.INTERRUPTED)
        engine._sessions[sid].ended_at_monotonic = time.monotonic() - (engine._SESSION_TTL_SECONDS + 10)

        assert engine.evict_expired_sessions() == 1
        assert engine.get_session(sid) is None

    def test_recent_ending_session_not_evicted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._sessions[sid].ended_at_monotonic = time.monotonic()

        assert engine.evict_expired_sessions() == 0
        assert engine.get_session(sid) is not None


class TestEdgeCaseTTLFromEndTime:
    """Edge case #2: TTL measured from ended_at_monotonic, not created_at."""

    def test_long_session_not_evicted_immediately_after_completion(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._transition(sid, RealtimeSessionStatus.COMPLETED)

        # Session created long ago but just ended now
        engine._sessions[sid].created_at = time.monotonic() - 99999
        engine._sessions[sid].ended_at_monotonic = time.monotonic()

        assert engine.evict_expired_sessions() == 0
        assert engine.get_session(sid) is not None

    def test_long_session_evicted_after_end_ttl_expires(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        engine._transition(sid, RealtimeSessionStatus.ENDING)
        engine._transition(sid, RealtimeSessionStatus.COMPLETED)

        engine._sessions[sid].created_at = time.monotonic() - 99999
        engine._sessions[sid].ended_at_monotonic = time.monotonic() - (engine._SESSION_TTL_SECONDS + 10)

        assert engine.evict_expired_sessions() == 1


class TestEdgeCaseConnectFailure:
    """Edge case #3: session.update send failure after connect cleans up."""

    @pytest.mark.asyncio
    async def test_ws_send_failure_after_connect_marks_failed(self):
        engine = _make_engine()
        engine._settings.openai_api_key = "test-key"
        sid = _create_test_session(engine)

        mock_ws = AsyncMock()
        mock_ws.send = AsyncMock(side_effect=ConnectionError("socket closed"))
        mock_ws.close = AsyncMock()

        async def fake_connect(*args, **kwargs):
            return mock_ws

        with patch("app.core.realtime_engine.websockets.connect", side_effect=fake_connect):
            with pytest.raises(RuntimeError, match="Failed to send session config"):
                await engine.connect_to_openai(sid)

        session = engine.get_session(sid)
        assert session.status == RealtimeSessionStatus.FAILED
        entry = engine._sessions[sid]
        assert entry.openai_ws is None
        mock_ws.close.assert_called_once()


class TestEdgeCaseInvalidSessionId:
    """Edge case #4: non-UUID session_id doesn't crash evaluation."""

    @pytest.mark.asyncio
    async def test_invalid_uuid_session_id_graceful_evaluation(self):
        engine = _make_engine()
        bad_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        _create_test_session(engine, session_id=bad_id)
        engine._transition(bad_id, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[bad_id]

        engine._add_transcript(entry, "assistant", "Tell me about yourself.")
        engine._add_transcript(entry, "user", "I'm a developer.")
        entry.session.questions_asked = []

        with patch("app.services.openai_service.OpenAIService") as mock_cls:
            mock_service = MagicMock()
            mock_service.generate_json = AsyncMock(return_value=MOCK_EVALUATION)
            mock_cls.return_value = mock_service

            summary = await engine.end_session(bad_id, "test")

        # Should succeed — _safe_uuid generates a fallback UUID
        assert summary is not None
        assert summary.overall_interview_score == 77.5


class TestEdgeCaseEmptyLogQuestion:
    """Edge case #5: empty/duplicate log_question doesn't inflate count."""

    @pytest.mark.asyncio
    async def test_empty_question_text_not_counted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        result = await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "log_question",
            "call_id": "call_empty",
            "arguments": json.dumps({"question_text": "", "category": "intro"}),
        })

        assert result is None
        assert engine._sessions[sid].question_count == 0
        assert len(engine._sessions[sid].session.questions_asked) == 0

    @pytest.mark.asyncio
    async def test_whitespace_only_question_not_counted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        result = await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "log_question",
            "call_id": "call_ws",
            "arguments": json.dumps({"question_text": "   \n  ", "category": "intro"}),
        })

        assert result is None
        assert engine._sessions[sid].question_count == 0

    @pytest.mark.asyncio
    async def test_duplicate_question_not_counted(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        mock_ws = AsyncMock()
        engine._sessions[sid].openai_ws = mock_ws

        # First call — should be counted
        await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "log_question",
            "call_id": "call_1",
            "arguments": json.dumps({"question_text": "Tell me about yourself", "category": "intro"}),
        })
        assert engine._sessions[sid].question_count == 1

        # Duplicate — should NOT be counted
        await engine.handle_openai_event(sid, {
            "type": "response.function_call_arguments.done",
            "name": "log_question",
            "call_id": "call_2",
            "arguments": json.dumps({"question_text": "Tell me about yourself", "category": "intro"}),
        })
        assert engine._sessions[sid].question_count == 1


class TestEdgeCaseUnknownJobPostingFields:
    """Edge case #8: unknown job_posting fields rejected at validation."""

    def test_unknown_fields_rejected(self, test_client):
        with test_client.websocket_connect("/api/v1/interview/realtime/ws") as ws_conn:
            ws_conn.send_json({
                "type": "init",
                "application_id": "app-1",
                "candidate_name": "Test",
                "job_posting": {
                    "job_title": "Dev",
                    "extra_notes": "A" * 1_000_000,
                },
            })
            msg = ws_conn.receive_json()
            assert msg["type"] == "error"
            assert "unknown fields" in msg["message"]


class TestEdgeCaseMissingStaticAsset:
    """Edge case #9: missing static files return 404, not server error."""

    def test_interview_room_missing_returns_404(self, test_client, tmp_path, monkeypatch):
        import app.main as main_module
        monkeypatch.setattr(main_module, "_static_dir", tmp_path)
        res = test_client.get("/interview-room")
        assert res.status_code == 404

    def test_realtime_room_missing_returns_404(self, test_client, tmp_path, monkeypatch):
        import app.main as main_module
        monkeypatch.setattr(main_module, "_static_dir", tmp_path)
        res = test_client.get("/realtime-interview")
        assert res.status_code == 404


class TestEdgeCaseEndSessionIdempotency:
    """Edge case #10: end_session is idempotent on retries."""

    @pytest.mark.asyncio
    async def test_end_session_retry_after_completion(self):
        engine = _make_engine()
        sid = _create_test_session(engine)
        engine._transition(sid, RealtimeSessionStatus.ACTIVE)
        entry = engine._sessions[sid]
        engine._add_transcript(entry, "assistant", "Q1")
        engine._add_transcript(entry, "user", "A1")
        entry.session.questions_asked = []

        with patch("app.services.openai_service.OpenAIService") as mock_cls:
            mock_service = MagicMock()
            mock_service.generate_json = AsyncMock(return_value=MOCK_EVALUATION)
            mock_cls.return_value = mock_service

            summary1 = await engine.end_session(sid, "test")
            assert summary1 is not None

        # Retry — already completed, should return None without error
        summary2 = await engine.end_session(sid, "test")
        assert summary2 is None
