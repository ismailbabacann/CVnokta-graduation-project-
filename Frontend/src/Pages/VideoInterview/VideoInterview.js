import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoInterview.css';

const AI_NLP_WS_URL = 'ws://localhost:8000/api/v1/interview/realtime/ws';
const AI_NLP_HTTP_URL = 'http://localhost:8000/api/v1/interview/realtime';
const BACKEND_URL = 'https://localhost:9001/api/v1';

function VideoInterview() {
  const [status, setStatus]           = useState('idle'); // idle | connecting | active | ended | error
  const [transcript, setTranscript]   = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isCandidateMuted, setIsCandidateMuted] = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [summary, setSummary]         = useState(null);
  const [jobPostingData, setJobPostingData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const wsRef            = useRef(null);
  const audioContextRef  = useRef(null);
  const mediaStreamRef   = useRef(null);
  const processorRef     = useRef(null);
  const audioQueueRef    = useRef([]);
  const isPlayingRef     = useRef(false);
  const sessionIdRef     = useRef(null);
  const { applicationId: routeApplicationId } = useParams();
  const navigate = useNavigate();

  // URL parametrelerinden bilgi al (fallback için)
  const params = new URLSearchParams(window.location.search);
  const applicationId = routeApplicationId || params.get('applicationId') || '';
  const [candidateName, setCandidateName] = useState(params.get('candidateName') || 'Aday');
  const [jobTitle, setJobTitle]           = useState(params.get('jobTitle')      || 'Yazılım Geliştirici');
  const [jobPostingId, setJobPostingId]   = useState(params.get('jobPostingId')  || '');

  // ── Başvuru bilgilerini backend'den al ──────────────────────────────────────
  useEffect(() => {
    const fetchApplicationDetails = async () => {
      if (!applicationId) return;
      try {
        const token = localStorage.getItem('jwToken');
        const response = await axios.get(`${BACKEND_URL}/Applications/${applicationId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (response.data && response.data.application) {
          const app = response.data.application;
          if (app.candidateProfile) setCandidateName(app.candidateProfile.fullName);
          if (app.jobPosting) {
            setJobTitle(app.jobPosting.jobTitle);
            setJobPostingId(app.jobPosting.id);
          } else if (app.jobPostingId) {
            setJobPostingId(app.jobPostingId);
          }
        }
      } catch (err) {
        console.warn('Başvuru detayı alınamadı:', err.message);
      }
    };
    fetchApplicationDetails();
  }, [applicationId]);

  // ── İlan bilgilerini backend'den al ────────────────────────────────────────
  useEffect(() => {
    const fetchJobPosting = async () => {
      if (!jobPostingId) {
        setLoadingData(false);
        return;
      }
      try {
        const response = await axios.get(`${BACKEND_URL}/JobPostings/public/${jobPostingId}`);
        if (response.data) {
          setJobPostingData(response.data);
        }
      } catch (err) {
        console.warn('İlan bilgisi alınamadı:', err.message);
      } finally {
        setLoadingData(false);
      }
    };
    fetchJobPosting();
  }, [jobPostingId]);

  // ── Ses oynatma kuyruğu ────────────────────────────────────────────────────
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsAiSpeaking(true);

    const base64Audio = audioQueueRef.current.shift();
    try {
      const ctx = audioContextRef.current || new AudioContext();
      audioContextRef.current = ctx;
      const binary = atob(base64Audio);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextAudio();
        } else {
          setIsAiSpeaking(false);
        }
      };
      source.start();
    } catch {
      isPlayingRef.current = false;
      setIsAiSpeaking(false);
    }
  }, []);

  // ── Sonuçları backend'e kaydet ──────────────────────────────────────────────
  const saveResultsToBackend = useCallback(async (summaryData) => {
    if (!applicationId || !jobPostingId) return;
    try {
      const token = localStorage.getItem('jwToken');
      await axios.post(`${BACKEND_URL}/Interviews/save-realtime`, {
        applicationId,
        jobPostingId,
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
        isPassed: summaryData.is_passed
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (err) {
      console.error('Mülakat sonuçları kaydedilemedi:', err.message);
    }
  }, [applicationId, jobPostingId]);

  // ── AI-NLP'den değerlendirme al ────────────────────────────────────────────
  const fetchEvaluation = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const response = await axios.post(`${AI_NLP_HTTP_URL}/${sid}/end`);
      if (response.data) {
        setSummary(response.data);
        await saveResultsToBackend(response.data);
      }
    } catch (err) {
      console.error('Değerlendirme alınamadı:', err.message);
    }
  }, [saveResultsToBackend]);

  // ── WebSocket mesajı işle ──────────────────────────────────────────────────
  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.data);

      // Session ready — AI-NLP acknowledged init
      if (msg.type === 'ready') {
        return;
      }

      if (msg.type === 'audio' && (msg.audio || msg.data)) {
        audioQueueRef.current.push(msg.audio || msg.data);
        playNextAudio();
      }

      if (msg.type === 'transcript' && msg.text) {
        setTranscript(prev => {
          // For partial transcripts, update the last message from same role
          if (!msg.is_final && prev.length > 0 && prev[prev.length - 1].role === (msg.role || 'ai') && !prev[prev.length - 1].isFinal) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: updated[updated.length - 1].text + msg.text
            };
            return updated;
          }
          return [...prev, {
            role: msg.role === 'user' ? 'user' : 'ai',
            text: msg.text,
            isFinal: msg.is_final,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          }];
        });
      }

      if (msg.type === 'speaking_started') {
        setIsAiSpeaking(true);
      }
      if (msg.type === 'speaking_stopped') {
        setIsAiSpeaking(false);
      }
      if (msg.type === 'listening') {
        setIsAiSpeaking(false);
      }

      if (msg.type === 'warning') {
        setTranscript(prev => [...prev, {
          role: 'system',
          text: `⚠️ ${msg.message}`,
          isFinal: true,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }

      if (msg.type === 'interview_complete') {
        setStatus('ended');
        stopMicrophone();
        // Fetch evaluation from AI-NLP
        fetchEvaluation();
      }

      if (msg.type === 'error') {
        setErrorMsg(msg.message || 'Bir hata oluştu.');
        if (!msg.recoverable) {
          setStatus('error');
        }
      }
    } catch { /* JSON değilse ses verisidir, ignore */ }
  }, [playNextAudio, fetchEvaluation]);

  // ── Mikrofon başlat ────────────────────────────────────────────────────────
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN || isCandidateMuted) return;
        const samples = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++)
          int16[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
        const b64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
        wsRef.current.send(JSON.stringify({ type: 'audio', audio: b64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      processorRef.current = processor;
    } catch (err) {
      setErrorMsg('Mikrofon erişimi reddedildi: ' + err.message);
    }
  }, [isCandidateMuted]);

  const stopMicrophone = () => {
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current?.disconnect();
  };

  // ── Mülakati başlat ────────────────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    setStatus('connecting');
    setTranscript([]);
    setSummary(null);
    setErrorMsg('');

    // Generate a unique session ID to track this interview
    const sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    sessionIdRef.current = sid;

    const ws = new WebSocket(AI_NLP_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Init mesajı gönder — gerçek ilan bilgileriyle
      const jp = jobPostingData || {};
      ws.send(JSON.stringify({
        type: 'init',
        session_id: sid,
        application_id: applicationId,
        job_posting: {
          job_title: jp.jobTitle || jobTitle,
          department: jp.department || '',
          required_skills: jp.requiredQualifications || '',
          required_qualifications: jp.requiredQualifications || '',
          responsibilities: jp.responsibilities || ''
        },
        candidate_name: candidateName,
        cv_summary: `Aday: ${candidateName}. Pozisyon: ${jp.jobTitle || jobTitle} başvurusu. Departman: ${jp.department || 'Belirtilmemiş'}.`
      }));
      setStatus('active');
      startMicrophone();
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      setStatus('error');
      setErrorMsg('AI-NLP sunucusuna bağlanılamadı. AI-NLP çalışıyor mu? (localhost:8000)');
    };

    ws.onclose = () => {
      if (status === 'active') setStatus('ended');
      stopMicrophone();
    };
  }, [applicationId, candidateName, jobTitle, jobPostingData, handleMessage, startMicrophone, status]);

  // ── Mülakatı bitir ─────────────────────────────────────────────────────────
  const endInterview = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_request' }));
      wsRef.current.close();
    }
    stopMicrophone();
    setStatus('ended');
    // Fetch evaluation
    fetchEvaluation();
  };

  useEffect(() => {
    return () => { endInterview(); };
  }, []); // eslint-disable-line

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="vi-container">
      {/* Avatar panel */}
      <div className="vi-left">
        <div className={`vi-avatar ${isAiSpeaking ? 'speaking' : ''}`}>
          <div className="vi-avatar-face">
            <div className="vi-avatar-eyes">
              <span /><span />
            </div>
            <div className={`vi-avatar-mouth ${isAiSpeaking ? 'talking' : ''}`} />
          </div>
          {isAiSpeaking && <div className="vi-speaking-ring" />}
        </div>
        <p className="vi-avatar-name">CVNokta AI Mülakat</p>
        <p className="vi-avatar-status">
          {loadingData             && '⏳ İlan bilgileri yükleniyor...'}
          {!loadingData && status === 'connecting' && '🔄 Bağlanıyor...'}
          {!loadingData && status === 'active'     && (isAiSpeaking ? '🔊 Konuşuyor...' : '👂 Dinliyor...')}
          {!loadingData && status === 'ended'      && '✅ Mülakat tamamlandı'}
          {!loadingData && status === 'error'      && '❌ Bağlantı hatası'}
          {!loadingData && status === 'idle'       && 'Başlamak için hazır'}
        </p>

        {/* Kontroller */}
        <div className="vi-controls">
          {(status === 'idle' || status === 'error') ? (
            <button className="vi-btn vi-btn-start" onClick={startInterview} disabled={loadingData}>
              🎯 Mülakatı Başlat
            </button>
          ) : status === 'active' || status === 'connecting' ? (
            <>
              <button
                className={`vi-btn vi-btn-mute ${isCandidateMuted ? 'muted' : ''}`}
                onClick={() => setIsCandidateMuted(v => !v)}
              >
                {isCandidateMuted ? '🔇 Mikrofon Kapalı' : '🎤 Mikrofon Açık'}
              </button>
              <button className="vi-btn vi-btn-end" onClick={endInterview}>
                ⏹ Mülakatı Bitir
              </button>
            </>
          ) : status === 'ended' ? (
            <button className="vi-btn vi-btn-start" onClick={() => navigate('/profile/applications')}>
              🔙 Başvurularıma Dön
            </button>
          ) : null}
        </div>

        {errorMsg && <p className="vi-error">{errorMsg}</p>}
      </div>

      {/* Transcript + Özet panel */}
      <div className="vi-right">
        <h3 className="vi-transcript-title">Konuşma</h3>
        <div className="vi-transcript">
          {transcript.length === 0 && status === 'idle' && (
            <p className="vi-placeholder">Mülakat başladığında konuşma burada görünecek.</p>
          )}
          {transcript.map((t, i) => (
            <div key={i} className={`vi-message vi-message-${t.role}`}>
              <span className="vi-message-role">{t.role === 'ai' ? '🤖 AI' : t.role === 'system' ? '⚠️' : '👤 Sen'}</span>
              <span className="vi-message-time">{t.time}</span>
              <p className="vi-message-text">{t.text}</p>
            </div>
          ))}
        </div>

        {/* Özet */}
        {summary && (
          <div className="vi-summary">
            <h3>📊 Mülakat Özeti</h3>
            <div className="vi-scores">
              <ScoreItem label="Genel Skor"     value={summary.overall_interview_score} />
              <ScoreItem label="İletişim"       value={summary.communication_score} />
              <ScoreItem label="Teknik"         value={summary.technical_knowledge_score} />
              <ScoreItem label="İş Uyumu"       value={summary.job_match_score} />
            </div>
            {summary.summary_text && <p className="vi-summary-text">{summary.summary_text}</p>}
            {summary.strengths?.length > 0 && (
              <div><strong>✅ Güçlü Yönler:</strong>
                <ul>{summary.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {summary.weaknesses?.length > 0 && (
              <div><strong>⚠️ Gelişim Alanları:</strong>
                <ul>{summary.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            <p className={`vi-result ${summary.is_passed ? 'passed' : 'failed'}`}>
              {summary.is_passed ? '✅ Mülakat Başarılı' : '❌ Mülakat Başarısız'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreItem({ label, value }) {
  const pct = Math.round((value || 0) * 100) / 100;
  return (
    <div className="vi-score-item">
      <span className="vi-score-label">{label}</span>
      <div className="vi-score-bar">
        <div className="vi-score-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="vi-score-val">{pct.toFixed(0)}</span>
    </div>
  );
}

export default VideoInterview;
