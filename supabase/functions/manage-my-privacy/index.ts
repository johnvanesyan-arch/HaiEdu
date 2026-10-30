import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control":"no-store" } });
}

async function audit(admin: any, actorId: string, actorRole: string, action: string, details: Record<string, unknown> = {}) {
  const { error } = await admin.from("security_audit_log").insert({
    actor_user_id: actorId,
    actor_role: actorRole,
    action,
    outcome: "success",
    target_user_id: actorId,
    target_type: "user",
    details,
  });
  if (error) console.error("audit_write_failed", error.message);
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

    const userId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("role, account_status").eq("id", userId).maybeSingle();
    if (!profile) return json({ error: "profile_not_found" }, 404);
    if (["suspended", "archived"].includes(profile.account_status)) return json({ error: "account_suspended" }, 403);

    let body: any = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const action = String(body.action ?? "");

    if (profile.account_status === "deletion_pending" && action !== "cancel_deletion") {
      return json({ error: "deletion_pending_cancel_or_wait" }, 409);
    }

    if (action === "save_preferences") {
      const productAnalytics = body.productAnalytics === true;
      const researchUse = body.researchUse === true;
      const { data, error } = await admin.from("privacy_preferences").upsert({
        user_id: userId,
        product_analytics_opt_in: productAnalytics,
        research_use_opt_in: researchUse,
        policy_version: "pilot-v1",
        updated_at: new Date().toISOString(),
      }).select("product_analytics_opt_in, research_use_opt_in, policy_version, updated_at").single();
      if (error) return json({ error: "preferences_save_failed", detail: error.message }, 500);
      await audit(admin, userId, String(profile.role), "privacy.preferences_updated", {
        productAnalyticsOptIn: productAnalytics,
        researchUseOptIn: researchUse,
      });
      return json({ preferences: data });
    }

    if (action === "update_display_name") {
      const displayName = String(body.displayName ?? "").trim();
      if (displayName.length > 80) return json({ error: "display_name_too_long" }, 400);
      const { data, error } = await admin.from("profiles").update({
        display_name: displayName || null,
        updated_at: new Date().toISOString(),
      }).eq("id", userId).select("display_name").single();
      if (error) return json({ error: "display_name_update_failed", detail: error.message }, 500);
      await audit(admin, userId, String(profile.role), "profile.display_name_updated", { hasDisplayName: Boolean(displayName) });
      return json({ profile: data });
    }

    if (action === "request_deletion") {
      const { data: existing } = await admin.from("account_deletion_requests")
        .select("id, status, requested_at")
        .eq("user_id", userId)
        .in("status", ["pending", "processing"])
        .maybeSingle();
      if (existing) return json({ request: existing, alreadyPending: true });

      const { data, error } = await admin.from("account_deletion_requests").insert({
        user_id: userId,
        auth_user_id: userId,
        requester_user_id: userId,
        status: "pending",
      }).select("id, status, requested_at").single();
      if (error) return json({ error: "deletion_request_failed", detail: error.message }, 500);
      await audit(admin, userId, String(profile.role), "privacy.deletion_requested", { requestId: data.id });
      return json({ request: data });
    }

    if (action === "cancel_deletion") {
      const { data: openRequest } = await admin.from("account_deletion_requests")
        .select("id, status, resolution_code, execution_started_at")
        .eq("user_id", userId)
        .in("status", ["pending", "processing"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if(openRequest?.execution_started_at)return json({error:"deletion_execution_started"},409);
      if (!openRequest) return json({ error: "no_cancellable_deletion_request" }, 409);
      if (openRequest.resolution_code === "admin_archived_account") return json({ error: "archived_account_admin_review_required" }, 403);

      const { data, error } = await admin.from("account_deletion_requests").update({
        status: "cancelled",
        resolved_at: new Date().toISOString(),
        resolution_code: "cancelled_by_user",
        auth_user_id: null,
      }).eq("id", openRequest.id).select("id, status, resolved_at, resolution_code").single();
      if (error) return json({ error: String(error.message).includes("deletion_execution_started")?"deletion_execution_started":"deletion_cancel_failed" }, String(error.message).includes("deletion_execution_started")?409:500);

      if (profile.account_status === "deletion_pending") {
        await admin.from("profiles").update({
          account_status: "active",
          status_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", userId).eq("account_status", "deletion_pending");
      }

      await audit(admin, userId, String(profile.role), "privacy.deletion_cancelled", {
        requestId: openRequest.id,
        previousRequestStatus: openRequest.status,
      });
      return json({ request: data, accountStatus: "active" });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("manage-my-privacy", err);
    return json({ error: "manage_privacy_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
