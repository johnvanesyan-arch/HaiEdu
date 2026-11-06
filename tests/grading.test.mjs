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

test("accepts Armenian speed unit alias", () => {
  const result = gradeAnswer(
    { type: "quantity", answer: 10, canonicalUnit: "m/s", acceptedUnits: ["km/h"], tolerance: 0.0001 },
    { value: 36, unit: "կմ/ժ" }
  );
  assert.equal(result.correct, true);
});

test("converts millilitres to litres", () => {
  const result = gradeAnswer(
    { type: "quantity", answer: 2.5, canonicalUnit: "L", acceptedUnits: ["mL", "L"], tolerance: 0.0001 },
    { value: 2500, unit: "մլ" }
  );
  assert.equal(result.correct, true);
  assert.deepEqual(result.normalizedResponse, { value: 2.5, unit: "L" });
});

test("accepts Armenian litre alias", () => {
  const result = gradeAnswer(
    { type: "quantity", answer: 2.5, canonicalUnit: "L", acceptedUnits: ["L", "լ"], tolerance: 0.0001 },
    { value: 2.5, unit: "լ" }
  );
  assert.equal(result.correct, true);
});

test("treats mL and cm3 as equivalent volume units", () => {
  const result = gradeAnswer(
    { type: "quantity", answer: 250, canonicalUnit: "cm3", acceptedUnits: ["mL", "cm³"], tolerance: 0.0001 },
    { value: 250, unit: "մլ" }
  );
  assert.equal(result.correct, true);
  assert.deepEqual(result.normalizedResponse, { value: 250, unit: "cm3" });
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

test("decimal input accepts grouped thousands, Unicode minus and decimal comma", () => {
  for (const [value, expected] of [
    ["10 800", 10800], ["10\u00a0800", 10800], ["10\u202f800", 10800],
    ["1 234 567,89", 1234567.89], ["−5", -5], ["−1.5e−3", -0.0015],
    ["–5", -5], ["—5", -5], ["0٫35", 0.35], ["0,35", 0.35], ["0,125", 0.125], ["10,800", 10.8], ["10.800", 10.8],
    ["1e3", 1000], [10800, 10800],
  ]) {
    assert.deepEqual(gradeAnswer({ type: "numeric", answer: expected }, { value }), {
      correct: true, score: 1, errorCode: null, normalizedResponse: expected,
    }, JSON.stringify(value));
  }
  assert.equal(gradeAnswer({ type: "numeric", answer: 10800 }, { value: "10,800" }).errorCode, "incorrect_value");
});

test("malformed grouping and unsupported number notation are invalid", () => {
  for (const value of ["108 00", "10  800", "10\t800", "1,234,567", "1.234,56", "0x2A", "1e", "1e999", ".", ""]) {
    assert.equal(gradeAnswer({ type: "numeric", answer: 42 }, { value }).errorCode, "invalid_number", value);
  }
});

test("quantity values use the same formatting rule before unit conversion", () => {
  const key = { type: "quantity", answer: 10800, canonicalUnit: "m/s", acceptedUnits: ["km/h"] };
  assert.deepEqual(gradeAnswer(key, { value: "38 880", unit: "կմ/ժ" }).normalizedResponse, { value: 10800, unit: "m/s" });
  assert.equal(gradeAnswer(key, { value: "38 880", unit: "կգ" }).errorCode, "unsupported_unit");
  assert.equal(gradeAnswer(key, { value: "388 80", unit: "կմ/ժ" }).errorCode, "invalid_number");
});
