import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { getStudentCourseEntitlements } from "../_shared/course-access.ts";
import { verifiedSessionClaim } from "../_shared/governed-learning-runtime.mjs";

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

    const entitlements = await getStudentCourseEntitlements(admin, studentId);
    const classes = entitlements.map((course) => ({
      id: course.classId,
      name: course.className,
      academicYear: course.academicYear,
      joinedAt: course.joinedAt,
      subjectId: course.subjectId,
      subjectCode: course.subjectCode,
      subjectNameHy: course.subjectNameHy,
      gradeId: course.gradeId,
      gradeNumber: course.gradeNumber,
      gradeLabelHy: course.gradeLabelHy,
      courseKey: `${course.subjectCode}:${course.gradeNumber}`,
    }));

    const authSessionId = verifiedSessionClaim(token);
    if (!authSessionId) return json({ error: "account_or_session_inactive" }, 403);
    const { data: navigation, error: navigationError } = await admin.rpc("service_student_learning_navigation", {
      p_student_id: studentId, p_auth_session_id: authSessionId,
    });
    if (navigationError || !navigation) return json({ error: "learning_context_unavailable" }, 403);
    // Class labels do not grant course access. Exact, live, server-owned contexts
    // alone control released navigation; keep classes for existing join/roster UI.
    return json({ classes, ...navigation });
  } catch (err) {
    console.error("get-student-classes", err);
    return json({ error: "get_student_classes_failed" }, 500);
  }
});
