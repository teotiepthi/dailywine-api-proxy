const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.method === 'GET') { res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true})); return; }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch(e) { res.writeHead(400); res.end(JSON.stringify({error:'Invalid JSON'})); return; }
    
    const postData = JSON.stringify({
      model: parsed.model || 'claude-sonnet-4-6',
      max_tokens: parsed.max_tokens || 1500,
      messages: parsed.messages || []
    });
    
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
        res.end(data);
      });
    });
    proxyReq.on('error', e => { res.writeHead(500); res.end(JSON.stringify({error:{message:e.message}})); });
    proxyReq.write(postData);
    proxyReq.end();
  });
});

server.listen(PORT, () => console.log('Proxy running on port ' + PORT));