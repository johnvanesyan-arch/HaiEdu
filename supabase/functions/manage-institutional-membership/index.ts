import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reasons = ["withdrawn", "transfer", "year_end", "role_change", "administrative"];
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
      .select("account_status").eq("id", actor).maybeSingle();
    if (profileError || profile?.account_status !== "active")
      return json({ error: "account_or_session_inactive" }, 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const method = body.action === "end_enrollment"
      ? "service_end_institutional_enrollment_14b"
      : body.action === "end_membership" ? "service_end_institutional_membership_14b" : null;
    const id = method?.includes("enrollment") ? body.enrollmentId : body.membershipId;
    if (!method || typeof id !== "string" || !uuid.test(id) || !reasons.includes(String(body.reason)))
      return json({ error: "invalid_termination_request" }, 400);
    const { data, error } = await admin.rpc(method, {
      p_actor: actor, ...(method.includes("enrollment") ? { p_enrollment: id } : { p_membership: id }),
      p_reason: body.reason,
    });
    if (error) { console.error("institutional_termination_rpc", error); return json({ error: "termination_failed" }, 500); }
    if (data !== true) return json({ error: "termination_unavailable" }, 403);
    return json({ ended: true });
  } catch (error) {
    console.error("manage-institutional-membership", error);
    return json({ error: "termination_failed" }, 500);
  }
});
