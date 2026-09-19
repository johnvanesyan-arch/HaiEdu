import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const migration = read("supabase/migrations/0039_sprint_11k_curriculum_releases_and_evidence_provenance.sql");
const hardening = read("supabase/migrations/0040_sprint_11k_advisor_hardening.sql");
const releaseHelper = read("supabase/functions/_shared/curriculum-release.ts");
const startSession = read("supabase/functions/start-learning-session/index.ts");
const getSessionItem = read("supabase/functions/get-session-item/index.ts");
const submitAnswer = read("supabase/functions/submit-answer/index.ts");
const dashboard = read("supabase/functions/get-student-dashboard/index.ts");
const contentDashboard = read("supabase/functions/get-content-quality-dashboard/index.ts");

test("11K introduces immutable release and assessment blueprint identities", () => {
  assert.match(migration, /create table public\.curriculum_releases/);
  assert.match(migration, /create table public\.assessment_blueprints/);
  assert.match(migration, /create table public\.assessment_blueprint_items/);
  assert.match(migration, /guard_release_snapshot_immutability/);
  assert.match(migration, /physics7_u01_legacy_pre_11k/);
  assert.match(migration, /physics7_u01_2026_08_14_pilot_r1/);
});

test("11K binds learner evidence and mastery to a curriculum release", () => {
  assert.match(migration, /alter table public\.learning_sessions[\s\S]*add column curriculum_release_id/);
  assert.match(migration, /alter table public\.attempts[\s\S]*add column curriculum_release_id/);
  assert.match(migration, /alter table public\.student_item_exposure_events[\s\S]*add column curriculum_release_id/);
  assert.match(migration, /create table public\.student_skill_mastery_by_release/);
  assert.match(migration, /learning_sessions_blueprint_release_fkey/);
  assert.match(migration, /attempts_blueprint_release_fkey/);
  assert.match(migration, /exposure_events_blueprint_release_fkey/);
});

test("11K runtime selects from frozen blueprint membership", () => {
  assert.match(releaseHelper, /resolve_active_curriculum_release/);
  assert.match(releaseHelper, /from\("assessment_blueprints"\)/);
  assert.match(releaseHelper, /\.eq\("purpose", mode\)/);
  assert.match(releaseHelper, /from\("assessment_blueprint_items"\)/);
  assert.match(startSession, /resolveCurriculumBlueprint\(admin, UNIT_CODE, body\.mode\)/);
  assert.match(startSession, /assessment_blueprint_id: curriculumContext\.blueprintId/);
  assert.match(getSessionItem, /getBlueprintItemIds\(admin, session\.assessment_blueprint_id\)/);
});

test("11K mastery and learner-state reads are release scoped", () => {
  assert.match(submitAnswer, /from\("student_skill_mastery_by_release"\)/);
  assert.match(submitAnswer, /eq\("curriculum_release_id", curriculumReleaseId\)/);
  assert.match(dashboard, /from\("student_skill_mastery_by_release"\)/);
  assert.match(dashboard, /eq\("curriculum_release_id", curriculumReleaseId\)/);
});

test("11K exposes governance and retains the external SME production gate", () => {
  assert.match(contentDashboard, /from\("curriculum_releases"\)/);
  assert.match(contentDashboard, /from\("curriculum_release_gate_checks"\)/);
  assert.match(contentDashboard, /from\("assessment_blueprints"\)/);
  assert.match(migration, /external_sme_approved/);
  assert.match(migration, /production activation requires external SME approval/);
});

test("11K advisor hardening covers composite provenance foreign keys", () => {
  assert.match(hardening, /learning_sessions_blueprint_release_idx/);
  assert.match(hardening, /attempts_blueprint_release_idx/);
  assert.match(hardening, /exposure_events_blueprint_release_idx/);
  assert.doesNotMatch(hardening, /for all to authenticated/);
});
