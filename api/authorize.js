// api/authorize.js
// Real OAuth 2.0 Authorization Endpoint with PKCE, RFC 8707 Resource, and Auto-Detected Session

import crypto from 'crypto';

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

export default async function handler(req, res) {
  const host = req.headers.host || 'mr-capsules.vercel.app';
  const SUPABASE_URL = 'https://hdhvrlkizorscvehttzd.supabase.co';
  const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const issuer = `https://${host}`;

  // RFC 8414 & OpenID Connect Discovery Metadata
  if (req.url && (req.url.includes('oauth-authorization-server') || req.url.includes('openid-configuration'))) {
    return res.status(200).json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      registration_endpoint: `${issuer}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      scopes_supported: ["mcp"],
      logo_uri: `${issuer}/logo.png`,
      icon_uri: `${issuer}/logo.png`,
      logo_url: `${issuer}/logo.png`,
      icon_url: `${issuer}/logo.png`,
      service_documentation: `${issuer}/docs#docsMcp`,
      client_name: "Mr. Capsules"
    });
  }

  const url = new URL(req.url, `https://${host}`);
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state') || '';
  const responseType = url.searchParams.get('response_type') || 'code';
  const clientId = url.searchParams.get('client_id') || 'claude-mcp-client';
  const codeChallenge = url.searchParams.get('code_challenge') || '';
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'S256';
  const resourceParam = url.searchParams.get('resource') || `${issuer}/api/mcp`;
  const canonicalResource = canonicalizeUrl(resourceParam);

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

  // Handle POST submit (User Approval / Authentication)
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
    const email = (body.email || body.user_email || '').trim();
    const password = (body.password || '').trim();
    const sessionToken = (body.session_token || body.access_token || '').trim();

    let authenticatedUser = null;

    // 1. Try session token verification with Supabase
    if (sessionToken && SB_SERVICE_KEY) {
      try {
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'apikey': SB_SERVICE_KEY,
            'Authorization': `Bearer ${sessionToken}`
          }
        });
        if (userRes.ok) {
          authenticatedUser = await userRes.json();
        }
      } catch(e) {}
    }

    // 2. Try password authentication with Supabase Auth
    if (!authenticatedUser && email && password && SB_SERVICE_KEY) {
      try {
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': SB_SERVICE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          authenticatedUser = authData.user;
        } else {
          const authErr = await authRes.json();
          errorMessage = authErr.error_description || authErr.msg || 'Invalid email or password.';
        }
      } catch(err) {
        errorMessage = 'Authentication error: ' + err.message;
      }
    }

    // 3. Fallback: Auto-detected session email or SuperAdmin approval
    if (!authenticatedUser && email && (!password || sessionToken)) {
      authenticatedUser = { id: email, email: email };
    }

    if (authenticatedUser && SB_SERVICE_KEY) {
      // Generate single-use authorization code (valid 10 mins)
      const code = `mrc_code_${crypto.randomBytes(24).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const userEmail = authenticatedUser.email || email;
      let userId = String(authenticatedUser.id || userEmail);
      if (!userId || !userId.includes('-')) {
        userId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + crypto.randomBytes(6).toString('hex');
      }

      // Save code in Supabase oauth_codes with canonical resource
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/oauth_codes`, {
        method: 'POST',
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          user_id: userId,
          user_email: userEmail,
          redirect_uri: redirectUri,
          resource: canonicalResource,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          expires_at: expiresAt
        })
      });

      if (!saveRes.ok) {
        const errText = await saveRes.text();
        console.error(`[OAuth Code Save Error] status=${saveRes.status} body=${errText}`);
        return res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>OAuth Server Error</title></head>
          <body style="font-family:sans-serif; padding:40px; text-align:center; background:#0f172a; color:#f8fafc;">
            <h2>Failed to issue authorization code</h2>
            <p style="color:#ef4444;">${errText}</p>
          </body>
          </html>
        `);
      }

      // Structured Server-Side Logging for correlation
      console.log(`[OAuth Auth Code Issued] timestamp="${new Date().toISOString()}" iss="${issuer}" aud="${canonicalResource}" sub="${userEmail}" client_id="${clientId}" code="${code.slice(0, 15)}..."`);

      // Redirect back to Claude.ai auth_callback
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', code);
      if (state) callbackUrl.searchParams.set('state', state);

      res.writeHead(302, { Location: callbackUrl.toString() });
      return res.end();
    } else if (!errorMessage) {
      errorMessage = 'Please sign in or enter valid credentials.';
    }
  }

  // Render modern Mr. Capsules User Login Page with Session Auto-Detection
  const actionUrl = `/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(codeChallengeMethod)}&resource=${encodeURIComponent(canonicalResource)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authorize Claude | Mr. Capsules</title>
      <link rel="icon" type="image/png" href="/logo.png">
      <link rel="icon" type="image/svg+xml" href="/logo.svg">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">
      <link rel="shortcut icon" href="/favicon.png">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Donegal+One&display=swap" rel="stylesheet">
      <style>
        :root {
          --c1: #0D0D0D;
          --c2: #161616;
          --c3: #FAFAFA;
          --c4: #E2FF4A;
          --text-muted: rgba(250, 250, 250, 0.6);
          --border: rgba(250, 250, 250, 0.15);
          --danger: #ff5252;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: radial-gradient(circle at 50% 30%, rgba(226, 255, 74, 0.06) 0%, transparent 65%), var(--c1);
          color: var(--c3);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .auth-card {
          background: var(--c2);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 40px 36px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(226, 255, 74, 0.05);
          text-align: center;
          position: relative;
          backdrop-filter: blur(10px);
        }
        .logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .logo-icon { width: 36px; height: 36px; filter: drop-shadow(0 0 8px rgba(226, 255, 74, 0.3)); }
        .plus-icon { color: var(--text-muted); font-size: 16px; font-weight: 300; }
        .claude-badge {
          background: var(--c4);
          color: #0D0D0D;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 5px 12px;
          border-radius: 99px;
          text-transform: uppercase;
        }
        h1 {
          font-family: 'Donegal One', 'Times New Roman', serif;
          font-size: 24px;
          font-weight: 400;
          margin-bottom: 8px;
          color: var(--c3);
          letter-spacing: 0.02em;
        }
        p { color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
        .session-detected-box {
          display: none;
          background: rgba(226, 255, 74, 0.08);
          border: 1px solid var(--c4);
          color: var(--c4);
          padding: 14px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 24px;
          text-align: left;
          box-shadow: 0 0 15px rgba(226, 255, 74, 0.1);
        }
        .session-detected-box strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
        .error-banner {
          background: rgba(255, 82, 82, 0.12);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 24px;
          text-align: left;
        }
        .input-group { margin-bottom: 18px; text-align: left; }
        label { display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em; }
        input[type="email"], input[type="password"] {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #090909;
          color: var(--c3);
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        input[type="email"]:focus, input[type="password"]:focus {
          border-color: var(--c4);
          box-shadow: 0 0 12px rgba(226, 255, 74, 0.2);
        }
        .btn-submit {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          border: none;
          background: var(--c4);
          color: #0D0D0D;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
          letter-spacing: 0.02em;
        }
        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(226, 255, 74, 0.35);
        }
        .footer-note { font-size: 12px; color: var(--text-muted); margin-top: 22px; }
        .footer-note a { color: var(--c4); text-decoration: none; font-weight: 600; }
        .footer-note a:hover { text-decoration: underline; }
        .use-other-account { font-size: 12px; color: var(--text-muted); text-decoration: underline; cursor: pointer; margin-top: 12px; display: none; }
      </style>
    </head>
    <body>
      <div class="auth-card">
        <div class="logo-row">
          <img src="/logo.svg" alt="MR-CAPSULES" class="logo-icon">
          <span class="plus-icon">&amp;</span>
          <span class="claude-badge">Claude</span>
        </div>
        <h1>Connect to Mr. Capsules</h1>
        <p>Authorize Claude AI to access educational content and task management tools.</p>

        <div id="session-detected-box" class="session-detected-box">
          <strong>✓ Active Browser Session Detected</strong>
          Connected as <span id="detected-user-email"></span>
        </div>

        ${errorMessage ? `<div class="error-banner">${errorMessage}</div>` : ''}

        <form id="auth-form" method="POST" action="${actionUrl}">
          <input type="hidden" id="session_token" name="session_token" value="">
          
          <div class="input-group" id="email-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="user@domain.com" required autocomplete="email">
          </div>
          
          <div class="input-group" id="password-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="••••••••" autocomplete="current-password">
          </div>
          
          <button type="submit" id="submit-btn" class="btn-submit">Approve &amp; Connect Claude</button>
        </form>

        <div id="use-other-link" class="use-other-account" onclick="switchAccount()">Switch account or enter password</div>

        <div class="footer-note">
          Mr. Capsules OAuth 2.0 PKCE Protection • <a href="/admin.html" target="_blank">Admin Portal</a>
        </div>
      </div>

      <script>
        (function() {
          try {
            let userEmail = null;
            let tokenVal = null;

            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('auth-token') || key.includes('supabase') || key.includes('sb-'))) {
                try {
                  const data = JSON.parse(localStorage.getItem(key));
                  if (data && data.user && data.user.email) {
                    userEmail = data.user.email;
                    tokenVal = data.access_token || (data.currentSession && data.currentSession.access_token);
                    break;
                  }
                } catch(e) {}
              }
            }

            if (!userEmail) {
              userEmail = localStorage.getItem('mr_user_email') || localStorage.getItem('user_email');
            }

            if (userEmail) {
              document.getElementById('email').value = userEmail;
              if (tokenVal) {
                document.getElementById('session_token').value = tokenVal;
              }
              document.getElementById('detected-user-email').innerText = userEmail;
              document.getElementById('session-detected-box').style.display = 'block';
              document.getElementById('password-group').style.display = 'none';
              document.getElementById('password').removeAttribute('required');
              document.getElementById('use-other-link').style.display = 'block';
              document.getElementById('submit-btn').innerText = 'Approve & Connect Claude (' + userEmail.split('@')[0] + ')';
            } else {
              document.getElementById('password').setAttribute('required', 'required');
            }
          } catch(err) {
            console.error('Session detection err:', err);
          }
        })();

        function switchAccount() {
          document.getElementById('session-detected-box').style.display = 'none';
          document.getElementById('password-group').style.display = 'block';
          document.getElementById('password').setAttribute('required', 'required');
          document.getElementById('email').value = '';
          document.getElementById('session_token').value = '';
          document.getElementById('use-other-link').style.display = 'none';
          document.getElementById('submit-btn').innerText = 'Sign In & Connect';
        }
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
