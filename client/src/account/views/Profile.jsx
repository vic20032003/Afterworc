import { useEffect, useRef, useState } from 'react';
import { useApp, person } from '../store.jsx';
import { api, uploadImage } from '../../shared/api.js';
import { Ic, SealIc } from '../../shared/icons.jsx';
import { t, tr, eur } from '../../shared/i18n.js';
import { Head, Crumb, Empty, Avatar, Seal, rateOf } from '../ui.jsx';
import { AREAS, PROFS } from './Briefs.jsx';

const SUGGEST = {
  Development: ['Go', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS', 'Docker', 'Python', 'Java'],
  Payments: ['Payment operations', 'Reconciliation', 'SEPA', 'Card schemes', 'Chargebacks', 'PSD2', 'AML', 'KYC', 'Transaction monitoring', 'Safeguarding'],
  Design: ['Figma', 'Design systems', 'UX research', 'Prototyping', 'Webflow'],
  Marketing: ['SEO', 'Google Ads', 'LinkedIn Ads', 'Content', 'Analytics', 'Email marketing'],
  'Business Support': ['Jira', 'Scrum', 'Excel', 'Customer support', 'Bookkeeping', 'Payroll'],
  Content: ['Copywriting', 'Estonian', 'Russian', 'Technical writing', 'Video editing'],
  'Data & Infrastructure': ['SQL', 'dbt', 'Airflow', 'Terraform', 'GCP', 'BigQuery'],
  'Quality & Security': ['Playwright', 'Cypress', 'OWASP', 'Pen testing', 'API tests', 'PCI DSS']
};

function draftFrom(data) {
  const p = data.prof;
  const x = p ? { ...p } : { headline: '', profession: '', about: '', skills: [], rate: '', hours: 30, avail: 'Available now', portfolio: '', area: 'Development', city: '', status: 'draft' };
  return { ...x, skills: [...(x.skills || [])], name: data.me.name, skillq: '' };
}

/** Photo: upload, change or remove (JPG, PNG, WebP, GIF up to 8 MB). */
export function AvatarEditor() {
  const { data, act, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const inp = useRef(null);
  const pick = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast(t('Images can be up to 8 MB'), true);
    setBusy(true);
    try { const up = await uploadImage(f); await act('avatar_set', { fileId: up.id }); } catch (err) { toast(err.message, true); } finally { setBusy(false); }
  };
  return (
    <div className="row" style={{ gap: 16, marginBottom: 18 }}>
      <Avatar name={data.me.name} src={data.me.avatar} size="xl" />
      <div style={{ display: 'grid', gap: 6 }}>
        <b>{t('Profile photo')}</b>
        <span className="muted small">{t('A clear photo of your face builds trust. JPG, PNG or WebP, up to 8 MB.')}</span>
        <div className="row wrapf">
          <button className="btn ghost sm" disabled={busy} onClick={() => inp.current.click()}><Ic n="camera" s={14} />{busy ? t('Uploading…') : data.me.avatar ? t('Change photo') : t('Upload photo')}</button>
          {data.me.avatar && <button className="btn link small" onClick={() => act('avatar_remove')}>{t('Remove')}</button>}
          <input ref={inp} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} />
        </div>
      </div>
    </div>
  );
}

function SkillsStep({ p, set, status }) {
  const { toast } = useApp();
  const [catalog, setCatalog] = useState([]);
  useEffect(() => { api('/skills').then(setCatalog).catch(() => {}); }, []);
  const known = new Set(catalog.map(x => x.toLowerCase()));
  const q = p.skillq.trim();
  const sugg = q ? catalog.filter(x => x.toLowerCase().includes(q.toLowerCase()) && !p.skills.some(s => s.toLowerCase() === x.toLowerCase())).slice(0, 8) : [];
  const add = raw => {
    const v = String(raw).trim().replace(/\s+/g, ' ').slice(0, 40); if (!v) return;
    if (p.skills.length >= 12) return toast(t('Up to 12 skills'), true);
    const canon = catalog.find(x => x.toLowerCase() === v.toLowerCase()) || v;
    if (!p.skills.some(s => s.toLowerCase() === canon.toLowerCase())) set({ skills: [...p.skills, canon], skillq: '' }); else set({ skillq: '' });
  };
  const isPending = s => status[s] === 'pending' || (!status[s] && catalog.length > 0 && !known.has(s.toLowerCase()));
  return (<>
    <label className="field"><span>{t('Top skills (up to 12)')}</span>
      <div className="row" style={{ position: 'relative' }}>
        <input className="inp" id="skillin" maxLength={40} value={p.skillq} onChange={e => set({ skillq: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(p.skillq); } }} placeholder={t('Type a skill and press Enter')} autoComplete="off" aria-autocomplete="list" />
        <button className="btn ghost sm" onClick={() => add(p.skillq)}>{t('Add')}</button>
        {sugg.length > 0 && <div className="menu" style={{ top: 46, left: 0, right: 'auto', minWidth: 240 }}>{sugg.map(x => <button key={x} className="mi" onClick={() => add(x)}>{x}</button>)}</div>}
      </div>
    </label>
    <div className="chips" style={{ marginBottom: 10 }}>{p.skills.length ? p.skills.map((s, i) =>
      <span key={s} className={'chip on ' + (isPending(s) ? 'pend' : '')} title={isPending(s) ? t('New skill: shown publicly after a check by our team') : undefined}>
        {s}{isPending(s) && <span className="tiny">· {t('awaiting approval')}</span>}
        <button className="xx" onClick={() => set({ skills: p.skills.filter((_, k) => k !== i) })} aria-label={t('Remove {name}', { name: s })}>×</button>
      </span>) : <span className="muted small">{t('No skills yet')}</span>}</div>
    {p.skills.some(isPending) && <div className="banner am small" style={{ marginBottom: 10 }}><Ic n="clock" s={16} /><span>{t('Skills that are new to AfterWorc are checked by our team before they appear on your public profile. Usually within one business day.')}</span></div>}
    <p className="muted tiny" style={{ marginBottom: 6 }}>{t('Suggested for {area}:', { area: t(p.area) })}</p>
    <div className="chips">{(SUGGEST[p.area] || []).filter(s => !p.skills.includes(s)).map(s => <button key={s} className="chip" onClick={() => add(s)}>+ {s}</button>)}</div>
  </>);
}

function PortfolioItemForm({ item, onDone }) {
  const { act, toast } = useApp();
  const [f, setF] = useState({ title: item ? item.title : '', descr: item ? item.descr : '', url: item ? item.url : '', fileId: null, preview: item ? item.image : null, removeImage: false });
  const [up, setUp] = useState(false);
  const inp = useRef(null);
  const pick = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast(t('Images can be up to 8 MB'), true);
    setUp(true);
    try { const r = await uploadImage(file); setF(x => ({ ...x, fileId: r.id, preview: r.url + '?inline=1', removeImage: false })); } catch (err) { toast(err.message, true); } finally { setUp(false); }
  };
  const save = async () => {
    const r = await act(item ? 'portfolio_update' : 'portfolio_add', { id: item && item.id, title: f.title, descr: f.descr, url: f.url, fileId: f.fileId, removeImage: f.removeImage }, { keepModal: true });
    if (r) onDone();
  };
  return (
    <div className="card" style={{ background: 'var(--sunk)' }}>
      <div className="grid g2">
        <div>
          <div className="imgpick" role="button" tabIndex={0} onClick={() => inp.current.click()} onKeyDown={e => e.key === 'Enter' && inp.current.click()} aria-label={t('Choose an image')}>
            {f.preview ? <img src={f.preview} alt="" /> : <span><Ic n="image" s={26} /><br />{up ? t('Uploading…') : t('Add an image (JPG, PNG, WebP)')}</span>}
          </div>
          <input ref={inp} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} />
          {f.preview && <button className="btn link small" onClick={() => setF(x => ({ ...x, fileId: null, preview: null, removeImage: true }))}>{t('Remove image')}</button>}
        </div>
        <div>
          <label className="field"><span>{t('Title')}</span><input className="inp" maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder={t('e.g. Payment reconciliation dashboard')} /></label>
          <label className="field"><span>{t('What you did')}</span><textarea className="inp" maxLength={1500} value={f.descr} onChange={e => setF({ ...f, descr: e.target.value })} placeholder={t('Client, your role, the result')} /></label>
          <label className="field"><span>{t('Link (optional)')}</span><input className="inp" maxLength={300} value={f.url} onChange={e => setF({ ...f, url: e.target.value })} placeholder="https://" /></label>
        </div>
      </div>
      <div className="row wrapf" style={{ justifyContent: 'flex-end' }}><button className="btn ghost sm" onClick={onDone}>{t('Cancel')}</button><button className="btn g sm" disabled={up} onClick={save}>{item ? t('Save') : t('Add to portfolio')}</button></div>
    </div>
  );
}

export function PortfolioEditor() {
  const { data, act } = useApp();
  const [editing, setEditing] = useState(null); // 'new' | item id
  const [zoom, setZoom] = useState(null);
  const list = data.portfolio;
  return (<>
    <div className="row between wrapf" style={{ marginBottom: 12 }}><div><h2>{t('Portfolio')}</h2><p className="muted small">{t('Show real work: screenshots, dashboards, designs. Clients see it on your public profile.')}</p></div>
      {editing !== 'new' && <button className="btn g sm" onClick={() => setEditing('new')}><Ic n="plus" s={14} />{t('Add work')}</button>}</div>
    {editing === 'new' && <div style={{ marginBottom: 14 }}><PortfolioItemForm onDone={() => setEditing(null)} /></div>}
    {list.length ? <div className="pfgrid">{list.map((it, i) => editing === it.id ? <div key={it.id} style={{ gridColumn: '1/-1' }}><PortfolioItemForm item={it} onDone={() => setEditing(null)} /></div> : (
      <div key={it.id} className="pfi">
        <div className="img" onClick={() => it.image && setZoom(it.image)} style={{ cursor: it.image ? 'zoom-in' : 'default' }}>{it.image ? <img src={it.image} alt={it.title} loading="lazy" /> : <Ic n="link" s={26} />}</div>
        <div className="bd"><b>{it.title}</b>{it.descr && <span className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{it.descr}</span>}{it.url && <a className="small" href={it.url} target="_blank" rel="noopener noreferrer">{it.url.replace(/^https?:\/\//, '').slice(0, 40)}</a>}</div>
        <div className="acts">
          <button className="btn ghost sm" onClick={() => setEditing(it.id)}><Ic n="edit" s={13} />{t('Edit')}</button>
          <button className="btn ghost sm" disabled={i === 0} onClick={() => act('portfolio_move', { id: it.id, dir: 'up' }, { quiet: true })} aria-label={t('Move up')}><Ic n="up" s={13} /></button>
          <button className="btn ghost sm" disabled={i === list.length - 1} onClick={() => act('portfolio_move', { id: it.id, dir: 'down' }, { quiet: true })} aria-label={t('Move down')}><Ic n="down" s={13} /></button>
          <button className="btn ghost sm" onClick={() => { if (confirm(t('Remove this item from your portfolio?'))) act('portfolio_delete', { id: it.id }); }} aria-label={t('Delete')}><Ic n="trash" s={13} /></button>
        </div>
      </div>))}</div>
      : editing !== 'new' && <Empty icon="image" title={t('No work yet')} text={t('Add two or three pieces you are proud of. Images are enough.')} style={{ padding: 24 }} />}
    {zoom && <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label={t('Image')}><img src={zoom} alt="" /></div>}
  </>);
}

export function Profile() {
  const { data, go, act } = useApp();
  const [p, setP] = useState(() => draftFrom(data));
  const [step, setStep] = useState(0);
  const set = patch => setP(x => ({ ...x, ...patch }));
  const steps = [t('About you'), t('Skills'), t('Rate & work'), t('Portfolio')];
  const payload = () => ({ name: p.name, city: p.city, headline: p.headline, profession: p.profession, about: p.about, area: p.area, skills: p.skills, rate: String(p.rate || '').replace(/[^\d]/g, ''), hours: String(p.hours || '').replace(/[^\d]/g, ''), avail: p.avail, portfolio: p.portfolio });
  const save = async () => { const r = await act('profile_save', payload()); if (r) setP(x => ({ ...draftFrom(r.state), skillq: x.skillq })); return r; };
  const st = data.prof ? data.prof.status : 'draft';
  let body;
  if (step === 0) body = (<>
    <AvatarEditor />
    <div className="grid g2"><label className="field"><span>{t('Your name')}</span><input className="inp" id="pf-name" maxLength={80} value={p.name} onChange={e => set({ name: e.target.value })} /></label><label className="field"><span>{t('Based in')}</span><input className="inp" id="pf-city" maxLength={60} value={p.city} onChange={e => set({ city: e.target.value })} placeholder="Tallinn" /></label></div>
    <label className="field"><span>{t('Headline')}</span><input className="inp" id="pf-head" maxLength={120} value={p.headline} onChange={e => set({ headline: e.target.value })} placeholder={t('Payments operations lead, EMI & PSP')} /><small>{t('Shown on your card and in shortlists')}</small></label>
    <div className="grid g2"><label className="field"><span>{t('Area')}</span><select className="inp" value={p.area} onChange={e => set({ area: e.target.value, profession: '' })}>{AREAS.map(a => <option key={a} value={a}>{t(a)}</option>)}</select></label>
      <label className="field"><span>{t('Main profession')}</span><select className="inp" value={p.profession} onChange={e => set({ profession: e.target.value })}><option value="">{t('Choose…')}</option>{(PROFS[p.area] || []).map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label></div>
    <label className="field"><span>{t('About')}</span><textarea className="inp" id="pf-about" maxLength={2000} value={p.about} onChange={e => set({ about: e.target.value })} placeholder={t('What you do best, for whom, and for how long')} /></label>
  </>);
  if (step === 1) body = <SkillsStep p={p} set={set} status={(data.prof && data.prof.skillStatus) || {}} />;
  if (step === 2) body = (<>
    <div className="grid g2"><label className="field"><span>{t('Rate from (€ / h)')}</span><input className="inp" id="pf-rate" inputMode="numeric" maxLength={5} value={p.rate} onChange={e => set({ rate: e.target.value })} placeholder="55" /></label><label className="field"><span>{t('Hours per week')}</span><input className="inp" id="pf-hours" inputMode="numeric" maxLength={2} value={p.hours} onChange={e => set({ hours: e.target.value })} /></label></div>
    <label className="field"><span>{t('Available')}</span></label>
    <div className="chips" style={{ marginBottom: 14 }}>{['Available now', 'From next week', 'From next month', 'Not available'].map(a => <button key={a} className={'chip ' + (p.avail === a ? 'on' : '')} onClick={() => set({ avail: a })}>{t(a)}</button>)}</div>
    <label className="field"><span>{t('Link to your work (GitHub, Behance, website)')}</span><input className="inp" id="pf-port" maxLength={300} value={p.portfolio} onChange={e => set({ portfolio: e.target.value })} placeholder="https://" /><small>{t('Add images of your work in the next step.')}</small></label>
  </>);
  if (step === 3) body = <PortfolioEditor />;
  const lv = data.prof && data.prof.level === 'checked' ? 'checked' : data.prof && data.prof.level === 'verified' ? 'id' : '';
  return (<>
    <Head title={t('Your profile')} sub={t('4 short steps. Your profile goes public after your ID check and a review by our team.')} right={<button className="btn ghost" onClick={() => go('pp', 'me')}><Ic n="eye" s={15} />{t('Preview public page')}</button>} />
    <div className="split"><div className="card" style={{ padding: 24 }}>
      <div className="wizbar">{steps.map((s, i) => <div key={s} className={i === step ? 'cur' : ''}><i className={i <= step ? 'on' : ''} /><span role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => setStep(i)} onKeyDown={e => e.key === 'Enter' && setStep(i)}>{i + 1}. {s}</span></div>)}</div>
      {body}
      <div className="row between" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        {step ? <button className="btn ghost" onClick={() => setStep(step - 1)}>{t('Back')}</button> : <span />}
        <span className="row">{step < 3 && <button className="btn ghost" onClick={save}>{t('Save')}</button>}
          {step < 3 ? <button className="btn g" onClick={async () => { if (step < 3) { const r = await save(); if (r) setStep(step + 1); } }}>{t('Save and continue')} <Ic n="arrow" s={15} w={2.2} /></button>
            : st === 'draft' ? <button className="btn g" onClick={async () => { const r = await act('profile_save', payload()); if (r) await act('profile_submit'); }}>{t('Submit for review')}</button> : <button className="btn g" onClick={() => go('pp', 'me')}>{t('See my public page')}</button>}</span>
      </div>
    </div>
    <div className="stack sticky"><div className="card"><span className="mono muted">{t('How clients see you')}</span>
      <div className="row" style={{ marginTop: 12 }}><Avatar name={p.name || data.me.name} src={data.me.avatar} /><div><b>{p.name}</b><div className="muted small">{p.headline || t('Your headline')}</div></div></div>
      <div style={{ marginTop: 8 }}>{lv ? <Seal lv={lv} /> : <span className="pill">{t('Registered')}</span>}</div>
      <div className="kv" style={{ marginTop: 10 }}><span>{t('Rate')}</span><span>{p.rate ? eur(p.rate) + ' ' + t('/ h') : '—'}</span><span>{t('Available')}</span><span>{tr(p.avail)}</span><span>{t('Portfolio')}</span><span>{data.portfolio.length}</span></div>
      <div className="chips" style={{ marginTop: 10 }}>{p.skills.map(s => <span key={s} className="chip">{s}</span>)}</div></div>
      <div className="card small"><b>{t('Status')}: {{ draft: t('Draft'), submitted: t('Submitted · in review'), published: t('Public') }[st]}</b><p className="muted" style={{ marginTop: 4 }}>{st === 'published' ? t('Clients can find you in search and request proposals. Changes are live when you save.') : st === 'submitted' ? t('Our team reviews it after your ID check. You can keep editing.') : t('Only you can see it. Submit it when the steps are done.')}</p></div></div></div>
  </>);
}

export function PublicProfile({ id }) {
  const { data, go, setModal, act, mode } = useApp();
  const me = id === 'me';
  const [full, setFull] = useState(null);
  const [zoom, setZoom] = useState(null);
  useEffect(() => { setFull(null); if (!me && id) api('/specialists/' + encodeURIComponent(id)).then(setFull).catch(() => {}); }, [id, me]);
  let p;
  if (me) { const pr = data.prof || {}; p = { id: 'me', name: data.me.name, role: pr.headline || t('Your headline'), lv: pr.level === 'checked' ? 'checked' : pr.level === 'verified' ? 'id' : 'registered', rate: pr.rate, city: pr.city || '', avail: pr.avail || '', deals: 0, rating: null, skills: (pr.skills || []).filter(s => !pr.skillStatus || pr.skillStatus[s] !== 'pending'), bio: pr.about || '', avatar: data.me.avatar, portfolio: data.portfolio }; }
  else { const base = Object.hasOwn(data.people, id) ? data.people[id] : null; p = base ? { ...base, portfolio: full ? full.portfolio : [] } : null; }
  if (!p) return <Empty icon="user" title={t('Profile not found')} text={t('This profile is not public.')}><button className="btn g" onClick={() => go('find')}>{t('Browse specialists')}</button></Empty>;
  return (<>
    <Head title={me ? t('Your public page (preview)') : t('Specialist profile')} right={me && <button className="btn ghost" onClick={() => go('profile')}>{t('Edit')}</button>} crumb={<Crumb to="home" label={t('Home')} here={p.name} />} />
    <div className="split"><div className="stack">
      <div className="pphero"><span className="avatar lg" style={{ background: '#5fcf7d', color: '#06200f' }}>{p.avatar ? <img src={p.avatar} alt="" /> : p.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
        <div className="grow"><h1>{p.name}</h1><p style={{ color: '#b5c7bd', marginTop: 4 }}>{p.role}{p.city ? ' · ' + p.city : ''}</p>
          <div style={{ marginTop: 8 }}>{p.lv === 'checked' ? <span className="seal" style={{ color: '#85d6ae' }}><SealIc />{t('Checked in person')}{p.checkedBy ? ' ' + t('by {name} · {when}', { name: p.checkedBy, when: tr(p.checkedOn) }) : ''}</span> : p.lv === 'id' ? <span className="seal" style={{ color: '#8fb0f0' }}><Ic n="shield" s={14} w={2} />{t('ID verified')}</span> : <span className="seal" style={{ color: '#b5c7bd' }}>{t('Registered · checks in progress')}</span>}</div></div></div>
      <div className="card"><h3>{t('About')}</h3><p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.bio || '—'}</p><div className="chips" style={{ marginTop: 12 }}>{p.skills.map(s => <span key={s} className="chip">{s}</span>)}</div></div>
      {p.portfolio && p.portfolio.length > 0 && <div className="card"><h3>{t('Portfolio')}</h3><div className="pfgrid" style={{ marginTop: 12 }}>{p.portfolio.map(it => <div key={it.id} className="pfi"><div className="img" onClick={() => it.image && setZoom(it.image)} style={{ cursor: it.image ? 'zoom-in' : 'default' }}>{it.image ? <img src={it.image} alt={it.title} loading="lazy" /> : <Ic n="link" s={26} />}</div><div className="bd"><b>{it.title}</b>{it.descr && <span className="muted small">{it.descr}</span>}{it.url && <a className="small" href={it.url} target="_blank" rel="noopener noreferrer nofollow">{t('Open link')}</a>}</div></div>)}</div></div>}
      <div className="card"><h3>{t('What we checked')}</h3><div className="grid g4" style={{ marginTop: 10 }}>{['Identity', 'Skills test', 'References', 'Interview'].map((c, i) => { const ok = p.lv === 'checked' || (p.lv === 'id' && i === 0); return <div key={c} className="small"><span style={{ color: ok ? 'var(--brand2)' : 'var(--muted)' }}>{ok ? '✓' : '○'}</span> {t(c)}</div>; })}</div></div>
      {p.history && p.history.length > 0 && <div className="card"><h3>{t('Recent work')}</h3><div className="stack-s" style={{ marginTop: 10 }}>{p.history.slice(0, 4).map((w, i) => <div key={i} className="row between small"><span>{w.t}</span><b>{eur(w.a)}</b></div>)}</div></div>}
      <div className="card"><div className="row between"><h3>{t('Reviews')}</h3><span className="small">{p.rating ? '★ ' + p.rating + ' · ' : ''}{t('{n} deals', { n: p.deals })}</span></div><p className="muted tiny" style={{ marginTop: 8 }}>{t('Reviews are published only when both sides have reviewed.')}</p></div>
    </div><div className="stack sticky">
      <div className="card"><div className="kv" style={{ fontSize: 13.5 }}><span>{t('Rate')}</span><span>{rateOf(p)}</span><span>{t('Availability')}</span><span>{tr(p.avail) || '—'}</span><span>{t('Deals')}</span><span>{p.deals}</span></div>
        {me ? <p className="muted small" style={{ marginTop: 12 }}>{t('Businesses see a "Request a proposal" button here.')}</p> : <>
          <button className="btn g block" style={{ marginTop: 14 }} onClick={() => setModal({ k: 'request', p: p.id })}>{t('Request a proposal')}</button>
          {mode === 'hire' && <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => act('chat_start', { specialistId: p.id })}><Ic n="msg" s={15} />{t('Write a message')}</button>}
          <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setModal({ k: 'call', p: p.id })}><Ic n="cal" s={15} />{t('Book a 15-min call')}</button>
          <p className="muted tiny" style={{ marginTop: 10 }}>{t('Nothing is charged until you agree terms and fund milestone 1.')}</p></>}</div>
    </div></div>
    {zoom && <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label={t('Image')}><img src={zoom} alt="" /></div>}
  </>);
}

export function Find() {
  const { data, go, tab, setTab } = useApp();
  const area = tab || 'All';
  const areas = ['All', ...new Set(Object.values(data.people).map(p => p.area))];
  const list = Object.values(data.people).filter(p => area === 'All' || p.area === area);
  return (<>
    <Head title={t('Checked specialists')} sub={t('Every profile states what was checked, by whom and when.')} crumb={<Crumb to="home" label={t('Home')} here={t('Specialists')} />} />
    <div className="chips" style={{ marginBottom: 16 }}>{areas.map(a => <button key={a} className={'chip ' + (a === area ? 'on' : '')} onClick={() => setTab(a)}>{a === 'All' ? t('All areas') : t(a)}</button>)}</div>
    {list.length ? <div className="pgrid">{list.map(p => <button key={p.id} className="card stack-s" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => go('pp', p.id)}>
      <div className="row"><Avatar name={p.name} src={p.avatar} alt={p.lv !== 'checked'} /><div className="grow"><b>{p.name}</b><div className="muted small">{p.role}</div></div></div>
      <div className="row between wrapf"><Seal lv={p.lv} /><b className="small">{rateOf(p)}</b></div>
      <div className="chips">{p.skills.slice(0, 4).map(s => <span key={s} className="chip" style={{ padding: '3px 10px' }}>{s}</span>)}</div>
      <div className="muted tiny">{tr(p.avail)} · {p.city}</div></button>)}</div>
      : <Empty icon="search" title={t('No one here yet')} text={t('Try another area, or post a brief and we find people for you.')}><button className="btn g" onClick={() => go('newbrief')}>{t('Start a brief')}</button></Empty>}
  </>);
}
export { person };
