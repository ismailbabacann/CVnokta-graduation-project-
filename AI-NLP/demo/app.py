"""
CVnokta AI-NLP Demo — Streamlit Application

Run:
    cd AI-NLP
    streamlit run demo/app.py --server.port 8501

This is AI-NLP's own test/demo surface. Not part of the production frontend.
"""

import sys
from pathlib import Path

# Ensure app package is importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import streamlit as st

# ── Page config ─────────────────────────────────────────────────────
st.set_page_config(
    page_title="CVnokta AI-NLP Demo",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS (matches frontend theme) ─────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    .stApp {
        max-width: 1200px;
        margin: 0 auto;
    }

    /* Primary purple button */
    .stButton > button {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1.5rem;
        font-weight: 600;
        transition: opacity 0.2s;
    }
    .stButton > button:hover {
        opacity: 0.9;
        color: white;
    }

    /* Score cards */
    .score-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .score-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #764ba2;
    }
    .score-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 0.25rem;
    }

    /* Header gradient */
    .main-header {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        color: white;
        padding: 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
    }
    .main-header h1 {
        color: white !important;
        margin: 0;
    }
    .main-header p {
        color: rgba(255,255,255,0.85);
        margin: 0.5rem 0 0 0;
    }

    /* Status badges */
    .badge-pass {
        background: #10b981;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
    }
    .badge-fail {
        background: #ef4444;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
    }

    /* Section headers */
    h2 {
        color: #1f2937 !important;
        border-bottom: 2px solid #764ba2;
        padding-bottom: 0.5rem;
    }

    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #f8f7ff 0%, #ffffff 100%);
    }
</style>
""", unsafe_allow_html=True)

# ── Sidebar ─────────────────────────────────────────────────────────
st.sidebar.markdown("## 🎯 CVnokta AI-NLP")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigation",
    ["🏠 Ana Sayfa", "📄 CV Analizi", "📝 Testler", "📊 Sıralama"],
    label_visibility="collapsed",
)

st.sidebar.markdown("---")
st.sidebar.markdown(
    "<small style='color: #9ca3af;'>AI-NLP Demo UI v1.0<br>"
    "FastAPI: <a href='http://localhost:8000/docs' target='_blank'>Swagger</a></small>",
    unsafe_allow_html=True,
)

# ── Page routing ────────────────────────────────────────────────────
if page == "🏠 Ana Sayfa":
    st.markdown("""
    <div class="main-header">
        <h1>🎯 CVnokta AI-NLP Demo</h1>
        <p>AI destekli işe alım platformu — Test & Demo arayüzü</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("### Hoş geldin! 👋")
    st.markdown("""
    Bu arayüz, AI-NLP mikroservisinin özelliklerini test etmek ve demo yapmak için tasarlandı.

    **Kullanılabilir modüller:**
    """)

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("""
        <div class="score-card">
            <div class="score-value">📄</div>
            <div class="score-label"><strong>CV Analizi</strong><br>
            PDF yükle, AI ile puanla</div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="score-card">
            <div class="score-value">📝</div>
            <div class="score-label"><strong>Sınavlar</strong><br>
            Teknik & İngilizce</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown("""
        <div class="score-card">
            <div class="score-value">📊</div>
            <div class="score-label"><strong>Sıralama</strong><br>
            Ağırlıklı final puanı</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")

    # System status
    st.markdown("### Sistem Durumu")
    try:
        from app.config import get_settings
        settings = get_settings()
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("API", "✅ Aktif")
        with col2:
            status = "✅ Gerçek" if settings.openai_api_key else "⚠️ Fallback"
            st.metric("LLM", status)
        with col3:
            st.metric("Model", settings.openai_model)
        with col4:
            st.metric("CV Eşik", f"{settings.cv_pass_threshold}/100")
    except Exception as e:
        st.error(f"Sistem durumu alınamadı: {e}")


elif page == "📄 CV Analizi":
    from demo.pages.cv_analysis import render
    render()

elif page == "📝 Testler":
    from demo.pages.tests import render
    render()

elif page == "📊 Sıralama":
    from demo.pages.rankings import render
    render()
