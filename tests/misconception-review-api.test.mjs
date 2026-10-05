import test from 'node:test';
import assert from 'node:assert/strict';
import { createMisconceptionReviewHandler } from '../supabase/functions/_shared/misconception-review-management.mjs';
const actor='10000000-0000-4000-8000-000000000010', session='70000000-0000-4000-8000-000000000001', id='30000000-0000-4000-8000-000000000021';
function fixture({role='content_admin',status='active',live=true,valid=true,aal='aal2',rpcError=null}={}){
 const calls=[];
 const admin={auth:{getUser:async()=>({data:{user:valid?{id:actor}:null}})},from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:{role,account_status:status}};}}),rpc:async(name,args)=>{calls.push({name,args});return {data:{definition:{id},actor:{role:'forged'}},error:rpcError&&{message:rpcError}};}};
 const handler=createMisconceptionReviewHandler({createAdmin:()=>admin,hasActiveLiveSession:async()=>live,env:{url:'fixture',key:'fixture'}});
 const token='fixture.'+Buffer.from(JSON.stringify({aal,session_id:session})).toString('base64url')+'.fixture';
 return {calls,request:async(body={action:'approve',id,expectedToken:'a'.repeat(32),reason:'Reviewed fixture'})=>handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)}))};
}
test('wrong roles, archived accounts, revoked sessions and invalid tokens cannot read or mutate',async()=>{
 for(const config of [{role:'student'},{role:'teacher'},{role:'school_admin'},{status:'archived'},{live:false},{valid:false}])for(const action of ['list','detail','approve']){
  const f=fixture(config),r=await f.request({action,id,expectedToken:'a'.repeat(32),reason:'Reviewed'});assert.ok([401,403].includes(r.status));assert.equal(f.calls.length,0);
 }
});
test('AAL1 can review and save drafts but cannot approve; verified identity overrides forged input',async()=>{
 const f=fixture({aal:'aal1'});assert.equal((await f.request()).status,403);assert.equal(f.calls.length,0);
 assert.equal((await f.request({action:'save_draft',id,expectedToken:'a'.repeat(32),reason:'Reworded',actorId:'forged',actorAal:'aal2'})).status,200);
 assert.equal(f.calls[0].args.p_actor_id,actor);assert.equal(f.calls[0].args.p_actor_aal,'aal1');assert.equal(f.calls[0].args.p_session_id,session);
});
test('approved action requires a saved review token and never accepts bulk or arbitrary actions',async()=>{
 const f=fixture();for(const b of [{action:'approve',id},{action:'approve_all'},{action:'delete',id},{action:'list',filters:{offset:-1}},{action:'list',filters:{subjectId:'wrong'}}])assert.equal((await f.request(b)).status,400);
 assert.equal(f.calls.length,0);assert.equal((await f.request()).status,200);assert.equal(f.calls[0].name,'service_review_misconception');
});
test('stale reviews are conflicts; database internals are not exposed',async()=>{
 assert.equal((await fixture({rpcError:'stale_misconception_review'}).request()).status,409);
 const r=await fixture({rpcError:'internal SQL details'}).request();assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'review_service_unavailable'});assert.equal(r.headers.get('Cache-Control'),'no-store');
});
