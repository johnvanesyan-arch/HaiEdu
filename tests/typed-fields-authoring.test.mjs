import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {postgresClient} from './fixtures/learning-acceptance.mjs';
import {definition,key,typedMigration} from './fixtures/typed-fields-db.mjs';
test('typed content revisions protect accepted answers, retain snapshots and require fresh review',async()=>{
 const db=process.env.PHASE3_POSTGRES_17_CI==='1'?await postgresClient():new PGlite();
 try{
  if(db.waitReady)await db.waitReady;
  for(const p of ['tests/fixtures/sprint-15a-remediation-authoring.sql','tests/fixtures/phase3-questions.sql'])await db.exec(readFileSync(p,'utf8'));
  const sql=readFileSync(typedMigration,'utf8');
  for(const name of ['private.normalize_typed_text','private.validate_typed_definition','private.validate_typed_key','public.service_save_item_content_revision']){
   const match=sql.match(new RegExp('create (?:or replace )?function '+name.replaceAll('.','\\.')+'\\([\\s\\S]*?\\n\\$\\$;'));assert.ok(match,name);await db.exec(match[0]);
  }
  const item=(await db.query('select id from items order by id limit 1')).rows[0].id;
  const actor=(await db.query("select id from profiles where role='content_admin' limit 1")).rows[0].id;
  await db.query("update items set item_type='typed_fields',variant_seed=null,config=jsonb_build_object('responseDefinition',$2::jsonb) where id=$1",[item,JSON.stringify(definition)]);
  await db.query('update item_answer_keys set answer=$2 where item_id=$1',[item,JSON.stringify(key)]);
  const old=(await db.query('select version_no from items where id=$1',[item])).rows[0].version_no;
  const payload={promptHy:'Լրացրեք բացթողումները։',difficulty:2,itemFamily:'application',sourceReference:'Synthetic capability fixture',stimulus:{},options:[],responseDefinition:definition,answerKey:{answer:key},changeSummary:'Synthetic typed revision'};
  const result=(await db.query('select service_save_item_content_revision($1,$2,$3) result',[item,actor,JSON.stringify(payload)])).rows[0].result;
  assert.equal(result.versionNo,old+1);
  const changed=(await db.query('select * from items where id=$1',[item])).rows[0];assert.equal(changed.status,'review');assert.equal(changed.review_status,'needs_review');assert.deepEqual(changed.config.responseDefinition,definition);
  const versions=(await db.query('select snapshot from item_versions where item_id=$1 order by version_no',[item])).rows;assert.equal(versions.length,2);assert.deepEqual(versions.at(-1).snapshot.answerKey.answer,key);
  const bad=structuredClone(payload);bad.answerKey.answer.fields.colour.accepted=[''];
  await assert.rejects(db.query('select service_save_item_content_revision($1,$2,$3)',[item,actor,JSON.stringify(bad)]),/typed_fields_contract_invalid/);
  assert.equal((await db.query('select version_no from items where id=$1',[item])).rows[0].version_no,old+1);
  const student=(await db.query("select id from profiles where role='student' limit 1")).rows[0]?.id??'10000000-0000-4000-8000-000000000099';
  await assert.rejects(db.query('select service_save_item_content_revision($1,$2,$3)',[item,student,JSON.stringify(payload)]),/content_admin_required/);
 }finally{await db.close();}
});
