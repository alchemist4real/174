import fs from 'fs';
import path from 'path';
import https from 'https';

const fontDir = path.join(process.cwd(), 'assets', 'fonts');
if (!fs.existsSync(fontDir)) {
  fs.mkdirSync(fontDir, { recursive: true });
}

const zipPath = path.join(process.cwd(), 'scratch', 'offbit.zip');

console.log('Downloading offbit.zip from DaFont...');

function download(url) {
  const file = fs.createWriteStream(zipPath);
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.dafont.com/offbit.font'
    }
  }, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log('Redirecting to:', response.headers.location);
      download(response.headers.location);
      return;
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        const size = fs.statSync(zipPath).size;
        console.log('Download completed. File size:', size, 'bytes');
      });
    });
  }).on('error', (err) => {
    console.error('Download error:', err.message);
  });
}

download('https://dl.dafont.com/dl/?f=offbit');
