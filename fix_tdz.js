const fs = require('fs');
let js = fs.readFileSync('admin.js', 'utf8');

// Replace let with var or window.
// In admin.js, around line 1205:
// let lastKnownUptime = 0;
// let lastFetchTime = Date.now();
// Change it to use window.
js = js.replace(/let lastKnownUptime = 0;/, 'window.lastKnownUptime = window.lastKnownUptime || 0;');
js = js.replace(/let lastFetchTime = Date.now\(\);/, 'window.lastFetchTime = window.lastFetchTime || Date.now();');

// Also inside renderDashboard
js = js.replace(/lastKnownUptime = globalStats\.total_uptime;/, 'window.lastKnownUptime = globalStats.total_uptime;');
js = js.replace(/lastFetchTime = Date\.now\(\);/, 'window.lastFetchTime = Date.now();');

// Also inside setInterval for uptime update
js = js.replace(/if \(\!el \|\| \!lastKnownUptime\) return;/, 'if (!el || !window.lastKnownUptime) return;');
js = js.replace(/const elapsed = Math\.floor\(\(Date\.now\(\) - lastFetchTime\) \/ 1000\);/, 'const elapsed = Math.floor((Date.now() - window.lastFetchTime) / 1000);');
js = js.replace(/el\.textContent = fmtTime\(lastKnownUptime \+ elapsed\);/, 'el.textContent = fmtTime(window.lastKnownUptime + elapsed);');

// And inside the 30s fetch loop
js = js.replace(/lastKnownUptime = data\.total_uptime;/, 'window.lastKnownUptime = data.total_uptime;');
// lastFetchTime was already replaced globally in the earlier replace, but let's be safe:
// Oh, the first `js = js.replace` only replaces the first instance! 
// Let's use global regex for the assignment
js = js.replace(/lastKnownUptime = data\.total_uptime;/g, 'window.lastKnownUptime = data.total_uptime;');
js = js.replace(/lastFetchTime = Date\.now\(\);/g, 'window.lastFetchTime = Date.now();');

fs.writeFileSync('admin.js', js);
console.log("Fixed TDZ error");
