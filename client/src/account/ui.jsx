/* Small building blocks shared by the account views. */
import { useApp, initials, firstName } from './store.jsx';
import { Ic, SealIc } from '../shared/icons.jsx';
import { t, tr, eur } from '../shared/i18n.js';

export function Avatar({ name, src, size = '', alt = false, online, style }) {
  return (
    <span className="avwrap" style={style}>
      <span className={`avatar ${size} ${alt ? 'alt' : ''}`}>{src ? <img src={src} alt="" loading="lazy" /> : initials(name)}</span>
      {online && <span className="on" title={t('Online now')} />}
    </span>
  );
}

export function Seal({ lv }) {
  if (lv === 'checked') return <span className="seal"><SealIc />{t('Checked in person')}</span>;
  if (lv === 'id' || lv === 'verified') return <span className="seal" style={{ color: 'var(--blue)' }}><Ic n="shield" s={14} w={2} />{t('ID verified')}</span>;
  return <span className="pill">{t('Registered')}</span>;
}

export function Head({ title, sub, right, crumb }) {
  return (<>
    {crumb && <div className="crumb">{crumb}</div>}
    <div className="pagehead"><div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>{right && <div className="row wrapf">{right}</div>}</div>
  </>);
}
export function Crumb({ to, label, here }) {
  const { go } = useApp();
  return <><button onClick={() => go(to)}>{label}</button> / {here}</>;
}

export function Empty({ icon, title, text, children, style }) {
  return <div className="empty" style={style}>{icon && <Ic n={icon} s={30} />}<h3>{title}</h3>{text && <p>{text}</p>}{children}</div>;
}

export function Sandbox({ card }) {
  const { data } = useApp();
  if (data.sandbox) return <div className="sandbox"><Ic n="shield" s={15} /><span><b>{t('Test mode.')}</b> {t('Payments and the card run on the AfterWorc test ledger until our payment and issuing partners go live. No real money moves.')}</span></div>;
  if (card) return <div className="sandbox"><Ic n="shield" s={15} /><span><b>{t('Card in test mode')}</b> {t('until our issuing partner goes live. Card numbers are test numbers.')}</span></div>;
  return null;
}

export function Modal({ title, sub, children, footer, onClose, wide }) {
  const { setModal } = useApp();
  const close = onClose || (() => setModal(null));
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { maxWidth: 680 } : undefined}>
        <div className="mh"><div><h2>{title}</h2>{sub && <p className="muted small" style={{ marginTop: 4 }}>{sub}</p>}</div><button className="x" onClick={close} aria-label={t('Close')}>✕</button></div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}
export function Cancel() { const { setModal } = useApp(); return <button className="btn ghost" onClick={() => setModal(null)}>{t('Cancel')}</button>; }

export function CodeField({ value, onChange, label, autoFocus }) {
  return (
    <label className="field"><span>{label || t('Code from your authenticator app')}</span>
      <input className="inp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={t('6 digits')} value={value || ''} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
  );
}
export function Need2fa() {
  return <div className="banner am small"><Ic n="lock" s={16} />{t('Turn on two-factor authentication first. It protects payouts, card details and PIN.')}</div>;
}
export function Go2fa() {
  const { go } = useApp();
  return <button className="btn g" onClick={() => go('settings', 'sec')}>{t('Turn on 2FA')}</button>;
}

export function Toggle({ on, onClick, label }) {
  return <button className={'tgl ' + (on ? 'on' : '')} role="switch" aria-checked={!!on} aria-label={label} onClick={onClick} />;
}

/** AfterWorc Mastercard (SVG from /assets/card.js). */
let uid = 0;
export function CardArt({ opts, className = 'pcard', style }) {
  const svg = typeof window.awCard === 'function' ? window.awCard({ uid: 'r' + (++uid), ...opts }) : '';
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}
export function useCardOpts() {
  const { data, reveal } = useApp();
  return (m, o = {}) => {
    const c = data.cards[m];
    const rv = reveal && reveal.mode === m ? reveal : null;
    const variant = c.phys === 'none' && c.st === 'active' ? 'virtual' : (m === 'hire' ? 'company' : 'personal');
    return { variant, side: rv ? 'back' : c.side, name: c.name || String(data.me.name).toUpperCase(), org: m === 'hire' ? (c.org || data.acting) : '', last4: c.last4 || '0000', exp: c.exp || '--/--',
      frozen: c.frozen && c.st === 'active', pan: rv && rv.pan ? rv.pan : '', cvc: rv && rv.cvc ? rv.cvc : '', ...o };
  };
}

export const rateOf = p => p.monthly ? eur(p.monthly) + ' ' + t('/ mo') : p.rate ? eur(p.rate) + ' ' + t('/ h') : t('Rate on request');
export const TYPEL = () => ({ task: t('Task'), person: t('Specialist'), team: t('Ready team'), dept: t('Department'), eor: t('Hire abroad (EOR)') });
export const typeIc = x => x === 'task' ? 'task' : x === 'person' ? 'user' : x === 'team' ? 'team' : x === 'eor' ? 'globe' : 'dept';
export function greet() { const h = new Date().getHours(); return h < 5 ? t('Good evening') : h < 12 ? t('Good morning') : h < 18 ? t('Good afternoon') : t('Good evening'); }
export { t, tr, eur, firstName, initials };

/** Upcoming weekday slots for calls and interviews. */
export function slots(n = 6, fmt) {
  const out = []; const d = new Date(); d.setMinutes(0, 0, 0);
  while (out.length < n) {
    d.setDate(d.getDate() + (out.length % 2 === 0 ? 1 : 0));
    const wd = d.getDay(); if (wd === 0 || wd === 6) { d.setDate(d.getDate() + 1); continue; }
    for (const h of [10, 15]) { if (out.length >= n) break; const x = new Date(d); x.setHours(h, out.length % 2 ? 30 : 0); if (x > Date.now() + 3600e3) out.push(fmt(x)); }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Copy text and confirm with a toast. */
export async function copyText(text, toast, what) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { /* ignore */ } ta.remove();
  }
  toast(t('{what} copied', { what }));
}
