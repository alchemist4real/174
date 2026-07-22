// Disable default Vercel body parser to receive raw multipart stream
export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipart(bodyBuffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  while (true) {
    const index = bodyBuffer.indexOf(boundaryBuffer, start);
    if (index === -1) break;
    
    const nextIndex = bodyBuffer.indexOf(boundaryBuffer, index + boundaryBuffer.length);
    if (nextIndex === -1) break;

    const partBuffer = bodyBuffer.slice(index + boundaryBuffer.length, nextIndex);
    parts.push(partBuffer);
    start = nextIndex;
  }

  const result = {};
  for (const part of parts) {
    const doubleCrlf = Buffer.from('\r\n\r\n');
    const headerEnd = part.indexOf(doubleCrlf);
    if (headerEnd === -1) continue;

    const headerStr = part.slice(0, headerEnd).toString('utf-8');
    const bodyVal = part.slice(headerEnd + 4, part.length - 2); // remove trailing \r\n

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    if (filenameMatch) {
      result[name] = {
        filename: filenameMatch[1],
        content: bodyVal
      };
    } else {
      result[name] = bodyVal.toString('utf-8').trim();
    }
  }
  return result;
}

function canonicalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    const scheme = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const port = (parsed.port && parsed.port !== '80' && parsed.port !== '443') ? `:${parsed.port}` : '';
    let pathname = parsed.pathname.replace(/\/+$/, '');
    return `${scheme}//${host}${port}${pathname}`;
  } catch (e) {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

async function authenticateOAuthAccessToken(token, supabaseUrl, sbKey, reqHost = 'mr-capsules.vercel.app') {
  const res = await fetch(`${supabaseUrl}/rest/v1/oauth_tokens?access_token=eq.${encodeURIComponent(token)}&revoked=eq.false&select=*`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });

  if (!res.ok) return { error: 'OAuth token lookup failed' };

  const rows = await res.json();
  if (!rows || rows.length === 0) return { error: 'Invalid, revoked, or non-existent OAuth token' };

  const tokenRecord = rows[0];
  if (new Date(tokenRecord.expires_at) < new Date()) return { error: 'OAuth token expired' };

  const canonicalServerUrl = canonicalizeUrl(`https://${reqHost}/api/mcp`);
  const canonicalServerHost = canonicalizeUrl(`https://${reqHost}`);
  const defaultServerUrl = canonicalizeUrl(`https://mr-capsules.vercel.app/api/mcp`);
  const defaultServerHost = canonicalizeUrl(`https://mr-capsules.vercel.app`);
  const tokenAudience = canonicalizeUrl(tokenRecord.resource);

  const matchesAudience = !tokenAudience ||
    tokenAudience === canonicalServerUrl ||
    tokenAudience === canonicalServerHost ||
    tokenAudience === defaultServerUrl ||
    tokenAudience === defaultServerHost ||
    tokenAudience.includes('mr-capsules');

  if (!matchesAudience) return { error: 'OAuth token audience mismatch' };

  return {
    userId: tokenRecord.user_id,
    email: tokenRecord.user_email
  };
}

async function resolveRoles(userId, email, supabaseUrl, sbKey, superAdminEmail) {
  const isSuperAdmin = email === superAdminEmail;

  const encEmail = encodeURIComponent(email || '');
  const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?role=eq.admin&identifier=eq.${encEmail}&select=role`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  let hasAdminRole = false;
  if (roleRes.ok) {
    const roleData = await roleRes.json();
    hasAdminRole = Array.isArray(roleData) && roleData.length > 0;
  }

  let divisionId = null;
  const divRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}&select=division_id`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  if (divRes.ok) {
    const divData = await divRes.json();
    if (Array.isArray(divData) && divData.length > 0) {
      divisionId = divData[0].division_id;
    }
  }

  const isAdmin = isSuperAdmin || hasAdminRole;
  return {
    isAdmin,
    hasDivision: divisionId !== null,
    divisionId
  };
}

async function ghApi(method, endpoint, bodyObj, githubToken, owner, repo) {
  return fetch(`https://api.github.com/repos/${owner}/${repo}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'MR-CAPSULES-UPLOADER'
    },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined
  });
}

async function logAction(adminEmail, action, details, su, sk) {
  try {
    await fetch(`${su}/rest/v1/activity_logs`, {
      method: 'POST',
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'upload_api',
        time: new Date().toISOString(),
        user_name: adminEmail,
        email: adminEmail,
        dev_str: JSON.stringify({ action, details })
      })
    });
  } catch(e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = (req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }
  const token = authHeader.slice(7).trim();

  const supabaseUrl = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkaHZybGtpem9yc2N2ZWh0dHpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2MzA3MiwiZXhwIjoyMDkyODM5MDcyfQ.1fW24fXFAZx98dtLelrWmw8ROvkRcap8ObsMkWpy-6E";
  const githubToken = process.env.GITHUB_TOKEN;
  const owner = 'alchemist4real';
  const repo = 'MR-CAPSULES';
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com';

  const reqHost = req.headers['x-forwarded-host'] || req.headers.host || 'mr-capsules.vercel.app';
  const authResult = await authenticateOAuthAccessToken(token, supabaseUrl, sbKey, reqHost);
  if (authResult.error) {
    return res.status(401).json({ error: authResult.error });
  }

  const roles = await resolveRoles(authResult.userId, authResult.email, supabaseUrl, sbKey, superAdminEmail);
  if (!roles.hasDivision && !roles.isAdmin) {
    return res.status(403).json({ error: 'Forbidden. Division membership required to upload.' });
  }

  // Parse Multipart Body
  let parsedFields = {};
  try {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=([^;]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid content type. Multipart boundary required.' });
    }
    const boundary = match[1];

    const rawBody = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', err => reject(err));
    });

    parsedFields = parseMultipart(rawBody, boundary);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse multipart payload: ' + err.message });
  }

  const { path, file } = parsedFields;
  if (!path) return res.status(400).json({ error: 'Missing path field' });
  if (!file || !file.content) return res.status(400).json({ error: 'Missing file field' });

  // Validate Path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid path traversal' });
  }

  const contentBase64 = file.content.toString('base64');
  const sizeBytes = file.content.length;

  // Commit to GitHub
  try {
    let existingSha = null;
    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'MR-CAPSULES-UPLOADER' }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        existingSha = fileInfo.sha;
      }
    } catch (e) {}

    const putBody = {
      message: `mcp: upload ${path} (API)`,
      content: contentBase64
    };
    if (existingSha) putBody.sha = existingSha;

    const putRes = await ghApi('PUT', `/contents/${encodeURIComponent(path)}`, putBody, githubToken, owner, repo);
    if (!putRes.ok) {
      const errData = await putRes.json();
      throw new Error(errData.message || 'GitHub API error');
    }

    const putData = await putRes.json();
    const sha = putData.content?.sha || putData.commit?.sha || '';

    await logAction(authResult.email, 'mcp_upload_api', { path, sizeBytes }, supabaseUrl, sbKey);

    return res.status(200).json({
      success: true,
      path,
      sha,
      sizeBytes
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to commit to GitHub: ' + err.message });
  }
}
