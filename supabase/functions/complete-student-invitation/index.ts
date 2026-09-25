import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const tokenPattern = /^[0-9a-f]{64}$/i;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const header = req.headers.get("Authorization");
    if (!url || !key) return json({ error: "server_not_configured" }, 500);
    if (!header) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const bearer = header.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !userData.user) return json({ error: "unauthorized" }, 401);
    const recipient = userData.user.id;
    if (!(await hasActiveLiveSession(admin, bearer, recipient))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const token = typeof body.token === "string" ? body.token.toLowerCase() : "";
    const displayName = typeof body.displayName === "string"
      ? body.displayName.trim().replace(/\s+/g, " ") : "";
    if (!tokenPattern.test(token) || displayName.length < 2 || displayName.length > 80
        || body.acceptanceVersion !== "student-school-access-v1") {
      return json({ error: "invalid_student_invitation" }, 400);
    }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(token),
    )), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data, error } = await admin.rpc("service_accept_student_invitation_14c", {
      p_recipient: recipient, p_token_digest: digest,
      p_display_name: displayName, p_acceptance_version: body.acceptanceVersion,
    });
    if (error || !data) return json({ error: "student_invitation_unavailable" }, 403);
    return json({ completed: true, ...data });
  } catch (error) {
    console.error("complete-student-invitation", error);
    return json({ error: "student_invitation_failed" }, 500);
  }
});
