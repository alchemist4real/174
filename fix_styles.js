const fs = require('fs');
const path = require('path');

const files = ['admin.html', 'live.html', 'docs.html'];
const dir = 'd:/DOWNLOAD/MR-CAPSULES-main';

files.forEach(file => {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');

  // Replace border:1px solid var(--border-light) -> border:var(--border-main)
  content = content.replace(/border:1px solid var\(--border-light\)/g, 'border:var(--border-main)');
  content = content.replace(/border-bottom:1px solid var\(--border-light\)/g, 'border-bottom:var(--border-main)');
  content = content.replace(/border-top:1px solid var\(--border-light\)/g, 'border-top:var(--border-main)');
  content = content.replace(/border-right:1px solid var\(--border-light\)/g, 'border-right:var(--border-main)');
  content = content.replace(/border-left:1px solid var\(--border-light\)/g, 'border-left:var(--border-main)');
  
  // Also any spaces: 'border: 1px solid var(--border-light)'
  content = content.replace(/border:\s*1px solid var\(--border-light\)/g, 'border: var(--border-main)');
  content = content.replace(/border-bottom:\s*1px solid var\(--border-light\)/g, 'border-bottom: var(--border-main)');
  content = content.replace(/border-top:\s*1px solid var\(--border-light\)/g, 'border-top: var(--border-main)');
  content = content.replace(/border-right:\s*1px solid var\(--border-light\)/g, 'border-right: var(--border-main)');
  content = content.replace(/border-left:\s*1px solid var\(--border-light\)/g, 'border-left: var(--border-main)');

  // Kanban col fix: border-radius:0 -> border-radius:var(--radius-card)
  content = content.replace(/border-radius:0;/g, 'border-radius:var(--radius-card);');
  
  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed styles in', file);
});

// Empty out legacy css files
fs.writeFileSync(path.join(dir, 'admin.css'), '', 'utf8');
fs.writeFileSync(path.join(dir, 'new_styles.css'), '', 'utf8');
console.log('Emptied legacy css files');
