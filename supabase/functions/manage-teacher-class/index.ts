import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function generateJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
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
    const teacherId = userData.user.id;

    const { data: profile } = await admin.from("profiles").select("role").eq("id", teacherId).maybeSingle();
    if (!profile || profile.role !== "teacher") return json({ error: "teacher_role_required" }, 403);

    // Legacy join codes have no school identity. An institutional teacher may
    // never create or administer one, even after their school membership ends.
    const { data: schoolMemberships, error: membershipError } = await admin
      .from("institutional_memberships").select("id")
      .eq("person_id", teacherId).eq("role", "teacher").limit(1);
    if (membershipError) return json({ error: "teacher_membership_check_failed" }, 503);
    if (schoolMemberships?.length) return json({ error: "institutional_class_flow_required" }, 403);

    let body: { action?: string; classId?: string; name?: string; academicYear?: string; studentId?: string } = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

    if (body.action === "create") {
      const name = String(body.name ?? "").trim();
      const academicYear = String(body.academicYear ?? "2026-2027").trim();
      if (!name) return json({ error: "class_name_required" }, 400);

      const [{ data: subject }, { data: grade }] = await Promise.all([
        admin.from("subjects").select("id").eq("code", "physics").single(),
        admin.from("grades").select("id").eq("grade_number", 7).single(),
      ]);
      if (!subject || !grade) return json({ error: "grade7_physics_not_configured" }, 500);

      for (let attempt = 0; attempt < 5; attempt++) {
        const joinCode = generateJoinCode();
        const { data: created, error } = await admin.from("classes").insert({
          teacher_id: teacherId,
          subject_id: subject.id,
          grade_id: grade.id,
          name,
          academic_year: academicYear,
          join_code: joinCode,
          is_active: true,
        }).select("id, name, academic_year, join_code, is_active").single();
        if (!error && created) return json({ class: created });
        if (error?.code !== "23505") return json({ error: "class_create_failed", detail: error?.message }, 500);
      }
      return json({ error: "join_code_generation_failed" }, 500);
    }

    if (!body.classId) return json({ error: "class_id_required" }, 400);
    const { data: klass } = await admin.from("classes").select("id, teacher_id, school_id, name, join_code, is_active").eq("id", body.classId).maybeSingle();
    if (!klass || klass.teacher_id !== teacherId || klass.school_id !== null) return json({ error: "class_not_owned" }, 403);

    if (body.action === "rotate_join_code") {
      for (let attempt = 0; attempt < 5; attempt++) {
        const joinCode = generateJoinCode();
        const { data: updated, error } = await admin.from("classes").update({ join_code: joinCode }).eq("id", klass.id).select("id, join_code").single();
        if (!error && updated) return json({ class: updated });
        if (error?.code !== "23505") return json({ error: "join_code_rotate_failed" }, 500);
      }
      return json({ error: "join_code_generation_failed" }, 500);
    }

    if (body.action === "archive") {
      const { data: updated, error } = await admin.from("classes").update({ is_active: false }).eq("id", klass.id).select("id, is_active").single();
      if (error) return json({ error: "class_archive_failed" }, 500);
      return json({ class: updated });
    }

    if (body.action === "activate") {
      const { data: updated, error } = await admin.from("classes").update({ is_active: true }).eq("id", klass.id).select("id, is_active").single();
      if (error) return json({ error: "class_activate_failed" }, 500);
      return json({ class: updated });
    }

    if (body.action === "remove_student") {
      if (!body.studentId) return json({ error: "student_id_required" }, 400);
      const { error } = await admin.from("class_memberships").delete().eq("class_id", klass.id).eq("student_id", body.studentId);
      if (error) return json({ error: "student_remove_failed" }, 500);
      return json({ removed: true, studentId: body.studentId });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("manage-teacher-class", err);
    return json({ error: "manage_teacher_class_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
