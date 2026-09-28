# AfterWorc

**Build your workforce. We run the rest.** Finding people, checking them, hiring them in another country (Employer of Record) and paying them on time, for SaaS, EMI, PSP and fintech companies. This repository is the complete product: the public site, the account for businesses and specialists, and a staff console.

- **Public site** (`/`): static HTML + JavaScript, EN / ET / RU.
- **Account** (`/app`) and **staff console** (`/admin`): React apps (Vite), EN / ET / RU in the account.
- **Server**: Express + SQLite, a JSON API and a WebSocket channel (`/ws`) for live updates and calls. The same API serves the planned mobile app (bearer tokens, see below).

## Run it

```bash
npm install
npm start            # builds the React apps if needed, then http://localhost:3000
```

Node 20 or newer. `npm run build` builds the React apps into `dist/app` on its own.

For front-end work, run the API and the Vite dev server side by side (hot reload, `/api` and `/ws` are proxied):

```bash
npm run dev          # API on :3000
npm run dev:web      # account on http://localhost:5173/app/ , staff console on /app/admin.html
```

On first start outside production it creates:

| Account | E-mail | Password |
|---|---|---|
| Staff console (`/admin`) | `admin@afterworc.local` | `afterworc-admin` |
| Demo (both modes, full data) | `demo@afterworc.com` | `afterworc-demo` |

Without `SMTP_URL`, e-mails (verification links, reset links, codes) are printed in the server log and listed in **Staff console › E-mails**. When the site runs on localhost, the sign-up, reset and assessment forms also show the link or code on screen (never on a public address).

## What works

**Public site** (`/`)
- Every page from the prototype: home, I'm hiring, I'm building, How it works, AfterWorc card, Categories, About, Find specialists, specialist profiles, in English, Estonian and Russian, with light and dark themes.
- Specialist directory and profiles come from the database.
- Sign up with e-mail verification, log in (with two-factor when enabled), forgot and reset password.
- Free technical assessment form: the request is confirmed with a 6-digit code sent by e-mail, then lands in the staff console.
- Terms, Privacy Policy, Cookie Notice and Cookie settings pages.

**Account** (`/app`, React), with Hiring and Working modes, in English, Estonian and Russian (language and theme sit together in the avatar menu; the choice is saved to the account)
- Briefs: 4-step wizard, drafts, sending, status tracking, shortlist comparison, asking for different people, proposals received.
- Deals between a client and a specialist: terms → accept → fund milestone → deliver (with files) → accept or request changes → release. Deliveries auto-accept after 7 days. Department deals with monthly funding and weekly reports. Reviews, mediation requests, extra milestones.
- Briefs for a task, a specialist, a ready team, a department (Development, Payments, Marketing, Business Support) or **hiring abroad (EOR)** with country, contract and salary.
- **Messages**, live over WebSocket: search by people and message text, pinned chats, pinned messages with a quick-access bar and list, editing your own messages (↑ edits the last one), typing indicator, a separate **technical support** chat, and chats started from a specialist's profile.
- **Voice and video calls** (WebRTC) from any conversation with a person or the AfterWorc team: ringing, answer or decline, mute, camera on/off, minimise, and a call log in the chat. Staff answer support calls in the console.
- Money: balances, held funds, activity, printable invoices and statements, top-up, withdrawal (needs 2FA and an IBAN).
- AfterWorc card: issue (virtual or physical), freeze, controls, limits, phone wallets, reveal details or PIN (needs 2FA) with **copy buttons for the number, expiry and CVV**, lost or stolen, receipts on card payments. The dashboard card opens the card page (like the card in the top bar); "Get my card" is only offered while there is no card.
- Specialist side: opportunities and invitations, proposals, profile editor with **profile photo** and a **portfolio with images**, skills with autocomplete from the approved catalog (**new skills wait for staff approval** before they show publicly), submit for review, verification steps (ID upload, references, interview booking).
- Settings: real TOTP two-factor authentication (QR code), change name; **password** = current → new → repeat (+ 2FA code when on); **e-mail** = new address confirmed by a link (+ 2FA code when on), the old address works until then; active sessions, notification preferences, tax and payout details, organizations with invitations and "acting as", data export, close or delete account.
- Help form and global search.

**Staff console** (`/admin`, staff accounts only)
- Inbox: answer every conversation, as AfterWorc or on behalf of a specialist who has no account yet.
- Briefs: set status and matcher, publish a shortlist of up to 3 with a "why matched" line, invite specialists.
- Requests: assessment requests and contact messages with status and notes.
- Specialists: add or edit directory profiles, publish, set level, link to a user account, send matched opportunities.
- Users & checks: **verify a user** (Registered, Verified, Checked in person) and **set the account status** (active, on hold: no payments or new work, blocked: signed out and cannot sign in), plus each verification step.
- Skills: the moderation queue for new skills; approve (optionally renamed), add, delete, and **merge duplicates** (every profile is updated).
- Calls: answer voice and video calls to support; call users from the inbox.
- Deals: accept terms and deliver for specialists without accounts, post weekly department reports, resolve issues.
- Money: confirm SEPA top-ups, mark payouts as paid; see booked calls and interviews.
- E-mails: everything the platform sent.

## Money: what is live and what is test mode

**Top-ups can be real.** Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and add the webhook `https://<your-domain>/api/stripe/webhook` in the Stripe dashboard (events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`). Card, bank-link and wallet top-ups then open Stripe Checkout. A balance is credited only from the signed webhook, once per payment, and only when the paid amount matches. SEPA top-ups are confirmed by staff in the console when the transfer arrives.

**Payouts** are requested in the account (2FA and an IBAN required). Only earnings released from deals can be withdrawn; top-ups stay on the platform. Requests are listed under Staff console › Money. Staff send the bank transfer and mark it paid.

**Still test mode:** without Stripe keys, top-ups are credited instantly on a test ledger, and the account shows a "Test mode" note. The **AfterWorc Mastercard** always runs in test mode until an issuing partner is connected: card numbers are Mastercard test-range numbers and no card payments happen. To go live with cards, replace the `card_*` actions in `server/routes/account.js` with your issuer's API.

## Real-time channel and the mobile app

The browser apps and a future mobile app use the same API.

- **Sign-in for apps:** `POST /api/auth/login` with `{ email, password, client: "app" }` (and `code` when 2FA is on) returns `{ token }`. Send it as `Authorization: Bearer <token>` on every request; no cookie or CSRF header is needed. `POST /api/auth/logout` ends it.
- **State and actions:** `GET /api/account/state` returns everything the account shows; `POST /api/account/action` with `{ type, ...payload }` runs an action and returns the new state. Chat search: `GET /api/chat/search?q=&mode=`. Images: `POST /api/account/media` (multipart `file`).
- **WebSocket** `wss://<host>/ws` (browsers use the session cookie; apps add `?token=<token>`). Server → client: `sync` (refetch state), `thread` (a conversation changed), `notify`, `typing`, and call events `call:ring`, `call:started`, `call:accepted`, `call:signal`, `call:taken`, `call:ended`. Client → server: `typing`, `call:start {threadId, kind: 'audio'|'video'}`, `call:accept`, `call:decline`, `call:end`, `call:signal {callId, data: {sdp|ice}}`, `ping`.
- **Translations** live in `client/src/shared/i18n/` (English key → Estonian, Russian), including patterns for texts the server sends, so the mobile app can reuse them.

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
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Real card and wallet top-ups (see above). |
| `STUN_URLS`, `TURN_URL`, `TURN_USER`, `TURN_PASS` | Servers for voice and video calls. Public STUN works for most networks; add a TURN server (e.g. coturn) for strict corporate networks. |

## Deploy

Any host that runs Node or Docker and gives you a persistent disk works (Fly.io, Render, Railway, a VPS).

```bash
docker build -t afterworc .
docker run -p 3000:3000 -v afterworc-data:/data --env-file .env afterworc
```

Put it behind HTTPS and back up the `/data` volume (it holds `afterworc.db` and uploaded files). Calls need HTTPS (browsers only allow the microphone and camera on secure pages). Behind nginx, pass WebSocket upgrades for `/ws`:

```nginx
location /ws { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; }
```

## Tests

```bash
npm test               # API: sign-up → brief → deal → payout, Stripe webhook, 2FA, chats, WebSocket calls, skills moderation, portfolio, staff verification and status, bearer tokens
npm run test:browser   # Clicks through the real UI in Chromium, incl. live updates and a WebRTC call with fake devices (needs Chromium or CHROMIUM_PATH)
```

## Layout

```
client/           React apps (Vite): account/ (views, modals), admin/ (staff console), shared/ (API, WebSocket, calls, i18n, styles)
server/
  index.js        Express app, security headers, routing, HTTP server + WebSocket
  ws.js           WebSocket: live sync, typing, presence, call signaling
  bus.js          in-process events from business logic to the WebSocket
  db.js           SQLite schema
  auth.js         sessions, CSRF guard, one-time tokens
  domain.js       business logic and the account state
  mail.js         e-mail (SMTP or log)
  seed.js         directory, staff and demo accounts
  routes/         auth, public (directory, skills, media, rtc), account (all account actions), chat (search), admin
public/
  fonts/          self-hosted Sora, Inter, IBM Plex Mono (+ licences); no Google Fonts
  index.html      public site   · assets/ (site.js, i18n, legal pages, card renderer, styles)
test/             API tests and the browser end-to-end run
```

## Before launch

- Have the Terms, Privacy Policy and Cookie Notice reviewed by counsel (`public/assets/legal.js`).
- Add your Stripe keys for real top-ups, and connect a card issuer (see Money above).
- Set `SMTP_URL` so verification and reset e-mails are delivered.
