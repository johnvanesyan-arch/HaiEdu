import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {database,id,context} from './fixtures/writing-assignments-db.mjs';
const definition={schemaVersion:'teacher-task-v1',title:'My task',instructions:'Read and explain',source:{kind:'text',text:'Classroom text'},response:{kind:'link'},assessment:{kind:'feedback'}};
test('private authoring drafts reconcile create/save replies and fence stale and foreign updates',async t=>{
 const db=await database();t.after(()=>db.close());await db.exec(readFileSync('supabase/migrations/20261030203404_teacher_task_drafts.sql','utf8'));
 const call=async(action,payload={},actor=20,scope=context(0,true))=>(await db.query('select service_teacher_task_drafts($1,$2,$3,$4,$5) r',[id(actor),id(actor===20?420:421),action,JSON.stringify(scope),JSON.stringify(payload)])).rows[0].r;
 const payload={requestId:crypto.randomUUID(),definition},created=await call('create',payload);assert.equal(created.draft.revision,1);assert.equal((await call('create',payload)).draft.id,created.draft.id);
 const changed={...definition,title:'Updated task'};const saved=await call('save',{id:created.draft.id,expectedRevision:1,definition:changed});assert.equal(saved.draft.revision,2);assert.equal((await call('save',{id:created.draft.id,expectedRevision:1,definition:changed})).draft.revision,2);
 await assert.rejects(call('save',{id:created.draft.id,expectedRevision:1,definition}),/task_draft_conflict/);
 await assert.rejects(call('get',{id:created.draft.id},21,context(2,true)),/task_draft_unavailable/);
 assert.equal((await call('list')).drafts.length,1);assert.equal((await db.query('select count(*)::int n from written_work')).rows[0].n,0);
 assert.equal((await db.query("select has_table_privilege('authenticated','teacher_task_drafts','select') allowed")).rows[0].allowed,false);
});
test('draft Edge validates independent format requirements before persistence',async t=>{
 const {fixture,token}=await import('./fixtures/writing-assignments-api.mjs');const {compile}=await import('./fixtures/learning-acceptance.mjs');const {createTeacherTaskDraftsHandler}=await import('../supabase/functions/_shared/teacher-task-drafts-handler.mjs');const f=await fixture();t.after(()=>f.db.close());await f.db.exec(readFileSync('supabase/migrations/20261030203404_teacher_task_drafts.sql','utf8'));
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);const handle=createTeacherTaskDraftsHandler({createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture'}});
 const request=body=>handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(20),'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const body={action:'create',context:context(0,true),payload:{requestId:crypto.randomUUID(),definition}};const response=await request(body);assert.equal(response.status,200);assert.equal((await response.json()).draft.definition.response.kind,'link');
 assert.equal((await request({...body,payload:{...body.payload,requestId:crypto.randomUUID(),definition:{...definition,response:{kind:'document',allowedFormats:[]}}}})).status,400);
 assert.equal((await request({...body,actorId:id(21)})).status,400);
});
