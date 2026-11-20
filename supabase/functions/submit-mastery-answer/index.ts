import { enforceRateBudget } from "../_shared/rate-budget.mjs";
import { routeGovernedLearning, verifiedSessionClaim } from "../_shared/governed-learning-runtime.mjs";
import { legacyAnswerReceipt, finishLegacyAnswer } from "../_shared/answer-response-recovery.mjs";
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";
import { evaluateMastery, loadSessionCriteria, ruleErrorStatus } from "../_shared/legacy-mastery-rules.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Scoring-rule version for checks that saved none (every check before the registry).
const DEFAULT_RULE_VERSION = "phy7-u01-v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function evaluate(admin: any, session: any) {
  // Scored by the criteria saved when the check started, never by the current switch.
  const { criteria } = await loadSessionCriteria(admin, session.metadata, DEFAULT_RULE_VERSION);
  const { data: rows, error } = await admin
    .from("learning_session_items")
    .select("skill_id, correct")
    .eq("session_id", session.id)
    .not("answered_at", "is", null);
  if (error) throw error;

  const skillMap = new Map<string, { correct: number; total: number }>();
  for (const row of rows ?? []) {
    const current = skillMap.get(row.skill_id) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (row.correct === true) current.correct += 1;
    skillMap.set(row.skill_id, current);
  }

  const skillIds = [...skillMap.keys()];
  const { data: skills } = await admin.from("skills").select("id, code, name_hy").in("id", skillIds);
  const names = new Map((skills ?? []).map((s: any) => [s.id, s]));
  const skillResults = skillIds.map((id) => ({
    skillId: id,
    code: names.get(id)?.code ?? id,
    nameHy: names.get(id)?.name_hy ?? "",
    correct: skillMap.get(id)?.correct ?? 0,
    total: skillMap.get(id)?.total ?? 0,
  })).sort((a, b) => a.code.localeCompare(b.code));

  const answered = Number(session.answered_count);
  const correct = Number(session.correct_count);
  const outcome = evaluateMastery(criteria, skillResults, { correct, answered });
  const { passed, failedSkillIds } = outcome;
  // The database verifies the raw whole-check percentage for legacy checks.
  const percent = outcome.rawPercent;

  const metadata = {
    ...(session.metadata ?? {}),
    resultVersion: 1,
    passed,
    passPercent: criteria.minimumPercent,
    minCorrectPerSkill: criteria.minimumCorrectPerScoredSkill,
    skillResults,
    failedSkillIds,
    ...(outcome.reporting ? { assessmentResultReporting: outcome.reporting } : {}),
  };

  const { data: lifecycle, error: lifecycleError } = await admin.rpc("finalize_mastery_check_atomic", {
    p_student_id: session.student_id,
    p_session_id: session.id,
    p_passed: passed,
    p_score_percent: percent,
    p_result_metadata: metadata,
  });
  if (lifecycleError) throw lifecycleError;

  return {
    passed,
    score: { correct, answered, percent },
    passCriteria: { overallPercent: criteria.minimumPercent, minCorrectPerSkill: criteria.minimumCorrectPerScoredSkill },
    scoringRuleVersion: criteria.ruleVersion,
    assessmentResult: outcome.reporting,
    ruleTextsHy: criteria.textsHy,
    skillResults,
    failedSkills: skillResults.filter((r) => failedSkillIds.includes(r.skillId)),
    lifecycle,
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

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
    const rateDenied = await enforceRateBudget(req, admin, userData.user.id, token, "submit-mastery-answer");
    if (rateDenied) return rateDenied;

    const governed = await routeGovernedLearning({ admin, studentId: userData.user.id, token, request: req, operation: "mastery" });
    if (governed) return json(governed.body, governed.status);
    // Registered legacy-physics7-u01-v1 adapter; governed requests never enter it.
    if (!(await hasPhysics7Access(admin, userData.user.id))) {
      return json({ error: "course_access_required", courseKey: "physics:7" }, 403);
    }

    const body = await req.json();
    if (!body?.sessionId || !body?.sessionItemId || !body?.itemId || !body?.response) {
      return json({ error: "missing_required_fields" }, 400);
    }
    const authSessionId = verifiedSessionClaim(token);
    const recovery = await legacyAnswerReceipt(admin,userData.user.id,authSessionId,"legacy-mastery",body);
    if (recovery.error) return json({error:recovery.error},recovery.status);
    if (recovery.response) return json({...recovery.response,replayed:true});

    const { data: session, error: sessionError } = await admin
      .from("learning_sessions")
      .select("id, student_id, mode, status, planned_item_count, answered_count, correct_count, metadata")
      .eq("id", body.sessionId)
      .eq("student_id", userData.user.id)
      .single();
    if (sessionError || !session) return json({ error: "session_not_found" }, 404);
    if (session.mode !== "mastery_check") return json({ error: "not_mastery_check" }, 409);
    if (session.status !== "active" && !recovery.coreResult) return json({ error: "session_not_active" }, 409);

    const upstream = await fetch(`${supabaseUrl}/functions/v1/submit-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "apikey": serviceRoleKey,
      },
      body: JSON.stringify({
        sessionId: body.sessionId,
        sessionItemId: body.sessionItemId,
        itemId: body.itemId,
        response: body.response,
        responseTimeMs: body.responseTimeMs ?? null,
        hintUsed: false,
      }),
    });
    const upstreamData = await upstream.json().catch(() => ({}));
    if (upstream.status === 422 && upstreamData?.error === "invalid_numeric_format") {
      return json({ error: upstreamData.error, inputFormatVersion: upstreamData.inputFormatVersion }, 422);
    }
    if (!upstream.ok) return json({ error: "grading_failed", detail: upstreamData?.error ?? upstream.statusText }, upstream.status);

    const { data: refreshed, error: refreshError } = await admin
      .from("learning_sessions")
      .select("id, student_id, status, planned_item_count, answered_count, correct_count, metadata, assessment_result, score_percent")
      .eq("id", session.id)
      .single();
    if (refreshError || !refreshed) return json({ error: "session_refresh_failed" }, 500);

    let finalResult = null;
    if (refreshed.status === "completed") {
      try {
        finalResult = await evaluate(admin, refreshed);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (!code?.startsWith("legacy_mastery_rule")) throw err;
        console.error("mastery rule refused", err);
        return json({ error: code }, ruleErrorStatus(err));
      }
    }

    const result = {
      accepted: true,
      revealCorrect: false,
      session: {
        status: refreshed.status,
        planned: Number(refreshed.planned_item_count),
        answered: Number(refreshed.answered_count),
      },
      finalResult,
    };
    const saved = await finishLegacyAnswer(admin,userData.user.id,authSessionId,"legacy-mastery",body,result);
    return json(saved.body??{error:saved.error},saved.status);
  } catch (err) {
    console.error("submit-mastery-answer", err);
    return json({ error: "submit_mastery_answer_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
