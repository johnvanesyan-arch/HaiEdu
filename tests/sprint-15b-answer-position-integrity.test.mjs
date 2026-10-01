import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261001161000_sprint_15b_answer_position_integrity.sql",
  "utf8",
);
const qualityFunction = readFileSync(
  "supabase/functions/manage-content-quality/index.ts",
  "utf8",
);
const reviewerUi = readFileSync("web/content.js", "utf8");

test("Chapter II rebalances exactly seven canonical answer positions", () => {
  const expected = [
    ["PHY7-U02-S02-I04", "C", "D"],
    ["PHY7-U02-S03-I02", "C", "B"],
    ["PHY7-U02-S03-I03", "A", "C"],
    ["PHY7-U02-S03-I04", "A", "D"],
    ["PHY7-U02-S04-I02", "A", "B"],
    ["PHY7-U02-S04-I03", "A", "C"],
    ["PHY7-U02-S04-I04", "A", "D"],
  ];
  for (const [code, oldKey, newKey] of expected) {
    assert.match(migration, new RegExp(`'${code}', '${oldKey}', '${newKey}'`));
  }
  assert.match(migration, /15B_answer_position_plan_count_failed/);
  assert.match(migration, /if v_bad <> 7/);
});

test("re-keying fails closed after pool activation or learner exposure", () => {
  assert.match(migration, /public\.assessment_pool_items/);
  assert.match(migration, /pool_item\.enabled/);
  assert.match(migration, /public\.learning_session_items/);
  assert.match(migration, /15B_answer_position_learner_exposure_blocked/);
});

test("re-keying preserves meaning, misconception semantics and version history", () => {
  assert.match(migration, /update public\.item_options option_row/);
  assert.match(migration, /old_content_hy/);
  assert.match(migration, /new_content_hy/);
  assert.match(migration, /update public\.item_misconception_mappings mapping/);
  assert.match(migration, /set response_key = plan\.expected_old_key/);
  assert.match(migration, /insert into public\.item_versions/);
  assert.match(migration, /version_no = item\.version_no \+ 1/);
  assert.match(migration, /status = 'review'::public\.content_status/);
  assert.match(migration, /review_status = 'needs_review'/);
  assert.match(migration, /variant_fingerprint = fingerprints\.semantic_fingerprint/);
});

test("migration verifies one A B C D key per family and three per chapter", () => {
  for (const key of ["answer_a", "answer_b", "answer_c", "answer_d"]) {
    assert.match(migration, new RegExp(`${key} <> 1`));
  }
  assert.match(migration, /15B_answer_position_family_balance_failed/);
  assert.match(migration, /coalesce\(actual\.item_count, 0\) <> 3/);
  assert.match(migration, /15B_answer_position_chapter_balance_failed/);
});

test("technical QA warns on concentrated template-level answer positions", () => {
  assert.match(qualityFunction, /\.eq\("item_template_id", item\.item_template_id\)/);
  assert.match(qualityFunction, /familyItemCount >= 4/);
  assert.match(qualityFunction, /maximumPositionShare > 0\.5/);
  assert.match(qualityFunction, /missingPositions\.length > 0/);
  assert.match(qualityFunction, /warnings\.push\("answer_position_distribution_imbalanced"\)/);
  assert.match(qualityFunction, /policyVersion: "family-balanced-v1"/);
  assert.match(qualityFunction, /severity: "warning"/);
});

test("technical QA validates fixed-order exceptions before publication", () => {
  assert.match(qualityFunction, /item\.config\?\.shuffleOptions !== false/);
  assert.match(qualityFunction, /optionOrderRationale/);
  assert.match(qualityFunction, /errors\.push\("shuffle_disabled_without_option_order_rationale"\)/);
  assert.match(migration, /15B_unjustified_fixed_option_order_failed/);
});

test("reviewer sees the new QA messages in natural Armenian", () => {
  assert.match(reviewerUi, /answer_position_distribution_imbalanced/);
  assert.match(reviewerUi, /ճիշտ պատասխանների դիրքերը անհամաչափ են բաշխված/);
  assert.match(reviewerUi, /shuffle_disabled_without_option_order_rationale/);
  assert.match(reviewerUi, /Տարբերակների խառնումն անջատված է/);
  assert.match(reviewerUi, /qaMessageHy/);
});

