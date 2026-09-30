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
        .select("id,student_id,class_id,teacher_assignment_id,subject_program_id,status,valid_from,valid_to")
        .eq("school_id", schoolId).eq("academic_year_id", selectedYear.id).range(from, to)),
    ]);
    const currentAssignments = assignmentRows.filter((row: any) => isCurrent(row));
    const currentEnrollments = enrollmentRows.filter((row: any) => isCurrent(row));
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

    const selectedEnrollments = currentEnrollments.filter((row: any) =>
      (!requestedProgrammeId || row.subject_program_id === requestedProgrammeId)
      && (!requestedClassId || row.class_id === requestedClassId));
    const enrollmentIds = selectedEnrollments.map((row: any) => row.id);
    const sessions: any[] = [];
    for (const ids of chunks(enrollmentIds)) {
      sessions.push(...await paged((from, to) => {
        let query = admin.from("learning_sessions")
          .select("id,institutional_class_enrollment_id,student_id,curriculum_release_id,unit_code,mode,status,answered_count,correct_count,assessment_result,academic_context_status,started_at,completed_at")
          .eq("school_id", schoolId).eq("academic_year_id", selectedYear.id)
          .eq("academic_context_status", "exact").in("institutional_class_enrollment_id", ids);
        if (requestedProgrammeId) query = query.eq("subject_program_id", requestedProgrammeId);
        if (requestedClassId) query = query.eq("class_id", requestedClassId);
        return query.order("started_at", { ascending: false }).range(from, to);
      }));
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

    return json({
      generatedAt: new Date().toISOString(),
      scope: {
        schoolId,
        academicYearId: selectedYear.id,
        subjectProgramId: requestedProgrammeId || null,
        classId: requestedClassId || null,
      },
      options: {
        academicYears: years.map((row: any) => ({ id: row.id, label: row.label, status: row.status })),
        programmes: programmeOptions,
        classes: classOptions,
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
