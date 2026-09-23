import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asUuid = (value: unknown) => typeof value === "string" && uuid.test(value);
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const header = req.headers.get("Authorization");
    if (!url || !key) return json({ error: "server_not_configured" }, 500);
    if (!header) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = header.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const actorId = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actorId))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("account_status").eq("id", actorId).maybeSingle();
    if (profileError || profile?.account_status !== "active") {
      return json({ error: "account_or_session_inactive" }, 403);
    }
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

    if (body?.action === "revoke") {
      if (!asUuid(body.invitationId)) return json({ error: "invalid_invitation_id" }, 400);
      const { data, error } = await admin.rpc("service_revoke_institutional_invitation_14b", {
        p_actor: actorId, p_invitation: body.invitationId,
      });
      if (error) return json({ error: "invitation_action_failed" }, 500);
      if (data !== true) return json({ error: "invitation_unavailable" }, 403);
      return json({ revoked: true });
    }
    if (body?.action !== "issue") return json({ error: "invalid_action" }, 400);
    const hours = body.expiresInHours ?? 48;
    const email = typeof body.recipientEmail === "string" ? body.recipientEmail.trim() : null;
    if (!asUuid(body.schoolId) ||
        (!asUuid(body.recipientUserId) && (!email || email.length > 320)) ||
        (body.recipientUserId != null && email != null) ||
        !["student", "teacher"].includes(String(body.role)) ||
        (body.classId != null && !asUuid(body.classId)) ||
        (body.assignmentId != null && !asUuid(body.assignmentId)) ||
        !Number.isInteger(hours) || Number(hours) < 1 || Number(hours) > 168) {
      return json({ error: "invalid_invitation_request" }, 400);
    }
    const { data: memberships, error: membershipError } = await admin.from("institutional_memberships")
      .select("role, valid_from, valid_to")
      .eq("school_id", body.schoolId).eq("person_id", actorId).eq("status", "active");
    const now = Date.now();
    if (membershipError || !(memberships ?? []).some((membership: any) =>
      ["teacher", "school_admin"].includes(membership.role) &&
      Date.parse(membership.valid_from) <= now &&
      (membership.valid_to === null || Date.parse(membership.valid_to) > now))) {
      return json({ error: "invitation_not_authorized" }, 403);
    }
    let recipientId = body.recipientUserId;
    if (email) {
      const { data: found, error: lookupError } = await admin.rpc("service_lookup_invitee_by_email_14b", {
        p_email: email, p_role: body.role,
      });
      if (lookupError || !found) return json({ error: "invitation_not_authorized" }, 403);
      recipientId = found;
    }
    const plaintext = hex(crypto.getRandomValues(new Uint8Array(32)));
    const digest = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plaintext))));
    const expiresAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000).toISOString();
    const { data: invitationId, error } = await admin.rpc("service_issue_institutional_invitation_14b", {
      p_actor: actorId, p_recipient: recipientId, p_school: body.schoolId,
      p_role: body.role, p_class: body.classId ?? null,
      p_assignment: body.assignmentId ?? null, p_token_digest: digest, p_expires_at: expiresAt,
    });
    if (error || !invitationId) return json({ error: "invitation_not_authorized" }, 403);
    // The plaintext token is returned once. Only its digest is persisted.
    return json({ invitationId, token: plaintext, expiresAt }, 201);
  } catch (error) {
    console.error("manage-institutional-invitation", error);
    return json({ error: "invitation_action_failed" }, 500);
  }
});
