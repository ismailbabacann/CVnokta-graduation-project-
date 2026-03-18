"""
Interview Engine — placeholder for future AI Video Interview implementation.

This module defines the interfaces and stub functions that will be
implemented when the video interview feature is built.
"""

from __future__ import annotations

import logging
from typing import List, Optional
from uuid import UUID

from app.models.interview import (
    InterviewQA,
    InterviewSession,
    InterviewSummary,
)

logger = logging.getLogger(__name__)


class InterviewEngine:
    """
    Placeholder interview engine.

    All methods raise NotImplementedError with a descriptive message.
    This ensures early detection if anyone tries to use the interview
    feature before it's implemented.
    """

    async def start_session(
        self,
        application_id: UUID,
        job_posting_id: UUID,
        cv_id: UUID,
        stage_id: UUID,
    ) -> InterviewSession:
        """Create a new interview session and generate the first question."""
        raise NotImplementedError(
            "AI Video Interview is not yet implemented. "
            "This feature is planned for a future release."
        )

    async def generate_question(
        self,
        session_id: UUID,
        previous_qa: Optional[List[InterviewQA]] = None,
    ) -> str:
        """Generate the next interview question based on context."""
        raise NotImplementedError("Interview question generation not yet implemented.")

    async def evaluate_answer(
        self,
        session_id: UUID,
        question_text: str,
        answer_text: str,
    ) -> InterviewQA:
        """Evaluate a candidate's answer to an interview question."""
        raise NotImplementedError("Interview answer evaluation not yet implemented.")

    async def generate_summary(
        self,
        session_id: UUID,
        application_id: UUID,
        qa_pairs: List[InterviewQA],
    ) -> InterviewSummary:
        """Generate a comprehensive interview summary from all Q&A pairs."""
        raise NotImplementedError("Interview summary generation not yet implemented.")
