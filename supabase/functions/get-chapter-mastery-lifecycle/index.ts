import { resolveCurriculumBlueprint } from "../_shared/curriculum-release.ts";
import { routeGovernedLearning } from "../_shared/governed-learning-runtime.mjs";
import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UNIT_CODE = "PHY7-U01";

async function resolveCurriculumRelease(admin: any) {
  return (await resolveCurriculumBlueprint(admin, UNIT_CODE, "mastery_check")).releaseId;
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
  const governed = await routeGovernedLearning({ admin, studentId: userData.user.id, token, request: req, operation: "lifecycle" });
  if (governed) return json(governed.body, governed.status);
  // Registered legacy-physics7-u01-v1 adapter; governed requests never enter it.
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
