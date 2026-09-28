'use strict';
const path = require('path');
const express = require('express');
require('./db');
const { sessionMiddleware, csrfGuard } = require('./auth');
const { HttpError } = require('./util');
const D = require('./domain');
const seed = require('./seed');

const PUBLIC = path.join(__dirname, '..', 'public');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : process.env.TRUST_PROXY);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"
    ].join('; '));
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.use(express.json({ limit: '200kb' }));
  app.use(sessionMiddleware);
  app.use('/api', csrfGuard);
  app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', require('./routes/public'));
  app.use('/api/account', require('./routes/account').router);
  app.use('/api/admin', require('./routes/admin'));
  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api', (req, res, next) => next(new HttpError(404, 'Not found')));

  // Account and staff console require a session; send visitors to the log-in page.
  app.get(['/app', '/app/'], (req, res) => req.user ? res.sendFile(path.join(PUBLIC, 'app', 'index.html')) : res.redirect('/#login'));
  app.get(['/admin', '/admin/'], (req, res) => req.user && req.user.is_admin ? res.sendFile(path.join(PUBLIC, 'admin', 'index.html')) : res.redirect('/#login-staff'));
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

if (require.main === module) {
  const port = +process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`AfterWorc running on http://localhost:${port}`));
}
module.exports = { createApp };
