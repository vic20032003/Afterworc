/* Account state: server data, hash routing (#/hire/deal/12), actions, modals, toasts, language and live updates. */
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { api } from '../shared/api.js';
import { socket } from '../shared/socket.js';
import { setLang, detectLang, t, tr } from '../shared/i18n.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch { return x; } });
  const mode = h[0] === 'hire' || h[0] === 'work' ? h[0] : null;
  return { mode, route: (mode ? h[1] : null) || 'home', param: (mode ? h[2] : null) || null };
}

export function Provider({ children }) {
  const first = parseHash();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(first.mode || 'hire');
  const [route, setRoute] = useState(first.route);
  const [param, setParam] = useState(first.param);
  const [tab, setTab] = useState(first.route === 'settings' ? first.param : null);
  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(null);
  const [toastMsg, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lang, setLangState] = useState(() => { const l = detectLang(); setLang(l); return l; });
  const [online, setOnline] = useState(true);
  const [typing, setTyping] = useState({});
  const [reveal, setReveal] = useState(null);
  const [wizSeed, setWizSeed] = useState(null); // preset for the brief wizard ("Start something new")
  const busyRef = useRef(false);
  const toastTimer = useRef(null);
  const modeRef = useRef(mode); modeRef.current = mode;

  const toast = useCallback((text, err) => {
    setToast({ text: tr(text), err: !!err });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), err ? 4500 : 3200);
  }, []);

  const go = useCallback((r, p, tb, { m, replace } = {}) => {
    const md = m || modeRef.current;
    const pp = p == null || p === '' ? null : String(p);
    setRoute(r); setParam(pp); setTab(r === 'settings' ? (pp || tb || null) : (tb || null)); setMenu(null); setModal(null);
    if (m) setMode(m);
    const h = '#/' + md + '/' + r + (pp ? '/' + encodeURIComponent(pp) : '');
    if (location.hash !== h) (replace ? history.replaceState : history.pushState).call(history, null, '', h);
    window.scrollTo({ top: 0 });
  }, []);

  const refresh = useCallback(async () => {
    try { const d = await api('/account/state'); setData(d); return d; } catch (e) { if (!data) setError(e.message); return null; }
  }, [data]);

  /** Run an account action; the response carries the new state. */
  const act = useCallback(async (type, payload = {}, { keepModal = false, quiet = false } = {}) => {
    if (busyRef.current) return null;
    busyRef.current = true; if (!quiet) setBusy(true);
    try {
      const r = await api('/account/action', { mode: modeRef.current, ...payload, type });
      if (r.logout) { location.href = '/'; return r; }
      if (r.redirect) { location.href = r.redirect; return r; }
      if (r.state) setData(r.state);
      if (!keepModal) setModal(null);
      if (r.go) go(r.go[0], r.go[1], r.go[2]);
      if (r.toast) toast(r.toast);
      return r;
    } catch (e) {
      if (e.data && e.data.need2fa && data && !data.twofa) { setModal({ k: 'need2fa' }); return null; }
      toast(e.message, true);
      return null;
    } finally { busyRef.current = false; setBusy(false); }
  }, [go, toast, data]);

  const changeLang = useCallback(l => {
    setLang(l); setLangState(l); setMenu(null);
    api('/account/action', { type: 'lang_set', lang: l }).catch(() => {});
  }, []);

  // First load
  useEffect(() => {
    (async () => {
      const d = await refresh();
      if (!d) return;
      if (!first.mode) { const m = d.me.rolePref === 'work' ? 'work' : 'hire'; setMode(m); history.replaceState(null, '', '#/' + m + '/' + (first.route || 'home')); }
      // A language chosen on another device wins over the browser default, unless this browser already chose one.
      let stored = null; try { stored = localStorage.getItem('aw-lang'); } catch { /* blocked */ }
      if (d.me.lang && !stored) { setLang(d.me.lang); setLangState(d.me.lang); }
      if (new URLSearchParams(location.search).has('paid')) { history.replaceState(null, '', '/app' + location.hash); toast('Payment received. Your balance updates as soon as the bank confirms it'); }
    })();
    const onPop = () => { const h = parseHash(); if (h.mode) setMode(h.mode); setRoute(h.route); setParam(h.param); setTab(h.route === 'settings' ? h.param : null); setModal(null); setMenu(null); };
    addEventListener('popstate', onPop);
    addEventListener('hashchange', onPop);
    return () => { removeEventListener('popstate', onPop); removeEventListener('hashchange', onPop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates: the server pushes "sync" when something changed; refetch at most every 700 ms.
  useEffect(() => {
    socket.start();
    let pending = null;
    const off = socket.on(m => {
      if (m.t === 'sync' || m.t === 'thread') { if (!pending) pending = setTimeout(() => { pending = null; refreshRef.current(); }, 250); }
      if (m.t === 'typing') {
        setTyping(x => ({ ...x, [m.threadId]: { name: m.name, until: Date.now() + 4000 } }));
        setTimeout(() => setTyping(x => { const y = { ...x }; if (y[m.threadId] && y[m.threadId].until <= Date.now()) delete y[m.threadId]; return y; }), 4200);
      }
    });
    const offS = socket.onStatus(v => { setOnline(v); if (v) refreshRef.current(); });
    // Fallback when the socket is down (proxies without WebSocket support).
    const poll = setInterval(() => { if (!socket.online && !document.hidden) refreshRef.current(); }, 30000);
    return () => { off(); offS(); clearInterval(poll); };
  }, []);
  const refreshRef = useRef(refresh); refreshRef.current = refresh;

  const value = useMemo(() => ({
    data, error, mode, route, param, tab, setTab, modal, setModal, menu, setMenu, toast, toastMsg, busy, go, act, refresh, lang, changeLang, online, typing, reveal, setReveal,
    wizSeed, startBrief: type => { setWizSeed({ type, n: Date.now() }); go('newbrief'); },
    setMode: m => { if (m === mode) return; setMode(m); act('mode', { mode: m }, { quiet: true }); go('home', null, null, { m }); }
  }), [data, error, mode, route, param, tab, modal, menu, toast, toastMsg, busy, go, act, refresh, lang, changeLang, online, typing, reveal, wizSeed]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- helpers used across views ---------- */
export const initials = n => String(n || '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
export const firstName = n => String(n || '').split(/\s+/)[0];
export function person(data, id) {
  return (data && Object.hasOwn(data.people, id) && data.people[id]) || { id, name: t('Specialist'), role: '', lv: 'registered', skills: [], deals: 0, rating: null, avail: '', city: '' };
}
export function needsMe(d) {
  if (d.side === 'hire') return d.ms.some(x => x.st === 'delivered') || !!(d.reports && d.reports.some(r => r.st === 'review')) || (d.status === 'done' && d.review === 'pending');
  return d.status === 'proposed' || d.ms.some(x => ['inprogress', 'changes'].includes(x.st));
}
export function counts(data, mode) {
  return {
    briefs: data.briefs.filter(b => b.status === 'shortlist').length,
    deals: data.deals.filter(x => x.side === mode && needsMe(x)).length,
    messages: data.threads.filter(th => th.mode === mode && th.unread).length,
    opps: data.opps.filter(o => o.status === 'invited' || o.status === 'new').length,
    notifs: data.notifs.filter(n => n.mode === mode && n.unread).length
  };
}
/** The card exists (issued), whatever its state: then "Get my card" is never offered. */
export const hasCard = c => !!c && c.st === 'active';
