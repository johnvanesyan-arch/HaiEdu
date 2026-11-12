"""Atomicity/isolation proof on real PostgreSQL17, not browser/Auth capacity QA."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import sys
import time
import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from actor_rate_postgres import database_uri

def actor(n): return f'16000000-0000-4000-8000-{n:012}'
passed = []
def check(name):
    passed.append(name)
    print('PASS: ' + name, flush=True)

def reserve(c, who=1, costs=None):
    return c.execute('select public.service_reserve_actor_rate_budgets(%s,%s)',
                     [actor(who), Jsonb(costs or {'code_redemption':1})]).fetchone()[0]

def snapshot(c):
    return c.execute("select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('version',xmin::text) order by actor_id,policy_key),'[]') from private.actor_rate_buckets b").fetchone()[0]

def parallel(uri, jobs, workers=24):
    def run(job):
        who, costs = job
        with psycopg.connect(uri, autocommit=True) as c:
            c.execute("set statement_timeout='15s'")
            c.execute('set role service_role')
            return reserve(c, who, costs)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(run, jobs))

def wait_for_lock(watch, connection, pending):
    deadline = time.monotonic()+5
    while time.monotonic()<deadline:
        if pending.done(): raise AssertionError('Expected real lock contention')
        row=watch.execute('select wait_event_type from pg_stat_activity where pid=%s',
                          [connection.info.backend_pid]).fetchone()
        if row and row[0]=='Lock': return
        time.sleep(.01)
    raise AssertionError('Caller did not reach its lock wait')

with database_uri() as uri:
    with psycopg.connect(uri, autocommit=True) as owner:
        version=owner.execute('select version()').fetchone()[0]
        assert owner.execute("select current_setting('server_version_num')").fetchone()[0]=='170006'
        print(version,flush=True)
        owner.execute((ROOT/'tests/fixtures/actor-rate-limiter.sql').read_text())
        owner.execute((ROOT/'supabase/proposals/bf16_actor_rate_limiter_core.sql').read_text())

        # Forty independent connections contend for one person's ten tokens.
        started=time.monotonic()
        results=parallel(uri,[(1,{'code_redemption':1})]*40)
        assert time.monotonic()-started<30, 'The no-refill race exceeded its observation window'
        assert sum(r['allowed'] for r in results)==10
        assert all(1<=r['retryAfterSeconds']<=60 for r in results if not r['allowed'])
        check('independent connections admit exactly ten concurrent code attempts')

        before=snapshot(owner)
        results=parallel(uri,[(1,{'app':1,'code_redemption':1})]*24)
        assert not any(r['allowed'] for r in results)
        assert snapshot(owner)==before
        check('concurrent refusal does not partially spend, insert or rewrite a bucket')

        jobs=[(2,{'app':1,'code_redemption':1}) if n%2 else
              (2,{'code_redemption':1,'app':1}) for n in range(30)]
        assert sum(r['allowed'] for r in parallel(uri,jobs))==10
        check('opposite input order cannot deadlock or double-spend missing buckets')

        started=time.monotonic()
        results=parallel(uri,[(3,{'app':1,'invitation_email':20})]*16)
        assert time.monotonic()-started<20
        assert sum(r['allowed'] for r in results)==5
        check('concurrent email attempts admit five 20-recipient batches, 100 recipients total')

        # 120 logical actors submitted together, at most 24 independent DB
        # connections. This has no IP dimension and is NOT network/Auth load QA.
        people=list(range(5,125))
        results=parallel(uri,[(n,{'app':6,'session_start':1,'code_redemption':1}) for n in people])
        assert all(r['allowed'] for r in results)
        assert reserve(owner,5,{'code_redemption':9})['allowed']
        assert not reserve(owner,5,{'code_redemption':1})['allowed']
        assert reserve(owner,5,{'app':1})['allowed']
        assert all(r['allowed'] for r in parallel(uri,[(n,{'app':2,'code_redemption':1}) for n in people[1:]]))
        assert reserve(owner,125,{'app':10,'invitation_email':100})['allowed']
        check('one exhausted actor leaves the other 119 actors and teacher unaffected')

        reserve(owner,126,{'app':60})
        denied=reserve(owner,126,{'app':1})
        assert not denied['allowed'] and denied['retryAfterSeconds']==1
        time.sleep(.55)
        assert reserve(owner,126,{'app':1})['allowed']
        check('the real database clock refills one token after its waiting period')

        reserve(owner,127,{'app':60})
        with psycopg.connect(uri) as blocker, psycopg.connect(uri,autocommit=True) as caller:
            caller.execute("set statement_timeout='10s'")
            blocker.execute('select 1 from private.actor_rate_buckets where actor_id=%s for update',[actor(127)])
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending=pool.submit(reserve,caller,127,{'app':1})
                wait_for_lock(owner,caller,pending)
                time.sleep(.55)
                blocker.commit()
                assert pending.result(timeout=10)['allowed']
        check('allowance time is captured after an actual lock wait, not before it')

        with psycopg.connect(uri) as older:
            older.execute('begin isolation level repeatable read')
            older.execute('select count(*) from private.actor_rate_buckets')
            reserve(owner,128,{'code_redemption':10})
            try: reserve(older,128,{'code_redemption':1})
            except psycopg.Error as error: assert error.sqlstate=='40001',error
            else: raise AssertionError('Stale snapshot invented a fresh allowance')
            older.rollback()
        assert not reserve(owner,128,{'code_redemption':1})['allowed']
        check('stale repeatable-read snapshots fail serialization instead of resetting an allowance')

        reserve(owner,129,{'code_redemption':10})
        before=snapshot(owner)
        with psycopg.connect(uri) as business:
            try: business.execute("do $$begin raise exception 'synthetic_invalid_code';end$$")
            except psycopg.Error: business.rollback()
        assert snapshot(owner)==before
        assert not reserve(owner,129,{'code_redemption':1})['allowed']
        check('a committed reservation survives failure in a separate business connection')

        with psycopg.connect(uri) as caller:
            assert reserve(caller,130,{'code_redemption':10})['allowed']
            caller.rollback()
        assert reserve(owner,130,{'code_redemption':10})['allowed']
        check('rollback of the reservation itself is atomic; callers must commit before work')

        for role in ['anon','authenticated']:
            with psycopg.connect(uri,autocommit=True) as denied:
                denied.execute('set role '+role)
                for statement in ["select public.service_reserve_actor_rate_budgets('"+actor(1)+"','{\"app\":1}')",
                                  'select * from private.actor_rate_buckets',
                                  'select public.service_purge_idle_actor_rate_buckets()']:
                    try: denied.execute(statement)
                    except psycopg.Error as error: assert error.sqlstate=='42501',error
                    else: raise AssertionError('A client role accessed private rate budgets')
        with psycopg.connect(uri,autocommit=True) as service:
            service.execute('set role service_role')
            assert reserve(service,131,{'app':1})['allowed']
            try: service.execute('update private.actor_rate_policies set capacity=10000')
            except psycopg.Error as error: assert error.sqlstate=='42501',error
            else: raise AssertionError('Service role edited the fixed policy registry')
        check('real client roles cannot reserve or inspect state; service cannot edit policy')

        reserve(owner,132,{'code_redemption':10})
        reserve(owner,133,{'code_redemption':10})
        owner.execute("update private.actor_rate_buckets set expires_at=clock_timestamp()-interval '1 day',debt_until_us=0 where actor_id in (%s,%s)",[actor(132),actor(133)])
        with psycopg.connect(uri) as blocker:
            blocker.execute('select 1 from private.actor_rate_buckets where actor_id=%s for update',[actor(132)])
            started=time.monotonic()
            assert owner.execute('select public.service_purge_idle_actor_rate_buckets(1)').fetchone()[0]==1
            assert time.monotonic()-started<2
            assert owner.execute('select count(*) from private.actor_rate_buckets where actor_id=%s',[actor(132)]).fetchone()[0]==1
            blocker.rollback()
        assert owner.execute('select public.service_purge_idle_actor_rate_buckets(1)').fetchone()[0]==1
        check('bounded cleanup skips locked rows instead of blocking an active request')

        with psycopg.connect(uri) as deletion, psycopg.connect(uri,autocommit=True) as caller:
            caller.execute("set statement_timeout='10s'")
            deletion.execute('delete from auth.users where id=%s',[actor(134)])
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending=pool.submit(reserve,caller,134,{'app':1})
                wait_for_lock(owner,caller,pending)
                deletion.commit()
                try: pending.result(timeout=10)
                except psycopg.Error as error: assert error.sqlstate=='22023',error
                else: raise AssertionError('Counter created state after account deletion')
        check('account deletion and reservation cannot leave an orphan counter')

        owner.execute('truncate private.actor_rate_buckets')
        owner.execute("insert into private.actor_rate_buckets select u.id,p.policy_key,0,clock_timestamp()-interval '2 days' from auth.users u cross join private.actor_rate_policies p")
        count=owner.execute('select count(*) from private.actor_rate_buckets').fetchone()[0]
        assert count==796 # 199 fixture users after deletion, four fixed keys each.
        assert owner.execute('select public.service_purge_idle_actor_rate_buckets(500)').fetchone()[0]==500
        assert owner.execute('select count(*) from private.actor_rate_buckets').fetchone()[0]==count-500
        assert owner.execute('select public.service_purge_idle_actor_rate_buckets()').fetchone()[0]==200
        assert owner.execute('select public.service_purge_idle_actor_rate_buckets(500)').fetchone()[0]==96
        check('cleanup enforces its fixed batch bound and finite actor/policy key space')

        print(json.dumps({'status':'passed','checks':len(passed),'postgres':'17.6',
                          'logicalClassroomActors':120,'maximumWorkerConnections':24,
                          'scope':'isolated counter SQL, not real Auth/network/classroom capacity',
                          'productionRequests':0}),flush=True)
