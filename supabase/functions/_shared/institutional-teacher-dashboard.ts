// Server-only school teacher summary. The learner runtime and evidence are still
// legacy Physics 7; this response does not expose student histories.
function activeAt(row: any, now: number): boolean {
  const start = Date.parse(String(row.valid_from));
  const end = row.valid_to == null ? Infinity : Date.parse(String(row.valid_to));
  return row.status === "active" && Number.isFinite(start) && start <= now && now < end;
}

function requireRows(result: any): any[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function getInstitutionalTeacherDashboard(
  admin: any, teacherId: string, displayName: string,
) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const memberships = requireRows(await admin.from("institutional_memberships")
    .select("id,school_id,status,valid_from,valid_to")
    .eq("person_id", teacherId).eq("role", "teacher"))
    .filter((m) => activeAt(m, now));
  const membershipIds = memberships.map((m) => m.id);
  const schoolIds = [...new Set(memberships.map((m) => m.school_id))];
  if (!membershipIds.length) return {
    teacher: { id: teacherId, displayName }, institutionalTeacher: true,
    institutionalOptions: [], classes: [],
    totals: { classes: 0, students: 0, studentsNeedingSupport: 0 },
  };

  const [grantsResult, yearsResult, schoolsResult, assignmentsResult] = await Promise.all([
    admin.from("teacher_subject_authorizations")
      .select("id,school_id,teacher_membership_id,subject_id,status,valid_from,valid_to")
      .in("teacher_membership_id", membershipIds).eq("status", "active"),
    admin.from("academic_years")
      .select("id,school_id,label,starts_on,ends_on,status")
      .in("school_id", schoolIds),
    admin.from("schools").select("id,name").in("id", schoolIds),
    admin.from("teacher_assignments")
      .select("id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from,valid_to")
      .in("teacher_membership_id", membershipIds).eq("status", "active"),
  ]);
  const grants = requireRows(grantsResult).filter((g) => activeAt(g, now));
  const years = requireRows(yearsResult);
  const schools = requireRows(schoolsResult);
  const assignments = requireRows(assignmentsResult).filter((a) => activeAt(a, now));
  const subjectIds = [...new Set(grants.map((g) => g.subject_id))];
  const classIds = [...new Set(assignments.map((a) => a.class_id))];

  const [programmesResult, subjectsResult, classesResult, enrollmentsResult] = await Promise.all([
    subjectIds.length
      ? admin.from("subject_programs").select("id,subject_id,grade_id,status")
        .in("subject_id", subjectIds)
      : Promise.resolve({ data: [] }),
    subjectIds.length ? admin.from("subjects")
      .select("id,name_hy,status").in("id", subjectIds) : Promise.resolve({ data: [] }),
    classIds.length ? admin.from("classes")
      .select("id,school_id,academic_year_id,teacher_id,name,is_active,subject_id,grade_id")
      .in("id", classIds) : Promise.resolve({ data: [] }),
    classIds.length ? admin.from("institutional_class_enrollments")
      .select("school_id,academic_year_id,class_id,student_id,subject_program_id,status,valid_from,valid_to")
      .in("class_id", classIds).eq("status", "active") : Promise.resolve({ data: [] }),
  ]);
  const programmes = requireRows(programmesResult);
  const subjects = requireRows(subjectsResult);
  const classes = requireRows(classesResult);
  const enrollments = requireRows(enrollmentsResult).filter((e) => activeAt(e, now));
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const studentProfiles = studentIds.length
    ? requireRows(await admin.from("profiles")
      .select("id,display_name,account_status").in("id", studentIds))
    : [];
  const gradeIds = [...new Set(programmes.map((p) => p.grade_id))];
  const grades = gradeIds.length
    ? requireRows(await admin.from("grades").select("id,grade_number").in("id", gradeIds))
    : [];
  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const yearById = new Map(years.map((y) => [y.id, y]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const programmeById = new Map(programmes.map((p) => [p.id, p]));
  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const classById = new Map(classes.map((c) => [c.id, c]));
  const studentById = new Map<string, any>(studentProfiles.map((profile) => [profile.id, profile]));

  const options = [];
  for (const membership of memberships) {
    const school = schoolById.get(membership.school_id);
    if (!school) continue;
    for (const year of years.filter((y) => y.school_id === membership.school_id
      && y.status === "active" && y.starts_on <= today && today <= y.ends_on)) {
      for (const grant of grants.filter((g) => g.teacher_membership_id === membership.id
        && g.school_id === membership.school_id)) {
        const subject = subjectById.get(grant.subject_id);
        if (subject?.status !== "published") continue;
        for (const programme of programmes.filter((p) => p.subject_id === grant.subject_id
          && p.status === "published")) {
          const grade = gradeById.get(programme.grade_id);
          if (!grade) continue;
          options.push({
            schoolId: school.id, schoolName: school.name,
            teacherMembershipId: membership.id, academicYearId: year.id,
            academicYearLabel: year.label, subjectProgramId: programme.id,
            subjectName: subject.name_hy, gradeNumber: Number(grade.grade_number),
          });
        }
      }
    }
  }

  const classPayload = assignments.flatMap((assignment) => {
    const membership = memberships.find((m) => m.id === assignment.teacher_membership_id);
    const klass = classById.get(assignment.class_id);
    const year = yearById.get(assignment.academic_year_id);
    const programme = programmeById.get(assignment.subject_program_id);
    if (!membership || !klass || !year || !programme ||
      klass.school_id !== membership.school_id ||
      assignment.school_id !== membership.school_id ||
      klass.academic_year_id !== assignment.academic_year_id ||
      klass.teacher_id !== teacherId ||
      klass.subject_id !== programme.subject_id ||
      klass.grade_id !== programme.grade_id) return [];
    const yearIsActive = year.status === "active"
      && year.starts_on <= today && today <= year.ends_on;
    const classEnrollments = enrollments.filter((e) =>
      e.class_id === klass.id && e.school_id === assignment.school_id
      && e.academic_year_id === assignment.academic_year_id
      && e.subject_program_id === assignment.subject_program_id
      && studentById.get(e.student_id)?.account_status === "active");
    return [{
      id: klass.id, name: klass.name, isActive: klass.is_active && yearIsActive,
      academicYear: year.label, schoolName: schoolById.get(klass.school_id)?.name ?? "",
      subjectName: subjectById.get(klass.subject_id)?.name_hy ?? "",
      gradeNumber: Number(gradeById.get(klass.grade_id)?.grade_number ?? 0),
      joinCode: null,
      studentCount: classEnrollments.length,
      students: classEnrollments.map((enrollment) => {
        const profile = studentById.get(enrollment.student_id);
        return {
          id: enrollment.student_id,
          displayName: profile?.display_name?.trim() || "Աշակերտ",
        };
      }),
    }];
  });
  return {
    teacher: { id: teacherId, displayName },
    institutionalTeacher: true, institutionalOptions: options, classes: classPayload,
    totals: {
      classes: classPayload.length,
      students: new Set(classPayload.flatMap((klass) => klass.students.map((student) => student.id))).size,
      studentsNeedingSupport: 0,
    },
  };
}
