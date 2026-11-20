// Isolated rehearsal of decision II-2 (20 November 2026): Chapter II moves from the current all-skills rule
// (16 questions, rounded 80% = at least 13/16, at least one correct in every skill, readiness on all eight skills)
// to policy v2 (S07 and S09 reported separately; pass on 12 questions for six skills at the exact 80% = 10/12,
// at least one correct in each; readiness on the same six). Synthetic, answer-free bank; real governed SQL in PGlite.
// The change is rehearsed the way a release would make it: a second mastery blueprint in the same curriculum
// release and unit. Nothing here touches production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readAssessmentPolicy} from '../supabase/functions/_shared/assessment-policy.mjs';
import {database,makeReady,finishBySkill,id,launch,finish,operation,blueprintId} from './fixtures/assessment-v2-db.mjs';

const SKILLS = [521, 522, 1001, 1002, 1003, 1004, 1005, 1006].map(id); // Chapter II order: S02 … S09
const S = Object.fromEntries(['S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'].map((k, n) => [k, SKILLS[n]]));
const SCORED = [S.S02, S.S03, S.S04, S.S05, S.S06, S.S08];
const OLD_BP = blueprintId(0, 'mastery_check'), NEW_BP = id(4040), FORMS = [1960, 1961, 1962, 1963].map(id);
const quotas = counts => Object.fromEntries(SKILLS.map((s, n) => [s, counts[n]]));
// Strong on required skills, nothing on the additional ones: 10/12 scored, 10/16 overall.
const STRONG_REQUIRED = [2, 2, 2, 1, 2, 0, 1, 0];

async function chapterTwo(db, { forms = 3 } = {}) {
  for (let n = 2; n < SKILLS.length; n++) {
    await db.query('insert into skills(id,code) values($1,$2)', [SKILLS[n], `SYN-II-${n + 2}`]);
    await db.query('insert into curriculum_release_skills(curriculum_release_id,skill_id,skill_code_snapshot,name_hy_snapshot,sequence_order_snapshot,layer_snapshot) values($1,$2,$3,$3,$4,1)', [id(501), SKILLS[n], `SYN-II-${n + 2}`, n + 1]);
  }
  await db.query('delete from assessment_form_items where form_id=any($1)', [FORMS]);
  await db.query('delete from assessment_blueprint_items where assessment_blueprint_id=$1', [OLD_BP]);
  if (forms === 4) { // a fourth disjoint form, only to show the attempt limit refuses on its own
    await db.query("insert into assessment_forms(id,pool_id,status) values($1,$2,'active')", [FORMS[3], id(720)]);
    await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{masteryFormSelection,formIds}',$2) where id=$1", [OLD_BP, JSON.stringify(FORMS)]);
  }
  for (let f = 0; f < forms; f++) for (let k = 0; k < SKILLS.length; k++) for (let n = 0; n < 2; n++) {
    const item = id(3000 + f * 100 + k * 10 + n), code = `SYN-II-${f}-${k}-${n}`;
    await db.query("insert into items(id,skill_id,item_type,status,version_no,code,item_template_id,variant_key,prompt_hy) select $1,$2,'single_choice','published',1,$3,item_template_id,$3,'Synthetic item' from items where id=$4", [item, SKILLS[k], code, id(721)]);
    await db.query('insert into assessment_pool_items values($1,$2,true)', [id(720), item]);
    await db.query('insert into assessment_blueprint_items values($1,$2,1)', [OLD_BP, item]);
    await db.query('insert into item_curriculum_scopes(item_id,subject_program_id,unit_id,is_primary) values($1,$2,$3,true)', [item, id(201), id(511)]);
    await db.query('insert into item_answer_keys(item_id,answer) select $1,answer from item_answer_keys where item_id=$2', [item, id(721)]);
    await db.query('insert into item_options select $1,option_key,content_hy,display_order from item_options where item_id=$2', [item, id(721)]);
    await db.query('insert into assessment_form_items values($1,$2)', [FORMS[f], item]);
  }
  // Today's Chapter II rule as a v1 policy on the existing blueprint.
  const v1 = (await db.query("select configuration_snapshot->'assessmentPolicy' p from assessment_blueprints where id=$1", [OLD_BP])).rows[0].p;
  Object.assign(v1, { plannedQuestionCount: 16, questionCountBySkill: Object.fromEntries(SKILLS.map(s => [s, 2])), minimumPercent: 80, minimumCorrectBySkill: Object.fromEntries(SKILLS.map(s => [s, 1])) });
  await setPolicy(db, OLD_BP, v1);
  return v1;
}
async function setPolicy(db, blueprint, policy) {
  await db.query("update assessment_blueprints set configuration_snapshot=jsonb_set(configuration_snapshot,'{assessmentPolicy}',$2) where id=$1", [blueprint, JSON.stringify(policy)]);
  await db.query("update learning_model_configurations set configuration=jsonb_set(configuration,'{assessmentPolicyContracts}',configuration->'assessmentPolicyContracts'||jsonb_build_array($2::jsonb)) where id=$1", [id(611), JSON.stringify(policy)]);
}
// II-2 as a second mastery blueprint in the same release and unit, reusing the same audited forms and pool.
async function activateII2(db, v1) {
  const v2 = {
    ...structuredClone(v1), schemaVersion: 'haiedu-assessment-policy-v2', version: 2, deliveredSkillIds: SKILLS,
    scoredSkillIds: SCORED, readinessSkillIds: SCORED, minimumCorrectBySkill: Object.fromEntries(SCORED.map(s => [s, 1])),
    reportingGroups: [
      { key: 'mandatory', label: 'Պարտադիր վերջնարդյունքներ', skillIds: [S.S02, S.S04, S.S05, S.S06, S.S08] },
      { key: 'supporting', label: 'Օժանդակ հմտություններ', skillIds: [S.S03] },
      { key: 'additional', label: 'Լրացուցիչ վերջնարդյունքներ', skillIds: [S.S07, S.S09] },
    ],
  };
  assert.deepEqual(readAssessmentPolicy({ assessmentPolicy: v2 }, v2), v2, 'the shared JS reader accepts the II-2 policy');
  await db.query("insert into assessment_blueprints select $1,curriculum_release_id,unit_id,assessment_pool_id,purpose,status,configuration_snapshot from assessment_blueprints where id=$2", [NEW_BP, OLD_BP]);
  await db.query('insert into assessment_blueprint_items select $1,item_id,item_version_snapshot from assessment_blueprint_items where assessment_blueprint_id=$2', [NEW_BP, OLD_BP]);
  await setPolicy(db, NEW_BP, v2);
  return v2;
}
const launchOn = async (db, blueprint, mode = 'mastery_check') => (await db.query('select service_launch_governed_learning($1,$2,$3,$4,$5,$6,$7) result', [id(10), id(401), id(371), blueprint, null, null, false])).rows[0].result;
const resume = async (db, mode = 'mastery_check') => (await db.query('select service_resume_governed_learning($1,$2,$3,$4,$5,$6) result', [id(10), id(401), id(371), id(501), id(511), mode])).rows[0].result;
const state = async db => (await db.query("select lifecycle_state,attempts_used from chapter_mastery_states where student_id=$1", [id(10)])).rows[0];
const items = async (db, session) => (await db.query('select item_id from learning_session_items where session_id=$1', [session])).rows.map(r => r.item_id);
const review = async db => { const r = await launch(db, 0, 'chapter_review'); await finish(db, r.session.id, false); return r.session.id; };
const baseline = async db => { const d = await launch(db); await finish(db, d.session.id); };

test('II-2: a new student is admitted on the six required skills and passes 10/12 with S07 and S09 wrong', async () => {
  const db = await database(); try {
    const v1 = await chapterTwo(db); await baseline(db);
    await makeReady(db, SCORED);
    await assert.rejects(launchOn(db, OLD_BP), /skills_not_ready/, 'today: S07 and S09 must also be ready');
    await activateII2(db, v1);
    const start = await launchOn(db, NEW_BP);
    assert.equal(start.session.mastery_attempt_number, 1);
    const result = await finishBySkill(db, start.session.id, quotas(STRONG_REQUIRED));
    const r = result.finalResult;
    assert.equal(r.passed, true); assert.equal(r.score.correct, 10); assert.equal(r.score.answered, 12);
    assert.equal(r.overallScore.correct, 10); assert.equal(r.overallScore.answered, 16);
    assert.deepEqual(r.groups.map(g => [g.key, g.correct, g.answered, g.determinesPass]), [['mandatory', 8, 10, true], ['supporting', 2, 2, true], ['additional', 0, 4, false]]);
    assert.equal((await state(db)).lifecycle_state, 'mastery_passed');
    await assert.rejects(launchOn(db, NEW_BP), /mastery_check_not_allowed/, 'no attempt after a pass (two forms remain)');
  } finally { await db.close(); }
});

test('II-2: 9/12 fails, and a required skill with zero correct fails even at 10/12', async () => {
  for (const [counts, why] of [[[2, 2, 1, 1, 2, 2, 1, 2], '9/12 with S07 and S09 perfect'], [[2, 2, 2, 2, 0, 2, 2, 2], '10/12 with S06 at 0/2']]) {
    const db = await database(); try {
      const v1 = await chapterTwo(db); await baseline(db); await makeReady(db, SKILLS); await activateII2(db, v1);
      const r = (await finishBySkill(db, (await launchOn(db, NEW_BP)).session.id, quotas(counts))).finalResult;
      assert.equal(r.passed, false, why);
    } finally { await db.close(); }
  }
});

test('II-2: a check already open at activation finishes under its original rule', async () => {
  const db = await database(); try {
    const v1 = await chapterTwo(db); await baseline(db); await makeReady(db, SKILLS);
    const open = await launchOn(db, OLD_BP);
    await activateII2(db, v1);
    const resumed = await resume(db);
    assert.equal(resumed.resumed, true); assert.equal(resumed.session.id, open.session.id, 'the open check resumes, not a new one');
    const bound = (await db.query('select assessment_policy_binding_id,assessment_blueprint_id from learning_sessions where id=$1', [open.session.id])).rows[0];
    assert.equal(bound.assessment_blueprint_id, OLD_BP);
    const again = await launchOn(db, NEW_BP);
    assert.equal(again.resumed, true); assert.equal(again.session.id, open.session.id, 'starting again returns the same open check');
    assert.equal((await db.query("select count(*)::int n from learning_sessions where student_id=$1 and mode='mastery_check'", [id(10)])).rows[0].n, 1, 'no second check is created');
    const r = (await finishBySkill(db, open.session.id, quotas(STRONG_REQUIRED))).finalResult;
    assert.equal(r.passed, false, 'scored by today’s rule: 10/16 and S07, S09 at zero');
    assert.equal(r.schemaVersion, undefined, 'v1 result shape, no reporting groups');
    assert.equal((await state(db)).lifecycle_state, 'review_required_attempt_2');
  } finally { await db.close(); }
});

test('II-2: a student between attempts keeps attempts used, the required review and question-reuse limits', async () => {
  const db = await database(); try {
    const v1 = await chapterTwo(db); await baseline(db); await makeReady(db, SKILLS);
    const first = await launchOn(db, OLD_BP);
    await finishBySkill(db, first.session.id, quotas([1, 1, 1, 1, 1, 1, 1, 1])); // 8/16: fails today's rule
    assert.deepEqual(await state(db), { lifecycle_state: 'review_required_attempt_2', attempts_used: 1 });
    await activateII2(db, v1);
    await assert.rejects(launchOn(db, NEW_BP), /mastery_check_not_allowed/, 'the required review still stands under the new rule');
    await review(db);
    assert.equal((await state(db)).lifecycle_state, 'mastery_retry_2_ready');
    const second = await launchOn(db, NEW_BP);
    assert.equal(second.session.mastery_attempt_number, 2, 'attempt numbering continues');
    assert.notEqual(second.session.metadata.assessmentFormId, first.session.metadata.assessmentFormId, 'a different form');
    const seen = new Set(await items(db, first.session.id));
    assert.ok((await items(db, second.session.id)).every(i => !seen.has(i)), 'no question from attempt 1 is reused');
    const r2 = (await finishBySkill(db, second.session.id, quotas([1, 1, 1, 1, 1, 2, 1, 2]))).finalResult; // 6/12 scored
    assert.equal(r2.passed, false); assert.equal(r2.score.answered, 12);
    assert.deepEqual(await state(db), { lifecycle_state: 'review_required_attempt_3', attempts_used: 2 });
    await review(db);
    const third = await launchOn(db, NEW_BP);
    assert.equal(third.session.mastery_attempt_number, 3);
    const used = new Set([...seen, ...await items(db, second.session.id)]);
    assert.ok((await items(db, third.session.id)).every(i => !used.has(i)), 'no question from attempts 1–2 is reused');
    const r3 = (await finishBySkill(db, third.session.id, quotas(STRONG_REQUIRED))).finalResult;
    assert.equal(r3.passed, true, 'attempt 3 is scored by II-2');
    assert.deepEqual(await state(db), { lifecycle_state: 'mastery_passed', attempts_used: 3 });
    await assert.rejects(launchOn(db, NEW_BP), /mastery_check_not_allowed|governed_mastery_forms_exhausted/, 'no attempt after a pass; with all three forms used today’s system also reports forms exhausted');
  } finally { await db.close(); }
});

test('II-2: the three-attempt limit still holds after activation', async () => {
  const db = await database(); try {
    const v1 = await chapterTwo(db, { forms: 4 }); await baseline(db); await makeReady(db, SKILLS);
    const first = await launchOn(db, OLD_BP); await finishBySkill(db, first.session.id, quotas([0, 0, 0, 0, 0, 0, 0, 0]));
    await activateII2(db, v1);
    for (const n of [2, 3]) { await review(db); const s = await launchOn(db, NEW_BP); assert.equal(s.session.mastery_attempt_number, n); await finishBySkill(db, s.session.id, quotas([0, 0, 0, 0, 0, 0, 0, 0])); }
    assert.deepEqual(await state(db), { lifecycle_state: 'mastery_failed_final', attempts_used: 3 });
    await assert.rejects(launchOn(db, NEW_BP), /mastery_check_not_allowed/);
  } finally { await db.close(); }
});
