'use strict';
const express = require('express');
const crypto = require('crypto');
const D = require('../domain');
const U = require('../util');
const mail = require('../mail');
const { one, all, run } = D;
const { now, HOUR, bad, HttpError, str } = U;

const router = express.Router();
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../db');

router.get('/specialists', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  const rows = all("SELECT * FROM specialists WHERE published=1 ORDER BY level='checked' DESC, deals DESC, name");
  res.json(rows.map(s => {
    const v = D.specView(s);
    return pubSpec(s, v);
  }));
});
const pubSpec = (s, v) => ({ id: v.id, n: v.name, r: v.role, area: v.area, skills: v.skills, rate: v.rate, monthly: v.monthly, lv: s.level === 'checked' ? 'checked' : 'verified',
  now: v.now, avail: v.avail, deals: v.deals, stars: v.rating ? v.rating.toFixed(1) : 'new', city: v.city, langs: v.langs, bio: v.bio, history: v.history, checkedBy: v.checkedBy, checkedOn: v.checkedOn,
  avatar: v.avatar, portfolio: v.portfolio });
router.get('/specialists/:id', (req, res) => {
  const s = one('SELECT * FROM specialists WHERE id=? AND published=1', String(req.params.id).slice(0, 60));
  if (!s) throw new HttpError(404, 'Profile not found');
  res.json(pubSpec(s, D.specView(s, { withPortfolio: true })));
});

/* Approved skills for autocomplete (the catalog is pre-moderated by staff). */
router.get('/skills', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  const rows = q ? all("SELECT name FROM skills WHERE status='approved' AND name LIKE ? ESCAPE '\\' ORDER BY (name LIKE ? ESCAPE '\\') DESC, name LIMIT 20", '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%', q.replace(/[\\%_]/g, m => '\\' + m) + '%')
    : all("SELECT name FROM skills WHERE status='approved' ORDER BY name LIMIT 400");
  res.set('Cache-Control', 'public, max-age=60');
  res.json(rows.map(r => r.name));
});

/* Public images: only files used as someone's photo or in a portfolio. */
router.get('/media/:id', (req, res) => {
  const id = +req.params.id;
  const f = Number.isInteger(id) && one('SELECT * FROM files WHERE id=?', id);
  const used = f && (one('SELECT 1 FROM users WHERE avatar_file_id=? AND closed_at IS NULL', f.id) || one('SELECT 1 FROM portfolio WHERE file_id=?', f.id));
  if (!used || !/^image\/(png|jpeg|gif|webp)$/.test(f.mime)) throw new HttpError(404, 'Not found');
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  fs.createReadStream(path.join(DATA_DIR, 'uploads', path.basename(f.path))).on('error', () => res.status(404).end()).pipe(res);
});

/* WebRTC servers for calls. STUN is public; TURN (for strict networks) comes from the environment. */
router.get('/rtc', (req, res) => {
  if (!req.user) throw new HttpError(401, 'Log in to continue');
  const ice = [{ urls: (process.env.STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302').split(',').map(x => x.trim()).filter(Boolean) }];
  if (process.env.TURN_URL) ice.push({ urls: process.env.TURN_URL.split(','), username: process.env.TURN_USER || '', credential: process.env.TURN_PASS || '' });
  res.json({ iceServers: ice });
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
