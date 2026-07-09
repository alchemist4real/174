const fs = require('fs');
let js = fs.readFileSync('admin-workflow.js', 'utf8');

js = js.replace(
    `<td style="padding:16px 24px;"><button class="btn-card" style="font-size:12px; padding:6px 12px;">View details</button></td>`,
    `<td style="padding:16px 24px;"><button class="btn-card">View details</button></td>`
);

js = js.replace(
    `\${task.assigned_to_user && task.assigned_to_user.whatsapp ? \`<a href="https://wa.me/\${task.assigned_to_user.whatsapp}?text=Hi, regarding MR CAPSULES task '\${task.title}'" target="_blank" class="btn-card primary" style="font-size:12px; text-decoration:none; padding:4px 10px;">Contact WA</a>\` : ''}`,
    `\${task.assigned_to_user && task.assigned_to_user.whatsapp ? \`<a href="https://wa.me/\${task.assigned_to_user.whatsapp}?text=Hi, regarding MR CAPSULES task '\${task.title}'" target="_blank" class="btn-card primary" style="text-decoration:none;">Contact WA</a>\` : ''}`
);

js = js.replace(
    `<div style="margin-top:12px;"><button class="btn-card" style="width:100%; justify-content:center; padding:8px;" onclick="loadTaskLogs('\${task.id}')">View Activity Logs</button></div>`,
    `<div style="margin-top:12px;"><button class="btn-card" style="width:100%; justify-content:center;" onclick="loadTaskLogs('\${task.id}')">View Activity Logs</button></div>`
);

fs.writeFileSync('admin-workflow.js', js);
console.log('Restored user styling changes without breaking syntax.');
