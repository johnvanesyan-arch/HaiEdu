import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {guardStagingBrowser} from '../../scripts/local-staging-browser-network.mjs';
const build='a'.repeat(64);
async function setup(t,{delay=0}={}){
 const reports=[];
 const server=createServer(async(req,res)=>{
  if(req.url==='/functions/v1/record-client-failure'){
   let body='';for await(const chunk of req)body+=chunk;reports.push(JSON.parse(body));
   if(delay){const timer=setTimeout(()=>res.writeHead(204).end(),delay);res.on('close',()=>clearTimeout(timer));}else res.writeHead(204).end();return;
  }
  if(req.url==='/_assets/owned.js'){res.setHeader('content-type','text/javascript');res.end('window.failOwned=()=>{throw new Error("answer-private-canary")}; window.rejectOwned=()=>Promise.reject(new Error("password-private-canary"));');return;}
  if(/^\/[a-z-]+\.mjs$/.test(req.url)){
   try{res.setHeader('content-type','text/javascript');res.end(await readFile(path.resolve('web',req.url.slice(1))));}catch{res.writeHead(404).end();}return;
  }
  res.setHeader('content-type','text/html');res.end(`<html><head><meta name="haiedu-build" content="${build}"></head><body><script src="/_assets/owned.js"></script></body></html>`);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});t.after(()=>browser.close());
 const context=await browser.newContext({serviceWorkers:'block'});const guard=await guardStagingBrowser(context,{frontendOrigin:origin,backendOrigin:origin});
 const page=await context.newPage();await page.goto(origin+'/index');
 await page.evaluate(async origin=>{
  const module=await import('/client-failure-reporter.mjs');const api=await import('/rate-budget-feedback.mjs');
  window.invoke=api.invokeRateAware;window.semantic=module.beginClientFailure;
  const token='e30.'+btoa(JSON.stringify({session_id:crypto.randomUUID()}))+'.signature';
  window.session={user:{id:'student-a'},access_token:token};window.calls=0;window.returned={data:null,error:{context:new Response('{}',{status:503})}};
  window.client={auth:{getSession:async()=>({data:{session:window.session}}),onAuthStateChange(fn){window.authChange=fn;return {data:{subscription:{unsubscribe(){window.authChange=null;}}}};}},functions:{invoke:async()=>{window.calls++;return window.returned;}}};
  window.reporter=module.installClientFailureReporter(window.client,origin,'local-public',{enabled:true});
  window.same=module.installClientFailureReporter(window.client,origin,'local-public',{enabled:true})===window.reporter;
 },origin);
 await page.waitForFunction(()=>window.reporter.active());
 return {page,reports,guard,browser};
}
test('native browser transport preserves result identity, one business call and privacy',async t=>{
 const {page,reports,guard}=await setup(t);
 const result=await page.evaluate(async()=>{const r=await window.invoke(window.client,'get-student-dashboard',{body:{answer:'answer-private-canary'}});await window.reporter.settled();return {same:r===window.returned,body:await r.error.context.text(),calls:window.calls,installedOnce:window.same};});
 assert.deepEqual(result,{same:true,body:'{}',calls:1,installedOnce:true});assert.equal(reports.length,1);assert.equal(reports[0].category,'service_failure');
 assert.doesNotMatch(JSON.stringify(reports),/canary|signature|student-a|session_id/);await guard.drain();guard.verify();
});
test('owned exceptions and rejections report fixed categories without messages or stacks',async t=>{
 const {page,reports,guard}=await setup(t);
 await page.evaluate(()=>{setTimeout(()=>window.failOwned(),0);setTimeout(()=>window.rejectOwned(),10);});
 await page.waitForFunction(()=>true);await new Promise(r=>setTimeout(r,150));await page.evaluate(()=>window.reporter.settled());
 assert.equal(reports.length,1,'same-category crashes grouped');assert.equal(reports[0].category,'application_exception');assert.doesNotMatch(JSON.stringify(reports),/canary|stack|owned\.js/);
 await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{filename:'chrome-extension://synthetic/content.js',message:'private-extension-canary'})));
 await page.evaluate(()=>window.reporter.settled());assert.equal(reports.length,1);await guard.drain();guard.verify();
});
test('late failures after account changes and pagehide are discarded; restored pages resume',async t=>{
 const {page,reports,guard}=await setup(t);
 await page.evaluate(async()=>{
  const old=window.semantic(window.client,'draft_save');window.session=null;window.authChange('SIGNED_OUT',null);old.report('write_unconfirmed');
  window.session={user:{id:'student-b'},access_token:'e30.'+btoa(JSON.stringify({session_id:crypto.randomUUID()}))+'.signature'};window.authChange('SIGNED_IN',window.session);
  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.semantic(window.client,'draft_save').report('service_failure',503);await window.reporter.settled();
 });assert.equal(reports.length,0);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await page.waitForFunction(()=>window.reporter.active());
 await page.evaluate(async()=>{window.semantic(window.client,'draft_save').report('service_failure',503);await window.reporter.settled();});assert.equal(reports.length,1);
 await guard.drain();guard.verify();
});
test('a slow collector does not delay an action or keep browser teardown running indefinitely',async t=>{
 const {page,reports,guard,browser}=await setup(t,{delay:10000});
 const ms=await page.evaluate(async()=>{const start=performance.now();await window.invoke(window.client,'get-student-dashboard',{});return performance.now()-start;});assert.ok(ms<500);
 await page.waitForTimeout(50);assert.equal(reports.length,1);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await page.evaluate(()=>window.reporter.settled());
 // Aborted reporting is expected here. Drain must still finish; a transport
 // refusal is reported honestly by the general guard and not swallowed by it.
 await guard.drain().catch(e=>assert.match(e.message,/owned_browser_transport_errors/));await browser.close();
});
