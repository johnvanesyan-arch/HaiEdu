import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001190000_sprint_15b7_fifth_item_family.sql",
  "utf8",
);

const spec = readFileSync(
  "docs/sprint-15b7-physics7-chapter-ii-fifth-item-family.md",
  "utf8",
);

test("fifth family targets the direct S06 diffusion outcome", () => {
  assert.match(migration, /PHY7-U02-S06-F01-DIFFUSION-EXAMPLES/);
  assert.match(migration, /PHY7-U02-S06-T01-EXPLAIN-DIFFUSION/);
  assert.match(migration, /skill\.code = 'PHY7-U02-S06'/);
  assert.match(migration, /'new_family', 'direct'/);
  assert.match(migration, /Պարտադիր 1\(4\)/);
  assert.doesNotMatch(migration, /պարտադիր վերջնարդյունք 1\(3\)/i);
});

test("family contains four source-backed fixed catalogue items", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.match(migration, new RegExp(`PHY7-U02-S06-I0${index}`));
  }
  assert.match(migration, /'fixed'/);
  assert.match(migration, /'generationMode', 'authored_parallel_catalog'/);
  assert.match(migration, /'qaContract', 'authored_fixed_catalogue'/);
  assert.match(
    migration,
    /Ֆիզիկա 7 \(2023\), Գլուխ II, §10, տպագիր էջեր 30-32, նկարներ 30-31/,
  );
  assert.match(
    migration,
    /d8404d572f145d4afe924d0b8af900b3d9ed085a37893594667ab07a2ec12904/,
  );
});

test("questions stay within the diffusion-through-examples construct", () => {
  assert.match(migration, /ճիշտ սահմանում դիֆուզիան/);
  assert.match(migration, /Պղնձարջասպի կապույտ լուծույթը/);
  assert.match(migration, /աղը հայտնվում է նաև բանջարեղենի ներսում/);
  assert.match(migration, /թթվածինը օդից անցնում է արյան մեջ/);
  assert.match(migration, /ինքնաբերական խառնում/);
  assert.match(migration, /մոլեկուլների անկանոն շարժման պատճառով/);
});

test("family explicitly excludes later diffusion and thermometer skills", () => {
  const authoredContent = migration.slice(
    migration.indexOf("with item_rows("),
    migration.indexOf("insert into public.item_answer_keys"),
  );
  assert.match(migration, /S07_state_rate_comparison/);
  assert.match(migration, /S08_temperature_speed_relation/);
  assert.match(migration, /S09_thermometer_operation/);
  assert.doesNotMatch(authoredContent, /արագությունների համեմատ/i);
  assert.doesNotMatch(authoredContent, /ջերմաստիճանի/i);
  assert.doesNotMatch(authoredContent, /ջերմաչափ/i);
});

test("canonical keys are balanced and serving shuffle remains enabled", () => {
  assert.match(migration, /\('PHY7-U02-S06-I01', 'A'\)/);
  assert.match(migration, /\('PHY7-U02-S06-I02', 'B'\)/);
  assert.match(migration, /\('PHY7-U02-S06-I03', 'C'\)/);
  assert.match(migration, /\('PHY7-U02-S06-I04', 'D'\)/);
  assert.match(migration, /'shuffleOptions', true/);
  assert.match(migration, /'answerPositionQaContract', 'family-balanced-v1'/);
  assert.match(migration, /15B7_answer_position_balance_failed/);
});

test("all distractors use the strict misconception mapping policy", () => {
  assert.match(migration, /'misconceptionMappingPolicy', 'all_distractors'/);
  assert.match(migration, /insert into public\.misconceptions/);
  assert.match(migration, /diffusion_requires_external_mixing/);
  assert.match(migration, /diffusion_is_bulk_layer_motion/);
  assert.match(migration, /diffusion_without_particle_transfer/);
  assert.match(migration, /diffusion_is_phase_or_chemical_change/);
  assert.match(migration, /insert into public\.item_misconception_mappings/);
  assert.match(migration, /15B7_mapping_count_failed/);
  assert.match(migration, /if v_count <> 12/);
});

test("semantic fingerprints cover complete assessable content", () => {
  assert.match(migration, /item\.skill_id::text[\s\S]*regexp_replace\(item\.prompt_hy/);
  assert.match(migration, /answer_key\.answer::text/);
  assert.match(migration, /'optionKey'[\s\S]*'contentHy'/);
  assert.match(migration, /order by option_row\.display_order, option_row\.option_key/);
  assert.match(migration, /15B7_fingerprint_contract_failed/);
  assert.match(migration, /15B7_fingerprint_uniqueness_failed/);
  assert.match(migration, /15B7_version_snapshot_failed/);
});

test("draft guide is versioned, scope-correct and learner inactive", () => {
  assert.match(migration, /insert into public\.item_template_remediation_guides/);
  assert.match(migration, /insert into public\.remediation_guide_authoring_versions/);
  assert.match(migration, /Ինչպե՞ս բացատրել դիֆուզիան օրինակով/);
  assert.match(migration, /'triggerErrorCode', null/);
  assert.doesNotMatch(migration, /'misconceptionCode'/);
  assert.match(migration, /'learnerVisible', false/);
  assert.match(migration, /guide\.status = 'draft'/);
  assert.match(migration, /15B7_guide_version_failed/);
});

test("slice cannot create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'(pilot|production)'/i);
  assert.match(migration, /15B7_pool_boundary_failed/);
  assert.match(migration, /15B7_blueprint_boundary_failed/);
  assert.match(migration, /15B7_release_boundary_failed/);
});

test("implementation record states content and release boundaries", () => {
  assert.match(spec, /սովորողին անհասանելի/);
  assert.match(spec, /պարտադիր վերջնարդյունք 1\(4\)/);
  assert.match(spec, /S07/);
  assert.match(spec, /S08/);
  assert.match(spec, /S09/);
  assert.match(spec, /չի ստեղծում գնահատման ավազան/);
  assert.match(spec, /արտաքին մասնագիտական ստուգումը մնում է սպասման մեջ/);
  assert.match(spec, /Բովանդակային վերանայում/);
});
