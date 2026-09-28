import { useEffect, useState } from 'react';
import { useApp, person, firstName } from '../store.jsx';
import { Ic } from '../../shared/icons.jsx';
import { t, tr, fmtSlot } from '../../shared/i18n.js';
import { Head, Crumb, Empty, Avatar, Seal, rateOf, TYPEL, typeIc } from '../ui.jsx';
import { START_OPTS } from './Home.jsx';

export const AREAS = ['Development', 'Payments', 'Design', 'Marketing', 'Business Support', 'Content', 'Data & Infrastructure', 'Quality & Security'];
export const PROFS = {
  Development: ['Backend Developer', 'Frontend Developer', 'Fullstack Developer', 'Mobile Developer', 'DevOps Engineer', 'QA Engineer', 'Team Lead'],
  Payments: ['Payments Operations Specialist', 'Payment Integrations Engineer', 'AML / KYC Analyst', 'Compliance Officer', 'Reconciliation Analyst', 'Chargeback & Disputes Specialist', 'Head of Payments'],
  Design: ['UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Brand Designer', 'Motion Designer'],
  Marketing: ['Marketing Lead', 'SMM Manager', 'Content Writer', 'Performance Marketer', 'SEO Specialist'],
  'Business Support': ['Project Manager', 'Product Manager', 'Business Analyst', 'Customer Support', 'Accountant'],
  Content: ['Copywriter', 'Translator', 'Technical Writer', 'Video Editor'],
  'Data & Infrastructure': ['Data Engineer', 'Data Analyst', 'Cloud Engineer', 'Database Administrator'],
  'Quality & Security': ['QA Automation Engineer', 'Security Engineer', 'Penetration Tester']
};
/* Standard department line-ups. Payments replaces Design: AfterWorc focuses on SaaS, EMI, PSP and fintech teams. */
export const DEPTS = {
  Development: [['Team Lead', 1], ['Senior Developer', 1], ['Developer', 1], ['DevOps Engineer', 1], ['QA Engineer', 1]],
  Payments: [['Head of Payments', 1], ['Payments Operations Specialist', 1], ['Payment Integrations Engineer', 1], ['AML / KYC Analyst', 1], ['Reconciliation Analyst', 1]],
  Marketing: [['Marketing Lead', 1], ['SMM Manager', 1], ['Content Writer', 1], ['Performance Marketer', 1]],
  'Business Support': [['Project Manager', 1], ['Operations Manager', 1], ['Customer Support', 1], ['Admin Assistant', 1]]
};
export const EOR_COUNTRIES = ['Estonia', 'Latvia', 'Lithuania', 'Finland', 'Poland', 'Germany', 'Portugal', 'Spain', 'Netherlands', 'Ireland', 'United Kingdom', 'Ukraine', 'Georgia', 'Other'];
const BST = { draft: ['Draft', ''], review: ['In review', 'info'], matching: ['Matching', 'wait'], shortlist: ['Shortlist ready', 'ok'], hired: ['Hired', 'ok'], closed: ['Closed', ''] };

export function Briefs() {
  const { data, go, tab, setTab } = useApp();
  const k = tab || 'all';
  const tabs = [['all', 'All'], ['draft', 'Drafts'], ['matching', 'Matching'], ['shortlist', 'Shortlist ready'], ['hired', 'Hired'], ['closed', 'Closed']];
  const inTab = (b, x) => x === 'all' || b.status === x || (x === 'matching' && b.status === 'review');
  const list = data.briefs.filter(b => inTab(b, k));
  const TL = TYPEL();
  return (<>
    <Head title={t('Briefs')} sub={t('Everything you have asked for, with its status. Proposals and invitations live inside each brief.')} right={<button className="btn g" onClick={() => go('newbrief')}><Ic n="plus" s={15} w={2.2} />{t('Start a brief')}</button>} />
    <div className="banner" style={{ marginBottom: 16 }}><Ic n="clock" s={18} /><span>{t('A person reads every brief and sends')} <b>{t('up to 3 checked matches within 48 hours')}</b>.</span></div>
    <div className="tabsx">{tabs.map(([x, l]) => <button key={x} className={k === x ? 'on' : ''} onClick={() => setTab(x)}>{t(l)}<span className="c">{data.briefs.filter(b => inTab(b, x)).length}</span></button>)}</div>
    {list.length ? <div className="list">{list.map(b => (
      <button key={b.id} className="li" onClick={() => go(b.status === 'draft' ? 'newbrief' : 'brief', b.id)}>
        <span className="avatar alt sm"><Ic n={typeIc(b.type)} s={15} /></span>
        <span className="grow"><div className="t">{b.title}</div><div className="s">{TL[b.type]} · {t(b.area)} · {tr(b.budget)}{b.sent ? ' · ' + t('sent {when}', { when: tr(b.sent) }) : ''}</div></span>
        <span className="r">{['review', 'matching'].includes(b.status) && b.promised && <span className="clock hide-m"><Ic n="clock" s={14} />{t('by {when}', { when: tr(b.promised.split(',')[0]) })}</span>}<span className={'pill ' + BST[b.status][1]}>{t(BST[b.status][0])}</span></span>
      </button>))}</div>
      : <Empty icon="brief" title={t('Nothing here yet')} text={t('Describe what you need in one line. We turn it into a brief and find checked people.')}><button className="btn g" onClick={() => go('newbrief')}>{t('Start a brief')}</button></Empty>}
  </>);
}

export function Brief({ id }) {
  const { data, go, act, setModal } = useApp();
  const b = data.briefs.find(x => x.id === id);
  if (!b) return <Empty icon="brief" title={t('Brief not found')} text={t('It may have been deleted.')}><button className="btn g" onClick={() => go('briefs')}>{t('All briefs')}</button></Empty>;
  const TL = TYPEL();
  const steps = ['Sent', 'Read by a person', 'Matching', 'Shortlist ready', 'Hired'];
  const at = { review: 1, matching: 2, shortlist: 3, hired: 4 }[b.status] ?? 0;
  const sup = data.threads.find(th => th.kind === 'support' && th.mode === 'hire');
  let body = null;
  if (b.status === 'review' || b.status === 'matching') body = (<>
    <div className="card"><div className="row" style={{ gap: 14, alignItems: 'flex-start' }}><Avatar name={b.matcher.name} /><div className="grow">
      <h3>{b.status === 'review' ? t('{name} is reading your brief', { name: tr(b.matcher.name) }) : t('{name} is matching checked specialists', { name: tr(b.matcher.name) })}</h3><p className="muted small">{tr(b.matcher.role)}</p>
      <p style={{ marginTop: 10 }}>{t('Your shortlist of up to 3 checked people arrives by')} <b>{tr(b.promised)}</b>. {t("We'll notify you by e-mail and here.")}</p>
      <div className="row wrapf" style={{ marginTop: 14 }}>{sup && <button className="btn ghost sm" onClick={() => go('messages', sup.id)}><Ic n="msg" s={15} />{t('Message the matching team')}</button>}<button className="btn ghost sm" onClick={() => { if (confirm(t('Close this brief? We stop matching for it.'))) act('brief_close', { id: b.id }); }}>{t('Close brief')}</button></div>
    </div></div></div>
    <div className="card"><h3>{t('While you wait')}</h3><ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.8 }}><li>{t('Send files or links that help (current site, brand guide) in Messages')}</li><li>{t('Tell us who decides and who signs (acting as {org})', { org: b.signedAs })}</li><li>{t('Want to see people now?')} <button className="btn link small" onClick={() => go('find')}>{t('Browse checked specialists')}</button></li></ul></div>
  </>);
  else if (b.status === 'shortlist' || b.status === 'hired') body = (<>
    {b.status === 'hired' && b.dealId && <div className="banner"><Ic n="check" s={18} /><span>{t('You started a deal from this brief.')} <button className="btn link small" onClick={() => go('deal', b.dealId)}>{t('Open the deal')}</button></span></div>}
    <div className="row between wrapf"><h2>{t('Your shortlist')}</h2><span className="muted small">{b.ready ? t('Ready {when}', { when: tr(b.ready) }) : ''} · {t('by {name}', { name: tr(b.matcher.name) })}</span></div>
    <div className="compare">{b.shortlist.map((k, i) => { const p = person(data, k); return (
      <div key={k} className={'cand ' + (i === 0 ? 'top' : '')}>{i === 0 && <span className="best">{t('OUR PICK')}</span>}
        <div className="row"><Avatar name={p.name} src={p.avatar} alt={!!i} /><div className="grow"><h3 style={{ fontSize: 15 }}>{p.name}</h3><div className="muted small">{p.role}</div></div></div>
        <Seal lv={p.lv} />{p.checkedBy && <div className="muted tiny">{t('Checked by {name} · {when}', { name: p.checkedBy, when: tr(p.checkedOn) })}</div>}
        <div className="kv"><span>{t('Rate')}</span><span>{rateOf(p)}</span><span>{t('Availability')}</span><span>{tr(p.avail)}</span><span>{t('Deals done')}</span><span>{p.deals}{p.rating ? ' · ★ ' + p.rating : ''}</span><span>{t('Based in')}</span><span>{p.city || 'EU'}</span></div>
        {b.why[k] && <div className="why"><b>{t('Why matched:')}</b> {b.why[k]}</div>}
        <div className="row wrapf" style={{ marginTop: 'auto' }}>{b.status === 'shortlist' && <button className="btn g sm grow" onClick={() => setModal({ k: 'startdeal', b: b.id, p: k })}>{t('Start deal')}</button>}<button className="btn ghost sm" onClick={() => setModal({ k: 'call', p: k })}><Ic n="cal" s={14} />{t('Call')}</button><button className="btn ghost sm" onClick={() => go('pp', k)}>{t('Profile')}</button></div>
      </div>); })}</div>
    {b.status === 'shortlist' && <div className="card pad-s row between wrapf"><span className="small">{t('Not quite right? Tell us what to change; a new shortlist arrives within 24 h.')}</span><button className="btn ghost sm" onClick={() => setModal({ k: 'text', title: t('Ask for different people'), label: t('What should change?'), ph: t('e.g. more senior, Estonian-speaking, lower rate'), btn: t('Send'), type: 'brief_different', payload: { id: b.id } })}>{t('Ask for different people')}</button></div>}
    <div className="tabsx" style={{ marginTop: 8 }}><button className="on">{t('Proposals received')} <span className="c">{b.proposals.length}</span></button></div>
    {b.proposals.length ? <div className="list">{b.proposals.map(o => <div key={o.id} className="li"><Avatar name={o.name} size="sm" alt /><span className="grow"><div className="t">{o.name}</div><div className="s">{o.rate}{o.start ? ' · ' + t('can start {when}', { when: tr(o.start) }) : ''} · “{o.note}”</div></span><span className="r">{b.status === 'shortlist' && <button className="btn g sm" onClick={() => setModal({ k: 'startdeal', b: b.id, p: o.spec })}>{t('Start deal')}</button>}<button className="btn ghost sm" onClick={() => go('pp', o.spec)}>{t('Profile')}</button></span></div>)}</div>
      : <div className="empty small" style={{ padding: 20 }}>{t('No other proposals. Only people we invite can send one.')}</div>}
  </>);
  else if (b.status === 'closed') body = <div className="banner"><Ic n="check" s={18} /><span>{t('This brief is closed.')}</span></div>;
  const o = b.options || {};
  return (<>
    <Head title={b.title} sub={`${TL[b.type]} · ${t(b.area)} · ${tr(b.budget)} · ${t('start: {when}', { when: tr(b.start) })}`} right={<span className={'pill ' + BST[b.status][1]}>{t(BST[b.status][0])}</span>} crumb={<Crumb to="briefs" label={t('Briefs')} here={b.title} />} />
    <div className="stack">
      <div className="card"><div className="track">{steps.map((s, i) => <div key={s} className={'tp ' + (i < at || (b.status === 'hired' && i === 4) ? 'done' : i === at ? 'cur' : '')}>{t(s)}</div>)}</div></div>
      {body}
      <div className="card"><h3>{t('The brief')}</h3><p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{b.desc || '—'}</p>{b.people && <p className="small muted" style={{ marginTop: 8 }}>{t('People')}: {b.people}</p>}
        {b.type === 'eor' && <div className="kv" style={{ marginTop: 10, maxWidth: 420 }}><span>{t('Country of employment')}</span><span>{t(o.country || '—')}</span><span>{t('Gross salary')}</span><span>{tr(o.salary || '—')}</span><span>{t('Contract')}</span><span>{t(o.contract || '—')}</span></div>}
        <div className="row wrapf small muted" style={{ marginTop: 10 }}><span>{t('Visible to')}: {tr(o.visibility) || t('checked specialists we invite')}</span>·<span>{t('Signed as {org}', { org: b.signedAs })}</span>{o.nda && <>·<span>{t('NDA required')}</span></>}</div></div>
    </div>
  </>);
}

/* ================= New brief wizard ================= */
const freshWiz = type => ({ id: null, step: 0, type: type || null, line: '', ai: false, title: '', desc: '', area: 'Development', profs: ['Backend Developer'], roles: {}, budget: null, start: 'Within 2 weeks', pq: '',
  opt: { countries: 'Anywhere in the EU', visibility: 'Checked specialists + AfterWorc shortlist (recommended)', deadline: '', nda: false, country: 'Estonia', salary: '', contract: 'Full-time, permanent' } });
function wizPeople(w) { return w.type === 'team' || w.type === 'dept' ? (w.roles[w.area] || []).filter(r => r[1] > 0).map(r => r[1] + '× ' + r[0]).join(', ') : w.profs.join(', '); }
function draftText(w) {
  const TL = { task: 'Task', person: 'Specialist', team: 'Ready team', dept: 'Department', eor: 'Employee abroad' };
  const what = w.line || `${TL[w.type] || 'Work'} in ${w.area}`;
  const who = wizPeople(w) || w.area;
  const how = w.type === 'eor' ? `employed through AfterWorc as employer of record in ${w.opt.country}: contract, payroll, taxes and benefits handled` : w.type === 'dept' || w.type === 'team' ? 'one team lead, weekly report, one monthly invoice' : w.type === 'person' ? 'joins our team, weekly report, hourly' : 'fixed price per milestone';
  return { title: what.charAt(0).toUpperCase() + what.slice(1), desc: `Goal: ${what}.\nWho we need: ${who}.\nDeliverables: agreed milestones with a working result at each step, documentation and a handover.\nHow we work: ${how}.\nNice to have: experience with SaaS, payments (EMI/PSP) and EU data rules.` };
}

export function NewBrief({ draftId }) {
  const { data, go, act, busy, wizSeed, setMenu, toast } = useApp();
  const [w, setW] = useState(() => freshWiz(wizSeed && Date.now() - wizSeed.n < 5000 ? wizSeed.type : null));
  const upd = patch => setW(x => ({ ...x, ...patch }));
  const updOpt = patch => setW(x => ({ ...x, opt: { ...x.opt, ...patch } }));
  useEffect(() => {
    const b = draftId && data.briefs.find(x => x.id === draftId && x.status === 'draft');
    if (b && w.id !== draftId) setW({ ...freshWiz(), id: draftId, type: b.type, line: b.title, title: b.title, desc: b.desc, ai: !!b.desc, area: b.area, budget: b.budget || null, start: b.start || 'Within 2 weeks', opt: { ...freshWiz().opt, ...(b.options || {}) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);
  useEffect(() => { if (wizSeed && !draftId && Date.now() - wizSeed.n < 5000) setW(freshWiz(wizSeed.type)); }, [wizSeed, draftId]);
  const TL = TYPEL();
  const payload = () => ({ id: w.id, btype: w.type, line: w.line, title: w.title || w.line, desc: w.desc || w.line, area: w.area, people: wizPeople(w), budget: w.budget || 'Help me scope', start: w.start, options: w.opt });
  const steps = [t('What you need'), w.type === 'eor' ? t('Role & country') : t('Who'), w.type === 'eor' ? t('Salary & start') : t('Budget & timing'), t('Review & send')];
  let body = null;
  if (w.step === 0) body = (<>
    <h2>{t('What do you need done?')}</h2><p className="muted" style={{ margin: '4px 0 16px' }}>{t('Pick one. You can change it later.')}</p>
    <div className="opts">{START_OPTS().map(o => <button key={o[0]} className={'opt ' + (w.type === o[0] ? 'on' : '')} onClick={() => upd({ type: o[0] })} aria-pressed={w.type === o[0]}><span className="ic"><Ic n={o[1]} s={17} /></span><b>{o[2]}</b><span>{o[3]}</span></button>)}</div>
    {w.type === 'eor' && <div className="banner" style={{ marginTop: 14 }}><Ic n="globe" s={18} /><span>{t('Employer of Record: we become the legal employer in their country, run payroll, taxes and benefits, and pay them on time. You direct the work.')}</span></div>}
    <label className="field" style={{ marginTop: 18 }}><span>{t('Describe it in one line')}</span><input className="inp" id="w-line" maxLength={200} value={w.line} onChange={e => upd({ line: e.target.value })} placeholder={t('e.g. We need a payments operations team for our EMI')} /></label>
    <button className="btn ghost sm" onClick={() => { const x = draftText({ ...w, type: w.type || 'team' }); upd({ type: w.type || 'team', title: x.title, desc: x.desc, ai: true }); }}><Ic n="spark" s={15} />{w.ai ? t('Rewrite the draft') : t('Write the brief for me')}</button>
    {w.ai && <div className="card" style={{ marginTop: 14, background: 'var(--sunk)' }}><div className="row between"><h3>{t('Draft brief')}</h3><span className="pill info">{t('Drafted · a person reviews it')}</span></div>
      <label className="field" style={{ marginTop: 10 }}><span>{t('Title')}</span><input className="inp" id="w-title" maxLength={200} value={w.title} onChange={e => upd({ title: e.target.value })} /></label>
      <label className="field"><span>{t('What needs to be done')}</span><textarea className="inp" id="w-desc" rows={6} maxLength={6000} value={w.desc} onChange={e => upd({ desc: e.target.value })} /></label></div>}
  </>);
  if (w.step === 1) {
    const area = w.area;
    if (w.type === 'team' || w.type === 'dept') {
      const roles = w.roles[area] || (DEPTS[area] || DEPTS.Development).map(r => [...r]);
      const setRole = (i, d) => { const next = roles.map(r => [...r]); next[i][1] = Math.max(0, Math.min(9, next[i][1] + d)); upd({ roles: { ...w.roles, [area]: next } }); };
      body = (<>
        <h2>{w.type === 'dept' ? t('Which department?') : t('Which team?')}</h2><p className="muted" style={{ margin: '4px 0 16px' }}>{t('We suggest a standard line-up. Adjust the roles and headcount.')}</p>
        <div className="chips" style={{ marginBottom: 16 }}>{Object.keys(DEPTS).map(a => <button key={a} className={'chip ' + (a === area ? 'on' : '')} onClick={() => upd({ area: a })}>{t(a)}</button>)}</div>
        <div className="card">{roles.map((r, i) => <div key={r[0]} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 0 }}><span>{t(r[0])}{i === 0 && <> <span className="pill ok">{t('leads the team')}</span></>}</span><span className="row"><button className="btn ghost sm" onClick={() => setRole(i, -1)} aria-label={t('Fewer')}>−</button><b style={{ width: 18, textAlign: 'center' }}>{r[1]}</b><button className="btn ghost sm" onClick={() => setRole(i, 1)} aria-label={t('More')}>+</button></span></div>)}
          <div className="row between small" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}><span className="muted">{t('One team lead · one agreement · one invoice')}</span><b>{t('{n} people', { n: roles.reduce((a, r) => a + r[1], 0) })}</b></div></div>
      </>);
      if (!w.roles[area]) setTimeout(() => upd({ roles: { ...w.roles, [area]: roles } }), 0);
    } else {
      const q = (w.pq || '').toLowerCase();
      const pool = q ? Object.values(PROFS).flat().filter(p => p.toLowerCase().includes(q) || t(p).toLowerCase().includes(q)) : (PROFS[area] || []);
      const max = w.type === 'eor' ? 1 : 3;
      const toggle = p => { const l = [...w.profs]; const i = l.indexOf(p); if (i > -1) l.splice(i, 1); else if (l.length < max) l.push(p); else if (max === 1) l.splice(0, 1, p); else { toast(t('Up to 3 professions'), true); return; } upd({ profs: l }); };
      body = (<>
        <h2>{w.type === 'eor' ? t('Who are you hiring?') : t('Which area?')}</h2><p className="muted" style={{ margin: '4px 0 16px' }}>{w.type === 'eor' ? t('Pick the role, then the country where they live and will be employed.') : t('Pick an area, then up to 3 professions.')}</p>
        <div className="chips" style={{ marginBottom: 16 }}>{AREAS.map(a => <button key={a} className={'chip ' + (a === area ? 'on' : '')} onClick={() => upd({ area: a, profs: [], pq: '' })}>{t(a)}</button>)}</div>
        <label className="field"><span>{w.type === 'eor' ? t('Role') : t('Professions (up to 3)')}</span><input className="inp" id="w-pq" value={w.pq} onChange={e => upd({ pq: e.target.value })} placeholder={t('Search: React, AML, SEO…')} /></label>
        <div className="chips">{pool.length ? pool.map(p => <button key={p} className={'chip ' + (w.profs.includes(p) ? 'on' : '')} aria-pressed={w.profs.includes(p)} onClick={() => toggle(p)}>{t(p)}</button>) : <span className="muted small">{t('No match. Describe it in the brief instead.')}</span>}</div>
        <p className="muted tiny" style={{ marginTop: 8 }}>{t('{n}/{max} selected', { n: w.profs.length, max })}{w.profs.length ? ': ' + w.profs.map(x => t(x)).join(', ') : ''}</p>
        {w.type === 'eor' && <div className="grid g2" style={{ marginTop: 14 }}>
          <label className="field"><span>{t('Country of employment')}</span><select className="inp" value={w.opt.country} onChange={e => updOpt({ country: e.target.value })}>{EOR_COUNTRIES.map(c => <option key={c} value={c}>{t(c)}</option>)}</select></label>
          <label className="field"><span>{t('Contract')}</span><select className="inp" value={w.opt.contract} onChange={e => updOpt({ contract: e.target.value })}>{['Full-time, permanent', 'Full-time, fixed term', 'Part-time'].map(c => <option key={c} value={c}>{t(c)}</option>)}</select></label>
        </div>}
      </>);
    }
  }
  if (w.step === 2) {
    const opts = w.type === 'task' ? ['Under €1k', '€1–5k', '€5–15k', '€15k+'] : w.type === 'person' ? ['€30–45 / h', '€45–60 / h', '€60–80 / h', '€80+ / h'] : w.type === 'eor' ? ['€2–3.5k / mo gross', '€3.5–5k / mo gross', '€5–7k / mo gross', '€7k+ / mo gross'] : ['€5–10k / mo', '€10–20k / mo', '€20–40k / mo', '€40k+ / mo'];
    const o = w.opt;
    body = (<>
      <h2>{w.type === 'eor' ? t('Salary & start') : t('Budget & timing')}</h2>
      <p className="muted" style={{ margin: '4px 0 16px' }}>{w.type === 'task' ? t('Fixed price, paid per milestone.') : w.type === 'person' ? t('Hourly, billed weekly with a report.') : w.type === 'eor' ? t('Monthly: gross salary plus employer costs and the AfterWorc EOR fee, on one invoice.') : t('Monthly, one invoice, weekly report from the team lead.')}</p>
      <label className="field"><span>{w.type === 'eor' ? t('Gross salary') : t('Budget')}</span></label>
      <div className="opts">{[...opts, 'Not sure: help me scope'].map(x => <button key={x} className={'opt ' + (w.budget === x ? 'on' : '')} aria-pressed={w.budget === x} onClick={() => { upd({ budget: x }); if (w.type === 'eor') updOpt({ salary: x }); }} style={{ padding: 12 }}><b style={{ margin: 0, fontSize: 14 }}>{tr(x)}</b></button>)}</div>
      <label className="field" style={{ marginTop: 16 }}><span>{t('When should it start?')}</span></label>
      <div className="chips">{['As soon as possible', 'Within 2 weeks', 'Within a month', 'Just exploring'].map(s => <button key={s} className={'chip ' + (w.start === s ? 'on' : '')} onClick={() => upd({ start: s })}>{t(s)}</button>)}</div>
      <details style={{ marginTop: 18 }} className="card pad-s"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('More options')}</summary><div style={{ marginTop: 12 }}>
        {w.type !== 'eor' && <label className="field"><span>{t('Preferred countries')}</span><select className="inp" value={o.countries} onChange={e => updOpt({ countries: e.target.value })}>{['Anywhere in the EU', 'Estonia', 'Baltics', 'Nordics + Baltics'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>}
        <label className="field"><span>{t('Who can see it')}</span><select className="inp" value={o.visibility} onChange={e => updOpt({ visibility: e.target.value })}>{['Checked specialists + AfterWorc shortlist (recommended)', 'Only people I invite'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>
        <label className="field"><span>{t('Deadline')}</span><input className="inp" type="date" value={o.deadline} onChange={e => updOpt({ deadline: e.target.value })} /></label>
        <label className="row small"><input type="checkbox" checked={!!o.nda} onChange={e => updOpt({ nda: e.target.checked })} /> {t('Specialists must sign our NDA before seeing files')}</label>
      </div></details>
    </>);
  }
  if (w.step === 3) {
    const who = wizPeople(w);
    const promised = fmtSlot(new Date(Date.now() + 48 * 3600e3));
    body = (<>
      <h2>{t('Review & send')}</h2><p className="muted" style={{ margin: '4px 0 16px' }}>{t('A person on our matching team reads it first and may ask one or two questions.')}</p>
      <div className="card"><div className="kv" style={{ fontSize: 13.5, gridTemplateColumns: '140px 1fr' }}>
        <span>{t('Title')}</span><span style={{ textAlign: 'left' }}>{w.title || w.line || '—'}</span>
        <span>{t('Type')}</span><span style={{ textAlign: 'left' }}>{TL[w.type] || '-'}</span>
        <span>{t('Area')}</span><span style={{ textAlign: 'left' }}>{t(w.area)}</span>
        <span>{t('People')}</span><span style={{ textAlign: 'left' }}>{who ? who.split(', ').map(x => x.replace(/^(\d+× )?(.*)$/, (m, n, r) => (n || '') + t(r))).join(', ') : '-'}</span>
        {w.type === 'eor' && <><span>{t('Country of employment')}</span><span style={{ textAlign: 'left' }}>{t(w.opt.country)} · {t(w.opt.contract)}</span></>}
        <span>{w.type === 'eor' ? t('Gross salary') : t('Budget')}</span><span style={{ textAlign: 'left' }}>{tr(w.budget || 'Help me scope')}</span>
        <span>{t('Start')}</span><span style={{ textAlign: 'left' }}>{t(w.start)}</span>
        <span>{t('Visible to')}</span><span style={{ textAlign: 'left' }}>{t(w.opt.visibility)}</span>
        <span>{t('Signed as')}</span><span style={{ textAlign: 'left' }}>{data.acting} <button className="btn link small" onClick={() => setMenu('avatar')}>{t('change')}</button></span>
      </div></div>
      {!w.title && !w.desc && <label className="field" style={{ marginTop: 14 }}><span>{t('Anything else we should know? (optional)')}</span><textarea className="inp" id="w-desc2" maxLength={6000} value={w.desc} onChange={e => upd({ desc: e.target.value })} /></label>}
      <div className="banner" style={{ marginTop: 14 }}><Ic n="clock" s={18} /><span>{t('Your shortlist of up to 3 checked people:')} <b>{t('by {when}', { when: promised })}</b> (48 h).</span></div>
      <div className="feeline" style={{ marginTop: 14 }}><span>{t('Posting a brief')}</span><span>{t('Free')}</span><span>{w.type === 'eor' ? t('EOR fee') : t('AfterWorc fee when you hire')}</span><span>{w.type === 'eor' ? t('Fixed monthly, quoted up front') : t('Included in quotes')}</span><span>{t('Contract fee')}</span><span>€0</span></div>
    </>);
  }
  const canNext = w.step === 0 ? !!w.type : w.step === 1 ? (w.type === 'team' || w.type === 'dept' ? true : w.profs.length > 0) : true;
  const next = () => { if (!canNext) return; const patch = { step: w.step + 1 }; if (w.step === 0 && !DEPTS[w.area] && ['team', 'dept'].includes(w.type)) patch.area = 'Development'; upd(patch); window.scrollTo({ top: 0 }); };
  return (<>
    <Head title={w.id ? t('Edit draft brief') : t('Start a brief')} sub={t('3 short steps · about 2 minutes')} crumb={<Crumb to="briefs" label={t('Briefs')} here={w.id ? t('Draft') : t('New brief')} />} />
    <div className="split"><div className="card" style={{ padding: 24 }}>
      <div className="wizbar">{steps.map((s, i) => <div key={i} className={i === w.step ? 'cur' : ''}><i className={i <= w.step ? 'on' : ''} /><span>{i + 1}. {s}</span></div>)}</div>
      {body}
      <div className="row between" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        {w.step ? <button className="btn ghost" onClick={() => upd({ step: w.step - 1 })}>{t('Back')}</button>
          : <span className="row">{w.type && <button className="btn ghost" onClick={async () => { const r = await act('brief_save', payload()); if (r && r.id) upd({ id: r.id }); }}>{t('Save draft')}</button>}{w.id && <button className="btn link small" onClick={() => { const id = w.id; setW(freshWiz()); act('brief_delete', { id }); }}>{t('Delete draft')}</button>}</span>}
        {w.step < 3 ? <button className="btn g" onClick={next} disabled={!canNext}>{t('Continue')} <Ic n="arrow" s={15} w={2.2} /></button>
          : <button className="btn g" disabled={busy} onClick={async () => { const r = await act('brief_send', payload()); if (r) setW(freshWiz()); }}><Ic n="send" s={15} />{t('Send brief')}</button>}
      </div>
    </div>
    <div className="stack sticky"><div className="card" style={{ background: 'var(--dark)', color: 'var(--darkink)', border: 0 }}><span className="mono" style={{ color: '#85d6ae' }}>{t('What happens next')}</span>
      <ol style={{ margin: '12px 0 0', paddingLeft: 18, lineHeight: 1.9, fontSize: 13.5 }}><li>{t('A person reads your brief (usually within 4 h)')}</li><li>{t('We match only checked specialists')}</li><li>{t('You get up to 3, side by side, in 48 h')}</li><li>{w.type === 'eor' ? t('We employ them in their country and pay them on time, every month.') : t('Talk, then start a deal. Money is held until you release it.')}</li></ol></div></div>
    </div>
  </>);
}
