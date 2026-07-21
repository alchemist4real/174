// api/token.js
// OAuth 2.0 Token Endpoint (RFC 6749 / RFC 7636 PKCE S256) with Refresh Token Rotation

import crypto from 'crypto';

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sanitizeBase64Url(str) {
  if (!str) return '';
  return String(str).trim()
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function verifyPkce(codeVerifier, codeChallenge, method = 'S256') {
  if (!codeChallenge) return true; // Optional if no challenge was sent
  const cleanChallenge = sanitizeBase64Url(codeChallenge);
  const cleanVerifier = String(codeVerifier || '').trim();

  if (!method || method === 'S256') {
    const hash = crypto.createHash('sha256').update(cleanVerifier).digest();
    const computed = base64url(hash);
    return computed === cleanChallenge;
  }
  if (method === 'plain') {
    return cleanVerifier === cleanChallenge;
  }
  return false;
}

export default async function handler(req, res) {
  const SUPABASE_URL = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // RFC 6749 Section 5.1: MUST include Cache-Control: no-store and Pragma: no-cache
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'invalid_request', error_description: 'Method not allowed' });
  }

  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf-8');
  }
  if (typeof body === 'string') {
    try {
      const params = new URLSearchParams(body);
      const parsed = Object.fromEntries(params.entries());
      if (Object.keys(parsed).length > 0) {
        body = parsed;
      } else {
        body = JSON.parse(body);
      }
    } catch(e) {
      try { body = JSON.parse(body); } catch(err) {}
    }
  }

  body = body || {};
  const grantType = body.grant_type;

  if (!grantType) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing grant_type parameter' });
  }

  // ── 1. Authorization Code Grant ──────────────────────────────────────────
  if (grantType === 'authorization_code') {
    const code = body.code;
    const redirectUri = body.redirect_uri;
    const codeVerifier = body.code_verifier || body.code_challenge; // Fallback

    if (!code) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing code parameter' });
    }

    if (!SB_SERVICE_KEY) {
      return res.status(500).json({ error: 'server_error', error_description: 'Service role key not configured' });
    }

    // Fetch code from Supabase oauth_codes
    const codeRes = await fetch(`${SUPABASE_URL}/rest/v1/oauth_codes?code=eq.${encodeURIComponent(code)}&select=*`, {
      headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
    });

    if (!codeRes.ok) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Failed to query authorization code' });
    }

    const rows = await codeRes.json();
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid, expired, or used authorization code' });
    }

    const codeRecord = rows[0];

    // Check expiration
    if (new Date(codeRecord.expires_at) < new Date()) {
      // Delete expired code
      await fetch(`${SUPABASE_URL}/rest/v1/oauth_codes?code=eq.${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired' });
    }

    // Verify PKCE BEFORE deleting code
    if (codeRecord.code_challenge) {
      if (!codeVerifier) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Missing code_verifier for PKCE' });
      }
      const pkceValid = verifyPkce(codeVerifier, codeRecord.code_challenge, codeRecord.code_challenge_method);
      if (!pkceValid) {
        console.error(`[OAuth PKCE Failure] timestamp="${new Date().toISOString()}" code="${code}" challenge="${codeRecord.code_challenge}" verifier="${codeVerifier}"`);
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      }
    }

    // Delete single-use authorization code ONLY after successful PKCE validation
    await fetch(`${SUPABASE_URL}/rest/v1/oauth_codes?code=eq.${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
    });

    // Issue Access Token and Refresh Token
    const accessToken = `mrc_at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `mrc_rt_${crypto.randomBytes(32).toString('hex')}`;
    const expiresIn = 3600; // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const targetResource = body.resource || codeRecord.resource || `https://${req.headers.host || 'mr-capsules.vercel.app'}/api/mcp`;
    let tokenUserId = String(codeRecord.user_id || codeRecord.user_email);
    if (!tokenUserId || !tokenUserId.includes('-')) {
      tokenUserId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + crypto.randomBytes(6).toString('hex');
    }

    // Store token pair in Supabase oauth_tokens
    const saveTokenRes = await fetch(`${SUPABASE_URL}/rest/v1/oauth_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        client_id: codeRecord.client_id,
        user_id: tokenUserId,
        user_email: codeRecord.user_email,
        resource: targetResource,
        expires_at: expiresAt,
        revoked: false
      })
    });

    if (!saveTokenRes.ok) {
      const errText = await saveTokenRes.text();
      console.error(`[OAuth Token Save Error] status=${saveTokenRes.status} body=${errText}`);
      return res.status(500).json({ error: 'server_error', error_description: 'Failed to persist access token: ' + errText });
    }

    console.log(`[OAuth Token Issued] timestamp="${new Date().toISOString()}" iss="https://${req.headers.host || 'mr-capsules.vercel.app'}" aud="${targetResource}" sub="${codeRecord.user_email}" client_id="${codeRecord.client_id}" access_token="${accessToken.slice(0, 15)}..."`);

    return res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: 'mcp'
    });
  }

  // ── 2. Refresh Token Grant (Token Rotation) ──────────────────────────────
  if (grantType === 'refresh_token') {
    const refreshTokenInput = body.refresh_token;
    if (!refreshTokenInput) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing refresh_token parameter' });
    }

    if (!SB_SERVICE_KEY) {
      return res.status(500).json({ error: 'server_error', error_description: 'Service role key not configured' });
    }

    // Fetch existing token record
    const tokenRes = await fetch(`${SUPABASE_URL}/rest/v1/oauth_tokens?refresh_token=eq.${encodeURIComponent(refreshTokenInput)}&revoked=eq.false&select=*`, {
      headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
    });

    if (!tokenRes.ok) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Failed to query refresh token' });
    }

    const rows = await tokenRes.json();
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid, revoked, or expired refresh token' });
    }

    const oldToken = rows[0];

    // Revoke old refresh token (Rotation enforcement)
    await fetch(`${SUPABASE_URL}/rest/v1/oauth_tokens?access_token=eq.${encodeURIComponent(oldToken.access_token)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ revoked: true })
    });

    // Issue new token pair
    const newAccessToken = `mrc_at_${crypto.randomBytes(32).toString('hex')}`;
    const newRefreshToken = `mrc_rt_${crypto.randomBytes(32).toString('hex')}`;
    const expiresIn = 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await fetch(`${SUPABASE_URL}/rest/v1/oauth_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        client_id: oldToken.client_id,
        user_id: oldToken.user_id,
        user_email: oldToken.user_email,
        resource: oldToken.resource,
        expires_at: expiresAt,
        revoked: false
      })
    });

    return res.status(200).json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
      scope: 'mcp'
    });
  }

  return res.status(400).json({ error: 'unsupported_grant_type', error_description: `Unsupported grant_type: ${grantType}` });
}
