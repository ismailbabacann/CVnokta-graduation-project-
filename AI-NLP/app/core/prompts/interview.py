"""
Prompt templates for AI Video Interview evaluation.

Contains:
  - System prompt for evaluation context
  - First question template (used in HTTP flow)
  - Follow-up template (used in HTTP flow)
  - Comprehensive evaluation template with rubric (used by both HTTP and Realtime)
"""

INTERVIEW_SYSTEM_PROMPT = """\
Sen uzman bir İK değerlendirme asistanısın. Mülakat transkriptlerini analiz ederek \
adayların performansını değerlendiriyorsun.

Değerlendirme prensiplerin:
1. SADECE transkriptte bulunan bilgilere dayanarak skorla — asla olmayan şeyleri varsayma.
2. Her skor için rubric'teki tanımları kullan — kendi standardını uydurma.
3. Pozisyon seviyesine göre beklenti kalibrasyonu yap (Junior vs Senior farklı).
4. STT (konuşmadan metne) transkript olduğu için yazım/dilbilgisi hatalarını SKORLAMA.
5. İçerik, mantıksal tutarlılık ve derinliğe odaklan.
6. Her zaman geçerli JSON döndür.
"""

INTERVIEW_FIRST_QUESTION_TEMPLATE = """\
## Job Posting
**Title:** {job_title}
**Responsibilities:** {responsibilities}
**Required Skills:** {required_skills}

## Candidate CV Summary
{cv_summary}

Generate an opening interview question that:
1. Is welcoming and puts the candidate at ease
2. Relates to their background and the position
3. Is open-ended to encourage detailed response

Return ONLY the question text, nothing else.
"""

INTERVIEW_FOLLOWUP_TEMPLATE = """\
## Context
Job Title: {job_title}
Question #{question_number}
Topics already covered: {covered_topics}

## Previous Q&A
{previous_qa}

## Candidate's Last Answer
{last_answer}

Generate a follow-up question that:
1. Builds on the candidate's response OR explores a new relevant topic
2. Assesses a different dimension than previous questions
3. Is specific enough to elicit a substantive answer

Return ONLY the question text, nothing else.
"""

INTERVIEW_EVALUATION_TEMPLATE = """\
## Pozisyon Bilgileri
{job_requirements}

## Mülakat Transkripti
{transcript}

## DEĞERLENDİRME RUBRİĞİ

Her skor aşağıdaki 5-seviyeli tanıma göre verilmelidir:

### Skor Seviyeleri:
| Aralık | Seviye | Tanım |
|--------|--------|-------|
| 0-20 | Çok Zayıf | Cevap yok veya tamamen alakasız. Temel bilgi eksikliği. |
| 21-40 | Zayıf | Yüzeysel cevaplar, somut örnek yok, ciddi bilgi boşlukları. |
| 41-55 | Orta | Kabul edilebilir cevaplar ama derinlik eksik. Bazı doğru noktalar var. |
| 56-75 | İyi | İlgili ve tutarlı cevaplar, bazı somut örnekler. İş gereksinimleriyle genel uyum. |
| 76-100 | Mükemmel | Detaylı, somut örneklerle desteklenmiş, derinlikli cevaplar. Güçlü uyum. |

### Değerlendirme Boyutları:

1. **technical_knowledge_score**: Pozisyon gereksinimleriyle teknik bilgi uyumu
   - Doğru terminoloji kullanımı
   - Kavramların derinliğini anlama
   - Pratik uygulama örnekleri

2. **communication_score**: İletişim kalitesi
   - Düşüncelerini açık ve yapılandırılmış ifade etme
   - Aktif dinleme sinyalleri (sorulara uygun cevap)
   - Profesyonel dil kullanımı
   - ÖNEMLİ: Bu transkript STT (konuşmadan metne) ile oluşturulmuştur. Yazım hataları, dilbilgisi hataları ve kelime tekrarları STT kaynaklıdır — bunları KESİNLİKLE cezalandırma. Sadece içerik ve mantıksal tutarlılığı değerlendir.

3. **problem_solving_score**: Problem çözme yaklaşımı
   - Yapısal düşünme (problemi parçalara ayırma)
   - Alternatif çözümler üretme
   - Belirsizlikle başa çıkma yeteneği

4. **job_match_score**: Pozisyonla genel uyum
   - Deneyim/beceri ile iş gereksinimleri örtüşmesi
   - Sorumlulukları anlama ve sahiplenme
   - Sektör/domain bilgisi

5. **experience_alignment_score**: Deneyim uyumu
   - Geçmiş deneyimlerin pozisyona transferi
   - Somut başarı örnekleri
   - Kademeli gelişim göstermesi

6. **motivation_score**: Motivasyon ve kültürel uyum
   - Pozisyona/şirkete gerçek ilgi göstermesi
   - Kariyer hedefleriyle uyum
   - Uzun vadeli bağlılık sinyalleri

7. **overall_interview_score**: Genel performans (diğer skorların ağırlıklı ortalaması değil, bütüncül değerlendirme)

### PUANLAMA YAKLAŞIMI — KRİTİK
- Adayın güçlü yönlerini ön plana çıkar. Cevap verilen her soru pozitif sinyal taşır.
- Cevaplar kısa olsa bile konuyla ilgili ve doğruysa, en az 55-60 arası skorla.
- Somut örnek veren ve detaylı cevaplayan adaylara 70+ ver.
- Sadece tamamen alakasız, tutarsız veya cevap vermeyen adaylara 40 altı ver.
- STT kaynaklı transkript bozukluklarını (kesilmiş kelimeler, tekrarlar) ASLA cezalandırma.

### Tavsiye Skalası (recommendation_level):
- "strongly_recommend": Olağanüstü aday, hemen teklif yapılmalı (overall >= 76)
- "recommend": Güçlü aday, sürecin devamı uygun (overall 60-75)
- "neutral": Ortalama aday, ek değerlendirme gerekebilir (overall 45-59)
- "not_recommend": Zayıf performans, bu pozisyon için uygun değil (overall 25-44)
- "strongly_not_recommend": Çok zayıf, ciddi uyumsuzluklar (overall < 25)

## ÇIKTI FORMATI

SADECE geçerli JSON döndür:
{{
  "technical_knowledge_score": <float 0-100>,
  "communication_score": <float 0-100>,
  "problem_solving_score": <float 0-100>,
  "job_match_score": <float 0-100>,
  "experience_alignment_score": <float 0-100>,
  "motivation_score": <float 0-100>,
  "overall_interview_score": <float 0-100>,
  "recommendation_level": "<strongly_recommend|recommend|neutral|not_recommend|strongly_not_recommend>",
  "summary_text": "<2-3 paragraf özet — adayın güçlü/zayıf yönleri ve genel izlenim>",
  "strengths": ["güçlü yön 1", "güçlü yön 2", "güçlü yön 3"],
  "weaknesses": ["zayıf yön 1", "zayıf yön 2"],
  "recommendations": "<İK ekibine öneriler — aday ile ilgili dikkat edilecek noktalar>",
  "score_justifications": {{
    "technical_knowledge": "<bu skoru neden verdin, hangi cevaba dayanıyor>",
    "communication": "<bu skoru neden verdin>",
    "problem_solving": "<bu skoru neden verdin>",
    "job_match": "<bu skoru neden verdin>",
    "motivation": "<bu skoru neden verdin>"
  }}
}}

ÖNEMLİ: 
- strengths ve weaknesses MUTLAKA liste (array) formatında olmalı.
- score_justifications her skor için transkriptten somut referans içermeli.
- overall_interview_score diğerlerinin basit ortalaması DEĞİL, bütüncül değerlendirme.
"""

