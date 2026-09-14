import test from "node:test";
import assert from "node:assert/strict";
import { choosePracticeItem, countConsecutiveWrong, desiredPracticeDifficulty } from "../dist/core/practice.js";

test("difficulty drops after repeated mistakes", () => {
  assert.equal(desiredPracticeDifficulty(0.6), 3);
  const selection = choosePracticeItem(
    [
      { id: "a", difficulty: 1 },
      { id: "b", difficulty: 2 },
      { id: "c", difficulty: 3 },
    ],
    [
      { itemId: "x", correct: false },
      { itemId: "y", correct: false },
    ],
    0.6,
  );
  assert.equal(selection?.selectionMode, "bridge");
  assert.equal(selection?.desiredDifficulty, 1);
  assert.equal(selection?.selectedId, "a");
});

test("scheduler avoids immediate repetition and prefers unseen items", () => {
  const selection = choosePracticeItem(
    [
      { id: "a", difficulty: 2 },
      { id: "b", difficulty: 2 },
      { id: "c", difficulty: 2 },
    ],
    [{ itemId: "a", correct: false }],
    0.5,
  );
  assert.notEqual(selection?.selectedId, "a");
  assert.equal(selection?.selectionMode, "new_item");
});

test("resolved mistakes are not pointlessly repeated", () => {
  const selection = choosePracticeItem(
    [
      { id: "a", difficulty: 2 },
      { id: "b", difficulty: 2 },
      { id: "c", difficulty: 2 },
    ],
    [
      { itemId: "a", correct: true },
      { itemId: "a", correct: false },
      { itemId: "b", correct: true },
      { itemId: "c", correct: true },
    ],
    0.6,
  );
  assert.notEqual(selection?.selectionMode, "remediation");
});

test("consecutive wrong count stops at most recent correct", () => {
  assert.equal(countConsecutiveWrong([
    { itemId: "a", correct: false },
    { itemId: "b", correct: false },
    { itemId: "c", correct: true },
    { itemId: "d", correct: false },
  ]), 2);
});
