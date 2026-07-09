const fs = require('fs');

// 1. Fix loadUsers to handle 'all' properly
let adminJs = fs.readFileSync('admin.js', 'utf8');

const badFilterLogic = `const filterToUse = divIdFilter || (window.currentDivisionId && window.currentDivisionId !== 'all' ? window.currentDivisionId : null);`;
const goodFilterLogic = `const filterToUse = (divIdFilter && divIdFilter !== 'all') ? divIdFilter : (window.currentDivisionId && window.currentDivisionId !== 'all' ? window.currentDivisionId : null);`;

adminJs = adminJs.replace(badFilterLogic, goodFilterLogic);

// 2. Bind .btn-remove-div
// It should be injected in renderUsers around where btn-revoke or btn-del-user is bound.
const targetDelUser = `        if (card.querySelector('.btn-del-user')) {
          card.querySelector('.btn-del-user').onclick = async (e) => {
            if(await customConfirm(\`WARNING: This will permanently delete the user \${email} from the database. This action cannot be undone. Proceed?\`)) {
              e.target.textContent = '...';
              adminAction('delete_user', { userId: u.id }).catch(() => e.target.textContent = 'Delete');
            }
          };
        }`;

const removeDivBinding = `        if (card.querySelector('.btn-remove-div')) {
          card.querySelector('.btn-remove-div').onclick = async (e) => {
            const targetEmail = e.target.getAttribute('data-email');
            if(window.removeMember) {
                window.removeMember(targetEmail, window.currentDivisionId);
            }
          };
        }`;

if(!adminJs.includes('btn-remove-div\').onclick')) {
    adminJs = adminJs.replace(targetDelUser, targetDelUser + '\n\n' + removeDivBinding);
}

fs.writeFileSync('admin.js', adminJs);
console.log('Fixed admin.js loadUsers filtering and btn-remove-div binding.');
