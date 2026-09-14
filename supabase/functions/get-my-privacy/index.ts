import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const userId = userData.user.id;
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, display_name, account_status, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profile) return json({ error: "profile_not_found" }, 404);

    const { data: preferences } = await admin
      .from("privacy_preferences")
      .select("product_analytics_opt_in, research_use_opt_in, policy_version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: deletionRequest } = await admin
      .from("account_deletion_requests")
      .select("id, status, requested_at, resolved_at, resolution_code")
      .or(`user_id.eq.${userId},requester_user_id.eq.${userId}`)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [membership, attempts, sessions, mastery, remediation] = await Promise.all([
      admin.from("class_memberships").select("class_id", { count: "exact", head: true }).eq("student_id", userId),
      admin.from("attempts").select("id", { count: "exact", head: true }).eq("student_id", userId),
      admin.from("learning_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId),
      admin.from("student_skill_mastery").select("skill_id", { count: "exact", head: true }).eq("student_id", userId),
      admin.from("remediation_events").select("id", { count: "exact", head: true }).eq("student_id", userId),
    ]);

    return json({
      account: {
        id: userId,
        email: userData.user.email ?? null,
        role: profile.role,
        displayName: profile.display_name ?? null,
        status: profile.account_status,
        createdAt: profile.created_at,
      },
      preferences: preferences ?? {
        product_analytics_opt_in: false,
        research_use_opt_in: false,
        policy_version: "pilot-v1",
        updated_at: null,
      },
      latestDeletionRequest: deletionRequest ?? null,
      dataInventory: {
        classMemberships: membership.count ?? 0,
        attempts: attempts.count ?? 0,
        learningSessions: sessions.count ?? 0,
        masteryRows: mastery.count ?? 0,
        remediationEvents: remediation.count ?? 0,
      },
      minimization: {
        storedInProfile: ["role", "optional display name", "account status"],
        notCollectedByPlatformProfile: ["date of birth", "home address", "phone number", "parent email", "government ID"],
        accountEmailLocation: "Supabase Auth",
      },
    });
  } catch (err) {
    console.error("get-my-privacy", err);
    return json({ error: "privacy_dashboard_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
