import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'content', 'semester 1', '1.2', '1.2-1_jarwo.html');
const content = fs.readFileSync(filePath, 'utf8');

const m = content.match(/const (questions|soalData|dataSoal|bankSoal|simulasiData)\s*=\s*(\[[\s\S]*?\]);/);
if (m) {
  console.log('Variable name:', m[1]);
  const arr = eval(m[2]);
  console.log('Extracted ' + arr.length + ' items from jarwo');
} else {
  // search for arrays
  const arrays = content.match(/(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\[/g);
  console.log('Found arrays in jarwo:', arrays);
}
