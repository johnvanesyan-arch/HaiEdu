import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Sprint 12A freezes an immutable named learning-model baseline", async () => {
  const sql = await read("supabase/migrations/0044_sprint_12a_freeze_learning_model_baseline.sql");

  assert.match(sql, /create table if not exists public\.learning_model_configurations/);
  assert.match(sql, /'haiedu_core_learning_model'/);
  assert.match(sql, /'baseline-2026-09-20-r1'/);
  assert.match(sql, /'physics7_u01_2026_08_14_pilot_r1'/);
  assert.match(sql, /reject_learning_model_configuration_mutation/);
  assert.match(sql, /before update or delete on public\.learning_model_configurations/);
  assert.match(sql, /snapshot_fingerprint text generated always as/);
});

test("baseline snapshot locks the deployed learning rules without changing them", async () => {
  const sql = await read("supabase/migrations/0044_sprint_12a_freeze_learning_model_baseline.sql");

  assert.match(sql, /'secureAtOrAbove', 0\.72/);
  assert.match(sql, /'hintedPositiveMultiplier', 0\.65/);
  assert.match(sql, /'plannedSessionLength', 8/);
  assert.match(sql, /'minimumIndependentCorrect', 4/);
  assert.match(sql, /'recentWindow', 5/);
  assert.match(sql, /'overallPassPercent', 80/);
  assert.match(sql, /'minimumCorrectPerSkill', 1/);
  assert.match(sql, /'dual_scope_baseline'/);
  assert.match(sql, /'liveAiGeneration', false/);
});

test("baseline records deployed function provenance", async () => {
  const sql = await read("supabase/migrations/0044_sprint_12a_freeze_learning_model_baseline.sql");

  for (const [name, version] of [
    ["submit-answer", 10],
    ["start-learning-session", 12],
    ["get-session-item", 11],
    ["get-student-dashboard", 16],
    ["submit-mastery-answer", 4],
    ["get-mastery-check-status", 6],
    ["get-remediation-help", 5],
  ]) {
    assert.match(sql, new RegExp(`'${name}', ${version}`));
  }
});

test("baseline provenance foreign keys are indexed", async () => {
  const sql = await read("supabase/migrations/0045_sprint_12a_learning_model_baseline_indexes.sql");

  assert.match(sql, /learning_model_configurations_predecessor_idx/);
  assert.match(sql, /learning_model_configurations_reference_release_idx/);
});
