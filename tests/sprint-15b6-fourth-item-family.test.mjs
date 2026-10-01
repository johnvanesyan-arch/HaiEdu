import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001183000_sprint_15b6_fourth_item_family.sql",
  "utf8",
);

const spec = readFileSync(
  "docs/sprint-15b6-physics7-chapter-ii-fourth-item-family.md",
  "utf8",
);

test("fourth family targets the direct S05 molecular-motion outcome", () => {
  assert.match(migration, /PHY7-U02-S05-F01-CONTINUOUS-CHAOTIC-MOTION/);
  assert.match(migration, /PHY7-U02-S05-T01-DESCRIBE-PARTICLE-MOTION/);
  assert.match(migration, /skill\.code = 'PHY7-U02-S05'/);
  assert.match(migration, /'new_family', 'direct'/);
  assert.match(migration, /Պարտադիր 1\(3\)/);
});

test("family contains four source-backed fixed catalogue items", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.match(migration, new RegExp(`PHY7-U02-S05-I0${index}`));
  }
  assert.match(migration, /'fixed'/);
  assert.match(migration, /'generationMode', 'authored_parallel_catalog'/);
  assert.match(migration, /'qaContract', 'authored_fixed_catalogue'/);
  assert.match(
    migration,
    /Ֆիզիկա 7 \(2023\), Գլուխ II, §10, տպագիր էջեր 30-33, Խնդիր 3՝ էջ 40/,
  );
  assert.match(
    migration,
    /when row\.difficulty <= 1 then 'foundation'[\s\S]*when row\.difficulty <= 3 then 'core'[\s\S]*else 'challenge'/,
  );
});

test("questions stay within the continuous-chaotic-motion construct", () => {
  assert.match(migration, /անընդհատ շարժվում են ամենատարբեր ուղղություններով/);
  assert.match(migration, /անկանոն բախվում է օդի մոլեկուլներին/);
  assert.match(migration, /բազմաթիվ կարճ հատվածներից կազմված բեկյալ ճանապարհ/);
  assert.match(migration, /վայրկյանում մի քանի հարյուր մետր արագությամբ/);
  assert.match(migration, /ուղիղ կարճ ճանապարհը դառնում է երկար բեկյալ ճանապարհ/);
  assert.doesNotMatch(migration, /դիֆուզիայի արագությունը գազերում, հեղուկներում և պինդ/);
});

test("canonical keys are balanced and serving shuffle remains enabled", () => {
  assert.match(migration, /\('PHY7-U02-S05-I01', 'A'\)/);
  assert.match(migration, /\('PHY7-U02-S05-I02', 'B'\)/);
  assert.match(migration, /\('PHY7-U02-S05-I03', 'C'\)/);
  assert.match(migration, /\('PHY7-U02-S05-I04', 'D'\)/);
  assert.match(migration, /'shuffleOptions', true/);
  assert.match(migration, /'answerPositionQaContract', 'family-balanced-v1'/);
  assert.match(migration, /15B6_answer_position_balance_failed/);
});

test("all distractors use the strict misconception mapping policy", () => {
  assert.match(migration, /'misconceptionMappingPolicy', 'all_distractors'/);
  assert.match(migration, /insert into public\.misconceptions/);
  assert.match(migration, /insert into public\.item_misconception_mappings/);
  assert.match(migration, /15B6_mapping_count_failed/);
  assert.match(migration, /if v_count <> 12/);
});

test("semantic fingerprints cover complete assessable content", () => {
  assert.match(migration, /item\.skill_id::text[\s\S]*regexp_replace\(item\.prompt_hy/);
  assert.match(migration, /answer_key\.answer::text/);
  assert.match(migration, /'optionKey'[\s\S]*'contentHy'/);
  assert.match(migration, /order by option_row\.display_order, option_row\.option_key/);
  assert.match(migration, /15B6_fingerprint_contract_failed/);
  assert.match(migration, /15B6_fingerprint_uniqueness_failed/);
});

test("draft guide is versioned, scope-correct and learner inactive", () => {
  assert.match(migration, /insert into public\.item_template_remediation_guides/);
  assert.match(migration, /insert into public\.remediation_guide_authoring_versions/);
  assert.match(migration, /Ինչպե՞ս նկարագրել մասնիկների անկանոն շարժումը/);
  assert.match(migration, /'triggerErrorCode', null/);
  assert.doesNotMatch(migration, /'misconceptionCode'/);
  assert.match(migration, /'learnerVisible', false/);
  assert.match(migration, /guide\.status = 'draft'/);
  assert.match(migration, /15B6_guide_version_failed/);
});

test("slice cannot create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'(pilot|production)'/i);
  assert.match(migration, /15B6_pool_boundary_failed/);
  assert.match(migration, /15B6_blueprint_boundary_failed/);
  assert.match(migration, /15B6_release_boundary_failed/);
});

test("implementation record states the review and release boundaries", () => {
  assert.match(spec, /սովորողին անհասանելի/);
  assert.match(spec, /չի ստեղծում գնահատման ավազան/);
  assert.match(spec, /արտաքին մասնագիտական ստուգումը մնում է սպասման մեջ/);
  assert.match(spec, /Բովանդակային վերանայում/);
});
