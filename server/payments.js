'use strict';
/* Real top-ups through Stripe Checkout (card, Apple Pay, Google Pay).
   Enabled when STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set; otherwise the account stays on the test ledger.
   Balances are credited only from the signed webhook, never from the browser redirect. */
const crypto = require('crypto');
const express = require('express');
const D = require('./domain');
const U = require('./util');
const mail = require('./mail');
const { one, run, tx } = D;

const KEY = process.env.STRIPE_SECRET_KEY || '';
const WH = process.env.STRIPE_WEBHOOK_SECRET || '';
const enabled = () => !!(KEY && WH);

run(`CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, mode TEXT NOT NULL, amount INTEGER NOT NULL,
  status TEXT NOT NULL, created_at INTEGER NOT NULL, completed_at INTEGER)`);

async function stripe(path, params) {
  const body = new URLSearchParams(params).toString();
  const r = await fetch('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('[stripe]', d.error && d.error.message); throw new U.HttpError(502, 'The payment page could not be opened. Try again or use a bank transfer.'); }
  return d;
}

/** Creates a Checkout Session and returns its URL. */
async function createCheckout(user, mode, amount) {
  const s = await stripe('checkout/sessions', {
    mode: 'payment', customer_email: user.email, client_reference_id: String(user.id),
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(amount * 100),
    'line_items[0][price_data][product_data][name]': `AfterWorc balance top-up (${mode === 'hire' ? 'company' : 'Working'} balance)`,
    'metadata[user_id]': String(user.id), 'metadata[mode]': mode, 'metadata[amount]': String(amount),
    success_url: `${mail.BASE_URL}/app?paid=1#/${mode}/money`, cancel_url: `${mail.BASE_URL}/app#/${mode}/money`
  });
  run("INSERT INTO payments (id, user_id, mode, amount, status, created_at) VALUES (?,?,?,?, 'open', ?)", s.id, user.id, mode, amount, U.now());
  return s.url;
}

/** Stripe-Signature: t=timestamp,v1=hex(HMAC_SHA256(secret, `${t}.${rawBody}`)); 5-minute tolerance. */
function verifySignature(raw, header, secret = WH, now = Date.now()) {
  const parts = Object.fromEntries(String(header || '').split(',').map(x => x.split('=')).filter(x => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header || '').split(',').filter(x => x.trim().startsWith('v1=')).map(x => x.trim().slice(3));
  const t = +parts.t;
  if (!t || !sigs.length || Math.abs(now / 1000 - t) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return sigs.some(s => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

/** Credits the balance once per paid session (idempotent). */
function complete(session) {
  const p = one('SELECT * FROM payments WHERE id=?', session.id);
  if (!p || p.status === 'paid' || session.payment_status !== 'paid') return false;
  if (session.amount_total !== p.amount * 100 || String((session.metadata || {}).user_id) !== String(p.user_id)) { console.error('[stripe] mismatch for', session.id); return false; }
  tx(() => {
    run("UPDATE payments SET status='paid', completed_at=? WHERE id=?", U.now(), p.id);
    D.moveBal(p.user_id, p.mode, p.amount, 0);
    D.addTx(p.user_id, p.mode, 'Top up · card or wallet (Stripe)', p.amount, 'Completed', p.id);
  })();
  D.notify(p.user_id, p.mode, `${U.eur(p.amount)} added to your balance`, 'Card top-up received', 'money', null, 'payment');
  return true;
}

const webhook = express.Router();
webhook.post('/', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  if (!enabled()) return res.status(404).end();
  const raw = req.body.toString('utf8');
  if (!verifySignature(raw, req.get('Stripe-Signature'))) return res.status(400).send('bad signature');
  let ev; try { ev = JSON.parse(raw); } catch { return res.status(400).end(); }
  if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') complete(ev.data.object);
  if (ev.type === 'checkout.session.expired') run("UPDATE payments SET status='expired' WHERE id=? AND status='open'", ev.data.object.id);
  res.json({ received: true });
});

module.exports = { enabled, createCheckout, verifySignature, complete, webhook };
