# AfterWorc

Checked specialists, ready teams and whole departments on demand. This repository is the complete website: the public site, the account for businesses and specialists, and a staff console to run the marketplace.

It is built from the two design prototypes (public site v3 and the account prototype) and keeps their design, copy and EN / ET / RU translations.

## Run it

```bash
npm install
npm start            # http://localhost:3000
```

Node 20 or newer. No build step: the server is Express + SQLite; the front end is plain JavaScript.

On first start outside production it creates:

| Account | E-mail | Password |
|---|---|---|
| Staff console (`/admin`) | `admin@afterworc.local` | `afterworc-admin` |
| Demo (both modes, full data) | `demo@afterworc.com` | `afterworc-demo` |

Without `SMTP_URL`, e-mails (verification links, reset links, codes) are printed in the server log and listed in **Staff console › E-mails**. In development the sign-up, reset and assessment forms also show the link or code on screen.

## What works

**Public site** (`/`)
- Every page from the prototype: home, I'm hiring, I'm building, How it works, AfterWorc card, Categories, About, Find specialists, specialist profiles, in English, Estonian and Russian, with light and dark themes.
- Specialist directory and profiles come from the database.
- Sign up with e-mail verification, log in (with two-factor when enabled), forgot and reset password.
- Free technical assessment form: the request is confirmed with a 6-digit code sent by e-mail, then lands in the staff console.
- Terms, Privacy Policy, Cookie Notice and Cookie settings pages.

**Account** (`/app`), with Hiring and Working modes
- Briefs: 4-step wizard, drafts, sending, status tracking, shortlist comparison, asking for different people, proposals received.
- Deals between a client and a specialist: terms → accept → fund milestone → deliver (with files) → accept or request changes → release. Deliveries auto-accept after 7 days. Department deals with monthly funding and weekly reports. Reviews, mediation requests, extra milestones.
- Messages between clients, specialists and the AfterWorc team, with notifications in the app and by e-mail.
- Money: balances, held funds, activity, printable invoices and statements, top-up, withdrawal (needs 2FA and an IBAN).
- AfterWorc card: issue (virtual or physical), freeze, controls, limits, phone wallets, reveal details or PIN (needs 2FA), lost or stolen, receipts on card payments.
- Specialist side: opportunities and invitations, proposals, profile editor, submit for review, verification steps (ID upload, references, interview booking).
- Settings: real TOTP two-factor authentication (QR code), change name, e-mail and password, active sessions, notification preferences, tax and payout details, organizations with invitations and "acting as", data export, close or delete account.
- Help form and global search.

**Staff console** (`/admin`, staff accounts only)
- Inbox: answer every conversation, as AfterWorc or on behalf of a specialist who has no account yet.
- Briefs: set status and matcher, publish a shortlist of up to 3 with a "why matched" line, invite specialists.
- Requests: assessment requests and contact messages with status and notes.
- Specialists: add or edit directory profiles, publish, set level, link to a user account, send matched opportunities.
- Users & checks: move each verification step along; levels update automatically.
- Deals: accept terms and deliver for specialists without accounts, post weekly department reports, resolve issues.
- Money: confirm SEPA top-ups, mark payouts as paid; see booked calls and interviews.
- E-mails: everything the platform sent.

## Test mode for money and the card

Payments and the Mastercard need licensed partners (a payment provider and a card issuer) that are not connected yet. Until then, balances, top-ups, payouts and cards run on an internal test ledger: every amount is tracked consistently (available, held, released, invoices), but no real money moves. The account shows a "Test mode" note on Money and Card pages. The card numbers are Mastercard test-range numbers.

To go live, replace the `topup`, `withdraw` and `card_*` actions in `server/routes/account.js` with calls to your providers (for example Stripe or Montonio for top-ups and payouts, and your issuer's API for cards) and credit balances from their webhooks.

## Configuration

Copy `.env.example` to `.env` (loaded automatically by `npm start`) or set the variables in your host. The important ones:

| Variable | Purpose |
|---|---|
| `BASE_URL` | Public address used in e-mail links. `https://` also turns on Secure cookies. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First staff account. Required in production. |
| `SMTP_URL`, `MAIL_FROM` | Outgoing e-mail, e.g. `smtps://user:pass@smtp.example.com:465`. |
| `STAFF_EMAIL` | Where staff notifications go. |
| `DATA_DIR` | SQLite database and uploads. Use a persistent volume. |
| `TRUST_PROXY` | `1` behind a reverse proxy. |
| `WORKER_FEE_PCT` | Specialist fee at release, in percent. |

## Deploy

Any host that runs Node or Docker and gives you a persistent disk works (Fly.io, Render, Railway, a VPS).

```bash
docker build -t afterworc .
docker run -p 3000:3000 -v afterworc-data:/data --env-file .env afterworc
```

Put it behind HTTPS and back up the `/data` volume (it holds `afterworc.db` and uploaded files).

## Tests

```bash
npm test               # API: sign-up → brief → shortlist → deal → funding → delivery → payout, 2FA, reset, deletion, security checks
npm run test:browser   # Clicks through the real UI in Chromium (needs playwright-core's Chromium or CHROMIUM_PATH)
```

## Layout

```
server/
  index.js        Express app, security headers, routing
  db.js           SQLite schema
  auth.js         sessions, CSRF guard, one-time tokens
  domain.js       business logic and the account state
  mail.js         e-mail (SMTP or log)
  seed.js         directory, staff and demo accounts
  routes/         auth, public, account (all account actions), admin
public/
  index.html      public site   · assets/ (site.js, i18n, legal pages, card renderer, styles)
  app/            account       · core.js, views.js, views2.js, modals.js, app.css
  admin/          staff console
test/             API tests and the browser end-to-end run
```

## Before launch

- Have the Terms, Privacy Policy and Cookie Notice reviewed by counsel (`public/assets/legal.js`).
- Connect the payment and card partners (see Test mode above).
- Set `SMTP_URL` so verification and reset e-mails are delivered.
