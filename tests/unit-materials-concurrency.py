"""Unit-material review races; isolated PostgreSQL only, synthetic users and content."""
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
  payload={'id':str(m[0]),'fingerprint':m[1],'definition':{**definition,'text':'Revised explanation'},'reviewPackage':package,'reason':'Synthetic revision'}
  revised,conflict=race(uri,lambda a:call(a,'revise',payload),lambda b:call(b,'revise',payload))
  assert 'material_conflict' in conflict['error'];assert c.execute('select count(*) from unit_material_versions').fetchone()[0]==2
  print('PASS: competing revisions serialize and retain one successor',flush=True)
  new=revised['material'];saved={'id':new['id'],'fingerprint':new['fingerprint']}
  call(c,'qa',saved)
  _,approved=race(uri,lambda a:call(a,'approve',saved),lambda b:call(b,'approve',saved))
  assert approved['material']['status']=='approved';assert c.execute("select count(*) from unit_material_events where event='approved'").fetchone()[0]==1
  print('PASS: repeated approval records one human decision',flush=True)
  _,denied=race(uri,lambda a:a.execute("update profiles set account_status='suspended' where id=%s",[ident(30)]).rowcount,lambda b:call(b,'list'))
  assert 'material_forbidden' in denied['error'];c.execute("update profiles set account_status='active' where id=%s",[ident(30)])
  print('PASS: reviewer revocation wins a waiting content operation',flush=True)
  _,denied=race(uri,lambda a:a.execute("update auth.sessions set not_after=clock_timestamp()+interval '500 milliseconds' where id=%s",[ident(430)]).rowcount,lambda b:call(b,'list'),delay=.7)
  assert 'material_forbidden' in denied['error'];print('PASS: session expiry is checked after row-lock wait',flush=True)
