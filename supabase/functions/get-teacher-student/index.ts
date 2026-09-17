import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UNIT_CODE = "PHY7-U01";
const MASTERY_THRESHOLD = 0.72;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    const teacherId = userData.user.id;

    const { data: teacherProfile } = await admin.from("profiles").select("role").eq("id", teacherId).maybeSingle();
    if (!teacherProfile || teacherProfile.role !== "teacher") return json({ error: "teacher_role_required" }, 403);

    let body: { studentId?: string; classId?: string } = {};
    try { body = await req.json(); } catch { /* handled below */ }
    if (!body.studentId) return json({ error: "student_id_required" }, 400);

    let classQuery = admin
      .from("class_memberships")
      .select("class_id, classes!inner(id, name, teacher_id)")
      .eq("student_id", body.studentId);
    if (body.classId) classQuery = classQuery.eq("class_id", body.classId);
    const { data: memberships, error: membershipError } = await classQuery;
    if (membershipError) return json({ error: "membership_query_failed" }, 500);
    const allowed = (memberships ?? []).some((m: any) => m.classes?.teacher_id === teacherId);
    if (!allowed) return json({ error: "student_not_in_teacher_class" }, 403);

    const { data: profile } = await admin.from("profiles").select("id, display_name, created_at").eq("id", body.studentId).single();
    if (!profile) return json({ error: "student_not_found" }, 404);

    const { data: skills } = await admin
      .from("skills")
      .select("id, code, name_hy, layer, sequence_order")
      .like("code", "PHY7-U01-S%")
      .order("sequence_order", { ascending: true });
    const skillRows = skills ?? [];
    const skillIds = skillRows.map((s) => s.id);

    const [{ data: masteryRows }, { data: attempts }, { data: sessions }] = await Promise.all([
      admin.from("student_skill_mastery").select("skill_id, mastery_score, evidence_count, status, last_attempt_at").eq("student_id", body.studentId).in("skill_id", skillIds),
      admin.from("attempts").select("id, skill_id, item_id, correct, score, hint_used, response_time_ms, error_code, created_at, items(code, prompt_hy)").eq("student_id", body.studentId).in("skill_id", skillIds).order("created_at", { ascending: false }).limit(50),
      admin.from("learning_sessions").select("id, mode, status, target_skill_id, planned_item_count, answered_count, correct_count, assessment_result, score_percent, started_at, completed_at").eq("student_id", body.studentId).eq("unit_code", UNIT_CODE).order("started_at", { ascending: false }).limit(30),
    ]);

    const masteryMap = new Map((masteryRows ?? []).map((m: any) => [m.skill_id, m]));
    const skillMap = skillRows.map((skill) => {
      const row: any = masteryMap.get(skill.id);
      const score = row ? Number(row.mastery_score) : null;
      const band = score === null ? "not_assessed" : score >= MASTERY_THRESHOLD ? "secure" : score < 0.45 ? "needs_support" : "developing";
      return {
        id: skill.id,
        code: skill.code,
        nameHy: skill.name_hy,
        layer: skill.layer,
        percent: score === null ? null : Math.round(score * 100),
        evidenceCount: row ? Number(row.evidence_count) : 0,
        status: row?.status ?? "not_assessed",
        band,
        lastAttemptAt: row?.last_attempt_at ?? null,
      };
    });

    const weakSkills = skillMap
      .filter((s) => s.band !== "secure")
      .sort((a, b) => {
        const rank = (v: string) => v === "needs_support" ? 0 : v === "not_assessed" ? 1 : 2;
        return rank(a.band) - rank(b.band) || (a.percent ?? -1) - (b.percent ?? -1) || a.code.localeCompare(b.code);
      });

    const sessionRows = sessions ?? [];
    const active = sessionRows.find((s: any) => s.status === "active") ?? null;
    const latestDiagnostic = sessionRows.find((s: any) => s.mode === "diagnostic" && s.status === "completed") ?? null;
    const latestMastery = sessionRows.find((s: any) => s.mode === "mastery_check" && s.status === "completed") ?? null;

    let intervention = { action: "monitor", code: null as string | null, messageHy: "Շարունակել վերահսկել առաջընթացը։" };
    if (latestMastery?.assessment_result === "passed") intervention = { action: "unit_complete", code: null, messageHy: "Բաժին I-ը ավարտված է։" };
    else if (active) intervention = { action: "finish_active_session", code: null, messageHy: "Ավարտել ընթացիկ ուսումնական սեսիան։" };
    else if (!(attempts ?? []).length) intervention = { action: "take_diagnostic", code: null, messageHy: "Անցկացնել Chapter I ախտորոշիչը։" };
    else if (weakSkills.length) intervention = { action: "practice_skill", code: weakSkills[0].code, messageHy: `Առաջնահերթ աշխատել ${weakSkills[0].code} հմտության վրա։` };
    else intervention = { action: "mastery_check", code: null, messageHy: "Անցկացնել Chapter I mastery check-ը։" };

    return json({
      student: {
        id: profile.id,
        displayName: profile.display_name?.trim() || `Ուսանող ${profile.id.slice(0, 6).toUpperCase()}`,
        memberOf: (memberships ?? []).filter((m: any) => m.classes?.teacher_id === teacherId).map((m: any) => ({ id: m.class_id, name: m.classes?.name })),
      },
      unitCode: UNIT_CODE,
      skills: skillMap,
      weakSkills: weakSkills.slice(0, 5),
      recommendation: intervention,
      latestDiagnostic: latestDiagnostic ? {
        correct: Number(latestDiagnostic.correct_count), answered: Number(latestDiagnostic.answered_count),
        percent: latestDiagnostic.answered_count ? Math.round(Number(latestDiagnostic.correct_count) / Number(latestDiagnostic.answered_count) * 100) : 0,
        completedAt: latestDiagnostic.completed_at,
      } : null,
      latestMasteryCheck: latestMastery ? {
        result: latestMastery.assessment_result,
        percent: latestMastery.score_percent === null ? null : Number(latestMastery.score_percent),
        completedAt: latestMastery.completed_at,
      } : null,
      activeSession: active,
      recentAttempts: (attempts ?? []).slice(0, 20).map((a: any) => ({
        id: a.id,
        skillId: a.skill_id,
        itemCode: a.items?.code ?? null,
        promptHy: a.items?.prompt_hy ?? null,
        correct: a.correct,
        score: Number(a.score),
        hintUsed: Boolean(a.hint_used),
        responseTimeMs: a.response_time_ms,
        errorCode: a.error_code,
        createdAt: a.created_at,
      })),
      sessions: sessionRows.slice(0, 12).map((s: any) => ({
        id: s.id, mode: s.mode, status: s.status, answered: Number(s.answered_count), planned: Number(s.planned_item_count),
        correct: Number(s.correct_count), assessmentResult: s.assessment_result, scorePercent: s.score_percent === null ? null : Number(s.score_percent),
        startedAt: s.started_at, completedAt: s.completed_at,
      })),
    });
  } catch (err) {
    console.error("get-teacher-student", err);
    return json({ error: "teacher_student_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
