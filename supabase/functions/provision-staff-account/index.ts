import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

function jwtPayload(token: string): Record<string, unknown> {
  try {
    const encoded = token.split(".")[1] || "";
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch { return {}; }
}

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
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "unauthorized" }, 401);
    const actor = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actor)))
      return json({ error: "account_or_session_inactive" }, 403);
    const { data: actorProfile, error: actorProfileError } = await admin.from("profiles")
      .select("role,account_status").eq("id", actor).maybeSingle();
    if (actorProfileError || !actorProfile || actorProfile.account_status !== "active")
      return json({ error: "account_or_session_inactive" }, 403);
    if (actorProfile.role === "admin" && jwtPayload(token).aal !== "aal2")
      return json({ error: "mfa_required" }, 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const kind = body.kind;
    const schoolId = body.schoolId ?? null;
    const subjectId = body.subjectId ?? null;
    const name = typeof body.schoolName === "string" ? body.schoolName.trim().replace(/\s+/g, " ") : null;
    const suppliedCode = body.schoolCode;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!['school_admin', 'teacher'].includes(String(kind)) ||
        email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        (kind === 'teacher' && (typeof schoolId !== 'string' || !uuid.test(schoolId) ||
          typeof subjectId !== 'string' || !uuid.test(subjectId) || name !== null || suppliedCode != null)) ||
        (kind === 'school_admin' && (schoolId !== null || subjectId !== null ||
          !name || name.length < 3 || name.length > 160 || suppliedCode != null)))
      return json({ error: "invalid_staff_invitation" }, 400);
    const { data: permitted, error: permissionError } = await admin.rpc('service_authorize_staff_invite_14b', {
      p_actor: actor, p_kind: kind, p_school: schoolId, p_subject: subjectId,
    });
    if (permissionError || permitted !== true) return json({ error: "staff_invitation_unavailable" }, 403);
    // Auth sends the link. The recipient alone chooses a password on the access page.
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://www.haiedu.am/account-access",
    });
    if (inviteError?.code === "over_email_send_rate_limit")
      return json({ error: "email_rate_limited" }, 429);
    if (inviteError || !invited.user?.id) return json({ error: "staff_invitation_unavailable" }, 403);
    const { data: requestId, error: registerError } = await admin.rpc('service_register_staff_invite_14b', {
      p_actor: actor, p_recipient: invited.user.id, p_email: email, p_kind: kind,
      p_school: schoolId, p_subject: subjectId, p_school_name: name, p_school_code: null,
    });
    if (registerError || !requestId) {
      // No institutional privilege is granted. Keep the Auth user for explicit
      // reconciliation: the invite API must never delete an existing identity.
      console.error("staff_invite_registration_failed", registerError);
      return json({ error: "staff_invitation_unavailable" }, 403);
    }
    return json({ requestId, delivery: "email" }, 201);
  } catch (error) {
    console.error("provision-staff-account", error);
    return json({ error: "staff_invitation_failed" }, 500);
  }
});
