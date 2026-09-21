import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/0064_sprint_12_5_chapter_review_gate.sql");
const start = read("supabase/functions/start-learning-session/index.ts");
const submit = read("supabase/functions/submit-answer/index.ts");
const item = read("supabase/functions/get-session-item/index.ts");
const help = read("supabase/functions/get-remediation-help/index.ts");
const mastery = read("web/mastery.js");
const practice = read("web/practice.js");

test("Chapter Review is a first-class session mode with explicit contexts", () => {
  assert.match(migration, /'chapter_review'/);
  for (const context of [
    "required_after_attempt_1_failure",
    "required_after_attempt_2_failure",
    "voluntary_after_mastery_pass",
    "voluntary_after_final_failure",
  ]) assert.match(migration, new RegExp(context));
  assert.match(migration, /chapter_review_requirements/);
  assert.match(migration, /chapter_review_sessions/);
});

test("failed attempts create mandatory Review requirements atomically", () => {
  assert.match(migration, /finalize_mastery_check_atomic/);
  assert.match(migration, /insert into public\.chapter_review_requirements/);
  assert.match(migration, /review_required_attempt_2/);
  assert.match(migration, /review_required_attempt_3/);
});

test("opening or abandoning Review cannot unlock a retry", () => {
  assert.match(migration, /v_session\.status<>'completed'/);
  assert.match(migration, /v_session\.answered_count<v_session\.planned_item_count/);
  assert.match(migration, /chapter_review_not_complete/);
  assert.match(migration, /status='satisfied'/);
  assert.match(migration, /qualifying=true/);
  assert.match(migration, /qualifying_chapter_review_required/);
});

test("Review completion moves only required states to retry-ready", () => {
  assert.match(migration, /mastery_retry_2_ready/);
  assert.match(migration, /mastery_retry_3_ready/);
  assert.match(migration, /chapter_review_transition_invalid/);
  assert.match(migration, /review_requirement_id is not null/);
});

test("server and learner paths use Chapter Review mode", () => {
  assert.match(start, /body\.mode === "chapter_review"/);
  assert.match(start, /start_chapter_review_atomic/);
  assert.match(submit, /finalize_chapter_review_atomic/);
  assert.match(item, /session\.mode === "chapter_review"/);
  assert.match(help, /"chapter_review"/);
  assert.match(mastery, /practice\.html\?mode=chapter_review/);
  assert.match(practice, /desiredMode/);
});

test("policy activation is separate from immutable policy snapshots", () => {
  assert.match(migration, /academic_mastery_policy_activation/);
  assert.match(migration, /drop index if exists public\.academic_mastery_policy_one_active_idx/);
  assert.match(migration, /join public\.academic_mastery_policy_versions/);
});
