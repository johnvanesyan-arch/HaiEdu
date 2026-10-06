"""Learning API transaction races, using isolated PostgreSQL connections only."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import re
import subprocess
import sys
import time
import psycopg

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/fixtures'))
from phase3_postgres import database_uri
def ident(n): return f'71000000-0000-4000-8000-{n:012}'
setup=json.loads(subprocess.run(['node','tests/fixtures/governed-runtime-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
def fixture_query(c,q):
    params=[]
    def slot(m): params.append(q['params'][int(m.group(1))-1]); return '%s'
    sql=re.sub(r'\$(\d+)',slot,q['sql'])
    c.execute(sql,params) if params else c.execute(sql)
def launch(c,mode='diagnostic'):
    bp={'diagnostic':740,'practice':750,'mastery_check':760,'chapter_review':770}[mode]
    return c.execute('select service_launch_governed_learning(%s,%s,%s,%s,null,null,false)',[ident(10),ident(401),ident(371),ident(bp)]).fetchone()[0]
def operation(c,session,action,payload=None):
    return c.execute('select service_governed_learning_operation(%s,%s,%s,%s,%s::jsonb)',[ident(10),ident(401),session,action,json.dumps(payload or {})]).fetchone()[0]
def answer_payload(c,item,correct=True):
    if item['item']['type']=='true_false': value=correct
    else:
        order=c.execute('select canonical_option_order from private.learning_session_item_option_orders where session_item_id=%s',[item['sessionItemId']]).fetchone()[0]
        value=chr(65+order.index('A' if correct else 'B'))
    return dict(sessionItemId=item['sessionItemId'],itemId=item['item']['id'],response=dict(value=value))
def finish(c,session,correct=True):
    result=None
    for _ in range(100):
        item=operation(c,session,'serve')
        if item.get('complete'): return result
        result=operation(c,session,'answer',answer_payload(c,item,correct))
    raise AssertionError('Unbounded learning session')
def race(uri,first,second,rollback=False,delay=0):
    with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watch:
        a.execute("set statement_timeout='12s'");b.execute("set statement_timeout='12s'")
        result=first(a)
        def later():
            try: value=second(b);b.commit();return value
            except psycopg.Error as e:b.rollback();return dict(error=str(e),code=e.sqlstate)
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(later);deadline=time.monotonic()+6;blocked=False
            while time.monotonic()<deadline and not pending.done():
                row=watch.execute('select wait_event_type from pg_stat_activity where pid=%s',[b.info.backend_pid]).fetchone()
                if row and row[0]=='Lock':blocked=True;break
                time.sleep(.02)
            if delay: time.sleep(delay)
            a.rollback() if rollback else a.commit()
            value=pending.result(timeout=15)
            assert blocked,'Expected a competing transaction to wait for the lock'
            return result,value

with database_uri() as uri:
    with psycopg.connect(uri,autocommit=True) as c:
        print(c.execute('select version()').fetchone()[0],flush=True)
        c.execute(setup['predecessor']);c.execute(setup['foundation'])
        for q in setup['queries']:fixture_query(c,q)
        c.execute(setup['extension'])
        for q in setup['runtimeQueries']:fixture_query(c,q)
        c.execute(setup['migration'])
        diagnostic=launch(c)['session']['id'];finish(c,diagnostic,False)
        session=launch(c,'practice')['session']['id']
        first,second=race(uri,lambda a:operation(a,session,'serve'),lambda b:operation(b,session,'serve'))
        assert first['sessionItemId']==second['sessionItemId'] and first['item']==second['item']
        assert c.execute('select count(*) from student_item_exposure_events where session_id=%s',[session]).fetchone()[0]==1
        print('PASS: concurrent adaptive delivery creates one assignment, option order and exposure',flush=True)
        payload=answer_payload(c,first)
        first,second=race(uri,lambda a:operation(a,session,'answer',payload),lambda b:operation(b,session,'answer',payload))
        assert second.get('code')=='P0001' and 'session_item_already_answered' in second['error']
        assert c.execute('select count(*) from attempts where learning_session_id=%s',[session]).fetchone()[0]==1
        print('PASS: duplicate answer contributes evidence and counters once',flush=True)
        item=operation(c,session,'serve');payload=answer_payload(c,item)
        before=c.execute('select answered_count from learning_sessions where id=%s',[session]).fetchone()[0]
        first,second=race(uri,lambda a:operation(a,session,'answer',payload),lambda b:operation(b,session,'answer',payload),rollback=True)
        assert second['attemptId']!=first['attemptId']
        assert c.execute('select answered_count from learning_sessions where id=%s',[session]).fetchone()[0]==before+1
        print('PASS: rolled-back answer leaves no partial attempt, mastery or progress',flush=True)
        item=operation(c,session,'serve');payload=answer_payload(c,item)
        c.execute("insert into item_template_remediation_guides values(%s,%s,'published',null,1,'Title','Strategy','Hint','Hint2','Example','[]')",[ident(951),ident(902)])
        revocations=[
          ('enrollment',"update institutional_class_enrollments set status='ended' where id=%s",371,"update institutional_class_enrollments set status='active' where id=%s"),
          ('teacher grant',"update teacher_subject_authorizations set status='revoked' where id=%s",361,"update teacher_subject_authorizations set status='active' where id=%s"),
          ('student account',"update profiles set account_status='suspended' where id=%s",10,"update profiles set account_status='active' where id=%s"),
          ('Auth session',"update auth.sessions set not_after='2020-01-01' where id=%s",401,"update auth.sessions set not_after=null where id=%s"),
        ]
        for name,sql,n,restore in revocations:
            for action in ['serve','answer','help','status']:
                first,second=race(uri,lambda a:a.execute(sql,[ident(n)]),lambda b:operation(b,session,action,payload))
                assert second.get('code')=='P0001' and 'learning_context_unavailable' in second['error'],second
                c.execute(restore,[ident(n)])
                assert c.execute('select answered_count from learning_sessions where id=%s',[session]).fetchone()[0]==before+1
                assert c.execute('select count(*) from remediation_events').fetchone()[0]==0
                print(f'PASS: {name} revocation wins before {action}',flush=True)
        # Expiry after context authorization but while waiting for content locks
        # must roll back answer, counters and mastery evidence together.
        c.execute("update auth.sessions set not_after=clock_timestamp()+interval '1 second' where id=%s",[ident(401)])
        first,second=race(uri,lambda a:a.execute('select id from items where id=%s for update',[item['item']['id']]),lambda b:operation(b,session,'answer',payload),delay=1.2)
        assert second.get('code')=='P0001' and 'learning_context_unavailable' in second['error'],second
        assert c.execute('select answered_count from learning_sessions where id=%s',[session]).fetchone()[0]==before+1
        c.execute('update auth.sessions set not_after=null where id=%s',[ident(401)])
        print('PASS: expiry during content lock wait rolls back all pending answer evidence',flush=True)
        # Finish practice, then exercise competing mastery finalization and retry gates.
        finish(c,session)
        for skill in [521,522]:
            c.execute("insert into student_skill_mastery_by_release values(%s,%s,%s,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set mastery_score=.9,evidence_count=10",[ident(501),ident(10),ident(skill)])
        first,second=race(uri,lambda a:launch(a,'mastery_check'),lambda b:launch(b,'mastery_check'))
        assert first['session']['id']==second['session']['id'] and second['resumed']
        print('PASS: concurrent mastery starts allocate one attempt',flush=True)
        mastery=first['session']['id']
        for _ in range(2):
            item=operation(c,mastery,'serve');operation(c,mastery,'answer',answer_payload(c,item,False))
        item=operation(c,mastery,'serve');payload=answer_payload(c,item,False)
        first,second=race(uri,lambda a:operation(a,mastery,'answer',payload),lambda b:operation(b,mastery,'answer',payload))
        assert first['finalResult']['lifecycle']['lifecycleState']=='review_required_attempt_2'
        assert second.get('code')=='P0001'
        assert c.execute('select count(*) from chapter_review_requirements').fetchone()[0]==1
        print('PASS: final mastery answer and review requirement commit together once',flush=True)
        first,second=race(uri,lambda a:launch(a,'chapter_review'),lambda b:launch(b,'chapter_review'))
        assert first['session']['id']==second['session']['id'] and second['resumed']
        assert c.execute('select count(*) from chapter_review_cycles').fetchone()[0]==1
        assert c.execute('select count(*) from chapter_review_item_exposures').fetchone()[0]==3
        print('PASS: concurrent review starts allocate one cycle/session and selection history',flush=True)
        review=first['session']['id'];finish(c,review,False)
        next_check=launch(c,'mastery_check')
        assert next_check['session']['mastery_attempt_number']==2
        assert c.execute('select preceding_required_review_id from mastery_check_attempts where learning_session_id=%s',[next_check['session']['id']]).fetchone()[0] is not None
        print('PASS: completed qualifying review unlocks exactly the next linked attempt',flush=True)
