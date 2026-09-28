/* AfterWorc staff console: inbox (with calls), briefs, requests, specialists, users (verification level, status, checks), skills moderation, deals, money, e-mails. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../shared/api.js';
import { socket } from '../shared/socket.js';
import { CallProvider, useCalls } from '../shared/calls.jsx';
import { Ic, LogoMark } from '../shared/icons.jsx';

const eur = n => '€' + Number(n || 0).toLocaleString('en-GB');
const Pill = ({ c = '', children }) => <span className={'pill ' + c}>{children}</span>;
const Empty = ({ children }) => <div className="empty" style={{ padding: 24 }}><p>{children}</p></div>;
const TABS = [['inbox', 'Inbox'], ['briefs', 'Briefs'], ['leads', 'Requests'], ['specs', 'Specialists'], ['users', 'Users & checks'], ['skills', 'Skills'], ['deals', 'Deals'], ['money', 'Money'], ['mail', 'E-mails']];
const STEPS = [['id', 'ID verified'], ['skills', 'Skills test'], ['refs', 'References'], ['interview', 'Interview'], ['checked', 'Checked in person']];
const LEVELS = [['registered', 'Registered'], ['verified', 'Verified (ID)'], ['checked', 'Checked in person']];
const STATUSES = [['active', 'Active'], ['hold', 'On hold (no payments or new work)'], ['blocked', 'Blocked (cannot sign in)']];

function useStore() {
  const [o, setO] = useState(null);
  const [toastMsg, setToast] = useState(null);
  const timer = useRef(null);
  const toast = useCallback((text, err) => { setToast({ text, err }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 3000); }, []);
  const load = useCallback(async () => { try { setO(await api('/admin/overview')); } catch (e) { toast(e.message, true); } }, [toast]);
  const act = useCallback(async (type, payload, msg) => {
    try { await api('/admin/action', { type, ...payload }); await load(); toast(msg || 'Saved'); return true; } catch (e) { toast(e.message, true); return false; }
  }, [load, toast]);
  return { o, load, act, toast, toastMsg };
}

/* ---------- inbox ---------- */
function Inbox({ o, act, sel, setSel }) {
  const calls = useCalls();
  const th = o.threads.find(x => x.id === sel) || o.threads[0];
  const [text, setText] = useState(''); const [as, setAs] = useState('staff'); const [name, setName] = useState(() => { try { return localStorage.getItem('aw-staff-sign') || ''; } catch { return ''; } });
  const tb = useRef(null);
  useEffect(() => { if (tb.current) tb.current.scrollTop = tb.current.scrollHeight; }, [th && th.id, th && th.msgs.length]);
  if (!th) return <Empty>No conversations yet.</Empty>;
  const kindLabel = x => x.kind === 'tech' ? 'Tech support' : x.kind === 'support' ? 'Support · ' + (x.mode === 'hire' ? 'hiring' : 'working') : x.title;
  const send = async () => { if (!text.trim()) return; try { localStorage.setItem('aw-staff-sign', name); } catch { /* ignore */ } if (await act('thread_reply', { threadId: th.id, text, as, name }, 'Sent')) setText(''); };
  return (
    <div className="msgs open" style={{ height: 'calc(100vh - 170px)' }}>
      <div className="ml">{o.threads.map(x => <button key={x.id} className={'li ' + (x.id === th.id ? 'on' : '')} onClick={() => setSel(x.id)}>
        <span className="grow"><div className="t" style={{ fontSize: 13.5 }}>{x.owner} · {kindLabel(x)}</div><div className="s">{x.email} · {x.at}</div></span>
        {x.kind === 'tech' && <Pill c="info">Tech</Pill>}{x.unread > 0 && <Pill c="ok">New</Pill>}</button>)}</div>
      <div className="th">
        <div className="thh"><div className="grow"><b>{th.owner} &lt;{th.email}&gt;</b><div className="muted tiny">{th.kind === 'tech' ? 'Technical support thread' : th.kind === 'support' ? 'Support / matching thread' : `Conversation with specialist ${th.title}${th.linked ? ' (has an account; they reply themselves)' : ' (no account: reply as them)'}`} · {th.sub}</div></div>
          <button className="iconbtn" title="Voice call" aria-label="Voice call" onClick={() => calls.start(th.id, 'audio', { name: th.owner, initials: th.owner.split(/\s+/).map(w => w[0]).join('').slice(0, 2) })}><Ic n="phone" s={17} /></button>
          <button className="iconbtn" title="Video call" aria-label="Video call" onClick={() => calls.start(th.id, 'video', { name: th.owner, initials: th.owner.split(/\s+/).map(w => w[0]).join('').slice(0, 2) })}><Ic n="video" s={17} /></button>
          {th.unread > 0 && <button className="btn ghost sm" onClick={() => act('thread_read', { threadId: th.id }, 'Marked read')}>Mark read</button>}</div>
        <div className="tb" ref={tb}>{th.msgs.map((m, i) => m.f === 'system' ? <div key={i} className="bub sys">{m.t}</div>
          : <div key={i} className={'bub ' + (m.f === 'staff' || m.f === 'relay' ? 'me' : '')} style={{ alignSelf: m.f === 'staff' || m.f === 'relay' ? 'flex-end' : 'flex-start', whiteSpace: 'pre-wrap' }}><span className="who">{m.f === 'user' ? th.owner : m.f === 'peer' ? (m.who || th.title) : m.who || 'AfterWorc'}</span>{m.t}<span className="tm">{m.tm}{m.edited ? ' · edited' : ''}</span></div>)}</div>
        <div className="tf" style={{ flexWrap: 'wrap' }}>
          <textarea className="inp" rows={2} style={{ flex: 1, minHeight: 44 }} placeholder="Reply…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }} />
          {th.kind === 'specialist' && !th.linked && <select className="inp" style={{ width: 'auto' }} value={as} onChange={e => setAs(e.target.value)}><option value="staff">as AfterWorc</option><option value="relay">as {th.title}</option></select>}
          <input className="inp" style={{ width: 150 }} placeholder="Signed (e.g. Anna R.)" value={name} onChange={e => setName(e.target.value)} />
          <button className="btn g" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- briefs ---------- */
function BriefCard({ b, o, act }) {
  const specs = o.specialists.filter(s => s.published);
  const [st, setSt] = useState(b.status); const [mn, setMn] = useState(b.matcher.name); const [mr, setMr] = useState(b.matcher.role);
  const [inv, setInv] = useState((o.specialists.find(s => s.linked) || {}).id || ''); const [invWhy, setInvWhy] = useState('');
  const [sl, setSl] = useState([0, 1, 2].map(i => b.shortlist[i] || '')); const [why, setWhy] = useState([0, 1, 2].map(i => (b.shortlist[i] && b.why[b.shortlist[i]]) || ''));
  return (
    <details className="card"><summary style={{ cursor: 'pointer', listStyle: 'none' }}><div className="row between wrapf"><div><b>{b.title}</b><div className="muted small">{b.signedAs} · {b.email} · {b.type} · {b.area} · {b.budget} · sent {b.sent || ''}</div></div>
      <span className="row">{b.overdue && <Pill c="bad">Over 48 h</Pill>}{b.type === 'eor' && <Pill c="info">EOR · {b.options.country}</Pill>}<Pill c={b.status === 'shortlist' ? 'ok' : ['review', 'matching'].includes(b.status) ? 'wait' : ''}>{b.status}</Pill></span></div></summary>
      <div className="grid g2" style={{ marginTop: 14 }}><div>
        <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{b.desc}</p><p className="muted small" style={{ marginTop: 6 }}>People: {b.people || '—'} · Start: {b.start} · Promised by {b.promised || ''}</p>
        <div className="row wrapf" style={{ marginTop: 10 }}><select className="inp" style={{ width: 'auto' }} value={st} onChange={e => setSt(e.target.value)}>{['review', 'matching', 'shortlist', 'hired', 'closed'].map(s => <option key={s}>{s}</option>)}</select>
          <input className="inp" style={{ width: 150 }} placeholder="Matcher name" value={mn} onChange={e => setMn(e.target.value)} /><input className="inp" style={{ width: 200 }} placeholder="Matcher role" value={mr} onChange={e => setMr(e.target.value)} />
          <button className="btn ghost sm" onClick={() => act('brief_update', { id: b.id, status: st, matcherName: mn, matcherRole: mr })}>Save</button></div>
        <h4 style={{ marginTop: 16 }}>Invite a specialist with an account</h4>
        <div className="row wrapf" style={{ marginTop: 6 }}><select className="inp" style={{ width: 'auto' }} value={inv} onChange={e => setInv(e.target.value)}>{o.specialists.filter(s => s.linked).map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}</select>
          <input className="inp" style={{ flex: 1, minWidth: 160 }} placeholder="Why them (one reason per line)" value={invWhy} onChange={e => setInvWhy(e.target.value)} /><button className="btn ghost sm" onClick={() => act('brief_invite', { id: b.id, specialistId: inv, why: invWhy }, 'Invitation sent')}>Invite</button></div>
        {b.proposals.length > 0 && <><h4 style={{ marginTop: 16 }}>Proposals</h4>{b.proposals.map(p => <p key={p.id} className="small">{p.name}: {p.rate} · {p.note}</p>)}</>}
      </div><div>
        <h4>Shortlist (up to 3)</h4>
        {[0, 1, 2].map(i => <div key={i} className="row" style={{ marginTop: 8, alignItems: 'flex-start' }}>
          <select className="inp" style={{ width: 220 }} value={sl[i]} onChange={e => setSl(sl.map((x, j) => j === i ? e.target.value : x))}><option value="">—</option>{specs.map(s => <option key={s.id} value={s.id}>{s.name} · {s.area}</option>)}</select>
          <input className="inp" placeholder="Why matched" value={why[i]} onChange={e => setWhy(why.map((x, j) => j === i ? e.target.value : x))} /></div>)}
        <button className="btn g sm" style={{ marginTop: 10 }} onClick={() => { const ids = sl.filter(Boolean); const w = {}; sl.forEach((k, i) => { if (k) w[k] = why[i]; }); act('brief_shortlist', { id: b.id, specialists: ids, why: w }, 'Shortlist published and client notified'); }}>Publish shortlist to client</button>
      </div></div>
    </details>
  );
}

function Leads({ o, act }) {
  const [edit, setEdit] = useState({});
  if (!o.leads.length) return <Empty>No requests yet.</Empty>;
  return <div className="card" style={{ padding: 0, overflow: 'auto' }}><table className="tbl"><thead><tr><th>When</th><th>Kind</th><th>E-mail</th><th>Request</th><th>Status</th><th>Note</th><th /></tr></thead><tbody>{o.leads.map(l => {
    const e = edit[l.id] || { status: l.status, note: l.staff_note }; const set = v => setEdit({ ...edit, [l.id]: { ...e, ...v } });
    return <tr key={l.id}><td className="muted">{l.at}</td><td>{l.kind}{l.data.type && <><br /><span className="muted tiny">{l.data.type}</span></>}</td><td><a href={'mailto:' + l.email}>{l.email}</a>{l.data.chan && l.data.chan !== 'Email only' && <><br /><span className="muted tiny">{l.data.chan} {l.data.contact || ''}</span></>}</td>
      <td style={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>{l.data.need || l.data.text || ''}</td>
      <td><select className="inp" style={{ width: 'auto' }} value={e.status} onChange={x => set({ status: x.target.value })}>{['unconfirmed', 'new', 'replied', 'won', 'closed'].map(s => <option key={s}>{s}</option>)}</select></td>
      <td><input className="inp" value={e.note} onChange={x => set({ note: x.target.value })} /></td><td><button className="btn ghost sm" onClick={() => act('lead_status', { id: l.id, ...e })}>Save</button></td></tr>;
  })}</tbody></table></div>;
}

/* ---------- specialists ---------- */
function SpecForm({ s, o, act }) {
  const init = s || { id: '', name: '', role: '', area: 'Development', skills: [], rate: '', monthly: '', level: 'verified', avail: 'Available now', city: '', langs: 'EN', bio: '', checkedBy: '', checkedOn: '', published: true };
  const [f, setF] = useState({ ...init, skills: (init.skills || []).join(', ') });
  const inp = (k, label) => <label className="field"><span>{label}</span><input className="inp" value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>;
  return (<>
    <div className="grid g3" style={{ marginTop: 12 }}>
      {inp('name', 'Name')}{inp('role', 'Role / headline')}
      <label className="field"><span>Area</span><select className="inp" value={f.area} onChange={e => setF({ ...f, area: e.target.value })}>{o.areas.map(a => <option key={a}>{a}</option>)}</select></label>
      {inp('skills', 'Skills (comma separated)')}{inp('rate', 'Rate € / h')}{inp('monthly', 'Monthly € (teams)')}
      <label className="field"><span>Level</span><select className="inp" value={f.level} onChange={e => setF({ ...f, level: e.target.value })}>{['registered', 'verified', 'checked'].map(l => <option key={l}>{l}</option>)}</select></label>
      {inp('avail', 'Availability')}{inp('city', 'City')}{inp('langs', 'Languages')}{inp('checkedBy', 'Checked by')}{inp('checkedOn', 'Checked on (e.g. Sep 2026)')}
    </div>
    <label className="field"><span>Bio</span><textarea className="inp" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></label>
    <div className="row wrapf"><label className="row small"><input type="checkbox" checked={!!f.published} onChange={e => setF({ ...f, published: e.target.checked })} /> Published in the directory</label>
      <button className="btn g sm" onClick={() => act('spec_save', { ...f, id: s ? s.id : undefined, wasPublished: !!(s && s.published) })}>{s ? 'Save' : 'Create'}</button></div>
  </>);
}
function Specs({ o, act }) {
  const [link, setLink] = useState({}); const [opp, setOpp] = useState({});
  return <div className="stack">
    <details className="card"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>+ Add a specialist to the directory</summary><SpecForm o={o} act={act} /></details>
    {o.specialists.map(s => { const op = opp[s.id] || { title: '', client: '', budget: '', kind: 'Matched', why: '', descr: '' }; const setOp = v => setOpp({ ...opp, [s.id]: { ...op, ...v } }); return (
      <details key={s.id} className="card"><summary style={{ cursor: 'pointer', listStyle: 'none' }}><div className="row between wrapf"><div className="row">{s.avatar ? <span className="avatar sm"><img src={s.avatar} alt="" /></span> : null}<div><b>{s.name}</b> <span className="muted small">{s.role} · {s.area} · {s.rate ? eur(s.rate) + '/h' : s.monthly ? eur(s.monthly) + '/mo' : 'no rate'}</span><div className="muted tiny">{s.email ? 'Account: ' + s.email : 'No account (staff act for them)'} · {s.deals} deals{s.rating ? ' · ★ ' + s.rating : ''}</div></div></div>
        <span className="row">{s.submitted && !s.published && <Pill c="wait">Submitted for review</Pill>}<Pill c={s.level === 'checked' ? 'ok' : s.level === 'verified' ? 'info' : ''}>{s.level}</Pill><Pill c={s.published ? 'ok' : ''}>{s.published ? 'Public' : 'Hidden'}</Pill></span></div></summary>
        {s.profile && s.profile.portfolio && <p className="small" style={{ marginTop: 8 }}>Portfolio link: <a href={/^https?:\/\//.test(s.profile.portfolio) ? s.profile.portfolio : '#'} target="_blank" rel="noopener noreferrer">{s.profile.portfolio}</a> · {s.profile.hours || ''} h/week</p>}
        <SpecForm s={s} o={o} act={act} />
        {!s.email ? <div className="row wrapf" style={{ marginTop: 10 }}><input className="inp" style={{ maxWidth: 280 }} placeholder="Link to user e-mail" value={link[s.id] || ''} onChange={e => setLink({ ...link, [s.id]: e.target.value })} /><button className="btn ghost sm" onClick={() => act('link_specialist', { specialistId: s.id, email: link[s.id] }, 'Linked')}>Link account</button></div>
          : <><h4 style={{ marginTop: 14 }}>Send a matched opportunity</h4>
            <div className="grid g3" style={{ marginTop: 6 }}><input className="inp" placeholder="Title" value={op.title} onChange={e => setOp({ title: e.target.value })} /><input className="inp" placeholder="Client" value={op.client} onChange={e => setOp({ client: e.target.value })} /><input className="inp" placeholder="Budget, e.g. €4,000 fixed" value={op.budget} onChange={e => setOp({ budget: e.target.value })} /></div>
            <div className="row wrapf" style={{ marginTop: 6 }}><select className="inp" style={{ width: 'auto' }} value={op.kind} onChange={e => setOp({ kind: e.target.value })}><option>Matched</option><option>Team seat</option></select><input className="inp" style={{ flex: 1 }} placeholder="Why them (one per line)" value={op.why} onChange={e => setOp({ why: e.target.value })} /><button className="btn ghost sm" onClick={() => act('opp_create', { specialistId: s.id, ...op }, 'Opportunity sent')}>Send</button></div>
            <textarea className="inp" style={{ marginTop: 6 }} placeholder="Description" value={op.descr} onChange={e => setOp({ descr: e.target.value })} /></>}
      </details>); })}
  </div>;
}

/* ---------- users: verification level, account status, check steps ---------- */
function UserCard({ u, act }) {
  const [lv, setLv] = useState(u.level || 'registered');
  const [st, setSt] = useState(u.status || 'active'); const [note, setNote] = useState(u.status_note || '');
  const [steps, setSteps] = useState(() => Object.fromEntries(STEPS.map(([k]) => [k, { st: (u.verify[k] || {}).st || '', sub: (u.verify[k] || {}).sub || '' }])));
  const pending = Object.values(u.verify || {}).some(v => v && v.st === 'pending');
  return (
    <details className="card"><summary style={{ cursor: 'pointer', listStyle: 'none' }}><div className="row between wrapf"><div className="row">
      <span className="avatar sm">{u.avatar ? <img src={u.avatar} alt="" /> : (u.name || u.email).slice(0, 2).toUpperCase()}</span>
      <div><b>{u.name}</b> <span className="muted small">{u.email} · joined {u.at} · prefers {u.role_pref === 'hire' ? 'hiring' : 'working'}</span></div></div>
      <span className="row wrapf">{!u.email_verified && <Pill c="wait">E-mail unconfirmed</Pill>}{u.twofa ? <Pill c="ok">2FA</Pill> : null}{u.is_admin ? <Pill c="info">Staff</Pill> : null}
        <Pill c={u.level === 'checked' ? 'ok' : u.level === 'verified' ? 'info' : ''}>{(LEVELS.find(x => x[0] === u.level) || LEVELS[0])[1]}</Pill>
        {u.status !== 'active' && <Pill c={u.status === 'blocked' ? 'bad' : 'wait'}>{u.status === 'blocked' ? 'Blocked' : 'On hold'}</Pill>}
        {u.closed_at ? <Pill c="bad">Closed</Pill> : null}{pending && <Pill c="wait">Check pending</Pill>}</span></div></summary>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card pad-s"><h4>Verification level</h4><p className="muted tiny" style={{ margin: '4px 0 8px' }}>Sets the badge on the account and public profile. “Checked in person” marks every check done.{u.verifiedOn ? ` Last set ${u.verifiedOn}${u.verified_by ? ' by ' + u.verified_by : ''}.` : ''}</p>
          <div className="row wrapf"><select className="inp" style={{ width: 'auto' }} value={lv} onChange={e => setLv(e.target.value)}>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <button className="btn g sm" onClick={() => act('user_level', { userId: u.id, level: lv }, 'Level saved; user notified')}>Verify / set level</button></div></div>
        <div className="card pad-s"><h4>Account status</h4><p className="muted tiny" style={{ margin: '4px 0 8px' }}>On hold: can sign in and message us, but cannot pay, withdraw or start work. Blocked: signed out everywhere and cannot sign in.</p>
          <div className="row wrapf"><select className="inp" style={{ width: 'auto' }} value={st} onChange={e => setSt(e.target.value)}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <input className="inp" style={{ flex: 1, minWidth: 180 }} placeholder="Note shown to the user (optional)" value={note} onChange={e => setNote(e.target.value)} />
            <button className={'btn sm ' + (st === 'blocked' ? 'danger' : 'g')} onClick={() => { if (st !== 'blocked' || confirm('Block this user? They are signed out everywhere.')) act('user_status', { userId: u.id, status: st, note }, 'Status saved'); }}>Save status</button></div></div>
      </div>
      <div style={{ overflowX: 'auto' }}><table className="tbl" style={{ marginTop: 10 }}><thead><tr><th>Check step</th><th>Status</th><th>Details</th><th /></tr></thead><tbody>{STEPS.map(([k, l]) => { const v = u.verify[k] || {}; const s = steps[k]; return <tr key={k}><td>{l}</td>
        <td><select className="inp" style={{ width: 'auto' }} value={s.st} onChange={e => setSteps({ ...steps, [k]: { ...s, st: e.target.value } })}><option value="">not started</option><option value="pending">pending</option><option value="done">done</option></select></td>
        <td><input className="inp" value={s.sub} placeholder="e.g. Passed · 86%" onChange={e => setSteps({ ...steps, [k]: { ...s, sub: e.target.value } })} />
          <div className="muted tiny">{v.slot && 'Booked: ' + v.slot}{v.refs && v.refs.map((r, i) => <div key={i}>{r.name} &lt;{r.email}&gt; {r.company || ''}</div>)}{v.file && <a href={`/api/account/files/${v.file}`}>ID document</a>}</div></td>
        <td><button className="btn ghost sm" onClick={() => act('verify_set', { userId: u.id, key: k, st: s.st, sub: s.sub })}>Save</button></td></tr>; })}</tbody></table></div>
      <div className="row wrapf" style={{ marginTop: 10 }}><button className="btn ghost sm" onClick={() => { if (confirm('Change staff access?')) act('user_admin', { id: u.id, admin: !u.is_admin }); }}>{u.is_admin ? 'Remove staff access' : 'Make staff'}</button></div>
    </details>
  );
}
function Users({ o, act }) {
  const [q, setQ] = useState(''); const [f, setF] = useState('all');
  const list = o.users.filter(u => (!q || (u.email + ' ' + u.name).toLowerCase().includes(q.toLowerCase())) && (f === 'all' || (f === 'pending' ? Object.values(u.verify || {}).some(v => v && v.st === 'pending') : f === 'unverified' ? u.level === 'registered' : u.status === f)));
  return <>
    <div className="row wrapf" style={{ marginBottom: 12 }}><input className="inp" placeholder="Search users" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
      <div className="chips">{[['all', 'All'], ['pending', 'Checks pending'], ['unverified', 'Not verified'], ['hold', 'On hold'], ['blocked', 'Blocked']].map(([k, l]) => <button key={k} className={'chip ' + (f === k ? 'on' : '')} onClick={() => setF(k)}>{l}</button>)}</div></div>
    <div className="stack">{list.map(u => <UserCard key={u.id + ':' + u.level + ':' + u.status} u={u} act={act} />)}{!list.length && <Empty>No users match.</Empty>}</div>
  </>;
}

/* ---------- skills moderation: approve, add, delete, merge duplicates ---------- */
function Skills({ o, act }) {
  const [q, setQ] = useState(''); const [f, setF] = useState('pending'); const [add, setAdd] = useState('');
  const [sel, setSel] = useState(new Set()); const [into, setInto] = useState('');
  const [rename, setRename] = useState({});
  const norm = s => s.toLowerCase().replace(/[^a-z0-9а-яёõäöü+#]/gi, '');
  const dupKeys = useMemo(() => { const m = {}; o.skills.forEach(k => { const n = norm(k.name); m[n] = (m[n] || 0) + 1; }); return m; }, [o.skills]);
  const list = o.skills.filter(k => (!q || k.name.toLowerCase().includes(q.toLowerCase())) && (f === 'all' || (f === 'dups' ? dupKeys[norm(k.name)] > 1 : k.status === f)));
  const pendingN = o.skills.filter(k => k.status === 'pending').length;
  const toggle = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const chosen = o.skills.filter(k => sel.has(k.id));
  return <div className="stack">
    <div className="card"><div className="row between wrapf"><div><h3>Skills catalog</h3><p className="muted small">New skills typed by users wait here and only appear on public profiles once approved. Merge duplicates (e.g. “Postgres” into “PostgreSQL”): every profile is updated.</p></div>
      <div className="row wrapf"><input className="inp" placeholder="New skill name" value={add} onChange={e => setAdd(e.target.value)} style={{ width: 200 }} onKeyDown={async e => { if (e.key === 'Enter' && add.trim() && await act('skill_add', { name: add }, 'Skill added')) setAdd(''); }} /><button className="btn g sm" disabled={!add.trim()} onClick={async () => { if (await act('skill_add', { name: add }, 'Skill added')) setAdd(''); }}><Ic n="plus" s={14} />Add</button></div></div></div>
    <div className="row wrapf"><input className="inp" placeholder="Search skills" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 280 }} />
      <div className="chips">{[['pending', `Waiting (${pendingN})`], ['approved', 'Approved'], ['dups', 'Possible duplicates'], ['all', 'All']].map(([k, l]) => <button key={k} className={'chip ' + (f === k ? 'on' : '')} onClick={() => setF(k)}>{l}</button>)}</div></div>
    {chosen.length > 0 && <div className="card pad-s row wrapf" style={{ borderColor: 'var(--brand2)' }}><Ic n="merge" s={16} /><b className="small">{chosen.length} selected</b><span className="small muted">Merge into</span>
      <select className="inp" style={{ width: 'auto' }} value={into} onChange={e => setInto(e.target.value)}><option value="">choose the skill to keep…</option>{o.skills.filter(k => k.status === 'approved' || sel.has(k.id)).map(k => <option key={k.id} value={k.id}>{k.name}{k.status === 'pending' ? ' (pending)' : ''}</option>)}</select>
      <button className="btn g sm" disabled={!into} onClick={async () => { if (await act('skill_merge', { intoId: +into, ids: [...sel].filter(x => x !== +into) }, 'Merged; profiles updated')) { setSel(new Set()); setInto(''); } }}>Merge</button>
      <button className="btn link small" onClick={() => setSel(new Set())}>Clear</button></div>}
    <div className="card" style={{ padding: 0, overflow: 'auto' }}><table className="tbl"><thead><tr><th style={{ width: 30 }} /><th>Skill</th><th>Status</th><th>Used on</th><th>Added</th><th /></tr></thead><tbody>
      {list.map(k => <tr key={k.id}>
        <td><input type="checkbox" checked={sel.has(k.id)} onChange={() => toggle(k.id)} aria-label={'Select ' + k.name} /></td>
        <td>{k.status === 'pending' ? <input className="inp" style={{ maxWidth: 220 }} value={rename[k.id] ?? k.name} onChange={e => setRename({ ...rename, [k.id]: e.target.value })} aria-label="Name" /> : <b>{k.name}</b>}{dupKeys[norm(k.name)] > 1 && <> <Pill c="wait">duplicate?</Pill></>}</td>
        <td><Pill c={k.status === 'approved' ? 'ok' : 'wait'}>{k.status}</Pill></td>
        <td className="muted">{k.uses} profile{k.uses === 1 ? '' : 's'}</td>
        <td className="muted small">{k.at}{k.by ? ' · ' + k.by : ''}</td>
        <td className="r"><span className="row" style={{ justifyContent: 'flex-end' }}>
          {k.status === 'pending' && <button className="btn g sm" onClick={() => act('skill_approve', { id: k.id, name: rename[k.id] ?? k.name }, 'Approved')}>Approve</button>}
          <button className="btn danger sm" onClick={() => { if (confirm(`Delete “${k.name}”? It is also removed from ${k.uses} profile(s).`)) act('skill_delete', { id: k.id, fromProfiles: true }, 'Deleted'); }}>Delete</button></span></td>
      </tr>)}
      {!list.length && <tr><td colSpan={6} className="muted">Nothing here.</td></tr>}
    </tbody></table></div>
  </div>;
}

/* ---------- deals, money, mail ---------- */
function Deals({ o, act }) {
  const [x, setX] = useState({});
  const v = (k, d) => (x[k] ?? d ?? '');
  const set = (k, val) => setX({ ...x, [k]: val });
  return <>
    {o.issues.length > 0 && <div className="card" style={{ marginBottom: 14 }}><h3>Issues (mediation)</h3>{o.issues.map(i => <div key={i.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}><div><b>{i.title}</b> <span className="muted small">{i.email || ''} · {i.at}</span><p className="small">{i.text}</p></div>{i.status === 'open' ? <button className="btn ghost sm" onClick={() => act('issue_close', { id: i.id })}>Mark resolved</button> : <Pill c="ok">Resolved</Pill>}</div>)}</div>}
    <div className="stack">{o.deals.length ? o.deals.map(d => { const cur = d.ms.find(m => ['inprogress', 'changes'].includes(m.st)); return <div key={d.id} className="card">
      <div className="row between wrapf"><div><b>{d.title}</b> <span className="muted small">{d.client} → {d.specName}{d.linked ? '' : ' (no account)'} · {d.model} · {eur(d.total)}</span></div><Pill c={d.status === 'active' ? 'info' : d.status === 'done' ? 'ok' : 'wait'}>{d.status}</Pill></div>
      <div className="small muted" style={{ marginTop: 6 }}>{d.ms.map(m => `${m.n} ${eur(m.amt)} ${m.st}`).join(' · ')}</div>
      {!d.linked && <div className="row wrapf" style={{ marginTop: 10 }}>{d.status === 'proposed' && <button className="btn g sm" onClick={() => act('deal_accept_for', { dealId: d.id }, 'Accepted; client notified')}>Accept terms for {d.specName}</button>}
        {cur && <><input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder={`Delivery note from ${d.specName}`} value={v('dn' + d.id)} onChange={e => set('dn' + d.id, e.target.value)} /><button className="btn g sm" onClick={() => act('deal_deliver_for', { dealId: d.id, note: v('dn' + d.id) }, 'Delivered; client notified')}>Deliver “{cur.n}”</button></>}</div>}
      {d.kind === 'dept' && d.status === 'active' && <div className="row wrapf" style={{ marginTop: 10 }}><input className="inp" style={{ width: 200 }} placeholder="Week 40 · 28 Sep–4 Oct" value={v('rw' + d.id)} onChange={e => set('rw' + d.id, e.target.value)} /><input className="inp" style={{ width: 90 }} placeholder="Hours" value={v('rh' + d.id)} onChange={e => set('rh' + d.id, e.target.value)} /><input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Summary" value={v('rs' + d.id)} onChange={e => set('rs' + d.id, e.target.value)} /><button className="btn ghost sm" onClick={() => act('report_add', { dealId: d.id, week: v('rw' + d.id), hours: v('rh' + d.id), summary: v('rs' + d.id) }, 'Report posted')}>Post weekly report</button></div>}
    </div>; }) : <Empty>No deals yet.</Empty>}</div>
  </>;
}
function Money({ o, act }) {
  return <>
    <div className="grid g2"><div className="card"><h3>SEPA top-ups to confirm</h3>{o.sepa.length ? o.sepa.map(x => <div key={x.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}><span className="small">{x.at} · {x.email} · {x.mode} · ref {x.ref || ''}</span><span className="row"><b>{eur(x.amount)}</b><button className="btn g sm" onClick={() => act('sepa_confirm', { txId: x.id }, 'Balance credited')}>Arrived</button></span></div>) : <p className="muted small" style={{ marginTop: 6 }}>Nothing pending.</p>}</div>
      <div className="card"><h3>Payouts to send</h3>{o.payouts.length ? o.payouts.map(x => <div key={x.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}><span className="small">{x.at} · {x.email} · {x.tax.holder || ''} {x.tax.iban || 'no IBAN'}</span><span className="row"><b>{eur(-x.amount)}</b><button className="btn g sm" onClick={() => act('payout_done', { txId: x.id }, 'Marked paid')}>Paid</button></span></div>) : <p className="muted small" style={{ marginTop: 6 }}>Nothing pending.</p>}</div></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Booked calls and interviews</h3>{o.bookings.length ? <table className="tbl"><tbody>{o.bookings.map(b => <tr key={b.id}><td>{b.kind}</td><td>{b.name} &lt;{b.email}&gt;</td><td>with {b.with_name}</td><td><b>{b.slot}</b></td><td className="muted">{b.at}</td></tr>)}</tbody></table> : <p className="muted small">None yet.</p>}</div>
  </>;
}
function Mail({ o }) {
  return <><p className="muted small" style={{ marginBottom: 10 }}>{o.smtp ? 'Sent through your SMTP server.' : 'SMTP_URL is not set, so e-mails are only logged here and in the server log. Set SMTP_URL to deliver them.'}</p>
    <div className="stack">{o.outbox.map(m => <details key={m.id} className="card"><summary style={{ cursor: 'pointer' }}><b>{m.subject}</b> <span className="muted small">to {m.to_addr} · {m.at} · {m.status}{m.error ? ' · ' + m.error : ''}</span></summary><pre style={{ whiteSpace: 'pre-wrap', font: '13px/1.5 Inter,sans-serif', marginTop: 10 }}>{m.body}</pre></details>)}</div></>;
}

function Console({ store }) {
  const { o, load, act, toastMsg } = store;
  const [tab, setTab] = useState(() => (location.hash.replace('#', '') || 'inbox'));
  const [sel, setSel] = useState(null);
  useEffect(() => { history.replaceState(null, '', '#' + tab); }, [tab]);
  useEffect(() => { const f = () => { const h = location.hash.replace('#', ''); if (TABS.some(x => x[0] === h)) setTab(h); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => {
    socket.start(); let h = null;
    const off = socket.on(m => { if (m.t === 'sync' && !h) h = setTimeout(() => { h = null; const a = document.activeElement; if (!(a && a.matches('input,textarea,select'))) load(); }, 400); });
    const poll = setInterval(() => { if (!document.hidden && !socket.online) { const a = document.activeElement; if (!(a && a.matches('input,textarea,select'))) load(); } }, 30000);
    return () => { off(); clearInterval(poll); };
  }, [load]);
  if (!o) return <div className="loading">Loading…</div>;
  const c = {
    inbox: o.threads.filter(x => x.unread).length, briefs: o.briefs.filter(b => ['review', 'matching'].includes(b.status)).length, leads: o.leads.filter(l => l.status === 'new').length,
    specs: o.specialists.filter(s => s.linked && !s.published && s.profile && s.submitted).length, users: o.users.filter(u => Object.values(u.verify || {}).some(v => v && v.st === 'pending')).length,
    skills: o.skills.filter(k => k.status === 'pending').length,
    deals: o.deals.filter(d => !d.linked && (d.status === 'proposed' || d.ms.some(m => ['inprogress', 'changes'].includes(m.st)))).length + o.issues.filter(i => i.status === 'open').length, money: o.sepa.length + o.payouts.length
  };
  const body = { inbox: <Inbox o={o} act={act} sel={sel} setSel={setSel} />, briefs: o.briefs.length ? <div className="stack">{o.briefs.map(b => <BriefCard key={b.id + b.status} b={b} o={o} act={act} />)}</div> : <Empty>No briefs yet.</Empty>, leads: <Leads o={o} act={act} />, specs: <Specs o={o} act={act} />, users: <Users o={o} act={act} />, skills: <Skills o={o} act={act} />, deals: <Deals o={o} act={act} />, money: <Money o={o} act={act} />, mail: <Mail o={o} /> }[tab];
  return <>
    <header className="top"><div className="in"><a className="logo" href="/" style={{ textDecoration: 'none', color: 'inherit' }}><span className="mk"><LogoMark /></span><span className="wm">afterwor<i>c</i></span></a><Pill c="info">Staff console</Pill><div className="spacer" />
      {!o.smtp && <Pill c="wait">No SMTP: e-mails are logged only</Pill>}<span className="small muted hide-m">{o.me.email}</span><a className="btn ghost sm" href="/app">My account</a><button className="btn ghost sm" onClick={() => load().then(() => store.toast('Refreshed'))}>Refresh</button></div></header>
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: 18 }}>
      <div className="tabsx">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setSel(null); }}>{l}{c[k] > 0 && <span className="c" style={{ background: 'var(--amber)', color: '#fff' }}>{c[k]}</span>}</button>)}</div>
      {body}
    </div>
    {toastMsg && <div className="toast" role="status">{toastMsg.text}</div>}
  </>;
}

export default function Admin() {
  const store = useStore();
  useEffect(() => { store.load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <CallProvider toast={store.toast}><Console store={store} /></CallProvider>;
}
