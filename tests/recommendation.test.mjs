import test from "node:test";
import assert from "node:assert/strict";
import { recommendNext } from "../dist/core/recommendation.js";

const mastery = (status) => ({
  alpha: 2,
  beta: 2,
  evidenceCount: status === "insufficient_evidence" ? 1 : 6,
  masteryScore: status === "secure" ? 0.8 : status === "developing" ? 0.6 : 0.35,
  status
});

test("sends weak learner to unmet prerequisite", () => {
  const result = recommendNext({ mastery: mastery("needs_support"), unmetPrerequisiteIds: ["skill-prereq"], hasNextSkill: true });
  assert.equal(result.action, "review_prerequisite");
  assert.equal(result.targetSkillId, "skill-prereq");
});

test("advances secure learner", () => {
  const result = recommendNext({ mastery: mastery("secure"), unmetPrerequisiteIds: [], hasNextSkill: true });
  assert.equal(result.action, "advance_skill");
});
