import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
import {validateGuideVariants} from '../supabase/functions/_shared/remediation-authoring-validation.mjs';

const migration=readFileSync('supabase/migrations/20261006154828_sprint_15b13_s02_practice_completion.sql','utf8');
const template='PHY7-U02-S02-T03-PARTICLE-MODEL-LIMITS';
async function fixture(t) {
  const db=new PGlite(); await db.waitReady; t.after(()=>db.close());
  await db.exec(readFileSync('tests/fixtures/chapter-ii-expansion-catalogue.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261006134149_sprint_15b13_s02_practice_expansion.sql','utf8'));
  const api=await endpoint(db,'manage-content-quality');
  for(const item of (await db.query("select id from items where code ~ '^PHY7-U02-S02-I0[5-8]$'")).rows) {
    const qa=await api.call({action:'run_qa',itemId:item.id}); assert.equal(qa.body.qa.passed,true);
  }
  // Fixture-only prior human-review state; no production credentials or approval writes.
  await db.exec(`update items set status='published', review_status='approved' where code ~ '^PHY7-U02-S02-I0[5-8]$';
    update item_template_remediation_guides set status='published', guide_version=2 where item_template_id in
      (select id from item_templates where code='PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS');
    update remediation_guide_authoring_versions set lifecycle_status='published', published_runtime_version=2 where guide_source_id in
      (select id from item_template_remediation_guides where guide_version=2);`);
  return {db,api};
}
async function snapshot(db) {
  const out={};
  for(const {tablename} of (await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows)
    out[tablename]=(await db.query(`select to_jsonb(t)::text value from ${tablename} t order by to_jsonb(t)::text`)).rows.map(r=>r.value);
  return out;
}
test('S02 completion preserves prior reviewed content, isolates four drafts and passes actual content QA',async t=>{
  const {db,api}=await fixture(t),before=await snapshot(db);
  await db.exec('begin;'+migration+'commit;');
  const after=await snapshot(db);
  for(const [table,rows] of Object.entries(before)) for(const row of rows)
    assert.ok(after[table].includes(row),`${table}: existing row modified or removed`);
  const items=(await db.query('select i.* from items i join item_templates t on t.id=i.item_template_id where t.code=$1 order by i.code',[template])).rows;
  assert.deepEqual(items.map(i=>[i.code,i.status,i.review_status,i.version_no,i.config.learnerVisible]),[9,10,11,12].map(n=>[`PHY7-U02-S02-I${String(n).padStart(2,'0')}`,'draft','needs_review',1,false]));
  assert.deepEqual((await db.query('select a.answer from item_answer_keys a join items i on i.id=a.item_id join item_templates t on t.id=i.item_template_id where t.code=$1 order by i.code',[template])).rows.map(r=>r.answer),['B','D','A','C']);
  assert.equal((await db.query("select count(*)::int n from items where code like 'PHY7-U02-S02-%'")).rows[0].n,12);
  const media=JSON.parse(readFileSync('docs/evidence/chapter-ii-s02-textbook-media-20261006.json','utf8'));
  for(const item of items) {
    const qa=await api.call({action:'run_qa',itemId:item.id});
    assert.equal(qa.status,200);assert.equal(qa.body.qa.passed,true,JSON.stringify(qa.body.qa));
    assert.deepEqual(qa.body.qa.errors,[]);assert.deepEqual(qa.body.qa.warnings,[]);
    assert.deepEqual(qa.body.qa.details.answerPositionDistribution.counts,{A:1,B:1,C:1,D:1});
    assert.equal(qa.body.qa.details.misconceptionMappings,3);
    if(item.stimulus.kind==='image') {
      const source=media.find(m=>m.url===item.stimulus.url);assert.ok(source);
      assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),item.stimulus.source.sha256);
    } else assert.equal(item.config.illustrationDisposition,'verbal_task_no_illustration_needed');
    const version=(await db.query('select snapshot from item_versions where item_id=$1 and version_no=1',[item.id])).rows[0].snapshot;
    assert.deepEqual(version.item.stimulus,item.stimulus);
  }
  assert.equal(items.filter(i=>i.stimulus.kind==='image').length,2);
  assert.deepEqual(after.assessment_pool_items,[]);assert.deepEqual(after.assessment_blueprints,[]);
  assert.deepEqual(after.curriculum_releases,before.curriculum_releases);
  assert.deepEqual(after.misconceptions,before.misconceptions);
  const guide=(await db.query('select g.* from item_template_remediation_guides g join item_templates t on t.id=g.item_template_id where t.code=$1',[template])).rows[0];
  assert.equal(guide.status,'draft');assert.equal(guide.guide_version,1);
  const validation=validateGuideVariants('template',{
    titleHy:guide.title_hy,strategyHy:guide.strategy_hy,hint1Hy:guide.hint_1_hy,
    hint2Hy:guide.hint_2_hy,workedExampleHy:guide.worked_example_hy,allowedParameterKeys:guide.allowed_parameter_keys,
  },guide.metadata.referenceMetadata,items);
  assert.equal(validation.checkedVariantCount,4);assert.deepEqual(validation.errors,[]);assert.deepEqual(validation.warnings,[]);
  await assert.rejects(db.exec('begin;'+migration+'commit;'),/15B13B_existing_expansion_requires_review_not_overwrite/);
  await db.exec('rollback');
});
test('S02 completion rollback and predecessor gates prevent partial or premature authoring',async t=>{
  const {db}=await fixture(t),before=await snapshot(db);
  await db.exec('begin;'+migration+'rollback;'); assert.deepEqual(await snapshot(db),before);
  for(const [change,expected] of [
    ["update skills set status='draft' where code='PHY7-U02-S02'",'authoring_skill_missing'],
    ["update curriculum_releases set status='pilot', activated_at=now()",'candidate_not_draft'],
    ["update items set review_status='changes_requested' where code='PHY7-U02-S02-I08'",'existing_S02_review_incomplete'],
    ["update item_qa_runs set passed=false",'existing_S02_review_incomplete'],
    ["update item_template_remediation_guides set status='draft'",'predecessor_guide_not_published'],
    ["update remediation_guide_authoring_versions set published_runtime_version=null",'predecessor_guide_not_published'],
    ["update misconceptions set status='draft' where code='matter_as_continuous'",'approved_misconceptions_missing']
  ]) {
    await db.exec('begin;'+change+';');await assert.rejects(db.exec(migration),new RegExp('15B13B_'+expected));
    await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  }
});
