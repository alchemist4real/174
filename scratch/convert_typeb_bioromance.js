import fs from 'fs';
import path from 'path';

const targetFile = path.join(process.cwd(), 'content', 'semester 1', '1.2', '1.2-1_flashcard biochemical romance.html');
const content = fs.readFileSync(targetFile, 'utf8');

const m = content.match(/const cardData\s*=\s*(\[[\s\S]*?\]);/);
let rawCards = [];
if (m) {
  rawCards = eval(m[1]);
}
console.log('Extracted ' + rawCards.length + ' cards');

const cardsJson = JSON.stringify(rawCards, null, 2);

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Handbook Phlebotomy &amp; Biokimia Medis — Blok 1.2</title>
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
.hdr h1 span { color: var(--teal); }
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
.mtab.active { background: var(--teal); color: #fff; border-color: var(--teal); }

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
.stab.active { background: var(--teal); color: #fff; border-color: var(--teal); }

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
.fc-back { background: var(--bg2); color: var(--text); transform: rotateY(180deg); border-color: var(--tealb); }
.fc-cat-badge {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--teal);
  background: var(--tealbg);
  padding: 4px 12px;
  border-radius: 99px;
  margin-bottom: 16px;
  font-weight: 600;
}
.fc-front h3 { font-family: 'Syne', sans-serif; font-size: 22px; line-height: 1.35; }
.fc-back p { font-size: 15px; line-height: 1.65; color: var(--text2); }
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
.qcnt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
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
.qcnt-btn:hover, .qcnt-btn.active { background: var(--teal); color: #fff; border-color: var(--teal); }
.start-btn {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 32px;
  border-radius: var(--r);
  border: none;
  background: var(--teal);
  color: #fff;
  cursor: pointer;
  transition: all .2s;
}
.start-btn:hover { background: #0e4e7a; }

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
.next-btn:hover { background: var(--teal); }

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
  <div class="eyebrow">Biokimia Medis &amp; Flebotomi · Blok 1.2 · FK UNSOED</div>
  <h1>Phlebotomy &amp; <span>Biochemistry</span></h1>
  <p>Handbook praktikum sampling darah vena (flebotomi), pencegahan hemolisis, pemilihan antikoagulan, dan evaluasi biokimia.</p>
  
  <div class="main-tabs">
    <button class="mtab active" onclick="switchMain('handbook', this)">📋 Prosedur Flebotomi</button>
    <button class="mtab" onclick="switchMain('flashcards', this)">🎴 Flashcard 3D Deck (57)</button>
    <button class="mtab" onclick="switchMain('quiz', this)">🎯 Evaluasi Prosedur &amp; Klinis</button>
  </div>
</header>

<div class="container">

  <!-- TAB 1: HANDBOOK -->
  <div class="main-panel active" id="p-handbook">
    <div class="sub-tabs">
      <button class="stab active" onclick="switchSub('sb-phleb', this)">Teknik Sampling Vena</button>
      <button class="stab" onclick="switchSub('sb-tabung', this)">Tabung &amp; Antikoagulan</button>
      <button class="stab" onclick="switchSub('sb-hemo', this)">Pencegahan Hemolisis</button>
    </div>

    <div class="sub-panel active" id="sb-phleb">
      <div class="ind-card">
        <div class="stripe" style="background:var(--teal);"></div>
        <h3>Prosedur Flebotomi Vena Cubiti Mediana</h3>
        <ul>
          <li><strong>Pemasangan Tourniquet:</strong> Dipasang di sebelah <strong>proksimal</strong> (sekitar 7–10 cm di atas fossa cubiti). Jangan dibendung lebih dari 1 menit untuk mencegah hemokonsentrasi.</li>
          <li><strong>Aseptik:</strong> Usap lokasi penusukan dengan alkohol 70% secara sirkular dari arah dalam ke luar dan biarkan mengering.</li>
          <li><strong>Sudut Penusukan:</strong> Tusukkan jarum spuit dengan sudut <strong>$15^\circ - 30^\circ$</strong> (atau $45^\circ$ dengan arah sejajar sumbu vena).</li>
          <li><strong>Pelepasan Tourniquet:</strong> Tourniquet harus <strong>dilepaskan sebelum jarum ditarik keluar</strong> dari vena agar darah tidak memancar keluar.</li>
        </ul>
      </div>
    </div>

    <div class="sub-panel" id="sb-tabung">
      <div class="ind-card">
        <div class="stripe" style="background:var(--purp);"></div>
        <h3>Klasifikasi Tabung Vacutainer &amp; Antikoagulan</h3>
        <ul>
          <li><strong>Tabung Ungu (EDTA):</strong> Mengikat ion $Ca^{2+}$. Pilihan utama untuk pemeriksaan hematologi rutin &amp; SADT karena menjaga morfologi eritrosit dan leukosit.</li>
          <li><strong>Tabung Biru Terang (Natrium Sitrat 3,2% / 3,8%):</strong> Digunakan untuk uji koagulasi (rasio 1:9) dan LED Westergren (rasio 1:4).</li>
          <li><strong>Tabung Hijau (Heparin):</strong> Mengaktivasi antitrombin III. Digunakan untuk analisa gas darah (AGD) dan kimia darah tertentu.</li>
          <li><strong>Tabung Merah/Kuning (Serum Separator / Clot Activator):</strong> Tanpa antikoagulan, untuk memisahkan serum murni pada pemeriksaan imunologi dan kimia klinik.</li>
        </ul>
      </div>
    </div>

    <div class="sub-panel" id="sb-hemo">
      <div class="ind-card">
        <div class="stripe" style="background:var(--red);"></div>
        <h3>Pencegahan Hemolisis &amp; Hemokonsentrasi</h3>
        <ul>
          <li><strong>Mencegah Hemolisis:</strong> Lepaskan jarum dari spuit saat memindahkan darah ke dalam tabung, lalu alirkan darah secara perlahan melewati dinding tabung kaca. Jangan disemprotkan melalui jarum.</li>
          <li><strong>Penyebab Hemokonsentrasi:</strong> Pembendungan tourniquet yang terlalu lama menyebabkan cairan plasma merembes keluar ke jaringan interstitial, sehingga konsentrasi eritrosit dan protein plasma meningkat semu.</li>
          <li><strong>Homogenisasi:</strong> Tabung berisi antikoagulan dibolak-balik secara perlahan berbentuk angka 8 sebanyak 8–10 kali (jangan dikocok keras).</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- TAB 2: FLASHCARDS 3D -->
  <div class="main-panel" id="p-flashcards">
    <div class="fc-section">
      <div class="fc-deck-container">
        <div class="fc-card" id="main-fc" onclick="flipCard()">
          <div class="fc-face fc-front">
            <span class="fc-cat-badge">FLEBOTOMI &amp; BIOKIMIA</span>
            <h3 id="fc-front-text">Pertanyaan Flashcard</h3>
            <span class="fc-hint">👆 Klik kartu untuk membalik</span>
          </div>
          <div class="fc-face fc-back">
            <span class="fc-cat-badge">PENJELASAN</span>
            <p id="fc-back-text">Jawaban dan penjelasan detail.</p>
            <span class="fc-hint">👆 Klik kartu untuk kembali</span>
          </div>
        </div>
      </div>

      <div class="fc-controls">
        <button class="fc-nav-btn" onclick="navCard(-1)">‹ Sebelumnya</button>
        <span style="font-family:'DM Mono',monospace; font-size:13px; color:var(--text3);" id="fc-counter">1 / 57</span>
        <button class="fc-nav-btn" onclick="navCard(1)">Berikutnya ›</button>
        <button class="fc-nav-btn" style="background:var(--tealbg); color:var(--teal); border-color:var(--tealb);" onclick="shuffleCards()">Acak 🔀</button>
      </div>
    </div>
  </div>

  <!-- TAB 3: QUIZ EVALUASI -->
  <div class="main-panel" id="p-quiz">
    <div class="qconfig" id="qconfig">
      <h2>Evaluasi Prosedur Sampling Darah &amp; Biokimia</h2>
      <p>Pilih jumlah butir soal evaluasi pemahaman praktikum:</p>
      
      <div class="qcnt-grid">
        <button class="qcnt-btn" onclick="setQCount(10, this)">10 Soal</button>
        <button class="qcnt-btn active" onclick="setQCount(20, this)">20 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(30, this)">30 Soal</button>
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

let curCards = [...flashcardsData];
let curCardIdx = 0;

function updateCard() {
  const card = curCards[curCardIdx];
  document.getElementById('fc-front-text').textContent = card.front;
  document.getElementById('fc-back-text').textContent = card.back;
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

// Convert flashcards to quiz pool
const quizPool = flashcardsData.map((c, idx) => {
  const wrongOptions = flashcardsData.filter((_, i) => i !== idx).map(x => x.back);
  wrongOptions.sort(() => Math.random() - 0.5);
  const opts = [c.back, wrongOptions[0], wrongOptions[1], wrongOptions[2]];
  opts.sort(() => Math.random() - 0.5);
  return {
    q: c.front,
    o: opts,
    a: c.back,
    exp: c.back
  };
});

let quizSet = [];
let qCount = 20;
let curQIdx = 0;
let qScore = 0;
const KEYS = ['A', 'B', 'C', 'D'];

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
    btn.onclick = () => selectQuizAns(optText, q, btn);
    optsContainer.appendChild(btn);
  });

  document.getElementById('expbox').classList.remove('show');
  document.getElementById('nextbtn').style.display = 'none';
}

function selectQuizAns(chosen, q, clickedBtn) {
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
  const correct = chosen.trim() === q.a.trim();
  if (correct) qScore++;

  document.querySelectorAll('.opt').forEach(b => {
    const text = b.querySelector('span:last-child').textContent.trim();
    if (text === q.a.trim()) {
      if (b === clickedBtn && correct) b.classList.add('correct');
      else if (b !== clickedBtn) b.classList.add('reveal');
      else b.classList.add('correct');
    }
    if (b === clickedBtn && !correct) b.classList.add('wrong');
  });

  const expBox = document.getElementById('expbox');
  document.getElementById('exp-text').innerHTML = '<strong>' + (correct ? '✅ Benar!' : '❌ Kurang Tepat.') + '</strong> Penjelasan: ' + q.exp;
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
  <rect x="20" y="20" width="640" height="480" rx="12" fill="none" stroke="#136ba8" stroke-width="2"/>
  <rect x="26" y="26" width="628" height="468" rx="9" fill="none" stroke="#136ba8" stroke-width="0.5" opacity="0.4"/>

  <text x="340" y="66" text-anchor="middle" font-size="11" letter-spacing="4" fill="#7c85a8" font-family="Georgia,serif">SERTIFIKAT KELULUSAN PRAKTIKUM</text>
  <line x1="120" y1="74" x2="260" y2="74" stroke="#136ba8" stroke-width="0.8"/>
  <circle cx="340" cy="74" r="3" fill="#136ba8"/>
  <line x1="420" y1="74" x2="560" y2="74" stroke="#136ba8" stroke-width="0.8"/>

  <text x="340" y="116" text-anchor="middle" font-size="28" font-weight="bold" fill="#161b2e" font-family="Georgia,serif">Phlebotomy &amp; Biokimia Medis</text>
  <text x="340" y="138" text-anchor="middle" font-size="11" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">SAMPLING DARAH &amp; PREANALITIK · BLOK 1.2 · FK UNSOED</text>

  <line x1="100" y1="152" x2="580" y2="152" stroke="#e0ddd5" stroke-width="1"/>
  <text x="340" y="185" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">Telah menyelesaikan evaluasi prosedur flebotomi dengan capaian</text>

  <rect x="230" y="196" width="220" height="80" rx="8" fill="none" stroke="\${medalColor}" stroke-width="1.5"/>
  <text x="340" y="245" text-anchor="middle" font-size="52" font-weight="bold" fill="\${medalColor}" font-family="Georgia,serif">\${pct}%</text>
  <text x="340" y="265" text-anchor="middle" font-size="10" fill="\${medalColor}" letter-spacing="3" font-family="Georgia,serif">\${medal}</text>

  <text x="340" y="305" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">\${qScore} soal benar dari \${total} butir evaluasi · \${dateStr}</text>
  <line x1="100" y1="320" x2="580" y2="320" stroke="#e0ddd5" stroke-width="1"/>

  <text x="340" y="360" text-anchor="middle" font-size="12" fill="#5A5650" font-family="Georgia,serif">Terverifikasi pada Modul Keterampilan Flebotomi &amp; Biokimia FK UNSOED</text>
  <text x="340" y="470" text-anchor="middle" font-size="10" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">MR. CAPSULES STUDY ENGINE 2.5</text>
</svg>\`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'phlebotomy-biokimia-' + pct + 'pct.svg';
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

fs.writeFileSync(targetFile, htmlContent, 'utf8');
console.log('Successfully transformed 1.2-1_flashcard biochemical romance.html to Type B Study Hub!');
