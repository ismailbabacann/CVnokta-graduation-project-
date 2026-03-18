"""
CV-related models.

Maps to backend entities:
  - CvUpload   → CvUploadRef
  - CvAnalysisResult → CVAnalysisResult
  - (internal) → ParsedCV, Education, Experience, etc.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.job_posting import JobPostingInput


# ── Structured data extracted from a PDF CV ─────────────────────────


class Education(BaseModel):
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    institution: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    gpa: Optional[str] = None


class Experience(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    duration_months: Optional[int] = None


class ParsedCV(BaseModel):
    """Structured representation of a parsed CV."""

    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    linkedin: Optional[str] = None

    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)

    raw_text: Optional[str] = Field(None, exclude=True, description="Full extracted text")

    @property
    def total_experience_years(self) -> float:
        """Sum of all experience durations in years."""
        total_months = sum(
            (exp.duration_months or 0) for exp in self.experience
        )
        return round(total_months / 12, 1)

    @property
    def sections_text(self) -> List[str]:
        """Return a list of textual sections suitable for embedding."""
        sections: list[str] = []
        if self.summary:
            sections.append(f"Summary: {self.summary}")
        for edu in self.education:
            parts = [p for p in [edu.degree, edu.field_of_study, edu.institution] if p]
            if parts:
                sections.append(f"Education: {', '.join(parts)}")
        for exp in self.experience:
            parts = [p for p in [exp.title, exp.company, exp.description] if p]
            if parts:
                sections.append(f"Experience: {' – '.join(parts)}")
        if self.skills:
            sections.append(f"Skills: {', '.join(self.skills)}")
        if self.languages:
            sections.append(f"Languages: {', '.join(self.languages)}")
        if self.certifications:
            sections.append(f"Certifications: {', '.join(self.certifications)}")
        return sections


# ── CV analysis request & response ──────────────────────────────────


class CVAnalysisRequest(BaseModel):
    """Inbound request from the .NET backend (or mock)."""

    application_id: UUID
    stage_id: UUID
    cv_id: UUID
    cv_file_path: str = Field(..., description="Relative or absolute path to the PDF")
    job_posting: JobPostingInput


class CVAnalysisResult(BaseModel):
    """
    Outbound response — fields mirror backend entity CvAnalysisResult exactly.
    """

    application_id: UUID
    stage_id: UUID
    cv_id: UUID

    analysis_score: Optional[float] = Field(None, ge=0, le=100)
    experience_match_score: Optional[float] = Field(None, ge=0, le=100)
    education_match_score: Optional[float] = Field(None, ge=0, le=100)
    matching_skills: Optional[str] = None       # comma-separated
    missing_skills: Optional[str] = None        # comma-separated
    overall_assessment: Optional[str] = None
    is_passed: Optional[bool] = None

    analysis_date: datetime = Field(default_factory=datetime.utcnow)

    # Optional enrichment – not stored in backend but useful for debugging
    parsed_cv: Optional[ParsedCV] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "application_id": "00000000-0000-0000-0000-000000000001",
                "stage_id": "00000000-0000-0000-0000-000000000002",
                "cv_id": "00000000-0000-0000-0000-000000000003",
                "analysis_score": 87.5,
                "experience_match_score": 90.0,
                "education_match_score": 82.0,
                "matching_skills": "Python, AWS, IAM",
                "missing_skills": "Kubernetes, Terraform",
                "overall_assessment": "Strong candidate with relevant experience.",
                "is_passed": True,
            }
        }
    )
