// api/register.js
// Dynamic Client Registration Endpoint (RFC 7591) for Claude.ai Custom Connectors

import crypto from 'crypto';

export default async function handler(req, res) {
  const host = req.headers.host || 'mr-capsules.vercel.app';
  const SUPABASE_URL = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'invalid_request', error_description: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid JSON body' });
    }
  }

  body = body || {};
  const clientName = body.client_name || 'Claude MCP Client';
  const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0
    ? body.redirect_uris
    : ['https://claude.ai/api/mcp/auth_callback'];

  // Generate unique client_id and client_secret
  const clientId = `client_mrc_${crypto.randomBytes(16).toString('hex')}`;
  const clientSecret = `secret_mrc_${crypto.randomBytes(24).toString('hex')}`;
  const issuedAt = Math.floor(Date.now() / 1000);

  // Store client in Supabase oauth_clients table if service key is present
  if (SB_SERVICE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/oauth_clients`, {
        method: 'POST',
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          client_name: clientName,
          redirect_uris: redirectUris,
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code']
        })
      });
    } catch(err) {
      // Non-fatal if table creation/RPC pending, proceed with returned credentials
    }
  }

  const responsePayload = {
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: issuedAt,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none'
  };

  return res.status(201).json(responsePayload);
}
