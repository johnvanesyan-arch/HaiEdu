import test from 'node:test';
import assert from 'node:assert/strict';
import {readAssessmentPolicy} from '../supabase/functions/_shared/assessment-policy.mjs';
import {database,configure,chapterShape,makeReady,finishBySkill,id,scopes,launch,finish,operation,dashboard,blueprintId} from './fixtures/assessment-v2-db.mjs';
const cases=[
 {name:'8/10 passes with all six supporting/additional wrong',correct:[2,0,2,2,0,2,0,0],passed:true,core:8},
 {name:'7/10 fails with all six supporting/additional correct',correct:[1,1,2,2,1,2,3,1],passed:false,core:7},
 {name:'8/10 fails if one required skill has zero correct',correct:[0,1,3,3,1,2,3,1],passed:false,core:8},
];
for(const scenario of cases)test(scenario.name,async()=>{
 const db=await database();try {
  const {skills,policy}=await chapterShape(db);
  assert.deepEqual(readAssessmentPolicy({assessmentPolicy:policy},policy),policy);
  const diagnostic=await launch(db);await finish(db,diagnostic.session.id);
  await makeReady(db,policy.readinessSkillIds);
  const before=await dashboard(db);
  assert.deepEqual(before.skills.filter(s=>s.requiredForReadiness).map(s=>s.id).sort(),[...policy.readinessSkillIds].sort());
  assert.ok(before.skills.some(s=>!s.requiredForReadiness && !s.ready));
  const start=await launch(db,0,'mastery_check');
  const result=await finishBySkill(db,start.session.id,Object.fromEntries(skills.map((s,n)=>[s,scenario.correct[n]])));
  assert.equal(result.finalResult.passed,scenario.passed);assert.equal(result.finalResult.score.correct,scenario.core);assert.equal(result.finalResult.score.answered,10);
  assert.equal(result.session.answered_count,16);assert.deepEqual(result.finalResult.groups.map(g=>g.answered),[10,2,4]);
  assert.ok(result.session.metadata.failedSkillIds.every(s=>policy.scoredSkillIds.includes(s)));
  const completed=await operation(db,start.session.id,'serve');assert.equal(completed.assessmentResult.passed,scenario.passed);
  const history=(await dashboard(db)).history.find(s=>s.id===start.session.id);assert.deepEqual(history.assessmentResult,completed.assessmentResult);
  if(!scenario.passed){await assert.rejects(launch(db,0,'mastery_check'),/mastery_check_not_allowed/);const review=await launch(db,0,'chapter_review');await finish(db,review.session.id,false);const retry=await launch(db,0,'mastery_check');assert.equal(retry.session.mastery_attempt_number,2);assert.notEqual(retry.session.metadata.assessmentFormId,start.session.metadata.assessmentFormId);}
 }finally{await db.close();}
});
test('required readiness blocks, unscored readiness does not; v1 keeps whole-scope gate and score',async()=>{
 const db=await database();try {
  let baseline=await launch(db);await finish(db,baseline.session.id);
  await assert.rejects(launch(db,0,'mastery_check'),/skills_not_ready/);
  await makeReady(db,[id(521)]);await assert.rejects(launch(db,0,'mastery_check'),/skills_not_ready/);
  await makeReady(db,[id(522)]);const old=await launch(db,0,'mastery_check');const result=await finishBySkill(db,old.session.id,{[id(521)]:1});assert.equal(result.finalResult.score.answered,3);assert.equal(result.finalResult.passed,false);assert.equal(result.finalResult.schemaVersion,undefined);
  const p=await configure(db,2);baseline=await launch(db,2);await finish(db,baseline.session.id);
  await assert.rejects(launch(db,2,'mastery_check'),/skills_not_ready/);
  await makeReady(db,p.readinessSkillIds,2);const other=await launch(db,2,'mastery_check');const otherResult=await finishBySkill(db,other.session.id,{[id(525)]:1});assert.equal(otherResult.finalResult.passed,true);assert.equal(otherResult.finalResult.score.answered,1);assert.equal(otherResult.finalResult.overallScore.answered,3);
 }finally{await db.close();}
});
test('v2 rejects ambiguous scope in JS and SQL; v1 remains a closed schema',async()=>{
 const db=await database();try{
 const p=await configure(db);const scope=p.deliveredSkillIds;
 for(const mutate of [p=>p.deliveredSkillIds.push(scope[0]),p=>p.scoredSkillIds.push(id(99999)),p=>p.readinessSkillIds=[],p=>p.reportingGroups[1].skillIds=[scope[0]],p=>p.reportingGroups[0].label='',p=>p.reportingGroups[0].extra=true,p=>p.minimumCorrectBySkill[scope[1]]=1]){
  const invalid=structuredClone(p);mutate(invalid);
  assert.throws(()=>readAssessmentPolicy({assessmentPolicy:invalid},invalid),/assessment_policy_invalid/);
  await assert.rejects(db.query('select private.validate_assessment_scope_v2($1,$2)',[JSON.stringify(invalid),JSON.stringify(scope)]),/assessment_policy_(invalid|skill_scope_invalid)/);
 }
 const old={...p,schemaVersion:'haiedu-assessment-policy-v1'};assert.throws(()=>readAssessmentPolicy({assessmentPolicy:old},old));
 await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1",[blueprintId(0,'mastery_check'),JSON.stringify(old)]);
 await assert.rejects(db.query('select private.validate_assessment_policy_v1($1)',[blueprintId(0,'mastery_check')]),/assessment_policy_invalid/);
 }finally{await db.close();}
});

test('staff readers use the saved group scores and suppress active assessment results',async()=>{
 const {acceptanceFixture,analyticsReaders,selection}=await import('./fixtures/learning-acceptance.mjs');
 const {installV2}=await import('./fixtures/assessment-v2-db.mjs');
 const f=await acceptanceFixture();try{
  await installV2(f.db);const {skills,policy}=await chapterShape(f.db);
  await f.db.exec("insert into item_versions select id,version_no,jsonb_build_object('item',jsonb_build_object('skill_id',skill_id,'difficulty',difficulty)) from items on conflict do nothing");
  const d=await launch(f.db);await finish(f.db,d.session.id);await makeReady(f.db,policy.readinessSkillIds);
  const s=await launch(f.db,0,'mastery_check');
  const nav=await f.call('get-student-classes');const c=nav.body.contexts.find(c=>c.unitId===selection(0).unitId);
  const {loadExactInstitutionalClassAnalytics,aggregateSchoolPerformanceAnalytics}=analyticsReaders();
  const read=()=>loadExactInstitutionalClassAnalytics(f.admin,{...c,assignmentId:c.teacherAssignmentId},[{id:id(10),enrollmentId:c.enrollmentId}]);
  let teacher=await read();assert.equal(teacher.students[0].sessions.find(x=>x.id===s.session.id).reporting,null);
  await finishBySkill(f.db,s.session.id,Object.fromEntries(skills.map((s,n)=>[s,[2,0,2,2,0,2,0,0][n]])));
  teacher=await read();const result=teacher.students[0].latestMasteryCheck;assert.equal(result.percent,80);assert.equal(result.assessmentResult.score.answered,10);assert.deepEqual(Array.from(result.assessmentResult.groups,g=>g.answered),[10,2,4]);
  const aggregate=aggregateSchoolPerformanceAnalytics({enrollments:(await f.db.query('select * from institutional_class_enrollments')).rows,sessions:(await f.db.query('select * from learning_sessions')).rows,reviewSessions:[]});
  const group=aggregate.evidenceGroups.find(g=>g.mode==='mastery_check');assert.equal(group.masteryPassed,1);assert.equal(group.answered,16);assert.equal(group.passScore.answered,10);assert.deepEqual(Array.from(group.reportingGroups,g=>g.answered),[10,2,4]);
 }finally{await f.close();}
});
