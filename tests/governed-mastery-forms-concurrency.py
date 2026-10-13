"""Opt-in mastery form races; disposable independent PostgreSQL connections only."""
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

forms=json.loads(subprocess.run(['node','tests/fixtures/governed-mastery-forms-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)

with database_uri() as uri:
    with psycopg.connect(uri,autocommit=True) as c:
        print(c.execute('select version()').fetchone()[0],flush=True)
        c.execute(setup['predecessor']);c.execute(setup['foundation'])
        for q in setup['queries']:fixture_query(c,q)
        c.execute(setup['extension'])
        for q in setup['runtimeQueries']:fixture_query(c,q)
        c.execute(setup['migration']);c.execute(forms['schema']);c.execute(forms['migration'])
        for q in forms['queries']:fixture_query(c,q)
        def bind(connection):return connection.execute('select service_bind_assessment_policy(%s)',[ident(760)]).fetchone()[0]
        def reset():
            c.execute('truncate learning_sessions,learning_session_items,chapter_mastery_states,mastery_check_attempts,chapter_review_requirements,chapter_review_sessions,chapter_review_cycles,chapter_review_item_exposures,student_item_exposure_events,attempts,remediation_events,recommendation_events,student_skill_mastery_by_release,student_skill_mastery cascade')
            finish(c,launch(c)['session']['id'])
            # A different release/purpose binds real session provenance to historical exposure.
            other=c.execute('select service_launch_governed_learning(%s,%s,%s,%s,null,null,false)',[ident(10),ident(401),ident(373),ident(940)]).fetchone()[0]
            finish(c,other['session']['id'])
            for skill in [521,522]:c.execute("insert into student_skill_mastery_by_release values(%s,%s,%s,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set alpha_evidence=9,beta_evidence=1,mastery_score=.9,evidence_count=10",[ident(501),ident(10),ident(skill)])
            return other['session']['id']
        def expose(connection,other):
            connection.execute("insert into student_item_exposure_events(student_id,item_id,purpose,session_id) values(%s,%s,'practice',%s)",[ident(10),ident(721),other])
            return {'exposed':True}
        def empty_mastery():assert c.execute('select count(*) from mastery_check_attempts').fetchone()[0]==0
        other=reset()

        # A different pool's membership must serialize with first-time binding.
        _,blocked=race(uri,lambda a:a.execute('insert into assessment_pool_items values(%s,%s,true)',[ident(710),ident(721)]),bind)
        assert blocked.get('code')=='P0001' and 'mastery_form_pool_overlap' in blocked['error'],blocked
        assert c.execute('select count(*) from private.mastery_form_selection_bindings').fetchone()[0]==0
        c.execute('delete from assessment_pool_items where pool_id=%s and item_id=%s',[ident(710),ident(721)])
        _,blocked=race(uri,bind,lambda b:b.execute('insert into assessment_pool_items values(%s,%s,true)',[ident(710),ident(721)]))
        assert blocked.get('code')=='P0001' and 'mastery_form_pool_overlap' in blocked['error'],blocked
        print('PASS: first binding and competing practice eligibility serialize in both orders',flush=True)

        # Delete only isolated fixture snapshots to recreate first-binding races.
        c.execute('truncate private.mastery_form_selection_bindings')
        _,second=race(uri,lambda a:expose(a,other),lambda b:launch(b,'mastery_check'))
        assert second['session']['metadata']['assessmentFormId']==ident(1961),second
        print('PASS: exposure before the first-ever form binding skips the whole first form',flush=True)
        other=reset();c.execute('truncate private.mastery_form_selection_bindings')
        _,blocked=race(uri,lambda a:launch(a,'mastery_check'),lambda b:expose(b,other))
        assert blocked.get('code')=='P0001' and 'mastery_form_item_reserved' in blocked['error'],blocked
        print('PASS: an uncommitted first binding still serializes a competing exposure',flush=True)
        other=reset()

        _,second=race(uri,lambda a:expose(a,other),lambda b:launch(b,'mastery_check'))
        assert second['session']['metadata']['assessmentFormId']==ident(1961),second
        assert c.execute('select count(*) from learning_session_items where session_id=%s',[second['session']['id']]).fetchone()[0]==3
        print('PASS: cross-release practice exposure commits first and rejects the whole first form',flush=True)

        other=reset()
        first,blocked=race(uri,lambda a:launch(a,'mastery_check'),lambda b:expose(b,other))
        assert first['session']['metadata']['assessmentFormId']==ident(1960)
        assert blocked.get('code')=='P0001' and 'mastery_form_item_reserved' in blocked['error'],blocked
        assert c.execute('select count(*) from student_item_exposure_events where item_id=%s',[ident(721)]).fetchone()[0]==0
        print('PASS: assignment commits first and denies another session exposure',flush=True)

        other=reset()
        first,second=race(uri,lambda a:launch(a,'mastery_check'),lambda b:launch(b,'mastery_check'))
        assert second['resumed'] and first['session']['id']==second['session']['id']
        assert c.execute('select count(*) from mastery_check_attempts').fetchone()[0]==1
        print('PASS: duplicate mastery launches reserve one entire form and one lifecycle attempt',flush=True)
        _,resumed=race(uri,lambda a:operation(a,first['session']['id'],'serve'),lambda b:launch(b,'mastery_check'))
        assert resumed['resumed'] and resumed['session']['id']==first['session']['id']
        print('PASS: protected serving and resume serialize without reversing session locks',flush=True)

        other=reset()
        first,second=race(uri,lambda a:launch(a,'mastery_check'),lambda b:launch(b,'mastery_check'),rollback=True)
        assert not second['resumed'] and first['session']['id']!=second['session']['id']
        assert second['session']['metadata']['assessmentFormId']==ident(1960)
        print('PASS: rolled-back reservation leaves the original whole form available',flush=True)

        other=reset()
        _,blocked=race(uri,lambda a:a.execute("update assessment_forms set status='retired' where id=%s",[ident(1960)]),lambda b:launch(b,'mastery_check'))
        assert blocked.get('code')=='P0001' and 'mastery_form_selection_invalid' in blocked['error'],blocked
        empty_mastery();c.execute("update assessment_forms set status='active' where id=%s",[ident(1960)])
        print('PASS: form retirement wins before assignment and leaves no partial attempt',flush=True)

        # Staged eligibility cannot become practice merely by activating/changing a pool.
        c.execute("insert into assessment_pools(id,unit_code,purpose,status,is_protected) values(%s,'SYN-STAGED','mastery_check','draft',true)",[ident(1970)])
        c.execute('insert into assessment_pool_items values(%s,%s,true)',[ident(1970),ident(721)])
        for sql in ["update assessment_pools set purpose='practice',status='active' where id=%s", "update assessment_pools set is_protected=false where id=%s"]:
            try:c.execute(sql,[ident(1970)]);raise AssertionError('Pool mutation unexpectedly succeeded')
            except psycopg.Error as error:assert 'mastery_form_pool_overlap' in str(error)
        print('PASS: staged pool activation cannot convert registered items to unprotected eligibility',flush=True)

        c.execute("insert into assessment_pools(id,unit_code,purpose,status,is_protected) values(%s,'SYN-EMPTY','mastery_check','draft',true)",[ident(1980)])
        add_member=lambda tx:tx.execute('insert into assessment_pool_items values(%s,%s,true)',[ident(1980),ident(721)])
        change_scope=lambda tx:tx.execute("update assessment_pools set purpose='practice',is_protected=false,status='active' where id=%s",[ident(1980)])
        def rr_pool(tx,action):
            tx.execute('set transaction isolation level repeatable read')
            tx.execute('select count(*) from assessment_pool_items where pool_id=%s',[ident(1980)]).fetchone()
            return action(tx)
        for repeatable in [False,True]:
            def later(tx,action):return rr_pool(tx,action) if repeatable else action(tx)
            _,blocked=race(uri,add_member,lambda tx:later(tx,change_scope))
            assert blocked.get('code')==('40001' if repeatable else 'P0001'),blocked
            c.execute('delete from assessment_pool_items where pool_id=%s',[ident(1980)])
            _,blocked=race(uri,change_scope,lambda tx:later(tx,add_member))
            assert blocked.get('code')==('40001' if repeatable else 'P0001'),blocked
            c.execute("update assessment_pools set purpose='mastery_check',is_protected=true,status='draft' where id=%s",[ident(1980)])
            print('PASS: empty-pool first membership and scope mutation serialize both ways at '+('Repeatable Read' if repeatable else 'Read Committed'),flush=True)

        def old_snapshot(connection,action):
            connection.execute('set transaction isolation level repeatable read')
            # Establish a snapshot while the first binding/assignment is uncommitted.
            assert connection.execute('select count(*) from private.mastery_form_selection_bindings').fetchone()[0]==0
            return action(connection)
        rr_mutations=[
            ('form membership',lambda b:b.execute('delete from assessment_form_items where form_id=%s and item_id=%s',[ident(1960),ident(721)])),
            ('other-pool eligibility',lambda b:b.execute('insert into assessment_pool_items values(%s,%s,true)',[ident(710),ident(721)])),
            ('pool scope',lambda b:b.execute("update assessment_pools set purpose='practice',status='active' where id=%s",[ident(1970)])),
        ]
        for label,mutation in rr_mutations:
            other=reset();c.execute('truncate private.mastery_form_selection_bindings')
            _,blocked=race(uri,bind,lambda b:old_snapshot(b,mutation))
            assert blocked.get('code')=='40001',blocked
            print('PASS: durable fence rejects stale Repeatable Read '+label+' after first binding',flush=True)
        other=reset();c.execute('truncate private.mastery_form_selection_bindings')
        _,blocked=race(uri,lambda a:launch(a,'mastery_check'),lambda b:old_snapshot(b,lambda tx:expose(tx,other)))
        assert blocked.get('code')=='40001',blocked
        assert c.execute('select count(*) from student_item_exposure_events where item_id=%s',[ident(721)]).fetchone()[0]==0
        print('PASS: durable learner fence rejects stale Repeatable Read exposure after first assignment',flush=True)
        other=reset()

        with psycopg.connect(uri) as rr:
            rr.execute('set transaction isolation level repeatable read')
            try:launch(rr,'mastery_check');raise AssertionError('Repeatable Read unexpectedly accepted')
            except psycopg.Error as error:assert 'mastery_form_selection_requires_read_committed' in str(error)
            rr.rollback()
        empty_mastery()
        print('PASS: unsupported transaction snapshot isolation fails before learner writes',flush=True)
