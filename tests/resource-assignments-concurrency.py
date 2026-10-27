"""Assignment delivery races: independent connections, disposable PostgreSQL 17."""
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
 sql=re.sub(r'\$(\d+)',slot,q['sql']);c.execute(sql,params) if params else c.execute(sql)
ctx={'assignmentId':ident(351),'curriculumReleaseId':ident(501),'unitId':ident(511)}
def material(c,action,payload=None,student=False):
 context={k:v for k,v in ctx.items() if k!='assignmentId'}|{'enrollmentId':ident(371)} if student else ctx
 return c.execute('select service_supplementary_resources(%s,%s,%s,%s,%s::jsonb,%s::jsonb)',[ident(10 if student else 20),ident(401 if student else 420),'aal1',action,json.dumps(context),json.dumps(payload or {})]).fetchone()[0]
def call(c,action,payload=None,student=False):
 context={k:v for k,v in ctx.items() if k!='assignmentId'}|{'enrollmentId':ident(371)} if student else ctx
 return c.execute('select service_resource_assignments(%s,%s,%s,%s::jsonb,%s::jsonb)',[ident(10 if student else 20),ident(401 if student else 420),action,json.dumps(context),json.dumps(payload or {})]).fetchone()[0]
def race(uri,first,second,delay=0):
 with psycopg.connect(uri) as a,psycopg.connect(uri) as b,psycopg.connect(uri,autocommit=True) as watcher:
  a.execute("set statement_timeout='12s'");b.execute("set statement_timeout='12s'");result=first(a)
  def later():
   try:r=second(b);b.commit();return r
   except psycopg.Error as e:b.rollback();return {'error':str(e)}
  with ThreadPoolExecutor(max_workers=1) as pool:
   pending=pool.submit(later);deadline=time.monotonic()+6;blocked=False
   while time.monotonic()<deadline and not pending.done():
    row=watcher.execute('select wait_event_type from pg_stat_activity where pid=%s',[b.info.backend_pid]).fetchone()
    if row and row[0]=='Lock':blocked=True;break
    time.sleep(.02)
   if delay:time.sleep(delay)
   a.commit();r=pending.result(timeout=15);assert blocked,'Expected lock wait';return result,r
with database_uri() as uri:
 with psycopg.connect(uri,autocommit=True) as c:
  c.execute(setup['predecessor']);c.execute(setup['foundation'])
  for q in setup['queries']:query(c,q)
  c.execute(setup['extension'])
  for q in setup['runtimeQueries']:query(c,q)
  c.execute(setup['migration']);c.execute(setup['dashboardFixtureSQL']);c.execute(setup['dashboardMigration']);c.execute(setup['writtenMigration'])
  for q in setup['writtenQueries']:query(c,q)
  c.execute('create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])')
  c.execute(next((ROOT/'supabase/migrations').glob('*_sprint_16_5b_supplementary_materials.sql')).read_text())
  c.execute(next((ROOT/'supabase/migrations').glob('*_sprint_16_5b_resource_assignments.sql')).read_text())
  d={'title':'Synthetic assignment','description':'Disposable fixture','purpose':'reading','format':'link','url':'https://example.org/fixture','locale':'en','sourceReference':'Synthetic author','rightsConfirmed':True,'assessmentSafe':True}
  m=material(c,'create',{'definition':d})['material'];key={'id':m['id'],'fingerprint':m['fingerprint']}
  material(c,'qa',key);material(c,'publish',key)
  preview=call(c,'preview',{'materialId':m['id']})
  payload={'materialId':m['id'],'fingerprint':m['fingerprint'],'rosterFingerprint':preview['rosterFingerprint'],'requestId':ident(8001),'mode':'class','enrollmentIds':[],'instructions':'Synthetic'}
  a,b=race(uri,lambda a:call(a,'assign',payload),lambda b:call(b,'assign',payload))
  assert a['assignment']['id']==b['assignment']['id'] and b['replayed'];assignment=a['assignment']
  assert c.execute("select count(*) from resource_assignment_events where event='assigned'").fetchone()[0]==1;print('PASS simultaneous retry creates one receipt/event',flush=True)
  a,b=race(uri,lambda a:call(a,'assign',payload|{'requestId':ident(8002)}),lambda b:call(b,'assign',payload|{'requestId':ident(8002),'instructions':'Changed'}));assert 'assignment_conflict' in b['error'];print('PASS changed payload cannot reuse request identity',flush=True)
  a,b=race(uri,lambda a:a.execute("update institutional_class_enrollments set status='ended' where id=%s",[ident(371)]).rowcount,lambda b:call(b,'assign',payload|{'requestId':ident(8003)}));assert 'assignment_preview_stale' in b['error'];c.execute("update institutional_class_enrollments set status='active' where id=%s",[ident(371)]);print('PASS stale roster is rejected after enrollment lock wait',flush=True)
  a,b=race(uri,lambda a:call(a,'cancel',{'id':assignment['id'],'revision':1,'reason':'Synthetic cancel'}),lambda b:call(b,'open',{'id':assignment['id']},True));assert 'assignment_unavailable' in b['error'];print('PASS cancellation fences waiting learner delivery',flush=True)
  assignment=call(c,'assign',payload|{'requestId':ident(8004)})['assignment']
  a,b=race(uri,lambda a:material(a,'withdraw',key|{'reason':'Synthetic withdrawal'}),lambda b:call(b,'open',{'id':assignment['id']},True));assert 'assignment_unavailable' in b['error'];print('PASS withdrawal fences waiting pinned delivery',flush=True)
  a,b=race(uri,lambda a:a.execute("update teacher_assignments set status='ended' where id=%s",[ident(351)]).rowcount,lambda b:call(b,'open',{'id':assignment['id']},True));assert 'learning_context_unavailable' in b['error'];c.execute("update teacher_assignments set status='active' where id=%s",[ident(351)]);print('PASS teacher assignment revocation fences delivery',flush=True)
  a,b=race(uri,lambda a:a.execute("update auth.sessions set not_after=clock_timestamp()+interval '500 milliseconds' where id=%s",[ident(420)]).rowcount,lambda b:call(b,'list'),delay=.7);assert 'resource_forbidden' in b['error'];print('PASS session expiry is checked after waiting',flush=True)
