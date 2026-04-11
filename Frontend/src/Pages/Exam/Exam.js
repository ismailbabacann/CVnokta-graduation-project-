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

  const timerRef = useRef(null);

  useEffect(() => {
    // API'den soruları ve sınav bilgisini çekerken kullanılacak örnek fetch işlemi
    const fetchExamData = async () => {
      try {
        setLoading(true);
        /* 
        // Gerçek API çağrısı
        const response = await fetch('/api/exam/start');
        if (!response.ok) throw new Error('Sınav verisi alınamadı.');
        const data = await response.json();
        setQuestions(data.questions);
        setExamInfo({ title: data.title, duration: data.durationInSeconds });
        setTimeLeft(data.durationInSeconds);
        */

        // Örnek mock verisi
        setTimeout(() => {
          setExamInfo({ title: 'Genel Yetenek Sınavı', duration: 1800 }); // 30 dakika
          setTimeLeft(1800);
          setQuestions([
            { id: 1, text: 'React uygulamasında state yönetimi için aşağıdakilerden hangisi kullanılır?', options: [{ id: 'a', text: 'useState' }, { id: 'b', text: 'useEffect' }, { id: 'c', text: 'HTML' }] },
            { id: 2, text: 'API istekleri için hangi React hook\'u genellikle tercih edilir?', options: [{ id: 'a', text: 'useState' }, { id: 'b', text: 'useEffect' }, { id: 'c', text: 'useContext' }] },
            { id: 3, text: 'DOM manipülasyonu doğrudan React\'te yapılmalı mıdır?', options: [{ id: 'a', text: 'Evet, her zaman' }, { id: 'b', text: 'Hayır, Virtual DOM kullanılır' }, { id: 'c', text: 'Sadece klasör açarken' }] }
          ]);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchExamData();
  }, []);

  // Timer Effect
  useEffect(() => {
    if (loading || isFinished || isSubmitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isFinished, isSubmitting]);

  const handleAutoSubmit = async () => {
    // Süre bittiğinde otomatik gönderim yapılacak fonksiyon
    await submitExam();
  };

  const submitExam = async () => {
    setIsSubmitting(true);
    try {
      /*
      // Gerçek API POST çağrısı
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      if (!response.ok) throw new Error('Sonuçlar gönderilemedi.');
      */

      // Simüle bekleme süresi
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsFinished(true);
      console.log('Gönderilen Cevaplar:', answers);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleOptionSelect = (optionId) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionId
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    await submitExam();
  };

  if (loading) return <div className="exam-loading">Sınav yükleniyor. Lütfen bekleyiniz...</div>;
  if (error) return <div className="exam-error">Hata: {error}</div>;

  if (isFinished) return (
    <div className="exam-page-wrapper">
      <div className="exam-finished-card">
        <div className="finished-icon">✓</div>
        <h2>Sınav Tamamlandı!</h2>
        <p>Cevaplarınız başarıyla HR.AI sistemine kaydedildi.</p>
        <p className="finished-subtext">Sonuçlarınız değerlendirildikten sonra bilgilendirileceksiniz.</p>
      </div>
    </div>
  );

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const selectedOption = answers[currentQuestion.id];

  return (
    <div className="exam-page-wrapper">
      {/* Sınav Üst Bar */}
      <div className="exam-topbar">
        <div className="topbar-left">
          <span className="brand-text">HR<span className="brand-highlight">.AI</span></span>
        </div>
        <div className="topbar-center">
          <span className="exam-title">{examInfo.title}</span>
        </div>
        <div className="topbar-right">
          <div className={`timer-box ${timeLeft < 300 ? 'timer-warning' : ''}`}>
            <i className="timer-icon">⏱</i> {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Sınav İçeriği */}
      <div className="exam-container">
        <div className="exam-card">
          <div className="exam-header">
            <h2>Soru {currentQuestionIndex + 1} / {questions.length}</h2>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="exam-content">
            <p className="question-text">{currentQuestion.text}</p>
            <div className="options-list">
              {currentQuestion.options.map(option => (
                <div
                  key={option.id}
                  className={`option-item ${selectedOption === option.id ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <div className="option-radio">
                    {selectedOption === option.id && <div className="option-radio-dot"></div>}
                  </div>
                  <span>{option.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="exam-footer">
            <button
              className="exam-btn secondary"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Önceki
            </button>

            <button className="exam-btn skip" onClick={handleSkip}>
              Atla
            </button>

            {isLastQuestion ? (
              <button
                className="exam-btn primary submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Sınavı Bitir'}
              </button>
            ) : (
              <button className="exam-btn primary" onClick={handleNext}>
                Sonraki
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exam;
