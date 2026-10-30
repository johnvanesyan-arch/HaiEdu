import test from 'node:test';import assert from 'node:assert/strict';
import {studentTaskFixture,id,context,textDefinition,pdf,docxBytes} from './fixtures/teacher-task-student-api.mjs';
import {validateTaskDocument} from '../supabase/functions/_shared/teacher-task-documents.mjs';
test('OOXML and PDF validation rejects fake/macro/unsafe containers without extracting files',async()=>{
 await validateTaskDocument(pdf,'pdf');await validateTaskDocument(docxBytes(),'docx');await assert.rejects(validateTaskDocument(pdf,'docx'),/task_file_invalid/);await assert.rejects(validateTaskDocument(docxBytes({'word/vbaProject.bin':'macro'}),'docx'),/task_file_invalid/);await assert.rejects(validateTaskDocument(docxBytes({'../outside':'unsafe'}),'docx'),/task_file_invalid/);const bytes=docxBytes();bytes[40]^=1;await assert.rejects(validateTaskDocument(bytes,'docx'),/task_file_invalid/);
});
test('received tasks remain private drafts until explicit immutable submit and exact nonce recovery',async t=>{
 const f=await studentTaskFixture();t.after(()=>f.db.close());const sent=await f.send();const before=(await f.db.query('select count(*)::int n from written_work')).rows[0].n;
 const inbox=await f.request('inbox');assert.equal(inbox.status,200);assert.equal((await inbox.json()).assignments[0].state,'not_started');let r=await f.request('open',{id:sent.id});assert.equal((await r.json()).work.revision,0);assert.equal((await f.db.query('select count(*)::int n from teacher_task_student_work')).rows[0].n,0);
 const content={kind:'text',text:'An independent answer.'};r=await f.request('save',{id:sent.id,expectedRevision:0,content});assert.equal(r.status,200);assert.equal((await r.json()).work.state,'draft');r=await f.request('save',{id:sent.id,expectedRevision:0,content});assert.equal((await r.json()).work.revision,1);
 assert.equal((await f.request('save',{id:sent.id,expectedRevision:0,content:{...content,text:'A stale overwrite'}})).status,409);assert.equal((await f.db.query('select count(*)::int n from teacher_task_submissions')).rows[0].n,0);
 const payload={id:sent.id,expectedRevision:1,content,requestId:crypto.randomUUID()};r=await f.request('submit',payload);assert.equal(r.status,200);const result=await r.json();assert.equal(result.work.state,'submitted');assert.equal(result.work.submissions.length,1);const replay=await f.request('submit',payload);assert.equal((await replay.json()).receipt.id,result.receipt.id);
 assert.equal((await f.request('save',{id:sent.id,expectedRevision:2,content})).status,409);assert.equal((await f.request('submit',{...payload,requestId:crypto.randomUUID()})).status,409);assert.equal((await f.db.query('select count(*)::int n from teacher_task_work_events')).rows[0].n,1);assert.equal((await f.db.query('select count(*)::int n from written_work')).rows[0].n,before);
 await assert.rejects(f.db.query("update teacher_task_submissions set content='{}'"),/task_delivery_immutable/);
});
test('selected recipients, live session/membership, response kind and HTTPS submission are enforced',async t=>{
 const f=await studentTaskFixture();t.after(()=>f.db.close());const sent=await f.send({...textDefinition,response:{kind:'link'}},'selected',[id(371)]);
 assert.equal((await (await f.request('inbox',{},12)).json()).assignments.length,0);assert.equal((await f.request('open',{id:sent.id},12,{...context(0,false),enrollmentId:id(9112)})).status,404);assert.equal((await f.request('inbox',{},20)).status,403);assert.equal((await f.request('open',{id:sent.id},10,context(1,false))).status,404);
 assert.equal((await f.request('save',{id:sent.id,expectedRevision:0,content:{kind:'text',text:'Wrong kind'}})).status,400);const content={kind:'link',url:'https://example.org/answer'};await f.request('save',{id:sent.id,expectedRevision:0,content});assert.equal((await f.request('submit',{id:sent.id,expectedRevision:1,requestId:crypto.randomUUID(),content:{kind:'link',url:'javascript:alert(1)'}})).status,400);
 await f.db.query("update institutional_class_enrollments set valid_to=clock_timestamp()-interval '1 hour' where id=$1",[id(371)]);assert.equal((await f.request('open',{id:sent.id})).status,403);assert.equal((await (await f.request('inbox')).json()).assignments.length,0);
});
test('all nine independent source/response combinations complete draft and submit with private file delivery',async t=>{
 const f=await studentTaskFixture();t.after(()=>f.db.close());
 for(const source of [{kind:'text',text:'Read this task'},{kind:'link',url:'https://example.org/task'},{kind:'pdf',attachmentId:null}])for(const response of [{kind:'text'},{kind:'link'},{kind:'document',allowedFormats:['docx']}]){
  const sent=await f.send({...textDefinition,source,response});let content=response.kind==='text'?{kind:'text',text:'My answer'}:{kind:'link',url:'https://example.org/answer'};
  if(source.kind==='pdf'){const opened=await f.fileRequest('source',{id:sent.id});assert.equal(opened.status,200);assert.deepEqual(new Uint8Array(await opened.arrayBuffer()),pdf);}
  if(response.kind==='document'){const bytes=docxBytes();const payload={id:sent.id,requestId:crypto.randomUUID(),format:'docx'};const r=await f.fileRequest('upload',payload,10,context(0,false),bytes);assert.equal(r.status,200,await r.clone().text());const file=(await r.json()).file;assert.equal((await (await f.fileRequest('upload',payload,10,context(0,false),bytes)).json()).file.id,file.id);content={kind:'document',fileId:file.id};const opened=await f.fileRequest('open',{id:sent.id,fileId:file.id});assert.equal(opened.status,200);assert.deepEqual(new Uint8Array(await opened.arrayBuffer()),bytes);assert.equal(opened.headers.get('cache-control'),'no-store');}
  let r=await f.request('save',{id:sent.id,expectedRevision:0,content});assert.equal(r.status,200,await r.clone().text());r=await f.request('submit',{id:sent.id,expectedRevision:1,content,requestId:crypto.randomUUID()});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).work.state,'submitted');
 }
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_submissions')).rows[0].n,9);assert.equal((await f.db.query("select has_table_privilege('authenticated','teacher_task_response_files','select') allowed")).rows[0].allowed,false);
});
test('document format constraints, foreign file references and corrupt downloads fail closed',async t=>{
 const f=await studentTaskFixture();t.after(()=>f.db.close());const sent=await f.send({...textDefinition,response:{kind:'document',allowedFormats:['pdf']}});
 const upload=(format,bytes=pdf)=>f.fileRequest('upload',{id:sent.id,requestId:crypto.randomUUID(),format},10,context(0,false),bytes);
 assert.equal((await upload('docx',docxBytes())).status,400);assert.equal((await upload('pdf',docxBytes())).status,400);assert.equal((await upload('docx')).status,400);
 const r=await upload('pdf');assert.equal(r.status,200);const file=(await r.json()).file;
 const other=await f.send({...textDefinition,response:{kind:'document',allowedFormats:['pdf','docx']}});assert.equal((await f.request('save',{id:other.id,expectedRevision:0,content:{kind:'document',fileId:file.id}})).status,400);assert.equal((await f.fileRequest('open',{id:other.id,fileId:file.id})).status,404);
 for(const [format,bytes]of [['pdf',pdf],['docx',docxBytes()]])assert.equal((await f.fileRequest('upload',{id:other.id,requestId:crypto.randomUUID(),format},10,context(0,false),bytes)).status,200);assert.equal((await f.fileRequest('open',{id:sent.id,fileId:file.id},20)).status,403);
 const object=(await f.db.query('select object_path from teacher_task_response_files where id=$1',[file.id])).rows[0].object_path;f.objects.set(object,new Blob(['corrupt']));assert.equal((await f.fileRequest('open',{id:sent.id,fileId:file.id})).status,400);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_submissions')).rows[0].n,0);await f.db.query('delete from auth.sessions where id=$1',[id(401)]);assert.equal((await f.fileRequest('open',{id:sent.id,fileId:file.id})).status,403);
});
