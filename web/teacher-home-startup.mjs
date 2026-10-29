import {todayRequest} from './teacher-home-request.mjs';

// A single, navigation-local read can overlap the SDK download. The stored
// token is only an input to the existing RLS/API gates, never proof of access.
export function createTeacherHomeStartup({url,key,storage,tabStorage,location,fetchImpl=globalThis.fetch,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,onCancel=()=>{}}){
 const route=location.pathname+location.search,q=new URLSearchParams(location.search);
 if(!/^\/(?:teacher|teacher\.html)$/.test(location.pathname)||q.has('class')||(q.has('view')&&q.get('view')!=='home'))return null;
 const storageKey='sb-'+new URL(url).hostname.split('.')[0]+'-auth-token';
 const read=()=>{try{return JSON.parse(storage.getItem(storageKey)||'null');}catch{return null;}};
 const session=read(),actor=session?.user?.id,token=session?.access_token;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor??'')||typeof token!=='string'||!token||!Number.isFinite(session.expires_at)||session.expires_at*1000<=now()+90000)return null;
 const controller=new AbortController(),started=now(),body={readMode:'directory',archive:false,workspace:todayRequest(actor,location.search,tabStorage)};
 let claimed=false,dead=false;
 const current=()=>{const s=read();return !dead&&now()-started<8000&&location.pathname+location.search===route&&s?.user?.id===actor&&s?.access_token===token;};
 const cancel=()=>{if(dead)return;dead=true;clearTimer(timer);controller.abort();onCancel();};
 const timer=setTimer(cancel,8000);
 const headers={apikey:key,Authorization:'Bearer '+token};
 const profile=Promise.resolve().then(async()=>{
  if(!current())return null;
  const endpoint=new URL(url.replace(/\/$/,'')+'/rest/v1/profiles');endpoint.searchParams.set('select','role,account_status');endpoint.searchParams.set('id','eq.'+actor);
  const response=await fetchImpl(endpoint,{headers,signal:controller.signal,cache:'no-store'});
  if(!response.ok)return null;const rows=await response.json();
  return current()&&Array.isArray(rows)&&rows.length===1?{data:rows[0],error:null}:null;
 }).catch(()=>null);
 const dashboard=profile.then(async result=>{
  // The browser role check still precedes every teacher-data request.
  if(!current()||result?.data?.role!=='teacher'||result.data.account_status!=='active')return null;
  const response=await fetchImpl(new URL(url.replace(/\/$/,'')+'/functions/v1/get-teacher-dashboard'),{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
  if(!response.ok)return null;const data=await response.json();
  return current()&&data?.teacher?.id===actor?{data,error:null}:null;
 }).catch(()=>null);
 return Object.freeze({cancel,claim(liveSession){
  if(claimed)return null;claimed=true;
  if(!current()||liveSession?.user?.id!==actor||liveSession?.access_token!==token){cancel();return null;}
  return {profile:profile.then(value=>current()?value:null),async dashboard(request){
   if(!current()||JSON.stringify(request)!==JSON.stringify(body)){cancel();return null;}
   const result=await dashboard;const usable=current()?result:null;cancel();return usable;
  }};
 }});
}
