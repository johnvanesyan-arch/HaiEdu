import test from 'node:test';import assert from 'node:assert/strict';
import {database,call,prepared,id,context} from './fixtures/writing-assignments-db.mjs';
import {call as written} from './fixtures/written-work-db.mjs';
async function setup(t){const db=await database();t.after(()=>db.close());return db;}
test('writing delivery pins the approved task and reaches only selected learners without creating work',async t=>{
 const db=await setup(t),catalog=await call(db,'catalog');assert.equal(catalog.tasks.length,1);assert.equal(catalog.tasks[0].id,id(1000));
 const p=await prepared(db,{mode:'selected',enrollmentIds:[id(371)]}),sent=await call(db,'assign',p);assert.equal(sent.assignment.recipientCount,1);assert.equal(sent.assignment.task.id,id(1000));
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments[0].workState,'not_started');assert.equal((await call(db,'inbox',{}, {actor:12})).assignments.length,0);
 assert.equal((await db.query('select count(*) n from written_work')).rows[0].n,0);
 const opened=await call(db,'open',{id:sent.assignment.id},{actor:10});assert.equal(opened.assignment.task.id,id(1000));
 await assert.rejects(call(db,'open',{id:sent.assignment.id},{actor:12}),/assignment_unavailable/);
 const work=await written(db,'save',{taskId:id(1000),expectedRevision:0,text:'My original draft'});
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments[0].workState,'draft');
 assert.equal(work.draftText,'My original draft');
});
test('class snapshot, exact request replay and overlap protection are atomic',async t=>{
 const db=await setup(t),p=await prepared(db),sent=await call(db,'assign',p);
 assert.equal(sent.assignment.recipientCount,2);assert.equal((await call(db,'assign',p)).replayed,true);
 await assert.rejects(call(db,'assign',{...p,instructions:'changed'}),/assignment_conflict/);
 await assert.rejects(call(db,'assign',await prepared(db)),/assignment_already_assigned/);
 assert.equal((await db.query('select count(*) n from writing_assignment_events')).rows[0].n,1);
});
test('stale rosters, foreign contexts, foreign tasks and nonteachers cannot send',async t=>{
 const db=await setup(t),p=await prepared(db);
 await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(9112)]);
 await assert.rejects(call(db,'assign',p),/assignment_preview_stale/);
 await assert.rejects(call(db,'preview',{taskId:id(1002)}),/assignment_unavailable/);
 await assert.rejects(call(db,'catalog',{}, {actor:10}),/assignment_forbidden/);
 await assert.rejects(call(db,'catalog',{}, {context:context(2,true)}),/written_context_unavailable/);
 assert.equal((await db.query('select count(*) n from writing_assignments')).rows[0].n,0);
});
test('cancellation is audited and retryable, preserves writing, and removes current delivery',async t=>{
 const db=await setup(t),sent=await call(db,'assign',await prepared(db));
 await written(db,'save',{taskId:id(1000),expectedRevision:0,text:'Keep this draft'});
 const payload={id:sent.assignment.id,revision:1,reason:'Lesson rescheduled'};
 assert.equal((await call(db,'cancel',payload)).assignment.status,'canceled');assert.equal((await call(db,'cancel',payload)).assignment.status,'canceled');
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments.length,0);assert.equal((await call(db,'inbox',{state:'history'},{actor:10})).assignments.length,1);
 assert.equal((await written(db,'open',{taskId:id(1000)})).draftText,'Keep this draft');
 await assert.rejects(call(db,'open',{id:sent.assignment.id},{actor:10}),/assignment_unavailable/);
 assert.equal((await db.query('select count(*) n from writing_assignment_events')).rows[0].n,2);
 const again=await call(db,'assign',await prepared(db));assert.notEqual(again.assignment.id,sent.assignment.id);
 assert.equal((await written(db,'open',{taskId:id(1000)})).draftText,'Keep this draft');
});
test('retirement, revoked subject authority and ended enrollment never gain access from delivery',async t=>{
 const db=await setup(t),sent=await call(db,'assign',await prepared(db));
 await db.query("update written_task_versions set status='retired' where id=$1",[id(1000)]);
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments[0].available,false);
 await assert.rejects(async()=>call(db,'assign',await prepared(db)),/assignment_unavailable/);
 await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]);
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments.length,0);
 await assert.rejects(call(db,'open',{id:sent.assignment.id},{actor:10}),/learning_context_unavailable/);
});
test('sending an already reviewed curriculum task links its existing result without a new submission or mark',async t=>{
 const db=await setup(t),submission=await written(db,'submit',{taskId:id(1000),expectedRevision:0,text:'A synthetic response for an isolated review.'});
 const reviewed=await written(db,'review',{workId:submission.work.id,expectedRevision:submission.work.revision,decision:'assessed',scores:{task:2,organisation:2,vocabulary:2,grammar:2},feedback:'Synthetic published feedback.'});
 const sent=await call(db,'assign',await prepared(db,{mode:'selected',enrollmentIds:[id(371)]}));
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments[0].workState,'reviewed');
 assert.equal((await written(db,'open',{taskId:id(1000)})).work.id,reviewed.work.id);
 assert.equal((await db.query('select count(*)::int n from written_submissions')).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from written_reviews')).rows[0].n,1);
 const preview=await call(db,'preview',{taskId:id(1000)});assert.deepEqual(preview.alreadyAssigned,[id(371)]);
 const receipt=await call(db,'get',{id:sent.assignment.id});assert.equal(receipt.assignment.task.id,id(1000));
});
test('teacher delivery does not bypass diagnostic prerequisites or publish a new writing definition',async t=>{
 const db=await setup(t);await db.query("insert into written_task_versions(id,task_key,version_no,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence) select $1,'gated-fixture',1,subject_program_id,curriculum_release_id,unit_id,definition||'{\"baselineRequired\":true}'::jsonb,status,reviewed_by,reviewed_at,review_evidence from written_task_versions where id=$2",[id(1010),id(1000)]);
 const p=await call(db,'preview',{taskId:id(1010)});await call(db,'assign',{taskId:id(1010),fingerprint:p.task.fingerprint,requestId:crypto.randomUUID(),rosterFingerprint:p.rosterFingerprint,mode:'selected',enrollmentIds:[id(371)]});
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments[0].task.definition.baselineRequired,true);
 await assert.rejects(written(db,'save',{taskId:id(1010),expectedRevision:0,text:'Synthetic text'}),/chapter_diagnostic_required/);
 assert.equal((await db.query('select count(*)::int n from written_work')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from written_task_versions')).rows[0].n,4);
});
