import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fixture,id,context,token} from './fixtures/written-work-api.mjs';
import {compile} from './fixtures/learning-acceptance.mjs';
import {readBatchedTeacherDashboard,TeacherDashboardReadError} from '../supabase/functions/_shared/teacher-dashboard-batch.ts';
import {AcademicContextDenied} from '../supabase/functions/_shared/academic-context.ts';
import {verifyTeacherReadIdentity} from '../supabase/functions/_shared/teacher-read-identity.mjs';
import {isTeacherWorkspaceRequest} from '../supabase/functions/_shared/teacher-workspace-request.mjs';
let f,handle;const calls=[];
before(async()=>{
 f=await fixture();await f.db.exec('alter table classes add column if not exists teacher_id uuid,add column if not exists academic_year text');
 for(const suffix of ['20261028180038_teacher_today_workspace.sql','_teacher_dashboard_batched_reads.sql','_teacher_transaction_reads.sql']){
  const path=readdirSync('supabase/migrations').find(p=>p.endsWith(suffix));await f.db.exec(readFileSync('supabase/migrations/'+path,'utf8'));
 }
 for(const n of [0,1]){const body={context:context(n),payload:{taskId:id(1000+n)}};const opened=await(await f.request({action:'open',...body})).json();const submitted=await f.request({action:'submit',...body,payload:{...body.payload,expectedRevision:opened.work?.revision??0,text:Array(80).fill('synthetic').join(' ')}});assert.equal(submitted.status,200);}
 const original=f.admin.rpc;f.admin.rpc=async(name,args)=>{calls.push(name);return original(name,args);};
 compile(readFileSync('supabase/functions/get-teacher-dashboard/index.ts','utf8'),{
  createClient:()=>f.admin,verifyTeacherReadIdentity,isTeacherWorkspaceRequest,readBatchedTeacherDashboard,TeacherDashboardReadError,AcademicContextDenied,
  Deno:{env:{get:()=> 'https://fixture.invalid'},serve:fn=>handle=fn},
 },[]);
});
after(async()=>f?.db.close());
const read=(workspace={})=>{calls.length=0;return readBatchedTeacherDashboard(f.admin,id(20),token(20),{readMode:'directory',workspace});};
const request=(body,credential=token(20))=>handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+credential},body:JSON.stringify(body)}));
test('Home combines the same bounded directory and real nonzero Today projection in one read plus the final gate',async()=>{
 const combined=await read();assert.equal(combined.workspace.pendingCount,2);assert.equal(combined.workspace.queue.length,2);
 assert.deepEqual(calls,['service_teacher_dashboard_home','service_teacher_dashboard_actor']);assert.ok(combined.classes.every(c=>c.students===undefined));
 const {workspace,...directory}=combined;const separate=await readBatchedTeacherDashboard(f.admin,id(20),token(20),{readMode:'directory'});assert.deepEqual(directory,separate);
 const normal=await f.admin.rpc('service_teacher_workspace',{p_actor:id(20),p_auth:id(420),p_assignment:null,p_cursor:null,p_work:null,p_recent:[]});
 const clean=o=>{const {snapshotAt,...rest}=o;assert.ok(Date.parse(snapshotAt));return rest;};assert.deepEqual(clean(workspace),clean(normal.data));
 assert.ok(!JSON.stringify(combined).includes(Array(80).fill('synthetic').join(' ')));
});
test('an unavailable Today selector stays denied/unknown while the authorized class directory remains available',async()=>{
 const d=await read({workId:id(9999)});assert.equal(d.workspaceError,'workspace_context_unavailable');assert.equal(d.workspace,undefined);assert.ok(d.classes.length>0);
 const response=await request({readMode:'directory',workspace:{workId:id(9999)}});assert.equal(response.status,200);assert.equal((await response.json()).workspaceError,'workspace_context_unavailable');
});
test('Home validates nested requests before SQL and rejects forged or revoked sessions without returning the projection',async()=>{
 for(const workspace of [[],null,{actorId:id(21)},{recent:[id(1),id(2),id(3),id(4),id(5)]},{workId:'invalid'},{cursor:{id:id(1),submittedAt:'invalid'}}]){
  calls.length=0;assert.equal((await request({readMode:'directory',workspace})).status,400);assert.equal(calls.length,0);
 }
 assert.equal((await request({readMode:'directory',workspace:{}},'invalid')).status,401);
 assert.equal((await request({readMode:'directory',archive:true,workspace:{}})).status,400);
 const original=f.admin.rpc;await f.db.exec('begin');
 try{
  f.admin.rpc=async(name,args)=>{const r=await original(name,args);if(name==='service_teacher_dashboard_home')await f.db.exec(`delete from auth.sessions where id='${id(420)}'`);return r;};
  const r=await request({readMode:'directory',workspace:{}});assert.equal(r.status,403);assert.deepEqual(await r.json(),{error:'academic_context_unavailable'});
 }finally{f.admin.rpc=original;await f.db.exec('rollback');}
});
