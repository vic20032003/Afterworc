'use strict';
/* Captures the demo account, the staff overview and the directory from a fresh server, for the clickable demo build. */
const fs = require('fs'), os = require('os'), path = require('path');
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-demo-'));
process.env.SEED_DEMO = '1';
const QRCode = require('qrcode');
const { createServer } = require('../server/index');

(async () => {
  const server = createServer().listen(0); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (email, password) => {
    const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afterworc' }, body: JSON.stringify({ email, password, client: 'app' }) });
    return (await r.json()).token;
  };
  const get = async (p, token) => (await fetch(base + p, { headers: token ? { Authorization: 'Bearer ' + token } : {} })).json();
  const demo = await login('demo@afterworc.com', 'afterworc-demo');
  const staff = await login('admin@afterworc.local', 'afterworc-admin');
  const state = await get('/api/account/state', demo);
  state.me.admin = true; // the demo visitor can open the staff console too
  state.sessions = [{ id: 'demo-session-1', current: true, ua: 'This browser', ip: '', seen: 'now' }];
  const specialists = await get('/api/specialists');
  const snapshot = {
    capturedAt: new Date().toISOString(), state, specialists,
    skills: await get('/api/skills'),
    admin: await get('/api/admin/overview', staff),
    qr: await QRCode.toString('otpauth://totp/AfterWorc:demo@afterworc.com?secret=JBSWY3DPEHPK3PXP&issuer=AfterWorc', { type: 'svg', margin: 1, width: 180 })
  };
  const out = path.join(__dirname, '..', 'client', 'src', 'demo', 'snapshot.json');
  fs.writeFileSync(out, JSON.stringify(snapshot));
  console.log('snapshot', (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
  server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
