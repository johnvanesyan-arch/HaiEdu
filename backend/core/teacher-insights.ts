export type TeacherSkillBand = "secure" | "developing" | "needs_support" | "not_assessed";

export interface TeacherSkillInsight {
  code: string;
  percent: number | null;
  band: TeacherSkillBand;
}

export type TeacherInterventionAction =
  | "unit_complete"
  | "finish_active_session"
  | "take_diagnostic"
  | "practice_skill"
  | "mastery_check";

export function classifyTeacherMastery(score: number | null, threshold = 0.72): TeacherSkillBand {
  if (score === null) return "not_assessed";
  if (score >= threshold) return "secure";
  if (score < 0.45) return "needs_support";
  return "developing";
}

export function prioritizeWeakSkills(skills: TeacherSkillInsight[]): TeacherSkillInsight[] {
  const rank: Record<TeacherSkillBand, number> = {
    needs_support: 0,
    not_assessed: 1,
    developing: 2,
    secure: 3,
  };
  return skills
    .filter((skill) => skill.band !== "secure")
    .sort((a, b) => rank[a.band] - rank[b.band] || (a.percent ?? -1) - (b.percent ?? -1) || a.code.localeCompare(b.code));
}

export function recommendTeacherIntervention(input: {
  masteryCheckPassed: boolean;
  hasActiveSession: boolean;
  attemptCount: number;
  skills: TeacherSkillInsight[];
}): { action: TeacherInterventionAction; skillCode: string | null } {
  if (input.masteryCheckPassed) return { action: "unit_complete", skillCode: null };
  if (input.hasActiveSession) return { action: "finish_active_session", skillCode: null };
  if (input.attemptCount === 0) return { action: "take_diagnostic", skillCode: null };
  const weak = prioritizeWeakSkills(input.skills);
  if (weak.length) return { action: "practice_skill", skillCode: weak[0].code };
  return { action: "mastery_check", skillCode: null };
}
