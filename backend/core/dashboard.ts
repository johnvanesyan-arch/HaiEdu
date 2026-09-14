export type DiagnosticBand = "strong" | "developing" | "needs_support" | "not_assessed";

export interface DashboardSkillSignal {
  id: string;
  sequenceOrder: number;
  diagnosticBand: DiagnosticBand;
  complete: boolean;
  prerequisiteIds?: string[];
}

export function diagnosticBand(correct: number, total: number): DiagnosticBand {
  if (total <= 0) return "not_assessed";
  const ratio = correct / total;
  if (ratio >= 0.999) return "strong";
  if (ratio >= 0.5) return "developing";
  return "needs_support";
}

export function chooseRecommendedSkill(skills: DashboardSkillSignal[]): DashboardSkillSignal | null {
  const ordered = [...skills].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const byId = new Map(ordered.map((s) => [s.id, s]));
  const unfinished = ordered.filter((s) => !s.complete);
  const base = unfinished.find((s) => s.diagnosticBand === "needs_support")
    ?? unfinished.find((s) => s.diagnosticBand === "developing")
    ?? unfinished[0]
    ?? null;
  if (!base) return null;

  const resolvePrerequisite = (skill: DashboardSkillSignal, visited = new Set<string>()): DashboardSkillSignal => {
    if (visited.has(skill.id)) return skill;
    visited.add(skill.id);
    const prerequisites = (skill.prerequisiteIds ?? [])
      .map((id) => byId.get(id))
      .filter((value): value is DashboardSkillSignal => Boolean(value))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const unmet = prerequisites.find((p) => !p.complete && p.diagnosticBand !== "strong");
    return unmet ? resolvePrerequisite(unmet, visited) : skill;
  };

  return resolvePrerequisite(base);
}
