// api/authorize.js
// OAuth 2.0 Authorization Endpoint for Claude.ai Custom Connectors

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'mr-capsules.vercel.app'}`);
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  const responseType = url.searchParams.get('response_type');
  const clientId = url.searchParams.get('client_id');
  const queryKey = url.searchParams.get('key');

  // If redirect_uri is missing, show an error page
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

  // If key is provided in query parameter, auto-approve and redirect back
  if (queryKey && queryKey.startsWith('mrc_')) {
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', queryKey);
    if (state) callbackUrl.searchParams.set('state', state);
    return res.redirect(302, callbackUrl.toString());
  }

  // If POST request from the approval form below
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        const params = new URLSearchParams(body);
        body = Object.fromEntries(params.entries());
      } catch(e) {}
    }
    const apiKey = (body && body.apiKey) ? body.apiKey.trim() : '';
    if (apiKey) {
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', apiKey);
      if (state) callbackUrl.searchParams.set('state', state);
      return res.redirect(302, callbackUrl.toString());
    }
  }

  // Render a clean, modern authorization page
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authorize Claude | Mr. Capsules</title>
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
          gap: 16px;
          margin-bottom: 24px;
        }
        .logo-icon { width: 44px; height: 44px; }
        .plus-icon { color: var(--text-muted); font-size: 20px; }
        .claude-badge {
          background: #d97706;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          padding: 8px 14px;
          border-radius: 8px;
        }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        p { color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
        .input-group { margin-bottom: 20px; text-align: left; }
        label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        input[type="text"] {
          width: 100%;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #0b111e;
          color: #fff;
          font-family: monospace;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        input[type="text"]:focus { border-color: var(--accent); }
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
        }
        .btn-submit:hover { background: var(--accent-hover); }
        .footer-note { font-size: 12px; color: var(--text-muted); margin-top: 16px; }
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
        <h1>Authorize Claude Connector</h1>
        <p>Enter your MR-CAPSULES API Key to grant Claude access to tools and content.</p>
        <form method="POST" action="/api/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state || '')}">
          <div class="input-group">
            <label for="apiKey">API Key (mrc_...)</label>
            <input type="text" id="apiKey" name="apiKey" placeholder="mrc_..." required autofocus autocomplete="off">
          </div>
          <button type="submit" class="btn-submit">Authorize &amp; Connect</button>
        </form>
        <div class="footer-note">
          Don't have a key? <a href="/admin.html" target="_blank">Generate one in Admin Panel</a>
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
