import fs from 'fs';
import path from 'path';

function addDownloadCertToFile(filePath, title, moduleSubtitle) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if downloadCert is already present
  if (content.includes('function downloadCert')) return;

  const btnHtml = `<button class="start-btn" onclick="restartQuiz()">Ulangi Latihan ↺</button>
        <button class="start-btn" style="background:var(--green); margin-left:8px;" onclick="downloadCert()">Unduh Sertifikat SVG 📜</button>`;

  content = content.replace(/<button class="start-btn" onclick="restartQuiz\(\)">Ulangi Latihan ↺<\/button>/g, btnHtml);

  const certFunc = `
function downloadCert() {
  const total = quizSet.length;
  const pct = Math.round((score / total) * 100);
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
  <rect x="20" y="20" width="640" height="480" rx="12" fill="none" stroke="#b03030" stroke-width="2"/>
  <rect x="26" y="26" width="628" height="468" rx="9" fill="none" stroke="#b03030" stroke-width="0.5" opacity="0.4"/>

  <text x="340" y="66" text-anchor="middle" font-size="11" letter-spacing="4" fill="#7c85a8" font-family="Georgia,serif">SERTIFIKAT KELULUSAN STUDY HUB</text>
  <line x1="120" y1="74" x2="260" y2="74" stroke="#b03030" stroke-width="0.8"/>
  <circle cx="340" cy="74" r="3" fill="#b03030"/>
  <line x1="420" y1="74" x2="560" y2="74" stroke="#b03030" stroke-width="0.8"/>

  <text x="340" y="116" text-anchor="middle" font-size="32" font-weight="bold" fill="#161b2e" font-family="Georgia,serif">${title}</text>
  <text x="340" y="138" text-anchor="middle" font-size="11" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">${moduleSubtitle}</text>

  <line x1="100" y1="152" x2="580" y2="152" stroke="#e0ddd5" stroke-width="1"/>
  <text x="340" y="185" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">Telah menyelesaikan sesi evaluasi komprehensif dengan hasil</text>

  <rect x="230" y="196" width="220" height="80" rx="8" fill="none" stroke="\${medalColor}" stroke-width="1.5"/>
  <text x="340" y="245" text-anchor="middle" font-size="52" font-weight="bold" fill="\${medalColor}" font-family="Georgia,serif">\${pct}%</text>
  <text x="340" y="265" text-anchor="middle" font-size="10" fill="\${medalColor}" letter-spacing="3" font-family="Georgia,serif">\${medal}</text>

  <text x="340" y="305" text-anchor="middle" font-size="13" fill="#384068" font-family="Georgia,serif">\${score} soal benar dari \${total} butir evaluasi · \${dateStr}</text>
  <line x1="100" y1="320" x2="580" y2="320" stroke="#e0ddd5" stroke-width="1"/>

  <text x="340" y="360" text-anchor="middle" font-size="12" fill="#5A5650" font-family="Georgia,serif">Terverifikasi pada Kurikulum Modul Kedokteran FK UNSOED</text>
  <text x="340" y="470" text-anchor="middle" font-size="10" fill="#7c85a8" letter-spacing="2" font-family="Georgia,serif">MR. CAPSULES STUDY ENGINE 2.5</text>
</svg>\`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-\${pct}pct.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.downloadCert = downloadCert;
`;

  content = content.replace('</script>', certFunc + '\n</script>');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Added downloadCert to ${path.basename(filePath)}`);
}

// Upgrade 4 Type B files
addDownloadCertToFile(path.join(process.cwd(), 'content', 'semester 2', '2.1', '2.1 CBT_ FISIO ARVENA.html'), 'Fisiologi Arvena', 'KARDIORESPIRASI · BLOK 2.1 · FK UNSOED');
addDownloadCertToFile(path.join(process.cwd(), 'content', 'semester 2', '2.1', '2.1 Ident Fisio_Praktikum 1.html'), 'Praktikum Fisiologi I', 'TENSI, KOROTKOFF & HARVARD STEP TEST · BLOK 2.1 · FK UNSOED');
addDownloadCertToFile(path.join(process.cwd(), 'content', 'semester 2', '2.1', '2.1 Ident Fisio_Pre&Post.html'), 'Evaluasi Praktikum Fisiologi', 'PRE & POST TEST FISIOLOGI · BLOK 2.1 · FK UNSOED');
addDownloadCertToFile(path.join(process.cwd(), 'content', 'semester 2', '2.2', '2.2_ Anggur Merah.html'), 'Praktikum Anatomi: Anggur Merah', 'DIGESTIF & NEFROURINARIA · BLOK 2.2 · FK UNSOED');
