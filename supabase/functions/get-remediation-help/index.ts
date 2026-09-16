import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { hasPhysics7Access } from "../_shared/course-access.ts";

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
  if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
  const studentId = userData.user.id;

  if (!(await hasPhysics7Access(admin, studentId))) {
    return json({ error: "course_access_required", courseKey: "physics:7" }, 403);
  }

  let body: { sessionId?: string; sessionItemId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let session: any = null;
  if (body.sessionId) {
    const { data } = await admin
      .from("learning_sessions")
      .select("id, student_id, mode, status")
      .eq("id", body.sessionId)
      .eq("student_id", studentId)
      .single();
    session = data;
  } else {
    const { data: rows } = await admin
      .from("learning_sessions")
      .select("id, student_id, mode, status, started_at")
      .eq("student_id", studentId)
      .eq("mode", "practice")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1);
    session = rows?.[0] ?? null;
  }

  if (!session) return json({ error: "session_not_found" }, 404);
  if (session.status !== "active") return json({ error: "session_not_active" }, 409);
  if (session.mode !== "practice") return json({ error: "help_not_available_in_diagnostic" }, 409);

  let sessionItem: any = null;
  if (body.sessionItemId) {
    const { data } = await admin
      .from("learning_session_items")
      .select("id, session_id, skill_id, item_id, answered_at, correct, hint_level_used, ordinal")
      .eq("id", body.sessionItemId)
      .eq("session_id", session.id)
      .single();
    sessionItem = data;
  } else {
    const { data: pendingRows } = await admin
      .from("learning_session_items")
      .select("id, session_id, skill_id, item_id, answered_at, correct, hint_level_used, ordinal")
      .eq("session_id", session.id)
      .is("answered_at", null)
      .order("ordinal", { ascending: true })
      .limit(1);
    sessionItem = pendingRows?.[0] ?? null;

    if (!sessionItem) {
      const { data: answeredRows } = await admin
        .from("learning_session_items")
        .select("id, session_id, skill_id, item_id, answered_at, correct, hint_level_used, ordinal")
        .eq("session_id", session.id)
        .not("answered_at", "is", null)
        .order("ordinal", { ascending: false })
        .limit(1);
      sessionItem = answeredRows?.[0] ?? null;
    }
  }

  if (!sessionItem) return json({ error: "session_item_not_found" }, 404);
  const postAnswer = Boolean(sessionItem.answered_at);
  if (postAnswer && sessionItem.correct === true) {
    return json({ error: "help_not_needed_after_correct_answer" }, 409);
  }

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
    postAnswer,
    noteHy: postAnswer
      ? "Այս բացատրությունը տրվում է սխալ պատասխանից հետո։ Հաջորդ հարցը կլինի հարմարեցված, որպեսզի կարողանաք նորից փորձել նույն հմտությունը այլ ձևով։"
      : "Օգնության օգտագործումը գրանցվում է, և mastery-ն ավելի ուշ պետք է հաստատվի նաև ինքնուրույն պատասխաններով։",
  });
});
