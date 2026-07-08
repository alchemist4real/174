const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Header
html = html.replace('font-size:16px;">\n                Organization', 'font-size:20px;">\n                Organization');
html = html.replace('font-size:11px; font-weight:700; color:var(--text-muted); margin:24px 0 8px 12px; letter-spacing:1px; font-family:var(--font-mono);">DIVISIONS', 'font-size:14px; font-weight:700; color:var(--text-muted); margin:24px 0 12px 12px; letter-spacing:1px; font-family:var(--font-mono);">DIVISIONS');

// All Users Sidebar Button
html = html.replace('justify-content:flex-start; padding:8px 12px; text-align:left;', 'justify-content:flex-start; padding:12px 16px; font-size:15px; font-weight:700; text-align:left;');

// WA Config
html = html.replace('font-size:11px; font-weight:700; color:var(--text-main); margin-bottom:8px; font-family:var(--font-mono);">WhatsApp API', 'font-size:13px; font-weight:700; color:var(--text-main); margin-bottom:8px; font-family:var(--font-mono);">WhatsApp API');
html = html.replace('width:100%; margin-bottom:8px; padding:6px; font-size:12px;', 'width:100%; margin-bottom:12px; padding:10px; font-size:14px;');
html = html.replace('background:var(--accent); color:var(--bg-main); border:none; font-weight:700; padding:8px;"', 'background:var(--accent); color:var(--bg-main); border:none; font-weight:700; padding:12px; font-size:14px;"');

// Main Title & Desc
html = html.replace('font-size:24px; font-weight:700; margin:0; letter-spacing:-0.5px;', 'font-size:32px; font-weight:800; margin:0; letter-spacing:-1px;');
html = html.replace('font-size:13px; color:var(--text-muted); margin:6px 0 0 0; font-family:var(--font-mono);">Manage all', 'font-size:15px; color:var(--text-muted); margin:6px 0 0 0; font-family:var(--font-mono);">Manage all');

// Toolbar Buttons
html = html.replace('class="btn primary" style="display:none;" onclick="window.promptAddMember(window.currentDivisionId)">+ Add Member', 'class="btn primary" style="display:none; padding:12px 24px; font-size:15px; font-weight:700;" onclick="window.promptAddMember(window.currentDivisionId)">+ Add Member');
html = html.replace('class="btn" onclick="if(window.loadUsers) window.loadUsers(); if(window.loadDivisions) window.loadDivisions();"', 'class="btn" style="padding:12px 24px; font-size:15px; font-weight:700;" onclick="if(window.loadUsers) window.loadUsers(); if(window.loadDivisions) window.loadDivisions();"');

// Filters
html = html.replace('width:200px; font-size:12px; padding:6px 12px; margin-right:12px;', 'width:250px; font-size:14px; padding:10px 16px; margin-right:16px;');
html = html.replace(/font-size:11px; padding:6px 16px;/g, 'font-size:14px; padding:10px 24px; font-weight:700;');

// System Controls
html = html.replace('placeholder="Announcement message..." style="width:250px;"', 'placeholder="Announcement message..." style="width:300px; padding:10px 16px; font-size:14px;"');
html = html.replace('id="btnSendAnnouncement" class="btn primary">Broadcast', 'id="btnSendAnnouncement" class="btn primary" style="padding:10px 24px; font-size:14px; font-weight:700;">Broadcast');

fs.writeFileSync('admin.html', html);
console.log('admin.html styled.');

let js = fs.readFileSync('admin-workflow.js', 'utf8');
js = js.replace('padding:8px 12px; text-align:left; border:none; background:transparent; color:var(--text-main); font-size:13px; font-weight:600; border-radius:4px; margin-bottom:4px;', 'padding:12px 16px; text-align:left; border:none; background:transparent; color:var(--text-main); font-size:15px; font-weight:700; border-radius:4px; margin-bottom:8px;');
js = js.replace('<span style="font-size:11px; opacity:0.7;">${div.member_count}</span>', '<span style="font-size:13px; opacity:0.7; font-family:var(--font-mono);">${div.member_count}</span>');
fs.writeFileSync('admin-workflow.js', js);
console.log('admin-workflow.js styled.');
