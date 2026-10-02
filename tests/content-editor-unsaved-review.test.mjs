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

test("Model A requires an explicit save before QA", () => {
  has(/async function runQaCurrent\(\)/, "QA must use the editor-aware workflow");
  has(/if \(editorDirty\)[\s\S]*Նախ պահպանեք փոփոխությունները որպես նոր տարբերակ, ապա գործարկեք QA-ն/, "dirty content must block QA until the reviewer saves a new version");
  assert.doesNotMatch(editor, /Saved before technical QA/, "QA must not silently save content in Model A");
  has(/action: "run_qa"/, "QA must still use the protected backend action");
});

test("Model A requires passed current-version QA before approval", () => {
  has(/async function approveCurrent\(\)/, "approval must use the safe reviewer workflow");
  has(/if \(editorDirty\)[\s\S]*Հաստատումը հնարավոր է միայն պահպանված և QA անցած տարբերակի համար/, "dirty content must block approval");
  has(/item\.latestQa\?\.passed !== true/, "approval must require already-passed QA");
  has(/action: "approve"/, "approval must still use the protected backend approval action");
  assert.doesNotMatch(editor, /Saved during approval/, "approval must not silently save content");
  assert.doesNotMatch(editor, /ensureQaPassed\(\{ force: saved/, "approval must not silently run QA");
});

test("Model A removes ceremonial submit-review and request-changes controls", () => {
  assert.doesNotMatch(editor, /id="submitReviewBtn"/, "item reviewer UI must not expose Submit review");
  assert.doesNotMatch(editor, /id="changesBtn"/, "item reviewer UI must not expose Request changes");
  assert.doesNotMatch(editor, /async function submitReviewCurrent\(\)/, "item reviewer UI must not maintain an unused submit-review handler");
  has(/id="editQuestionBtn"/, "reviewer must have a direct Edit question action");
  has(/Բովանդակային որոշում/, "review tab must present a simple content decision");
});

test("switching items or refreshing warns before discarding unsaved content", () => {
  has(/Չեղարկե՞լ դրանք և բացել մեկ այլ հարց/, "item switching must guard unsaved edits");
  has(/Չեղարկե՞լ չպահպանված փոփոխությունները և թարմացնել հարցերի բանկը/, "refresh must guard unsaved edits");
});
