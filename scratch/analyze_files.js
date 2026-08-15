import fs from 'fs';
import path from 'path';

const blocks = ['2.1', '2.2', '2.3'];
const basePath = path.join(process.cwd(), 'content', 'semester 2');

const results = [];

blocks.forEach(block => {
  const blockDir = path.join(basePath, block);
  if (!fs.existsSync(blockDir)) return;
  const files = fs.readdirSync(blockDir).filter(f => f.endsWith('.html'));
  files.forEach(file => {
    const fullPath = path.join(blockDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check title
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : file;
    
    // Check question variable
    let qVar = 'unknown';
    if (content.includes('const questions =')) qVar = 'questions';
    else if (content.includes('const QUESTIONS =')) qVar = 'QUESTIONS';
    else if (content.includes('const questionPool =')) qVar = 'questionPool';
    else if (content.includes('const cards =')) qVar = 'cards';
    else if (content.includes('const flashcards =')) qVar = 'flashcards';
    else if (content.includes('const dataset =')) qVar = 'dataset';
    else if (content.includes('const data =')) qVar = 'data';
    else if (content.includes('id="soal-container"')) qVar = 'soal-container';
    
    results.push({
      block,
      file,
      title,
      qVar,
      sizeBytes: fs.statSync(fullPath).size
    });
  });
});

console.log(JSON.stringify(results, null, 2));
