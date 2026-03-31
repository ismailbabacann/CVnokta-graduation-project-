"""
Realtime Interview Engine — OpenAI Realtime API proxy.

Manages WebSocket sessions between browser clients and OpenAI's Realtime API.
Handles:
  - Session lifecycle (state machine)
  - Audio relay (client <-> OpenAI)
  - Transcript accumulation
  - Server-enforced interview policy (min/max questions, duration, silence)
  - Q&A extraction for batch evaluation
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import websockets

from app.config import get_settings
from app.core.prompts.realtime_interview import (
    REALTIME_TOOL_DEFINITIONS,
    build_realtime_system_instructions,
)
from app.models.interview import (
    InterviewQA,
    InterviewSummary,
    RealtimeSession,
    RealtimeSessionStatus,
)
from app.models.job_posting import JobPostingInput

logger = logging.getLogger(__name__)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"


def _safe_uuid(value: str) -> UUID:
    """Parse a string as UUID, returning a random UUID if parsing fails."""
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        return uuid4()

# Maximum audio chunk size in bytes (32KB)
MAX_AUDIO_CHUNK_SIZE = 32 * 1024


class _RealtimeSessionEntry:
    """Internal session storage with timing metadata."""

    __slots__ = (
        "session", "created_at", "last_activity",
        "openai_ws", "question_count",
        "_silence_warning_sent", "_duration_warning_sent",
        "ended_at_monotonic",
    )

    def __init__(self, session: RealtimeSession) -> None:
        self.session = session
        self.created_at = time.monotonic()
        self.last_activity = time.monotonic()
        self.openai_ws: Optional[Any] = None
        self.question_count: int = 0
        self._silence_warning_sent: bool = False
        self._duration_warning_sent: bool = False
        self.ended_at_monotonic: Optional[float] = None


# Valid state transitions for the session state machine
_VALID_TRANSITIONS: Dict[RealtimeSessionStatus, set] = {
    RealtimeSessionStatus.CONNECTING: {
        RealtimeSessionStatus.ACTIVE,
        RealtimeSessionStatus.FAILED,
    },
    RealtimeSessionStatus.ACTIVE: {
        RealtimeSessionStatus.ENDING,
        RealtimeSessionStatus.INTERRUPTED,
        RealtimeSessionStatus.FAILED,
    },
    RealtimeSessionStatus.ENDING: {
        RealtimeSessionStatus.COMPLETED,
        RealtimeSessionStatus.FAILED,
    },
    RealtimeSessionStatus.INTERRUPTED: {
        RealtimeSessionStatus.COMPLETED,
        RealtimeSessionStatus.FAILED,
    },
    # Terminal states — no transitions out
    RealtimeSessionStatus.COMPLETED: set(),
    RealtimeSessionStatus.FAILED: set(),
}


class RealtimeInterviewEngine:
    """
    Manages realtime interview sessions via OpenAI Realtime API.

    Each session is a WebSocket proxy: browser <-> this engine <-> OpenAI.
    Audio flows bidirectionally; transcript and control events are intercepted.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._sessions: Dict[str, _RealtimeSessionEntry] = {}

    # ── Session lifecycle ─────────────────────────────────────────

    def create_session(
        self,
        session_id: str,
        application_id: str,
        job_posting: dict,
        cv_summary: str,
        candidate_name: str,
    ) -> RealtimeSession:
        """Create a new realtime session in CONNECTING state."""
        if session_id in self._sessions:
            raise ValueError(f"Duplicate session_id: {session_id}")

        session = RealtimeSession(
            session_id=session_id,
            application_id=application_id,
            job_posting=job_posting,
            cv_summary=cv_summary,
            candidate_name=candidate_name,
            status=RealtimeSessionStatus.CONNECTING,
        )

        self._sessions[session_id] = _RealtimeSessionEntry(session)
        logger.info("Realtime session created: %s (status=CONNECTING)", session_id)
        return session

    def get_session(self, session_id: str) -> Optional[RealtimeSession]:
        """Get session by ID, or None if not found."""
        entry = self._sessions.get(session_id)
        return entry.session if entry else None

    def _transition(self, session_id: str, new_status: RealtimeSessionStatus) -> None:
        """Transition session to a new state, validating the transition."""
        entry = self._sessions.get(session_id)
        if entry is None:
            raise ValueError(f"Session not found: {session_id}")

        current = entry.session.status
        allowed = _VALID_TRANSITIONS.get(current, set())
        if new_status not in allowed:
            raise ValueError(
                f"Invalid transition: {current.value} -> {new_status.value}"
            )

        entry.session.status = new_status
        logger.info(
            "Session %s: %s -> %s", session_id, current.value, new_status.value
        )

    # ── OpenAI connection ─────────────────────────────────────────

    async def connect_to_openai(self, session_id: str) -> Any:
        """
        Open a WebSocket connection to OpenAI Realtime API.

        Sends session.update with system instructions and tool definitions.
        Returns the websocket connection object.
        """
        entry = self._sessions.get(session_id)
        if entry is None:
            raise ValueError(f"Session not found: {session_id}")

        api_key = self._settings.openai_api_key
        if not api_key:
            self._transition(session_id, RealtimeSessionStatus.FAILED)
            raise RuntimeError("OPENAI_API_KEY is not configured")

        model = self._settings.realtime_model
        url = f"{OPENAI_REALTIME_URL}?model={model}"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "OpenAI-Beta": "realtime=v1",
        }

        try:
            ws = await websockets.connect(url, additional_headers=headers)
        except Exception as exc:
            self._transition(session_id, RealtimeSessionStatus.FAILED)
            raise RuntimeError(f"Failed to connect to OpenAI Realtime API: {exc}") from exc

        entry.openai_ws = ws

        # Send session configuration — if this fails, clean up deterministically
        session_config = self._build_session_config(entry)
        try:
            await ws.send(json.dumps(session_config))
        except Exception as exc:
            try:
                await ws.close()
            except Exception:
                pass
            entry.openai_ws = None
            self._transition(session_id, RealtimeSessionStatus.FAILED)
            raise RuntimeError(f"Failed to send session config to OpenAI: {exc}") from exc

        logger.info("Connected to OpenAI Realtime API for session %s", session_id)
        return ws

    def _build_session_config(self, entry: _RealtimeSessionEntry) -> dict:
        """Build the session.update event for OpenAI."""
        jp = entry.session.job_posting
        instructions = build_realtime_system_instructions(
            job_title=jp.get("job_title", ""),
            responsibilities=jp.get("responsibilities", ""),
            required_skills=jp.get("required_skills", ""),
            cv_summary=entry.session.cv_summary,
            candidate_name=entry.session.candidate_name,
            min_questions=self._settings.realtime_min_questions,
            max_questions=self._settings.realtime_max_questions,
        )

        return {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": instructions,
                "voice": self._settings.realtime_voice,
                "input_audio_format": self._settings.realtime_input_audio_format,
                "output_audio_format": self._settings.realtime_output_audio_format,
                "turn_detection": {
                    "type": self._settings.realtime_turn_detection,
                    "threshold": self._settings.realtime_vad_threshold,
                },
                "tools": REALTIME_TOOL_DEFINITIONS,
            },
        }

    # ── Audio relay ───────────────────────────────────────────────

    async def relay_client_audio(self, session_id: str, audio_base64: str) -> None:
        """Forward a client audio chunk to OpenAI."""
        entry = self._sessions.get(session_id)
        if entry is None or entry.openai_ws is None:
            return

        # Validate chunk size
        try:
            raw = base64.b64decode(audio_base64)
        except Exception:
            logger.warning("Invalid base64 audio from client (session=%s)", session_id)
            return

        if len(raw) > MAX_AUDIO_CHUNK_SIZE:
            logger.warning(
                "Audio chunk too large (%d bytes, max %d) — dropping (session=%s)",
                len(raw), MAX_AUDIO_CHUNK_SIZE, session_id,
            )
            return

        entry.last_activity = time.monotonic()
        entry._silence_warning_sent = False

        event = {
            "type": "input_audio_buffer.append",
            "audio": audio_base64,
        }
        try:
            await entry.openai_ws.send(json.dumps(event))
        except Exception as exc:
            logger.error("Failed to relay audio to OpenAI (session=%s): %s", session_id, exc)

    # ── OpenAI event handling ─────────────────────────────────────

    async def handle_openai_event(
        self, session_id: str, event: dict
    ) -> Optional[dict]:
        """
        Process an event from OpenAI Realtime API.

        Returns a message dict to send to the client, or None if no client
        message is needed.
        """
        entry = self._sessions.get(session_id)
        if entry is None:
            return None

        event_type = event.get("type", "")

        # Session created — mark active
        if event_type == "session.created":
            self._transition(session_id, RealtimeSessionStatus.ACTIVE)
            return {"type": "ready"}

        # Session updated — config acknowledged
        if event_type == "session.updated":
            return None

        # Audio delta — forward to client
        if event_type == "response.audio.delta":
            audio_data = event.get("delta", "")
            if audio_data:
                return {"type": "audio", "data": audio_data}
            return None

        # Audio done — AI finished speaking
        if event_type == "response.audio.done":
            return {"type": "speaking_stopped"}

        # Response created — AI starting to speak
        if event_type == "response.created":
            return {"type": "speaking_started"}

        # Transcript delta — partial transcript
        if event_type == "response.audio_transcript.delta":
            delta = event.get("delta", "")
            if delta:
                return {
                    "type": "transcript",
                    "role": "assistant",
                    "text": delta,
                    "is_final": False,
                }
            return None

        # Transcript done — final transcript for this response
        if event_type == "response.audio_transcript.done":
            text = event.get("transcript", "")
            if text:
                if not self._add_transcript(entry, "assistant", text):
                    return {
                        "type": "interview_complete",
                        "reason": "transcript_limit",
                    }
                return {
                    "type": "transcript",
                    "role": "assistant",
                    "text": text,
                    "is_final": True,
                }
            return None

        # User speech started (VAD)
        if event_type == "input_audio_buffer.speech_started":
            entry.last_activity = time.monotonic()
            return {"type": "listening"}

        # User transcript completed
        if event_type == "conversation.item.input_audio_transcription.completed":
            text = event.get("transcript", "")
            if text:
                if not self._add_transcript(entry, "user", text):
                    return {
                        "type": "interview_complete",
                        "reason": "transcript_limit",
                    }
                return {
                    "type": "transcript",
                    "role": "user",
                    "text": text,
                    "is_final": True,
                }
            return None

        # Function call completed
        if event_type == "response.function_call_arguments.done":
            return await self._handle_function_call(session_id, entry, event)

        # Error from OpenAI
        if event_type == "error":
            error_msg = event.get("error", {}).get("message", "Unknown error")
            logger.error("OpenAI error (session=%s): %s", session_id, error_msg)
            return {
                "type": "error",
                "message": f"AI service error: {error_msg}",
                "recoverable": False,
            }

        return None

    async def _handle_function_call(
        self, session_id: str, entry: _RealtimeSessionEntry, event: dict
    ) -> Optional[dict]:
        """Handle a function call from the AI model."""
        fn_name = event.get("name", "")
        args_str = event.get("arguments", "{}")

        try:
            args = json.loads(args_str)
        except json.JSONDecodeError:
            logger.warning("Invalid function call args (session=%s): %s", session_id, args_str)
            return None

        call_id = event.get("call_id", "")

        if fn_name == "log_question":
            question_text = args.get("question_text", "").strip()
            category = args.get("category", "unknown")

            # Reject empty or duplicate questions — don't inflate count
            if not question_text:
                logger.warning("Empty log_question ignored (session=%s)", session_id)
                if entry.openai_ws and call_id:
                    ack = {
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": json.dumps({"status": "ignored", "reason": "empty question_text"}),
                        },
                    }
                    await entry.openai_ws.send(json.dumps(ack))
                    await entry.openai_ws.send(json.dumps({"type": "response.create"}))
                return None

            # Deduplicate: skip if the last logged question has identical text
            if entry.session.questions_asked and entry.session.questions_asked[-1].get("text") == question_text:
                logger.warning("Duplicate log_question ignored (session=%s): %s", session_id, question_text[:60])
                if entry.openai_ws and call_id:
                    ack = {
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": json.dumps({"status": "ignored", "reason": "duplicate question"}),
                        },
                    }
                    await entry.openai_ws.send(json.dumps(ack))
                    await entry.openai_ws.send(json.dumps({"type": "response.create"}))
                return None

            entry.question_count += 1
            entry.session.questions_asked.append({
                "text": question_text,
                "category": category,
                "timestamp": datetime.utcnow().isoformat(),
                "sequence": entry.question_count,
            })
            logger.info(
                "Question logged (session=%s): #%d [%s]",
                session_id, entry.question_count, category,
            )
            # Acknowledge the function call so the model continues
            if entry.openai_ws:
                ack = {
                    "type": "conversation.item.create",
                    "item": {
                        "type": "function_call_output",
                        "call_id": call_id,
                        "output": json.dumps({"status": "logged", "question_number": entry.question_count}),
                    },
                }
                await entry.openai_ws.send(json.dumps(ack))
                # Trigger response generation after function call
                await entry.openai_ws.send(json.dumps({"type": "response.create"}))
            return None

        if fn_name == "end_interview":
            reason = args.get("reason", "sufficient_signal")
            summary_notes = args.get("summary_notes", "")

            # Server-enforced minimum check
            if entry.question_count < self._settings.realtime_min_questions:
                logger.warning(
                    "AI tried to end interview too early (session=%s): %d/%d questions",
                    session_id, entry.question_count, self._settings.realtime_min_questions,
                )
                # Reject the function call — tell model to keep going
                if entry.openai_ws:
                    reject = {
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": json.dumps({
                                "status": "rejected",
                                "reason": f"Minimum {self._settings.realtime_min_questions} questions required, only {entry.question_count} asked so far. Please continue the interview.",
                            }),
                        },
                    }
                    await entry.openai_ws.send(json.dumps(reject))
                    await entry.openai_ws.send(json.dumps({"type": "response.create"}))
                return None

            entry.session.end_reason = f"ai_decided:{reason}"
            logger.info(
                "AI ended interview (session=%s): reason=%s notes=%s",
                session_id, reason, summary_notes[:100],
            )
            return {
                "type": "interview_complete",
                "reason": f"ai_decided:{reason}",
            }

        logger.warning("Unknown function call (session=%s): %s", session_id, fn_name)
        return None

    # ── Transcript management ─────────────────────────────────────

    def _add_transcript(
        self, entry: _RealtimeSessionEntry, role: str, text: str
    ) -> bool:
        """Add a transcript entry, respecting the max entries limit.

        Returns False if the limit was reached (caller should end session).
        """
        if len(entry.session.transcript) >= self._settings.realtime_max_transcript_entries:
            logger.warning(
                "Transcript limit reached (session=%s), triggering session end",
                entry.session.session_id,
            )
            entry.session.end_reason = "transcript_limit"
            return False

        entry.session.transcript.append({
            "role": role,
            "text": text,
            "timestamp": datetime.utcnow().isoformat(),
        })
        return True

    # ── Server-enforced policy checks ─────────────────────────────

    def check_server_limits(self, session_id: str) -> Optional[dict]:
        """
        Check server-enforced limits. Returns a client message if action needed.

        Called periodically from the WebSocket relay loop.
        """
        entry = self._sessions.get(session_id)
        if entry is None:
            return None

        if entry.session.status != RealtimeSessionStatus.ACTIVE:
            return None

        now = time.monotonic()
        elapsed = now - entry.created_at

        # Max session duration
        max_duration = self._settings.realtime_max_session_duration_seconds
        if elapsed >= max_duration:
            entry.session.end_reason = "max_duration"
            return {
                "type": "interview_complete",
                "reason": "max_duration",
            }

        # Duration warning (30 seconds before end)
        if elapsed >= max_duration - 30 and not entry._duration_warning_sent:
            entry._duration_warning_sent = True
            return {
                "type": "warning",
                "message": "Interview will end in 30 seconds due to time limit.",
            }

        # Max questions
        if entry.question_count >= self._settings.realtime_max_questions:
            entry.session.end_reason = "max_questions"
            return {
                "type": "interview_complete",
                "reason": "max_questions",
            }

        # Silence detection
        silence = now - entry.last_activity
        max_silence = self._settings.realtime_max_silence_seconds

        if silence >= max_silence * 2:
            entry.session.end_reason = "max_silence"
            return {
                "type": "interview_complete",
                "reason": "max_silence",
            }

        if silence >= max_silence and not entry._silence_warning_sent:
            entry._silence_warning_sent = True
            return {
                "type": "warning",
                "message": "No activity detected. The interview will end soon if there is no response.",
            }

        return None

    # ── Session end & evaluation ──────────────────────────────────

    async def end_session(
        self, session_id: str, reason: str
    ) -> Optional[InterviewSummary]:
        """
        End a realtime session and produce an InterviewSummary.

        Extracts Q&A pairs from transcript and runs batch evaluation
        using the existing interview evaluation pipeline.
        """
        entry = self._sessions.get(session_id)
        if entry is None:
            raise ValueError(f"Session not found: {session_id}")

        # Transition to ENDING
        current = entry.session.status
        if current in (RealtimeSessionStatus.COMPLETED, RealtimeSessionStatus.FAILED):
            return None

        if current == RealtimeSessionStatus.ACTIVE:
            self._transition(session_id, RealtimeSessionStatus.ENDING)
        elif current == RealtimeSessionStatus.INTERRUPTED:
            # Can still evaluate if we have enough transcript
            pass
        elif current == RealtimeSessionStatus.CONNECTING:
            self._transition(session_id, RealtimeSessionStatus.FAILED)
            return None

        entry.session.ended_at = datetime.utcnow()
        entry.ended_at_monotonic = time.monotonic()
        if not entry.session.end_reason:
            entry.session.end_reason = reason

        # Close OpenAI connection
        if entry.openai_ws:
            try:
                await entry.openai_ws.close()
            except Exception:
                pass
            entry.openai_ws = None

        # Extract Q&A and evaluate
        qa_pairs = self._build_qa_from_transcript(entry)

        if not qa_pairs:
            logger.warning("No Q&A pairs extracted (session=%s), marking FAILED", session_id)
            try:
                self._transition(session_id, RealtimeSessionStatus.FAILED)
            except ValueError:
                entry.session.status = RealtimeSessionStatus.FAILED
            return None

        try:
            summary = await self._evaluate(entry, qa_pairs)
            try:
                self._transition(session_id, RealtimeSessionStatus.COMPLETED)
            except ValueError:
                entry.session.status = RealtimeSessionStatus.COMPLETED
            return summary
        except Exception as exc:
            logger.error("Evaluation failed (session=%s): %s", session_id, exc)
            try:
                self._transition(session_id, RealtimeSessionStatus.FAILED)
            except ValueError:
                entry.session.status = RealtimeSessionStatus.FAILED
            return None

    # ── Q&A extraction ────────────────────────────────────────────

    def _build_qa_from_transcript(
        self, entry: _RealtimeSessionEntry
    ) -> List[InterviewQA]:
        """
        Extract Q&A pairs from the session's transcript and logged questions.

        Primary path: Use log_question function call data.
        Fallback path: Use assistant turns as questions if log_question wasn't called.
        """
        session_id = entry.session.session_id
        questions_logged = entry.session.questions_asked
        transcript = entry.session.transcript

        if not transcript:
            return []

        # Primary path: match logged questions to user answers
        if questions_logged:
            return self._extract_qa_from_logged_questions(
                session_id, questions_logged, transcript
            )

        # Fallback: treat assistant turns as questions, user turns as answers
        logger.warning(
            "No log_question calls found (session=%s), using fallback Q&A extraction",
            session_id,
        )
        return self._extract_qa_fallback(session_id, transcript)

    def _extract_qa_from_logged_questions(
        self,
        session_id: str,
        questions: List[dict],
        transcript: List[dict],
    ) -> List[InterviewQA]:
        """Match logged questions to subsequent user responses in transcript."""
        qa_pairs: List[InterviewQA] = []

        # Find user responses that follow each question
        user_turns = [t for t in transcript if t["role"] == "user"]
        user_idx = 0

        for i, q in enumerate(questions):
            q_text = q.get("text", "")
            q_timestamp = q.get("timestamp", "")

            # Find the next user turn after this question was asked
            answer_text = ""
            answer_parts = []
            while user_idx < len(user_turns):
                u_ts = user_turns[user_idx].get("timestamp", "")
                if u_ts >= q_timestamp:
                    answer_parts.append(user_turns[user_idx]["text"])
                    user_idx += 1
                    # Check if next user turn is also before the next question
                    if i + 1 < len(questions):
                        next_q_ts = questions[i + 1].get("timestamp", "")
                        if user_idx < len(user_turns) and user_turns[user_idx].get("timestamp", "") < next_q_ts:
                            continue
                    break
                user_idx += 1

            answer_text = " ".join(answer_parts).strip()

            qa = InterviewQA(
                session_id=_safe_uuid(session_id),
                question_sequence=i + 1,
                question_category=q.get("category"),
                question_text=q_text,
                candidate_answer_text=answer_text or None,
                asked_at=datetime.fromisoformat(q_timestamp) if q_timestamp else None,
            )
            qa_pairs.append(qa)

        return qa_pairs

    def _extract_qa_fallback(
        self, session_id: str, transcript: List[dict]
    ) -> List[InterviewQA]:
        """Fallback: pair assistant turns (questions) with following user turns (answers)."""
        qa_pairs: List[InterviewQA] = []
        seq = 0

        i = 0
        while i < len(transcript):
            turn = transcript[i]
            if turn["role"] == "assistant":
                q_text = turn["text"]
                # Collect subsequent user turns as the answer
                answer_parts = []
                j = i + 1
                while j < len(transcript) and transcript[j]["role"] == "user":
                    answer_parts.append(transcript[j]["text"])
                    j += 1

                seq += 1
                qa = InterviewQA(
                    session_id=_safe_uuid(session_id),
                    question_sequence=seq,
                    question_text=q_text,
                    candidate_answer_text=" ".join(answer_parts).strip() or None,
                    asked_at=datetime.fromisoformat(turn.get("timestamp", "")) if turn.get("timestamp") else None,
                )
                qa_pairs.append(qa)
                i = j
            else:
                i += 1

        return qa_pairs

    # ── Evaluation bridge ─────────────────────────────────────────

    async def _evaluate(
        self, entry: _RealtimeSessionEntry, qa_pairs: List[InterviewQA]
    ) -> InterviewSummary:
        """
        Run batch evaluation on extracted Q&A pairs.

        Uses the same evaluation pipeline as the HTTP interview system.
        """
        from app.core.prompts.interview import (
            INTERVIEW_EVALUATION_TEMPLATE,
            INTERVIEW_SYSTEM_PROMPT,
        )

        # Build transcript string
        transcript_parts: List[str] = []
        for qa in qa_pairs:
            transcript_parts.append(
                f"Q{qa.question_sequence}: {qa.question_text}\n"
                f"A{qa.question_sequence}: {qa.candidate_answer_text or '(no answer)'}"
            )
        transcript_text = "\n\n".join(transcript_parts)

        jp = entry.session.job_posting
        job_requirements = (
            f"Title: {jp.get('job_title', 'N/A')}\n"
            f"Skills: {jp.get('required_skills', 'N/A')}\n"
            f"Qualifications: {jp.get('required_qualifications', 'N/A')}\n"
            f"Responsibilities: {jp.get('responsibilities', 'N/A')}"
        )

        # Add STT accuracy note
        eval_note = (
            "\n\nNOTE: This transcript was generated from realtime speech-to-text. "
            "Minor transcription errors may exist. Score based on content and "
            "logical consistency, not spelling or grammar artifacts."
        )

        eval_prompt = INTERVIEW_EVALUATION_TEMPLATE.format(
            job_requirements=job_requirements,
            transcript=transcript_text + eval_note,
        )

        try:
            from app.services.openai_service import OpenAIService
            service = OpenAIService()
            raw = await service.generate_json(
                INTERVIEW_SYSTEM_PROMPT, eval_prompt, use_cache=False
            )
        except Exception as exc:
            logger.error("LLM evaluation failed (session=%s): %s", entry.session.session_id, exc)
            raw = self._fallback_evaluation(qa_pairs)

        return self._build_summary(entry, qa_pairs, raw)

    def _fallback_evaluation(self, qa_pairs: List[InterviewQA]) -> Dict[str, Any]:
        """Deterministic fallback when LLM evaluation fails."""
        answered = len([qa for qa in qa_pairs if qa.candidate_answer_text])
        total = len(qa_pairs)
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
        self,
        entry: _RealtimeSessionEntry,
        qa_pairs: List[InterviewQA],
        raw: Dict[str, Any],
    ) -> InterviewSummary:
        """Build InterviewSummary from evaluation output."""

        def _score(key: str) -> Optional[float]:
            v = raw.get(key)
            if v is None:
                return None
            try:
                return max(0.0, min(100.0, round(float(v), 1)))
            except (TypeError, ValueError):
                return None

        answered = len([qa for qa in qa_pairs if qa.candidate_answer_text])
        overall = _score("overall_interview_score")

        session = entry.session
        try:
            app_id = UUID(session.application_id)
        except (ValueError, AttributeError):
            app_id = uuid4()

        return InterviewSummary(
            session_id=_safe_uuid(session.session_id),
            application_id=app_id,
            total_questions_asked=len(qa_pairs),
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

    # ── Cleanup ───────────────────────────────────────────────────

    # Completed/failed sessions are kept for 10 minutes for status retrieval
    _SESSION_TTL_SECONDS = 600

    def remove_session(self, session_id: str) -> None:
        """Remove a session from the store."""
        self._sessions.pop(session_id, None)

    def evict_expired_sessions(self) -> int:
        """Remove non-active sessions older than TTL. Returns count evicted."""
        now = time.monotonic()
        evictable = {
            RealtimeSessionStatus.COMPLETED,
            RealtimeSessionStatus.FAILED,
            RealtimeSessionStatus.ENDING,
            RealtimeSessionStatus.INTERRUPTED,
        }
        to_remove = []
        for sid, entry in self._sessions.items():
            if entry.session.status not in evictable:
                continue
            # Use ended_at_monotonic if available, else fall back to created_at
            ref_time = entry.ended_at_monotonic or entry.created_at
            if (now - ref_time) > self._SESSION_TTL_SECONDS:
                to_remove.append(sid)
        for sid in to_remove:
            self._sessions.pop(sid, None)
        if to_remove:
            logger.info("Evicted %d expired sessions", len(to_remove))
        return len(to_remove)
