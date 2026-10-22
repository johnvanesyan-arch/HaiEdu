import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,id,scopes,selection,launch,finish,readiness} from './fixtures/unit-guides-api.mjs';

test('learner guide delivery uses real SQL, verified-session Edge routing and approved capability data',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const db=f.db;
 const run=async(name,fn)=>t.test(name,async()=>{await db.exec('begin');db.fixtureTransaction=true;try{await fn();}finally{db.fixtureTransaction=false;await db.exec('rollback');}});
 const baseline=async(i=0)=>{const s=await launch(db,i);await finish(db,s.session.id);};
 await run('guide content stays unavailable before baseline and while an assessment is active',async()=>{
  await f.approve(id(2000));let r=await f.guides();assert.equal(r.availability,'diagnostic_required');assert.deepEqual(r.guides,[]);
  const d=await launch(db);r=await f.guides();assert.equal(r.availability,'assessment_active');assert.deepEqual(r.guides,[]);
  await finish(db,d.session.id);r=await f.guides();assert.equal(r.guides.length,1);
  await readiness(db);await launch(db,0,'mastery_check');r=await f.guides();assert.equal(r.availability,'assessment_active');assert.deepEqual(r.guides,[]);
 });
 await run('ordered approved guide projection excludes writing, source packages and arbitrary private keys',async()=>{
  await baseline();await f.approve(id(2000));await f.approve(id(2001));
  const first=(await f.call('get',{id:id(2000)})).material;
  await db.query("insert into unit_material_versions(id,subject_program_id,curriculum_release_id,unit_id,material_key,kind,version_no,sequence_order,definition,review_package,fingerprint) values($1,$2,$3,$4,'earlier-guide','guide',1,0+1,$5,$6,'')",[id(2090),id(201),id(501),id(511),JSON.stringify({...first.definition,title:'Earlier alphabetically',privateAnswer:'NEVER SEND'}),JSON.stringify(first.review_package)]);
  await f.approve(id(2090));const r=await f.guides();assert.equal(r.readOnly,true);assert.equal(r.guides.length,2);
  assert.deepEqual(r.guides.map(g=>g.id),[id(2090),id(2000)]);
  assert.deepEqual(Object.keys(r.guides[0]).sort(),['id','version','sequenceOrder','schemaVersion','title','text','workedExample','locale'].sort());
  assert.doesNotMatch(JSON.stringify(r),/NEVER SEND|PRIVATE PRACTICE MODEL|fixture-source|review_package|reviewed_by|sourceReference|comparisonReference/);
  assert.equal(r.guides[0].locale,'en');
 });
 await run('draft successor preserves approved version; replacement and retirement are reflected without leaking drafts',async()=>{
  await baseline();const m=await f.approve(id(2000));
  const v=(await f.call('revise',{id:m.id,fingerprint:m.fingerprint,definition:{...m.definition,text:'REVISED GUIDE'},reviewPackage:m.review_package,reason:'Synthetic correction'})).material;
  assert.equal((await f.guides()).guides[0].version,1);assert.doesNotMatch(JSON.stringify(await f.guides()),/REVISED GUIDE/);
  await f.approve(v.id);assert.equal((await f.guides()).guides[0].version,2);
  await f.call('retire',{id:v.id,fingerprint:v.fingerprint,reason:'Synthetic withdrawal'});assert.deepEqual((await f.guides()).guides,[]);
 });
 await run('two programmes and three units preserve exact context, language and independent baseline',async()=>{
  for(let i=0;i<scopes.length;i++)await f.approve(id(2000+i*2));
  await baseline();assert.equal((await f.guides()).guides[0].title,'Synthetic guide 0');
  assert.equal((await f.guides(1)).availability,'diagnostic_required');assert.equal((await f.guides(2)).availability,'diagnostic_required');
  await baseline(2);assert.equal((await f.guides(2)).guides[0].locale,'hy');
  await readiness(db);await launch(db,0,'mastery_check');assert.equal((await f.guides(2)).guides.length,1);
  for(const body of [{...selection(),enrollmentId:id(372)},{...selection(),curriculumReleaseId:id(502)},{...selection(),unitId:id(513)}]){
   const r=await f.request(body);assert.equal(r.status,403);assert.equal((await r.json()).error,'learning_context_unavailable');
  }
 });
 await run('inactive releases and revoked enrollment/teacher authority deny the new endpoint',async()=>{
  for(const [table,key] of [['curriculum_releases',501],['institutional_class_enrollments',371],['teacher_assignments',351],['teacher_subject_authorizations',361]]){
   await db.exec('savepoint deny');await db.query(`update ${table} set status=$2 where id=$1`,[id(key),table==='curriculum_releases'?'draft':'revoked']);
   assert.equal((await f.request()).status,403);await db.exec('rollback to deny');await db.exec('release deny');
  }
 });
 await run('reads create no assessment, content, exposure, review or learning evidence',async()=>{
  await baseline();await f.approve(id(2000));
  const tables=['unit_material_versions','unit_material_events','written_task_versions','learning_sessions','learning_session_items','attempts','student_item_exposure_events','chapter_mastery_states'];
  const snapshot=async()=>Promise.all(tables.map(async table=>(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') snapshot from ${table} t`)).rows[0].snapshot));
  const before=await snapshot();await f.guides();await f.guides();assert.deepEqual(await snapshot(),before);
 });
 await run('request boundaries reject asserted identities, invalid contexts and unverifiable sessions',async()=>{
  for(const body of [null,[],{},'invalid',{...selection(),studentId:id(30)},{...selection(),aal:'aal2'}])assert.equal((await f.request(body)).status,400);
  assert.equal((await f.request(selection(),{raw:'x'.repeat(2049)})).status,400);
  assert.equal((await f.request(selection(),{method:'GET'})).status,405);
  assert.equal((await f.request(selection(),{headers:{}})).status,401);
  assert.equal((await f.request(selection(),{token:'invalid'})).status,401);
  assert.equal((await f.request(selection(),{actor:20})).status,403);
  assert.equal((await f.request(selection(),{auth:999})).status,403);
  const r=await f.request();assert.equal(r.headers.get('Cache-Control'),'no-store');
 });
 await run('client roles retain no direct access to private materials or either privileged guide function',async()=>{
  for(const role of ['anon','authenticated']){
   for(const fn of ['private.student_unit_guides(uuid,uuid,uuid,uuid,uuid)','service_student_unit_guides(uuid,uuid,uuid,uuid,uuid)'])assert.equal((await db.query('select has_function_privilege($1,$2,\'execute\') allowed',[role,fn])).rows[0].allowed,false);
   assert.equal((await db.query("select has_table_privilege($1,'unit_material_versions','select') allowed",[role])).rows[0].allowed,false);
  }
 });
});
