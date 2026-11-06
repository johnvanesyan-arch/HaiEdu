// Shared-core access reads: one client/session generation, pending work only.
// No completed-result cache and no persisted tokens, roles or permissions.
const stores=new WeakMap();
const identity=session=>JSON.stringify([session?.user?.id??null,session?.access_token??null]);
export function learnerAccess(client,events=globalThis.window){
 if(stores.has(client))return stores.get(client);
 let generation=0,key,session=null,pending=null;
 const listeners=new Set();
 const invalidate=(reason='access')=>{
  generation++;pending=null;
  for(const listener of listeners)listener({reason,session,generation});
 };
 const observe=(next,event)=>{
  const nextKey=identity(next),first=key===undefined;
  session=next;const changed=!first&&key!==nextKey;key=nextKey;
  if(changed||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')invalidate(event||'session');
 };
 const stale=()=>({data:null,error:new Error('stale_access'),stale:true});
 const read=()=>{
  if(key!==undefined&&!session)return Promise.resolve({data:{contexts:[],classes:[],accessStatus:"signed_out"},error:null});
  if(pending)return pending;
  const epoch=generation;
  const request=(async()=>{
   try{
    const {data,error}=await client.auth.getSession();
    if(epoch!==generation)return stale();
    if(error)return {data:null,error};
    // An auth event is newer authority than a contradictory SDK snapshot.
    // Never adopt an old actor/token after a switch or sign-out.
    if(key!==undefined&&key!==identity(data?.session??null))return stale();
    observe(data?.session??null);
    if(epoch!==generation)return stale();
    if(!session)return {data:{contexts:[],classes:[],accessStatus:'signed_out'},error:null};
    const result=await client.functions.invoke('get-student-classes',{body:{}});
    return epoch===generation?result:stale();
   }catch(error){return epoch===generation?{data:null,error}:stale();}
  })().finally(()=>{if(pending===request)pending=null;});
  pending=request;return request;
 };
 const store={read,invalidate,matchesSession(next){return key===undefined||key===identity(next);},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},get generation(){return generation;}};
 stores.set(client,store);
 client.auth.onAuthStateChange((event,next)=>observe(next,event));
 events?.addEventListener('haiedu-refresh-courses',()=>invalidate('access'));
 events?.addEventListener('pageshow',event=>{if(event.persisted)invalidate('restore');});
 events?.addEventListener('pagehide',()=>invalidate('pagehide'));
 return store;
}
export function publishLearnerAccess(data={contexts:[]}){
 window.HaiEduCourseAccess=data;
 window.dispatchEvent(new CustomEvent('haiedu-course-access',{detail:data}));
}
