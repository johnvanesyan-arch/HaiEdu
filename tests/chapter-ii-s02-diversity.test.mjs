import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {endpoint} from './fixtures/phase3-endpoint-harness.mjs';
import {validateGuideVariants} from '../supabase/functions/_shared/remediation-authoring-validation.mjs';

const migration=readFileSync('supabase/migrations/20261006164457_sprint_15b13_s02_i10_diversity_revision.sql','utf8');
async function fixture(t) {
  const db=new PGlite(); await db.waitReady; t.after(()=>db.close());
  await db.exec(readFileSync('tests/fixtures/chapter-ii-expansion-catalogue.sql','utf8'));
  // Only the relevant columns for empty delivery/exposure-denial fixtures.
  for (const name of ['assessment_form_items','learning_session_items','attempts','student_item_exposure_events','chapter_review_item_exposures'])
    await db.exec(`create table ${name}(item_id uuid)`);
  await db.exec(readFileSync('supabase/migrations/20261006134149_sprint_15b13_s02_practice_expansion.sql','utf8'));
  const api=await endpoint(db,'manage-content-quality');
  for(const item of (await db.query("select id from items where code ~ '^PHY7-U02-S02-I0[5-8]$'")).rows)
    assert.equal((await api.call({action:'run_qa',itemId:item.id})).body.qa.passed,true);
  await db.exec(`update items set status='published',review_status='approved' where code ~ '^PHY7-U02-S02-I0[5-8]$';
    update item_template_remediation_guides set status='published',guide_version=2 where item_template_id in
      (select id from item_templates where code='PHY7-U02-S02-T02-PARTICLE-OBSERVATIONS');
    update remediation_guide_authoring_versions set lifecycle_status='published',published_runtime_version=2 where guide_source_id in
      (select id from item_template_remediation_guides where guide_version=2);`);
  await db.exec(readFileSync('supabase/migrations/20261006154828_sprint_15b13_s02_practice_completion.sql','utf8'));
  // Reproduce the owner's real intervening I09 wording/version edit and completed reviews.
  // These are isolated fixtures, never production approval writes.
  await db.exec(`update items set version_no=2,prompt_hy='Պղնձե լարն անզեն աչքով հոծ (հավասարաչափ ամբողջական) է թվում. առանձին մասնիկներ և դրանց միջև եղած տարածություններ չենք նկատում։ Ինչո՞ւ այս դիտումը չի հերքում նյութի մասնիկային կառուցվածքը։' where code='PHY7-U02-S02-I09';
    update items set status='published',review_status='approved' where code ~ '^PHY7-U02-S02-I(09|1[0-2])$';`);
  await db.exec(`update item_options o set content_hy=p.text from (values
    ('A','Պղինձը հոծ նյութ է. մասնիկներից կազմված են միայն հեղուկներն ու գազերը։'),
    ('B','Մասնիկներն ու դրանց միջև եղած տարածություններն այնքան փոքր են, որ անզեն աչքով չեն կարող զանազանվել։'),
    ('C','Պղնձի մասնիկները հանգստի վիճակում միաձուլվում են մեկ ամբողջության։'),
    ('D','Պղնձի մասնիկներն առաջանում են միայն ջերմաստիճանի փոփոխության դեպքում։')) p(key,text)
    where o.item_id=(select id from items where code='PHY7-U02-S02-I09') and o.option_key=p.key;`);
  const current=(await db.query("select * from items where code ~ '^PHY7-U02-S02-I(09|1[0-2])$' order by code")).rows;
  const priorQa=[];
  for(const i of current) priorQa.push((await api.call({action:'run_qa',itemId:i.id})).body.qa);
  return {db,api,current,priorQa};
}
async function snapshot(db) {
  const out={};
  for(const {tablename} of (await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows)
    out[tablename]=(await db.query(`select to_jsonb(t)::text value from ${tablename} t order by to_jsonb(t)::text`)).rows.map(r=>r.value);
  return out;
}
test('I10 revision preserves history and sibling approvals, resets only I10, and refreshes the family QA state',async t=>{
  const {db,api,current,priorQa}=await fixture(t),before=await snapshot(db);
  const i10=current.find(i=>i.code.endsWith('I10'));
  await db.exec('begin;'+migration+'commit;');
  const after=await snapshot(db);
  const mutable=new Set(['items','item_options','item_answer_keys','item_misconception_mappings','item_templates']);
  for(const [table,rows] of Object.entries(before)) {
    if(mutable.has(table)) continue;
    for(const row of rows) assert.ok(after[table].includes(row),`${table}: historical row changed`);
  }
  const revised=(await db.query('select to_jsonb(i) data from items i where id=$1',[i10.id])).rows[0].data;
  assert.equal(revised.version_no,2);assert.equal(revised.status,'review');assert.equal(revised.review_status,'needs_review');
  assert.equal(revised.last_reviewed_at,null);assert.equal(revised.last_reviewed_by,null);
  assert.deepEqual(revised.stimulus,{});assert.notEqual(revised.variant_fingerprint,i10.variant_fingerprint);
  const v2=(await db.query('select * from item_versions where item_id=$1 and version_no=2',[i10.id])).rows[0];
  assert.deepEqual(v2.snapshot.item,revised);assert.equal(v2.created_by,null);
  assert.equal((await db.query("select status from misconceptions where code='qualitative_model_implies_exact_volume'")).rows[0].status,'draft');
  for(const row of before.items.map(JSON.parse).filter(i=>i.id!==i10.id))
    assert.deepEqual((await db.query('select to_jsonb(i) data from items i where id=$1',[row.id])).rows[0].data,row);
  assert.deepEqual(after.item_template_remediation_guides,before.item_template_remediation_guides);
  for(let n=0;n<current.length;n++) {
    const result=await api.call({action:'run_qa',itemId:current[n].id});
    assert.equal(result.body.qa.passed,true,JSON.stringify(result));
    assert.deepEqual(result.body.qa.errors,[]);assert.deepEqual(result.body.qa.warnings,[]);
    assert.notEqual(result.body.qa.details.evidenceBlueprintVerification.familyStateFingerprint,
      priorQa[n].details.evidenceBlueprintVerification.familyStateFingerprint);
  }
  const guide=(await db.query('select * from item_template_remediation_guides where item_template_id=$1',[i10.item_template_id])).rows[0];
  const variants=(await db.query('select * from items where item_template_id=$1',[i10.item_template_id])).rows;
  const checked=validateGuideVariants('template',{titleHy:guide.title_hy,strategyHy:guide.strategy_hy,hint1Hy:guide.hint_1_hy,
    hint2Hy:guide.hint_2_hy,workedExampleHy:guide.worked_example_hy,allowedParameterKeys:guide.allowed_parameter_keys},guide.metadata.referenceMetadata,variants);
  assert.deepEqual(checked.errors,[]);assert.deepEqual(checked.warnings,[]);
  await assert.rejects(db.exec('begin;'+migration+'commit;'),/15B13C_current_revision_changed/);await db.exec('rollback');
});
test('I10 migration rolls back completely and rejects stale comparisons, exposure, and release drift',async t=>{
  const {db,current}=await fixture(t),before=await snapshot(db);
  await db.exec('begin;'+migration+'rollback;');assert.deepEqual(await snapshot(db),before);
  const id=current.find(i=>i.code.endsWith('I10')).id;
  for(const [change,code] of [
    ["update items set prompt_hy=prompt_hy||' changed' where code='PHY7-U02-S02-I02'",'whole_skill_comparison_stale'],
    ["update items set version_no=3 where code='PHY7-U02-S02-I09'",'whole_skill_comparison_stale'],
    ["update items set version_no=2 where code='PHY7-U02-S02-I10'",'current_revision_changed'],
    ["update curriculum_releases set status='pilot',activated_at=now()",'candidate_not_draft'],
    ...['learning_session_items','attempts','student_item_exposure_events','chapter_review_item_exposures','assessment_form_items'].map(table=>[
      `insert into ${table}(item_id) values('${id}')`,'item_has_delivery_or_exposure']),
  ]) {
    await db.exec('begin;'+change+';');await assert.rejects(db.exec(migration),new RegExp('15B13C_'+code));
    await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  }
});
