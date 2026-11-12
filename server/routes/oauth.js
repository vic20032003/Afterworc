'use strict';
/* Sign up and log in with Google, Facebook, Apple or GitHub.
   Mounted before the CSRF guard because Apple returns with a cross-site POST; the JSON endpoints below apply the guard themselves. */
const express = require('express');
const D = require('../domain');
const U = require('../util');
const mail = require('../mail');
const O = require('../oauth');
const { createSession, issueToken, consumeToken, peekToken, audit, csrfGuard, parseCookies, SECURE } = require('../auth');
const { one, run } = D;
const { now, HOUR, bad, str } = U;

const router = express.Router();
router.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

const STATE_COOKIE = 'aw_oauth';   // ties the provider's answer to the browser that started it
const PENDING_COOKIE = 'aw_oauthp'; // a sign-up waiting for the Terms, or a log-in waiting for the 2FA code
const STATE_TTL = 10 * 60000, PENDING_TTL = 30 * 60000;

function cookie(res, name, value, maxAge, crossSite) {
  // Apple posts back from appleid.apple.com, so the state cookie must survive a cross-site POST (SameSite=None needs Secure).
  const same = crossSite && SECURE ? 'None' : 'Lax';
  res.append('Set-Cookie', `${name}=${value ? encodeURIComponent(value) : ''}; Path=/api/auth/oauth; HttpOnly; SameSite=${same}; Max-Age=${Math.floor(maxAge / 1000)}${SECURE ? '; Secure' : ''}`);
}
const fail = (res, why, intent) => res.redirect(`/#${intent === 'register' ? 'register' : 'login'}-oauth${why}`);

function landing(u, staff) {
  if (staff && u.is_admin) return '/admin';
  const ctx = U.j(u.prefs, {}).ctx;
  return `/app#/${u.role_pref}/${ctx && u.role_pref === 'hire' ? 'pp/' + encodeURIComponent(ctx) : 'home'}`;
}

function linkIdentity(userId, provider, p) {
  run('INSERT OR IGNORE INTO user_identities (provider, subject, user_id, email, created_at, last_used_at) VALUES (?,?,?,?,?,?)', provider, p.sub, userId, p.email || null, now(), now());
}

function createUser(provider, p, { role, news, ctx }) {
  role = role === 'work' ? 'work' : 'hire';
  const email = U.email(p.email);
  const name = str(p.name, { max: 80 }) || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  // No password yet (empty hash never matches). "Forgot your password?" lets the person add one later.
  const id = run('INSERT INTO users (email, pass_hash, name, role_pref, email_verified, news_optin, terms_accepted_at, prefs, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    email, '', name, role, 1, news ? 1 : 0, now(), JSON.stringify({ email: { news: !!news }, ctx: ctx || undefined }), now()).lastInsertRowid;
  linkIdentity(id, provider, p);
  D.ensureUserSetup(id);
  if (role === 'work') D.mySpecialist(id, true);
  D.notify(id, role, 'Welcome to AfterWorc', role === 'hire' ? 'Post your first brief: a person reads it and sends up to 3 checked matches within 48 hours' : 'Build your profile, then book your interview to get checked', role === 'hire' ? 'newbrief' : 'profile');
  mail.toStaff('New sign-up', `${email} signed up with ${O.PROVIDERS[provider].name} (${role === 'hire' ? 'hiring' : 'working'}).`);
  return D.userById(id);
}

/** Logs the person in, or parks the log-in until the authenticator code is given. Returns where to go next. */
function finishLogin(req, res, u, provider, staff) {
  if (u.totp_secret) {
    cookie(res, PENDING_COOKIE, issueToken('oauth_2fa', u.id, PENDING_TTL, { provider, staff: !!staff }), PENDING_TTL);
    return '/#login-oauth2fa';
  }
  req.user = u;
  createSession(res, req, u.id);
  audit(req, 'login', 'via ' + provider);
  return landing(u, staff);
}

/* ---------- which buttons to show ---------- */
router.get('/providers', (req, res) => {
  const all = O.list();
  // Outside production the buttons for providers without keys still show, so the page can be designed and tested.
  res.json({ providers: process.env.NODE_ENV === 'production' ? all.filter(p => p.enabled) : all });
});

/* ---------- 1. send the person to the provider ---------- */
router.get('/:provider/start', (req, res) => {
  const id = req.params.provider, P = O.PROVIDERS[id];
  const q = req.query;
  const intent = q.intent === 'register' ? 'register' : 'login';
  if (!P) return fail(res, 'fail', intent);
  if (!P.configured()) return fail(res, 'off', intent);
  U.rateLimit('oauth:' + req.ip, 30, HOUR);
  const { verifier, challenge } = O.pkce();
  const nonce = U.randToken(16);
  const data = {
    provider: id, intent, verifier, nonce,
    role: q.role === 'work' ? 'work' : 'hire', terms: q.terms === '1', news: q.news === '1',
    ctx: typeof q.ctx === 'string' ? q.ctx.slice(0, 40) : '', staff: q.staff === '1'
  };
  const state = issueToken('oauth_state', null, STATE_TTL, data);
  cookie(res, STATE_COOKIE, state, STATE_TTL, true);
  res.redirect(P.authUrl({ state, challenge, nonce }));
});

/* ---------- 2. the provider sends the person back ---------- */
async function callback(req, res) {
  const id = req.params.provider, P = O.PROVIDERS[id];
  const q = req.method === 'POST' ? (req.body || {}) : req.query;
  const state = String(q.state || '');
  const saved = parseCookies(req.headers.cookie)[STATE_COOKIE];
  cookie(res, STATE_COOKIE, '', 0, true);
  if (!P || !state || state !== saved) return fail(res, 'expired');
  const t = consumeToken('oauth_state', state);
  if (!t || !t.data || t.data.provider !== id) return fail(res, 'expired');
  const s = t.data;
  if (q.error) return fail(res, 'cancel', s.intent); // the person said no on the provider's page
  if (!q.code || typeof q.code !== 'string') return fail(res, 'fail', s.intent);

  let p;
  try { p = await P.profile(q.code, { verifier: s.verifier, nonce: s.nonce, user: q.user }); }
  catch (e) { console.error(`[oauth] ${id}:`, e.message); return fail(res, 'fail', s.intent); }
  if (!p || !p.sub) return fail(res, 'fail', s.intent);

  // Known identity: log in.
  const ident = one('SELECT * FROM user_identities WHERE provider=? AND subject=?', id, p.sub);
  if (ident) {
    const u = D.userById(ident.user_id);
    if (!u || u.closed_at) return fail(res, 'closed', s.intent);
    run('UPDATE user_identities SET last_used_at=? WHERE provider=? AND subject=?', now(), id, p.sub);
    return res.redirect(finishLogin(req, res, u, id, s.staff));
  }

  let email;
  try { email = U.email(p.email); } catch { return fail(res, 'noemail', s.intent); }
  p.email = email;

  // Same e-mail as an existing account: join them only if the provider vouches for the address.
  const existing = one('SELECT * FROM users WHERE email=?', email);
  if (existing) {
    if (existing.closed_at) return fail(res, 'closed', s.intent);
    if (!p.emailVerified) return fail(res, 'exists', s.intent);
    linkIdentity(existing.id, id, p);
    if (!existing.email_verified) run('UPDATE users SET email_verified=1 WHERE id=?', existing.id);
    mail.send(existing.email, `${P.name} sign-in added to your AfterWorc account`, `You can now log in to AfterWorc with ${P.name}.\n\nIf this wasn't you, change your password and contact info@afterworc.com right away.`);
    return res.redirect(finishLogin(req, res, D.userById(existing.id), id, s.staff));
  }

  // New person. Terms already accepted on the sign-up page: create the account now.
  if (s.intent === 'register' && s.terms) {
    const u = createUser(id, p, s);
    return res.redirect(finishLogin(req, res, u, id, false));
  }
  // Otherwise ask for the Terms (and the role) first.
  cookie(res, PENDING_COOKIE, issueToken('oauth_signup', null, PENDING_TTL, { provider: id, profile: p, role: s.role, news: s.news, ctx: s.ctx }), PENDING_TTL);
  res.redirect('/#register-oauth');
}
router.get('/:provider/callback', callback);
router.post('/:provider/callback', express.urlencoded({ extended: false, limit: '20kb' }), callback);

/* ---------- 3. finishing steps (JSON, same-origin only) ---------- */
const pendingToken = req => parseCookies(req.headers.cookie)[PENDING_COOKIE];

router.get('/pending', (req, res) => {
  const tok = pendingToken(req);
  const su = peekToken('oauth_signup', tok);
  if (su) return res.json({ kind: 'signup', provider: O.PROVIDERS[su.data.provider].name, email: su.data.profile.email, name: su.data.profile.name || '', role: su.data.role });
  const tf = peekToken('oauth_2fa', tok);
  if (tf) return res.json({ kind: '2fa', provider: O.PROVIDERS[tf.data.provider].name });
  res.json({ kind: null });
});

router.post('/complete', csrfGuard, (req, res) => {
  const b = req.body || {};
  if (!b.terms) throw bad('Accept the Terms and Conditions and the Privacy Policy to continue');
  const t = consumeToken('oauth_signup', pendingToken(req));
  if (!t) throw bad('This sign-up has expired. Start again.', { expired: true });
  cookie(res, PENDING_COOKIE, '', 0);
  const { provider, profile } = t.data;
  if (one('SELECT 1 FROM user_identities WHERE provider=? AND subject=?', provider, profile.sub) || one('SELECT 1 FROM users WHERE email=?', profile.email))
    throw bad('An account with this e-mail already exists. Log in instead.', { expired: true });
  const u = createUser(provider, profile, { role: b.role || t.data.role, news: !!b.news, ctx: t.data.ctx });
  res.json({ ok: true, redirect: finishLogin(req, res, u, provider, false) });
});

router.post('/2fa', csrfGuard, (req, res) => {
  const tok = pendingToken(req);
  const t = peekToken('oauth_2fa', tok);
  if (!t) throw bad('This log-in has expired. Start again.', { expired: true });
  const u = D.userById(t.userId);
  U.gateCheck('loginfail:' + req.ip + ':' + u.email, 8);
  if (!U.totpCheck(u.id, u.totp_secret, String((req.body || {}).code || ''), true)) {
    U.gateFail('loginfail:' + req.ip + ':' + u.email, 15 * 60000);
    throw bad('That code did not work. Check your authenticator app.');
  }
  consumeToken('oauth_2fa', tok);
  cookie(res, PENDING_COOKIE, '', 0);
  req.user = u;
  createSession(res, req, u.id);
  audit(req, 'login', 'via ' + t.data.provider);
  res.json({ ok: true, redirect: landing(u, t.data.staff) });
});

module.exports = router;
