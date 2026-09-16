import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PASS_PERCENT = 80;
const MIN_CORRECT_PER_SKILL = 1;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function evaluate(admin: any, session: any) {
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
  const percent = answered ? Math.round((correct / answered) * 100) : 0;
  const everySkillMinimum = skillResults.length > 0 && skillResults.every((r) => r.correct >= MIN_CORRECT_PER_SKILL);
  const passed = percent >= PASS_PERCENT && everySkillMinimum;

  const remediationTargets = skillResults
    .filter((r) => r.correct < r.total)
    .sort((a, b) => a.correct - b.correct || a.code.localeCompare(b.code))
    .slice(0, 3);
  const failedSkillIds = passed ? [] : remediationTargets.map((r) => r.skillId);

  const metadata = {
    ...(session.metadata ?? {}),
    resultVersion: 1,
    passed,
    passPercent: PASS_PERCENT,
    minCorrectPerSkill: MIN_CORRECT_PER_SKILL,
    skillResults,
    failedSkillIds,
  };

  const { error: updateError } = await admin.from("learning_sessions").update({
    assessment_result: passed ? "passed" : "failed",
    score_percent: percent,
    metadata,
    updated_at: new Date().toISOString(),
  }).eq("id", session.id);
  if (updateError) throw updateError;

  return {
    passed,
    score: { correct, answered, percent },
    passCriteria: { overallPercent: PASS_PERCENT, minCorrectPerSkill: MIN_CORRECT_PER_SKILL },
    skillResults,
    failedSkills: skillResults.filter((r) => failedSkillIds.includes(r.skillId)),
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
    if (!(await hasPhysics7Access(admin, userData.user.id))) {
      return json({ error: "course_access_required", courseKey: "physics:7" }, 403);
    }

    const body = await req.json();
    if (!body?.sessionId || !body?.sessionItemId || !body?.itemId || !body?.response) {
      return json({ error: "missing_required_fields" }, 400);
    }

    const { data: session, error: sessionError } = await admin
      .from("learning_sessions")
      .select("id, student_id, mode, status, planned_item_count, answered_count, correct_count, metadata")
      .eq("id", body.sessionId)
      .eq("student_id", userData.user.id)
      .single();
    if (sessionError || !session) return json({ error: "session_not_found" }, 404);
    if (session.mode !== "mastery_check") return json({ error: "not_mastery_check" }, 409);
    if (session.status !== "active") return json({ error: "session_not_active" }, 409);

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
    if (!upstream.ok) return json({ error: "grading_failed", detail: upstreamData?.error ?? upstream.statusText }, upstream.status);

    const { data: refreshed, error: refreshError } = await admin
      .from("learning_sessions")
      .select("id, status, planned_item_count, answered_count, correct_count, metadata, assessment_result, score_percent")
      .eq("id", session.id)
      .single();
    if (refreshError || !refreshed) return json({ error: "session_refresh_failed" }, 500);

    let finalResult = null;
    if (refreshed.status === "completed") finalResult = await evaluate(admin, refreshed);

    return json({
      accepted: true,
      revealCorrect: false,
      session: {
        status: refreshed.status,
        planned: Number(refreshed.planned_item_count),
        answered: Number(refreshed.answered_count),
      },
      finalResult,
    });
  } catch (err) {
    console.error("submit-mastery-answer", err);
    return json({ error: "submit_mastery_answer_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
