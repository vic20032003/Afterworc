/* Browser end-to-end check of the real UI (public site → React account → React staff console), including
   live updates over WebSocket and a WebRTC call with fake camera and microphone.
   Run with: npm run test:browser  (needs Chromium; set CHROMIUM_PATH if it isn't at /opt/pw-browsers/chromium) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert/strict');
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-e2e-'));
const { chromium } = require('playwright-core');
const { createServer } = require('../server/index');
const U = require('../server/util');
const { db } = require('../server/db');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5b40000000049454e44ae426082', 'hex');

(async () => {
  const server = createServer().listen(0); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const errors = [];
  const page = async () => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'] });
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_CERT|ERR_NAME|ERR_CONNECTION|ERR_TUNNEL|ERR_PROXY|stun|WebSocket/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
    return p;
  };
  const step = s => console.log('✓', s);
  const wait = p => p.waitForTimeout(300);
  const totp = (secret, d = 0) => U.totpAt(secret, Math.floor(Date.now() / 30000) + d);
  const img = path.join(process.env.DATA_DIR, 'work.png'); fs.writeFileSync(img, PNG);
  try {
    /* ---- client signs up on the public site ---- */
    const c = await page();
    await c.goto(base + '/#register'); await wait(c);
    await c.fill('#r-email', 'e2e-client@example.com'); await c.fill('#r-pw', 'e2e-password-123'); await c.check('input[data-act=regterms]');
    await c.click('form[data-form=reg] button[type=submit]'); await c.waitForSelector('text=Check your e-mail');
    const link = await c.getAttribute('a[href*="/api/auth/verify"]', 'href');
    await c.goto(link.replace(/^https?:\/\/[^/]+/, base)); await c.waitForSelector('text=Post your first brief'); step('sign-up + e-mail verification → React account');

    /* ---- brief wizard ---- */
    await c.click('.opts .opt:has-text("A task")'); await wait(c);
    await c.fill('#w-line', 'Landing page for our launch'); await c.click('button:has-text("Write the brief for me")'); await wait(c);
    await c.click('button:has-text("Continue")'); await wait(c);
    await c.click('.chip:text-is("Design")'); await c.click('.chip:text-is("UI/UX Designer")'); await c.click('button:has-text("Continue")'); await wait(c);
    await c.click('.opt:has-text("€1–5k")'); await c.click('button:has-text("Continue")'); await wait(c);
    await c.click('button:has-text("Send brief")'); await c.waitForSelector('text=is reading your brief'); step('brief wizard → brief sent');

    /* ---- staff shortlists it in the console ---- */
    const s = await page();
    await s.goto(base + '/#login-staff'); await wait(s);
    await s.fill('#l-email', 'admin@afterworc.local'); await s.fill('#l-pw', 'afterworc-admin'); await s.click('form[data-form=login] button[type=submit]');
    await s.waitForURL(/\/admin/); await s.waitForSelector('text=Staff console');
    await s.click('.tabsx button:has-text("Briefs")'); await wait(s);
    await s.click('summary:has-text("Landing page for our launch")'); await wait(s);
    const card = s.locator('details[open]');
    await card.locator('select').nth(2).selectOption('lt'); await card.locator('input[placeholder="Why matched"]').first().fill('Designed three SaaS landings');
    await card.locator('button:has-text("Publish shortlist to client")').click(); await s.waitForSelector('text=Shortlist published'); step('staff console → shortlist published');

    /* ---- the client sees it live (WebSocket), starts a deal, tops up, funds ---- */
    await c.goto(base + '/app#/hire/home'); await c.waitForSelector('text=Shortlist ready');
    await c.click('.next button:has-text("Compare")'); await c.waitForSelector('text=Your shortlist');
    await c.click('button:has-text("Start deal")'); await wait(c);
    await c.fill('.modal label:has-text("First milestone") input', 'Wireframes'); await c.fill('.modal label:has-text("Amount") input', '400');
    await c.click('.modal button:has-text("Send terms")'); await c.waitForSelector('text=is reviewing your terms'); step('deal terms sent');
    await s.click('.tabsx button:has-text("Deals")'); await wait(s);
    await s.click('button:has-text("Accept terms for")'); await s.waitForSelector('text=Accepted; client notified'); step('staff accepts for an unlinked specialist');
    await c.waitForSelector('.ms button:has-text("Fund")');
    await c.click('.ms button:has-text("Fund")'); await c.waitForSelector('text=Not enough balance');
    await c.click('.modal .mf button:has-text("Top up")'); await wait(c);
    await c.click('.modal .opt:has-text("Debit or credit card")'); await c.click('.modal .mf .btn.g'); await c.waitForSelector('text=added to your company balance');
    await c.click('.ms button:has-text("Fund")'); await wait(c); await c.click('.modal .mf button:has-text("Fund")'); await c.waitForSelector('text=funded and held'); step('top-up + fund milestone (live update, no reload)');

    /* ---- delivery and acceptance ---- */
    await s.click('button:has-text("Refresh")'); await wait(s);
    await s.fill('input[placeholder^="Delivery note"]', 'Figma file shared'); await s.click('button:has-text("Deliver")'); await s.waitForSelector('text=Delivered; client notified');
    await c.waitForSelector('text=was delivered');
    await c.click('.next button:has-text("Accept & release")'); await wait(c); await c.click('.modal .mf button:has-text("Accept & release")'); await c.waitForSelector('text=released to');
    await c.waitForSelector('text=How was working with'); step('delivery accepted → review requested');
    await c.click('button[aria-label="5 stars"]'); await c.fill('textarea[placeholder="What did they do well?"]', 'Excellent'); await c.click('button:has-text("Submit review")'); await c.waitForSelector('text=Review saved'); step('review submitted');

    /* ---- messages: live both ways, edit, pin, search ---- */
    await c.goto(base + '/app#/hire/messages'); await c.click('.ml .li:has-text("Liis Tamm")'); await c.waitForSelector('#msgin');
    await c.fill('#msgin', 'Hello from the client'); await c.keyboard.press('Enter'); await c.waitForSelector('.bub.me:has-text("Hello from the client")');
    await c.focus('#msgin'); await c.keyboard.press('ArrowUp'); await c.waitForSelector('.editbar'); await c.fill('#msgin', 'Hello from the client, edited'); await c.keyboard.press('Enter');
    await c.waitForSelector('.bub.me:has-text("edited")');
    await c.click('.bub.me:has-text("Hello from the client, edited")'); await c.click('.bubw.sel button[aria-label="Pin"]'); await c.waitForSelector('.pinbar');
    await c.click('button[aria-label="Pin chat"]'); await c.waitForSelector('.ml .sec:has-text("Pinned")'); step('message edited, message and chat pinned');
    await s.click('.tabsx button:has-text("Inbox")'); await wait(s); await s.click('.ml .li:has-text("Liis Tamm")'); await wait(s);
    await s.fill('textarea[placeholder="Reply…"]', 'Hi, Liis here'); await s.selectOption('.tf select', 'relay'); await s.click('.tf button:has-text("Send")'); await s.waitForSelector('text=Sent');
    await c.waitForSelector('.bub:has-text("Hi, Liis here")'); step('staff relay reply arrives live over WebSocket');
    await c.fill('.mlh input', 'Liis here'); await c.waitForSelector('.hit mark'); await c.fill('.mlh input', ''); step('message search');

    /* ---- voice call with the AfterWorc team ---- */
    await c.click('.ml .li:has-text("AfterWorc matching")'); await c.waitForSelector('button[aria-label="Voice call"]');
    await c.click('button[aria-label="Voice call"]'); await s.waitForSelector('.ring', { timeout: 10000 });
    await s.click('.ring button[aria-label="Answer"]');
    await c.waitForFunction(() => /\d+:\d\d/.test((document.querySelector('.callbox .who p') || {}).textContent || ''), null, { timeout: 20000 });
    await c.click('.callbox button[aria-label="Hang up"]'); await c.waitForSelector('.bub.sys:has-text("Voice call ·")'); step('voice call client ↔ staff connected and logged');

    /* ---- password needs repeat; 2FA; card ---- */
    await c.goto(base + '/app#/hire/settings/sec'); await wait(c);
    await c.click('.card:has-text("Two-factor authentication") button:has-text("Turn on")'); await c.waitForSelector('.qr svg');
    const secret = (await c.textContent('.modal .mono')).replace(/\s/g, '');
    await c.fill('.modal input[inputmode=numeric]', totp(secret)); await c.click('.modal .mf button:has-text("Turn on")'); await c.waitForSelector('text=On · authenticator app'); step('2FA turned on with a real TOTP code');
    await c.click('button:has-text("Change password")');
    await c.fill('.modal input[autocomplete=current-password]', 'e2e-password-123');
    const np = c.locator('.modal input[autocomplete=new-password]'); await np.nth(0).fill('e2e-password-456'); await np.nth(1).fill('e2e-password-45');
    await c.waitForSelector('text=The new passwords do not match'); await np.nth(1).fill('e2e-password-456');
    await c.fill('.modal input[inputmode=numeric]', totp(secret, 1)); await c.click('.modal .mf button:has-text("Change password")'); await c.waitForSelector('text=Password changed'); step('password change: repeat + 2FA');
    await c.goto(base + '/app#/hire/card'); await wait(c);
    await c.click('.cardhero button:has-text("Get my card")'); await wait(c); await c.click('.modal button:has-text("Continue")'); await wait(c); await c.click('.modal button:has-text("Continue")'); await wait(c);
    await c.check('.modal input[type=checkbox]'); await c.fill('.modal input[inputmode=numeric]', totp(secret, -1));
    await c.click('.modal button:has-text("Issue card")'); await c.waitForSelector('text=Your virtual card is ready');
    await c.goto(base + '/app#/hire/home'); await c.waitForSelector('button.pcard.link');
    assert.equal(await c.locator('button:has-text("Get my card")').count(), 0, 'no "Get my card" once the card exists');
    await c.click('button.pcard.link'); await c.waitForSelector('.qa'); step('card issued; dashboard card opens the card page');
    await c.click('.qa button:has-text("Details")'); await c.fill('.modal input[inputmode=numeric]', totp(secret)); await c.click('.modal .mf button:has-text("Show")');
    await c.waitForSelector('.copyrow'); await c.click('.copyrow button[aria-label^="Copy CVV"]');
    const cvv = await c.evaluate(() => navigator.clipboard.readText()); assert.match(cvv, /^\d{3}$/);
    await c.click('.copyrow button[aria-label^="Copy Card number"]'); assert.match(await c.evaluate(() => navigator.clipboard.readText()), /^5555\d{12}$/); step('card details revealed and copied (number, CVV)');
    await c.click('.qa button:has-text("Freeze")'); await c.waitForSelector('text=Card is frozen'); step('card frozen');

    /* ---- working mode: photo, skills with moderation, portfolio ---- */
    await c.click('.modesw button:has-text("Working")'); await c.waitForSelector('text=Finish your profile');
    await c.goto(base + '/app#/work/profile'); await wait(c);
    await c.setInputFiles('input[type=file][accept^="image"]', img); await c.waitForSelector('text=Photo updated');
    await c.fill('#pf-head', 'Product designer'); await c.selectOption('.field:has-text("Main profession") select', 'Backend Developer'); await c.fill('#pf-about', 'I design SaaS products.');
    await c.click('button:has-text("Save and continue")'); await c.waitForSelector('#skillin');
    await c.fill('#skillin', 'Figma'); await c.keyboard.press('Enter'); await c.fill('#skillin', 'Quantum ledgers'); await c.keyboard.press('Enter');
    await c.waitForSelector('.chip.pend:has-text("Quantum ledgers")');
    const w = await c.locator('.field + .chips .chip:has-text("Quantum ledgers")').boundingBox(); assert.ok(w.width > 120, 'skill tag grows with its text');
    await c.click('button:has-text("Save and continue")'); await c.waitForSelector('#pf-rate');
    await c.fill('#pf-rate', '50'); await c.click('button:has-text("Save and continue")'); await c.waitForSelector('text=Add work');
    await c.click('button:has-text("Add work")'); await c.setInputFiles('.imgpick + input[type=file]', img); await c.waitForSelector('.imgpick img');
    await c.fill('input[placeholder="e.g. Payment reconciliation dashboard"]', 'Landing for a fintech'); await c.click('button:has-text("Add to portfolio")'); await c.waitForSelector('.pfi:has-text("Landing for a fintech")');
    await c.click('button:has-text("Submit for review")'); await c.waitForSelector('text=Submitted · in review'); step('photo, pending skill, portfolio image, profile submitted');
    await s.goto(base + '/admin#skills'); await s.waitForSelector('input[value="Quantum ledgers"]');
    await s.click('tr:has(input[value="Quantum ledgers"]) button:has-text("Approve")'); await s.waitForSelector('text=Approved'); step('staff approved the new skill');
    await s.goto(base + '/admin#users'); await s.click('summary:has-text("e2e-client@example.com")');
    await s.locator('details[open] select').first().selectOption('checked'); await s.click('details[open] button:has-text("Verify / set level")'); await s.waitForSelector('text=Level saved'); step('staff verified the user');

    /* ---- language next to the theme ---- */
    await c.click('.avbtn'); await c.click('.menu .seg button:has-text("Русский")'); await c.waitForSelector('text=Главная');
    await c.click('.avbtn'); await c.click('.menu .seg button:has-text("Eesti")'); await c.waitForSelector('text=Avaleht');
    await c.click('.avbtn'); await c.click('.menu .seg button:has-text("English")'); await c.waitForSelector('text=Home'); step('language switch in the menu (RU, ET, EN)');

    /* ---- public site shows the logged-in state ---- */
    await c.goto(base + '/#home'); await c.waitForSelector('a.btn:has-text("Open account")'); await c.waitForSelector('text=We run the rest.'); step('public site: new headline, header knows the session');

    const bal = db.prepare("SELECT available, held FROM balances b JOIN users u ON u.id=b.user_id WHERE u.email='e2e-client@example.com' AND mode='hire'").get();
    assert.deepEqual(bal, { available: 0, held: 0 }, 'topped up exactly the missing amount, funded, released');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('\nBrowser E2E passed');
  } catch (e) {
    console.error('\nFAILED:', e.message, '\nPage errors:', errors); process.exitCode = 1;
  } finally { await browser.close(); server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); }
})();
