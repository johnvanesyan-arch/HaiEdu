import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {authoringFixture,id,context,token} from './fixtures/teacher-task-authoring-api.mjs';
import {addLearner} from './fixtures/resource-assignments-db.mjs';
import {compile} from './fixtures/learning-acceptance.mjs';
import {createTeacherTaskDeliveryHandler} from '../supabase/functions/_shared/teacher-task-delivery-handler.mjs';
const definition={schemaVersion:'teacher-task-v1',title:'Task one',instructions:'Explain your answer.',source:{kind:'text',text:'Classroom task'},response:{kind:'link'},assessment:{kind:'feedback'}};
test('deployed custom-delivery entrypoint boots the actual authorized handler',async t=>{
 const f=await authoringFixture({delivery:true});t.after(()=>f.db.close());let handler;
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
 compile(readFileSync('supabase/functions/manage-teacher-task-delivery/index.ts','utf8'),{
  createClient:()=>f.admin,hasActiveLiveSession,createTeacherTaskDeliveryHandler,
  Deno:{env:{get:()=> 'fixture'},serve:value=>{handler=value;}}
 },[]);
 assert.equal(typeof handler,'function');
 const r=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(20),'Content-Type':'application/json'},body:JSON.stringify({action:'list',context:context(0,true),payload:{}})}));
 assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).version,'teacher-task-delivery-v1');assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal((await handler(new Request('https://fixture.invalid',{method:'POST'}))).status,401);
});
async function setup(t){const f=await authoringFixture();t.after(()=>f.db.close());await f.db.exec(readFileSync('supabase/migrations/20261030203407_teacher_task_delivery.sql','utf8'));
 const rpc=async(action,payload={},actor=20,scope=context(actor===20?0:2,true))=>(await f.db.query('select service_teacher_task_delivery($1,$2,$3,$4,$5) r',[id(actor),id(actor===20?420:421),action,JSON.stringify(scope),JSON.stringify(payload)])).rows[0].r;
 const draftCall=async(action,payload)=>(await f.db.query('select service_teacher_task_drafts($1,$2,$3,$4,$5) r',[id(20),id(420),action,JSON.stringify(context(0,true)),JSON.stringify(payload)])).rows[0].r;
 const draft=(await draftCall('create',{requestId:crypto.randomUUID(),definition})).draft;
 const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);const handle=createTeacherTaskDeliveryHandler({createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture'}});
 const request=(action,payload,actor=20,scope=context(actor===20?0:2,true))=>handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token(actor),'Content-Type':'application/json'},body:JSON.stringify({action,context:scope,payload})}));
 const prepared=async(mode='class',enrollmentIds=[])=>{const p=await rpc('preview',{id:draft.id});return{id:draft.id,expectedRevision:p.draft.revision,definition:p.draft.definition,requestId:crypto.randomUUID(),rosterFingerprint:p.rosterFingerprint,mode,enrollmentIds};};
 const governedCount=(await f.db.query('select count(*)::int n from written_task_versions')).rows[0].n;return{...f,rpc,draftCall,draft,request,prepared,governedCount};
}
test('custom delivery freezes saved definition/recipients and replays the exact receipt after later draft edits',async t=>{
 const f=await setup(t);await addLearner(f.db);const payload=await f.prepared('selected',[id(371)]);const r=await f.request('assign',payload);assert.equal(r.status,200);const sent=await r.json();assert.equal(sent.delivery.recipientCount,1);assert.equal(sent.delivery.recipients[0].enrollmentId,id(371));
 await f.draftCall('save',{id:f.draft.id,expectedRevision:1,definition:{...definition,title:'Changed after sending'}});
 const replay=await f.request('assign',payload);assert.equal(replay.status,200);const again=await replay.json();assert.equal(again.delivery.id,sent.delivery.id);assert.equal(again.replayed,true);assert.equal(again.delivery.definition.title,'Task one');
 const newer=await f.request('assign',await f.prepared());assert.equal(newer.status,200);assert.notEqual((await newer.json()).delivery.taskVersionId,sent.delivery.taskVersionId);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_delivery_events')).rows[0].n,2);assert.equal((await f.db.query('select count(*)::int n from written_work')).rows[0].n,0);assert.equal((await f.db.query('select count(*)::int n from written_task_versions')).rows[0].n,f.governedCount);
 await assert.rejects(f.db.query("update teacher_task_versions set definition='{}'"),/task_delivery_immutable/);
 const inspect=await f.rpc('get',{id:sent.delivery.id});assert.equal(inspect.delivery.definition.title,'Task one');assert.equal((await f.rpc('list')).deliveries.length,2);
});
test('custom delivery rejects stale drafts/rosters, duplicate recipients, foreign access and invalid complete definitions',async t=>{
 const f=await setup(t);let payload=await f.prepared();await addLearner(f.db);assert.equal((await f.request('assign',payload)).status,409);
 payload=await f.prepared();assert.equal((await f.request('assign',{...payload,definition:{...definition,title:'Unstored'}})).status,409);
 assert.equal((await f.request('assign',{...payload,definition:{...definition,source:{kind:'pdf',attachmentId:null}}})).status,400);
 assert.equal((await f.request('assign',{...payload,mode:'selected',enrollmentIds:[id(371),id(371)]})).status,400);
 assert.equal((await f.request('assign',payload,21)).status,404);const first=await f.request('assign',payload);assert.equal(first.status,200);const sent=(await first.json()).delivery;assert.equal((await f.rpc('preview',{id:f.draft.id})).alreadyAssigned.length,2);
 assert.equal((await f.request('assign',{...payload,requestId:crypto.randomUUID()})).status,409);assert.equal((await f.request('assign',{...payload,mode:'selected',enrollmentIds:[id(371)]})).status,409);
 assert.equal((await f.request('get',{id:sent.id},21)).status,404);assert.equal((await f.db.query("select has_table_privilege('authenticated','teacher_task_versions','select') allowed")).rows[0].allowed,false);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_deliveries')).rows[0].n,1);
});
