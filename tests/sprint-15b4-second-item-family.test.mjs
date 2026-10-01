import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001140000_sprint_15b4_second_item_family.sql",
  "utf8",
);

const spec = readFileSync(
  "docs/sprint-15b4-physics7-chapter-ii-second-item-family.md",
  "utf8",
);

test("second family follows the approved S03 prerequisite sequence", () => {
  assert.match(migration, /PHY7-U02-S03-F01-ATOM-MOLECULE-ELEMENT/);
  assert.match(migration, /PHY7-U02-S03-T01-CLASSIFY/);
  assert.match(migration, /skill\.code = 'PHY7-U02-S03'/);
  assert.match(migration, /'new_family', 'derived_supporting'/);
  assert.match(migration, /atom_molecule_element_classification/);
});

test("family contains four source-backed fixed catalogue items", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.match(migration, new RegExp(`PHY7-U02-S03-I0${index}`));
  }
  assert.match(migration, /'fixed'/);
  assert.match(migration, /'generationMode', 'authored_parallel_catalog'/);
  assert.match(migration, /'qaContract', 'authored_fixed_catalogue'/);
  assert.match(migration, /Ֆիզիկա 7 \(2023\), Գլուխ II, §8, տպագիր էջեր 26-28/);
});

test("all distractors use the strict misconception mapping policy", () => {
  assert.match(migration, /'misconceptionMappingPolicy', 'all_distractors'/);
  assert.match(migration, /insert into public\.misconceptions/);
  assert.match(migration, /insert into public\.item_misconception_mappings/);
  assert.match(migration, /15B4_mapping_count_failed/);
  assert.match(migration, /if v_count <> 12/);
});

test("semantic fingerprints cover complete assessable content", () => {
  assert.match(migration, /item\.skill_id::text[\s\S]*regexp_replace\(item\.prompt_hy/);
  assert.match(migration, /answer_key\.answer::text/);
  assert.match(migration, /'optionKey'[\s\S]*'contentHy'/);
  assert.match(migration, /order by option_row\.display_order, option_row\.option_key/);
  assert.match(migration, /15B4_fingerprint_contract_failed/);
  assert.match(migration, /15B4_fingerprint_uniqueness_failed/);
});

test("draft guide is versioned and remains learner inactive", () => {
  assert.match(migration, /insert into public\.item_template_remediation_guides/);
  assert.match(migration, /insert into public\.remediation_guide_authoring_versions/);
  assert.match(migration, /Ինչպե՞ս տարբերակել ատոմը, մոլեկուլը և քիմիական տարրը/);
  assert.match(migration, /'learnerVisible', false/);
  assert.match(migration, /guide\.status = 'draft'/);
});

test("slice cannot create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'(pilot|production)'/i);
  assert.match(migration, /15B4_pool_boundary_failed/);
  assert.match(migration, /15B4_blueprint_boundary_failed/);
  assert.match(migration, /15B4_release_boundary_failed/);
});

test("implementation record states the human review boundary", () => {
  assert.match(spec, /սովորողին անհասանելի/);
  assert.match(spec, /չի ստեղծում գնահատման ավազան/);
  assert.match(spec, /արտաքին մասնագիտական ստուգումը մնում է սպասման մեջ/);
  assert.match(spec, /Բովանդակային վերանայում/);
});
