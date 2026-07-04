const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaHZybGtpem9yc2N2ZWh0dHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjMwNzIsImV4cCI6MjA5MjgzOTA3Mn0.m6L3oEVAfyp2TjYmBCfDRo_30rdsWLEsGVZzRZIy3MU';
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    let sessionToken = null;
    let currentTree = [];
    let currentPath = '';
    let isGridMode = false;
    let selectedFiles = new Set();

    function sanitize(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    window.hybridLogs = [];
    
    window.fetchHybridLogs = async function() {
      try {
        const { data, error } = await supabaseClient.from('activity_logs').select('*').order('time', { ascending: false }).limit(100);
        if (!error && data) {
          window.hybridLogs = data.map(d => ({
            id: d.log_id,
            type: d.type,
            time: new Date(d.time).getTime(),
            user: d.user_name,
            email: d.email,
            devStr: d.dev_str
          }));
          window.renderHybridLogs();
        }
      } catch(e) { console.error("Error formatting hybrid logs:", e); }
    };
    
    window.renderHybridLogs = function() {
      var logList = document.getElementById('activityLogList');
      if (!logList) return;
      logList.innerHTML = '';
      
      var sorted = window.hybridLogs.slice().sort(function(a, b) { return b.time - a.time; });
      
      sorted.slice(0, 100).forEach(function(log) {
        var item = document.createElement('div');
        item.style.padding = '12px 24px';
        item.style.borderBottom = '1px solid var(--border-light)';
        item.style.animation = 'fadeIn 0.3s ease';
        
        var timeStr = new Date(log.time).toLocaleString();
        if (log.type === 'login') {
          item.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">' + timeStr + ' - [SYSTEM: LOGIN]</div>' +
            '<div style="font-weight:600;">' + sanitize(log.user) + '</div>' +
            '<div style="font-size:13px;">' + sanitize(log.email || '') + '</div>' +
            '<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Devices: ' + sanitize(log.devStr || 'Unknown') + '</div>';
        } else if (log.type === 'online') {
          item.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">' + timeStr + ' - [LIVE PRESENCE]</div>' +
            '<div style="font-weight:600; color:#4ADE80;">' + sanitize(log.user) + ' came online</div>';
        } else if (log.type === 'offline') {
          item.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">' + timeStr + ' - [LIVE PRESENCE]</div>' +
            '<div style="font-weight:600; color:var(--danger);">' + sanitize(log.user) + ' went offline</div>';
        }
        logList.appendChild(item);
      });
      if (sorted.length === 0) {
         logList.innerHTML = '<div id="activityPlaceholder" style="padding:24px; color:var(--text-muted); text-align:center;">Waiting for activity...</div>';
      }
    };
    
    window.addHybridLog = async function(log) {
       const exists = window.hybridLogs.find(l => l.id === log.id);
       if (!exists) {
          window.hybridLogs.push(log);
          window.hybridLogs.sort(function(a, b) { return b.time - a.time; });
          if (window.hybridLogs.length > 200) window.hybridLogs = window.hybridLogs.slice(0, 200);
          try {
             await supabaseClient.from('activity_logs').insert({
                log_id: log.id,
                type: log.type,
                time: new Date(log.time).toISOString(),
                user_name: log.user,
                email: log.email || null,
                dev_str: log.devStr || null
             });
          } catch(e) { console.error("Error inserting activity log:", e); }
       }
    };

    const authOverlay = document.getElementById('authOverlay');
    const authMessage = document.getElementById('authMessage');
    const statusText = document.getElementById('statusText');
    const fileBrowser = document.getElementById('fileBrowser');
    const pathBreadcrumbs = document.getElementById('pathBreadcrumbs');
    const itemCount = document.getElementById('itemCount');
    const fileInput = document.getElementById('fileInput');

    // Search Filter Logic
    document.getElementById('searchInput').addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('.file-item').forEach(el => {
        const name = el.querySelector('.file-name').textContent.toLowerCase();
        if (name.includes(val)) el.classList.remove('hidden');
        else el.classList.add('hidden');
      });
    });

    // Custom Modals Logic
    function customPrompt(title, defaultValue = '') {
      return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnCancel = document.getElementById('promptCancel');
        const btnConfirm = document.getElementById('promptConfirm');

        titleEl.textContent = title;
        inputEl.value = defaultValue;
        inputEl.style.display = 'block';
        modal.classList.remove('hidden');
        inputEl.focus();

        const cleanup = () => {
          modal.classList.add('hidden');
          btnCancel.onclick = null;
          btnConfirm.onclick = null;
        };

        btnCancel.onclick = () => { cleanup(); resolve(null); };
        btnConfirm.onclick = () => { cleanup(); resolve(inputEl.value); };
      });
    }

    function customConfirm(title) {
      return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnCancel = document.getElementById('promptCancel');
        const btnConfirm = document.getElementById('promptConfirm');

        titleEl.textContent = title;
        inputEl.style.display = 'none';
        modal.classList.remove('hidden');

        const cleanup = () => {
          modal.classList.add('hidden');
          btnCancel.onclick = null;
          btnConfirm.onclick = null;
        };

        btnCancel.onclick = () => { cleanup(); resolve(false); };
        btnConfirm.onclick = () => { cleanup(); resolve(true); };
      });
    }

    // Init Auth
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        verifyAdmin(session);
      } else {
        redirectToHome("Not logged in. Redirecting...");
      }
    }).catch(err => {
      redirectToHome("Session error: " + err.message);
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        redirectToHome("Signed out. Redirecting...");
      }
    });

    async function verifyAdmin(session) {
      sessionToken = session.access_token;
      document.getElementById('userBadge').textContent = session.user.email;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action: 'check' }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        
        if (res.ok && data.success) {
          authOverlay.classList.add('hidden');
          if (data.isSuperAdmin) {
            window.isSuperAdmin = true;
            document.getElementById('adminTabs').style.display = 'flex';
            loadUsers();
            fetchHybridLogs();
            
            try {
              if (supabaseClient) {
                window.sessionRoom = supabaseClient.channel('online-users', {
                  config: { broadcast: { self: true, ack: true } }
                });
                window.sessionRoom.on('presence', { event: 'sync' }, () => {
                  const state = window.sessionRoom.presenceState();
                  const count = Object.keys(state).length;
                  const el = document.getElementById('dashOnlineCount');
                  if(el) el.textContent = count;
                  // Mark online user cards
                  var cards = document.querySelectorAll('#userBrowser .user-card');
                  cards.forEach(function(c) { c.setAttribute('data-online', 'false'); });
                  Object.values(state).forEach(function(presences) {
                    presences.forEach(function(p) {
                      if(p.user) {
                        cards.forEach(function(c) {
                          if(c.querySelector('.user-email') && c.querySelector('.user-email').textContent === p.email) {
                            c.setAttribute('data-online', 'true');
                          }
                        });
                      }
                    });
                  });
                }).on('presence', { event: 'join' }, ({ key, newPresences }) => {
                  console.log('Presence join:', newPresences);
                  newPresences.forEach(function(p) {
                    var name = (p.email || p.user || 'Unknown');
                    window.addHybridLog({
                       id: 'online_' + name + '_' + Date.now(),
                       type: 'online',
                       time: Date.now(),
                       user: name
                    });
                  });
                  window.renderHybridLogs();
                }).on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                  console.log('Presence leave:', leftPresences);
                  leftPresences.forEach(function(p) {
                    var name = (p.email || p.user || 'Unknown');
                    window.addHybridLog({
                       id: 'offline_' + name + '_' + Date.now(),
                       type: 'offline',
                       time: Date.now(),
                       user: name
                    });
                  });
                  window.renderHybridLogs();
                }).subscribe(async (status) => {
                   if (status === 'SUBSCRIBED') {
                      var tEmail = document.getElementById('userBadge').textContent || 'Admin';
                      var tNow = Date.now();
                      await window.sessionRoom.track({ user: 'auth-user', email: tEmail, joined_at: new Date().toISOString() });
                      
                      window.addHybridLog({
                         id: 'online_' + tEmail + '_' + tNow,
                         type: 'online',
                         time: tNow,
                         user: tEmail
                      });
                      window.renderHybridLogs();
                   }
                });
                
                window.sessionRoom.on('broadcast', { event: 'users_changed' }, () => {
                  // Legacy broadcast handling removed in favor of postgres_changes
                  // loadUsers();
                });

                // Real-time Database Subscriptions
                const updateAndRender = () => {
                  if (window.lastLoadedUsers && window.lastBannedDevs) {
                    renderUsers(window.lastLoadedUsers, window.lastBannedDevs);
                    const dashTotalUsers = document.getElementById('dashTotalUsers');
                    if (dashTotalUsers) dashTotalUsers.textContent = window.lastLoadedUsers.length;
                  }
                };

                window.dbChannel = supabaseClient.channel('db-changes')
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
                     if (!window.lastLoadedUsers) return;
                     if (payload.eventType === 'DELETE') {
                       window.lastLoadedUsers = window.lastLoadedUsers.filter(u => u.id !== payload.old.id);
                     } else if (payload.eventType === 'INSERT') {
                       window.lastLoadedUsers.push({
                         id: payload.new.id,
                         email: payload.new.email,
                         created_at: payload.new.created_at,
                         user_metadata: { username: payload.new.username },
                         app_metadata: { banned: payload.new.banned },
                         role: 'user'
                       });
                     } else if (payload.eventType === 'UPDATE') {
                       const u = window.lastLoadedUsers.find(u => u.id === payload.new.id);
                       if (u) {
                         u.email = payload.new.email;
                         u.user_metadata = u.user_metadata || {};
                         u.user_metadata.username = payload.new.username;
                         u.app_metadata = u.app_metadata || {};
                         u.app_metadata.banned = payload.new.banned;
                       }
                     }
                     updateAndRender();
                  })
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, payload => {
                     if (!window.lastLoadedUsers) return;
                     if (payload.eventType === 'DELETE') {
                       const u = window.lastLoadedUsers.find(u => u.email === payload.old.identifier || (u.user_metadata||{}).username === payload.old.identifier);
                       if (u) u.role = 'user';
                     } else {
                       const u = window.lastLoadedUsers.find(u => u.email === payload.new.identifier || (u.user_metadata||{}).username === payload.new.identifier);
                       if (u) u.role = payload.new.role;
                     }
                     updateAndRender();
                  })
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'user_devices' }, payload => {
                     // For simplicity, we just trigger a full reload when devices change, 
                     // or we can optimize if needed. Full reload is safer for complex nested arrays.
                     loadUsers();
                  })
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, payload => {
                     loadUsers();
                  })
                  .subscribe();
                
                const btnSendAnn = document.getElementById('btnSendAnnouncement');
                if (btnSendAnn) {
                  btnSendAnn.onclick = async () => {
                     const txt = document.getElementById('announcementText').value;
                     if (!txt) return;
                     btnSendAnn.textContent = '...';
                     await window.sessionRoom.send({
                        type: 'broadcast',
                        event: 'announcement',
                        payload: { message: txt }
                     });
                     document.getElementById('announcementText').value = '';
                     btnSendAnn.textContent = 'Sent!';
                     setTimeout(() => { btnSendAnn.textContent = 'Broadcast'; }, 2000);
                  };
                }
              }

              const cfgRes = await adminAction('get_config');
              const toggle = document.getElementById('toggleSignup');
              const toggleMaint = document.getElementById('toggleMaintenance');
              
              if(cfgRes && cfgRes.success) {
                window.configSha = cfgRes.sha;
                const configObj = cfgRes.config;
                toggle.checked = configObj.allowSignup !== false;
                toggleMaint.checked = configObj.maintenanceMode === true;
              } else {
                window.configSha = null;
                toggle.checked = true;
                toggleMaint.checked = false;
              }
              
              const updateConfig = async () => {
                const isAllowed = toggle.checked;
                const isMaint = toggleMaint.checked;
                
                await adminAction('update_config', { allowSignup: isAllowed, maintenanceMode: isMaint });
              };
              
              toggle.onchange = updateConfig;
              toggleMaint.onchange = async (e) => {
                 await updateConfig();
                 if (window.sessionRoom) {
                   await window.sessionRoom.send({
                      type: 'broadcast',
                      event: e.target.checked ? 'maintenance_on' : 'maintenance_off',
                      payload: {}
                   });
                 }
              };
            } catch(e) { console.error("Config fetch error:", e); }
          }
          loadTree();
        } else {
          redirectToHome(data.error || "Forbidden. You are not an admin.");
        }
      } catch(e) {
        redirectToHome(e.name === 'AbortError' ? "Verification timed out (15s)." : "Verification failed: " + e.message);
      }
    }

    function redirectToHome(msg) {
      authOverlay.classList.remove('hidden');
      authMessage.textContent = msg;
      setTimeout(() => { window.location.href = '/'; }, 1500);
    }

    document.getElementById('btnSignOut').onclick = async () => {
      await supabaseClient.auth.signOut();
    };

    // Load Data
    async function loadTree() {
      statusText.textContent = 'Fetching repository...';
      fileBrowser.innerHTML = '';
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action: 'tree' })
        });
        const data = await res.json();
        if (data.success && data.tree) {
          currentTree = data.tree.filter(i => i.path.startsWith('content/') || i.path.startsWith('cover/'));
          renderBrowser();
          statusText.textContent = 'Repository loaded.';
        } else {
          statusText.textContent = 'Failed to load tree: ' + data.error;
        }
      } catch(e) {
        statusText.textContent = 'Error: ' + e.message;
      }
    }

    function renderBrowser() {
      fileBrowser.innerHTML = '';
      
      // Breadcrumbs
      if (currentPath === '') {
        pathBreadcrumbs.innerHTML = '';
      } else {
        const parts = currentPath.replace(/\/$/, '').split('/');
        let html = '';
        let buildPath = '';
        parts.forEach((p, i) => {
          buildPath += p + '/';
          const isLast = i === parts.length - 1;
          html += `<span class="path-separator">/</span><span class="${isLast ? '' : 'path-link'}" data-path="${buildPath}">${p}</span>`;
        });
        pathBreadcrumbs.innerHTML = html;
        
        document.querySelectorAll('.path-link').forEach(el => {
          el.addEventListener('click', (e) => {
            currentPath = e.target.getAttribute('data-path');
            renderBrowser();
          });
        });
      }

      document.getElementById('pathRoot').onclick = () => { currentPath = ''; renderBrowser(); };

      // Map contents
      let items = new Map();
      currentTree.forEach(item => {
        if (item.path.startsWith(currentPath)) {
          const remainder = item.path.substring(currentPath.length);
          if (remainder.length === 0) return;
          
          const parts = remainder.split('/');
          const name = parts[0];
          const isFile = parts.length === 1 && item.type === 'blob';
          
          if (!items.has(name)) {
            items.set(name, {
              name: name,
              type: isFile ? 'file' : 'folder',
              path: currentPath + name + (isFile ? '' : '/'),
              sha: isFile ? item.sha : null
            });
          }
        }
      });

      const sortedItems = Array.from(items.values()).sort((a,b) => {
        if(a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });

      if (sortedItems.length === 0 && currentPath === '') {
        sortedItems.push({name: 'content', type: 'folder', path: 'content/', sha: null});
        sortedItems.push({name: 'cover', type: 'folder', path: 'cover/', sha: null});
      }

      itemCount.textContent = `${sortedItems.length} items`;

      if (sortedItems.length === 0 && currentPath !== '') {
        fileBrowser.innerHTML = '<div style="padding:24px; color:#666; text-align:center;">Folder is empty</div>';
      }

      sortedItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        let icon = '';
        const isImg = item.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (item.type === 'folder') {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        } else if (isImg) {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        } else {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
        }
        
        let cbHtml = '';
        if (item.type !== 'folder') {
          cbHtml = `<input type="checkbox" class="file-checkbox" data-path="${item.path}" data-sha="${item.sha}" ${selectedFiles.has(item.path) ? 'checked' : ''}>`;
        }
        
        div.innerHTML = `
          ${cbHtml}
          <div class="file-icon">${icon}</div>
          <div class="file-name" title="${item.name}">${item.name}</div>
          <div class="file-actions">
            ${item.type !== 'folder' ? `<button class="btn btn-actions" style="font-family:var(--font-mono); font-size:16px; padding:4px 8px; background:transparent; border:none; cursor:pointer;" data-json='${encodeURIComponent(JSON.stringify(item))}'>⋮</button>` : ''}
          </div>
        `;

        if (item.type === 'folder') {
          div.querySelector('.file-name').onclick = () => {
            currentPath = item.path;
            renderBrowser();
          };
        } else {
          div.querySelector('.file-name').onclick = () => {
             showPreview(item, isImg);
          };
        }

        const cb = div.querySelector('.file-checkbox');
        if (cb) {
          cb.onchange = (e) => {
            if (e.target.checked) selectedFiles.add(item.path);
            else selectedFiles.delete(item.path);
            updateBulkDeleteUI();
          };
        }

        const btnAct = div.querySelector('.btn-actions');
        if (btnAct) {
          btnAct.onclick = () => openContextModal(item);
        }

        fileBrowser.appendChild(div);
      });
    }

    function openContextModal(item) {
      const modal = document.getElementById('contextModal');
      const container = document.getElementById('contextActions');
      document.getElementById('contextTitle').textContent = item.name; // textContent is safe
      
      let html = '';
      if (item.type !== 'folder') {
        if (item.name.endsWith('.html')) html += `<button class="btn" id="ctxEdit">Edit Code</button>`;
        html += `<button class="btn" id="ctxDownload">Download</button>`;
        html += `<button class="btn" id="ctxMove">Move</button>`;
        html += `<button class="btn" id="ctxRename">Rename</button>`;
      }
      html += `<button class="btn danger" id="ctxDelete">Delete</button>`;
      container.innerHTML = html;
      
      modal.classList.remove('hidden');
      
      if (document.getElementById('ctxEdit')) {
        document.getElementById('ctxEdit').onclick = async () => {
          modal.classList.add('hidden');
          openEditor(item);
        };
      }
      if (document.getElementById('ctxDownload')) {
        document.getElementById('ctxDownload').onclick = () => {
          modal.classList.add('hidden');
          const rawUrl = `https://raw.githubusercontent.com/alchemist4real/MR-CAPSULES/main/${item.path}`;
          const a = document.createElement('a'); a.href = rawUrl; a.download = item.name; a.target = '_blank';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
      }
      if (document.getElementById('ctxMove')) {
        document.getElementById('ctxMove').onclick = async (e) => {
          modal.classList.add('hidden');
          const newDir = await customPrompt("Enter new directory path (e.g. content/semester 1/):", currentPath);
          if (!newDir || newDir === currentPath) return;
          adminAction('rename_file', { path: item.path, newPath: newDir.replace(/\/$/, '') + '/' + item.name }).then(() => loadTree());
        };
      }
      if (document.getElementById('ctxRename')) {
        document.getElementById('ctxRename').onclick = async () => {
          modal.classList.add('hidden');
          const newName = await customPrompt("Enter new file name:", item.name);
          if (!newName || newName === item.name) return;
          adminAction('rename_file', { path: item.path, newPath: currentPath + newName }).then(() => loadTree());
        };
      }
      document.getElementById('ctxDelete').onclick = async () => {
        modal.classList.add('hidden');
        if(item.type === 'folder') { customAlert('Folder deletion not supported directly.'); return; }
        if(await customConfirm('Delete ' + item.path + '?')) {
          adminAction('delete', { path: item.path, sha: item.sha }).then(() => loadTree());
        }
      };
    }

    async function adminAction(action, payload) {
      statusText.textContent = `Processing ${action}...`;
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action, ...payload })
        });
        const data = await res.json();
        if (data.success) {
          statusText.textContent = `Success: ${action}`;
          showToast(`Action successful: ${action.replace('_', ' ')}`, 'success');
          
          if (['ban_user', 'delete_user', 'add_admin', 'remove_admin'].includes(action)) {
            setTimeout(loadUsers, 500); // Force UI refresh for user management actions
          } else if (action !== 'get_config' && action !== 'get_users') {
            setTimeout(loadTree, 1000); // Reload file tree for file actions
          }
          return data;
        } else {
          statusText.textContent = `Error: ${data.error}`;
          return null;
        }
      } catch(e) {
        statusText.textContent = `Error: ${e.message}`;
        return null;
      }
    }

    // Actions
    document.getElementById('btnRefresh').onclick = loadTree;
    
    document.getElementById('btnToggleView').onclick = () => {
      isGridMode = !isGridMode;
      if (isGridMode) {
        fileBrowser.classList.add('grid-mode');
        document.getElementById('iconList').innerHTML = '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>';
      } else {
        fileBrowser.classList.remove('grid-mode');
        document.getElementById('iconList').innerHTML = '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>';
      }
    };

    document.getElementById('btnBulkDelete').onclick = async () => {
      if (selectedFiles.size === 0) return;
      if (!(await customConfirm(`Delete ${selectedFiles.size} selected files?`))) return;
      
      const filesToDelete = [];
      selectedFiles.forEach(path => {
        const item = currentTree.find(i => i.path === path);
        if (item && item.type !== 'folder') {
          filesToDelete.push({ path: item.path, sha: item.sha });
        }
      });
      
      document.getElementById('btnBulkDelete').textContent = 'Deleting...';
      adminAction('delete_files', { files: filesToDelete }).then(() => {
        selectedFiles.clear();
        updateBulkDeleteUI();
        loadTree();
      });
    };

    const viewFilesEl = document.getElementById('viewFiles');
    const dragOverlay = document.getElementById('dragOverlay');
    
    viewFilesEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragOverlay.classList.add('drag-active');
    });
    viewFilesEl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (e.relatedTarget && !viewFilesEl.contains(e.relatedTarget)) {
        dragOverlay.classList.remove('drag-active');
      }
    });
    viewFilesEl.addEventListener('drop', (e) => {
      e.preventDefault();
      dragOverlay.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFilesSequential(Array.from(e.dataTransfer.files));
      }
    });

    document.getElementById('lightboxClose').onclick = () => {
      document.getElementById('lightboxModal').classList.add('hidden');
      document.getElementById('lightboxImage').classList.add('hidden');
      document.getElementById('lightboxText').classList.add('hidden');
    };

    function updateBulkDeleteUI() {
      const btn = document.getElementById('btnBulkDelete');
      if (selectedFiles.size > 0) {
        btn.style.display = 'flex';
        document.getElementById('bulkCount').textContent = selectedFiles.size;
      } else {
        btn.style.display = 'none';
      }
    }

    async function showPreview(item, isImg) {
      if (!isImg && (item.name.endsWith('.html') || item.name.endsWith('.css') || item.name.endsWith('.js'))) {
        openEditor(item);
        return;
      }
      
      const modal = document.getElementById('lightboxModal');
      const img = document.getElementById('lightboxImage');
      const txt = document.getElementById('lightboxText');
      modal.classList.remove('hidden');
      img.classList.add('hidden');
      txt.classList.add('hidden');

      const rawUrl = `https://raw.githubusercontent.com/alchemist4real/MR-CAPSULES/main/${item.path}`;

      // Update Header
      document.getElementById('lightboxFilename').textContent = item.name;
      
      document.getElementById('lightboxBtnNewTab').onclick = () => {
        window.open(rawUrl, '_blank');
      };
      document.getElementById('lightboxBtnDownload').onclick = () => {
        const a = document.createElement('a'); a.href = rawUrl; a.download = item.name; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      };

      if (isImg) {
        img.src = rawUrl;
        img.classList.remove('hidden');
      } else {
        txt.textContent = "Loading preview...";
        txt.classList.remove('hidden');
        try {
          const r = await fetch(rawUrl);
          const text = await r.text();
          txt.textContent = text;
        } catch(e) {
          txt.textContent = "Failed to load content preview. You can open it in GitHub directly: " + `https://github.com/alchemist4real/MR-CAPSULES/blob/main/${item.path}`;
        }
      }
    }
    
    let editorLiveUpdateTimeout = null;
    let isFullscreen = false;

    async function openEditor(item) {
      window.currentEditorItem = item;
      const rawUrl = `https://raw.githubusercontent.com/alchemist4real/MR-CAPSULES/main/${item.path}`;
      const emodal = document.getElementById('editorModal');
      const emodalContainer = document.getElementById('editorModalContainer');
      document.getElementById('editorTitle').textContent = `Editing: ${item.name}`;
      emodal.classList.remove('hidden');
      
      const iframe = document.getElementById('editorPreview');
      
      if (!window.cmEditor) {
        window.cmEditor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), { 
          lineNumbers: true, 
          mode: "htmlmixed", 
          theme: "darcula",
          autoCloseBrackets: true,
          autoCloseTags: true,
          lineWrapping: true,
          extraKeys: {"Ctrl-F": "findPersistent"}
        });

        // Setup live preview debounce
        window.cmEditor.on("change", () => {
          clearTimeout(editorLiveUpdateTimeout);
          editorLiveUpdateTimeout = setTimeout(() => {
             if (window.currentEditorItem && window.currentEditorItem.name.endsWith('.html')) {
                iframe.srcdoc = window.cmEditor.getValue();
             }
          }, 800);
        });

        // Setup resizer
        const resizer = document.getElementById('editorResizer');
        const editorPane = document.getElementById('editorPane');
        const previewPane = document.getElementById('previewPane');
        const splitContainer = document.getElementById('editorSplitContainer');
        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
          isResizing = true;
          resizer.classList.add('dragging');
          iframe.style.pointerEvents = 'none'; // Prevent iframe from swallowing mouse events
        });

        document.addEventListener('mousemove', (e) => {
          if (!isResizing) return;
          const containerRect = splitContainer.getBoundingClientRect();
          let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
          if (newWidth < 10) newWidth = 10;
          if (newWidth > 90) newWidth = 90;
          editorPane.style.width = `${newWidth}%`;
          previewPane.style.width = `${100 - newWidth}%`;
        });

        document.addEventListener('mouseup', () => {
          if (isResizing) {
            isResizing = false;
            resizer.classList.remove('dragging');
            // Re-enable pointer events if it's not being dragged
            iframe.style.pointerEvents = 'auto';
            window.cmEditor.refresh();
          }
        });
      }
      
      try {
        const r = await fetch(rawUrl);
        const text = await r.text();
        window.cmEditor.setValue(text);
        if (item.name.endsWith('.html')) {
           iframe.srcdoc = text;
        } else {
           iframe.srcdoc = `<html><body style="font-family:monospace; padding:20px; color:#666;">Preview not available for this file type.</body></html>`;
        }
      } catch(e) {
        window.cmEditor.setValue("Error loading file: " + e.message);
      }
      setTimeout(() => window.cmEditor.refresh(), 100);
      
      document.getElementById('editorFullscreen').onclick = () => {
         isFullscreen = !isFullscreen;
         if(isFullscreen) {
            emodalContainer.classList.add('fullscreen');
         } else {
            emodalContainer.classList.remove('fullscreen');
         }
         setTimeout(() => window.cmEditor.refresh(), 100);
      };

      document.getElementById('editorClose').onclick = () => emodal.classList.add('hidden');
      document.getElementById('editorCancel').onclick = () => emodal.classList.add('hidden');
      document.getElementById('editorSave').onclick = async (ev) => {
        ev.target.textContent = 'Saving...';
        const content = window.cmEditor.getValue();
        const base64 = btoa(unescape(encodeURIComponent(content)));
        await adminAction('upload', { path: item.path, contentBase64: base64, sha: item.sha });
        ev.target.textContent = 'Save Changes';
        emodal.classList.add('hidden');
        loadTree();
      };
    }
    
    async function uploadFilesSequential(files) {
      let processed = 0;
      statusText.textContent = `Uploading 0/${files.length}...`;

      for (const file of files) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(file);
        });

        const path = currentPath + file.name;
        const existing = currentTree.find(i => i.path === path);
        
        await adminAction('upload', { path, contentBase64: base64, sha: existing ? existing.sha : null });
        processed++;
        statusText.textContent = `Uploaded ${processed}/${files.length}`;
      }
      loadTree();
    }

    document.getElementById('btnUpload').onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        uploadFilesSequential(Array.from(e.target.files));
      }
    };

    document.getElementById('btnNewFolder').onclick = async () => {
      const name = await customPrompt("Enter new folder name:");
      if(name && name.trim()) {
        const path = currentPath + name.trim() + '/.gitkeep';
        const base64 = btoa(' '); 
        adminAction('upload', { path, contentBase64: base64 });
      }
    };

    // Tabs Logic
    document.querySelectorAll('.tab').forEach(t => {
      t.onclick = (e) => {
        const targetTab = e.currentTarget;
        document.querySelectorAll('.tab').forEach(tx => tx.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(vx => vx.classList.remove('active'));
        targetTab.classList.add('active');
        document.getElementById(targetTab.getAttribute('data-target')).classList.add('active');
      }
    });

    // Users Logic
    async function loadUsers() {
      const userBrowser = document.getElementById('userBrowser');
      userBrowser.innerHTML = '<div style="padding:24px; color:#666; text-align:center;">Loading users...</div>';
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action: 'get_users' })
        });
        const data = await res.json();
        if (data.success) {
          window.lastLoadedUsers = data.users;
          window.lastBannedDevs = bannedDevs;
          renderUsers(data.users, bannedDevs);
          renderDashboard(data.users, data.globalStats);
        } else {
          userBrowser.innerHTML = `<div style="padding:24px; color:var(--danger);">Failed to load users: ${data.error}</div>`;
        }
      } catch(e) {
        userBrowser.innerHTML = `<div style="padding:24px; color:var(--danger);">Error: ${e.message}</div>`;
      }
    }

    function renderDashboard(users, globalStats) {
      document.getElementById('dashTotalUsers').textContent = users.length;
      
      function fmtTime(sec) {
        sec = parseInt(sec, 10) || 0;
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        if (d > 0) return d + 'd ' + h + ':' + m + ':' + s;
        return h + ':' + m + ':' + s;
      }
      
      // Use globalStats from the backend API (bypasses RLS)
      var uptimeEl = document.getElementById('dashTotalUptime');
      if (globalStats && globalStats.total_uptime !== undefined) {
        uptimeEl.textContent = fmtTime(globalStats.total_uptime);
      } else {
        uptimeEl.textContent = '00:00:00';
      }
      
      users.forEach(function(u) {
        if (!u.last_sign_in_at) return;
        var meta = u.user_metadata || {};
        var devArr = Array.isArray(meta.devices) ? meta.devices : [];
        var devStr = devArr.length > 0 ? devArr.map(function(d){ return d.id.substr(0,10); }).join(', ') : (meta.deviceId || 'Unknown');
        
        window.addHybridLog({
           id: 'login_' + u.id + '_' + u.last_sign_in_at,
           type: 'login',
           time: new Date(u.last_sign_in_at).getTime(),
           user: (meta.username || 'Unknown'),
           email: u.email,
           devStr: devStr
        });
      });
      window.renderHybridLogs();
    }

    function renderUsers(users, bannedDevs) {
      bannedDevs = bannedDevs || [];
      var userBrowser = document.getElementById('userBrowser');
      userBrowser.innerHTML = '';
      document.getElementById('itemCount').textContent = users.length + ' users';

      users.forEach(function(u) {
        var email = u.email;
        var meta = u.user_metadata || {};
        var appMeta = u.app_metadata || {};
        var username = meta.username || '-';
        var isBanned = appMeta.banned === true || meta.banned === true;
        
        var devices = Array.isArray(meta.devices) ? meta.devices.slice() : [];
        if (typeof meta.deviceId === 'string' && !devices.some(function(d){ return d.id === meta.deviceId; })) {
           devices.push({ id: meta.deviceId, added: u.created_at });
        }
        
        var isAdmin = u.role === 'admin';

        var card = document.createElement('div');
        card.className = 'user-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        
        var badgesHtml = '';
        if (isAdmin) badgesHtml += '<span class="badge badge-admin">ADMIN</span>';
        if (isBanned) badgesHtml += '<span class="badge badge-banned">BANNED</span>';

        // Build devices HTML using string concat to avoid nested template literal issues
        var devicesHtml = '';
        if (devices.length > 0) {
           var devRows = '';
           for (var di = 0; di < devices.length; di++) {
              var dev = devices[di];
              var isDevBanned = bannedDevs.includes(dev.id);
              devRows += '<div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 0;">';
              devRows += '<span style="font-family:var(--font-mono); font-size:12px;">' + dev.id.substr(0,14) + '...</span>';
              devRows += '<button class="btn-card ' + (isDevBanned ? 'primary' : 'danger') + ' btn-block-dev" style="padding: 2px 8px; font-size: 11px;" data-dev="' + dev.id + '" data-banned="' + isDevBanned + '">';
              devRows += (isDevBanned ? 'Unban Dev' : 'Block Dev');
              devRows += '</button></div>';
           }
           devicesHtml = '<div style="margin-top:12px; font-size:13px; color:var(--text-muted); border-top:1px solid var(--border-light); padding-top:10px;">';
           devicesHtml += '<div style="font-weight:600; margin-bottom:6px;">Known Devices (' + devices.length + ')</div>';
           devicesHtml += devRows + '</div>';
        } else {
           devicesHtml = '<div style="margin-top:12px; font-size:13px; color:var(--text-muted); border-top:1px solid var(--border-light); padding-top:10px;">No known devices yet.</div>';
        }

        // Build card actions
        var actionsHtml = '';
        if (window.isSuperAdmin) {
          if (isAdmin) {
            actionsHtml += '<button class="btn-card btn-revoke" data-target="' + email + '">Revoke Admin</button>';
          } else {
            actionsHtml += '<button class="btn-card primary btn-make-admin" data-target="' + email + '">Make Admin</button>';
          }
          actionsHtml += '<button class="btn-card ' + (isBanned ? 'primary' : 'danger') + ' btn-ban" data-id="' + u.id + '" data-banned="' + isBanned + '">';
          actionsHtml += (isBanned ? 'Unban' : 'Ban') + '</button>';
          actionsHtml += '<button class="btn-card danger btn-del-user" data-id="' + u.id + '">Delete</button>';
        }

        card.setAttribute('data-banned', isBanned ? 'true' : 'false');
        card.setAttribute('data-admin', isAdmin ? 'true' : 'false');
        card.setAttribute('data-online', 'false');

        card.innerHTML = '<div class="user-card-header">' +
          '<div><div class="user-email">' + sanitize(email) + '</div>' +
          '<div class="user-meta">@' + sanitize(username) + ' &bull; ' + new Date(u.created_at).toLocaleDateString() + '</div></div>' +
          '<div class="user-badges">' + badgesHtml + '</div></div>' +
          '<div class="card-actions">' + actionsHtml + '</div>' +
          devicesHtml;

        if (card.querySelector('.btn-make-admin')) {
          card.querySelector('.btn-make-admin').onclick = async (e) => {
            if(await customConfirm(`Make ${email} an Admin?`)) {
              e.target.textContent = '...';
              adminAction('add_admin', { targetUserId: u.id, identifier: email }).catch(() => e.target.textContent = 'Make Admin');
            }
          };
        }

        if (card.querySelector('.btn-revoke')) {
          card.querySelector('.btn-revoke').onclick = async (e) => {
            if(await customConfirm(`Remove admin privileges for ${email}?`)) {
              e.target.textContent = '...';
              adminAction('remove_admin', { identifier: email }).catch(() => e.target.textContent = 'Revoke Admin');
            }
          };
        }

        if (card.querySelector('.btn-ban')) {
          card.querySelector('.btn-ban').onclick = async (e) => {
            const actionText = isBanned ? 'unban' : 'ban';
            if(await customConfirm(`Are you sure you want to ${actionText} ${email}?`)) {
              e.target.textContent = '...';
              adminAction('ban_user', { userId: u.id, banned: !isBanned }).catch(() => e.target.textContent = actionText === 'ban' ? 'Ban' : 'Unban');
            }
          };
        }

        if (card.querySelector('.btn-del-user')) {
          card.querySelector('.btn-del-user').onclick = async (e) => {
            if(await customConfirm(`WARNING: This will permanently delete the user ${email} from the database. This action cannot be undone. Proceed?`)) {
              e.target.textContent = '...';
              adminAction('delete_user', { userId: u.id }).catch(() => e.target.textContent = 'Delete');
            }
          };
        }

        const devBtns = card.querySelectorAll('.btn-block-dev');
        devBtns.forEach(btn => {
          btn.onclick = async (e) => {
             const devId = e.target.getAttribute('data-dev');
             const currentlyBanned = e.target.getAttribute('data-banned') === 'true';
             if(!devId) return;
             
             if(!await customConfirm(`Are you sure you want to ${currentlyBanned ? 'unban' : 'block'} this device?`)) return;
             
             e.target.textContent = '...';
             try {
                const cfgData = await adminAction('get_config');
                if (!cfgData) throw new Error("Failed to get config from backend");
                const configObj = cfgData.config || {};
                let arr = configObj.bannedDevices || [];
                
                if (currentlyBanned) {
                   arr = arr.filter(id => id !== devId);
                } else {
                   if(!arr.includes(devId)) arr.push(devId);
                }
                
                await adminAction('update_config', { bannedDevices: arr });
                
                if (window.sessionRoom) {
                   if (!currentlyBanned) {
                      await window.sessionRoom.send({ type: 'broadcast', event: 'ban_device', payload: { deviceId: devId } });
                   } else {
                      await window.sessionRoom.send({ type: 'broadcast', event: 'unban_device', payload: { deviceId: devId } });
                   }
                }
                loadUsers();
             } catch(err) {
                customAlert('Error updating config: ' + err.message);
                e.target.textContent = 'Error';
             }
          };
        });

        userBrowser.appendChild(card);
      });
    }

    document.getElementById('btnRefreshUsers').onclick = loadUsers;

    // User filter tabs
    var currentFilter = 'all';
    document.querySelectorAll('.user-filter').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.user-filter').forEach(function(b) { b.classList.remove('active'); b.style.background = ''; });
        btn.classList.add('active');
        btn.style.background = 'var(--accent)';
        btn.style.color = '#000';
        currentFilter = btn.getAttribute('data-filter');
        var cards = document.querySelectorAll('#userBrowser .user-card');
        cards.forEach(function(card) {
          var show = true;
          if (currentFilter === 'banned') show = card.getAttribute('data-banned') === 'true';
          else if (currentFilter === 'admin') show = card.getAttribute('data-admin') === 'true';
          else if (currentFilter === 'online') show = card.getAttribute('data-online') === 'true';
          card.style.display = show ? '' : 'none';
        });
      };
    });

    // User polling removed in favor of Supabase realtime channel (users_changed)

    // Auto-refresh dashboard uptime every 15 seconds
    setInterval(async function() {
      try {
        var res = await fetch('/api/uptime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
          body: JSON.stringify({ action: 'get' })
        });
        var data = await res.json();
        if (data.success && data.total_uptime !== undefined) {
          function fmtT(sec) {
            sec = parseInt(sec, 10) || 0;
            var d = Math.floor(sec / 86400);
            var h = Math.floor((sec % 86400) / 3600).toString().padStart(2, '0');
            var m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
            var s = (sec % 60).toString().padStart(2, '0');
            if (d > 0) return d + 'd ' + h + ':' + m + ':' + s;
            return h + ':' + m + ':' + s;
          }
          var el = document.getElementById('dashTotalUptime');
          if(el) el.textContent = fmtT(data.total_uptime);
        }
      } catch(e) { console.error("Error fetching system logs:", e); }
    }, 15000);

function walkAndReplaceMR(node, isMrs) {
      if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;
      if (node.nodeType === 3) {
        if (isMrs) {
          if (node.originalValue === undefined) node.originalValue = node.nodeValue;
          if (node.originalValue.includes('MR') || node.originalValue.includes('mr')) {
             node.nodeValue = node.originalValue.replace(/\bMR\b/g, 'MRS').replace(/\bmr\b/g, 'mrs');
          }
        } else {
          if (node.originalValue !== undefined) node.nodeValue = node.originalValue;
        }
      } else if (node.nodeType === 1) {
        node.childNodes.forEach(child => walkAndReplaceMR(child, isMrs));
      }
    }

    function applyAdminTheme(t) {
      if (t === 'mrs') {
        document.documentElement.setAttribute('data-theme', 'mrs');
        walkAndReplaceMR(document.body, true);
      } else if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        walkAndReplaceMR(document.body, false);
      } else {
        document.documentElement.removeAttribute('data-theme');
        walkAndReplaceMR(document.body, false);
      }
    }

    const t = localStorage.getItem('mr_theme') || localStorage.getItem('theme');
    applyAdminTheme(t);
    
    // Listen for theme changes from index.html in another tab
    window.addEventListener('storage', (e) => {
      if (e.key === 'mr_theme' || e.key === 'theme') {
        applyAdminTheme(e.newValue);
      }
    });



    function customAlert(title, msg) {
      if (!msg) { msg = title; title = 'Alert'; }
      return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnCancel = document.getElementById('promptCancel');
        const btnConfirm = document.getElementById('promptConfirm');

        titleEl.textContent = title;
        inputEl.style.display = 'none'; // hide input
        
        let msgEl = document.getElementById('promptMessageText');
        if (!msgEl) {
           msgEl = document.createElement('div');
           msgEl.id = 'promptMessageText';
           msgEl.style.marginBottom = '16px';
           msgEl.style.fontSize = '14px';
           inputEl.parentNode.insertBefore(msgEl, inputEl);
        }
        msgEl.textContent = msg;
        msgEl.style.display = 'block';

        btnCancel.style.display = 'none';
        btnConfirm.textContent = 'OK';
        modal.classList.remove('hidden');

        const cleanup = () => {
          modal.classList.add('hidden');
          msgEl.style.display = 'none';
          inputEl.style.display = '';
          btnCancel.style.display = '';
          btnConfirm.textContent = 'Confirm';
          btnConfirm.onclick = null;
        };

        btnConfirm.onclick = () => { cleanup(); resolve(); };
      });
    }

    function showToast(msg, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.style.background = 'var(--bg-card)';
      toast.style.border = '1px solid var(--border-light)';
      if (type === 'error') toast.style.borderLeft = '4px solid var(--danger)';
      else if (type === 'success') toast.style.borderLeft = '4px solid #4ADE80';
      else toast.style.borderLeft = '4px solid var(--accent)';
      toast.style.padding = '12px 16px';
      toast.style.borderRadius = '4px';
      toast.style.color = 'var(--text-main)';
      toast.style.fontFamily = 'var(--font-mono)';
      toast.style.fontSize = '12px';
      toast.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
      toast.style.animation = 'toastIn 0.3s ease forwards';
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('searchUsersInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase();
                document.querySelectorAll('#userBrowser .user-card').forEach(card => {
                    const email = (card.querySelector('.user-email')?.textContent || '').toLowerCase();
                    const meta = (card.querySelector('.user-meta')?.textContent || '').toLowerCase();
                    if (email.includes(val) || meta.includes(val)) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    });
