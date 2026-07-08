const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// The replacement target
const target = '      <!-- USERS VIEW -->';
const insertion = '      </div>\n\n';

if (html.includes(target) && !html.includes('</div>\n      <!-- USERS VIEW -->')) {
    html = html.replace(target, insertion + target);
    fs.writeFileSync('admin.html', html);
    console.log("Successfully injected missing closing div");
} else {
    console.log("Could not find target or already injected");
}
