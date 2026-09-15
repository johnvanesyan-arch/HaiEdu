import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

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
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }

    const teacherId = userData.user.id;
    const { data: profile } = await admin
      .from("profiles")
      .select("role, display_name")
      .eq("id", teacherId)
      .maybeSingle();
    if (!profile || !["teacher", "admin"].includes(String(profile.role))) {
      return json({ error: "teacher_role_required" }, 403);
    }

    let body: { displayName?: string } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const displayName = String(body.displayName ?? "").trim().replace(/\s+/g, " ");
    if (displayName.length < 2) return json({ error: "display_name_too_short" }, 400);
    if (displayName.length > 100) return json({ error: "display_name_too_long" }, 400);

    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", teacherId)
      .select("id, display_name, role")
      .single();
    if (updateError || !updated) return json({ error: "profile_update_failed" }, 500);

    return json({
      profile: {
        id: updated.id,
        displayName: updated.display_name,
        role: updated.role,
      },
    });
  } catch (err) {
    console.error("manage-teacher-profile", err);
    return json({ error: "manage_teacher_profile_failed" }, 500);
  }
});
