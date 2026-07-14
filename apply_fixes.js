const fs = require('fs');

function replaceAll(file, replacements) {
    if(!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for(const r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    if(content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}

// 1. global-styles.css: status-bar to toast
replaceAll('global-styles.css', [
    {
        search: /\.status-bar\s*\{\s*padding:\s*8px\s*24px;\s*font-size:\s*12px;\s*color:\s*color-mix\(in\s*srgb,\s*var\(--c3\)\s*60%,\s*transparent\);\s*border-top:\s*1\.5px\s*solid\s*var\(--c3\);\s*display:\s*flex;\s*justify-content:\s*space-between;\s*\}/g,
        replace: `.status-bar {
  position: fixed; bottom: 80px; left: 24px; z-index: 900;
  background: var(--c1); border: var(--border-main); border-radius: var(--radius-card);
  padding: 8px 16px; font-size: 12px; color: var(--c3); font-family: var(--font-mono);
  display: flex; gap: 16px; align-items: center; justify-content: space-between;
  box-shadow: 4px 4px 0 var(--border-medium);
}`
    }
]);

// 2. admin-workflow.js & live.js: fix inline styles in K1 modal
const scriptReplacements = [
    {
        search: /background:var\(--bg-card\); border-radius:0;/g,
        replace: `background:var(--c1); border:var(--border-main); border-radius:var(--radius-card);`
    },
    {
        search: /background:#ffa500; border-color:#ffa500; color:#000;/g,
        replace: `background:var(--c3); border-color:var(--c3); color:var(--c1); border-radius:var(--radius-pill);`
    },
    {
        search: /background:rgba\(0,\s*0,\s*0,\s*0\.1\); border-left:3px solid var\(--danger\);/g,
        replace: `background:transparent; border:1.5px solid var(--danger);`
    },
    {
        search: /border-radius:0 4px 4px 0;/g,
        replace: `border-radius:var(--radius-card);`
    },
    {
        search: /background:#1e1e1e; color:#d4d4d4; font-family:monospace;/g,
        replace: `background:var(--c2); color:var(--c3); font-family:var(--font-mono);`
    },
    {
        search: /background:rgba\(0,\s*0,\s*0,\s*0\.1\); color:var\(--danger\);/g,
        replace: `background:transparent; color:var(--danger); border:1.5px solid var(--danger);`
    }
];
replaceAll('admin-workflow.js', scriptReplacements);
replaceAll('live.js', scriptReplacements);

// 3. index.html: fix broadcast modal styles and inline font-family
replaceAll('index.html', [
    {
        search: /font-family:\s*['"]?Inter['"]?,\s*sans-serif;/g,
        replace: `font-family: var(--font-mono);`
    },
    {
        search: /font-family:\s*['"]?Outfit['"]?,\s*sans-serif;/g,
        replace: `font-family: var(--font-sans);`
    },
    {
        search: /font-family:\s*['"]?Arial['"]?,\s*sans-serif;/g,
        replace: `font-family: var(--font-mono);`
    },
    { // Broadcast modal specifically
        search: /background:var\(--bg-card\);\s*color:var\(--text-main\);\s*border:1px solid var\(--border-light\);\s*border-radius:16px;/g,
        replace: `background:var(--c1); color:var(--c3); border:var(--border-main); border-radius:var(--radius-card);`
    },
    {
        search: /font-family: system-ui,\s*-apple-system,\s*sans-serif;/g,
        replace: `font-family: var(--font-mono);`
    },
    {
        search: /border-radius:24px;/g,
        replace: `border-radius:var(--radius-card);`
    }
]);

// 4. docs.html: complete redesign of inline styles
replaceAll('docs.html', [
    {
        search: /font-family:\s*['"]?Inter['"]?,\s*sans-serif;/gi,
        replace: `font-family: var(--font-mono);`
    },
    {
        search: /background-color:\s*#f9fafb;/g,
        replace: `background: var(--c1); color: var(--c3);`
    },
    {
        search: /color:\s*#111827;/gi,
        replace: `color: var(--c3);`
    },
    {
        search: /color:\s*#4b5563;/gi,
        replace: `color: var(--c3); opacity: 0.7;`
    },
    {
        search: /border:\s*1px\s*solid\s*#e5e7eb;/gi,
        replace: `border: var(--border-main);`
    },
    {
        search: /border-radius:\s*(12|8|16)px;/g,
        replace: `border-radius: var(--radius-card);`
    },
    {
        search: /background:\s*white;/gi,
        replace: `background: var(--c1);`
    },
    {
        search: /background-color:\s*#eff6ff;/gi,
        replace: `background: color-mix(in srgb, var(--c3) 10%, transparent);`
    },
    {
        search: /color:\s*#2563eb;/gi,
        replace: `color: var(--c4);`
    },
    {
        search: /background-color:\s*#2563eb;/gi,
        replace: `background: var(--c3);`
    },
    {
        search: /color:\s*white;/gi,
        replace: `color: var(--c1);`
    },
    {
        search: /font-family:.*?sans-serif;/g,
        replace: `font-family: var(--font-mono);`
    }
]);

// Fix guest cleanup bug in api/guest-cleanup.js
const guestCleanupScript = `export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbKey) return res.status(500).json({ error: 'Server config error' });

  // Verify caller is admin
  const userRes = await fetch(\`\${supabaseUrl}/auth/v1/user\`, {
    headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${token}\` }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const userData = await userRes.json();

  // Try to bypass roles for superadmin
  const isSuperAdmin = userData.email === (process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com');
  
  if (!isSuperAdmin) {
    const encEmail = encodeURIComponent(userData.email);
    const roleRes = await fetch(\`\${supabaseUrl}/rest/v1/user_roles?identifier=eq.\${encEmail}&select=role\`, {
      headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` }
    });
    let roleData = [];
    if (roleRes.ok) roleData = await roleRes.json();
    const hasAdminRole = roleData && roleData.length > 0 && roleData[0].role === 'admin';
    if (!hasAdminRole) return res.status(403).json({ error: 'Forbidden. Admin only.' });
  }

  try {
    // robust parsing
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }
    const maxAge = body?.max_age_hours || 24; 
    const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000).toISOString();

    let allUsers = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const usersRes = await fetch(\`\${supabaseUrl}/auth/v1/admin/users?page=\${page}&per_page=100\`, {
        headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` }
      });
      if (!usersRes.ok) {
         const err = await usersRes.text();
         return res.status(500).json({ error: 'Failed to fetch users: ' + err });
      }
      const usersData = await usersRes.json();
      const users = usersData.users || [];
      allUsers = allUsers.concat(users);
      if (users.length < 100) hasMore = false;
      page++;
    }

    const guestUsers = allUsers.filter(u => {
      const isGuestEmail = u.email && u.email.match(/^guest_\\d+_\\d+@mrcapsules\\.com$/);
      const isGuestMeta = u.user_metadata && u.user_metadata.is_guest;
      const isOldEnough = new Date(u.created_at) < new Date(cutoff);
      return (isGuestEmail || isGuestMeta) && isOldEnough;
    });

    let deleted = 0;
    let errors = [];

    // Parallel deletions can overload, so batch them 5 at a time
    for (let i = 0; i < guestUsers.length; i += 5) {
      const batch = guestUsers.slice(i, i + 5);
      await Promise.all(batch.map(async (guest) => {
        try {
            await fetch(\`\${supabaseUrl}/rest/v1/division_members?user_id=eq.\${guest.id}\`, { method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` } });
            await fetch(\`\${supabaseUrl}/rest/v1/user_stats?user_id=eq.\${guest.id}\`, { method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` } });
            await fetch(\`\${supabaseUrl}/rest/v1/user_devices?user_id=eq.\${guest.id}\`, { method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` } });
            const delRes = await fetch(\`\${supabaseUrl}/auth/v1/admin/users/\${guest.id}\`, { method: 'DELETE', headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` } });
            if (delRes.ok) deleted++;
            else errors.push({ email: guest.email, error: await delRes.text() });
        } catch(e) {
            errors.push({ email: guest.email, error: e.message });
        }
      }));
    }

    return res.status(200).json({
      success: true,
      total_guests_found: guestUsers.length,
      deleted,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
`;
fs.writeFileSync('api/guest-cleanup.js', guestCleanupScript);
console.log('Updated api/guest-cleanup.js');

// 5. Link docs.html to global-styles.css
let docsHtml = fs.readFileSync('docs.html', 'utf8');
if (!docsHtml.includes('global-styles.css')) {
    docsHtml = docsHtml.replace('</head>', '  <link rel="stylesheet" href="global-styles.css">\n</head>');
    fs.writeFileSync('docs.html', docsHtml);
    console.log('Linked global-styles.css in docs.html');
}

