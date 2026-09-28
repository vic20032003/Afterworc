'use strict';
/* Chat search across the conversations a user takes part in: people (chat names, specialists) and message text. */
const express = require('express');
const D = require('../domain');
const U = require('../util');
const { requireUser } = require('../auth');
const { all } = D;

const router = express.Router();
router.use(requireUser);

const like = q => '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%';
function snippet(body, q) {
  const i = body.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return body.slice(0, 140);
  const from = Math.max(0, i - 50);
  return (from ? '…' : '') + body.slice(from, i + q.length + 80) + (i + q.length + 80 < body.length ? '…' : '');
}

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  const mode = req.query.mode === 'work' ? 'work' : 'hire';
  if (q.length < 2) return res.json({ people: [], threads: [], messages: [] });
  const uid = req.user.id;
  const mine = `(t.user_id=@uid AND t.mode=@mode) OR (t.peer_user_id=@uid AND @mode='work')`;
  const threads = all(`SELECT t.id, t.kind, t.user_id, t.title, t.peer_title, t.sub, u.name owner FROM threads t JOIN users u ON u.id=t.user_id
    WHERE (${mine}) AND ((t.user_id=@uid AND t.title LIKE @q ESCAPE '\\') OR (t.peer_user_id=@uid AND (t.peer_title LIKE @q ESCAPE '\\' OR u.name LIKE @q ESCAPE '\\')))
    ORDER BY t.updated_at DESC LIMIT 20`, { uid, mode, q: like(q) })
    .map(t => ({ id: String(t.id), kind: t.kind, name: t.user_id === uid ? t.title : (t.peer_title || t.owner), sub: t.sub }));
  const messages = all(`SELECT m.id, m.thread_id, m.body, m.created_at, m.sender, m.sender_name, t.user_id, t.title, t.peer_title, u.name owner FROM messages m
    JOIN threads t ON t.id=m.thread_id JOIN users u ON u.id=t.user_id
    WHERE (${mine}) AND m.sender!='system' AND m.body LIKE @q ESCAPE '\\' ORDER BY m.id DESC LIMIT 40`, { uid, mode, q: like(q) })
    .map(m => ({ id: m.id, threadId: String(m.thread_id), chat: m.user_id === uid ? m.title : (m.peer_title || m.owner), text: snippet(m.body, q), at: m.created_at, tm: U.fmtAgo(m.created_at) }));
  // In hiring mode, people you have not written to yet can be found too, to start a conversation.
  const people = mode === 'hire' ? all(`SELECT * FROM specialists WHERE published=1 AND (user_id IS NULL OR user_id!=@uid) AND (name LIKE @q ESCAPE '\\' OR role LIKE @q ESCAPE '\\') ORDER BY name LIMIT 8`, { uid, q: like(q) })
    .map(s => { const v = D.specView(s); return { id: v.id, name: v.name, role: v.role, avatar: v.avatar, lv: v.lv }; }) : [];
  res.json({ people, threads, messages });
});

module.exports = router;
