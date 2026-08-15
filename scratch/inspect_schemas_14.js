import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'content', 'semester 1', '1.4');

const files = [
  '1.4 CBT_22 SIT UP.html',
  '1.4 CBT_23 PULL UP.html',
  '1.4 CBT_24 SCOTT JUMP.html',
  '1.4 CBT_Anatomi Lecture.html',
  '1.4 CBT_Biokim Lecture.html',
  '1.4 CBT_Fisiologi Lecture.html',
  '1.4 CBT_Histologi Lecture.html',
  '1.4 Ident Anatomi_PPT ADIU 23\'.html',
  '1.4 Ident Biokim_eakeak fc.html',
  '1.4 Ident Biokim_kuis modul.html',
  '1.4 Ident Histologi_Osteoblast~.html'
];

files.forEach(f => {
  const filePath = path.join(dir, f);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n=== File: ${f} ===`);
  const varMatches = content.match(/(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\[/g) || [];
  console.log('Arrays:', varMatches);

  varMatches.forEach(v => {
    const vName = v.replace(/(const|let|var)\s+/, '').replace(/\s*=\s*\[/, '');
    const regex = new RegExp(`(?:const|let|var)\\s+${vName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
    const match = content.match(regex);
    if (match) {
      try {
        const arr = eval(match[1]);
        console.log(`  -> Array "${vName}": length ${arr.length}`);
        if (arr.length > 0) {
          console.log(`     Sample item:`, JSON.stringify(arr[0]).slice(0, 150));
        }
      } catch (e) {
        console.log(`  -> Array "${vName}": eval failed (${e.message})`);
      }
    }
  });
});
