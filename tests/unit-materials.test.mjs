import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture,id} from './fixtures/unit-materials-api.mjs';
const saved=m=>({id:m.id,fingerprint:m.fingerprint});
test('real material SQL and Edge isolate roles, sessions and MFA; service cannot read tables directly',async t=>{
 const f=await fixture();t.after(()=>f.db.close());assert.equal((await f.call('list')).materials.length,6);
 for(const actor of [10,20])await assert.rejects(f.call('list',{}, {actor}),/material_forbidden/);
 await assert.rejects(f.call('list',{}, {session:401}),/account_or_session_inactive/);
 await assert.rejects(f.call('list',{actor_id:id(30)}),/material_request_invalid/);
 await assert.rejects(f.call('list',{}, {token:'unverified'}),/unauthorized/);
 let {material:m}=await f.call('get',{id:id(2000)});m=(await f.call('qa',saved(m))).material;
 await assert.rejects(f.call('approve',saved(m),{aal:'aal1'}),/material_mfa_required/);
 await f.db.exec('begin;savepoint privilege_check;set local role service_role');
 try{await assert.rejects(f.db.query('select * from public.unit_material_versions'),/permission denied/);}finally{await f.db.exec('rollback');}
 await f.db.query('update auth.sessions set not_after=clock_timestamp()-interval \'1 second\' where id=$1',[id(430)]);
 await assert.rejects(f.call('approve',saved(m)),/account_or_session_inactive/);
});
test('QA is bound to immutable content; revisions reject stale saves and require fresh review',async t=>{
 const f=await fixture();t.after(()=>f.db.close());let {material:m}=await f.call('get',{id:id(2000)});
 await assert.rejects(f.call('approve',saved(m)),/material_qa_required/);
 m=(await f.call('qa',saved(m))).material;assert.equal(m.qa.passed,true);
 const approved=(await f.call('approve',saved(m))).material;assert.equal(approved.status,'approved');
 await f.call('approve',saved(m));assert.equal((await f.db.query("select count(*)::int n from unit_material_events where event='approved'")).rows[0].n,1);
 const payload={...saved(approved),definition:{...approved.definition,text:'Revised teaching explanation'},reviewPackage:approved.review_package,reason:'Improve clarity'};
 const next=(await f.call('revise',payload)).material;assert.equal(next.version_no,2);assert.equal(next.status,'draft');assert.deepEqual(next.qa,{});
 await assert.rejects(f.call('revise',payload),/material_conflict/);await assert.rejects(f.call('approve',saved(approved)),/material_conflict/);
 assert.equal((await f.call('get',{id:approved.id})).material.definition.text,'A teaching explanation.');
 await assert.rejects(f.call('approve',saved(next)),/material_qa_required/);await f.call('qa',saved(next));await f.call('approve',saved(next));
 assert.equal((await f.call('get',{id:approved.id})).material.status,'retired');
 const counts=(await f.db.query('select service_unit_material_privacy_counts($1) c',[id(30)])).rows[0].c;
 assert.equal(counts.materialVersions,1);assert.equal(counts.materialReviews,2);assert.ok(counts.materialEvents>=5);
});
test('two programmes and three units retain scope; malformed definitions save as drafts but cannot pass QA',async t=>{
 const f=await fixture();t.after(()=>f.db.close());let {material:m}=await f.call('get',{id:id(2004)});
 await assert.rejects(f.call('revise',{...saved(m),definition:{...m.definition,outcomes:['SYN-521']},reviewPackage:m.review_package,reason:'Wrong scope'}),/material_scope_invalid/);
 const r=await f.call('revise',{...saved(m),definition:{...m.definition,text:''},reviewPackage:m.review_package,reason:'Incomplete draft'});m=r.material;
 assert.equal(m.unit_id,id(513));assert.equal(m.subject_program_id,id(202));
 const qa=await f.call('qa',saved(m));assert.equal(qa.material.qa.passed,false);assert.ok(qa.material.qa.issues.includes('guide_definition'));
 await assert.rejects(f.call('approve',saved(m)),/material_qa_required/);
 assert.equal((await f.call('get',{id:id(2000)})).material.version_no,1);
});
test('writing approval atomically uses existing runtime validation and keeps models outside learner definition',async t=>{
 const f=await fixture();t.after(()=>f.db.close());let {material:m}=await f.call('get',{id:id(2001)});assert.equal((await f.db.query('select count(*)::int n from written_task_versions where id=$1',[m.id])).rows[0].n,0);
 await f.call('qa',saved(m));await f.call('approve',saved(m));
 let task=(await f.db.query('select * from written_task_versions where id=$1',[m.id])).rows[0];assert.equal(task.status,'approved');assert.equal(task.reviewed_by,id(30));assert.deepEqual(task.definition,m.definition);assert.ok(!JSON.stringify(task.definition).includes('PRIVATE PRACTICE MODEL'));
 m=(await f.call('revise',{...saved(m),definition:{...m.definition,prompt:'Revised task for the same outcomes.'},reviewPackage:m.review_package,reason:'Clarify task'})).material;
 await f.call('qa',saved(m));await f.call('approve',saved(m));assert.equal((await f.db.query('select status from written_task_versions where id=$1',[id(2001)])).rows[0].status,'retired');
 await f.call('retire',{...saved(m),reason:'Withdraw current task'});assert.equal((await f.db.query('select status from written_task_versions where id=$1',[m.id])).rows[0].status,'retired');
 assert.equal((await f.db.query("select count(*)::int n from written_task_versions where task_key='fixture-task' and status='approved'")).rows[0].n,3);
});
test('rubric and word-range QA reject malformed values without leaking server errors',async t=>{
 const f=await fixture();t.after(()=>f.db.close());let {material:m}=await f.call('get',{id:id(2001)});
 for(const change of [{maxWords:0},{criteria:null},{criteria:[{key:'Bad',label:'',descriptors:5}]},{criteria:[]},{minWords:5000,maxWords:5001}]){
  m=(await f.call('revise',{...saved(m),definition:{...m.definition,...change},reviewPackage:m.review_package,reason:'Synthetic invalid revision'})).material;
  assert.equal((await f.call('qa',saved(m))).material.qa.passed,false);await assert.rejects(f.call('approve',saved(m)),/material_qa_required/);
 }
});
test('English material onboarding preserves historical source, teaching order and exact writing definition',()=>{
 const source=readFileSync('docs/content/english-7-unit-01-draft.json');const original=JSON.parse(source);const packet=JSON.parse(readFileSync('docs/content/english-7-unit-01-materials.json'));
 assert.equal(createHash('sha256').update(source).digest('hex'),packet.source.sha256);assert.equal(packet.materials.length,10);
 const guides=packet.materials.filter(x=>x.kind==='guide');assert.equal(guides.length,9);
 for(const [i,g]of guides.entries()){assert.equal(g.sequenceOrder,original.guides[i].beforeActivity);for(const key of ['title','text','workedExample','locale'])assert.equal(g.definition[key],original.guides[i][key]);assert.ok(g.definition.source.pages.length);assert.ok(g.definition.outcomes.length);}
 const w=packet.materials.find(x=>x.kind==='writing');assert.deepEqual(w.definition,original.writing.definition);assert.deepEqual(w.reviewPackage.model,original.writing.model);assert.deepEqual(w.reviewPackage.workloadProposal,original.writing.workloadProposal);
});
test('all ten exact onboarding definitions pass real structural QA without approving or publishing a task',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const p=JSON.parse(readFileSync('docs/content/english-7-unit-01-materials.json'));
 const codes=[...new Set(p.materials.flatMap(m=>m.definition.outcomes))];
 for(const [i,code]of codes.entries()){await f.db.query('insert into skills(id,code) values($1,$2)',[id(3000+i),code]);await f.db.query('insert into curriculum_release_skills(curriculum_release_id,skill_id,skill_code_snapshot) values($1,$2,$3)',[id(501),id(3000+i),code]);}
 for(const m of p.materials){await f.db.query('insert into unit_material_versions(id,subject_program_id,curriculum_release_id,unit_id,material_key,kind,version_no,sequence_order,definition,review_package,fingerprint) values($1,$2,$3,$4,$5,$6,1,$7,$8,$9,\'\')',[m.id,id(201),id(501),id(511),m.materialKey,m.kind,m.sequenceOrder,JSON.stringify(m.definition),JSON.stringify(m.reviewPackage)]);const savedMaterial=(await f.call('get',{id:m.id})).material;assert.equal((await f.call('qa',saved(savedMaterial))).material.qa.passed,true,m.materialKey);}
 assert.equal((await f.db.query("select count(*)::int n from unit_material_versions where status='approved'")).rows[0].n,0);assert.equal((await f.db.query("select count(*)::int n from written_task_versions where task_key like 'ENG7-%'")).rows[0].n,0);
});
