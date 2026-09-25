import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const hex = (bytes: Uint8Array) => Array.from(bytes,
  (byte) => byte.toString(16).padStart(2, "0")).join("");
const rateLimited = (error: any) => error?.code === "over_email_send_rate_limit"
  || error?.status === 429;

Deno.serve(async (req) => {
  let invitationId: string | null = null;
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const header = req.headers.get("Authorization");
    if (!url || !serviceKey || !anonKey) return json({ error: "server_not_configured" }, 500);
    if (!header) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey, {
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
    if (profileError || profile?.role !== "school_admin" || profile.account_status !== "active") {
      return json({ error: "student_invitation_unavailable" }, 403);
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const schoolId = body.schoolId;
    const classId = body.classId;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!uuid.test(String(schoolId)) || !uuid.test(String(classId))
        || email.length < 3 || email.length > 320 || !emailPattern.test(email)) {
      return json({ error: "invalid_student_invitation" }, 400);
    }
    const { data: allowed, error: allowedError } = await admin.rpc(
      "service_authorize_student_invite_14c",
      { p_actor: actor, p_school: schoolId, p_class: classId },
    );
    if (allowedError || allowed !== true) {
      return json({ error: "student_invitation_unavailable" }, 403);
    }

    const plaintext = hex(crypto.getRandomValues(new Uint8Array(32)));
    const digest = hex(new Uint8Array(await crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(plaintext),
    )));
    const redirect = new URL("https://www.haiedu.am/account-access");
    redirect.searchParams.set("student_invitation", plaintext);

    const { data: existingRecipient, error: lookupError } = await admin.rpc(
      "service_lookup_invitee_by_email_14b", { p_email: email, p_role: "student" },
    );
    if (lookupError) return json({ error: "student_invitation_unavailable" }, 403);

    let recipientId = existingRecipient as string | null;
    let accountState: "existing" | "new" = "existing";
    if (!recipientId) {
      accountState = "new";
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirect.toString(),
      });
      if (rateLimited(inviteError)) return json({ error: "email_rate_limited" }, 429);
      if (inviteError || !invited.user?.id) {
        return json({ error: "student_invitation_unavailable" }, 403);
      }
      recipientId = invited.user.id;
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const { data: issued, error: issueError } = await admin.rpc(
      "service_issue_institutional_invitation_14b", {
        p_actor: actor, p_recipient: recipientId, p_school: schoolId,
        p_role: "student", p_class: classId, p_assignment: null,
        p_token_digest: digest, p_expires_at: expiresAt,
      },
    );
    if (issueError || !issued) {
      if (accountState === "new" && recipientId) {
        const { error: cleanupError } = await admin.auth.admin.deleteUser(recipientId);
        if (cleanupError) console.error("student_invite_identity_cleanup_failed");
      }
      return json({ error: "student_invitation_unavailable" }, 403);
    }
    invitationId = issued;

    if (accountState === "existing") {
      const delivery = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: deliveryError } = await delivery.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirect.toString() },
      });
      if (deliveryError) {
        await admin.rpc("service_revoke_institutional_invitation_14b", {
          p_actor: actor, p_invitation: invitationId,
        });
        if (rateLimited(deliveryError)) return json({ error: "email_rate_limited" }, 429);
        return json({ error: "student_invitation_delivery_failed" }, 503);
      }
    }

    return json({ invitationId, delivery: "email", accountState, expiresAt }, 201);
  } catch (error) {
    console.error("provision-student-account", error instanceof Error ? error.message : "failed");
    return json({ error: "student_invitation_failed" }, 500);
  }
});
