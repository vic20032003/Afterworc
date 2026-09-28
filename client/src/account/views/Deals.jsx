import { useState } from 'react';
import { useApp, person, needsMe, firstName } from '../store.jsx';
import { Ic, SealIc } from '../../shared/icons.jsx';
import { t, tr, eur } from '../../shared/i18n.js';
import { Head, Crumb, Empty, Avatar, Seal } from '../ui.jsx';

const MST = { released: ['Released', 'ok'], delivered: ['Delivered · review', 'wait'], unfunded: ['Not funded', ''], funded: ['Funded', 'info'], inprogress: ['In progress', 'info'], changes: ['Changes requested', 'wait'], proposed: ['Waiting to accept', 'wait'] };
export function dealState(d) {
  if (d.status === 'proposed') return d.side === 'hire' ? ['Waiting for them to accept', 'wait'] : ['Accept or decline', 'wait'];
  if (d.status === 'declined') return ['Declined', ''];
  if (d.status === 'cancelled') return ['Withdrawn', ''];
  if (d.status === 'done') return d.review === 'pending' && d.side === 'hire' ? ['Completed · review due', 'wait'] : ['Completed', 'ok'];
  if (needsMe(d)) return d.side === 'hire' ? ['Needs your review', 'wait'] : ['Delivery due', 'wait'];
  if (d.ms.some(m => m.st === 'delivered')) return ['Waiting for client', 'info'];
  if (!d.ms.some(m => ['funded', 'inprogress', 'changes'].includes(m.st))) return d.side === 'hire' ? ['Fund to continue', 'info'] : ['Waiting for funding', 'info'];
  return ['In progress', 'info'];
}
const party = (data, d) => d.side === 'hire' ? person(data, d.with) : { name: d.client, role: d.clientVerified ? t('Client · payment verified') : t('Client'), lv: null };

export function Deals() {
  const { data, mode, go, tab, setTab } = useApp();
  const k = tab || 'needs';
  const mine = data.deals.filter(x => x.side === mode);
  const f = { needs: x => needsMe(x) || x.status === 'proposed', active: x => ['active', 'proposed'].includes(x.status), done: x => ['done', 'declined', 'cancelled'].includes(x.status), all: () => true };
  const list = mine.filter(f[k]);
  return (<>
    <Head title={t('Deals')} sub={mode === 'hire' ? t('Every agreement: fixed-price, hourly, departments and people employed abroad. One status and one deadline each.') : t('Work you are doing for clients. Deliver, get accepted, get paid.')} />
    <div className="tabsx">{[['needs', 'Needs you'], ['active', 'Active'], ['done', 'Completed'], ['all', 'All']].map(([x, l]) => <button key={x} className={k === x ? 'on' : ''} onClick={() => setTab(x)}>{t(l)}<span className="c">{mine.filter(f[x]).length}</span></button>)}</div>
    {list.length ? <div className="list">{list.map(x => {
      const p = party(data, x); const st = dealState(x); const a = x.ms.find(m => ['delivered', 'inprogress', 'changes'].includes(m.st));
      return <button key={x.id} className="li" onClick={() => go('deal', x.id)}><Avatar name={p.name} src={p.avatar} size="sm" alt={x.side === 'hire'} /><span className="grow"><div className="t">{x.title}</div><div className="s">{p.name} · {tr(x.model)} · {x.monthly ? eur(x.monthly) + ' ' + t('/ mo') : eur(x.total)}</div></span>
        <span className="r">{a && a.st === 'delivered' && <span className="clock hide-m"><Ic n="clock" s={14} />{x.side === 'hire' ? t('auto-accepts {when}', { when: tr(a.dueIn) }) : t('client reviewing')}</span>}<span className={'pill ' + st[1]}>{t(st[0])}</span></span></button>;
    })}</div>
      : <Empty icon="deal" title={k === 'needs' ? t('Nothing needs you right now') : t('No deals here')} text={mode === 'hire' ? t("Deals start from a shortlist or a specialist's profile.") : t('Deals start when a client accepts your proposal.')}><button className="btn g" onClick={() => go(mode === 'hire' ? 'newbrief' : 'opps')}>{mode === 'hire' ? t('Start a brief') : t('See opportunities')}</button></Empty>}
  </>);
}

function Review({ d, p }) {
  const { act } = useApp();
  const [star, setStar] = useState(0);
  const [text, setText] = useState(''); const [note, setNote] = useState('');
  return (<div className="card"><h3>{t('How was working with {name}?', { name: p.name })}</h3><p className="muted small" style={{ margin: '4px 0 12px' }}>{t('Your review stays hidden until {name} submits theirs, or 14 days pass.', { name: firstName(p.name) })}</p>
    <div className="stars" role="radiogroup" aria-label={t('Rating')}>{[1, 2, 3, 4, 5].map(n => <button key={n} className={star >= n ? 'on' : ''} role="radio" aria-checked={star === n} aria-label={t('{n} stars', { n })} onClick={() => setStar(n)}>★</button>)}</div>
    <label className="field" style={{ marginTop: 10 }}><span>{t('Public review')}</span><textarea className="inp" maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder={t('What did they do well?')} /></label>
    <label className="field"><span>{t('Private note to AfterWorc (optional)')}</span><input className="inp" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder={t('Only our checking team sees this')} /><small>{t('Feeds our re-check of this specialist. Never shown publicly.')}</small></label>
    <button className="btn g" disabled={!star} onClick={() => act('deal_review', { dealId: d.id, stars: star, text, note })}>{t('Submit review')}</button></div>);
}

export function Deal({ id }) {
  const app = useApp();
  const { data, mode, go, act, setModal } = app;
  const d = data.deals.find(x => x.id === id && x.side === mode) || data.deals.find(x => x.id === id);
  if (!d) return <Empty icon="deal" title={t('Deal not found')}><button className="btn g" onClick={() => go('deals')}>{t('All deals')}</button></Empty>;
  if (d.side !== mode) setTimeout(() => app.setMode && go('deal', d.id, null, { m: d.side }), 0);
  const p = party(data, d); const st = dealState(d); const hire = d.side === 'hire';
  const a = d.ms.find(m => m.st === 'delivered') || d.ms.find(m => m.st === 'inprogress') || d.ms.find(m => m.st === 'changes');
  const ghostDark = { background: 'transparent', color: '#e7f0eb', borderColor: '#2b4638' };
  const main = [];
  if (d.status === 'proposed') main.push(hire
    ? <div key="p" className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{t('Waiting')}</span><h2>{t('{name} is reviewing your terms', { name: p.name })}</h2><p>{t('Usually within 24 h. Nothing is charged until they accept and you fund milestone 1.')}</p></div><div className="row wrapf" style={{ position: 'relative', zIndex: 1 }}>{d.threadId && <button className="btn" onClick={() => go('messages', d.threadId)}>{t('Message')}</button>}<button className="btn ghost" style={ghostDark} onClick={() => { if (confirm(t('Withdraw these terms?'))) act('deal_cancel', { dealId: d.id }); }}>{t('Withdraw terms')}</button></div></div>
    : <div key="p" className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{t('New deal · your answer')}</span><h2>{t('{client} sent you terms', { client: d.client })}</h2><p>{d.ms.map(m => m.n + ' · ' + eur(m.amt)).join(' · ')}{d.start ? ' · ' + t('start {when}', { when: tr(d.start) }) : ''}. {t('Nothing starts until the client funds milestone 1.')}</p></div><div className="row wrapf" style={{ position: 'relative', zIndex: 1 }}><button className="btn" onClick={() => act('deal_accept', { dealId: d.id })}>{t('Accept terms')}</button><button className="btn ghost" style={ghostDark} onClick={() => { if (confirm(t('Decline these terms?'))) act('deal_decline', { dealId: d.id }); }}>{t('Decline')}</button></div></div>);
  if (a && hire && a.st === 'delivered') main.push(<div key="dl" className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{t('Your move · auto-accepts {when}', { when: tr(a.autoAt) })}</span><h2>{t('{name} was delivered', { name: a.n })}</h2><p>{t('{amount} is held. Accept to release it, or ask for changes. If you do nothing for 7 days, it is accepted automatically.', { amount: eur(a.amt) })}</p>{a.deliveryNote && <p style={{ marginTop: 8, color: '#e7f0eb', whiteSpace: 'pre-wrap' }}>“{a.deliveryNote}”</p>}</div>
    <div className="row wrapf" style={{ position: 'relative', zIndex: 1 }}><button className="btn" onClick={() => setModal({ k: 'accept', d: d.id })}>{t('Accept & release {amount}', { amount: eur(a.amt) })}</button><button className="btn ghost" style={ghostDark} onClick={() => setModal({ k: 'text', title: t('Request changes'), label: t('What should change?'), ph: t("Be specific: which screen, what's missing, examples"), hint: t('The 7-day review clock restarts when they resubmit. Money stays held.'), btn: t('Send request'), type: 'ms_changes', payload: { dealId: d.id } })}>{t('Request changes')}</button></div></div>);
  if (a && !hire && ['inprogress', 'changes'].includes(a.st)) main.push(<div key="dv" className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{a.st === 'changes' ? t('Changes requested') : t('Your move')}</span><h2>{t('Deliver: {name}', { name: a.n })}</h2><p>{t('{amount} is funded and held for you. When you submit, the client has 7 days to accept. Then you are paid.', { amount: eur(a.amt) })}</p></div><button className="btn" onClick={() => setModal({ k: 'deliver', d: d.id })}>{t('Submit delivery')}</button></div>);
  if (a && !hire && a.st === 'delivered') main.push(<div key="w" className="banner"><Ic n="clock" s={18} /><span>{t('Delivered. The client has until {when} to accept; after that it is accepted automatically.', { when: tr(a.autoAt) })}</span></div>);
  if (a && hire && a.st === 'changes') main.push(<div key="c" className="banner am"><Ic n="clock" s={18} /><span>{t('Changes requested. {name} has been notified; the review clock restarts when they resubmit.', { name: p.name })}</span></div>);
  if (hire && d.status === 'active' && !a && !d.ms.some(m => m.st === 'funded') && d.ms.some(m => m.st === 'unfunded')) main.push(<div key="f" className="banner"><Ic n="money" s={18} /><span>{t("Fund the next milestone when you're ready. The money is held until you accept the work.")}</span></div>);
  if (d.kind !== 'dept' || d.ms.length) main.push(<div key="ms" className="card"><div className="row between"><h3>{d.kind === 'dept' ? t('Months') : t('Milestones')}</h3><span className="muted small">{tr(d.model)} · {eur(d.total)}</span></div>
    {d.ms.map((m, i) => <div key={m.id} className={'ms ' + (m.st === 'released' ? 'done' : ['delivered', 'inprogress', 'changes'].includes(m.st) ? 'act' : '')}><span className="n">{m.st === 'released' ? '✓' : i + 1}</span>
      <div><b>{m.n}</b><div className="muted small">{tr(m.note)}</div>{m.files.length > 0 && <div className="filelist">{m.files.map(f => <a key={f.id} className="chip" href={`/api/account/files/${f.id}`} style={{ textDecoration: 'none' }}><Ic n="file" s={13} /> {f.name}</a>)}</div>}</div>
      <div className="acts"><b>{eur(m.amt)}</b><span className={'pill ' + (MST[m.st] || ['', ''])[1]}>{t((MST[m.st] || [m.st])[0])}</span>{hire && m.st === 'unfunded' && d.status === 'active' && <button className="btn sm g" onClick={() => setModal({ k: 'fund', d: d.id, i: m.id })}>{t('Fund')}</button>}</div></div>)}
    {hire && ['active', 'proposed'].includes(d.status) && <button className="btn link small" onClick={() => setModal({ k: 'addms', d: d.id, dept: d.kind === 'dept', amount: d.monthly || '' })}><Ic n="plus" s={14} /> {d.kind === 'dept' ? t('Add a month') : t('Add a milestone')}</button>}</div>);
  if (d.kind === 'dept') main.push(<div key="team" className="stack">
    <div className="card"><div className="row between wrapf"><div><h3>{t('Team')}</h3><p className="muted small">{tr(d.month)} · {t('led by {name}', { name: p.name })}</p></div><div className="team">{d.team.map((x, i) => <span key={i} className={'avatar sm ' + (i ? 'alt' : '')} title={i ? x : person(data, x).name}>{String(i ? x : person(data, x).name).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>)}</div></div>
      <div className="row wrapf small" style={{ marginTop: 10, gap: 14 }}><span><SealIc /> {t('Checked by AfterWorc')}</span><span className="muted">{t('One agreement · one monthly VAT invoice')}</span></div></div>
    <div className="card"><div className="row between"><h3>{t('Weekly reports')}</h3><span className="muted small">{t('Approve or query within 7 days')}</span></div>
      {d.reports.length ? d.reports.map(r => <div key={r.id} className={'ms ' + (r.st === 'approved' ? 'done' : 'act')}><span className="n">{r.st === 'approved' ? '✓' : '!'}</span><div><b>{r.w}</b><div className="small" style={{ marginTop: 3 }}>{r.sum}</div><div className="muted tiny" style={{ marginTop: 3 }}>{t('{h} h logged by the team', { h: r.hrs })}</div></div>
        <div className="acts">{r.st === 'review' && hire ? <><span className="clock"><Ic n="clock" s={14} />{tr(r.due)}</span><button className="btn sm g" onClick={() => act('report_approve', { reportId: r.id })}>{t('Approve')}</button><button className="btn sm ghost" onClick={() => setModal({ k: 'text', title: t('Ask about this report'), label: t('Your question'), btn: t('Send'), type: 'report_query', payload: { dealId: d.id } })}>{t('Ask a question')}</button></> : <span className={'pill ' + (r.st === 'approved' ? 'ok' : 'wait')}>{r.st === 'approved' ? t('Approved') : t('In review')}</span>}</div></div>)
        : <p className="muted small" style={{ marginTop: 8 }}>{t('The first report arrives at the end of the first week.')}</p>}</div>
    {hire && <div className="grid g2"><div className="card"><h3>{t('This month')}</h3><div className="kv" style={{ marginTop: 10, fontSize: 13.5 }}><span>{t('Department fee')}</span><span>{eur(d.monthly)}</span><span>{t('Invoice')}</span><span>{t('Monthly (VAT)')}</span><span>{t('Started')}</span><span>{tr(d.start || d.created)}</span></div></div>
      <div className="card"><h3>{t('Change the team')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{t("Add a role, swap a person, or scale down with 2 weeks' notice.")}</p><button className="btn ghost sm" onClick={() => setModal({ k: 'text', title: t('Request a team change'), label: t('What should change?'), ph: t('Add a role, swap a person, or scale down'), btn: t('Send request'), type: 'request_change', payload: { dealId: d.id } })}>{t('Request a change')}</button></div></div>}
  </div>);
  if (d.status === 'done') main.push(d.review === 'pending' && hire ? <Review key="rv" d={d} p={p} /> : <div key="rv" className="banner"><Ic n="check" s={18} /><span>{t('Completed and paid.')} {d.review === 'done' ? t('Reviews from both sides are published.') : d.review === 'submitted' ? t('Review submitted; it appears when both sides have reviewed.') : ''}</span></div>);
  if (['declined', 'cancelled'].includes(d.status)) main.push(<div key="x" className="banner am"><Ic n="flag" s={18} /><span>{d.status === 'declined' ? t('These terms were declined.') : t('These terms were withdrawn.')} {t('Nothing was charged.')}</span></div>);
  const fee = d.monthly || d.total; const feePct = data.feePct;
  const thread = d.threadId && data.threads.find(x => x.id === d.threadId);
  return (<>
    <Head title={d.title} sub={`${hire ? t('with {name}', { name: p.name }) : t('for {name}', { name: p.name })} · ${tr(d.model)}`} right={<span className={'pill ' + st[1]}>{t(st[0])}</span>} crumb={<Crumb to="deals" label={t('Deals')} here={d.title} />} />
    <div className="split"><div className="stack">{main}</div>
      <div className="stack sticky">
        <div className="card"><div className="row"><Avatar name={p.name} src={p.avatar} alt={hire} online={thread && thread.online} /><div className="grow"><b>{p.name}</b><div className="muted small">{tr(p.role)}</div></div></div>
          <div style={{ marginTop: 8 }}>{hire ? <Seal lv={p.lv} /> : d.clientVerified && <span className="seal"><SealIc />{t('Payment verified')}</span>}</div>
          <div className="row wrapf" style={{ marginTop: 12 }}>{d.threadId && <button className="btn ghost sm" onClick={() => go('messages', d.threadId)}><Ic n="msg" s={14} />{t('Message')}</button>}{hire && <button className="btn ghost sm" onClick={() => go('pp', d.with)}>{t('Profile')}</button>}</div></div>
        <div className="card"><h3>{t('Money')}</h3><div className="feeline" style={{ marginTop: 10 }}>{hire ? <><span>{t('Deal value')}</span><span>{eur(fee)}{d.monthly ? ' ' + t('/ mo') : ''}</span><span>{t('AfterWorc fee')}</span><span>{t('included')}</span><span>{t('Contract fee')}</span><span>€0</span><span className="tot">{t('You pay')}</span><span className="tot">{eur(fee)}{d.monthly ? ' ' + t('/ mo') : ''}</span></>
          : <><span>{t('Deal value')}</span><span>{eur(fee)}</span><span>{t('AfterWorc fee')}</span><span>{feePct ? feePct + '%' : '€0'}</span><span className="tot">{t('You receive')}</span><span className="tot">{eur(fee * (1 - feePct / 100))}</span></>}</div>
          <p className="muted tiny" style={{ marginTop: 8 }}>{hire ? t('Held until you release each milestone.') : t('Released to your Working balance when the client accepts.')}</p></div>
        {['active', 'done'].includes(d.status) && <div className="card"><h3>{t('Something wrong?')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{t("Talk first. If you can't agree, a person from AfterWorc mediates within 2 business days. The money stays held.")}</p><button className="btn ghost sm" onClick={() => setModal({ k: 'issue', d: d.id })}><Ic n="flag" s={14} />{t('Open an issue')}</button></div>}
      </div></div>
  </>);
}
