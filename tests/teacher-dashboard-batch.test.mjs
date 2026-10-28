import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {acceptanceFixture,id,finishThroughAPI,selection as learnerSelection,compile} from './fixtures/learning-acceptance.mjs';
import {getInstitutionalTeacherDashboard} from '../supabase/functions/_shared/institutional-teacher-dashboard.ts';
import {readBatchedTeacherDashboard,TeacherDashboardReadError} from '../supabase/functions/_shared/teacher-dashboard-batch.ts';
import {AcademicContextDenied} from '../supabase/functions/_shared/academic-context.ts';
let f,token;const calls=[];
const selection={assignmentId:id(351),curriculumReleaseId:id(501),unitId:id(511)};
const request={readMode:'class',classId:id(321),selection};
before(async()=>{
 f=await acceptanceFixture();await f.db.exec(`
 alter table profiles add column display_name text;update profiles set display_name='Synthetic account';
 insert into auth.users(id) values('${id(20)}'),('${id(21)}');insert into auth.sessions(id,user_id) values('${id(420)}','${id(20)}'),('${id(421)}','${id(21)}');
 alter table classes add column teacher_id uuid,add column academic_year text;
 alter table units add column title_hy text,add column sequence_order integer,add column status text;
 alter table curriculum_releases add column activated_at timestamptz,add column created_at timestamptz;
 `);
 // Directory's latest definition is independent of the written-work fixture.
 const directory=readFileSync('supabase/migrations/20261028180038_teacher_today_workspace.sql','utf8').split('-- Queue')[0];
 await f.db.exec(directory.slice(0,directory.indexOf('create index if not exists written_work_pending_context_idx')));
 await f.db.exec(readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(p=>p.endsWith('_teacher_dashboard_batched_reads.sql')),'utf8'));
 const original=f.admin.rpc;f.admin.rpc=async(name,args)=>{calls.push(name);return original(name,args);};
 token=f.credential(id(20),id(420));
 for(const i of [0,1,2,3]){const s=await f.call('start-learning-session',{...learnerSelection(i),mode:'diagnostic'});assert.equal(s.status,200);await finishThroughAPI(f,s.body.session,true);}
});
after(async()=>f?.close());
const json=v=>JSON.parse(JSON.stringify(v),(_k,x)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d\d:\d\d)$/.test(x)?new Date(x).toISOString():x);
async function read(r=request,t=token,actor=id(20)){calls.length=0;return readBatchedTeacherDashboard(f.admin,actor,t,r);}
async function changed(sql,run){await f.db.exec('begin');try{await f.db.exec(sql);await run();}finally{await f.db.exec('rollback');}}
test('batched selected-class output equals existing analytics with completed evidence, frozen versions and exact contracts',async()=>{
 const expected=await getInstitutionalTeacherDashboard(f.admin,id(20),'Synthetic account',selection,id(321),id(351));
 const actual=await read();assert.deepEqual(json(actual),json(expected));assert.equal(actual.classes[0].students.length,1);assert.equal(actual.classes[0].students[0].matrix.length,2);
 assert.deepEqual(calls,['service_teacher_dashboard_rows','service_teacher_dashboard_evidence','service_teacher_dashboard_rows']);
});
test('unit switches and a different subject, school and grade preserve their own evidence and policy',async()=>{
 for(const [actor,session,assignment,klass,release,unit]of [[20,420,351,321,501,512],[21,421,352,322,502,513],[21,421,352,322,502,514]]){
  const sel={assignmentId:id(assignment),curriculumReleaseId:id(release),unitId:id(unit)};
  const expected=await getInstitutionalTeacherDashboard(f.admin,id(actor),'Synthetic account',sel,id(klass),id(assignment));
  const actual=await read({readMode:'class',classId:id(klass),selection:sel},f.credential(id(actor),id(session)),id(actor));
  assert.deepEqual(json(actual),json(expected));assert.equal(actual.classes[0].selectedUnit.unitId,id(unit));
 }
});
test('directory is scoped metadata, with live actor checks and no evidence reads',async()=>{
 const d=await read({readMode:'directory'});assert.equal(d.classes.length,1);assert.equal(d.classes[0].id,id(321));assert.equal(d.classes[0].students,undefined);assert.equal(JSON.stringify(d).includes('snapshot'),false);
 assert.deepEqual(calls,['service_teacher_dashboard_directory','service_teacher_dashboard_actor']);
});
test('arbitrary class, assignment and mixed release/unit combinations cannot return evidence',async()=>{
 for(const r of [{...request,classId:id(322)},{...request,selection:{...selection,assignmentId:id(352)}},{...request,selection:{...selection,curriculumReleaseId:id(502)}},{...request,selection:{...selection,unitId:id(513)}}])await assert.rejects(()=>read(r));
});
test('session, role, membership, grants and current roster changes fail closed',async()=>{
 for(const sql of [`delete from auth.sessions where id='${id(420)}'`,`update profiles set role='student' where id='${id(20)}'`,`update profiles set account_status='disabled' where id='${id(20)}'`,`update institutional_memberships set status='ended' where id='${id(341)}'`,`update teacher_subject_authorizations set status='ended' where id='${id(361)}'`])await changed(sql,async()=>assert.rejects(()=>read()));
 await changed(`update profiles set account_status='disabled' where id='${id(10)}'`,async()=>assert.equal((await read()).classes[0].students.length,0));
});
test('revocation after evidence and before final metadata prevents response disclosure',async()=>{
 const original=f.admin.rpc;
 for(const sql of [`delete from auth.sessions where id='${id(420)}'`,`update teacher_subject_authorizations set status='ended' where id='${id(361)}'`,`update institutional_memberships set status='ended' where id='${id(341)}'`])await changed('select 1',async()=>{
  f.admin.rpc=async(name,args)=>{const r=await original(name,args);if(name==='service_teacher_dashboard_evidence')await f.db.exec(sql);return r;};
  try{await assert.rejects(()=>read());}finally{f.admin.rpc=original;}
 });
 await changed('select 1',async()=>{f.admin.rpc=async(name,args)=>{const r=await original(name,args);if(name==='service_teacher_dashboard_evidence')await f.db.exec(`update institutional_class_enrollments set status='ended',valid_to=now() where id='${id(371)}'`);return r;};try{assert.equal((await read()).classes[0].students.length,0);}finally{f.admin.rpc=original;}});
});
test('service-only invoker functions add no browser execution or privileged definer',async()=>{
 const r=await f.db.query(`select proname,prosecdef,has_function_privilege('anon',oid,'execute') anon,has_function_privilege('authenticated',oid,'execute') authenticated,has_function_privilege('service_role',oid,'execute') service from pg_proc where proname like 'service_teacher_dashboard_%'`);
 assert.equal(r.rows.length,4);assert.ok(r.rows.every(x=>!x.prosecdef&&!x.anon&&!x.authenticated&&x.service));
});

test('real Edge handler uses the verified JWT actor, protects HTTP errors and marks reads no-store',async()=>{
 let handle;
 compile(readFileSync('supabase/functions/get-teacher-dashboard/index.ts','utf8'),{
  createClient:()=>f.admin,readBatchedTeacherDashboard,TeacherDashboardReadError,AcademicContextDenied,
  Deno:{env:{get:()=> 'synthetic'},serve:fn=>handle=fn},
 },[]);
 const call=(body,credential=token)=>handle(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+credential},body:JSON.stringify(body)}));
 const r=await call({...request,actorId:id(21)});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).teacher.id,id(20));
 const foreign=await call({...request,classId:id(322)});assert.equal(foreign.status,403);assert.deepEqual(await foreign.json(),{error:'academic_context_unavailable'});
 assert.equal((await call(request,'invalid')).status,401);
 await changed(`delete from auth.sessions where id='${id(420)}'`,async()=>assert.equal((await call(request)).status,403));
 const original=f.admin.rpc;f.admin.rpc=async()=>({error:{message:'internal database secret',code:'XX000'}});
 try{const failed=await call(request);assert.equal(failed.status,503);assert.ok(!JSON.stringify(await failed.json()).includes('secret'));}finally{f.admin.rpc=original;}
});
test('archive growth does not increase selected-class reads or load unrelated classrooms',async()=>{
 await changed(`insert into classes(id,school_id,academic_year_id,subject_id,grade_id,is_active,name)
 select ('72000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${id(301)}','${id(311)}','${id(101)}','${id(7)}',false,'Archive '||n from generate_series(1,100) n;
 insert into teacher_assignments(id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from)
 select ('73000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${id(301)}','${id(311)}',('72000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${id(341)}','${id(201)}','active','2020-01-01' from generate_series(1,100) n;`,async()=>{
  const d=await read();assert.equal(d.classes.length,1);assert.equal(calls.length,3);
  const raw=await f.admin.rpc('service_teacher_dashboard_rows',{p_actor:id(20),p_session:id(420),p_class:id(321),p_assignment:id(351)});assert.equal(raw.data.classes.length,1);assert.equal(raw.data.assignments.length,1);
 });
});
