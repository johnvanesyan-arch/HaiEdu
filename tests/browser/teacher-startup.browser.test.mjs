import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const a='71000000-0000-4000-8000-000000000020',b='71000000-0000-4000-8000-000000000021';
const projection=actor=>({teacher:{id:actor,displayName:actor===a?'Initial teacher':'Current teacher'},progressive:true,institutionalTeacher:true,institutionalOptions:[],classes:[],totals:{students:null,studentsNeedingSupport:null},directory:{archive:false,offset:0,matching:0,hasMore:false,activeCount:0,archiveCount:0},workspace:{version:'teacher-workspace-v1',snapshotAt:new Date().toISOString(),pendingCount:0,queue:[],cards:[],classCount:0,coverage:'active_writable_school_contexts'}});
async function fixture(t,{role='teacher',profileStatus=200,holdDashboard=false}={}){
 const config=await readFile('web/config.js','utf8'),url=config.match(/SUPABASE_URL = "([^"]+)"/)[1],hostname=new URL(url).hostname,storageKey='sb-'+hostname.split('.')[0]+'-auth-token';
 const context=await browser.newContext();let releaseSDK,releaseDashboard;const sdkGate=new Promise(resolve=>releaseSDK=resolve),dashboardGate=new Promise(resolve=>releaseDashboard=resolve);t.after(async()=>{releaseSDK();releaseDashboard();await context.close();});
 const sessionA={user:{id:a,email:'synthetic-a@example.invalid'},access_token:'synthetic-a',expires_at:Math.floor(Date.now()/1000)+3600},sessionB={user:{id:b,email:'synthetic-b@example.invalid'},access_token:'synthetic-b',expires_at:Math.floor(Date.now()/1000)+3600};
 await context.addInitScript(({sessionA,sessionB,storageKey,role,responses})=>{
  const s=window.__startupFixture={session:sessionA,sessionB,storageKey,profileReads:0,functionCalls:[],listeners:[],responses};localStorage.setItem(storageKey,JSON.stringify(sessionA));
  window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:s.session}}),getUser:async()=>({data:{user:s.session.user}}),onAuthStateChange(fn){s.listeners.push(fn);return{data:{subscription:{unsubscribe(){}}}};}},from(){return{select(){return this;},eq(){return this;},maybeSingle:async()=>{s.profileReads++;return{data:{role,account_status:'active'}};}};},functions:{async invoke(fn,{body}){s.functionCalls.push({fn,body,actor:s.session.user.id});if(fn==='get-teacher-dashboard')return{data:s.responses[s.session.user.id]};throw Error('Unexpected fixture endpoint '+fn);}}};
 },{sessionA,sessionB,storageKey,role,responses:{[a]:projection(a),[b]:projection(b)}});
 const calls=[];await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname===hostname){
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
   calls.push({path:u.pathname,body:route.request().postDataJSON(),token:route.request().headers().authorization});
   if(u.pathname==='/rest/v1/profiles')return route.fulfill({status:profileStatus,contentType:'application/json',headers,body:JSON.stringify([{role,account_status:'active'}])});
   if(u.pathname==='/functions/v1/get-teacher-dashboard'){if(holdDashboard)await dashboardGate;return route.fulfill({contentType:'application/json',headers,body:JSON.stringify(projection(a))}).catch(()=>{});}
   throw Error('Unexpected cross-origin fixture request '+u.pathname);
  }
  if(u.origin!=='https://startup.test')return route.abort();
  if(u.pathname==='/teacher-dependencies.bundle.mjs')await sdkGate;
  if(u.pathname.endsWith('.html')&&u.pathname!=='/teacher.html')return route.fulfill({contentType:'text/html',body:'<main>Role destination</main>'});
  try{const bytes=await readFile('web'+u.pathname);return route.fulfill({body:bytes,contentType:u.pathname.endsWith('.html')?'text/html':/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://startup.test/teacher.html?view=home',{waitUntil:'commit'});
 return{page,calls,errors,releaseSDK,releaseDashboard};
}
const ready=async page=>{await expect(page.locator('#dashboardPanel')).toBeVisible();await expect(page.locator('[data-today-time]')).toContainText('Ստուգված է');await expect(page.locator('[data-today-refresh]')).toBeEnabled();};
test('initial authorized reads complete while the SDK is held, then the real teacher screen consumes them once',async t=>{
 const f=await fixture(t);await expect.poll(()=>f.calls.length).toBe(2);assert.equal(await f.page.evaluate(()=>window.__startupFixture.profileReads),0);await expect(f.page.locator('#dashboardPanel')).toBeHidden();
 assert.deepEqual(f.calls.map(c=>c.path),['/rest/v1/profiles','/functions/v1/get-teacher-dashboard']);assert.deepEqual(f.calls[1].body,{readMode:'directory',archive:false,workspace:{recent:[]}});
 f.releaseSDK();await ready(f.page);const state=await f.page.evaluate(()=>({profileReads:window.__startupFixture.profileReads,calls:window.__startupFixture.functionCalls.length}));assert.deepEqual(state,{profileReads:0,calls:0});
 await f.page.addScriptTag({type:'module',url:'/teacher-startup.bundle.mjs?reinitialize=1'});assert.equal(f.calls.length,2);assert.deepEqual(f.errors,[]);
});
test('an account switched before SDK initialization discards and aborts the old pending Home',async t=>{
 const f=await fixture(t,{holdDashboard:true});await expect.poll(()=>f.calls.length).toBe(2);
 await f.page.evaluate(()=>{const s=window.__startupFixture;s.session=s.sessionB;localStorage.setItem(s.storageKey,JSON.stringify(s.session));});f.releaseSDK();await ready(f.page);await expect(f.page.locator('#teacherName')).toHaveText('Current teacher');
 f.releaseDashboard();await expect(f.page.locator('#teacherName')).toHaveText('Current teacher');const state=await f.page.evaluate(()=>({profileReads:window.__startupFixture.profileReads,calls:window.__startupFixture.functionCalls}));assert.equal(state.profileReads,1);assert.equal(state.calls.length,1);assert.equal(state.calls[0].actor,b);assert.deepEqual(f.errors,[]);
});
test('the early role gate routes a content administrator without requesting teacher data',async t=>{
 const f=await fixture(t,{role:'content_admin'});await expect.poll(()=>f.calls.length).toBe(1);f.releaseSDK();await f.page.waitForURL('**/content.html');assert.equal(f.calls.length,1);assert.deepEqual(f.errors,[]);
});
test('an unavailable early profile falls back to the ordinary SDK reads and reaches a complete Home',async t=>{
 const f=await fixture(t,{profileStatus:503});await expect.poll(()=>f.calls.length).toBe(1);f.releaseSDK();await ready(f.page);const state=await f.page.evaluate(()=>({profileReads:window.__startupFixture.profileReads,calls:window.__startupFixture.functionCalls.length}));assert.deepEqual(state,{profileReads:1,calls:1});assert.deepEqual(f.errors,[]);
});
