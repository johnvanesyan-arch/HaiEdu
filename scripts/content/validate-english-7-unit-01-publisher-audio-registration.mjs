// Isolated rehearsal only: fixture reviewer/permissions never leave PGlite.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {database,ids} from '../../tests/fixtures/phase3-db-harness.mjs';
import {endpoint} from '../../tests/fixtures/phase3-endpoint-harness.mjs';
import {validateTypedKey} from '../../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementKey} from '../../supabase/functions/_shared/arrangement-responses.mjs';
import {arrangementMigration} from '../../tests/fixtures/arrangement-db.mjs';
import {taskSetMigration} from '../../tests/fixtures/shared-task-sets-db.mjs';
const manifestPath='docs/content/english-7-unit-01-publisher-audio-registration-plan.json';
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
assert.equal(manifest.status,'owner_authorized_protected_source_registration');
assert.equal(manifest.revisions.length,6);assert.equal(manifest.audioVersions.length,3);
const temp=mkdtempSync(join(tmpdir(),'publisher-audio-registration-rehearsal-'));
let input;
try{const p=join(temp,'input.json');execFileSync(process.execPath,['scripts/content/prepare-english-7-unit-01-review.mjs',p]);input=JSON.parse(readFileSync(p,'utf8'));}finally{rmSync(temp,{recursive:true,force:true});}
const db=await database();
const result={schemaVersion:'haiedu-publisher-audio-registration-rehearsal-v1',environment:'Isolated in-memory PGlite; real SQL and QA handler, synthetic Auth/reviewer/permission records',productionMutations:0,sourceRows:0,audioRows:0,heldBefore:0,passedAfter:0,preservedV1:0,preservedKeys:0,previewSources:0,staleRevisionRejected:false,missingReviewerRejected:false,missingPermissionRejected:false,questionApprovals:0,manifestSha256:createHash('sha256').update(readFileSync(manifestPath)).digest('hex')};
try{
 const arrangement=readFileSync(arrangementMigration,'utf8');
 for(const name of ['private.validate_arrangement_definition','private.validate_arrangement_response','private.validate_arrangement_key','public.service_save_item_content_revision']){
  const match=arrangement.match(new RegExp('create (?:or replace )?function '+name.replaceAll('.','\\.')+'\\([\\s\\S]*?\\n\\$\\$;'));assert.ok(match);await db.exec(match[0]);
 }
 await db.exec(`create table curriculum_releases(id uuid primary key,subject_program_id uuid);
 create table curriculum_release_units(curriculum_release_id uuid,unit_id uuid);
 create table curriculum_release_skills(curriculum_release_id uuid,skill_id uuid);
 create table item_curriculum_scopes(item_id uuid,subject_program_id uuid,unit_id uuid,is_primary boolean);`);
 const audio=readFileSync('supabase/migrations/20261020170445_sprint_16_1b_protected_audio.sql','utf8');
 await db.exec(audio.slice(0,audio.indexOf('create table public.learning_audio_deliveries')));
 await db.exec(audio.slice(audio.indexOf('create function private.guard_audio_version'),audio.indexOf('-- Enforce the capability boundary')));
 const source=readFileSync(taskSetMigration,'utf8');await db.exec(source.slice(0,source.indexOf('create function private.task_set_stimulus')));
 async function insert(table,row){
  const allowed=new Set((await db.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',['public',table])).rows.map(r=>r.column_name));
  const keys=Object.keys(row).filter(k=>allowed.has(k));
  const types=new Map((await db.query('select column_name,data_type from information_schema.columns where table_schema=$1 and table_name=$2',['public',table])).rows.map(r=>[r.column_name,r.data_type]));
  return db.query(`insert into ${table} (${keys.join(',')}) values (${keys.map((_,n)=>'$'+(n+1)).join(',')})`,keys.map(k=>types.get(k)==='jsonb'?JSON.stringify(row[k]):row[k]));
 }
 const {identities}=input;
 await insert('subjects',input.rows.subjects[0]);
 await insert('subject_programs',input.rows.subject_programs[0]);
 await insert('units',input.rows.units[0]);
 await insert('curriculum_releases',{id:identities.release,subject_program_id:identities.programme});
 await insert('curriculum_release_units',{curriculum_release_id:identities.release,unit_id:identities.unit});
 for(const s of input.rows.skills){await insert('skills',s);await insert('curriculum_release_skills',{curriculum_release_id:identities.release,skill_id:s.id});}
 const selected=new Set(manifest.revisions.map(r=>r.itemId));
 const itemRows=input.rows.items.filter(i=>selected.has(i.id));
 const templates=new Set(itemRows.map(i=>i.item_template_id));
 const templateRows=input.rows.item_templates.filter(t=>templates.has(t.id));
 const families=new Set(templateRows.map(t=>t.item_family_id));
 for(const i of input.rows.item_families.filter(f=>families.has(f.id)))await insert('item_families',i);
 for(const i of templateRows)await insert('item_templates',i);
 for(const i of itemRows)await insert('items',i);
 for(const table of ['item_options','item_answer_keys','item_curriculum_scopes'])for(const i of input.rows[table].filter(i=>selected.has(i.item_id)))await insert(table,i);
 const originals=new Map();
 for(const s of input.snapshots.filter(s=>selected.has(s.itemId))){const snapshot={authoringReview:s.context};originals.set(s.itemId,snapshot);await insert('item_versions',{item_id:s.itemId,version_no:1,snapshot});}
 const api=await endpoint(db,'manage-content-quality',{validateTypedKey,validateArrangementKey});
 for(const r of manifest.revisions){const q=await api.call({action:'run_qa',itemId:r.itemId},{aal:'aal2'});assert.equal(q.status,200);assert.deepEqual(q.body.qa.errors,['authoring_source_registration_pending']);result.heldBefore++;}
 for(const a of manifest.audioVersions){await insert('learning_audio_versions',{...a.proposedRow,reviewed_by:ids.actor,reviewed_at:'2026-10-21T00:00:00Z',listening_review_reference:'Isolated technical fixture only; no human audition claim',permission_reference:'Isolated test only; no upload or distribution'});result.audioRows++;}
 const first=manifest.taskSets[0].proposedRow;
 await assert.rejects(insert('learning_task_set_versions',{...first,permission_reference:'Fixture only',review_reference:'Fixture only',reviewed_at:'2026-10-21T00:00:00Z'}),/task_set_review_required/);result.missingReviewerRejected=true;
 await assert.rejects(insert('learning_task_set_versions',{...first,reviewed_by:ids.actor,review_reference:'Fixture only',reviewed_at:'2026-10-21T00:00:00Z'}),/permission_reference/);result.missingPermissionRejected=true;
 const firstAudio=manifest.audioVersions[0].proposedRow;
 await assert.rejects(insert('learning_audio_versions',{...firstAudio,id:'00000000-0000-4000-8000-000000000001',permission_reference:'Fixture only',listening_review_reference:'Fixture only',reviewed_at:'2026-10-21T00:00:00Z'}),/audio_review_required/);
 result.missingAudioReviewerRejected=true;
 await db.exec('begin');
 for(const s of manifest.taskSets){assert.equal(s.proposedRow.reviewed_by,null);await insert('learning_task_set_versions',{...s.proposedRow,reviewed_by:ids.actor,reviewed_at:'2026-10-21T00:00:00Z',review_reference:'Synthetic fixture; no human source review',permission_reference:'Isolated test-only record; no publication permission'});result.sourceRows++;}
 for(const r of manifest.revisions){const saved=await db.query('select service_save_item_content_revision($1,$2,$3) result',[r.itemId,ids.actor,JSON.stringify(r.payload)]);assert.equal(saved.rows[0].result.versionNo,r.expectedNextVersion);}
 await db.exec('commit');
 for(const r of manifest.revisions){
  const q=await api.call({action:'run_qa',itemId:r.itemId},{aal:'aal2'});assert.equal(q.status,200);assert.equal(q.body.qa.passed,true,JSON.stringify(q.body));assert.deepEqual(q.body.qa.warnings,['misconception_mapping_missing']);result.passedAfter++;
  const detail=await api.call({action:'get_item_detail',itemId:r.itemId});assert.equal(detail.body.detail.authoringReview.sourceRegistered,true);result.previewSources++;
  const v1=(await db.query('select snapshot from item_versions where item_id=$1 and version_no=1',[r.itemId])).rows[0].snapshot;assert.deepEqual(v1,originals.get(r.itemId));result.preservedV1++;
  const row=(await db.query('select * from items where id=$1',[r.itemId])).rows[0];assert.equal(row.prompt_hy,r.expectedCurrentItem.prompt_hy);assert.equal(row.review_status,'needs_review');assert.equal(row.status,'review');assert.deepEqual(row.config,r.expectedCurrentItem.config);
  const key=(await db.query('select answer from item_answer_keys where item_id=$1',[r.itemId])).rows[0].answer;assert.deepEqual(key,r.payload.answerKey.answer);result.preservedKeys++;
  await db.query('select private.validate_task_set_reference($1,$2)',[JSON.stringify(row.stimulus),r.itemId]);
 }
 const r=manifest.revisions[0];await assert.rejects(db.query('select service_save_item_content_revision($1,$2,$3)',[r.itemId,ids.actor,JSON.stringify(r.payload)]),/task_set_member_scope_invalid/);result.staleRevisionRejected=true;
 result.questionApprovals=(await db.query('select count(*)::int n from item_reviews')).rows[0].n;assert.equal(result.questionApprovals,0);
 result.passed=true;
}finally{await db.close();}
const out=process.argv[2];assert.ok(out,'Supply an evidence JSON output path');writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
