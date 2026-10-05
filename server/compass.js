'use strict';
/* Tells Compass (the team's operations app) about a new sign-up, a new brief and a profile sent for review, the moment they
   happen, so every founder gets a notification and it leads their day. Set COMPASS_HOOK_URL (https://compass.afterworc.com/api/platform/hook)
   and COMPASS_HOOK_KEY (the same value as PLATFORM_HOOK_KEY on the Compass server). Without them nothing is sent.
   Fire-and-forget: it never blocks or fails a request. No passwords, documents or payment data are sent. */
const { all } = require('./domain');
const { BASE_URL } = require('./mail');

const URL_ = process.env.COMPASS_HOOK_URL || '';
const KEY = process.env.COMPASS_HOOK_KEY || '';
const ADMIN = BASE_URL + '/admin';
const iso = ms => new Date(ms || Date.now()).toISOString();

function post(events) {
  if (!URL_ || !KEY || !/^(https:\/\/|http:\/\/127\.0\.0\.1[:/])/.test(URL_) || !events.length) return;   // https only (a local test server aside)
  fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AW-Hook-Key': KEY }, body: JSON.stringify({ events }), signal: AbortSignal.timeout(8000) })
    .catch(e => console.warn('compass hook:', e.name));
}

const signup = u => ({ type: 'signup', id: u.id, name: u.name, email: u.email, role: u.role_pref, at: iso(u.created_at), url: ADMIN });
const brief = (b, who, email, typel) => ({ type: 'brief', id: b.id, title: b.title, who, email, kind: typel || b.type, area: b.area, people: String(b.people || ''),
  budget: b.budget, start: b.start, text: String(b.descr || '').slice(0, 600), at: iso(b.sent_at), url: ADMIN });
const profile = (s, email) => ({ type: 'profile', id: s.id, name: s.name, email, at: iso(s.submitted_at), url: ADMIN });

/** On start: the last 3 days again (Compass keeps each event once), so nothing is lost while either side was down. */
function backfill() {
  if (!URL_ || !KEY) return;
  try {
    const since = Date.now() - 3 * 86400000;
    const ev = [
      ...all('SELECT id, name, email, role_pref, created_at FROM users WHERE created_at>? AND is_admin=0', since).map(signup),
      ...all("SELECT b.*, u.email FROM briefs b JOIN users u ON u.id=b.user_id WHERE b.status!='draft' AND b.sent_at>?", since).map(b => brief(b, b.signed_as, b.email)),
      ...all('SELECT s.*, u.email FROM specialists s JOIN users u ON u.id=s.user_id WHERE s.submitted_at>?', since).map(s => profile(s, s.email))
    ];
    post(ev);
  } catch (e) { console.warn('compass backfill:', e.message); }
}

module.exports = { signup: u => post([signup(u)]), brief: (b, who, email, typel) => post([brief(b, who, email, typel)]), profile: (s, email) => post([profile(s, email)]), backfill };
