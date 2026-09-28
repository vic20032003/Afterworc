'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../db');
const D = require('../domain');
const U = require('../util');
const mail = require('../mail');
const { requireAdmin, audit } = require('../auth');
const { one, all, run, tx } = D;
const { now, HOUR, DAY, bad, HttpError, str, int, oneOf, j, eur, fmtDay, fmtDayTime, fmtAgo } = U;

const router = express.Router();
router.use(requireAdmin);

router.get('/overview', (req, res) => {
  D.sweepAutoAccept();
  res.json({
    me: { name: req.user.name, email: req.user.email },
    smtp: mail.hasSmtp(),
    leads: all('SELECT * FROM leads ORDER BY id DESC LIMIT 200').map(l => ({ ...l, data: j(l.data, {}), at: fmtDayTime(l.created_at), code_hash: undefined })),
    users: all('SELECT id, email, name, role_pref, email_verified, is_admin, totp_secret IS NOT NULL twofa, verify, closed_at, created_at, level, status, status_note, verified_at, verified_by, avatar_file_id FROM users ORDER BY id DESC LIMIT 500').map(u => ({ ...u, verify: j(u.verify, {}), at: fmtDay(u.created_at), verifiedOn: u.verified_at ? fmtDay(u.verified_at) : null, avatar: D.mediaUrl(u.avatar_file_id), spec: one('SELECT id, published, level, submitted_at FROM specialists WHERE user_id=?', u.id) || null })),
    skills: all(`SELECT s.*, u.email FROM skills s LEFT JOIN users u ON u.id=s.created_by ORDER BY s.status='pending' DESC, s.name COLLATE NOCASE`).map(k => ({ id: k.id, name: k.name, status: k.status, by: k.email, at: fmtDay(k.created_at), uses: skillUses(k.name) })),
    briefs: all('SELECT b.*, u.email FROM briefs b JOIN users u ON u.id=b.user_id WHERE b.status!=\'draft\' ORDER BY b.sent_at DESC LIMIT 300').map(b => ({ ...D.briefView(b), email: b.email, userId: b.user_id, sentAt: b.sent_at, overdue: ['review', 'matching'].includes(b.status) && b.sent_at < now() - 48 * HOUR })),
    specialists: all('SELECT * FROM specialists ORDER BY published DESC, name').map(s => ({ ...D.specView(s), email: s.user_id ? (one('SELECT email FROM users WHERE id=?', s.user_id) || {}).email : null, profile: j(s.profile, {}), submitted: !!s.submitted_at })),
    deals: all('SELECT * FROM deals ORDER BY id DESC LIMIT 300').map(d => ({ ...D.dealView(d, 'hire', d.client_user_id), linked: !!(D.specById(d.specialist_id) || {}).user_id, specName: (D.specById(d.specialist_id) || {}).name })),
    threads: all('SELECT t.*, u.email, u.name owner FROM threads t JOIN users u ON u.id=t.user_id WHERE EXISTS (SELECT 1 FROM messages m WHERE m.thread_id=t.id) ORDER BY t.staff_unread>0 DESC, t.updated_at DESC LIMIT 200').map(t => ({
      id: t.id, kind: t.kind, mode: t.mode, title: t.title, owner: t.owner, email: t.email, sub: t.sub, unread: t.staff_unread, linked: !!t.peer_user_id, at: fmtAgo(t.updated_at),
      userId: t.user_id, peerUserId: t.peer_user_id,
      msgs: all('SELECT sender, sender_name, body, created_at, edited_at FROM messages WHERE thread_id=? ORDER BY id', t.id).map(m => ({ f: m.sender, who: m.sender_name, t: m.body, tm: fmtAgo(m.created_at), edited: !!m.edited_at }))
    })),
    issues: all('SELECT i.*, d.title, u.email FROM issues i JOIN deals d ON d.id=i.deal_id LEFT JOIN users u ON u.id=i.user_id ORDER BY i.status=\'open\' DESC, i.id DESC').map(i => ({ ...i, at: fmtDayTime(i.created_at) })),
    sepa: all("SELECT t.*, u.email FROM transactions t JOIN users u ON u.id=t.user_id WHERE t.status='Pending' ORDER BY t.id").map(t => ({ ...t, at: fmtDay(t.created_at) })),
    payouts: all("SELECT t.*, u.email, u.tax FROM transactions t JOIN users u ON u.id=t.user_id WHERE t.descr='Paid out to bank' AND t.status LIKE '%processing' ORDER BY t.id").map(t => ({ ...t, tax: j(t.tax, {}), at: fmtDay(t.created_at) })),
    bookings: all('SELECT b.*, u.email, u.name FROM bookings b JOIN users u ON u.id=b.user_id ORDER BY b.id DESC LIMIT 100').map(b => ({ ...b, at: fmtDay(b.created_at) })),
    outbox: all('SELECT * FROM outbox ORDER BY id DESC LIMIT 60').map(o => ({ ...o, at: fmtAgo(o.created_at) })),
    areas: D.AREAS
  });
});

/* Profiles store skills by name, so counting and merging work on names. */
function skillUses(name) { return all('SELECT skills FROM specialists').filter(r => j(r.skills, []).some(x => String(x).toLowerCase() === name.toLowerCase())).length; }
function renameSkillEverywhere(from, to) {
  for (const s of all('SELECT id, skills, user_id FROM specialists')) {
    const list = j(s.skills, []); if (!list.some(x => String(x).toLowerCase() === from.toLowerCase())) continue;
    const next = []; for (const x of list) { const v = String(x).toLowerCase() === from.toLowerCase() ? to : x; if (v && !next.some(y => y.toLowerCase() === v.toLowerCase())) next.push(v); }
    run('UPDATE specialists SET skills=? WHERE id=?', JSON.stringify(next), s.id);
    if (s.user_id) require('../bus').sync(s.user_id);
  }
}

const ACT = {};
/* --- skills moderation --- */
const skillRow = id => { const k = one('SELECT * FROM skills WHERE id=?', int(id, { min: 1, name: 'skill' })); if (!k) throw bad('Skill not found'); return k; };
ACT.skill_add = b => {
  const name = str(b.name, { min: 1, max: 40, name: 'skill name' }).replace(/\s+/g, ' ');
  const ex = one('SELECT * FROM skills WHERE name=?', name);
  if (ex && ex.status === 'approved') throw bad('That skill already exists');
  if (ex) run("UPDATE skills SET status='approved', approved_at=? WHERE id=?", now(), ex.id);
  else run("INSERT INTO skills (name, status, created_at, approved_at) VALUES (?, 'approved', ?, ?)", name, now(), now());
  D.skillsChanged();
};
ACT.skill_approve = b => {
  const k = skillRow(b.id);
  const name = b.name ? str(b.name, { min: 1, max: 40, name: 'skill name' }) : k.name;
  if (name !== k.name) { if (one('SELECT 1 FROM skills WHERE name=? AND id!=?', name, k.id)) throw bad('A skill with that name exists: merge instead'); renameSkillEverywhere(k.name, name); }
  run("UPDATE skills SET status='approved', name=?, approved_at=? WHERE id=?", name, now(), k.id);
  D.skillsChanged();
  if (k.created_by) D.notify(k.created_by, 'work', `Skill approved: ${name}`, 'It now shows on your public profile', 'profile');
};
ACT.skill_delete = b => {
  const k = skillRow(b.id);
  if (b.fromProfiles) renameSkillEverywhere(k.name, null);
  run('DELETE FROM skills WHERE id=?', k.id);
  D.skillsChanged();
};
ACT.skill_merge = b => {
  const into = skillRow(b.intoId);
  const from = (Array.isArray(b.ids) ? b.ids : []).slice(0, 50).map(skillRow).filter(k => k.id !== into.id);
  if (!from.length) throw bad('Pick the duplicates to merge');
  tx(() => {
    for (const k of from) { renameSkillEverywhere(k.name, into.name); run('DELETE FROM skills WHERE id=?', k.id); }
    run("UPDATE skills SET status='approved', approved_at=COALESCE(approved_at, ?) WHERE id=?", now(), into.id);
  })();
  D.skillsChanged();
};
/* --- verification level and account status, set by staff --- */
ACT.user_level = (b, req) => {
  const u = D.userById(int(b.userId, { min: 1 })); if (!u) throw bad('User not found');
  const level = oneOf(b.level, D.LEVELS, 'level');
  const v = j(u.verify, {}); const stamp = `Done ${fmtDay(now())} · by staff`;
  const set = (k, on) => { v[k] = on ? { ...(v[k] || {}), st: 'done', sub: v[k] && v[k].st === 'done' ? v[k].sub : stamp } : { ...(v[k] || {}), st: v[k] && v[k].st === 'pending' ? 'pending' : undefined, sub: undefined }; };
  if (level === 'registered') ['id', 'skills', 'refs', 'interview', 'checked'].forEach(k => { if (v[k] && v[k].st === 'done') set(k, false); });
  if (level === 'verified') { set('id', true); set('checked', false); }
  if (level === 'checked') ['id', 'skills', 'refs', 'interview', 'checked'].forEach(k => set(k, true));
  const by = str(b.by, { max: 60 }) || req.user.name || 'AfterWorc';
  run('UPDATE users SET verify=?, level=?, verified_at=?, verified_by=?, email_verified=1 WHERE id=?', JSON.stringify(v), level, level === 'registered' ? null : now(), level === 'registered' ? null : by, u.id);
  const s = D.mySpecialist(u.id);
  if (s) run('UPDATE specialists SET level=?, checked_by=?, checked_on=? WHERE id=?', level, level === 'checked' ? by : null, level === 'checked' ? new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date()) : null, s.id);
  const label = { registered: 'Registered', verified: 'Verified', checked: 'Checked in person' }[level];
  D.notify(u.id, u.role_pref, `Your verification level: ${label}`, level === 'registered' ? 'Your checks are open again' : 'Set by the AfterWorc team', 'home');
};
ACT.user_status = (b, req) => {
  const u = D.userById(int(b.userId, { min: 1 })); if (!u) throw bad('User not found');
  if (u.id === req.user.id) throw bad('You cannot change your own status');
  const status = oneOf(b.status, D.STATUSES, 'status');
  const note = str(b.note, { max: 300, name: 'note' });
  run('UPDATE users SET status=?, status_note=? WHERE id=?', status, note, u.id);
  if (status === 'blocked') { run('DELETE FROM sessions WHERE user_id=?', u.id); require('../ws').kick(u.id); }
  const s = D.mySpecialist(u.id); if (s && status === 'blocked') run('UPDATE specialists SET published=0 WHERE id=?', s.id);
  if (status !== 'blocked') D.notify(u.id, u.role_pref, status === 'hold' ? 'Your account is on hold' : 'Your account is active', note || (status === 'hold' ? 'Payments and new work are paused. Message us to sort it out.' : 'Everything is available again'), 'home');
  mail.send(u.email, `Your AfterWorc account status: ${{ active: 'active', hold: 'on hold', blocked: 'blocked' }[status]}`, `${note || 'The AfterWorc team changed the status of your account.'}\n\nQuestions? Reply to info@afterworc.com.`);
};
ACT.lead_status = b => { run('UPDATE leads SET status=?, staff_note=? WHERE id=?', oneOf(b.status, ['new', 'replied', 'won', 'closed', 'unconfirmed'], 'status'), str(b.note, { max: 2000 }), int(b.id, { min: 1 })); };
ACT.brief_update = b => {
  const br = one('SELECT * FROM briefs WHERE id=?', int(b.id, { min: 1 })); if (!br) throw bad('Brief not found');
  const status = oneOf(b.status || br.status, ['review', 'matching', 'shortlist', 'hired', 'closed'], 'status');
  run('UPDATE briefs SET status=?, matcher_name=?, matcher_role=? WHERE id=?', status, str(b.matcherName, { max: 60 }) || br.matcher_name, str(b.matcherRole, { max: 80 }) || br.matcher_role, br.id);
  if (status === 'matching' && br.status === 'review') D.notify(br.user_id, 'hire', `Matching started: ${br.title}`, 'A person read your brief and is matching checked specialists', 'brief', br.id);
};
ACT.brief_shortlist = b => {
  const br = one('SELECT * FROM briefs WHERE id=?', int(b.id, { min: 1 })); if (!br) throw bad('Brief not found');
  const ids = (Array.isArray(b.specialists) ? b.specialists : []).slice(0, 3).map(x => str(x, { max: 40 }));
  if (!ids.length) throw bad('Pick up to 3 specialists');
  for (const id of ids) if (!D.specById(id)) throw bad('Unknown specialist ' + id);
  const why = {}; for (const id of ids) why[id] = str((b.why || {})[id], { max: 400 });
  run("UPDATE briefs SET shortlist=?, why=?, status='shortlist', ready_at=? WHERE id=?", JSON.stringify(ids), JSON.stringify(why), now(), br.id);
  const hrs = Math.max(1, Math.round((now() - (br.sent_at || now())) / HOUR));
  D.notify(br.user_id, 'hire', `Shortlist ready: ${br.title}`, `${ids.length} checked match${ids.length > 1 ? 'es' : ''} · ${hrs} h (promised 48 h)`, 'brief', br.id, 'shortlist');
  const th = D.supportThread(br.user_id, 'hire');
  D.postMessage(th.id, 'staff', `Your shortlist for "${br.title}" is ready. Compare them side by side and start a deal, or ask for different people.`, null, br.matcher_name || D.MATCHER.name);
};
ACT.brief_invite = b => {
  const br = one('SELECT * FROM briefs WHERE id=?', int(b.id, { min: 1 })); if (!br) throw bad('Brief not found');
  const s = D.specById(str(b.specialistId, { max: 40 })); if (!s || !s.user_id) throw bad('Only specialists with an account can be invited');
  if (one("SELECT 1 FROM opps WHERE brief_id=? AND specialist_id=? AND status!='declined'", br.id, s.id)) throw bad('Already invited');
  run("INSERT INTO opps (specialist_id, brief_id, title, client, kind, budget, descr, why, note, status, due_at, created_at) VALUES (?,?,?,?, 'Invitation', ?,?,?,?, 'invited', ?, ?)",
    s.id, br.id, br.title, br.signed_as, br.budget, br.descr, JSON.stringify(String(b.why || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 5)), str(b.note, { max: 600 }), now() + 72 * HOUR, now());
  D.notify(s.user_id, 'work', `You are invited: ${br.title}`, `Reply by ${fmtDayTime(now() + 72 * HOUR)}`, 'opps', null, 'shortlist');
};
ACT.opp_create = b => {
  const s = D.specById(str(b.specialistId, { max: 40 })); if (!s || !s.user_id) throw bad('Pick a specialist with an account');
  run("INSERT INTO opps (specialist_id, title, client, kind, budget, descr, why, status, due_at, created_at) VALUES (?,?,?,?,?,?,?, 'new', ?, ?)",
    s.id, str(b.title, { min: 3, max: 160, name: 'title' }), str(b.client, { min: 2, max: 120, name: 'client' }), oneOf(b.kind || 'Matched', ['Matched', 'Team seat', 'Invitation'], 'kind'), str(b.budget, { max: 80 }), str(b.descr, { max: 4000 }),
    JSON.stringify(String(b.why || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 5)), now() + 7 * DAY, now());
  D.notify(s.user_id, 'work', `New match: ${b.title}`, `${b.client} · ${b.budget || ''}`, 'opps', null, 'shortlist');
};
ACT.spec_save = b => {
  const f = { name: str(b.name, { min: 2, max: 80, name: 'name' }), role: str(b.role, { min: 2, max: 120, name: 'role' }), area: oneOf(b.area, D.AREAS, 'area'),
    skills: JSON.stringify(String(b.skills || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 10)), rate: b.rate ? int(b.rate, { min: 1, max: 2000, name: 'rate' }) : null,
    monthly: b.monthly ? int(b.monthly, { min: 1, max: 1e6, name: 'monthly price' }) : null, level: oneOf(b.level, ['registered', 'verified', 'checked'], 'level'),
    avail: str(b.avail, { max: 40 }) || 'Available now', city: str(b.city, { max: 60 }), langs: str(b.langs, { max: 40 }) || 'EN', bio: str(b.bio, { max: 2000 }),
    checked_by: str(b.checkedBy, { max: 60 }) || null, checked_on: str(b.checkedOn, { max: 30 }) || null, published: b.published ? 1 : 0 };
  f.available_now = /now/i.test(f.avail) ? 1 : 0;
  if (b.id && D.specById(b.id)) {
    run(`UPDATE specialists SET name=@name, role=@role, area=@area, skills=@skills, rate=@rate, monthly=@monthly, level=@level, avail=@avail, available_now=@available_now, city=@city, langs=@langs, bio=@bio, checked_by=@checked_by, checked_on=@checked_on, published=@published WHERE id=@id`, { ...f, id: b.id });
    const s = D.specById(b.id);
    if (s.user_id && b.published && !b.wasPublished) D.notify(s.user_id, 'work', 'Your profile is public', 'Clients can now find you and request proposals', 'pp', 'me');
  } else {
    const id = (f.name.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '') || 'spec') + '-' + U.randToken(2);
    run(`INSERT INTO specialists (id, name, role, area, skills, rate, monthly, level, avail, available_now, city, langs, bio, checked_by, checked_on, published, created_at)
      VALUES (@id,@name,@role,@area,@skills,@rate,@monthly,@level,@avail,@available_now,@city,@langs,@bio,@checked_by,@checked_on,@published,@t)`, { ...f, id, t: now() });
  }
};
ACT.verify_set = b => {
  const u = D.userById(int(b.userId, { min: 1 })); if (!u) throw bad('User not found');
  const key = oneOf(b.key, D.VERIFY_STEPS.map(s => s[0]), 'step');
  const st = oneOf(b.st, ['', 'pending', 'done'], 'status');
  const v = j(u.verify, {}); v[key] = { ...(v[key] || {}), st: st || undefined, sub: str(b.sub, { max: 120 }) || (st === 'done' ? `Done ${fmtDay(now())}` : undefined) };
  // The privacy policy promises the ID image is deleted once the check is done; only the result is kept.
  if (key === 'id' && st === 'done' && v.id.file) {
    const f = one('SELECT * FROM files WHERE id=?', v.id.file);
    if (f) { try { fs.unlinkSync(path.join(DATA_DIR, 'uploads', path.basename(f.path))); } catch { /* already gone */ } run('DELETE FROM files WHERE id=?', f.id); }
    delete v.id.file;
  }
  const done = k => v[k] && v[k].st === 'done';
  const level = done('checked') ? 'checked' : done('id') ? 'verified' : 'registered';
  run('UPDATE users SET verify=?, level=?, verified_at=CASE WHEN ?=\'registered\' THEN NULL ELSE COALESCE(verified_at, ?) END WHERE id=?', JSON.stringify(v), level, level, now(), u.id);
  const s = D.mySpecialist(u.id, true);
  run('UPDATE specialists SET level=?, checked_by=COALESCE(?, checked_by), checked_on=COALESCE(?, checked_on) WHERE id=?', level, level === 'checked' ? (b.by || 'AfterWorc') : null, level === 'checked' ? new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date()) : null, s.id);
  if (st === 'done') D.notify(u.id, 'work', `${D.VERIFY_STEPS.find(x => x[0] === key)[1]}: done`, key === 'checked' ? 'Your profile now shows "Checked in person"' : 'One step closer to the seal', 'home');
};
ACT.thread_reply = (b, req) => {
  if (b.threadId && !one('SELECT 1 FROM threads WHERE id=?', +b.threadId)) throw bad('Thread not found');
  const t = one('SELECT * FROM threads WHERE id=?', int(b.threadId, { min: 1 })); if (!t) throw bad('Thread not found');
  const text = str(b.text, { min: 1, max: 4000, name: 'a reply' });
  const relay = b.as === 'relay' && t.kind === 'specialist';
  D.postMessage(t.id, relay ? 'peer' : 'staff', text, null, relay ? t.title : (b.name || req.user.name || 'AfterWorc'));
  run('UPDATE threads SET staff_unread=0 WHERE id=?', t.id);
  D.notify(t.user_id, t.mode, `New message from ${relay ? t.title : 'AfterWorc'}`, text.slice(0, 140), 'messages', t.id, 'message');
};
ACT.thread_read = b => { run('UPDATE threads SET staff_unread=0 WHERE id=?', int(b.threadId, { min: 1 })); };
function unlinkedDeal(b) { const d = D.dealRow(int(b.dealId, { min: 1 })); if (!d) throw bad('Deal not found'); return d; }
ACT.deal_accept_for = b => {
  const d = unlinkedDeal(b); if (d.status !== 'proposed') throw bad('Not waiting for acceptance');
  run("UPDATE deals SET status='active' WHERE id=?", d.id); run("UPDATE milestones SET status='unfunded' WHERE deal_id=? AND status='proposed'", d.id);
  if (d.client_user_id) D.notify(d.client_user_id, 'hire', `${D.specById(d.specialist_id).name} accepted: ${d.title}`, 'Fund milestone 1 to start the work', 'deal', d.id, 'delivery');
};
ACT.deal_deliver_for = b => {
  const d = unlinkedDeal(b);
  const m = one("SELECT * FROM milestones WHERE deal_id=? AND status IN ('inprogress','changes') ORDER BY idx LIMIT 1", d.id); if (!m) throw bad('Nothing in progress');
  run("UPDATE milestones SET status='delivered', delivered_at=?, delivery_note=? WHERE id=?", now(), str(b.note, { max: 4000 }), m.id);
  if (d.client_user_id) D.notify(d.client_user_id, 'hire', `Delivered: ${m.name}`, `Review within ${D.REVIEW_DAYS} days or it is accepted automatically`, 'deal', d.id, 'delivery');
};
ACT.report_add = b => {
  const d = unlinkedDeal(b); if (d.kind !== 'dept') throw bad('Weekly reports are for departments');
  run('INSERT INTO reports (deal_id, week, hours, summary, status, created_at) VALUES (?,?,?,?,?,?)', d.id, str(b.week, { min: 3, max: 60, name: 'week' }), int(b.hours, { min: 0, max: 2000, name: 'hours' }), str(b.summary, { min: 5, max: 3000, name: 'summary' }), 'review', now());
  if (d.client_user_id) D.notify(d.client_user_id, 'hire', `Weekly report: ${b.week}`, `${d.title} · approve within 7 days`, 'deal', d.id, 'delivery');
};
ACT.sepa_confirm = b => {
  const t = one("SELECT * FROM transactions WHERE id=? AND status='Pending'", int(b.txId, { min: 1 })); if (!t) throw bad('Not pending');
  tx(() => { run("UPDATE transactions SET status='Completed' WHERE id=?", t.id); D.moveBal(t.user_id, t.mode, t.amount, 0); })();
  D.notify(t.user_id, t.mode, `${eur(t.amount)} arrived`, 'Your SEPA transfer is on your balance', 'money', null, 'payment');
};
ACT.payout_done = b => { run("UPDATE transactions SET status='Paid to bank' WHERE id=?", int(b.txId, { min: 1 })); };
ACT.issue_close = b => { run("UPDATE issues SET status='closed' WHERE id=?", int(b.id, { min: 1 })); };
ACT.user_admin = (b, req) => {
  const id = int(b.id, { min: 1 }); if (id === req.user.id) throw bad('You cannot change your own staff access');
  run('UPDATE users SET is_admin=? WHERE id=?', b.admin ? 1 : 0, id);
};
ACT.link_specialist = b => {
  const s = D.specById(str(b.specialistId, { max: 40 })); const u = one('SELECT * FROM users WHERE email=?', U.email(b.email));
  if (!s || !u) throw bad('Specialist or user not found');
  if (one('SELECT 1 FROM specialists WHERE user_id=?', u.id)) throw bad('That user already has a profile');
  // Money funded before linking was never held on a user's balance; linking now would unbalance the ledger.
  if (one("SELECT 1 FROM milestones m JOIN deals d ON d.id=m.deal_id WHERE d.specialist_id=? AND m.status IN ('funded','inprogress','delivered','changes')", s.id)) throw bad('Finish or release the funded milestones for this specialist before linking an account');
  run('UPDATE specialists SET user_id=? WHERE id=?', u.id, s.id);
};

router.post('/action', async (req, res) => {
  const b = req.body || {};
  const fn = typeof b.type === 'string' && Object.hasOwn(ACT, b.type) ? ACT[b.type] : null; if (!fn) throw bad('Unknown action');
  await fn(b, req);
  audit(req, 'admin:' + b.type, JSON.stringify(b).slice(0, 400));
  require('../bus').toStaff({ t: 'sync' });
  res.json({ ok: true });
});

module.exports = router;
