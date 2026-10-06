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
  readOnlyHistory: boolean;
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


export type TeacherAcademicRows = {
  assignment: any; membership: any; klass: any; year: any; programme: any;
  release: any; unit: any; releaseUnitRow: any; profile: any; grants: any[];
  subject: any; grade: any;
};

// The single authorization contract is used by individual and batched reads.
export function authorizeTeacherAcademicRows(
  teacherId: string, selection: TeacherAcademicSelection, records: TeacherAcademicRows, now = new Date(),
): AuthorizedTeacherAcademicContext {
  const {assignment,membership,klass,year,programme,release,unit,releaseUnitRow,profile,grants,subject,grade}=records;
  if (!teacherId || !selection?.assignmentId || !selection.curriculumReleaseId || !selection.unitId ||
      !assignment || !membership || !klass || !year || !programme || !release || !unit || !releaseUnitRow || !profile || !subject || !grade) throw new AcademicContextDenied();
  const historicalAssignment=assignment.status==="ended" && Number.isFinite(Date.parse(assignment.valid_from)) && Date.parse(assignment.valid_from)<=now.getTime();
  const today=now.toISOString().slice(0,10);
  if (assignment.id!==selection.assignmentId || membership.id!==assignment.teacher_membership_id ||
      (!activeAt(assignment,now) && !historicalAssignment) ||
      membership.person_id!==teacherId || membership.school_id!==assignment.school_id ||
      membership.role!=="teacher" || !activeAt(membership,now) ||
      profile.id!==teacherId || profile.role!=="teacher" || profile.account_status!=="active" ||
      grants.filter(grant=>grant.teacher_membership_id===membership.id && grant.school_id===assignment.school_id &&
        grant.subject_id===programme.subject_id && activeAt(grant,now)).length!==1 ||
      programme.status!=="published" ||
      klass.id!==assignment.class_id || klass.school_id!==assignment.school_id ||
      klass.academic_year_id!==assignment.academic_year_id ||
      year.id!==assignment.academic_year_id || year.school_id!==assignment.school_id ||
      !["active","closed","archived"].includes(year.status) ||
      assignment.valid_from.slice(0,10)>year.ends_on || (assignment.valid_to && assignment.valid_to.slice(0,10)<year.starts_on) ||
      programme.id!==assignment.subject_program_id || klass.subject_id!==programme.subject_id || klass.grade_id!==programme.grade_id ||
      release.id!==selection.curriculumReleaseId || unit.id!==selection.unitId ||
      release.subject_program_id!==programme.id || unit.subject_program_id!==programme.id ||
      !["pilot","production","retired"].includes(release.status) || (release.effective_from && today<release.effective_from) ||
      releaseUnitRow.curriculum_release_id!==release.id || releaseUnitRow.unit_id!==unit.id ||
      !releaseUnitRow.unit_code_snapshot || !releaseUnitRow.title_hy_snapshot ||
      !Number.isFinite(Number(releaseUnitRow.sequence_order_snapshot)) ||
      subject.id!==programme.subject_id || grade.id!==programme.grade_id) throw new AcademicContextDenied();
  const readOnlyHistory=historicalAssignment || klass.is_active!==true || year.status!=="active" ||
    today<year.starts_on || today>year.ends_on || release.status==="retired" || (release.effective_to && today>release.effective_to);
  return {
    assignmentId: assignment.id, classId: klass.id, schoolId: assignment.school_id,
    academicYearId: year.id, subjectProgramId: programme.id,
    curriculumReleaseId: release.id, unitId: unit.id,
    unitCode: releaseUnitRow.unit_code_snapshot,
    unitSequence: Number(releaseUnitRow.sequence_order_snapshot),
    unitTitleHy: releaseUnitRow.title_hy_snapshot,
    subjectCode: subject.code, subjectNameHy: subject.name_hy,
    gradeNumber: Number(grade.grade_number), gradeLabelHy: grade.label_hy, readOnlyHistory: Boolean(readOnlyHistory),
  };
}

export async function resolveAuthorizedTeacherAcademicContext(
  admin: any, teacherId: string, selection: TeacherAcademicSelection, now = new Date(),
): Promise<AuthorizedTeacherAcademicContext> {
  if (!teacherId || !selection?.assignmentId || !selection.curriculumReleaseId || !selection.unitId) throw new AcademicContextDenied();
  const assignment=await row(admin,"teacher_assignments","id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from,valid_to",selection.assignmentId);
  const membership=await row(admin,"institutional_memberships","id,school_id,person_id,role,status,valid_from,valid_to",assignment.teacher_membership_id);
  if (membership.person_id!==teacherId || membership.role!=="teacher" || membership.school_id!==assignment.school_id || !activeAt(membership,now)) throw new AcademicContextDenied();
  const [klass,year,programme,release,unit,releaseUnitRow,profile]=await Promise.all([
    row(admin,"classes","id,school_id,academic_year_id,subject_id,grade_id,is_active",assignment.class_id),
    row(admin,"academic_years","id,school_id,status,starts_on,ends_on",assignment.academic_year_id),
    row(admin,"subject_programs","id,subject_id,grade_id,status",assignment.subject_program_id),
    row(admin,"curriculum_releases","id,subject_program_id,status,effective_from,effective_to",selection.curriculumReleaseId),
    row(admin,"units","id,subject_program_id",selection.unitId),
    releaseUnit(admin,selection.curriculumReleaseId,selection.unitId),
    row(admin,"profiles","id,role,account_status",teacherId),
  ]);
  const [subject,grade,grantResult]=await Promise.all([
    row(admin,"subjects","id,code,name_hy",programme.subject_id),
    row(admin,"grades","id,grade_number,label_hy",programme.grade_id),
    admin.from("teacher_subject_authorizations").select("id,school_id,teacher_membership_id,subject_id,status,valid_from,valid_to")
      .eq("teacher_membership_id",membership.id).eq("school_id",assignment.school_id).eq("subject_id",programme.subject_id),
  ]);
  if (grantResult.error) throw new AcademicContextDenied();
  return authorizeTeacherAcademicRows(teacherId,selection,{assignment,membership,klass,year,programme,release,unit,releaseUnitRow,profile,grants:grantResult.data??[],subject,grade},now);
}

async function batchContextRows(admin:any,table:string,columns:string,column:string,ids:string[],order="id") {
  const unique=[...new Set(ids)], rows:any[]=[];
  for(let offset=0;offset<unique.length;offset+=100) {
    for(let from=0;;from+=1000) {
      let query=admin.from(table).select(columns).in(column,unique.slice(offset,offset+100));
      if(table==="curriculum_release_units")query=query.order("curriculum_release_id");
      const result=await query.order(order).range(from,from+999);
      if(result.error)throw new AcademicContextDenied();
      const page=result.data??[];rows.push(...page);if(page.length<1000)break;
    }
  }
  return rows;
}

// Fresh, request-local inventory. Nothing is cached across requests. The final
// clock is captured after every query so expiry during reads fails closed.
export async function resolveTeacherAcademicContextsBatch(
  admin:any,teacherId:string,selections:TeacherAcademicSelection[],clock=()=>new Date(),
): Promise<AuthorizedTeacherAcademicContext[]> {
  if(!selections.length)return [];
  const [assignments,profile]=await Promise.all([
    batchContextRows(admin,"teacher_assignments","id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from,valid_to","id",selections.map(s=>s.assignmentId)),
    row(admin,"profiles","id,role,account_status",teacherId),
  ]);
  const [memberships,classes,years,programmes,releases,units,links,grants]=await Promise.all([
    batchContextRows(admin,"institutional_memberships","id,school_id,person_id,role,status,valid_from,valid_to","id",assignments.map(a=>a.teacher_membership_id)),
    batchContextRows(admin,"classes","id,school_id,academic_year_id,subject_id,grade_id,is_active","id",assignments.map(a=>a.class_id)),
    batchContextRows(admin,"academic_years","id,school_id,status,starts_on,ends_on","id",assignments.map(a=>a.academic_year_id)),
    batchContextRows(admin,"subject_programs","id,subject_id,grade_id,status","id",assignments.map(a=>a.subject_program_id)),
    batchContextRows(admin,"curriculum_releases","id,subject_program_id,status,effective_from,effective_to","id",selections.map(s=>s.curriculumReleaseId)),
    batchContextRows(admin,"units","id,subject_program_id","id",selections.map(s=>s.unitId)),
    batchContextRows(admin,"curriculum_release_units","curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,sequence_order_snapshot","curriculum_release_id",selections.map(s=>s.curriculumReleaseId),"unit_id"),
    batchContextRows(admin,"teacher_subject_authorizations","id,school_id,teacher_membership_id,subject_id,status,valid_from,valid_to","teacher_membership_id",assignments.map(a=>a.teacher_membership_id)),
  ]);
  const [subjects,grades]=await Promise.all([
    batchContextRows(admin,"subjects","id,code,name_hy","id",programmes.map(p=>p.subject_id)),
    batchContextRows(admin,"grades","id,grade_number,label_hy","id",programmes.map(p=>p.grade_id)),
  ]);
  const now=clock();
  return selections.map(selection=>{
    const assignment=assignments.find(a=>a.id===selection.assignmentId);
    const programme=programmes.find(p=>p.id===assignment?.subject_program_id);
    return authorizeTeacherAcademicRows(teacherId,selection,{
      assignment,membership:memberships.find(m=>m.id===assignment?.teacher_membership_id),
      klass:classes.find(c=>c.id===assignment?.class_id),year:years.find(y=>y.id===assignment?.academic_year_id),programme,
      release:releases.find(r=>r.id===selection.curriculumReleaseId),unit:units.find(u=>u.id===selection.unitId),
      releaseUnitRow:links.find(l=>l.curriculum_release_id===selection.curriculumReleaseId&&l.unit_id===selection.unitId),
      profile,grants,subject:subjects.find(s=>s.id===programme?.subject_id),grade:grades.find(g=>g.id===programme?.grade_id),
    },now);
  });
}
