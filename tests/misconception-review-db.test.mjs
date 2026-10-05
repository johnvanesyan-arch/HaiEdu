import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const actor='10000000-0000-4000-8000-000000000010', id='30000000-0000-4000-8000-000000000021', other='30000000-0000-4000-8000-000000000023', session='70000000-0000-4000-8000-000000000001';
async function setup(){
 const db=new PGlite();
 await db.exec(await read('tests/fixtures/sprint-15a-remediation-authoring.sql'));
 await db.exec(await read('tests/fixtures/phase3-questions.sql'));
 await db.exec(`alter table skills add column status text default 'review'; alter table misconceptions add column created_at timestamptz default now(); alter table misconceptions add column updated_at timestamptz default now(); update misconceptions set description_hy='Synthetic definition'; create table qa_sessions(id uuid,user_id uuid,active boolean); insert into qa_sessions values('${session}','${actor}',true); create function service_validate_active_session(p_user_id uuid,p_session_id uuid) returns boolean language sql stable as $$ select exists(select 1 from public.qa_sessions where id=p_session_id and user_id=p_user_id and active) $$; grant select,insert,update,delete on misconceptions to authenticated;`);
 await db.exec(await read('supabase/migrations/20261005162651_misconception_review_workspace.sql'));
 return db;
}
async function detail(db,mc=id){return (await db.query('select service_get_misconception_review($1) result',[mc])).rows[0].result;}
async function act(db,action,token,aal='aal2',who=actor,mc=id){return (await db.query('select service_review_misconception($1,$2,$3,$4,$5,$6,$7,$8,$9) result',[mc,action,token,'Updated synthetic title','Updated synthetic description','Reviewed synthetic content',who,session,aal])).rows[0].result;}
test('SQL review lifecycle preserves other content and enforces immutable history, role, MFA and stale guards',async()=>{
 const db=await setup();try{
  const snapshot=async()=> (await db.query("select jsonb_build_object('items',(select jsonb_agg(to_jsonb(i)) from items i),'guides',(select jsonb_agg(to_jsonb(g)) from skill_remediation_guides g),'mappings',(select jsonb_agg(to_jsonb(m)) from item_misconception_mappings m)) result")).rows[0].result;
  const before=await snapshot(), otherBefore=await detail(db,other), initial=await detail(db);
  await assert.rejects(act(db,'approve',initial.expectedToken,'aal1'),/mfa_required/);
  await assert.rejects(act(db,'approve',initial.expectedToken,'aal2','30000000-0000-4000-8000-000000000010'),/content_authoring_role_required/);
  await db.exec('update qa_sessions set active=false');await assert.rejects(act(db,'approve',initial.expectedToken),/account_or_session_inactive/);await db.exec('update qa_sessions set active=true');
  const saved=await act(db,'save_draft',initial.expectedToken,'aal1');assert.equal(saved.definition.status,'draft');assert.equal(saved.definition.review_revision,1);
  await assert.rejects(act(db,'approve',initial.expectedToken),/stale_misconception_review/);
  const requested=await act(db,'request_changes',saved.expectedToken,'aal1');assert.equal(requested.definition.last_action,'request_changes');
  const approved=await act(db,'approve',requested.expectedToken);assert.equal(approved.definition.status,'active');assert.equal(approved.history.length,3);
  await assert.rejects(act(db,'save_draft',approved.expectedToken),/active_definition_read_only/);
  await assert.rejects(db.exec("update misconception_review_events set reason='rewritten'"),/misconception_history_immutable/);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await detail(db,other),otherBefore);
  await db.exec('set role authenticated');await assert.rejects(db.exec("update misconceptions set status='active'"),/permission denied/);await assert.rejects(detail(db),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
test('catalog filters and evidence token follow exact subject, definition and linked response changes',async()=>{
 const db=await setup();try{
  const data=(await db.query('select service_list_misconception_reviews($1) result',[{subjectId:'20000000-0000-4000-8000-000000000001'}])).rows[0].result;
  assert.equal(data.total,1);assert.equal(data.definitions[0].id,other);
  const initial=await detail(db);await db.exec("update item_misconception_mappings set mapping_note='changed'");await assert.rejects(act(db,'approve',initial.expectedToken),/stale_misconception_review/);
  const next=await detail(db);await db.exec("update items set version_no=version_no+1 where id='30000000-0000-4000-8000-000000000001'");await assert.rejects(act(db,'approve',next.expectedToken),/stale_misconception_review/);
  await db.exec("update item_misconception_mappings set item_id='30000000-0000-4000-8000-000000000003'");await assert.rejects(act(db,'approve',(await detail(db)).expectedToken),/misconception_mapping_scope_mismatch/);
 }finally{await db.close();}
});
