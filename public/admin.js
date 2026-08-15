let supabaseClient = null;
Object.defineProperty(window, 'supabaseClient', { get() { return supabaseClient; }, set(v) { supabaseClient = v; } });

    // GitHub raw content base URL
    const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/alchemist4real/MR-CAPSULES/main';

    // UTF-8 safe base64 encoding
    function utf8ToBase64(str) {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }

    let sessionToken = null;
    let currentPath = '';
    let currentTree = [];
    let fileCache = {};
    
    // Expose to window for cross-script access (admin-workflow.js)
    Object.defineProperty(window, 'currentPath', { get() { return currentPath; }, set(v) { currentPath = v; } });
    Object.defineProperty(window, 'currentTree', { get() { return currentTree; }, set(v) { currentTree = v; } });
    Object.defineProperty(window, 'sessionToken', { get() { return sessionToken; }, set(v) { sessionToken = v; } });

    async function fetchFileSecureBlob(path, mimeType = 'application/octet-stream') {
        const res = await adminAction('download', { path });
        if (!res.success || !res.contentBase64) throw new Error("Failed to download: " + (res.error || 'Unknown error'));
        const fetchRes = await fetch(`data:${mimeType};base64,${res.contentBase64}`);
        return await fetchRes.blob();
    }

    async function fetchFileSecureText(path) {
        const res = await adminAction('download', { path });
        if (!res.success || !res.contentBase64) throw new Error("Failed to download: " + (res.error || 'Unknown error'));
        const fetchRes = await fetch(`data:application/octet-stream;base64,${res.contentBase64}`);
        return await fetchRes.text();
    }

    let isGridMode = true;
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
      
      sorted.forEach(function(log) {
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
            '<div style="font-weight:600; color:var(--text-main);">' + sanitize(log.user) + ' came online</div>';
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
             await supabaseClient.from('activity_logs').upsert({
                log_id: log.id,
                type: log.type,
                time: new Date(log.time).toISOString(),
                user_name: log.user,
                email: log.email || null,
                dev_str: log.devStr || null
             }, { onConflict: 'log_id' });
          } catch(e) { console.error("Error inserting activity log:", e); }
       }
    };

    const authOverlay = document.getElementById('authOverlay');
    const authMessage = document.getElementById('authMessage');
    const _statusTextEl = document.getElementById('statusText');
    const _statusBarEl = document.querySelector('.status-bar');
    let _statusTimeout;
    const statusText = {
      set textContent(val) {
        if(_statusTextEl) _statusTextEl.textContent = val;
        if(_statusBarEl) {
          _statusBarEl.classList.add('active');
          clearTimeout(_statusTimeout);
          _statusTimeout = setTimeout(() => _statusBarEl.classList.remove('active'), 3000);
        }
      }
    };
    const fileBrowser = document.getElementById('fileBrowser');
    const pathBreadcrumbs = document.getElementById('pathBreadcrumbs');
    const _itemCountEl = document.getElementById('itemCount');
    const itemCount = {
      set textContent(val) {
        if(_itemCountEl) _itemCountEl.textContent = val;
        if(_statusBarEl) {
          _statusBarEl.classList.add('active');
          clearTimeout(_statusTimeout);
          _statusTimeout = setTimeout(() => _statusBarEl.classList.remove('active'), 3000);
        }
      }
    };
    const fileInput = document.getElementById('fileInput');

    // Search Filter Logic (150ms debounced)
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.file-item').forEach(el => {
          const name = el.querySelector('.file-name')?.textContent.toLowerCase() || '';
          el.classList.toggle('hidden', !name.includes(val));
        });
      }, 150);
    });

    // Custom Modals Logic
    window.customPrompt = customPrompt;
    function customPrompt(title, defaultValue = '') {
      return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnCancel = document.getElementById('promptCancel');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnHeaderCancel = document.getElementById('promptHeaderCancel');

        titleEl.textContent = title;
        inputEl.value = defaultValue;
        inputEl.style.display = 'block';
        modal.classList.add('active');
        inputEl.focus();

        const cleanup = () => {
          modal.classList.remove('active');
          btnCancel.onclick = null;
          btnConfirm.onclick = null;
          if (btnHeaderCancel) btnHeaderCancel.onclick = null;
        };

        btnCancel.onclick = () => { cleanup(); resolve(null); };
        btnConfirm.onclick = () => { cleanup(); resolve(inputEl.value); };
        if (btnHeaderCancel) {
          btnHeaderCancel.onclick = () => { cleanup(); resolve(null); };
        }
      });
    }

    window.customConfirm = customConfirm;
    function customConfirm(title) {
      return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnCancel = document.getElementById('promptCancel');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnHeaderCancel = document.getElementById('promptHeaderCancel');

        titleEl.textContent = title;
        inputEl.style.display = 'none';
        modal.classList.add('active');

        const cleanup = () => {
          modal.classList.remove('active');
          btnCancel.onclick = null;
          btnConfirm.onclick = null;
          if (btnHeaderCancel) btnHeaderCancel.onclick = null;
        };

        btnCancel.onclick = () => { cleanup(); resolve(false); };
        btnConfirm.onclick = () => { cleanup(); resolve(true); };
        if (btnHeaderCancel) {
          btnHeaderCancel.onclick = () => { cleanup(); resolve(false); };
        }
      });
    }

    // Init Auth
    (async function initSupabaseAndAuth() {
        try {
            const envRes = await fetch('/api/env');
            const env = await envRes.json();
            supabaseClient = window.supabase.createClient(env.url, env.key);
            
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
        } catch (e) {
            console.error("Failed to load environment or initialize Supabase", e);
            redirectToHome("Initialization failed. Check connection.");
        }
    })();

    async function verifyAdmin(session) {
      sessionToken = session.access_token;
      window.dispatchEvent(new CustomEvent('adminReady', { detail: { token: sessionToken } }));
      const badgeEl = document.getElementById('userBadge');
      badgeEl.textContent = session.user.user_metadata?.username || session.user.email;
      
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
          document.getElementById('adminTabs').classList.remove('hidden');
          
          badgeEl.dataset.role = data.isSuperAdmin ? 'superadmin' : (data.isAdmin ? 'admin' : 'user');

          if (data.isSuperAdmin) {
            window.isSuperAdmin = true;
            loadUsers();
            if(typeof loadDivisions !== 'undefined') loadDivisions(); else if(window.loadDivisions) window.loadDivisions();
            if(typeof loadTasks !== 'undefined') loadTasks(); else if(window.loadTasks) window.loadTasks();
            if(window.loadContributions) window.loadContributions();
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
                  // Build email-to-card map for O(1) lookup instead of O(n×m)
                  var emailMap = new Map();
                  cards.forEach(function(c) {
                    c.setAttribute('data-online', 'false');
                    var emailEl = c.querySelector('.user-email');
                    if (emailEl) emailMap.set(emailEl.textContent, c);
                  });
                  Object.values(state).forEach(function(presences) {
                    presences.forEach(function(p) {
                      if(p.user && p.email) {
                        var card = emailMap.get(p.email);
                        if (card) card.setAttribute('data-online', 'true');
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
                     // Debounce device changes - these are rare but can come in bursts during signup
                     clearTimeout(window._deviceChangeTimer);
                     window._deviceChangeTimer = setTimeout(() => loadUsers(), 800);
                  })
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, payload => {
                     // Invalidate banned devices cache when settings change
                     window._cachedBannedDevices = null;
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
              
              toggle.onchange = async (e) => {
                 if (!await customConfirm('Are you sure you want to change allow signup setting?')) {
                   e.target.checked = !e.target.checked;
                   return;
                 }
                 await updateConfig();
              };
              toggleMaint.onchange = async (e) => {
                 if (!await customConfirm('Are you sure you want to toggle maintenance mode?')) {
                   e.target.checked = !e.target.checked;
                   return;
                 }
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
    window.loadTree = loadTree;
    async function loadTree() {
      statusText.textContent = 'Fetching repository...';
      fileBrowser.innerHTML = '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action: 'tree' }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (data.success && data.tree) {
          currentTree = data.tree.filter(i => i.path.startsWith('content/') || i.path.startsWith('cover/'));
          renderBrowser();
          statusText.textContent = 'Repository loaded.';
        } else {
          statusText.textContent = 'Failed to load tree: ' + data.error;
        }
      } catch(e) {
        clearTimeout(timeoutId);
        statusText.textContent = e.name === 'AbortError' ? 'Loading timed out (30s). Try refreshing.' : 'Error: ' + e.message;
      }
    }

    window.renderBrowser = renderBrowser;
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
        fileBrowser.innerHTML = '<div style="padding:24px; color:var(--text-muted); text-align:center;">Folder is empty</div>';
      }

      sortedItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        let icon = '';
        const isImg = item.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (item.type === 'folder') {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        } else if (isImg) {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        } else {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
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
        html += `<button class="btn" id="ctxCreateTask" style="border-color:var(--accent); color:var(--accent);">Create Task</button>`;
        html += `<button class="btn" id="ctxDownload">Download</button>`;
        html += `<button class="btn" id="ctxMove">Move</button>`;
        html += `<button class="btn" id="ctxRename">Rename</button>`;
      }
      html += `<button class="btn danger" id="ctxDelete">Delete</button>`;
      container.innerHTML = html;
      
      modal.classList.add('active');
      
      if (document.getElementById('ctxEdit')) {
        document.getElementById('ctxEdit').onclick = async () => {
          modal.classList.remove('active');
          openEditor(item);
        };
      }
      if (document.getElementById('ctxDownload')) {
        document.getElementById('ctxDownload').onclick = async () => {
          modal.classList.remove('active');
          try {
            const blob = await fetchFileSecureBlob(item.path);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = item.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch(e) {
            console.error(e);
            showToast('Download via API failed. Opening fallback...', 'error');
            window.open(`${GITHUB_RAW_BASE}/${item.path}`, '_blank');
          }
        };
      }
      if (document.getElementById('ctxMove')) {
        document.getElementById('ctxMove').onclick = async (e) => {
          modal.classList.remove('active');
          const newDir = await customPrompt("Enter new directory path (e.g. content/semester 1/):", currentPath);
          if (!newDir || newDir === currentPath) return;
          adminAction('rename_file', { path: item.path, newPath: newDir.replace(/\/$/, '') + '/' + item.name }).then(() => loadTree()).catch(e => showToast('Move failed: ' + e.message, 'error'));
        };
      }
      if (document.getElementById('ctxRename')) {
        document.getElementById('ctxRename').onclick = async () => {
          modal.classList.remove('active');
          const newName = await customPrompt("Enter new file name:", item.name);
          if (!newName || newName === item.name) return;
          adminAction('rename_file', { path: item.path, newPath: currentPath + newName }).then(() => loadTree()).catch(e => showToast('Rename failed: ' + e.message, 'error'));
        };
      }
      if (document.getElementById('ctxCreateTask')) {
        document.getElementById('ctxCreateTask').onclick = () => {
          modal.classList.remove('active');
          window._prefilledTaskPath = item.path;
          const tasksTab = document.querySelector('.tab[data-target="viewTasks"]');
          if (tasksTab) tasksTab.click();
          if (typeof createNewTaskPrompt === 'function') {
             createNewTaskPrompt();
          } else {
             const btnCreate = document.getElementById('btnCreateTask');
             if (btnCreate) btnCreate.click();
          }
        };
      }
      if (document.getElementById('ctxDelete')) {
        document.getElementById('ctxDelete').onclick = async () => {
          modal.classList.remove('active');
          if (item.type === 'folder') {
            const folderFiles = currentTree.filter(f => f.path.startsWith(item.path) && f.type === 'blob');
            if (folderFiles.length === 0) {
              customAlert('Folder is already empty.');
              return;
            }
            if (!await customConfirm(`Delete folder "${item.name}" and all ${folderFiles.length} files inside? This cannot be undone.`)) return;
            const files = folderFiles.map(f => ({ path: f.path }));
            statusText.textContent = `Deleting ${files.length} files...`;
            await adminAction('delete_files', { files });
            return;
          }
          if(await customConfirm('Delete ' + item.path + '?')) {
            adminAction('delete', { path: item.path, sha: item.sha }).then(() => loadTree()).catch(e => showToast('Delete failed: ' + e.message, 'error'));
          }
        };
      }
    }

    async function adminAction(action, payload) {
      statusText.textContent = `Processing ${action}...`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action, ...payload }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (data.success) {
          statusText.textContent = `Success: ${action}`;
          showToast(`Action successful: ${action.replace('_', ' ')}`, 'success');
          
          // NOTE: Removed redundant setTimeout(loadUsers/loadTree) here.
          // Real-time Supabase subscriptions on profiles/user_roles/user_devices
          // already trigger loadUsers automatically, and callers like uploadFilesSequential
          // already call loadTree after completion. The old code caused double API calls.
          return data;
        } else {
          statusText.textContent = `Error: ${data.error}`;
          customAlert(`Error: ${data.error}`);
          return null;
        }
      } catch(e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          statusText.textContent = `Timeout: ${action} took too long (30s)`;
          customAlert(`Request timed out after 30 seconds: ${action}`);
        } else {
          statusText.textContent = 'Network error: ' + e.message;
          customAlert('Network error: ' + e.message);
        }
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
      }).catch(e => {
        showToast('Bulk delete failed: ' + e.message, 'error');
        document.getElementById('btnBulkDelete').textContent = 'Delete Selected';
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

    window.showPreview = showPreview;
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

      const rawUrl = `${GITHUB_RAW_BASE}/${encodeURI(item.path)}`;

      // Update Header
      document.getElementById('lightboxFilename').textContent = item.name;
      
      document.getElementById('lightboxBtnNewTab').onclick = () => {
        window.open(rawUrl, '_blank');
      };
      document.getElementById('lightboxBtnDownload').onclick = async () => {
        try {
          const blob = await fetchFileSecureBlob(item.path);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = item.name;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch(e) {
          console.error(e);
          showToast('Download via API failed. Opening fallback...', 'error');
          window.open(rawUrl, '_blank');
        }
      };

      if (isImg) {
        img.src = rawUrl;
        img.classList.remove('hidden');
      } else {
        txt.textContent = "Loading preview...";
        txt.classList.remove('hidden');
        try {
          const text = await fetchFileSecureText(item.path);
          txt.textContent = text;
        } catch(e) {
          txt.textContent = "Failed to load content preview. You can open it in GitHub directly: " + `https://github.com/alchemist4real/MR-CAPSULES/blob/main/${item.path}`;
        }
      }
    }
    
    let editorLiveUpdateTimeout = null;
    let isFullscreen = false;

    window.openEditor = openEditor;
    async function openEditor(item) {
      window.currentEditorItem = item;
      const rawUrl = `${GITHUB_RAW_BASE}/${encodeURI(item.path)}`;
      const emodal = document.getElementById('editorModal');
      const emodalContainer = document.getElementById('editorModalContainer');
      document.getElementById('editorTitle').textContent = `Editing: ${item.name}`;
      emodal.classList.add('active');
      
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
        const text = await fetchFileSecureText(item.path);
        window.cmEditor.setValue(text);
        if (item.name.endsWith('.html')) {
           iframe.srcdoc = text;
        } else {
           iframe.srcdoc = `<html><body style="font-family:'Courier New', Courier, monospace; padding:20px;">Preview not available for this file type.</body></html>`;
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

      document.getElementById('editorClose').onclick = () => emodal.classList.remove('active');
      document.getElementById('editorCancel').onclick = () => emodal.classList.remove('active');
      document.getElementById('editorSave').onclick = async (ev) => {
        ev.target.textContent = 'Saving...';
        const content = window.cmEditor.getValue();
        const base64 = utf8ToBase64(content);
        await adminAction('upload', { path: item.path, contentBase64: base64, sha: item.sha });
        ev.target.textContent = 'Save Changes';
        emodal.classList.remove('active');
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
        const targetId = targetTab.getAttribute('data-target');
        if (!targetId) return; // Allow default link behavior for tabs without data-target (e.g. docs link)
        document.querySelectorAll('.tab').forEach(tx => tx.classList.remove('active'));
        document.querySelectorAll('.view-section, .view-section-row').forEach(vx => vx.classList.remove('active'));
        targetTab.classList.add('active');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.classList.add('active');
          if (targetId === 'viewApiKeys' && typeof window.loadApiKeys === 'function') {
            window.loadApiKeys();
          }
        }
      }
    });

    // Users Logic
    window.loadUsers = loadUsers;
    async function loadUsers(divIdFilter = null) {
      const filterToUse = (divIdFilter && divIdFilter !== 'all') ? divIdFilter : (window.currentDivisionId && window.currentDivisionId !== 'all' ? window.currentDivisionId : null);
      const userBrowser = document.getElementById('userBrowser');
      userBrowser.innerHTML = '<div style="padding:48px; color:var(--text-muted); text-align:center; font-size:18px;">Loading users... <div style="display:inline-block; width:20px; height:20px; border:3px solid var(--border-light); border-radius:50%; border-top-color:var(--text-main); animation:spin 1s ease-in-out infinite; margin-left:10px; vertical-align:middle;"></div></div>';
        // Use cached banned devices to avoid redundant API calls on every loadUsers
        let bannedDevs = window._cachedBannedDevices || [];
        if (!window._cachedBannedDevices) {
          try {
             const cfgData = await adminAction('get_config');
             if (cfgData && cfgData.success && cfgData.config) {
               bannedDevs = cfgData.config.bannedDevices || [];
               window._cachedBannedDevices = bannedDevs;
             }
          } catch(e) { console.error("Error fetching config for banned devs:", e); }
        }

      const userController = new AbortController();
      const userTimeoutId = setTimeout(() => userController.abort(), 30000);
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ action: 'get_users' }),
          signal: userController.signal
        });
        clearTimeout(userTimeoutId);
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
          renderDashboard(data.users, data.globalStats);
        } else {
          userBrowser.innerHTML = `<div style="padding:24px; color:var(--danger);">Failed to load users: ${data.error}</div>`;
        }
      } catch(e) {
        clearTimeout(userTimeoutId);
        userBrowser.innerHTML = `<div style="padding:24px; color:var(--danger);">${e.name === 'AbortError' ? 'Loading timed out (30s). Try refreshing.' : 'Error: ' + e.message}</div>`;
      }
    }

    function fmtTime(sec) {
      sec = parseInt(sec, 10) || 0;
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600).toString().padStart(2, '0');
      const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      if (d > 0) return d + 'd ' + h + ':' + m + ':' + s;
      return h + ':' + m + ':' + s;
    }

    function renderDashboard(users, globalStats) {
      document.getElementById('dashTotalUsers').textContent = users.length;
      
      // Use globalStats from the backend API (bypasses RLS)
      var uptimeEl = document.getElementById('dashTotalUptime');
      if (globalStats && globalStats.total_uptime !== undefined) {
        window.lastKnownUptime = globalStats.total_uptime;
        window.lastFetchTime = Date.now();
        uptimeEl.textContent = fmtTime(globalStats.total_uptime);
      } else {
        uptimeEl.textContent = '00:00:00';
      }
      
      // Populate hybrid logs from user data (local only, no DB upserts)
      // Only do this once to avoid re-processing on every renderDashboard call
      if (!window._dashboardLogsPopulated) {
        window._dashboardLogsPopulated = true;
        users.forEach(function(u) {
          if (!u.last_sign_in_at) return;
          var meta = u.user_metadata || {};
          var devArr = Array.isArray(meta.devices) ? meta.devices : [];
          var devStr = devArr.length > 0 ? devArr.map(function(d){ return d.id.substr(0,10); }).join(', ') : (meta.deviceId || 'Unknown');
          
          var logEntry = {
             id: 'login_' + u.id + '_' + u.last_sign_in_at,
             type: 'login',
             time: new Date(u.last_sign_in_at).getTime(),
             user: (meta.username || 'Unknown'),
             email: u.email,
             devStr: devStr
          };
          // Push directly to the array WITHOUT calling addHybridLog (which does DB upsert)
          var exists = window.hybridLogs.find(function(l) { return l.id === logEntry.id; });
          if (!exists) window.hybridLogs.push(logEntry);
        });
        window.hybridLogs.sort(function(a, b) { return b.time - a.time; });
        if (window.hybridLogs.length > 200) window.hybridLogs = window.hybridLogs.slice(0, 200);
        window.renderHybridLogs();
      }
    }

    function renderUsers(users, bannedDevs) {
      bannedDevs = bannedDevs || [];
      var userBrowser = document.getElementById('userBrowser');
      userBrowser.innerHTML = '';
      if(document.getElementById('itemCount')) document.getElementById('itemCount').textContent = users.length + ' users';

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
        var division = meta.division || '';

        var card = document.createElement('div');
        card.className = 'user-card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        
        var badgesHtml = '';
        if (isAdmin) badgesHtml += '<span class="badge badge-admin">ADMIN</span>';
        if (division) badgesHtml += '<span class="badge badge-division">' + division + '</span>';
        if (isBanned) badgesHtml += '<span class="badge badge-banned">BANNED</span>';

        // Build devices HTML using string concat to avoid nested template literal issues
        var devicesHtml = '';
        if (devices.length > 0) {
           var devRows = '';
           for (var di = 0; di < devices.length; di++) {
              var dev = devices[di];
              var isDevBanned = bannedDevs.includes(dev.id);
              devRows += '<div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 0; border-bottom: 1px solid var(--border-light);">';
              devRows += '<span style="font-family:var(--font-mono); font-size:12px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + dev.id + '">' + dev.id.substr(0,14) + '...</span>';
              devRows += '<div style="display:flex; gap: 4px;">';
              devRows += '<button class="btn-card ' + (isDevBanned ? 'primary' : 'danger') + ' btn-block-dev" data-dev="' + dev.id + '" data-banned="' + isDevBanned + '">';
              devRows += (isDevBanned ? 'Unban' : 'Block');
              devRows += '</button>';
              devRows += '<button class="btn-card danger btn-delete-dev" data-dev="' + dev.id + '" data-userid="' + u.id + '" data-email="' + email + '" title="Remove Device">';
              devRows += 'Delete';
              devRows += '</button></div></div>';
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
          if (window.currentDivisionId && window.currentDivisionId !== 'all') {
             actionsHtml += '<button class="btn-card danger btn-remove-div" data-email="' + email + '">Remove from Division</button>';
          }
          if (isAdmin) {
            actionsHtml += '<button class="btn-card btn-revoke" data-target="' + email + '">Revoke Admin</button>';
          } else {
            actionsHtml += '<button class="btn-card primary btn-make-admin" data-target="' + email + '">Make Admin</button>';
          }
          actionsHtml += '<button class="btn-card ' + (isBanned ? 'primary' : 'danger') + ' btn-ban" data-id="' + u.id + '" data-banned="' + isBanned + '">';
          actionsHtml += (isBanned ? 'Unban' : 'Ban') + '</button>';
          actionsHtml += '<button class="btn-card primary btn-reset-pwd" data-id="' + u.id + '">Reset Pwd</button>';
          actionsHtml += '<button class="btn-card danger btn-del-user" data-id="' + u.id + '">Delete</button>';
        }

        card.setAttribute('data-banned', isBanned ? 'true' : 'false');
        card.setAttribute('data-admin', isAdmin ? 'true' : 'false');
        card.setAttribute('data-online', 'false');

        let displayUsername = username !== '-' ? username : email.split('@')[0];
        card.innerHTML = '<div class="user-card-header">' +
          '<div><div class="user-email" style="text-transform: uppercase;">' + sanitize(displayUsername) + '</div>' +
          '<div class="user-meta">' + sanitize(email) + ' &bull; ' + new Date(u.created_at).toLocaleDateString() + '</div></div>' +
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

        if (card.querySelector('.btn-reset-pwd')) {
          card.querySelector('.btn-reset-pwd').onclick = async (e) => {
            const newPassword = await customPrompt(`Enter new password for ${email}:`, 'MrCapsules2026!');
            if (newPassword && newPassword.trim() !== '') {
              if (newPassword.trim().length < 6) {
                alert('Password must be at least 6 characters long.');
                return;
              }
              e.target.textContent = '...';
              adminAction('reset_user_password', { userId: u.id, newPassword: newPassword.trim() })
                .then(res => {
                  e.target.textContent = 'Reset Pwd';
                  if (res && res.success) {
                    if (window.showToast) window.showToast('Password for ' + email + ' reset successfully!');
                    else alert('Password for ' + email + ' reset successfully!');
                  }
                })
                .catch(err => {
                  e.target.textContent = 'Reset Pwd';
                  alert('Failed to reset password: ' + (err.message || err));
                });
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

        if (card.querySelector('.btn-remove-div')) {
          card.querySelector('.btn-remove-div').onclick = async (e) => {
             const targetEmail = e.target.getAttribute('data-email');
             if(window.removeMember) {
                 window.removeMember(targetEmail, window.currentDivisionId);
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
                window._cachedBannedDevices = arr; // Update cache immediately
                
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

        const deleteDevBtns = card.querySelectorAll('.btn-delete-dev');
        deleteDevBtns.forEach(btn => {
          btn.onclick = async (e) => {
             const devId = e.target.getAttribute('data-dev');
             const targetUserId = e.target.getAttribute('data-userid');
             const targetEmail = e.target.getAttribute('data-email');
             if (!devId || !targetUserId) return;

             if (!await customConfirm(`Delete device "${devId.substr(0,14)}..." from user ${targetEmail}?`)) return;

             e.target.textContent = '...';
             try {
                const res = await adminAction('remove_user_device', { userId: targetUserId, deviceId: devId });
                if (res && res.success) {
                   customAlert(`Device deleted successfully from ${targetEmail}`);
                   loadUsers();
                } else {
                   throw new Error(res ? res.error : 'Failed to delete device');
                }
             } catch(err) {
                customAlert('Error deleting device: ' + err.message);
                e.target.textContent = 'Delete';
             }
          };
        });

        userBrowser.appendChild(card);
      });
      if (window.applyUserFilters) window.applyUserFilters();
    }

    document.getElementById('btnRefreshDashboard').onclick = () => {
      fetchHybridLogs();
      if(window.loadContributions) window.loadContributions();
    };

    const btnGuestCleanup = document.getElementById('btnGuestCleanup');
    if (btnGuestCleanup) {
      btnGuestCleanup.onclick = async () => {
        const resultEl = document.getElementById('guestCleanupResult');
        btnGuestCleanup.disabled = true;
        btnGuestCleanup.textContent = 'Cleaning...';
        resultEl.textContent = 'Processing...';
        resultEl.style.color = 'var(--text-muted)';
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          const res = await fetch('/api/guest-cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ max_age_hours: 24 })
          });
          const data = await res.json();
          if (res.ok) {
            resultEl.style.color = 'var(--text-main)';
            resultEl.textContent = `[SUCCESS] Deleted ${data.deleted}/${data.total_guests_found} guests`;
          } else {
            resultEl.style.color = 'var(--danger)';
            resultEl.textContent = `[ERROR] ${data.error}`;
          }
        } catch(e) {
          resultEl.style.color = 'var(--danger)';
          resultEl.textContent = `[ERROR] ${e.message}`;
        }
        btnGuestCleanup.disabled = false;
        btnGuestCleanup.textContent = 'Clean Guests (24h+)';
      };
    }

    window.currentFilter = 'all';
    window.applyUserFilters = function() {
        const searchInput = document.getElementById('searchUsersInput');
        const val = searchInput ? searchInput.value.toLowerCase() : '';
        const cards = document.querySelectorAll('#userBrowser .user-card');
        
        cards.forEach(card => {
            let show = true;
            
            if (window.currentFilter === 'banned') show = card.getAttribute('data-banned') === 'true';
            else if (window.currentFilter === 'admin') show = card.getAttribute('data-admin') === 'true';
            else if (window.currentFilter === 'online') show = card.getAttribute('data-online') === 'true';
            
            if (show && val) {
                const email = (card.querySelector('.user-email')?.textContent || '').toLowerCase();
                const meta = (card.querySelector('.user-meta')?.textContent || '').toLowerCase();
                if (!email.includes(val) && !meta.includes(val)) {
                    show = false;
                }
            }
            card.style.display = show ? '' : 'none';
        });
    };

    // User filter tabs
    document.querySelectorAll('.user-filter').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.user-filter').forEach(function(b) { b.classList.remove('active'); b.style.background = 'transparent'; b.style.color = 'var(--text-main)'; });
        btn.classList.add('active');
        btn.style.background = 'var(--accent)';
        btn.style.color = 'var(--bg-main)';
        window.currentFilter = btn.getAttribute('data-filter');
        if(window.applyUserFilters) window.applyUserFilters();
      };
    });

    // User polling removed in favor of Supabase realtime channel (users_changed)

    window.lastKnownUptime = window.lastKnownUptime || 0;
    window.lastFetchTime = window.lastFetchTime || Date.now();

    if (window._uptimeDisplayTimer) clearInterval(window._uptimeDisplayTimer);
    if (window._uptimeFetchTimer) clearInterval(window._uptimeFetchTimer);

    // Smooth counter - update display every second
    window._uptimeDisplayTimer = setInterval(() => {
      const el = document.getElementById('dashTotalUptime');
      if (!el || !window.lastKnownUptime) return;
      const elapsed = Math.floor((Date.now() - window.lastFetchTime) / 1000);
      el.textContent = fmtTime(window.lastKnownUptime + elapsed);
    }, 1000);

    // Fetch real value every 30 seconds
    window._uptimeFetchTimer = setInterval(async function() {
      try {
        var res = await fetch('/api/uptime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
          body: JSON.stringify({ action: 'get' })
        });
        var data = await res.json();
        if (data.success && data.total_uptime !== undefined) {
          window.lastKnownUptime = data.total_uptime;
          window.lastFetchTime = Date.now();
        }
      } catch(e) { console.error("Error fetching uptime logs:", e); }
    }, 30000);

    /* ══ PERSONA ENGINE (Synced from Main Site) ══ */
    function walkAndReplaceMR(node, isMrs) {
      if (!node) return;
      if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'IFRAME' || node.nodeName === 'CODE' || node.nodeName === 'PRE' || node.nodeName === 'INPUT' || node.nodeName === 'TEXTAREA' || (node.classList && (node.classList.contains('CodeMirror') || node.classList.contains('cm-editor')))) return;
      if (node.nodeType === 3) {
        if (node.originalValue === undefined) node.originalValue = node.nodeValue;
        if (isMrs) {
          if (/mr/i.test(node.originalValue)) {
            node.nodeValue = node.originalValue
              .replace(/\bMr\.\s*Capsules\b/g, 'Mrs. Capsules')
              .replace(/\bMR\.\s*CAPSULES\b/g, 'MRS. CAPSULES')
              .replace(/\bMR\s+CAPSULES\b/g, 'MRS CAPSULES')
              .replace(/\bMr\.\b/g, 'Mrs.')
              .replace(/\bMR\b/g, 'MRS')
              .replace(/\bMr\b/g, 'Mrs')
              .replace(/\bmr\b/g, 'mrs');
          }
        } else {
          if (node.originalValue !== undefined) node.nodeValue = node.originalValue;
        }
      } else if (node.nodeType === 1) {
        node.childNodes.forEach(child => walkAndReplaceMR(child, isMrs));
      }
    }

    function applyAdminPersona(p) {
      const isMrs = (p === 'mrs');
      if (document.originalTitle === undefined) document.originalTitle = document.title;
      if (isMrs) {
        document.title = document.originalTitle
          .replace(/\bMr\.\s*Capsules\b/g, 'Mrs. Capsules')
          .replace(/\bMr\./g, 'Mrs.')
          .replace(/\bMR\b/g, 'MRS')
          .replace(/\bMr\b/g, 'Mrs');
      } else {
        document.title = document.originalTitle;
      }
      walkAndReplaceMR(document.body, isMrs);
    }

    const savedAdminPersona = localStorage.getItem('mr_persona') || 'mr';
    applyAdminPersona(savedAdminPersona);

    window.addEventListener('storage', (e) => {
      if (e.key === 'mr_persona') {
        applyAdminPersona(e.newValue || 'mr');
      }
    });

    // ============================================================================
    // UNIFIED TOAST MANAGER
    // Enforces max 5 toast stack, textContent injection for XSS protection, 
    // auto-dismiss, progress bar controls, and zero-emoji SVG icons.
    // ============================================================================
    const ToastManager = (function () {
      const MAX_STACK = 5;
      const DEFAULT_DURATION = 3000;
      const activeToasts = [];

      function getContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
          container = document.createElement('div');
          container.id = 'toastContainer';
          container.className = 'toast-container';
          document.body.appendChild(container);
        }
        return container;
      }

      function createIconSvg(type) {
        const svgMap = {
          success: '<polyline points="20 6 9 17 4 12"></polyline>',
          error: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
          warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
          info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
        };
        const pathContent = svgMap[type] || svgMap.info;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `toast-icon toast-icon-${type}`);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.innerHTML = pathContent;
        return svg;
      }

      function removeToast(toastObj) {
        const idx = activeToasts.indexOf(toastObj);
        if (idx === -1) return;
        
        activeToasts.splice(idx, 1);
        clearTimeout(toastObj.timeoutId);

        const el = toastObj.element;
        el.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 300);
      }

      function show(msg, type = 'info', duration = DEFAULT_DURATION) {
        const container = getContainer();

        while (activeToasts.length >= MAX_STACK) {
          removeToast(activeToasts[0]);
        }

        const toast = document.createElement('div');
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.className = `toast toast-${type}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'toast-content';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon-container';
        iconSpan.appendChild(createIconSvg(type));

        const msgSpan = document.createElement('span');
        msgSpan.className = 'toast-message';
        msgSpan.textContent = String(msg);

        contentDiv.appendChild(iconSpan);
        contentDiv.appendChild(msgSpan);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', 'Close toast');
        closeBtn.innerHTML = '&times;';

        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress';
        progressBar.style.animationDuration = `${duration}ms`;

        toast.appendChild(contentDiv);
        toast.appendChild(closeBtn);
        toast.appendChild(progressBar);
        container.appendChild(toast);

        const toastObj = {
          element: toast,
          timeoutId: null,
          remaining: duration,
          startTime: Date.now()
        };

        function dismiss() {
          removeToast(toastObj);
        }

        function startTimer() {
          toastObj.startTime = Date.now();
          toastObj.timeoutId = setTimeout(dismiss, toastObj.remaining);
        }

        function pauseTimer() {
          clearTimeout(toastObj.timeoutId);
          toastObj.remaining -= Date.now() - toastObj.startTime;
          if (toastObj.remaining < 0) toastObj.remaining = 0;
        }

        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss();
        });

        toast.addEventListener('mouseenter', () => {
          pauseTimer();
          progressBar.style.animationPlayState = 'paused';
        });

        toast.addEventListener('mouseleave', () => {
          startTimer();
          progressBar.style.animationPlayState = 'running';
        });

        activeToasts.push(toastObj);
        startTimer();
      }

      return { show, removeToast };
    })();

    window.showToast = function (msg, type = 'info') {
      ToastManager.show(msg, type);
    };

    // ============================================================================
    // UNIFIED MODAL MANAGER
    // Enforces Escape key close, focus trapping inside dialog, focus restoration.
    // ============================================================================
    const ModalManager = (function () {
      const modalStack = [];
      let keydownListenerAttached = false;
      const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

      function handleGlobalKeydown(e) {
        if (modalStack.length === 0) return;
        const currentModalInfo = modalStack[modalStack.length - 1];
        const { modalEl, options } = currentModalInfo;

        if (e.key === 'Escape' || e.keyCode === 27) {
          if (options.closeOnEscape !== false) {
            e.preventDefault();
            close(modalEl, { reason: 'escape' });
          }
          return;
        }

        if (e.key === 'Tab' || e.keyCode === 9) {
          const focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);

          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }

          const firstEl = focusables[0];
          const lastEl = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstEl || !modalEl.contains(document.activeElement)) {
              e.preventDefault();
              lastEl.focus();
            }
          } else {
            if (document.activeElement === lastEl || !modalEl.contains(document.activeElement)) {
              e.preventDefault();
              firstEl.focus();
            }
          }
        }
      }

      function ensureListener() {
        if (!keydownListenerAttached) {
          document.addEventListener('keydown', handleGlobalKeydown, true);
          keydownListenerAttached = true;
        }
      }

      function open(modalEl, options = {}) {
        if (!modalEl) return;
        ensureListener();
        const previousActiveElement = document.activeElement;
        const modalInfo = { modalEl, previousActiveElement, options, onClose: options.onClose || null };
        modalStack.push(modalInfo);
        modalEl.classList.add('active');
        modalEl.setAttribute('aria-modal', 'true');
        modalEl.setAttribute('role', 'dialog');
        setTimeout(() => {
          const initialFocus = options.initialFocusEl || modalEl.querySelector(FOCUSABLE_SELECTOR);
          if (initialFocus && typeof initialFocus.focus === 'function') initialFocus.focus();
        }, 50);
      }

      function close(modalEl, resultData = null) {
        if (!modalEl) return;
        const stackIdx = modalStack.findIndex(item => item.modalEl === modalEl);
        if (stackIdx === -1) {
          modalEl.classList.remove('active');
          return;
        }
        const [modalInfo] = modalStack.splice(stackIdx, 1);
        modalEl.classList.remove('active');
        modalEl.removeAttribute('aria-modal');
        if (typeof modalInfo.onClose === 'function') modalInfo.onClose(resultData);
        if (modalInfo.previousActiveElement && typeof modalInfo.previousActiveElement.focus === 'function') {
          modalInfo.previousActiveElement.focus();
        }
      }

      return { open, close };
    })();

    window.ModalManager = ModalManager;

    window.customAlert = function customAlert(title, msg) {
      if (!msg) { msg = title; title = 'Alert'; }
      return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnCancel = document.getElementById('promptCancel');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnHeaderCancel = document.getElementById('promptHeaderCancel');

        titleEl.textContent = title;
        inputEl.style.display = 'none';
        
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

        let isResolved = false;
        const cleanupAndResolve = () => {
          if (isResolved) return;
          isResolved = true;
          msgEl.style.display = 'none';
          inputEl.style.display = '';
          btnCancel.style.display = '';
          btnConfirm.textContent = 'Confirm';
          btnConfirm.onclick = null;
          if (btnHeaderCancel) btnHeaderCancel.onclick = null;
          ModalManager.close(modal);
          resolve();
        };

        btnConfirm.onclick = () => cleanupAndResolve();
        if (btnHeaderCancel) btnHeaderCancel.onclick = () => cleanupAndResolve();

        ModalManager.open(modal, {
          initialFocusEl: btnConfirm,
          onClose: () => cleanupAndResolve()
        });
      });
    };

    function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
      const el = typeof btn === 'string' ? document.querySelector(btn) : btn;
      if (!el) return;
      if (isLoading) {
        if (el.dataset.isLoading === 'true') return;
        el.dataset.isLoading = 'true';
        el.dataset.originalHtml = el.innerHTML;
        el.dataset.originalDisabled = el.disabled ? 'true' : 'false';
        el.disabled = true;
        el.classList.add('btn-loading');
        el.innerHTML = `<svg class="btn-spinner" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" style="animation:spin 0.8s linear infinite; margin-right:6px; vertical-align:middle;"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg><span>${loadingText}</span>`;
      } else {
        if (el.dataset.isLoading !== 'true') return;
        el.disabled = el.dataset.originalDisabled === 'true';
        el.innerHTML = el.dataset.originalHtml || el.innerHTML;
        el.classList.remove('btn-loading');
        delete el.dataset.isLoading;
        delete el.dataset.originalHtml;
        delete el.dataset.originalDisabled;
      }
    }

    async function withButtonLoading(btn, asyncFn, loadingText = 'Processing...') {
      setButtonLoading(btn, true, loadingText);
      try {
        return await asyncFn();
      } finally {
        setButtonLoading(btn, false);
      }
    }

    window.setButtonLoading = setButtonLoading;
    window.withButtonLoading = withButtonLoading;
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('searchUsersInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if(window.applyUserFilters) window.applyUserFilters();
            });
        }
    });

// ═══════════════════════════════════════════════════════════════
// API KEYS MODULE — appended to admin.js
// Uses: window.sessionToken (set by verifyAdmin at line 250)
//       showToast() (defined at line ~1551)
//       customConfirm() (defined at line ~193)
//       sanitize() (defined at line ~42)
// All functions are scoped in an IIFE to avoid global leaks.
// ═══════════════════════════════════════════════════════════════

(function initApiKeysModule() {
  function bindKeyEvents() {
    var btnRefresh = document.getElementById('btnRefreshApiKeys');
    if (btnRefresh) btnRefresh.onclick = loadApiKeys;

    var btnGenerate = document.getElementById('btnGenerateApiKey');
    if (btnGenerate) btnGenerate.onclick = generateApiKey;

    var btnCopy = document.getElementById('btnCopyApiKey');
    if (btnCopy) btnCopy.onclick = copyRevealedKey;

    var tab = document.getElementById('tabApiKeys');
    if (tab) {
      tab.addEventListener('click', function() {
        setTimeout(loadApiKeys, 50);
      });
    }
  }

  // Bind events immediately if DOM is ready, and also listen for adminReady
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindKeyEvents);
  } else {
    bindKeyEvents();
  }
  window.addEventListener('adminReady', function() {
    bindKeyEvents();
    loadApiKeys();
  });

  window.loadApiKeys = loadApiKeys;

  // POST to /api/mcp using the existing session JWT
  async function mcpCall(method, params) {
    var tok = window.sessionToken;
    if (!tok) throw new Error('Not authenticated');
    var res = await fetch('/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + tok
      },
      body: JSON.stringify({ method: method, params: params || {} })
    });
    var data = await res.json();
    if (!data.success) throw new Error(data.error || 'Unknown error');
    return data.result;
  }

  async function loadOAuthTokens() {
    var oauthListEl = document.getElementById('oauthTokensList');
    if (!oauthListEl) return;

    oauthListEl.innerHTML = '<div style="color:var(--text-muted); font-size:14px; padding:24px; text-align:center;">Loading OAuth sessions...</div>';

    try {
      var result = await mcpCall('oauth_tokens_list', {});
      var tokens = result.tokens || [];

      if (tokens.length === 0) {
        oauthListEl.innerHTML = '<div style="color:var(--text-muted); font-size:14px; padding:20px; text-align:center; border:1px dashed var(--border-light); border-radius:10px;">No active OAuth sessions found. Connect via Claude.ai connector to generate an OAuth token.</div>';
        return;
      }

      oauthListEl.innerHTML = tokens.map(function(t) {
        var created = new Date(t.created_at).toLocaleString();
        var expires = t.expires_at ? new Date(t.expires_at).toLocaleString() : 'No expiry';
        return '<div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border:1px solid var(--border-light); border-radius:10px; margin-bottom:10px; background:var(--bg-card); gap:12px;">' +
          '<div>' +
            '<div style="font-weight:700; font-size:14px; color:var(--text-main); margin-bottom:4px; display:flex; align-items:center; gap:8px;">' +
              '<span style="color:#d97706;">🤖 Claude AI Connector</span>' +
              '<span style="font-size:11px; background:var(--accent-soft); color:var(--accent); padding:2px 8px; border-radius:99px; font-weight:600;">ACTIVE</span>' +
            '</div>' +
            '<div style="font-size:13px; color:var(--text-main); margin-bottom:4px;">Account: <strong>' + sanitize(t.user_email) + '</strong></div>' +
            '<code style="font-size:11px; background:var(--bg-inset); padding:2px 8px; border-radius:4px; color:var(--text-muted);">' + sanitize(t.token_prefix) + '</code>' +
            '<span style="font-size:12px; color:var(--text-muted); margin-left:12px;">Authorized ' + created + '</span>' +
            '<span style="font-size:12px; color:var(--text-muted); margin-left:8px;">&middot; Expires: ' + expires + '</span>' +
          '</div>' +
          '<button class="btn-unified sm danger" onclick="window._revokeOAuthToken(\'' + sanitize(t.token_id).replace(/'/g, "\\'") + '\', \'' + sanitize(t.user_email).replace(/'/g, "\\'") + '\')">Disconnect</button>' +
        '</div>';
      }).join('');

    } catch (err) {
      oauthListEl.innerHTML = '<div style="color:var(--danger); padding:16px;">Failed to load OAuth tokens: ' + sanitize(err.message) + '</div>';
    }
  }

  window._revokeOAuthToken = async function(tokenId, userEmail) {
    var confirmed = await customConfirm('Disconnect Claude OAuth session for "' + userEmail + '"? Claude will lose access to MCP tools immediately.');
    if (!confirmed) return;
    try {
      await mcpCall('oauth_tokens_revoke', { token_id: tokenId });
      showToast('Claude OAuth session disconnected', 'success');
      loadOAuthTokens();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  async function loadApiKeys() {
    var listEl = document.getElementById('apiKeysList');
    var generateSection = document.getElementById('apiKeysGenerateSection');
    var accessInfo = document.getElementById('apiKeysAccessInfo');
    if (!listEl) return;

    loadOAuthTokens();

    listEl.innerHTML = '<div style="color:var(--text-muted); font-size:14px; padding:24px; text-align:center;">Loading...</div>';

    try {
      var result = await mcpCall('apikeys.list', {});
      var keys = result.keys || [];

      if (generateSection) generateSection.style.display = '';
      if (accessInfo) accessInfo.style.display = 'none';

      if (keys.length === 0) {
        listEl.innerHTML = '<div style="color:var(--text-muted); font-size:14px; padding:24px; text-align:center;">No developer API keys yet. Generate one above.</div>';
        return;
      }

      listEl.innerHTML = keys.map(function(k) {
        var created = new Date(k.created_at).toLocaleDateString();
        var lastUsed = k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never';
        var expiresInfo = k.expires_at ? ('Expires ' + new Date(k.expires_at).toLocaleDateString()) : 'No expiry';
        return '<div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border:1px solid var(--border-light); border-radius:10px; margin-bottom:10px; background:var(--bg-card);">' +
          '<div>' +
            '<div style="font-weight:600; font-size:14px; color:var(--text-main); margin-bottom:4px;">' + sanitize(k.name) + '</div>' +
            '<code style="font-size:12px; background:var(--bg-inset); padding:2px 8px; border-radius:4px; color:var(--text-muted);">' + sanitize(k.key_prefix) + '...</code>' +
            '<span style="font-size:12px; color:var(--text-muted); margin-left:12px;">Created ' + created + '</span>' +
            '<span style="font-size:12px; color:var(--text-muted); margin-left:8px;">&middot; Last used: ' + lastUsed + '</span>' +
            '<span style="font-size:12px; color:var(--text-muted); margin-left:8px;">&middot; ' + (k.request_count || 0) + ' requests</span>' +
            '<span style="font-size:12px; color:var(--text-muted); margin-left:8px;">&middot; ' + expiresInfo + '</span>' +
            '</div>' +
          '<button class="btn-unified sm danger" onclick="window._revokeApiKey(\'' + k.id + '\', \'' + sanitize(k.name).replace(/'/g, "\\'") + '\')">Revoke</button>' +
        '</div>';
      }).join('');

    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('division')) {
        if (generateSection) generateSection.style.display = 'none';
        if (accessInfo) accessInfo.style.display = '';
        listEl.innerHTML = '';
      } else {
        listEl.innerHTML = '<div style="color:var(--danger); padding:16px;">' + sanitize(err.message) + '</div>';
      }
    }
  }

  async function generateApiKey() {
    var nameInput = document.getElementById('newKeyName');
    var expirySelect = document.getElementById('newKeyExpiry');
    var revealBox = document.getElementById('apiKeyRevealBox');
    var revealText = document.getElementById('apiKeyRevealText');
    var btn = document.getElementById('btnGenerateApiKey');

    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) { showToast('Please enter a key name', 'error'); return; }

    var expiresInDays = (expirySelect && expirySelect.value) ? parseInt(expirySelect.value, 10) : null;

    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

    try {
      var result = await mcpCall('apikeys.create', { name: name, expires_in_days: expiresInDays });

      if (revealText) revealText.textContent = result.raw_key;
      if (revealBox) revealBox.style.display = '';

      if (nameInput) nameInput.value = '';
      if (expirySelect) expirySelect.value = '';

      showToast('API key generated! Copy it now.', 'success');
      loadApiKeys();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '+ Generate Key'; }
    }
  }

  function copyRevealedKey() {
    var revealText = document.getElementById('apiKeyRevealText');
    if (!revealText || !revealText.textContent) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(revealText.textContent).then(function() {
        showToast('API key copied!', 'success');
      }).catch(function(err) {
        showToast('Copy failed: ' + err.message, 'error');
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = revealText.textContent;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand('copy'); showToast('API key copied!', 'success'); } catch(e) {}
      ta.remove();
    }
  }

  // Used by onclick= in rendered key cards. Must be global.
  window._revokeApiKey = async function(keyId, keyName) {
    var confirmed = await customConfirm('Revoke key "' + keyName + '"? Services using it will stop working immediately.');
    if (!confirmed) return;
    try {
      await mcpCall('apikeys.revoke', { key_id: keyId });
      showToast('API key revoked', 'success');
      loadApiKeys();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };
})();

