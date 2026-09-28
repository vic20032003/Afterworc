'use strict';
const express = require('express');
const D = require('../domain');
const U = require('../util');
const mail = require('../mail');
const { createSession, destroySession, issueToken, consumeToken, audit } = require('../auth');
const { one, run } = D;
const { now, DAY, HOUR, bad, HttpError, str } = U;

const router = express.Router();
// Reused for timing-safe "user not found" comparisons.
const DUMMY_HASH = U.hashPassword('not-a-real-password-' + U.randToken(4));

function sendVerify(u) {
  const t = issueToken('verify', u.id, 3 * DAY);
  const link = `${mail.BASE_URL}/api/auth/verify?token=${t}`;
  mail.send(u.email, 'Confirm your AfterWorc account', `Welcome to AfterWorc.\n\nConfirm your e-mail address to activate your account:\n\n${link}\n\nThe link works for 3 days. If you didn't sign up, ignore this e-mail.`);
  return link;
}

router.get('/me', (req, res) => {
  const u = req.user;
  res.json({ user: u ? { id: u.id, name: u.name, email: u.email, verified: !!u.email_verified, admin: !!u.is_admin, rolePref: u.role_pref, avatar: D.mediaUrl(u.avatar_file_id) } : null, smtp: mail.hasSmtp() });
});

router.post('/register', (req, res) => {
  U.rateLimit('reg:' + req.ip, 10, HOUR);
  const b = req.body || {};
  const email = U.email(b.email);
  const pw = str(b.password, { min: 10, max: 200, name: 'the password', trim: false });
  if (pw.length < 10) throw bad('Use at least 10 characters for the password');
  if (!b.terms) throw bad('Accept the Terms and Conditions and the Privacy Policy to continue');
  const role = b.role === 'work' ? 'work' : 'hire';
  const name = str(b.name, { max: 80 }) || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const ctx = str(b.ctx, { max: 40 });
  const existing = one('SELECT * FROM users WHERE email=?', email);
  const passHash = U.hashPassword(pw); // always hash, so response time doesn't reveal whether the address exists
  let devLink = null;
  if (existing) {
    // Don't reveal whether an address is registered: send a helpful e-mail instead.
    if (!existing.email_verified) devLink = sendVerify(existing);
    else mail.send(email, 'You already have an AfterWorc account', `Someone tried to sign up with this address, but you already have an account.\n\nLog in: ${mail.BASE_URL}/#login\nForgot your password? ${mail.BASE_URL}/#forgot`);
  } else {
    const id = run('INSERT INTO users (email, pass_hash, name, role_pref, news_optin, terms_accepted_at, prefs, created_at) VALUES (?,?,?,?,?,?,?,?)',
      email, passHash, name, role, b.news ? 1 : 0, now(), JSON.stringify({ email: { news: !!b.news }, ctx: ctx || undefined }), now()).lastInsertRowid;
    D.ensureUserSetup(id);
    if (role === 'work') D.mySpecialist(id, true);
    const u = D.userById(id);
    devLink = sendVerify(u);
    D.notify(id, role, 'Welcome to AfterWorc', role === 'hire' ? 'Post your first brief: a person reads it and sends up to 3 checked matches within 48 hours' : 'Build your profile, then book your interview to get checked', role === 'hire' ? 'newbrief' : 'profile');
    mail.toStaff('New sign-up', `${email} signed up (${role === 'hire' ? 'hiring' : 'working'}).`);
  }
  res.json({ ok: true, devLink: mail.devLinks() ? devLink : undefined });
});

router.post('/resend', (req, res) => {
  U.rateLimit('resend:' + req.ip, 5, HOUR);
  const email = U.email((req.body || {}).email);
  const u = one('SELECT * FROM users WHERE email=?', email);
  let devLink;
  if (u && !u.email_verified) devLink = sendVerify(u);
  res.json({ ok: true, devLink: mail.devLinks() ? devLink : undefined });
});

router.get('/verify', (req, res) => {
  const t = consumeToken('verify', String(req.query.token || ''));
  if (!t) return res.redirect('/#login-expired');
  run('UPDATE users SET email_verified=1 WHERE id=?', t.userId);
  const u = D.userById(t.userId);
  createSession(res, req, u.id);
  const ctx = U.j(u.prefs, {}).ctx;
  res.redirect(`/app#/${u.role_pref}/${u.role_pref === 'hire' ? (ctx ? 'pp/' + encodeURIComponent(ctx) : 'home') : 'profile'}`);
});

router.post('/login', (req, res) => {
  const b = req.body || {};
  const email = U.email(b.email);
  U.rateLimit('login:' + req.ip, 20, 15 * 60000);
  U.gateCheck('loginfail:' + req.ip + ':' + email, 8);
  const u = one('SELECT * FROM users WHERE email=?', email);
  const ok = U.verifyPassword(String(b.password || ''), u ? u.pass_hash : DUMMY_HASH);
  if (!u || !ok || u.closed_at) { U.gateFail('loginfail:' + req.ip + ':' + email, 15 * 60000); throw bad('E-mail or password is not right'); }
  if (u.status === 'blocked') throw bad('This account is blocked. Contact info@afterworc.com.', { blocked: true });
  if (!u.email_verified) throw bad('Confirm your e-mail first. We sent you a link.', { unverified: true });
  if (u.totp_secret) {
    if (!b.code) return res.json({ ok: false, need2fa: true });
    if (!U.totpCheck(u.id, u.totp_secret, b.code, true)) throw bad('That code did not work. Check your authenticator app.', { need2fa: true });
  }
  req.user = u;
  // Native apps ask for a bearer token ({ client: 'app' }); browsers get the HttpOnly cookie.
  const bearer = b.client === 'app';
  const token = createSession(res, req, u.id, { bearer });
  audit(req, 'login');
  if (bearer) return res.json({ ok: true, token, user: { id: u.id, name: u.name, email: u.email, admin: !!u.is_admin, rolePref: u.role_pref } });
  const ctx = U.j(u.prefs, {}).ctx;
  res.json({ ok: true, redirect: u.is_admin && b.admin ? '/admin' : `/app#/${u.role_pref}/${ctx && u.role_pref === 'hire' ? 'pp/' + encodeURIComponent(ctx) : 'home'}` });
});

router.post('/logout', (req, res) => { if (req.user) require('../ws').kick(req.user.id, req.sid); destroySession(req, res); res.json({ ok: true }); });

router.post('/forgot', (req, res) => {
  U.rateLimit('forgot:' + req.ip, 5, HOUR);
  const email = U.email((req.body || {}).email);
  const u = one('SELECT * FROM users WHERE email=? AND closed_at IS NULL', email);
  let devLink;
  if (u) {
    const t = issueToken('reset', u.id, 2 * HOUR);
    devLink = `${mail.BASE_URL}/#reset-${t}`;
    mail.send(u.email, 'Reset your AfterWorc password', `Someone asked to reset the password for your AfterWorc account.\n\nChoose a new password:\n\n${devLink}\n\nThe link works for 2 hours. If this wasn't you, ignore this e-mail; your password stays the same.`);
  }
  res.json({ ok: true, devLink: mail.devLinks() ? devLink : undefined });
});

router.post('/reset', (req, res) => {
  U.rateLimit('reset:' + req.ip, 10, HOUR);
  const b = req.body || {};
  const pw = str(b.password, { min: 10, max: 200, name: 'the new password', trim: false });
  if (pw.length < 10) throw bad('Use at least 10 characters for the password');
  const t = consumeToken('reset', String(b.token || ''));
  if (!t) throw bad('This link has expired. Ask for a new one.');
  run('UPDATE users SET pass_hash=?, password_changed_at=?, email_verified=1 WHERE id=?', U.hashPassword(pw), now(), t.userId);
  run('DELETE FROM sessions WHERE user_id=?', t.userId);
  const u = D.userById(t.userId);
  mail.send(u.email, 'Your password was changed', 'Your AfterWorc password was reset. If this wasn\'t you, contact info@afterworc.com right away.');
  res.json({ ok: true });
});

router.get('/confirm-email', (req, res) => {
  const t = consumeToken('email', String(req.query.token || ''));
  if (!t || !t.data || one('SELECT 1 FROM users WHERE email=?', t.data.email)) return res.redirect('/#login-expired');
  const old = D.userById(t.userId);
  const prefs = U.j(old.prefs, {}); delete prefs.pendingEmail;
  run('UPDATE users SET email=?, email_verified=1, prefs=? WHERE id=?', t.data.email, JSON.stringify(prefs), t.userId);
  mail.send(old.email, 'Your AfterWorc e-mail was changed', `Your account now uses ${t.data.email}. If this wasn't you, contact info@afterworc.com right away.`);
  res.redirect('/app#/' + old.role_pref + '/settings');
});

router.get('/org-invite', (req, res) => {
  const inv = one('SELECT * FROM org_invites WHERE token_hash=? AND accepted_at IS NULL', U.sha256(String(req.query.token || '')));
  if (!inv || inv.created_at < now() - 14 * DAY) return res.redirect('/#login-expired');
  if (!req.user) return res.redirect('/#login-invite');
  if (req.user.email.toLowerCase() !== inv.email.toLowerCase()) return res.redirect('/app#/hire/settings/org');
  run('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?,?,?)', inv.org_id, req.user.id, inv.role);
  run('UPDATE org_invites SET accepted_at=? WHERE id=?', now(), inv.id);
  run('UPDATE users SET acting_org_id=? WHERE id=?', inv.org_id, req.user.id);
  res.redirect('/app#/hire/home');
});

module.exports = router;
