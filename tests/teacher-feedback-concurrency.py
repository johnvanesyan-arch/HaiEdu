"""Teacher feedback races; disposable Unix-socket/PostgreSQL 17 CI databases only."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json,re,subprocess,sys,time
import psycopg
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/fixtures'))
from phase3_postgres import database_uri
def ident(n):return f'71000000-0000-4000-8000-{n:012}'
setup=json.loads(subprocess.run(['node','tests/fixtures/written-work-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
def query(c,q):
 params=[]
 def slot(m):params.append(q['params'][int(m[1])-1]);return '%s'
 sql=re.sub(r'\$(\d+)',slot,q['sql'])
 c.execute(sql,params) if params else c.execute(sql)
def call(c,action,payload=None,teacher=False):
 ctx={'curriculumReleaseId':ident(501),'unitId':ident(511),('assignmentId' if teacher else 'enrollmentId'):ident(351 if teacher else 371)}
 return c.execute('select service_written_work(%s,%s,%s,%s::jsonb,%s::jsonb)',[ident(20 if teacher else 10),ident(420 if teacher else 401),action,json.dumps(ctx),json.dumps(payload or {})]).fetchone()[0]
def race(uri,first,second,delay=0):
 with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watcher:
  a.execute("set statement_timeout='12s'");b.execute("set statement_timeout='12s'")
  result=first(a)
  def later():
   try:ret=second(b);b.commit();return ret
   except psycopg.Error as e:b.rollback();return {'error':str(e),'code':e.sqlstate}
  with ThreadPoolExecutor(max_workers=1) as pool:
   pending=pool.submit(later);deadline=time.monotonic()+6;blocked=False
   while time.monotonic()<deadline and not pending.done():
    row=watcher.execute('select wait_event_type from pg_stat_activity where pid=%s',[b.info.backend_pid]).fetchone()
    if row and row[0]=='Lock':blocked=True;break
    time.sleep(.02)
   if delay:time.sleep(delay)
   a.commit();ret=pending.result(timeout=15);assert blocked,'Expected row lock wait';return result,ret
with database_uri() as uri:
 with psycopg.connect(uri,autocommit=True) as c:
  print(c.execute('select version()').fetchone()[0],flush=True)
  c.execute(setup['predecessor']);c.execute(setup['foundation'])
  for q in setup['queries']:query(c,q)
  c.execute(setup['extension'])
  for q in setup['runtimeQueries']:query(c,q)
  c.execute(setup['migration']);c.execute(setup['dashboardFixtureSQL']);c.execute(setup['dashboardMigration']);c.execute(setup['writtenMigration'])
  for q in setup['writtenQueries']:query(c,q)
  c.execute((ROOT/'supabase/migrations/20261028194137_teacher_feedback_workspace.sql').read_text())
  submitted=call(c,'submit',{'taskId':ident(1000),'expectedRevision':0,'text':'Synthetic response.'})
  work=submitted['work']['id'];rev=submitted['work']['revision']
  ctx={'assignmentId':ident(351),'curriculumReleaseId':ident(501),'unitId':ident(511)}
  def feedback(conn,action,payload,personal=False):
   return conn.execute('select service_teacher_feedback(%s,%s,%s,%s::jsonb,%s::jsonb)',[ident(20),ident(420),action,json.dumps({} if personal else ctx),json.dumps(payload)]).fetchone()[0]
  data={'scores':{'task':2,'organisation':2,'vocabulary':2,'grammar':2},'feedback':'First tab','changeReason':''}
  draft={'workId':work,'expectedRevision':rev,'draftRevision':0,'data':data}
  first,other=race(uri,lambda a:feedback(a,'save_draft',draft),lambda b:feedback(b,'save_draft',{**draft,'data':{**data,'feedback':'Other tab'}}))
  assert 'feedback_conflict' in other['error'];print('PASS: competing draft saves preserve one acknowledged private version',flush=True)
  publish={'workId':work,'expectedRevision':rev,'draftRevision':1,'decision':'assessed','requestId':ident(9000)}
  first,replay=race(uri,lambda a:feedback(a,'publish',publish),lambda b:feedback(b,'publish',publish))
  assert not first['receipt']['replayed'] and replay['receipt']['replayed']
  assert c.execute('select count(*) from written_reviews').fetchone()[0]==1
  print('PASS: duplicate publication waits, replays one receipt and creates one review',flush=True)
  rev=first['writtenWork']['work']['revision']
  feedback(c,'save_draft',{**draft,'expectedRevision':rev,'data':{**data,'changeReason':'Reconsidered'}})
  legacy={'workId':work,'expectedRevision':rev,'decision':'assessed','scores':data['scores'],'feedback':'Legacy client review','changeReason':'Reconsidered'}
  _,conflict=race(uri,lambda a:call(a,'review',legacy,True),lambda b:feedback(b,'save_draft',{**draft,'expectedRevision':rev,'draftRevision':1}))
  assert 'feedback_conflict' in conflict['error']
  assert c.execute('select count(*) from private.teacher_feedback_drafts').fetchone()[0]==0
  print('PASS: legacy publication invalidates all private drafts before a waiting autosave',flush=True)
  rev+=1
  _,denied=race(uri,lambda a:a.execute("update teacher_subject_authorizations set status='ended' where id=%s",[ident(361)]).rowcount,lambda b:feedback(b,'save_draft',{**draft,'expectedRevision':rev}))
  assert 'written_context_unavailable' in denied['error'];c.execute("update teacher_subject_authorizations set status='active' where id=%s",[ident(361)])
  print('PASS: grant revocation wins before a waiting private save',flush=True)
  _,denied=race(uri,lambda a:a.execute("update auth.sessions set not_after=clock_timestamp()+interval '500 milliseconds' where id=%s",[ident(420)]).rowcount,lambda b:feedback(b,'save_draft',{**draft,'expectedRevision':rev}),delay=.7)
  assert 'written_context_unavailable' in denied['error'];c.execute('update auth.sessions set not_after=null where id=%s',[ident(420)])
  print('PASS: private autosave rechecks session expiry after lock waits',flush=True)
  c.execute("insert into private.teacher_feedback_snippets(id,teacher_id,title,body,revision) select gen_random_uuid(),%s,'Generic','Comment',1 from generate_series(1,49)",[ident(20)])
  p={'id':ident(9100),'expectedRevision':0,'title':'Generic','body':'Comment','archived':False}
  _,limited=race(uri,lambda a:feedback(a,'save_snippet',p,True),lambda b:feedback(b,'save_snippet',{**p,'id':ident(9101)},True))
  assert 'feedback_snippet_limit' in limited['error']
  assert c.execute('select count(*) from private.teacher_feedback_snippets where not archived').fetchone()[0]==50
  print('PASS: concurrent template creation retains the fifty-active bound',flush=True)
