const fs = require('fs');
let js = fs.readFileSync('admin-workflow.js', 'utf8');

const regex = /async function loadDivisions\(\) \{[\s\S]*?if\(res\.success && res\.divisions\) \{/;
const goodLogic = `async function loadDivisions() {
    const res = await apiCall('divisions', { action: 'get_divisions' });
    if(res.success && res.divisions) {`;

js = js.replace(regex, goodLogic);

fs.writeFileSync('admin-workflow.js', js);
console.log('Fixed loadDivisions with regex.');
