import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const code = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
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
    const token = header.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "unauthorized" }, 401);
    const actor = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actor)))
      return json({ error: "account_or_session_inactive" }, 403);
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role, account_status").eq("id", actor).maybeSingle();
    if (profileError || profile?.role !== "admin" || profile.account_status !== "active")
      return json({ error: "school_bootstrap_unavailable" }, 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const schoolCode = typeof body.schoolCode === "string" ? body.schoolCode.trim() : "";
    const email = typeof body.firstAdminEmail === "string" ? body.firstAdminEmail.trim() : null;
    if (name.length < 3 || name.length > 160 || !code.test(schoolCode) ||
        (body.firstAdminId != null && email != null) ||
        (body.firstAdminId == null && (!email || email.length > 320)) ||
        (body.firstAdminId != null && (typeof body.firstAdminId !== "string" || !uuid.test(body.firstAdminId))))
      return json({ error: "invalid_school_bootstrap_request" }, 400);
    let recipient = body.firstAdminId;
    if (email) {
      const { data, error } = await admin.rpc("service_lookup_invitee_by_email_14b", {
        p_email: email, p_role: "student",
      });
      if (error || !data) return json({ error: "school_bootstrap_unavailable" }, 403);
      recipient = data;
    }
    const { data, error } = await admin.rpc("service_bootstrap_school_14b", {
      p_actor: actor, p_first_admin: recipient, p_name: name, p_code: schoolCode,
    });
    if (error || !data) return json({ error: "school_bootstrap_unavailable" }, 403);
    return json(data, 201);
  } catch (error) {
    console.error("bootstrap-school", error);
    return json({ error: "school_bootstrap_failed" }, 500);
  }
});
