import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import {
  CHAPTER_I_POOLS,
  chooseMasteryByExposure,
  chooseRotatingDiagnosticForm,
  getEligiblePoolItemIds,
  getStudentExposureHistory,
  type SelectableItem,
} from "../_shared/assessment-integrity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIT_CODE = "PHY7-U01";
const DIAGNOSTIC_ITEMS_PER_SKILL = 2;
const MASTERY_ITEMS_PER_SKILL = 2;
const PRACTICE_SESSION_LENGTH = 8;
const MASTERY_THRESHOLD = 0.72;
const MASTERY_PASS_PERCENT = 80;
const MASTERY_MIN_CORRECT_PER_SKILL = 1;

type Mode = "diagnostic" | "practice" | "mastery_check";
type AttemptRow = { skill_id: string; item_id: string; correct: boolean; hint_used: boolean; created_at: string };

type PoolItem = SelectableItem & { skill_id: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isComplete(
  mastery: { score: number; evidenceCount: number } | undefined,
  attempts: AttemptRow[],
  skillId: string,
) {
  if (mastery && mastery.evidenceCount >= 3 && mastery.score >= MASTERY_THRESHOLD) return true;
  const rows = attempts.filter((a) => a.skill_id === skillId);
  const unique = new Set(rows.map((a) => a.item_id)).size;
  const recent = rows.slice(0, 5);
  const independentCorrect = recent.filter((a) => a.correct && !a.hint_used).length;
  return unique >= 4 && recent.length >= 5 && independentCorrect >= 4;
}

function shuffle<T>(values: T[]): T[] {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
  const studentId = userData.user.id;

  let body: { mode?: Mode; targetSkillId?: string | null } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (!body.mode || !["diagnostic", "practice", "mastery_check"].includes(body.mode)) {
    return json({ error: "invalid_mode" }, 400);
  }

  const { data: activeSessions } = await admin
    .from("learning_sessions")
    .select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count")
    .eq("student_id", studentId)
    .eq("unit_code", UNIT_CODE)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const active = activeSessions?.[0];
  if (active?.mode === body.mode) return json({ session: active, resumed: true });
  if (active) {
    return json({
      error: "active_session_conflict",
      requestedMode: body.mode,
      activeSession: active,
      messageHy: "Սկզբում շարունակեք կամ ավարտեք արդեն ընթացիկ ուսուցման գործողությունը։",
    }, 409);
  }

  const { data: skills, error: skillsError } = await admin
    .from("skills")
    .select("id, code, name_hy, sequence_order")
    .like("code", "PHY7-U01-S%")
    .order("sequence_order", { ascending: true });
  if (skillsError || !skills?.length) return json({ error: "skills_not_found" }, 404);
  const skillIds = skills.map((s) => s.id);

  const { data: masteryRows } = await admin
    .from("student_skill_mastery")
    .select("skill_id, mastery_score, evidence_count")
    .eq("student_id", studentId)
    .in("skill_id", skillIds);
  const mastery = new Map((masteryRows ?? []).map((r) => [r.skill_id, {
    score: Number(r.mastery_score), evidenceCount: Number(r.evidence_count),
  }]));

  const { data: attemptRows } = await admin
    .from("attempts")
    .select("skill_id, item_id, correct, hint_used, created_at")
    .eq("student_id", studentId)
    .in("skill_id", skillIds)
    .order("created_at", { ascending: false })
    .limit(1000);
  const attempts = (attemptRows ?? []) as AttemptRow[];

  if (body.mode === "diagnostic") {
    let eligibleIds: string[];
    try {
      eligibleIds = await getEligiblePoolItemIds(admin, "diagnostic");
    } catch (err) {
      console.error("diagnostic pool unavailable", err);
      return json({ error: "diagnostic_pool_unavailable" }, 500);
    }
    if (!eligibleIds.length) return json({ error: "diagnostic_pool_empty" }, 409);

    const { data: diagnosticPool, error: poolError } = await admin
      .from("assessment_pools")
      .select("id")
      .eq("code", CHAPTER_I_POOLS.diagnostic)
      .eq("status", "active")
      .single();
    if (poolError || !diagnosticPool) return json({ error: "diagnostic_pool_unavailable" }, 500);

    const { data: formsData, error: formsError } = await admin
      .from("assessment_forms")
      .select("id, code, form_version")
      .eq("pool_id", diagnosticPool.id)
      .eq("status", "active")
      .order("code", { ascending: true });
    if (formsError || !formsData?.length) return json({ error: "diagnostic_forms_unavailable" }, 500);

    const { data: priorDiagnosticSessions, error: historyError } = await admin
      .from("learning_sessions")
      .select("metadata, started_at")
      .eq("student_id", studentId)
      .eq("unit_code", UNIT_CODE)
      .eq("mode", "diagnostic")
      .neq("status", "active")
      .order("started_at", { ascending: false })
      .limit(20);
    if (historyError) return json({ error: "diagnostic_history_failed" }, 500);

    const priorFormCodes = (priorDiagnosticSessions ?? [])
      .map((row) => typeof row.metadata?.formCode === "string" ? row.metadata.formCode : null)
      .filter((value): value is string => Boolean(value));
    const rotation = chooseRotatingDiagnosticForm(formsData, priorFormCodes);
    if (!rotation) return json({ error: "diagnostic_form_selection_failed" }, 500);

    const { data: formMemberships, error: formItemsError } = await admin
      .from("assessment_form_items")
      .select("item_id, slot_order")
      .eq("form_id", rotation.form.id)
      .order("slot_order", { ascending: true });
    if (formItemsError || !formMemberships?.length) return json({ error: "diagnostic_form_empty" }, 409);

    const eligibleSet = new Set(eligibleIds);
    const formItemIds = formMemberships.map((row) => String(row.item_id)).filter((id) => eligibleSet.has(id));
    const { data: items, error: itemsError } = await admin
      .from("items")
      .select("id, code, skill_id, difficulty")
      .in("id", formItemIds)
      .in("skill_id", skillIds)
      .eq("status", "published");
    if (itemsError) return json({ error: "items_query_failed" }, 500);

    const selected: Array<{ item_id: string; skill_id: string; selection_reason: string }> = [];
    for (const skill of skills) {
      const pool = (items ?? [])
        .filter((item) => item.skill_id === skill.id)
        .sort((a, b) => String(a.code).localeCompare(String(b.code)));
      if (pool.length !== DIAGNOSTIC_ITEMS_PER_SKILL) {
        return json({ error: "invalid_diagnostic_form_skill_coverage", skillCode: skill.code, count: pool.length }, 409);
      }
      for (const item of pool) {
        selected.push({
          item_id: item.id,
          skill_id: skill.id,
          selection_reason: `diagnostic_${rotation.reason}:${rotation.form.code}`,
        });
      }
    }

    const ordered = shuffle(selected);
    const { data: session, error: sessionError } = await admin.from("learning_sessions").insert({
      student_id: studentId,
      unit_code: UNIT_CODE,
      mode: "diagnostic",
      planned_item_count: ordered.length,
      metadata: {
        itemsPerSkill: DIAGNOSTIC_ITEMS_PER_SKILL,
        noRepeats: true,
        poolCode: CHAPTER_I_POOLS.diagnostic,
        selectionPolicyVersion: "11B-v1",
        formCode: rotation.form.code,
        formVersion: Number(rotation.form.form_version),
        formSelectionReason: rotation.reason,
        priorFormCode: priorFormCodes[0] ?? null,
        provisionalParallelism: true,
      },
    }).select("id, mode, status, planned_item_count, answered_count, correct_count, metadata").single();
    if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

    const rows = ordered.map((row, index) => ({
      session_id: session.id,
      ordinal: index + 1,
      skill_id: row.skill_id,
      item_id: row.item_id,
      selection_reason: row.selection_reason,
    }));
    const { error: itemInsertError } = await admin.from("learning_session_items").insert(rows);
    if (itemInsertError) {
      await admin.from("learning_sessions").delete().eq("id", session.id);
      return json({ error: "session_items_create_failed" }, 500);
    }
    return json({ session, resumed: false, diagnosticForm: rotation.form.code });
  }

  if (body.mode === "mastery_check") {
    const { data: priorChecks, error: priorError } = await admin
      .from("learning_sessions")
      .select("id, assessment_result, completed_at, metadata")
      .eq("student_id", studentId)
      .eq("unit_code", UNIT_CODE)
      .eq("mode", "mastery_check")
      .eq("status", "completed")
      .order("completed_at", { ascending: false });
    if (priorError) return json({ error: "mastery_history_failed" }, 500);

    const latestCheck = priorChecks?.[0] ?? null;
    if (latestCheck?.assessment_result === "passed") {
      return json({ unitComplete: true, unitCode: UNIT_CODE, messageHy: "Բաժնի mastery check-ը արդեն հաջողությամբ անցել եք։" });
    }

    const incompleteSkills = skills.filter((skill) => !isComplete(mastery.get(skill.id), attempts, skill.id));
    if (incompleteSkills.length) {
      return json({
        masteryEligible: false,
        reason: "skills_not_ready",
        requiredSkills: incompleteSkills.map((s) => ({ id: s.id, code: s.code, nameHy: s.name_hy })),
        messageHy: "Mastery check-ից առաջ ավարտեք դեռ չամրապնդված հմտությունների վարժանքը։",
      });
    }

    if (latestCheck?.assessment_result === "failed") {
      const failedSkillIds = Array.isArray(latestCheck.metadata?.failedSkillIds) ? latestCheck.metadata.failedSkillIds as string[] : [];
      if (failedSkillIds.length) {
        const { data: remediationSessions } = await admin
          .from("learning_sessions")
          .select("target_skill_id, completed_at")
          .eq("student_id", studentId)
          .eq("unit_code", UNIT_CODE)
          .eq("mode", "practice")
          .eq("status", "completed")
          .gt("completed_at", latestCheck.completed_at);
        const remediated = new Set((remediationSessions ?? []).map((s) => s.target_skill_id).filter(Boolean));
        const missing = failedSkillIds.filter((id) => !remediated.has(id));
        if (missing.length) {
          return json({
            masteryEligible: false,
            reason: "remediation_required",
            requiredSkills: skills.filter((s) => missing.includes(s.id)).map((s) => ({ id: s.id, code: s.code, nameHy: s.name_hy })),
            messageHy: "Կրկնակի mastery check-ից առաջ ավարտեք առաջարկվող remediation վարժանքները։",
          });
        }
      }
    }

    let eligibleIds: string[];
    try {
      eligibleIds = await getEligiblePoolItemIds(admin, "mastery_check");
    } catch (err) {
      console.error("mastery pool unavailable", err);
      return json({ error: "mastery_pool_unavailable" }, 500);
    }
    if (!eligibleIds.length) return json({ error: "mastery_pool_empty" }, 409);

    const { data: itemsData, error: itemsError } = await admin
      .from("items")
      .select("id, code, skill_id, difficulty, item_template_id, variant_key")
      .in("id", eligibleIds)
      .in("skill_id", skillIds)
      .eq("status", "published");
    if (itemsError) return json({ error: "items_query_failed" }, 500);
    const items = (itemsData ?? []) as PoolItem[];

    let exposureHistory;
    try {
      exposureHistory = await getStudentExposureHistory(admin, studentId, eligibleIds);
    } catch (err) {
      console.error("mastery exposure history unavailable", err);
      return json({ error: "mastery_exposure_history_failed" }, 500);
    }

    const previousItemIds = new Set<string>();
    if (latestCheck?.assessment_result === "failed") {
      const { data: priorItems, error: priorItemsError } = await admin
        .from("learning_session_items")
        .select("item_id")
        .eq("session_id", latestCheck.id);
      if (priorItemsError) return json({ error: "mastery_previous_form_failed" }, 500);
      for (const row of priorItems ?? []) previousItemIds.add(String(row.item_id));
    }

    const selected: Array<{ item_id: string; skill_id: string; selection_reason: string }> = [];
    let overlapCount = 0;
    let poolExhausted = false;
    for (const skill of skills) {
      const pool = items.filter((item) => item.skill_id === skill.id);
      if (pool.length < MASTERY_ITEMS_PER_SKILL) return json({ error: "insufficient_mastery_items", skillCode: skill.code }, 409);
      const choice = chooseMasteryByExposure({
        candidates: pool,
        exposures: exposureHistory,
        previousItemIds,
        count: MASTERY_ITEMS_PER_SKILL,
      });
      if (choice.selected.length < MASTERY_ITEMS_PER_SKILL) {
        return json({ error: "mastery_selection_exhausted", skillCode: skill.code }, 409);
      }
      overlapCount += choice.overlapCount;
      poolExhausted = poolExhausted || choice.poolExhausted;
      for (const entry of choice.selected) {
        selected.push({ item_id: entry.item.id, skill_id: skill.id, selection_reason: entry.reason });
      }
    }

    const ordered = shuffle(selected);
    const attemptNumber = (priorChecks?.length ?? 0) + 1;
    const { data: session, error: sessionError } = await admin.from("learning_sessions").insert({
      student_id: studentId,
      unit_code: UNIT_CODE,
      mode: "mastery_check",
      planned_item_count: ordered.length,
      metadata: {
        itemsPerSkill: MASTERY_ITEMS_PER_SKILL,
        noHints: true,
        passPercent: MASTERY_PASS_PERCENT,
        minCorrectPerSkill: MASTERY_MIN_CORRECT_PER_SKILL,
        attemptNumber,
        poolCode: CHAPTER_I_POOLS.mastery_check,
        protectedPool: true,
        selectionPolicyVersion: "11B-v1",
        formType: attemptNumber > 1 ? "alternate_retest" : "initial_unseen_first",
        alternateFromSessionId: latestCheck?.assessment_result === "failed" ? latestCheck.id : null,
        previousFormItemCount: previousItemIds.size,
        overlapCount,
        poolExhausted,
        exactRepeatFallbackUsed: overlapCount > 0,
      },
    }).select("id, mode, status, planned_item_count, answered_count, correct_count, metadata").single();
    if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

    const rows = ordered.map((row, index) => ({
      session_id: session.id,
      ordinal: index + 1,
      skill_id: row.skill_id,
      item_id: row.item_id,
      selection_reason: row.selection_reason,
    }));
    const { error: itemInsertError } = await admin.from("learning_session_items").insert(rows);
    if (itemInsertError) {
      await admin.from("learning_sessions").delete().eq("id", session.id);
      return json({ error: "session_items_create_failed" }, 500);
    }
    return json({
      session,
      resumed: false,
      masteryEligible: true,
      selection: { overlapCount, poolExhausted, exactRepeatFallbackUsed: overlapCount > 0 },
    });
  }

  let target = null as (typeof skills)[number] | null;
  if (body.targetSkillId) {
    target = skills.find((skill) => skill.id === body.targetSkillId) ?? null;
    if (!target) return json({ error: "invalid_target_skill" }, 400);
  } else {
    target = skills.find((skill) => !isComplete(mastery.get(skill.id), attempts, skill.id)) ?? null;
  }

  if (!target) return json({ unitReadyForMasteryCheck: true, unitCode: UNIT_CODE, messageHy: "Բոլոր հմտությունները պատրաստ են mastery check-ի համար։" });

  const { data: session, error: sessionError } = await admin.from("learning_sessions").insert({
    student_id: studentId,
    unit_code: UNIT_CODE,
    mode: "practice",
    target_skill_id: target.id,
    planned_item_count: PRACTICE_SESSION_LENGTH,
    metadata: {
      targetSkillCode: target.code,
      bounded: true,
      recommendedTarget: Boolean(body.targetSkillId),
      poolCode: CHAPTER_I_POOLS.practice,
      selectionPolicyVersion: "11B-v1",
      exactRepeatFallbackOnly: true,
    },
  }).select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, metadata").single();
  if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

  return json({ session, resumed: false, targetSkill: { id: target.id, code: target.code, nameHy: target.name_hy } });
});