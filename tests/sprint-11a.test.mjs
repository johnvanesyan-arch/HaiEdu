import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/0013_sprint_11a_item_identity_exposure_pools.sql", "utf8");
const helper = readFileSync("supabase/functions/_shared/assessment-integrity.ts", "utf8");
const startSession = readFileSync("supabase/functions/start-learning-session/index.ts", "utf8");
const getSessionItem = readFileSync("supabase/functions/get-session-item/index.ts", "utf8");
const legacyPractice = readFileSync("supabase/functions/get-practice-item/index.ts", "utf8");

test("Sprint 11A adds normalized family/template/variant identity", () => {
  assert.match(migration, /create table if not exists public\.item_families/);
  assert.match(migration, /create table if not exists public\.item_templates/);
  assert.match(migration, /item_template_id uuid references public\.item_templates/);
  assert.match(migration, /variant_key text/);
  assert.match(migration, /uq_items_template_variant/);
});

test("Sprint 11A defines explicit assessment pools and protects Mastery content", () => {
  assert.match(migration, /create table if not exists public\.assessment_pools/);
  assert.match(migration, /create table if not exists public\.assessment_pool_items/);
  assert.match(migration, /PHY7-U01-PRACTICE-BASELINE/);
  assert.match(migration, /PHY7-U01-DIAGNOSTIC-BASELINE/);
  assert.match(migration, /PHY7-U01-MASTERY-PROTECTED-A/);
  assert.match(migration, /is_protected boolean not null default false/);
  assert.match(migration, /private\.item_is_protected/);
  assert.match(migration, /not private\.item_is_protected\(id\)/);
});

test("canonical Practice delivery uses the Practice pool and legacy untracked delivery stays closed", () => {
  assert.match(helper, /practice: "PHY7-U01-PRACTICE-BASELINE"/);
  assert.match(getSessionItem, /getEligiblePoolItemIds\(admin, "practice"\)/);
  assert.match(legacyPractice, /legacy_practice_delivery_retired/);
  assert.doesNotMatch(legacyPractice, /getEligiblePoolItemIds\(admin, "practice"\)/);
});

test("Diagnostic and Mastery session creation use separate eligible pools", () => {
  assert.match(startSession, /getEligiblePoolItemIds\(admin, "diagnostic"\)/);
  assert.match(startSession, /getEligiblePoolItemIds\(admin, "mastery_check"\)/);
  assert.match(startSession, /protectedPool: true/);
});

test("student-level exposure history records serve, outcome and help state", () => {
  assert.match(migration, /create table if not exists public\.student_item_exposure_events/);
  assert.match(migration, /served_at timestamptz not null/);
  assert.match(migration, /answered_at timestamptz/);
  assert.match(migration, /help_used boolean not null default false/);
  assert.match(migration, /hint_level_used integer not null default 0/);
  assert.match(migration, /service_record_item_exposure/);
  assert.match(migration, /service_finalize_item_exposure/);
  assert.match(migration, /sync_remediation_event_exposure/);
  assert.match(getSessionItem, /recordSessionItemExposure/);
});

test("exposure rows are student-isolated by RLS and not client-writable", () => {
  assert.match(migration, /students_read_own_item_exposure/);
  assert.match(migration, /student_id\s*=\s*auth\.uid\(\)/);
  assert.match(migration, /grant select on public\.student_item_exposure_events to authenticated/);
  assert.doesNotMatch(migration, /grant insert[^;]*student_item_exposure_events to authenticated/i);
  assert.doesNotMatch(migration, /grant update[^;]*student_item_exposure_events to authenticated/i);
});
