"""Tests for the FastAPI endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4


class TestHealthEndpoints:
    """Test basic health and root endpoints."""

    def test_health(self, test_client):
        resp = test_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "cvnokta-ai-nlp"

    def test_root(self, test_client):
        resp = test_client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert "endpoints" in data
        assert "cv_analysis" in data["endpoints"]


class TestCVEndpoints:
    """Test CV analysis API endpoints."""

    def test_analyze_mock(self, test_client):
        resp = test_client.post(
            "/api/v1/cv/analyze-mock",
            params={"application_id": "test-app-123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "analysis_score" in data
        assert 0 <= data["analysis_score"] <= 100
        assert "matching_skills" in data
        assert "is_passed" in data

    def test_analyze_mock_deterministic(self, test_client):
        """Same application_id should produce same results."""
        resp1 = test_client.post(
            "/api/v1/cv/analyze-mock",
            params={"application_id": "deterministic-test"},
        )
        resp2 = test_client.post(
            "/api/v1/cv/analyze-mock",
            params={"application_id": "deterministic-test"},
        )
        assert resp1.json()["analysis_score"] == resp2.json()["analysis_score"]

    def test_analyze_upload_success(self, test_client, monkeypatch):
        from app.models.cv import CVAnalysisResult

        async def fake_score_cv(*args, **kwargs):
            req = args[0]
            return CVAnalysisResult(
                application_id=req.application_id,
                stage_id=req.stage_id,
                cv_id=req.cv_id,
                analysis_score=88.0,
                experience_match_score=84.0,
                education_match_score=82.0,
                matching_skills="Python, SQL",
                missing_skills="Kubernetes",
                overall_assessment="Strong baseline profile.",
                is_passed=True,
                analysis_date=datetime.utcnow(),
            )

        monkeypatch.setattr("app.api.v1.cv_analysis.score_cv", fake_score_cv)

        files = {
            "file": ("cv.pdf", b"%PDF-1.4 test", "application/pdf"),
        }
        data = {
            "job_posting_json": '{"job_title":"Backend Developer","required_skills":"Python,SQL","required_qualifications":"3+ years"}',
            "application_id": str(uuid4()),
            "stage_id": str(uuid4()),
            "cv_id": str(uuid4()),
        }

        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["analysis_score"] == 88.0
        assert payload["is_passed"] is True

    def test_analyze_upload_rejects_non_pdf(self, test_client):
        files = {
            "file": ("cv.txt", b"not-a-pdf", "text/plain"),
        }
        data = {
            "job_posting_json": '{"job_title":"Backend Developer"}',
        }
        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 400

    def test_analyze_upload_rejects_bad_pdf_signature(self, test_client):
        files = {
            "file": ("cv.pdf", b"not-pdf-content", "application/pdf"),
        }
        data = {
            "job_posting_json": '{"job_title":"Backend Developer"}',
        }
        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 400
        assert "signature" in str(resp.json()).lower()

    def test_analyze_upload_rejects_bad_job_posting_json(self, test_client):
        files = {
            "file": ("cv.pdf", b"%PDF-1.4 test", "application/pdf"),
        }
        data = {
            "job_posting_json": "{bad-json}",
        }
        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 400

    def test_analyze_upload_accepts_frontend_style_job_payload(self, test_client, monkeypatch):
        from app.models.cv import CVAnalysisResult

        async def fake_score_cv(*args, **kwargs):
            req = args[0]
            return CVAnalysisResult(
                application_id=req.application_id,
                stage_id=req.stage_id,
                cv_id=req.cv_id,
                analysis_score=77.0,
                experience_match_score=70.0,
                education_match_score=80.0,
                matching_skills="Python",
                missing_skills="SQL",
                overall_assessment="ok",
                is_passed=False,
                analysis_date=datetime.utcnow(),
            )

        monkeypatch.setattr("app.api.v1.cv_analysis.score_cv", fake_score_cv)

        files = {
            "file": ("cv.pdf", b"%PDF-1.4 test", "application/pdf"),
        }
        data = {
            "job_posting_json": '{"title":"Test2","company":"Unknown Company","location":"Antalya, TUR","required_skills":[]}',
        }

        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 200

    def test_analyze_upload_rejects_oversized_file(self, test_client, monkeypatch):
        from app.config import get_settings

        settings = get_settings()
        original = settings.cv_max_upload_size_mb
        monkeypatch.setattr(settings, "cv_max_upload_size_mb", 1)

        files = {
            "file": ("cv.pdf", b"x" * (1024 * 1024 + 1), "application/pdf"),
        }
        data = {
            "job_posting_json": '{"job_title":"Backend Developer"}',
        }

        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 413

        monkeypatch.setattr(settings, "cv_max_upload_size_mb", original)

    def test_analyze_upload_requires_openai_key_when_mock_disabled(self, test_client, monkeypatch):
        from app.config import get_settings

        settings = get_settings()
        original_use_mock_data = settings.use_mock_data
        original_openai_api_key = settings.openai_api_key

        monkeypatch.setattr(settings, "use_mock_data", False)
        monkeypatch.setattr(settings, "openai_api_key", "")

        files = {
            "file": ("cv.pdf", b"%PDF-1.4 test", "application/pdf"),
        }
        data = {
            "job_posting_json": '{"job_title":"Backend Developer"}',
        }

        resp = test_client.post("/api/v1/cv/analyze-upload", files=files, data=data)
        assert resp.status_code == 503

        monkeypatch.setattr(settings, "use_mock_data", original_use_mock_data)
        monkeypatch.setattr(settings, "openai_api_key", original_openai_api_key)


class TestTestEndpoints:
    """Test technical assessment & english test endpoints."""

    def test_generate_invalid_type(self, test_client):
        resp = test_client.post(
            "/api/v1/tests/invalid_type/generate",
            json={
                "job_posting": {
                    "job_title": "Developer",
                    "required_skills": "Python",
                },
            },
        )
        assert resp.status_code == 400

    def test_submit_invalid_type(self, test_client):
        resp = test_client.post(
            "/api/v1/tests/invalid_type/submit",
            json={
                "application_id": "test-001",
                "test_type": "invalid_type",
                "answers": [],
            },
        )
        assert resp.status_code == 400

    def test_submit_type_mismatch(self, test_client):
        resp = test_client.post(
            "/api/v1/tests/technical_assessment/submit",
            json={
                "application_id": "test-001",
                "test_type": "english_test",
                "answers": [{"question_id": "q1", "selected_option": 0}],
            },
        )
        assert resp.status_code == 400

    def test_submit_empty_answers(self, test_client):
        resp = test_client.post(
            "/api/v1/tests/technical_assessment/submit",
            json={
                "application_id": "test-001",
                "test_type": "technical_assessment",
                "answers": [],
            },
        )
        assert resp.status_code == 400

    def test_submit_no_generated_test(self, test_client):
        """Submit answers when no test has been generated → 404."""
        resp = test_client.post(
            "/api/v1/tests/technical_assessment/submit",
            json={
                "application_id": "test-001",
                "test_type": "technical_assessment",
                "job_posting_id": "nonexistent",
                "answers": [{"question_id": "tq-001", "selected_option": 0}],
            },
        )
        assert resp.status_code == 404


class TestRankingEndpoints:
    """Test ranking API endpoints."""

    def test_evaluate_single_candidate(self, test_client):
        resp = test_client.post(
            "/api/v1/rankings/evaluate",
            json={
                "application_id": "app-001",
                "candidate_id": "cand-001",
                "candidate_name": "Test User",
                "cv_score": 85.0,
                "general_test_score": 70.0,
                "english_test_score": 80.0,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "weighted_total" in data
        assert 0 <= data["weighted_total"] <= 100

    def test_rank_multiple_candidates(self, test_client):
        resp = test_client.post(
            "/api/v1/rankings/rank",
            json={
                "job_posting_id": "job-001",
                "candidates": [
                    {
                        "application_id": "app-1",
                        "candidate_id": "c-1",
                        "candidate_name": "Alice",
                        "cv_score": 90,
                        "general_test_score": 80,
                        "english_test_score": 85,
                    },
                    {
                        "application_id": "app-2",
                        "candidate_id": "c-2",
                        "candidate_name": "Bob",
                        "cv_score": 70,
                        "general_test_score": 60,
                        "english_test_score": 65,
                    },
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_candidates"] == 2
        assert data["rankings"][0]["rank_position"] == 1


class TestInterviewEndpoints:
    """Test interview placeholder endpoints."""

    def test_start_interview_not_implemented(self, test_client):
        resp = test_client.post(
            "/api/v1/interview/start",
            json={
                "application_id": "app-001",
                "job_posting_id": "job-001",
                "candidate_name": "Test",
            },
        )
        assert resp.status_code == 501
