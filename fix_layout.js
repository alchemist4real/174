const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const oldContainerStart = '<div class="dashboard-container" style="display:flex; padding:24px; gap:24px; flex-wrap:wrap; overflow-y:auto; flex: 1;">';
const newContainer = `        <div class="dashboard-container" style="display:flex; flex-direction:column; padding:24px; gap:24px; overflow-y:auto; flex: 1;">
          
          <!-- Analytics Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:24px;">
            <div style="background:var(--bg-card); border:1px solid var(--border-light); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">TOTAL USERS</div>
              <div id="dashTotalUsers" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:1px solid var(--border-light); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">TOTAL APP UPTIME</div>
              <div id="dashTotalUptime" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:1px solid var(--border-light); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">CURRENTLY ONLINE</div>
              <div id="dashOnlineCount" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:1px solid var(--border-light); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">MY POINTS</div>
              <div id="myPoints" style="font-size:36px; font-weight:700;">-</div>
              <div id="contributionStatus" style="margin-top:12px; font-size:13px; font-weight:600;"></div>
            </div>
          </div>

          <!-- Logs & Leaderboard Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:24px; flex:1;">
            
            <!-- Activity Logs Column -->
            <div style="background:var(--bg-card); border:1px solid var(--border-light); display:flex; flex-direction:column; max-height: calc(100vh - 200px);">
              <div style="padding:16px 24px; border-bottom:1px solid var(--border-light); font-weight:600; font-family:var(--font-mono);">Hybrid Activity Log (Logins & Live)</div>
              <div id="activityLogList" style="flex:1; overflow-y:auto; padding:0; list-style:none;">
                 <div id="activityPlaceholder" style="padding:24px; color:var(--text-muted); text-align:center;">Waiting for activity...</div>
              </div>
            </div>
            
            <!-- Top Contributors Column -->
            <div style="background:var(--bg-card); border:1px solid var(--border-light); display:flex; flex-direction:column; max-height: calc(100vh - 200px);">
               <div style="padding:16px 24px; border-bottom:1px solid var(--border-light); font-weight:600; font-family:var(--font-mono);">Top Contributors</div>
               <div id="leaderboardList" style="flex:1; overflow-y:auto; padding:0; list-style:none;"></div>
            </div>
            
          </div>
        </div>`;

// Delete everything from oldContainerStart to the end of viewDashboard.
// The end of viewDashboard is right before <!-- USERS VIEW -->
const startIndex = html.indexOf(oldContainerStart);
const endIndex = html.indexOf('      <!-- USERS VIEW -->');

if (startIndex !== -1 && endIndex !== -1) {
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);
    fs.writeFileSync('admin.html', before + newContainer + '\n\n' + after);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find boundaries.");
}
