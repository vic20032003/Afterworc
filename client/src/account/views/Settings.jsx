import { useState } from 'react';
import { useApp } from '../store.jsx';
import { Ic } from '../../shared/icons.jsx';
import { t, tr } from '../../shared/i18n.js';
import { Head, Avatar, Toggle } from '../ui.jsx';
import { AvatarEditor } from './Profile.jsx';

function Security() {
  const { data, go, act, setModal } = useApp();
  return (<>
    <div className="card"><AvatarEditor />
      <h3>{t('Sign-in')}</h3>
      <div className="kv" style={{ marginTop: 10 }}><span>{t('Name')}</span><span>{data.me.name}</span><span>{t('E-mail')}</span><span>{data.me.email}</span><span>{t('Password')}</span><span>{data.me.passwordChanged ? t('Changed {when}', { when: tr(data.me.passwordChanged) }) : t('Set at sign-up')}</span><span>{t('Member since')}</span><span>{tr(data.me.created)}</span>
        <span>{t('Verification')}</span><span>{{ checked: t('Checked in person'), verified: t('Verified'), registered: t('Registered') }[data.me.level] || t('Registered')}{data.me.verifiedAt ? ' · ' + tr(data.me.verifiedAt) : ''}</span></div>
      {data.me.pendingEmail && <div className="banner am small" style={{ marginTop: 12 }}><Ic n="clock" s={16} /><span>{t('Waiting for confirmation of {email}. Open the link we sent to that address. Until then you sign in with {old}.', { email: data.me.pendingEmail, old: data.me.email })} <button className="btn link small" onClick={() => act('email_cancel')}>{t('Cancel the change')}</button></span></div>}
      <div className="row wrapf" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={() => setModal({ k: 'name' })}>{t('Change name')}</button>
        <button className="btn ghost sm" onClick={() => setModal({ k: 'email' })}>{t('Change e-mail')}</button>
        <button className="btn ghost sm" onClick={() => setModal({ k: 'pw' })}>{t('Change password')}</button>
      </div></div>
    <div className="card"><div className="row between wrapf"><div><h3>{t('Two-factor authentication')}</h3><p className="muted small">{t('Needed before money can leave your balance, to see card details, and to change your password or e-mail.')}</p></div>
      <button className={'btn sm ' + (data.twofa ? 'ghost' : 'g')} onClick={async () => { if (data.twofa) return setModal({ k: 'twofaoff' }); const r = await act('twofa_begin', {}, { quiet: true, keepModal: true }); if (r && r.twofa) setModal({ k: 'twofa', qr: r.twofa.qr, secret: r.twofa.secret }); }}>{data.twofa ? t('Turn off') : t('Turn on')}</button></div>
      {data.twofa && <p className="pill ok" style={{ marginTop: 10 }}>{t('On · authenticator app')}</p>}</div>
    <div className="card"><div className="row between wrapf"><div><h3>{t('AfterWorc card')}</h3><p className="muted small">{t('Freeze, limits, PIN and card details live in Money › Card. Showing details or PIN needs two-factor.')}</p></div><button className="btn ghost sm" onClick={() => go('card')}>{t('Open card')}</button></div></div>
    <div className="card" style={{ padding: 0 }}><div className="row between" style={{ padding: '16px 18px' }}><h3>{t("Where you're signed in")}</h3>{data.sessions.length > 1 && <button className="btn link small" onClick={() => act('sessions_revoke', { id: 'others' })}>{t('Sign out everywhere else')}</button>}</div>
      <div style={{ overflowX: 'auto' }}><table className="tbl"><tbody>{data.sessions.map(s => <tr key={s.id}><td>{s.ua}</td><td className="muted">{s.current ? t('This device') : s.ip || ''}</td><td className="r muted">{s.current ? t('now') : tr(s.seen)}</td><td className="r">{!s.current && <button className="btn link small" onClick={() => act('sessions_revoke', { id: s.id })}>{t('Sign out')}</button>}</td></tr>)}</tbody></table></div></div>
  </>);
}

function Notif() {
  const { data, act } = useApp();
  const [pr, setPr] = useState(() => JSON.parse(JSON.stringify(data.prefs)));
  const rows = [['shortlist', 'Shortlist ready / new invitation', true], ['delivery', 'Work delivered or report to approve', true], ['payment', 'Payment released or received', true], ['card', 'Card payments and declines'], ['message', 'New message'], ['news', 'Product news from AfterWorc']];
  const flip = (g, k) => setPr(x => ({ ...x, [g]: { ...x[g], [k]: !x[g][k] } }));
  return (<>
    <div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>{t('When')}</th><th className="r">{t('E-mail')}</th><th className="r">{t('In app')}</th></tr></thead><tbody>
      {rows.map(([k, l, lock]) => <tr key={k}><td>{t(l)}</td><td className="r"><input type="checkbox" checked={!!pr.email[k]} onChange={() => flip('email', k)} aria-label={t('E-mail') + ': ' + t(l)} /></td><td className="r"><input type="checkbox" checked={!!pr.app[k]} disabled={!!lock} onChange={() => flip('app', k)} aria-label={t('In app') + ': ' + t(l)} /></td></tr>)}</tbody></table></div>
    <div className="card"><h3>{t('Cookies')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{t('We use only the cookie that keeps you signed in. Optional kinds stay off unless you allow them.')}</p>
      <label className="row small"><input type="checkbox" checked={!!pr.cookies.analytics} onChange={() => flip('cookies', 'analytics')} /> {t('Analytics')}</label>
      <label className="row small" style={{ marginTop: 6 }}><input type="checkbox" checked={!!pr.cookies.marketing} onChange={() => flip('cookies', 'marketing')} /> {t('Marketing')}</label></div>
    <div><button className="btn g" onClick={() => act('prefs_save', pr)}>{t('Save preferences')}</button></div>
  </>);
}

function Privacy() {
  const { data, setModal } = useApp();
  return (<>
    <div className="card"><h3>{t('Documents you accepted')}</h3><div className="kv" style={{ marginTop: 10 }}><span>{t('Terms and Conditions')}</span><span>{data.me.termsAt ? t('Accepted {when}', { when: tr(data.me.termsAt) }) : '—'}</span><span>{t('Privacy Policy')}</span><span>{data.me.termsAt ? t('Accepted {when}', { when: tr(data.me.termsAt) }) : '—'}</span></div>
      <p className="muted tiny" style={{ marginTop: 8 }}><a href="/#terms" target="_blank" rel="noopener">{t('Read the Terms')}</a> · <a href="/#privacy" target="_blank" rel="noopener">{t('Privacy Policy')}</a>. {t("When a document changes, you'll see a banner to accept the new version.")}</p></div>
    <div className="card"><h3>{t('Your data')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{t('Stored in the EU. Download a copy any time (JSON).')}</p><a className="btn ghost sm" href="/api/account/export" download><Ic n="dl" s={14} />{t('Download my data')}</a></div>
    <div className="card"><h3>{t('Leave AfterWorc')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}><b>{t('Close')}</b> {t('keeps records we must keep by law (invoices, deals) and ends your access.')} <b>{t('Delete')}</b> {t('also erases everything else. Open deals must be finished and balances empty first.')}</p><button className="btn danger sm" onClick={() => setModal({ k: 'leave' })}>{t('Close or delete account…')}</button></div>
  </>);
}

function Tax() {
  const { data, mode, act } = useApp();
  const [x, setX] = useState(() => ({ country: 'Estonia', taxId: '', vatStatus: 'VAT registered', invoicesTo: '', holder: '', iban: '', ...data.tax }));
  const f = (k, label, props = {}) => <label className="field"><span>{label}</span><input className="inp" value={x[k] || ''} onChange={e => setX({ ...x, [k]: e.target.value })} {...props} /></label>;
  return (<div className="card"><h3>{mode === 'hire' ? t('Invoicing for {org}', { org: data.acting }) : t('Tax details (DAC7) and payouts')}</h3><div className="grid g2" style={{ marginTop: 12 }}>
    <label className="field"><span>{t('Country of residence')}</span><select className="inp" value={x.country} onChange={e => setX({ ...x, country: e.target.value })}>{['Estonia', 'Latvia', 'Lithuania', 'Finland', 'Sweden', 'Germany', 'Other EU'].map(c => <option key={c} value={c}>{t(c)}</option>)}</select></label>
    {f('taxId', mode === 'hire' ? t('VAT number') : t('Tax ID (isikukood / TIN)'), { maxLength: 40, placeholder: mode === 'hire' ? 'EE…' : '…' })}
    <label className="field"><span>{t('VAT status')}</span><select className="inp" value={x.vatStatus} onChange={e => setX({ ...x, vatStatus: e.target.value })}>{['VAT registered', 'Not registered'].map(c => <option key={c} value={c}>{t(c)}</option>)}</select></label>
    {f('invoicesTo', t('Invoices to'), { type: 'email', maxLength: 254, placeholder: data.me.email })}
    {f('holder', t('Payout account holder'), { maxLength: 80 })}
    {f('iban', t('Payout IBAN'), { maxLength: 40, placeholder: 'EE00 0000 0000 0000 0000' })}
  </div><button className="btn g sm" onClick={() => act('tax_save', x)}>{t('Save')}</button></div>);
}

function Orgs() {
  const { data, act } = useApp();
  const [o, setO] = useState({ name: '', country: 'Estonia', vat: '' });
  const [inv, setInv] = useState({});
  return (<>
    {data.orgs.map(g => { const iv = inv[g.id] || { email: '', role: 'Can hire' }; const setIv = v => setInv({ ...inv, [g.id]: { ...iv, ...v } }); return (
      <div key={g.id} className="card"><div className="row between wrapf"><div className="row"><Avatar name={g.name} alt /><div><b>{g.name}</b><div className="muted small">{t(g.country)}{g.vat ? ' · VAT ' + g.vat : ''} · {t('you are {role}', { role: tr(g.role) })}</div></div></div>
        {data.actingOrgId === g.id ? <span className="pill ok">{t('Acting as this company')}</span> : <button className="btn ghost sm" onClick={() => act('acting', { orgId: g.id })}>{t('Act as this company')}</button>}</div>
        <div style={{ overflowX: 'auto' }}><table className="tbl" style={{ marginTop: 12 }}><thead><tr><th>{t('Member')}</th><th>{t('Role')}</th></tr></thead><tbody>{g.members.map(m => <tr key={m.email}><td>{m.name} <span className="muted small">{m.email}</span></td><td>{tr(m.role)}</td></tr>)}{g.invites.map(i => <tr key={i.email}><td>{i.email} <span className="pill wait">{t('Invited {when}', { when: tr(i.at) })}</span></td><td>{tr(i.role)}</td></tr>)}</tbody></table></div>
        {g.role === 'Owner' && <div className="row wrapf" style={{ marginTop: 12 }}><input className="inp" type="email" style={{ flex: 1, minWidth: 200 }} value={iv.email} onChange={e => setIv({ email: e.target.value })} placeholder="colleague@company.com" aria-label={t('E-mail')} />
          <select className="inp" style={{ width: 'auto' }} value={iv.role} onChange={e => setIv({ role: e.target.value })}>{['Can hire', 'View only', 'Finance'].map(r => <option key={r} value={r}>{t(r)}</option>)}</select>
          <button className="btn g sm" onClick={async () => { const r = await act('org_invite', { orgId: g.id, email: iv.email, role: iv.role }); if (r) setIv({ email: '' }); }}>{t('Invite')}</button></div>}
      </div>); })}
    <div className="card"><h3>{t('Add an organization')}</h3><p className="muted small" style={{ margin: '4px 0 12px' }}>{t('Hire and sign deals as your company. Invoices carry its name and VAT number.')}</p>
      <div className="grid g3"><label className="field"><span>{t('Company name')}</span><input className="inp" maxLength={120} value={o.name} onChange={e => setO({ ...o, name: e.target.value })} placeholder="Company OÜ" /></label><label className="field"><span>{t('Country')}</span><input className="inp" maxLength={60} value={o.country} onChange={e => setO({ ...o, country: e.target.value })} /></label><label className="field"><span>{t('VAT number')}</span><input className="inp" maxLength={30} value={o.vat} onChange={e => setO({ ...o, vat: e.target.value })} placeholder="EE…" /></label></div>
      <button className="btn g sm" onClick={async () => { const r = await act('org_create', o); if (r) setO({ name: '', country: 'Estonia', vat: '' }); }}><Ic n="plus" s={14} />{t('Add organization')}</button></div>
  </>);
}

export default function Settings() {
  const { tab, go } = useApp();
  const k = tab || 'sec';
  const tabs = [['sec', 'Security'], ['notif', 'Notifications'], ['privacy', 'Privacy & data'], ['tax', 'Tax & invoicing'], ['org', 'Organizations']];
  const body = { sec: <Security />, notif: <Notif />, privacy: <Privacy />, tax: <Tax />, org: <Orgs /> }[k] || <Security />;
  return (<>
    <Head title={t('Settings')} sub={t('Security, notifications, privacy, invoicing and organizations.')} />
    <div className="tabsx">{tabs.map(([x, l]) => <button key={x} className={k === x ? 'on' : ''} onClick={() => go('settings', x)}>{t(l)}</button>)}</div>
    <div className="stack" style={{ maxWidth: 760 }}>{body}</div>
  </>);
}
export { Toggle };
