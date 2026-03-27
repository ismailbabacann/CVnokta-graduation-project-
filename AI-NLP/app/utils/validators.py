"""
Input validation helpers shared across the application.
"""

from __future__ import annotations

from pathlib import Path
from uuid import UUID


def validate_pdf_path(path: str) -> Path:
    """Ensure the file exists and has a .pdf extension."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")
    if p.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file, got: {p.suffix}")
    return p


def validate_uuid(value: str) -> UUID:
    """Parse a string as UUID, raising ValueError on failure."""
    try:
        return UUID(value)
    except (ValueError, AttributeError) as exc:
        raise ValueError(f"Invalid UUID: {value}") from exc


def validate_test_type(test_type: str) -> str:
    """Ensure test_type is one of the allowed values."""
    allowed = {"technical_assessment", "english_test"}
    normalised = test_type.lower().strip()
    if normalised not in allowed:
        raise ValueError(
            f"Invalid test_type '{test_type}'. Allowed: {', '.join(sorted(allowed))}"
        )
    return normalised
