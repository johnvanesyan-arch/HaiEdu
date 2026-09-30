import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001004000_sprint_15b2_chapter_ii_first_item_family.sql",
  "utf8",
);

const qaFixMigration = readFileSync(
  "supabase/migrations/20261001005000_sprint_15b2_authored_catalogue_qa_fix.sql",
  "utf8",
);

test("skill-map review retires the duplicate and reuses the Chapter I prerequisite", () => {
  assert.match(migration, /set status = 'archived'::public\.content_status[\s\S]*code = 'PHY7-U02-S01'/);
  assert.match(migration, /prerequisite\.code = 'PHY7-U01-S02'/);
  assert.match(migration, /skill\.code = 'PHY7-U02-S02'/);
  assert.match(migration, /'approvedForAuthoringSkills', 8/);
  assert.match(migration, /'prerequisiteLinks', 8/);
  assert.match(migration, /gate\.gate_code = 'skills_mapped'/);
  assert.match(migration, /status = 'passed'/);
  assert.match(migration, /'externalSmeValidation', 'pending'/);
});

test("first governed family targets particulate-structure reasoning", () => {
  assert.match(migration, /PHY7-U02-S02-F01-PARTICULATE-EVIDENCE/);
  assert.match(migration, /PHY7-U02-S02-T01-EVIDENCE/);
  assert.match(migration, /'new_family', 'direct'/);
  assert.match(migration, /particulate_structure_from_evidence/);
  assert.match(migration, /Փորձարարական դիտումից նյութի մասնիկային կառուցվածքի եզրակացություն/);
});

test("family contains four source-backed, versioned draft variants", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.match(migration, new RegExp(`PHY7-U02-S02-I0${index}`));
  }
  assert.match(migration, /insert into public\.item_options/);
  assert.match(migration, /insert into public\.item_answer_keys/);
  assert.match(migration, /insert into public\.item_curriculum_scopes/);
  assert.match(migration, /insert into public\.item_versions/);
  assert.match(migration, /insert into public\.item_misconception_mappings/);
  assert.match(migration, /'draft'::public\.content_status/);
  assert.match(migration, /'needs_review'/);
  assert.match(migration, /'learnerVisible', false/);
  assert.match(migration, /'shuffleOptions', true/);
});

test("draft remediation remains in append-only authoring history", () => {
  assert.match(migration, /insert into public\.item_template_remediation_guides/);
  assert.match(migration, /insert into public\.remediation_guide_authoring_versions/);
  assert.match(migration, /'template'[\s\S]*'draft'/);
  assert.match(migration, /'system'[\s\S]*'system'/);
  assert.match(migration, /published_runtime_version/);
});

test("slice stays fail-closed and does not create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprint_items\b/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'(pilot|production)'/i);
  assert.match(migration, /'assessmentPools', 0/);
  assert.match(migration, /'assessmentBlueprints', 0/);
});

test("migration resolves database records by stable natural keys", () => {
  assert.doesNotMatch(
    migration,
    /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
  assert.match(migration, /reconciliation_key = 'physics7_u02_2026_08_14'/);
  assert.match(migration, /release_key = 'physics7_u01_u02_2026_08_14_candidate_r2'/);
});

test("authored catalogue uses the fixed-template QA contract", () => {
  assert.match(qaFixMigration, /template_kind = 'fixed'/);
  assert.match(qaFixMigration, /'generationMode', 'authored_parallel_catalog'/);
  assert.match(qaFixMigration, /'deterministicRerender', false/);
  assert.match(qaFixMigration, /'qaContract', 'authored_fixed_catalogue'/);
  assert.doesNotMatch(qaFixMigration, /variant_seed\s*=/);
});

test("semantic fingerprints cover skill, prompt, answer and ordered options", () => {
  assert.match(qaFixMigration, /item\.skill_id::text[\s\S]*regexp_replace\(item\.prompt_hy/);
  assert.match(qaFixMigration, /answer_key\.answer::text/);
  assert.match(qaFixMigration, /jsonb_build_object\([\s\S]*'optionKey'[\s\S]*'contentHy'/);
  assert.match(qaFixMigration, /order by option_row\.display_order, option_row\.option_key/);
  assert.match(qaFixMigration, /variant_fingerprint = corrected\.semantic_fingerprint/);
  assert.match(qaFixMigration, /version_no = greatest\(item\.version_no, 2\)/);
  assert.match(qaFixMigration, /insert into public\.item_versions/);
  assert.match(qaFixMigration, /version\.version_no = 2/);
});
