"""Writing transaction races; disposable Unix-socket/PostgreSQL 17 CI databases only."""
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
  def payload(revision,text='Synthetic response.'):return {'taskId':ident(1000),'text':text,'expectedRevision':revision}
  _,conflict=race(uri,lambda a:call(a,'save',payload(0)),lambda b:call(b,'save',payload(0,'Competing draft.')))
  assert 'written_conflict' in conflict['error'];print('PASS: concurrent initial saves preserve one draft',flush=True)
  submitted,conflict=race(uri,lambda a:call(a,'submit',payload(1)),lambda b:call(b,'submit',payload(1)))
  assert 'written_conflict' in conflict['error'];assert c.execute('select count(*) from written_submissions').fetchone()[0]==1
  print('PASS: duplicate submission creates exactly one immutable version',flush=True)
  review={'workId':submitted['work']['id'],'expectedRevision':2,'decision':'assessed','scores':{'task':3,'organisation':2,'vocabulary':2,'grammar':2},'feedback':'Synthetic feedback.'}
  _,conflict=race(uri,lambda a:call(a,'review',review,True),lambda b:call(b,'review',review,True))
  assert 'written_conflict' in conflict['error'];assert c.execute('select count(*) from written_reviews').fetchone()[0]==1
  print('PASS: competing marks do not overwrite a teacher judgment',flush=True)
  _,denied=race(uri,lambda a:a.execute("update teacher_subject_authorizations set status='revoked' where id=%s",[ident(361)]).rowcount,lambda b:call(b,'queue',teacher=True))
  assert 'written_context_unavailable' in denied['error'];c.execute("update teacher_subject_authorizations set status='active' where id=%s",[ident(361)])
  print('PASS: teacher read waits for grant revocation and denies after commit',flush=True)
  _,denied=race(uri,lambda a:a.execute("update auth.sessions set not_after=clock_timestamp()+interval '500 milliseconds' where id=%s",[ident(420)]).rowcount,lambda b:call(b,'queue',teacher=True),delay=.7)
  assert 'written_context_unavailable' in denied['error'];print('PASS: expiry is checked after the lock wait',flush=True)
