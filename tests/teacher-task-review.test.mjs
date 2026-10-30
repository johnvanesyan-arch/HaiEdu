import {FunctionsClient} from '@supabase/functions-js';
import {createStudentTeacherTaskClient} from '../web/student-teacher-task-client.mjs';
import {taskDownloadBlob} from '../web/teacher-task-download.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {studentTaskFixture,id,context,token,textDefinition,pdf,docxBytes} from './fixtures/teacher-task-student-api.mjs';
async function setup(t,definition=textDefinition){
 const f=await studentTaskFixture({review:true});t.after(()=>f.db.close());
 f.review=(action,payload={},actor=20,scope=context(0,true),files=false)=>(files?f.handleReviewFiles:f.handleReview)(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(actor),'Content-Type':'application/json'},body:JSON.stringify({action,context:scope,payload})}));
 f.publish=async(submissionId,review,expectedRevision=0,requestId=crypto.randomUUID())=>{let r=await f.review('save',{submissionId,expectedRevision,review});assert.equal(r.status,200,await r.clone().text());const d=await r.json();const payload={submissionId,expectedRevision:d.draft.revision,review,requestId};r=await f.review('publish',payload);return{response:r,payload};};
 f.submit=async(delivery,content={kind:'text',text:'My first response.'})=>{let r=await f.request('open',{id:delivery.id});const d=await r.json();r=await f.request('save',{id:delivery.id,expectedRevision:d.work.revision,content});assert.equal(r.status,200,await r.clone().text());const w=(await r.json()).work;r=await f.request('submit',{id:delivery.id,expectedRevision:w.revision,content,requestId:crypto.randomUUID()});assert.equal(r.status,200,await r.clone().text());return(await r.json()).receipt;};
 f.delivery=await f.send(definition,'selected',[id(371)]);return f;
}
const review=(decision='reviewed',feedback='Explain your answer clearly.',scores={},reason='')=>({decision,feedback,scores,reason});
test('teacher queue excludes private learner drafts; feedback draft stays private and exact publish retry is immutable',async t=>{
 const f=await setup(t);await f.request('save',{id:f.delivery.id,expectedRevision:0,content:{kind:'text',text:'PRIVATE LEARNER DRAFT'}});
 assert.deepEqual((await(await f.review('queue')).json()).entries,[]);let s=await f.submit(f.delivery);let q=await(await f.review('queue')).json();assert.equal(q.entries.length,1);assert.equal(q.entries[0].id,s.id);assert.equal(JSON.stringify(q).includes('PRIVATE LEARNER DRAFT'),false);
 const saved=await f.review('save',{submissionId:s.id,expectedRevision:0,review:review()});assert.equal(saved.status,200,await saved.clone().text());let learner=await(await f.request('open',{id:f.delivery.id})).json();assert.deepEqual(learner.work.submissions[0].reviews,[]);
 const payload={submissionId:s.id,expectedRevision:1,review:review(),requestId:crypto.randomUUID()};let r=await f.review('publish',payload);assert.equal(r.status,200,await r.clone().text());const receipt=(await r.json()).receipt;assert.deepEqual((await(await f.review('publish',payload)).json()).receipt,receipt);
 learner=await(await f.request('open',{id:f.delivery.id})).json();assert.equal(learner.work.state,'reviewed');assert.equal(learner.work.submissions[0].reviews[0].review.feedback,review().feedback);assert.equal((await f.request('save',{id:f.delivery.id,expectedRevision:learner.work.revision,content:{kind:'text',text:'Overwrite'}})).status,409);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_reviews')).rows[0].n,1);await assert.rejects(f.db.exec("update teacher_task_reviews set review='{}'"),/immutable/);
});
test('return requires useful feedback and revision creates new immutable submission/history',async t=>{
 const f=await setup(t);const s=await f.submit(f.delivery);let result=await f.publish(s.id,review('returned',''));assert.equal(result.response.status,400);
 result=await f.publish(s.id,review('returned','Add evidence for your explanation.'),1);assert.equal(result.response.status,200,await result.response.clone().text());
 let learner=await(await f.request('open',{id:f.delivery.id})).json();assert.equal(learner.work.state,'returned');assert.equal(learner.work.submissions[0].reviews.length,1);
 await f.request('save',{id:f.delivery.id,expectedRevision:learner.work.revision,content:{kind:'text',text:'PRIVATE REVISION'}});let teacher=await(await f.review('open',{submissionId:s.id})).json();assert.equal(teacher.submission.content.text,'My first response.');assert.equal(JSON.stringify(teacher).includes('PRIVATE REVISION'),false);assert.equal(teacher.submission.editable,false);
 const s2=await f.submit(f.delivery,{kind:'text',text:'The revised answer with evidence.'});assert.notEqual(s2.id,s.id);result=await f.publish(s2.id,review());assert.equal(result.response.status,200,await result.response.clone().text());learner=await(await f.request('open',{id:f.delivery.id})).json();assert.equal(learner.work.submissions.length,2);assert.equal(learner.work.submissions[0].content.text,'My first response.');assert.equal(learner.work.submissions[0].reviews[0].review.decision,'returned');assert.equal(learner.work.submissions[1].reviews[0].review.decision,'reviewed');
 assert.equal((await(await f.review('queue',{state:'all'})).json()).entries.length,1);assert.equal((await(await f.review('open',{submissionId:s.id})).json()).submission.editable,false);
});
test('assigned criteria are enforced; corrections require a reason; stale private notes are preserved',async t=>{
 const definition={...textDefinition,assessment:{kind:'criteria',criteria:[{key:'evidence',label:'Evidence',maxPoints:4},{key:'clarity',label:'Clarity',maxPoints:2}]}};const f=await setup(t,definition);const s=await f.submit(f.delivery);
 let a=await f.publish(s.id,review('reviewed','',{}));assert.equal(a.response.status,400);assert.equal((await f.review('save',{submissionId:s.id,expectedRevision:1,review:review('reviewed','',{evidence:5,clarity:2})})).status,400);
 a=await f.publish(s.id,review('reviewed','',{evidence:3,clarity:2}),1);assert.equal(a.response.status,200,await a.response.clone().text());
 const update=review('reviewed','Reconsidered evidence.',{evidence:4,clarity:2});a=await f.publish(s.id,update,2);assert.equal(a.response.status,400);assert.equal((await a.response.json()).error,'task_review_reason_required');
 const corrected={...update,reason:'A supporting example was missed.'};a=await f.publish(s.id,corrected,3);assert.equal(a.response.status,200,await a.response.clone().text());assert.equal((await a.response.json()).receipt.version,2);
 const stale=await f.review('save',{submissionId:s.id,expectedRevision:1,review:{...corrected,feedback:'Stale change'}});assert.equal(stale.status,409);assert.equal((await(await f.review('open',{submissionId:s.id})).json()).draft.review.feedback,corrected.feedback);
});
test('teacher downloads only submitted PDF/DOCX and frozen source, never private draft files or foreign contexts',async t=>{
 for(const [format,bytes]of [['pdf',pdf],['docx',docxBytes()]]){
  const f=await setup(t,{...textDefinition,source:{kind:'pdf',attachmentId:null},response:{kind:'document',allowedFormats:[format]}});
  let u=await f.fileRequest('upload',{id:f.delivery.id,requestId:crypto.randomUUID(),format},10,context(0,false),bytes);const file=(await u.json()).file;const s=await f.submit(f.delivery,{kind:'document',fileId:file.id});
  for(const action of ['file','source']){const r=await f.review(action,{submissionId:s.id},20,context(0,true),true);assert.equal(r.status,200,await r.clone().text());assert.deepEqual(new Uint8Array(await r.arrayBuffer()),action==='source'?pdf:bytes);assert.equal(r.headers.get('cache-control'),'no-store');}
  assert.equal((await f.review('open',{submissionId:s.id},21)).status,403);assert.equal((await f.review('open',{submissionId:s.id},10)).status,403);assert.equal((await f.review('open',{submissionId:s.id},20,context(1,true))).status,404);
  const foreign=await f.review('file',{submissionId:s.id,fileId:crypto.randomUUID()},20,context(0,true),true);assert.equal(foreign.status,400);
  await f.db.query('delete from auth.sessions where id=$1',[id(420)]);assert.equal((await f.review('file',{submissionId:s.id},20,context(0,true),true)).status,403);
 }
});
test('audited cancellation preserves submissions/feedback and closes new writes while replay remains recoverable',async t=>{
 const f=await setup(t);const s=await f.submit(f.delivery);const pub=await f.publish(s.id,review('returned'));assert.equal(pub.response.status,200);
 const payload={deliveryId:f.delivery.id,requestId:crypto.randomUUID(),reason:'Replaced with a corrected task.'};let r=await f.review('cancel',payload);assert.equal(r.status,200,await r.clone().text());const c=(await r.json()).cancellation;assert.deepEqual((await(await f.review('cancel',payload)).json()).cancellation,c);
 const student=await(await f.request('open',{id:f.delivery.id})).json();assert.equal(student.assignment.cancelled,true);assert.equal(student.work.submissions[0].reviews.length,1);assert.equal((await f.request('save',{id:f.delivery.id,expectedRevision:student.work.revision,content:{kind:'text',text:'Blocked new work'}})).status,409);
 assert.equal((await(await f.review('open',{submissionId:s.id})).json()).submission.editable,false);assert.equal((await f.review('publish',pub.payload)).status,200);assert.equal((await f.db.query('select count(*)::int n from teacher_task_delivery_cancellations')).rows[0].n,1);assert.equal((await f.db.query("select has_table_privilege('authenticated','teacher_task_review_drafts','select') allowed")).rows[0].allowed,false);
});

test('actual Supabase FunctionsClient preserves PDF/DOCX bytes for teacher and learner downloads',async t=>{
 for(const [format,bytes]of [['pdf',pdf],['docx',docxBytes()]]){
  const f=await setup(t,{...textDefinition,source:{kind:'pdf',attachmentId:null},response:{kind:'document',allowedFormats:[format]}});const uploaded=await f.fileRequest('upload',{id:f.delivery.id,requestId:crypto.randomUUID(),format},10,context(0,false),bytes);const file=(await uploaded.json()).file,s=await f.submit(f.delivery,{kind:'document',fileId:file.id});
  // Exercise the installed transport, not the browser harness binary decoder.
  const clientFor=(actor,handler)=>new FunctionsClient('https://fixture.invalid',{headers:{Authorization:'Bearer '+token(actor)},customFetch:(url,init)=>handler(new Request(url,init))});
  const teacher=clientFor(20,f.handleReviewFiles);for(const action of ['file','source']){const r=await teacher.invoke('manage-teacher-task-review-files',{body:{action,context:context(0,true),payload:{submissionId:s.id}}});assert.equal(r.error,null);assert.ok(r.data instanceof Blob);const blob=taskDownloadBlob(r.data);assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),action==='source'?pdf:bytes);assert.equal(blob.type,action==='source'||format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');}
  const client=createStudentTeacherTaskClient({client:{auth:{getSession:async()=>({data:{session:{user:{id:id(10)}}}})},functions:clientFor(10,f.handleFiles)},actorId:id(10)});const blob=await client.download('open',context(0,false),{id:f.delivery.id,fileId:file.id});assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes);client.dispose();
 }
});
