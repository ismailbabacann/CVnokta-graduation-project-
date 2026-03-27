"""
CV Analysis page — upload a PDF, pick a job posting, get AI analysis results.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import tempfile
from pathlib import Path
from uuid import uuid4

import streamlit as st

from app.config import get_settings
from app.core.cv_parser import parse_cv_from_pdf
from app.core.cv_scorer import score_cv
from app.models.cv import CVAnalysisRequest
from app.models.job_posting import JobPostingInput

MOCK_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "mock"


def _load_job_postings() -> list[dict]:
    """Load sample job postings from mock data."""
    path = MOCK_DATA_DIR / "sample_job_postings.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def render() -> None:
    st.markdown("## 📄 CV Analizi")
    st.markdown("PDF formatında CV yükleyin ve bir iş ilanı seçin. AI otomatik puanlama yapacak.")
    st.markdown("---")

    # ── Job posting selection ───────────────────────────────────────
    postings = _load_job_postings()
    if not postings:
        st.warning("⚠️ Mock iş ilanı bulunamadı. `data/mock/sample_job_postings.json` kontrol edin.")
        return

    posting_labels = [f"{p['job_title']} – {p.get('department', 'N/A')}" for p in postings]
    selected_idx = st.selectbox("İş İlanı Seçin", range(len(postings)), format_func=lambda i: posting_labels[i])
    selected_posting = postings[selected_idx]

    with st.expander("📋 İlan Detayları", expanded=False):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"**Pozisyon:** {selected_posting['job_title']}")
            st.markdown(f"**Departman:** {selected_posting.get('department', 'N/A')}")
            st.markdown(f"**Lokasyon:** {selected_posting.get('location', 'N/A')}")
        with col2:
            st.markdown(f"**Min. Deneyim:** {selected_posting.get('min_experience_years', 'N/A')} yıl")
            st.markdown(f"**Eşik Puan:** {selected_posting.get('min_match_score', 70)}")
            st.markdown(f"**Eğitim:** {selected_posting.get('education_level', 'N/A')}")

        st.markdown(f"**Gerekli Beceriler:** {selected_posting.get('required_skills', '-')}")

    # ── CV Upload ───────────────────────────────────────────────────
    st.markdown("### CV Yükle")
    uploaded_file = st.file_uploader(
        "PDF dosyası seçin",
        type=["pdf"],
        help="Maksimum 10 MB",
    )

    col1, col2 = st.columns([1, 3])
    with col1:
        parse_only = st.checkbox("Sadece parse", value=False, help="Yalnızca CV parse sonuçlarını göster")
    with col2:
        run_analysis = st.button("🚀 Analizi Başlat", disabled=(uploaded_file is None), use_container_width=True)

    if run_analysis and uploaded_file:
        _run_analysis(uploaded_file, selected_posting, parse_only)


def _run_analysis(uploaded_file, posting: dict, parse_only: bool) -> None:
    """Execute CV analysis pipeline and display results."""
    # Save uploaded file to temp path
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        shutil.copyfileobj(uploaded_file, tmp)
        tmp_path = tmp.name

    try:
        if parse_only:
            _show_parsed_cv(tmp_path)
        else:
            _show_full_analysis(tmp_path, posting)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _show_parsed_cv(pdf_path: str) -> None:
    """Parse and display structured CV data."""
    with st.spinner("CV parse ediliyor..."):
        try:
            parsed = parse_cv_from_pdf(pdf_path)
        except Exception as e:
            st.error(f"❌ Parse hatası: {e}")
            return

    st.success("✅ CV başarıyla parse edildi!")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("#### Kişisel Bilgiler")
        st.markdown(f"**İsim:** {parsed.full_name or '—'}")
        st.markdown(f"**E-posta:** {parsed.email or '—'}")
        st.markdown(f"**Konum:** {parsed.location or '—'}")

    with col2:
        st.markdown("#### Özet İstatistik")
        st.metric("Toplam Deneyim", f"{parsed.total_experience_years} yıl")
        st.metric("Beceri Sayısı", len(parsed.skills))
        st.metric("Eğitim", len(parsed.education))

    if parsed.skills:
        st.markdown("#### 🛠️ Beceriler")
        st.markdown(" • ".join(f"`{s}`" for s in parsed.skills))

    if parsed.experience:
        st.markdown("#### 💼 Deneyim")
        for exp in parsed.experience:
            title = exp.title or "Pozisyon"
            company = exp.company or "Bilinmiyor"
            duration = f"({exp.duration_months} ay)" if exp.duration_months else ""
            st.markdown(f"- **{title}** @ {company} {duration}")

    if parsed.education:
        st.markdown("#### 🎓 Eğitim")
        for edu in parsed.education:
            degree = edu.degree or "Derece"
            inst = edu.institution or ""
            field = edu.field_of_study or ""
            st.markdown(f"- **{degree}** – {field} ({inst})")


def _show_full_analysis(pdf_path: str, posting: dict) -> None:
    """Run full AI scoring pipeline and display results."""
    job_posting = JobPostingInput(**posting)

    request = CVAnalysisRequest(
        application_id=uuid4(),
        stage_id=uuid4(),
        cv_id=uuid4(),
        cv_file_path=pdf_path,
        job_posting=job_posting,
    )

    with st.spinner("🤖 AI analiz yapılıyor (RAG + GPT)..."):
        try:
            result = asyncio.run(score_cv(request))
        except Exception as e:
            st.error(f"❌ Analiz hatası: {e}")
            return

    # ── Score cards ─────────────────────────────────────────────
    st.markdown("### 📊 Analiz Sonuçları")

    passed = result.is_passed
    badge = "badge-pass" if passed else "badge-fail"
    label = "GEÇTİ ✓" if passed else "KALDI ✗"
    st.markdown(f'<span class="{badge}">{label}</span>', unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{result.analysis_score or 0}</div>
            <div class="score-label">Genel Puan</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{result.experience_match_score or 0}</div>
            <div class="score-label">Deneyim Uyumu</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{result.education_match_score or 0}</div>
            <div class="score-label">Eğitim Uyumu</div>
        </div>
        """, unsafe_allow_html=True)

    # ── Skills breakdown ────────────────────────────────────────
    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("#### ✅ Eşleşen Beceriler")
        if result.matching_skills:
            for skill in result.matching_skills.split(","):
                skill = skill.strip()
                if skill:
                    st.markdown(f"- {skill}")
        else:
            st.markdown("—")

    with col2:
        st.markdown("#### ❌ Eksik Beceriler")
        if result.missing_skills:
            for skill in result.missing_skills.split(","):
                skill = skill.strip()
                if skill:
                    st.markdown(f"- {skill}")
        else:
            st.markdown("—")

    # ── Overall assessment ──────────────────────────────────────
    if result.overall_assessment:
        st.markdown("#### 📝 Genel Değerlendirme")
        st.info(result.overall_assessment)

    # ── Pipeline metadata ───────────────────────────────────────
    with st.expander("🔧 Pipeline Metadata", expanded=False):
        meta_cols = st.columns(3)
        with meta_cols[0]:
            st.markdown(f"**Pipeline:** {result.pipeline_version or '—'}")
            st.markdown(f"**Prompt:** {result.prompt_version or '—'}")
        with meta_cols[1]:
            st.markdown(f"**Model:** {result.model_id or 'Fallback'}")
            st.markdown(f"**Fallback:** {'Evet' if result.fallback_used else 'Hayır'}")
        with meta_cols[2]:
            if result.fallback_reason:
                st.markdown(f"**Sebep:** {result.fallback_reason}")
            st.markdown(f"**Tarih:** {result.analysis_date.strftime('%Y-%m-%d %H:%M')}")

    # Store in session state for ranking
    if "cv_results" not in st.session_state:
        st.session_state.cv_results = {}
    st.session_state.cv_results[str(result.application_id)] = {
        "name": result.parsed_cv.full_name if result.parsed_cv else "Anonim",
        "score": result.analysis_score,
        "application_id": str(result.application_id),
    }
