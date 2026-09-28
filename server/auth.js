'use strict';
const { db } = require('./db');
const { now, DAY, HttpError, randToken, sha256, j } = require('./util');

const COOKIE = 'aw_sid';
const SESSION_TTL = 30 * DAY;
const SECURE = process.env.COOKIE_SECURE === '1' || (process.env.BASE_URL || '').startsWith('https://');

function parseCookies(h) {
  const out = {};
  for (const part of String(h || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    const k = part.slice(0, i).trim(); if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore */ }
  }
  return out;
}

const q = {
  insert: db.prepare('INSERT INTO sessions (id, user_id, created_at, last_seen, expires_at, ua, ip) VALUES (?,?,?,?,?,?,?)'),
  get: db.prepare('SELECT s.id AS sid, s.expires_at, s.last_seen, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?'),
  touch: db.prepare('UPDATE sessions SET last_seen=?, expires_at=? WHERE id=?'),
  del: db.prepare('DELETE FROM sessions WHERE id=?'),
  purge: db.prepare('DELETE FROM sessions WHERE expires_at<?')
};
setInterval(() => q.purge.run(now()), 3600000).unref();

/** Starts a session. Browsers get an HttpOnly cookie; native apps (bearer: true) get the token in the response instead. */
function createSession(res, req, userId, { bearer = false } = {}) {
  const token = randToken(32);
  const t = now();
  q.insert.run(sha256(token), userId, t, t, t + SESSION_TTL, String(req.headers['user-agent'] || '').slice(0, 200), req.ip);
  if (!bearer) setCookie(res, token, SESSION_TTL);
  return bearer ? token : sha256(token);
}
function setCookie(res, token, maxAge) {
  res.append('Set-Cookie', `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAge / 1000)}${SECURE ? '; Secure' : ''}`);
}
function destroySession(req, res) {
  if (req.sid) q.del.run(req.sid);
  setCookie(res, '', 0);
}

/** Resolves a raw session token to { sid, user } (or null). Shared by HTTP and WebSocket. */
function userFromToken(token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  const sid = sha256(token);
  const row = q.get.get(sid);
  if (row && row.expires_at > now() && !row.closed_at && row.status !== 'blocked') {
    if (now() - row.last_seen > 60000) q.touch.run(now(), now() + SESSION_TTL, sid);
    return { sid, user: row };
  }
  if (row) q.del.run(sid);
  return null;
}
const bearerOf = req => { const m = /^Bearer\s+([A-Za-z0-9]{16,200})$/.exec(String(req.headers.authorization || '')); return m ? m[1] : null; };
const cookieToken = req => parseCookies(req.headers.cookie)[COOKIE];

/** Attaches req.user (or null) from the session cookie, or from an Authorization: Bearer token (mobile apps). */
function sessionMiddleware(req, res, next) {
  req.user = null;
  const bearer = bearerOf(req);
  const s = userFromToken(bearer || cookieToken(req));
  if (s) { req.sid = s.sid; req.user = s.user; req.bearer = !!bearer; }
  next();
}

/** Blocks cross-site state-changing requests: JSON bodies + same-origin header. */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Bearer tokens are never sent automatically by a browser, so they cannot be forged cross-site.
  if (bearerOf(req) && !req.headers.cookie) return next();
  if (req.get('X-Requested-With') !== 'afterworc') return next(new HttpError(403, 'Request blocked'));
  const origin = req.get('Origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('Host')) return next(new HttpError(403, 'Request blocked')); }
    catch { return next(new HttpError(403, 'Request blocked')); }
  }
  next();
}

const requireUser = (req, res, next) => req.user ? next() : next(new HttpError(401, 'Log in to continue'));
const requireAdmin = (req, res, next) => req.user && req.user.is_admin ? next() : next(new HttpError(req.user ? 403 : 401, 'Staff only'));

/* ---------- one-time tokens (verify email, reset password, change email, org invites) ---------- */
const tq = {
  ins: db.prepare('INSERT INTO tokens (hash, kind, user_id, data, expires_at) VALUES (?,?,?,?,?)'),
  get: db.prepare('SELECT * FROM tokens WHERE hash=? AND kind=?'),
  use: db.prepare('UPDATE tokens SET used_at=? WHERE hash=?'),
  clear: db.prepare('DELETE FROM tokens WHERE user_id=? AND kind=? AND used_at IS NULL')
};
function issueToken(kind, userId, ttl, data) {
  const t = randToken(24);
  tq.clear.run(userId, kind);
  tq.ins.run(sha256(t), kind, userId, data ? JSON.stringify(data) : null, now() + ttl);
  return t;
}
function consumeToken(kind, token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const row = tq.get.get(sha256(token), kind);
  if (!row || row.used_at || row.expires_at < now()) return null;
  tq.use.run(now(), row.hash);
  return { userId: row.user_id, data: j(row.data, null) };
}

function audit(req, action, detail) {
  db.prepare('INSERT INTO audit (user_id, action, detail, ip, created_at) VALUES (?,?,?,?,?)')
    .run(req.user ? req.user.id : null, action, detail ? String(detail).slice(0, 500) : null, req.ip, now());
}

module.exports = { userFromToken, cookieToken, bearerOf, sessionMiddleware, csrfGuard, requireUser, requireAdmin, createSession, destroySession, issueToken, consumeToken, audit };
