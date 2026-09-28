'use strict';
/* End-to-end API tests: a client and a specialist go from sign-up to a paid, reviewed deal. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-test-'));
process.env.SEED_DEMO = '1';
const { createApp } = require('../server/index');
const { db } = require('../server/db');
const U = require('../server/util');
const D = require('../server/domain');

let server, base;
test.before(async () => { server = createApp().listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; process.env.BASE_URL = base; });
test.after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  const req = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afterworc', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/aw_sid=([^;]*)/); if (m) cookie = m[1] ? 'aw_sid=' + m[1] : ''; }
    let data = null; const ct = r.headers.get('content-type') || ''; if (ct.includes('json')) data = await r.json();
    return { status: r.status, data, location: r.headers.get('location') };
  };
  const c = {
    get: p => req('GET', p), post: (p, b, h) => req('POST', p, b || {}, h),
    act: async (type, payload = {}) => { const r = await req('POST', '/api/account/action', { ...payload, type }); if (r.status !== 200) { const e = new Error(`${type}: ${r.status} ${r.data && r.data.error}`); e.r = r; throw e; } return r.data; },
    state: async () => (await req('GET', '/api/account/state')).data,
    async signup(email, role) {
      const r = await req('POST', '/api/auth/register', { email, password: 'correct-horse-battery', role, terms: true });
      assert.equal(r.status, 200); assert.ok(r.data.devLink, 'dev link returned without SMTP');
      const v = await req('GET', new URL(r.data.devLink).pathname + new URL(r.data.devLink).search);
      assert.equal(v.status, 302); assert.match(v.location, /^\/app#\//);
      return c;
    }
  };
  return c;
}
const totpNow = secret => U.totpAt(secret.replace(/\s/g, ''), Math.floor(Date.now() / 30000));

const cl = client(), sp = client(), admin = client(), other = client();
let briefId, dealId, specId;

test('public pages and directory', async () => {
  const home = await fetch(base + '/'); assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
  const dir = await cl.get('/api/specialists'); assert.equal(dir.status, 200); assert.ok(dir.data.length >= 9);
  const app = await fetch(base + '/app', { redirect: 'manual' }); assert.equal(app.status, 302);
});

test('sign-up, verification, login and CSRF protection', async () => {
  await cl.signup('client@example.com', 'hire');
  await sp.signup('spec@example.com', 'work');
  const st = await cl.state(); assert.equal(st.me.email, 'client@example.com'); assert.equal(st.money.hire.available, 0);
  const bad = await other.post('/api/auth/login', { email: 'client@example.com', password: 'wrong-password' }); assert.equal(bad.status, 400);
  const noHeader = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(noHeader.status, 403);
  const crossSite = await other.post('/api/auth/login', { email: 'x@y.zz', password: 'x' }, { Origin: 'https://evil.example' }); assert.equal(crossSite.status, 403);
  const unverified = await other.post('/api/auth/register', { email: 'late@example.com', password: 'correct-horse-battery', terms: true });
  assert.equal(unverified.status, 200);
  const l = await other.post('/api/auth/login', { email: 'late@example.com', password: 'correct-horse-battery' }); assert.equal(l.status, 400); assert.equal(l.data.unverified, true);
  const noTerms = await other.post('/api/auth/register', { email: 'nt@example.com', password: 'correct-horse-battery' }); assert.equal(noTerms.status, 400);
});

test('client sends a brief, specialist completes profile', async () => {
  const r = await cl.act('brief_send', { btype: 'task', area: 'Development', line: 'Build a client portal', desc: 'Portal on top of our Go API', people: 'Backend Developer', budget: '€1–5k', start: 'Within 2 weeks' });
  briefId = r.go[1]; assert.ok(briefId);
  const b = (await cl.state()).briefs.find(x => x.id === briefId); assert.equal(b.status, 'review'); assert.ok(b.promised);
  await assert.rejects(sp.act('profile_submit'), /Add a headline/);
  await sp.act('profile_save', { name: 'Sam Spec', headline: 'Senior Go engineer', profession: 'Backend Developer', about: 'Ten years of Go.', area: 'Development', skills: ['Go', 'PostgreSQL'], rate: '60', hours: '30', avail: 'Available now', portfolio: 'https://example.com' });
  await sp.act('profile_submit');
  const s = await sp.state(); assert.equal(s.prof.status, 'submitted'); specId = s.prof.id;
  await assert.rejects(sp.act('profile_save', { headline: 'x', skills: [], portfolio: 'javascript:alert(1)' }), /https/);
});

test('staff publishes the specialist and a shortlist', async () => {
  const l = await admin.post('/api/auth/login', { email: 'admin@afterworc.local', password: 'afterworc-admin' }); assert.equal(l.status, 200);
  const forbidden = await cl.post('/api/admin/action', { type: 'lead_status' }); assert.equal(forbidden.status, 403);
  const o = (await admin.get('/api/admin/overview')).data;
  const s = o.specialists.find(x => x.id === specId); assert.ok(s.submitted);
  let r = await admin.post('/api/admin/action', { type: 'spec_save', id: specId, name: 'Sam Spec', role: 'Senior Go engineer', area: 'Development', skills: 'Go, PostgreSQL', rate: '60', level: 'verified', avail: 'Available now', city: 'Tallinn', langs: 'EN', bio: 'Ten years of Go.', published: true });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await admin.post('/api/admin/action', { type: 'brief_shortlist', id: briefId, specialists: [specId, 'mk'], why: { [specId]: 'Go expert' } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const st = await cl.state();
  assert.equal(st.briefs.find(x => x.id === briefId).status, 'shortlist');
  assert.ok(st.notifs.some(n => /Shortlist ready/.test(n.t)));
  assert.ok((await cl.get('/api/specialists')).data.some(x => x.id === specId));
});

test('deal: terms, funding, delivery, acceptance, payout and review', async () => {
  const r = await cl.act('deal_start', { briefId, specialistId: specId, model: 'fixed', first: 'API + tests', amount: 600, startDate: '1 Oct 2026' });
  dealId = r.go[1];
  await assert.rejects(other.act('ms_fund', { dealId, msId: 1 }), /401|Log in/);
  const sst = await sp.state(); const wd = sst.deals.find(d => d.id === dealId && d.side === 'work'); assert.equal(wd.status, 'proposed');
  await cl.act('ms_add', { dealId, name: 'Handover', amount: 200 });
  await sp.act('deal_accept', { dealId });
  let d = (await cl.state()).deals.find(x => x.id === dealId && x.side === 'hire'); assert.equal(d.status, 'active'); assert.deepEqual(d.ms.map(m => m.st), ['unfunded', 'unfunded']);
  await assert.rejects(cl.act('ms_fund', { dealId, msId: d.ms[0].id }), /Not enough balance/);
  await cl.act('topup', { mode: 'hire', amount: 1000, method: 'card' });
  await cl.act('ms_fund', { dealId, msId: d.ms[0].id });
  let st = await cl.state(); assert.equal(st.money.hire.available, 400); assert.equal(st.money.hire.held, 600); assert.equal(st.money.hire.inv.length, 1);
  const inv = await fetch(base + '/api/account/invoices/' + st.money.hire.inv[0][0]); assert.equal(inv.status, 401, 'invoice needs a session');
  assert.equal((await sp.state()).deals.find(x => x.id === dealId).ms[0].st, 'inprogress');
  await assert.rejects(cl.act('ms_accept', { dealId }), /Nothing to accept/);
  await sp.act('ms_deliver', { dealId, note: 'Done, see README' });
  await cl.act('ms_changes', { dealId, text: 'Please add tests for errors' });
  await sp.act('ms_deliver', { dealId, note: 'Tests added' });
  await cl.act('ms_accept', { dealId, thanks: true });
  st = await cl.state(); assert.equal(st.money.hire.held, 0);
  let ss = await sp.state(); assert.equal(ss.money.work.available, 600); assert.ok(ss.threads.some(t => t.unread));
  // Second milestone: auto-accept after 7 days without a review
  d = st.deals.find(x => x.id === dealId && x.side === 'hire');
  await cl.act('ms_fund', { dealId, msId: d.ms[1].id });
  await sp.act('ms_deliver', { dealId, note: 'Handover done' });
  db.prepare('UPDATE milestones SET delivered_at=? WHERE id=?').run(Date.now() - 8 * U.DAY, d.ms[1].id);
  assert.equal(D.sweepAutoAccept(), 1);
  st = await cl.state(); d = st.deals.find(x => x.id === dealId && x.side === 'hire');
  assert.equal(d.status, 'done'); assert.equal(d.review, 'pending');
  ss = await sp.state(); assert.equal(ss.money.work.available, 800);
  await cl.act('deal_review', { dealId, stars: 5, text: 'Great work' });
  await assert.rejects(cl.act('deal_review', { dealId, stars: 5 }), /Nothing to review/);
});

test('messages between client and specialist', async () => {
  const t = (await cl.state()).threads.find(x => x.kind === 'specialist');
  await cl.act('message_send', { threadId: t.id, text: 'Thanks <script>alert(1)</script>' });
  const ss = await sp.state(); const th = ss.threads.find(x => x.id === t.id);
  assert.ok(th.unread); assert.equal(th.mode, 'work'); assert.equal(th.msgs.at(-1).t, 'Thanks <script>alert(1)</script>', 'stored raw; the UI escapes on render');
  await assert.rejects(other.act('message_send', { threadId: t.id, text: 'hi' }));
});

test('2FA protects withdrawals and card details', async () => {
  await assert.rejects(sp.act('withdraw', { code: '000000' }), /two-factor/);
  const b = await sp.act('twofa_begin'); assert.match(b.twofa.qr, /<svg/);
  await assert.rejects(sp.act('twofa_confirm', { code: '000000' }), /code/);
  await sp.act('twofa_confirm', { code: totpNow(b.twofa.secret) });
  const secret = db.prepare('SELECT totp_secret FROM users WHERE email=?').get('spec@example.com').totp_secret;
  await sp.act('tax_save', { country: 'Estonia', iban: 'EE38 2200 2210 2014 5685', holder: 'Sam Spec' });
  await sp.act('withdraw', { code: totpNow(secret) });
  assert.equal((await sp.state()).money.work.available, 0);
  await sp.act('card_issue', { mode: 'work', kind: 'virtual', name: 'Sam Spec', terms: true, code: totpNow(secret) });
  const card = (await sp.state()).cards.work; assert.equal(card.st, 'active'); assert.equal(card.pan, undefined, 'PAN never in state');
  const rv = await sp.act('card_reveal', { mode: 'work', what: 'details', code: totpNow(secret) }); assert.match(rv.reveal.pan, /^5555/);
  await sp.act('card_freeze', { mode: 'work' }); assert.equal((await sp.state()).cards.work.frozen, true);
  // Login now needs the code
  const x = client(); const l1 = await x.post('/api/auth/login', { email: 'spec@example.com', password: 'correct-horse-battery' }); assert.equal(l1.data.need2fa, true);
  const l2 = await x.post('/api/auth/login', { email: 'spec@example.com', password: 'correct-horse-battery', code: totpNow(secret) }); assert.equal(l2.data.ok, true);
});

test('password reset', async () => {
  const f = await other.post('/api/auth/forgot', { email: 'client@example.com' }); assert.ok(f.data.devLink);
  const token = f.data.devLink.split('#reset-')[1];
  assert.equal((await other.post('/api/auth/reset', { token, password: 'short' })).status, 400);
  assert.equal((await other.post('/api/auth/reset', { token, password: 'a-brand-new-password' })).status, 200);
  assert.equal((await other.post('/api/auth/reset', { token, password: 'a-brand-new-password' })).status, 400, 'token is single-use');
  const x = client(); assert.equal((await x.post('/api/auth/login', { email: 'client@example.com', password: 'a-brand-new-password' })).data.ok, true);
  assert.equal((await cl.get('/api/account/state')).status, 401, 'old sessions signed out');
});

test('assessment request with e-mailed code', async () => {
  const r = await other.post('/api/leads', { type: 'dept', need: 'A marketing department', email: 'lead@example.com' });
  assert.equal(r.status, 200); assert.match(r.data.devCode, /^\d{6}$/);
  assert.equal((await other.post(`/api/leads/${r.data.id}/confirm`, { code: '000000' === r.data.devCode ? '111111' : '000000' })).status, 400);
  assert.equal((await other.post(`/api/leads/${r.data.id}/confirm`, { code: r.data.devCode })).status, 200);
  const o = (await admin.get('/api/admin/overview')).data; assert.equal(o.leads.find(l => l.id === r.data.id).status, 'new');
});

test('demo account state builds', async () => {
  const x = client(); const l = await x.post('/api/auth/login', { email: 'demo@afterworc.com', password: 'afterworc-demo' }); assert.equal(l.data.ok, true);
  const s = await x.state(); assert.equal(s.briefs.length, 4); assert.ok(s.deals.length >= 5); assert.equal(s.cards.hire.st, 'active');
});

test('account deletion', async () => {
  const x = client(); await x.signup('leaver@example.com', 'hire');
  await assert.rejects(x.act('account_close', { how: 'delete', confirm: 'DELETE', password: 'nope' }), /password/);
  const r = await x.act('account_close', { how: 'delete', confirm: 'DELETE', password: 'correct-horse-battery' }); assert.equal(r.logout, true);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE email=?').get('leaver@example.com').n, 0);
});
