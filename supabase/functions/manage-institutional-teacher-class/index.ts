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
    if (profile?.role !== "teacher" || profile.account_status !== "active")
      return json({ error: "teacher_role_required" }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (body.action === "create") {
      if (typeof body.membershipId !== "string" || !uuid.test(body.membershipId) ||
        typeof body.academicYearId !== "string" || !uuid.test(body.academicYearId) ||
        typeof body.subjectProgramId !== "string" || !uuid.test(body.subjectProgramId) ||
        typeof body.name !== "string" || body.name.trim().length < 2 ||
        body.name.trim().length > 120)
        return json({ error: "invalid_class_request" }, 400);
      const { data: classId, error } = await admin.rpc("service_create_teacher_class_14b", {
        p_actor: actor, p_membership: body.membershipId,
        p_year: body.academicYearId, p_program: body.subjectProgramId, p_name: body.name,
      });
      if (error) {
        if (error.message.includes("school_year_unavailable")) return json({ error: "school_year_unavailable" }, 403);
        if (error.message.includes("subject_program_unavailable")) return json({ error: "subject_program_unavailable" }, 403);
        if (error.message.includes("teacher_subject_unavailable")) return json({ error: "teacher_subject_unavailable" }, 403);
        if (error.message.includes("teacher_class_unavailable")) return json({ error: "teacher_class_unavailable" }, 403);
        return json({ error: "teacher_class_create_failed" }, 500);
      }
      return json({ classId });
    }
    if (body.action === "rename" &&
      typeof body.classId === "string" && uuid.test(body.classId) &&
      typeof body.name === "string") {
      const name = body.name.trim();
      if (name.length < 2) return json({ error: "class_name_too_short" }, 400);
      if (name.length > 120) return json({ error: "class_name_too_long" }, 400);
      const { data: renamed, error } = await admin.rpc("service_rename_teacher_class_14b", {
        p_actor: actor, p_class: body.classId, p_name: name,
      });
      if (error) {
        if (error.message.includes("teacher_class_unavailable"))
          return json({ error: "teacher_class_unavailable" }, 403);
        return json({ error: "teacher_class_rename_failed" }, 500);
      }
      return json({ name: renamed });
    }
    if ((body.action === "archive" || body.action === "activate") &&
      typeof body.classId === "string" && uuid.test(body.classId)) {
      const { data: updated, error } = await admin.rpc("service_set_teacher_class_active_14b", {
        p_actor: actor, p_class: body.classId, p_active: body.action === "activate",
      });
      if (error) {
        if (error.message.includes("school_year_unavailable") ||
          error.message.includes("teacher_subject_unavailable"))
          return json({ error: "class_cannot_activate" }, 403);
        if (error.message.includes("teacher_class_unavailable"))
          return json({ error: "teacher_class_unavailable" }, 403);
        return json({ error: "teacher_class_update_failed" }, 500);
      }
      return json({ updated });
    }
    return json({ error: "invalid_class_request" }, 400);
  } catch (error) {
    console.error("manage-institutional-teacher-class", error);
    return json({ error: "institutional_class_request_failed" }, 500);
  }
});
