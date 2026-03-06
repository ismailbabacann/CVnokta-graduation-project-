"""
CVnokta AI-NLP Demo Dashboard
==============================
Standalone Streamlit dashboard demonstrating the CV Analysis pipeline.
Uses existing AI-NLP modules (app/*) without modification.

Run:  streamlit run demo/app.py
"""

import sys
import os
import json
import asyncio
import uuid
import logging
from pathlib import Path
from datetime import datetime

# ── Path setup ──────────────────────────────────────────────────────
DEMO_DIR = Path(__file__).resolve().parent
AI_NLP_DIR = DEMO_DIR.parent
sys.path.insert(0, str(AI_NLP_DIR))

# Load demo-specific .env (sets OS env vars before pydantic-settings reads them)
from dotenv import load_dotenv

load_dotenv(DEMO_DIR / ".env", override=True)

import streamlit as st

# ── Streamlit page config (MUST be first st.* call) ────────────────
st.set_page_config(
    page_title="hr.ai – CVnokta Demo",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Lazy imports from existing AI-NLP modules ──────────────────────
from app.utils.pdf_extractor import extract_text
from app.core.cv_parser import parse_cv_from_pdf
from app.core.cv_scorer import _build_matched_context
from app.core.prompts.cv_analysis import (
    CV_ANALYSIS_SYSTEM_PROMPT,
    CV_ANALYSIS_USER_PROMPT_TEMPLATE,
)
from app.models.job_posting import JobPostingInput
from app.services.embedding_service import EmbeddingService
from app.services.openai_service import OpenAIService
from app.utils.text_cleaner import mask_personal_info, strip_html

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Constants ───────────────────────────────────────────────────────
UPLOAD_DIR = DEMO_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

JOB_POSTINGS_FILE = DEMO_DIR / "data" / "job_postings.json"

PIPELINE_STEPS = [
    ("📄", "CV Yükleme"),
    ("📝", "Metin Çıkarma"),
    ("🔍", "CV Ayrıştırma"),
    ("🔗", "Embedding"),
    ("🔎", "RAG Eşleme"),
    ("🤖", "GPT Puanlama"),
    ("✅", "Sonuç"),
]

# ════════════════════════════════════════════════════════════════════
# CUSTOM CSS
# ════════════════════════════════════════════════════════════════════

CUSTOM_CSS = """
<style>
    /* Hide default Streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}

    /* Root variables */
    :root {
        --primary: #6C3FC5;
        --primary-light: #8B5CF6;
        --primary-lighter: #A78BFA;
        --primary-bg: #F3EEFF;
        --bg-gray: #F9FAFB;
        --text-dark: #1F2937;
        --text-gray: #6B7280;
        --green: #10B981;
        --green-bg: #D1FAE5;
        --red: #EF4444;
        --red-bg: #FEE2E2;
        --orange: #F59E0B;
        --orange-bg: #FEF3C7;
        --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
    }

    /* Navigation bar */
    .nav-container {
        display: flex;
        align-items: center;
        padding: 12px 24px;
        background: white;
        border-bottom: 2px solid #E5E7EB;
        margin: -1rem -1rem 1.5rem -1rem;
        gap: 32px;
    }
    .nav-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-dark);
    }
    .nav-logo .logo-icon {
        width: 36px;
        height: 36px;
        background: var(--primary);
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.1rem;
    }

    /* Job cards */
    .job-card {
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 16px;
        box-shadow: var(--shadow);
        transition: box-shadow 0.2s, transform 0.2s;
    }
    .job-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }
    .job-card-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
    }
    .job-icon {
        width: 56px;
        height: 56px;
        background: var(--primary-bg);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
    }
    .job-type-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: var(--bg-gray);
        border-radius: 6px;
        font-size: 0.8rem;
        color: var(--text-gray);
        margin-bottom: 4px;
    }
    .job-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
    }
    .job-description {
        color: var(--text-gray);
        font-size: 0.9rem;
        line-height: 1.6;
        margin: 12px 0;
    }
    .job-location {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text-gray);
        font-size: 0.85rem;
    }

    /* Detail page header */
    .detail-header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        color: white;
        padding: 32px;
        border-radius: 12px;
        margin-bottom: 24px;
    }
    .detail-header h1 {
        color: white;
        margin: 0 0 8px 0;
        font-size: 1.5rem;
    }
    .detail-header p {
        color: rgba(255,255,255,0.85);
        margin: 4px 0;
        font-size: 0.9rem;
    }
    .detail-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.82rem;
        margin: 2px 4px 2px 0;
    }
    .tag-location { background: rgba(255,255,255,0.2); color: white; }
    .tag-type { background: rgba(255,255,255,0.2); color: white; }
    .tag-model { background: rgba(255,255,255,0.2); color: white; }

    /* Section cards */
    .section-card {
        background: white;
        border-left: 4px solid var(--primary-light);
        border-radius: 8px;
        padding: 20px 24px;
        margin-bottom: 16px;
        box-shadow: var(--shadow);
    }
    .section-card h3 {
        color: var(--primary);
        margin-top: 0;
        font-size: 1.05rem;
    }
    .section-card ul {
        color: var(--text-dark);
        padding-left: 20px;
    }
    .section-card li {
        margin-bottom: 8px;
        line-height: 1.5;
    }

    /* Pipeline visualization */
    .pipeline-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 24px 16px;
        background: white;
        border-radius: 12px;
        box-shadow: var(--shadow);
        margin: 16px 0 24px 0;
        flex-wrap: wrap;
    }
    .pipeline-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 80px;
    }
    .pipeline-circle {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        border: 3px solid #E5E7EB;
        background: var(--bg-gray);
        transition: all 0.3s;
    }
    .pipeline-circle.active {
        border-color: var(--primary);
        background: var(--primary-bg);
    }
    .pipeline-circle.done {
        border-color: var(--green);
        background: var(--green-bg);
    }
    .pipeline-label {
        font-size: 0.72rem;
        color: var(--text-gray);
        text-align: center;
        font-weight: 500;
    }
    .pipeline-arrow {
        font-size: 1.2rem;
        color: #D1D5DB;
        margin: 0 2px;
    }

    /* Score badges */
    .score-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.95rem;
    }
    .score-pass { background: var(--green-bg); color: var(--green); }
    .score-fail { background: var(--red-bg); color: var(--red); }

    /* Result card */
    .result-card {
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 12px;
        box-shadow: var(--shadow);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    /* Skill tags */
    .skill-tag {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 0.82rem;
        margin: 3px;
        font-weight: 500;
    }
    .skill-match { background: var(--green-bg); color: #065F46; }
    .skill-miss { background: var(--red-bg); color: #991B1B; }

    /* Score meter */
    .score-meter {
        text-align: center;
        padding: 24px;
    }
    .score-big {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1;
    }
    .score-label {
        font-size: 0.9rem;
        color: var(--text-gray);
        margin-top: 4px;
    }

    /* Apply button */
    .apply-btn {
        display: block;
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, var(--green) 0%, #059669 100%);
        color: white;
        text-align: center;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 1px;
        margin-top: 16px;
        border: none;
        cursor: pointer;
    }

    /* Status badge */
    .status-passed {
        background: var(--green-bg);
        color: var(--green);
        padding: 4px 14px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.85rem;
    }
    .status-failed {
        background: var(--red-bg);
        color: var(--red);
        padding: 4px 14px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.85rem;
    }

    /* General page styling */
    .page-title {
        text-align: center;
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--text-dark);
        margin: 16px 0 24px 0;
    }

    /* Benefits card */
    .benefit-card {
        background: white;
        border-left: 4px solid var(--green);
        border-radius: 8px;
        padding: 20px 24px;
        margin-bottom: 16px;
        box-shadow: var(--shadow);
    }
    .benefit-card h3 {
        color: var(--green);
        margin-top: 0;
    }

    /* Divider */
    .custom-divider {
        border: none;
        height: 1px;
        background: #E5E7EB;
        margin: 24px 0;
    }
</style>
"""


# ════════════════════════════════════════════════════════════════════
# DATA & STATE
# ════════════════════════════════════════════════════════════════════


@st.cache_data
def load_job_postings():
    """Load job postings from JSON data file."""
    with open(JOB_POSTINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@st.cache_resource
def get_cached_embedding_service():
    """Cached singleton embedding service (avoids reloading model)."""
    return EmbeddingService()


def init_session_state():
    """Initialize all session state variables."""
    defaults = {
        "page": "jobs",
        "selected_job_idx": None,
        "applications": [],
        "selected_result_idx": None,
        "show_upload": False,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def navigate(page: str, **kwargs):
    """Navigate to a page and set optional state."""
    st.session_state.page = page
    for k, v in kwargs.items():
        st.session_state[k] = v


# ════════════════════════════════════════════════════════════════════
# PIPELINE VISUALIZATION
# ════════════════════════════════════════════════════════════════════


def render_pipeline_html(active_step: int = -1) -> str:
    """
    Render a horizontal pipeline visualization.
    active_step: -1 = none active, 0..6 = that step is current.
    Steps < active_step are 'done', == active_step is 'active'.
    """
    parts = []
    for i, (icon, label) in enumerate(PIPELINE_STEPS):
        if i < active_step:
            cls = "done"
        elif i == active_step:
            cls = "active"
        else:
            cls = ""
        parts.append(
            f'<div class="pipeline-step">'
            f'  <div class="pipeline-circle {cls}">{icon}</div>'
            f'  <div class="pipeline-label">{label}</div>'
            f'</div>'
        )
        if i < len(PIPELINE_STEPS) - 1:
            parts.append('<div class="pipeline-arrow">→</div>')

    return f'<div class="pipeline-container">{"".join(parts)}</div>'


# ════════════════════════════════════════════════════════════════════
# CV ANALYSIS ENGINE (uses existing app/* modules)
# ════════════════════════════════════════════════════════════════════


def run_cv_analysis(pdf_path: str, job_data: dict) -> dict:
    """
    Execute the full CV analysis pipeline step-by-step.
    Imports and calls existing AI-NLP modules without modification.
    Returns a dict with all scoring results.
    """
    job_input = JobPostingInput(
        job_title=job_data["job_title"],
        department=job_data.get("department"),
        location=job_data.get("location"),
        work_type=job_data.get("work_type"),
        work_model=job_data.get("work_model"),
        about_company=job_data.get("about_company"),
        responsibilities=job_data.get("responsibilities"),
        required_qualifications=job_data.get("required_qualifications"),
        required_skills=job_data.get("required_skills"),
        benefits=job_data.get("benefits"),
        min_match_score=job_data.get("min_match_score", 85),
    )

    with st.status("🔄 CV Analysis in Progress...", expanded=True) as status:
        # Step 1: Extract text
        st.write("📄 **Adım 1/6:** Extracting text from PDF...")
        raw_text = extract_text(pdf_path)
        text_preview = raw_text[:200].replace("\n", " ")
        st.write(f"  ✓ {len(raw_text)} characters extracted.")

        # Step 2: Parse CV
        st.write("🔍 **Adım 2/6:** Parsing CV...")
        parsed_cv = parse_cv_from_pdf(pdf_path)
        st.write(
            f"  ✓ {len(parsed_cv.skills)} skills, "
            f"{len(parsed_cv.experience)} experiences, "
            f"{len(parsed_cv.education)} education entries found."
        )

        # Step 3: Create embeddings
        st.write("🔗 **Adım 3/6:** Creating vector embeddings...")
        emb_service = get_cached_embedding_service()
        st.write(f"  ✓ Embedding model ready.")

        # Step 4: RAG matching
        st.write("🔎 **Adım 4/6:** Matching with job description...")
        matched_context = _build_matched_context(parsed_cv, job_input, emb_service)
        st.write(f"  ✓ RAG context created ({len(matched_context)} characters).")

        # Step 5: GPT scoring
        st.write("🤖 **Adım 5/6:** GPT is analyzing and scoring...")
        cv_text = mask_personal_info("\n".join(parsed_cv.sections_text))

        user_prompt = CV_ANALYSIS_USER_PROMPT_TEMPLATE.format(
            job_title=job_input.job_title,
            department=job_input.department or "N/A",
            required_qualifications=strip_html(
                job_input.required_qualifications or "N/A"
            ),
            required_skills=job_input.required_skills or "N/A",
            responsibilities=strip_html(job_input.responsibilities or "N/A"),
            matched_context=matched_context,
            cv_text=cv_text,
        )

        oai_service = OpenAIService()

        # Run async generate_json in sync context
        loop = asyncio.new_event_loop()
        try:
            scores = loop.run_until_complete(
                oai_service.generate_json(CV_ANALYSIS_SYSTEM_PROMPT, user_prompt)
            )
        finally:
            loop.close()

        st.write("  ✓ GPT scoring is done.")

        # Step 6: Build result
        st.write("✅ **Adım 6/6:** Building final result...")
        analysis_score = float(scores.get("analysis_score", 0))
        threshold = job_data.get("min_match_score", 85)

        result = {
            "analysis_score": analysis_score,
            "experience_match_score": float(
                scores.get("experience_match_score", 0)
            ),
            "education_match_score": float(
                scores.get("education_match_score", 0)
            ),
            "matching_skills": scores.get("matching_skills", ""),
            "missing_skills": scores.get("missing_skills", ""),
            "overall_assessment": scores.get("overall_assessment", ""),
            "is_passed": analysis_score >= threshold,
            "threshold": threshold,
            "parsed_cv": {
                "full_name": parsed_cv.full_name,
                "email": parsed_cv.email,
                "skills": parsed_cv.skills,
                "experience_count": len(parsed_cv.experience),
                "education_count": len(parsed_cv.education),
                "total_experience_years": parsed_cv.total_experience_years,
            },
        }

        if result["is_passed"]:
            status.update(
                label="✅ Analysis is done — You passed the threshold!",
                state="complete",
            )
        else:
            status.update(
                label="❌ Analysis is done — You did not meet the threshold.",
                state="complete",
            )

    return result


# ════════════════════════════════════════════════════════════════════
# UI COMPONENTS
# ════════════════════════════════════════════════════════════════════


def render_navbar():
    """Render the top navigation bar."""
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

    cols = st.columns([3, 1, 1, 1, 1])
    with cols[0]:
        st.markdown(
            """
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:36px;height:36px;background:#6C3FC5;color:white;
                     border-radius:8px;display:flex;align-items:center;
                     justify-content:center;font-weight:bold;font-size:1.1rem;">h</div>
                <span style="font-size:1.25rem;font-weight:700;color:#1F2937;">hr.ai</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with cols[1]:
        if st.button("🏠 Ana Sayfa", key="nav_home", use_container_width=True):
            navigate("home")
            st.rerun()
    with cols[2]:
        if st.button("💼 İş İlanları", key="nav_jobs", use_container_width=True):
            navigate("jobs")
            st.rerun()
    with cols[3]:
        if st.button("📊 Sonuçlarım", key="nav_results", use_container_width=True):
            navigate("results")
            st.rerun()
    with cols[4]:
        if st.button("🔄 Sıfırla", key="nav_reset", use_container_width=True):
            st.session_state.applications = []
            st.session_state.show_upload = False
            st.session_state.selected_job_idx = None
            st.session_state.selected_result_idx = None
            navigate("jobs")
            st.rerun()

    st.markdown("<hr style='margin:0 0 16px 0; border:none; height:2px; background:#E5E7EB;'>", unsafe_allow_html=True)


def render_job_card(job: dict, idx: int):
    """Render a single job posting card."""
    work_type = job.get("work_type", "Tam Zamanlı")
    st.markdown(
        f"""
        <div class="job-card">
            <div class="job-card-header">
                <div class="job-icon">{job.get('icon', '💼')}</div>
                <div>
                    <div class="job-type-badge">⏰ {work_type}</div>
                    <h3 class="job-title">{job['job_title']}</h3>
                </div>
            </div>
            <p class="job-description">{job.get('short_description', '')}</p>
            <div class="job-location">📍 {job.get('location', 'Belirtilmemiş')}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("İşe Başvur →", key=f"apply_{idx}", use_container_width=True):
        navigate("job_detail", selected_job_idx=idx, show_upload=False)
        st.rerun()


def render_score_circle(score: float, label: str, size: str = "big"):
    """Render a circular score meter."""
    if score >= 85:
        color = "#10B981"
    elif score >= 60:
        color = "#F59E0B"
    else:
        color = "#EF4444"

    if size == "big":
        st.markdown(
            f"""
            <div class="score-meter">
                <div class="score-big" style="color:{color};">{score:.1f}</div>
                <div class="score-label">{label}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f"""
            <div style="text-align:center;">
                <div style="font-size:1.8rem;font-weight:700;color:{color};">{score:.1f}</div>
                <div style="font-size:0.75rem;color:#6B7280;">{label}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ════════════════════════════════════════════════════════════════════
# PAGES
# ════════════════════════════════════════════════════════════════════


def page_home():
    """Landing / home page with pipeline overview."""
    st.markdown('<h1 class="page-title">🏢 CVnokta — AI İşe Alım Platformu</h1>', unsafe_allow_html=True)

    st.markdown(
        """
        <div style="text-align:center; color:#6B7280; max-width:700px; margin:0 auto 24px auto; line-height:1.6;">
            CVnokta, yapay zeka destekli aday değerlendirme platformudur.
            CV'nizi yükleyin, AI analiz etsin, sonuçlarınızı anında görün.
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Pipeline visualization
    st.markdown("### 📋 CV Analiz Pipeline")
    st.markdown(
        """
        <div style="text-align:center; color:#6B7280; margin-bottom:8px; font-size:0.9rem;">
            Bir CV'nin değerlendirme sürecinde geçtiği adımlar:
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown(render_pipeline_html(active_step=-1), unsafe_allow_html=True)

    st.markdown(
        """
        <div style="background:white; border-radius:12px; padding:24px; box-shadow:0 1px 3px rgba(0,0,0,0.1); margin-top:8px;">
            <table style="width:100%; border-collapse:collapse;">
                <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:10px; font-weight:600;">📄 CV Yükleme</td>
                    <td style="padding:10px; color:#6B7280;">PDF formatında CV yüklenir</td>
                </tr>
                <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:10px; font-weight:600;">📝 Metin Çıkarma</td>
                    <td style="padding:10px; color:#6B7280;">PyMuPDF ile PDF'den metin çıkarılır</td>
                </tr>
                <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:10px; font-weight:600;">🔍 CV Ayrıştırma</td>
                    <td style="padding:10px; color:#6B7280;">Regex + NLP ile yapısal veri çıkarılır (isim, yetenekler, deneyim, eğitim)</td>
                </tr>
                <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:10px; font-weight:600;">🔗 Embedding</td>
                    <td style="padding:10px; color:#6B7280;">sentence-transformers ile vektör temsilleri oluşturulur</td>
                </tr>
                <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:10px; font-weight:600;">🔎 RAG Eşleme</td>
                    <td style="padding:10px; color:#6B7280;">CV bölümleri ve iş gereksinimleri eşleştirilir</td>
                </tr>
                <tr style="border-bottom:1px solid #E5E7EB;">
                    <td style="padding:10px; font-weight:600;">🤖 GPT Puanlama</td>
                    <td style="padding:10px; color:#6B7280;">GPT-4o-mini eşleşen bağlamı değerlendirir ve puan verir</td>
                </tr>
                <tr>
                    <td style="padding:10px; font-weight:600;">✅ Sonuç</td>
                    <td style="padding:10px; color:#6B7280;">Skor ≥ 85 ise aday bir sonraki aşamaya geçer</td>
                </tr>
            </table>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("")  # spacer
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if st.button(
            "💼 İş İlanlarına Git",
            key="home_to_jobs",
            use_container_width=True,
            type="primary",
        ):
            navigate("jobs")
            st.rerun()


def page_jobs():
    """Job listings page — shows 3 job cards."""
    st.markdown(
        '<h1 class="page-title">Şirketlerimiz Size İhtiyaç Duyuyor</h1>',
        unsafe_allow_html=True,
    )

    jobs = load_job_postings()

    for i, job in enumerate(jobs):
        render_job_card(job, i)


def page_job_detail():
    """Job detail page with about, responsibilities, qualifications, and apply."""
    jobs = load_job_postings()
    idx = st.session_state.get("selected_job_idx")
    if idx is None or idx >= len(jobs):
        navigate("jobs")
        st.rerun()
        return

    job = jobs[idx]

    # Back button
    if st.button("← İlanlar'a Dön", key="back_to_jobs"):
        navigate("jobs")
        st.rerun()

    # ── Header (matches second image) ──────────────────────────────
    work_model_emoji = "🌍"
    work_type_emoji = "⏰"
    location_emoji = "📍"
    st.markdown(
        f"""
        <div class="detail-header">
            <h1 style="color:white; margin:0 0 6px 0; font-size:1.6rem;">{job['job_title']}</h1>
            <p style="color:rgba(255,255,255,0.8); margin:0 0 14px 0; font-size:0.9rem;">{job.get('department', '')}</p>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <span style="color:white; font-size:0.88rem;">{location_emoji} {job.get('location', '')}</span>
                <span style="color:white; font-size:0.88rem;">{work_type_emoji} {job.get('work_type', '')}</span>
                <span style="color:white; font-size:0.88rem;">{work_model_emoji} {job.get('work_model', '')}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── About Company ───────────────────────────────────────────────
    if job.get("about_company"):
        st.markdown(
            f"""
            <div class="section-card">
                <h3 style="color:#6C3FC5; margin-top:0;">Hakkımızda</h3>
                <p style="line-height:1.7; color:#374151; margin:0;">{job['about_company']}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ── About Role ──────────────────────────────────────────────────
    if job.get("about_role"):
        st.markdown(
            f"""
            <div class="section-card">
                <h3 style="color:#6C3FC5; margin-top:0;">Rol Hakkında</h3>
                <p style="line-height:1.7; color:#374151; margin:0;">{job['about_role']}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ── Responsibilities ────────────────────────────────────────────
    if job.get("responsibilities"):
        items_html = "".join(
            f"<li style='margin-bottom:8px;'>{line.strip()}</li>"
            for line in job["responsibilities"].split("\n")
            if line.strip()
        )
        st.markdown(
            f"""
            <div class="section-card">
                <h3 style="color:#6C3FC5; margin-top:0;">Sorumluluklar</h3>
                <ul style="margin:0; padding-left:20px; color:#374151;">{items_html}</ul>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ── Required Qualifications ─────────────────────────────────────
    if job.get("required_qualifications"):
        items_html = "".join(
            f"<li style='margin-bottom:8px;'>{line.strip()}</li>"
            for line in job["required_qualifications"].split("\n")
            if line.strip()
        )
        st.markdown(
            f"""
            <div class="section-card">
                <h3 style="color:#6C3FC5; margin-top:0;">Beklenen Nitelikler</h3>
                <ul style="margin:0; padding-left:20px; color:#374151;">{items_html}</ul>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ── Benefits (card style matching second image) ─────────────────
    benefit_items = job.get("benefit_items", [])
    if benefit_items:
        cards_html = "".join(
            f"""
            <div style="border-left:4px solid #F59E0B; background:#FFFBEB;
                        border-radius:6px; padding:14px 18px; margin-bottom:10px;">
                <div style="font-weight:700; font-size:0.95rem; color:#1F2937; margin-bottom:4px;">
                    {b.get('emoji','🎁')} {b['title']}
                </div>
                <div style="font-size:0.85rem; color:#6B7280; line-height:1.5;">
                    {b.get('description','')}
                </div>
            </div>
            """
            for b in benefit_items
        )
        st.markdown(
            f"""
            <div class="section-card">
                <h3 style="color:#6C3FC5; margin-top:0;">Sunduğumuz Faydalar</h3>
                {cards_html}
            </div>
            """,
            unsafe_allow_html=True,
        )
    elif job.get("benefits"):
        benefits = [b.strip() for b in job["benefits"].split(",") if b.strip()]
        cards_html = "".join(
            f"""
            <div style="border-left:4px solid #F59E0B; background:#FFFBEB;
                        border-radius:6px; padding:14px 18px; margin-bottom:10px;">
                <div style="font-weight:700; font-size:0.95rem; color:#1F2937;">🎁 {b}</div>
            </div>
            """
            for b in benefits
        )
        st.markdown(
            f"""
            <div class="section-card">
                <h3 style="color:#6C3FC5; margin-top:0;">Sunduğumuz Faydalar</h3>
                {cards_html}
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ── Apply Section ───────────────────────────────────────────────

    # Check if already applied
    already_applied = any(
        app["job_id"] == job["id"] for app in st.session_state.applications
    )

    if already_applied:
        st.info("✅ Bu ilana zaten başvurdunuz. Sonuçlarınızı kontrol edin.")
        if st.button(
            "📊 Sonuçlarıma Git",
            key="goto_results_already",
            type="primary",
            use_container_width=True,
        ):
            navigate("results")
            st.rerun()
        return

    # Full-width green apply button (matches second image)
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button(
        "BU İŞE BAŞVUR",
        key="toggle_upload",
        use_container_width=True,
    ):
        st.session_state.show_upload = True
        st.rerun()
    st.markdown(
        """
        <style>
        div[data-testid="stMainBlockContainer"] div[data-testid="stButton"] button {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            font-weight: 700;
            font-size: 1rem;
            letter-spacing: 1.5px;
            border: none;
            padding: 14px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    if st.session_state.get("show_upload"):
        st.markdown("---")
        st.markdown("### 📄 CV Yükleme")
        st.markdown(
            '<p style="color:#6B7280;">PDF formatında CV\'nizi yükleyin. '
            "AI otomatik olarak analiz edecektir.</p>",
            unsafe_allow_html=True,
        )

        # Pipeline preview
        st.markdown(render_pipeline_html(active_step=0), unsafe_allow_html=True)

        uploaded_file = st.file_uploader(
            "CV Dosyanızı Seçin (PDF)",
            type=["pdf"],
            key=f"uploader_{idx}",
        )

        if uploaded_file is not None:
            # Check API key
            from app.config import get_settings

            settings = get_settings()
            if not settings.openai_api_key:
                st.error(
                    "⚠️ **OPENAI_API_KEY ayarlanmamış!** "
                    "`demo/.env` dosyasını açın ve API anahtarınızı girin."
                )
                return

            # Save uploaded file
            save_path = UPLOAD_DIR / f"{uuid.uuid4().hex}_{uploaded_file.name}"
            save_path.write_bytes(uploaded_file.getvalue())
            st.success(f"✅ Dosya kaydedildi: {uploaded_file.name}")

            # Run analysis
            try:
                result = run_cv_analysis(str(save_path), job)

                # Store application
                application = {
                    "id": str(uuid.uuid4()),
                    "job_id": job["id"],
                    "job_title": job["job_title"],
                    "company": job.get("company_name", ""),
                    "location": job.get("location", ""),
                    "applied_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "result": result,
                }
                st.session_state.applications.append(application)

                # Show result summary
                st.markdown("---")
                st.markdown("### 🎯 Analiz Sonucu")

                score = result["analysis_score"]
                passed = result["is_passed"]

                c1, c2, c3 = st.columns(3)
                with c1:
                    render_score_circle(score, "Genel Puan")
                with c2:
                    render_score_circle(
                        result["experience_match_score"], "Deneyim Eşleşmesi"
                    )
                with c3:
                    render_score_circle(
                        result["education_match_score"], "Eğitim Eşleşmesi"
                    )

                if passed:
                    st.success(
                        f"🎉 Tebrikler! {score:.1f}/100 puan ile bir sonraki "
                        f"aşamaya geçtiniz! (Eşik: {result['threshold']})"
                    )
                    st.balloons()
                else:
                    st.error(
                        f"Maalesef {score:.1f}/100 puan ile eşik değerin "
                        f"({result['threshold']}) altında kaldınız."
                    )

                # All done pipeline
                st.markdown(
                    render_pipeline_html(active_step=7), unsafe_allow_html=True
                )

                # Go to results
                if st.button(
                    "📊 Sonuçlarıma Git",
                    key="goto_results",
                    type="primary",
                    use_container_width=True,
                ):
                    st.session_state.show_upload = False
                    navigate("results")
                    st.rerun()

            except Exception as exc:
                logger.exception("Analysis failed")
                st.error(f"❌ Analiz başarısız oldu: {exc}")
                st.info(
                    "**Olası nedenler:** API anahtarı geçersiz, "
                    "ağ bağlantısı yok, veya PDF dosyası okunamıyor."
                )


def page_results():
    """Results page — shows all past application results."""
    st.markdown(
        '<h1 class="page-title">📊 Başvuru Sonuçlarım</h1>', unsafe_allow_html=True
    )

    applications = st.session_state.get("applications", [])

    if not applications:
        st.markdown(
            """
            <div style="text-align:center; padding:60px 20px; color:#9CA3AF;">
                <div style="font-size:3rem; margin-bottom:12px;">📭</div>
                <p style="font-size:1.1rem;">Henüz hiç başvuru yapmadınız.</p>
                <p>İş ilanlarına göz atarak başvurun!</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button(
                "💼 İş İlanlarına Git",
                key="results_to_jobs",
                use_container_width=True,
                type="primary",
            ):
                navigate("jobs")
                st.rerun()
        return

    # Pipeline overview
    st.markdown("#### 📋 Değerlendirme Süreci")
    st.markdown(render_pipeline_html(active_step=7), unsafe_allow_html=True)
    st.markdown("")

    for i, app in enumerate(applications):
        result = app["result"]
        score = result["analysis_score"]
        passed = result["is_passed"]

        status_class = "status-passed" if passed else "status-failed"
        status_text = "✅ Geçti" if passed else "❌ Kaldı"

        if score >= 85:
            color = "#10B981"
        elif score >= 60:
            color = "#F59E0B"
        else:
            color = "#EF4444"

        col1, col2, col3, col4 = st.columns([3, 1, 1, 1])

        with col1:
            st.markdown(
                f"""
                <div style="padding:8px 0;">
                    <div style="font-weight:700; font-size:1.05rem; color:#1F2937;">
                        {app['job_title']}
                    </div>
                    <div style="font-size:0.85rem; color:#6B7280;">
                        {app.get('company', '')} · {app.get('location', '')} · {app['applied_at']}
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with col2:
            st.markdown(
                f"""
                <div style="text-align:center; padding:8px 0;">
                    <div style="font-size:1.5rem; font-weight:700; color:{color};">
                        {score:.1f}
                    </div>
                    <div style="font-size:0.75rem; color:#6B7280;">/ 100</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with col3:
            st.markdown(
                f'<div style="text-align:center; padding:16px 0;">'
                f'<span class="{status_class}">{status_text}</span></div>',
                unsafe_allow_html=True,
            )

        with col4:
            if st.button("Detaylar →", key=f"detail_{i}", use_container_width=True):
                navigate("result_detail", selected_result_idx=i)
                st.rerun()

        st.markdown(
            "<hr style='margin:4px 0; border:none; height:1px; background:#E5E7EB;'>",
            unsafe_allow_html=True,
        )


def page_result_detail():
    """Detailed view of a single application result."""
    idx = st.session_state.get("selected_result_idx")
    applications = st.session_state.get("applications", [])

    if idx is None or idx >= len(applications):
        navigate("results")
        st.rerun()
        return

    app = applications[idx]
    result = app["result"]

    # Back button
    if st.button("← Sonuçlar'a Dön", key="back_to_results"):
        navigate("results")
        st.rerun()

    # Header
    passed = result["is_passed"]
    status_text = "Bir Sonraki Aşamaya Geçti ✅" if passed else "Eşik Altında Kaldı ❌"
    header_bg = (
        "linear-gradient(135deg, #10B981 0%, #059669 100%)"
        if passed
        else "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
    )

    st.markdown(
        f"""
        <div style="background:{header_bg}; color:white; padding:24px 32px;
                     border-radius:12px; margin-bottom:24px;">
            <h2 style="color:white; margin:0 0 4px 0;">{app['job_title']}</h2>
            <p style="color:rgba(255,255,255,0.85); margin:0;">
                {app.get('company', '')} · {app.get('location', '')}
            </p>
            <p style="color:rgba(255,255,255,0.9); margin:8px 0 0 0; font-weight:600;">
                {status_text}
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Pipeline completed
    st.markdown(render_pipeline_html(active_step=7), unsafe_allow_html=True)

    # Scores
    st.markdown("### 📊 Puan Dağılımı")

    c1, c2, c3 = st.columns(3)
    with c1:
        render_score_circle(result["analysis_score"], "Genel Puan")
    with c2:
        render_score_circle(result["experience_match_score"], "Deneyim Eşleşmesi")
    with c3:
        render_score_circle(result["education_match_score"], "Eğitim Eşleşmesi")

    st.markdown("<hr class='custom-divider'>", unsafe_allow_html=True)

    # Matching Skills (Pros)
    st.markdown("### ✅ Eşleşen Yetenekler (Artılar)")
    matching = result.get("matching_skills", "")
    if matching:
        skills = [s.strip() for s in matching.split(",") if s.strip()]
        tags = "".join(f'<span class="skill-tag skill-match">{s}</span>' for s in skills)
        st.markdown(f"<div>{tags}</div>", unsafe_allow_html=True)
    else:
        st.markdown(
            '<p style="color:#9CA3AF;">Eşleşen yetenek bulunamadı.</p>',
            unsafe_allow_html=True,
        )

    st.markdown("")

    # Missing Skills (Cons)
    st.markdown("### ❌ Eksik Yetenekler (Eksiler)")
    missing = result.get("missing_skills", "")
    if missing:
        skills = [s.strip() for s in missing.split(",") if s.strip()]
        tags = "".join(f'<span class="skill-tag skill-miss">{s}</span>' for s in skills)
        st.markdown(f"<div>{tags}</div>", unsafe_allow_html=True)
    else:
        st.markdown(
            '<p style="color:#9CA3AF;">Eksik yetenek yok — harika!</p>',
            unsafe_allow_html=True,
        )

    st.markdown("<hr class='custom-divider'>", unsafe_allow_html=True)

    # Overall Assessment
    st.markdown("### 💬 Genel Değerlendirme")
    assessment = result.get("overall_assessment", "Değerlendirme mevcut değil.")
    st.markdown(
        f"""
        <div class="section-card">
            <p style="line-height:1.8; color:#374151; font-size:0.95rem;">
                {assessment}
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Parsed CV info
    cv_info = result.get("parsed_cv", {})
    if cv_info:
        st.markdown("### 📄 CV Bilgileri (Ayrıştırma Sonucu)")
        info_cols = st.columns(4)
        with info_cols[0]:
            st.metric("Yetenekler", len(cv_info.get("skills", [])))
        with info_cols[1]:
            st.metric("Deneyimler", cv_info.get("experience_count", 0))
        with info_cols[2]:
            st.metric("Eğitimler", cv_info.get("education_count", 0))
        with info_cols[3]:
            st.metric("Toplam Deneyim", f"{cv_info.get('total_experience_years', 0)} yıl")

    # Decision info
    st.markdown("<hr class='custom-divider'>", unsafe_allow_html=True)
    threshold = result.get("threshold", 85)
    score = result["analysis_score"]

    if passed:
        st.success(
            f"🎉 **{score:.1f}/100** puan ile eşik değeri ({threshold}) geçtiniz. "
            "Bir sonraki aşama: **Genel Yetenek Testi**"
        )

        # Next steps visualization
        st.markdown("#### 🗺️ Sonraki Aşamalar")
        steps_cols = st.columns(4)
        with steps_cols[0]:
            st.markdown(
                """
                <div style="text-align:center; padding:16px; background:#D1FAE5;
                     border-radius:12px; border:2px solid #10B981;">
                    <div style="font-size:1.5rem;">✅</div>
                    <div style="font-weight:600; font-size:0.85rem;">CV Analizi</div>
                    <div style="font-size:0.75rem; color:#065F46;">Tamamlandı</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with steps_cols[1]:
            st.markdown(
                """
                <div style="text-align:center; padding:16px; background:#FEF3C7;
                     border-radius:12px; border:2px solid #F59E0B;">
                    <div style="font-size:1.5rem;">📝</div>
                    <div style="font-weight:600; font-size:0.85rem;">Genel Yetenek Testi</div>
                    <div style="font-size:0.75rem; color:#92400E;">Sıradaki</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with steps_cols[2]:
            st.markdown(
                """
                <div style="text-align:center; padding:16px; background:#F3F4F6;
                     border-radius:12px; border:2px solid #D1D5DB;">
                    <div style="font-size:1.5rem;">🌐</div>
                    <div style="font-weight:600; font-size:0.85rem;">İngilizce Testi</div>
                    <div style="font-size:0.75rem; color:#6B7280;">Beklemede</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with steps_cols[3]:
            st.markdown(
                """
                <div style="text-align:center; padding:16px; background:#F3F4F6;
                     border-radius:12px; border:2px solid #D1D5DB;">
                    <div style="font-size:1.5rem;">🎥</div>
                    <div style="font-weight:600; font-size:0.85rem;">AI Mülakat</div>
                    <div style="font-size:0.75rem; color:#6B7280;">Beklemede</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.warning(
            f"**{score:.1f}/100** puan ile eşik değeri ({threshold}) geçemediniz. "
            "Eksik yeteneklerinizi geliştirip tekrar başvurabilirsiniz."
        )


# ════════════════════════════════════════════════════════════════════
# MAIN ROUTER
# ════════════════════════════════════════════════════════════════════


def main():
    """Main entry point — route to the correct page."""
    init_session_state()
    render_navbar()

    page = st.session_state.page

    if page == "home":
        page_home()
    elif page == "jobs":
        page_jobs()
    elif page == "job_detail":
        page_job_detail()
    elif page == "results":
        page_results()
    elif page == "result_detail":
        page_result_detail()
    else:
        page_home()


if __name__ == "__main__":
    main()
