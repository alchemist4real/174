import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 2', '2.3');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  let match = content.match(/const\s+(?:questions|QUESTIONS|Q|dataset|quizData|db|DB)\s*=\s*(\[[\s\S]*?\]);\s*(?:let|\/\/|const|\$|function)/i);
  if (!match) {
    // Check if it has an inline database or other format
    const dbMatch = content.match(/const\s+database\s*=\s*(\[[\s\S]*?\]);\s*(?:let|\/\/|const|\$|function)/i);
    if (dbMatch) match = dbMatch;
    else {
      // Check soal array in Kicaw
      const kMatch = content.match(/const\s+soalList\s*=\s*(\[[\s\S]*?\]);\s*(?:let|\/\/|const|\$|function)/i);
      if (kMatch) match = kMatch;
      else {
        const anyArrMatch = content.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(\[\s*\{\s*(?:q|question|no|id)[\s\S]*?\]);/i);
        if (anyArrMatch) {
          console.log(`${f}: Found array named ${anyArrMatch[1]}`);
          try {
            const q = eval(anyArrMatch[2]);
            console.log(`${f}: Successfully evaled ${q.length} questions`);
          } catch(e) {
            console.log(`${f}: Eval error on ${anyArrMatch[1]}: ${e.message}`);
          }
          return;
        }
      }
    }
  }
  
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
