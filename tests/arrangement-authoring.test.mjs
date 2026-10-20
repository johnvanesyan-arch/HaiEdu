import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {postgresClient} from './fixtures/learning-acceptance.mjs';
import {arrangementMigration,matchingDefinition,matchingKey,orderingDefinition,orderingKey} from './fixtures/arrangement-db.mjs';
test('matching and ordering revisions retain private keys and full snapshots, and return content to review',async()=>{
 const db=process.env.PHASE3_POSTGRES_17_CI==='1'?await postgresClient():new PGlite();try{
  if(db.waitReady)await db.waitReady;
  for(const p of ['tests/fixtures/sprint-15a-remediation-authoring.sql','tests/fixtures/phase3-questions.sql'])await db.exec(readFileSync(p,'utf8'));
  const sql=readFileSync(arrangementMigration,'utf8');
  for(const name of ['private.validate_arrangement_definition','private.validate_arrangement_response','private.validate_arrangement_key','public.service_save_item_content_revision']){
   const match=sql.match(new RegExp('create (?:or replace )?function '+name.replaceAll('.','\\.')+'\\([\\s\\S]*?\\n\\$\\$;'));assert.ok(match,name);await db.exec(match[0]);
  }
  const items=(await db.query('select id from items order by id limit 2')).rows;
  const actor=(await db.query("select id from profiles where role='content_admin' limit 1")).rows[0].id;
  for(const [n,type,definition,key] of [[0,'matching',matchingDefinition,matchingKey],[1,'ordering',orderingDefinition,orderingKey]]){
   const item=items[n].id;
   await db.query("update items set item_type=$2,variant_seed=null,config=jsonb_build_object('responseDefinition',$3::jsonb) where id=$1",[item,type,JSON.stringify(definition)]);
   await db.query('update item_answer_keys set answer=$2 where item_id=$1',[item,JSON.stringify(key)]);
   const old=(await db.query('select version_no from items where id=$1',[item])).rows[0].version_no;
   const payload={promptHy:'Լրացրեք առաջադրանքը։',difficulty:2,itemFamily:'application',sourceReference:'Synthetic capability fixture',stimulus:{},options:[],responseDefinition:definition,answerKey:{answer:key},changeSummary:'Synthetic arrangement revision'};
   const result=(await db.query('select service_save_item_content_revision($1,$2,$3) result',[item,actor,JSON.stringify(payload)])).rows[0].result;assert.equal(result.versionNo,old+1);
   const changed=(await db.query('select * from items where id=$1',[item])).rows[0];assert.equal(changed.status,'review');assert.equal(changed.review_status,'needs_review');assert.deepEqual(changed.config.responseDefinition,definition);
   const snapshots=(await db.query('select snapshot from item_versions where item_id=$1 order by version_no',[item])).rows;assert.deepEqual(snapshots.at(-1).snapshot.answerKey.answer,key);assert.deepEqual(snapshots.at(-1).snapshot.item.config.responseDefinition,definition);
   const bad=structuredClone(payload);bad.answerKey.answer.schemaVersion='future';await assert.rejects(db.query('select service_save_item_content_revision($1,$2,$3)',[item,actor,JSON.stringify(bad)]),/arrangement_contract_invalid/);
   assert.equal((await db.query('select version_no from items where id=$1',[item])).rows[0].version_no,old+1);
   await assert.rejects(db.query('select service_save_item_content_revision($1,$2,$3)',[item,'10000000-0000-4000-8000-000000000099',JSON.stringify(payload)]),/content_admin_required/);
  }
 }finally{await db.close();}
});
