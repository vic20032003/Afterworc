/* Account shell: top bar, side and bottom navigation, the current view, modals, toasts and calls. */
import { useEffect, useRef, useState } from 'react';
import { useApp, counts, hasCard } from './store.jsx';
import { Ic, LogoMark, SealIc } from '../shared/icons.jsx';
import { t, tr, eur, LANGS } from '../shared/i18n.js';
import { api } from '../shared/api.js';
import { Avatar } from './ui.jsx';
import { CallProvider } from '../shared/calls.jsx';
import Modals from './modals/Modals.jsx';
import { HireHome, WorkHome } from './views/Home.jsx';
import { Briefs, Brief, NewBrief } from './views/Briefs.jsx';
import { Deals, Deal } from './views/Deals.jsx';
import Messages from './views/Messages.jsx';
import { MoneyHire, MoneyWork, CardPage } from './views/Money.jsx';
import { Opps, Opp } from './views/Opps.jsx';
import { Profile, PublicProfile, Find } from './views/Profile.jsx';
import Settings from './views/Settings.jsx';
import Help from './views/Help.jsx';

const NAV = {
  hire: [['home', 'Home', 'home'], ['briefs', 'Briefs', 'brief'], ['deals', 'Deals', 'deal'], ['messages', 'Messages', 'msg'], ['money', 'Money', 'money']],
  work: [['home', 'Home', 'home'], ['opps', 'Opportunities', 'opp'], ['deals', 'Deals', 'deal'], ['messages', 'Messages', 'msg'], ['money', 'Money', 'money']]
};

function View() {
  const { route, param, mode } = useApp();
  switch (route) {
    case 'briefs': return <Briefs />;
    case 'brief': return <Brief id={param} />;
    case 'newbrief': return <NewBrief draftId={param} />;
    case 'deals': return <Deals />;
    case 'deal': return <Deal id={param} />;
    case 'messages': return <Messages id={param} />;
    case 'money': return mode === 'hire' ? <MoneyHire /> : <MoneyWork />;
    case 'card': return <CardPage />;
    case 'opps': return <Opps />;
    case 'opp': return <Opp id={param} />;
    case 'profile': return <Profile />;
    case 'pp': return <PublicProfile id={param} />;
    case 'settings': return <Settings />;
    case 'help': return <Help />;
    case 'find': return <Find />;
    default: return mode === 'hire' ? <HireHome /> : <WorkHome />;
  }
}

function useOutside(ref, on, close) {
  useEffect(() => {
    if (!on) return;
    const f = e => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const k = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', f); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k); };
  }, [on, close, ref]);
}

function NotifMenu() {
  const { data, mode, go, act, setMenu } = useApp();
  const list = data.notifs.filter(n => n.mode === mode);
  const open = n => { if (n.unread) api('/account/action', { type: 'notif_read', id: n.id }).catch(() => {}); go(n.go[0], n.go[1]); };
  return (
    <div className="menu nf">
      <div className="nfh"><b>{t('Notifications')}</b>{list.some(n => n.unread) && <button className="btn link small" onClick={() => { setMenu(null); act('notif_readall', { mode }, { quiet: true }); }}>{t('Mark all read')}</button>}</div>
      {list.length ? list.slice(0, 25).map(n => (
        <div key={n.id} className={'nfi ' + (n.unread ? 'unread' : '')} role="button" tabIndex={0} onClick={() => open(n)} onKeyDown={e => e.key === 'Enter' && open(n)}>
          <span style={{ color: 'var(--brand2)', marginTop: 2 }}><Ic n={n.unread ? 'bell' : 'check'} s={16} /></span>
          <div><b style={{ fontWeight: 600 }}>{tr(n.t)}</b><div className="muted small">{tr(n.s)}</div><div className="muted tiny">{tr(n.at)}</div></div>
        </div>)) : <div className="nfi muted">{t('Nothing yet. Updates on briefs, deals and payments appear here.')}</div>}
      <div className="nfh small muted">{t('Choose what you get in')} <button className="btn link small" onClick={() => go('settings', 'notif')}>{t('Settings')}</button></div>
    </div>
  );
}

function themeIsDark() { const r = document.documentElement; return r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function AvatarMenu() {
  const { data, go, act, lang, changeLang, setMenu } = useApp();
  const [dark, setDark] = useState(themeIsDark());
  const setTheme = d => { const r = document.documentElement; r.dataset.theme = d ? 'dark' : 'light'; try { localStorage.setItem('aw-theme', r.dataset.theme); } catch { /* blocked */ } setDark(d); };
  const acting = (id, n, sub) => {
    const on = (data.actingOrgId || null) === id;
    return <button key={id || 'me'} className={'acting ' + (on ? 'on' : '')} onClick={() => { setMenu(null); act('acting', { orgId: id || null }); }}>
      <Avatar name={n} size="sm" alt={!!id} src={id ? null : data.me.avatar} /><span><b style={{ fontSize: 13 }}>{n}</b><div className="muted tiny">{sub}</div></span>{on && <span className="ck">✓</span>}</button>;
  };
  return (
    <div className="menu" role="menu">
      <div className="hd">{t('Acting as')}</div>
      {acting(null, data.me.name, t('Personal'))}
      {data.orgs.map(o => acting(o.id, o.name, `${t('Company')}${o.vat ? ' · VAT ' + o.vat : ''} · ${tr(o.role)}`))}
      <button className="mi" onClick={() => go('settings', 'org')}><Ic n="plus" s={16} />{t('Add a company')}</button>
      <hr />
      <button className="mi" onClick={() => go('pp', 'me')}><Ic n="eye" s={16} />{t('View my public profile')}</button>
      <button className="mi" onClick={() => go('profile')}><Ic n="user" s={16} />{t('Profile, photo & portfolio')}</button>
      <button className="mi" onClick={() => go('settings', 'sec')}><Ic n="gear" s={16} />{t('Settings')}</button>
      <button className="mi" onClick={() => go('help')}><Ic n="help" s={16} />{t('Help & support')}</button>
      {data.me.admin && <a className="mi" href="/admin" style={{ textDecoration: 'none', color: 'inherit' }}><Ic n="shield" s={16} />{t('Staff console')}</a>}
      <a className="mi" href="/" style={{ textDecoration: 'none', color: 'inherit' }}><Ic n="globe" s={16} />afterworc.com</a>
      <hr />
      {/* Appearance: theme and language together */}
      <div className="rowlabel"><Ic n="moon" s={14} />{t('Theme')}</div>
      <div className="seg" role="group" aria-label={t('Theme')}>
        <button className={!dark ? 'on' : ''} onClick={() => setTheme(false)}>{t('Light')}</button>
        <button className={dark ? 'on' : ''} onClick={() => setTheme(true)}>{t('Dark')}</button>
      </div>
      <div className="rowlabel"><Ic n="globe" s={14} />{t('Language')}</div>
      <div className="seg" role="group" aria-label={t('Language')}>
        {LANGS.map(([k, l, n]) => <button key={k} className={lang === k ? 'on' : ''} lang={k} title={n} onClick={() => changeLang(k)}>{n}</button>)}
      </div>
      <hr />
      <button className="mi" onClick={async () => { try { await api('/auth/logout', {}); } catch { /* ignore */ } location.href = '/'; }}><Ic n="out" s={16} />{t('Sign out')}</button>
    </div>
  );
}

function GlobalSearch() {
  const { data, mode, go } = useApp();
  const [q, setQ] = useState('');
  const box = useRef(null);
  useOutside(box, !!q, () => setQ(''));
  const L = s => String(s || '').toLowerCase();
  const s = q.toLowerCase().trim();
  const hits = !s ? [] : [
    ...Object.values(data.people).filter(p => L(p.name + ' ' + p.role + ' ' + p.skills.join(' ')).includes(s)).map(p => ['pp', p.id, p.name, t('Profile')]),
    ...data.briefs.filter(b => L(b.title).includes(s)).map(b => [b.status === 'draft' ? 'newbrief' : 'brief', b.id, b.title, t('Brief')]),
    ...data.deals.filter(x => x.side === mode && L(x.title).includes(s)).map(x => ['deal', x.id, x.title, t('Deal')]),
    ...data.opps.filter(o => mode === 'work' && L(o.title + ' ' + o.client).includes(s)).map(o => ['opp', o.id, o.title, t('Opportunity')]),
    ...data.threads.filter(th => th.mode === mode && L(th.name + ' ' + th.msgs.map(m => m.t).join(' ')).includes(s)).map(th => ['messages', th.id, tr(th.name), t('Messages')]),
    ...(['card', 'mastercard', 'top up', 'balance', 'freeze', 'kaart', 'карта'].some(k => k.startsWith(s) || s.startsWith(k)) ? [['card', '', t('AfterWorc card'), t('Money')]] : [])
  ].slice(0, 8);
  return (
    <div className="gsearch" ref={box}>
      <Ic n="search" s={15} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={mode === 'hire' ? t('Search checked specialists, briefs, deals…') : t('Search opportunities, deals, messages…')} autoComplete="off" aria-label={t('Search')} />
      {s && <div className="menu gres" style={{ left: 0, right: 'auto', top: 42, width: '100%' }}>
        {hits.length ? hits.map((h, i) => <button key={i} className="mi" onClick={() => { setQ(''); go(h[0], h[1]); }}><b style={{ fontWeight: 600 }}>{h[2]}</b><span className="muted tiny" style={{ marginLeft: 'auto' }}>{h[3]}</span></button>) : <div className="hd">{t('No results')}</div>}
      </div>}
    </div>
  );
}

function Shell() {
  const app = useApp();
  const { data, mode, route, go, menu, setMenu, toastMsg, online } = app;
  const c = counts(data, mode);
  const navOn = r => route === r || (r === 'briefs' && ['brief', 'newbrief'].includes(route)) || (r === 'deals' && route === 'deal') || (r === 'opps' && route === 'opp') || (r === 'money' && route === 'card');
  const cc = data.cards[mode];
  const nRef = useRef(null), aRef = useRef(null);
  useOutside(nRef, menu === 'notifs', () => setMenu(null));
  useOutside(aRef, menu === 'avatar', () => setMenu(null));
  const levelLabel = { checked: t('Checked in person'), verified: t('ID verified'), registered: t('Registered') };
  return (<>
    <header className="top"><div className="in">
      <button className="logo" onClick={() => go('home')} aria-label={t('AfterWorc home')}><span className="mk"><LogoMark /></span><span className="wm hide-m">afterwor<i>c</i></span></button>
      <div className="modesw" role="tablist" aria-label={t('Mode')}>
        <button className={mode === 'hire' ? 'on' : ''} role="tab" aria-selected={mode === 'hire'} onClick={() => app.setMode('hire')}><Ic n="team" s={15} />{t('Hiring')}</button>
        <button className={mode === 'work' ? 'on' : ''} role="tab" aria-selected={mode === 'work'} onClick={() => app.setMode('work')}><Ic n="task" s={15} />{t('Working')}</button>
      </div>
      <GlobalSearch />
      <div className="spacer" />
      <button className="btn g sm hide-m" onClick={() => go(mode === 'hire' ? 'newbrief' : 'profile')}><Ic n="plus" s={15} w={2.2} />{mode === 'hire' ? t('Start a brief') : t('Complete profile')}</button>
      {/* Header card: opens the card page when a card exists, otherwise Money */}
      <button className="walletchip" onClick={() => go(hasCard(cc) ? 'card' : 'money')} aria-label={`${mode === 'hire' ? t('Company balance') : t('Working balance')} ${eur(data.money[mode].available)}`}>
        <span className={'mc ' + (!hasCard(cc) ? 'nc' : mode === 'hire' ? 'co' : '')}>{!hasCard(cc) && <Ic n="plus" s={12} w={2.4} />}</span>
        <b>{eur(data.money[mode].available)}</b>{hasCard(cc) && <span className="muted">••{cc.last4}</span>}{cc.frozen && <span className="pill wait" style={{ padding: '0 6px' }}>{t('Frozen')}</span>}
      </button>
      <div style={{ position: 'relative' }} ref={nRef}>
        <button className="iconbtn" onClick={() => setMenu(menu === 'notifs' ? null : 'notifs')} aria-label={t('Notifications')} aria-expanded={menu === 'notifs'}><Ic n="bell" />{c.notifs > 0 && <span className="dot">{c.notifs}</span>}</button>
        {menu === 'notifs' && <NotifMenu />}
      </div>
      <button className="iconbtn hide-m" onClick={() => go('messages')} aria-label={t('Messages')}><Ic n="msg" />{c.messages > 0 && <span className="dot">{c.messages}</span>}</button>
      <div style={{ position: 'relative' }} ref={aRef}>
        <button className="avbtn" onClick={() => setMenu(menu === 'avatar' ? null : 'avatar')} aria-expanded={menu === 'avatar'} aria-haspopup="menu">
          <Avatar name={data.me.name} src={data.me.avatar} size="sm" />
          <span className="who"><b>{data.me.name}</b><span className="muted">{t('as')} {mode === 'hire' ? data.acting : t('specialist')}</span></span>
        </button>
        {menu === 'avatar' && <AvatarMenu />}
      </div>
    </div></header>
    {!online && <div className="offline" role="status">{t('Reconnecting…')}</div>}
    <div className="app">
      <aside className="side">
        {NAV[mode].map(([r, l, i]) => { const n = c[r] || 0; return <button key={r} className={'nav ' + (navOn(r) ? 'on' : '')} onClick={() => go(r)} aria-current={navOn(r) ? 'page' : undefined}><Ic n={i} /><span>{t(l)}</span>{n > 0 && <span className={'cnt ' + (r === 'deals' ? 'am' : '')}>{n}</span>}</button>; })}
        <div className="cta"><button className="btn g block" onClick={() => go(mode === 'hire' ? 'newbrief' : 'profile')}><Ic n="plus" s={15} w={2.2} />{mode === 'hire' ? t('Start a brief') : t('Edit profile')}</button></div>
        <div className="foot">{mode === 'hire'
          ? <>{t('Acting as')} <b>{data.acting}</b><br /><button className="btn link small" onClick={() => setMenu('avatar')}>{t('Switch')}</button></>
          : data.prof ? <>{t('Level')} · <b>{levelLabel[data.prof.level]}</b></> : t('Set up your profile')}</div>
      </aside>
      <main className="main" id="main">
        {data.me.status === 'hold' && <div className="statusbar" role="alert"><Ic n="lock" s={18} /><span><b>{t('Your account is on hold.')}</b> {data.me.statusNote ? tr(data.me.statusNote) : t('Payments and new work are paused. Message us to sort it out.')} <button className="btn link small" onClick={() => app.act('tech_open', { mode })}>{t('Contact support')}</button></span></div>}
        <View />
      </main>
    </div>
    <nav className="bottomnav">
      {NAV[mode].map(([r, l, i]) => { const n = c[r] || 0; return <button key={r} className={navOn(r) ? 'on' : ''} onClick={() => go(r)}><Ic n={i} s={20} /><span>{t(l)}</span>{n > 0 && <span className="cnt">{n}</span>}</button>; })}
    </nav>
    <Modals />
    {toastMsg && <div className="toast" role="status"><Ic n={toastMsg.err ? 'flag' : 'check'} s={16} w={2.4} />{toastMsg.text}</div>}
  </>);
}

export default function App() {
  const { data, error, toast } = useApp();
  if (error && !data) return <div className="loading">{tr(error)}</div>;
  if (!data) return <div className="loading">{t('Loading your account…')}</div>;
  return <CallProvider toast={toast}><Shell /></CallProvider>;
}
export { SealIc };
