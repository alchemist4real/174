import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.2');

['1.2 Ident PK_Flashcard PK 2.html', '1.2-1_flashcard biochemical romance.html', '1.2-2_Overall CBT.html'].forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log('=== ' + f + ' ===');
  const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
  scripts.forEach((s, idx) => {
    console.log(`Script ${idx + 1} preview (first 300 chars):`);
    console.log(s.slice(0, 300).replace(/\n/g, ' '));
  });
});
