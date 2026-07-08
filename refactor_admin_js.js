const fs = require('fs');
let js = fs.readFileSync('admin.js', 'utf8');

// 1. Update loadUsers
let loadUsersRegex = /async function loadUsers\(\) \{[\s\S]*?renderUsers\(data\.users, bannedDevs\);[\s\S]*?renderDashboard\(data\.users, data\.globalStats\);/;
if (loadUsersRegex.test(js)) {
    let newLoadUsers = `async function loadUsers(divIdFilter = null) {
      window.loadUsers = loadUsers; // Export globally
      const filterToUse = divIdFilter || (window.currentDivisionId && window.currentDivisionId !== 'all' ? window.currentDivisionId : null);
      const userBrowser = document.getElementById('userBrowser');
      userBrowser.innerHTML = '<div style="padding:48px; color:var(--text-muted); text-align:center; font-size:18px;">Loading users... <div style="display:inline-block; width:20px; height:20px; border:3px solid rgba(255,255,255,0.3); border-radius:50%; border-top-color:#fff; animation:spin 1s ease-in-out infinite; margin-left:10px; vertical-align:middle;"></div></div>';
      try {
        let bannedDevs = [];
        try {
           const cfgData = await adminAction('get_config');
           if (cfgData && cfgData.success && cfgData.config) {
             bannedDevs = cfgData.config.bannedDevices || [];
           }
        } catch(e) { console.error("Error fetching config for banned devs:", e); }

        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${sessionToken}\` },
          body: JSON.stringify({ action: 'get_users' })
        });
        const data = await res.json();
        if (data.success) {
          let displayUsers = data.users;
          if (filterToUse && window.divisionData) {
              const div = window.divisionData.find(d => d.id === filterToUse);
              if (div && div.members) {
                  const memberEmails = div.members.map(m => typeof m === 'string' ? m : m.email);
                  displayUsers = displayUsers.filter(u => memberEmails.includes(u.email));
              } else {
                  displayUsers = [];
              }
          }
          window.lastLoadedUsers = displayUsers;
          window.lastBannedDevs = bannedDevs;
          renderUsers(displayUsers, bannedDevs);
          renderDashboard(data.users, data.globalStats);`;
    js = js.replace(loadUsersRegex, newLoadUsers);
} else {
    console.log("Failed to match loadUsers");
}

// 2. Export loadUsers immediately so it's available
if(js.includes('async function loadUsers(')) {
    js = js.replace('async function loadUsers(', 'window.loadUsers = loadUsers;\n    async function loadUsers(');
}

// 3. Update renderUsers to include "Remove from Division"
let btnActionsRegex = /if \(window\.isSuperAdmin\) \{/;
if (btnActionsRegex.test(js)) {
    let newActions = `if (window.isSuperAdmin) {
          if (window.currentDivisionId && window.currentDivisionId !== 'all') {
             actionsHtml += '<button class="btn-card danger btn-remove-div" data-email="' + email + '">Remove from Division</button>';
          }`;
    js = js.replace(btnActionsRegex, newActions);
}

let bindDelUserRegex = /if \(card\.querySelector\('\.btn-del-user'\)\) \{[\s\S]*?\}\n          \};\n        \}/;
if (bindDelUserRegex.test(js)) {
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
    // We insert it after the del-user binding
    js = js.replace(bindDelUserRegex, match => match + bindRemoveDiv);
}

// 4. Update the "itemCount" logic. itemCount doesn't exist in the HTML anymore! We didn't keep it in our new HTML.
// wait, `document.getElementById('itemCount').textContent = users.length + ' users';` is in renderUsers.
// If it crashes, we should fix it.
let itemCountRegex = /document\.getElementById\('itemCount'\)\.textContent = users\.length \+ ' users';/;
js = js.replace(itemCountRegex, "if(document.getElementById('itemCount')) document.getElementById('itemCount').textContent = users.length + ' users';");

fs.writeFileSync('admin.js', js);
console.log("admin.js patched successfully");
