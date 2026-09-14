export interface MasteryCheckSkillResult {
  skillId: string;
  correct: number;
  total: number;
}

export interface MasteryCheckResult {
  passed: boolean;
  percent: number;
  failedSkillIds: string[];
}

export function evaluateMasteryCheck(
  skillResults: MasteryCheckSkillResult[],
  passPercent = 80,
  minCorrectPerSkill = 1,
): MasteryCheckResult {
  const answered = skillResults.reduce((sum, row) => sum + row.total, 0);
  const correct = skillResults.reduce((sum, row) => sum + row.correct, 0);
  const percent = answered ? Math.round((correct / answered) * 100) : 0;
  const everySkillMinimum = skillResults.length > 0 && skillResults.every((row) => row.correct >= minCorrectPerSkill);
  const passed = percent >= passPercent && everySkillMinimum;

  const failedSkillIds = passed
    ? []
    : [...skillResults]
      .filter((row) => row.correct < row.total)
      .sort((a, b) => a.correct - b.correct || a.skillId.localeCompare(b.skillId))
      .slice(0, 3)
      .map((row) => row.skillId);

  return { passed, percent, failedSkillIds };
}
