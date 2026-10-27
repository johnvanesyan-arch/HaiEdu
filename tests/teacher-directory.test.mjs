import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
let db;const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,role text,account_status text);
 create table institutional_memberships(id uuid primary key,person_id uuid,school_id uuid,role text,status text,valid_from timestamptz,valid_to timestamptz);
 create table subject_programs(id uuid primary key,subject_id uuid,grade_id uuid,status text);
 create table teacher_subject_authorizations(id uuid primary key,teacher_membership_id uuid,school_id uuid,subject_id uuid,status text,valid_from timestamptz,valid_to timestamptz);
 create table teacher_assignments(id uuid primary key,class_id uuid,teacher_membership_id uuid,school_id uuid,academic_year_id uuid,subject_program_id uuid,status text,valid_from timestamptz,valid_to timestamptz);
 create table classes(id uuid primary key,teacher_id uuid,academic_year text,name text,school_id uuid,academic_year_id uuid,subject_id uuid,grade_id uuid,is_active boolean);
 create table academic_years(id uuid primary key,school_id uuid,label text,starts_on date,ends_on date,status text);
 create table schools(id uuid primary key,name text);create table subjects(id uuid primary key,name_hy text,status text);create table grades(id uuid primary key,grade_number integer);
 insert into subjects values('${id(1)}','Առարկա','published');insert into grades values('${id(2)}',7);insert into subject_programs values('${id(3)}','${id(1)}','${id(2)}','published');
 `);
 for(const n of [10,20])await db.exec(`insert into profiles values('${id(n)}','teacher','active');insert into schools values('${id(n+1)}','School ${n}');insert into institutional_memberships values('${id(n+2)}','${id(n)}','${id(n+1)}','teacher','active',now()-interval '1 year',null);insert into teacher_subject_authorizations values('${id(n+3)}','${id(n+2)}','${id(n+1)}','${id(1)}','active',now()-interval '1 year',null);insert into academic_years values('${id(n+4)}','${id(n+1)}','2026–2027',current_date-100,current_date+100,'active');`);
 for(let n=0;n<105;n++){const t=n===104?20:10;await db.exec(`insert into classes(id,name,school_id,academic_year_id,subject_id,grade_id,is_active) values('${id(1000+n)}','Class ${String(n).padStart(3,'0')}','${id(t+1)}','${id(t+4)}','${id(1)}','${id(2)}',${n<3||n===104});insert into teacher_assignments values('${id(2000+n)}','${id(1000+n)}','${id(t+2)}','${id(t+1)}','${id(t+4)}','${id(3)}','active',now()-interval '10 days',null);`);}
 await db.exec(readFileSync('supabase/migrations/20261027175521_teacher_dashboard_directory.sql','utf8'));
});
after(async()=>db?.close());
async function read(actor=10,archive=false,offset=0,search=''){return(await db.query('select service_teacher_class_directory($1,$2,$3,$4) value',[id(actor),archive,offset,search])).rows[0].value;}
async function changed(sql,fn){await db.exec('begin');try{await db.exec(sql);await fn();}finally{await db.exec('rollback');}}
test('directory pages are bounded and disjoint, with actor-scoped exact counts',async()=>{
 const a=await read(),b=await read(20);assert.equal(a.classes.length,3);assert.equal(a.directory.archiveCount,101);assert.equal(b.classes.length,1);assert.equal(b.directory.archiveCount,0);assert.equal(a.classes[0].studentCount,null);assert.equal(a.classes[0].students,undefined);
 const first=await read(10,true),second=await read(10,true,24);assert.equal(first.classes.length,24);assert.equal(second.classes.length,24);assert.equal(first.directory.hasMore,true);assert.ok(!first.classes.some(a=>second.classes.some(b=>b.assignmentId===a.assignmentId)));assert.equal((await read(10,true,96)).classes.length,5);
});
test('archive search reaches beyond the first page and literal wildcards are not broad matches',async()=>{assert.equal((await read(10,true,0,'CLASS 103')).classes.length,1);assert.equal((await read(10,true,0,'%')).classes.length,0);});
test('closed years and ended assignments are history; restore changes current classification',async()=>{
 await changed(`update academic_years set status='closed' where id='${id(14)}'`,async()=>{assert.equal((await read()).classes.length,0);assert.equal((await read(10,true)).directory.archiveCount,104);});
 await changed(`update teacher_assignments set status='ended',valid_to=now() where id='${id(2000)}'`,async()=>assert.equal((await read()).classes.length,2));
 await changed(`update classes set is_active=true where id='${id(1003)}'`,async()=>assert.equal((await read()).classes.length,4));
});
test('revoked membership or subject grant cannot return cached class metadata',async()=>{
 for(const sql of [`update institutional_memberships set status='ended' where id='${id(12)}'`,`update teacher_subject_authorizations set status='ended' where id='${id(13)}'`,`update teacher_subject_authorizations set valid_to=now()-interval '1 second' where id='${id(13)}'`])await changed(sql,async()=>{assert.equal((await read()).classes.length,0);assert.equal((await read()).institutionalOptions.length,0);});
});
test('foreign-school and duplicate-grant combinations are excluded',async()=>{
 await changed(`update classes set school_id='${id(21)}' where id='${id(1000)}'`,async()=>assert.equal((await read()).classes.length,2));
 await changed(`insert into teacher_subject_authorizations select '${id(99)}',teacher_membership_id,school_id,subject_id,status,valid_from,valid_to from teacher_subject_authorizations where id='${id(13)}'`,async()=>assert.equal((await read()).classes.length,0));
});
test('inactive and wrong-role actors are rejected, with bounded inputs',async()=>{
 for(const sql of [`update profiles set account_status='disabled' where id='${id(10)}'`,`update profiles set role='student' where id='${id(10)}'`])await changed(sql,async()=>assert.rejects(read(),/teacher_role_required/));
 await assert.rejects(read(10,true,-1),/invalid_directory_request/);await assert.rejects(read(10,true,0,'x'.repeat(121)),/invalid_directory_request/);
});
test('directory RPC is service-only and does not elevate the invoker',async()=>{
 const rows=(await db.query("select r,has_function_privilege(r,'service_teacher_class_directory(uuid,boolean,integer,text)','execute') allowed from unnest(array['anon','authenticated','service_role']) r")).rows;
 assert.deepEqual(rows.map(r=>r.allowed),[false,false,true]);assert.equal((await db.query("select prosecdef from pg_proc where proname='service_teacher_class_directory'")).rows[0].prosecdef,false);
});
test('selected-class service reads only its scoped class despite a large archive',async()=>{
 const {sqlAdmin}=await import('./fixtures/learning-acceptance.mjs');
 const {getInstitutionalTeacherDashboard}=await import('../supabase/functions/_shared/institutional-teacher-dashboard.ts');
 await db.exec(`alter table subjects add column code text;alter table grades add column label_hy text;
 create table institutional_class_enrollments(id uuid,school_id uuid,academic_year_id uuid,class_id uuid,student_id uuid,student_membership_id uuid,teacher_assignment_id uuid,subject_program_id uuid,status text,valid_from timestamptz,valid_to timestamptz);
 create table curriculum_releases(id uuid,subject_program_id uuid,status text,release_number integer,effective_from date,effective_to date,activated_at timestamptz,created_at timestamptz);
 create table units(id uuid,subject_program_id uuid,code text,title_hy text,sequence_order integer,status text);
 create table curriculum_release_units(curriculum_release_id uuid,unit_id uuid,unit_code_snapshot text,title_hy_snapshot text,sequence_order_snapshot integer);`);
 const queries=[];const adapter={query:async(sql,params)=>{const result=await db.query(sql,params);queries.push({sql,rows:result.rows.length});return result;}};
 const data=await getInstitutionalTeacherDashboard(sqlAdmin(adapter),id(10),'Teacher',null,id(1000));
 assert.equal(data.classes.length,1);assert.equal(data.classes[0].id,id(1000));assert.ok(queries.filter(q=>q.sql.startsWith('select')&&q.sql.includes(' from classes')).every(q=>q.rows===1));assert.ok(!queries.some(q=>/from (attempts|learning_sessions|item_versions)/.test(q.sql)));
 await assert.rejects(getInstitutionalTeacherDashboard(sqlAdmin(db),id(20),'Other',null,id(1000)),/academic_context_unavailable/);
});
test('schoolless teachers receive bounded owner-only metadata without institutional fallback',async()=>{
 await db.exec(`insert into profiles values('${id(30)}','teacher','active');insert into classes(id,teacher_id,academic_year,name,school_id,is_active) values('${id(3000)}','${id(30)}','2026–2027','Legacy',null,true);`);
 const result=await read(30);assert.equal(result.classes.length,1);assert.equal(result.classes[0].id,id(3000));assert.equal(result.institutionalOptions.length,0);assert.equal((await read(10)).classes.some(c=>c.id===id(3000)),false);
 await changed(`insert into institutional_memberships values('${id(32)}','${id(30)}','${id(11)}','teacher','ended',now()-interval '1 year',now()-interval '1 day')`,async()=>assert.equal((await read(30)).classes.length,0));
});
