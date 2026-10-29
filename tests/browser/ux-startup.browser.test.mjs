import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
async function fixture(t,holdLoad=false){
 const context=await browser.newContext();let release=()=>{};t.after(async()=>{release();await context.close();});
 await context.addInitScript(()=>{
  const set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);
  const state=window.__uxState={idle:[],deadline:null,constructed:0,verified:0,signedOut:0};
  window.requestIdleCallback=fn=>{state.idle.push(fn);return 8000+state.idle.length;};window.cancelIdleCallback=()=>{};
  window.setTimeout=(fn,ms,...args)=>ms===4500?(state.deadline=fn,9000):set(fn,ms,...args);window.clearTimeout=id=>id===9000?undefined:clear(id);
  window.__uxClientMock={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic'},access_token:'synthetic-token'}}}),getUser:async()=>{state.verified++;return{data:{user:{id:'synthetic'}}};},signOut:async()=>{state.signedOut++;}}};
 });
 const remote=[];await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='esm.sh'){remote.push(u.pathname);return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:'export function createClient(){window.__uxState.constructed++;return window.__uxClientMock;}'});}
  if(u.origin!=='https://ux-startup.test')return route.abort();
  if(u.pathname==='/held.png'){await new Promise(resolve=>{release=resolve;});return route.fulfill({status:404,body:''});}
  if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://synthetic.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic-public";'});
  if(['/ux.js','/account-signout.mjs'].includes(u.pathname))return route.fulfill({contentType:'text/javascript',body:await readFile('web'+u.pathname,'utf8')});
  if(u.pathname==='/teacher.html')return route.fulfill({contentType:'text/html',body:'<main><h1>Փորձնական էջ</h1></main>'+(holdLoad?'<img src="/held.png" alt="">':'')+'<script type="module" src="/ux.js"></script>'});
  return route.fulfill({status:404,body:''});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://ux-startup.test/teacher.html',{waitUntil:holdLoad?'domcontentloaded':'load'});
 return{page,remote,errors,release:()=>release()};
}
test('shared UX does not fetch a second SDK at startup and reuses a client initialized before deferred health',async t=>{
 const {page,remote,errors}=await fixture(t);assert.deepEqual(remote,[]);
 assert.equal(await page.evaluate(()=>window.__uxState.verified),0);
 await page.evaluate(()=>{window.__haieduSupabaseClient=window.__uxClientMock;window.__uxState.idle[0]();window.__uxState.deadline();dispatchEvent(new Event('load'));});
 await expect.poll(()=>page.evaluate(()=>window.__uxState.verified)).toBe(1);
 const state=await page.evaluate(()=>({constructed:window.__uxState.constructed,signedOut:window.__uxState.signedOut}));assert.deepEqual(state,{constructed:0,signedOut:0});assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
});
test('bounded health fallback loads one SDK when no page client exists, even if resources never finish',async t=>{
 const {page,remote,errors,release}=await fixture(t,true);assert.deepEqual(remote,[]);assert.equal(await page.evaluate(()=>window.__uxState.idle.length),0);
 await page.evaluate(()=>{window.__uxState.deadline();window.__uxState.deadline();});await expect.poll(()=>page.evaluate(()=>window.__uxState.verified)).toBe(1);
 release();await page.waitForLoadState('load');assert.equal(await page.evaluate(()=>window.__uxState.verified),1);assert.equal(await page.evaluate(()=>window.__uxState.constructed),1);assert.equal(remote.length,1);assert.deepEqual(errors,[]);
});
