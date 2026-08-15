import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'content', 'semester 1', '1.2', '1.2 Ident PK_Latsol PK.html');
const content = fs.readFileSync(filePath, 'utf8');

// Extract the questions array from the original file
const m = content.match(/const quizData\s*=\s*(\[[\s\S]*?\]);/);
let rawQuestions = [];
if (m) {
  rawQuestions = eval(m[1]);
}
console.log('Extracted ' + rawQuestions.length + ' questions from 1.2 Ident PK_Latsol PK.html');

const questionsJson = JSON.stringify(rawQuestions, null, 2);

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clinical Case &amp; Latsol Patologi Klinik — Blok 1.2</title>
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
.hdr h1 span { color: var(--blue); }
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
.mtab.active { background: var(--blue); color: #fff; border-color: var(--blue); }

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
.stab.active { background: var(--blue); color: #fff; border-color: var(--blue); }

.sub-panel { display: none; }
.sub-panel.active { display: block; }

/* Components */
.note {
  border-left: 4px solid;
  padding: 14px 18px;
  border-radius: 0 var(--r) var(--r) 0;
  margin: 16px 0;
  font-size: 14px;
  line-height: 1.6;
}
.note.blue { border-color: var(--blue); background: var(--bluebg); color: var(--text); }
.note.green { border-color: var(--green); background: var(--greenbg); color: var(--text); }
.note.red { border-color: var(--red); background: var(--redbg); color: var(--text); }
.note.gold { border-color: var(--gold); background: var(--goldbg); color: var(--text); }
.note.purp { border-color: var(--purp); background: var(--purpbg); color: var(--text); }

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

.dtable-wrap { overflow-x: auto; margin: 20px 0; border: 1px solid var(--border); border-radius: var(--r); background: #fff; }
.dtable { width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; }
.dtable th { background: var(--bg2); padding: 12px 16px; font-family: 'DM Mono', monospace; font-weight: 500; color: var(--text2); border-bottom: 1px solid var(--border); }
.dtable td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text); }
.dtable tr:last-child td { border-bottom: none; }

.formula {
  background: var(--bg2);
  border: 1px dashed var(--border2);
  border-radius: var(--r);
  padding: 16px;
  margin: 16px 0;
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  color: var(--purp);
  text-align: center;
  font-weight: 500;
}

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
.qcnt-btn:hover, .qcnt-btn.active { background: var(--blue); color: #fff; border-color: var(--blue); }
.start-btn {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 32px;
  border-radius: var(--r);
  border: none;
  background: var(--blue);
  color: #fff;
  cursor: pointer;
  transition: all .2s;
}
.start-btn:hover { background: #133a80; }

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
  border-left: 4px solid var(--blue);
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
.next-btn:hover { background: var(--blue); }

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
  <div class="eyebrow">Patologi Klinik · Blok 1.2 · FK UNSOED</div>
  <h1>Clinical Case &amp; <span>Latsol Hub</span></h1>
  <p>Pusat latihan soal terstruktur dan bedah kasus patologi klinik: hematologi dasar, prosedur laboratorium, dan interpretasi klinis.</p>
  
  <div class="main-tabs">
    <button class="mtab active" onclick="switchMain('handbook', this)">📋 Ringkasan Rumus &amp; Kunci Klinis</button>
    <button class="mtab" onclick="switchMain('quiz', this)">🎯 Evaluasi Soal (90 Kasus)</button>
  </div>
</header>

<div class="container">

  <!-- TAB 1: HANDBOOK -->
  <div class="main-panel active" id="p-handbook">
    <div class="sub-tabs">
      <button class="stab active" onclick="switchSub('sb-rumus', this)">Rumus Laboratorium</button>
      <button class="stab" onclick="switchSub('sb-kunci', this)">Kunci Interpretasi Klinis</button>
    </div>

    <div class="sub-panel active" id="sb-rumus">
      <div class="ind-card">
        <div class="stripe" style="background:var(--blue);"></div>
        <h3>Rumus Esensial Laboratorium Hematologi</h3>
        <ul>
          <li><strong>Hitung Leukosit Manual:</strong> $\text{Leukosit}/\text{mm}^3 = \frac{\text{Jumlah Sel di 4 Kotak Besar}}{4} \times 10 \times 20 = \text{Jumlah Sel} \times 50$</li>
          <li><strong>Hitung Eritrosit Manual:</strong> $\text{Eritrosit}/\text{mm}^3 = \frac{\text{Jumlah Sel di 80 Kotak Kecil}}{80} \times 400 \times 10 \times 200 = \text{Jumlah Sel} \times 10.000$</li>
          <li><strong>Mean Corpuscular Volume (MCV):</strong> $\text{MCV} = \frac{\text{Hematokrit (\%)}}{\text{Jumlah Eritrosit (juta)}} \times 10 \quad (\text{Normal: } 73,4 - 91,0\text{ fL})$</li>
          <li><strong>Mean Corpuscular Hemoglobin (MCH):</strong> $\text{MCH} = \frac{\text{Hemoglobin (g/dL)}}{\text{Jumlah Eritrosit (juta)}} \times 10 \quad (\text{Normal: } 24,2 - 31,2\text{ pg})$</li>
          <li><strong>Mean Corpuscular Hb Concentration (MCHC):</strong> $\text{MCHC} = \frac{\text{Hemoglobin (g/dL)}}{\text{Hematokrit (\%)}} \times 100 \quad (\text{Normal: } 31,9 - 36,0\text{ \%})$</li>
        </ul>
      </div>
    </div>

    <div class="sub-panel" id="sb-kunci">
      <div class="ind-card">
        <div class="stripe" style="background:var(--green);"></div>
        <h3>Kunci Diagnostik Penting</h3>
        <ul>
          <li><strong>Anemia Mikrositik Hipokromik:</strong> MCV &lt; 73 fL, MCH &lt; 24 pg (e.g., Anemia Defisiensi Besi, Talasemia).</li>
          <li><strong>Anemia Makrositik:</strong> MCV &gt; 92 fL (e.g., Defisiensi Asam Folat / Vitamin B12).</li>
          <li><strong>Uji Rumple Leede Positif:</strong> Timbul &ge; 10 petekie (menandakan kerapuhan dinding vaskular kapiler atau trombositopenia).</li>
          <li><strong>Leukositosis Shift to the Left:</strong> Peningkatan persentase neutrofil batang (&gt; 5%) menandakan respon infeksi bakteri akut hebat.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- TAB 2: QUIZ EVALUASI -->
  <div class="main-panel" id="p-quiz">
    <div class="qconfig" id="qconfig">
      <h2>Simulasi &amp; Latihan Soal Kasus PK</h2>
      <p>Bank data memuat 90 butir soal kasus patologi klinik terkurasi. Pilih jumlah soal latihan:</p>
      
      <div class="qcnt-grid">
        <button class="qcnt-btn" onclick="setQCount(15, this)">15 Soal</button>
        <button class="qcnt-btn active" onclick="setQCount(30, this)">30 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(45, this)">45 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(90, this)">Semua (90)</button>
      </div>

      <button class="start-btn" onclick="startQuiz()">Mulai Latihan Soal ›</button>
    </div>

    <div class="qcard" id="qactive" style="display:none;">
      <div class="qheader">
        <div class="qnum-display">Soal <strong id="qnum">1</strong> dari <span id="qtotal">30</span></div>
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
      <div class="res-sub" id="res-sub">0 dari 30 soal dijawab dengan benar</div>

      <div class="res-grid" id="res-grid"></div>

      <div style="display:flex; justify-content:center; gap:10px;">
        <button class="start-btn" onclick="restartQuiz()">Ulangi Latihan ↺</button>
        <button class="start-btn" style="background:var(--green);" onclick="downloadCert()">Unduh Sertifikat SVG 📜</button>
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

const masterQuestions = ${questionsJson};

let quizSet = [];
let qCount = 30;
let curQIdx = 0;
let qScore = 0;
const KEYS = ['A', 'B', 'C', 'D', 'E'];

function setQCount(cnt, btn) {
  document.querySelectorAll('.qcnt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  qCount = cnt;
}

function startQuiz() {
  let pool = [...masterQuestions];
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
  document.getElementById('qtext').textContent = q.question;

  const optsContainer = document.getElementById('opts');
  optsContainer.innerHTML = '';

  q.options.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = '<span class="opt-key">' + KEYS[i] + '</span><span>' + optText + '</span>';
    btn.onclick = () => selectQuizAns(optText, q, btn);
    optsContainer.appendChild(btn);
  });

  document.getElementById('expbox').classList.remove('show');
  document.getElementById('nextbtn').style.display = 'none';
}

function selectQuizAns(chosen, q, clickedBtn) {
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
  const correct = chosen.trim() === q.answer.trim();
  if (correct) qScore++;

  document.querySelectorAll('.opt').forEach(b => {
    const text = b.querySelector('span:last-child').textContent.trim();
    if (text === q.answer.trim()) {
      if (b === clickedBtn && correct) b.classList.add('correct');
      else if (b !== clickedBtn) b.classList.add('reveal');
      else b.classList.add('correct');
    }
    if (b === clickedBtn && !correct) b.classList.add('wrong');
  });

  const expBox = document.getElementById('expbox');
  document.getElementById('exp-text').innerHTML = '<strong>' + (correct ? '✅ Benar!' : '❌ Kurang Tepat.') + '</strong> Kunci Jawaban: ' + q.answer;
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
  document.getElementById('res-sub').textContent = qScore + ' dari ' + total + ' soal dijawab dengan benar';

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
  <rect x="20" y="20" width="640" height="480" rx="12" fill="none" stroke="#1a4faa" stroke-width="2"/>
  <rect x="26" y="26" width="628" height="468" rx="9" fill="none" stroke="#1a4faa" stroke-width="0.5" opacity="0.4"/>

  <text x="340" y="66" text-anchor="middle" font-size="11" letter-spacing="4" fill="#7c85a8" font-family="Georgia,serif">SERTIFIKAT KELULUSAN LATSOL PK</text>
  <line x1="120" y1="74" x2="260" y2="74" stroke="#1a4faa" stroke-width="0.8"/>
  <circle cx="340" cy="74" r="3" fill="#1a4faa"/>
  <line x1="420" y1="74" x2="560" y2="74" stroke="#1a4faa" stroke-width="0.8"/>

  <text x="340" y="116" text-anchor="middle" font-size="28" font-weight="bold" fill="#161b2e" font-family="Georgia,serif">Latihan Soal Patologi Klinik</text>
  <text x="340" y="138" text-anchor="middle" font-size="11" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">KASUS &amp; DIAGNOSTIK · BLOK 1.2 · FK UNSOED</text>

  <line x1="100" y1="152" x2="580" y2="152" stroke="#e0ddd5" stroke-width="1"/>
  <text x="340" y="185" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">Telah menyelesaikan evaluasi kasus patologi klinik dengan hasil</text>

  <rect x="230" y="196" width="220" height="80" rx="8" fill="none" stroke="\${medalColor}" stroke-width="1.5"/>
  <text x="340" y="245" text-anchor="middle" font-size="52" font-weight="bold" fill="\${medalColor}" font-family="Georgia,serif">\${pct}%</text>
  <text x="340" y="265" text-anchor="middle" font-size="10" fill="\${medalColor}" letter-spacing="3" font-family="Georgia,serif">\${medal}</text>

  <text x="340" y="305" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">\${qScore} soal benar dari \${total} butir soal · \${dateStr}</text>
  <line x1="100" y1="320" x2="580" y2="320" stroke="#e0ddd5" stroke-width="1"/>

  <text x="340" y="360" text-anchor="middle" font-size="12" fill="#5A5650" font-family="Georgia,serif">Terverifikasi pada Bank Soal Patologi Klinik FK UNSOED</text>
  <text x="340" y="470" text-anchor="middle" font-size="10" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">MR. CAPSULES STUDY ENGINE 2.5</text>
</svg>\`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'latsol-pk-blok12-' + pct + 'pct.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>
</body>
</html>`;

fs.writeFileSync(filePath, htmlContent, 'utf8');
console.log('Successfully transformed 1.2 Ident PK_Latsol PK.html to Type B Study Hub!');
