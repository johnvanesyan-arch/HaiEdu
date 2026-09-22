import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";
import { confirmRecommendationActionStarted } from "../_shared/recommendation-telemetry.ts";
import { resolveCurriculumBlueprint } from "../_shared/curriculum-release.ts";
import {
  CHAPTER_I_POOLS,
  chooseMasteryByExposure,
  chooseRotatingDiagnosticForm,
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

type Mode = "diagnostic" | "practice" | "mastery_check" | "chapter_review";
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

function stableRank(seed: string, value: string): number {
  let hash = 2166136261;
  for (const char of `${seed}|${value}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

  if (!(await hasPhysics7Access(admin, studentId))) {
    return json({
      error: "course_access_required",
      courseKey: "physics:7",
      messageHy: "Ֆիզիկա 7-ի ուսուցման գործողությունները հասանելի են միայն համապատասխան դասարանին միացած աշակերտներին։",
    }, 403);
  }

  let body: { mode?: Mode; targetSkillId?: string | null; recommendationInstanceId?: string | null } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (!body.mode || !["diagnostic", "practice", "mastery_check", "chapter_review"].includes(body.mode)) {
    return json({ error: "invalid_mode" }, 400);
  }

  const { data: activeSessions } = await admin
    .from("learning_sessions")
    .select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status")
    .eq("student_id", studentId)
    .eq("unit_code", UNIT_CODE)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const active = activeSessions?.[0];
  if (active?.mode === body.mode) {
    await confirmRecommendationActionStarted({
      admin,
      studentId,
      recommendationInstanceId: body.recommendationInstanceId,
      learningSessionId: active.id,
      mode: body.mode,
      targetSkillId: active.target_skill_id,
    });
    return json({ session: active, resumed: true });
  }
  if (active) {
    return json({
      error: "active_session_conflict",
      requestedMode: body.mode,
      activeSession: active,
      messageHy: "Սկզբում շարունակեք կամ ավարտեք արդեն ընթացիկ ուսուցման գործողությունը։",
    }, 409);
  }

  let curriculumContext;
  try {
    curriculumContext = await resolveCurriculumBlueprint(admin, UNIT_CODE, body.mode);
  } catch (err) {
    console.error("curriculum release or blueprint unavailable", err);
    return json({ error: "curriculum_release_unavailable" }, 503);
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
      eligibleIds = curriculumContext.itemIds;
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
      curriculum_release_id: curriculumContext.releaseId,
      assessment_blueprint_id: curriculumContext.blueprintId,
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
    }).select("id, mode, status, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status, metadata").single();
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
    await confirmRecommendationActionStarted({
      admin,
      studentId,
      recommendationInstanceId: body.recommendationInstanceId,
      learningSessionId: session.id,
      mode: "diagnostic",
      targetSkillId: null,
    });
    return json({ session, resumed: false, diagnosticForm: rotation.form.code });
  }

  if (body.mode === "chapter_review") {
    const { data: lifecycle, error: lifecycleError } = await admin
      .from("chapter_mastery_states")
      .select("id, lifecycle_state, academic_mastery_policy_id")
      .eq("student_id", studentId)
      .eq("curriculum_release_id", curriculumContext.releaseId)
      .eq("unit_code", UNIT_CODE)
      .maybeSingle();
    if (lifecycleError || !lifecycle) return json({ error: "chapter_review_not_available" }, 409);

    const { data: policy, error: policyError } = await admin
      .from("academic_mastery_policy_versions")
      .select("target_review_question_count")
      .eq("id", lifecycle.academic_mastery_policy_id)
      .single();
    if (policyError || !policy) return json({ error: "mastery_policy_unavailable" }, 503);
    const targetCount = Number(policy.target_review_question_count);

    const { data: latestChecks } = await admin
      .from("learning_sessions")
      .select("metadata")
      .eq("student_id", studentId)
      .eq("curriculum_release_id", curriculumContext.releaseId)
      .eq("unit_code", UNIT_CODE)
      .eq("mode", "mastery_check")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);
    const failedSkillIds = Array.isArray(latestChecks?.[0]?.metadata?.failedSkillIds)
      ? latestChecks[0].metadata.failedSkillIds as string[]
      : [];
    const failedSkills = new Set(failedSkillIds);

    const { data: reviewItems, error: reviewItemsError } = await admin
      .from("chapter_review_item_catalog_v")
      .select("item_id, item_code, item_version, skill_id, item_template_id, template_code, item_family_id, family_code, variant_key")
      .in("item_id", curriculumContext.itemIds)
      .in("skill_id", skillIds);
    if (reviewItemsError || !reviewItems?.length) return json({ error: "chapter_review_pool_empty" }, 409);

    const { data: cycles, error: cyclesError } = await admin
      .from("chapter_review_cycles")
      .select("id, cycle_number, eligible_pool_size, status")
      .eq("chapter_mastery_state_id", lifecycle.id)
      .order("cycle_number", { ascending: false });
    if (cyclesError) return json({ error: "chapter_review_cycle_history_failed" }, 500);
    const activeCycle = (cycles ?? []).find((cycle) => cycle.status === "active") ?? null;
    const { data: activeCycleExposures, error: cycleExposureError } = activeCycle
      ? await admin.from("chapter_review_item_exposures")
        .select("item_id, skill_id")
        .eq("review_cycle_id", activeCycle.id)
      : { data: [], error: null };
    if (cycleExposureError) return json({ error: "chapter_review_cycle_exposure_failed" }, 500);

    const poolSize = reviewItems.length;
    const activeSeen = new Set((activeCycleExposures ?? []).map((row) => String(row.item_id)));
    const rotateCycle = Boolean(activeCycle && activeSeen.size >= poolSize);
    const cycleNumber = rotateCycle || !activeCycle
      ? Number(cycles?.[0]?.cycle_number ?? 0) + 1
      : Number(activeCycle.cycle_number);
    const cycleSeen = rotateCycle ? new Set<string>() : activeSeen;
    const cycleId = rotateCycle ? null : activeCycle?.id ?? null;
    const { data: priorCycleSessions, error: cycleSessionsError } = cycleId
      ? await admin.from("chapter_review_sessions")
        .select("review_session_number")
        .eq("review_cycle_id", cycleId)
        .order("review_session_number", { ascending: false })
        .limit(1)
      : { data: [], error: null };
    if (cycleSessionsError) return json({ error: "chapter_review_session_history_failed" }, 500);
    const sessionNumber = cycleId ? Number(priorCycleSessions?.[0]?.review_session_number ?? 0) + 1 : 1;

    const { data: evidence, error: evidenceError } = await admin
      .from("chapter_review_item_evidence_v")
      .select("item_id, skill_id, item_template_id, item_family_id, selected_at, answered_at, correct, independent")
      .eq("chapter_mastery_state_id", lifecycle.id)
      .order("selected_at", { ascending: false })
      .limit(5000);
    if (evidenceError) return json({ error: "chapter_review_evidence_failed" }, 500);

    const exposureCounts = new Map<string, number>();
    const templateCounts = new Map<string, number>();
    const familyCounts = new Map<string, number>();
    const lastSeen = new Map<string, number>();
    const recentBySkill = new Map<string, Array<{ correct: boolean; independent: boolean }>>();
    for (const row of evidence ?? []) {
      const itemId = String(row.item_id);
      exposureCounts.set(itemId, (exposureCounts.get(itemId) ?? 0) + 1);
      if (row.item_template_id) templateCounts.set(String(row.item_template_id), (templateCounts.get(String(row.item_template_id)) ?? 0) + 1);
      if (row.item_family_id) familyCounts.set(String(row.item_family_id), (familyCounts.get(String(row.item_family_id)) ?? 0) + 1);
      if (!lastSeen.has(itemId)) lastSeen.set(itemId, Date.parse(String(row.selected_at)) || 0);
      if (row.answered_at && row.independent !== null) {
        const rows = recentBySkill.get(String(row.skill_id)) ?? [];
        if (rows.length < 5) rows.push({ correct: Boolean(row.correct), independent: Boolean(row.independent) });
        recentBySkill.set(String(row.skill_id), rows);
      }
    }
    const weakSkillIds = [...recentBySkill.entries()]
      .map(([skillId, rows]) => ({
        skillId,
        independentCorrect: rows.filter((row) => row.independent && row.correct).length,
        independentCount: rows.filter((row) => row.independent).length,
      }))
      .sort((a, b) => {
        const aRate = a.independentCount ? a.independentCorrect / a.independentCount : -1;
        const bRate = b.independentCount ? b.independentCorrect / b.independentCount : -1;
        return aRate - bRate || a.independentCount - b.independentCount || a.skillId.localeCompare(b.skillId);
      })
      .map((row) => row.skillId);
    const weakRank = new Map(weakSkillIds.map((skillId, index) => [skillId, index]));
    const candidateOrder = (a: typeof reviewItems[number], b: typeof reviewItems[number]) => {
      const unseenDelta = Number(cycleSeen.has(String(a.item_id))) - Number(cycleSeen.has(String(b.item_id)));
      if (unseenDelta) return unseenDelta;
      const lastDelta = (lastSeen.get(String(a.item_id)) ?? -1) - (lastSeen.get(String(b.item_id)) ?? -1);
      if (lastDelta) return lastDelta;
      const templateDelta = (templateCounts.get(String(a.item_template_id ?? "")) ?? 0) - (templateCounts.get(String(b.item_template_id ?? "")) ?? 0);
      if (templateDelta) return templateDelta;
      const familyDelta = (familyCounts.get(String(a.item_family_id ?? "")) ?? 0) - (familyCounts.get(String(b.item_family_id ?? "")) ?? 0);
      if (familyDelta) return familyDelta;
      const exposureDelta = (exposureCounts.get(String(a.item_id)) ?? 0) - (exposureCounts.get(String(b.item_id)) ?? 0);
      return exposureDelta || String(a.item_code).localeCompare(String(b.item_code));
    };
    const orderedPool = [...reviewItems].sort((a, b) => {
      const unseenDelta = Number(cycleSeen.has(String(a.item_id))) - Number(cycleSeen.has(String(b.item_id)));
      if (unseenDelta) return unseenDelta;
      const failedDelta = Number(failedSkills.has(String(b.skill_id))) - Number(failedSkills.has(String(a.skill_id)));
      if (failedDelta) return failedDelta;
      const weakDelta = (weakRank.get(String(a.skill_id)) ?? Number.MAX_SAFE_INTEGER) -
        (weakRank.get(String(b.skill_id)) ?? Number.MAX_SAFE_INTEGER);
      return weakDelta || candidateOrder(a, b);
    });

    const selected: Array<{ item_id: string; skill_id: string; selection_reason: string; pool_exhausted: boolean }> = [];
    const selectedIds = new Set<string>();
    for (const skill of skills) {
      const skillPool = reviewItems.filter((candidate) => candidate.skill_id === skill.id).sort(candidateOrder);
      const item = skillPool.find((candidate) => !selectedIds.has(String(candidate.item_id)));
      if (!item) continue;
      const exhausted = cycleSeen.has(String(item.item_id)) && skillPool.every((candidate) => cycleSeen.has(String(candidate.item_id)));
      selected.push({
        item_id: item.item_id,
        skill_id: item.skill_id,
        selection_reason: failedSkills.has(item.skill_id)
          ? "review_failed_skill_weight_whole_chapter"
          : weakRank.has(String(item.skill_id)) ? "review_weak_independent_whole_chapter" : "review_whole_chapter_coverage",
        pool_exhausted: exhausted,
      });
      selectedIds.add(String(item.item_id));
    }
    for (const item of orderedPool) {
      if (selected.length >= targetCount) break;
      if (selectedIds.has(String(item.item_id))) continue;
      const skillPool = reviewItems.filter((candidate) => candidate.skill_id === item.skill_id);
      const exhausted = cycleSeen.has(String(item.item_id)) && skillPool.every((candidate) => cycleSeen.has(String(candidate.item_id)));
      selected.push({
        item_id: item.item_id,
        skill_id: item.skill_id,
        selection_reason: failedSkills.has(item.skill_id)
          ? "review_failed_skill_extra"
          : weakRank.has(String(item.skill_id)) ? "review_weak_independent_extra" : "review_least_recent_diverse_fill",
        pool_exhausted: exhausted,
      });
      selectedIds.add(String(item.item_id));
    }
    if (selected.length < Math.min(targetCount, reviewItems.length)) {
      return json({ error: "insufficient_chapter_review_items" }, 409);
    }

    const selectionSeed = `${lifecycle.id}|${cycleNumber}|${sessionNumber}|12.5E-F-v1`;
    const ordered = selected.slice(0, Math.min(targetCount, selected.length))
      .sort((a, b) => stableRank(selectionSeed, a.item_id) - stableRank(selectionSeed, b.item_id) || a.item_id.localeCompare(b.item_id));
    const atomicItems = ordered.map((row, index) => ({
      ordinal: index + 1,
      skill_id: row.skill_id,
      item_id: row.item_id,
      selection_reason: row.selection_reason,
      pool_exhausted: row.pool_exhausted,
    }));
    const { data: reviewLifecycle, error: reviewError } = await admin.rpc("start_chapter_review_atomic", {
      p_student_id: studentId,
      p_curriculum_release_id: curriculumContext.releaseId,
      p_assessment_blueprint_id: curriculumContext.blueprintId,
      p_unit_code: UNIT_CODE,
      p_metadata: {
        bounded: true,
        wholeChapter: true,
        hintingEnabled: true,
        selectionPolicyVersion: "12.5E-F-v1",
        failedSkillIds,
        weakSkillIds,
        deterministicSeed: selectionSeed,
        reviewCycleNumber: cycleNumber,
        reviewSessionNumber: sessionNumber,
      },
      p_items: atomicItems,
      p_eligible_pool_size: poolSize,
      p_expected_cycle_number: cycleNumber,
      p_expected_session_number: sessionNumber,
    });
    if (reviewError || !reviewLifecycle?.sessionId) {
      const detail = reviewError?.message ?? "chapter_review_start_failed";
      return json({ error: "chapter_review_start_failed", detail }, 409);
    }

    const { data: session, error: sessionError } = await admin
      .from("learning_sessions")
      .select("id, mode, status, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status, metadata, academic_mastery_policy_id")
      .eq("id", reviewLifecycle.sessionId)
      .single();
    if (sessionError || !session) return json({ error: "session_load_failed" }, 500);
    return json({
      session,
      resumed: Boolean(reviewLifecycle.resumed),
      reviewSessionId: reviewLifecycle.reviewSessionId,
      reviewContext: reviewLifecycle.reviewContext,
      required: Boolean(reviewLifecycle.required),
      reviewCycleNumber: Number(reviewLifecycle.reviewCycleNumber),
      reviewSessionNumber: Number(reviewLifecycle.reviewSessionNumber),
    });
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

    let eligibleIds: string[];
    try {
      eligibleIds = curriculumContext.itemIds;
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
    const creationMetadata = {
      itemsPerSkill: MASTERY_ITEMS_PER_SKILL,
      noHints: true,
      passPercent: MASTERY_PASS_PERCENT,
      minCorrectPerSkill: MASTERY_MIN_CORRECT_PER_SKILL,
      poolCode: CHAPTER_I_POOLS.mastery_check,
      protectedPool: true,
      selectionPolicyVersion: "11B-v1",
      formType: (priorChecks?.length ?? 0) > 0 ? "alternate_retest" : "initial_unseen_first",
      alternateFromSessionId: latestCheck?.assessment_result === "failed" ? latestCheck.id : null,
      previousFormItemCount: previousItemIds.size,
      overlapCount,
      poolExhausted,
      exactRepeatFallbackUsed: overlapCount > 0,
    };
    const atomicItems = ordered.map((row, index) => ({
      ordinal: index + 1,
      skill_id: row.skill_id,
      item_id: row.item_id,
      selection_reason: row.selection_reason,
    }));
    const { data: lifecycle, error: lifecycleError } = await admin.rpc("start_mastery_check_atomic", {
      p_student_id: studentId,
      p_curriculum_release_id: curriculumContext.releaseId,
      p_assessment_blueprint_id: curriculumContext.blueprintId,
      p_unit_code: UNIT_CODE,
      p_planned_item_count: ordered.length,
      p_metadata: creationMetadata,
      p_items: atomicItems,
    });
    if (lifecycleError || !lifecycle?.sessionId) {
      const detail = lifecycleError?.message ?? "mastery_lifecycle_start_failed";
      const blocked = detail.includes("mastery_check_not_allowed") || detail.includes("mastery_attempt_limit_reached");
      return json({ error: blocked ? "mastery_check_not_allowed" : "session_create_failed", detail }, blocked ? 409 : 500);
    }

    const { data: session, error: sessionError } = await admin
      .from("learning_sessions")
      .select("id, mode, status, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status, metadata, academic_mastery_policy_id, mastery_attempt_number")
      .eq("id", lifecycle.sessionId)
      .single();
    if (sessionError || !session) return json({ error: "session_load_failed" }, 500);

    return json({
      session,
      resumed: Boolean(lifecycle.resumed),
      masteryEligible: true,
      attemptNumber: Number(lifecycle.attemptNumber),
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
    curriculum_release_id: curriculumContext.releaseId,
    assessment_blueprint_id: curriculumContext.blueprintId,
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
  }).select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status, metadata").single();
  if (sessionError || !session) return json({ error: "session_create_failed" }, 500);

  await confirmRecommendationActionStarted({
      admin,
      studentId,
      recommendationInstanceId: body.recommendationInstanceId,
      learningSessionId: session.id,
      mode: "practice",
      targetSkillId: target.id,
    });
    return json({ session, resumed: false, targetSkill: { id: target.id, code: target.code, nameHy: target.name_hy } });
});
