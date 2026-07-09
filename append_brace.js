const fs = require('fs');
fs.appendFileSync('admin-workflow.js', '\n}\n');
console.log('Appended brace');
