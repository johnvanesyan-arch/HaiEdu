"""Real independent connections; only the fixed disposable PostgreSQL fixture."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import subprocess
import sys
import time
import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from phase3_postgres import database_uri

def ident(n): return f'60000000-0000-4000-8000-{n:012}'
ACTOR = '10000000-0000-4000-8000-000000000010'
def body(n=1): return dict(sessionId=ident(401),sessionItemId=ident(600+n),itemId=ident(500+n),response={'value':5},responseTimeMs=1000,hintUsed=False)
def record(c,n=1):
    return c.execute('select public.service_record_session_answer_atomic('+','.join(['%s']*13)+')',[
        ACTOR,ident(401),ident(600+n),ident(500+n),ident(50),Jsonb({'value':5}),None,1,True,None,False,1000,'2026-11-04T07:00:00Z'
    ]).fetchone()[0]
def receipt(c,request=None,response=None):
    telemetry=None if response is None else dict(policyScope='core_after_attempt',surface='submit_answer_api',action='practice_skill',modelProvenanceStatus='exact',stateSnapshot={},recommendationSnapshot={'action':'practice_skill'})
    return c.execute('select public.service_legacy_answer_response(%s,%s,%s,%s,%s,%s)',[
        ACTOR,ident(901),'legacy-answer',Jsonb(request or body()),None if response is None else Jsonb(response),None if telemetry is None else Jsonb(telemetry)
    ]).fetchone()[0]
def race(uri,first,second,rollback=False):
    with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watch:
        a.execute("set statement_timeout='10s'");b.execute("set statement_timeout='10s'")
        original=first(a)
        def later():
            value=second(b);b.commit();return value
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(later);deadline=time.monotonic()+5;blocked=False
            while time.monotonic()<deadline and not pending.done():
                row=watch.execute('select wait_event_type from pg_stat_activity where pid=%s',(b.info.backend_pid,)).fetchone()
                if row and row[0]=='Lock':blocked=True;break
                time.sleep(.02)
            if rollback:a.rollback()
            else:a.commit()
            result=pending.result(timeout=12)
            assert blocked,'The second request must wait for the transaction boundary'
            return original,result

def wait_for_lock(watch,connection,pending):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        if pending.done():
            raise AssertionError(f'Expected a lock wait, got {pending.result()!r}')
        row=watch.execute('select wait_event_type from pg_stat_activity where pid=%s',(connection.info.backend_pid,)).fetchone()
        if row and row[0]=='Lock':return
        time.sleep(.02)
    raise AssertionError('The test request never reached its expected lock wait')

def denied_receipt(connection,response=None):
    try:receipt(connection,response=response)
    except psycopg.Error as error:
        connection.rollback()
        assert 'learning_context_unavailable' in str(error),error
        return True
    connection.rollback()
    return False

with database_uri() as uri:
    with psycopg.connect(uri,autocommit=True) as c:
        c.execute("set statement_timeout='15s'")
        print(c.execute('select version()').fetchone()[0],flush=True)
        c.execute((ROOT/'tests/fixtures/answer-scoring.sql').read_text())
        guards=(ROOT/'supabase/migrations/20260927190434_chapter_diagnostic_practice_gate.sql').read_text()
        c.execute(guards[:guards.index('-- A locked pre-diagnostic')])
        c.execute((ROOT/'supabase/migrations/20261004094811_atomic_answer_mastery_evidence.sql').read_text())
        for sql in json.loads(subprocess.check_output(['node','tests/fixtures/answer-recovery-export.mjs'],cwd=ROOT,text=True,timeout=30)):
            c.execute(sql)
        print('PASS: answer-recovery fixture initialized',flush=True)
        def reset():
            c.execute('truncate private.learning_answer_receipts,recommendation_events,attempts,student_skill_mastery,student_skill_mastery_by_release,fixture_exposures')
            c.execute('update learning_session_items set attempt_id=null,answered_at=null')
            c.execute("update learning_sessions set answered_count=0,correct_count=0,status='active',planned_item_count=20 where mode='practice'")
        def once():
            assert c.execute('select count(*) from attempts').fetchone()[0]==1
            assert c.execute('select evidence_count from student_skill_mastery').fetchone()[0]==1
            assert c.execute('select answered_count from learning_sessions where id=%s',(ident(401),)).fetchone()[0]==1

        first,duplicate=race(uri,record,record)
        assert duplicate['replayed'] and duplicate['masteryAfter']==first['masteryAfter'];once()
        print('PASS: concurrent identical recording returns frozen mastery once',flush=True)
        final={'grading':{'correct':True},'mastery':first['masteryAfter'],'recommendation':{'action':'practice_skill','instanceId':None}}
        published,replay=race(uri,lambda a:receipt(a,response=final),lambda b:receipt(b,response={'unexpected':'later builder'}))
        assert replay['replayed'] and replay['response']==published['response'];once()
        assert c.execute('select count(*) from recommendation_events').fetchone()[0]==1
        print('PASS: response and recommendation publication has one winner',flush=True)

        reset()
        first,recovered=race(uri,record,receipt)
        assert recovered['coreResult']['masteryAfter']==first['masteryAfter'];once()
        print('PASS: a response builder waits for committed core state',flush=True)
        reset()
        _,after_rollback=race(uri,record,receipt,rollback=True)
        assert after_rollback['coreResult'] is None
        assert c.execute('select count(*) from attempts').fetchone()[0]==0
        assert c.execute('select count(*) from private.learning_answer_receipts').fetchone()[0]==0
        print('PASS: rollback exposes no answer or partial receipt',flush=True)

        record(c)
        try:receipt(c,{**body(),'response':{'value':0}})
        except psycopg.Error as error:assert 'answer_response_conflict' in str(error)
        else:raise AssertionError('Changed request was accepted')
        once();print('PASS: conflicting retry cannot reuse the saved result',flush=True)

        reset();c.execute('update learning_sessions set planned_item_count=1 where id=%s',(ident(401),))
        first,recovered=race(uri,record,receipt)
        assert recovered['coreResult']['sessionAfter']['status']=='completed';once()
        print('PASS: the final answer remains recoverable after completion',flush=True)

        reset()
        with psycopg.connect(uri) as older:
            older.execute('begin isolation level repeatable read')
            older.execute('select count(*) from private.learning_answer_receipts')
            record(c)
            try:receipt(older)
            except psycopg.Error as error:assert error.sqlstate=='40001',error
            else:raise AssertionError('Stale snapshot did not fail serialization')
            older.rollback()
        once();print('PASS: repeatable-read stale snapshots cannot invent an absent receipt',flush=True)

        # A replay starts valid, waits for a real learning-session row lock, and
        # resumes after expiry. The transaction-start validator alone permits it.
        receipt(c,response=final)
        with psycopg.connect(uri) as blocker,psycopg.connect(uri) as caller,psycopg.connect(uri,autocommit=True) as watch:
            caller.execute("set statement_timeout='10s'")
            blocker.execute('select id from learning_sessions where id=%s for update',(ident(401),))
            expires=c.execute("update auth.sessions set not_after=clock_timestamp()+interval '1 second' returning not_after").fetchone()[0]
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending=pool.submit(denied_receipt,caller)
                try:
                    wait_for_lock(watch,caller,pending)
                    watch.execute('select pg_sleep(greatest(0,extract(epoch from (%s-clock_timestamp())))+.02)',(expires,))
                finally:blocker.commit()
                assert pending.result(timeout=12),'An expired queued replay returned private feedback'
        c.execute('update auth.sessions set not_after=null');once()
        print('PASS: replay rechecks expiry after an independent learning-session lock wait',flush=True)

        # Each revocation wins before the reply acquires identity locks. The
        # request must wait, observe the committed cutover, and return no feedback.
        revocations=[
            ('Auth session deletion','delete from auth.sessions where id=%s',(ident(901),),
             "insert into auth.sessions(id,user_id) values('"+ident(901)+"','"+ACTOR+"')"),
            ('profile suspension',"update profiles set account_status='suspended' where id=%s",(ACTOR,),
             "update profiles set account_status='active'"),
            ('Auth user ban',"update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=%s",(ACTOR,),
             'update auth.users set banned_until=null'),
        ]
        for label,change,params,restore in revocations:
            with psycopg.connect(uri) as revoker,psycopg.connect(uri) as caller,psycopg.connect(uri,autocommit=True) as watch:
                caller.execute("set statement_timeout='10s'")
                revoker.execute(change,params)
                with ThreadPoolExecutor(max_workers=1) as pool:
                    pending=pool.submit(denied_receipt,caller)
                    try:wait_for_lock(watch,caller,pending)
                    finally:revoker.commit()
                    assert pending.result(timeout=12),label+' did not deny the queued receipt'
            c.execute(restore);once()
            print('PASS: '+label+' wins before queued receipt authorization',flush=True)

        # In the reverse order, a valid replay keeps its identity locks through
        # commit. Logout waits; no response may straddle a completed revocation.
        with psycopg.connect(uri) as caller,psycopg.connect(uri) as revoker,psycopg.connect(uri,autocommit=True) as watch:
            revoker.execute("set statement_timeout='10s'")
            assert receipt(caller)['replayed']
            def revoke():
                revoker.execute('delete from auth.sessions where id=%s',(ident(901),));revoker.commit();return True
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending=pool.submit(revoke)
                try:wait_for_lock(watch,revoker,pending)
                finally:caller.commit()
                assert pending.result(timeout=12)
        c.execute('insert into auth.sessions(id,user_id) values(%s,%s)',(ident(901),ACTOR));once()
        print('PASS: a valid replay retains its Auth lock until commit before logout proceeds',flush=True)

        # Finalization waits in real SQL telemetry before its final clock check.
        # Expiry must roll back only new publication, preserving the saved core.
        reset();record(c)
        c.execute("create function private.fixture_wait_for_expiry() returns trigger language plpgsql as $$begin perform pg_sleep_until((select not_after from auth.sessions limit 1)+interval '20 milliseconds');return new;end$$")
        c.execute('create trigger fixture_wait_for_expiry before insert on recommendation_events for each row execute function private.fixture_wait_for_expiry()')
        c.execute("update auth.sessions set not_after=clock_timestamp()+interval '1 second'")
        assert denied_receipt(c,response=final)
        assert c.execute('select response is null from private.learning_answer_receipts').fetchone()[0]
        assert c.execute('select count(*) from recommendation_events').fetchone()[0]==0
        once()
        c.execute('drop trigger fixture_wait_for_expiry on recommendation_events')
        c.execute('update auth.sessions set not_after=null')
        assert receipt(c,response=final)['response']['recommendation']['instanceId']
        once();print('PASS: publication expiry rolls back telemetry/response and resumes the saved core once',flush=True)

        c.execute('delete from auth.sessions where id=%s',(ident(901),))
        try:receipt(c)
        except psycopg.Error as error:assert 'learning_context_unavailable' in str(error)
        else:raise AssertionError('Revoked session received a receipt')
        once();print('PASS: revoked Auth cannot recover private feedback',flush=True)
print('PASS: 14 PostgreSQL answer-recovery scenarios, including independent expiry/revocation waits',flush=True)
