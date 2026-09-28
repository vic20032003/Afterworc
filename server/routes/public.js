'use strict';
const express = require('express');
const crypto = require('crypto');
const D = require('../domain');
const U = require('../util');
const mail = require('../mail');
const { one, all, run } = D;
const { now, HOUR, bad, HttpError, str } = U;

const router = express.Router();

router.get('/specialists', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  const rows = all("SELECT * FROM specialists WHERE published=1 ORDER BY level='checked' DESC, deals DESC, name");
  res.json(rows.map(s => {
    const v = D.specView(s);
    return { id: v.id, n: v.name, r: v.role, area: v.area, skills: v.skills, rate: v.rate, monthly: v.monthly, lv: s.level === 'checked' ? 'checked' : 'verified',
      now: v.now, avail: v.avail, deals: v.deals, stars: v.rating ? v.rating.toFixed(1) : 'new', city: v.city, langs: v.langs, bio: v.bio, history: v.history, checkedBy: v.checkedBy, checkedOn: v.checkedOn };
  }));
});

const TYPES = { task: 'A task', person: 'A specialist', team: 'A ready team', dept: 'A department' };
const CHANNELS = ['Email only', 'Telegram', 'WhatsApp', 'Phone'];

/* Free assessment request: step 1 stores it and e-mails a 6-digit code; step 2 confirms it. */
router.post('/leads', (req, res) => {
  U.rateLimit('lead:' + req.ip, 8, HOUR);
  const b = req.body || {};
  const email = U.email(b.email);
  const data = { type: TYPES[b.type] ? b.type : 'team', need: str(b.need, { min: 5, max: 4000, name: 'what you need' }), chan: CHANNELS.includes(b.chan) ? b.chan : 'Email only', contact: str(b.contact, { max: 80 }), lang: ['en', 'et', 'ru'].includes(b.lang) ? b.lang : 'en' };
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  const id = run("INSERT INTO leads (kind, email, data, status, code_hash, created_at) VALUES ('assessment', ?, ?, 'unconfirmed', ?, ?)", email, JSON.stringify(data), U.sha256(code), now()).lastInsertRowid;
  mail.send(email, `Your AfterWorc code: ${code}`, `Your confirmation code is ${code}.\n\nEnter it on the page to send your request for a free technical assessment. It works for 1 hour.`);
  res.json({ ok: true, id, devCode: mail.devLinks() ? code : undefined });
});
router.post('/leads/:id/confirm', (req, res) => {
  U.rateLimit('leadc:' + req.ip, 20, HOUR);
  const l = one('SELECT * FROM leads WHERE id=?', +req.params.id);
  if (!l || l.status !== 'unconfirmed') throw bad('This request was already sent or has expired');
  if (l.created_at < now() - HOUR || l.code_tries >= 5) throw bad('The code has expired. Send the request again.');
  run('UPDATE leads SET code_tries=code_tries+1 WHERE id=?', l.id);
  if (U.sha256(String((req.body || {}).code || '').replace(/\s/g, '')) !== l.code_hash) throw bad('That code is not right. Check the e-mail we sent.');
  run("UPDATE leads SET status='new', confirmed_at=? WHERE id=?", now(), l.id);
  const d = U.j(l.data, {});
  mail.send(l.email, 'We received your request', `Thank you. A person on our matching team reads your request and replies in writing within 48 hours.\n\nWhat you need: ${TYPES[d.type]}\n${d.need}`);
  mail.toStaff(`Assessment request: ${TYPES[d.type]}`, `From ${l.email} (reach on: ${d.chan}${d.contact ? ' ' + d.contact : ''}, language ${d.lang}):\n\n${d.need}\n\nReply within 48 hours.`);
  res.json({ ok: true });
});

/* Contact form (About page e-mail alternative) */
router.post('/contact', (req, res) => {
  U.rateLimit('contact:' + req.ip, 5, HOUR);
  const b = req.body || {};
  const email = U.email(b.email);
  const text = str(b.text, { min: 5, max: 4000, name: 'your message' });
  run("INSERT INTO leads (kind, email, data, status, created_at) VALUES ('contact', ?, ?, 'new', ?)", email, JSON.stringify({ text }), now());
  mail.toStaff('Contact form', `From ${email}:\n\n${text}`);
  res.json({ ok: true });
});

module.exports = router;
