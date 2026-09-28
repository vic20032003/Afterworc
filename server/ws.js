'use strict';
/* Real-time channel at /ws: state sync pushes, new/edited messages, typing, presence and WebRTC call signaling.
   Browsers authenticate with the session cookie (same origin only); native apps pass ?token=<session token>. */
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const { db } = require('./db');
const bus = require('./bus');
const { userFromToken, cookieToken } = require('./auth');
const { now, initials } = require('./util');

const socks = new Map(); // userId -> Set<ws>
const calls = new Map(); // callId -> { id, threadId, kind, caller: ws, callee: ws|null, targets: userIds[], staff: bool, startedAt, answeredAt }
let wss = null;

const one = (sql, ...a) => db.prepare(sql).get(...a);
const send = (ws, msg) => { try { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); } catch { /* socket gone */ } };
const toUser = (uid, msg, except) => { for (const ws of socks.get(uid) || []) if (ws !== except) send(ws, msg); };
const staffSockets = () => [...socks.values()].flatMap(s => [...s]).filter(ws => ws.user.is_admin);
const toStaff = (msg, except) => { for (const ws of staffSockets()) if (ws !== except) send(ws, msg); };
const isOnline = uid => !!(socks.get(uid) && socks.get(uid).size);
const staffOnline = () => staffSockets().length > 0;

bus.on('user', (uid, msg) => toUser(uid, msg));
bus.on('staff', msg => toStaff(msg));

/** Who is on the other end of a thread, seen from `u`. Staff answer support, technical support and specialists without an account. */
function threadParties(t, u) {
  if (!t) return null;
  const isOwner = t.user_id === u.id, isPeer = t.peer_user_id === u.id;
  if (!isOwner && !isPeer && !u.is_admin) return null;
  if (u.is_admin && !isOwner && !isPeer) return { users: [t.user_id, t.peer_user_id].filter(Boolean), staff: false, asStaff: true };
  if (isPeer) return { users: [t.user_id], staff: false };
  if (t.kind === 'support' || t.kind === 'tech') return { users: [], staff: true };
  return t.peer_user_id ? { users: [t.peer_user_id], staff: false } : { users: [], staff: false };
}
function callerInfo(u, t, asStaff) {
  const name = asStaff ? (t.kind === 'tech' ? 'AfterWorc technical support' : 'AfterWorc') : (u.name || u.email);
  return { name, initials: initials(name), avatar: !asStaff && u.avatar_file_id ? `/api/media/${u.avatar_file_id}` : null };
}
function sysMessage(threadId, body) {
  db.prepare("INSERT INTO messages (thread_id, sender, sender_name, body, created_at) VALUES (?, 'system', '', ?, ?)").run(threadId, body, now());
  db.prepare('UPDATE threads SET updated_at=? WHERE id=?').run(now(), threadId);
  const t = one('SELECT user_id, peer_user_id FROM threads WHERE id=?', threadId);
  if (t) { bus.sync(t.user_id); bus.sync(t.peer_user_id); toStaff({ t: 'sync' }); }
}
const mins = ms => { const s = Math.max(1, Math.round(ms / 1000)); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? (s % 60) + ' s' : ''}`.trim(); };

function endCall(c, reason, by) {
  if (!calls.has(c.id)) return;
  calls.delete(c.id);
  clearTimeout(c.timer);
  const notify = ws => ws && ws !== by && send(ws, { t: 'call:ended', callId: c.id, reason });
  notify(c.caller); notify(c.callee);
  if (!c.answeredAt) {
    for (const uid of c.targets) toUser(uid, { t: 'call:ended', callId: c.id, reason });
    if (c.staff) toStaff({ t: 'call:ended', callId: c.id, reason });
  }
  const label = c.kind === 'video' ? 'Video call' : 'Voice call';
  sysMessage(c.threadId, c.answeredAt ? `${label} · ${mins(now() - c.answeredAt)}` : reason === 'declined' ? `${label} declined` : `Missed ${label.toLowerCase()}`);
}

function onMessage(ws, raw) {
  let m; try { m = JSON.parse(String(raw)); } catch { return; }
  if (!m || typeof m.t !== 'string') return;
  const u = ws.user;
  if (m.t === 'ping') return send(ws, { t: 'pong' });

  if (m.t === 'typing') {
    const t = one('SELECT * FROM threads WHERE id=?', +m.threadId); const p = threadParties(t, u); if (!p) return;
    const msg = { t: 'typing', threadId: t.id, name: p.asStaff ? 'AfterWorc' : u.name };
    for (const uid of p.users) toUser(uid, msg); if (p.staff) toStaff(msg);
    return;
  }

  if (m.t === 'call:start') {
    const t = one('SELECT * FROM threads WHERE id=?', +m.threadId); const p = threadParties(t, u);
    if (!p) return send(ws, { t: 'call:error', error: 'Conversation not found' });
    const kind = m.kind === 'video' ? 'video' : 'audio';
    const reachable = p.users.some(isOnline) || (p.staff && staffOnline());
    if (!p.users.length && !p.staff) return send(ws, { t: 'call:error', error: 'This person has no account yet. Book a call instead.' });
    const c = { id: crypto.randomUUID(), threadId: t.id, kind, caller: ws, callee: null, targets: p.users, staff: p.staff, startedAt: now(), answeredAt: null };
    calls.set(c.id, c);
    send(ws, { t: 'call:started', callId: c.id, threadId: t.id, kind, reachable });
    const ring = { t: 'call:ring', callId: c.id, threadId: t.id, kind, from: callerInfo(u, t, p.asStaff), mode: t.user_id === u.id && t.peer_user_id ? 'work' : t.mode };
    for (const uid of p.users) toUser(uid, ring, ws);
    if (p.staff) toStaff(ring, ws);
    c.timer = setTimeout(() => endCall(c, 'missed'), 45000);
    return;
  }

  const c = calls.get(String(m.callId || ''));
  if (!c) { if (m.t.startsWith('call:')) send(ws, { t: 'call:ended', callId: m.callId, reason: 'gone' }); return; }
  const target = c.targets.includes(u.id) || (c.staff && u.is_admin);

  if (m.t === 'call:accept') {
    if (!target || c.callee) return;
    c.callee = ws; c.answeredAt = now(); clearTimeout(c.timer);
    send(c.caller, { t: 'call:accepted', callId: c.id });
    // Stop the ringing everywhere else (other tabs, other staff).
    for (const uid of c.targets) toUser(uid, { t: 'call:taken', callId: c.id }, ws);
    if (c.staff) toStaff({ t: 'call:taken', callId: c.id }, ws);
    return;
  }
  if (m.t === 'call:decline') { if (target && !c.callee) endCall(c, 'declined', ws); return; }
  if (m.t === 'call:end') { if (ws === c.caller || ws === c.callee) endCall(c, 'ended', ws); return; }
  if (m.t === 'call:signal') {
    // SDP offers/answers and ICE candidates, relayed only between the two connected parties.
    const other = ws === c.caller ? c.callee : ws === c.callee ? c.caller : null;
    if (other && m.data && typeof m.data === 'object' && JSON.stringify(m.data).length < 20000) send(other, { t: 'call:signal', callId: c.id, data: m.data });
  }
}

function attach(server) {
  wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/ws') return socket.destroy();
    const origin = req.headers.origin;
    if (origin) { try { if (new URL(origin).host !== req.headers.host) return socket.destroy(); } catch { return socket.destroy(); } }
    const s = userFromToken(url.searchParams.get('token') || cookieToken(req));
    if (!s) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, ws => {
      ws.user = s.user; ws.sid = s.sid; ws.alive = true;
      if (!socks.has(ws.user.id)) socks.set(ws.user.id, new Set());
      socks.get(ws.user.id).add(ws);
      send(ws, { t: 'hello', userId: ws.user.id });
      ws.on('pong', () => { ws.alive = true; });
      ws.on('message', raw => { try { onMessage(ws, raw); } catch (e) { console.error('ws', e); } });
      ws.on('close', () => {
        const set = socks.get(ws.user.id); if (set) { set.delete(ws); if (!set.size) socks.delete(ws.user.id); }
        for (const c of [...calls.values()]) if (c.caller === ws || c.callee === ws) endCall(c, 'ended', ws);
      });
    });
  });
  const beat = setInterval(() => {
    for (const set of socks.values()) for (const ws of set) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; try { ws.ping(); } catch { /* closed */ }
    }
  }, 30000);
  beat.unref();
  server.on('close', () => clearInterval(beat));
}

/** Drop live sockets of a session or a whole user (sign-out, block). */
function kick(userId, sid) { for (const ws of [...(socks.get(userId) || [])]) if (!sid || ws.sid === sid) ws.close(4001, 'signed out'); }

module.exports = { attach, isOnline, staffOnline, kick, threadParties };
