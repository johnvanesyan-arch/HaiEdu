import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
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
    const recipient = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, recipient)))
      return json({ error: "account_or_session_inactive" }, 403);
    const { data, error } = await admin.rpc('service_accept_staff_invite_14b', {
      p_recipient: recipient,
    });
    if (error || !data) return json({ error: "staff_invitation_unavailable" }, 403);
    return json({ activated: true, ...data });
  } catch (error) {
    console.error("accept-staff-account", error);
    return json({ error: "staff_invitation_failed" }, 500);
  }
});
