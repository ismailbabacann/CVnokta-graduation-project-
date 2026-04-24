"""
Chatbot API endpoint for the CVnokta career assistant.

POST /api/v1/chatbot/chat  — Send a message and get a career-focused reply
"""

from __future__ import annotations

import logging
from typing import List, Optional
import openai

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """Sen HR AI platformunun Kariyer Asistanısın. Adına "HR AI Asistanı" diyebilirsin.
HR AI, iş başvurularını yönetmek ve optimize etmek için kullanılan modern, yapay zeka destekli bir İK platformudur.
Önemli Bilgiler:
- Geliştiriciler / Sistemi Kuranlar: İsmail Babacan, Mustafa Özger, Eray İnal.
- Geliştirildiği Yer: Bu sistem Akdeniz Üniversitesi öğrencileri tarafından geliştirilmiştir.

Görevin:
- İş başvurusu yapan adaylara yardımcı olmak
- CV hazırlama konusunda pratik ipuçları vermek
- İş başvuru sürecini açıklamak
- Mülakat hazırlığı hakkında tavsiyeler vermek
- HR AI sistemlerini açıklamak
- Platform kullanımı hakkında rehberlik etmek

Platform hakkında bilgiler:
- HR AI'ye başvuranlar önce CV değerlendirmesinden geçer (AI tabanlı)
- Sonra teknik test ve İngilizce testi aşamaları vardır
- Ardından AI mülakat (video/sesli) gerçekleştirilir
- Mülakat davetleri e-posta ile gönderilir
- Başvuru durumu "Başvurduğum İlanlar" > "Sonuçlarım" sayfasından takip edilir
- İlk değerlendirme süreci genellikle 1-2 hafta sürer

Yanıt kuralları:
- Daima Türkçe yanıt ver
- Kısa, öz ve samimi ol (3-5 cümle ideal)
- Madde listesi kullanacaksan maksimum 4-5 madde
- Teknik jargondan kaçın, sade bir dil kullan
- Eğer soru platforma özel değilse genel kariyer tavsiyesi ver
- Konu dışı sorularda (politika, din, vs.) nazikçe kariyer konularına yönlendir
"""

# ── Pydantic models ─────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User's message")
    history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Previous conversation messages (optional, max last 6)",
    )


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant's reply")
    success: bool = True


# ── Knowledge Base (Local Cache) ─────────────────────────────────────────────
_KNOWLEDGE_BASE: dict[str, str] = {
    "hr ai nedir": "HR AI, İnsan Kaynakları süreçlerini otomatikleştirmek ve daha adil hale getirmek için yapay zeka kullanan bir sistemdir. CV'nizi analiz eder, teknik becerilerinizi değerlendirir ve mülakatınızı yönetir.",
    "elenmemek için ne yapmalıyım": "Elenmemek için şunlara dikkat et: 1) CV'ni ilana özel anahtar kelimelerle hazırla, 2) Profil alanlarını eksiksiz doldur, 3) Teknik ve İngilizce testlere çalışarak gir, 4) AI mülakatında net ve özgüvenli konuş.",
    "iyi cv nasıl olur": "İyi bir CV; kısa, öz, okunması kolay, deneyim ve başarı odaklı olmalıdır. İlana uygun anahtar kelimeler içermeli, imla hatalarından arınmış olmalı ve mutlaka güncel iletişim bilgilerinizi barındırmalıdır.",
    "mülakat maili ne zaman gelir": "Başvurunuz olumlu değerlendirildiği takdirde ilk aşamayı geçtikten sonra (genellikle 1-2 hafta içerisinde) kayıtlı e-posta adresinize otomatik olarak mülakat maili gönderilir.",
    "başvuru sürecim nasıl ilerliyor": "Başvuru durumunuzu profilinizdeki 'Başvurduğum İlanlar' > 'Sonuçlarım' sekmesinden anlık olarak takip edebilirsiniz. Önce CV değerlendirmesi, ardından testler ve mülakat aşamalarından geçersiniz.",
    "sistemi kim kurdu": "HR AI platformu İsmail Babacan, Mustafa Özger ve Eray İnal tarafından kurulmuş ve geliştirilmiştir.",
    "kim tarafından geliştirildi": "Bu sistem Akdeniz Üniversitesi öğrencileri tarafından geliştirilmiştir.",
    "ismail babacan kimdir": "İsmail Babacan, HR AI platformunun kurucu geliştiricilerinden ve Akdeniz Üniversitesi öğrencilerinden biridir.",
    "mustafa özger kimdir": "Mustafa Özger, HR AI platformunun kurucu geliştiricilerinden ve Akdeniz Üniversitesi öğrencilerinden biridir.",
    "eray inal kimdir": "Eray İnal, HR AI platformunun kurucu geliştiricilerinden ve Akdeniz Üniversitesi öğrencilerinden biridir.",
    "akdeniz üniversitesi": "HR AI sistemi, Akdeniz Üniversitesi'nin vizyoner öğrencileri olan İsmail Babacan, Mustafa Özger ve Eray İnal tarafından geliştirilmiş gurur verici bir projedir.",
    "sistem nasıl çalışır": "Sistem önce CV'nizi yapay zeka ile analiz eder, uygun bulunursanız teknik ve İngilizce testlerine girersiniz. Bu aşamaları geçen adaylar yapay zeka destekli video/sesli mülakata davet edilir.",
    "iletişime nasıl geçerim": "Sorun yaşıyorsanız Yardım sayfasındaki 'Destek Ekibine Ulaş' butonu ile bize mail atabilirsiniz.",
    "cv puanım düşük çıktı": "CV puanınız, iş ilanındaki aranan yeteneklerle uyuşmadığında düşük çıkabilir. CV'nize ilandaki anahtar kelimeleri ve teknolojileri (eğer gerçekten biliyorsanız) ekleyerek puanınızı yükseltebilirsiniz.",
    "test süresi ne kadar": "Teknik testler genellikle 30 dakika, İngilizce testleri ise 25 dakika sürmektedir.",
}

# ── Knowledge Base (Company/Employer Local Cache) ────────────────────────────
_COMPANY_KNOWLEDGE_BASE: dict[str, str] = {
    "ilan nasıl verilir": "Yeni bir iş ilanı vermek için sol menüden 'Yeni İlan Ver' (Create Job) sekmesine tıklayabilir, gerekli pozisyon detaylarını ve yetkinlikleri doldurarak ilanı yayınlayabilirsiniz.",
    "adayları nasıl değerlendiriyorsunuz": "hr.ai sistemi adayların CV'lerini Doğal Dil İşleme (NLP) ile tarar. Ardından belirlenen teknik ve İngilizce testlerine sokar. Başarılı olan adaylar yapay zeka ile otomatik mülakata alınır. Sonuçlar size rapor halinde sunulur.",
    "sistemi kim kurdu": "hr.ai platformu İsmail Babacan, Mustafa Özger ve Eray İnal tarafından kurulmuş ve geliştirilmiştir.",
    "kim tarafından geliştirildi": "Bu sistem Akdeniz Üniversitesi öğrencileri tarafından geliştirilmiştir.",
    "ismail babacan kimdir": "İsmail Babacan, hr.ai platformunun kurucu geliştiricilerinden ve Akdeniz Üniversitesi öğrencilerinden biridir.",
    "mustafa özger kimdir": "Mustafa Özger, hr.ai platformunun kurucu geliştiricilerinden ve Akdeniz Üniversitesi öğrencilerinden biridir.",
    "eray inal kimdir": "Eray İnal, hr.ai platformunun kurucu geliştiricilerinden ve Akdeniz Üniversitesi öğrencilerinden biridir.",
    "akdeniz üniversitesi": "hr.ai sistemi, Akdeniz Üniversitesi'nin vizyoner öğrencileri olan İsmail Babacan, Mustafa Özger ve Eray İnal tarafından geliştirilmiş gurur verici bir projedir.",
    "nlp nedir": "NLP (Doğal Dil İşleme), yapay zekanın insan dilini anlamasını sağlayan bir teknolojidir. Sistemimiz, adayların CV'lerini manuel okumak yerine NLP ile saniyeler içinde analiz edip ilana uygunluk (matching) puanı çıkarır.",
    "en iyi adayları nerede görürüm": "Sol menüdeki 'En İyi Adaylar' (Best Candidates) bölümünde, ilanınıza başvuran ve tüm test/mülakat aşamalarından en yüksek puanları almış adayların sıralı listesini bulabilirsiniz.",
    "mülakatları sistem mi yapıyor": "Evet! Adaylar ilk aşamaları geçerse, sistemimiz pozisyona özel dinamik sorular üreterek adayla video/sesli mülakat gerçekleştirir. Siz sadece özet raporu ve adayın performans puanını görürsünüz.",
    "ücretli mi": "Şu anki pilot sürecimizde özelliklerimizi denemeniz için sistemimiz ücretsiz olarak kullanımınıza açıktır.",
    "nasıl destek alabilirim": "Sistemle ilgili bir hata veya teknik sorun yaşarsanız support@hr.ai adresinden bizimle iletişime geçebilirsiniz."
}

def _check_quick_answer(message: str, is_company: bool = False) -> Optional[str]:
    """
    Check if the user's message matches any cached question using difflib.
    Returns the answer if a good match is found, otherwise None.
    """
    import difflib
    msg_lower = message.lower().strip()
    
    kb = _COMPANY_KNOWLEDGE_BASE if is_company else _KNOWLEDGE_BASE

    # 1. Exact or simple substring match first
    for key, answer in kb.items():
        if key in msg_lower:
            return answer
            
    # 2. Fuzzy match against questions (cutoff 0.6 means 60% similarity required)
    matches = difflib.get_close_matches(msg_lower, kb.keys(), n=1, cutoff=0.6)
    if matches:
        return kb[matches[0]]
        
    return None


# ── Endpoint ───────────────────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Career assistant chatbot endpoint.

    Accepts a user message and optional conversation history,
    returns an AI-generated career-focused reply in Turkish.
    """
    settings = get_settings()

    # 1. Önce Cache'e (Yerel SSS) Bakalım
    cached_reply = _check_quick_answer(request.message, is_company=False)
    if cached_reply:
        logger.info("Chatbot cache hit for query: %s", request.message)
        return ChatResponse(reply=cached_reply)

    # 2. Cache'de bulunamadıysa OpenAI'ye gidelim
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="Chatbot şu anda kullanılamıyor. OpenAI API anahtarı yapılandırılmamış.",
        )

    # Build messages list for OpenAI
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]

    # Append conversation history (last 6 messages to stay within token limits)
    if request.history:
        for msg in request.history[-6:]:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": request.message})

    try:
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.7,
            max_tokens=600,
        )
        reply = response.choices[0].message.content or "Üzgünüm, şu an bir yanıt üretemiyorum."
        return ChatResponse(reply=reply.strip())

    except openai.RateLimitError:
        logger.warning("OpenAI rate limit hit in chatbot")
        raise HTTPException(
            status_code=429,
            detail="Şu anda çok fazla istek var. Lütfen birkaç saniye bekleyip tekrar deneyin.",
        )
    except openai.AuthenticationError:
        logger.error("OpenAI authentication error in chatbot")
        raise HTTPException(
            status_code=503,
            detail="Chatbot yapılandırma hatası. Lütfen daha sonra tekrar deneyin.",
        )
    except Exception as exc:
        logger.exception("Chatbot error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Chatbot şu anda yanıt veremiyor. Lütfen tekrar deneyin.",
        )


# ── Company Endpoint ───────────────────────────────────────────────────────────

_COMPANY_SYSTEM_PROMPT = """Sen hr.ai platformunun İşveren Asistanısın (Company Assistant).
hr.ai, işe alım süreçlerini optimize etmek için kullanılan modern, yapay zeka destekli bir İK platformudur.
Önemli Bilgiler:
- Geliştiriciler / Sistemi Kuranlar: İsmail Babacan, Mustafa Özger, Eray İnal.
- Geliştirildiği Yer: Bu sistem Akdeniz Üniversitesi öğrencileri tarafından geliştirilmiştir.

Görevin:
- Platformu kullanan işverenlere/şirket yöneticilerine yardımcı olmak
- İlan verme, aday filtreleme ve raporları okuma konularında pratik ipuçları vermek
- hr.ai sisteminin NLP (Doğal Dil İşleme) ve AI Mülakat mekanizmalarının şirketlere nasıl zaman ve maliyet kazandırdığını açıklamak

Platform işveren özellikleri:
- Şirketler "Yeni İlan Ver" sayfasından ilan oluşturabilir
- İlana başvuran adaylar önce AI destekli CV taramasından geçer
- Sonra teknik testler uygulanır
- Testleri geçen adaylarla otomatik AI mülakatı yapılır
- İşverenler en son "En İyi Adaylar" listesinde sistemin elediği, mülakatlardan yüksek puan alan "hazır" adayları görür

Yanıt kuralları:
- Daima Türkçe, son derece kurumsal ve profesyonel bir üslupla yanıt ver
- İşverenlerle konuştuğunu unutma (adaymış gibi tavsiye verme)
- Kısa, öz ol (3-5 cümle ideal)
"""

@router.post("/company", response_model=ChatResponse)
async def company_chat(request: ChatRequest):
    """
    Company assistant chatbot endpoint.
    """
    settings = get_settings()

    # 1. Önce Cache'e (Yerel SSS) Bakalım
    cached_reply = _check_quick_answer(request.message, is_company=True)
    if cached_reply:
        logger.info("Company Chatbot cache hit for query: %s", request.message)
        return ChatResponse(reply=cached_reply)

    # 2. Cache'de bulunamadıysa OpenAI'ye gidelim
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="Chatbot şu anda kullanılamıyor. OpenAI API anahtarı yapılandırılmamış.",
        )

    # Build messages list for OpenAI
    messages = [{"role": "system", "content": _COMPANY_SYSTEM_PROMPT}]

    # Append conversation history
    if request.history:
        for msg in request.history[-6:]:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": request.message})

    try:
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.7,
            max_tokens=600,
        )
        reply = response.choices[0].message.content or "Üzgünüm, şu an bir yanıt üretemiyorum."
        return ChatResponse(reply=reply.strip())

    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="Çok fazla istek var. Bekleyin.")
    except Exception as exc:
        logger.exception("Company Chatbot error: %s", exc)
        raise HTTPException(status_code=500, detail="Hata oluştu.")

