import test from "node:test";
import assert from "node:assert/strict";
import { classifyTeacherMastery, prioritizeWeakSkills, recommendTeacherIntervention } from "../dist/core/teacher-insights.js";

test("classifies teacher mastery bands", () => {
  assert.equal(classifyTeacherMastery(null), "not_assessed");
  assert.equal(classifyTeacherMastery(0.3), "needs_support");
  assert.equal(classifyTeacherMastery(0.6), "developing");
  assert.equal(classifyTeacherMastery(0.8), "secure");
});

test("prioritizes needs-support before unassessed and developing", () => {
  const result = prioritizeWeakSkills([
    { code: "S03", percent: 60, band: "developing" },
    { code: "S02", percent: null, band: "not_assessed" },
    { code: "S01", percent: 30, band: "needs_support" },
  ]);
  assert.deepEqual(result.map((x) => x.code), ["S01", "S02", "S03"]);
});

test("active session takes priority over new remediation", () => {
  const rec = recommendTeacherIntervention({
    masteryCheckPassed: false,
    hasActiveSession: true,
    attemptCount: 10,
    skills: [{ code: "S08", percent: 20, band: "needs_support" }],
  });
  assert.equal(rec.action, "finish_active_session");
});

test("weakest skill becomes practice recommendation", () => {
  const rec = recommendTeacherIntervention({
    masteryCheckPassed: false,
    hasActiveSession: false,
    attemptCount: 10,
    skills: [
      { code: "S07", percent: 64, band: "developing" },
      { code: "S08", percent: 28, band: "needs_support" },
    ],
  });
  assert.equal(rec.action, "practice_skill");
  assert.equal(rec.skillCode, "S08");
});

test("all secure skills recommend mastery check", () => {
  const rec = recommendTeacherIntervention({
    masteryCheckPassed: false,
    hasActiveSession: false,
    attemptCount: 12,
    skills: [{ code: "S01", percent: 82, band: "secure" }],
  });
  assert.equal(rec.action, "mastery_check");
});
