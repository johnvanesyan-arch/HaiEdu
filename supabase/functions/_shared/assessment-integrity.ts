export const CHAPTER_I_POOLS = {
  practice: "PHY7-U01-PRACTICE-BASELINE",
  diagnostic: "PHY7-U01-DIAGNOSTIC-BASELINE",
  mastery_check: "PHY7-U01-MASTERY-PROTECTED-A",
} as const;

type Purpose = keyof typeof CHAPTER_I_POOLS;

type PoolRow = {
  id: string;
  code: string;
  purpose: Purpose;
  is_protected: boolean;
  status: string;
};

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
