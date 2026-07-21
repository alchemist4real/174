// api/mcp.js
// MCP/API Gateway — supports both JWT auth and API key auth
// Exposes 27 methods for AI assistants to interact with MR-CAPSULES

export default async function handler(req, res) {
  // ── CORS — Required for Claude.ai web, Claude Code, and other MCP clients ──
  // Claude.ai sends requests from https://claude.ai origin.
  // We must NOT use wildcard '*' when we also want to send credentials.
  // Instead whitelist the known MCP client origins explicitly.
  const allowedOrigins = [
    'https://claude.ai',
    'https://www.claude.ai',
    'https://api.anthropic.com',
    'https://claude.anthropic.com',
  ];
  const requestOrigin = req.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(requestOrigin);

  // For requests with no Origin header (server-to-server calls, curl, etc.)
  // we allow them through without CORS restriction.
  if (requestOrigin) {
    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else {
      // For any other origin (e.g. admin UI on same domain, postman)
      // allow it — the API key is the auth mechanism, not CORS.
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }
    res.setHeader('Vary', 'Origin');
  }

  // Required headers per MCP spec 2025-06-18
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID, x-api-key, api-key'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight — MUST return 200 (not 204) for Claude.ai compatibility
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Constants ─────────────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GH_OWNER = 'alchemist4real';
  const GH_REPO = 'MR-CAPSULES';
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'muqorroben@gmail.com';
  const MAX_KEYS_PER_USER = 5;

  if (!SB_SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server config error' });
  }

  // ── Streamable HTTP MCP Transport (GET) ──────────────────────────────────
  // Claude.ai web sends a GET to open a streaming connection, then POST for calls.
  // The MCP spec 2025-06-18 uses a SINGLE endpoint for both GET (streaming)
  // and POST (JSON-RPC). This is the "Streamable HTTP" pattern.
  if (req.method === 'GET') {
    return handleMcpStreamableGet(req, res, SUPABASE_URL, SB_SERVICE_KEY);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  }

  // ── Streamable HTTP MCP: handle JSON-RPC envelope from MCP clients ────────
  // Claude.ai sends MCP messages as JSON-RPC 2.0 via POST.
  // We handle both: (a) direct REST calls { method, params }
  // and (b) MCP JSON-RPC { jsonrpc: '2.0', id, method, params }
  let isMcpJsonRpc = false;
  let mcpRequestId = null;
  let method, params = {};

  if (body && body.jsonrpc === '2.0') {
    // Incoming MCP JSON-RPC message from Claude.ai or MCP client
    isMcpJsonRpc = true;
    mcpRequestId = body.id;
    method = body.method;
    params = body.params || {};

    // MCP initialize handshake — respond immediately, no auth needed
    if (method === 'initialize') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: mcpRequestId,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false }
          },
          serverInfo: { name: 'mr-capsules', version: '1.0.0' }
        }
      });
    }

    // MCP notifications (initialized, cancelled) — no response needed
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return res.status(202).end();
    }

    // MCP tools/list — respond with tool list, no auth needed for discovery
    if (method === 'tools/list') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: mcpRequestId,
        result: { tools: getMcpToolsList() }
      });
    }

    // MCP tools/call — map to our internal method routing
    if (method === 'tools/call') {
      method = params.name;     // e.g. 'content.list'
      params = params.arguments || {};
    }

    // MCP resources/list
    if (method === 'resources/list') {
      return res.status(200).json({
        jsonrpc: '2.0', id: mcpRequestId,
        result: { resources: [] }
      });
    }
  } else {
    // Direct REST call: { method, params }
    method = body && body.method;
    params = (body && body.params) || {};
  }

  if (!method) {
    const errResp = isMcpJsonRpc
      ? { jsonrpc: '2.0', id: mcpRequestId, error: { code: -32600, message: 'Missing method' } }
      : { success: false, error: 'Missing method in body' };
    return res.status(400).json(errResp);
  }

  // ── system.health is public, no auth needed ───────────────────────────────
  if (method === 'system.health') {
    const healthResult = {
      status: 'ok', version: '1.0.0',
      transport: 'Streamable HTTP (MCP 2025-06-18)',
      endpoint: 'POST /api/mcp — JSON-RPC or { method, params }',
      claude_ai_setup: 'Add https://mr-capsules.vercel.app/api/mcp as remote MCP server in Claude.ai settings',
      docs: 'https://mr-capsules.vercel.app/docs.html'
    };
    if (isMcpJsonRpc) {
      return res.status(200).json({ jsonrpc: '2.0', id: mcpRequestId, result: { content: [{ type: 'text', text: JSON.stringify(healthResult, null, 2) }] } });
    }
    return res.status(200).json({ success: true, result: healthResult });
  }

  // ── Authenticate ─────────────────────────────────────────────────────────
  // Claude.ai web Custom Connectors can send credentials via:
  //   - Authorization: ApiKey mrc_...
  //   - Authorization: Bearer mrc_...
  //   - Authorization: mrc_... (Raw key in Authorization)
  //   - Authorization: Bearer <supabase_jwt>
  //   - x-api-key: mrc_...
  //   - Query parameter: ?key=mrc_...
  const authHeader = (req.headers.authorization || '').trim();
  const xApiKey = (req.headers['x-api-key'] || req.headers['api-key'] || '').trim();
  const urlObj = new URL(req.url, `https://${req.headers.host || 'mr-capsules.vercel.app'}`);
  const queryKey = (urlObj.searchParams.get('key') || '').trim();

  let authResult = null;

  if (xApiKey.startsWith('mrc_')) {
    authResult = await authenticateApiKey(xApiKey, SUPABASE_URL, SB_SERVICE_KEY);
  } else if (queryKey.startsWith('mrc_')) {
    authResult = await authenticateApiKey(queryKey, SUPABASE_URL, SB_SERVICE_KEY);
  } else if (authHeader.startsWith('ApiKey ')) {
    authResult = await authenticateApiKey(authHeader.slice(7).trim(), SUPABASE_URL, SB_SERVICE_KEY);
  } else if (authHeader.startsWith('Bearer ')) {
    const bearerVal = authHeader.slice(7).trim();
    if (bearerVal.startsWith('mrc_')) {
      authResult = await authenticateApiKey(bearerVal, SUPABASE_URL, SB_SERVICE_KEY);
    } else {
      authResult = await authenticateJWT(bearerVal, SUPABASE_URL, SB_SERVICE_KEY);
    }
  } else if (authHeader.startsWith('mrc_')) {
    // Raw key directly in Authorization header
    authResult = await authenticateApiKey(authHeader, SUPABASE_URL, SB_SERVICE_KEY);
  } else {
    const authErr = {
      message: 'Missing or invalid Authorization header. Provide key as "ApiKey mrc_...", "Bearer mrc_...", "mrc_...", or query param ?key=mrc_...'
    };
    if (isMcpJsonRpc) {
      return res.status(401).json({ jsonrpc: '2.0', id: mcpRequestId, error: { code: -32001, message: authErr.message } });
    }
    return res.status(401).json({ success: false, error: authErr.message });
  }

  if (!authResult || authResult.error) {
    const msg = authResult?.error || 'Unauthorized';
    if (isMcpJsonRpc) {
      return res.status(401).json({ jsonrpc: '2.0', id: mcpRequestId, error: { code: -32001, message: msg } });
    }
    return res.status(401).json({ success: false, error: msg });
  }

  // ── Rate limit (API keys only) ────────────────────────────────────────────
  if (authResult.isApiKey) {
    const allowed = await checkRateLimit(authResult.keyId, SUPABASE_URL, SB_SERVICE_KEY);
    if (!allowed) {
      const rateLimitMsg = 'Rate limit exceeded (60 requests/minute). Wait and retry.';
      if (isMcpJsonRpc) {
        return res.status(429).json({ jsonrpc: '2.0', id: mcpRequestId, error: { code: -32029, message: rateLimitMsg } });
      }
      return res.status(429).json({ success: false, error: rateLimitMsg });
    }
  }

  // ── Resolve roles (same logic as api/admin.js) ────────────────────────────
  const roles = await resolveRoles(authResult.userId, authResult.email, SUPABASE_URL, SB_SERVICE_KEY, SUPERADMIN_EMAIL);

  // ── Route to handler ──────────────────────────────────────────────────────
  try {
    const result = await routeMethod(method, params, authResult, roles, {
      SUPABASE_URL, SB_SERVICE_KEY, GITHUB_TOKEN, GH_OWNER, GH_REPO, MAX_KEYS_PER_USER
    });

    // Respond in the correct format: MCP JSON-RPC or plain REST
    if (isMcpJsonRpc) {
      // MCP tools/call response wraps result in content array
      const textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return res.status(200).json({
        jsonrpc: '2.0',
        id: mcpRequestId,
        result: { content: [{ type: 'text', text: textContent }] }
      });
    }
    return res.status(200).json({ success: true, result });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (isMcpJsonRpc) {
      const mcpErrCode = statusCode === 403 ? -32003 : statusCode === 404 ? -32004 : -32603;
      return res.status(statusCode).json({
        jsonrpc: '2.0', id: mcpRequestId,
        error: { code: mcpErrCode, message: err.message }
      });
    }
    return res.status(statusCode).json({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// MCP TOOLS LIST — Returned for tools/list requests
// This is what Claude sees in its tool picker
// ═══════════════════════════════════════════════════════════════

function getMcpToolsList() {
  return [
    { name: 'system.health', description: 'Health check — returns server info and usage instructions', inputSchema: { type: 'object', properties: {} } },
    { name: 'content.list', description: 'List all educational content organized by semester, block, and category', inputSchema: { type: 'object', properties: {} } },
    { name: 'content.get', description: 'Download a specific content file by path (returns full HTML)', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path, e.g. content/semester 1/1.2/1.2-2_Overall CBT.html' } }, required: ['path'] } },
    { name: 'content.tree', description: 'Get the full file tree of content/ and cover/ directories', inputSchema: { type: 'object', properties: {} } },
    { name: 'content.upload', description: 'Upload a new content file (base64 encoded)', inputSchema: { type: 'object', properties: { path: { type: 'string' }, contentBase64: { type: 'string' } }, required: ['path', 'contentBase64'] } },
    { name: 'content.delete', description: 'Delete a content file by path', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    { name: 'content.rename', description: 'Rename or move a content file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, newPath: { type: 'string' } }, required: ['path', 'newPath'] } },
    { name: 'tasks.list', description: 'List all content tasks on the task board', inputSchema: { type: 'object', properties: {} } },
    { name: 'tasks.create', description: 'Create a new content task (management only)', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, semester: { type: 'string' }, block: { type: 'string' }, category: { type: 'string' }, priority: { type: 'string', enum: ['low','normal','high','urgent'] } }, required: ['title'] } },
    { name: 'tasks.claim', description: 'Claim an open task (developer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks.submit', description: 'Submit a task for review (developer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks.approve', description: 'Approve a reviewed task (reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks.reject', description: 'Reject a task back to in-progress (reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, note: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks.logs', description: 'Get activity history for a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'divisions.list', description: 'List all organization divisions', inputSchema: { type: 'object', properties: {} } },
    { name: 'divisions.my', description: 'Get your division membership', inputSchema: { type: 'object', properties: {} } },
    { name: 'users.list', description: 'List all registered users (SuperAdmin only)', inputSchema: { type: 'object', properties: {} } },
    { name: 'users.ban', description: 'Ban or unban a user (SuperAdmin only)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, banned: { type: 'boolean' } }, required: ['user_id', 'banned'] } },
    { name: 'config.get', description: 'Get app configuration settings (Admin only)', inputSchema: { type: 'object', properties: {} } },
    { name: 'config.update', description: 'Update app settings (Admin only)', inputSchema: { type: 'object', properties: { allowSignup: { type: 'boolean' }, maintenanceMode: { type: 'boolean' } } } },
    { name: 'contributions.leaderboard', description: 'Get the contribution points leaderboard', inputSchema: { type: 'object', properties: {} } },
    { name: 'contributions.my', description: 'Get your own contribution history', inputSchema: { type: 'object', properties: {} } },
    { name: 'review.issues', description: 'Get review issues for a task (reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'review.report', description: 'Report a review issue on a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, issue_type: { type: 'string' }, description: { type: 'string' } }, required: ['task_id'] } },
    { name: 'review.resolve', description: 'Mark a review issue as resolved', inputSchema: { type: 'object', properties: { issue_id: { type: 'string' } }, required: ['issue_id'] } },
    { name: 'apikeys.list', description: 'List your active API keys', inputSchema: { type: 'object', properties: {} } },
    { name: 'apikeys.create', description: 'Generate a new API key', inputSchema: { type: 'object', properties: { name: { type: 'string' }, expires_in_days: { type: 'number' } }, required: ['name'] } },
    { name: 'apikeys.revoke', description: 'Revoke an API key by ID', inputSchema: { type: 'object', properties: { key_id: { type: 'string' } }, required: ['key_id'] } },
  ];
}

// ═══════════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════════

async function authenticateApiKey(rawKey, supabaseUrl, sbKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/validate_api_key`, {
    method: 'POST',
    headers: {
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_key_hash: keyHash })
  });

  if (!rpcRes.ok) {
    return { error: 'Key validation failed' };
  }

  const rows = await rpcRes.json();
  if (!rows || rows.length === 0) {
    return { error: 'Invalid, expired, or revoked API key' };
  }

  const { out_key_id: keyId, out_user_id: userId } = rows[0];

  const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });

  if (!userRes.ok) {
    return { error: 'User not found for this API key' };
  }

  const userData = await userRes.json();

  return {
    isApiKey: true,
    keyId,
    userId,
    email: userData.email,
    userMetadata: userData.user_metadata || {}
  };
}

async function authenticateJWT(token, supabaseUrl, sbKey) {
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': sbKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!userRes.ok) {
    return { error: 'Invalid JWT token' };
  }

  const userData = await userRes.json();

  return {
    isApiKey: false,
    keyId: null,
    userId: userData.id,
    email: userData.email,
    userMetadata: userData.user_metadata || {}
  };
}

// ═══════════════════════════════════════════════════════════════
// ROLE RESOLVER — identical logic to api/admin.js
// ═══════════════════════════════════════════════════════════════

async function resolveRoles(userId, email, supabaseUrl, sbKey, superAdminEmail) {
  const isSuperAdmin = email === superAdminEmail;

  const encEmail = encodeURIComponent(email);
  const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?identifier=eq.${encEmail}&select=role`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  let hasAdminRole = false;
  if (roleRes.ok) {
    const roleData = await roleRes.json();
    hasAdminRole = Array.isArray(roleData) && roleData.length > 0 && roleData[0].role === 'admin';
  }

  const divRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${userId}&select=division_id`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  let divisionId = null;
  if (divRes.ok) {
    const divData = await divRes.json();
    if (Array.isArray(divData) && divData.length > 0) {
      divisionId = divData[0].division_id;
    }
  }

  const isAdmin = isSuperAdmin || hasAdminRole;
  const hasDivision = divisionId !== null;

  return {
    isSuperAdmin,
    isAdmin,
    hasDivision,
    divisionId,
    isManagement: divisionId === 'management' || isAdmin,
    isDeveloper: divisionId === 'development' || isAdmin,
    isReviewer: divisionId === 'review' || isAdmin,
    canUseApiKeys: hasDivision || isAdmin
  };
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT CHECKER
// ═══════════════════════════════════════════════════════════════

async function checkRateLimit(keyId, supabaseUrl, sbKey) {
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_rate_limit`, {
    method: 'POST',
    headers: {
      'apikey': sbKey,
      'Authorization': `Bearer ${sbKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_key_id: keyId })
  });
  if (!rpcRes.ok) return true; // Fail open
  const allowed = await rpcRes.json();
  return allowed === true;
}

// ═══════════════════════════════════════════════════════════════
// GITHUB API HELPER
// ═══════════════════════════════════════════════════════════════

async function ghApi(method, endpoint, bodyObj, githubToken, owner, repo) {
  return fetch(`https://api.github.com/repos/${owner}/${repo}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined
  });
}

// ═══════════════════════════════════════════════════════════════
// METHOD ROUTER
// ═══════════════════════════════════════════════════════════════

async function routeMethod(method, params, auth, roles, cfg) {
  const { SUPABASE_URL: su, SB_SERVICE_KEY: sk, GITHUB_TOKEN: gt, GH_OWNER: go, GH_REPO: gr, MAX_KEYS_PER_USER: maxKeys } = cfg;

  if (method === 'apikeys.list') {
    if (!roles.canUseApiKeys) throw err403('Only division members can manage API keys');
    return listApiKeys(auth.userId, su, sk);
  }
  if (method === 'apikeys.create') {
    if (!roles.canUseApiKeys) throw err403('Only division members can create API keys');
    return createApiKey(auth.userId, params, su, sk, maxKeys);
  }
  if (method === 'apikeys.revoke') {
    if (!roles.canUseApiKeys) throw err403('Only division members can revoke API keys');
    return revokeApiKey(auth.userId, params, su, sk);
  }

  if (method === 'content.list') return contentList(gt, go, gr);
  if (method === 'content.get') {
    if (!params.path) throw err400('Missing params.path');
    return contentGet(params.path, gt, go, gr);
  }
  if (method === 'content.tree') return contentTree(gt, go, gr);
  if (method === 'content.upload') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload');
    if (!params.path || !params.contentBase64) throw err400('Missing params.path or params.contentBase64');
    validatePath(params.path);
    return contentUpload(params, auth.email, gt, go, gr, su, sk);
  }
  if (method === 'content.delete') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to delete');
    if (!params.path) throw err400('Missing params.path');
    validatePath(params.path);
    return contentDelete(params, auth.email, gt, go, gr, su, sk);
  }
  if (method === 'content.rename') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to rename');
    if (!params.path || !params.newPath) throw err400('Missing params.path or params.newPath');
    validatePath(params.path);
    validatePath(params.newPath);
    return contentRename(params, auth.email, gt, go, gr, su, sk);
  }

  if (method === 'tasks.list') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return tasksList(su, sk);
  }
  if (method === 'tasks.create') {
    if (!roles.isManagement) throw err403('Management division only');
    return tasksCreate(params, auth.userId, su, sk);
  }
  if (method === 'tasks.claim') {
    if (!roles.isDeveloper) throw err403('Development division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksClaim(params.task_id, auth.userId, su, sk);
  }
  if (method === 'tasks.submit') {
    if (!roles.isDeveloper) throw err403('Development division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksSubmit(params.task_id, auth.userId, su, sk);
  }
  if (method === 'tasks.approve') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksApprove(params.task_id, auth.userId, su, sk);
  }
  if (method === 'tasks.reject') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksReject(params.task_id, params.note || '', su, sk);
  }
  if (method === 'tasks.logs') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksGetLogs(params.task_id, su, sk);
  }

  if (method === 'divisions.list') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return divisionsList(su, sk);
  }
  if (method === 'divisions.my') return divisionsMyDivision(auth.userId, su, sk);

  if (method === 'users.list') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    return usersList(su, sk);
  }
  if (method === 'users.ban') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.user_id || params.banned === undefined) throw err400('Missing params.user_id or params.banned');
    return usersBan(params.user_id, params.banned, auth.email, su, sk);
  }
  if (method === 'users.delete') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.user_id) throw err400('Missing params.user_id');
    return usersDelete(params.user_id, su, sk);
  }

  if (method === 'config.get') {
    if (!roles.isAdmin) throw err403('Admin only');
    return configGet(su, sk);
  }
  if (method === 'config.update') {
    if (!roles.isAdmin) throw err403('Admin only');
    return configUpdate(params, auth.email, su, sk);
  }

  if (method === 'contributions.leaderboard') return contributionsLeaderboard(su, sk);
  if (method === 'contributions.my') return contributionsMy(auth.userId, su, sk);

  if (method === 'review.issues') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return reviewIssuesList(params.task_id, su, sk);
  }
  if (method === 'review.report') {
    if (!roles.isReviewer) throw err403('Review division only');
    return reviewIssuesReport(params, auth.userId, su, sk);
  }
  if (method === 'review.resolve') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.issue_id) throw err400('Missing params.issue_id');
    return reviewIssuesResolve(params.issue_id, su, sk);
  }

  throw err400(`Unknown method: ${method}`);
}

// ═══════════════════════════════════════════════════════════════
// ERROR HELPERS
// ═══════════════════════════════════════════════════════════════

function err400(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
function err403(msg) { const e = new Error(msg); e.statusCode = 403; return e; }
function err404(msg) { const e = new Error(msg); e.statusCode = 404; return e; }

function validatePath(path) {
  if (!path) throw err400('Path is required');
  if (path.includes('..') || path.startsWith('/')) throw err400('Invalid path: no traversal allowed');
  if (!path.startsWith('content/') && !path.startsWith('cover/')) throw err400('Path must start with content/ or cover/');
}

// ═══════════════════════════════════════════════════════════════
// API KEY HANDLERS
// ═══════════════════════════════════════════════════════════════

async function listApiKeys(userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/api_keys?user_id=eq.${userId}&revoked_at=is.null&select=id,name,key_prefix,expires_at,last_used_at,request_count,created_at&order=created_at.desc`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to list API keys');
  const keys = await res.json();
  return { keys };
}

async function createApiKey(userId, params, su, sk, maxKeys) {
  const { name, expires_in_days } = params;
  if (!name || typeof name !== 'string' || name.trim().length === 0) throw err400('Missing or empty params.name');
  if (name.trim().length > 50) throw err400('Key name max 50 characters');

  const countRes = await fetch(`${su}/rest/v1/api_keys?user_id=eq.${userId}&revoked_at=is.null&select=id`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (countRes.ok) {
    const existing = await countRes.json();
    if (existing.length >= maxKeys) throw err400(`Maximum ${maxKeys} active API keys allowed. Revoke one first.`);
  }

  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const rawHex = Array.from(rawBytes).map(b => b.toString(16).padStart(2,'0')).join('');
  const rawKey = `mrc_${rawHex}`;

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  const keyPrefix = rawKey.slice(0, 12);

  let expiresAt = null;
  if (expires_in_days && Number.isInteger(expires_in_days) && expires_in_days > 0) {
    const d = new Date();
    d.setDate(d.getDate() + expires_in_days);
    expiresAt = d.toISOString();
  }

  const insertRes = await fetch(`${su}/rest/v1/api_keys`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ user_id: userId, name: name.trim(), key_hash: keyHash, key_prefix: keyPrefix, expires_at: expiresAt })
  });

  if (!insertRes.ok) throw new Error('Failed to create key: ' + await insertRes.text());
  const [keyRecord] = await insertRes.json();

  return {
    raw_key: rawKey,
    key_prefix: keyPrefix,
    name: keyRecord.name,
    expires_at: keyRecord.expires_at,
    created_at: keyRecord.created_at,
    warning: 'Copy this key now. It will not be shown again.'
  };
}

async function revokeApiKey(userId, params, su, sk) {
  const { key_id } = params;
  if (!key_id) throw err400('Missing params.key_id');

  const checkRes = await fetch(`${su}/rest/v1/api_keys?id=eq.${key_id}&user_id=eq.${userId}&select=id`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (checkRes.ok) {
    const rows = await checkRes.json();
    if (!rows || rows.length === 0) throw err403('Key not found or does not belong to you');
  }

  const revokeRes = await fetch(`${su}/rest/v1/api_keys?id=eq.${key_id}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revoked_at: new Date().toISOString() })
  });
  if (!revokeRes.ok) throw new Error('Failed to revoke key');
  return { revoked: true };
}

// ═══════════════════════════════════════════════════════════════
// CONTENT HANDLERS
// ═══════════════════════════════════════════════════════════════

async function contentList(githubToken, owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!res.ok) throw new Error('GitHub API error fetching tree');
  const data = await res.json();

  const contentFiles = data.tree.filter(item =>
    item.type === 'blob' && item.path.startsWith('content/') && item.path.endsWith('.html')
  );

  const semMap = {};
  contentFiles.forEach(item => {
    const parts = item.path.split('/');
    const semesterName = parts.length >= 3 ? parts[1] : 'Other';
    const blockName = parts.length >= 3 ? parts[2] : (parts.length >= 2 ? parts[1] : 'Other');
    const fileName = parts[parts.length - 1];
    const fileParts = fileName.split('_');
    const category = fileParts.length > 1 ? fileParts[0] : 'Other';
    const name = fileParts.length > 1 ? fileParts.slice(1).join('_').replace('.html', '') : fileName.replace('.html', '');

    if (!semMap[semesterName]) semMap[semesterName] = {};
    if (!semMap[semesterName][blockName]) semMap[semesterName][blockName] = {};
    if (!semMap[semesterName][blockName][category]) semMap[semesterName][blockName][category] = [];
    semMap[semesterName][blockName][category].push({ name, path: item.path });
  });

  const semesters = Object.entries(semMap).map(([semName, blocks]) => ({
    semester: semName,
    blocks: Object.entries(blocks).map(([blockName, cats]) => ({
      block: blockName,
      categories: Object.entries(cats).map(([catName, files]) => ({
        category: catName,
        files: files.map(f => ({ title: f.name, path: f.path }))
      }))
    }))
  }));

  return { semesters, total_files: contentFiles.length };
}

async function contentGet(path, githubToken, owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!res.ok) throw err404('File not found: ' + path);
  const data = await res.json();
  const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { path, content: decoded, sha: data.sha };
}

async function contentTree(githubToken, owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!res.ok) throw new Error('GitHub API error');
  const data = await res.json();
  return { tree: data.tree.filter(item => item.path.startsWith('content/') || item.path.startsWith('cover/')) };
}

async function contentUpload(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { path, contentBase64 } = params;
  if (contentBase64.length > 10 * 1024 * 1024 * 1.34) throw err400('File too large (max 10MB)');

  const blobRes = await ghApi('POST', '/git/blobs', { content: contentBase64, encoding: 'base64' }, githubToken, owner, repo);
  const blobData = await blobRes.json();
  if (!blobRes.ok) throw new Error(blobData.message || 'Failed to create blob');

  const refRes = await ghApi('GET', '/git/refs/heads/main', null, githubToken, owner, repo);
  const refData = await refRes.json();
  const commitSha = refData.object.sha;

  const commitRes = await ghApi('GET', `/git/commits/${commitSha}`, null, githubToken, owner, repo);
  const commitData = await commitRes.json();

  const treeRes = await ghApi('POST', '/git/trees', {
    base_tree: commitData.tree.sha,
    tree: [{ path, mode: '100644', type: 'blob', sha: blobData.sha }]
  }, githubToken, owner, repo);
  const treeData = await treeRes.json();

  const newCommitRes = await ghApi('POST', '/git/commits', {
    message: `mcp: upload ${path}`,
    tree: treeData.sha,
    parents: [commitSha]
  }, githubToken, owner, repo);
  const newCommit = await newCommitRes.json();

  await ghApi('PATCH', '/git/refs/heads/main', { sha: newCommit.sha }, githubToken, owner, repo);
  await logAction(adminEmail, 'mcp_upload', { path }, su, sk);
  return { success: true, path };
}

async function contentDelete(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { path } = params;
  const refRes = await ghApi('GET', '/git/refs/heads/main', null, githubToken, owner, repo);
  const refData = await refRes.json();
  const commitSha = refData.object.sha;
  const commitRes = await ghApi('GET', `/git/commits/${commitSha}`, null, githubToken, owner, repo);
  const commitData = await commitRes.json();
  const treeRes = await ghApi('POST', '/git/trees', {
    base_tree: commitData.tree.sha,
    tree: [{ path, mode: '100644', type: 'blob', sha: null }]
  }, githubToken, owner, repo);
  const treeData = await treeRes.json();
  const newCommitRes = await ghApi('POST', '/git/commits', {
    message: `mcp: delete ${path}`,
    tree: treeData.sha,
    parents: [commitSha]
  }, githubToken, owner, repo);
  const newCommit = await newCommitRes.json();
  await ghApi('PATCH', '/git/refs/heads/main', { sha: newCommit.sha }, githubToken, owner, repo);
  await logAction(adminEmail, 'mcp_delete', { path }, su, sk);
  return { success: true, path };
}

async function contentRename(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { path, newPath } = params;
  const treeListRes = await ghApi('GET', '/git/trees/main?recursive=1', null, githubToken, owner, repo);
  const treeListData = await treeListRes.json();
  const fileNode = treeListData.tree.find(t => t.path === path);
  if (!fileNode) throw err404('Original file not found: ' + path);

  const refRes = await ghApi('GET', '/git/refs/heads/main', null, githubToken, owner, repo);
  const refData = await refRes.json();
  const commitSha = refData.object.sha;
  const commitRes = await ghApi('GET', `/git/commits/${commitSha}`, null, githubToken, owner, repo);
  const commitData = await commitRes.json();

  const treeRes = await ghApi('POST', '/git/trees', {
    base_tree: commitData.tree.sha,
    tree: [
      { path, mode: '100644', type: 'blob', sha: null },
      { path: newPath, mode: '100644', type: 'blob', sha: fileNode.sha }
    ]
  }, githubToken, owner, repo);
  const treeData = await treeRes.json();
  const newCommitRes = await ghApi('POST', '/git/commits', {
    message: `mcp: rename ${path} to ${newPath}`,
    tree: treeData.sha,
    parents: [commitSha]
  }, githubToken, owner, repo);
  const newCommit = await newCommitRes.json();
  await ghApi('PATCH', '/git/refs/heads/main', { sha: newCommit.sha }, githubToken, owner, repo);
  await logAction(adminEmail, 'mcp_rename', { path, newPath }, su, sk);
  return { success: true, old_path: path, new_path: newPath };
}

// ═══════════════════════════════════════════════════════════════
// TASKS HANDLERS
// ═══════════════════════════════════════════════════════════════

async function tasksList(su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?select=*&order=created_at.desc`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const tasks = await res.json();
  return { tasks };
}

async function tasksCreate(params, userId, su, sk) {
  const { title, description, semester, block, category, target_path, priority, assigned_to_email } = params;
  if (!title) throw err400('Missing params.title');
  let assignedToId = null, finalStatus = 'open', assignedAt = null;
  if (assigned_to_email) {
    const usersRes = await fetch(`${su}/auth/v1/admin/users?per_page=1000`, {
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
    });
    if (usersRes.ok) {
      const { users } = await usersRes.json();
      const u = (users || []).find(x => x.email === assigned_to_email);
      if (u) { assignedToId = u.id; finalStatus = 'in_progress'; assignedAt = new Date().toISOString(); }
    }
  }
  const res = await fetch(`${su}/rest/v1/content_tasks`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ title, description, semester, block, category, target_path, priority, status: finalStatus, created_by: userId, assigned_to: assignedToId, assigned_at: assignedAt })
  });
  if (!res.ok) throw new Error(await res.text());
  const [task] = await res.json();
  return { task };
}

async function tasksClaim(taskId, userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ assigned_to: userId, status: 'in_progress', assigned_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(await res.text());
  const [task] = await res.json();
  return { task };
}

async function tasksSubmit(taskId, userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ status: 'developed', submitted_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(await res.text());
  const [task] = await res.json();
  return { task };
}

async function tasksApprove(taskId, userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(await res.text());
  const [task] = await res.json();
  return { task };
}

async function tasksReject(taskId, note, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ status: 'in_progress' })
  });
  if (!res.ok) throw new Error(await res.text());
  const [task] = await res.json();
  return { task };
}

async function tasksGetLogs(taskId, su, sk) {
  const res = await fetch(`${su}/rest/v1/task_logs?task_id=eq.${taskId}&order=created_at.desc`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to fetch task logs');
  const logs = await res.json();
  return { logs };
}

// ═══════════════════════════════════════════════════════════════
// DIVISIONS HANDLERS
// ═══════════════════════════════════════════════════════════════

async function divisionsList(su, sk) {
  const res = await fetch(`${su}/rest/v1/divisions?select=*`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const divs = await res.json();
  return { divisions: divs };
}

async function divisionsMyDivision(userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/division_members?user_id=eq.${userId}&select=division_id,whatsapp`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const data = await res.json();
  return { division: data.length > 0 ? data[0] : null };
}

// ═══════════════════════════════════════════════════════════════
// USERS HANDLERS
// ═══════════════════════════════════════════════════════════════

async function usersList(su, sk) {
  const res = await fetch(`${su}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  return { users: data.users || [] };
}

async function usersBan(userId, banned, adminEmail, su, sk) {
  const getRes = await fetch(`${su}/auth/v1/admin/users/${userId}`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const userData = await getRes.json();
  const newMeta = { ...(userData.app_metadata || {}), banned: !!banned };
  const res = await fetch(`${su}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_metadata: newMeta })
  });
  if (!res.ok) throw new Error(await res.text());
  await logAction(adminEmail, banned ? 'mcp_ban_user' : 'mcp_unban_user', { target: userData.email }, su, sk);
  return { success: true, banned };
}

async function usersDelete(userId, su, sk) {
  const res = await fetch(`${su}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return { success: true, deleted_user_id: userId };
}

// ═══════════════════════════════════════════════════════════════
// CONFIG HANDLERS
// ═══════════════════════════════════════════════════════════════

async function configGet(su, sk) {
  const res = await fetch(`${su}/rest/v1/app_settings?limit=1`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to fetch config');
  const [cfg] = await res.json();
  return { allowSignup: cfg.allow_signup, maintenanceMode: cfg.maintenance_mode, bannedDevices: cfg.banned_devices };
}

async function configUpdate(params, adminEmail, su, sk) {
  const getRes = await fetch(`${su}/rest/v1/app_settings?limit=1`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const [cfg] = await getRes.json();
  const payload = {};
  if (params.allowSignup !== undefined) payload.allow_signup = params.allowSignup;
  if (params.maintenanceMode !== undefined) payload.maintenance_mode = params.maintenanceMode;
  if (params.bannedDevices !== undefined) payload.banned_devices = params.bannedDevices;
  const res = await fetch(`${su}/rest/v1/app_settings?id=eq.${cfg.id}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Config update failed');
  await logAction(adminEmail, 'mcp_update_config', payload, su, sk);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// CONTRIBUTIONS HANDLERS
// ═══════════════════════════════════════════════════════════════

async function contributionsLeaderboard(su, sk) {
  const res = await fetch(`${su}/rest/v1/contributions?select=points,user_id`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const data = await res.json();
  const usersRes = await fetch(`${su}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const { users } = await usersRes.json();
  const scores = {};
  (data || []).forEach(c => {
    const u = (users || []).find(au => au.id === c.user_id);
    const email = u ? u.email : 'Unknown';
    if (!scores[email]) scores[email] = { points: 0, username: u?.user_metadata?.username || email.split('@')[0] };
    scores[email].points += c.points;
  });
  const leaderboard = Object.entries(scores)
    .map(([email, d]) => ({ email, username: d.username, points: d.points }))
    .sort((a, b) => b.points - a.points);
  return { leaderboard };
}

async function contributionsMy(userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/contributions?user_id=eq.${userId}&order=created_at.desc`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const data = await res.json();
  return { contributions: data };
}

// ═══════════════════════════════════════════════════════════════
// REVIEW HANDLERS
// ═══════════════════════════════════════════════════════════════

async function reviewIssuesList(taskId, su, sk) {
  const res = await fetch(`${su}/rest/v1/review_issues?task_id=eq.${taskId}&order=created_at.desc`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  return { issues: await res.json() };
}

async function reviewIssuesReport(params, userId, su, sk) {
  const { task_id, issue_type, question_index, description } = params;
  if (!task_id) throw err400('Missing params.task_id');
  const res = await fetch(`${su}/rest/v1/review_issues`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id, reviewer_id: userId, issue_type, question_index, description, status: 'open' })
  });
  if (!res.ok) throw new Error(await res.text());
  return { success: true };
}

async function reviewIssuesResolve(issueId, su, sk) {
  const res = await fetch(`${su}/rest/v1/review_issues?id=eq.${issueId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'fixed', resolved_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error(await res.text());
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG HELPER
// ═══════════════════════════════════════════════════════════════

async function logAction(adminEmail, action, details, su, sk) {
  try {
    await fetch(`${su}/rest/v1/admin_action_logs`, {
      method: 'POST',
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_email: adminEmail, action, details })
    });
  } catch(e) { /* Non-fatal */ }
}

// ═══════════════════════════════════════════════════════════════
// STREAMABLE HTTP GET HANDLER
// Handles GET /api/mcp — the initial connection from Claude.ai web
// Per MCP spec 2025-06-18, GET opens an optional SSE stream.
// Tool calls still come in as POST requests.
// ═══════════════════════════════════════════════════════════════

async function handleMcpStreamableGet(req, res, su, sk) {
  // The client may send the API key in the Authorization header
  // (Claude.ai web does this) or as a query param ?key= (older clients)
  const authHeader = req.headers.authorization || '';
  const url = new URL(req.url, `https://${req.headers.host}`);
  const keyFromQuery = url.searchParams.get('key');

  let rawKey = keyFromQuery;
  if (!rawKey && authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7).trim();
  } else if (!rawKey && authHeader.startsWith('ApiKey ')) {
    rawKey = authHeader.slice(7).trim();
  }

  // Validate key if provided. If no key, return server info only.
  if (rawKey) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');

    const rpcRes = await fetch(`${su}/rest/v1/rpc/validate_api_key`, {
      method: 'POST',
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key_hash: keyHash })
    });

    if (rpcRes.ok) {
      const rows = await rpcRes.json();
      if (!rows || rows.length === 0) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
    }
  }

  // Return SSE stream per Streamable HTTP spec
  // Claude.ai web uses this to confirm the server is reachable
  // and to get the server's capabilities before making POST calls.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  // Assign a session ID — stateless here, but required by spec
  res.setHeader('Mcp-Session-Id', `mrc-${Date.now()}`);

  // Send the server's endpoint event (Streamable HTTP pattern)
  res.write(`event: endpoint\ndata: ${JSON.stringify({
    uri: '/api/mcp',
    name: 'mr-capsules'
  })}\n\n`);

  // Heartbeat to keep Vercel from closing the connection
  // Vercel max execution time is 60s on Pro, 10s on hobby.
  // The client will reconnect automatically per SSE spec.
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch(e) { clearInterval(heartbeat); }
  }, 20000);

  req.on('close', () => clearInterval(heartbeat));
}
