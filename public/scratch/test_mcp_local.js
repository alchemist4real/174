import handler from '../api/mcp.js';

async function testLocal() {
  const req = {
    method: 'POST',
    url: '/api/mcp',
    headers: { host: 'mr-capsules.vercel.app', 'content-type': 'application/json' },
    body: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(s) { this.statusCode = s; return this; },
    json(data) { console.log('JSON RESPONSE:', this.statusCode, data); return this; },
    send(data) { console.log('SEND RESPONSE:', this.statusCode, data); return this; },
    end() { console.log('END CALLED'); }
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error('LOCAL HANDLER CRASH:', err);
  }
}

testLocal();
