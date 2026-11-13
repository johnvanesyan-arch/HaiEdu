"""Bounded cleanup, privacy, isolation and REAL scheduler proof on an owned DB."""
from pathlib import Path
import json
import sys
import time
import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from bf16_maintenance_postgres import cron_database

passed = []
def check(name):
    passed.append(name)
    print('PASS: ' + name, flush=True)

def health(c):
    return c.execute('select to_jsonb(h) from private.actor_rate_maintenance_health h').fetchone()[0]

def clean(c):
    return c.execute('select private.run_actor_rate_maintenance()').fetchone()[0]

def until(call, predicate, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = call()
        if predicate(value): return value
        time.sleep(.15)
    raise AssertionError('Real scheduler result not observed within fixture deadline: ' + repr(value))

with cron_database() as fixture, psycopg.connect(fixture['uri'], autocommit=True) as owner:
    owner.execute((ROOT / 'tests/fixtures/actor-rate-limiter.sql').read_text())
    owner.execute('alter table auth.users add column deleted_at timestamptz,add column banned_until timestamptz; create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz)')
    owner.execute(next((ROOT / 'supabase/migrations').glob('*_bf16_actor_rate_budgets.sql')).read_text())
    maintenance = next((ROOT / 'supabase/migrations').glob('*_bf16_counter_maintenance.sql'))
    owner.execute(maintenance.read_text())
    assert owner.execute("select extversion from pg_extension where extname='pg_cron'").fetchone()[0] == '1.6'
    job, command = owner.execute("select jobid,command from cron.job where jobname='haiedu-bf16-counter-maintenance'").fetchone()
    assert health(owner)['job_active'] and health(owner)['schedule'] == '*/15 * * * *'
    owner.execute('select cron.alter_job(%s,active:=false)', [job])
    check('real pg_cron installs the exact named 15-minute job without enabling app enforcement')

    for role in ['anon', 'authenticated', 'service_role']:
        with psycopg.connect(fixture['uri'], autocommit=True) as client:
            client.execute('set role ' + role)
            for query in ['select private.run_actor_rate_maintenance()', 'select * from private.actor_rate_maintenance_health']:
                try: client.execute(query)
                except psycopg.Error as error: assert error.sqlstate == '42501'
                else: raise AssertionError('Unexpected maintenance privilege for ' + role)
    check('browser and service API roles cannot run housekeeping or read its private monitor')

    other = owner.execute("select cron.schedule('unrelated-fixture-job','0 0 * * *','select 1')").fetchone()[0]
    owner.execute('select cron.alter_job(%s,active:=false)', [other])
    owner.execute('create role fixture_other_owner login; grant usage on schema cron to fixture_other_owner; grant all on all tables in schema cron to fixture_other_owner; grant all on all sequences in schema cron to fixture_other_owner')
    owner.execute('set role fixture_other_owner')
    same_name = owner.execute("select cron.schedule('haiedu-bf16-counter-maintenance','0 0 * * *','select 2')").fetchone()[0]
    owner.execute('reset role')
    owner.execute('select cron.alter_job(%s,active:=false)', [same_name])
    assert health(owner)['schedule'] == '*/15 * * * *'
    owner.execute("insert into cron.job_run_details(jobid,database,username,command,status,start_time,end_time) values(%s,'postgres','fixture_other_owner','unrelated same name','succeeded',clock_timestamp()-interval '9 days',clock_timestamp()-interval '8 days')", [same_name])
    check('another owner may use the same job name without confusing the owner-specific health lookup')
    owner.execute("insert into private.actor_rate_buckets select u.id,p.policy_key,0,clock_timestamp()-interval '2 days' from auth.users u cross join private.actor_rate_policies p")
    owner.execute("update private.actor_rate_buckets set debt_until_us=(extract(epoch from clock_timestamp()+interval '1 hour')*1000000)::bigint where actor_id='16000000-0000-4000-8000-000000000001' and policy_key='app'")
    owner.execute("update private.actor_rate_buckets set expires_at=clock_timestamp()+interval '1 day' where actor_id='16000000-0000-4000-8000-000000000001' and policy_key='session_start'")
    owner.execute("insert into cron.job_run_details(jobid,database,username,command,status,start_time,end_time) select %s,'postgres','postgres','fixture','succeeded',clock_timestamp()-interval '9 days',clock_timestamp()-interval '8 days' from generate_series(1,601)", [job])
    owner.execute("insert into cron.job_run_details(jobid,database,username,command,status,start_time,end_time) values(%s,'postgres','postgres','unrelated','succeeded',clock_timestamp()-interval '9 days',clock_timestamp()-interval '8 days'),(%s,'postgres','postgres','recent','succeeded',clock_timestamp()-interval '1 minute',clock_timestamp())", [other, job])
    with psycopg.connect(fixture['uri']) as locked:
        locked.execute("select 1 from private.actor_rate_buckets where actor_id='16000000-0000-4000-8000-000000000002' and policy_key='app' for update")
        start = time.monotonic()
        result = clean(owner)
        assert time.monotonic() - start < 3
        assert result == {'skipped': False, 'counterRowsRemoved': 500, 'ownHistoryRowsRemoved': 500}
        assert clean(owner)['counterRowsRemoved'] == 297
        assert owner.execute('select count(*) from private.actor_rate_buckets').fetchone()[0] == 3
    assert clean(owner)['counterRowsRemoved'] == 1
    assert owner.execute('select count(*) from private.actor_rate_buckets').fetchone()[0] == 2
    assert owner.execute('select count(*) from auth.users').fetchone()[0] == 200
    assert owner.execute('select count(*) from cron.job_run_details where jobid=%s', [other]).fetchone()[0] == 1
    assert owner.execute('select count(*) from cron.job_run_details where jobid=%s', [same_name]).fetchone()[0] == 1
    assert owner.execute('select count(*) from cron.job_run_details where jobid=%s', [job]).fetchone()[0] == 1
    assert owner.execute('select command from cron.job where jobid=%s', [other]).fetchone()[0] == 'select 1'
    check('500-row batches skip active locks, preserve unrefilled/unexpired counters and never touch Auth or other-job history')

    with psycopg.connect(fixture['uri']) as running:
        running.execute("select pg_advisory_xact_lock(hashtextextended('haiedu:actor-rate:maintenance:v1',0))")
        assert clean(owner) == {'skipped': True}
    check('a duplicate maintenance invocation skips immediately instead of queuing')

    owner.execute("insert into private.actor_rate_buckets values('16000000-0000-4000-8000-000000000003','app',0,clock_timestamp()-interval '2 days')")
    owner.execute("insert into cron.job_run_details(jobid,database,username,command,status,start_time,end_time) values(%s,'postgres','postgres','fixture','succeeded',clock_timestamp()-interval '9 days',clock_timestamp()-interval '8 days')", [job])
    owner.execute("create function public.fixture_history_failure() returns trigger language plpgsql as $$begin raise exception 'fixture_failure';end$$; create trigger fixture_history_failure before delete on cron.job_run_details for each row execute function public.fixture_history_failure()")
    try: clean(owner)
    except psycopg.Error as error: assert error.sqlstate == 'P0001'
    else: raise AssertionError('Expected fixture history failure')
    assert owner.execute("select count(*) from private.actor_rate_buckets where actor_id='16000000-0000-4000-8000-000000000003'").fetchone()[0] == 1
    owner.execute('drop trigger fixture_history_failure on cron.job_run_details; drop function public.fixture_history_failure()')
    check('a failed history-cleanup transaction rolls back its counter deletion')

    baseline = owner.execute('select coalesce(max(runid),0) from cron.job_run_details').fetchone()[0]
    owner.execute("select cron.alter_job(%s,schedule:='1 seconds',active:=true)", [job])
    until(lambda:owner.execute("select status,return_message from cron.job_run_details where jobid=%s and runid>%s order by runid", [job,baseline]).fetchall(), lambda rows:any(r[0]=='succeeded' for r in rows))
    owner.execute("select cron.alter_job(%s,schedule:='*/15 * * * *',active:=false)", [job])
    assert owner.execute("select count(*) from private.actor_rate_buckets where actor_id='16000000-0000-4000-8000-000000000003'").fetchone()[0] == 0
    assert health(owner)['last_success_at'] is not None
    check('real background scheduler executes the reviewed bounded cleanup command and records success')

    baseline = owner.execute('select coalesce(max(runid),0) from cron.job_run_details').fetchone()[0]
    owner.execute("select cron.alter_job(%s,schedule:='1 seconds',command:='select 1/0',active:=true)", [job])
    until(lambda:owner.execute("select count(*) from cron.job_run_details where jobid=%s and runid>%s and status='failed'", [job,baseline]).fetchone()[0], lambda n:n>0)
    owner.execute("select cron.alter_job(%s,schedule:='*/15 * * * *',command:=%s,active:=true)", [job,command])
    assert health(owner)['maintenance_status'] == 'recent_failure'
    owner.execute((ROOT / 'supabase/proposals/bf16_counter_maintenance_pause.sql').read_text())
    assert health(owner)['maintenance_status'] == 'job_paused'
    assert owner.execute('select count(*) from cron.job where jobid=%s', [other]).fetchone()[0] == 1
    assert owner.execute('select active from cron.job where jobid=%s', [same_name]).fetchone()[0] is False
    check('actual scheduled failures are visible and the pause command preserves other jobs and all counters')

    baseline = owner.execute('select coalesce(max(runid),0) from cron.job_run_details').fetchone()[0]
    with psycopg.connect(fixture['uri']) as blocked:
        blocked.execute('lock table private.actor_rate_buckets in access exclusive mode')
        owner.execute("select cron.alter_job(%s,schedule:='1 seconds',command:=%s,active:=true)", [job,command])
        rows = until(lambda:owner.execute("select status,return_message from cron.job_run_details where jobid=%s and runid>%s order by runid", [job,baseline]).fetchall(), lambda rows:any(r[0]=='failed' for r in rows))
        owner.execute("select cron.alter_job(%s,schedule:='*/15 * * * *',active:=false)", [job])
        assert any(r[0]=='failed' and 'lock timeout' in r[1] for r in rows), rows
    assert owner.execute('select count(*) from private.actor_rate_buckets').fetchone()[0] == 2
    check('the real scheduled command enforces its one-second lock timeout and preserves blocked counters')

    try: owner.execute(maintenance.read_text())
    except psycopg.Error as error:
        owner.execute('rollback')
        assert 'bf16_maintenance_job_already_exists' in str(error)
    else: raise AssertionError('Duplicate installation overwrote a job')
    assert owner.execute('select count(*) from cron.job where jobid=%s', [job]).fetchone()[0] == 1
    check('duplicate installation refuses to overwrite the existing named job')

print(json.dumps({'status':'passed','postgres':'17.6','pgCron':'1.6.7 source / extension1.6','checks':len(passed),'passed':passed,'scope':'isolated owned PostgreSQL and real scheduler; synthetic Auth catalogue; no hosted request/account/classroom acceptance'}),flush=True)
