export type ItemType = "single_choice" | "true_false" | "numeric" | "quantity";

export type CompetencyLayer = "knowledge" | "application" | "transfer" | "reasoning";

export interface ItemDefinition {
  id: string;
  type: ItemType;
  skillId: string;
  difficulty: number;
}

export interface AnswerKey {
  type: ItemType;
  answer: unknown;
  tolerance?: number;
  canonicalUnit?: string;
  acceptedUnits?: string[];
}

export interface StudentResponse {
  value: unknown;
  unit?: string;
}

export interface GradeResult {
  correct: boolean;
  score: number;
  errorCode: string | null;
  normalizedResponse?: unknown;
}

export interface MasteryState {
  alpha: number;
  beta: number;
  evidenceCount: number;
  masteryScore: number;
  status: "insufficient_evidence" | "needs_support" | "developing" | "secure";
}

export interface MasteryAttemptEvidence {
  score: number;
  difficulty: number;
  hintUsed?: boolean;
}

export type RecommendationAction =
  | "review_prerequisite"
  | "continue_current_skill"
  | "advance_skill"
  | "collect_more_evidence";

export interface RecommendationInput {
  mastery: MasteryState;
  unmetPrerequisiteIds: string[];
  hasNextSkill: boolean;
}

export interface Recommendation {
  action: RecommendationAction;
  targetSkillId?: string;
  reason: string;
}
