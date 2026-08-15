import fs from 'fs';
import path from 'path';

function getCbtTemplate(title, block, topicName, questionsJson) {
  const total = JSON.parse(questionsJson).length;
  const storagePrefix = title.toLowerCase().replace(/[^a-z0-9]/g, '');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — CBT Exam Blok ${block}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #f8f8f5;
  --bg2: #f1f1ed;
  --bg3: #e7e7e2;
  --bg4: #dcdcd6;
  --border: rgba(40,55,110,.10);
  --border2: rgba(40,55,110,.20);
  --text: #161b2e;
  --text2: #384068;
  --text3: #7c85a8;
  --green: #1f7a4a;
  --greenbg: rgba(31,122,74,.09);
  --greenb: rgba(31,122,74,.25);
  --gold: #7a6010;
  --goldbg: rgba(122,96,16,.09);
  --goldb: rgba(122,96,16,.28);
  --red: #b03030;
  --redbg: rgba(176,48,48,.08);
  --redb: rgba(176,48,48,.25);
  --blue: #1a4faa;
  --bluebg: rgba(26,79,170,.09);
  --blueb: rgba(26,79,170,.28);
  --purp: #4433a0;
  --purpbg: rgba(68,51,160,.08);
  --purpb: rgba(68,51,160,.25);
  --teal: #136ba8;
  --tealbg: rgba(19,107,168,.08);
  --tealb: rgba(19,107,168,.25);
  --r: 10px;
  --rl: 14px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
}
.hdr {
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: 18px 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}
.hdr-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-badge {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  background: var(--redbg);
  color: var(--red);
  border: 1px solid var(--redb);
  padding: 4px 10px;
  border-radius: 99px;
  font-weight: 500;
  text-transform: uppercase;
}
.brand-title {
  font-family: 'Syne', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.hdr-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.timer-pill {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 99px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.timer-pill.urgent {
  background: var(--redbg);
  color: var(--red);
  border-color: var(--redb);
  animation: pulse 1s infinite alternate;
}
@keyframes pulse { from { opacity: 1; } to { opacity: 0.6; } }

.btn {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: var(--r);
  border: 1px solid var(--border2);
  background: var(--bg2);
  color: var(--text);
  cursor: pointer;
  transition: all .2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn:hover { background: var(--bg3); border-color: var(--text2); }
.btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
.btn-primary:hover { background: var(--red); border-color: var(--red); color: #fff; }
.btn-danger { background: var(--redbg); color: var(--red); border-color: var(--redb); }
.btn-danger:hover { background: var(--red); color: #fff; }

.layout {
  max-width: 1200px;
  margin: 24px auto 60px;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
}

.main-content {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 28px;
  box-shadow: 0 2px 8px rgba(0,0,0,.02);
}

.q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.q-title {
  font-family: 'Syne', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.q-flag-btn {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: var(--r);
  cursor: pointer;
  color: var(--text3);
  transition: all .2s;
}
.q-flag-btn.flagged {
  background: var(--goldbg);
  color: var(--gold);
  border-color: var(--goldb);
  font-weight: 600;
}

.q-text {
  font-size: 15.5px;
  line-height: 1.65;
  color: var(--text);
  margin-bottom: 24px;
  font-weight: 400;
}
.q-img {
  max-width: 100%;
  border-radius: var(--r);
  border: 1px solid var(--border);
  margin: 0 0 20px;
}

.opts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}
.opt {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--r);
  border: 1px solid var(--border2);
  background: var(--bg);
  cursor: pointer;
  transition: all .15s;
  text-align: left;
  font-size: 14.5px;
  color: var(--text);
  width: 100%;
}
.opt:hover {
  background: var(--bg2);
  border-color: var(--text2);
}
.opt.selected {
  background: var(--bluebg);
  border-color: var(--blueb);
  color: var(--blue);
  font-weight: 500;
}
.opt-key {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text2);
}
.opt.selected .opt-key {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
}

.q-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  gap: 10px;
  flex-wrap: wrap;
}

/* Sidebar */
.sidebar {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.02);
  position: sticky;
  top: 90px;
}
.sb-title {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg2);
  padding: 3px;
  border-radius: var(--r);
}
.ftab {
  flex: 1;
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  padding: 6px 2px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text3);
  cursor: pointer;
  text-align: center;
}
.ftab.active {
  background: #fff;
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}

.pal-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}
.pal-btn {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  aspect-ratio: 1;
  border-radius: var(--r);
  border: 1px solid var(--border);
  background: var(--bg2);
  color: var(--text2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all .15s;
}
.pal-btn:hover { border-color: var(--text); color: var(--text); }
.pal-btn.current { border: 2px solid var(--text); font-weight: 700; }
.pal-btn.answered { background: var(--bluebg); color: var(--blue); border-color: var(--blueb); font-weight: 600; }
.pal-btn.flagged::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(22,27,46,.5);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-backdrop.show { display: flex; }
.modal {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  max-width: 520px;
  width: 100%;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0,0,0,.15);
}
.modal h2 { font-family: 'Syne', sans-serif; font-size: 20px; margin-bottom: 10px; }
.modal p { color: var(--text2); font-size: 14px; margin-bottom: 20px; }
.modal-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.mstat {
  background: var(--bg2);
  padding: 10px;
  border-radius: var(--r);
  text-align: center;
}
.mstat-v { font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 700; }
.mstat-l { font-size: 11px; color: var(--text3); margin-top: 2px; }

/* Results Mode */
.results-view { display: none; }
.res-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 32px;
  margin-bottom: 24px;
  text-align: center;
}
.res-score {
  font-family: 'Syne', sans-serif;
  font-size: 64px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}
.res-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 24px 0;
}
.res-item {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
}
.res-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 700; }
.res-lbl { font-size: 11.5px; color: var(--text3); margin-top: 2px; }

.review-item {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 20px;
  margin-bottom: 16px;
}
.review-item.correct { border-left: 5px solid var(--green); }
.review-item.incorrect { border-left: 5px solid var(--red); }
.review-item.unanswered { border-left: 5px solid var(--gold); }
.review-exp {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--bg2);
  border-radius: var(--r);
  font-size: 13.5px;
  color: var(--text2);
}
</style>
</head>
<body>

<header class="hdr">
  <div class="hdr-inner">
    <div class="brand">
      <span class="brand-badge">Blok ${block}</span>
      <h1 class="brand-title">${title}</h1>
    </div>
    <div class="hdr-meta">
      <div class="timer-pill" id="timer">⏱️ <span id="time-display">--:--</span></div>
      <button class="btn btn-primary" onclick="confirmFinish()">Selesaikan Ujian</button>
    </div>
  </div>
</header>

<div class="layout" id="exam-layout">
  <main class="main-content">
    <div class="q-header">
      <div class="q-title" id="q-number">Soal 1 dari ${total}</div>
      <button class="q-flag-btn" id="flag-btn" onclick="toggleFlag()">🚩 Ragu-ragu</button>
    </div>
    
    <div class="q-text" id="q-text">Memuat pertanyaan...</div>
    <img id="q-image" class="q-img" style="display:none;" alt="Gambar Soal" />

    <div class="opts" id="opts"></div>

    <div class="q-nav">
      <button class="btn" id="prev-btn" onclick="navQ(-1)">‹ Sebelumnya</button>
      <div style="font-family:'DM Mono',monospace; font-size:12px; color:var(--text3);">Tombol Pintas: 1-5 / A-E</div>
      <button class="btn" id="next-btn" onclick="navQ(1)">Berikutnya ›</button>
    </div>
  </main>

  <aside class="sidebar">
    <div class="sb-title">
      <span>Lembar Jawaban</span>
      <span style="font-family:'DM Mono',monospace; font-size:12px; color:var(--text3);" id="progress-text">0/${total}</span>
    </div>

    <div class="filter-tabs">
      <button class="ftab active" onclick="setFilter('all', this)">Semua</button>
      <button class="ftab" onclick="setFilter('unanswered', this)">Belum</button>
      <button class="ftab" onclick="setFilter('flagged', this)">Ragu</button>
    </div>

    <div class="pal-grid" id="palette"></div>
  </aside>
</div>

<!-- Modal Selesai -->
<div class="modal-backdrop" id="finish-modal">
  <div class="modal">
    <h2>Konfirmasi Penyelesaian</h2>
    <p>Apakah Anda yakin ingin mengakhiri sesi ujian ini? Pastikan seluruh butir soal telah diperiksa.</p>
    
    <div class="modal-stats">
      <div class="mstat">
        <div class="mstat-v" style="color:var(--blue);" id="modal-ans">0</div>
        <div class="mstat-l">Dijawab</div>
      </div>
      <div class="mstat">
        <div class="mstat-v" style="color:var(--text3);" id="modal-unans">0</div>
        <div class="mstat-l">Kosong</div>
      </div>
      <div class="mstat">
        <div class="mstat-v" style="color:var(--gold);" id="modal-flag">0</div>
        <div class="mstat-l">Ragu-ragu</div>
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; gap:10px;">
      <button class="btn" onclick="closeModal()">Kembali Ujian</button>
      <button class="btn btn-danger" onclick="submitExam()">Ya, Selesaikan</button>
    </div>
  </div>
</div>

<!-- Tampilan Hasil Review -->
<div class="layout results-view" id="results-layout" style="display:none; max-width:960px;">
  <div style="grid-column: 1 / -1;">
    <div class="res-card">
      <div style="font-family:'DM Mono',monospace; font-size:12px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Hasil Akhir Evaluasi</div>
      <div class="res-score" id="res-score">0%</div>
      <p style="color:var(--text2); margin-top:8px;" id="res-msg">Evaluasi selesai.</p>

      <div class="res-grid">
        <div class="res-item">
          <div class="res-val" style="color:var(--green);" id="res-correct">0</div>
          <div class="res-lbl">Jawaban Benar</div>
        </div>
        <div class="res-item">
          <div class="res-val" style="color:var(--red);" id="res-wrong">0</div>
          <div class="res-lbl">Jawaban Salah</div>
        </div>
        <div class="res-item">
          <div class="res-val" style="color:var(--text3);" id="res-empty">0</div>
          <div class="res-lbl">Tidak Dijawab</div>
        </div>
        <div class="res-item">
          <div class="res-val" style="color:var(--text);" id="res-time">--:--</div>
          <div class="res-lbl">Waktu Digunakan</div>
        </div>
      </div>

      <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
        <button class="btn btn-primary" onclick="restartExam()">Ulangi Ujian ↺</button>
      </div>
    </div>

    <h2 style="font-family:'Syne',sans-serif; font-size:20px; margin-bottom:16px;">Pembahasan Butir Soal</h2>
    <div id="review-list"></div>
  </div>
</div>

<script>
const STORAGE_KEY = '${storagePrefix}_exam_state';
const questions = ${questionsJson};

let curIdx = 0;
let userAnswers = {};
let flagged = {};
let currentFilter = 'all';
let secondsElapsed = 0;
let timerInterval = null;
let isSubmitted = false;

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

function init() {
  loadState();
  renderPalette();
  renderQ();
  startTimer();
  
  document.addEventListener('keydown', handleKeyNav);
}

function startTimer() {
  timerInterval = setInterval(() => {
    secondsElapsed++;
    saveState();
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(secondsElapsed / 60);
  const s = secondsElapsed % 60;
  const str = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  const d = document.getElementById('time-display');
  if (d) d.textContent = str;
}

function renderQ() {
  const q = questions[curIdx];
  document.getElementById('q-number').textContent = 'Soal ' + (curIdx + 1) + ' dari ' + questions.length;
  document.getElementById('q-text').textContent = q.q;
  
  const imgEl = document.getElementById('q-image');
  if (q.img) {
    imgEl.src = q.img;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  const flagBtn = document.getElementById('flag-btn');
  if (flagged[curIdx]) {
    flagBtn.classList.add('flagged');
    flagBtn.textContent = '🚩 Ragu-ragu (Aktif)';
  } else {
    flagBtn.classList.remove('flagged');
    flagBtn.textContent = '🚩 Ragu-ragu';
  }

  const optsContainer = document.getElementById('opts');
  optsContainer.innerHTML = '';

  q.o.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt' + (userAnswers[curIdx] === i ? ' selected' : '');
    btn.innerHTML = '<span class="opt-key">' + KEYS[i] + '</span><span>' + optText + '</span>';
    btn.onclick = () => selectOption(i);
    optsContainer.appendChild(btn);
  });

  document.getElementById('prev-btn').disabled = curIdx === 0;
  document.getElementById('next-btn').disabled = curIdx === questions.length - 1;

  updateProgress();
  renderPalette();
}

function selectOption(optIdx) {
  if (isSubmitted) return;
  if (userAnswers[curIdx] === optIdx) {
    delete userAnswers[curIdx];
  } else {
    userAnswers[curIdx] = optIdx;
  }
  saveState();
  renderQ();
}

function toggleFlag() {
  if (flagged[curIdx]) {
    delete flagged[curIdx];
  } else {
    flagged[curIdx] = true;
  }
  saveState();
  renderQ();
}

function navQ(delta) {
  const next = curIdx + delta;
  if (next >= 0 && next < questions.length) {
    curIdx = next;
    renderQ();
  }
}

function jumpQ(idx) {
  curIdx = idx;
  renderQ();
}

function updateProgress() {
  const ansCount = Object.keys(userAnswers).length;
  document.getElementById('progress-text').textContent = ansCount + '/' + questions.length;
}

function renderPalette() {
  const pal = document.getElementById('palette');
  pal.innerHTML = '';

  questions.forEach((_, i) => {
    const isAnswered = userAnswers[i] !== undefined;
    const isFlagged = !!flagged[i];

    if (currentFilter === 'unanswered' && isAnswered) return;
    if (currentFilter === 'flagged' && !isFlagged) return;

    const btn = document.createElement('button');
    let cls = 'pal-btn';
    if (i === curIdx) cls += ' current';
    if (isAnswered) cls += ' answered';
    if (isFlagged) cls += ' flagged';
    
    btn.className = cls;
    btn.textContent = i + 1;
    btn.onclick = () => jumpQ(i);
    pal.appendChild(btn);
  });
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderPalette();
}

function confirmFinish() {
  const ansCount = Object.keys(userAnswers).length;
  const flagCount = Object.keys(flagged).length;
  const unansCount = questions.length - ansCount;

  document.getElementById('modal-ans').textContent = ansCount;
  document.getElementById('modal-unans').textContent = unansCount;
  document.getElementById('modal-flag').textContent = flagCount;

  document.getElementById('finish-modal').classList.add('show');
}

function closeModal() {
  document.getElementById('finish-modal').classList.remove('show');
}

function submitExam() {
  closeModal();
  isSubmitted = true;
  clearInterval(timerInterval);

  let correctCount = 0;
  questions.forEach((q, i) => {
    if (userAnswers[i] === q.a) {
      correctCount++;
    }
  });

  const total = questions.length;
  const wrongCount = Object.keys(userAnswers).length - correctCount;
  const emptyCount = total - Object.keys(userAnswers).length;
  const pct = Math.round((correctCount / total) * 100);

  document.getElementById('exam-layout').style.display = 'none';
  document.getElementById('results-layout').style.display = 'block';

  document.getElementById('res-score').textContent = pct + '%';
  document.getElementById('res-correct').textContent = correctCount;
  document.getElementById('res-wrong').textContent = wrongCount;
  document.getElementById('res-empty').textContent = emptyCount;

  const m = Math.floor(secondsElapsed / 60);
  const s = secondsElapsed % 60;
  document.getElementById('res-time').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

  renderReviewList();
}

function renderReviewList() {
  const container = document.getElementById('review-list');
  container.innerHTML = '';

  questions.forEach((q, i) => {
    const userAns = userAnswers[i];
    const isCorrect = userAns === q.a;
    const isUnanswered = userAns === undefined;

    let cls = 'review-item ';
    if (isUnanswered) cls += 'unanswered';
    else if (isCorrect) cls += 'correct';
    else cls += 'incorrect';

    const div = document.createElement('div');
    div.className = cls;

    let statusText = isUnanswered ? '⚪ Tidak Dijawab' : (isCorrect ? '✅ Jawaban Benar' : '❌ Jawaban Salah');
    let optsHtml = q.o.map((opt, oIdx) => {
      let optStyle = 'padding:6px 10px; border-radius:6px; margin:4px 0; font-size:13.5px;';
      if (oIdx === q.a) {
        optStyle += ' background:var(--greenbg); color:var(--green); font-weight:600; border:1px solid var(--greenb);';
      } else if (oIdx === userAns && !isCorrect) {
        optStyle += ' background:var(--redbg); color:var(--red); font-weight:600; border:1px solid var(--redb);';
      } else {
        optStyle += ' color:var(--text2);';
      }
      return '<div style="' + optStyle + '">' + KEYS[oIdx] + '. ' + opt + '</div>';
    }).join('');

    div.innerHTML = 
      '<div style="display:flex; justify-content:space-between; margin-bottom:8px;">' +
        '<strong style="font-family:Syne,sans-serif;">Soal #' + (i + 1) + '</strong>' +
        '<span style="font-family:DM Mono,monospace; font-size:12px;">' + statusText + '</span>' +
      '</div>' +
      '<div style="font-size:14.5px; margin-bottom:12px; color:var(--text);">' + q.q + '</div>' +
      '<div style="margin-bottom:12px;">' + optsHtml + '</div>' +
      '<div class="review-exp">' +
        '<strong>Pembahasan:</strong> ' + (q.exp || 'Tidak ada pembahasan khusus.') +
        (q.src ? '<div style="font-size:11.5px; color:var(--text3); margin-top:4px;">Sumber: ' + q.src + '</div>' : '') +
      '</div>';

    container.appendChild(div);
  });
}

function restartExam() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function handleKeyNav(e) {
  if (isSubmitted) return;
  if (['1','2','3','4','5'].includes(e.key)) {
    const idx = parseInt(e.key) - 1;
    if (idx < questions[curIdx].o.length) selectOption(idx);
  } else if (['a','b','c','d','e'].includes(e.key.toLowerCase())) {
    const idx = e.key.toLowerCase().charCodeAt(0) - 97;
    if (idx < questions[curIdx].o.length) selectOption(idx);
  } else if (e.key === 'ArrowRight') {
    navQ(1);
  } else if (e.key === 'ArrowLeft') {
    navQ(-1);
  }
}

function saveState() {
  const state = { userAnswers, flagged, curIdx, secondsElapsed };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = JSON.parse(saved);
      userAnswers = state.userAnswers || {};
      flagged = state.flagged || {};
      curIdx = state.curIdx || 0;
      secondsElapsed = state.secondsElapsed || 0;
    } catch(e) {}
  }
}

window.onload = init;
</script>
</body>
</html>`;
}

const cbtList = [
  { file: '1.3 CBT 1_1. Organisasi dan Embriologi SSP dan SST.html', title: 'CBT: Organisasi & Embriologi SSP/SST', topic: 'Embriologi & Organisasi Saraf' },
  { file: '1.3 CBT 1_2. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) .html', title: 'CBT: Serebrum & Batang Otak', topic: 'Neuroanatomi Cerebrum & Truncus' },
  { file: '1.3 CBT 1_3. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) II.html', title: 'CBT: Serebelum & SST II', topic: 'Neuroanatomi Serebelum & SST' },
  { file: '1.3 CBT 1_4. Cerebellum Et Medulla Spinalis.html', title: 'CBT: Serebelum & Medulla Spinalis', topic: 'Neuroanatomi Cerebellum & Medulla Spinalis' },
  { file: '1.3 CBT 1_5. Vascularisasi Pars Centralis Systema Nervosum Central.html', title: 'CBT: Vaskularisasi SSP (Sirkulus Willisi)', topic: 'Vaskularisasi Otak & SSP' },
  { file: '1.3 CBT 1_6. Pars Peripherica Systema Nervosum Periphericum.html', title: 'CBT: Sistem Saraf Tepi (SST)', topic: 'Saraf Kranial & Spinal' },
  { file: '1.3 CBT 1_7. Struktur Mikroskopis Sistem Saraf Pusat dan Sistem Saraf Tepi.html', title: 'CBT: Histologi SSP & SST', topic: 'Histologi Neuron & Glia' },
  { file: '1.3 CBT 1_8. Biokimiawi Sistem Saraf.html', title: 'CBT: Biokimiawi Sistem Saraf & Neurotransmiter', topic: 'Biokimia Neurotransmiter' },
  { file: '1.3 CBT 1_9. Fungsi Sistem Saraf.html', title: 'CBT: Fisiologi & Fungsi Sistem Saraf', topic: 'Fisiologi Saraf Sensorik-Motorik' },
  { file: '1.3 CBT 1_10. Fungsi Medulla Spinalis dan Saraf Spinal.html', title: 'CBT: Fungsi Medulla Spinalis & Saraf Spinal', topic: 'Fisiologi Medulla Spinalis' },
  { file: '1.3 CBT 1_11. Fungsi Integratif.html', title: 'CBT: Fungsi Integratif & Memori Otak', topic: 'Fungsi Korteks & Integrasi' },
  { file: '1.3 CBT 1_12. Fungsi Sistem Saraf Otonom.html', title: 'CBT: Sistem Saraf Otonom (Simpatis & Parasimpatis)', topic: 'Fisiologi Saraf Otonom' },
  { file: '1.3 CBT 1_merah.html', title: 'CBT: Merah Edition Blok 1.3', topic: 'Evaluasi Komprehensif Seri Merah' },
  { file: '1.3 CBT 2_ORANGE.html', title: 'CBT: Orange Edition Blok 1.3', topic: 'Evaluasi Komprehensif Seri Orange' },
  { file: '1.3 CBT 2_VIOLET.html', title: 'CBT: Violet Edition Blok 1.3', topic: 'Evaluasi Komprehensif Seri Violet' },
  { file: '1.3 CBT 2_emerald.html', title: 'CBT: Emerald Edition Blok 1.3', topic: 'Evaluasi Komprehensif Seri Emerald' },
  { file: '1.3 other_PUSH UP 1.html', title: 'CBT: Push Up 1 Blok 1.3', topic: 'Latihan Push Up 1' },
  { file: '1.3 other_PUSH UP 2.html', title: 'CBT: Push Up 2 Blok 1.3', topic: 'Latihan Push Up 2' }
];

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.3');

cbtList.forEach(item => {
  const filePath = path.join(dir, item.file);
  const content = fs.readFileSync(filePath, 'utf8');

  const m = content.match(/const questions\s*=\s*(\[[\s\S]*?\]);/);
  if (m) {
    const raw = eval(m[1]);
    const normalized = raw.map((qObj, idx) => {
      const qText = qObj.q || qObj.question || 'Pertanyaan';
      const rawOpts = qObj.o || qObj.options || [];
      const opts = rawOpts.map(opt => typeof opt === 'string' ? opt : (opt.text || String(opt)));
      
      let ansIdx = -1;
      let rawAns = qObj.a !== undefined ? qObj.a : (qObj.correct !== undefined ? qObj.correct : qObj.answer);
      
      if (typeof rawAns === 'number') {
        ansIdx = rawAns;
      } else if (typeof rawAns === 'string') {
        ansIdx = opts.indexOf(rawAns);
        if (ansIdx === -1 && /^[A-E]$/i.test(rawAns.trim())) {
          ansIdx = rawAns.trim().toUpperCase().charCodeAt(0) - 65;
        }
      }

      if (ansIdx === -1) {
        // search if options had correct field
        const cIdx = rawOpts.findIndex(o => typeof o === 'object' && (o.correct === true || o.isCorrect === true));
        if (cIdx !== -1) ansIdx = cIdx;
        else ansIdx = 0;
      }

      let explanation = qObj.exp || qObj.explanation || qObj.pembahasan || '';
      if (qObj.explanations && typeof qObj.explanations === 'object') {
        explanation = Object.entries(qObj.explanations).map(([k, v]) => `${k}: ${v}`).join('<br>');
      }

      return {
        id: idx + 1,
        q: qText,
        o: opts,
        a: ansIdx,
        exp: explanation,
        src: 'Departemen Anatomi & Fisiologi FK UNSOED'
      };
    });

    const outputHtml = getCbtTemplate(item.title, '1.3', item.topic, JSON.stringify(normalized, null, 2));
    fs.writeFileSync(filePath, outputHtml, 'utf8');
    console.log(`Migrated ${item.file} -> ${normalized.length} questions`);
  } else {
    console.error(`Failed to find const questions in ${item.file}`);
  }
});
