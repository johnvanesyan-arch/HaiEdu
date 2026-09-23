export type StudentCourseEntitlement = {
  classId: string;
  className: string;
  academicYear: string | null;
  joinedAt: string;
  subjectId: string;
  subjectCode: string;
  subjectNameHy: string;
  gradeId: string;
  gradeNumber: number;
  gradeLabelHy: string;
};

export const PHYSICS_7_SCOPE = {
  subjectCode: "physics",
  gradeNumber: 7,
} as const;

export async function getStudentCourseEntitlements(
  admin: any,
  studentId: string,
): Promise<StudentCourseEntitlement[]> {
  const { data: memberships, error: membershipError } = await admin
    .from("class_memberships")
    .select("class_id, joined_at")
    .eq("student_id", studentId)
    .order("joined_at", { ascending: false });

  if (membershipError) throw new Error(`class_memberships_unavailable:${membershipError.message}`);
  if (!memberships?.length) return [];

  const classIds = [...new Set(memberships.map((row: any) => String(row.class_id)))];
  const { data: classes, error: classesError } = await admin
    .from("classes")
    .select("id, name, academic_year, is_active, subject_id, grade_id")
    .in("id", classIds)
    .eq("is_active", true);

  if (classesError) throw new Error(`classes_unavailable:${classesError.message}`);
  if (!classes?.length) return [];

  const subjectIds = [...new Set(classes.map((row: any) => String(row.subject_id)))];
  const gradeIds = [...new Set(classes.map((row: any) => String(row.grade_id)))];

  const [{ data: subjects, error: subjectsError }, { data: grades, error: gradesError }] = await Promise.all([
    admin.from("subjects").select("id, code, name_hy").in("id", subjectIds),
    admin.from("grades").select("id, grade_number, label_hy").in("id", gradeIds),
  ]);

  if (subjectsError) throw new Error(`subjects_unavailable:${subjectsError.message}`);
  if (gradesError) throw new Error(`grades_unavailable:${gradesError.message}`);

  const classById = new Map(classes.map((row: any) => [String(row.id), row]));
  const subjectById = new Map((subjects ?? []).map((row: any) => [String(row.id), row]));
  const gradeById = new Map((grades ?? []).map((row: any) => [String(row.id), row]));

  return memberships.flatMap((membership: any) => {
    const klass = classById.get(String(membership.class_id));
    if (!klass) return [];
    const subject = subjectById.get(String(klass.subject_id));
    const grade = gradeById.get(String(klass.grade_id));
    if (!subject || !grade) return [];

    return [{
      classId: String(klass.id),
      className: String(klass.name),
      academicYear: klass.academic_year ? String(klass.academic_year) : null,
      joinedAt: String(membership.joined_at),
      subjectId: String(subject.id),
      subjectCode: String(subject.code),
      subjectNameHy: String(subject.name_hy),
      gradeId: String(grade.id),
      gradeNumber: Number(grade.grade_number),
      gradeLabelHy: String(grade.label_hy),
    }];
  });
}

export async function hasCourseAccess(
  admin: any,
  studentId: string,
  subjectCode: string,
  gradeNumber: number,
): Promise<boolean> {
  const entitlements = await getStudentCourseEntitlements(admin, studentId);
  return entitlements.some((course) =>
    course.subjectCode === subjectCode && course.gradeNumber === gradeNumber
  );
}

export async function hasPhysics7Access(admin: any, studentId: string): Promise<boolean> {
  return hasCourseAccess(admin, studentId, PHYSICS_7_SCOPE.subjectCode, PHYSICS_7_SCOPE.gradeNumber);
}
