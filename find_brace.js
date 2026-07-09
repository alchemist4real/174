const fs = require('fs');
const lines = fs.readFileSync('admin-workflow.js', 'utf8').split('\n');
let o = 0;
let lastUnmatchedLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Very simple count, ignoring strings/comments (which might be risky, but let's try)
    // Actually, let's just do a naive count first
    let inString = false;
    let strChar = null;
    let inRegex = false;
    for (let c = 0; c < line.length; c++) {
        let char = line[c];
        if (inString) {
            if (char === '\\') { c++; continue; }
            if (char === strChar) inString = false;
        } else {
            if (char === "'" || char === '"' || char === '`') {
                inString = true;
                strChar = char;
            } else if (char === '{') {
                o++;
                lastUnmatchedLine = i + 1;
            } else if (char === '}') {
                o--;
            }
        }
    }
}
console.log('Open braces:', o, 'Last opened line:', lastUnmatchedLine);
