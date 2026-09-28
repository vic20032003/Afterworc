/* ================= helpers ================= */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P={
 task:'M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1zM5 7h14v13H5zM9 13l2 2 4-4',
 user:'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
 team:'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5M15 14.5c2.8.2 5 2 5.8 5',
 dept:'M5 21V4h10v17M15 9h4v12M8 8h3M8 12h3M8 16h3M3 21h18',
 id:'M4 6h16v12H4zM8 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM13 10h4M13 13h3M6.5 16c.5-1.2 1.5-1.8 2.5-1.8s2 .6 2.5 1.8',
 code:'m9 8-4 4 4 4M15 8l4 4-4 4',
 phone:'M6 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z',
 chat:'M4 5h16v11H9l-5 4z',
 mega:'M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6',
 pen:'M4 20l4-1 10-10-3-3L5 16zM13 7l3 3',
 brief:'M8 7V5h8v2M4 7h16v12H4zM4 12h16',
 check:'m5 12 4 4 10-10',
 arrow:'M5 12h14M13 6l6 6-6 6',
 lock:'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
 snow:'M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9',
 plus:'M12 5v14M5 12h14',
 phoneW:'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
 shield:'M12 3 5 6v6c0 4.2 3 7.8 7 9 4-1.2 7-4.8 7-9V6zm-3 9 2 2 4-4',
 card:'M3 6h18v12H3zM3 10h18M7 15h3',
 search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
 moon:'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
 sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
 menu:'M4 7h16M4 12h16M4 17h16',
 x:'M6 6l12 12M18 6 6 18',
 globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
 bank:'M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
 copy:'M8 8h11v12H8zM5 16V4h11',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
 eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
 money:'M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18M7 15h3',
 star:'m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z',
 chev:'m9 6 6 6-6 6',
 spark:'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
 file:'M14 3H6v18h12V7zM14 3v4h4'
};
const ic=(n,s=18,w=1.8)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const ck=()=>`<span class="ck">${ic('check',13,2.6)}</span>`;
const sealIc=`<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2f9e4a"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const seal=(t='Checked in person')=>`<span class="seal">${sealIc}${t}</span>`;
const note=()=>''; // design annotations from the prototype are not shown on the live site
let uidN=0;const card=(o)=>awCard(Object.assign({uid:'k'+(++uidN)},o));

/* ================= data ================= */
const DEPTS=[
 {k:'mkt',n:'Marketing',ic:'mega',size:'4 people, one team lead',roles:['Marketing Lead','SMM Manager','Content Writer','Performance Marketer'],tasks:['Social media and community','Content and copywriting','Paid acquisition','Email and lifecycle','Growth reporting']},
 {k:'dev',n:'Development',ic:'code',size:'5 people, one team lead',roles:['Team Lead','Senior Developer','Developer','DevOps Engineer','QA Engineer'],tasks:['Product development','Infrastructure and deployment','Data and integrations','Testing and QA','Maintenance and support']},
 {k:'pay',n:'Payments',ic:'card',size:'5 people, one team lead',roles:['Head of Payments','Payments Operations Specialist','Payment Integrations Engineer','AML / KYC Analyst','Reconciliation Analyst'],tasks:['PSP and acquirer integrations','Payment operations and reconciliation','AML, KYC and transaction monitoring','Chargebacks and disputes','Safeguarding and scheme reporting']},
 {k:'ops',n:'Business Support',ic:'brief',size:'4 people, one team lead',roles:['Project Manager','Operations Manager','Customer Support','Admin Assistant'],tasks:['Project management','Day-to-day operations','Customer support','Back office']}
];
const AREAS={Payments:['Payments Operations Specialist','Payment Integrations Engineer','AML / KYC Analyst','Compliance Officer','Reconciliation Analyst','Head of Payments'],Development:['Backend Developer','Frontend Developer','Fullstack Developer','Mobile Developer','DevOps Engineer','QA Engineer','Team Lead'],Design:['UI/UX Designer','Product Designer','Graphic Designer','Brand Designer','Motion Designer'],Marketing:['Marketing Lead','SMM Manager','Content Writer','Performance Marketer','SEO Specialist'],'Business Support':['Project Manager','Product Manager','Business Analyst','Customer Support','Accountant'],Content:['Copywriter','Translator','Technical Writer','Video Editor'],'Data & Infrastructure':['Data Engineer','Data Analyst','Cloud Engineer','Database Administrator'],'Quality & Security':['QA Automation Engineer','Security Engineer','Penetration Tester']};
const S={me:null,busy:false,forgot:{email:'',done:false},reset:{token:'',pw:''},lang:'en',page:'home',reg:{role:'hire',email:'',pw:'',show:false,terms:false,news:false,done:false,ctx:''},login:{email:'',pw:''},f:{area:'All',level:'any',now:false,max:80,sort:'match'},person:null,dept:'pay',ctab:'biz',tg:{online:true,contactless:true,atm:false,abroad:true},frozen:false,form:{hire:{step:0,type:'team',need:'',email:'',chan:'Email only',done:false},build:{step:0,prof:'',years:'3–5',link:'',email:'',chan:'Email only',done:false}},menu:false,q:'',htab:'hire'};

/* ================= shell ================= */
const NAV=[['search','Find specialists'],['how','How it works'],['card','AfterWorc card',1],['about','About']];
const logo=`<a class="logo" href="#home" aria-label="AfterWorc home"><span class="mk"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 7.5A7.5 7.5 0 1 0 18 16.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg></span><span class="wm">afterwor<i>c</i></span></a>`;
function header(){
  const door=S.page==='hiring'?'hire':S.page==='building'?'work':'';
  return `<header class="top"><div class="wrap in">
    ${logo}
    <div class="modesw" role="group" aria-label="I am"><a href="#hiring" class="${door==='hire'?'on':''}">${ic('team',15)}Hiring</a><a href="#building" class="${door==='work'?'on':''}">${ic('task',15)}Working</a></div>
    <nav class="tnav" aria-label="Main">${NAV.map(([k,l,n])=>`<a href="#${k}" class="${S.page===k?'on':''}">${l}${n?'<span class="pill new">New</span>':''}</a>`).join('')}</nav>
    <div class="spacer"></div>
    <div class="lang" role="group" aria-label="Language">${[['en','EN','English'],['et','ET','Eesti'],['ru','RU','Русский']].map(([k,l,n])=>`<button class="${S.lang===k?'on':''}" data-act="lang" data-arg="${k}" title="${n}" data-notr>${l}</button>`).join('')}</div>
    <button class="iconbtn hide-m" data-act="theme" aria-label="Switch theme">${ic('moon',16)}</button>
    ${S.me?`${S.me.admin?'<a class="btn ghost sm hide-m" href="/admin">Staff console</a>':''}<a class="btn g sm" href="/app">Open account</a>`:`<a class="btn ghost sm hide-m" href="#login">Log in</a>
    <a class="btn g sm" href="#register">Sign up</a>`}
    <div style="position:relative">
      <button class="iconbtn burger" data-act="menu" aria-label="Menu" aria-expanded="${S.menu}">${ic(S.menu?'x':'menu',17)}</button>
      ${S.menu?`<div class="menu">
        <a class="mi" href="#hiring">${ic('team',16)}<span>For business<small>I’m hiring</small></span></a>
        <a class="mi" href="#building">${ic('task',16)}<span>For specialists<small>I’m building</small></span></a>
        <hr>${NAV.map(([k,l,n])=>`<a class="mi" href="#${k}">${l}${n?' <span class="pill new">New</span>':''}</a>`).join('')}
        <hr><div class="row" style="padding:6px 10px;gap:6px" data-notr>${[['en','English'],['et','Eesti'],['ru','Русский']].map(([k,n])=>`<button class="chip ${S.lang===k?'on':''}" data-act="lang" data-arg="${k}">${n}</button>`).join('')}</div><hr>${S.me?`<a class="mi" href="/app">${ic('user',16)}Open account</a><button class="mi" data-act="logout">${ic('arrow',16)}Log out</button>`:`<a class="mi" href="#login">${ic('user',16)}Log in</a><a class="mi" href="#register">${ic('plus',16)}Sign up</a>`}<button class="mi" data-act="theme">${ic('moon',16)}Switch theme</button>
      </div>`:''}
    </div>
  </div></header>`;
}
/* Live afterworc.com assets (footer): wordmark, social icons, card marks */
const LOGO_SVG='<svg viewBox="0 -86 478 94" role="img" aria-label="AfterWorc" class="fl"><path d="M28.6 -56.3Q34.8 -56.3 39.5 -53.8Q44.1 -51.3 46.9 -47.5V-55.4H61.0V0.0H46.9V-8.1Q44.2 -4.2 39.5 -1.7Q34.7 0.9 28.5 0.9Q21.5 0.9 15.8 -2.7Q10.0 -6.3 6.7 -12.9Q3.3 -19.4 3.3 -27.9Q3.3 -36.3 6.7 -42.8Q10.0 -49.3 15.8 -52.8Q21.5 -56.3 28.6 -56.3ZM32.2 -44.0Q28.3 -44.0 25.0 -42.1Q21.7 -40.2 19.7 -36.5Q17.6 -32.9 17.6 -27.9Q17.6 -22.9 19.7 -19.2Q21.7 -15.4 25.1 -13.4Q28.4 -11.4 32.2 -11.4Q36.1 -11.4 39.5 -13.4Q42.9 -15.3 44.9 -19.0Q46.9 -22.6 46.9 -27.7Q46.9 -32.8 44.9 -36.5Q42.9 -40.1 39.5 -42.0Q36.1 -44.0 32.2 -44.0Z M98.3 -43.9H88.6V0.0H74.4V-43.9H68.1V-55.4H74.4V-58.2Q74.4 -68.4 80.2 -73.2Q86.0 -78.0 97.7 -77.7V-65.9Q92.6 -66.0 90.6 -64.2Q88.6 -62.4 88.6 -57.7V-55.4H98.3Z M121.9 -43.9V-17.1Q121.9 -14.3 123.2 -13.1Q124.6 -11.8 127.8 -11.8H134.3V0.0H125.5Q107.8 0.0 107.8 -17.2V-43.9H101.2V-55.4H107.8V-69.1H121.9V-55.4H134.3V-43.9Z M193.7 -23.5H153.2Q153.7 -17.5 157.4 -14.1Q161.1 -10.7 166.5 -10.7Q174.3 -10.7 177.6 -17.4H192.7Q190.3 -9.4 183.5 -4.2Q176.7 0.9 166.8 0.9Q158.8 0.9 152.5 -2.6Q146.1 -6.2 142.6 -12.7Q139.0 -19.2 139.0 -27.7Q139.0 -36.3 142.5 -42.8Q146.0 -49.3 152.3 -52.8Q158.6 -56.3 166.8 -56.3Q174.7 -56.3 181.0 -52.9Q187.2 -49.5 190.7 -43.2Q194.1 -37.0 194.1 -28.9Q194.1 -25.9 193.7 -23.5ZM179.6 -32.9Q179.5 -38.3 175.7 -41.6Q171.9 -44.8 166.4 -44.8Q161.2 -44.8 157.7 -41.7Q154.1 -38.5 153.3 -32.9Z M233.5 -56.2V-41.5H229.8Q223.2 -41.5 219.9 -38.4Q216.5 -35.3 216.5 -27.6V0.0H202.5V-55.4H216.5V-46.8Q219.2 -51.2 223.6 -53.7Q227.9 -56.2 233.5 -56.2Z M317.9 -55.4 301.7 0.0H286.6L276.5 -38.7L266.4 0.0H251.2L234.9 -55.4H249.1L258.9 -13.2L269.5 -55.4H284.3L294.7 -13.3L304.5 -55.4Z M320.2 -27.7Q320.2 -36.2 323.9 -42.7Q327.7 -49.2 334.2 -52.8Q340.7 -56.3 348.7 -56.3Q356.7 -56.3 363.2 -52.8Q369.7 -49.2 373.5 -42.7Q377.2 -36.2 377.2 -27.7Q377.2 -19.2 373.4 -12.7Q369.5 -6.2 363.0 -2.6Q356.4 0.9 348.3 0.9Q340.3 0.9 333.9 -2.6Q327.5 -6.2 323.9 -12.7Q320.2 -19.2 320.2 -27.7ZM362.8 -27.7Q362.8 -35.6 358.6 -39.9Q354.5 -44.1 348.5 -44.1Q342.5 -44.1 338.5 -39.9Q334.4 -35.6 334.4 -27.7Q334.4 -19.8 338.4 -15.6Q342.3 -11.3 348.3 -11.3Q352.1 -11.3 355.5 -13.2Q358.8 -15.0 360.8 -18.7Q362.8 -22.4 362.8 -27.7Z M416.7 -56.2V-41.5H413.0Q406.4 -41.5 403.1 -38.4Q399.7 -35.3 399.7 -27.6V0.0H385.7V-55.4H399.7V-46.8Q402.4 -51.2 406.8 -53.7Q411.1 -56.2 416.7 -56.2Z" fill="var(--brand-paper)"/><path d="M448.1 -56.3Q458.4 -56.3 465.2 -51.2Q471.9 -46.0 474.2 -36.7H459.1Q457.9 -40.3 455.1 -42.4Q452.2 -44.4 448.0 -44.4Q442.0 -44.4 438.5 -40.1Q435.0 -35.7 435.0 -27.7Q435.0 -19.8 438.5 -15.5Q442.0 -11.1 448.0 -11.1Q456.5 -11.1 459.1 -18.7H474.2Q471.9 -9.7 465.1 -4.4Q458.3 0.9 448.1 0.9Q440.1 0.9 433.9 -2.6Q427.7 -6.2 424.2 -12.7Q420.7 -19.1 420.7 -27.7Q420.7 -36.3 424.2 -42.8Q427.7 -49.2 433.9 -52.8Q440.1 -56.3 448.1 -56.3Z" fill="var(--brand-leaf)"/><path d="M449 -71 L457 -63.5 L472 -79" fill="none" stroke="var(--brand-leaf)" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SOC={
 LinkedIn:['https://www.linkedin.com/company/afterworc/','<path d="M8 11v5"/><path d="M8 8v.01"/><path d="M12 16v-5"/><path d="M16 16v-3a2 2 0 1 0 -4 0"/><path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4l0 -10"/>'],
 Telegram:['https://t.me/afterworc_com','<path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4"/>'],
 Facebook:['https://www.facebook.com/afterworc/','<path d="M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"/>'],
 X:['https://x.com/afterworc','<path d="M4 4l11.733 16h4.267l-11.733 -16l-4.267 0"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>'],
 Bluesky:['https://bsky.app/profile/afterworc.com','<path d="M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .35 4.953 .556 5.661c.713 2.463 3.13 2.75 5.444 2.369c-4.045 .665 -4.889 3.208 -2.667 5.41c1.03 1.018 1.913 1.59 2.667 1.59c2 0 3.134 -2.769 3.5 -3.5c.333 -.667 .5 -1.167 .5 -1.5c0 .333 .167 .833 .5 1.5c.366 .731 1.5 3.5 3.5 3.5c.754 0 1.637 -.571 2.667 -1.59c2.222 -2.203 1.378 -4.746 -2.667 -5.41c2.314 .38 4.73 .094 5.444 -2.369c.206 -.708 .556 -5.072 .556 -5.661c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.76 5.048 -5.665 6.856c-.905 -1.808 -3.372 -5.194 -5.665 -6.856"/>']
};
const socIc=(k,sz=20)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOC[k][1]}</svg>`;
const VISA_SVG='<svg viewBox="0 0 278.075 169.374" role="img" aria-label="Visa" class="cm"><path fill="#fff" d="M120.0082,60.004,99.31715,109.37H85.81859L75.63615,69.9725c-.61849-2.42553-1.15437-3.31584-3.03392-4.3358a53.40292,53.40292,0,0,0-12.5983-4.20109l.3008-1.43161H82.03616A5.95012,5.95012,0,0,1,87.925,65.0365L93.303,93.60381,106.5943,60.004Zm52.894,33.24721c.05714-13.02735-18.01552-13.7469-17.89114-19.56785.04-1.76986,1.7256-3.652,5.41686-4.1343a24.10781,24.10781,0,0,1,12.59,2.20793l2.24436-10.46684a34.3103,34.3103,0,0,0-11.94843-2.189c-12.62149,0-21.507,6.7109-21.57814,16.3178-.08429,7.11,6.34074,11.072,11.18169,13.43608,4.97316,2.419,6.64161,3.971,6.623,6.13426-.03717,3.314-3.96849,4.77451-7.64409,4.832a26.71253,26.71253,0,0,1-13.116-3.1193l-2.31219,10.81805c2.981,1.369,8.48933,2.56336,14.20134,2.6219,13.41676,0,22.19122-6.62478,22.23264-16.89078M206.23577,109.37H218.047l-10.31-49.366H196.83682a5.812,5.812,0,0,0-5.43617,3.62058L172.23837,109.37H185.6451l2.66449-7.37505h16.38285ZM191.98519,91.87858l6.723-18.53567,3.86993,18.53567ZM138.25625,60.004,127.69619,109.37H114.924l10.5643-49.366Z"/></svg>';
const MC_SVG='<svg viewBox="0 0 152.4 108" role="img" aria-label="Mastercard" class="cm"><rect x="60.4" y="25.7" width="31.5" height="56.6" fill="#FF5F00"/><path fill="#EB001B" d="M62.4,54c0-11,5.1-21.5,13.7-28.3c-15.6-12.3-38.3-9.6-50.6,6.1C13.3,47.4,16,70,31.7,82.3c13.1,10.3,31.4,10.3,44.5,0C67.5,75.5,62.4,65,62.4,54z"/><path fill="#F79E1B" d="M134.4,54c0,19.9-16.1,36-36,36c-8.1,0-15.9-2.7-22.2-7.7c15.6-12.3,18.3-34.9,6-50.6c-1.8-2.2-3.8-4.3-6-6c15.6-12.3,38.3-9.6,50.5,6.1C131.7,38.1,134.4,45.9,134.4,54z"/></svg>';
function footer(){
  const col=(t,items)=>`<div><h4>${t}</h4>${items.map(([h,l,x])=>`<a href="${h}"${x?' target="_blank" rel="noopener"':''}>${l}</a>`).join('')}</div>`;
  return `<footer class="ftr"><div class="wrap">
    <div class="cols">
      <div class="fbrand"><a href="#home" class="flogo">${LOGO_SVG}</a>
        <p>Build your workforce. We run the rest.</p>
        <div class="socials">${Object.keys(SOC).map(k=>`<a href="${SOC[k][0]}" target="_blank" rel="noopener" aria-label="${k}">${socIc(k)}</a>`).join('')}</div></div>
      ${col('Sections',[['#categories','Categories and professions'],['#search','Search'],['#how','How it works'],['#card','AfterWorc card'],['#about','About us']])}
      ${col('Legal',[['#terms','Terms and Conditions'],['#privacy','Privacy and Confidentiality Policy'],['#cookies','Cookie Notice'],['#cookiesettings','Cookie settings']])}
      <div><h4>AfterWorc OÜ</h4><dl class="fco">
        <dt>Registered address</dt><dd>Mäealuse tn 10/2, Mustamäe linnaosa, 12618 Tallinn, Estonia</dd>
        <dt>Registry code</dt><dd>17554808</dd>
        <dt>Founded</dt><dd>July 17, 2026</dd>
        <dt>Contact:</dt><dd>info@afterworc.com</dd></dl>
        <a href="https://www.inforegister.ee/en/17554808-AFTERWORC-OU/" target="_blank" rel="noopener">The company’s entry in the Estonian business register</a></div>
      <div><h4>Cards accepted</h4><div class="cards">${VISA_SVG}${MC_SVG}</div></div>
    </div>
  </div></footer>`;
}

/* ================= shared blocks ================= */
let PEOPLE=[]; // loaded from /api/specialists
/* Directory text is user-editable: escape every string once so templates can interpolate it directly. */
const cleanPerson=o=>{const c=v=>typeof v==='string'?esc(v):Array.isArray(v)?v.map(c):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,c(x)])):v;return c(o)};
const rateTxt=p=>p.rate?`€${p.rate} / h`:p.monthly?`€${Number(p.monthly).toLocaleString('en-GB')} / mo`:'Rate on request';
const lvPill=p=>p.lv==='checked'?seal('Worc-Checked'):`<span class="seal" style="color:var(--blue)">${ic('shield',14)}Verified</span>`;
const initials=n=>n.split(' ').map(w=>w[0]).join('').slice(0,2);
/* Profile photo when the specialist uploaded one, initials otherwise. */
const avatarOf=(p,cls='')=>p.avatar?`<span class="avatar ${cls}" style="overflow:hidden"><img src="${p.avatar}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover"></span>`:`<span class="avatar ${cls} ${p.lv==='checked'?'':'alt'}">${initials(p.n)}</span>`;
function personCard(p){
  return `<a class="card stack" href="#specialist-${p.id}" style="text-decoration:none;gap:10px">
    <div class="row">${avatarOf(p)}<div class="grow"><b style="font-weight:600;display:block">${p.n}</b><span class="muted small">${p.r}</span></div><b class="small" style="white-space:nowrap">${rateTxt(p)}</b></div>
    <div class="row between wrapf">${lvPill(p)}<span class="pill ${p.now?'ok':''}">${p.avail}</span></div>
    <div class="chips">${p.skills.map(k=>`<span class="chip" style="padding:3px 10px">${k}</span>`).join('')}</div>
    <div class="row between tiny muted"><span>${p.deals} deals · ★ ${p.stars}</span><span>${p.city}</span></div>
  </a>`;
}
const sec=(inner,cls='')=>`<section class="sec ${cls}"><div class="wrap">${inner}</div></section>`;
const shead=(eb,h,p='',right='')=>`<div class="shead"><div class="l"><span class="mono">${eb}</span><h2>${h}</h2>${p?`<p>${p}</p>`:''}</div>${right}</div>`;
const faq=items=>`<div class="faq">${items.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
const checks=items=>`<div class="checks">${items.map(([b,s])=>`<div class="row">${ck()}<div><b>${b}</b><span class="s">${s}</span></div></div>`).join('')}</div>`;
function cardFeature(kind){
  const hire=kind!=='work';
  const title={home:'Get paid and pay from one account.',hire:'Pay tools and travel from the balance that funds your deals.',work:'Your earnings, on your card the moment they’re released.'}[kind];
  const pts={home:[['Businesses','A company card on your AfterWorc balance.'],['Specialists','Released earnings are spendable at once.'],['Both','Virtual in a minute. Freeze in one tap.']],
    hire:[['Receipts in one place','Every payment shows in Money with a receipt slot.'],['Deal money is safe','The card never touches money held in deals.']],
    work:[['No waiting','Skip the 1–2 day bank transfer.'],['Or withdraw','To your bank any time, as before.']]}[kind];
  return `<div class="next cardnext" style="padding:34px 36px">
    <div style="display:grid;gap:14px;align-content:center;position:relative;z-index:1">
      <span class="mono">New · AfterWorc Mastercard® debit</span>
      <h2>${title}</h2>
      <div class="checks" style="margin-top:4px">${pts.map(([b,s])=>`<div class="row"><span class="ck" style="background:#ffffff14;color:#85d6ae">${ic('check',13,2.6)}</span><div><b style="color:#fff">${b}</b><span class="s" style="color:#b5c7bd">${s}</span></div></div>`).join('')}</div>
      <div class="btns" style="margin-top:6px"><a class="btn" href="#card">About the card</a>${kind==='home'?'<a class="btn ghost" href="#card-get">How to get it</a>':''}</div>
    </div>
    <div class="fan" aria-hidden="true">
      <div class="c c2">${card({variant:hire?'company':'personal',name:'Kristjan Saar',org:hire?'Põhjatäht OÜ':'',last4:hire?'7730':'4821'})}</div>
      <div class="c c1">${card({variant:hire?'personal':'virtual',name:'Kristjan Saar',last4:hire?'4821':'0915'})}</div>
    </div>
  </div>`;
}

/* ================= HOME ================= */
function vHome(){
  const d=DEPTS.find(x=>x.k===S.dept);
  return `
  <section class="hero"><div class="wrap in solo">
    <div class="copy">
      <span class="mono">Workforce for SaaS, EMI, PSP and fintech</span>
      <h1>Build your workforce. <em>We run the rest.</em></h1>
      <p class="sub">You know the business you want to build. The hard part is the people behind it: finding them, checking them, hiring them in another country, and paying them on time.</p>
      <div class="hbox">
        <div class="htabs" role="tablist" aria-label="I want to">${[['hire','I want to hire'],['work','I want to work']].map(([k,l])=>`<button role="tab" aria-selected="${S.htab===k}" class="${S.htab===k?'on':''}" data-act="htab" data-arg="${k}">${l}</button>`).join('')}</div>
        ${S.htab==='hire'?`<form class="hsearch" data-form="hsearch" role="search" aria-label="Find specialists"><span class="ic">${ic('search',19)}</span><input id="hq" name="hq" type="search" placeholder="Skill, role or name" autocomplete="off" enterkeyhint="search"><button class="btn g" type="submit" aria-label="Search">${ic('search',17)}<span class="bl" data-notr>${{en:'Search',et:'Otsi',ru:'Найти'}[S.lang]}</span></button></form>
        <div class="hpop"><a class="chip team" href="#hiring">A whole team ${ic('arrow',13)}</a>${[['Payments operations','payments'],['AML / KYC analyst','aml'],['Backend developer','backend'],['DevOps engineer','devops']].map(([l,q])=>`<button class="chip" data-act="hq" data-arg="${q}">${l}</button>`).join('')}</div>`
        :`<form class="hsearch" data-form="hwork" aria-label="Join as a specialist"><span class="ic">${ic('user',19)}</span><input name="hw" placeholder="Your profession, e.g. DevOps" autocomplete="off"><button class="btn g" type="submit">${ic('arrow',17)}<span class="bl" data-notr>${{en:'Join',et:'Liitu',ru:'Вступить'}[S.lang]}</span></button></form>
        <div class="hpop hnote"><span class="muted">Free to join. Clients see what was checked.</span><a class="chip team" href="#building">How it works ${ic('arrow',13)}</a></div>`}
      </div>
      ${note('Same headline and doors as the live home. Built with the account’s components, so the site and the account feel like one product.')}
    </div>
  </div></section>

  ${sec(`${shead('What we run for you','The hard part is the people. We take it off your desk.','You decide what to build and who leads it. We do the four jobs that slow every growing company down.')}
    <div class="grid g4 g4m2">${[['search','Finding them','A person reads your brief and sends up to 3 matches within 48 hours. No job boards, no pile of CVs.'],['shield','Checking them','Identity, a skills test, two references and a live interview, before you ever meet them.'],['globe','Hiring them abroad','We are the employer of record in their country: contract, payroll, taxes and benefits.'],['money','Paying them on time','Milestones held until you accept, salaries paid every month, one invoice for all of it.']].map(([i,t,s])=>`<div class="card"><span class="icbox">${ic(i,18)}</span><h3 style="margin-top:12px">${t}</h3><p class="muted small">${s}</p></div>`).join('')}</div>`,'alt')}

  ${sec(`${shead('Our services','Choose the capacity you need.')}
    <div class="opts" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      ${[['task','A task','One specialist, one job, fixed price.','task'],['user','A specialist','Senior capacity added to your team.','person'],['team','A ready team','Pre-assembled, with a lead, ready to execute.','team'],['dept','A department','A whole function around your roadmap.','dept'],['globe','Hire abroad (EOR)','We employ them in their country. You direct the work.','eor']].map(([i,t,s,k],n)=>`<a class="opt ${n===3?'on':''}" href="#hiring-assess" data-type="${k}"><span class="ic">${ic(i,17)}</span><b>${t}</b><span>${s}</span></a>`).join('')}
    </div>`)}

  ${sec(`${shead('Who we build for','Teams for companies that move money.','SaaS, EMI, PSP and fintech teams need people who understand regulated products. That is where we specialise.')}
    <div class="grid g4 g4m2">${[['code','SaaS','Product engineering, DevOps and QA for B2B platforms, as one accountable team.'],['bank','EMI','Payment operations, safeguarding, AML and KYC analysts for e-money institutions.'],['card','PSP','Integration engineers, acquiring specialists and chargeback teams for payment providers.'],['spark','Fintech','Engineers and compliance people who have shipped regulated products before.']].map(([i,t,s])=>`<div class="card"><span class="icbox">${ic(i,18)}</span><h3 style="margin-top:12px">${t}</h3><p class="muted small">${s}</p></div>`).join('')}</div>`,'alt')}

  ${sec(`${shead('Checked specialists','Available this week.','A few of the people clients can hire today. Every profile states what was checked.',`<a class="btn ghost" href="#search">Find specialists ${ic('arrow',15)}</a>`)}
    <div class="grid g4 hs">${PEOPLE.filter(p=>p.lv==='checked').slice(0,4).map(personCard).join('')}</div>`)}

  ${sec(`${shead('Departments','We staff it, lead it and deliver the work.','Every department comes with a team lead and checked specialists, accountable as one team.')}
    <div class="split side">
      <div class="list" role="tablist" aria-label="Departments">${DEPTS.map(x=>`<button class="li ${S.dept===x.k?'on':''}" role="tab" aria-selected="${S.dept===x.k}" data-act="dept" data-arg="${x.k}"><span class="icbox">${ic(x.ic,17)}</span><span class="grow"><div class="t">${x.n}</div><div class="s">${x.size}</div></span><span class="r">${ic('chev',16)}</span></button>`).join('')}</div>
      <div class="card pad-l" id="deptpanel">
        <div class="row between wrapf"><div class="row"><span class="icbox">${ic(d.ic,18)}</span><div><h3>${d.n} department</h3><span class="muted small">${d.size}</span></div></div></div>
        <div class="grid g2" style="margin-top:20px;gap:24px">
          <div><span class="mono" style="color:var(--muted)">Who you get</span><div class="list" style="margin-top:10px">${d.roles.map((r,i)=>`<div class="li" style="padding:10px 14px"><span class="avatar sm ${i?'alt':''}">${r.split(/\s+/).filter(w=>/^\p{L}/u.test(w)).map(w=>w[0].toUpperCase()).join('').slice(0,2)}</span><span class="t" style="font-weight:${i?500:600}">${r}</span>${i?'':'<span class="r"><span class="pill ok">Lead</span></span>'}</div>`).join('')}</div></div>
          <div><span class="mono" style="color:var(--muted)">Takes off your desk</span><div class="checks" style="margin-top:12px">${d.tasks.map(t=>`<div class="row">${ck()}<span>${t}</span></div>`).join('')}</div></div>
        </div>
        <div class="costbar"><div><span class="mono" style="color:var(--brand2);font-size:11px">Team cost estimate</span><b>What would this team cost you?</b><span>Tell us your scope and we’ll come back with a price.</span></div><a class="btn g lg" href="#hiring-assess" data-type="dept">Estimate team cost ${ic('arrow',16)}</a></div>
      </div>
    </div>
    ${note('Live stacks four long department cards. Here it’s the account’s list-and-detail pattern: pick a department on the left, see the team on the right.')}`)}

  ${sec(`<div class="split at">
      <div class="stack" style="gap:16px"><span class="mono">Employer of Record (EOR)</span><h2>Hire in another country without opening a company there.</h2>
        <p class="muted" style="font-size:16px">Found the right person in Lisbon, Warsaw or Kyiv? We become their legal employer in their country, so you can hire them in weeks, not months, and stay compliant.</p>
        ${checks([['A local employment contract','Written under the law of their country, in their language.'],['Payroll, taxes and social security','Calculated, withheld and paid every month.'],['Benefits and onboarding','Holidays, sick leave and equipment handled for you.'],['Paid on time, every month','Salaries go out on the agreed day. You get one invoice.']])}
        <a class="btn g" href="#hiring-assess" data-type="eor" style="justify-self:start">Ask about hiring abroad ${ic('arrow',15)}</a></div>
      <div class="card pad-l lift stack" style="gap:14px"><span class="mono" style="color:var(--muted)">Example · EOR</span><h3>Payments operations specialist, Portugal</h3>
        <div class="feeline"><span>Gross salary</span><span>€3,800 / mo</span><span>Employer costs</span><span>paid through us</span><span>AfterWorc EOR fee</span><span>fixed, quoted up front</span><span class="tot">You receive</span><span class="tot">one monthly invoice</span></div>
        <div class="track">${['Offer','Contract','Onboarding','First salary'].map((t,i)=>`<div class="tp ${i<2?'done':i===2?'cur':''}">${t}</div>`).join('')}</div>
        <p class="muted small">You direct the work. We handle the employment, and the person is paid on time.</p></div>
    </div>`,'alt')}

  ${sec(cardFeature('home')+note('New feature. It serves both sides, so it sits right after Departments, before the Checked standard.'))}

  ${sec(`${shead('The AfterWorc standard','“Checked” is a standard, not a claim.','Every professional passes four checks by people before you meet them.')}
    <div class="grid g4 g4m2">${[['user','Identity','Document and background check'],['star','Skills','Practical test in their field'],['phone','References','Past clients, actually called'],['chat','Interview','Live, with a person']].map(([i,t,s])=>`<div class="card"><span class="icbox">${ic('check',17,2.4)}</span><h3 style="margin-top:12px">${t}</h3><p class="muted small">${s}</p></div>`).join('')}</div>
    ${note('Cleaner home: no example figures, no repeated promises. Each section answers one question a client has before hiring.')}`,'alt')}

  ${sec(`<div class="next"><div style="position:relative;z-index:1"><span class="mono">Build your workforce. We run the rest.</span><h3 style="font-size:22px;margin-top:6px">Start hiring or start working today.</h3><p style="margin-top:4px">Not sure what you need? Ask for a free technical assessment instead.</p></div><div class="btns" style="position:relative;z-index:1"><a class="btn" href="#register">Sign up free</a><a class="btn ghost" href="#hiring-assess">Free assessment</a></div></div>`)}`;
}

/* ================= HIRING ================= */
function hireForm(){
  const f=S.form.hire;
  if(f.leadId&&!f.done)return `<form class="card pad-l lift" data-form="hirecode" novalidate>
    <div class="wizbar" style="margin-bottom:20px"><div><i class="on"></i><span>1. What you need</span></div><div class="cur"><i class="on"></i><span>2. How to reach you</span></div></div>
    <label class="field"><span>Enter the 6-digit code we sent to <b data-notr>${esc(f.email)}</b></span><input id="h-code" class="inp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" data-bind="hire.code" value="${esc(f.code||'')}" placeholder="000000" style="font-size:22px;letter-spacing:.3em;max-width:220px"></label>
    ${f.devCode?`<p class="tiny muted" data-notr>Dev mode (no e-mail server): code ${esc(f.devCode)}</p>`:''}
    <div class="row between" style="margin-top:18px"><button type="button" class="btn ghost" data-act="hcodeback">Back</button><button class="btn g" type="submit" ${S.busy?'disabled':''}>Confirm and send ${ic('arrow',15)}</button></div></form>`;
  if(f.done)return `<div class="card pad-l"><div class="fdone">${ck()}<h3>Request received</h3><p class="muted small">A person reads it and replies in writing within 48 hours.<br><b data-notr>${esc(f.email||'')}</b></p><button class="btn ghost sm" data-act="hreset">Send another</button></div></div>`;
  const types=[['task','task','A task','One job'],['person','user','A specialist','Joins your team'],['team','team','A ready team','Lead + people'],['dept','dept','A department','Whole function'],['eor','globe','Hire abroad','Employer of Record']];
  const labels=['What you need','How to reach you'];
  return `<form class="card pad-l lift" data-form="hire" novalidate>
    <div class="wizbar" style="margin-bottom:20px">${labels.map((l,i)=>`<div class="${i===f.step?'cur':''}"><i class="${i<=f.step?'on':''}"></i><span>${i+1}. ${l}</span></div>`).join('')}</div>
    ${f.step===0?`<div class="field"><span>What do you need?</span><div class="opts" style="grid-template-columns:1fr 1fr">${types.map(([k,i,t,d])=>`<button type="button" class="opt ${f.type===k?'on':''}" data-act="htype" data-arg="${k}" style="padding:12px"><span class="ic">${ic(i,15)}</span><b style="font-size:14px;margin:4px 0 0">${t}</b><span>${d}</span></button>`).join('')}</div></div>
      <label class="field"><span>Describe it in your own words</span><textarea id="h-need" class="inp" data-bind="hire.need" placeholder="e.g. A client portal where our logistics customers track orders">${esc(f.need)}</textarea><small>No specification needed. We work out the scope with you.</small></label>`
    :`<label class="field"><span>Work e-mail</span><input id="h-email" class="inp" type="email" data-bind="hire.email" value="${esc(f.email)}" placeholder="you@company.com" autocomplete="email"><small>We send a 6-digit code to confirm it.</small></label>
      <div class="field"><span>Also reach me on</span><div class="chips">${['Email only','Telegram','WhatsApp','Phone'].map(c=>`<button type="button" class="chip ${f.chan===c?'on':''}" data-act="hchan" data-arg="${c}">${c}</button>`).join('')}</div></div>
      <div class="feeline"><span>Your need</span><span>${esc((f.need||'').slice(0,34))}${(f.need||'').length>34?'…':''}</span><span>Type</span><span>${types.find(t=>t[0]===f.type)[2]}</span><span class="tot">Cost</span><span class="tot">Free, no obligation</span></div>`}
    <div class="row between" style="margin-top:18px">${f.step?'<button type="button" class="btn ghost" data-act="hback">Back</button>':'<span class="tiny muted">Your data stays in the EU.</span>'}<button class="btn g" type="submit">${f.step?'Send request':'Continue'} ${ic('arrow',15)}</button></div>
  </form>`;
}
function vHiring(){
  return `
  <section class="hero"><div class="wrap in">
    <div class="copy">
      <span class="mono">For clients · I’m hiring</span>
      <h1>You’re short of certainty, not candidates.</h1>
      <p class="sub">You know the business you want to build. We find the people, check them, hire them in their own country if needed, and pay them on time. Scope, deadline and amount are fixed before work starts, and money is held until you accept the result.</p>
      <div class="btns"><a class="btn g lg" href="#register-hire">Post a brief</a><a class="btn ghost lg" href="#search">Find specialists</a></div>
      <div class="trust"><span>${ic('lock',15)}Funds held until acceptance</span><span>${ic('shield',15)}Levels assigned by people</span><span>${ic('globe',15)}Data stays in the EU</span></div>
    </div>
    <div class="card lift pad-l" aria-label="Example deal in the account">
      <div class="row between wrapf"><div><span class="mono" style="color:var(--muted)">Deal · example</span><h3 style="margin-top:4px">Landing redesign v1</h3></div><span class="pill wait">Review · 5 days left</span></div>
      <div class="track" style="margin-top:16px">${['Agreed','Funded','Delivered','Accepted','Paid'].map((t,i)=>`<div class="tp ${i<2?'done':i===2?'cur':''}">${t}</div>`).join('')}</div>
      <div style="margin-top:14px">${[['1','Wireframes','€400','done','Released'],['2','Visual design','€500','act','Delivered · review'],['3','Build + handover','€700','','Not funded']].map(([n,t,a,c,s])=>`<div class="ms ${c}"><span class="n">${c==='done'?ic('check',12,3):n}</span><div><b style="font-weight:600;font-size:14px">${t}</b><div class="muted tiny">${s}</div></div><b class="small">${a}</b></div>`).join('')}</div>
      <div class="feeline" style="margin-top:12px"><span>Held for you now</span><span>€500</span><span>AfterWorc fee</span><span>included</span><span class="tot">Released</span><span class="tot">only when you accept</span></div>
    </div>
  </div>
  <div class="wrap">${note('Live /hiring is 10,234px tall at 657px wide. The hero now shows the product (a real deal with money held) instead of a long paragraph and a “specimen” card.')}</div></section>

  ${sec(`${shead('Why hiring online goes wrong','Three things break before any work starts.','Each one has a specific answer in the product.')}
    <div class="grid g3">${[['Scope','You’re asked to specify the thing you came to find out.','We work out what the job actually is with you, before anyone quotes.'],['Trust','You can’t verify the price or the deadline you were given.','Both are fixed in the agreement. Money is held until you accept.'],['Scale','One hire quietly turns into five.','We assemble the team and hand it over under one lead.']].map(([t,p,a],i)=>`<div class="card stack" style="gap:12px"><span class="mono" style="color:var(--muted)">0${i+1} · ${t}</span><h3>${p}</h3><div class="banner" style="margin-top:auto">${ic('check',15,2.4)}<span>${a}</span></div></div>`).join('')}</div>`,'alt')}

  ${sec(`${shead('The alternatives','Marketplace, agency, or AfterWorc.','The same questions, answered for all three.')}
    <div class="card" style="padding:0"><div class="tscroll"><table class="tbl" style="min-width:640px"><thead><tr><th></th><th>Freelance marketplace</th><th>Agency</th><th style="color:var(--brand)">AfterWorc</th></tr></thead><tbody>
      ${[['Who you get','Anyone who signed up','Whoever is free on the bench','People who passed our checks'],['How they’re checked','Self-declared, plus star ratings','Internally; you don’t see it','Stated on the profile: identity, references, interview'],['What you compare','Hundreds of near-identical proposals','One proposal, no visibility','A short list with the checks stated'],['Who is accountable','The individual you picked','An account manager','A named lead under one agreement'],['When you pay','Milestones you enforce yourself','On invoice','On acceptance; held until then'],['Price','Bid-driven','One number, parts hidden','A formula, every part stated']].map(([l,a,b,c])=>`<tr><td>${l}</td><td>${a}</td><td>${b}</td><td class="us">${c}</td></tr>`).join('')}
    </tbody></table></div></div>`)}

  ${sec(`<div class="split at">
      <div class="stack" style="gap:16px"><span class="mono">What the badge means</span><h2>Three levels. The top one isn’t automatic.</h2><p class="muted" style="font-size:16px">A profile always states which level it holds. Nothing is implied.</p>
        <div class="card" style="padding:8px 20px"><div class="ladder">
          <div class="lad done"><span class="b">1</span><div><b>Registered</b><p>E-mail confirmed. Enough to look around and talk.</p></div><span class="pill">Level 1</span></div>
          <div class="lad done"><span class="b">2</span><div><b>Verified</b><p>Identity confirmed against a document.</p></div><span class="pill">Level 2</span></div>
          <div class="lad top"><span class="b">3</span><div><b>Worc-Checked</b><p>Live interview and references, judged by a person.</p></div><span class="pill ok">Top</span></div>
        </div></div></div>
      <div class="stack" style="gap:16px"><span class="mono">The flagship</span><h2>One hire becomes five. We hand you all five.</h2><p class="muted" style="font-size:16px">A working team with a lead, a process and a shared standard, under one agreement. The composition is agreed before work starts.</p>
        <div class="list">${[['TL','Team lead','One point of accountability',1],['SD','Senior developer','Builds the core'],['JD','Junior developer','Carries the volume'],['UX','UI/UX designer','Makes it usable'],['QA','QA engineer','Proves it works']].map(([a,t,s,l])=>`<div class="li"><span class="avatar sm ${l?'':'alt'}">${a}</span><span class="grow"><div class="t">${t}</div><div class="s">${s}</div></span><span class="r">${seal('Checked')}</span></div>`).join('')}</div>
        <a class="btn ghost" href="#hiring-assess" data-type="dept" style="justify-self:start">Ask what your department would look like</a></div>
    </div>`,'alt')}

  <section class="sec" id="price"><div class="wrap">
    ${shead('Pricing','We show you the parts, not a markup.','The rate is fixed when the deal is agreed. Commission is charged at release, never before you accept.')}
    <div class="grid g3">
      <div class="card stack"><h3>Department seat or fixed term</h3><div class="formula"><span class="p">Specialist’s rate</span><span class="op">+</span><span class="p">Employment taxes</span><span class="op">+</span><span class="p">Platform margin</span></div><p class="muted small">Each part stated separately on the deal.</p></div>
      <div class="card stack"><h3>A single task</h3><div class="formula"><span class="p">Agreed task price</span><span class="op">+</span><span class="p">Platform margin</span></div><p class="muted small">Current rates are in the Terms and your account.</p></div>
      <div class="card stack"><div class="row between"><h3>Company card</h3><span class="pill new">New</span></div><div class="row"><span class="pcardart" style="width:96px;flex:0 0 auto">${card({variant:'company',name:'Kristjan Saar',org:'Põhjatäht OÜ',last4:'7730'})}</span><p class="muted small">Pay tools, ads and travel from the balance that funds your deals.</p></div><a class="btn link" href="#card">About the AfterWorc card</a></div>
    </div>
  </div></section>

  <section class="sec alt" id="assess"><div class="wrap split at">
    <div class="stack" style="gap:16px"><span class="mono">Free · reply within 48 hours</span><h2>Tell us what you’re trying to build. We’ll tell you what it takes.</h2>
      <p class="muted" style="font-size:16px">Describe the problem in your own words. You get back a written assessment: what the work involves, which roles it needs, where the risk sits, and whether it’s one person or a team.</p>
      ${checks([['Written, not a sales call','Forward it to your board or your accountant.'],['No obligation','The assessment is yours whether you hire through us or not.'],['Read by a person','Every request is read before anything is sent back.']])}
      <div class="row" style="margin-top:6px"><span class="avatar alt">${ic('user',16)}</span><div><b style="font-weight:600">Read by a person on our matching team</b><div class="muted tiny">No account needed for the assessment.</div></div></div>
    </div>
    ${hireForm()}
  </div><div class="wrap">${note('Live form: 3 steps and 9 fields, with a 70-country list and a 21-language list before the need is even asked. Now 2 steps with the account’s wizard: the need first, then contact.')}</div></section>

  ${sec(`<div class="split at"><div class="stack" style="gap:14px"><span class="mono">Before you sign in</span><h2>Questions clients ask first</h2><p class="muted">Anything else: info@afterworc.com. A person replies within one business day.</p></div>
    ${faq([['How do I start?','Create a free account with your e-mail and post a brief. Browsing profiles and the technical assessment need no account.'],['What if the work isn’t accepted?','The money stays held. A mediator reviews both sides, usually within 2 business days.'],['Can I hire one person instead of a team?','Yes: a task, one specialist, a ready team or a department.'],['When is the commission charged?','At release, when you accept the work. Never before.'],['Can my company pay by card?','Yes. Top up by card or phone wallet, and issue an AfterWorc company card to spend the balance.'],['Where is my data?','Stored and processed in the EU.']])}</div>
    <div class="next" style="margin-top:40px"><div style="position:relative;z-index:1"><span class="mono">Not a thousand replies</span><h3 style="font-size:22px;margin-top:6px">A short list you can act on.</h3></div><div class="btns" style="position:relative;z-index:1"><a class="btn" href="#register-hire">Post a brief</a><a class="btn ghost" href="#building">I’m building, not hiring</a></div></div>`)}`;
}

/* ================= BUILDING ================= */
function vBuilding(){
  return `
  <section class="hero"><div class="wrap in">
    <div class="copy">
      <span class="mono">For specialists · I’m building</span>
      <h1>The fastest replier wins. That’s why you left.</h1>
      <p class="sub">On AfterWorc a client sees what’s been checked about you before they message you. No bidding wars, no paid proposals, no queue of two hundred replies.</p>
      <div class="btns"><a class="btn g lg" href="#register-work">Create your profile</a><a class="btn ghost lg" href="#building-levels">How verification works</a></div>
      <div class="trust"><span>${ic('lock',15)}Client’s money placed first</span><span>${ic('brief',15)}Scope fixed before you start</span><span>${ic('chat',15)}Interviewed by a person</span></div>
    </div>
    <div class="stack" style="gap:14px">
      <div class="cand top"><span class="best">WHAT A CLIENT SEES ABOUT YOU</span>
        <div class="row"><span class="avatar lg">KS</span><div><h3>Your profile</h3><span class="muted small">Senior Go developer, fintech & B2B</span><div style="margin-top:4px">${seal('Worc-Checked')}</div></div></div>
        <div class="kv"><span>Identity</span><span>Confirmed against your document</span><span>References</span><span>Your clients, actually called</span><span>Interview</span><span>Live, with our team</span><span>Level</span><span>Assigned by a person</span></div>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="bal dk"><span class="l">Held for your work</span><b>€2,400</b><p>Placed by the client before you start.</p></div>
        <div class="bal"><span class="l">Payout</span><b>≤ 2 days</b><p>or at once on your AfterWorc card.</p></div>
      </div>
    </div>
  </div>
  <div class="wrap">${note('Was “Apply to the founding cohort”. Registration is open, so the main button now creates an account; the check still decides your level.')}</div></section>

  ${sec(`${shead('What’s different here','Four things you stop doing.','Not perks. Structural differences in how work reaches you and how you get paid.')}
    <div class="grid g4">${[['chat','Racing on reply speed','Clients see a short list with the checks stated. Being good is the advantage again.'],['brief','Scoping for free','Briefs arrive worked through. Scope, deadline and amount are fixed in the agreement.'],['money','Chasing invoices','Money is held before you start and released on acceptance.'],['team','Being only a solo hire','Join formed teams or a seat in a department a client hires whole.']].map(([i,t,s])=>`<div class="card"><span class="icbox">${ic(i,18)}</span><h3 style="margin-top:14px">${t}</h3><p class="muted small">${s}</p></div>`).join('')}</div>
    <div class="card pad-l" style="margin-top:16px;display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center"><span class="avatar lg">VB</span><div><p class="quote">“I interviewed every member of the founding group myself. Every specialist who joins now goes through the same check.”</p><div class="muted small" style="margin-top:8px">Victor Birjukov · Founder, AfterWorc OÜ · Tallinn</div></div></div>`,'alt')}

  <section class="sec" id="levels"><div class="wrap split at">
    <div class="stack" style="gap:16px"><span class="mono">After you sign up</span><h2>From account to Worc-Checked.</h2><p class="muted" style="font-size:16px">Anyone can register. The level on your profile is earned: each step names the check behind it. Interviews run by video, or at the Tallinn office if you’re nearby.</p>
      <div class="card" style="padding:8px 20px"><div class="ladder">
        <div class="lad done"><span class="b">1</span><div><b>Registered</b><p>Account created, e-mail confirmed.</p></div><span class="pill">2 minutes</span></div>
        <div class="lad done"><span class="b">2</span><div><b>Verified</b><p>Identity checked against a document.</p></div><span class="pill">1 upload</span></div>
        <div class="lad top"><span class="b">3</span><div><b>Worc-Checked</b><p>Live interview and references.</p></div><span class="pill ok">Interview + 2 calls</span></div>
        <div class="lad"><span class="b">${ic('spark',14)}</span><div><b>Matched to briefs</b><p>A person puts you on shortlists that fit.</p></div><span class="pill">Ongoing</span></div>
      </div></div></div>
    <div class="stack" style="gap:16px"><span class="mono">What it costs</span><h2>Free to join. We earn when you do.</h2><p class="muted" style="font-size:16px">No subscription and no fee to send a proposal. Commission is charged at release, when the client accepts your work.</p>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="stat"><span class="l">Account and profile</span><b>€0</b><div class="h">free, always</div></div>
        <div class="stat"><span class="l">Verification</span><b>€0</b><div class="h">ID, references, interview</div></div>
        <div class="stat"><span class="l">Proposals</span><b>€0</b><div class="h">no credits, no bidding</div></div>
        <div class="stat"><span class="l">Commission</span><b>At release</b><div class="h">rate in the Terms and your account</div></div>
      </div>
      <div class="banner">${ic('check',15,2.4)}<span>The founding cohort is complete. Founding members keep the terms they joined on.</span></div></div>
  </div><div class="wrap">${note('The founding-cohort offer (0% on 3 deals, ≤3% until 2027, €20 credit for the first 100) is closed, so it moves out of the pitch. New sign-ups see the standing terms.')}</div></section>

  <section class="sec alt" id="paid"><div class="wrap">
    ${shead('Getting paid','The money is placed before you start.','If the work isn’t accepted, the money stays held. A disagreement pauses the payment; it doesn’t cancel it.')}
    <div class="grid g3">${[['Before','Agreed and held','Scope, deadline and amount fixed. The client’s money is held for the whole job.','done'],['During','Nothing is charged','No fee while the work runs. If the brief changes, the agreement changes with it.','done'],['After','Released on acceptance','Commission is charged at that moment. On your AfterWorc card at once, or to your bank in 1–2 days.','cur']].map(([k,t,s,c])=>`<div class="card"><div class="row between"><span class="mono" style="color:var(--muted)">${k}</span><span class="pill ${c==='cur'?'ok':''}">${c==='cur'?'You’re paid':'Protected'}</span></div><h3 style="margin-top:10px">${t}</h3><p class="muted small">${s}</p></div>`).join('')}</div>
    <div style="margin-top:20px">${cardFeature('work')}</div>
  </div></section>

  <section class="sec" id="apply"><div class="wrap split at">
    <div class="stack" style="gap:16px"><span class="mono">Questions specialists ask</span><h2>Before you sign up</h2>
      ${faq([['Does it cost anything to join?','No. The account, verification and your profile are free. Commission is charged only at release.'],['How long does verification take?','The ID check is one upload. The interview and reference calls are booked from your account.'],['Do I have to be in Estonia?','No. Interviews run by video; Tallinn is optional.'],['Can I keep working elsewhere?','Yes. Your other clients stay yours.'],['What’s a department seat?','A place in a team a client hires whole, with a lead and a shared standard.'],['Do I need the AfterWorc card?','No, it’s optional. Without it, released money goes to your bank in 1–2 business days.']])}
    </div>
    <div class="next" style="display:grid;gap:14px;align-content:start"><span class="mono">Free account · 2 minutes</span><h2 style="position:relative;z-index:1">Create your profile.</h2><p style="position:relative;z-index:1">E-mail and password to start. Add your skills, rate and availability, then book your interview from the account.</p>
      <div class="checks" style="position:relative;z-index:1">${[['Create an account','E-mail and password'],['Build your profile','Skills, rate, availability, work samples'],['Get checked','ID, references, a live interview']].map(([b,t])=>`<div class="row"><span class="ck" style="background:#ffffff14;color:#85d6ae">${ic('check',13,2.6)}</span><div><b style="color:#fff">${b}</b><span class="s" style="color:#b5c7bd">${t}</span></div></div>`).join('')}</div>
      <div class="btns" style="position:relative;z-index:1"><a class="btn lg" href="#register-work">Sign up as a specialist</a><a class="btn ghost" href="#login">I have an account</a></div></div>
  </div></section>`;
}

/* ================= HOW IT WORKS ================= */
function vHow(){
  return `
  <section class="hero"><div class="wrap"><div class="copy" style="display:grid;gap:16px;max-width:760px"><span class="mono">How it works</span><h1>From a brief to accepted, paid work.</h1><p class="sub">Four steps. The same ones you’ll see inside your account.</p></div></div></section>
  ${sec(`<div class="grid g4">${[['01','Sign up and get checked','A free account in two minutes. Your level is stated openly: what was checked, and by whom.','user'],['02','Brief and agreement','Scope, deadline and amount are fixed before work starts.','brief'],['03','Delivery and acceptance','Money is held until the client accepts. 7 days to review.','check'],['04','Paid, and spendable','Released within 2 days, or at once on the AfterWorc card.','card']].map(([n,t,s,i],k)=>`<div class="card ${k===3?'lift':''}" style="${k===3?'border-color:var(--brand2)':''}"><div class="row between"><span class="icbox">${ic(i,18)}</span><span class="mono" style="color:var(--muted)">Step ${n}</span></div><h3 style="margin-top:14px">${t}</h3><p class="muted small">${s}</p>${k===3?'<span class="pill new" style="margin-top:10px">New</span>':''}</div>`).join('')}</div>
    ${note('Live has three steps. Step 4 adds the new card, so getting paid is part of the story.')}`,'alt')}
  <section class="sec" id="money"><div class="wrap split">
    <div class="stack" style="gap:16px"><span class="mono">Where the money sits</span><h2>Held until you accept, then free to use.</h2><p class="muted" style="font-size:16px">Three separate balances, the same ones you see in Money: available, held in deals, and released.</p></div>
    <div class="card pad-l lift">
      <div class="track">${['Top up','Held','Accepted','Released','Card or bank'].map((t,i)=>`<div class="tp ${i<3?'done':i===3?'cur':''}">${t}</div>`).join('')}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-top:18px">
        <div class="bal"><span class="l">Client · available</span><b>€500</b><p>Bank link, SEPA, card or wallet.</p></div>
        <div class="bal dk"><span class="l">Held in the deal</span><b>€1,600</b><p>Untouchable until accepted.</p></div>
      </div>
      <div class="feeline" style="margin-top:12px"><span>Released to specialist</span><span>€1,600</span><span>Commission</span><span>charged at release</span><span class="tot">Spend</span><span class="tot">card at once · bank 1–2 days</span></div>
    </div>
  </div></section>
  ${sec(`<div class="split at"><div class="stack" style="gap:14px"><span class="mono">Common questions</span><h2>How the rules work</h2></div>${faq([['How long does a review take?','Up to 7 days. We remind the client on day 5; after that the work is accepted automatically.'],['What if we disagree?','The money stays held while a person mediates, usually within 2 business days.'],['How are reviews shown?','Both sides review blind. Reviews publish when both submit, or after 14 days.']])}</div>`,'alt')}`;
}

/* ================= CARD ================= */
function vCard(){
  const biz=S.ctab==='biz',t=S.tg;
  const tg=(k,l,d)=>`<div class="ctl"><div><b style="font-weight:600;font-size:14px">${l}</b><div class="muted tiny">${d}</div></div><button class="tgl ${t[k]?'on':''}" role="switch" aria-checked="${t[k]}" aria-label="${l}" data-act="tg" data-arg="${k}"></button></div>`;
  return `
  <section class="sec" style="padding-bottom:0"><div class="wrap">
    <div class="next cardnext" style="padding:44px 44px">
      <div style="display:grid;gap:16px;align-content:center;position:relative;z-index:1">
        <span class="mono">New · AfterWorc Mastercard® debit</span>
        <h1 style="color:#fff">One account. Your own card.</h1>
        <p style="font-size:17px">Every AfterWorc account can issue a debit card: a company card for hiring, a personal one for earnings.</p>
        <div class="btns"><a class="btn lg" href="#login-card">Get the card</a><a class="btn ghost lg" href="#card-get">How to get it</a></div>
      </div>
      <div class="fan" aria-hidden="true"><div class="c c2">${card({variant:'company',name:'Kristjan Saar',org:'Põhjatäht OÜ',last4:'7730'})}</div><div class="c c1">${card({variant:'personal',name:'Kristjan Saar',last4:'4821'})}</div></div>
    </div>
  </div></section>

  ${sec(`<div class="tabsx" role="tablist"><button role="tab" aria-selected="${biz}" class="${biz?'on':''}" data-act="ctab" data-arg="biz">${ic('team',15)}For businesses</button><button role="tab" aria-selected="${!biz}" class="${biz?'':'on'}" data-act="ctab" data-arg="spec">${ic('task',15)}For specialists</button></div>
    <div class="split">
      <div class="stack" style="gap:18px"><h2>${biz?'A company card on the balance that funds your deals.':'Spend what you earn, the moment it’s released.'}</h2>
        ${checks(biz?[['Spends what you’ve topped up','No credit, no overdraft.'],['Receipts in one place','Every payment shows in Money with a slot for the receipt.'],['Deal money stays safe','Money held in deals is never touched by the card.']]:[['No waiting for the bank','Released earnings are on your card at once.'],['Or withdraw any time','To your bank in 1–2 business days, as before.'],['Top up when you need to','Cover card spending or a client refund from your Working balance.']])}</div>
      <div class="card lift pad-l" aria-label="Example: card in the account">
        <div class="row between"><h3>AfterWorc card</h3><span class="pill ${S.frozen?'wait':'ok'}">${S.frozen?'Frozen':'Active'}</span></div>
        <div class="row" style="margin-top:14px;align-items:center;gap:16px"><span class="pcardart" style="width:150px;flex:0 0 auto">${card({variant:biz?'company':'personal',name:'Kristjan Saar',org:biz?'Põhjatäht OÜ':'',last4:biz?'7730':'4821',frozen:S.frozen})}</span>
          <div class="kv grow" style="grid-template-columns:1fr auto"><span>Spends from</span><span>${biz?'Põhjatäht OÜ':'Working'}</span><span>Available</span><span>${biz?'€5,200':'€1,080'}</span><span>This month</span><span>${biz?'€1,284':'€0'}</span></div></div>
        <div class="progress" style="margin-top:14px"><i style="width:${biz?13:0}%"></i></div>
        <div class="btns" style="margin-top:14px"><button class="btn ghost sm" data-act="freeze">${S.frozen?'Unfreeze':'Freeze'}</button><button class="btn ghost sm" data-act="toast" data-arg="Top up: bank link, SEPA, card or phone wallet">Top up</button><button class="btn ghost sm" data-act="toast" data-arg="Card details show after two-factor authentication">Details</button></div>
        <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:4px">${tg('online','Online payments','Shops, subscriptions, ads')}${tg('atm','ATM withdrawals','Cash from machines')}${tg('abroad','Payments abroad','Outside Estonia')}</div>
        <p class="tiny muted" style="margin-top:10px">Example screen from the account. Try the switches.</p>
      </div>
    </div>`)}

  <section class="sec alt" id="get"><div class="wrap">
    ${shead('How to get it','Three steps, inside your account.')}
    <div class="grid g3">${[['shield','Use your verified account','We reuse the ID check you already passed. No new paperwork.'],['phoneW','Issue a virtual card','Ready in about a minute. Add it to Apple Pay or Google Pay.'],['card','Order the plastic, if you want','Delivered in 5–7 business days. Activate it in Money › Card.']].map(([i,t,s],k)=>`<div class="card"><div class="row between"><span class="icbox">${ic(i,18)}</span><span class="mono" style="color:var(--muted)">Step 0${k+1}</span></div><h3 style="margin-top:14px">${t}</h3><p class="muted small">${s}</p></div>`).join('')}</div>
    <div class="grid g4" style="margin-top:16px">${[['snow','Freeze','Instantly, and back again.'],['lock','Limits','Per day, per month, ATM.'],['eye','Details behind 2FA','Card number and PIN stay hidden.'],['plus','Top up in both modes','Bank link, SEPA, card, wallet.']].map(([i,t,s])=>`<div class="stat"><span class="row" style="gap:8px"><span class="icbox" style="width:30px;height:30px">${ic(i,15)}</span><b style="font-size:16px;margin:0">${t}</b></span><div class="h">${s}</div></div>`).join('')}</div>
  </div></section>

  ${sec(`<div class="split at"><div class="stack" style="gap:14px"><span class="mono">Questions</span><h2>About the card</h2><p class="tiny muted">Mastercard is a registered trademark of Mastercard International Incorporated. Card issued by [issuing partner]. Bracketed items are placeholders until the issuer agreement is final.</p></div>
    ${faq([['Is it a credit card?','No. It’s a Mastercard debit card that spends your AfterWorc balance.'],['Who issues it?','[Issuing partner], under licence from Mastercard. Their name and terms are shown before you issue a card.'],['What does it cost?','Fees follow the issuer’s published price list. We show them before you confirm.'],['Can I top up?','Yes, in Hiring and in Working: bank link, SEPA, another card, Apple Pay or Google Pay.'],['Lost it?','Freeze it in the app, then block it and get a new number in one step.']])}</div>`)}`;
}

/* ================= CATEGORIES ================= */
function catGrid(){
  const q=S.q.trim().toLowerCase();
  const areas=Object.entries(AREAS).map(([a,l])=>[a,l.filter(p=>!q||p.toLowerCase().includes(q)||a.toLowerCase().includes(q))]).filter(([,l])=>l.length);
  return areas.length?`<div class="grid g3">${areas.map(([a,l])=>`<div class="card"><div class="row between"><h3>${a}</h3><span class="pill">${l.length}</span></div><div class="chips" style="margin-top:12px">${l.map(p=>`<a class="chip" href="#hiring-assess">${p}</a>`).join('')}</div></div>`).join('')}</div>`:`<div class="card"><p class="muted">No profession matches “${esc(S.q)}”. <a class="btn link" href="#hiring-assess">Describe the job instead</a></p></div>`;
}
function vCategories(){
  return `
  <section class="hero"><div class="wrap"><div style="display:grid;gap:16px;max-width:760px"><span class="mono">Categories and professions</span><h1>Find the right people.</h1>
    <div style="position:relative;max-width:520px"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)">${ic('search',17)}</span><input id="catq" class="inp" style="padding-left:42px;border-radius:99px" data-bind="q" value="${esc(S.q)}" placeholder="Search a profession, e.g. DevOps" autocomplete="off"></div></div></div></section>
  ${sec(`<div id="catlist">${catGrid()}</div>
    <div class="next" style="margin-top:20px"><div style="position:relative;z-index:1"><h3 style="font-size:20px">Can’t find it?</h3><p style="margin-top:4px">Describe the job and we’ll tell you who it needs.</p></div><a class="btn" href="#hiring-assess">Free assessment</a></div>
    ${note('Sample of 7 areas. The live catalogue has 48 categories and 178 professions; search filters as you type.')}`,'alt')}`;
}

/* ================= ABOUT (content from afterworc.com/about) ================= */
const ONLINE=[['AfterWorc','https://afterworc.com/','globe'],['LinkedIn','https://www.linkedin.com/company/afterworc/','soc'],['Facebook','https://www.facebook.com/afterworc/','soc'],['Instagram','https://www.instagram.com/afterworc/','globe'],['Threads','https://www.threads.com/@afterworc','globe'],['X','https://x.com/afterworc','soc'],['YouTube','https://www.youtube.com/@afterworc','globe'],['TikTok','https://www.tiktok.com/@afterworc_com','globe'],['Telegram','https://t.me/afterworc_com','soc'],['Bluesky','https://bsky.app/profile/afterworc.com','soc'],['GitHub','https://github.com/AfterWorc','code'],['Google Maps','https://www.google.com/maps?cid=2303702669199136505','globe']];
function vAbout(){
  return `
  <section class="hero"><div class="wrap in">
    <div class="copy">
      <span class="mono">About us</span>
      <h1>A marketplace that can be checked itself.</h1>
      <p class="sub">AfterWorc builds workforces for SaaS, EMI, PSP and fintech companies: we find people, check them, hire them in another country when needed and pay them on time. A profile states what has been checked about the person behind it, an agreement fixes scope, deadline and amount before the work starts, and funds stay held until the client accepts the result.</p>
      <div class="btns"><a class="btn g lg" href="#hiring">For clients</a><a class="btn ghost lg" href="#building">For specialists</a></div>
      <div class="banner">${ic('check',15,2.4)}<span>Registration is open to businesses and specialists. <a href="#register">Create a free account</a></span></div>
      <div class="trust"><span>${ic('globe',15)}Estonian company, Tallinn</span><span>${ic('shield',15)}Checks made by people</span><span>${ic('lock',15)}Data stays in the EU</span></div>
    </div>
    <div class="card pad-l lift stack" style="gap:16px">
      <span class="mono" style="color:var(--muted)">The name</span>
      <h2 style="font-size:26px">AfterWorc, not afterwork, not afterword</h2>
      <div class="list">${[['AfterWorc','C','This company. An Estonian marketplace of IT specialists checked by people, run from Tallinn. The site you are reading is the AfterWorc site.',1],['afterwork','K','An ordinary English compound for the time after the working day: drinks, company. Nothing to do with this company.'],['afterword','D','An ordinary English noun for the closing section of a book, an epilogue. Nothing to do with this company.']].map(([w,l,d,us])=>`<div class="li" style="align-items:flex-start;${us?'background:var(--mintbg)':''}"><span class="avatar sm ${us?'':'alt'}">${l}</span><span class="grow"><div class="t">${w}</div><div class="s">${d}</div></span></div>`).join('')}</div>
    </div>
  </div></section>

  ${sec(`<div class="split at">
      <div class="stack" style="gap:14px"><span class="mono">The name</span><h2>A search engine quietly corrects the spelling.</h2>
        <p class="muted" style="font-size:16px">The unfamiliar spelling gets corrected to a familiar English word, and the person who was looking for the company ends up somewhere else. AfterWorc is a brand name. It is not a typing error, and the last letter is the whole point.</p>
        <p class="muted small">The company writes its name in Latin script in every language it publishes in: English, Estonian and Russian. A Cyrillic transcription says how the name sounds, not how it is written, and there is no second brand the company trades under.</p></div>
      <div class="next" style="display:grid;gap:10px;align-content:start"><span class="mono">Why the name ends in C</span><h2 style="position:relative;z-index:1">In AfterWorc, the c stands for checked.</h2><p style="position:relative;z-index:1">Work happens everywhere. Worc, in this name, is work that somebody verified: the whole promise of the platform compressed into a single character. The caron over the last letter of the logo is that same tick, worn as a diacritic. The spelling costs the company search traffic, and it was kept anyway.</p></div>
    </div>`,'alt')}

  ${sec(`<div class="split">
      <div class="stack" style="gap:14px"><span class="mono">Why this exists</span><h2>A correction of one specific mistake</h2>
        <p class="muted" style="font-size:16px">AfterWorc was not designed in a workshop. It started from a hire that went badly: fifteen open chats, the same questions copy-pasted into every one of them, and a decision made on whoever answered first.</p>
        <p class="muted" style="font-size:16px">The person chosen that way was not the best builder. Everything the product does now follows from that: what a profile is allowed to claim, who assigns the top level of trust, and at which moment money moves.</p></div>
      <div class="card pad-l lift"><p class="quote">“I interviewed every member of the founding group myself, because that is the only way the mark means anything. Everyone who joins now passes the same check.”</p><div class="row" style="margin-top:18px"><span class="avatar lg">VB</span><div><b style="font-weight:600">Victor Birjukov</b><div class="muted small">Founder, AfterWorc OÜ · Tallinn, Estonia</div></div></div></div>
    </div>`)}

  ${sec(`${shead('How the product works','Four rules the platform is built on','Each one is a property of the system, not a promise on a page.')}
    <div class="grid g4">${[['user','01 · People','The top level of trust is assigned by a person','Identity can be confirmed automatically. Judgement cannot. The highest level is given after a live interview and reference calls, and a person assesses both. No algorithm assigns it.'],['brief','02 · Agreement','Scope, deadline and amount are fixed before the work starts','The terms are recorded on the deal when the deal is agreed, and they are not rewritten afterwards. The two sides then argue about the work, not about what was meant.'],['lock','03 · Money','Funds stay held until the result is accepted','Money is held for the duration of the work and released on acceptance. The platform charges its commission at release and never before: a disagreement stops the payment instead of following it.'],['shield','04 · Data','Personal data is processed in the European Union','It is handled under the GDPR and does not leave the EU. Any restriction of an account comes with a stated ground, a notice and a way to appeal.']].map(([i,k,t,d])=>`<div class="card"><div class="row between"><span class="icbox">${ic(i,18)}</span><span class="mono" style="color:var(--muted)">${k}</span></div><h3 style="margin-top:14px">${t}</h3><p class="muted small">${d}</p></div>`).join('')}</div>`,'alt')}

  ${sec(`<div class="split">
      <div class="stack" style="gap:14px"><span class="mono">What a check is</span><h2>A profile states what was done, and nothing beyond it</h2><p class="muted" style="font-size:16px">There are three levels of trust, and each one names the check behind it. Nothing is implied and nothing is inflated. What each level means in detail is written on the pages for clients and for specialists.</p></div>
      <div class="cand top"><span class="best">WHAT A PROFILE STATES</span>
        <div class="kv" style="font-size:14px;grid-template-columns:auto 1fr;gap:10px 18px"><span>Identity</span><span style="text-align:left;font-weight:500">confirmed against a document, which the profile itself never shows</span><span>References</span><span style="text-align:left;font-weight:500">called by a person, and the answer written down</span><span>Interview</span><span style="text-align:left;font-weight:500">live, by video or at the Tallinn office</span><span>The level itself</span><span style="text-align:left;font-weight:500">assigned by a person, never by an algorithm</span></div>
        ${seal('Worc-Checked')}</div>
    </div>`)}

  ${sec(`${shead('Who it is for','Two sides of the market, and one door for a whole department','Everything below is something the platform already does. What it does not do is not written here.')}
    <div class="grid g3">${[['team','Businesses hiring','You describe what you are building. You get back a short list put together by people, and every line on it states what was checked. The written assessment of the task is free, and a person writes it.','#hiring','For clients'],['task','Specialists','You register, you are verified, and the interview is live: by video from wherever you are, or face to face in Tallinn if you are nearby. After that a person matches you to briefs: no bidding war, no unpaid test-task treadmill.','#building','For specialists'],['dept','Whole departments','Beyond single hires, the platform assembles a working team: a lead, a process and a shared standard, engaged under one agreement. The composition is agreed before the work starts; the team does the work and you accept it.','#hiring-assess','Ask about a department']].map(([i,t,d,h,l])=>`<div class="card stack"><span class="icbox">${ic(i,18)}</span><h3>${t}</h3><p class="muted small">${d}</p><a class="btn ghost sm" href="${h}" style="justify-self:start">${l} ${ic('arrow',14)}</a></div>`).join('')}</div>`,'alt')}

  ${sec(`<div class="split at">
      <div class="stack" style="gap:14px"><span class="mono">The company</span><h2>Who stands behind the platform</h2><p class="muted" style="font-size:16px">The platform is operated by an Estonian private limited company. The details below are the ones held in the commercial register.</p><p class="muted small">The Terms and Conditions and the Privacy and Confidentiality Policy linked in the footer are the documents that govern use of the platform.</p></div>
      <div class="card pad-l"><div class="kv" style="font-size:14px;gap:10px 16px"><span>Legal name</span><span>AfterWorc OÜ</span><span>Brand name</span><span>AfterWorc</span><span>Registry code</span><span>17554808</span><span>Founded</span><span>July 17, 2026</span><span>Registered address</span><span>Mäealuse tn 10/2, Mustamäe linnaosa, 12618 Tallinn, Estonia</span><span>Contact</span><span id="mail">info@afterworc.com</span></div>
        <div class="btns" style="margin-top:16px"><button class="btn ghost sm" data-act="copy">${ic('copy',14)}Copy e-mail</button><a class="btn ghost sm" href="https://www.inforegister.ee/en/17554808-AFTERWORC-OU/" target="_blank" rel="noopener">The company’s entry in the Estonian business register</a></div></div>
    </div>`)}

  ${sec(`${shead('Online','Where the company actually is','These are the accounts the company owns. A profile that uses the name and is not on this list is not us.')}
    <div class="grid g4" style="gap:10px">${ONLINE.map(([n,u,t])=>`<a class="card row" style="padding:12px 14px;text-decoration:none" href="${u}" target="_blank" rel="noopener"><span class="icbox" style="width:34px;height:34px">${t==='soc'?socIc(n,17):ic(t,17)}</span><b style="font-weight:600;font-size:14px">${n}</b><span style="margin-left:auto;color:var(--muted)">${ic('arrow',14)}</span></a>`).join('')}</div>`,'alt')}

  ${sec(`<div class="split at"><div class="stack" style="gap:14px"><span class="mono">Questions</span><h2>Questions people ask about AfterWorc</h2></div>
    ${faq([['Why is AfterWorc spelled with a C at the end?','Because in AfterWorc the c stands for checked. It is not a misspelling of afterwork and not a variant of afterword: it is a brand name, and the final C is what separates work from work somebody verified.'],['Who founded AfterWorc?','Victor Birjukov, in Tallinn, Estonia. He interviewed the founding group of specialists himself.'],['When was AfterWorc founded?','The company is registered in Tallinn, Estonia. The founding date and the registry code are stated in full in the company details above, and the register entry is public.'],['Who does the checking?','People do. Identity can be confirmed automatically, but the level of trust on a profile is assigned by a person after a live interview and reference calls. No specialist reaches the top level through an algorithm.'],['What does Worc-Checked mean?','Worc-Checked is the top of the published ladder: Registered, then Verified, then Worc-Checked. A person assigns it after a live interview and reference calls; the interview happens by video, or face to face at the Tallinn office if you are nearby.'],['How does money work on a piece of work?','Scope, deadline and amount are agreed and recorded before the work begins. Funds stay held for the duration of the work and are released on acceptance, and the platform takes its commission at release and never before.'],['Where is personal data stored?','In the European Union, processed under the GDPR. Data handled by the platform does not leave the EU.'],['Is AfterWorc the same as an IT outsourcing agency?','No. An agency sells you a contract and assigns whoever is free. Here you see the specific checked specialist before you commit to anything, and the short list is put together by people rather than produced automatically.'],['How do you pronounce AfterWorc?','Exactly like “after work”. The spelling differs; the sound does not.']])}</div>
    <div class="next" style="margin-top:40px"><div style="position:relative;z-index:1"><h3 style="font-size:22px">Two doors, both open.</h3><p style="margin-top:6px">Clients get a short list with the checks stated. Specialists are chosen on what was checked, not on how fast they replied.</p></div><div class="btns" style="position:relative;z-index:1"><a class="btn" href="#register">Sign up free</a><a class="btn ghost" href="#hiring">I’m hiring</a><a class="btn ghost" href="#building">I’m building</a></div></div>`)}`;
}

/* ================= SIGN UP / LOG IN (mirrors afterworc.com/register and /login) ================= */
function vRegister(){
  const r=S.reg,hire=r.role==='hire';
  const ctx=r.ctx&&PEOPLE.find(p=>p.id===r.ctx);
  if(r.done)return `<section class="sec"><div class="wrap" style="max-width:520px"><div class="card pad-l lift stack" style="text-align:center;justify-items:center">
    <span class="ck" style="width:52px;height:52px">${ic('check',22,2.6)}</span><h2>Check your e-mail</h2>
    <p class="muted">We sent a confirmation link. Open it to activate your account.</p><b data-notr>${esc(r.email)}</b>
    <div class="feeline" style="width:100%;text-align:left"><span>Next</span><span>${hire?'Post your first brief':'Build your profile'}</span><span class="tot">Then</span><span class="tot">${hire?'Shortlist within 48 h':'Book your interview'}</span></div>
    ${r.devLink?`<a class="btn g" href="${esc(r.devLink)}" data-notr>Open the confirmation link (dev mode)</a>`:''}
    <div class="btns" style="justify-content:center"><button class="btn ghost" data-act="resend">Send the link again</button><button class="btn link" data-act="regreset">Use another e-mail</button></div></div></div></section>`;
  return `<section class="sec"><div class="wrap split at" style="max-width:1040px">
    <div class="stack" style="gap:16px"><span class="mono">Create an account</span><h1 style="font-size:clamp(30px,3.4vw,42px)">${ctx?'Sign up to contact '+'<span data-notr>'+ctx.n+'</span>':'Free account. Two minutes.'}</h1>
      <p class="muted" style="font-size:16px">One account for both sides. You can hire and work from the same login and switch any time.</p>
      ${checks(hire?[['Post a brief','A person reads it and sends up to 3 checked matches within 48 hours.'],['Money held until you accept','Pay by bank link, SEPA, card or phone wallet.'],['One agreement, one invoice','For a single task or a whole department.']]:[['Build your profile','Skills, rate, availability and work samples.'],['Get checked','ID, references and a live interview. Free.'],['Get matched','No bidding, no paid proposals.']])}
      ${note('Mirrors the live form at afterworc.com/register: e-mail, password with Show, required Terms and Privacy checkbox, optional product news, Create account. The role choice is new and only sets which mode opens first.')}</div>
    <form class="card pad-l lift" data-form="reg" novalidate>
      <div class="field"><span>I want to</span><div class="opts" style="grid-template-columns:1fr 1fr">${[['hire','team','Hire','Find people or a team'],['work','task','Work','Get matched to briefs']].map(([k,i,t,d])=>`<button type="button" class="opt ${r.role===k?'on':''}" data-act="regrole" data-arg="${k}" style="padding:12px"><span class="ic">${ic(i,15)}</span><b style="font-size:15px;margin:4px 0 0">${t}</b><span>${d}</span></button>`).join('')}</div></div>
      <label class="field"><span>E-mail</span><input id="r-email" class="inp" type="email" data-bind="reg.email" value="${esc(r.email)}" placeholder="you@company.com" autocomplete="email"></label>
      <label class="field"><span>Password</span><div style="position:relative"><input id="r-pw" class="inp" type="${r.show?'text':'password'}" data-bind="reg.pw" value="${esc(r.pw)}" autocomplete="new-password" style="padding-right:72px"><button type="button" class="btn link" data-act="regshow" style="position:absolute;right:12px;top:50%;transform:translateY(-50%)">${r.show?'Hide':'Show'}</button></div><small>At least 10 characters.</small></label>
      <label class="row small" style="align-items:flex-start;margin-bottom:10px"><input type="checkbox" data-act="regterms" ${r.terms?'checked':''} style="margin-top:3px"><span>I accept the Terms and Conditions and the Privacy and Confidentiality Policy. <a href="#terms">Read the Terms</a> · <a href="#privacy">Privacy Policy</a></span></label>
      <label class="row small" style="align-items:flex-start;margin-bottom:16px"><input type="checkbox" data-act="regnews" ${r.news?'checked':''} style="margin-top:3px"><span class="muted">Send me product news. Optional, and you can withdraw it at any time.</span></label>
      <button class="btn g block lg" type="submit" ${S.busy?'disabled':''}>Create account</button>
      <p class="small muted" style="margin-top:14px;text-align:center">Already have an account? <a class="btn link" href="#login">Log in</a></p>
    </form>
  </div></section>`;
}
function vLogin(){
  const card=S.loginFor==='card',staff=S.loginFor==='staff',L=S.login;
  const head=card?'Log in to get your card':staff?'Staff log in':'Log in';
  return `<section class="sec"><div class="wrap" style="max-width:480px">
    ${S.loginFor==='expired'?`<div class="banner am" style="margin-bottom:14px">${ic('clock',16)}<span>This link has expired or was already used. Log in, or ask for a new link.</span></div>`:''}
    ${S.loginFor==='invite'?`<div class="banner" style="margin-bottom:14px">${ic('team',16)}<span>Log in with the invited e-mail, then open the invitation link again.</span></div>`:''}
    ${S.loginFor==='reset'?`<div class="banner" style="margin-bottom:14px">${ic('check',16)}<span>Password changed. Log in with your new password.</span></div>`:''}
    <form class="card pad-l lift stack" data-form="login" novalidate>
      <span class="mono">${card?'AfterWorc card':staff?'AfterWorc staff':'Account'}</span>
      <h2>${head}</h2>
      <label class="field" style="margin:0"><span>E-mail</span><input id="l-email" class="inp" type="email" data-bind="login.email" value="${esc(L.email)}" placeholder="you@company.com" autocomplete="email"></label>
      <label class="field" style="margin:0"><span>Password</span><input id="l-pw" class="inp" type="password" data-bind="login.pw" value="${esc(L.pw)}" autocomplete="current-password"></label>
      ${L.need2fa?`<label class="field" style="margin:0"><span>Code from your authenticator app</span><input id="l-code" class="inp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" data-bind="login.code" value="${esc(L.code||'')}" placeholder="6 digits"></label>`:''}
      ${L.unverified?`<div class="banner am">${ic('clock',16)}<span>Confirm your e-mail first. <button type="button" class="btn link small" data-act="resend">Send the link again</button></span></div>`:''}
      <div class="row between"><a class="btn link small" href="#forgot">Forgot your password?</a></div>
      <button class="btn g block" type="submit" ${S.busy?'disabled':''}>Log in</button>
      <p class="small muted" style="text-align:center">New to AfterWorc? <a class="btn link" href="#register">Create a free account</a></p>
    </form></div></section>`;
}
function vForgot(){
  const f=S.forgot;
  if(f.done)return `<section class="sec"><div class="wrap" style="max-width:480px"><div class="card pad-l lift stack" style="text-align:center;justify-items:center"><span class="ck" style="width:52px;height:52px">${ic('check',22,2.6)}</span><h2>Check your e-mail</h2><p class="muted">If an account uses <b data-notr>${esc(f.email)}</b>, we sent a link to choose a new password. It works for 2 hours.</p>${f.devLink?`<a class="btn g" href="${esc(f.devLink)}" data-notr>Open the reset link (dev mode)</a>`:''}<a class="btn link" href="#login">Back to log in</a></div></div></section>`;
  return `<section class="sec"><div class="wrap" style="max-width:480px">
    <form class="card pad-l lift stack" data-form="forgot" novalidate><span class="mono">Account</span><h2>Forgot your password?</h2><p class="muted small">Enter the e-mail you signed up with. We send a link to choose a new password.</p>
      <label class="field" style="margin:0"><span>E-mail</span><input id="f-email" class="inp" type="email" data-bind="forgot.email" value="${esc(f.email)}" placeholder="you@company.com" autocomplete="email"></label>
      <button class="btn g block" type="submit" ${S.busy?'disabled':''}>Send the link</button><a class="btn link small" href="#login" style="justify-self:center">Back to log in</a></form></div></section>`;
}
function vReset(){
  return `<section class="sec"><div class="wrap" style="max-width:480px">
    <form class="card pad-l lift stack" data-form="reset" novalidate><span class="mono">Account</span><h2>Choose a new password</h2>
      <label class="field" style="margin:0"><span>New password</span><input id="rs-pw" class="inp" type="password" data-bind="reset.pw" autocomplete="new-password"><small>At least 10 characters.</small></label>
      <button class="btn g block" type="submit" ${S.busy?'disabled':''}>Save password</button></form></div></section>`;
}

/* ================= FIND SPECIALISTS ================= */
const QSTOP=new Set(['a','an','the','and','or','for','senior','junior','developer','engineer','specialist','lead']);
function qMatch(p,q){if(!q)return true;const hay=(p.n+' '+p.r+' '+p.area+' '+p.skills.join(' ')).toLowerCase();if(hay.includes(q))return true;const w=q.split(/[\s,]+/).filter(x=>x.length>1&&!QSTOP.has(x));return w.length>0&&w.some(x=>hay.includes(x))}
function results(){
  const f=S.f;const q=S.q.trim().toLowerCase();
  let list=PEOPLE.filter(p=>(f.area==='All'||p.area===f.area)&&(f.level==='any'||p.lv===f.level)&&(!f.now||p.now)&&(p.rate==null||p.rate<=f.max)&&qMatch(p,q));
  if(f.sort==='rate')list=[...list].sort((a,b)=>a.rate-b.rate);
  if(f.sort==='deals')list=[...list].sort((a,b)=>b.deals-a.deals);
  return `<div class="row between wrapf" style="margin-bottom:14px"><span class="muted small"><b data-notr>${list.length}</b> <span>${list.length===1?'specialist':'specialists'}</span></span>
    <label class="row small"><span class="muted">Sort</span><select class="inp" style="width:auto;padding:7px 10px" data-bind="f.sort">${[['match','Best match'],['rate','Lowest rate'],['deals','Most deals']].map(([k,l])=>`<option value="${k}" ${f.sort===k?'selected':''}>${l}</option>`).join('')}</select></label></div>
    ${list.length?`<div class="grid g2">${list.map(personCard).join('')}</div>`:`<div class="card"><p class="muted">No one matches these filters. <button class="btn link" data-act="freset">Clear filters</button></p></div>`}`;
}
function vSearch(){
  const f=S.f;const areas=['All',...Object.keys(AREAS)];
  return `
  <section class="hero" style="padding-block:44px 32px"><div class="wrap"><div style="display:grid;gap:14px;max-width:760px"><span class="mono">Find specialists</span><h1>Checked people, ready to hire.</h1>
    <div style="position:relative;max-width:560px"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)">${ic('search',17)}</span><input id="sq" class="inp" style="padding-left:42px;border-radius:99px" data-bind="q2" value="${esc(S.q)}" placeholder="Skill, role or name, e.g. Go, Figma, DevOps" autocomplete="off"></div></div></div></section>
  <section class="sec" style="padding-top:28px"><div class="wrap split side">
    <aside class="card stack" style="gap:18px">
      <div><span class="mono" style="color:var(--muted)">Area</span><div class="chips" style="margin-top:8px">${areas.map(a=>`<button class="chip ${f.area===a?'on':''}" data-act="farea" data-arg="${a}">${a==='All'?'All areas':a}</button>`).join('')}</div></div>
      <div><span class="mono" style="color:var(--muted)">Level</span><div class="chips" style="margin-top:8px">${[['any','Any level'],['checked','Worc-Checked'],['verified','Verified']].map(([k,l])=>`<button class="chip ${f.level===k?'on':''}" data-act="flevel" data-arg="${k}">${l}</button>`).join('')}</div></div>
      <div class="ctl" style="border:0;padding:0"><b style="font-weight:600;font-size:14px">Available now</b><button class="tgl ${f.now?'on':''}" role="switch" aria-checked="${f.now}" aria-label="Available now" data-act="fnow"></button></div>
      <label><span class="mono" style="color:var(--muted)">Max rate · <span data-notr>€${f.max}</span> / h</span><input type="range" min="30" max="80" step="5" value="${f.max}" data-bind="f.max" style="width:100%;margin-top:8px;accent-color:var(--brand2)"></label>
      <div class="banner" style="font-size:12.5px">${ic('brief',15)}<span>Not sure who you need? <a href="#hiring-assess">Get a free assessment</a> or <a href="#register-hire">post a brief</a>.</span></div>
    </aside>
    <div id="results">${results()}</div>
  </div><div class="wrap">${note('New page. Live has /search behind the menu; a working marketplace puts browsing up front. Profiles are examples; contacting someone asks you to sign up.')}</div></section>`;
}
function vSpecialist(id){
  const p=PEOPLE.find(x=>x.id===id);
  if(!p)return `<section class="sec"><div class="wrap" style="max-width:640px"><div class="card pad-l stack"><h2>Profile not found</h2><p class="muted">This profile is not public, or the link is wrong.</p><a class="btn g" href="#search">Find specialists</a></div></div></section>`;
  const contact=S.me?'/app#/hire/pp/'+encodeURIComponent(p.id):'#register-'+p.id;
  return `<section class="sec" style="padding-top:36px"><div class="wrap">
    <div class="small muted" style="margin-bottom:14px"><a href="#search" class="btn link small">${ic('arrow',13)} Find specialists</a></div>
    <div class="split r at">
      <div class="stack" style="gap:16px">
        <div class="card pad-l"><div class="row" style="gap:16px">${avatarOf(p,'lg')}<div class="grow"><h1 style="font-size:30px" data-notr>${p.n}</h1><div class="muted">${p.r}</div><div class="row wrapf" style="margin-top:8px">${lvPill(p)}<span class="pill ${p.now?'ok':''}">${p.avail}</span></div></div></div>
          <div class="chips" style="margin-top:16px">${p.skills.map(k=>`<span class="chip">${k}</span>`).join('')}</div></div>
        <div class="card"><h3>What was checked</h3><div class="ladder" style="margin-top:6px">${[['Identity','Confirmed against a document',1],['References','2 of 2 called',p.lv==='checked'],['Interview','Live, with our team',p.lv==='checked']].map(([t,d,ok])=>`<div class="lad ${ok?'done':''}"><span class="b">${ok?ic('check',14,2.6):'–'}</span><div><b>${t}</b><p>${ok?d:'Not yet'}</p></div><span></span></div>`).join('')}</div></div>
        ${p.history&&p.history.length?`<div class="card"><h3>Recent work</h3><div class="list" style="margin-top:12px">${p.history.slice(0,3).map(w=>`<div class="li"><span class="icbox" style="width:30px;height:30px">${ic('check',14,2.4)}</span><span class="grow"><div class="t" data-notr>${w.t}</div><div class="s">Delivered · ★ ${p.stars}</div></span><b class="small">€${Number(w.a).toLocaleString('en-GB')}</b></div>`).join('')}</div></div>`:''}
        ${p.bio?`<div class="card"><h3>About</h3><p class="muted" style="margin-top:6px" data-notr>${p.bio}</p></div>`:''}
        ${p.portfolio&&p.portfolio.length?`<div class="card"><h3>Portfolio</h3><div class="grid g3" style="margin-top:12px">${p.portfolio.map(w=>`<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;display:grid">${w.image?`<a href="${w.image}" target="_blank" rel="noopener"><img src="${w.image}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block"></a>`:''}<div style="padding:10px 12px" data-notr><b class="small">${w.title}</b>${w.descr?`<p class="tiny muted" style="margin-top:4px">${w.descr}</p>`:''}${w.url&&/^https?:\/\//.test(w.url)?`<a class="tiny" href="${w.url}" target="_blank" rel="noopener noreferrer nofollow">${w.url.replace(/^https?:\/\//,'').slice(0,40)}</a>`:''}</div></div>`).join('')}</div></div>`:''}
      </div>
      <div class="card pad-l lift stack" style="position:sticky;top:84px">
        <div class="row between"><span class="muted">Rate</span><b style="font-family:Sora;font-size:24px">${rateTxt(p)}</b></div>
        <div class="kv"><span>Availability</span><span>${p.avail}</span><span>Deals</span><span>${p.deals} · ★ ${p.stars}</span><span>Based in</span><span>${p.city}</span><span>Languages</span><span>${p.langs}</span></div>
        <a class="btn g block" href="${contact}">Request a proposal</a>
        <a class="btn ghost block" href="${contact}">Book a 15-minute call</a>
        <p class="tiny muted">You need a free account to contact specialists. Money is only charged when you fund a milestone.</p>
      </div>
    </div>
    ${note('Example profile. Contact buttons lead to sign-up with the person remembered, so the request is waiting in the account afterwards.')}
  </div></section>`;
}

/* ================= i18n (EN / ET / RU, as on afterworc.com) ================= */
const norm=s=>s.replace(/\s+/g,' ').trim();
function T(s){if(S.lang==='en')return s;const d=I18N[S.lang]||{};const k=norm(s);return d[k]||s}
function translateDOM(el){
  const d=I18N[S.lang]||{};
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest('svg,script,style,[data-notr]'))return NodeFilter.FILTER_REJECT;return norm(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){const k=norm(n.nodeValue);const v=d[k];if(v){const m=n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);n.nodeValue=m[1]+v+m[2]}}
  el.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e=>{if(e.closest('svg'))return;for(const a of ['placeholder','aria-label','title']){const v=e.getAttribute(a);if(v&&d[norm(v)])e.setAttribute(a,d[norm(v)])}});
}
/* ================= router + render ================= */
const PAGES={home:vHome,hiring:vHiring,building:vBuilding,how:vHow,card:vCard,categories:vCategories,about:vAbout,register:vRegister,login:vLogin,forgot:vForgot,reset:vReset,search:vSearch,specialist:()=>vSpecialist(S.person),terms:vTerms,privacy:vPrivacy,cookies:vCookies,cookiesettings:vCookieSettings};
const root=document.getElementById('app');
function render(anchor){
  root.innerHTML=header()+`<main id="main">${PAGES[S.page]()}</main>`+footer()+
    (S.toast?`<div class="toast" role="status">${ic('check',15,2.4)}${esc(S.toast)}</div>`:'')+
    '';
  document.documentElement.lang=S.lang==='et'?'et-EE':S.lang;
  if(S.lang!=='en')translateDOM(root);
  if(anchor){const el=document.getElementById(anchor);if(el)window.scrollTo({top:el.getBoundingClientRect().top+scrollY-76,behavior:'instant'})}
}
function route(){
  const h=decodeURIComponent((location.hash||'#home').slice(1))||'home';
  const i=h.indexOf('-');let pg=i<0?h:h.slice(0,i),anchor=i<0?null:h.slice(i+1);
  if(pg==='signin')pg='login';
  if(pg==='map')pg='home';
  if(pg==='register')S.reg.done=false;
  if(pg==='register'&&anchor){if(anchor==='hire'||anchor==='work'){S.reg.role=anchor;S.reg.ctx=''}else{S.reg.role='hire';S.reg.ctx=anchor}anchor=null}
  else if(pg==='register'){S.reg.ctx=''}
  if(pg==='login'){S.loginFor=anchor||null;anchor=null}
  if(pg==='forgot'){S.forgot.done=false}
  if(pg==='reset'){S.reset={token:anchor||'',pw:''};anchor=null;history.replaceState(null,'','#reset')}
  if(pg==='specialist'){S.person=anchor;anchor=null}
  if(!PAGES[pg])pg='home';
  if((pg==='register'||pg==='login')&&S.me&&!S.loginFor){location.href='/app';return}
  const changed=S.page!==pg||pg==='specialist'||pg==='register';S.page=pg;S.menu=false;
  document.title=({home:'AfterWorc · Build your workforce. We run the rest.',hiring:'Hire checked specialists · AfterWorc',building:'For specialists · AfterWorc',how:'How it works · AfterWorc',card:'AfterWorc card',categories:'Categories · AfterWorc',about:'About us · AfterWorc',register:'Sign up · AfterWorc',login:'Log in · AfterWorc',search:'Find specialists · AfterWorc',terms:'Terms and Conditions · AfterWorc',privacy:'Privacy Policy · AfterWorc',cookies:'Cookie Notice · AfterWorc'})[pg]||'AfterWorc';
  render(anchor);
  if(!anchor&&changed)window.scrollTo({top:0,behavior:'instant'});
}
/* ---------- API ---------- */
async function api(path,body){
  const r=await fetch('/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Requested-With':'afterworc'},credentials:'same-origin',body:body?JSON.stringify(body):undefined});
  let d={};try{d=await r.json()}catch(e){}
  if(!r.ok){const e=new Error(d.error||'Something went wrong. Try again.');e.data=d;throw e}
  return d;
}
async function busy(fn){if(S.busy)return;S.busy=true;keep();try{await fn()}catch(e){if(e.data&&e.data.need2fa){S.login.need2fa=true}if(e.data&&e.data.unverified){S.login.unverified=true}S.busy=false;keep();toast(e.message);return}S.busy=false;keep()}
let tT;function toast(t,raw){S.toast=raw?t:T(t);keep();clearTimeout(tT);tT=setTimeout(()=>{S.toast=null;const el=document.querySelector('.toast');el&&el.remove()},2600)}
function keep(){const y=scrollY;render();window.scrollTo({top:y,behavior:'instant'})}
addEventListener('hashchange',route);

/* ================= actions ================= */
const A={
  menu:()=>{S.menu=!S.menu;keep()},
  cookietg:k=>{const c=cookiePrefs();c[k]=!c[k];try{localStorage.setItem('aw-cookies',JSON.stringify(c))}catch(e){}keep();toast('Cookie settings saved')},
  logout:()=>busy(async()=>{await api('/auth/logout',{});S.me=null;location.hash='home'}),
  resend:()=>busy(async()=>{const email=S.reg.done?S.reg.email:S.login.email;const d=await api('/auth/resend',{email});if(d.devLink)S.reg.devLink=d.devLink;toast('Sent. Check your e-mail')}),
  hcodeback:()=>{S.form.hire.leadId=null;S.form.hire.code='';keep()},
  theme:()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('aw-theme',r.dataset.theme)}catch(e){}S.menu=false;keep()},
  regrole:k=>{S.reg.role=k;keep()},regshow:()=>{S.reg.show=!S.reg.show;keep()},regterms:()=>{S.reg.terms=!S.reg.terms;keep()},regnews:()=>{S.reg.news=!S.reg.news;keep()},
  regreset:()=>{S.reg={role:S.reg.role,email:'',pw:'',show:false,terms:false,news:false,done:false,ctx:''};keep()},
  farea:a=>{S.f.area=a;keep()},flevel:k=>{S.f.level=k;keep()},fnow:()=>{S.f.now=!S.f.now;keep()},freset:()=>{S.f={area:'All',level:'any',now:false,max:80,sort:'match'};S.q='';keep()},
  htab:k=>{S.htab=k;keep();setTimeout(()=>document.querySelector('.hsearch input')?.focus({preventScroll:true}),0)},
  hq:q=>{S.q=q;S.f={area:'All',level:'any',now:false,max:80,sort:'match'};location.hash='search'},
  lang:l=>{S.lang=l;try{localStorage.setItem('aw-lang',l)}catch(e){}S.menu=false;keep()},
  notes:()=>{document.body.classList.toggle('notes');S.menu=false;keep()},
  toast:t=>toast(t),
  dept:k=>{S.dept=k;keep()},
  ctab:k=>{S.ctab=k;keep()},
  tg:k=>{S.tg[k]=!S.tg[k];toast(({online:'Online payments',atm:'ATM withdrawals',abroad:'Payments abroad'})[k]+(S.tg[k]?' on':' off'))},
  freeze:()=>{S.frozen=!S.frozen;toast(S.frozen?'Card frozen. Payments are declined':'Card unfrozen')},
  htype:k=>{S.form.hire.type=k;keep()},hchan:c=>{S.form.hire.chan=c;keep()},hback:()=>{S.form.hire.step--;keep()},hreset:()=>{S.form.hire={step:0,type:'team',need:'',email:'',chan:'Email only',done:false,leadId:null,code:''};keep()},
  byears:y=>{S.form.build.years=y;keep()},bchan:c=>{S.form.build.chan=c;keep()},bback:()=>{S.form.build.step--;keep()},breset:()=>{S.form.build={step:0,prof:'',years:'3–5',link:'',email:'',chan:'Email only',done:false};keep()},
  copy:()=>{const t='info@afterworc.com';(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('E-mail address copied')).catch(()=>{const r=document.createRange();r.selectNodeContents(document.getElementById('mail'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Selected: press Ctrl+C / ⌘C to copy')})}
};
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');
  if(g){e.preventDefault();S.signinFor=g.dataset.arg||null;if(location.hash==='#'+g.dataset.go)route();else location.hash=g.dataset.go;return}
  const a=e.target.closest('[data-act]');
  if(a){e.preventDefault();const f=A[a.dataset.act];f&&f(a.dataset.arg);return}
  const t=e.target.closest('[data-type]');
  if(t){S.form.hire.type=t.dataset.type;S.form.hire.step=0}
  const l=e.target.closest('a[href^="#"]');
  if(l&&l.getAttribute('href')===location.hash){e.preventDefault();route();return}
  if(S.menu&&!e.target.closest('.menu')){S.menu=false;keep()}
});
document.addEventListener('change',e=>{if(e.target.dataset.bind==='f.sort'){S.f.sort=e.target.value;const el=document.getElementById('results');el.innerHTML=results();if(S.lang!=='en')translateDOM(el)}});
document.addEventListener('input',e=>{
  const b=e.target.dataset.bind;if(!b)return;
  if(b==='q'){S.q=e.target.value;const el=document.getElementById('catlist');el.innerHTML=catGrid();if(S.lang!=='en')translateDOM(el);return}
  if(b==='q2'||b.startsWith('f.')){if(b==='q2')S.q=e.target.value;else{const k=b.slice(2);S.f[k]=k==='max'?Number(e.target.value):e.target.value;if(k==='max'){const lab=e.target.closest('label').querySelector('[data-notr]');if(lab)lab.textContent='€'+S.f.max}}const el=document.getElementById('results');el.innerHTML=results();if(S.lang!=='en')translateDOM(el);return}
  const [f,k]=b.split('.');if(['reg','login','forgot','reset'].includes(f)){S[f][k]=e.target.value;return}S.form[f][k]=e.target.value;
});
document.addEventListener('submit',e=>{
  e.preventDefault();const which=e.target.dataset.form;
  if(which==='hsearch'){A.hq(e.target.hq.value.trim());return}
  if(which==='hwork'){S.reg.role='work';location.hash='register-work';return}
  if(which==='reg'){const r=S.reg;if(!/.+@.+\..+/.test(r.email)){toast('Enter your e-mail address');return}if((r.pw||'').length<10){toast('Use at least 10 characters for the password');return}if(!r.terms){toast('Accept the Terms and Conditions and the Privacy Policy to continue');return}
    busy(async()=>{const d=await api('/auth/register',{email:r.email,password:r.pw,role:r.role,terms:r.terms,news:r.news,ctx:r.ctx});r.devLink=d.devLink||'';r.pw='';r.done=true;window.scrollTo({top:0,behavior:'instant'})});return}
  if(which==='login'){const L=S.login;if(!/.+@.+\..+/.test(L.email)){toast('Enter your e-mail address');return}if(!L.pw){toast('Enter your password');return}
    busy(async()=>{L.unverified=false;const d=await api('/auth/login',{email:L.email,password:L.pw,code:L.code||undefined,admin:S.loginFor==='staff'});if(d.need2fa){L.need2fa=true;setTimeout(()=>document.getElementById('l-code')?.focus(),0);return}
      location.href=S.loginFor==='card'?d.redirect.replace(/\/home$/,'/card'):d.redirect});return}
  if(which==='forgot'){const f=S.forgot;if(!/.+@.+\..+/.test(f.email)){toast('Enter your e-mail address');return}busy(async()=>{const d=await api('/auth/forgot',{email:f.email});f.devLink=d.devLink||'';f.done=true});return}
  if(which==='reset'){const r=S.reset;if((r.pw||'').length<10){toast('Use at least 10 characters for the password');return}busy(async()=>{await api('/auth/reset',{token:r.token,password:r.pw});S.reset={token:'',pw:''};location.hash='login-reset'});return}
  if(which==='hirecode'){const f=S.form.hire;busy(async()=>{await api('/leads/'+f.leadId+'/confirm',{code:f.code});f.done=true});return}
  const f=S.form[which];
  if(which==='hire'){
    if(f.step===0&&!f.need.trim()){toast('Describe what you need in a sentence or two');return}
    if(f.step===1&&!/.+@.+\..+/.test(f.email)){toast('Enter a work e-mail so we can reply');return}
  }else{
    if(f.step===0&&!f.prof.trim()){toast('Tell us what you build');return}
    if(f.step===1&&!/.+@.+\..+/.test(f.email)){toast('Enter your e-mail so we can reply');return}
  }
  if(which==='hire'&&f.step===1){busy(async()=>{const d=await api('/leads',{type:f.type,need:f.need,email:f.email,chan:f.chan,lang:S.lang});f.leadId=d.id;f.devCode=d.devCode||'';f.code='';setTimeout(()=>document.getElementById('h-code')?.focus(),0)});return}
  if(f.step<1)f.step++;else f.done=true;keep();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.menu){S.menu=false;keep()}});
try{const t=localStorage.getItem('aw-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
try{const l=localStorage.getItem('aw-lang');if(l&&I18N[l])S.lang=l}catch(e){}
Promise.all([api('/auth/me').then(d=>{S.me=d.user}).catch(()=>{}),api('/specialists').then(d=>{PEOPLE=d.map(cleanPerson)}).catch(()=>{})]).then(route);
