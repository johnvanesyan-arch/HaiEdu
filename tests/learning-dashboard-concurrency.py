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
setup=json.loads(subprocess.run(['node','tests/fixtures/learning-dashboard-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
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
        c.execute(setup['migration']);c.execute(setup['dashboardFixtureSQL']);c.execute(setup['dashboardMigration'])
        def dashboard(conn): return conn.execute('select service_student_learning_dashboard(%s,%s,%s,%s,%s)',[ident(10),ident(401),ident(371),ident(501),ident(511)]).fetchone()[0]
        def navigation(conn): return conn.execute('select service_student_learning_navigation(%s,%s)',[ident(10),ident(401)]).fetchone()[0]
        assert len(navigation(c)['contexts'])==3
        before=c.execute('select count(*) from learning_sessions').fetchone()[0]
        assert dashboard(c)['practiceAccess']['unlocked'] is False
        assert c.execute('select count(*) from learning_sessions').fetchone()[0]==before
        print('PASS: read-only dashboard and navigation create no sessions',flush=True)
        for label,sql,restore in [
          ('enrollment',"update institutional_class_enrollments set status='ended' where id=%s","update institutional_class_enrollments set status='active' where id=%s"),
          ('teacher grant',"update teacher_subject_authorizations set status='revoked' where id=%s","update teacher_subject_authorizations set status='active' where id=%s"),
          ('Auth session',"update auth.sessions set not_after='2020-01-01' where id=%s","update auth.sessions set not_after=null where id=%s"),
        ]:
            target=371 if label=='enrollment' else 361 if label=='teacher grant' else 401
            _,result=race(uri,lambda a:a.execute(sql,[ident(target)]).rowcount,dashboard)
            assert result.get('code')=='P0001' and 'learning_context_unavailable' in result['error'],result
            c.execute(restore,[ident(target)])
            print('PASS: dashboard blocks behind '+label+' revocation and denies after commit',flush=True)
        _,result=race(uri,lambda a:a.execute("update institutional_class_enrollments set valid_to=clock_timestamp()+interval '500 milliseconds' where id=%s",[ident(371)]).rowcount,dashboard,delay=.7)
        assert result.get('code')=='P0001' and 'learning_context_unavailable' in result['error'],result
        print('PASS: final authorization clock is checked after a blocked dashboard read',flush=True)
