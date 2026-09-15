export interface SelectionCandidate {
  id: string;
  variantId: string;
  difficulty: number;
}

export interface ExposureSignal {
  itemId: string;
  variantId: string;
  servedAt: string;
  correct: boolean | null;
  answered: boolean;
}

export interface PracticePolicyResult {
  selectedId: string;
  reason: "unseen_variant" | "unresolved_error_after_spacing" | "least_recent_review" | "pool_exhausted_exact_repeat";
  poolExhausted: boolean;
}

function time(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function stats(exposures: ExposureSignal[]) {
  const ordered = [...exposures].sort((a, b) => time(b.servedAt) - time(a.servedAt));
  const byVariant = new Map<string, { count: number; lastSeen: number; latestCorrect: boolean | null }>();
  for (const event of ordered) {
    const current = byVariant.get(event.variantId) ?? { count: 0, lastSeen: 0, latestCorrect: null };
    current.count += 1;
    if (!current.lastSeen) current.lastSeen = time(event.servedAt);
    if (current.latestCorrect === null && event.answered && event.correct !== null) current.latestCorrect = event.correct;
    byVariant.set(event.variantId, current);
  }
  const recent: string[] = [];
  const seen = new Set<string>();
  for (const event of ordered) {
    if (seen.has(event.variantId)) continue;
    seen.add(event.variantId);
    recent.push(event.variantId);
  }
  return { byVariant, recent };
}

function difficultySort(items: SelectionCandidate[], desired: number) {
  return [...items].sort((a, b) => Math.abs(a.difficulty - desired) - Math.abs(b.difficulty - desired) || a.id.localeCompare(b.id));
}

function leastRecentSort(items: SelectionCandidate[], byVariant: ReturnType<typeof stats>["byVariant"], currentIds: Set<string>, desired: number) {
  return [...items].sort((a, b) => {
    const currentDiff = Number(currentIds.has(a.id)) - Number(currentIds.has(b.id));
    if (currentDiff) return currentDiff;
    const as = byVariant.get(a.variantId);
    const bs = byVariant.get(b.variantId);
    const lastDiff = (as?.lastSeen ?? 0) - (bs?.lastSeen ?? 0);
    if (lastDiff) return lastDiff;
    const countDiff = (as?.count ?? 0) - (bs?.count ?? 0);
    if (countDiff) return countDiff;
    return Math.abs(a.difficulty - desired) - Math.abs(b.difficulty - desired) || a.id.localeCompare(b.id);
  });
}

export function choosePracticeVariant(
  candidates: SelectionCandidate[],
  exposures: ExposureSignal[],
  currentSessionItemIds: Set<string>,
  desiredDifficulty: number,
  cooldownSize = 3,
): PracticePolicyResult | null {
  if (!candidates.length) return null;
  const { byVariant, recent } = stats(exposures);
  const cooldown = new Set(recent.slice(0, cooldownSize));

  const unseen = candidates.filter((item) => !byVariant.has(item.variantId) && !currentSessionItemIds.has(item.id));
  if (unseen.length) {
    return { selectedId: difficultySort(unseen, desiredDifficulty)[0].id, reason: "unseen_variant", poolExhausted: false };
  }

  const unresolved = candidates.filter((item) => {
    const itemStats = byVariant.get(item.variantId);
    return itemStats?.latestCorrect === false && !cooldown.has(item.variantId) && !currentSessionItemIds.has(item.id);
  });
  if (unresolved.length) {
    return {
      selectedId: leastRecentSort(unresolved, byVariant, currentSessionItemIds, desiredDifficulty)[0].id,
      reason: "unresolved_error_after_spacing",
      poolExhausted: false,
    };
  }

  const review = candidates.filter((item) => byVariant.has(item.variantId) && !cooldown.has(item.variantId) && !currentSessionItemIds.has(item.id));
  if (review.length) {
    return {
      selectedId: leastRecentSort(review, byVariant, currentSessionItemIds, desiredDifficulty)[0].id,
      reason: "least_recent_review",
      poolExhausted: false,
    };
  }

  return {
    selectedId: leastRecentSort(candidates, byVariant, currentSessionItemIds, desiredDifficulty)[0].id,
    reason: "pool_exhausted_exact_repeat",
    poolExhausted: true,
  };
}

export function chooseMasteryVariants(
  candidates: SelectionCandidate[],
  exposures: ExposureSignal[],
  previousItemIds: Set<string>,
  count: number,
) {
  const { byVariant } = stats(exposures);
  const selected: Array<{ id: string; reason: string }> = [];
  const used = new Set<string>();
  const take = (pool: SelectionCandidate[], reason: string) => {
    for (const item of pool) {
      if (selected.length >= count) break;
      if (used.has(item.id)) continue;
      selected.push({ id: item.id, reason });
      used.add(item.id);
    }
  };

  take(difficultySort(candidates.filter((item) => !byVariant.has(item.variantId) && !previousItemIds.has(item.id)), 3), "mastery_unseen_protected_variant");
  if (selected.length < count) {
    take(leastRecentSort(candidates.filter((item) => byVariant.has(item.variantId) && !previousItemIds.has(item.id)), byVariant, new Set(), 3), "mastery_least_exposed_alternate");
  }
  if (selected.length < count) {
    take(leastRecentSort(candidates.filter((item) => previousItemIds.has(item.id)), byVariant, new Set(), 3), "mastery_overlap_fallback_pool_exhausted");
  }

  const overlapCount = selected.filter((item) => previousItemIds.has(item.id)).length;
  return { selected, overlapCount, poolExhausted: overlapCount > 0 || selected.length < count };
}

export function chooseDiagnosticForm(forms: string[], priorFormsNewestFirst: string[]): string | null {
  if (!forms.length) return null;
  const counts = new Map<string, number>();
  for (const form of priorFormsNewestFirst) counts.set(form, (counts.get(form) ?? 0) + 1);
  const latest = priorFormsNewestFirst[0] ?? null;
  const alternatives = latest && forms.length > 1 ? forms.filter((form) => form !== latest) : forms;
  return [...(alternatives.length ? alternatives : forms)].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || a.localeCompare(b))[0];
}
