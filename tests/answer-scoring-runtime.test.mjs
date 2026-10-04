import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
test('atomic scoring activation appends runtime provenance without rewriting model or historical session bindings',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create table runtime_builds(id uuid primary key default gen_random_uuid(),build_key text unique,source_commit text,implementation_manifest jsonb,notes text);
   create table learning_model_runtime_bindings(id uuid primary key default gen_random_uuid(),status text,runtime_build_id uuid,learning_model_configuration_id uuid,notes text,updated_at timestamptz);
   create table learning_model_configurations(id uuid primary key default gen_random_uuid(),configuration jsonb);
   create table learning_sessions(id uuid default gen_random_uuid(),runtime_build_id uuid);
   insert into runtime_builds(build_key,source_commit,implementation_manifest) values('fixture-old',repeat('a',40),'{"functions":{"submit-answer":16},"practicePrerequisite":{"fixture":"preserved"}}');
   insert into learning_model_configurations(configuration) values('{"mastery":{"secureAtOrAbove":0.72}}');
   insert into learning_model_runtime_bindings(status,runtime_build_id,learning_model_configuration_id) select 'active',r.id,m.id from runtime_builds r,learning_model_configurations m;
   insert into learning_sessions(runtime_build_id) select id from runtime_builds;`);
  const before=(await db.query('select runtime_build_id,learning_model_configuration_id from learning_model_runtime_bindings')).rows[0];
  const name=readdirSync('supabase/migrations').find(n=>n.endsWith('_atomic_answer_runtime_provenance.sql'));
  const sql=readFileSync('supabase/migrations/'+name,'utf8');await db.exec(sql);
  const after=(await db.query('select runtime_build_id,learning_model_configuration_id from learning_model_runtime_bindings')).rows[0];
  assert.notEqual(after.runtime_build_id,before.runtime_build_id);assert.equal(after.learning_model_configuration_id,before.learning_model_configuration_id);
  assert.equal((await db.query('select runtime_build_id from learning_sessions')).rows[0].runtime_build_id,before.runtime_build_id);
  const row=(await db.query('select implementation_manifest m from runtime_builds where id=$1',[after.runtime_build_id])).rows[0];
  assert.equal(row.m.functions['submit-answer'],17);assert.equal(row.m.learningParametersChanged,false);
  assert.deepEqual(row.m.practicePrerequisite,{fixture:'preserved'});
  await assert.rejects(db.exec(sql),/answer_runtime_changed_since_rollout_review/);
  assert.equal((await db.query('select count(*)::integer n from runtime_builds')).rows[0].n,2);
 }finally{await db.close();}
});
