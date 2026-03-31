/**
 * CVnokta Realtime Voice Interview — Client
 *
 * Handles:
 *  - Setup flow (CV upload, job posting selection)
 *  - WebSocket connection to backend relay
 *  - Web Audio API for mic capture (PCM16 24kHz) and playback
 *  - Transcript display, avatar animation, timer
 *  - End-of-interview evaluation fetch
 */

(function () {
  "use strict";

  // ── Constants ─────────────────────────────────────────────
  const API_BASE = "/api/v1";
  const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${API_BASE}/interview/realtime/ws`;
  const SAMPLE_RATE = 24000;
  const CHUNK_INTERVAL_MS = 100; // send audio every 100ms

  // ── State ─────────────────────────────────────────────────
  let ws = null;
  let sessionId = null;
  let audioContext = null;
  let micStream = null;
  let workletNode = null;
  let scriptNode = null; // fallback
  let playbackQueue = [];
  let isPlaying = false;
  let activePlaybackSource = null;
  let timerInterval = null;
  let startTime = null;

  // Setup state
  let cvData = null;
  let jobPostings = [];
  let selectedJob = null;

  // ── DOM refs ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const setupScreen = $("#setup-screen");
  const interviewScreen = $("#interview-screen");
  const resultsScreen = $("#results-screen");

  // Setup
  const cvFile = $("#cv-file");
  const uploadZone = $("#upload-zone");
  const uploadContent = $("#upload-content");
  const cvStatus = $("#cv-status");
  const stepJob = $("#step-job");
  const jobSelect = $("#job-select");
  const jobDetails = $("#job-details");
  const stepSettings = $("#step-settings");
  const candidateName = $("#candidate-name");
  const startBtn = $("#start-btn");
  const setupError = $("#setup-error");

  // Interview
  const statusDot = $("#status-dot");
  const statusLabel = $("#status-label");
  const questionText = $("#question-text");
  const avatar = $("#avatar");
  const timer = $("#timer");
  const btnEnd = $("#btn-end");
  const transcriptBody = $("#transcript-body");
  const warningBanner = $("#warning-banner");

  // Results
  const resultOverall = $("#result-overall");
  const resultBadge = $("#result-badge");
  const scoreGrid = $("#score-grid");
  const resultSummary = $("#result-summary");
  const resultStrengths = $("#result-strengths");
  const resultWeaknesses = $("#result-weaknesses");
  const resultRecommendations = $("#result-recommendations");
  const resultStats = $("#result-stats");
  const btnRestart = $("#btn-restart");

  // ── Initialization ────────────────────────────────────────

  loadJobPostings();
  setupEventListeners();

  function setupEventListeners() {
    // CV upload
    uploadZone.addEventListener("click", () => cvFile.click());
    $("#browse-link").addEventListener("click", (e) => { e.preventDefault(); cvFile.click(); });
    cvFile.addEventListener("change", handleCVUpload);
    uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) {
        cvFile.files = e.dataTransfer.files;
        handleCVUpload();
      }
    });

    // Job posting
    jobSelect.addEventListener("change", handleJobSelection);

    // Candidate name
    candidateName.addEventListener("input", checkReady);

    // Start
    startBtn.addEventListener("click", startInterview);

    // End interview
    btnEnd.addEventListener("click", requestEndInterview);

    // Restart
    btnRestart.addEventListener("click", () => location.reload());
  }

  // ── Setup: Load job postings ──────────────────────────────

  async function loadJobPostings() {
    try {
      const res = await fetch(`${API_BASE}/interview/setup/job-postings`);
      if (!res.ok) throw new Error("Failed to load job postings");
      jobPostings = await res.json();

      jobSelect.innerHTML = '<option value="">Select a position...</option>';
      jobPostings.forEach((jp, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `${jp.job_title} — ${jp.department || "General"}`;
        jobSelect.appendChild(opt);
      });
    } catch (err) {
      jobSelect.innerHTML = '<option value="">Failed to load</option>';
      console.error("Job postings error:", err);
    }
  }

  // ── Setup: CV upload ──────────────────────────────────────

  async function handleCVUpload() {
    const file = cvFile.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showCVStatus("error", "Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showCVStatus("error", "File too large (max 10 MB).");
      return;
    }

    showCVStatus("parsing", "Parsing CV...");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/interview/setup/parse-cv`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Parse failed");
      cvData = await res.json();
      showCVStatus("success", `CV parsed: ${cvData.full_name || file.name}`);

      // Enable next step
      stepJob.style.opacity = "1";
      stepJob.style.pointerEvents = "auto";

      // Auto-fill name
      if (cvData.full_name && !candidateName.value) {
        candidateName.value = cvData.full_name;
      }
    } catch (err) {
      showCVStatus("error", "Failed to parse CV. Please try again.");
      console.error("CV parse error:", err);
    }
  }

  function showCVStatus(type, msg) {
    cvStatus.style.display = "block";
    cvStatus.className = `cv-status ${type}`;
    cvStatus.textContent = msg;
  }

  // ── Setup: Job selection ──────────────────────────────────

  function handleJobSelection() {
    const idx = jobSelect.value;
    if (idx === "") {
      selectedJob = null;
      jobDetails.style.display = "none";
      stepSettings.style.opacity = "0.4";
      stepSettings.style.pointerEvents = "none";
      checkReady();
      return;
    }

    selectedJob = jobPostings[parseInt(idx)];
    jobDetails.style.display = "block";
    jobDetails.textContent = "";

    const title = document.createElement("strong");
    title.textContent = selectedJob.job_title;
    jobDetails.appendChild(title);
    jobDetails.appendChild(document.createElement("br"));

    const info = document.createElement("span");
    info.style.fontSize = "0.8rem";
    info.style.color = "#8888aa";
    const skills = `Skills: ${selectedJob.required_skills || "N/A"}`;
    const resp = selectedJob.responsibilities
      ? `\nResp: ${selectedJob.responsibilities.substring(0, 120)}...`
      : "";
    info.textContent = skills + resp;
    jobDetails.appendChild(info);

    stepSettings.style.opacity = "1";
    stepSettings.style.pointerEvents = "auto";
    checkReady();
  }

  function checkReady() {
    startBtn.disabled = !(cvData && selectedJob && candidateName.value.trim());
  }

  // ── Start Interview ───────────────────────────────────────

  async function startInterview() {
    startBtn.disabled = true;
    setupError.style.display = "none";

    // Request microphone permission
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setupError.style.display = "block";
      setupError.innerHTML = `
        Microphone access is required for voice interview.<br>
        <a href="/interview-room" class="btn-fallback">Use text-based interview instead</a>
      `;
      startBtn.disabled = false;
      return;
    }

    // Generate session ID
    sessionId = crypto.randomUUID ? crypto.randomUUID() : generateUUID();

    // Switch to interview screen
    setupScreen.classList.remove("active");
    interviewScreen.classList.add("active");

    // Start webcam
    startWebcam();

    // Start timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    // Connect WebSocket
    connectWebSocket();
  }

  // ── WebSocket ─────────────────────────────────────────────

  function connectWebSocket() {
    setStatus("connecting", "Connecting to AI interviewer...");

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      // Send init message
      const initMsg = {
        type: "init",
        session_id: sessionId,
        application_id: crypto.randomUUID ? crypto.randomUUID() : generateUUID(),
        job_posting: selectedJob,
        cv_summary: cvData ? cvData.summary_text || "" : "",
        candidate_name: candidateName.value.trim(),
      };
      ws.send(JSON.stringify(initMsg));
      setStatus("connecting", "Initializing session...");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error("Failed to parse server message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      if (!sessionId) return; // already cleaned up
      setStatus("error", "Connection lost");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("error", "Connection error");
    };
  }

  function handleServerMessage(msg) {
    switch (msg.type) {
      case "ready":
        setStatus("listening", "AI is ready — speak naturally");
        startAudioCapture();
        break;

      case "audio":
        handleAudioChunk(msg.data);
        break;

      case "speaking_started":
        avatar.classList.add("speaking");
        setStatus("speaking", "AI is speaking...");
        break;

      case "speaking_stopped":
        avatar.classList.remove("speaking");
        setStatus("listening", "Listening...");
        break;

      case "listening":
        // VAD detected user speech — stop any playing audio (barge-in)
        stopPlayback();
        avatar.classList.remove("speaking");
        setStatus("listening", "Listening to you...");
        break;

      case "transcript":
        handleTranscript(msg);
        break;

      case "interview_complete":
        handleInterviewComplete(msg.reason);
        break;

      case "warning":
        showWarning(msg.message);
        break;

      case "error":
        console.error("Server error:", msg.message);
        if (!msg.recoverable) {
          setStatus("error", msg.message);
          cleanup();
        }
        break;

      default:
        console.log("Unknown message type:", msg.type);
    }
  }

  // ── Audio Capture (Mic -> Backend) ────────────────────────

  async function startAudioCapture() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });

    const source = audioContext.createMediaStreamSource(micStream);

    // Try AudioWorklet first, fallback to ScriptProcessor
    try {
      await setupAudioWorklet(source);
    } catch (err) {
      console.warn("AudioWorklet not available, using ScriptProcessor fallback:", err);
      setupScriptProcessor(source);
    }
  }

  async function setupAudioWorklet(source) {
    // Register the audio processor worklet
    const workletCode = `
      class PCMProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = [];
        }
        process(inputs) {
          const input = inputs[0];
          if (input.length > 0) {
            const samples = input[0];
            for (let i = 0; i < samples.length; i++) {
              this.buffer.push(samples[i]);
            }
            // Send chunks at roughly CHUNK_INTERVAL_MS intervals
            // At 24kHz, 100ms = 2400 samples
            if (this.buffer.length >= 2400) {
              this.port.postMessage(this.buffer.splice(0, 2400));
            }
          }
          return true;
        }
      }
      registerProcessor("pcm-processor", PCMProcessor);
    `;

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
    workletNode.port.onmessage = (e) => {
      const floatSamples = e.data;
      sendAudioChunk(floatSamples);
    };
    source.connect(workletNode);
    // Connect to a silent gain node to keep the processing graph alive
    // without playing mic audio back through speakers (which causes echo)
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    workletNode.connect(silentGain);
    silentGain.connect(audioContext.destination);
  }

  function setupScriptProcessor(source) {
    const bufferSize = 4096;
    scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    let accum = [];

    scriptNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) {
        accum.push(input[i]);
      }
      if (accum.length >= 2400) {
        sendAudioChunk(accum.splice(0, 2400));
      }
    };

    source.connect(scriptNode);
    // Connect to a silent gain node to keep ScriptProcessor alive
    // without playing mic audio back through speakers (which causes echo)
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    scriptNode.connect(silentGain);
    silentGain.connect(audioContext.destination);
  }

  function sendAudioChunk(floatSamples) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Backpressure: drop chunks when send buffer exceeds 256KB
    if (ws.bufferedAmount > 256 * 1024) return;

    // Convert float32 to PCM16
    const pcm16 = new Int16Array(floatSamples.length);
    for (let i = 0; i < floatSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Encode to base64
    const bytes = new Uint8Array(pcm16.buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    ws.send(JSON.stringify({ type: "audio", data: base64 }));
  }

  // ── Audio Playback (Backend -> Speaker) ───────────────────

  function handleAudioChunk(base64Data) {
    // Decode base64 to PCM16
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const pcm16 = new Int16Array(bytes.buffer);

    // Convert PCM16 to float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    playbackQueue.push(float32);
    if (!isPlaying) playNextChunk();
  }

  function playNextChunk() {
    if (!audioContext || playbackQueue.length === 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const samples = playbackQueue.shift();

    const buffer = audioContext.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      if (activePlaybackSource === source) activePlaybackSource = null;
      playNextChunk();
    };
    activePlaybackSource = source;
    source.start();
  }

  function stopPlayback() {
    playbackQueue = [];
    isPlaying = false;
    if (activePlaybackSource) {
      try { activePlaybackSource.stop(); } catch (e) {}
      activePlaybackSource = null;
    }
  }

  // ── Transcript Display ────────────────────────────────────

  let currentAssistantText = "";
  let currentAssistantEl = null;

  function handleTranscript(msg) {
    if (msg.role === "assistant") {
      if (msg.is_final) {
        // Final transcript — replace any partial
        if (currentAssistantEl) {
          currentAssistantEl.querySelector(".transcript-text").textContent = msg.text;
        } else {
          addTranscriptEntry("assistant", msg.text);
        }
        currentAssistantText = "";
        currentAssistantEl = null;
        questionText.textContent = msg.text;
      } else {
        // Partial — accumulate and show
        currentAssistantText += msg.text;
        if (!currentAssistantEl) {
          currentAssistantEl = addTranscriptEntry("assistant", currentAssistantText);
        } else {
          currentAssistantEl.querySelector(".transcript-text").textContent = currentAssistantText;
        }
        questionText.textContent = currentAssistantText;
      }
    } else if (msg.role === "user" && msg.is_final) {
      addTranscriptEntry("user", msg.text);
    }
  }

  function addTranscriptEntry(role, text) {
    const div = document.createElement("div");
    div.className = `transcript-entry ${role}`;
    div.innerHTML = `
      <div class="transcript-role">${role === "assistant" ? "AI" : "You"}</div>
      <div class="transcript-text">${escapeHtml(text)}</div>
    `;
    transcriptBody.appendChild(div);
    transcriptBody.scrollTop = transcriptBody.scrollHeight;
    return div;
  }

  // ── Interview End ─────────────────────────────────────────

  function requestEndInterview() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "end_request" }));
      btnEnd.disabled = true;
      setStatus("connecting", "Ending interview...");
    } else if (sessionId) {
      // WS is down — fall back to REST endpoint directly
      btnEnd.disabled = true;
      setStatus("connecting", "Ending interview...");
      handleInterviewComplete("ws_disconnect");
    }
  }

  async function handleInterviewComplete(reason) {
    setStatus("connecting", "Evaluating your interview...");
    cleanup();

    try {
      const res = await fetch(`${API_BASE}/interview/realtime/${sessionId}/end`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Evaluation failed");
      }

      const summary = await res.json();
      showResults(summary);
    } catch (err) {
      console.error("Evaluation error:", err);
      // Show results screen with error
      interviewScreen.classList.remove("active");
      resultsScreen.classList.add("active");
      resultSummary.textContent = `Evaluation could not be completed: ${err.message}`;
    }
  }

  // ── Results Display ───────────────────────────────────────

  function showResults(summary) {
    interviewScreen.classList.remove("active");
    resultsScreen.classList.add("active");

    const overall = Math.round(summary.overall_interview_score || 0);
    resultOverall.textContent = overall;

    if (summary.is_passed) {
      resultBadge.className = "badge pass";
      resultBadge.textContent = "PASSED";
    } else {
      resultBadge.className = "badge fail";
      resultBadge.textContent = "NEEDS IMPROVEMENT";
    }

    // Score grid
    const scores = [
      { key: "average_confidence_score", label: "Confidence" },
      { key: "job_match_score", label: "Job Match" },
      { key: "experience_alignment_score", label: "Experience" },
      { key: "communication_score", label: "Communication" },
      { key: "technical_knowledge_score", label: "Technical" },
    ];

    scoreGrid.innerHTML = scores
      .map(
        (s) => `
      <div class="score-item">
        <div class="val">${Math.round(summary[s.key] || 0)}</div>
        <div class="lbl">${s.label}</div>
      </div>
    `
      )
      .join("");

    resultSummary.textContent = summary.summary_text || "-";
    resultStrengths.textContent = summary.strengths || "-";
    resultWeaknesses.textContent = summary.weaknesses || "-";
    resultRecommendations.textContent = summary.recommendations || "-";
    resultStats.textContent = `Questions: ${summary.total_questions_asked || 0} asked, ${summary.total_questions_answered || 0} answered`;
  }

  // ── Webcam ────────────────────────────────────────────────

  let webcamStream = null;

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStream = stream;
      const video = $("#webcam-video");
      video.srcObject = stream;
    } catch (err) {
      console.warn("Webcam not available:", err);
    }
  }

  // ── Timer ─────────────────────────────────────────────────

  function updateTimer() {
    if (!startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    timer.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // ── Status & UI helpers ───────────────────────────────────

  function setStatus(state, text) {
    statusDot.className = `dot ${state}`;
    statusLabel.textContent = text;
  }

  function showWarning(message) {
    warningBanner.textContent = message;
    warningBanner.classList.add("visible");
    setTimeout(() => warningBanner.classList.remove("visible"), 8000);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ── Cleanup ───────────────────────────────────────────────

  function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (ws) {
      try { ws.close(); } catch (e) {}
      ws = null;
    }

    if (workletNode) {
      try { workletNode.disconnect(); } catch (e) {}
      workletNode = null;
    }

    if (scriptNode) {
      try { scriptNode.disconnect(); } catch (e) {}
      scriptNode = null;
    }

    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }

    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      webcamStream = null;
      const video = $("#webcam-video");
      if (video) video.srcObject = null;
    }

    if (audioContext) {
      try { audioContext.close(); } catch (e) {}
      audioContext = null;
    }

    stopPlayback();
    avatar.classList.remove("speaking");
  }
})();
