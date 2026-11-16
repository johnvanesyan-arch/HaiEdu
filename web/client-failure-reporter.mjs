import {CLIENT_FAILURE_REPORTING_ENABLED} from './client-failure-config.mjs';
import {FAILURE_ROUTE,validateClientFailure} from './client-failure-contract.mjs';
import {failureOperation,failurePage,failureCategory} from './client-failure-catalog.mjs';

// Canonical assets and the standalone SDK bundle share this one registry.
const key = Symbol.for('haiedu.client-failure-reporters.v1');
const state = globalThis[key] ??= {clients:new WeakMap(), reporters:new Set(), listening:false};
const noObservation = Object.freeze({report(){},finish(){}});
function identity(session) {
  try {
    const payload = session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims = JSON.parse(atob(payload));
    if(typeof session.user?.id!=='string'||typeof claims.session_id!=='string'||!claims.session_id)return null;
    return session.user.id + ':' + claims.session_id;
  } catch { return null; }
}

export function createClientFailureReporter(client, {enabled=false, buildId='', page='other', send, now=Date.now, uuid=()=>crypto.randomUUID(), deadlineMs=1500}={}) {
  let alive=true, paused=false, session=null, sessionIdentity=null, epoch=0, authEvents=0, timer=null, running=false, controller=null;
  let budgetStart=now(), sent=0;
  const queue=[], recent=new Map();
  const clear=()=>{epoch++;queue.length=0;recent.clear();clearTimeout(timer);timer=null;controller?.abort();};
  const setSession=value=>{
    if(!alive)return;
    const next=identity(value);
    if(next!==sessionIdentity){clear();sessionIdentity=next;sent=0;budgetStart=now();}
    session=next?value:null;
  };
  const schedule=()=>{if(alive&&!running&&!timer&&queue.length)timer=setTimeout(()=>{timer=null;void drain();},0);};
  async function drain(){
    if(!alive||running)return;running=true;
    try {
      while(alive&&queue.length){
        const item=queue.shift();
        if(paused||!session||item.epoch!==epoch)continue;
        if(now()-budgetStart>=3600000){budgetStart=now();sent=0;}
        if(sent>=5){queue.length=0;break;}sent++;
        controller=new AbortController();const active=controller;
        let timeout;
        try {
          // No retries, no persistent outbox, and no SDK invocation recursion.
          const token=session.access_token;
          await Promise.race([Promise.resolve().then(()=>{if(alive&&!paused&&item.epoch===epoch&&!active.signal.aborted)return send(item.report,token,active.signal);}),
            new Promise(resolve=>{timeout=setTimeout(()=>{active.abort();resolve();},deadlineMs);})]);
        } catch { /* Reporting is deliberately fail-silent. */ }
        finally {clearTimeout(timeout);if(controller===active)controller=null;}
      }
    } finally {running=false;schedule();}
  }
  function begin(operation){
    if(!enabled||!alive||paused||!session)return noObservation;
    const at=now(), generation=epoch;
    return {report(category,status=0){
      try {
        if(!alive||paused||!session||generation!==epoch)return;
        const report={schemaVersion:1,buildId,page,operation,category,status,
          durationMs:Math.min(60000,Math.max(0,Math.round(now()-at))),eventId:uuid()};
        if(!validateClientFailure(report))return;
        const fingerprint=operation+':'+category+':'+status;
        const previous=recent.get(fingerprint);
        if(previous!==undefined&&now()-previous<60000)return;
        if(queue.length>=20)return;
        recent.set(fingerprint,now());
        if(recent.size>64)recent.delete(recent.keys().next().value);
        queue.push({report,epoch:generation});schedule();
      } catch { /* Do not change the operation being observed. */ }
    }};
  }
  let subscription;
  if(enabled){
    try {
      subscription=client.auth.onAuthStateChange((_event,value)=>{authEvents++;setSession(value);}).data.subscription;
      const version=authEvents;
      Promise.resolve(client.auth.getSession()).then(r=>{if(version===authEvents)setSession(r?.data?.session);}).catch(()=>{});
    } catch { /* Missing Auth means no reporting. */ }
  }
  const reporter={begin,active:()=>alive&&!paused&&Boolean(session),suspend(){paused=true;clear();},resume(){if(!alive)return;const version=++authEvents;Promise.resolve(client.auth.getSession()).then(r=>{if(alive&&version===authEvents){setSession(r?.data?.session);paused=false;}}).catch(()=>{});},dispose(){if(!alive)return;alive=false;clear();session=null;sessionIdentity=null;subscription?.unsubscribe();state.reporters.delete(reporter);state.clients.delete(client);},async settled(){while(running||timer||queue.length)await new Promise(r=>setTimeout(r,5));}};
  return reporter;
}

function installPageListeners(window){
  if(state.listening)return;state.listening=true;
  // Inspect provenance locally; never include a filename or stack in a report.
  const owned=source=>{try{const u=new URL(source,window.location.origin);return u.origin===window.location.origin&&!u.search&&!u.hash&&/^\/_assets\/[a-zA-Z0-9_-]+\.js$/.test(u.pathname);}catch{return false;}};
  const report=source=>{if(!owned(source))return;const active=[...state.reporters].filter(r=>r.active());if(active.length===1)active[0].begin('page_execution').report('application_exception');};
  window.addEventListener('error',event=>report(event.filename));
  window.addEventListener('unhandledrejection',event=>{
    try {
      const stack=Object.getOwnPropertyDescriptor(event.reason ?? {},'stack')?.value;
      if(typeof stack!=='string'||stack.length>16000)return;
      // First frame must belong to HaiEdu. An extension frame further up cannot
      // be attributed to an application frame later in a mixed stack.
      const first=stack.split('\n').slice(1).find(line=>line.trim());
      const source=first?.match(/(https?:\/\/[^\s()]+):\d+:\d+\)?$/)?.[1];
      if(source)report(source);
    }catch{}
  });
  window.addEventListener('pagehide',()=>{for(const reporter of state.reporters)reporter.suspend();});
  window.addEventListener('pageshow',event=>{if(event.persisted)for(const reporter of state.reporters)reporter.resume();});
}

export function installClientFailureReporter(client,url,apiKey,{enabled=CLIENT_FAILURE_REPORTING_ENABLED,window=globalThis.window,fetchImpl=globalThis.fetch}={}) {
  try {
    if(!enabled||!window||state.clients.has(client))return state.clients.get(client);
    const origin=new URL(url);
    if(origin.username||origin.password||!['http:','https:'].includes(origin.protocol))return;
    const buildId=window.document.querySelector('meta[name="haiedu-build"]')?.content;
    if(!/^[a-f0-9]{64}$/.test(buildId??''))return;
    const reporter=createClientFailureReporter(client,{enabled:true,buildId,page:failurePage(window.location.pathname),
      send:async(report,token,signal)=>{const response=await fetchImpl(new URL('/functions/v1/'+FAILURE_ROUTE,origin).href,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal,
        headers:{'content-type':'application/json',apikey:apiKey,authorization:'Bearer '+token},body:JSON.stringify(report)});await response.body?.cancel();}});
    state.clients.set(client,reporter);state.reporters.add(reporter);installPageListeners(window);return reporter;
  }catch{return undefined;}
}
export function beginClientFailure(client,operation){try{return state.clients.get(client)?.begin(operation)??noObservation;}catch{return noObservation;}}
export function beginServiceFailure(client,route,options){
  const operation=failureOperation(route,options),observation=beginClientFailure(client,operation);
  return {finish(result,thrown){try{if(options?.signal?.aborted||['answer_submit','writing_submit','feedback_publish'].includes(operation))return;const failure=failureCategory(result,thrown);if(operation&&failure)observation.report(failure.category,failure.status);}catch{}}};
}
export function reportPageFailure(operation,category){try{const active=[...state.reporters].filter(r=>r.active());if(active.length===1)active[0].begin(operation).report(category);}catch{}}
