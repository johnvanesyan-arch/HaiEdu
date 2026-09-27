import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../supabase/functions/_shared/chapter-review-selection.ts", import.meta.url), "utf8");
const { selectReviewCoverageFirst } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);
const item = (id, skill, last = 0) => ({ item_id: id, skill_id: skill, last });
const choose = (items, seen, target, overrides = {}) => selectReviewCoverageFirst({
  items,
  skillIds: [...new Set(items.map((x) => x.skill_id))],
  seenInCycle: new Set(seen),
  targetCount: target,
  candidateOrder: (a, b) => a.last - b.last || a.item_id.localeCompare(b.item_id),
  priorityOrder: (a, b) => a.item_id.localeCompare(b.item_id),
  // Deliberately reverses lexical order to catch repeats shuffled ahead of fresh items.
  presentationOrder: (a, b) => b.item_id.localeCompare(a.item_id),
  ...overrides,
});

test("an exhausted skill cannot repeat while other skills have enough unseen questions", () => {
  const bank = [item("a", "A"), ...[1, 2, 3, 4].map((n) => item(`b${n}`, "B"))];
  const result = choose(bank, ["a"], 3);
  assert.equal(result.length, 3);
  assert.ok(result.every((x) => x.item.skill_id === "B" && !x.repeated));
});

test("weak-skill weighting cannot promote a seen question ahead of unseen work", () => {
  const bank = [item("weak", "A"), item("fresh1", "B"), item("fresh2", "B")];
  const result = choose(bank, ["weak"], 2, { priorityOrder: (a, b) => Number(b.skill_id === "A") - Number(a.skill_id === "A") });
  assert.deepEqual(new Set(result.map((x) => x.item.item_id)), new Set(["fresh1", "fresh2"]));
});

test("a boundary session presents every remaining unseen item before least-recent repeat fill", () => {
  const bank = [item("z-old", "A", 1), item("y-recent", "B", 9), item("a-fresh", "C")];
  const result = choose(bank, ["z-old", "y-recent"], 2);
  assert.deepEqual(result.map((x) => x.item.item_id), ["a-fresh", "z-old"]);
  assert.deepEqual(result.map((x) => x.repeated), [false, true]);
});

test("uneven pools are exhausted before the first repeat across successive sessions", () => {
  const bank = [item("a", "A"), ...Array.from({ length: 9 }, (_, n) => item(`b${n}`, "B")), item("c", "C")];
  const seen = new Set();
  for (let session = 0; session < 3; session++) {
    const result = choose(bank, seen, 4);
    assert.equal(result.length, 4);
    assert.equal(new Set(result.map((x) => x.item.item_id)).size, 4);
    for (const row of result) {
      if (seen.has(row.item.item_id)) assert.equal(seen.size, bank.length);
      seen.add(row.item.item_id);
    }
  }
  assert.equal(seen.size, bank.length);
});

test("a new cycle allows every question again and keeps within-session IDs unique", () => {
  const bank = [item("a", "A"), item("b", "B"), item("c", "C")];
  const result = choose(bank, [], 12);
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map((x) => x.item.item_id)).size, 3);
  assert.ok(result.every((x) => !x.repeated));
});

test("each still-uncovered skill gets a slot when the session has room", () => {
  const bank = [item("a1", "A"), item("a2", "A"), item("b1", "B"), item("c1", "C")];
  const result = choose(bank, [], 3);
  assert.deepEqual(new Set(result.map((x) => x.item.skill_id)), new Set(["A", "B", "C"]));
});

test("selection is deterministic and leaves input collections untouched", () => {
  const bank = [item("b", "B"), item("a", "A"), item("c", "B")];
  const before = structuredClone(bank);
  assert.deepEqual(choose(bank, ["b"], 3), choose(bank, ["b"], 3));
  assert.deepEqual(bank, before);
});
