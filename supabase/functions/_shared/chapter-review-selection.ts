export const REVIEW_SELECTION_POLICY_VERSION = "review-answered-coverage-v2";

type ReviewItem = { item_id: string; skill_id: string };

/** Answered-once whole-pool coverage outranks per-session skill balancing and weak-skill weighting. */
export function selectReviewCoverageFirst<T extends ReviewItem>(args: {
  items: T[];
  skillIds: string[];
  answeredInCycle: Set<string>;
  targetCount: number;
  candidateOrder: (a: T, b: T) => number;
  priorityOrder: (a: T, b: T) => number;
  presentationOrder: (a: T, b: T) => number;
}) {
  const { items, skillIds, answeredInCycle, candidateOrder, priorityOrder, presentationOrder } = args;
  const target = Math.min(args.targetCount, items.length);
  const selected: Array<{ item: T; coverageSlot: boolean; repeated: boolean }> = [];
  const selectedIds = new Set<string>();
  const take = (item: T, coverageSlot: boolean) => {
    if (selected.length >= target || selectedIds.has(item.item_id)) return;
    selected.push({ item, coverageSlot, repeated: answeredInCycle.has(item.item_id) });
    selectedIds.add(item.item_id);
  };

  const unanswered = items.filter((item) => !answeredInCycle.has(item.item_id));
  // Represent each skill that still has unanswered questions; never force an early repeat.
  for (const skillId of skillIds) {
    const item = unanswered.filter((candidate) => candidate.skill_id === skillId).sort(candidateOrder)[0];
    if (item) take(item, true);
  }
  for (const item of [...unanswered].sort(priorityOrder)) take(item, false);

  // If the cycle ends inside a fixed-length session, finish the unanswered questions first.
  // Only then use least-recent repeats to preserve the existing review-length/retry gate.
  if (selected.length < target && unanswered.every((item) => selectedIds.has(item.item_id))) {
    for (const item of items.filter((candidate) => answeredInCycle.has(candidate.item_id)).sort(candidateOrder)) {
      take(item, false);
    }
  }

  // Deterministic presentation may mix skills, but cannot move a repeat before unanswered work.
  return selected.sort((a, b) => Number(a.repeated) - Number(b.repeated) || presentationOrder(a.item, b.item));
}
