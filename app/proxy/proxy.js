const express = require('express');
const httpProxy = require('http-proxy');
const path = require('path');

const app = express();
const PORT = process.env.PROXY_PORT || 80;
const FRONTEND_TARGET = 'http://localhost:5173';
const BACKEND_TARGET = 'http://localhost:8080';

// Create proxies
const frontendProxy = httpProxy.createProxyServer({
  target: FRONTEND_TARGET,
  ws: true,
  changeOrigin: true,
  logLevel: 'warn',
});

const backendProxy = httpProxy.createProxyServer({
  target: BACKEND_TARGET,
  changeOrigin: true,
  logLevel: 'warn',
  // Rewrite path: remove /owtracker prefix
  pathRewrite: {
    '^/owtracker/api': '/api',
  },
});

// Error handling
frontendProxy.on('error', (err, req, res) => {
  console.error('❌ Frontend proxy error:', err.message);
  res.status(502).json({ error: 'Frontend service unavailable', details: err.message });
});

backendProxy.on('error', (err, req, res) => {
  console.error('❌ Backend proxy error:', err.message);
  res.status(502).json({ error: 'Backend service unavailable', details: err.message });
});

// IMPORTANT: API routes MUST come first (more specific routes first)
// API requests go to backend
app.use('/owtracker/api', (req, res) => {
  console.log(`[PROXY] API: ${req.method} ${req.path}`);
  backendProxy.web(req, res);
});

// WebSocket upgrade for HMR
const server = require('http').createServer(app);

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/owtracker/@vite') || req.url.startsWith('/owtracker/__vite')) {
    console.log(`[PROXY] WS: ${req.url}`);
    frontendProxy.ws(req, socket, head);
  }
});

// Frontend requests go to Vite dev server
app.use('/owtracker', (req, res) => {
  console.log(`[PROXY] Frontend: ${req.method} ${req.path}`);
  frontendProxy.web(req, res);
});

// Root redirects to /owtracker
app.get('/', (req, res) => {
  res.redirect('/owtracker');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    frontend: FRONTEND_TARGET,
    backend: BACKEND_TARGET,
    timestamp: new Date().toISOString(),
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ OW Tracker Reverse Proxy running on http://0.0.0.0:${PORT}`);
  console.log(`\n📍 Access URLs:`);
  console.log(`   Local:     http://localhost${PORT === 80 ? '' : ':' + PORT}/owtracker`);
  console.log(`   Network:   http://<your-ip>${PORT === 80 ? '' : ':' + PORT}/owtracker`);
  console.log(`\n🔌 Routes:`);
  console.log(`   /owtracker        → ${FRONTEND_TARGET}`);
  console.log(`   /owtracker/api    → ${BACKEND_TARGET} (with path rewrite)`);
  console.log(`\n✨ Ready to accept requests!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down proxy...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down proxy...');
  server.close();
  process.exit(0);
});
