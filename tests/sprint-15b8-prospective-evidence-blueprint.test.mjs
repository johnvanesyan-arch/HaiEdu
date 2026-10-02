import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261002070000_sprint_15b8_prospective_evidence_blueprint.sql",
  "utf8",
);
const qualityFunction = readFileSync(
  "supabase/functions/manage-content-quality/index.ts",
  "utf8",
);
const uniquePurposeCorrection = readFileSync(
  "supabase/migrations/20261002073000_sprint_15b8_unique_evidence_flag.sql",
  "utf8",
);
const policy = readFileSync("docs/assessment-evidence-blueprint-policy.md", "utf8");
const reviewerUi = readFileSync("web/content.js", "utf8");
const spec = readFileSync(
  "docs/sprint-15b8-physics7-chapter-ii-sixth-item-family.md",
  "utf8",
);

test("adoption is prospective and preserves legacy templates", () => {
  assert.match(migration, /created_at < '2026-10-02 07:00:00\+00'/);
  assert.match(migration, /item_templates_prospective_evidence_blueprint_check/);
  assert.match(policy, /existing templates, items, versions, approvals and learner evidence are unchanged/i);
  assert.match(policy, /legacy templates remain valid without modification/i);
});

test("new templates and items declare the shared authoring profile", () => {
  assert.match(migration, /haiedu-evidence-blueprint-v1/);
  assert.match(migration, /distinct-purpose-v1/);
  assert.match(migration, /requiredEvidencePurposes/);
  assert.match(migration, /enforce_prospective_item_evidence_purpose/);
  assert.match(migration, /prospective_authoring_profile_missing/);
  assert.match(migration, /prospective_evidence_purpose_invalid/);
  assert.match(migration, /15B8_prospective_item_rejection_probe_failed/);
});

test("family QA verifies coverage while allowing justified larger families", () => {
  assert.match(qualityFunction, /family_evidence_blueprint_incomplete/);
  assert.match(qualityFunction, /family_evidence_purpose_missing/);
  assert.match(qualityFunction, /family_evidence_purpose_invalid/);
  assert.match(qualityFunction, /enforceUniqueEvidencePurposes === true/);
  assert.match(qualityFunction, /family_evidence_purpose_duplicate/);
  assert.match(qualityFunction, /evidenceBlueprintVerification/);
  assert.match(policy, /Larger or otherwise justified families may repeat a purpose/);
  assert.match(uniquePurposeCorrection, /enforceUniqueEvidencePurposes/);
  assert.match(uniquePurposeCorrection, /15B8_unique_evidence_template_flag_failed/);
});

test("approval revalidates the live family instead of trusting stale QA", () => {
  assert.match(qualityFunction, /const liveApprovalQa = await evaluateQa\(admin, item\)/);
  assert.match(qualityFunction, /familyStateFingerprint/);
  assert.match(qualityFunction, /storedFamilyStateFingerprint !== liveFamilyStateFingerprint/);
  assert.match(qualityFunction, /family_state_changed_since_qa/);
  assert.match(qualityFunction, /requiresQaRerun: true/);
  assert.match(policy, /deterministic family-state fingerprint/);
  assert.match(reviewerUi, /Հարցերի ընտանիքը փոխվել է վերջին QA-ից հետո/);
  assert.match(reviewerUi, /Կրկին գործարկեք QA-ն/);
  assert.match(reviewerUi, /family_evidence_blueprint_incomplete/);
});

test("sixth family targets the direct S07 programme outcome", () => {
  assert.match(migration, /PHY7-U02-S07-F01-DIFFUSION-RATE-COMPARISON/);
  assert.match(migration, /PHY7-U02-S07-T01-COMPARE-DIFFUSION-RATES/);
  assert.match(migration, /skill\.code = 'PHY7-U02-S07'/);
  assert.match(migration, /'new_family', 'direct'/);
  assert.match(migration, /Լրացուցիչ 2\(1\)/);
});

test("four items cover four distinct evidence purposes", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.match(migration, new RegExp(`PHY7-U02-S07-I0${index}`));
  }
  for (const purpose of [
    "core_understanding",
    "application",
    "misconception_diagnosis",
    "transfer_reasoning",
  ]) {
    assert.match(migration, new RegExp(`'${purpose}'`));
  }
  assert.match(migration, /'enforceUniqueEvidencePurposes', true/);
  assert.match(migration, /15B8_evidence_purpose_coverage_failed/);
});

test("item mix and answer positions are governed", () => {
  assert.match(migration, /15B8_single_choice_count_failed/);
  assert.match(migration, /15B8_true_false_count_failed/);
  assert.match(migration, /\('PHY7-U02-S07-I01', 'A'\)/);
  assert.match(migration, /\('PHY7-U02-S07-I02', 'B'\)/);
  assert.match(migration, /\('PHY7-U02-S07-I04', 'C'\)/);
  assert.match(migration, /to_jsonb\(false\)/);
  assert.match(migration, /'shuffleOptions', true/);
});

test("source boundary covers rate comparison but excludes temperature effects", () => {
  const authoredQuestions = migration.slice(
    migration.indexOf("with item_rows("),
    migration.indexOf("with option_rows("),
  );
  assert.match(authoredQuestions, /գազերում, հեղուկներում և պինդ մարմիններում/);
  assert.match(authoredQuestions, /5 տարում/);
  assert.match(authoredQuestions, /1 մմ/);
  assert.match(migration, /մոլեկուլների միջև հեռավորություններն ավելի մեծ/);
  assert.doesNotMatch(authoredQuestions, /ջերմաստիճանի բարձրաց/i);
  assert.match(migration, /S08_temperature_speed_relation/);
  assert.match(migration, /S09_thermometer_operation/);
});

test("misconception mappings, history and learner isolation are complete", () => {
  assert.match(migration, /'misconceptionMappingPolicy', 'all_distractors'/);
  assert.match(migration, /15B8_mapping_count_failed/);
  assert.match(migration, /if v_count <> 10/);
  assert.match(migration, /15B8_fingerprint_contract_failed/);
  assert.match(migration, /15B8_version_snapshot_failed/);
  assert.match(migration, /insert into public\.remediation_guide_authoring_versions/);
  assert.match(migration, /'learnerVisible', false/);
});

test("slice cannot create learner assessment delivery", () => {
  assert.doesNotMatch(migration, /insert into public\.assessment_pools\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items\b/i);
  assert.doesNotMatch(migration, /insert into public\.assessment_blueprints\b/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'(pilot|production)'/i);
  assert.match(migration, /15B8_pool_boundary_failed/);
  assert.match(migration, /15B8_blueprint_boundary_failed/);
  assert.match(migration, /15B8_release_boundary_failed/);
});

test("implementation record states the review and release boundaries", () => {
  assert.match(spec, /սովորողին անհասանելի/);
  assert.match(spec, /լրացուցիչ վերջնարդյունք 2\(1\)/);
  assert.match(spec, /S08/);
  assert.match(spec, /S09/);
  assert.match(spec, /չի ստեղծում գնահատման ավազան/);
  assert.match(spec, /Արտաքին մասնագիտական ստուգումը նույնպես մնում է սպասման մեջ/);
});
