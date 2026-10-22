"""Unit-guide delivery races; isolated PostgreSQL only, synthetic users and content."""
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
def call(c,action,payload=None):
 return c.execute('select service_unit_materials(%s,%s,%s,%s,%s::jsonb)',[ident(30),ident(430),'aal2',action,json.dumps(payload or {})]).fetchone()[0]
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
def guides(c):
 return c.execute('select service_student_unit_guides(%s,%s,%s,%s,%s)',[ident(10),ident(401),ident(371),ident(501),ident(511)]).fetchone()[0]
with database_uri() as uri:
 with psycopg.connect(uri,autocommit=True) as c:
  print(c.execute('select version()').fetchone()[0],flush=True)
  c.execute(setup['predecessor']);c.execute(setup['foundation'])
  for q in setup['queries']:query(c,q)
  c.execute(setup['extension'])
  for q in setup['runtimeQueries']:query(c,q)
  c.execute(setup['migration']);c.execute(setup['dashboardFixtureSQL']);c.execute(setup['dashboardMigration']);c.execute(setup['writtenMigration'])
  for q in setup['writtenQueries']:query(c,q)
  c.execute(next((ROOT/'supabase/migrations').glob('*_sprint_16_1c_unit_material_review.sql')).read_text())
  c.execute("insert into auth.users(id) values(%s)",[ident(30)])
  c.execute("insert into auth.sessions(id,user_id) values(%s,%s)",[ident(430),ident(30)])
  definition={'schemaVersion':'teaching-guide-v1','title':'Synthetic guide','text':'Synthetic explanation','workedExample':'Synthetic example','locale':'en','source':{'fixture':True},'outcomes':['SYN-521']}
  package={'sourceReference':'fixture-source','comparisonReference':'fixture-comparison'}
  m=c.execute("insert into unit_material_versions(id,subject_program_id,curriculum_release_id,unit_id,material_key,kind,version_no,sequence_order,definition,review_package,fingerprint) values(%s,%s,%s,%s,'fixture-guide','guide',1,1,%s::jsonb,%s::jsonb,'') returning id,fingerprint",[ident(2000),ident(201),ident(501),ident(511),json.dumps(definition),json.dumps(package)]).fetchone()
  c.execute(next((ROOT/'supabase/migrations').glob('*_sprint_16_1c_unit_guide_delivery.sql')).read_text())
  saved={'id':str(m[0]),'fingerprint':m[1]}
  call(c,'qa',saved);call(c,'approve',saved)
  diagnostic,blocked=race(uri,lambda a:launch(a),guides)
  assert blocked['availability']=='assessment_active' and blocked['guides']==[]
  print('PASS: assessment start serializes before guide delivery',flush=True)
  finish(c,diagnostic['session']['id'])
  assert len(guides(c)['guides'])==1
  _,empty=race(uri,lambda a:call(a,'retire',{**saved,'reason':'Synthetic withdrawal'}),guides)
  assert empty['guides']==[]
  print('PASS: concurrent guide retirement removes content from the waiting read',flush=True)
  _,denied=race(uri,lambda a:a.execute("update teacher_subject_authorizations set status='revoked' where id=%s",[ident(361)]).rowcount,guides)
  assert 'learning_context_unavailable' in denied['error']
  c.execute("update teacher_subject_authorizations set status='active' where id=%s",[ident(361)])
  print('PASS: teacher authorization revocation denies a waiting guide read',flush=True)
  _,denied=race(uri,lambda a:a.execute("update auth.sessions set not_after=clock_timestamp()+interval '500 milliseconds' where id=%s",[ident(401)]).rowcount,guides,delay=.7)
  assert 'learning_context_unavailable' in denied['error']
  print('PASS: wall-clock session expiry is checked after waiting for a lock',flush=True)
