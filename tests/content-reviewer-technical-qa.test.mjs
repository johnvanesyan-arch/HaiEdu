import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("Content Reviewer item editor does not expose known legacy English workflow labels", () => {
  const editor = read("web/content.js");
  const review = read("web/content-review-workflow.js");
  for (const phrase of [
    "Question content",
    "Armenian question",
    "English question",
    "Stimulus JSON",
    "Add option",
    "Add mapping",
    "No mappings.",
    "Revision summary",
    "Save as new version",
    "Retire / replace",
    "Restore to review",
    "Review workflow",
    "No review history yet.",
    "System / historical review",
  ]) {
    assert.equal(editor.includes(phrase) || review.includes(phrase), false, `legacy English label remains: ${phrase}`);
  }
});

test("Question Bank rows are keyboard-operable", () => {
  const editor = read("web/content.js");
  assert.match(editor, /row\.tabIndex = 0/);
  assert.match(editor, /row\.setAttribute\("role", "link"\)/);
  assert.match(editor, /\["Enter", " "\]\.includes\(event\.key\)/);
});

test("Item workspace toggle buttons expose valid pressed state instead of tab aria without tab roles", () => {
  const editor = read("web/content.js");
  assert.match(editor, /setAttribute\("aria-pressed", String\(active\)\)/);
  assert.doesNotMatch(editor, /setAttribute\("aria-selected", String\(active\)\)/);
});

test("Review history is anchored to the current Model A decision section", () => {
  const editor = read("web/content.js");
  const workflow = read("web/content-review-workflow.js");
  assert.match(editor, /id="contentDecisionSection"/);
  assert.match(workflow, /querySelector\("#contentDecisionSection"\)/);
  assert.doesNotMatch(workflow, /Review workflow/);
});

test("Review-history helper reuses the platform Supabase client and avoids dead bank-queue code", () => {
  const workflow = read("web/content-review-workflow.js");
  assert.match(workflow, /window\.__haieduSupabaseClient \|\|= createClient/);
  assert.doesNotMatch(workflow, /changesQueueBtn|refreshChangesQueueCount/);
  assert.match(workflow, /Intl\.DateTimeFormat\("hy-AM"/);
});
