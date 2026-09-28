/* Legal pages: Terms, Privacy, Cookie notice, Cookie settings.
   Text is a working version for AfterWorc OÜ; have it reviewed by counsel before relying on it. */
const LEGAL_UPDATED='28 September 2026';
const CO=`AfterWorc OÜ, registry code 17554808, Mäealuse tn 10/2, Mustamäe linnaosa, 12618 Tallinn, Estonia (info@afterworc.com)`;
function legalPage(eyebrow,title,sections){
  return `<section class="hero" style="padding-block:44px 28px"><div class="wrap"><div style="display:grid;gap:12px;max-width:820px"><span class="mono">${eyebrow}</span><h1>${title}</h1><p class="muted">Last updated ${LEGAL_UPDATED}</p></div></div></section>
  <section class="sec" style="padding-top:12px"><div class="wrap" style="max-width:820px"><div class="stack" style="gap:28px">
  ${sections.map(([h,ps])=>`<div class="stack-s"><h3>${h}</h3>${ps.map(p=>`<p class="muted" style="font-size:15px">${p}</p>`).join('')}</div>`).join('')}
  <div class="banner">${ic('chat',16)}<span>Questions about this document? Write to <a href="mailto:info@afterworc.com">info@afterworc.com</a>.</span></div>
  </div></div></section>`;
}
function vTerms(){
  return legalPage('Legal','Terms and Conditions',[
    ['1. Who we are',[`The AfterWorc platform (afterworc.com) is operated by ${CO}. These Terms apply to everyone who creates an account: businesses that hire ("clients") and professionals who work ("specialists"). One account can do both.`]],
    ['2. Your account',['You must be at least 18 and able to enter contracts. Keep your password and two-factor device safe; you are responsible for activity on your account. When you act for a company, you confirm you may bind it.','We may suspend an account that breaks these Terms, the law, or puts other users at risk. You can close or delete your account in Settings at any time once open deals are finished.']],
    ['3. What AfterWorc does',['We check specialists (identity, skills, references and a live interview, as stated on each profile), match them to briefs, and provide the tools to agree, fund, deliver and accept work. The agreement for the work itself is between the client and the specialist (or, for departments and ready teams, as stated in the deal).','Verification levels describe what we checked and when. They are not a guarantee of any particular result.']],
    ['4. Deals, milestones and acceptance',['Scope, deadline and amount are fixed in the deal before work starts. A client funds a milestone before work on it begins; the money is held until the client accepts the delivery.','After a delivery, the client has 7 days to accept or request changes. If the client does neither, the delivery is accepted automatically and the money is released. Requests for changes must be specific; the review period restarts when the specialist resubmits.']],
    ['5. Fees and payments',['Posting a brief is free. The AfterWorc fee is included in quoted prices and shown on every deal; there is no contract fee. Specialist fees are shown in the account before a deal starts. Invoices are issued in euro with VAT where it applies.','Payment services, and the AfterWorc Mastercard® debit card, are provided by licensed partners under their own terms, which you accept when you use them. Until those services are live, balances shown in the account are a test ledger and no real money moves.']],
    ['6. Disputes',['Talk first. If you cannot agree, either side can ask AfterWorc to mediate from the deal page. A person reviews both sides and proposes a fair split within 2 business days; held money stays held meanwhile. Mediation is free and does not limit your legal rights.']],
    ['7. Conduct',['No fake identities, no taking deals off the platform to avoid fees, no harassment, no illegal or infringing work. Contact details are shared once a deal starts. Reviews must be honest; both sides\' reviews are published together.']],
    ['8. Intellectual property',['Unless the deal says otherwise, rights in the delivered work pass to the client when the milestone is paid. Specialists keep their pre-existing tools and know-how.']],
    ['9. Liability',['We provide the platform with reasonable skill and care. To the extent the law allows, we are not liable for indirect losses or for the work performed under a deal, and our total liability to you is limited to the fees you paid to AfterWorc in the 12 months before the claim. Nothing here limits liability that cannot be limited by law.']],
    ['10. Changes and law',['We may update these Terms; we show a notice in the account and ask you to accept material changes. Estonian law applies. Disputes go to Harju County Court, unless mandatory consumer rules give you another forum.']]
  ]);
}
function vPrivacy(){
  return legalPage('Legal','Privacy and Confidentiality Policy',[
    ['Controller',[`${CO} is the controller of personal data processed on afterworc.com.`]],
    ['What we collect',['Account data: e-mail, name, password (stored only as a salted hash), language and notification choices. Profile data for specialists: skills, rate, availability, work samples, verification results. Business data: company name, VAT number, billing details. Activity: briefs, deals, messages, files you upload, payments in the account, sign-in times, IP address and device type.']],
    ['Why we use it',['To run your account and deals (contract); to check specialists and prevent fraud (legitimate interest and, for identity checks, legal obligations); to keep accounting records and report platform income where the law requires it, for example DAC7 (legal obligation); to send product news only if you opt in (consent).']],
    ['Who sees it',['Clients see the public profile and verification level of specialists. Deal parties see each other\'s messages and deliveries. We use processors for hosting, e-mail and, when live, payments and card issuing, under data-processing agreements. Data is stored in the EU.']],
    ['How long we keep it',['Account data while the account is open. Deals, invoices and payment records for 7 years (Estonian Accounting Act). When you delete your account we erase or anonymise everything else within 30 days.']],
    ['Your rights',['You can access, correct, export (Settings › Privacy & data › Request a copy), restrict or delete your data, object to processing based on legitimate interest, and withdraw consent at any time. You can complain to the Estonian Data Protection Inspectorate (aki.ee).']],
    ['Confidentiality',['Briefs are shown only to the specialists we invite and to our matching team. Specialists must keep client information confidential; you can require our NDA before files are shared.']],
    ['Security',['Passwords are hashed with scrypt, sessions use secure HTTP-only cookies, and two-factor authentication protects payouts and card details. Tell us about any security concern at info@afterworc.com.']]
  ]);
}
function vCookies(){
  return legalPage('Legal','Cookie Notice',[
    ['What we use',['AfterWorc uses one strictly necessary cookie, aw_sid, to keep you logged in (HTTP-only, expires after 30 days of inactivity). Your theme, language and cookie choices are remembered in your browser\'s local storage.','We do not use analytics or advertising cookies. If we add them, they stay off until you allow them in Cookie settings.']],
    ['Fonts',['All fonts are served from afterworc.com itself. No third party receives your IP address when you load a page.']],
    ['Your choices',['Strictly necessary cookies cannot be switched off, because the account does not work without them. You can clear them in your browser at any time; you will be logged out. <a href="#cookiesettings">Open cookie settings</a>.']]
  ]);
}
function cookiePrefs(){try{return JSON.parse(localStorage.getItem('aw-cookies')||'{}')}catch(e){return{}}}
function vCookieSettings(){
  const c=cookiePrefs();
  const row=(k,t,d,locked)=>`<div class="ctl"><div><b style="font-weight:600;font-size:14px">${t}</b><div class="muted tiny">${d}</div></div>${locked?'<span class="pill ok">Always on</span>':`<button class="tgl ${c[k]?'on':''}" role="switch" aria-checked="${!!c[k]}" aria-label="${t}" data-act="cookietg" data-arg="${k}"></button>`}</div>`;
  return `<section class="sec"><div class="wrap" style="max-width:640px"><div class="card pad-l lift stack">
    <span class="mono">Legal</span><h2>Cookie settings</h2><p class="muted small">Choose which optional cookies AfterWorc may use on this device. We currently use none of the optional kinds, so switching them on changes nothing until we tell you otherwise.</p>
    <div>${row('necessary','Strictly necessary','Keeps you logged in. Required.',true)}${row('analytics','Analytics','Anonymous usage statistics.')}${row('marketing','Marketing','Measuring ads that brought you here.')}</div>
    <a class="btn link small" href="#cookies">Read the Cookie Notice</a></div></div></section>`;
}
