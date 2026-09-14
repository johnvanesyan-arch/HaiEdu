import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMasteryCheck } from "../dist/core/mastery-check.js";

function results(values) {
  return values.map((correct, index) => ({ skillId: `S${index + 1}`, correct, total: 2 }));
}

test("mastery check passes at 80 percent when every skill has at least one correct", () => {
  const result = evaluateMasteryCheck(results([2,2,2,2,2,2,1,1,1,1]));
  assert.equal(result.percent, 80);
  assert.equal(result.passed, true);
  assert.deepEqual(result.failedSkillIds, []);
});

test("mastery check fails even above 80 percent when one skill is zero out of two", () => {
  const result = evaluateMasteryCheck(results([0,2,2,2,2,2,2,2,2,2]));
  assert.equal(result.percent, 90);
  assert.equal(result.passed, false);
  assert.equal(result.failedSkillIds[0], "S1");
});

test("mastery check fails below 80 percent and returns up to three remediation targets", () => {
  const result = evaluateMasteryCheck(results([1,1,1,1,1,2,2,2,2,2]));
  assert.equal(result.percent, 75);
  assert.equal(result.passed, false);
  assert.equal(result.failedSkillIds.length, 3);
});
