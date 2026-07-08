const fs = require('fs');
let js = fs.readFileSync('admin.js', 'utf8');

// 1. TDZ FIX
js = js.replace(/let lastKnownUptime = 0;/, 'window.lastKnownUptime = window.lastKnownUptime || 0;');
js = js.replace(/let lastFetchTime = Date.now\(\);/, 'window.lastFetchTime = window.lastFetchTime || Date.now();');
js = js.replace(/lastKnownUptime = globalStats\.total_uptime;/, 'window.lastKnownUptime = globalStats.total_uptime;');
js = js.replace(/lastFetchTime = Date\.now\(\);/, 'window.lastFetchTime = Date.now();');
js = js.replace(/if \(\!el \|\| \!lastKnownUptime\) return;/, 'if (!el || !window.lastKnownUptime) return;');
js = js.replace(/const elapsed = Math\.floor\(\(Date\.now\(\) - lastFetchTime\) \/ 1000\);/, 'const elapsed = Math.floor((Date.now() - window.lastFetchTime) / 1000);');
js = js.replace(/el\.textContent = fmtTime\(lastKnownUptime \+ elapsed\);/, 'el.textContent = fmtTime(window.lastKnownUptime + elapsed);');
js = js.replace(/lastKnownUptime = data\.total_uptime;/g, 'window.lastKnownUptime = data.total_uptime;');
js = js.replace(/lastFetchTime = Date\.now\(\);/g, 'window.lastFetchTime = Date.now();');

// 2. Fix duplicate btn-remove-div
// Replace two identical if blocks with just one.
let btnDupStr = `if (window.currentDivisionId && window.currentDivisionId !== 'all') {
             actionsHtml += '<button class="btn-card danger btn-remove-div" data-email="' + email + '">Remove from Division</button>';
          }
          if (window.currentDivisionId && window.currentDivisionId !== 'all') {
             actionsHtml += '<button class="btn-card danger btn-remove-div" data-email="' + email + '">Remove from Division</button>';
          }`;
let btnSingleStr = `if (window.currentDivisionId && window.currentDivisionId !== 'all') {
             actionsHtml += '<button class="btn-card danger btn-remove-div" data-email="' + email + '">Remove from Division</button>';
          }`;
js = js.replace(btnDupStr, btnSingleStr);

// 3. Add event listener for btn-remove-div
let bindDelUserRegex = /card\.querySelector\('\.btn-del-user'\)\.onclick = async \(e\) => \{[\s\S]*?\}\n          \};\n        \}/;
if (bindDelUserRegex.test(js) && !js.includes('.btn-remove-div\').onclick')) {
    let bindRemoveDiv = `
        if (card.querySelector('.btn-remove-div')) {
          card.querySelector('.btn-remove-div').onclick = async (e) => {
             const targetEmail = e.target.getAttribute('data-email');
             if(window.removeMember) {
                 window.removeMember(targetEmail, window.currentDivisionId);
             }
          };
        }
`;
    js = js.replace(bindDelUserRegex, match => match + bindRemoveDiv);
}

fs.writeFileSync('admin.js', js);
console.log("All fixes applied");
