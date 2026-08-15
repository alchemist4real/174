import fs from 'fs';
import path from 'path';

const contentDir = path.join(process.cwd(), 'content');

const identRenames = {
  // --- BLOCK 1.2 ---
  'semester 1/1.2': [
    { from: '1.2 IDENT_Flashcard PK.html', to: '1.2 IDENT PK_Flashcard Patologi Klinik.html' },
    { from: '1.2 IDENT_Flashcard PK 2.html', to: '1.2 IDENT PK_Flashcard Hemostasis & Golongan Darah.html' },
    { from: '1.2 IDENT_Latsol PK.html', to: '1.2 IDENT PK_Latsol Patologi Klinik.html' },
    { from: '1.2 IDENT_Flashcard Phlebotomy.html', to: '1.2 IDENT BIOKIM_Flashcard Phlebotomy.html' },
    { from: '1.2 IDENT_Simulasi Biokimia JARWO.html', to: '1.2 IDENT BIOKIM_Simulasi Reaksi Biokimia JARWO.html' }
  ],

  // --- BLOCK 1.3 ---
  'semester 1/1.3': [
    { from: '1.3 IDENT_GASAK LIBAS FISIO 1.html', to: '1.3 IDENT FISIO_Lengkung Refleks Seri 1.html' },
    { from: '1.3 IDENT_GASAK LIBAS FISIOX 2.html', to: '1.3 IDENT FISIO_Panca Indra & Saraf Seri 2.html' }
  ],

  // --- BLOCK 1.4 ---
  'semester 1/1.4': [
    { from: '1.4 IDENT_Anatomi 5 Regio.html', to: '1.4 IDENT ANATOMI_5 Regio Muskuloskeletal.html' },
    { from: '1.4 IDENT_Biokim Metabolisme Tulang.html', to: '1.4 IDENT BIOKIM_Metabolisme Tulang & Mineral.html' },
    { from: '1.4 IDENT_Biokim Modul Kalsium & Fosfat.html', to: '1.4 IDENT BIOKIM_Modul Kalsium & Fosfat.html' },
    { from: '1.4 IDENT_Histologi Osteoblas & Integumen.html', to: '1.4 IDENT HISTO_Osteoblas & Integumen.html' }
  ],

  // --- BLOCK 2.1 ---
  'semester 2/2.1': [
    { from: '2.1 IDENT_Fisio Arvena.html', to: '2.1 IDENT FISIO_Arvena.html' },
    { from: '2.1 IDENT_Praktikum 1.html', to: '2.1 IDENT FISIO_Praktikum 1.html' },
    { from: '2.1 IDENT_Pre & Post Test.html', to: '2.1 IDENT FISIO_Pre & Post Test.html' }
  ]
};

let totalIdentRenamed = 0;

Object.entries(identRenames).forEach(([relBlockDir, list]) => {
  const blockDir = path.join(contentDir, relBlockDir);
  if (!fs.existsSync(blockDir)) return;

  console.log(`\n=== Categorizing IDENT/PRAKTIKUM in: ${relBlockDir} ===`);
  list.forEach(item => {
    const oldP = path.join(blockDir, item.from);
    const newP = path.join(blockDir, item.to);
    if (fs.existsSync(oldP)) {
      fs.renameSync(oldP, newP);
      console.log(`  ✓ ${item.from} -> ${item.to}`);
      totalIdentRenamed++;
    } else if (fs.existsSync(newP)) {
      console.log(`  - ${item.to} already configured.`);
    } else {
      console.log(`  ! File not found: ${item.from}`);
    }
  });
});

console.log(`\nSuccessfully categorized ${totalIdentRenamed} IDENT/PRAKTIKUM files by subject field!`);
