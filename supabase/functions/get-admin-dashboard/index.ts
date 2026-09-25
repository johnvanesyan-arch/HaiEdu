import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clamp(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
}

function jwtPayload(token: string): Record<string, unknown> {
  try {
    const encoded = token.split(".")[1] || "";
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch { return {}; }
}

function safeSearch(value: unknown) {
  return String(value ?? "").trim().slice(0, 120).replace(/[%_,()]/g, " ");
}

async function authContacts(admin: any, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 250);
  const entries = await Promise.all(unique.map(async (id) => {
    const { data, error } = await admin.auth.admin.getUserById(id);
    return [id, error ? null : data?.user ?? null] as const;
  }));
  return new Map(entries);
}

async function authIdsByEmailSearch(admin: any, search: string) {
  const ids: string[] = [];
  const needle = search.toLowerCase();
  for (let page = 1; page <= 100; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage:1000 });
    if (result.error) throw result.error;
    const users = result.data.users ?? [];
    ids.push(...users.filter((user: any) => String(user.email ?? "").toLowerCase().includes(needle)).map((user: any) => user.id));
    if (users.length < 1000) break;
  }
  return ids;
}

function userShape(profile: any, auth: any) {
  return {
    id: profile.id,
    email: auth?.email ?? null,
    role: profile.role,
    displayName: profile.display_name ?? null,
    accountStatus: profile.account_status,
    emailConfirmed: Boolean(auth?.email_confirmed_at),
    lastSignInAt: auth?.last_sign_in_at ?? null,
    createdAt: profile.created_at ?? null,
    statusChangedAt: profile.status_changed_at ?? null,
  };
}

async function usersForProfiles(admin: any, profiles: any[]) {
  const contacts = await authContacts(admin, profiles.map((profile) => profile.id));
  return profiles.map((profile) => userShape(profile, contacts.get(profile.id)));
}

async function profileUsersByIds(admin: any, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await admin.from("profiles")
    .select("id,role,display_name,account_status,created_at,status_changed_at")
    .in("id", unique);
  if (error) throw error;
  return usersForProfiles(admin, data ?? []);
}

async function allActiveMemberships(admin: any, role: string) {
  const rows: any[] = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await admin.from("institutional_memberships")
      .select("id,school_id,person_id,role,status").eq("role", role).eq("status", "active")
      .order("id", { ascending:true }).range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
}

async function activeProfileIds(admin: any, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const active = new Set<string>();
  for (let offset = 0; offset < unique.length; offset += 200) {
    const { data, error } = await admin.from("profiles").select("id")
      .in("id", unique.slice(offset, offset + 200)).eq("account_status", "active");
    if (error) throw error;
    for (const row of data ?? []) active.add(row.id);
  }
  return active;
}

async function overview(admin: any, actor: any, actorId: string) {
  const now = new Date().toISOString();
  const [schoolsResult, teacherCount, studentCount, pendingInvites, pendingDeletions, archivedCount, masterCount, auditResult] = await Promise.all([
    admin.from("schools").select("id,name,school_code").order("name", { ascending: true }),
    admin.from("institutional_memberships").select("id", { count:"exact", head:true }).eq("role", "teacher").eq("status", "active"),
    admin.from("profiles").select("id", { count:"exact", head:true }).eq("role", "student").eq("account_status", "active"),
    admin.from("staff_account_provisioning").select("id", { count:"exact", head:true }).is("accepted_at", null).is("revoked_at", null).gt("expires_at", now),
    admin.from("account_deletion_requests").select("id", { count:"exact", head:true }).in("status", ["pending", "processing"]),
    admin.from("profiles").select("id", { count:"exact", head:true }).eq("account_status", "archived"),
    admin.from("profiles").select("id", { count:"exact", head:true }).eq("role", "admin").eq("account_status", "active"),
    admin.from("security_audit_log").select("id,actor_user_id,actor_role,action,outcome,target_user_id,target_type,target_key,created_at").order("created_at", { ascending:false }).limit(8),
  ]);
  const failed = [schoolsResult, teacherCount, studentCount, pendingInvites, pendingDeletions, archivedCount, masterCount, auditResult].find((result: any) => result.error);
  if (failed?.error) throw failed.error;
  const schools = schoolsResult.data ?? [];
  const adminMemberships = await allActiveMemberships(admin, "school_admin");
  const activeAdminProfiles = await activeProfileIds(admin, adminMemberships.map((row: any) => row.person_id));
  const effectiveAdmins = adminMemberships.filter((row: any) => activeAdminProfiles.has(row.person_id));
  const coveredSchools = new Set(effectiveAdmins.map((row: any) => row.school_id));
  const unstaffed = schools.filter((school: any) => !coveredSchools.has(school.id));
  const attention: any[] = [];
  if (unstaffed.length) attention.push({ severity:"critical", label:`${unstaffed.length} դպրոց չունի ակտիվ ադմին`, detail:unstaffed.slice(0, 3).map((school: any) => school.name).join(", "), href:"#schoolsSection" });
  if ((masterCount.count ?? 0) < 2) attention.push({ severity:"warning", label:"Վերականգնման երկրորդ master admin չկա", detail:"Ավելացրեք առանձին պատասխանատու հաշիվ, որպեսզի մեկ հաշվի կորուստը չփակի կառավարումը։", href:"./admin-security.html" });
  if ((pendingInvites.count ?? 0) > 0) attention.push({ severity:"warning", label:`${pendingInvites.count} սպասվող հրավեր`, detail:"Ստուգեք չընդունված կամ շուտով ժամկետանց հրավերները։", href:"./school-admin.html#pendingPanel" });
  if ((pendingDeletions.count ?? 0) > 0) attention.push({ severity:"warning", label:`${pendingDeletions.count} բաց ջնջման հարցում`, detail:"Վերանայեք յուրաքանչյուր հարցումը նախքան հետադարձելի չլինող քայլը։", href:"#deletionsSection" });
  if ((archivedCount.count ?? 0) > 0) attention.push({ severity:"", label:`${archivedCount.count} արխիվացված հաշիվ`, detail:"Արխիվը պահպանում է պատմությունը և չի ծանրաբեռնում ընթացիկ ցանկը։", href:"#archiveSection" });
  const auditIds = (auditResult.data ?? []).flatMap((event: any) => [event.actor_user_id, event.target_user_id]).filter(Boolean);
  const auditUsers = await profileUsersByIds(admin, auditIds);
  const userById = new Map(auditUsers.map((user: any) => [user.id, user]));
  return {
    actor: { id:actorId, role:actor.role, displayName:actor.display_name ?? "Admin" },
    summary: {
      activeSchools: schools.length,
      activeSchoolAdmins: effectiveAdmins.length,
      activeTeachers: teacherCount.count ?? 0,
      activeStudents: studentCount.count ?? 0,
      activeMasterAdmins: masterCount.count ?? 0,
      attentionCount: attention.length,
    },
    attention,
    recentAudit: (auditResult.data ?? []).map((event: any) => ({
      action:event.action, actorRole:event.actor_role, actorDisplayName:userById.get(event.actor_user_id)?.displayName ?? null,
      targetType:event.target_type, targetDisplayName:userById.get(event.target_user_id)?.displayName ?? null,
      outcome:event.outcome, createdAt:event.created_at,
    })),
  };
}

async function schoolDirectory(admin: any, actor: any, actorId: string, body: any) {
  const page = clamp(body.page, 1, 1, 100000);
  const pageSize = clamp(body.pageSize, 20, 5, 50);
  const search = safeSearch(body.search);
  let query = admin.from("schools").select("id,name,school_code", { count:"exact" }).order("name", { ascending:true });
  if (search) query = query.or(`name.ilike.%${search}%,school_code.ilike.%${search}%`);
  const { data: schools, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  const ids = (schools ?? []).map((school: any) => school.id);
  if (!ids.length) return { actor:{ id:actorId, role:actor.role }, schools:[], page, pageSize, total:count ?? 0 };
  const [memberships, classes, enrollments] = await Promise.all([
    admin.from("institutional_memberships").select("school_id,role,status,person_id").in("school_id", ids).eq("status", "active"),
    admin.from("classes").select("id,school_id,is_active").in("school_id", ids).eq("is_active", true),
    admin.from("institutional_class_enrollments").select("school_id,student_id,status").in("school_id", ids).eq("status", "active"),
  ]);
  if (memberships.error) throw memberships.error;
  if (classes.error) throw classes.error;
  if (enrollments.error) throw enrollments.error;
  const totals = new Map(ids.map((id: string) => [id, { adminCount:0, teacherCount:0, studentCount:0, classCount:0 }]));
  for (const row of memberships.data ?? []) {
    const item = totals.get(row.school_id);
    if (!item) continue;
    if (row.role === "school_admin") item.adminCount += 1;
    if (row.role === "teacher") item.teacherCount += 1;
  }
  for (const row of classes.data ?? []) if (totals.has(row.school_id)) totals.get(row.school_id).classCount += 1;
  const studentSets = new Map(ids.map((id: string) => [id, new Set<string>()]));
  for (const row of enrollments.data ?? []) studentSets.get(row.school_id)?.add(row.student_id);
  for (const id of ids) {
    const total = totals.get(id);
    if (total) total.studentCount = studentSets.get(id)?.size ?? 0;
  }
  return {
    actor:{ id:actorId, role:actor.role }, page, pageSize, total:count ?? 0,
    schools:(schools ?? []).map((school: any) => ({ id:school.id, name:school.name, schoolCode:school.school_code, ...totals.get(school.id) })),
  };
}

async function schoolDetail(admin: any, actor: any, actorId: string, body: any) {
  const schoolId = String(body.schoolId ?? "");
  if (!schoolId) return json({ error:"school_required" }, 400);
  const [schoolResult, membershipResult, yearResult, assignmentResult, classResult, authorizationResult, enrollmentResult] = await Promise.all([
    admin.from("schools").select("id,name,school_code").eq("id", schoolId).maybeSingle(),
    admin.from("institutional_memberships").select("id,person_id,role,status,valid_from,valid_to").eq("school_id", schoolId).in("role", ["school_admin", "teacher"]).eq("status", "active"),
    admin.from("academic_years").select("id,label,status,starts_on,ends_on").eq("school_id", schoolId),
    admin.from("teacher_assignments").select("id,teacher_membership_id,class_id,subject_program_id,academic_year_id,status").eq("school_id", schoolId).eq("status", "active"),
    admin.from("classes").select("id,name,grade_id,subject_id,academic_year_id,is_active").eq("school_id", schoolId),
    admin.from("teacher_subject_authorizations").select("teacher_membership_id,subject_id,status").eq("school_id", schoolId).eq("status", "active"),
    admin.from("institutional_class_enrollments").select("class_id,student_id,status").eq("school_id", schoolId).eq("status", "active"),
  ]);
  const failed = [schoolResult, membershipResult, yearResult, assignmentResult, classResult, authorizationResult, enrollmentResult].find((result: any) => result.error);
  if (failed?.error) throw failed.error;
  if (!schoolResult.data) return json({ error:"school_not_found" }, 404);
  const memberships = membershipResult.data ?? [];
  const profiles = await profileUsersByIds(admin, memberships.map((row: any) => row.person_id));
  const profileById = new Map(profiles.map((user: any) => [user.id, user]));
  const classes = classResult.data ?? [];
  const classById = new Map(classes.map((row: any) => [row.id, row]));
  const years = new Map((yearResult.data ?? []).map((row: any) => [row.id, row]));
  const subjectIds = [...new Set([...(authorizationResult.data ?? []).map((row: any) => row.subject_id), ...classes.map((row: any) => row.subject_id)].filter(Boolean))];
  const gradeIds = [...new Set(classes.map((row: any) => row.grade_id).filter(Boolean))];
  const [subjectResult, gradeResult] = await Promise.all([
    subjectIds.length ? admin.from("subjects").select("id,name_hy,code").in("id", subjectIds) : { data:[], error:null },
    gradeIds.length ? admin.from("grades").select("id,grade_number,label_hy").in("id", gradeIds) : { data:[], error:null },
  ]);
  if (subjectResult.error) throw subjectResult.error;
  if (gradeResult.error) throw gradeResult.error;
  const subjects = new Map((subjectResult.data ?? []).map((row: any) => [row.id, row.name_hy || row.code]));
  const grades = new Map((gradeResult.data ?? []).map((row: any) => [row.id, row.label_hy || `${row.grade_number}-րդ դասարան`]));
  const studentsByClass = new Map<string, Set<string>>();
  for (const enrollment of enrollmentResult.data ?? []) {
    if (!studentsByClass.has(enrollment.class_id)) studentsByClass.set(enrollment.class_id, new Set());
    studentsByClass.get(enrollment.class_id)?.add(enrollment.student_id);
  }
  const subjectsByMembership = new Map<string, string[]>();
  for (const authorization of authorizationResult.data ?? []) {
    const list = subjectsByMembership.get(authorization.teacher_membership_id) ?? [];
    list.push(subjects.get(authorization.subject_id) || "Առարկա");
    subjectsByMembership.set(authorization.teacher_membership_id, list);
  }
  const classesByMembership = new Map<string, any[]>();
  for (const assignment of assignmentResult.data ?? []) {
    const klass = classById.get(assignment.class_id);
    if (!klass) continue;
    const list = classesByMembership.get(assignment.teacher_membership_id) ?? [];
    list.push({
      id:klass.id, name:klass.name, gradeLabel:grades.get(klass.grade_id) ?? null,
      subjectName:subjects.get(klass.subject_id) ?? null, academicYear:years.get(klass.academic_year_id)?.label ?? null,
      active:Boolean(klass.is_active), studentCount:studentsByClass.get(klass.id)?.size ?? 0,
    });
    classesByMembership.set(assignment.teacher_membership_id, list);
  }
  const admins = memberships.filter((row: any) => row.role === "school_admin").map((row: any) => ({ ...profileById.get(row.person_id), membershipId:row.id, membershipStatus:row.status }));
  const teachers = memberships.filter((row: any) => row.role === "teacher").map((row: any) => ({ ...profileById.get(row.person_id), membershipId:row.id, membershipStatus:row.status, subjects:[...new Set(subjectsByMembership.get(row.id) ?? [])], classes:classesByMembership.get(row.id) ?? [] }));
  const uniqueStudents = new Set((enrollmentResult.data ?? []).map((row: any) => row.student_id));
  return {
    actor:{ id:actorId, role:actor.role }, school:{ id:schoolResult.data.id, name:schoolResult.data.name, schoolCode:schoolResult.data.school_code },
    admins, teachers, classCount:new Set((assignmentResult.data ?? []).map((row: any) => row.class_id)).size, studentCount:uniqueStudents.size,
  };
}

async function classStudents(admin: any, actor: any, actorId: string, body: any) {
  const schoolId = String(body.schoolId ?? "");
  const classId = String(body.classId ?? "");
  const page = clamp(body.page, 1, 1, 100000);
  const pageSize = clamp(body.pageSize, 20, 5, 50);
  const { data: klass, error: classError } = await admin.from("classes").select("id,name,school_id").eq("id", classId).eq("school_id", schoolId).maybeSingle();
  if (classError) throw classError;
  if (!klass) return json({ error:"class_not_found" }, 404);
  const { data: enrollments, count, error } = await admin.from("institutional_class_enrollments")
    .select("student_id", { count:"exact" }).eq("school_id", schoolId).eq("class_id", classId).eq("status", "active")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  const students = await profileUsersByIds(admin, (enrollments ?? []).map((row: any) => row.student_id));
  return { actor:{ id:actorId, role:actor.role }, className:klass.name, students, page, pageSize, total:count ?? 0 };
}

async function accounts(admin: any, actor: any, actorId: string, body: any) {
  const page = clamp(body.page, 1, 1, 100000);
  const pageSize = clamp(body.pageSize, 20, 5, 50);
  const search = safeSearch(body.search);
  const role = String(body.role ?? "");
  const status = String(body.status ?? "");
  const archived = Boolean(body.archived);
  let query = admin.from("profiles").select("id,role,display_name,account_status,created_at,status_changed_at", { count:"exact" }).order("created_at", { ascending:false });
  query = archived ? query.eq("account_status", "archived") : query.neq("account_status", "archived");
  if (role) query = query.eq("role", role);
  if (status) query = query.eq("account_status", status);
  if (search && !search.includes("@")) query = query.ilike("display_name", `%${search}%`);
  if (search.includes("@")) {
    const ids = await authIdsByEmailSearch(admin, search);
    if (!ids.length) return { actor:{ id:actorId, role:actor.role }, users:[], page, pageSize, total:0 };
    query = query.in("id", ids);
  }
  const { data: profiles, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { actor:{ id:actorId, role:actor.role }, users:await usersForProfiles(admin, profiles ?? []), page, pageSize, total:count ?? 0 };
}

async function deletions(admin: any, actor: any, actorId: string) {
  const { data, error } = await admin.from("account_deletion_requests")
    .select("id,user_id,requester_user_id,status,requested_at,resolved_at,resolved_by,resolution_code")
    .order("requested_at", { ascending:false }).limit(100);
  if (error) throw error;
  const ids = (data ?? []).flatMap((request: any) => [request.user_id, request.requester_user_id, request.resolved_by]).filter(Boolean);
  return { actor:{ id:actorId, role:actor.role }, deletionRequests:data ?? [], users:await profileUsersByIds(admin, ids) };
}

async function audit(admin: any, actor: any, actorId: string) {
  const { data, error } = await admin.from("security_audit_log")
    .select("id,actor_user_id,actor_role,action,outcome,target_user_id,target_type,target_key,details,created_at")
    .order("created_at", { ascending:false }).limit(100);
  if (error) throw error;
  const ids = (data ?? []).flatMap((event: any) => [event.actor_user_id, event.target_user_id]).filter(Boolean);
  return { actor:{ id:actorId, role:actor.role }, auditEvents:data ?? [], users:await profileUsersByIds(admin, ids) };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers:corsHeaders });
    if (req.method !== "POST") return json({ error:"method_not_allowed" }, 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey) return json({ error:"server_not_configured" }, 500);
    if (!authHeader) return json({ error:"unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth:{ persistSession:false, autoRefreshToken:false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data:userData, error:userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error:"unauthorized" }, 401);
    const actorId = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actorId))) return json({ error:"account_or_session_inactive" }, 403);
    const { data:actor, error:actorError } = await admin.from("profiles").select("role,display_name,account_status").eq("id", actorId).maybeSingle();
    if (actorError || !actor || String(actor.role) !== "admin" || actor.account_status !== "active") return json({ error:"admin_required" }, 403);
    if (jwtPayload(token).aal !== "aal2") return json({ error:"mfa_required" }, 403);
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const view = String(body.view ?? "overview");
    if (view === "overview") return json(await overview(admin, actor, actorId));
    if (view === "schools") return json(await schoolDirectory(admin, actor, actorId, body));
    if (view === "school_detail") {
      const result = await schoolDetail(admin, actor, actorId, body);
      return result instanceof Response ? result : json(result);
    }
    if (view === "class_students") {
      const result = await classStudents(admin, actor, actorId, body);
      return result instanceof Response ? result : json(result);
    }
    if (view === "accounts") return json(await accounts(admin, actor, actorId, body));
    if (view === "deletions") return json(await deletions(admin, actor, actorId));
    if (view === "audit") return json(await audit(admin, actor, actorId));
    return json({ error:"invalid_view" }, 400);
  } catch (err) {
    console.error("get-admin-dashboard", err);
    return json({ error:"admin_dashboard_failed", detail:err instanceof Error ? err.message : String(err) }, 500);
  }
});
