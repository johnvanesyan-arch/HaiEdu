import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/0072_sprint_12_5_review_analytics_and_evidence.sql");
const teacherDashboard = read("supabase/functions/get-teacher-dashboard/index.ts");
const teacherStudent = read("supabase/functions/get-teacher-student/index.ts");
const studentDashboard = read("supabase/functions/get-student-dashboard/index.ts");
const teacherUi = read("web/teacher.js");
const homeUi = read("web/home-dashboard.js");

test("Review analytics views are service-only and security-invoker", () => {
  for (const view of ["chapter_review_summary_v", "chapter_review_skill_attention_inputs_v", "learning_evidence_stream_v"]) {
    assert.match(migration, new RegExp(`create view public\\.${view}[\\s\\S]*?security_invoker=true`));
  }
  assert.match(migration, /revoke all on table public\.chapter_review_summary_v[\s\S]*from public,anon,authenticated/);
  assert.match(migration, /grant select on table public\.chapter_review_summary_v[\s\S]*to service_role/);
});

test("attention model exposes inputs without inventing thresholds", () => {
  assert.match(migration, /recent_independent_observations/);
  assert.match(migration, /hint_assisted_responses/);
  assert.match(migration, /repeat_errors/);
  assert.match(migration, /failed_latest_mastery/);
  assert.match(migration, /'insufficient_review_evidence'::text as attention_state/);
  assert.match(migration, /'thresholds_not_governed'::text as attention_policy_status/);
  assert.doesNotMatch(migration, /attention_state[\s\S]{0,300}(?:>=|<=|< 0\.|> 0\.)/);
});

test("Review evidence is explicitly separated from initial Practice burden", () => {
  for (const stream of [
    "pre_mastery_practice", "required_post_failure_chapter_review", "mastery_check",
    "optional_post_pass_chapter_review", "optional_post_final_failure_chapter_review",
  ]) assert.match(migration, new RegExp(stream));
  assert.match(migration, /excluded_from_initial_practice_burden/);
});

test("teacher APIs remain class-scoped and return Review analytics", () => {
  assert.match(teacherDashboard, /\.eq\("teacher_id", teacherId\)/);
  assert.match(teacherStudent, /student_not_in_teacher_class/);
  for (const source of [teacherDashboard, teacherStudent]) {
    assert.match(source, /chapter_review_summary_v/);
    assert.match(source, /chapter_review_skill_attention_inputs_v/);
    assert.match(source, /thresholds_not_governed/);
  }
  assert.match(teacherStudent, /chapter_review_sessions/);
});

test("recommendations follow the authoritative mastery lifecycle", () => {
  for (const state of ["review_required_attempt_2", "mastery_retry_2_ready", "mastery_failed_final", "mastery_passed"]) {
    assert.match(studentDashboard, new RegExp(state));
  }
  for (const action of ["required_chapter_review", "mastery_check_retry", "review_chapter"]) {
    assert.match(studentDashboard, new RegExp(action));
  }
  assert.match(homeUi, /practice\.html\?mode=chapter_review/);
  assert.match(homeUi, /Յուրացման երեք փորձերն ավարտված են/);
});

test("teacher UI labels ungoverned attention evidence honestly", () => {
  assert.match(teacherUi, /Շեմերը դեռ սահմանված չեն/);
  assert.match(teacherUi, /ցուցադրվում են միայն դիտարկելի փաստերը/);
  assert.match(teacherUi, /Պարտադիր կրկնություններ/);
  assert.match(teacherUi, /Լրացուցիչ կրկնություններ/);
  assert.match(teacherUi, /Ընթացիկ ծածկույթ/);
});
