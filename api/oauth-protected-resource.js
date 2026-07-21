// api/oauth-protected-resource.js
// OAuth 2.0 Protected Resource Metadata (RFC 9207 / MCP)

export default async function handler(req, res) {
  const host = req.headers.host || 'mr-capsules.vercel.app';
  const origin = `https://${host}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const metadata = {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin]
  };

  return res.status(200).json(metadata);
}
