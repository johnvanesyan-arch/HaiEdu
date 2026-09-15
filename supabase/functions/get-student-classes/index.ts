import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }

    const studentId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("role").eq("id", studentId).maybeSingle();
    if (!profile || String(profile.role) !== "student") return json({ error: "student_role_required" }, 403);

    const { data: memberships, error: membershipError } = await admin
      .from("class_memberships")
      .select("class_id, joined_at")
      .eq("student_id", studentId)
      .order("joined_at", { ascending: false });

    if (membershipError) return json({ error: "class_memberships_unavailable" }, 500);
    if (!memberships?.length) return json({ classes: [] });

    const classIds = [...new Set(memberships.map((row) => row.class_id))];
    const { data: classes, error: classesError } = await admin
      .from("classes")
      .select("id, name, academic_year, is_active")
      .in("id", classIds)
      .eq("is_active", true);

    if (classesError) return json({ error: "classes_unavailable" }, 500);

    const byId = new Map((classes ?? []).map((klass) => [klass.id, klass]));
    const result = memberships
      .map((membership) => {
        const klass = byId.get(membership.class_id);
        if (!klass) return null;
        return {
          id: klass.id,
          name: klass.name,
          academicYear: klass.academic_year,
          joinedAt: membership.joined_at,
        };
      })
      .filter(Boolean);

    return json({ classes: result });
  } catch (err) {
    console.error("get-student-classes", err);
    return json({ error: "get_student_classes_failed" }, 500);
  }
});
