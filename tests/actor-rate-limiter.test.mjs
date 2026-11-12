import test from 'node:test';
import assert from 'node:assert/strict';
import {actor, database, reserve, state} from './fixtures/actor-rate-limiter.mjs';

async function fixture(t) { const db = await database(); t.after(() => db.close()); return db; }

test('rate budgets are service-only, with no client or direct service table access', async t => {
  const db = await fixture(t);
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(reserve(db), e => e.code === '42501');
    await assert.rejects(db.query('select * from private.actor_rate_buckets'), e => e.code === '42501');
    await assert.rejects(db.query('select public.service_purge_idle_actor_rate_buckets()'), e => e.code === '42501');
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await reserve(db)).allowed, true);
  for (const sql of ['select * from private.actor_rate_buckets',
    "update private.actor_rate_policies set capacity=10000",'delete from private.actor_rate_buckets'])
    await assert.rejects(db.query(sql), e => e.code === '42501');
  assert.equal((await db.query('select public.service_purge_idle_actor_rate_buckets() as n')).rows[0].n,0);
});

test('full initial burst, weighted costs and a useful positive wait use server-owned policies', async t => {
  const db = await fixture(t);
  const spent = await reserve(db, actor(1), {app:60,invitation_email:100});
  assert.deepEqual(spent,{allowed:true,retryAfterSeconds:0,remaining:{app:0,invitation_email:0}});
  const denied = await reserve(db, actor(1), {app:1,invitation_email:20});
  assert.equal(denied.allowed,false);assert.ok(denied.retryAfterSeconds>=590 && denied.retryAfterSeconds<=600);
  assert.equal(denied.remaining.invitation_email,0);
  assert.ok(denied.remaining.app>=0 && denied.remaining.app<=60);
});

test('denied multi-budget reservations neither spend, create rows nor rewrite expiry', async t => {
  const db = await fixture(t);
  await reserve(db,actor(1),{code_redemption:10});const before=await state(db);
  for(let n=0;n<5;n++)assert.equal((await reserve(db,actor(1),{app:1,code_redemption:1})).allowed,false);
  assert.deepEqual(await state(db),before);
  assert.equal((await reserve(db,actor(1),{app:60})).allowed,true);
});

test('one person has the same allowance across callers but another person remains independent', async t => {
  const db = await fixture(t);
  await reserve(db,actor(1),{code_redemption:10});
  assert.equal((await reserve(db,actor(1),{code_redemption:1})).allowed,false);
  assert.equal((await reserve(db,actor(2),{code_redemption:10})).allowed,true);
  assert.equal((await reserve(db,actor(1),{app:1})).allowed,true);
});

test('invalid actors, unknown keys and malformed or impossible costs cannot create state', async t => {
  const db = await fixture(t);
  for(const id of [null,'00000000-0000-0000-0000-000000000000',actor(999)])
    await assert.rejects(reserve(db,id),e=>e.code==='22023');
  for(const costs of [null,[],1,{}, {app:0},{app:-1},{app:1.5},{app:'1'},{app:true},
    {app:null},{app:61},{other_actor:1},{app:1,unknown:1},{'code-for-anything':1}])
    await assert.rejects(reserve(db,actor(1),costs),e=>e.code==='22023');
  assert.deepEqual(await state(db),[]);
});

test('all four policies reserve together with exact remaining whole-token counts', async t => {
  const db = await fixture(t);
  assert.deepEqual(await reserve(db,actor(1),{invitation_email:20,session_start:1,code_redemption:1,app:1}),{
    allowed:true,retryAfterSeconds:0,remaining:{app:59,session_start:9,code_redemption:9,invitation_email:80}});
});

test('five valid student batches consume 100 recipient attempts and refusal cannot refund them', async t => {
  const db = await fixture(t);
  for(let n=0;n<5;n++)assert.equal((await reserve(db,actor(1),{app:1,invitation_email:20})).allowed,true);
  const before=await state(db);
  const blocked=await reserve(db,actor(1),{app:1,invitation_email:1});
  assert.equal(blocked.allowed,false);assert.ok(blocked.retryAfterSeconds>=29 && blocked.retryAfterSeconds<=30);
  assert.deepEqual(await state(db),before);
});

test('idle-time refill caps the burst; an actor cannot bank an unbounded allowance', async t => {
  const db = await fixture(t);await reserve(db,actor(1),{code_redemption:10});
  await db.exec("update private.actor_rate_buckets set debt_until_us=debt_until_us-86400000000");
  assert.equal((await reserve(db,actor(1),{code_redemption:10})).allowed,true);
  assert.equal((await reserve(db,actor(1),{code_redemption:1})).allowed,false);
});

test('a clock moving behind existing debt cannot grant extra requests', async t => {
  const db = await fixture(t);await reserve(db,actor(1),{code_redemption:10});
  await db.exec('update private.actor_rate_buckets set debt_until_us=debt_until_us+60000000');
  assert.equal((await reserve(db,actor(1),{code_redemption:1})).allowed,false);
});

test('a separately committed reservation survives a later failed business transaction', async t => {
  const db = await fixture(t);await reserve(db,actor(1),{code_redemption:10});const before=await state(db);
  await db.exec('begin');
  await assert.rejects(db.exec("do $$ begin raise exception 'synthetic_bad_code'; end $$;"));
  await db.exec('rollback');
  assert.deepEqual(await state(db),before);
  assert.equal((await reserve(db,actor(1),{code_redemption:1})).allowed,false);
});

test('reservation rollback is atomic and is explicitly not an autonomous transaction', async t => {
  const db = await fixture(t);await db.exec('begin');await reserve(db,actor(1),{code_redemption:10});
  await db.exec('rollback');assert.deepEqual(await state(db),[]);
  assert.equal((await reserve(db,actor(1),{code_redemption:10})).allowed,true);
});

test('bounded cleanup deletes only expired, fully refilled rows and deletion follows the account', async t => {
  const db = await fixture(t);
  for(let n=1;n<=5;n++)await reserve(db,actor(n),{code_redemption:10});
  await db.query("update private.actor_rate_buckets set expires_at=clock_timestamp()-interval '1 day',debt_until_us=0 where actor_id<>$1",[actor(5)]);
  await db.query("update private.actor_rate_buckets set expires_at=clock_timestamp()-interval '1 day' where actor_id=$1",[actor(5)]);
  assert.equal((await db.query('select public.service_purge_idle_actor_rate_buckets(2) n')).rows[0].n,2);
  assert.equal((await state(db)).length,3);
  assert.equal((await db.query('select public.service_purge_idle_actor_rate_buckets(2) n')).rows[0].n,2);
  assert.equal((await state(db)).length,1);
  assert.equal((await db.query('select public.service_purge_idle_actor_rate_buckets(2) n')).rows[0].n,0);
  for(const n of [null,0,-1,501])await assert.rejects(db.query('select public.service_purge_idle_actor_rate_buckets($1)',[n]),e=>e.code==='22023');
  await db.query('delete from auth.users where id=$1',[actor(5)]);assert.deepEqual(await state(db),[]);
});

test('schema and registry reject data that would permit arbitrary-key growth or premature expiry', async t => {
  const db = await fixture(t);
  await assert.rejects(db.exec("insert into private.actor_rate_policies values('attacker-key',1,1000,86400)"),e=>e.code==='23514');
  await assert.rejects(db.exec("update private.actor_rate_policies set retention_seconds=3600,token_interval_us=3600000000 where policy_key='invitation_email'"),e=>e.code==='23514');
  assert.equal((await db.query('select count(*)::int n from private.actor_rate_policies')).rows[0].n,4);
  const definitions=(await db.query("select proname,prosecdef,proconfig from pg_proc where proname in ('reserve_actor_rate_budgets','purge_idle_actor_rate_buckets','service_reserve_actor_rate_budgets','service_purge_idle_actor_rate_buckets')")).rows;
  assert.equal(definitions.length,4);
  assert.ok(definitions.every(x=>x.proconfig.includes('search_path=pg_catalog')));
  assert.ok(definitions.filter(x=>x.proname.startsWith('service_')).every(x=>x.prosecdef===false));
});
