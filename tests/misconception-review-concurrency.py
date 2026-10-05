"""Real PostgreSQL, independent connections, disposable fixtures only.
Auth session/AAL inputs are synthetic; live Supabase auth is tested separately.
"""
from pathlib import Path
import importlib.util
import sys
import psycopg
from psycopg.types.json import Jsonb
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests/fixtures'))
from phase3_postgres import database_uri
spec=importlib.util.spec_from_file_location('legacy',ROOT/'tests/phase3-content-concurrency.py')
legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
ACTOR=legacy.ACTOR
MC='30000000-0000-4000-8000-000000000021'
SECOND='30000000-0000-4000-8000-000000000022'
OTHER='30000000-0000-4000-8000-000000000023'
SESSION='70000000-0000-4000-8000-000000000001'
MIGRATION=ROOT/'supabase/migrations/20261005162651_misconception_review_workspace.sql'
CALL='select service_review_misconception(%s,%s,%s,%s,%s,%s,%s,%s,%s)'

def detail(c,mc=MC): return c.execute('select service_get_misconception_review(%s)',(mc,)).fetchone()[0]
def act(c,action,token,mc=MC,aal='aal2',actor=ACTOR,session=SESSION):
 return c.execute(CALL,(mc,action,token,'Փորձնական հստակ վերնագիր','Փորձնական սահմանման նոր նկարագրություն','Isolated QA decision',actor,session,aal)).fetchone()[0]
def expect_error(c,needle,call):
 try:
  with c.transaction(): call()
 except psycopg.Error as e: assert needle in str(e),(needle,str(e))
 else: raise AssertionError('expected '+needle)
def prepare(c):
 c.execute("update misconceptions set status='draft',title_hy='QA synthetic misconception',description_hy='Initial synthetic description' where id=%s",(MC,))
 c.execute("update item_misconception_mappings set mapping_note='Approved isolated fixture' where misconception_id=%s",(MC,))
 return detail(c)['expectedToken']
def unchanged(c):
 tables=['items','item_options','item_answer_keys','item_versions','item_reviews','item_qa_runs','assessment_pool_items','skill_remediation_guides','item_template_remediation_guides']
 return {t:c.execute(f'select coalesce(jsonb_agg(to_jsonb(x)),\'[]\'::jsonb) from (select * from {t} order by 1) x').fetchone()[0] for t in tables}
def run(uri):
 with psycopg.connect(uri,autocommit=True) as c:
  legacy.initialize(c)
  c.execute("alter table skills add column status text default 'review'; alter table misconceptions add column created_at timestamptz default now(); alter table misconceptions add column updated_at timestamptz default now(); update misconceptions set description_hy='Initial synthetic description';")
  c.execute('create table qa_sessions(id uuid primary key,user_id uuid,active boolean)')
  c.execute('insert into qa_sessions values(%s,%s,true)',(SESSION,ACTOR))
  c.execute("create function service_validate_active_session(p_user_id uuid,p_session_id uuid) returns boolean language sql stable as $$ select exists(select 1 from public.qa_sessions where id=p_session_id and user_id=p_user_id and active) $$")
  c.execute('grant select,insert,update,delete on misconceptions to authenticated')
  c.execute(MIGRATION.read_text())
  initial=unchanged(c); other=detail(c,OTHER)
  for role in ['anon','authenticated']:
   c.execute('set role '+role)
   expect_error(c,'permission denied',lambda:detail(c))
   expect_error(c,'permission denied',lambda:c.execute("update misconceptions set status='active' where id=%s",(MC,)))
   c.execute('reset role')
  print('PASS anon/authenticated cannot use review RPC or bypass audited definition writes',flush=True)
  token=detail(c)['expectedToken']
  expect_error(c,'mfa_required',lambda:act(c,'approve',token,aal='aal1'))
  expect_error(c,'content_authoring_role_required',lambda:act(c,'approve',token,actor='30000000-0000-4000-8000-000000000010'))
  expect_error(c,'account_or_session_inactive',lambda:act(c,'approve',token,session='70000000-0000-4000-8000-000000000002'))
  c.execute('update qa_sessions set active=false');expect_error(c,'account_or_session_inactive',lambda:act(c,'approve',token));c.execute('update qa_sessions set active=true')
  assert c.execute('select count(*) from misconception_review_events').fetchone()[0]==0
  first,second=legacy.race(uri,lambda con:act(con,'save_draft',token,aal='aal1'),lambda con:act(con,'approve',token))
  assert first['definition']['status']=='draft' and 'stale_misconception_review' in str(second)
  print('PASS concurrent draft save defeats stale approval',flush=True)
  token=detail(c)['expectedToken'];requested=act(c,'request_changes',token,aal='aal1')
  assert requested['definition']['status']=='draft' and requested['history'][0]['action']=='request_changes'
  token=requested['expectedToken']
  first,second=legacy.race(uri,lambda con:act(con,'approve',token),lambda con:act(con,'approve',token))
  assert first['definition']['status']=='active' and 'stale_misconception_review' in str(second)
  assert len([e for e in detail(c)['history'] if e['action']=='approve'])==1
  expect_error(c,'active_definition_read_only',lambda:act(c,'save_draft',detail(c)['expectedToken']))
  expect_error(c,'misconception_history_immutable',lambda:c.execute("update misconception_review_events set reason='changed'"))
  assert unchanged(c)==initial and detail(c,OTHER)==other
  print('PASS one concurrent approval, immutable history, unrelated subject/items/guides/pools unchanged',flush=True)
  token=prepare(c)
  _,second=legacy.race(uri,lambda con:con.execute("update item_misconception_mappings set mapping_note='concurrent mapping revision' where misconception_id=%s",(MC,)),lambda con:act(con,'approve',token))
  assert 'stale_misconception_review' in str(second)
  print('PASS mapping edit first blocks and invalidates old approval',flush=True)
  token=prepare(c)
  first,_=legacy.race(uri,lambda con:act(con,'approve',token),lambda con:con.execute("update item_misconception_mappings set mapping_note='later mapping revision' where misconception_id=%s",(MC,)))
  assert first['definition']['status']=='active'
  assert first['history'][0]['mapping_snapshot'][0]['mappingNote']=='Approved isolated fixture'
  print('PASS approval first serializes mapping edits with exact reviewed mapping snapshot',flush=True)
  token=prepare(c)
  payload={'promptHy':'Փորձնական մրցակցող փոփոխություն','difficulty':2,'itemFamily':'application','options':[{'key':'A','contentHy':'Տարբերակ Ա'},{'key':'B','contentHy':'Տարբերակ Բ'}],'answerKey':{'answer':'A'},'misconceptions':[{'code':'QA_ATTACHED_DRAFT','responseKey':'B','mappingNote':'Approved isolated fixture'}],'changeSummary':'Isolated existing revision path'}
  revision=lambda con:con.execute(legacy.REVISE,(legacy.ITEM,ACTOR,Jsonb(payload))).fetchone()[0]
  changed,denied=legacy.race(uri,revision,lambda con:act(con,'approve',token))
  assert changed['versionNo']==5 and 'stale_misconception_review' in str(denied)
  assert detail(c)['definition']['status']=='draft'
  print('PASS existing question revision with draft mapping remains functional and invalidates stale review',flush=True)
  data=c.execute('select service_list_misconception_reviews(%s)',(Jsonb({'subjectId':'20000000-0000-4000-8000-000000000001'}),)).fetchone()[0]
  assert data['total']==1 and data['definitions'][0]['id']==OTHER
  # Invalid cross-skill mappings must not be approved.
  c.execute('insert into item_misconception_mappings(item_id,misconception_id,response_key) values(%s,%s,%s)',('30000000-0000-4000-8000-000000000003',SECOND,'B'))
  expect_error(c,'misconception_mapping_scope_mismatch',lambda:act(c,'approve',detail(c,SECOND)['expectedToken'],mc=SECOND))
  print('PASS subject filters and cross-skill approval denial',flush=True)
if __name__=='__main__':
 with database_uri() as uri:run(uri)
