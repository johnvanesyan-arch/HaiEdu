import test from "node:test";
import assert from "node:assert/strict";
import { initialMasteryState, updateMastery } from "../dist/core/mastery.js";

test("starts with insufficient evidence", () => {
  const state = initialMasteryState();
  assert.equal(state.masteryScore, 0.5);
  assert.equal(state.status, "insufficient_evidence");
});

test("repeated correct answers increase mastery", () => {
  let state = initialMasteryState();
  for (let i = 0; i < 6; i++) {
    state = updateMastery(state, { score: 1, difficulty: 3, hintUsed: false });
  }
  assert.ok(state.masteryScore > 0.72);
  assert.equal(state.status, "secure");
});

test("hints reduce positive evidence", () => {
  const base = initialMasteryState();
  const noHint = updateMastery(base, { score: 1, difficulty: 3, hintUsed: false });
  const hinted = updateMastery(base, { score: 1, difficulty: 3, hintUsed: true });
  assert.ok(noHint.masteryScore > hinted.masteryScore);
});
