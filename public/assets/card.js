/* AfterWorc Mastercard debit card — SVG renderer (framework-free).
   awCard({variant:'personal'|'company'|'virtual', side:'front'|'back', name, org, last4, exp, pan, cvc, frozen, uid})
   Returns an SVG string, CR80 ratio (85.60 × 53.98 mm) at 856 × 540 units.
   Carries the Mastercard mark as used on afterworc.com; production print files come from the issuer's brand kit. */
function awCard(o){
  o=Object.assign({variant:'personal',side:'front',name:'KRISTJAN SAAR',org:'',last4:'4821',exp:'09/30',pan:'',cvc:'',frozen:false,uid:'c'+Math.random().toString(36).slice(2,7)},o||{});
  const E=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const u=o.uid, v=o.variant;
  const P={
    personal:{a:'#0a6a41',b:'#063d26',c:'#021f13',ink:'#ffffff',sub:'rgba(255,255,255,.72)',arc:'#85d6ae',arcO:.16,tag:'debit'},
    company:{a:'#1b2a23',b:'#0d1a14',c:'#050b08',ink:'#ffffff',sub:'rgba(255,255,255,.66)',arc:'#2f9e4a',arcO:.30,tag:'business debit'},
    virtual:{a:'#dff5e8',b:'#b9e8cd',c:'#85d6ae',ink:'#063d26',sub:'rgba(6,61,38,.7)',arc:'#065132',arcO:.10,tag:'virtual debit'}
  }[v]||{};
  const W=856,H=540;
  const defs=`<defs>
    <linearGradient id="g${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.a}"/><stop offset=".55" stop-color="${P.b}"/><stop offset="1" stop-color="${P.c}"/></linearGradient>
    <radialGradient id="r${u}" cx=".85" cy=".1" r=".75"><stop offset="0" stop-color="#ffffff" stop-opacity="${v==='virtual'?.55:.14}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <linearGradient id="ch${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e2a6"/><stop offset=".5" stop-color="#d4b25e"/><stop offset="1" stop-color="#a8843a"/></linearGradient>
    <clipPath id="k${u}"><rect width="${W}" height="${H}" rx="32"/></clipPath>
  </defs>`;
  const base=`<rect width="${W}" height="${H}" rx="32" fill="url(#g${u})"/><rect width="${W}" height="${H}" rx="32" fill="url(#r${u})"/>`;
  // Big "C" from the AfterWorc mark, bleeding off the right edge
  const arc=`<path d="M 900 120 A 250 250 0 1 0 900 440" fill="none" stroke="${P.arc}" stroke-opacity="${P.arcO}" stroke-width="92" stroke-linecap="round"/>`;
  const logo=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">
      <circle cx="22" cy="22" r="22" fill="${v==='virtual'?'#065132':'#2f9e4a'}"/>
      <path d="M31 14.5A11 11 0 1 0 31 29.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <text x="56" y="32" font-family="'Instrument Sans','Inter',system-ui,sans-serif" font-size="30" font-weight="600" letter-spacing="-.6" fill="${P.ink}">afterwor<tspan fill="${v==='virtual'?'#2f9e4a':'#85d6ae'}">c</tspan></text>
    </g>`;
  // Mastercard mark: the same artwork afterworc.com shows under "Cards accepted".
  // For print, use the issuer-supplied brand-kit file (sizes and clear space per Mastercard standards).
  const MC='<rect x="60.4" y="25.7" width="31.5" height="56.6" fill="#FF5F00"/><path fill="#EB001B" d="M62.4,54c0-11,5.1-21.5,13.7-28.3c-15.6-12.3-38.3-9.6-50.6,6.1C13.3,47.4,16,70,31.7,82.3c13.1,10.3,31.4,10.3,44.5,0C67.5,75.5,62.4,65,62.4,54z"/><path fill="#F79E1B" d="M134.4,54c0,19.9-16.1,36-36,36c-8.1,0-15.9-2.7-22.2-7.7c15.6-12.3,18.3-34.9,6-50.6c-1.8-2.2-3.8-4.3-6-6c15.6-12.3,38.3-9.6,50.5,6.1C131.7,38.1,134.4,45.9,134.4,54z"/>';
  const scheme=(x,y,w=150)=>`<g transform="translate(${x} ${y}) scale(${(w/152.4).toFixed(4)})" role="img" aria-label="Mastercard">${MC}</g>`;
  const frozen=o.frozen?`<g><rect width="${W}" height="${H}" rx="32" fill="#9fb4c4" fill-opacity=".55"/><g transform="translate(428 270)"><circle r="64" fill="#fff" fill-opacity=".92"/><path d="M0-40V40M-35-20 35 20M-35 20 35-20M-10-32 0-22 10-32M-10 32 0 22 10 32" stroke="#2c5d86" stroke-width="7" stroke-linecap="round" fill="none"/></g><text x="428" y="378" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="26" font-weight="700" fill="#10324f">Frozen</text></g>`:'';
  const mono="'IBM Plex Mono','SFMono-Regular',Menlo,monospace";
  if(o.side==='back'){
    const pan=o.pan||`•••• •••• •••• ${o.last4}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="AfterWorc ${E(P.tag)} card, back">${defs}<g clip-path="url(#k${u})">${base}
      ${v==='virtual'?'':`<rect y="54" width="${W}" height="92" fill="#0b0f0d"/>`}
      <g transform="translate(56 ${v==='virtual'?84:188})">
        <text font-family="Inter,system-ui,sans-serif" font-size="15" letter-spacing="1.5" fill="${P.sub}">CARD NUMBER</text>
        <text y="44" font-family="${mono}" font-size="38" letter-spacing="2" fill="${P.ink}">${E(pan)}</text>
        <text y="100" font-family="Inter,system-ui,sans-serif" font-size="15" letter-spacing="1.5" fill="${P.sub}">VALID THRU</text>
        <text y="136" font-family="${mono}" font-size="30" fill="${P.ink}">${E(o.exp)}</text>
        <text x="230" y="100" font-family="Inter,system-ui,sans-serif" font-size="15" letter-spacing="1.5" fill="${P.sub}">CVC</text>
        <text x="230" y="136" font-family="${mono}" font-size="30" fill="${P.ink}">${E(o.cvc||'•••')}</text>
        ${v==='virtual'?'':`<rect x="400" y="84" width="340" height="62" rx="8" fill="#f4f1e8"/><text x="416" y="122" font-family="${mono}" font-size="15" fill="#6b6b6b">authorised signature</text>`}
      </g>
      ${['Issued by [issuing partner] pursuant to licence by','Mastercard International. Property of the issuer.','Lost or stolen? Freeze it in the AfterWorc app.','afterworc.com/card · [support phone]'].map((t,i)=>`<text x="56" y="${H-128+i*24}" font-family="Inter,system-ui,sans-serif" font-size="15" fill="${P.sub}">${t}</text>`).join('')}
      ${scheme(W-64-124,H-56-88,124)}
      ${frozen}</g></svg>`;
  }
  const chip=v==='virtual'?'':`<g transform="translate(64 196)"><rect width="104" height="80" rx="14" fill="url(#ch${u})"/><path d="M0 27H34M0 53H34M70 27H104M70 53H104M34 0V80M70 0V80M34 40H70" stroke="#8a6a26" stroke-opacity=".55" stroke-width="2.5" fill="none"/></g>`;
  const contactless=`<g transform="translate(${v==='virtual'?64:196} 212)" fill="none" stroke="${P.ink}" stroke-opacity=".85" stroke-width="5" stroke-linecap="round"><path d="M4 14a26 26 0 0 1 0 22"/><path d="M16 6a40 40 0 0 1 0 38"/><path d="M28-2a54 54 0 0 1 0 54"/></g>`;
  const holder=o.name?`<text x="64" y="${o.org?H-110:H-80}" font-family="${mono}" font-size="30" letter-spacing="2.5" fill="${P.ink}">${E(o.name.toUpperCase())}</text>`:'';
  const org=o.org?`<text x="64" y="${H-72}" font-family="Inter,system-ui,sans-serif" font-size="22" font-weight="600" letter-spacing=".5" fill="${P.sub}">${E(o.org)}</text>`:'';
  const last=`<text x="64" y="${v==='virtual'?330:340}" font-family="${mono}" font-size="26" letter-spacing="3" fill="${P.sub}">•••• ${E(o.last4)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="AfterWorc ${E(P.tag)} card ending ${E(o.last4)}">${defs}<g clip-path="url(#k${u})">${base}${arc}
    ${logo(64,56,1.25)}
    <text x="${W-64}" y="92" text-anchor="end" font-family="Inter,system-ui,sans-serif" font-size="24" font-weight="600" letter-spacing="1" fill="${P.sub}">${E(P.tag)}</text>
    ${chip}${contactless}${last}${holder}${org}
    ${scheme(W-64-156,H-48-111,156)}
    ${frozen}</g></svg>`;
}
