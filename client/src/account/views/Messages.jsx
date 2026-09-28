/* Messages: search by people and text, pinned chats, pinned messages, editing, technical support, voice and video calls. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { api } from '../../shared/api.js';
import { socket } from '../../shared/socket.js';
import { useCalls } from '../../shared/calls.jsx';
import { Ic } from '../../shared/icons.jsx';
import { t, tr, fmtTime, fmtDayLong } from '../../shared/i18n.js';
import { Head, Avatar, Empty, copyText } from '../ui.jsx';

const kindLabel = th => th.kind === 'tech' ? t('Technical support') : th.kind === 'support' ? t('AfterWorc team') : '';
const threadName = th => th.kind === 'tech' ? t('AfterWorc technical support') : tr(th.name);

function Highlight({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}
function ThreadAvatar({ th, size = 'sm' }) {
  if (th.kind === 'tech') return <span className="avwrap"><span className={'avatar ' + size} style={{ background: 'var(--bluebg)', color: 'var(--blue)' }}><Ic n="gear" s={15} /></span>{th.online && <span className="on" />}</span>;
  if (th.kind === 'support') return <span className="avwrap"><span className={'avatar ' + size}><Ic n="help" s={15} /></span>{th.online && <span className="on" />}</span>;
  return <Avatar name={th.name} src={th.avatar} size={size} alt online={th.online} />;
}

function ChatList({ list, current, q, setQ, results, onOpen, onPerson }) {
  const pinned = list.filter(x => x.pinned), rest = list.filter(x => !x.pinned);
  const L = s => String(s || '').toLowerCase();
  const s = q.trim().toLowerCase();
  const byName = s ? list.filter(x => L(threadName(x) + ' ' + x.sub).includes(s)) : null;
  const row = x => (
    <button key={x.id} className={'li ' + (current && x.id === current.id ? 'on' : '')} onClick={() => onOpen(x.id)} aria-current={current && x.id === current.id}>
      <ThreadAvatar th={x} />
      <span className="grow"><div className="t" style={{ fontSize: 13.5 }}>{threadName(x)}</div><div className="s" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.msgs.length ? tr(x.msgs[x.msgs.length - 1].t) : tr(x.sub)}</div></span>
      <span className="r" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>{x.msgs.length > 0 && <span className="when">{fmtTime(x.msgs[x.msgs.length - 1].at)}</span>}<span className="row" style={{ gap: 4 }}>{x.pinned && <span className="pin" title={t('Pinned')}><Ic n="pin" s={13} /></span>}{x.unread && <span className="pill ok">{t('New')}</span>}</span></span>
    </button>
  );
  return (
    <div className="ml">
      <div className="mlh"><div className="s"><Ic n="search" s={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search people and messages')} aria-label={t('Search people and messages')} /></div></div>
      {s ? (<>
        {byName.length > 0 && <><div className="sec">{t('Chats')}</div>{byName.map(row)}</>}
        {results && results.people.length > 0 && <><div className="sec">{t('People')}</div>{results.people.map(p => <button key={p.id} className="li" onClick={() => onPerson(p)}><Avatar name={p.name} src={p.avatar} size="sm" alt /><span className="grow"><div className="t" style={{ fontSize: 13.5 }}><Highlight text={p.name} q={q.trim()} /></div><div className="s">{p.role}</div></span><span className="r"><span className="pill">{t('Write')}</span></span></button>)}</>}
        {results && results.messages.length > 0 && <><div className="sec">{t('Messages')}</div>{results.messages.map(m => <button key={m.id} className="li" onClick={() => onOpen(m.threadId, m.id)}><span className="grow"><div className="t" style={{ fontSize: 13 }}>{tr(m.chat)} <span className="when" style={{ fontWeight: 400 }}>· {tr(m.tm)}</span></div><div className="hit"><Highlight text={m.text} q={q.trim()} /></div></span></button>)}</>}
        {!byName.length && results && !results.people.length && !results.messages.length && <div className="sec" style={{ textTransform: 'none' }}>{t('Nothing found')}</div>}
        {!results && s.length >= 2 && <div className="sec" style={{ textTransform: 'none' }}>{t('Searching…')}</div>}
      </>) : (<>
        {pinned.length > 0 && <><div className="sec">{t('Pinned')}</div>{pinned.map(row)}</>}
        {pinned.length > 0 && <div className="sec">{t('All chats')}</div>}
        {rest.map(row)}
      </>)}
    </div>
  );
}

function Bubble({ m, q, flash, sel, onSel, onPin, onEdit, onCopy }) {
  if (m.f === 'sys') return <div className="bub sys" id={'m' + m.id}>{tr(m.t)}</div>;
  const me = m.f === 'me';
  // Hover shows the tools on desktop; a tap toggles them on touch screens.
  return (
    <div className={'bubw ' + (me ? 'me ' : '') + (sel ? 'sel' : '')} id={'m' + m.id}>
      <div className={'bub ' + (me ? 'me ' : '') + (flash ? 'flash' : '')} onClick={() => onSel(sel ? null : m.id)}>
        {m.who && !me && <span className="who">{m.who}</span>}
        <Highlight text={m.t} q={q} />
        <span className="tm">{fmtTime(m.at)}{m.edited && ' · ' + t('edited')}{m.pinned && <span className="pinned">📌</span>}</span>
      </div>
      <div className="tools" role="toolbar" aria-label={t('Message actions')}>
        <button onClick={() => onPin(m)} title={m.pinned ? t('Unpin') : t('Pin')} aria-label={m.pinned ? t('Unpin') : t('Pin')}><Ic n="pin" s={14} /></button>
        {m.canEdit && <button onClick={() => onEdit(m)} title={t('Edit')} aria-label={t('Edit')}><Ic n="edit" s={14} /></button>}
        <button onClick={() => onCopy(m)} title={t('Copy')} aria-label={t('Copy')}><Ic n="copy" s={14} /></button>
      </div>
    </div>
  );
}

export default function Messages({ id }) {
  const { data, mode, go, act, setModal, toast, typing } = useApp();
  const calls = useCalls();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [showPins, setShowPins] = useState(false);
  const [pinIdx, setPinIdx] = useState(0);
  const [flash, setFlash] = useState(null);
  const [findQ, setFindQ] = useState('');
  const [selMsg, setSelMsg] = useState(null);
  const tb = useRef(null), input = useRef(null), lastTyping = useRef(0), lastLen = useRef(0);

  const list = useMemo(() => {
    const l = data.threads.filter(x => x.mode === mode && (x.msgs.length || x.kind === 'tech' || x.kind === 'support' || x.id === id));
    return [...l.filter(x => x.pinned), ...l.filter(x => !x.pinned)];
  }, [data.threads, mode, id]);
  const [idPart, jump] = String(id || '').split('~');
  const wide = typeof window !== 'undefined' && window.innerWidth > 820;
  // On wide screens the newest chat opens by default; on phones the list shows first.
  const current = list.find(x => x.id === idPart) || (!idPart && wide ? list[0] : null) || null;
  const jumped = useRef(null);

  // Server search (people + message text), debounced.
  useEffect(() => {
    const s = q.trim(); setResults(null);
    if (s.length < 2) return;
    const h = setTimeout(() => api(`/chat/search?mode=${mode}&q=${encodeURIComponent(s)}`).then(setResults).catch(() => setResults({ people: [], threads: [], messages: [] })), 250);
    return () => clearTimeout(h);
  }, [q, mode]);

  // Mark as read when opened or when new messages arrive while open.
  useEffect(() => { if (current && current.unread) api('/account/action', { type: 'thread_read', id: current.id }).catch(() => {}); }, [current && current.id, current && current.unread]);

  // Keep the newest message in view; jump to a searched or pinned message when asked.
  useLayoutEffect(() => {
    if (!tb.current || !current) return;
    if (jump && jumped.current !== id) {
      const el = document.getElementById('m' + jump);
      if (el) { jumped.current = id; lastLen.current = current.msgs.length; el.scrollIntoView({ block: 'center' }); setFlash(+jump); setTimeout(() => setFlash(null), 1800); return; }
    }
    if (current.msgs.length !== lastLen.current) { tb.current.scrollTop = tb.current.scrollHeight; lastLen.current = current.msgs.length; }
  });
  useEffect(() => { lastLen.current = 0; setEditing(null); setText(''); setShowPins(false); setPinIdx(0); }, [idPart]);

  const open = (tid, mid) => { setFindQ(mid ? q.trim() : ''); go('messages', mid ? `${tid}~${mid}` : tid); setQ(''); };
  const onPerson = async p => { setQ(''); await act('chat_start', { specialistId: p.id }); };
  const send = async () => {
    const v = text.trim(); if (!v || !current) return;
    if (editing) { const r = await act('msg_edit', { id: editing.id, text: v }, { quiet: true }); if (r) { setEditing(null); setText(''); } return; }
    setText('');
    const r = await act('message_send', { threadId: current.id, text: v }, { quiet: true });
    if (!r) setText(v);
    input.current && input.current.focus();
  };
  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
    if (e.key === 'Escape' && editing) { setEditing(null); setText(''); return; }
    if (e.key === 'ArrowUp' && !text && current) { const mine = [...current.msgs].reverse().find(m => m.canEdit); if (mine) { e.preventDefault(); startEdit(mine); } }
  };
  const onType = v => {
    setText(v);
    if (current && Date.now() - lastTyping.current > 2500) { lastTyping.current = Date.now(); socket.send({ t: 'typing', threadId: +current.id }); }
  };
  const startEdit = m => { setEditing(m); setText(m.t); setTimeout(() => input.current && input.current.focus(), 0); };
  const pin = m => act('msg_pin', { id: m.id }, { quiet: true });
  const call = kind => calls.start(current.id, kind, { name: threadName(current), initials: threadName(current).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(), avatar: current.avatar });

  if (!list.length) return (<>
    <Head title={t('Messages')} />
    <Empty icon="msg" title={t('No conversations yet')} text={t("Conversations start from a brief, a deal or a specialist's profile. You can always reach our team.")}><button className="btn g" onClick={() => act('tech_open', { mode })}>{t('Technical support')}</button></Empty>
  </>);

  const pinnedMsgs = current ? current.msgs.filter(m => m.pinned) : [];
  const pinShown = pinnedMsgs.length ? pinnedMsgs[(pinnedMsgs.length - 1 - (pinIdx % pinnedMsgs.length))] : null;
  const days = [];
  if (current) { let last = ''; for (const m of current.msgs) { const d = new Date(m.at).toDateString(); if (d !== last) { days.push({ day: m.at, key: 'd' + m.id }); last = d; } days.push(m); } }
  const tp = current && typing[current.id];

  return (<>
    <Head title={t('Messages')} sub={t('Every conversation is tied to a brief, a deal or a profile, so nothing gets lost.')}
      right={<><button className="btn ghost sm" onClick={() => act('tech_open', { mode })}><Ic n="gear" s={15} />{t('Technical support')}</button><button className="btn ghost sm" onClick={() => go('help')}><Ic n="help" s={15} />{t('Help')}</button></>} />
    <div className={'msgs ' + (current ? 'open' : '')}>
      <ChatList list={list} current={current} q={q} setQ={setQ} results={results} onOpen={open} onPerson={onPerson} />
      {current ? (
        <div className="th">
          <div className="thh">
            <button className="iconbtn back" onClick={() => go('messages')} aria-label={t('Back to chats')}><Ic n="back" s={16} /></button>
            <ThreadAvatar th={current} />
            <div className="grow" style={{ minWidth: 0 }}><b>{threadName(current)}</b><div className="muted tiny">{current.online ? t('Online now') : kindLabel(current) || tr(current.sub)}</div></div>
            {current.canCall && <><button className="iconbtn" onClick={() => call('audio')} title={t('Voice call')} aria-label={t('Voice call')}><Ic n="phone" s={17} /></button>
              <button className="iconbtn" onClick={() => call('video')} title={t('Video call')} aria-label={t('Video call')}><Ic n="video" s={17} /></button></>}
            <button className="iconbtn" onClick={() => setShowPins(v => !v)} title={t('Pinned messages')} aria-label={t('Pinned messages')} aria-expanded={showPins}><Ic n="pin" s={17} />{pinnedMsgs.length > 0 && <span className="dot" style={{ background: 'var(--brand2)' }}>{pinnedMsgs.length}</span>}</button>
            <button className="iconbtn hide-m" onClick={() => act('thread_pin', { id: current.id }, { quiet: true })} title={current.pinned ? t('Unpin chat') : t('Pin chat')} aria-label={current.pinned ? t('Unpin chat') : t('Pin chat')} style={current.pinned ? { background: 'var(--mintbg)', color: 'var(--brand)' } : undefined}><Ic n="star" s={17} /></button>
            {current.specialist && mode === 'hire' && <button className="btn ghost sm hide-m" onClick={() => go('pp', current.specialist)}>{t('Profile')}</button>}
            <button className="btn ghost sm hide-m" onClick={() => setModal({ k: 'call', p: current.specialist || 'x' })}><Ic n="cal" s={14} />{t('Book a call')}</button>
          </div>
          {pinShown && <button className="pinbar" onClick={() => { setPinIdx(i => i + 1); go('messages', `${current.id}~${pinShown.id}`); }} title={t('Go to the pinned message')}>
            <Ic n="pin" s={16} /><span className="tx"><b>{t('Pinned message')}{pinnedMsgs.length > 1 ? ` ${((pinIdx % pinnedMsgs.length) + 1)}/${pinnedMsgs.length}` : ''}</b>{pinShown.t}</span></button>}
          {showPins && <div className="pinpanel"><div className="nfh" style={{ padding: '10px 12px' }}><b>{t('Pinned messages')}</b><button className="x" onClick={() => setShowPins(false)} aria-label={t('Close')}>✕</button></div>
            {pinnedMsgs.length ? [...pinnedMsgs].reverse().map(m => <div key={m.id} className="row" style={{ borderTop: '1px solid var(--line)' }}>
              <button className="pi" style={{ borderTop: 0 }} onClick={() => { setShowPins(false); go('messages', `${current.id}~${m.id}`); }}><div className="muted tiny">{m.f === 'me' ? t('You') : m.who || threadName(current)} · {fmtDayLong(m.at)}</div><div style={{ whiteSpace: 'pre-wrap' }}>{m.t.length > 220 ? m.t.slice(0, 217) + '…' : m.t}</div></button>
              <button className="btn link small" style={{ marginRight: 10 }} onClick={() => pin(m)}>{t('Unpin')}</button></div>)
              : <p className="muted small" style={{ padding: '0 12px 12px' }}>{t('Nothing pinned yet. Hover a message and press the pin to keep it at hand.')}</p>}</div>}
          <div className="tb" ref={tb} aria-live="polite">
            {current.kind === 'tech' && <div className="bub sys">{t('Technical support: problems with log-in, payments, the card or the app. A person replies within one business day, often much sooner.')}</div>}
            {current.msgs.length ? days.map(x => x.day ? <div key={x.key} className="day">{fmtDayLong(x.day)}</div>
              : <Bubble key={x.id} m={x} q={findQ} flash={flash === x.id} sel={selMsg === x.id} onSel={setSelMsg} onPin={m => { setSelMsg(null); pin(m); }} onEdit={m => { setSelMsg(null); startEdit(m); }} onCopy={m => { setSelMsg(null); copyText(m.t, toast, t('Message')); }} />)
              : <div className="bub sys">{t('Write the first message.')}</div>}
          </div>
          <div className="typing">{tp && tp.until > Date.now() ? t('{name} is typing…', { name: tp.name }) : ''}</div>
          {editing && <div className="editbar"><Ic n="edit" s={15} /><span className="grow">{t('Editing')}: {editing.t}</span><button className="btn link small" onClick={() => { setEditing(null); setText(''); }}>{t('Cancel')}</button></div>}
          <div className="tf">
            <textarea ref={input} className="inp" id="msgin" rows={1} maxLength={4000} value={text} onChange={e => onType(e.target.value)} onKeyDown={onKey}
              placeholder={editing ? t('Edit the message…') : current.kind === 'tech' ? t('Describe the problem: what you did, what happened, which device') : t('Write a message… (contact details are shared after a deal starts)')} aria-label={t('Message')} />
            <button className="btn g" onClick={send} aria-label={editing ? t('Save') : t('Send')} disabled={!text.trim()}>{editing ? <Ic n="check" s={15} w={2.4} /> : <Ic n="send" s={15} />}</button>
          </div>
        </div>
      ) : <div className="th" style={{ display: 'grid', placeItems: 'center' }}><Empty icon="msg" title={t('Pick a conversation')} text={t('Or search for people and messages on the left.')} style={{ border: 0, background: 'transparent' }} /></div>}
    </div>
  </>);
}
