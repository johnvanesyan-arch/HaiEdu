import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedSurfaces = new Set([
  "home",
  "progress",
  "physics_course",
  "practice_auto_target",
  "practice_feedback",
  "diagnostic_result",
]);

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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  if (!(await hasActiveLiveSession(admin, token, userData.user.id))) {
    return json({ error: "account_or_session_inactive" }, 403);
  }
  const studentId = userData.user.id;

  let body: {
    recommendationInstanceId?: string;
    eventType?: "shown" | "followed";
    surface?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.recommendationInstanceId || !body.eventType || !body.surface) {
    return json({ error: "recommendationInstanceId_eventType_surface_required" }, 400);
  }
  if (!["shown", "followed"].includes(body.eventType)) {
    return json({ error: "invalid_event_type" }, 400);
  }
  if (!allowedSurfaces.has(body.surface)) {
    return json({ error: "invalid_surface" }, 400);
  }

  const { data: issued, error: issuedError } = await admin
    .from("recommendation_events")
    .select(
      "recommendation_instance_id, student_id, policy_scope, action, target_skill_id, curriculum_release_id, assessment_blueprint_id, learning_model_configuration_id, model_provenance_status, learning_session_id, attempt_id, state_snapshot, recommendation_snapshot",
    )
    .eq("recommendation_instance_id", body.recommendationInstanceId)
    .eq("student_id", studentId)
    .eq("event_type", "issued")
    .limit(1)
    .maybeSingle();

  if (issuedError || !issued) return json({ error: "recommendation_not_found" }, 404);

  const { error: insertError } = await admin.from("recommendation_events").insert({
    recommendation_instance_id: issued.recommendation_instance_id,
    student_id: studentId,
    event_type: body.eventType,
    policy_scope: issued.policy_scope,
    surface: body.surface,
    action: issued.action,
    target_skill_id: issued.target_skill_id,
    curriculum_release_id: issued.curriculum_release_id,
    assessment_blueprint_id: issued.assessment_blueprint_id,
    learning_model_configuration_id: issued.learning_model_configuration_id,
    model_provenance_status: issued.model_provenance_status,
    learning_session_id: issued.learning_session_id,
    attempt_id: issued.attempt_id,
    state_snapshot: issued.state_snapshot ?? {},
    recommendation_snapshot: issued.recommendation_snapshot ?? {},
  });

  if (insertError) {
    if ((insertError as any).code === "23505") {
      return json({ recorded: true, duplicate: true });
    }
    console.error("recommendation interaction insert failed", insertError);
    return json({ error: "recommendation_event_record_failed" }, 500);
  }

  return json({ recorded: true, duplicate: false });
});
