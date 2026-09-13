import type { MasteryAttemptEvidence, MasteryState } from "./types.ts";

const PRIOR_ALPHA = 2;
const PRIOR_BETA = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function initialMasteryState(): MasteryState {
  return deriveState(PRIOR_ALPHA, PRIOR_BETA, 0);
}

function deriveStatus(masteryScore: number, evidenceCount: number): MasteryState["status"] {
  if (evidenceCount < 3) return "insufficient_evidence";
  if (masteryScore < 0.45) return "needs_support";
  if (masteryScore < 0.72) return "developing";
  return "secure";
}

function deriveState(alpha: number, beta: number, evidenceCount: number): MasteryState {
  const masteryScore = alpha / (alpha + beta);
  return { alpha, beta, evidenceCount, masteryScore, status: deriveStatus(masteryScore, evidenceCount) };
}

export function updateMastery(previous: MasteryState | null, evidence: MasteryAttemptEvidence): MasteryState {
  const prev = previous ?? initialMasteryState();
  const score = clamp(evidence.score, 0, 1);
  const difficulty = clamp(evidence.difficulty, 1, 5);
  const difficultyWeight = 0.8 + difficulty * 0.1;
  const hintFactor = evidence.hintUsed && score > 0 ? 0.65 : 1;
  const weight = difficultyWeight * hintFactor;
  const alpha = prev.alpha + score * weight;
  const beta = prev.beta + (1 - score) * difficultyWeight;
  return deriveState(alpha, beta, prev.evidenceCount + 1);
}
