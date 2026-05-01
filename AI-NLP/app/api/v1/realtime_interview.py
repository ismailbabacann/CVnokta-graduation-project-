"""
Realtime Interview WebSocket endpoint.

Proxies audio between browser client and OpenAI Realtime API.
Also provides an HTTP endpoint to retrieve evaluation results
after the interview completes.
"""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.core.realtime_engine import RealtimeInterviewEngine
from app.models.interview import RealtimeSessionStatus

# Max lengths for init payload fields to prevent prompt injection / token abuse
_MAX_CANDIDATE_NAME_LEN = 200
_MAX_CV_SUMMARY_LEN = 5000
_MAX_JOB_POSTING_FIELD_LEN = 3000
_MAX_JOB_POSTING_FIELDS = {"job_title", "department", "required_skills",
                            "required_qualifications", "responsibilities"}


def _validate_init_payload(msg: dict) -> str | None:
    """Validate init payload fields. Returns error message or None if valid."""
    candidate_name = msg.get("candidate_name", "")
    if not isinstance(candidate_name, str) or len(candidate_name) > _MAX_CANDIDATE_NAME_LEN:
        return f"candidate_name must be a string of at most {_MAX_CANDIDATE_NAME_LEN} chars"

    cv_summary = msg.get("cv_summary", "")
    if not isinstance(cv_summary, str) or len(cv_summary) > _MAX_CV_SUMMARY_LEN:
        return f"cv_summary must be a string of at most {_MAX_CV_SUMMARY_LEN} chars"

    job_posting = msg.get("job_posting")
    if not isinstance(job_posting, dict):
        return "job_posting must be an object"
    if not job_posting.get("job_title"):
        return "job_posting.job_title is required"

    # Strip unknown keys to prevent memory abuse (keep only allowed fields)
    unknown_keys = set(job_posting.keys()) - _MAX_JOB_POSTING_FIELDS
    for k in unknown_keys:
        del job_posting[k]

    for key, value in job_posting.items():
        if not isinstance(value, str) or len(value) > _MAX_JOB_POSTING_FIELD_LEN:
            return f"job_posting.{key} must be a string of at most {_MAX_JOB_POSTING_FIELD_LEN} chars"

    return None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview/realtime", tags=["Realtime Interview"])

# Singleton engine instance
_engine = RealtimeInterviewEngine()

# Track tokens → session_ids for re-take prevention
_token_session_map: dict[str, str] = {}


def get_realtime_engine() -> RealtimeInterviewEngine:
    """Get the singleton realtime engine instance."""
    return _engine


# ── Token-based interview start ───────────────────────────────────


@router.post("/start-with-token")
async def start_interview_with_token(payload: dict):
    """
    Validate an interview token and return session configuration.

    The frontend calls this before opening the WebSocket connection.
    Returns session_id, application_id, job_posting, cv_summary, candidate_name
    that the frontend should pass in the WebSocket init message.
    """
    from app.services.backend_client import (
        validate_interview_token,
        download_cv_pdf,
    )

    token = payload.get("token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    # Check if this token was already used in this AI-NLP instance
    if token in _token_session_map:
        raise HTTPException(
            status_code=409,
            detail="This interview has already been completed. Re-take is not allowed.",
        )

    # Validate token against Backend
    token_data = await validate_interview_token(token)
    if token_data is None:
        raise HTTPException(
            status_code=403,
            detail="Invalid, expired, or already used interview token.",
        )

    application_id = token_data.get("applicationId", "")
    job_posting_id = token_data.get("jobPostingId", "")
    candidate_name = token_data.get("candidateName", "Candidate")
    job_title = token_data.get("jobTitle", "")
    required_skills = token_data.get("requiredSkills", "")
    cv_url = token_data.get("cvUrl", "")

    # Download and parse the actual CV PDF
    cv_summary = ""
    if cv_url:
        pdf_bytes = await download_cv_pdf(cv_url)
        if pdf_bytes:
            import tempfile
            from app.core.cv_parser import parse_cv_from_pdf

            try:
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    tmp.write(pdf_bytes)
                    tmp_path = tmp.name
                parsed = parse_cv_from_pdf(tmp_path)
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
                        title = getattr(exp, "title", "") or ""
                        company = getattr(exp, "company", "") or ""
                        if title or company:
                            exp_items.append(f"{title} at {company}".strip())
                    if exp_items:
                        parts.append(f"Experience: {'; '.join(exp_items)}")
                if parsed.education:
                    edu_items = []
                    for edu in parsed.education[:3]:
                        degree = getattr(edu, "degree", "") or ""
                        institution = getattr(edu, "institution", "") or ""
                        if degree or institution:
                            edu_items.append(f"{degree} - {institution}".strip(" -"))
                    if edu_items:
                        parts.append(f"Education: {'; '.join(edu_items)}")
                if parsed.languages:
                    parts.append(f"Languages: {', '.join(parsed.languages[:10])}")
                if parsed.certifications:
                    parts.append(f"Certifications: {', '.join(parsed.certifications[:10])}")
                cv_summary = "\n".join(parts)
                logger.info("CV parsed successfully for %s: %d chars", candidate_name, len(cv_summary))
            except Exception as exc:
                logger.warning("CV parsing failed: %s", exc)
            finally:
                import os
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    if not cv_summary:
        cv_summary = f"Candidate: {candidate_name}. Position: {job_title}."

    session_id = str(uuid4())

    # Store token → session mapping for re-take prevention
    _token_session_map[token] = session_id

    return {
        "session_id": session_id,
        "application_id": application_id,
        "job_posting_id": job_posting_id,
        "candidate_name": candidate_name,
        "job_posting": {
            "job_title": job_title,
            "required_skills": required_skills,
        },
        "cv_summary": cv_summary,
        "token": token,
    }


# ── WebSocket endpoint ────────────────────────────────────────────


# TODO: Add auth/ownership checks on WS init, /status, and /end endpoints
#       once the .NET backend auth integration layer is in place.

@router.websocket("/ws")
async def realtime_interview_ws(websocket: WebSocket):
    """
    WebSocket endpoint for realtime AI interview.

    Protocol:
      1. Client connects and sends init message (JSON)
      2. Server connects to OpenAI Realtime API
      3. Two relay tasks run concurrently:
         - Client audio -> OpenAI
         - OpenAI events -> Client
      4. Interview ends via AI decision, server limits, or client request
      5. Client calls POST /end/{session_id} to get evaluation results
    """
    await websocket.accept()
    session_id = None
    logger.info("WebSocket accepted, waiting for init message...")

    try:
        # Step 1: Receive init message
        init_raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        init_msg = json.loads(init_raw)

        if init_msg.get("type") != "init":
            await websocket.send_json({
                "type": "error",
                "message": "First message must be type 'init'",
                "recoverable": False,
            })
            await websocket.close(code=1008)
            return

        # Validate required fields
        required = ["application_id", "job_posting", "candidate_name"]
        missing = [f for f in required if not init_msg.get(f)]
        if missing:
            await websocket.send_json({
                "type": "error",
                "message": f"Missing required fields: {', '.join(missing)}",
                "recoverable": False,
            })
            await websocket.close(code=1008)
            return

        # Validate field types, lengths, and required subfields
        validation_error = _validate_init_payload(init_msg)
        if validation_error:
            logger.warning("Init payload validation failed: %s", validation_error)
            await websocket.send_json({
                "type": "error",
                "message": validation_error,
                "recoverable": False,
            })
            await websocket.close(code=1008)
            return

        session_id = init_msg.get("session_id") or str(uuid4())
        logger.info("Init message received, session=%s, candidate=%s", session_id, init_msg.get("candidate_name"))
        # TODO: Validate application_id against real application records
        #       once .NET backend integration provides real IDs.
        application_id = init_msg["application_id"]
        job_posting = init_msg["job_posting"]
        cv_summary = init_msg.get("cv_summary", "")
        candidate_name = init_msg["candidate_name"]

        # Step 2: Create session
        try:
            _engine.create_session(
                session_id=session_id,
                application_id=application_id,
                job_posting=job_posting,
                cv_summary=cv_summary,
                candidate_name=candidate_name,
            )
        except ValueError as exc:
            await websocket.send_json({
                "type": "error",
                "message": str(exc),
                "recoverable": False,
            })
            await websocket.close(code=1008)
            return

        logger.info("Session created successfully, connecting to OpenAI... (session=%s)", session_id)

        # Step 3: Connect to OpenAI
        try:
            openai_ws = await _engine.connect_to_openai(session_id)
        except Exception as exc:
            logger.error("OpenAI Realtime connection failed (session=%s): %s: %s", session_id, type(exc).__name__, exc)
            import traceback
            traceback.print_exc()
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": str(exc),
                    "recoverable": False,
                })
                await websocket.close(code=1011)
            except Exception:
                pass
            _engine.remove_session(session_id)
            return

        # Step 4: Run relay tasks
        interview_ended = asyncio.Event()

        async def client_to_openai():
            """Relay messages from browser client to OpenAI."""
            try:
                while not interview_ended.is_set():
                    try:
                        raw = await asyncio.wait_for(
                            websocket.receive_text(), timeout=1.0
                        )
                    except asyncio.TimeoutError:
                        # Check server limits during idle
                        limit_msg = _engine.check_server_limits(session_id)
                        if limit_msg:
                            await websocket.send_json(limit_msg)
                            if limit_msg["type"] == "interview_complete":
                                interview_ended.set()
                        continue

                    try:
                        msg = json.loads(raw)
                    except json.JSONDecodeError:
                        logger.warning("Malformed JSON from client (session=%s)", session_id)
                        await websocket.send_json({
                            "type": "error",
                            "message": "Invalid JSON message",
                            "recoverable": True,
                        })
                        continue
                    msg_type = msg.get("type", "")

                    if msg_type == "audio":
                        await _engine.relay_client_audio(session_id, msg.get("audio") or msg.get("data", ""))

                    elif msg_type == "end_request":
                        session = _engine.get_session(session_id)
                        if session:
                            session.end_reason = "user_ended"
                        await websocket.send_json({
                            "type": "interview_complete",
                            "reason": "user_ended",
                        })
                        interview_ended.set()

            except WebSocketDisconnect:
                logger.info("Client disconnected (session=%s)", session_id)
                interview_ended.set()
            except Exception as exc:
                logger.error("Client relay error (session=%s): %s", session_id, exc)
                interview_ended.set()

        async def openai_to_client():
            """Relay events from OpenAI to browser client."""
            try:
                async for raw_msg in openai_ws:
                    if interview_ended.is_set():
                        break

                    event = json.loads(raw_msg)
                    client_msg = await _engine.handle_openai_event(session_id, event)

                    if client_msg:
                        await websocket.send_json(client_msg)

                        if client_msg.get("type") == "interview_complete":
                            interview_ended.set()
                            break

            except Exception as exc:
                logger.error("OpenAI relay error (session=%s): %s", session_id, exc)
                session = _engine.get_session(session_id)
                if session and session.status == RealtimeSessionStatus.ACTIVE:
                    session.status = RealtimeSessionStatus.INTERRUPTED
                interview_ended.set()

        # Run both relay tasks concurrently
        task_a = asyncio.create_task(client_to_openai())
        task_b = asyncio.create_task(openai_to_client())

        try:
            # Wait for either task to signal completion
            done, pending = await asyncio.wait(
                [task_a, task_b],
                return_when=asyncio.FIRST_COMPLETED,
            )
            # Cancel the other task
            for task in pending:
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
        finally:
            # Cleanup OpenAI connection
            try:
                await openai_ws.close()
            except Exception:
                pass

            # If session ended normally (has end_reason), transition to ENDING.
            # Only mark interrupted if there was no normal end reason.
            session = _engine.get_session(session_id)
            if session and session.status == RealtimeSessionStatus.ACTIVE:
                if session.end_reason:
                    # Normal completion path — transition to ENDING for end_session()
                    try:
                        _engine._transition(session_id, RealtimeSessionStatus.ENDING)
                    except ValueError:
                        pass
                else:
                    session.status = RealtimeSessionStatus.INTERRUPTED
                    session.end_reason = "ws_disconnect"

    except WebSocketDisconnect:
        logger.info("Client disconnected before init (session=%s)", session_id)
    except asyncio.TimeoutError:
        logger.warning("Init timeout (session=%s)", session_id)
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Init message timeout",
                "recoverable": False,
            })
            await websocket.close(code=1008)
        except Exception:
            pass
    except json.JSONDecodeError:
        logger.warning("Invalid JSON in init message")
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid JSON",
                "recoverable": False,
            })
            await websocket.close(code=1008)
        except Exception:
            pass
    except Exception as exc:
        logger.error("Unexpected error in realtime WS (session=%s): %s", session_id, exc)
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Internal server error",
                "recoverable": False,
            })
            await websocket.close(code=1011)
        except Exception:
            pass


# ── HTTP endpoint for evaluation results ──────────────────────────


@router.post("/{session_id}/end")
async def end_realtime_interview(session_id: str):
    """
    End a realtime interview session and return evaluation results.

    Called by the client after receiving 'interview_complete' via WebSocket.
    Extracts Q&A from transcript and runs batch evaluation.
    Returns summary scores + full Q&A list for backend storage.
    """
    from app.services.backend_client import mark_interview_token_used

    session = _engine.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    reason = session.end_reason or "api_call"

    try:
        summary = await _engine.end_session(session_id, reason)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if summary is None:
        raise HTTPException(
            status_code=422,
            detail="Could not evaluate interview — insufficient transcript data",
        )

    # Mark token as used (no re-take)
    token = None
    for t, sid in _token_session_map.items():
        if sid == session_id:
            token = t
            break
    if token:
        await mark_interview_token_used(token)

    # Build Q&A list from the session for backend storage
    qa_list = _engine.get_session_qa_pairs(session_id)

    response = summary.model_dump()
    response["qa_list"] = [
        {
            "questionSequence": qa.question_sequence,
            "questionCategory": qa.question_category,
            "questionText": qa.question_text,
            "candidateAnswerText": qa.candidate_answer_text,
        }
        for qa in qa_list
    ] if qa_list else []

    return response


@router.get("/{session_id}/status")
async def realtime_interview_status(session_id: str):
    """Get the current status of a realtime interview session."""
    session = _engine.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session.session_id,
        "status": session.status.value,
        "questions_asked": len(session.questions_asked),
        "transcript_entries": len(session.transcript),
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "end_reason": session.end_reason,
    }


# ── Setup endpoints (used by interview-room UI) ──────────────────

import tempfile
from pathlib import Path

from fastapi import UploadFile, File

from app.config import get_settings

setup_router = APIRouter(prefix="/interview/setup", tags=["Interview Setup"])


@setup_router.get("/job-postings")
async def get_job_postings():
    """Return available job postings for interview setup."""
    mock_dir = get_settings().mock_data_dir
    path = mock_dir / "sample_job_postings.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


@setup_router.post("/parse-cv")
async def parse_cv_for_interview(
    file: UploadFile = File(..., description="CV in PDF format"),
):
    """Upload and parse a CV PDF, return a structured summary for interview context."""
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
