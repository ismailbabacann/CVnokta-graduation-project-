"""
Tests page — AI-generated Technical Assessment & English Proficiency tests.

Users select a job posting, AI generates test questions, user solves them.
"""

from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path

import streamlit as st

from app.core.test_engine import TestEngine
from app.models.job_posting import JobPostingInput
from app.models.test import AnswerItem, TestSubmission

MOCK_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "mock"


def _load_job_postings() -> list[dict]:
    """Load sample job postings from mock data."""
    path = MOCK_DATA_DIR / "sample_job_postings.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def render() -> None:
    st.markdown("## 📝 Testler")
    st.markdown("İş ilanı seçin, AI sınav sorularını hazırlasın, çözün ve sonuçlarınızı görün.")
    st.markdown("---")

    # Ensure engine is created once per session
    if "test_engine" not in st.session_state:
        st.session_state.test_engine = TestEngine()

    engine: TestEngine = st.session_state.test_engine

    # ── Job posting selection ───────────────────────────────────
    postings = _load_job_postings()
    if not postings:
        st.warning("⚠️ Mock iş ilanı bulunamadı.")
        return

    posting_labels = [f"{p['job_title']} – {p.get('department', 'N/A')}" for p in postings]
    selected_idx = st.selectbox("İş İlanı Seçin", range(len(postings)), format_func=lambda i: posting_labels[i])
    selected_posting = postings[selected_idx]
    job_posting = JobPostingInput(**selected_posting)
    job_posting_id = str(selected_posting.get("id", "default"))

    with st.expander("📋 İlan Detayları", expanded=False):
        st.markdown(f"**Pozisyon:** {selected_posting['job_title']}")
        st.markdown(f"**Gerekli Beceriler:** {selected_posting.get('required_skills', '-')}")

    st.markdown("---")

    # Test type selector
    test_type = st.radio(
        "Sınav Türü",
        ["technical_assessment", "english_test"],
        format_func=lambda t: "🔧 Teknik Değerlendirme" if t == "technical_assessment" else "🇬🇧 İngilizce Yeterlilik",
        horizontal=True,
    )

    # Controls
    col1, col2 = st.columns(2)
    with col1:
        question_count = st.number_input("Soru Sayısı", min_value=3, max_value=40, value=10)
    with col2:
        st.markdown("<br>", unsafe_allow_html=True)
        generate_btn = st.button("🤖 Soruları Oluştur", use_container_width=True)

    # ── Generate test ───────────────────────────────────────────
    state_key = f"test_session_{test_type}_{job_posting_id}"

    if generate_btn:
        with st.spinner("🤖 AI sınav soruları oluşturuyor..."):
            try:
                if test_type == "technical_assessment":
                    questions = asyncio.run(
                        engine.generate_technical_test(job_posting, count=question_count)
                    )
                else:
                    questions = asyncio.run(
                        engine.generate_english_test(job_posting_id, count=question_count)
                    )
            except Exception as e:
                st.error(f"❌ Soru oluşturma hatası: {e}")
                return

        if not questions:
            st.error("❌ AI soru üretemedi. Lütfen tekrar deneyin.")
            return

        response = engine.build_questions_response(test_type, questions)
        st.session_state[state_key] = {
            "questions": response.questions,
            "raw_questions": questions,
            "test_type": test_type,
            "time_limit": response.time_limit_minutes,
            "started_at": time.time(),
            "submitted": False,
            "result": None,
            "job_posting_id": job_posting_id,
        }
        st.success(f"✅ {len(questions)} soru oluşturuldu!")
        st.rerun()

    # ── Show test questions ─────────────────────────────────────
    session = st.session_state.get(state_key)
    if not session or session.get("submitted"):
        if session and session.get("result"):
            _show_result(session["result"], session.get("raw_questions", []))
        else:
            st.info("👆 Bir iş ilanı ve sınav türü seçip soruları oluşturun.")
        return

    questions = session["questions"]
    time_limit = session["time_limit"]
    elapsed = int(time.time() - session["started_at"])

    st.markdown(f"### ⏱️ Süre: {time_limit} dakika | Geçen: {elapsed // 60}:{elapsed % 60:02d}")
    st.progress(min(1.0, elapsed / (time_limit * 60)))

    st.markdown(f"**{len(questions)} soru** — Her soru için bir seçenek işaretleyin.")
    st.markdown("---")

    # Render questions
    answers: dict[str, int] = {}
    for i, q in enumerate(questions):
        st.markdown(f"**Soru {i + 1}** ({q.category} — {q.difficulty})")
        st.markdown(q.question)

        choice = st.radio(
            f"Seçiminiz (Soru {i+1})",
            options=range(len(q.options)),
            format_func=lambda idx, opts=q.options: f"{chr(65+idx)}) {opts[idx]}",
            key=f"q_{test_type}_{q.id}",
            horizontal=True,
            label_visibility="collapsed",
        )
        answers[q.id] = choice
        st.markdown("---")

    # Submit
    if st.button("✅ Sınavı Bitir", use_container_width=True, type="primary"):
        duration = int(time.time() - session["started_at"])
        submission = TestSubmission(
            application_id="demo-streamlit",
            test_type=test_type,
            job_posting_id=session["job_posting_id"],
            answers=[AnswerItem(question_id=qid, selected_option=ans) for qid, ans in answers.items()],
            duration_seconds=duration,
        )
        result = engine.grade_submission(submission, session["raw_questions"])

        session["submitted"] = True
        session["result"] = result
        st.session_state[state_key] = session

        # Store for ranking
        if "test_results" not in st.session_state:
            st.session_state.test_results = {}
        st.session_state.test_results[test_type] = result.score

        st.rerun()


def _show_result(result, questions) -> None:
    """Display grading results."""
    st.markdown("### 🏆 Sınav Sonuçları")

    # Score card row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{result.score}</div>
            <div class="score-label">Puan (/100)</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{result.correct_answers}</div>
            <div class="score-label">Doğru</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{result.wrong_answers}</div>
            <div class="score-label">Yanlış</div>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        mins = (result.duration_seconds or 0) // 60
        secs = (result.duration_seconds or 0) % 60
        st.markdown(f"""
        <div class="score-card">
            <div class="score-value">{mins}:{secs:02d}</div>
            <div class="score-label">Süre</div>
        </div>
        """, unsafe_allow_html=True)

    # Category breakdown
    if result.category_breakdown:
        st.markdown("#### Kategori Bazlı Sonuçlar")
        for cat, breakdown in result.category_breakdown.items():
            pct = round((breakdown.correct / breakdown.total) * 100, 1) if breakdown.total > 0 else 0
            label = cat.replace("_", " ").title()
            st.markdown(f"**{label}**: {breakdown.correct}/{breakdown.total} ({pct}%)")
            st.progress(pct / 100)

    # Answer review
    if questions:
        with st.expander("📋 Cevap Anahtarı", expanded=False):
            for i, q in enumerate(questions):
                correct_idx = q.correct_answer
                correct_letter = chr(65 + correct_idx)
                st.markdown(
                    f"**{i+1}.** {q.question[:100]}... → "
                    f"Doğru: **{correct_letter}) {q.options[correct_idx]}**"
                )
                if q.explanation:
                    st.caption(f"💡 {q.explanation}")

    # Reset button
    if st.button("🔄 Yeni Sınav", use_container_width=True):
        for key in list(st.session_state.keys()):
            if key.startswith("test_session_") or key.startswith("q_"):
                del st.session_state[key]
        st.rerun()
