import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionDatabase,sqlRateAdmin,actor,session} from './fixtures/session-rate-budget.mjs';
import {RATE_BUDGET_ROUTES} from '../supabase/functions/_shared/rate-budget.mjs';
import {rateEndpoint} from './fixtures/rate-budget-endpoint.mjs';
import {state} from './fixtures/actor-rate-limiter.mjs';
const bodies={
  'get-learning-audio':{action:'catalog',itemId:actor(20)},
  'get-learning-task-set':{action:'catalog',itemId:actor(20)},
  'get-teacher-workspace':{},
  'get-unit-guides':{enrollmentId:actor(10),curriculumReleaseId:actor(11),unitId:actor(12)},
  'manage-teacher-feedback':{action:'snippets'},
  'manage-written-work':{action:'tasks',context:{enrollmentId:actor(10),curriculumReleaseId:actor(11),unitId:actor(12)}},
  'manage-unit-materials':{action:'list',payload:{}},
};
test('all 65 actual Edge paths refuse before business work and expose the same wait contract',async t=>{
  const db=await sessionDatabase();t.after(()=>db.close());
  await db.exec("update private.actor_rate_policies set capacity=1,token_interval_us=3600000000 where policy_key='app'");
  await db.query('select public.service_reserve_session_rate_budgets($1,$2,$3::jsonb)',[actor(1),session(1),JSON.stringify({app:1})]);
  for(const name of RATE_BUDGET_ROUTES){
    const admin=sqlRateAdmin(db);const reads=[];
    admin.from=table=>{reads.push(table);const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{role:'teacher',account_status:'active'},error:null})};return q;};
    const api=rateEndpoint(name,admin),response=await api.call(bodies[name]??{});
    assert.equal(response.status,429,name+' '+await response.clone().text()+' '+JSON.stringify(api.messages));
    assert.equal((await response.json()).error,'rate_limit_exceeded',name);
    assert.ok(Number(response.headers.get('retry-after'))>0,name);
    assert.equal(admin.calls.length,1,name);assert.equal(admin.calls[0].name,'service_reserve_session_rate_budgets',name);
    assert.ok(reads.every(x=>x==='profiles'),name+' business reads happened before admission');
  }
});

test('optimized teacher dashboard directory and class branches cannot bypass admission',async t=>{
  const db=await sessionDatabase();t.after(()=>db.close());await db.exec("update private.actor_rate_policies set capacity=1,token_interval_us=3600000000 where policy_key='app'");
  await db.query('select public.service_reserve_session_rate_budgets($1,$2,$3::jsonb)',[actor(1),session(1),JSON.stringify({app:1})]);
  for(const body of [{readMode:'directory'},{readMode:'class',classId:actor(20)}]){
    const admin=sqlRateAdmin(db),api=rateEndpoint('get-teacher-dashboard',admin);const r=await api.call(body);assert.equal(r.status,429);assert.equal(admin.calls.length,1);
  }
});

test('all 65 endpoints retain preflight and anonymous rejection without allocating counters',async()=>{
  for(const name of RATE_BUDGET_ROUTES){
    let calls=0;const admin={rpc(){calls++;throw Error('Anonymous request reached a budget');}};
    const api=rateEndpoint(name,admin,{authenticated:false});
    assert.equal((await api.call(bodies[name]??{})).status,401,name);
    assert.equal((await api.call({},'OPTIONS')).status,200,name);assert.equal(calls,0,name);
  }
});

test('successful read with repeated live-session checks reserves only once',async t=>{
  const db=await sessionDatabase();t.after(()=>db.close());const admin=sqlRateAdmin(db),rateRpc=admin.rpc;
  let reads=0;admin.rpc=async(name,args)=>name==='service_student_unit_guides'?(reads++,{data:{guidesVersion:'unit-guides-v1',availability:'unavailable',guides:[]},error:null}):rateRpc(name,args);
  const r=await rateEndpoint('get-unit-guides',admin).call(bodies['get-unit-guides']);
  assert.equal(r.status,200);assert.equal(admin.calls.length,1);assert.equal(reads,1);assert.equal((await state(db)).length,1);
});

test('real handler business failure does not refund an already admitted code attempt',async t=>{
  const db=await sessionDatabase();t.after(()=>db.close());const admin=sqlRateAdmin(db),rateRpc=admin.rpc;
  admin.from=()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{role:'student',account_status:'active'}})};return q;};
  admin.rpc=async(name,args)=>name==='service_redeem_institutional_join_code_14c'?{data:null,error:{message:'institutional_join_code_unavailable'}}:rateRpc(name,args);
  const r=await rateEndpoint('join-class',admin).call({joinCode:'ABCD2345'});
  assert.equal(r.status,404);assert.equal(admin.calls.length,1);assert.deepEqual((await state(db)).map(x=>x.policy_key).sort(),['app','code_redemption']);
});

test('a deletion_pending person retains the existing cancellation path with admission enabled',async t=>{
  const db=await sessionDatabase();t.after(()=>db.close());const admin=sqlRateAdmin(db),updates=[];
  admin.from=table=>{let mutation;const q=new Proxy({}, {get(_target,key){
    if(key==='then')return resolve=>resolve({data:{id:actor(20),status:'cancelled'},error:null});
    if(key==='maybeSingle')return async()=>({data:table==='profiles'?{role:'student',account_status:'deletion_pending'}:{id:actor(20),status:'pending'},error:null});
    if(key==='single')return async()=>({data:{id:actor(20),status:'cancelled'},error:null});
    if(['update','insert'].includes(key))return value=>{mutation=value;updates.push({table,value});return q;};
    return ()=>q;
  }});return q;};
  const r=await rateEndpoint('manage-my-privacy',admin,{active:false}).call({action:'cancel_deletion'});
  assert.equal(r.status,200);assert.equal((await r.json()).accountStatus,'active');assert.equal(admin.calls.length,1);
  assert.ok(updates.some(x=>x.table==='profiles'&&x.value.account_status==='active'));
});
