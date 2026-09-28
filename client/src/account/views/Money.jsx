import { useEffect, useState } from 'react';
import { useApp, hasCard } from '../store.jsx';
import { Ic } from '../../shared/icons.jsx';
import { t, tr, eur } from '../../shared/i18n.js';
import { uploadFiles } from '../../shared/api.js';
import { Head, Sandbox, CardArt, useCardOpts, Toggle, copyText } from '../ui.jsx';
import { CardMini } from './Home.jsx';

function MoneyTabs() {
  const { data, mode, route, go } = useApp();
  return <div className="tabsx">{[['money', 'Overview'], ['card', 'Card']].map(([r, l]) => <button key={r} className={route === r ? 'on' : ''} onClick={() => go(r)}>{t(l)}{r === 'card' && !hasCard(data.cards[mode]) && <span className="c" style={{ background: 'var(--brand2)', color: '#fff' }}>{t('New')}</span>}</button>)}</div>;
}
function TxTable({ tx }) {
  if (!tx.length) return <p className="muted small" style={{ padding: '0 18px 18px' }}>{t('No activity yet.')}</p>;
  return <div className="tscroll" style={{ overflowX: 'auto' }}><table className="tbl"><tbody>{tx.map((x, i) => <tr key={i}><td className="muted">{tr(x[0])}</td><td>{tr(x[1])}</td><td className="muted">{tr(x[3])}</td><td className="r" style={{ fontWeight: 600, color: x[2] > 0 ? 'var(--brand2)' : 'inherit' }}>{x[2] > 0 ? '+' : ''}{eur(x[2])}</td></tr>)}</tbody></table></div>;
}

export function MoneyHire() {
  const { data, go, setModal } = useApp();
  const m = data.money.hire, org = data.orgs.find(o => o.id === data.actingOrgId), tax = data.tax;
  return (<>
    <Head title={t('Money')} sub={t('Balance, card, invoices and payment methods for {org}.', { org: data.acting })} right={<button className="btn g" onClick={() => setModal({ k: 'topup' })}><Ic n="plus" s={15} w={2.2} />{t('Top up')}</button>} />
    <MoneyTabs /><Sandbox />
    <div className="grid g3">
      <div className="bal"><span className="l">{t('Available')}</span><b>{eur(m.available)}</b><p>{t('Funds new milestones and your company card.')}{m.pending ? ' ' + t('{amount} on its way.', { amount: eur(m.pending) }) : ''}</p></div>
      <div className="bal dk"><span className="l">{t('Held in deals')}</span><b>{eur(m.held)}</b><p>{t('Released only when you accept work.')}</p></div>
      <div className="bal"><span className="l">{t('Next invoice')}</span><b>{m.nextInvoice ? eur(m.nextInvoice) : '—'}</b><p>{m.nextInvoice ? t('1st of next month · departments') : t('Invoices are issued when you fund a milestone.')}</p></div>
    </div>
    <div className="split" style={{ marginTop: 18 }}><div className="stack">
      <div className="card" style={{ padding: 0 }}><div className="row between" style={{ padding: '16px 18px' }}><h3>{t('Invoices')}</h3><a className="btn link small" href="/api/account/statement/hire" target="_blank" rel="noopener">{t('Statement')}</a></div>
        {m.inv.length ? <div style={{ overflowX: 'auto' }}><table className="tbl"><thead><tr><th>{t('No.')}</th><th>{t('Date')}</th><th>{t('For')}</th><th className="r">{t('Amount')}</th><th></th></tr></thead><tbody>{m.inv.map(i => <tr key={i[0]}><td className="mono" style={{ textTransform: 'none' }}>{i[0]}</td><td>{tr(i[1])}</td><td>{i[2]}</td><td className="r">{eur(i[3])}</td><td className="r"><a className="btn ghost sm" href={`/api/account/invoices/${encodeURIComponent(i[0])}`} target="_blank" rel="noopener"><Ic n="dl" s={14} />PDF</a></td></tr>)}</tbody></table></div>
          : <p className="muted small" style={{ padding: '0 18px 18px' }}>{t('No invoices yet.')}</p>}</div>
      <div className="card" style={{ padding: 0 }}><div style={{ padding: '16px 18px' }}><h3>{t('Activity')}</h3></div><TxTable tx={m.tx} /></div>
    </div><div className="stack sticky">
      <CardMini />
      <div className="card"><h3>{t('Pay with')}</h3><div className="stack-s" style={{ marginTop: 10 }}><div className="row"><span className="pill ok">{t('Default')}</span><span className="small">{t('Estonian bank link (LHV, Swedbank, SEB)')}</span></div><div className="row"><span className="pill">{t('Backup')}</span><span className="small">{t('SEPA transfer · reference {ref}', { ref: `AW-${data.me.id}-HIRE` })}</span></div></div><button className="btn link small" onClick={() => setModal({ k: 'topup' })}>{t('Top up by card or wallet')}</button></div>
      <div className="card"><h3>{t('Billing details')}</h3><div className="kv" style={{ marginTop: 10 }}><span>{t('Bill to')}</span><span>{data.acting}</span><span>{t('Country')}</span><span>{t(org ? org.country : (tax.country || 'Estonia'))}</span><span>VAT</span><span>{org && org.vat ? org.vat : tax.taxId || '—'}</span><span>{t('Invoices to')}</span><span>{tax.invoicesTo || data.me.email}</span></div><button className="btn link small" onClick={() => go('settings', 'tax')}>{t('Edit')}</button></div>
    </div></div>
  </>);
}

export function MoneyWork() {
  const { data, go, setModal } = useApp();
  const m = data.money.work, tax = data.tax;
  return (<>
    <Head title={t('Money')} sub={t('What you have earned, your card, and where money goes.')} right={<><button className="btn ghost" onClick={() => setModal({ k: 'topup' })}><Ic n="plus" s={15} w={2.2} />{t('Top up')}</button><button className="btn g" onClick={() => setModal({ k: 'withdraw' })} disabled={!(m.withdrawable > 0)}><Ic n="dl" s={15} />{t('Withdraw {amount}', { amount: eur(m.withdrawable) })}</button></>} />
    <MoneyTabs /><Sandbox />
    <div className="grid g3">
      <div className="bal"><span className="l">{t('Available now')}</span><b>{eur(m.available)}</b><p>{t('Spend it with your card now, or withdraw: 1–2 business days.')}</p></div>
      <div className="bal dk"><span className="l">{t('Held for your work')}</span><b>{eur(m.held)}</b><p>{t('Funded by clients, waiting for your delivery.')}</p></div>
      <div className="bal"><span className="l">{t('Earned this month')}</span><b>{eur(m.earnedMonth)}</b><p>{t('Released after clients accepted your work.')}</p></div>
    </div>
    <div className="split" style={{ marginTop: 18 }}><div className="stack">
      <div className="card"><div className="row between"><h3>{t('Your fee')}</h3><span className="pill ok">{data.feePct ? t('{pct}% at release', { pct: data.feePct }) : t('€0 at release')}</span></div><p className="muted small" style={{ marginTop: 8 }}>{t('No bidding credits, no Connects, no fee to apply. The fee is taken only when money is released to you, and shown on every deal.')}</p></div>
      <div className="card" style={{ padding: 0 }}><div style={{ padding: '16px 18px' }}><h3>{t('Activity')}</h3></div><TxTable tx={m.tx} /></div>
    </div><div className="stack sticky">
      <CardMini />
      <div className="card"><h3>{t('Payout account')}</h3>{tax.iban ? <div className="row" style={{ marginTop: 10 }}><span className="avatar alt sm"><Ic n="money" s={14} /></span><div><b className="small">{tax.iban.slice(0, 4)}•• •••• ••{tax.iban.slice(-2)}</b><div className="muted tiny">{tax.holder || data.me.name} · SEPA</div></div></div> : <p className="muted small" style={{ marginTop: 6 }}>{t('Add the bank account we pay you to.')}</p>}<button className="btn link small" onClick={() => go('settings', 'tax')}>{tax.iban ? t('Change') : t('Add payout account')}</button></div>
      <div className="card"><h3>{t('Statements')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{t('For your accountant. DAC7 data is reported for you.')}</p><a className="btn ghost sm" href="/api/account/statement/work" target="_blank" rel="noopener"><Ic n="dl" s={14} />{t('Download statement')}</a></div>
    </div></div>
  </>);
}

/** Card details shown for 30 seconds after a 2FA check, each with a copy button. */
function RevealPanel() {
  const { reveal, setReveal, toast } = useApp();
  const [left, setLeft] = useState(30);
  useEffect(() => { if (!reveal) return; const end = reveal.until || Date.now() + 30000; const i = setInterval(() => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); setLeft(s); if (!s) setReveal(null); }, 500); return () => clearInterval(i); }, [reveal, setReveal]);
  if (!reveal || !reveal.pan) return null;
  const row = (label, value, raw, what) => <div className="copyrow"><div><div className="l">{label}</div><b>{value}</b></div><button className="btn ghost sm" onClick={() => copyText(raw, toast, what)} aria-label={t('Copy {what}', { what })}><Ic n="copy" s={14} />{t('Copy')}</button></div>;
  return (
    <div className="card stack-s" style={{ borderColor: 'var(--brand2)' }}>
      <div className="row between"><h3>{t('Card details')}</h3><span className="muted small">{t('Hidden in {s} s', { s: left })}</span></div>
      {row(t('Card number'), reveal.pan, reveal.pan.replace(/\s/g, ''), t('Card number'))}
      <div className="grid g2" style={{ gap: 8 }}>
        {row(t('Valid until'), reveal.exp, reveal.exp, t('Expiry date'))}
        {row('CVV / CVC', reveal.cvc, reveal.cvc, 'CVV')}
      </div>
      <div className="row between"><p className="muted tiny">{t('Nobody from AfterWorc will ever ask for these details.')}</p><button className="btn link small" onClick={() => setReveal(null)}>{t('Hide now')}</button></div>
    </div>
  );
}

export function CardPage() {
  const { data, mode, act, setModal, toast, reveal } = useApp();
  const c = data.cards[mode], hire = mode === 'hire', bal = data.money[mode].available;
  const opts = useCardOpts();
  const head = <Head title={t('Money')} sub={hire ? t('Balance, card, invoices and payment methods for {org}.', { org: data.acting }) : t('What you have earned, your card, and where money goes.')} right={<button className="btn g" onClick={() => setModal({ k: 'topup' })}><Ic n="plus" s={15} w={2.2} />{t('Top up')}</button>} />;
  if (!hasCard(c)) return (<>
    {head}<MoneyTabs /><Sandbox card />
    <div className="card" style={{ padding: 26 }}><div className="cardhero">
      <CardArt opts={opts(mode, { side: 'front', frozen: false })} />
      <div><span className="mono" style={{ color: 'var(--brand2)' }}>{t('New · AfterWorc Mastercard® debit')}</span>
        <h2 style={{ fontSize: 25, margin: '8px 0' }}>{hire ? t('A company card for {org}', { org: data.acting }) : t('Spend what you earn, the moment it is released')}</h2>
        <p className="muted">{hire ? t('Pay for tools, ads and travel straight from the company balance. Each payment shows up in Money with a slot for the receipt, ready for your accountant.') : t('No waiting for a bank transfer. When a client accepts your work, the money is on your card. Withdraw to your bank whenever you like.')}</p>
        <ul className="ticks"><li>{t('Virtual card ready in about a minute, physical card by post')}</li><li>{hire ? t('Spends from your company balance. No credit, no overdraft') : t('Spends from your Working balance. No credit, no overdraft')}</li><li>{t('Freeze, limits and ATM on/off in one tap')}</li><li>{t('Apple Pay and Google Pay')}</li><li>{t('Uses the ID check you already passed. No new paperwork')}</li></ul>
        <div className="row wrapf"><button className="btn g" onClick={() => setModal({ k: 'getcard' })}><Ic n="plus" s={15} w={2.2} />{t('Get my card')}</button><button className="btn ghost" onClick={() => setModal({ k: 'topup' })}>{t('Top up balance')}</button></div>
        <p className="muted tiny" style={{ marginTop: 10 }}>{t("Issued by our issuing partner under licence from Mastercard. Card fees follow the issuer's price list.")}</p></div>
    </div></div>
    <h2 style={{ margin: '24px 0 12px' }}>{t('Three versions, one account')}</h2>
    <div className="cardvars">{[['personal', t('Personal'), t('Working mode · your earnings')], ['company', t('Business'), t('Hiring mode · company balance')], ['virtual', t('Virtual'), t('Online and phone wallets only')]].map(([v, ti, x]) => <div key={v}><CardArt opts={{ variant: v, name: String(data.me.name).toUpperCase(), org: v === 'company' ? data.acting : '', last4: v === 'company' ? '7730' : v === 'virtual' ? '0915' : '4821' }} /><b className="small" style={{ display: 'block', marginTop: 10 }}>{ti}</b><span className="muted tiny">{x}</span></div>)}</div>
  </>);
  const pct = Math.min(100, Math.round(c.spent / Math.max(1, c.lim.month) * 100));
  const qa = (fn, icn, label, cls = '') => <button className={cls} onClick={fn}><span className="ic"><Ic n={icn} s={17} /></span>{label}</button>;
  const tg = (k, l, x) => <div className="ctl"><div><b className="small">{l}</b><div className="muted tiny">{x}</div></div><Toggle on={c.tg[k]} label={l} onClick={() => act('card_toggle', { k })} /></div>;
  const rv = reveal && reveal.mode === mode;
  const physLabel = { none: t('Not ordered'), shipping: t('On its way · 5–7 business days'), active: t('Active') }[c.phys];
  return (<>
    {head}<MoneyTabs /><Sandbox card />
    <div className="split"><div className="stack">
      <div className="card"><div className="cardhero">
        <div><CardArt opts={opts(mode)} /><div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>{rv ? <span className="muted small">{t('Details visible for 30 seconds')}</span> : <button className="btn link small" onClick={() => act('card_side', {}, { quiet: true })}>{c.side === 'front' ? t('Show back') : t('Show front')}</button>}</div></div>
        <div className="stack-s">
          <div className="row between" style={{ alignItems: 'flex-start' }}><div><span className="mono muted">{hire ? t('Company card · {org}', { org: c.org }) : t('Personal card')}</span><h2 style={{ marginTop: 4 }}>{t('Mastercard debit')} ••{c.last4}</h2></div><span className={'pill ' + (c.frozen ? 'wait' : 'ok')}>{c.frozen ? t('Frozen') : t('Active')}</span></div>
          <div className="kv"><span>{t('Spends from')}</span><span>{hire ? t('{org} balance', { org: c.org }) : t('Working balance')} · <b>{eur(bal)}</b></span><span>{t('Physical card')}</span><span>{physLabel}</span><span>{t('Valid until')}</span><span>{c.exp}</span></div>
          <div><div className="row between small"><span>{t('Spent this month')}</span><span>{t('{spent} of {limit}', { spent: eur(c.spent), limit: eur(c.lim.month) })}</span></div><div className="progress" style={{ marginTop: 6 }}><i style={{ width: pct + '%' }} /></div></div>
          <div className="qa">{qa(() => act('card_freeze'), 'lock', c.frozen ? t('Unfreeze') : t('Freeze'), 'frz')}{qa(() => setModal({ k: 'reveal', what: 'details' }), 'eye', t('Details'))}{qa(() => setModal({ k: 'topup' }), 'plus', t('Top up'))}{qa(() => setModal({ k: 'limits' }), 'gear', t('Limits'))}</div>
        </div>
      </div></div>
      {rv && <RevealPanel />}
      {c.frozen && <div className="banner am"><Ic n="lock" s={18} /><span><b>{t('Card is frozen.')}</b> {t('Payments and ATM withdrawals are declined until you unfreeze it. Subscriptions may fail.')}</span></div>}
      {bal < 100 && <div className="banner am"><Ic n="money" s={18} /><span>{t('Low balance: {amount}.', { amount: eur(bal) })} <button className="btn link small" onClick={() => setModal({ k: 'topup' })}>{t('Top up')}</button> {t("so card payments don't get declined.")}</span></div>}
      <div className="card" style={{ padding: 0 }}><div className="row between" style={{ padding: '16px 18px' }}><h3>{t('Card payments')}</h3><a className="btn link small" href={`/api/account/statement/${mode}`} target="_blank" rel="noopener">{t('Statement')}</a></div>
        {c.tx.length ? <div style={{ overflowX: 'auto' }}><table className="tbl"><tbody>{c.tx.map(x => <tr key={x.id}><td className="muted">{tr(x.d)}</td><td>{x.descr}<div className="muted tiny">{tr(x.ch)}</div></td>
          {hire && <td>{x.receipt ? <span className="pill ok">{t('Receipt added')}</span> : <label className="btn ghost sm" style={{ cursor: 'pointer' }}><Ic n="file" s={14} />{t('Add receipt')}<input type="file" hidden accept="image/*,application/pdf" onChange={async e => { try { const f = await uploadFiles(e.target.files); await act('card_receipt', { txId: x.id, fileId: f[0].id }); } catch (err) { toast(err.message, true); } }} /></label>}</td>}
          <td className="r" style={{ fontWeight: 600 }}>{eur(x.amt)}</td></tr>)}</tbody></table></div>
          : <div className="empty" style={{ padding: 24 }}><h3>{t('No card payments yet')}</h3><p>{t('Add the card to Google Pay or Apple Pay, or use the card details online.')}</p></div>}
      </div>
      <p className="muted tiny">{t('Card payments come out of Available right away. Money held in deals is never touched by the card.')}</p>
    </div><div className="stack sticky">
      <div className="card"><h3 style={{ marginBottom: 4 }}>{t('Controls')}</h3>{tg('online', t('Online payments'), t('Shops, subscriptions, ads'))}{tg('contactless', t('Contactless'), t('Tap to pay in shops'))}{tg('atm', t('ATM withdrawals'), t('Cash from machines'))}{tg('abroad', t('Payments abroad'), t('Outside Estonia'))}</div>
      <div className="card"><div className="row between"><h3>{t('Limits')}</h3><button className="btn link small" onClick={() => setModal({ k: 'limits' })}>{t('Edit')}</button></div>
        <div className="kv" style={{ marginTop: 10 }}><span>{t('Per day')}</span><span>{eur(c.lim.day)}</span><span>{t('Per month')}</span><span>{eur(c.lim.month)}</span><span>{t('ATM per day')}</span><span>{c.tg.atm ? eur(c.lim.atm) : t('Off')}</span></div></div>
      <div className="card"><h3>{t('Phone wallets')}</h3>{[['apple', 'Apple Pay'], ['google', 'Google Pay']].map(([k, l]) => <div key={k} className="ctl"><b className="small">{l}</b>{c.wal[k] ? <span className="pill ok">{t('Added')}</span> : <button className="btn ghost sm" onClick={() => act('card_wallet', { k })}>{t('Add')}</button>}</div>)}</div>
      <div className="card"><h3>{t('Physical card')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{physLabel}{c.phys === 'none' ? '. ' + t('Order one for shops and ATMs.') : ''}</p>
        {c.phys === 'none' ? <button className="btn ghost sm" onClick={() => setModal({ k: 'orderphys' })}>{t('Order physical card')}</button> : c.phys === 'shipping' ? <button className="btn g sm" onClick={() => act('card_activate')}>{t('Activate when it arrives')}</button> : <button className="btn ghost sm" onClick={() => setModal({ k: 'reveal', what: 'pin' })}>{t('Show PIN')}</button>}</div>
      <div className="card"><h3>{t('Lost or stolen?')}</h3><p className="muted small" style={{ margin: '4px 0 10px' }}>{t("Freeze first if you're not sure. If it's gone, we block it and send a new number.")}</p><button className="btn danger sm" onClick={() => { act('card_lost', { o: 'freeze' }, { quiet: true, keepModal: true }); setModal({ k: 'lost' }); }}>{t('Report lost or stolen')}</button></div>
    </div></div>
  </>);
}
