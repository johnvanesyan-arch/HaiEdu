import test from 'node:test';
import assert from 'node:assert/strict';
import {FunctionsClient} from '@supabase/functions-js';
import {createAnswerRequest,invokeLearnerFunction} from '../web/answer-response-recovery.mjs';

const payload=()=>({sessionId:'session',sessionItemId:'assigned',itemId:'item',response:{value:'A'},responseTimeMs:123,draftRevision:2});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function client(fetch){
  let actor='student-A';
  return {functions:new FunctionsClient('https://isolated.invalid',{customFetch:fetch}),
    auth:{getSession:async()=>({data:{session:{user:{id:actor}}}})},actor(value){actor=value;}};
}

test('the pinned SDK retries an immutable answer only on explicit caller action',async()=>{
  const calls=[],stored={grading:{correct:true},mastery:{score:.75,evidenceCount:4}};
  const c=client(async(url,options)=>{calls.push(JSON.parse(options.body));if(calls.length===1)throw TypeError('PRIVATE RAW ERROR');return json({...stored,replayed:true});});
  const body=payload(),request=createAnswerRequest(c,'submit-answer',{body});
  const failed=await request.send();assert.equal(failed.error.unknown,true);assert.equal(request.uncertain,true);
  assert.equal(calls.length,1);assert.doesNotMatch(failed.error.message,/PRIVATE|Failed to/);
  body.response.value='B';body.responseTimeMs=999;body.draftRevision=3;
  const replay=await request.send();assert.deepEqual(replay.data,{...stored,replayed:true});
  assert.deepEqual(calls,[payload(),payload()]);
});

test('concurrent submit actions share one in-flight request',async()=>{
  const held=deferred();let calls=0;
  const c=client(async()=>{calls++;await held.promise;return json({accepted:true});});
  const request=createAnswerRequest(c,'submit-answer',{body:payload()});
  const first=request.send(),second=request.send();assert.equal(first,second);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
  held.resolve();assert.equal((await first).data.accepted,true);
});

test('a stalled request has a bounded unknown outcome; its late reply cannot replace the retry',async()=>{
  const held=deferred(),calls=[];let signal;
  const c=client(async(url,options)=>{calls.push(JSON.parse(options.body));signal=options.signal;if(calls.length===1){await held.promise;return json({old:true});}return json({accepted:true,replayed:true});});
  const request=createAnswerRequest(c,'submit-answer',{body:payload()},{timeout:20});
  const failed=await request.send();assert.equal(failed.error.code,'learner_request_timeout');assert.equal(signal.aborted,true);
  const retry=await request.send();assert.equal(retry.data.replayed,true);
  held.resolve();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[payload(),payload()]);
});

test('a stalled identity read cannot start an answer after its deadline',async()=>{
  const held=deferred();let calls=0,live=true;
  const c={auth:{getSession:()=>held.promise},functions:{invoke:async()=>{calls++;return {data:{accepted:true}};}}};
  const request=createAnswerRequest(c,'submit-answer',{body:payload()},{timeout:20,isCurrent:()=>live});
  const failed=await request.send();assert.equal(failed.error.code,'learner_request_timeout');assert.equal(calls,0);
  live=false;held.resolve({data:{session:{user:{id:'A'}}}});await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);
});

test('actor and context changes suppress replies and do not reuse an old answer under another account',async()=>{
  const held=deferred();let calls=0,live=true;
  const c=client(async()=>{calls++;await held.promise;return json({grading:{correct:true}});});
  const request=createAnswerRequest(c,'submit-answer',{body:payload()},{isCurrent:()=>live});
  const first=request.send();await new Promise(resolve=>setImmediate(resolve));
  c.actor('student-B');held.resolve();assert.equal((await first).stale,true);
  assert.equal((await request.send()).stale,true);assert.equal(calls,1);
  live=false;assert.equal((await request.send()).stale,true);
});

test('known HTTP errors keep stable codes but never expose SDK or server text',async()=>{
  for(const [status,code] of [[409,'answer_response_conflict'],[403,'learning_context_unavailable'],[400,'invalid_option_presentation_key']]){
    const c=client(async()=>json({error:code,message:'PRIVATE SERVER DETAIL'},status));
    const result=await invokeLearnerFunction(c,'submit-answer',{body:payload()});
    assert.equal(result.error.code,code);assert.equal(result.error.status,status);assert.equal(result.error.unknown,false);
    assert.doesNotMatch(result.error.message,/PRIVATE|Edge Function|FunctionsHttpError/);
    assert.equal(result.error.retryable,status===400);
  }
});
