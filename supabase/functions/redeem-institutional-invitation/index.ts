import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const tokenPattern = /^[0-9a-f]{64}$/i;
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const header = req.headers.get("Authorization");
    if (!url || !key) return json({ error: "server_not_configured" }, 500);
    if (!header) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const bearer = header.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(bearer);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const recipientId = userData.user.id;
    if (!(await hasActiveLiveSession(admin, bearer, recipientId))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("account_status").eq("id", recipientId).maybeSingle();
    if (profileError || profile?.account_status !== "active") {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (typeof body?.token !== "string" || !tokenPattern.test(body.token)) {
      return json({ error: "invalid_invitation_token" }, 400);
    }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(body.token.toLowerCase()),
    )), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data, error } = await admin.rpc("service_redeem_institutional_invitation_14b", {
      p_recipient: recipientId, p_token_digest: digest,
    });
    if (error || !data) return json({ error: "invitation_unavailable" }, 403);
    return json({ redeemed: true, schoolId: data.schoolId,
      membershipId: data.membershipId, classEnrollmentId: data.classEnrollmentId });
  } catch (error) {
    console.error("redeem-institutional-invitation", error);
    return json({ error: "invitation_redeem_failed" }, 500);
  }
});
