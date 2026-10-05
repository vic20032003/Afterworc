'use strict';
/* The team's app (Compass) hears about a new sign-up and a new brief at once, and nothing secret is sent. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const got = [];
const hook = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => { got.push({ key: req.headers['x-aw-hook-key'], body: JSON.parse(body) }); res.end('{"ok":true}'); });
});
let server, base;
test.before(async () => {
  await new Promise(r => hook.listen(0, '127.0.0.1', r));
  process.env.NODE_ENV = 'test';
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-hook-'));
  process.env.COMPASS_HOOK_URL = `http://127.0.0.1:${hook.address().port}/api/platform/hook`;
  process.env.COMPASS_HOOK_KEY = 'k-test';
  const { createApp } = require('../server/index');
  server = createApp().listen(0); await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`; process.env.BASE_URL = base;
});
test.after(() => { server.close(); hook.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

const wait = async (n) => { for (let i = 0; i < 50 && got.length < n; i++) await new Promise(r => setTimeout(r, 50)); };

test('a sign-up and a brief reach Compass, with the shared key and no password', async () => {
  let cookie = '';
  const req = async (method, p, body) => {
    const r = await fetch(base + p, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afterworc', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/aw_sid=([^;]*)/); if (m) cookie = 'aw_sid=' + m[1]; }
    return { status: r.status, data: (r.headers.get('content-type') || '').includes('json') ? await r.json() : null };
  };
  const r = await req('POST', '/api/auth/register', { email: 'buyer@finpay.example', name: 'Mari Kask', password: 'correct-horse-battery', role: 'hire', terms: true });
  assert.equal(r.status, 200);
  await wait(1);
  const s = got[0];
  assert.equal(s.key, 'k-test');
  assert.deepEqual([s.body.events[0].type, s.body.events[0].name, s.body.events[0].role], ['signup', 'Mari Kask', 'hire']);
  assert.ok(!JSON.stringify(s.body).includes('correct-horse-battery'), 'no password');
  const v = new URL(r.data.devLink); await req('GET', v.pathname + v.search);
  const b = await req('POST', '/api/account/action', { type: 'brief_send', btype: 'task', area: 'Development', line: 'Payments QA lead', desc: 'Card flows', people: 'QA', budget: '€1–5k', start: 'Within 2 weeks' });
  assert.equal(b.status, 200);
  await wait(2);
  const e = got[1].body.events[0];
  assert.deepEqual([e.type, e.title, e.email], ['brief', 'Payments QA lead', 'buyer@finpay.example']);
  assert.match(e.url, /\/admin$/);
});
