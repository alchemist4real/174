const fs = require('fs');

let adminJs = fs.readFileSync('admin.js', 'utf8');

// 1. Add window.applyUserFilters
const unifiedFilterLogic = `
    window.currentFilter = 'all';
    window.applyUserFilters = function() {
        const searchInput = document.getElementById('searchUsersInput');
        const val = searchInput ? searchInput.value.toLowerCase() : '';
        const cards = document.querySelectorAll('#userBrowser .user-card');
        
        cards.forEach(card => {
            let show = true;
            
            // Category filter
            if (window.currentFilter === 'banned') show = card.getAttribute('data-banned') === 'true';
            else if (window.currentFilter === 'admin') show = card.getAttribute('data-admin') === 'true';
            else if (window.currentFilter === 'online') show = card.getAttribute('data-online') === 'true';
            
            // Text search
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
`;

// Insert it somewhere globally accessible. 
// At the top of DOMContentLoaded or right before `// User filter tabs`
adminJs = adminJs.replace('// User filter tabs', unifiedFilterLogic + '\n    // User filter tabs');

// 2. Update btn.onclick to use the unified function
const oldFilterOnclick = `
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
    });`;

const newFilterOnclick = `
    document.querySelectorAll('.user-filter').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.user-filter').forEach(function(b) { b.classList.remove('active'); b.style.background = 'transparent'; b.style.color = 'var(--text-main)'; });
        btn.classList.add('active');
        btn.style.background = 'var(--accent)';
        btn.style.color = 'var(--bg-main)';
        window.currentFilter = btn.getAttribute('data-filter');
        window.applyUserFilters();
      };
    });`;

adminJs = adminJs.replace(oldFilterOnclick, newFilterOnclick);
// Fallback if formatting doesn't match perfectly:
if (adminJs.includes(oldFilterOnclick) === false) {
    // try to regex replace it
    adminJs = adminJs.replace(/var currentFilter = 'all';\s*document\.querySelectorAll\('\.user-filter'\)\.forEach\(function\(btn\) \{[\s\S]*?\}\);\s*\}\);/, newFilterOnclick);
}

// 3. Update searchInput event listener
const oldSearchListener = `    document.addEventListener('DOMContentLoaded', () => {
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
    });`;

const newSearchListener = `    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('searchUsersInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if(window.applyUserFilters) window.applyUserFilters();
            });
        }
    });`;

if (adminJs.includes(oldSearchListener)) {
    adminJs = adminJs.replace(oldSearchListener, newSearchListener);
} else {
    // Regex replace
    adminJs = adminJs.replace(/document\.addEventListener\('DOMContentLoaded', \(\) => \{\s*const searchInput = document\.getElementById\('searchUsersInput'\);[\s\S]*?\}\);\s*\}\);\s*\n/g, newSearchListener + '\n');
}

// 4. Call applyUserFilters at the end of renderUsers
// Find end of renderUsers:
const renderUsersEnd = `        userBrowser.appendChild(card);
      });
    }`;
const newRenderUsersEnd = `        userBrowser.appendChild(card);
      });
      if (window.applyUserFilters) window.applyUserFilters();
    }`;

adminJs = adminJs.replace(renderUsersEnd, newRenderUsersEnd);


fs.writeFileSync('admin.js', adminJs);
console.log('Fixed search and filtering UI logic.');
