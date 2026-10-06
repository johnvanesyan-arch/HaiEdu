"""Independent connections in a disposable local/CI PostgreSQL fixture only."""
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
def ident(n):return f'71000000-0000-4000-8000-{n:012}'
setup=json.loads(subprocess.run(['node','tests/fixtures/governed-session-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
START='select service_start_governed_session_atomic(%s,%s,%s,%s,%s,%s,%s::uuid[])'
def begin(c,binding,unit=0):
    return c.execute(START,[ident(10),ident(401),ident(371),binding,ident(760+100*unit),None,[ident(701+100*unit),ident(702+100*unit),ident(703+100*unit)]]).fetchone()[0]
def race(uri,first,second,rollback=False,delay=0):
    with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watch:
        a.execute("set statement_timeout='12s'");b.execute("set statement_timeout='12s'")
        result=first(a)
        def later():
            try:r=second(b);b.commit();return r
            except psycopg.Error as e:b.rollback();return {'error':str(e),'code':e.sqlstate}
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(later);deadline=time.monotonic()+6;blocked=False
            while time.monotonic()<deadline and not pending.done():
                row=watch.execute('select wait_event_type from pg_stat_activity where pid=%s',[b.info.backend_pid]).fetchone()
                if row and row[0]=='Lock':blocked=True;break
                time.sleep(.02)
            if delay:time.sleep(delay)
            if rollback:a.rollback()
            else:a.commit()
            later_result=pending.result(timeout=15)
            assert blocked,'Expected independent connection to wait for the transaction lock'
            return result,later_result

with database_uri() as uri:
    with psycopg.connect(uri,autocommit=True) as c:
        print(c.execute('select version()').fetchone()[0],flush=True)
        c.execute(setup['predecessor']);c.execute(setup['migration'])
        for q in setup['queries']:c.execute(re.sub(r'\$\d+','%s',q['sql']),q['params'])
        binding=c.execute('select service_bind_assessment_policy(%s)',[ident(740)]).fetchone()[0]
        binding2=c.execute('select service_bind_assessment_policy(%s)',[ident(840)]).fetchone()[0]
        def reset():c.execute('truncate learning_session_items,learning_sessions')
        def empty():assert c.execute('select count(*) from learning_sessions').fetchone()[0]==0
        first,second=race(uri,lambda a:begin(a,binding),lambda b:begin(b,binding))
        assert second['resumed'] and first['session']['id']==second['session']['id']
        assert c.execute('select count(*) from learning_session_items').fetchone()[0]==3
        print('PASS: duplicate starts resume one header and exactly one assignment set',flush=True)
        reset();first,second=race(uri,lambda a:begin(a,binding),lambda b:begin(b,binding),rollback=True)
        assert not second['resumed'] and first['session']['id']!=second['session']['id']
        assert c.execute('select count(*) from learning_sessions').fetchone()[0]==1
        print('PASS: rolled-back start leaves no partial session',flush=True)
        reset()
        revocations=[
          ('enrollment',"update institutional_class_enrollments set status='ended' where id=%s",371,"update institutional_class_enrollments set status='active' where id=%s"),
          ('membership',"update institutional_memberships set status='ended' where id=%s",331,"update institutional_memberships set status='active' where id=%s"),
          ('teacher assignment',"update teacher_assignments set status='ended' where id=%s",351,"update teacher_assignments set status='active' where id=%s"),
          ('teacher profile',"update profiles set account_status='suspended' where id=%s",20,"update profiles set account_status='active' where id=%s"),
          ('student profile',"update profiles set account_status='suspended' where id=%s",10,"update profiles set account_status='active' where id=%s"),
          ('year',"update academic_years set status='closed' where id=%s",311,"update academic_years set status='active' where id=%s"),
          ('Auth session',"update auth.sessions set not_after='2020-01-01' where id=%s",401,"update auth.sessions set not_after=null where id=%s"),
        ]
        for name,sql,n,restore in revocations:
            first,second=race(uri,lambda a:a.execute(sql,[ident(n)]),lambda b:begin(b,binding))
            assert second.get('code')=='P0001' and 'learning_context_unavailable' in second['error'],second
            empty();c.execute(restore,[ident(n)])
            print('PASS: '+name+' revocation wins before start',flush=True)
        def offboard(a):
            a.execute("select pg_advisory_xact_lock(hashtextextended('teacher-offboarding:'||%s,0))",[ident(341)])
            a.execute("update institutional_memberships set status='ended' where id=%s",[ident(341)])
            a.execute("update teacher_assignments set status='ended' where id=%s",[ident(351)])
        first,second=race(uri,offboard,lambda b:begin(b,binding))
        assert second.get('code')=='P0001' and 'learning_context_unavailable' in second['error'],second;empty()
        c.execute("update institutional_memberships set status='active' where id=%s",[ident(341)])
        c.execute("update teacher_assignments set status='active' where id=%s",[ident(351)])
        print('PASS: existing teacher offboarding lock excludes session creation',flush=True)
        first,second=race(uri,lambda a:begin(a,binding),lambda b:b.execute("update institutional_class_enrollments set status='ended' where id=%s",[ident(371)]).rowcount)
        assert second==1
        try:begin(c,binding)
        except psycopg.Error as e:assert 'learning_context_unavailable' in str(e)
        else:raise AssertionError('Revoked enrollment resumed a session')
        assert c.execute('select count(*) from learning_sessions').fetchone()[0]==1
        c.execute("update institutional_class_enrollments set status='active' where id=%s",[ident(371)]);reset()
        print('PASS: start wins first; later termination preserves history and denies resume',flush=True)
        first,second=race(uri,lambda a:a.execute("update items set status='retired' where id=%s",[ident(701)]),lambda b:begin(b,binding))
        assert second.get('code')=='P0001',second;empty()
        c.execute("update items set status='published' where id=%s",[ident(701)])
        print('PASS: item retirement cannot commit a stale eligible assignment',flush=True)
        first,second=race(uri,lambda a:a.execute('delete from assessment_form_items where form_id=%s and item_id=%s',[ident(760),ident(701)]),lambda b:begin(b,binding))
        assert second.get('code')=='P0001',second;empty()
        c.execute('insert into assessment_form_items values(%s,%s)',[ident(760),ident(701)])
        print('PASS: concurrent form removal fails coverage before commit',flush=True)
        c.execute("update auth.sessions set not_after=clock_timestamp()+interval '1 second' where id=%s",[ident(401)])
        first,second=race(uri,lambda a:a.execute('select id from institutional_class_enrollments where id=%s for update',[ident(371)]),lambda b:begin(b,binding),delay=1.2)
        assert second.get('code')=='P0001' and 'learning_context_unavailable' in second['error'],second;empty()
        c.execute('update auth.sessions set not_after=null where id=%s',[ident(401)])
        print('PASS: expiry during a lock wait uses commit-time clock',flush=True)
        with psycopg.connect(uri) as a,psycopg.connect(uri) as b:
            first=begin(a,binding)
            with ThreadPoolExecutor(max_workers=1) as pool:
                pending=pool.submit(lambda:begin(b,binding2));second=pending.result(timeout=5)
            a.commit();b.commit()
            assert first['session']['unit_code']!=second['session']['unit_code']
        print('PASS: independent chapters do not conflict or share session identity',flush=True)
print('PASS: 15 independent-connection policy/session cases',flush=True)
