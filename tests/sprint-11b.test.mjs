import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const migration = read("supabase/migrations/0014_sprint_11b_repetition_selection_policy.sql");
const integrity = read("supabase/functions/_shared/assessment-integrity.ts");
const startSession = read("supabase/functions/start-learning-session/index.ts");
const getSessionItem = read("supabase/functions/get-session-item/index.ts");
const legacyPractice = read("supabase/functions/get-practice-item/index.ts");

test("Sprint 11B defines two explicit diagnostic forms", () => {
  assert.match(migration, /create table if not exists public\.assessment_forms/);
  assert.match(migration, /create table if not exists public\.assessment_form_items/);
  assert.match(migration, /PHY7-U01-DIAG-A/);
  assert.match(migration, /PHY7-U01-DIAG-B/);
  assert.match(migration, /provisionalParallelism/);
});

test("Practice policy encodes the required exposure ordering and explicit fallback", () => {
  assert.match(integrity, /unseen_variant/);
  assert.match(integrity, /unresolved_error_after_spacing/);
  assert.match(integrity, /least_recent_review/);
  assert.match(integrity, /pool_exhausted_exact_repeat/);
  assert.match(integrity, /PRACTICE_VARIANT_COOLDOWN\s*=\s*3/);
});

test("canonical session delivery uses cross-session exposure policy", () => {
  assert.match(getSessionItem, /getStudentExposureHistory/);
  assert.match(getSessionItem, /choosePracticeByExposure/);
  assert.match(getSessionItem, /selection_reason:\s*selection\.reason/);
  assert.match(getSessionItem, /exactRepeatFallbackUsed:\s*true/);
  assert.match(getSessionItem, /policyVersion:\s*"11B-v1"/);
});

test("Diagnostic rotates forms and persists form identity", () => {
  assert.match(startSession, /chooseRotatingDiagnosticForm/);
  assert.match(startSession, /formCode:\s*rotation\.form\.code/);
  assert.match(startSession, /priorFormCode/);
  assert.match(startSession, /diagnostic_\$\{rotation\.reason\}/);
});

test("Mastery is protected, unseen-first and alternate-retest aware", () => {
  assert.match(startSession, /getEligiblePoolItemIds\(admin, "mastery_check"\)/);
  assert.match(startSession, /chooseMasteryByExposure/);
  assert.match(startSession, /alternate_retest/);
  assert.match(startSession, /alternateFromSessionId/);
  assert.match(startSession, /overlapCount/);
  assert.match(startSession, /exactRepeatFallbackUsed/);
});

test("legacy untracked practice delivery is retired", () => {
  assert.match(legacyPractice, /legacy_practice_delivery_retired/);
  assert.match(legacyPractice, /start-learning-session \+ get-session-item/);
  assert.match(legacyPractice, /410/);
});
