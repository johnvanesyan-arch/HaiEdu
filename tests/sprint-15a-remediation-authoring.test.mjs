import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260930120000_sprint_15a_remediation_authoring_foundation.sql");
const advisorCorrection = read("supabase/migrations/20260930195500_sprint_15a_authoring_parent_index.sql");
const endpoint = read("supabase/functions/manage-remediation-guides/index.ts");
const resolver = read("supabase/functions/get-remediation-help/index.ts");
const html = read("web/content-guides.html");
const ui = read("web/content-guides.js");
const nav = read("web/role-layout.js");

test("15A authoring history is append-only and inaccessible to browser roles", () => {
  assert.match(migration, /create table if not exists public\.remediation_guide_authoring_versions/);
  assert.match(migration, /before update or delete on public\.remediation_guide_authoring_versions/);
  assert.match(migration, /remediation_guide_authoring_versions is append-only/);
  assert.match(migration, /revoke all on table public\.remediation_guide_authoring_versions from anon, authenticated/);
  assert.match(migration, /grant select, insert on table public\.remediation_guide_authoring_versions to service_role/);
});

test("draft and review cannot overwrite learner-facing guides", () => {
  const runtimeSkillUpdate = migration.indexOf("update public.skill_remediation_guides set");
  const publishBranch = migration.indexOf("if p_lifecycle_status = 'published' then");
  assert.ok(runtimeSkillUpdate > publishBranch, "runtime update must be inside the publish branch");
  assert.match(migration, /p_expected_authoring_version/);
  assert.match(migration, /raise exception 'stale_authoring_version'/);
  assert.match(migration, /published_content_must_match_review/);
  assert.match(migration, /p_content_snapshot := v_latest\.content_snapshot/);
});

test("publish and archive are server-only, active-role and AAL2 protected", () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /v_profile\.role not in \('content_admin','admin'\)/);
  assert.match(migration, /p_lifecycle_status in \('published','archived'\) and p_actor_aal <> 'aal2'/);
  assert.match(migration, /revoke all on function public\.service_append_remediation_guide_authoring_version[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.service_append_remediation_guide_authoring_version[\s\S]*to service_role/);
  assert.match(endpoint, /hasActiveLiveSession/);
  assert.match(endpoint, /\["content_admin", "admin"\]\.includes\(role\)/);
  assert.match(endpoint, /\["publish", "archive"\]\.includes\(action\) && aal !== "aal2"/);
});

test("preview interpolates allow-listed raw parameters without answer evaluation", () => {
  assert.match(endpoint, /renderRawTemplate/);
  assert.match(endpoint, /allowed\.has\(key\)/);
  assert.match(endpoint, /variant_parameters/);
  assert.doesNotMatch(endpoint, /item_answer_keys/);
  assert.doesNotMatch(endpoint, /\beval\s*\(/);
  assert.match(endpoint, /worked_example_reuses_live_numeric_value/);
  assert.match(endpoint, /answer_like_placeholder_forbidden/);
  assert.match(endpoint, /hint_1_obvious_answer_leakage/);
});

test("existing resolver order and assessment boundary remain unchanged", () => {
  const errorSpecific = resolver.indexOf("g.trigger_error_code === errorCode");
  const templateDefault = resolver.indexOf("g.trigger_error_code === null");
  const skillFallback = resolver.indexOf('.from("skill_remediation_guides")');
  assert.ok(errorSpecific >= 0 && templateDefault > errorSpecific && skillFallback > templateDefault);
  assert.match(resolver, /\["practice", "chapter_review"\]\.includes\(session\.mode\)/);
  assert.match(resolver, /help_not_available_in_assessment/);
});

test("dedicated Armenian authoring workspace exposes required filters and lifecycle", () => {
  for (const id of ["subjectFilter", "gradeFilter", "programmeFilter", "unitFilter", "skillFilter", "scopeFilter", "statusFilter"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const id of ["guideTitleHy", "guideStrategyHy", "guideHint1Hy", "guideHint2Hy", "guideWorkedExampleHy", "allowedParameterKeys"]) {
    assert.match(ui, new RegExp(`id="${id}"`));
  }
  assert.match(ui, /save_draft/);
  assert.match(ui, /submit_review/);
  assert.match(ui, /publish/);
  assert.match(ui, /archive/);
  assert.match(ui, /challengeAndVerify/);
  assert.match(nav, /Օգնության ուղեցույցներ/);
});

test("catalog is service-only and uses invoker security", () => {
  assert.match(migration, /remediation_guide_authoring_catalog_v\n\+?with \(security_invoker = true\)|remediation_guide_authoring_catalog_v\nwith \(security_invoker = true\)/);
  assert.match(migration, /revoke all on table public\.remediation_guide_authoring_catalog_v from anon, authenticated/);
  assert.match(migration, /grant select on table public\.remediation_guide_authoring_catalog_v to service_role/);
});

test("authoring history parent foreign key has a covering index", () => {
  assert.match(advisorCorrection, /remediation_guide_authoring_parent_idx/);
  assert.match(advisorCorrection, /\(parent_version_id\)/);
  assert.match(advisorCorrection, /where parent_version_id is not null/);
});
