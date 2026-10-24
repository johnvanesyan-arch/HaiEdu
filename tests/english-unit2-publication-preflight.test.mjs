import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const decision=JSON.parse(await readFile('docs/content/english-7-unit-02-release-decision.json','utf8'));
const guard=execFileSync('python3',['-c',"import importlib.util; s=importlib.util.spec_from_file_location('activation','scripts/releases/activate-english-7-unit-02.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(m.material_publication_guard())"],{encoding:'utf8'});
async function fixture(){
 const db=new PGlite();await db.exec(`create table unit_material_versions(id uuid primary key,material_key text,kind text,fingerprint text,version_no integer,subject_program_id uuid,curriculum_release_id uuid,unit_id uuid,status text,definition jsonb);
 create table written_task_versions(id uuid primary key,task_key text,version_no integer,subject_program_id uuid,curriculum_release_id uuid,unit_id uuid,status text,definition jsonb,review_evidence jsonb);`);
 const s=decision.scope;
 for(const m of decision.technicalObservation.materials)await db.query('insert into unit_material_versions values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[m.id,m.key,m.kind,m.fingerprint,m.version,s.subjectProgramId,s.curriculumReleaseId,s.unitId,'approved',{fixture:true}]);
 await db.exec("insert into written_task_versions select id,material_key,version_no,subject_program_id,curriculum_release_id,unit_id,'approved',definition,jsonb_build_object('fingerprint',fingerprint) from unit_material_versions where kind='writing'");
 return db;
}
const check=db=>db.exec(`do $guard$ begin ${guard} end $guard$;`);
test('publication preflight rejects unchanged fingerprints when a material is draft or retired',async()=>{
 const db=await fixture();try{
  await check(db);
  for(const status of ['draft','retired']){
   await db.query("update unit_material_versions set status=$1 where material_key='ENG7-U02-G01'",[status]);
   await assert.rejects(check(db),/accepted_material_publication_required/);
  }
  await db.exec("update unit_material_versions set status='approved'");await check(db);
  await db.exec("update unit_material_versions set fingerprint='changed' where kind='writing'");await assert.rejects(check(db),/accepted_material_publication_required/);
 }finally{await db.close();}
});
test('publication preflight requires the exact normal writing projection, not only a published material',async()=>{
 const db=await fixture();try{
  for(const sql of ["status='retired'","version_no=2","definition='{}'::jsonb","review_evidence='{}'::jsonb","task_key='another-task'","unit_id='11111111-1111-4111-8111-111111111111'"]){
   await db.exec('begin');await db.exec('update written_task_versions set '+sql);await assert.rejects(check(db),/accepted_writing_projection_required/);await db.exec('rollback');
  }
  await db.exec('delete from written_task_versions');await assert.rejects(check(db),/accepted_writing_projection_required/);
 }finally{await db.close();}
});
test('publication guard only reads approved material and writing metadata',async()=>{
 const db=await fixture();try{
  const before=await db.query('select to_jsonb(m) row from unit_material_versions m order by id');
  const written=await db.query('select to_jsonb(w) row from written_task_versions w');
  await check(db);await check(db);
  assert.deepEqual((await db.query('select to_jsonb(m) row from unit_material_versions m order by id')).rows,before.rows);
  assert.deepEqual((await db.query('select to_jsonb(w) row from written_task_versions w')).rows,written.rows);
 }finally{await db.close();}
});
