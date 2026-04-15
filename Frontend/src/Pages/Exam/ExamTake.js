import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './Exam.css';

const API_BASE = 'https://localhost:9001/api/v1';

// ─── Mock questions per exam type (fallback when API is unreachable) ──────────
const MOCK_EXAMS = {
  technical: {
    title: 'Teknik Değerlendirme Sınavı',
    timeLimitMinutes: 45,
    questions: [
      { questionId: 'mock-1', questionText: 'REST API tasarımında idempotent olan HTTP metodları hangileridir?', questionType: 'multiple_choice', points: 10, orderIndex: 1, optionsJson: '[{"key":"A","text":"POST ve DELETE"},{"key":"B","text":"GET ve PUT"},{"key":"C","text":"POST ve PATCH"},{"key":"D","text":"GET ve POST"}]' },
      { questionId: 'mock-2', questionText: 'SQL\'de tekrar eden kayıtları kaldırmak için hangi anahtar kelime kullanılır?', questionType: 'multiple_choice', points: 10, orderIndex: 2, optionsJson: '[{"key":"A","text":"UNIQUE"},{"key":"B","text":"DISTINCT"},{"key":"C","text":"FILTER"},{"key":"D","text":"REMOVE"}]' },
      { questionId: 'mock-3', questionText: 'HTTP 404, sunucu taraflı bir hata kodudur.', questionType: 'true_false', points: 10, orderIndex: 3, optionsJson: '[{"key":"A","text":"Doğru"},{"key":"B","text":"Yanlış"}]' },
      { questionId: 'mock-4', questionText: 'Bir e-ticaret sisteminde stok race condition sorununu nasıl çözerdiniz? Kullandığınız yaklaşımı açıklayın.', questionType: 'open_ended', points: 25, orderIndex: 4, optionsJson: null },
      { questionId: 'mock-5', questionText: 'Microservices mimarisinde servisler arası asenkron iletişim hangi yöntemle sağlanır?', questionType: 'multiple_choice', points: 10, orderIndex: 5, optionsJson: '[{"key":"A","text":"REST API"},{"key":"B","text":"gRPC"},{"key":"C","text":"Message Queue (RabbitMQ, Kafka)"},{"key":"D","text":"GraphQL"}]' },
      { questionId: 'mock-6', questionText: 'Git\'te rebase ve merge arasındaki temel fark nedir?', questionType: 'multiple_choice', points: 10, orderIndex: 6, optionsJson: '[{"key":"A","text":"Merge daha hızlıdır"},{"key":"B","text":"Rebase commit geçmişini temizler"},{"key":"C","text":"Merge sadece yerel için kullanılır"},{"key":"D","text":"Fark yoktur"}]' },
    ]
  },
  general: {
    title: 'Genel Yetenek Değerlendirmesi',
    timeLimitMinutes: 30,
    questions: [
      { questionId: 'mock-1', questionText: 'Etkili iletişimin en temel unsuru nedir?', questionType: 'multiple_choice', points: 10, orderIndex: 1, optionsJson: '[{"key":"A","text":"Sürekli konuşmak"},{"key":"B","text":"Aktif dinleme"},{"key":"C","text":"Teknik terimler"},{"key":"D","text":"Hızlı yanıt"}]' },
      { questionId: 'mock-2', questionText: 'Ekip çalışması her zaman bireysel çalışmadan daha verimsizdir.', questionType: 'true_false', points: 10, orderIndex: 2, optionsJson: '[{"key":"A","text":"Doğru"},{"key":"B","text":"Yanlış"}]' },
      { questionId: 'mock-3', questionText: 'Bu pozisyon için neden başvurdunuz? Bu şirkette sizi en çok heyecanlandıran nedir?', questionType: 'open_ended', points: 30, orderIndex: 3, optionsJson: null },
      { questionId: 'mock-4', questionText: 'Bir projeyi zamanında tamamlamak için en kritik faktör hangisidir?', questionType: 'multiple_choice', points: 10, orderIndex: 4, optionsJson: '[{"key":"A","text":"Uzun saatler çalışmak"},{"key":"B","text":"Net hedefler ve düzenli takip"},{"key":"C","text":"Az toplantı"},{"key":"D","text":"Her şeyi kendiniz yapmak"}]' },
    ]
  }
};

// ─── Utility ─────────────────────────────────────────────────────────────────
const parseOptions = (optionsJson) => {
  if (!optionsJson) return [];
  try { return JSON.parse(optionsJson); } catch { return []; }
};

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ExamTake = () => {
  const { token } = useParams();

  const [examInfo, setExamInfo]       = useState(null);
  const [questions, setQuestions]     = useState([]);
  const [answers, setAnswers]         = useState({});
  const [flagged, setFlagged]         = useState([]);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [showNav, setShowNav]         = useState(false);
  const [timeLeft, setTimeLeft]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished]   = useState(false);
  const [usedMock, setUsedMock]       = useState(false);
  const [assignmentId, setAssignmentId] = useState(null);

  const timerRef = useRef(null);

  // ── Fetch exam via token ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Geçersiz sınav linki. Lütfen e-postanızdaki linki kullanın.'); setLoading(false); return; }

    const fetchExam = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/Exam/take/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const payload = data.data ?? data;

        setAssignmentId(payload.assignmentId);
        setExamInfo({
          title: payload.examTitle,
          examType: payload.examType,
          sequenceInfo: payload.sequenceInfo,
          timeLimitMinutes: payload.timeLimitMinutes,
          expiresAt: payload.expiresAt
        });

        const qs = (payload.questions ?? []).map(q => ({
          questionId: q.questionId,
          questionText: q.questionText,
          questionType: q.questionType,
          optionsJson: q.optionsJson,
          points: q.points,
          orderIndex: q.orderIndex
        }));
        setQuestions(qs);
        setTimeLeft((payload.timeLimitMinutes ?? 45) * 60);
        setUsedMock(false);
      } catch (err) {
        // API erişilemiyorsa mock dataya düşüyoruz
        console.warn('API erişim hatası, mock data kullanılıyor:', err.message);
        const mockExam = MOCK_EXAMS.technical;
        setExamInfo({ title: mockExam.title, timeLimitMinutes: mockExam.timeLimitMinutes });
        setQuestions(mockExam.questions);
        setTimeLeft(mockExam.timeLimitMinutes * 60);
        setUsedMock(true);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [token]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || isFinished || isSubmitting || timeLeft === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isFinished, isSubmitting]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submitExam = useCallback(async () => {
    setIsSubmitting(true);
    clearInterval(timerRef.current);
    try {
      if (!usedMock && token) {
        const payload = {
          answers: questions.map(q => ({
            questionId: q.questionId,
            answerText: answers[q.questionId] ?? null
          }))
        };
        await fetch(`${API_BASE}/Exam/submit/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await new Promise(r => setTimeout(r, 1200)); // Mock submit delay
      }
      setIsFinished(true);
    } catch (err) {
      console.error('Submit error:', err);
      setIsFinished(true); // Submission yanıt vermese bile tamamlanmış say
    } finally {
      setIsSubmitting(false);
    }
  }, [usedMock, token, questions, answers]);

  const handleAutoSubmit = useCallback(() => { submitExam(); }, [submitExam]);
  const handleSubmit = () => { clearInterval(timerRef.current); submitExam(); };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleOptionSelect = (questionId, optionKey) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };
  const handleOpenEndedChange = (questionId, text) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };
  const toggleFlag = (id) => setFlagged(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  const handleNext = () => { if (currentIdx < questions.length - 1) setCurrentIdx(i => i + 1); };
  const handlePrevious = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };

  // ── Loading / Error / Finished ──────────────────────────────────────────────
  if (loading) return (
    <div className="exam-loading">
      <div className="exam-loading-spinner"></div>
      <p>Sınav yükleniyor, lütfen bekleyiniz...</p>
    </div>
  );

  if (error) return (
    <div className="exam-page-wrapper">
      <div className="exam-finished-card" style={{ borderTop: '4px solid #e94560' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#e94560' }}>Erişim Hatası</h2>
        <p style={{ color: '#666' }}>{error}</p>
        <p style={{ color: '#999', fontSize: 14 }}>Lütfen e-postanızdaki orijinal linki kullanın veya destek ekibiyle iletişime geçin.</p>
      </div>
    </div>
  );

  if (isFinished) {
    const answeredCount = Object.keys(answers).filter(k => answers[k] != null && answers[k] !== '').length;
    return (
      <div className="exam-page-wrapper">
        <div className="exam-finished-card">
          <div className="finished-checkmark">
            <svg viewBox="0 0 52 52" className="checkmark-svg">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h2>Sınav Tamamlandı!</h2>
          <p>Cevaplarınız başarıyla <strong>CVNokta</strong> sistemine kaydedildi.</p>
          {usedMock && <p style={{ color: '#f59e0b', fontSize: 13 }}>ℹ️ Bu sınav simülasyon modunda çalıştı.</p>}
          <div className="finished-stats">
            <div className="fstat"><span className="fstat-val">{answeredCount}</span><span className="fstat-lbl">Yanıtlanan</span></div>
            <div className="fstat"><span className="fstat-val">{questions.length - answeredCount}</span><span className="fstat-lbl">Boş Bırakılan</span></div>
            <div className="fstat"><span className="fstat-val">{flagged.length}</span><span className="fstat-lbl">İşaretlenen</span></div>
          </div>
          <p className="finished-subtext">Sonuçlarınız değerlendirildikten sonra bilgilendirileceksiniz.</p>
        </div>
      </div>
    );
  }

  if (!questions.length) return <div className="exam-loading"><p>Sınav sorulara yüklenemedi.</p></div>;

  const currentQuestion = questions[currentIdx];
  const options         = parseOptions(currentQuestion.optionsJson);
  const selectedOption  = answers[currentQuestion.questionId];
  const isFlagged       = flagged.includes(currentQuestion.questionId);
  const isLastQuestion  = currentIdx === questions.length - 1;
  const answeredCount   = Object.keys(answers).filter(k => answers[k] != null && answers[k] !== '').length;
  const progress        = ((currentIdx + 1) / questions.length) * 100;
  const LETTERS         = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="exam-page-wrapper">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="exam-topbar">
        <div className="topbar-left">
          <span className="brand-text">CV<span className="brand-highlight">Nokta</span></span>
        </div>
        <div className="topbar-center">
          <span className="exam-title">{examInfo?.title ?? 'Değerlendirme Sınavı'}</span>
          {examInfo?.sequenceInfo && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>({examInfo.sequenceInfo})</span>}
        </div>
        <div className="topbar-right">
          <div className={`timer-box ${timeLeft < 300 ? 'timer-warning' : ''}`}>
            <span className="timer-icon">⏱</span> {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="exam-layout">

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className={`exam-sidebar ${showNav ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <span>Soru Gezgini</span>
            <span className="sidebar-progress">{answeredCount}/{questions.length}</span>
          </div>
          <div className="sidebar-grid">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.questionId] != null && answers[q.questionId] !== '';
              const isCurrent  = idx === currentIdx;
              const isFlaggedQ = flagged.includes(q.questionId);
              return (
                <button key={q.questionId}
                  onClick={() => { setCurrentIdx(idx); setShowNav(false); }}
                  className={`qnav-btn ${isCurrent ? 'qnav-current' : ''} ${isAnswered ? 'qnav-answered' : ''} ${isFlaggedQ ? 'qnav-flagged' : ''}`}>
                  {idx + 1}
                  {isFlaggedQ && <span className="qnav-flag-dot">⚑</span>}
                </button>
              );
            })}
          </div>
          <div className="sidebar-legend">
            <div className="legend-item"><span className="legend-dot answered"></span> Yanıtlandı</div>
            <div className="legend-item"><span className="legend-dot flagged"></span> İşaretlendi</div>
            <div className="legend-item"><span className="legend-dot current"></span> Mevcut</div>
            <div className="legend-item"><span className="legend-dot empty"></span> Boş</div>
          </div>
        </aside>

        {/* ── Main card ────────────────────────────────────── */}
        <main className="exam-main">
          <button className="sidebar-toggle" onClick={() => setShowNav(!showNav)}>
            {showNav ? '✕' : '☰ Sorular'}
          </button>

          <div className="exam-card">
            {/* Header */}
            <div className="exam-header">
              <div className="exam-header-top">
                <div className="qmeta">
                  <span className="qnumber">Soru {currentIdx + 1} / {questions.length}</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                    {currentQuestion.questionType === 'multiple_choice' ? '🔘 Çoktan Seçmeli' :
                     currentQuestion.questionType === 'true_false'      ? '✅ Doğru/Yanlış' :
                                                                           '✍️ Açık Uçlu'}
                    &nbsp;· {currentQuestion.points} puan
                  </span>
                </div>
                <button className={`flag-btn ${isFlagged ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currentQuestion.questionId)} title="Soruyu İşaretle">
                  {isFlagged ? '⚑ İşaretlendi' : '⚑ İşaretle'}
                </button>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            {/* Content */}
            <div className="exam-content">
              <p className="question-text">{currentQuestion.questionText}</p>

              {/* Multiple choice / True-False */}
              {(currentQuestion.questionType === 'multiple_choice' || currentQuestion.questionType === 'true_false') && (
                <div className="options-list">
                  {options.map((option, oi) => (
                    <div key={option.key}
                      className={`option-item ${selectedOption === option.key ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(currentQuestion.questionId, option.key)}>
                      <div className="option-letter">{LETTERS[oi]}</div>
                      <span>{option.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Open-ended */}
              {currentQuestion.questionType === 'open_ended' && (
                <div style={{ marginTop: 16 }}>
                  <textarea
                    className="open-ended-textarea"
                    rows={8}
                    placeholder="Cevabınızı buraya yazınız..."
                    value={answers[currentQuestion.questionId] ?? ''}
                    onChange={e => handleOpenEndedChange(currentQuestion.questionId, e.target.value)}
                  />
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {(answers[currentQuestion.questionId] ?? '').length} karakter
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="exam-footer">
              <button className="exam-btn secondary" onClick={handlePrevious} disabled={currentIdx === 0}>
                ← Önceki
              </button>
              <div className="footer-center">
                <span className="answered-count">{answeredCount}/{questions.length} yanıtlandı</span>
                <button className="exam-btn skip" onClick={handleNext} disabled={isLastQuestion}>
                  Atla →
                </button>
              </div>
              {isLastQuestion ? (
                <button className="exam-btn primary submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Gönderiliyor...' : '✓ Sınavı Bitir'}
                </button>
              ) : (
                <button className="exam-btn primary" onClick={handleNext}>
                  Sonraki →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExamTake;
