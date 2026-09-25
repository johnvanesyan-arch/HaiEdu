import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "unauthorized" }, 401);
    const actor = auth.user.id;
    if (!(await hasActiveLiveSession(admin, token, actor)))
      return json({ error: "account_or_session_inactive" }, 403);
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role,account_status").eq("id", actor).maybeSingle();
    if (profileError) return json({ error: "profile_unavailable" }, 503);
    if (profile?.role !== "school_admin" || profile.account_status !== "active")
      return json({ error: "school_admin_required" }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if ((body.action !== "archive" && body.action !== "restore")
      || typeof body.schoolId !== "string" || !uuid.test(body.schoolId)
      || typeof body.membershipId !== "string" || !uuid.test(body.membershipId))
      return json({ error: "invalid_teacher_request" }, 400);

    const archived = body.action === "archive";
    const { data, error } = await admin.rpc("service_set_school_teacher_archived_14b", {
      p_actor: actor, p_school: body.schoolId,
      p_membership: body.membershipId, p_archived: archived,
    });
    if (error) {
      if (error.message.includes("school_teacher_restore_unavailable"))
        return json({ error: "teacher_restore_unavailable" }, 409);
      if (error.message.includes("school_teacher_conflict"))
        return json({ error: "teacher_membership_conflict" }, 409);
      if (error.message.includes("school_teacher_unavailable"))
        return json({ error: "school_teacher_unavailable" }, 403);
      console.error("manage-school-teacher", error);
      return json({ error: "school_teacher_update_failed" }, 503);
    }
    return json({ updated: data === true, archived });
  } catch (error) {
    console.error("manage-school-teacher", error);
    return json({ error: "school_teacher_request_failed" }, 500);
  }
});
