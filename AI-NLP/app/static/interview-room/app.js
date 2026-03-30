/**
 * Interview Room — Client-side logic.
 *
 * Setup flow:
 *   1. Upload CV (PDF) → POST /api/v1/interview/setup/parse-cv → show preview
 *   2. Select job posting from GET /api/v1/interview/setup/job-postings
 *   3. Start → POST /api/v1/interview/start (with parsed CV + selected job)
 *
 * Interview flow:
 *   4. For each question:
 *      - GET /api/v1/interview/{id}/question?tts=true → play audio + avatar talks
 *      - User records answer via mic
 *      - POST /api/v1/interview/{id}/answer-audio → submit
 *   5. After all questions → POST /api/v1/interview/{id}/end → show results
 */

const API = '/api/v1/interview';

// ── State ───────────────────────────────────────────────────
let sessionId = null;
let totalQuestions = 0;
let timerInterval = null;
let startTime = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let webcamStream = null;

// Setup state
let parsedCV = null;        // { full_name, summary_text, skills, ... }
let jobPostings = [];       // fetched from API
let selectedJobPosting = null;

// ── DOM refs ────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const screens = {
  setup: $('#setup-screen'),
  interview: $('#interview-screen'),
  results: $('#results-screen'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ══════════════════════════════════════════════════════════════
//  SETUP — CV Upload + Job Posting Selection
// ══════════════════════════════════════════════════════════════

// Load job postings on page load
(async function loadJobPostings() {
  try {
    const resp = await fetch(`${API}/setup/job-postings`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    jobPostings = Array.isArray(data) ? data : (data.job_postings || []);
    const sel = $('#job-select');
    sel.innerHTML = '<option value="">— Select a job posting —</option>';
    jobPostings.forEach((jp, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${jp.job_title} — ${jp.company || ''}`.trim();
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load job postings:', err);
    const sel = $('#job-select');
    sel.innerHTML = '<option value="">Failed to load job postings</option>';
  }
})();

// ── CV file upload (click + drag/drop) ──────────────────────
const uploadZone = $('#upload-zone');
const cvFileInput = $('#cv-file');

$('#browse-link').addEventListener('click', (e) => {
  e.preventDefault();
  cvFileInput.click();
});

uploadZone.addEventListener('click', () => cvFileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    cvFileInput.files = e.dataTransfer.files;
    handleCVUpload(file);
  }
});

cvFileInput.addEventListener('change', () => {
  const file = cvFileInput.files[0];
  if (file) handleCVUpload(file);
});

async function handleCVUpload(file) {
  const statusEl = $('#cv-status');
  statusEl.style.display = 'block';
  statusEl.className = 'cv-status parsing';
  statusEl.innerHTML = '<span class="spinner"></span>Parsing your CV…';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const resp = await fetch(`${API}/setup/parse-cv`, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }

    parsedCV = await resp.json();

    // Show parsed CV preview — use full_name only if it looks like a real name (short)
    const displayName = (parsedCV.full_name && parsedCV.full_name.length < 60)
      ? parsedCV.full_name : 'CV Parsed Successfully';
    statusEl.className = 'cv-status success';
    statusEl.innerHTML = `
      <div class="cv-preview">
        <div class="cv-preview-header">✅ <strong>${escapeHtml(displayName)}</strong></div>
        <div class="cv-preview-body">
          <span class="cv-tag">📋 ${parsedCV.skills?.length || 0} skills</span>
          <span class="cv-tag">💼 ${parsedCV.experience_count || 0} experiences</span>
          <span class="cv-tag">🎓 ${parsedCV.education_count || 0} education</span>
          ${parsedCV.total_experience_years ? `<span class="cv-tag">📅 ${parsedCV.total_experience_years} years</span>` : ''}
        </div>
        <button class="btn-change-cv" onclick="document.getElementById('cv-file').click()">Change CV</button>
      </div>
    `;

    // Auto-fill candidate name if available and looks like a real name
    if (parsedCV.full_name && parsedCV.full_name.length < 60 && !$('#candidate-name').value.trim()) {
      $('#candidate-name').value = parsedCV.full_name;
    }

    // Unlock step 2
    enableStep('step-job');
    updateStartButton();

  } catch (err) {
    statusEl.className = 'cv-status error';
    statusEl.innerHTML = `❌ Failed to parse CV: ${escapeHtml(err.message)}. <a href="#" onclick="document.getElementById('cv-file').click(); return false;">Try again</a>`;
    parsedCV = null;
    updateStartButton();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Job posting selection ───────────────────────────────────
$('#job-select').addEventListener('change', (e) => {
  const idx = e.target.value;
  const detailsEl = $('#job-details');

  if (idx === '') {
    selectedJobPosting = null;
    detailsEl.style.display = 'none';
  } else {
    selectedJobPosting = jobPostings[parseInt(idx)];
    detailsEl.style.display = 'block';
    detailsEl.innerHTML = `
      <div><strong>${escapeHtml(selectedJobPosting.job_title)}</strong></div>
      <div class="cv-preview-body" style="margin-top:0.4rem;">
        ${selectedJobPosting.required_skills ? `<span class="cv-tag">🛠️ ${escapeHtml(selectedJobPosting.required_skills)}</span>` : ''}
        ${selectedJobPosting.experience_years ? `<span class="cv-tag">📅 ${selectedJobPosting.experience_years} years exp</span>` : ''}
      </div>
    `;
  }

  // Unlock step 3 if both CV and job are selected
  if (parsedCV && selectedJobPosting) {
    enableStep('step-settings');
  }
  updateStartButton();
});

function enableStep(stepId) {
  const el = $(`#${stepId}`);
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto';
}

function updateStartButton() {
  const btn = $('#start-btn');
  const canStart = parsedCV && selectedJobPosting;
  btn.disabled = !canStart;
}

// ── Start interview ─────────────────────────────────────────
$('#start-btn').addEventListener('click', startInterview);

async function startInterview() {
  const btn = $('#start-btn');
  const errorEl = $('#setup-error');
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Preparing questions…';

  const candidateName = $('#candidate-name').value.trim() || parsedCV?.full_name || 'Candidate';
  const questionCount = parseInt($('#question-count').value) || 6;

  try {
    const resp = await fetch(`${API}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application_id: crypto.randomUUID(),
        job_posting: {
          job_title: selectedJobPosting.job_title,
          required_skills: selectedJobPosting.required_skills || '',
          experience_years: selectedJobPosting.experience_years,
          description: selectedJobPosting.description || '',
        },
        cv_summary: parsedCV.summary_text || '',
        candidate_name: candidateName,
        question_count: questionCount,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    sessionId = data.session.id;
    totalQuestions = data.first_question.total_questions;

    // Start interview UI
    showScreen('interview');
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    await startWebcam();
    await fetchAndPlayQuestion();

  } catch (err) {
    errorEl.textContent = `Failed to start: ${err.message}`;
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '🎙️ Start Interview';
  }
}

// ── Timer ───────────────────────────────────────────────────
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  $('#timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Webcam ──────────────────────────────────────────────────
async function startWebcam() {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const video = $('#webcam-video');
    video.srcObject = webcamStream;
    video.play();
  } catch (err) {
    console.warn('Webcam not available:', err);
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
}

// ── Fetch & play question ───────────────────────────────────
async function fetchAndPlayQuestion() {
  setStatus('AI is preparing the question…', 'processing');
  disableControls(true);

  try {
    const resp = await fetch(`${API}/${sessionId}/question?tts=true`);

    if (resp.status === 410) {
      // All questions answered
      await endInterview();
      return;
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }

    const data = await resp.json();

    // Update UI
    $('#question-text').textContent = data.question_text;
    $('#progress-text').textContent = `Question ${data.question_index + 1} of ${data.total_questions}`;
    const pct = ((data.question_index) / data.total_questions) * 100;
    $('#progress-fill').style.width = `${pct}%`;

    // Play TTS audio
    if (data.audio_base64) {
      setStatus('AI interviewer is speaking…', '');
      startAvatarTalking();
      await playBase64Audio(data.audio_base64);
      stopAvatarTalking();
    }

    // Ready for candidate to speak
    setStatus('Your turn — click the microphone to record your answer', '');
    disableControls(false);

  } catch (err) {
    setStatus(`Error: ${err.message}`, 'processing');
    disableControls(false);
  }
}

function playBase64Audio(b64) {
  return new Promise((resolve) => {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.play().catch(() => resolve());
  });
}

// ── Avatar animation ────────────────────────────────────────
function startAvatarTalking() {
  $('.avatar-container').classList.add('speaking');
}

function stopAvatarTalking() {
  $('.avatar-container').classList.remove('speaking');
}

// ── Microphone recording ────────────────────────────────────
$('#btn-mic').addEventListener('click', toggleRecording);

async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    $('#btn-mic').classList.add('recording');
    $('#btn-mic').innerHTML = '⏹';
    setStatus('🔴 Recording… Click microphone again to stop', 'recording');
    $('#btn-submit').disabled = true;

  } catch (err) {
    alert('Microphone access denied. Please allow microphone access.');
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      isRecording = false;
      $('#btn-mic').classList.remove('recording');
      $('#btn-mic').innerHTML = '🎤';
      setStatus('Recording complete. Click "Submit Answer" to send.', '');
      $('#btn-submit').disabled = false;
      resolve();
    };
    mediaRecorder.stop();
  });
}

// ── Submit answer ───────────────────────────────────────────
$('#btn-submit').addEventListener('click', submitAnswer);

async function submitAnswer() {
  if (isRecording) await stopRecording();
  if (audioChunks.length === 0) {
    alert('No audio recorded. Please record your answer first.');
    return;
  }

  disableControls(true);
  setStatus('<span class="spinner"></span>Transcribing your answer…', 'processing');

  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  audioChunks = [];

  // Get current question index from progress text
  const progressText = $('#progress-text').textContent;
  const match = progressText.match(/Question (\d+)/);
  const questionIndex = match ? parseInt(match[1]) - 1 : 0;

  const formData = new FormData();
  formData.append('audio', audioBlob, 'answer.webm');

  try {
    const resp = await fetch(
      `${API}/${sessionId}/answer-audio?question_index=${questionIndex}`,
      { method: 'POST', body: formData }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }

    const data = await resp.json();

    if (data.is_complete) {
      await endInterview();
    } else {
      await fetchAndPlayQuestion();
    }

  } catch (err) {
    setStatus(`Error: ${err.message}`, 'processing');
    disableControls(false);
  }
}

// ── Skip question ───────────────────────────────────────────
$('#btn-skip').addEventListener('click', skipQuestion);

async function skipQuestion() {
  disableControls(true);
  setStatus('Skipping…', 'processing');

  const progressText = $('#progress-text').textContent;
  const match = progressText.match(/Question (\d+)/);
  const questionIndex = match ? parseInt(match[1]) - 1 : 0;

  try {
    const resp = await fetch(`${API}/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_index: questionIndex,
        answer_text: '(Candidate skipped this question)',
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }

    const data = await resp.json();

    if (data.is_complete) {
      await endInterview();
    } else {
      await fetchAndPlayQuestion();
    }

  } catch (err) {
    setStatus(`Error: ${err.message}`, 'processing');
    disableControls(false);
  }
}

// ── End interview ───────────────────────────────────────────
$('#btn-end-early').addEventListener('click', () => {
  if (confirm('End interview early? Unanswered questions will be marked as skipped.')) {
    endInterview();
  }
});

async function endInterview() {
  clearInterval(timerInterval);
  setStatus('<span class="spinner"></span>AI is evaluating your interview…', 'processing');
  disableControls(true);

  try {
    const resp = await fetch(`${API}/${sessionId}/end`, { method: 'POST' });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }

    const summary = await resp.json();
    stopWebcam();
    showResults(summary);

  } catch (err) {
    setStatus(`Evaluation error: ${err.message}`, 'processing');
  }
}

// ── Show results ────────────────────────────────────────────
function showResults(s) {
  showScreen('results');

  const overall = s.overall_interview_score ?? 0;
  $('#result-overall').textContent = overall.toFixed(1);
  const passed = s.is_passed;
  const badge = $('#result-badge');
  badge.textContent = passed ? 'PASSED ✅' : 'FAILED ❌';
  badge.className = `badge ${passed ? 'pass' : 'fail'}`;

  const scores = [
    { val: s.communication_score, lbl: 'Communication' },
    { val: s.technical_knowledge_score, lbl: 'Technical' },
    { val: s.job_match_score, lbl: 'Job Match' },
    { val: s.experience_alignment_score, lbl: 'Experience' },
    { val: s.average_confidence_score, lbl: 'Confidence' },
  ];

  const grid = $('#score-grid');
  grid.innerHTML = scores.map(({ val, lbl }) => `
    <div class="score-item">
      <div class="val">${(val ?? 0).toFixed(1)}</div>
      <div class="lbl">${lbl}</div>
    </div>
  `).join('');

  $('#result-summary').textContent = s.summary_text || '—';
  $('#result-strengths').textContent = s.strengths || '—';
  $('#result-weaknesses').textContent = s.weaknesses || '—';
  $('#result-recommendations').textContent = s.recommendations || '—';
  $('#result-stats').textContent = `${s.total_questions_answered ?? 0} of ${s.total_questions_asked ?? 0} questions answered`;
}

$('#btn-restart').addEventListener('click', () => {
  sessionId = null;
  parsedCV = null;
  selectedJobPosting = null;

  // Reset setup UI
  $('#cv-file').value = '';
  $('#cv-status').style.display = 'none';
  $('#job-select').value = '';
  $('#job-details').style.display = 'none';
  $('#candidate-name').value = '';
  $('#setup-error').style.display = 'none';

  // Lock steps 2 & 3 again
  $('#step-job').style.opacity = '0.4';
  $('#step-job').style.pointerEvents = 'none';
  $('#step-settings').style.opacity = '0.4';
  $('#step-settings').style.pointerEvents = 'none';

  showScreen('setup');
  const btn = $('#start-btn');
  btn.disabled = true;
  btn.textContent = '🎙️ Start Interview';
});

// ── Helpers ─────────────────────────────────────────────────
function setStatus(html, cls) {
  const el = $('#status-text');
  el.innerHTML = html;
  el.className = `status-text ${cls || ''}`;
}

function disableControls(disabled) {
  $('#btn-mic').disabled = disabled;
  $('#btn-submit').disabled = disabled;
  $('#btn-skip').disabled = disabled;
}
