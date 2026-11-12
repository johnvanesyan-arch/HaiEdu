import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {invokeRateAware,rateLimitMessage,rateLimitFallback} from '../web/rate-budget-feedback.mjs';
import {createAnswerRequest} from '../web/answer-response-recovery.mjs';
import {pathCovered} from '../scripts/check-browser-qa-triggers.mjs';
const denied=(body={error:'rate_limit_exceeded',retryAfterSeconds:60},headers={})=>({data:null,error:{context:new Response(JSON.stringify(body),{status:429,headers})}});
test('wait feedback prefers the HTTP header, preserves the original body and makes one request',async()=>{
  const original=denied(undefined,{'Retry-After':'45'});let calls=0;
  const result=await invokeRateAware({functions:{async invoke(){calls++;return original;}}},'join-class',{body:{joinCode:'ABCD2345'}});
  assert.equal(rateLimitMessage(result.error),'Խնդրում ենք սպասել 45 վայրկյան և կրկին փորձել։');assert.equal(calls,1);
  assert.deepEqual(await original.error.context.json(),{error:'rate_limit_exceeded',retryAfterSeconds:60});
});
test('missing or invalid wait values use only the approved fallback',async()=>{
  for(const wait of [undefined,0,-1,1.5,'60',Infinity,259201]){
    const r=await invokeRateAware({functions:{invoke:async()=>denied({error:'rate_limit_exceeded',retryAfterSeconds:wait})}},'join-class',{});
    assert.equal(rateLimitMessage(r.error),rateLimitFallback);
  }
  assert.equal(rateLimitMessage(Error('ordinary_failure')),null);
  assert.equal(rateLimitMessage({status:429,code:'over_request_rate_limit',message:'Auth throttle'}),null,'provider Auth keeps its separately reviewed feedback');
});
test('successful and non-rate failures retain their existing result and error identities',async()=>{
  for(const result of [{data:{ok:true}}, {data:null,error:Error('synthetic failure')}, {data:null,error:{context:new Response('{}',{status:403})}}])
    assert.equal(await invokeRateAware({functions:{invoke:async()=>result}},'test',{}),result);
});
test('a refused learner write keeps its exact request and does not become an unknown outcome',async()=>{
  const calls=[],body={sessionId:'synthetic',response:'entered answer',requestId:'same-request'};
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-student'}}}})},functions:{invoke:async(name,options)=>{calls.push(structuredClone(options.body));return denied();}}};
  const request=createAnswerRequest(client,'submit-answer',{body});let result=await request.send();
  assert.equal(result.error.status,429);assert.equal(result.error.unknown,false);assert.equal(request.uncertain,false);
  assert.equal(result.error.message,'Խնդրում ենք սպասել 60 վայրկյան և կրկին փորձել։');assert.equal(calls.length,1);
  body.response='changed after request';result=await request.send();assert.equal(calls.length,2);assert.deepEqual(calls[1],calls[0]);assert.equal(calls[0].response,'entered answer');
});
test('all browser Edge consumers use the rate-aware boundary; only the boundary calls the SDK directly',()=>{
  const consumers=[];
  for(const name of readdirSync('web').filter(x=>/\.(m?js)$/.test(x)&&!x.includes('.bundle.')&&x!=='rate-budget-feedback.mjs')){
    const source=readFileSync('web/'+name,'utf8');assert.doesNotMatch(source,/\.functions\.invoke\s*\(/,name);
    if(source.includes('invokeRateAware('))consumers.push(name);
  }
  assert.ok(consumers.length>=41);
});
test('every paused production suite retains routing for both shared boundaries and the migration',()=>{
  let suites=0;
  const dependencyPaths=source=>[...source.matchAll(/^      - ['\"]?([^'\"\s]+)['\"]?\s*$/gm)].map(x=>x[1]);
  for(const name of readdirSync('.github/workflows').filter(x=>x.endsWith('.yml'))){
    const source=readFileSync('.github/workflows/'+name,'utf8');if(!source.includes('PRODUCTION_QA_AUTORUN'))continue;suites++;
    for(const file of ['web/rate-budget-feedback.mjs','supabase/functions/_shared/rate-budget.mjs','supabase/migrations/20261112172643_bf16_actor_rate_budgets.sql'])
      assert.ok(pathCovered(file,dependencyPaths(source)),name+' omits '+file);
  }
  assert.equal(suites,16);
});
