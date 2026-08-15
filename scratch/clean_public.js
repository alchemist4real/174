import fs from 'fs';
import path from 'path';

const pubContent = path.join(process.cwd(), 'public', 'content');
if (fs.existsSync(pubContent)) {
  fs.rmSync(pubContent, { recursive: true, force: true });
  console.log('Cleaned old public/content directory.');
}
