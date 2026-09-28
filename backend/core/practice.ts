export interface PracticeCandidate {
  id: string;
  difficulty: number;
}

export interface PracticeAttemptSignal {
  itemId: string;
  correct: boolean;
}

export interface PracticeSelection {
  selectedId: string;
  selectionMode: "new_item" | "remediation" | "bridge" | "spaced_review";
  desiredDifficulty: number;
  consecutiveWrong: number;
}

export function desiredPracticeDifficulty(mastery: number): number {
  if (mastery < 0.35) return 1;
  if (mastery < 0.55) return 2;
  if (mastery < 0.72) return 3;
  return 4;
}

export function countConsecutiveWrong(attemptsNewestFirst: PracticeAttemptSignal[]): number {
  let count = 0;
  for (const attempt of attemptsNewestFirst) {
    if (attempt.correct) break;
    count += 1;
  }
  return count;
}

export function choosePracticeItem(
  candidates: PracticeCandidate[],
  attemptsNewestFirst: PracticeAttemptSignal[],
  mastery: number,
): PracticeSelection | null {
  if (!candidates.length) return null;

  const counts = new Map<string, number>();
  const latest = new Map<string, PracticeAttemptSignal>();
  for (const attempt of attemptsNewestFirst) {
    counts.set(attempt.itemId, (counts.get(attempt.itemId) ?? 0) + 1);
    if (!latest.has(attempt.itemId)) latest.set(attempt.itemId, attempt);
  }

  const consecutiveWrong = countConsecutiveWrong(attemptsNewestFirst);
  const baseDifficulty = desiredPracticeDifficulty(mastery);
  const desiredDifficulty = consecutiveWrong >= 2
    ? Math.max(1, baseDifficulty - 2)
    : consecutiveWrong === 1
      ? Math.max(1, baseDifficulty - 1)
      : baseDifficulty;

  const recentIds = new Set(attemptsNewestFirst.slice(0, 2).map((a) => a.itemId));
  const lastId = attemptsNewestFirst[0]?.itemId ?? null;
  const unseen = candidates.filter((item) => !latest.has(item.id));
  const unresolved = candidates.filter((item) => latest.get(item.id)?.correct === false);

  let pool: PracticeCandidate[];
  let selectionMode: PracticeSelection["selectionMode"];

  if (unseen.length) {
    pool = unseen;
    selectionMode = consecutiveWrong >= 2 ? "bridge" : "new_item";
  } else {
    const spacedUnresolved = unresolved.filter((item) => !recentIds.has(item.id));
    if (spacedUnresolved.length) {
      pool = spacedUnresolved;
      selectionMode = consecutiveWrong >= 2 ? "bridge" : "remediation";
    } else {
      const nonRecent = candidates.filter((item) => !recentIds.has(item.id));
      pool = nonRecent.length ? nonRecent : candidates.filter((item) => item.id !== lastId);
      if (!pool.length) pool = candidates;
      selectionMode = "spaced_review";
    }
  }

  const underRepeatCap = pool.filter((item) => (counts.get(item.id) ?? 0) < 2);
  if (underRepeatCap.length) pool = underRepeatCap;

  pool.sort((a, b) => {
    const aCount = counts.get(a.id) ?? 0;
    const bCount = counts.get(b.id) ?? 0;
    if (aCount !== bCount) return aCount - bCount;
    const aDistance = Math.abs(a.difficulty - desiredDifficulty);
    const bDistance = Math.abs(b.difficulty - desiredDifficulty);
    if (aDistance !== bDistance) return aDistance - bDistance;
    return a.id.localeCompare(b.id);
  });

  return {
    selectedId: pool[0].id,
    selectionMode,
    desiredDifficulty,
    consecutiveWrong,
  };
}
