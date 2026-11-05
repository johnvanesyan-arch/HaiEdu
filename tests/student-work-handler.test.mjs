import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studentTaskFixture,id,token} from './fixtures/teacher-task-student-api.mjs';
import {call as writingCall,prepared as writingPrepared} from './fixtures/writing-assignments-db.mjs';
import {call as materialCall,prepared as materialPrepared,published} from './fixtures/resource-assignments-db.mjs';
import {compile} from './fixtures/learning-acceptance.mjs';
import {createStudentWorkHandler,mergeStudentWork,STUDENT_WORK_MAX_PAGES} from '../supabase/functions/_shared/student-work-handler.mjs';

const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
const post=(handle,body,credential=token(10))=>handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)}));
const inbox={action:'inbox',payload:{}};
async function world(t){
 const f=await studentTaskFixture();t.after(()=>f.db.close());
 const handle=createStudentWorkHandler({createAdmin:()=>f.admin,hasActiveLiveSession,env:{url:'https://fixture.invalid',key:'fixture'}});
 const task=await f.send();
 const writing=(await writingCall(f.db,'assign',await writingPrepared(f.db))).assignment;
 const material=await published(f.db);const assigned=(await materialCall(f.db,'assign',await materialPrepared(f.db,material))).assignment;
 return {f,handle,task,writing,material:assigned};
}
const sourceInbox=async(f,rpc,state)=>{const {data,error}=await f.admin.rpc(rpc,rpc==='service_teacher_task_student_work'?{p_actor:id(10),p_auth:id(401),p_action:'inbox',p_context:{},p_payload:{offset:0}}:{p_actor_id:id(10),p_auth_session_id:id(401),p_action:'inbox',p_context:{},p_payload:{offset:0,state}});if(error)throw Error(error.message);return data.assignments;};
const counts=async f=>Object.fromEntries(await Promise.all(['teacher_task_student_work','teacher_task_submissions','written_work','resource_assignment_recipients','writing_assignment_recipients'].map(async t=>[t,(await f.db.query(`select count(*)::int n from ${t}`)).rows[0].n])));

test('My work merges the three authorized inboxes exactly as each source returns them, read-only',async t=>{
 const {f,handle,task,writing,material}=await world(t);
 const before=await counts(f);
 const r=await post(handle,inbox);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
 const body=await r.json();
 assert.equal(body.version,'student-work-v1');assert.equal(body.state,'current');
 assert.deepEqual(body.sources,{task:{status:'ok',complete:true},writing:{status:'ok',complete:true},material:{status:'ok',complete:true}});
 assert.deepEqual(body.items.map(i=>i.source).sort(),['material','task','writing']);
 assert.equal(body.items.find(i=>i.source==='task').row.id,task.id);
 assert.equal(body.items.find(i=>i.source==='writing').row.id,writing.id);
 assert.equal(body.items.find(i=>i.source==='material').row.id,material.id);
 // Rows are passed through unchanged from the same service functions the per-source endpoints use.
 assert.deepEqual(body.items.filter(i=>i.source==='task').map(i=>i.row),await sourceInbox(f,'service_teacher_task_student_work'));
 assert.deepEqual(body.items.filter(i=>i.source==='writing').map(i=>i.row),await sourceInbox(f,'service_writing_assignments','current'));
 assert.deepEqual(body.items.filter(i=>i.source==='material').map(i=>i.row),await sourceInbox(f,'service_resource_assignments','current'));
 const dates=body.items.map(i=>Date.parse(i.row.sentAt??i.row.assignedAt));assert.deepEqual(dates,[...dates].sort((a,b)=>b-a),'Newest first across sources');
 assert.deepEqual(await counts(f),before,'Reading My work writes nothing');
});

test('My work rejects other roles, foreign or inactive sessions and any widened request shape',async t=>{
 const {f,handle}=await world(t);
 assert.equal((await handle(new Request('https://fixture.invalid',{method:'GET'}))).status,405);
 assert.equal((await handle(new Request('https://fixture.invalid',{method:'POST',body:'{}'}))).status,401);
 for(const body of [{...inbox,actorId:id(10)},{...inbox,context:{}},{action:'open',payload:{}},{action:'inbox',payload:{state:'all'}},{action:'inbox',payload:{offset:0}},{action:'inbox',payload:[]}])assert.equal((await post(handle,body)).status,400,JSON.stringify(body));
 assert.equal((await post(handle,inbox,token(20))).status,403,'A teacher cannot read a learner inbox');
 assert.equal((await post(handle,inbox,'fixture.'+Buffer.from(JSON.stringify({session_id:id(420),aal:'aal1'})).toString('base64url'))).status,401,'An unsigned identity is rejected');
 await f.db.query("update profiles set account_status='inactive' where id=$1",[id(10)]);
 assert.equal((await post(handle,inbox)).status,403,'Inactive learner');
});

test('history returns only cancelled work from every source',async t=>{
 const {f,handle,writing}=await world(t);
 await writingCall(f.db,'cancel',{id:writing.id,revision:writing.revision,reason:'Synthetic cancellation'});
 const current=await (await post(handle,inbox)).json();
 assert.equal(current.items.some(i=>i.source==='writing'),false);
 const history=await (await post(handle,{action:'inbox',payload:{state:'history'}})).json();
 assert.equal(history.state,'history');
 assert.deepEqual(history.items.map(i=>[i.source,i.row.id]),[['writing',writing.id]]);
});

function fakeAdmin(rpc){return {auth:{getUser:async()=>({data:{user:{id:id(10)}},error:null})},rpc};}
const liveToken='fixture.'+Buffer.from(JSON.stringify({session_id:id(401),aal:'aal1'})).toString('base64url');
const stub=rpc=>createStudentWorkHandler({createAdmin:()=>fakeAdmin(rpc),hasActiveLiveSession:async()=>true,env:{url:'https://fixture.invalid',key:'fixture'}});
const page=(rows,hasMore,nextOffset,version)=>({data:{...(version?{version}:{}),assignments:rows,hasMore,nextOffset},error:null});
const versions={service_teacher_task_student_work:'teacher-task-student-work-v1',service_writing_assignments:'writing-assignments-v1'};

test('a failing source is reported as unavailable while an authorization failure denies everything',async()=>{
 const handle=stub(async name=>name==='service_writing_assignments'?{data:null,error:{message:'connection reset'}}:page([],false,50,versions[name]));
 const body=await (await post(handle,inbox,liveToken)).json();
 assert.deepEqual(body.sources,{task:{status:'ok',complete:true},writing:{status:'unavailable'},material:{status:'ok',complete:true}});
 const denied=stub(async name=>name==='service_resource_assignments'?{data:null,error:{message:'assignment_forbidden'}}:page([],false,50,versions[name]));
 const r=await post(denied,inbox,liveToken);assert.equal(r.status,403);assert.deepEqual(await r.json(),{error:'student_work_forbidden'});
});

test('paging follows each source to the end, stops at the bound and rejects non-advancing offsets',async()=>{
 const calls=[];
 const handle=stub(async(name,args)=>{calls.push([name,args.p_payload.offset]);if(name==='service_teacher_task_student_work')return page([{id:'t'+args.p_payload.offset,sentAt:'2026-11-01T00:00:00Z'}],args.p_payload.offset<100,args.p_payload.offset+50,versions[name]);if(name==='service_writing_assignments')return page([{id:'w'}],true,args.p_payload.offset+50,versions[name]);return page([{id:'m'}],true,0);});
 const body=await (await post(handle,inbox,liveToken)).json();
 assert.deepEqual(calls.filter(c=>c[0]==='service_teacher_task_student_work').map(c=>c[1]),[0,50,100]);
 assert.deepEqual(body.sources.task,{status:'ok',complete:true});
 assert.equal(calls.filter(c=>c[0]==='service_writing_assignments').length,STUDENT_WORK_MAX_PAGES);
 assert.deepEqual(body.sources.writing,{status:'ok',complete:false},'Counts cannot be exact past the bound');
 assert.deepEqual(body.sources.material,{status:'unavailable'},'A non-advancing offset never loops');
});

test('merge orders newest first and keeps each source order for ties; task history keeps only cancelled rows',async()=>{
 const merged=mergeStudentWork({task:{status:'ok',rows:[{id:'a',sentAt:'2026-11-02T00:00:00Z'},{id:'b',sentAt:'2026-11-02T00:00:00Z'}]},writing:{status:'ok',rows:[{id:'c',assignedAt:'2026-11-03T00:00:00Z'}]},material:{status:'unavailable'}});
 assert.deepEqual(merged.map(i=>i.row.id),['c','a','b']);
 const handle=stub(async name=>page(name==='service_teacher_task_student_work'?[{id:'live',cancelled:false},{id:'gone',cancelled:true}]:[],false,50,versions[name]));
 assert.deepEqual((await (await post(handle,{action:'inbox',payload:{state:'history'}},liveToken)).json()).items.map(i=>i.row.id),['gone']);
 assert.deepEqual((await (await post(handle,inbox,liveToken)).json()).items.map(i=>i.row.id),['live']);
});
