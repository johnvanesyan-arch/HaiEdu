import {readFile} from 'node:fs/promises';
import {installStudentHomeFixture} from './student-home-fixture.mjs';
export const learnerOrigin='https://request-count.test';
export const id=n=>`76000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
// Real pages/modules, synthetic identities and services. Timing exposes overlapping
// reads; it is not a production latency benchmark and never sends learner writes.
export async function learnerFixture(browser,t,{route='index.html',action='',...options}={}) {
 const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage(),errors=[];
 page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(`window.__client=(${installStudentHomeFixture.toString()})(${JSON.stringify(options)});`);
 await page.addInitScript(()=>{
  const invoke=window.__client.functions.invoke;
  const state=window.__requestCounts={calls:[],active:0,wave:0,holds:[],pending:[],joined:false,release(name){this.holds=this.holds.filter(x=>x!==name);for(const p of this.pending.filter(x=>x.name===name))p.resolve();this.pending=this.pending.filter(x=>x.name!==name);}};
  window.__client.functions.invoke=async(name,args)=>{
   if(!state.active++)state.wave++;
   const call={name,body:args.body,wave:state.wave};state.calls.push(call);
   try{
    const result=await(async()=>{
    await new Promise(resolve=>setTimeout(resolve,60));
    if(name==='start-learning-session')return {data:{session:{id:'synthetic-player',mode:args.body.mode}}};
    if(name==='get-mastery-check-status')return {data:{assessmentPolicy:{plannedQuestionCount:8,hintsAllowed:true}}};
    if(name==='get-session-item')return {data:{complete:false,session:{id:'synthetic-player',mode:'practice',position:1,total:8},sessionItemId:'synthetic-item',item:{id:'synthetic-question',type:'true_false',promptHy:'Ընտրեք պատասխանը։'},remediation:{available:false}}};
    if(name==='join-class'){state.joined=true;return {data:{joined:true,class:{id:'synthetic-class',name:'Փորձնական դասարան'}}};}
    const result=await invoke(name,args);
    if(name==='get-student-classes'&&result.data)result.data.classes=state.joined?[{id:'synthetic-class',name:'Փորձնական դասարան'}]:[];
    return result;
    })();
    if(state.holds.includes(name))await new Promise(resolve=>state.pending.push({name,resolve}));
    return result;
   }finally{state.active--;call.done=true;}
  };
 });
 await context.route('**/*',async r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/supabase-browser.bundle.mjs')return r.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(u.pathname==='/config.js')return r.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic";'});
  if(u.origin!==learnerOrigin)return r.abort();
  if(u.pathname==='/legacy-class.html')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><style>.hidden{display:none}</style><body><div id=dashboardContent></div><script type=module src=/home-class.js></script><script type=module src=/course-gate.js></script></body></html>'});
  try{return r.fulfill({body:await readFile(new URL('../../web'+u.pathname,import.meta.url)),contentType:u.pathname.endsWith('.html')?'text/html':/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.fulfill({status:404,body:''});}
 });
 const query=new URLSearchParams({enrollment:id(6),release:id(7),unit:id(8),...(action?{action}:{})});
 await page.goto(learnerOrigin+'/'+route+'?'+query);
 return {page,errors};
}
