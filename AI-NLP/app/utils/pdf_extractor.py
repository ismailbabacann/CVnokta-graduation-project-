"""
Low-level PDF text extraction.

Wraps PyMuPDF (fitz) as the primary extractor with pdfplumber as fallback.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_pymupdf(pdf_path: str | Path) -> str:
    """Extract text from a PDF using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = fitz.open(str(pdf_path))
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()

    return "\n".join(pages)


def extract_text_pdfplumber(pdf_path: str | Path) -> str:
    """Fallback PDF extractor using pdfplumber (better for tables)."""
    import pdfplumber

    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    pages: list[str] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)

    return "\n".join(pages)


def extract_text(pdf_path: str | Path) -> str:
    """
    Extract text from a PDF, trying PyMuPDF first then pdfplumber.

    Returns:
        Concatenated text of all pages.

    Raises:
        FileNotFoundError: if file does not exist.
        RuntimeError: if both extractors fail.
    """
    try:
        text = extract_text_pymupdf(pdf_path)
        if text.strip():
            return text
        logger.info("PyMuPDF returned empty text, falling back to pdfplumber")
    except Exception as exc:
        logger.warning("PyMuPDF extraction failed: %s – trying pdfplumber", exc)

    try:
        text = extract_text_pdfplumber(pdf_path)
        if text.strip():
            return text
    except Exception as exc:
        logger.error("pdfplumber extraction also failed: %s", exc)
        raise RuntimeError(f"Could not extract text from {pdf_path}") from exc

    raise RuntimeError(f"All extractors returned empty text for {pdf_path}")
