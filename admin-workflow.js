// 3-Division Workflow & Tasks Logic
let currentUserDivision = null;
let currentUserId = null;
let isAdminUser = false;

document.addEventListener('DOMContentLoaded', () => {
    // Wait for sessionToken to be populated by admin.js
    if (window.sessionToken) {
        initWorkflow();
    } else {
        window.addEventListener('adminReady', () => initWorkflow(), { once: true });
    }
    // Fallback timeout in case event was missed
    setTimeout(() => {
        if (window.sessionToken && !window._workflowInitialized) initWorkflow();
    }, 5000);

    // Setup Refresh buttons
    document.getElementById('btnRefreshTasks')?.addEventListener('click', loadTasks);
    document.getElementById('btnRefreshDivisions')?.addEventListener('click', loadDivisions);
    
    // Bind tab events to load data when activated
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            if(target === 'viewTasks') loadTasks();
            if(target === 'viewUsers') loadDivisions();
            if(target === 'viewDashboard') window.loadContributions();
        });
    });
    
    window.loadDivisions = loadDivisions;
});

async function apiCall(endpoint, payload) {
    if(!sessionToken) return { error: 'No session' };
    try {
        const res = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function initWorkflow() {
    window._workflowInitialized = true;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(user) currentUserId = user.id;

    // Check if user has admin badge in the UI (set by admin.js verifyAdmin)
    const badge = document.getElementById('userBadge');
    isAdminUser = badge && (badge.dataset.role === 'admin' || badge.dataset.role === 'superadmin');

    const divRes = await apiCall('divisions', { action: 'get_my_division' });
    
    if(divRes.success && divRes.division) {
        currentUserDivision = divRes.division.division_id;
    } else if (divRes.success && !divRes.division) {
        // User has no division, show picker
        if (!isAdminUser) {
            document.getElementById('divisionPickerModal').classList.remove('hidden');
        }
    }


    // Real-time subscription for divisions
    if (window.supabaseClient) {
        window.supabaseClient
            .channel('public:division_members')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'division_members' }, payload => {
                if(document.getElementById('viewUsers')?.classList.contains('active')) {
                    loadDivisions();
                }
            })
            .subscribe();
    }

    // If a tab was already clicked before initWorkflow finished, load its data now
    if(document.getElementById('viewTasks')?.classList.contains('active')) loadTasks();
    if(document.getElementById('viewUsers')?.classList.contains('active')) loadDivisions();
    if(document.getElementById('viewDashboard')?.classList.contains('active')) window.loadContributions();
}

window.joinDivision = async function(divId) {
    showToast('Bergabung dengan divisi...');
    const res = await apiCall('divisions', { action: 'join_division', division_id: divId });
    if(res.success) {
        document.getElementById('divisionPickerModal').classList.add('hidden');
        showToast('Berhasil bergabung!', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } else {
        showToast('Gagal: ' + res.error, 'error');
    }
};

// =======================
// TASKS (KANBAN)
// =======================
async function loadTasks() {
    // Dynamically check admin status here because verifyAdmin in admin.js finishes asynchronously
    const badge = document.getElementById('userBadge');
    isAdminUser = badge && (badge.dataset.role === 'admin' || badge.dataset.role === 'superadmin');

    const btnCreateTask = document.getElementById('btnCreateTask');
    if (btnCreateTask && (isAdminUser || currentUserDivision === 'management')) {
        btnCreateTask.style.display = 'block';
        btnCreateTask.onclick = () => createNewTaskPrompt();
    }

    const cols = ['open', 'in_progress', 'developed', 'in_review', 'done'];
    cols.forEach(c => {
        const el = document.querySelector(`#col-${c} .task-list`);
        if (el) el.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-muted);">Loading... <div style="display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-radius:50%; border-top-color:#fff; animation:spin 1s ease-in-out infinite; margin-left:8px; vertical-align:middle;"></div></div>';
    });
    const res = await apiCall('tasks', { action: 'list_tasks' });
    if(res.success) {
        window.allTasks = res.tasks || [];
        
        // Dynamically update category dropdowns
        const uniqueCategories = new Set(['CBT', 'OSCE', 'Video', 'Summary']);
        window.allTasks.forEach(t => { if(t.category) uniqueCategories.add(t.category); });
        
        const filterCatEl = document.getElementById('filterTaskCategory');
        if (filterCatEl) {
            const currentVal = filterCatEl.value;
            filterCatEl.innerHTML = '<option value="all">All Categories</option>';
            uniqueCategories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                filterCatEl.appendChild(opt);
            });
            filterCatEl.value = currentVal;
        }
        
        const taskCatEl = document.getElementById('taskCategory');
        if (taskCatEl) {
            const currentVal = taskCatEl.value;
            taskCatEl.innerHTML = '';
            uniqueCategories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                taskCatEl.appendChild(opt);
            });
            const newOpt = document.createElement('option');
            newOpt.value = '__NEW__';
            newOpt.textContent = '+ Add New Category...';
            newOpt.style.fontWeight = 'bold';
            taskCatEl.appendChild(newOpt);
            taskCatEl.value = currentVal;
            if(!taskCatEl.value) taskCatEl.value = 'CBT';
        }

        if(window.applyTaskFilters) {
            window.applyTaskFilters();
        } else {
            renderKanban(window.allTasks);
            if (typeof renderTasksAsSyllabus === 'function') {
                renderTasksAsSyllabus(window.allTasks);
            }
        }
    } else {
        showToast('Failed to load tasks: ' + res.error, 'error');
    }
}

window.applyTaskFilters = function() {
    if (!window.allTasks) return;
    let filtered = window.allTasks;
    
    const filterCatEl = document.getElementById('filterTaskCategory');
    const search = (document.getElementById('filterTaskSearch') ? document.getElementById('filterTaskSearch').value.toLowerCase() : '');
    const category = (filterCatEl ? filterCatEl.value : 'all');
    const semester = (document.getElementById('filterTaskSemester') ? document.getElementById('filterTaskSemester').value : 'all');
    const assignee = (document.getElementById('filterTaskAssignee') ? document.getElementById('filterTaskAssignee').value : 'all');
    
    if(search) {
        filtered = filtered.filter(t => 
            (t.title && t.title.toLowerCase().includes(search)) || 
            (t.description && t.description.toLowerCase().includes(search))
        );
    }
    if(category !== 'all') {
        filtered = filtered.filter(t => t.category === category);
    }
    if(semester !== 'all') {
        filtered = filtered.filter(t => t.semester === parseInt(semester));
    }
    if(assignee !== 'all') {
        if(assignee === 'me') {
            filtered = filtered.filter(t => t.assigned_to === currentUserId);
        } else if (assignee === 'unassigned') {
            filtered = filtered.filter(t => !t.assigned_to);
        }
    }
    
    renderKanban(filtered);
    if (typeof renderTasksAsSyllabus === 'function') {
        renderTasksAsSyllabus(filtered);
    }
};

function renderKanban(tasks) {
    const cols = {
        'open': document.querySelector('#col-open .task-list'),
        'in_progress': document.querySelector('#col-in_progress .task-list'),
        'developed': document.querySelector('#col-developed .task-list'),
        'in_review': document.querySelector('#col-in_review .task-list'),
        'done': document.querySelector('#col-done .task-list')
    };

    // Clear columns
    Object.values(cols).forEach(c => { if(c) c.innerHTML = ''; });

    tasks.forEach(task => {
        const col = cols[task.status];
        if(!col) return;

        const el = document.createElement('div');
        el.className = 'kanban-card';
        
        let displayDesc = task.description || '';
        let dueDateStr = '';
        let dueColor = 'var(--text-muted)';
        const dueMatch = displayDesc.match(/\[Due:\s*([^\]]+)\]/);
        if (dueMatch) {
            dueDateStr = dueMatch[1];
            displayDesc = displayDesc.replace(dueMatch[0], '').trim();
            const dueTime = new Date(dueDateStr).getTime();
            const now = Date.now();
            if (dueTime < now) dueColor = 'var(--danger)';
            else if (dueTime < now + 86400000 * 3) dueColor = '#ffa500';
        }

        let meta = `<div style="font-size:13px; margin-bottom:6px;"><span style="color:var(--text-muted)">Sem:</span> ${task.semester || '-'} | <span style="color:var(--text-muted)">Blk:</span> ${task.block || '-'}</div>`;
        if (task.assigned_to_user) {
            meta += `<div style="font-size:13px; margin-bottom:6px;"><span style="color:var(--text-muted)">Dev:</span> ${task.assigned_to_user.username || task.assigned_to_user.email.split('@')[0]}</div>`;
        }
        if (task.reviewed_by_user) {
            meta += `<div style="font-size:13px; margin-bottom:6px;"><span style="color:var(--text-muted)">Rev:</span> ${task.reviewed_by_user.username || task.reviewed_by_user.email.split('@')[0]}</div>`;
        }
        
        let activeDateLabel = '';
        let activeDateVal = '';
        if (task.status === 'open' && task.created_at) { activeDateLabel = 'Created'; activeDateVal = task.created_at; }
        else if (task.status === 'in_progress' && task.assigned_at) { activeDateLabel = 'Assigned'; activeDateVal = task.assigned_at; }
        else if (task.status === 'developed' && task.submitted_at) { activeDateLabel = 'Submitted'; activeDateVal = task.submitted_at; }
        else if (task.status === 'in_review' && task.review_started_at) { activeDateLabel = 'Reviewed'; activeDateVal = task.review_started_at; }
        else if (task.status === 'done' && task.completed_at) { activeDateLabel = 'Done'; activeDateVal = task.completed_at; }
        
        if (activeDateVal) {
            meta += `<div style="margin-top:6px; font-size:12px;"><span style="color:var(--text-muted)">${activeDateLabel}:</span> <span>${new Date(activeDateVal).toLocaleDateString()}</span></div>`;
        }

        if (dueDateStr) {
            meta += `<div style="margin-top:6px; font-size:12px;"><span style="color:var(--text-muted)">Due:</span> <span style="color:${dueColor}; font-weight:bold;">${dueDateStr}</span></div>`;
        }
        if (task.target_path) {
            meta += `<div style="margin-top:6px; font-size:12px;"><span style="color:var(--text-muted)">File:</span> <span style="font-family:var(--font-mono); color:var(--accent);">${task.target_path}</span></div>`;
        }

        el.innerHTML = `
            <div style="font-weight:700; font-size:16px; margin-bottom:8px; line-height:1.3; color:var(--text-main);">${task.title}</div>
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:12px; line-height:1.5;">${displayDesc}</div>
            ${meta}
        `;
        
        el.onclick = () => openTaskModal(task);
        col.appendChild(el);
    });
}

async function createNewTaskPrompt() {
    const modal = document.getElementById('createTaskModal');
    const titleEl = document.getElementById('taskTitle');
    const catEl = document.getElementById('taskCategory');
    const prioEl = document.getElementById('taskPriority');
    const semEl = document.getElementById('taskSemester');
    const blockEl = document.getElementById('taskBlock');
    const descEl = document.getElementById('taskDescription');
    const targetEl = document.getElementById('taskTargetPath');
    const assignEl = document.getElementById('taskAssignTo');
    const btnCancel = document.getElementById('taskCancel');
    const btnConfirm = document.getElementById('taskConfirm');

    titleEl.value = '';
    descEl.value = '';
    blockEl.value = '';
    if (targetEl) targetEl.value = window._prefilledTaskPath || '';
    window._prefilledTaskPath = ''; // reset after opening
    
    // Ensure the new category logic is attached only once
    if (!catEl.hasAttribute('data-new-cat-bound')) {
        catEl.addEventListener('change', async (e) => {
            if (e.target.value === '__NEW__') {
                const newCat = await customPrompt("Enter new category name:");
                if (newCat && newCat.trim()) {
                    const opt = document.createElement('option');
                    opt.value = newCat.trim();
                    opt.textContent = newCat.trim();
                    catEl.insertBefore(opt, catEl.lastElementChild);
                    catEl.value = newCat.trim();
                } else {
                    catEl.value = 'CBT';
                }
            }
        });
        catEl.setAttribute('data-new-cat-bound', 'true');
    }
    
    if (assignEl) {
        assignEl.innerHTML = '<option value="">-- Unassigned --</option>';
        apiCall('divisions', { action: 'get_divisions' }).then(res => {
            if (res.success) {
                const devDiv = res.divisions.find(d => d.id === 'development');
                if (devDiv && devDiv.members) {
                    devDiv.members.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m; // m is email here, wait, API needs user_id or email?
                        // Let's check api/divisions.js line 65: members: membersList (which are emails).
                        // If we need to send user_id to tasks.js, maybe it's better to pass email and let tasks.js resolve it,
                        // OR change api/divisions to return user_id too.
                        // Actually, tasks.js create_task expects target_user_id or something? No, we will add assigned_to (email or id). Let's send email and resolve in backend.
                        opt.textContent = m.split('@')[0];
                        assignEl.appendChild(opt);
                    });
                }
            }
        });
    }

    modal.classList.remove('hidden');

    return new Promise((resolve) => {
        const cleanup = () => {
            modal.classList.add('hidden');
            btnCancel.onclick = null;
            btnConfirm.onclick = null;
        };
        btnCancel.onclick = () => { cleanup(); resolve(null); };
        btnConfirm.onclick = async () => {
            const title = titleEl.value.trim();
            if(!title) return showToast('Title is required', 'error');
            
            const dueDateEl = document.getElementById('taskDueDate');
            let descText = descEl.value.trim();
            if (dueDateEl && dueDateEl.value) {
                descText += (descText ? '\n\n' : '') + '[Due: ' + dueDateEl.value + ']';
            }
            
            const payload = {
                action: 'create_task',
                title: title,
                category: catEl.value,
                priority: prioEl.value,
                semester: semEl.value,
                block: blockEl.value.trim() || 'General',
                description: descText,
                target_path: targetEl ? targetEl.value.trim() : null,
                assigned_to_email: assignEl && assignEl.value ? assignEl.value : null
            };
            cleanup();
            showToast('Creating task...');
            const res = await apiCall('tasks', payload);
            if(res.success) {
                showToast('Task created', 'success');
                loadTasks();
            } else {
                showToast(res.error, 'error');
            }
            resolve();
        };
    });
}

window.toggleTasksView = function() {
    const view = document.getElementById('tasksViewToggle').value;
    if (view === 'kanban') {
        document.getElementById('taskKanban').classList.remove('hidden');
        document.getElementById('syllabusTableContainer').classList.add('hidden');
    } else {
        document.getElementById('taskKanban').classList.add('hidden');
        document.getElementById('syllabusTableContainer').classList.remove('hidden');
    }
}

function renderTasksAsSyllabus(tasks) {
    const tbody = document.getElementById('syllabusTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No tasks found in syllabus.</td></tr>';
        return;
    }
    
    // Group tasks by Semester and Block
    const grouped = {};
    tasks.forEach(t => {
        const key = `Semester ${t.semester || '-'} / ${t.block || '-'}`;
        if(!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
    });
    
    const sortedKeys = Object.keys(grouped).sort();
    
    let html = '';
    sortedKeys.forEach(key => {
        // Group Header
        html += `<tr style="background:var(--bg-main);"><td colspan="6" style="padding:8px 16px; font-weight:600; color:var(--accent); border-bottom:1px solid var(--border-light);">${key}</td></tr>`;
        
        grouped[key].forEach(t => {
            const badgeClass = 
                t.status === 'open' ? '' : 
                (t.status === 'done' ? 'badge-admin' : 'badge-banned');
            
            const assignee = t.assigned_to_user ? (t.assigned_to_user.username || t.assigned_to_user.email.split('@')[0]) : '<span style="color:var(--text-muted)">Unassigned</span>';
            
            html += `<tr style="border-bottom:1px solid var(--border-light); transition:background 0.2s; cursor:pointer;" onclick="openTaskModal(${JSON.stringify(t).replace(/"/g, '&quot;')})" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                <td style="padding:16px 24px; font-size:14px; color:var(--text-muted);">${t.semester || '-'} / ${t.block || '-'}</td>
                <td style="padding:16px 24px; font-size:15px; font-weight:600;">${t.title}</td>
                <td style="padding:16px 24px;"><span class="badge" style="background:var(--bg-card); padding:6px 10px; font-size:11px; border:1px solid var(--border-light); color:var(--text-main);">${t.category || '-'}</span></td>
                <td style="padding:16px 24px;"><span class="badge ${badgeClass}" style="padding:6px 10px; font-size:11px;">${t.status.toUpperCase()}</span></td>
                <td style="padding:16px 24px; font-size:14px;">${assignee}</td>
                <td style="padding:16px 24px;"><button class="btn-card">View details</button></td>
            </tr>`;
        });
    });
    
    tbody.innerHTML = html;
}

function openTaskModal(task) {
    window.currentOpenedTask = task;
    const isDev = currentUserDivision === 'development' || isAdminUser;
    const isRev = currentUserDivision === 'review' || isAdminUser;
    const isMyTask = task.assigned_to === currentUserId;

    let actionsHtml = '';
    if (task.status === 'open' && isDev) {
        actionsHtml += `<button class="btn primary" onclick="updateTask('${task.id}', 'claim_task')">Claim Task</button>`;
    } else if (task.status === 'in_progress' && isMyTask) {
        actionsHtml += `<button class="btn" onclick="updateTask('${task.id}', 'unclaim_task')">Unclaim</button>`;
        actionsHtml += `<button class="btn primary" onclick="updateTask('${task.id}', 'submit_task')">Submit for Review</button>`;
    } else if (task.status === 'developed' && isRev) {
        actionsHtml += `<button class="btn primary" onclick="updateTask('${task.id}', 'start_review')">Start Review</button>`;
    } else if (task.status === 'in_review' && isRev) {
        actionsHtml += `<button class="btn" onclick="updateTask('${task.id}', 'reject_task')" style="border-color:var(--danger); color:var(--danger)">Reject</button>`;
        actionsHtml += `<button class="btn primary" onclick="updateTask('${task.id}', 'approve_task')">Approve (Done)</button>`;
    }

    const modal = document.getElementById('contextModal');
    document.getElementById('contextTitle').textContent = task.title;
    const acts = document.getElementById('contextActions');
    
    let details = `<div style="font-size:14px; margin-bottom:20px; padding:20px; background:var(--bg-card); border-radius:0; line-height:1.6;">
        <div style="margin-bottom:8px;"><b>Status:</b> <span class="badge" style="background:var(--bg-main); border:1px solid var(--border-light); padding:4px 8px; margin-left:4px;">${task.status.toUpperCase()}</span></div>
        <div style="margin-bottom:8px;"><b>Category:</b> ${task.category || '-'}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span><b>Developer:</b> ${task.assigned_to_user ? task.assigned_to_user.email : 'Unassigned'}</span>
            ${task.assigned_to_user && task.assigned_to_user.whatsapp ? `<a href="https://wa.me/${task.assigned_to_user.whatsapp}?text=Hi, regarding MR CAPSULES task '${task.title}'" target="_blank" class="btn-card primary" style="text-decoration:none;">Contact WA</a>` : ''}
        </div>
        <div style="margin-bottom:8px;"><b>Reviewer:</b> ${task.reviewed_by_user ? (task.reviewed_by_user.username || task.reviewed_by_user.email.split('@')[0]) : 'Unassigned'}</div>
        ${task.target_path ? `<div style="margin-top:16px;"><b>Target File:</b> <span style="font-family:var(--font-mono); color:var(--accent);">${task.target_path}</span></div>` : ''}
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-light);">
            <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Timeline</div>
            <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 16px; font-size:13px;">
                <span style="color:var(--text-muted)">Created:</span> <span>${task.created_at ? new Date(task.created_at).toLocaleString() : '-'}</span>
                <span style="color:var(--text-muted)">Assigned:</span> <span>${task.assigned_at ? new Date(task.assigned_at).toLocaleString() : '-'}</span>
                <span style="color:var(--text-muted)">Submitted:</span> <span>${task.submitted_at ? new Date(task.submitted_at).toLocaleString() : '-'}</span>
                <span style="color:var(--text-muted)">Reviewed:</span> <span>${task.review_started_at ? new Date(task.review_started_at).toLocaleString() : '-'}</span>
                <span style="color:var(--text-muted)">Completed:</span> <span>${task.completed_at ? new Date(task.completed_at).toLocaleString() : '-'}</span>
            </div>
        </div>
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border-light);">
            <div style="font-weight:700; margin-bottom:8px;">Description & Notes:</div>
            <div style="white-space:pre-wrap; color:var(--text-main);">${task.description || 'No description provided.'}</div>
        </div>
        <div style="margin-top:12px;"><button class="btn-card" style="width:100%; justify-content:center;" onclick="loadTaskLogs('${task.id}')">View Activity Logs</button></div>
        <div id="taskLogsContainer_${task.id}" style="margin-top:8px; max-height:150px; overflow-y:auto;"></div>
    </div>`;

    if (task.target_path) {
        actionsHtml = `<button class="btn primary" style="background:#ffa500; border-color:#ffa500; color:#000; font-weight:600; flex:1;" onclick="openTaskFile('${task.target_path}')">Open File in Editor</button>` + actionsHtml;
    }

    acts.innerHTML = details + `<div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">${actionsHtml}</div>`;
    modal.classList.remove('hidden');
}

window.loadTaskLogs = async function(taskId) {
    const container = document.getElementById('taskLogsContainer_' + taskId);
    container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:11px;">Loading logs...</div>';
    const res = await apiCall('tasks', { action: 'get_task_logs', task_id: taskId });
    if(res.success) {
        if(res.logs.length === 0) {
            container.innerHTML = '<div style="font-size:11px; color:var(--text-muted);">No activity logs found.</div>';
            return;
        }
        
        // Find latest rejection note if task is in progress
        const isRejected = window.currentOpenedTask && window.currentOpenedTask.status === 'in_progress';
        let rejectNoteHtml = '';
        if (isRejected) {
            const lastReject = res.logs.find(l => l.action === 'rejected');
            if (lastReject && lastReject.note) {
                rejectNoteHtml = `<div style="margin-bottom:12px; padding:8px; background:rgba(0, 0, 0, 0.1); border-left:3px solid var(--danger); border-radius:0;">
                    <div style="font-size:10px; font-weight:bold; color:var(--danger); text-transform:uppercase;">Latest Rejection Reason</div>
                    <div style="font-size:11px; color:var(--text-main); margin-top:4px;">"${lastReject.note}"</div>
                </div>`;
            }
        }

        container.innerHTML = rejectNoteHtml + res.logs.map(l => {
            let noteHtml = l.note ? `<div style="color:var(--text-main); font-style:italic; margin-top:4px; padding-left:8px; border-left:2px solid var(--border-medium);">"${l.note}"</div>` : '';
            return `<div style="font-size:11px; border-bottom:1px solid var(--border-light); padding:8px 0;">
                <div><span style="color:var(--accent); font-weight:600;">${l.action.toUpperCase()}</span> by <b>${l.user ? (l.user.username || l.user.email.split('@')[0]) : 'System'}</b></div>
                <div style="color:var(--text-muted); font-size:10px; margin-top:2px;">${new Date(l.created_at).toLocaleString()}</div>
                ${noteHtml}
            </div>`;
        }).join('');
    } else {
        container.innerHTML = `<div style="color:var(--danger); font-size:11px;">Failed to load logs.</div>`;
    }
}

window.updateTask = async function(taskId, action) {
    let note = '';
    
    if (action === 'reject_task') {
        note = prompt("Mandatory: Please provide a reason for rejecting this task:");
        if (!note || !note.trim()) {
            showToast('Rejection reason is required.', 'error');
            return;
        }
    } else if (action === 'submit_task') {
        note = prompt("Optional: Any notes for the reviewer?");
    } else if (action === 'approve_task') {
        note = prompt("Optional: Any final notes?");
    }

    document.getElementById('contextModal').classList.add('hidden');
    showToast('Updating task...');
    const res = await apiCall('tasks', { action, task_id: taskId, note: note ? note.trim() : null });
    if(res.success) {
        showToast('Task updated', 'success');
        loadTasks();
    } else {
        showToast('Error: ' + res.error, 'error');
    }
};

window.openTaskFile = function(path) {
    document.getElementById('contextModal').classList.add('hidden');
    // Switch to Files tab
    const filesTab = document.querySelector('.tab[data-target="viewFiles"]');
    if(filesTab) filesTab.click();
    
    if (window.currentTree) {
        const node = window.currentTree.find(n => n.path === path);
        if (node) {
            if(window.loadFile) window.loadFile(node);
        } else {
            showToast('File not found in tree. Refreshing...', 'warning');
            if(window.loadTree) {
                window.loadTree().then(() => {
                    const retryNode = window.currentTree.find(n => n.path === path);
                    if(retryNode) window.loadFile(retryNode);
                    else showToast('File really not found', 'error');
                });
            }
        }
    }
};

// =======================
// DIVISIONS
// =======================
window.selectDivision = function(divId) {
    window.currentDivisionId = divId;
    
    document.querySelectorAll('.btn-div-item').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-main)';
    });
    
    const btnAll = document.getElementById('btnDivFilterAll');
    if(btnAll) {
        btnAll.style.background = 'transparent';
        btnAll.style.color = 'var(--text-main)';
    }

    if(divId === 'all') {
        if(btnAll) {
            btnAll.style.background = 'var(--accent)';
            btnAll.style.color = 'var(--bg-main)';
        }
        if(document.getElementById('orgViewTitle')) document.getElementById('orgViewTitle').textContent = 'All Users';
        if(document.getElementById('orgViewDesc')) document.getElementById('orgViewDesc').textContent = 'Manage all registered members in the system.';
        if(document.getElementById('allUsersControls')) document.getElementById('allUsersControls').style.display = 'flex';
        if(document.getElementById('btnAddDivisionMember')) document.getElementById('btnAddDivisionMember').style.display = 'none';
    } else {
        const btn = document.querySelector('.btn-div-item[data-id="' + divId + '"]');
        if(btn) {
            btn.classList.add('active');
            btn.style.background = 'rgba(0, 0, 0, 0.1)';
            btn.style.color = 'var(--accent)';
        }
        
        const div = window.divisionData ? window.divisionData.find(d => d.id === divId) : null;
        if(div) {
            if(document.getElementById('orgViewTitle')) document.getElementById('orgViewTitle').textContent = div.name;
            if(document.getElementById('orgViewDesc')) document.getElementById('orgViewDesc').textContent = 'Viewing members of ' + div.name;
        }
        if(document.getElementById('allUsersControls')) document.getElementById('allUsersControls').style.display = 'none';
        if(document.getElementById('btnAddDivisionMember')) document.getElementById('btnAddDivisionMember').style.display = 'inline-block';
    }
    
    if(window.loadUsers) {
        window.loadUsers(divId);
    }
};

async function loadDivisions() {
    const res = await apiCall('divisions', { action: 'get_divisions' });
    if(res.success && res.divisions) {
        window.divisionData = res.divisions;
        const list = document.getElementById('divisionSidebarList');
        if(!list) return; // wait until DOM is ready or exists
        
        // Remove existing dynamic division buttons
        list.querySelectorAll('.btn-div-item').forEach(el => el.remove());
        
        // Show WA Config for all users
        const waConfig = document.getElementById('waConfigContainer');
        if(waConfig) waConfig.style.display = 'block';
        
        // Re-bind WA save just in case
        const btnSaveWa = document.getElementById('btnSaveWa');
        if(btnSaveWa) {
            btnSaveWa.onclick = async () => {
                const wa = document.getElementById('myWaInput').value;
                window.showToast('Saving...');
                const wRes = await apiCall('divisions', { action: 'update_whatsapp', whatsapp: wa });
                if(wRes.success) window.showToast('WhatsApp updated!', 'success');
                else window.showToast('Failed: ' + wRes.error, 'error');
            };
        }
        
        res.divisions.forEach(div => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-div-item';
            btn.setAttribute('data-id', div.id);
            btn.style.cssText = 'justify-content:space-between; padding:12px 16px; text-align:left; border:none; background:transparent; color:var(--text-main); font-size:15px; font-weight:700; border-radius:4px; margin-bottom:8px;';
            if(window.currentDivisionId === div.id) {
                btn.style.background = 'rgba(0, 0, 0, 0.1)';
                btn.style.color = 'var(--accent)';
                btn.classList.add('active');
            }
            
            btn.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${div.name}</span> <span style="font-size:13px; opacity:0.7; font-family:var(--font-mono);">${div.member_count}</span>`;
            
            btn.onclick = () => window.selectDivision(div.id);
            list.appendChild(btn);
        });
        
        // If current division is not 'all', refresh the user view
        if(window.currentDivisionId !== 'all') {
            window.selectDivision(window.currentDivisionId);
        }
    }
}

window.promptAddMember = async function(divId) {
    const email = prompt("Enter member's exact email address:");
    if(!email) return;
    window.showToast('Assigning member...');
    const res = await apiCall('divisions', { action: 'assign_member', target_email: email, division_id: divId });
    if(res.success) { window.showToast('Assigned!', 'success'); loadDivisions(); }
    else window.showToast('Failed: ' + res.error, 'error');
};

window.removeMember = async function(email, divId) {
    if(!confirm('Remove ' + email + ' from this division?')) return;
    window.showToast('Removing...');
    const res = await apiCall('divisions', { action: 'remove_member', target_email: email, division_id: divId });
    if(res.success) { window.showToast('Removed!', 'success'); loadDivisions(); }
    else window.showToast('Failed: ' + res.error, 'error');
};

// =======================
// CONTRIBUTIONS
// =======================
window.loadContributions = async function() {
    const resMe = await apiCall('contributions', { action: 'get_my_contributions' });
    if(resMe.success) {
        const total = resMe.contributions.reduce((sum, c) => sum + c.points, 0);
        document.getElementById('myPoints').textContent = total;
        
        // check 30 days
        const hasRecent = resMe.contributions.some(c => new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const statusEl = document.getElementById('contributionStatus');
        if(hasRecent || isAdminUser) {
            statusEl.textContent = 'Active Contributor (Access Granted)';
            statusEl.style.color = '#000000';
        } else {
            statusEl.textContent = 'Inactive for 30 days (Access Revoked)';
            statusEl.style.color = 'var(--danger)';
        }
    } else {
        console.error('Failed to get contributions:', resMe);
        showToast('Error getting contributions: ' + (resMe.error || 'Unknown'), 'error');
    }

    const resLeader = await apiCall('contributions', { action: 'get_leaderboard' });
    if(resLeader.success) {
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '';
        resLeader.leaderboard.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `${i+1}.`));
            list.innerHTML += `
                <li style="display:flex; justify-content:space-between; padding:12px 24px; border-bottom:1px solid var(--border-light); align-items:center;">
                    <div style="display:flex; gap:16px; align-items:center;">
                        <span style="font-size:16px; font-weight:600; width:24px;">${medal}</span>
                        <span style="font-size:14px;">${u.username || u.email.split('@')[0]}</span>
                    </div>
                    <div style="font-weight:700; color:var(--accent);">${u.points} pts</div>
                </li>
            `;
        });
    } else {
        console.error('Failed to get leaderboard:', resLeader);
        showToast('Error getting leaderboard: ' + (resLeader.error || 'Unknown'), 'error');
    }
}

// =======================
// CBT REVIEW SCRAPPER
// =======================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tab[data-target="viewDashboard"]')?.addEventListener('click', () => {
        window.loadContributions();
    });
});
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnLoadReviewFile')?.addEventListener('click', async () => {
        const path = document.getElementById('reviewFilePath').value.trim();
        if(!path) return showToast('Please enter a file path', 'error');

        showToast('Fetching HTML from GitHub...');
        // We reuse the existing adminAction 'download' from admin.js to get the file
        // To do this we have to fetch directly via our own custom call because adminAction is not exported
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ action: 'download', path })
        });
        const data = await res.json();
        if(data.success) {
            parseCBTHtml(path, data.content);
        } else {
            showToast('Failed to load: ' + data.error, 'error');
        }
    });
});

let currentReviewContent = '';
let currentReviewPath = '';
let parsedQuestions = [];

function parseCBTHtml(path, html) {
    currentReviewContent = html;
    currentReviewPath = path;
    parsedQuestions = [];

    document.getElementById('reviewFileName').textContent = path.split('/').pop();
    document.getElementById('reviewEditorArea').style.display = 'flex';
    const listEl = document.getElementById('reviewQuestionsList');
    listEl.innerHTML = '';

    // A simple regex parser for CBT structure
    // Assumes structure: <div class="soal">...</div>, <div class="pilihan">...</div>, dll.
    // If the HTML is complex, we use a DOM parser.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Trying to find standard question blocks. Usually encapsulated in cards or lists.
    // Let's look for elements that have text matching "Soal" or input radios.
    const qContainers = doc.querySelectorAll('.soal-container, .card, .question-block, fieldset');
    
    if(qContainers.length === 0) {
        listEl.innerHTML = '<div style="padding:16px; background:rgba(0, 0, 0, 0.1); color:var(--danger); border-radius:0;">No standard question blocks found. This scrapper supports specific CBT HTML formats. You can still use the raw HTML editor in the Files tab.</div>';
        return;
    }

    showToast(`Found ${qContainers.length} questions`);
    
    // For each container, render a minimal editor block.
    // (In a full implementation, we would extract exact text, bind to inputs, and rebuild HTML on save.
    // Since the actual format is unknown, we will provide a raw HTML block editor per question for the reviewer).
    
    qContainers.forEach((q, idx) => {
        const outerHTML = q.outerHTML;
        const block = document.createElement('div');
        block.style.cssText = 'background:var(--bg-main); padding:16px; border-radius:0; border:1px solid var(--border-medium);';
        
        block.innerHTML = `
            <div style="font-weight:600; margin-bottom:8px;">Question ${idx + 1}</div>
            <textarea id="q_edit_${idx}" style="width:100%; height:150px; background:#1e1e1e; color:#d4d4d4; font-family:monospace; font-size:12px; padding:12px; border:1px solid #333; border-radius:0; resize:vertical;">${outerHTML}</textarea>
            <div style="margin-top:8px; display:flex; justify-content:flex-end;">
               <button class="btn btn-report-issue" data-idx="${idx}" style="border-color:var(--danger); color:var(--danger);">Report Issue</button>
            </div>
        `;
        listEl.appendChild(block);

        block.querySelector('.btn-report-issue').addEventListener('click', async () => {
            const issue = prompt('Describe the issue with this question:');
            if(!issue) return;
            showToast('Reporting issue...');
            const r = await apiCall('review-tools', { 
                action: 'report_issue', 
                question_index: idx, 
                file_path: path, 
                issue_description: issue 
            });
            if(r.success) showToast('Issue reported!', 'success');
            else showToast('Failed: ' + r.error, 'error');
        });

        parsedQuestions.push({ node: q, idx });
    });

    document.getElementById('btnSaveReview').onclick = async () => {
        // Update doc with new HTML from textareas
        parsedQuestions.forEach(pq => {
            const newHtml = document.getElementById(`q_edit_${pq.idx}`).value;
            const temp = document.createElement('div');
            temp.innerHTML = newHtml;
            if(temp.firstElementChild) {
                pq.node.replaceWith(temp.firstElementChild);
            }
        });

        const finalHtml = doc.documentElement.outerHTML;
        const base64 = btoa(unescape(encodeURIComponent(finalHtml)));

        showToast('Saving to GitHub...');
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ action: 'upload', path: currentReviewPath, contentBase64: base64 })
        });
        const data = await res.json();
        if(data.success) {
            showToast('Saved successfully!', 'success');
        } else {
            showToast('Save failed: ' + data.error, 'error');
        }
    };
}
