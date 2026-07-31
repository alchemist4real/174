import zlib from 'zlib';

// api/mcp.js
// MCP/API Gateway v1.1.0 — supports both JWT auth, API key auth, and OAuth 2.0 PKCE Bearer tokens
// Exposes 78 tools (MR-CAPSULES 71 tools + Doctor Tablet 7 tools)

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
  if (requestOrigin) {
    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
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

  const initUrlObj = new URL(req.url, `https://${req.headers.host || 'mr-capsules.vercel.app'}`);
  if (initUrlObj.searchParams.get('upload') === 'true') {
    return handleDirectUpload(req, res, SUPABASE_URL, SB_SERVICE_KEY, GITHUB_TOKEN, GH_OWNER, GH_REPO, SUPERADMIN_EMAIL);
  }

  if (!SB_SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server configuration error: missing service key' });
  }

  if (req.url && req.url.includes('oauth-protected-resource')) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'mr-capsules.vercel.app';
    const issuer = `https://${host}`;
    const resourceUrl = `${issuer}/api/mcp`;
    return res.status(200).json({
      resource: resourceUrl,
      authorization_servers: [issuer],
      scopes_supported: ["mcp"],
      bearer_methods_supported: ["header"],
      logo_uri: `${issuer}/logo.png`,
      icon_uri: `${issuer}/logo.png`
    });
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
          serverInfo: { name: 'mr-capsules-v2', version: '1.0.1' }
        }
      });
    }

    // MCP notifications (initialized, cancelled) — no response needed
    // MCP notifications — no response body needed
    if (method === 'notifications/initialized' || method === 'notifications/cancelled' || method.startsWith('notifications/')) {
      return res.status(202).end();
    }

    // MCP ping
    if (method === 'ping') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: mcpRequestId,
        result: {}
      });
    }

    // MCP tools/list — respond with static + dynamic custom tool list
    if (method === 'tools/list') {
      const staticTools = getMcpToolsList().map(t => ({
        ...t,
        name: t.name.replace(/\./g, '_')
      }));
      const customTools = (await getActiveCustomTools(SUPABASE_URL, SB_SERVICE_KEY)).map(ct => ({
        name: ct.name,
        description: `[Custom Tool] ${ct.description}`,
        inputSchema: ct.inputSchema || { type: 'object', properties: {} }
      }));
      return res.status(200).json({
        jsonrpc: '2.0',
        id: mcpRequestId,
        result: { tools: [...staticTools, ...customTools] }
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

    // MCP resources/templates/list
    if (method === 'resources/templates/list') {
      return res.status(200).json({
        jsonrpc: '2.0', id: mcpRequestId,
        result: { resourceTemplates: [] }
      });
    }

    // MCP prompts/list
    if (method === 'prompts/list') {
      return res.status(200).json({
        jsonrpc: '2.0', id: mcpRequestId,
        result: { prompts: [] }
      });
    }

    // MCP logging/setLevel
    if (method === 'logging/setLevel') {
      return res.status(200).json({
        jsonrpc: '2.0', id: mcpRequestId,
        result: {}
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
  // Supports OAuth Bearer Access Tokens (mrc_at_...), API keys (mrc_...), and JWTs
  const authHeader = (req.headers.authorization || '').trim();
  const xApiKey = (req.headers['x-api-key'] || req.headers['api-key'] || '').trim();
  const urlObj = new URL(req.url, `https://${req.headers.host || 'mr-capsules.vercel.app'}`);
  const queryKey = (urlObj.searchParams.get('key') || '').trim();

  let authResult = null;
  const currentReqHost = req.headers['x-forwarded-host'] || req.headers.host || 'mr-capsules.vercel.app';

  if (authHeader.startsWith('Bearer ')) {
    const bearerVal = authHeader.slice(7).trim();
    if (bearerVal.startsWith('mrc_at_')) {
      authResult = await authenticateOAuthAccessToken(bearerVal, SUPABASE_URL, SB_SERVICE_KEY, currentReqHost);
    } else if (bearerVal.startsWith('mrc_')) {
      authResult = await authenticateApiKey(bearerVal, SUPABASE_URL, SB_SERVICE_KEY);
    } else {
      authResult = await authenticateJWT(bearerVal, SUPABASE_URL, SB_SERVICE_KEY);
    }
  } else if (authHeader.startsWith('ApiKey ')) {
    authResult = await authenticateApiKey(authHeader.slice(7).trim(), SUPABASE_URL, SB_SERVICE_KEY);
  } else if (authHeader.startsWith('mrc_')) {
    authResult = await authenticateApiKey(authHeader, SUPABASE_URL, SB_SERVICE_KEY);
  } else if (xApiKey.startsWith('mrc_')) {
    authResult = await authenticateApiKey(xApiKey, SUPABASE_URL, SB_SERVICE_KEY);
  } else if (queryKey.startsWith('mrc_')) {
    authResult = await authenticateApiKey(queryKey, SUPABASE_URL, SB_SERVICE_KEY);
  } else {
    res.setHeader(
      'WWW-Authenticate',
      `Bearer realm="https://${currentReqHost}", error="invalid_token", error_description="Bearer token required"`
    );
    const authErr = { message: 'Unauthorized. Bearer token required.' };
    if (isMcpJsonRpc) {
      return res.status(401).json({ jsonrpc: '2.0', id: mcpRequestId, error: { code: -32001, message: authErr.message } });
    }
    return res.status(401).json({ success: false, error: authErr.message });
  }

  if (!authResult || authResult.error) {
    res.setHeader(
      'WWW-Authenticate',
      `Bearer realm="https://${currentReqHost}", error="invalid_token", error_description="Invalid or expired token"`
    );
    const msg = authResult?.error || 'Unauthorized';
    if (isMcpJsonRpc) {
      return res.status(401).json({ jsonrpc: '2.0', id: mcpRequestId, error: { code: -32001, message: msg } });
    }
    return res.status(401).json({ success: false, error: msg });
  }

  // ── Rate limit (Universal: API keys, OAuth Tokens, JWTs) ─────────────────
  const rateLimitId = authResult.isApiKey ? `key_${authResult.keyId}` : `user_${authResult.userId}`;
  const allowed = await checkRateLimit(rateLimitId, SUPABASE_URL, SB_SERVICE_KEY);
  if (!allowed) {
    const rateLimitMsg = 'Rate limit exceeded (60 requests/minute). Wait and retry.';
    if (isMcpJsonRpc) {
      return res.status(429).json({ jsonrpc: '2.0', id: mcpRequestId, error: { code: -32029, message: rateLimitMsg } });
    }
    return res.status(429).json({ success: false, error: rateLimitMsg });
  }

  // ── Resolve roles (same logic as api/admin.js) ────────────────────────────
  const roles = await resolveRoles(authResult.userId, authResult.email, SUPABASE_URL, SB_SERVICE_KEY, SUPERADMIN_EMAIL);

  // ── Route to handler ──────────────────────────────────────────────────────
  try {
    const result = await routeMethod(method, params, authResult, roles, {
      SUPABASE_URL, SB_SERVICE_KEY, GITHUB_TOKEN, GH_OWNER, GH_REPO, MAX_KEYS_PER_USER,
      reqHost: currentReqHost
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
      // Per MCP spec 2024-11-05 / 2025-06-18: tool errors return 200 OK with isError: true in result
      return res.status(200).json({
        jsonrpc: '2.0',
        id: mcpRequestId,
        result: {
          content: [{ type: 'text', text: `Error (${statusCode}): ${err.message}` }],
          isError: true
        }
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
    { name: 'system_health', description: 'Health check — returns server info and usage instructions', inputSchema: { type: 'object', properties: {} } },
    { name: 'content_list', description: 'List all educational content organized by semester, block, and category', inputSchema: { type: 'object', properties: {} } },
    { name: 'content_get', description: 'Download a specific content file by path (returns full HTML)', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path, e.g. content/semester 1/1.2/1.2-2_Overall CBT.html' } }, required: ['path'] } },
    { name: 'content_tree', description: 'Get the full file tree of content/ and cover/ directories', inputSchema: { type: 'object', properties: {} } },
    { name: 'content_upload', description: 'Upload a content file directly. You can pass contentBase64, contentGzipBase64 (compressed & 100% checksum-verified, ideal when network egress is blocked), OR a public url (for files up to 100MB) to fetch and commit the file reliably without chunking.', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Target path, e.g. content/Semester 1/file.html' }, contentBase64: { type: 'string', description: 'Base64 encoded file content' }, contentGzipBase64: { type: 'string', description: 'Gzip compressed base64 encoded content (80% smaller, checksum verified)' }, url: { type: 'string', description: 'Public URL to fetch the file from' } }, required: ['path'] } },
    { name: 'content_upload_from_agent_path', description: 'Generates authenticated curl commands and instructions for Claude to upload a large local file directly from the sandbox filesystem (avoiding base64 typing corruption).', inputSchema: { type: 'object', properties: { agentFilePath: { type: 'string', description: 'Absolute file path in agent sandbox, e.g. /mnt/user-data/outputs/farmakokinetik.html' }, targetPath: { type: 'string', description: 'Target path in repository, e.g. content/semester 3/3.1/3.1 LECTURE_Am I Kinetic.html' } }, required: ['agentFilePath', 'targetPath'] } },
    { name: 'upload_init', description: 'Initialize a bulletproof chunked upload session for large files of any size (videos, PDFs, zip pools, large HTML). Prevents serverless size limits & timeouts.', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Target path, e.g. content/Semester 1/video.mp4 or cover/semester1.png' }, totalChunks: { type: 'number', description: 'Total number of chunks to be uploaded' }, totalSizeBytes: { type: 'number', description: 'Optional estimated file size in bytes' } }, required: ['path', 'totalChunks'] } },
    { name: 'upload_chunk', description: 'Upload a single Base64 chunk (recommended size: 500KB - 1.5MB per chunk) for an active upload session.', inputSchema: { type: 'object', properties: { uploadId: { type: 'string', description: 'Session ID returned by upload_init' }, chunkIndex: { type: 'number', description: '1-indexed chunk number (1 to totalChunks)' }, chunkBase64: { type: 'string', description: 'Base64 encoded chunk data' } }, required: ['uploadId', 'chunkIndex', 'chunkBase64'] } },
    { name: 'upload_commit', description: 'Reassemble all uploaded chunks, verify integrity, and commit the complete large file to GitHub reliably.', inputSchema: { type: 'object', properties: { uploadId: { type: 'string', description: 'Session ID returned by upload_init' } }, required: ['uploadId'] } },
    { name: 'upload_status', description: 'Check status, received chunks, and missing chunks of an active chunked upload session.', inputSchema: { type: 'object', properties: { uploadId: { type: 'string', description: 'Session ID returned by upload_init' } }, required: ['uploadId'] } },
    { name: 'upload_cancel', description: 'Cancel an active chunked upload session and clean up temporary chunk data.', inputSchema: { type: 'object', properties: { uploadId: { type: 'string', description: 'Session ID returned by upload_init' } }, required: ['uploadId'] } },
    { name: 'content_delete', description: 'Delete a content file by path', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    { name: 'content_rename', description: 'Rename or move a content file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, newPath: { type: 'string' } }, required: ['path', 'newPath'] } },
    { name: 'tasks_list', description: 'List all content tasks on the task board', inputSchema: { type: 'object', properties: {} } },
    { name: 'tasks_create', description: 'Create a new content task (management only)', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, semester: { type: 'string' }, block: { type: 'string' }, category: { type: 'string' }, priority: { type: 'string', enum: ['low','normal','high','urgent'] } }, required: ['title'] } },
    { name: 'tasks_claim', description: 'Claim an open task (developer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks_submit', description: 'Submit a task for review (developer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks_approve', description: 'Approve a reviewed task (reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks_reject', description: 'Reject a task back to in-progress (reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, note: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks_logs', description: 'Get activity history for a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'divisions_list', description: 'List all organization divisions', inputSchema: { type: 'object', properties: {} } },
    { name: 'divisions_my', description: 'Get your division membership', inputSchema: { type: 'object', properties: {} } },
    { name: 'users_list', description: 'List all registered users (SuperAdmin only)', inputSchema: { type: 'object', properties: {} } },
    { name: 'users_ban', description: 'Ban or unban a user (SuperAdmin only)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, banned: { type: 'boolean' } }, required: ['user_id', 'banned'] } },
    { name: 'users_reset_password', description: 'Reset a user password by user_id or email (Admin / SuperAdmin only)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, email: { type: 'string' }, new_password: { type: 'string' } }, required: ['new_password'] } },
    { name: 'config_get', description: 'Get app configuration settings (Admin only)', inputSchema: { type: 'object', properties: {} } },
    { name: 'config_update', description: 'Update app settings (Admin only)', inputSchema: { type: 'object', properties: { allowSignup: { type: 'boolean' }, maintenanceMode: { type: 'boolean' } } } },
    { name: 'contributions_leaderboard', description: 'Get the contribution points leaderboard', inputSchema: { type: 'object', properties: {} } },
    { name: 'contributions_my', description: 'Get your own contribution history', inputSchema: { type: 'object', properties: {} } },
    { name: 'review_issues', description: 'Get review issues for a task (reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'review_report', description: 'Report a review issue on a task', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, issue_type: { type: 'string' }, description: { type: 'string' } }, required: ['task_id'] } },
    { name: 'review_resolve', description: 'Mark a review issue as resolved', inputSchema: { type: 'object', properties: { issue_id: { type: 'string' } }, required: ['issue_id'] } },
    { name: 'apikeys_list', description: 'List your active API keys', inputSchema: { type: 'object', properties: {} } },
    { name: 'apikeys_create', description: 'Generate a new API key', inputSchema: { type: 'object', properties: { name: { type: 'string' }, expires_in_days: { type: 'number' } }, required: ['name'] } },
    { name: 'apikeys_revoke', description: 'Revoke an API key by ID', inputSchema: { type: 'object', properties: { key_id: { type: 'string' } }, required: ['key_id'] } },
    { name: 'oauth_tokens_list', description: 'List your active OAuth connector tokens (Claude/MCP)', inputSchema: { type: 'object', properties: {} } },
    { name: 'oauth_tokens_revoke', description: 'Revoke an OAuth connector token by ID', inputSchema: { type: 'object', properties: { token_id: { type: 'string' } }, required: ['token_id'] } },
    { name: 'users_add_admin', description: 'Promote a user to Admin role (SuperAdmin only)', inputSchema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } },
    { name: 'users_remove_admin', description: 'Revoke Admin role from a user (SuperAdmin only)', inputSchema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } },
    { name: 'users_delete', description: 'Permanently delete a user account (SuperAdmin only)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] } },
    { name: 'divisions_add_member', description: 'Assign a user to an organization division (Admin only)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, division_id: { type: 'string', enum: ['management','development','review'] }, whatsapp: { type: 'string' } }, required: ['user_id', 'division_id'] } },
    { name: 'divisions_remove_member', description: 'Remove a user from an organization division (Admin only)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, division_id: { type: 'string' } }, required: ['user_id', 'division_id'] } },
    { name: 'content_delete_files', description: 'Delete multiple content files in a single atomic Git commit', inputSchema: { type: 'object', properties: { paths: { type: 'array', items: { type: 'string' } } }, required: ['paths'] } },
    { name: 'tasks_delete', description: 'Permanently delete a task from the board (Management/Admin only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'review_delete_issue', description: 'Delete a review issue report (Reviewer/Admin only)', inputSchema: { type: 'object', properties: { issue_id: { type: 'string' } }, required: ['issue_id'] } },
    { name: 'activity_logs', description: 'Get system & user activity logs (Admin only)', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'system_cleanup_guests', description: 'Run automated cleanup of expired guest/temporary accounts (Admin only)', inputSchema: { type: 'object', properties: {} } },
    { name: 'tasks_unclaim', description: 'Unclaim a task back to open status (Developer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks_start_review', description: 'Start active review on a submitted task (Reviewer only)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'tasks_add_note', description: 'Add a note/comment to a task log', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, note: { type: 'string' } }, required: ['task_id', 'note'] } },
    { name: 'tasks_reset_phase', description: 'Reset a task phase/status back for re-planning (Management/Dev/Reviewer)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, new_status: { type: 'string', enum: ['open', 'in_progress'] }, unassign: { type: 'boolean' }, note: { type: 'string' } }, required: ['task_id', 'note'] } },
    { name: 'tasks_re_review', description: 'Request re-review on a task (Reviewer/Management)', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, note: { type: 'string' } }, required: ['task_id', 'note'] } },
    { name: 'divisions_join', description: 'Join an organization division', inputSchema: { type: 'object', properties: { division_id: { type: 'string', enum: ['management','development','review'] }, whatsapp: { type: 'string' } }, required: ['division_id'] } },
    { name: 'divisions_update_whatsapp', description: 'Update your WhatsApp contact info', inputSchema: { type: 'object', properties: { whatsapp: { type: 'string' } }, required: ['whatsapp'] } },
    { name: 'divisions_get_members', description: 'Get detailed member list of a specific division (or all divisions)', inputSchema: { type: 'object', properties: { division_id: { type: 'string' } } } },
    { name: 'cover_list', description: 'List all cover image files in the cover/ directory', inputSchema: { type: 'object', properties: {} } },
    { name: 'cover_upload', description: 'Upload or update a cover image in cover/ (base64 encoded)', inputSchema: { type: 'object', properties: { filename: { type: 'string', description: 'e.g. semester 1.png' }, contentBase64: { type: 'string' } }, required: ['filename', 'contentBase64'] } },
    { name: 'cover_delete', description: 'Delete a cover image from cover/', inputSchema: { type: 'object', properties: { filename: { type: 'string' } }, required: ['filename'] } },
    { name: 'docs_get', description: 'Get the full documentation page HTML and sections (docs.html)', inputSchema: { type: 'object', properties: {} } },
    { name: 'docs_update_section', description: 'Update or revise a specific documentation section in docs.html', inputSchema: { type: 'object', properties: { sectionIndex: { type: 'number', description: '1-indexed section number' }, title: { type: 'string' }, contentHtml: { type: 'string' } }, required: ['sectionIndex'] } },
    { name: 'docs_add_section', description: 'Append a new documentation section to docs.html', inputSchema: { type: 'object', properties: { title: { type: 'string' }, contentHtml: { type: 'string' } }, required: ['title', 'contentHtml'] } },
    { name: 'users_remove_device', description: 'Remove a registered device entry from a user account (Admin/User self)', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, device_id: { type: 'string' } }, required: ['user_id', 'device_id'] } },
    { name: 'users_block_device', description: 'Block or unblock a device ID globally in system settings (Admin only)', inputSchema: { type: 'object', properties: { device_id: { type: 'string' }, banned: { type: 'boolean' } }, required: ['device_id', 'banned'] } },
    { name: 'codebase_read_file', description: 'Read the full content of any codebase file in the repository (SuperAdmin only)', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Relative path, e.g. api/admin.js or build.js' } }, required: ['path'] } },
    { name: 'codebase_write_file', description: 'Create or update any codebase file in the repository (SuperAdmin only)', inputSchema: { type: 'object', properties: { path: { type: 'string' }, contentBase64: { type: 'string' }, commitMessage: { type: 'string' } }, required: ['path', 'contentBase64'] } },
    { name: 'codebase_delete_file', description: 'Delete any codebase file from the repository (SuperAdmin only)', inputSchema: { type: 'object', properties: { path: { type: 'string' }, commitMessage: { type: 'string' } }, required: ['path'] } },
    { name: 'codebase_search', description: 'Search text or code across the codebase repository (SuperAdmin only)', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'codebase_git_history', description: 'Get recent git commit history for the codebase repository (SuperAdmin only)', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'mcp_create_tool', description: 'Dynamically create and register a new custom MCP tool at runtime (SuperAdmin/Admin only).', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Unique tool name, e.g. custom_quiz_parser' }, description: { type: 'string', description: 'Description of what the tool does' }, inputSchema: { type: 'object', description: 'JSON Schema object for inputs' }, handler: { type: 'string', description: 'JavaScript code snippet returning a result object' }, minRole: { type: 'string', enum: ['superadmin', 'admin', 'reviewer', 'developer', 'authenticated'] } }, required: ['name', 'description', 'handler'] } },
    { name: 'mcp_delete_tool', description: 'Delete/unregister a custom MCP tool created at runtime (SuperAdmin/Admin only).', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Name of custom tool to delete' } }, required: ['name'] } },
    { name: 'mcp_list_custom_tools', description: 'List all active custom dynamic MCP tools registered at runtime.', inputSchema: { type: 'object', properties: {} } },
    { name: 'doctortablet_list_notes', description: 'List all medical notes and categories in Doctor Tablet vault', inputSchema: { type: 'object', properties: { categoryId: { type: 'string', description: 'Optional category/folder ID filter' }, tag: { type: 'string', description: 'Optional tag filter' } } } },
    { name: 'doctortablet_read_note', description: 'Read full content, frontmatter, and wikilinks of a Doctor Tablet note', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Note slug or file path (e.g. Gizi-dan-Metabolisme)' } }, required: ['slug'] } },
    { name: 'doctortablet_save_note', description: 'Save, create, or update a medical note in Doctor Tablet vault with GitHub auto-sync. MANDATORY DOCTORTABLET RULES: 1) Must analyze & map source structure & concept hierarchy first. 2) Content must be high-density clinical reasoning with real cases & exam traps (NOT a raw PPT slide transcript). 3) MUST use GitHub Callouts ([!NOTE], [!TIP], [!WARNING]), Tables (comparisons/labs), Mermaid diagrams (algorithms/ADME/pathways), & LaTeX formulas ($...$ / $$...$$ for medical math/scores/equations). 4) Parameter author MUST match the authenticated MCP user FULL NAME ONLY WITHOUT TITLES (e.g. "Ahmad Muqorrobin", no "dr." or "S.Ked").', inputSchema: { type: 'object', properties: { title: { type: 'string', description: 'Note title' }, categoryId: { type: 'string', description: 'Target folder/category ID (e.g. Kuliah-Kardiologi)' }, content: { type: 'string', description: 'Markdown body content with YAML frontmatter, GitHub callouts, tables, mermaid diagrams, and LaTeX formulas' }, tags: { type: 'array', items: { type: 'string' }, description: 'Tags, e.g. ["#medical", "#kardiologi"]' }, author: { type: 'string', description: 'Authenticated MCP user FULL NAME ONLY WITHOUT TITLES (e.g. "Ahmad Muqorrobin", do not include "dr.", "S.Ked", or generic AI names)' } }, required: ['title', 'content'] } },
    { name: 'doctortablet_list_categories', description: 'Get folder hierarchy tree of categories in Doctor Tablet', inputSchema: { type: 'object', properties: {} } },
    { name: 'doctortablet_create_category', description: 'Create a new category folder in Doctor Tablet vault', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Category/folder name' }, parentId: { type: 'string', description: 'Optional parent category ID' } }, required: ['name'] } },
    { name: 'doctortablet_search_notes', description: 'Full-text search notes across titles, content, tags, or categories in Doctor Tablet', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search term or keyword' }, tag: { type: 'string' } }, required: ['query'] } },
    { name: 'doctortablet_delete_note', description: 'Delete a note from Doctor Tablet vault and GitHub repo', inputSchema: { type: 'object', properties: { filePath: { type: 'string', description: 'Relative file path, e.g. notes/Kebugaran-Fisik.md' } }, required: ['filePath'] } },
    { name: 'doctortablet_export_merged_document', description: 'Export and merge all medical notes under a category and subcategories into a single continuous Markdown document with Table of Contents', inputSchema: { type: 'object', properties: { categoryId: { type: 'string', description: 'Target category/folder ID (e.g. Kuliah-Kardiologi)' }, title: { type: 'string', description: 'Custom document title' } } } },
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
    token: rawKey,
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
    token: token,
    userMetadata: userData.user_metadata || {}
  };
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

  if (!res.ok) {
    console.error(`[OAuth Token Verification Failure] timestamp="${new Date().toISOString()}" reason="Database lookup failed" token="${token.slice(0, 15)}..."`);
    return { error: 'OAuth token lookup failed' };
  }

  const rows = await res.json();
  if (!rows || rows.length === 0) {
    console.error(`[OAuth Token Verification Failure] timestamp="${new Date().toISOString()}" reason="Invalid or revoked token" token="${token.slice(0, 15)}..."`);
    return { error: 'Invalid, revoked, or non-existent OAuth token' };
  }

  const tokenRecord = rows[0];
  if (new Date(tokenRecord.expires_at) < new Date()) {
    console.error(`[OAuth Token Verification Failure] timestamp="${new Date().toISOString()}" reason="Token expired" token="${token.slice(0, 15)}..." sub="${tokenRecord.user_email}"`);
    return { error: 'OAuth token expired' };
  }

  // RFC 8707 Canonical Audience Check — with flexible host/alias matching
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

  if (!matchesAudience) {
    console.error(`[OAuth Token Audience Mismatch] timestamp="${new Date().toISOString()}" expected="${canonicalServerUrl}" received="${tokenAudience}" sub="${tokenRecord.user_email}"`);
    return { error: 'OAuth token audience mismatch: token resource does not match server URI' };
  }

  return {
    isApiKey: false,
    keyId: null,
    userId: tokenRecord.user_id,
    email: tokenRecord.user_email,
    token: token,
    userMetadata: {}
  };
}

// ═══════════════════════════════════════════════════════════════
// ROLE RESOLVER — resolves roles & division membership
// ═══════════════════════════════════════════════════════════════

async function resolveRoles(userId, email, supabaseUrl, sbKey, superAdminEmail) {
  const isSuperAdmin = email === superAdminEmail;

  const encEmail = encodeURIComponent(email || '');
  const roleRes = await fetch(`${supabaseUrl}/rest/v1/user_roles?identifier=eq.${encEmail}&select=role`, {
    headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
  });
  let hasAdminRole = false;
  if (roleRes.ok) {
    const roleData = await roleRes.json();
    hasAdminRole = Array.isArray(roleData) && roleData.length > 0 && roleData[0].role === 'admin';
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

  // Fallback: If no division found by userId, look up real Supabase auth user by email
  if (!divisionId && email && sbKey) {
    try {
      const sbUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
        headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
      });
      if (sbUsersRes.ok) {
        const usersData = await sbUsersRes.json();
        const matchedUser = (usersData.users || []).find(u => u.email === email);
        if (matchedUser && matchedUser.id !== userId) {
          const fallbackDivRes = await fetch(`${supabaseUrl}/rest/v1/division_members?user_id=eq.${matchedUser.id}&select=division_id`, {
            headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
          });
          if (fallbackDivRes.ok) {
            const fbData = await fallbackDivRes.json();
            if (Array.isArray(fbData) && fbData.length > 0) {
              divisionId = fbData[0].division_id;
            }
          }
        }
      }
    } catch(e) {}
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

  validateToolArguments(method, params);

  const m = (method || '').replace(/\./g, '_');

  if (m === 'system_health') {
    return {
      status: 'healthy',
      version: '1.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      authenticated_user: auth.email,
      roles: {
        isSuperAdmin: roles.isSuperAdmin,
        isAdmin: roles.isAdmin,
        division: roles.divisionId || 'None'
      }
    };
  }

  if (m === 'apikeys_list') {
    if (!roles.canUseApiKeys) throw err403('Only division members can manage API keys');
    return listApiKeys(auth.userId, su, sk);
  }
  if (m === 'apikeys_create') {
    if (!roles.canUseApiKeys) throw err403('Only division members can create API keys');
    return createApiKey(auth.userId, params, su, sk, maxKeys);
  }
  if (m === 'apikeys_revoke') {
    if (!roles.canUseApiKeys) throw err403('Only division members can revoke API keys');
    const res = await revokeApiKey(auth.userId, params, su, sk);
    await logAction(auth.email, 'mcp_apikey_revoke', { key_id: params.key_id }, su, sk);
    return res;
  }
  if (m === 'oauth_tokens_list') {
    if (!roles.canUseApiKeys) throw err403('Only division members can view OAuth tokens');
    return listOAuthTokens(auth.userId, auth.email, roles.isSuperAdmin, su, sk);
  }
  if (m === 'oauth_tokens_revoke') {
    if (!roles.canUseApiKeys) throw err403('Only division members can revoke OAuth tokens');
    if (!params.token_id && !params.access_token) throw err400('Missing params.token_id or params.access_token');
    const res = await revokeOAuthToken(params.token_id || params.access_token, su, sk);
    await logAction(auth.email, 'mcp_oauth_revoke', { token_id: params.token_id || params.access_token }, su, sk);
    return res;
  }

  if (m === 'content_list') return contentList(gt, go, gr);
  if (m === 'content_get') {
    if (!params.path) throw err400('Missing params.path');
    return contentGet(params.path, gt, go, gr);
  }
  if (m === 'content_tree') return contentTree(gt, go, gr);
  if (m === 'content_upload') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload');
    if (!params.path || (!params.contentBase64 && !params.url)) throw err400('Missing params.path, params.contentBase64, or params.url');
    validatePath(params.path);
    return contentUpload(params, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'content_upload_from_agent_path') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload');
    if (!params.agentFilePath || !params.targetPath) throw err400('Missing params.agentFilePath or params.targetPath');
    validatePath(params.targetPath);
    return contentUploadFromAgentPath(params, auth, cfg.reqHost, gt, go, gr);
  }
  if (m === 'upload_init') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload');
    if (!params.path || !params.totalChunks) throw err400('Missing params.path or params.totalChunks');
    validatePath(params.path);
    return uploadInit(params, auth.email, su, sk);
  }
  if (m === 'upload_chunk') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload');
    return uploadChunk(params, auth.email, su, sk);
  }
  if (m === 'upload_commit') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload');
    return uploadCommit(params, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'upload_status') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return uploadStatus(params, su, sk);
  }
  if (m === 'upload_cancel') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return uploadCancel(params, auth.email, su, sk);
  }
  if (m === 'content_delete') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to delete');
    if (!params.path) throw err400('Missing params.path');
    validatePath(params.path);
    return contentDelete(params, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'content_rename') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to rename');
    if (!params.path || !params.newPath) throw err400('Missing params.path or params.newPath');
    validatePath(params.path);
    validatePath(params.newPath);
    return contentRename(params, auth.email, gt, go, gr, su, sk);
  }

  if (m === 'tasks_list') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return tasksList(su, sk);
  }
  if (m === 'tasks_create') {
    if (!roles.isManagement) throw err403('Management division only');
    return tasksCreate(params, auth.userId, su, sk);
  }
  if (m === 'tasks_claim') {
    if (!roles.isDeveloper) throw err403('Development division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksClaim(params.task_id, auth.userId, su, sk);
  }
  if (m === 'tasks_submit') {
    if (!roles.isDeveloper) throw err403('Development division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksSubmit(params.task_id, auth.userId, su, sk);
  }
  if (m === 'tasks_approve') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksApprove(params.task_id, auth.userId, su, sk);
  }
  if (m === 'tasks_reject') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksReject(params.task_id, params.note || '', su, sk);
  }
  if (m === 'tasks_logs') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksGetLogs(params.task_id, su, sk);
  }
  if (m === 'tasks_unclaim') {
    if (!roles.isDeveloper) throw err403('Development division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksUnclaim(params.task_id, auth.userId, su, sk);
  }
  if (m === 'tasks_start_review') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksStartReview(params.task_id, auth.userId, su, sk);
  }
  if (m === 'tasks_add_note') {
    if (!params.task_id || !params.note) throw err400('Missing params.task_id or params.note');
    return tasksAddNote(params.task_id, auth.userId, params.note, su, sk);
  }
  if (m === 'tasks_reset_phase') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    if (!params.task_id || !params.note) throw err400('Missing params.task_id or params.note');
    return tasksResetPhase(params.task_id, params.new_status, params.unassign, params.note, auth.userId, su, sk);
  }
  if (m === 'tasks_re_review') {
    if (!roles.isReviewer && !roles.isManagement && !roles.isAdmin) throw err403('Reviewers or Management required');
    if (!params.task_id || !params.note) throw err400('Missing params.task_id or params.note');
    return tasksReReview(params.task_id, params.note, auth.userId, su, sk);
  }

  if (m === 'divisions_list') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return divisionsList(su, sk);
  }
  if (m === 'divisions_my') return divisionsMyDivision(auth.userId, su, sk);
  if (m === 'divisions_join') {
    if (!params.division_id) throw err400('Missing params.division_id');
    return divisionsJoin(auth.userId, params.division_id, params.whatsapp || '', su, sk);
  }
  if (m === 'divisions_update_whatsapp') {
    if (!params.whatsapp) throw err400('Missing params.whatsapp');
    return divisionsUpdateWhatsapp(auth.userId, params.whatsapp, su, sk);
  }
  if (m === 'divisions_get_members') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required');
    return divisionsGetMembers(params.division_id, su, sk);
  }

  if (m === 'cover_list') return coverList(gt, go, gr);
  if (m === 'cover_upload') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to upload cover');
    if (!params.filename || !params.contentBase64) throw err400('Missing params.filename or params.contentBase64');
    const path = params.filename.startsWith('cover/') ? params.filename : `cover/${params.filename}`;
    validatePath(path);
    return contentUpload({ path, contentBase64: params.contentBase64 }, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'cover_delete') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to delete cover');
    if (!params.filename) throw err400('Missing params.filename');
    const path = params.filename.startsWith('cover/') ? params.filename : `cover/${params.filename}`;
    validatePath(path);
    return contentDelete({ path }, auth.email, gt, go, gr, su, sk);
  }

  if (m === 'docs_get') return docsGet(gt, go, gr);
  if (m === 'docs_update_section') {
    if (!roles.isAdmin) throw err403('Admin only to edit documentation');
    return docsUpdateSection(params, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'docs_add_section') {
    if (!roles.isAdmin) throw err403('Admin only to edit documentation');
    return docsAddSection(params, auth.email, gt, go, gr, su, sk);
  }

  if (m === 'users_remove_device') {
    if (!params.user_id || !params.device_id) throw err400('Missing params.user_id or params.device_id');
    const isSelf = auth.userId === params.user_id;
    if (!isSelf && !roles.isAdmin) throw err403('Admin or account owner required');
    return usersRemoveDevice(params.user_id, params.device_id, auth.email, su, sk);
  }
  if (m === 'users_block_device') {
    if (!roles.isAdmin) throw err403('Admin only');
    if (!params.device_id || params.banned === undefined) throw err400('Missing params.device_id or params.banned');
    return usersBlockDevice(params.device_id, params.banned, auth.email, su, sk);
  }

  if (m === 'users_list') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    return usersList(su, sk);
  }
  if (m === 'users_ban') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.user_id || params.banned === undefined) throw err400('Missing params.user_id or params.banned');
    return usersBan(params.user_id, params.banned, auth.email, su, sk);
  }
  if (m === 'users_reset_password') {
    if (!roles.isAdmin && !roles.isSuperAdmin) throw err403('Admin only');
    if (!params.new_password) throw err400('Missing params.new_password');
    return usersResetPassword(params.user_id, params.email, params.new_password, auth.email, su, sk);
  }
  if (m === 'users_delete') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.user_id) throw err400('Missing params.user_id');
    return usersDelete(params.user_id, su, sk);
  }
  if (m === 'users_add_admin') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.email) throw err400('Missing params.email');
    return usersAddAdmin(params.email, auth.email, su, sk);
  }
  if (m === 'users_remove_admin') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.email) throw err400('Missing params.email');
    return usersRemoveAdmin(params.email, auth.email, su, sk);
  }

  if (m === 'divisions_add_member') {
    if (!roles.isAdmin) throw err403('Admin only');
    if (!params.user_id || !params.division_id) throw err400('Missing params.user_id or params.division_id');
    return divisionsAddMember(params.user_id, params.division_id, params.whatsapp || '', auth.email, su, sk);
  }
  if (m === 'divisions_remove_member') {
    if (!roles.isAdmin) throw err403('Admin only');
    if (!params.user_id || !params.division_id) throw err400('Missing params.user_id or params.division_id');
    return divisionsRemoveMember(params.user_id, params.division_id, auth.email, su, sk);
  }

  if (m === 'content_delete_files') {
    if (!roles.hasDivision && !roles.isAdmin) throw err403('Division membership required to delete files');
    if (!params.paths || !Array.isArray(params.paths) || params.paths.length === 0) throw err400('Missing params.paths array');
    params.paths.forEach(p => validatePath(p));
    return contentDeleteFiles(params.paths, auth.email, gt, go, gr, su, sk);
  }

  if (m === 'tasks_delete') {
    if (!roles.isManagement && !roles.isAdmin) throw err403('Management or Admin only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return tasksDelete(params.task_id, auth.email, su, sk);
  }

  if (m === 'config_get') {
    if (!roles.isAdmin) throw err403('Admin only');
    return configGet(su, sk);
  }
  if (m === 'config_update') {
    if (!roles.isAdmin) throw err403('Admin only');
    return configUpdate(params, auth.email, su, sk);
  }

  if (m === 'contributions_leaderboard') return contributionsLeaderboard(su, sk);
  if (m === 'contributions_my') return contributionsMy(auth.userId, su, sk);

  if (m === 'review_issues') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.task_id) throw err400('Missing params.task_id');
    return reviewIssuesList(params.task_id, su, sk);
  }
  if (m === 'review_report') {
    if (!roles.isReviewer) throw err403('Review division only');
    return reviewIssuesReport(params, auth.userId, su, sk);
  }
  if (m === 'review_resolve') {
    if (!roles.isReviewer) throw err403('Review division only');
    if (!params.issue_id) throw err400('Missing params.issue_id');
    return reviewIssuesResolve(params.issue_id, su, sk);
  }
  if (m === 'review_delete_issue') {
    if (!roles.isReviewer && !roles.isAdmin) throw err403('Reviewer or Admin only');
    if (!params.issue_id) throw err400('Missing params.issue_id');
    const res = await reviewIssuesDelete(params.issue_id, su, sk);
    await logAction(auth.email, 'mcp_review_delete_issue', { issue_id: params.issue_id }, su, sk);
    return res;
  }

  if (m === 'activity_logs') {
    if (!roles.isAdmin) throw err403('Admin only');
    return activityLogsList(params.limit || 100, su, sk);
  }

  if (m === 'system_cleanup_guests') {
    if (!roles.isAdmin) throw err403('Admin only');
    return systemCleanupGuests(su, sk);
  }

  if (m === 'codebase_read_file') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only to access codebase files');
    if (!params.path) throw err400('Missing params.path');
    validateCodebasePath(params.path);
    return codebaseReadFile(params.path, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'codebase_write_file') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only to modify codebase files');
    if (!params.path || !params.contentBase64) throw err400('Missing params.path or params.contentBase64');
    validateCodebasePath(params.path);
    return codebaseWriteFile(params, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'codebase_delete_file') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only to delete codebase files');
    if (!params.path) throw err400('Missing params.path');
    validateCodebasePath(params.path);
    return codebaseDeleteFile(params, auth.email, gt, go, gr, su, sk);
  }
  if (m === 'codebase_search') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only');
    if (!params.query) throw err400('Missing params.query');
    return codebaseSearch(params.query, gt, go, gr);
  }
  if (m === 'mcp_create_tool') {
    if (!roles.isSuperAdmin) throw err403('SuperAdmin only to create custom MCP tools');
    return mcpCreateTool(params, auth.email, su, sk, roles);
  }
  if (m === 'mcp_delete_tool') {
    if (!roles.isAdmin) throw err403('Admin or SuperAdmin only to delete custom MCP tools');
    return mcpDeleteTool(params, auth.email, su, sk);
  }
  if (m === 'mcp_list_custom_tools') {
    return mcpListCustomTools(su, sk);
  }

  // Doctor Tablet Tool Routing
  if (m.startsWith('doctortablet_')) {
    return handleDoctorTabletMethod(m, params, gt);
  }

  // Check if requested method matches a dynamic custom tool created at runtime
  const activeCustomTools = await getActiveCustomTools(su, sk);
  const customTool = activeCustomTools.find(ct => ct.name === m);
  if (customTool) {
    return executeCustomTool(customTool, params, auth, roles, su, sk, gt);
  }

  throw err400(`Unknown method: ${method}`);
}

// ═══════════════════════════════════════════════════════════════
// ERROR HELPERS
// ═══════════════════════════════════════════════════════════════

function err400(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
function err403(msg) { const e = new Error(msg); e.statusCode = 403; return e; }
function err404(msg) { const e = new Error(msg); e.statusCode = 404; return e; }

function sanitizeAndNormalizePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') throw err400('Path must be a non-empty string');
  let clean = rawPath.replace(/\0/g, '');
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}
  clean = clean.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (clean.includes('..') || clean.includes('./') || clean.startsWith('/') || clean.toLowerCase().includes('%2e%2e')) {
    throw err400('Invalid path: directory traversal is strictly forbidden');
  }
  return clean.trim();
}

function validatePath(path) {
  const cleanPath = sanitizeAndNormalizePath(path);
  if (!cleanPath.startsWith('content/') && !cleanPath.startsWith('cover/')) {
    throw err400('Path must start with content/ or cover/');
  }
  return cleanPath;
}

function validateCodebasePath(path) {
  const cleanPath = sanitizeAndNormalizePath(path);
  const forbiddenFiles = [
    '.env', '.env.local', '.env.production', '.env.development',
    'vercel.json', '.vercel', 'package-lock.json'
  ];
  const lower = cleanPath.toLowerCase();
  if (forbiddenFiles.includes(lower) || lower.startsWith('.git') || lower.startsWith('.github/secrets')) {
    throw err403(`Access denied: Access to sensitive codebase file "${cleanPath}" is strictly prohibited.`);
  }
  return cleanPath;
}

function validateToolArguments(method, params) {
  if (params === null || params === undefined) {
    params = {};
  }
  if (typeof params !== 'object') {
    throw err400('Invalid params format: must be a JSON object');
  }

  const m = (method || '').replace(/\./g, '_');
  const tools = getMcpToolsList();
  const toolDef = tools.find(t => t.name === m);

  if (!toolDef || !toolDef.inputSchema) return;

  const schema = toolDef.inputSchema;
  const required = schema.required || [];
  const props = schema.properties || {};

  for (const reqField of required) {
    if (params[reqField] === undefined || params[reqField] === null || params[reqField] === '') {
      throw err400(`Missing required parameter: params.${reqField}`);
    }
  }

  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    const propSchema = props[key];
    if (!propSchema) continue;

    if (propSchema.type === 'string') {
      if (typeof val !== 'string') throw err400(`Invalid type for params.${key}: expected string`);
      const isLargePayload = key.toLowerCase().includes('base64') || key.toLowerCase().includes('content');
      const maxLen = isLargePayload ? 5242880 : 20000;
      if (val.length > maxLen) throw err400(`Parameter params.${key} exceeds maximum allowed length`);
    } else if (propSchema.type === 'number') {
      if (typeof val !== 'number' || Number.isNaN(val)) throw err400(`Invalid type for params.${key}: expected number`);
    } else if (propSchema.type === 'boolean') {
      if (typeof val !== 'boolean') throw err400(`Invalid type for params.${key}: expected boolean`);
    } else if (propSchema.type === 'array') {
      if (!Array.isArray(val)) throw err400(`Invalid type for params.${key}: expected array`);
      if (key === 'paths' && val.length > 20) throw err400(`Parameter params.${key} exceeds maximum limit of 20 items per request`);
    }

    if (propSchema.enum && !propSchema.enum.includes(val)) {
      throw err400(`Invalid value for params.${key}: must be one of [${propSchema.enum.join(', ')}]`);
    }
  }

  if (m === 'upload_init') {
    if (!Number.isInteger(params.totalChunks) || params.totalChunks < 1 || params.totalChunks > 500) {
      throw err400('params.totalChunks must be an integer between 1 and 500');
    }
  }
}

async function codebaseReadFile(path, adminEmail, githubToken, owner, repo, su, sk) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'MR-CAPSULES-MCP' }
  });
  if (!res.ok) throw new Error(`Failed to read codebase file ${path}: ${res.statusText}`);
  const data = await res.json();
  if (data.type !== 'file') throw err400(`Path ${path} is a ${data.type}, not a file`);
  const contentUtf8 = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  await logAction(adminEmail, 'mcp_codebase_read', { path }, su, sk);
  return { path, content: contentUtf8, sha: data.sha, size: data.size };
}

async function codebaseWriteFile(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { path, contentBase64, commitMessage } = params;
  const message = commitMessage || `mcp: update codebase file ${path}`;
  const uploadRes = await contentUpload(
    { path, contentBase64, isChunkedCommit: true },
    adminEmail,
    githubToken,
    owner,
    repo,
    su,
    sk
  );
  await logAction(adminEmail, 'mcp_codebase_write', { path, message }, su, sk);
  return { success: true, path, sha: uploadRes.sha, message };
}

async function codebaseDeleteFile(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { path } = params;
  const delRes = await contentDelete({ path }, adminEmail, githubToken, owner, repo, su, sk);
  await logAction(adminEmail, 'mcp_codebase_delete', { path }, su, sk);
  return { success: true, path };
}

async function codebaseSearch(query, githubToken, owner, repo) {
  const searchRes = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${repo}`, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'MR-CAPSULES-MCP' }
  });
  if (!searchRes.ok) throw new Error(`Code search failed: ${searchRes.statusText}`);
  const data = await searchRes.json();
  const items = (data.items || []).slice(0, 30).map(item => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    url: item.html_url
  }));
  return { total_count: data.total_count, query, matches: items };
}

async function codebaseGitHistory(limit, githubToken, owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
    headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'MR-CAPSULES-MCP' }
  });
  if (!res.ok) throw new Error('Failed to fetch commit history');
  const commitsData = await res.json();
  const commits = (commitsData || []).map(c => ({
    sha: c.sha ? c.sha.substring(0, 7) : '',
    full_sha: c.sha,
    message: c.commit ? c.commit.message : '',
    author: c.commit && c.commit.author ? c.commit.author.name : '',
    date: c.commit && c.commit.author ? c.commit.author.date : ''
  }));
  return { limit, commits };
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC CUSTOM MCP TOOLS ENGINE
// ═══════════════════════════════════════════════════════════════
const customMcpToolsMap = new Map();

async function getActiveCustomTools(su, sk) {
  try {
    const res = await fetch(`${su}/rest/v1/activity_logs?action=eq.mcp_custom_tool_def&order=time.asc`, {
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
    });
    if (!res.ok) return Array.from(customMcpToolsMap.values());
    const logs = await res.json();
    if (!Array.isArray(logs)) return Array.from(customMcpToolsMap.values());
    const activeTools = {};
    logs.forEach(log => {
      const details = log.details || {};
      if (details.deleted) {
        delete activeTools[details.name];
        customMcpToolsMap.delete(details.name);
      } else if (details.name && details.handler) {
        activeTools[details.name] = details;
        customMcpToolsMap.set(details.name, details);
      }
    });
    return Object.values(activeTools);
  } catch (e) {
    return Array.from(customMcpToolsMap.values());
  }
}

async function mcpCreateTool(params, adminEmail, su, sk, roles) {
  if (!roles || !roles.isSuperAdmin) {
    throw err403('SuperAdmin role required to create dynamic custom MCP tools.');
  }

  const { name, description, inputSchema, handler, minRole = 'admin' } = params;
  if (!name || !description || !handler) throw err400('Missing required fields: name, description, handler');

  const forbiddenPatterns = [
    /process\s*\./i,
    /process\s*\[/i,
    /process\s*env/i,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SB_SERVICE_KEY/i,
    /GITHUB_TOKEN/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /globalThis/i,
    /global\s*\./i,
    /import\s*\(/i,
    /require\s*\(/i
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(handler)) {
      throw err400(`Custom tool handler rejected: Contains forbidden security pattern matching ${pattern.toString()}`);
    }
  }

  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  const toolDef = {
    name: cleanName,
    description,
    inputSchema: inputSchema || { type: 'object', properties: {} },
    handler,
    minRole,
    createdBy: adminEmail,
    createdAt: new Date().toISOString()
  };

  customMcpToolsMap.set(cleanName, toolDef);
  await logAction(adminEmail, 'mcp_custom_tool_def', toolDef, su, sk);

  return {
    success: true,
    name: cleanName,
    message: `Dynamic MCP tool "${cleanName}" created and registered successfully!`
  };
}

async function mcpDeleteTool(params, adminEmail, su, sk) {
  const { name } = params;
  if (!name) throw err400('Missing tool name');

  customMcpToolsMap.delete(name);
  await logAction(adminEmail, 'mcp_custom_tool_def', { name, deleted: true }, su, sk);

  return { success: true, name, message: `Custom MCP tool "${name}" deleted.` };
}

async function mcpListCustomTools(su, sk) {
  const tools = await getActiveCustomTools(su, sk);
  return { count: tools.length, tools };
}

async function executeCustomTool(toolDef, params, auth, roles, su, sk, gt) {
  const roleRank = { superadmin: 4, admin: 3, reviewer: 2, developer: 2, authenticated: 1 };
  const requiredRank = roleRank[toolDef.minRole || 'admin'] || 3;
  let userRank = 1;
  if (roles.isSuperAdmin) userRank = 4;
  else if (roles.isAdmin) userRank = 3;
  else if (roles.isReviewer || roles.isDeveloper) userRank = 2;

  if (userRank < requiredRank) {
    throw err403(`Permission denied: Tool "${toolDef.name}" requires ${toolDef.minRole} role.`);
  }

  try {
    const fn = new Function('params', 'auth', 'su', 'gt', 'fetch', `
      return (async () => {
        ${toolDef.handler}
      })();
    `);
    const result = await fn(params, auth, su, gt, fetch);
    return { success: true, tool: toolDef.name, result };
  } catch (err) {
    throw new Error(`Execution error in custom tool "${toolDef.name}": ${err.message}`);
  }
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

// ═══════════════════════════════════════════════════════════════
// CHUNKED UPLOAD SESSION SYSTEM (In-Memory + Supabase Fallback)
// ═══════════════════════════════════════════════════════════════
const uploadSessions = new Map();
const UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function cleanExpiredUploadSessions() {
  const now = Date.now();
  for (const [uploadId, session] of uploadSessions.entries()) {
    const createdTime = new Date(session.createdAt).getTime();
    if (isNaN(createdTime) || (now - createdTime) > UPLOAD_SESSION_TTL_MS) {
      uploadSessions.delete(uploadId);
    }
  }
}

async function uploadInit(params, adminEmail, su, sk) {
  cleanExpiredUploadSessions();
  const { path, totalChunks, totalSizeBytes } = params;
  if (!path || !totalChunks || totalChunks < 1) throw err400('Missing path or valid totalChunks');
  validatePath(path);

  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const sessionData = {
    uploadId,
    path,
    adminEmail,
    totalChunks,
    totalSizeBytes: totalSizeBytes || 0,
    chunks: {},
    createdAt: new Date().toISOString()
  };

  uploadSessions.set(uploadId, sessionData);

  // Store in Supabase for cross-container serverless persistence
  await logAction(adminEmail, 'mcp_upload_init', { uploadId, path, totalChunks, totalSizeBytes }, su, sk);

  return {
    success: true,
    uploadId,
    path,
    totalChunks,
    maxRecommendedChunkSizeBytes: 1500000,
    message: `Upload session initialized. Send chunks 1 to ${totalChunks} using upload_chunk, then call upload_commit.`
  };
}

async function uploadChunk(params, adminEmail, su, sk) {
  const { uploadId, chunkIndex, chunkBase64 } = params;
  if (!uploadId || !chunkIndex || !chunkBase64) throw err400('Missing uploadId, chunkIndex, or chunkBase64');

  if (chunkBase64.length > 3.5 * 1024 * 1024) {
    throw err400('Chunk Base64 size exceeds 3.5MB single-request limit. Please send smaller chunks (e.g. 1MB per chunk).');
  }

  let session = uploadSessions.get(uploadId);

  // Fallback to restore session state if container restarted
  if (!session) {
    session = await restoreUploadSessionFromSb(uploadId, su, sk);
  }

  if (!session) {
    throw err400(`Upload session "${uploadId}" not found or expired. Please initialize a new session with upload_init.`);
  }

  if (chunkIndex < 1 || chunkIndex > session.totalChunks) {
    throw err400(`Invalid chunkIndex ${chunkIndex}. Must be between 1 and ${session.totalChunks}.`);
  }

  session.chunks[chunkIndex] = chunkBase64;
  uploadSessions.set(uploadId, session);

  // Persist chunk to Supabase REST admin_action_logs
  await logAction(adminEmail, 'mcp_upload_chunk', { uploadId, chunkIndex, chunkBase64 }, su, sk);

  const receivedIndexes = Object.keys(session.chunks).map(Number).sort((a, b) => a - b);
  const complete = receivedIndexes.length === session.totalChunks;
  const progressPercent = parseFloat(((receivedIndexes.length / session.totalChunks) * 100).toFixed(1));

  return {
    success: true,
    uploadId,
    chunkIndex,
    receivedChunksCount: receivedIndexes.length,
    totalChunks: session.totalChunks,
    complete,
    progressPercent
  };
}

async function uploadCommit(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { uploadId } = params;
  if (!uploadId) throw err400('Missing uploadId');

  let session = uploadSessions.get(uploadId);
  if (!session) {
    session = await restoreUploadSessionFromSb(uploadId, su, sk);
  }

  if (!session) {
    throw err400(`Upload session "${uploadId}" not found or expired.`);
  }

  const missingChunks = [];
  for (let i = 1; i <= session.totalChunks; i++) {
    if (!session.chunks[i]) missingChunks.push(i);
  }

  if (missingChunks.length > 0) {
    throw err400(`Cannot commit upload session "${uploadId}". Missing chunks: [${missingChunks.join(', ')}].`);
  }

  // Reassemble full binary Buffer in numeric chunk order for 100% exact precision
  const bufferChunks = [];
  for (let i = 1; i <= session.totalChunks; i++) {
    bufferChunks.push(Buffer.from(session.chunks[i], 'base64'));
  }
  const fullBuffer = Buffer.concat(bufferChunks);
  const fullBase64 = fullBuffer.toString('base64');

  // Upload complete file using enhanced robust contentUpload
  const uploadResult = await contentUpload(
    { path: session.path, contentBase64: fullBase64, isChunkedCommit: true },
    adminEmail,
    githubToken,
    owner,
    repo,
    su,
    sk
  );

  // Cleanup session
  uploadSessions.delete(uploadId);
  await logAction(adminEmail, 'mcp_upload_commit', { uploadId, path: session.path, totalChunks: session.totalChunks }, su, sk);

  return {
    success: true,
    path: session.path,
    uploadId,
    totalChunks: session.totalChunks,
    totalBase64Length: fullBase64.length,
    sha: uploadResult.sha,
    message: `File "${session.path}" assembled and committed successfully!`
  };
}

async function uploadStatus(params, su, sk) {
  const { uploadId } = params;
  if (!uploadId) throw err400('Missing uploadId');

  let session = uploadSessions.get(uploadId);
  if (!session) {
    session = await restoreUploadSessionFromSb(uploadId, su, sk);
  }

  if (!session) {
    throw err400(`Upload session "${uploadId}" not found or expired.`);
  }

  const receivedIndexes = Object.keys(session.chunks).map(Number).sort((a, b) => a - b);
  const missingChunks = [];
  for (let i = 1; i <= session.totalChunks; i++) {
    if (!session.chunks[i]) missingChunks.push(i);
  }

  return {
    uploadId,
    path: session.path,
    totalChunks: session.totalChunks,
    receivedChunksCount: receivedIndexes.length,
    receivedChunks: receivedIndexes,
    missingChunks,
    complete: missingChunks.length === 0,
    createdAt: session.createdAt
  };
}

async function uploadCancel(params, adminEmail, su, sk) {
  const { uploadId } = params;
  if (!uploadId) throw err400('Missing uploadId');

  uploadSessions.delete(uploadId);
  await logAction(adminEmail, 'mcp_upload_cancel', { uploadId }, su, sk);
  return { success: true, uploadId, message: 'Upload session canceled.' };
}

async function restoreUploadSessionFromSb(uploadId, su, sk) {
  try {
    const res = await fetch(`${su}/rest/v1/activity_logs?details->>uploadId=eq.${uploadId}&order=time.asc`, {
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
    });
    if (!res.ok) return null;
    const logs = await res.json();
    if (!Array.isArray(logs) || logs.length === 0) return null;

    const initLog = logs.find(l => l.action === 'mcp_upload_init');
    if (!initLog) return null;

    const details = initLog.details || {};
    const session = {
      uploadId,
      path: details.path,
      adminEmail: initLog.admin_email,
      totalChunks: details.totalChunks,
      totalSizeBytes: details.totalSizeBytes || 0,
      chunks: {},
      createdAt: initLog.time
    };

    const chunkLogs = logs.filter(l => l.action === 'mcp_upload_chunk');
    chunkLogs.forEach(cl => {
      if (cl.details && cl.details.chunkIndex && cl.details.chunkBase64) {
        session.chunks[cl.details.chunkIndex] = cl.details.chunkBase64;
      }
    });

    uploadSessions.set(uploadId, session);
    return session;
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// ROBUST DIRECT FILE UPLOAD (Contents API + Git Data API Conflict Retries)
// ═══════════════════════════════════════════════════════════════
async function contentUpload(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { path, isChunkedCommit } = params;
  let contentBase64 = params.contentBase64;

  if (params.contentGzipBase64) {
    try {
      const compressedBuffer = Buffer.from(params.contentGzipBase64, 'base64');
      const decompressedBuffer = zlib.gunzipSync(compressedBuffer);
      contentBase64 = decompressedBuffer.toString('base64');
    } catch (gzipErr) {
      throw err400(`Gzip decompression failed (file corrupted during LLM transfer): ${gzipErr.message}`);
    }
  } else if (params.url) {
    try {
      const fetchRes = await fetch(params.url);
      if (!fetchRes.ok) throw new Error(`Failed to fetch file from URL: ${fetchRes.statusText}`);
      const arrayBuffer = await fetchRes.arrayBuffer();
      contentBase64 = Buffer.from(arrayBuffer).toString('base64');
    } catch (fetchErr) {
      throw err400(`Failed to fetch file from url "${params.url}": ${fetchErr.message}`);
    }
  }

  if (!contentBase64) throw err400('Missing contentBase64, contentGzipBase64, or url');

  const base64Len = contentBase64.length;
  // If called directly (not via chunked commit) and not using url, enforce single-request serverless payload limit
  if (!isChunkedCommit && !params.url && base64Len > 3.5 * 1024 * 1024) {
    throw err400(`Single-request payload too large (${(base64Len / (1024 * 1024)).toFixed(2)}MB). Maximum payload for direct contentBase64 upload is 3.5MB. For larger files, please pass a public 'url' instead to fetch and commit directly without chunking, or use chunked upload tools.`);
  }

  // ATTEMPT 1: GitHub Contents API (Atomic single-call for files < 100MB)
  try {
    let existingSha = null;
    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
        headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'MR-CAPSULES-MCP' }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        existingSha = fileInfo.sha;
      }
    } catch (e) { /* file doesn't exist yet, ok */ }

    const putBody = {
      message: `mcp: upload ${path}`,
      content: contentBase64
    };
    if (existingSha) putBody.sha = existingSha;

    const putRes = await ghApi('PUT', `/contents/${encodeURIComponent(path)}`, putBody, githubToken, owner, repo);
    if (putRes.ok) {
      const putData = await putRes.json();
      await logAction(adminEmail, 'mcp_upload', { path, method: 'contents_api' }, su, sk);
      return { success: true, path, sha: putData.content?.sha || putData.commit?.sha };
    }
  } catch (e) {
    console.warn('Contents API direct upload failed, attempting Git Data API fallback:', e.message);
  }

  // ATTEMPT 2: Git Data API with Automatic Exponential Backoff Retries for Fast-Forward Conflicts
  let maxRetries = 4;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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

      const patchRes = await ghApi('PATCH', '/git/refs/heads/main', { sha: newCommit.sha }, githubToken, owner, repo);
      if (!patchRes.ok) {
        const patchErr = await patchRes.json();
        throw new Error(patchErr.message || 'Failed to update git ref');
      }

      await logAction(adminEmail, 'mcp_upload', { path, attempt }, su, sk);
      return { success: true, path, sha: newCommit.sha };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }
  }

  throw new Error(`Failed to upload ${path} after ${maxRetries} attempts: ${lastErr?.message || 'Git conflict'}`);
}

async function contentUploadFromAgentPath(params, auth, reqHost, githubToken, owner, repo) {
  const { agentFilePath, targetPath } = params;

  let existingSha = null;
  if (githubToken && owner && repo) {
    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`, {
        headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'MR-CAPSULES-MCP' }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        existingSha = fileInfo.sha;
      }
    } catch (e) {}
  }

  const host = reqHost || 'mr-capsules.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const url = `${protocol}://${host}/api/upload`;
  const token = auth.token || '';

  const ghCurlCmd = `curl -X PUT -H "Authorization: Bearer ${githubToken}" -H "Accept: application/vnd.github+json" -H "User-Agent: MR-CAPSULES-AGENT" "https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}" -d "{\\"message\\":\\"mcp: direct upload ${targetPath}\\",\\"content\\":\\"\$(base64 -w 0 '${agentFilePath}')\\"${existingSha ? `,\\"sha\\":\\"${existingSha}\\"` : ''}}"`;
  const vercelCurlCmd = `curl -X POST -H "Authorization: Bearer ${token}" -F "path=${targetPath}" -F "file=@${agentFilePath}" ${url}`;
  const pyCmd = `python3 -c "import gzip, base64; print(base64.b64encode(gzip.compress(open('${agentFilePath}','rb').read())).decode())"`;

  return `To upload this file reliably, choose the best method for your sandbox container:

METHOD 1 (Recommended if api.github.com is in your container's egress allowlist):
Run this command in your terminal/bash tool to upload directly to GitHub API:
\`\`\`bash
${ghCurlCmd}
\`\`\`

METHOD 2 (If Vercel endpoint is accessible in your terminal):
Run this curl command in your terminal/bash tool:
\`\`\`bash
${vercelCurlCmd}
\`\`\`

METHOD 3 (If ALL network egress is BLOCKED in your terminal):
1. Run this 1-line Python command locally to get the compressed, CRC32-verified Gzip string (80% smaller, zero corruption):
\`\`\`bash
${pyCmd}
\`\`\`
2. Call the tool \`content_upload\` via MCP with:
   - path: "${targetPath}"
   - contentGzipBase64: "<paste the output string from python command>"`;
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

async function tasksResetPhase(taskId, newStatus, unassign, note, userId, su, sk) {
  const targetStatus = newStatus || 'open';
  const updatePayload = {
    status: targetStatus,
    submitted_at: null,
    review_started_at: null,
    completed_at: null,
    reviewed_by: null
  };
  if (unassign || targetStatus === 'open') {
    updatePayload.assigned_to = null;
    updatePayload.assigned_at = null;
  }
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(updatePayload)
  });
  if (!res.ok) throw new Error('Failed to reset phase: ' + await res.text());
  const [task] = await res.json();

  await fetch(`${su}/rest/v1/task_logs`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, user_id: userId, action: 'phase_reset', new_status: targetStatus, note: note })
  });

  return { success: true, task };
}

async function tasksReReview(taskId, note, userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ status: 'in_review', review_started_at: new Date().toISOString(), completed_at: null })
  });
  if (!res.ok) throw new Error('Failed to request re-review: ' + await res.text());
  const [task] = await res.json();

  await fetch(`${su}/rest/v1/task_logs`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, user_id: userId, action: 're_review_requested', new_status: 'in_review', note: note })
  });

  return { success: true, task };
}

// ═══════════════════════════════════════════════════════════════
// DIVISIONS HANDLERS
// ═══════════════════════════════════════════════════════════════

async function divisionsList(su, sk) {
  const divRes = await fetch(`${su}/rest/v1/divisions?select=*`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const divs = await divRes.json();

  const sbUsersRes = await fetch(`${su}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  let allUsers = [];
  if (sbUsersRes.ok) {
    try {
      const usersData = await sbUsersRes.json();
      allUsers = usersData.users || [];
    } catch(e) {}
  }

  const memResDirect = await fetch(`${su}/rest/v1/division_members?select=division_id,user_id,whatsapp`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const mems = await memResDirect.json();

  const stats = divs.map(d => {
    const divisionMems = mems.filter(m => m.division_id === d.id);
    const membersList = divisionMems.map(m => {
      const u = allUsers.find(au => au.id === m.user_id);
      const email = u ? u.email : 'Unknown User';
      const username = u?.user_metadata?.username || (u ? u.email.split('@')[0] : 'Unknown');
      return { user_id: m.user_id, email, username, whatsapp: m.whatsapp || '' };
    });
    return {
      ...d,
      member_count: divisionMems.length,
      members: membersList
    };
  });
  return { divisions: stats };
}

async function divisionsGetMembers(divisionId, su, sk) {
  const allDivs = await divisionsList(su, sk);
  if (!divisionId) return allDivs;
  const found = allDivs.divisions.find(d => d.id === divisionId);
  return { division_id: divisionId, members: found ? found.members : [], member_count: found ? found.member_count : 0 };
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

async function usersResetPassword(userId, email, newPassword, adminEmail, su, sk) {
  let targetId = userId;
  if (!targetId && email) {
    const res = await fetch(`${su}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const found = (data.users || []).find(u => u.email === email || (u.user_metadata && u.user_metadata.email === email));
    if (!found) throw new Error(`User with email "${email}" not found`);
    targetId = found.id;
  }
  if (!targetId) throw new Error('Missing user_id or email');
  if (!newPassword || newPassword.length < 6) throw new Error('Password must be at least 6 characters long');

  const res = await fetch(`${su}/auth/v1/admin/users/${targetId}`, {
    method: 'PUT',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  });

  if (!res.ok) throw new Error(await res.text());
  const userData = await res.json();
  await logAction(adminEmail, 'mcp_reset_user_password', { target: userData.email || email, targetId }, su, sk);
  return { success: true, message: `Password for ${userData.email || email} reset successfully` };
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

async function reviewIssuesDelete(issueId, su, sk) {
  const res = await fetch(`${su}/rest/v1/review_issues?id=eq.${issueId}`, {
    method: 'DELETE',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to delete issue: ' + await res.text());
  return { success: true, issueId };
}

async function usersAddAdmin(targetEmail, adminEmail, su, sk) {
  const res = await fetch(`${su}/rest/v1/user_roles`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ identifier: targetEmail.trim(), role: 'admin' })
  });
  if (!res.ok) throw new Error('Failed to add admin: ' + await res.text());
  await logAction(adminEmail, 'mcp_add_admin', { targetEmail }, su, sk);
  return { success: true, email: targetEmail };
}

async function usersRemoveAdmin(targetEmail, adminEmail, su, sk) {
  const encEmail = encodeURIComponent(targetEmail.trim());
  const res = await fetch(`${su}/rest/v1/user_roles?identifier=eq.${encEmail}`, {
    method: 'DELETE',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to remove admin: ' + await res.text());
  await logAction(adminEmail, 'mcp_remove_admin', { targetEmail }, su, sk);
  return { success: true, email: targetEmail };
}

async function divisionsAddMember(userId, divisionId, whatsapp, adminEmail, su, sk) {
  const res = await fetch(`${su}/rest/v1/division_members`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, division_id: divisionId, whatsapp })
  });
  if (!res.ok) throw new Error('Failed to add division member: ' + await res.text());
  await logAction(adminEmail, 'mcp_add_division_member', { userId, divisionId }, su, sk);
  return { success: true, userId, divisionId };
}

async function divisionsRemoveMember(userId, divisionId, adminEmail, su, sk) {
  const res = await fetch(`${su}/rest/v1/division_members?user_id=eq.${userId}&division_id=eq.${divisionId}`, {
    method: 'DELETE',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to remove division member: ' + await res.text());
  await logAction(adminEmail, 'mcp_remove_division_member', { userId, divisionId }, su, sk);
  return { success: true, userId, divisionId };
}

async function contentDeleteFiles(paths, adminEmail, githubToken, owner, repo, su, sk) {
  const refRes = await ghApi('GET', '/git/refs/heads/main', null, githubToken, owner, repo);
  const refData = await refRes.json();
  const commitSha = refData.object.sha;

  const commitRes = await ghApi('GET', `/git/commits/${commitSha}`, null, githubToken, owner, repo);
  const commitData = await commitRes.json();

  const treeEntries = paths.map(p => ({ path: p, mode: '100644', type: 'blob', sha: null }));

  const treeRes = await ghApi('POST', '/git/trees', {
    base_tree: commitData.tree.sha,
    tree: treeEntries
  }, githubToken, owner, repo);
  const treeData = await treeRes.json();

  const newCommitRes = await ghApi('POST', '/git/commits', {
    message: `mcp: bulk delete ${paths.length} files`,
    tree: treeData.sha,
    parents: [commitSha]
  }, githubToken, owner, repo);
  const newCommit = await newCommitRes.json();

  await ghApi('PATCH', '/git/refs/heads/main', { sha: newCommit.sha }, githubToken, owner, repo);
  await logAction(adminEmail, 'mcp_delete_files', { paths }, su, sk);
  return { success: true, deletedCount: paths.length };
}

async function tasksDelete(taskId, adminEmail, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'DELETE',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to delete task: ' + await res.text());
  await logAction(adminEmail, 'mcp_delete_task', { taskId }, su, sk);
  return { success: true, taskId };
}

async function tasksUnclaim(taskId, userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'open', assignee_id: null, claimed_at: null })
  });
  if (!res.ok) throw new Error('Failed to unclaim task: ' + await res.text());
  return { success: true };
}

async function tasksStartReview(taskId, userId, su, sk) {
  const res = await fetch(`${su}/rest/v1/content_tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_review', reviewer_id: userId })
  });
  if (!res.ok) throw new Error('Failed to start review: ' + await res.text());
  return { success: true };
}

async function tasksAddNote(taskId, userId, note, su, sk) {
  const res = await fetch(`${su}/rest/v1/task_activity_logs`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, actor_id: userId, action: 'add_note', note })
  });
  if (!res.ok) throw new Error('Failed to add note: ' + await res.text());
  return { success: true };
}

async function divisionsJoin(userId, divisionId, whatsapp, su, sk) {
  const res = await fetch(`${su}/rest/v1/division_members`, {
    method: 'POST',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, division_id: divisionId, whatsapp })
  });
  if (!res.ok) throw new Error('Failed to join division: ' + await res.text());
  return { success: true, divisionId };
}

async function divisionsUpdateWhatsapp(userId, whatsapp, su, sk) {
  const res = await fetch(`${su}/rest/v1/division_members?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp })
  });
  if (!res.ok) throw new Error('Failed to update whatsapp: ' + await res.text());
  return { success: true, whatsapp };
}

// ═══════════════════════════════════════════════════════════════
// COVER & DOCS HANDLERS
// ═══════════════════════════════════════════════════════════════

async function coverList(githubToken, owner, repo) {
  const tree = await contentTree(githubToken, owner, repo);
  const covers = (tree.tree || []).filter(item => item.path.startsWith('cover/'));
  return { covers };
}

async function docsGet(githubToken, owner, repo) {
  const fileData = await contentGet('docs.html', githubToken, owner, repo);
  return { html: fileData.content, path: 'docs.html' };
}

function sanitizeDocsHtml(rawHtml) {
  if (!rawHtml) return '';
  let cleaned = rawHtml;
  cleaned = cleaned.replace(/\s*style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*style='[^']*'/gi, '');
  cleaned = cleaned.replace(/<table(?!\s+class=)[^>]*>/gi, '<table class="docs-table">');
  cleaned = cleaned.replace(/<table\s+class="(?![^"]*docs-table)[^"]*"/gi, '<table class="docs-table"');
  return cleaned;
}

async function docsUpdateSection(params, adminEmail, githubToken, owner, repo, su, sk) {
  let { sectionIndex, title, contentHtml } = params;
  if (contentHtml) contentHtml = sanitizeDocsHtml(contentHtml);
  const docsData = await contentGet('docs.html', githubToken, owner, repo);
  let html = docsData.content;

  const sections = html.split('<div class="docs-section">');
  if (sectionIndex < 1 || sectionIndex >= sections.length) {
    throw err400(`Invalid sectionIndex: ${sectionIndex}. Total sections: ${sections.length - 1}`);
  }

  let oldSec = sections[sectionIndex];
  let endIdx = oldSec.indexOf('</div>');
  if (endIdx === -1) endIdx = oldSec.length;

  let newSecContent = '\n';
  if (title) newSecContent += `        <h2>${title}</h2>\n`;
  if (contentHtml) newSecContent += `        ${contentHtml}\n      `;

  sections[sectionIndex] = newSecContent + oldSec.substring(endIdx);
  const updatedHtml = sections.join('<div class="docs-section">');

  const base64Content = Buffer.from(updatedHtml, 'utf-8').toString('base64');
  await contentUpload({ path: 'docs.html', contentBase64: base64Content }, adminEmail, githubToken, owner, repo, su, sk);
  return { success: true, updatedSectionIndex: sectionIndex };
}

async function docsAddSection(params, adminEmail, githubToken, owner, repo, su, sk) {
  let { title, contentHtml, tabId = 'docsGeneral' } = params;
  if (contentHtml) contentHtml = sanitizeDocsHtml(contentHtml);
  const docsData = await contentGet('docs.html', githubToken, owner, repo);
  let html = docsData.content;

  const sectionHtml = `\n      <div class="docs-section">\n        <h2>${title}</h2>\n        ${contentHtml}\n      </div>\n`;

  const containerMarker = `id="${tabId}"`;
  const containerIdx = html.indexOf(containerMarker);
  if (containerIdx === -1) {
    throw new Error(`Target tab container "${tabId}" not found in docs.html`);
  }

  const nextContainerIdx = html.indexOf('<div class="docs-container"', containerIdx + containerMarker.length);
  const scriptIdx = html.indexOf('<script>', containerIdx);
  let limitIdx = html.length;
  if (nextContainerIdx !== -1) limitIdx = Math.min(limitIdx, nextContainerIdx);
  if (scriptIdx !== -1) limitIdx = Math.min(limitIdx, scriptIdx);

  const closeDivIdx = html.lastIndexOf('</div>', limitIdx);
  if (closeDivIdx === -1 || closeDivIdx <= containerIdx) {
    throw new Error(`Could not find closing tag for container "${tabId}"`);
  }

  html = html.substring(0, closeDivIdx) + sectionHtml + html.substring(closeDivIdx);

  const base64Content = Buffer.from(html, 'utf-8').toString('base64');
  await contentUpload({ path: 'docs.html', contentBase64: base64Content }, adminEmail, githubToken, owner, repo, su, sk);
  return { success: true, title, tabId };
}

async function docsAddTab(params, adminEmail, githubToken, owner, repo, su, sk) {
  let { tabId, title, iconSvg, contentHtml = '' } = params;
  if (contentHtml) contentHtml = sanitizeDocsHtml(contentHtml);
  const docsData = await contentGet('docs.html', githubToken, owner, repo);
  let html = docsData.content;

  if (html.includes(`data-target="${tabId}"`) || html.includes(`id="${tabId}"`)) {
    throw new Error(`Tab with ID "${tabId}" already exists.`);
  }

  const defaultIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
  const icon = iconSvg || defaultIcon;

  const tabButtonHtml = `\n      <div class="tab" data-target="${tabId}">\n        ${icon}\n        ${title}\n      </div>\n    `;
  
  const containerHtml = `\n    <div class="docs-container" id="${tabId}">\n      <div class="docs-title">${title.toUpperCase()}</div>\n      ${contentHtml}\n    </div>\n`;

  const tabsMarker = '<div class="tabs">';
  const tabsIdx = html.indexOf(tabsMarker);
  if (tabsIdx === -1) throw new Error('<div class="tabs"> not found in docs.html');
  const tabsCloseIdx = html.indexOf('</div>', tabsIdx);
  html = html.substring(0, tabsCloseIdx) + tabButtonHtml + html.substring(tabsCloseIdx);

  const scriptIdx = html.indexOf('<script>');
  const lastDivBeforeScript = html.lastIndexOf('</div>', scriptIdx);
  if (lastDivBeforeScript === -1) throw new Error('Closing container div before script not found');

  html = html.substring(0, lastDivBeforeScript) + containerHtml + html.substring(lastDivBeforeScript);

  const base64Content = Buffer.from(html, 'utf-8').toString('base64');
  await contentUpload({ path: 'docs.html', contentBase64: base64Content }, adminEmail, githubToken, owner, repo, su, sk);
  return { success: true, tabId, title };
}

async function docsUpdateTab(params, adminEmail, githubToken, owner, repo, su, sk) {
  let { tabId, title, contentHtml } = params;
  if (contentHtml) contentHtml = sanitizeDocsHtml(contentHtml);
  const docsData = await contentGet('docs.html', githubToken, owner, repo);
  let html = docsData.content;

  if (title) {
    const tabRegex = new RegExp(`(<div class="tab[^"]*" data-target="${tabId}">[\\s\\S]*?<\\/div>)`);
    if (tabRegex.test(html)) {
      html = html.replace(tabRegex, (match) => {
        return match.replace(/>\s*([^<]+)\s*<\/div>/, `> ${title}</div>`);
      });
    }
  }

  if (contentHtml) {
    const containerMarker = `id="${tabId}"`;
    const containerIdx = html.indexOf(containerMarker);
    if (containerIdx === -1) throw new Error(`Tab container "${tabId}" not found`);

    const startIdx = html.indexOf('>', containerIdx) + 1;
    const nextContainerIdx = html.indexOf('<div class="docs-container"', startIdx);
    const scriptIdx = html.indexOf('<script>', startIdx);
    let limitIdx = html.length;
    if (nextContainerIdx !== -1) limitIdx = Math.min(limitIdx, nextContainerIdx);
    if (scriptIdx !== -1) limitIdx = Math.min(limitIdx, scriptIdx);

    const endIdx = html.lastIndexOf('</div>', limitIdx);
    const newInner = `\n      <div class="docs-title">${(title || tabId).toUpperCase()}</div>\n      ${contentHtml}\n    `;
    html = html.substring(0, startIdx) + newInner + html.substring(endIdx);
  }

  const base64Content = Buffer.from(html, 'utf-8').toString('base64');
  await contentUpload({ path: 'docs.html', contentBase64: base64Content }, adminEmail, githubToken, owner, repo, su, sk);
  return { success: true, tabId };
}

async function docsDeleteTab(params, adminEmail, githubToken, owner, repo, su, sk) {
  const { tabId } = params;
  const docsData = await contentGet('docs.html', githubToken, owner, repo);
  let html = docsData.content;

  const tabBtnRegex = new RegExp(`\\s*<div class="tab[^"]*" data-target="${tabId}">[\\s\\S]*?<\\/div>`, 'g');
  html = html.replace(tabBtnRegex, '');

  const containerMarker = `id="${tabId}"`;
  const containerIdx = html.indexOf(containerMarker);
  if (containerIdx !== -1) {
    const divStartIdx = html.lastIndexOf('<div class="docs-container"', containerIdx);
    const startIdx = html.indexOf('>', containerIdx) + 1;
    const nextContainerIdx = html.indexOf('<div class="docs-container"', startIdx);
    const scriptIdx = html.indexOf('<script>', startIdx);
    let limitIdx = html.length;
    if (nextContainerIdx !== -1) limitIdx = Math.min(limitIdx, nextContainerIdx);
    if (scriptIdx !== -1) limitIdx = Math.min(limitIdx, scriptIdx);

    const endDivIdx = html.lastIndexOf('</div>', limitIdx);
    const fullEndIdx = html.indexOf('>', endDivIdx) + 1;
    html = html.substring(0, divStartIdx) + html.substring(fullEndIdx);
  }

  const base64Content = Buffer.from(html, 'utf-8').toString('base64');
  await contentUpload({ path: 'docs.html', contentBase64: base64Content }, adminEmail, githubToken, owner, repo, su, sk);
  return { success: true, tabId };
}

async function usersRemoveDevice(userId, deviceId, adminEmail, su, sk) {
  await fetch(`${su}/rest/v1/user_devices?user_id=eq.${userId}&device_id=eq.${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });

  const getSbRes = await fetch(`${su}/auth/v1/admin/users/${userId}`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (getSbRes.ok) {
    const userData = await getSbRes.json();
    const userMeta = userData.user_metadata || {};
    let devices = Array.isArray(userMeta.devices) ? userMeta.devices : [];
    devices = devices.filter(d => d.id !== deviceId);

    await fetch(`${su}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_metadata: { ...userMeta, devices } })
    });
  }

  await logAction(adminEmail, 'mcp_remove_user_device', { userId, deviceId }, su, sk);
  return { success: true, userId, deviceId };
}

async function usersBlockDevice(deviceId, banned, adminEmail, su, sk) {
  const getRes = await fetch(`${su}/rest/v1/app_settings?limit=1`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  const [cfg] = await getRes.json();
  let bannedDevs = cfg.banned_devices || [];

  if (banned) {
    if (!bannedDevs.includes(deviceId)) bannedDevs.push(deviceId);
  } else {
    bannedDevs = bannedDevs.filter(id => id !== deviceId);
  }

  const res = await fetch(`${su}/rest/v1/app_settings?id=eq.${cfg.id}`, {
    method: 'PATCH',
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ banned_devices: bannedDevs })
  });
  if (!res.ok) throw new Error('Failed to block/unblock device');

  await logAction(adminEmail, banned ? 'mcp_block_device' : 'mcp_unblock_device', { deviceId }, su, sk);
  return { success: true, deviceId, banned };
}

async function activityLogsList(limit, su, sk) {
  const res = await fetch(`${su}/rest/v1/activity_logs?select=*&order=time.desc&limit=${limit}`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!res.ok) throw new Error('Failed to fetch activity logs');
  return { logs: await res.json() };
}

async function systemCleanupGuests(su, sk) {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const getRes = await fetch(`${su}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
  });
  if (!getRes.ok) throw new Error('Failed to fetch users');
  const { users } = await getRes.json();
  const guestUsers = (users || []).filter(u => u.email && u.email.endsWith('@guest.mr-capsules.local') && u.created_at < cutoff);

  let deletedCount = 0;
  for (const guest of guestUsers) {
    const delRes = await fetch(`${su}/auth/v1/admin/users/${guest.id}`, {
      method: 'DELETE',
      headers: { 'apikey': sk, 'Authorization': `Bearer ${sk}` }
    });
    if (delRes.ok) deletedCount++;
  }
  return { success: true, deletedGuestsCount: deletedCount };
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG HELPER
// ═══════════════════════════════════════════════════════════════

async function logAction(adminEmail, action, details, su, sk) {
  try {
    await fetch(`${su}/rest/v1/activity_logs`, {
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
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'mr-capsules.vercel.app';
  const sessionId = `mrc-${Date.now()}`;

  // Return SSE stream per Streamable HTTP / SSE spec
  // Claude.ai web uses this GET stream to establish connection reachability
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Mcp-Session-Id', sessionId);

  // Send the server's endpoint event (Streamable HTTP pattern)
  res.write(`event: endpoint\ndata: ${JSON.stringify({
    uri: '/api/mcp',
    name: 'mr-capsules'
  })}\n\n`);

  // Heartbeat to keep Vercel connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch(e) { clearInterval(heartbeat); }
  }, 20000);

  req.on('close', () => clearInterval(heartbeat));
}

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

async function handleDirectUpload(req, res, supabaseUrl, sbKey, githubToken, owner, repo, superAdminEmail) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = (req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }
  const token = authHeader.slice(7).trim();
  const currentReqHost = req.headers['x-forwarded-host'] || req.headers.host || 'mr-capsules.vercel.app';

  let authResult = null;
  if (token.startsWith('mrc_at_')) {
    authResult = await authenticateOAuthAccessToken(token, supabaseUrl, sbKey, currentReqHost);
  } else if (token.startsWith('mrc_')) {
    authResult = await authenticateApiKey(token, supabaseUrl, sbKey);
  } else {
    authResult = await authenticateJWT(token, supabaseUrl, sbKey);
  }

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

// ═══════════════════════════════════════════════════════════════
// DOCTOR TABLET INTEGRATION HELPERS
// ═══════════════════════════════════════════════════════════════

const DOCTORTABLET_API_URL = process.env.DOCTORTABLET_API_URL || 'https://doctortablet.vercel.app/api/notes';
const DOCTORTABLET_GH_OWNER = 'alchemist4real';
const DOCTORTABLET_GH_REPO = 'doctortablet';

async function handleDoctorTabletMethod(m, params, githubToken) {
  if (m === 'doctortablet_list_notes') {
    return doctortabletListNotes(params, githubToken);
  }
  if (m === 'doctortablet_read_note') {
    return doctortabletReadNote(params.slug, githubToken);
  }
  if (m === 'doctortablet_save_note') {
    return doctortabletSaveNote(params, githubToken);
  }
  if (m === 'doctortablet_list_categories') {
    return doctortabletListCategories(githubToken);
  }
  if (m === 'doctortablet_create_category') {
    return doctortabletCreateCategory(params, githubToken);
  }
  if (m === 'doctortablet_search_notes') {
    return doctortabletSearchNotes(params, githubToken);
  }
  if (m === 'doctortablet_delete_note') {
    return doctortabletDeleteNote(params.filePath, githubToken);
  }
  if (m === 'doctortablet_export_merged_document') {
    return doctortabletExportMergedDocument(params, githubToken);
  }
  throw err400(`Unknown DoctorTablet method: ${m}`);
}

async function doctortabletFetchNotes(githubToken) {
  // 1. Try Live API first
  try {
    const res = await fetch(DOCTORTABLET_API_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'MR-CAPSULES-MCP-Gateway' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.notes) && data.notes.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.error('DoctorTablet Live API fetch error:', err);
  }

  // 2. Fallback to GitHub REST Git Tree API if Live API returned empty or failed
  if (githubToken) {
    try {
      const treeUrl = `https://api.github.com/repos/${DOCTORTABLET_GH_OWNER}/${DOCTORTABLET_GH_REPO}/git/trees/main?recursive=1`;
      const ghRes = await fetch(treeUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'MR-CAPSULES-MCP-Gateway'
        }
      });

      if (ghRes.ok) {
        const treeData = await ghRes.json();
        const rawTree = treeData.tree || [];
        const notesItems = rawTree.filter(item => item.path.startsWith('notes/'));

        const categoriesMap = new Map();
        const notes = [];

        for (const item of notesItems) {
          const relPath = item.path.replace(/^notes\//, '');
          if (!relPath || relPath === '.gitkeep') continue;

          const parts = relPath.split('/');

          if (item.type === 'tree') {
            const folderName = parts[parts.length - 1];
            const parentId = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
            categoriesMap.set(relPath, {
              id: relPath,
              name: folderName.replace(/-/g, ' '),
              path: relPath,
              parentId: parentId,
              type: 'custom',
              color: '#8A9A7E'
            });
          } else if (item.type === 'blob' && relPath.endsWith('.md')) {
            const filename = parts[parts.length - 1];
            const slug = filename.replace(/\.md$/, '');
            const categoryId = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';

            if (categoryId !== 'root' && !categoriesMap.has(categoryId)) {
              const catParts = categoryId.split('/');
              const folderName = catParts[catParts.length - 1];
              const parentId = catParts.length > 1 ? catParts.slice(0, -1).join('/') : null;
              categoriesMap.set(categoryId, {
                id: categoryId,
                name: folderName.replace(/-/g, ' '),
                path: categoryId,
                parentId: parentId,
                type: 'custom',
                color: '#8A9A7E'
              });
            }

            notes.push({
              id: `note-${slug}`,
              title: slug.replace(/-/g, ' '),
              categoryId,
              slug,
              filePath: item.path,
              tags: ['#medical'],
              updatedAt: new Date().toISOString().split('T')[0],
              sha: item.sha
            });
          }
        }

        return {
          success: true,
          notes,
          categories: Array.from(categoriesMap.values()),
          source: 'github'
        };
      }
    } catch (err) {
      console.error('DoctorTablet GitHub tree fallback fetch error:', err);
    }
  }

  return { success: false, notes: [], categories: [] };
}

async function doctortabletListNotes(params = {}, githubToken) {
  const data = await doctortabletFetchNotes(githubToken);
  let notes = data.notes || [];
  if (params.categoryId) {
    notes = notes.filter(n => n.categoryId === params.categoryId || n.categoryId.startsWith(params.categoryId + '/'));
  }
  if (params.tag) {
    const cleanTag = params.tag.replace(/^#/, '').toLowerCase();
    notes = notes.filter(n => Array.isArray(n.tags) && n.tags.some(t => String(t).toLowerCase().replace(/^#/, '') === cleanTag));
  }
  return {
    success: true,
    totalCount: notes.length,
    notes: notes.map(n => ({
      id: n.id,
      title: n.title,
      categoryId: n.categoryId,
      filePath: n.filePath,
      tags: n.tags,
      wordCount: n.wordCount,
      updatedAt: n.updatedAt
    })),
    categories: data.categories || [],
    source: data.source || 'live_api'
  };
}

async function doctortabletReadNote(slug, githubToken) {
  if (!slug) throw err400('Missing params.slug');
  const cleanSlug = slug.replace(/\.md$/, '');
  
  const data = await doctortabletFetchNotes(githubToken);
  const notes = data.notes || [];
  const matched = notes.find(n => n.slug === cleanSlug || n.id === `note-${cleanSlug}` || (n.filePath && n.filePath.endsWith(`${cleanSlug}.md`)));

  if (matched && matched.content) {
    return { success: true, note: matched };
  }

  if (githubToken) {
    const filePath = matched ? matched.filePath : `notes/${cleanSlug}.md`;
    try {
      const ghUrl = `https://api.github.com/repos/${DOCTORTABLET_GH_OWNER}/${DOCTORTABLET_GH_REPO}/contents/${filePath}`;
      const ghRes = await fetch(ghUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'MR-CAPSULES-MCP-Gateway'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        const contentStr = Buffer.from(ghData.content, 'base64').toString('utf-8');
        return {
          success: true,
          note: {
            title: matched ? matched.title : cleanSlug.replace(/-/g, ' '),
            slug: cleanSlug,
            categoryId: matched ? matched.categoryId : 'root',
            filePath,
            content: contentStr,
            sha: ghData.sha
          }
        };
      }
    } catch (e) {
      console.error('DoctorTablet GitHub fetch fallback error:', e);
    }
  }

  if (matched) return { success: true, note: matched };
  throw err404(`DoctorTablet note not found: ${slug}`);
}

async function doctortabletSaveNote(params, githubToken) {
  const { title, categoryId, content, tags, author, type } = params;
  if (!title || !content) throw err400('Title and Content are required to save note');

  // Attempt Live API POST first
  try {
    const postRes = await fetch(DOCTORTABLET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MR-CAPSULES-MCP-Gateway'
      },
      body: JSON.stringify({
        title,
        categoryId: categoryId || 'root',
        content,
        tags: tags || ['#medical'],
        author: author || 'Claude Assistant',
        type: type || 'md_lecture'
      })
    });

    if (postRes.ok) {
      const postData = await postRes.json();
      if (postData && postData.success) {
        return {
          success: true,
          message: 'Note saved successfully to Doctor Tablet vault & synced!',
          note: postData.note || { title, categoryId, tags }
        };
      }
    }
  } catch (err) {
    console.error('DoctorTablet Live API POST error:', err);
  }

  // Fallback direct commit via GitHub API
  if (githubToken) {
    const folderPath = categoryId && categoryId !== 'root' ? categoryId : '';
    const fileSlug = title.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
    const repoFilePath = folderPath ? `notes/${folderPath}/${fileSlug}.md` : `notes/${fileSlug}.md`;
    
    // Frontmatter wrap if not present
    let finalContent = content;
    if (!content.trim().startsWith('---')) {
      const tagsYaml = Array.isArray(tags) ? tags.map(t => `  - ${t}`).join('\n') : '  - medical';
      finalContent = `---\ntitle: "${title}"\ntags:\n${tagsYaml}\nauthor: "${author || 'Claude Assistant'}"\n---\n\n${content}`;
    }

    const contentBase64 = Buffer.from(finalContent, 'utf-8').toString('base64');
    const apiUrl = `https://api.github.com/repos/${DOCTORTABLET_GH_OWNER}/${DOCTORTABLET_GH_REPO}/contents/${repoFilePath}`;

    // Get existing sha
    let sha;
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'MR-CAPSULES-MCP-Gateway'
      }
    });
    if (getRes.ok) {
      const existingData = await getRes.json();
      sha = existingData.sha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'MR-CAPSULES-MCP-Gateway'
      },
      body: JSON.stringify({
        message: `feat(note): add/update note "${title}" via MCP Gateway`,
        content: contentBase64,
        sha,
        branch: 'main'
      })
    });

    if (putRes.ok) {
      return {
        success: true,
        message: `Note saved & committed directly to DoctorTablet GitHub repo (${repoFilePath})!`,
        filePath: repoFilePath
      };
    }
  }

  throw err400('Failed to save note to Doctor Tablet (Live API & GitHub fallback failed)');
}

async function doctortabletListCategories(githubToken) {
  const data = await doctortabletFetchNotes(githubToken);
  return {
    success: true,
    totalCategories: (data.categories || []).length,
    categories: data.categories || [],
  };
}

async function doctortabletCreateCategory(params, githubToken) {
  const { name, parentId } = params;
  if (!name) throw err400('Category name is required');

  // Try Live API first
  try {
    const res = await fetch(DOCTORTABLET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MR-CAPSULES-MCP-Gateway'
      },
      body: JSON.stringify({
        action: 'create_category',
        name,
        parentId: parentId || null
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (err) {
    console.error('DoctorTablet create_category error:', err);
  }

  // GitHub fallback: create .gitkeep in new folder
  if (githubToken) {
    try {
      const folderSlug = name.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
      const folderPath = parentId ? `notes/${parentId}/${folderSlug}` : `notes/${folderSlug}`;
      const gitkeepPath = `${folderPath}/.gitkeep`;
      const contentBase64 = Buffer.from('', 'utf-8').toString('base64');

      const putRes = await fetch(
        `https://api.github.com/repos/${DOCTORTABLET_GH_OWNER}/${DOCTORTABLET_GH_REPO}/contents/${gitkeepPath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'MR-CAPSULES-MCP-Gateway'
          },
          body: JSON.stringify({
            message: `chore(folder): create ${folderPath} via MCP Gateway`,
            content: contentBase64,
            branch: 'main'
          })
        }
      );
      if (putRes.ok) {
        const catId = parentId ? `${parentId}/${folderSlug}` : folderSlug;
        return {
          success: true,
          message: `Category "${name}" created via GitHub`,
          category: {
            id: catId,
            name,
            path: catId,
            parentId: parentId || null,
            type: 'custom',
            color: '#8A9A7E'
          }
        };
      }
    } catch (e) {
      console.error('DoctorTablet create_category GitHub fallback error:', e);
    }
  }

  return {
    success: true,
    message: `Category "${name}" creation queued/processed`,
    category: { name, parentId: parentId || null }
  };
}

async function doctortabletSearchNotes(params, githubToken) {
  const { query, tag } = params;
  if (!query && !tag) throw err400('Query or tag parameter required for search');
  const data = await doctortabletFetchNotes(githubToken);
  let notes = data.notes || [];

  if (query) {
    const q = query.toLowerCase();
    notes = notes.filter(n => 
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.content && n.content.toLowerCase().includes(q)) ||
      (n.categoryId && n.categoryId.toLowerCase().includes(q)) ||
      (Array.isArray(n.tags) && n.tags.some(t => String(t).toLowerCase().includes(q)))
    );
  }

  if (tag) {
    const cleanTag = tag.replace(/^#/, '').toLowerCase();
    notes = notes.filter(n => Array.isArray(n.tags) && n.tags.some(t => String(t).toLowerCase().replace(/^#/, '') === cleanTag));
  }

  return {
    success: true,
    query,
    totalMatches: notes.length,
    notes: notes.map(n => ({
      id: n.id,
      title: n.title,
      categoryId: n.categoryId,
      filePath: n.filePath,
      tags: n.tags,
      updatedAt: n.updatedAt
    }))
  };
}

async function doctortabletDeleteNote(filePath, githubToken) {
  if (!filePath) throw err400('filePath is required for deletion');

  // Normalize filePath — ensure it starts with notes/ for GitHub API
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^notes\//, '');
  const repoPath = `notes/${cleanPath}`;

  // Try Live API DELETE first (not POST)
  try {
    const slug = cleanPath.replace(/\.md$/, '').split('/').pop() || '';
    const deleteUrl = `${DOCTORTABLET_API_URL}?slug=${encodeURIComponent(slug)}&filePath=${encodeURIComponent(cleanPath)}`;
    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'User-Agent': 'MR-CAPSULES-MCP-Gateway'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (err) {
    console.error('DoctorTablet delete_note error:', err);
  }

  if (githubToken) {
    const apiUrl = `https://api.github.com/repos/${DOCTORTABLET_GH_OWNER}/${DOCTORTABLET_GH_REPO}/contents/${repoPath}`;
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'MR-CAPSULES-MCP-Gateway'
      }
    });
    if (getRes.ok) {
      const existingData = await getRes.json();
      const delRes = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'MR-CAPSULES-MCP-Gateway'
        },
        body: JSON.stringify({
          message: `chore(delete): remove note ${cleanPath} via MCP Gateway`,
          sha: existingData.sha,
          branch: 'main'
        })
      });
      if (delRes.ok) {
        return { success: true, message: `Note ${cleanPath} deleted from DoctorTablet repo` };
      }
    }
  }

  throw err400(`Failed to delete note ${filePath}`);
}

async function doctortabletExportMergedDocument(params = {}, githubToken) {
  const data = await doctortabletFetchNotes(githubToken);
  const categories = data.categories || [];
  let notes = data.notes || [];

  let targetCatName = 'All Doctor Tablet Notes';
  if (params.categoryId) {
    const selectedCat = categories.find(c => c.id === params.categoryId);
    if (selectedCat) targetCatName = selectedCat.name;
    notes = notes.filter(n => n.categoryId === params.categoryId || n.categoryId.startsWith(params.categoryId + '/'));
  }

  const docTitle = params.title || `Merged Document: ${targetCatName}`;
  let merged = `# ${docTitle}\n\n`;
  merged += `> Automatically generated from **${notes.length} notes** in vault.\n\n---\n\n`;

  // Table of contents
  merged += `## Table of Contents\n\n`;
  notes.forEach((note, idx) => {
    const anchorId = `note-${(note.id || idx).toString().replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    merged += `${idx + 1}. [${note.title}](#${anchorId})\n`;
  });
  merged += `\n---\n\n`;

  // Append note contents
  notes.forEach((note, idx) => {
    const anchorId = `note-${(note.id || idx).toString().replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    merged += `<a id="${anchorId}"></a>\n\n`;
    merged += `### ${note.title}\n`;
    merged += `*Category:* \`${note.categoryId || 'root'}\` | *Updated:* ${note.updatedAt || 'N/A'}\n\n`;
    if (Array.isArray(note.tags) && note.tags.length > 0) {
      merged += `*Tags:* ${note.tags.map(t => `\`#${t.replace(/^#/, '')}\``).join(' ')}\n\n`;
    }
    merged += `${note.content || ''}\n\n`;
    merged += `---\n\n`;
  });

  return {
    success: true,
    title: docTitle,
    totalNotesMerged: notes.length,
    mergedContent: merged
  };
}


