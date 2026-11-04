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

        c.execute('delete from auth.sessions where id=%s',(ident(901),))
        try:receipt(c)
        except psycopg.Error as error:assert 'learning_context_unavailable' in str(error)
        else:raise AssertionError('Revoked session received a receipt')
        once();print('PASS: revoked Auth cannot recover private feedback',flush=True)
print('PASS: 8 independent-connection answer-recovery scenarios',flush=True)
