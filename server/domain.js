'use strict';
/* AfterWorc business logic shared by the account API and the staff console. */
const { db } = require('./db');
const mail = require('./mail');
const U = require('./util');
const { now, DAY, HOUR, j, bad, HttpError, eur, fmtDay, fmtDayW, fmtDayTime, fmtAgo, inDays } = U;

const REVIEW_DAYS = 7;
const WORKER_FEE_PCT = Number(process.env.WORKER_FEE_PCT || 0);
const MATCHER = { name: process.env.MATCHER_NAME || 'AfterWorc matching', role: process.env.MATCHER_ROLE || 'Matching team · a person reads every brief' };
const AREAS = ['Development', 'Design', 'Marketing', 'Business Support', 'Content', 'Data & Infrastructure', 'Quality & Security'];
const TYPES = ['task', 'person', 'team', 'dept'];
const TYPEL = { task: 'Task', person: 'Specialist', team: 'Ready team', dept: 'Department' };
const NOTIF_KEYS = ['shortlist', 'delivery', 'payment', 'card', 'message', 'news'];
const DEFAULT_PREFS = { email: { shortlist: true, delivery: true, payment: true, card: true, message: false, news: false }, app: { shortlist: true, delivery: true, payment: true, card: true, message: true, news: true }, cookies: { analytics: false, marketing: false } };
const VERIFY_STEPS = [['id', 'ID verified'], ['skills', 'Skills test'], ['refs', 'References'], ['interview', 'Interview in person'], ['checked', 'Checked in person']];

const tx = fn => db.transaction(fn);
const one = (sql, ...a) => db.prepare(sql).get(...a);
const all = (sql, ...a) => db.prepare(sql).all(...a);
const run = (sql, ...a) => db.prepare(sql).run(...a);

/* =========================================================
   Users, specialists, orgs
   ========================================================= */
function userById(id) { return one('SELECT * FROM users WHERE id=?', id); }
function prefsOf(u) { const p = j(u.prefs, {}); return { email: { ...DEFAULT_PREFS.email, ...(p.email || {}) }, app: { ...DEFAULT_PREFS.app, ...(p.app || {}) }, cookies: { ...DEFAULT_PREFS.cookies, ...(p.cookies || {}) } }; }

function ensureUserSetup(userId) {
  for (const m of ['hire', 'work']) {
    run('INSERT OR IGNORE INTO balances (user_id, mode, available, held) VALUES (?,?,0,0)', userId, m);
    const u = userById(userId);
    run('INSERT OR IGNORE INTO cards (user_id, mode, data) VALUES (?,?,?)', userId, m, JSON.stringify(defaultCard(u.name, m)));
  }
}
function defaultCard(name, mode) {
  return { st: 'none', name: name || '', org: '', last4: '', exp: '', frozen: false, phys: 'none', side: 'front', addr: '',
    lim: mode === 'hire' ? { day: 2000, month: 10000, atm: 0 } : { day: 1500, month: 5000, atm: 500 },
    tg: { online: true, contactless: true, atm: mode !== 'hire', abroad: true }, wal: { apple: false, google: false } };
}

function mySpecialist(userId, create = false) {
  let s = one('SELECT * FROM specialists WHERE user_id=?', userId);
  if (!s && create) {
    const u = userById(userId);
    run(`INSERT INTO specialists (id, user_id, name, role, area, skills, rate, level, avail, available_now, city, langs, bio, published, profile, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`, 'u' + userId, userId, u.name || u.email.split('@')[0], '', 'Development', '[]', null,
      'registered', 'Available now', 1, '', 'EN', '', JSON.stringify({ headline: '', profession: '', about: '', hours: 30, portfolio: '' }), now());
    s = one('SELECT * FROM specialists WHERE user_id=?', userId);
  }
  return s;
}

function specView(s) {
  if (!s) return null;
  return {
    id: s.id, name: s.name, role: s.role || 'Specialist', area: s.area, skills: j(s.skills, []), rate: s.rate, monthly: s.monthly,
    lv: s.level === 'checked' ? 'checked' : s.level === 'verified' ? 'id' : 'registered', level: s.level,
    avail: s.avail, now: !!s.available_now, city: s.city, langs: s.langs, deals: s.deals, rating: s.rating,
    bio: s.bio, checkedBy: s.checked_by, checkedOn: s.checked_on, history: j(s.history, []), linked: !!s.user_id, published: !!s.published
  };
}
function specById(id) { return one('SELECT * FROM specialists WHERE id=?', id); }

function orgsOf(userId) {
  return all('SELECT o.*, m.role FROM org_members m JOIN orgs o ON o.id=m.org_id WHERE m.user_id=? ORDER BY o.id', userId);
}
function actingName(u) {
  if (u.acting_org_id) { const o = one('SELECT o.name FROM org_members m JOIN orgs o ON o.id=m.org_id WHERE m.user_id=? AND o.id=?', u.id, u.acting_org_id); if (o) return o.name; }
  return u.name || u.email;
}

/* =========================================================
   Notifications, messages
   ========================================================= */
function notify(userId, mode, title, sub, route = 'home', param = null, key = null, emailBody = null) {
  if (!userId) return;
  const u = userById(userId); if (!u || u.closed_at) return;
  const p = prefsOf(u);
  if (!key || p.app[key] !== false) run('INSERT INTO notifications (user_id, mode, title, sub, route, param, unread, created_at) VALUES (?,?,?,?,?,?,1,?)', userId, mode, title, sub || '', route, param == null ? null : String(param), now());
  if (key && p.email[key]) {
    const link = `${mail.BASE_URL}/app#/${mode}/${route}${param ? '/' + param : ''}`;
    mail.send(u.email, title, `${emailBody || sub || title}\n\nOpen in AfterWorc: ${link}\n\nYou can change which e-mails you get in Settings › Notifications.`);
  }
}

function supportThread(userId, mode, title, sub) {
  let t = one("SELECT * FROM threads WHERE user_id=? AND mode=? AND kind='support' ORDER BY id LIMIT 1", userId, mode);
  if (!t) {
    const r = run("INSERT INTO threads (user_id, mode, kind, title, sub, updated_at) VALUES (?,?,'support',?,?,?)", userId, mode, title || `${MATCHER.name}`, sub || 'Questions, briefs and support', now());
    t = one('SELECT * FROM threads WHERE id=?', r.lastInsertRowid);
  }
  return t;
}
function specialistThread(clientId, spec, clientLabel, sub, dealId = null) {
  let t = one("SELECT * FROM threads WHERE user_id=? AND kind='specialist' AND specialist_id=?", clientId, spec.id);
  if (!t) {
    const r = run("INSERT INTO threads (user_id, mode, kind, peer_user_id, specialist_id, deal_id, title, peer_title, sub, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      clientId, 'hire', 'specialist', spec.user_id || null, spec.id, dealId, spec.name, clientLabel, sub || '', now());
    t = one('SELECT * FROM threads WHERE id=?', r.lastInsertRowid);
  } else if (sub) run('UPDATE threads SET sub=?, deal_id=COALESCE(?, deal_id) WHERE id=?', sub, dealId, t.id);
  return t;
}
/** sender: 'user' (thread owner), 'peer' (linked specialist), 'staff', 'relay' (staff writing as unlinked specialist), 'system' */
function postMessage(threadId, sender, body, senderUserId = null, senderName = '') {
  const t = one('SELECT * FROM threads WHERE id=?', threadId); if (!t) throw bad('Conversation not found');
  run('INSERT INTO messages (thread_id, sender, sender_user_id, sender_name, body, created_at) VALUES (?,?,?,?,?,?)', threadId, sender, senderUserId, senderName, body, now());
  const inc = { user_unread: sender !== 'user' ? 1 : 0, peer_unread: sender !== 'peer' && t.peer_user_id ? 1 : 0, staff_unread: sender === 'user' || sender === 'peer' ? (t.kind === 'support' || !t.peer_user_id || sender === 'peer' ? 1 : 0) : 0 };
  if (sender === 'system') { inc.user_unread = 0; inc.peer_unread = 0; inc.staff_unread = 0; }
  run('UPDATE threads SET user_unread=user_unread+?, peer_unread=peer_unread+?, staff_unread=staff_unread+?, updated_at=? WHERE id=?', inc.user_unread, inc.peer_unread, inc.staff_unread, now(), threadId);
  return t;
}

/* =========================================================
   Money (sandbox ledger: no real funds move)
   ========================================================= */
function bal(userId, mode) { return one('SELECT * FROM balances WHERE user_id=? AND mode=?', userId, mode) || { available: 0, held: 0 }; }
function addTx(userId, mode, descr, amount, status, ref = null) {
  run('INSERT INTO transactions (user_id, mode, descr, amount, status, ref, created_at) VALUES (?,?,?,?,?,?,?)', userId, mode, descr, amount, status, ref, now());
}
function moveBal(userId, mode, dAvail, dHeld) {
  run('INSERT OR IGNORE INTO balances (user_id, mode) VALUES (?,?)', userId, mode);
  run('UPDATE balances SET available=available+?, held=held+? WHERE user_id=? AND mode=?', dAvail, dHeld, userId, mode);
}
function nextInvoiceNo() {
  const y = new Date().getFullYear();
  const r = one('SELECT COALESCE(MAX(id),0) n FROM invoices');
  return `AW-${y}-${String(r.n + 1).padStart(4, '0')}`;
}
function addInvoice(userId, billTo, descr, amount) {
  const no = nextInvoiceNo();
  run('INSERT INTO invoices (number, user_id, bill_to, descr, amount, created_at) VALUES (?,?,?,?,?,?)', no, userId, billTo, descr, amount, now());
  return no;
}

/* =========================================================
   Deals
   ========================================================= */
function dealRow(id) { return one('SELECT * FROM deals WHERE id=?', id); }
function msRows(dealId) { return all('SELECT * FROM milestones WHERE deal_id=? ORDER BY idx', dealId); }

/** Make the first funded milestone "in progress" when nothing else is being worked on. */
function advance(dealId) {
  const ms = msRows(dealId);
  if (!ms.some(m => ['inprogress', 'delivered', 'changes'].includes(m.status))) {
    const f = ms.find(m => m.status === 'funded');
    if (f) run("UPDATE milestones SET status='inprogress' WHERE id=?", f.id);
  }
  const d = dealRow(dealId);
  if (d.status === 'active' && ms.length && ms.every(m => m.status === 'released')) {
    run("UPDATE deals SET status='done', review=COALESCE(review,'pending'), closed_at=? WHERE id=?", now(), dealId);
    const spec = specById(d.specialist_id);
    run('UPDATE specialists SET deals=deals+1 WHERE id=?', d.specialist_id);
    if (d.client_user_id) notify(d.client_user_id, 'hire', `Deal completed: ${d.title}`, `Leave a review for ${spec.name}`, 'deal', d.id);
  }
}

function releaseMilestone(msId, auto = false) {
  const m = one('SELECT * FROM milestones WHERE id=?', msId);
  if (!m || m.status !== 'delivered') throw bad('Nothing to accept');
  const d = dealRow(m.deal_id); const spec = specById(d.specialist_id);
  tx(() => {
    run("UPDATE milestones SET status='released', released_at=? WHERE id=?", now(), m.id);
    if (d.client_user_id) {
      moveBal(d.client_user_id, 'hire', 0, -m.amount);
      addTx(d.client_user_id, 'hire', `Milestone released · ${spec.name}`, 0, `${eur(m.amount)} released${auto ? ' (auto)' : ''}`);
    }
    if (spec.user_id) {
      const fee = Math.round(m.amount * WORKER_FEE_PCT / 100);
      moveBal(spec.user_id, 'work', m.amount - fee, -m.amount);
      addTx(spec.user_id, 'work', `Released · ${d.title}`, m.amount - fee, `Fee ${eur(fee)}`);
      notify(spec.user_id, 'work', `${eur(m.amount - fee)} released: ${m.name}`, `${d.client_name} accepted${auto ? ' (automatically after 7 days)' : ''}. Spend it with your card or withdraw.`, 'money', null, 'payment');
    }
    if (auto && d.client_user_id) notify(d.client_user_id, 'hire', `Auto-accepted: ${m.name}`, `${eur(m.amount)} released to ${spec.name} after 7 days`, 'deal', d.id, 'payment');
    advance(d.id);
  })();
}

/** Accept deliveries nobody reviewed in 7 days. */
function sweepAutoAccept() {
  const due = all("SELECT id FROM milestones WHERE status='delivered' AND delivered_at < ?", now() - REVIEW_DAYS * DAY);
  for (const r of due) { try { releaseMilestone(r.id, true); } catch (e) { console.error('auto-accept', e.message); } }
  return due.length;
}

function msNote(m, d, idx, ms, side) {
  const spec = specById(d.specialist_id);
  switch (m.status) {
    case 'released': return `Released ${fmtDay(m.released_at || now())}`;
    case 'delivered': { const due = (m.delivered_at || now()) + REVIEW_DAYS * DAY; return side === 'hire' ? `Delivered ${fmtDayW(m.delivered_at)} · auto-accepts ${inDays(due)} (${fmtDayW(due)})` : `Delivered ${fmtDayW(m.delivered_at)} · client has until ${fmtDayW(due)}`; }
    case 'unfunded': return side === 'hire' ? 'Fund when you are ready to start' : 'Waiting for the client to fund';
    case 'funded': { const prev = ms.slice(0, idx).findIndex(x => x.status !== 'released'); return `Funded · starts after milestone ${prev >= 0 ? prev + 1 : idx}`; }
    case 'inprogress': return `Funded ${fmtDay(m.funded_at || now())} · in progress`;
    case 'changes': return `Changes requested: ${m.change_note || 'see messages'}`;
    case 'proposed': return side === 'hire' ? `Waiting for ${spec.name} to accept` : 'Accept the terms to start';
    default: return '';
  }
}

function dealView(d, side, viewerId) {
  const ms = msRows(d.id);
  const spec = specById(d.specialist_id);
  const files = all('SELECT id, name, deal_id FROM files WHERE deal_id=?', d.id);
  const fmap = Object.fromEntries(files.map(f => [f.id, f]));
  const reports = all('SELECT * FROM reports WHERE deal_id=? ORDER BY id DESC', d.id);
  const thread = side === 'hire'
    ? one("SELECT id FROM threads WHERE user_id=? AND kind='specialist' AND specialist_id=?", viewerId, d.specialist_id)
    : (d.client_user_id ? one("SELECT id FROM threads WHERE user_id=? AND kind='specialist' AND specialist_id=?", d.client_user_id, d.specialist_id) : null);
  const total = ms.reduce((a, m) => a + m.amount, 0);
  const monthsIn = d.kind === 'dept' ? Math.max(1, ms.filter(m => m.status !== 'unfunded' && m.status !== 'proposed').length) : 0;
  return {
    id: String(d.id), side, title: d.title, with: d.specialist_id, client: d.client_name, model: d.model, kind: d.kind,
    total, monthly: d.monthly, status: d.status, review: d.review, start: d.start_date, created: fmtDay(d.created_at),
    team: j(d.team, []), month: d.kind === 'dept' ? `Month ${monthsIn} of ${Math.max(monthsIn, ms.length)}` : '',
    threadId: thread ? String(thread.id) : null,
    ms: ms.map((m, i) => ({ id: m.id, n: m.name, amt: m.amount, st: m.status, note: msNote(m, d, i, ms, side), deliveryNote: m.delivery_note,
      files: j(m.files, []).map(fid => fmap[fid]).filter(Boolean).map(f => ({ id: f.id, name: f.name })),
      autoAt: m.delivered_at ? fmtDayW(m.delivered_at + REVIEW_DAYS * DAY) : null, dueIn: m.delivered_at ? inDays(m.delivered_at + REVIEW_DAYS * DAY) : null })),
    reports: d.kind === 'dept' ? reports.map(r => ({ id: r.id, w: r.week, st: r.status, hrs: r.hours, sum: r.summary, due: 'approve by ' + fmtDayW(r.created_at + REVIEW_DAYS * DAY) })) : null,
    clientVerified: !!d.client_user_id, specName: spec ? spec.name : ''
  };
}

/* =========================================================
   Briefs
   ========================================================= */
function briefView(b, viewer) {
  const sl = j(b.shortlist, []);
  const why = j(b.why, {});
  const proposals = all("SELECT o.*, s.name sname FROM opps o JOIN specialists s ON s.id=o.specialist_id WHERE o.brief_id=? AND o.status='sent'", b.id);
  const deal = one('SELECT id FROM deals WHERE brief_id=? ORDER BY id DESC LIMIT 1', b.id);
  return {
    id: String(b.id), title: b.title, type: b.type, area: b.area, people: b.people, budget: b.budget || 'Help me scope', start: b.start,
    status: b.status, desc: b.descr, options: j(b.options, {}), signedAs: b.signed_as,
    sent: b.sent_at ? fmtDayTime(b.sent_at) : null, promised: b.sent_at ? fmtDayTime(b.sent_at + 48 * HOUR) : null,
    ready: b.ready_at ? fmtDayTime(b.ready_at) : null,
    readyIn: b.ready_at && b.sent_at ? Math.max(1, Math.round((b.ready_at - b.sent_at) / HOUR)) + ' h' : null,
    matcher: { name: b.matcher_name || MATCHER.name, role: b.matcher_role || MATCHER.role },
    shortlist: sl, why, proposals: proposals.map(o => { const p = j(o.proposal, {}); return { id: o.id, spec: o.specialist_id, name: o.sname, rate: p.rate, start: p.start, note: p.note }; }),
    dealId: deal ? String(deal.id) : null
  };
}

/* =========================================================
   Account state (everything the account UI renders)
   ========================================================= */
function buildState(userId, sid) {
  sweepAutoAccept();
  const u = userById(userId);
  ensureUserSetup(userId);
  const spec = mySpecialist(userId);
  const orgs = orgsOf(userId);
  const people = {};
  const addPerson = id => { if (id && !people[id]) { const s = specById(id); if (s) people[id] = specView(s); } };
  for (const s of all('SELECT * FROM specialists WHERE published=1 ORDER BY level=\'checked\' DESC, deals DESC LIMIT 300')) people[s.id] = specView(s);

  const briefs = all('SELECT * FROM briefs WHERE user_id=? ORDER BY COALESCE(sent_at, created_at) DESC', userId).map(b => briefView(b, u));
  briefs.forEach(b => { b.shortlist.forEach(addPerson); b.proposals.forEach(p => addPerson(p.spec)); });

  const deals = [
    ...all('SELECT * FROM deals WHERE client_user_id=? ORDER BY id DESC', userId).map(d => dealView(d, 'hire', userId)),
    ...(spec ? all('SELECT * FROM deals WHERE specialist_id=? ORDER BY id DESC', spec.id).map(d => dealView(d, 'work', userId)) : [])
  ].filter(d => !(d.side === 'work' && d.status === 'declined'));
  deals.forEach(d => addPerson(d.with));

  const opps = spec ? all('SELECT * FROM opps WHERE specialist_id=? AND status!=\'declined\' ORDER BY id DESC', spec.id).map(o => ({
    id: String(o.id), title: o.title, client: o.client, kind: o.kind, budget: o.budget, desc: o.descr, why: j(o.why, []), note: o.note,
    status: o.status, due: o.status === 'sent' ? 'Proposal sent ' + fmtDay(j(o.proposal, {}).at || o.created_at) : o.due_at ? (o.status === 'invited' ? 'Reply by ' : 'Open until ') + fmtDayTime(o.due_at) : '',
    proposal: j(o.proposal, null), by: o.kind === 'Invitation' ? MATCHER.name : null
  })) : [];

  const threads = all(`SELECT t.*, u.name AS owner_name FROM threads t JOIN users u ON u.id=t.user_id WHERE t.user_id=? OR t.peer_user_id=? ORDER BY t.updated_at DESC`, userId, userId).map(t => {
    const mine = t.user_id === userId;
    const msgs = all('SELECT * FROM messages WHERE thread_id=? ORDER BY id', t.id).map(m => ({
      f: m.sender === 'system' ? 'sys' : ((mine && m.sender === 'user') || (!mine && m.sender === 'peer')) ? 'me' : 'them',
      t: m.body, tm: fmtAgo(m.created_at), who: m.sender === 'staff' ? (m.sender_name || 'AfterWorc') : ''
    }));
    return { id: String(t.id), kind: t.kind, name: mine ? t.title : (t.peer_title || t.owner_name), sub: t.sub, mode: mine ? t.mode : 'work',
      unread: mine ? !!t.user_unread : !!t.peer_unread, specialist: mine ? t.specialist_id : null, msgs };
  });

  const notifs = all('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 60', userId).map(n => ({ id: n.id, mode: n.mode, t: n.title, s: n.sub, go: [n.route, n.param], unread: !!n.unread, at: fmtAgo(n.created_at) }));

  const money = {};
  for (const m of ['hire', 'work']) {
    const b = bal(userId, m);
    money[m] = {
      available: b.available, held: b.held,
      tx: all('SELECT * FROM transactions WHERE user_id=? AND mode=? ORDER BY id DESC LIMIT 60', userId, m).map(t => [fmtDay(t.created_at), t.descr, t.amount, t.status]),
      pending: all("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE user_id=? AND mode=? AND status='Pending'", userId, m)[0].s
    };
  }
  money.hire.inv = all('SELECT * FROM invoices WHERE user_id=? ORDER BY id DESC', userId).map(i => [i.number, fmtDay(i.created_at), i.descr, i.amount]);
  money.hire.nextInvoice = all("SELECT COALESCE(SUM(monthly),0) s FROM deals WHERE client_user_id=? AND kind='dept' AND status='active'", userId)[0].s;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  money.work.earnedMonth = all("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE user_id=? AND mode='work' AND descr LIKE 'Released%' AND created_at>=?", userId, monthStart.getTime())[0].s;

  const cards = {};
  for (const m of ['hire', 'work']) {
    const row = one('SELECT data FROM cards WHERE user_id=? AND mode=?', userId, m);
    const c = { ...defaultCard(u.name, m), ...j(row && row.data, {}) };
    delete c.pan; delete c.cvc; delete c.pin;
    c.tx = all('SELECT * FROM card_tx WHERE user_id=? AND mode=? ORDER BY id DESC LIMIT 50', userId, m).map(t => ({ id: t.id, d: fmtDay(t.created_at), descr: t.descr, amt: t.amount, ch: t.channel, receipt: !!t.receipt_file }));
    c.spent = -all('SELECT COALESCE(SUM(amount),0) s FROM card_tx WHERE user_id=? AND mode=? AND created_at>=?', userId, m, monthStart.getTime())[0].s;
    cards[m] = c;
  }

  const v = j(u.verify, {});
  const verify = VERIFY_STEPS.map(([k, label]) => {
    const s = v[k] || {};
    const st = s.st === 'done' ? 'done' : s.st ? 'cur' : 'todo';
    const sub = s.sub || (s.st === 'done' ? 'Done' : k === 'checked' ? 'Seal appears on your profile' : s.st === 'pending' ? 'Submitted · being reviewed' : 'Not started');
    return [label, sub, st, k, s.st || null];
  });

  let prof = null;
  if (spec) {
    const p = j(spec.profile, {});
    prof = { headline: p.headline || spec.role || '', profession: p.profession || '', about: p.about || spec.bio || '', skills: j(spec.skills, []), rate: spec.rate || '', hours: p.hours || 30,
      avail: spec.avail, portfolio: p.portfolio || '', area: spec.area, city: spec.city, langs: spec.langs, status: spec.published ? 'published' : spec.submitted_at ? 'submitted' : 'draft', level: spec.level, id: spec.id };
  }

  const sessions = all('SELECT id, created_at, last_seen, ua, ip FROM sessions WHERE user_id=? ORDER BY last_seen DESC', userId).map(s => ({ id: s.id.slice(0, 16), current: s.id === sid, ua: uaLabel(s.ua), ip: s.ip, seen: fmtAgo(s.last_seen) }));

  return {
    me: { id: u.id, name: u.name || u.email.split('@')[0], email: u.email, initials: U.initials(u.name || u.email), verified: !!u.email_verified, admin: !!u.is_admin, rolePref: u.role_pref, created: U.fmtDate(u.created_at), passwordChanged: u.password_changed_at ? fmtDay(u.password_changed_at) : null, termsAt: u.terms_accepted_at ? fmtDay(u.terms_accepted_at) : null },
    acting: actingName(u), actingOrgId: u.acting_org_id || null,
    orgs: orgs.map(o => ({ id: o.id, name: o.name, country: o.country, vat: o.vat, role: o.role, members: all('SELECT u.name, u.email, m.role FROM org_members m JOIN users u ON u.id=m.user_id WHERE m.org_id=?', o.id), invites: all('SELECT email, role, created_at FROM org_invites WHERE org_id=? AND accepted_at IS NULL', o.id).map(i => ({ email: i.email, role: i.role, at: fmtDay(i.created_at) })) })),
    twofa: !!u.totp_secret, people, briefs, deals, opps, threads, notifs, money, cards, verify, prof,
    prefs: prefsOf(u), tax: j(u.tax, {}), sessions, feePct: WORKER_FEE_PCT, sandbox: !require('./payments').enabled(), matcher: MATCHER
  };
}
function uaLabel(ua) {
  ua = String(ua || '');
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${br}`;
}

module.exports = {
  REVIEW_DAYS, WORKER_FEE_PCT, MATCHER, AREAS, TYPES, TYPEL, NOTIF_KEYS, VERIFY_STEPS, DEFAULT_PREFS,
  tx, one, all, run, userById, prefsOf, ensureUserSetup, defaultCard, mySpecialist, specView, specById, orgsOf, actingName,
  notify, supportThread, specialistThread, postMessage, bal, addTx, moveBal, addInvoice,
  dealRow, msRows, advance, releaseMilestone, sweepAutoAccept, dealView, briefView, buildState
};
