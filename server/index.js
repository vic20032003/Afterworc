'use strict';
const path = require('path');
const express = require('express');
require('./db');
const { sessionMiddleware, csrfGuard } = require('./auth');
const { HttpError } = require('./util');
const D = require('./domain');
const seed = require('./seed');

const http = require('http');
const PUBLIC = path.join(__dirname, '..', 'public');
const DIST = path.join(__dirname, '..', 'dist');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : process.env.TRUST_PROXY);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    // Camera and microphone are allowed for our own pages only (calls in Messages).
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), display-capture=(self)');
    const host = String(req.headers.host || '').replace(/[^\w.:[\]-]/g, '');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
      "font-src 'self'", "img-src 'self' data: blob:", "media-src 'self' blob:", `connect-src 'self'${host ? ` wss://${host} ws://${host}` : ''}`, "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"
    ].join('; '));
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.use('/api/stripe/webhook', require('./payments').webhook); // raw body, signature-verified; before JSON + CSRF
  app.use(express.json({ limit: '200kb' }));
  app.use(sessionMiddleware);
  app.use('/api', csrfGuard);
  app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', require('./routes/public'));
  app.use('/api/account', require('./routes/account').router);
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/chat', require('./routes/chat'));
  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api', (req, res, next) => next(new HttpError(404, 'Not found')));

  // Account and staff console require a session; send visitors to the log-in page.
  // The account and the staff console are React apps built by Vite into dist/app (npm run build).
  const page = name => (req, res) => {
    const f = path.join(DIST, 'app', name);
    if (!require('fs').existsSync(f)) return res.status(503).type('text').send('The app is not built yet. Run: npm run build');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(f);
  };
  app.get(['/app', '/app/'], (req, res, next) => req.user ? page('index.html')(req, res, next) : res.redirect('/#login'));
  app.get(['/admin', '/admin/'], (req, res, next) => req.user && req.user.is_admin ? page('admin.html')(req, res, next) : res.redirect('/#login-staff'));
  app.use('/app/assets', express.static(path.join(DIST, 'app', 'assets'), { immutable: true, maxAge: '365d', fallthrough: false }));
  app.use(express.static(PUBLIC, { index: 'index.html', extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') err = new HttpError(400, 'Files can be up to 15 MB');
    if (err && err.type === 'entity.parse.failed') err = new HttpError(400, 'Invalid request');
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ ok: false, error: status >= 500 ? 'Something went wrong on our side. Try again.' : err.message, ...(err.extra || {}) });
  });
  return app;
}

// Express 4 doesn't forward async errors: wrap route handlers so rejected promises reach the error handler.
const Layer = require('express/lib/router/layer');
const origHandle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function (req, res, next) {
  try {
    const r = this.handle.length > 3 ? undefined : this.handle(req, res, next);
    if (this.handle.length > 3) return origHandle.call(this, req, res, next);
    if (r && typeof r.catch === 'function') r.catch(next);
  } catch (e) { next(e); }
};

seed.run();
setInterval(() => { try { D.sweepAutoAccept(); } catch (e) { console.error(e); } }, 15 * 60000).unref();

/** HTTP server with the WebSocket channel (/ws) attached. */
function createServer() {
  const server = http.createServer(createApp());
  require('./ws').attach(server);
  return server;
}

if (require.main === module) {
  const port = +process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`AfterWorc running on http://localhost:${port}`));
}
module.exports = { createApp, createServer };
