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

function renderTemplate(
  value: string,
  allowedKeys: string[],
  params: Record<string, unknown>,
): string {
  const allowed = new Set(allowedKeys);
  return value.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, key: string) => {
    if (!allowed.has(key)) return match;
    const raw = params[key];
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      return String(raw);
    }
    return match;
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
      .select("id, session_id, skill_id, item_id, attempt_id, answered_at, correct, hint_level_used, ordinal")
      .eq("id", body.sessionItemId)
      .eq("session_id", session.id)
      .single();
    sessionItem = data;
  } else {
    const { data: pendingRows } = await admin
      .from("learning_session_items")
      .select("id, session_id, skill_id, item_id, attempt_id, answered_at, correct, hint_level_used, ordinal")
      .eq("session_id", session.id)
      .is("answered_at", null)
      .order("ordinal", { ascending: true })
      .limit(1);
    sessionItem = pendingRows?.[0] ?? null;

    if (!sessionItem) {
      const { data: answeredRows } = await admin
        .from("learning_session_items")
        .select("id, session_id, skill_id, item_id, attempt_id, answered_at, correct, hint_level_used, ordinal")
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

  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id, item_template_id, variant_parameters")
    .eq("id", sessionItem.item_id)
    .single();
  if (itemError || !item) return json({ error: "item_not_found" }, 404);

  let errorCode: string | null = null;
  if (postAnswer && sessionItem.attempt_id) {
    const { data: attempt } = await admin
      .from("attempts")
      .select("error_code")
      .eq("id", sessionItem.attempt_id)
      .maybeSingle();
    errorCode = typeof attempt?.error_code === "string" ? attempt.error_code : null;
  }

  const { data: templateGuides, error: templateGuideError } = await admin
    .from("item_template_remediation_guides")
    .select("id, trigger_error_code, guide_version, title_hy, strategy_hy, hint_1_hy, hint_2_hy, worked_example_hy, allowed_parameter_keys")
    .eq("item_template_id", item.item_template_id)
    .eq("status", "published");
  if (templateGuideError) {
    console.error("template remediation guide lookup failed", templateGuideError);
  }

  const templateGuide = (templateGuides ?? []).find((g: any) =>
    postAnswer && errorCode && g.trigger_error_code === errorCode
  ) ?? (templateGuides ?? []).find((g: any) => g.trigger_error_code === null);

  let guide: any = templateGuide ?? null;
  let guideScope: "template" | "skill" = "template";
  let guideVersion = templateGuide ? Number(templateGuide.guide_version) : 1;

  if (!guide) {
    const { data: skillGuide, error: skillGuideError } = await admin
      .from("skill_remediation_guides")
      .select("id, guide_version, misconception_code, title_hy, strategy_hy, hint_1_hy, hint_2_hy, worked_example_hy")
      .eq("skill_id", sessionItem.skill_id)
      .eq("status", "published")
      .limit(1)
      .maybeSingle();
    if (skillGuideError || !skillGuide) return json({ error: "remediation_guide_missing" }, 404);
    guide = skillGuide;
    guideScope = "skill";
    guideVersion = Number(skillGuide.guide_version);
  }

  const params = item.variant_parameters && typeof item.variant_parameters === "object"
    ? item.variant_parameters as Record<string, unknown>
    : {};
  const allowedKeys = guideScope === "template" && Array.isArray(guide.allowed_parameter_keys)
    ? guide.allowed_parameter_keys.map(String)
    : [];
  const render = (value: string) => guideScope === "template"
    ? renderTemplate(String(value ?? ""), allowedKeys, params)
    : String(value ?? "");

  const nextLevel = Math.min(3, Number(sessionItem.hint_level_used ?? 0) + 1);
  const stage = nextLevel === 1 ? "hint_1" : nextLevel === 2 ? "hint_2" : "worked_example";
  const contentHy = nextLevel === 1
    ? render(guide.hint_1_hy)
    : nextLevel === 2
      ? render(guide.hint_2_hy)
      : render(guide.worked_example_hy);

  const { error: updateError } = await admin
    .from("learning_session_items")
    .update({ hint_level_used: nextLevel })
    .eq("id", sessionItem.id);
  if (updateError) return json({ error: "hint_state_update_failed" }, 500);

  const renderedTitleHy = render(guide.title_hy);
  const renderedStrategyHy = render(guide.strategy_hy);

  await admin.from("remediation_events").insert({
    student_id: studentId,
    session_id: session.id,
    session_item_id: sessionItem.id,
    skill_id: sessionItem.skill_id,
    item_id: sessionItem.item_id,
    stage,
    context: postAnswer ? "post_error" : "pre_answer",
    hint_level: nextLevel,
    guide_scope: guideScope,
    guide_source_id: guide.id,
    guide_version: guideVersion,
    item_template_id: item.item_template_id,
    error_code: errorCode,
    rendered_title_hy: renderedTitleHy,
    rendered_strategy_hy: renderedStrategyHy,
    rendered_content_hy: contentHy,
    metadata: {
      taskSpecific: guideScope === "template",
      triggerErrorCode: guide.trigger_error_code ?? null,
    },
  });

  return json({
    stage,
    level: nextLevel,
    titleHy: renderedTitleHy,
    strategyHy: renderedStrategyHy,
    contentHy,
    misconceptionCode: guide.misconception_code ?? null,
    guideScope,
    guideVersion,
    taskSpecific: guideScope === "template",
    errorCode,
    moreHelpAvailable: nextLevel < 3,
    postAnswer,
    noteHy: postAnswer
      ? "Այս բացատրությունը տրվում է սխալ պատասխանից հետո։ Հաջորդ հարցը կլինի հարմարեցված, որպեսզի կարողանաք նորից փորձել նույն հմտությունը այլ ձևով։"
      : "Օգնության օգտագործումը գրանցվում է, և mastery-ն ավելի ուշ պետք է հաստատվի նաև ինքնուրույն պատասխաններով։",
  });
});
