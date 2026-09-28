'use strict';
/* Stripe top-ups: checkout creation (Stripe API mocked) and the signed webhook that credits the balance. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs'), os = require('os'), path = require('path');

process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pay-'));
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const realFetch = global.fetch;
let stripeCalls = [];
global.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.stripe.com/')) {
    stripeCalls.push(new URLSearchParams(opts.body));
    return new Response(JSON.stringify({ id: 'cs_test_' + stripeCalls.length, url: 'https://checkout.stripe.com/c/pay/cs_test_' + stripeCalls.length }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, opts);
};

const { createApp } = require('../server/index');
const { db } = require('../server/db');
let server, base, cookie = '';
test.before(async () => { server = createApp().listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

const H = () => ({ 'Content-Type': 'application/json', 'X-Requested-With': 'afterworc', Cookie: cookie });
const sign = (body, t = Math.floor(Date.now() / 1000), secret = 'whsec_test') => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const hook = (body, sig) => realFetch(base + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sig }, body });
const balance = () => db.prepare("SELECT available FROM balances b JOIN users u ON u.id=b.user_id WHERE u.email='demo@afterworc.com' AND mode='hire'").get().available;

test('card top-up goes through Stripe Checkout and is credited only by a signed webhook', async () => {
  const l = await realFetch(base + '/api/auth/login', { method: 'POST', headers: H(), body: JSON.stringify({ email: 'demo@afterworc.com', password: 'afterworc-demo' }) });
  cookie = l.headers.get('set-cookie').split(';')[0];
  const before = balance();
  const r = await (await realFetch(base + '/api/account/action', { method: 'POST', headers: H(), body: JSON.stringify({ type: 'topup', mode: 'hire', amount: 250, method: 'card' }) })).json();
  assert.match(r.redirect, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(stripeCalls[0].get('line_items[0][price_data][unit_amount]'), '25000');
  assert.equal(balance(), before, 'no credit before payment');

  const ev = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 25000, metadata: { user_id: String(db.prepare("SELECT id FROM users WHERE email='demo@afterworc.com'").get().id) } } } });
  assert.equal((await hook(ev, sign(ev, undefined, 'wrong'))).status, 400, 'bad signature rejected');
  assert.equal((await hook(ev, sign(ev, Math.floor(Date.now() / 1000) - 3600))).status, 400, 'stale timestamp rejected');
  assert.equal(balance(), before);
  assert.equal((await hook(ev, sign(ev))).status, 200);
  assert.equal(balance(), before + 250);
  assert.equal((await hook(ev, sign(ev))).status, 200);
  assert.equal(balance(), before + 250, 'replayed event is not credited twice');

  const st = await (await realFetch(base + '/api/account/state', { headers: H() })).json();
  assert.equal(st.sandbox, false, 'UI leaves test mode for money when Stripe is on');
});

test('webhook with a tampered amount is ignored', async () => {
  const before = balance();
  await realFetch(base + '/api/account/action', { method: 'POST', headers: H(), body: JSON.stringify({ type: 'topup', mode: 'hire', amount: 100, method: 'card' }) });
  const uid = String(db.prepare("SELECT id FROM users WHERE email='demo@afterworc.com'").get().id);
  const ev = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_2', payment_status: 'paid', amount_total: 999900, metadata: { user_id: uid } } } });
  assert.equal((await hook(ev, sign(ev))).status, 200);
  assert.equal(balance(), before);
});
