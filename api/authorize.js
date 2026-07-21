// api/authorize.js
// Real OAuth 2.0 Authorization Endpoint with PKCE and User Authentication

import crypto from 'crypto';

export default async function handler(req, res) {
  const host = req.headers.host || 'mr-capsules.vercel.app';
  const SUPABASE_URL = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const url = new URL(req.url, `https://${host}`);
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state') || '';
  const responseType = url.searchParams.get('response_type') || 'code';
  const clientId = url.searchParams.get('client_id') || 'claude-mcp-client';
  const codeChallenge = url.searchParams.get('code_challenge') || '';
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'S256';

  if (!redirectUri) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authorization Error | Mr. Capsules</title></head>
      <body style="font-family:sans-serif; padding:40px; text-align:center; background:#0f172a; color:#f8fafc;">
        <h2>Missing redirect_uri parameter</h2>
        <p>This endpoint is used for OAuth 2.0 authorization by Claude.ai.</p>
      </body>
      </html>
    `);
  }

  let errorMessage = '';

  // Handle POST submit (User Login / Authentication)
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        const params = new URLSearchParams(body);
        body = Object.fromEntries(params.entries());
      } catch(e) {
        try { body = JSON.parse(body); } catch(err) {}
      }
    }
    body = body || {};
    const email = (body.email || '').trim();
    const password = (body.password || '').trim();

    if (!email || !password) {
      errorMessage = 'Please enter both Email and Password.';
    } else if (SB_SERVICE_KEY) {
      // Authenticate user credentials against Supabase Auth
      try {
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': SB_SERVICE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        if (!authRes.ok) {
          const authErr = await authRes.json();
          errorMessage = authErr.error_description || authErr.msg || 'Invalid email or password.';
        } else {
          const authData = await authRes.json();
          const user = authData.user;

          // Generate single-use authorization code (valid 10 mins)
          const code = `mrc_code_${crypto.randomBytes(24).toString('hex')}`;
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

          // Save code in Supabase oauth_codes
          await fetch(`${SUPABASE_URL}/rest/v1/oauth_codes`, {
            method: 'POST',
            headers: {
              'apikey': SB_SERVICE_KEY,
              'Authorization': `Bearer ${SB_SERVICE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              client_id: clientId,
              user_id: user.id,
              user_email: user.email,
              redirect_uri: redirectUri,
              code_challenge: codeChallenge,
              code_challenge_method: codeChallengeMethod,
              expires_at: expiresAt
            })
          });

          // Redirect back to Claude.ai auth_callback
          const callbackUrl = new URL(redirectUri);
          callbackUrl.searchParams.set('code', code);
          if (state) callbackUrl.searchParams.set('state', state);

          return res.redirect(302, callbackUrl.toString());
        }
      } catch(err) {
        errorMessage = 'Authentication error: ' + err.message;
      }
    } else {
      errorMessage = 'Server configuration error (missing service role key)';
    }
  }

  // Render modern Mr. Capsules User Login Page for OAuth Approval
  const actionUrl = `/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(codeChallengeMethod)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login &amp; Authorize | Mr. Capsules</title>
      <link rel="icon" type="image/svg+xml" href="/logo.svg">
      <style>
        :root {
          --bg: #090d16;
          --card: #131b2e;
          --border: #23314d;
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --danger: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .auth-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 36px 32px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .logo-icon { width: 40px; height: 40px; }
        .plus-icon { color: var(--text-muted); font-size: 18px; }
        .claude-badge {
          background: #d97706;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          padding: 6px 12px;
          border-radius: 6px;
        }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
        p { color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
        .error-banner {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: left;
        }
        .input-group { margin-bottom: 16px; text-align: left; }
        label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        input[type="email"], input[type="password"] {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #0b111e;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        input[type="email"]:focus, input[type="password"]:focus { border-color: var(--accent); }
        .btn-submit {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 8px;
        }
        .btn-submit:hover { background: var(--accent-hover); }
        .footer-note { font-size: 12px; color: var(--text-muted); margin-top: 18px; }
        .footer-note a { color: var(--accent); text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="auth-card">
        <div class="logo-row">
          <img src="/logo.svg" alt="MR-CAPSULES" class="logo-icon">
          <span class="plus-icon">&amp;</span>
          <span class="claude-badge">Claude</span>
        </div>
        <h1>Sign in to Mr. Capsules</h1>
        <p>Authorize Claude to access content and tools with your account credentials.</p>

        ${errorMessage ? `<div class="error-banner">${errorMessage}</div>` : ''}

        <form method="POST" action="${actionUrl}">
          <div class="input-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="user@domain.com" required autofocus autocomplete="email">
          </div>
          <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn-submit">Sign In &amp; Authorize</button>
        </form>
        <div class="footer-note">
          Need an account? <a href="/admin.html" target="_blank">Sign up in Admin Panel</a>
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
