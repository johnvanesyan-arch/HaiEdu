import test from 'node:test';import assert from 'node:assert/strict';
import {database,call,definition,context,id} from './fixtures/supplementary-resources-db.mjs';
import {resourceUrl,validResourcePdf} from '../supabase/functions/_shared/supplementary-resources-handler.mjs';
const key=m=>({id:m.id,fingerprint:m.fingerprint});
test('teacher resource lifecycle preserves publication until exact QA revision and withdrawal; optional evidence unchanged',async t=>{
 const db=await database();t.after(()=>db.close());
 const before=(await db.query('select count(*) n from learning_sessions')).rows;
 const contexts=await call(db,'contexts');assert.ok(contexts.contexts.length>0);
 let {material:m}=await call(db,'create',{definition:{...definition,recommended:true}});
 assert.equal((await call(db,'list',{}, {actor:10})).materials.length,0);
 await assert.rejects(call(db,'publish',key(m)),/resource_qa_required/);
 ({material:m}=await call(db,'qa',key(m)));assert.equal(m.qa.passed,true);
 await call(db,'publish',key(m));await call(db,'publish',key(m));
 let visible=(await call(db,'list',{}, {actor:10})).materials;assert.equal(visible.length,1);assert.equal(visible[0].definition.recommended,true);assert.equal(visible[0].definition.sourceReference,undefined);assert.equal(visible[0].definition.url,undefined);
 const revised=await call(db,'revise',{...key(m),definition:{...definition,title:'Updated reading'},reason:'Clarify title'});
 assert.equal((await call(db,'list',{}, {actor:10})).materials[0].id,m.id);
 await assert.rejects(call(db,'qa',key(m)),/resource_conflict/);
 const v2=revised.material;await call(db,'qa',key(v2));await call(db,'publish',key(v2));
 await assert.rejects(call(db,'open',{id:m.id},{actor:10}),/resource_unavailable/);
 assert.equal((await call(db,'open',{id:v2.id},{actor:10})).delivery.url,definition.url);
 await call(db,'withdraw',{...key(v2),reason:'Replace classroom resource'});
 assert.equal((await call(db,'list',{}, {actor:10})).materials.length,0);
 await assert.rejects(call(db,'open',{id:v2.id},{actor:10}),/resource_unavailable/);
 const evidence=await call(db,'get',{id:v2.id});assert.equal(evidence.history.length,2);assert.equal(evidence.events.filter(e=>e.event==='published').length,2);
 assert.deepEqual((await db.query('select count(*) n from learning_sessions')).rows,before);
});
test('platform publishing retains MFA and teacher/student roles cannot inherit content permissions',async t=>{
 const db=await database();t.after(()=>db.close());
 const m=(await call(db,'create',{definition},{actor:30})).material;await call(db,'qa',key(m),{actor:30});
 await assert.rejects(call(db,'publish',key(m),{actor:30}),/resource_mfa_required/);
 await call(db,'publish',key(m),{actor:30,aal:'aal2'});
 assert.equal((await call(db,'list',{}, {actor:10})).materials[0].provider,'platform');
 await assert.rejects(call(db,'get',{id:m.id}),/resource_unavailable/);
 await assert.rejects(call(db,'create',{definition},{actor:10}),/resource_forbidden/);
 await assert.rejects(call(db,'create',{definition},{actor:30,context:context(0,true)}),/resource_forbidden/);
 await assert.rejects(call(db,'create',{definition:{...definition,recommended:true}},{actor:30}),/resource_definition_invalid/);
});
test('exact class, school, enrollment and current authority fence resource access',async t=>{
 const db=await database();t.after(()=>db.close());const m=(await call(db,'create',{definition})).material;
 await call(db,'qa',key(m));await call(db,'publish',key(m));
 await assert.rejects(call(db,'get',{id:m.id},{actor:21}),/written_context_unavailable/);
 await assert.rejects(call(db,'open',{id:m.id},{actor:10,index:2}),/resource_unavailable/);
 await assert.rejects(call(db,'open',{id:m.id},{actor:10,context:{...context(),enrollmentId:id(999)}}),/learning_context_unavailable/);
 await db.query("update teacher_assignments set status='ended' where id=$1",[id(351)]);
 await assert.rejects(call(db,'list',{}, {actor:10}),/learning_context_unavailable/);
 await assert.rejects(call(db,'get',{id:m.id}),/written_read_only/);
});
test('PDF attach is bounded and immutable; QA cannot pass without the file and withdrawal covers a pending revision',async t=>{
 const db=await database();t.after(()=>db.close());const d={...definition,format:'pdf'};delete d.url;
 let m=(await call(db,'create',{definition:d})).material;
 assert.equal((await call(db,'qa',key(m))).material.qa.passed,false);
 await assert.rejects(call(db,'attach',{...key(m),objectPath:'other.pdf',fileBytes:20,fileSha256:'a'.repeat(64)}),/resource_file_invalid/);
 m=(await call(db,'attach',{...key(m),objectPath:m.id+'/'+id(999)+'.pdf',fileBytes:20,fileSha256:'a'.repeat(64)})).material;
 await assert.rejects(call(db,'attach',{...key(m),objectPath:m.id+'/'+id(998)+'.pdf',fileBytes:20,fileSha256:'b'.repeat(64)}),/resource_conflict/);
 await call(db,'qa',key(m));await call(db,'publish',key(m));
 const draft=(await call(db,'revise',{...key(m),definition:d,reason:'Update PDF'})).material;
 await call(db,'withdraw',{...key(draft),reason:'Withdraw whole material'});
 assert.equal((await call(db,'list',{}, {actor:10})).materials.length,0);
 for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("select has_table_privilege($1,'supplementary_resource_versions','SELECT') p",[role])).rows[0].p,false);
});
test('resource URLs and PDF envelopes reject active/non-HTTPS and internal destinations',()=>{
 for(const url of ['javascript:alert(1)','http://example.org','https://127.0.0.1/a','https://2130706433','https://[::1]','https://user:pass@example.org','https://example.supabase.co/storage/v1/object/public/a','https://www.haiedu.am','https://host.local','https://example.org:444/a'])assert.equal(resourceUrl(url),false,url);
 assert.equal(resourceUrl('https://example.org/a?b=2'),true);
 assert.equal(validResourcePdf(new TextEncoder().encode('%PDF-1.7\nsynthetic\n%%EOF\n')),true);
 assert.equal(validResourcePdf(new TextEncoder().encode('<html>active</html>')),false);
 assert.equal(validResourcePdf(new TextEncoder().encode('%PDF-1.7\ntruncated')),false);
});

test('a second subject in the same school requires both the teacher assignment and subject grant',async t=>{
 const db=await database();t.after(()=>db.close());
 // Same-school second-subject assignment, deliberately without its subject grant.
 await db.query('update classes set school_id=$1,academic_year_id=$2 where id=$3',[id(301),id(311),id(322)]);
 await db.query('update teacher_assignments set school_id=$1,academic_year_id=$2,teacher_membership_id=$3 where id=$4',[id(301),id(311),id(341),id(352)]);
 const second=context(2,true);
 assert.equal((await call(db,'contexts')).contexts.some(c=>c.assignmentId===id(352)),false);
 await assert.rejects(call(db,'create',{definition},{context:second}),/written_context_unavailable/);
 await db.query("insert into teacher_subject_authorizations values($1,$2,$3,$4,'active','2020-01-01',null)",[id(363),id(301),id(341),id(102)]);
 assert.equal((await call(db,'contexts')).contexts.some(c=>c.assignmentId===id(352)),true);
 const m=(await call(db,'create',{definition},{context:second})).material;
 await db.query("update teacher_subject_authorizations set status='ended' where id=$1",[id(363)]);
 assert.equal((await call(db,'contexts')).contexts.some(c=>c.assignmentId===id(352)),false);
 await assert.rejects(call(db,'get',{id:m.id},{context:second}),/written_context_unavailable/);
});
