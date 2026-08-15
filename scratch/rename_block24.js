import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 2', '2.4');
const files = fs.readdirSync(dir);

console.log('Current files in Blok 2.4:');
files.forEach(f => console.log(' - ' + f));

// List of renames
const renames = [];
files.forEach(f => {
  if (f.startsWith('2.4 CBT 2_')) {
    const newName = f.replace('2.4 CBT 2_', '2.4 LECTURE_');
    renames.push({ oldFile: f, newFile: newName });
  }
});

console.log('\nPlanned renames:');
renames.forEach(r => console.log(` ${r.oldFile} -> ${r.newFile}`));

renames.forEach(r => {
  const oldPath = path.join(dir, r.oldFile);
  const newPath = path.join(dir, r.newFile);
  fs.renameSync(oldPath, newPath);
  
  // Also update internal title/eyebrow if needed
  let content = fs.readFileSync(newPath, 'utf8');
  content = content.replace(/CBT 2 · BLOK 2\.4/g, 'LECTURE · BLOK 2.4');
  content = content.replace(/CBT 2 · Blok 2\.4/g, 'LECTURE · Blok 2.4');
  fs.writeFileSync(newPath, content, 'utf8');
});

console.log(`\nSuccessfully renamed ${renames.length} files in Blok 2.4 to follow Blok 2.5 standard!`);
