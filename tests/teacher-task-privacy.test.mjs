import test from 'node:test';import assert from 'node:assert/strict';
import {privacyFixture,id,context,pdf,textDefinition} from './fixtures/teacher-task-privacy-api.mjs';
import {privacyToken} from './fixtures/teacher-task-privacy-api.mjs';
import {docxBytes} from './fixtures/teacher-task-student-api.mjs';
async function submit(f,delivery,content,actor=10){const scope={...context(0,false),enrollmentId:id(actor===10?371:9112)};
 let r=await f.request('open',{id:delivery.id},actor,scope);let w=(await r.json()).work;
 r=await f.request('save',{id:delivery.id,expectedRevision:w.revision,content},actor,scope);assert.equal(r.status,200,await r.clone().text());w=(await r.json()).work;
 r=await f.request('submit',{id:delivery.id,expectedRevision:w.revision,content,requestId:crypto.randomUUID()},actor,scope);assert.equal(r.status,200,await r.clone().text());return(await r.json()).receipt;
}
async function draft(f,action,payload){const r=await f.admin.rpc('service_teacher_task_drafts',{p_actor:id(20),p_auth:id(420),p_action:action,p_context:context(0,true),p_payload:payload});if(r.error)throw Error(r.error.message);return r.data.draft;}
async function loosePdf(f){
 const d=await draft(f,'create',{requestId:crypto.randomUUID(),definition:{...textDefinition,source:{kind:'pdf',attachmentId:null}}});
 const form=new FormData();form.set('request',JSON.stringify({action:'upload',context:context(0,true),payload:{draftId:d.id,requestId:crypto.randomUUID()}}));form.set('file',new Blob([pdf],{type:'application/pdf'}),'task.pdf');
 const r=await f.handleSource(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+privacyToken(20)},body:form}));assert.equal(r.status,200,await r.clone().text());return{draft:d,file:await r.json()};
}
async function ageFixtureFiles(f){
 // Disposable fixture clock setup only. Application RPCs cannot backdate files.
 await f.db.exec("alter table teacher_task_source_files disable trigger teacher_task_source_immutable;update teacher_task_source_files set created_at=clock_timestamp()-interval '3 days',upload_lease_until=clock_timestamp()-interval '2 days';alter table teacher_task_source_files enable trigger teacher_task_source_immutable;");
}
test('approved erasure queues private files, waits for uploads, preserves shared teacher sources and recovers lost Auth replies',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const delivery=await f.send({...textDefinition,source:{kind:'pdf',attachmentId:null},response:{kind:'document',allowedFormats:['pdf']}},'selected',[id(371)]);
 const u=await f.fileRequest('upload',{id:delivery.id,requestId:crypto.randomUUID(),format:'pdf'},10,context(0,false),pdf);assert.equal(u.status,200,await u.clone().text());const file=(await u.json()).file;
 await f.request('save',{id:delivery.id,expectedRevision:0,content:{kind:'document',fileId:file.id}});await f.request('submit',{id:delivery.id,expectedRevision:1,content:{kind:'document',fileId:file.id},requestId:crypto.randomUUID()});
 const requestId=await f.processing();let r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,202,await r.clone().text());let data=await r.json();assert.equal(data.completed,false);assert.equal(data.erasure.pendingFiles,1);assert.equal(f.objects.size,2);assert.equal(f.removeCalls(),0);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_submissions')).rows[0].n,0);assert.equal((await f.db.query('select count(*)::int n from auth.sessions where user_id=$1',[id(10)])).rows[0].n,0);
 assert.equal((await f.mineRequest({action:'cancel_deletion'})).status,409);
 assert.equal((await f.adminRequest({action:'reject_deletion',requestId})).status,409);
 await assert.rejects(f.db.query("update account_deletion_requests set status='cancelled' where id=$1",[requestId]),/deletion_execution_started/);
 await f.drainElapsed();f.storageMode('lost');f.authMode('lost');r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,503,await r.clone().text());assert.equal(f.objects.size,1);assert.equal((await f.db.query('select count(*)::int n from profiles where id=$1',[id(10)])).rows[0].n,0);
 r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,200,await r.clone().text());data=await r.json();assert.equal(data.completed,true);assert.equal(data.request.status,'completed');assert.equal((await f.db.query('select count(*)::int n from security_audit_log where action=$1',['admin.student_account_erased'])).rows[0].n,1);
 assert.equal((await f.adminRequest({action:'execute_deletion',requestId})).status,200);
 const queue=(await f.db.query('select * from teacher_task_storage_deletions')).rows[0];assert.equal(queue.owner_id,null);assert.equal(queue.object_path,null);assert.equal(queue.asset_id,null);
 const job=(await f.db.query('select * from teacher_task_erasure_jobs')).rows[0];assert.equal(job.target_id,null);assert.equal(job.phase,'completed');assert.equal((await f.db.query('select count(*)::int n from teacher_task_source_files')).rows[0].n,1);
 assert.equal((await f.db.query('select count(*)::int n from private.teacher_task_privacy_scopes')).rows[0].n,0);
});
test('new privacy schema remains inaccessible to ordinary clients and cannot bypass immutable history',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());await f.send();await assert.rejects(f.db.exec('delete from teacher_task_delivery_recipients'),/task_privacy_delete_forbidden/);
 for(const table of ['teacher_task_erasure_jobs','teacher_task_storage_deletions','teacher_task_cleanup_runs'])assert.equal((await f.db.query("select has_table_privilege('authenticated',$1,'select') allowed",[table])).rows[0].allowed,false);
 const requestId=await f.processing();assert.equal((await f.adminRequest({action:'execute_deletion',requestId},20)).status,403);assert.equal((await f.adminRequest({action:'execute_deletion',requestId},40,'aal1')).status,403);
 assert.equal((await f.privacy('prepare',{requestId},20)).error.message,'task_privacy_forbidden');
 for(const name of ['service_teacher_task_privacy(uuid,uuid,text,jsonb)','service_teacher_task_retention(uuid,uuid,text,jsonb)','service_teacher_task_privacy_counts(uuid)','erase_student_data(uuid)'])assert.equal((await f.db.query("select has_function_privilege('authenticated',$1,'execute') allowed",[name])).rows[0].allowed,false);
});

test('erasure removes this learner feedback/history and Word bytes while other learners and the frozen PDF remain',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const delivery=await f.send({...textDefinition,source:{kind:'pdf',attachmentId:null},response:{kind:'document',allowedFormats:['docx']}},'class');
 const owned=[];for(const actor of [10,12]){const scope={...context(0,false),enrollmentId:id(actor===10?371:9112)},r=await f.fileRequest('upload',{id:delivery.id,requestId:crypto.randomUUID(),format:'docx'},actor,scope,docxBytes());assert.equal(r.status,200);const file=(await r.json()).file,s=await submit(f,delivery,{kind:'document',fileId:file.id},actor);owned.push({actor,s});
  const review={decision:'returned',feedback:'Add one example.',scores:{},reason:''};let q=await f.admin.rpc('service_teacher_task_review',{p_actor:id(20),p_auth:id(420),p_action:'save',p_context:context(0,true),p_payload:{submissionId:s.id,expectedRevision:0,review}});assert.equal(q.error,null);
  q=await f.admin.rpc('service_teacher_task_review',{p_actor:id(20),p_auth:id(420),p_action:'publish',p_context:context(0,true),p_payload:{submissionId:s.id,expectedRevision:1,review,requestId:crypto.randomUUID()}});assert.equal(q.error,null);
 }
 const teacher=await f.admin.rpc('service_teacher_task_privacy_counts',{p_user_id:id(20)}),student=await f.admin.rpc('service_teacher_task_privacy_counts',{p_user_id:id(10)});
 assert.equal(teacher.data.submissions,0);assert.equal(teacher.data.responseFiles,0);assert.equal(teacher.data.privateFeedback,2);assert.equal(student.data.submissions,1);assert.equal(student.data.receivedFeedback,1);assert.equal(student.data.privateFeedback,0);assert.equal(JSON.stringify(student.data).includes('Add one example'),false);
 const requestId=await f.processing();await f.adminRequest({action:'execute_deletion',requestId});await f.drainElapsed();const done=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(done.status,200,await done.clone().text());
 assert.equal(f.objects.size,2);assert.equal((await f.db.query('select count(*)::int n from teacher_task_submissions where student_id=$1',[id(12)])).rows[0].n,1);assert.equal((await f.db.query('select count(*)::int n from teacher_task_reviews')).rows[0].n,1);assert.equal((await f.db.query('select count(*)::int n from teacher_task_review_drafts')).rows[0].n,1);assert.equal((await f.db.query('select recipient_count from teacher_task_deliveries')).rows[0].recipient_count,2);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_delivery_recipients')).rows[0].n,1);assert.equal((await f.db.query('select count(*)::int n from teacher_task_versions')).rows[0].n,1);
});
test('storage failure and lost SQL acknowledgement keep the same irreversible request retryable',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const delivery=await f.send({...textDefinition,response:{kind:'document',allowedFormats:['pdf']}},'selected',[id(371)]);
 await f.fileRequest('upload',{id:delivery.id,requestId:crypto.randomUUID(),format:'pdf'},10,context(0,false),pdf);
 const requestId=await f.processing();f.loseRpc('purge');let r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,500);
 await f.drainElapsed();f.storageMode('fail');r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,503);assert.equal((await f.db.query('select count(*)::int n from profiles where id=$1',[id(10)])).rows[0].n,1);assert.equal((await f.db.query('select phase from teacher_task_erasure_jobs')).rows[0].phase,'data_erased');
 f.storageMode('ok');f.loseRpc('erase_student_data');r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,503);
 f.loseRpc('finish');r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,500);r=await f.adminRequest({action:'execute_deletion',requestId});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).replayed,true);
 assert.equal((await f.db.query("select count(*)::int n from security_audit_log where action='admin.student_account_erased'")).rows[0].n,1);
});
test('approval remains reversible before execution and staff-owned resources cannot enter student erasure',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const requestId=await f.processing();const cancelled=await f.mineRequest({action:'cancel_deletion'});assert.equal(cancelled.status,200);assert.equal((await f.privacy('prepare',{requestId})).error.message,'approved_request_required');assert.equal((await f.db.query('select count(*)::int n from teacher_task_erasure_jobs')).rows[0].n,0);
 const staff=await f.processing(20);assert.equal((await f.privacy('prepare',{requestId:staff})).error.message,'task_privacy_target');
});
test('orphan cleanup keeps current, copied-initial and frozen PDF references, and retries one reviewed manifest',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const first=await loosePdf(f);
 let d=await draft(f,'save',{id:first.draft.id,expectedRevision:1,definition:{...first.draft.definition,source:{kind:'pdf',attachmentId:first.file.id}}});const copied=await draft(f,'copy',{id:d.id,expectedRevision:d.revision,requestId:crypto.randomUUID()});
 await draft(f,'save',{id:d.id,expectedRevision:d.revision,definition:textDefinition});await draft(f,'save',{id:copied.id,expectedRevision:1,definition:textDefinition}); // initial copy snapshot still pins its PDF
 await f.send({...textDefinition,source:{kind:'pdf',attachmentId:null}});const orphan=await loosePdf(f);await ageFixtureFiles(f);const before=new Date(Date.now()-36*3600000).toISOString();
 let r=await f.adminRequest({action:'preview_task_file_cleanup',before});assert.equal(r.status,200,await r.clone().text());const preview=await r.json();assert.equal(preview.files,1);assert.equal(f.objects.size,3);
 const payload={action:'execute_task_file_cleanup',before,fingerprint:preview.fingerprint,requestId:crypto.randomUUID()};f.storageMode('fail');r=await f.adminRequest(payload);assert.equal(r.status,503);assert.equal((await f.db.query('select count(*)::int n from teacher_task_source_files')).rows[0].n,2);
 const cleanupId=(await f.db.query('select id from teacher_task_cleanup_runs')).rows[0].id;f.storageMode('lost');r=await f.adminRequest({action:'resume_task_file_cleanup',cleanupId});assert.equal(r.status,200,await r.clone().text());assert.equal(f.objects.size,2);
 r=await f.adminRequest(payload);assert.equal(r.status,200);assert.equal((await r.json()).cleanupId,cleanupId);assert.equal((await f.db.query('select count(*)::int n from teacher_task_cleanup_runs')).rows[0].n,1);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_source_files where id=$1',[orphan.file.id])).rows[0].n,0);assert.equal((await f.db.query('select count(*)::int n from private.teacher_task_privacy_scopes')).rows[0].n,0);
 const queue=(await f.db.query('select * from teacher_task_storage_deletions')).rows[0];assert.equal(queue.object_path,null);assert.equal(queue.owner_id,null);
});
test('orphan cleanup rejects stale previews and recent upload leases; no path or cutoff bypass',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const orphan=await loosePdf(f);const before=new Date(Date.now()-36*3600000).toISOString();let r=await f.adminRequest({action:'preview_task_file_cleanup',before});assert.equal((await r.json()).files,0);await ageFixtureFiles(f);
 r=await f.adminRequest({action:'preview_task_file_cleanup',before});const preview=await r.json();await draft(f,'save',{id:orphan.draft.id,expectedRevision:1,definition:{...orphan.draft.definition,source:{kind:'pdf',attachmentId:orphan.file.id}}});
 r=await f.adminRequest({action:'execute_task_file_cleanup',before,fingerprint:preview.fingerprint,requestId:crypto.randomUUID()});assert.equal(r.status,409,await r.clone().text());assert.equal(f.objects.size,1);assert.equal((await f.db.query('select count(*)::int n from teacher_task_cleanup_runs')).rows[0].n,0);
 assert.equal((await f.adminRequest({action:'preview_task_file_cleanup',before:new Date().toISOString()})).status,400);assert.equal((await f.privacy('files',{cleanupId:crypto.randomUUID()})).error.message,'task_privacy_invalid');
});
test('queue acknowledgements are scoped to one request and cannot precede an active upload lease',async t=>{
 const f=await privacyFixture();t.after(()=>f.db.close());const delivery=await f.send({...textDefinition,response:{kind:'document',allowedFormats:['pdf']}},'class');
 for(const actor of [10,12])await f.fileRequest('upload',{id:delivery.id,requestId:crypto.randomUUID(),format:'pdf'},actor,{...context(0,false),enrollmentId:id(actor===10?371:9112)},pdf);
 const requests=[];for(const actor of [10,12]){const requestId=await f.processing(actor);requests.push(requestId);assert.equal((await f.adminRequest({action:'execute_deletion',requestId})).status,202);}
 const queues=(await f.db.query('select id,request_id from teacher_task_storage_deletions order by request_id')).rows;
 const first=queues.find(q=>q.request_id===requests[0]),other=queues.find(q=>q.request_id===requests[1]);
 assert.equal((await f.privacy('ack',{requestId:requests[0],ids:[first.id]})).error.message,'task_privacy_invalid');
 await f.drainElapsed();assert.equal((await f.privacy('ack',{requestId:requests[0],ids:[other.id]})).error.message,'task_privacy_invalid');
 assert.equal((await f.privacy('files',{requestId:requests[0]})).data.files.length,1);assert.equal((await f.db.query('select count(*)::int n from teacher_task_storage_deletions where deleted_at is null')).rows[0].n,2);
});
