export const CHAPTER_I_POOLS = {
  practice: "PHY7-U01-PRACTICE-BASELINE",
  diagnostic: "PHY7-U01-DIAGNOSTIC-BASELINE",
  mastery_check: "PHY7-U01-MASTERY-PROTECTED-A",
} as const;

export const PRACTICE_VARIANT_COOLDOWN = 3;

type Purpose = keyof typeof CHAPTER_I_POOLS;

type PoolRow = {
  id: string;
  code: string;
  purpose: Purpose;
  is_protected: boolean;
  status: string;
};

export type ExposureHistoryRow = {
  item_id: string;
  item_template_id: string;
  variant_key: string;
  purpose: Purpose;
  session_id: string | null;
  served_at: string;
  answered_at: string | null;
  correct: boolean | null;
  help_used: boolean;
  hint_level_used: number;
};

export type SelectableItem = {
  id: string;
  code: string;
  difficulty: number;
  item_template_id: string;
  variant_key: string;
};

export type DiagnosticFormRow = {
  id: string;
  code: string;
  form_version: number;
};

function variantIdentity(row: { item_template_id: string; variant_key: string }): string {
  return `${row.item_template_id}::${row.variant_key}`;
}

function timeValue(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function exposureStats(exposuresNewestFirst: ExposureHistoryRow[]) {
  const byVariant = new Map<string, {
    count: number;
    lastSeenAt: string | null;
    latestAnsweredCorrect: boolean | null;
  }>();

  const sorted = [...exposuresNewestFirst].sort((a, b) => timeValue(b.served_at) - timeValue(a.served_at));
  for (const event of sorted) {
    const key = variantIdentity(event);
    const current = byVariant.get(key) ?? {
      count: 0,
      lastSeenAt: null,
      latestAnsweredCorrect: null,
    };
    current.count += 1;
    if (!current.lastSeenAt) current.lastSeenAt = event.served_at;
    if (current.latestAnsweredCorrect === null && event.answered_at && event.correct !== null) {
      current.latestAnsweredCorrect = event.correct;
    }
    byVariant.set(key, current);
  }

  const recentVariantIds: string[] = [];
  const recentSet = new Set<string>();
  for (const event of sorted) {
    const key = variantIdentity(event);
    if (recentSet.has(key)) continue;
    recentSet.add(key);
    recentVariantIds.push(key);
  }

  return { byVariant, recentVariantIds };
}

function sortByDifficultyThenCode(items: SelectableItem[], desiredDifficulty: number) {
  return [...items].sort((a, b) => {
    const distance = Math.abs(Number(a.difficulty) - desiredDifficulty) - Math.abs(Number(b.difficulty) - desiredDifficulty);
    if (distance !== 0) return distance;
    return String(a.code).localeCompare(String(b.code));
  });
}

function sortLeastRecent(
  items: SelectableItem[],
  stats: ReturnType<typeof exposureStats>["byVariant"],
  desiredDifficulty: number,
  currentSessionItemIds: Set<string> = new Set(),
) {
  return [...items].sort((a, b) => {
    const aCurrent = currentSessionItemIds.has(a.id) ? 1 : 0;
    const bCurrent = currentSessionItemIds.has(b.id) ? 1 : 0;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;

    const aStat = stats.get(variantIdentity(a));
    const bStat = stats.get(variantIdentity(b));
    const aLast = timeValue(aStat?.lastSeenAt);
    const bLast = timeValue(bStat?.lastSeenAt);
    if (aLast !== bLast) return aLast - bLast;

    const aCount = aStat?.count ?? 0;
    const bCount = bStat?.count ?? 0;
    if (aCount !== bCount) return aCount - bCount;

    const distance = Math.abs(Number(a.difficulty) - desiredDifficulty) - Math.abs(Number(b.difficulty) - desiredDifficulty);
    if (distance !== 0) return distance;
    return String(a.code).localeCompare(String(b.code));
  });
}

export async function getEligiblePoolItemIds(admin: any, purpose: Purpose): Promise<string[]> {
  const code = CHAPTER_I_POOLS[purpose];
  const { data: pool, error: poolError } = await admin
    .from("assessment_pools")
    .select("id, code, purpose, is_protected, status")
    .eq("code", code)
    .eq("status", "active")
    .single();

  if (poolError || !pool) {
    throw new Error(`assessment_pool_unavailable:${purpose}:${poolError?.message ?? "missing"}`);
  }

  const typedPool = pool as PoolRow;
  if (typedPool.purpose !== purpose) {
    throw new Error(`assessment_pool_purpose_mismatch:${typedPool.code}`);
  }
  if (purpose === "practice" && typedPool.is_protected) {
    throw new Error(`practice_pool_must_not_be_protected:${typedPool.code}`);
  }
  if (purpose === "mastery_check" && !typedPool.is_protected) {
    throw new Error(`mastery_pool_must_be_protected:${typedPool.code}`);
  }

  const { data: memberships, error: membershipError } = await admin
    .from("assessment_pool_items")
    .select("item_id")
    .eq("pool_id", typedPool.id)
    .eq("enabled", true);

  if (membershipError) {
    throw new Error(`assessment_pool_items_unavailable:${typedPool.code}:${membershipError.message}`);
  }

  return [...new Set((memberships ?? []).map((row: any) => String(row.item_id)))];
}

export async function getStudentExposureHistory(
  admin: any,
  studentId: string,
  itemIds: string[],
): Promise<ExposureHistoryRow[]> {
  if (!itemIds.length) return [];
  const { data, error } = await admin
    .from("student_item_exposure_events")
    .select("item_id, item_template_id, variant_key, purpose, session_id, served_at, answered_at, correct, help_used, hint_level_used")
    .eq("student_id", studentId)
    .in("item_id", itemIds)
    .order("served_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`exposure_history_unavailable:${error.message}`);
  return (data ?? []) as ExposureHistoryRow[];
}

export function choosePracticeByExposure(args: {
  candidates: SelectableItem[];
  exposures: ExposureHistoryRow[];
  currentSessionItemIds: Set<string>;
  desiredDifficulty: number;
}) {
  const { candidates, exposures, currentSessionItemIds, desiredDifficulty } = args;
  if (!candidates.length) return null;

  const { byVariant, recentVariantIds } = exposureStats(exposures);
  const cooldown = new Set(recentVariantIds.slice(0, PRACTICE_VARIANT_COOLDOWN));
  const notCurrent = (item: SelectableItem) => !currentSessionItemIds.has(item.id);
  const statFor = (item: SelectableItem) => byVariant.get(variantIdentity(item));

  const unseen = candidates.filter((item) => !statFor(item) && notCurrent(item));
  if (unseen.length) {
    const selected = sortByDifficultyThenCode(unseen, desiredDifficulty)[0];
    return {
      selected,
      reason: "unseen_variant" as const,
      poolExhausted: false,
      cooldownVariantCount: cooldown.size,
      priorExposureCount: 0,
      unseenRemaining: unseen.length,
    };
  }

  const unresolved = candidates.filter((item) => {
    const stat = statFor(item);
    return stat?.latestAnsweredCorrect === false && !cooldown.has(variantIdentity(item)) && notCurrent(item);
  });
  if (unresolved.length) {
    const selected = sortLeastRecent(unresolved, byVariant, desiredDifficulty, currentSessionItemIds)[0];
    return {
      selected,
      reason: "unresolved_error_after_spacing" as const,
      poolExhausted: false,
      cooldownVariantCount: cooldown.size,
      priorExposureCount: statFor(selected)?.count ?? 0,
      unseenRemaining: 0,
    };
  }

  const review = candidates.filter((item) => {
    const stat = statFor(item);
    return Boolean(stat) && !cooldown.has(variantIdentity(item)) && notCurrent(item);
  });
  if (review.length) {
    const selected = sortLeastRecent(review, byVariant, desiredDifficulty, currentSessionItemIds)[0];
    return {
      selected,
      reason: "least_recent_review" as const,
      poolExhausted: false,
      cooldownVariantCount: cooldown.size,
      priorExposureCount: statFor(selected)?.count ?? 0,
      unseenRemaining: 0,
    };
  }

  // All concrete variants are either in cooldown or already used in this session.
  // Exact repetition is now an explicit, auditable fallback rather than normal flow.
  const selected = sortLeastRecent(candidates, byVariant, desiredDifficulty, currentSessionItemIds)[0];
  return {
    selected,
    reason: "pool_exhausted_exact_repeat" as const,
    poolExhausted: true,
    cooldownVariantCount: cooldown.size,
    priorExposureCount: statFor(selected)?.count ?? 0,
    unseenRemaining: 0,
  };
}

export function chooseMasteryByExposure(args: {
  candidates: SelectableItem[];
  exposures: ExposureHistoryRow[];
  previousItemIds: Set<string>;
  count: number;
}) {
  const { candidates, exposures, previousItemIds, count } = args;
  const { byVariant } = exposureStats(exposures);
  const selected: Array<{ item: SelectableItem; reason: string }> = [];
  const used = new Set<string>();

  const take = (pool: SelectableItem[], reason: string) => {
    for (const item of pool) {
      if (selected.length >= count) break;
      if (used.has(item.id)) continue;
      selected.push({ item, reason });
      used.add(item.id);
    }
  };

  const unseenAlternate = sortByDifficultyThenCode(
    candidates.filter((item) => !byVariant.has(variantIdentity(item)) && !previousItemIds.has(item.id)),
    3,
  );
  take(unseenAlternate, "mastery_unseen_protected_variant");

  if (selected.length < count) {
    const seenAlternate = sortLeastRecent(
      candidates.filter((item) => byVariant.has(variantIdentity(item)) && !previousItemIds.has(item.id)),
      byVariant,
      3,
    );
    take(seenAlternate, "mastery_least_exposed_alternate");
  }

  if (selected.length < count) {
    const overlapFallback = sortLeastRecent(
      candidates.filter((item) => previousItemIds.has(item.id)),
      byVariant,
      3,
    );
    take(overlapFallback, "mastery_overlap_fallback_pool_exhausted");
  }

  const overlapCount = selected.filter(({ item }) => previousItemIds.has(item.id)).length;
  return {
    selected,
    poolExhausted: selected.length < count || overlapCount > 0,
    overlapCount,
  };
}

export function chooseRotatingDiagnosticForm(
  forms: DiagnosticFormRow[],
  priorFormCodesNewestFirst: string[],
): { form: DiagnosticFormRow; reason: "alternate_previous_form" | "least_used_form" } | null {
  if (!forms.length) return null;
  const counts = new Map<string, number>();
  for (const code of priorFormCodesNewestFirst) counts.set(code, (counts.get(code) ?? 0) + 1);
  const latest = priorFormCodesNewestFirst[0] ?? null;
  const alternates = latest && forms.length > 1 ? forms.filter((form) => form.code !== latest) : forms;
  const pool = alternates.length ? alternates : forms;
  const ordered = [...pool].sort((a, b) => {
    const countDiff = (counts.get(a.code) ?? 0) - (counts.get(b.code) ?? 0);
    return countDiff || a.code.localeCompare(b.code);
  });
  return {
    form: ordered[0],
    reason: latest && ordered[0].code !== latest ? "alternate_previous_form" : "least_used_form",
  };
}

export async function recordSessionItemExposure(
  admin: any,
  studentId: string,
  sessionId: string,
  sessionItemId: string,
  itemId: string,
): Promise<string> {
  const { data, error } = await admin.rpc("service_record_item_exposure", {
    p_student_id: studentId,
    p_session_id: sessionId,
    p_session_item_id: sessionItemId,
    p_item_id: itemId,
    p_served_at: new Date().toISOString(),
  });

  if (error || !data) {
    throw new Error(`item_exposure_record_failed:${error?.message ?? "missing_event"}`);
  }
  return String(data);
}
