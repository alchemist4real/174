import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.2');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} files in Blok 1.2:`);

files.forEach((f, idx) => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : 'No Title';
  
  // check questions/cards
  let count = 0;
  let type = 'Unknown';
  
  if (content.includes('flashcardsData')) {
    type = 'Flashcard Hub';
    const m = content.match(/flashcardsData\s*=\s*\[([\s\S]*?)\];/);
    if (m) {
      // count objects
      const items = m[1].split(/\{\s*category/g).length - 1;
      count = items > 0 ? items : (m[1].split(/front\s*:/g).length - 1);
    }
  } else if (content.includes('cardsData')) {
    type = 'Flashcard Hub';
    count = (content.match(/front\s*:/g) || []).length;
  } else if (content.includes('quizData')) {
    type = 'CBT / Quiz';
    count = (content.match(/question\s*:/gi) || []).length;
  } else if (content.includes('soalData') || content.includes('dataSoal')) {
    type = 'CBT / Quiz';
    count = (content.match(/pertanyaan\s*:/gi) || content.match(/soal\s*:/gi) || []).length;
  } else if (content.includes('const questions') || content.includes('var questions') || content.includes('let questions')) {
    type = 'CBT / Quiz';
    count = (content.match(/question\s*:/gi) || content.match(/q\s*:/gi) || []).length;
  } else if (content.includes('bankSoal')) {
    type = 'CBT / Quiz';
    count = (content.match(/q\s*:/gi) || []).length;
  } else if (content.includes('pertanyaan')) {
    type = 'Interactive Quiz / Simulation';
    count = (content.match(/pertanyaan/gi) || []).length;
  }

  console.log(`${idx + 1}. [${f}]`);
  console.log(`   Title: "${title}"`);
  console.log(`   Type: ${type} | Approx Count: ${count}`);
});
