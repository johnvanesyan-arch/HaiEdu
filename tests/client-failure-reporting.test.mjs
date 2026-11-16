import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClientFailureReporter} from '../web/client-failure-reporter.mjs';
import {failureCategory,failureOperation} from '../web/client-failure-catalog.mjs';
import {validateClientFailure} from '../web/client-failure-contract.mjs';
import {createClientFailureHandler} from '../supabase/functions/_shared/client-failure-handler.mjs';
import {createClientSummaryHandler} from '../supabase/functions/_shared/client-failure-summary.mjs';
import {publishClientIncidents} from '../scripts/client-failure-incidents.mjs';
import {fetchClientSummary,clientObserverEnabled} from '../scripts/observe-client-failures.mjs';
import {buildRegistration} from '../scripts/client-failure-build-registration.mjs';
const buildId='a'.repeat(64),report=()=>({schemaVersion:1,buildId,page:'student',operation:'draft_save',category:'service_failure',status:503,durationMs:100,eventId:randomUUID()});
const token='e30.'+Buffer.from(JSON.stringify({session_id:randomUUID()})).toString('base64url')+'.signature';
const tick=()=>new Promise(r=>setTimeout(r,5));
test('trusted manual inspection can precede activation and cannot publish notices',()=>{
 const env={GITHUB_REPOSITORY:'johnvanesyan-arch/HaiEdu',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch'};
 const event={inputs:{mode:'inspect',client_reports:true}};
 assert.equal(clientObserverEnabled('collect',env,event),true);
 assert.equal(clientObserverEnabled('collect',env,{inputs:{mode:'inspect'}}),false,'existing public-only inspection remains independent');
 assert.equal(clientObserverEnabled('publish',env,event),false);
 assert.equal(clientObserverEnabled('publish',{...env,BF22_CLIENT_FAILURE_ALERTS:'true'},event),false);
 for(const patch of [{GITHUB_REPOSITORY:'someone/else'},{GITHUB_REF:'refs/heads/feature'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_EVENT_NAME:'workflow_run'},{GITHUB_EVENT_NAME:'schedule'}])assert.equal(clientObserverEnabled('collect',{...env,...patch},event),false);
 assert.equal(clientObserverEnabled('publish',{...env,GITHUB_EVENT_NAME:'schedule',BF22_CLIENT_FAILURE_ALERTS:'true'},{}),true);
});
function client(){let listener;return {auth:{getSession:async()=>({data:{session:{user:{id:'synthetic'},access_token:token}}}),onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){listener=null;}}}};}},change(s){listener?.('SIGNED_IN',s);}};}
test('contract is shared verbatim and rejects text, surplus fields, getters and malformed values',()=>{
 assert.equal(readFileSync('web/client-failure-contract.mjs','utf8'),readFileSync('supabase/functions/_shared/client-failure-contract.mjs','utf8'));
 assert.equal(validateClientFailure(report()),true);
 for(const extra of [{answer:'synthetic-secret'},{operation:'secret'},{status:'503'},{durationMs:-1},{eventId:'secret'},{category:null}])assert.equal(validateClientFailure({...report(),...extra}),false);
 const value=report();Object.defineProperty(value,'page',{get(){throw Error('must_not_read');}});assert.equal(validateClientFailure(value),false);
});
test('fixed routing covers every shared server budget consumer except learning analytics',async()=>{
 const {RATE_BUDGET_ROUTES}=await import('../supabase/functions/_shared/rate-budget.mjs');
 for(const name of RATE_BUDGET_ROUTES)assert.equal(Boolean(failureOperation(name,{})),name!=='record-recommendation-event',name);
 assert.equal(failureOperation('record-client-failure',{}),null);
 assert.equal(failureOperation('manage-written-work',{body:{action:'submit',text:'canary'}}),'writing_submit');
});
test('expected refusals and cancelled navigation do not become incidents',()=>{
 for(const status of [400,401,403,404,409,422,429])assert.equal(failureCategory({error:{context:new Response('{}',{status})}}),null);
 assert.equal(failureCategory(null,{name:'AbortError'}),null);
 assert.deepEqual(failureCategory({error:{context:new Response('{}',{status:503})}}),{category:'service_failure',status:503});
});
test('reporter drops duplicates, private inputs, stale-account results and logout backlog',async()=>{
 const c=client(),sent=[];const r=createClientFailureReporter(c,{enabled:true,buildId,page:'student',send:async(v)=>sent.push(v)});await tick();
 const old=r.begin('draft_save');old.report('service_failure',503);old.report('service_failure',503);await r.settled();assert.equal(sent.length,1);
 const pending=r.begin('writing_submit');c.change(null);pending.report('write_unconfirmed');await r.settled();assert.equal(sent.length,1);
 assert.ok(sent.every(validateClientFailure));assert.doesNotMatch(JSON.stringify(sent),/synthetic|signature|session_id/);r.dispose();
});
test('reporting has a deadline, independent five-report cap and no retries or pending teardown',async()=>{
 const c=client();let calls=0;const r=createClientFailureReporter(c,{enabled:true,buildId,page:'teacher',deadlineMs:5,send:()=>{calls++;return new Promise(()=>{});}});await tick();
 for(const op of ['draft_save','writing_submit','audio_load','file_load','page_execution','admin_action','learning_load'])r.begin(op).report('request_failed');
 await r.settled();assert.equal(calls,5);r.dispose();await r.settled();
});
test('disabled reporting never consults Auth or sends requests',()=>{
 const r=createClientFailureReporter({get auth(){throw Error('disabled');}},{send:()=>assert.fail()});r.begin('draft_save').report('service_failure');r.dispose();
});
const request=(body=report(),headers={})=>new Request('http://localhost/functions/v1/record-client-failure',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},body:JSON.stringify(body)});
test('collector validates size and fields before Auth and cannot accept an inactive session',async()=>{
 let auth=0,writes=0;const handler=createClientFailureHandler({mode:()=> 'observe',authenticate:async()=>{auth++;return null;},record:async()=>{writes++;}});
 assert.equal((await handler(request({...report(),answer:'canary'}))).status,400);
 assert.equal((await handler(request({...report(),answer:'x'.repeat(2000)}))).status,400);assert.equal(auth,0);
 assert.equal((await handler(request())).status,401);assert.equal(auth,1);assert.equal(writes,0);
});
test('collector off, accepted, limited, malformed, stalled and broken backends have bounded fixed responses',async()=>{
 assert.equal((await createClientFailureHandler()(request())).status,503);
 for(const [result,status] of [['accepted',204],['duplicate',204],['limited',429],['invalid',400],['inactive',401],['unavailable',503]]){
  const handler=createClientFailureHandler({mode:()=> 'observe',authenticate:async()=>({id:'a'}),record:async()=>result});assert.equal((await handler(request())).status,status);
 }
 const handler=createClientFailureHandler({mode:()=> 'observe',deadlineMs:5,authenticate:()=>new Promise(()=>{}),record:()=>assert.fail()});assert.equal((await handler(request())).status,503);
});
test('a stalled request body is cancelled at the collector deadline before Auth or storage',async()=>{
 let cancelled=false;
 const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});
 const req=new Request('http://localhost',{method:'POST',duplex:'half',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body});
 const handler=createClientFailureHandler({mode:()=> 'observe',deadlineMs:5,authenticate:()=>assert.fail('Auth must not run'),record:()=>assert.fail()});
 assert.equal((await handler(req)).status,503);assert.equal(cancelled,true);
});
test('summary exporter requires its narrow capability and rejects raw or forged output',async()=>{
 const secret='b'.repeat(64),valid={category:'service_failure',operation:'dashboard_load',count:3};let reads=0;
 const handler=createClientSummaryHandler({mode:()=> 'observe',secret:()=>secret,read:async()=>{reads++;return [valid];}});
 assert.equal((await handler(new Request('http://localhost',{method:'POST'}))).status,401);assert.equal(reads,0);
 const reply=await handler(new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer '+secret}}));assert.equal(reply.status,200);assert.equal(reads,1);
 const bad=createClientSummaryHandler({mode:()=> 'observe',secret:()=>secret,read:async()=>[{...valid,message:'canary'}]});
 assert.equal((await bad(new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer '+secret}}))).status,503);
});
test('GitHub projection groups incidents, is silent for repeats, and never closes from silence',async()=>{
 const date=new Date('2026-11-17T00:00:00Z');const summary={schemaVersion:1,scope:'bf22-authenticated-client-reports',observedAt:date.toISOString(),candidates:[{category:'write_unconfirmed',operation:'writing_submit',count:4}]};
 const issues=[],calls=[];const fetchImpl=async(_url,options)=>{calls.push(options.method);if(options.method==='POST'){const body=JSON.parse(options.body);issues.push({...body,number:1,state:'open',user:{login:'github-actions[bot]',type:'Bot'}});return Response.json({number:1});}return Response.json(issues);};
 assert.deepEqual(await publishClientIncidents(summary,{token:'synthetic',fetchImpl,now:()=>date}),[{category:'write_unconfirmed',action:'opened'}]);
 assert.deepEqual(await publishClientIncidents(summary,{token:'synthetic',fetchImpl,now:()=>date}),[{category:'write_unconfirmed',action:'unchanged'}]);
 await publishClientIncidents({...summary,candidates:[]},{token:'synthetic',fetchImpl,now:()=>date});
 assert.equal(calls.filter(x=>x==='POST').length,1);assert.equal(calls.includes('PATCH'),false);assert.match(issues[0].body,/not proof/);
 await assert.rejects(publishClientIncidents({...summary,candidates:[{...summary.candidates[0],email:'canary'}]},{token:'synthetic',fetchImpl,now:()=>date}),/invalid_client_summary/);
});
test('summary polling uses one fixed destination, a read capability, and bounded validated output',async()=>{
 const summary={schemaVersion:1,scope:'bf22-authenticated-client-reports',observedAt:new Date().toISOString(),candidates:[]};let calls=0;
 const fetchImpl=async(url,options)=>{calls++;assert.equal(url,'https://xzyjvwiiibuarpotppid.supabase.co/functions/v1/get-client-failure-summary');assert.equal(options.redirect,'error');assert.equal(options.body,'{}');return Response.json(summary);};
 assert.deepEqual(await fetchClientSummary('c'.repeat(64),{fetchImpl}),summary);assert.equal(calls,1);
 await assert.rejects(fetchClientSummary('service-role-placeholder',{fetchImpl}),/configuration/);assert.equal(calls,1);
 await assert.rejects(fetchClientSummary('c'.repeat(64),{fetchImpl:async()=>new Response('x'.repeat(16385))}),/unavailable/);
});
test('build registration emits only a validated committed identity and never performs a write',()=>{
 const manifest={buildId,inputs:{'web/client-failure-reporter.mjs':'fixture'}};
 assert.match(buildRegistration(manifest),/insert into private.client_failure_builds/);
 for(const value of [null,{}, {...manifest,buildId:"';select"}])assert.throws(()=>buildRegistration(value),/unreviewed_client_build/);
});
