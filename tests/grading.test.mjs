import test from "node:test";
import assert from "node:assert/strict";
import { gradeAnswer } from "../dist/core/grading.js";

test("grades single-choice deterministically", () => {
  const result = gradeAnswer({ type: "single_choice", answer: "B" }, { value: "B" });
  assert.equal(result.correct, true);
  assert.equal(result.score, 1);
});

test("accepts numeric value within tolerance", () => {
  const result = gradeAnswer({ type: "numeric", answer: 8, tolerance: 0.01 }, { value: "8.005" });
  assert.equal(result.correct, true);
});

test("converts km/h to m/s", () => {
  const result = gradeAnswer(
    { type: "quantity", answer: 10, canonicalUnit: "m/s", acceptedUnits: ["km/h"], tolerance: 0.0001 },
    { value: 36, unit: "km/h" }
  );
  assert.equal(result.correct, true);
  assert.deepEqual(result.normalizedResponse, { value: 10, unit: "m/s" });
});

test("rejects unsupported unit", () => {
  const result = gradeAnswer(
    { type: "quantity", answer: 10, canonicalUnit: "m/s", acceptedUnits: ["km/h"], tolerance: 0.01 },
    { value: 10, unit: "kg" }
  );
  assert.equal(result.correct, false);
  assert.equal(result.errorCode, "unsupported_unit");
});

test("rejects malformed true/false response", () => {
  const result = gradeAnswer({ type: "true_false", answer: false }, { value: "banana" });
  assert.equal(result.correct, false);
  assert.equal(result.errorCode, "invalid_boolean");
});
