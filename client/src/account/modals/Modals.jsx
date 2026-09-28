/* Every dialog in the account. Each keeps its own form state; `modal` in the store says which one is open. */
import { useEffect, useState } from 'react';
import { useApp, person } from '../store.jsx';
import { uploadFiles } from '../../shared/api.js';
import { Ic } from '../../shared/icons.jsx';
import { t, tr, eur, fmtSlot, locale } from '../../shared/i18n.js';
import { Modal, Cancel, CodeField, Need2fa, Go2fa, Sandbox, CardArt, slots } from '../ui.jsx';

function useForm(init) { const [f, setF] = useState(init); return [f, patch => setF(x => ({ ...x, ...patch }))]; }

function TopUp() {
  const { data, mode, act, busy } = useApp();
  const hire = mode === 'hire';
  const [f, set] = useForm({ amt: hire ? 2000 : 100, m: 'bank' });
  const meth = [['bank', t('Estonian bank link'), t('Instant · no fee')], ['sepa', t('SEPA transfer'), t('1 business day · no fee')], ['card', t('Debit or credit card'), t('Instant')], ['wallet', 'Apple Pay / Google Pay', t('Instant')]];
  return <Modal title={hire ? t('Top up {org} balance', { org: data.acting }) : t('Top up your Working balance')} sub={hire ? t('Hiring mode') : t('Working mode')}
    footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('topup', { amount: f.amt, method: f.m })}>{f.m === 'sepa' ? t("I've sent it") : data.sandbox ? t('Add {amount}', { amount: eur(+f.amt || 0) }) : t('Pay {amount} securely', { amount: eur(+f.amt || 0) })}</button></>}>
    <Sandbox />
    <label className="field"><span>{t('Amount (€)')}</span><input className="inp" inputMode="decimal" value={f.amt} onChange={e => set({ amt: e.target.value })} autoFocus /></label>
    <div className="amts">{(hire ? [500, 2000, 5000, 10000] : [50, 100, 250, 500]).map(a => <button key={a} className={'chip ' + (+f.amt === a ? 'on' : '')} onClick={() => set({ amt: a })}>{eur(a)}</button>)}</div>
    <label className="field" style={{ marginTop: 14 }}><span>{t('Pay with')}</span></label>
    <div className="opts">{meth.map(([k, ti, x]) => <button key={k} className={'opt ' + (f.m === k ? 'on' : '')} onClick={() => set({ m: k })}><b style={{ fontSize: 14, margin: 0 }}>{ti}</b><span>{x}</span></button>)}</div>
    {f.m === 'sepa' && <div className="card pad-s" style={{ marginTop: 12 }}><div className="kv"><span>{t('Recipient')}</span><span>AfterWorc OÜ</span><span>IBAN</span><span className="mono" style={{ textTransform: 'none' }}>{t('Shown when payments go live')}</span><span>{t('Reference')}</span><span className="mono" style={{ textTransform: 'none' }}>AW-{data.me.id}-{mode.toUpperCase()}</span></div></div>}
    <p className="muted tiny" style={{ marginTop: 12 }}>{hire ? t('Top-ups fund milestones and the company card. Held deal money is separate.') : t("Handy for card spending, or to cover a refund to a client. Withdraw what you don't use any time.")}</p>
  </Modal>;
}

function GetCard() {
  const { data, mode, act, busy, toast } = useApp();
  const hire = mode === 'hire';
  const [f, set] = useForm({ step: 0, kind: 'virtual', name: String(data.cards[mode].name || data.me.name).toUpperCase().slice(0, 21), addr: '', terms: false, code: '' });
  const prev = <CardArt opts={{ variant: f.kind === 'virtual' ? 'virtual' : hire ? 'company' : 'personal', name: f.name || '', org: hire ? data.acting : '', last4: '0000' }} style={{ maxWidth: 260, margin: '0 auto 14px' }} />;
  const steps = <div className="muted tiny" style={{ textAlign: 'center', marginBottom: 10 }}>{t('Step {a} of {b}', { a: f.step + 1, b: 3 })}</div>;
  const next = () => { if (f.step === 1 && !String(f.name).trim()) return toast(t('Add the name on the card'), true); if (f.step === 1 && f.kind === 'both' && !String(f.addr).trim()) return toast(t('Add a delivery address'), true); set({ step: f.step + 1 }); };
  const back = <button className="btn ghost" onClick={() => set({ step: f.step - 1 })}>{t('Back')}</button>;
  if (f.step === 0) return <Modal title={t('Get your AfterWorc card')} sub={hire ? t('Company card on the {org} balance', { org: data.acting }) : t('Personal card on your Working balance')} footer={<><Cancel /><button className="btn g" onClick={next}>{t('Continue')}</button></>}>
    {prev}{steps}<div className="opts"><button className={'opt ' + (f.kind === 'virtual' ? 'on' : '')} onClick={() => set({ kind: 'virtual' })}><b style={{ fontSize: 14, margin: 0 }}>{t('Virtual only')}</b><span>{t('Ready in about a minute. Online and phone wallets.')}</span></button><button className={'opt ' + (f.kind === 'both' ? 'on' : '')} onClick={() => set({ kind: 'both' })}><b style={{ fontSize: 14, margin: 0 }}>{t('Virtual + physical')}</b><span>{t('Virtual now, plastic card in 5–7 business days.')}</span></button></div></Modal>;
  if (f.step === 1) return <Modal title={t('Card details')} footer={<>{back}<button className="btn g" onClick={next}>{t('Continue')}</button></>}>
    {prev}{steps}<label className="field"><span>{t('Name on card')}</span><input className="inp" maxLength={21} value={f.name} onChange={e => set({ name: e.target.value.toUpperCase() })} /><small>{t('Up to 21 characters, as on your ID.')}</small></label>
    <div className="kv" style={{ marginBottom: 12 }}>{hire && <><span>{t('Company on card')}</span><span>{data.acting}</span></>}<span>{t('Spends from')}</span><span>{hire ? t('{org} balance', { org: data.acting }) : t('Working balance')} · {eur(data.money[mode].available)}</span></div>
    {f.kind === 'both' && <label className="field"><span>{t('Deliver to')}</span><input className="inp" maxLength={200} value={f.addr} onChange={e => set({ addr: e.target.value })} placeholder={t('Street, postcode, city')} /></label>}</Modal>;
  return <Modal title={t('Confirm and issue')} footer={<>{back}{data.twofa ? <button className="btn g" disabled={!f.terms || busy} onClick={() => act('card_issue', { kind: f.kind, name: f.name, addr: f.addr, terms: f.terms, code: f.code })}>{t('Issue card')}</button> : <Go2fa />}</>}>
    {prev}{steps}<div className="feeline"><span>{t('Card')}</span><span>{t('Mastercard debit')} · {f.kind === 'both' ? t('virtual + physical') : t('virtual')}</span><span>{t('Name')}</span><span>{f.name}</span>{hire && <><span>{t('Company')}</span><span>{data.acting}</span></>}<span>{t('Currency')}</span><span>EUR</span><span className="tot">{t('Fees')}</span><span className="tot">{t('Per issuer price list')}</span></div>
    <label className="row small" style={{ marginTop: 14 }}><input type="checkbox" checked={f.terms} onChange={e => set({ terms: e.target.checked })} /> {t('I accept the cardholder terms of the issuing partner')}</label>
    <div style={{ marginTop: 12 }}>{data.twofa ? <CodeField value={f.code} onChange={code => set({ code })} /> : <Need2fa />}</div></Modal>;
}

function Reveal({ what }) {
  const { data, mode, act, busy, setModal, setReveal, toast } = useApp();
  const [code, setCode] = useState('');
  const go = async () => {
    const r = await act('card_reveal', { what, code }, { keepModal: true });
    if (!r || !r.reveal) return;
    if (what === 'pin') { setModal({ k: 'pinshow', pin: r.reveal.pin }); return; }
    setModal(null); setReveal({ mode, until: Date.now() + 30000, ...r.reveal }); toast(t('Details visible for 30 seconds'));
  };
  return <Modal title={what === 'pin' ? t('Show PIN') : t('Show card details')} footer={<><Cancel />{data.twofa ? <button className="btn g" disabled={busy || code.length !== 6} onClick={go}>{t('Show')}</button> : <Go2fa />}</>}>
    {data.twofa ? <><CodeField value={code} onChange={setCode} autoFocus /><p className="muted tiny">{what === 'pin' ? t('The PIN stays visible for 10 seconds.') : t('Number, expiry and CVV stay visible for 30 seconds, with buttons to copy them.')} {t('Nobody from AfterWorc will ever ask for them.')}</p></> : <Need2fa />}</Modal>;
}
function PinShow({ pin }) {
  const { setModal } = useApp();
  useEffect(() => { const h = setTimeout(() => setModal(null), 10000); return () => clearTimeout(h); }, [setModal]);
  return <Modal title={t('Your PIN')} footer={<button className="btn g" onClick={() => setModal(null)}>{t('Done')}</button>}><p style={{ font: "700 34px 'IBM Plex Mono',monospace", letterSpacing: '.3em', textAlign: 'center' }}>{pin}</p><p className="muted tiny" style={{ textAlign: 'center' }}>{t('Closes in 10 seconds.')}</p></Modal>;
}
function Limits() {
  const { data, mode, act, busy } = useApp();
  const c = data.cards[mode];
  const [f, set] = useForm({ day: c.lim.day, month: c.lim.month, atm: c.lim.atm, code: '' });
  return <Modal title={t('Card limits')} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('card_limits', f)}>{t('Save limits')}</button></>}>
    <div className="grid g2"><label className="field"><span>{t('Per day (€)')}</span><input className="inp" inputMode="numeric" value={f.day} onChange={e => set({ day: e.target.value })} /></label><label className="field"><span>{t('Per month (€)')}</span><input className="inp" inputMode="numeric" value={f.month} onChange={e => set({ month: e.target.value })} /></label></div>
    <label className="field"><span>{t('ATM per day (€)')}</span><input className="inp" inputMode="numeric" value={f.atm} onChange={e => set({ atm: e.target.value })} /><small>{c.tg.atm ? '' : t('ATM withdrawals are switched off in Controls.')}</small></label>
    {data.twofa && <CodeField value={f.code} onChange={code => set({ code })} label={t('2FA code (needed only to raise a limit)')} />}
    <p className="muted tiny">{t('Lower limits apply at once. Higher limits need your 2FA code.')}</p></Modal>;
}
function OrderPhys() {
  const { act, busy } = useApp(); const [addr, setAddr] = useState('');
  return <Modal title={t('Order a physical card')} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('card_order', { addr })}>{t('Order card')}</button></>}>
    <label className="field"><span>{t('Deliver to')}</span><input className="inp" maxLength={200} value={addr} onChange={e => setAddr(e.target.value)} placeholder={t('Street, postcode, city')} autoFocus /></label><p className="muted small">{t('Same number as your virtual card. Arrives in 5–7 business days. Activate it here when it arrives.')}</p></Modal>;
}
function Lost() {
  const { act, busy, setModal } = useApp(); const [o, setO] = useState('keep');
  return <Modal title={t('Report lost or stolen')} footer={<><button className="btn ghost" onClick={() => setModal(null)}>{t('Close')}</button><button className="btn g" disabled={busy} onClick={() => act('card_lost', { o })}>{o === 'replace' ? t('Block and send new card') : t('Keep frozen')}</button></>}>
    <p className="small">{t('We froze the card while you decide. Nothing can be paid with it now.')}</p>
    <div className="opts" style={{ marginTop: 12 }}><button className={'opt ' + (o === 'keep' ? 'on' : '')} onClick={() => setO('keep')}><b style={{ fontSize: 14, margin: 0 }}>{t('Keep it frozen')}</b><span>{t('I might still find it')}</span></button><button className={'opt ' + (o === 'replace' ? 'on' : '')} onClick={() => setO('replace')}><b style={{ fontSize: 14, margin: 0 }}>{t('Block and replace')}</b><span>{t('New number; subscriptions need the new one')}</span></button></div>
    <p className="muted tiny" style={{ marginTop: 10 }}>{t("See a payment you don't recognise? Tell us in Help and we open a chargeback.")}</p></Modal>;
}

function Fund({ d: dealId, i }) {
  const { data, act, busy, setModal } = useApp();
  const x = data.deals.find(y => y.id === dealId); const ms = x && x.ms.find(y => y.id === i);
  if (!ms || ms.st !== 'unfunded') return null;
  const short = data.money.hire.available < ms.amt;
  return <Modal title={t('Fund: {name}', { name: ms.n })} footer={<><Cancel />{short ? <button className="btn g" onClick={() => setModal({ k: 'topup' })}>{t('Top up')}</button> : <button className="btn g" disabled={busy} onClick={() => act('ms_fund', { dealId, msId: i })}>{t('Fund {amount}', { amount: eur(ms.amt) })}</button>}</>}>
    <p><b>{ms.n}</b> · {person(data, x.with).name}</p>
    <div className="feeline" style={{ marginTop: 12 }}><span>{t('Milestone')}</span><span>{eur(ms.amt)}</span><span>{t('AfterWorc fee')}</span><span>{t('included')}</span><span>{t('Contract fee')}</span><span>€0</span><span className="tot">{t('Charged now')}</span><span className="tot">{eur(ms.amt)}</span></div>
    <p className="small" style={{ marginTop: 12 }}>{t('From your balance ({amount} available). Held until you accept the delivery.', { amount: eur(data.money.hire.available) })}</p>
    {short && <div className="banner am small" style={{ marginTop: 10 }}><Ic n="money" s={16} /><span>{t('Not enough balance. Top up {amount} first.', { amount: eur(ms.amt - data.money.hire.available) })}</span></div>}</Modal>;
}
function Accept({ d: dealId }) {
  const { data, act, busy } = useApp(); const [thanks, setThanks] = useState(true);
  const x = data.deals.find(y => y.id === dealId); const ms = x && x.ms.find(y => y.st === 'delivered'); if (!ms) return null;
  return <Modal title={t('Accept and release {amount}?', { amount: eur(ms.amt) })} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('ms_accept', { dealId, thanks })}>{t('Accept & release')}</button></>}>
    <p>{t("{name} gets paid. This can't be undone.", { name: person(data, x.with).name })}</p><label className="row small" style={{ marginTop: 14 }}><input type="checkbox" checked={thanks} onChange={e => setThanks(e.target.checked)} /> {t('Also send a thank-you note')}</label></Modal>;
}
function Deliver({ d: dealId }) {
  const { act, busy, toast } = useApp(); const [files, setFiles] = useState([]); const [text, setText] = useState('');
  return <Modal title={t('Submit delivery')} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('ms_deliver', { dealId, note: text, files: files.map(f => f.id) })}>{t('Submit')}</button></>}>
    <label className="field"><span>{t('Files')}</span><label className="btn ghost sm" style={{ cursor: 'pointer' }}><Ic n="file" s={14} />{t('Attach files')}<input type="file" hidden multiple onChange={async e => { try { const f = await uploadFiles(e.target.files); setFiles(x => [...x, ...f].slice(0, 10)); } catch (err) { toast(err.message, true); } }} /></label>
      <div className="filelist">{files.map(f => <span key={f.id} className="chip"><Ic n="file" s={13} /> {f.name}</span>)}</div><small>{t('Up to 5 files, 15 MB each. Put links in the note.')}</small></label>
    <label className="field"><span>{t('Note for the client')}</span><textarea className="inp" maxLength={4000} value={text} onChange={e => setText(e.target.value)} placeholder={t('What is done, how to test it, anything open')} /></label>
    <div className="banner small"><Ic n="clock" s={16} />{t('The client has 7 days to accept. Then the money is released to you.')}</div></Modal>;
}
function Issue({ d: dealId }) {
  const { data, act, busy, go } = useApp(); const [text, setText] = useState('');
  const x = data.deals.find(y => y.id === dealId) || {};
  return <Modal title={t('Open an issue')} footer={<><Cancel /><button className="btn danger" disabled={busy} onClick={() => act('deal_issue', { dealId, text })}>{t('Ask for mediation')}</button></>}>
    <div className="stack"><div className="card pad-s"><b>{t('1. Talk first')}</b><p className="muted small">{t('Most issues are solved in messages within a day.')}</p>{x.threadId && <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => go('messages', x.threadId)}>{t('Go to messages')}</button>}</div>
      <div className="card pad-s"><b>{t('2. Ask AfterWorc to mediate')}</b><p className="muted small">{t('A person reviews both sides and proposes a fair split within 2 business days. Free. Money stays held meanwhile.')}</p><label className="field" style={{ marginTop: 10 }}><span>{t('What went wrong?')}</span><textarea className="inp" maxLength={4000} value={text} onChange={e => setText(e.target.value)} /></label></div></div></Modal>;
}
function Withdraw() {
  const { data, act, busy, go } = useApp(); const [code, setCode] = useState('');
  const iban = data.tax.iban;
  return <Modal title={t('Withdraw {amount}', { amount: eur(data.money.work.withdrawable) })} footer={<><Cancel />{!iban ? <button className="btn g" onClick={() => go('settings', 'tax')}>{t('Add IBAN')}</button> : data.twofa ? <button className="btn g" disabled={busy} onClick={() => act('withdraw', { code })}>{t('Withdraw')}</button> : <Go2fa />}</>}>
    <div className="feeline"><span>{t('To')}</span><span>{iban ? iban.slice(0, 4) + '•• ••' + iban.slice(-2) : t('Add a payout account first')}</span><span>{t('Fee')}</span><span>€0</span><span className="tot">{t('Arrives')}</span><span className="tot">{t('1–2 business days')}</span></div>
    <div style={{ marginTop: 12 }}>{!iban ? <div className="banner am small"><Ic n="money" s={16} /><span>{t('Add your IBAN in Settings › Tax & invoicing.')}</span></div> : data.twofa ? <CodeField value={code} onChange={setCode} /> : <Need2fa />}</div></Modal>;
}
function StartDeal({ b, p: pid }) {
  const { data, act, busy } = useApp();
  const sp = person(data, pid);
  const monthly = !!sp.monthly || ['team', 'dept', 'eor'].includes((data.briefs.find(x => x.id === b) || {}).type);
  const nextMonth = new Date(Date.now() + 7 * 864e5).toLocaleString(locale(), { month: 'long' });
  const [f, set] = useForm({ model: monthly ? 'monthly' : sp.rate ? 'hourly' : 'fixed', startDate: new Date(Date.now() + 7 * 864e5).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }), first: monthly ? nextMonth : t('Weeks 1–2'), amount: monthly ? (sp.monthly || '') : sp.rate ? sp.rate * 60 : '' });
  return <Modal title={t('Start a deal with {name}', { name: sp.name })} sub={t('{name} accepts, you fund, work starts.', { name: sp.name })} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('deal_start', { briefId: b, specialistId: pid, ...f })}>{t('Send terms')}</button></>}>
    <div className="opts">{[['hourly', t('Hourly'), t('Weekly report · billed per block')], ['monthly', t('Monthly'), t('Team, department or EOR · one invoice')], ['fixed', t('Fixed milestones'), t('Agree scope + amounts')]].map(([k, ti, x]) => <button key={k} className={'opt ' + (f.model === k ? 'on' : '')} onClick={() => set({ model: k, first: k === 'monthly' && !/^\p{L}+$/u.test(f.first) ? nextMonth : f.first })}><b style={{ fontSize: 14, margin: 0 }}>{ti}</b><span>{x}</span></button>)}</div>
    <label className="field" style={{ marginTop: 14 }}><span>{t('Start date')}</span><input className="inp" maxLength={40} value={f.startDate} onChange={e => set({ startDate: e.target.value })} /></label>
    <div className="grid g2"><label className="field"><span>{f.model === 'monthly' ? t('First month') : t('First milestone')}</span><input className="inp" maxLength={120} value={f.first} onChange={e => set({ first: e.target.value })} /></label>
      <label className="field"><span>{t('Amount (€)')}</span><input className="inp" inputMode="numeric" value={f.amount} onChange={e => set({ amount: e.target.value })} /><small>{sp.rate ? t('Their rate: {r}', { r: eur(sp.rate) + ' ' + t('/ h') }) : sp.monthly ? t('Their price: {r}', { r: eur(sp.monthly) + ' ' + t('/ mo') }) : ''}</small></label></div>
    <div className="feeline"><span>{t('Fee')}</span><span>{t('Included · €0 contract fee')}</span><span>{t('Signed as')}</span><span>{data.acting}</span></div></Modal>;
}
function Call({ p: pid }) {
  const { data, mode, act, busy } = useApp(); const [slot, setSlot] = useState(null);
  const p = pid && pid !== 'x' ? person(data, pid) : null; const ss = slots(6, fmtSlot);
  return <Modal title={p ? t('Book a 15-minute call with {name}', { name: p.name }) : t('Book a 15-minute call')} footer={<><Cancel /><button className="btn g" disabled={!slot || busy} onClick={() => act('book_call', { with: pid || 'x', slot, mode })}>{t('Book')}</button></>}>
    <div className="chips">{ss.map(s => <button key={s} className={'chip ' + (slot === s ? 'on' : '')} onClick={() => setSlot(s)}>{s}</button>)}</div>
    <p className="muted small" style={{ marginTop: 12 }}>{t('Times are in your time zone. The video link comes in the calendar invite. To talk right now, call from Messages.')}</p></Modal>;
}
function Request({ p: pid }) {
  const { data, act, busy } = useApp(); const p = person(data, pid);
  const [f, set] = useForm({ need: '', budget: '€1–5k', start: 'ASAP' });
  return <Modal title={t('Request a proposal from {name}', { name: p.name })} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('request_proposal', { specialistId: pid, ...f })}>{t('Send request')}</button></>}>
    <label className="field"><span>{t('What do you need?')}</span><textarea className="inp" maxLength={2000} value={f.need} onChange={e => set({ need: e.target.value })} placeholder={t('One or two lines is enough')} autoFocus /></label>
    <div className="grid g2"><label className="field"><span>{t('Budget')}</span><select className="inp" value={f.budget} onChange={e => set({ budget: e.target.value })}>{['€1–5k', '€5–15k', 'Hourly', 'Not sure'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>
      <label className="field"><span>{t('Start')}</span><select className="inp" value={f.start} onChange={e => set({ start: e.target.value })}>{['ASAP', 'Within 2 weeks', 'Within a month'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label></div>
    <p className="muted tiny">{t('Starts a conversation and a brief in one go.')}</p></Modal>;
}
function Leave() {
  const { act, busy } = useApp(); const [f, set] = useForm({ how: 'close', confirm: '', password: '' });
  const word = f.how.toUpperCase();
  return <Modal title={t('Close or delete your account')} footer={<><Cancel /><button className="btn danger" disabled={busy} onClick={() => act('account_close', f)}>{f.how === 'close' ? t('Close account') : t('Delete account')}</button></>}>
    <div className="opts"><button className={'opt ' + (f.how === 'close' ? 'on' : '')} onClick={() => set({ how: 'close' })}><b style={{ fontSize: 14, margin: 0 }}>{t('Close')}</b><span>{t('Access ends; legal records kept')}</span></button><button className={'opt ' + (f.how === 'delete' ? 'on' : '')} onClick={() => set({ how: 'delete' })}><b style={{ fontSize: 14, margin: 0 }}>{t('Delete')}</b><span>{t('Everything erased except what law requires')}</span></button></div>
    <label className="field" style={{ marginTop: 14 }}><span>{t('Type {word} to confirm', { word })}</span><input className="inp" value={f.confirm} onChange={e => set({ confirm: e.target.value })} /></label>
    <label className="field"><span>{t('Your password')}</span><input className="inp" type="password" autoComplete="current-password" value={f.password} onChange={e => set({ password: e.target.value })} /></label></Modal>;
}
function TwoFa({ qr, secret }) {
  const { act, busy } = useApp(); const [code, setCode] = useState('');
  return <Modal title={t('Turn on two-factor authentication')} footer={<><Cancel /><button className="btn g" disabled={busy || code.length !== 6} onClick={() => act('twofa_confirm', { code })}>{t('Turn on')}</button></>}>
    <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.8, margin: '0 0 12px' }}><li>{t('Open an authenticator app (Google Authenticator, 1Password, Authy…)')}</li><li>{t('Scan the code, or enter the key by hand')}</li><li>{t('Type the 6-digit code it shows')}</li></ol>
    <div style={{ textAlign: 'center' }}><span className="qr" dangerouslySetInnerHTML={{ __html: qr }} /><p className="mono" style={{ textTransform: 'none', marginTop: 8, color: 'var(--ink)' }}>{secret}</p></div>
    <CodeField value={code} onChange={setCode} /></Modal>;
}
function TwoFaOff() {
  const { act, busy } = useApp(); const [code, setCode] = useState('');
  return <Modal title={t('Turn off two-factor authentication')} footer={<><Cancel /><button className="btn danger" disabled={busy} onClick={() => act('twofa_disable', { code })}>{t('Turn off')}</button></>}>
    <p className="small" style={{ marginBottom: 12 }}>{t('Payouts and card details are blocked until you turn it on again.')}</p><CodeField value={code} onChange={setCode} autoFocus /></Modal>;
}

/** Password: current → new → repeat, plus the 2FA code when two-factor is on. */
function Password() {
  const { data, act, busy } = useApp();
  const [f, set] = useForm({ current: '', next: '', repeat: '', code: '' });
  const mismatch = f.repeat && f.next !== f.repeat;
  const short = f.next && f.next.length < 10;
  const ready = f.current && f.next.length >= 10 && f.next === f.repeat && (!data.twofa || f.code.length === 6);
  return <Modal title={t('Change password')} footer={<><Cancel /><button className="btn g" disabled={!ready || busy} onClick={() => act('password_change', f)}>{t('Change password')}</button></>}>
    <label className="field"><span>{t('Current password')}</span><input className="inp" type="password" autoComplete="current-password" value={f.current} onChange={e => set({ current: e.target.value })} autoFocus /></label>
    <label className="field"><span>{t('New password')}</span><input className="inp" type="password" autoComplete="new-password" value={f.next} onChange={e => set({ next: e.target.value })} aria-invalid={!!short} /><small style={short ? { color: 'var(--red)' } : undefined}>{t('At least 10 characters. Other sessions are signed out.')}</small></label>
    <label className="field"><span>{t('Repeat the new password')}</span><input className="inp" type="password" autoComplete="new-password" value={f.repeat} onChange={e => set({ repeat: e.target.value })} aria-invalid={!!mismatch} />{mismatch && <small style={{ color: 'var(--red)' }}>{t('The new passwords do not match')}</small>}</label>
    {data.twofa && <CodeField value={f.code} onChange={code => set({ code })} label={t('Code from your authenticator app (2FA is on)')} />}
  </Modal>;
}
/** E-mail: the new address must be confirmed by a link; 2FA code too when two-factor is on. */
function Email() {
  const { data, act, busy, setModal } = useApp();
  const [f, set] = useForm({ email: '', password: '', code: '' });
  const [sent, setSent] = useState(null);
  const ready = /\S+@\S+\.\S+/.test(f.email) && f.password && (!data.twofa || f.code.length === 6);
  if (sent) return <Modal title={t('Check your new inbox')} footer={<button className="btn g" onClick={() => setModal(null)}>{t('Done')}</button>}>
    <div className="banner"><Ic n="check" s={18} /><span>{t('We sent a confirmation link to {email}. Your e-mail changes when you open it (within 48 hours).', { email: sent.email })}</span></div>
    {sent.devLink && <p className="small" style={{ marginTop: 10 }}><a href={sent.devLink}>{t('Open the confirmation link (dev mode)')}</a></p>}</Modal>;
  return <Modal title={t('Change e-mail')} footer={<><Cancel /><button className="btn g" disabled={!ready || busy} onClick={async () => { const r = await act('email_change', f, { keepModal: true }); if (r) setSent({ email: f.email, devLink: r.devLink }); }}>{t('Send confirmation link')}</button></>}>
    <label className="field"><span>{t('New e-mail')}</span><input className="inp" type="email" autoComplete="email" value={f.email} onChange={e => set({ email: e.target.value })} autoFocus /></label>
    <label className="field"><span>{t('Your password')}</span><input className="inp" type="password" autoComplete="current-password" value={f.password} onChange={e => set({ password: e.target.value })} /></label>
    {data.twofa && <CodeField value={f.code} onChange={code => set({ code })} label={t('Code from your authenticator app (2FA is on)')} />}
    <p className="muted tiny">{t('We send a confirmation link to the new address. Until you open it, you keep signing in with {email}.', { email: data.me.email })}</p></Modal>;
}
function Name() {
  const { data, act, busy } = useApp(); const [name, setName] = useState(data.me.name);
  return <Modal title={t('Change name')} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('profile_name', { name })}>{t('Save')}</button></>}><label className="field"><span>{t('Your name')}</span><input className="inp" maxLength={80} value={name} onChange={e => setName(e.target.value)} autoFocus /></label></Modal>;
}
function AddMs({ d: dealId, dept, amount }) {
  const { act, busy } = useApp(); const [f, set] = useForm({ name: '', amount: amount || '' });
  return <Modal title={dept ? t('Add a month') : t('Add a milestone')} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('ms_add', { dealId, ...f })}>{t('Add')}</button></>}>
    <div className="grid g2"><label className="field"><span>{t('Name')}</span><input className="inp" maxLength={120} value={f.name} onChange={e => set({ name: e.target.value })} placeholder={dept ? t('December') : t('e.g. Developer handoff')} autoFocus /></label><label className="field"><span>{t('Amount (€)')}</span><input className="inp" inputMode="numeric" value={f.amount} onChange={e => set({ amount: e.target.value })} /></label></div>
    <p className="muted tiny">{t("The specialist sees it right away. You fund it when you're ready.")}</p></Modal>;
}
function TextModal({ title, label, ph, btn, hint, type, payload }) {
  const { act, busy } = useApp(); const [text, setText] = useState('');
  return <Modal title={title} footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act(type, { ...payload, text })}>{btn || t('Send')}</button></>}>
    <label className="field"><span>{label}</span><textarea className="inp" maxLength={3000} value={text} onChange={e => setText(e.target.value)} placeholder={ph || ''} autoFocus />{hint && <small>{hint}</small>}</label></Modal>;
}
function IdCheck() {
  const { act, busy, toast } = useApp(); const [file, setFile] = useState(null);
  return <Modal title={t('Verify your identity')} footer={<><Cancel /><button className="btn g" disabled={!file || busy} onClick={() => act('verify_id', { fileId: file.id })}>{t('Submit')}</button></>}>
    <p className="small">{t('Upload a clear photo or scan of your ID card or passport (front, and back for ID cards). We check it by hand within 1 business day and delete the image after the check, keeping only the result.')}</p>
    <label className="btn ghost" style={{ cursor: 'pointer', marginTop: 14 }}><Ic n="file" s={15} />{file ? t('Change file') : t('Choose file')}<input type="file" hidden accept="image/*,application/pdf" onChange={async e => { try { const f = await uploadFiles(e.target.files); setFile(f[0]); } catch (err) { toast(err.message, true); } }} /></label>
    {file && <p className="small" style={{ marginTop: 8 }}><Ic n="check" s={14} /> {file.name}</p>}</Modal>;
}
function Refs() {
  const { act, busy } = useApp(); const [refs, setRefs] = useState([{ name: '', email: '', company: '' }, { name: '', email: '', company: '' }]);
  const up = (i, k, v) => setRefs(r => r.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return <Modal title={t('Add two references')} wide footer={<><Cancel /><button className="btn g" disabled={busy} onClick={() => act('verify_refs', { refs })}>{t('Send')}</button></>}>
    <p className="small muted" style={{ marginBottom: 12 }}>{t('Past clients or managers who can speak about your work. We call them; nobody else sees their details.')}</p>
    {refs.map((r, i) => <div key={i} className="grid g3"><label className="field"><span>{t('Name')}</span><input className="inp" maxLength={80} value={r.name} onChange={e => up(i, 'name', e.target.value)} /></label><label className="field"><span>{t('E-mail')}</span><input className="inp" type="email" value={r.email} onChange={e => up(i, 'email', e.target.value)} /></label><label className="field"><span>{t('Company')}</span><input className="inp" maxLength={80} value={r.company} onChange={e => up(i, 'company', e.target.value)} /></label></div>)}</Modal>;
}
function Interview() {
  const { act, busy } = useApp(); const [slot, setSlot] = useState(null); const ss = slots(8, fmtSlot);
  return <Modal title={t('Book your interview')} footer={<><Cancel /><button className="btn g" disabled={!slot || busy} onClick={() => act('verify_interview', { slot })}>{t('Book')}</button></>}>
    <p className="small muted" style={{ marginBottom: 12 }}>{t('30 minutes with our team: in person at Mäealuse 10/2, Tallinn, or by video.')}</p>
    <div className="chips">{ss.map(s => <button key={s} className={'chip ' + (slot === s ? 'on' : '')} onClick={() => setSlot(s)}>{s}</button>)}</div></Modal>;
}

export default function Modals() {
  const { modal: m } = useApp();
  if (!m) return null;
  const key = m.k + JSON.stringify(m).length;
  switch (m.k) {
    case 'need2fa': return <Modal title={t('Two-factor authentication needed')} footer={<><Cancel /><Go2fa /></>}><Need2fa /></Modal>;
    case 'topup': return <TopUp key={key} />;
    case 'getcard': return <GetCard key={key} />;
    case 'reveal': return <Reveal key={key} what={m.what} />;
    case 'pinshow': return <PinShow pin={m.pin} />;
    case 'limits': return <Limits />;
    case 'orderphys': return <OrderPhys />;
    case 'lost': return <Lost />;
    case 'fund': return <Fund {...m} />;
    case 'accept': return <Accept {...m} />;
    case 'deliver': return <Deliver {...m} />;
    case 'issue': return <Issue {...m} />;
    case 'withdraw': return <Withdraw />;
    case 'startdeal': return <StartDeal {...m} />;
    case 'call': return <Call {...m} />;
    case 'request': return <Request {...m} />;
    case 'leave': return <Leave />;
    case 'twofa': return <TwoFa {...m} />;
    case 'twofaoff': return <TwoFaOff />;
    case 'pw': return <Password />;
    case 'email': return <Email />;
    case 'name': return <Name />;
    case 'addms': return <AddMs {...m} />;
    case 'text': return <TextModal key={key} {...m} />;
    case 'idcheck': return <IdCheck />;
    case 'refs': return <Refs />;
    case 'interview': return <Interview />;
    default: return null;
  }
}
export { tr };
