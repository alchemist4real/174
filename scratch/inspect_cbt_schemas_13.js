import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.3');

const cbtFiles = [
  '1.3 CBT 1_1. Organisasi dan Embriologi SSP dan SST.html',
  '1.3 CBT 1_2. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) .html',
  '1.3 CBT 1_3. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) II.html',
  '1.3 CBT 1_4. Cerebellum Et Medulla Spinalis.html',
  '1.3 CBT 1_5. Vascularisasi Pars Centralis Systema Nervosum Central.html',
  '1.3 CBT 1_6. Pars Peripherica Systema Nervosum Periphericum.html',
  '1.3 CBT 1_7. Struktur Mikroskopis Sistem Saraf Pusat dan Sistem Saraf Tepi.html',
  '1.3 CBT 1_8. Biokimiawi Sistem Saraf.html',
  '1.3 CBT 1_9. Fungsi Sistem Saraf.html',
  '1.3 CBT 1_10. Fungsi Medulla Spinalis dan Saraf Spinal.html',
  '1.3 CBT 1_11. Fungsi Integratif.html',
  '1.3 CBT 1_12. Fungsi Sistem Saraf Otonom.html',
  '1.3 CBT 1_merah.html',
  '1.3 CBT 2_ORANGE.html',
  '1.3 CBT 2_VIOLET.html',
  '1.3 CBT 2_emerald.html',
  '1.3 other_PUSH UP 1.html',
  '1.3 other_PUSH UP 2.html'
];

cbtFiles.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log(`\n=== File: ${f} ===`);
  const m = content.match(/const questions\s*=\s*\[([\s\S]*?)\];/);
  if (m) {
    console.log('Found const questions = [...]');
    const snippet = m[1].slice(0, 300).replace(/\n/g, ' ');
    console.log('Snippet:', snippet);
  } else {
    const varMatches = content.match(/(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\[/g);
    console.log('Other arrays:', varMatches);
  }
});
