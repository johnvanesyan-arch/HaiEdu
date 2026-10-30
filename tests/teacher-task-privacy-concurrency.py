"""Privacy/retention races on independent disposable PostgreSQL17 connections.

Storage/Auth HTTP operations are covered by the separate handler fixture. This
suite proves actual row-lock waits and database transaction outcomes only.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json,re,subprocess,sys,time,uuid
import psycopg
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/fixtures'))
from phase3_postgres import database_uri
def ident(n):return f'71000000-0000-4000-8000-{n:012}'
setup=json.loads(subprocess.run(['node','tests/fixtures/teacher-task-privacy-export.mjs'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
def query(c,q):
 params=[]
 def slot(m):params.append(q['params'][int(m[1])-1]);return '%s'
 sql=re.sub(r'\$(\d+)',slot,q['sql']);c.execute(sql,params) if params else c.execute(sql)
ctx={'assignmentId':ident(351),'curriculumReleaseId':ident(501),'unitId':ident(511)}
sctx={'enrollmentId':ident(371),'curriculumReleaseId':ident(501),'unitId':ident(511)}
def call(c,service,action,payload=None):
 student=service=='student_work'
 return c.execute('select service_teacher_task_'+service+'(%s,%s,%s,%s::jsonb,%s::jsonb)',[ident(10 if student else 20),ident(401 if student else 420),action,json.dumps(sctx if student else ctx),json.dumps(payload or {})]).fetchone()[0]
def privacy(c,action,payload):
 return c.execute('select service_teacher_task_privacy(%s,%s,%s,%s::jsonb)',[ident(40),ident(440),action,json.dumps(payload)]).fetchone()[0]
def retention(c,action,payload):
 return c.execute('select service_teacher_task_retention(%s,%s,%s,%s::jsonb)',[ident(40),ident(440),action,json.dumps(payload)]).fetchone()[0]
def race(uri,first,second,after_wait=None):
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
   assert blocked,'Expected actual lock wait'
   if after_wait:after_wait(a)
   a.commit();r=pending.result(timeout=15);return result,r
definition={'schemaVersion':'teacher-task-v1','title':'Synthetic privacy task','instructions':'Explain.','source':{'kind':'text','text':'Synthetic source'},'response':{'kind':'text'},'assessment':{'kind':'feedback'}}
def new_source(c):
 d=call(c,'drafts','create',{'requestId':str(uuid.uuid4()),'definition':definition|{'source':{'kind':'pdf','attachmentId':None}}})['draft']
 f=call(c,'sources','reserve',{'draftId':d['id'],'requestId':str(uuid.uuid4()),'sha256':'a'*64,'bytes':40})
 call(c,'sources','ready',{'id':f['id']})
 return d,f
def age(c,kind,asset):
 # Disposable fixture clock only; application roles cannot disable triggers.
 table='teacher_task_source_files' if kind=='source' else 'teacher_task_response_files'
 trigger='teacher_task_source_immutable' if kind=='source' else 'teacher_task_response_file_guard'
 c.execute(f'alter table {table} disable trigger {trigger}')
 c.execute(f"update {table} set created_at=clock_timestamp()-interval '3 days',upload_lease_until=clock_timestamp()-interval '2 days' where id=%s",[asset])
 c.execute(f'alter table {table} enable trigger {trigger}')
with database_uri() as uri:
 with psycopg.connect(uri,autocommit=True) as c:
  c.execute(setup['predecessor']);c.execute(setup['foundation'])
  for q in setup['queries']:query(c,q)
  c.execute(setup['extension'])
  for q in setup['runtimeQueries']:query(c,q)
  for key in ['migration','dashboardFixtureSQL','dashboardMigration','writtenMigration']:c.execute(setup[key])
  for q in setup['writtenQueries']:query(c,q)
  c.execute('create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[])')
  for pattern in ['*_sprint_16_5b_supplementary_materials.sql','*_sprint_16_5b_resource_assignments.sql']:c.execute(next((ROOT/'supabase/migrations').glob(pattern)).read_text())
  for name in ['20261030203359_teacher_writing_assignments.sql','20261030203404_teacher_task_drafts.sql','20261030203406_teacher_task_source_attachments.sql']:c.execute((ROOT/'supabase/migrations'/name).read_text())
  for name in ['20261030203407_teacher_task_delivery.sql','20261030203408_teacher_task_student_work.sql','20261030203409_teacher_task_review.sql']:c.execute((ROOT/'supabase/migrations'/name).read_text())
  c.execute(setup['privacyFoundation'])
  c.execute("insert into profiles(id,role,account_status) values(%s,'admin','active')",[ident(40)])
  c.execute('insert into auth.users(id) values(%s)',[ident(40)])
  c.execute('insert into auth.sessions(id,user_id) values(%s,%s)',[ident(440),ident(40)])
  c.execute((ROOT/'supabase/migrations/20261030204829_teacher_task_privacy.sql').read_text())
  cutoff=c.execute("select clock_timestamp()-interval '36 hours'").fetchone()[0].isoformat()
  # A save's JSON reference obtains KEY SHARE on the actual file row.
  d,f=new_source(c);age(c,'source',f['id']);preview=retention(c,'preview',{'before':cutoff})
  attached=definition|{'source':{'kind':'pdf','attachmentId':f['id']}}
  _,b=race(uri,lambda a:call(a,'drafts','save',{'id':d['id'],'expectedRevision':1,'definition':attached}),lambda b:retention(b,'enqueue',{'before':cutoff,'fingerprint':preview['fingerprint'],'requestId':str(uuid.uuid4())}))
  assert 'task_retention_stale' in b['error'];assert c.execute('select count(*) from teacher_task_source_files where id=%s',[f['id']]).fetchone()[0]==1
  print('PASS source binding wins cleanup race without losing a referenced PDF',flush=True)
  d,f=new_source(c);age(c,'source',f['id']);preview=retention(c,'preview',{'before':cutoff})
  attached=definition|{'source':{'kind':'pdf','attachmentId':f['id']}}
  _,b=race(uri,lambda a:retention(a,'enqueue',{'before':cutoff,'fingerprint':preview['fingerprint'],'requestId':str(uuid.uuid4())}),lambda b:call(b,'drafts','save',{'id':d['id'],'expectedRevision':1,'definition':attached}))
  assert 'task_draft_invalid' in b['error'];assert c.execute('select definition from teacher_task_drafts where id=%s',[d['id']]).fetchone()[0]['source']['attachmentId'] is None
  print('PASS cleanup wins source race and stale binding cannot create a dangling reference',flush=True)
  d=call(c,'drafts','create',{'requestId':str(uuid.uuid4()),'definition':definition|{'response':{'kind':'document','allowedFormats':['pdf']}}})['draft']
  preview=call(c,'delivery','preview',{'id':d['id']})
  delivery=call(c,'delivery','assign',{'id':d['id'],'expectedRevision':1,'definition':d['definition'],'requestId':str(uuid.uuid4()),'rosterFingerprint':preview['rosterFingerprint'],'mode':'selected','enrollmentIds':[ident(371)]})['delivery']
  f=call(c,'student_work','reserve_file',{'id':delivery['id'],'requestId':str(uuid.uuid4()),'sha256':'b'*64,'bytes':40,'format':'pdf'})['file']
  call(c,'student_work','ready_file',{'id':delivery['id'],'fileId':f['id']});age(c,'response',f['id'])
  preview=retention(c,'preview',{'before':cutoff})
  content={'kind':'document','fileId':f['id']}
  _,b=race(uri,lambda a:call(a,'student_work','save',{'id':delivery['id'],'expectedRevision':0,'content':content}),lambda b:retention(b,'enqueue',{'before':cutoff,'fingerprint':preview['fingerprint'],'requestId':str(uuid.uuid4())}))
  assert 'task_retention_stale' in b['error'];assert c.execute('select count(*) from teacher_task_response_files where id=%s',[f['id']]).fetchone()[0]==1
  print('PASS learner response binding wins cleanup race and preserves document bytes metadata',flush=True)
  call(c,'student_work','submit',{'id':delivery['id'],'expectedRevision':1,'content':content,'requestId':str(uuid.uuid4())})
  req=c.execute("insert into account_deletion_requests(user_id,auth_user_id,requester_user_id,status) values(%s,%s,%s,'processing') returning id",[ident(10)]*3).fetchone()[0]
  c.execute("update profiles set account_status='deletion_pending' where id=%s",[ident(10)])
  _,b=race(uri,lambda a:privacy(a,'prepare',{'requestId':str(req)}),lambda b:b.execute("update account_deletion_requests set status='cancelled' where id=%s returning id",[req]).fetchone())
  assert 'deletion_execution_started' in b['error']
  print('PASS final execution racing cancellation cannot restore an erasing account',flush=True)
  c.execute("update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=%s",[ident(10)])
  a,b=race(uri,lambda a:privacy(a,'purge',{'requestId':str(req)}),lambda b:privacy(b,'purge',{'requestId':str(req)}))
  assert a['phase']==b['phase']=='data_erased';assert c.execute('select count(*) from teacher_task_storage_deletions where request_id=%s',[req]).fetchone()[0]==1
  assert c.execute('select count(*) from private.teacher_task_privacy_scopes').fetchone()[0]==0
  print('PASS simultaneous purge retries queue one response and leave no delete authority',flush=True)
  queued=privacy(c,'files',{'requestId':str(req)})['files'];privacy(c,'ack',{'requestId':str(req),'ids':[q['id'] for q in queued]})
  def erase(conn):return conn.execute('select erase_student_data(%s)',[ident(10)]).fetchone()[0]
  _,b=race(uri,lambda a:a.execute('select id from account_deletion_requests where id=%s for update',[req]).fetchone(),erase,after_wait=lambda a:privacy(a,'status',{'requestId':str(req)}))
  assert b['teacherTasks']['submissions']==1
  print('PASS profile cascade and progress use request-before-job locks without deadlock',flush=True)
  a,b=race(uri,erase,erase);assert a==b;assert a['teacherTasks']['submissions']==1
  print('PASS simultaneous profile erasure retries return the same original inventory',flush=True)
  c.execute('delete from auth.users where id=%s',[ident(10)])
  a,b=race(uri,lambda a:privacy(a,'finish',{'requestId':str(req)}),lambda b:privacy(b,'finish',{'requestId':str(req)}))
  assert a['phase']==b['phase']=='completed';assert c.execute("select count(*) from security_audit_log where action='admin.student_account_erased'").fetchone()[0]==1
  assert c.execute('select target_id from teacher_task_erasure_jobs where request_id=%s',[req]).fetchone()[0] is None
  print('PASS simultaneous completion retries write one sanitized account-erasure receipt',flush=True)
