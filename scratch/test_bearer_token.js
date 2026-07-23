async function testToken() {
  const token = 'mrc_at_7a6da55dbfc8dad4252514b65c8295d45abbbd16043ff0a066e3cc2f0b92c2b9';

  console.log('--- 1. Calling POST /api/mcp with initialize method ---');
  const r1 = await fetch('https://mr-capsules.vercel.app/api/mcp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {} }
    })
  });
  console.log('POST status:', r1.status, await r1.text());
}

testToken().catch(console.error);
