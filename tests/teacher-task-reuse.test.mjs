import test from 'node:test';import assert from 'node:assert/strict';
import {studentTaskFixture,id,context,token,textDefinition,pdf} from './fixtures/teacher-task-student-api.mjs';
async function setup(t){const f=await studentTaskFixture({review:true});t.after(()=>f.db.close());
 f.draft=async(action,payload,actor=20,scope=context(0,true))=>f.handleDraft(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(actor),'Content-Type':'application/json'},body:JSON.stringify({action,context:scope,payload})}));
 return f;
}
test('copy reuses immutable private PDF bytes, keeps assigned versions and recovers the same draft after later edits',async t=>{
 const f=await setup(t),delivery=await f.send({...textDefinition,source:{kind:'pdf',attachmentId:null}},'selected',[id(371)]);
 const original=(await f.db.query('select * from teacher_task_drafts')).rows[0],asset=original.definition.source.attachmentId;
 const payload={id:original.id,expectedRevision:original.revision,requestId:crypto.randomUUID()};let response=await f.draft('copy',payload);assert.equal(response.status,200,await response.clone().text());const copy=(await response.json()).draft;
 assert.notEqual(copy.id,original.id);assert.equal(copy.revision,1);assert.equal(copy.definition.source.attachmentId,asset);assert.equal(f.objects.size,1);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_source_files')).rows[0].n,1);
 const changed={...copy.definition,title:'An editable private copy',instructions:'# Updated instructions',instructionsFormat:'task-text-v1'};
 assert.equal((await f.draft('save',{id:copy.id,expectedRevision:1,definition:changed})).status,200);
 assert.equal((await f.draft('save',{id:original.id,expectedRevision:original.revision,definition:{...original.definition,title:'A newer original'}})).status,200);
 response=await f.draft('copy',payload);assert.equal(response.status,200);const replay=(await response.json()).draft;assert.equal(replay.id,copy.id);assert.equal(replay.definition.title,changed.title);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_drafts')).rows[0].n,2);
 const provenance=(await f.db.query('select copied_from_id,copied_from_revision from teacher_task_drafts where id=$1',[copy.id])).rows[0];assert.equal(provenance.copied_from_id,original.id);assert.equal(provenance.copied_from_revision,original.revision);
 const opened=await f.request('open',{id:delivery.id});assert.equal((await opened.json()).assignment.definition.title,textDefinition.title);
 const file=await f.fileRequest('source',{id:delivery.id});assert.equal(file.status,200);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),pdf);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_student_work')).rows[0].n,0);assert.equal((await f.db.query('select count(*)::int n from teacher_task_reviews')).rows[0].n,0);
});
test('copy fences stale revisions, foreign/context references, session revocation and nonce payload changes',async t=>{
 const f=await setup(t);let r=await f.draft('create',{requestId:crypto.randomUUID(),definition:textDefinition});const original=(await r.json()).draft;
 const payload={id:original.id,expectedRevision:1,requestId:crypto.randomUUID()};r=await f.draft('copy',payload);assert.equal(r.status,200);const copy=(await r.json()).draft;
 assert.equal((await f.draft('copy',{...payload,id:copy.id})).status,409);
 assert.equal((await f.draft('copy',{...payload,expectedRevision:2})).status,409);
 assert.equal((await f.draft('copy',{...payload,requestId:crypto.randomUUID(),expectedRevision:0})).status,400);
 assert.equal((await f.draft('copy',{...payload,requestId:crypto.randomUUID()},21,context(2,true))).status,404);
 assert.equal((await f.draft('copy',{...payload,requestId:crypto.randomUUID()},20,context(1,true))).status,404);
 await f.draft('save',{id:original.id,expectedRevision:1,definition:{...textDefinition,title:'Newer original'}});
 assert.equal((await f.draft('copy',{...payload,requestId:crypto.randomUUID()})).status,409);
 await f.db.query('delete from auth.sessions where id=$1',[id(420)]);assert.equal((await f.draft('copy',payload)).status,403);
});
test('PDF references remain owner/context scoped and pending bytes cannot be reused',async t=>{
 const f=await setup(t);await f.send({...textDefinition,source:{kind:'pdf',attachmentId:null}});const original=(await f.db.query('select * from teacher_task_drafts')).rows[0];
 const foreignDefinition={...original.definition,title:'Foreign PDF reference'};
 assert.equal((await f.draft('create',{requestId:crypto.randomUUID(),definition:foreignDefinition},21,context(2,true))).status,400);
 assert.equal((await f.draft('create',{requestId:crypto.randomUUID(),definition:foreignDefinition},20,context(1,true))).status,400);
 await f.db.exec('alter table teacher_task_source_files disable trigger teacher_task_source_immutable');await f.db.exec("update teacher_task_source_files set status='pending'");
 const payload={id:original.id,expectedRevision:original.revision,requestId:crypto.randomUUID()};assert.equal((await f.draft('copy',payload)).status,400);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_drafts')).rows[0].n,1);
});
