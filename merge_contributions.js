const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// 1. Add "My Points" to Dashboard Analytics Column
const myPointsHtml = `            <div style="background:var(--bg-card); border:1px solid var(--border-light); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">MY POINTS</div>
              <div id="myPoints" style="font-size:36px; font-weight:700;">-</div>
              <div id="contributionStatus" style="margin-top:12px; font-size:13px; font-weight:600;"></div>
            </div>`;

// Insert after CURRENTLY ONLINE div in viewDashboard
html = html.replace(
  /<div id="dashOnlineCount"[^>]+>-<\/div>\s*<\/div>/,
  `$&
${myPointsHtml}`
);

// 2. Add "Top Contributors" Column to Dashboard, and change Activity Logs to flex:1
const leaderboardHtml = `
          <!-- Top Contributors Column -->
          <div style="flex:1; min-width:400px; background:var(--bg-card); border:1px solid var(--border-light); display:flex; flex-direction:column; max-height: calc(100vh - 120px);">
             <div style="padding:16px 24px; border-bottom:1px solid var(--border-light); font-weight:600; font-family:var(--font-mono);">Top Contributors</div>
             <div id="leaderboardList" style="flex:1; overflow-y:auto; padding:0; list-style:none;"></div>
          </div>`;

// Replace Activity Logs column flex:2 with flex:1 and append leaderboard
html = html.replace(
  /<div style="flex:2; min-width:400px; background:var\(--bg-card\); border:1px solid var\(--border-light\); display:flex; flex-direction:column; max-height: calc\(100vh - 120px\);">/g,
  '<div style="flex:1; min-width:400px; background:var(--bg-card); border:1px solid var(--border-light); display:flex; flex-direction:column; max-height: calc(100vh - 120px);">'
);

html = html.replace(
  /<\/div>\s*<!-- USERS VIEW -->/s,
  `  </div>
${leaderboardHtml}
        </div>
      </div>

      <!-- USERS VIEW -->`
);

// We need to be careful with the replacement. Let's use string operations.
let parts = html.split('<!-- USERS VIEW -->');
if (parts[0].includes('activityPlaceholder')) {
   // Assuming leaderboardHtml isn't already there
   if(!parts[0].includes('Top Contributors Column')) {
      let dashView = parts[0];
      // Find the end of dashboard-container
      // Actually simpler: just replace `</div>\n        </div>\n      </div>\n\n      <!-- USERS VIEW -->`
      // Wait, let's just do a manual replace using a clear anchor.
   }
}

// 3. Remove viewContributions
html = html.replace(/<!-- CONTRIBUTIONS VIEW -->.*?<!-- REVIEW TOOLS VIEW -->/s, '<!-- REVIEW TOOLS VIEW -->');

// 4. Remove Contributions tab
html = html.replace(/<div class="tab" data-target="viewContributions".*?<\/div>\s*<\/div>\s*<!--/s, '</div>\n    <!--');

fs.writeFileSync('admin.html', html);


let workflow = fs.readFileSync('admin-workflow.js', 'utf8');

// Export loadContributions
workflow = workflow.replace('async function loadContributions() {', 'window.loadContributions = async function() {');

// Tab click for Dashboard
workflow = workflow.replace("if(target === 'viewContributions') loadContributions();", "if(target === 'viewDashboard') window.loadContributions();");

// Check active on load
workflow = workflow.replace("if(document.getElementById('viewContributions')?.classList.contains('active')) loadContributions();", "if(document.getElementById('viewDashboard')?.classList.contains('active')) window.loadContributions();");

// Remove btnRefreshContributions binding
workflow = workflow.replace(/document\.getElementById\('btnRefreshContributions'\)\?\.addEventListener\('click', \(\) => \{\s*loadContributions\(\);\s*\}\);/, '');

fs.writeFileSync('admin-workflow.js', workflow);


let adminJs = fs.readFileSync('admin.js', 'utf8');

// Call loadContributions on Dashboard refresh
adminJs = adminJs.replace(
  /document\.getElementById\('btnRefreshDashboard'\)\.onclick = \(\) => \{\s*fetchHybridLogs\(\);\s*\};/,
  `document.getElementById('btnRefreshDashboard').onclick = () => {
      fetchHybridLogs();
      if(window.loadContributions) window.loadContributions();
    };`
);

// On superadmin login, call loadContributions
adminJs = adminJs.replace(
  /fetchHybridLogs\(\);/,
  `fetchHybridLogs();\n            if(window.loadContributions) window.loadContributions();`
);

fs.writeFileSync('admin.js', adminJs);

console.log("Merge completed.");
