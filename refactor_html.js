const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// 1. We replace viewUsers and viewDivisions with our new viewUsers.
// The easiest way is to find the start of `<!-- USERS VIEW -->` and the start of `<!-- REVIEW TOOLS VIEW -->`
// and replace everything in between.
// Because viewTasks and viewDivisions are between them. Wait, no.
// Order is: USERS, TASKS, DIVISIONS, REVIEW TOOLS.
// If we replace USERS and DIVISIONS, what happens to TASKS?
// Let's keep TASKS where it is, and just replace USERS, and completely remove DIVISIONS.

const usersViewStart = html.indexOf('<!-- USERS VIEW -->');
const tasksViewStart = html.indexOf('<!-- TASKS VIEW -->');
const divisionsViewStart = html.indexOf('<!-- DIVISIONS VIEW -->');
const reviewToolsViewStart = html.indexOf('<!-- REVIEW TOOLS VIEW -->');

if (usersViewStart !== -1 && tasksViewStart !== -1 && divisionsViewStart !== -1 && reviewToolsViewStart !== -1) {
    const newUsersHTML = `      <!-- USERS & DIVISIONS VIEW -->
      <div id="viewUsers" class="view-section" style="flex-direction:row;">
        <!-- SIDEBAR -->
        <div style="width:250px; background:var(--bg-main); border-right:1px solid var(--border-light); display:flex; flex-direction:column; flex-shrink:0;">
            <div style="padding:16px 24px; border-bottom:1px solid var(--border-light); font-weight:700; font-family:var(--font-mono); font-size:16px;">
                Organization
            </div>
            <div id="divisionSidebarList" style="flex:1; overflow-y:auto; padding:16px 12px; display:flex; flex-direction:column; gap:4px;">
                <button id="btnDivFilterAll" class="btn" style="justify-content:flex-start; padding:8px 12px; text-align:left; border:1px solid var(--border-light); background:var(--accent); color:var(--bg-main);" onclick="window.selectDivision('all')">All Users</button>
                <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin:24px 0 8px 12px; letter-spacing:1px; font-family:var(--font-mono);">DIVISIONS</div>
                <!-- Dynamic divisions injected here -->
            </div>
            
            <div id="waConfigContainer" style="padding:16px; border-top:1px solid var(--border-light); display:none; background:var(--bg-card);">
                <div style="font-size:11px; font-weight:700; color:var(--text-main); margin-bottom:8px; font-family:var(--font-mono);">WhatsApp API</div>
                <input type="text" id="myWaInput" class="auth-input" placeholder="e.g. 62812..." style="width:100%; margin-bottom:8px; padding:6px; font-size:12px;">
                <button class="btn" id="btnSaveWa" style="width:100%; background:var(--accent); color:var(--bg-main); border:none; font-weight:700; padding:8px;">Save</button>
            </div>
        </div>
        
        <!-- MAIN CONTENT -->
        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-card); min-width:0;">
            <div class="toolbar" style="border-bottom:1px solid var(--border-light); padding:16px 24px; min-height: 80px; align-items:center;">
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div>
                        <h2 id="orgViewTitle" style="font-size:24px; font-weight:700; margin:0; letter-spacing:-0.5px;">All Users</h2>
                        <p id="orgViewDesc" style="font-size:13px; color:var(--text-muted); margin:6px 0 0 0; font-family:var(--font-mono);">Manage all registered members in the system.</p>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button id="btnAddDivisionMember" class="btn primary" style="display:none;" onclick="window.promptAddMember(window.currentDivisionId)">+ Add Member</button>
                        <button id="btnRefreshOrganization" class="btn" onclick="if(window.loadUsers) window.loadUsers(); if(window.loadDivisions) window.loadDivisions();">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                          Refresh
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="allUsersControls" style="padding:16px 24px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; background:var(--bg-main);">
                <div style="display:flex; gap:24px; align-items:center;">
                    <label class="switch-label">
                        <div class="switch">
                            <input type="checkbox" id="toggleSignup">
                            <span class="slider"></span>
                        </div>
                        Allow Sign Up
                    </label>
                    <label class="switch-label" style="color:var(--danger);">
                        <div class="switch">
                            <input type="checkbox" id="toggleMaintenance">
                            <span class="slider" style="background:transparent; border:1px solid var(--danger);"></span>
                        </div>
                        Maintenance
                    </label>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <input type="text" id="announcementText" class="auth-input" placeholder="Announcement message..." style="width:250px;">
                    <button id="btnSendAnnouncement" class="btn primary">Broadcast</button>
                </div>
            </div>
            
            <div class="user-filter-container" style="padding:12px 24px; display:flex; gap:12px; border-bottom:1px solid var(--border-light); font-family:var(--font-mono); background:var(--bg-main);">
                <input type="text" id="searchUsersInput" class="auth-input" placeholder="Search users..." style="width:200px; font-size:12px; padding:6px 12px; margin-right:12px;">
                <button class="btn user-filter active" data-filter="all" style="font-size:11px; padding:6px 16px;">ALL</button>
                <button class="btn user-filter" data-filter="online" style="font-size:11px; padding:6px 16px;">ONLINE</button>
                <button class="btn user-filter" data-filter="banned" style="font-size:11px; padding:6px 16px;">BANNED</button>
                <button class="btn user-filter" data-filter="admin" style="font-size:11px; padding:6px 16px;">ADMINS</button>
            </div>
            
            <div class="user-grid" id="userBrowser" style="padding:24px; flex:1; overflow-y:auto; align-content:start;">
                <!-- User items injected here -->
            </div>
        </div>
      </div>\n\n`;

    let beforeUsers = html.substring(0, usersViewStart);
    let tasksContent = html.substring(tasksViewStart, divisionsViewStart);
    let afterDivisions = html.substring(reviewToolsViewStart);
    
    // Also remove the "Divisions" tab from the bottom tabs dock
    let bottomTabRegex = /<div class="tab" data-target="viewDivisions"[\s\S]*?<\/div>/;
    afterDivisions = afterDivisions.replace(bottomTabRegex, '');

    fs.writeFileSync('admin.html', beforeUsers + newUsersHTML + tasksContent + afterDivisions);
    console.log("HTML restructuring applied");
} else {
    console.log("Error finding sections in admin.html");
}
