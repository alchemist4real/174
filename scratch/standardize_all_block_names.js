import fs from 'fs';
import path from 'path';

const contentDir = path.join(process.cwd(), 'content');

const renamesByBlock = {
  // --- BLOCK 1.2 ---
  'semester 1/1.2': [
    { from: '1.2 Ident PK_Flashcard PK 2.html', to: '1.2 IDENT_Flashcard PK 2.html' },
    { from: '1.2 Ident PK_Flashcard PK.html', to: '1.2 IDENT_Flashcard PK.html' },
    { from: '1.2 Ident PK_Latsol PK.html', to: '1.2 IDENT_Latsol PK.html' },
    { from: '1.2-1_flashcard biochemical romance.html', to: '1.2 IDENT_Flashcard Phlebotomy.html' },
    { from: '1.2-1_jarwo.html', to: '1.2 IDENT_Simulasi Biokimia JARWO.html' },
    { from: '1.2 other_Pull up 1.html', to: '1.2 CBT_Pull up 1.html' },
    { from: '1.2 other_Pull up 2.html', to: '1.2 CBT_Pull up 2.html' },
    { from: '1.2-2_Biomoll DNA Repair.html', to: '1.2 CBT_Biomoll DNA Repair.html' },
    { from: '1.2-2_Histo apoptosis dan penuaan.html', to: '1.2 CBT_Histo Apoptosis & Penuaan.html' },
    { from: '1.2-2_Histo Cell Connect.html', to: '1.2 CBT_Histo Cell Connect.html' },
    { from: '1.2-2_Histo Epitel.html', to: '1.2 CBT_Histo Epitel.html' },
    { from: '1.2-2_Histo jaringan ikat.html', to: '1.2 CBT_Histo Jaringan Ikat.html' },
    { from: '1.2-2_Histo Matrix Intraseluler.html', to: '1.2 CBT_Histo Matrix Intraseluler.html' },
    { from: '1.2-2_Histo Otot.html', to: '1.2 CBT_Histo Otot.html' },
    { from: '1.2-2_Histo Saraf.html', to: '1.2 CBT_Histo Saraf.html' },
    { from: '1.2-2_Histo Siklus dan regulasi sel.html', to: '1.2 CBT_Histo Siklus & Regulasi Sel.html' },
    { from: '1.2-2_Overall CBT.html', to: '1.2 CBT_Overall CBT.html' }
  ],

  // --- BLOCK 1.3 ---
  'semester 1/1.3': [
    { from: '1.3 CBT 1_0. materuy.html', to: '1.3 LECTURE_0. Materuy.html' },
    { from: '1.3 CBT 1_1. Organisasi dan Embriologi SSP dan SST.html', to: '1.3 CBT_1. Organisasi dan Embriologi SSP dan SST.html' },
    { from: '1.3 CBT 1_2. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) .html', to: '1.3 CBT_2. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali).html' },
    { from: '1.3 CBT 1_3. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) II.html', to: '1.3 CBT_3. Pars Centralis Systema Nervosum Centrale (Cerebrum & Truncus Encephali) II.html' },
    { from: '1.3 CBT 1_4. Cerebellum Et Medulla Spinalis.html', to: '1.3 CBT_4. Cerebellum Et Medulla Spinalis.html' },
    { from: '1.3 CBT 1_5. Vascularisasi Pars Centralis Systema Nervosum Central.html', to: '1.3 CBT_5. Vascularisasi Pars Centralis Systema Nervosum Central.html' },
    { from: '1.3 CBT 1_6. Pars Peripherica Systema Nervosum Periphericum.html', to: '1.3 CBT_6. Pars Peripherica Systema Nervosum Periphericum.html' },
    { from: '1.3 CBT 1_7. Struktur Mikroskopis Sistem Saraf Pusat dan Sistem Saraf Tepi.html', to: '1.3 CBT_7. Struktur Mikroskopis Sistem Saraf Pusat dan Sistem Saraf Tepi.html' },
    { from: '1.3 CBT 1_8. Biokimiawi Sistem Saraf.html', to: '1.3 CBT_8. Biokimiawi Sistem Saraf.html' },
    { from: '1.3 CBT 1_9. Fungsi Sistem Saraf.html', to: '1.3 CBT_9. Fungsi Sistem Saraf.html' },
    { from: '1.3 CBT 1_10. Fungsi Medulla Spinalis dan Saraf Spinal.html', to: '1.3 CBT_10. Fungsi Medulla Spinalis dan Saraf Spinal.html' },
    { from: '1.3 CBT 1_11. Fungsi Integratif.html', to: '1.3 CBT_11. Fungsi Integratif.html' },
    { from: '1.3 CBT 1_12. Fungsi Sistem Saraf Otonom.html', to: '1.3 CBT_12. Fungsi Sistem Saraf Otonom.html' },
    { from: '1.3 CBT 1_card generator.html', to: '1.3 TOOL_Player Card Generator.html' },
    { from: '1.3 CBT 1_merah.html', to: '1.3 CBT_Merah.html' },
    { from: '1.3 CBT 2_emerald.html', to: '1.3 CBT_Emerald.html' },
    { from: '1.3 CBT 2_ORANGE.html', to: '1.3 CBT_Orange.html' },
    { from: '1.3 CBT 2_VIOLET.html', to: '1.3 CBT_Violet.html' },
    { from: '1.3 other_PUSH UP 1.html', to: '1.3 CBT_Push Up 1.html' },
    { from: '1.3 other_PUSH UP 2.html', to: '1.3 CBT_Push Up 2.html' }
  ],

  // --- BLOCK 1.4 ---
  'semester 1/1.4': [
    { from: '1.4 CBT_0. COKI PARDEDE.html', to: '1.4 LECTURE_0. Coki Pardede.html' },
    { from: '1.4 CBT_Anatomi Lecture.html', to: '1.4 LECTURE_Anatomi Otot & Osteo-Arthro.html' },
    { from: '1.4 CBT_Biokim Lecture.html', to: '1.4 LECTURE_Biokim Integumen & Tulang.html' },
    { from: '1.4 CBT_Fisiologi Lecture.html', to: '1.4 LECTURE_Fisiologi Muskuloskeletal.html' },
    { from: '1.4 Ident Anatomi_PPT ADIU 23\'.html', to: '1.4 IDENT_Anatomi 5 Regio.html' },
    { from: '1.4 Ident Biokim_eakeak fc.html', to: '1.4 IDENT_Biokim Metabolisme Tulang.html' },
    { from: '1.4 Ident Biokim_kuis modul.html', to: '1.4 IDENT_Biokim Modul Kalsium & Fosfat.html' },
    { from: '1.4 Ident Histologi_Osteoblast~.html', to: '1.4 IDENT_Histologi Osteoblas & Integumen.html' }
  ],

  // --- BLOCK 2.1 ---
  'semester 2/2.1': [
    { from: '2.1 CBT_ FISIO ARVENA.html', to: '2.1 IDENT_Fisio Arvena.html' },
    { from: '2.1 Ident Fisio_Praktikum 1.html', to: '2.1 IDENT_Praktikum 1.html' },
    { from: '2.1 Ident Fisio_Pre&Post.html', to: '2.1 IDENT_Pre & Post Test.html' }
  ],

  // --- BLOCK 2.2 ---
  'semester 2/2.2': [
    { from: '2.2 CBT 1_22 FUFUFAFA.html', to: '2.2 CBT_22 FUFUFAFA.html' },
    { from: '2.2 CBT 1_23 JOKROWI.html', to: '2.2 CBT_23 JOKROWI.html' },
    { from: '2.2 CBT 1_24 PRANOWO.html', to: '2.2 CBT_24 PRANOWO.html' },
    { from: '2.2 CBT 1_45 BAXLIL.html', to: '2.2 CBT_45 BAXLIL.html' },
    { from: '2.2 CBT 2_22 ANTON AYAM.html', to: '2.2 CBT_22 ANTON AYAM.html' },
    { from: '2.2 CBT 2_23 TONO GALON.html', to: '2.2 CBT_23 TONO GALON.html' },
    { from: '2.2 CBT 2_24 AMBAR LAUNDRY.html', to: '2.2 CBT_24 AMBAR LAUNDRY.html' },
    { from: '2.2 CBT 2_45 TAHUN COPY PASTE.html', to: '2.2 CBT_45 TAHUN COPY PASTE.html' },
    { from: '2.2 CBT 2_DEATHPAMIN 2.html', to: '2.2 CBT_DEATHPAMIN 2.html' },
    { from: '2.2 CBT 2_DEATHPAMIN.html', to: '2.2 CBT_DEATHPAMIN.html' },
    { from: '2.2 OTHER_25 PARNO SAPI.html', to: '2.2 CBT_25 PARNO SAPI.html' },
    { from: '2.2_ Anggur Merah.html', to: '2.2 CBT_Anggur Merah.html' }
  ]
};

let totalRenamed = 0;

Object.entries(renamesByBlock).forEach(([relBlockDir, list]) => {
  const blockDir = path.join(contentDir, relBlockDir);
  if (!fs.existsSync(blockDir)) return;

  console.log(`\n=== Processing Block: ${relBlockDir} ===`);
  list.forEach(item => {
    const oldP = path.join(blockDir, item.from);
    const newP = path.join(blockDir, item.to);
    if (fs.existsSync(oldP)) {
      fs.renameSync(oldP, newP);
      console.log(`  ✓ ${item.from} -> ${item.to}`);
      totalRenamed++;
    } else if (fs.existsSync(newP)) {
      console.log(`  - ${item.to} already exists.`);
    } else {
      console.log(`  ! File not found: ${item.from}`);
    }
  });
});

console.log(`\nStandardization complete! Renamed ${totalRenamed} files across repository.`);
