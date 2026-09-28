'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const QRCode = require('qrcode');
const { DATA_DIR } = require('../db');
const D = require('../domain');
const U = require('../util');
const mail = require('../mail');
const payments = require('../payments');
const { requireUser, issueToken, destroySession, audit } = require('../auth');
const { one, all, run, tx } = D;
const { now, DAY, HOUR, bad, HttpError, str, int, oneOf, j, eur, fmtDay, fmtDayW, htmlEsc } = U;

const router = express.Router();
router.use(requireUser);

const mode = v => oneOf(v, ['hire', 'work'], 'mode');
const needVerified = u => { if (!u.email_verified) throw bad('Confirm your e-mail address first. We sent you a link.'); };
/* An account on hold can read and talk to us, but cannot move money or start new work. */
const needActive = u => { if (u.status === 'hold') throw bad('Your account is on hold. Contact support to continue.', { onHold: true }); };
const bus = require('../bus');
const need2fa = (u, code) => {
  if (!u.totp_secret) throw bad('Turn on two-factor authentication first', { need2fa: true });
  if (!U.totpCheck(u.id, u.totp_secret, code)) throw bad('That code did not work. Check your authenticator app.');
};
function ownDeal(user, id, side) {
  const d = D.dealRow(int(id, { min: 1, name: 'deal' }));
  if (!d) throw new HttpError(404, 'Deal not found');
  if (side === 'hire' && d.client_user_id !== user.id) throw new HttpError(404, 'Deal not found');
  if (side === 'work') { const s = D.mySpecialist(user.id); if (!s || d.specialist_id !== s.id) throw new HttpError(404, 'Deal not found'); }
  return d;
}
function cardGet(uid, m) { const r = one('SELECT data FROM cards WHERE user_id=? AND mode=?', uid, m); return { ...D.defaultCard('', m), ...j(r && r.data, {}) }; }
function cardSet(uid, m, c) { run('UPDATE cards SET data=? WHERE user_id=? AND mode=?', JSON.stringify(c), uid, m); }
/* Test-range Mastercard numbers (sandbox issuer): 5555 prefix + Luhn check digit. */
function newPan() { const p = '5555' + String(crypto.randomInt(0, 1e11)).padStart(11, '0'); return p + luhnCheck(p); }
function luhnCheck(p) { let s = 0; for (let i = 0; i < p.length; i++) { let d = +p[p.length - 1 - i]; if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } s += d; } return (10 - (s % 10)) % 10; }

/* ---------------- state ---------------- */
router.get('/state', (req, res) => res.json(D.buildState(req.user.id, req.sid)));

/* ---------------- file uploads (delivery files, receipts, ID documents) ---------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(DATA_DIR, 'uploads'),
    filename: (req, file, cb) => cb(null, U.randToken(16))
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => cb(null, /^(image\/(png|jpe?g|gif|webp|heic)|application\/(pdf|zip|x-zip-compressed)|text\/plain|application\/vnd\.openxmlformats[\w.-]*)$/.test(file.mimetype) ? true : cb(bad('That file type is not supported (PDF, images, ZIP, text, Office).')))
});
router.post('/files', upload.array('files', 5), (req, res) => {
  const out = (req.files || []).map(f => {
    const r = run('INSERT INTO files (user_id, name, mime, size, path, created_at) VALUES (?,?,?,?,?,?)', req.user.id, String(f.originalname).slice(0, 180), f.mimetype, f.size, f.filename, now());
    return { id: r.lastInsertRowid, name: f.originalname };
  });
  res.json({ files: out });
});
/* Images for the avatar and the portfolio: checked by their first bytes, not only by the declared type. */
const imgUpload = multer({ storage: multer.diskStorage({ destination: path.join(DATA_DIR, 'uploads'), filename: (req, file, cb) => cb(null, U.randToken(16)) }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype) ? cb(null, true) : cb(bad('Use a PNG, JPG, WebP or GIF image.')) });
function imageKind(file) {
  const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(12); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
router.post('/media', imgUpload.single('file'), (req, res) => {
  const f = req.file; if (!f) throw bad('Choose an image');
  const kind = imageKind(f.path);
  if (!kind) { fs.unlink(f.path, () => {}); throw bad('That file is not a valid image.'); }
  const r = run('INSERT INTO files (user_id, name, mime, size, path, created_at) VALUES (?,?,?,?,?,?)', req.user.id, String(f.originalname).slice(0, 180), kind, f.size, f.filename, now());
  res.json({ file: { id: r.lastInsertRowid, name: f.originalname, url: '/api/account/files/' + r.lastInsertRowid } });
});
router.get('/files/:id', (req, res) => {
  const f = one('SELECT * FROM files WHERE id=?', +req.params.id);
  if (!f) throw new HttpError(404, 'File not found');
  let ok = f.user_id === req.user.id || req.user.is_admin;
  if (!ok && f.deal_id) {
    const d = D.dealRow(f.deal_id); const s = D.mySpecialist(req.user.id);
    ok = d && (d.client_user_id === req.user.id || (s && d.specialist_id === s.id));
  }
  if (!ok) throw new HttpError(404, 'File not found');
  res.setHeader('Content-Type', f.mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Own images may be previewed inline (portfolio editor); everything else downloads.
  const inline = f.user_id === req.user.id && /^image\/(png|jpeg|gif|webp)$/.test(f.mime) && req.query.inline === '1';
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.name)}"`);
  fs.createReadStream(path.join(DATA_DIR, 'uploads', path.basename(f.path))).pipe(res);
});

/* ---------------- invoices + statements (printable HTML) ---------------- */
function docPage(title, rows, meta) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${htmlEsc(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font:14px/1.6 Inter,Arial,sans-serif;color:#0d1a14;max-width:760px;margin:40px auto;padding:0 20px}h1{font:700 26px Arial;margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{border-bottom:1px solid #e2eae5;padding:10px 6px;text-align:left}th{font-size:12px;text-transform:uppercase;color:#5d6c64}.r{text-align:right}.muted{color:#5d6c64}.logo{font:700 20px Arial}.logo i{font-style:normal;color:#2f9e4a}@media print{button{display:none}}</style></head><body>
<button id="print" style="float:right">Print / Save as PDF</button><script src="/assets/print.js"></script><div class="logo">afterwor<i>c</i></div>
<h1 style="margin-top:24px">${htmlEsc(title)}</h1><p class="muted">${meta}</p>${rows}
<p class="muted" style="margin-top:40px;font-size:12px">AfterWorc OÜ · Mäealuse tn 10/2, Mustamäe linnaosa, 12618 Tallinn, Estonia · Registry code 17554808 · info@afterworc.com<br>Test mode: this document reflects the AfterWorc sandbox ledger.</p></body></html>`;
}
router.get('/invoices/:no', (req, res) => {
  const i = one('SELECT * FROM invoices WHERE number=? AND user_id=?', String(req.params.no), req.user.id);
  if (!i) throw new HttpError(404, 'Invoice not found');
  const vat = Math.round(i.amount * 22 / 122 * 100) / 100;
  res.type('html').send(docPage(`Invoice ${i.number}`, `<table><tr><th>Description</th><th class="r">Amount</th></tr><tr><td>${htmlEsc(i.descr)}</td><td class="r">${eur(i.amount)}</td></tr><tr><td class="muted">incl. VAT 22%</td><td class="r muted">${eur(vat)}</td></tr><tr><th>Total</th><th class="r">${eur(i.amount)}</th></tr></table>`,
    `Date ${U.fmtDate(i.created_at)} · Bill to ${htmlEsc(i.bill_to)} · ${htmlEsc(req.user.email)}`));
});
router.get('/statement/:mode', (req, res) => {
  const m = mode(req.params.mode);
  const rows = all('SELECT * FROM transactions WHERE user_id=? AND mode=? ORDER BY id', req.user.id, m);
  res.type('html').send(docPage(`${m === 'hire' ? 'Company' : 'Working'} balance statement`, `<table><tr><th>Date</th><th>Description</th><th>Status</th><th class="r">Amount</th></tr>${rows.map(t => `<tr><td>${fmtDay(t.created_at)}</td><td>${htmlEsc(t.descr)}</td><td class="muted">${htmlEsc(t.status)}</td><td class="r">${eur(t.amount)}</td></tr>`).join('')}</table>`,
    `${htmlEsc(req.user.name)} · ${htmlEsc(req.user.email)} · generated ${U.fmtDate(now())}`));
});
router.get('/export', (req, res) => {
  const uid = req.user.id;
  const { pass_hash, totp_secret, totp_pending, ...user } = one('SELECT * FROM users WHERE id=?', uid);
  const data = { exportedAt: new Date().toISOString(), user, state: D.buildState(uid, req.sid),
    messages: all('SELECT m.* FROM messages m JOIN threads t ON t.id=m.thread_id WHERE t.user_id=? OR t.peer_user_id=?', uid, uid),
    transactions: all('SELECT * FROM transactions WHERE user_id=?', uid), audit: all('SELECT action, detail, ip, created_at FROM audit WHERE user_id=?', uid) };
  audit(req, 'data_export');
  res.setHeader('Content-Disposition', 'attachment; filename="afterworc-data.json"');
  res.json(data);
});

/* ---------------- actions ---------------- */
const ACT = {};

/* --- general --- */
ACT.mode = (u, b) => { run('UPDATE users SET role_pref=? WHERE id=?', mode(b.mode), u.id); };
ACT.acting = (u, b) => {
  const id = b.orgId == null || b.orgId === '' ? null : int(b.orgId, { min: 1, name: 'organization' });
  if (id && !one('SELECT 1 FROM org_members WHERE org_id=? AND user_id=?', id, u.id)) throw bad('Organization not found');
  run('UPDATE users SET acting_org_id=? WHERE id=?', id, u.id);
  return { toast: 'Now acting as ' + D.actingName(D.userById(u.id)) };
};
ACT.notif_read = (u, b) => { run('UPDATE notifications SET unread=0 WHERE id=? AND user_id=?', int(b.id, { min: 1 }), u.id); };
ACT.notif_readall = (u, b) => { run('UPDATE notifications SET unread=0 WHERE user_id=? AND mode=?', u.id, mode(b.mode)); };
ACT.thread_read = (u, b) => {
  const id = int(b.id, { min: 1 });
  run('UPDATE threads SET user_unread=0 WHERE id=? AND user_id=?', id, u.id);
  run('UPDATE threads SET peer_unread=0 WHERE id=? AND peer_user_id=?', id, u.id);
};
ACT.message_send = (u, b) => {
  const id = int(b.threadId, { min: 1, name: 'conversation' });
  const text = str(b.text, { min: 1, max: 4000, name: 'a message' });
  const t = one('SELECT * FROM threads WHERE id=? AND (user_id=? OR peer_user_id=?)', id, u.id, u.id);
  if (!t) throw bad('Conversation not found');
  const mine = t.user_id === u.id;
  D.postMessage(t.id, mine ? 'user' : 'peer', text, u.id, u.name);
  const preview = text.length > 120 ? text.slice(0, 117) + '…' : text;
  if (mine && t.peer_user_id) D.notify(t.peer_user_id, 'work', `New message from ${t.peer_title || u.name}`, preview, 'messages', t.id, 'message');
  if (!mine) D.notify(t.user_id, t.mode, `New message from ${t.title}`, preview, 'messages', t.id, 'message');
  if (t.kind === 'support' || t.kind === 'tech' || (mine && !t.peer_user_id)) mail.toStaff(`${t.kind === 'tech' ? '[Tech support] ' : ''}Message from ${u.name} <${u.email}>`, `${t.kind === 'support' ? 'Support thread' : t.kind === 'tech' ? 'Technical support thread' : 'For specialist ' + t.title + ' (not linked to an account; reply in the console as them)'}:\n\n${text}`);
  return { threadId: String(t.id) };
};
/* --- chats: pins, edits, technical support, new conversations --- */
ACT.thread_pin = (u, b) => {
  const t = D.threadFor(u.id, int(b.id, { min: 1 })); if (!t) throw bad('Conversation not found');
  if (one('SELECT 1 FROM thread_pins WHERE user_id=? AND thread_id=?', u.id, t.id)) { run('DELETE FROM thread_pins WHERE user_id=? AND thread_id=?', u.id, t.id); return { toast: 'Chat unpinned' }; }
  if (one('SELECT COUNT(*) n FROM thread_pins WHERE user_id=?', u.id).n >= 10) throw bad('You can pin up to 10 chats');
  run('INSERT INTO thread_pins (user_id, thread_id, created_at) VALUES (?,?,?)', u.id, t.id, now());
  return { toast: 'Chat pinned' };
};
ACT.msg_pin = (u, b) => {
  const m = one('SELECT * FROM messages WHERE id=?', int(b.id, { min: 1 })); const t = m && D.threadFor(u.id, m.thread_id);
  if (!t || m.sender === 'system') throw bad('Message not found');
  const pinned = one('SELECT 1 FROM message_pins WHERE thread_id=? AND message_id=?', t.id, m.id);
  if (pinned) run('DELETE FROM message_pins WHERE thread_id=? AND message_id=?', t.id, m.id);
  else {
    if (one('SELECT COUNT(*) n FROM message_pins WHERE thread_id=?', t.id).n >= 20) throw bad('Up to 20 pinned messages per chat');
    run('INSERT INTO message_pins (thread_id, message_id, by_user_id, created_at) VALUES (?,?,?,?)', t.id, m.id, u.id, now());
  }
  D.threadChanged(t);
  return { toast: pinned ? 'Message unpinned' : 'Message pinned' };
};
ACT.msg_edit = (u, b) => {
  const m = one('SELECT * FROM messages WHERE id=?', int(b.id, { min: 1 })); const t = m && D.threadFor(u.id, m.thread_id);
  if (!t || m.sender_user_id !== u.id || !['user', 'peer'].includes(m.sender)) throw bad('You can edit only your own messages');
  const text = str(b.text, { min: 1, max: 4000, name: 'a message' });
  if (text === m.body) return {};
  run('UPDATE messages SET body=?, edited_at=? WHERE id=?', text, now(), m.id);
  D.threadChanged(t);
  return { toast: 'Message edited' };
};
ACT.tech_open = (u, b) => { const t = D.techThread(u.id, mode(b.mode || 'hire')); return { go: ['messages', String(t.id)] }; };
ACT.chat_start = (u, b) => {
  const spec = D.specById(str(b.specialistId, { max: 40 }));
  if (!spec || !spec.published) throw bad('Specialist not found');
  if (spec.user_id === u.id) throw bad('That is your own profile');
  const t = D.specialistThread(u.id, spec, D.actingName(u), 'Conversation');
  return { go: ['messages', String(t.id)] };
};
ACT.lang_set = (u, b) => {
  const lang = oneOf(b.lang, ['en', 'et', 'ru'], 'language');
  const p = j(u.prefs, {}); p.lang = lang; run('UPDATE users SET prefs=? WHERE id=?', JSON.stringify(p), u.id);
};
ACT.help_send = (u, b) => {
  const topic = str(b.topic, { max: 80, name: 'topic' }) || 'General';
  const text = str(b.text, { min: 5, max: 4000, name: 'your question' });
  const m = mode(b.mode || 'hire');
  const tech = /technical|app|log-in|login/i.test(topic);
  const t = tech ? D.techThread(u.id, m) : D.supportThread(u.id, m, 'AfterWorc support', 'Help & support');
  D.postMessage(t.id, 'user', `[${topic}] ${text}`, u.id, u.name);
  mail.toStaff(`Help request: ${topic}`, `From ${u.name} <${u.email}> (account ${u.id}):\n\n${text}`);
  return { toast: 'Sent. A person replies within one business day', go: ['messages', String(t.id)] };
};
ACT.book_call = (u, b) => {
  const slot = str(b.slot, { min: 3, max: 60, name: 'a time' });
  const who = str(b.with, { max: 60 }) || 'AfterWorc';
  const spec = who !== 'x' && who !== 'AfterWorc' ? D.specById(who) : null;
  run('INSERT INTO bookings (user_id, kind, with_name, slot, created_at) VALUES (?,?,?,?,?)', u.id, 'call', spec ? spec.name : 'AfterWorc', slot, now());
  const t = spec ? D.specialistThread(u.id, spec, D.actingName(u), 'Call booked') : D.supportThread(u.id, mode(b.mode || 'hire'));
  D.postMessage(t.id, 'system', `15-minute call booked · ${slot}. The video link comes by e-mail.`);
  if (spec && spec.user_id) D.notify(spec.user_id, 'work', `Call booked by ${D.actingName(u)}`, slot, 'messages', t.id, 'message');
  mail.toStaff('Call booked', `${u.name} <${u.email}> booked a 15-minute call with ${spec ? spec.name : 'AfterWorc'} at ${slot}. Send the calendar invite.`);
  mail.send(u.email, 'Your call is booked', `Your 15-minute call with ${spec ? spec.name : 'AfterWorc'} is booked for ${slot}. We send the video link in a calendar invite.`);
  return { toast: 'Call booked · invite sent' };
};

/* --- briefs (hiring) --- */
function briefFields(b) {
  const type = oneOf(b.btype, D.TYPES, 'type');
  const area = oneOf(b.area || 'Development', D.AREAS, 'area');
  const line = str(b.line, { max: 200, name: 'the one-line description' });
  const title = str(b.title, { max: 200, name: 'title' }) || line || `New ${D.TYPEL[type].toLowerCase()} in ${area}`;
  const descr = str(b.desc, { max: 6000, name: 'description' }) || line;
  const people = str(b.people, { max: 600, name: 'people' });
  const budget = str(b.budget, { max: 60, name: 'budget' });
  const start = str(b.start, { max: 60, name: 'start' }) || 'Within 2 weeks';
  const o = b.options || {};
  const options = { countries: str(o.countries, { max: 60 }), visibility: str(o.visibility, { max: 100 }), deadline: str(o.deadline, { max: 20 }), nda: !!o.nda,
    country: str(o.country, { max: 60 }), salary: str(o.salary, { max: 60 }), contract: str(o.contract, { max: 40 }) };
  if (type === 'eor' && !options.country) throw bad('Choose the country where the person will be employed');
  return { type, area, title, descr, people, budget, start, options };
}
ACT.brief_save = (u, b) => {
  const f = briefFields(b);
  const id = b.id ? int(b.id, { min: 1 }) : null;
  if (id) {
    const ex = one("SELECT * FROM briefs WHERE id=? AND user_id=? AND status='draft'", id, u.id); if (!ex) throw bad('Draft not found');
    run('UPDATE briefs SET title=?, type=?, area=?, people=?, budget=?, start=?, descr=?, options=? WHERE id=?', f.title, f.type, f.area, f.people, f.budget, f.start, f.descr, JSON.stringify(f.options), id);
    return { toast: 'Draft saved to Briefs', id: String(id) };
  }
  const r = run("INSERT INTO briefs (user_id, signed_as, title, type, area, people, budget, start, descr, options, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?, 'draft', ?)",
    u.id, D.actingName(u), f.title, f.type, f.area, f.people, f.budget, f.start, f.descr, JSON.stringify(f.options), now());
  return { toast: 'Draft saved to Briefs', id: String(r.lastInsertRowid) };
};
ACT.brief_send = (u, b) => {
  needVerified(u); needActive(u);
  const f = briefFields(b);
  const t = now();
  let id = b.id ? int(b.id, { min: 1 }) : null;
  if (id && !one("SELECT 1 FROM briefs WHERE id=? AND user_id=? AND status='draft'", id, u.id)) id = null;
  if (id) run("UPDATE briefs SET title=?, type=?, area=?, people=?, budget=?, start=?, descr=?, options=?, signed_as=?, status='review', sent_at=? WHERE id=?", f.title, f.type, f.area, f.people, f.budget, f.start, f.descr, JSON.stringify(f.options), D.actingName(u), t, id);
  else id = run("INSERT INTO briefs (user_id, signed_as, title, type, area, people, budget, start, descr, options, status, sent_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?, 'review', ?, ?)",
    u.id, D.actingName(u), f.title, f.type, f.area, f.people, f.budget, f.start, f.descr, JSON.stringify(f.options), t, t).lastInsertRowid;
  const th = D.supportThread(u.id, 'hire');
  D.postMessage(th.id, 'system', `Brief "${f.title}" sent · ${U.fmtDayTime(t)}`);
  run('UPDATE threads SET sub=? WHERE id=?', 'Brief: ' + f.title, th.id);
  D.notify(u.id, 'hire', `Brief sent: ${f.title}`, `Shortlist of up to 3 checked people by ${U.fmtDayTime(t + 48 * HOUR)}`, 'brief', id);
  mail.send(u.email, `We received your brief: ${f.title}`, `Thank you. A person on our matching team reads your brief and may ask one or two questions.\n\nYour shortlist of up to 3 checked people arrives by ${U.fmtDayTime(t + 48 * HOUR)} (Tallinn time).`);
  mail.toStaff(`New brief: ${f.title}`, `${D.actingName(u)} (${u.email})\nType: ${D.TYPEL[f.type]} · ${f.area}\nPeople: ${f.people}\nBudget: ${f.budget}\nStart: ${f.start}\n\n${f.descr}`);
  return { toast: 'Brief sent. We read it shortly', go: ['brief', String(id)] };
};
ACT.brief_delete = (u, b) => { run("DELETE FROM briefs WHERE id=? AND user_id=? AND status='draft'", int(b.id, { min: 1 }), u.id); return { toast: 'Draft deleted', go: ['briefs'] }; };
ACT.brief_close = (u, b) => { run("UPDATE briefs SET status='closed' WHERE id=? AND user_id=? AND status IN ('review','matching','shortlist')", int(b.id, { min: 1 }), u.id); return { toast: 'Brief closed' }; };
ACT.brief_different = (u, b) => {
  const br = one("SELECT * FROM briefs WHERE id=? AND user_id=? AND status='shortlist'", int(b.id, { min: 1 }), u.id);
  if (!br) throw bad('Brief not found');
  const text = str(b.text, { max: 2000 }) || 'Please suggest different people.';
  run("UPDATE briefs SET status='matching' WHERE id=?", br.id);
  const th = D.supportThread(u.id, 'hire');
  D.postMessage(th.id, 'user', `About "${br.title}": ${text}`, u.id, u.name);
  mail.toStaff(`New shortlist requested: ${br.title}`, `${u.email} asked for different people:\n\n${text}`);
  return { toast: 'We have your feedback. New shortlist within 24 h' };
};
ACT.request_proposal = (u, b) => {
  needVerified(u);
  const spec = D.specById(str(b.specialistId, { max: 40 }));
  if (!spec || !spec.published) throw bad('Specialist not found');
  const need = str(b.need, { min: 3, max: 2000, name: 'what you need' });
  const budget = str(b.budget, { max: 40 }); const start = str(b.start, { max: 40 });
  const t = now();
  const bid = run("INSERT INTO briefs (user_id, signed_as, title, type, area, people, budget, start, descr, options, status, sent_at, created_at, shortlist) VALUES (?,?,?,?,?,?,?,?,?,?, 'shortlist', ?, ?, ?)",
    u.id, D.actingName(u), need.length > 80 ? need.slice(0, 77) + '…' : need, 'task', spec.area, spec.name, budget, start, need, '{}', t, t, JSON.stringify([spec.id])).lastInsertRowid;
  run('UPDATE briefs SET ready_at=?, why=? WHERE id=?', t, JSON.stringify({ [spec.id]: 'You asked for this specialist from their profile.' }), bid);
  const th = D.specialistThread(u.id, spec, D.actingName(u), 'Proposal requested');
  D.postMessage(th.id, 'system', 'Proposal requested from the profile page');
  D.postMessage(th.id, 'user', `${need}\n\nBudget: ${budget || 'not set'} · Start: ${start || 'flexible'}`, u.id, u.name);
  if (spec.user_id) {
    run("INSERT INTO opps (specialist_id, brief_id, title, client, kind, budget, descr, why, status, due_at, created_at) VALUES (?,?,?,?,?,?,?,?, 'invited', ?, ?)",
      spec.id, bid, need.slice(0, 120), D.actingName(u), 'Invitation', budget, need, JSON.stringify(['The client asked for you from your profile']), t + 72 * HOUR, t);
    D.notify(spec.user_id, 'work', `Proposal requested by ${D.actingName(u)}`, 'Reply within 72 h', 'opps', null, 'shortlist');
  }
  mail.toStaff(`Proposal requested from ${spec.name}`, `${u.email} (${D.actingName(u)}):\n\n${need}\n\nBudget: ${budget} · Start: ${start}${spec.user_id ? '' : '\n\nThis specialist has no linked account: forward the request and reply in the console as them.'}`);
  return { toast: 'Request sent to ' + spec.name, go: ['messages', String(th.id)] };
};

/* --- deals --- */
ACT.deal_start = (u, b) => {
  needVerified(u); needActive(u);
  const spec = D.specById(str(b.specialistId, { max: 40 }));
  if (!spec || !spec.published) throw bad('Specialist not found');
  if (spec.user_id === u.id) throw bad('You cannot start a deal with yourself');
  const briefId = b.briefId ? int(b.briefId, { min: 1 }) : null;
  const brief = briefId ? one('SELECT * FROM briefs WHERE id=? AND user_id=?', briefId, u.id) : null;
  if (briefId && !brief) throw bad('Brief not found');
  if (brief && !j(brief.shortlist, []).includes(spec.id) && !one("SELECT 1 FROM opps WHERE brief_id=? AND specialist_id=? AND status='sent'", brief.id, spec.id)) throw bad('This person is not on the shortlist');
  const model = oneOf(b.model, ['hourly', 'monthly', 'fixed'], 'payment model');
  const first = str(b.first, { min: 2, max: 120, name: 'the first milestone' });
  const amount = int(b.amount, { min: 1, max: 1000000, name: 'amount' });
  const startDate = str(b.startDate, { max: 40 }) || 'To be agreed';
  const dept = brief && brief.type === 'dept';
  const title = str(b.title, { max: 160 }) || (brief ? brief.title : `Work with ${spec.name}`);
  const t = now();
  const id = tx(() => {
    const id = run('INSERT INTO deals (client_user_id, client_name, specialist_id, brief_id, title, model, kind, monthly, team, status, start_date, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      u.id, D.actingName(u), spec.id, brief ? brief.id : null, title, { hourly: 'Hourly', monthly: dept ? 'Monthly · department' : 'Monthly · team', fixed: 'Fixed price' }[model],
      dept ? 'dept' : 'milestones', model === 'monthly' ? amount : null, JSON.stringify(dept ? [spec.id, ...String(brief.people || '').split(',').map(s => s.replace(/^\s*\d+×\s*/, '').trim()).filter(Boolean).slice(1, 6)] : []), 'proposed', startDate, t).lastInsertRowid;
    run("INSERT INTO milestones (deal_id, idx, name, amount, status) VALUES (?,0,?,?, 'proposed')", id, first, amount);
    if (brief) run("UPDATE briefs SET status='hired' WHERE id=?", brief.id);
    const th = D.specialistThread(u.id, spec, D.actingName(u), 'Terms sent', id);
    D.postMessage(th.id, 'system', `Terms sent: ${title} · ${first} · ${eur(amount)} · start ${startDate}`);
    return id;
  })();
  if (spec.user_id) D.notify(spec.user_id, 'work', `New deal offered: ${title}`, `${D.actingName(u)} · ${first} · ${eur(amount)}`, 'deal', id, 'shortlist');
  else mail.toStaff(`Deal terms sent to ${spec.name}`, `${D.actingName(u)} (${u.email}) sent terms for "${title}": ${first}, ${eur(amount)}. ${spec.name} has no linked account: confirm with them and accept in the console.`);
  return { toast: 'Terms sent to ' + spec.name, go: ['deal', String(id)] };
};
function acceptTerms(d) {
  if (d.status !== 'proposed') throw bad('These terms were already answered');
  tx(() => {
    run("UPDATE deals SET status='active' WHERE id=?", d.id);
    run("UPDATE milestones SET status='unfunded' WHERE deal_id=? AND status='proposed'", d.id);
  })();
  const spec = D.specById(d.specialist_id);
  if (d.client_user_id) D.notify(d.client_user_id, 'hire', `${spec.name} accepted: ${d.title}`, 'Fund milestone 1 to start the work', 'deal', d.id, 'delivery');
}
ACT.deal_accept = (u, b) => { acceptTerms(ownDeal(u, b.dealId, 'work')); return { toast: 'Deal accepted. Work starts when the client funds it' }; };
ACT.deal_decline = (u, b) => {
  const d = ownDeal(u, b.dealId, 'work'); if (d.status !== 'proposed') throw bad('Already answered');
  run("UPDATE deals SET status='declined', closed_at=? WHERE id=?", now(), d.id);
  if (d.client_user_id) D.notify(d.client_user_id, 'hire', `Terms declined: ${d.title}`, 'Pick someone else from the shortlist or message us', 'deal', d.id, 'delivery');
  return { toast: 'Declined', go: ['deals'] };
};
ACT.deal_cancel = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire'); if (d.status !== 'proposed') throw bad('Only unanswered terms can be withdrawn');
  run("UPDATE deals SET status='cancelled', closed_at=? WHERE id=?", now(), d.id);
  return { toast: 'Terms withdrawn', go: ['deals'] };
};
ACT.ms_fund = (u, b) => {
  needActive(u);
  const d = ownDeal(u, b.dealId, 'hire');
  if (d.status !== 'active') throw bad('The specialist has not accepted the terms yet');
  const m = one("SELECT * FROM milestones WHERE id=? AND deal_id=? AND status='unfunded'", int(b.msId, { min: 1 }), d.id);
  if (!m) throw bad('Milestone not found');
  const bl = D.bal(u.id, 'hire');
  if (bl.available < m.amount) throw bad(`Not enough balance: ${eur(bl.available)} available. Top up first.`, { needTopup: m.amount - bl.available });
  const spec = D.specById(d.specialist_id);
  tx(() => {
    run("UPDATE milestones SET status='funded', funded_at=? WHERE id=?", now(), m.id);
    D.moveBal(u.id, 'hire', -m.amount, m.amount);
    D.addTx(u.id, 'hire', `Milestone funded · ${d.title}`, -m.amount, 'Held');
    D.addInvoice(u.id, d.client_name, `${d.title} · ${m.name}`, m.amount);
    if (spec.user_id) { D.moveBal(spec.user_id, 'work', 0, m.amount); }
    D.advance(d.id);
  })();
  if (spec.user_id) D.notify(spec.user_id, 'work', `Funded: ${m.name}`, `${eur(m.amount)} is held for you. Start the work.`, 'deal', d.id, 'payment');
  else mail.toStaff(`Milestone funded for ${spec.name}`, `"${d.title}" · ${m.name} · ${eur(m.amount)}. Tell ${spec.name} to start.`);
  return { toast: `${eur(m.amount)} funded and held` };
};
ACT.ms_add = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire');
  if (!['active', 'proposed'].includes(d.status)) throw bad('This deal is closed');
  const name = str(b.name, { min: 2, max: 120, name: 'milestone name' });
  const amount = int(b.amount, { min: 1, max: 1000000, name: 'amount' });
  const idx = one('SELECT COALESCE(MAX(idx),-1)+1 n FROM milestones WHERE deal_id=?', d.id).n;
  run('INSERT INTO milestones (deal_id, idx, name, amount, status) VALUES (?,?,?,?,?)', d.id, idx, name, amount, d.status === 'proposed' ? 'proposed' : 'unfunded');
  const spec = D.specById(d.specialist_id);
  if (spec.user_id) D.notify(spec.user_id, 'work', `Milestone added: ${name}`, `${d.title} · ${eur(amount)}`, 'deal', d.id, 'delivery');
  return { toast: 'Milestone added' };
};
ACT.ms_deliver = (u, b) => {
  const d = ownDeal(u, b.dealId, 'work');
  const m = one("SELECT * FROM milestones WHERE deal_id=? AND status IN ('inprogress','changes') ORDER BY idx LIMIT 1", d.id);
  if (!m) throw bad('Nothing to deliver right now');
  const note = str(b.note, { max: 4000, name: 'note' });
  const fileIds = (Array.isArray(b.files) ? b.files : []).slice(0, 10).map(x => int(x, { min: 1 }));
  for (const f of fileIds) { const row = one('SELECT * FROM files WHERE id=? AND user_id=?', f, u.id); if (!row) throw bad('File not found'); run('UPDATE files SET deal_id=? WHERE id=?', d.id, f); }
  run("UPDATE milestones SET status='delivered', delivered_at=?, delivery_note=?, files=? WHERE id=?", now(), note, JSON.stringify(fileIds), m.id);
  if (d.client_user_id) {
    D.notify(d.client_user_id, 'hire', `Delivered: ${m.name}`, `Review within ${D.REVIEW_DAYS} days or it is accepted automatically`, 'deal', d.id, 'delivery');
    const th = D.specialistThread(d.client_user_id, D.specById(d.specialist_id), d.client_name, 'Delivered: ' + m.name, d.id);
    D.postMessage(th.id, 'system', `${m.name} delivered · auto-accepts ${fmtDayW(now() + D.REVIEW_DAYS * DAY)}`);
  }
  return { toast: `Delivered. ${d.client_name} has ${D.REVIEW_DAYS} days to accept` };
};
ACT.ms_accept = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire');
  const m = one("SELECT * FROM milestones WHERE deal_id=? AND status='delivered' ORDER BY idx LIMIT 1", d.id);
  if (!m) throw bad('Nothing to accept');
  D.releaseMilestone(m.id);
  const spec = D.specById(d.specialist_id);
  if (b.thanks) { const th = D.specialistThread(u.id, spec, d.client_name, 'Milestone released', d.id); D.postMessage(th.id, 'user', `Thank you! "${m.name}" is accepted.`, u.id, u.name); }
  if (!spec.user_id) mail.toStaff(`Released to ${spec.name}`, `${eur(m.amount)} for "${d.title} · ${m.name}". Pay out to ${spec.name} within 2 days.`);
  return { toast: `${eur(m.amount)} released to ${spec.name}` };
};
ACT.ms_changes = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire');
  const m = one("SELECT * FROM milestones WHERE deal_id=? AND status='delivered' ORDER BY idx LIMIT 1", d.id);
  if (!m) throw bad('Nothing to review');
  const text = str(b.text, { min: 3, max: 3000, name: 'what should change' });
  run("UPDATE milestones SET status='changes', change_note=? WHERE id=?", text.slice(0, 300), m.id);
  const spec = D.specById(d.specialist_id);
  const th = D.specialistThread(u.id, spec, d.client_name, 'Changes requested', d.id);
  D.postMessage(th.id, 'user', `Changes requested for "${m.name}":\n${text}`, u.id, u.name);
  if (spec.user_id) D.notify(spec.user_id, 'work', `Changes requested: ${m.name}`, text.slice(0, 140), 'deal', d.id, 'delivery');
  else mail.toStaff(`Changes requested from ${spec.name}`, `"${d.title} · ${m.name}":\n\n${text}`);
  return { toast: 'Request sent. Review clock restarts on resubmission' };
};
ACT.report_approve = (u, b) => {
  const r = one('SELECT r.* FROM reports r JOIN deals d ON d.id=r.deal_id WHERE r.id=? AND d.client_user_id=?', int(b.reportId, { min: 1 }), u.id);
  if (!r) throw bad('Report not found');
  run("UPDATE reports SET status='approved' WHERE id=?", r.id);
  return { toast: 'Week approved' };
};
ACT.report_query = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire');
  const text = str(b.text, { min: 3, max: 3000, name: 'your question' });
  const th = D.specialistThread(u.id, D.specById(d.specialist_id), d.client_name, 'Question about a weekly report', d.id);
  D.postMessage(th.id, 'user', text, u.id, u.name);
  mail.toStaff(`Weekly report question: ${d.title}`, `${u.email}:\n\n${text}`);
  return { toast: 'Question sent', go: ['messages', String(th.id)] };
};
ACT.deal_review = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire');
  if (d.status !== 'done' || d.review !== 'pending') throw bad('Nothing to review');
  const stars = int(b.stars, { min: 1, max: 5, name: 'a star rating' });
  const text = str(b.text, { max: 2000 }); const note = str(b.note, { max: 2000 });
  run("UPDATE deals SET review='submitted', review_data=? WHERE id=?", JSON.stringify({ stars, text, note, at: now() }), d.id);
  const s = D.specById(d.specialist_id);
  const rated = all("SELECT review_data FROM deals WHERE specialist_id=? AND review IN ('submitted','done')", s.id).map(r => j(r.review_data, {}).stars).filter(Boolean);
  if (rated.length) run('UPDATE specialists SET rating=? WHERE id=?', Math.round(((s.rating || 5) * Math.max(0, s.deals - rated.length) + rated.reduce((a, x) => a + x, 0)) / Math.max(s.deals, rated.length) * 10) / 10, s.id);
  if (note) mail.toStaff(`Private note about ${s.name}`, `${u.email} on "${d.title}" (${stars}★):\n\n${note}`);
  return { toast: 'Review saved. Published when both sides submit' };
};
ACT.deal_issue = (u, b) => {
  const d = D.dealRow(int(b.dealId, { min: 1 }));
  const s = D.mySpecialist(u.id);
  if (!d || !(d.client_user_id === u.id || (s && s.id === d.specialist_id))) throw bad('Deal not found');
  const text = str(b.text, { min: 5, max: 4000, name: 'what went wrong' });
  run('INSERT INTO issues (deal_id, user_id, text, created_at) VALUES (?,?,?,?)', d.id, u.id, text, now());
  mail.toStaff(`Mediation requested: ${d.title}`, `${u.email} opened an issue on deal #${d.id}:\n\n${text}`);
  mail.send(u.email, 'We received your issue', `A person from AfterWorc reviews both sides and proposes a fair split within 2 business days. The money stays held meanwhile.\n\nDeal: ${d.title}`);
  return { toast: 'Mediator assigned. Reply within 2 business days' };
};
ACT.request_change = (u, b) => {
  const d = ownDeal(u, b.dealId, 'hire');
  const text = str(b.text, { min: 3, max: 2000, name: 'the change' });
  mail.toStaff(`Team change requested: ${d.title}`, `${u.email}:\n\n${text}`);
  const th = D.supportThread(u.id, 'hire'); D.postMessage(th.id, 'user', `Team change for "${d.title}": ${text}`, u.id, u.name);
  return { toast: 'Request sent to the team lead and AfterWorc' };
};

/* --- opportunities (working) --- */
function ownOpp(u, id) {
  const s = D.mySpecialist(u.id); if (!s) throw bad('Complete your profile first');
  const o = one('SELECT * FROM opps WHERE id=? AND specialist_id=?', int(id, { min: 1 }), s.id); if (!o) throw bad('Opportunity not found');
  return { o, s };
}
ACT.opp_propose = (u, b) => {
  const { o, s } = ownOpp(u, b.id);
  if (o.status === 'sent') throw bad('Proposal already sent');
  const p = { rate: str(b.rate, { min: 1, max: 40, name: 'your rate' }), start: str(b.start, { max: 40 }), note: str(b.note, { min: 10, max: 2000, name: 'why you (2–3 lines)' }), at: now() };
  run("UPDATE opps SET status='sent', proposal=? WHERE id=?", JSON.stringify(p), o.id);
  if (o.brief_id) {
    const br = one('SELECT * FROM briefs WHERE id=?', o.brief_id);
    if (br) {
      D.notify(br.user_id, 'hire', `Proposal from ${s.name}`, `${br.title} · ${p.rate}`, 'brief', br.id, 'shortlist');
      const th = D.specialistThread(br.user_id, s, br.signed_as, 'Proposal received');
      D.postMessage(th.id, 'peer', `Proposal for "${br.title}": ${p.rate}, can start ${p.start || 'soon'}.\n\n${p.note}`, u.id, s.name);
    }
  }
  mail.toStaff(`Proposal sent: ${o.title}`, `${s.name} (${u.email}): ${p.rate}, start ${p.start}\n\n${p.note}`);
  return { toast: 'Proposal sent. Reply within 72 h' };
};
ACT.opp_decline = (u, b) => { const { o } = ownOpp(u, b.id); run("UPDATE opps SET status='declined' WHERE id=?", o.id); return { toast: 'Declined. We\'ll tune your matches', go: ['opps'] }; };

/* --- profile + verification (working) --- */
ACT.profile_save = (u, b) => {
  const s = D.mySpecialist(u.id, true);
  const reg = D.registerSkills((Array.isArray(b.skills) ? b.skills : []).slice(0, 12).map(x => str(x, { min: 1, max: 40, name: 'skill' })), u.id);
  const skills = reg.map(x => x.name);
  const pending = reg.filter(x => x.status === 'pending').map(x => x.name);
  if (pending.length) mail.toStaff('Skills waiting for approval', `${u.name} <${u.email}> added: ${pending.join(', ')}.\n\nApprove, merge or delete them in the console › Skills.`);
  const prof = { headline: str(b.headline, { max: 120, name: 'headline' }), profession: str(b.profession, { max: 60 }), about: str(b.about, { max: 2000, name: 'about' }), hours: b.hours ? int(b.hours, { min: 1, max: 80, name: 'hours per week' }) : 30, portfolio: str(b.portfolio, { max: 300, name: 'portfolio link' }) };
  if (prof.portfolio && !/^https?:\/\//i.test(prof.portfolio)) throw bad('The portfolio link must start with https://');
  const rate = b.rate === '' || b.rate == null ? null : int(b.rate, { min: 5, max: 1000, name: 'rate' });
  const avail = str(b.avail, { max: 40 }) || 'Available now';
  const area = D.AREAS.includes(b.area) ? b.area : s.area;
  const city = str(b.city, { max: 60 }); const name = str(b.name, { max: 80 }) || u.name;
  run('UPDATE specialists SET name=?, role=?, area=?, skills=?, rate=?, avail=?, available_now=?, city=?, bio=?, profile=? WHERE id=?',
    name, prof.headline || prof.profession, area, JSON.stringify(skills), rate, avail, /now/i.test(avail) ? 1 : 0, city, prof.about, JSON.stringify(prof), s.id);
  if (name !== u.name) run('UPDATE users SET name=? WHERE id=?', name, u.id);
  return { toast: pending.length ? `Profile saved. New skills appear after a check by our team: ${pending.join(', ')}` : s.published ? 'Profile saved. Changes are live' : 'Profile saved' };
};
ACT.profile_submit = (u, b) => {
  needVerified(u);
  const s = D.mySpecialist(u.id, true); const p = j(s.profile, {});
  const missing = [!p.headline && 'a headline', !j(s.skills, []).length && 'skills', !s.rate && 'a rate', !p.about && 'an about text'].filter(Boolean);
  if (missing.length) throw bad('Add ' + missing.join(', ') + ' first');
  run('UPDATE specialists SET submitted_at=? WHERE id=?', now(), s.id);
  mail.toStaff(`Profile submitted: ${s.name}`, `${u.email} submitted their profile for review. Publish it in the console after the ID check.`);
  return { toast: 'Submitted. Your profile goes public after your ID check' };
};
function setVerify(uid, key, val) { const u = D.userById(uid); const v = j(u.verify, {}); v[key] = { ...(v[key] || {}), ...val }; run('UPDATE users SET verify=? WHERE id=?', JSON.stringify(v), uid); }
ACT.verify_id = (u, b) => {
  const f = one('SELECT * FROM files WHERE id=? AND user_id=?', int(b.fileId, { min: 1, name: 'document' }), u.id); if (!f) throw bad('Upload your ID document first');
  setVerify(u.id, 'id', { st: 'pending', sub: 'Document received · checked within 1 business day', file: f.id });
  mail.toStaff(`ID document uploaded: ${u.name}`, `${u.email} uploaded "${f.name}" for the ID check.`);
  return { toast: 'Document received. We check it within 1 business day' };
};
ACT.verify_refs = (u, b) => {
  const refs = (Array.isArray(b.refs) ? b.refs : []).slice(0, 3).map(r => r && typeof r === 'object' ? r : {}).map(r => ({ name: str(r.name, { min: 2, max: 80, name: 'referee name' }), email: U.email(r.email), company: str(r.company, { max: 80 }) }));
  if (refs.length < 2) throw bad('Add two referees');
  setVerify(u.id, 'refs', { st: 'pending', sub: `${refs.length} referees · we call them`, refs });
  mail.toStaff(`References submitted: ${u.name}`, refs.map(r => `${r.name} <${r.email}> ${r.company}`).join('\n'));
  return { toast: 'Thanks. We contact your referees' };
};
ACT.verify_interview = (u, b) => {
  const slot = str(b.slot, { min: 3, max: 60, name: 'a time' });
  setVerify(u.id, 'interview', { st: 'pending', sub: `Booked ${slot} · Tallinn or video`, slot });
  run('INSERT INTO bookings (user_id, kind, with_name, slot, created_at) VALUES (?,?,?,?,?)', u.id, 'interview', 'AfterWorc', slot, now());
  mail.toStaff(`Interview booked: ${u.name}`, `${u.email} booked the verification interview: ${slot}.`);
  mail.send(u.email, 'Your AfterWorc interview is booked', `Your verification interview is booked for ${slot}. It takes 30 minutes, in person at Mäealuse 10/2, Tallinn, or by video. We send a calendar invite.`);
  return { toast: 'Interview booked · invite sent' };
};

/* --- money (sandbox) --- */
ACT.topup = async (u, b) => {
  needVerified(u); needActive(u);
  const m = mode(b.mode); const a = int(b.amount, { min: 1, max: 100000, name: 'amount' });
  const method = oneOf(b.method, ['bank', 'sepa', 'card', 'wallet'], 'payment method');
  if (payments.enabled() && method !== 'sepa') {
    if (a < 5) throw bad('Top up at least €5');
    return { redirect: await payments.createCheckout(u, m, a) };
  }
  const lab = { bank: 'bank link', sepa: 'SEPA transfer', card: 'card', wallet: 'phone wallet' }[method];
  if (method === 'sepa') {
    D.addTx(u.id, m, 'Top up · SEPA transfer', a, 'Pending', `AW-${u.id}-${m.toUpperCase()}`);
    mail.toStaff('SEPA top-up announced', `${u.email} announced a SEPA transfer of ${eur(a)} to the ${m} balance (reference AW-${u.id}-${m.toUpperCase()}). Confirm it in the console when it arrives.`);
    return { toast: `We'll add ${eur(a)} when the transfer arrives (1 business day)` };
  }
  tx(() => { D.moveBal(u.id, m, a, 0); D.addTx(u.id, m, 'Top up · ' + lab, a, 'Completed · test mode'); })();
  return { toast: `${eur(a)} added to your ${m === 'hire' ? 'company' : 'Working'} balance` };
};
/* Only money earned through deals can go to a bank; top-ups can be spent on the platform but not withdrawn. */
function withdrawable(uid) {
  const earned = one("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE user_id=? AND mode='work' AND amount>0 AND descr LIKE 'Released%'", uid).s;
  const paid = -one("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE user_id=? AND mode='work' AND descr='Paid out to bank'", uid).s;
  return Math.max(0, Math.min(D.bal(uid, 'work').available, earned - paid));
}
ACT.withdraw = (u, b) => {
  needActive(u);
  need2fa(u, b.code);
  const amt = withdrawable(u.id); if (amt <= 0) throw bad('Nothing to withdraw. Only earnings released from deals can be paid out.');
  const tax = j(u.tax, {});
  if (!tax.iban) throw bad('Add your IBAN in Settings › Tax & invoicing first');
  tx(() => { D.moveBal(u.id, 'work', -amt, 0); D.addTx(u.id, 'work', 'Paid out to bank', -amt, `To ••${tax.iban.slice(-2)} · processing`); })();
  mail.toStaff('Payout requested', `${u.email} withdrew ${eur(amt)} to ${tax.iban} (${tax.holder || u.name}).`);
  audit({ user: u, ip: '' }, 'withdraw', eur(amt));
  return { toast: `${eur(amt)} on its way to your bank · 1–2 business days` };
};

/* --- card (sandbox: issued by the test issuer) --- */
ACT.card_issue = (u, b) => {
  needActive(u);
  const m = mode(b.mode);
  need2fa(u, b.code);
  if (!b.terms) throw bad('Accept the cardholder terms');
  const kind = oneOf(b.kind, ['virtual', 'both'], 'card type');
  const name = str(b.name, { min: 2, max: 21, name: 'the name on the card' }).toUpperCase();
  const addr = kind === 'both' ? str(b.addr, { min: 5, max: 200, name: 'a delivery address' }) : '';
  const c = cardGet(u.id, m);
  if (c.st === 'active') throw bad('You already have a card');
  const pan = newPan(); const d = new Date(); const exp = String(d.getMonth() + 1).padStart(2, '0') + '/' + String((d.getFullYear() + 4) % 100).padStart(2, '0');
  Object.assign(c, { st: 'active', name, org: m === 'hire' ? D.actingName(u) : '', last4: pan.slice(-4), exp, phys: kind === 'both' ? 'shipping' : 'none', addr, frozen: false, side: 'front', pan, cvc: String(crypto.randomInt(100, 1000)), pin: String(crypto.randomInt(0, 10000)).padStart(4, '0'), shippedAt: kind === 'both' ? now() : null });
  cardSet(u.id, m, c);
  D.notify(u.id, m, 'Your AfterWorc card is ready', `Mastercard debit ••${c.last4}${kind === 'both' ? ' · plastic card on its way' : ''}`, 'card', null, 'card');
  return { toast: 'Your virtual card is ready' + (kind === 'both' ? '. Plastic card on its way' : ''), go: ['card'] };
};
function cardAct(u, b, fn) { const m = mode(b.mode); const c = cardGet(u.id, m); if (c.st !== 'active') throw bad('Get your card first'); const r = fn(c, m); cardSet(u.id, m, c); return r; }
ACT.card_freeze = (u, b) => cardAct(u, b, c => { c.frozen = !c.frozen; return { toast: c.frozen ? 'Card frozen. Payments are declined' : 'Card unfrozen' }; });
ACT.card_side = (u, b) => cardAct(u, b, c => { c.side = c.side === 'front' ? 'back' : 'front'; });
ACT.card_toggle = (u, b) => cardAct(u, b, c => { const k = oneOf(b.k, ['online', 'contactless', 'atm', 'abroad'], 'control'); c.tg[k] = !c.tg[k]; return { toast: { online: 'Online payments', contactless: 'Contactless', atm: 'ATM withdrawals', abroad: 'Payments abroad' }[k] + (c.tg[k] ? ' on' : ' off') }; });
ACT.card_limits = (u, b) => cardAct(u, b, c => {
  const n = { day: int(b.day, { max: 50000, name: 'daily limit' }), month: int(b.month, { max: 200000, name: 'monthly limit' }), atm: int(b.atm, { max: 5000, name: 'ATM limit' }) };
  if ((n.day > c.lim.day || n.month > c.lim.month || n.atm > c.lim.atm)) need2fa(u, b.code);
  c.lim = n; return { toast: 'Limits saved' };
});
ACT.card_wallet = (u, b) => cardAct(u, b, c => { const k = oneOf(b.k, ['apple', 'google'], 'wallet'); c.wal[k] = true; return { toast: 'Added to ' + (k === 'apple' ? 'Apple Pay' : 'Google Pay') }; });
ACT.card_order = (u, b) => cardAct(u, b, c => { if (c.phys !== 'none') throw bad('Already ordered'); c.addr = str(b.addr, { min: 5, max: 200, name: 'a delivery address' }); c.phys = 'shipping'; c.shippedAt = now(); return { toast: 'Physical card ordered · 5–7 business days' }; });
ACT.card_activate = (u, b) => cardAct(u, b, c => { if (c.phys !== 'shipping') throw bad('Nothing to activate'); c.phys = 'active'; return { toast: 'Physical card activated' }; });
ACT.card_lost = (u, b) => cardAct(u, b, c => {
  const o = oneOf(b.o, ['keep', 'replace', 'freeze'], 'option');
  if (o === 'freeze') { c.frozen = true; return; }
  if (o === 'keep') { c.frozen = true; return { toast: 'Card stays frozen' }; }
  const pan = newPan(); Object.assign(c, { pan, last4: pan.slice(-4), cvc: String(crypto.randomInt(100, 1000)), frozen: false }); if (c.phys !== 'none') { c.phys = 'shipping'; c.shippedAt = now(); }
  mail.toStaff('Card reported lost', `${u.email} blocked and replaced card (${b.mode}).`);
  return { toast: 'Old card blocked. New number ••' + c.last4 + ' is ready' };
});
ACT.card_reveal = (u, b) => {
  const m = mode(b.mode); need2fa(u, b.code); const c = cardGet(u.id, m); if (c.st !== 'active') throw bad('Get your card first');
  audit({ user: u, ip: '' }, 'card_reveal', b.what);
  return b.what === 'pin' ? { reveal: { pin: c.pin } } : { reveal: { pan: c.pan.replace(/(\d{4})(?=\d)/g, '$1 '), cvc: c.cvc, exp: c.exp } };
};
ACT.card_receipt = (u, b) => {
  const t = one('SELECT * FROM card_tx WHERE id=? AND user_id=?', int(b.txId, { min: 1 }), u.id); if (!t) throw bad('Payment not found');
  const f = one('SELECT * FROM files WHERE id=? AND user_id=?', int(b.fileId, { min: 1 }), u.id); if (!f) throw bad('Upload the receipt first');
  run('UPDATE card_tx SET receipt_file=? WHERE id=?', f.id, t.id); return { toast: 'Receipt attached' };
};

/* --- settings --- */
ACT.twofa_begin = async (u) => {
  if (u.totp_secret) throw bad('Two-factor authentication is already on');
  const secret = U.newTotpSecret();
  run('UPDATE users SET totp_pending=? WHERE id=?', secret, u.id);
  const uri = `otpauth://totp/AfterWorc:${encodeURIComponent(u.email)}?secret=${secret}&issuer=AfterWorc&digits=6&period=30`;
  const qr = await QRCode.toString(uri, { type: 'svg', margin: 1, width: 180 });
  return { twofa: { secret: secret.replace(/(.{4})/g, '$1 ').trim(), uri, qr } };
};
ACT.twofa_confirm = (u, b) => {
  const x = D.userById(u.id);
  if (!x.totp_pending || !U.totpCheck(u.id, x.totp_pending, b.code)) throw bad('That code did not work. Check your authenticator app.');
  run('UPDATE users SET totp_secret=totp_pending, totp_pending=NULL WHERE id=?', u.id);
  mail.send(u.email, 'Two-factor authentication is on', 'Two-factor authentication is now on for your AfterWorc account. If this wasn\'t you, contact info@afterworc.com right away.');
  return { toast: 'Two-factor authentication on' };
};
ACT.twofa_disable = (u, b) => {
  need2fa(u, b.code);
  run('UPDATE users SET totp_secret=NULL WHERE id=?', u.id);
  mail.send(u.email, 'Two-factor authentication is off', 'Two-factor authentication was turned off for your AfterWorc account. If this wasn\'t you, contact info@afterworc.com right away.');
  return { toast: 'Two-factor authentication off' };
};
ACT.password_change = (u, b, req) => {
  U.gateCheck('pwchg:' + u.id, 6);
  if (!U.verifyPassword(String(b.current || ''), D.userById(u.id).pass_hash)) { U.gateFail('pwchg:' + u.id, 15 * 60000); throw bad('Your current password is not right'); }
  const pw = str(b.next, { min: 10, max: 200, name: 'the new password', trim: false });
  if (pw.length < 10) throw bad('Use at least 10 characters for the password');
  if (String(b.repeat ?? '') !== pw) throw bad('The new passwords do not match');
  if (pw === String(b.current)) throw bad('Choose a password different from the current one');
  if (u.totp_secret) { if (!b.code) throw bad('Enter the code from your authenticator app', { need2faCode: true }); need2fa(u, b.code); }
  run('UPDATE users SET pass_hash=?, password_changed_at=? WHERE id=?', U.hashPassword(pw), now(), u.id);
  run('DELETE FROM sessions WHERE user_id=? AND id!=?', u.id, req.sid);
  mail.send(u.email, 'Your password was changed', 'Your AfterWorc password was changed and other sessions were signed out. If this wasn\'t you, reset your password and contact info@afterworc.com.');
  return { toast: 'Password changed. Other sessions signed out' };
};
ACT.email_change = (u, b) => {
  U.gateCheck('emchg:' + u.id, 6);
  if (!U.verifyPassword(String(b.password || ''), D.userById(u.id).pass_hash)) { U.gateFail('emchg:' + u.id, 15 * 60000); throw bad('Your password is not right'); }
  const e = U.email(b.email);
  if (e === u.email.toLowerCase()) throw bad('That is already your e-mail');
  if (one('SELECT 1 FROM users WHERE email=?', e)) throw bad('That e-mail is already used by another account');
  if (u.totp_secret) { if (!b.code) throw bad('Enter the code from your authenticator app', { need2faCode: true }); need2fa(u, b.code); }
  const t = issueToken('email', u.id, 2 * DAY, { email: e });
  const p = j(u.prefs, {}); p.pendingEmail = { email: e, until: now() + 2 * DAY }; run('UPDATE users SET prefs=? WHERE id=?', JSON.stringify(p), u.id);
  const link = `${mail.BASE_URL}/api/auth/confirm-email?token=${t}`;
  mail.send(e, 'Confirm your new e-mail address', `Confirm this address for your AfterWorc account:\n\n${link}\n\nThe link works for 48 hours. Until you open it, your account keeps using ${u.email}.`);
  mail.send(u.email, 'Your AfterWorc e-mail is being changed', `Someone asked to move your AfterWorc account to ${e}. The change happens only after the new address is confirmed.\n\nIf this wasn't you, change your password and contact info@afterworc.com right away.`);
  return { toast: 'Confirmation link sent to ' + e, devLink: mail.devLinks() ? link : undefined };
};
ACT.email_cancel = u => { const p = j(u.prefs, {}); delete p.pendingEmail; run('UPDATE users SET prefs=? WHERE id=?', JSON.stringify(p), u.id); run("DELETE FROM tokens WHERE user_id=? AND kind='email' AND used_at IS NULL", u.id); return { toast: 'E-mail change cancelled' }; };
/* --- avatar + portfolio --- */
/* Only files that really are PNG, JPEG, GIF or WebP (checked by their bytes) can become public images. */
function ownImage(u, id) {
  const f = one('SELECT * FROM files WHERE id=? AND user_id=?', int(id, { min: 1, name: 'image' }), u.id);
  if (!f || !/^image\//.test(f.mime)) throw bad('Upload the image first');
  let kind = null; try { kind = imageKind(path.join(DATA_DIR, 'uploads', path.basename(f.path))); } catch { /* missing file */ }
  if (!kind) throw bad('That file is not a valid image.');
  if (kind !== f.mime) run('UPDATE files SET mime=? WHERE id=?', kind, f.id);
  return f;
}
ACT.avatar_set = (u, b) => { const f = ownImage(u, b.fileId); run('UPDATE users SET avatar_file_id=? WHERE id=?', f.id, u.id); return { toast: 'Photo updated' }; };
ACT.avatar_remove = u => { run('UPDATE users SET avatar_file_id=NULL WHERE id=?', u.id); return { toast: 'Photo removed' }; };
function portfolioFields(b) {
  const f = { title: str(b.title, { min: 2, max: 120, name: 'a title' }), descr: str(b.descr, { max: 1500, name: 'description' }), url: str(b.url, { max: 300, name: 'link' }) };
  if (f.url && !/^https?:\/\//i.test(f.url)) throw bad('The link must start with https://');
  return f;
}
ACT.portfolio_add = (u, b) => {
  if (one('SELECT COUNT(*) n FROM portfolio WHERE user_id=?', u.id).n >= 24) throw bad('Up to 24 portfolio items');
  const f = portfolioFields(b); const img = b.fileId ? ownImage(u, b.fileId) : null;
  if (!img && !f.url) throw bad('Add an image or a link');
  const idx = one('SELECT COALESCE(MAX(idx),-1)+1 n FROM portfolio WHERE user_id=?', u.id).n;
  run('INSERT INTO portfolio (user_id, title, descr, url, file_id, idx, created_at) VALUES (?,?,?,?,?,?,?)', u.id, f.title, f.descr, f.url, img ? img.id : null, idx, now());
  return { toast: 'Added to your portfolio' };
};
ACT.portfolio_update = (u, b) => {
  const p = one('SELECT * FROM portfolio WHERE id=? AND user_id=?', int(b.id, { min: 1 }), u.id); if (!p) throw bad('Item not found');
  const f = portfolioFields(b); const img = b.fileId ? ownImage(u, b.fileId) : null;
  run('UPDATE portfolio SET title=?, descr=?, url=?, file_id=? WHERE id=?', f.title, f.descr, f.url, img ? img.id : b.removeImage ? null : p.file_id, p.id);
  return { toast: 'Portfolio item saved' };
};
ACT.portfolio_delete = (u, b) => { run('DELETE FROM portfolio WHERE id=? AND user_id=?', int(b.id, { min: 1 }), u.id); return { toast: 'Removed from your portfolio' }; };
ACT.portfolio_move = (u, b) => {
  const list = all('SELECT id FROM portfolio WHERE user_id=? ORDER BY idx, id', u.id).map(r => r.id);
  const id = int(b.id, { min: 1 }); const i = list.indexOf(id); const k = i + (b.dir === 'up' ? -1 : 1);
  if (i < 0 || k < 0 || k >= list.length) return {};
  [list[i], list[k]] = [list[k], list[i]];
  tx(() => list.forEach((x, n) => run('UPDATE portfolio SET idx=? WHERE id=?', n, x)))();
  return {};
};
ACT.sessions_revoke = (u, b, req) => {
  if (b.id === 'others') { run('DELETE FROM sessions WHERE user_id=? AND id!=?', u.id, req.sid); return { toast: 'Signed out everywhere else' }; }
  const id = str(b.id, { min: 8, max: 64 });
  run('DELETE FROM sessions WHERE user_id=? AND id LIKE ? AND id!=?', u.id, id.replace(/[%_]/g, '') + '%', req.sid);
  return { toast: 'Session ended' };
};
ACT.prefs_save = (u, b) => {
  const p = D.prefsOf(u);
  const obj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (!obj(b.email)) b.email = null; if (!obj(b.app)) b.app = null; if (!obj(b.cookies)) b.cookies = null;
  for (const k of D.NOTIF_KEYS) {
    if (b.email && k in b.email) p.email[k] = !!b.email[k];
    if (b.app && k in b.app && !['shortlist', 'delivery', 'payment'].includes(k)) p.app[k] = !!b.app[k];
  }
  if (b.cookies) { p.cookies.analytics = !!b.cookies.analytics; p.cookies.marketing = !!b.cookies.marketing; }
  run('UPDATE users SET prefs=? WHERE id=?', JSON.stringify(p), u.id);
  run('UPDATE users SET news_optin=? WHERE id=?', p.email.news ? 1 : 0, u.id);
  return { toast: 'Preferences saved' };
};
ACT.tax_save = (u, b) => {
  const t = { country: str(b.country, { max: 60 }) || 'Estonia', taxId: str(b.taxId, { max: 40 }), vatStatus: str(b.vatStatus, { max: 40 }), invoicesTo: b.invoicesTo ? U.email(b.invoicesTo) : '', holder: str(b.holder, { max: 80 }), iban: str(b.iban, { max: 40 }).replace(/\s/g, '').toUpperCase() };
  if (t.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(t.iban)) throw bad('That IBAN does not look right');
  run('UPDATE users SET tax=? WHERE id=?', JSON.stringify({ ...j(u.tax, {}), ...t }), u.id);
  return { toast: 'Tax details saved' };
};
ACT.profile_name = (u, b) => { const n = str(b.name, { min: 2, max: 80, name: 'your name' }); run('UPDATE users SET name=? WHERE id=?', n, u.id); run('UPDATE specialists SET name=? WHERE user_id=?', n, u.id); return { toast: 'Name saved' }; };
ACT.org_create = (u, b) => {
  const name = str(b.name, { min: 2, max: 120, name: 'company name' });
  const id = tx(() => {
    const id = run('INSERT INTO orgs (name, country, vat, created_by, created_at) VALUES (?,?,?,?,?)', name, str(b.country, { max: 60 }) || 'Estonia', str(b.vat, { max: 30 }), u.id, now()).lastInsertRowid;
    run("INSERT INTO org_members (org_id, user_id, role) VALUES (?,?,'Owner')", id, u.id);
    run('UPDATE users SET acting_org_id=? WHERE id=?', id, u.id);
    return id;
  })();
  return { toast: `${name} added. You now act as this company` };
};
ACT.org_update = (u, b) => {
  const o = one("SELECT o.* FROM orgs o JOIN org_members m ON m.org_id=o.id WHERE o.id=? AND m.user_id=? AND m.role='Owner'", int(b.orgId, { min: 1 }), u.id);
  if (!o) throw bad('Only owners can edit the company');
  run('UPDATE orgs SET name=?, country=?, vat=? WHERE id=?', str(b.name, { min: 2, max: 120, name: 'company name' }), str(b.country, { max: 60 }) || o.country, str(b.vat, { max: 30 }), o.id);
  return { toast: 'Company saved' };
};
ACT.org_invite = (u, b) => {
  const o = one("SELECT o.* FROM orgs o JOIN org_members m ON m.org_id=o.id WHERE o.id=? AND m.user_id=? AND m.role='Owner'", int(b.orgId, { min: 1 }), u.id);
  if (!o) throw bad('Only owners can invite');
  const e = U.email(b.email); const role = oneOf(b.role, ['Can hire', 'View only', 'Finance'], 'role');
  const t = U.randToken(24);
  run('INSERT INTO org_invites (org_id, email, role, token_hash, created_at) VALUES (?,?,?,?,?)', o.id, e, role, U.sha256(t), now());
  mail.send(e, `${u.name} invited you to ${o.name} on AfterWorc`, `${u.name} invited you to join ${o.name} on AfterWorc (${role}).\n\nAccept: ${mail.BASE_URL}/api/auth/org-invite?token=${t}\n\nNo account yet? Sign up with this e-mail first, then open the link again.`);
  return { toast: 'Invitation sent' };
};
ACT.account_close = (u, b, req, res) => {
  if (!U.verifyPassword(String(b.password || ''), D.userById(u.id).pass_hash)) throw bad('Your password is not right');
  const how = oneOf(b.how, ['close', 'delete'], 'option');
  if (String(b.confirm || '').trim().toUpperCase() !== how.toUpperCase()) throw bad(`Type ${how.toUpperCase()} to confirm`);
  const s = D.mySpecialist(u.id);
  const open = one("SELECT COUNT(*) n FROM deals WHERE status IN ('active','proposed') AND (client_user_id=? OR specialist_id=?)", u.id, s ? s.id : '').n;
  if (open) throw bad('Finish or cancel your open deals first');
  const bl = ['hire', 'work'].map(m => D.bal(u.id, m)).reduce((a, x) => a + x.available + x.held, 0);
  if (bl > 0) throw bad('Withdraw or spend your balance first');
  if (how === 'close') {
    run('UPDATE users SET closed_at=? WHERE id=?', now(), u.id);
    if (s) run('UPDATE specialists SET published=0 WHERE id=?', s.id);
  } else {
    tx(() => {
      const anon = `deleted-${u.id}-${U.randToken(4)}@deleted.invalid`;
      if (s) run("UPDATE specialists SET user_id=NULL, published=0, name='Deleted user', bio='', profile='{}', city='' WHERE id=?", s.id);
      run('UPDATE deals SET client_user_id=NULL WHERE client_user_id=?', u.id);
      run("UPDATE users SET email=?, name='Deleted user', pass_hash='x', totp_secret=NULL, prefs='{}', tax='{}', verify='{}', closed_at=? WHERE id=?", anon, now(), u.id);
      run('DELETE FROM threads WHERE user_id=?', u.id);
      run('DELETE FROM notifications WHERE user_id=?', u.id);
      run('DELETE FROM briefs WHERE user_id=? AND id NOT IN (SELECT brief_id FROM deals WHERE brief_id IS NOT NULL)', u.id);
    })();
  }
  run('DELETE FROM sessions WHERE user_id=?', u.id);
  mail.toStaff(`Account ${how}d`, `User #${u.id} ${how}d their account.`);
  return { toast: how === 'close' ? 'Account closed' : 'Account deleted', logout: true };
};

router.post('/action', async (req, res) => {
  const b = req.body || {};
  const fn = typeof b.type === 'string' && Object.hasOwn(ACT, b.type) ? ACT[b.type] : null;
  if (!fn) throw bad('Unknown action');
  if (req.user.closed_at) throw new HttpError(403, 'Account closed');
  if (req.user.status === 'blocked') throw new HttpError(403, 'This account is blocked');
  U.rateLimit('act:' + req.user.id, 120, 60000);
  const u = D.userById(req.user.id);
  const r = (await fn(u, b, req, res)) || {};
  if (r.logout) { destroySession(req, res); return res.json({ ok: true, ...r }); }
  bus.sync(req.user.id); // other tabs and devices of this user
  res.json({ ok: true, ...r, state: D.buildState(req.user.id, req.sid) });
});

module.exports = { router, ACT };
