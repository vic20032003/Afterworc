/* Browser end-to-end check of the real UI (public site → account → staff console).
   Run with: npm run test:browser  (needs Chromium; set CHROMIUM_PATH if it isn't at /opt/pw-browsers/chromium) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert/strict');
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-e2e-'));
const { chromium } = require('playwright-core');
const { createApp } = require('../server/index');
const U = require('../server/util');
const { db } = require('../server/db');

(async () => {
  const server = createApp().listen(0); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
  const errors = [];
  const page = async () => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_CERT|ERR_NAME|ERR_CONNECTION|ERR_TUNNEL|ERR_PROXY/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); }); return p; };
  const step = s => console.log('✓', s);
  const wait = p => p.waitForTimeout(350);
  try {
    /* ---- client signs up on the public site ---- */
    const c = await page();
    await c.goto(base + '/#register'); await wait(c);
    await c.fill('#r-email', 'e2e-client@example.com'); await c.fill('#r-pw', 'e2e-password-123'); await c.check('input[data-act=regterms]');
    await c.click('form[data-form=reg] button[type=submit]'); await c.waitForSelector('text=Check your e-mail');
    const link = await c.getAttribute('a[href*="/api/auth/verify"]', 'href');
    await c.goto(link.replace(/^https?:\/\/[^/]+/, base)); await c.waitForSelector('text=Post your first brief'); step('sign-up + e-mail verification → account');

    /* ---- brief wizard ---- */
    await c.click('.opt[data-arg=task]'); await wait(c);
    await c.fill('#w-line', 'Landing page for our launch'); await c.click('[data-act=aiwrite]'); await wait(c);
    await c.click('[data-act=wnext]'); await wait(c);
    await c.click('.chip[data-act=warea][data-arg=Design]'); await wait(c); await c.click('.chip[data-arg="UI/UX Designer"]'); await c.click('[data-act=wnext]'); await wait(c);
    await c.click('.opt[data-arg="€1–5k"]'); await c.click('[data-act=wnext]'); await wait(c);
    await c.click('[data-act=wsend]'); await c.waitForSelector('text=is reading your brief'); step('brief wizard → brief sent');

    /* ---- staff shortlists it in the console ---- */
    const s = await page();
    await s.goto(base + '/#login-staff'); await wait(s);
    await s.fill('#l-email', 'admin@afterworc.local'); await s.fill('#l-pw', 'afterworc-admin'); await s.click('form[data-form=login] button[type=submit]');
    await s.waitForURL(/\/admin/); await s.waitForSelector('text=Staff console');
    await s.click('[data-tab=briefs]'); await wait(s);
    await s.click('summary:has-text("Landing page for our launch")'); await wait(s);
    const bid = (await s.getAttribute('[data-a=bshort]', 'data-id'));
    await s.selectOption(`#bsl${bid}_0`, 'lt'); await s.fill(`#bwhy${bid}_0`, 'Designed three SaaS landings');
    await s.click('[data-a=bshort]'); await s.waitForSelector('text=Shortlist published'); step('staff console → shortlist published');

    /* ---- client starts a deal, tops up, funds ---- */
    await c.goto(base + '/app#/hire/home'); await c.reload(); await c.waitForSelector('text=Shortlist ready');
    await c.click('.next [data-go=brief]'); await c.waitForSelector('text=Your shortlist');
    await c.click('[data-act=startdeal]'); await wait(c);
    await c.fill('#sd-first', 'Wireframes'); await c.fill('#sd-amt', '400'); await c.click('[data-act=dostartdeal]');
    await c.waitForSelector('text=is reviewing your terms'); step('deal terms sent');
    await s.click('[data-a=refresh]'); await wait(s); await s.click('[data-tab=deals]'); await wait(s);
    await s.click('[data-a=dacc]'); await s.waitForSelector('text=Accepted'); step('staff accepts for an unlinked specialist');
    await c.reload(); await c.waitForSelector('[data-act=fund]');
    await c.click('[data-act=fund]'); await wait(c); await c.waitForSelector('text=Not enough balance');
    await c.click('.modal [data-act=topup]'); await wait(c);
    await c.click('[data-act=topm][data-arg=card]'); await c.click('[data-act=dotopup]'); await c.waitForSelector('text=added to your company balance');
    await c.click('[data-act=fund]'); await wait(c); await c.click('[data-act=dofund]'); await c.waitForSelector('text=funded and held'); step('top-up + fund milestone');

    /* ---- delivery and acceptance ---- */
    await s.click('[data-a=refresh]'); await wait(s); await s.fill('input[id^=dn]', 'Figma file shared'); await s.click('[data-a=ddel]'); await s.waitForSelector('text=Delivered; client notified');
    await c.reload(); await c.waitForSelector('text=was delivered');
    await c.click('.next [data-act=accept]'); await wait(c); await c.click('[data-act=doaccept]'); await c.waitForSelector('text=released to');
    await c.waitForSelector('text=How was working with'); step('delivery accepted → review requested');
    await c.click('[data-act=star][data-arg="5"]'); await c.fill('#rv-text', 'Excellent'); await c.click('[data-act=review]'); await c.waitForSelector('text=Review saved'); step('review submitted');

    /* ---- messages both ways ---- */
    await c.goto(base + '/app#/hire/messages'); await c.reload(); await wait(c);
    await c.fill('#msgin', 'Hello from the client'); await c.keyboard.press('Enter'); await c.waitForSelector('.bub.me:has-text("Hello from the client")');
    await s.click('[data-a=refresh]'); await wait(s); await s.click('[data-tab=inbox]'); await wait(s);
    await s.click('.ml .li:has-text("Liis Tamm")'); await wait(s);
    await s.fill('#reply', 'Hi, Liis here'); await s.selectOption('#as', 'relay'); await s.click('[data-a=reply]'); await s.waitForSelector('text=Sent');
    await c.reload(); await c.waitForSelector('.bub:has-text("Hi, Liis here")'); step('messages client ↔ staff relay');

    /* ---- 2FA in settings, then withdraw is protected ---- */
    await c.goto(base + '/app#/hire/settings/sec'); await c.reload(); await wait(c);
    await c.click('[data-act=twofaon]'); await c.waitForSelector('.qr svg');
    const secret = (await c.textContent('.modal .mono')).replace(/\s/g, '');
    await c.fill('#m-code', U.totpAt(secret, Math.floor(Date.now() / 30000))); await c.click('[data-act=dotwofa]'); await c.waitForSelector('text=On · authenticator app'); step('2FA turned on with a real TOTP code');

    /* ---- card ---- */
    await c.goto(base + '/app#/hire/card'); await c.reload(); await wait(c);
    await c.click('.cardhero [data-act=getcard]'); await wait(c); await c.click('[data-act=gcnext]'); await wait(c); await c.click('[data-act=gcnext]'); await wait(c);
    await c.check('.modal input[data-bind="modal.terms"]'); await c.fill('#m-code', U.totpAt(secret, Math.floor(Date.now() / 30000)));
    await c.click('[data-act=doissuecard]'); await c.waitForSelector('text=Your virtual card is ready');
    await c.click('.qa [data-act=freeze]'); await c.waitForSelector('text=Card is frozen'); step('card issued and frozen');

    /* ---- working mode: profile ---- */
    await c.click('.modesw [data-arg=work]'); await c.waitForSelector('text=Finish your profile');
    await c.goto(base + '/app#/work/profile'); await c.reload(); await wait(c);
    await c.fill('#pf-head', 'Product designer'); await c.selectOption('select[data-bind="prof.profession"]', 'Backend Developer'); await c.fill('#pf-about', 'I design SaaS products.');
    await c.click('[data-act=pnext]'); await wait(c); await c.click('[data-act=skilladd]'); await c.fill('#skillin', 'Figma'); await c.keyboard.press('Enter'); await wait(c);
    await c.click('[data-act=pnext]'); await wait(c); await c.fill('#pf-rate', '50'); await c.fill('#pf-port', 'https://example.com');
    await c.click('[data-act=psubmit]'); await c.waitForSelector('text=Submitted · in review'); step('specialist profile saved + submitted');

    /* ---- public site shows the logged-in state ---- */
    await c.goto(base + '/#home'); await c.waitForSelector('a.btn:has-text("Open account")'); step('public header knows the session');
    await c.click('[data-act=menu]').catch(() => {});

    const bal = db.prepare("SELECT available, held FROM balances b JOIN users u ON u.id=b.user_id WHERE u.email='e2e-client@example.com' AND mode='hire'").get();
    assert.deepEqual(bal, { available: 0, held: 0 }, 'topped up exactly the missing amount, funded, released');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('\nBrowser E2E passed');
  } catch (e) {
    console.error('\nFAILED:', e.message, '\nPage errors:', errors); process.exitCode = 1;
  } finally { await browser.close(); server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); }
})();
