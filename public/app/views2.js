/* AfterWorc account: working side, profiles, settings, help */
'use strict';

/* ================= WORKING · Home ================= */
function profComplete(p){
  if(!p)return {pct:0,left:['Set up your profile']};
  const checks=[['a headline',!!p.headline],['your main profession',!!p.profession],['an about text',!!p.about],['at least 3 skills',p.skills.length>=3],['your rate',!!p.rate],['a work sample',!!p.portfolio]];
  const left=checks.filter(c=>!c[1]).map(c=>'Add '+c[0]);
  return {pct:Math.round(checks.filter(c=>c[1]).length/checks.length*100),left};
}
function workNext(){
  const d=D(),v=Object.fromEntries(d.verify.map(x=>[x[3],x]));
  const inv=d.opps.find(o=>o.status==='invited');
  const prop=d.deals.find(x=>x.side==='work'&&x.status==='proposed');
  const due=d.deals.find(x=>x.side==='work'&&x.ms.some(m=>['inprogress','changes'].includes(m.st)));
  if(prop)return {mono:'New deal offered',t:`${prop.client} sent you terms`,s:prop.title,btn:['Review terms','deal',prop.id]};
  if(inv)return {mono:'Invitation',t:inv.title,s:`${inv.client} · ${inv.budget} · ${inv.due}`,btn:['Reply','opp',inv.id]};
  if(due){const m=due.ms.find(x=>['inprogress','changes'].includes(x.st));return {mono:'Delivery due',t:'Deliver: '+m.n,s:`${due.client} · ${eur(m.amt)} funded`,btn:['Open deal','deal',due.id]}}
  const pc=profComplete(d.prof);
  if(pc.pct<100)return {mono:'Next step',t:'Finish your profile',s:pc.left.slice(0,2).join(' · '),btn:['Edit profile','profile']};
  if(v.id[2]==='todo')return {mono:'Next step · getting checked',t:'Verify your identity',s:'Upload a photo of your ID card or passport. We check it within 1 business day.',act:['idcheck','Upload ID']};
  if(v.interview[2]==='todo')return {mono:'Next step · last one to get the seal',t:'Book your interview',s:'30 minutes with our team, in Tallinn or by video. After this your profile can show "Checked in person".',act:['interview','Book a time']};
  if(v.interview[4]==='pending')return {mono:'Interview booked',t:v.interview[1],s:'Mäealuse 10/2, Tallinn, or by video. We send the calendar invite.',act:['interview','Change time']};
  return {mono:'All set',t:'You\'re ready for matches',s:'We invite you when a brief fits your checked skills. No bidding.',btn:['See opportunities','opps']};
}
function vWorkHome(){
  const d=D(),done=d.verify.filter(v=>v[2]==='done').length,nx=workNext(),pc=profComplete(d.prof);
  const active=d.deals.filter(x=>x.side==='work'&&x.status==='active');
  const inv=d.opps.filter(o=>o.status==='invited');
  const needs=[...d.deals.filter(x=>x.side==='work'&&x.status==='proposed').map(x=>`<button class="li" data-go="deal" data-arg="${x.id}"><span class="avatar alt sm">${initials(x.client)}</span><span class="grow"><div class="t">Terms to answer: ${x.title}</div><div class="s">${x.client} · ${eur(x.total)}</div></span><span class="r"><span class="pill wait">New</span></span></button>`),
    ...inv.map(o=>`<button class="li" data-go="opp" data-arg="${o.id}"><span class="avatar sm">${initials(o.by||'AW')}</span><span class="grow"><div class="t">Invitation: ${o.title}</div><div class="s">${o.client} · ${o.budget}</div></span><span class="r"><span class="clock">${ic('clock',14)}${o.due}</span></span></button>`),
    ...active.flatMap(x=>x.ms.filter(m=>['inprogress','changes'].includes(m.st)).map(m=>`<button class="li" data-go="deal" data-arg="${x.id}"><span class="avatar alt sm">${initials(x.client)}</span><span class="grow"><div class="t">${m.st==='changes'?'Changes requested':'Deliver'}: ${m.n}</div><div class="s">${x.client} · ${eur(m.amt)} funded</div></span><span class="r"><span class="pill info">In progress</span></span></button>`))];
  const stepAct={id:'idcheck',refs:'refs',interview:'interview'};
  return `${head('Hi '+first(d.me.name),'Your work at a glance.')}
  <div class="stack">
  <div class="next"><div style="position:relative;z-index:1"><span class="mono">${nx.mono}</span><h2>${nx.t}</h2><p>${nx.s}</p></div><div class="row wrapf" style="position:relative;z-index:1">${nx.btn?`<button class="btn" data-go="${nx.btn[1]}" data-arg="${nx.btn[2]||''}">${nx.btn[0]} ${ic('arrow',16,2.2)}</button>`:`<button class="btn" data-act="${nx.act[0]}">${nx.act[1]}</button>`}</div></div>
  <div class="grid g4">
    <div class="stat"><span class="l">Earned this month</span><b>${eur(d.money.work.earnedMonth)}</b><div class="h">released to you</div></div>
    <div class="stat"><span class="l">Active deals</span><b>${active.length}</b><div class="h">${eur(d.money.work.held)} held for you</div></div>
    <div class="stat"><span class="l">Invitations</span><b style="color:${inv.length?'var(--amber)':'inherit'}">${inv.length}</b><div class="h">${inv.length?'reply within 72 h':'none open'}</div></div>
    <div class="stat"><span class="l">Profile</span><b>${pc.pct}%</b><div class="h">${pc.left.length?pc.left.length+' things left':'complete'}</div></div>
  </div>
  <div class="split"><div class="stack">
    <div class="row between"><h2>Needs you</h2></div>
    ${needs.length?`<div class="list">${needs.join('')}</div>`:'<div class="empty" style="padding:24px"><h3>Nothing due</h3><p>Invitations, new terms and deliveries show up here.</p></div>'}
    <h2 style="margin-top:14px">Matched for you <span class="muted small" style="font-family:Inter;font-weight:400">· no bidding, no Connects</span></h2>
    ${d.opps.filter(o=>o.status==='new').length?`<div class="list">${d.opps.filter(o=>o.status==='new').map(o=>`<button class="li" data-go="opp" data-arg="${o.id}"><span class="avatar alt sm">${ic('opp',15)}</span><span class="grow"><div class="t">${o.title}</div><div class="s">${o.client} · ${o.budget}</div></span><span class="r"><span class="pill info">${o.kind}</span></span></button>`).join('')}</div>`:'<div class="empty" style="padding:24px"><h3>No matches yet</h3><p>Finish your profile and get checked. We invite you when a brief fits.</p></div>'}
  </div><div class="stack sticky">
    <div class="card"><div class="row between"><h3>Getting checked</h3><span class="pill ${done===5?'ok':'wait'}">${done} of 5</span></div>
      <div class="ladder" style="margin-top:10px">${d.verify.map((v,i)=>`<div class="lad ${v[2]}"><span class="b">${v[2]==='done'?'✓':i+1}</span><div><b class="small">${v[0]}</b><div class="muted tiny">${v[1]}</div></div><span>${v[2]!=='done'&&stepAct[v[3]]&&v[4]!=='pending'?`<button class="btn ghost sm" data-act="${stepAct[v[3]]}">${v[3]==='id'?'Upload':v[3]==='refs'?'Add':'Book'}</button>`:''}</span></div>`).join('')}</div>
      <p class="muted tiny" style="margin-top:6px">A person checks every step. The skills test is scheduled by our team after your ID check.</p></div>
    ${cardMini()}
    <div class="card"><h3>Finish your profile</h3><div class="progress" style="margin:10px 0"><i style="width:${pc.pct}%"></i></div>${pc.left.length?`<ul class="small" style="margin:0;padding-left:18px;line-height:1.8">${pc.left.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="small muted">Complete. '+(d.prof&&d.prof.status==='published'?'Your profile is public.':d.prof&&d.prof.status==='submitted'?'Waiting for review.':'Submit it for review.')+'</p>'}<button class="btn ghost sm" style="margin-top:10px" data-go="profile">Edit profile</button></div>
  </div></div></div>`;
}

/* ================= WORKING · Opportunities ================= */
function vOpps(){
  const d=D(),tab=S.tab||'all';
  const f={all:o=>o.status!=='sent',inv:o=>o.status==='invited',team:o=>o.kind==='Team seat',sent:o=>o.status==='sent'};
  const list=d.opps.filter(f[tab]);
  return `${head('Opportunities','Briefs that match your checked skills, invitations, and team seats.')}
  <div class="banner" style="margin-bottom:16px">${ic('spark',18)}<span><b>No Connects. No bidding. No fee to apply.</b> We invite you when a brief fits. Answer within 72 h to stay first in line.</span></div>
  <div class="tabsx">${[['all','For you'],['inv','Invitations'],['team','Team seats'],['sent','Proposals sent']].map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="tab" data-arg="${k}">${l}<span class="c">${d.opps.filter(f[k]).length}</span></button>`).join('')}</div>
  ${list.length?`<div class="list">${list.map(o=>`<button class="li" data-go="opp" data-arg="${o.id}"><span class="avatar alt sm">${ic(o.kind==='Team seat'?'team':'opp',15)}</span><span class="grow"><div class="t">${o.title}</div><div class="s">${o.client} · ${o.budget}${o.due?' · '+o.due:''}</div></span><span class="r"><span class="pill ${o.status==='invited'?'wait':o.status==='sent'?'ok':'info'}">${o.status==='invited'?'Invited':o.status==='sent'?'Sent':o.kind}</span></span></button>`).join('')}</div>`
  :empty('opp','Nothing here yet','When a brief fits your checked skills, it shows up here.',d.prof&&d.prof.status!=='published'?'<button class="btn g" data-go="profile">Finish your profile</button>':'')}`;
}
function vOpp(id){
  const o=D().opps.find(x=>x.id===id);
  if(!o)return empty('opp','Opportunity not found','It may have expired or been declined.','<button class="btn g" data-go="opps">All opportunities</button>');
  const pr=S.prop[id]||(S.prop[id]={rate:D().prof&&D().prof.rate?'€'+D().prof.rate+' / h':'',start:'Now',note:''});
  const rateNum=parseFloat(String(pr.rate).replace(/[^\d.]/g,''))||0,hrs=D().prof?+D().prof.hours||30:30,fee=D().feePct;
  return `${head(o.title,`${o.client} · ${o.budget}`,`<span class="pill ${o.status==='invited'?'wait':'info'}">${o.kind}</span>`,`<button data-go="opps">Opportunities</button> / ${o.title}`)}
  <div class="split"><div class="stack">
    ${o.by?`<div class="card row" style="gap:12px;align-items:flex-start"><span class="avatar">${initials(o.by)}</span><div><b>${o.by} invited you</b><p class="small" style="margin-top:4px">${o.note||'A client is looking for your stack. We put you on their shortlist.'}</p></div></div>`:''}
    ${o.why.length?`<div class="card"><h3>Why you</h3><ul class="small" style="margin:8px 0 0;padding-left:18px;line-height:1.8">${o.why.map(w=>`<li>${w}</li>`).join('')}</ul></div>`:''}
    <div class="card"><h3>The brief</h3><p style="margin-top:8px;white-space:pre-wrap">${o.desc||'Details are shared when you reply.'}</p></div>
    ${o.status==='sent'?`<div class="banner">${ic('check',18)}<span>Proposal sent (${o.proposal?o.proposal.rate:''}). You'll hear back within 72 h, or it expires automatically.</span></div>`:`
    <div class="card"><h3>Your proposal</h3>
      <div class="grid g2" style="margin-top:12px"><label class="field"><span>Your rate</span><input class="inp" id="pr-rate" data-bind="prop.${id}.rate" data-live maxlength="40" value="${esc(pr.rate)}" placeholder="€55 / h"></label><label class="field"><span>Can start</span><select class="inp" data-bind="prop.${id}.start">${['Now','In 1 week','In 2 weeks','Next month'].map(x=>`<option ${pr.start===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
      <label class="field"><span>Why you, in 2–3 lines</span><textarea class="inp" id="pr-note" data-bind="prop.${id}.note" maxlength="2000" placeholder="What you'd do first, and a similar thing you've shipped">${esc(pr.note)}</textarea></label>
      <div class="row wrapf"><button class="btn g" data-act="propose" data-arg="${o.id}" ${S.busy?'disabled':''}>${ic('send',15)}Send proposal</button><button class="btn ghost" data-act="decline" data-arg="${o.id}">Not for me</button></div></div>`}
  </div><div class="stack sticky">
    ${rateNum?`<div class="card"><h3>If you win it</h3><div class="feeline" style="margin-top:10px"><span>At ${eur(rateNum)} / h × ${hrs} h/week</span><span>${eur(rateNum*hrs)} / wk</span><span>AfterWorc fee</span><span>${fee?fee+'%':'€0'}</span><span class="tot">You receive</span><span class="tot">${eur(rateNum*hrs*(1-fee/100))} / wk</span></div><p class="muted tiny" style="margin-top:8px">Weekly report → client approves within 7 days → released to your balance.</p></div>`:''}
    ${o.due?`<div class="card"><span class="clock">${ic('clock',14)}${o.due}</span><p class="muted small" style="margin-top:6px">Replying fast keeps you first in line for future invitations.</p></div>`:''}
  </div></div>`;
}

/* ================= Profile editor + public profile ================= */
const SUGGEST={Development:['Go','TypeScript','React','Node.js','PostgreSQL','Kubernetes','AWS','Docker','Python','Java'],Design:['Figma','Design systems','UX research','Prototyping','Illustrator','Webflow'],Marketing:['SEO','Google Ads','LinkedIn Ads','Content','Analytics','Email marketing'],'Business Support':['Jira','Scrum','Excel','Customer support','Bookkeeping'],Content:['Copywriting','Estonian','Russian','Technical writing','Video editing'],'Data & Infrastructure':['SQL','dbt','Airflow','Terraform','GCP','BigQuery'],'Quality & Security':['Playwright','Cypress','OWASP','Pen testing','API tests']};
function profDraft(){const p=D()&&D().prof;const x=p?{...p}:{headline:'',profession:'',about:'',skills:[],rate:'',hours:30,avail:'Available now',portfolio:'',area:'Development',city:'',status:'draft'};
  for(const k of ['headline','profession','about','portfolio','city','avail'])x[k]=un(x[k]);x.skills=(x.skills||[]).map(un);x.step=0;x.skillq='';x.name=D()?un(D().me.name):'';return x}
function vProfile(){
  const p=S.prof||(S.prof=profDraft());const d=D();const steps=['About you','Skills','Rate & work'];
  let body='';
  if(p.step===0)body=`<div class="grid g2"><label class="field"><span>Your name</span><input class="inp" id="pf-name" data-bind="prof.name" maxlength="80" value="${esc(p.name)}"></label><label class="field"><span>Based in</span><input class="inp" id="pf-city" data-bind="prof.city" maxlength="60" value="${esc(p.city)}" placeholder="Tallinn"></label></div>
    <label class="field"><span>Headline</span><input class="inp" id="pf-head" data-bind="prof.headline" data-live maxlength="120" value="${esc(p.headline)}" placeholder="Senior Go developer, fintech &amp; B2B"><small>Shown on your card and in shortlists</small></label>
    <div class="grid g2"><label class="field"><span>Area</span><select class="inp" data-bind="prof.area" data-live>${AREAS.map(a=>`<option ${p.area===a?'selected':''}>${a}</option>`).join('')}</select></label>
    <label class="field"><span>Main profession</span><select class="inp" data-bind="prof.profession"><option value="">Choose…</option>${(PROFS[p.area]||[]).map(x=>`<option ${p.profession===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
    <label class="field"><span>About</span><textarea class="inp" id="pf-about" data-bind="prof.about" maxlength="2000" placeholder="What you do best, for whom, and for how long">${esc(p.about)}</textarea></label>`;
  if(p.step===1)body=`<label class="field"><span>Top skills (up to 8)</span><div class="row"><input class="inp" id="skillin" data-bind="prof.skillq" maxlength="40" value="${esc(p.skillq)}" placeholder="Type a skill and press Enter"><button class="btn ghost sm" data-act="addskill">Add</button></div></label>
    <div class="chips" style="margin-bottom:10px">${p.skills.map((s,i)=>`<button class="chip on x" data-act="skill" data-arg="${i}">${esc(s)}</button>`).join('')||'<span class="muted small">No skills yet</span>'}</div>
    <p class="muted tiny" style="margin-bottom:6px">Suggested for ${esc(p.area)}:</p>
    <div class="chips">${(SUGGEST[p.area]||[]).filter(s=>!p.skills.includes(s)).map(s=>`<button class="chip" data-act="skilladd" data-arg="${s}">+ ${s}</button>`).join('')}</div>`;
  if(p.step===2)body=`<div class="grid g2"><label class="field"><span>Rate from (€ / h)</span><input class="inp" id="pf-rate" data-bind="prof.rate" data-live inputmode="numeric" maxlength="5" value="${esc(p.rate)}" placeholder="55"></label><label class="field"><span>Hours per week</span><input class="inp" id="pf-hours" data-bind="prof.hours" inputmode="numeric" maxlength="2" value="${esc(p.hours)}"></label></div>
    <label class="field"><span>Available</span><div class="chips">${['Available now','From next week','From next month','Not available'].map(a=>`<button class="chip ${p.avail===a?'on':''}" data-act="avail" data-arg="${a}">${a}</button>`).join('')}</div></label>
    <label class="field"><span>One piece of work you're proud of</span><input class="inp" id="pf-port" data-bind="prof.portfolio" maxlength="300" value="${esc(p.portfolio)}" placeholder="https://"><small>A link is enough. Add more later.</small></label>`;
  const st=d.prof?d.prof.status:'draft';
  return `${head('Your profile','3 short steps. Your profile goes public after your ID check and a review by our team.',`<button class="btn ghost" data-go="pp" data-arg="me">${ic('eye',15)}Preview public page</button>`)}
  <div class="split"><div class="card" style="padding:24px"><div class="wizbar">${steps.map((s,i)=>`<div class="${i===p.step?'cur':''}"><i class="${i<=p.step?'on':''}"></i><span>${i+1}. ${s}</span></div>`).join('')}</div>${body}
  <div class="row between" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">${p.step?`<button class="btn ghost" data-act="pback">Back</button>`:'<span></span>'}<span class="row"><button class="btn ghost" data-act="psave">Save</button>${p.step<2?`<button class="btn g" data-act="pnext">Continue ${ic('arrow',15,2.2)}</button>`:st==='draft'?`<button class="btn g" data-act="psubmit">Save and submit for review</button>`:''}</span></div></div>
  <div class="stack sticky"><div class="card"><span class="mono muted">How clients see you</span><div class="row" style="margin-top:12px"><span class="avatar">${initials(p.name||d.me.name)}</span><div><b>${esc(p.name)}</b><div class="muted small">${esc(p.headline)||'Your headline'}</div></div></div><div style="margin-top:8px">${seal(d.prof&&d.prof.level==='checked'?'checked':d.prof&&d.prof.level==='verified'?'id':'')}</div><div class="kv" style="margin-top:10px"><span>Rate</span><span>${p.rate?'€'+esc(p.rate)+' / h':'—'}</span><span>Available</span><span>${esc(p.avail)}</span></div><div class="chips" style="margin-top:10px">${p.skills.map(s=>`<span class="chip">${esc(s)}</span>`).join('')}</div></div>
  <div class="card small"><b>Status: ${{draft:'Draft',submitted:'Submitted · in review',published:'Public'}[st]}</b><p class="muted" style="margin-top:4px">${st==='published'?'Clients can find you in search and request proposals. Changes are live when you save.':st==='submitted'?'Our team reviews it after your ID check. You can keep editing.':'Only you can see it. Submit it when the three steps are done.'}</p></div></div></div>`;
}
function vPublic(id){
  const d=D(),me=id==='me';
  let p;
  if(me){const pr=d.prof||{};p={id:'me',name:d.me.name,role:pr.headline||'Your headline',lv:pr.level==='checked'?'checked':pr.level==='verified'?'id':'registered',rate:pr.rate,city:pr.city||'',avail:pr.avail||'',deals:0,rating:null,skills:pr.skills||[],bio:pr.about||''}}
  else p=Object.hasOwn(d.people,id)?d.people[id]:null;
  if(!p)return empty('user','Profile not found','This profile is not public.','<button class="btn g" data-go="find">Browse specialists</button>');
  return `${head(me?'Your public page (preview)':'Specialist profile','',me?`<button class="btn ghost" data-go="profile">Edit</button>`:'',`<button data-go="home">Home</button> / ${p.name}`)}
  <div class="split"><div class="stack">
    <div class="pphero"><span class="avatar lg" style="background:#5fcf7d;color:#06200f">${initials(p.name)}</span><div class="grow"><h1>${p.name}</h1><p style="color:#b5c7bd;margin-top:4px">${p.role}${p.city?' · '+p.city:''}</p><div style="margin-top:8px">${p.lv==='checked'?`<span class="seal" style="color:#85d6ae">${sealSvg}Checked in person${p.checkedBy?' by '+p.checkedBy+' · '+p.checkedOn:''}</span>`:p.lv==='id'?`<span class="seal" style="color:#8fb0f0">${ic('shield',14,2)}ID verified</span>`:'<span class="seal" style="color:#b5c7bd">Registered · checks in progress</span>'}</div></div></div>
    <div class="card"><h3>About</h3><p style="margin-top:6px;white-space:pre-wrap">${p.bio||'—'}</p><div class="chips" style="margin-top:12px">${p.skills.map(s=>`<span class="chip">${s}</span>`).join('')}</div></div>
    <div class="card"><h3>What we checked</h3><div class="grid g4" style="margin-top:10px">${['Identity','Skills test','References','Interview'].map((c,i)=>{const ok=p.lv==='checked'||(p.lv==='id'&&i===0);return `<div class="small"><span style="color:${ok?'var(--brand2)':'var(--muted)'}">${ok?'✓':'○'}</span> ${c}</div>`}).join('')}</div></div>
    ${p.history&&p.history.length?`<div class="card"><h3>Recent work</h3><div class="stack-s" style="margin-top:10px">${p.history.slice(0,4).map(w=>`<div class="row between small"><span>${w.t}</span><b>${eur(w.a)}</b></div>`).join('')}</div></div>`:''}
    <div class="card"><div class="row between"><h3>Reviews</h3><span class="small">${p.rating?'★ '+p.rating+' · ':''}${p.deals} deals</span></div><p class="muted tiny" style="margin-top:8px">Reviews are published only when both sides have reviewed.</p></div>
  </div><div class="stack sticky">
    <div class="card"><div class="kv" style="font-size:13.5px"><span>Rate</span><span>${rateOf(p)}</span><span>Availability</span><span>${p.avail||'—'}</span><span>Deals</span><span>${p.deals}</span></div>
      ${me?'<p class="muted small" style="margin-top:12px">Businesses see a "Request a proposal" button here.</p>':`<button class="btn g block" style="margin-top:14px" data-act="request" data-arg="${p.id}">Request a proposal</button><button class="btn ghost block" style="margin-top:8px" data-act="call" data-arg="${p.id}">${ic('cal',15)}Book a 15-min call</button>
      <p class="muted tiny" style="margin-top:10px">Nothing is charged until you agree terms and fund milestone 1.</p>`}</div>
  </div></div>`;
}

/* ================= Settings ================= */
function vSettings(){
  const d=D(),tab=S.tab||'sec';
  const tabs=[['sec','Security'],['notif','Notifications'],['privacy','Privacy & data'],['tax','Tax & invoicing'],['org','Organizations']];
  let body='';
  if(tab==='sec')body=`<div class="card"><div class="row between wrapf"><div><h3>Two-factor authentication</h3><p class="muted small">Needed before money can leave your balance, and to see card details.</p></div><button class="btn ${d.twofa?'ghost':'g'} sm" data-act="${d.twofa?'twofaoff':'twofaon'}">${d.twofa?'Turn off':'Turn on'}</button></div>${d.twofa?'<p class="pill ok" style="margin-top:10px">On · authenticator app</p>':''}</div>
    <div class="card"><div class="row between wrapf"><div><h3>AfterWorc card</h3><p class="muted small">Freeze, limits, PIN and card details live in Money › Card. Showing details or PIN needs two-factor.</p></div><button class="btn ghost sm" data-go="card">Open card</button></div></div>
    <div class="card"><h3>Sign-in</h3><div class="kv" style="margin-top:10px"><span>Name</span><span>${d.me.name}</span><span>E-mail</span><span>${d.me.email}</span><span>Password</span><span>${d.me.passwordChanged?'Changed '+d.me.passwordChanged:'Set at sign-up'}</span><span>Member since</span><span>${d.me.created}</span></div><div class="row wrapf" style="margin-top:10px"><button class="btn ghost sm" data-act="namechg">Change name</button><button class="btn ghost sm" data-act="emailchg">Change e-mail</button><button class="btn ghost sm" data-act="pwchg">Change password</button></div></div>
    <div class="card" style="padding:0"><div class="row between" style="padding:16px 18px"><h3>Where you're signed in</h3>${d.sessions.length>1?'<button class="btn link small" data-act="revoke" data-arg="others">Sign out everywhere else</button>':''}</div><table class="tbl"><tbody>${d.sessions.map(s=>`<tr><td>${s.ua}</td><td class="muted">${s.current?'This device':s.ip||''}</td><td class="r muted">${s.current?'now':s.seen}</td><td class="r">${s.current?'':`<button class="btn link small" data-act="revoke" data-arg="${s.id}">Sign out</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  if(tab==='notif'){
    const pr=S.set.prefs||(S.set.prefs=JSON.parse(JSON.stringify(d.prefs)));
    const rows=[['shortlist','Shortlist ready / new invitation',true],['delivery','Work delivered or report to approve',true],['payment','Payment released or received',true],['card','Card payments and declines'],['message','New message'],['news','Product news from AfterWorc']];
    body=`<div class="card" style="padding:0"><table class="tbl"><thead><tr><th>When</th><th class="r">E-mail</th><th class="r">In app</th></tr></thead><tbody>${rows.map(([k,l,lock])=>`<tr><td>${l}</td><td class="r"><input type="checkbox" data-bind="set.prefs.email.${k}" ${pr.email[k]?'checked':''} aria-label="E-mail: ${l}"></td><td class="r"><input type="checkbox" data-bind="set.prefs.app.${k}" ${pr.app[k]?'checked':''} ${lock?'disabled':''} aria-label="In app: ${l}"></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Cookies</h3><p class="muted small" style="margin:4px 0 10px">We use only the cookie that keeps you signed in. Optional kinds stay off unless you allow them.</p><label class="row small"><input type="checkbox" data-bind="set.prefs.cookies.analytics" ${pr.cookies.analytics?'checked':''}> Analytics</label><label class="row small" style="margin-top:6px"><input type="checkbox" data-bind="set.prefs.cookies.marketing" ${pr.cookies.marketing?'checked':''}> Marketing</label></div>
    <div><button class="btn g" data-act="saveprefs">Save preferences</button></div>`;
  }
  if(tab==='privacy')body=`<div class="card"><h3>Documents you accepted</h3><div class="kv" style="margin-top:10px"><span>Terms and Conditions</span><span>${d.me.termsAt?'Accepted '+d.me.termsAt:'—'}</span><span>Privacy Policy</span><span>${d.me.termsAt?'Accepted '+d.me.termsAt:'—'}</span></div><p class="muted tiny" style="margin-top:8px"><a href="/#terms" target="_blank" rel="noopener">Read the Terms</a> · <a href="/#privacy" target="_blank" rel="noopener">Privacy Policy</a>. When a document changes, you'll see a banner to accept the new version.</p></div>
    <div class="card"><h3>Your data</h3><p class="muted small" style="margin:4px 0 10px">Stored in the EU. Download a copy any time (JSON).</p><a class="btn ghost sm" href="/api/account/export" download>${ic('dl',14)}Download my data</a></div>
    <div class="card"><h3>Leave AfterWorc</h3><p class="muted small" style="margin:4px 0 10px"><b>Close</b> keeps records we must keep by law (invoices, deals) and ends your access. <b>Delete</b> also erases everything else. Open deals must be finished and balances empty first.</p><button class="btn danger sm" data-act="leave">Close or delete account…</button></div>`;
  if(tab==='tax'){
    const t=S.set.tax||(S.set.tax=Object.fromEntries(Object.entries({country:'Estonia',taxId:'',vatStatus:'VAT registered',invoicesTo:'',holder:'',iban:'',...d.tax}).map(([k,v])=>[k,un(v)])));
    body=`<div class="card"><h3>${S.mode==='hire'?'Invoicing for '+d.acting:'Tax details (DAC7) and payouts'}</h3><div class="grid g2" style="margin-top:12px">
      <label class="field"><span>Country of residence</span><select class="inp" data-bind="set.tax.country">${['Estonia','Latvia','Lithuania','Finland','Sweden','Germany','Other EU'].map(c=>`<option ${t.country===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label class="field"><span>${S.mode==='hire'?'VAT number':'Tax ID (isikukood / TIN)'}</span><input class="inp" id="tx-id" data-bind="set.tax.taxId" maxlength="40" value="${esc(t.taxId)}" placeholder="${S.mode==='hire'?'EE…':'…'}"></label>
      <label class="field"><span>VAT status</span><select class="inp" data-bind="set.tax.vatStatus">${['VAT registered','Not registered'].map(c=>`<option ${t.vatStatus===c?'selected':''}>${c}</option>`).join('')}</select></label>
      <label class="field"><span>Invoices to</span><input class="inp" id="tx-inv" type="email" data-bind="set.tax.invoicesTo" maxlength="254" value="${esc(t.invoicesTo)}" placeholder="${d.me.email}"></label>
      <label class="field"><span>Payout account holder</span><input class="inp" id="tx-holder" data-bind="set.tax.holder" maxlength="80" value="${esc(t.holder)}"></label>
      <label class="field"><span>Payout IBAN</span><input class="inp" id="tx-iban" data-bind="set.tax.iban" maxlength="40" value="${esc(t.iban)}" placeholder="EE00 0000 0000 0000 0000"></label></div><button class="btn g sm" data-act="savetax">Save</button></div>`;
  }
  if(tab==='org'){
    const o=S.set.org||(S.set.org={name:'',country:'Estonia',vat:'',inv:{}});
    body=`${d.orgs.map(g=>{const iv=o.inv[g.id]||(o.inv[g.id]={email:'',role:'Can hire'});return `<div class="card"><div class="row between wrapf"><div class="row"><span class="avatar alt">${initials(g.name)}</span><div><b>${g.name}</b><div class="muted small">${g.country}${g.vat?' · VAT '+g.vat:''} · you are ${g.role}</div></div></div>${d.actingOrgId===g.id?'<span class="pill ok">Acting as this company</span>':`<button class="btn ghost sm" data-act="acting" data-arg="${g.id}">Act as this company</button>`}</div>
      <table class="tbl" style="margin-top:12px"><thead><tr><th>Member</th><th>Role</th></tr></thead><tbody>${g.members.map(m=>`<tr><td>${m.name} <span class="muted small">${m.email}</span></td><td>${m.role}</td></tr>`).join('')}${g.invites.map(i=>`<tr><td>${i.email} <span class="pill wait">Invited ${i.at}</span></td><td>${i.role}</td></tr>`).join('')}</tbody></table>
      ${g.role==='Owner'?`<div class="row wrapf" style="margin-top:12px"><input class="inp" id="inv-${g.id}" type="email" style="flex:1;min-width:200px" data-bind="set.org.inv.${g.id}.email" value="${esc(iv.email)}" placeholder="colleague@company.com"><select class="inp" style="width:auto" data-bind="set.org.inv.${g.id}.role">${['Can hire','View only','Finance'].map(r=>`<option ${iv.role===r?'selected':''}>${r}</option>`).join('')}</select><button class="btn g sm" data-act="invite" data-arg="${g.id}">Invite</button></div>`:''}</div>`}).join('')}
    <div class="card"><h3>Add an organization</h3><p class="muted small" style="margin:4px 0 12px">Hire and sign deals as your company. Invoices carry its name and VAT number.</p><div class="grid g3"><label class="field"><span>Company name</span><input class="inp" id="org-name" data-bind="set.org.name" maxlength="120" value="${esc(o.name)}" placeholder="Company OÜ"></label><label class="field"><span>Country</span><input class="inp" id="org-country" data-bind="set.org.country" maxlength="60" value="${esc(o.country)}"></label><label class="field"><span>VAT number</span><input class="inp" id="org-vat" data-bind="set.org.vat" maxlength="30" value="${esc(o.vat)}" placeholder="EE…"></label></div><button class="btn g sm" data-act="orgcreate">${ic('plus',14)}Add organization</button></div>`;
  }
  return `${head('Settings','Security, notifications, privacy, invoicing and organizations.')}
  <div class="tabsx">${tabs.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="settab" data-arg="${k}">${l}</button>`).join('')}</div>
  <div class="stack" style="max-width:760px">${body}</div>`;
}
const FAQ=[['When is my money released?','When the client accepts a delivery, or automatically 7 days after delivery if the client does nothing. Released money is on your Working balance at once.'],['What does "Checked in person" mean?','A person on our team verified the specialist\'s identity, tested their skills, called two references and interviewed them live. The profile shows who checked and when.'],['How do departments get invoiced?','One VAT invoice per month for the whole team, issued when you fund the month.'],['What if I disagree with a delivery?','Request changes with specifics; the review clock restarts on resubmission. If you still can\'t agree, open an issue on the deal and we mediate within 2 business days.'],['How does the AfterWorc card work?','It spends from your Available balance only. Held deal money is never touched. Freeze it, set limits and switch ATM and online payments on or off in Money › Card.'],['My card was declined. Why?','Check that the card isn\'t frozen, that the channel (online, contactless, ATM, abroad) is switched on, that you are within your limits, and that Available covers the payment.']];
function vHelp(){
  const h=S.help;
  return `${head('Help & support','A person answers within one business day.')}
  <div class="split"><div class="card"><label class="field"><span>What is it about?</span><select class="inp" data-bind="help.topic">${['A deal or payment','My brief or shortlist','Getting checked','The AfterWorc card','My account','Something else'].map(x=>`<option ${h.topic===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>Tell us more</span><textarea class="inp" id="help-text" data-bind="help.text" maxlength="4000">${esc(h.text)}</textarea></label><p class="muted tiny" style="margin-bottom:12px">We attach your account reference automatically, so you don't have to find it. The reply arrives in Messages and by e-mail.</p><button class="btn g" data-act="helpsend" ${S.busy?'disabled':''}>Send</button></div>
  <div class="stack sticky"><div class="card faqs"><h3 style="margin-bottom:6px">Quick answers</h3>${FAQ.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div><div class="card small"><b>E-mail</b><p class="muted" style="margin-top:4px">info@afterworc.com</p></div></div></div>`;
}
