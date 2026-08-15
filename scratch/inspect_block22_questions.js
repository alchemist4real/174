import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 2', '2.2');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== '2.2_ Anggur Merah.html');

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  let match = content.match(/const\s+(?:questions|QUESTIONS|Q|dataset|quizData|db|DB)\s*=\s*(\[[\s\S]*?\]);\s*(?:let|\/\/|const|\$|function)/i);
  if (match) {
    try {
      const q = eval(match[1]);
      console.log(`${f}: Found ${q.length} questions`);
    } catch(e) {
      console.log(`${f}: Regex matched but eval failed: ${e.message}`);
    }
  } else {
    console.log(`${f}: NO MATCH`);
  }
});
