import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
import {validateGuideVariants} from '../supabase/functions/_shared/remediation-authoring-validation.mjs';

const productionMigration=readFileSync('supabase/migrations/20261007185345_sprint_15b13_s09_practice_expansion.sql','utf8');
const guard=productionMigration.match(/if \((md5\(jsonb_build_object[\s\S]+?\))\) is distinct from '([a-f0-9]{32})'/);
assert.ok(guard,'migration must contain full-catalogue stale-evidence guard');
async function fixture(t) {
  const db=new PGlite();await db.waitReady;t.after(()=>db.close());
  await db.exec(readFileSync('tests/fixtures/chapter-ii-expansion-catalogue.sql','utf8'));
  await db.exec(readFileSync('tests/fixtures/chapter-ii-s09-baseline.sql','utf8'));
  // Fixture-specific expected hash only. Execute the unchanged production comparison
  // expression and migration logic over this smaller pseudonymized catalogue.
  const hash=(await db.query(`select ${guard[1]} as hash`)).rows[0].hash;
  return {db,migration:productionMigration.replace(guard[2],hash)};
}
async function snapshot(db) {
  const out={};
  for(const {tablename} of (await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows)
    out[tablename]=(await db.query(`select to_jsonb(t)::text value from ${tablename} t order by to_jsonb(t)::text`)).rows.map(r=>r.value);
  return out;
}
test('S09 adds two governed drafts and three draft definitions without changing any existing row',async t=>{
  const {db,migration}=await fixture(t),before=await snapshot(db);
  await db.exec('begin;'+migration+'commit;');
  const after=await snapshot(db);
  for(const [table,rows] of Object.entries(before))
    for(const row of rows)assert.ok(after[table].includes(row),`${table}: old row changed`);
  const items=(await db.query("select * from items where code ~ '^PHY7-U02-S09-I0[5-6]$' order by code")).rows;
  assert.equal(items.length,2);
  assert.ok(items[0].source_reference.includes('լրացուցիչ վերջնարդյունք 2(2)'));
  assert.equal(items[0].config.programmeOutcomeLocator,'7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Լրացուցիչ 2(2)');
  assert.deepEqual(items.map(i=>[i.status,i.review_status,i.version_no,i.config.learnerVisible]),Array(2).fill(['draft','needs_review',1,false]));
  assert.deepEqual(items.map(i=>i.config.wholeSkillReviewDisposition),['new_reasoning_coverage','intentional_practice_variant']);
  assert.equal(new Set(items.map(i=>i.variant_fingerprint)).size,2);
  assert.equal(after.misconceptions.length-before.misconceptions.length,3);
  for(const row of after.misconceptions.filter(r=>!before.misconceptions.includes(r)))assert.equal(JSON.parse(row).status,'draft');
  for(const table of ['curriculum_releases','assessment_pools','assessment_forms','assessment_pool_items','assessment_form_items','assessment_blueprints'])assert.deepEqual(after[table],before[table]);
  const api=await endpoint(db,'manage-content-quality');
  for(const item of items) {
    const result=await api.call({action:'run_qa',itemId:item.id});
    assert.equal(result.status,200,JSON.stringify(result));
    assert.equal(result.body.qa.passed,true,JSON.stringify(result.body));
    assert.deepEqual(result.body.qa.errors,[]);assert.deepEqual(result.body.qa.warnings,[]);
    assert.deepEqual(result.body.qa.details.answerPositionDistribution.counts,{A:1,B:1,C:0,D:0});
    assert.equal(result.body.qa.details.misconceptionMappings,3);
  }
  const guide=(await db.query('select * from item_template_remediation_guides where item_template_id=$1',[items[0].item_template_id])).rows[0];
  assert.equal(guide.status,'draft');
  const validation=validateGuideVariants('template',{titleHy:guide.title_hy,strategyHy:guide.strategy_hy,hint1Hy:guide.hint_1_hy,hint2Hy:guide.hint_2_hy,workedExampleHy:guide.worked_example_hy,allowedParameterKeys:guide.allowed_parameter_keys},guide.metadata.referenceMetadata,items);
  assert.deepEqual(validation.errors,[]);assert.deepEqual(validation.warnings,[]);
  assert.ok(items.every(i=>i.config.illustrationDisposition==='verbal_task_no_illustration_needed'));
  assert.ok(items.every(i=>Object.keys(i.stimulus).length===0));
  assert.equal(validation.checkedVariantCount,2);
  for (const item of items) {
    const saved=(await db.query('select snapshot from item_versions where item_id=$1',[item.id])).rows[0].snapshot;
    assert.equal(saved.item.prompt_hy,item.prompt_hy);
    const answer=(await db.query('select answer from item_answer_keys where item_id=$1',[item.id])).rows[0].answer;
    assert.equal(saved.answerKey.answer,answer);
    assert.ok(saved.misconceptions.every(m=>m.responseKey!==answer));
    assert.equal(saved.misconceptions.length,3);
  }
  await assert.rejects(db.exec('begin;'+migration+'commit;'),/whole_bank_comparison_stale/);await db.exec('rollback');
});
test('S09 migration rolls back and rejects stale sibling, related-bank, history, guide and release evidence',async t=>{
  const {db,migration}=await fixture(t),before=await snapshot(db);
  await db.exec('begin;'+migration+'rollback;');assert.deepEqual(await snapshot(db),before);
  for(const [change,error] of [
    ["update items set prompt_hy=prompt_hy||' changed' where code='PHY7-U02-S09-I01'",'whole_bank_comparison_stale'],
    ["update items set version_no=version_no+1 where code='PHY7-U02-S02-I01'",'whole_bank_comparison_stale'],
    ["update item_options set content_hy='changed' where item_id=(select id from items where code='PHY7-U02-S09-I02') and option_key='A'",'whole_bank_comparison_stale'],
    ["update item_versions set change_summary='changed'",'whole_bank_comparison_stale'],
    ["update item_template_remediation_guides set hint_1_hy='changed'",'whole_bank_comparison_stale'],
    ["update misconceptions set status='draft' where code='scale_moves_liquid'",'whole_bank_comparison_stale'],
    ["update skill_outcome_curriculum_mappings set mapping_type='derived_supporting'",'whole_bank_comparison_stale'],
    ["update learning_outcomes set statement_hy=statement_hy||' changed'",'whole_bank_comparison_stale'],
    ["insert into assessment_pool_items (pool_id,item_id) select gen_random_uuid(),id from items where code='PHY7-U02-S09-I01'",'whole_bank_comparison_stale'],
    ["insert into assessment_form_items (form_id,item_id,slot_order) select gen_random_uuid(),id,1 from items where code='PHY7-U02-S09-I02'",'whole_bank_comparison_stale'],
    ["update assessment_pools set is_protected=not is_protected",'whole_bank_comparison_stale'],
    ["update assessment_forms set status='retired'",'whole_bank_comparison_stale'],
    ["update item_qa_runs set passed=false",'existing_S09_review_incomplete'],
    ["update curriculum_releases set status='pilot',activated_at=now()",'candidate_not_draft']
  ]) {
    await db.exec('begin;'+change+';');await assert.rejects(db.exec(migration),new RegExp('15B13J_'+error));
    await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  }
});
