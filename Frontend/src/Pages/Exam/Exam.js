import React, { useState, useEffect, useRef } from 'react';
import './Exam.css';

const Exam = () => {
  const [questions, setQuestions] = useState([]);
  const [examInfo, setExamInfo] = useState({ title: 'Yükleniyor...', duration: 0 });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flagged, setFlagged] = useState([]);
  const [showNav, setShowNav] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setLoading(true);
        /*
        // Gerçek API çağrısı
        const token = localStorage.getItem('jwToken');
        const params = new URLSearchParams(window.location.search);
        const examToken = params.get('token');
        const response = await fetch(`/api/v1/Exam/start?token=${examToken}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Sınav verisi alınamadı.');
        const data = await response.json();
        setQuestions(data.questions);
        setExamInfo({ title: data.title, duration: data.durationInSeconds });
        setTimeLeft(data.durationInSeconds);
        */

        // Mock data — görsel soru örneğiyle
        setTimeout(() => {
          setExamInfo({ title: 'Genel Yetenek Sınavı', duration: 1800 });
          setTimeLeft(1800);
          setQuestions([
            {
              id: 1,
              text: 'React uygulamasında state yönetimi için aşağıdakilerden hangisi kullanılır?',
              type: 'single',
              options: [
                { id: 'a', text: 'useState' },
                { id: 'b', text: 'useEffect' },
                { id: 'c', text: 'HTML' },
                { id: 'd', text: 'CSS Grid' },
              ]
            },
            {
              id: 2,
              text: 'Aşağıdaki diyagramda hangi tasarım deseni gösterilmektedir?',
              type: 'visual',
              imageUrl: 'https://refactoring.guru/images/patterns/diagrams/observer/structure.png',
              imageCaption: 'UML Diyagramı',
              options: [
                { id: 'a', text: 'Singleton' },
                { id: 'b', text: 'Observer' },
                { id: 'c', text: 'Factory' },
                { id: 'd', text: 'Strategy' },
              ]
            },
            {
              id: 3,
              text: 'API istekleri için hangi React hook\'u genellikle tercih edilir?',
              type: 'single',
              options: [
                { id: 'a', text: 'useState' },
                { id: 'b', text: 'useEffect' },
                { id: 'c', text: 'useContext' },
                { id: 'd', text: 'useCallback' },
              ]
            },
            {
              id: 4,
              text: 'Görselde verilen grafik hangi veri yapısını temsil etmektedir?',
              type: 'visual',
              imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/6n-graf.svg/1200px-6n-graf.svg.png',
              imageCaption: 'Veri yapısı grafiği',
              options: [
                { id: 'a', text: 'Yığın (Stack)' },
                { id: 'b', text: 'Kuyruk (Queue)' },
                { id: 'c', text: 'Graf (Graph)' },
                { id: 'd', text: 'Dizi (Array)' },
              ]
            },
          ]);
          setLoading(false);
        }, 800);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchExamData();
  }, []);

  // Timer
  useEffect(() => {
    if (loading || isFinished || isSubmitting) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isFinished, isSubmitting]);

  const handleAutoSubmit = async () => { await submitExam(); };

  const submitExam = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsFinished(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const handleOptionSelect = (optionId) => {
    const q = questions[currentQuestionIndex];
    setAnswers({ ...answers, [q.id]: optionId });
  };

  const toggleFlag = () => {
    const id = questions[currentQuestionIndex].id;
    setFlagged(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleNext     = () => { if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(i => i + 1); };
  const handlePrevious = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(i => i - 1); };
  const handleSubmit   = async () => { clearInterval(timerRef.current); await submitExam(); };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (loading) return (
    <div className="exam-loading">
      <div className="exam-loading-spinner"></div>
      <p>Sınav yükleniyor, lütfen bekleyiniz...</p>
    </div>
  );
  if (error) return <div className="exam-error">⚠️ Hata: {error}</div>;

  if (isFinished) return (
    <div className="exam-page-wrapper">
      <div className="exam-finished-card">
        <div className="finished-checkmark">
          <svg viewBox="0 0 52 52" className="checkmark-svg">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h2>Sınav Tamamlandı!</h2>
        <p>Cevaplarınız başarıyla <strong>HR.AI</strong> sistemine kaydedildi.</p>
        <div className="finished-stats">
          <div className="fstat">
            <span className="fstat-val">{answeredCount}</span>
            <span className="fstat-lbl">Yanıtlanan</span>
          </div>
          <div className="fstat">
            <span className="fstat-val">{questions.length - answeredCount}</span>
            <span className="fstat-lbl">Boş Bırakılan</span>
          </div>
          <div className="fstat">
            <span className="fstat-val">{flagged.length}</span>
            <span className="fstat-lbl">İşaretlenen</span>
          </div>
        </div>
        <p className="finished-subtext">Sonuçlarınız değerlendirildikten sonra bilgilendirileceksiniz.</p>
      </div>
    </div>
  );

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion  = currentQuestionIndex === questions.length - 1;
  const selectedOption  = answers[currentQuestion.id];
  const isFlagged       = flagged.includes(currentQuestion.id);
  const isVisual        = currentQuestion.type === 'visual';

  return (
    <div className="exam-page-wrapper">

      {/* ── Top Bar ─────────────────────────────────── */}
      <div className="exam-topbar">
        <div className="topbar-left">
          <span className="brand-text">HR<span className="brand-highlight">.AI</span></span>
        </div>
        <div className="topbar-center">
          <span className="exam-title">{examInfo.title}</span>
        </div>
        <div className="topbar-right">
          <div className={`timer-box ${timeLeft < 300 ? 'timer-warning' : ''}`}>
            <span className="timer-icon">⏱</span> {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────── */}
      <div className="exam-layout">

        {/* ── Sidebar ─────────────────────────────── */}
        <aside className={`exam-sidebar ${showNav ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <span>Soru Gezgini</span>
            <span className="sidebar-progress">{answeredCount}/{questions.length}</span>
          </div>
          <div className="sidebar-grid">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent  = idx === currentQuestionIndex;
              const isFlaggedQ = flagged.includes(q.id);
              return (
                <button key={q.id}
                  onClick={() => { setCurrentQuestionIndex(idx); setShowNav(false); }}
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

        {/* ── Question Card ─────────────────────────── */}
        <main className="exam-main">
          <button className="sidebar-toggle" onClick={() => setShowNav(!showNav)}>
            {showNav ? '✕' : '☰ Sorular'}
          </button>

          <div className="exam-card">
            {/* Progress & Meta */}
            <div className="exam-header">
              <div className="exam-header-top">
                <div className="qmeta">
                  <span className="qnumber">Soru {currentQuestionIndex + 1} / {questions.length}</span>
                  {isVisual && <span className="visual-badge">📷 Görsel Soru</span>}
                </div>
                <button className={`flag-btn ${isFlagged ? 'flagged' : ''}`} onClick={toggleFlag} title="Soruyu İşaretle">
                  {isFlagged ? '⚑ İşaretlendi' : '⚑ İşaretle'}
                </button>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            {/* Content */}
            <div className={`exam-content ${isVisual ? 'exam-content-visual' : ''}`}>

              {/* Visual question layout */}
              {isVisual ? (
                <div className="visual-question-layout">
                  {/* Image Panel */}
                  <div className="visual-image-panel">
                    <div className="visual-image-wrap">
                      <img src={currentQuestion.imageUrl} alt={currentQuestion.imageCaption || 'Soru görseli'} className="visual-image" />
                    </div>
                    {currentQuestion.imageCaption && (
                      <div className="visual-caption">{currentQuestion.imageCaption}</div>
                    )}
                  </div>

                  {/* Question & Options Panel */}
                  <div className="visual-options-panel">
                    <p className="question-text">{currentQuestion.text}</p>
                    <div className="options-list">
                      {currentQuestion.options.map((option, oi) => {
                        const LETTERS = ['A', 'B', 'C', 'D', 'E'];
                        return (
                          <div key={option.id}
                            className={`option-item ${selectedOption === option.id ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(option.id)}>
                            <div className="option-letter">{LETTERS[oi]}</div>
                            <span>{option.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard question layout */
                <div>
                  <p className="question-text">{currentQuestion.text}</p>
                  <div className="options-list">
                    {currentQuestion.options.map((option, oi) => {
                      const LETTERS = ['A', 'B', 'C', 'D', 'E'];
                      return (
                        <div key={option.id}
                          className={`option-item ${selectedOption === option.id ? 'selected' : ''}`}
                          onClick={() => handleOptionSelect(option.id)}>
                          <div className="option-letter">{LETTERS[oi]}</div>
                          <span>{option.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="exam-footer">
              <button className="exam-btn secondary" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
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

export default Exam;
