import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync("web/content.js", "utf8");

function has(pattern, message) {
  assert.match(editor, pattern, message);
}

test("editing marks the content editor dirty and makes the state visible", () => {
  has(/let editorDirty = false/, "editor must track unsaved state");
  has(/id="unsavedChangesNotice"/, "editor must show an unsaved-changes notice");
  has(/wireEditorDirtyTracking\(\)/, "editable controls must be watched for changes");
  has(/beforeunload/, "browser navigation must guard unsaved edits");
});

test("approval saves edited content before QA and approval", () => {
  has(/async function approveCurrent\(\)/, "approval must use the safe editor-aware workflow");
  has(/editorDirty \? await persistCurrentRevision\("Saved during approval"\)/, "dirty content must be saved before approval");
  has(/ensureQaPassed\(\{ force: saved \|\| item\.latestQa\?\.passed !== true \}\)/, "saved revisions must run current-version QA before approval");
  has(/action: "approve"/, "approval must still use the backend approval gate");
  has(/Save, QA & approve/, "the button must tell the editor what happens when changes are unsaved");
});

test("QA and review submission also cannot operate on stale unsaved content", () => {
  has(/async function runQaCurrent\(\)/, "QA must use an editor-aware workflow");
  has(/Saved before technical QA/, "QA must persist dirty edits first");
  has(/async function submitReviewCurrent\(\)/, "review submission must use an editor-aware workflow");
  has(/Saved before review submission/, "review submission must persist dirty edits first");
});

test("switching items or refreshing warns before discarding unsaved content", () => {
  has(/Discard them and open another item/, "item switching must guard unsaved edits");
  has(/Discard unsaved changes and refresh the question bank/, "refresh must guard unsaved edits");
});
