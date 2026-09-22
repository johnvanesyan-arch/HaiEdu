import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/0081_global_mcq_option_presentation_integrity.sql");
const semanticGuard = read("supabase/migrations/0084_global_mcq_option_semantic_guard.sql");
const getSessionItem = read("supabase/functions/get-session-item/index.ts");
const submitAnswer = read("supabase/functions/submit-answer/index.ts");
const submitMastery = read("supabase/functions/submit-mastery-answer/index.ts");
const practiceUi = read("web/practice.js");
const diagnosticUi = read("web/diagnostic.js");
const masteryUi = read("web/mastery.js");

test("MCQ presentation mapping is private, persisted and staged for safe rollout", () => {
  assert.match(migration, /private\.learning_session_item_option_orders/);
  assert.match(migration, /canonical_option_order text\[\]/);
  assert.match(migration, /item_version_no integer not null/);
  assert.match(migration, /learning_session_item_option_order_capture/);
  assert.match(migration, /after insert on public\.learning_session_items/);
  assert.match(migration, /mcq-option-order-staged-v0/);
  assert.match(migration, /where ls\.status='active'[\s\S]*lsi\.answered_at is null/);
  assert.match(migration, /Do not fabricate presentation provenance for[\s\S]*answered historical evidence/);
});

test("global MCQ order uses server randomness and prevents immediate same-order repeats", () => {
  assert.match(migration, /array_agg\(o\.option_key order by gen_random_uuid\(\)\)/);
  assert.match(migration, /v_order = v_previous/);
  assert.match(migration, /v_order\[2:cardinality\(v_order\)\] \|\| v_order\[1:1\]/);
  assert.match(migration, /config_key='mcq_option_order'/);
});

test("learner delivery converts canonical option identities to positional presentation keys", () => {
  assert.match(getSessionItem, /service_ensure_session_item_option_order/);
  assert.match(getSessionItem, /learnerPresentationOptions/);
  assert.match(getSessionItem, /option_key: presentationKey\(index\)/);
  assert.match(getSessionItem, /content_hy: option\.content_hy/);
  assert.match(getSessionItem, /optionPresentationVersion/);
});

test("grading resolves presentation key back to canonical option identity server-side", () => {
  assert.match(submitAnswer, /service_ensure_session_item_option_order/);
  assert.match(submitAnswer, /presentationIndex\(payload\.response\.value\)/);
  assert.match(submitAnswer, /const canonicalOptionKey = order\[index\]/);
  assert.match(submitAnswer, /gradeAnswer\(key, gradingResponse\)/);
  assert.match(submitAnswer, /p_response: payload\.response/);
  assert.match(submitAnswer, /p_normalized_response: normalizedPresentationResponse \?\? grade\.normalizedResponse \?\? null/);
});

test("canonical learner option-order access is removed and clients do not shuffle locally", () => {
  assert.match(migration, /drop policy if exists item_options_public_read/);
  assert.match(migration, /drop policy if exists item_options_read/);
  for (const ui of [practiceUi, diagnosticUi, masteryUi]) {
    assert.doesNotMatch(ui, /Math\.random\(\)/);
    assert.doesNotMatch(ui, /\.sort\(\(\) => Math\.random/);
  }
});


test("Mastery Check uses the same canonicalized grading path as other session modes", () => {
  assert.match(submitMastery, /functions\/v1\/submit-answer/);
  assert.match(submitMastery, /sessionItemId: body\.sessionItemId/);
  assert.match(submitMastery, /response: body\.response/);
});

test("fixed-order MCQ exceptions are explicit and fail closed without rationale", () => {
  assert.match(semanticGuard, /shuffleOptions/);
  assert.match(semanticGuard, /optionOrderRationale/);
  assert.match(semanticGuard, /shuffle_disabled_without_option_order_rationale/);
  assert.match(semanticGuard, /mcq-option-order-fixed-v1/);
  assert.match(semanticGuard, /coalesce\(\(v_item_config->>'shuffleOptions'\)::boolean,true\)/);
});
