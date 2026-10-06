import test from 'node:test';
import assert from 'node:assert/strict';
import {database,bind,start,id,scopes,policy,slot,itemIds,blueprintId,formId} from './fixtures/governed-session-db.mjs';
import {readAssessmentPolicy} from '../supabase/functions/_shared/assessment-policy.mjs';
import {readFileSync} from 'node:fs';
import {migrationPath} from './fixtures/governed-session-db.mjs';
async function temporary(db,mutation,action,pattern){await db.exec('begin');try{await mutation();await assert.rejects(action,pattern);}finally{await db.exec('rollback');}}

test('governed policies: exact three chapter/subject scopes and immutable bindings',async t=>{
 const db=await database();try{
  for(let i=0;i<3;i++)for(const mode of ['diagnostic','practice','mastery_check','chapter_review'])await t.test(`${i}/${mode}`,async()=>{
   const p=policy(scopes[i],mode);assert.deepEqual(readAssessmentPolicy({assessmentPolicy:p},{mode,subjectProgramId:p.subjectProgramId,curriculumReleaseId:p.curriculumReleaseId,unitId:p.unitId}),p);
   const first=await bind(db,i,mode);assert.equal(await bind(db,i,mode),first);
   const row=(await db.query('select * from assessment_policy_bindings where id=$1',[first])).rows[0];assert.deepEqual(row.policy_snapshot,p);
   assert.deepEqual(row.skill_scope_snapshot,scopes[i].skills.map(id));
  });
  await t.test('policy and model references cannot be rewritten',async()=>{
   const binding=await bind(db);
   await assert.rejects(()=>db.query('update assessment_policy_bindings set policy_snapshot=$1 where id=$2',['{}',binding]),/immutable/);
   await assert.rejects(()=>db.query('delete from assessment_policy_bindings where id=$1',[binding]),/immutable/);
  });
 }finally{await db.close();}
});

test('governed policies reject missing, unsupported and contradictory declarations',async t=>{
 const db=await database();try{
  const cases=[
   ['absent schema',p=>{delete p.schemaVersion;}],['unknown schema',p=>{p.schemaVersion='other';}],
   ['unknown capability',p=>{p.responseTypes=['numeric'];}],['duplicate capability',p=>{p.responseTypes=['single_choice','single_choice'];}],
   ['unknown scorer',p=>{p.scoringStrategy='automatic-default';}],['extra field',p=>{p.defaultSubject='x';}],
   ['fractional count',p=>{p.plannedQuestionCount=2.5;}],['wrong total',p=>{p.plannedQuestionCount=4;}],
   ['missing model',p=>{p.learningModelConfigurationId=id(9999);}],['other-release model',p=>{p.learningModelConfigurationId=id(612);}],
   ['other-unit skill',p=>{p.questionCountBySkill={[id(523)]:1,[id(522)]:2};}],
   ['other-subject skill',p=>{p.questionCountBySkill={[id(525)]:1,[id(522)]:2};}],
   ['second baseline',p=>{p.maximumCompletedBaselines=2;}],['diagnostic hints',p=>{p.hintsAllowed=true;}],
  ];
  for(const [name,change]of cases)await t.test(name,()=>temporary(db,async()=>{const p=policy(scopes[0]);change(p);await db.query('update assessment_blueprints set configuration_snapshot=$1 where id=$2',[JSON.stringify({assessmentPolicy:p}),blueprintId(0)]);},()=>bind(db),/assessment_policy/));
  await t.test('practice cannot waive the accepted baseline rule',()=>temporary(db,async()=>{const p=policy(scopes[0],'practice');p.baselineRequired=false;await db.query('update assessment_blueprints set configuration_snapshot=$1 where id=$2',[JSON.stringify({assessmentPolicy:p}),blueprintId(0,'practice')]);},()=>bind(db,0,'practice'),/chapter_diagnostic_policy_required/));
  await t.test('missing declaration remains unconfigured',()=>temporary(db,()=>db.query("update assessment_blueprints set configuration_snapshot='{}' where id=$1",[blueprintId(0)]),()=>bind(db),/unconfigured/));
  await t.test('model must explicitly approve the contract',()=>temporary(db,()=>db.query("update learning_model_configurations set configuration='{}' where id=$1",[id(611)]),()=>bind(db),/model_incompatible/));
  await t.test('candidate model is not an approved runtime',()=>temporary(db,()=>db.query("update learning_model_configurations set configuration_kind='candidate' where id=$1",[id(611)]),()=>bind(db),/model_incompatible/));
  await t.test('retired lifecycle version',()=>temporary(db,()=>db.query("update academic_mastery_policy_versions set status='retired'"),()=>bind(db),/lifecycle_incompatible/));
 }finally{await db.close();}
});

test('governed policy binding rejects incomplete pools, forms and skill coverage',async t=>{
 const db=await database();try{
  const cases=[
   ['retired pool',"update assessment_pools set status='retired' where id=$1",[id(700)]],
   ['draft item',"update items set status='draft' where id=$1",[id(701)]],
   ['changed item version','update items set version_no=2 where id=$1',[id(701)]],
   ['disabled membership','update assessment_pool_items set enabled=false where item_id=$1',[id(701)]],
   ['missing form question','delete from assessment_form_items where item_id=$1',[id(701)]],
   ['wrong per-skill form coverage','update items set skill_id=$1 where id=$2',[id(522),id(701)]],
   ['other unit in frozen bank','update items set skill_id=$1 where id=$2',[id(523),id(701)]],
   ['other unit curriculum scope','update item_curriculum_scopes set unit_id=$1 where item_id=$2',[id(512),id(701)]],
   ['other programme curriculum scope','update item_curriculum_scopes set subject_program_id=$1 where item_id=$2',[id(202),id(701)]],
   ['no active forms',"update assessment_forms set status='draft' where id=$1",[formId(0)]],
   ['draft release',"update curriculum_releases set status='draft' where id=$1",[id(501)]],
  ];
  for(const [name,sql,args]of cases)await t.test(name,()=>temporary(db,()=>db.query(sql,args),()=>bind(db),/assessment_policy/));
  await t.test('every active form must be complete',()=>temporary(db,()=>db.query("insert into assessment_forms values($1,$2,'active')",[id(761),id(700)]),()=>bind(db),/form_coverage/));
 }finally{await db.close();}
});

test('session insertion derives the exact selected enrollment and keeps policy on resume',async t=>{
 const db=await database();try{
  const a=await start(db,0);assert.equal(a.resumed,false);assert.equal(a.session.school_id,id(301));assert.equal(a.session.institutional_class_enrollment_id,id(371));
  const b=await start(db,2);assert.equal(b.session.school_id,id(302));assert.equal(b.session.institutional_class_enrollment_id,id(373));
  const c=await start(db,1);assert.equal(c.session.unit_code,'SYN-A-CH2');assert.notEqual(c.session.id,a.session.id);
  assert.equal((await start(db,0)).session.id,a.session.id);
  await t.test('resume tolerates later policy retirement without rebinding',async()=>{
   await db.query("update assessment_blueprints set status='retired' where id=$1",[blueprintId(0)]);
   const resumed=await start(db,0,'diagnostic',{binding:a.session.assessment_policy_binding_id});assert.equal(resumed.resumed,true);assert.equal(resumed.session.assessment_policy_binding_id,a.session.assessment_policy_binding_id);
   await db.query("update assessment_blueprints set status='pilot' where id=$1",[blueprintId(0)]);
  });
  await t.test('student, binding, auth origin, count and policy fingerprint stay immutable',async()=>{
   for(const [column,value]of [['student_id',id(11)],['assessment_policy_binding_id',b.session.assessment_policy_binding_id],['source_auth_session_id',id(402)],['planned_item_count',4]])await assert.rejects(()=>db.query(`update learning_sessions set ${column}=$1 where id=$2`,[value,a.session.id]),/immutable/);
   await assert.rejects(()=>db.query("update learning_sessions set metadata=metadata||'{\"assessmentPolicyFingerprint\":\"changed\"}' where id=$1",[a.session.id]),/immutable/);
  });
  await t.test('header and every assignment commit together',async()=>{assert.equal((await db.query('select count(*)::int n from learning_session_items where session_id=$1',[a.session.id])).rows[0].n,3);});
 }finally{await db.close();}
});

test('session start and resume enforce live exact school/year/subject authorization',async t=>{
 const db=await database();try{
  const binding=await bind(db);
  for(const [name,overrides]of [['other student enrollment',{enrollment:id(372)}],['other subject enrollment',{enrollment:id(373)}],['other student Auth session',{auth:id(402)}],['missing Auth session',{auth:id(9999)}]])await t.test(name,()=>assert.rejects(()=>start(db,0,'diagnostic',{binding,...overrides}),/learning_context_unavailable/));
  const cases=[
   ['ended enrollment',"update institutional_class_enrollments set status='ended' where id=$1",[id(371)]],
   ['future enrollment',"update institutional_class_enrollments set valid_from='2099-01-01' where id=$1",[id(371)]],
   ['ended membership',"update institutional_memberships set status='ended' where id=$1",[id(331)]],
   ['ended teacher',"update teacher_assignments set status='ended' where id=$1",[id(351)]],
   ['revoked subject',"update teacher_subject_authorizations set status='ended' where id=$1",[id(361)]],
   ['closed year',"update academic_years set status='closed' where id=$1",[id(311)]],
   ['wrong grade','update classes set grade_id=$1 where id=$2',[id(8),id(321)]],
   ['inactive class','update classes set is_active=false where id=$1',[id(321)]],
   ['student suspended',"update profiles set account_status='suspended' where id=$1",[id(10)]],
   ['teacher suspended',"update profiles set account_status='suspended' where id=$1",[id(20)]],
   ['deleted Auth user','update auth.users set deleted_at=now() where id=$1',[id(10)]],
   ['expired Auth session',"update auth.sessions set not_after='2020-01-01' where id=$1",[id(401)]],
  ];
  for(const [name,sql,args]of cases)await t.test(name,()=>temporary(db,()=>db.query(sql,args),()=>start(db,0,'diagnostic',{binding}),/learning_context_unavailable/));
  await start(db,0,'diagnostic',{binding});
  await t.test('revocation also denies resume',()=>temporary(db,()=>db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]),()=>start(db,0,'diagnostic',{binding}),/learning_context_unavailable/));
 }finally{await db.close();}
});

test('exact chapter baseline unlocks practice; failed starts leave no partial evidence',async t=>{
 const db=await database();try{
  await assert.rejects(()=>start(db,0,'practice'),/chapter_diagnostic_required/);
  const diagnostic=await start(db,0);await db.query("update learning_sessions set status='completed',completed_at=now(),answered_count=3,correct_count=0 where id=$1",[diagnostic.session.id]);
  const done=await start(db,0);assert.equal(done.diagnosticCompleted,true);assert.equal(done.baselineSessionId,diagnostic.session.id);
  const practice=await start(db,0,'practice');assert.equal(practice.session.mode,'practice');
  await assert.rejects(()=>start(db,1,'practice'),/chapter_diagnostic_required/);
  await assert.rejects(()=>start(db,2,'practice'),/chapter_diagnostic_required/);
  const counts=async()=> (await db.query('select (select count(*)::int from learning_sessions) sessions,(select count(*)::int from learning_session_items) items')).rows[0];
  const before=await counts();
  for(const [name,overrides]of [['wrong form',{form:formId(0)}],['duplicate items',{items:[itemIds(1)[0],itemIds(1)[0],itemIds(1)[2]]}],['other unit items',{items:itemIds(0)}],['wrong total',{items:itemIds(1).slice(0,2)}]])await t.test(name,async()=>{await assert.rejects(()=>start(db,1,'diagnostic',overrides),/governed_/);assert.deepEqual(await counts(),before);});
  await t.test('mastery and review are fail-closed until their 12C lifecycle migration',async()=>{for(const mode of ['mastery_check','chapter_review'])await assert.rejects(()=>start(db,0,mode),/governed_mode_runtime_pending/);assert.deepEqual(await counts(),before);});
 }finally{await db.close();}
});

test('anonymous/authenticated clients cannot bind policies or invoke private write authorization',async()=>{
 const db=await database();try{
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   try {await assert.rejects(()=>bind(db),/permission denied/);await assert.rejects(()=>db.query('select private.scoped_chapter_baseline($1,$2,$3)',[id(10),id(501),id(511)]),/permission denied/);await assert.rejects(()=>db.query('select * from assessment_policy_bindings'),/permission denied/);}finally{await db.exec('reset role');}
  }
  await db.exec('set role service_role');
  try{const binding=await bind(db);await assert.rejects(()=>db.query('delete from assessment_policy_bindings where id=$1',[binding]),/permission denied/);await assert.rejects(()=>db.query('insert into assessment_policy_bindings(id) values($1)',[id(9999)]),/permission denied/);}finally{await db.exec('reset role');}
 }finally{await db.close();}
});

test('15B.12B preserves legacy rows, lifetime baseline and stable legacy resumes',async()=>{
 const db=await database({migrated:false});try{
  await db.query("insert into learning_sessions(student_id,unit_code,mode,status,planned_item_count,answered_count,correct_count,completed_at,curriculum_release_id,assessment_blueprint_id,metadata) values($1,'SYN-A-CH1','diagnostic','completed',3,3,0,now(),$2,$3,'{\"historyMarker\":\"original\"}')",[id(10),id(501),blueprintId(0)]);
  await db.query("insert into learning_sessions(student_id,unit_code,mode,planned_item_count,curriculum_release_id,assessment_blueprint_id,metadata) values($1,'SYN-A-CH1','practice',3,$2,$3,'{\"historyMarker\":\"unfinished\"}')",[id(10),id(501),blueprintId(0,'practice')]);
  const original=(await db.query('select to_jsonb(s) row from learning_sessions s order by id')).rows;
  const catalogue=(await db.query('select (select jsonb_agg(b order by id) from assessment_blueprints b) b,(select jsonb_agg(m order by id) from learning_model_configurations m) m')).rows;
  await db.exec(readFileSync(migrationPath,'utf8'));
  assert.deepEqual((await db.query("select to_jsonb(s)-'assessment_policy_binding_id'-'governed_unit_id'-'source_auth_session_id' row from learning_sessions s order by id")).rows,original);
  assert.deepEqual((await db.query('select (select jsonb_agg(b order by id) from assessment_blueprints b) b,(select jsonb_agg(m order by id) from learning_model_configurations m) m')).rows,catalogue);
  assert.equal((await db.query('select count(*)::int n from assessment_policy_bindings')).rows[0].n,0);
  const resume=await start(db,0,'practice');assert.equal(resume.resumed,true);assert.equal(resume.legacySession,true);assert.equal(resume.session.assessment_policy_binding_id,null);assert.equal(resume.session.metadata.historyMarker,'unfinished');
  assert.equal((await db.query('select private.scoped_chapter_baseline($1,$2,$3) id',[id(10),id(502),id(511)])).rows[0].id,null);
  const indexes=(await db.query("select indexdef from pg_indexes where indexname like 'learning_sessions_one_%diagnostic_idx' order by indexname")).rows;
  assert.equal(indexes.length,2);assert.ok(indexes.every(x=>x.indexdef.includes('(student_id, unit_code)')&&x.indexdef.includes('assessment_policy_binding_id IS NULL')));
  assert.equal((await db.query("select count(*)::int n from pg_indexes where indexname like 'learning_sessions_governed_%diagnostic_idx'")).rows[0].n,2);
 }finally{await db.close();}
});

async function reuseChapterCode(db){
 await db.query('update curriculum_release_units set unit_code_snapshot=$1 where unit_id=$2',[scopes[0].code,id(scopes[2].unit)]);
 await db.query('update assessment_pools set unit_code=$1 where id in ($2,$3,$4,$5)',[scopes[0].code,...['diagnostic','practice','mastery_check','chapter_review'].map(m=>id(slot(2,m)))]);
 await db.query('update learning_model_runtime_bindings set unit_code=$1 where curriculum_release_id=$2',[scopes[0].code,id(scopes[2].release)]);
}

test('two governed subjects may reuse a chapter code without sharing baselines',async()=>{
 const db=await database();try{
  await reuseChapterCode(db);
  const a=await start(db,0);await db.query("update learning_sessions set status='completed',completed_at=now() where id=$1",[a.session.id]);
  await assert.rejects(()=>start(db,2,'practice'),/chapter_diagnostic_required/);
  const b=await start(db,2);assert.equal(b.session.unit_code,a.session.unit_code);assert.notEqual(b.session.governed_unit_id,a.session.governed_unit_id);
  await db.query("update learning_sessions set status='completed',completed_at=now() where id=$1",[b.session.id]);
  assert.equal((await start(db,0)).baselineSessionId,a.session.id);assert.equal((await start(db,2)).baselineSessionId,b.session.id);
  assert.equal((await start(db,2,'practice')).session.subject_program_id,id(202));
 }finally{await db.close();}
});

test('a legacy baseline blocks another attempt only in its programme',async()=>{
 const db=await database({migrated:false});try{
  await db.query("insert into learning_sessions(student_id,unit_code,mode,status,planned_item_count,completed_at,curriculum_release_id,assessment_blueprint_id) values($1,$2,'diagnostic','completed',3,now(),$3,$4)",[id(10),scopes[0].code,id(501),blueprintId(0)]);
  await db.exec(readFileSync(migrationPath,'utf8'));await reuseChapterCode(db);
  await assert.rejects(()=>start(db,0),/diagnostic_baseline_requires_governed_mapping/);
  await assert.rejects(()=>start(db,0,'practice'),/chapter_diagnostic_required/);
  const b=await start(db,2);assert.equal(b.session.subject_program_id,id(202));
  assert.equal((await db.query('select private.scoped_chapter_baseline($1,$2,$3) id',[id(10),id(501),id(511)])).rows[0].id,null);
 }finally{await db.close();}
});

test('catalogue reassignment cannot move a governed diagnostic prerequisite',async()=>{
 const db=await database();try{
  const a=await start(db,0);await db.query("update learning_sessions set status='completed',completed_at=now() where id=$1",[a.session.id]);
  await db.query('update assessment_blueprints set unit_id=$1 where id=$2',[id(512),blueprintId(0)]);
  assert.equal((await db.query('select private.scoped_chapter_baseline($1,$2,$3) id',[id(10),id(501),id(511)])).rows[0].id,a.session.id);
  assert.equal((await db.query('select private.scoped_chapter_baseline($1,$2,$3) id',[id(10),id(501),id(512)])).rows[0].id,null);
  await assert.rejects(()=>start(db,1,'practice'),/chapter_diagnostic_required/);
  assert.equal((await start(db,0,'practice')).session.governed_unit_id,id(511));
 }finally{await db.close();}
});

test('governed lifetime baseline identity spans releases without permitting a new attempt',async()=>{
 const db=await database();try{
  const a=await start(db,0);await db.query("update learning_sessions set status='completed',completed_at=now() where id=$1",[a.session.id]);
  const p=policy(scopes[0]);p.curriculumReleaseId=id(503);p.learningModelConfigurationId=id(613);
  await db.query("insert into curriculum_releases values($1,$2,'pilot','2020-01-01',null)",[id(503),id(201)]);
  await db.query('insert into curriculum_release_units values($1,$2,$3)',[id(503),id(511),scopes[0].code]);
  for(const skill of scopes[0].skills)await db.query('insert into curriculum_release_skills values($1,$2)',[id(503),id(skill)]);
  await db.query("insert into learning_model_configurations values($1,'baseline',$2,$3)",[id(613),id(503),JSON.stringify({assessmentPolicyContracts:[p]})]);
  await db.query("insert into learning_model_runtime_bindings values($1,$2,$3,$4,'active',$5)",[id(634),id(503),scopes[0].code,id(613),id(621)]);
  await db.query("insert into assessment_blueprints values($1,$2,$3,$4,'diagnostic','pilot',$5)",[id(1040),id(503),id(511),id(slot(0,'diagnostic')),JSON.stringify({assessmentPolicy:p})]);
  await db.query('insert into assessment_blueprint_items select $1,item_id,item_version_snapshot from assessment_blueprint_items where assessment_blueprint_id=$2',[id(1040),blueprintId(0)]);
  const binding=(await db.query('select service_bind_assessment_policy($1) id',[id(1040)])).rows[0].id;
  await assert.rejects(()=>start(db,0,'diagnostic',{binding}),/diagnostic_baseline_requires_governed_mapping/);
  assert.equal((await db.query('select count(*)::int n from learning_sessions')).rows[0].n,1);
 }finally{await db.close();}
});

test('explicit enrollment selection supports two authorized classes for the same programme',async()=>{
 const db=await database();try{
  await db.query('insert into classes values($1,$2,$3,$4,$5,true)',[id(323),id(301),id(311),id(101),id(7)]);
  await db.query("insert into teacher_assignments values($1,$2,$3,$4,$5,$6,'active','2020-01-01',null)",[id(353),id(301),id(311),id(323),id(341),id(201)]);
  await db.query("insert into institutional_class_enrollments values($1,$2,$3,$4,$5,$6,$7,$8,'active','2020-01-01',null)",[id(374),id(10),id(301),id(311),id(323),id(331),id(353),id(201)]);
  const diagnostic=await start(db,0);await db.query("update learning_sessions set status='completed',completed_at=now() where id=$1",[diagnostic.session.id]);
  const first=await start(db,0,'practice');const second=await start(db,0,'practice',{enrollment:id(374)});
  assert.equal(first.session.class_id,id(321));assert.equal(second.session.class_id,id(323));assert.equal(second.session.teacher_assignment_id,id(353));assert.notEqual(first.session.id,second.session.id);
  assert.equal((await start(db,0,'practice',{enrollment:id(374)})).session.id,second.session.id);
  assert.equal((await start(db,0,'practice')).session.id,first.session.id);
 }finally{await db.close();}
});
