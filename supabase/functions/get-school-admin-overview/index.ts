import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

type TimedRow = {
  status?: string;
  valid_from?: string | null;
  valid_to?: string | null;
};

function isCurrent(row: TimedRow, now = Date.now()) {
  if (row.status && row.status !== "active") return false;
  if (row.valid_from && Date.parse(row.valid_from) > now) return false;
  return !row.valid_to || Date.parse(row.valid_to) > now;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
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
      .select("role,display_name,account_status")
      .eq("id", actorId)
      .maybeSingle();
    if (actorError) throw actorError;
    if (!actor || actor.account_status !== "active" || !["admin", "school_admin"].includes(String(actor.role))) {
      return json({ error: "school_admin_required" }, 403);
    }
    if (actor.role === "admin" && jwtPayload(token).aal !== "aal2") {
      return json({ error: "mfa_required" }, 403);
    }

    let allowedSchoolIds: string[] | null = null;
    if (actor.role === "school_admin") {
      const { data: adminMemberships, error } = await admin.from("institutional_memberships")
        .select("school_id,status,valid_from,valid_to")
        .eq("person_id", actorId)
        .eq("role", "school_admin");
      if (error) throw error;
      allowedSchoolIds = unique((adminMemberships ?? [])
        .filter((membership: TimedRow) => isCurrent(membership))
        .map((membership: { school_id: string }) => membership.school_id));
      if (!allowedSchoolIds.length) return json({ error: "school_admin_membership_required" }, 403);
    }

    let schoolQuery = admin.from("schools").select("id,name,school_code").order("name");
    if (allowedSchoolIds) schoolQuery = schoolQuery.in("id", allowedSchoolIds);
    const { data: schools, error: schoolError } = await schoolQuery;
    if (schoolError) throw schoolError;
    if (!schools?.length) return json({ actor: { id: actorId, role: actor.role }, schools: [] });

    const schoolIds = schools.map((school: { id: string }) => school.id);
    const [membershipResult, classResult, assignmentResult, enrollmentResult,
      authorizationResult, subjectResult, programmeResult, gradeResult, yearResult] = await Promise.all([
      admin.from("institutional_memberships")
        .select("id,school_id,person_id,role,status,valid_from,valid_to").in("school_id", schoolIds),
      admin.from("classes")
        .select("id,school_id,subject_id,grade_id,name,academic_year,academic_year_id,is_active")
        .in("school_id", schoolIds),
      admin.from("teacher_assignments")
        .select("id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from,valid_to")
        .in("school_id", schoolIds),
      admin.from("institutional_class_enrollments")
        .select("id,school_id,class_id,student_id,status,valid_from,valid_to")
        .in("school_id", schoolIds),
      admin.from("teacher_subject_authorizations")
        .select("id,school_id,teacher_membership_id,subject_id,status,valid_from,valid_to")
        .in("school_id", schoolIds),
      admin.from("subjects").select("id,code,name_hy,name_en"),
      admin.from("subject_programs").select("id,subject_id,grade_id,version_label"),
      admin.from("grades").select("id,grade_number,label_hy,label_en"),
      admin.from("academic_years").select("id,school_id,label,status").in("school_id", schoolIds),
    ]);

    const failures = [membershipResult, classResult, assignmentResult, enrollmentResult,
      authorizationResult, subjectResult, programmeResult, gradeResult, yearResult]
      .map((result) => result.error).filter(Boolean);
    if (failures.length) throw failures[0];

    const memberships = (membershipResult.data ?? []).filter((row: TimedRow) => isCurrent(row));
    const assignments = (assignmentResult.data ?? []).filter((row: TimedRow) => isCurrent(row));
    const enrollments = (enrollmentResult.data ?? []).filter((row: TimedRow) => isCurrent(row));
    const authorizations = (authorizationResult.data ?? []).filter((row: TimedRow) => isCurrent(row));
    const classes = (classResult.data ?? []).filter((row: { is_active: boolean }) => row.is_active);

    const personIds = unique(memberships.map((membership: { person_id: string }) => membership.person_id));
    const profileResult = personIds.length
      ? await admin.from("profiles").select("id,display_name,account_status").in("id", personIds)
      : { data: [], error: null };
    if (profileResult.error) throw profileResult.error;

    const authUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsers.error) throw authUsers.error;

    const profileById = new Map((profileResult.data ?? []).map((profile: any) => [profile.id, profile]));
    const authById = new Map((authUsers.data.users ?? []).map((user: any) => [user.id, user]));
    const subjectById = new Map((subjectResult.data ?? []).map((subject: any) => [subject.id, subject]));
    const programmeById = new Map((programmeResult.data ?? []).map((programme: any) => [programme.id, programme]));
    const gradeById = new Map((gradeResult.data ?? []).map((grade: any) => [grade.id, grade]));
    const yearById = new Map((yearResult.data ?? []).map((year: any) => [year.id, year]));
    const classById = new Map(classes.map((klass: any) => [klass.id, klass]));

    const personSummary = (personId: string) => {
      const profile: any = profileById.get(personId);
      const authUser: any = authById.get(personId);
      return {
        id: personId,
        displayName: profile?.display_name || authUser?.email || "Անանուն հաշիվ",
        email: authUser?.email ?? null,
        accountStatus: profile?.account_status ?? "unknown",
      };
    };

    const schoolPayload = schools.map((school: any) => {
      const schoolMemberships = memberships.filter((row: any) => row.school_id === school.id);
      const teacherMemberships = schoolMemberships.filter((row: any) => row.role === "teacher");
      const studentMemberships = schoolMemberships.filter((row: any) => row.role === "student");
      const schoolClasses = classes.filter((row: any) => row.school_id === school.id);
      const schoolAssignments = assignments.filter((row: any) => row.school_id === school.id);
      const schoolEnrollments = enrollments.filter((row: any) => row.school_id === school.id);
      const schoolAuthorizations = authorizations.filter((row: any) => row.school_id === school.id);
      const assignedClassIds = new Set(schoolAssignments.map((row: any) => row.class_id));

      const classSummary = (assignment: any) => {
        const klass: any = classById.get(assignment.class_id);
        const programme: any = programmeById.get(assignment.subject_program_id);
        const subject: any = subjectById.get(programme?.subject_id || klass?.subject_id);
        const grade: any = gradeById.get(programme?.grade_id || klass?.grade_id);
        const year: any = yearById.get(assignment.academic_year_id || klass?.academic_year_id);
        const classEnrollments = schoolEnrollments.filter((row: any) => row.class_id === assignment.class_id);
        return {
          id: assignment.class_id,
          assignmentId: assignment.id,
          name: klass?.name || "Անվանում չունեցող դասարան",
          subject: subject ? { id: subject.id, code: subject.code, name: subject.name_hy || subject.name_en || subject.code } : null,
          grade: grade ? { id: grade.id, number: grade.grade_number, label: grade.label_hy || grade.label_en || `${grade.grade_number}` } : null,
          academicYear: year?.label || klass?.academic_year || null,
          students: classEnrollments.map((row: any) => personSummary(row.student_id)),
        };
      };

      const teachers = teacherMemberships.map((membership: any) => {
        const teacherAuthorizations = schoolAuthorizations.filter((row: any) => row.teacher_membership_id === membership.id);
        const teacherAssignments = schoolAssignments.filter((row: any) => row.teacher_membership_id === membership.id);
        return {
          ...personSummary(membership.person_id),
          membershipId: membership.id,
          subjects: teacherAuthorizations.map((row: any) => {
            const subject: any = subjectById.get(row.subject_id);
            return subject ? { id: subject.id, code: subject.code, name: subject.name_hy || subject.name_en || subject.code } : null;
          }).filter(Boolean),
          classes: teacherAssignments.map(classSummary),
        };
      });

      const activeSubjectIds = unique([
        ...schoolAuthorizations.map((row: any) => row.subject_id),
        ...schoolAssignments.map((row: any) => (programmeById.get(row.subject_program_id) as any)?.subject_id).filter(Boolean),
      ]);
      const activeStudentIds = unique(schoolEnrollments.map((row: any) => row.student_id));
      const unassignedClasses = schoolClasses.filter((klass: any) => !assignedClassIds.has(klass.id)).map((klass: any) => ({
        id: klass.id,
        name: klass.name,
        academicYear: (yearById.get(klass.academic_year_id) as any)?.label || klass.academic_year || null,
        grade: gradeById.get(klass.grade_id) || null,
        subject: subjectById.get(klass.subject_id) || null,
      }));

      return {
        id: school.id,
        name: school.name,
        schoolCode: school.school_code,
        counts: {
          teachers: teacherMemberships.length,
          classes: schoolClasses.length,
          students: activeStudentIds.length,
          subjects: activeSubjectIds.length,
          activeAssignments: schoolAssignments.length,
          unassignedStudentMemberships: studentMemberships.filter((row: any) => !activeStudentIds.includes(row.person_id)).length,
        },
        teachers,
        unassignedClasses,
      };
    });

    return json({
      actor: { id: actorId, role: actor.role, displayName: actor.display_name ?? null },
      generatedAt: new Date().toISOString(),
      schools: schoolPayload,
      performanceAnalyticsAvailable: false,
    });
  } catch (error) {
    console.error("get-school-admin-overview", error);
    return json({ error: "school_admin_overview_failed" }, 500);
  }
});
