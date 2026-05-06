import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoInterview.css';

const AI_NLP_URL = process.env.REACT_APP_AI_NLP_HTTP_URL;
const AI_NLP_WS_URL = process.env.REACT_APP_AI_NLP_WS_URL;
const BACKEND_URL = process.env.REACT_APP_API_BASE_URL + '/api/v1';
const SAMPLE_RATE = 24000;

// Toggle: set to true to show the live transcript panel
const SHOW_LIVE_TRANSCRIPT = false;

function VideoInterview() {
  // ── State ──────────────────────────────────────────────────
  const [status, setStatus] = useState('loading');
  const [statusText, setStatusText] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [liveText, setLiveText] = useState('Waiting for AI interviewer...');
  const [errorMsg, setErrorMsg] = useState('');
  const [summary, setSummary] = useState(null);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [timer, setTimer] = useState('0:00');
  const [warningMsg, setWarningMsg] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Refs ───────────────────────────────────────────────────
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const scriptNodeRef = useRef(null);
  const playbackQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const activeSourceRef = useRef(null);
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const partialTextRef = useRef('');
  const partialElIndexRef = useRef(null);
  const webcamRef = useRef(null);
  const transcriptBodyRef = useRef(null);
  const warningTimerRef = useRef(null);
  const statusRef = useRef(status);

  const { token } = useParams();
  const navigate = useNavigate();

  // Keep statusRef in sync
  useEffect(() => { statusRef.current = status; }, [status]);

  // ── Playback helpers ───────────────────────────────────────
  const stopPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) { /* ignore */ }
      activeSourceRef.current = null;
    }
  }, []);

  // ── Cleanup ────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { /* ignore */ }
      wsRef.current = null;
    }
    if (workletNodeRef.current) {
      try { workletNodeRef.current.disconnect(); } catch (e) { /* ignore */ }
      workletNodeRef.current = null;
    }
    if (scriptNodeRef.current) {
      try { scriptNodeRef.current.disconnect(); } catch (e) { /* ignore */ }
      scriptNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
      if (webcamRef.current) webcamRef.current.srcObject = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
      audioContextRef.current = null;
    }
    stopPlayback();
    setIsSpeaking(false);
  }, [stopPlayback]);

  // ── Token validation ───────────────────────────────────────
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStatus('invalid');
        setErrorMsg('Interview token not found.');
        return;
      }
      try {
        const response = await axios.post(`${AI_NLP_URL}/start-with-token`, { token });
        if (response.data) {
          setSessionConfig(response.data);
          sessionIdRef.current = response.data.session_id;
          setStatus('idle');
        }
      } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        setStatus('invalid');
        if (err.response?.status === 409) {
          setErrorMsg('This interview has already been completed. You cannot log in again.');
        } else if (err.response?.status === 403) {
          setErrorMsg('Invalid or expired interview link.');
        } else {
          setErrorMsg(`Failed to start interview: ${detail}`);
        }
      }
    };
    validateToken();
  }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ── Audio playback (PCM16 base64 → float32 → speaker) ─────
  const playNextChunk = useCallback(() => {
    if (!audioContextRef.current || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const samples = playbackQueueRef.current.shift();

    const buffer = audioContextRef.current.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      if (activeSourceRef.current === source) activeSourceRef.current = null;
      playNextChunk();
    };
    activeSourceRef.current = source;
    source.start();
  }, []);

  const handleAudioChunk = useCallback((base64Data) => {
    if (!base64Data) return;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }
    playbackQueueRef.current.push(float32);
    if (!isPlayingRef.current) playNextChunk();
  }, [playNextChunk]);

  // ── Save results to Backend ────────────────────────────────
  const saveResultsToBackend = useCallback(async (summaryData) => {
    if (!sessionConfig) return;
    const { application_id, job_posting_id } = sessionConfig;
    if (!application_id || !job_posting_id) return;
    try {
      const jwToken = localStorage.getItem('jwToken');
      await axios.post(`${BACKEND_URL}/Interviews/save-realtime`, {
        applicationId: application_id,
        jobPostingId: job_posting_id,
        externalSessionId: sessionIdRef.current,
        overallInterviewScore: summaryData.overall_interview_score,
        communicationScore: summaryData.communication_score,
        technicalKnowledgeScore: summaryData.technical_knowledge_score,
        jobMatchScore: summaryData.job_match_score,
        experienceAlignmentScore: summaryData.experience_alignment_score,
        totalQuestionsAsked: summaryData.total_questions_asked,
        totalQuestionsAnswered: summaryData.total_questions_answered,
        summaryText: summaryData.summary_text,
        strengths: summaryData.strengths,
        weaknesses: summaryData.weaknesses,
        recommendations: summaryData.recommendations,
        isPassed: summaryData.is_passed,
        qaList: summaryData.qa_list || []
      }, {
        headers: jwToken ? { Authorization: `Bearer ${jwToken}` } : {}
      });
    } catch (err) {
      console.error('Interview results could not be saved:', err.message);
    }
  }, [sessionConfig]);

  // ── Fetch evaluation ───────────────────────────────────────
  const fetchEvaluation = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const response = await axios.post(`${AI_NLP_URL}/${sid}/end`);
      if (response.data) {
        setSummary(response.data);
        await saveResultsToBackend(response.data);
        setStatus('ended');
      }
    } catch (err) {
      console.error('Failed to retrieve evaluation:', err.message);
      setStatus('ended');
      setErrorMsg(`Evaluation could not be completed: ${err.message}`);
    }
  }, [saveResultsToBackend]);

  // ── Transcript handling ────────────────────────────────────
  const handleTranscript = useCallback((msg) => {
    if (msg.role === 'assistant') {
      if (msg.is_final) {
        setTranscript(prev => {
          if (partialElIndexRef.current !== null) {
            const updated = [...prev];
            updated[partialElIndexRef.current] = { role: 'assistant', text: msg.text };
            return updated;
          }
          return [...prev, { role: 'assistant', text: msg.text }];
        });
        partialTextRef.current = '';
        partialElIndexRef.current = null;
        setLiveText(msg.text);
      } else {
        partialTextRef.current += msg.text;
        const currentText = partialTextRef.current;
        setTranscript(prev => {
          if (partialElIndexRef.current !== null) {
            const updated = [...prev];
            updated[partialElIndexRef.current] = { role: 'assistant', text: currentText };
            return updated;
          }
          partialElIndexRef.current = prev.length;
          return [...prev, { role: 'assistant', text: currentText }];
        });
        setLiveText(currentText);
      }
    } else if (msg.role === 'user' && msg.is_final) {
      setTranscript(prev => [...prev, { role: 'user', text: msg.text }]);
    }
  }, []);

  // ── WebSocket message handling ─────────────────────────────
  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'ready':
          setStatusText('AI is ready — speak naturally');
          break;
        case 'audio':
          handleAudioChunk(msg.data || msg.audio || '');
          break;
        case 'speaking_started':
          setIsSpeaking(true);
          setStatusText('AI is speaking...');
          break;
        case 'speaking_stopped':
          setIsSpeaking(false);
          setStatusText('Listening...');
          break;
        case 'listening':
          stopPlayback();
          setIsSpeaking(false);
          setStatusText('Listening to you...');
          break;
        case 'transcript':
          handleTranscript(msg);
          break;
        case 'interview_complete':
          setStatus('evaluating');
          cleanup();
          fetchEvaluation();
          break;
        case 'warning':
          setWarningMsg(msg.message);
          if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
          warningTimerRef.current = setTimeout(() => setWarningMsg(''), 8000);
          break;
        case 'error':
          console.error('Server error:', msg.message);
          if (!msg.recoverable) {
            setStatus('error');
            setErrorMsg(msg.message);
            cleanup();
          }
          break;
        default:
          break;
      }
    } catch { /* non-JSON, ignore */ }
  }, [handleAudioChunk, handleTranscript, fetchEvaluation, cleanup, stopPlayback]);

  // ── Audio send helper ──────────────────────────────────────
  const sendAudioChunkRef = useRef(null);
  sendAudioChunkRef.current = (floatSamples) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 256 * 1024) return;
    const pcm16 = new Int16Array(floatSamples.length);
    for (let i = 0; i < floatSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    ws.send(JSON.stringify({ type: 'audio', data: base64 }));
  };

  // ── Audio capture ──────────────────────────────────────────
  const startAudioCapture = useCallback(async () => {
    const ctx = audioContextRef.current;
    const stream = micStreamRef.current;
    if (!ctx || !stream) return;
    const source = ctx.createMediaStreamSource(stream);

    try {
      // AudioWorklet path
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() { super(); this.buffer = []; }
          process(inputs) {
            const input = inputs[0];
            if (input.length > 0) {
              const samples = input[0];
              for (let i = 0; i < samples.length; i++) this.buffer.push(samples[i]);
              if (this.buffer.length >= 2400) {
                this.port.postMessage(this.buffer.splice(0, 2400));
              }
            }
            return true;
          }
        }
        registerProcessor("pcm-processor", PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const worklet = new AudioWorkletNode(ctx, 'pcm-processor');
      worklet.port.onmessage = (e) => sendAudioChunkRef.current(e.data);
      source.connect(worklet);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      worklet.connect(silentGain);
      silentGain.connect(ctx.destination);
      workletNodeRef.current = worklet;
    } catch {
      // ScriptProcessor fallback
      console.warn('AudioWorklet not available, using ScriptProcessor fallback');
      const scriptNode = ctx.createScriptProcessor(4096, 1, 1);
      let accum = [];
      scriptNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) accum.push(input[i]);
        if (accum.length >= 2400) {
          sendAudioChunkRef.current(accum.splice(0, 2400));
        }
      };
      source.connect(scriptNode);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      scriptNode.connect(silentGain);
      silentGain.connect(ctx.destination);
      scriptNodeRef.current = scriptNode;
    }
  }, []);

  // ── Webcam ─────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      if (webcamRef.current) webcamRef.current.srcObject = stream;
    } catch { console.warn('Webcam not available'); }
  }, []);

  // ── Timer ──────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setTimer(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
  }, []);

  // ── Start interview ────────────────────────────────────────
  const startInterview = useCallback(async () => {
    if (!sessionConfig) return;
    setStatus('connecting');
    setStatusText('Connecting to AI interviewer...');
    setTranscript([]);
    setSummary(null);
    setErrorMsg('');
    setLiveText('Waiting for AI interviewer...');
    partialTextRef.current = '';
    partialElIndexRef.current = null;

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('error');
      setErrorMsg('Microphone access denied. Microphone is required for the interview.');
      return;
    }

    startWebcam();
    startTimer();

    const sid = sessionConfig.session_id;
    sessionIdRef.current = sid;

    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });

    const ws = new WebSocket(AI_NLP_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      const jp = sessionConfig.job_posting || {};
      ws.send(JSON.stringify({
        type: 'init',
        session_id: sid,
        application_id: sessionConfig.application_id,
        job_posting: {
          job_title: jp.job_title || '',
          department: jp.department || '',
          required_skills: jp.required_skills || '',
          required_qualifications: jp.required_qualifications || '',
          responsibilities: jp.responsibilities || '',
        },
        candidate_name: sessionConfig.candidate_name,
        cv_summary: sessionConfig.cv_summary || '',
      }));
      setStatus('active');
      setStatusText('Initializing session...');
      startAudioCapture();
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      setStatus('error');
      setErrorMsg('Failed to connect to AI-NLP server. Is AI-NLP running?');
    };

    ws.onclose = () => {
      if (statusRef.current === 'active' || statusRef.current === 'connecting') {
        setStatus('error');
        setStatusText('Connection lost');
      }
    };
  }, [sessionConfig, handleMessage, startAudioCapture, startWebcam, startTimer]);

  // ── End interview ──────────────────────────────────────────
  const endInterview = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_request' }));
    }
    setStatus('evaluating');
    setStatusText('Evaluating your interview...');
    cleanup();
    fetchEvaluation();
  }, [cleanup, fetchEvaluation]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBodyRef.current) {
      transcriptBodyRef.current.scrollTop = transcriptBodyRef.current.scrollHeight;
    }
  }, [transcript]);

  // ── Render ─────────────────────────────────────────────────
  const candidateName = sessionConfig?.candidate_name || 'Candidate';
  const jobTitle = sessionConfig?.job_posting?.job_title || '';

  const statusDotClass =
    status === 'active' ? (isSpeaking ? 'speaking' : 'listening') :
    status === 'connecting' ? 'connecting' :
    status === 'error' ? 'error' : '';

  // Invalid token
  if (status === 'invalid') {
    return (
      <div className="vi-screen vi-screen-active vi-center-screen">
        <div className="vi-results-card">
          <h2>Interview Access Error</h2>
          <p style={{ color: '#ef4444', fontSize: '1.1rem', margin: '1.5rem 0' }}>{errorMsg}</p>
          <button className="vi-btn-primary" onClick={() => navigate('/')}>🏠 Return to Home Page</button>
        </div>
      </div>
    );
  }

  // Loading
  if (status === 'loading') {
    return (
      <div className="vi-screen vi-screen-active vi-center-screen">
        <div className="vi-results-card" style={{ textAlign: 'center' }}>
          <div className="vi-spinner" />
          <p style={{ marginTop: '1rem' }}>Verifying interview details...</p>
        </div>
      </div>
    );
  }

  // Results
  if (status === 'ended' && summary) {
    const overall = Math.round(summary.overall_interview_score || 0);
    const scores = [
      { key: 'average_confidence_score', label: 'Confidence' },
      { key: 'job_match_score', label: 'Job Match' },
      { key: 'experience_alignment_score', label: 'Experience' },
      { key: 'communication_score', label: 'Communication' },
      { key: 'technical_knowledge_score', label: 'Technical' },
    ];
    return (
      <div className="vi-screen vi-screen-active vi-center-screen">
        <div className="vi-results-card">
          <h2>Interview Evaluation</h2>
          <div className="vi-overall-score">
            <div className="vi-score-value">{overall}</div>
            <div className="vi-score-label-text">Overall Score / 100</div>
            <span className={`vi-badge ${summary.is_passed ? 'pass' : 'fail'}`}>
              {summary.is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
            </span>
          </div>
          <div className="vi-score-grid">
            {scores.map(s => (
              <div key={s.key} className="vi-score-item">
                <div className="val">{Math.round(summary[s.key] || 0)}</div>
                <div className="lbl">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="vi-summary-section">
            <h3>Summary</h3>
            <p>{summary.summary_text || '-'}</p>
          </div>
          <div className="vi-summary-section">
            <h3>Strengths</h3>
            <p>{Array.isArray(summary.strengths) ? summary.strengths.join(', ') : (summary.strengths || '-')}</p>
          </div>
          <div className="vi-summary-section">
            <h3>Areas for Improvement</h3>
            <p>{Array.isArray(summary.weaknesses) ? summary.weaknesses.join(', ') : (summary.weaknesses || '-')}</p>
          </div>
          <div className="vi-summary-section">
            <h3>Recommendations</h3>
            <p>{Array.isArray(summary.recommendations) ? summary.recommendations.join(', ') : (summary.recommendations || '-')}</p>
          </div>
          <p className="vi-result-stats">
            Questions: {summary.total_questions_asked || 0} asked, {summary.total_questions_answered || 0} answered
          </p>
          <button className="vi-btn-primary" onClick={() => navigate('/profile/applications')}>🔙 Back to My Applications</button>
        </div>
      </div>
    );
  }

  // Evaluating
  if (status === 'evaluating') {
    return (
      <div className="vi-screen vi-screen-active vi-center-screen">
        <div className="vi-results-card" style={{ textAlign: 'center' }}>
          <div className="vi-spinner" />
          <h3 style={{ marginTop: '1rem', color: '#a78bfa' }}>Your interview is being evaluated</h3>
          <p style={{ color: '#8888aa', marginTop: '0.5rem' }}>
            Please wait, AI is analyzing your interview results...
          </p>
        </div>
      </div>
    );
  }

  // Interview screen (idle / connecting / active / error)
  return (
    <div className="vi-screen vi-screen-active vi-interview-screen">
      {warningMsg && <div className="vi-warning-banner">{warningMsg}</div>}

      <div className="vi-header">
        <div className="vi-header-left">
          <span className="vi-logo">HR AI Interview</span>
          <div className="vi-status-indicator">
            <span className={`vi-dot ${statusDotClass}`} />
            <span>{statusText || (status === 'idle' ? `Hello ${candidateName}, ready to start` : '')}</span>
          </div>
        </div>
        <div className="vi-header-right">
          <span className="vi-timer">{timer}</span>
          {(status === 'active' || status === 'connecting') && (
            <button className="vi-btn-end" onClick={endInterview}>End Interview</button>
          )}
        </div>
      </div>

      <div className="vi-main">
        <div className={`vi-avatar-container ${isSpeaking ? 'speaking' : ''}`}>
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
            <circle cx="120" cy="120" r="118" fill="#1e1e32" stroke="#2d2d4a" strokeWidth="2"/>
            <ellipse cx="120" cy="105" rx="72" ry="80" fill="#2c1810"/>
            <rect x="105" y="165" width="30" height="20" rx="5" fill="#f0c8a0"/>
            <ellipse cx="120" cy="210" rx="70" ry="35" fill="#764ba2"/>
            <path d="M100 188 L120 198 L140 188" stroke="#fff" strokeWidth="2" fill="none"/>
            <ellipse cx="120" cy="115" rx="55" ry="62" fill="#f0c8a0"/>
            <path d="M65 100 Q65 55 120 48 Q175 55 175 100 Q170 70 120 65 Q70 70 65 100Z" fill="#2c1810"/>
            <ellipse cx="68" cy="115" rx="12" ry="35" fill="#2c1810"/>
            <ellipse cx="172" cy="115" rx="12" ry="35" fill="#2c1810"/>
            <path d="M90 95 Q100 89 112 93" stroke="#3d2b1f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M128 93 Q140 89 150 95" stroke="#3d2b1f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <ellipse cx="100" cy="108" rx="10" ry="7" fill="#fff"/>
            <ellipse cx="140" cy="108" rx="10" ry="7" fill="#fff"/>
            <circle cx="102" cy="108" r="4.5" fill="#4a3728"/>
            <circle cx="142" cy="108" r="4.5" fill="#4a3728"/>
            <circle cx="102" cy="108" r="2" fill="#1a0f0a"/>
            <circle cx="142" cy="108" r="2" fill="#1a0f0a"/>
            <circle cx="104" cy="106" r="1.5" fill="#fff" opacity="0.8"/>
            <circle cx="144" cy="106" r="1.5" fill="#fff" opacity="0.8"/>
            <path d="M90 103 Q100 99 110 103" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
            <path d="M130 103 Q140 99 150 103" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
            <path d="M118 118 Q120 126 122 118" stroke="#d4a574" strokeWidth="1.5" fill="none"/>
            <ellipse cx="88" cy="125" rx="10" ry="5" fill="#ffb4b4" opacity="0.3"/>
            <ellipse cx="152" cy="125" rx="10" ry="5" fill="#ffb4b4" opacity="0.3"/>
            <g transform="translate(120, 140)">
              <ellipse cx="0" cy="0" rx="14" ry="5" fill="#d4756b"/>
              <ellipse className="vi-mouth-inner" cx="0" cy="1" rx="8" ry="2" fill="#8b3a3a"/>
            </g>
            <circle cx="68" cy="130" r="3" fill="#a78bfa" opacity="0.7"/>
            <circle cx="172" cy="130" r="3" fill="#a78bfa" opacity="0.7"/>
          </svg>
          <div className="vi-avatar-label">AI Recruiter</div>
          {jobTitle && <div className="vi-avatar-job">{jobTitle}</div>}
        </div>

        {SHOW_LIVE_TRANSCRIPT && (
          <div className="vi-question-bubble">
            <div className="vi-question-label">Live Transcript</div>
            <div className="vi-question-text">{liveText}</div>
          </div>
        )}

        <div className="vi-controls">
          {status === 'idle' && (
            <button className="vi-btn-primary" onClick={startInterview}>🎯 Start Interview</button>
          )}
          {status === 'error' && (
            <>
              <p className="vi-error-text">{errorMsg}</p>
              <button className="vi-btn-primary" onClick={() => navigate('/profile/applications')}>🔙 Back to My Applications</button>
            </>
          )}
        </div>
      </div>

      <div className="vi-transcript-panel">
        <div className="vi-transcript-header">Conversation</div>
        <div className="vi-transcript-body" ref={transcriptBodyRef}>
          {transcript.map((t, i) => (
            <div key={i} className={`vi-transcript-entry ${t.role === 'assistant' ? 'assistant' : 'user'}`}>
              <div className="vi-transcript-role">{t.role === 'assistant' ? 'AI' : 'You'}</div>
              <div className="vi-transcript-text">{t.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="vi-webcam-container">
        <video ref={webcamRef} autoPlay muted playsInline />
        <div className="vi-webcam-label">You</div>
      </div>
    </div>
  );
}

export default VideoInterview;
