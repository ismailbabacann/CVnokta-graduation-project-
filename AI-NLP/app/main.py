"""
CVnokta AI-NLP Micro-service — FastAPI entry point.

Run:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.middleware import RequestTrackingMiddleware

# ── Logging ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cvnokta.ai")

settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────
async def _session_eviction_loop():
    """Periodically evict expired realtime sessions."""
    from app.api.v1.realtime_interview import get_realtime_engine
    engine = get_realtime_engine()
    while True:
        await asyncio.sleep(120)
        try:
            engine.evict_expired_sessions()
        except Exception as exc:
            logger.warning("Session eviction error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup & shutdown."""
    logger.info("🚀 CVnokta AI-NLP service starting up …")
    logger.info("   Environment : %s", settings.app_env)
    logger.info("   Debug       : %s", settings.app_debug)
    logger.info("   Data dir    : %s", settings.data_dir)
    logger.info("   Embedding   : %s", settings.embedding_model)
    logger.info("   LLM cache   : %s (max=%d, ttl=%ds)",
                "enabled" if settings.llm_cache_enabled else "disabled",
                settings.llm_cache_max_size, settings.llm_cache_ttl_seconds)

    # FAISS thread safety notice
    logger.info("   ⚠ FAISS: per-request indexes — safe for single-worker deployment")

    # Ensure data directories exist
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.mock_data_dir.mkdir(parents=True, exist_ok=True)
    settings.test_questions_dir.mkdir(parents=True, exist_ok=True)

    # Start background session eviction task
    eviction_task = asyncio.create_task(_session_eviction_loop())

    yield  # ← application runs here

    eviction_task.cancel()
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

# ── Request tracking ──────────────────────────────────────────────────
app.add_middleware(RequestTrackingMiddleware)

# ── Routers ────────────────────────────────────────────────────────────
from app.api.v1.cv_analysis import router as cv_router  # noqa: E402
from app.api.v1.interview import router as interview_router  # noqa: E402
from app.api.v1.rankings import router as rankings_router  # noqa: E402
from app.api.v1.realtime_interview import router as realtime_router  # noqa: E402
from app.api.v1.tests import router as tests_router  # noqa: E402

app.include_router(cv_router, prefix="/api/v1")
app.include_router(tests_router, prefix="/api/v1")
app.include_router(rankings_router, prefix="/api/v1")
app.include_router(interview_router, prefix="/api/v1")
app.include_router(realtime_router, prefix="/api/v1")

# ── Static files (interview room UI) ───────────────────────────────────
_static_dir = Path(__file__).resolve().parent / "static"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


# ── Interview Room pages ──────────────────────────────────────────────
@app.get("/interview-room", include_in_schema=False)
async def interview_room():
    """Serve the AI Video Interview room HTML page (HTTP turn-based)."""
    html_path = _static_dir / "interview-room" / "index.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Interview room UI not found. Ensure static assets are included in the deployment.")
    return FileResponse(str(html_path), media_type="text/html")


@app.get("/realtime-interview", include_in_schema=False)
@app.get("/demo", include_in_schema=False)
async def realtime_interview_room():
    """Serve the Realtime Voice Interview page (WebSocket-based)."""
    html_path = _static_dir / "interview-room" / "realtime.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Realtime interview UI not found. Ensure static assets are included in the deployment.")
    return FileResponse(str(html_path), media_type="text/html")


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
        "config": "/config",
        "interview_room": "/interview-room",
        "realtime_interview": "/realtime-interview",
        "endpoints": {
            "cv_analysis": "/api/v1/cv",
            "tests": "/api/v1/tests",
            "rankings": "/api/v1/rankings",
            "interview": "/api/v1/interview",
            "realtime_interview": "/api/v1/interview/realtime",
        },
    }


@app.get("/config", tags=["Health"])
async def get_config():
    """
    Return current server-side configuration defaults.

    Useful for frontends to discover thresholds, weight distributions,
    and question counts without hardcoding them.
    """
    s = get_settings()
    return {
        "cv_pass_threshold": s.cv_pass_threshold,
        "cv_max_upload_size_mb": s.cv_max_upload_size_mb,
        "ranking_weights": s.ranking_weights,
        "technical_test_question_count": s.technical_test_question_count,
        "technical_test_time_limit_minutes": s.technical_test_time_limit_minutes,
        "english_test_question_count": s.english_test_question_count,
        "english_test_time_limit_minutes": s.english_test_time_limit_minutes,
        "llm_model": s.openai_model,
        "embedding_model": s.embedding_model,
        "llm_fallback_enabled": s.llm_fallback_enabled,
    }


# ── Performance metrics (Phase H) ─────────────────────────────────────
@app.get("/metrics/latency", tags=["Performance"])
async def latency_metrics():
    """
    Return collected per-stage latency statistics.

    Stages tracked: cv_parsing, rag_context, llm_scoring,
    fallback_scoring, pdf_extraction, embedding, etc.
    """
    from app.utils.logging import get_latency_collector

    collector = get_latency_collector()
    stats = collector.get_stats()

    # LLM cache stats
    from app.services.openai_service import get_llm_cache
    cache_stats = get_llm_cache().stats

    # Performance targets from roadmap
    targets = {
        "cv_parsing": 100,
        "pdf_extraction": 200,
        "rag_context": 500,
        "llm_scoring": 4000,
        "fallback_scoring": 50,
        "embedding": 500,
    }

    return {
        "stages": stats,
        "targets_ms": targets,
        "llm_cache": cache_stats,
        "note": "Run requests through the pipeline to collect latency samples.",
    }


@app.post("/benchmark", tags=["Performance"])
async def run_benchmark():
    """
    Run a full fallback pipeline with synthetic data and report per-stage latencies.

    Does NOT call OpenAI — uses deterministic fallback only.
    Useful for measuring local processing performance.
    """
    import time

    from app.core.cv_parser import parse_cv_from_text
    from app.core.cv_scorer import _fallback_scores, _normalize_scores
    from app.core.ranking_engine import build_final_evaluation, rank_candidates
    from app.models.job_posting import JobPostingInput
    from app.services.embedding_service import EmbeddingService
    from app.services.vector_store import VectorStore
    from app.utils.text_cleaner import clean_text, mask_personal_info
    from app.utils.logging import get_latency_collector

    synthetic_cv = """
    Ahmet Yılmaz
    ahmet@email.com | +90 555 123 4567
    Istanbul, Turkey

    SUMMARY
    Senior software engineer with 8 years of experience in backend development.

    EDUCATION
    Bachelor of Computer Science
    Istanbul Technical University
    2012 - 2016

    EXPERIENCE
    Senior Backend Developer
    TechCorp Inc.
    January 2020 - Present
    Led a team of 5 engineers developing microservices architecture.

    Software Developer
    StartupXYZ
    June 2016 - December 2019
    Full-stack development with Python and React.

    SKILLS
    Python, Django, FastAPI, PostgreSQL, Docker, AWS, Kubernetes, Git

    LANGUAGES
    Turkish (Native), English (Advanced), German (Intermediate)

    CERTIFICATIONS
    AWS Solutions Architect Associate
    """

    job_posting = JobPostingInput(
        job_title="Senior Backend Engineer",
        department="Engineering",
        required_skills="Python, Django, PostgreSQL, Docker, AWS",
        required_qualifications="5+ years backend experience, CS degree",
        responsibilities="Design scalable APIs, lead code reviews",
    )

    timings: dict[str, float] = {}

    # Stage 1: Text cleaning
    t0 = time.perf_counter()
    cleaned = clean_text(synthetic_cv)
    masked = mask_personal_info(cleaned)
    timings["text_cleaning"] = round((time.perf_counter() - t0) * 1000, 1)

    # Stage 2: CV parsing
    t0 = time.perf_counter()
    parsed_cv = parse_cv_from_text(synthetic_cv)
    timings["cv_parsing"] = round((time.perf_counter() - t0) * 1000, 1)

    # Stage 3: Embedding
    t0 = time.perf_counter()
    emb_service = EmbeddingService()
    cv_sections = parsed_cv.sections_text
    if cv_sections:
        emb_service.embed(cv_sections)
    timings["embedding"] = round((time.perf_counter() - t0) * 1000, 1)

    # Stage 4: FAISS indexing + search
    t0 = time.perf_counter()
    vs = VectorStore(emb_service)
    chunks = [
        f"Required Skills: {job_posting.required_skills}",
        f"Required Qualifications: {job_posting.required_qualifications}",
        f"Responsibilities: {job_posting.responsibilities}",
    ]
    vs.add_texts(chunks)
    if cv_sections:
        vs.search(cv_sections[0], top_k=3)
    timings["faiss_index_and_search"] = round((time.perf_counter() - t0) * 1000, 1)

    # Stage 5: Fallback scoring
    t0 = time.perf_counter()
    raw_scores = _fallback_scores(parsed_cv, job_posting)
    scores = _normalize_scores(raw_scores)
    timings["fallback_scoring"] = round((time.perf_counter() - t0) * 1000, 1)

    # Stage 6: Ranking
    t0 = time.perf_counter()
    evals = [
        build_final_evaluation(f"app-{i}", cv_score=70 + i * 5, general_test_score=60 + i * 3)
        for i in range(10)
    ]
    rankings = rank_candidates(evals)
    timings["ranking_10_candidates"] = round((time.perf_counter() - t0) * 1000, 1)

    # Total
    total = round(sum(timings.values()), 1)

    # Targets
    targets = {
        "text_cleaning": 50,
        "cv_parsing": 100,
        "embedding": 500,
        "faiss_index_and_search": 200,
        "fallback_scoring": 50,
        "ranking_10_candidates": 50,
        "total_fallback_pipeline": 500,
    }

    verdicts = {}
    for stage, ms in timings.items():
        target = targets.get(stage)
        if target:
            verdicts[stage] = "PASS" if ms <= target else "SLOW"

    verdicts["total_fallback_pipeline"] = "PASS" if total <= targets["total_fallback_pipeline"] else "SLOW"

    # Record into collector
    collector = get_latency_collector()
    for stage, ms in timings.items():
        collector.record(stage, ms)

    return {
        "timings_ms": timings,
        "total_ms": total,
        "targets_ms": targets,
        "verdicts": verdicts,
        "cv_score": scores.get("analysis_score"),
        "note": "Fallback pipeline only (no LLM). Run with real mode for LLM latency.",
    }
