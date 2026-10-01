import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  mergeReferenceMetadata,
  referenceMetadataPresentation,
  validateGuideContent,
} from "../supabase/functions/_shared/remediation-authoring-validation.mjs";

const canonical = {
  textbookSha256: "abc123",
  textbookLocator: "Ֆիզիկա 7 (2023), Գլուխ II, §8",
  programmeOutcomeLocator: "7-րդ դասարան / Թեմա 2 / Վերջնարդյունքներ / Պարտադիր 1(1)",
};

const validContent = {
  titleHy: "Վերնագիր",
  strategyHy: "Քայլային ռազմավարություն",
  hint1Hy: "Ուշադրություն դարձրու մասնիկների քանակին։",
  hint2Hy: "Համեմատիր մասնիկների տեսակները։",
  workedExampleHy: "Օրինակ՝ երկու միացած ատոմը կարող է կազմել մոլեկուլ։",
  allowedParameterKeys: [],
};

test("legacy blank editor aliases cannot erase canonical guide provenance", () => {
  const merged = mergeReferenceMetadata(canonical, {
    sourceTitle: "",
    sourceLocator: "",
    sourceUrl: "",
    notes: "",
  });
  assert.deepEqual(merged, canonical);
});

test("existing modern reference fields can still be intentionally cleared", () => {
  const modern = { sourceTitle: "Դասագիրք", sourceLocator: "էջ 12", sourceUrl: "https://example.test/book" };
  const merged = mergeReferenceMetadata(modern, { sourceTitle: "", sourceLocator: "էջ 13", sourceUrl: modern.sourceUrl });
  assert.equal(merged.sourceTitle, "");
  assert.equal(merged.sourceLocator, "էջ 13");
  assert.equal(merged.sourceUrl, modern.sourceUrl);
});

test("canonical textbook provenance satisfies source traceability warnings", () => {
  const view = referenceMetadataPresentation(canonical);
  assert.equal(view.sourceLocator, canonical.textbookLocator);
  const validation = validateGuideContent("template", validContent, canonical, null);
  assert.equal(validation.warnings.includes("source_title_missing"), false);
  assert.equal(validation.warnings.includes("source_locator_missing"), false);
  assert.equal(validation.warnings.includes("source_url_missing"), false);
});

test("blank modern aliases fall back to canonical provenance for presentation", () => {
  const view = referenceMetadataPresentation({ ...canonical, sourceLocator: "", sourceUrl: "" });
  assert.equal(view.sourceLocator, canonical.textbookLocator);
});

test("reviewer editor preserves unknown provenance keys and exposes canonical provenance", () => {
  const ui = readFileSync("web/content-guides.js", "utf8");
  assert.match(ui, /function referenceEditorValues/);
  assert.match(ui, /function canonicalProvenanceHtml/);
  assert.match(ui, /\{ \.\.\.detail\.guide\.referenceMetadata \}/);
  assert.match(ui, /textbookLocator/);
  assert.match(ui, /programmeOutcomeLocator/);
  assert.match(ui, /textbookSha256/);
  assert.match(ui, /value !== presented\[key\]/);
});
