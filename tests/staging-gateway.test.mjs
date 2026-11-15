import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transform} from 'esbuild';

async function gateway() {
  const source=await readFile(new URL('./fixtures/staging-gateway.ts',import.meta.url),'utf8');
  const registry=await readFile(new URL('./fixtures/staging-services.json',import.meta.url),'utf8');
  const configuration={runId:'a'.repeat(24),sourceCommit:'b'.repeat(40),anonKey:'local-public',serviceKey:'local-private'};
  let handler;const workers=[],requests=[],incoming=[];
  const context=vm.createContext({URL,Headers,Request,Response,TextDecoder,AbortSignal,
    Deno:{env:{get:()=>JSON.stringify(configuration)},readTextFileSync:()=>registry,serve:callback=>handler=callback},
    EdgeRuntime:{userWorkers:{create:async options=>{workers.push(options);return {fetch:async request=>{requests.push(request);return Response.json({untouched:true});}};} }},
    fetch:async (...args)=>{requests.push(args);return Response.json({provider:true});}});
  vm.runInContext((await transform(source,{loader:'ts',format:'esm'})).code,context);
  return {workers,requests,incoming,call:(path,body={},key='local-public')=>{
    const request=new Request('http://api:8080'+path,{method:'POST',headers:{apikey:key},body:JSON.stringify(body)});
    incoming.push(request);return handler(request);
  }};
}

test('local gateway rejects unknown paths, bad keys and write actions before creating workers',async()=>{
  const g=await gateway();
  assert.equal((await g.call('/functions/v1/get-student-dashboard',{},'wrong')).status,401);
  for(const path of ['/functions/v1/not-reviewed','/functions/v1/get-student-dashboard/extra','/functions/v1/%2e%2e%2foutside','/storage/v1/object/private'])assert.equal((await g.call(path)).status,404);
  for(const name of ['manage-school-academic-year','manage-staff-invitation']) {
    for(const action of ['create','delete','resend','revoke',null])assert.equal((await g.call('/functions/v1/'+name,{action})).status,400);
  }
  assert.equal(g.workers.length,0);assert.equal(g.requests.length,0);
});

test('local gateway creates only the reviewed service worker and preserves its response',async()=>{
  const g=await gateway();
  const r=await g.call('/functions/v1/manage-school-academic-year',{action:'list',schoolId:'synthetic'});
  assert.deepEqual(await r.json(),{untouched:true});
  assert.equal(g.workers[0].servicePath,'/service/manage-school-academic-year');
  assert.equal(g.workers[0].envVars.find(([k])=>k==='SUPABASE_URL')[1],'http://api:8080');
  assert.equal(g.workers[0].envVars.find(([k])=>k==='HAIEDU_RATE_BUDGETS_MODE')[1],'off');
  assert.equal(g.requests[0],g.incoming[0],'retain the runtime-tagged original request');
  assert.deepEqual(await g.requests[0].json(),{action:'list',schoolId:'synthetic'});
  assert.equal(r.headers.get('cache-control'),'no-store');
});
