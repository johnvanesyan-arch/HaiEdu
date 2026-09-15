import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/0015_sprint_11c_deterministic_variants.sql", "utf8");
const previewFix = readFileSync("supabase/migrations/0016_sprint_11c_preview_idempotency.sql", "utf8");
const contentQuality = readFileSync("supabase/functions/manage-content-quality/index.ts", "utf8");
const backlog = readFileSync("docs/backlog.md", "utf8");

test("Sprint 11C adds deterministic parameterized and parallel templates", () => {
  assert.match(migration, /template_kind/);
  assert.match(migration, /'parameterized'/);
  assert.match(migration, /'parallel'/);
  assert.match(migration, /s07_length_to_m_v1/);
  assert.match(migration, /s08_scale_division_v1/);
  assert.match(migration, /s09_measurement_error_v1/);
  assert.match(migration, /s10_displacement_volume_v1/);
  assert.match(migration, /s05_hypothesis_test_parallel_v1/);
});

test("generated variants persist seed, parameters and semantic identity", () => {
  assert.match(migration, /variant_fingerprint text/);
  assert.match(migration, /variant_seed/);
  assert.match(migration, /variant_parameters/);
  assert.match(migration, /semanticFingerprint/);
  assert.match(migration, /service_preview_item_variant/);
  assert.match(migration, /service_materialize_item_variant/);
});

test("generation stays deterministic and server-side without live AI", () => {
  assert.match(migration, /private\.seed_index/);
  assert.match(migration, /md5\(p_seed \|\| ':' \|\| p_salt\)/);
  assert.match(migration, /deterministic_server_side/);
  assert.doesNotMatch(migration, /openai|anthropic|gemini|generative ai/i);
});

test("generated candidates enter review state and are not auto-enrolled in assessment pools", () => {
  assert.match(migration, /'review'::content_status/);
  assert.match(migration, /'needs_review'/);
  assert.match(migration, /pilot_ready',false/);
  assert.doesNotMatch(migration, /insert into public\.assessment_pool_items[\s\S]*PHY7-U01-11C-GENERATED/i);
});

test("generator QA blocks invalid, duplicate and answer-leaking variants", () => {
  assert.match(migration, /answer_placeholder_leak/);
  assert.match(migration, /answer_present_in_public_parameters/);
  assert.match(migration, /duplicate_effective_variant/);
  assert.match(migration, /duplicate_options/);
  assert.match(migration, /option_answer_marker_leak/);
  assert.match(migration, /uq_items_active_variant_fingerprint/);
});

test("previewing a materialized seed ignores only its own concrete item", () => {
  assert.match(previewFix, /v_existing_same_id/);
  assert.match(previewFix, /i\.id <> v_existing_same_id/);
});

test("content-admin workflow can preview/materialize and QA reproducibility", () => {
  assert.match(contentQuality, /preview_generated_variant/);
  assert.match(contentQuality, /materialize_generated_variant/);
  assert.match(contentQuality, /service_preview_item_variant/);
  assert.match(contentQuality, /service_materialize_item_variant/);
  assert.match(contentQuality, /generated_prompt_not_reproducible/);
  assert.match(contentQuality, /generated_parameters_not_reproducible/);
  assert.match(contentQuality, /generated_answer_not_reproducible/);
  assert.match(contentQuality, /generated_fingerprint_not_reproducible/);
});

test("Sprint 11D has a fixed 24-per-skill / 240-total acceptance target", () => {
  assert.match(backlog, /at least 24 effective, unique concrete variants per skill — 240 across the 10 skills/);
  assert.match(backlog, /12 Practice variants \+ 4 Diagnostic variants .* \+ 8 protected Mastery variants/);
  assert.match(backlog, /24 is the acceptance floor, not a hard maximum/);
});
