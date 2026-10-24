// Tab-local navigation metadata only. Never authorizes an item or stores its content.
const prefix='haiedu:review-navigation:v1:';
const ttl=8*60*60*1000;
function storedValue(key){try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}}
export const bankFields=['gradeFilter','subjectFilter','programFilter','unitFilter','searchInput','skillFilter','reviewFilter','qaFilter'];
export function readNavigation(userId,source,token=new URLSearchParams(location.search).get('nav')){
 try{
  if(!userId||!token||!/^[a-zA-Z0-9-]{1,80}$/.test(token))return null;
  const value=storedValue(prefix+token);
  if(!value||value.userId!==userId||!['bank','review'].includes(value.source)||(source&&value.source!==source)||(!Number.isFinite(value.savedAt)||value.savedAt>Date.now()||Date.now()-value.savedAt>ttl)||!Array.isArray(value.ids)||!value.ids.every(id=>typeof id==='string')||!value.filters||typeof value.filters!=='object')return null;
  return {...value,token};
 }catch{return null;}
}
export function clearNavigation(userId){
 try{for(const key of Object.keys(sessionStorage)){if(!key.startsWith(prefix))continue;const value=storedValue(key);if(!value||!userId||value?.userId===userId||Date.now()-value?.savedAt>ttl)sessionStorage.removeItem(key);}}catch{/* Navigation storage is optional. */}
}
export function captureFields(ids){return Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.value??'']));}
export function saveNavigation(userId,source,ids,filters){
 if(!userId)return null;
 try{
  const keys=Object.keys(sessionStorage).filter(k=>k.startsWith(prefix));
  // Bound tab-local metadata; old links fall back safely if their context expires.
  if(keys.length>=20)keys.map(key=>({key,at:storedValue(key)?.savedAt??0})).sort((a,b)=>a.at-b.at).slice(0,keys.length-19).forEach(v=>sessionStorage.removeItem(v.key));
  const token=crypto.randomUUID();
  const value={userId,source,ids:[...new Set(ids)],filters,scrollY:window.scrollY,scrollX:document.querySelector('.table-wrap')?.scrollLeft??0,advanced:!!document.querySelector('.advanced-filter-box')?.open,savedAt:Date.now()};
  sessionStorage.setItem(prefix+token,JSON.stringify(value));
  const url=new URL(location.href);url.searchParams.set('nav',token);history.replaceState(history.state,'',url);
  return {...value,token};
 }catch{return null;}
}
export function itemHref(id,source,context){return `./content-item.html?id=${encodeURIComponent(id)}&from=${source}${context?`&nav=${encodeURIComponent(context.token)}`:''}`;}
export function returnHref(context){return `./content-${context.source==='bank'?'bank':'review'}.html?nav=${encodeURIComponent(context.token)}`;}
export function restoreFields(context,ids){
 if(!context)return;
 for(const id of ids){const control=document.getElementById(id),value=context.filters[id];if(!control||typeof value!=='string')continue;
  if(control.tagName==='SELECT'&&value&&![...control.options].some(o=>o.value===value)){const option=new Option('Նախկին ընտրությունն այլևս հասանելի չէ',value);control.add(option);}
  control.value=value;
 }
 const advanced=document.querySelector('.advanced-filter-box');if(advanced)advanced.open=!!context.advanced;
}
export function restorePosition(context,isCurrent){
 if(!context)return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!isCurrent())return;
  const table=document.querySelector('.table-wrap');if(table)table.scrollLeft=Number(context.scrollX)||0;
  window.scrollTo({top:Math.max(0,Number(context.scrollY)||0),behavior:'instant'});
 }));
}
