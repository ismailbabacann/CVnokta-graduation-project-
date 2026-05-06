"""
Backend Callback Service — pushes AI-NLP results to the .NET backend.

Handles:
  - CV analysis score callbacks
  - Statistics push (skills, positions, locations)
  - Interview summary sync

All calls are fire-and-forget with error logging (never block the main response).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Reusable async client (connection pooling)
_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            verify=False,  # dev: backend uses self-signed cert on localhost
            follow_redirects=True,
        )
    return _client


async def _post(path: str, payload: Dict[str, Any]) -> bool:
    """POST JSON to backend. Returns True on success, False on failure."""
    settings = get_settings()
    url = f"{settings.backend_api_url}/{path.lstrip('/')}"

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if settings.backend_api_key:
        headers["X-Api-Key"] = settings.backend_api_key

    try:
        client = _get_client()
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code < 300:
            logger.info("Backend callback OK: POST %s → %d", path, resp.status_code)
            return True
        else:
            logger.warning(
                "Backend callback failed: POST %s → %d: %s",
                path, resp.status_code, resp.text[:300],
            )
            return False
    except Exception as exc:
        logger.error("Backend callback error: POST %s → %s", path, exc)
        return False


# ── CV Analysis Score ───────────────────────────────────────────────


async def push_cv_analysis_score(
    application_id: str,
    analysis_score: float,
    matching_skills: str,
    missing_skills: str,
    experience_match_score: float,
    education_match_score: float,
    overall_assessment: str,
) -> bool:
    """Push CV analysis result to backend's save-score endpoint."""
    return await _post("v1/cvanalysis/save-score", {
        "applicationId": application_id,
        "analysisScore": analysis_score,
        "matchingSkills": matching_skills,
        "missingSkills": missing_skills,
        "experienceMatchScore": experience_match_score,
        "educationMatchScore": education_match_score,
        "overallAssessment": overall_assessment,
    })


# ── Statistics Push ─────────────────────────────────────────────────


async def push_skills(skills: List[str]) -> bool:
    """Push extracted skills to backend statistics."""
    if not skills:
        return True
    return await _post("v1/Statistics/skills", {"skills": skills})


async def push_positions(positions: List[str]) -> bool:
    """Push extracted positions to backend statistics."""
    if not positions:
        return True
    return await _post("v1/Statistics/positions", {"positions": positions})


async def push_locations(locations: List[str]) -> bool:
    """Push extracted locations to backend statistics."""
    if not locations:
        return True
    return await _post("v1/Statistics/locations", {"locations": locations})


async def push_statistics_from_cv(
    skills: List[str],
    position_title: Optional[str] = None,
    location: Optional[str] = None,
) -> None:
    """Convenience: push all stats extracted from a CV parse."""
    if skills:
        await push_skills(skills)
    if position_title:
        await push_positions([position_title])
    if location:
        await push_locations([location])


# ── Interview Token Validation ──────────────────────────────────


async def validate_interview_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validate an interview token against the Backend.

    Returns token data dict on success, None on failure.
    Expected response: { isValid, isUsed, applicationId, jobPostingId,
                         candidateName, jobTitle, requiredSkills }
    """
    settings = get_settings()
    url = f"{settings.backend_api_url}/v1/Interviews/validate-token/{token}"

    headers: Dict[str, str] = {}
    if settings.backend_api_key:
        headers["X-Api-Key"] = settings.backend_api_key

    try:
        client = _get_client()
        resp = await client.get(url, headers=headers)
        if resp.status_code < 300:
            data = resp.json()
            if data.get("isValid") and not data.get("isUsed"):
                logger.info("Interview token validated: %s…", token[:8])
                return data
            reason = data.get("reason", "invalid or used")
            logger.warning("Interview token rejected (%s…): %s", token[:8], reason)
            return None
        logger.warning("Token validation failed: %d %s", resp.status_code, resp.text[:200])
        return None
    except Exception as exc:
        logger.error("Token validation error: %s", exc)
        return None


async def mark_interview_token_used(token: str) -> bool:
    """Mark an interview token as used in the Backend (no re-take)."""
    return await _post(f"v1/Interviews/mark-used/{token}", {})


async def fetch_cv_summary(application_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch CV summary for interview context from the Backend.

    Returns dict with candidateName, summary, skills, experience, education.
    """
    settings = get_settings()
    url = f"{settings.backend_api_url}/v1/Applications/{application_id}/cv-summary"

    headers: Dict[str, str] = {}
    if settings.backend_api_key:
        headers["X-Api-Key"] = settings.backend_api_key

    try:
        client = _get_client()
        resp = await client.get(url, headers=headers)
        if resp.status_code < 300:
            logger.info("CV summary fetched for application %s", application_id)
            return resp.json()
        logger.warning("CV summary fetch failed: %d %s", resp.status_code, resp.text[:200])
        return None
    except Exception as exc:
        logger.error("CV summary fetch error: %s", exc)
        return None


async def download_cv_pdf(cv_url: str) -> Optional[bytes]:
    """
    Download CV PDF from a Cloudinary (or any public) URL.

    Returns the raw PDF bytes, or None on failure.
    """
    if not cv_url:
        return None

    try:
        client = _get_client()
        resp = await client.get(cv_url)
        if resp.status_code < 300:
            content_type = resp.headers.get("content-type", "")
            if len(resp.content) < 100:
                logger.warning("CV download returned suspiciously small file (%d bytes)", len(resp.content))
                return None
            logger.info("CV PDF downloaded: %d bytes from %s", len(resp.content), cv_url[:80])
            return resp.content
        logger.warning("CV download failed: %d from %s", resp.status_code, cv_url[:80])
        return None
    except Exception as exc:
        logger.error("CV download error: %s", exc)
        return None


# ── Feedback Push ───────────────────────────────────────────────


async def push_feedback(
    application_id: str,
    feedback: Any,
) -> bool:
    """
    Push dual-perspective feedback (HR + Candidate) to Backend.

    Accepts a StageFeedback model and converts to camelCase JSON.
    Backend endpoint: POST v1/Feedback/save
    """
    from app.models.feedback import StageFeedback

    if not isinstance(feedback, StageFeedback):
        logger.error("push_feedback called with non-StageFeedback object")
        return False

    payload = {
        "applicationId": application_id,
        "stageType": feedback.stage.value,
        "hrStrengths": feedback.hr_feedback.strengths,
        "hrWeaknesses": feedback.hr_feedback.weaknesses,
        "hrOverall": feedback.hr_feedback.overall,
        "candidateStrengths": feedback.candidate_feedback.strengths,
        "candidateWeaknesses": feedback.candidate_feedback.weaknesses,
        "candidateOverall": feedback.candidate_feedback.overall,
    }

    return await _post("v1/Feedback/save", payload)
