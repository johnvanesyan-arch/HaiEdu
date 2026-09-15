import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { getEligiblePoolItemIds } from "../_shared/assessment-integrity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTERY_THRESHOLD = 0.72;
const RECENT_WINDOW = 5;
const RECENT_CORRECT_REQUIRED = 4;
const MIN_UNIQUE_ITEMS_FOR_RECOVERY = 4;
const RECENT_ITEM_BLOCK = 4;

type AttemptRow = {
  skill_id: string;
  item_id: string;
  correct: boolean;
  created_at: string;
};

type SkillRow = {
  id: string;
  code: string;
  name_hy: string;
  layer: string;
  sequence_order: number;
};

type MasteryRow = {
  skill_id: string;
  mastery_score: number | string;
  evidence_count: number;
  status: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function desiredDifficulty(mastery: number): number {
  if (mastery < 0.35) return 1;
  if (mastery < 0.55) return 2;
  if (mastery < MASTERY_THRESHOLD) return 3;
  return 4;
}

function statsForSkill(attempts: AttemptRow[], skillId: string) {
  const skillAttempts = attempts.filter((a) => a.skill_id === skillId);
  const uniqueItemIds = new Set(skillAttempts.map((a) => a.item_id));
  const recent = skillAttempts.slice(0, RECENT_WINDOW);
  const recentCorrect = recent.filter((a) => a.correct).length;

  return {
    attempts: skillAttempts,
    uniqueItemIds,
    recent,
    recentCorrect,
  };
}

function isSkillComplete(
  masteryScore: number,
  evidenceCount: number,
  attempts: AttemptRow[],
  skillId: string,
): { complete: boolean; reason: "model_mastery" | "recent_recovery" | "incomplete" } {
  if (evidenceCount >= 3 && masteryScore >= MASTERY_THRESHOLD) {
    return { complete: true, reason: "model_mastery" };
  }

  const stats = statsForSkill(attempts, skillId);
  const recovered =
    stats.uniqueItemIds.size >= MIN_UNIQUE_ITEMS_FOR_RECOVERY &&
    stats.recent.length >= RECENT_WINDOW &&
    stats.recentCorrect >= RECENT_CORRECT_REQUIRED;

  if (recovered) return { complete: true, reason: "recent_recovery" };
  return { complete: false, reason: "incomplete" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
  const studentId = userData.user.id;

  let payload: { skillCode?: string } = {};
  try {
    payload = await req.json();
  } catch {
    // Empty body is valid: use scheduler.
  }

  const { data: skillsData, error: skillsError } = await admin
    .from("skills")
    .select("id, code, name_hy, layer, sequence_order")
    .like("code", "PHY7-U01-S%")
    .order("sequence_order", { ascending: true });
  const skills = (skillsData ?? []) as SkillRow[];
  if (skillsError || !skills.length) return json({ error: "skills_not_found" }, 404);

  const skillIds = skills.map((s) => s.id);

  const { data: masteryRowsData, error: masteryError } = await admin
    .from("student_skill_mastery")
    .select("skill_id, mastery_score, evidence_count, status")
    .eq("student_id", studentId)
    .in("skill_id", skillIds);
  if (masteryError) return json({ error: "mastery_query_failed" }, 500);
  const masteryRows = (masteryRowsData ?? []) as MasteryRow[];
  const mastery = new Map(
    masteryRows.map((r) => [r.skill_id, {
      score: Number(r.mastery_score),
      evidenceCount: Number(r.evidence_count),
      status: r.status,
    }]),
  );

  const { data: attemptsData, error: attemptsError } = await admin
    .from("attempts")
    .select("skill_id, item_id, correct, created_at")
    .eq("student_id", studentId)
    .in("skill_id", skillIds)
    .order("created_at", { ascending: false })
    .limit(500);
  if (attemptsError) {
    console.error("attempt history query failed", attemptsError);
    return json({ error: "attempt_history_query_failed" }, 500);
  }
  const allAttempts = (attemptsData ?? []) as AttemptRow[];

  const completionBySkill = new Map<string, ReturnType<typeof isSkillComplete>>();
  for (const skill of skills) {
    const current = mastery.get(skill.id) ?? { score: 0, evidenceCount: 0, status: "insufficient_evidence" };
    completionBySkill.set(skill.id, isSkillComplete(current.score, current.evidenceCount, allAttempts, skill.id));
  }

  let target = payload.skillCode ? skills.find((s) => s.code === payload.skillCode) : null;
  if (payload.skillCode && !target) return json({ error: "skill_not_found" }, 404);

  if (!target) {
    for (const skill of skills) {
      if (completionBySkill.get(skill.id)?.complete) continue;

      const { data: prereqs, error: prereqError } = await admin
        .from("skill_prerequisites")
        .select("prerequisite_skill_id, required_mastery")
        .eq("skill_id", skill.id);
      if (prereqError) return json({ error: "prerequisite_query_failed" }, 500);

      const unmet = (prereqs ?? []).find((p) => {
        const prereqMastery = mastery.get(p.prerequisite_skill_id)?.score ?? 0;
        const prereqComplete = completionBySkill.get(p.prerequisite_skill_id)?.complete ?? false;
        return !prereqComplete && prereqMastery < Number(p.required_mastery);
      });

      target = unmet
        ? (skills.find((s) => s.id === unmet.prerequisite_skill_id) ?? skill)
        : skill;
      break;
    }

    if (!target) {
      const summary = skills.map((skill) => {
        const current = mastery.get(skill.id) ?? { score: 0, evidenceCount: 0, status: "insufficient_evidence" };
        const stats = statsForSkill(allAttempts, skill.id);
        const completion = completionBySkill.get(skill.id)!;
        return {
          skillCode: skill.code,
          masteryScore: current.score,
          evidenceCount: current.evidenceCount,
          uniqueItemsSeen: stats.uniqueItemIds.size,
          completionReason: completion.reason,
        };
      });

      return json({
        complete: true,
        unitCode: "PHY7-U01",
        messageHy: "Բաժինն ավարտված է։ Դուք բավարար ապացույց եք հավաքել բոլոր հմտությունների համար։",
        summary,
      });
    }
  }

  const targetMastery = mastery.get(target.id) ?? {
    score: 0,
    evidenceCount: 0,
    status: "insufficient_evidence",
  };
  const targetStats = statsForSkill(allAttempts, target.id);
  const recentIds = new Set(targetStats.attempts.slice(0, RECENT_ITEM_BLOCK).map((r) => r.item_id));

  let eligibleIds: string[];
  try {
    eligibleIds = await getEligiblePoolItemIds(admin, "practice");
  } catch (err) {
    console.error("practice pool unavailable", err);
    return json({ error: "practice_pool_unavailable" }, 500);
  }
  if (!eligibleIds.length) return json({ error: "practice_pool_empty" }, 409);

  const { data: candidateItems, error: itemError } = await admin
    .from("items")
    .select("id, code, item_type, prompt_hy, stimulus, difficulty")
    .in("id", eligibleIds)
    .eq("skill_id", target.id)
    .eq("status", "published");
  if (itemError || !candidateItems?.length) return json({ error: "no_item_for_skill", skillCode: target.code }, 404);

  const attemptCounts = new Map<string, number>();
  const latestAttemptByItem = new Map<string, AttemptRow>();
  for (const attempt of targetStats.attempts) {
    attemptCounts.set(attempt.item_id, (attemptCounts.get(attempt.item_id) ?? 0) + 1);
    if (!latestAttemptByItem.has(attempt.item_id)) latestAttemptByItem.set(attempt.item_id, attempt);
  }

  const unseen = candidateItems.filter((item) => !latestAttemptByItem.has(item.id));
  const unresolved = candidateItems.filter((item) => latestAttemptByItem.get(item.id)?.correct === false);
  const goalDifficulty = desiredDifficulty(targetMastery.score);

  let pool = unseen;
  let selectionMode: "new_item" | "remediation" | "review" = "new_item";
  if (!pool.length) {
    const nonRecentUnresolved = unresolved.filter((item) => !recentIds.has(item.id));
    pool = nonRecentUnresolved.length ? nonRecentUnresolved : unresolved;
    selectionMode = "remediation";
  }
  if (!pool.length) {
    const nonRecent = candidateItems.filter((item) => !recentIds.has(item.id));
    pool = nonRecent.length ? nonRecent : candidateItems;
    selectionMode = "review";
  }

  const sorted = [...pool].sort((a, b) => {
    const aCount = attemptCounts.get(a.id) ?? 0;
    const bCount = attemptCounts.get(b.id) ?? 0;
    if (aCount !== bCount) return aCount - bCount;

    const aDistance = Math.abs(Number(a.difficulty) - goalDifficulty);
    const bDistance = Math.abs(Number(b.difficulty) - goalDifficulty);
    if (aDistance !== bDistance) return aDistance - bDistance;

    const aLast = latestAttemptByItem.get(a.id)?.created_at ?? "";
    const bLast = latestAttemptByItem.get(b.id)?.created_at ?? "";
    if (aLast !== bLast) return aLast.localeCompare(bLast);

    return String(a.code).localeCompare(String(b.code));
  });
  const item = sorted[0];

  const { data: options } = await admin
    .from("item_options")
    .select("option_key, content_hy, display_order")
    .eq("item_id", item.id)
    .order("display_order", { ascending: true });

  const completion = completionBySkill.get(target.id)!;

  return json({
    complete: false,
    skill: {
      id: target.id,
      code: target.code,
      nameHy: target.name_hy,
      layer: target.layer,
    },
    progress: {
      ...targetMastery,
      uniqueItemsSeen: targetStats.uniqueItemIds.size,
      recentCorrect: targetStats.recentCorrect,
      recentWindow: targetStats.recent.length,
      completionReason: completion.reason,
    },
    scheduler: {
      desiredDifficulty: goalDifficulty,
      selectionMode,
      recentItemsAvoided: recentIds.size,
      selectedItemPriorAttempts: attemptCounts.get(item.id) ?? 0,
      unseenItemsRemaining: unseen.length,
      unresolvedItems: unresolved.length,
      assessmentPool: "practice",
    },
    item: {
      id: item.id,
      code: item.code,
      type: item.item_type,
      promptHy: item.prompt_hy,
      stimulus: item.stimulus,
      difficulty: item.difficulty,
      options: options ?? [],
    },
  });
});