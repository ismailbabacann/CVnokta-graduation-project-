"""
Low-level PDF text extraction.

Wraps PyMuPDF (fitz) as the primary extractor with pdfplumber as fallback.
Raises typed errors for encrypted, corrupted, and image-only PDFs.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.models.errors import ErrorCode

logger = logging.getLogger(__name__)


class PDFExtractionError(RuntimeError):
    """Base class for PDF extraction failures with typed error codes."""

    def __init__(self, message: str, error_code: str) -> None:
        super().__init__(message)
        self.error_code = error_code


class PDFNoTextError(PDFExtractionError):
    """Raised when PDF yields no extractable text (image-only PDF)."""

    def __init__(self, path: str | Path) -> None:
        super().__init__(
            f"PDF contains no extractable text (likely image-only): {path}",
            ErrorCode.PDF_NO_TEXT,
        )


class PDFEncryptedError(PDFExtractionError):
    """Raised when PDF is password-protected."""

    def __init__(self, path: str | Path) -> None:
        super().__init__(
            f"PDF is password-protected and cannot be read: {path}",
            ErrorCode.PDF_ENCRYPTED,
        )


class PDFCorruptedError(PDFExtractionError):
    """Raised when PDF is corrupted or truncated."""

    def __init__(self, path: str | Path) -> None:
        super().__init__(
            f"PDF is corrupted or cannot be parsed: {path}",
            ErrorCode.PDF_CORRUPTED,
        )


def validate_pdf_bytes(content: bytes, filename: str = "upload.pdf") -> None:
    """
    Validate PDF file content before extraction.

    Checks:
    - PDF magic bytes (%PDF-)
    - Not encrypted (attempts to open with fitz)

    Raises:
        PDFExtractionError subtypes for specific failures.
    """
    if not content.startswith(b"%PDF-"):
        raise PDFExtractionError(
            f"Invalid PDF file signature: {filename}",
            ErrorCode.PDF_INVALID_SIGNATURE,
        )


def extract_text_pymupdf(pdf_path: str | Path) -> str:
    """Extract text from a PDF using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    try:
        doc = fitz.open(str(pdf_path))
    except Exception as exc:
        error_msg = str(exc).lower()
        if "password" in error_msg or "encrypted" in error_msg:
            raise PDFEncryptedError(pdf_path) from exc
        raise PDFCorruptedError(pdf_path) from exc

    # Check if encrypted and not decryptable
    if doc.is_encrypted:
        doc.close()
        raise PDFEncryptedError(pdf_path)

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

    try:
        pages: list[str] = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n".join(pages)
    except Exception as exc:
        error_msg = str(exc).lower()
        if "password" in error_msg or "encrypted" in error_msg:
            raise PDFEncryptedError(pdf_path) from exc
        raise PDFCorruptedError(pdf_path) from exc


def extract_text(pdf_path: str | Path) -> str:
    """
    Extract text from a PDF, trying PyMuPDF first then pdfplumber.

    Returns:
        Concatenated text of all pages.

    Raises:
        FileNotFoundError: if file does not exist.
        PDFNoTextError: if PDF yields no text (image-only).
        PDFEncryptedError: if PDF is password-protected.
        PDFCorruptedError: if PDF is corrupted or unreadable.
    """
    pdf_path = Path(pdf_path)

    # Try PyMuPDF first
    try:
        text = extract_text_pymupdf(pdf_path)
        if text.strip():
            return text
        logger.info("PyMuPDF returned empty text, falling back to pdfplumber")
    except (PDFEncryptedError, PDFCorruptedError):
        raise
    except FileNotFoundError:
        raise
    except Exception as exc:
        logger.warning("PyMuPDF extraction failed: %s – trying pdfplumber", exc)

    # Try pdfplumber as fallback
    try:
        text = extract_text_pdfplumber(pdf_path)
        if text.strip():
            return text
    except (PDFEncryptedError, PDFCorruptedError):
        raise
    except FileNotFoundError:
        raise
    except Exception as exc:
        logger.error("pdfplumber extraction also failed: %s", exc)
        raise PDFCorruptedError(pdf_path) from exc

    # Both extractors returned empty text — image-only PDF
    raise PDFNoTextError(pdf_path)
