import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseDiagnosticForm,
  chooseMasteryVariants,
  choosePracticeVariant,
} from "../dist/core/item-selection.js";

const c = (id, difficulty = 2) => ({ id, variantId: `v:${id}`, difficulty });
const e = (id, correct, servedAt) => ({ itemId: id, variantId: `v:${id}`, correct, answered: correct !== null, servedAt });

test("practice prefers globally unseen concrete variants", () => {
  const result = choosePracticeVariant(
    [c("a", 2), c("b", 3), c("c", 4)],
    [e("a", false, "2026-09-15T10:00:00Z"), e("b", true, "2026-09-15T11:00:00Z")],
    new Set(),
    4,
  );
  assert.equal(result?.selectedId, "c");
  assert.equal(result?.reason, "unseen_variant");
  assert.equal(result?.poolExhausted, false);
});

test("practice returns to unresolved errors only after spacing", () => {
  const result = choosePracticeVariant(
    [c("a"), c("b"), c("c"), c("d")],
    [
      e("d", true, "2026-09-15T14:00:00Z"),
      e("c", true, "2026-09-15T13:00:00Z"),
      e("b", true, "2026-09-15T12:00:00Z"),
      e("a", false, "2026-09-15T10:00:00Z"),
    ],
    new Set(),
    2,
    3,
  );
  assert.equal(result?.selectedId, "a");
  assert.equal(result?.reason, "unresolved_error_after_spacing");
});

test("practice uses least-recent review after unseen and unresolved are exhausted", () => {
  const result = choosePracticeVariant(
    [c("a"), c("b"), c("c"), c("d")],
    [
      e("d", true, "2026-09-15T14:00:00Z"),
      e("c", true, "2026-09-15T13:00:00Z"),
      e("b", true, "2026-09-15T12:00:00Z"),
      e("a", true, "2026-09-15T09:00:00Z"),
    ],
    new Set(),
    2,
    3,
  );
  assert.equal(result?.selectedId, "a");
  assert.equal(result?.reason, "least_recent_review");
});

test("exact repeat is explicit only when the practice pool is exhausted", () => {
  const result = choosePracticeVariant(
    [c("a"), c("b"), c("c"), c("d")],
    [
      e("d", true, "2026-09-15T14:00:00Z"),
      e("c", true, "2026-09-15T13:00:00Z"),
      e("b", true, "2026-09-15T12:00:00Z"),
      e("a", true, "2026-09-15T11:00:00Z"),
    ],
    new Set(["a", "b", "c", "d"]),
    2,
    3,
  );
  assert.equal(result?.reason, "pool_exhausted_exact_repeat");
  assert.equal(result?.poolExhausted, true);
});

test("diagnostic rotation avoids the immediately previous form", () => {
  assert.equal(chooseDiagnosticForm(["A", "B"], ["A"]), "B");
  assert.equal(chooseDiagnosticForm(["A", "B"], ["B", "A"]), "A");
});

test("mastery prefers unseen protected alternatives over prior-form overlap", () => {
  const result = chooseMasteryVariants(
    [c("a"), c("b"), c("c"), c("d")],
    [e("a", false, "2026-09-15T10:00:00Z"), e("b", true, "2026-09-15T10:01:00Z")],
    new Set(["a", "b"]),
    2,
  );
  assert.deepEqual(result.selected.map((x) => x.id).sort(), ["c", "d"]);
  assert.equal(result.overlapCount, 0);
  assert.equal(result.poolExhausted, false);
});

test("mastery overlap is auditable fallback when no alternate protected variants exist", () => {
  const result = chooseMasteryVariants(
    [c("a"), c("b")],
    [e("a", false, "2026-09-15T10:00:00Z"), e("b", false, "2026-09-15T10:01:00Z")],
    new Set(["a", "b"]),
    2,
  );
  assert.equal(result.selected.length, 2);
  assert.equal(result.overlapCount, 2);
  assert.equal(result.poolExhausted, true);
  assert.ok(result.selected.every((x) => x.reason === "mastery_overlap_fallback_pool_exhausted"));
});
