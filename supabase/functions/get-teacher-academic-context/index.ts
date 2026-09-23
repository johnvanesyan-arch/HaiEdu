import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { AcademicContextDenied, resolveAuthorizedTeacherAcademicContext } from "../_shared/academic-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const teacherId = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, teacherId))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role, account_status").eq("id", teacherId).maybeSingle();
    if (profileError || !profile || profile.role !== "teacher" || profile.account_status !== "active") {
      return json({ error: "teacher_role_required" }, 403);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const selection = {
      assignmentId: body?.assignmentId,
      curriculumReleaseId: body?.curriculumReleaseId,
      unitId: body?.unitId,
    };
    if (!Object.values(selection).every((value) => typeof value === "string" && uuid.test(value))) {
      return json({ error: "invalid_academic_selection" }, 400);
    }
    try {
      const context = await resolveAuthorizedTeacherAcademicContext(admin, teacherId, selection as {
        assignmentId: string; curriculumReleaseId: string; unitId: string;
      });
      return json({ context });
    } catch (error) {
      if (error instanceof AcademicContextDenied) return json({ error: "academic_context_unavailable" }, 403);
      throw error;
    }
  } catch (error) {
    console.error("get-teacher-academic-context", error);
    return json({ error: "academic_context_lookup_failed" }, 500);
  }
});
