import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";
import { aggregateSchoolPerformanceAnalytics } from "../_shared/school-performance-analytics.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

type TimedRow = { status?: string; valid_from?: string | null; valid_to?: string | null };

function isCurrent(row: TimedRow, now = Date.now()) {
  if (row.status && row.status !== "active") return false;
  if (row.valid_from && Date.parse(row.valid_from) > now) return false;
  return !row.valid_to || Date.parse(row.valid_to) > now;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function requireRows(result: any): any[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

async function paged(factory: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const page = requireRows(await factory(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function chunks<T>(values: T[], size = 100): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function jwtPayload(token: string): Record<string, unknown> {
  try {
    const encoded = token.split(".")[1] || "";
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch {
    return {};
  }
}

function programmeLabel(programme: any, subject: any, grade: any): string {
  const subjectName = subject?.name_hy || subject?.name_en || subject?.code || "Առարկա";
  const gradeName = grade?.label_hy || grade?.label_en || (grade?.grade_number ? `${grade.grade_number}-րդ դասարան` : "");
  return [subjectName, gradeName].filter(Boolean).join(" · ");
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
    const actorId = userData.user.id;
    if (!(await hasActiveLiveSession(admin, token, actorId))) {
      return json({ error: "account_or_session_inactive" }, 403);
    }

    const { data: actor, error: actorError } = await admin.from("profiles")
      .select("role,account_status").eq("id", actorId).maybeSingle();
    if (actorError) throw actorError;
    if (!actor || actor.account_status !== "active" || !["admin", "school_admin"].includes(String(actor.role))) {
      return json({ error: "school_admin_required" }, 403);
    }
    if (actor.role === "admin" && jwtPayload(token).aal !== "aal2") return json({ error: "mfa_required" }, 403);

    const body = await req.json().catch(() => ({}));
    const schoolId = typeof body?.schoolId === "string" ? body.schoolId : "";
    const requestedYearId = typeof body?.academicYearId === "string" ? body.academicYearId : "";
    const requestedProgrammeId = typeof body?.subjectProgramId === "string" ? body.subjectProgramId : "";
    const requestedReleaseId = typeof body?.curriculumReleaseId === "string" ? body.curriculumReleaseId : "";
    const requestedUnitId = typeof body?.unitId === "string" ? body.unitId : "";
    const requestedClassId = typeof body?.classId === "string" ? body.classId : "";
    if (!schoolId) return json({ error: "school_required" }, 400);

    if (actor.role === "school_admin") {
      const memberships = requireRows(await admin.from("institutional_memberships")
        .select("school_id,status,valid_from,valid_to")
        .eq("person_id", actorId).eq("role", "school_admin"));
      if (!memberships.some((membership: any) => membership.school_id === schoolId && isCurrent(membership))) {
        return json({ error: "analytics_scope_unavailable" }, 403);
      }
    } else {
      const school = requireRows(await admin.from("schools").select("id").eq("id", schoolId));
      if (!school.length) return json({ error: "analytics_scope_unavailable" }, 403);
    }

    const years = requireRows(await admin.from("academic_years")
      .select("id,label,status,starts_on,ends_on").eq("school_id", schoolId)
      .order("starts_on", { ascending: false }));
    const selectedYear = requestedYearId
      ? years.find((row: any) => row.id === requestedYearId)
      : years.find((row: any) => row.status === "active") ?? years[0] ?? null;
    if (requestedYearId && !selectedYear) return json({ error: "analytics_scope_unavailable" }, 403);
    if (!selectedYear) {
      return json({
        generatedAt: new Date().toISOString(), scope: { schoolId, academicYearId: null, subjectProgramId: null, classId: null },
        options: { academicYears: [], programmes: [], classes: [] },
        analytics: aggregateSchoolPerformanceAnalytics({ enrollments: [], sessions: [], reviewSessions: [] }),
      });
    }

    const [assignmentRows, classRows, enrollmentRows] = await Promise.all([
      paged((from, to) => admin.from("teacher_assignments")
        .select("id,class_id,subject_program_id,status,valid_from,valid_to")
        .eq("school_id", schoolId).eq("academic_year_id", selectedYear.id).range(from, to)),
      paged((from, to) => admin.from("classes")
        .select("id,name,subject_id,grade_id,is_active")
        .eq("school_id", schoolId).eq("academic_year_id", selectedYear.id).range(from, to)),
      paged((from, to) => admin.from("institutional_class_enrollments")
        .select("id,student_id,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id,status,valid_from,valid_to")
        .eq("school_id", schoolId).eq("academic_year_id", selectedYear.id).range(from, to)),
    ]);
    // Retain the original year enrollment denominators and evidence after closure.
    // Revoked and future records do not enter a historical cohort.
    const inYear = (row: any) => ["active","ended"].includes(row.status) && Number.isFinite(Date.parse(row.valid_from)) && row.valid_from.slice(0,10) <= selectedYear.ends_on && (row.valid_to == null || row.valid_to.slice(0,10) >= selectedYear.starts_on);
    const currentAssignments = assignmentRows.filter(inYear);
    const currentEnrollments = enrollmentRows.filter(inYear);
    const programmeIds = unique([
      ...currentAssignments.map((row: any) => row.subject_program_id),
      ...currentEnrollments.map((row: any) => row.subject_program_id),
    ].filter(Boolean));
    const programmes = programmeIds.length ? requireRows(await admin.from("subject_programs")
      .select("id,subject_id,grade_id,version_label").in("id", programmeIds)) : [];
    const subjectIds = unique(programmes.map((row: any) => row.subject_id).filter(Boolean));
    const gradeIds = unique(programmes.map((row: any) => row.grade_id).filter(Boolean));
    const [subjects, grades] = await Promise.all([
      subjectIds.length ? admin.from("subjects").select("id,code,name_hy,name_en").in("id", subjectIds) : Promise.resolve({ data: [], error: null }),
      gradeIds.length ? admin.from("grades").select("id,grade_number,label_hy,label_en").in("id", gradeIds) : Promise.resolve({ data: [], error: null }),
    ]).then((results) => results.map(requireRows));
    const subjectById = new Map(subjects.map((row: any) => [row.id, row]));
    const gradeById = new Map(grades.map((row: any) => [row.id, row]));
    const programmeById = new Map(programmes.map((row: any) => [row.id, row]));

    if (requestedProgrammeId && !programmeById.has(requestedProgrammeId)) {
      return json({ error: "analytics_scope_unavailable" }, 403);
    }
    const classById = new Map(classRows.map((row: any) => [row.id, row]));
    if (requestedClassId && !classById.has(requestedClassId)) {
      return json({ error: "analytics_scope_unavailable" }, 403);
    }
    if (requestedClassId && requestedProgrammeId) {
      const pairExists = currentAssignments.some((row: any) => row.class_id === requestedClassId && row.subject_program_id === requestedProgrammeId)
        || currentEnrollments.some((row: any) => row.class_id === requestedClassId && row.subject_program_id === requestedProgrammeId);
      if (!pairExists) return json({ error: "analytics_scope_unavailable" }, 403);
    }

    const releases = programmeIds.length ? requireRows(await admin.from("curriculum_releases").select("id,subject_program_id,release_number,status").in("subject_program_id",programmeIds).in("status",["pilot","production","retired"])) : [];
    const permittedReleases = releases.filter(row => !requestedProgrammeId || row.subject_program_id === requestedProgrammeId);
    const releasedUnits = permittedReleases.length ? requireRows(await admin.from("curriculum_release_units").select("curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,sequence_order_snapshot").in("curriculum_release_id",permittedReleases.map(row=>row.id))) : [];
    if (requestedReleaseId && !permittedReleases.some(row=>row.id===requestedReleaseId)) return json({error:"analytics_scope_unavailable"},403);
    if (requestedUnitId && (!requestedReleaseId || !releasedUnits.some(row=>row.curriculum_release_id===requestedReleaseId && row.unit_id===requestedUnitId))) return json({error:"analytics_scope_unavailable"},403);
    const selectedUnit = releasedUnits.find(row=>row.curriculum_release_id===requestedReleaseId && row.unit_id===requestedUnitId);
    const selectedEnrollments = currentEnrollments.filter((row: any) =>
      (!requestedProgrammeId || row.subject_program_id === requestedProgrammeId)
      && (!requestedReleaseId || releases.some(release=>release.id===requestedReleaseId && release.subject_program_id===row.subject_program_id))
      && (!requestedClassId || row.class_id === requestedClassId));
    const enrollmentIds = selectedEnrollments.map((row: any) => row.id);
    const sessions: any[] = [];
    for (const ids of chunks(enrollmentIds)) {
      sessions.push(...await paged((from, to) => {
        let query = admin.from("learning_sessions")
          .select("id,institutional_class_enrollment_id,student_id,curriculum_release_id,unit_code,mode,status,answered_count,correct_count,assessment_result,metadata,academic_context_status,started_at,completed_at,governed_unit_id,assessment_blueprint_id,assessment_policy_binding_id,learning_model_configuration_id,academic_mastery_policy_id,runtime_build_id,provenance_status,model_provenance_status,runtime_provenance_status,school_id,academic_year_id,class_id,teacher_assignment_id,subject_program_id")
          .eq("school_id", schoolId).eq("academic_year_id", selectedYear.id)
          .eq("academic_context_status", "exact").in("institutional_class_enrollment_id", ids);
        if (requestedReleaseId) query = query.eq("curriculum_release_id",requestedReleaseId);
        if (selectedUnit) query = query.eq("unit_code",selectedUnit.unit_code_snapshot);
        if (requestedProgrammeId) query = query.eq("subject_program_id", requestedProgrammeId);
        if (requestedClassId) query = query.eq("class_id", requestedClassId);
        return query.order("started_at", { ascending: false }).range(from, to);
      }));
    }
    if (selectedUnit) {
      const selectedBlueprints = requireRows(await admin.from("assessment_blueprints").select("id").eq("curriculum_release_id",requestedReleaseId).eq("unit_id",requestedUnitId));
      const ids = new Set(selectedBlueprints.map(row=>row.id));
      for (let index=sessions.length-1;index>=0;index--) if (sessions[index].governed_unit_id !== requestedUnitId && !(sessions[index].governed_unit_id == null && ids.has(sessions[index].assessment_blueprint_id))) sessions.splice(index,1);
    }
    const reviewSessions: any[] = [];
    for (const ids of chunks(sessions.map((row: any) => row.id))) {
      reviewSessions.push(...await paged((from, to) => admin.from("chapter_review_sessions")
        .select("id,learning_session_id,status,qualifying").in("learning_session_id", ids).range(from, to)));
    }

    const classProgrammeIds = new Map<string, Set<string>>();
    for (const row of [...currentAssignments, ...currentEnrollments]) {
      const values = classProgrammeIds.get(row.class_id) ?? new Set<string>();
      if (row.subject_program_id) values.add(row.subject_program_id);
      classProgrammeIds.set(row.class_id, values);
    }
    const programmeOptions = programmes.map((row: any) => ({
      id: row.id,
      label: programmeLabel(row, subjectById.get(row.subject_id), gradeById.get(row.grade_id)),
      subjectId: row.subject_id,
      gradeId: row.grade_id,
      versionLabel: row.version_label,
    })).sort((a: any, b: any) => a.label.localeCompare(b.label, "hy"));
    const classOptions = classRows.map((row: any) => ({
      id: row.id,
      name: row.name || "Անվանում չունեցող դասարան",
      isActive: Boolean(row.is_active),
      subjectProgramIds: [...(classProgrammeIds.get(row.id) ?? new Set<string>())],
    })).sort((a: any, b: any) => a.name.localeCompare(b.name, "hy"));

    // Revalidate the account, live session and current school entitlement after all reads.
    if (!(await hasActiveLiveSession(admin, token, actorId))) return json({error:"account_or_session_inactive"},403);
    const finalActor = await admin.from("profiles").select("role,account_status").eq("id",actorId).maybeSingle();
    if (finalActor.error || finalActor.data?.role !== actor.role || finalActor.data?.account_status !== "active") return json({error:"analytics_scope_unavailable"},403);
    if (actor.role === "school_admin") {
      const finalMemberships = requireRows(await admin.from("institutional_memberships").select("school_id,status,valid_from,valid_to").eq("person_id",actorId).eq("role","school_admin"));
      if (!finalMemberships.some(row=>row.school_id===schoolId && isCurrent(row))) return json({error:"analytics_scope_unavailable"},403);
    }
    return json({
      generatedAt: new Date().toISOString(),
      scope: {
        schoolId,
        academicYearId: selectedYear.id,
        subjectProgramId: requestedProgrammeId || null,
        classId: requestedClassId || null,
        curriculumReleaseId: requestedReleaseId || null, unitId: requestedUnitId || null,
        history: selectedYear.status !== "active", denominator: "enrollments_in_selected_academic_year",
      },
      options: {
        academicYears: years.map((row: any) => ({ id: row.id, label: row.label, status: row.status })),
        programmes: programmeOptions,
        classes: classOptions,
        releases: permittedReleases.map(row=>({id:row.id,label:`Թողարկում ${row.release_number}`,subjectProgramId:row.subject_program_id,status:row.status})),
        units: releasedUnits.map(row=>({id:row.unit_id,curriculumReleaseId:row.curriculum_release_id,label:row.title_hy_snapshot,sequenceOrder:row.sequence_order_snapshot})),
      },
      analytics: aggregateSchoolPerformanceAnalytics({
        enrollments: selectedEnrollments,
        sessions,
        reviewSessions,
      }),
    });
  } catch (error) {
    console.error("get-school-performance-analytics", error);
    return json({ error: "school_performance_analytics_failed" }, 500);
  }
});
