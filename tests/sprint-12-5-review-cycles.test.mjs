import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/0069_sprint_12_5_review_cycles.sql");
const start = read("supabase/functions/start-learning-session/index.ts");

test("Review cycles and immutable item-level selection provenance are durable", () => {
  assert.match(migration, /create table public\.chapter_review_cycles/);
  assert.match(migration, /create table public\.chapter_review_item_exposures/);
  assert.match(migration, /review_cycle_number/);
  assert.match(migration, /review_session_number/);
  assert.match(migration, /preceding_mastery_attempt_number/);
  assert.match(migration, /prior_exposure_count/);
  assert.match(migration, /seen_in_current_cycle/);
  assert.match(migration, /exact_repeat/);
  assert.match(migration, /pool_exhausted/);
  assert.match(migration, /revoke update,delete,truncate on table public\.chapter_review_item_exposures/);
});

test("Review evidence resolves canonical response and assistance facts", () => {
  assert.match(migration, /chapter_review_item_evidence_v/);
  assert.match(migration, /hint_level_used/);
  assert.match(migration, /response_time_ms/);
  assert.match(migration, /not coalesce\(a\.hint_used,false\).*independent/s);
  assert.match(migration, /coalesce\(a\.hint_used,false\).*assisted/s);
});

test("selection is deterministic, whole-chapter, weighted, and cycle-aware", () => {
  assert.match(start, /stableRank/);
  assert.match(start, /12\.5E-F-v1/);
  assert.match(start, /review_failed_skill_weight_whole_chapter/);
  assert.match(start, /review_weak_independent_whole_chapter/);
  assert.match(start, /review_whole_chapter_coverage/);
  assert.match(start, /review_least_recent_diverse_fill/);
  assert.match(start, /chapter_review_cycles/);
  assert.match(start, /chapter_review_item_evidence_v/);
  assert.doesNotMatch(start.slice(start.indexOf('if (body.mode === "chapter_review")'), start.indexOf('if (body.mode === "mastery_check")')), /shuffle\(/);
});

test("atomic start rejects stale selectors and premature exact repeats", () => {
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /stale_review_selection_context/);
  assert.match(migration, /review_repeat_before_pool_exhaustion/);
  assert.match(migration, /duplicate_review_item/);
  assert.match(migration, /chapter_review_cycles_one_active_idx/);
  assert.match(migration, /chapter_review_sessions_cycle_session_idx/);
});
