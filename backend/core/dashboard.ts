export type DiagnosticBand = "strong" | "developing" | "needs_support" | "not_assessed";

export interface DashboardSkillSignal {
  id: string;
  sequenceOrder: number;
  diagnosticBand: DiagnosticBand;
  complete: boolean;
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
  return (
    ordered.find((s) => s.diagnosticBand === "needs_support") ??
    ordered.find((s) => s.diagnosticBand === "developing") ??
    ordered.find((s) => !s.complete) ??
    null
  );
}
