async function testFullFlow() {
  const baseUrl = 'https://mr-capsules.vercel.app';
  console.log('=== 1. Testing OpenID Configuration ===');
  const rOidc = await fetch(`${baseUrl}/.well-known/openid-configuration`);
  console.log('OIDC:', rOidc.status, await rOidc.text());

  console.log('\n=== 2. Testing Protected Resource Metadata ===');
  const rProt = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
  console.log('Protected Resource:', rProt.status, await rProt.text());

  console.log('\n=== 3. Testing POST /api/mcp initialize without Auth ===');
  const rInitNoAuth = await fetch(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {} }
    })
  });
  console.log('Init No Auth:', rInitNoAuth.status, await rInitNoAuth.text());

  console.log('\n=== 4. Testing POST /api/mcp initialize WITH Bearer Auth ===');
  const token = 'mrc_at_7a6da55dbfc8dad4252514b65c8295d45abbbd16043ff0a066e3cc2f0b92c2b9';
  const rInitAuth = await fetch(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {} }
    })
  });
  console.log('Init Auth:', rInitAuth.status, await rInitAuth.text());

  console.log('\n=== 5. Testing POST /api/mcp notifications/initialized ===');
  const rNotif = await fetch(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    })
  });
  console.log('Notifications/Initialized:', rNotif.status, await rNotif.text());

  console.log('\n=== 6. Testing POST /api/mcp tools/list ===');
  const rTools = await fetch(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
      params: {}
    })
  });
  console.log('Tools List:', rTools.status, await rTools.text());

  console.log('\n=== 7. Testing GET /api/mcp ===');
  const rGet = await fetch(`${baseUrl}/api/mcp`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream'
    }
  });
  console.log('GET /api/mcp Status:', rGet.status, rGet.headers.get('content-type'), await rGet.text());
}

testFullFlow().catch(console.error);
