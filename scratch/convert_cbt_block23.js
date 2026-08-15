import fs from 'fs';
import path from 'path';

function getCbtTemplate(title, block, topicName, questionsJson) {
  const total = JSON.parse(questionsJson).length;
  const storagePrefix = title.toLowerCase().replace(/[^a-z0-9]/g, '');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>${title} — BLOK ${block}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #F5F2EC;
  --surface: #EDE9E1;
  --surface-2: #E4DFD5;
  --surface-3: #D9D3C8;
  --border: #C8C1B4;
  --border-light: #D4CEC4;
  --ink: #1A1814;
  --ink-muted: #5A5650;
  --ink-faint: #9A9590;
  --r: 14px;
  --r-sm: 9px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
  padding: 16px;
}
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0;
}
.shell { max-width: 740px; margin: 0 auto; position: relative; z-index: 1; }

/* START SCREEN */
#start-screen { animation: fadeIn 0.4s ease; }
.logo-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 32px 0 6px; }
.logo-wordmark { font-family: Georgia, serif; font-size: clamp(2rem, 6vw, 3.2rem); letter-spacing: -1px; color: var(--ink); line-height: 1.1; }
.logo-wordmark span { color: #1A5FA8; }
.logo-tag { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); border: 1px solid var(--border); padding: 3px 8px; border-radius: 99px; }
.meta-row { display: flex; gap: 16px; flex-wrap: wrap; padding: 12px 0 16px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.meta-chip { display: flex; align-items: center; gap: 6px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--ink-muted); }
.meta-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: #1A5FA8; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 22px; margin-bottom: 16px; }
.card-title { font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 14px; }
.mode-grid { display: flex; flex-direction: column; gap: 8px; }
.mode-btn { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); cursor: pointer; text-align: left; transition: all 0.15s; color: var(--ink); }
.mode-btn:hover { background: var(--surface-3); border-color: var(--ink-muted); transform: translateY(-1px); }
.mode-icon { width: 34px; height: 34px; border-radius: 8px; background: var(--ink); color: var(--bg); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.mode-text h3 { font-size: 14.5px; font-weight: 600; margin-bottom: 2px; }
.mode-text p { font-size: 12.5px; color: var(--ink-muted); line-height: 1.4; }
.mode-arr { margin-left: auto; font-family: 'DM Mono', monospace; font-size: 16px; color: var(--ink-faint); }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.stat-box { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px 10px; text-align: center; }
.stat-val { font-family: Georgia, serif; font-size: 20px; font-weight: 600; margin-bottom: 2px; }
.stat-lbl { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-muted); }

.hist-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.hist-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border-light); border-radius: 6px; font-size: 12.5px; font-family: 'DM Mono', monospace; }
.no-hist { text-align: center; padding: 14px; font-size: 12.5px; color: var(--ink-faint); font-family: 'DM Mono', monospace; }
.reset-btn { font-family: 'DM Mono', monospace; font-size: 10.5px; color: var(--ink-muted); background: none; border: 1px solid var(--border); padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.reset-btn:hover { background: var(--surface-2); color: var(--ink); }

/* TOPIC PERFORMANCE */
.topic-bar { display: flex; flex-direction: column; gap: 8px; }
.topic-row { display: flex; align-items: center; gap: 10px; font-size: 12px; font-family: 'DM Mono', monospace; }
.topic-name { min-width: 140px; color: var(--ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topic-track { flex: 1; height: 8px; background: var(--surface-2); border-radius: 99px; overflow: hidden; border: 1px solid var(--border-light); }
.topic-fill { height: 100%; border-radius: 99px; }
.topic-fill.good { background: #2D6A4F; }
.topic-fill.mid { background: #8A5C00; }
.topic-fill.low { background: #A83828; }
.topic-pct { min-width: 36px; text-align: right; color: var(--ink); font-weight: 500; }

/* QUIZ SCREEN */
#quiz-screen { display: none; animation: fadeIn 0.4s ease; }
.quiz-header { display: flex; align-items: center; gap: 12px; padding: 24px 0 14px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.btn-ghost { font-family: 'DM Mono', monospace; font-size: 11px; background: none; border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--r-sm); cursor: pointer; color: var(--ink-muted); }
.btn-ghost:hover { background: var(--surface); color: var(--ink); }
.progress-block { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.progress-track { width: 100%; height: 6px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--ink); transition: width 0.2s; }
.progress-label { display: flex; justify-content: space-between; font-family: 'DM Mono', monospace; font-size: 10.5px; color: var(--ink-muted); }
.score-pill { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 600; padding: 4px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 99px; }

.q-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 26px 22px; margin-bottom: 16px; }
.q-topic { font-family: 'DM Mono', monospace; font-size: 10.5px; text-transform: uppercase; color: var(--ink-muted); letter-spacing: 1.5px; margin-bottom: 10px; display: inline-block; }
.q-text { font-size: 16.5px; font-weight: 600; line-height: 1.55; margin-bottom: 20px; }
.opts { display: flex; flex-direction: column; gap: 9px; }
.opt { display: flex; align-items: flex-start; gap: 12px; padding: 13px 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 14.5px; cursor: pointer; text-align: left; transition: all 0.12s; color: var(--ink); }
.opt:hover:not(:disabled) { background: var(--surface-3); border-color: var(--ink-muted); }
.opt-key { width: 22px; height: 22px; border-radius: 50%; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; flex-shrink: 0; }
.opt.correct { background: rgba(45,106,79,0.12); border-color: #2D6A4F; color: #2D6A4F; }
.opt.correct .opt-key { background: #2D6A4F; color: #fff; }
.opt.wrong { background: rgba(168,56,40,0.1); border-color: #A83828; color: #A83828; }
.opt.wrong .opt-key { background: #A83828; color: #fff; }
.opt.selected { background: var(--surface-3); border-color: var(--ink); }

.exp-box { display: none; margin-top: 20px; padding: 16px; background: var(--surface-2); border-left: 3px solid var(--ink); border-radius: 0 var(--r-sm) var(--r-sm) 0; font-size: 13.5px; line-height: 1.6; }
.exp-box.show { display: block; animation: fadeIn 0.25s ease; }
.exp-body strong { color: var(--ink); }

.nav-row { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
.nav-btn { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: var(--r-sm); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; }
.nav-btn.primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.nav-btn.primary:hover { opacity: 0.9; }
.nav-btn.secondary { background: transparent; color: var(--ink-muted); }
.nav-btn.secondary:hover { background: var(--surface-2); color: var(--ink); }
.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.q-map-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; margin-top: 16px; }
.q-map-title { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 10px; }
.q-map-grid { display: flex; flex-wrap: wrap; gap: 5px; }
.q-dot { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 10px; cursor: pointer; border: 1px solid var(--border-light); background: var(--surface-2); color: var(--ink-faint); }
.q-dot.current { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.q-dot.answered { background: var(--surface-3); color: var(--ink); border-color: var(--ink-muted); }
.q-dot.wrong { text-decoration: line-through; opacity: 0.7; }

/* RESULT SCREEN */
#result-screen { display: none; text-align: center; animation: fadeIn 0.4s ease; }
.res-hero { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 36px 20px; margin: 24px 0 16px; }
.res-score { font-family: Georgia, serif; font-size: clamp(3rem, 10vw, 4.8rem); line-height: 1; color: var(--ink); margin-bottom: 6px; }
.res-sub { font-size: 14.5px; color: var(--ink-muted); margin-bottom: 20px; }
.res-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
.res-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 14px 10px; }
.res-val { font-family: Georgia, serif; font-size: 24px; font-weight: 600; margin-bottom: 2px; }
.res-lbl { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink-muted); }

@keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
@media(max-width:480px){
  body{padding:10px;}
  .stats-grid{grid-template-columns:repeat(2,1fr);}
}
</style>
</head>
<body>
<div class="shell">

<!-- START SCREEN -->
<div id="start-screen">
  <div class="logo-row">
    <div class="logo-wordmark">${title}</div>
    <div class="logo-tag">BLOK ${block}</div>
  </div>
  <div class="meta-row">
    <div class="meta-chip"><span class="dot"></span>${topicName}</div>
    <div class="meta-chip"><span class="dot"></span>${total} Soal Komprehensif</div>
    <div class="meta-chip"><span class="dot"></span>FK UNSOED</div>
  </div>

  <div class="card">
    <div class="card-title">Pilih Mode Belajar</div>
    <div class="mode-grid">
      <button class="mode-btn" onclick="startQuiz('study')">
        <div class="mode-icon">S</div>
        <div class="mode-text"><h3>Study Mode</h3><p>Lihat jawaban &amp; pembahasan lengkap seketika setelah menjawab</p></div>
        <div class="mode-arr">›</div>
      </button>
      <button class="mode-btn" onclick="startQuiz('exam')">
        <div class="mode-icon">E</div>
        <div class="mode-text"><h3>Exam Mode</h3><p>Simulasi ujian CBT — kunci jawaban tersembunyi hingga selesai</p></div>
        <div class="mode-arr">›</div>
      </button>
      <button class="mode-btn" onclick="startQuiz('drill')">
        <div class="mode-icon">D</div>
        <div class="mode-text"><h3>Drill Mode</h3><p>Ulangi soal salah sampai tuntas memahami materi</p></div>
        <div class="mode-arr">›</div>
      </button>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Statistik &amp; Riwayat Pengerjaan</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-val" id="stat-best">—</div><div class="stat-lbl">Best Score</div></div>
      <div class="stat-box"><div class="stat-val" id="stat-avg">—</div><div class="stat-lbl">Avg Score</div></div>
      <div class="stat-box"><div class="stat-val" id="stat-sessions">0</div><div class="stat-lbl">Sessions</div></div>
      <div class="stat-box"><div class="stat-val">${total}</div><div class="stat-lbl">Total Soal</div></div>
    </div>
    <div class="hist-list" id="hist-list"><div class="no-hist">Belum ada riwayat sesi.</div></div>
    <button class="reset-btn" onclick="clearHistory()">Reset Riwayat</button>
  </div>
</div>

<!-- QUIZ SCREEN -->
<div id="quiz-screen">
  <div class="quiz-header">
    <button class="btn-ghost" onclick="showStart()">← Keluar</button>
    <div class="progress-block">
      <div class="progress-track"><div class="progress-fill" id="prog-fill" style="width:0%"></div></div>
      <div class="progress-label"><span id="prog-txt">Soal 1 / ${total}</span><span id="mode-badge">STUDY MODE</span></div>
    </div>
    <div class="score-pill" id="score-display">0 / 0</div>
  </div>

  <div class="q-card">
    <span class="q-topic" id="q-topic">${topicName}</span>
    <div class="q-text" id="q-text">Pertanyaan...</div>
    <div class="opts" id="opts"></div>
    <div class="exp-box" id="exp-box">
      <div class="exp-body" id="exp-body"></div>
    </div>
  </div>

  <div class="nav-row">
    <button class="nav-btn secondary" id="btn-prev" onclick="navigate(-1)">‹ Prev</button>
    <button class="nav-btn primary" id="btn-next" onclick="navigate(1)">Next ›</button>
  </div>

  <div class="q-map-section">
    <div class="q-map-title">Navigasi Butir Soal</div>
    <div class="q-map-grid" id="q-map"></div>
  </div>
</div>

<!-- RESULT SCREEN -->
<div id="result-screen">
  <div class="res-hero">
    <div class="res-score" id="final-score">0%</div>
    <div class="res-sub" id="final-sub">0 / ${total} soal dijawab dengan benar</div>
    
    <div class="res-grid">
      <div class="res-card"><div class="res-val" id="r-correct" style="color:#2D6A4F">0</div><div class="res-lbl">Benar</div></div>
      <div class="res-card"><div class="res-val" id="r-wrong" style="color:#A83828">0</div><div class="res-lbl">Salah</div></div>
      <div class="res-card"><div class="res-val" id="r-skip" style="color:var(--ink-muted)">0</div><div class="res-lbl">Lewat</div></div>
    </div>

    <div style="display:flex; gap:10px; justify-content:center;">
      <button class="nav-btn secondary" onclick="reviewAnswers()">Review Jawaban</button>
      <button class="nav-btn primary" onclick="showStart()">Menu Utama</button>
    </div>
  </div>
</div>

</div>

<script>
const QUESTIONS = ${questionsJson};
const TOTAL = QUESTIONS.length;
const KEYS = ['A','B','C','D','E'];
const STORAGE_KEY = '${storagePrefix}_';

let mode = 'study';
let cur = 0;
let score = 0;
let answered = {};
let sessions = 0;
let bestScore = 0;
let allScores = [];

function loadStats() {
  try {
    sessions = parseInt(localStorage.getItem(STORAGE_KEY + 's') || '0');
    bestScore = parseInt(localStorage.getItem(STORAGE_KEY + 'b') || '0');
    allScores = JSON.parse(localStorage.getItem(STORAGE_KEY + 'sc') || '[]');
  } catch(e) {}
  
  document.getElementById('stat-sessions').textContent = sessions;
  document.getElementById('stat-best').textContent = sessions > 0 ? bestScore + '/' + TOTAL : '—';
  if (allScores.length > 0) {
    const avg = Math.round(allScores.reduce((a,b)=>a+b.score,0)/allScores.length);
    document.getElementById('stat-avg').textContent = avg + '/' + TOTAL;
    document.getElementById('hist-list').innerHTML = allScores.slice(-4).reverse().map(s=>
      \`<div class="hist-item"><span>\${s.date} · \${s.mode.toUpperCase()}</span><strong>\${s.score}/\${TOTAL} (\${Math.round(s.score/TOTAL*100)}%)</strong></div>\`
    ).join('');
  } else {
    document.getElementById('stat-avg').textContent = '—';
    document.getElementById('hist-list').innerHTML = '<div class="no-hist">Belum ada riwayat sesi.</div>';
  }
}

function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY + 's');
    localStorage.removeItem(STORAGE_KEY + 'b');
    localStorage.removeItem(STORAGE_KEY + 'sc');
  } catch(e) {}
  loadStats();
}

function startQuiz(m) {
  mode = m;
  cur = 0;
  score = 0;
  answered = {};
  
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('quiz-screen').style.display = 'block';
  document.getElementById('mode-badge').textContent = mode.toUpperCase() + ' MODE';
  
  renderQ();
}

function renderQ() {
  const q = QUESTIONS[cur];
  document.getElementById('prog-fill').style.width = ((cur+1)/TOTAL*100) + '%';
  document.getElementById('prog-txt').textContent = \`Soal \${cur+1} / \${TOTAL}\`;
  document.getElementById('score-display').textContent = \`\${score} / \${Object.keys(answered).length}\`;
  document.getElementById('q-text').innerHTML = q.q;
  
  const optsContainer = document.getElementById('opts');
  optsContainer.innerHTML = '';
  
  q.o.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = \`<span class="opt-key">\${KEYS[i]}</span><span>\${opt}</span>\`;
    
    if (answered.hasOwnProperty(cur)) {
      btn.disabled = true;
      if (opt === q.a && mode === 'study') btn.classList.add('correct');
      else if (opt === answered[cur+'-choice']) {
        if (mode === 'study') btn.classList.add(answered[cur] ? 'correct' : 'wrong');
        else btn.classList.add('selected');
      }
    } else {
      btn.onclick = () => selectOpt(btn, opt);
    }
    optsContainer.appendChild(btn);
  });
  
  const expBox = document.getElementById('exp-box');
  if (answered.hasOwnProperty(cur) && mode === 'study') {
    document.getElementById('exp-body').innerHTML = q.exp || ('<strong>Kunci Jawaban:</strong> ' + q.a);
    expBox.classList.add('show');
  } else {
    expBox.classList.remove('show');
  }
  
  document.getElementById('btn-prev').disabled = cur === 0;
  document.getElementById('btn-next').textContent = cur === TOTAL - 1 ? 'Selesai ›' : 'Next ›';
  
  renderMap();
}

function selectOpt(btn, opt) {
  const q = QUESTIONS[cur];
  const correct = opt === q.a;
  answered[cur] = correct;
  answered[cur+'-choice'] = opt;
  if (correct) score++;
  
  renderQ();
}

function navigate(dir) {
  if (dir === 1 && cur === TOTAL - 1) {
    showResults();
    return;
  }
  cur = Math.max(0, Math.min(TOTAL - 1, cur + dir));
  renderQ();
}

function jumpTo(i) {
  cur = i;
  renderQ();
}

function renderMap() {
  document.getElementById('q-map').innerHTML = QUESTIONS.map((_, i) => {
    let cls = 'q-dot';
    if (i === cur) cls += ' current';
    else if (answered.hasOwnProperty(i)) cls += answered[i] ? ' answered' : ' wrong';
    return \`<div class="\${cls}" onclick="jumpTo(\${i})">\${i+1}</div>\`;
  }).join('');
}

function showResults() {
  const correct = Object.values(answered).filter(v => v === true).length;
  const wrong = Object.values(answered).filter(v => v === false).length;
  const skip = TOTAL - Object.keys(answered).filter(k => !k.includes('-')).length;
  const pct = Math.round(correct / TOTAL * 100);
  
  sessions++;
  if (correct > bestScore) bestScore = correct;
  const dateStr = new Date().toLocaleDateString('id-ID', {day:'2-digit', month:'short'});
  allScores.push({ score: correct, mode, date: dateStr });
  if (allScores.length > 15) allScores.shift();
  
  try {
    localStorage.setItem(STORAGE_KEY + 's', sessions);
    localStorage.setItem(STORAGE_KEY + 'b', bestScore);
    localStorage.setItem(STORAGE_KEY + 'sc', JSON.stringify(allScores));
  } catch(e) {}
  
  document.getElementById('quiz-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = 'block';
  document.getElementById('final-score').textContent = pct + '%';
  document.getElementById('final-sub').textContent = \`\${correct} dari \${TOTAL} soal dijawab benar\`;
  document.getElementById('r-correct').textContent = correct;
  document.getElementById('r-wrong').textContent = wrong;
  document.getElementById('r-skip').textContent = skip;
}

function reviewAnswers() {
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('quiz-screen').style.display = 'block';
  mode = 'study';
  cur = 0;
  renderQ();
}

function showStart() {
  document.getElementById('quiz-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'block';
  loadStats();
}

loadStats();
</script>
</body>
</html>`;
}

const cbtFiles23 = [
  { file: '2.3 CBT_21 SYAFIQ KECIL.html', title: '21 SYAFIQ KECIL', topic: 'Reproduksi & Siklus Hidup Pria/Wanita' },
  { file: '2.3 CBT_22 SYAFIQ JUMBO.html', title: '22 SYAFIQ JUMBO', topic: 'Embriologi & Kehamilan' },
  { file: '2.3 CBT_23 SYAFIQ GIGA.html', title: '23 SYAFIQ GIGA', topic: 'Neonatus, Laktasi & Tumbuh Kembang' },
  { file: '2.3 CBT_24 SYAFIQ GALACTUS.html', title: '24 SYAFIQ GALACTUS', topic: 'Geriatri & Seksualitas' },
  { file: '2.3 CBT_99 TAHUN MEDAN TIPSEN.html', title: '99 TAHUN MEDAN TIPSEN', topic: 'Bank Soal Komprehensif Blok 2.3' },
  { file: '2.3 CBT_Kicaw.html', title: 'KAPSUL 2.3 KICAW', topic: '100 Bank Soal Komprehensif CBT 2.3' }
];

const basePath = path.join(process.cwd(), 'content', 'semester 2', '2.3');

cbtFiles23.forEach(item => {
  const filePath = path.join(basePath, item.file);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  
  if (item.file === '2.3 CBT_Kicaw.html') {
    const kMatch = raw.match(/const\s+bankSoal\s*=\s*(\[[\s\S]*?\]);\s*(?:let|\/\/|const|\$|function)/i);
    if (kMatch) {
      let rawBank;
      try {
        rawBank = eval(kMatch[1]);
      } catch(e) {
        console.error('Eval error on Kicaw', e);
        return;
      }
      const normalized = rawBank.map(q => {
        const correctAns = typeof q.a === 'number' ? q.o[q.a] : q.a;
        return {
          q: q.q,
          o: q.o,
          a: correctAns,
          exp: q.p || ('<strong>Kunci Jawaban:</strong> ' + correctAns)
        };
      });
      const outputHtml = getCbtTemplate(item.title, '2.3', item.topic, JSON.stringify(normalized, null, 2));
      fs.writeFileSync(filePath, outputHtml, 'utf8');
      console.log('Successfully migrated ' + item.file + ' (' + normalized.length + ' questions)');
    }
  } else {
    let match = raw.match(/const\s+(?:questions|QUESTIONS|Q|dataset|quizData|db|DB)\s*=\s*(\[[\s\S]*?\]);\s*(?:let|\/\/|const|\$|function)/i);
    if (match) {
      let questions;
      try {
        questions = eval(match[1]);
      } catch(e) {
        console.error('Eval error on ' + item.file, e);
        return;
      }
      
      const normalized = questions.map(q => ({
        q: q.q,
        o: q.o || q.options || q.opts,
        a: q.a || q.ans || q.answer,
        exp: q.exp || q.desc || q.explanation || ('<strong>Kunci Jawaban:</strong> ' + (q.a || q.ans || q.answer))
      }));
      
      const outputHtml = getCbtTemplate(item.title, '2.3', item.topic, JSON.stringify(normalized, null, 2));
      fs.writeFileSync(filePath, outputHtml, 'utf8');
      console.log('Successfully migrated ' + item.file + ' (' + normalized.length + ' questions)');
    }
  }
});
