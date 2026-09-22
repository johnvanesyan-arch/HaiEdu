import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UNIT_CODE = "PHY7-U01";

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const value = JSON.parse(atob(padded));
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function hasActiveLiveSession(admin: any, token: string, userId: string) {
  const sessionId = parseJwtPayload(token)?.session_id;
  if (typeof sessionId !== "string") return false;
  const { data, error } = await admin.rpc("service_validate_active_session", {
    p_user_id: userId,
    p_session_id: sessionId,
  });
  return !error && data === true;
}

async function hasPhysics7Access(admin: any, studentId: string) {
  const { data: memberships, error: membershipError } = await admin
    .from("class_memberships")
    .select("class_id")
    .eq("student_id", studentId);
  if (membershipError || !memberships?.length) return false;

  const classIds = [...new Set(memberships.map((row: any) => String(row.class_id)))];
  const { data: classes, error: classesError } = await admin
    .from("classes")
    .select("subject_id, grade_id")
    .in("id", classIds)
    .eq("is_active", true);
  if (classesError || !classes?.length) return false;

  const subjectIds = [...new Set(classes.map((row: any) => String(row.subject_id)))];
  const gradeIds = [...new Set(classes.map((row: any) => String(row.grade_id)))];
  const [{ data: subjects, error: subjectsError }, { data: grades, error: gradesError }] = await Promise.all([
    admin.from("subjects").select("id").in("id", subjectIds).eq("code", "physics"),
    admin.from("grades").select("id").in("id", gradeIds).eq("grade_number", 7),
  ]);
  if (subjectsError || gradesError || !subjects?.length || !grades?.length) return false;
  const validSubjects = new Set(subjects.map((row: any) => String(row.id)));
  const validGrades = new Set(grades.map((row: any) => String(row.id)));
  return classes.some((row: any) => validSubjects.has(String(row.subject_id)) && validGrades.has(String(row.grade_id)));
}

async function resolveCurriculumRelease(admin: any) {
  const { data: releaseId, error: releaseError } = await admin.rpc("resolve_active_curriculum_release", {
    p_unit_code: UNIT_CODE,
  });
  if (releaseError || !releaseId) throw new Error("release_unavailable");
  const { data: blueprint, error: blueprintError } = await admin
    .from("assessment_blueprints")
    .select("id")
    .eq("curriculum_release_id", releaseId)
    .eq("purpose", "mastery_check")
    .in("status", ["pilot", "production"])
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (blueprintError || !blueprint) throw new Error("blueprint_unavailable");
  return String(releaseId);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  if (!(await hasPhysics7Access(admin, userData.user.id))) return json({ error: "course_access_required" }, 403);

  let curriculum;
  try {
    curriculum = { releaseId: await resolveCurriculumRelease(admin) };
  } catch {
    return json({ error: "curriculum_release_unavailable" }, 503);
  }

  const { data: state, error: stateError } = await admin
    .from("chapter_mastery_states")
    .select("id, lifecycle_state, attempts_used, passed_on_attempt, academic_mastery_policy_id")
    .eq("student_id", userData.user.id)
    .eq("curriculum_release_id", curriculum.releaseId)
    .eq("unit_code", UNIT_CODE)
    .maybeSingle();
  if (stateError) return json({ error: "mastery_lifecycle_unavailable" }, 500);
  if (!state) {
    return json({
      lifecycleState: null,
      masteryStatus: "in_progress",
      attemptsUsed: 0,
      attemptsRemaining: 3,
      nextAttemptNumber: 1,
      passedOnAttempt: null,
      reviewRequired: false,
      reviewAvailable: false,
      finalFailure: false,
    });
  }

  const { data: policy, error: policyError } = await admin
    .from("academic_mastery_policy_versions")
    .select("maximum_mastery_attempts")
    .eq("id", state.academic_mastery_policy_id)
    .single();
  if (policyError || !policy) return json({ error: "mastery_policy_unavailable" }, 503);

  const maximumAttempts = Number(policy.maximum_mastery_attempts);
  const attemptsUsed = Number(state.attempts_used);
  const lifecycleState = String(state.lifecycle_state);
  const reviewRequired = lifecycleState === "review_required_attempt_2" || lifecycleState === "review_required_attempt_3";
  const finalFailure = lifecycleState === "mastery_failed_final";
  const passed = lifecycleState === "mastery_passed";
  const nextAttemptNumber = lifecycleState === "mastery_ready" ? 1
    : lifecycleState === "mastery_retry_2_ready" ? 2
    : lifecycleState === "mastery_retry_3_ready" ? 3
    : null;

  return json({
    lifecycleState,
    masteryStatus: passed ? "passed" : finalFailure ? "not_demonstrated" : "in_progress",
    attemptsUsed,
    attemptsRemaining: Math.max(0, maximumAttempts - attemptsUsed),
    maximumAttempts,
    nextAttemptNumber,
    passedOnAttempt: state.passed_on_attempt == null ? null : Number(state.passed_on_attempt),
    reviewRequired,
    reviewAvailable: reviewRequired || passed || finalFailure,
    finalFailure,
  });
});
