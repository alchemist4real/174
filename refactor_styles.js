const fs = require('fs');
const path = require('path');

const unifiedVars = `
:root {
  --bg-main: #FAFAFA;
  --bg-card: #EAEAEA;
  --bg-hover: #F0F0F0;
  --bg-active: #222222;
  --text-main: #0D0D0D;
  --text-muted: #555555;
  --accent: #000000;
  --accent-hover: #000000;
  --danger: #000000;
  --border-light: rgba(13,13,13,0.1);
  --border-medium: rgba(13,13,13,0.2);
  --border-heavy: rgba(13,13,13,0.5);
  --noise-op: 0.05;
  --scanline-c: rgba(13,13,13,0.025);
  --font-mono: 'Courier New', Courier, monospace;
  --font-sans: 'Times New Roman', Times, serif;
}

[data-theme="dark"] {
  --bg-main: #0D0D0D;
  --bg-card: #1A1A1A;
  --bg-hover: #222222;
  --bg-active: #EAEAEA;
  --text-main: #FAFAFA;
  --text-muted: #A3A3A3;
  --accent: #E2FF4A;
  --accent-hover: #000000;
  --danger: #000000;
  --border-light: rgba(250,250,250,0.1);
  --border-medium: rgba(250,250,250,0.2);
  --border-heavy: rgba(250,250,250,0.5);
  --noise-op: 0.02;
  --scanline-c: rgba(250,250,250,0.025);
  --font-mono: 'Courier New', Courier, monospace;
  --font-sans: 'Times New Roman', Times, serif;
}

[data-theme="mrs"] {
  --bg-main: #F63490;
  --bg-card: #FA4B9C;
  --bg-hover: #2AA3C9;
  --bg-active: #FFFFFF;
  --text-main: #FFFFFF;
  --text-muted: #FFB6C1;
  --accent: #2AA3C9;
  --accent-hover: #145385;
  --danger: #145385;
  --border-light: rgba(255, 255, 255, 0.25);
  --border-medium: rgba(255, 255, 255, 0.5);
  --border-heavy: rgba(255, 255, 255, 0.8);
  --noise-op: 0.04;
  --scanline-c: rgba(255, 255, 255, 0.1);
  --font-mono: 'Courier New', Courier, monospace;
  --font-sans: 'Times New Roman', Times, serif;
}
`;

function replaceTokens(text) {
  return text
    .replace(/--bg-card/g, '--bg-card')
    .replace(/--bg-card/g, '--bg-card')
    .replace(/--bg-hover/g, '--bg-hover')
    .replace(/--text-muted/g, '--text-muted')
    .replace(/--bg-active/g, '--bg-active');
}

// 1. Extract styles from index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
const styleMatch = indexHtml.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.log("No style block found in index.html");
  process.exit(1);
}

let baseStyles = styleMatch[1];
indexHtml = indexHtml.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/global-styles.css">');

// Remove existing root and themes from baseStyles
baseStyles = baseStyles.replace(/:root\s*\{[\s\S]*?\}/, '');
baseStyles = baseStyles.replace(/\[data-theme="dark"\]\s*(?!img)\{[\s\S]*?\}/g, '');
baseStyles = baseStyles.replace(/\[data-theme="mrs"\]\s*\{[\s\S]*?\}/g, '');

// Read admin.css and strip its root/themes and generic resets
let adminCss = fs.readFileSync('admin.css', 'utf8');
adminCss = adminCss.replace(/:root\s*\{[\s\S]*?\}/, '');
adminCss = adminCss.replace(/\[data-theme="dark"\]\s*(?!img)\{[\s\S]*?\}/g, '');
adminCss = adminCss.replace(/\[data-theme="mrs"\]\s*\{[\s\S]*?\}/g, '');
adminCss = adminCss.replace(/\*\s*\{[\s\S]*?\}/, ''); // reset
adminCss = adminCss.replace(/body\s*\{[\s\S]*?\}/, ''); // body
adminCss = adminCss.replace(/\.bg\s*\{[\s\S]*?\}/, ''); 
adminCss = adminCss.replace(/\.noise\s*\{[\s\S]*?\}/, ''); 
adminCss = adminCss.replace(/@keyframes\s*noiseShift\s*\{[\s\S]*?\}/, ''); 
adminCss = adminCss.replace(/\.scanlines\s*\{[\s\S]*?\}/, ''); 

// Read new_styles.css
let newStyles = '';
if (fs.existsSync('new_styles.css')) {
  newStyles = fs.readFileSync('new_styles.css', 'utf8');
}

let finalCss = unifiedVars + "\n" + baseStyles + "\n/* ADMIN CSS EXTRACT */\n" + adminCss + "\n/* NEW STYLES EXTRACT */\n" + newStyles;
finalCss = replaceTokens(finalCss);

fs.writeFileSync('global-styles.css', finalCss);
fs.writeFileSync('index.html', indexHtml); // already replacing tokens in HTML later

console.log("Created global-styles.css and updated index.html");

// 2. Replace tokens and link tags in all files
function processFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        processFiles(fullPath);
      }
    } else {
      if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = replaceTokens(content);
        
        if (fullPath.endsWith('.html')) {
          newContent = newContent.replace(/<link rel="stylesheet" href="\/admin\.css.*?>/g, '<link rel="stylesheet" href="/global-styles.css">');
          newContent = newContent.replace(/<link rel="stylesheet" href="\/new_styles\.css">/g, '');
        }
        
        if (content !== newContent) {
          fs.writeFileSync(fullPath, newContent);
          console.log("Updated", fullPath);
        }
      }
    }
  }
}

processFiles('.');

console.log("Refactoring complete.");
