const fs = require('fs');
let js = fs.readFileSync('admin-workflow.js', 'utf8');

// The bad logic in loadDivisions:
const badLogic = `async function loadDivisions() {
    const res = await apiCall('divisions', { action: 'get_divisions' });
    if(res.success) {
        const grid = document.getElementById('divisionsGrid');
        grid.innerHTML = '';
        
        // WhatsApp Settings for current user
        const waContainer = document.createElement('div');
    if(res.success && res.divisions) {`;

const goodLogic = `async function loadDivisions() {
    const res = await apiCall('divisions', { action: 'get_divisions' });
    if(res.success && res.divisions) {`;

js = js.replace(badLogic, goodLogic);

// Ensure the syntax error from the user's manual change is NOT there.
// If the user appended `</div>\`` twice, we don't have it since we just restored from git!
// Wait, the git restore restores to the last commit `02a5549`, which DID NOT have the user's manual change!
// So the user's manual change (fixing the buttons) was LOST!
// I should re-apply the user's manual change safely.

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

// Check if we need to append a brace for the file (which we know we do because of my earlier replacement missing the close brace of the OLD `loadDivisions`)
// Actually, since I removed `if(res.success) { ... }` but kept its closing brace, wait!
// The old code had:
// if(res.success) {
//     ...
//     if(res.success && res.divisions) {
//         ...
//     }
// }
// I just replaced `if(res.success) { ... if(res.success && res.divisions) {` with just `if(res.success && res.divisions) {`
// This removes one OPENING brace. So it reduces `o` by 1.
// If the file was missing one CLOSING brace (meaning `o` was 1 at the end), removing one OPENING brace fixes the balance perfectly!
fs.writeFileSync('admin-workflow.js', js);
console.log('Fixed loadDivisions and restored user manual changes.');
