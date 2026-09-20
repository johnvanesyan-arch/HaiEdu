import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/0055_sprint_12a4_calibration_analysis_views.sql", import.meta.url),
  "utf8",
);

test("analysis views are read-only and service-role scoped", () => {
  assert.match(migration, /with \(security_invoker = true\)/);
  assert.match(migration, /revoke all on public\.calibration_session_eligibility_v from public, anon, authenticated/);
  assert.match(migration, /grant select on public\.calibration_metric_sample_summary_v to service_role/);
});

test("session eligibility is visible, metric-specific, and fail closed", () => {
  assert.match(migration, /'classification_pending'/);
  assert.match(migration, /'participation_gates_blocked'/);
  assert.match(migration, /base_formal_eligible/);
  assert.match(migration, /practice_burden_eligible/);
  assert.match(migration, /diagnostic_predictive_alignment_eligible/);
  assert.match(migration, /mastery_check_outcome_eligible/);
});

test("raw evidence retains curriculum, blueprint, model, runtime, and exposure provenance", () => {
  assert.match(migration, /release_key/);
  assert.match(migration, /blueprint_key/);
  assert.match(migration, /model_version/);
  assert.match(migration, /runtime_build_key/);
  assert.match(migration, /exposure_event_id/);
  assert.match(migration, /selection_reason/);
});

test("hint and recommendation evidence use exact audited semantics", () => {
  assert.match(migration, /exact_guide_snapshot_missing/);
  assert.match(migration, /server_confirmed_action_missing/);
  assert.match(migration, /action_started_at/);
  assert.doesNotMatch(migration, /event_type = 'followed'/);
});

test("all r2 metrics expose reproducible sample sizes", () => {
  for (const metric of [
    "practice_burden",
    "mastery_evidence_to_secure",
    "hint_assistance_effect",
    "item_difficulty_response_time",
    "repeat_pool_exhaustion_influence",
    "threshold_sensitivity",
    "diagnostic_predictive_alignment",
    "mastery_check_outcome",
    "mastery_check_skill_failure",
    "recent_recovery",
    "recommendation_path",
  ]) assert.match(migration, new RegExp(`'${metric}'`));

  assert.match(migration, /observations_formal/);
  assert.match(migration, /distinct_learners/);
  assert.match(migration, /learner_skill_trajectories/);
  assert.match(migration, /right_censored_observations/);
});

