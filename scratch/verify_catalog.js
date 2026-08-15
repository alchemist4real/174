import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data.js');
const content = fs.readFileSync(dataPath, 'utf8');

const jsonStr = content.replace(/^const catalogData\s*=\s*/, '').replace(/;\s*$/, '');
const catalog = JSON.parse(jsonStr);

console.log('=== VERIFIKASI KATEGORISASI KATALOG DATA.JS ===\n');

catalog.semesters.forEach(sem => {
  console.log(`[${sem.title}] (Total: ${sem.totalFiles} files)`);
  sem.blocks.forEach(blk => {
    console.log(`  -> ${blk.title} (${blk.totalFiles} files)`);
    blk.categories.forEach(cat => {
      console.log(`     - [${cat.title}] (${cat.totalFiles} files)`);
    });
  });
  console.log('');
});
