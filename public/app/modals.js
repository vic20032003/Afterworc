/* AfterWorc account: modals and actions */
'use strict';
function slots(n=6){
  const out=[];const d=new Date();d.setMinutes(0,0,0);
  while(out.length<n){d.setDate(d.getDate()+(out.length%2===0?1:0));const wd=d.getDay();if(wd===0||wd===6){d.setDate(d.getDate()+1);continue}
    for(const h of [10,15]){if(out.length>=n)break;const x=new Date(d);x.setHours(h,out.length%2?30:0);if(x>Date.now()+3600e3)out.push(x.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}
    d.setDate(d.getDate()+1)}
  return out;
}
const codeField=(label='Code from your authenticator app')=>`<label class="field"><span>${label}</span><input class="inp" id="m-code" data-bind="modal.code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digits" value="${esc(S.modal.code||'')}"></label>`;
const need2faBanner=()=>`<div class="banner am small">${ic('lock',16)}Turn on two-factor authentication first. It protects payouts, card details and PIN.</div>`;

function modalHtml(){
  const m=S.modal,d=D();const mk=(t,b,f,sub='')=>`<div class="scrim" data-act="scrim"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(un(t))}"><div class="mh"><div><h2>${t}</h2>${sub?`<p class="muted small" style="margin-top:4px">${sub}</p>`:''}</div><button class="x" data-act="closemodal" aria-label="Close">✕</button></div><div class="mb">${b}</div><div class="mf">${f}</div></div></div>`;
  const cancel='<button class="btn ghost" data-act="closemodal">Cancel</button>';
  const busy=S.busy?'disabled':'';
  const go2fa='<button class="btn g" data-act="go2fa">Turn on 2FA</button>';
  if(m.k==='need2fa')return mk('Two-factor authentication needed',need2faBanner(),cancel+go2fa);
  if(m.k==='topup'){const hire=S.mode==='hire';const meth=[['bank','Estonian bank link','Instant · no fee'],['sepa','SEPA transfer','1 business day · no fee'],['card','Debit or credit card','Instant'],['wallet','Apple Pay / Google Pay','Instant']];
    return mk('Top up '+(hire?d.acting+' balance':'your Working balance'),`${sandbox()}<label class="field"><span>Amount (€)</span><input class="inp" id="m-amt" inputmode="decimal" data-bind="modal.amt" value="${esc(String(m.amt))}"></label>
    <div class="amts">${(hire?[500,2000,5000,10000]:[50,100,250,500]).map(a=>`<button class="chip ${+m.amt===a?'on':''}" data-act="topamt" data-arg="${a}">${eur(a)}</button>`).join('')}</div>
    <label class="field" style="margin-top:14px"><span>Pay with</span></label><div class="opts">${meth.map(([k,t,x])=>`<button class="opt ${m.m===k?'on':''}" data-act="topm" data-arg="${k}"><b style="font-size:14px;margin:0">${t}</b><span>${x}</span></button>`).join('')}</div>
    ${m.m==='sepa'?`<div class="card pad-s" style="margin-top:12px"><div class="kv"><span>Recipient</span><span>AfterWorc OÜ</span><span>IBAN</span><span class="mono" style="text-transform:none">Shown when payments go live</span><span>Reference</span><span class="mono" style="text-transform:none">AW-${d.me.id}-${S.mode.toUpperCase()}</span></div></div>`:''}
    <p class="muted tiny" style="margin-top:12px">${hire?'Top-ups fund milestones and the company card. Held deal money is separate.':'Handy for card spending, or to cover a refund to a client. Withdraw what you don\'t use any time.'}</p>`,
    cancel+`<button class="btn g" data-act="dotopup" ${busy}>${m.m==='sepa'?'I\'ve sent it':'Add '+eur(+m.amt||0)}</button>`,hire?'Hiring mode':'Working mode')}
  if(m.k==='getcard'){const hire=S.mode==='hire';const c=d.cards[S.mode];const st=m.step||0;
    const prev=`<div class="pcard" style="max-width:260px;margin:0 auto 14px">${awCard({variant:m.kind==='virtual'?'virtual':hire?'company':'personal',name:m.name||'',org:hire?un(d.acting):'',last4:'0000',uid:'w'+(++_cu)})}</div>`;
    const steps=`<div class="muted tiny" style="text-align:center;margin-bottom:10px">Step ${st+1} of 3</div>`;
    if(st===0)return mk('Get your AfterWorc card',prev+steps+`<div class="opts"><button class="opt ${m.kind==='virtual'?'on':''}" data-act="gckind" data-arg="virtual"><b style="font-size:14px;margin:0">Virtual only</b><span>Ready in about a minute. Online and phone wallets.</span></button><button class="opt ${m.kind==='both'?'on':''}" data-act="gckind" data-arg="both"><b style="font-size:14px;margin:0">Virtual + physical</b><span>Virtual now, plastic card in 5–7 business days.</span></button></div>`,cancel+'<button class="btn g" data-act="gcnext">Continue</button>',hire?'Company card on the '+d.acting+' balance':'Personal card on your Working balance');
    if(st===1)return mk('Card details',prev+steps+`<label class="field"><span>Name on card</span><input class="inp" id="gc-name" maxlength="21" data-bind="modal.name" data-live value="${esc(m.name)}"><small>Up to 21 characters, as on your ID.</small></label>${hire?`<div class="kv" style="margin-bottom:12px"><span>Company on card</span><span>${d.acting}</span><span>Spends from</span><span>${d.acting} balance · ${eur(d.money.hire.available)}</span></div>`:`<div class="kv" style="margin-bottom:12px"><span>Spends from</span><span>Working balance · ${eur(d.money.work.available)}</span></div>`}${m.kind==='both'?`<label class="field"><span>Deliver to</span><input class="inp" id="gc-addr" data-bind="modal.addr" maxlength="200" value="${esc(m.addr)}" placeholder="Street, postcode, city"></label>`:''}`,'<button class="btn ghost" data-act="gcback">Back</button><button class="btn g" data-act="gcnext">Continue</button>');
    return mk('Confirm and issue',prev+steps+`<div class="feeline"><span>Card</span><span>Mastercard debit · ${m.kind==='both'?'virtual + physical':'virtual'}</span><span>Name</span><span>${esc((m.name||'').toUpperCase())}</span>${hire?`<span>Company</span><span>${d.acting}</span>`:''}<span>Currency</span><span>EUR</span><span class="tot">Fees</span><span class="tot">Per issuer price list</span></div>
      <label class="row small" style="margin-top:14px"><input type="checkbox" data-bind="modal.terms" data-live ${m.terms?'checked':''}> I accept the cardholder terms of the issuing partner</label>
      ${d.twofa?`<div style="margin-top:12px">${codeField()}</div>`:`<div style="margin-top:12px">${need2faBanner()}</div>`}`,
      '<button class="btn ghost" data-act="gcback">Back</button>'+(d.twofa?`<button class="btn g" data-act="doissuecard" ${m.terms&&!S.busy?'':'disabled'}>Issue card</button>`:go2fa));}
  if(m.k==='reveal')return mk(m.what==='pin'?'Show PIN':'Show card details',d.twofa?`${codeField()}<p class="muted tiny">Details stay visible for 30 seconds. Nobody from AfterWorc will ever ask for them.</p>`:need2faBanner(),cancel+(d.twofa?`<button class="btn g" data-act="doreveal" ${busy}>Show</button>`:go2fa));
  if(m.k==='pinshow')return mk('Your PIN',`<p style="font:700 34px 'IBM Plex Mono',monospace;letter-spacing:.3em;text-align:center">${esc(m.pin)}</p><p class="muted tiny" style="text-align:center">Closes in 10 seconds.</p>`,'<button class="btn g" data-act="closemodal">Done</button>');
  if(m.k==='limits'){const c=d.cards[S.mode];return mk('Card limits',`<div class="grid g2"><label class="field"><span>Per day (€)</span><input class="inp" id="limday" inputmode="numeric" data-bind="modal.day" value="${esc(m.day)}"></label><label class="field"><span>Per month (€)</span><input class="inp" id="limmon" inputmode="numeric" data-bind="modal.month" value="${esc(m.month)}"></label></div><label class="field"><span>ATM per day (€)</span><input class="inp" id="limatm" inputmode="numeric" data-bind="modal.atm" value="${esc(m.atm)}"><small>${c.tg.atm?'':'ATM withdrawals are switched off in Controls.'}</small></label>${d.twofa?codeField('2FA code (needed only to raise a limit)'):''}<p class="muted tiny">Lower limits apply at once. Higher limits need your 2FA code.</p>`,cancel+`<button class="btn g" data-act="dolimits" ${busy}>Save limits</button>`)}
  if(m.k==='orderphys')return mk('Order a physical card',`<label class="field"><span>Deliver to</span><input class="inp" id="op-addr" data-bind="modal.addr" maxlength="200" value="${esc(m.addr||'')}" placeholder="Street, postcode, city"></label><p class="muted small">Same number as your virtual card. Arrives in 5–7 business days. Activate it here when it arrives.</p>`,cancel+`<button class="btn g" data-act="doorderphys" ${busy}>Order card</button>`);
  if(m.k==='lost')return mk('Report lost or stolen',`<p class="small">We froze the card while you decide. Nothing can be paid with it now.</p><div class="opts" style="margin-top:12px"><button class="opt ${m.o==='keep'?'on':''}" data-act="losto" data-arg="keep"><b style="font-size:14px;margin:0">Keep it frozen</b><span>I might still find it</span></button><button class="opt ${m.o==='replace'?'on':''}" data-act="losto" data-arg="replace"><b style="font-size:14px;margin:0">Block and replace</b><span>New number; subscriptions need the new one</span></button></div><p class="muted tiny" style="margin-top:10px">See a payment you don't recognise? Tell us in Help and we open a chargeback.</p>`,'<button class="btn ghost" data-act="closemodal">Close</button>'+`<button class="btn g" data-act="dolost" ${busy}>${m.o==='replace'?'Block and send new card':'Keep frozen'}</button>`);
  if(m.k==='fund'){const x=d.deals.find(y=>y.id===m.d);const ms=x&&x.ms.find(y=>y.id===m.i);if(!ms||ms.st!=='unfunded')return '';const short=d.money.hire.available<ms.amt;return mk('Fund: '+ms.n,`<p><b>${ms.n}</b> with ${P(x.with).name}</p><div class="feeline" style="margin-top:12px"><span>Milestone</span><span>${eur(ms.amt)}</span><span>AfterWorc fee</span><span>included</span><span>Contract fee</span><span>€0</span><span class="tot">Charged now</span><span class="tot">${eur(ms.amt)}</span></div><p class="small" style="margin-top:12px">From your balance (${eur(d.money.hire.available)} available). Held until you accept the delivery.</p>${short?`<div class="banner am small" style="margin-top:10px">${ic('money',16)}<span>Not enough balance. Top up ${eur(ms.amt-d.money.hire.available)} first.</span></div>`:''}`,cancel+(short?`<button class="btn g" data-act="topup" data-arg="${ms.amt-d.money.hire.available}">Top up</button>`:`<button class="btn g" data-act="dofund" ${busy}>Fund ${eur(ms.amt)}</button>`))}
  if(m.k==='accept'){const x=d.deals.find(y=>y.id===m.d);const ms=x&&x.ms.find(y=>y.st==='delivered');if(!ms)return '';return mk('Accept and release '+eur(ms.amt)+'?',`<p>${P(x.with).name} gets paid. This can't be undone.</p><label class="row small" style="margin-top:14px"><input type="checkbox" data-bind="modal.thanks" ${m.thanks?'checked':''}> Also send a thank-you note</label>`,cancel+`<button class="btn g" data-act="doaccept" ${busy}>Accept &amp; release</button>`)}
  if(m.k==='changes')return mk('Request changes',`<label class="field"><span>What should change?</span><textarea class="inp" id="m-text" data-bind="modal.text" maxlength="3000" placeholder="Be specific: which screen, what's missing, examples">${esc(m.text||'')}</textarea><small>The 7-day review clock restarts when they resubmit. Money stays held.</small></label>`,cancel+`<button class="btn g" data-act="dochanges" ${busy}>Send request</button>`);
  if(m.k==='deliver')return mk('Submit delivery',`<label class="field"><span>Files</span><label class="btn ghost sm" style="cursor:pointer">${ic('file',14)}Attach files<input type="file" hidden multiple data-upload="deliver"></label><div class="filelist">${(m.files||[]).map(f=>`<span class="chip">${ic('file',13)} ${esc(f.name)}</span>`).join('')}</div><small>Up to 5 files, 15 MB each. Put links in the note.</small></label><label class="field"><span>Note for the client</span><textarea class="inp" id="m-text" data-bind="modal.text" maxlength="4000" placeholder="What is done, how to test it, anything open">${esc(m.text||'')}</textarea></label><div class="banner small">${ic('clock',16)}The client has 7 days to accept. Then the money is released to you.</div>`,cancel+`<button class="btn g" data-act="dodeliver" ${busy}>Submit</button>`);
  if(m.k==='issue')return mk('Open an issue',`<div class="stack"><div class="card pad-s"><b>1. Talk first</b><p class="muted small">Most issues are solved in messages within a day.</p>${(d.deals.find(y=>y.id===m.d)||{}).threadId?`<button class="btn ghost sm" style="margin-top:8px" data-go="messages" data-arg="${d.deals.find(y=>y.id===m.d).threadId}">Go to messages</button>`:''}</div><div class="card pad-s"><b>2. Ask AfterWorc to mediate</b><p class="muted small">A person reviews both sides and proposes a fair split within 2 business days. Free. Money stays held meanwhile.</p><label class="field" style="margin-top:10px"><span>What went wrong?</span><textarea class="inp" id="m-text" data-bind="modal.text" maxlength="4000">${esc(m.text||'')}</textarea></label></div></div>`,cancel+`<button class="btn danger" data-act="doissue" ${busy}>Ask for mediation</button>`);
  if(m.k==='withdraw')return mk('Withdraw '+eur(d.money.work.available),`<div class="feeline"><span>To</span><span>${d.tax.iban?d.tax.iban.slice(0,4)+'•• ••'+d.tax.iban.slice(-2):'Add a payout account first'}</span><span>Fee</span><span>€0</span><span class="tot">Arrives</span><span class="tot">1–2 business days</span></div>${!d.tax.iban?`<div class="banner am small" style="margin-top:12px">${ic('money',16)}<span>Add your IBAN in Settings › Tax &amp; invoicing.</span></div>`:d.twofa?`<div style="margin-top:12px">${codeField()}</div>`:`<div style="margin-top:12px">${need2faBanner()}</div>`}`,cancel+(!d.tax.iban?'<button class="btn g" data-go="settings" data-arg="tax">Add IBAN</button>':d.twofa?`<button class="btn g" data-act="dowithdraw" ${busy}>Withdraw</button>`:go2fa));
  if(m.k==='startdeal'){const p=P(m.p);return mk('Start a deal with '+p.name,`<div class="opts">${[['hourly','Hourly','Weekly report · billed per block'],['monthly','Monthly','Team or department · one invoice'],['fixed','Fixed milestones','Agree scope + amounts']].map(([k,t,x])=>`<button class="opt ${m.model===k?'on':''}" data-act="dmodel" data-arg="${k}"><b style="font-size:14px;margin:0">${t}</b><span>${x}</span></button>`).join('')}</div>
    <label class="field" style="margin-top:14px"><span>Start date</span><input class="inp" id="sd-start" data-bind="modal.startDate" maxlength="40" value="${esc(m.startDate)}"></label>
    <div class="grid g2"><label class="field"><span>${m.model==='monthly'?'First month':'First milestone'}</span><input class="inp" id="sd-first" data-bind="modal.first" maxlength="120" value="${esc(m.first)}"></label><label class="field"><span>Amount (€)</span><input class="inp" id="sd-amt" inputmode="numeric" data-bind="modal.amount" value="${esc(m.amount)}"><small>${p.rate?'Their rate: '+eur(p.rate)+' / h':p.monthly?'Their price: '+eur(p.monthly)+' / mo':''}</small></label></div>
    <div class="feeline"><span>Fee</span><span>Included · €0 contract fee</span><span>Signed as</span><span>${d.acting}</span></div>`,cancel+`<button class="btn g" data-act="dostartdeal" ${busy}>Send terms</button>`,`${p.name} accepts, you fund, work starts.`)}
  if(m.k==='call'){const p=m.p&&m.p!=='x'?P(m.p):null;const ss=slots();return mk('Book a 15-minute call'+(p?' with '+p.name:''),`<div class="chips">${ss.map(s=>`<button class="chip ${m.slot===s?'on':''}" data-act="pickslot" data-arg="${s}">${s}</button>`).join('')}</div><p class="muted small" style="margin-top:12px">Times are in your time zone. The video link comes in the calendar invite.</p>`,cancel+`<button class="btn g" data-act="docall" ${m.slot&&!S.busy?'':'disabled'}>Book</button>`)}
  if(m.k==='request'){const p=P(m.p);return mk('Request a proposal from '+p.name,`<label class="field"><span>What do you need?</span><textarea class="inp" id="m-text" data-bind="modal.need" maxlength="2000" placeholder="One or two lines is enough">${esc(m.need||'')}</textarea></label><div class="grid g2"><label class="field"><span>Budget</span><select class="inp" data-bind="modal.budget">${['€1–5k','€5–15k','Hourly','Not sure'].map(x=>`<option ${m.budget===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Start</span><select class="inp" data-bind="modal.start">${['ASAP','Within 2 weeks','Within a month'].map(x=>`<option ${m.start===x?'selected':''}>${x}</option>`).join('')}</select></label></div><p class="muted tiny">Starts a conversation and a brief in one go.</p>`,cancel+`<button class="btn g" data-act="dorequest" ${busy}>Send request</button>`)}
  if(m.k==='leave')return mk('Close or delete your account',`<div class="opts"><button class="opt ${m.how==='close'?'on':''}" data-act="leaveh" data-arg="close"><b style="font-size:14px;margin:0">Close</b><span>Access ends; legal records kept</span></button><button class="opt ${m.how==='delete'?'on':''}" data-act="leaveh" data-arg="delete"><b style="font-size:14px;margin:0">Delete</b><span>Everything erased except what law requires</span></button></div><label class="field" style="margin-top:14px"><span>Type ${m.how.toUpperCase()} to confirm</span><input class="inp" id="lv-c" data-bind="modal.confirm" value="${esc(m.confirm||'')}"></label><label class="field"><span>Your password</span><input class="inp" id="lv-pw" type="password" data-bind="modal.password" autocomplete="current-password"></label>`,cancel+`<button class="btn danger" data-act="doleave" ${busy}>${m.how==='close'?'Close account':'Delete account'}</button>`);
  if(m.k==='twofa')return mk('Turn on two-factor authentication',`<ol class="small" style="padding-left:18px;line-height:1.8;margin:0 0 12px"><li>Open an authenticator app (Google Authenticator, 1Password, Authy…)</li><li>Scan the code, or enter the key by hand</li><li>Type the 6-digit code it shows</li></ol><div style="text-align:center"><span class="qr">${m.qr}</span><p class="mono" style="text-transform:none;margin-top:8px;color:var(--ink)">${esc(m.secret)}</p></div>${codeField()}`,cancel+`<button class="btn g" data-act="dotwofa" ${busy}>Turn on</button>`);
  if(m.k==='twofaoff')return mk('Turn off two-factor authentication',`<p class="small" style="margin-bottom:12px">Payouts and card details are blocked until you turn it on again.</p>${codeField()}`,cancel+`<button class="btn danger" data-act="dotwofaoff" ${busy}>Turn off</button>`);
  if(m.k==='pw')return mk('Change password',`<label class="field"><span>Current password</span><input class="inp" id="pw-c" type="password" data-bind="modal.current" autocomplete="current-password"></label><label class="field"><span>New password</span><input class="inp" id="pw-n" type="password" data-bind="modal.next" autocomplete="new-password"><small>At least 10 characters. Other sessions are signed out.</small></label>`,cancel+`<button class="btn g" data-act="dopw" ${busy}>Change password</button>`);
  if(m.k==='email')return mk('Change e-mail',`<label class="field"><span>New e-mail</span><input class="inp" id="em-e" type="email" data-bind="modal.email" value="${esc(m.email||'')}" autocomplete="email"></label><label class="field"><span>Your password</span><input class="inp" id="em-p" type="password" data-bind="modal.password" autocomplete="current-password"><small>We send a confirmation link to the new address.</small></label>`,cancel+`<button class="btn g" data-act="doemail" ${busy}>Send confirmation</button>`);
  if(m.k==='name')return mk('Change name',`<label class="field"><span>Your name</span><input class="inp" id="nm" data-bind="modal.name" maxlength="80" value="${esc(m.name||'')}"></label>`,cancel+`<button class="btn g" data-act="doname" ${busy}>Save</button>`);
  if(m.k==='addms')return mk('Add '+(m.dept?'a month':'a milestone'),`<div class="grid g2"><label class="field"><span>Name</span><input class="inp" id="am-n" data-bind="modal.name" maxlength="120" value="${esc(m.name||'')}" placeholder="${m.dept?'December':'e.g. Developer handoff'}"></label><label class="field"><span>Amount (€)</span><input class="inp" id="am-a" inputmode="numeric" data-bind="modal.amount" value="${esc(m.amount||'')}"></label></div><p class="muted tiny">The specialist sees it right away. You fund it when you're ready.</p>`,cancel+`<button class="btn g" data-act="doaddms" ${busy}>Add</button>`);
  if(m.k==='text')return mk(m.title,`<label class="field"><span>${m.label}</span><textarea class="inp" id="m-text" data-bind="modal.text" maxlength="3000" placeholder="${m.ph||''}">${esc(m.text||'')}</textarea></label>`,cancel+`<button class="btn g" data-act="dotext" ${busy}>${m.btn||'Send'}</button>`);
  if(m.k==='idcheck')return mk('Verify your identity',`<p class="small">Upload a clear photo or scan of your ID card or passport (front, and back for ID cards). We check it by hand within 1 business day and delete the image after the check, keeping only the result.</p><label class="btn ghost" style="cursor:pointer;margin-top:14px">${ic('file',15)}${m.file?'Change file':'Choose file'}<input type="file" hidden accept="image/*,application/pdf" data-upload="id"></label>${m.file?`<p class="small" style="margin-top:8px">${ic('check',14)} ${esc(m.file.name)}</p>`:''}`,cancel+`<button class="btn g" data-act="doidcheck" ${m.file&&!S.busy?'':'disabled'}>Submit</button>`);
  if(m.k==='refs')return mk('Add two references',`<p class="small muted" style="margin-bottom:12px">Past clients or managers who can speak about your work. We call them; nobody else sees their details.</p>${[0,1].map(i=>`<div class="grid g3"><label class="field"><span>Name</span><input class="inp" id="rf-n${i}" data-bind="modal.refs.${i}.name" maxlength="80" value="${esc(m.refs[i].name)}"></label><label class="field"><span>E-mail</span><input class="inp" id="rf-e${i}" type="email" data-bind="modal.refs.${i}.email" value="${esc(m.refs[i].email)}"></label><label class="field"><span>Company</span><input class="inp" id="rf-c${i}" data-bind="modal.refs.${i}.company" maxlength="80" value="${esc(m.refs[i].company)}"></label></div>`).join('')}`,cancel+`<button class="btn g" data-act="dorefs" ${busy}>Send</button>`);
  if(m.k==='interview'){const ss=slots(8);return mk('Book your interview',`<p class="small muted" style="margin-bottom:12px">30 minutes with our team: in person at Mäealuse 10/2, Tallinn, or by video.</p><div class="chips">${ss.map(s=>`<button class="chip ${m.slot===s?'on':''}" data-act="pickslot" data-arg="${s}">${s}</button>`).join('')}</div>`,cancel+`<button class="btn g" data-act="dointerview" ${m.slot&&!S.busy?'':'disabled'}>Book</button>`)}
  return '';
}

/* ================= actions ================= */
const deal=id=>D().deals.find(x=>x.id===id);
const A={
  mode:m=>{if(S.mode===m)return;S.mode=m;S.prof=null;act('mode',{mode:m},{quiet:true});go('home')},
  menu:k=>{S.menu=S.menu===k?null:k;render()},
  acting:id=>{S.menu=null;act('acting',{orgId:id||null})},
  theme:()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('aw-theme',r.dataset.theme)}catch(e){}S.menu=null;render()},
  logout:async()=>{try{await api('/auth/logout',{})}catch(e){}location.href='/'},
  tab:k=>{S.tab=k;render()},
  settab:k=>{S.set={};go('settings',k)},
  readall:()=>{S.menu=null;act('notif_readall',{mode:S.mode},{quiet:true})},
  notif:id=>{const n=D().notifs.find(x=>String(x.id)===String(id));if(!n)return;if(n.unread){n.unread=false;api('/account/action',{type:'notif_read',id:n.id}).catch(()=>{})}go(n.go[0],n.go[1])},
  closemodal:()=>{S.modal=null;render()},scrim:()=>{S.modal=null;render()},
  go2fa:()=>{S.modal=null;go('settings','sec')},
  /* briefs */
  startbrief:t=>{S.wiz={...freshWiz(),type:t};go('newbrief')},
  wtype:t=>{S.wiz.type=t;render()},
  aiwrite:()=>{const w=S.wiz;if(!w.type)w.type='team';const x=draftText(w);w.title=x.title;w.desc=x.desc;w.ai=true;render()},
  warea:a=>{S.wiz.area=a;S.wiz.profs=[];S.wiz.pq='';render()},
  wprof:p=>{const l=S.wiz.profs;const i=l.indexOf(p);if(i>-1)l.splice(i,1);else if(l.length<3)l.push(p);else{toast('Up to 3 professions',true);return}render()},
  role:a=>{const[i,dd]=a.split('|').map(Number);const r=S.wiz.roles[S.wiz.area][i];r[1]=Math.max(0,Math.min(9,r[1]+dd));render()},
  wbudget:b=>{S.wiz.budget=b;render()},
  wstart:s=>{S.wiz.start=s;render()},
  wnext:()=>{const w=S.wiz;if(w.step===0&&!w.type)return;if(w.step===0&&!DEPTS[w.area]&&['team','dept'].includes(w.type))w.area='Development';w.step++;render();window.scrollTo({top:0})},
  wback:()=>{S.wiz.step--;render()},
  wsave:async()=>{const r=await act('brief_save',wizPayload());if(r&&r.id)S.wiz.id=r.id},
  wdelete:()=>{const id=S.wiz.id;S.wiz=freshWiz();act('brief_delete',{id})},
  wsend:async()=>{const r=await act('brief_send',wizPayload());if(r)S.wiz=freshWiz()},
  closebrief:id=>{if(confirm('Close this brief? We stop matching for it.'))act('brief_close',{id})},
  different:id=>{S.modal={k:'text',title:'Ask for different people',label:'What should change?',ph:'e.g. more senior, Estonian-speaking, lower rate',btn:'Send',run:t=>act('brief_different',{id,text:t})};render()},
  startdeal:a=>{const[b,p]=a.split('|');const sp=P(p);const monthly=!!sp.monthly||['team','dept'].includes((D().briefs.find(x=>x.id===b)||{}).type);
    const nextMonth=new Date(Date.now()+7*864e5).toLocaleString('en-GB',{month:'long'});
    S.modal={k:'startdeal',b,p,model:monthly?'monthly':sp.rate?'hourly':'fixed',startDate:new Date(Date.now()+7*864e5).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),first:monthly?nextMonth:'Weeks 1–2',amount:monthly?(sp.monthly||''):sp.rate?sp.rate*60:''};render()},
  dmodel:k=>{const m=S.modal;m.model=k;if(k==='monthly'&&!/^[A-Z][a-z]+$/.test(m.first))m.first=new Date(Date.now()+7*864e5).toLocaleString('en-GB',{month:'long'});render()},
  dostartdeal:()=>{const m=S.modal;act('deal_start',{briefId:m.b,specialistId:m.p,model:m.model,startDate:m.startDate,first:m.first,amount:m.amount})},
  /* deals */
  dealaccept:id=>act('deal_accept',{dealId:id}),
  dealdecline:id=>{if(confirm('Decline these terms?'))act('deal_decline',{dealId:id})},
  dealcancel:id=>{if(confirm('Withdraw these terms?'))act('deal_cancel',{dealId:id})},
  fund:a=>{const[dd,i]=a.split('|');S.modal={k:'fund',d:dd,i:+i};render()},
  dofund:()=>act('ms_fund',{dealId:S.modal.d,msId:S.modal.i}).then(r=>{if(r)S.modal=null,render()}),
  accept:id=>{S.modal={k:'accept',d:id,thanks:true};render()},
  doaccept:()=>act('ms_accept',{dealId:S.modal.d,thanks:S.modal.thanks}).then(r=>{if(r){S.modal=null;render()}}),
  changes:id=>{S.modal={k:'changes',d:id,text:''};render()},
  dochanges:()=>act('ms_changes',{dealId:S.modal.d,text:S.modal.text}).then(r=>{if(r){S.modal=null;render()}}),
  deliver:id=>{S.modal={k:'deliver',d:id,text:'',files:[]};render()},
  up_deliver:async files=>{try{const f=await upload(files);S.modal.files=[...(S.modal.files||[]),...f].slice(0,10);render()}catch(e){toast(e.message,true)}},
  dodeliver:()=>act('ms_deliver',{dealId:S.modal.d,note:S.modal.text,files:(S.modal.files||[]).map(f=>f.id)}).then(r=>{if(r){S.modal=null;render()}}),
  addms:id=>{S.modal={k:'addms',d:id,dept:(deal(id)||{}).kind==='dept',name:'',amount:(deal(id)||{}).monthly||''};render()},
  doaddms:()=>act('ms_add',{dealId:S.modal.d,name:S.modal.name,amount:S.modal.amount}).then(r=>{if(r){S.modal=null;render()}}),
  approve:id=>act('report_approve',{reportId:id}),
  query:id=>{S.modal={k:'text',title:'Ask about this report',label:'Your question',btn:'Send',run:t=>act('report_query',{dealId:id,text:t})};render()},
  teamchange:id=>{S.modal={k:'text',title:'Request a team change',label:'What should change?',ph:'Add a role, swap a person, or scale down',btn:'Send request',run:t=>act('request_change',{dealId:id,text:t})};render()},
  issue:id=>{S.modal={k:'issue',d:id,text:''};render()},
  doissue:()=>act('deal_issue',{dealId:S.modal.d,text:S.modal.text}).then(r=>{if(r){S.modal=null;render()}}),
  star:n=>{S.star=+n;render()},
  review:id=>act('deal_review',{dealId:id,stars:S.star,text:S.review.text,note:S.review.note}).then(r=>{if(r){S.star=0;S.review={text:'',note:''};render()}}),
  dotext:()=>{const m=S.modal;Promise.resolve(m.run(m.text||'')).then(r=>{if(r&&S.modal===m){S.modal=null;render()}})},
  /* money */
  topup:amt=>{S.menu=null;const need=+amt||0;S.modal={k:'topup',amt:need||(S.mode==='hire'?2000:100),m:'bank'};render()},
  topamt:a=>{S.modal.amt=+a;render()},
  topm:k=>{S.modal.m=k;render()},
  dotopup:()=>act('topup',{amount:S.modal.amt,method:S.modal.m}).then(r=>{if(r){S.modal=null;render()}}),
  withdraw:()=>{S.modal={k:'withdraw',code:''};render()},
  dowithdraw:()=>act('withdraw',{code:S.modal.code}).then(r=>{if(r){S.modal=null;render()}}),
  /* card */
  getcard:()=>{S.menu=null;S.modal={k:'getcard',step:0,kind:'virtual',name:un(D().cards[S.mode].name||D().me.name).toUpperCase().slice(0,21),addr:'',terms:false,code:''};render()},
  gckind:k=>{S.modal.kind=k;render()},
  gcnext:()=>{const m=S.modal;if(m.step===1&&!String(m.name).trim()){toast('Add the name on the card',true);return}if(m.step===1&&m.kind==='both'&&!String(m.addr).trim()){toast('Add a delivery address',true);return}m.step++;render()},
  gcback:()=>{S.modal.step--;render()},
  doissuecard:()=>{const m=S.modal;act('card_issue',{kind:m.kind,name:m.name,addr:m.addr,terms:m.terms,code:m.code})},
  freeze:()=>act('card_freeze'),
  cardside:()=>act('card_side',{},{quiet:true}),
  cardtg:k=>act('card_toggle',{k}),
  reveal:()=>{S.modal={k:'reveal',what:'details',code:''};render()},
  pin:()=>{S.modal={k:'reveal',what:'pin',code:''};render()},
  doreveal:async()=>{const m=S.modal;const r=await act('card_reveal',{what:m.what,code:m.code});if(!r||!r.reveal)return;
    if(m.what==='pin'){S.modal={k:'pinshow',pin:r.reveal.pin};render();setTimeout(()=>{if(S.modal&&S.modal.k==='pinshow'){S.modal=null;render()}},10000);return}
    S.modal=null;S.reveal={mode:S.mode,...r.reveal};render();toast('Details visible for 30 seconds');setTimeout(()=>{S.reveal=null;render()},30000)},
  limits:()=>{const c=D().cards[S.mode];S.modal={k:'limits',day:c.lim.day,month:c.lim.month,atm:c.lim.atm,code:''};render()},
  dolimits:()=>{const m=S.modal;act('card_limits',{day:m.day,month:m.month,atm:m.atm,code:m.code}).then(r=>{if(r){S.modal=null;render()}})},
  wallet:k=>act('card_wallet',{k}),
  orderphys:()=>{S.modal={k:'orderphys',addr:''};render()},
  doorderphys:()=>act('card_order',{addr:S.modal.addr}).then(r=>{if(r){S.modal=null;render()}}),
  activate:()=>act('card_activate'),
  lost:()=>{act('card_lost',{o:'freeze'},{quiet:true,keepModal:true});S.modal={k:'lost',o:'keep'};render()},
  losto:o=>{S.modal.o=o;render()},
  dolost:()=>act('card_lost',{o:S.modal.o}).then(r=>{if(r){S.modal=null;render()}}),
  up_receipt:async(files,el)=>{try{const f=await upload(files);await act('card_receipt',{txId:el.dataset.tx,fileId:f[0].id})}catch(e){toast(e.message,true)}},
  /* messages + calls */
  send:id=>{const i=document.getElementById('msgin');if(!i||!i.value.trim())return;const text=i.value.trim();i.value='';act('message_send',{threadId:id,text},{quiet:true}).then(()=>{const tb=document.getElementById('tb');if(tb)tb.scrollTop=1e6;document.getElementById('msgin')?.focus()})},
  call:p=>{S.modal={k:'call',p,slot:null};render()},
  pickslot:s=>{S.modal.slot=s;render()},
  docall:()=>act('book_call',{with:S.modal.p||'x',slot:S.modal.slot}).then(r=>{if(r){S.modal=null;render()}}),
  request:p=>{S.modal={k:'request',p,need:'',budget:'€1–5k',start:'ASAP'};render()},
  dorequest:()=>act('request_proposal',{specialistId:S.modal.p,need:S.modal.need,budget:S.modal.budget,start:S.modal.start}),
  /* opportunities */
  propose:id=>{const p=S.prop[id]||{};act('opp_propose',{id,rate:p.rate,start:p.start,note:p.note})},
  decline:id=>{if(confirm('Not for you? We\'ll tune your matches.'))act('opp_decline',{id})},
  /* profile + verification */
  skill:i=>{S.prof.skills.splice(+i,1);render()},
  skilladd:s=>{const l=S.prof.skills;if(l.length>=8){toast('Up to 8 skills',true);return}if(!l.includes(s))l.push(s);render()},
  addskill:()=>{const v=String(S.prof.skillq||'').trim();if(!v)return;S.prof.skillq='';A.skilladd(v.slice(0,40))},
  avail:a=>{S.prof.avail=a;render()},
  pnext:()=>{S.prof.step++;render()},
  pback:()=>{S.prof.step--;render()},
  psave:async()=>{const r=await act('profile_save',profPayload());if(r){const st=S.prof.step;S.prof=profDraft();S.prof.step=st;render()}},
  psubmit:async()=>{const r=await act('profile_save',profPayload());if(r){await act('profile_submit');S.prof=profDraft();S.prof.step=2;render()}},
  idcheck:()=>{S.modal={k:'idcheck',file:null};render()},
  up_id:async files=>{try{const f=await upload(files);S.modal.file=f[0];render()}catch(e){toast(e.message,true)}},
  doidcheck:()=>act('verify_id',{fileId:S.modal.file.id}).then(r=>{if(r){S.modal=null;render()}}),
  refs:()=>{S.modal={k:'refs',refs:[{name:'',email:'',company:''},{name:'',email:'',company:''}]};render()},
  dorefs:()=>act('verify_refs',{refs:S.modal.refs}).then(r=>{if(r){S.modal=null;render()}}),
  interview:()=>{S.modal={k:'interview',slot:null};render()},
  dointerview:()=>act('verify_interview',{slot:S.modal.slot}).then(r=>{if(r){S.modal=null;render()}}),
  /* settings */
  twofaon:async()=>{const r=await act('twofa_begin',{},{quiet:true,keepModal:true});if(r&&r.twofa){S.modal={k:'twofa',qr:r.twofa.qr,secret:r.twofa.secret,code:''};render()}},
  dotwofa:()=>act('twofa_confirm',{code:S.modal.code}).then(r=>{if(r){S.modal=null;render()}}),
  twofaoff:()=>{S.modal={k:'twofaoff',code:''};render()},
  dotwofaoff:()=>act('twofa_disable',{code:S.modal.code}).then(r=>{if(r){S.modal=null;render()}}),
  pwchg:()=>{S.modal={k:'pw',current:'',next:''};render()},
  dopw:()=>act('password_change',{current:S.modal.current,next:S.modal.next}).then(r=>{if(r){S.modal=null;render()}}),
  emailchg:()=>{S.modal={k:'email',email:'',password:''};render()},
  doemail:()=>act('email_change',{email:S.modal.email,password:S.modal.password}).then(r=>{if(r){S.modal=null;render()}}),
  namechg:()=>{S.modal={k:'name',name:un(D().me.name)};render()},
  doname:()=>act('profile_name',{name:S.modal.name}).then(r=>{if(r){S.modal=null;S.prof=null;render()}}),
  revoke:id=>act('sessions_revoke',{id}),
  saveprefs:()=>act('prefs_save',S.set.prefs).then(r=>{if(r){S.set.prefs=null;render()}}),
  savetax:()=>act('tax_save',S.set.tax).then(r=>{if(r){S.set.tax=null;render()}}),
  orgcreate:()=>{const o=S.set.org;act('org_create',{name:o.name,country:o.country,vat:o.vat}).then(r=>{if(r){S.set.org=null;render()}})},
  invite:id=>{const iv=S.set.org.inv[id];act('org_invite',{orgId:id,email:iv.email,role:iv.role}).then(r=>{if(r){iv.email='';render()}})},
  leave:()=>{S.modal={k:'leave',how:'close',confirm:'',password:''};render()},
  leaveh:h=>{S.modal.how=h;render()},
  doleave:()=>{const m=S.modal;act('account_close',{how:m.how,confirm:m.confirm,password:m.password})},
  helpsend:()=>act('help_send',{topic:S.help.topic,text:S.help.text}).then(r=>{if(r)S.help.text=''})
};
function wizPayload(){const w=S.wiz;return {id:w.id,btype:w.type,line:w.line,title:w.title||w.line,desc:w.desc||w.line,area:w.area,people:wizPeople(w),budget:w.budget||'Help me scope',start:w.start,options:w.opt}}
function profPayload(){const p=S.prof;return {name:p.name,city:p.city,headline:p.headline,profession:p.profession,about:p.about,area:p.area,skills:p.skills,rate:String(p.rate).replace(/[^\d]/g,''),hours:String(p.hours).replace(/[^\d]/g,''),avail:p.avail,portfolio:p.portfolio}}
