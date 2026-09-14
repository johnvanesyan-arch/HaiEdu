import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    const { data: actor } = await admin.from("profiles")
      .select("role, display_name, account_status")
      .eq("id", actorId)
      .maybeSingle();
    if (!actor || String(actor.role) !== "admin" || actor.account_status !== "active") {
      return json({ error: "admin_required" }, 403);
    }

    const [{ data: profiles, error: profileError }, authUsers, classResult, membershipResult, deletionResult, auditResult] = await Promise.all([
      admin.from("profiles").select("id, role, display_name, account_status, created_at, updated_at, status_changed_at").order("created_at", { ascending: true }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("classes").select("id, teacher_id, name, academic_year, is_active, created_at").order("created_at", { ascending: false }),
      admin.from("class_memberships").select("class_id, student_id"),
      admin.from("account_deletion_requests").select("id, user_id, requester_user_id, status, requested_at, resolved_at, resolved_by, resolution_code").order("requested_at", { ascending: false }).limit(100),
      admin.from("security_audit_log").select("id, actor_user_id, actor_role, action, outcome, target_user_id, target_type, target_key, details, created_at").order("created_at", { ascending: false }).limit(100),
    ]);

    if (profileError) return json({ error: "profiles_query_failed", detail: profileError.message }, 500);
    if (authUsers.error) return json({ error: "auth_users_query_failed", detail: authUsers.error.message }, 500);
    if (classResult.error) return json({ error: "classes_query_failed", detail: classResult.error.message }, 500);
    if (membershipResult.error) return json({ error: "memberships_query_failed", detail: membershipResult.error.message }, 500);
    if (deletionResult.error) return json({ error: "deletion_query_failed", detail: deletionResult.error.message }, 500);
    if (auditResult.error) return json({ error: "audit_query_failed", detail: auditResult.error.message }, 500);

    const authById = new Map((authUsers.data.users ?? []).map((u: any) => [u.id, u]));
    const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const membershipsByClass = new Map<string, number>();
    for (const m of membershipResult.data ?? []) membershipsByClass.set(m.class_id, (membershipsByClass.get(m.class_id) ?? 0) + 1);

    const users = (profiles ?? []).map((p: any) => {
      const auth = authById.get(p.id) as any;
      return {
        id: p.id,
        email: auth?.email ?? null,
        role: p.role,
        displayName: p.display_name ?? null,
        accountStatus: p.account_status,
        emailConfirmed: Boolean(auth?.email_confirmed_at),
        lastSignInAt: auth?.last_sign_in_at ?? null,
        createdAt: p.created_at,
        statusChangedAt: p.status_changed_at,
      };
    });

    const classes = (classResult.data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      academicYear: c.academic_year,
      active: c.is_active,
      teacherId: c.teacher_id,
      teacherDisplayName: profileById.get(c.teacher_id)?.display_name ?? null,
      studentCount: membershipsByClass.get(c.id) ?? 0,
      createdAt: c.created_at,
    }));

    const roleCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    for (const u of users) {
      roleCounts[String(u.role)] = (roleCounts[String(u.role)] ?? 0) + 1;
      statusCounts[String(u.accountStatus)] = (statusCounts[String(u.accountStatus)] ?? 0) + 1;
    }

    return json({
      actor: { id: actorId, role: actor.role, displayName: actor.display_name ?? "Admin" },
      totals: {
        users: users.length,
        classes: classes.length,
        pendingDeletionRequests: (deletionResult.data ?? []).filter((r: any) => ["pending", "processing"].includes(r.status)).length,
        auditEventsReturned: (auditResult.data ?? []).length,
        roleCounts,
        statusCounts,
      },
      users,
      classes,
      deletionRequests: deletionResult.data ?? [],
      auditEvents: auditResult.data ?? [],
    });
  } catch (err) {
    console.error("get-admin-dashboard", err);
    return json({ error: "admin_dashboard_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
