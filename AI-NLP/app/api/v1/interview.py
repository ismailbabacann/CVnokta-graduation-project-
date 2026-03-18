"""
Interview API endpoints — Placeholder for Phase 2.

Future implementation will include:
- POST   /api/v1/interview/start       — Start a new AI interview session
- POST   /api/v1/interview/answer      — Submit answer & get follow-up
- POST   /api/v1/interview/end         — End session & get evaluation
- WS     /api/v1/interview/ws/{session} — Real-time WebSocket for avatar

Currently all endpoints return 501 Not Implemented.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.models.interview import InterviewSession, InterviewSummary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["Interview (Phase 2)"])


# ── Request schemas ────────────────────────────────────────────────────
class StartInterviewRequest(BaseModel):
    application_id: str = Field(..., description="Guid of JobApplication")
    job_posting_id: str = Field(..., description="Guid of JobPosting")
    candidate_name: str = Field("Candidate", description="Display name")
    language: str = Field("en", description="Interview language (en/tr)")


class AnswerRequest(BaseModel):
    session_id: str = Field(..., description="Interview session ID")
    question_index: int = Field(..., ge=0, description="0-based question index")
    answer_text: str = Field(..., min_length=1, description="Candidate's answer")


# ── Endpoints ──────────────────────────────────────────────────────────

_NOT_IMPL_MSG = (
    "AI Interview module is planned for Phase 2. "
    "This endpoint is a placeholder — see Introduction.md for the roadmap."
)


@router.post("/start", response_model=InterviewSession, status_code=501)
async def start_interview(req: StartInterviewRequest):
    """Start a new AI interview session. *Not yet implemented.*"""
    raise HTTPException(status_code=501, detail=_NOT_IMPL_MSG)


@router.post("/answer", status_code=501)
async def submit_answer(req: AnswerRequest):
    """Submit an answer and receive a follow-up question. *Not yet implemented.*"""
    raise HTTPException(status_code=501, detail=_NOT_IMPL_MSG)


@router.post("/end", response_model=InterviewSummary, status_code=501)
async def end_interview(session_id: str):
    """End the session and receive the evaluation summary. *Not yet implemented.*"""
    raise HTTPException(status_code=501, detail=_NOT_IMPL_MSG)


@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    """
    Real-time WebSocket for the 3D avatar interview experience.

    *Not yet implemented — will integrate with Three.js / Ready Player Me
    avatar on the frontend side.*
    """
    await websocket.accept()
    await websocket.send_json(
        {
            "type": "error",
            "message": _NOT_IMPL_MSG,
        }
    )
    await websocket.close(code=1000, reason="Not implemented")
