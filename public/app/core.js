/* AfterWorc account: helpers, state, API, shell, router, events */
'use strict';
const IC={
 home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 brief:'<path d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z"/><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 12h8M8 16h5"/>',
 opp:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6M11 8v6"/>',
 deal:'<path d="M4 7h16v12H4z"/><path d="M4 11h16M9 15h2"/><path d="M8 7V5h8v2"/>',
 msg:'<path d="M4 5h16v11H8l-4 4z"/>',
 money:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
 bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 check:'<path d="m5 12 4 4 10-10"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
 team:'<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5M15 14.5c2.8.2 5 2 5.8 5"/>',
 task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
 dept:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 org:'<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
 out:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
 file:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
 spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
 star:'<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z"/>',
 dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
 send:'<path d="M4 12 20 4l-6 16-3-7z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>'
};
const ic=(n,s=18,sw=1.8)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;
const sealSvg='<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2f9e4a"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const seal=lv=>lv==='checked'?`<span class="seal">${sealSvg}Checked in person</span>`:lv==='id'?`<span class="seal" style="color:var(--blue)">${ic('shield',14,2)}ID verified</span>`:'<span class="pill">Registered</span>';
const eur=n=>'€'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Undo esc() for values copied from (escaped) state into editable fields. */
const un=s=>String(s??'').replace(/&(amp|lt|gt|quot|#39);/g,(m,k)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[k]));
/* Both return HTML-escaped text: safe to interpolate. */
const initials=n=>esc(un(n).split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?');
const first=n=>esc(un(n).split(/\s+/)[0]);
/* Every string from the server is escaped once on arrival, so templates can interpolate state directly. */
const clean=v=>typeof v==='string'?esc(v):Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x)])):v;

/* ---------- state ---------- */
const S={
 data:null, mode:'hire', route:'home', param:null, tab:null, menu:null, modal:null, toast:null, busy:false,
 star:0, reveal:null, gq:'',
 wiz:null, prof:null, review:{text:'',note:''}, prop:{}, set:{}, help:{topic:'A deal or payment',text:''}
};
const D=()=>S.data;
const P=id=>(Object.hasOwn(S.data.people,id)&&S.data.people[id])||{id,name:'Specialist',role:'',lv:'registered',skills:[],deals:0,rating:null,avail:'',city:''};
const freshWiz=()=>({id:null,step:0,type:null,line:'',ai:false,title:'',desc:'',area:'Development',profs:['Backend Developer'],roles:{},budget:null,start:'Within 2 weeks',opt:{countries:'Anywhere in the EU',visibility:'Checked specialists + AfterWorc shortlist (recommended)',deadline:'',nda:false},pq:''});
S.wiz=freshWiz();

/* ---------- API ---------- */
async function api(path,body,opts={}){
  const r=await fetch('/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Requested-With':'afterworc'},credentials:'same-origin',body:body?JSON.stringify(body):undefined,...opts});
  if(r.status===401){location.href='/#login';throw new Error('Log in to continue')}
  let d={};try{d=await r.json()}catch(e){}
  if(!r.ok){const e=new Error(d.error||'Something went wrong. Try again.');e.data=d;throw e}
  return d;
}
async function upload(files){
  const fd=new FormData();[...files].slice(0,5).forEach(f=>fd.append('files',f));
  const r=await fetch('/api/account/files',{method:'POST',headers:{'X-Requested-With':'afterworc'},body:fd,credentials:'same-origin'});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Upload failed');return d.files;
}
function setData(d){S.data=clean(d)}
/** Run an account action on the server; the response carries the new state. */
async function act(type,payload={},{quiet=false,keepModal=false}={}){
  if(S.busy)return null;S.busy=true;if(!quiet)render();
  try{
    const r=await api('/account/action',{mode:S.mode,...payload,type});
    S.busy=false;
    if(r.logout){location.href='/';return r}
    if(r.redirect){location.href=r.redirect;return r}
    if(r.state)setData(r.state);
    if(!keepModal)S.modal=null;
    if(r.go){S.modal=null;go(r.go[0],r.go[1],r.go[2])}
    else render();
    if(r.toast)toast(r.toast);
    return r;
  }catch(e){
    S.busy=false;render();
    if(e.data&&e.data.need2fa&&!D().twofa){S.modal={k:'need2fa'};render();return null}
    toast(e.message,true);return null;
  }
}
async function refresh(){try{setData(await api('/account/state'));render()}catch(e){}}

/* ---------- shell ---------- */
const NAV={
 hire:[['home','Home','home'],['briefs','Briefs','brief'],['deals','Deals','deal'],['messages','Messages','msg'],['money','Money','money']],
 work:[['home','Home','home'],['opps','Opportunities','opp'],['deals','Deals','deal'],['messages','Messages','msg'],['money','Money','money']]
};
function needsMe(d){
  if(d.side==='hire'){
    if(d.ms.some(x=>x.st==='delivered'))return true;
    if(d.reports&&d.reports.some(r=>r.st==='review'))return true;
    if(d.status==='done'&&d.review==='pending')return true;
    return false;
  }
  return d.status==='proposed'||d.ms.some(x=>['inprogress','changes'].includes(x.st));
}
function counts(){
  const m=S.mode,d=D();
  return {
    briefs:d.briefs.filter(b=>b.status==='shortlist').length,
    deals:d.deals.filter(x=>x.side===m&&needsMe(x)).length,
    messages:d.threads.filter(t=>t.mode===m&&t.unread).length,
    opps:d.opps.filter(o=>o.status==='invited'||o.status==='new').length,
    notifs:d.notifs.filter(n=>n.mode===m&&n.unread).length
  };
}
const navOn=r=>S.route===r||(r==='briefs'&&['brief','newbrief'].includes(S.route))||(r==='deals'&&S.route==='deal')||(r==='opps'&&S.route==='opp')||(r==='money'&&S.route==='card');
function shell(){
  const c=counts(),d=D();
  const navBtns=NAV[S.mode].map(([r,l,i])=>{const n=c[r]||0;return `<button class="nav ${navOn(r)?'on':''}" data-go="${r}">${ic(i)}<span>${l}</span>${n?`<span class="cnt ${r==='deals'?'am':''}">${n}</span>`:''}</button>`}).join('');
  const bottom=NAV[S.mode].map(([r,l,i])=>{const n=c[r]||0;return `<button class="${navOn(r)?'on':''}" data-go="${r}">${ic(i,20)}<span>${l}</span>${n?`<span class="cnt">${n}</span>`:''}</button>`}).join('');
  const who=S.mode==='hire'?d.acting:'specialist';
  const cc=d.cards[S.mode];
  return `
  <header class="top"><div class="in">
    <button class="logo" data-go="home" aria-label="AfterWorc home"><span class="mk"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 7.5A7.5 7.5 0 1 0 18 16.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg></span><span class="wm hide-m">afterwor<i>c</i></span></button>
    <div class="modesw" role="tablist" aria-label="Mode">
      <button class="${S.mode==='hire'?'on':''}" data-act="mode" data-arg="hire">${ic('team',15)}Hiring</button>
      <button class="${S.mode==='work'?'on':''}" data-act="mode" data-arg="work">${ic('task',15)}Working</button>
    </div>
    <div class="gsearch"><span>${ic('search',15)}</span><input id="gq" placeholder="${S.mode==='hire'?'Search checked specialists, briefs, deals…':'Search opportunities, deals, messages…'}" autocomplete="off" value="${esc(S.gq)}"><div id="gres"></div></div>
    <div class="spacer"></div>
    <button class="btn g sm hide-m" data-go="${S.mode==='hire'?'newbrief':'profile'}">${ic('plus',15,2.2)}${S.mode==='hire'?'Start a brief':'Complete profile'}</button>
    <button class="walletchip" data-go="${cc.st==='active'?'card':'money'}" aria-label="${S.mode==='hire'?'Company':'Working'} balance ${eur(d.money[S.mode].available)}"><span class="mc ${cc.st!=='active'?'nc':S.mode==='hire'?'co':''}">${cc.st==='active'?'':ic('plus',12,2.4)}</span><b>${eur(d.money[S.mode].available)}</b>${cc.st==='active'?`<span class="muted">••${cc.last4}</span>`:''}${cc.frozen?'<span class="pill wait" style="padding:0 6px">Frozen</span>':''}</button>
    <div style="position:relative">
      <button class="iconbtn" data-act="menu" data-arg="notifs" aria-label="Notifications">${ic('bell')}${c.notifs?`<span class="dot">${c.notifs}</span>`:''}</button>
      ${S.menu==='notifs'?notifMenu():''}
    </div>
    <button class="iconbtn hide-m" data-go="messages" aria-label="Messages">${ic('msg')}${c.messages?`<span class="dot">${c.messages}</span>`:''}</button>
    <div style="position:relative">
      <button class="avbtn" data-act="menu" data-arg="avatar"><span class="avatar sm">${d.me.initials}</span><span class="who"><b>${d.me.name}</b><span class="muted">as ${who}</span></span></button>
      ${S.menu==='avatar'?avatarMenu():''}
    </div>
  </div></header>
  <div class="app">
    <aside class="side">
      ${navBtns}
      <div class="cta"><button class="btn g block" data-go="${S.mode==='hire'?'newbrief':'profile'}">${ic('plus',15,2.2)}${S.mode==='hire'?'Start a brief':'Edit profile'}</button></div>
      <div class="foot">${S.mode==='hire'?`Acting as <b>${d.acting}</b><br><button class="btn link small" data-act="menu" data-arg="avatar">Switch</button>`:`${d.prof?`Level · <b>${{checked:'Checked in person',verified:'ID verified',registered:'Registered'}[d.prof.level]}</b>`:'Set up your profile'}`}</div>
    </aside>
    <main class="main" id="main">${view()}</main>
  </div>
  <nav class="bottomnav">${bottom}</nav>
  ${S.modal?modalHtml():''}
  ${S.toast?`<div class="toast" role="status">${ic(S.toast.err?'flag':'check',16,2.4)}${esc(S.toast.t)}</div>`:''}`;
}
function notifMenu(){
  const list=D().notifs.filter(n=>n.mode===S.mode);
  return `<div class="menu nf"><div class="nfh"><b>Notifications</b>${list.some(n=>n.unread)?'<button class="btn link small" data-act="readall">Mark all read</button>':''}</div>
   ${list.length?list.slice(0,25).map(n=>`<div class="nfi ${n.unread?'unread':''}" data-act="notif" data-arg="${n.id}" role="button" tabindex="0"><span style="color:var(--brand2);margin-top:2px">${ic(n.unread?'bell':'check',16)}</span><div><b style="font-weight:600">${n.t}</b><div class="muted small">${n.s}</div><div class="muted tiny">${n.at}</div></div></div>`).join(''):'<div class="nfi muted">Nothing yet. Updates on briefs, deals and payments appear here.</div>'}
   <div class="nfh small muted">Choose what you get in <button class="btn link small" data-go="settings" data-arg="notif">Settings</button></div></div>`;
}
function avatarMenu(){
  const d=D();
  const ac=(id,n,sub)=>`<button class="acting ${(d.actingOrgId||null)===id?'on':''}" data-act="acting" data-arg="${id||''}"><span class="avatar sm ${id?'alt':''}">${initials(n)}</span><span><b style="font-size:13px">${n}</b><div class="muted tiny">${sub}</div></span>${(d.actingOrgId||null)===id?'<span class="ck">✓</span>':''}</button>`;
  return `<div class="menu">
   <div class="hd">Acting as</div>
   ${ac(null,d.me.name,'Personal')}${d.orgs.map(o=>ac(o.id,o.name,`Company${o.vat?' · VAT '+o.vat:''} · ${o.role}`)).join('')}
   <button class="mi" data-go="settings" data-arg="org">${ic('plus',16)}Add a company</button>
   <hr>
   <button class="mi" data-go="pp" data-arg="me">${ic('eye',16)}View my public profile</button>
   <button class="mi" data-go="profile">${ic('user',16)}Profile &amp; rate</button>
   <button class="mi" data-go="settings" data-arg="sec">${ic('gear',16)}Settings</button>
   <button class="mi" data-go="help">${ic('help',16)}Help &amp; support</button>
   ${d.me.admin?`<a class="mi" href="/admin" style="text-decoration:none;color:inherit">${ic('shield',16)}Staff console</a>`:''}
   <a class="mi" href="/" style="text-decoration:none;color:inherit">${ic('globe',16)}afterworc.com</a>
   <hr>
   <button class="mi" data-act="theme">${ic('spark',16)}Switch theme</button>
   <button class="mi" data-act="logout">${ic('out',16)}Sign out</button>
  </div>`;
}

/* ---------- router ---------- */
const head=(t,sub,right='',crumb='')=>`${crumb?`<div class="crumb">${crumb}</div>`:''}<div class="pagehead"><div><h1>${t}</h1>${sub?`<p class="sub">${sub}</p>`:''}</div><div class="row wrapf">${right}</div></div>`;
function view(){
  const r=S.route,p=S.param;
  const V={home:()=>S.mode==='hire'?vHireHome():vWorkHome(),briefs:vBriefs,brief:()=>vBrief(p),newbrief:vNewBrief,deals:vDeals,deal:()=>vDeal(p),messages:()=>vMessages(p),
    money:()=>S.mode==='hire'?vMoneyHire():vMoneyWork(),card:vCard,opps:vOpps,opp:()=>vOpp(p),profile:vProfile,pp:()=>vPublic(p),settings:vSettings,help:vHelp,find:vFind};
  return (V[r]||V.home)();
}
function go(r,p,tab,{push=true}={}){
  S.route=r;S.param=p==null||p===''?null:String(p);S.tab=tab||null;S.menu=null;S.modal=null;S.gq='';
  if(r==='settings'&&S.param){S.tab=S.param}
  if(r==='newbrief'&&p){loadDraft(p)}
  if(r==='profile'&&!S.prof)S.prof=profDraft();
  const h='#/'+S.mode+'/'+r+(S.param?'/'+encodeURIComponent(S.param):'');
  if(push&&location.hash!==h)history.pushState(null,'',h);
  render();window.scrollTo({top:0});
  if(r==='messages')markThreadRead();
}
function fromHash(){
  const h=(location.hash||'').replace(/^#\/?/,'').split('/').map(x=>{try{return decodeURIComponent(x)}catch(e){return x}});
  if(h[0]==='hire'||h[0]==='work')S.mode=h[0];
  S.route=h[1]||'home';S.param=h[2]||null;S.tab=S.route==='settings'?S.param:null;S.modal=null;S.menu=null;
  if(S.route==='profile'&&!S.prof)S.prof=profDraft();
  if(S.route==='newbrief'&&S.param)loadDraft(S.param);
}
function markThreadRead(){
  const list=D().threads.filter(t=>t.mode===S.mode);const t=list.find(x=>x.id===S.param)||list[0];
  if(t&&t.unread){t.unread=false;api('/account/action',{type:'thread_read',id:t.id}).catch(()=>{});render()}
  setTimeout(()=>{const tb=document.getElementById('tb');if(tb)tb.scrollTop=1e6},0);
}

/* ---------- render + toast ---------- */
const root=document.getElementById('root');
function render(){
  if(!S.data){root.innerHTML='<div class="loading">Loading your account…</div>';return}
  const a=document.activeElement,id=a&&a.id,pos=a&&a.selectionStart;
  root.innerHTML=shell();
  if(id){const el=document.getElementById(id);if(el&&el!==document.activeElement){el.focus({preventScroll:true});try{if(pos!=null)el.setSelectionRange(pos,pos)}catch(e){}}}
  if(S.gq)searchResults();
}
let toastT;
function toast(t,err){S.toast={t:un(t),err};render();clearTimeout(toastT);toastT=setTimeout(()=>{S.toast=null;const el=document.querySelector('.toast');if(el)el.remove()},3200)}

/* ---------- global search ---------- */
function searchResults(){
  const q=S.gq.toLowerCase().trim();const box=document.getElementById('gres');if(!box)return;
  if(!q){box.innerHTML='';return}
  const d=D();const L=s=>un(s).toLowerCase();
  const hits=[...Object.values(d.people).filter(p=>L(p.name+' '+p.role+' '+p.skills.join(' ')).includes(q)).map(p=>['pp',p.id,p.name,p.role]),
    ...d.briefs.filter(b=>L(b.title).includes(q)).map(b=>[b.status==='draft'?'newbrief':'brief',b.id,b.title,'Brief']),
    ...d.deals.filter(x=>x.side===S.mode&&L(x.title).includes(q)).map(x=>['deal',x.id,x.title,'Deal']),
    ...d.opps.filter(o=>S.mode==='work'&&L(o.title+' '+o.client).includes(q)).map(o=>['opp',o.id,o.title,'Opportunity']),
    ...d.threads.filter(t=>t.mode===S.mode&&L(t.name+' '+t.msgs.map(m=>m.t).join(' ')).includes(q)).map(t=>['messages',t.id,t.name,'Messages']),
    ...(['card','mastercard','top up','balance','freeze'].some(k=>k.startsWith(q)||q.startsWith(k))?[['card','','AfterWorc card','Money']]:[])].slice(0,8);
  box.innerHTML=`<div class="menu" style="left:0;right:auto;top:42px;width:100%">${hits.length?hits.map(h=>`<button class="mi" data-go="${h[0]}" data-arg="${h[1]}"><b style="font-weight:600">${h[2]}</b><span class="muted tiny" style="margin-left:auto">${h[3]}</span></button>`).join(''):'<div class="hd">No results</div>'}</div>`;
}

/* ---------- events ---------- */
function setPath(path,val){const ks=path.split('.');let o=S;for(const k of ks.slice(0,-1)){if(o[k]==null)o[k]={};o=o[k]}o[ks[ks.length-1]]=val}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');
  if(g){e.preventDefault();go(g.dataset.go,g.dataset.arg,g.dataset.tab);return}
  const a=e.target.closest('[data-act]');
  if(a){if(a.dataset.act==='scrim'&&e.target!==a)return;if(a.tagName!=='INPUT')e.preventDefault();const f=A[a.dataset.act];if(f)f(a.dataset.arg,a,e);return}
  if(S.menu&&!e.target.closest('.menu')){S.menu=null;render()}
  if(S.gq&&!e.target.closest('.gsearch')){S.gq='';render()}
});
document.addEventListener('input',e=>{
  const b=e.target.dataset.bind;
  if(b){setPath(b,e.target.type==='checkbox'?e.target.checked:e.target.value);if(e.target.dataset.live!=null)render()}
  if(e.target.id==='gq'){S.gq=e.target.value;searchResults()}
});
document.addEventListener('change',e=>{
  const b=e.target.dataset.bind;
  if(b&&e.target.tagName==='SELECT'){setPath(b,e.target.value);if(e.target.dataset.live!=null)render()}
  if(e.target.dataset.upload){const f=A['up_'+e.target.dataset.upload];if(f)f(e.target.files,e.target)}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&(S.modal||S.menu||S.gq)){S.modal=null;S.menu=null;S.gq='';render()}
  if(e.key==='Enter'&&e.target.id==='msgin'&&!e.shiftKey){e.preventDefault();const b=document.querySelector('[data-act="send"]');if(b)A.send(b.dataset.arg)}
  if(e.key==='Enter'&&e.target.id==='skillin'){e.preventDefault();A.addskill()}
  if(e.key==='Enter'&&e.target.classList.contains('nfi')){e.target.click()}
});
addEventListener('popstate',()=>{fromHash();render();if(S.route==='messages')markThreadRead()});
/* Keep messages and notifications fresh while the tab is open. */
setInterval(()=>{
  if(document.hidden||S.modal||S.busy)return;
  const a=document.activeElement;if(a&&['INPUT','TEXTAREA','SELECT'].includes(a.tagName)&&a.id!=='msgin')return;
  if(a&&a.id==='msgin'&&a.value)return;
  refresh();
},20000);

(async function init(){
  render();
  fromHash();
  try{setData(await api('/account/state'))}catch(e){root.innerHTML=`<div class="loading">${esc(e.message)}</div>`;return}
  if(!location.hash||!/^#\/(hire|work)/.test(location.hash)){S.mode=D().me.rolePref==='work'?'work':'hire';history.replaceState(null,'','#/'+S.mode+'/home')}
  render();
  if(S.route==='messages')markThreadRead();
  if(new URLSearchParams(location.search).has('paid')){history.replaceState(null,'','/app'+location.hash);toast('Payment received. Your balance updates as soon as the bank confirms it')}
})();
