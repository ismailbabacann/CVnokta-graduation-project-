"""
Pytest fixtures shared across all test modules.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Generator

import pytest

# Ensure app package is importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("APP_DEBUG", "true")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-testing")


@pytest.fixture(scope="session")
def app_settings():
    """Return the global settings singleton."""
    from app.config import get_settings

    return get_settings()


@pytest.fixture(scope="session")
def sample_job_posting_dict() -> dict:
    """Load the first sample job posting from mock data."""
    path = ROOT / "data" / "mock" / "sample_job_postings.json"
    with open(path) as f:
        return json.load(f)[0]


@pytest.fixture(scope="session")
def sample_cv_parsed_dict() -> dict:
    """Load the first sample parsed CV from mock data."""
    path = ROOT / "data" / "mock" / "sample_cv_parsed.json"
    with open(path) as f:
        return json.load(f)[0]


@pytest.fixture(scope="session")
def sample_cv_text() -> str:
    """Generate a realistic plain-text CV string for testing."""
    return """
AHMET YILMAZ
ahmet.yilmaz@email.com | +90 532 123 4567
linkedin.com/in/ahmetyilmaz

SUMMARY
Experienced backend developer with 6 years of experience in .NET Core and Python.
Passionate about clean architecture, microservices, and cloud-native development.

EDUCATION
BSc Computer Engineering — Istanbul Technical University (2014–2018) GPA: 3.45
MSc Software Engineering — Bogazici University (2018–2020) GPA: 3.72

EXPERIENCE
Senior Backend Developer | CloudScale Teknoloji | Sep 2020 – Present
- Designed microservice architecture using .NET Core and Docker
- Implemented CI/CD with GitHub Actions
- Led team of 4 developers
- Managed Kubernetes deployments on Azure

Junior Backend Developer | TechCorp Istanbul | Jun 2018 – Aug 2020
- Developed REST APIs using ASP.NET Core
- Managed PostgreSQL databases
- Participated in code reviews

SKILLS
.NET Core, C#, Python, Docker, Kubernetes, PostgreSQL, Redis, RabbitMQ, REST API, Git, Azure

LANGUAGES
Turkish (Native), English (Professional)

CERTIFICATIONS
Azure Developer Associate
Docker Certified Associate
""".strip()


@pytest.fixture(scope="session")
def test_client() -> Generator:
    """Create a FastAPI TestClient."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as client:
        yield client
