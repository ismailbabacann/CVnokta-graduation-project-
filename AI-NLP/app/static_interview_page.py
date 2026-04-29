"""
Standalone AI interview page HTML.
Served at GET /realtime-interview?token=<TOKEN>
"""


def get_interview_html() -> str:
    return """<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Mulakat - CVNokta</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:#0f0f1a;color:#e0e0ff;font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column}

    /* screens */
    .screen{display:none;flex:1;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:24px;text-align:center}
    .screen.active{display:flex}

    /* card */
    .card{background:#13132b;border:1px solid #2a2a50;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.4)}
    .card .icon{font-size:64px;margin-bottom:16px}
    .card h1{font-size:22px;color:#c0c0ff;margin-bottom:8px}
    .card .sub{font-size:14px;color:#8888cc;line-height:1.7;margin-bottom:24px}
    .card .badge{display:inline-block;padding:4px 14px;border-radius:20px;background:#1a1a40;border:1px solid #3a3a6a;font-size:13px;color:#9999ff;margin-bottom:20px}
    .btn{width:100%;padding:14px;background:linear-gradient(135deg,#4444cc,#8844ee);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s;margin-top:4px}
    .btn:hover:not(:disabled){opacity:.85}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .err-box{color:#ff6666;font-size:13px;margin-top:8px;padding:10px;background:rgba(255,50,50,.08);border-radius:8px;border:1px solid rgba(255,50,50,.2)}

    /* interview layout */
    #screen-interview{display:none;flex-direction:row;height:100vh;overflow:hidden}
    #screen-interview.active{display:flex!important}
    .vi-left{width:280px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#13132b;border-right:1px solid #2a2a50;padding:32px 24px;gap:14px}
    .vi-avatar{position:relative;width:130px;height:130px;border-radius:50%;background:linear-gradient(135deg,#1a1a40,#2d2d6b);border:3px solid #4444aa;display:flex;align-items:center;justify-content:center;transition:border-color .3s}
    .vi-avatar.speaking{border-color:#6666ff;box-shadow:0 0 24px rgba(100,100,255,.5)}
    .vi-face{display:flex;flex-direction:column;align-items:center;gap:16px}
    .vi-eyes{display:flex;gap:18px}
    .vi-eyes span{width:13px;height:13px;background:#9999ff;border-radius:50%;animation:blink 4s infinite}
    @keyframes blink{0%,95%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
    .vi-mouth{width:34px;height:6px;background:#9999ff;border-radius:4px}
    .vi-mouth.talking{animation:talk .25s steps(4) infinite alternate}
    @keyframes talk{0%{height:4px;width:26px}50%{height:10px;width:34px}100%{height:5px;width:22px}}
    .vi-name{font-size:15px;font-weight:600;color:#c0c0ff;margin:0;text-align:center}
    .vi-status{font-size:12px;color:#8888cc;margin:0;min-height:18px;text-align:center}
    .vi-btn{padding:11px 16px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;width:100%}
    .vi-btn-mute{background:#2a2a55;color:#aaaaff;border:1px solid #4444aa}
    .vi-btn-mute.muted{background:#552222;color:#ffaaaa;border-color:#aa4444}
    .vi-btn-end{background:#cc3333;color:#fff;border:none}
    .vi-btn-end:hover{background:#ee4444}
    .vi-err{color:#ff6666;font-size:12px;text-align:center;padding:8px;background:rgba(255,50,50,.1);border-radius:8px;border:1px solid rgba(255,50,50,.2)}

    .vi-right{flex:1;display:flex;flex-direction:column;padding:24px;gap:16px;overflow-y:auto}
    .vi-title{font-size:17px;font-weight:600;color:#c0c0ff;margin:0;border-bottom:1px solid #2a2a50;padding-bottom:12px}
    .vi-transcript{flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:80px}
    .vi-placeholder{color:#555577;font-style:italic;font-size:14px}
    .vi-msg{display:flex;flex-direction:column;gap:4px;padding:12px 16px;border-radius:12px;max-width:82%}
    .vi-msg.ai{background:#1a1a35;border:1px solid #2a2a55;align-self:flex-start}
    .vi-msg.candidate{background:#1a2a3a;border:1px solid #2a3a55;align-self:flex-end}
    .vi-msg-role{font-size:10px;font-weight:700;color:#6666aa;text-transform:uppercase;letter-spacing:1px}
    .vi-msg-text{font-size:14px;line-height:1.6;margin:0;color:#d0d0ee}

    /* evaluating */
    .vi-evaluating{display:flex;flex-direction:column;align-items:center;background:#13132b;border:1px solid #2a2a50;border-radius:12px;padding:36px;gap:14px;text-align:center}
    .vi-evaluating h3{color:#c0c0ff;font-size:17px;margin:0}
    .vi-evaluating p{color:#8888cc;font-size:13px;margin:0}
    .spinner{width:44px;height:44px;border:4px solid rgba(100,100,255,.2);border-left-color:#6666ff;border-radius:50%;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    /* summary */
    .vi-summary{background:#13132b;border:1px solid #2a2a50;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px}
    .vi-summary h3{margin:0;color:#c0c0ff;font-size:15px}
    .score-item{display:flex;align-items:center;gap:10px}
    .score-label{width:110px;font-size:12px;color:#9999cc;flex-shrink:0}
    .score-bar{flex:1;height:8px;background:#22224a;border-radius:4px;overflow:hidden}
    .score-fill{height:100%;background:linear-gradient(90deg,#4444cc,#8888ff);border-radius:4px;transition:width .6s ease}
    .score-val{width:30px;font-size:12px;color:#8888ff;text-align:right}
    .vi-result{font-size:14px;font-weight:700;padding:10px 16px;border-radius:8px;margin:0}
    .vi-result.passed{background:#1a3a1a;color:#66ff66;border:1px solid #336633}
    .vi-result.failed{background:#3a1a1a;color:#ff6666;border:1px solid #663333}
    .vi-summary-text{font-size:13px;color:#aaaacc;line-height:1.6;margin:0}
    .vi-list{padding-left:16px;margin:4px 0;color:#c0c0ee;font-size:13px;line-height:1.7}
  </style>
</head>
<body>

<!-- Loading -->
<div class="screen active" id="screen-loading">
  <div style="font-size:48px;margin-bottom:16px">&#x23F3;</div>
  <p style="color:#8888cc;font-size:15px">Mulakat bilgileri dogrulanıyor...</p>
</div>

<!-- Error -->
<div class="screen" id="screen-error">
  <div class="card">
    <div class="icon">&#x26A0;&#xFE0F;</div>
    <h1>Gecersiz Baglanti</h1>
    <p class="sub" id="err-detail">Mulakat linki gecersiz veya suresi dolmus.</p>
  </div>
</div>

<!-- Landing -->
<div class="screen" id="screen-landing">
  <div class="card">
    <div class="icon">&#x1F916;</div>
    <h1>AI Mulakat &mdash; CVNokta</h1>
    <p class="sub" id="landing-desc">Yukleniyor...</p>
    <div class="badge" id="landing-job">...</div>
    <button class="btn" id="btn-start" onclick="startInterview()">&#x1F3AF; Mulakata Basla</button>
    <div id="start-err" style="display:none" class="err-box"></div>
  </div>
</div>

<!-- Interview -->
<div id="screen-interview">
  <div class="vi-left">
    <div class="vi-avatar" id="vi-avatar">
      <div class="vi-face">
        <div class="vi-eyes"><span></span><span></span></div>
        <div class="vi-mouth" id="vi-mouth"></div>
      </div>
    </div>
    <p class="vi-name">hr.ai Mulakat</p>
    <p class="vi-status" id="vi-status">Baglanıyor...</p>
    <div style="display:flex;flex-direction:column;gap:10px;width:100%" id="vi-controls">
      <button class="vi-btn vi-btn-mute" id="btn-mute" onclick="toggleMute()">&#x1F3A4; Mikrofon Acık</button>
      <button class="vi-btn vi-btn-end" onclick="endInterview()">&#x23F9;&#xFE0F; Mulakatı Bitir</button>
    </div>
    <div class="vi-err" id="vi-err" style="display:none"></div>
  </div>
  <div class="vi-right">
    <h3 class="vi-title">Konusma</h3>
    <div class="vi-transcript" id="vi-transcript">
      <p class="vi-placeholder">Mulakat basladıgında konusma burada gorunecek.</p>
    </div>
  </div>
</div>

<script>
const API     = 'http://localhost:8000/api/v1/interview/realtime';
const WS_URL  = 'ws://localhost:8000/api/v1/interview/realtime/ws';
const BACKEND = 'https://localhost:9001/api/v1';

let sessionConfig=null, ws=null, audioCtx=null, mediaStream=null, processor=null;
let muted=false, isPlaying=false, audioQueue=[], sessionId=null;

// ── Init: validate token ───────────────────────────────────────────
(async()=>{
  const token = new URLSearchParams(location.search).get('token')||'';
  if(!token){showError('Mulakat token bulunamadı. Lutfen e-postanızdaki linki kullanın.');return;}
  try{
    const res = await fetch(API+'/start-with-token',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    if(res.status===409){showError('Bu mulakat daha once tamamlanmıs. Tekrar giris yapılamaz.');return;}
    if(res.status===403){showError('Gecersiz veya suresi dolmus mulakat linki.');return;}
    if(!res.ok){const d=await res.json().catch(()=>({}));showError(d.detail||'Mulakat baslatılamadı.');return;}
    sessionConfig=await res.json();
    sessionId=sessionConfig.session_id;
    const name=sessionConfig.candidate_name||'Aday';
    const job=sessionConfig.job_posting?.job_title||'';
    document.getElementById('landing-desc').textContent=
      'Merhaba '+name+'! '+job+' pozisyonu icin AI mulakatınız hazır.';
    document.getElementById('landing-job').textContent=job||'Pozisyon';
    showScreen('landing');
  }catch(e){showError('Baglantı hatası: '+e.message);}
})();

function showScreen(id){
  ['loading','error','landing'].forEach(s=>{
    document.getElementById('screen-'+s).classList.toggle('active',s===id);
  });
  const iv=document.getElementById('screen-interview');
  if(id==='interview'){iv.style.display='flex';iv.classList.add('active');}
  else{iv.style.display='none';iv.classList.remove('active');}
}
function showError(msg){document.getElementById('err-detail').textContent=msg;showScreen('error');}
function setStatus(t){document.getElementById('vi-status').textContent=t;}
function setViErr(msg){const el=document.getElementById('vi-err');el.textContent=msg;el.style.display=msg?'block':'none';}
function setAiSpeaking(v){
  document.getElementById('vi-avatar').classList.toggle('speaking',v);
  document.getElementById('vi-mouth').classList.toggle('talking',v);
  setStatus(v?'Konusuyor...':'Dinliyor...');
}
function appendMsg(role,text){
  const box=document.getElementById('vi-transcript');
  const ph=box.querySelector('.vi-placeholder');if(ph)ph.remove();
  const d=document.createElement('div');
  d.className='vi-msg '+role;
  d.innerHTML='<span class="vi-msg-role">'+(role==='ai'?'AI':'Sen')+'</span>'
    +'<p class="vi-msg-text">'+escHtml(text)+'</p>';
  box.appendChild(d);box.scrollTop=box.scrollHeight;
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ── Audio playback ─────────────────────────────────────────────────
async function playNext(){
  if(isPlaying||!audioQueue.length)return;
  isPlaying=true;setAiSpeaking(true);
  const b64=audioQueue.shift();
  try{
    if(!audioCtx)audioCtx=new AudioContext();
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const buf=await audioCtx.decodeAudioData(bytes.buffer);
    const src=audioCtx.createBufferSource();
    src.buffer=buf;src.connect(audioCtx.destination);
    src.onended=()=>{isPlaying=false;audioQueue.length?playNext():setAiSpeaking(false);};
    src.start();
  }catch{isPlaying=false;if(!audioQueue.length)setAiSpeaking(false);playNext();}
}

// ── Mic capture ───────────────────────────────────────────────────
async function startMic(){
  mediaStream=await navigator.mediaDevices.getUserMedia({audio:true});
  if(!audioCtx)audioCtx=new AudioContext({sampleRate:24000});
  const source=audioCtx.createMediaStreamSource(mediaStream);
  processor=audioCtx.createScriptProcessor(4096,1,1);
  source.connect(processor);processor.connect(audioCtx.destination);
  processor.onaudioprocess=e=>{
    if(muted||!ws||ws.readyState!==1)return;
    const f32=e.inputBuffer.getChannelData(0);
    const i16=new Int16Array(f32.length);
    for(let i=0;i<f32.length;i++)i16[i]=Math.max(-32768,Math.min(32767,f32[i]*32768));
    const b64=btoa(String.fromCharCode(...new Uint8Array(i16.buffer)));
    ws.send(JSON.stringify({type:'audio_chunk',audio:b64}));
  };
}
function stopMic(){
  try{processor?.disconnect();processor=null;}catch{}
  try{mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;}catch{}
}
function toggleMute(){
  muted=!muted;
  const btn=document.getElementById('btn-mute');
  btn.textContent=muted?'Mikrofon Kapalı':'Mikrofon Acık';
  btn.classList.toggle('muted',muted);
}

// ── Start interview ────────────────────────────────────────────────
async function startInterview(){
  document.getElementById('btn-start').disabled=true;
  document.getElementById('start-err').style.display='none';
  try{await startMic();}
  catch(e){
    document.getElementById('start-err').textContent='Mikrofon erisimi reddedildi: '+e.message;
    document.getElementById('start-err').style.display='block';
    document.getElementById('btn-start').disabled=false;return;
  }
  showScreen('interview');setStatus('Baglanıyor...');
  ws=new WebSocket(WS_URL);
  ws.onopen=()=>{
    ws.send(JSON.stringify({type:'init',session_id:sessionId,
      candidate_name:sessionConfig.candidate_name,
      job_posting:sessionConfig.job_posting,
      cv_summary:sessionConfig.cv_summary}));
    setStatus('Dinliyor...');
  };
  ws.onmessage=async e=>{
    const msg=JSON.parse(e.data);
    if(msg.type==='audio_delta'){audioQueue.push(msg.audio);playNext();}
    else if(msg.type==='transcript_ai')    appendMsg('ai',msg.text);
    else if(msg.type==='transcript_candidate')appendMsg('candidate',msg.text);
    else if(msg.type==='interview_complete'){stopMic();showEvaluating();await fetchEval();}
    else if(msg.type==='error')setViErr(msg.message||'Bir hata olustu.');
  };
  ws.onerror=()=>setViErr('WebSocket baglantı hatası.');
  ws.onclose=()=>{if(!document.getElementById('vi-ev-div'))setStatus('Baglantı kesildi.');};
}

async function endInterview(){
  if(!sessionId)return;
  stopMic();if(ws&&ws.readyState===1)ws.close();
  showEvaluating();await fetchEval();
}

function showEvaluating(){
  document.getElementById('vi-controls').style.display='none';
  setStatus('Degerlendiriliyor...');
  const right=document.querySelector('.vi-right');
  const ev=document.createElement('div');
  ev.className='vi-evaluating';ev.id='vi-ev-div';
  ev.innerHTML='<div class="spinner"></div><h3>Mulakatınız Degerlendiriliyor</h3><p>Lutfen bekleyin, AI mülakat sonuçlarınızı analiz ediyor...</p>';
  right.appendChild(ev);
}

async function fetchEval(){
  try{
    const res=await fetch(API+'/'+sessionId+'/end',{method:'POST'});
    if(!res.ok)throw new Error('Degerlendirme alınamadı.');
    const data=await res.json();
    await saveResults(data);showResults(data);
  }catch(err){setStatus('Degerlendirme hatası');setViErr(err.message);}
}

async function saveResults(data){
  if(!sessionConfig?.application_id)return;
  const jwt=localStorage.getItem('jwToken');
  try{
    await fetch(BACKEND+'/Interviews/save-realtime',{
      method:'POST',
      headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},
      body:JSON.stringify({
        applicationId:sessionConfig.application_id,
        jobPostingId:sessionConfig.job_posting_id,
        externalSessionId:sessionId,
        overallInterviewScore:data.overall_interview_score,
        communicationScore:data.communication_score,
        technicalKnowledgeScore:data.technical_knowledge_score,
        jobMatchScore:data.job_match_score,
        experienceAlignmentScore:data.experience_alignment_score,
        totalQuestionsAsked:data.total_questions_asked,
        totalQuestionsAnswered:data.total_questions_answered,
        summaryText:data.summary_text,
        strengths:Array.isArray(data.strengths)?data.strengths.join('\\n'):data.strengths,
        weaknesses:Array.isArray(data.weaknesses)?data.weaknesses.join('\\n'):data.weaknesses,
        recommendations:Array.isArray(data.recommendations)?data.recommendations.join('\\n'):data.recommendations,
        isPassed:data.is_passed
      })
    });
  }catch(e){console.warn('Save failed:',e);}
}

function showResults(data){
  const ev=document.getElementById('vi-ev-div');if(ev)ev.remove();
  setStatus(data.is_passed?'Mulakat basarılı':'Mulakat tamamlandı');
  const scores=[
    {label:'Genel Skor',val:data.overall_interview_score},
    {label:'Iletisim',val:data.communication_score},
    {label:'Teknik',val:data.technical_knowledge_score},
    {label:'Is Uyumu',val:data.job_match_score},
  ];
  const scHtml=scores.map(s=>{
    const pct=Math.min(Math.round(s.val||0),100);
    return '<div class="score-item"><span class="score-label">'+s.label+'</span>'
      +'<div class="score-bar"><div class="score-fill" style="width:'+pct+'%"></div></div>'
      +'<span class="score-val">'+pct+'</span></div>';
  }).join('');
  const str=Array.isArray(data.strengths)?data.strengths:(data.strengths||'').split('\\n').filter(Boolean);
  const wk=Array.isArray(data.weaknesses)?data.weaknesses:(data.weaknesses||'').split('\\n').filter(Boolean);
  const div=document.createElement('div');
  div.className='vi-summary';
  div.innerHTML='<h3>Mulakat Ozeti</h3><div>'+scHtml+'</div>'
    +(data.summary_text?'<p class="vi-summary-text">'+escHtml(data.summary_text)+'</p>':'')
    +(str.length?'<div><strong style="color:#66ff99">Guclu Yonler:</strong><ul class="vi-list">'+str.map(s=>'<li>'+escHtml(s)+'</li>').join('')+'</ul></div>':'')
    +(wk.length?'<div><strong style="color:#ff9966">Gelisim Alanları:</strong><ul class="vi-list">'+wk.map(s=>'<li>'+escHtml(s)+'</li>').join('')+'</ul></div>':'')
    +'<p class="vi-result '+(data.is_passed?'passed':'failed')+'">'
    +(data.is_passed?'Mulakat Basarili - Tebrikler!':'Mulakat Tamamlandı')+'</p>';
  document.querySelector('.vi-right').appendChild(div);
}
</script>
</body>
</html>"""
