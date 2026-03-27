"""
CV Analysis API endpoints.

POST /api/v1/cv/analyze       — Full analysis (PDF + RAG + GPT)
POST /api/v1/cv/parse         — Parse only (PDF → structured data, no GPT)
POST /api/v1/cv/analyze-mock  — Mock analysis (no GPT call, returns sample data)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel, Field, ValidationError
from typing import Optional

from app.api.deps import get_embedding_service, get_openai_service
from app.config import get_settings
from app.core.cv_parser import parse_cv_from_pdf
from app.core.cv_scorer import LLMUnavailableError, score_cv
from app.models.cv import CVAnalysisRequest, CVAnalysisResult, ParsedCV
from app.models.errors import ErrorCode
from app.models.job_posting import JobPostingInput
from app.utils.pdf_extractor import (
    PDFCorruptedError,
    PDFEncryptedError,
    PDFExtractionError,
    PDFNoTextError,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cv", tags=["CV Analysis"])

_ALLOWED_PDF_MIME_TYPES = {"application/pdf", "application/octet-stream"}


def _parse_uuid_or_generate(value: Optional[str], field_name: str) -> UUID:
    if not value:
        return uuid4()
    try:
        return UUID(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid UUID format for '{field_name}'.",
        ) from exc


def _validate_upload_file(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required.")

    safe_name = Path(file.filename).name
    if not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    if file.content_type and file.content_type not in _ALLOWED_PDF_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid content type. Expected PDF.",
        )


def _validate_content_size(content: bytes, max_size_mb: int) -> None:
    if not content:
        raise HTTPException(
            status_code=400,
            detail={"error_code": ErrorCode.FILE_EMPTY, "message": "Uploaded file is empty."},
        )

    max_bytes = max(1, max_size_mb) * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={"error_code": ErrorCode.PDF_TOO_LARGE, "message": f"File too large. Max size is {max_size_mb} MB."},
        )


def _validate_pdf_magic(content: bytes) -> None:
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail={"error_code": ErrorCode.PDF_INVALID_SIGNATURE, "message": "Invalid PDF file signature."},
        )


def _ensure_llm_ready_for_analysis() -> None:
    settings = get_settings()
    if not settings.use_mock_data and not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM scoring unavailable: OPENAI_API_KEY is required when USE_MOCK_DATA=false.",
        )


def _resolve_internal_pdf_path(raw_path: str) -> Path:
    settings = get_settings()
    project_root = settings.project_root.resolve()
    upload_root = (project_root / settings.cv_upload_dir).resolve()

    requested = Path(raw_path)
    candidate = requested if requested.is_absolute() else (project_root / requested)
    resolved = candidate.resolve()

    allowed_roots = (project_root, upload_root)
    if not any(resolved == root or root in resolved.parents for root in allowed_roots):
        raise HTTPException(
            status_code=400,
            detail="Invalid cv_file_path. Path must stay within allowed project directories.",
        )

    if resolved.suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    return resolved


def _parse_job_posting_json(raw_json: str) -> JobPostingInput:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON in job_posting_json.") from exc

    try:
        return JobPostingInput.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Invalid job_posting_json schema.", "errors": exc.errors()},
        ) from exc


@router.post("/analyze", response_model=CVAnalysisResult)
async def analyze_cv(request: CVAnalysisRequest):
    """
    Full CV analysis pipeline:
    1. Parse PDF → structured CV data
    2. Build RAG context (embeddings + FAISS)
    3. Score via GPT
    4. Return analysis result with pass/fail decision

    The cv_file_path must point to an accessible PDF file.
    """
    settings = get_settings()
    _ensure_llm_ready_for_analysis()

    # Validate file exists
    pdf_path = _resolve_internal_pdf_path(request.cv_file_path)

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"CV file not found: {request.cv_file_path}",
        )

    try:
        result = await score_cv(
            CVAnalysisRequest(
                application_id=request.application_id,
                stage_id=request.stage_id,
                cv_id=request.cv_id,
                cv_file_path=str(pdf_path),
                job_posting=request.job_posting,
            ),
            openai_service=get_openai_service(),
            embedding_service=get_embedding_service(),
        )
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error_code": ErrorCode.FILE_NOT_FOUND, "message": str(exc)})
    except PDFNoTextError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except PDFEncryptedError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except PDFCorruptedError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"error_code": ErrorCode.LLM_UNAVAILABLE, "message": str(exc)})
    except Exception as exc:
        logger.exception("CV analysis failed")
        raise HTTPException(status_code=500, detail={"error_code": ErrorCode.INTERNAL_ERROR, "message": "CV analysis failed due to an internal error."})


@router.post("/parse", response_model=ParsedCV)
async def parse_cv(
    file: UploadFile = File(..., description="PDF file to parse"),
):
    """
    Parse a PDF CV and return structured data.
    No GPT call — pure local extraction.
    Useful for testing the parser independently.
    """
    settings = get_settings()
    _validate_upload_file(file)

    upload_dir = settings.cv_upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename or "resume.pdf").name
    temp_path = upload_dir / f"temp_{uuid4().hex}_{safe_name}"
    try:
        content = await file.read()
        _validate_content_size(content, settings.cv_max_upload_size_mb)
        _validate_pdf_magic(content)
        temp_path.write_bytes(content)
        parsed = parse_cv_from_pdf(temp_path)
        return parsed
    except HTTPException:
        raise
    except PDFNoTextError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except PDFEncryptedError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except PDFCorruptedError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except Exception as exc:
        logger.exception("CV parsing failed")
        raise HTTPException(status_code=500, detail={"error_code": ErrorCode.INTERNAL_ERROR, "message": "CV parsing failed due to an internal error."})
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.post("/analyze-upload", response_model=CVAnalysisResult)
async def analyze_cv_upload(
    file: UploadFile = File(..., description="PDF CV file"),
    job_posting_json: str = Form(..., description="Job posting JSON payload"),
    application_id: Optional[str] = Form(None, description="Application UUID"),
    stage_id: Optional[str] = Form(None, description="Stage UUID"),
    cv_id: Optional[str] = Form(None, description="CV UUID"),
):
    """
    Upload-based CV analysis endpoint.

    Accepts multipart upload and avoids server-side file path dependency.
    """
    settings = get_settings()

    _validate_upload_file(file)
    _ensure_llm_ready_for_analysis()
    job_posting = _parse_job_posting_json(job_posting_json)

    upload_dir = settings.cv_upload_path
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename or "resume.pdf").name
    temp_path = upload_dir / f"upload_{uuid4().hex}_{safe_name}"

    try:
        content = await file.read()
        _validate_content_size(content, settings.cv_max_upload_size_mb)
        _validate_pdf_magic(content)

        temp_path.write_bytes(content)

        request = CVAnalysisRequest(
            application_id=_parse_uuid_or_generate(application_id, "application_id"),
            stage_id=_parse_uuid_or_generate(stage_id, "stage_id"),
            cv_id=_parse_uuid_or_generate(cv_id, "cv_id"),
            cv_file_path=str(temp_path),
            job_posting=job_posting,
        )

        return await score_cv(
            request,
            openai_service=get_openai_service(),
            embedding_service=get_embedding_service(),
        )
    except HTTPException:
        raise
    except PDFNoTextError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except PDFEncryptedError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except PDFCorruptedError as exc:
        raise HTTPException(status_code=422, detail={"error_code": exc.error_code, "message": str(exc)})
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"error_code": ErrorCode.LLM_UNAVAILABLE, "message": str(exc)})
    except Exception as exc:
        logger.exception("CV upload analysis failed")
        raise HTTPException(status_code=500, detail={"error_code": ErrorCode.INTERNAL_ERROR, "message": "CV analysis failed due to an internal error."})
    finally:
        if temp_path.exists():
            temp_path.unlink()


class CVAnalyzeMockRequest(BaseModel):
    """Simplified request for the mock endpoint — no UUIDs or job_posting required."""

    application_id: str = Field(..., description="Any string identifier")
    required_skills: Optional[str] = Field(
        "Python, SQL, AWS",
        description="Comma-separated skills for mock matching",
    )
    min_match_score: int = Field(85, ge=0, le=100)


@router.post("/analyze-mock")
async def analyze_cv_mock(
    request: Optional[CVAnalyzeMockRequest] = None,
    application_id: Optional[str] = Query(None),
):
    """
    Mock CV analysis endpoint — returns realistic fake data.
    Use this when the OpenAI API key is not available or for frontend testing.
    Does NOT require the PDF file to exist.

    Accepts either a JSON body or a query-param ``application_id``.
    """
    import random

    # Allow both body and query-param usage
    if request is None:
        if application_id is None:
            raise HTTPException(
                status_code=400, detail="Provide application_id (query or body)."
            )
        request = CVAnalyzeMockRequest(application_id=application_id)

    rng = random.Random(request.application_id)
    analysis_score = round(rng.uniform(60, 98), 1)
    exp_score = round(rng.uniform(55, 100), 1)
    edu_score = round(rng.uniform(50, 100), 1)

    settings = get_settings()
    threshold = request.min_match_score or settings.cv_pass_threshold

    all_skills = (request.required_skills or "Python, SQL, AWS").split(",")
    all_skills = [s.strip() for s in all_skills if s.strip()]
    rng.shuffle(all_skills)
    split_point = rng.randint(1, max(1, len(all_skills) - 1))
    matching = all_skills[:split_point]
    missing = all_skills[split_point:]

    mock_uuid = "00000000-0000-0000-0000-000000000000"

    return {
        "application_id": request.application_id,
        "analysis_score": analysis_score,
        "experience_match_score": exp_score,
        "education_match_score": edu_score,
        "matching_skills": ", ".join(matching),
        "missing_skills": ", ".join(missing),
        "overall_assessment": (
            f"Mock analysis: Candidate scored {analysis_score}/100. "
            f"Experience alignment is {'strong' if exp_score > 75 else 'moderate'}. "
            f"Education match is {'excellent' if edu_score > 80 else 'adequate'}."
        ),
        "is_passed": analysis_score >= threshold,
    }
