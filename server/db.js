'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'afterworc.db');
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role_pref TEXT NOT NULL DEFAULT 'hire',
  email_verified INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  totp_secret TEXT,
  totp_pending TEXT,
  news_optin INTEGER NOT NULL DEFAULT 0,
  acting_org_id INTEGER,
  prefs TEXT NOT NULL DEFAULT '{}',
  tax TEXT NOT NULL DEFAULT '{}',
  verify TEXT NOT NULL DEFAULT '{}',
  terms_accepted_at INTEGER,
  password_changed_at INTEGER,
  closed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ua TEXT, ip TEXT
);
CREATE TABLE IF NOT EXISTS tokens (
  hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  data TEXT,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS orgs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Estonia',
  vat TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS org_members (
  org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Owner',
  PRIMARY KEY (org_id, user_id)
);
CREATE TABLE IF NOT EXISTS org_invites (
  id INTEGER PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  accepted_at INTEGER
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  email TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unconfirmed',
  code_hash TEXT,
  code_tries INTEGER NOT NULL DEFAULT 0,
  staff_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER
);
CREATE TABLE IF NOT EXISTS specialists (
  id TEXT PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  area TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  rate INTEGER,
  monthly INTEGER,
  level TEXT NOT NULL DEFAULT 'registered',
  avail TEXT NOT NULL DEFAULT 'Available now',
  available_now INTEGER NOT NULL DEFAULT 1,
  city TEXT NOT NULL DEFAULT '',
  langs TEXT NOT NULL DEFAULT 'EN',
  deals INTEGER NOT NULL DEFAULT 0,
  rating REAL,
  bio TEXT NOT NULL DEFAULT '',
  checked_by TEXT,
  checked_on TEXT,
  history TEXT NOT NULL DEFAULT '[]',
  published INTEGER NOT NULL DEFAULT 0,
  profile TEXT NOT NULL DEFAULT '{}',
  submitted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS briefs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signed_as TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  area TEXT NOT NULL,
  people TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  start TEXT NOT NULL DEFAULT '',
  descr TEXT NOT NULL DEFAULT '',
  options TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  matcher_name TEXT,
  matcher_role TEXT,
  shortlist TEXT NOT NULL DEFAULT '[]',
  why TEXT NOT NULL DEFAULT '{}',
  sent_at INTEGER,
  ready_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS opps (
  id INTEGER PRIMARY KEY,
  specialist_id TEXT NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  brief_id INTEGER REFERENCES briefs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'Matched',
  budget TEXT NOT NULL DEFAULT '',
  descr TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  due_at INTEGER,
  proposal TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY,
  client_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  specialist_id TEXT NOT NULL REFERENCES specialists(id),
  brief_id INTEGER REFERENCES briefs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'milestones',
  monthly INTEGER,
  team TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'proposed',
  start_date TEXT NOT NULL DEFAULT '',
  review TEXT,
  review_data TEXT,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  delivery_note TEXT NOT NULL DEFAULT '',
  change_note TEXT NOT NULL DEFAULT '',
  files TEXT NOT NULL DEFAULT '[]',
  funded_at INTEGER, delivered_at INTEGER, released_at INTEGER
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  week TEXT NOT NULL,
  hours INTEGER NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'review',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'support',
  peer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  specialist_id TEXT REFERENCES specialists(id) ON DELETE SET NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  peer_title TEXT NOT NULL DEFAULT '',
  sub TEXT NOT NULL DEFAULT '',
  user_unread INTEGER NOT NULL DEFAULT 0,
  peer_unread INTEGER NOT NULL DEFAULT 0,
  staff_unread INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  sender_user_id INTEGER,
  sender_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  sub TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT 'home',
  param TEXT,
  unread INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS balances (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 0,
  held INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mode)
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  descr TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_to TEXT NOT NULL,
  descr TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (user_id, mode)
);
CREATE TABLE IF NOT EXISTS card_tx (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  descr TEXT NOT NULL,
  channel TEXT NOT NULL,
  amount INTEGER NOT NULL,
  receipt_file INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  deal_id INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  with_name TEXT NOT NULL,
  slot TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_briefs_user ON briefs(user_id);
CREATE INDEX IF NOT EXISTS ix_deals_client ON deals(client_user_id);
CREATE INDEX IF NOT EXISTS ix_deals_spec ON deals(specialist_id);
CREATE INDEX IF NOT EXISTS ix_ms_deal ON milestones(deal_id);
CREATE INDEX IF NOT EXISTS ix_threads_user ON threads(user_id);
CREATE INDEX IF NOT EXISTS ix_threads_peer ON threads(peer_user_id);
CREATE INDEX IF NOT EXISTS ix_msgs_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS ix_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_tx_user ON transactions(user_id, mode);
CREATE INDEX IF NOT EXISTS ix_opps_spec ON opps(specialist_id);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions(user_id);
`);

module.exports = { db, DATA_DIR };
