import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001153000_sprint_15b5_third_item_family.sql",
  "utf8",
);

const spec = readFileSync(
  "docs/sprint-15b5-physics7-chapter-ii-third-item-family.md",
  "utf8",
);

test("third family targets the direct S04 molecular-size outcome", () => {
  assert.match(migration, /PHY7-U02-S04-F01-MOLECULAR-SCALE-MEASUREMENT/);
  assert.match(migration, /PHY7-U02-S04-T01-SCALE-COMPARE-MEASURE/);
  assert.match(migration, /skill\.code = 'PHY7-U02-S04'/);
  assert.match(migration, /'new_family', 'direct'/);
  assert.match(migration, /Պարտադիր 1\(2\)/);
});

test("family contains four source-backed fixed catalogue items", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.match(migration, new RegExp(`PHY7-U02-S04-I0${index}`));
  }
  assert.match(migration, /'fixed'/);
  assert.match(migration, /'generationMode', 'authored_parallel_catalog'/);
  assert.match(migration, /'qaContract', 'authored_fixed_catalogue'/);
  assert.match(migration, /Ֆիզիկա 7 \(2023\), Գլուխ II, §8-9, տպագիր էջեր 27-29/);
  assert.match(
    migration,
    /when row\.difficulty <= 1 then 'foundation'[\s\S]*when row\.difficulty <= 3 then 'core'[\s\S]*else 'challenge'/,
  );
});

test("questions cover unit, comparison, scale and row-measurement reasoning", () => {
  assert.match(migration, /1 Å \(անգստրեմ\)/);
  assert.match(migration, /2,5 Å[\s\S]*2,8 Å[\s\S]*3,6 Å/);
  assert.match(migration, /դառնա Երկրագնդի չափ/);
  assert.match(migration, /24 միատեսակ փոքր գնդիկների[\s\S]*48 մմ/);
  assert.match(migration, /'2 մմ'/);
});

test("all distractors use the strict misconception mapping policy", () => {
  assert.match(migration, /'misconceptionMappingPolicy', 'all_distractors'/);
  assert.match(migration, /insert into public\.misconceptions/);
  assert.match(migration, /insert into public\.item_misconception_mappings/);
  assert.match(migration, /15B5_mapping_count_failed/);
  assert.match(migration, /if v_count <> 12/);
});

test("semantic fingerprints cover complete assessable content", () => {
  assert.match(migration, /item\.skill_id::text[\s\S]*regexp_replace\(item\.prompt_hy/);
  assert.match(migration, /answer_key\.answer::text/);
  assert.match(migration, /'optionKey'[\s\S]*'contentHy'/);
  assert.match(migration, /order by option_row\.display_order, option_row\.option_key/);
  assert.match(migration, /15B5_fingerprint_contract_failed/);
  assert.match(migration, /15B5_fingerprint_uniqueness_failed/);
});

test("draft guide is versioned, scope-correct and learner inactive", () => {
  assert.match(migration, /insert into public\.item_template_remediation_guides/);
  assert.match(migration, /insert into public\.remediation_guide_authoring_versions/);
  assert.match(migration, /Ինչպե՞ս գնահատել և համեմատել մոլեկուլների չափերը/);
  assert.match(migration, /'triggerErrorCode', null/);
  assert.doesNotMatch(migration, /'misconceptionCode'/);
  assert.match(migration, /'learnerVisible', false/);
  assert.match(migration, /guide\.status = 'draft'/);
});

test("slice cannot create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'(pilot|production)'/i);
  assert.match(migration, /15B5_pool_boundary_failed/);
  assert.match(migration, /15B5_blueprint_boundary_failed/);
  assert.match(migration, /15B5_release_boundary_failed/);
});

test("implementation record states the review and release boundaries", () => {
  assert.match(spec, /սովորողին անհասանելի/);
  assert.match(spec, /չի ստեղծում գնահատման ավազան/);
  assert.match(spec, /արտաքին մասնագիտական ստուգումը մնում է սպասման մեջ/);
  assert.match(spec, /Բովանդակային վերանայում/);
});
