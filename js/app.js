import {S,save,bus,emit,ls,setS,DEF,VERSION,state,initBattery,errs,logErr,warn,geo,geoStart,geoStop,net,testNet,imgClear,wxCache} from './core.js';
import {P,$,esc} from './panels.js';
const view=$('#view'),clone=o=>JSON.parse(JSON.stringify(o));
const HOME_OK=Object.keys(P),SET=['device','battery','network','internet','permissions','storage','diag'];
/* ---- theme ---- */
function applyTheme(){const r=document.documentElement;r.dataset.theme=S.theme;r.dataset.bd=S.border;r.style.setProperty('--ac',S.accent);r.style.setProperty('--fs',S.font+'px');r.style.setProperty('--op',S.opacity);
 $('meta[name=theme-color]').content=S.theme==='light'?'#eef3f7':'#05080c'}
/* ---- panel manager ---- */
const live=new Set();
function mount(host,type,o={}){const d=P[type];const pn=document.createElement('section');pn.className='pn';pn.dataset.type=type;
 pn.innerHTML=`<header>${o.drag?'<span class="dh" title="Drag to move">⠿</span>':''}<h3>${d.t}</h3><span class="bt"><button data-x=r title="Refresh">↻</button><button data-x=m title="Minimize">–</button><button data-x=z title="Maximize">⤢</button><button data-x=g title="Settings">⚙</button>${o.close?'<button data-x=c title="Close">✕</button>':''}</span></header><div class="pb"></div>`;
 host.appendChild(pn);const body=$('.pb',pn),c={offs:[],on(e,f){bus.addEventListener(e,f);this.offs.push(()=>bus.removeEventListener(e,f))}};let r={};
 try{r=d.init(body,c)||{}}catch(e){logErr(e.message);body.innerHTML='<div class="msg er">Panel error: '+esc(e.message)+'. Tap ↻ or reset it from Configuration.</div>'}
 const rec={pn,r,c};live.add(rec);
 pn.addEventListener('click',e=>{const x=e.target.closest('[data-x]')?.dataset.x;if(!x)return;
  if(x==='r')try{(r.refresh||r.update)?.()}catch(er){logErr(er.message)}
  if(x==='m')pn.classList.toggle('min');if(x==='z')pn.classList.toggle('max');if(x==='g')go('config');if(x==='c')o.close?.()});
 try{r.update?.()}catch(e){logErr(e.message)}return rec}
function unmount(host){for(const rec of [...live])if(host.contains(rec.pn)){try{rec.r.destroy?.()}catch(e){logErr(e.message)}rec.c.offs.forEach(f=>f());live.delete(rec)}host.innerHTML=''}
setInterval(()=>{if(document.hidden)return;for(const rec of live)try{rec.r.update?.()}catch(e){logErr(e.message)}},1000);
/* ---- views ---- */
let cur='';const VIEWS={home,settings,config,screens};
function go(v){unmount(view);view.className='';cur=v;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));ls('cphud_view',v);try{VIEWS[v]()}catch(e){logErr(e.message);view.innerHTML='<div class="msg er">View error: '+esc(e.message)+'</div>'}view.scrollTop=0}
function home(){view.innerHTML=`<div class="short"><a class="btn" href="sms:">💬 Messages</a><a class="btn" href="https://www.facebook.com" target="_blank" rel="noopener">📘 Facebook</a><a class="btn" href="https://maps.apple.com/" target="_blank" rel="noopener">🗺 Maps</a><button data-g="screens">▦ Screens</button></div><div class="stack"></div><div class="add"></div>`;
 const st=$('.stack',view),ad=$('.add',view);S.home=S.home.filter((t,i)=>P[t]&&S.home.indexOf(t)===i);
 S.home.forEach(t=>mount(st,t,{close(){if(confirm('Remove this panel from Home?')){S.home=S.home.filter(x=>x!==t);save();go('home')}}}));
 const av=HOME_OK.filter(t=>!S.home.includes(t));ad.innerHTML=av.length?`<select><option value="">+ Add panel to Home…</option>${av.map(t=>`<option value="${t}">${P[t].t}</option>`).join('')}</select>`:'';
 const s=$('select',ad);if(s)s.onchange=()=>{if(s.value&&!S.home.includes(s.value)){S.home.push(s.value);save();go('home')}};
 view.querySelector('[data-g]').onclick=()=>go('screens')}
function settings(){view.innerHTML='<div class="stack"></div>';const st=$('.stack',view);SET.forEach(t=>mount(st,t))}
/* ---- screens ---- */
const LAY={'1':[1,1],'2h':[1,2],'2v':[2,1],'3':[2,2],'4':[2,2],'6':[2,3]};
const geom=sc=>{const [c,r]=LAY[sc.layout]||[Math.min(3,Math.max(1,sc.cols|0)),Math.min(3,Math.max(1,sc.rows|0))];return{cols:c,rows:r,three:sc.layout==='3',n:sc.layout==='3'?3:c*r}};
const ratio=(n,x)=>n===2?`minmax(0,${x}fr) minmax(0,${100-x}fr)`:`repeat(${n},minmax(0,1fr))`;
const cl=x=>Math.min(80,Math.max(20,+x||50));
let lgT;
function screens(){const sc=S.screens;view.className='fill';
 const L=[['1','1'],['2h','2 ☰'],['2v','2 ⫼'],['3','3'],['4','4'],['6','6'],['custom','Custom']];
 view.innerHTML=`<div class="tb"><div class="lay">${L.map(([k,t])=>`<button data-l="${k}">${t}</button>`).join('')}</div>
 <div class="tb2"><label>↔<input type="range" id="rx" min="20" max="80"></label><label>↕<input type="range" id="ry" min="20" max="80"></label><button id="eq">Equal</button><span id="cu"><select id="cc"><option>1</option><option>2</option><option>3</option></select>×<select id="cr"><option>1</option><option>2</option><option>3</option></select></span></div>
 <div class="tb2"><select id="pr"></select><button id="ps">Save preset</button><button id="pd">Delete</button><button id="rs">Reset</button></div></div><div id="grid"></div>`;
 const grid=$('#grid');
 const sync=()=>{view.querySelectorAll('[data-l]').forEach(b=>b.classList.toggle('on',b.dataset.l===sc.layout));$('#rx').value=sc.rx;$('#ry').value=sc.ry;const g=geom(sc);$('#rx').parentNode.style.display=g.cols===2?'':'none';$('#ry').parentNode.style.display=g.rows===2?'':'none';$('#cu').style.display=sc.layout==='custom'?'':'none';$('#cc').value=sc.cols;$('#cr').value=sc.rows;
  $('#pr').innerHTML='<option value="">Presets…</option>'+Object.keys(sc.presets).map(k=>`<option>${esc(k)}</option>`).join('')};
 view.onclick=e=>{const l=e.target.dataset.l;if(l){sc.layout=l;if(LAY[l]){sc.cols=LAY[l][0];sc.rows=LAY[l][1]}sync();renderGrid()}};
 $('#rx').oninput=e=>{sc.rx=cl(e.target.value);grid.style.gridTemplateColumns=ratio(geom(sc).cols,sc.rx)};$('#ry').oninput=e=>{sc.ry=cl(e.target.value);grid.style.gridTemplateRows=ratio(geom(sc).rows,sc.ry)};
 $('#rx').onchange=$('#ry').onchange=save;
 $('#eq').onclick=()=>{sc.rx=sc.ry=50;save();sync();renderGrid()};
 $('#cc').onchange=e=>{sc.cols=+e.target.value;renderGrid()};$('#cr').onchange=e=>{sc.rows=+e.target.value;renderGrid()};
 $('#ps').onclick=()=>{const n=(prompt('Preset name?')||'').trim().slice(0,24);if(!n)return;if(!sc.presets[n]&&Object.keys(sc.presets).length>=10)return warn('Preset limit (10) reached');sc.presets[n]={layout:sc.layout,cols:sc.cols,rows:sc.rows,rx:sc.rx,ry:sc.ry,slots:clone(sc.slots)};save();sync();warn('Preset saved')};
 $('#pr').onchange=e=>{const p=sc.presets[e.target.value];if(p){Object.assign(sc,clone(p));save();sync();renderGrid()}};
 $('#pd').onclick=()=>{const k=$('#pr').value;if(k&&confirm('Delete preset "'+k+'"?')){delete sc.presets[k];save();sync()}};
 $('#rs').onclick=()=>{if(confirm('Reset the whole Screens dashboard to the default 4-panel layout? Presets are kept.')){const p=sc.presets;Object.assign(sc,clone(DEF.screens),{presets:p});save();sync();renderGrid()}};
 /* drag to swap */
 grid.addEventListener('pointerdown',e=>{const h=e.target.closest('.dh');if(!h)return;const pn=h.closest('.pn'),cell=pn.closest('.cell'),from=+cell.dataset.i;let to=from;h.setPointerCapture(e.pointerId);pn.classList.add('drag');cell.classList.add('dragging');
  const mv=ev=>{pn.style.transform=`translate(${ev.clientX-e.clientX}px,${ev.clientY-e.clientY}px)`;const t=document.elementsFromPoint(ev.clientX,ev.clientY).find(x=>x.classList?.contains('cell')&&x!==cell);grid.querySelectorAll('.cell').forEach(c=>c.classList.toggle('tgt',c===t));to=t?+t.dataset.i:from};
  const up=ev=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);pn.classList.remove('drag');cell.classList.remove('dragging');pn.style.transform='';
   if(ev.type==='pointerup'&&to!==from){const s=sc.slots;[s[from],s[to]]=[s[to],s[from]];save();renderGrid()}else grid.querySelectorAll('.tgt').forEach(c=>c.classList.remove('tgt'))};
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);e.preventDefault()});
 sync();renderGrid()}
function renderGrid(){const grid=$('#grid');if(!grid)return;unmount(grid);const sc=S.screens,g=geom(sc);
 if(!Array.isArray(sc.slots))sc.slots=[];while(sc.slots.length<g.n)sc.slots.push(null);
 const seen=new Set();sc.slots=sc.slots.map(t=>{if(!t||!P[t]||seen.has(t))return null;seen.add(t);return t});
 grid.style.gridTemplateColumns=ratio(g.cols,cl(sc.rx));grid.style.gridTemplateRows=ratio(g.rows,cl(sc.ry));
 const used=new Set(sc.slots.slice(0,g.n));
 for(let i=0;i<g.n;i++){const cell=document.createElement('div');cell.className='cell';cell.dataset.i=i;if(g.three&&i===0)cell.style.gridColumn='1 / span 2';grid.appendChild(cell);const t=sc.slots[i];
  if(t)mount(cell,t,{drag:true,close(){if(confirm('Hide this panel? You can re-add it from any empty cell.')){sc.slots[i]=null;save();renderGrid()}}});
  else{const av=Object.keys(P).filter(k=>!used.has(k));cell.innerHTML=`<div class="empty"><span>Empty panel</span><select><option value="">+ Add panel…</option>${av.map(k=>`<option value="${k}">${P[k].t}</option>`).join('')}</select></div>`;
   $('select',cell).onchange=e=>{const v=e.target.value;if(v&&!sc.slots.slice(0,g.n).includes(v)){sc.slots[i]=v;save();renderGrid()}}}}
 save();clearTimeout(lgT);lgT=setTimeout(()=>{S.lastGood=clone({...sc,presets:{}});save()},5000)}
/* ---- configuration ---- */
const get=p=>p.split('.').reduce((o,k)=>o?.[k],S),set=(p,v)=>{const k=p.split('.');const l=k.pop();k.reduce((o,x)=>o[x],S)[l]=v};
const sel=(l,p,o)=>`<label class="f">${l}<select data-p="${p}">${o.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
const rng=(l,p,a,b,s)=>`<label class="f">${l}<input type="range" data-p="${p}" min="${a}" max="${b}" step="${s}"></label>`;
const chk=(l,p)=>`<label class="f row">${l}<input type="checkbox" data-p="${p}"></label>`;
function config(){view.innerHTML=`<div class="cfg">
<h4>Appearance</h4>${sel('Theme','theme',[['dark','Dark HUD'],['midnight','Midnight blue'],['amoled','AMOLED black'],['light','Light']])}
<label class="f">HUD color<input type="color" data-p="accent"></label>${rng('Font size','font',12,20,1)}${rng('Panel transparency','opacity',.3,1,.05)}
${sel('Panel borders','border',[['glow','Glow'],['solid','Solid'],['none','None']])}${sel('Clock style','clock',[['24s','24 h + seconds'],['24','24 h'],['12s','12 h + seconds'],['12','12 h']])}
<h4>Behaviour</h4>${sel('Default screen','def',[['home','Home'],['settings','Settings'],['screens','Screens']])}${sel('Auto-refresh (weather)','refresh',[['0','Manual only'],['1','Every 1 min'],['5','Every 5 min'],['15','Every 15 min'],['60','Every 60 min']])}
${chk('GPS high accuracy','gps.high')}${rng('GPS timeout (ms)','gps.timeout',5000,60000,5000)}${sel('Default camera','cam.facing',[['environment','Rear'],['user','Front']])}
${chk('Low-battery warning','notif.lowBat')}${chk('Disconnection warning','notif.offline')}${chk('GPS permission warning','notif.gps')}
<h4>Data</h4><div class="btns"><button id="ex">Export</button><label class="btn">Import<input type="file" id="im" accept="application/json" hidden></label><button id="bk">Backup</button><button id="rb">Restore backup</button></div>
<div class="btns"><button id="rd" class="dg">Restore defaults</button><button id="cd" class="dg">Clear images &amp; caches</button></div><div class="msg" id="cm"></div><small>v${VERSION}. Layout presets are managed in Screens.</small></div>`;
 view.querySelectorAll('[data-p]').forEach(el=>{const v=get(el.dataset.p);if(el.type==='checkbox')el.checked=!!v;else el.value=v;
  el.oninput=()=>{const t=el.type;let x=t==='checkbox'?el.checked:(t==='range'||el.dataset.p==='refresh')?+el.value:el.value;set(el.dataset.p,x);save();applyTheme()}});
 const m=t=>{$('#cm').textContent=t};
 $('#ex').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify({app:'cphud',v:VERSION,data:S},null,1)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='cphud-config.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};
 $('#im').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(j.app!=='cphud'||typeof j.data!=='object')throw new Error('Not a CP HUD file');if(!confirm('Replace current settings with the imported file?'))return;setS(j.data);save();applyTheme();go('config');}catch(x){m('Import failed: '+x.message)}};
 $('#bk').onclick=()=>{ls('cphud_backup',JSON.stringify(S));m('Backup stored on this device.')};
 $('#rb').onclick=()=>{const b=ls('cphud_backup');if(!b)return m('No backup found.');if(confirm('Restore the backup?'))try{setS(JSON.parse(b));save();applyTheme();go('config')}catch{m('Backup is corrupted.')}};
 $('#rd').onclick=()=>{if(confirm('Restore ALL settings, layouts and notes to defaults?')){setS({});save();applyTheme();go('config')}};
 $('#cd').onclick=async()=>{if(!confirm('Delete all saved photos and cached weather/location?'))return;try{await imgClear()}catch{}['cphud_wx','cphud_lastgeo','cphud_lastok'].forEach(k=>ls(k,null));emit('imgs');m('Cleared.')}}
/* ---- boot ---- */
const crashed=ls('cphud_boot')==='1';ls('cphud_boot','1');setTimeout(()=>ls('cphud_boot',null),5000);
if((crashed||state.corrupted)&&S.lastGood){S.screens=Object.assign(clone(S.lastGood),{presets:S.screens.presets});setTimeout(()=>warn('Recovered last working layout'),500)}
if(state.corrupted)setTimeout(()=>warn('Saved settings were corrupted and reset (copy kept)'),500);
applyTheme();initBattery();
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
const chip=$('#chip');const upChip=()=>{const o=navigator.onLine;chip.textContent=o?'● ONLINE':'● OFFLINE';chip.className=o?'ok':'er';const t=Math.max(net.last,wxCache()?.ts||0);$('#sync').textContent='sync '+(t?new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—')};
['net','alert'].forEach(e=>bus.addEventListener(e,upChip));setInterval(upChip,30000);upChip();
const toast=$('#toast');let tt;bus.addEventListener('alert',e=>{toast.textContent=e.detail;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>toast.classList.remove('show'),3500)});
let resume=false;document.addEventListener('visibilitychange',()=>{if(document.hidden){emit('hidden');if(geo.watch!=null){geoStop();resume=true}}else if(resume){resume=false;geoStart()}});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(cur==='screens')renderGrid()},250)});
testNet();
const sv=ls('cphud_view');go(VIEWS[sv]?sv:S.def);
/* ---- service worker ---- */
if('serviceWorker' in navigator){let want=false;const bn=$('#upd');
 const show=w=>{bn.hidden=false;$('button',bn).onclick=()=>{want=true;w.postMessage({type:'SKIP_WAITING'})}};
 navigator.serviceWorker.register('service-worker.js').then(reg=>{if(reg.waiting&&navigator.serviceWorker.controller)show(reg.waiting);reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)show(w)})})}).catch(e=>logErr('SW: '+e.message));
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(want)location.reload()})}
