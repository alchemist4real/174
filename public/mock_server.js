import http from 'http';
import handler from './api/contributions.js';

const server = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    req.body = body ? JSON.parse(body) : {};
    
    // Mock res object
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    try {
      await handler(req, res);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
});
server.listen(3000, () => console.log('Listening on 3000'));
