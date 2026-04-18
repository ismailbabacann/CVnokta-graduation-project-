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
