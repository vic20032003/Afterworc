/* AfterWorc staff console */
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=n=>'€'+Number(n||0).toLocaleString('en-GB');
const S={tab:'inbox',o:null,sel:null,f:{},toast:null,q:''};
const TABS=[['inbox','Inbox'],['briefs','Briefs'],['leads','Requests'],['specs','Specialists'],['users','Users & checks'],['deals','Deals'],['money','Money'],['mail','E-mails']];
async function api(path,body){
  const r=await fetch('/api/admin'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Requested-With':'afterworc'},credentials:'same-origin',body:body?JSON.stringify(body):undefined});
  if(r.status===401||r.status===403){location.href='/#login-staff';throw new Error('Staff only')}
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Failed');return d;
}
async function load(){S.o=await api('/overview');render()}
async function act(type,payload,msg){try{await api('/action',{type,...payload});await load();toast(msg||'Saved')}catch(e){toast(e.message,true)}}
let tt;function toast(t,err){S.toast={t,err};render();clearTimeout(tt);tt=setTimeout(()=>{S.toast=null;render()},3000)}
const val=id=>{const el=document.getElementById(id);return el?(el.type==='checkbox'?el.checked:el.value):''};
const pill=(t,c='')=>`<span class="pill ${c}">${esc(t)}</span>`;
const empty=t=>`<div class="empty" style="padding:24px"><p>${t}</p></div>`;

function counts(o){return {inbox:o.threads.filter(t=>t.unread).length,briefs:o.briefs.filter(b=>['review','matching'].includes(b.status)).length,leads:o.leads.filter(l=>l.status==='new').length,
  specs:o.specialists.filter(s=>s.linked&&!s.published&&s.profile&&s.submitted).length,users:o.users.filter(u=>Object.values(u.verify||{}).some(v=>v&&v.st==='pending')).length,
  deals:o.deals.filter(d=>!d.linked&&(d.status==='proposed'||d.ms.some(m=>['inprogress','changes'].includes(m.st)))).length+o.issues.filter(i=>i.status==='open').length,money:o.sepa.length+o.payouts.length}}

function render(){
  const root=document.getElementById('root');
  if(!S.o){root.innerHTML='<div class="loading">Loading…</div>';return}
  const o=S.o,c=counts(o);
  root.innerHTML=`<header class="top"><div class="in"><a class="logo" href="/" style="text-decoration:none;color:inherit"><span class="mk"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M18 7.5A7.5 7.5 0 1 0 18 16.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg></span><span class="wm">afterwor<i>c</i></span></a><span class="pill info">Staff console</span><div class="spacer"></div>${o.smtp?'':pill('No SMTP: e-mails are logged only','wait')}<span class="small muted hide-m">${esc(o.me.email)}</span><a class="btn ghost sm" href="/app">My account</a><button class="btn ghost sm" data-a="refresh">Refresh</button></div></header>
  <div style="max-width:1360px;margin:0 auto;padding:18px">
  <div class="tabsx">${TABS.map(([k,l])=>`<button class="${S.tab===k?'on':''}" data-tab="${k}">${l}${c[k]?`<span class="c" style="background:var(--amber);color:#fff">${c[k]}</span>`:''}</button>`).join('')}</div>
  ${({inbox:vInbox,briefs:vBriefs,leads:vLeads,specs:vSpecs,users:vUsers,deals:vDeals,money:vMoney,mail:vMail})[S.tab]()}
  </div>${S.toast?`<div class="toast">${esc(S.toast.t)}</div>`:''}`;
}
/* ---------- inbox ---------- */
function vInbox(){
  const o=S.o;const t=o.threads.find(x=>x.id===S.sel)||o.threads[0];
  if(!t)return empty('No conversations yet.');
  return `<div class="msgs" style="height:calc(100vh - 170px)"><div class="ml">${o.threads.map(x=>`<button class="li" data-sel="${x.id}" style="${x.id===t.id?'background:var(--mintbg)':''}"><span class="grow"><div class="t" style="font-size:13.5px">${esc(x.owner)} · ${esc(x.kind==='support'?'Support · '+(x.mode==='hire'?'hiring':'working'):x.title)}</div><div class="s">${esc(x.email)} · ${esc(x.at)}</div></span>${x.unread?pill('New','ok'):''}</button>`).join('')}</div>
  <div class="th"><div class="thh"><div class="grow"><b>${esc(t.owner)} &lt;${esc(t.email)}&gt;</b><div class="muted tiny">${esc(t.kind==='support'?'Support / matching thread':'Conversation with specialist '+t.title+(t.linked?' (has an account; they reply themselves)':' (no account: reply as them)'))} · ${esc(t.sub)}</div></div>${t.unread?`<button class="btn ghost sm" data-a="read" data-id="${t.id}">Mark read</button>`:''}</div>
  <div class="tb">${t.msgs.map(m=>m.f==='system'?`<div class="bub sys">${esc(m.t)}</div>`:`<div class="bub ${m.f==='staff'||m.f==='relay'?'me':''}"><span class="who">${esc(m.f==='user'?t.owner:m.f==='peer'?(m.who||t.title):m.who||'AfterWorc')}</span>${esc(m.t)}<span class="tm">${esc(m.tm)}</span></div>`).join('')}</div>
  <div class="tf" style="flex-wrap:wrap"><textarea class="inp" id="reply" rows="2" style="flex:1;min-height:44px" placeholder="Reply…"></textarea>${t.kind==='specialist'&&!t.linked?`<select class="inp" id="as" style="width:auto"><option value="staff">as AfterWorc</option><option value="relay">as ${esc(t.title)}</option></select>`:''}<input class="inp" id="rname" style="width:140px" placeholder="Signed (e.g. Anna R.)" value="${esc(S.f.rname||'')}"><button class="btn g" data-a="reply" data-id="${t.id}">Send</button></div></div></div>`;
}
/* ---------- briefs ---------- */
function vBriefs(){
  const o=S.o;const specs=o.specialists.filter(s=>s.published);
  if(!o.briefs.length)return empty('No briefs yet.');
  return `<div class="stack">${o.briefs.map(b=>`<details class="card" ${S.sel==='b'+b.id?'open':''}><summary style="cursor:pointer;list-style:none" data-sel="b${b.id}"><div class="row between wrapf"><div><b>${esc(b.title)}</b><div class="muted small">${esc(b.signedAs)} · ${esc(b.email)} · ${esc(b.type)} · ${esc(b.area)} · ${esc(b.budget)} · sent ${esc(b.sent||'')}</div></div><span class="row">${b.overdue?pill('Over 48 h','bad'):''}${pill(b.status,b.status==='shortlist'?'ok':['review','matching'].includes(b.status)?'wait':'')}</span></div></summary>
    <div class="grid g2" style="margin-top:14px"><div><p class="small" style="white-space:pre-wrap">${esc(b.desc)}</p><p class="muted small" style="margin-top:6px">People: ${esc(b.people||'—')} · Start: ${esc(b.start)} · Promised by ${esc(b.promised||'')}</p>
      <div class="row wrapf" style="margin-top:10px"><select class="inp" id="bst${b.id}" style="width:auto">${['review','matching','shortlist','hired','closed'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}</select><input class="inp" id="bmn${b.id}" style="width:150px" placeholder="Matcher name" value="${esc(b.matcher.name)}"><input class="inp" id="bmr${b.id}" style="width:200px" placeholder="Matcher role" value="${esc(b.matcher.role)}"><button class="btn ghost sm" data-a="bupdate" data-id="${b.id}">Save</button></div>
      <h4 style="margin-top:16px">Invite a specialist with an account</h4><div class="row wrapf" style="margin-top:6px"><select class="inp" id="binv${b.id}" style="width:auto">${o.specialists.filter(s=>s.linked).map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.role)}</option>`).join('')}</select><input class="inp" id="binvw${b.id}" style="flex:1;min-width:160px" placeholder="Why them (one reason per line)"><button class="btn ghost sm" data-a="binvite" data-id="${b.id}">Invite</button></div>
      ${b.proposals.length?`<h4 style="margin-top:16px">Proposals</h4>${b.proposals.map(p=>`<p class="small">${esc(p.name)}: ${esc(p.rate)} · ${esc(p.note)}</p>`).join('')}`:''}</div>
    <div><h4>Shortlist (up to 3)</h4>${[0,1,2].map(i=>{const cur=b.shortlist[i]||'';return `<div class="row" style="margin-top:8px;align-items:flex-start"><select class="inp" id="bsl${b.id}_${i}" style="width:220px"><option value="">—</option>${specs.map(s=>`<option value="${esc(s.id)}" ${cur===s.id?'selected':''}>${esc(s.name)} · ${esc(s.area)}</option>`).join('')}</select><input class="inp" id="bwhy${b.id}_${i}" placeholder="Why matched" value="${esc(cur?b.why[cur]||'':'')}"></div>`}).join('')}
      <button class="btn g sm" style="margin-top:10px" data-a="bshort" data-id="${b.id}">Publish shortlist to client</button></div></div></details>`).join('')}</div>`;
}
/* ---------- leads ---------- */
function vLeads(){
  const L=S.o.leads;if(!L.length)return empty('No requests yet.');
  return `<div class="card" style="padding:0;overflow:auto"><table class="tbl"><thead><tr><th>When</th><th>Kind</th><th>E-mail</th><th>Request</th><th>Status</th><th>Note</th><th></th></tr></thead><tbody>${L.map(l=>`<tr><td class="muted">${esc(l.at)}</td><td>${esc(l.kind)}${l.data.type?'<br><span class="muted tiny">'+esc(l.data.type)+'</span>':''}</td><td><a href="mailto:${esc(l.email)}">${esc(l.email)}</a>${l.data.chan&&l.data.chan!=='Email only'?'<br><span class="muted tiny">'+esc(l.data.chan)+' '+esc(l.data.contact||'')+'</span>':''}</td><td style="max-width:420px;white-space:pre-wrap">${esc(l.data.need||l.data.text||'')}</td>
    <td><select class="inp" id="ls${l.id}" style="width:auto">${['unconfirmed','new','replied','won','closed'].map(s=>`<option ${l.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td><input class="inp" id="ln${l.id}" value="${esc(l.staff_note)}"></td><td><button class="btn ghost sm" data-a="lsave" data-id="${l.id}">Save</button></td></tr>`).join('')}</tbody></table></div>`;
}
/* ---------- specialists ---------- */
function specForm(s){
  s=s||{id:'',name:'',role:'',area:'Development',skills:[],rate:'',monthly:'',level:'verified',avail:'Available now',city:'',langs:'EN',bio:'',checkedBy:'',checkedOn:'',published:true};
  const k=s.id||'new';
  return `<div class="grid g3" style="margin-top:12px">
    <label class="field"><span>Name</span><input class="inp" id="sn_${k}" value="${esc(s.name)}"></label><label class="field"><span>Role / headline</span><input class="inp" id="sr_${k}" value="${esc(s.role)}"></label>
    <label class="field"><span>Area</span><select class="inp" id="sa_${k}">${S.o.areas.map(a=>`<option ${s.area===a?'selected':''}>${a}</option>`).join('')}</select></label>
    <label class="field"><span>Skills (comma separated)</span><input class="inp" id="ss_${k}" value="${esc((s.skills||[]).join(', '))}"></label><label class="field"><span>Rate € / h</span><input class="inp" id="srt_${k}" value="${esc(s.rate||'')}"></label><label class="field"><span>Monthly € (teams)</span><input class="inp" id="sm_${k}" value="${esc(s.monthly||'')}"></label>
    <label class="field"><span>Level</span><select class="inp" id="sl_${k}">${['registered','verified','checked'].map(l=>`<option ${s.level===l?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span>Availability</span><input class="inp" id="sv_${k}" value="${esc(s.avail)}"></label><label class="field"><span>City</span><input class="inp" id="sc_${k}" value="${esc(s.city)}"></label>
    <label class="field"><span>Languages</span><input class="inp" id="sg_${k}" value="${esc(s.langs)}"></label><label class="field"><span>Checked by</span><input class="inp" id="scb_${k}" value="${esc(s.checkedBy||'')}"></label><label class="field"><span>Checked on (e.g. Sep 2026)</span><input class="inp" id="sco_${k}" value="${esc(s.checkedOn||'')}"></label></div>
    <label class="field"><span>Bio</span><textarea class="inp" id="sb_${k}">${esc(s.bio)}</textarea></label>
    <div class="row wrapf"><label class="row small"><input type="checkbox" id="sp_${k}" ${s.published?'checked':''}> Published in the directory</label><button class="btn g sm" data-a="ssave" data-id="${esc(s.id)}" data-was="${s.published?1:0}">${s.id?'Save':'Create'}</button></div>`;
}
function vSpecs(){
  const o=S.o;
  return `<div class="stack"><details class="card"><summary style="cursor:pointer;font-weight:600">+ Add a specialist to the directory</summary>${specForm(null)}</details>
  ${o.specialists.map(s=>`<details class="card"><summary style="cursor:pointer;list-style:none"><div class="row between wrapf"><div><b>${esc(s.name)}</b> <span class="muted small">${esc(s.role)} · ${esc(s.area)} · ${s.rate?eur(s.rate)+'/h':s.monthly?eur(s.monthly)+'/mo':'no rate'}</span><div class="muted tiny">${s.email?'Account: '+esc(s.email):'No account (staff act for them)'} · ${s.deals} deals${s.rating?' · ★ '+s.rating:''}</div></div><span class="row">${s.submitted&&!s.published?pill('Submitted for review','wait'):''}${pill(s.level,s.level==='checked'?'ok':s.level==='verified'?'info':'')}${pill(s.published?'Public':'Hidden',s.published?'ok':'')}</span></div></summary>
    ${s.profile&&s.profile.portfolio?`<p class="small" style="margin-top:8px">Portfolio: <a href="${esc(/^https?:\/\//.test(s.profile.portfolio)?s.profile.portfolio:'#')}" target="_blank" rel="noopener noreferrer">${esc(s.profile.portfolio)}</a> · ${esc(s.profile.hours||'')} h/week</p>`:''}
    ${specForm(s)}
    ${!s.email?`<div class="row wrapf" style="margin-top:10px"><input class="inp" id="link_${esc(s.id)}" style="max-width:280px" placeholder="Link to user e-mail"><button class="btn ghost sm" data-a="slink" data-id="${esc(s.id)}">Link account</button></div>`:`<h4 style="margin-top:14px">Send a matched opportunity</h4><div class="grid g3" style="margin-top:6px"><input class="inp" id="ot_${esc(s.id)}" placeholder="Title"><input class="inp" id="oc_${esc(s.id)}" placeholder="Client"><input class="inp" id="ob_${esc(s.id)}" placeholder="Budget, e.g. €4,000 fixed"></div><div class="row wrapf" style="margin-top:6px"><select class="inp" id="ok_${esc(s.id)}" style="width:auto"><option>Matched</option><option>Team seat</option></select><input class="inp" id="ow_${esc(s.id)}" style="flex:1" placeholder="Why them (one per line)"><button class="btn ghost sm" data-a="oppnew" data-id="${esc(s.id)}">Send</button></div><textarea class="inp" id="od_${esc(s.id)}" style="margin-top:6px" placeholder="Description"></textarea>`}
  </details>`).join('')}</div>`;
}
/* ---------- users & verification ---------- */
const STEPS=[['id','ID verified'],['skills','Skills test'],['refs','References'],['interview','Interview'],['checked','Checked in person']];
function vUsers(){
  const q=S.q.toLowerCase();const U=S.o.users.filter(u=>!q||(u.email+' '+u.name).toLowerCase().includes(q));
  return `<input class="inp" id="uq" placeholder="Search users" value="${esc(S.q)}" style="max-width:320px;margin-bottom:12px">
  <div class="stack">${U.map(u=>`<details class="card"><summary style="cursor:pointer;list-style:none"><div class="row between wrapf"><div><b>${esc(u.name)}</b> <span class="muted small">${esc(u.email)} · joined ${esc(u.at)} · prefers ${u.role_pref==='hire'?'hiring':'working'}</span></div><span class="row">${u.email_verified?'':pill('E-mail unconfirmed','wait')}${u.twofa?pill('2FA','ok'):''}${u.is_admin?pill('Staff','info'):''}${u.closed_at?pill('Closed','bad'):''}${Object.values(u.verify||{}).some(v=>v&&v.st==='pending')?pill('Check pending','wait'):''}</span></div></summary>
    <table class="tbl" style="margin-top:10px"><thead><tr><th>Step</th><th>Status</th><th>Details</th><th></th></tr></thead><tbody>${STEPS.map(([k,l])=>{const v=(u.verify||{})[k]||{};return `<tr><td>${l}</td><td><select class="inp" id="v_${u.id}_${k}" style="width:auto"><option value="" ${!v.st?'selected':''}>not started</option><option value="pending" ${v.st==='pending'?'selected':''}>pending</option><option value="done" ${v.st==='done'?'selected':''}>done</option></select></td><td><input class="inp" id="vs_${u.id}_${k}" value="${esc(v.sub||'')}" placeholder="e.g. Passed · 86%"><div class="muted tiny">${v.slot?'Booked: '+esc(v.slot):''}${v.refs?v.refs.map(r=>esc(r.name+' <'+r.email+'> '+(r.company||''))).join('<br>'):''}${v.file?`<a href="/api/account/files/${v.file}">ID document</a>`:''}</div></td><td><button class="btn ghost sm" data-a="vset" data-id="${u.id}" data-k="${k}">Save</button></td></tr>`}).join('')}</tbody></table>
    <div class="row wrapf" style="margin-top:10px"><button class="btn ghost sm" data-a="admin" data-id="${u.id}" data-v="${u.is_admin?0:1}">${u.is_admin?'Remove staff access':'Make staff'}</button></div></details>`).join('')}</div>`;
}
/* ---------- deals ---------- */
function vDeals(){
  const o=S.o;
  return `${o.issues.length?`<div class="card" style="margin-bottom:14px"><h3>Issues (mediation)</h3>${o.issues.map(i=>`<div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><div><b>${esc(i.title)}</b> <span class="muted small">${esc(i.email||'')} · ${esc(i.at)}</span><p class="small">${esc(i.text)}</p></div>${i.status==='open'?`<button class="btn ghost sm" data-a="iclose" data-id="${i.id}">Mark resolved</button>`:pill('Resolved','ok')}</div>`).join('')}</div>`:''}
  <div class="stack">${o.deals.map(d=>{const cur=d.ms.find(m=>['inprogress','changes'].includes(m.st));return `<div class="card"><div class="row between wrapf"><div><b>${esc(d.title)}</b> <span class="muted small">${esc(d.client)} → ${esc(d.specName)}${d.linked?'':' (no account)'} · ${esc(d.model)} · ${eur(d.total)}</span></div>${pill(d.status,d.status==='active'?'info':d.status==='done'?'ok':'wait')}</div>
    <div class="small muted" style="margin-top:6px">${d.ms.map(m=>`${esc(m.n)} ${eur(m.amt)} <b>${esc(m.st)}</b>`).join(' · ')}</div>
    ${!d.linked?`<div class="row wrapf" style="margin-top:10px">${d.status==='proposed'?`<button class="btn g sm" data-a="dacc" data-id="${d.id}">Accept terms for ${esc(d.specName)}</button>`:''}${cur?`<input class="inp" id="dn${d.id}" style="flex:1;min-width:200px" placeholder="Delivery note from ${esc(d.specName)}"><button class="btn g sm" data-a="ddel" data-id="${d.id}">Deliver "${esc(cur.n)}"</button>`:''}</div>`:''}
    ${d.kind==='dept'&&d.status==='active'?`<div class="row wrapf" style="margin-top:10px"><input class="inp" id="rw${d.id}" style="width:200px" placeholder="Week 40 · 28 Sep–4 Oct"><input class="inp" id="rh${d.id}" style="width:90px" placeholder="Hours"><input class="inp" id="rs${d.id}" style="flex:1;min-width:200px" placeholder="Summary"><button class="btn ghost sm" data-a="radd" data-id="${d.id}">Post weekly report</button></div>`:''}</div>`}).join('')||empty('No deals yet.')}</div>`;
}
/* ---------- money ---------- */
function vMoney(){
  const o=S.o;
  return `<div class="grid g2"><div class="card"><h3>SEPA top-ups to confirm</h3>${o.sepa.length?o.sepa.map(t=>`<div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span class="small">${esc(t.at)} · ${esc(t.email)} · ${esc(t.mode)} · ref ${esc(t.ref||'')}</span><span class="row"><b>${eur(t.amount)}</b><button class="btn g sm" data-a="sepa" data-id="${t.id}">Arrived</button></span></div>`).join(''):'<p class="muted small" style="margin-top:6px">Nothing pending.</p>'}</div>
  <div class="card"><h3>Payouts to send</h3>${o.payouts.length?o.payouts.map(t=>`<div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span class="small">${esc(t.at)} · ${esc(t.email)} · ${esc(t.tax.holder||'')} ${esc(t.tax.iban||'no IBAN')}</span><span class="row"><b>${eur(-t.amount)}</b><button class="btn g sm" data-a="paid" data-id="${t.id}">Paid</button></span></div>`).join(''):'<p class="muted small" style="margin-top:6px">Nothing pending.</p>'}</div></div>
  <div class="card" style="margin-top:14px"><h3>Booked calls and interviews</h3>${o.bookings.length?`<table class="tbl"><tbody>${o.bookings.map(b=>`<tr><td>${esc(b.kind)}</td><td>${esc(b.name)} &lt;${esc(b.email)}&gt;</td><td>with ${esc(b.with_name)}</td><td><b>${esc(b.slot)}</b></td><td class="muted">${esc(b.at)}</td></tr>`).join('')}</tbody></table>`:'<p class="muted small">None yet.</p>'}</div>`;
}
function vMail(){
  return `<p class="muted small" style="margin-bottom:10px">${S.o.smtp?'Sent through your SMTP server.':'SMTP_URL is not set, so e-mails are only logged here and in the server log. Set SMTP_URL to deliver them.'}</p><div class="stack">${S.o.outbox.map(m=>`<details class="card"><summary style="cursor:pointer"><b>${esc(m.subject)}</b> <span class="muted small">to ${esc(m.to_addr)} · ${esc(m.at)} · ${esc(m.status)}${m.error?' · '+esc(m.error):''}</span></summary><pre style="white-space:pre-wrap;font:13px/1.5 Inter,sans-serif;margin-top:10px">${esc(m.body)}</pre></details>`).join('')}</div>`;
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab]');if(t){S.tab=t.dataset.tab;S.sel=null;render();return}
  const s=e.target.closest('[data-sel]');if(s&&S.tab==='inbox'){S.sel=+s.dataset.sel;render();const tb=document.querySelector('.tb');if(tb)tb.scrollTop=1e6;return}
  const b=e.target.closest('[data-a]');if(!b)return;e.preventDefault();
  const id=b.dataset.id,a=b.dataset.a;
  const H={
    refresh:()=>load().then(()=>toast('Refreshed')),
    read:()=>act('thread_read',{threadId:id},'Marked read'),
    reply:()=>{S.f.rname=val('rname');act('thread_reply',{threadId:id,text:val('reply'),as:val('as')||'staff',name:val('rname')},'Sent')},
    bupdate:()=>act('brief_update',{id,status:val('bst'+id),matcherName:val('bmn'+id),matcherRole:val('bmr'+id)}),
    bshort:()=>{const ids=[0,1,2].map(i=>val(`bsl${id}_${i}`)).filter(Boolean);const why={};[0,1,2].forEach(i=>{const k=val(`bsl${id}_${i}`);if(k)why[k]=val(`bwhy${id}_${i}`)});act('brief_shortlist',{id,specialists:ids,why},'Shortlist published and client notified')},
    binvite:()=>act('brief_invite',{id,specialistId:val('binv'+id),why:val('binvw'+id)},'Invitation sent'),
    lsave:()=>act('lead_status',{id,status:val('ls'+id),note:val('ln'+id)}),
    ssave:()=>{const k=id||'new';act('spec_save',{id:id||undefined,wasPublished:b.dataset.was==='1',name:val('sn_'+k),role:val('sr_'+k),area:val('sa_'+k),skills:val('ss_'+k),rate:val('srt_'+k),monthly:val('sm_'+k),level:val('sl_'+k),avail:val('sv_'+k),city:val('sc_'+k),langs:val('sg_'+k),checkedBy:val('scb_'+k),checkedOn:val('sco_'+k),bio:val('sb_'+k),published:val('sp_'+k)})},
    slink:()=>act('link_specialist',{specialistId:id,email:val('link_'+id)},'Linked'),
    oppnew:()=>act('opp_create',{specialistId:id,title:val('ot_'+id),client:val('oc_'+id),budget:val('ob_'+id),kind:val('ok_'+id),why:val('ow_'+id),descr:val('od_'+id)},'Opportunity sent'),
    vset:()=>act('verify_set',{userId:id,key:b.dataset.k,st:val(`v_${id}_${b.dataset.k}`),sub:val(`vs_${id}_${b.dataset.k}`)}),
    admin:()=>{if(confirm('Change staff access?'))act('user_admin',{id,admin:b.dataset.v==='1'})},
    dacc:()=>act('deal_accept_for',{dealId:id},'Accepted; client notified'),
    ddel:()=>act('deal_deliver_for',{dealId:id,note:val('dn'+id)},'Delivered; client notified'),
    radd:()=>act('report_add',{dealId:id,week:val('rw'+id),hours:val('rh'+id),summary:val('rs'+id)},'Report posted'),
    iclose:()=>act('issue_close',{id}),
    sepa:()=>act('sepa_confirm',{txId:id},'Balance credited'),
    paid:()=>act('payout_done',{txId:id},'Marked paid')
  };
  if(H[a])H[a]();
});
document.addEventListener('input',e=>{if(e.target.id==='uq'){S.q=e.target.value;render();const el=document.getElementById('uq');el.focus();el.setSelectionRange(S.q.length,S.q.length)}});
setInterval(()=>{if(!document.hidden&&!document.activeElement.matches('input,textarea,select'))load().catch(()=>{})},30000);
render();load().catch(e=>{document.getElementById('root').innerHTML=`<div class="loading">${esc(e.message)}</div>`});
