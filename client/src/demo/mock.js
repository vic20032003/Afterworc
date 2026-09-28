/* Clickable demo backend. Runs in the browser, answers /api/* and the /ws socket from a snapshot of the demo account,
   and keeps changes in this browser (localStorage), so the site, the account and the staff console stay in step.
   Nothing here is used by the real product. */
import SNAP from './snapshot.json';

window.__AW_DEMO = true;
const KEY = 'aw-demo-v1';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const day = (t = Date.now()) => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const dayW = (t = Date.now()) => { const d = new Date(t); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const dayTime = t => { const d = new Date(t); return `${dayW(t)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const eur = n => '€' + Number(n).toLocaleString('en-GB');
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- persistent demo data ---------- */
let DB;
function fresh() { return { v: SNAP.capturedAt, state: clone(SNAP.state), admin: clone(SNAP.admin), skills: clone(SNAP.skills), specialists: clone(SNAP.specialists), next: 100000, files: {} }; }
function load() {
  try { const x = JSON.parse(localStorage.getItem(KEY)); if (x && x.v === SNAP.capturedAt) return x; } catch { /* storage blocked */ }
  return fresh();
}
DB = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch { /* storage blocked or full */ } };
const id = () => ++DB.next;
export function resetDemo() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } DB = fresh(); }
const S = () => DB.state;

/* ---------- fake WebSocket ---------- */
const sockets = new Set();
const push = msg => sockets.forEach(ws => ws._recv(msg));
const RealWS = window.WebSocket;
class DemoSocket {
  constructor(url) {
    this.url = url; this.readyState = 0; sockets.add(this);
    setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); this._recv({ t: 'hello', userId: S().me.id }); }, 30);
  }
  _recv(m) { if (this.readyState === 1 && this.onmessage) this.onmessage({ data: JSON.stringify(m) }); }
  send(raw) { let m; try { m = JSON.parse(raw); } catch { return; } onSocket(m); }
  close() { this.readyState = 3; sockets.delete(this); this.onclose && this.onclose({ code: 1000 }); }
}
window.WebSocket = function (url, p) { return /\/ws(\?|$)/.test(String(url)) ? new DemoSocket(url) : new RealWS(url, p); };
window.WebSocket.OPEN = 1;

const calls = {};
function onSocket(m) {
  if (m.t === 'ping') return push({ t: 'pong' });
  if (m.t === 'call:start') {
    const cid = 'demo-' + id();
    calls[cid] = { threadId: String(m.threadId), kind: m.kind, start: null };
    setTimeout(() => push({ t: 'call:started', callId: cid, threadId: m.threadId, kind: m.kind, reachable: true }), 100);
    setTimeout(() => { if (calls[cid]) { calls[cid].start = Date.now(); push({ t: 'call:accepted', callId: cid }); } }, 2600);
  }
  if (m.t === 'call:end' || m.t === 'call:decline') {
    const c = calls[m.callId]; if (!c) return; delete calls[m.callId];
    const label = c.kind === 'video' ? 'Video call' : 'Voice call';
    const s = c.start ? Math.max(1, Math.round((Date.now() - c.start) / 1000)) : 0;
    sys(c.threadId, c.start ? `${label} · ${s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + (s % 60) + ' s'}` : `Missed ${label.toLowerCase()}`);
  }
}

/* ---------- helpers on the state ---------- */
const thread = tid => S().threads.find(t => t.id === String(tid));
const deal = did => S().deals.find(d => d.id === String(did));
const person = pid => S().people[pid] || { name: 'Specialist' };
function toTop(t) { const l = S().threads; l.splice(l.indexOf(t), 1); l.unshift(t); t.updated = Date.now(); }
function sys(tid, text) { const t = thread(tid); if (!t) return; t.msgs.push({ id: id(), f: 'sys', t: text, tm: 'now', at: Date.now(), who: '', edited: false, pinned: false, canEdit: false }); toTop(t); mirrorAdmin(t, 'system', text); save(); push({ t: 'thread', threadId: t.id }); }
function notify(mode, t, s, go) { S().notifs.unshift({ id: id(), mode, t, s, go, unread: true, at: 'now' }); }
function tx(mode, descr, amount, status) { S().money[mode].tx.unshift([day(), descr, amount, status]); }
function mirrorAdmin(t, sender, text, who) {
  const a = DB.admin.threads.find(x => String(x.id) === t.id);
  if (a) { a.msgs.push({ f: sender, who: who || '', t: text, tm: 'now' }); a.at = 'now'; if (sender === 'user') a.unread = (a.unread || 0) + 1; }
}
const REPLY = {
  support: 'Thanks! This is the AfterWorc matching team. A person reads every message; we reply here within a few hours.',
  tech: 'Technical support here. Thanks for the details. Which browser and device are you using?',
  specialist: 'Thanks for the message! I will get back to you today with details.'
};
/* The other side answers a moment later, with a typing indicator: this is what the WebSocket does in the real product. */
function autoReply(t) {
  if (t.mode !== 'hire' && t.kind === 'specialist') return;
  setTimeout(() => push({ t: 'typing', threadId: t.id, name: t.kind === 'tech' ? 'Technical support' : t.kind === 'support' ? 'Anna R.' : t.name }), 900);
  setTimeout(() => {
    const text = REPLY[t.kind] || REPLY.specialist;
    t.msgs.push({ id: id(), f: 'them', t: text, tm: 'now', at: Date.now(), who: t.kind === 'specialist' ? '' : t.kind === 'tech' ? 'Technical support' : 'Anna R.', edited: false, pinned: false, canEdit: false });
    t.unread = true; toTop(t); mirrorAdmin(t, t.kind === 'specialist' ? 'relay' : 'staff', text, 'Anna R.'); save();
    push({ t: 'thread', threadId: t.id }); push({ t: 'sync' });
  }, 3200);
}
function msStatusAfterFund(d) { return d.ms.some(m => ['inprogress', 'delivered', 'changes'].includes(m.st)) ? 'funded' : 'inprogress'; }
function recalcDeal(d) { d.total = d.ms.reduce((a, m) => a + m.amt, 0); if (d.status === 'active' && d.ms.length && d.ms.every(m => m.st === 'released')) { d.status = 'done'; d.review = d.side === 'hire' ? 'pending' : 'done'; } }
class Bad extends Error { constructor(m, extra) { super(m); this.extra = extra; } }
const need = (c, m) => { if (!c) throw new Bad(m); };
const code2fa = code => { if (!S().twofa) throw new Bad('Turn on two-factor authentication first', { need2fa: true }); if (!/^\d{6}$/.test(String(code || ''))) throw new Bad('That code did not work. Check your authenticator app.'); };
const approvedSet = () => new Set(DB.skills.map(x => x.toLowerCase()));

/* ---------- account actions ---------- */
const A = {
  mode: b => { S().me.rolePref = b.mode; },
  lang_set: b => { S().me.lang = b.lang; },
  acting: b => { const o = S().orgs.find(x => x.id === b.orgId); S().actingOrgId = o ? o.id : null; S().acting = o ? o.name : S().me.name; return { toast: 'Now acting as ' + S().acting }; },
  notif_read: b => { const n = S().notifs.find(x => x.id === b.id); if (n) n.unread = false; },
  notif_readall: b => { S().notifs.forEach(n => { if (n.mode === b.mode) n.unread = false; }); },
  thread_read: b => { const t = thread(b.id); if (t) t.unread = false; },
  message_send: b => {
    const t = thread(b.threadId); need(t, 'Conversation not found'); const text = String(b.text || '').trim(); need(text, 'Enter a message');
    t.msgs.push({ id: id(), f: 'me', t: text, tm: 'now', at: Date.now(), who: '', edited: false, pinned: false, canEdit: true });
    toTop(t); mirrorAdmin(t, 'user', text); autoReply(t); return { threadId: t.id };
  },
  msg_edit: b => { for (const t of S().threads) { const m = t.msgs.find(x => x.id === b.id); if (m) { need(m.canEdit, 'You can edit only your own messages'); m.t = String(b.text).trim(); m.edited = true; return { toast: 'Message edited' }; } } throw new Bad('Message not found'); },
  msg_pin: b => { for (const t of S().threads) { const m = t.msgs.find(x => x.id === b.id); if (m) { m.pinned = !m.pinned; return { toast: m.pinned ? 'Message pinned' : 'Message unpinned' }; } } throw new Bad('Message not found'); },
  thread_pin: b => { const t = thread(b.id); need(t, 'Conversation not found'); t.pinned = !t.pinned; return { toast: t.pinned ? 'Chat pinned' : 'Chat unpinned' }; },
  tech_open: b => { const t = S().threads.find(x => x.kind === 'tech' && x.mode === (b.mode || 'hire')); return { go: ['messages', t.id] }; },
  chat_start: b => {
    let t = S().threads.find(x => x.specialist === b.specialistId && x.mode === 'hire');
    if (!t) { const p = person(b.specialistId); t = { id: String(id()), kind: 'specialist', name: p.name, sub: 'Conversation', mode: 'hire', unread: false, specialist: b.specialistId, avatar: p.avatar || null, pinned: false, canCall: true, online: true, updated: Date.now(), msgs: [] }; S().threads.unshift(t); }
    return { go: ['messages', t.id] };
  },
  help_send: b => { const t = S().threads.find(x => x.kind === (/technical/i.test(b.topic) ? 'tech' : 'support') && x.mode === (b.mode || 'hire')); A.message_send({ threadId: t.id, text: `[${b.topic}] ${b.text}` }); return { toast: 'Sent. A person replies within one business day', go: ['messages', t.id] }; },
  book_call: b => { const t = b.with && b.with !== 'x' ? S().threads.find(x => x.specialist === b.with) : S().threads.find(x => x.kind === 'support' && x.mode === (b.mode || 'hire')); if (t) sys(t.id, `15-minute call booked · ${b.slot}. The video link comes by e-mail.`); return { toast: 'Call booked · invite sent' }; },
  /* briefs */
  brief_save: b => {
    const f = { title: b.title || b.line || 'New brief', type: b.btype, area: b.area, people: b.people || '', budget: b.budget || '', start: b.start || '', desc: b.desc || '', options: b.options || {} };
    if (b.id) { Object.assign(S().briefs.find(x => x.id === b.id), f); return { toast: 'Draft saved to Briefs', id: b.id }; }
    const nb = { id: String(id()), status: 'draft', signedAs: S().acting, matcher: S().matcher, shortlist: [], why: {}, proposals: [], dealId: null, sent: null, promised: null, ready: null, readyIn: null, ...f };
    S().briefs.unshift(nb); return { toast: 'Draft saved to Briefs', id: nb.id };
  },
  brief_send: b => {
    if (b.btype === 'eor' && !(b.options && b.options.country)) throw new Bad('Choose the country where the person will be employed');
    const r = A.brief_save(b); const br = S().briefs.find(x => x.id === r.id);
    Object.assign(br, { status: 'review', sent: dayTime(Date.now()), promised: dayTime(Date.now() + 48 * 3600e3) });
    notify('hire', `Brief sent: ${br.title}`, `Shortlist of up to 3 checked people by ${br.promised}`, ['brief', br.id]);
    const sup = S().threads.find(x => x.kind === 'support' && x.mode === 'hire'); if (sup) sys(sup.id, `Brief "${br.title}" sent · ${br.sent}`);
    // In the demo, matching and the shortlist arrive within seconds instead of hours.
    setTimeout(() => { br.status = 'matching'; notify('hire', `Matching started: ${br.title}`, 'A person read your brief and is matching checked specialists', ['brief', br.id]); save(); push({ t: 'sync' }); }, 6000);
    setTimeout(() => {
      const pool = Object.values(S().people).filter(p => p.lv === 'checked' && (p.area === br.area || br.area === 'Development')).slice(0, 3);
      const picks = (pool.length ? pool : Object.values(S().people).slice(0, 3)).map(p => p.id);
      Object.assign(br, { status: 'shortlist', shortlist: picks, why: Object.fromEntries(picks.map(p => [p, 'Relevant experience, checked in person'])), ready: dayTime(Date.now()), readyIn: '1 h' });
      notify('hire', `Shortlist ready: ${br.title}`, `${picks.length} checked matches · 1 h (promised 48 h)`, ['brief', br.id]); save(); push({ t: 'sync' });
    }, 14000);
    return { toast: 'Brief sent. We read it shortly', go: ['brief', br.id] };
  },
  brief_delete: b => { S().briefs = S().briefs.filter(x => x.id !== b.id); return { toast: 'Draft deleted', go: ['briefs'] }; },
  brief_close: b => { S().briefs.find(x => x.id === b.id).status = 'closed'; return { toast: 'Brief closed' }; },
  brief_different: b => { S().briefs.find(x => x.id === b.id).status = 'matching'; return { toast: 'We have your feedback. New shortlist within 24 h' }; },
  request_proposal: b => { const r = A.chat_start({ specialistId: b.specialistId }); A.message_send({ threadId: r.go[1], text: `${b.need}\n\nBudget: ${b.budget || 'not set'} · Start: ${b.start || 'flexible'}` }); return { toast: 'Request sent to ' + person(b.specialistId).name, go: r.go }; },
  /* deals */
  deal_start: b => {
    const p = person(b.specialistId); const amt = Math.round(+b.amount || 0); need(amt > 0, 'Enter amount'); need(String(b.first || '').trim().length > 1, 'Enter the first milestone');
    const br = b.briefId && S().briefs.find(x => x.id === b.briefId); if (br) br.status = 'hired';
    const d = { id: String(id()), side: 'hire', title: (br && br.title) || `Work with ${p.name}`, with: b.specialistId, client: S().acting, model: { hourly: 'Hourly', monthly: 'Monthly · team', fixed: 'Fixed price' }[b.model], kind: 'milestones', total: amt, monthly: b.model === 'monthly' ? amt : null, status: 'proposed', review: null, start: b.startDate, created: day(), team: [], month: '', threadId: null, reports: null, clientVerified: true, specName: p.name,
      ms: [{ id: id(), n: b.first, amt, st: 'proposed', note: `Waiting for ${p.name} to accept`, deliveryNote: '', files: [], autoAt: null, dueIn: null }] };
    if (br) br.dealId = d.id;
    const ch = A.chat_start({ specialistId: b.specialistId }); d.threadId = ch.go[1]; sys(d.threadId, `Terms sent: ${d.title} · ${b.first} · ${eur(amt)} · start ${b.startDate}`);
    S().deals.unshift(d);
    setTimeout(() => { d.status = 'active'; d.ms.forEach(m => { if (m.st === 'proposed') { m.st = 'unfunded'; m.note = 'Fund when you are ready to start'; } }); notify('hire', `${p.name} accepted: ${d.title}`, 'Fund milestone 1 to start the work', ['deal', d.id]); save(); push({ t: 'sync' }); }, 5000);
    return { toast: 'Terms sent to ' + p.name, go: ['deal', d.id] };
  },
  deal_cancel: b => { deal(b.dealId).status = 'cancelled'; return { toast: 'Terms withdrawn', go: ['deals'] }; },
  deal_accept: b => { const d = deal(b.dealId); d.status = 'active'; d.ms.forEach(m => { if (m.st === 'proposed') { m.st = 'unfunded'; m.note = 'Waiting for the client to fund'; } }); return { toast: 'Deal accepted. Work starts when the client funds it' }; },
  deal_decline: b => { deal(b.dealId).status = 'declined'; return { toast: 'Declined', go: ['deals'] }; },
  ms_fund: b => {
    const d = deal(b.dealId); const m = d.ms.find(x => x.id === +b.msId); need(m && m.st === 'unfunded', 'Milestone not found');
    const bal = S().money.hire; if (bal.available < m.amt) throw new Bad(`Not enough balance: ${eur(bal.available)} available. Top up first.`, { needTopup: m.amt - bal.available });
    bal.available -= m.amt; bal.held += m.amt; m.st = msStatusAfterFund(d); m.note = m.st === 'inprogress' ? `Funded ${day()} · in progress` : 'Funded · starts after the current milestone';
    tx('hire', `Milestone funded · ${d.title}`, -m.amt, 'Held'); bal.inv.unshift([`AW-2026-${String(id()).slice(-4)}`, day(), `${d.title} · ${m.n}`, m.amt]);
    // The specialist delivers a little later in the demo.
    if (m.st === 'inprogress') setTimeout(() => { m.st = 'delivered'; m.note = `Delivered ${dayW()} · auto-accepts in 7 days (${dayW(Date.now() + 7 * 864e5)})`; m.autoAt = dayW(Date.now() + 7 * 864e5); m.dueIn = 'in 7 days'; m.deliveryNote = 'Done and tested. Files are in the shared folder; happy to walk you through it.'; notify('hire', `Delivered: ${m.n}`, 'Review within 7 days or it is accepted automatically', ['deal', d.id]); save(); push({ t: 'sync' }); }, 8000);
    return { toast: `${eur(m.amt)} funded and held` };
  },
  ms_accept: b => {
    const d = deal(b.dealId); const m = d.ms.find(x => x.st === 'delivered'); need(m, 'Nothing to accept');
    m.st = 'released'; m.note = `Released ${day()}`; S().money.hire.held -= m.amt; tx('hire', `Milestone released · ${person(d.with).name}`, 0, `${eur(m.amt)} released`);
    const next = d.ms.find(x => x.st === 'funded'); if (next) { next.st = 'inprogress'; next.note = `Funded ${day()} · in progress`; }
    recalcDeal(d); return { toast: `${eur(m.amt)} released to ${person(d.with).name}` };
  },
  ms_changes: b => { const d = deal(b.dealId); const m = d.ms.find(x => x.st === 'delivered'); need(m, 'Nothing to review'); m.st = 'changes'; m.note = 'Changes requested: ' + String(b.text).slice(0, 120); return { toast: 'Request sent. Review clock restarts on resubmission' }; },
  ms_add: b => { const d = deal(b.dealId); d.ms.push({ id: id(), n: b.name, amt: Math.round(+b.amount || 0), st: d.status === 'proposed' ? 'proposed' : 'unfunded', note: 'Fund when you are ready to start', deliveryNote: '', files: [], autoAt: null, dueIn: null }); recalcDeal(d); return { toast: 'Milestone added' }; },
  ms_deliver: b => { const d = deal(b.dealId); const m = d.ms.find(x => ['inprogress', 'changes'].includes(x.st)); need(m, 'Nothing to deliver right now'); m.st = 'delivered'; m.deliveryNote = b.note || ''; m.autoAt = dayW(Date.now() + 7 * 864e5); m.note = `Delivered ${dayW()} · client has until ${m.autoAt}`; return { toast: `Delivered. ${d.client} has 7 days to accept` }; },
  report_approve: b => { for (const d of S().deals) for (const r of d.reports || []) if (r.id === +b.reportId) r.st = 'approved'; return { toast: 'Week approved' }; },
  report_query: () => ({ toast: 'Question sent' }),
  request_change: () => ({ toast: 'Request sent to the team lead and AfterWorc' }),
  deal_review: b => { need(+b.stars >= 1, 'Enter a star rating'); deal(b.dealId).review = 'submitted'; return { toast: 'Review saved. Published when both sides submit' }; },
  deal_issue: () => ({ toast: 'Mediator assigned. Reply within 2 business days' }),
  /* opportunities */
  opp_propose: b => { const o = S().opps.find(x => x.id === b.id); need(String(b.note || '').trim().length >= 10, 'why you (2–3 lines) is too short'); o.status = 'sent'; o.proposal = { rate: b.rate, start: b.start, note: b.note }; o.due = 'Proposal sent ' + day(); return { toast: 'Proposal sent. Reply within 72 h' }; },
  opp_decline: b => { S().opps = S().opps.filter(x => x.id !== b.id); return { toast: "Declined. We'll tune your matches", go: ['opps'] }; },
  /* profile */
  profile_save: b => {
    const p = S().prof; const ok = approvedSet();
    const skills = []; for (const x of b.skills || []) { const n = String(x).trim(); if (n && !skills.some(s => s.toLowerCase() === n.toLowerCase())) skills.push(DB.skills.find(s => s.toLowerCase() === n.toLowerCase()) || n); }
    const pending = skills.filter(s => !ok.has(s.toLowerCase()));
    for (const s of pending) if (!DB.admin.skills.some(k => k.name.toLowerCase() === s.toLowerCase())) DB.admin.skills.unshift({ id: id(), name: s, status: 'pending', by: S().me.email, at: day(), uses: 1 });
    Object.assign(p, { headline: b.headline, profession: b.profession, about: b.about, area: b.area, city: b.city, rate: b.rate ? +b.rate : '', hours: +b.hours || 30, avail: b.avail || p.avail, portfolio: b.portfolio, skills, skillStatus: Object.fromEntries(skills.map(s => [s, ok.has(s.toLowerCase()) ? 'approved' : 'pending'])) });
    if (b.name) S().me.name = b.name;
    return { toast: pending.length ? `Profile saved. New skills appear after a check by our team: ${pending.join(', ')}` : 'Profile saved' };
  },
  profile_submit: () => { S().prof.status = S().prof.status === 'published' ? 'published' : 'submitted'; return { toast: 'Submitted. Your profile goes public after your ID check' }; },
  profile_name: b => { S().me.name = b.name; return { toast: 'Name saved' }; },
  avatar_set: b => { S().me.avatar = DB.files[b.fileId]; return { toast: 'Photo updated' }; },
  avatar_remove: () => { S().me.avatar = null; return { toast: 'Photo removed' }; },
  portfolio_add: b => { need(String(b.title || '').trim().length >= 2, 'Enter a title'); if (b.url && !/^https?:\/\//i.test(b.url)) throw new Bad('The link must start with https://'); need(b.fileId || b.url, 'Add an image or a link'); S().portfolio.push({ id: id(), title: b.title, descr: b.descr || '', url: b.url || '', image: b.fileId ? DB.files[b.fileId] : null }); return { toast: 'Added to your portfolio' }; },
  portfolio_update: b => { const it = S().portfolio.find(x => x.id === b.id); Object.assign(it, { title: b.title, descr: b.descr, url: b.url, image: b.fileId ? DB.files[b.fileId] : b.removeImage ? null : it.image }); return { toast: 'Portfolio item saved' }; },
  portfolio_delete: b => { S().portfolio = S().portfolio.filter(x => x.id !== b.id); return { toast: 'Removed from your portfolio' }; },
  portfolio_move: b => { const l = S().portfolio; const i = l.findIndex(x => x.id === b.id); const k = i + (b.dir === 'up' ? -1 : 1); if (i >= 0 && k >= 0 && k < l.length) [l[i], l[k]] = [l[k], l[i]]; },
  verify_id: () => { S().verify[0][1] = 'Document received · checked within 1 business day'; S().verify[0][2] = 'cur'; S().verify[0][4] = 'pending'; return { toast: 'Document received. We check it within 1 business day' }; },
  verify_refs: () => { const v = S().verify.find(x => x[3] === 'refs'); v[1] = '2 referees · we call them'; v[2] = 'cur'; v[4] = 'pending'; return { toast: 'Thanks. We contact your referees' }; },
  verify_interview: b => { const v = S().verify.find(x => x[3] === 'interview'); v[1] = `Booked ${b.slot} · Tallinn or video`; v[2] = 'cur'; v[4] = 'pending'; return { toast: 'Interview booked · invite sent' }; },
  /* money and card */
  topup: b => { const a = Math.round(+b.amount || 0); need(a > 0, 'Enter amount'); const m = S().money[b.mode]; if (b.method === 'sepa') { tx(b.mode, 'Top up · SEPA transfer', a, 'Pending'); m.pending = (m.pending || 0) + a; return { toast: `We'll add ${eur(a)} when the transfer arrives (1 business day)` }; } m.available += a; tx(b.mode, 'Top up · ' + ({ bank: 'bank link', card: 'card', wallet: 'phone wallet' }[b.method] || 'card'), a, 'Completed · test mode'); return { toast: `${eur(a)} added to your ${b.mode === 'hire' ? 'company' : 'Working'} balance` }; },
  withdraw: b => { code2fa(b.code); if (!S().tax.iban) throw new Bad('Add your IBAN in Settings › Tax & invoicing first'); const m = S().money.work; const a = m.withdrawable; need(a > 0, 'Nothing to withdraw. Only earnings released from deals can be paid out.'); m.available -= a; m.withdrawable = 0; tx('work', 'Paid out to bank', -a, `To ••${S().tax.iban.slice(-2)} · processing`); return { toast: `${eur(a)} on its way to your bank · 1–2 business days` }; },
  card_issue: b => { code2fa(b.code); need(b.terms, 'Accept the cardholder terms'); const c = S().cards[b.mode]; Object.assign(c, { st: 'active', name: String(b.name).toUpperCase(), org: b.mode === 'hire' ? S().acting : '', last4: String(1000 + (id() % 9000)), exp: '09/30', phys: b.kind === 'both' ? 'shipping' : 'none', frozen: false, side: 'front', spent: 0, tx: [] }); notify(b.mode, 'Your AfterWorc card is ready', `Mastercard debit ••${c.last4}`, ['card', null]); return { toast: 'Your virtual card is ready' + (b.kind === 'both' ? '. Plastic card on its way' : ''), go: ['card'] }; },
  card_freeze: b => { const c = S().cards[b.mode]; c.frozen = !c.frozen; return { toast: c.frozen ? 'Card frozen. Payments are declined' : 'Card unfrozen' }; },
  card_side: b => { const c = S().cards[b.mode]; c.side = c.side === 'front' ? 'back' : 'front'; },
  card_toggle: b => { const c = S().cards[b.mode]; c.tg[b.k] = !c.tg[b.k]; return { toast: { online: 'Online payments', contactless: 'Contactless', atm: 'ATM withdrawals', abroad: 'Payments abroad' }[b.k] + (c.tg[b.k] ? ' on' : ' off') }; },
  card_limits: b => { const c = S().cards[b.mode]; c.lim = { day: +b.day, month: +b.month, atm: +b.atm }; return { toast: 'Limits saved' }; },
  card_wallet: b => { S().cards[b.mode].wal[b.k] = true; return { toast: 'Added to ' + (b.k === 'apple' ? 'Apple Pay' : 'Google Pay') }; },
  card_order: b => { S().cards[b.mode].phys = 'shipping'; return { toast: 'Physical card ordered · 5–7 business days' }; },
  card_activate: b => { S().cards[b.mode].phys = 'active'; return { toast: 'Physical card activated' }; },
  card_lost: b => { const c = S().cards[b.mode]; if (b.o === 'replace') { c.last4 = String(1000 + (id() % 9000)); c.frozen = false; return { toast: 'Old card blocked. New number ••' + c.last4 + ' is ready' }; } c.frozen = true; return b.o === 'keep' ? { toast: 'Card stays frozen' } : {}; },
  card_reveal: b => { code2fa(b.code); const c = S().cards[b.mode]; return b.what === 'pin' ? { reveal: { pin: '4821' } } : { reveal: { pan: `5555 3412 4444 ${c.last4}`, cvc: '123', exp: c.exp } }; },
  card_receipt: b => { for (const m of ['hire', 'work']) { const x = S().cards[m].tx.find(t => t.id === +b.txId); if (x) x.receipt = true; } return { toast: 'Receipt attached' }; },
  /* settings */
  twofa_begin: () => ({ twofa: { secret: 'JBSW Y3DP EHPK 3PXP', qr: SNAP.qr } }),
  twofa_confirm: b => { if (!/^\d{6}$/.test(String(b.code || ''))) throw new Bad('That code did not work. Check your authenticator app.'); S().twofa = true; return { toast: 'Two-factor authentication on' }; },
  twofa_disable: b => { code2fa(b.code); S().twofa = false; return { toast: 'Two-factor authentication off' }; },
  password_change: b => {
    need(b.current, 'Your current password is not right'); if (String(b.next || '').length < 10) throw new Bad('Use at least 10 characters for the password');
    if (b.next !== b.repeat) throw new Bad('The new passwords do not match'); if (S().twofa) code2fa(b.code);
    S().me.passwordChanged = day(); return { toast: 'Password changed. Other sessions signed out' };
  },
  email_change: b => {
    need(/\S+@\S+\.\S+/.test(b.email || ''), 'Enter your e-mail address'); need(b.password, 'Your password is not right'); if (S().twofa) code2fa(b.code);
    S().me.pendingEmail = b.email; return { toast: 'Confirmation link sent to ' + b.email };
  },
  email_cancel: () => { S().me.pendingEmail = null; return { toast: 'E-mail change cancelled' }; },
  sessions_revoke: () => ({ toast: 'Signed out everywhere else' }),
  prefs_save: b => { S().prefs = { email: b.email, app: b.app, cookies: b.cookies }; return { toast: 'Preferences saved' }; },
  tax_save: b => { if (b.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(String(b.iban).replace(/\s/g, '').toUpperCase())) throw new Bad('That IBAN does not look right'); S().tax = { ...S().tax, ...b, iban: String(b.iban || '').replace(/\s/g, '').toUpperCase() }; delete S().tax.type; delete S().tax.mode; return { toast: 'Tax details saved' }; },
  org_create: b => { need(String(b.name || '').trim().length > 1, 'Enter company name'); const o = { id: id(), name: b.name, country: b.country || 'Estonia', vat: b.vat || '', role: 'Owner', members: [{ name: S().me.name, email: S().me.email, role: 'Owner' }], invites: [] }; S().orgs.push(o); S().actingOrgId = o.id; S().acting = o.name; return { toast: `${o.name} added. You now act as this company` }; },
  org_invite: b => { const o = S().orgs.find(x => x.id === b.orgId); need(/\S+@\S+\.\S+/.test(b.email || ''), 'Enter your e-mail address'); o.invites.push({ email: b.email, role: b.role, at: day() }); return { toast: 'Invitation sent' }; },
  account_close: () => { throw new Bad('Closing the account is not available in the demo'); }
};

/* ---------- staff console actions ---------- */
const ADM = {
  thread_reply: b => {
    const a = DB.admin.threads.find(x => x.id === +b.threadId); need(a, 'Thread not found'); a.msgs.push({ f: b.as === 'relay' ? 'peer' : 'staff', who: b.name || 'AfterWorc', t: b.text, tm: 'now' }); a.unread = 0;
    const t = thread(b.threadId); if (t) { t.msgs.push({ id: id(), f: 'them', t: b.text, tm: 'now', at: Date.now(), who: b.as === 'relay' ? '' : (b.name || 'AfterWorc'), edited: false, pinned: false, canEdit: false }); t.unread = true; toTop(t); notify(t.mode, `New message from ${b.as === 'relay' ? t.name : 'AfterWorc'}`, String(b.text).slice(0, 120), ['messages', t.id]); push({ t: 'thread', threadId: t.id }); }
  },
  thread_read: b => { const a = DB.admin.threads.find(x => x.id === +b.threadId); if (a) a.unread = 0; },
  skill_add: b => { const n = String(b.name || '').trim(); need(n, 'Enter skill name'); if (DB.skills.some(s => s.toLowerCase() === n.toLowerCase())) throw new Bad('That skill already exists'); DB.skills.push(n); DB.admin.skills.push({ id: id(), name: n, status: 'approved', at: day(), uses: 0 }); },
  skill_approve: b => {
    const k = DB.admin.skills.find(x => x.id === b.id); const name = b.name || k.name;
    renameSkill(k.name, name); k.name = name; k.status = 'approved'; DB.skills.push(name);
    notify('work', `Skill approved: ${name}`, 'It now shows on your public profile', ['profile', null]);
  },
  skill_delete: b => { const k = DB.admin.skills.find(x => x.id === b.id); DB.admin.skills = DB.admin.skills.filter(x => x !== k); DB.skills = DB.skills.filter(s => s !== k.name); renameSkill(k.name, null); },
  skill_merge: b => { const into = DB.admin.skills.find(x => x.id === b.intoId); for (const i of b.ids || []) { const k = DB.admin.skills.find(x => x.id === i); if (!k || k === into) continue; renameSkill(k.name, into.name); into.uses += k.uses; DB.admin.skills = DB.admin.skills.filter(x => x !== k); DB.skills = DB.skills.filter(s => s !== k.name); } into.status = 'approved'; if (!DB.skills.includes(into.name)) DB.skills.push(into.name); },
  user_level: b => { const u = DB.admin.users.find(x => x.id === +b.userId); u.level = b.level; u.verifiedOn = b.level === 'registered' ? null : day(); if (u.id === S().me.id) { S().me.level = b.level; if (S().prof) S().prof.level = b.level; notify(S().me.rolePref, `Your verification level: ${{ registered: 'Registered', verified: 'Verified', checked: 'Checked in person' }[b.level]}`, 'Set by the AfterWorc team', ['home', null]); } },
  user_status: b => { const u = DB.admin.users.find(x => x.id === +b.userId); if (u.email === 'admin@afterworc.local') throw new Bad('You cannot change your own status'); u.status = b.status; u.status_note = b.note || ''; if (u.id === S().me.id) { if (b.status === 'blocked') throw new Bad('In the demo you cannot block the demo account: you would lock yourself out'); S().me.status = b.status; S().me.statusNote = b.note || ''; } },
  verify_set: b => { const u = DB.admin.users.find(x => x.id === +b.userId); u.verify = { ...u.verify, [b.key]: { st: b.st || undefined, sub: b.sub } }; },
  user_admin: () => { throw new Bad('Not available in the demo'); }
};
function renameSkill(from, to) {
  const p = S().prof; if (!p) return;
  const next = []; for (const s of p.skills) { const v = s.toLowerCase() === from.toLowerCase() ? to : s; if (v && !next.includes(v)) next.push(v); }
  p.skills = next; p.skillStatus = Object.fromEntries(next.map(s => [s, approvedSet().has(s.toLowerCase()) || s === to ? 'approved' : 'pending']));
}

/* ---------- fetch router ---------- */
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const realFetch = window.fetch.bind(window);
async function body(init) {
  if (!init || !init.body) return {};
  if (init.body instanceof FormData) return init.body;
  try { return JSON.parse(init.body); } catch { return {}; }
}
function specialistsPublic() {
  return DB.specialists.map(s => s.id === S().prof?.id ? { ...s, avatar: S().me.avatar, portfolio: S().portfolio } : s);
}
async function route(url, init) {
  const u = new URL(url, location.href); const p = u.pathname.replace(/^.*?\/api\//, '/'); const b = await body(init);
  const method = (init && init.method) || 'GET';
  await new Promise(r => setTimeout(r, 120)); // feel like a network
  try {
    if (p === '/auth/me') return json({ user: !DB.signedIn ? null : { id: S().me.id, name: S().me.name, email: S().me.email, verified: true, admin: true, rolePref: S().me.rolePref, avatar: S().me.avatar }, smtp: false });
    if (p === '/auth/login' || p === '/auth/register') { DB.signedIn = true; save(); }
    if (p === '/auth/logout') { DB.signedIn = false; save(); }
    if (p === '/auth/login') return json({ ok: true, redirect: b.admin ? 'admin.html' : `app.html#/${S().me.rolePref || 'hire'}/home` });
    if (p === '/auth/register') return json({ ok: true, devLink: new URL('app.html#/' + (b.role === 'work' ? 'work' : 'hire') + '/home', location.href).href });
    if (p === '/auth/logout' || p === '/auth/resend' || p === '/auth/forgot' || p === '/auth/reset' || p === '/contact') return json({ ok: true, devLink: undefined });
    if (p === '/leads') return json({ ok: true, id: 1, devCode: '123456' });
    if (/^\/leads\/\d+\/confirm$/.test(p)) return json({ ok: true });
    if (p === '/specialists') return json(specialistsPublic());
    if (p.startsWith('/specialists/')) { const s = specialistsPublic().find(x => x.id === decodeURIComponent(p.slice(13))); return s ? json(s) : json({ error: 'Profile not found' }, 404); }
    if (p === '/skills') { const q = (u.searchParams.get('q') || '').toLowerCase(); return json(DB.skills.filter(s => !q || s.toLowerCase().includes(q)).slice(0, q ? 20 : 400)); }
    if (p === '/rtc') return json({ iceServers: [] });
    if (p === '/account/state') { if (!DB.signedIn) { DB.signedIn = true; save(); } return json(S()); }
    if (p === '/account/media' || p === '/account/files') {
      const files = [...b.getAll(p === '/account/media' ? 'file' : 'files')].slice(0, 5);
      const out = await Promise.all(files.map(f => new Promise(res => { const fid = id(); const r = new FileReader(); r.onload = () => { if (f.type.startsWith('image/') && f.size < 1.5e6) DB.files[fid] = r.result; else DB.files[fid] = null; res({ id: fid, name: f.name, url: DB.files[fid] || '' }); }; r.readAsDataURL(f); })));
      save(); return json(p === '/account/media' ? { file: out[0] } : { files: out });
    }
    if (p === '/account/action') {
      const fn = A[b.type]; if (!fn) return json({ ok: true, toast: 'Done (demo)', state: S() });
      const r = fn(b) || {}; save(); push({ t: 'sync' });
      return json({ ok: true, ...r, state: S() });
    }
    if (p === '/chat/search') {
      const q = (u.searchParams.get('q') || '').toLowerCase(); const mode = u.searchParams.get('mode') || 'hire';
      const mine = S().threads.filter(t => t.mode === mode);
      const messages = mine.flatMap(t => t.msgs.filter(m => m.f !== 'sys' && m.t.toLowerCase().includes(q)).map(m => ({ id: m.id, threadId: t.id, chat: t.name, text: m.t, at: m.at, tm: m.tm })));
      const people = mode === 'hire' ? Object.values(S().people).filter(x => (x.name + ' ' + x.role).toLowerCase().includes(q)).slice(0, 8).map(x => ({ id: x.id, name: x.name, role: x.role, avatar: x.avatar, lv: x.lv })) : [];
      return json({ people, threads: [], messages });
    }
    if (p === '/admin/overview') return json(DB.admin);
    if (p === '/admin/action') { const fn = ADM[b.type]; if (fn) fn(b); save(); push({ t: 'sync' }); return json({ ok: true }); }
    if (method === 'GET') return json({ error: 'Not available in the demo' }, 404);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message, ...(e.extra || {}) }, 400);
  }
}
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  return /(^|\/)api\//.test(new URL(url, location.href).pathname) || /^\/api\//.test(url) ? route(url, init) : realFetch(input, init);
};

/* ---------- links to server-made documents, and the demo badge ---------- */
function note(text) {
  const el = document.createElement('div'); el.className = 'aw-demo-note'; el.textContent = text; document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  const h = a.getAttribute('href') || '';
  if (/^\/api\//.test(h)) { e.preventDefault(); note('Invoices, statements and exports are generated by the server. They work in the full version.'); return; }
  const map = { '/': 'site.html', '/app': 'app.html', '/admin': 'admin.html' };
  const [path, hash] = h.split('#');
  if (h.startsWith('/') && Object.hasOwn(map, path)) { e.preventDefault(); location.href = map[path] + (hash ? '#' + hash : ''); }
}, true);
function badge() {
  const st = document.createElement('style');
  st.textContent = `.aw-demo{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:200;display:flex;gap:8px;align-items:center;background:#07170f;color:#e7f0eb;border-radius:99px;padding:6px 8px 6px 12px;font:600 12px Inter,system-ui,sans-serif;box-shadow:0 8px 24px -10px rgba(0,0,0,.5)}
  .aw-demo b{color:#85d6ae;font-weight:700}.aw-demo a,.aw-demo button{color:#e7f0eb;background:#ffffff14;border:0;border-radius:99px;padding:4px 10px;font:inherit;cursor:pointer;text-decoration:none}
  .aw-demo a:hover,.aw-demo button:hover{background:#ffffff26}
  .aw-demo-note{position:fixed;left:50%;transform:translateX(-50%);bottom:70px;z-index:201;background:#07170f;color:#e7f0eb;border-radius:12px;padding:10px 14px;font:13px Inter,system-ui,sans-serif;max-width:calc(100% - 32px)}
  @media (max-width:820px){.aw-demo{bottom:calc(72px + env(safe-area-inset-bottom,0px))}.aw-demo .hm{display:none}}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 'aw-demo'; el.setAttribute('role', 'navigation'); el.setAttribute('aria-label', 'Demo');
  el.innerHTML = `<b>Demo</b><a href="site.html">Site</a><a href="app.html">Account</a><a class="hm" href="admin.html">Staff</a><button type="button" title="Start the demo again">Reset</button>`;
  el.querySelector('button').onclick = () => { resetDemo(); location.reload(); };
  document.body.appendChild(el);
}
if (document.body) badge(); else document.addEventListener('DOMContentLoaded', badge);
