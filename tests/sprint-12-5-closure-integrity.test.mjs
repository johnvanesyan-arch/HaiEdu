import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/0074_sprint_12_5_integrity_coverage_and_closure.sql");
const startSession = read("supabase/functions/start-learning-session/index.ts");
const submitAnswer = read("supabase/functions/submit-answer/index.ts");
const help = read("supabase/functions/get-remediation-help/index.ts");
const teacherDashboard = read("supabase/functions/get-teacher-dashboard/index.ts");
const teacherStudent = read("supabase/functions/get-teacher-student/index.ts");
const practiceUi = read("web/practice.js");
const teacherUi = read("web/teacher.js");

test("Attempts 2 and 3 require the correct completed qualifying Review at database level", () => {
  assert.match(migration, /create trigger mastery_attempt_integrity_guard/);
  assert.match(migration, /new\.attempt_number=1[\s\S]*attempt_1_must_not_reference_review/);
  assert.match(migration, /retry_requires_preceding_review/);
  assert.match(migration, /v_review\.status<>'completed'/);
  assert.match(migration, /not v_review\.qualifying/);
  assert.match(migration, /required_after_attempt<>new\.attempt_number-1/);
  assert.match(migration, /mastery attempt identity and provenance are immutable/);
});

test("retry authorization no longer depends on ordinary Practice", () => {
  const masteryBranch = startSession.slice(startSession.indexOf('if (body.mode === "mastery_check")'));
  assert.doesNotMatch(masteryBranch, /remediationSessions/);
  assert.doesNotMatch(masteryBranch, /reason: "remediation_required"/);
  assert.match(masteryBranch, /start_mastery_check_atomic/);
});

test("assessment-purpose eligibility and Mastery exposure protections are explicit", () => {
  assert.match(migration, /assessment_item_purpose_eligibility_v/);
  assert.match(migration, /review_eligible/);
  assert.match(migration, /mastery_check_eligible/);
  assert.match(startSession, /chooseMasteryByExposure/);
  assert.match(startSession, /previousItemIds/);
  assert.match(startSession, /protectedPool: true/);
});

test("Chapter Review supports atomic Hinting v2 while Mastery remains hint-free", () => {
  assert.match(help, /\["practice", "chapter_review"\]/);
  assert.match(help, /record_remediation_help_atomic/);
  assert.match(startSession, /hintingEnabled: true/);
  assert.match(startSession, /noHints: true/);
  assert.match(submitAnswer, /serverHintUsed/);
});

test("coverage reports cycle, lifetime, repeat and pool-exhaustion facts without calling them mastery", () => {
  for (const field of ["current_cycle_coverage_percent", "lifetime_unique_items_seen", "exact_repeat_count", "pool_exhaustion_event_count"]) {
    assert.match(migration, new RegExp(field));
    assert.match(teacherDashboard + teacherStudent, new RegExp(field));
  }
  assert.match(submitAnswer, /chapter_review_coverage_v/);
  assert.match(practiceUi, /Սա կրկնության առաջընթացն է, ոչ յուրացման գնահատական/);
  assert.match(teacherUi, /Ճշգրիտ կրկնություններ/);
});

test("historical ambiguity remains explicit and reporting views are service-only", () => {
  assert.match(migration, /chapter_mastery_history_provenance_v/);
  assert.match(migration, /legacy_attempt_history/);
  assert.match(migration, /revoke all on table[\s\S]*from public,anon,authenticated/);
  assert.match(migration, /grant select on table[\s\S]*to service_role/);
});
