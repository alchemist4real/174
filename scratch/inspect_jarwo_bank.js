import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'content', 'semester 1', '1.2', '1.2-1_jarwo.html');
const content = fs.readFileSync(filePath, 'utf8');

const m = content.match(/const questionBank\s*=\s*(\[[\s\S]*?\]);/);
if (m) {
  const bank = eval(m[1]);
  console.log('Extracted ' + bank.length + ' questions from questionBank:');
  console.log(bank.slice(0, 3));
}
