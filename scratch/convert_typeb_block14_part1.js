import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.4');

function getTypeBTemplate({ title, subtitle, block, themeColor, themeBg, themeBorder, tabs, flashcards, questions, certSubtitle }) {
  const cardsJson = JSON.stringify(flashcards, null, 2);
  const questionsJson = JSON.stringify(questions, null, 2);

  const subTabsHtml = tabs.map((t, i) => 
    `<button class="stab${i === 0 ? ' active' : ''}" onclick="switchSub('sb-${t.id}', this)">${t.label}</button>`
  ).join('\n      ');

  const subPanelsHtml = tabs.map((t, i) => 
    `<div class="sub-panel${i === 0 ? ' active' : ''}" id="sb-${t.id}">
      <div class="ind-card">
        <div class="stripe" style="background:${themeColor};"></div>
        <h3>${t.title}</h3>
        ${t.content}
      </div>
    </div>`
  ).join('\n\n    ');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Blok ${block}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
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
  --theme: ${themeColor};
  --themebg: ${themeBg};
  --themeb: ${themeBorder};
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
  border-bottom: 1px solid var(--border);
  padding: 32px 20px 24px;
  text-align: center;
}
.eyebrow {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 2.5px;
  color: var(--text3);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.hdr h1 {
  font-family: 'Syne', sans-serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -1px;
  color: var(--text);
}
.hdr h1 span { color: var(--theme); }
.hdr p {
  color: var(--text2);
  max-width: 680px;
  margin: 10px auto 0;
  font-size: 14.5px;
}

.main-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 24px 0 0;
}
.mtab {
  font-family: 'Syne', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  padding: 10px 22px;
  border-radius: var(--rl);
  border: 1px solid var(--border);
  background: var(--bg2);
  color: var(--text2);
  cursor: pointer;
  transition: all .2s;
}
.mtab:hover { background: var(--bg3); color: var(--text); }
.mtab.active { background: var(--theme); color: #fff; border-color: var(--theme); }

.container { max-width: 1080px; margin: 0 auto; padding: 28px 20px 60px; }
.main-panel { display: none; }
.main-panel.active { display: block; }

/* Sub Tabs */
.sub-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.stab {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text2);
  cursor: pointer;
  white-space: nowrap;
  transition: all .15s;
}
.stab:hover { border-color: var(--text2); color: var(--text); }
.stab.active { background: var(--theme); color: #fff; border-color: var(--theme); }

.sub-panel { display: none; }
.sub-panel.active { display: block; }

/* Components */
.ind-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 22px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.02);
  position: relative;
  overflow: hidden;
}
.ind-card .stripe { position: absolute; top: 0; left: 0; bottom: 0; width: 5px; }
.ind-card h3 { font-family: 'Syne', sans-serif; font-size: 17px; margin-bottom: 10px; color: var(--text); }
.ind-card p, .ind-card ul { font-size: 14.5px; color: var(--text2); }
.ind-card ul { padding-left: 20px; margin-top: 8px; }
.ind-card li { margin-bottom: 6px; }

/* 3D Flashcard Deck */
.fc-section { margin: 32px 0 20px; text-align: center; }
.fc-deck-container {
  perspective: 1000px;
  max-width: 580px;
  height: 320px;
  margin: 0 auto 20px;
}
.fc-card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.fc-card.flipped { transform: rotateY(180deg); }
.fc-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: var(--rl);
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  border: 1px solid var(--border2);
  box-shadow: 0 8px 24px rgba(0,0,0,.04);
}
.fc-front { background: #ffffff; color: var(--text); }
.fc-back { background: var(--bg2); color: var(--text); transform: rotateY(180deg); border-color: var(--themeb); }
.fc-cat-badge {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--theme);
  background: var(--themebg);
  padding: 4px 12px;
  border-radius: 99px;
  margin-bottom: 16px;
  font-weight: 600;
}
.fc-front h3 { font-family: 'Syne', sans-serif; font-size: 22px; line-height: 1.35; }
.fc-back p { font-size: 15px; line-height: 1.65; color: var(--text2); white-space: pre-line; }
.fc-hint { font-size: 12px; color: var(--text3); margin-top: 14px; }
.fc-controls { display: flex; justify-content: center; align-items: center; gap: 16px; }
.fc-nav-btn {
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: var(--r);
  border: 1px solid var(--border);
  background: var(--bg2);
  color: var(--text);
  cursor: pointer;
  transition: all .2s;
}
.fc-nav-btn:hover { background: var(--bg3); }

/* Quiz Styles */
.qconfig {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 36px 28px;
  max-width: 620px;
  margin: 20px auto;
  text-align: center;
  box-shadow: 0 4px 18px rgba(0,0,0,.03);
}
.qconfig h2 { font-family: 'Syne', sans-serif; font-size: 24px; margin-bottom: 10px; }
.qconfig p { color: var(--text2); font-size: 14.5px; margin-bottom: 24px; }
.qcnt-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
.qcnt-btn {
  padding: 12px 8px;
  border-radius: var(--r);
  border: 1px solid var(--border);
  background: var(--bg2);
  font-family: 'DM Mono', monospace;
  font-weight: 600;
  color: var(--text2);
  cursor: pointer;
  transition: all .15s;
}
.qcnt-btn:hover, .qcnt-btn.active { background: var(--theme); color: #fff; border-color: var(--theme); }
.start-btn {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 32px;
  border-radius: var(--r);
  border: none;
  background: var(--theme);
  color: #fff;
  cursor: pointer;
  transition: all .2s;
}
.start-btn:hover { opacity: 0.9; }

.qcard {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--rl);
  padding: 28px;
  max-width: 760px;
  margin: 0 auto;
  box-shadow: 0 4px 16px rgba(0,0,0,.03);
}
.qheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.qnum-display { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--text3); }
.qnum-display strong { color: var(--text); font-size: 16px; }
.qscore-display { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--text3); }
.qscore-display strong { color: var(--green); font-size: 16px; }
.qtext { font-size: 16px; font-weight: 500; margin-bottom: 24px; color: var(--text); line-height: 1.6; }
.opts { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.opt {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--r);
  border: 1.5px solid var(--border2);
  background: var(--bg);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 14.5px;
  color: var(--text);
  transition: all .15s;
  text-align: left;
  width: 100%;
}
.opt:hover:not(:disabled) { background: var(--bg2); border-color: var(--text2); }
.opt.correct { background: var(--greenbg); border-color: var(--greenb); color: var(--green); font-weight: 600; }
.opt.wrong { background: var(--redbg); border-color: var(--redb); color: var(--red); font-weight: 600; }
.opt.reveal { background: var(--greenbg); border-color: var(--greenb); color: var(--green); opacity: 0.8; }
.opt-key {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--bg2);
  border: 1px solid var(--border2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.opt.correct .opt-key { background: var(--green); color: #fff; border-color: var(--green); }
.opt.wrong .opt-key { background: var(--red); color: #fff; border-color: var(--red); }
.opt.reveal .opt-key { background: var(--green); color: #fff; border-color: var(--green); }

.expbox {
  background: var(--bg2);
  border-left: 4px solid var(--theme);
  padding: 14px 18px;
  border-radius: 0 var(--r) var(--r) 0;
  margin-bottom: 20px;
  font-size: 14px;
  display: none;
}
.expbox.show { display: block; }
.actrow { display: flex; justify-content: flex-end; }
.next-btn {
  font-family: 'Syne', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: var(--r);
  border: none;
  background: var(--text);
  color: #fff;
  cursor: pointer;
  display: none;
}
.next-btn:hover { background: var(--theme); }

.results-wrap { text-align: center; padding: 20px 0; }
.res-big { font-family: 'Syne', sans-serif; font-size: 64px; font-weight: 800; color: var(--text); line-height: 1; }
.res-sub { font-family: 'DM Mono', monospace; font-size: 13.5px; color: var(--text3); margin: 8px 0 24px; }
.res-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 28px; }
.res-stat { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; }
.res-stat .rv { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 700; }
.res-stat .rl { font-size: 11px; color: var(--text3); margin-top: 2px; }
</style>
</head>
<body>

<header class="hdr">
  <div class="eyebrow">${certSubtitle} · Blok ${block} · FK UNSOED</div>
  <h1>${title}</h1>
  <p>${subtitle}</p>
  
  <div class="main-tabs">
    <button class="mtab active" onclick="switchMain('handbook', this)">📋 Buku Panduan Materi</button>
    <button class="mtab" onclick="switchMain('flashcards', this)">🎴 Flashcard 3D Deck (${flashcards.length})</button>
    <button class="mtab" onclick="switchMain('quiz', this)">🎯 Evaluasi Interaktif (${questions.length})</button>
  </div>
</header>

<div class="container">

  <!-- TAB 1: HANDBOOK -->
  <div class="main-panel active" id="p-handbook">
    <div class="sub-tabs">
      ${subTabsHtml}
    </div>

    ${subPanelsHtml}
  </div>

  <!-- TAB 2: FLASHCARDS 3D -->
  <div class="main-panel" id="p-flashcards">
    <div class="fc-section">
      <div class="fc-deck-container">
        <div class="fc-card" id="main-fc" onclick="flipCard()">
          <div class="fc-face fc-front">
            <span class="fc-cat-badge" id="fc-cat">FLASHCARD</span>
            <h3 id="fc-front-text">Pertanyaan Flashcard</h3>
            <span class="fc-hint">👆 Klik kartu untuk membalik</span>
          </div>
          <div class="fc-face fc-back">
            <span class="fc-cat-badge" id="fc-cat-back">PENJELASAN</span>
            <p id="fc-back-text">Jawaban dan penjelasan detail.</p>
            <span class="fc-hint">👆 Klik kartu untuk kembali</span>
          </div>
        </div>
      </div>

      <div class="fc-controls">
        <button class="fc-nav-btn" onclick="navCard(-1)">‹ Sebelumnya</button>
        <span style="font-family:'DM Mono',monospace; font-size:13px; color:var(--text3);" id="fc-counter">1 / ${flashcards.length}</span>
        <button class="fc-nav-btn" onclick="navCard(1)">Berikutnya ›</button>
        <button class="fc-nav-btn" style="background:var(--themebg); color:var(--theme); border-color:var(--themeb);" onclick="shuffleCards()">Acak 🔀</button>
      </div>
    </div>
  </div>

  <!-- TAB 3: QUIZ EVALUASI -->
  <div class="main-panel" id="p-quiz">
    <div class="qconfig" id="qconfig">
      <h2>Evaluasi Kasus &amp; Penguasaan Konsep</h2>
      <p>Pilih jumlah butir soal latihan evaluasi:</p>
      
      <div class="qcnt-grid">
        <button class="qcnt-btn" onclick="setQCount(10, this)">10 Soal</button>
        <button class="qcnt-btn active" onclick="setQCount(20, this)">20 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(30, this)">30 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(${questions.length}, this)">Semua (${questions.length})</button>
      </div>

      <button class="start-btn" onclick="startQuiz()">Mulai Sesi Evaluasi ›</button>
    </div>

    <div class="qcard" id="qactive" style="display:none;">
      <div class="qheader">
        <div class="qnum-display">Soal <strong id="qnum">1</strong> dari <span id="qtotal">20</span></div>
        <div class="qscore-display">Skor: <strong id="qscore">0</strong></div>
      </div>

      <div class="qtext" id="qtext">Memuat pertanyaan...</div>
      <div class="opts" id="opts"></div>

      <div class="expbox" id="expbox">
        <div id="exp-text"></div>
      </div>

      <div class="actrow">
        <button class="next-btn" id="nextbtn" onclick="nextQ()">Soal Berikutnya ›</button>
      </div>
    </div>

    <div class="qcard results-wrap" id="qresults" style="display:none;">
      <div class="res-big" id="res-pct">0%</div>
      <div class="res-sub" id="res-sub">0 dari 20 soal dijawab dengan benar</div>

      <div class="res-grid" id="res-grid"></div>

      <div style="display:flex; justify-content:center; gap:10px;">
        <button class="start-btn" onclick="restartQuiz()">Ulangi Latihan ↺</button>
        <button class="start-btn" style="background:var(--blue);" onclick="downloadCert()">Unduh Sertifikat SVG 📜</button>
      </div>
    </div>
  </div>

</div>

<script>
function switchMain(tabId, btn) {
  document.querySelectorAll('.mtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.main-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('p-' + tabId).classList.add('active');
}

function switchSub(subId, btn) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(subId).classList.add('active');
}

const flashcardsData = ${cardsJson};
const quizPool = ${questionsJson};

let curCards = [...flashcardsData];
let curCardIdx = 0;

function updateCard() {
  const card = curCards[curCardIdx];
  document.getElementById('fc-front-text').textContent = card.front || card.q;
  document.getElementById('fc-back-text').textContent = card.back || card.a;
  document.getElementById('fc-counter').textContent = (curCardIdx + 1) + ' / ' + curCards.length;
  document.getElementById('main-fc').classList.remove('flipped');
}

function flipCard() {
  document.getElementById('main-fc').classList.toggle('flipped');
}

function navCard(delta) {
  curCardIdx = (curCardIdx + delta + curCards.length) % curCards.length;
  updateCard();
}

function shuffleCards() {
  curCards.sort(() => Math.random() - 0.5);
  curCardIdx = 0;
  updateCard();
}

let quizSet = [];
let qCount = 20;
let curQIdx = 0;
let qScore = 0;
const KEYS = ['A', 'B', 'C', 'D', 'E'];

function setQCount(cnt, btn) {
  document.querySelectorAll('.qcnt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  qCount = cnt;
}

function startQuiz() {
  let pool = [...quizPool];
  pool.sort(() => Math.random() - 0.5);
  quizSet = pool.slice(0, Math.min(qCount, pool.length));

  curQIdx = 0;
  qScore = 0;

  document.getElementById('qconfig').style.display = 'none';
  document.getElementById('qresults').style.display = 'none';
  document.getElementById('qactive').style.display = 'block';
  document.getElementById('qtotal').textContent = quizSet.length;

  renderQuizQ();
}

function renderQuizQ() {
  const q = quizSet[curQIdx];
  document.getElementById('qnum').textContent = curQIdx + 1;
  document.getElementById('qscore').textContent = qScore;
  document.getElementById('qtext').textContent = q.q;

  const optsContainer = document.getElementById('opts');
  optsContainer.innerHTML = '';

  q.o.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = '<span class="opt-key">' + KEYS[i] + '</span><span>' + optText + '</span>';
    btn.onclick = () => selectQuizAns(i, q, btn);
    optsContainer.appendChild(btn);
  });

  document.getElementById('expbox').classList.remove('show');
  document.getElementById('nextbtn').style.display = 'none';
}

function selectQuizAns(chosenIdx, q, clickedBtn) {
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
  const correct = chosenIdx === q.a;
  if (correct) qScore++;

  document.querySelectorAll('.opt').forEach((b, i) => {
    if (i === q.a) {
      if (b === clickedBtn && correct) b.classList.add('correct');
      else if (b !== clickedBtn) b.classList.add('reveal');
      else b.classList.add('correct');
    }
    if (b === clickedBtn && !correct) b.classList.add('wrong');
  });

  const expBox = document.getElementById('expbox');
  document.getElementById('exp-text').innerHTML = '<strong>' + (correct ? '✅ Benar!' : '❌ Kurang Tepat.') + '</strong> ' + (q.exp || ('Kunci Jawaban: ' + q.o[q.a]));
  expBox.classList.add('show');

  document.getElementById('qscore').textContent = qScore;

  const nextBtn = document.getElementById('nextbtn');
  nextBtn.textContent = curQIdx === quizSet.length - 1 ? 'Lihat Hasil Akhir ›' : 'Soal Berikutnya ›';
  nextBtn.style.display = 'inline-block';
}

function nextQ() {
  if (curQIdx < quizSet.length - 1) {
    curQIdx++;
    renderQuizQ();
  } else {
    showQuizResults();
  }
}

function showQuizResults() {
  document.getElementById('qactive').style.display = 'none';
  document.getElementById('qresults').style.display = 'block';

  const total = quizSet.length;
  const pct = Math.round((qScore / total) * 100);

  document.getElementById('res-pct').textContent = pct + '%';
  document.getElementById('res-sub').textContent = qScore + ' dari ' + total + ' butir evaluasi dijawab dengan benar';

  const medal = pct >= 80 ? '🏆 Lulus Sangat Baik' : pct >= 65 ? '👍 Lulus Standar' : '📚 Perlu Belajar Lagi';
  const grid = document.getElementById('res-grid');
  grid.innerHTML = 
    '<div class="res-stat"><div class="rv">' + medal + '</div><div class="rl">Predikat</div></div>' +
    '<div class="res-stat"><div class="rv">' + pct + '%</div><div class="rl">Persentase</div></div>' +
    '<div class="res-stat"><div class="rv" style="color:var(--green);">' + qScore + '</div><div class="rl">Benar</div></div>' +
    '<div class="res-stat"><div class="rv" style="color:var(--red);">' + (total - qScore) + '</div><div class="rl">Salah</div></div>';
}

function restartQuiz() {
  document.getElementById('qresults').style.display = 'none';
  document.getElementById('qconfig').style.display = 'block';
}

function downloadCert() {
  const total = quizSet.length || qCount;
  const pct = Math.round((qScore / total) * 100);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const medal = pct >= 80 ? 'LULUS DENGAN PUJIAN' : pct >= 65 ? 'LULUS STANDAR' : 'PERLU BELAJAR LAGI';
  const medalColor = pct >= 80 ? '#1f7a4a' : pct >= 65 ? '#7a6010' : '#b03030';

  const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="680" height="520" font-family="Georgia,serif">
  <defs>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e0ddd5" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="680" height="520" fill="#fdfdf9"/>
  <rect width="680" height="520" fill="url(#grid)"/>
  <rect x="20" y="20" width="640" height="480" rx="12" fill="none" stroke="${themeColor}" stroke-width="2"/>
  <rect x="26" y="26" width="628" height="468" rx="9" fill="none" stroke="${themeColor}" stroke-width="0.5" opacity="0.4"/>

  <text x="340" y="66" text-anchor="middle" font-size="11" letter-spacing="4" fill="#7c85a8" font-family="Georgia,serif">SERTIFIKAT KELULUSAN STUDY HUB</text>
  <line x1="120" y1="74" x2="260" y2="74" stroke="${themeColor}" stroke-width="0.8"/>
  <circle cx="340" cy="74" r="3" fill="${themeColor}"/>
  <line x1="420" y1="74" x2="560" y2="74" stroke="${themeColor}" stroke-width="0.8"/>

  <text x="340" y="116" text-anchor="middle" font-size="28" font-weight="bold" fill="#161b2e" font-family="Georgia,serif">${title}</text>
  <text x="340" y="138" text-anchor="middle" font-size="11" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">${certSubtitle} · BLOK ${block} · FK UNSOED</text>

  <line x1="100" y1="152" x2="580" y2="152" stroke="#e0ddd5" stroke-width="1"/>
  <text x="340" y="185" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">Telah menyelesaikan evaluasi pembelajaran dengan capaian</text>

  <rect x="230" y="196" width="220" height="80" rx="8" fill="none" stroke="\${medalColor}" stroke-width="1.5"/>
  <text x="340" y="245" text-anchor="middle" font-size="52" font-weight="bold" fill="\${medalColor}" font-family="Georgia,serif">\${pct}%</text>
  <text x="340" y="265" text-anchor="middle" font-size="10" fill="\${medalColor}" letter-spacing="3" font-family="Georgia,serif">\${medal}</text>

  <text x="340" y="305" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">\${qScore} soal benar dari \${total} butir evaluasi · \${dateStr}</text>
  <line x1="100" y1="320" x2="580" y2="320" stroke="#e0ddd5" stroke-width="1"/>

  <text x="340" y="360" text-anchor="middle" font-size="12" fill="#5A5650" font-family="Georgia,serif">Terverifikasi pada Modul Pembelajaran Terpadu FK UNSOED</text>
  <text x="340" y="470" text-anchor="middle" font-size="10" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">MR. CAPSULES STUDY ENGINE 2.5</text>
</svg>\`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-' + pct + 'pct.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.onload = function() {
  updateCard();
};
</script>
</body>
</html>`;
}

// 1. Convert 1.4 CBT_Anatomi Lecture.html
{
  const file = '1.4 CBT_Anatomi Lecture.html';
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const mFc = content.match(/const flashcardsData\s*=\s*(\[[\s\S]*?\]);/);
  const mQ = content.match(/const questionsData\s*=\s*(\[[\s\S]*?\]);/);
  const fc = mFc ? eval(mFc[1]) : [];
  const rawQ = mQ ? eval(mQ[1]) : [];
  const qList = rawQ.map((q, idx) => ({
    id: idx + 1,
    q: q.q,
    o: q.options,
    a: q.correct !== undefined ? q.correct : 0,
    exp: q.exp || ''
  }));

  const html = getTypeBTemplate({
    title: 'Anatomi Visual: Otot & Osteo-Arthro',
    subtitle: 'Handbook interaktif anatomi muskuloskeletal: kompartemen otot ekstremitas, vaskularisasi & persarafan, serta klasifikasi sendi.',
    block: '1.4',
    themeColor: '#b03030',
    themeBg: 'rgba(176,48,48,.08)',
    themeBorder: 'rgba(176,48,48,.25)',
    certSubtitle: 'ANATOMI MUSKULOSKELETAL',
    tabs: [
      {
        id: 'otot',
        label: 'Kompartemen Otot',
        title: 'Organisasi Jaringan Otot & Fascia',
        content: '<p>Otot rangka dibungkus oleh tiga lapis jaringan ikat: <strong>Epimisium</strong> (membungkus seluruh otot), <strong>Perimisium</strong> (membungkus fasikulus), dan <strong>Endomisium</strong> (membungkus tiap serat otot individual). Unit fungsional terkecil dari kontraksi adalah <strong>sarkomer</strong>.</p>'
      },
      {
        id: 'sendi',
        label: 'Klasifikasi Sendi',
        title: 'Artikulasi & Klasifikasi Sendi',
        content: '<ul><li><strong>Sinartrosis:</strong> Sendi mati tidak dapat digerakkan (e.g., Sutura cranii).</li><li><strong>Amfiartrosis:</strong> Sendi dengan pergerakan terbatas (e.g., Simfisis pubis, diskus intervertebralis).</li><li><strong>Diartrosis (Sendi Sinovial):</strong> Sendi bebas bergerak dilengkapi cairan sinovial dan kapsul sendi (e.g., Sendi peluru/glenohumeral, sendi engsel/humeroulnar).</li></ul>'
      }
    ],
    flashcards: fc,
    questions: qList
  });

  fs.writeFileSync(path.join(dir, file), html, 'utf8');
  console.log(`Migrated ${file} -> Type B Study Hub (${fc.length} cards, ${qList.length} questions)`);
}

// 2. Convert 1.4 CBT_Biokim Lecture.html
{
  const file = '1.4 CBT_Biokim Lecture.html';
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const mFc = content.match(/const flashcards\s*=\s*(\[[\s\S]*?\]);/);
  const mQ = content.match(/const questions\s*=\s*(\[[\s\S]*?\]);/);
  const fc = mFc ? eval(mFc[1]) : [];
  const rawQ = mQ ? eval(mQ[1]) : [];
  const qList = rawQ.map((q, idx) => ({
    id: idx + 1,
    q: q.q,
    o: q.options,
    a: q.correct !== undefined ? q.correct : 0,
    exp: q.exp || ''
  }));

  const html = getTypeBTemplate({
    title: 'Biokimia Master: Integumen, Tulang, & Otot',
    subtitle: 'Handbook metabolisme kalsium, fosfat, biosintesis keratin & kolagen, serta bioenergetika kontraksi otot.',
    block: '1.4',
    themeColor: '#7a6010',
    themeBg: 'rgba(122,96,16,.09)',
    themeBorder: 'rgba(122,96,16,.28)',
    certSubtitle: 'BIOKIMIA MUSKULOSKELETAL',
    tabs: [
      {
        id: 'mineral',
        label: 'Kalsium & Fosfat',
        title: 'Homeostasis Kalsium & Fosfat',
        content: '<ul><li><strong>Parathyroid Hormone (PTH):</strong> Meningkatkan kadar kalsium darah melalui resorpsi tulang, reabsorpsi di tubulus ginjal, dan aktivasi 1-alpha-hidroksilase vitamin D.</li><li><strong>Kalsitonin:</strong> Menurunkan kalsium darah dengan menghambat aktivitas osteoklas.</li><li><strong>Vitamin D Aktif (Kalsitriol):</strong> Meningkatkan absorpsi kalsium dan fosfat di usus halus.</li></ul>'
      },
      {
        id: 'protein',
        label: 'Protein Struktural',
        title: 'Kolagen & Keratin',
        content: '<p>Kolagen adalah protein triple heliks yang kaya akan asam amino glisin, prolin, dan hidroksiprolin (membutuhkan vitamin C untuk hidroksilasi). Keratin adalah protein kaya jembatan disulfida sistein yang menyusun epidermis, rambut, dan kuku.</p>'
      }
    ],
    flashcards: fc,
    questions: qList
  });

  fs.writeFileSync(path.join(dir, file), html, 'utf8');
  console.log(`Migrated ${file} -> Type B Study Hub (${fc.length} cards, ${qList.length} questions)`);
}

// 3. Convert 1.4 CBT_Fisiologi Lecture.html
{
  const file = '1.4 CBT_Fisiologi Lecture.html';
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const mFc = content.match(/const flashcardsData\s*=\s*(\[[\s\S]*?\]);/);
  const mQ = content.match(/const questionsData\s*=\s*(\[[\s\S]*?\]);/);
  const fc = mFc ? eval(mFc[1]) : [];
  const rawQ = mQ ? eval(mQ[1]) : [];
  const qList = rawQ.map((q, idx) => ({
    id: idx + 1,
    q: q.q,
    o: q.options,
    a: q.correct !== undefined ? q.correct : 0,
    exp: q.explanation || q.exp || ''
  }));

  const html = getTypeBTemplate({
    title: 'Fisiologi Master: Muskuloskeletal & Integumen',
    subtitle: 'Handbook mekanisme kontraksi sliding filament, potensial aksi neuromuskular, dan termoregulasi kulit.',
    block: '1.4',
    themeColor: '#1a4faa',
    themeBg: 'rgba(26,79,170,.09)',
    themeBorder: 'rgba(26,79,170,.28)',
    certSubtitle: 'FISIOLOGI MUSKULOSKELETAL',
    tabs: [
      {
        id: 'sliding',
        label: 'Mekanisme Kontraksi',
        title: 'Teori Pergeseran Filamen (Sliding Filament Theory)',
        content: '<p>Ion $Ca^{2+}$ dilepaskan dari retikulum sarkoplasma berikatan dengan <strong>Troponin C</strong>, menggeser tropomiosin dan mengekspos binding site aktin. Kepala miosin berikatan dengan aktin membentuk cross-bridge, melakukan power stroke dengan hidrolisis ATP.</p>'
      },
      {
        id: 'kulit',
        label: 'Termoregulasi Kulit',
        title: 'Respon Suhu & Termoregulasi Integumen',
        content: '<ul><li><strong>Suhu Panas:</strong> Vasodilatasi pembuluh darah kulit dan peningkatan produksi keringat oleh kelenjar ekrin.</li><li><strong>Suhu Dingin:</strong> Vasokonstriksi pembuluh darah kutaneus, piloereksi (m. arrector pili), dan kontraksi ritmis otot rangka (menggigil/shivering).</li></ul>'
      }
    ],
    flashcards: fc,
    questions: qList
  });

  fs.writeFileSync(path.join(dir, file), html, 'utf8');
  console.log(`Migrated ${file} -> Type B Study Hub (${fc.length} cards, ${qList.length} questions)`);
}
