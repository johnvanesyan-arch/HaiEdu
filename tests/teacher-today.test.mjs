import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database,id,scopes,call,context} from './fixtures/written-work-db.mjs';
let db,firstWork;
const migration='supabase/migrations/20261028180038_teacher_today_workspace.sql';
before(async()=>{
 db=await database();
 await db.exec(`alter table classes add column if not exists teacher_id uuid,add column if not exists academic_year text;`);
 await db.exec(readFileSync(migration,'utf8'));
 for(let i=0;i<16;i++){
  const foreign=i===15,idx=foreign?2:0,s=scopes[idx],work=id(4000+i),task=id(3000+i),sub=id(5000+i);
  await db.query(`insert into written_task_versions(id,task_key,version_no,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence)
   select $1,$2,1,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence from written_task_versions where id=$3`,[task,'paging-'+i,id(1000+idx)]);
  await db.query(`insert into written_work(id,task_version_id,student_id,enrollment_id,school_id,academic_year_id,class_id,subject_program_id,curriculum_release_id,unit_id,state)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft')`,[work,task,id(10),id(s.enrollment),id(foreign?302:301),id(foreign?312:311),id(foreign?322:321),id(s.programme),id(s.release),id(s.unit)]);
  await db.query(`insert into written_submissions(id,work_id,version_no,response_text,word_count,assistance_snapshot,submitted_at) values($1,$2,1,'Private response body',3,'{}',now()-interval '1 day'+$3*interval '1 minute')`,[sub,work,i]);
  await db.query(`update written_work set state='submitted',current_submission_id=$2,revision=1 where id=$1`,[work,sub]);
 }firstWork=id(4000);
});
after(async()=>db?.close());
let inside=false;
const read=async(args={})=>{
 const sp=db.fixtureTransaction||inside;if(sp)await db.exec('savepoint today_rpc');
 try{return(await db.query('select service_teacher_workspace($1,$2,$3,$4,$5,$6) value',[args.actor??id(20),args.auth??id(420),args.assignment??null,args.cursor?JSON.stringify(args.cursor):null,args.work??null,JSON.stringify(args.recent??[])])).rows[0].value;}
 catch(e){if(sp)await db.exec('rollback to today_rpc');throw e;}finally{if(sp)await db.exec('release savepoint today_rpc');}
};
async function changed(sql,fn){if(!db.fixtureTransaction)await db.exec('begin');await db.exec('savepoint today_change');inside=true;try{if(sql)await db.exec(sql);await fn();}finally{await db.exec('rollback to today_change');await db.exec('release savepoint today_change');if(!db.fixtureTransaction)await db.exec('rollback');inside=false;}}

test('Today gives complete scoped counts and oldest-first bounded metadata without learner responses',async()=>{
 const a=await read();assert.equal(a.pendingCount,15);assert.equal(a.queue.length,12);assert.equal(a.queue[0].id,firstWork);assert.equal(a.hasMore,true);assert.equal(a.classCount,1);assert.equal(a.cards[0].pendingCount,15);
 assert.ok(a.snapshotAt);assert.equal(a.coverage,'active_writable_school_contexts');assert.equal(a.queue[0].assignmentId,id(351));assert.ok(a.queue.every(x=>x.classId===id(321)));
 assert.equal(JSON.stringify(a).includes('Private response body'),false);assert.equal(a.queue[0].response_text,undefined);
 const b=await read({actor:id(21),auth:id(421)});assert.equal(b.pendingCount,1);assert.equal(b.cards[0].id,id(322));
});
test('keyset pages are disjoint and class filter counts describe the selected exact assignment',async()=>{
 const a=await read(),b=await read({cursor:a.nextCursor});assert.equal(b.queue.length,3);assert.equal(b.hasMore,false);assert.equal(b.pendingCount,15);assert.ok(!b.queue.some(x=>a.queue.some(y=>x.id===y.id)));
 const filtered=await read({assignment:id(351)});assert.equal(filtered.pendingCount,15);assert.equal(filtered.filterClass.className,'Դասարան '+id(321));
 await assert.rejects(()=>read({assignment:id(352)}),/workspace_context_unavailable/);
});
test('direct work selector derives its actual context and denies foreign or draft selectors',async()=>{
 const a=await read({work:firstWork});assert.equal(a.selectedWork.unitId,id(511));assert.equal(a.selectedWork.id,firstWork);
 await assert.rejects(()=>read({work:id(4015)}),/workspace_context_unavailable/);await assert.rejects(()=>read({work:id(99999)}),/workspace_context_unavailable/);
});
test('recent class hints are reauthorized and never return foreign class metadata',async()=>{
 const a=await read({recent:[id(322),id(321)]});assert.equal(a.cards.length,1);assert.equal(a.cards[0].recent,true);assert.equal(a.cards[0].id,id(321));
 assert.equal((await read({recent:[id(321),id(321)]})).cards.length,1);
 await assert.rejects(()=>read({recent:Array(5).fill(id(321))}),/workspace_request_invalid/);
});
for(const [name,sql] of [
 ['subject revoked',`update teacher_subject_authorizations set status='ended' where id='${id(361)}'`],
 ['membership ended',`update institutional_memberships set status='ended' where id='${id(341)}'`],
 ['class archived',`update classes set is_active=false where id='${id(321)}'`],
 ['release retired',`update curriculum_releases set status='retired' where id='${id(501)}'`],
 ['programme not current',`update subject_programs set effective_to=current_date-1 where id='${id(201)}'`],
])test(`${name} removes actionable work on refresh and denies a stale direct work link`,async()=>{
 await changed(sql,async()=>{assert.equal((await read()).pendingCount,0);await assert.rejects(()=>read({work:firstWork}),/workspace_context_unavailable/);});
});
for(const [name,sql] of [
 ['expired session',`update auth.sessions set not_after=now()-interval '1 minute' where id='${id(420)}'`],
 ['inactive profile',`update profiles set account_status='suspended' where id='${id(20)}'`],
 ['role changed',`update profiles set role='student' where id='${id(20)}'`],
])test(`${name} rejects the entire projection`,async()=>{await changed(sql,async()=>{await assert.rejects(()=>read(),/workspace_context_unavailable/);});});

test('one teacher can read separately authorized subjects/schools without losing exact filters',async()=>{
 await changed(`insert into institutional_memberships(id,school_id,person_id,role,status,valid_from) values('${id(801)}','${id(302)}','${id(20)}','teacher','active','2020-01-01');
 insert into teacher_subject_authorizations(id,school_id,teacher_membership_id,subject_id,status,valid_from) values('${id(802)}','${id(302)}','${id(801)}','${id(102)}','active','2020-01-01');
 insert into teacher_assignments(id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from) values('${id(803)}','${id(302)}','${id(312)}','${id(322)}','${id(801)}','${id(202)}','active','2020-01-01');`,async()=>{
 const a=await read({recent:[id(322)]});assert.equal(a.pendingCount,16);assert.equal(a.cards[0].id,id(322));assert.equal(a.cards[0].pendingCount,1);
 const b=await read({assignment:id(803)});assert.equal(b.pendingCount,1);assert.equal(b.queue[0].curriculumReleaseId,id(502));assert.equal(b.cards.find(c=>c.id===id(321)).pendingCount,15);
 });
});
test('actual writing review removes the item from Today without altering automatic learning evidence',async()=>{
 await changed('',async()=>{
 const snapshot=(await db.query('select count(*) n from learning_sessions')).rows[0].n;
 const inspected=await call(db,'inspect',{workId:firstWork});assert.equal(inspected.work.state,'submitted');
 await call(db,'review',{workId:firstWork,expectedRevision:inspected.work.revision,decision:'assessed',scores:{task:2,organisation:2,vocabulary:2,grammar:2},feedback:'Synthetic teacher workflow check.'});
 const a=await read({work:firstWork});assert.equal(a.pendingCount,14);assert.equal(a.selectedWork.state,'reviewed');assert.ok(!a.queue.some(x=>x.id===firstWork));
 assert.equal((await db.query('select count(*) n from learning_sessions')).rows[0].n,snapshot);
 });
});
test('neither client database role can execute the privileged metadata reader',async()=>{
 for(const role of ['anon','authenticated'])for(const schema of ['private','public'])assert.equal((await db.query(`select has_function_privilege($1,$2,'EXECUTE') value`,[role,`${schema}.service_teacher_workspace(uuid,uuid,uuid,jsonb,uuid,jsonb)`])).rows[0].value,false);
});
