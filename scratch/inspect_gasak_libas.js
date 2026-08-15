import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.3');

['1.3 IDENT_GASAK LIBAS FISIO 1.html', '1.3 IDENT_GASAK LIBAS FISIOX 2.html'].forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log(`\n=== File: ${f} ===`);
  const m = content.match(/(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\[/g);
  console.log('Arrays:', m);

  const sample = content.indexOf('= [');
  if (sample !== -1) {
    console.log('Sample:', content.slice(sample, sample + 300).replace(/\n/g, ' '));
  }
});
