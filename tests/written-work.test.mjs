import test from 'node:test';
import assert from 'node:assert/strict';
import {database,call,id,context,definition} from './fixtures/written-work-db.mjs';
import {writtenWordCount} from '../web/written-work.mjs';
const payload=(text='A short synthetic response.',revision=0)=>({taskId:id(1000),text,expectedRevision:revision});
const scores={task:3,organisation:2,vocabulary:2,grammar:2};
test('writing saves privately, submits once, returns, revises, grades and preserves every version',async()=>{
 const db=await database();try{
  const before=await db.query('select (select count(*) from learning_sessions) sessions,(select count(*) from attempts) attempts');
  const opened=await call(db,'open',{taskId:id(1000)});assert.equal(opened.work,null);
  assert.equal((await db.query('select count(*) n from written_work')).rows[0].n,0);
  const draft=await call(db,'save',payload('Private draft.'));assert.equal(draft.work.state,'draft');assert.deepEqual((await call(db,'queue')).queue,[]);
  await assert.rejects(call(db,'inspect',{workId:draft.work.id}),/written_work_unavailable/);
  let work=await call(db,'submit',payload('First submitted response.',1));assert.equal(work.work.state,'submitted');assert.equal(work.submissions[0].wordCount,3);
  await assert.rejects(call(db,'submit',payload('First submitted response.',1)),/written_conflict/);
  await assert.rejects(call(db,'save',payload('Overwrite submitted work.',2)),/written_conflict/);
  const inspect=await call(db,'inspect',{workId:work.work.id});assert.equal(Object.hasOwn(inspect,'draftText'),false);
  work=await call(db,'review',{workId:work.work.id,expectedRevision:2,decision:'return',feedback:'Add a reason.'});assert.equal(work.work.state,'changes_requested');assert.equal(work.submissions[0].reviews[0].scores,null);
  work=await call(db,'save',payload('Private revised draft.',3));assert.equal(JSON.stringify(await call(db,'inspect',{workId:work.work.id})).includes('Private revised draft.'),false);
  work=await call(db,'submit',payload('Revised response with a reason.',4));assert.equal(work.submissions.length,2);assert.equal(work.submissions[0].text,'First submitted response.');
  work=await call(db,'review',{workId:work.work.id,expectedRevision:5,decision:'assessed',scores,feedback:'Clearer reasons.'});assert.equal(work.work.state,'reviewed');
  await assert.rejects(call(db,'review',{workId:work.work.id,expectedRevision:6,decision:'assessed',scores,feedback:'Changed.'}),/written_review_invalid/);
  work=await call(db,'review',{workId:work.work.id,expectedRevision:6,decision:'assessed',scores:{...scores,grammar:3},feedback:'Corrected judgment.',changeReason:'Rechecked the grammar evidence.'});
  assert.equal(work.submissions[1].reviews.length,2);assert.equal(work.submissions[1].reviews[1].supersedesReviewId,work.submissions[1].reviews[0].id);
  const student=await call(db,'open',{taskId:id(1000)});assert.deepEqual(student.submissions[1].reviews[1].scores,{...scores,grammar:3});
  assert.deepEqual((await db.query('select (select count(*) from learning_sessions) sessions,(select count(*) from attempts) attempts')).rows,before.rows);
 }finally{await db.close();}
});
test('writing denies forged students, teachers, subjects, units, revoked sessions and direct browser access',async()=>{
 const db=await database();try{
  const work=await call(db,'submit',payload());
  for(const options of [{actor:id(11),auth:id(402)},{context:{...context(),unitId:id(513)}},{context:{...context(),enrollmentId:id(372)}}])await assert.rejects(call(db,'open',{taskId:id(1000)},options),/context_unavailable/);
  await assert.rejects(call(db,'queue',{}, {actor:id(21),auth:id(421)}),/written_context_unavailable/);
  await assert.rejects(call(db,'inspect',{workId:work.work.id},{index:2,actor:id(21),auth:id(421)}),/written_work_unavailable/);
  await assert.rejects(call(db,'review',{workId:work.work.id,expectedRevision:1,decision:'assessed',scores,feedback:'Forged.'},{actor:id(10),auth:id(401)}),/written_context_unavailable/);
  for(const invalid of [{...scores,extra:1},{...scores,task:4},{...scores,grammar:-1},{...scores,task:1.5},{...scores,task:'3'},{task:3}])await assert.rejects(call(db,'review',{workId:work.work.id,expectedRevision:1,decision:'assessed',scores:invalid,feedback:'Invalid mark.'}),/written_review_invalid/);
  await db.exec(`update auth.sessions set not_after='2020-01-01' where id='${id(420)}'`);await assert.rejects(call(db,'queue'),/written_context_unavailable/);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);for(const table of ['written_task_versions','written_work','written_submissions','written_reviews'])await assert.rejects(db.query('select * from '+table),/permission denied/);await assert.rejects(call(db,'tasks'),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');assert.equal((await call(db,'tasks')).tasks.length,1);await db.exec('reset role');
 }finally{await db.close();}
});
test('writing handles retirement, teacher reassignment, archive read-only access and immutable evidence',async()=>{
 const db=await database();try{
  const work=await call(db,'submit',payload());
  await assert.rejects(db.query("update written_submissions set response_text='Changed'"),/written_evidence_immutable/);
  await assert.rejects(db.query("update written_task_versions set definition=jsonb_set(definition,'{prompt}','\"Changed\"') where id=$1",[id(1000)]),/written_task_immutable/);
  await db.exec(`update classes set is_active=false where id='${id(321)}'`);assert.equal((await call(db,'queue')).readOnly,true);
  await assert.rejects(call(db,'review',{workId:work.work.id,expectedRevision:1,decision:'assessed',scores,feedback:'Archived.'}),/written_read_only/);
  await db.exec(`update classes set is_active=true where id='${id(321)}';update teacher_assignments set status='ended',valid_to=now() where id='${id(351)}';insert into teacher_assignments select '${id(353)}',school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,'active',valid_from,null from teacher_assignments where id='${id(351)}';update institutional_class_enrollments set teacher_assignment_id='${id(353)}' where id='${id(371)}'`);
  const reassigned=await call(db,'inspect',{workId:work.work.id},{context:{...context(0,true),assignmentId:id(353)}});assert.equal(reassigned.work.id,work.work.id);
  await db.exec(`update written_task_versions set status='retired' where id='${id(1000)}'`);assert.equal((await call(db,'open',{taskId:id(1000)})).readOnly,true);await assert.rejects(call(db,'save',payload('Changed.',1)),/written_task_unavailable/);
 }finally{await db.close();}
});
test('word counts agree across Unicode whitespace; task contracts reject missing fields and unsupported capabilities',async()=>{
 const db=await database();try{
  for(const text of ['',"  one\n two\tthree ","don't blue-green",'one\u00a0two\u2003three','բարև աշխարհ'])assert.equal((await db.query('select private.written_word_count($1) n',[text])).rows[0].n,writtenWordCount(text));
  for(const changed of [{schemaVersion:'unknown'},{maxWords:null},{criteria:[]},{criteria:[definition.criteria[0],definition.criteria[0]]}]){
   await assert.rejects(db.query("insert into written_task_versions(task_key,version_no,subject_program_id,curriculum_release_id,unit_id,definition) values('bad',1,$1,$2,$3,$4)",[id(201),id(501),id(511),JSON.stringify({...definition,...changed})]),/written_task_invalid/);
  }
  const gated={...definition,baselineRequired:true};await db.query("insert into written_task_versions(id,task_key,version_no,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence) values($1,'gated',1,$2,$3,$4,$5,'approved',$6,now(),'{\"fixture\":true,\"qaPassed\":true,\"reviewReference\":\"synthetic\",\"sourceComparisonReference\":\"synthetic\"}')",[id(1010),id(201),id(501),id(511),JSON.stringify(gated),id(30)]);
  await assert.rejects(call(db,'save',{...payload(),taskId:id(1010)}),/chapter_diagnostic_required/);
 }finally{await db.close();}
});

test('authorized account erasure removes learner text while staff deletion anonymizes preserved judgments',async()=>{
 const db=await database();try{
  const work=await call(db,'submit',payload());await call(db,'review',{workId:work.work.id,expectedRevision:1,decision:'assessed',scores,feedback:'Preserved feedback.'});
  await db.query('delete from profiles where id=$1',[id(20)]);assert.equal((await db.query('select assessor_id from written_reviews')).rows[0].assessor_id,null);
  await db.query('delete from profiles where id=$1',[id(30)]);assert.equal((await db.query('select reviewed_by from written_task_versions limit 1')).rows[0].reviewed_by,null);
  await db.query('delete from profiles where id=$1',[id(10)]);for(const table of ['written_work','written_submissions','written_reviews'])assert.equal((await db.query('select count(*) n from '+table)).rows[0].n,0);
 }finally{await db.close();}
});
