import fs from 'fs';
import path from 'path';

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const contentDir = path.join(process.cwd(), 'content');
const allHtmlPaths = walkDir(contentDir);

console.log(`Found ${allHtmlPaths.length} HTML files across repository.\n`);

const blocks = {};

allHtmlPaths.forEach(fp => {
  const rel = path.relative(contentDir, fp).replace(/\\/g, '/');
  const parts = rel.split('/');
  const sem = parts[0];
  const blk = parts[1];
  const fn = parts[2];
  
  const key = `${sem} / ${blk}`;
  if (!blocks[key]) blocks[key] = [];
  blocks[key].push(fn);
});

Object.entries(blocks).forEach(([k, fileList]) => {
  console.log(`=== [${k}] (${fileList.length} files) ===`);
  fileList.forEach(f => console.log('  - ' + f));
  console.log('');
});
