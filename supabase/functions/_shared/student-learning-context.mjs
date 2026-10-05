// Read-only institutional context. Never infer a class or subject from a route.
export class StudentLearningContextDenied extends Error {
  constructor() { super('learning_context_unavailable'); }
}

function activeAt(row, now) {
  const start = Date.parse(row?.valid_from);
  const end = row?.valid_to == null ? Infinity : Date.parse(row.valid_to);
  return row?.status === 'active' && Number.isFinite(start) && start <= now.getTime() && now.getTime() < end;
}
function currentDates(row, today) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
  return (!row.effective_from || (valid(row.effective_from) && row.effective_from <= today)) &&
    (!row.effective_to || (valid(row.effective_to) && today <= row.effective_to));
}
async function one(admin, table, columns, filters) {
  let query = admin.from(table).select(columns);
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new StudentLearningContextDenied();
  return data;
}

export async function resolveAuthorizedStudentLearningContext(admin, studentId, selection, now = new Date()) {
  if (!studentId || !selection?.enrollmentId || !selection.curriculumReleaseId || !selection.unitId || !Number.isFinite(now.getTime())) {
    throw new StudentLearningContextDenied();
  }
  const enrollment = await one(admin, 'institutional_class_enrollments',
    'id,school_id,academic_year_id,class_id,student_membership_id,student_id,teacher_assignment_id,subject_program_id,status,valid_from,valid_to',
    { id: selection.enrollmentId, student_id: studentId });
  if (!activeAt(enrollment, now)) throw new StudentLearningContextDenied();
  const [student, membership, assignment, klass, year, programme, release, unit, snapshot] = await Promise.all([
    one(admin, 'profiles', 'id,role,account_status', { id: studentId }),
    one(admin, 'institutional_memberships', 'id,school_id,person_id,role,status,valid_from,valid_to', { id: enrollment.student_membership_id }),
    one(admin, 'teacher_assignments', 'id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from,valid_to', { id: enrollment.teacher_assignment_id }),
    one(admin, 'classes', 'id,school_id,academic_year_id,subject_id,grade_id,is_active', { id: enrollment.class_id }),
    one(admin, 'academic_years', 'id,school_id,status,starts_on,ends_on', { id: enrollment.academic_year_id }),
    one(admin, 'subject_programs', 'id,subject_id,grade_id,status,effective_from,effective_to', { id: enrollment.subject_program_id }),
    one(admin, 'curriculum_releases', 'id,subject_program_id,status,effective_from,effective_to', { id: selection.curriculumReleaseId }),
    one(admin, 'units', 'id,subject_program_id', { id: selection.unitId }),
    one(admin, 'curriculum_release_units', 'curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,sequence_order_snapshot',
      { curriculum_release_id: selection.curriculumReleaseId, unit_id: selection.unitId }),
  ]);
  const today = now.toISOString().slice(0, 10);
  if (student.role !== 'student' || student.account_status !== 'active' ||
      membership.person_id !== studentId || membership.role !== 'student' || membership.school_id !== enrollment.school_id || !activeAt(membership, now) ||
      !activeAt(assignment, now) || assignment.school_id !== enrollment.school_id || assignment.academic_year_id !== enrollment.academic_year_id ||
      assignment.class_id !== klass.id || assignment.subject_program_id !== programme.id ||
      klass.school_id !== enrollment.school_id || klass.academic_year_id !== year.id || klass.is_active !== true ||
      year.school_id !== enrollment.school_id || year.status !== 'active' ||
      typeof year.starts_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(year.starts_on) || !Number.isFinite(Date.parse(year.starts_on)) ||
      typeof year.ends_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(year.ends_on) || !Number.isFinite(Date.parse(year.ends_on)) ||
      today < year.starts_on || today > year.ends_on ||
      programme.status !== 'published' || !currentDates(programme, today) ||
      klass.subject_id !== programme.subject_id || klass.grade_id !== programme.grade_id ||
      release.subject_program_id !== programme.id || unit.subject_program_id !== programme.id ||
      !['pilot', 'production'].includes(release.status) || !currentDates(release, today) ||
      typeof snapshot.unit_code_snapshot !== 'string' || !snapshot.unit_code_snapshot.trim() ||
      typeof snapshot.title_hy_snapshot !== 'string' || !snapshot.title_hy_snapshot.trim() ||
      !Number.isInteger(snapshot.sequence_order_snapshot) || snapshot.sequence_order_snapshot < 1) throw new StudentLearningContextDenied();

  const [teacherMembership, subject, grade] = await Promise.all([
    one(admin, 'institutional_memberships', 'id,school_id,person_id,role,status,valid_from,valid_to', { id: assignment.teacher_membership_id }),
    one(admin, 'subjects', 'id,code,name_hy,status', { id: programme.subject_id }),
    one(admin, 'grades', 'id,grade_number,label_hy', { id: programme.grade_id }),
  ]);
  if (teacherMembership.school_id !== enrollment.school_id || teacherMembership.role !== 'teacher' || !activeAt(teacherMembership, now) ||
      subject.status !== 'published' || !Number.isInteger(grade.grade_number) || grade.grade_number < 1) throw new StudentLearningContextDenied();
  const [teacher] = await Promise.all([
    one(admin, 'profiles', 'id,role,account_status', { id: teacherMembership.person_id }),
    one(admin, 'teacher_subject_authorizations', 'id,status,valid_from,valid_to',
      { school_id: enrollment.school_id, teacher_membership_id: teacherMembership.id, subject_id: programme.subject_id, status: 'active' })
      .then(grant => { if (!activeAt(grant, now)) throw new StudentLearningContextDenied(); }),
  ]);
  if (teacher.role !== 'teacher' || teacher.account_status !== 'active') throw new StudentLearningContextDenied();
  return {
    enrollmentId: enrollment.id, schoolId: enrollment.school_id, academicYearId: year.id, classId: klass.id,
    teacherAssignmentId: assignment.id, subjectProgramId: programme.id, subjectId: subject.id,
    subjectCode: subject.code, subjectNameHy: subject.name_hy, gradeId: grade.id,
    gradeNumber: grade.grade_number, gradeLabelHy: grade.label_hy,
    curriculumReleaseId: release.id, unitId: unit.id, unitCode: snapshot.unit_code_snapshot,
    unitTitleHy: snapshot.title_hy_snapshot, unitSequence: snapshot.sequence_order_snapshot,
  };
}
