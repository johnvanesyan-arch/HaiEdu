import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceFixture,acceptanceScopes,selection,id,finishThroughAPI,answerBody,analyticsReaders} from './fixtures/learning-acceptance.mjs';

const start=(f,idx,mode)=>f.call('start-learning-session',{...selection(idx),mode});
const dashboard=(f,idx)=>f.call('get-student-dashboard',selection(idx));
async function writes(db){return (await db.query(`select jsonb_build_object('sessions',(select count(*) from learning_sessions),'bindings',(select count(*) from assessment_policy_bindings),'attempts',(select count(*) from attempts),'exposures',(select count(*) from student_item_exposure_events),'help',(select count(*) from remediation_events),'recommendations',(select count(*) from recommendation_events),'states',(select count(*) from chapter_mastery_states)) snapshot`)).rows[0].snapshot;}
async function ready(f,idx){const s=acceptanceScopes[idx];for(const skill of s.skills)await f.db.query("insert into student_skill_mastery_by_release values($1,$2,$3,9,1,.9,10,'secure',now(),now()) on conflict(curriculum_release_id,student_id,skill_id) do update set alpha_evidence=9,beta_evidence=1,mastery_score=.9,evidence_count=10",[id(s.release),id(10),id(skill)]);}

test('15B.12E connected Edge-to-SQL acceptance: two chapters in each of two subjects',async t=>{
 const f=await acceptanceFixture();t.after(()=>f.close());
 const nav=await f.call('get-student-classes');assert.equal(nav.status,200);assert.equal(nav.body.contexts.length,4);
 assert.equal(new Set(nav.body.contexts.map(c=>c.subjectProgramId)).size,2);assert.equal(new Set(nav.body.contexts.map(c=>c.schoolId)).size,2);assert.equal(new Set(nav.body.contexts.map(c=>c.gradeNumber)).size,2);
 const pristine=await writes(f.db);
 await t.test('read-only navigation/status and blocked launches leave no learner writes',async()=>{
  for(let idx=0;idx<4;idx++){
   const d=await dashboard(f,idx);assert.equal(d.status,200);assert.equal(d.body.modes.diagnostic.questions,idx===3?5:3);assert.equal(d.body.practiceAccess.unlocked,false);
   assert.equal((await f.call('get-mastery-check-status',{...selection(idx),mode:'diagnostic'})).status,200);
   for(const mode of ['practice','mastery_check','chapter_review']){const denied=await start(f,idx,mode);assert.equal(denied.status,409);assert.equal(denied.body.error,'chapter_diagnostic_required');}
  }
  assert.deepEqual(await writes(f.db),pristine);
 });
 const baselines=[];
 for(let idx=0;idx<4;idx++)await t.test(`subject ${idx<2?'A':'B'}, chapter ${idx%2+1}: original form, stable resume, protected feedback and exact unlock`,async()=>{
  const count=idx===3?5:3,started=await start(f,idx,'diagnostic');assert.equal(started.status,200);const session=started.body.session;baselines.push(session);
  assert.equal(session.planned_item_count,count);assert.equal(session.governed_unit_id,selection(idx).unitId);
  assert.equal((await start(f,idx,'diagnostic')).body.session.id,session.id);
  const item=await f.call('get-session-item',{sessionId:session.id});assert.equal(item.status,200);assert.deepEqual((await f.call('get-session-item',{sessionId:session.id})).body,item.body);
  assert.equal(item.body.remediation.available,false);assert.equal(item.body.session.correct,null);
  const answer=await f.call('submit-answer',await answerBody(f.db,item.body,false));assert.equal(answer.status,200);assert.equal(answer.body.revealCorrect,false);
  const hidden=(await dashboard(f,idx)).body;assert.equal(hidden.baseline,null);assert.ok(hidden.skills.every(s=>s.mastery===null&&s.ready===null));
  await finishThroughAPI(f,session,false);
  const d=(await dashboard(f,idx)).body;assert.equal(d.baseline.id,session.id);assert.equal(d.baseline.answered,count);assert.equal(d.baseline.correct,0);assert.equal(d.practiceAccess.unlocked,true);
  assert.equal(d.history[0].policyBindingId,session.assessment_policy_binding_id);
  for(let j=idx+1;j<4;j++)assert.equal((await dashboard(f,j)).body.practiceAccess.unlocked,false);
  assert.equal((await start(f,idx,'diagnostic')).body.diagnosticCompleted,true);
  const rows=(await f.db.query('select li.item_id from learning_session_items li where li.session_id=$1',[session.id])).rows;
  const formItems=(await f.db.query('select item_id from assessment_form_items where form_id=$1',[session.metadata.assessmentFormId])).rows;
  assert.equal(rows.length,count);assert.ok(rows.every(r=>formItems.some(i=>i.item_id===r.item_id)));
 });
 await t.test('reciprocal tenant, mixed-selector, draft and retired denial leaves all evidence intact',async()=>{
  const before=await writes(f.db),other=f.credential(id(11),id(402));
  for(const idx of [0,1])assert.equal((await f.call('get-student-dashboard',selection(idx),other)).status,403);
  for(const session of baselines)assert.equal((await f.call('get-session-item',{sessionId:session.id},other)).status,403);
  assert.equal((await f.call('get-student-dashboard',{...selection(0),enrollmentId:id(372)})).status,403);
  for(const idx of [0,1,2,3]){
   assert.equal((await f.call('get-student-dashboard',{...selection(idx),unitId:selection((idx+2)%4).unitId})).status,403);
   assert.equal((await f.call('start-learning-session',{...selection(idx),mode:'practice',studentId:id(11)})).status,400);
  }
  for(const status of ['draft','retired']){
   await f.db.query('update curriculum_releases set status=$2 where id=$1',[id(502),status]);
   assert.equal((await start(f,3,'practice')).status,403);assert.equal((await dashboard(f,3)).status,403);
  }
  await f.db.query("update curriculum_releases set status='pilot' where id=$1",[id(502)]);
  assert.deepEqual(await writes(f.db),before);
 });
 await t.test('invalid credentials and malformed UUIDs fail before any evidence write',async()=>{
  const before=await writes(f.db);
  assert.equal((await f.call('get-student-classes',{},null)).status,401);
  assert.equal((await f.call('get-student-classes',{},'unregistered')).status,401);
  assert.equal((await f.call('get-student-dashboard',{...selection(0),unitId:'71000000-0000-4000-000000000511'})).status,400);
  assert.deepEqual(await writes(f.db),before);
 });
 await t.test('practice serves only its own pool; help, wrong answers and duplicate denial remain atomic',async()=>{
  await f.db.query("insert into item_template_remediation_guides values($1,$2,'published',null,1,'Title','Strategy','Hint','Hint2','Example','[]')",[id(951),id(902)]);
  for(let idx=0;idx<4;idx++){
   const p=await start(f,idx,'practice');assert.equal(p.status,200);
   const item=await f.call('get-session-item',{sessionId:p.body.session.id});assert.equal(item.status,200);
   const member=(await f.db.query('select exists(select 1 from assessment_blueprint_items where assessment_blueprint_id=$1 and item_id=$2) allowed',[p.body.session.assessment_blueprint_id,item.body.item.id])).rows[0];assert.equal(member.allowed,true);
   assert.equal((await f.call('get-remediation-help',{sessionId:p.body.session.id,sessionItemId:item.body.sessionItemId})).status,200);
   const body=await answerBody(f.db,item.body,false),a=await f.call('submit-answer',body);assert.equal(a.status,200);assert.equal(a.body.grading.correct,false);assert.equal(a.body.grading.usedHelp,true);
   const before=await writes(f.db);assert.equal((await f.call('submit-answer',body)).status,409);assert.deepEqual(await writes(f.db),before);
   await finishThroughAPI(f,p.body.session,false);
  }
 });
 await t.test('three failures, required reviews, final unlimited access and passed optional review stay chapter-scoped',async()=>{
  await ready(f,0);await ready(f,3);
  for(let number=1;number<=3;number++){
   const m=await start(f,0,'mastery_check');assert.equal(m.status,200);assert.equal(m.body.session.mastery_attempt_number,number);
   const result=await finishThroughAPI(f,m.body.session,false);assert.equal(result.body.finalResult.passed,false);
   assert.equal((await start(f,0,'mastery_check')).status,409);
   const review=await start(f,0,'chapter_review');assert.equal(review.status,200);const r=await finishThroughAPI(f,review.body.session,false);
   assert.equal(r.body.chapterReview.qualifying,number<3);
   assert.equal((await dashboard(f,1)).body.lifecycle,null);assert.equal((await dashboard(f,2)).body.lifecycle,null);
  }
  const optional=await start(f,0,'chapter_review');assert.equal(optional.status,200);await finishThroughAPI(f,optional.body.session);
  const m=await start(f,3,'mastery_check');assert.equal(m.status,200);assert.equal(m.body.session.planned_item_count,5);
  const passed=await finishThroughAPI(f,m.body.session);assert.equal(passed.body.finalResult.passed,true);assert.equal(passed.body.finalResult.passCriteria.overallPercent,60);
  assert.equal((await start(f,3,'mastery_check')).status,409);
  for(let i=0;i<2;i++){const r=await start(f,3,'chapter_review');assert.equal(r.status,200);assert.equal((await finishThroughAPI(f,r.body.session)).body.chapterReview.qualifying,false);}
 });
 await t.test('a bound session resumes after prospective retirement with stable items and original policy',async()=>{
  const p=await start(f,1,'practice');assert.equal(p.status,200);
  const item=await f.call('get-session-item',{sessionId:p.body.session.id});assert.equal(item.status,200);
  await f.db.query("update assessment_blueprints set status='retired' where id=$1",[p.body.session.assessment_blueprint_id]);
  const resumed=await start(f,1,'practice');assert.equal(resumed.status,200);assert.equal(resumed.body.session.id,p.body.session.id);
  assert.deepEqual((await f.call('get-session-item',{sessionId:p.body.session.id})).body,item.body);
  assert.equal((await f.call('get-mastery-check-status',{sessionId:p.body.session.id})).body.assessmentPolicy.plannedQuestionCount,3);
  await finishThroughAPI(f,p.body.session,false);
 });
 await t.test('teacher readback and school/master aggregates retain exact context and separate contracts',async()=>{
  const {loadExactInstitutionalClassAnalytics,aggregateSchoolPerformanceAnalytics}=analyticsReaders();
  const sessions=(await f.db.query('select * from learning_sessions')).rows,reviews=(await f.db.query('select * from chapter_review_sessions')).rows;
  for(let idx=0;idx<4;idx++){
   const c=nav.body.contexts.find(c=>c.unitId===selection(idx).unitId);
   const context={...c,assignmentId:c.teacherAssignmentId};
   const read=await loadExactInstitutionalClassAnalytics(f.admin,context,[{id:id(10),enrollmentId:c.enrollmentId}]);
   assert.equal(read.students.length,1);assert.equal(read.skills.length,2);
   assert.ok(read.students[0].sessions.length>0);
   assert.ok(read.students[0].sessions.every(s=>s.contract.releaseId===c.curriculumReleaseId&&s.contract.unitId===c.unitId));
  }
  for(const school of [id(301),id(302)]){
   const enrollments=(await f.db.query('select * from institutional_class_enrollments where school_id=$1',[school])).rows;
   const aggregate=aggregateSchoolPerformanceAnalytics({enrollments,sessions,reviewSessions:reviews});
   assert.ok(aggregate.evidenceGroups.length>0);assert.ok(aggregate.evidenceGroups.every(g=>g.contract.releaseId===(school===id(301)?id(501):id(502))));
   assert.equal(aggregate.diagnostic.averageAccuracy,null);
  }
  const all=aggregateSchoolPerformanceAnalytics({enrollments:(await f.db.query('select * from institutional_class_enrollments')).rows,sessions,reviewSessions:reviews});
  assert.equal(new Set(all.evidenceGroups.map(g=>g.contract.releaseId)).size,2);
 });
 await t.test('revoked live SQL session denies every endpoint without further evidence',async()=>{
  const before=await writes(f.db);await f.db.query('delete from auth.sessions where id=$1',[id(401)]);
  for(const [name,body] of [['get-student-classes',{}],['get-student-dashboard',selection(0)],['start-learning-session',{...selection(0),mode:'practice'}],['get-session-item',{sessionId:baselines[0].id}],['get-mastery-check-status',{sessionId:baselines[0].id}],['get-chapter-mastery-lifecycle',{sessionId:baselines[0].id}],['submit-answer',{sessionId:baselines[0].id}],['get-remediation-help',{sessionId:baselines[0].id}]])assert.equal((await f.call(name,body)).status,403,name);
  assert.deepEqual(await writes(f.db),before);assert.deepEqual(f.logs,[]);
 });
});
