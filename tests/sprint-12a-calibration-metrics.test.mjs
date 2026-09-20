import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Sprint 12A.3 defines an immutable versioned calibration metric set", async () => {
  const sql = await read("supabase/migrations/0047_sprint_12a_calibration_metric_set.sql");

  assert.match(sql, /create table if not exists public\.calibration_metric_sets/);
  assert.match(sql, /'haiedu_learning_model_calibration_metrics'/);
  assert.match(sql, /'metrics-2026-09-20-r1'/);
  assert.match(sql, /reject_calibration_metric_set_mutation/);
  assert.match(sql, /before update or delete on public\.calibration_metric_sets/);
});

test("metric set covers the Sprint 12 calibration targets", async () => {
  const sql = await read("supabase/migrations/0047_sprint_12a_calibration_metric_set.sql");

  for (const metric of [
    "mastery_evidence_to_secure",
    "practice_burden",
    "recent_recovery_stability",
    "hint_assistance_effect",
    "diagnostic_predictive_alignment",
    "mastery_check_outcome",
    "mastery_check_skill_failure",
    "recommendation_path_accuracy",
    "item_difficulty_response_time",
    "repeat_pool_exhaustion_influence",
    "threshold_sensitivity",
  ]) {
    assert.match(sql, new RegExp(`'${metric}'`));
  }
});

test("sample-size rules always expose denominators and prevent sparse tuning claims", async () => {
  const sql = await read("supabase/migrations/0047_sprint_12a_calibration_metric_set.sql");

  assert.match(sql, /'distinctLearners', 10/);
  assert.match(sql, /'relevantObservations', 30/);
  assert.match(sql, /'minimumDistinctLearners', 5/);
  assert.match(sql, /'minimumAttempts', 10/);
  assert.match(sql, /'reportNumeratorAndDenominator', true/);
  assert.match(sql, /'wilson_95_percent_when_computed'/);
  assert.match(sql, /'insufficientEvidenceDisposition', 'no_change_or_defer'/);
  assert.match(sql, /not sufficient for approval or validation/i);
});

test("hint comparisons are observational and recommendation accuracy remains an explicit instrumentation gap", async () => {
  const sql = await read("supabase/migrations/0047_sprint_12a_calibration_metric_set.sql");

  assert.match(sql, /'causalClaimAllowed', false/);
  assert.match(sql, /'measurability', 'instrumentation_gap'/);
  assert.match(sql, /no durable recommendation-event history/i);
});

test("mastery replay uses frozen version provenance rather than mutable current item state", async () => {
  const sql = await read("supabase/migrations/0047_sprint_12a_calibration_metric_set.sql");

  assert.match(sql, /blueprint-frozen item version difficulty/i);
  assert.match(sql, /Use blueprint-frozen item version identity/);
});
