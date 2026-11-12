import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {actor,session,sessionDatabase,sqlRateAdmin,token} from './fixtures/session-rate-budget.mjs';
import {state} from './fixtures/actor-rate-limiter.mjs';
import {createRateBudgetGate,RATE_BUDGET_ROUTES,readRateBudgetJson} from '../supabase/functions/_shared/rate-budget.mjs';
const enforce=createRateBudgetGate(()=> 'enforce-v1');
const request=body=>new Request('https://isolated.invalid/functions/v1/untrusted-route',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body??{})});
async function fixture(t){const db=await sessionDatabase();t.after(()=>db.close());return db;}

test('every Edge entrypoint is explicitly inventoried and connected, including aliases',()=>{
  const names=readdirSync('supabase/functions').filter(x=>x!=='_shared').sort();
  assert.equal(names.length,65);assert.deepEqual([...RATE_BUDGET_ROUTES],names);
  for(const name of names){const source=readFileSync(`supabase/functions/${name}/index.ts`,'utf8');
    assert.ok(source.includes(`"${name}"`)||source.includes(`'${name}'`),name);
    assert.match(source,/enforceRateBudget|rateBudgetRoute:/,name);
  }
});

test('off is inert for all 65 routes; configuration errors cannot silently disable enforcement',async()=>{
  let calls=0;const admin={rpc(){calls++;throw Error('should not run');}};
  for(const mode of [undefined,null,'','off'])for(const route of RATE_BUDGET_ROUTES)
    assert.equal(await createRateBudgetGate(()=>mode)(request('{'),admin,'invalid','invalid',route),null);
  for(const mode of ['enforce','ON',true])assert.equal((await createRateBudgetGate(()=>mode)(request(),admin,actor(1),token(),'join-class')).status,503);
  assert.equal((await enforce(request(),admin,actor(1),token(),'body-chosen-policy')).status,503);assert.equal(calls,0);
});

test('server-owned route/identity ignore spoofed body values and combine budgets once',async()=>{
  for(const route of RATE_BUDGET_ROUTES){const calls=[];const admin={async rpc(name,args){calls.push({name,args});return {data:{allowed:true,retryAfterSeconds:0}};}};
    assert.equal(await enforce(request({actorId:actor(2),session_id:session(2),policy:'app',cost:0,recipientCount:0}),admin,actor(1),token(),route),null);
    assert.equal(calls.length,1,route);assert.equal(calls[0].name,'service_reserve_session_rate_budgets');
    assert.equal(calls[0].args.p_actor,actor(1));assert.equal(calls[0].args.p_session,session(1));
    const expected={app:1};if(route==='start-learning-session')expected.session_start=1;
    if(['join-class','redeem-institutional-invitation','complete-student-invitation'].includes(route))expected.code_redemption=1;
    assert.deepEqual(calls[0].args.p_costs,expected,route);
  }
});

test('database-backed refusal returns useful CORS-visible Retry-After and never writes a denial',async t=>{
  const db=await fixture(t),admin=sqlRateAdmin(db);
  for(let i=0;i<10;i++)assert.equal(await enforce(request({joinCode:'WRONG123'}),admin,actor(1),token(),'join-class'),null);
  const before=await state(db),r=await enforce(request({joinCode:'WRONG123'}),admin,actor(1),token(),'join-class');
  assert.equal(r.status,429);const body=await r.json();assert.equal(body.error,'rate_limit_exceeded');assert.ok(body.retryAfterSeconds>0);
  assert.equal(r.headers.get('retry-after'),String(body.retryAfterSeconds));assert.match(r.headers.get('access-control-expose-headers'),/Retry-After/);
  assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await state(db),before);
  assert.equal(await enforce(request(),admin,actor(2),token(2),'join-class'),null);
  assert.equal(await enforce(request(),admin,actor(1),token(),'get-student-dashboard'),null);
});

test('all malformed authenticated code attempts share the same counter across redemption routes',async t=>{
  const db=await fixture(t),admin=sqlRateAdmin(db),routes=['join-class','redeem-institutional-invitation','complete-student-invitation'];
  for(let i=0;i<10;i++)assert.equal(await enforce(request(i%2?'{':{joinCode:'?'}),admin,actor(1),token(),routes[i%3]),null);
  for(const route of routes)assert.equal((await enforce(request('{'),admin,actor(1),token(),route)).status,429);
});

test('weighted invitation reservations use normalized recipients, preserve the body and stop before send',async t=>{
  const db=await fixture(t),admin=sqlRateAdmin(db);
  const body={emails:[' A@EXAMPLE.INVALID ','a@example.invalid','b@example.invalid'],recipientCount:0};const req=request(body);
  assert.equal(await enforce(req,admin,actor(1),token(),'provision-student-account'),null);
  assert.deepEqual(await readRateBudgetJson(req),body);assert.equal(admin.calls[0].args.p_costs.invitation_email,2);
  assert.deepEqual(await readRateBudgetJson(req),body);
  const recipients=Array.from({length:20},(_,i)=>`fixture-${i}@example.invalid`);
  for(let i=0;i<4;i++)assert.equal(await enforce(request({emails:recipients}),admin,actor(2),token(2),'provision-student-account'),null);
  assert.equal(await enforce(request({emails:recipients}),admin,actor(2),token(2),'provision-student-account'),null);
  const before=await state(db);assert.equal((await enforce(request({email:'one@example.invalid'}),admin,actor(2),token(2),'provision-student-account')).status,429);
  assert.deepEqual(await state(db),before);
});

test('mail parsing preserves invalid JSON and cannot bypass recipient charging with padding',async()=>{
  const calls=[],admin={async rpc(name,args){calls.push(args);return {data:{allowed:true,retryAfterSeconds:0}};}};
  const bad=request('{');assert.equal(await enforce(bad,admin,actor(1),token(),'provision-student-account'),null);
  await assert.rejects(readRateBudgetJson(bad),SyntaxError);assert.deepEqual(calls[0].p_costs,{app:1});
  assert.equal((await enforce(request({email:'one@example.invalid',padding:'x'.repeat(65536)}),admin,actor(1),token(),'provision-student-account')).status,413);
  assert.equal(calls.length,1);
  const resend=request({action:'resend',invitationId:actor(50),email:'untrusted@example.invalid'});
  await enforce(resend,admin,actor(1),token(),'manage-staff-invitation');assert.deepEqual(calls[1].p_costs,{app:1,invitation_email:1});
  await enforce(request({action:'list'}),admin,actor(1),token(),'manage-staff-invitation');assert.deepEqual(calls[2].p_costs,{app:1});
});

test('expired, revoked, banned and cross-person sessions create no counters',async t=>{
  const db=await fixture(t),admin=sqlRateAdmin(db);
  const cases=[{n:1,sql:'delete from auth.sessions where user_id=$1'},
    {n:2,sql:"update auth.sessions set not_after=clock_timestamp()-interval '1 second' where user_id=$1"},
    {n:3,sql:"update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=$1"},
    {n:4,sql:'update auth.users set deleted_at=clock_timestamp() where id=$1'}];
  for(const c of cases){await db.query(c.sql,[actor(c.n)]);assert.equal((await enforce(request(),admin,actor(c.n),token(c.n),'get-my-privacy')).status,403);}
  assert.equal((await enforce(request(),admin,actor(5),token(6),'get-my-privacy')).status,403);
  assert.deepEqual(await state(db),[]);
  assert.equal(await enforce(request(),admin,actor(7),token(7),'manage-my-privacy'),null);
});

test('session capability is service-only; reservation commits separately from business failure',async t=>{
  const db=await fixture(t),admin=sqlRateAdmin(db);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);const r=await admin.rpc('service_reserve_session_rate_budgets',{p_actor:actor(1),p_session:session(1),p_costs:{app:1}});assert.equal(r.error.code,'42501');await db.exec('reset role');}
  await db.exec('set role service_role');assert.equal(await enforce(request(),admin,actor(1),token(),'join-class'),null);await db.exec('reset role');const before=await state(db);
  await db.exec('begin');await assert.rejects(db.exec("do $$ begin raise exception 'synthetic_business_failure';end $$"));await db.exec('rollback');assert.deepEqual(await state(db),before);
});

test('storage errors, malformed replies and timeout fail closed without automatic retries',async()=>{
  const results=[{error:{message:'secret-database-detail'}},{data:{allowed:true,retryAfterSeconds:2}},{data:{allowed:false,retryAfterSeconds:0}},{data:null}];
  for(const result of results){let calls=0;const r=await enforce(request(),{rpc(){calls++;return Promise.resolve(result);}},actor(1),token(),'get-student-dashboard');assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'rate_budget_unavailable'});assert.equal(calls,1);}
  let calls=0,signal;const r=await createRateBudgetGate(()=> 'enforce-v1',{timeoutMs:10})(request(),{rpc(){calls++;const promise=new Promise(()=>{});promise.abortSignal=s=>{signal=s;return promise;};return promise;}},actor(1),token(),'submit-answer');
  assert.equal(r.status,503);assert.equal(calls,1);assert.equal(signal.aborted,true);
});

test('the prepared rollback removes only counters and can be followed by the same migration',async t=>{
  const db=await fixture(t);await db.exec(readFileSync('supabase/proposals/bf16_actor_rate_budgets_rollback.sql','utf8'));
  assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,200);
  assert.equal((await db.query("select to_regclass('private.actor_rate_buckets') name")).rows[0].name,null);
});
