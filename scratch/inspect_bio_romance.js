import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'content', 'semester 1', '1.2', '1.2-1_flashcard biochemical romance.html');
const content = fs.readFileSync(filePath, 'utf8');

const m = content.match(/const cardData\s*=\s*(\[[\s\S]*?\]);/);
if (m) {
  const cards = eval(m[1]);
  console.log('Extracted ' + cards.length + ' cards from biochemical romance:');
  console.log(cards.slice(0, 5));
}
