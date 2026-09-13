import type { Recommendation, RecommendationInput } from "./types.ts";

export function recommendNext(input: RecommendationInput): Recommendation {
  if (input.unmetPrerequisiteIds.length > 0 && (input.mastery.status === "needs_support" || input.mastery.status === "developing")) {
    return {
      action: "review_prerequisite",
      targetSkillId: input.unmetPrerequisiteIds[0],
      reason: "Current-skill evidence is weak and at least one prerequisite is not secure."
    };
  }
  if (input.mastery.status === "insufficient_evidence") {
    return { action: "collect_more_evidence", reason: "Not enough attempts exist to make a reliable progression decision." };
  }
  if (input.mastery.status === "secure" && input.hasNextSkill) {
    return { action: "advance_skill", reason: "Current skill is secure and a next skill is available." };
  }
  return { action: "continue_current_skill", reason: "Continue practising the current skill before advancing." };
}
