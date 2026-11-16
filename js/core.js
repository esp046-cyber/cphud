export const VERSION='1.0.0';
const K='cphud_v1';
export const bus=new EventTarget();
export const emit=(n,d)=>bus.dispatchEvent(new CustomEvent(n,{detail:d}));
export const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{return null}};
const clone=o=>JSON.parse(JSON.stringify(o));
export const DEF={theme:'dark',accent:'#00e5ff',font:15,opacity:.85,border:'glow',clock:'24s',refresh:5,def:'home',
 home:['clock','gps','weather','battery','network','device'],
 gps:{high:true,timeout:15000},cam:{facing:'environment'},notif:{lowBat:true,offline:true,gps:true},
 manual:'',notes:'',smsNote:'',phone:'',emerg:{},fb:[{n:'Facebook',u:'https://www.facebook.com'},{n:'Messenger',u:'https://m.me'}],
 screens:{layout:'4',cols:2,rows:2,rx:50,ry:50,slots:['clock','gps','battery','camera'],presets:{}},lastGood:null};
function merge(d,s){
 if(d===null)return s&&typeof s==='object'?s:null;
 if(Array.isArray(d))return Array.isArray(s)?s:clone(d);
 if(typeof d==='object'){
  if(!Object.keys(d).length)return s&&typeof s==='object'&&!Array.isArray(s)?s:{};
  const o={};for(const k in d)o[k]=merge(d[k],s&&typeof s==='object'?s[k]:undefined);return o}
 return typeof s===typeof d&&!(typeof s==='number'&&!isFinite(s))?s:d}
export const S={};
export const state={corrupted:false};
export function setS(o){for(const k in S)delete S[k];Object.assign(S,merge(DEF,o))}
try{const raw=ls(K);setS(raw?JSON.parse(raw):{})}catch{state.corrupted=true;ls('cphud_corrupt',ls(K));setS({})}
let st;export const save=()=>{clearTimeout(st);st=setTimeout(()=>ls(K,JSON.stringify(S)),150)};
addEventListener('pagehide',()=>ls(K,JSON.stringify(S)));
export const errs=[],alerts=[];
const pe=m=>{errs.unshift({t:Date.now(),m:String(m)});errs.length=Math.min(errs.length,30);emit('err')};
export const logErr=pe;
addEventListener('error',e=>pe(e.message));addEventListener('unhandledrejection',e=>pe('Promise: '+(e.reason?.message||e.reason)));
export function warn(m){alerts.unshift({t:Date.now(),m});alerts.length=Math.min(alerts.length,20);emit('alert',m)}
const lg=ls('cphud_lastgeo');
export const geo={pos:null,err:null,watch:null,last:lg?(()=>{try{return JSON.parse(lg)}catch{return null}})():null};
const sup=()=>'geolocation' in navigator;
const opts=()=>({enableHighAccuracy:!!S.gps.high,timeout:S.gps.timeout,maximumAge:0});
const onPos=p=>{const c=p.coords;geo.err=null;geo.pos={lat:c.latitude,lon:c.longitude,acc:c.accuracy,alt:c.altitude,spd:c.speed,hdg:c.heading,ts:p.timestamp};geo.last=geo.pos;ls('cphud_lastgeo',JSON.stringify(geo.pos));emit('geo')};
const onErr=e=>{geo.err={code:e.code,msg:e.message};if(S.notif.gps&&e.code===1)warn('Location permission denied');emit('geo')};
export function geoOnce(){if(!sup()){geo.err={code:0,msg:'Geolocation not supported'};emit('geo');return}navigator.geolocation.getCurrentPosition(onPos,onErr,opts())}
export function geoStart(){if(!sup())return geoOnce();if(geo.watch!=null)return;geo.watch=navigator.geolocation.watchPosition(onPos,onErr,opts());emit('geo')}
export function geoStop(){if(geo.watch!=null){navigator.geolocation.clearWatch(geo.watch);geo.watch=null;emit('geo')}}
export const bat={sup:undefined};
export function initBattery(){if(!navigator.getBattery){bat.sup=false;return}
 navigator.getBattery().then(b=>{bat.sup=true;const u=()=>{bat.lvl=Math.round(b.level*100);bat.chg=b.charging;bat.ct=b.chargingTime;bat.dt=b.dischargingTime;emit('bat');
  if(S.notif.lowBat&&bat.lvl<=20&&!bat.chg&&!bat.w){bat.w=1;warn('Low battery: '+bat.lvl+'%')}if(bat.chg||bat.lvl>25)bat.w=0};
  ['levelchange','chargingchange'].forEach(e=>b.addEventListener(e,u));u()}).catch(()=>{bat.sup=false;emit('bat')})}
export const net={last:+ls('cphud_lastok')||0,ms:null,busy:false,err:null};
export async function testNet(){if(net.busy)return;net.busy=true;net.err=null;emit('net');const t0=performance.now(),ac=new AbortController(),to=setTimeout(()=>ac.abort(),6000);
 try{await fetch('https://www.gstatic.com/generate_204?'+Date.now(),{mode:'no-cors',cache:'no-store',signal:ac.signal});net.ms=Math.round(performance.now()-t0);net.last=Date.now();ls('cphud_lastok',net.last)}
 catch(e){net.ms=null;net.err=e.name==='AbortError'?'Timed out (6 s) - slow or no internet':'No internet reachable'}
 finally{clearTimeout(to);net.busy=false;emit('net')}}
addEventListener('online',()=>{emit('net');testNet()});
addEventListener('offline',()=>{if(S.notif.offline)warn('Network disconnected');emit('net')});
export const wxCache=()=>{try{return JSON.parse(ls('cphud_wx')||'null')}catch{return null}};
export async function getWeather(){const p=geo.pos||geo.last;if(!p)throw new Error('No location yet - start GPS first');
 const ac=new AbortController(),to=setTimeout(()=>ac.abort(),8000);
 try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,{signal:ac.signal});
  if(!r.ok)throw new Error('Weather service error '+r.status);const j=await r.json(),c=j.current;if(!c)throw new Error('Weather response incomplete');
  const w={t:c.temperature_2m,h:c.relative_humidity_2m,w:c.wind_speed_10m,code:c.weather_code,ts:Date.now()};ls('cphud_wx',JSON.stringify(w));return w}
 catch(e){throw new Error(e.name==='AbortError'?'Weather request timed out':e.message)}finally{clearTimeout(to)}}
let _d;const db=()=>_d||(_d=new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('IndexedDB unavailable'));const r=indexedDB.open('cphud',1);r.onupgradeneeded=()=>r.result.createObjectStore('imgs',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const tx=async(m,f)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('imgs',m),rq=f(t.objectStore('imgs'));t.oncomplete=()=>res(rq.result);t.onerror=()=>rej(t.error)})};
export const imgAll=()=>tx('readonly',s=>s.getAll());
export const imgPut=o=>tx('readwrite',s=>s.put(o));
export const imgDel=id=>tx('readwrite',s=>s.delete(id));
export const imgClear=()=>tx('readwrite',s=>s.clear());
