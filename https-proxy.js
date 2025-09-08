const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:3000',
  ws: true,
  changeOrigin: true
});

// Handle proxy errors
proxy.on('error', function(err, req, res) {
  console.error('Proxy error:', err);
  if (res.writeHead) {
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end('Proxy error: ' + err.message);
  }
});

// Load SSL certificates
const certsDir = path.join(__dirname, 'certificates');
const httpsOptions = {
  key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(certsDir, 'localhost.pem')),
};

// Create HTTPS server
const server = https.createServer(httpsOptions, function(req, res) {
  // Forward all requests to the Next.js dev server
  proxy.web(req, res);
});

// Handle WebSocket connections
server.on('upgrade', function(req, socket, head) {
  proxy.ws(req, socket, head);
});

const PORT = 443;
const HOSTNAME = '0.0.0.0';

server.listen(PORT, HOSTNAME, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║     🏦 Bank SulutGo HTTPS Proxy Server Started        ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`🔒 HTTPS Proxy Server ready on https://${HOSTNAME}:${PORT}`);
  console.log(`🔀 Forwarding to: http://localhost:3000`);
  console.log(`🌐 Access at: https://hd.bsg.id`);
});