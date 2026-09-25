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
    const { data: profile } = await admin.from("profiles")
      .select("role,account_status").eq("id", actor).maybeSingle();
    if (profile?.role !== "school_admin" || profile.account_status !== "active")
      return json({ error: "school_admin_required" }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (typeof body.schoolId !== "string" || !uuid.test(body.schoolId))
      return json({ error: "invalid_school_id" }, 400);
    const { data: membership, error: membershipError } = await admin
      .from("institutional_memberships").select("id,valid_from,valid_to")
      .eq("school_id", body.schoolId).eq("person_id", actor).eq("role", "school_admin")
      .eq("status", "active");
    if (membershipError) return json({ error: "school_membership_unavailable" }, 503);
    const now = Date.now();
    if (!membership?.some((m) => Date.parse(m.valid_from) <= now &&
      (m.valid_to == null || Date.parse(m.valid_to) > now)))
      return json({ error: "school_unavailable" }, 403);

    if (body.action === "list") {
      const { data, error } = await admin.from("academic_years")
        .select("id,label,starts_on,ends_on,status")
        .eq("school_id", body.schoolId).order("starts_on", { ascending: false });
      if (error) return json({ error: "school_years_unavailable" }, 503);
      return json({ years: data ?? [] });
    }
    if (body.action !== "create" || typeof body.label !== "string" ||
      typeof body.startsOn !== "string" || typeof body.endsOn !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.startsOn) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.endsOn))
      return json({ error: "invalid_year_request" }, 400);
    const { data: yearId, error } = await admin.rpc("service_create_school_year_14b", {
      p_actor: actor, p_school: body.schoolId, p_label: body.label,
      p_starts: body.startsOn, p_ends: body.endsOn,
    });
    if (error) {
      if (error.message.includes("school_year_overlap")) return json({ error: "school_year_overlap" }, 409);
      if (error.message.includes("school_year_unavailable")) return json({ error: "school_year_unavailable" }, 403);
      return json({ error: "school_year_create_failed" }, 500);
    }
    return json({ yearId });
  } catch (error) {
    console.error("manage-school-academic-year", error);
    return json({ error: "school_year_request_failed" }, 500);
  }
});
