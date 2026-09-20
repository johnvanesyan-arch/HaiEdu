import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Sprint 12A.2 defines an immutable calibration evidence contract", async () => {
  const sql = await read("supabase/migrations/0046_sprint_12a_calibration_evidence_contract.sql");

  assert.match(sql, /create table if not exists public\.calibration_evidence_contracts/);
  assert.match(sql, /'haiedu_formal_calibration_evidence'/);
  assert.match(sql, /'contract-2026-09-20-r1'/);
  assert.match(sql, /reject_calibration_evidence_contract_mutation/);
  assert.match(sql, /before update or delete on public\.calibration_evidence_contracts/);
  assert.match(sql, /contract_fingerprint text generated always as/);
});

test("core calibration is fail-closed on authorization, cohort, release, blueprint and completion", async () => {
  const sql = await read("supabase/migrations/0046_sprint_12a_calibration_evidence_contract.sql");

  assert.match(sql, /'participation_authorized'/);
  assert.match(sql, /'cohort_enrolled'/);
  assert.match(sql, /'pilotEntryReadyRequired', true/);
  assert.match(sql, /'classificationRequired', 'compatible'/);
  assert.match(sql, /'reasonCodeRequired', 'exact_release_completed'/);
  assert.match(sql, /'sessionStatusRequired', 'completed'/);
  assert.match(sql, /'sessionProvenanceStatusRequired', 'exact'/);
  assert.match(sql, /'blueprintReleaseMustMatchSessionRelease', true/);
  assert.match(sql, /'parameterFittingAllowed', true/);
});

test("QA, outside-cohort, legacy and unresolved evidence cannot fit parameters", async () => {
  const sql = await read("supabase/migrations/0046_sprint_12a_calibration_evidence_contract.sql");

  for (const reason of [
    "legacy_context_only",
    "release_mismatch",
    "qa_artifact",
    "participation_not_authorized",
    "outside_cohort",
    "manual_review_required",
  ]) {
    assert.match(sql, new RegExp(`'${reason}'`));
  }
  assert.match(sql, /'deliberate_content_reviewer_behavior'/);
  assert.match(sql, /'automation_or_qa_artifact'/);
});

test("noncompleted authorized evidence is descriptive-only, not parameter-fitting evidence", async () => {
  const sql = await read("supabase/migrations/0046_sprint_12a_calibration_evidence_contract.sql");

  assert.match(sql, /'descriptive_only'/);
  assert.match(sql, /'exact_release_noncompleted'/);
  assert.match(sql, /'noncompletedMayBeDescriptiveOnly', true/);
  assert.match(sql, /'abandonedOrActiveNeverParameterFitting', true/);
});

test("hint/help and exposure evidence remain distinguishable rather than silently discarded", async () => {
  const sql = await read("supabase/migrations/0046_sprint_12a_calibration_evidence_contract.sql");

  assert.match(sql, /'retainHintHelpUse', true/);
  assert.match(sql, /'retainExposureHistory', true/);
  assert.match(sql, /'hintedAttemptsExcludedByDefault', false/);
  assert.match(sql, /'independentAndAssistedPerformanceMustRemainDistinguishable', true/);
  assert.match(sql, /'currentMutableItemStatusMayRetroactivelyExcludeEvidence', false/);
});
