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


test("every known technical QA code has an Armenian reviewer message", () => {
  const editor = read("web/content.js");
  const backend = read("supabase/functions/manage-content-quality/index.ts");
  const core = read("backend/core/content-quality.ts");
  const codes = new Set(
    [...backend.matchAll(/(?:errors|warnings)\.push\("([^"]+)"\)/g), ...core.matchAll(/(?:errors|warnings)\.push\("([^"]+)"\)/g)]
      .map((match) => match[1]),
  );
  assert.ok(codes.size >= 20, "QA-code extraction should cover the technical evaluator");
  for (const code of codes) {
    assert.ok(editor.includes(code + ': "'), "missing Armenian QA label for " + code);
  }
  assert.match(editor, /Տեխնիկական QA հաղորդագրություն՝/);
});


test("review-history enhancer stops polling when no item id exists and preserves backend error detail", () => {
  const workflow = read("web/content-review-workflow.js");
  assert.match(workflow, /if \(!panel \|\| !itemId\) return/);
  assert.match(workflow, /response instanceof Response[\s\S]*response\.clone\(\)\.json/);
});


test("Content Reviewer cannot mutate SME validation state through item editing", () => {
  const editor = read("web/content.js");
  const endpoint = read("supabase/functions/manage-content-quality/index.ts");
  assert.doesNotMatch(editor, /id="metaValidation"/, "SME status must not be an editable field");
  assert.doesNotMatch(editor, /validationState:\s*\$\("metaValidation"\)/, "revision payload must not carry SME state");
  assert.match(editor, /Content Reviewer-ը չի փոխում/, "UI must explain the separate SME workflow");
  assert.match(endpoint, /delete payload\.validationState/, "server must strip legacy/open-tab SME state from revisions");
  assert.match(endpoint, /sme_validation_managed_separately/, "direct metadata mutation must be rejected");
  assert.doesNotMatch(endpoint, /patch\.validation_state\s*=/, "metadata action must not write SME state");
});


test("remediation-guide frontend localizes every explicit API error code", () => {
  const ui = read("web/content-guides.js");
  const endpoint = read("supabase/functions/manage-remediation-guides/index.ts");
  const mapStart = ui.indexOf("const errorLabels = {");
  const mapEnd = ui.indexOf("};", mapStart);
  const mapBlock = ui.slice(mapStart, mapEnd + 2);
  const codes = new Set([
    ...[...endpoint.matchAll(/error:\s*"([a-z0-9_]+)"/g)].map((match) => match[1]),
    ...[...endpoint.matchAll(/throw new Error\("([a-z0-9_]+)"\)/g)].map((match) => match[1]),
  ]);
  for (const code of codes) {
    assert.ok(mapBlock.includes(code + ":"), "missing Armenian guide error label for " + code);
  }
});

test("remediation-guide previews localize known difficulty bands", () => {
  const ui = read("web/content-guides.js");
  assert.match(ui, /foundation: "Հիմքային"/);
  assert.match(ui, /core: "Հիմնական"/);
  assert.match(ui, /challenge: "Առաջադեմ"/);
  assert.match(ui, /difficultyBandLabels\[variant\.difficulty_band\]/);
});


test("question workflow localizes every explicit manage-content-quality error", () => {
  const ui = read("web/content.js");
  const endpoint = read("supabase/functions/manage-content-quality/index.ts");
  const mapStart = ui.indexOf("const CONTENT_ERROR_HY = {");
  const mapEnd = ui.indexOf("};", mapStart);
  const mapBlock = ui.slice(mapStart, mapEnd + 2);
  const codes = new Set([...endpoint.matchAll(/error:\s*"([a-z0-9_]+)"/g)].map((match) => match[1]));
  for (const code of codes) {
    assert.ok(mapBlock.includes(code + ":"), "missing Armenian content error label for " + code);
  }
  assert.match(ui, /function contentErrorHy/);
});
