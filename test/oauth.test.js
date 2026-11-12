'use strict';
/* Sign up / log in with Google, Facebook, Apple and GitHub. The providers' servers are replaced by a fake fetch. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-oauth-'));
process.env.SEED_DEMO = '1';
Object.assign(process.env, {
  GOOGLE_CLIENT_ID: 'g-client', GOOGLE_CLIENT_SECRET: 'g-secret',
  FACEBOOK_APP_ID: 'fb-app', FACEBOOK_APP_SECRET: 'fb-secret',
  GITHUB_CLIENT_ID: 'gh-client', GITHUB_CLIENT_SECRET: 'gh-secret',
  APPLE_CLIENT_ID: 'com.afterworc.web', APPLE_TEAM_ID: 'TEAM123', APPLE_KEY_ID: 'KEY123',
  APPLE_PRIVATE_KEY: crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n')
});
const { createApp } = require('../server/index');
const { db } = require('../server/db');
const U = require('../server/util');

/* ---------- fake providers ---------- */
const realFetch = global.fetch;
const fake = { google: null, facebook: null, github: null, apple: null }; // profile each provider returns next
let lastNonce = null, appleSecret = null;
const json = d => new Response(JSON.stringify(d), { status: 200, headers: { 'content-type': 'application/json' } });
const jwt = claims => ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');
const exp = () => Math.floor(Date.now() / 1000) + 600;
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/token')) {
    const p = fake.google;
    return json({ access_token: 'x', id_token: jwt({ iss: 'https://accounts.google.com', aud: 'g-client', exp: exp(), nonce: lastNonce, sub: p.sub, email: p.email, email_verified: p.verified, name: p.name }) });
  }
  if (u.startsWith('https://graph.facebook.com/v21.0/oauth/access_token')) return json({ access_token: 'fbtok' });
  if (u.startsWith('https://graph.facebook.com/v21.0/me')) return json({ id: fake.facebook.sub, name: fake.facebook.name, email: fake.facebook.email });
  if (u.startsWith('https://github.com/login/oauth/access_token')) return json({ access_token: 'ghtok' });
  if (u === 'https://api.github.com/user') return json({ id: Number(fake.github.sub), login: 'octo', name: fake.github.name });
  if (u === 'https://api.github.com/user/emails') return json([{ email: fake.github.email, primary: true, verified: true }]);
  if (u.startsWith('https://appleid.apple.com/auth/token')) {
    appleSecret = new URLSearchParams(opts.body).get('client_secret');
    const p = fake.apple;
    return json({ access_token: 'x', id_token: jwt({ iss: 'https://appleid.apple.com', aud: 'com.afterworc.web', exp: exp(), nonce: lastNonce, sub: p.sub, email: p.email, email_verified: 'true' }) });
  }
  return realFetch(url, opts);
};

let server, base;
test.before(async () => { server = createApp().listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; process.env.BASE_URL = base; });
test.after(() => { global.fetch = realFetch; server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

/** A browser with a cookie jar. */
function browser() {
  const jar = {};
  const req = async (method, p, { body, form } = {}) => {
    const headers = { 'X-Requested-With': 'afterworc' };
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) headers.Cookie = cookie;
    if (body) headers['Content-Type'] = 'application/json';
    if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const r = await realFetch(base + p, { method, redirect: 'manual', headers, body: body ? JSON.stringify(body) : form ? new URLSearchParams(form).toString() : undefined });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1); if (v) jar[k] = v; else delete jar[k]; }
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : null, location: r.headers.get('location') };
  };
  return { jar, get: p => req('GET', p), post: (p, body) => req('POST', p, { body }), postForm: (p, form) => req('POST', p, { form }) };
}

/** Clicks a "Continue with" button and comes back from the provider. */
async function signIn(b, provider, query = '', extra = {}) {
  const start = await b.get(`/api/auth/oauth/${provider}/start?${query}`);
  assert.equal(start.status, 302);
  const to = new URL(start.location);
  lastNonce = to.searchParams.get('nonce');
  const state = to.searchParams.get('state');
  if (provider === 'apple') return { to, back: await b.postForm('/api/auth/oauth/apple/callback', { code: 'c0de', state, ...extra }) };
  return { to, back: await b.get(`/api/auth/oauth/${provider}/callback?code=c0de&state=${encodeURIComponent(state)}`) };
}

test('lists the providers', async () => {
  const d = (await browser().get('/api/auth/oauth/providers')).data;
  assert.deepEqual(d.providers.map(p => [p.id, p.enabled]), [['google', true], ['facebook', true], ['apple', true], ['github', true]]);
});

test('Google: sign up from the sign-up page, then log in again', async () => {
  fake.google = { sub: 'g-1', email: 'Ann@Example.com', verified: true, name: 'Ann Lee' };
  const b = browser();
  const { to, back } = await signIn(b, 'google', 'intent=register&role=work&terms=1');
  assert.equal(to.origin + to.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(to.searchParams.get('redirect_uri'), base + '/api/auth/oauth/google/callback');
  assert.equal(to.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(back.location, '/app#/work/home');
  assert.ok(b.jar.aw_sid);
  const u = db.prepare('SELECT * FROM users WHERE email=?').get('ann@example.com');
  assert.equal(u.name, 'Ann Lee'); assert.equal(u.role_pref, 'work'); assert.equal(u.email_verified, 1); assert.equal(u.pass_hash, '');
  assert.equal((await b.get('/api/auth/me')).data.user.email, 'ann@example.com');
  // Password log-in can't be used for an account without a password.
  assert.equal((await browser().post('/api/auth/login', { email: 'ann@example.com', password: '' })).status, 400);

  const b2 = browser();
  const again = await signIn(b2, 'google', 'intent=login');
  assert.equal(again.back.location, '/app#/work/home');
  assert.equal((await b2.get('/api/auth/me')).data.user.id, u.id);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE email=?').get('ann@example.com').n, 1);
});

test('rejects a forged or replayed state', async () => {
  fake.google = { sub: 'g-2', email: 'x@example.com', verified: true, name: 'X' };
  const b = browser();
  const start = await b.get('/api/auth/oauth/google/start?intent=login');
  const state = new URL(start.location).searchParams.get('state');
  // Another browser (no state cookie) can't finish this sign-in.
  assert.equal((await browser().get(`/api/auth/oauth/google/callback?code=c&state=${state}`)).location, '/#login-oauthexpired');
  const bad = await b.get('/api/auth/oauth/google/callback?code=c&state=wrong');
  assert.equal(bad.location, '/#login-oauthexpired');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE email=?').get('x@example.com').n, 0);
});

test('cancelled on the provider page', async () => {
  const b = browser();
  const start = await b.get('/api/auth/oauth/github/start?intent=register');
  const state = new URL(start.location).searchParams.get('state');
  assert.equal((await b.get(`/api/auth/oauth/github/callback?error=access_denied&state=${state}`)).location, '/#register-oauthcancel');
});

test('GitHub joins an existing account with the same verified e-mail', async () => {
  fake.github = { sub: '4242', email: 'demo@afterworc.com', name: 'Demo' };
  const demo = db.prepare('SELECT * FROM users WHERE email=?').get('demo@afterworc.com');
  const b = browser();
  const { back } = await signIn(b, 'github', 'intent=login');
  assert.match(back.location, /^\/app#\//);
  assert.equal((await b.get('/api/auth/me')).data.user.id, demo.id);
  assert.ok(db.prepare("SELECT 1 FROM user_identities WHERE provider='github' AND subject='4242' AND user_id=?").get(demo.id));
  assert.ok(db.prepare("SELECT 1 FROM outbox WHERE to_addr=? AND subject LIKE 'GitHub sign-in added%'").get('demo@afterworc.com'));
});

test('Facebook never joins an existing account (no verified flag)', async () => {
  fake.facebook = { sub: 'fb-1', email: 'admin@afterworc.local', name: 'Mallory' };
  const b = browser();
  const { back } = await signIn(b, 'facebook', 'intent=login');
  assert.equal(back.location, '/#login-oauthexists');
  assert.equal(b.jar.aw_sid, undefined);
});

test('Facebook: new person from the log-in page accepts the Terms first', async () => {
  fake.facebook = { sub: 'fb-2', email: 'bo@example.com', name: 'Bo Ek' };
  const b = browser();
  const { back } = await signIn(b, 'facebook', 'intent=login');
  assert.equal(back.location, '/#register-oauth');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE email=?').get('bo@example.com').n, 0);
  const p = (await b.get('/api/auth/oauth/pending')).data;
  assert.deepEqual([p.kind, p.provider, p.email], ['signup', 'Facebook', 'bo@example.com']);
  assert.equal((await b.post('/api/auth/oauth/complete', { terms: false })).status, 400);
  // Cross-site requests are blocked like every other JSON endpoint.
  const noHeader = await realFetch(base + '/api/auth/oauth/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"terms":true}' });
  assert.equal(noHeader.status, 403);
  const done = await b.post('/api/auth/oauth/complete', { terms: true, role: 'hire', news: true });
  assert.equal(done.data.redirect, '/app#/hire/home');
  assert.equal((await b.get('/api/auth/me')).data.user.email, 'bo@example.com');
  assert.equal((await b.post('/api/auth/oauth/complete', { terms: true })).status, 400); // used up
});

test('Apple: form_post callback, signed client secret, name sent once', async () => {
  fake.apple = { sub: 'apple-1', email: 'x1y2@privaterelay.appleid.com' };
  const b = browser();
  const { to, back } = await signIn(b, 'apple', 'intent=register&terms=1', { user: JSON.stringify({ name: { firstName: 'Cy', lastName: 'Ra' } }) });
  assert.equal(to.searchParams.get('response_mode'), 'form_post');
  assert.equal(back.location, '/app#/hire/home');
  assert.equal(db.prepare('SELECT name FROM users WHERE email=?').get('x1y2@privaterelay.appleid.com').name, 'Cy Ra');
  const [h, p, sig] = appleSecret.split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url')).alg, 'ES256');
  assert.equal(JSON.parse(Buffer.from(p, 'base64url')).iss, 'TEAM123');
  assert.equal(Buffer.from(sig, 'base64url').length, 64);
});

test('two-factor authentication still applies', async () => {
  fake.google = { sub: 'g-2fa', email: 'tfa@example.com', verified: true, name: 'T' };
  const b = browser();
  await signIn(b, 'google', 'intent=register&terms=1');
  const secret = U.newTotpSecret();
  db.prepare('UPDATE users SET totp_secret=? WHERE email=?').run(secret, 'tfa@example.com');
  const b2 = browser();
  const { back } = await signIn(b2, 'google', 'intent=login');
  assert.equal(back.location, '/#login-oauth2fa');
  assert.equal(b2.jar.aw_sid, undefined);
  assert.equal((await b2.get('/api/auth/oauth/pending')).data.kind, '2fa');
  assert.equal((await b2.post('/api/auth/oauth/2fa', { code: '000000' })).status, 400);
  const ok = await b2.post('/api/auth/oauth/2fa', { code: U.totpAt(secret, Math.floor(Date.now() / 30000)) });
  assert.equal(ok.status, 200);
  assert.equal((await b2.get('/api/auth/me')).data.user.email, 'tfa@example.com');
});

test('a provider without keys is refused', async () => {
  delete process.env.GITHUB_CLIENT_SECRET;
  try {
    assert.equal((await browser().get('/api/auth/oauth/github/start?intent=login')).location, '/#login-oauthoff');
    assert.equal((await browser().get('/api/auth/oauth/nope/start')).location, '/#login-oauthfail');
  } finally { process.env.GITHUB_CLIENT_SECRET = 'gh-secret'; }
});
