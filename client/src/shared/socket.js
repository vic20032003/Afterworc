/* One WebSocket per tab to /ws, reconnecting with backoff. Listeners get every server message. */
const listeners = new Set();
const statusListeners = new Set();
let ws = null, tries = 0, timer = null, wanted = false, online = false;

function setOnline(v) { if (online !== v) { online = v; statusListeners.forEach(f => f(v)); } }
function open() {
  clearTimeout(timer);
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  try { ws = new WebSocket(url); } catch { return retry(); }
  ws.onopen = () => { tries = 0; setOnline(true); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } listeners.forEach(f => { try { f(m); } catch (err) { console.error(err); } }); };
  ws.onclose = ev => { setOnline(false); ws = null; if (ev.code === 4001) { location.href = '/#login'; return; } retry(); };
  ws.onerror = () => { try { ws && ws.close(); } catch { /* ignore */ } };
}
function retry() { if (!wanted) return; tries++; timer = setTimeout(open, Math.min(30000, 800 * 2 ** Math.min(tries, 6))); }

export const socket = {
  start() { if (wanted) return; wanted = true; open(); setInterval(() => socket.send({ t: 'ping' }), 25000); },
  send(msg) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(msg)); return true; } return false; },
  on(f) { listeners.add(f); return () => listeners.delete(f); },
  onStatus(f) { statusListeners.add(f); return () => statusListeners.delete(f); },
  get online() { return online; }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && wanted && !ws) open(); });
