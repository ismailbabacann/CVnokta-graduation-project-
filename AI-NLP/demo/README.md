# CVnokta — AI CV Analiz Demo Dashboard

## Ne Yapar?

Bu demo, AI-NLP modülündeki **CV Analiz Pipeline**'ını interaktif bir Streamlit dashboardu olarak sunar:

1. **İş İlanları** — 3 örnek iş ilanı görüntüleme
2. **İlan Detayı** — İlanın tüm detayları (sorumluluklar, nitelikler, yetenekler)
3. **CV Yükleme** — PDF formatında CV yükleyerek AI analiz başlatma
4. **Sonuçlar** — 100 üzerinden puan, eşleşen/eksik yetenekler, genel değerlendirme
5. **Pipeline Görselleştirme** — CV → Metin Çıkarma → Ayrıştırma → Embedding → RAG → GPT → Sonuç

## Pipeline Adımları

```
📄 CV Yükleme → 📝 Metin Çıkarma → 🔍 CV Ayrıştırma → 🔗 Embedding → 🔎 RAG Eşleme → 🤖 GPT Puanlama → ✅ Sonuç
```

| Adım | Teknoloji | Açıklama |
|------|----------|----------|
| Metin Çıkarma | PyMuPDF | PDF'den ham metin çıkarılır |
| CV Ayrıştırma | Regex + NLP | İsim, yetenekler, deneyim, eğitim ayrıştırılır |
| Embedding | sentence-transformers | Vektör temsilleri oluşturulur |
| RAG Eşleme | FAISS | CV ile iş gereksinimleri eşleştirilir |
| GPT Puanlama | GPT-4o-mini | AI puan ve değerlendirme üretir |
| Karar | Lokal | Skor ≥ 85 → Geçti |

## Kurulum

### 1. Conda ortamını aktifleştirin

```bash
conda activate Agency-Duplicate
```

### 2. Ana bağımlılıkları kurun (henüz kurulmadıysa)

```bash
cd AI-NLP
pip install -r requirements.txt
```

### 3. Demo bağımlılıklarını kurun

```bash
pip install -r demo/requirements.txt
```

### 4. API anahtarını ayarlayın

`demo/.env` dosyasını açın ve OpenAI API anahtarınızı girin:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 5. Çalıştırın

```bash
cd AI-NLP
streamlit run demo/app.py
```

Dashboard otomatik olarak http://localhost:8501 adresinde açılacaktır.

## Dosya Yapısı

```
demo/
├── app.py                  ← Streamlit dashboard (ana dosya)
├── .env                    ← API anahtarı (doldurun!)
├── requirements.txt        ← Demo-spesifik bağımlılıklar
├── README.md               ← Bu dosya
├── data/
│   └── job_postings.json   ← 3 örnek iş ilanı
├── uploads/                ← Yüklenen CV'ler (otomatik oluşturulur)
└── static/                 ← Statik dosyalar (ileride kullanılabilir)
```

## Not

- Mevcut `app/` kodlarında **hiçbir değişiklik yapılmamıştır**.
- Demo, var olan modülleri (`app.core.cv_scorer`, `app.services.*`, vb.) doğrudan import eder.
- İlk çalıştırmada embedding modeli (~90 MB) indirilecektir.
