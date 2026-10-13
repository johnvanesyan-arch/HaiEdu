import test from 'node:test';
import assert from 'node:assert/strict';
import {database,id,releaseSQL} from './fixtures/release-unit-scope.mjs';
const activate=(db,n,status='pilot')=>db.query('update curriculum_releases set status=$2 where id=$1',[id(n),status]);
test('disjoint active chapters coexist; original release and scope remain byte-identical',async t=>{
 const db=await database();t.after(()=>db.close());
 const before=(await db.query('select to_jsonb(r) row from curriculum_releases r where id=$1',[id(10)])).rows;
 await activate(db,11);await activate(db,13);
 assert.deepEqual((await db.query('select to_jsonb(r) row from curriculum_releases r where id=$1',[id(10)])).rows,before);
 assert.equal((await db.query('select count(*) n from private.active_curriculum_release_units')).rows[0].n,3);
 await assert.rejects(activate(db,12),/duplicate key.*active_curriculum_release_units/s);
 assert.equal((await db.query('select status from curriculum_releases where id=$1',[id(12)])).rows[0].status,'draft');
 await activate(db,10,'superseded');await activate(db,12);
 assert.equal((await db.query('select curriculum_release_id from private.active_curriculum_release_units where unit_id=$1',[id(101)])).rows[0].curriculum_release_id,id(12));
});
test('six pilot gates, independent production SME gate and complete per-unit scope remain enforced',async t=>{
 const db=await database();t.after(()=>db.close());
 for(const code of ['official_programme_identified','normative_sources_registered','outcomes_reconciled','skills_mapped','assessment_scope_bound','content_qa_passed']){
  await db.query("update curriculum_release_gate_checks set status='pending' where curriculum_release_id=$1 and gate_code=$2",[id(11),code]);
  await assert.rejects(activate(db,11),/curriculum_release_gate_failure/);
  await db.query("update curriculum_release_gate_checks set status='passed' where curriculum_release_id=$1 and gate_code=$2",[id(11),code]);
 }
 await activate(db,11);
 await assert.rejects(activate(db,11,'production'),/curriculum_release_gate_failure/);
 await db.query("update curriculum_release_gate_checks set status='passed' where curriculum_release_id=$1 and gate_code='external_sme_approved'",[id(11)]);
 await db.query("update assessment_blueprints set status='production' where curriculum_release_id=$1",[id(11)]);
 await activate(db,11,'production');
 await db.exec(releaseSQL(20,1,[103,104]));
 await db.query('delete from curriculum_release_reconciliations where curriculum_release_id=$1 and unit_id=$2',[id(20),id(104)]);
 await assert.rejects(activate(db,20),/reconciliation_count_invalid/);
 await db.query('insert into curriculum_release_reconciliations values($1,$2,$2)',[id(20),id(104)]);
 await db.query("delete from assessment_blueprints where curriculum_release_id=$1 and unit_id=$2 and purpose='practice'",[id(20),id(104)]);
 await assert.rejects(activate(db,20),/blueprints_incomplete/);
});
test('activated snapshots cannot move, rewind or change programme; draft scope matches programme',async t=>{
 const db=await database();t.after(()=>db.close());
 for(const sql of [
  `delete from curriculum_release_units where curriculum_release_id='${id(10)}'`,
  `update curriculum_release_units set curriculum_release_id='${id(11)}' where curriculum_release_id='${id(10)}'`,
  `insert into curriculum_release_units values('${id(10)}','${id(103)}','SYN-3')`,
  `update curriculum_release_skills set curriculum_release_id='${id(11)}' where curriculum_release_id='${id(10)}'`,
  `update curriculum_releases set status='draft',activated_at=null where id='${id(10)}'`,
  `update curriculum_releases set subject_program_id='${id(2)}' where id='${id(10)}'`,
  `delete from curriculum_releases where id='${id(10)}'`,
 ])await assert.rejects(db.exec(sql),/activated_curriculum_release/);
 await assert.rejects(db.query('update curriculum_releases set subject_program_id=$2 where id=$1',[id(11),id(2)]),/programme_mismatch/);
 await assert.rejects(db.query('insert into curriculum_release_units values($1,$2,$3)',[id(11),id(201),'SYN-1']),/programme_mismatch/);
 await assert.rejects(db.query('update units set subject_program_id=$2 where id=$1',[id(102),id(2)]),/programme_mismatch/);
 await assert.rejects(db.query("insert into curriculum_releases(id,subject_program_id,release_key,release_number,status,activated_at) values($1,$2,'direct',30,'pilot',now())",[id(30),id(2)]),/must_start_as_draft/);
});
test('claims and trigger functions cannot be written or invoked directly through API roles',async t=>{
 const db=await database();t.after(()=>db.close());
 for(const role of ['anon','authenticated','service_role']){
  const row=(await db.query("select has_table_privilege($1,'private.active_curriculum_release_units','select,insert,update,delete') allowed,has_function_privilege($1,'private.sync_active_curriculum_release_units()','execute') callable",[role])).rows[0];
  assert.equal(row.allowed,false);assert.equal(row.callable,false);
 }
 assert.equal((await db.query("select relrowsecurity from pg_class where oid='private.active_curriculum_release_units'::regclass")).rows[0].relrowsecurity,true);
});
test('authorized catalogue RLS writes fire private guards; a denied role cannot activate or write claims',async t=>{
 const db=await database();t.after(()=>db.close());
 // Representative content-admin/student RLS; no Auth session or production role claim is fabricated.
 await db.exec(`alter table curriculum_releases enable row level security;
 grant select,insert,update,delete on curriculum_releases to authenticated;
 create policy fixture_catalogue_admin on curriculum_releases for all to authenticated
 using(current_setting('fixture.content_admin',true)='true') with check(current_setting('fixture.content_admin',true)='true');
 set role authenticated;set fixture.content_admin='true';`);
 await db.query("update curriculum_releases set content_fingerprint='reviewed' where id=$1",[id(11)]);
 await activate(db,11);
 await db.exec("set fixture.content_admin='false'");
 assert.equal((await db.query("update curriculum_releases set status='retired' where id=$1 returning id",[id(11)])).rows.length,0);
 await assert.rejects(db.exec('delete from private.active_curriculum_release_units'),/permission denied/);
 await db.exec('reset role');
 assert.equal((await db.query('select status from curriculum_releases where id=$1',[id(11)])).rows[0].status,'pilot');
 assert.equal((await db.query('select curriculum_release_id from private.active_curriculum_release_units where unit_id=$1',[id(102)])).rows[0].curriculum_release_id,id(11));
});
test('older-snapshot governance writes fail explicitly without restricting ordinary reads',async t=>{
 const db=await database();t.after(()=>db.close());
 for(const isolation of ['repeatable read','serializable'])for(const sql of [
  `update curriculum_releases set status='pilot' where id='${id(11)}'`,
  `insert into curriculum_release_units values('${id(11)}','${id(104)}','SYN-4')`,
  `update units set subject_program_id='${id(2)}' where id='${id(104)}'`,
 ]){
  await db.exec('begin isolation level '+isolation);
  assert.equal((await db.query('select count(*) n from curriculum_releases')).rows[0].n,6);
  await assert.rejects(db.exec(sql),/governance_requires_read_committed/);
  await db.exec('rollback');
 }
});
