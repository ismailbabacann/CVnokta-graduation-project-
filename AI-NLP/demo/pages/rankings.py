"""
Rankings page — compute weighted final scores and rank candidates.

Candidates can be entered manually or pulled from session state
(CV analysis + test results).
"""

from __future__ import annotations

import streamlit as st

from app.core.ranking_engine import (
    WEIGHTS_WITHOUT_INTERVIEW,
    build_final_evaluation,
    rank_candidates,
)


def render() -> None:
    st.markdown("## 📊 Sıralama & Final Puanı")
    st.markdown("Adayların tüm aşama puanlarını girin ve ağırlıklı final puanını hesaplayın.")
    st.markdown("---")

    # Show current weights
    st.markdown("#### ⚖️ Ağırlıklar (Mülakat hariç)")
    w = WEIGHTS_WITHOUT_INTERVIEW
    wcol1, wcol2, wcol3 = st.columns(3)
    with wcol1:
        st.metric("CV Analizi", f"%{int(w['cv'] * 100)}")
    with wcol2:
        st.metric("Teknik Değerlendirme", f"%{int(w['general_test'] * 100)}")
    with wcol3:
        st.metric("İngilizce", f"%{int(w['english_test'] * 100)}")

    st.markdown("---")

    # ── Mode selection ──────────────────────────────────────────
    mode = st.radio(
        "Veri Kaynağı",
        ["manual", "session"],
        format_func=lambda m: "📝 Manuel Giriş" if m == "manual" else "📦 Bu Oturumdan",
        horizontal=True,
    )

    if mode == "manual":
        _manual_entry()
    else:
        _from_session()


def _manual_entry() -> None:
    """Allow manual entry of candidate scores."""
    if "manual_candidates" not in st.session_state:
        st.session_state.manual_candidates = []

    st.markdown("### Aday Ekle")
    with st.form("add_candidate", clear_on_submit=True):
        col1, col2 = st.columns(2)
        with col1:
            name = st.text_input("Aday Adı", placeholder="Eray İnal")
        with col2:
            app_id = st.text_input("Application ID", placeholder="demo-001")

        col1, col2, col3 = st.columns(3)
        with col1:
            cv_score = st.number_input("CV Puanı", min_value=0.0, max_value=100.0, value=75.0, step=0.5)
        with col2:
            gen_score = st.number_input("Teknik Değerlendirme", min_value=0.0, max_value=100.0, value=70.0, step=0.5)
        with col3:
            eng_score = st.number_input("İngilizce", min_value=0.0, max_value=100.0, value=65.0, step=0.5)

        submitted = st.form_submit_button("➕ Aday Ekle", use_container_width=True)
        if submitted and name:
            st.session_state.manual_candidates.append({
                "name": name,
                "app_id": app_id or f"manual-{len(st.session_state.manual_candidates)+1}",
                "cv": cv_score,
                "gen": gen_score,
                "eng": eng_score,
            })

    candidates = st.session_state.manual_candidates
    if not candidates:
        st.info("👆 En az bir aday ekleyin.")
        return

    _compute_and_display(candidates)

    if st.button("🗑️ Listeyi Temizle"):
        st.session_state.manual_candidates = []
        st.rerun()


def _from_session() -> None:
    """Pull scores from CV analysis and test results in this session."""
    cv_results = st.session_state.get("cv_results", {})
    test_results = st.session_state.get("test_results", {})

    if not cv_results:
        st.warning("⚠️ Bu oturumda henüz CV analizi yapılmadı. Önce '📄 CV Analizi' sayfasından bir CV yükleyin.")
        return

    gen_score = test_results.get("technical_assessment")
    eng_score = test_results.get("english_test")

    if gen_score is None and eng_score is None:
        st.info("ℹ️ Test sonuçları bulunamadı — sadece CV puanları kullanılacak. Testleri çözmek için '📝 Testler' sayfasına gidin.")

    candidates = []
    for app_id, info in cv_results.items():
        candidates.append({
            "name": info.get("name", "Anonim"),
            "app_id": app_id,
            "cv": info.get("score", 0),
            "gen": gen_score,
            "eng": eng_score,
        })

    _compute_and_display(candidates)


def _compute_and_display(candidates: list[dict]) -> None:
    """Compute rankings and render results table."""
    evaluations = []
    for c in candidates:
        ev = build_final_evaluation(
            application_id=c["app_id"],
            candidate_name=c["name"],
            cv_score=c.get("cv"),
            general_test_score=c.get("gen"),
            english_test_score=c.get("eng"),
        )
        evaluations.append(ev)

    rankings = rank_candidates(evaluations)

    st.markdown("### 🏆 Sıralama Sonuçları")

    for rank in rankings:
        position_emoji = {1: "🥇", 2: "🥈", 3: "🥉"}.get(rank.rank_position, f"#{rank.rank_position}")

        col1, col2, col3, col4, col5 = st.columns([0.5, 2, 1.5, 1.5, 1.5])
        with col1:
            st.markdown(f"### {position_emoji}")
        with col2:
            st.markdown(f"**{rank.candidate_name}**")
            st.caption(f"ID: {rank.application_id}")
        with col3:
            st.metric("CV", f"{rank.cv_score or 0:.1f}")
        with col4:
            st.metric("Teknik", f"{rank.general_test_score or 0:.1f}")
        with col5:
            st.markdown(f"""
            <div class="score-card">
                <div class="score-value">{rank.weighted_total}</div>
                <div class="score-label">Final Puanı</div>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("---")

    # Summary table
    with st.expander("📊 Detaylı Tablo", expanded=True):
        import pandas as pd
        df = pd.DataFrame([
            {
                "Sıra": r.rank_position,
                "Aday": r.candidate_name,
                "CV": r.cv_score or 0,
                "Teknik": r.general_test_score or 0,
                "İngilizce": r.english_test_score or 0,
                "Final Puanı": r.weighted_total,
            }
            for r in rankings
        ])
        st.dataframe(df, use_container_width=True, hide_index=True)
