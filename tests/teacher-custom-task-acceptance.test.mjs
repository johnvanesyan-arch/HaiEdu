import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCustomTaskSend,readSubmittedCustomTaskQueue} from '../scripts/teacher-custom-task-acceptance.mjs';
import {studentTaskFixture,id,context,token,textDefinition} from './fixtures/teacher-task-student-api.mjs';

test('production custom-send guard permits only the exact owned task and one designated recipient',()=>{
 const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const draft={id:id(1),revision:2,definition:{schemaVersion:'teacher-task-v1',title:'Run-owned task',source:{kind:'pdf',attachmentId:id(4)},response:{kind:'link'},assessment:{kind:'feedback'},instructions:'Synthetic fixture'}};
 const scope={assignmentId:id(5),curriculumReleaseId:id(6),unitId:id(7)},expected={draft,scope,enrollmentId:id(8)};
 const body={action:'assign',context:scope,payload:{id:draft.id,expectedRevision:2,definition:structuredClone(draft.definition),requestId:id(9),rosterFingerprint:'a'.repeat(64),mode:'selected',enrollmentIds:[id(8)]}};
 assert.equal(matchesCustomTaskSend(body,expected),true);
 for(const patch of [
  {action:'cancel'},{context:{...scope,assignmentId:id(50)}},{context:{...scope,unexpected:true}},
  {payload:{...body.payload,id:id(50)}},{payload:{...body.payload,expectedRevision:3}},
  {payload:{...body.payload,definition:{...draft.definition,title:'Other task'}}},
  {payload:{...body.payload,mode:'class'}},{payload:{...body.payload,enrollmentIds:[id(8),id(10)]}},
  {payload:{...body.payload,enrollmentIds:[id(10)]}},{payload:{...body.payload,force:true}},
  {payload:{...body.payload,requestId:'invalid'}},{payload:{...body.payload,rosterFingerprint:''}},{force:true}
 ])assert.equal(matchesCustomTaskSend({...body,...patch},expected),false,JSON.stringify(patch));
});

test('production queue probe uses the real submitted-work contract and excludes private drafts',async t=>{
 const f=await studentTaskFixture({review:true});t.after(()=>f.db.close());
 const delivery=await f.send(textDefinition,'selected',[id(371)]);
 const review=payload=>f.handleReview(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(20),'Content-Type':'application/json'},body:JSON.stringify({action:'queue',context:context(0,true),payload})}));
 const invalid=await review({state:'pending'});assert.equal(invalid.status,400);assert.equal((await invalid.json()).error,'task_review_invalid');
 const api=async(actor,endpoint,action,payload)=>{
  assert.equal(actor,'A_teacher');assert.equal(endpoint,'manage-teacher-task-review');assert.equal(action,'queue');
  const response=await review(payload);assert.equal(response.status,200,await response.clone().text());return response.json();
 };
 assert.deepEqual((await readSubmittedCustomTaskQueue(api,'A_teacher')).entries,[]);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_student_work')).rows[0].n,0);
 const content={kind:'text',text:'PRIVATE DRAFT: not teacher review work'};
 let response=await f.request('save',{id:delivery.id,expectedRevision:0,content});assert.equal(response.status,200,await response.clone().text());
 assert.deepEqual((await readSubmittedCustomTaskQueue(api,'A_teacher')).entries,[]);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_submissions')).rows[0].n,0);
 response=await f.request('submit',{id:delivery.id,expectedRevision:1,content,requestId:crypto.randomUUID()});assert.equal(response.status,200,await response.clone().text());const receipt=(await response.json()).receipt;
 const queue=await readSubmittedCustomTaskQueue(api,'A_teacher');assert.equal(queue.entries.length,1);assert.equal(queue.entries[0].id,receipt.id);
});
