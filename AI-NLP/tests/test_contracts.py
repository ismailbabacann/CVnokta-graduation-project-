"""
Phase F — Contract Tests (F2).

Verify API responses match defined schemas for both success and error paths.
"""

from __future__ import annotations

import pytest


class TestErrorResponseSchema:
    """F2: Error responses match defined error schema structure."""

    def test_invalid_test_type_error_shape(self, test_client):
        """Invalid test type → 400 with detail message."""
        resp = test_client.post(
            "/api/v1/tests/invalid_type/generate",
            json={"job_posting": {"job_title": "Dev", "required_skills": "Python"}},
        )
        assert resp.status_code == 400
        data = resp.json()
        assert "detail" in data

    def test_invalid_uuid_error_shape(self, test_client):
        """Invalid UUID → 400 with detail message."""
        resp = test_client.post(
            "/api/v1/cv/analyze",
            json={
                "application_id": "not-a-uuid",
                "stage_id": "not-a-uuid",
                "cv_id": "not-a-uuid",
                "cv_file_path": "some.pdf",
                "job_posting": {"job_title": "Dev"},
            },
        )
        assert resp.status_code == 422  # Pydantic validation

    def test_missing_required_field_error_shape(self, test_client):
        """Missing required field → 422."""
        resp = test_client.post(
            "/api/v1/cv/analyze",
            json={"application_id": "abc"},  # Missing many fields
        )
        assert resp.status_code == 422


class TestSuccessResponseSchema:
    """F2: Success responses have all expected fields."""

    def test_health_endpoint_schema(self, test_client):
        resp = test_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_ranking_evaluate_schema(self, test_client):
        """Evaluate endpoint returns FinalEvaluation with all fields."""
        resp = test_client.post(
            "/api/v1/rankings/evaluate",
            json={
                "application_id": "app-001",
                "candidate_id": "cand-001",
                "candidate_name": "Test",
                "cv_score": 80.0,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        required_fields = [
            "application_id", "candidate_id", "candidate_name",
            "cv_score", "weighted_total", "evaluation_status",
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_ranking_rank_schema(self, test_client):
        """Rank endpoint returns RankingResponse."""
        resp = test_client.post(
            "/api/v1/rankings/rank",
            json={
                "job_posting_id": "jp-001",
                "candidates": [
                    {"application_id": "a1", "candidate_id": "c1", "candidate_name": "A", "cv_score": 90},
                    {"application_id": "a2", "candidate_id": "c2", "candidate_name": "B", "cv_score": 70},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "rankings" in data
        assert "total_candidates" in data
        assert data["total_candidates"] == 2
        for r in data["rankings"]:
            assert "rank_position" in r
            assert "weighted_total" in r

    def test_middleware_headers(self, test_client):
        """API responses include required headers."""
        resp = test_client.get("/health")
        assert "x-api-version" in resp.headers
        assert "x-response-time-ms" in resp.headers
        assert "x-request-id" in resp.headers


class TestEndpointAvailability:
    """F2: All documented endpoints respond (not 404)."""

    @pytest.mark.parametrize("path,method", [
        ("/health", "get"),
        ("/api/v1/cv/parse", "post"),
        ("/api/v1/cv/analyze", "post"),
        ("/api/v1/cv/analyze-mock", "post"),
        ("/api/v1/rankings/evaluate", "post"),
        ("/api/v1/rankings/rank", "post"),
        ("/api/v1/tests/technical_assessment/generate", "post"),
        ("/api/v1/tests/technical_assessment/submit", "post"),
        ("/api/v1/tests/english_test/generate", "post"),
        ("/api/v1/tests/english_test/submit", "post"),
    ])
    def test_endpoint_exists(self, test_client, path, method):
        """Endpoints exist (may return 4xx for missing body, but not 404/405)."""
        fn = getattr(test_client, method)
        if method == "post":
            resp = fn(path, json={})
        else:
            resp = fn(path)
        assert resp.status_code != 404, f"{method.upper()} {path} returned 404"
        assert resp.status_code != 405, f"{method.upper()} {path} returned 405"
