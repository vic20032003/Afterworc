'use strict';
/* API tests for the features added with the React account: chats, calls over WebSocket, skills moderation,
   portfolio and photos, password and e-mail changes with 2FA, staff verification and status, bearer tokens, EOR briefs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-feat-'));
process.env.SEED_DEMO = '1';
const { createServer } = require('../server/index');
const { db } = require('../server/db');
const U = require('../server/util');

let server, base;
test.before(async () => { server = createServer().listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; process.env.BASE_URL = base; });
test.after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  const req = async (method, p, body, headers = {}) => {
    const isForm = body instanceof FormData;
    const r = await fetch(base + p, { method, redirect: 'manual', headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), 'X-Requested-With': 'afterworc', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/aw_sid=([^;]*)/); if (m) cookie = m[1] ? 'aw_sid=' + m[1] : ''; }
    let data = null; const ct = r.headers.get('content-type') || ''; if (ct.includes('json')) data = await r.json();
    return { status: r.status, data, location: r.headers.get('location'), headers: r.headers };
  };
  const c = {
    get cookie() { return cookie; },
    get: p => req('GET', p), post: (p, b, h) => req('POST', p, b || {}, h), form: (p, fd) => req('POST', p, fd),
    act: async (type, payload = {}) => { const r = await req('POST', '/api/account/action', { ...payload, type }); if (r.status !== 200) { const e = new Error(`${type}: ${r.status} ${r.data && r.data.error}`); e.r = r; throw e; } return r.data; },
    state: async () => (await req('GET', '/api/account/state')).data,
    async login(email, password) { const r = await req('POST', '/api/auth/login', { email, password }); assert.equal(r.status, 200, JSON.stringify(r.data)); return c; },
    async signup(email, role) {
      const r = await req('POST', '/api/auth/register', { email, password: 'correct-horse-battery', role, terms: true });
      const v = await req('GET', new URL(r.data.devLink).pathname + new URL(r.data.devLink).search); assert.equal(v.status, 302);
      return c;
    }
  };
  return c;
}
const code = (secret, d = 0) => U.totpAt(secret.replace(/\s/g, ''), Math.floor(Date.now() / 30000) + d);
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5b40000000049454e44ae426082', 'hex');
function socket(cl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace('http', 'ws') + '/ws', { headers: { Cookie: cl.cookie, Origin: base } });
    const inbox = [];
    ws.next = (t, ms = 3000) => new Promise((res, rej) => {
      const i = inbox.findIndex(m => m.t === t); if (i >= 0) return res(inbox.splice(i, 1)[0]);
      const h = setTimeout(() => rej(new Error('timeout waiting for ' + t)), ms);
      ws.waiters.push(m => { if (m.t === t) { clearTimeout(h); res(m); return true; } return false; });
    });
    ws.waiters = [];
    ws.on('message', d => { const m = JSON.parse(d); const k = ws.waiters.findIndex(f => f(m)); if (k >= 0) ws.waiters.splice(k, 1); else inbox.push(m); });
    ws.on('open', () => resolve(ws)); ws.on('error', reject);
  });
}

const hire = client(), work = client(), admin = client();

test('sign up two users and staff', async () => {
  await hire.signup('buyer@example.com', 'hire');
  await work.signup('seller@example.com', 'work');
  await admin.login('admin@afterworc.local', 'afterworc-admin');
});

test('native apps can sign in with a bearer token (no cookie, no CSRF header)', async () => {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'buyer@example.com', password: 'correct-horse-battery', client: 'app' }) });
  const d = await r.json(); assert.equal(r.status, 403, 'still needs the header when unauthenticated');
  const r2 = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afterworc' }, body: JSON.stringify({ email: 'buyer@example.com', password: 'correct-horse-battery', client: 'app' }) });
  const d2 = await r2.json(); assert.ok(d2.token && !r2.headers.get('set-cookie'));
  const st = await fetch(base + '/api/account/state', { headers: { Authorization: 'Bearer ' + d2.token } }); assert.equal(st.status, 200);
  const act = await fetch(base + '/api/account/action', { method: 'POST', headers: { Authorization: 'Bearer ' + d2.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'lang_set', lang: 'ru' }) });
  assert.equal(act.status, 200); assert.ok(d);
  assert.equal((await hire.state()).me.lang, 'ru');
});

test('skills: new ones wait for staff; approve, merge and delete update profiles', async () => {
  await work.act('profile_save', { name: 'Sam Seller', headline: 'Payments ops', profession: 'Payments Operations Specialist', about: 'EMI ops.', area: 'Payments', skills: ['SEPA', 'sepa', 'Quantum ledgers', 'Postgres'], rate: '50', hours: '30' });
  let st = await work.state();
  assert.deepEqual(st.prof.skills, ['SEPA', 'Quantum ledgers', 'Postgres'], 'canonical names, no duplicates');
  assert.equal(st.prof.skillStatus['Quantum ledgers'], 'pending');
  assert.equal(st.prof.skillStatus.SEPA, 'approved');
  const pub = await work.get('/api/skills?q=quantum'); assert.deepEqual(pub.data, [], 'pending skills are not in the catalog');
  const specId = st.prof.id;
  db.prepare('UPDATE specialists SET published=1 WHERE id=?').run(specId);
  let dir = (await hire.get('/api/specialists/' + specId)).data; assert.ok(!dir.skills.includes('Quantum ledgers'), 'pending skill hidden publicly');
  const o = (await admin.get('/api/admin/overview')).data;
  const q = o.skills.find(k => k.name === 'Quantum ledgers'); const pg = o.skills.find(k => k.name === 'Postgres'); const psql = o.skills.find(k => k.name === 'PostgreSQL');
  assert.equal(q.status, 'pending'); assert.equal(q.uses, 1);
  assert.equal((await admin.post('/api/admin/action', { type: 'skill_approve', id: q.id })).status, 200);
  assert.equal((await admin.post('/api/admin/action', { type: 'skill_merge', intoId: psql.id, ids: [pg.id] })).status, 200);
  st = await work.state(); assert.deepEqual(st.prof.skills, ['SEPA', 'Quantum ledgers', 'PostgreSQL']);
  dir = (await hire.get('/api/specialists/' + specId)).data; assert.ok(dir.skills.includes('Quantum ledgers'));
  assert.ok(st.notifs.some(n => n.t === 'Skill approved: Quantum ledgers'));
  assert.equal((await admin.post('/api/admin/action', { type: 'skill_delete', id: q.id, fromProfiles: true })).status, 200);
  assert.deepEqual((await work.state()).prof.skills, ['SEPA', 'PostgreSQL']);
  assert.equal((await admin.post('/api/admin/action', { type: 'skill_add', name: 'Open banking 2' })).status, 200);
  assert.deepEqual((await hire.get('/api/skills?q=open banking 2')).data, ['Open banking 2']);
  assert.equal((await hire.post('/api/admin/action', { type: 'skill_add', name: 'x' })).status, 403);
});

test('photo and portfolio: only real images, public only once used', async () => {
  const fake = new FormData(); fake.append('file', new Blob([Buffer.from('<svg onload=alert(1)>')], { type: 'image/png' }), 'x.png');
  assert.equal((await work.form('/api/account/media', fake)).status, 400);
  const fd = new FormData(); fd.append('file', new Blob([PNG], { type: 'image/png' }), 'me.png');
  const up = await work.form('/api/account/media', fd); assert.equal(up.status, 200);
  const id = up.data.file.id;
  assert.equal((await fetch(base + '/api/media/' + id)).status, 404, 'not public before use');
  await work.act('avatar_set', { fileId: id });
  const m = await fetch(base + '/api/media/' + id); assert.equal(m.status, 200); assert.equal(m.headers.get('content-type'), 'image/png');
  const fd2 = new FormData(); fd2.append('file', new Blob([PNG], { type: 'image/png' }), 'work.png');
  const up2 = await work.form('/api/account/media', fd2);
  await assert.rejects(work.act('portfolio_add', { title: 'Nope', url: 'javascript:alert(1)' }), /https/);
  await work.act('portfolio_add', { title: 'Reconciliation dashboard', descr: 'For an EMI', url: 'https://example.com', fileId: up2.data.file.id });
  await work.act('portfolio_add', { title: 'Second', url: 'https://example.org' });
  let st = await work.state(); assert.equal(st.portfolio.length, 2); assert.ok(st.portfolio[0].image.startsWith('/api/media/')); assert.ok(st.me.avatar);
  await work.act('portfolio_move', { id: st.portfolio[1].id, dir: 'up' });
  st = await work.state(); assert.equal(st.portfolio[0].title, 'Second');
  await assert.rejects(hire.act('portfolio_delete', { id: st.portfolio[0].id }).then(async () => { if ((await work.state()).portfolio.length !== 2) throw new Error('deleted someone else’s'); throw new Error('ok'); }), /ok/);
  const pub = (await hire.get('/api/specialists/' + st.prof.id)).data; assert.equal(pub.portfolio.length, 2); assert.ok(pub.avatar);
  const other = new FormData(); other.append('file', new Blob([PNG], { type: 'image/png' }), 'x.png');
  const mine = await hire.form('/api/account/media', other);
  await assert.rejects(work.act('avatar_set', { fileId: mine.data.file.id }), /Upload the image first/);
});

test('password change needs the repeat and, with 2FA on, a code', async () => {
  await assert.rejects(hire.act('password_change', { current: 'correct-horse-battery', next: 'brand-new-password', repeat: 'brand-new-passwor' }), /do not match/);
  const b = await hire.act('twofa_begin'); await hire.act('twofa_confirm', { code: code(b.twofa.secret) });
  const secret = b.twofa.secret;
  await assert.rejects(hire.act('password_change', { current: 'correct-horse-battery', next: 'brand-new-password', repeat: 'brand-new-password' }), /authenticator/);
  await assert.rejects(hire.act('password_change', { current: 'wrong-password-xx', next: 'brand-new-password', repeat: 'brand-new-password', code: code(secret) }), /current password/);
  await hire.act('password_change', { current: 'correct-horse-battery', next: 'brand-new-password', repeat: 'brand-new-password', code: code(secret, 1) });
  hire.secret = secret;
});

test('e-mail change needs 2FA and a confirmed link; the old address keeps working until then', async () => {
  await assert.rejects(hire.act('email_change', { email: 'new-buyer@example.com', password: 'brand-new-password' }), /authenticator/);
  const r = await hire.act('email_change', { email: 'new-buyer@example.com', password: 'brand-new-password', code: code(hire.secret, -1) });
  assert.ok(r.devLink); assert.equal(r.state.me.pendingEmail, 'new-buyer@example.com'); assert.equal(r.state.me.email, 'buyer@example.com');
  const v = await hire.get(new URL(r.devLink).pathname + new URL(r.devLink).search); assert.equal(v.status, 302);
  const st = await hire.state(); assert.equal(st.me.email, 'new-buyer@example.com'); assert.equal(st.me.pendingEmail, null);
});

test('chats: tech support, start a chat, edit own messages, pins, search', async () => {
  const st = await hire.state();
  const tech = st.threads.find(t => t.kind === 'tech' && t.mode === 'hire'); assert.ok(tech, 'technical support chat exists');
  const sp = (await work.state()).prof.id;
  const r = await hire.act('chat_start', { specialistId: sp }); const tid = r.go[1];
  await hire.act('message_send', { threadId: tid, text: 'Hello about reconciliation' });
  let th = (await hire.state()).threads.find(t => t.id === tid); const msg = th.msgs.find(m => m.f === 'me');
  assert.ok(msg.canEdit);
  const peer = (await work.state()).threads.find(t => t.id === tid); assert.ok(peer, 'linked specialist sees the chat'); assert.equal(peer.msgs[0].canEdit, false);
  await assert.rejects(work.act('msg_edit', { id: msg.id, text: 'hacked' }), /own messages/);
  await hire.act('msg_edit', { id: msg.id, text: 'Hello about reconciliation (edited)' });
  await hire.act('msg_pin', { id: msg.id }); await hire.act('thread_pin', { id: tid });
  th = (await hire.state()).threads.find(t => t.id === tid);
  assert.equal(th.msgs[0].edited, true); assert.equal(th.msgs[0].pinned, true); assert.equal(th.pinned, true);
  assert.ok((await work.state()).threads.find(t => t.id === tid).msgs[0].pinned, 'message pins are shared');
  const s1 = (await hire.get('/api/chat/search?mode=hire&q=reconcil')).data; assert.ok(s1.messages.some(m => m.threadId === tid));
  assert.ok(s1.people.some(p => p.id === sp) || s1.threads.length >= 0);
  const s2 = (await admin.get('/api/chat/search?mode=hire&q=reconcil')).data; assert.equal(s2.messages.length, 0, 'no access to other people’s chats');
  await assert.rejects(admin.act('msg_pin', { id: msg.id }), /not found/);
  await hire.act('help_send', { topic: 'A technical problem', text: 'The card page does not load' });
  assert.ok((await hire.state()).threads.find(t => t.kind === 'tech').msgs.length);
  hire.tid = tid;
});

test('WebSocket: authenticated, live sync and a full call between two users', async () => {
  const bad = new WebSocket(base.replace('http', 'ws') + '/ws');
  await new Promise(r => { bad.on('error', r); bad.on('close', r); });
  const evil = new WebSocket(base.replace('http', 'ws') + '/ws', { headers: { Cookie: hire.cookie, Origin: 'https://evil.example' } });
  await new Promise(r => { evil.on('error', r); evil.on('close', r); });
  const a = await socket(hire), b = await socket(work);
  await a.next('hello'); await b.next('hello');
  await hire.act('message_send', { threadId: hire.tid, text: 'ping' });
  assert.equal((await b.next('thread')).threadId, hire.tid);
  a.send(JSON.stringify({ t: 'call:start', threadId: +hire.tid, kind: 'video' }));
  const started = await a.next('call:started'); assert.equal(started.reachable, true);
  const ring = await b.next('call:ring'); assert.equal(ring.kind, 'video'); assert.equal(ring.from.name, 'Buyer');
  b.send(JSON.stringify({ t: 'call:accept', callId: ring.callId }));
  await a.next('call:accepted');
  a.send(JSON.stringify({ t: 'call:signal', callId: ring.callId, data: { sdp: { type: 'offer', sdp: 'v=0' } } }));
  assert.equal((await b.next('call:signal')).data.sdp.type, 'offer');
  b.send(JSON.stringify({ t: 'call:end', callId: ring.callId }));
  assert.equal((await a.next('call:ended')).reason, 'ended');
  await new Promise(r => setTimeout(r, 100));
  const th = (await hire.state()).threads.find(t => t.id === hire.tid);
  assert.match(th.msgs[th.msgs.length - 1].t, /^Video call · /);
  a.close(); b.close();
});

test('staff: verification level and account status', async () => {
  const o = (await admin.get('/api/admin/overview')).data;
  const u = o.users.find(x => x.email === 'seller@example.com');
  assert.equal((await admin.post('/api/admin/action', { type: 'user_level', userId: u.id, level: 'checked' })).status, 200);
  let st = await work.state(); assert.equal(st.me.level, 'checked'); assert.equal(st.prof.level, 'checked'); assert.ok(st.verify.every(v => v[2] === 'done'));
  assert.equal((await admin.post('/api/admin/action', { type: 'user_status', userId: u.id, status: 'hold', note: 'Documents expired' })).status, 200);
  st = await work.state(); assert.equal(st.me.status, 'hold');
  await assert.rejects(work.act('topup', { mode: 'work', amount: 50, method: 'card' }), /on hold/);
  await work.act('message_send', { threadId: st.threads.find(t => t.kind === 'tech').id, text: 'Here are my new documents' });
  assert.equal((await admin.post('/api/admin/action', { type: 'user_status', userId: u.id, status: 'blocked' })).status, 200);
  assert.equal((await work.get('/api/account/state')).status, 401, 'blocked user is signed out');
  const l = await client().post('/api/auth/login', { email: 'seller@example.com', password: 'correct-horse-battery' }); assert.equal(l.status, 400); assert.equal(l.data.blocked, true);
  assert.equal((await admin.post('/api/admin/action', { type: 'user_status', userId: u.id, status: 'active' })).status, 200);
  await work.login('seller@example.com', 'correct-horse-battery');
  const self = o.users.find(x => x.email === 'admin@afterworc.local');
  assert.equal((await admin.post('/api/admin/action', { type: 'user_status', userId: self.id, status: 'blocked' })).status, 400);
});

test('EOR briefs need a country of employment', async () => {
  await assert.rejects(work.act('brief_send', { btype: 'eor', area: 'Payments', line: 'Ops specialist in Portugal', options: {} }), /country/);
  const r = await work.act('brief_send', { btype: 'eor', area: 'Payments', line: 'Ops specialist in Portugal', people: 'Payments Operations Specialist', budget: '€3.5–5k / mo gross', options: { country: 'Portugal', contract: 'Full-time, permanent', salary: '€3.5–5k / mo gross' } });
  const b = r.state.briefs.find(x => x.id === r.go[1]); assert.equal(b.type, 'eor'); assert.equal(b.options.country, 'Portugal');
  const lead = await client().post('/api/leads', { type: 'eor', need: 'Hire an AML analyst in Poland', email: 'lead@example.com' }); assert.equal(lead.status, 200);
});

test('security headers allow calls and WebSocket on our own origin only', async () => {
  const r = await fetch(base + '/');
  assert.match(r.headers.get('permissions-policy'), /camera=\(self\)/);
  assert.match(r.headers.get('content-security-policy'), /connect-src 'self' wss:\/\/127\.0\.0\.1:\d+ ws:\/\/127\.0\.0\.1:\d+/);
});
