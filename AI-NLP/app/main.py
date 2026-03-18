"""
CVnokta AI-NLP Micro-service — FastAPI entry point.

Run:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

# ── Logging ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cvnokta.ai")

settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup & shutdown."""
    logger.info("🚀 CVnokta AI-NLP service starting up …")
    logger.info("   Environment : %s", settings.app_env)
    logger.info("   Debug       : %s", settings.app_debug)
    logger.info("   Data dir    : %s", settings.data_dir)

    # Ensure data directories exist
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.mock_data_dir.mkdir(parents=True, exist_ok=True)
    settings.test_questions_dir.mkdir(parents=True, exist_ok=True)

    yield  # ← application runs here

    logger.info("👋 CVnokta AI-NLP service shutting down …")


# ── FastAPI app ────────────────────────────────────────────────────────
app = FastAPI(
    title="CVnokta AI-NLP Service",
    description=(
        "AI-powered recruitment pipeline: CV analysis (RAG), "
        "aptitude & English tests, candidate ranking, and (future) "
        "AI avatar interview."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── CORS ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────
from app.api.v1.cv_analysis import router as cv_router  # noqa: E402
from app.api.v1.interview import router as interview_router  # noqa: E402
from app.api.v1.rankings import router as rankings_router  # noqa: E402
from app.api.v1.tests import router as tests_router  # noqa: E402

app.include_router(cv_router, prefix="/api/v1")
app.include_router(tests_router, prefix="/api/v1")
app.include_router(rankings_router, prefix="/api/v1")
app.include_router(interview_router, prefix="/api/v1")


# ── Health check ───────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    """Simple liveness probe."""
    return {"status": "healthy", "service": "cvnokta-ai-nlp", "version": "0.1.0"}


@app.get("/", tags=["Health"])
async def root():
    """Redirect-friendly root that describes the service."""
    return {
        "service": "CVnokta AI-NLP",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "cv_analysis": "/api/v1/cv",
            "tests": "/api/v1/tests",
            "rankings": "/api/v1/rankings",
            "interview": "/api/v1/interview",
        },
    }
