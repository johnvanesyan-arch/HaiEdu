import test, {before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
const uuid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const q=async(s,p=[]) => (await db.query(s,p)).rows;
const items=(form=1)=>Array.from({length:20},(_,i)=>({item_id:uuid(form*100+i),skill_id:uuid(500+Math.floor(i/2))}));
const start=async(student=1,form=1,rows=items(form)) => (await q('select public.start_initial_diagnostic_atomic($1,$2,$3,$4,$5,$6) result',
  [uuid(student),'TEST-U01',uuid(20),uuid(30),uuid(40+form),JSON.stringify(rows)]))[0].result;
const reject=async(fn,pattern)=>{
  await db.exec('savepoint expected_error');
  try { await assert.rejects(fn,pattern); }
  finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
};
before(async()=>{
  await db.exec(read('tests/fixtures/initial-diagnostic-database.sql'));
  await db.exec(read('supabase/migrations/20260927183816_single_initial_diagnostic.sql'));
});
after(()=>db.close());
beforeEach(async()=>{
  await db.exec('begin');
  await q('insert into units values($1,$2)',[uuid(10),'TEST-U01']);
  await q("insert into assessment_pools values($1,'DIAG','TEST-U01','diagnostic','active')",[uuid(50)]);
  await q("insert into assessment_blueprints values($1,$2,$3,$4,'diagnostic','pilot')",[uuid(30),uuid(20),uuid(10),uuid(50)]);
  for(const form of [1,2]){
    await q("insert into assessment_forms values($1,$2,$3,1,'active')",[uuid(40+form),uuid(50),`FORM-${form}`]);
    for(const item of items(form)){
      await q("insert into items values($1,$2,'published')",[item.item_id,item.skill_id]);
      await q('insert into assessment_form_items values($1,$2)',[uuid(40+form),item.item_id]);
      await q('insert into assessment_blueprint_items values($1,$2)',[uuid(30),item.item_id]);
    }
  }
});
afterEach(()=>db.exec('rollback'));

test('either complete 20-question form can be assigned; banks remain separate',async()=>{
  const a=await start(1,1),b=await start(2,2);
  assert.equal(a.session.planned_item_count,20);
  assert.equal(a.session.metadata.formCode,'FORM-1');
  assert.equal(b.session.metadata.formCode,'FORM-2');
  assert.equal((await q('select count(*)::int n from learning_session_items'))[0].n,40);
});
test('repeated starts resume the same form, order, and saved progress',async()=>{
  const a=await start();
  await q('update learning_sessions set answered_count=3,correct_count=1 where id=$1',[a.session.id]);
  const b=await start(1,2);
  assert.equal(b.resumed,true);assert.equal(b.session.id,a.session.id);
  assert.equal(b.session.answered_count,3);assert.equal(b.session.metadata.formCode,'FORM-1');
  assert.deepEqual((await q('select item_id from learning_session_items order by ordinal')).map(r=>r.item_id),items().map(r=>r.item_id));
});
test('a completed zero-score diagnostic is final; stale starts return its baseline',async()=>{
  const a=await start();
  await q("update learning_sessions set status='completed',answered_count=20,correct_count=0,completed_at=now() where id=$1",[a.session.id]);
  assert.deepEqual(await start(1,2),{diagnosticCompleted:true,baselineSessionId:a.session.id});
  await reject(()=>q("insert into learning_sessions(student_id,unit_code,mode) values($1,'TEST-U01','diagnostic')",[uuid(1)]),/diagnostic_already_completed/);
  await reject(()=>q("update learning_sessions set status='active' where id=$1",[a.session.id]),/diagnostic_baseline_immutable/);
  await reject(()=>q('update learning_sessions set correct_count=20 where id=$1',[a.session.id]),/diagnostic_baseline_immutable/);
});
test('independent unique constraints reject extra active and completed diagnostics',async()=>{
  const a=await start();
  await reject(()=>q("insert into learning_sessions(student_id,unit_code,mode) values($1,'TEST-U01','diagnostic')",[uuid(1)]),/one_active_diagnostic/);
  const indexes=await q("select indexdef from pg_indexes where indexname like 'learning_sessions_one_%_diagnostic_idx'");
  assert.equal(indexes.length,2);
  assert.ok(indexes.every(r=>r.indexdef.includes('UNIQUE')));
  await reject(()=>q('update learning_sessions set student_id=$1 where id=$2',[uuid(2),a.session.id]),/diagnostic_identity_immutable/);
});
test('another active mode is preserved and blocks a new diagnostic',async()=>{
  const [p]=await q("insert into learning_sessions(student_id,unit_code,mode) values($1,'TEST-U01','practice') returning id",[uuid(1)]);
  const r=await start();assert.equal(r.activeSession.id,p.id);
  assert.equal((await q('select count(*)::int n from learning_sessions'))[0].n,1);
});
test('same learner remains eligible in another chapter; no release-based reset',async()=>{
  const a=await start();
  await q("update learning_sessions set status='completed',completed_at=now() where id=$1",[a.session.id]);
  await q("insert into learning_sessions(student_id,unit_code,mode) values($1,'TEST-U02','diagnostic')",[uuid(1)]);
  const r=(await q('select start_initial_diagnostic_atomic($1,$2,$3,$4,$5,$6) result',[uuid(1),'TEST-U01',uuid(999),uuid(999),uuid(42),'[]']))[0].result;
  assert.equal(r.diagnosticCompleted,true);
});
test('partial, duplicate, mixed-form and unpublished item sets are rejected without a session',async()=>{
  await reject(()=>start(1,1,items().slice(0,19)),/incomplete_diagnostic_form/);
  await reject(()=>start(1,1,[...items().slice(0,19),items()[0]]),/duplicate_diagnostic_items/);
  await reject(()=>start(1,1,[...items().slice(0,19),items(2)[19]]),/ineligible_diagnostic_item/);
  await q("update items set status='draft' where id=$1",[items()[0].item_id]);
  await reject(()=>start(),/ineligible_diagnostic_item/);
  assert.equal((await q('select count(*)::int n from learning_sessions'))[0].n,0);
});
test('an item insert failure rolls back the session header and all items',async()=>{
  await db.exec("alter table learning_session_items add constraint injected_failure check (ordinal < 20)");
  await reject(()=>start(),/injected_failure/);
  assert.equal((await q('select count(*)::int n from learning_sessions'))[0].n,0);
  assert.equal((await q('select count(*)::int n from learning_session_items'))[0].n,0);
});
test('RPC is service-only and invoker; direct student writes remain denied by RLS',async()=>{
  for(const role of ['anon','authenticated']){
    const [r]=await q("select has_function_privilege($1,'public.start_initial_diagnostic_atomic(uuid,text,uuid,uuid,uuid,jsonb)','EXECUTE') allowed",[role]);
    assert.equal(r.allowed,false);
  }
  assert.equal((await q("select prosecdef from pg_proc where proname='start_initial_diagnostic_atomic'"))[0].prosecdef,false);
  await db.exec('set local role authenticated');
  await reject(()=>start(),/permission denied/);
  await db.exec('reset role');
});
