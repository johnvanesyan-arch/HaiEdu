"""Owned local database qualification; no supplied DSN or hosted project is accepted."""
from pathlib import Path
import sys,json,uuid,concurrent.futures,tempfile,time
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from fresh_update_bridge import load_plan,owned_database,capture,comparison
import psycopg
plan=load_plan();proof={'passed':False,'productionTouched':False,'update':plan['entries'][-1]['id']}
with tempfile.TemporaryDirectory(prefix='haiedu-client-sql-') as scratch, owned_database(plan,Path(scratch),staging_gateway=True) as db:
 db.apply(plan)
 with db.connect() as c,c.transaction():
  proof['catalogueSha256']=comparison.baseline.digest(capture(c))
  c.execute("insert into private.client_failure_builds values (%s,clock_timestamp()+interval '30 days')",['a'*64])
  actors=[]
  for _ in range(101):
   actor,session=str(uuid.uuid4()),str(uuid.uuid4())
   c.execute('insert into auth.users(id) values (%s)',[actor])
   c.execute('insert into auth.sessions(id,user_id) values (%s,%s)',[session,actor])
   actors.append((actor,session))
 print('PASS schema and synthetic actors created',flush=True)
 def report(operation='dashboard_load',**changes):
  return {'schemaVersion':1,'buildId':'a'*64,'page':'student','operation':operation,'category':'service_failure','status':503,'durationMs':100,'eventId':str(uuid.uuid4()),**changes}
 def record(actor,value):
  with psycopg.connect(db.stack['uri'],autocommit=True) as c:
   c.execute('set role service_role')
   return c.execute('select public.service_record_client_failure(%s,%s,%s::jsonb)',[*actor,json.dumps(value)]).fetchone()[0]
 for invalid in [report(page=None),report(answer='canary'),report(buildId='b'*64),report(status='503')]:
  assert record(actors[0],invalid)=='invalid'
 first=report();assert record(actors[0],first)=='accepted';assert record(actors[0],first)=='duplicate'
 for op in ['learning_load','draft_save','file_load','audio_load']:assert record(actors[0],report(op))=='accepted'
 assert record(actors[0],report('admin_action'))=='limited'
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  outcomes=list(pool.map(lambda actor:record(actor,report()),actors[1:100]))
 assert set(outcomes)<= {'accepted','limited'}, {x:outcomes.count(x) for x in set(outcomes)}
 for actor,outcome in zip(actors[1:100],outcomes):
  if outcome=='limited':assert record(actor,report())=='accepted'
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  outcomes=list(pool.map(lambda pair:record(pair[0],report(pair[1])),[(a,op) for a in actors[1:100] for op in ['learning_load','draft_save','file_load','audio_load']]))
 assert set(outcomes)<= {'accepted','limited'}, {x:outcomes.count(x) for x in set(outcomes)}
 proof['concurrentAdmissionRefusals']=outcomes.count('limited')
 # A busy diagnostic lock may drop reports, never business actions. Explicit
 # test-only sequential calls fill remaining capacity to verify the hard ceiling.
 for (actor,op),outcome in zip([(a,op) for a in actors[1:100] for op in ['learning_load','draft_save','file_load','audio_load']],outcomes):
  if outcome=='limited':assert record(actor,report(op))=='accepted'
 assert record(actors[100],report())=='limited'
 with db.connect() as c:
  assert c.execute('select sum(accepted) from private.client_failure_hours').fetchone()[0]==500
  assert c.execute('select count(*) from private.client_failure_events').fetchone()[0]==500
  summary=c.execute('select public.service_read_client_failure_summary()').fetchone()[0]
  assert len(summary)==5 and all(x['count']==100 for x in summary),summary
  for role in ['anon','authenticated']:
   assert c.execute('select has_function_privilege(%s,%s,%s)',[role,'public.service_record_client_failure(uuid,uuid,jsonb)','EXECUTE']).fetchone()[0] is False
   assert c.execute('select has_function_privilege(%s,%s,%s)',[role,'public.service_read_client_failure_summary()','EXECUTE']).fetchone()[0] is False
   assert c.execute("select count(*) from pg_class t join pg_namespace n on n.oid=t.relnamespace where n.nspname='private' and t.relname like 'client_failure_%%' and t.relkind='r' and (not t.relrowsecurity or has_table_privilege(%s,t.oid,'SELECT,INSERT,UPDATE,DELETE'))",[role]).fetchone()[0]==0
  c.execute('delete from auth.sessions where id=%s',[actors[0][1]])
  assert record(actors[0],first)=='inactive'
  c.execute("update public.profiles set account_status='suspended' where id=%s",[actors[1][0]])
  assert record(actors[1],report())=='inactive'
  c.execute("update public.profiles set account_status='active' where id=%s",[actors[1][0]])
  c.execute('delete from public.profiles where id=%s',[actors[0][0]])
  assert c.execute('select count(*) from private.client_failure_events where actor_id=%s',[actors[0][0]]).fetchone()[0]==0
  c.execute("update private.client_failure_events set received_at=clock_timestamp()-interval '24 hours'")
  c.execute("update private.client_failure_buckets set bucket=bucket-interval '8 days'")
  existing_jobs=c.execute('select jobname,schedule,command,active from cron.job order by jobname').fetchall()
  c.execute((ROOT/'supabase/updates/activation/bf22_client_failure_retention.sql').read_text())
  job,command=c.execute("select jobid,command from cron.job where jobname='haiedu-bf22-client-failure-retention'").fetchone()
  c.execute("select cron.schedule('haiedu-bf22-client-failure-retention','1 second',%s)",[command])
  deadline=time.monotonic()+20
  while c.execute('select count(*) from private.client_failure_events').fetchone()[0] and time.monotonic()<deadline:time.sleep(.2)
  assert c.execute("select count(*) from cron.job_run_details where jobid=%s and status='succeeded'",[job]).fetchone()[0]>=1
  c.execute('select cron.unschedule(%s)',[job])
  assert c.execute('select jobname,schedule,command,active from cron.job order by jobname').fetchall()==existing_jobs
  proof['realRetentionSchedulerVerified']=True
  assert c.execute('select count(*) from private.client_failure_events').fetchone()[0]==0
  assert c.execute('select count(*) from private.client_failure_buckets').fetchone()[0]==0
 proof.update({'passed':True,'concurrentActors':100,'admittedReports':500,'perActorAndGlobalCaps':True,'privacyAndErasure':True,'revokedSessionRejected':True,'expiryVerified':True})
 print('PASS 100 actors, atomic 500-report ceiling, private grants, revocation, erasure and expiry',flush=True)
print(json.dumps(proof,sort_keys=True),flush=True)
print('PASS owned local stack removed',flush=True)
