import fs from 'fs';
import path from 'path';

const contentDir = path.join(process.cwd(), 'content');

const adjustments = {
  // --- BLOCK 1.2 ---
  'semester 1/1.2': [
    { from: '1.2 CBT_Pull up 1.html', to: '1.2 CBT 1_Pull up 1.html' },
    { from: '1.2 CBT_Pull up 2.html', to: '1.2 CBT 1_Pull up 2.html' },
    { from: '1.2 CBT_Biomoll DNA Repair.html', to: '1.2 CBT 2_Biomoll DNA Repair.html' },
    { from: '1.2 CBT_Histo Apoptosis & Penuaan.html', to: '1.2 CBT 2_Histo Apoptosis & Penuaan.html' },
    { from: '1.2 CBT_Histo Cell Connect.html', to: '1.2 CBT 2_Histo Cell Connect.html' },
    { from: '1.2 CBT_Histo Epitel.html', to: '1.2 CBT 2_Histo Epitel.html' },
    { from: '1.2 CBT_Histo Jaringan Ikat.html', to: '1.2 CBT 2_Histo Jaringan Ikat.html' },
    { from: '1.2 CBT_Histo Matrix Intraseluler.html', to: '1.2 CBT 2_Histo Matrix Intraseluler.html' },
    { from: '1.2 CBT_Histo Otot.html', to: '1.2 CBT 2_Histo Otot.html' },
    { from: '1.2 CBT_Histo Saraf.html', to: '1.2 CBT 2_Histo Saraf.html' },
    { from: '1.2 CBT_Histo Siklus & Regulasi Sel.html', to: '1.2 CBT 2_Histo Siklus & Regulasi Sel.html' },
    { from: '1.2 CBT_Overall CBT.html', to: '1.2 CBT 2_Overall CBT.html' }
  ],

  // --- BLOCK 1.3 ---
  'semester 1/1.3': [
    { from: '1.3 CBT_1. Organisasi dan Embriologi SSP dan SST.html', to: '1.3 CBT 1_1. Organisasi dan Embriologi SSP dan SST.html' },
    { from: '1.3 CBT_2. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali).html', to: '1.3 CBT 1_2. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali).html' },
    { from: '1.3 CBT_3. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) II.html', to: '1.3 CBT 1_3. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) II.html' },
    { from: '1.3 CBT_4. Cerebellum Et Medulla Spinalis.html', to: '1.3 CBT 1_4. Cerebellum Et Medulla Spinalis.html' },
    { from: '1.3 CBT_5. Vascularisasi Pars Centralis Systema Nervosum Central.html', to: '1.3 CBT 1_5. Vascularisasi Pars Centralis Systema Nervosum Central.html' },
    { from: '1.3 CBT_6. Pars Peripherica Systema Nervosum Periphericum.html', to: '1.3 CBT 1_6. Pars Peripherica Systema Nervosum Periphericum.html' },
    { from: '1.3 CBT_7. Struktur Mikroskopis Sistem Saraf Pusat dan Sistem Saraf Tepi.html', to: '1.3 CBT 1_7. Struktur Mikroskopis Sistem Saraf Pusat dan Sistem Saraf Tepi.html' },
    { from: '1.3 CBT_8. Biokimiawi Sistem Saraf.html', to: '1.3 CBT 1_8. Biokimiawi Sistem Saraf.html' },
    { from: '1.3 CBT_9. Fungsi Sistem Saraf.html', to: '1.3 CBT 1_9. Fungsi Sistem Saraf.html' },
    { from: '1.3 CBT_10. Fungsi Medulla Spinalis dan Saraf Spinal.html', to: '1.3 CBT 1_10. Fungsi Medulla Spinalis dan Saraf Spinal.html' },
    { from: '1.3 CBT_11. Fungsi Integratif.html', to: '1.3 CBT 1_11. Fungsi Integratif.html' },
    { from: '1.3 CBT_12. Fungsi Sistem Saraf Otonom.html', to: '1.3 CBT 1_12. Fungsi Sistem Saraf Otonom.html' },
    { from: '1.3 CBT_Merah.html', to: '1.3 CBT 1_Merah.html' },
    { from: '1.3 CBT_Emerald.html', to: '1.3 CBT 2_Emerald.html' },
    { from: '1.3 CBT_Orange.html', to: '1.3 CBT 2_Orange.html' },
    { from: '1.3 CBT_Violet.html', to: '1.3 CBT 2_Violet.html' }
  ],

  // --- BLOCK 2.2 ---
  'semester 2/2.2': [
    { from: '2.2 CBT_22 FUFUFAFA.html', to: '2.2 CBT 1_22 FUFUFAFA.html' },
    { from: '2.2 CBT_23 JOKROWI.html', to: '2.2 CBT 1_23 JOKROWI.html' },
    { from: '2.2 CBT_24 PRANOWO.html', to: '2.2 CBT 1_24 PRANOWO.html' },
    { from: '2.2 CBT_45 BAXLIL.html', to: '2.2 CBT 1_45 BAXLIL.html' },
    { from: '2.2 CBT_Anggur Merah.html', to: '2.2 CBT 1_Anggur Merah.html' },
    { from: '2.2 CBT_22 ANTON AYAM.html', to: '2.2 CBT 2_22 ANTON AYAM.html' },
    { from: '2.2 CBT_23 TONO GALON.html', to: '2.2 CBT 2_23 TONO GALON.html' },
    { from: '2.2 CBT_24 AMBAR LAUNDRY.html', to: '2.2 CBT 2_24 AMBAR LAUNDRY.html' },
    { from: '2.2 CBT_45 TAHUN COPY PASTE.html', to: '2.2 CBT 2_45 TAHUN COPY PASTE.html' },
    { from: '2.2 CBT_DEATHPAMIN 2.html', to: '2.2 CBT 2_DEATHPAMIN 2.html' },
    { from: '2.2 CBT_DEATHPAMIN.html', to: '2.2 CBT 2_DEATHPAMIN.html' },
    { from: '2.2 CBT_25 PARNO SAPI.html', to: '2.2 CBT 2_25 PARNO SAPI.html' }
  ]
};

let totalAdjusted = 0;

Object.entries(adjustments).forEach(([relBlockDir, list]) => {
  const blockDir = path.join(contentDir, relBlockDir);
  if (!fs.existsSync(blockDir)) return;

  console.log(`\n=== Adjusting Block: ${relBlockDir} ===`);
  list.forEach(item => {
    const oldP = path.join(blockDir, item.from);
    const newP = path.join(blockDir, item.to);
    if (fs.existsSync(oldP)) {
      fs.renameSync(oldP, newP);
      console.log(`  ✓ ${item.from} -> ${item.to}`);
      totalAdjusted++;
    } else if (fs.existsSync(newP)) {
      console.log(`  - ${item.to} already in place.`);
    } else {
      console.log(`  ! File not found: ${item.from}`);
    }
  });
});

console.log(`\nAdjustment complete! Maintained CBT 1 & CBT 2 distinction for ${totalAdjusted} files.`);
