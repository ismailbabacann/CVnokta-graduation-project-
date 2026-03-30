"""
Interview page — AI-powered mock interview with turn-based Q&A.

Users upload a CV (PDF), select a job posting, start an interview session,
answer questions one-by-one, and get a comprehensive AI evaluation at the end.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import tempfile
import time
from pathlib import Path

import streamlit as st

from app.core.cv_parser import parse_cv_from_pdf
from app.core.interview_engine import InterviewEngine
from app.models.job_posting import JobPostingInput

MOCK_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "mock"


def _load_job_postings() -> list[dict]:
    path = MOCK_DATA_DIR / "sample_job_postings.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _build_cv_summary(parsed) -> str:
    """Build a concise CV summary string from a ParsedCV model."""
    parts: list[str] = []
    if parsed.full_name:
        parts.append(f"Ad: {parsed.full_name}")
    if parsed.summary:
        parts.append(f"Özet: {parsed.summary}")
    if parsed.skills:
        parts.append(f"Beceriler: {', '.join(parsed.skills[:15])}")
    if parsed.experience:
        exp_items = []
        for exp in parsed.experience[:3]:
            title = exp.title or ""
            company = exp.company or ""
            if title or company:
                exp_items.append(f"{title} @ {company}".strip(" @"))
        if exp_items:
            parts.append(f"Deneyim: {'; '.join(exp_items)}")
    if parsed.education:
        edu_items = []
        for edu in parsed.education[:2]:
            degree = edu.degree or ""
            institution = edu.institution or ""
            if degree or institution:
                edu_items.append(f"{degree} - {institution}".strip(" -"))
        if edu_items:
            parts.append(f"Eğitim: {'; '.join(edu_items)}")
    return "\n".join(parts) if parts else "CV bilgisi mevcut"


def render() -> None:
    st.markdown("## 🎙️ AI Mülakat")
    st.markdown("İş ilanı seçin, AI mülakat sorularını oluştursun, sırayla cevaplayın ve değerlendirme alın.")
    st.markdown("---")

    # Engine singleton per session
    if "interview_engine" not in st.session_state:
        st.session_state.interview_engine = InterviewEngine()

    engine: InterviewEngine = st.session_state.interview_engine

    # Check if there's an active session
    session_data = st.session_state.get("interview_session")

    if session_data and session_data.get("completed"):
        _show_results(session_data)
        return

    if session_data and session_data.get("session_id"):
        _show_question(engine, session_data)
        return

    # ── Setup: choose job posting, upload CV, and start ──────────
    postings = _load_job_postings()
    if not postings:
        st.warning("⚠️ Mock iş ilanı bulunamadı.")
        return

    posting_labels = [f"{p['job_title']} – {p.get('department', 'N/A')}" for p in postings]
    selected_idx = st.selectbox(
        "İş İlanı Seçin",
        range(len(postings)),
        format_func=lambda i: posting_labels[i],
    )
    selected_posting = postings[selected_idx]

    with st.expander("📋 İlan Detayları", expanded=False):
        st.markdown(f"**Pozisyon:** {selected_posting['job_title']}")
        st.markdown(f"**Departman:** {selected_posting.get('department', 'N/A')}")
        st.markdown(f"**Gerekli Beceriler:** {selected_posting.get('required_skills', '-')}")

    st.markdown("---")

    # ── CV Upload (required) ───────────────────────────────────
    st.markdown("### 📄 CV Yükle")
    uploaded_file = st.file_uploader(
        "PDF formatında CV yükleyin",
        type=["pdf"],
        help="Mülakat soruları CV'nize göre kişiselleştirilecek. Maksimum 10 MB.",
    )

    # Parse CV if uploaded
    cv_summary = ""
    if uploaded_file:
        cache_key = f"interview_cv_parsed_{uploaded_file.name}_{uploaded_file.size}"
        if cache_key not in st.session_state:
            with st.spinner("📄 CV parse ediliyor..."):
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    shutil.copyfileobj(uploaded_file, tmp)
                    tmp_path = tmp.name
                try:
                    parsed = parse_cv_from_pdf(tmp_path)
                    cv_summary = _build_cv_summary(parsed)
                    st.session_state[cache_key] = cv_summary
                except Exception as e:
                    st.error(f"❌ CV parse hatası: {e}")
                    return
                finally:
                    Path(tmp_path).unlink(missing_ok=True)
        else:
            cv_summary = st.session_state[cache_key]

        with st.expander("📋 Algılanan CV Özeti", expanded=False):
            st.text(cv_summary)
    else:
        st.info("⬆️ Mülakatı başlatmak için önce CV yüklemeniz gerekiyor.")

    st.markdown("---")

    col1, col2 = st.columns(2)
    with col1:
        question_count = st.number_input("Soru Sayısı", min_value=3, max_value=12, value=6)
    with col2:
        candidate_name = st.text_input("Adınız", value="Demo Aday")

    # Button disabled unless CV is uploaded
    start_btn = st.button(
        "🎙️ Mülakatı Başlat",
        use_container_width=True,
        type="primary",
        disabled=(uploaded_file is None),
    )

    if start_btn:
        job_posting = JobPostingInput(**selected_posting)
        application_id = str(selected_posting.get("id", "demo-interview"))

        with st.spinner("🤖 AI mülakat soruları hazırlanıyor..."):
            try:
                session = asyncio.run(
                    engine.start_session(
                        application_id=application_id,
                        job_posting=job_posting,
                        cv_summary=cv_summary or "",
                        candidate_name=candidate_name,
                        question_count=question_count,
                    )
                )
            except Exception as e:
                st.error(f"❌ Mülakat başlatılamadı: {e}")
                return

        session_id = str(session.id)
        first_q = engine.get_current_question(session_id)

        st.session_state.interview_session = {
            "session_id": session_id,
            "job_title": selected_posting["job_title"],
            "candidate_name": candidate_name,
            "total_questions": first_q["total_questions"] if first_q else question_count,
            "started_at": time.time(),
            "completed": False,
            "summary": None,
        }

        st.success(f"✅ Mülakat başladı — {question_count} soru hazır!")
        st.rerun()


def _show_question(engine: InterviewEngine, session_data: dict) -> None:
    """Show the current question and accept an answer."""
    session_id = session_data["session_id"]
    total = session_data["total_questions"]
    elapsed = int(time.time() - session_data["started_at"])

    # Header info
    st.markdown(f"### 🎙️ Mülakat: {session_data['job_title']}")
    st.markdown(f"**Aday:** {session_data['candidate_name']} | "
                f"**Süre:** {elapsed // 60}:{elapsed % 60:02d}")

    q = engine.get_current_question(session_id)

    if q is None:
        # All questions answered — go to evaluation
        st.markdown("---")
        st.info("✅ Tüm sorular cevaplandı! Değerlendirme yapılıyor...")
        _end_session(engine, session_data)
        return

    current = q["question_index"]
    remaining = q["remaining"]

    # Progress
    progress = current / total
    st.progress(progress)
    st.markdown(f"**Soru {current + 1} / {total}** — {remaining} soru kaldı")
    st.markdown("---")

    # Display question
    st.markdown(f"""
    <div style="background: #f8f7ff; border-left: 4px solid #764ba2; 
                padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
        <strong>🤖 AI Mülakatçı:</strong><br><br>
        {q["question_text"]}
    </div>
    """, unsafe_allow_html=True)

    # Answer input
    answer = st.text_area(
        "Cevabınız",
        placeholder="Cevabınızı buraya yazın...",
        height=150,
        key=f"answer_{session_id}_{current}",
    )

    col1, col2 = st.columns([3, 1])
    with col1:
        submit_btn = st.button(
            "📤 Cevabı Gönder" if remaining > 1 else "📤 Son Cevabı Gönder ve Bitir",
            use_container_width=True,
            type="primary",
            disabled=not answer or not answer.strip(),
        )
    with col2:
        skip_btn = st.button("⏭️ Atla", use_container_width=True)

    if submit_btn and answer and answer.strip():
        try:
            engine.submit_answer(session_id, current, answer.strip())
        except ValueError as e:
            st.error(f"❌ {e}")
            return
        st.rerun()

    if skip_btn:
        try:
            engine.submit_answer(session_id, current, "(Aday bu soruyu atladı)")
        except ValueError as e:
            st.error(f"❌ {e}")
            return
        st.rerun()


def _end_session(engine: InterviewEngine, session_data: dict) -> None:
    """End the interview and show evaluation."""
    session_id = session_data["session_id"]

    with st.spinner("🤖 AI değerlendirmesi yapılıyor..."):
        try:
            summary = asyncio.run(engine.end_session(session_id))
        except Exception as e:
            st.error(f"❌ Değerlendirme hatası: {e}")
            return

    session_data["completed"] = True
    session_data["summary"] = summary
    st.session_state.interview_session = session_data

    # Store for ranking
    if "test_results" not in st.session_state:
        st.session_state.test_results = {}
    st.session_state.test_results["interview"] = summary.overall_interview_score

    st.rerun()


def _show_results(session_data: dict) -> None:
    """Display interview evaluation results."""
    summary = session_data["summary"]

    st.markdown("### 🏆 Mülakat Değerlendirmesi")
    st.markdown(f"**Pozisyon:** {session_data['job_title']} | "
                f"**Aday:** {session_data['candidate_name']}")
    st.markdown("---")

    # Overall score
    overall = summary.overall_interview_score or 0
    passed = summary.is_passed

    badge = "badge-pass" if passed else "badge-fail"
    badge_text = "GEÇTİ ✅" if passed else "KALDI ❌"

    st.markdown(f"""
    <div class="score-card" style="margin-bottom: 1.5rem;">
        <div class="score-value">{overall:.1f}</div>
        <div class="score-label">Genel Puan (/100)</div>
        <br>
        <span class="{badge}">{badge_text}</span>
    </div>
    """, unsafe_allow_html=True)

    # Dimension scores
    st.markdown("#### 📊 Detaylı Puanlar")
    dimensions = [
        ("İletişim", summary.communication_score),
        ("Teknik Bilgi", summary.technical_knowledge_score),
        ("İş Uyumu", summary.job_match_score),
        ("Deneyim Uyumu", summary.experience_alignment_score),
        ("Güven Skoru", summary.average_confidence_score),
    ]

    cols = st.columns(len(dimensions))
    for col, (label, score) in zip(cols, dimensions):
        val = score or 0
        with col:
            st.markdown(f"""
            <div class="score-card">
                <div class="score-value" style="font-size: 1.8rem;">{val:.1f}</div>
                <div class="score-label">{label}</div>
            </div>
            """, unsafe_allow_html=True)

    # Progress bars
    st.markdown("---")
    for label, score in dimensions:
        val = score or 0
        st.markdown(f"**{label}:** {val:.1f}/100")
        st.progress(val / 100)

    # Text summary
    st.markdown("---")
    st.markdown("#### 📝 Değerlendirme Özeti")

    if summary.summary_text:
        st.markdown(f"> {summary.summary_text}")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**💪 Güçlü Yönler:**")
        st.markdown(summary.strengths or "—")
    with col2:
        st.markdown("**⚠️ Gelişim Alanları:**")
        st.markdown(summary.weaknesses or "—")

    if summary.recommendations:
        st.markdown("**💡 Öneriler:**")
        st.markdown(summary.recommendations)

    # Stats
    st.markdown("---")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Toplam Soru", summary.total_questions_asked or 0)
    with col2:
        st.metric("Cevaplanan", summary.total_questions_answered or 0)
    with col3:
        elapsed = int(time.time() - session_data["started_at"])
        st.metric("Süre", f"{elapsed // 60}:{elapsed % 60:02d}")

    # Reset
    st.markdown("---")
    if st.button("🔄 Yeni Mülakat", use_container_width=True):
        del st.session_state["interview_session"]
        st.rerun()
