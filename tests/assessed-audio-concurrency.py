"""Assessed listening races; disposable independent PostgreSQL connections only."""
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
        c.execute((ROOT/'supabase/migrations/20261021220954_sprint_16_1c_assessed_listening.sql').read_text())
        c.execute("insert into profiles values(%s,'content_admin','active')",[ident(30)])
        policy=c.execute("select configuration_snapshot->'assessmentPolicy' from assessment_blueprints where id=%s",[ident(740)]).fetchone()[0]
        policy.update(schemaVersion='haiedu-assessment-policy-v4',scoringStrategy='normalized-item-score-v1',responseCapabilities={},itemWeight=1,deliveredSkillIds=[ident(521),ident(522)],reportingGroups=[dict(key='all',label='Synthetic',skillIds=[ident(521),ident(522)])],audioPlayback=dict(schemaVersion='haiedu-assessed-audio-v1',maximumPlays=2,playbackRate=1,transcriptAvailable=False,scope='session-recording',questionVisibility='whole-recording',interruption='resume-or-unscored-v1'))
        c.execute("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',%s::jsonb) where id=%s",[json.dumps(policy),ident(740)])
        c.execute("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array(%s::jsonb)) where id=%s",[json.dumps(policy),ident(611)])
        c.execute("""insert into learning_audio_versions(id,curriculum_release_id,unit_id,source_family_id,locale,title,bucket_id,object_path,sha256,mime_type,byte_length,duration_ms,source_reference,permission_reference,listening_review_reference,reviewed_by,reviewed_at)
          values(%s,%s,%s,%s,'en','Synthetic tone','fixture-audio',repeat('0',64)||'.wav',repeat('0',64),'audio/wav',1000,300,'Fixture','Fixture','Fixture',%s,now())""",[ident(9000),ident(501),ident(511),ident(9500),ident(30)])
        c.execute('update items set stimulus=%s::jsonb where id=%s',[json.dumps(dict(kind='audio',schemaVersion='haiedu-audio-v1',audioVersionId=ident(9000))),ident(701)])
        session=launch(c)['session']['id'];item=operation(c,session,'serve')
        assert item['item']['id']==ident(701)
        def audio(conn,action,payload=None):
            return conn.execute('select service_assessed_audio(%s,%s,%s,%s,%s,%s::jsonb)',[ident(10),ident(401),action,session,item['sessionItemId'],json.dumps(payload or {})]).fetchone()[0]
        audio(c,'load');audio(c,'fetched')
        play=dict(clientId=ident(9900),playId=ident(9901),positionMs=0)
        _,blocked=race(uri,lambda a:audio(a,'begin',play),lambda b:audio(b,'begin',dict(play,clientId=ident(9902))))
        assert 'audio_playback_busy' in blocked.get('error',''),blocked
        print('PASS: competing tabs serialize and cannot acquire one active play',flush=True)
        c.execute("update learning_assessed_audio set last_event_at=clock_timestamp()-interval '1 second'")
        done=dict(play,positionMs=300)
        first,second=race(uri,lambda a:audio(a,'complete',done),lambda b:audio(b,'complete',done))
        assert first['completedPlays']==second['completedPlays']==1
        print('PASS: duplicate completion transactions consume exactly one play',flush=True)
        play=dict(play,playId=ident(9903));audio(c,'begin',play)
        c.execute("update learning_assessed_audio set last_event_at=clock_timestamp()-interval '1 second'")
        first,blocked=race(uri,lambda a:audio(a,'complete',dict(play,positionMs=300)),lambda b:audio(b,'begin',dict(play,playId=ident(9904))))
        assert first['completedPlays']==2 and 'audio_play_limit_reached' in blocked.get('error',''),blocked
        print('PASS: completing the last play blocks a simultaneous third play',flush=True)
        audio(c,'failed')
        _,blocked=race(uri,lambda a:audio(a,'cancel'),lambda b:operation(b,session,'answer',answer_payload(b,item)))
        assert blocked.get('error') and c.execute('select count(*) from attempts where learning_session_id=%s',[session]).fetchone()[0]==0
        print('PASS: technical cancellation wins against a concurrent answer without creating a scored attempt',flush=True)
