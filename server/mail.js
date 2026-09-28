'use strict';
const { db } = require('./db');
const { now, htmlEsc } = require('./util');

const BASE_URL = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const FROM = process.env.MAIL_FROM || 'AfterWorc <info@afterworc.com>';
const STAFF_EMAIL = process.env.STAFF_EMAIL || 'info@afterworc.com';

let transport = null;
if (process.env.SMTP_URL) {
  const nodemailer = require('nodemailer');
  transport = nodemailer.createTransport(process.env.SMTP_URL);
}

const insert = db.prepare('INSERT INTO outbox (to_addr, subject, body, status, error, created_at) VALUES (?,?,?,?,?,?)');
const setStatus = db.prepare('UPDATE outbox SET status=?, error=? WHERE id=?');

function html(body) {
  const paras = body.split('\n\n').map(p => {
    const e = htmlEsc(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#065132">$1</a>');
    return `<p style="margin:0 0 14px">${e}</p>`;
  }).join('');
  return `<div style="font:15px/1.6 Inter,Arial,sans-serif;color:#0d1a14;max-width:560px;margin:0 auto;padding:24px">
<div style="font:700 20px Sora,Arial,sans-serif;margin-bottom:18px">afterwor<span style="color:#2f9e4a">c</span></div>${paras}
<p style="margin-top:24px;font-size:12px;color:#5d6c64">AfterWorc OÜ · Mäealuse tn 10/2, 12618 Tallinn, Estonia · registry code 17554808</p></div>`;
}

/** Queue and send an e-mail. Without SMTP_URL the message is logged and kept in the outbox (visible in the staff console). */
function send(to, subject, body) {
  const info = insert.run(to, subject, body, transport ? 'queued' : 'logged', null, now());
  const id = info.lastInsertRowid;
  if (!transport) {
    if (process.env.NODE_ENV !== 'test') console.log(`\n[mail] to=${to}\n[mail] subject=${subject}\n${body}\n`);
    return;
  }
  transport.sendMail({ from: FROM, to, subject, text: body, html: html(body) })
    .then(() => setStatus.run('sent', null, id))
    .catch(e => { setStatus.run('failed', String(e.message || e), id); console.error('[mail] failed', e.message); });
}
const toStaff = (subject, body) => send(STAFF_EMAIL, '[AfterWorc staff] ' + subject, body + `\n\nStaff console: ${BASE_URL}/admin`);

/* Show verification links / codes on screen only for local development without SMTP. Never on a public host. */
const devLinks = () => process.env.NODE_ENV !== 'production' && !transport &&
  (process.env.DEV_LINKS === '1' || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(BASE_URL));

module.exports = { send, toStaff, BASE_URL, hasSmtp: () => !!transport, devLinks };
