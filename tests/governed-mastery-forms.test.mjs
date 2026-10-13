import test from 'node:test';
import assert from 'node:assert/strict';
import {database,id,blueprintId,launch,finish,baseline,bind,exposure,formIds,formItems,reserves,selection} from './fixtures/governed-mastery-forms-db.mjs';

test('declared mastery forms preserve lifecycle, scope and complete protected assignments',async t=>{
 const db=await database();t.after(()=>db.close());
 const run=async(name,fn)=>t.test(name,async()=>{await db.exec('begin');db.fixtureTransaction=true;try{await fn();}finally{db.fixtureTransaction=false;await db.exec('rollback');}});
 const items=async session=>(await db.query('select item_id from learning_session_items where session_id=$1 order by item_id',[session])).rows.map(r=>r.item_id);
 await run('read-only validation does not seed bindings, learner headers or lifecycle',async()=>{
  const r=await launch(db,0,'mastery_check',{readOnly:true});assert.equal(r.readOnly,true);
  for(const table of ['assessment_policy_bindings','private.mastery_form_selection_bindings','learning_sessions','chapter_mastery_states'])assert.equal((await db.query(`select count(*) n from ${table}`)).rows[0].n,0);
 });
 await run('three failed attempts use three whole disjoint forms and retain required reviews',async()=>{
  await baseline(db);const all=[];
  for(let f=0;f<3;f++){
   const m=await launch(db,0,'mastery_check');assert.equal(m.session.mastery_attempt_number,f+1);assert.equal(m.session.metadata.assessmentFormId,formIds[f]);
   assert.match(m.session.metadata.masteryFormSelectionFingerprint,/^[a-f0-9]{32}$/);
   const selected=await items(m.session.id);assert.deepEqual(selected,formItems[f]);all.push(...selected);
   assert.equal((await launch(db,0,'mastery_check')).session.id,m.session.id);
   const result=await finish(db,m.session.id,false);assert.equal(result.finalResult.passed,false);
   await assert.rejects(launch(db,0,'mastery_check'),/mastery_check_not_allowed|governed_mastery_forms_exhausted/);
   const review=await launch(db,0,'chapter_review');await finish(db,review.session.id,false);
  }
  assert.equal(new Set(all).size,9);assert.equal(all.some(x=>reserves.includes(x)),false);
  await assert.rejects(launch(db,0,'mastery_check'),/governed_mastery_forms_exhausted|mastery_check_not_allowed/);
 });
 await run('any-purpose exposure in another release skips the entire first form',async()=>{
  await baseline(db);await bind(db);await exposure(db,formItems[0][1]);
  const m=await launch(db,0,'mastery_check');assert.equal(m.session.metadata.assessmentFormId,formIds[1]);assert.deepEqual(await items(m.session.id),formItems[1]);
 });
 await run('all exposed forms fail closed without choosing reserves or creating a mastery attempt',async()=>{
  await baseline(db);await bind(db);for(const form of formItems)await exposure(db,form[0]);
  await assert.rejects(launch(db,0,'mastery_check'),/governed_mastery_forms_exhausted/);
  assert.equal((await db.query('select count(*) n from mastery_check_attempts')).rows[0].n,0);
  assert.equal((await db.query("select count(*) n from learning_sessions where mode='mastery_check'")).rows[0].n,0);
 });
 await run('atomic assignment rechecks exposure after an earlier selection',async()=>{
  await baseline(db);const binding=await bind(db);await exposure(db,formItems[0][0]);
  await assert.rejects(db.query('select service_start_governed_session_atomic($1,$2,$3,$4,$5,null,$6)',[id(10),id(401),id(371),binding,formIds[0],formItems[0]]),/governed_mastery_form_exposed/);
 });
 await run('atomic start rejects form mixing, reserves and omitted form identity',async()=>{
  await baseline(db);const binding=await bind(db);
  for(const [form,selected] of [[formIds[0],[formItems[0][0],formItems[1][1],formItems[0][2]]],[formIds[0],[reserves[0],formItems[0][1],formItems[0][2]]],[null,formItems[0]]]){
   await db.exec('savepoint invalid_form');
   await assert.rejects(db.query('select service_start_governed_session_atomic($1,$2,$3,$4,$5,null,$6)',[id(10),id(401),id(371),binding,form,selected]),/governed_mastery_form_invalid/);
   await db.exec('rollback to invalid_form');
  }
 });
 await run('registered form membership cannot silently change',async()=>{
  await bind(db);await assert.rejects(db.query('delete from assessment_form_items where form_id=$1',[formIds[0]]),/mastery_form_membership_immutable/);
 });
 await run('configuration removal or reordered forms cannot replace the bound manifest',async()=>{
  await bind(db);
  for(const config of [null,{...selection,formIds:[...formIds].reverse()}]){
   await db.exec('savepoint mutation');
   if(config)await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{masteryFormSelection}',$2) where id=$1",[blueprintId(0,'mastery_check'),JSON.stringify(config)]);
   else await db.query("update assessment_blueprints set configuration_snapshot=configuration_snapshot-'masteryFormSelection' where id=$1",[blueprintId(0,'mastery_check')]);
   await assert.rejects(launch(db,0,'mastery_check',{readOnly:true}),/mastery_form_selection_snapshot_conflict/);
   await db.exec('rollback to mutation');
  }
 });
 await run('retired form and stale item version deny subsequent starts',async()=>{
  await baseline(db);await bind(db);
  for(const [sql,params] of [["update assessment_forms set status='retired' where id=$1",[formIds[1]]],['update items set version_no=2 where id=$1',[formItems[1][0]]]]){
   await db.exec('savepoint stale');await db.query(sql,params);await assert.rejects(launch(db,0,'mastery_check'),/mastery_form_selection_invalid|assessment_policy_item_scope_invalid/);await db.exec('rollback to stale');
  }
 });
 await run('a changed form version conflicts with its bound manifest',async()=>{
  await bind(db);await db.query('update assessment_forms set form_version=2 where id=$1',[formIds[0]]);
  await assert.rejects(launch(db,0,'mastery_check',{readOnly:true}),/mastery_form_selection_snapshot_conflict/);
 });
 await run('incorrect per-skill coverage and overlapping form membership cannot bind',async()=>{
  for(const item of [formItems[0][1],reserves[1]]){
   await db.exec('savepoint bad_coverage');
   await db.query('delete from assessment_form_items where form_id=$1 and item_id=$2',[formIds[1],formItems[1][0]]);
   await db.query('insert into assessment_form_items values($1,$2)',[formIds[1],item]);
   await assert.rejects(launch(db,0,'mastery_check',{readOnly:true}),/mastery_form_selection_invalid/);
   await db.exec('rollback to bad_coverage');
  }
 });
 await run('active practice eligibility blocks protection before binding',async()=>{
  await db.query('insert into assessment_pool_items values($1,$2,true)',[id(710),formItems[0][0]]);
  await assert.rejects(launch(db,0,'mastery_check',{readOnly:true}),/mastery_form_pool_overlap/);
 });
 await run('later practice eligibility and a competing exposure cannot leak a reserved item',async()=>{
  await baseline(db);const m=await launch(db,0,'mastery_check');
  await db.exec('savepoint pool_conflict');await assert.rejects(db.query('insert into assessment_pool_items values($1,$2,true)',[id(710),formItems[0][0]]),/mastery_form_pool_overlap/);await db.exec('rollback to pool_conflict');
  await db.exec('savepoint exposure_conflict');await assert.rejects(exposure(db,formItems[0][0]),/mastery_form_item_reserved/);await db.exec('rollback to exposure_conflict');
  await finish(db,m.session.id); // The owning session still serves and answers normally.
 });
 await run('other subjects retain their unconfigured dynamic selection',async()=>{
  const d=await launch(db,2);await finish(db,d.session.id);
  for(const skill of [525,526])await db.query("insert into student_skill_mastery_by_release values($1,$2,$3,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set mastery_score=.9,evidence_count=10",[id(502),id(10),id(skill)]);
  const m=await launch(db,2,'mastery_check');assert.equal(m.session.metadata.assessmentFormId,null);assert.equal(m.session.metadata.masteryFormSelectionFingerprint,undefined);assert.equal((await finish(db,m.session.id)).finalResult.passed,true);
 });
 await run('public roles cannot call the private validator or launch RPC',async()=>{
  for(const role of ['anon','authenticated']){await db.exec('savepoint privileges');await db.exec(`set local role ${role}`);await assert.rejects(db.query('select service_bind_assessment_policy($1)',[blueprintId(0,'mastery_check')]),/permission denied/);await db.exec('rollback to privileges');}
 });
});
