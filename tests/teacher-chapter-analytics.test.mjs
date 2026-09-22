import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("web/teacher.html");
const js = read("web/teacher.js");

test("teacher skill matrix is explicitly Chapter I analytics", () => {
  assert.match(html, /ՖԻԶԻԿԱ 7 · ԳԼՈՒԽ I/);
  assert.match(html, /Հմտությունների վիճակ/);
  assert.match(html, /Բնության ուսումնասիրության ֆիզիկական մեթոդները/);
  assert.match(html, /Գլուխ I-ի հմտությունների վիճակ/);
});

test("chapter analytics expose actionable class summary cards", () => {
  for (const id of [
    "matrixStudentTotal",
    "matrixMasteredTotal",
    "matrixNeedsSupportTotal",
    "matrixRequiredReviewTotal",
    "matrixNoActivityTotal",
    "matrixAttentionSummary",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(js, /function renderMatrixSummary\(klass\)/);
  assert.match(js, /studentMasteryConfirmed/);
  assert.match(js, /studentHasNeedsSupport/);
  assert.match(js, /studentHasRequiredReview/);
});

test("chapter analytics filter students without changing the underlying class summary", () => {
  assert.match(html, /id="matrixStudentFilter"/);
  for (const value of ["all", "needs_support", "required_review", "mastery_confirmed", "no_activity"]) {
    assert.match(html, new RegExp(`value="${value}"`));
  }
  assert.match(js, /function matchesMatrixFilter\(student\)/);
  assert.match(js, /const students = allStudents\.filter\(matchesMatrixFilter\)/);
  assert.match(js, /renderMatrixSummary\(klass\)/);
});

test("attention centres are derived only from existing red and yellow skill bands", () => {
  assert.match(js, /cell\?\.band === "needs_support"/);
  assert.match(js, /cell\?\.band === "developing"/);
  assert.doesNotMatch(js, /attentionScore|riskScore|newThreshold/i);
});
