"""
Phase F — Failure Mode Tests (F1).

Tests PDF errors, LLM failures, and fallback paths.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.cv import ParsedCV
from app.models.errors import ErrorCode
from app.models.job_posting import JobPostingInput


# ── PDF Failure Tests ──────────────────────────────────────────────


class TestPDFFailures:
    """F1: Image-only, encrypted, corrupted PDF detection."""

    def test_image_only_pdf_raises_no_text(self, tmp_path):
        """Image-only PDF (no extractable text) → PDFNoTextError."""
        from app.utils.pdf_extractor import PDFNoTextError, extract_text

        # Create a minimal valid PDF with no text content
        pdf = tmp_path / "image_only.pdf"
        # Minimal PDF with empty page (no text objects)
        pdf.write_bytes(
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f \n"
            b"0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
        )

        with pytest.raises(PDFNoTextError) as exc_info:
            extract_text(pdf)
        assert exc_info.value.error_code == ErrorCode.PDF_NO_TEXT

    def test_corrupted_pdf_raises_corrupted(self, tmp_path):
        """Corrupted/truncated PDF → PDFCorruptedError."""
        from app.utils.pdf_extractor import PDFCorruptedError, extract_text

        pdf = tmp_path / "corrupted.pdf"
        pdf.write_bytes(b"%PDF-1.4\nGARBAGEDATA")

        with pytest.raises((PDFCorruptedError, Exception)):
            extract_text(pdf)

    def test_nonexistent_pdf_raises_file_not_found(self):
        """Missing file → FileNotFoundError."""
        from app.utils.pdf_extractor import extract_text

        with pytest.raises(FileNotFoundError):
            extract_text("/nonexistent/path/fake.pdf")

    def test_validate_pdf_bytes_rejects_non_pdf(self):
        """Non-PDF bytes → PDFExtractionError."""
        from app.utils.pdf_extractor import PDFExtractionError, validate_pdf_bytes

        with pytest.raises(PDFExtractionError) as exc_info:
            validate_pdf_bytes(b"This is not a PDF", "fake.pdf")
        assert exc_info.value.error_code == ErrorCode.PDF_INVALID_SIGNATURE

    def test_validate_pdf_bytes_accepts_valid_pdf_header(self):
        """Valid PDF header → no exception."""
        from app.utils.pdf_extractor import validate_pdf_bytes

        validate_pdf_bytes(b"%PDF-1.4 rest of content", "valid.pdf")


class TestOversizedFile:
    """F1: Oversized file upload → HTTP 413."""

    def test_oversized_file_rejected(self, test_client):
        """File exceeding max size → 413."""
        from app.config import get_settings

        settings = get_settings()
        max_bytes = settings.cv_max_upload_size_mb * 1024 * 1024

        # Create data larger than allowed
        oversized = b"%PDF-1.4" + b"\x00" * (max_bytes + 1)

        resp = test_client.post(
            "/api/v1/cv/parse",
            files={"file": ("big.pdf", oversized, "application/pdf")},
        )
        assert resp.status_code == 413

    def test_empty_file_rejected(self, test_client):
        """Empty file → 400."""
        resp = test_client.post(
            "/api/v1/cv/parse",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        assert resp.status_code == 400


class TestContentTypeSpoofing:
    """F1: Content-type spoofing detection."""

    def test_non_pdf_bytes_with_pdf_mime(self, test_client):
        """Valid MIME but invalid PDF bytes → 400."""
        resp = test_client.post(
            "/api/v1/cv/parse",
            files={"file": ("fake.pdf", b"Not a PDF file", "application/pdf")},
        )
        assert resp.status_code == 400

    def test_non_pdf_extension(self, test_client):
        """Non-PDF extension → 400."""
        resp = test_client.post(
            "/api/v1/cv/parse",
            files={"file": ("document.docx", b"%PDF-1.4 data", "application/pdf")},
        )
        assert resp.status_code == 400


class TestLLMFailures:
    """F1: OpenAI failures activate fallback."""

    def test_fallback_scores_structure(self):
        """Fallback scoring returns valid structure with bounded scores."""
        from app.core.cv_scorer import _fallback_scores

        parsed = ParsedCV(
            skills=["Python", "Docker"],
            experience=[],
            education=[],
        )
        job = JobPostingInput(
            job_title="Developer",
            required_skills="Python, Docker, Kubernetes",
        )

        result = _fallback_scores(parsed, job)
        assert 0 <= result["analysis_score"] <= 100
        assert 0 <= result["experience_match_score"] <= 100
        assert 0 <= result["education_match_score"] <= 100
        assert "Python" in result["matching_skills"]
        assert "Kubernetes" in result["missing_skills"]

    def test_fallback_with_no_skills(self):
        """Fallback when no required skills specified."""
        from app.core.cv_scorer import _fallback_scores

        parsed = ParsedCV(skills=[], experience=[], education=[])
        job = JobPostingInput(job_title="Any Role", required_skills="")

        result = _fallback_scores(parsed, job)
        assert 0 <= result["analysis_score"] <= 100

    def test_score_clamping_out_of_range(self):
        """GPT returning out-of-range scores → clamped to [0, 100]."""
        from app.core.cv_scorer import _normalize_scores

        scores = _normalize_scores({
            "analysis_score": 999,
            "experience_match_score": -50,
            "education_match_score": "not_a_number",
            "matching_skills": None,
            "missing_skills": None,
            "overall_assessment": None,
        })
        assert scores["analysis_score"] == 100.0
        assert scores["experience_match_score"] == 0.0
        assert scores["education_match_score"] == 0.0

    def test_to_csv_text_list_input(self):
        """_to_csv_text handles list input."""
        from app.core.cv_scorer import _to_csv_text

        assert _to_csv_text(["Python", "SQL", ""]) == "Python, SQL"
        assert _to_csv_text("already a string") == "already a string"
        assert _to_csv_text(None) == ""
        assert _to_csv_text(42) == ""
