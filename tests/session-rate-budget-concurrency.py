"""Session binding on disposable PostgreSQL 17.6; synthetic Auth catalogue.
This is not hosted Auth, network or classroom capacity acceptance.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import sys
import time
import psycopg
from psycopg.types.json import Jsonb

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/fixtures'))
from actor_rate_postgres import database_uri
def actor(n): return f'16000000-0000-4000-8000-{n:012}'
def session(n): return f'16100000-0000-4000-8000-{n:012}'
def reserve(c,n=1,costs=None):
    return c.execute('select public.service_reserve_session_rate_budgets(%s,%s,%s)',
                     [actor(n),session(n),Jsonb(costs or {'app':1,'code_redemption':1})]).fetchone()[0]
def wait_for_lock(owner,caller,pending):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        if pending.done():raise AssertionError('Expected lock wait')
        row=owner.execute('select wait_event_type from pg_stat_activity where pid=%s',[caller.info.backend_pid]).fetchone()
        if row and row[0]=='Lock':return
        time.sleep(.01)
    raise AssertionError('Lock wait not observed')
def denied(call):
    try:call()
    except psycopg.Error as e:assert e.sqlstate=='42501',e
    else:raise AssertionError('Inactive session admitted')
passed=[]
def check(name):passed.append(name);print('PASS: '+name,flush=True)

with database_uri() as uri,psycopg.connect(uri,autocommit=True) as owner:
    assert owner.execute("select current_setting('server_version_num')").fetchone()[0]=='170006'
    owner.execute((ROOT/'tests/fixtures/actor-rate-limiter.sql').read_text())
    owner.execute("""alter table auth.users add column deleted_at timestamptz,add column banned_until timestamptz;
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
      insert into auth.sessions select replace(id::text,'16000000-','16100000-')::uuid,id,null from auth.users;""")
    migration=next((ROOT/'supabase/migrations').glob('*_bf16_actor_rate_budgets.sql'))
    owner.execute(migration.read_text())
    for role in ['anon','authenticated']:
        with psycopg.connect(uri,autocommit=True) as client:
            client.execute('set role '+role);denied(lambda:reserve(client))
    check('session-bound capability is inaccessible to browser roles')

    def concurrent(job):
        n,costs=job
        with psycopg.connect(uri,autocommit=True) as c:
            c.execute("set statement_timeout='15s'");c.execute('set role service_role');return reserve(c,n,costs)
    with ThreadPoolExecutor(max_workers=24) as pool:
        results=list(pool.map(concurrent,[(1,{'app':1,'code_redemption':1})]*40))
    assert sum(r['allowed'] for r in results)==10
    check('forty independent callers admit only ten code attempts')

    with ThreadPoolExecutor(max_workers=24) as pool:
        results=list(pool.map(concurrent,[(n,{'app':6,'session_start':1,'code_redemption':1}) for n in range(5,125)]))
    assert all(r['allowed'] for r in results)
    assert reserve(owner,5,{'code_redemption':9})['allowed']
    assert not reserve(owner,5,{'code_redemption':1})['allowed']
    with ThreadPoolExecutor(max_workers=24) as pool:
        assert all(r['allowed'] for r in pool.map(concurrent,[(n,{'app':2,'code_redemption':1}) for n in range(6,125)]))
    check('120 synthetic people share no IP counter; one exhausted actor leaves 119 unaffected')

    for n,change in [(130,'expiry'),(131,'revocation'),(132,'ban'),(133,'deletion')]:
        with psycopg.connect(uri) as blocker,psycopg.connect(uri,autocommit=True) as caller:
            caller.execute("set statement_timeout='10s'")
            blocker.execute("select pg_advisory_xact_lock(hashtextextended('haiedu:actor-rate:v1:'||%s,0))",[actor(n)])
            if change=='expiry':owner.execute("update auth.sessions set not_after=clock_timestamp()+interval '200 milliseconds' where id=%s",[session(n)])
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending=pool.submit(reserve,caller,n)
                wait_for_lock(owner,caller,pending)
                if change=='expiry':time.sleep(.25)
                elif change=='revocation':owner.execute('delete from auth.sessions where id=%s',[session(n)])
                elif change=='ban':owner.execute("update auth.users set banned_until=clock_timestamp()+interval '1 hour' where id=%s",[actor(n)])
                else:owner.execute('update auth.users set deleted_at=clock_timestamp() where id=%s',[actor(n)])
                blocker.commit();denied(lambda:pending.result(timeout=10))
        assert owner.execute('select count(*) from private.actor_rate_buckets where actor_id=%s',[actor(n)]).fetchone()[0]==0
        check(change+' during a real lock wait rolls back the reservation')

    assert reserve(owner,140,{'app':1})['allowed']
    before=owner.execute('select debt_until_us from private.actor_rate_buckets where actor_id=%s',[actor(140)]).fetchone()
    with psycopg.connect(uri) as business:
        try:business.execute("do $$begin raise exception 'synthetic_business_failure';end$$")
        except psycopg.Error:business.rollback()
    assert owner.execute('select debt_until_us from private.actor_rate_buckets where actor_id=%s',[actor(140)]).fetchone()==before
    check('separate business rollback does not refund admission')

    owner.execute((ROOT/'supabase/proposals/bf16_actor_rate_budgets_rollback.sql').read_text())
    assert owner.execute('select count(*) from auth.users').fetchone()[0]==200
    owner.execute(migration.read_text());assert reserve(owner,140)['allowed']
    check('rollback/reapply preserves Auth rows and restores admission')
print(json.dumps({'postgres':'17.6','checks':len(passed),'passed':passed,'scope':'isolated SQL; synthetic Auth catalogue; no hosted capacity or production QA'}),flush=True)
