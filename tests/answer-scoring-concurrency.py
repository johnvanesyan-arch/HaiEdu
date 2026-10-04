"""Independent PostgreSQL connections; synthetic loopback CI/Unix-socket fixture only."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
import time
import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tests/fixtures'))
from phase3_postgres import database_uri

def ident(n): return f'60000000-0000-4000-8000-{n:012}'
ACTOR = '10000000-0000-4000-8000-000000000010'
SQL = 'select public.service_record_session_answer_atomic('+','.join(['%s']*13)+')'
def answer(c,n,correct=True,session=None,assignment=None):
    values=[ACTOR,ident(session or (402 if n>10 else 401)),ident(assignment or 600+n),
            ident(500+n),ident(50),'{}',None,int(correct),correct,None,False,None,'2026-10-04T09:00:00Z']
    return c.execute(SQL,values).fetchone()[0]

def race(uri,first,second,rollback=False):
    with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watch:
        a.execute("set statement_timeout='10s'");b.execute("set statement_timeout='10s'")
        first_result=first(a)
        def later():
            result=second(b);b.commit();return result
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(later);deadline=time.monotonic()+5;blocked=False
            while time.monotonic()<deadline and not pending.done():
                row=watch.execute('select wait_event_type from pg_stat_activity where pid=%s',(b.info.backend_pid,)).fetchone()
                if row and row[0]=='Lock': blocked=True;break
                time.sleep(.02)
            if rollback:a.rollback()
            else:a.commit()
            result=pending.result(timeout=12)
            assert blocked,'Second connection did not wait for the transaction lock'
            return first_result,result

with database_uri() as uri:
    with psycopg.connect(uri,autocommit=True) as c:
        print(c.execute('select version()').fetchone()[0],flush=True)
        c.execute((ROOT/'tests/fixtures/answer-scoring.sql').read_text())
        guards=(ROOT/'supabase/migrations/20260927190434_chapter_diagnostic_practice_gate.sql').read_text()
        c.execute(guards[:guards.index('-- A locked pre-diagnostic')])
        migration=next((ROOT/'supabase/migrations').glob('*_atomic_answer_mastery_evidence.sql'))
        c.execute(migration.read_text())
        def reset():
            c.execute('truncate attempts,student_skill_mastery,student_skill_mastery_by_release,fixture_exposures')
            c.execute('update learning_session_items set attempt_id=null,answered_at=null')
            c.execute("update learning_sessions set answered_count=0,correct_count=0,status='active' where mode='practice'")
        def state(release=201):
            return c.execute('select alpha_evidence,beta_evidence,evidence_count from student_skill_mastery_by_release where curriculum_release_id=%s',(ident(release),)).fetchone()
        def check(alpha,beta,count,release=201):
            row=state(release);assert abs(float(row[0])-alpha)<1e-12 and abs(float(row[1])-beta)<1e-12 and row[2]==count,row
        race(uri,lambda a:answer(a,1),lambda b:answer(b,2,False));check(3.1,3.1,2)
        assert c.execute('select count(*) from attempts').fetchone()[0]==2
        print('PASS: distinct answers, absent initial mastery row, same skill',flush=True)
        race(uri,lambda a:answer(a,3),lambda b:answer(b,4,False));check(4.2,4.2,4)
        print('PASS: existing mastery row retains every contribution',flush=True)
        reset();first,duplicate=race(uri,lambda a:answer(a,1),lambda b:answer(b,1,False))
        assert duplicate['replayed'] and duplicate['attemptId']==first['attemptId'];check(3.1,2,1)
        assert c.execute('select count(*) from fixture_exposures').fetchone()[0]==1
        print('PASS: duplicate assignment does not duplicate attempt, progress, counters or exposure',flush=True)
        reset();race(uri,lambda a:answer(a,1),lambda b:answer(b,2,False),rollback=True);check(2,3.1,1)
        print('PASS: rollback releases lock and leaves no partial first answer',flush=True)
        reset()
        c.execute("insert into learning_sessions select %s,student_id,unit_code,mode,status,planned_item_count,0,0,null,null,curriculum_release_id,learning_model_configuration_id,assessment_blueprint_id,metadata,provenance_status,model_provenance_status from learning_sessions where id=%s",(ident(405),ident(401)))
        c.execute('insert into learning_session_items(id,session_id,item_id,skill_id,ordinal) values(%s,%s,%s,%s,1)',(ident(621),ident(405),ident(502),ident(50)))
        race(uri,lambda a:answer(a,1),lambda b:answer(b,2,False,session=405,assignment=621));check(3.1,3.1,2)
        print('PASS: separate sessions serialize the shared learner/skill evidence',flush=True)
        reset();race(uri,lambda a:answer(a,1),lambda b:answer(b,11));check(3.1,2,1);check(3.8,1,1,202)
        print('PASS: separate releases and configurations remain isolated',flush=True)
        reset();c.execute('update learning_sessions set planned_item_count=1 where id=%s',(ident(401),))
        first,duplicate=race(uri,lambda a:answer(a,1),lambda b:answer(b,1));check(3.1,2,1)
        assert duplicate['replayed']
        assert c.execute('select status,answered_count,correct_count from learning_sessions where id=%s',(ident(401),)).fetchone()==('completed',1,1)
        print('PASS: duplicate final answer cannot duplicate completion',flush=True)
print('PASS: 7 independent-connection scoring races',flush=True)
