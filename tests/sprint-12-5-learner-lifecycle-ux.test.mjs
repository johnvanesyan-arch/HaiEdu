import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const lifecycle = read("supabase/functions/get-chapter-mastery-lifecycle/index.ts");
const mastery = read("web/mastery.js");
const masteryHtml = read("web/mastery.html");
const practice = read("web/practice.js");
const physics = read("web/physics-7.js");

test("learner lifecycle API is authenticated and student-scoped", () => {
  assert.match(lifecycle, /admin\.auth\.getUser\(token\)/);
  assert.match(lifecycle, /hasActiveLiveSession/);
  assert.match(lifecycle, /hasPhysics7Access/);
  assert.match(lifecycle, /\.eq\("student_id", userData\.user\.id\)/);
  assert.match(lifecycle, /maximum_mastery_attempts/);
  assert.match(lifecycle, /attemptsRemaining: Math\.max\(0, maximumAttempts - attemptsUsed\)/);
});

test("pass and final failure have distinct natural Armenian learner states", () => {
  assert.match(mastery, /Գլխի յուրացումը հաստատված է/);
  assert.match(mastery, /Յուրացման ստուգման փորձերն ավարտված են/);
  assert.match(mastery, /ավարտել եք այս գլխի յուրացման ստուգման բոլոր երեք փորձերը/);
  assert.match(mastery, /Կրկնել գլուխը/);
  assert.match(masteryHtml, /resultReviewAction/);
  assert.match(physics, /Փորձերն ավարտված են/);
});

test("required and optional Chapter Review experiences are explicit", () => {
  assert.match(practice, /Պահանջվող Գլխի կրկնություն/);
  assert.match(practice, /Այս կրկնությունը պետք է ավարտեք՝ յուրացման ստուգումը կրկին անցնելու համար/);
  assert.match(practice, /Լրացուցիչ կրկնություն/);
  assert.match(practice, /Կրկին անցնել յուրացման ստուգումը/);
  assert.match(practice, /արդեն հաստատված յուրացումը/);
});

test("learner copy does not surface internal lifecycle completion codes", () => {
  for (const code of ["review_requirement_satisfied", "pool_exhausted"]) {
    assert.doesNotMatch(mastery, new RegExp(code));
    assert.doesNotMatch(practice, new RegExp(code));
    assert.doesNotMatch(physics, new RegExp(code));
  }
});

test("no casual attempt reset or fourth-attempt learner control exists", () => {
  const learnerSurface = `${mastery}\n${masteryHtml}\n${practice}\n${physics}`;
  assert.doesNotMatch(learnerSurface, /reset attempts/i);
  assert.doesNotMatch(learnerSurface, /փորձ 4|4 \/ 4/i);
});
