// 3-Division Workflow & Tasks Logic
let currentUserDivision = null;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for sessionToken to be populated by admin.js auth listener
    setTimeout(() => {
        if(sessionToken) initWorkflow();
    }, 1500);

    // Setup Refresh buttons
    document.getElementById('btnRefreshTasks')?.addEventListener('click', loadTasks);
    document.getElementById('btnRefreshDivisions')?.addEventListener('click', loadDivisions);
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
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(user) currentUserId = user.id;

    const divRes = await apiCall('divisions', { action: 'get_my_division' });
    if(divRes.success && divRes.division) {
        currentUserDivision = divRes.division.division_id;
        
        // Show create task button if management
        const btnCreateTask = document.getElementById('btnCreateTask');
        if(btnCreateTask && (currentUserDivision === 'management' || document.getElementById('userBadge').textContent.includes('Admin'))) {
            btnCreateTask.style.display = 'block';
            btnCreateTask.onclick = () => createNewTaskPrompt();
        }
    } else if (divRes.success && !divRes.division) {
        // User has no division, show picker
        document.getElementById('divisionPickerModal').classList.remove('hidden');
    }

    // Bind tab events to load data when activated
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            if(target === 'viewTasks') loadTasks();
            if(target === 'viewDivisions') loadDivisions();
            if(target === 'viewContributions') loadContributions();
        });
    });
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
    const res = await apiCall('tasks', { action: 'list_tasks' });
    if(res.success) {
        renderKanban(res.tasks || []);
    } else {
        showToast('Failed to load tasks: ' + res.error, 'error');
    }
}

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
        el.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-medium); border-left:4px solid var(--accent); padding:12px; border-radius:4px; font-size:12px; cursor:pointer;';
        
        let meta = `<div><span style="color:var(--text-muted)">Sem:</span> ${task.semester || '-'} | <span style="color:var(--text-muted)">Blk:</span> ${task.block || '-'}</div>`;
        if (task.assigned_to_user) {
            meta += `<div style="margin-top:4px;"><span style="color:var(--text-muted)">Dev:</span> ${task.assigned_to_user.email.split('@')[0]}</div>`;
        }

        el.innerHTML = `
            <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${task.title}</div>
            ${meta}
        `;
        
        el.onclick = () => openTaskModal(task);
        col.appendChild(el);
    });
}

async function createNewTaskPrompt() {
    // Simple prompt for title
    const modal = document.getElementById('promptModal');
    const titleEl = document.getElementById('promptTitle');
    const inputEl = document.getElementById('promptInput');
    const btnCancel = document.getElementById('promptCancel');
    const btnConfirm = document.getElementById('promptConfirm');

    titleEl.textContent = 'Create New Content Task';
    inputEl.value = '';
    inputEl.placeholder = 'e.g. 1.5 CBT - Farmakologi (Block 2)';
    modal.classList.remove('hidden');

    return new Promise((resolve) => {
        const cleanup = () => {
            modal.classList.add('hidden');
            btnCancel.onclick = null;
            btnConfirm.onclick = null;
        };
        btnCancel.onclick = () => { cleanup(); resolve(null); };
        btnConfirm.onclick = async () => {
            const title = inputEl.value.trim();
            cleanup();
            if(title) {
                const res = await apiCall('tasks', {
                    action: 'create_task', title, priority: 'normal',
                    semester: 'Unknown', block: 'Unknown'
                });
                if(res.success) {
                    showToast('Task created', 'success');
                    loadTasks();
                } else {
                    showToast(res.error, 'error');
                }
            }
            resolve();
        };
    });
}

function openTaskModal(task) {
    const isDev = currentUserDivision === 'development' || document.getElementById('userBadge').textContent.includes('Admin');
    const isRev = currentUserDivision === 'review' || document.getElementById('userBadge').textContent.includes('Admin');
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
    
    let details = `<div style="font-size:12px; margin-bottom:16px; padding:12px; background:var(--bg-card); border-radius:4px;">
        <div><b>Status:</b> ${task.status.toUpperCase()}</div>
        <div><b>Category:</b> ${task.category || '-'}</div>
        <div><b>Developer:</b> ${task.assigned_to_user ? task.assigned_to_user.email : 'Unassigned'}</div>
        <div><b>Reviewer:</b> ${task.reviewed_by_user ? task.reviewed_by_user.email : 'Unassigned'}</div>
        <div style="margin-top:12px;"><b>Description:</b><br>${task.description || 'No description provided.'}</div>
    </div>`;

    acts.innerHTML = details + `<div style="display:flex; gap:8px; justify-content:center;">${actionsHtml}</div>`;
    modal.classList.remove('hidden');
}

window.updateTask = async function(taskId, action) {
    document.getElementById('contextModal').classList.add('hidden');
    showToast('Updating task...');
    const res = await apiCall('tasks', { action, task_id: taskId });
    if(res.success) {
        showToast('Task updated', 'success');
        loadTasks();
    } else {
        showToast('Error: ' + res.error, 'error');
    }
};

// =======================
// DIVISIONS
// =======================
async function loadDivisions() {
    const res = await apiCall('divisions', { action: 'get_divisions' });
    if(res.success) {
        const grid = document.getElementById('divisionsGrid');
        grid.innerHTML = '';
        res.divisions.forEach(div => {
            grid.innerHTML += `
                <div style="background:var(--bg-card); padding:24px; border:1px solid var(--border-light); border-radius:6px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="margin-top:0; color:var(--accent);">${div.name}</h3>
                    <p style="font-size:13px; color:var(--text-muted); min-height:40px;">${div.description}</p>
                    <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
                       <div style="font-size:24px; font-weight:700;">${div.member_count}</div>
                       <div style="font-size:11px; text-transform:uppercase; font-weight:600; color:var(--text-muted);">Members</div>
                    </div>
                </div>
            `;
        });
    }
}

// =======================
// CONTRIBUTIONS
// =======================
async function loadContributions() {
    const resMe = await apiCall('contributions', { action: 'get_my_contributions' });
    if(resMe.success) {
        const total = resMe.contributions.reduce((sum, c) => sum + c.points, 0);
        document.getElementById('myPoints').textContent = total;
        
        // check 30 days
        const hasRecent = resMe.contributions.some(c => new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const statusEl = document.getElementById('contributionStatus');
        if(hasRecent || document.getElementById('userBadge').textContent.includes('Admin')) {
            statusEl.textContent = 'Active Contributor (Access Granted)';
            statusEl.style.color = '#4ADE80';
        } else {
            statusEl.textContent = 'Inactive for 30 days (Access Revoked)';
            statusEl.style.color = 'var(--danger)';
        }
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
                        <span style="font-size:14px;">${u.email.split('@')[0]}</span>
                    </div>
                    <div style="font-weight:700; color:var(--accent);">${u.points} pts</div>
                </li>
            `;
        });
    }
}

// =======================
// CBT REVIEW SCRAPPER
// =======================
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
        listEl.innerHTML = '<div style="padding:16px; background:rgba(239,68,68,0.1); color:var(--danger); border-radius:4px;">No standard question blocks found. This scrapper supports specific CBT HTML formats. You can still use the raw HTML editor in the Files tab.</div>';
        return;
    }

    showToast(`Found ${qContainers.length} questions`);
    
    // For each container, render a minimal editor block.
    // (In a full implementation, we would extract exact text, bind to inputs, and rebuild HTML on save.
    // Since the actual format is unknown, we will provide a raw HTML block editor per question for the reviewer).
    
    qContainers.forEach((q, idx) => {
        const outerHTML = q.outerHTML;
        const block = document.createElement('div');
        block.style.cssText = 'background:var(--bg-main); padding:16px; border-radius:4px; border:1px solid var(--border-medium);';
        
        block.innerHTML = `
            <div style="font-weight:600; margin-bottom:8px;">Question ${idx + 1}</div>
            <textarea id="q_edit_${idx}" style="width:100%; height:150px; background:#1e1e1e; color:#d4d4d4; font-family:monospace; font-size:12px; padding:12px; border:1px solid #333; border-radius:4px; resize:vertical;">${outerHTML}</textarea>
            <div style="margin-top:8px; display:flex; justify-content:flex-end;">
               <button class="btn btn-report-issue" data-idx="${idx}" style="border-color:var(--danger); color:var(--danger);">Report Issue</button>
            </div>
        `;
        listEl.appendChild(block);

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
