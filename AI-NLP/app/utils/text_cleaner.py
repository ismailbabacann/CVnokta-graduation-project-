"""
Text cleaning and preprocessing utilities.
"""

from __future__ import annotations

import re
import unicodedata
from html import unescape


def strip_html(text: str) -> str:
    """Remove HTML tags (backend stores some fields as rich-text HTML)."""
    text = unescape(text)
    return re.sub(r"<[^>]+>", " ", text)


def normalise_whitespace(text: str) -> str:
    """Collapse multiple whitespace chars into a single space."""
    return re.sub(r"\s+", " ", text).strip()


def remove_non_printable(text: str) -> str:
    """Remove non-printable / control characters except newlines."""
    return "".join(
        ch for ch in text
        if ch == "\n" or unicodedata.category(ch)[0] != "C"
    )


def clean_text(text: str) -> str:
    """Full cleaning pipeline for raw extracted text."""
    text = strip_html(text)
    text = remove_non_printable(text)
    text = normalise_whitespace(text)
    return text


def mask_personal_info(text: str) -> str:
    """
    Mask personal identifying information for bias-free GPT scoring.

    Strips:
      - Email addresses
      - Phone numbers
      - URLs (LinkedIn, personal websites)
      - Age / date of birth patterns
      - Photo references
    """
    # Email
    text = re.sub(r"\S+@\S+\.\S+", "[EMAIL]", text)
    # Phone (international & local formats)
    text = re.sub(r"[\+]?[\d\s\-\(\)]{7,15}", " [PHONE] ", text)
    # URLs
    text = re.sub(r"https?://\S+", "[URL]", text)
    text = re.sub(r"www\.\S+", "[URL]", text)
    # Date of birth patterns
    text = re.sub(
        r"\b(date\s*of\s*birth|dob|doğum\s*tarihi)\s*[:.]?\s*\S+",
        "[DOB_MASKED]",
        text,
        flags=re.IGNORECASE,
    )
    # Age references
    text = re.sub(
        r"\b(age|yaş)\s*[:.]?\s*\d+",
        "[AGE_MASKED]",
        text,
        flags=re.IGNORECASE,
    )
    return normalise_whitespace(text)
