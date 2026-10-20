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
def race(uri,first,second,rollback=False,delay=0,repeatable=False):
    with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watch:
        a.execute("set statement_timeout='12s'");b.execute("set statement_timeout='12s'")
        if repeatable:
            b.execute("set transaction isolation level repeatable read");b.execute("select count(*) from learning_sessions")
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
shared=json.loads(subprocess.run(['node','tests/fixtures/shared-task-sets-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
with database_uri() as uri:
    with psycopg.connect(uri,autocommit=True) as c:
        print(c.execute('select version()').fetchone()[0],flush=True)
        c.execute(setup['predecessor']);c.execute(setup['foundation'])
        for q in setup['queries']:fixture_query(c,q)
        c.execute(setup['extension'])
        for q in setup['runtimeQueries']:fixture_query(c,q)
        c.execute(setup['migration']);c.execute(shared['dashboard'])
        c.execute(forms['schema'].replace(' alter table public.curriculum_releases add column release_number integer not null default 1;',''));c.execute(forms['migration'])
        for q in forms['queries']:fixture_query(c,q)
        c.execute(shared['upgrades'])
        c.execute("insert into profiles values(%s,'content_admin','active')",[ident(30)])
        for version,release,unit,items in [(9810,501,511,[721,722,723]),(9830,502,513,[911,912,913])]:
            members=[dict(itemId=ident(n),version=1,skillId=str(c.execute('select skill_id from items where id=%s',[ident(n)]).fetchone()[0])) for n in items]
            c.execute("""insert into learning_task_set_versions(id,curriculum_release_id,unit_id,source_family_id,locale,title,stimulus,members,source_reference,permission_reference,review_reference,reviewed_by,reviewed_at)
            values(%s,%s,%s,%s,'en','Synthetic race source',%s::jsonb,%s::jsonb,'Synthetic source','Fixture only','Synthetic review',%s,now())""",[ident(version),ident(release),ident(unit),ident(9900),json.dumps(dict(kind='text',schemaVersion='haiedu-text-v1',locale='en',content='Synthetic source.')),json.dumps(members),ident(30)])
            c.execute('update items set stimulus=%s::jsonb where id=any(%s::uuid[])',[json.dumps(dict(kind='task_set',schemaVersion='haiedu-task-set-v1',taskSetVersionId=ident(version))),[ident(n) for n in items]])
        def reset():
            c.execute('truncate learning_sessions,learning_session_items,chapter_mastery_states,mastery_check_attempts,chapter_review_requirements,chapter_review_sessions,chapter_review_cycles,chapter_review_item_exposures,student_item_exposure_events,attempts,remediation_events,recommendation_events,student_skill_mastery_by_release,student_skill_mastery cascade')
            finish(c,launch(c)['session']['id'])
            other=c.execute('select service_launch_governed_learning(%s,%s,%s,%s,null,null,false)',[ident(10),ident(401),ident(373),ident(940)]).fetchone()[0]
            finish(c,other['session']['id'])
            for skill in [521,522]:c.execute("insert into student_skill_mastery_by_release values(%s,%s,%s,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set alpha_evidence=9,beta_evidence=1,mastery_score=.9,evidence_count=10",[ident(501),ident(10),ident(skill)])
            return c.execute('select service_launch_governed_learning(%s,%s,%s,%s,%s,null,false)',[ident(10),ident(401),ident(373),ident(950),ident(525)]).fetchone()[0]['session']['id']
        other=reset()
        _,second=race(uri,lambda a:operation(a,other,'serve'),lambda b:launch(b,'mastery_check'))
        assert second['session']['metadata']['assessmentFormId']==ident(1961),second
        print('PASS: cross-subject source exposure skips a different-question Mastery form',flush=True)
        other=reset()
        _,blocked=race(uri,lambda a:launch(a,'mastery_check'),lambda b:operation(b,other,'serve'))
        assert blocked.get('code')=='P0001' and 'learning_context_unavailable' in blocked['error'],blocked
        assert c.execute('select count(*) from learning_source_family_exposures where source_family_id=%s',[ident(9900)]).fetchone()[0]==0
        print('PASS: a reserved assessment family blocks concurrent Practice delivery',flush=True)
        other=reset()
        _,second=race(uri,lambda a:operation(a,other,'serve'),lambda b:launch(b,'mastery_check'),rollback=True)
        assert second['session']['metadata']['assessmentFormId']==ident(1960),second
        print('PASS: rolled-back exposure consumes no source or assessment attempt',flush=True)
        other=reset()
        _,blocked=race(uri,lambda a:operation(a,other,'serve'),lambda b:launch(b,'mastery_check'),repeatable=True)
        assert blocked.get('code')=='40001',blocked
        print('PASS: repeatable-read stale allocation fails serialization',flush=True)
