import test from 'node:test';
import assert from 'node:assert/strict';
import { database,id,navigation,dashboard,launch,finish,operation,scopes } from './fixtures/learning-dashboard-db.mjs';

test('read-only learner navigation and dashboards use the real governed context transactions', async t=>{
 const db=await database(); t.after(()=>db.close());
 const run=async(name,fn)=>t.test(name,async()=>{await db.exec('begin');db.fixtureTransaction=true;try{await fn();}finally{db.fixtureTransaction=false;await db.exec('rollback');}});
 await run('navigation offers three units in two programmes and exact independent enrollments',async()=>{
   const r=await navigation(db);assert.equal(r.readOnly,true);assert.equal(r.contexts.length,3);
   assert.equal(new Set(r.contexts.map(x=>x.subjectProgramId)).size,2);
   assert.equal(new Set(r.contexts.map(x=>x.enrollmentId)).size,2);
   assert.equal((await navigation(db,{student:id(11),auth:id(402)})).contexts.length,1);
 });
 await run('catalogue and status create no bindings, sessions, evidence, exposures or lifecycle',async()=>{
   await navigation(db);for(let i=0;i<3;i++){const d=await dashboard(db,i);assert.equal(d.modes.diagnostic.questions,3);assert.equal(d.skills.length,2);assert.equal(d.practiceAccess.unlocked,false);}
   for(const table of ['assessment_policy_bindings','learning_sessions','attempts','student_item_exposure_events','chapter_mastery_states'])assert.equal((await db.query(`select count(*) n from ${table}`)).rows[0].n,0);
 });
 await run('unequal allocations and supporting pass minima remain policy-derived',async()=>{
   const d=await dashboard(db);assert.equal(d.modes.mastery_check.minimumPercent,80);
   assert.deepEqual(d.modes.mastery_check.minimumCorrectBySkill,{[id(scopes[0].skills[0])]:1});
   assert.equal(Object.hasOwn(d.modes.mastery_check.minimumCorrectBySkill,id(scopes[0].skills[1])),false);
 });
 await run('any completed diagnostic unlocks only its exact immutable chapter',async()=>{
   const d=await launch(db);await finish(db,d.session.id,false);
   assert.equal((await dashboard(db)).practiceAccess.unlocked,true);
   for(const i of [1,2])assert.equal((await dashboard(db,i)).practiceAccess.unlocked,false);
 });
 await run('running diagnostic correctness and mastery are hidden in every dashboard field',async()=>{
   const d=await launch(db);const item=await operation(db,d.session.id,'serve');await operation(db,d.session.id,'answer',{sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:'A'}});
   const r=await dashboard(db);assert.equal(r.activeSession.answered,1);assert.equal(r.activeSession.correct,undefined);assert.equal(r.baseline,null);assert.equal(r.history.length,0);assert.ok(r.skills.every(s=>s.mastery===null&&s.ready===null));
 });
 await run('historical session provenance retains original build, model, policy and release',async()=>{
   const d=await launch(db);await finish(db,d.session.id);const r=await dashboard(db);
   assert.equal(r.history[0].policyBindingId,d.session.assessment_policy_binding_id);
   assert.equal(r.history[0].runtimeBuildId,d.session.runtime_build_id);
   assert.equal(r.history[0].modelId,d.session.learning_model_configuration_id);
   assert.equal(r.history[0].curriculumReleaseId,d.session.curriculum_release_id);
 });
 await run('foreign ownership and mixed enrollment/release/unit selectors deny',async()=>{
   await assert.rejects(dashboard(db,0,{enrollment:id(372)}),/learning_context_unavailable/);
   await assert.rejects(dashboard(db,0,{release:id(502)}),/learning_context_unavailable/);
   await assert.rejects(dashboard(db,0,{unit:id(scopes[2].unit)}),/learning_context_unavailable/);
 });
 for(const [table,key,value] of [['institutional_class_enrollments','id',id(371)],['institutional_memberships','id',id(331)],['teacher_assignments','id',id(351)],['teacher_subject_authorizations','id',id(361)]])await run(`${table} revocation removes its contexts and denies selected dashboard`,async()=>{
   await db.query(`update ${table} set status='revoked' where ${key}=$1`,[value]);
   assert.equal((await navigation(db)).contexts.length,1);await assert.rejects(dashboard(db),/learning_context_unavailable/);
 });
 await run('revoked Auth session denies even an empty navigation result',async()=>{
   await db.query('delete from auth.sessions where id=$1',[id(401)]);await assert.rejects(navigation(db),/learning_context_unavailable/);await assert.rejects(dashboard(db),/learning_context_unavailable/);
 });
 await run('unconfigured blueprint is visible without invented counts or a launch contract',async()=>{
   await db.query("update assessment_blueprints set configuration_snapshot='{}' where curriculum_release_id=$1 and unit_id=$2",[id(501),id(scopes[0].unit)]);
   const r=await dashboard(db);assert.equal(r.modes.practice.status,'unconfigured');assert.equal(r.modes.practice.questions,undefined);assert.ok(r.skills.every(s=>s.ready===null));
 });
 await run('registered legacy navigation reads immutable model counts without synthesizing a new policy',async()=>{
   await db.query("update assessment_blueprints set configuration_snapshot=jsonb_build_object('targetQuestions',7) where curriculum_release_id=$1 and unit_id=$2",[id(501),id(511)]);
   await db.query("update learning_model_configurations set configuration=configuration||$2 where id=$1",[id(611),JSON.stringify({diagnostic:{itemsPerSkill:2},masteryCheck:{itemsPerSkill:2,overallPassPercent:80,minimumCorrectPerSkill:1},practice:{plannedSessionLength:8}})]);
   await db.query("insert into legacy_learning_blueprint_mappings(assessment_blueprint_id,curriculum_release_id,subject_program_id,unit_id,unit_code_snapshot,source_configuration_fingerprint,extension_key) select id,curriculum_release_id,$1,unit_id,'SYN-A-CH1','fixture','legacy-physics7-u01-v1' from assessment_blueprints where curriculum_release_id=$2 and unit_id=$3",[id(201),id(501),id(511)]);
   const d=await dashboard(db);assert.equal(d.modes.diagnostic.status,'registered_legacy');assert.equal(d.modes.diagnostic.questions,4);assert.equal(d.modes.practice.questions,8);assert.equal(d.modes.chapter_review.questions,7);
   assert.equal((await navigation(db)).contexts.find(c=>c.unitId===id(511)).extensionKey,'legacy-physics7-u01-v1');
   assert.equal((await db.query('select count(*) n from assessment_policy_bindings')).rows[0].n,0);
 });
 await run('client roles cannot execute either privileged read API or its helper',async()=>{
   for(const role of ['anon','authenticated'])for(const fn of ['service_student_learning_navigation(uuid,uuid)','service_student_learning_dashboard(uuid,uuid,uuid,uuid,uuid)','private.assert_student_dashboard_session(uuid,uuid)'])assert.equal((await db.query('select has_function_privilege($1,$2,\'execute\') allowed',[role,fn])).rows[0].allowed,false);
 });
});
