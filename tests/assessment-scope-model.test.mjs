import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("architecture defines diagnostics and mastery checks as unit-bound", async () => {
  const architecture = await read("docs/assessment-scope-model.md");
  const decisions = await read("docs/decisions.md");

  assert.match(architecture, /Diagnostic = unit-bound learning guidance/);
  assert.match(architecture, /Mastery check = unit-bound verification/);
  assert.match(architecture, /There is no invariant that every unit has 10 skills/);
  assert.match(architecture, /course progress aggregates unit evidence/i);
  assert.match(decisions, /ADR-008 — Unit-bound learning guidance and mastery verification/);
});

test("student assessment UI distinguishes learning guidance from unit verification", async () => {
  const assessment = await read("web/assessment.html");
  const diagnostic = await read("web/diagnostic.html");
  const mastery = await read("web/mastery.html");

  assert.match(assessment, /ԳԼՈՒԽ I · ՈՒՍՈՒՑՄԱՆ ՈՒՂՂՈՐԴՈՒՄ/);
  assert.match(assessment, /ԳԼՈՒԽ I · ՅՈՒՐԱՑՄԱՆ ՀԱՍՏԱՏՈՒՄ/);
  assert.match(assessment, /Դասընթացային ամփոփիչ գնահատումը.*առանձին գնահատման տեսակ/);
  assert.match(diagnostic, /Անցնել\/չանցնել արդյունք չկա/);
  assert.match(mastery, /ամբողջ Ֆիզիկա 7 դասընթացի վերջնական գնահատում չէ/);
});

test("current 10-skill and 20-item values are documented as Unit I configuration", async () => {
  const scope = await read("docs/assessment-scope-model.md");
  const mastery = await read("docs/mastery-engine.md");

  assert.match(scope, /current Grade 7 Physics Unit I happens to have 10 skills/);
  assert.match(scope, /properties of the current Unit I blueprint, not global platform constants/);
  assert.match(mastery, /These are Unit I pilot settings, not permanent platform-wide rules/);
});
