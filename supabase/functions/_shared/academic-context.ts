// Sprint 14A server-only resolver. Do not use client URL state as authorization.
export type TeacherAcademicSelection = {
  assignmentId: string;
  curriculumReleaseId: string;
  unitId: string;
};

export type AuthorizedTeacherAcademicContext = {
  assignmentId: string;
  classId: string;
  schoolId: string;
  academicYearId: string;
  subjectProgramId: string;
  curriculumReleaseId: string;
  unitId: string;
  unitCode: string;
  unitSequence: number;
  unitTitleHy: string;
  subjectCode: string;
  subjectNameHy: string;
  gradeNumber: number;
  gradeLabelHy: string | null;
};

export class AcademicContextDenied extends Error {
  constructor() { super("academic_context_unavailable"); }
}

async function row(admin: any, table: string, columns: string, id: string): Promise<any> {
  const { data, error } = await admin.from(table).select(columns).eq("id", id).maybeSingle();
  if (error || !data) throw new AcademicContextDenied();
  return data;
}

async function releaseUnit(admin: any, releaseId: string, unitId: string): Promise<any> {
  const { data, error } = await admin.from("curriculum_release_units")
    .select("curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,sequence_order_snapshot")
    .eq("curriculum_release_id", releaseId).eq("unit_id", unitId).maybeSingle();
  if (error || !data) throw new AcademicContextDenied();
  return data;
}

function activeAt(record: any, now: Date): boolean {
  const start = Date.parse(String(record.valid_from));
  const end = record.valid_to == null ? Infinity : Date.parse(String(record.valid_to));
  return record.status === "active" && Number.isFinite(start) && start <= now.getTime() && now.getTime() < end;
}

export async function resolveAuthorizedTeacherAcademicContext(
  admin: any,
  teacherId: string,
  selection: TeacherAcademicSelection,
  now = new Date(),
): Promise<AuthorizedTeacherAcademicContext> {
  if (!teacherId || !selection?.assignmentId || !selection.curriculumReleaseId || !selection.unitId) {
    throw new AcademicContextDenied();
  }

  const assignment = await row(admin, "teacher_assignments",
    "id, school_id, academic_year_id, class_id, teacher_membership_id, subject_program_id, status, valid_from, valid_to",
    selection.assignmentId);
  if (!activeAt(assignment, now)) throw new AcademicContextDenied();

  const membership = await row(admin, "institutional_memberships",
    "id, school_id, person_id, role, status, valid_from, valid_to", assignment.teacher_membership_id);
  if (membership.person_id !== teacherId || membership.school_id !== assignment.school_id ||
      membership.role !== "teacher" || !activeAt(membership, now)) throw new AcademicContextDenied();

  const [klass, year, programme, release, unit, releaseUnitRow] = await Promise.all([
    row(admin, "classes", "id, school_id, academic_year_id, subject_id, grade_id, is_active", assignment.class_id),
    row(admin, "academic_years", "id, school_id, status, starts_on, ends_on", assignment.academic_year_id),
    row(admin, "subject_programs", "id, subject_id, grade_id", assignment.subject_program_id),
    row(admin, "curriculum_releases", "id, subject_program_id, status, effective_from, effective_to", selection.curriculumReleaseId),
    row(admin, "units", "id, subject_program_id", selection.unitId),
    releaseUnit(admin, selection.curriculumReleaseId, selection.unitId),
  ]);

  const today = now.toISOString().slice(0, 10);
  if (klass.school_id !== assignment.school_id || klass.academic_year_id !== assignment.academic_year_id ||
      klass.is_active !== true || year.school_id !== assignment.school_id || year.status !== "active" ||
      today < year.starts_on || today > year.ends_on ||
      klass.subject_id !== programme.subject_id || klass.grade_id !== programme.grade_id ||
      release.subject_program_id !== programme.id || unit.subject_program_id !== programme.id ||
      !["pilot", "production"].includes(release.status) ||
      (release.effective_from && today < release.effective_from) ||
      (release.effective_to && today > release.effective_to) ||
      !releaseUnitRow.unit_code_snapshot || !releaseUnitRow.title_hy_snapshot ||
      !Number.isFinite(Number(releaseUnitRow.sequence_order_snapshot))) {
    throw new AcademicContextDenied();
  }

  const [subject, grade] = await Promise.all([
    row(admin, "subjects", "id, code, name_hy", programme.subject_id),
    row(admin, "grades", "id, grade_number, label_hy", programme.grade_id),
  ]);
  return {
    assignmentId: assignment.id, classId: klass.id, schoolId: assignment.school_id,
    academicYearId: year.id, subjectProgramId: programme.id,
    curriculumReleaseId: release.id, unitId: unit.id,
    unitCode: releaseUnitRow.unit_code_snapshot,
    unitSequence: Number(releaseUnitRow.sequence_order_snapshot),
    unitTitleHy: releaseUnitRow.title_hy_snapshot,
    subjectCode: subject.code, subjectNameHy: subject.name_hy,
    gradeNumber: Number(grade.grade_number), gradeLabelHy: grade.label_hy,
  };
}
