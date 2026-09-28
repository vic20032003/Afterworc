'use strict';
const crypto = require('crypto');

const now = () => Date.now();
const DAY = 86400000, HOUR = 3600000;
const TZ = process.env.TZ_DISPLAY || 'Europe/Tallinn';

class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const bad = (msg, extra) => new HttpError(400, msg, extra);

function j(s, fallback) { try { return s == null ? fallback : JSON.parse(s); } catch { return fallback; } }

/* ---------- input validation ---------- */
function str(v, { max = 500, min = 0, name = 'value', trim = true } = {}) {
  if (v == null) v = '';
  if (typeof v !== 'string' && typeof v !== 'number') throw bad(`Invalid ${name}`);
  let s = String(v); if (trim) s = s.trim();
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (s.length < min) throw bad(min > 1 ? `${name} is too short` : `Enter ${name}`);
  if (s.length > max) throw bad(`${name} is too long (max ${max} characters)`);
  return s;
}
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
function email(v) {
  const s = str(v, { max: 254, name: 'e-mail' }).toLowerCase();
  if (!EMAIL_RE.test(s)) throw bad('Enter your e-mail address');
  return s;
}
function int(v, { min = 0, max = 1e9, name = 'amount' } = {}) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) throw bad(`Enter ${name}`);
  const r = Math.round(n);
  if (r < min || r > max) throw bad(`${name[0].toUpperCase() + name.slice(1)} must be between ${min} and ${max}`);
  return r;
}
function oneOf(v, list, name = 'value') { if (!list.includes(v)) throw bad(`Invalid ${name}`); return v; }

/* ---------- crypto helpers ---------- */
const randToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  try {
    const [alg, saltHex, hashHex] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
  } catch { return false; }
}

/* ---------- TOTP (RFC 6238) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function b32decode(s) {
  s = s.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0, val = 0; const out = [];
  for (const c of s) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
const newTotpSecret = () => b32encode(crypto.randomBytes(20));
function totpAt(secret, counter) {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1e6).toString().padStart(6, '0');
  return code;
}
function totpVerify(secret, code, t = now()) {
  if (!secret) return false;
  code = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const c = Math.floor(t / 30000);
  for (const d of [-1, 0, 1]) if (crypto.timingSafeEqual(Buffer.from(totpAt(secret, c + d)), Buffer.from(code))) return c + d;
  return false;
}
/* Failure gates: count only failed attempts, block after max failures in the window. */
const fails = new Map();
function gateCheck(key, max) { const b = fails.get(key); if (b && b.reset > now() && b.n >= max) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.'); }
function gateFail(key, windowMs) { let b = fails.get(key); if (!b || b.reset < now()) { b = { n: 0, reset: now() + windowMs }; fails.set(key, b); } b.n++; }
const gateClear = key => fails.delete(key);
setInterval(() => { const t = now(); for (const [k, b] of fails) if (b.reset < t) fails.delete(k); }, 60000).unref();
/* At most 5 wrong codes per 15 minutes per user; with once=true (log-in) each code works only once. */
const lastTotp = new Map();
function totpCheck(userId, secret, code, once = false) {
  const key = 'totp:' + userId;
  gateCheck(key, 5);
  const c = totpVerify(secret, code);
  if (c === false || (once && c <= (lastTotp.get(userId) ?? -1))) { gateFail(key, 15 * 60000); return false; }
  if (once) lastTotp.set(userId, c);
  gateClear(key);
  return true;
}

/* ---------- rate limiting (in memory, per key) ---------- */
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const t = now(); let b = buckets.get(key);
  if (!b || b.reset < t) { b = { n: 0, reset: t + windowMs }; buckets.set(key, b); }
  b.n++;
  if (b.n > max) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
}
setInterval(() => { const t = now(); for (const [k, b] of buckets) if (b.reset < t) buckets.delete(k); }, 60000).unref();

/* ---------- formatting ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };
const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
function parts(t) {
  const o = {}; for (const p of partsFmt.formatToParts(new Date(t))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month - 1, d: +o.day, wd: WD[o.weekday] || o.weekday, hm: `${o.hour === '24' ? '00' : o.hour}:${o.minute}` };
}
const fmtDay = t => { const p = parts(t); return `${p.d} ${MON[p.m]}`; };                 // 24 Sep
const fmtDayW = t => { const p = parts(t); return `${p.wd} ${p.d} ${MON[p.m]}`; };        // Thu 24 Sep
const fmtDayTime = t => `${fmtDayW(t)}, ${parts(t).hm}`;                                  // Thu 24 Sep, 10:14
const fmtDate = t => { const p = parts(t); return `${p.d} ${MON[p.m]} ${p.y}`; };         // 24 Sep 2026
const fmt = (t, o) => o.weekday ? parts(t).wd : parts(t).hm;
function fmtAgo(t) {
  const d = now() - t;
  if (d < 60000) return 'now';
  if (d < HOUR) return Math.floor(d / 60000) + ' min';
  if (d < DAY && fmtDay(t) === fmtDay(now())) return parts(t).hm;
  if (d < 6 * DAY) return parts(t).wd + ' ' + parts(t).hm;
  return fmtDay(t);
}
function inDays(t) { const d = Math.ceil((t - now()) / DAY); return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`; }
const eur = n => '€' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const htmlEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = {
  now, DAY, HOUR, HttpError, bad, j, str, email, int, oneOf, randToken, sha256,
  hashPassword, verifyPassword, newTotpSecret, totpVerify, totpCheck, totpAt, rateLimit, gateCheck, gateFail, gateClear,
  fmtDay, fmtDayW, fmtDayTime, fmtDate, fmtAgo, inDays, eur, initials, htmlEsc
};
