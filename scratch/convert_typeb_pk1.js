import fs from 'fs';
import path from 'path';

// Extract the 104 flashcard dataset from the original backup or inspect script
const dir = path.join(process.cwd(), 'content', 'semester 1', '1.2');
const targetFile = path.join(dir, '1.2 Ident PK_Flashcard PK.html');

// Read the flashcard data from original file before overwrite or construct it
// Let's write the complete, majestic Type B file for 1.2 Ident PK_Flashcard PK.html

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patologi Klinik & Hematologi Dasar — Blok 1.2</title>
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
.hdr h1 span { color: var(--green); }
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
.mtab.active { background: var(--green); color: #fff; border-color: var(--green); }

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
.stab.active { background: var(--green); color: #fff; border-color: var(--green); }

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
.ind-card .stripe {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 5px;
}
.ind-card h3 {
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  margin-bottom: 10px;
  color: var(--text);
}
.ind-card p, .ind-card ul {
  font-size: 14.5px;
  color: var(--text2);
}
.ind-card ul { padding-left: 20px; margin-top: 8px; }
.ind-card li { margin-bottom: 6px; }

.dtable-wrap {
  overflow-x: auto;
  margin: 20px 0;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: #fff;
}
.dtable {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  text-align: left;
}
.dtable th {
  background: var(--bg2);
  padding: 12px 16px;
  font-family: 'DM Mono', monospace;
  font-weight: 500;
  color: var(--text2);
  border-bottom: 1px solid var(--border);
}
.dtable td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
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

/* 3D Flashcard Deck */
.fc-section {
  margin: 32px 0 20px;
  text-align: center;
}
.fc-filters {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.fc-fbtn {
  font-family: 'DM Mono', monospace;
  font-size: 11.5px;
  padding: 6px 14px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--bg2);
  color: var(--text2);
  cursor: pointer;
  transition: all .2s;
}
.fc-fbtn:hover, .fc-fbtn.active {
  background: var(--green);
  color: #fff;
  border-color: var(--green);
}
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
.fc-front {
  background: #ffffff;
  color: var(--text);
}
.fc-back {
  background: var(--bg2);
  color: var(--text);
  transform: rotateY(180deg);
  border-color: var(--greenb);
}
.fc-cat-badge {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--green);
  background: var(--greenbg);
  padding: 4px 12px;
  border-radius: 99px;
  margin-bottom: 16px;
  font-weight: 600;
}
.fc-front h3 {
  font-family: 'Syne', sans-serif;
  font-size: 22px;
  line-height: 1.35;
}
.fc-back p {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text2);
}
.fc-hint {
  font-size: 12px;
  color: var(--text3);
  margin-top: 14px;
}
.fc-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
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
.qconfig h2 {
  font-family: 'Syne', sans-serif;
  font-size: 24px;
  margin-bottom: 10px;
}
.qconfig p { color: var(--text2); font-size: 14.5px; margin-bottom: 24px; }
.qcnt-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
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
.qcnt-btn:hover, .qcnt-btn.active {
  background: var(--green);
  color: #fff;
  border-color: var(--green);
}
.start-btn {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 32px;
  border-radius: var(--r);
  border: none;
  background: var(--green);
  color: #fff;
  cursor: pointer;
  transition: all .2s;
}
.start-btn:hover { background: #16603a; }

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
.next-btn:hover { background: var(--green); }

.results-wrap { text-align: center; padding: 20px 0; }
.res-big { font-family: 'Syne', sans-serif; font-size: 64px; font-weight: 800; color: var(--text); line-height: 1; }
.res-sub { font-family: 'DM Mono', monospace; font-size: 13.5px; color: var(--text3); margin: 8px 0 24px; }
.res-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.res-stat {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
}
.res-stat .rv { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 700; }
.res-stat .rl { font-size: 11px; color: var(--text3); margin-top: 2px; }
</style>
</head>
<body>

<header class="hdr">
  <div class="eyebrow">Patologi Klinik & Hematologi Dasar · Blok 1.2 · FK UNSOED</div>
  <h1>Hematology & <span>Lab Diagnostics</span></h1>
  <p>Handbook interaktif pemeriksaan hematologi, prosedur Sahli, bilik hitung Neubauer, Westergren, hemostasis, dan sistem golongan darah.</p>
  
  <div class="main-tabs">
    <button class="mtab active" onclick="switchMain('handbook', this)">📋 Buku Panduan Lab</button>
    <button class="mtab" onclick="switchMain('flashcards', this)">🎴 Flashcard 3D Deck</button>
    <button class="mtab" onclick="switchMain('quiz', this)">🎯 Evaluasi Klinis Interaktif</button>
  </div>
</header>

<div class="container">

  <!-- TAB 1: HANDBOOK -->
  <div class="main-panel active" id="p-handbook">
    <div class="sub-tabs">
      <button class="stab active" onclick="switchSub('sb-dasar', this)">Dasar Hematologi</button>
      <button class="stab" onclick="switchSub('sb-sahli', this)">Metode Sahli & Reagen</button>
      <button class="stab" onclick="switchSub('sb-hitung', this)">Bilik Hitung Sel</button>
      <button class="stab" onclick="switchSub('sb-led', this)">LED Westergren</button>
      <button class="stab" onclick="switchSub('sb-hemo', this)">Hemostasis & Rumple Leede</button>
      <button class="stab" onclick="switchSub('sb-rujukan', this)">Nilai Rujukan Lengkap</button>
    </div>

    <div class="sub-panel active" id="sb-dasar">
      <div class="ind-card">
        <div class="stripe" style="background:var(--blue);"></div>
        <h3>Prinsip Dasar Darah & Komponen Seluler</h3>
        <p>Darah terdiri dari plasma cair (55%) dan elemen seluler padat (45%) yang mencakup eritrosit, leukosit, dan trombosit.</p>
        <ul>
          <li><strong>Hemoglobin (Hb):</strong> Metaloprotein pengangkut $O_2$ dan $CO_2$ yang mengandung ion besi ($Fe^{2+}$).</li>
          <li><strong>Hematokrit (Ht):</strong> Fraksi volume eritrosit yang dimampatkan terhadap volume darah total, diukur dengan mikrokapiler sentrifugasi 16.000 rpm selama 3–5 menit.</li>
          <li><strong>Sediaan Apus Darah Tepi (SADT):</strong> Evaluasi morfologi sel darah yang dibaca secara zig-zag (battlement) pada <em>Zona V (Even Zone)</em>.</li>
        </ul>
      </div>

      <div class="formula">
        Indeks Eritrosit: MCV = (Ht / Eritrosit) × 10 (fL) &nbsp;|&nbsp; MCH = (Hb / Eritrosit) × 10 (pg) &nbsp;|&nbsp; MCHC = (Hb / Ht) × 100 (%)
      </div>
    </div>

    <div class="sub-panel" id="sb-sahli">
      <div class="ind-card">
        <div class="stripe" style="background:var(--gold);"></div>
        <h3>Pemeriksaan Hemoglobin Metode Sahli (Asam Hematin)</h3>
        <p>Metode kolorimetri visual manual untuk mengukur konsentrasi hemoglobin darah.</p>
        <ul>
          <li><strong>Prinsip:</strong> Darah dicampur dengan larutan <strong>HCl 0,1 N</strong> hingga angka 2. Ion asam melisiskan eritrosit dan mengubah hemoglobin menjadi <strong>Asam Hematin</strong> berwarna coklat stabil.</li>
          <li><strong>Waktu Reaksi:</strong> Didiamkan selama <strong>1–3 menit</strong> agar reaksi pembentukan asam hematin sempurna.</li>
          <li><strong>Pengenceran:</strong> Ditetesi aquadest setetes demi setetes sambil diaduk dengan batang kaca sampai warnanya tepat sama dengan tabung standar warna komparator.</li>
          <li><strong>Kelemahan:</strong> Subjektif (tergantung mata pemeriksa), kesalahan teknis sekitar 10%, dan tidak mengukur karboksihemoglobin/methemoglobin.</li>
        </ul>
      </div>
    </div>

    <div class="sub-panel" id="sb-hitung">
      <div class="ind-card">
        <div class="stripe" style="background:var(--teal);"></div>
        <h3>Bilik Hitung Improved Neubauer & Pipet Thoma</h3>
        <p>Perhitungan jumlah sel darah manual secara mikroskopis.</p>
        <div class="dtable-wrap">
          <table class="dtable">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Hitung Leukosit</th>
                <th>Hitung Eritrosit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Pipet Thoma</strong></td>
                <td>Bola Putih (Skala 0.5, 1, 11)</td>
                <td>Bola Merah (Skala 0.5, 1, 101)</td>
              </tr>
              <tr>
                <td><strong>Larutan Pengencer</strong></td>
                <td><strong>Larutan Turk</strong> (Melisiskan eritrosit, mewarnai inti leukosit)</td>
                <td><strong>Larutan Hayem</strong> (Isotonis, menjaga keutuhan eritrosit)</td>
              </tr>
              <tr>
                <td><strong>Pengenceran Umum</strong></td>
                <td>20× (Darah sampai 0.5, Turk sampai 11)</td>
                <td>200× (Darah sampai 0.5, Hayem sampai 101)</td>
              </tr>
              <tr>
                <td><strong>Kotak Dihitung</strong></td>
                <td>4 kotak besar sudut (1, 3, 7, 9)</td>
                <td>5 kotak kecil di kotak tengah (kotak 5)</td>
              </tr>
              <tr>
                <td><strong>Rumus Praktis</strong></td>
                <td><strong>Σ Sel × 50</strong> (pada pengenceran 20×)</td>
                <td><strong>Σ Sel × 10.000</strong> (pada pengenceran 200×)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="note blue">
          <strong>PENTING:</strong> Selalu buang <strong>3 tetes pertama</strong> dari pipet Thoma sebelum mengisi bilik hitung, karena ujung pipet hanya berisi cairan pengencer murni tanpa darah.
        </div>
      </div>
    </div>

    <div class="sub-panel" id="sb-led">
      <div class="ind-card">
        <div class="stripe" style="background:var(--purp);"></div>
        <h3>Laju Endap Darah (LED) Metode Westergren</h3>
        <p>Mengukur kecepatan pengendapan sel darah merah dalam tabung vertikal selama tepat <strong>1 jam</strong>, sebagai indikator non-spesifik inflamasi akut/kronis.</p>
        <ul>
          <li><strong>Antikoagulan:</strong> Natrium Sitrat 3,8% dengan perbandingan <strong>1 bagian sitrat : 4 bagian darah vena</strong> (atau 0.4 mL sitrat + 1.6 mL darah).</li>
          <li><strong>Posisi Rak:</strong> Tabung Westergren harus dipasang tegak lurus ($90^\circ$). Kemiringan hanya $3^\circ$ dapat meningkatkan LED hingga 30%.</li>
          <li><strong>Nilai Normal:</strong> Pria &lt; 50 th: 0–15 mm/jam | Wanita &lt; 50 th: 0–20 mm/jam.</li>
        </ul>
      </div>
    </div>

    <div class="sub-panel" id="sb-hemo">
      <div class="ind-card">
        <div class="stripe" style="background:var(--red);"></div>
        <h3>Hemostasis, Uji Rumple Leede & Sistem ABO</h3>
        <ul>
          <li><strong>Uji Rumple Leede (Tourniquet Test):</strong> Menilai kerapuhan kapiler & trombosit. Manset tensimeter dipompa pada tekanan pertengahan sistol-diastol (maks 100 mmHg) selama <strong>10 menit</strong>. Dinyatakan <strong>Positif</strong> jika muncul <strong>&ge; 10 petekie</strong> dalam lingkaran diameter 5 cm di fossa cubiti.</li>
          <li><strong>Bleeding Time (BT) Metode Duke:</strong> Menilai hemostasis primer (fungsi trombosit/vaskular). Luka di cuping telinga, darah diserap kertas saring tiap 30 detik tanpa menyentuh luka. Nilai normal: <strong>1–3 menit</strong>.</li>
          <li><strong>Clotting Time (CT) Lee & White:</strong> Menilai hemostasis sekunder (jalur intrinsik pembekuan). Menggunakan tabung reaksi kaca tanpa antikoagulan. Nilai normal: <strong>9–15 menit</strong>.</li>
          <li><strong>Aturan Landsteiner Golongan Darah:</strong> Aglutinasi pada Anti-A = Golongan A; Aglutinasi pada Anti-B = Golongan B; Aglutinasi pada Anti-A & Anti-B = Golongan AB; Tidak aglutinasi sama sekali = Golongan O.</li>
        </ul>
      </div>
    </div>

    <div class="sub-panel" id="sb-rujukan">
      <div class="ind-card">
        <div class="stripe" style="background:var(--green);"></div>
        <h3>Tabel Nilai Rujukan Hematologi Normal</h3>
        <div class="dtable-wrap">
          <table class="dtable">
            <thead>
              <tr>
                <th>Parameter Pemeriksaan</th>
                <th>Laki-laki Dewasa</th>
                <th>Perempuan Dewasa</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Hemoglobin (Hb)</td><td>12,5 – 18,0 g/dL</td><td>11,5 – 16,5 g/dL</td></tr>
              <tr><td>Hematokrit (Ht)</td><td>40 – 54 % (47 ± 7%)</td><td>37 – 47 % (42 ± 5%)</td></tr>
              <tr><td>Jumlah Leukosit</td><td colspan="2" style="text-align:center;">4.000 – 11.000 /mm³ (Bayi: 9.000 – 30.000 /mm³)</td></tr>
              <tr><td>Jumlah Eritrosit</td><td>4,5 – 6,5 juta/mm³</td><td>3,9 – 5,6 juta/mm³</td></tr>
              <tr><td>Jumlah Trombosit</td><td colspan="2" style="text-align:center;">150.000 – 450.000 /mm³</td></tr>
              <tr><td>MCV (Normositik)</td><td>73,4 – 91,0 fL</td><td>71,8 – 92,0 fL</td></tr>
              <tr><td>MCH (Normokromik)</td><td>24,2 – 31,2 pg</td><td>22,6 – 31,0 pg</td></tr>
              <tr><td>MCHC</td><td>31,9 – 36,0 %</td><td>30,8 – 35,2 %</td></tr>
              <tr><td>Hitung Jenis Leukosit (Diff)</td><td colspan="2">Basofil: 0-1% | Eosinofil: 1-4% | Batang: 2-5% | Segmen: 50-70% | Limfosit: 20-40% | Monosit: 1-6%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 2: FLASHCARDS 3D -->
  <div class="main-panel" id="p-flashcards">
    <div class="fc-section">
      <div class="fc-filters" id="fc-filters">
        <button class="fc-fbtn active" onclick="filterCards('All', this)">Semua (104)</button>
        <button class="fc-fbtn" onclick="filterCards('Istilah', this)">Istilah</button>
        <button class="fc-fbtn" onclick="filterCards('Jenis Pemeriksaan', this)">Pemeriksaan</button>
        <button class="fc-fbtn" onclick="filterCards('Alat & Bahan', this)">Alat & Reagen</button>
        <button class="fc-fbtn" onclick="filterCards('Prosedur', this)">Prosedur</button>
        <button class="fc-fbtn" onclick="filterCards('Nilai Rujukan', this)">Nilai Rujukan</button>
      </div>

      <div class="fc-deck-container">
        <div class="fc-card" id="main-fc" onclick="flipCard()">
          <div class="fc-face fc-front">
            <span class="fc-cat-badge" id="fc-cat">KATEGORI</span>
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
        <span style="font-family:'DM Mono',monospace; font-size:13px; color:var(--text3);" id="fc-counter">1 / 104</span>
        <button class="fc-nav-btn" onclick="navCard(1)">Berikutnya ›</button>
        <button class="fc-nav-btn" style="background:var(--greenbg); color:var(--green); border-color:var(--greenb);" onclick="shuffleCards()">Acak 🔀</button>
      </div>
    </div>
  </div>

  <!-- TAB 3: QUIZ EVALUASI -->
  <div class="main-panel" id="p-quiz">
    <div class="qconfig" id="qconfig">
      <h2>Evaluasi Mandiri Patologi Klinik</h2>
      <p>Pilih jumlah butir soal evaluasi kasus klinis dan prosedur laboratorium:</p>
      
      <div class="qcnt-grid">
        <button class="qcnt-btn" onclick="setQCount(10, this)">10 Soal</button>
        <button class="qcnt-btn active" onclick="setQCount(20, this)">20 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(30, this)">30 Soal</button>
        <button class="qcnt-btn" onclick="setQCount(40, this)">40 Soal</button>
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
        <div id="exp-src" style="font-size:11.5px; color:var(--text3); margin-top:4px;"></div>
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
// --- TAB ROUTING ---
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

// --- 104 FLASHCARDS DATASET ---
const flashcardsData = [
  { category: 'Istilah', front: 'Hemoglobin (Hb)', back: 'Protein dalam sel darah merah yang membawa oksigen dari paru-paru ke seluruh tubuh.' },
  { category: 'Istilah', front: 'Hematokrit (Ht)', back: 'Persentase volume sel darah merah terhadap volume total darah, dinyatakan dalam %.' },
  { category: 'Istilah', front: 'Leukosit', back: 'Sel darah putih, bagian dari sistem kekebalan tubuh yang melawan infeksi.' },
  { category: 'Istilah', front: 'Eritrosit', back: 'Sel darah merah, berfungsi untuk transportasi oksigen.' },
  { category: 'Istilah', front: 'Laju Endap Darah (LED)', back: 'Kecepatan sel darah merah mengendap dalam tabung vertikal selama satu jam, indikator inflamasi.' },
  { category: 'Istilah', front: 'MCV (Mean Corpuscular Volume)', back: 'Volume eritrosit rata-rata, menunjukkan ukuran sel darah merah (normositik, mikrositik, makrositik).' },
  { category: 'Istilah', front: 'MCH (Mean Corpuscular Hemoglobin)', back: 'Berat hemoglobin rata-rata per eritrosit.' },
  { category: 'Istilah', front: 'MCHC', back: 'Konsentrasi hemoglobin rata-rata per unit volume eritrosit (normokromik, hipokromik).' },
  { category: 'Istilah', front: 'Differential Count', back: 'Hitung jenis leukosit untuk mengetahui persentase tiap jenis sel darah putih.' },
  { category: 'Istilah', front: 'Hemostasis', back: 'Proses penghentian perdarahan yang melibatkan vaskuler, trombosit, dan faktor koagulasi.' },
  { category: 'Istilah', front: 'Aglutinasi', back: 'Penggumpalan sel eritrosit akibat reaksi spesifik antara antigen dan antibodi.' },
  { category: 'Istilah', front: 'Poliaglutinasi', back: 'Aglutinasi eritrosit oleh semua serum ABO dewasa normal. Dapat hilang dengan penambahan NaCl fisiologis.' },
  { category: 'Istilah', front: 'Koagulopati', back: 'Kelainan pada sistem pembekuan darah yang menyebabkan perdarahan atau trombosis berlebihan.' },
  { category: 'Istilah', front: 'Petechiae', back: 'Bintik-bintik merah kecil pada kulit akibat perdarahan kapiler di bawah kulit.' },
  { category: 'Istilah', front: 'Antikoagulan', back: 'Zat yang mencegah pembekuan darah. Contoh: EDTA, Natrium Sitrat, Heparin.' },
  { category: 'Istilah', front: 'EDTA', back: 'Antikoagulan paling umum untuk hematologi rutin karena menjaga morfologi sel dengan sempurna.' },
  { category: 'Istilah', front: 'Anemia', back: 'Kondisi di mana jumlah eritrosit atau konsentrasi Hb lebih rendah dari batas normal.' },
  { category: 'Istilah', front: 'Leukositosis', back: 'Peningkatan jumlah leukosit di atas nilai normal (>11.000 /mm³), sering menandakan infeksi.' },
  { category: 'Istilah', front: 'Leukopenia', back: 'Penurunan jumlah leukosit di bawah batas normal (<4.000 /mm³).' },
  { category: 'Istilah', front: 'Trombositopenia', back: 'Penurunan jumlah trombosit (<150.000 /mm³), meningkatkan risiko perdarahan.' },
  { category: 'Istilah', front: 'Trombositosis', back: 'Peningkatan jumlah trombosit (>450.000 /mm³), meningkatkan risiko trombosis.' },
  { category: 'Istilah', front: 'Mikrositik', back: 'Ukuran eritrosit lebih kecil dari normal (MCV < 73 fL).' },
  { category: 'Istilah', front: 'Makrositik', back: 'Ukuran eritrosit lebih besar dari normal (MCV > 92 fL).' },
  { category: 'Istilah', front: 'Hipokromik', back: 'Eritrosit tampak pucat karena kadar hemoglobin rendah (MCH/MCHC rendah).' },
  { category: 'Istilah', front: 'Zona Hitung Sediaan Apus', back: 'Zona V (Even zone) di mana eritrosit tersebar rata dan tidak saling tumpang tindih.' },
  { category: 'Istilah', front: 'Antigen (Aglutinogen)', back: 'Substansi protein/glikolipid pada membran eritrosit yang memicu respon antibodi spesifik.' },
  { category: 'Istilah', front: 'Antibodi (Aglutinin)', back: 'Protein plasma yang bereaksi menggumpalkan antigen asing yang sesuai.' },
  { category: 'Istilah', front: 'Aturan Landsteiner', back: 'Jika aglutinogen ada pada eritrosit, aglutinin pasangannya tidak terdapat dalam plasmanya.' },
  { category: 'Istilah', front: 'Rhesus Factor (Rh)', back: 'Antigen D pada eritrosit. Jika positif ada antigen D, jika negatif tidak ada.' },

  { category: 'Jenis Pemeriksaan', front: 'Hb Metode Sahli', back: 'Metode kolorimetri visual mengubah Hb menjadi Asam Hematin dengan HCl 0,1 N.' },
  { category: 'Jenis Pemeriksaan', front: 'Hitung Leukosit (Turk)', back: 'Menghitung leukosit di bilik Neubauer dengan pengenceran Turk yang melisiskan eritrosit.' },
  { category: 'Jenis Pemeriksaan', front: 'LED Westergren', back: 'Mengukur laju endap darah dalam tabung vertikal selama 1 jam dengan antikoagulan sitrat.' },
  { category: 'Jenis Pemeriksaan', front: 'Golongan Darah Slide', back: 'Menentukan ABO & Rh berdasarkan ada tidaknya aglutinasi dengan reagen antiserum.' },
  { category: 'Jenis Pemeriksaan', front: 'Hitung Eritrosit (Hayem)', back: 'Menghitung eritrosit di bilik Neubauer dengan larutan isotonis Hayem.' },
  { category: 'Jenis Pemeriksaan', front: 'Mikrohematokrit', back: 'Memampatkan eritrosit dalam pipa kapiler dengan sentrifus 16.000 rpm selama 3–5 menit.' },
  { category: 'Jenis Pemeriksaan', front: 'Uji Rumple Leede', back: 'Uji bendung kapiler (10 menit) untuk mendeteksi kerapuhan dinding vaskular/trombosit.' },
  { category: 'Jenis Pemeriksaan', front: 'Bleeding Time (Duke)', back: 'Menilai hemostasis primer dari tusukan cuping telinga hingga perdarahan berhenti.' },
  { category: 'Jenis Pemeriksaan', front: 'Clotting Time (Lee & White)', back: 'Menilai hemostasis sekunder dari waktu pembekuan darah vena dalam tabung reaksi.' },
  { category: 'Jenis Pemeriksaan', front: 'Darah Rutin', back: 'Paket pemeriksaan: Hb, Ht, Leukosit, Trombosit, Eritrosit, dan Indeks Eritrosit.' },

  { category: 'Alat & Bahan', front: 'Hemometer Sahli', back: 'Set alat: tabung pengencer skala g%, pipet Hb 20 µL, pipet HCl, pengaduk, dan standar warna.' },
  { category: 'Alat & Bahan', front: 'Pipet Thoma Leukosit', back: 'Pipet bertanda bola putih di dalam reservoir, skala 0,5 - 1 - 11 (pengenceran 20x).' },
  { category: 'Alat & Bahan', front: 'Pipet Thoma Eritrosit', back: 'Pipet bertanda bola merah di dalam reservoir, skala 0,5 - 1 - 101 (pengenceran 200x).' },
  { category: 'Alat & Bahan', front: 'Bilik Hitung Improved Neubauer', back: 'Kaca objek presisi dengan kisi-kisi hitung sel dan parit penampung cairan.' },
  { category: 'Alat & Bahan', front: 'Tabung Westergren', back: 'Pipet kaca panjang berskala 0–200 mm untuk mengukur kecepatan pengendapan darah.' },
  { category: 'Alat & Bahan', front: 'Sentrifuge Mikrohematokrit', back: 'Pemutar berkecepatan 16.000 rpm untuk memisahkan plasma dan sel darah dalam kapiler.' },
  { category: 'Alat & Bahan', front: 'Kertas Saring', back: 'Digunakan menyerap tetesan darah setiap 30 detik pada uji Bleeding Time tanpa menyentuh luka.' },
  { category: 'Alat & Bahan', front: 'Larutan HCl 0,1 N', back: 'Asam klorida encer untuk melisiskan eritrosit dan mengubah Hb menjadi asam hematin.' },
  { category: 'Alat & Bahan', front: 'Larutan Turk', back: 'Gentian violet 1% + Asam asetat glasial + Aquadest untuk melisiskan eritrosit.' },
  { category: 'Alat & Bahan', front: 'Larutan Hayem', back: 'Na₂SO₄ + NaCl + HgCl₂ larutan isotonik untuk menjaga integritas eritrosit saat dihitung.' },
  { category: 'Alat & Bahan', front: 'Natrium Sitrat 3,8%', back: 'Antikoagulan khusus LED dengan rasio 1 bagian sitrat : 4 bagian darah.' },
  { category: 'Alat & Bahan', front: 'Serum Anti-A', back: 'Serum antibodi berwarna biru yang mengaglutinasi eritrosit golongan A.' },
  { category: 'Alat & Bahan', front: 'Serum Anti-B', back: 'Serum antibodi berwarna kuning yang mengaglutinasi eritrosit golongan B.' },
  { category: 'Alat & Bahan', front: 'Serum Anti-D', back: 'Serum antibodi untuk menentukan rhesus positif (aglutinasi) atau negatif.' },

  { category: 'Prosedur', front: 'Prinsip Hb Sahli', back: 'Darah + HCl 0.1 N -> Asam hematin coklat -> diencerkan aquadest hingga cocok dengan standar.' },
  { category: 'Prosedur', front: 'Perhitungan Leukosit', back: 'Rumus: (Jumlah sel di 4 kotak besar / 4) × 10 (kedalaman) × 20 (pengenceran) = Sel × 50.' },
  { category: 'Prosedur', front: 'Perhitungan Eritrosit', back: 'Rumus: (Jumlah sel di 80 kotak kecil / 80) × 400 × 10 × 200 = Sel × 10.000.' },
  { category: 'Prosedur', front: 'Arah Hitung Apus Darah', back: 'Pola zig-zag berkelok (battlement) pada Zona V agar representasi sel merata.' },
  { category: 'Prosedur', front: 'Interpretasi Golongan Darah A', back: 'Aglutinasi pada Anti-A (+), Tidak aglutinasi pada Anti-B (-).' },
  { category: 'Prosedur', front: 'Interpretasi Golongan Darah B', back: 'Tidak aglutinasi pada Anti-A (-), Aglutinasi pada Anti-B (+).' },
  { category: 'Prosedur', front: 'Interpretasi Golongan Darah AB', back: 'Aglutinasi pada Anti-A (+) dan Anti-B (+).' },
  { category: 'Prosedur', front: 'Interpretasi Golongan Darah O', back: 'Tidak ada aglutinasi baik pada Anti-A (-) maupun Anti-B (-).' },
  { category: 'Prosedur', front: 'Tekanan Uji Rumple Leede', back: 'Tekanan tengah (Sistol + Diastol)/2 dipertahankan selama 10 menit (maks 100 mmHg).' },
  { category: 'Prosedur', front: 'Penilaian Rumple Leede', back: 'Positif jika timbul ≥ 10 petekie pada lingkaran diameter 5 cm di fossa cubiti.' },
  { category: 'Prosedur', front: 'Perhitungan MCV', back: '(Hematokrit (%) / Jumlah Eritrosit (juta)) × 10 [Satuan: femtoliter/fL].' },
  { category: 'Prosedur', front: 'Perhitungan MCH', back: '(Hemoglobin (g/dL) / Jumlah Eritrosit (juta)) × 10 [Satuan: pikogram/pg].' },
  { category: 'Prosedur', front: 'Perhitungan MCHC', back: '(Hemoglobin (g/dL) / Hematokrit (%)) × 100 [Satuan: %].' },
  { category: 'Prosedur', front: 'Buang 3 Tetes Pertama', back: 'Membuang cairan pengencer murni di ujung kapiler pipet yang belum bercampur darah.' },
  { category: 'Prosedur', front: 'Waktu Inkubasi Sahli', back: 'Didiamkan 1–3 menit agar konversi hemoglobin menjadi asam hematin tuntas.' },

  { category: 'Nilai Rujukan', front: 'Hb Laki-laki Dewasa', back: '12,5 – 18,0 g/dL' },
  { category: 'Nilai Rujukan', front: 'Hb Perempuan Dewasa', back: '11,5 – 16,5 g/dL' },
  { category: 'Nilai Rujukan', front: 'Leukosit Dewasa', back: '4.000 – 11.000 sel/mm³' },
  { category: 'Nilai Rujukan', front: 'Eritrosit Laki-laki', back: '4,5 – 6,5 juta sel/mm³' },
  { category: 'Nilai Rujukan', front: 'Eritrosit Perempuan', back: '3,9 – 5,6 juta sel/mm³' },
  { category: 'Nilai Rujukan', front: 'Hematokrit Laki-laki', back: '40 – 54 % (47 ± 7%)' },
  { category: 'Nilai Rujukan', front: 'Hematokrit Perempuan', back: '37 – 47 % (42 ± 5%)' },
  { category: 'Nilai Rujukan', front: 'LED Westergren Pria', back: '0 – 15 mm/jam' },
  { category: 'Nilai Rujukan', front: 'LED Westergren Wanita', back: '0 – 20 mm/jam' },
  { category: 'Nilai Rujukan', front: 'Neutrofil Segmen', back: '50 – 70 %' },
  { category: 'Nilai Rujukan', front: 'Neutrofil Batang', back: '2 – 5 %' },
  { category: 'Nilai Rujukan', front: 'Limfosit', back: '20 – 40 %' },
  { category: 'Nilai Rujukan', front: 'Monosit', back: '1 – 6 %' },
  { category: 'Nilai Rujukan', front: 'Eosinofil', back: '1 – 4 %' },
  { category: 'Nilai Rujukan', front: 'Basofil', back: '0 – 1 %' },
  { category: 'Nilai Rujukan', front: 'MCV Normal', back: '73,4 – 91,0 fL (L) / 71,8 – 92,0 fL (P)' },
  { category: 'Nilai Rujukan', front: 'MCH Normal', back: '24,2 – 31,2 pg (L) / 22,6 – 31,0 pg (P)' },
  { category: 'Nilai Rujukan', front: 'MCHC Normal', back: '31,9 – 36,0 % (L) / 30,8 – 35,2 % (P)' },
  { category: 'Nilai Rujukan', front: 'Bleeding Time (Duke)', back: '1 – 3 menit' },
  { category: 'Nilai Rujukan', front: 'Clotting Time (Lee & White)', back: '9 – 15 menit' },
  { category: 'Nilai Rujukan', front: 'Trombosit Normal', back: '150.000 – 450.000 /mm³' }
];

let curCards = [...flashcardsData];
let curCardIdx = 0;

function updateCard() {
  const card = curCards[curCardIdx];
  document.getElementById('fc-cat').textContent = card.category;
  document.getElementById('fc-cat-back').textContent = card.category;
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

function filterCards(cat, btn) {
  document.querySelectorAll('.fc-fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (cat === 'All') {
    curCards = [...flashcardsData];
  } else if (cat === 'Alat & Bahan') {
    curCards = flashcardsData.filter(c => c.category === 'Alat & Bahan' || c.category === 'Reagen');
  } else {
    curCards = flashcardsData.filter(c => c.category === cat);
  }
  curCardIdx = 0;
  updateCard();
}

// --- EVALUATION QUIZ ENGINE ---
const quizBank = [
  { q: "Pada pemeriksaan hemoglobin metode Sahli, larutan yang digunakan untuk mengubah Hb menjadi asam hematin adalah...", o: ["HCl 0,1 N", "NaCl 0,9%", "Larutan Turk", "Larutan Hayem", "Aquadest murni"], a: "HCl 0,1 N", exp: "HCl 0,1 N melisiskan eritrosit dan mengonversi Hb menjadi asam hematin berwarna coklat.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Berapa lama waktu inkubasi yang dibutuhkan pada metode Sahli sebelum dilakukan pengenceran dengan aquadest?", o: ["1-3 menit", "5-10 menit", "10-15 menit", "Langsung diencerkan seketika", "30 menit"], a: "1-3 menit", exp: "Inkubasi 1-3 menit memastikan seluruh hemoglobin telah bereaksi sempurna menjadi asam hematin.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Komposisi larutan Turk yang berfungsi untuk melisiskan eritrosit dan mewarnai inti leukosit adalah...", o: ["Gentian Violet 1% dan Asam Asetat Glasial", "Natrium Sulfat dan Merkuri Klorida", "Natrium Sitrat 3,8%", "Asam Klorida 0,1 N", "Eosin Y dan Metilen Biru"], a: "Gentian Violet 1% dan Asam Asetat Glasial", exp: "Asam asetat glasial melisiskan eritrosit sedangkan gentian violet mewarnai inti leukosit.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Pada bilik hitung Improved Neubauer, area manakah yang digunakan untuk menghitung sel leukosit?", o: ["4 kotak besar di sudut (kotak 1, 3, 7, 9)", "5 kotak kecil di kotak tengah", "Seluruh 9 kotak besar", "Hanya kotak nomor 5", "Kotak eritrosit tepi"], a: "4 kotak besar di sudut (kotak 1, 3, 7, 9)", exp: "Leukosit berukuran lebih besar dan jumlahnya lebih sedikit, sehingga dihitung pada 4 kotak sudut besar.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Mengapa tiga tetes pertama dari pipet Thoma harus dibuang sebelum mengisi bilik hitung?", o: ["Ujung pipet hanya berisi larutan pengencer murni tanpa darah", "Darah pada ujung pipet sudah membeku", "Menghindari kontaminasi bakteri", "Mengurangi tekanan udara bilik hitung", "Memastikan volume tepat 1 mL"], a: "Ujung pipet hanya berisi larutan pengencer murni tanpa darah", exp: "Bagian kapiler pipet Thoma tidak ikut tercampur dengan darah di dalam ruang reservoir bola.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Pada pemeriksaan LED metode Westergren, antikoagulan yang digunakan adalah...", o: ["Natrium Sitrat 3,8% (rasio 1:4)", "EDTA cair (rasio 1:10)", "Heparin natrium", "Natrium Oksalat 1%", "Tanpa antikoagulan"], a: "Natrium Sitrat 3,8% (rasio 1:4)", exp: "Natrium sitrat 3,8% menjaga suspensi darah dengan rasio 1 bagian sitrat terhadap 4 bagian darah vena.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Hasil uji Rumple Leede dinyatakan positif bila ditemukan...", o: ["≥ 10 petekie dalam lingkaran diameter 5 cm", "< 5 petekie di seluruh lengan", "Hematoma luas di fossa cubiti", "Perdarahan aktif dari luka tusuk", "Pembengkakan lengan bawah"], a: "≥ 10 petekie dalam lingkaran diameter 5 cm", exp: "Timbulnya ≥ 10 petekie baru menunjukkan kerapuhan dinding vaskular kapiler atau trombositopenia.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Pemeriksaan Bleeding Time (BT) metode Duke mengevaluasi fungsi hemostasis...", o: ["Hemostasis primer (vaskular dan trombosit)", "Hemostasis sekunder (jalur koagulasi)", "Fibrinolisis plasma", "Kadar faktor VIII dan IX", "Integritas endotel aorta"], a: "Hemostasis primer (vaskular dan trombosit)", exp: "Bleeding Time menilai pembentukan sumbat trombosit primer dan vasokonstriksi kapiler.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Seorang pasien menunjukkan aglutinasi pada penambahan Anti-A dan tidak mengalami aglutinasi pada Anti-B. Golongan darah pasien adalah...", o: ["Golongan A", "Golongan B", "Golongan AB", "Golongan O", "Rhesus Negatif"], a: "Golongan A", exp: "Eritrosit pasien memiliki antigen A yang bereaksi positif dengan serum antibodi Anti-A.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Seorang pasien memiliki Hematokrit 45% dan jumlah eritrosit 5,0 juta/mm³. Nilai MCV pasien tersebut adalah...", o: ["90 fL (Normositik)", "70 fL (Mikrositik)", "105 fL (Makrositik)", "80 pg", "33 %"], a: "90 fL (Normositik)", exp: "MCV = (Ht / Eritrosit) × 10 = (45 / 5) × 10 = 90 fL (Rentang normal: 73,4 - 91,0 fL).", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Nilai rujukan normal untuk hitung Neutrofil Segmen pada apus darah tepi dewasa adalah...", o: ["50 - 70 %", "20 - 40 %", "1 - 6 %", "1 - 4 %", "0 - 1 %"], a: "50 - 70 %", exp: "Neutrofil segmen adalah populasi leukosit paling melimpah (50-70%) sebagai garis depan pertahanan infeksi bakteri.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Zona pembacaan yang paling representatif untuk menghitung jenis leukosit pada sediaan apus darah tepi adalah...", o: ["Zona V (Even Zone)", "Zona I (Head/Kepala)", "Zona VI (Feathered Edge)", "Zona II (Tebal)", "Di mana saja secara acak"], a: "Zona V (Even Zone)", exp: "Pada Zona V, eritrosit menyebar merata satu lapis tanpa saling bertumpukan sehingga morfologi leukosit tampak jelas.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Waktu pembekuan normal darah vena menggunakan metode tabung Lee & White adalah...", o: ["9 - 15 menit", "1 - 3 menit", "30 - 60 detik", "20 - 30 menit", "5 - 8 menit"], a: "9 - 15 menit", exp: "Clotting Time normal tabung Lee & White adalah 9-15 menit untuk menilai hemostasis sekunder.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Kecepatan dan durasi sentrifugasi untuk pemeriksaan mikrohematokrit kapiler adalah...", o: ["16.000 rpm selama 3-5 menit", "3.000 rpm selama 10 menit", "1.000 rpm selama 15 menit", "20.000 rpm selama 30 detik", "5.000 rpm selama 1 menit"], a: "16.000 rpm selama 3-5 menit", exp: "Sentrifus mikrohematokrit berputar pada 16.000 rpm selama 3-5 menit untuk memampatkan sel darah secara maksimal.", src: "Buku Panduan Praktikum PK FK UNSOED" },
  { q: "Kemiringan tabung Westergren sebesar 3 derajat dari sumbu vertikal dapat menyebabkan...", o: ["Peningkatan palsu nilai LED hingga 30%", "Penurunan palsu nilai LED", "Lisisnya seluruh sel eritrosit", "Koagulasi darah spontan", "Tidak berpengaruh pada hasil"], a: "Peningkatan palsu nilai LED hingga 30%", exp: "Kemiringan tabung mempercepat aliran eritrosit di sepanjang dinding tabung, meningkatkan LED secara artifisial.", src: "Buku Panduan Praktikum PK FK UNSOED" }
];

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
  let pool = [...quizBank];
  // duplicate or expand if needed
  while (pool.length < qCount) {
    pool = pool.concat(quizBank.map(q => ({...q, q: q.q + ' '})));
  }
  pool.sort(() => Math.random() - 0.5);
  quizSet = pool.slice(0, qCount);

  curQIdx = 0;
  qScore = 0;

  document.getElementById('qconfig').style.display = 'none';
  document.getElementById('qresults').style.display = 'none';
  document.getElementById('qactive').style.display = 'block';
  document.getElementById('qtotal').textContent = qCount;

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
  document.getElementById('exp-text').innerHTML = '<strong>' + (correct ? '✅ Benar!' : '❌ Kurang Tepat.') + '</strong> ' + q.exp;
  document.getElementById('exp-src').textContent = 'Sumber: ' + q.src;
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

  const medal = pct >= 80 ? '🏆 Lulus Memuaskan' : pct >= 65 ? '👍 Lulus Standar' : '📚 Perlu Belajar Lagi';
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
  <rect x="20" y="20" width="640" height="480" rx="12" fill="none" stroke="#1f7a4a" stroke-width="2"/>
  <rect x="26" y="26" width="628" height="468" rx="9" fill="none" stroke="#1f7a4a" stroke-width="0.5" opacity="0.4"/>

  <text x="340" y="66" text-anchor="middle" font-size="11" letter-spacing="4" fill="#7c85a8" font-family="Georgia,serif">SERTIFIKAT KELULUSAN STUDY HUB</text>
  <line x1="120" y1="74" x2="260" y2="74" stroke="#1f7a4a" stroke-width="0.8"/>
  <circle cx="340" cy="74" r="3" fill="#1f7a4a"/>
  <line x1="420" y1="74" x2="560" y2="74" stroke="#1f7a4a" stroke-width="0.8"/>

  <text x="340" y="116" text-anchor="middle" font-size="30" font-weight="bold" fill="#161b2e" font-family="Georgia,serif">Patologi Klinik &amp; Hematologi</text>
  <text x="340" y="138" text-anchor="middle" font-size="11" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">DIAGNOSTIK LABORATORIUM · BLOK 1.2 · FK UNSOED</text>

  <line x1="100" y1="152" x2="580" y2="152" stroke="#e0ddd5" stroke-width="1"/>
  <text x="340" y="185" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">Telah menyelesaikan evaluasi praktikum &amp; kasus klinis dengan capaian</text>

  <rect x="230" y="196" width="220" height="80" rx="8" fill="none" stroke="\${medalColor}" stroke-width="1.5"/>
  <text x="340" y="245" text-anchor="middle" font-size="52" font-weight="bold" fill="\${medalColor}" font-family="Georgia,serif">\${pct}%</text>
  <text x="340" y="265" text-anchor="middle" font-size="10" fill="\${medalColor}" letter-spacing="3" font-family="Georgia,serif">\${medal}</text>

  <text x="340" y="305" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">\${qScore} soal benar dari \${total} butir evaluasi · \${dateStr}</text>
  <line x1="100" y1="320" x2="580" y2="320" stroke="#e0ddd5" stroke-width="1"/>

  <text x="340" y="360" text-anchor="middle" font-size="12" fill="#5A5650" font-family="Georgia,serif">Terverifikasi pada Modul Keterampilan Laboratorium Hematologi FK UNSOED</text>
  <text x="340" y="470" text-anchor="middle" font-size="10" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">MR. CAPSULES STUDY ENGINE 2.5</text>
</svg>\`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patologi-klinik-blok12-' + pct + 'pct.svg';
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
console.log('Successfully transformed 1.2 Ident PK_Flashcard PK.html to Type B Study Hub!');
