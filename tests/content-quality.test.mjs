import test from "node:test";
import assert from "node:assert/strict";
import { difficultyBand, evaluateTechnicalQa, retirementReplacementIsValid } from "../dist/core/content-quality.js";

test("difficulty bands map 1 to foundation, 2-3 core, 4-5 challenge", () => {
  assert.equal(difficultyBand(1), "foundation");
  assert.equal(difficultyBand(2), "core");
  assert.equal(difficultyBand(3), "core");
  assert.equal(difficultyBand(4), "challenge");
  assert.equal(difficultyBand(5), "challenge");
});

test("single-choice QA rejects an answer key that is not an option", () => {
  const result = evaluateTechnicalQa({
    itemType: "single_choice", prompt: "Q", difficulty: 2, difficultyBand: "core",
    optionKeys: ["A", "B", "C"], answer: "D", sourceReference: "book", itemFamily: "application",
    reviewStatus: "approved", validationState: "sme_reviewed", misconceptionCount: 1,
  });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes("answer_not_in_options"));
});

test("quantity QA requires tolerance and unit metadata", () => {
  const result = evaluateTechnicalQa({
    itemType: "quantity", prompt: "Q", difficulty: 3, difficultyBand: "core",
    answer: 2.5, tolerance: null, canonicalUnit: null, acceptedUnits: [], sourceReference: "book",
    itemFamily: "application", reviewStatus: "approved", validationState: "sme_reviewed", misconceptionCount: 1,
  });
  assert.equal(result.passed, false);
  assert.ok(result.errors.includes("numeric_tolerance_missing"));
  assert.ok(result.errors.includes("quantity_unit_metadata_missing"));
});

test("review and SME gaps are warnings rather than technical-QA failures", () => {
  const result = evaluateTechnicalQa({
    itemType: "true_false", prompt: "Q", difficulty: 1, difficultyBand: "foundation", answer: true,
    sourceReference: "book", itemFamily: "knowledge", reviewStatus: "unreviewed",
    validationState: "provisional_no_sme_review", misconceptionCount: 1,
  });
  assert.equal(result.passed, true);
  assert.ok(result.warnings.includes("content_review_not_approved"));
  assert.ok(result.warnings.includes("sme_review_pending"));
});

test("retirement replacement must be same-skill, published, active and QA-passed", () => {
  assert.equal(retirementReplacementIsValid({
    itemId: "old", itemSkillId: "S08", replacementId: "new", replacementSkillId: "S08",
    replacementPublished: true, replacementRetired: false, replacementQaPassed: true,
  }), true);
  assert.equal(retirementReplacementIsValid({
    itemId: "old", itemSkillId: "S08", replacementId: "new", replacementSkillId: "S09",
    replacementPublished: true, replacementRetired: false, replacementQaPassed: true,
  }), false);
});
