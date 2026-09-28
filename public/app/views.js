/* AfterWorc account: views. State strings are already escaped (see clean() in core.js). */
'use strict';
const TYPEL={task:'Task',person:'Specialist',team:'Ready team',dept:'Department'};
const typeIc=t=>t==='task'?'task':t==='person'?'user':t==='team'?'team':'dept';
const rateOf=p=>p.monthly?eur(p.monthly)+' / mo':p.rate?eur(p.rate)+' / h':'Rate on request';
const sandbox=()=>`<div class="sandbox">${ic('shield',15)}<span><b>Test mode.</b> Payments and the card run on the AfterWorc test ledger until our payment and issuing partners go live. No real money moves.</span></div>`;
const empty=(icn,t,p,btn='')=>`<div class="empty">${ic(icn,30)}<h3>${t}</h3><p>${p}</p>${btn}</div>`;
function greet(){const h=new Date().getHours();return h<5?'Good evening':h<12?'Good morning':h<18?'Good afternoon':'Good evening'}

/* ================= Card helpers ================= */
let _cu=0;
const cardVariant=m=>{const c=D().cards[m];return c.phys==='none'&&c.st==='active'?'virtual':(m==='hire'?'company':'personal')};
function cardSvg(m,o){const c=D().cards[m];o=o||{};const rv=S.reveal&&S.reveal.mode===m?S.reveal:null;
  return awCard(Object.assign({variant:o.variant||cardVariant(m),side:rv?'back':c.side,name:un(c.name)||un(D().me.name).toUpperCase(),org:m==='hire'?un(c.org||D().acting):'',last4:c.last4||'0000',exp:c.exp||'--/--',frozen:c.frozen&&c.st==='active',
  pan:rv&&rv.pan?rv.pan:'',cvc:rv&&rv.cvc?rv.cvc:'',uid:'u'+(++_cu)},o))}
const moneyTabs=()=>`<div class="tabsx">${[['money','Overview'],['card','Card']].map(([r,l])=>`<button class="${S.route===r?'on':''}" data-go="${r}">${l}${r==='card'&&D().cards[S.mode].st!=='active'?'<span class="c" style="background:var(--brand2);color:#fff">New</span>':''}</button>`).join('')}</div>`;
const physLabel=c=>({none:'Not ordered',shipping:'On its way · 5–7 business days',active:'Active'})[c.phys];
function cardMini(){
  const m=S.mode,c=D().cards[m];
  if(c.st!=='active')return `<div class="card"><div class="pcard" style="margin-bottom:12px">${cardSvg(m,{side:'front',frozen:false})}</div>
    <div class="row between"><h3>${m==='hire'?'Company card':'Your own card'}</h3><span class="pill ok">New</span></div>
    <p class="muted small" style="margin:4px 0 12px">${m==='hire'?'A Mastercard debit card on the '+D().acting+' balance for tools, ads and travel.':'Released earnings are spendable at once. No waiting for a bank transfer.'}</p>
    <div class="row wrapf"><button class="btn g sm" data-act="getcard">Get my card</button><button class="btn link small" data-go="card">How it works</button></div></div>`;
  return `<div class="card"><div class="row between"><h3>AfterWorc card</h3><span class="pill ${c.frozen?'wait':'ok'}">${c.frozen?'Frozen':'Active'}</span></div>
    <div class="row" style="margin-top:12px;align-items:center"><span class="pcard sm">${cardSvg(m,{side:'front'})}</span><div><b class="small">Mastercard debit ••${c.last4}</b><div class="muted tiny">Spends from Available · ${eur(D().money[m].available)}</div><div class="muted tiny">${eur(c.spent)} of ${eur(c.lim.month)} this month</div></div></div>
    <div class="row wrapf" style="margin-top:12px"><button class="btn ghost sm" data-act="freeze">${c.frozen?'Unfreeze':'Freeze'}</button><button class="btn ghost sm" data-act="topup">Top up</button><button class="btn ghost sm" data-go="card">Manage</button></div></div>`;
}

/* ================= HIRING · Home ================= */
function attention(){
  const d=D(),att=[];
  d.briefs.filter(b=>b.status==='shortlist').forEach(b=>att.push({ic:'brief',t:'Shortlist ready: '+b.title,s:`${b.shortlist.length} checked match${b.shortlist.length===1?'':'es'}${b.readyIn?' · ready in '+b.readyIn+' (promised 48 h)':''}`,btn:'Compare',go:'brief',p:b.id,pill:'<span class="pill ok">Ready</span>'}));
  d.deals.filter(x=>x.side==='hire').forEach(x=>{
    const dm=x.ms.find(m=>m.st==='delivered');
    if(dm)att.push({ic:'deal',t:'Review delivery: '+dm.n,s:`${x.title} · ${P(x.with).name} · ${eur(dm.amt)} held`,btn:'Review',go:'deal',p:x.id,pill:`<span class="clock">${ic('clock',14)}auto-accepts ${dm.dueIn}</span>`});
    const rp=x.reports&&x.reports.find(r=>r.st==='review');
    if(rp)att.push({ic:'team',t:'Approve weekly report: '+rp.w,s:x.title+' · '+rp.hrs+' h logged',btn:'Open',go:'deal',p:x.id,pill:`<span class="clock">${ic('clock',14)}${rp.due}</span>`});
    if(x.status==='active'&&!x.ms.some(m=>['funded','inprogress','delivered','changes'].includes(m.st))&&x.ms.some(m=>m.st==='unfunded'))att.push({ic:'money',t:'Fund the next milestone: '+x.title,s:`${P(x.with).name} is ready to start`,btn:'Fund',go:'deal',p:x.id,pill:'<span class="pill info">Next step</span>'});
    if(x.status==='done'&&x.review==='pending')att.push({ic:'star',t:'Leave a review for '+P(x.with).name,s:'Hidden until you both submit (14 days)',btn:'Review',go:'deal',p:x.id,pill:'<span class="pill">Optional</span>'});
  });
  return att;
}
function vHireHome(){
  const d=D(),att=attention(),nx=att[0];
  const hd=d.deals.filter(x=>x.side==='hire'&&['active','proposed'].includes(x.status));
  const mine=[...new Set(d.deals.filter(x=>x.side==='hire').map(x=>x.with))].slice(0,3);
  const suggest=mine.length?mine:Object.values(d.people).filter(p=>p.lv==='checked').slice(0,3).map(p=>p.id);
  return `
  ${head(`${greet()}, ${first(d.me.name)}`,'Here\'s what needs you today at '+d.acting+'.')}
  <div class="stack">
  ${nx?`<div class="next"><div style="position:relative;z-index:1"><span class="mono">Next step</span><h2>${nx.t}</h2><p>${nx.s}</p></div><button class="btn" data-go="${nx.go}" data-arg="${nx.p}">${nx.btn} ${ic('arrow',16,2.2)}</button></div>`
   :d.briefs.length?'':`<div class="next"><div style="position:relative;z-index:1"><span class="mono">Get started</span><h2>Post your first brief</h2><p>Describe what you need in one line. A person reads it and sends up to 3 checked matches within 48 hours.</p></div><button class="btn" data-go="newbrief">Start a brief ${ic('arrow',16,2.2)}</button></div>`}
  <div class="grid g4">
    <div class="stat"><span class="l">Active deals</span><b>${hd.length}</b><div class="h">${hd.filter(x=>x.kind==='dept').length} department · ${hd.filter(x=>x.kind!=='dept').length} other</div></div>
    <div class="stat"><span class="l">Waiting on you</span><b style="color:${att.length?'var(--amber)':'inherit'}">${att.length}</b><div class="h">${att.length?'see the list below':'all caught up'}</div></div>
    <div class="stat"><span class="l">Held until you release</span><b>${eur(d.money.hire.held)}</b><div class="h">safe until accepted</div></div>
    <div class="stat"><span class="l">Open briefs</span><b>${d.briefs.filter(b=>['matching','shortlist','review'].includes(b.status)).length}</b><div class="h">${d.briefs.filter(b=>b.status==='shortlist').length} shortlist ready</div></div>
  </div>
  <div class="split">
    <div class="stack">
      <div class="row between"><h2>Needs your attention</h2></div>
      ${att.length?`<div class="list">${att.map(a=>`<button class="li" data-go="${a.go}" data-arg="${a.p}"><span class="avatar alt sm">${ic(a.ic,15)}</span><span class="grow"><div class="t">${a.t}</div><div class="s">${a.s}</div></span><span class="r">${a.pill}<span class="btn ghost sm">${a.btn}</span></span></button>`).join('')}</div>`
       :`<div class="empty" style="padding:24px"><h3>You're all caught up</h3><p>Nothing is waiting on you. New deliveries and shortlists will show up here.</p></div>`}
      <h2 style="margin-top:20px">Start something new</h2>
      <div class="opts">
        ${[['task','task','A task','One job, fixed price'],['person','user','A specialist','Joins your team, hourly'],['team','team','A ready team','Lead + people who ship together'],['dept','dept','A department','A whole function, monthly']].map(o=>`<button class="opt" data-act="startbrief" data-arg="${o[0]}"><span class="ic">${ic(o[1],17)}</span><b>${o[2]}</b><span>${o[3]}</span></button>`).join('')}
      </div>
    </div>
    <div class="stack sticky">
      ${cardMini()}
      <div class="card"><h3>${mine.length?'Your specialists':'Checked specialists'}</h3><p class="muted small">${mine.length?'People you have worked with, one click to rehire':'Available to hire today'}</p>
        <div class="stack-s" style="margin-top:12px">${suggest.map(k=>{const p=P(k);return `<button class="li" style="border:0;padding:8px 0" data-go="pp" data-arg="${k}"><span class="avatar sm alt">${initials(p.name)}</span><span class="grow"><div class="t" style="font-size:13.5px">${p.name}</div><div class="s">${p.role}</div></span>${p.lv==='checked'?'<span style="color:var(--brand2)">'+sealSvg+'</span>':''}</button>`}).join('')}</div>
        <button class="btn link small" data-go="find">Browse all checked specialists</button></div>
      <div class="card" style="background:var(--mintbg);border-color:transparent"><h3 style="color:var(--brand)">How AfterWorc protects you</h3>
        <ul class="small" style="margin:10px 0 0;padding-left:18px;line-height:1.8"><li>Every specialist is <b>checked by a person</b></li><li>Money is held until you release it</li><li>7 days to review each delivery</li><li>One VAT invoice per month for departments</li></ul></div>
    </div>
  </div></div>`;
}

/* ================= Find specialists (inside the account) ================= */
function vFind(){
  const d=D(),area=S.tab||'All';
  const areas=['All',...new Set(Object.values(d.people).map(p=>p.area))];
  const list=Object.values(d.people).filter(p=>area==='All'||p.area===area);
  return `${head('Checked specialists','Every profile states what was checked, by whom and when.','',`<button data-go="home">Home</button> / Specialists`)}
  <div class="chips" style="margin-bottom:16px">${areas.map(a=>`<button class="chip ${a===area?'on':''}" data-act="tab" data-arg="${a}">${a==='All'?'All areas':a}</button>`).join('')}</div>
  ${list.length?`<div class="pgrid">${list.map(p=>`<button class="card stack-s" style="text-align:left;cursor:pointer" data-go="pp" data-arg="${p.id}"><div class="row"><span class="avatar ${p.lv==='checked'?'':'alt'}">${initials(p.name)}</span><div class="grow"><b>${p.name}</b><div class="muted small">${p.role}</div></div></div><div class="row between wrapf">${seal(p.lv)}<b class="small">${rateOf(p)}</b></div><div class="chips">${p.skills.slice(0,4).map(s=>`<span class="chip" style="padding:3px 10px">${s}</span>`).join('')}</div><div class="muted tiny">${p.avail} · ${p.city}</div></button>`).join('')}</div>`:empty('search','No one here yet','Try another area, or post a brief and we find people for you.','<button class="btn g" data-go="newbrief">Start a brief</button>')}`;
}

/* ================= HIRING · Briefs ================= */
const BST={draft:['Draft',''],review:['In review','info'],matching:['Matching','wait'],shortlist:['Shortlist ready','ok'],hired:['Hired','ok'],closed:['Closed','']};
function vBriefs(){
  const d=D(),tab=S.tab||'all';
  const tabs=[['all','All'],['draft','Drafts'],['matching','Matching'],['shortlist','Shortlist ready'],['hired','Hired'],['closed','Closed']];
  const inTab=(b,k)=>k==='all'||b.status===k||(k==='matching'&&b.status==='review');
  const list=d.briefs.filter(b=>inTab(b,tab));
  return `${head('Briefs','Everything you have asked for, with its status. Proposals and invitations live inside each brief.',`<button class="btn g" data-go="newbrief">${ic('plus',15,2.2)}Start a brief</button>`)}
  <div class="banner" style="margin-bottom:16px">${ic('clock',18)}<span>A person reads every brief and sends <b>up to 3 checked matches within 48 hours</b>.</span></div>
  <div class="tabsx">${tabs.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="tab" data-arg="${k}">${l}<span class="c">${d.briefs.filter(b=>inTab(b,k)).length}</span></button>`).join('')}</div>
  ${list.length?`<div class="list">${list.map(b=>`<button class="li" data-go="${b.status==='draft'?'newbrief':'brief'}" data-arg="${b.id}"><span class="avatar alt sm">${ic(typeIc(b.type),15)}</span><span class="grow"><div class="t">${b.title}</div><div class="s">${TYPEL[b.type]} · ${b.area} · ${b.budget}${b.sent?' · sent '+b.sent:''}</div></span><span class="r">${['review','matching'].includes(b.status)&&b.promised?`<span class="clock hide-m">${ic('clock',14)}by ${b.promised.split(',')[0]}</span>`:''}<span class="pill ${BST[b.status][1]}">${BST[b.status][0]}</span></span></button>`).join('')}</div>`
  :empty('brief','Nothing here yet','Describe what you need in one line. We turn it into a brief and find checked people.','<button class="btn g" data-go="newbrief">Start a brief</button>')}`;
}
function vBrief(id){
  const d=D(),b=d.briefs.find(x=>x.id===id);
  if(!b)return empty('brief','Brief not found','It may have been deleted.','<button class="btn g" data-go="briefs">All briefs</button>');
  const steps=['Sent','Read by a person','Matching','Shortlist ready','Hired'];
  const at={review:1,matching:2,shortlist:3,hired:4}[b.status]??0;
  const track=`<div class="track">${steps.map((s,i)=>`<div class="tp ${i<at||(b.status==='hired'&&i===4)?'done':i===at?'cur':''}">${s}</div>`).join('')}</div>`;
  const sup=d.threads.find(t=>t.kind==='support'&&t.mode==='hire');
  let body='';
  if(b.status==='review'||b.status==='matching'){
    body=`<div class="card"><div class="row" style="gap:14px;align-items:flex-start"><span class="avatar">${initials(b.matcher.name)}</span><div class="grow"><h3>${b.matcher.name} ${b.status==='review'?'is reading your brief':'is matching checked specialists'}</h3><p class="muted small">${b.matcher.role}</p>
      <p style="margin-top:10px">Your shortlist of up to 3 checked people arrives by <b>${b.promised}</b>. We'll notify you by e-mail and here.</p>
      <div class="row wrapf" style="margin-top:14px">${sup?`<button class="btn ghost sm" data-go="messages" data-arg="${sup.id}">${ic('msg',15)}Message ${first(b.matcher.name)}</button>`:''}<button class="btn ghost sm" data-act="closebrief" data-arg="${b.id}">Close brief</button></div></div></div></div>
      <div class="card"><h3>While you wait</h3><ul class="small" style="margin:8px 0 0;padding-left:18px;line-height:1.8"><li>Send files or links that help (current site, brand guide) in Messages</li><li>Tell us who decides and who signs (acting as <b>${b.signedAs}</b>)</li><li>Want to see people now? <button class="btn link small" data-go="find">Browse checked specialists</button></li></ul></div>`;
  } else if(b.status==='shortlist'||b.status==='hired'){
    const cands=b.shortlist.map((k,i)=>{const p=P(k);return `<div class="cand ${i===0?'top':''}">${i===0?`<span class="best">${esc(first(b.matcher.name).toUpperCase())}'S PICK</span>`:''}
      <div class="row"><span class="avatar ${i?'alt':''}">${initials(p.name)}</span><div class="grow"><h3 style="font-size:15px">${p.name}</h3><div class="muted small">${p.role}</div></div></div>
      ${seal(p.lv)}${p.checkedBy?`<div class="muted tiny">Checked by ${p.checkedBy} · ${p.checkedOn}</div>`:''}
      <div class="kv"><span>Rate</span><span>${rateOf(p)}</span><span>Availability</span><span>${p.avail}</span><span>Deals done</span><span>${p.deals}${p.rating?' · ★ '+p.rating:''}</span><span>Based in</span><span>${p.city||'EU'}</span></div>
      ${b.why[k]?`<div class="why"><b>Why matched:</b> ${b.why[k]}</div>`:''}
      <div class="row wrapf" style="margin-top:auto">${b.status==='shortlist'?`<button class="btn g sm grow" data-act="startdeal" data-arg="${b.id}|${k}">Start deal</button>`:''}<button class="btn ghost sm" data-act="call" data-arg="${k}">${ic('cal',14)}Call</button><button class="btn ghost sm" data-go="pp" data-arg="${k}">Profile</button></div></div>`}).join('');
    body=`${b.status==='hired'&&b.dealId?`<div class="banner">${ic('check',18)}<span>You started a deal from this brief. <button class="btn link small" data-go="deal" data-arg="${b.dealId}">Open the deal</button></span></div>`:''}
      <div class="row between wrapf"><h2>Your shortlist</h2><span class="muted small">${b.ready?'Ready '+b.ready:''} · by ${b.matcher.name}</span></div>
      <div class="compare">${cands}</div>
      ${b.status==='shortlist'?`<div class="card pad-s row between wrapf"><span class="small">Not quite right? Tell ${first(b.matcher.name)} what to change; a new shortlist arrives within 24 h.</span><button class="btn ghost sm" data-act="different" data-arg="${b.id}">Ask for different people</button></div>`:''}
      <div class="tabsx" style="margin-top:8px"><button class="on">Proposals received <span class="c">${b.proposals.length}</span></button></div>
      ${b.proposals.length?`<div class="list">${b.proposals.map(o=>`<div class="li"><span class="avatar alt sm">${initials(o.name)}</span><span class="grow"><div class="t">${o.name}</div><div class="s">${o.rate}${o.start?' · can start '+o.start:''} · "${o.note}"</div></span><span class="r">${b.status==='shortlist'?`<button class="btn g sm" data-act="startdeal" data-arg="${b.id}|${o.spec}">Start deal</button>`:''}<button class="btn ghost sm" data-go="pp" data-arg="${o.spec}">Profile</button></span></div>`).join('')}</div>`:'<div class="empty small" style="padding:20px">No other proposals. Only people we invite can send one.</div>'}`;
  } else if(b.status==='closed'){
    body=`<div class="banner">${ic('check',18)}<span>This brief is closed.</span></div>`;
  }
  return `${head(b.title,`${TYPEL[b.type]} · ${b.area} · ${b.budget} · start: ${b.start}`,`<span class="pill ${BST[b.status][1]}">${BST[b.status][0]}</span>`,`<button data-go="briefs">Briefs</button> / ${b.title}`)}
  <div class="stack"><div class="card">${track}</div>${body}
  <div class="card"><h3>The brief</h3><p style="margin-top:8px;white-space:pre-wrap">${b.desc||'—'}</p>${b.people?`<p class="small muted" style="margin-top:8px">People: ${b.people}</p>`:''}<div class="row wrapf small muted" style="margin-top:10px"><span>Visible to: ${b.options.visibility||'checked specialists we invite'}</span>·<span>Signed as ${b.signedAs}</span>${b.options.nda?'·<span>NDA required</span>':''}</div></div></div>`;
}

/* ================= HIRING · New brief wizard ================= */
const AREAS=['Development','Design','Marketing','Business Support','Content','Data & Infrastructure','Quality & Security'];
const PROFS={Development:['Backend Developer','Frontend Developer','Fullstack Developer','Mobile Developer','DevOps Engineer','QA Engineer','Team Lead'],Design:['UI/UX Designer','Product Designer','Graphic Designer','Brand Designer','Motion Designer'],Marketing:['Marketing Lead','SMM Manager','Content Writer','Performance Marketer','SEO Specialist'],'Business Support':['Project Manager','Product Manager','Business Analyst','Customer Support','Accountant'],Content:['Copywriter','Translator','Technical Writer','Video Editor'],'Data & Infrastructure':['Data Engineer','Data Analyst','Cloud Engineer','Database Administrator'],'Quality & Security':['QA Automation Engineer','Security Engineer','Penetration Tester']};
const DEPTS={Development:[['Team Lead',1],['Senior Developer',1],['Developer',1],['DevOps Engineer',1],['QA Engineer',1]],Marketing:[['Marketing Lead',1],['SMM Manager',1],['Content Writer',1],['Performance Marketer',1]],Design:[['Design Lead',1],['UI / UX Designer',1],['Graphic Designer',1]],'Business Support':[['Project Manager',1],['Operations Manager',1],['Customer Support',1],['Admin Assistant',1]]};
function loadDraft(id){
  const b=D()&&D().briefs.find(x=>x.id===id&&x.status==='draft');
  if(!b||S.wiz.id===id)return;
  S.wiz={...freshWiz(),id,type:b.type,line:un(b.title),title:un(b.title),desc:un(b.desc),ai:!!b.desc,area:b.area,budget:un(b.budget)||null,start:un(b.start)||'Within 2 weeks',opt:{...freshWiz().opt,...Object.fromEntries(Object.entries(b.options||{}).map(([k,v])=>[k,typeof v==='string'?un(v):v]))}};
}
function wizPeople(w){return w.type==='team'||w.type==='dept'?(w.roles[w.area]||[]).filter(r=>r[1]>0).map(r=>r[1]+'× '+r[0]).join(', '):w.profs.join(', ')}
function draftText(w){
  const what=w.line||`${TYPEL[w.type]||'Work'} in ${w.area}`;
  const who=wizPeople(w)||w.area;
  return {title:what.charAt(0).toUpperCase()+what.slice(1),desc:`Goal: ${what}.\nWho we need: ${who}.\nDeliverables: agreed milestones with a working result at each step, documentation and a handover.\nHow we work: ${w.type==='dept'||w.type==='team'?'one team lead, weekly report, one monthly invoice':w.type==='person'?'joins our team, weekly report, hourly':'fixed price per milestone'}.\nNice to have: experience with B2B and EU data rules.`};
}
function vNewBrief(){
  const w=S.wiz;const steps=['What you need','Who','Budget & timing','Review & send'];
  const bar=`<div class="wizbar">${steps.map((s,i)=>`<div class="${i===w.step?'cur':''}"><i class="${i<=w.step?'on':''}"></i><span>${i+1}. ${s}</span></div>`).join('')}</div>`;
  let body='';
  if(w.step===0){
    body=`<h2>What do you need done?</h2><p class="muted" style="margin:4px 0 16px">Pick one. You can change it later.</p>
    <div class="opts">${[['task','task','A task','One job with a clear result · fixed price'],['person','user','A specialist','Joins your team for weeks or months · hourly'],['team','team','A ready team','Lead + people who already work together'],['dept','dept','A department','A whole function, run for you · monthly']].map(o=>`<button class="opt ${w.type===o[0]?'on':''}" data-act="wtype" data-arg="${o[0]}"><span class="ic">${ic(o[1],17)}</span><b>${o[2]}</b><span>${o[3]}</span></button>`).join('')}</div>
    <label class="field" style="margin-top:18px"><span>Describe it in one line</span><input class="inp" id="w-line" data-bind="wiz.line" maxlength="200" value="${esc(w.line)}" placeholder="e.g. We need a client portal on top of our Go backend"></label>
    <button class="btn ghost sm" data-act="aiwrite">${ic('spark',15)}${w.ai?'Rewrite the draft':'Write the brief for me'}</button>
    ${w.ai?`<div class="card" style="margin-top:14px;background:var(--sunk)"><div class="row between"><h3>Draft brief</h3><span class="pill info">Drafted · a person reviews it</span></div>
      <label class="field" style="margin-top:10px"><span>Title</span><input class="inp" id="w-title" data-bind="wiz.title" maxlength="200" value="${esc(w.title)}"></label>
      <label class="field"><span>What needs to be done</span><textarea class="inp" id="w-desc" data-bind="wiz.desc" rows="6" maxlength="6000">${esc(w.desc)}</textarea></label></div>`:''}`;
  }
  if(w.step===1){
    const area=w.area;
    if(w.type==='team'||w.type==='dept'){
      const roles=w.roles[area]||(DEPTS[area]||DEPTS.Development).map(r=>[...r]);w.roles[area]=roles;
      body=`<h2>${w.type==='dept'?'Which department?':'Which team?'}</h2><p class="muted" style="margin:4px 0 16px">We suggest a standard line-up. Adjust the roles and headcount.</p>
      <div class="chips" style="margin-bottom:16px">${Object.keys(DEPTS).map(a=>`<button class="chip ${a===area?'on':''}" data-act="warea" data-arg="${a}">${a}</button>`).join('')}</div>
      <div class="card">${roles.map((r,i)=>`<div class="row between" style="padding:8px 0;border-top:${i?'1px solid var(--line)':'0'}"><span>${r[0]}${i===0?' <span class="pill ok">leads the team</span>':''}</span><span class="row"><button class="btn ghost sm" data-act="role" data-arg="${i}|-1" aria-label="Fewer">−</button><b style="width:18px;text-align:center">${r[1]}</b><button class="btn ghost sm" data-act="role" data-arg="${i}|1" aria-label="More">+</button></span></div>`).join('')}
      <div class="row between small" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)"><span class="muted">One team lead · one agreement · one invoice</span><b>${roles.reduce((a,r)=>a+r[1],0)} people</b></div></div>`;
    } else {
      const q=(w.pq||'').toLowerCase();
      const pool=q?Object.values(PROFS).flat().filter(p=>p.toLowerCase().includes(q)):(PROFS[area]||[]);
      body=`<h2>Which area?</h2><p class="muted" style="margin:4px 0 16px">Pick an area, then up to 3 professions.</p>
      <div class="chips" style="margin-bottom:16px">${AREAS.map(a=>`<button class="chip ${a===area?'on':''}" data-act="warea" data-arg="${a}">${a}</button>`).join('')}</div>
      <label class="field"><span>Professions (up to 3)</span><input class="inp" id="w-pq" data-bind="wiz.pq" data-live value="${esc(w.pq)}" placeholder="Search: React, DevOps, SEO…"></label>
      <div class="chips">${pool.map(p=>`<button class="chip ${w.profs.includes(p)?'on':''}" data-act="wprof" data-arg="${p}">${p}</button>`).join('')||'<span class="muted small">No match. Describe it in the brief instead.</span>'}</div>
      <p class="muted tiny" style="margin-top:8px">${w.profs.length}/3 selected${w.profs.length?': '+w.profs.join(', '):''}</p>`;
    }
  }
  if(w.step===2){
    const opts=w.type==='task'?['Under €1k','€1–5k','€5–15k','€15k+']:w.type==='person'?['€30–45 / h','€45–60 / h','€60–80 / h','€80+ / h']:['€5–10k / mo','€10–20k / mo','€20–40k / mo','€40k+ / mo'];
    const o=w.opt;
    body=`<h2>Budget &amp; timing</h2><p class="muted" style="margin:4px 0 16px">${w.type==='task'?'Fixed price, paid per milestone.':w.type==='person'?'Hourly, billed weekly with a report.':'Monthly, one invoice, weekly report from the team lead.'}</p>
    <label class="field"><span>Budget</span></label><div class="opts">${[...opts,'Not sure: help me scope'].map(x=>`<button class="opt ${w.budget===x?'on':''}" data-act="wbudget" data-arg="${x}" style="padding:12px"><b style="margin:0;font-size:14px">${x}</b></button>`).join('')}</div>
    <label class="field" style="margin-top:16px"><span>When should it start?</span></label><div class="chips">${['As soon as possible','Within 2 weeks','Within a month','Just exploring'].map(s=>`<button class="chip ${w.start===s?'on':''}" data-act="wstart" data-arg="${s}">${s}</button>`).join('')}</div>
    <details style="margin-top:18px" class="card pad-s"><summary style="cursor:pointer;font-weight:600">More options</summary><div style="margin-top:12px">
      <label class="field"><span>Preferred countries</span><select class="inp" data-bind="wiz.opt.countries">${['Anywhere in the EU','Estonia','Baltics','Nordics + Baltics'].map(x=>`<option ${o.countries===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Who can see it</span><select class="inp" data-bind="wiz.opt.visibility">${['Checked specialists + AfterWorc shortlist (recommended)','Only people I invite'].map(x=>`<option ${o.visibility===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Deadline</span><input class="inp" type="date" data-bind="wiz.opt.deadline" value="${esc(o.deadline)}"></label>
      <label class="row small"><input type="checkbox" data-bind="wiz.opt.nda" ${o.nda?'checked':''}> Specialists must sign our NDA before seeing files</label></div></details>`;
  }
  if(w.step===3){
    const who=wizPeople(w);
    const promised=new Date(Date.now()+48*3600e3).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    body=`<h2>Review &amp; send</h2><p class="muted" style="margin:4px 0 16px">A person on our matching team reads it first and may ask one or two questions.</p>
    <div class="card"><div class="kv" style="font-size:13.5px;grid-template-columns:140px 1fr"><span>Title</span><span style="text-align:left">${esc(w.title||w.line||'—')}</span><span>Type</span><span style="text-align:left">${TYPEL[w.type]||'-'}</span><span>Area</span><span style="text-align:left">${w.area}</span><span>People</span><span style="text-align:left">${esc(who||'-')}</span><span>Budget</span><span style="text-align:left">${esc(w.budget||'Help me scope')}</span><span>Start</span><span style="text-align:left">${esc(w.start)}</span><span>Visible to</span><span style="text-align:left">${esc(w.opt.visibility)}</span><span>Signed as</span><span style="text-align:left">${D().acting} <button class="btn link small" data-act="menu" data-arg="avatar">change</button></span></div></div>
    ${!w.title&&!w.desc?`<label class="field" style="margin-top:14px"><span>Anything else we should know? (optional)</span><textarea class="inp" id="w-desc2" data-bind="wiz.desc" maxlength="6000">${esc(w.desc)}</textarea></label>`:''}
    <div class="banner" style="margin-top:14px">${ic('clock',18)}<span>Your shortlist of up to 3 checked people: <b>by ${promised}</b> (48 h).</span></div>
    <div class="feeline" style="margin-top:14px"><span>Posting a brief</span><span>Free</span><span>AfterWorc fee when you hire</span><span>Included in quotes</span><span>Contract fee</span><span>€0</span></div>`;
  }
  const canNext=w.step===0?!!w.type:w.step===1?(w.type==='team'||w.type==='dept'?true:w.profs.length>0):true;
  return `${head(w.id?'Edit draft brief':'Start a brief','3 short steps · about 2 minutes','',`<button data-go="briefs">Briefs</button> / ${w.id?'Draft':'New brief'}`)}
  <div class="split"><div class="card" style="padding:24px">${bar}${body}
   <div class="row between" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line)">
     ${w.step?`<button class="btn ghost" data-act="wback">Back</button>`:`<span class="row">${w.type?`<button class="btn ghost" data-act="wsave">Save draft</button>`:''}${w.id?`<button class="btn link small" data-act="wdelete">Delete draft</button>`:''}</span>`}
     ${w.step<3?`<button class="btn g" data-act="wnext" ${canNext?'':'disabled'}>Continue ${ic('arrow',15,2.2)}</button>`:`<button class="btn g" data-act="wsend" ${S.busy?'disabled':''}>${ic('send',15)}Send brief</button>`}
   </div></div>
   <div class="stack sticky"><div class="card" style="background:var(--dark);color:var(--darkink);border:0"><span class="mono" style="color:#85d6ae">What happens next</span>
    <ol style="margin:12px 0 0;padding-left:18px;line-height:1.9;font-size:13.5px"><li>A person reads your brief (usually within 4 h)</li><li>We match only <b>checked</b> specialists</li><li>You get up to 3, side by side, in 48 h</li><li>Talk, then start a deal. Money is held until you release it.</li></ol></div></div></div>`;
}

/* ================= Deals ================= */
const MST={released:['Released','ok'],delivered:['Delivered · review','wait'],unfunded:['Not funded',''],funded:['Funded','info'],inprogress:['In progress','info'],changes:['Changes requested','wait'],proposed:['Waiting to accept','wait']};
function dealState(d){
  if(d.status==='proposed')return d.side==='hire'?['Waiting for them to accept','wait']:['Accept or decline','wait'];
  if(d.status==='declined')return['Declined',''];
  if(d.status==='cancelled')return['Withdrawn',''];
  if(d.status==='done')return d.review==='pending'&&d.side==='hire'?['Completed · review due','wait']:['Completed','ok'];
  if(needsMe(d))return d.side==='hire'?['Needs your review','wait']:['Delivery due','wait'];
  if(d.ms.some(m=>m.st==='delivered'))return['Waiting for client','info'];
  if(d.side==='hire'&&!d.ms.some(m=>['funded','inprogress','changes'].includes(m.st)))return['Fund to continue','info'];
  if(d.side==='work'&&!d.ms.some(m=>['funded','inprogress','changes'].includes(m.st)))return['Waiting for funding','info'];
  return['In progress','info'];
}
function party(d){return d.side==='hire'?P(d.with):{name:d.client,role:d.clientVerified?'Client · payment verified':'Client',lv:null}}
function vDeals(){
  const d=D(),tab=S.tab||'needs';
  const mine=d.deals.filter(x=>x.side===S.mode);
  const f={needs:x=>needsMe(x)||x.status==='proposed',active:x=>['active','proposed'].includes(x.status),done:x=>['done','declined','cancelled'].includes(x.status),all:()=>true};
  const tabs=[['needs','Needs you'],['active','Active'],['done','Completed'],['all','All']];
  const list=mine.filter(f[tab]);
  return `${head('Deals',S.mode==='hire'?'Every agreement: fixed-price, hourly and departments. One status and one deadline each.':'Work you are doing for clients. Deliver, get accepted, get paid.')}
  <div class="tabsx">${tabs.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="tab" data-arg="${k}">${l}<span class="c">${mine.filter(f[k]).length}</span></button>`).join('')}</div>
  ${list.length?`<div class="list">${list.map(x=>{const p=party(x);const st=dealState(x);const a=x.ms.find(m=>['delivered','inprogress','changes'].includes(m.st));
   return `<button class="li" data-go="deal" data-arg="${x.id}"><span class="avatar ${x.side==='hire'?'alt':''} sm">${initials(p.name)}</span><span class="grow"><div class="t">${x.title}</div><div class="s">${p.name} · ${x.model} · ${x.monthly?eur(x.monthly)+' / mo':eur(x.total)}</div></span><span class="r">${a&&a.st==='delivered'?`<span class="clock hide-m">${ic('clock',14)}${x.side==='hire'?'auto-accepts '+a.dueIn:'client reviewing'}</span>`:''}<span class="pill ${st[1]}">${st[0]}</span></span></button>`}).join('')}</div>`
  :empty('deal',tab==='needs'?'Nothing needs you right now':'No deals here',S.mode==='hire'?'Deals start from a shortlist or a specialist\'s profile.':'Deals start when a client accepts your proposal.',`<button class="btn g" data-go="${S.mode==='hire'?'newbrief':'opps'}">${S.mode==='hire'?'Start a brief':'See opportunities'}</button>`)}`;
}
function vDeal(id){
  const all=D().deals;const d=all.find(x=>x.id===id&&x.side===S.mode)||all.find(x=>x.id===id);
  if(!d)return empty('deal','Deal not found','','<button class="btn g" data-go="deals">All deals</button>');
  if(d.side!==S.mode){S.mode=d.side}
  const p=party(d);const st=dealState(d);const hire=d.side==='hire';
  let main='';
  if(d.status==='proposed'){
    main+=hire?`<div class="next"><div style="position:relative;z-index:1"><span class="mono">Waiting</span><h2>${p.name} is reviewing your terms</h2><p>Usually within 24 h. Nothing is charged until they accept and you fund milestone 1.</p></div><div class="row wrapf" style="position:relative;z-index:1">${d.threadId?`<button class="btn" data-go="messages" data-arg="${d.threadId}">Message</button>`:''}<button class="btn ghost" style="background:transparent;color:#e7f0eb;border-color:#2b4638" data-act="dealcancel" data-arg="${d.id}">Withdraw terms</button></div></div>`
      :`<div class="next"><div style="position:relative;z-index:1"><span class="mono">New deal · your answer</span><h2>${d.client} sent you terms</h2><p>${d.ms.map(m=>m.n+' · '+eur(m.amt)).join(' · ')}${d.start?' · start '+d.start:''}. Nothing starts until the client funds milestone 1.</p></div><div class="row wrapf" style="position:relative;z-index:1"><button class="btn" data-act="dealaccept" data-arg="${d.id}">Accept terms</button><button class="btn ghost" style="background:transparent;color:#e7f0eb;border-color:#2b4638" data-act="dealdecline" data-arg="${d.id}">Decline</button></div></div>`;
  }
  const a=d.ms.find(m=>m.st==='delivered')||d.ms.find(m=>m.st==='inprogress')||d.ms.find(m=>m.st==='changes');
  if(a&&hire&&a.st==='delivered')main+=`<div class="next"><div style="position:relative;z-index:1"><span class="mono">Your move · auto-accepts ${a.autoAt}</span><h2>${a.n} was delivered</h2><p>${eur(a.amt)} is held. Accept to release it, or ask for changes. If you do nothing for 7 days, it is accepted automatically.</p>${a.deliveryNote?`<p style="margin-top:8px;color:#e7f0eb;white-space:pre-wrap">"${a.deliveryNote}"</p>`:''}</div><div class="row wrapf" style="position:relative;z-index:1"><button class="btn" data-act="accept" data-arg="${d.id}">Accept &amp; release ${eur(a.amt)}</button><button class="btn ghost" style="background:transparent;color:#e7f0eb;border-color:#2b4638" data-act="changes" data-arg="${d.id}">Request changes</button></div></div>`;
  if(a&&!hire&&['inprogress','changes'].includes(a.st))main+=`<div class="next"><div style="position:relative;z-index:1"><span class="mono">${a.st==='changes'?'Changes requested':'Your move'}</span><h2>Deliver: ${a.n}</h2><p>${eur(a.amt)} is funded and held for you. When you submit, the client has 7 days to accept. Then you are paid.</p></div><button class="btn" data-act="deliver" data-arg="${d.id}">Submit delivery</button></div>`;
  if(a&&!hire&&a.st==='delivered')main+=`<div class="banner">${ic('clock',18)}<span>Delivered. The client has until <b>${a.autoAt}</b> to accept; after that it is accepted automatically.</span></div>`;
  if(a&&hire&&a.st==='changes')main+=`<div class="banner am">${ic('clock',18)}<span>Changes requested. ${p.name} has been notified; the review clock restarts when they resubmit.</span></div>`;
  if(hire&&d.status==='active'&&!a&&!d.ms.some(m=>m.st==='funded')&&d.ms.some(m=>m.st==='unfunded'))main+=`<div class="banner">${ic('money',18)}<span>Fund the next milestone when you're ready. The money is held until you accept the work.</span></div>`;
  if(d.kind!=='dept'||d.ms.length){
    main+=`<div class="card"><div class="row between"><h3>${d.kind==='dept'?'Months':'Milestones'}</h3><span class="muted small">${d.model} · ${eur(d.total)}</span></div>
     ${d.ms.map((m,i)=>`<div class="ms ${m.st==='released'?'done':['delivered','inprogress','changes'].includes(m.st)?'act':''}"><span class="n">${m.st==='released'?'✓':i+1}</span><div><b>${m.n}</b><div class="muted small">${m.note}</div>${m.files.length?`<div class="filelist">${m.files.map(f=>`<a class="chip" href="/api/account/files/${f.id}" style="text-decoration:none">${ic('file',13)} ${f.name}</a>`).join('')}</div>`:''}</div>
      <div class="acts"><b>${eur(m.amt)}</b><span class="pill ${(MST[m.st]||['',''])[1]}">${(MST[m.st]||[m.st])[0]}</span>${hire&&m.st==='unfunded'&&d.status==='active'?`<button class="btn sm g" data-act="fund" data-arg="${d.id}|${m.id}">Fund</button>`:''}</div></div>`).join('')}
     ${hire&&['active','proposed'].includes(d.status)?`<button class="btn link small" data-act="addms" data-arg="${d.id}">${ic('plus',14)} Add ${d.kind==='dept'?'a month':'a milestone'}</button>`:''}</div>`;
  }
  if(d.kind==='dept'){
    main+=`<div class="card"><div class="row between wrapf"><div><h3>Team</h3><p class="muted small">${d.month} · led by ${p.name}</p></div><div class="team">${d.team.map((t,i)=>`<span class="avatar sm ${i?'alt':''}" title="${i?t:P(t).name}">${initials(i?t:P(t).name)}</span>`).join('')}</div></div>
     <div class="row wrapf small" style="margin-top:10px;gap:14px"><span>${sealSvg} Checked by AfterWorc</span><span class="muted">One agreement · one monthly VAT invoice</span></div></div>
     <div class="card"><div class="row between"><h3>Weekly reports</h3><span class="muted small">Approve or query within 7 days</span></div>
     ${d.reports.length?d.reports.map(r=>`<div class="ms ${r.st==='approved'?'done':'act'}"><span class="n">${r.st==='approved'?'✓':'!'}</span><div><b>${r.w}</b><div class="small" style="margin-top:3px">${r.sum}</div><div class="muted tiny" style="margin-top:3px">${r.hrs} h logged by the team</div></div><div class="acts">${r.st==='review'&&hire?`<span class="clock">${ic('clock',14)}${r.due}</span><button class="btn sm g" data-act="approve" data-arg="${r.id}">Approve</button><button class="btn sm ghost" data-act="query" data-arg="${d.id}">Ask a question</button>`:`<span class="pill ${r.st==='approved'?'ok':'wait'}">${r.st==='approved'?'Approved':'In review'}</span>`}</div></div>`).join(''):'<p class="muted small" style="margin-top:8px">The first report arrives at the end of the first week.</p>'}</div>
     ${hire?`<div class="grid g2"><div class="card"><h3>This month</h3><div class="kv" style="margin-top:10px;font-size:13.5px"><span>Department fee</span><span>${eur(d.monthly)}</span><span>Invoice</span><span>Monthly (VAT)</span><span>Started</span><span>${d.start||d.created}</span></div></div>
     <div class="card"><h3>Change the team</h3><p class="muted small" style="margin:4px 0 10px">Add a role, swap a person, or scale down with 2 weeks' notice.</p><button class="btn ghost sm" data-act="teamchange" data-arg="${d.id}">Request a change</button></div></div>`:''}`;
  }
  if(d.status==='done'){
    main+=d.review==='pending'&&hire?`<div class="card"><h3>How was working with ${p.name}?</h3><p class="muted small" style="margin:4px 0 12px">Your review stays hidden until ${first(p.name)} submits theirs, or 14 days pass.</p>
      <div class="stars" id="stars">${[1,2,3,4,5].map(n=>`<button data-act="star" data-arg="${n}" class="${S.star>=n?'on':''}" aria-label="${n} stars">★</button>`).join('')}</div>
      <label class="field" style="margin-top:10px"><span>Public review</span><textarea class="inp" id="rv-text" data-bind="review.text" maxlength="2000" placeholder="What did they do well?">${esc(S.review.text)}</textarea></label>
      <label class="field"><span>Private note to AfterWorc (optional)</span><input class="inp" id="rv-note" data-bind="review.note" maxlength="2000" value="${esc(S.review.note)}" placeholder="Only our checking team sees this"><small>Feeds our re-check of this specialist. Never shown publicly.</small></label>
      <button class="btn g" data-act="review" data-arg="${d.id}" ${S.star?'':'disabled'}>Submit review</button></div>`
     :`<div class="banner">${ic('check',18)}<span>Completed and paid. ${d.review==='done'?'Reviews from both sides are published.':d.review==='submitted'?'Review submitted; it appears when both sides have reviewed.':''}</span></div>`;
  }
  if(['declined','cancelled'].includes(d.status))main+=`<div class="banner am">${ic('flag',18)}<span>${d.status==='declined'?'These terms were declined.':'These terms were withdrawn.'} Nothing was charged.</span></div>`;
  const fee=d.monthly||d.total;const feePct=D().feePct;
  const side=`<div class="card"><div class="row"><span class="avatar ${hire?'alt':''}">${initials(p.name)}</span><div class="grow"><b>${p.name}</b><div class="muted small">${p.role}</div></div></div><div style="margin-top:8px">${hire?seal(p.lv):d.clientVerified?`<span class="seal">${sealSvg}Payment verified</span>`:''}</div>
   <div class="row wrapf" style="margin-top:12px">${d.threadId?`<button class="btn ghost sm" data-go="messages" data-arg="${d.threadId}">${ic('msg',14)}Message</button>`:''}${hire?`<button class="btn ghost sm" data-go="pp" data-arg="${d.with}">Profile</button>`:''}</div></div>
   <div class="card"><h3>Money</h3><div class="feeline" style="margin-top:10px">${hire?`<span>Deal value</span><span>${eur(fee)}${d.monthly?' / mo':''}</span><span>AfterWorc fee</span><span>included</span><span>Contract fee</span><span>€0</span><span class="tot">You pay</span><span class="tot">${eur(fee)}${d.monthly?' / mo':''}</span>`:`<span>Deal value</span><span>${eur(fee)}</span><span>AfterWorc fee</span><span>${feePct?feePct+'%':'€0'}</span><span class="tot">You receive</span><span class="tot">${eur(fee*(1-feePct/100))}</span>`}</div>
   <p class="muted tiny" style="margin-top:8px">${hire?'Held until you release each milestone.':'Released to your Working balance when the client accepts.'}</p></div>
   ${['active','done'].includes(d.status)?`<div class="card"><h3>Something wrong?</h3><p class="muted small" style="margin:4px 0 10px">Talk first. If you can't agree, a person from AfterWorc mediates within 2 business days. The money stays held.</p><button class="btn ghost sm" data-act="issue" data-arg="${d.id}">${ic('flag',14)}Open an issue</button></div>`:''}`;
  return `${head(d.title,`${hire?'with':'for'} ${p.name} · ${d.model}`,`<span class="pill ${st[1]}">${st[0]}</span>`,`<button data-go="deals">Deals</button> / ${d.title}`)}
  <div class="split"><div class="stack">${main}</div><div class="stack sticky">${side}</div></div>`;
}

/* ================= Messages ================= */
function vMessages(id){
  const list=D().threads.filter(t=>t.mode===S.mode);
  const t=list.find(x=>x.id===id)||list[0];
  return `${head('Messages','Every conversation is tied to a brief, a deal or a profile, so nothing gets lost.',`<button class="btn ghost sm" data-go="help">${ic('help',15)}Contact support</button>`)}
  ${list.length?`<div class="msgs"><div class="ml">${list.map(x=>`<button class="li" data-go="messages" data-arg="${x.id}" style="${t&&x.id===t.id?'background:var(--mintbg)':''}"><span class="avatar sm ${x.kind==='support'?'':'alt'}">${initials(x.name)}</span><span class="grow"><div class="t" style="font-size:13.5px">${x.name}</div><div class="s">${x.sub}</div></span>${x.unread?'<span class="pill ok">New</span>':''}</button>`).join('')}</div>
  <div class="th"><div class="thh"><span class="avatar sm">${initials(t.name)}</span><div class="grow"><b>${t.name}</b><div class="muted tiny">${t.sub}</div></div>${t.specialist&&S.mode==='hire'?`<button class="btn ghost sm hide-m" data-go="pp" data-arg="${t.specialist}">Profile</button>`:''}<button class="btn ghost sm hide-m" data-act="call" data-arg="${t.specialist||'x'}">${ic('cal',14)}Book a call</button></div>
  <div class="tb" id="tb">${t.msgs.length?t.msgs.map(m=>m.f==='sys'?`<div class="bub sys">${m.t}</div>`:`<div class="bub ${m.f==='me'?'me':''}">${m.who&&m.f!=='me'?`<span class="who">${m.who}</span>`:''}${m.t}<span class="tm">${m.tm}</span></div>`).join(''):'<div class="bub sys">Write the first message.</div>'}</div>
  <div class="tf"><input class="inp" id="msgin" maxlength="4000" placeholder="Write a message… (contact details are shared after a deal starts)" autocomplete="off"><button class="btn g" data-act="send" data-arg="${t.id}" aria-label="Send">${ic('send',15)}</button></div></div></div>`
  :empty('msg','No conversations yet','Conversations start from a brief, a deal or a specialist\'s profile. You can always reach our team.','<button class="btn g" data-go="help">Contact support</button>')}`;
}

/* ================= Money ================= */
const txTable=tx=>tx.length?`<table class="tbl"><tbody>${tx.map(t=>`<tr><td class="muted">${t[0]}</td><td>${t[1]}</td><td class="muted">${t[3]}</td><td class="r" style="font-weight:600;color:${t[2]>0?'var(--brand2)':'inherit'}">${t[2]>0?'+':''}${eur(t[2])}</td></tr>`).join('')}</tbody></table>`:'<p class="muted small" style="padding:0 18px 18px">No activity yet.</p>';
function vMoneyHire(){
  const d=D(),m=d.money.hire,org=d.orgs.find(o=>o.id===d.actingOrgId),tax=d.tax;
  return `${head('Money','Balance, card, invoices and payment methods for '+d.acting+'.',`<button class="btn g" data-act="topup">${ic('plus',15,2.2)}Top up</button>`)}
  ${moneyTabs()}${sandbox()}
  <div class="grid g3">
    <div class="bal"><span class="l">Available</span><b>${eur(m.available)}</b><p>Funds new milestones and your company card.${m.pending?' '+eur(m.pending)+' on its way.':''}</p></div>
    <div class="bal dk"><span class="l">Held in deals</span><b>${eur(m.held)}</b><p>Released only when you accept work.</p></div>
    <div class="bal"><span class="l">Next invoice</span><b>${m.nextInvoice?eur(m.nextInvoice):'—'}</b><p>${m.nextInvoice?'1st of next month · departments':'Invoices are issued when you fund a milestone.'}</p></div>
  </div>
  <div class="split" style="margin-top:18px"><div class="stack">
    <div class="card" style="padding:0"><div class="row between" style="padding:16px 18px"><h3>Invoices</h3><a class="btn link small" href="/api/account/statement/hire" target="_blank" rel="noopener">Statement</a></div>
    ${m.inv.length?`<table class="tbl"><thead><tr><th>No.</th><th>Date</th><th>For</th><th class="r">Amount</th><th></th></tr></thead><tbody>${m.inv.map(i=>`<tr><td class="mono" style="text-transform:none">${i[0]}</td><td>${i[1]}</td><td>${i[2]}</td><td class="r">${eur(i[3])}</td><td class="r"><a class="btn ghost sm" href="/api/account/invoices/${encodeURIComponent(un(i[0]))}" target="_blank" rel="noopener">${ic('dl',14)}PDF</a></td></tr>`).join('')}</tbody></table>`:'<p class="muted small" style="padding:0 18px 18px">No invoices yet.</p>'}</div>
    <div class="card" style="padding:0"><div style="padding:16px 18px"><h3>Activity</h3></div>${txTable(m.tx)}</div>
  </div><div class="stack sticky">
    ${cardMini()}
    <div class="card"><h3>Pay with</h3><div class="stack-s" style="margin-top:10px"><div class="row"><span class="pill ok">Default</span><span class="small">Estonian bank link (LHV, Swedbank, SEB)</span></div><div class="row"><span class="pill">Backup</span><span class="small">SEPA transfer · reference AW-${d.me.id}-HIRE</span></div></div><button class="btn link small" data-act="topup">Top up by card or wallet</button></div>
    <div class="card"><h3>Billing details</h3><div class="kv" style="margin-top:10px"><span>Bill to</span><span>${d.acting}</span><span>Country</span><span>${org?org.country:(tax.country||'Estonia')}</span><span>VAT</span><span>${org&&org.vat?org.vat:tax.taxId||'—'}</span><span>Invoices to</span><span>${tax.invoicesTo||d.me.email}</span></div><button class="btn link small" data-go="settings" data-arg="tax">Edit</button></div>
  </div></div>`;
}
function vMoneyWork(){
  const d=D(),m=d.money.work,tax=d.tax;
  return `${head('Money','What you have earned, your card, and where money goes.',`<button class="btn ghost" data-act="topup">${ic('plus',15,2.2)}Top up</button><button class="btn g" data-act="withdraw" ${m.available>0?'':'disabled'}>${ic('dl',15)}Withdraw ${eur(m.available)}</button>`)}
  ${moneyTabs()}${sandbox()}
  <div class="grid g3">
    <div class="bal"><span class="l">Available now</span><b>${eur(m.available)}</b><p>Spend it with your card now, or withdraw: 1–2 business days.</p></div>
    <div class="bal dk"><span class="l">Held for your work</span><b>${eur(m.held)}</b><p>Funded by clients, waiting for your delivery.</p></div>
    <div class="bal"><span class="l">Earned this month</span><b>${eur(m.earnedMonth)}</b><p>Released after clients accepted your work.</p></div>
  </div>
  <div class="split" style="margin-top:18px"><div class="stack">
    <div class="card"><div class="row between"><h3>Your fee</h3><span class="pill ok">${d.feePct?d.feePct+'% at release':'€0 at release'}</span></div><p class="muted small" style="margin-top:8px">No bidding credits, no Connects, no fee to apply. The fee is taken only when money is released to you, and shown on every deal.</p></div>
    <div class="card" style="padding:0"><div style="padding:16px 18px"><h3>Activity</h3></div>${txTable(m.tx)}</div>
  </div><div class="stack sticky">
    ${cardMini()}
    <div class="card"><h3>Payout account</h3>${tax.iban?`<div class="row" style="margin-top:10px"><span class="avatar alt sm">${ic('money',14)}</span><div><b class="small">${tax.iban.slice(0,4)}•• •••• ••${tax.iban.slice(-2)}</b><div class="muted tiny">${tax.holder||d.me.name} · SEPA</div></div></div>`:'<p class="muted small" style="margin-top:6px">Add the bank account we pay you to.</p>'}<button class="btn link small" data-go="settings" data-arg="tax">${tax.iban?'Change':'Add payout account'}</button></div>
    <div class="card"><h3>Statements</h3><p class="muted small" style="margin:4px 0 10px">For your accountant. DAC7 data is reported for you.</p><a class="btn ghost sm" href="/api/account/statement/work" target="_blank" rel="noopener">${ic('dl',14)}Download statement</a></div>
  </div></div>`;
}

/* ================= Money › Card ================= */
function vCard(){
  const d=D(),m=S.mode,c=d.cards[m],hire=m==='hire',bal=d.money[m].available;
  const hd=head('Money',hire?'Balance, card, invoices and payment methods for '+d.acting+'.':'What you have earned, your card, and where money goes.',`<button class="btn g" data-act="topup">${ic('plus',15,2.2)}Top up</button>`);
  if(c.st!=='active'){
    return `${hd}${moneyTabs()}${sandbox()}
    <div class="card" style="padding:26px"><div class="cardhero">
      <div class="pcard">${cardSvg(m,{side:'front',frozen:false})}</div>
      <div><span class="mono" style="color:var(--brand2)">New · AfterWorc Mastercard® debit</span>
        <h2 style="font-size:25px;margin:8px 0">${hire?'A company card for '+d.acting:'Spend what you earn, the moment it is released'}</h2>
        <p class="muted">${hire?'Pay for tools, ads and travel straight from the company balance. Each payment shows up in Money with a slot for the receipt, ready for your accountant.':'No waiting for a bank transfer. When a client accepts your work, the money is on your card. Withdraw to your bank whenever you like.'}</p>
        <ul class="ticks"><li>Virtual card ready in about a minute, physical card by post</li><li>Spends from your ${hire?'company':'Working'} balance. No credit, no overdraft</li><li>Freeze, limits and ATM on/off in one tap</li><li>Apple Pay and Google Pay</li><li>Uses the ID check you already passed. No new paperwork</li></ul>
        <div class="row wrapf"><button class="btn g" data-act="getcard">${ic('plus',15,2.2)}Get my card</button><button class="btn ghost" data-act="topup">Top up balance</button></div>
        <p class="muted tiny" style="margin-top:10px">Issued by our issuing partner under licence from Mastercard. Card fees follow the issuer's price list.</p></div>
    </div></div>
    <h2 style="margin:24px 0 12px">Three versions, one account</h2>
    <div class="cardvars">${[['personal','Personal','Working mode · your earnings'],['company','Business','Hiring mode · company balance'],['virtual','Virtual','Online and phone wallets only']].map(([v,t,x])=>`<div><div class="pcard">${awCard({variant:v,name:un(d.me.name).toUpperCase(),org:v==='company'?un(d.acting):'',last4:v==='company'?'7730':v==='virtual'?'0915':'4821',uid:'v'+v+(++_cu)})}</div><b class="small" style="display:block;margin-top:10px">${t}</b><span class="muted tiny">${x}</span></div>`).join('')}</div>`;
  }
  const pct=Math.min(100,Math.round(c.spent/Math.max(1,c.lim.month)*100));
  const qa=(act,icn,label,cls='')=>`<button class="${cls}" data-act="${act}"><span class="ic">${ic(icn,17)}</span>${label}</button>`;
  const tg=(k,l,x)=>`<div class="ctl"><div><b class="small">${l}</b><div class="muted tiny">${x}</div></div><button class="tgl ${c.tg[k]?'on':''}" role="switch" aria-checked="${c.tg[k]}" aria-label="${l}" data-act="cardtg" data-arg="${k}"></button></div>`;
  const rv=S.reveal&&S.reveal.mode===m;
  return `${hd}${moneyTabs()}${sandbox()}
  <div class="split"><div class="stack">
    <div class="card"><div class="cardhero">
      <div><div class="pcard">${cardSvg(m)}</div><div class="row" style="justify-content:center;margin-top:10px">${rv?`<span class="muted small">Details visible for 30 seconds</span>`:`<button class="btn link small" data-act="cardside">${c.side==='front'?'Show back':'Show front'}</button>`}</div></div>
      <div class="stack-s">
        <div class="row between" style="align-items:flex-start"><div><span class="mono muted">${hire?'Company card · '+c.org:'Personal card'}</span><h2 style="margin-top:4px">Mastercard debit ••${c.last4}</h2></div><span class="pill ${c.frozen?'wait':'ok'}">${c.frozen?'Frozen':'Active'}</span></div>
        <div class="kv"><span>Spends from</span><span>${hire?c.org:'Working'} balance · <b>${eur(bal)}</b></span><span>Physical card</span><span>${physLabel(c)}</span><span>Valid until</span><span>${c.exp}</span></div>
        <div><div class="row between small"><span>Spent this month</span><span>${eur(c.spent)} of ${eur(c.lim.month)}</span></div><div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div></div>
        <div class="qa">${qa('freeze','lock',c.frozen?'Unfreeze':'Freeze','frz')}${qa('reveal','eye','Details')}${qa('topup','plus','Top up')}${qa('limits','gear','Limits')}</div>
      </div>
    </div></div>
    ${c.frozen?`<div class="banner am">${ic('lock',18)}<span><b>Card is frozen.</b> Payments and ATM withdrawals are declined until you unfreeze it. Subscriptions may fail.</span></div>`:''}
    ${bal<100?`<div class="banner am">${ic('money',18)}<span>Low balance: ${eur(bal)}. <button class="btn link small" data-act="topup">Top up</button> so card payments don't get declined.</span></div>`:''}
    <div class="card" style="padding:0"><div class="row between" style="padding:16px 18px"><h3>Card payments</h3><a class="btn link small" href="/api/account/statement/${m}" target="_blank" rel="noopener">Statement</a></div>
      ${c.tx.length?`<table class="tbl"><tbody>${c.tx.map(t=>`<tr><td class="muted">${t.d}</td><td>${t.descr}<div class="muted tiny">${t.ch}</div></td>${hire?`<td>${t.receipt?'<span class="pill ok">Receipt added</span>':`<label class="btn ghost sm" style="cursor:pointer">${ic('file',14)}Add receipt<input type="file" hidden accept="image/*,application/pdf" data-upload="receipt" data-tx="${t.id}"></label>`}</td>`:''}<td class="r" style="font-weight:600">${eur(t.amt)}</td></tr>`).join('')}</tbody></table>`
      :`<div class="empty" style="padding:24px"><h3>No card payments yet</h3><p>Add the card to Google Pay or Apple Pay, or use the card details online.</p></div>`}
    </div>
    <p class="muted tiny">Card payments come out of Available right away. Money held in deals is never touched by the card.</p>
  </div><div class="stack sticky">
    <div class="card"><h3 style="margin-bottom:4px">Controls</h3>
      ${tg('online','Online payments','Shops, subscriptions, ads')}${tg('contactless','Contactless','Tap to pay in shops')}${tg('atm','ATM withdrawals','Cash from machines')}${tg('abroad','Payments abroad','Outside Estonia')}</div>
    <div class="card"><div class="row between"><h3>Limits</h3><button class="btn link small" data-act="limits">Edit</button></div>
      <div class="kv" style="margin-top:10px"><span>Per day</span><span>${eur(c.lim.day)}</span><span>Per month</span><span>${eur(c.lim.month)}</span><span>ATM per day</span><span>${c.tg.atm?eur(c.lim.atm):'Off'}</span></div></div>
    <div class="card"><h3>Phone wallets</h3>${[['apple','Apple Pay'],['google','Google Pay']].map(([k,l])=>`<div class="ctl"><b class="small">${l}</b>${c.wal[k]?'<span class="pill ok">Added</span>':`<button class="btn ghost sm" data-act="wallet" data-arg="${k}">Add</button>`}</div>`).join('')}</div>
    <div class="card"><h3>Physical card</h3><p class="muted small" style="margin:4px 0 10px">${physLabel(c)}${c.phys==='none'?'. Order one for shops and ATMs.':''}</p>
      ${c.phys==='none'?'<button class="btn ghost sm" data-act="orderphys">Order physical card</button>':c.phys==='shipping'?'<button class="btn g sm" data-act="activate">Activate when it arrives</button>':'<button class="btn ghost sm" data-act="pin">Show PIN</button>'}</div>
    <div class="card"><h3>Lost or stolen?</h3><p class="muted small" style="margin:4px 0 10px">Freeze first if you're not sure. If it's gone, we block it and send a new number.</p><button class="btn danger sm" data-act="lost">Report lost or stolen</button></div>
  </div></div>`;
}
