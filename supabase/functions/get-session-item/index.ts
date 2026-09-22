import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";
import { getBlueprintItemIds } from "../_shared/curriculum-release.ts";
import {
  choosePracticeByExposure,
  getStudentExposureHistory,
  recordSessionItemExposure,
  type SelectableItem,
} from "../_shared/assessment-integrity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTERY_THRESHOLD = 0.72;

type PracticeCandidate = SelectableItem & {
  item_type: string;
  prompt_hy: string;
  stimulus: unknown;
  skill_id: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function desiredDifficulty(mastery: number, consecutiveWrong = 0) {
  let base = mastery < 0.35 ? 1 : mastery < 0.55 ? 2 : mastery < MASTERY_THRESHOLD ? 3 : 4;
  if (consecutiveWrong >= 2) base -= 2;
  else if (consecutiveWrong === 1) base -= 1;
  return Math.max(1, Math.min(5, base));
}

function presentationKey(index: number) {
  let n = index + 1;
  let key = "";
  while (n > 0) {
    n -= 1;
    key = String.fromCharCode(65 + (n % 26)) + key;
    n = Math.floor(n / 26);
  }
  return key;
}

function learnerPresentationOptions(
  options: Array<{ option_key: string; content_hy: string; display_order: number }>,
  canonicalOptionOrder: string[],
) {
  const byKey = new Map(options.map((option) => [String(option.option_key), option]));
  if (
    canonicalOptionOrder.length !== options.length ||
    new Set(canonicalOptionOrder).size !== options.length ||
    canonicalOptionOrder.some((key) => !byKey.has(String(key)))
  ) {
    throw new Error("option_presentation_invalid");
  }

  return canonicalOptionOrder.map((canonicalKey, index) => {
    const option = byKey.get(String(canonicalKey))!;
    return {
      option_key: presentationKey(index),
      content_hy: option.content_hy,
      display_order: index + 1,
    };
  });
}

async function completeSession(admin: any, session: any, reason: string) {
  const now = new Date().toISOString();
  await admin
    .from("learning_sessions")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
      metadata: { ...(session.metadata ?? {}), completionReason: reason },
    })
    .eq("id", session.id);

  return {
    complete: true,
    session: { ...session, status: "completed" },
    summary: {
      answered: Number(session.answered_count),
      correct: Number(session.correct_count),
      planned: Number(session.planned_item_count),
      percent: Number(session.answered_count)
        ? Math.round((Number(session.correct_count) / Number(session.answered_count)) * 100)
        : 0,
      reason,
    },
  };
}

async function itemPayload(admin: any, studentId: string, session: any, sessionItem: any) {
  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id, code, item_type, prompt_hy, stimulus, difficulty, skill_id")
    .eq("id", sessionItem.item_id)
    .single();
  if (itemError || !item) throw new Error(`item_load_failed:${itemError?.message ?? "missing"}`);

  const { data: skill, error: skillError } = await admin
    .from("skills")
    .select("id, code, name_hy, layer")
    .eq("id", item.skill_id)
    .single();
  if (skillError || !skill) throw new Error(`skill_load_failed:${skillError?.message ?? "missing"}`);

  const { data: options, error: optionsError } = await admin
    .from("item_options")
    .select("option_key, content_hy, display_order")
    .eq("item_id", item.id)
    .order("display_order", { ascending: true });
  if (optionsError) throw new Error(`options_load_failed:${optionsError.message}`);

  let learnerOptions = options ?? [];
  let optionPresentationVersion: string | null = null;
  if (item.item_type === "single_choice") {
    const { data: presentation, error: presentationError } = await admin.rpc(
      "service_ensure_session_item_option_order",
      { p_session_item_id: sessionItem.id },
    );
    if (presentationError || !presentation?.canonicalOptionOrder) {
      throw new Error(`option_presentation_load_failed:${presentationError?.message ?? "missing"}`);
    }
    learnerOptions = learnerPresentationOptions(
      options ?? [],
      presentation.canonicalOptionOrder.map((key: unknown) => String(key)),
    );
    optionPresentationVersion = String(presentation.algorithmVersion ?? "unknown");
  }

  await recordSessionItemExposure(admin, studentId, session.id, sessionItem.id, item.id);

  return {
    complete: false,
    session: {
      id: session.id,
      mode: session.mode,
      status: session.status,
      position: Number(sessionItem.ordinal),
      total: Number(session.planned_item_count),
      answered: Number(session.answered_count),
      correct: Number(session.correct_count),
      feedbackMode: session.mode === "diagnostic" ? "deferred" : "immediate",
    },
    sessionItemId: sessionItem.id,
    skill: { id: skill.id, code: skill.code, nameHy: skill.name_hy, layer: skill.layer },
    item: {
      id: item.id,
      code: item.code,
      type: item.item_type,
      promptHy: item.prompt_hy,
      stimulus: item.stimulus,
      difficulty: Number(item.difficulty),
      options: learnerOptions,
      optionPresentationVersion,
    },
    remediation: {
      available: session.mode === "practice" || session.mode === "chapter_review",
      hintLevelUsed: Number(sessionItem.hint_level_used ?? 0),
      selectionReason: sessionItem.selection_reason ?? null,
    },
  };
}

Deno.serve(async (req) => {
  try {
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

    if (!(await hasPhysics7Access(admin, studentId))) {
      return json({ error: "course_access_required", courseKey: "physics:7" }, 403);
    }

    let body: { sessionId?: string } = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (!body.sessionId) return json({ error: "sessionId_required" }, 400);

    const { data: session, error: sessionError } = await admin
      .from("learning_sessions")
      .select("id, student_id, unit_code, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, curriculum_release_id, assessment_blueprint_id, provenance_status, metadata")
      .eq("id", body.sessionId)
      .eq("student_id", studentId)
      .single();
    if (sessionError || !session) return json({ error: "session_not_found" }, 404);

    if (session.status !== "active") return json(await completeSession(admin, session, session.metadata?.completionReason ?? "completed"));

    const { data: pendingRows, error: pendingError } = await admin
      .from("learning_session_items")
      .select("id, ordinal, skill_id, item_id, answered_at, correct, hint_level_used, selection_reason")
      .eq("session_id", session.id)
      .is("answered_at", null)
      .order("ordinal", { ascending: true })
      .limit(1);
    if (pendingError) return json({ error: "pending_item_query_failed", detail: pendingError.message }, 500);

    if (pendingRows?.length) {
      return json(await itemPayload(admin, studentId, session, pendingRows[0]));
    }

    if (Number(session.answered_count) >= Number(session.planned_item_count)) {
      return json(await completeSession(admin, session, "item_limit_reached"));
    }

    if (session.mode === "diagnostic") {
      return json(await completeSession(admin, session, "diagnostic_complete"));
    }

    if (!session.target_skill_id) return json({ error: "practice_target_missing" }, 500);

    const { data: masteryRow, error: masteryError } = await admin
      .from("student_skill_mastery_by_release")
      .select("mastery_score, evidence_count, status")
      .eq("curriculum_release_id", session.curriculum_release_id)
      .eq("student_id", studentId)
      .eq("skill_id", session.target_skill_id)
      .maybeSingle();
    if (masteryError) return json({ error: "mastery_query_failed", detail: masteryError.message }, 500);

    const masteryScore = masteryRow ? Number(masteryRow.mastery_score) : 0;
    const evidenceCount = masteryRow ? Number(masteryRow.evidence_count) : 0;

    const { data: sessionRows, error: historyError } = await admin
      .from("learning_session_items")
      .select("id, ordinal, item_id, correct, answered_at, hint_level_used, selection_reason")
      .eq("session_id", session.id)
      .order("ordinal", { ascending: false });
    if (historyError) return json({ error: "session_history_query_failed", detail: historyError.message }, 500);

    const answeredRows = (sessionRows ?? []).filter((row) => row.answered_at);
    const recentFive = answeredRows.slice(0, 5);
    const uniqueSeen = new Set(answeredRows.map((row) => row.item_id)).size;
    const independentCorrect = recentFive.filter(
      (row) => row.correct === true && Number(row.hint_level_used ?? 0) === 0,
    ).length;
    const recovered = uniqueSeen >= 4 && recentFive.length >= 5 && independentCorrect >= 4;
    const mastered = evidenceCount >= 3 && masteryScore >= MASTERY_THRESHOLD;

    if (mastered || recovered) {
      return json(await completeSession(admin, session, mastered ? "mastery_reached" : "independent_recovery"));
    }

    let eligibleIds: string[];
    try {
      eligibleIds = await getBlueprintItemIds(admin, session.assessment_blueprint_id);
    } catch (err) {
      console.error("practice pool unavailable", err);
      return json({ error: "practice_pool_unavailable" }, 500);
    }
    if (!eligibleIds.length) return json({ error: "practice_pool_empty" }, 409);

    const { data: candidatesData, error: itemError } = await admin
      .from("items")
      .select("id, code, item_type, prompt_hy, stimulus, difficulty, skill_id, item_template_id, variant_key")
      .in("id", eligibleIds)
      .eq("skill_id", session.target_skill_id)
      .eq("status", "published");
    if (itemError || !candidatesData?.length) return json({ error: "no_item_for_skill", detail: itemError?.message ?? null }, 404);
    const candidates = candidatesData as PracticeCandidate[];

    let consecutiveWrong = 0;
    for (const row of answeredRows) {
      if (row.correct === false) consecutiveWrong += 1;
      else break;
    }
    const targetDifficulty = desiredDifficulty(masteryScore, consecutiveWrong);

    let exposures;
    try {
      exposures = await getStudentExposureHistory(admin, studentId, candidates.map((item) => item.id));
    } catch (err) {
      console.error("practice exposure history unavailable", err);
      return json({ error: "practice_exposure_history_failed" }, 500);
    }

    const currentSessionItemIds = new Set((sessionRows ?? []).map((row) => String(row.item_id)));
    const selection = choosePracticeByExposure({
      candidates,
      exposures,
      currentSessionItemIds,
      desiredDifficulty: targetDifficulty,
    });
    if (!selection) return json({ error: "practice_selection_failed" }, 500);

    const selected = selection.selected as PracticeCandidate;
    const maxOrdinal = (sessionRows ?? []).reduce((max, row) => Math.max(max, Number(row.ordinal)), 0);
    const { data: created, error: createError } = await admin
      .from("learning_session_items")
      .insert({
        session_id: session.id,
        ordinal: maxOrdinal + 1,
        skill_id: session.target_skill_id,
        item_id: selected.id,
        selection_reason: selection.reason,
      })
      .select("id, ordinal, skill_id, item_id, answered_at, correct, hint_level_used, selection_reason")
      .single();
    if (createError || !created) return json({ error: "practice_item_create_failed", detail: createError?.message ?? null }, 500);

    if (selection.poolExhausted) {
      await admin.from("learning_sessions").update({
        metadata: {
          ...(session.metadata ?? {}),
          exactRepeatFallbackUsed: true,
          lastPoolExhaustionAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }).eq("id", session.id);
    }

    const payload = await itemPayload(admin, studentId, session, created);
    return json({
      ...payload,
      scheduler: {
        selectionMode: selection.reason,
        desiredDifficulty: targetDifficulty,
        consecutiveWrong,
        poolExhausted: selection.poolExhausted,
        cooldownVariantCount: selection.cooldownVariantCount,
        selectedPriorExposureCount: selection.priorExposureCount,
        unseenVariantsRemaining: selection.unseenRemaining,
        policyVersion: "11B-v1",
      },
    });
  } catch (err) {
    console.error("get-session-item fatal", err);
    return json({ error: "get_session_item_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});