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

    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = header.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "unauthorized" }, 401);
    const actor = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actor))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role,account_status").eq("id", actor).maybeSingle();
    if (profileError || profile?.role !== "teacher" || profile.account_status !== "active") {
      return json({ error: "student_invitation_unavailable" }, 403);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const schoolId = String(body.schoolId ?? "");
    const classId = String(body.classId ?? "");
    const assignmentId = String(body.assignmentId ?? "");
    if (!uuid.test(schoolId) || !uuid.test(classId) || !uuid.test(assignmentId)) {
      return json({ error: "invalid_student_invitation_scope" }, 400);
    }
    const { data: allowed, error: allowedError } = await admin.rpc(
      "service_authorize_student_invite_14c",
      {
        p_actor: actor, p_school: schoolId, p_class: classId,
        p_assignment: assignmentId,
      },
    );
    if (allowedError || allowed !== true) {
      return json({ error: "student_invitation_unavailable" }, 403);
    }

    if (body.action === "list") {
      const { data: rows, error } = await admin.from("institutional_invitations")
        .select("id,recipient_user_id,created_at,expires_at")
        .eq("issued_by", actor).eq("school_id", schoolId).eq("class_id", classId)
        .eq("teacher_assignment_id", assignmentId).eq("invited_role", "student")
        .is("used_at", null).is("revoked_at", null)
        .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false });
      if (error) return json({ error: "student_invitation_unavailable" }, 503);
      const invitations = await Promise.all((rows ?? []).map(async (row: any) => {
        const { data } = await admin.auth.admin.getUserById(row.recipient_user_id);
        return {
          id: row.id,
          email: data.user?.email ?? null,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        };
      }));
      return json({ invitations });
    }

    if (body.action === "revoke") {
      const invitationId = String(body.invitationId ?? "");
      if (!uuid.test(invitationId)) return json({ error: "invalid_invitation" }, 400);
      const { data: invitation, error: lookupError } = await admin.from("institutional_invitations")
        .select("id").eq("id", invitationId).eq("issued_by", actor)
        .eq("school_id", schoolId).eq("class_id", classId)
        .eq("teacher_assignment_id", assignmentId).eq("invited_role", "student")
        .is("used_at", null).is("revoked_at", null).maybeSingle();
      if (lookupError || !invitation) {
        return json({ error: "student_invitation_unavailable" }, 403);
      }
      const { data: revoked, error } = await admin.rpc(
        "service_revoke_institutional_invitation_14b",
        { p_actor: actor, p_invitation: invitationId },
      );
      if (error || revoked !== true) {
        return json({ error: "student_invitation_unavailable" }, 403);
      }
      return json({ revoked: true });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    console.error("manage-student-invitation", error instanceof Error ? error.message : "failed");
    return json({ error: "student_invitation_failed" }, 500);
  }
});
