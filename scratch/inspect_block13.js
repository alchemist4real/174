import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.3');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} files in Blok 1.3:`);

files.forEach((f, idx) => {
  const filePath = path.join(dir, f);
  const content = fs.readFileSync(filePath, 'utf8');
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : 'No Title';
  
  // check questions/cards
  let count = 0;
  const varMatches = content.match(/(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\[/g) || [];
  
  const arrayNames = varMatches.map(v => v.replace(/(const|let|var)\s+/, '').replace(/\s*=\s*\[/, ''));

  // sample count
  const qCount1 = (content.match(/question\s*:/gi) || []).length;
  const qCount2 = (content.match(/q\s*:/gi) || []).length;
  const qCount3 = (content.match(/front\s*:/gi) || []).length;
  const countBest = Math.max(qCount1, qCount2, qCount3);

  console.log(`${idx + 1}. [${f}] (${content.length} bytes)`);
  console.log(`   Title: "${title}"`);
  console.log(`   Variables: [${arrayNames.join(', ')}] | Est. Count: ${countBest}`);
});
