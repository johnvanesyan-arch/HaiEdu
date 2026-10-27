import test from 'node:test';import assert from 'node:assert/strict';
import {database,call,prepared,published,materialCall,definition,id,context,addLearner} from './fixtures/resource-assignments-db.mjs';
const key=m=>({id:m.id,fingerprint:m.fingerprint});
test('class assignment captures recipients once, reaches My work, retries once and changes no learning evidence',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db);
 const evidence=(await db.query('select count(*) n from learning_sessions')).rows;
 const preview=await call(db,'preview',{materialId:m.id});assert.equal(preview.total,2);assert.equal(preview.roster.length,2);
 const payload=await prepared(db,m),first=await call(db,'assign',payload),again=await call(db,'assign',payload);
 assert.equal(again.assignment.id,first.assignment.id);assert.equal(again.replayed,true);assert.equal(first.assignment.recipientCount,2);
 assert.equal((await db.query('select count(*) n from resource_assignment_events')).rows[0].n,1);
 for(const actor of [10,12]){
  const inbox=await call(db,'inbox',{}, {actor});assert.equal(inbox.assignments.length,1);
  assert.equal(inbox.assignments[0].recipientCount,undefined);
  assert.equal((await call(db,'open',{id:first.assignment.id},{actor})).delivery.url,definition.url);
 }
 const receipt=await call(db,'get',{id:first.assignment.id});assert.equal(receipt.recipients.length,2);assert.equal(receipt.events.length,1);
 await addLearner(db,13);assert.equal((await call(db,'inbox',{}, {actor:13})).assignments.length,0);
 assert.equal((await call(db,'assign',payload)).assignment.recipientCount,2);
 assert.deepEqual((await db.query('select count(*) n from learning_sessions')).rows,evidence);
});
test('selected assignment excludes another eligible classmate while retaining the original class library audience',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db);
 const p=await prepared(db,m,{mode:'selected',enrollmentIds:[id(371)]});
 const {assignment:a}=await call(db,'assign',p);assert.equal(a.recipientCount,1);
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments.length,1);
 assert.equal((await call(db,'inbox',{}, {actor:12})).assignments.length,0);
 await assert.rejects(call(db,'get',{id:a.id},{actor:12}),/assignment_unavailable/);
 await assert.rejects(call(db,'open',{id:a.id},{actor:12}),/assignment_unavailable/);
 assert.equal((await materialCall(db,'list',{}, {actor:12,auth:9212,context:{...context(),enrollmentId:id(9112)}})).materials[0].id,m.id);
});
test('stale roster, arbitrary recipient, duplicate recipient, changed nonce payload and wrong material version are rejected',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db),p=await prepared(db,m);
 await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(9112)]);
 await assert.rejects(call(db,'assign',p),/assignment_preview_stale/);
 const fresh=await prepared(db,m);
 await assert.rejects(call(db,'assign',{...fresh,mode:'selected',enrollmentIds:[id(9112)]}),/assignment_recipients_invalid/);
 await assert.rejects(call(db,'assign',{...fresh,mode:'selected',enrollmentIds:[id(371),id(371)]}),/assignment_recipients_invalid/);
 const a=await call(db,'assign',fresh);
 await assert.rejects(call(db,'assign',{...fresh,instructions:'Different instruction'}),/assignment_conflict/);
 await assert.rejects(call(db,'assign',{...fresh,requestId:crypto.randomUUID(),fingerprint:'a'.repeat(64)}),/assignment_preview_stale/);
 assert.equal((await call(db,'list')).assignments.length,1);assert.ok(a.assignment.id);
});
test('a pinned version survives replacement but withdrawal revokes it permanently across later republishing',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db),a=(await call(db,'assign',await prepared(db,m))).assignment;
 const next=(await materialCall(db,'revise',{...key(m),definition:{...definition,url:'https://example.org/new'},reason:'New edition'})).material;
 await materialCall(db,'qa',key(next));await materialCall(db,'publish',key(next));
 assert.equal((await call(db,'open',{id:a.id},{actor:10})).delivery.url,definition.url);
 await materialCall(db,'withdraw',{...key(next),reason:'Remove logical material'});
 await assert.rejects(call(db,'open',{id:a.id},{actor:10}),/assignment_unavailable/);
 const v3=(await materialCall(db,'revise',{...key(next),definition,reason:'Reissue'})).material;
 await materialCall(db,'qa',key(v3));await materialCall(db,'publish',key(v3));
 await assert.rejects(call(db,'open',{id:a.id},{actor:10}),/assignment_unavailable/);
 const fresh=(await call(db,'assign',await prepared(db,v3))).assignment;
 assert.equal((await call(db,'open',{id:fresh.id},{actor:10})).delivery.url,definition.url);
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments.find(x=>x.id===a.id).available,false);
});
test('cancel is reasoned and idempotent, retains a receipt/history and blocks later opens',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db),a=(await call(db,'assign',await prepared(db,m))).assignment;
 await assert.rejects(call(db,'cancel',{id:a.id,revision:1,reason:''}),/assignment_reason_required/);
 await assert.rejects(call(db,'cancel',{id:a.id,revision:2,reason:'Changed lesson'}),/assignment_conflict/);
 const payload={id:a.id,revision:1,reason:'Changed lesson'};
 assert.equal((await call(db,'cancel',payload)).assignment.status,'canceled');
 assert.equal((await call(db,'cancel',payload)).assignment.revision,2);
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments.length,0);
 assert.equal((await call(db,'inbox',{state:'history'}, {actor:10})).assignments.length,1);
 await assert.rejects(call(db,'open',{id:a.id},{actor:10}),/assignment_unavailable/);
 assert.equal((await call(db,'list',{state:'history'})).assignments.length,1);
 const receipt=await call(db,'get',{id:a.id});assert.equal(receipt.events.length,2);assert.equal(receipt.recipients.length,2);
});
test('foreign school, teacher, unit, grant, role and revoked enrollment cannot acquire assignment access',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db),p=await prepared(db,m),a=(await call(db,'assign',p)).assignment;
 await assert.rejects(call(db,'preview',{materialId:m.id},{actor:21}),/written_context_unavailable/);
 await assert.rejects(call(db,'preview',{materialId:m.id},{index:1}),/assignment_unavailable/);
 await assert.rejects(call(db,'get',{id:a.id},{actor:10,index:2}),/assignment_unavailable/);
 await assert.rejects(call(db,'get',{id:a.id},{actor:11,index:2}),/assignment_unavailable/);
 await assert.rejects(call(db,'assign',p,{actor:10}),/assignment_forbidden/);
 await db.query("update institutional_class_enrollments set status='ended' where id=$1",[id(371)]);
 assert.equal((await call(db,'inbox',{}, {actor:10})).assignments.length,0);
 await assert.rejects(call(db,'open',{id:a.id},{actor:10}),/learning_context_unavailable/);
 await db.query("update teacher_subject_authorizations set status='ended' where id=$1",[id(361)]);
 await assert.rejects(call(db,'get',{id:a.id}),/written_context_unavailable/);
});
test('paged literal roster search keeps one fingerprint and account/enrollment deletion cannot expose others',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db);
 for(let n=100;n<153;n++)await addLearner(db,n);
 const p=await call(db,'preview',{materialId:m.id}),second=await call(db,'preview',{materialId:m.id,offset:50});
 assert.equal(p.total,55);assert.equal(p.roster.length,50);assert.equal(second.roster.length,5);assert.equal(second.rosterFingerprint,p.rosterFingerprint);
 const search=await call(db,'preview',{materialId:m.id,search:'learner 152'});assert.equal(search.roster.length,1);assert.equal(search.rosterFingerprint,p.rosterFingerprint);
 assert.equal((await call(db,'preview',{materialId:m.id,search:'%'})).matched,0);
 const a=(await call(db,'assign',await prepared(db,m))).assignment;
 await db.query('delete from institutional_class_enrollments where id=$1',[id(9112)]);
 assert.equal((await call(db,'get',{id:a.id})).recipients.length,54);assert.equal(a.recipientCount,55);
 const counts=(await db.query('select service_resource_assignment_privacy_counts($1) c',[id(10)])).rows[0].c;assert.equal(counts.materialAssignmentsReceived,1);
 const teacher=(await db.query('select service_resource_assignment_privacy_counts($1) c',[id(20)])).rows[0].c;assert.equal(teacher.materialAssignmentsSent,1);
});
test('ledger metadata and audit are immutable; client roles and direct service tables remain closed',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db),a=(await call(db,'assign',await prepared(db,m))).assignment;
 await assert.rejects(db.query('update resource_assignments set material_version_id=$1 where id=$2',[id(999),a.id]),/assignment_immutable/);
 await assert.rejects(db.query("update resource_assignment_events set detail='{}'"),/assignment_event_immutable/);
 await assert.rejects(db.query("update resource_assignment_recipients set student_id=$1",[id(11)]),/assignment_recipients_immutable/);
 for(const table of ['resource_assignments','resource_assignment_recipients','resource_assignment_events'])for(const role of ['anon','authenticated','service_role']){
  assert.equal((await db.query('select has_table_privilege($1,$2,$3) p',[role,table,'SELECT'])).rows[0].p,false);
 }
 for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_function_privilege($1,'public.service_resource_assignments(uuid,uuid,text,jsonb,jsonb)','EXECUTE') p",[role])).rows[0].p,false);
});
test('expired session, empty class and excessive recipients never create partial assignment receipts',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db),p=await prepared(db,m);
 await assert.rejects(call(db,'assign',{...p,mode:'selected',enrollmentIds:Array(501).fill(id(371))}),/assignment_request_invalid/);
 await db.query("update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=$1",[id(420)]);
 await assert.rejects(call(db,'assign',p),/resource_forbidden/);
 await db.query('update auth.sessions set not_after=null where id=$1',[id(420)]);
 await db.query("update institutional_class_enrollments set status='ended' where teacher_assignment_id=$1",[id(351)]);
 await assert.rejects(call(db,'assign',await prepared(db,m)),/assignment_recipients_invalid/);
 assert.equal((await db.query('select count(*) n from resource_assignments')).rows[0].n,0);
});
test('platform materials can be assigned through teacher authority without inheriting publisher authority',async t=>{
 const db=await database();t.after(()=>db.close());const m=await published(db,{actor:30});
 assert.deepEqual((await call(db,'catalog')).materials.map(x=>x.id),[m.id]);
 assert.equal((await call(db,'catalog',{}, {actor:21,index:2})).materials.length,0);
 const a=(await call(db,'assign',await prepared(db,m))).assignment;
 assert.equal(a.material.provider,'platform');assert.equal((await call(db,'open',{id:a.id},{actor:10})).delivery.url,definition.url);
 await assert.rejects(materialCall(db,'withdraw',{...key(m),reason:'Not my publication'}),/resource_unavailable/);
});
