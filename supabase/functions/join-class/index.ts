import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { getStudentCourseEntitlements } from "../_shared/course-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const digestJoinCode = async (value: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value),
  )),
  (byte) => byte.toString(16).padStart(2, "0"),
).join("");

function joinedResponse(entitlement: any, alreadyMember: boolean, institutional: boolean) {
  return {
    joined: true,
    alreadyMember,
    institutional,
    class: {
      id: entitlement.classId,
      name: entitlement.className,
      academicYear: entitlement.academicYear,
    },
    course: {
      subjectCode: entitlement.subjectCode,
      subjectNameHy: entitlement.subjectNameHy,
      gradeNumber: entitlement.gradeNumber,
      gradeLabelHy: entitlement.gradeLabelHy,
      courseKey: `${entitlement.subjectCode}:${entitlement.gradeNumber}`,
    },
  };
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

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);
    const studentId = userData.user.id;

    const { data: profile } = await admin.from("profiles")
      .select("role,account_status").eq("id", studentId).maybeSingle();
    if (!profile || String(profile.role) !== "student" || profile.account_status !== "active") {
      return json({ error: "student_role_required" }, 403);
    }

    let body: { joinCode?: string } = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const joinCode = String(body.joinCode ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(joinCode)) return json({ error: "join_code_required" }, 400);

    const codeDigest = await digestJoinCode(joinCode);
    const { data: institutionalJoin, error: institutionalError } = await admin.rpc(
      "service_redeem_institutional_join_code_14c",
      { p_recipient: studentId, p_code_digest: codeDigest },
    );
    if (institutionalError) {
      if (String(institutionalError.message).includes("institutional_join_code_unavailable")) {
        return json({ error: "invalid_or_inactive_join_code" }, 404);
      }
      return json({ error: "join_code_verification_failed" }, 503);
    }
    if (institutionalJoin?.classId) {
      const entitlements = await getStudentCourseEntitlements(admin, studentId);
      const entitlement = entitlements.find((course) =>
        course.classId === String(institutionalJoin.classId));
      if (!entitlement) {
        return json({
          error: "membership_verification_failed",
          classId: institutionalJoin.classId,
        }, 500);
      }
      return json(joinedResponse(
        entitlement, Boolean(institutionalJoin.alreadyEnrolled), true,
      ));
    }

    const { data: klass, error: classError } = await admin
      .from("classes")
      .select("id, school_id, name, academic_year, is_active, subject_id, grade_id")
      .eq("join_code", joinCode)
      .maybeSingle();
    if (classError || !klass || !klass.is_active || klass.school_id !== null) {
      return json({ error: "invalid_or_inactive_join_code" }, 404);
    }

    const { data: existing } = await admin
      .from("class_memberships")
      .select("class_id, student_id, joined_at")
      .eq("class_id", klass.id)
      .eq("student_id", studentId)
      .maybeSingle();

    const alreadyMember = Boolean(existing);
    if (!existing) {
      const { data: inserted, error: insertError } = await admin
        .from("class_memberships")
        .insert({ class_id: klass.id, student_id: studentId })
        .select("class_id, student_id, joined_at")
        .single();
      if (insertError || !inserted) {
        return json({ error: "join_failed", detail: insertError?.message ?? "membership_not_created" }, 500);
      }
    }

    const entitlements = await getStudentCourseEntitlements(admin, studentId);
    const entitlement = entitlements.find((course) => course.classId === String(klass.id));
    if (!entitlement) {
      return json({ error: "membership_verification_failed", classId: klass.id }, 500);
    }

    return json(joinedResponse(entitlement, alreadyMember, false));
  } catch (err) {
    console.error("join-class", err);
    return json({ error: "join_class_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
