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

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile || !["admin", "content_admin"].includes(String(profile.role))) {
      return json({ error: "content_admin_required" }, 403);
    }

    let body: { unitCode?: unknown } | null = null;
    try { body = await req.json(); } catch { return json({ error: "invalid_unit_code" }, 400); }
    const unitCode = typeof body?.unitCode === "string" ? body.unitCode.trim() : "";
    if (!/^[A-Z0-9-]{3,40}$/.test(unitCode)) return json({ error: "invalid_unit_code" }, 400);

    const { data, error } = await admin.rpc("service_get_pilot_item_analytics", {
      p_unit_code: unitCode,
    });
    if (error) return json({ error: "pilot_analytics_failed", detail: error.message }, 500);
    if (!data) return json({ error: "pilot_analytics_unavailable" }, 404);

    return json({ analytics: data });
  } catch (err) {
    console.error("get-pilot-item-analytics", err);
    return json({
      error: "pilot_analytics_failed",
      detail: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});
