export const REVIEW_SELECTION_POLICY_VERSION = "review-coverage-first-v1";

type ReviewItem = { item_id: string; skill_id: string };

/** Whole-pool coverage outranks per-session skill balancing and weak-skill weighting. */
export function selectReviewCoverageFirst<T extends ReviewItem>(args: {
  items: T[];
  skillIds: string[];
  seenInCycle: Set<string>;
  targetCount: number;
  candidateOrder: (a: T, b: T) => number;
  priorityOrder: (a: T, b: T) => number;
  presentationOrder: (a: T, b: T) => number;
}) {
  const { items, skillIds, seenInCycle, candidateOrder, priorityOrder, presentationOrder } = args;
  const target = Math.min(args.targetCount, items.length);
  const selected: Array<{ item: T; coverageSlot: boolean; repeated: boolean }> = [];
  const selectedIds = new Set<string>();
  const take = (item: T, coverageSlot: boolean) => {
    if (selected.length >= target || selectedIds.has(item.item_id)) return;
    selected.push({ item, coverageSlot, repeated: seenInCycle.has(item.item_id) });
    selectedIds.add(item.item_id);
  };

  const unseen = items.filter((item) => !seenInCycle.has(item.item_id));
  // Represent each skill that still has unseen questions; never force an early repeat.
  for (const skillId of skillIds) {
    const item = unseen.filter((candidate) => candidate.skill_id === skillId).sort(candidateOrder)[0];
    if (item) take(item, true);
  }
  for (const item of [...unseen].sort(priorityOrder)) take(item, false);

  // If the cycle ends inside a fixed-length session, finish the unseen questions first.
  // Only then use least-recent repeats to preserve the existing review-length/retry gate.
  if (selected.length < target && unseen.every((item) => selectedIds.has(item.item_id))) {
    for (const item of items.filter((candidate) => seenInCycle.has(candidate.item_id)).sort(candidateOrder)) {
      take(item, false);
    }
  }

  // Deterministic presentation may mix skills, but cannot move a repeat before unseen work.
  return selected.sort((a, b) => Number(a.repeated) - Number(b.repeated) || presentationOrder(a.item, b.item));
}
