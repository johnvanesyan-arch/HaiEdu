import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';

const migration = readFileSync('supabase/migrations/20261006134149_sprint_15b13_s02_practice_expansion.sql','utf8');
const tables = ['items','item_options','item_answer_keys','item_versions','item_curriculum_scopes','item_qa_runs','item_misconception_mappings','misconceptions','item_families','item_templates','item_template_remediation_guides','remediation_guide_authoring_versions','curriculum_releases','curriculum_release_item_families','item_family_curriculum_reconciliations','assessment_pool_items','assessment_blueprints'];
async function fixture(t) {
  const db = new PGlite(); await db.waitReady; t.after(()=>db.close());
  await db.exec(readFileSync('tests/fixtures/chapter-ii-expansion-catalogue.sql','utf8'));
  return db;
}
async function snapshot(db) {
  const result = {};
  for(const table of tables) result[table]=(await db.query(`select to_jsonb(t) value from ${table} t order by to_jsonb(t)::text`)).rows.map(r=>r.value);
  return result;
}
test('S02 expansion preserves approved content and produces four isolated, technically valid drafts',async t=>{
  const db=await fixture(t), before=await snapshot(db);
  await db.exec('begin;'+migration+'commit;');
  const after=await snapshot(db);
  for(const table of tables) {
    const oldIds=new Set(before[table].map(r=>r.id ?? JSON.stringify(r)));
    assert.deepEqual(after[table].filter(r=>oldIds.has(r.id ?? JSON.stringify(r))), before[table], `${table}: existing rows must remain unchanged`);
  }
  const newItems=after.items.filter(r=>!before.items.some(old=>old.id===r.id)).sort((a,b)=>a.code.localeCompare(b.code));
  assert.equal(newItems.length,4);
  assert.deepEqual(newItems.map(i=>[i.code,i.status,i.review_status,i.version_no,i.config.learnerVisible]),[5,6,7,8].map(n=>[`PHY7-U02-S02-I0${n}`,'draft','needs_review',1,false]));
  assert.equal(new Set(newItems.map(i=>i.variant_fingerprint)).size,4);
  assert.equal(after.misconceptions.length,3);
  assert.deepEqual(after.assessment_pool_items,[]); assert.deepEqual(after.assessment_blueprints,[]);
  assert.equal(after.curriculum_releases[0].status,'draft');
  const api=await endpoint(db,'manage-content-quality');
  for(const item of newItems) {
    const qa=await api.call({action:'run_qa',itemId:item.id});
    assert.equal(qa.status,200,JSON.stringify(qa.body));
    assert.equal(qa.body.qa.passed,true); assert.deepEqual(qa.body.qa.errors,[]); assert.deepEqual(qa.body.qa.warnings,[]);
    assert.deepEqual(qa.body.qa.details.answerPositionDistribution.counts,{A:1,B:1,C:1,D:1});
    assert.equal(qa.body.qa.details.evidenceBlueprintVerification.missingRequiredPurposes.length,0);
    assert.equal(qa.body.qa.details.misconceptionMappings,3);
  }
  const media=JSON.parse(readFileSync('docs/evidence/chapter-ii-s02-textbook-media-20261006.json','utf8'));
  for(const item of newItems.filter(i=>i.stimulus.kind==='image')) {
    const source=media.find(m=>m.url===item.stimulus.url); assert.ok(source);
    assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256);
    assert.equal(item.stimulus.source.sha256,source.sha256); assert.ok(item.stimulus.altHy.length>20);
    const version=after.item_versions.find(v=>v.item_id===item.id);
    assert.deepEqual(version.snapshot.item.stimulus,item.stimulus);
  }
  assert.equal(newItems[3].config.illustrationDisposition,'verbal_task_no_illustration_needed');
  await assert.rejects(db.exec('begin;'+migration+'commit;'),/15B13_existing_expansion_requires_review_not_overwrite/);
  await db.exec('rollback');
  assert.deepEqual((await snapshot(db)).items,after.items);
});

test('S02 authoring rolls back completely and fails closed when predecessor governance changes',async t=>{
  const db=await fixture(t), before=await snapshot(db);
  await db.exec('begin;'+migration+'rollback;'); assert.deepEqual(await snapshot(db),before);
  for(const [change,expected] of [
    ["update skills set status='draft' where code='PHY7-U02-S02'",'15B13_authoring_skill_missing'],
    ["update curriculum_releases set status='pilot', activated_at=now()",'15B13_candidate_not_draft'],
    ["update items set review_status='changes_requested' where code='PHY7-U02-S02-I01'",'15B13_existing_S02_review_incomplete'],
    ["update item_qa_runs set passed=false",'15B13_existing_S02_review_incomplete'],
    ["update misconceptions set status='draft' where code='matter_as_continuous'",'15B13_approved_misconceptions_missing'],
  ]) {
    await db.exec('begin;'+change+';');
    await assert.rejects(db.exec(migration),new RegExp(expected));
    await db.exec('rollback'); assert.deepEqual(await snapshot(db),before);
  }
});
