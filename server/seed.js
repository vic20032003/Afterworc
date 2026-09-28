'use strict';
/* First-run data: the specialist directory, a staff account and (optionally) a demo account. */
const { db } = require('./db');
const U = require('./util');
const D = require('./domain');
const { now, DAY, HOUR } = U;
const { one, run } = D;

const PROD = process.env.NODE_ENV === 'production';

const DIRECTORY = [
  { id: 'mk', name: 'Mart Kask', role: 'Senior Backend Engineer', area: 'Development', skills: ['Go', 'PostgreSQL', 'Kubernetes', 'gRPC'], rate: 62, level: 'checked', avail: 'From 1 Oct', now: 0, deals: 9, rating: 5.0, city: 'Tallinn', langs: 'EN · ET', bio: 'Backend engineer, payments and high-load APIs. Ex-lead at a Nordic scale-up.', by: 'Anna R.', on: 'Sep 2026', history: [['Client portal, milestone 2', 1600], ['Performance review', 900], ['Integration fixes', 600]] },
  { id: 'ep', name: 'Eva Pärn', role: 'Payments Operations Lead · EMI / PSP', area: 'Payments', skills: ['Payment operations', 'Reconciliation', 'SEPA', 'Card schemes'], rate: 65, level: 'checked', avail: 'Available now', now: 1, deals: 8, rating: 4.9, city: 'Tallinn', langs: 'EN · ET · RU', bio: 'Ran payment operations for an Estonian EMI: SEPA and card flows, reconciliation, safeguarding and scheme reporting.', by: 'Anna R.', on: 'Sep 2026', history: [['Reconciliation set-up for a PSP', 2400], ['Chargeback process', 1500]] },
  { id: 'ai', name: 'Artur Ivanov', role: 'AML & Compliance Analyst', area: 'Payments', skills: ['AML', 'KYC', 'Transaction monitoring', 'PSD2'], rate: 52, level: 'checked', avail: 'From 12 Oct', now: 0, deals: 5, rating: 4.8, city: 'Tallinn', langs: 'EN · RU · ET', bio: 'AML/KYC analyst for fintechs and EMIs. Onboarding reviews, monitoring rules and FIU reporting.', by: 'Anna R.', on: 'Aug 2026', history: [['KYC backlog clean-up', 1800], ['Monitoring rules review', 1200]] },
  { id: 'lt', name: 'Liis Tamm', role: 'Senior UI/UX Designer', area: 'Design', skills: ['Figma', 'Design systems', 'SaaS', 'User research'], rate: 48, level: 'checked', avail: 'Available now', now: 1, deals: 14, rating: 4.9, city: 'Tartu', langs: 'EN · ET', bio: 'Product designer for B2B SaaS. 9 years; led design systems for two Baltic fintechs.', by: 'Anna R.', on: 'Aug 2026', history: [['Landing redesign, wireframes', 400], ['Design system audit', 1800], ['Onboarding flow', 1200]] },
  { id: 'js', name: 'Jelena Sokolova', role: 'Backend + DevOps Engineer', area: 'Development', skills: ['Java', 'Spring', 'AWS', 'Terraform'], rate: 58, level: 'checked', avail: 'Available now', now: 1, deals: 11, rating: 4.8, city: 'Tallinn', langs: 'EN · RU · ET', bio: 'Builds and runs B2B platforms end to end. AWS certified.', by: 'Anna R.', on: 'Sep 2026', history: [['AWS migration', 4200], ['CI/CD pipeline', 1500]] },
  { id: 'km', name: 'Kadri Mets', role: 'Marketing Lead', area: 'Marketing', skills: ['B2B', 'LinkedIn Ads', 'Content', 'Team lead'], rate: 45, level: 'checked', avail: 'Available now', now: 1, deals: 6, rating: 4.9, city: 'Tallinn', langs: 'EN · ET', bio: 'Leads marketing departments for B2B SaaS companies: growth, paid social and content.', by: 'Victor B.', on: 'Aug 2026', history: [['Marketing department, month 1', 12000]] },
  { id: 'rv', name: 'Rasmus Vaher', role: 'Payments Integration Developer', area: 'Development', skills: ['Node.js', 'Stripe', 'APIs', 'Webhooks'], rate: 55, level: 'verified', avail: 'Available now', now: 1, deals: 3, rating: 5.0, city: 'Pärnu', langs: 'EN · ET', bio: 'Integrations for e-commerce and fintech.', history: [['Payment API integration', 900]] },
  { id: 'kk', name: 'Karl Kivi', role: 'DevOps Engineer', area: 'Data & Infrastructure', skills: ['Terraform', 'GCP', 'CI/CD'], rate: 60, level: 'checked', avail: 'From 13 Oct', now: 0, deals: 7, rating: 4.8, city: 'Tallinn', langs: 'EN · ET', bio: 'Cloud infrastructure, cost reviews and reliable deployments.', by: 'Anna R.', on: 'Jul 2026', history: [['GCP cost review', 1100]] },
  { id: 'al', name: 'Anu Lepik', role: 'QA Automation Engineer', area: 'Quality & Security', skills: ['Playwright', 'Cypress', 'API tests'], rate: 42, level: 'verified', avail: 'Available now', now: 1, deals: 4, rating: 4.7, city: 'Narva', langs: 'EN · RU · ET', bio: 'Test automation for web apps and APIs.', history: [['E2E test suite', 1400]] },
  { id: 'to', name: 'Triin Org', role: 'Content Writer', area: 'Content', skills: ['B2B copy', 'SEO', 'Estonian'], rate: 35, level: 'verified', avail: 'From 6 Oct', now: 0, deals: 2, rating: 5.0, city: 'Viljandi', langs: 'EN · ET', bio: 'B2B copy and SEO content in English and Estonian.', history: [['Website copy', 700]] },
  { id: 'north', name: 'Team North', role: 'Ready team · Lead + 2 devs + QA', area: 'Development', skills: ['Go', 'React', 'QA automation', 'Delivery lead'], rate: null, monthly: 19400, level: 'checked', avail: 'From 15 Oct', now: 0, deals: 6, rating: 4.9, city: 'Tallinn / remote EU', langs: 'EN · ET', bio: 'Four people who have shipped together for 3 years. One lead, one invoice.', by: 'Anna R.', on: 'Jul 2026', history: [['Logistics client portal', 38800]] }
];

function seedDirectory() {
  if (one('SELECT COUNT(*) n FROM specialists').n) return;
  const ins = db.prepare(`INSERT INTO specialists (id, name, role, area, skills, rate, monthly, level, avail, available_now, city, langs, deals, rating, bio, checked_by, checked_on, history, published, created_at)
    VALUES (@id,@name,@role,@area,@skills,@rate,@monthly,@level,@avail,@now,@city,@langs,@deals,@rating,@bio,@by,@on,@history,1,@t)`);
  D.tx(() => DIRECTORY.forEach(s => ins.run({ monthly: null, by: null, on: null, ...s, skills: JSON.stringify(s.skills), history: JSON.stringify(s.history.map(([t, a]) => ({ t, a }))), t: now() })))();
}

function upsertUser(email, pw, name, extra = {}) {
  let u = one('SELECT * FROM users WHERE email=?', email);
  if (!u) {
    const id = run('INSERT INTO users (email, pass_hash, name, role_pref, email_verified, is_admin, terms_accepted_at, created_at) VALUES (?,?,?,?,1,?,?,?)',
      email, U.hashPassword(pw), name, extra.role || 'hire', extra.admin ? 1 : 0, now(), now()).lastInsertRowid;
    D.ensureUserSetup(id);
    u = D.userById(id); u.created = true;
  }
  return u;
}

function seedAdmin() {
  let email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) {
    if (PROD || one('SELECT 1 FROM users WHERE is_admin=1')) return;
    email = 'admin@afterworc.local'; pw = 'afterworc-admin';
  }
  const u = upsertUser(email.toLowerCase(), pw, 'AfterWorc Staff', { admin: true });
  if (!u.is_admin) run('UPDATE users SET is_admin=1 WHERE id=?', u.id);
  if (u.created) console.log(`[seed] staff account: ${email}${process.env.ADMIN_PASSWORD ? '' : ' / ' + pw}`);
}

/* A realistic demo account (both modes) so the product can be tried end to end right away. */
function seedDemo() {
  if (process.env.SEED_DEMO === '0' || (PROD && process.env.SEED_DEMO !== '1')) return;
  const email = 'demo@afterworc.com';
  if (one('SELECT 1 FROM users WHERE email=?', email)) return;
  const pw = process.env.DEMO_PASSWORD || 'afterworc-demo';
  const t = now();
  D.tx(() => {
    const u = upsertUser(email, pw, 'Vic Bir');
    const uid = u.id;
    const org = run('INSERT INTO orgs (name, country, vat, created_by, created_at) VALUES (?,?,?,?,?)', 'switchbit OÜ', 'Estonia', 'EE102345678', uid, t).lastInsertRowid;
    run("INSERT INTO org_members (org_id, user_id, role) VALUES (?,?,'Owner')", org, uid);
    run('UPDATE users SET acting_org_id=? WHERE id=?', org, uid);
    run('UPDATE users SET verify=?, tax=? WHERE id=?', JSON.stringify({ id: { st: 'done', sub: 'Done 21 Sep' }, skills: { st: 'done', sub: 'Passed · 86%' }, refs: { st: 'done', sub: '2 of 2 confirmed' }, interview: { sub: 'Book a time for your interview' } }),
      JSON.stringify({ country: 'Estonia', invoicesTo: email, holder: 'Victor Birjukov', iban: 'EE382200221020145685' }), uid);
    const A = 'switchbit OÜ';

    // Briefs
    const brief = (title, type, area, budget, start, status, descr, sentAgo, extra = {}) => run(
      'INSERT INTO briefs (user_id, signed_as, title, type, area, people, budget, start, descr, status, matcher_name, matcher_role, shortlist, why, sent_at, ready_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      uid, A, title, type, area, extra.people || '', budget, start, descr, status, 'Anna R.', 'Lead Tech Architect, AfterWorc', JSON.stringify(extra.sl || []), JSON.stringify(extra.why || {}),
      sentAgo == null ? null : t - sentAgo, extra.ready ? t - extra.ready : null, t - (sentAgo || 0)).lastInsertRowid;
    const b1 = brief('Backend team for B2B client portal', 'team', 'Development', '€8–12k / mo', 'Within 2 weeks', 'shortlist', 'We need 3–4 backend people to build a client portal on top of our existing Go services. Long-term, 3+ months.', 50 * HOUR,
      { people: '1× Team Lead, 2× Senior Developer, 1× QA Engineer', sl: ['north', 'mk', 'js'], ready: 24 * HOUR, why: { north: 'Built a near-identical portal for a logistics client; Go + React; one lead, one invoice.', mk: 'Go + PostgreSQL specialist; payments background; can lead backend.', js: 'Java/AWS + DevOps; strongest on infrastructure if you move to AWS.' } });
    brief('Landing page redesign for product launch', 'task', 'Design', '€1–5k', 'As soon as possible', 'matching', 'New landing for our November launch: hero, pricing, sign-up flow.', 20 * HOUR, { people: 'UI/UX Designer' });
    run("INSERT INTO briefs (user_id, signed_as, title, type, area, budget, start, descr, status, created_at) VALUES (?,?,?,?,?,?,?,?, 'draft', ?)", uid, A, 'SEO audit of company website', 'task', 'Marketing', '', 'Just exploring', 'Audit of our website SEO.', t - 3 * DAY);
    const b4 = brief('Marketing department (4 people)', 'dept', 'Marketing', '€10–20k / mo', 'Started 1 Sep', 'hired', 'Full marketing function: lead, SMM, content, performance.', 40 * DAY, { people: '1× Marketing Lead, 1× SMM Manager, 1× Content Writer, 1× Performance Marketer', sl: ['km'], ready: 38 * DAY });

    // Deals (hiring side)
    const deal = (spec, title, model, kind, status, extra = {}) => run('INSERT INTO deals (client_user_id, client_name, specialist_id, brief_id, title, model, kind, monthly, team, status, start_date, review, created_at, closed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      extra.client === undefined ? uid : extra.client, extra.clientName || A, spec, extra.brief || null, title, model, kind, extra.monthly || null, JSON.stringify(extra.team || []), status, extra.start || '', extra.review || null, t - (extra.ago || 20 * DAY), extra.closed ? t - extra.closed : null).lastInsertRowid;
    const ms = (d, idx, name, amount, status, x = {}) => run('INSERT INTO milestones (deal_id, idx, name, amount, status, funded_at, delivered_at, released_at, delivery_note) VALUES (?,?,?,?,?,?,?,?,?)', d, idx, name, amount, status, x.f ? t - x.f : null, x.d ? t - x.d : null, x.r ? t - x.r : null, x.note || '');
    const d1 = deal('lt', 'Landing redesign v1', 'Fixed price', 'milestones', 'active', { ago: 18 * DAY });
    ms(d1, 0, 'Wireframes', 400, 'released', { f: 17 * DAY, d: 13 * DAY, r: 12 * DAY }); ms(d1, 1, 'UI design (desktop + mobile)', 500, 'delivered', { f: 11 * DAY, d: 2 * DAY, note: 'Figma file and mobile flows attached. Happy to walk you through on a call.' }); ms(d1, 2, 'Developer handoff', 300, 'unfunded');
    const d2 = deal('km', 'Marketing department', 'Monthly · department', 'dept', 'active', { monthly: 12000, team: ['km', 'SMM Manager', 'Content Writer', 'Performance Marketer'], brief: b4, start: '1 Sep 2026', ago: 30 * DAY });
    ms(d2, 0, 'September', 12000, 'inprogress', { f: 28 * DAY }); ms(d2, 1, 'October', 12000, 'unfunded'); ms(d2, 2, 'November', 12000, 'unfunded');
    run("INSERT INTO reports (deal_id, week, hours, summary, status, created_at) VALUES (?,?,?,?, 'approved', ?)", d2, 'Week 37 · 7–13 Sep', 148, 'Brand audit, channel plan, content calendar for October.', t - 10 * DAY);
    run("INSERT INTO reports (deal_id, week, hours, summary, status, created_at) VALUES (?,?,?,?, 'review', ?)", d2, 'Week 38 · 14–20 Sep', 152, 'Campaign "Hiring Math" live on 4 channels; 3 landing variants in test; 41 demo requests.', t - 3 * DAY);
    const d3 = deal('rv', 'Payment API integration', 'Fixed price', 'milestones', 'done', { review: 'pending', ago: 25 * DAY, closed: 8 * DAY });
    ms(d3, 0, 'Integration + tests', 900, 'released', { f: 24 * DAY, d: 10 * DAY, r: 8 * DAY });

    // Working side: the demo user is also a specialist
    const s = D.mySpecialist(uid, true);
    run("UPDATE specialists SET name='Vic Bir', role='Senior Go developer, fintech & B2B', area='Development', skills=?, rate=55, avail='From 1 Oct', available_now=0, city='Tallinn', langs='EN · ET · RU', bio=?, level='verified', profile=?, submitted_at=? WHERE id=?",
      JSON.stringify(['Go', 'PostgreSQL', 'Docker']), 'Backend engineer, 10 years. Payments, logistics, high-load APIs.', JSON.stringify({ headline: 'Senior Go developer, fintech & B2B', profession: 'Backend Developer', about: 'Backend engineer, 10 years. Payments, logistics, high-load APIs.', hours: 30, portfolio: 'https://github.com/' }), t, s.id);
    const w1 = deal(s.id, 'Go microservice for invoice matching', 'Fixed price', 'milestones', 'active', { client: null, clientName: 'Northwind Logistics OÜ', ago: 16 * DAY });
    ms(w1, 0, 'Service skeleton + API contract', 1200, 'released', { f: 15 * DAY, d: 11 * DAY, r: 9 * DAY }); ms(w1, 1, 'Matching engine', 1600, 'inprogress', { f: 8 * DAY }); ms(w1, 2, 'Load tests + handover', 800, 'funded', { f: 8 * DAY });
    const w2 = deal(s.id, 'Postgres performance review', 'Fixed price', 'milestones', 'done', { client: null, clientName: 'Baltic Parcel AS', review: 'done', ago: 12 * DAY, closed: 3 * DAY });
    ms(w2, 0, 'Review + report', 900, 'released', { f: 11 * DAY, d: 5 * DAY, r: 3 * DAY });

    const opp = (title, client, kind, budget, why, status, dueIn, brief) => run('INSERT INTO opps (specialist_id, brief_id, title, client, kind, budget, descr, why, status, due_at, proposal, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      s.id, brief || null, title, client, kind, budget, 'Build a secure client portal on top of existing Go services and PostgreSQL: API extensions, React front end, tests, deployment. Team of 3–4, long-term.', JSON.stringify(why), status, t + dueIn, status === 'sent' ? JSON.stringify({ rate: '€55 / h', start: '1 Oct', note: 'Migrated two retail pipelines to Postgres 16 with zero downtime.', at: t - 2 * DAY }) : null, t - DAY);
    opp('Backend team for B2B client portal', A, 'Invitation', '€55–65 / h · 3+ months', ['Go + PostgreSQL match your top skills', 'Team leads asked for Tallinn/Tartu time zone', 'You shipped 2 similar portals'], 'invited', 2 * DAY, b1);
    opp('API gateway hardening', 'Nordic Freight AB', 'Matched', '€4,000 fixed · 4 weeks', ['Kubernetes + gRPC', 'Past fintech work'], 'new', 5 * DAY);
    opp('Join a ready team: Development (lead + 3)', 'AfterWorc Teams', 'Team seat', '€9,200 / month seat', ['Checked in person', 'Available from 1 Oct'], 'new', 10 * DAY);
    opp('Data pipeline migration', 'Tallinn Retail Group', 'Matched', '€45–55 / h · 6 weeks', ['PostgreSQL', 'Go'], 'sent', 4 * DAY);

    // Money (sandbox ledger)
    run('UPDATE balances SET available=2500, held=12500 WHERE user_id=? AND mode=?', uid, 'hire');
    run('UPDATE balances SET available=1080, held=2400 WHERE user_id=? AND mode=?', uid, 'work');
    const txn = (m, descr, amt, st, ago) => run('INSERT INTO transactions (user_id, mode, descr, amount, status, created_at) VALUES (?,?,?,?,?,?)', uid, m, descr, amt, st, t - ago);
    txn('hire', 'Top up · LHV bank link', 26000, 'Completed', 30 * DAY); txn('hire', 'Milestone funded · Marketing department', -12000, 'Held', 28 * DAY);
    txn('hire', 'Milestone funded · Payment API integration', -900, 'Held', 24 * DAY); txn('hire', 'Milestone funded · Landing redesign v1', -400, 'Held', 17 * DAY);
    txn('hire', 'Milestone funded · Landing redesign v1', -500, 'Held', 11 * DAY); txn('hire', 'Company card payments', -1284, 'Card', 4 * DAY);
    txn('work', 'Promo credit · early registration', 20, 'Credit', 26 * DAY); txn('work', 'Released · Go microservice for invoice matching', 1200, 'Fee €0', 9 * DAY);
    txn('work', 'Released · Postgres performance review', 900, 'Fee €0', 3 * DAY); txn('work', 'Paid out to bank', -900, 'To LHV ••85 · paid', 3 * DAY);
    const inv = (descr, amt, ago) => { const no = D.addInvoice(uid, A, descr, amt); run('UPDATE invoices SET created_at=? WHERE number=?', t - ago, no); };
    inv('Marketing department · September', 12000, 28 * DAY); inv('Payment API integration', 900, 24 * DAY); inv('Landing redesign · Wireframes', 400, 17 * DAY); inv('Landing redesign · UI design', 500, 11 * DAY);

    const card = { ...D.defaultCard('KRISTJAN SAAR', 'hire'), st: 'active', name: 'KRISTJAN SAAR', org: A, last4: '7730', exp: '09/30', phys: 'active', pan: '5555341244447730', cvc: '123', pin: '4821', wal: { apple: false, google: true } };
    run('UPDATE cards SET data=? WHERE user_id=? AND mode=?', JSON.stringify(card), uid, 'hire');
    const ctx = (d, ch, a, ago, r) => run('INSERT INTO card_tx (user_id, mode, descr, channel, amount, receipt_file, created_at) VALUES (?,?,?,?,?,?,?)', uid, 'hire', d, ch, a, r ? -1 : null, t - ago);
    ctx('Amazon Web Services', 'Online', -600, 3 * DAY, 1); ctx('Tallink · team trip', 'Contactless', -219, 2 * DAY, 0); ctx('Google Ads · campaign', 'Online', -420, DAY, 1); ctx('Figma · 3 editor seats', 'Online', -45, 5 * HOUR, 1);

    // Conversations
    const th = D.supportThread(uid, 'hire', 'Anna R. · AfterWorc matching', 'Your shortlist is ready');
    const msg = (tid, s2, body, ago, name) => run('INSERT INTO messages (thread_id, sender, sender_name, body, created_at) VALUES (?,?,?,?,?)', tid, s2, name || '', body, t - ago);
    msg(th.id, 'system', 'Brief "Backend team for B2B client portal" sent', 50 * HOUR);
    msg(th.id, 'staff', 'Hi Vic! I have read your brief. Quick check: is the existing API in Go only, or also Node?', 49 * HOUR, 'Anna R.');
    msg(th.id, 'user', 'Go only, plus a small Python service for reports.', 48 * HOUR);
    msg(th.id, 'staff', 'Perfect. Your shortlist is ready: Team North (ready team), Mart and Jelena. I would start with Team North: they built almost the same portal for a logistics client.', 24 * HOUR, 'Anna R.');
    run('UPDATE threads SET user_unread=1, updated_at=? WHERE id=?', t - 24 * HOUR, th.id);
    const liis = D.specialistThread(uid, D.specById('lt'), A, 'Delivered milestone 2', d1);
    msg(liis.id, 'peer', 'Milestone 2 is delivered. Figma link + mobile flows attached. Happy to walk you through on a call.', 2 * DAY);
    run('UPDATE threads SET user_unread=1, updated_at=? WHERE id=?', t - 2 * DAY, liis.id);
    const kadri = D.specialistThread(uid, D.specById('km'), A, 'Week 38 report', d2);
    msg(kadri.id, 'peer', 'Weekly report for week 38 is up. 41 demo requests so far, best channel LinkedIn.', 3 * DAY);
    run('UPDATE threads SET updated_at=? WHERE id=?', t - 3 * DAY, kadri.id);
    const wth = D.supportThread(uid, 'work', 'Anna R. · AfterWorc matching', 'Invitation: B2B client portal');
    msg(wth.id, 'staff', 'Hi! A client is looking for exactly your stack (Go + Postgres, 3+ months). I have put you on their shortlist; reply to the invitation by Friday.', 20 * HOUR, 'Anna R.');
    run('UPDATE threads SET user_unread=1, updated_at=? WHERE id=?', t - 20 * HOUR, wth.id);

    const n = (m, title, sub, route, param, unread, ago) => run('INSERT INTO notifications (user_id, mode, title, sub, route, param, unread, created_at) VALUES (?,?,?,?,?,?,?,?)', uid, m, title, sub, route, param == null ? null : String(param), unread, t - ago);
    n('hire', 'Leave a review for Rasmus Vaher', 'Reviews stay hidden until both sides submit', 'deal', d3, 0, 8 * DAY);
    n('hire', 'Weekly report from the Marketing department', 'Week 38 · approve within 7 days', 'deal', d2, 1, 3 * DAY);
    n('hire', 'Liis Tamm delivered milestone 2', 'Review within 7 days or it auto-accepts', 'deal', d1, 1, 2 * DAY);
    n('hire', 'Shortlist ready: Backend team for B2B client portal', '3 checked matches · 26 h (promised 48 h)', 'brief', b1, 1, 24 * HOUR);
    n('work', '€900 released: Postgres performance review', 'Paid out to your bank', 'money', null, 0, 3 * DAY);
    n('work', 'New: your own AfterWorc Mastercard', 'Spend earnings the moment they are released · virtual card in a minute', 'card', null, 1, 2 * DAY);
    n('work', 'You are invited: Backend team for B2B client portal', 'Reply within 72 h', 'opps', null, 1, 20 * HOUR);
  })();
  console.log(`[seed] demo account: ${email} / ${pw}`);
}

/* Skills catalog: a starter set plus every skill already on a profile, all approved. New ones added by users wait for staff. */
const STARTER_SKILLS = ['Go', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes', 'AWS', 'Docker', 'Python', 'Java', 'Kotlin', 'Swift',
  'Figma', 'Design systems', 'UX research', 'Prototyping', 'Webflow', 'SEO', 'Google Ads', 'LinkedIn Ads', 'Content', 'Analytics', 'Email marketing',
  'Jira', 'Scrum', 'Excel', 'Customer support', 'Bookkeeping', 'Copywriting', 'Estonian', 'Russian', 'Technical writing', 'Video editing',
  'SQL', 'dbt', 'Airflow', 'Terraform', 'GCP', 'BigQuery', 'Playwright', 'Cypress', 'OWASP', 'Pen testing', 'API tests',
  'Payment operations', 'Reconciliation', 'SEPA', 'SWIFT', 'Card schemes', 'Chargebacks', 'PSD2', 'Open banking', 'AML', 'KYC', 'Transaction monitoring',
  'Safeguarding', 'EMI licensing', 'PCI DSS', 'Stripe', 'Adyen', 'Payroll', 'HR operations', 'Employment law', 'Treasury'];
function seedSkills() {
  const ins = db.prepare("INSERT OR IGNORE INTO skills (name, status, created_at, approved_at) VALUES (?, 'approved', ?, ?)");
  if (!one('SELECT COUNT(*) n FROM skills').n) {
    const t = now();
    const fromProfiles = db.prepare('SELECT skills FROM specialists').all().flatMap(r => U.j(r.skills, []));
    D.tx(() => [...STARTER_SKILLS, ...fromProfiles].forEach(n => ins.run(String(n).trim(), t, t)))();
  }
}

/* Users created before verification levels existed: derive the level from the checks already done. */
function backfillLevels() {
  for (const u of db.prepare("SELECT id, verify FROM users WHERE level='registered' AND verified_at IS NULL").all()) {
    const v = U.j(u.verify, {}); const done = k => v[k] && v[k].st === 'done';
    const level = done('checked') ? 'checked' : done('id') ? 'verified' : null;
    if (level) db.prepare('UPDATE users SET level=?, verified_at=? WHERE id=?').run(level, now(), u.id);
  }
}

function run_() { seedDirectory(); seedSkills(); seedAdmin(); seedDemo(); backfillLevels(); }
module.exports = { run: run_, DIRECTORY };
