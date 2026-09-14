import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticBand, chooseRecommendedSkill } from "../dist/core/dashboard.js";

test("diagnostic bands map two-item evidence to learner guidance", () => {
  assert.equal(diagnosticBand(2, 2), "strong");
  assert.equal(diagnosticBand(1, 2), "developing");
  assert.equal(diagnosticBand(0, 2), "needs_support");
  assert.equal(diagnosticBand(0, 0), "not_assessed");
});

test("recommendation prioritizes unfinished support needs", () => {
  const selected = chooseRecommendedSkill([
    { id: "s1", sequenceOrder: 1, diagnosticBand: "strong", complete: true },
    { id: "s2", sequenceOrder: 2, diagnosticBand: "developing", complete: false },
    { id: "s3", sequenceOrder: 3, diagnosticBand: "needs_support", complete: false },
  ]);
  assert.equal(selected?.id, "s3");
});

test("recommendation resolves an unmet prerequisite before the downstream gap", () => {
  const selected = chooseRecommendedSkill([
    { id: "s8", sequenceOrder: 8, diagnosticBand: "developing", complete: false },
    { id: "s9", sequenceOrder: 9, diagnosticBand: "needs_support", complete: false, prerequisiteIds: ["s8"] },
  ]);
  assert.equal(selected?.id, "s8");

  const afterRepair = chooseRecommendedSkill([
    { id: "s8", sequenceOrder: 8, diagnosticBand: "developing", complete: true },
    { id: "s9", sequenceOrder: 9, diagnosticBand: "needs_support", complete: false, prerequisiteIds: ["s8"] },
  ]);
  assert.equal(afterRepair?.id, "s9");
});
