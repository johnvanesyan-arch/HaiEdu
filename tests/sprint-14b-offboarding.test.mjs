import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const fixture=readFileSync('tests/fixtures/sprint-14b-offboarding.sql','utf8');
const migration=readFileSync('supabase/migrations/20260927193107_sprint_14b_teacher_offboarding_closure.sql','utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const call=`select public.service_offboard_school_teacher_14b($1,$2,$3,$4,'administrative',$5) as result`;
let db;
const run=async(sql,args=[]) => (await db.query(sql,args)).rows;
const preview=async(actor=11,school=1) => (await run(call,[id(actor),id(school),id(23),'preview',null]))[0].result;
const offboard=async(rev) => (await run(call,[id(11),id(1),id(23),'offboard',rev]))[0].result;
const rejects=async(fn,pattern)=>{await db.exec('savepoint denied');await assert.rejects(fn,pattern);await db.exec('rollback to savepoint denied');};
const status=async(table,n)=>(await run(`select status from ${table} where id=$1`,[id(n)]))[0].status;

test('offboarding and administrator closure execute the actual migration',async t=>{
 db=new PGlite(); await db.exec(fixture); await db.exec(migration);
 async function isolated(name,fn){await t.test(name,async()=>{await db.exec('begin');try{await fn();}finally{await db.exec('rollback');}});}
 await isolated('preview is read-only, exact-school authorized, and service-only',async()=>{
  const p=await preview();assert.equal(p.activeAssignments,1);assert.equal(p.activeSubjectGrants,1);assert.equal(p.unusedInvitations,1);assert.equal(p.unusedJoinCodes,1);
  assert.equal(await status('institutional_memberships',23),'active');
  for(const [actor,school] of [[12,1],[11,2],[13,1],[14,1]]) await rejects(()=>preview(actor,school),/school_teacher_unavailable/);
  assert.equal((await run("select has_function_privilege('authenticated','public.service_offboard_school_teacher_14b(uuid,uuid,uuid,text,text,text)','execute') as allowed"))[0].allowed,false);
  assert.equal((await run("select has_function_privilege('service_role','public.service_offboard_school_teacher_14b(uuid,uuid,uuid,text,text,text)','execute') as allowed"))[0].allowed,true);
 });
 for(const archived of [false,true]) await isolated(`complete cleanup preserves other school and accepted learning (${archived?'archived':'active'})`,async()=>{
  // Accept one invitation, then create another unused one to verify both paths.
  await run('select service_redeem_institutional_invitation_14b($1,repeat(\'a\',64))',[id(14)]);
  await run("select service_issue_institutional_invitation_14b($1,$2,$3,'student',$4,$5,repeat('c',64),now()+interval '1 day')",[id(13),id(15),id(1),id(35),id(41)]);
  if(archived)await run("update institutional_memberships set status='archived' where id=$1",[id(23)]);
  const p=await preview();assert.equal(p.unusedInvitations,1);
  assert.equal((await offboard(p.revision)).ended,true);
  assert.equal(await status('institutional_memberships',23),'ended');assert.equal(await status('institutional_memberships',24),'active');assert.equal(await status('teacher_assignments',41),'ended');
  assert.equal((await run('select status from teacher_subject_authorizations'))[0].status,'revoked');
  assert.equal((await run("select count(*)::int n from institutional_invitations where revoked_at is not null"))[0].n,1);
  assert.equal((await run("select revoked_at is null as untouched from institutional_invitations where used_at is not null"))[0].untouched,true);
  assert.equal((await run('select count(*)::int n from institutional_join_codes where revoked_at is not null'))[0].n,1);
  assert.equal((await run("select count(*)::int n from institutional_class_enrollments where status='active'"))[0].n,1);
  assert.equal((await run('select count(*)::int n from classes'))[0].n,1);assert.equal((await run('select answer from test_learning_evidence'))[0].answer,'preserved');
  assert.equal((await run("select actor_id from academic_identity_events where operation='OFFBOARD'"))[0].actor_id,id(11));
  assert.equal((await run('select account_status from profiles where id=$1',[id(13)]))[0].account_status,'active');
  await rejects(()=>run("select service_redeem_institutional_invitation_14b($1,repeat('c',64))",[id(15)]),/invitation_unavailable/);
 });
 await isolated('stale preview causes no partial cleanup',async()=>{
  const p=await preview();await run('update institutional_join_codes set used_at=now()');
  await rejects(()=>offboard(p.revision),/teacher_offboarding_preview_changed/);
  assert.equal(await status('institutional_memberships',23),'active');assert.equal(await status('teacher_assignments',41),'active');
  assert.equal((await run('select revoked_at from institutional_invitations'))[0].revoked_at,null);
 });
 await isolated('existing termination RPC cannot bypass teacher cleanup',async()=>{
  assert.equal((await run("select service_end_institutional_membership_14b($1,$2,'transfer') as ended",[id(11),id(23)]))[0].ended,true);
  assert.equal((await run('select revoked_at is not null as revoked from institutional_join_codes'))[0].revoked,true);
 });
 // Each rejected SQL statement gets its own transaction: PostgreSQL aborts after an error.
 for(const change of ["status='ended'","status='archived'","status='revoked'","valid_to=now()","valid_from=now()+interval '1 day'","role='teacher'","school_id='"+id(2)+"'","person_id='"+id(12)+"'"])
  await isolated(`last administrator membership rejects ${change}`,async()=>await rejects(()=>run(`update institutional_memberships set ${change} where id=$1`,[id(21)]),/last_active_school_admin_protected/));
 for(const sql of ['delete from institutional_memberships where id=$1',"update profiles set account_status='suspended' where id=$1","update profiles set role='teacher' where id=$1",'delete from profiles where id=$1'])
  await isolated(`last administrator rejects ${sql}`,async()=>await rejects(()=>run(sql,[id(sql.includes('memberships')?21:11)]),/last_active_school_admin_protected/));
 for(const condition of ["p.account_status='suspended'","p.role='teacher'","m.valid_from=now()+interval '1 day'","m.valid_to=now()-interval '1 hour'","m.status='archived'"])
  await isolated(`ineffective successor does not count: ${condition}`,async()=>{
   await run('insert into institutional_memberships(school_id,person_id,role) values($1,$2,\'school_admin\')',[id(1),id(15)]);
   await run("update profiles set role='school_admin' where id=$1",[id(15)]);
   const [alias,rest]=condition.split('.');await run(`update ${alias==='p'?'profiles':'institutional_memberships'} set ${rest} where ${alias==='p'?'id':'person_id'}=$1`,[id(15)]);
   await rejects(()=>run("update profiles set account_status='suspended' where id=$1",[id(11)]),/last_active_school_admin_protected/);
  });
 await isolated('effective same-school successor allows closure',async()=>{
  await run("insert into institutional_memberships(school_id,person_id,role) values($1,$2,'school_admin')",[id(1),id(12)]);
  await run("update profiles set account_status='suspended' where id=$1",[id(11)]);
  assert.equal((await run('select account_status from profiles where id=$1',[id(11)]))[0].account_status,'suspended');
 });
 await db.close();
});
