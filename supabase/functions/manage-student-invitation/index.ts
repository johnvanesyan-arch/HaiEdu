import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

const generateJoinCode = () => Array.from(
  crypto.getRandomValues(new Uint8Array(8)),
  (byte) => codeAlphabet[byte % codeAlphabet.length],
).join("");

const digestJoinCode = async (value: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value),
  )),
  (byte) => byte.toString(16).padStart(2, "0"),
).join("");

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
      const now = new Date().toISOString();
      const [invitationResult, codeResult] = await Promise.all([
        admin.from("institutional_invitations")
          .select("id,recipient_user_id,created_at,expires_at")
          .eq("issued_by", actor).eq("school_id", schoolId).eq("class_id", classId)
          .eq("teacher_assignment_id", assignmentId).eq("invited_role", "student")
          .is("used_at", null).is("revoked_at", null)
          .gt("expires_at", now).order("created_at", { ascending: false }),
        admin.from("institutional_join_codes")
          .select("id,created_at,expires_at")
          .eq("issued_by", actor).eq("school_id", schoolId).eq("class_id", classId)
          .eq("teacher_assignment_id", assignmentId)
          .is("used_at", null).is("revoked_at", null)
          .gt("expires_at", now).order("created_at", { ascending: false }),
      ]);
      if (invitationResult.error || codeResult.error) {
        return json({ error: "student_invitation_unavailable" }, 503);
      }
      const invitations = await Promise.all((invitationResult.data ?? []).map(async (row: any) => {
        const { data } = await admin.auth.admin.getUserById(row.recipient_user_id);
        return {
          id: row.id,
          email: data.user?.email ?? null,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        };
      }));
      const joinCodes = (codeResult.data ?? []).map((row: any) => ({
        id: row.id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
      return json({ invitations, joinCodes });
    }

    if (body.action === "create_code") {
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const joinCode = generateJoinCode();
        const digest = await digestJoinCode(joinCode);
        const { data: codeId, error } = await admin.rpc(
          "service_issue_institutional_join_code_14c",
          {
            p_actor: actor, p_school: schoolId, p_class: classId,
            p_assignment: assignmentId, p_code_digest: digest,
            p_expires_at: expiresAt,
          },
        );
        if (!error && codeId) {
          return json({ codeId, joinCode, expiresAt }, 201);
        }
        if (error?.code !== "23505") {
          return json({ error: "student_join_code_unavailable" }, 403);
        }
      }
      return json({ error: "student_join_code_generation_failed" }, 500);
    }

    if (body.action === "revoke_code") {
      const codeId = String(body.codeId ?? "");
      if (!uuid.test(codeId)) return json({ error: "invalid_join_code" }, 400);
      const { data: code, error: lookupError } = await admin.from("institutional_join_codes")
        .select("id").eq("id", codeId).eq("issued_by", actor)
        .eq("school_id", schoolId).eq("class_id", classId)
        .eq("teacher_assignment_id", assignmentId)
        .is("used_at", null).is("revoked_at", null).maybeSingle();
      if (lookupError || !code) return json({ error: "student_join_code_unavailable" }, 403);
      const { data: revoked, error } = await admin.rpc(
        "service_revoke_institutional_join_code_14c",
        { p_actor: actor, p_code: codeId },
      );
      if (error || revoked !== true) return json({ error: "student_join_code_unavailable" }, 403);
      return json({ revoked: true });
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
