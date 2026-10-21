import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function countRows(query: any, label: string) {
  const { count, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return count ?? 0;
}

async function getDataInventory(admin: any, role: string, userId: string) {
  if (role === "student") {
    const [
      legacyMemberships,
      institutionalEnrollments,
      receivedInvitations,
      attempts,
      sessions,
      mastery,
      remediation,
      writtenWork,
      responseDrafts,
      audioDeliveries,
      assessedAudioRecordings,
      sourceFamilyExposures,
    ] = await Promise.all([
      countRows(admin.from("class_memberships").select("class_id", { count: "exact", head: true }).eq("student_id", userId), "class_memberships_count_failed"),
      countRows(admin.from("institutional_class_enrollments").select("id", { count: "exact", head: true }).eq("student_id", userId), "institutional_enrollments_count_failed"),
      countRows(admin.from("institutional_invitations").select("id", { count: "exact", head: true }).eq("recipient_user_id", userId), "received_invitations_count_failed"),
      countRows(admin.from("attempts").select("id", { count: "exact", head: true }).eq("student_id", userId), "attempts_count_failed"),
      countRows(admin.from("learning_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId), "learning_sessions_count_failed"),
      countRows(admin.from("student_skill_mastery").select("skill_id", { count: "exact", head: true }).eq("student_id", userId), "mastery_count_failed"),
      countRows(admin.from("remediation_events").select("id", { count: "exact", head: true }).eq("student_id", userId), "remediation_count_failed"),
      countRows(admin.from("written_work").select("id", { count: "exact", head: true }).eq("student_id", userId), "written_work_count_failed"),
      countRows(admin.from("learning_response_drafts").select("session_item_id", {count:"exact",head:true}).eq("student_id",userId),"response_drafts_count_failed"),
      countRows(admin.from("learning_audio_deliveries").select("session_item_id", {count:"exact",head:true}).eq("student_id",userId),"audio_deliveries_count_failed"),
      countRows(admin.from("learning_assessed_audio").select("session_id", {count:"exact",head:true}).eq("student_id",userId),"assessed_audio_count_failed"),
      countRows(admin.from("learning_source_family_exposures").select("session_item_id", {count:"exact",head:true}).eq("student_id",userId),"source_family_exposures_count_failed"),
    ]);
    return {
      kind: "student",
      classMemberships: legacyMemberships + institutionalEnrollments,
      invitationsReceived: receivedInvitations,
      attempts,
      learningSessions: sessions,
      masteryRows: mastery,
      remediationEvents: remediation,
      writtenWork,
      responseDrafts,
      audioDeliveries,
      assessedAudioRecordings,
      sourceFamilyExposures,
    };
  }

  const auditEvents = await countRows(
    admin.from("security_audit_log").select("id", { count: "exact", head: true }).eq("actor_user_id", userId),
    "audit_events_count_failed",
  );

  if (role === "teacher") {
    const { data: membershipRows, error: membershipError } = await admin
      .from("institutional_memberships")
      .select("id")
      .eq("person_id", userId);
    if (membershipError) throw new Error(`institutional_memberships_failed: ${membershipError.message}`);
    const membershipIds = (membershipRows ?? []).map((row: any) => row.id);
    const teachingAssignments = membershipIds.length
      ? await countRows(
        admin.from("teacher_assignments").select("id", { count: "exact", head: true }).in("teacher_membership_id", membershipIds),
        "teacher_assignments_count_failed",
      )
      : 0;
    const [emailInvitations, joinCodes, writtenReviews] = await Promise.all([
      countRows(admin.from("institutional_invitations").select("id", { count: "exact", head: true }).eq("issued_by", userId), "issued_invitations_count_failed"),
      countRows(admin.from("institutional_join_codes").select("id", { count: "exact", head: true }).eq("issued_by", userId), "issued_join_codes_count_failed"),
      countRows(admin.from("written_reviews").select("id", { count: "exact", head: true }).eq("assessor_id", userId), "written_reviews_count_failed"),
    ]);
    return {
      kind: "teacher",
      institutionalMemberships: membershipIds.length,
      teachingAssignments,
      invitationRecords: emailInvitations + joinCodes,
      writtenReviews,
      auditEvents,
    };
  }

  if (role === "school_admin") {
    const [institutionalMemberships, invitationRecords] = await Promise.all([
      countRows(admin.from("institutional_memberships").select("id", { count: "exact", head: true }).eq("person_id", userId), "institutional_memberships_count_failed"),
      countRows(admin.from("institutional_invitations").select("id", { count: "exact", head: true }).eq("issued_by", userId), "issued_invitations_count_failed"),
    ]);
    return { kind: "school_admin", institutionalMemberships, invitationRecords, auditEvents };
  }

  if (role === "content_admin") {
    const writtenTaskReviews = await countRows(admin.from("written_task_versions").select("id", { count:"exact", head:true }).eq("reviewed_by",userId), "written_task_reviews_count_failed");
    const contentReviews = await countRows(
      admin.from("item_reviews").select("id", { count: "exact", head: true }).eq("reviewer_id", userId),
      "content_reviews_count_failed",
    );
    return { kind: "content_admin", contentReviews, writtenTaskReviews, auditEvents };
  }

  if (role === "admin") {
    const writtenTaskReviews = await countRows(admin.from("written_task_versions").select("id", { count:"exact", head:true }).eq("reviewed_by",userId), "written_task_reviews_count_failed");
    return { kind: "admin", writtenTaskReviews, auditEvents };
  }
  return { kind: "account", auditEvents };
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

    const userId = userData.user.id;
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, display_name, account_status, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profile) return json({ error: "profile_not_found" }, 404);

    const { data: preferences } = await admin
      .from("privacy_preferences")
      .select("product_analytics_opt_in, research_use_opt_in, policy_version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: deletionRequest } = await admin
      .from("account_deletion_requests")
      .select("id, status, requested_at, resolved_at, resolution_code")
      .or(`user_id.eq.${userId},requester_user_id.eq.${userId}`)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const dataInventory = await getDataInventory(admin, String(profile.role), userId);

    return json({
      account: {
        id: userId,
        email: userData.user.email ?? null,
        role: profile.role,
        displayName: profile.display_name ?? null,
        status: profile.account_status,
        createdAt: profile.created_at,
      },
      preferences: preferences ?? {
        product_analytics_opt_in: false,
        research_use_opt_in: false,
        policy_version: "pilot-v1",
        updated_at: null,
      },
      latestDeletionRequest: deletionRequest ?? null,
      dataInventory,
      minimization: {
        storedInProfile: ["role", "optional display name", "account status"],
        notCollectedByPlatformProfile: ["date of birth", "home address", "phone number", "parent email", "government ID"],
        accountEmailLocation: "Supabase Auth",
      },
    });
  } catch (err) {
    console.error("get-my-privacy", err);
    return json({ error: "privacy_dashboard_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
