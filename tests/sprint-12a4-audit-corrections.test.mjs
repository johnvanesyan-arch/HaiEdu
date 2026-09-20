import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/0056_sprint_12a4_audit_corrections.sql", import.meta.url),
  "utf8",
);

test("analysis is pinned to one immutable pilot scope", () => {
  assert.match(migration, /create table if not exists public\.calibration_analysis_scopes/);
  assert.match(migration, /p\.run_key = 'sprint_11l_physics7_chapter1_pilot'/);
  assert.doesNotMatch(migration, /order by pr\.created_at desc[\s\S]*limit 1/);
  assert.match(migration, /revoke update, delete, truncate on public\.calibration_analysis_scopes from service_role/);
});

test("r2 pilot status and the complete entry gate are enforced", () => {
  assert.match(migration, /pilot_status not in \('running','observing','closed'\)/);
  assert.match(migration, /not r\.all_entry_gates_passed then 'pilot_entry_not_ready'/);
  assert.match(migration, /not r\.required_human_gates_passed then 'participation_gates_blocked'/);
});

test("classification pending remains independently visible", () => {
  assert.match(migration, /\(b\.classification is null\) classification_pending/);
  assert.match(migration, /exclusion_reasons/);
  assert.match(migration, /when r\.classification_pending then 'classification_pending'/);
});

test("recent recovery is the actual first 4-of-5 independent event", () => {
  assert.match(migration, /window_attempts=5/);
  assert.match(migration, /window_unique_items>=4/);
  assert.match(migration, /window_independent_correct>=4/);
  assert.match(migration, /not e\.prior_qualified/);
  assert.match(migration, /next_independent_attempt_id/);
});

test("r2 analysis outputs exist beyond observation placeholders", () => {
  for (const view of [
    "calibration_mastery_replay_v",
    "calibration_mastery_trajectory_v",
    "calibration_practice_burden_v",
    "calibration_recent_recovery_events_v",
    "calibration_hint_followup_v",
    "calibration_item_analysis_v",
    "calibration_repeat_influence_v",
  ]) assert.match(migration, new RegExp(`public\\.${view}`));

  assert.match(migration, /percentile_cont\(0\.5\)/);
  assert.match(migration, /right_censored/);
  assert.match(migration, /learner_aggregated_correct_rate/);
});

test("metric keys exactly match the immutable r2 registry", () => {
  assert.match(migration, /'recent_recovery_stability'/);
  assert.match(migration, /'recommendation_path_accuracy'/);
  assert.doesNotMatch(migration, /'recent_recovery'/);
  assert.doesNotMatch(migration, /'recommendation_path'/);
});
