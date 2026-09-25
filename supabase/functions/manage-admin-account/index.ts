import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function jwtPayload(token: string): Record<string, unknown> {
  try {
    const encoded = token.split(".")[1] || "";
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch { return {}; }
}

async function writeAudit(admin: any, row: Record<string, unknown>) {
  const { error } = await admin.from("security_audit_log").insert(row);
  if (error) console.error("audit_write_failed", error.message);
}

async function activeAdminCount(admin: any) {
  const { count, error } = await admin.from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("account_status", "active");
  if (error) throw error;
  return count ?? 0;
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

    const actorId = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actorId))) return json({ error: "account_or_session_inactive" }, 403);
    const { data: actor } = await admin.from("profiles")
      .select("role, account_status")
      .eq("id", actorId)
      .maybeSingle();
    if (!actor || String(actor.role) !== "admin" || actor.account_status !== "active") return json({ error: "admin_required" }, 403);
    if (jwtPayload(token).aal !== "aal2") return json({ error: "mfa_required" }, 403);

    let body: any = {};
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const action = String(body.action ?? "");

    if (action === "set_role") {
      const targetUserId = String(body.targetUserId ?? "");
      const nextRole = String(body.role ?? "");
      // School administrator authority is provisioned through a school membership,
      // never by changing the global profile role in this generic editor.
      const allowedRoles = new Set(["content_admin", "admin"]);
      if (!targetUserId || !allowedRoles.has(nextRole)) return json({ error: "invalid_role_change" }, 400);
      if (targetUserId === actorId) return json({ error: "cannot_change_own_role" }, 409);

      const { data: target } = await admin.from("profiles").select("role, account_status").eq("id", targetUserId).maybeSingle();
      if (!target) return json({ error: "target_not_found" }, 404);
      if (target.account_status !== "active" && target.account_status !== "suspended") return json({ error: "account_not_editable" }, 409);
      if (!["content_admin", "admin"].includes(String(target.role))) return json({ error: "account_type_immutable" }, 409);
      if (String(target.role) === "admin" && nextRole !== "admin" && target.account_status === "active" && await activeAdminCount(admin) <= 1) {
        return json({ error: "last_active_admin_protected" }, 409);
      }

      const { data: updated, error } = await admin.from("profiles").update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq("id", targetUserId).select("id, role, account_status").single();
      if (error) return json({ error: "role_update_failed", detail: error.message }, 500);
      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.role_changed", outcome: "success",
        target_user_id: targetUserId, target_type: "user", details: { oldRole: target.role, newRole: nextRole },
      });
      return json({ user: updated });
    }

    if (action === "suspend" || action === "activate" || action === "archive" || action === "unarchive") {
      const targetUserId = String(body.targetUserId ?? "");
      if (!targetUserId) return json({ error: "target_user_required" }, 400);
      if (targetUserId === actorId) return json({ error: "cannot_change_own_status" }, 409);
      const { data: target } = await admin.from("profiles").select("role, account_status").eq("id", targetUserId).maybeSingle();
      if (!target) return json({ error: "target_not_found" }, 404);
      if (action === "archive" && target.account_status !== "suspended") return json({ error: "suspend_before_archiving" }, 409);
      if (action === "unarchive" && target.account_status !== "archived") return json({ error: "archived_account_required" }, 409);
      if ((action === "suspend" || action === "activate") && !["active", "suspended"].includes(target.account_status)) {
        return json({ error: "account_not_editable" }, 409);
      }
      if (action === "suspend" && String(target.role) === "admin" && target.account_status === "active" && await activeAdminCount(admin) <= 1) {
        return json({ error: "last_active_admin_protected" }, 409);
      }
      if (action === "suspend" && String(target.role) === "school_admin") {
        const { data: blockers, error: blockerError } = await admin.rpc("service_school_admin_suspension_blockers_14c", {
          p_user: targetUserId,
        });
        if (blockerError) return json({ error: "school_admin_suspension_check_failed" }, 500);
        if (blockers?.length) return json({
          error: "last_active_school_admin_protected",
          detail: blockers.map((row: any) => row.school_name).join(", "),
        }, 409);
      }

      if (action === "suspend" || action === "activate") {
        const authChange = await admin.auth.admin.updateUserById(targetUserId, {
          ban_duration: action === "suspend" ? "876000h" : "none",
        });
        if (authChange.error) return json({ error: "auth_status_update_failed", detail: authChange.error.message }, 500);
      }

      // Archive only changes an already banned account; unarchive keeps it banned.
      const nextStatus = action === "archive" ? "archived" : action === "unarchive" ? "suspended" : action === "suspend" ? "suspended" : "active";
      const { data: updated, error } = await admin.from("profiles").update({
        account_status: nextStatus,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", targetUserId).eq("account_status", target.account_status)
        .select("id, role, account_status, status_changed_at").maybeSingle();
      if (error || !updated) return json({ error: "profile_status_update_failed", detail: error?.message }, 500);

      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: ({
          suspend: "admin.account_suspended", activate: "admin.account_activated",
          archive: "admin.account_archived", unarchive: "admin.account_unarchived",
        } as Record<string, string>)[action],
        outcome: "success", target_user_id: targetUserId, target_type: "user",
        details: { previousStatus: target.account_status, newStatus: nextStatus },
      });
      return json({ user: updated });
    }

    if (action === "prepare_account_deletion") {
      const targetUserId = String(body.targetUserId ?? "");
      if (!targetUserId) return json({ error: "target_user_required" }, 400);
      if (targetUserId === actorId) return json({ error: "cannot_delete_own_account" }, 409);
      const { data: target } = await admin.from("profiles")
        .select("role, account_status").eq("id", targetUserId).maybeSingle();
      if (!target) return json({ error: "target_not_found" }, 404);
      if (target.account_status !== "archived") return json({ error: "archive_before_deletion" }, 409);
      if (String(target.role) !== "student") return json({ error: "staff_delete_from_archive" }, 409);

      const { data: existing } = await admin.from("account_deletion_requests")
        .select("id, status").eq("user_id", targetUserId)
        .in("status", ["pending", "processing"]).maybeSingle();
      if (existing) return json({ request: existing, alreadyPending: true });
      const { data: request, error } = await admin.from("account_deletion_requests").insert({
        user_id: targetUserId, auth_user_id: targetUserId, requester_user_id: actorId,
        status: "pending", resolution_code: "admin_archived_account",
      }).select("id, status").single();
      if (error) return json({ error: "deletion_request_failed", detail: error.message }, 500);
      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.archived_student_deletion_requested",
        outcome: "success", target_user_id: targetUserId, target_type: "deletion_request", target_key: request.id,
        details: {},
      });
      return json({ request });
    }

    if (action === "delete_archived_staff") {
      const targetUserId = String(body.targetUserId ?? "");
      if (!targetUserId) return json({ error: "target_user_required" }, 400);
      if (targetUserId === actorId) return json({ error: "cannot_delete_own_account" }, 409);
      const { data: target } = await admin.from("profiles")
        .select("role, account_status, master_admin_protected_at").eq("id", targetUserId).maybeSingle();
      if (!target) return json({ error: "target_not_found" }, 404);
      if (target.account_status !== "archived") return json({ error: "archive_before_deletion" }, 409);
      if (target.master_admin_protected_at || String(target.role) === "admin") return json({ error: "master_admin_deletion_forbidden" }, 409);
      if (String(target.role) === "student") return json({ error: "student_deletion_request_required" }, 409);

      // Roles can change. Catalog-based preflight checks every profile foreign
      // key that would cascade learner data or reject the deletion.
      const { data: blockers, error: blockerError } = await admin.rpc("service_account_deletion_blockers", {
        p_user_id: targetUserId,
      });
      if (blockerError) return json({ error: "offboarding_check_failed", detail: blockerError.message }, 500);
      if (blockers?.length) return json({
        error: "staff_offboarding_required",
        detail: `Նախ փոխանցեք կամ կարգավորեք կապված գրառումները՝ ${blockers.join(", ")}`,
      }, 409);
      const { data: openRequest } = await admin.from("account_deletion_requests").select("id")
        .eq("user_id", targetUserId).in("status", ["pending", "processing"]).maybeSingle();
      if (openRequest) return json({ error: "open_deletion_request_requires_review" }, 409);

      const deleted = await admin.auth.admin.deleteUser(targetUserId, false);
      if (deleted.error) return json({
        error: "staff_offboarding_required",
        detail: "Կապված գրառումները փոխվել են կամ մուտքի ծառայությունը մերժել է ջնջումը։ Թարմացրեք ցանկը և ստուգեք հաշիվը։",
      }, 409);
      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.staff_account_erased",
        outcome: "success", target_user_id: null, target_type: "user",
        details: { formerRole: target.role },
      });
      return json({ deleted: true });
    }

    if (action === "reassign_class") {
      const classId = String(body.classId ?? "");
      const newTeacherId = String(body.newTeacherId ?? "");
      if (!classId || !newTeacherId) return json({ error: "class_and_teacher_required" }, 400);
      const [{ data: klass }, { data: teacher }] = await Promise.all([
        admin.from("classes").select("id, teacher_id, name").eq("id", classId).maybeSingle(),
        admin.from("profiles").select("role, account_status").eq("id", newTeacherId).maybeSingle(),
      ]);
      if (!klass) return json({ error: "class_not_found" }, 404);
      if (!teacher || !["teacher", "admin"].includes(String(teacher.role)) || teacher.account_status !== "active") {
        return json({ error: "active_teacher_required" }, 409);
      }
      const { data: updated, error } = await admin.from("classes").update({ teacher_id: newTeacherId })
        .eq("id", classId).select("id, teacher_id, name").single();
      if (error) return json({ error: "class_reassign_failed", detail: error.message }, 500);
      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.class_reassigned", outcome: "success",
        target_user_id: newTeacherId, target_type: "class", target_key: classId,
        details: { previousTeacherId: klass.teacher_id, className: klass.name },
      });
      return json({ class: updated });
    }

    if (action === "reject_deletion") {
      const requestId = String(body.requestId ?? "");
      const resolutionCode = String(body.resolutionCode ?? "not_verified");
      const allowedCodes = new Set(["not_verified", "staff_offboarding_required", "legal_hold", "duplicate_request"]);
      if (!requestId || !allowedCodes.has(resolutionCode)) return json({ error: "invalid_rejection" }, 400);
      const { data: request } = await admin.from("account_deletion_requests").select("id, user_id, status, resolution_code")
        .eq("id", requestId).maybeSingle();
      if (!request || !["pending", "processing"].includes(request.status)) return json({ error: "request_not_open" }, 409);
      const { data: updated, error } = await admin.from("account_deletion_requests").update({
        status: "rejected", resolved_at: new Date().toISOString(), resolved_by: actorId,
        resolution_code: resolutionCode, auth_user_id: null,
      }).eq("id", requestId).select("id, status, resolution_code, resolved_at").single();
      if (error) return json({ error: "deletion_reject_failed", detail: error.message }, 500);
      if (request.user_id) {
        await admin.from("profiles").update({
          account_status: request.resolution_code === "admin_archived_account" ? "archived" : "active",
          status_changed_at: new Date().toISOString(),
        })
          .eq("id", request.user_id).eq("account_status", "deletion_pending");
      }
      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.deletion_rejected", outcome: "success",
        target_user_id: request.user_id, target_type: "deletion_request", target_key: requestId,
        details: { resolutionCode },
      });
      return json({ request: updated });
    }

    if (action === "approve_deletion") {
      const requestId = String(body.requestId ?? "");
      if (!requestId) return json({ error: "request_id_required" }, 400);
      const { data: request } = await admin.from("account_deletion_requests")
        .select("id, user_id, auth_user_id, status")
        .eq("id", requestId).maybeSingle();
      if (!request || request.status !== "pending") return json({ error: "pending_request_required" }, 409);

      const targetUserId = request.user_id as string | null;
      if (!targetUserId) return json({ error: "deletion_target_missing" }, 409);
      const { data: target } = await admin.from("profiles").select("role, account_status").eq("id", targetUserId).maybeSingle();
      if (!target) return json({ error: "target_profile_missing" }, 404);
      if (String(target.role) !== "student") {
        return json({ error: "staff_offboarding_required", detail: "Transfer or archive staff-owned resources before deleting this account." }, 409);
      }

      const { data: staged, error: stageError } = await admin.from("account_deletion_requests").update({
        status: "processing",
      }).eq("id", requestId).eq("status", "pending").select("id, status, requested_at").single();
      if (stageError || !staged) return json({ error: "deletion_approval_failed", detail: stageError?.message }, 500);

      const { error: profileError } = await admin.from("profiles").update({
        account_status: "deletion_pending",
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", targetUserId);
      if (profileError) return json({ error: "deletion_pending_status_failed", detail: profileError.message }, 500);

      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.deletion_approved", outcome: "success",
        target_user_id: targetUserId, target_type: "deletion_request", target_key: requestId,
        details: { previousRequestStatus: request.status, newRequestStatus: "processing", irreversible: false },
      });
      return json({ request: staged, readyForExecution: true, irreversible: false });
    }

    if (action === "execute_deletion") {
      const requestId = String(body.requestId ?? "");
      if (!requestId) return json({ error: "request_id_required" }, 400);
      const { data: request } = await admin.from("account_deletion_requests")
        .select("id, user_id, auth_user_id, status")
        .eq("id", requestId).maybeSingle();
      if (!request || request.status !== "processing") return json({ error: "approved_request_required" }, 409);

      const targetUserId = request.user_id as string | null;
      const authUserId = (request.auth_user_id ?? request.user_id) as string | null;
      if (!targetUserId || !authUserId) return json({ error: "deletion_target_missing" }, 409);

      const { data: target } = await admin.from("profiles").select("role, account_status").eq("id", targetUserId).maybeSingle();
      if (!target) return json({ error: "target_profile_missing" }, 404);
      if (String(target.role) !== "student") {
        return json({ error: "staff_offboarding_required", detail: "Transfer or archive staff-owned resources before deleting this account." }, 409);
      }
      if (target.account_status !== "deletion_pending") return json({ error: "deletion_pending_status_required" }, 409);

      const ban = await admin.auth.admin.updateUserById(authUserId, { ban_duration: "876000h" });
      if (ban.error) return json({ error: "deletion_ban_failed", detail: ban.error.message }, 500);

      const erased = await admin.rpc("erase_student_data", { p_student_id: targetUserId });
      if (erased.error) return json({ error: "student_data_erasure_failed", detail: erased.error.message }, 500);
      const inventory = erased.data ?? null;

      const deleted = await admin.auth.admin.deleteUser(authUserId, false);
      if (deleted.error) return json({ error: "auth_user_delete_failed", detail: deleted.error.message, retryable: true }, 500);

      const { data: completed, error: completeError } = await admin.from("account_deletion_requests").update({
        status: "completed", resolved_at: new Date().toISOString(), resolved_by: actorId,
        resolution_code: "student_erased", auth_user_id: null,
      }).eq("id", requestId).select("id, status, resolved_at, resolution_code").single();
      if (completeError) return json({ error: "deletion_finalize_failed", detail: completeError.message }, 500);

      await writeAudit(admin, {
        actor_user_id: actorId, actor_role: "admin", action: "admin.student_account_erased", outcome: "success",
        target_user_id: null, target_type: "deletion_request", target_key: requestId,
        details: { erasedInventory: inventory ?? {}, authDeleted: true },
      });
      return json({ request: completed, erasedInventory: inventory });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (err) {
    console.error("manage-admin-account", err);
    return json({ error: "manage_admin_account_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
