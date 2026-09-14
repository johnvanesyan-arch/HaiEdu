import test from "node:test";
import assert from "node:assert/strict";
import { diagnosticBand, chooseRecommendedSkill } from "../dist/core/dashboard.js";

test("diagnostic bands map two-item evidence to learner guidance", () => {
  assert.equal(diagnosticBand(2, 2), "strong");
  assert.equal(diagnosticBand(1, 2), "developing");
  assert.equal(diagnosticBand(0, 2), "needs_support");
  assert.equal(diagnosticBand(0, 0), "not_assessed");
});

test("recommendation prioritizes earliest support need, then developing, then incomplete", () => {
  const selected = chooseRecommendedSkill([
    { id: "s1", sequenceOrder: 1, diagnosticBand: "strong", complete: true },
    { id: "s2", sequenceOrder: 2, diagnosticBand: "developing", complete: false },
    { id: "s3", sequenceOrder: 3, diagnosticBand: "needs_support", complete: false },
  ]);
  assert.equal(selected?.id, "s3");

  const prerequisiteEarlier = chooseRecommendedSkill([
    { id: "s1", sequenceOrder: 1, diagnosticBand: "needs_support", complete: false },
    { id: "s2", sequenceOrder: 2, diagnosticBand: "needs_support", complete: false },
  ]);
  assert.equal(prerequisiteEarlier?.id, "s1");
});
