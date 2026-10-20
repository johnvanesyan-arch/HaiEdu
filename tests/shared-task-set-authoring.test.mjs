import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {postgresClient} from './fixtures/learning-acceptance.mjs';
import {taskSetMigration} from './fixtures/shared-task-sets-db.mjs';
import {arrangementMigration} from './fixtures/arrangement-db.mjs';

test('atomic content revision attaches the final immutable set version and still resets question review',async()=>{
 const db=process.env.PHASE3_POSTGRES_17_CI==='1'?await postgresClient():new PGlite();
 try{
  for(const p of ['tests/fixtures/sprint-15a-remediation-authoring.sql','tests/fixtures/phase3-questions.sql'])await db.exec(readFileSync(p,'utf8'));
  // Extend the existing authoring fixture with the real source registry/scopes.
  await db.exec(`create table curriculum_releases(id uuid primary key,subject_program_id uuid);
   create table curriculum_release_units(curriculum_release_id uuid,unit_id uuid);
   create table curriculum_release_skills(curriculum_release_id uuid,skill_id uuid);
   create table item_curriculum_scopes(item_id uuid,subject_program_id uuid,unit_id uuid,is_primary boolean);
   create table learning_audio_versions(id uuid,source_family_id uuid,locale text);
   insert into curriculum_releases select id,id from subject_programs;
   insert into curriculum_release_units select subject_program_id,id from units;
   insert into curriculum_release_skills select r.id,s.id from curriculum_releases r cross join skills s where s.id::text like '1000%';
   insert into item_curriculum_scopes select i.id,u.subject_program_id,u.id,true from items i cross join units u where i.skill_id::text like '1000%';`);
  const source=readFileSync(taskSetMigration,'utf8');await db.exec(source.slice(0,source.indexOf('create function private.task_set_stimulus')));
  const save=readFileSync(arrangementMigration,'utf8').match(/create or replace function public\.service_save_item_content_revision\([\s\S]*?\n\$\$;/)[0];await db.exec(save);
  const items=(await db.query("select id,skill_id,version_no from items where skill_id::text like '1000%' order by id")).rows;
  const actor=(await db.query("select id from profiles where role='content_admin' limit 1")).rows[0].id;
  const scope=(await db.query('select * from curriculum_release_units limit 1')).rows[0],setId='40000000-0000-4000-8000-000000000001';
  const members=items.map(i=>({itemId:i.id,skillId:i.skill_id,version:i.version_no+1}));
  await db.query(`insert into learning_task_set_versions(id,curriculum_release_id,unit_id,source_family_id,locale,title,stimulus,members,source_reference,permission_reference,review_reference,reviewed_by,reviewed_at)
   values($1,$2,$3,$1,'en','Synthetic source',$4,$5,'Synthetic source','Fixture only','Synthetic source review',$6,now())`,[setId,scope.curriculum_release_id,scope.unit_id,JSON.stringify({kind:'text',schemaVersion:'haiedu-text-v1',locale:'en',content:'A synthetic shared passage.'}),JSON.stringify(members),actor]);
  const reference={kind:'task_set',schemaVersion:'haiedu-task-set-v1',taskSetVersionId:setId};
  const payload={promptHy:'Փորձնական հարց',difficulty:2,itemFamily:'application',sourceReference:'Synthetic authoring fixture',stimulus:reference,options:[{key:'A',contentHy:'Տարբերակ Ա',displayOrder:1},{key:'B',contentHy:'Տարբերակ Բ',displayOrder:2}],answerKey:{answer:'A'},changeSummary:'Synthetic set attachment'};
  const result=(await db.query('select service_save_item_content_revision($1,$2,$3) result',[items[0].id,actor,JSON.stringify(payload)])).rows[0].result;
  assert.equal(result.versionNo,members[0].version);
  const changed=(await db.query('select stimulus,status,review_status from items where id=$1',[items[0].id])).rows[0];assert.deepEqual(changed.stimulus,reference);assert.equal(changed.status,'review');assert.equal(changed.review_status,'needs_review');
  const snapshots=(await db.query('select snapshot from item_versions where item_id=$1 order by version_no',[items[0].id])).rows;assert.equal(snapshots.length,2);assert.deepEqual(snapshots.at(-1).snapshot.item.stimulus,reference);
  await assert.rejects(db.query('select service_save_item_content_revision($1,$2,$3)',[items[0].id,actor,JSON.stringify(payload)]),/task_set_member_scope_invalid/);
  assert.equal((await db.query('select version_no from items where id=$1',[items[0].id])).rows[0].version_no,members[0].version);
 }finally{await db.close();}
});
