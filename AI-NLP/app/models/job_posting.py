"""
Job-posting models.

Maps to backend entity: CleanArchitecture.Core.Entities.JobPosting
Only the fields relevant to the AI-NLP service are included;
navigation properties & audit columns are omitted.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


class JobPostingInput(BaseModel):
    """Subset of JobPosting received from the backend for CV analysis / scoring."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_title": "Security Engineer - IAM",
                "department": "Engineering",
                "required_qualifications": "5+ years IAM experience, CISSP certification",
                "required_skills": "Python, AWS, OAuth2, Kubernetes",
                "responsibilities": "Design and implement IAM solutions",
                "min_match_score": 85,
            }
        }
    )

    id: Optional[UUID] = None
    # Accept both canonical backend key (job_title) and temporary frontend key (title).
    job_title: str = Field(
        ...,
        description="Position title",
        validation_alias=AliasChoices("job_title", "title"),
    )
    department: Optional[str] = None
    location: Optional[str] = None
    work_type: Optional[str] = None          # FullTime / PartTime / Contract / Internship
    work_model: Optional[str] = None         # Remote / Hybrid / OnSite

    about_company: Optional[str] = None
    responsibilities: Optional[str] = None   # rich text / HTML
    required_qualifications: Optional[str] = None  # rich text / HTML
    required_skills: Optional[str] = None    # legacy comma-separated

    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    total_positions: int = 1

    # AI settings
    ai_scan_enabled: bool = True
    min_match_score: int = Field(
        85,
        ge=0,
        le=100,
        description=(
            "Per-posting CV pass threshold (0-100). "
            "Overrides the global CV_PASS_THRESHOLD setting. "
            "Candidates scoring below this are marked is_passed=false."
        ),
    )
    auto_email_enabled: bool = False

    benefits: Optional[str] = None           # comma-separated
    status: Optional[str] = "Active"
    posted_date: Optional[datetime] = None
    closing_date: Optional[datetime] = None

    @field_validator("required_skills", mode="before")
    @classmethod
    def _normalize_required_skills(cls, value):
        # Frontend may send a list; scorer expects a comma-separated string.
        if isinstance(value, list):
            normalized = [str(item).strip() for item in value if str(item).strip()]
            return ", ".join(normalized) if normalized else None
        return value
