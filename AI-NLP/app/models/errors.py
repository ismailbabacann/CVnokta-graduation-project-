"""
Standardized error codes and error response model.

Every known failure mode maps to a typed error code for structured logging
and consistent API responses.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Error Codes ────────────────────────────────────────────────────

class ErrorCode:
    """Typed error codes for the AI-NLP service."""

    # PDF errors
    PDF_NO_TEXT = "PDF_NO_TEXT"
    PDF_ENCRYPTED = "PDF_ENCRYPTED"
    PDF_CORRUPTED = "PDF_CORRUPTED"
    PDF_INVALID_SIGNATURE = "PDF_INVALID_SIGNATURE"
    PDF_TOO_LARGE = "PDF_TOO_LARGE"

    # LLM errors
    LLM_TIMEOUT = "LLM_TIMEOUT"
    LLM_RATE_LIMITED = "LLM_RATE_LIMITED"
    LLM_UNAVAILABLE = "LLM_UNAVAILABLE"
    LLM_ERROR = "LLM_ERROR"

    # Parse errors
    JSON_PARSE_FAILED = "JSON_PARSE_FAILED"

    # Validation errors
    INVALID_INPUT = "INVALID_INPUT"
    INVALID_UUID = "INVALID_UUID"
    INVALID_TEST_TYPE = "INVALID_TEST_TYPE"
    FILE_EMPTY = "FILE_EMPTY"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"

    # General
    INTERNAL_ERROR = "INTERNAL_ERROR"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"


# ── Error Response Model ──────────────────────────────────────────

class ErrorDetail(BaseModel):
    """Standardized error response returned by all endpoints."""

    error_code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    request_id: Optional[str] = Field(None, description="Correlation request ID")
    details: Optional[Any] = Field(None, description="Additional error context")
