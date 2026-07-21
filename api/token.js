// api/token.js
// OAuth 2.0 Token Endpoint for Claude.ai Custom Connectors

export default async function handler(req, res) {
  // Allow CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      const params = new URLSearchParams(body);
      body = Object.fromEntries(params.entries());
    } catch(e) {
      try { body = JSON.parse(body); } catch(err) {}
    }
  }

  const code = (body && body.code) || '';

  // The authorization code passed back by our /authorize endpoint is the user's API Key (mrc_...)
  if (!code || !code.startsWith('mrc_')) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or missing authorization code (must be a valid mrc_ API key)'
    });
  }

  // Return standard OAuth 2.0 token response
  return res.status(200).json({
    access_token: code,
    token_type: 'Bearer',
    expires_in: 2592000 // 30 days
  });
}
