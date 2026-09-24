import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
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
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = header.replace(/^Bearer\s+/i, "");
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "unauthorized" }, 401);
    const actor = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actor)))
      return json({ error: "account_or_session_inactive" }, 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (body.action === "list") {
      const { data, error } = await admin.rpc("service_list_staff_invites_14b", { p_actor: actor });
      if (error) throw error;
      return json({ invitations: data ?? [] });
    }
    if (body.action === "resend") {
      if (typeof body.invitationId !== "string" || !uuid.test(body.invitationId))
        return json({ error: "invalid_invitation_id" }, 400);
      const { data: claims, error: claimError } = await admin.rpc("service_claim_staff_invite_resend_14b", {
        p_actor: actor, p_invitation: body.invitationId,
      });
      if (claimError) throw claimError;
      const claim = Array.isArray(claims) ? claims[0] : null;
      if (!claim || typeof claim.recipient_email !== "string" || !uuid.test(claim.recipient_id))
        return json({ error: "resend_unavailable" }, 409);
      // Auth issues a fresh link for the same unconfirmed identity; never trust
      // a client-supplied email or create a second institutional invitation.
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        claim.recipient_email, { redirectTo: "https://www.haiedu.am/account-access" },
      );
      if (inviteError || invited.user?.id !== claim.recipient_id) {
        console.error("staff_invite_resend_failed", { code: inviteError?.code, status: inviteError?.status });
        return json({ error: "resend_delivery_unavailable" }, 503);
      }
      return json({ resendRequested: true });
    }
    if (body.action === "revoke") {
      if (typeof body.invitationId !== "string" || !uuid.test(body.invitationId))
        return json({ error: "invalid_invitation_id" }, 400);
      const { data, error } = await admin.rpc("service_revoke_staff_invite_14b", {
        p_actor: actor, p_invitation: body.invitationId,
      });
      if (error) throw error;
      if (data !== true) return json({ error: "invitation_unavailable" }, 403);
      return json({ revoked: true });
    }
    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    console.error("manage-staff-invitation", error);
    return json({ error: "staff_invitation_action_failed" }, 500);
  }
});
