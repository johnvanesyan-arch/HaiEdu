import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const studentId = userData.user.id;

  let body: { sessionId?: string; sessionItemId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!body.sessionId || !body.sessionItemId) {
    return json({ error: "sessionId_and_sessionItemId_required" }, 400);
  }

  const { data: session, error: sessionError } = await admin
    .from("learning_sessions")
    .select("id, student_id, mode, status")
    .eq("id", body.sessionId)
    .eq("student_id", studentId)
    .single();
  if (sessionError || !session) return json({ error: "session_not_found" }, 404);
  if (session.status !== "active") return json({ error: "session_not_active" }, 409);
  if (session.mode !== "practice") return json({ error: "help_not_available_in_diagnostic" }, 409);

  const { data: sessionItem, error: itemError } = await admin
    .from("learning_session_items")
    .select("id, session_id, skill_id, item_id, answered_at, hint_level_used")
    .eq("id", body.sessionItemId)
    .eq("session_id", body.sessionId)
    .single();
  if (itemError || !sessionItem) return json({ error: "session_item_not_found" }, 404);
  if (sessionItem.answered_at) return json({ error: "question_already_answered" }, 409);

  const { data: guide, error: guideError } = await admin
    .from("skill_remediation_guides")
    .select("misconception_code, title_hy, strategy_hy, hint_1_hy, hint_2_hy, worked_example_hy")
    .eq("skill_id", sessionItem.skill_id)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (guideError || !guide) return json({ error: "remediation_guide_missing" }, 404);

  const nextLevel = Math.min(3, Number(sessionItem.hint_level_used ?? 0) + 1);
  const stage = nextLevel === 1 ? "hint_1" : nextLevel === 2 ? "hint_2" : "worked_example";
  const contentHy = nextLevel === 1
    ? guide.hint_1_hy
    : nextLevel === 2
      ? guide.hint_2_hy
      : guide.worked_example_hy;

  const { error: updateError } = await admin
    .from("learning_session_items")
    .update({ hint_level_used: nextLevel })
    .eq("id", sessionItem.id);
  if (updateError) return json({ error: "hint_state_update_failed" }, 500);

  await admin.from("remediation_events").insert({
    student_id: studentId,
    session_id: session.id,
    session_item_id: sessionItem.id,
    skill_id: sessionItem.skill_id,
    item_id: sessionItem.item_id,
    stage,
  });

  return json({
    stage,
    level: nextLevel,
    titleHy: guide.title_hy,
    strategyHy: guide.strategy_hy,
    contentHy,
    misconceptionCode: guide.misconception_code,
    moreHelpAvailable: nextLevel < 3,
    noteHy: "Օգնության օգտագործումը գրանցվում է, և mastery-ն ավելի ուշ պետք է հաստատվի նաև ինքնուրույն պատասխաններով։",
  });
});
