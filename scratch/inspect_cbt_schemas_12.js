import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.2');

const cbtFiles = [
  '1.2-2_Biomoll DNA Repair.html',
  '1.2-2_Histo apoptosis dan penuaan.html',
  '1.2-2_Histo Cell Connect.html',
  '1.2-2_Histo Epitel.html',
  '1.2-2_Histo jaringan ikat.html',
  '1.2-2_Histo Matrix Intraseluler.html',
  '1.2-2_Histo Otot.html',
  '1.2-2_Histo Saraf.html',
  '1.2-2_Histo Siklus dan regulasi sel.html',
  '1.2 other_Pull up 1.html',
  '1.2 other_Pull up 2.html',
  '1.2-2_Overall CBT.html'
];

cbtFiles.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log(`\n=== File: ${f} ===`);
  
  // Extract question array variable name
  const varMatches = content.match(/(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\[/g);
  console.log('Variables:', varMatches);
  
  // Sample the first question object
  const arrayStart = content.indexOf('= [');
  if (arrayStart !== -1) {
    console.log('Sample snippet:', content.slice(arrayStart, arrayStart + 400).replace(/\n/g, ' '));
  }
});
