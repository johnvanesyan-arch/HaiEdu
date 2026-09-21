import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const migration = read("supabase/migrations/0061_sprint_12_5_mastery_lifecycle_foundation.sql");
const start = read("supabase/functions/start-learning-session/index.ts");
const submit = read("supabase/functions/submit-mastery-answer/index.ts");
const status = read("supabase/functions/get-mastery-check-status/index.ts");

test("Sprint 12.5 policy is universal, versioned and immutable", () => {
  assert.match(migration, /academic_mastery_policy_versions/);
  assert.match(migration, /maximum_mastery_attempts smallint not null check \(maximum_mastery_attempts = 3\)/);
  assert.match(migration, /review_required_after_failed_attempts = array\[1,2\]::smallint\[\]/);
  assert.match(migration, /revoke update, delete, truncate[\s\S]*academic_mastery_policy_versions/);
});

test("mastery lifecycle has governed states and a hard attempt ceiling", () => {
  for (const state of [
    "mastery_ready", "review_required_attempt_2", "mastery_retry_2_ready",
    "review_required_attempt_3", "mastery_retry_3_ready",
    "mastery_passed", "mastery_failed_final",
  ]) assert.match(migration, new RegExp(state));
  assert.match(migration, /attempt_number smallint not null check \(attempt_number between 1 and 3\)/);
  assert.match(migration, /mastery_attempt_number smallint[\s\S]*between 1 and 3/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /mastery_check_attempts_one_active_idx/);
  assert.match(migration, /learning_sessions_one_active_mastery_check_idx/);
});

test("Mastery Check creation and finalization use atomic database lifecycle RPCs", () => {
  assert.match(start, /rpc\("start_mastery_check_atomic"/);
  assert.doesNotMatch(start, /from\("learning_sessions"\)\.insert\(\{[\s\S]*mode: "mastery_check"/);
  assert.match(submit, /rpc\("finalize_mastery_check_atomic"/);
  assert.match(status, /from\("chapter_mastery_states"\)/);
  assert.match(status, /attemptsRemaining/);
  assert.match(status, /finalFailure/);
});

test("historical lifecycle migration does not invent attempt numbers beyond provable history", () => {
  assert.match(migration, /r\.attempt_count<=3/);
  assert.match(migration, /legacy_attempt_history/);
  assert.match(migration, /where s\.mode='mastery_check' and s\.status='completed'/);
});
