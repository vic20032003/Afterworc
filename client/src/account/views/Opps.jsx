import { useState } from 'react';
import { useApp } from '../store.jsx';
import { Ic } from '../../shared/icons.jsx';
import { t, tr, eur } from '../../shared/i18n.js';
import { Head, Crumb, Empty, Avatar } from '../ui.jsx';

export function Opps() {
  const { data, go, tab, setTab } = useApp();
  const k = tab || 'all';
  const f = { all: o => o.status !== 'sent', inv: o => o.status === 'invited', team: o => o.kind === 'Team seat', sent: o => o.status === 'sent' };
  const list = data.opps.filter(f[k]);
  return (<>
    <Head title={t('Opportunities')} sub={t('Briefs that match your checked skills, invitations, and team seats.')} />
    <div className="banner" style={{ marginBottom: 16 }}><Ic n="spark" s={18} /><span><b>{t('No Connects. No bidding. No fee to apply.')}</b> {t('We invite you when a brief fits. Answer within 72 h to stay first in line.')}</span></div>
    <div className="tabsx">{[['all', 'For you'], ['inv', 'Invitations'], ['team', 'Team seats'], ['sent', 'Proposals sent']].map(([x, l]) => <button key={x} className={k === x ? 'on' : ''} onClick={() => setTab(x)}>{t(l)}<span className="c">{data.opps.filter(f[x]).length}</span></button>)}</div>
    {list.length ? <div className="list">{list.map(o => <button key={o.id} className="li" onClick={() => go('opp', o.id)}><span className="avatar alt sm"><Ic n={o.kind === 'Team seat' ? 'team' : 'opp'} s={15} /></span><span className="grow"><div className="t">{o.title}</div><div className="s">{o.client} · {o.budget}{o.due ? ' · ' + tr(o.due) : ''}</div></span><span className="r"><span className={'pill ' + (o.status === 'invited' ? 'wait' : o.status === 'sent' ? 'ok' : 'info')}>{o.status === 'invited' ? t('Invited') : o.status === 'sent' ? t('Sent') : tr(o.kind)}</span></span></button>)}</div>
      : <Empty icon="opp" title={t('Nothing here yet')} text={t('When a brief fits your checked skills, it shows up here.')}>{data.prof && data.prof.status !== 'published' && <button className="btn g" onClick={() => go('profile')}>{t('Finish your profile')}</button>}</Empty>}
  </>);
}

export function Opp({ id }) {
  const { data, go, act, busy } = useApp();
  const o = data.opps.find(x => x.id === id);
  const [pr, setPr] = useState(() => ({ rate: data.prof && data.prof.rate ? '€' + data.prof.rate + ' / h' : '', start: 'Now', note: '' }));
  if (!o) return <Empty icon="opp" title={t('Opportunity not found')} text={t('It may have expired or been declined.')}><button className="btn g" onClick={() => go('opps')}>{t('All opportunities')}</button></Empty>;
  const rateNum = parseFloat(String(pr.rate).replace(/[^\d.]/g, '')) || 0, hrs = data.prof ? +data.prof.hours || 30 : 30, fee = data.feePct;
  return (<>
    <Head title={o.title} sub={`${o.client} · ${o.budget}`} right={<span className={'pill ' + (o.status === 'invited' ? 'wait' : 'info')}>{tr(o.kind)}</span>} crumb={<Crumb to="opps" label={t('Opportunities')} here={o.title} />} />
    <div className="split"><div className="stack">
      {o.by && <div className="card row" style={{ gap: 12, alignItems: 'flex-start' }}><Avatar name={o.by} /><div><b>{t('{name} invited you', { name: tr(o.by) })}</b><p className="small" style={{ marginTop: 4 }}>{o.note || t('A client is looking for your stack. We put you on their shortlist.')}</p></div></div>}
      {o.why.length > 0 && <div className="card"><h3>{t('Why you')}</h3><ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.8 }}>{o.why.map((w, i) => <li key={i}>{tr(w)}</li>)}</ul></div>}
      <div className="card"><h3>{t('The brief')}</h3><p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{o.desc || t('Details are shared when you reply.')}</p></div>
      {o.status === 'sent' ? <div className="banner"><Ic n="check" s={18} /><span>{t("Proposal sent ({rate}). You'll hear back within 72 h, or it expires automatically.", { rate: o.proposal ? o.proposal.rate : '' })}</span></div> :
        <div className="card"><h3>{t('Your proposal')}</h3>
          <div className="grid g2" style={{ marginTop: 12 }}><label className="field"><span>{t('Your rate')}</span><input className="inp" maxLength={40} value={pr.rate} onChange={e => setPr({ ...pr, rate: e.target.value })} placeholder="€55 / h" /></label>
            <label className="field"><span>{t('Can start')}</span><select className="inp" value={pr.start} onChange={e => setPr({ ...pr, start: e.target.value })}>{['Now', 'In 1 week', 'In 2 weeks', 'Next month'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label></div>
          <label className="field"><span>{t('Why you, in 2–3 lines')}</span><textarea className="inp" maxLength={2000} value={pr.note} onChange={e => setPr({ ...pr, note: e.target.value })} placeholder={t("What you'd do first, and a similar thing you've shipped")} /></label>
          <div className="row wrapf"><button className="btn g" disabled={busy} onClick={() => act('opp_propose', { id: o.id, ...pr })}><Ic n="send" s={15} />{t('Send proposal')}</button><button className="btn ghost" onClick={() => { if (confirm(t("Not for you? We'll tune your matches."))) act('opp_decline', { id: o.id }); }}>{t('Not for me')}</button></div></div>}
    </div><div className="stack sticky">
      {rateNum > 0 && <div className="card"><h3>{t('If you win it')}</h3><div className="feeline" style={{ marginTop: 10 }}><span>{t('At {rate} / h × {h} h/week', { rate: eur(rateNum), h: hrs })}</span><span>{eur(rateNum * hrs)} {t('/ wk')}</span><span>{t('AfterWorc fee')}</span><span>{fee ? fee + '%' : '€0'}</span><span className="tot">{t('You receive')}</span><span className="tot">{eur(rateNum * hrs * (1 - fee / 100))} {t('/ wk')}</span></div><p className="muted tiny" style={{ marginTop: 8 }}>{t('Weekly report → client approves within 7 days → released to your balance.')}</p></div>}
      {o.due && <div className="card"><span className="clock"><Ic n="clock" s={14} />{tr(o.due)}</span><p className="muted small" style={{ marginTop: 6 }}>{t('Replying fast keeps you first in line for future invitations.')}</p></div>}
    </div></div>
  </>);
}
