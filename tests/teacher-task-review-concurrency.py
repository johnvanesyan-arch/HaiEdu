"""Custom review/submission races on independent disposable PostgreSQL17 connections."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json,re,subprocess,sys,time,uuid
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
sctx={'enrollmentId':ident(371),'curriculumReleaseId':ident(501),'unitId':ident(511)}
def call(c,service,action,payload=None):
 student=service=='student_work'
 return c.execute('select service_teacher_task_'+service+'(%s,%s,%s,%s::jsonb,%s::jsonb)',[ident(10 if student else 20),ident(401 if student else 420),action,json.dumps(sctx if student else ctx),json.dumps(payload or {})]).fetchone()[0]
def race(uri,first,second):
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
   a.commit();r=pending.result(timeout=15);assert blocked,'Expected actual lock wait';return result,r
with database_uri() as uri:
 with psycopg.connect(uri,autocommit=True) as c:
  c.execute(setup['predecessor']);c.execute(setup['foundation'])
  for q in setup['queries']:query(c,q)
  c.execute(setup['extension'])
  for q in setup['runtimeQueries']:query(c,q)
  for key in ['migration','dashboardFixtureSQL','dashboardMigration','writtenMigration']:c.execute(setup[key])
  for q in setup['writtenQueries']:query(c,q)
  c.execute('create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])')
  for pattern in ['*_sprint_16_5b_supplementary_materials.sql','*_sprint_16_5b_resource_assignments.sql']:
   c.execute(next((ROOT/'supabase/migrations').glob(pattern)).read_text())
  for name in ['20261030203359_teacher_writing_assignments.sql','20261030203404_teacher_task_drafts.sql','20261030203406_teacher_task_source_attachments.sql']:c.execute((ROOT/'supabase/migrations'/name).read_text())
  for name in ['20261030203407_teacher_task_delivery.sql','20261030203408_teacher_task_student_work.sql','20261030203409_teacher_task_review.sql']:c.execute((ROOT/'supabase/migrations'/name).read_text())
  definition={'schemaVersion':'teacher-task-v1','title':'Synthetic concurrency task','instructions':'Explain.','source':{'kind':'text','text':'Synthetic source'},'response':{'kind':'text'},'assessment':{'kind':'feedback'}}
  d=call(c,'drafts','create',{'requestId':str(uuid.uuid4()),'definition':definition})['draft']
  copying={'id':d['id'],'expectedRevision':1,'requestId':str(uuid.uuid4())}
  a,b=race(uri,lambda a:call(a,'drafts','copy',copying),lambda b:call(b,'drafts','copy',copying))
  assert a['draft']['id']==b['draft']['id'];assert c.execute('select count(*) from teacher_task_drafts where copied_from_id=%s',[d['id']]).fetchone()[0]==1
  print('PASS simultaneous copy retries create one private editable draft',flush=True)
  copied=a['draft'];newer=definition|{'title':'Changed private source'}
  _,b=race(uri,lambda a:call(a,'drafts','save',{'id':copied['id'],'expectedRevision':1,'definition':newer}),lambda b:call(b,'drafts','copy',{'id':copied['id'],'expectedRevision':1,'requestId':str(uuid.uuid4())}))
  assert 'task_draft_conflict' in b['error'];assert c.execute('select count(*) from teacher_task_drafts where copied_from_id=%s',[copied['id']]).fetchone()[0]==0
  print('PASS copy racing with a newer source save rejects stale preview',flush=True)
  p=call(c,'delivery','preview',{'id':d['id']})
  a=call(c,'delivery','assign',{'id':d['id'],'expectedRevision':d['revision'],'definition':definition,'requestId':str(uuid.uuid4()),'rosterFingerprint':p['rosterFingerprint'],'mode':'selected','enrollmentIds':[ident(371)]})['delivery'];task=a['id']
  content={'kind':'text','text':'Synthetic answer'};call(c,'student_work','save',{'id':task,'expectedRevision':0,'content':content});s=call(c,'student_work','submit',{'id':task,'expectedRevision':1,'content':content,'requestId':str(uuid.uuid4())})['receipt']['id']
  review={'decision':'reviewed','feedback':'Synthetic feedback','scores':{},'reason':''};call(c,'review','save',{'submissionId':s,'expectedRevision':0,'review':review})
  payload={'submissionId':s,'expectedRevision':1,'review':review,'requestId':str(uuid.uuid4())}
  a,b=race(uri,lambda a:call(a,'review','publish',payload),lambda b:call(b,'review','publish',payload))
  assert a['receipt']['id']==b['receipt']['id'] and b['replayed'];assert c.execute('select count(*) from teacher_task_reviews').fetchone()[0]==1
  print('PASS simultaneous publication retries create one immutable review',flush=True)
  correction=review|{'feedback':'Corrected published feedback','reason':'Explicit correction'}
  call(c,'review','save',{'submissionId':s,'expectedRevision':1,'review':correction})
  payload={'submissionId':s,'expectedRevision':2,'review':correction,'requestId':str(uuid.uuid4())}
  a,b=race(uri,lambda a:call(a,'review','publish',payload),lambda b:call(b,'review','publish',payload|{'requestId':str(uuid.uuid4())}))
  assert 'task_review_conflict' in b['error'];assert c.execute('select count(*) from teacher_task_reviews').fetchone()[0]==2
  print('PASS distinct nonces cannot republish the same saved feedback revision',flush=True)
  r1=review|{'feedback':'First private correction','reason':'Correction one'};r2=review|{'feedback':'Second private correction','reason':'Correction two'}
  a,b=race(uri,lambda a:call(a,'review','save',{'submissionId':s,'expectedRevision':2,'review':r1}),lambda b:call(b,'review','save',{'submissionId':s,'expectedRevision':2,'review':r2}))
  assert 'task_review_conflict' in b['error'];assert call(c,'review','open',{'submissionId':s})['draft']['review']==r1
  print('PASS concurrent private feedback saves cannot overwrite a newer draft',flush=True)
  returned=review|{'decision':'returned','feedback':'Add evidence','reason':'Allow revision'};call(c,'review','save',{'submissionId':s,'expectedRevision':3,'review':returned})
  before=call(c,'student_work','open',{'id':task})['work']['revision']
  _,b=race(uri,lambda a:call(a,'review','publish',{'submissionId':s,'expectedRevision':4,'review':returned,'requestId':str(uuid.uuid4())}),lambda b:call(b,'student_work','save',{'id':task,'expectedRevision':before,'content':{'kind':'text','text':'Stale save'}}))
  assert 'task_work_conflict' in b['error']
  print('PASS a return racing with a stale learner save preserves submission and review',flush=True)
  work=call(c,'student_work','open',{'id':task})['work'];revised={'kind':'text','text':'Revised answer'};call(c,'student_work','save',{'id':task,'expectedRevision':work['revision'],'content':revised})
  work=call(c,'student_work','open',{'id':task})['work'];submission={'id':task,'expectedRevision':work['revision'],'content':revised,'requestId':str(uuid.uuid4())}
  a,b=race(uri,lambda a:call(a,'student_work','submit',submission),lambda b:call(b,'student_work','submit',submission))
  assert a['receipt']['id']==b['receipt']['id'] and b['replayed'];assert c.execute('select count(*) from teacher_task_submissions').fetchone()[0]==2
  print('PASS simultaneous revision submits keep exactly two historical submissions',flush=True)
  s2=a['receipt']['id'];call(c,'review','save',{'submissionId':s2,'expectedRevision':0,'review':review})
  cancel={'deliveryId':task,'requestId':str(uuid.uuid4()),'reason':'Synthetic cancellation'}
  _,b=race(uri,lambda a:call(a,'review','cancel',cancel),lambda b:call(b,'review','publish',{'submissionId':s2,'expectedRevision':1,'review':review,'requestId':str(uuid.uuid4())}))
  assert 'task_review_locked' in b['error'];assert c.execute('select count(*) from teacher_task_reviews').fetchone()[0]==3;assert c.execute('select count(*) from teacher_task_submissions').fetchone()[0]==2
  print('PASS cancellation fences concurrent publication without deleting prior history',flush=True)
