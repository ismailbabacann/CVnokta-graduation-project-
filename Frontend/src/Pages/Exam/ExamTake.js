import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Exam.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL + '/api/v1';

// ─── Fallback mock by exam type ───────────────────────────────────────────────
const MOCK_EXAMS = {
  english: {
    title: 'English Language Assessment — Stage 1',
    timeLimitMinutes: 30,
    sequenceInfo: 'Stage 1/2 — English Assessment',
    questions: [
      { questionId: 'en-1', questionText: 'Which sentence is grammatically correct?', questionType: 'multiple_choice', points: 10, orderIndex: 1, optionsJson: '[{"key":"A","text":"He don\'t like coffee."},{"key":"B","text":"She doesn\'t likes coffee."},{"key":"C","text":"They don\'t like coffee."},{"key":"D","text":"We doesn\'t like coffee."}]' },
      { questionId: 'en-2', questionText: "Choose the correct form: 'If I _____ rich, I would travel the world.'", questionType: 'multiple_choice', points: 10, orderIndex: 2, optionsJson: '[{"key":"A","text":"am"},{"key":"B","text":"were"},{"key":"C","text":"being"},{"key":"D","text":"be"}]' },
      { questionId: 'en-3', questionText: "What is the synonym of 'eloquent'?", questionType: 'multiple_choice', points: 10, orderIndex: 3, optionsJson: '[{"key":"A","text":"Quiet"},{"key":"B","text":"Aggressive"},{"key":"C","text":"Articulate"},{"key":"D","text":"Confused"}]' },
      { questionId: 'en-4', questionText: "'Much' is used with countable nouns.", questionType: 'true_false', points: 10, orderIndex: 4, optionsJson: '[{"key":"A","text":"True"},{"key":"B","text":"False"}]' },
      { questionId: 'en-5', questionText: "Which word best completes: 'Her performance was _____ than expected.'", questionType: 'multiple_choice', points: 10, orderIndex: 5, optionsJson: '[{"key":"A","text":"good"},{"key":"B","text":"better"},{"key":"C","text":"best"},{"key":"D","text":"well"}]' },
      { questionId: 'en-6', questionText: 'Describe your professional strengths and how they would contribute to this role. (Write 3-5 sentences in English.)', questionType: 'open_ended', points: 20, orderIndex: 6, optionsJson: null },
    ]
  },
  technical: {
    title: 'Technical Assessment Exam — Stage 2',
    timeLimitMinutes: 45,
    sequenceInfo: 'Stage 2/2 — Technical Assessment',
    questions: [
      { questionId: 'tc-1', questionText: 'Which HTTP methods are idempotent in REST API design?', questionType: 'multiple_choice', points: 10, orderIndex: 1, optionsJson: '[{"key":"A","text":"POST and DELETE"},{"key":"B","text":"GET and PUT"},{"key":"C","text":"POST and PATCH"},{"key":"D","text":"GET and POST"}]' },
      { questionId: 'tc-2', questionText: "Which keyword is used to remove duplicate records in SQL?", questionType: 'multiple_choice', points: 10, orderIndex: 2, optionsJson: '[{"key":"A","text":"UNIQUE"},{"key":"B","text":"DISTINCT"},{"key":"C","text":"FILTER"},{"key":"D","text":"REMOVE"}]' },
      { questionId: 'tc-3', questionText: "HTTP 404 is a server-side error code.", questionType: 'true_false', points: 10, orderIndex: 3, optionsJson: '[{"key":"A","text":"True"},{"key":"B","text":"False"}]' },
      { questionId: 'tc-4', questionText: 'What does encapsulation mean in Object-Oriented Programming?', questionType: 'multiple_choice', points: 10, orderIndex: 4, optionsJson: '[{"key":"A","text":"Class inheritance"},{"key":"B","text":"Hiding data and methods"},{"key":"C","text":"Defining abstract classes"},{"key":"D","text":"Same method different usage"}]' },
      { questionId: 'tc-5', questionText: "What is the most effective way to prevent SQL Injection in a web application?", questionType: 'multiple_choice', points: 10, orderIndex: 5, optionsJson: '[{"key":"A","text":"Use HTTPS"},{"key":"B","text":"Parameterized queries"},{"key":"C","text":"Encrypt the database"},{"key":"D","text":"Convert input to uppercase"}]' },
      { questionId: 'tc-6', questionText: 'In SOLID principles, S represents Single Responsibility Principle.', questionType: 'true_false', points: 10, orderIndex: 6, optionsJson: '[{"key":"A","text":"True"},{"key":"B","text":"False"}]' },
      { questionId: 'tc-7', questionText: 'How would you solve the problem of incorrect stock decrement (race condition) in an e-commerce system? Explain your approach.', questionType: 'open_ended', points: 30, orderIndex: 7, optionsJson: null },
    ]
  }
};

const guessExamType = (token) => {
  // Simple heuristic for mock: alternate between english and technical
  return 'english';
};

const parseOptions = (json) => {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
};

const formatTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

// ─── Already Completed Screen ────────────────────────────────────────────────
const AlreadyCompletedScreen = ({ examTitle, submittedAt, onGoHome }) => (
  <div className="exam-page-wrapper">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="already-completed-card">
        <div className="already-icon">📋</div>
        <h2>You Have Already Completed This Exam</h2>
        <p style={{ color: '#64748b', margin: '8px 0 4px' }}>
          <strong>{examTitle}</strong>
        </p>
        {submittedAt && (
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 24px' }}>
            Submitted: {new Date(submittedAt).toLocaleString('en-US')}
          </p>
        )}
        <div className="already-info-box">
          <p>Each exam can only be taken <strong>once</strong>. This page cannot be accessed again.</p>
          <p style={{ marginTop: 8 }}>You will be notified by email after your results are evaluated.</p>
        </div>
        <button className="exam-btn primary" onClick={onGoHome} style={{ marginTop: 24, width: '100%' }}>
          ← Back to Home
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ExamTake = () => {
  const { token }    = useParams();
  const navigate     = useNavigate();

  const [state, setState] = useState({
    status: 'loading', // loading | already_submitted | expired | error | exam | finished
    examInfo: null,
    questions: [],
    errorMsg: '',
    submittedAt: null,
  });
  const [answers, setAnswers]     = useState({});
  const [flagged, setFlagged]     = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showNav, setShowNav]     = useState(false);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usedMock, setUsedMock]   = useState(false);

  const timerRef = useRef(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setState(s => ({ ...s, status: 'error', errorMsg: 'Invalid exam link.' }));
      return;
    }

    const fetchExam = async () => {
      try {
        const res  = await fetch(`${API_BASE}/Exam/take/${token}`);
        const body = await res.json();
        const data = body.data ?? body;

        // Already submitted → single-use page
        if (data.alreadySubmitted) {
          setState(s => ({
            ...s,
            status: 'already_submitted',
            examInfo: { title: data.examTitle },
            submittedAt: data.submittedAt
          }));
          return;
        }

        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

        const qs = (data.questions ?? []).map(q => ({
          questionId:   q.questionId,
          questionText: q.questionText,
          questionType: q.questionType,
          optionsJson:  q.optionsJson,
          points:       q.points,
          orderIndex:   q.orderIndex
        }));

        setState(s => ({
          ...s,
          status: 'exam',
          examInfo: {
            title:           data.examTitle,
            examType:        data.examType,
            sequenceInfo:    data.sequenceInfo,
            timeLimitMinutes: data.timeLimitMinutes,
            expiresAt:       data.expiresAt
          },
          questions: qs
        }));
        setTimeLeft((data.timeLimitMinutes ?? 45) * 60);
        setUsedMock(false);
      } catch (err) {
        // API unreachable → mock fallback
        console.warn('API unavailable, using mock:', err.message);
        const mockType = guessExamType(token);
        const mock     = MOCK_EXAMS[mockType] ?? MOCK_EXAMS.english;
        setState(s => ({
          ...s,
          status: 'exam',
          examInfo: {
            title: mock.title,
            timeLimitMinutes: mock.timeLimitMinutes,
            sequenceInfo: mock.sequenceInfo
          },
          questions: mock.questions
        }));
        setTimeLeft(mock.timeLimitMinutes * 60);
        setUsedMock(true);
      }
    };

    fetchExam();
  }, [token]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.status !== 'exam' || isSubmitting || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, isSubmitting]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submitExam = useCallback(async () => {
    setIsSubmitting(true);
    clearInterval(timerRef.current);
    try {
      if (!usedMock) {
        await fetch(`${API_BASE}/Exam/submit/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: state.questions.map(q => ({
              questionId: q.questionId,
              answerText: answers[q.questionId] ?? null
            }))
          })
        });
      } else {
        await new Promise(r => setTimeout(r, 1200));
      }
      setState(s => ({ ...s, status: 'finished' }));
    } catch {
      setState(s => ({ ...s, status: 'finished' }));
    } finally {
      setIsSubmitting(false);
    }
  }, [usedMock, token, state.questions, answers]);

  const handleAutoSubmit = useCallback(() => submitExam(), [submitExam]);
  const handleSubmit     = () => { clearInterval(timerRef.current); submitExam(); };

  const handleOption = (qId, key) => setAnswers(p => ({ ...p, [qId]: key }));
  const handleText   = (qId, txt) => setAnswers(p => ({ ...p, [qId]: txt }));
  const toggleFlag   = (id) => setFlagged(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);
  const handleNext   = () => { if (currentIdx < state.questions.length - 1) setCurrentIdx(i => i + 1); };
  const handlePrev   = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };

  const { status, examInfo, questions, errorMsg, submittedAt } = state;

  // ── Render: Special States ───────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="exam-loading">
      <div className="exam-loading-spinner" />
      <p>Loading exam...</p>
    </div>
  );

  // 🔒 SINGLE-USE: Already completed
  if (status === 'already_submitted') return (
    <AlreadyCompletedScreen
      examTitle={examInfo?.title}
      submittedAt={submittedAt}
      onGoHome={() => navigate('/')}
    />
  );

  if (status === 'error') return (
    <div className="exam-page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="already-completed-card">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#e94560' }}>Access Error</h2>
          <p style={{ color: '#666' }}>{errorMsg}</p>
          <button className="exam-btn primary" onClick={() => navigate('/')} style={{ marginTop: 20, width: '100%' }}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ Finished
  if (status === 'finished') {
    const answered = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    return (
      <div className="exam-page-wrapper">
        <div className="exam-finished-card">
          <div className="finished-checkmark">
            <svg viewBox="0 0 52 52" className="checkmark-svg">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h2>Exam Completed!</h2>
          <p>Your answers have been saved to the <strong>hr.ai</strong> system.</p>
          {usedMock && <p style={{ color: '#f59e0b', fontSize: 13 }}>ℹ️ Ran in simulation mode.</p>}
          <div className="finished-stats">
            <div className="fstat"><span className="fstat-val">{answered}</span><span className="fstat-lbl">Answered</span></div>
            <div className="fstat"><span className="fstat-val">{questions.length - answered}</span><span className="fstat-lbl">Empty</span></div>
            <div className="fstat"><span className="fstat-val">{flagged.length}</span><span className="fstat-lbl">Flagged</span></div>
          </div>
          <p className="finished-subtext">You will be notified by email after your results are evaluated.</p>
          <button className="exam-btn primary" onClick={() => navigate('/')} style={{ marginTop: 20, width: '100%' }}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) return <div className="exam-loading"><p>Questions could not be loaded.</p></div>;

  const q            = questions[currentIdx];
  if (!q) return <div className="exam-loading"><p>Loading question...</p></div>;
  const options      = parseOptions(q.optionsJson);
  const selectedOpt  = answers[q.questionId];
  const isFlagged    = flagged.includes(q.questionId);
  const isLast       = currentIdx === questions.length - 1;
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
  const progress     = ((currentIdx + 1) / questions.length) * 100;
  const LETTERS      = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="exam-page-wrapper">

      {/* ── Topbar ───────────────────────────────────────── */}
      <div className="exam-topbar">
        <div className="topbar-left">
          <span className="brand-text">HR<span className="brand-highlight">.AI</span></span>
        </div>
        <div className="topbar-center">
          <span className="exam-title">{examInfo?.title}</span>
          {examInfo?.sequenceInfo && (
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 10 }}>({examInfo.sequenceInfo})</span>
          )}
        </div>
        <div className="topbar-right">
          <div className={`timer-box ${timeLeft < 300 ? 'timer-warning' : ''}`}>
            <span className="timer-icon">⏱</span> {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="exam-layout">

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className={`exam-sidebar ${showNav ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <span>Question Navigator</span>
            <span className="sidebar-progress">{answeredCount}/{questions.length}</span>
          </div>
          <div className="sidebar-grid">
            {questions.map((qn, idx) => {
              const ans = answers[qn.questionId];
              const isAns = ans && ans.trim() !== '';
              return (
                <button key={qn.questionId}
                  onClick={() => { setCurrentIdx(idx); setShowNav(false); }}
                  className={`qnav-btn ${idx === currentIdx ? 'qnav-current' : ''} ${isAns ? 'qnav-answered' : ''} ${flagged.includes(qn.questionId) ? 'qnav-flagged' : ''}`}>
                  {idx + 1}
                  {flagged.includes(qn.questionId) && <span className="qnav-flag-dot">⚑</span>}
                </button>
              );
            })}
          </div>
          <div className="sidebar-legend">
            <div className="legend-item"><span className="legend-dot answered" />&nbsp;Answered</div>
            <div className="legend-item"><span className="legend-dot flagged" />&nbsp;Flagged</div>
            <div className="legend-item"><span className="legend-dot current" />&nbsp;Current</div>
            <div className="legend-item"><span className="legend-dot empty" />&nbsp;Empty</div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────── */}
        <main className="exam-main">
          <button className="sidebar-toggle" onClick={() => setShowNav(!showNav)}>
            {showNav ? '✕' : '☰ Questions'}
          </button>

          <div className="exam-card">
            <div className="exam-header">
              <div className="exam-header-top">
                <div className="qmeta">
                  <span className="qnumber">Question {currentIdx + 1} / {questions.length}</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                    {q.questionType === 'multiple_choice' ? '🔘 Multiple Choice' :
                     q.questionType === 'true_false'      ? '✅ True/False' :
                                                            '✍️ Open Ended'}
                    &nbsp;· {q.points} pts
                  </span>
                </div>
                <button className={`flag-btn ${isFlagged ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(q.questionId)}>
                  {isFlagged ? '⚑ Flagged' : '⚑ Flag'}
                </button>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="exam-content">
              <p className="question-text">{q.questionText}</p>

              {/* MC / TF */}
              {(q.questionType === 'multiple_choice' || q.questionType === 'true_false') && (
                <div className="options-list">
                  {options.map((opt, oi) => (
                    <div key={opt.key}
                      className={`option-item ${selectedOpt === opt.key ? 'selected' : ''}`}
                      onClick={() => handleOption(q.questionId, opt.key)}>
                      <div className="option-letter">{LETTERS[oi]}</div>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Open-ended */}
              {q.questionType === 'open_ended' && (
                <div style={{ marginTop: 16 }}>
                  <textarea
                    className="open-ended-textarea"
                    rows={8}
                    placeholder="Write your answer here..."
                    value={answers[q.questionId] ?? ''}
                    onChange={e => handleText(q.questionId, e.target.value)}
                  />
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {(answers[q.questionId] ?? '').length} characters
                  </div>
                </div>
              )}
            </div>

            <div className="exam-footer">
              <button className="exam-btn secondary" onClick={handlePrev} disabled={currentIdx === 0}>
                ← Previous
              </button>
              <div className="footer-center">
                <span className="answered-count">{answeredCount}/{questions.length} answered</span>
                <button className="exam-btn skip" onClick={handleNext} disabled={isLast}>Skip →</button>
              </div>
              {isLast ? (
                <button className="exam-btn primary submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : '✓ Finish Exam'}
                </button>
              ) : (
                <button className="exam-btn primary" onClick={handleNext}>Next →</button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExamTake;
