import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001071000_sprint_15b3_mapping_integrity_gate.sql",
  "utf8",
);
const privilegeMigration = readFileSync(
  "supabase/migrations/20261001072000_sprint_15b3_mapping_trigger_privileges.sql",
  "utf8",
);
const activationMigration = readFileSync(
  "supabase/migrations/20261001120500_sprint_15b3_activate_approved_misconceptions.sql",
  "utf8",
);
const qualityFunction = readFileSync(
  "supabase/functions/manage-content-quality/index.ts",
  "utf8",
);
const contentEditor = readFileSync("web/content.js", "utf8");

test("content revisions preserve omitted misconception mappings", () => {
  assert.match(migration, /if p_payload \? 'misconceptions' then/);
  assert.match(
    migration,
    /from public\.item_misconception_mappings mapping[\s\S]*where mapping\.item_id = v_item\.id/,
  );
});

test("pre-existing draft mappings survive the delete-and-reinsert cycle", () => {
  assert.match(migration, /same mapping was already attached before the delete above/);
  assert.match(migration, /mc\.status in \('active', 'draft'\)/);
});

test("clearing every existing mapping requires explicit confirmation", () => {
  assert.match(migration, /v_existing_mapping_count > 0/);
  assert.match(migration, /confirmEmptyMisconceptions/);
  assert.match(migration, /explicit_empty_misconception_confirmation_required/);
  assert.match(contentEditor, /removedAllMisconceptions/);
  assert.match(contentEditor, /window\.confirm/);
});

test("strict templates require every distractor to have a misconception mapping", () => {
  assert.match(migration, /'misconceptionMappingPolicy', 'all_distractors'/);
  assert.match(migration, /create or replace function public\.enforce_item_misconception_mapping_policy/);
  assert.match(migration, /raise exception 'misconception_mapping_incomplete:%'/);
  assert.match(migration, /create constraint trigger enforce_published_mapping_mutation_policy/);
  assert.match(migration, /raise exception 'published_misconception_mapping_incomplete:%'/);
  assert.match(qualityFunction, /misconceptionMappingPolicy === "all_distractors"/);
  assert.match(qualityFunction, /errors\.push\("misconception_mapping_incomplete"\)/);
  assert.match(qualityFunction, /missingMisconceptionResponseKeys/);
});

test("I03 correction restores mappings and returns only that item to review", () => {
  assert.match(migration, /PHY7-U02-S02-I03/);
  assert.match(migration, /Ո՞ր եզրակացությանն է աջակցում այս դիտարկումը։/);
  assert.match(migration, /'B', 'particle_identity_or_count_changes'/);
  assert.match(migration, /'C', 'particle_identity_or_count_changes'/);
  assert.match(migration, /'D', 'matter_as_continuous'/);
  assert.match(migration, /review_status = 'needs_review'/);
  assert.match(migration, /status = 'review'::public\.content_status/);
  assert.match(migration, /15B\.3 mapping-integrity restoration and Armenian wording correction/);
});

test("the correction does not create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprint_items\b/i);
});

test("mapping trigger functions are not exposed as client-callable RPCs", () => {
  for (const functionName of [
    "enforce_item_misconception_mapping_policy",
    "enforce_published_mapping_mutation_policy",
  ]) {
    assert.match(privilegeMigration, new RegExp(`revoke all on function public\\.${functionName}\\(\\)`));
  }
  assert.match(privilegeMigration, /from anon/);
  assert.match(privilegeMigration, /from authenticated/);
  assert.match(privilegeMigration, /to service_role/);
  assert.match(privilegeMigration, /15B3_trigger_function_privilege_revoke_failed/);
});

test("only the three approved first-family misconceptions are activated", () => {
  for (const code of [
    "matter_as_continuous",
    "particle_identity_or_count_changes",
    "particle_size_increases_on_heating",
  ]) {
    assert.match(activationMigration, new RegExp(`misconception\\.code = '${code}'`));
  }
  assert.match(activationMigration, /skill\.code = 'PHY7-U02-S02'/);
  assert.match(activationMigration, /status = 'active'/);
  assert.match(activationMigration, /v_definition_count <> 3/);
  assert.doesNotMatch(activationMigration, /update public\.misconceptions[\s\S]*where misconception\.status = 'draft'/);
});

test("misconception activation is gated on the complete four-item mapping matrix", () => {
  for (const itemCode of [
    "PHY7-U02-S02-I01",
    "PHY7-U02-S02-I02",
    "PHY7-U02-S02-I03",
    "PHY7-U02-S02-I04",
  ]) {
    assert.match(activationMigration, new RegExp(itemCode));
  }
  assert.match(activationMigration, /v_mapping_count <> 12/);
  assert.match(activationMigration, /having count\(mapping\.item_id\) = 3/);
  assert.match(activationMigration, /v_item_mapping_count <> 4/);
});

test("misconception approval does not create learner delivery", () => {
  assert.doesNotMatch(activationMigration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(activationMigration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(activationMigration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(activationMigration, /insert into public\.assessment_blueprint_items\b/i);
  assert.doesNotMatch(activationMigration, /update public\.items\b/i);
});
