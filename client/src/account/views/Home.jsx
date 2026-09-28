import { useApp, person, hasCard, firstName } from '../store.jsx';
import { Ic, SealIc } from '../../shared/icons.jsx';
import { t, tr, eur } from '../../shared/i18n.js';
import { Head, Avatar, CardArt, useCardOpts, greet } from '../ui.jsx';

/** The dashboard card. When a card exists, the whole card opens Money › Card (the same place as the card in the top bar). */
export function CardMini() {
  const { data, mode, go, act, setModal } = useApp();
  const c = data.cards[mode];
  const opts = useCardOpts();
  if (!hasCard(c)) return (
    <div className="card">
      <CardArt opts={opts(mode, { side: 'front', frozen: false })} style={{ marginBottom: 12 }} />
      <div className="row between"><h3>{mode === 'hire' ? t('Company card') : t('Your own card')}</h3><span className="pill ok">{t('New')}</span></div>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>{mode === 'hire' ? t('A Mastercard debit card on the {org} balance for tools, ads and travel.', { org: data.acting }) : t('Released earnings are spendable at once. No waiting for a bank transfer.')}</p>
      <div className="row wrapf"><button className="btn g sm" onClick={() => setModal({ k: 'getcard' })}>{t('Get my card')}</button><button className="btn link small" onClick={() => go('card')}>{t('How it works')}</button></div>
    </div>
  );
  return (
    <div className="card">
      <div className="row between"><h3>{t('AfterWorc card')}</h3><span className={'pill ' + (c.frozen ? 'wait' : 'ok')}>{c.frozen ? t('Frozen') : t('Active')}</span></div>
      <button className="pcard link" style={{ marginTop: 12, width: '100%' }} onClick={() => go('card')} aria-label={t('Open card ••{last4}', { last4: c.last4 })}>
        <CardArt opts={opts(mode, { side: 'front' })} className="" />
      </button>
      <div style={{ marginTop: 10 }}><b className="small">{t('Mastercard debit')} ••{c.last4}</b><div className="muted tiny">{t('Spends from Available · {amount}', { amount: eur(data.money[mode].available) })}</div><div className="muted tiny">{t('{spent} of {limit} this month', { spent: eur(c.spent), limit: eur(c.lim.month) })}</div></div>
      <div className="row wrapf" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={() => act('card_freeze')}>{c.frozen ? t('Unfreeze') : t('Freeze')}</button>
        <button className="btn ghost sm" onClick={() => setModal({ k: 'topup' })}>{t('Top up')}</button>
        <button className="btn ghost sm" onClick={() => go('card')}>{t('Manage')}</button>
      </div>
    </div>
  );
}

function attention(data) {
  const att = [];
  data.briefs.filter(b => b.status === 'shortlist').forEach(b => att.push({ ic: 'brief', t: t('Shortlist ready: {title}', { title: b.title }), s: t('{n} checked matches', { n: b.shortlist.length }) + (b.readyIn ? ' · ' + t('ready in {h} (promised 48 h)', { h: b.readyIn }) : ''), btn: t('Compare'), go: 'brief', p: b.id, pill: <span className="pill ok">{t('Ready')}</span> }));
  data.deals.filter(x => x.side === 'hire').forEach(x => {
    const dm = x.ms.find(m => m.st === 'delivered');
    if (dm) att.push({ ic: 'deal', t: t('Review delivery: {name}', { name: dm.n }), s: `${x.title} · ${person(data, x.with).name} · ${t('{amount} held', { amount: eur(dm.amt) })}`, btn: t('Review'), go: 'deal', p: x.id, pill: <span className="clock"><Ic n="clock" s={14} />{t('auto-accepts {when}', { when: tr(dm.dueIn) })}</span> });
    const rp = x.reports && x.reports.find(r => r.st === 'review');
    if (rp) att.push({ ic: 'team', t: t('Approve weekly report: {week}', { week: rp.w }), s: `${x.title} · ${t('{h} h logged', { h: rp.hrs })}`, btn: t('Open'), go: 'deal', p: x.id, pill: <span className="clock"><Ic n="clock" s={14} />{tr(rp.due)}</span> });
    if (x.status === 'active' && !x.ms.some(m => ['funded', 'inprogress', 'delivered', 'changes'].includes(m.st)) && x.ms.some(m => m.st === 'unfunded')) att.push({ ic: 'money', t: t('Fund the next milestone: {title}', { title: x.title }), s: t('{name} is ready to start', { name: person(data, x.with).name }), btn: t('Fund'), go: 'deal', p: x.id, pill: <span className="pill info">{t('Next step')}</span> });
    if (x.status === 'done' && x.review === 'pending') att.push({ ic: 'star', t: t('Leave a review for {name}', { name: person(data, x.with).name }), s: t('Hidden until you both submit (14 days)'), btn: t('Review'), go: 'deal', p: x.id, pill: <span className="pill">{t('Optional')}</span> });
  });
  return att;
}

export const START_OPTS = () => [
  ['task', 'task', t('A task'), t('One job, fixed price')],
  ['person', 'user', t('A specialist'), t('Joins your team, hourly')],
  ['team', 'team', t('A ready team'), t('Lead + people who ship together')],
  ['dept', 'dept', t('A department'), t('A whole function, monthly')],
  ['eor', 'globe', t('Hire abroad (EOR)'), t('We employ, pay and insure them for you')]
];

export function HireHome() {
  const { data, go, startBrief } = useApp();
  const att = attention(data), nx = att[0];
  const hd = data.deals.filter(x => x.side === 'hire' && ['active', 'proposed'].includes(x.status));
  const mine = [...new Set(data.deals.filter(x => x.side === 'hire').map(x => x.with))].slice(0, 3);
  const suggest = mine.length ? mine : Object.values(data.people).filter(p => p.lv === 'checked').slice(0, 3).map(p => p.id);
  return (<>
    <Head title={`${greet()}, ${firstName(data.me.name)}`} sub={t("Here's what needs you today at {org}.", { org: data.acting })} />
    <div className="stack">
      {nx ? <div className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{t('Next step')}</span><h2>{nx.t}</h2><p>{nx.s}</p></div><button className="btn" onClick={() => go(nx.go, nx.p)}>{nx.btn} <Ic n="arrow" s={16} w={2.2} /></button></div>
        : !data.briefs.length && <div className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{t('Build your workforce. We run the rest.')}</span><h2>{t('Post your first brief')}</h2><p>{t('Describe what you need in one line. A person reads it and sends up to 3 checked matches within 48 hours.')}</p></div><button className="btn" onClick={() => go('newbrief')}>{t('Start a brief')} <Ic n="arrow" s={16} w={2.2} /></button></div>}
      <div className="grid g4">
        <div className="stat"><span className="l">{t('Active deals')}</span><b>{hd.length}</b><div className="h">{t('{a} department · {b} other', { a: hd.filter(x => x.kind === 'dept').length, b: hd.filter(x => x.kind !== 'dept').length })}</div></div>
        <div className="stat"><span className="l">{t('Waiting on you')}</span><b style={{ color: att.length ? 'var(--amber)' : 'inherit' }}>{att.length}</b><div className="h">{att.length ? t('see the list below') : t('all caught up')}</div></div>
        <div className="stat"><span className="l">{t('Held until you release')}</span><b>{eur(data.money.hire.held)}</b><div className="h">{t('safe until accepted')}</div></div>
        <div className="stat"><span className="l">{t('Open briefs')}</span><b>{data.briefs.filter(b => ['matching', 'shortlist', 'review'].includes(b.status)).length}</b><div className="h">{t('{n} shortlist ready', { n: data.briefs.filter(b => b.status === 'shortlist').length })}</div></div>
      </div>
      <div className="split">
        <div className="stack">
          <div className="row between"><h2>{t('Needs your attention')}</h2></div>
          {att.length ? <div className="list">{att.map((a, i) => <button key={i} className="li" onClick={() => go(a.go, a.p)}><span className="avatar alt sm"><Ic n={a.ic} s={15} /></span><span className="grow"><div className="t">{a.t}</div><div className="s">{a.s}</div></span><span className="r">{a.pill}<span className="btn ghost sm">{a.btn}</span></span></button>)}</div>
            : <div className="empty" style={{ padding: 24 }}><h3>{t("You're all caught up")}</h3><p>{t('Nothing is waiting on you. New deliveries and shortlists will show up here.')}</p></div>}
          <h2 style={{ marginTop: 20 }}>{t('Start something new')}</h2>
          <div className="opts">{START_OPTS().map(o => <button key={o[0]} className="opt" onClick={() => startBrief(o[0])}><span className="ic"><Ic n={o[1]} s={17} /></span><b>{o[2]}</b><span>{o[3]}</span></button>)}</div>
        </div>
        <div className="stack sticky">
          <CardMini />
          <div className="card"><h3>{mine.length ? t('Your specialists') : t('Checked specialists')}</h3><p className="muted small">{mine.length ? t('People you have worked with, one click to rehire') : t('Available to hire today')}</p>
            <div className="stack-s" style={{ marginTop: 12 }}>{suggest.map(k => { const p = person(data, k); return <button key={k} className="li" style={{ border: 0, padding: '8px 0' }} onClick={() => go('pp', k)}><Avatar name={p.name} src={p.avatar} size="sm" alt /><span className="grow"><div className="t" style={{ fontSize: 13.5 }}>{p.name}</div><div className="s">{p.role}</div></span>{p.lv === 'checked' && <span style={{ color: 'var(--brand2)' }}><SealIc /></span>}</button>; })}</div>
            <button className="btn link small" onClick={() => go('find')}>{t('Browse all checked specialists')}</button></div>
          <div className="card" style={{ background: 'var(--mintbg)', borderColor: 'transparent' }}><h3 style={{ color: 'var(--brand)' }}>{t('How AfterWorc protects you')}</h3>
            <ul className="small" style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.8 }}><li>{t('Every specialist is checked by a person')}</li><li>{t('Money is held until you release it')}</li><li>{t('7 days to review each delivery')}</li><li>{t('One VAT invoice per month for departments')}</li><li>{t('Hire in another country: we are the employer of record')}</li></ul></div>
        </div>
      </div>
    </div>
  </>);
}

/* ================= Working ================= */
export function profComplete(p) {
  if (!p || !p.id) return { pct: 0, left: [t('Set up your profile')] };
  const checks = [[t('Add a headline'), !!p.headline], [t('Add your main profession'), !!p.profession], [t('Add an about text'), !!p.about], [t('Add at least 3 skills'), (p.skills || []).length >= 3], [t('Add your rate'), !!p.rate], [t('Add a work sample'), !!p.portfolio || (p.portfolioCount || 0) > 0]];
  return { pct: Math.round(checks.filter(c => c[1]).length / checks.length * 100), left: checks.filter(c => !c[1]).map(c => c[0]) };
}
function workNext(data) {
  const v = Object.fromEntries(data.verify.map(x => [x[3], x]));
  const inv = data.opps.find(o => o.status === 'invited');
  const prop = data.deals.find(x => x.side === 'work' && x.status === 'proposed');
  const due = data.deals.find(x => x.side === 'work' && x.ms.some(m => ['inprogress', 'changes'].includes(m.st)));
  if (prop) return { mono: t('New deal offered'), t: t('{client} sent you terms', { client: prop.client }), s: prop.title, btn: [t('Review terms'), 'deal', prop.id] };
  if (inv) return { mono: t('Invitation'), t: inv.title, s: `${inv.client} · ${inv.budget} · ${tr(inv.due)}`, btn: [t('Reply'), 'opp', inv.id] };
  if (due) { const m = due.ms.find(x => ['inprogress', 'changes'].includes(x.st)); return { mono: t('Delivery due'), t: t('Deliver: {name}', { name: m.n }), s: `${due.client} · ${t('{amount} funded', { amount: eur(m.amt) })}`, btn: [t('Open deal'), 'deal', due.id] }; }
  const pc = profComplete({ ...(data.prof || {}), portfolioCount: data.portfolio.length });
  if (pc.pct < 100) return { mono: t('Next step'), t: t('Finish your profile'), s: pc.left.slice(0, 2).join(' · '), btn: [t('Edit profile'), 'profile'] };
  if (v.id[2] === 'todo') return { mono: t('Next step · getting checked'), t: t('Verify your identity'), s: t('Upload a photo of your ID card or passport. We check it within 1 business day.'), act: ['idcheck', t('Upload ID')] };
  if (v.interview[2] === 'todo') return { mono: t('Next step · last one to get the seal'), t: t('Book your interview'), s: t('30 minutes with our team, in Tallinn or by video. After this your profile can show "Checked in person".'), act: ['interview', t('Book a time')] };
  if (v.interview[4] === 'pending') return { mono: t('Interview booked'), t: tr(v.interview[1]), s: t('Mäealuse 10/2, Tallinn, or by video. We send the calendar invite.'), act: ['interview', t('Change time')] };
  return { mono: t('All set'), t: t("You're ready for matches"), s: t('We invite you when a brief fits your checked skills. No bidding.'), btn: [t('See opportunities'), 'opps'] };
}

export function WorkHome() {
  const { data, go, setModal } = useApp();
  const done = data.verify.filter(v => v[2] === 'done').length, nx = workNext(data), pc = profComplete({ ...(data.prof || {}), portfolioCount: data.portfolio.length });
  const active = data.deals.filter(x => x.side === 'work' && x.status === 'active');
  const inv = data.opps.filter(o => o.status === 'invited');
  const stepAct = { id: 'idcheck', refs: 'refs', interview: 'interview' };
  const needs = [
    ...data.deals.filter(x => x.side === 'work' && x.status === 'proposed').map(x => <button key={'p' + x.id} className="li" onClick={() => go('deal', x.id)}><Avatar name={x.client} size="sm" alt /><span className="grow"><div className="t">{t('Terms to answer: {title}', { title: x.title })}</div><div className="s">{x.client} · {eur(x.total)}</div></span><span className="r"><span className="pill wait">{t('New')}</span></span></button>),
    ...inv.map(o => <button key={'o' + o.id} className="li" onClick={() => go('opp', o.id)}><Avatar name={o.by || 'AW'} size="sm" /><span className="grow"><div className="t">{t('Invitation: {title}', { title: o.title })}</div><div className="s">{o.client} · {o.budget}</div></span><span className="r"><span className="clock"><Ic n="clock" s={14} />{tr(o.due)}</span></span></button>),
    ...active.flatMap(x => x.ms.filter(m => ['inprogress', 'changes'].includes(m.st)).map(m => <button key={'m' + m.id} className="li" onClick={() => go('deal', x.id)}><Avatar name={x.client} size="sm" alt /><span className="grow"><div className="t">{m.st === 'changes' ? t('Changes requested: {name}', { name: m.n }) : t('Deliver: {name}', { name: m.n })}</div><div className="s">{x.client} · {t('{amount} funded', { amount: eur(m.amt) })}</div></span><span className="r"><span className="pill info">{t('In progress')}</span></span></button>))
  ];
  return (<>
    <Head title={t('Hi {name}', { name: firstName(data.me.name) })} sub={t('Your work at a glance.')} />
    <div className="stack">
      <div className="next"><div style={{ position: 'relative', zIndex: 1 }}><span className="mono">{nx.mono}</span><h2>{nx.t}</h2><p>{nx.s}</p></div>
        <div className="row wrapf" style={{ position: 'relative', zIndex: 1 }}>{nx.btn ? <button className="btn" onClick={() => go(nx.btn[1], nx.btn[2])}>{nx.btn[0]} <Ic n="arrow" s={16} w={2.2} /></button> : <button className="btn" onClick={() => setModal({ k: nx.act[0] })}>{nx.act[1]}</button>}</div></div>
      <div className="grid g4">
        <div className="stat"><span className="l">{t('Earned this month')}</span><b>{eur(data.money.work.earnedMonth)}</b><div className="h">{t('released to you')}</div></div>
        <div className="stat"><span className="l">{t('Active deals')}</span><b>{active.length}</b><div className="h">{t('{amount} held for you', { amount: eur(data.money.work.held) })}</div></div>
        <div className="stat"><span className="l">{t('Invitations')}</span><b style={{ color: inv.length ? 'var(--amber)' : 'inherit' }}>{inv.length}</b><div className="h">{inv.length ? t('reply within 72 h') : t('none open')}</div></div>
        <div className="stat"><span className="l">{t('Profile')}</span><b>{pc.pct}%</b><div className="h">{pc.left.length ? t('{n} things left', { n: pc.left.length }) : t('complete')}</div></div>
      </div>
      <div className="split"><div className="stack">
        <div className="row between"><h2>{t('Needs you')}</h2></div>
        {needs.length ? <div className="list">{needs}</div> : <div className="empty" style={{ padding: 24 }}><h3>{t('Nothing due')}</h3><p>{t('Invitations, new terms and deliveries show up here.')}</p></div>}
        <h2 style={{ marginTop: 14 }}>{t('Matched for you')} <span className="muted small" style={{ fontFamily: 'Inter', fontWeight: 400 }}>· {t('no bidding, no Connects')}</span></h2>
        {data.opps.filter(o => o.status === 'new').length ? <div className="list">{data.opps.filter(o => o.status === 'new').map(o => <button key={o.id} className="li" onClick={() => go('opp', o.id)}><span className="avatar alt sm"><Ic n="opp" s={15} /></span><span className="grow"><div className="t">{o.title}</div><div className="s">{o.client} · {o.budget}</div></span><span className="r"><span className="pill info">{tr(o.kind)}</span></span></button>)}</div>
          : <div className="empty" style={{ padding: 24 }}><h3>{t('No matches yet')}</h3><p>{t('Finish your profile and get checked. We invite you when a brief fits.')}</p></div>}
      </div><div className="stack sticky">
        <div className="card"><div className="row between"><h3>{t('Getting checked')}</h3><span className={'pill ' + (done === 5 ? 'ok' : 'wait')}>{t('{a} of {b}', { a: done, b: 5 })}</span></div>
          <div className="ladder" style={{ marginTop: 10 }}>{data.verify.map((v, i) => <div key={v[3]} className={'lad ' + v[2]}><span className="b">{v[2] === 'done' ? '✓' : i + 1}</span><div><b className="small">{tr(v[0])}</b><div className="muted tiny">{tr(v[1])}</div></div>
            <span>{v[2] !== 'done' && stepAct[v[3]] && v[4] !== 'pending' && <button className="btn ghost sm" onClick={() => setModal({ k: stepAct[v[3]] })}>{v[3] === 'id' ? t('Upload') : v[3] === 'refs' ? t('Add') : t('Book')}</button>}</span></div>)}</div>
          <p className="muted tiny" style={{ marginTop: 6 }}>{t('A person checks every step. The skills test is scheduled by our team after your ID check.')}</p></div>
        <CardMini />
        <div className="card"><h3>{t('Finish your profile')}</h3><div className="progress" style={{ margin: '10px 0' }}><i style={{ width: pc.pct + '%' }} /></div>
          {pc.left.length ? <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>{pc.left.map(x => <li key={x}>{x}</li>)}</ul>
            : <p className="small muted">{t('Complete.')} {data.prof && data.prof.status === 'published' ? t('Your profile is public.') : data.prof && data.prof.status === 'submitted' ? t('Waiting for review.') : t('Submit it for review.')}</p>}
          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => go('profile')}>{t('Edit profile')}</button></div>
      </div></div>
    </div>
  </>);
}
