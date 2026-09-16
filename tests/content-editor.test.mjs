import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync("web/content.js", "utf8");
const manage = readFileSync("supabase/functions/manage-content-quality/index.ts", "utf8");
const dashboard = readFileSync("supabase/functions/get-content-quality-dashboard/index.ts", "utf8");
const revision = readFileSync("supabase/migrations/0029_content_editor_atomic_revision.sql", "utf8");
const reviewHold = readFileSync("supabase/migrations/0030_content_editor_11d_review_hold.sql", "utf8");

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test("content console edits question, options, answer, metadata and misconceptions", () => {
  has(editor, /id="editPromptHy"/, "Armenian prompt must be editable");
  has(editor, /class="option-hy"/, "single-choice options must be editable");
  has(editor, /answerSingleChoice|answerNumeric|answerTrueFalse/, "answer editor must support item types");
  has(editor, /metaDifficulty/, "difficulty must remain editable");
  has(editor, /misconception-code/, "misconception mappings must be editable");
  has(editor, /save_content_revision/, "editor must use the atomic revision action");
});

test("content editor API exposes detail and atomic revision actions", () => {
  has(manage, /action === "get_item_detail"/, "full item detail action must exist");
  has(manage, /action === "save_content_revision"/, "atomic content revision action must exist");
  has(manage, /service_save_item_content_revision/, "revision action must use the server-side transaction RPC");
  has(manage, /generated_variant_requires_template_edit/, "generated variants must expose a deterministic-edit lock");
});

test("atomic revision snapshots both sides and resets review state", () => {
  has(revision, /for update;/i, "item row must be locked during revision");
  has(revision, /Pre-edit snapshot before:/, "pre-edit state must be snapshotted");
  has(revision, /v_next_version := v_item\.version_no \+ 1/, "revision must increment version exactly once");
  has(revision, /review_status='needs_review'/, "edited content must require review again");
  has(revision, /status='review'/, "edited content must leave published state");
  has(revision, /delete from public\.item_options/, "option replacement must be transactionally controlled");
  has(revision, /insert into public\.item_answer_keys/, "answer key must be saved in the same transaction");
  has(revision, /delete from public\.item_misconception_mappings/, "misconception mappings must be replaced in the same transaction");
});

test("direct edits of deterministic generated variants are blocked", () => {
  has(revision, /variant_seed is not null and v_template_kind in \('parameterized','parallel'\)/, "generated variants must be identified from seed and template kind");
  has(revision, /raise exception 'generated_variant_requires_template_edit'/, "generated variants must fail closed instead of breaking reproducibility");
});

test("dashboard does not show stale QA or review evidence after a revision", () => {
  has(dashboard, /Number\(qaRaw\.version_no\) === Number\(item\.version_no\)/, "QA must be scoped to current version");
  has(dashboard, /Number\(reviewRaw\.version_no\) === Number\(item\.version_no\)/, "review evidence must be scoped to current version");
});

test("11D human approval remains staged until explicit bank activation", () => {
  has(reviewHold, /new\.config->>'phase' = '11D'/, "hold must be scoped to Sprint 11D candidates");
  has(reviewHold, /pilot_ready.*is not true/s, "unactivated candidates must remain held");
  has(reviewHold, /new\.status := 'review'/, "human approval must not publish an unactivated 11D candidate");
  has(reviewHold, /humanReviewStatus.*approved/s, "human approval evidence must still be recorded");
});
