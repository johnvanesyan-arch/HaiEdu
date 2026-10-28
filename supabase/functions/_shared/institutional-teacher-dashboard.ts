import {
  AcademicContextDenied,
  authorizeTeacherAcademicRows,
  resolveTeacherAcademicContextsBatch,
  type TeacherAcademicSelection,
} from "./academic-context.ts";
import { loadExactInstitutionalClassAnalytics } from "./institutional-teacher-analytics.ts";

function activeAt(row: any, now: number): boolean {
  const start = Date.parse(String(row.valid_from));
  const end = row.valid_to == null ? Infinity : Date.parse(String(row.valid_to));
  return row.status === "active" && Number.isFinite(start) && start <= now && now < end;
}

function requireRows(result: any): any[] {
  if (result.error) throw result.error;
  return result.data ?? [];
}

// Independent class reads share no learner evidence. Bound concurrency so a
// teacher's historical classrooms do not serialize the entire dashboard.
export async function mapTeacherDashboardAssignments<T, R>(rows: T[], read: (row: T) => Promise<R>): Promise<R[]> {
  const result: R[] = new Array(rows.length);
  let next = 0;
  const workers = await Promise.allSettled(Array.from({ length: Math.min(4, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next++;
      result[index] = await read(rows[index]);
    }
  }));
  const failed = workers.find(worker => worker.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  return result;
}

async function rowsByIds(admin:any,table:string,columns:string,column:string,ids:string[],filter=(query:any)=>query) {
  const data:any[]=[];
  for(let offset=0;offset<ids.length;offset+=100) {
    const batch=ids.slice(offset,offset+100);
    for(let from=0;;from+=1000) {
      const page=requireRows(await filter(admin.from(table).select(columns).in(column,batch)).order("id").range(from,from+999));
      data.push(...page);if(page.length<1000)break;
    }
  }
  return {data,error:null};
}

function releaseIsCurrent(release: any, today: string): boolean {
  return ["pilot", "production"].includes(release.status)
    && (!release.effective_from || release.effective_from <= today)
    && (!release.effective_to || today <= release.effective_to);
}

async function loadDashboardRows(admin:any,teacherId:string,requestedSelection:TeacherAcademicSelection|null,requestedClassId:string|null,requestedAssignmentId:string|null) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const memberships = requireRows(await admin.from("institutional_memberships")
    .select("id,person_id,role,school_id,status,valid_from,valid_to")
    .eq("person_id", teacherId).eq("role", "teacher"))
    .filter((membership) => activeAt(membership, now));
  if(!memberships.length)return {memberships,grants:[],years:[],schools:[],assignments:[],profile:null,programmes:[],subjects:[],classes:[],enrollments:[],studentMemberships:[],studentProfiles:[],grades:[],releases:[],units:[],releaseUnits:[]};
  const membershipIds = memberships.map((membership) => membership.id);
  const schoolIds = [...new Set(memberships.map((membership) => membership.school_id))];

  const [grantsResult, yearsResult, schoolsResult, assignmentsResult, profileResult] = await Promise.all([
    admin.from("teacher_subject_authorizations")
      .select("id,school_id,teacher_membership_id,subject_id,status,valid_from,valid_to")
      .in("teacher_membership_id", membershipIds).eq("status", "active"),
    admin.from("academic_years")
      .select("id,school_id,label,starts_on,ends_on,status")
      .in("school_id", schoolIds),
    admin.from("schools").select("id,name").in("id", schoolIds),
    rowsByIds(admin,"teacher_assignments","id,school_id,academic_year_id,class_id,teacher_membership_id,subject_program_id,status,valid_from,valid_to","teacher_membership_id",membershipIds,q=>{
      let scoped=q.in("status",["active","ended"]);
      if(requestedClassId)scoped=scoped.eq("class_id",requestedClassId);
      if(requestedClassId && (requestedAssignmentId || requestedSelection))scoped=scoped.eq("id",requestedAssignmentId??requestedSelection!.assignmentId);
      return scoped;
    }),
    admin.from("profiles").select("id,role,account_status").eq("id",teacherId).maybeSingle(),
  ]);
  if(profileResult.error || !profileResult.data)throw new Error("academic_context_unavailable");
  const profile=profileResult.data;
  const grants = requireRows(grantsResult).filter((grant) => activeAt(grant, now));
  const years = requireRows(yearsResult);
  const schools = requireRows(schoolsResult);
  let assignments = requireRows(assignmentsResult).filter((assignment) => activeAt(assignment, now) || (assignment.status === "ended" && Date.parse(assignment.valid_from) <= now));
  if(requestedClassId && !requestedSelection && !requestedAssignmentId) {
    assignments=assignments.sort((a,b)=>Number(activeAt(b,now))-Number(activeAt(a,now)) || Date.parse(b.valid_from)-Date.parse(a.valid_from)).slice(0,1);
  }
  const subjectIds = [...new Set(grants.map((grant) => grant.subject_id))];
  const classIds = [...new Set(assignments.map((assignment) => assignment.class_id))];

  const [programmesResult, subjectsResult, classesResult, enrollmentsResult] = await Promise.all([
    subjectIds.length
      ? admin.from("subject_programs").select("id,subject_id,grade_id,status")
        .in("subject_id", subjectIds)
      : Promise.resolve({ data: [] }),
    subjectIds.length ? admin.from("subjects")
      .select("id,code,name_hy,status").in("id", subjectIds) : Promise.resolve({ data: [] }),
    classIds.length ? rowsByIds(admin,"classes","id,school_id,academic_year_id,teacher_id,name,is_active,subject_id,grade_id","id",classIds) : Promise.resolve({ data: [] }),
    classIds.length ? rowsByIds(admin,"institutional_class_enrollments","id,school_id,academic_year_id,class_id,student_id,student_membership_id,teacher_assignment_id,subject_program_id,status,valid_from,valid_to","class_id",classIds,q=>q.in("status",["active","ended"])) : Promise.resolve({ data: [] }),
  ]);
  const programmes = requireRows(programmesResult);
  const subjects = requireRows(subjectsResult);
  const classes = requireRows(classesResult);
  const enrollments = requireRows(enrollmentsResult).filter((enrollment) => activeAt(enrollment, now) || (enrollment.status === "ended" && Date.parse(enrollment.valid_from) <= now));
  const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.student_id))];
  const gradeIds = [...new Set(programmes.map((programme) => programme.grade_id))];
  const programmeIds = [...new Set(assignments.map((assignment) => assignment.subject_program_id))];
  const [studentMembershipResult,studentProfileResult,gradeResult,releaseResult,unitResult]=await Promise.all([
    studentIds.length ? rowsByIds(admin,"institutional_memberships","id,person_id,school_id,status,valid_from,valid_to","person_id",studentIds,q=>q.eq("role","student")) : {data:[]},
    studentIds.length ? rowsByIds(admin,"profiles","id,display_name,account_status,role","id",studentIds,q=>q.eq("role","student")) : {data:[]},
    gradeIds.length ? admin.from("grades").select("id,grade_number,label_hy").in("id",gradeIds) : {data:[]},
    programmeIds.length ? admin.from("curriculum_releases").select("id,subject_program_id,status,release_number,effective_from,effective_to,activated_at,created_at").in("subject_program_id",programmeIds).in("status",["pilot","production","retired"]) : {data:[]},
    programmeIds.length ? admin.from("units").select("id,subject_program_id,code,title_hy,sequence_order,status").in("subject_program_id",programmeIds) : {data:[]},
  ]);
  const studentMemberships=requireRows(studentMembershipResult),studentProfiles=requireRows(studentProfileResult),grades=requireRows(gradeResult),releases=requireRows(releaseResult),units=requireRows(unitResult);
  const releaseIds=releases.map(release=>release.id);
  const releaseUnits = releaseIds.length
    ? requireRows(await admin.from("curriculum_release_units")
      .select("curriculum_release_id,unit_id,unit_code_snapshot,title_hy_snapshot,sequence_order_snapshot")
      .in("curriculum_release_id", releaseIds))
    : [];

  return {memberships,grants,years,schools,assignments,profile,programmes,subjects,classes,enrollments,studentMemberships,studentProfiles,grades,releases,units,releaseUnits};
}

export async function getInstitutionalTeacherDashboard(
  admin: any,
  teacherId: string,
  displayName: string,
  requestedSelection: TeacherAcademicSelection | null = null,
  requestedClassId: string | null = null,
  requestedAssignmentId: string | null = null,
  readSource: any = null,
) {
  const now=Date.now(),today=new Date(now).toISOString().slice(0,10);
  const rows=readSource?.rows ?? await loadDashboardRows(admin,teacherId,requestedSelection,requestedClassId,requestedAssignmentId);
  const {memberships,grants,years,schools,assignments,profile,programmes,subjects,classes,enrollments,studentMemberships,studentProfiles,grades,releases,units,releaseUnits}=rows;
  const membershipIds=memberships.map((m:any)=>m.id);
  if(!memberships.length)return {teacher:{id:teacherId,displayName},institutionalTeacher:true,institutionalOptions:[],classes:[],totals:{classes:0,students:0,studentsNeedingSupport:0}};

  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const yearById = new Map(years.map((year) => [year.id, year]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const programmeById = new Map(programmes.map((programme) => [programme.id, programme]));
  const gradeById = new Map(grades.map((grade) => [grade.id, grade]));
  const classById = new Map(classes.map((klass) => [klass.id, klass]));
  const studentById = new Map<string, any>(studentProfiles.map((profile) => [profile.id, profile]));
  const releaseById = new Map(releases.map((release) => [release.id, release]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  const institutionalOptions = [];
  for (const membership of memberships) {
    const school = schoolById.get(membership.school_id);
    if (!school) continue;
    for (const year of years.filter((candidate) => candidate.school_id === membership.school_id
      && candidate.status === "active" && candidate.starts_on <= today && today <= candidate.ends_on)) {
      for (const grant of grants.filter((candidate) => candidate.teacher_membership_id === membership.id
        && candidate.school_id === membership.school_id)) {
        const subject = subjectById.get(grant.subject_id);
        if (subject?.status !== "published") continue;
        for (const programme of programmes.filter((candidate) => candidate.subject_id === grant.subject_id
          && candidate.status === "published")) {
          const grade = gradeById.get(programme.grade_id);
          if (!grade) continue;
          institutionalOptions.push({
            schoolId: school.id, schoolName: school.name,
            teacherMembershipId: membership.id, academicYearId: year.id,
            academicYearLabel: year.label, subjectProgramId: programme.id,
            subjectName: subject.name_hy, gradeNumber: Number(grade.grade_number),
          });
        }
      }
    }
  }

  const classPayload: any[] = (await mapTeacherDashboardAssignments(assignments, async (assignment) => {
    const membership = memberships.find((candidate) => candidate.id === assignment.teacher_membership_id);
    const klass = classById.get(assignment.class_id);
    const year = yearById.get(assignment.academic_year_id);
    const programme = programmeById.get(assignment.subject_program_id);
    if (!membership || !klass || !year || !programme ||
      klass.school_id !== membership.school_id || assignment.school_id !== membership.school_id ||
      klass.academic_year_id !== assignment.academic_year_id ||
      klass.subject_id !== programme.subject_id || klass.grade_id !== programme.grade_id) return null;
    if (!grants.some(grant=>grant.teacher_membership_id===membership.id && grant.school_id===assignment.school_id && grant.subject_id===programme.subject_id)) return null;
    const yearIsActive = year.status === "active" && year.starts_on <= today && today <= year.ends_on;
    const classEnrollments = enrollments.filter((enrollment) =>
      enrollment.class_id === klass.id && enrollment.school_id === assignment.school_id
      && enrollment.academic_year_id === assignment.academic_year_id
      && enrollment.teacher_assignment_id === assignment.id
      && enrollment.subject_program_id === assignment.subject_program_id
      && studentById.get(enrollment.student_id)?.account_status === "active"
      && studentMemberships.some(member=>member.id===enrollment.student_membership_id && member.person_id===enrollment.student_id && member.school_id===assignment.school_id &&
        (yearIsActive && activeAt(assignment,now) ? activeAt(member,now) : ["active","ended"].includes(member.status) && member.valid_from.slice(0,10)<=year.ends_on && (!member.valid_to || member.valid_to.slice(0,10)>=year.starts_on))));
    const students = classEnrollments.map((enrollment) => ({
      id: enrollment.student_id,
      enrollmentId: enrollment.id,
      displayName: studentById.get(enrollment.student_id)?.display_name?.trim() || "Աշակերտ",
    }));
    const unitOptionsById = new Map<string, any>();
    for (const link of releaseUnits) {
      const release = releaseById.get(link.curriculum_release_id);
      const unit = unitById.get(link.unit_id);
      if (!release || !unit || release.subject_program_id !== assignment.subject_program_id
        || unit.subject_program_id !== assignment.subject_program_id
        || !link.unit_code_snapshot || !link.title_hy_snapshot
        || !Number.isFinite(Number(link.sequence_order_snapshot))) continue;
      const candidate = {
        assignmentId: assignment.id, curriculumReleaseId: release.id,
        unitId: unit.id, unitCode: link.unit_code_snapshot,
        unitTitleHy: link.title_hy_snapshot || unit.title_hy,
        unitSequence: Number(link.sequence_order_snapshot),
        releaseNumber: Number(release.release_number), readOnlyHistory: !releaseIsCurrent(release,today),
      };
      unitOptionsById.set(release.id+":"+unit.id, candidate);
    }
    const unitOptions = [...unitOptionsById.values()]
      .sort((a, b) => Number(a.readOnlyHistory)-Number(b.readOnlyHistory) || a.unitSequence - b.unitSequence || b.releaseNumber - a.releaseNumber);
    const requested = requestedSelection?.assignmentId === assignment.id
      ? unitOptions.find((option) => option.curriculumReleaseId === requestedSelection.curriculumReleaseId
        && option.unitId === requestedSelection.unitId) ?? null
      : null;
    if (requestedSelection?.assignmentId === assignment.id && !requested) throw new Error("academic_context_unavailable");
    const selectedUnit = requested ?? unitOptions[0] ?? null;
    let analytics = { skills: [] as any[], students };
    let academicContext = null;
    if (selectedUnit) {
      academicContext = authorizeTeacherAcademicRows(teacherId,selectedUnit,{
        assignment,membership,klass,year,programme,profile,grants,
        release:releaseById.get(selectedUnit.curriculumReleaseId),unit:unitById.get(selectedUnit.unitId),
        releaseUnitRow:releaseUnits.find(link=>link.curriculum_release_id===selectedUnit.curriculumReleaseId && link.unit_id===selectedUnit.unitId),
        subject:subjectById.get(programme.subject_id),grade:gradeById.get(programme.grade_id),
      },new Date(now));
      analytics = readSource ? await readSource.analytics(academicContext,students) : await loadExactInstitutionalClassAnalytics(admin, academicContext, students);
    }
    const needingSupport = analytics.students.filter((student: any) =>
      student.weakSkills?.some((skill: any) => skill.band === "needs_support")).length;
    return {
      id: klass.id, name: klass.name, isActive: klass.is_active && yearIsActive && activeAt(assignment,now),
      schoolId: assignment.school_id, assignmentId: assignment.id,
      subjectProgramId: assignment.subject_program_id, academicYearId: assignment.academic_year_id,
      academicYear: year.label, schoolName: schoolById.get(klass.school_id)?.name ?? "",
      subjectName: subjectById.get(klass.subject_id)?.name_hy ?? "",
      gradeNumber: Number(gradeById.get(klass.grade_id)?.grade_number ?? 0),
      joinCode: null, studentCount: analytics.students.length,
      activeStudents: analytics.students.filter((student: any) => student.latestActivityAt).length,
      needingSupport, students: analytics.students,
      skills: analytics.skills, unitOptions, selectedUnit, academicContext,
      analyticsAvailable: Boolean(academicContext),
    };
  })).filter(Boolean);
  // Revalidate every returned context after evidence reads. Shared rows are read
  // once per request rather than once per classroom; ownership, grants and the
  // final expiry clock still use the same authorization contract.
  const contextualClasses=classPayload.filter(klass=>klass.selectedUnit);
  const [finalContexts,finalMembershipResult,finalGrantResult]=readSource ? await readSource.final(contextualClasses.map(klass=>klass.selectedUnit)) : await Promise.all([
    resolveTeacherAcademicContextsBatch(admin,teacherId,contextualClasses.map(klass=>klass.selectedUnit)),
    admin.from("institutional_memberships").select("id,person_id,role,school_id,status,valid_from,valid_to").in("id",membershipIds),
    admin.from("teacher_subject_authorizations").select("id,school_id,teacher_membership_id,subject_id,status,valid_from,valid_to").in("teacher_membership_id",membershipIds),
  ]);
  const finalNow=Date.now();
  const finalMemberships=requireRows(finalMembershipResult).filter(member=>member.person_id===teacherId && member.role==="teacher" && activeAt(member,finalNow));
  const finalGrants=requireRows(finalGrantResult).filter(grant=>activeAt(grant,finalNow));
  for(const klass of classPayload) {
    const assignment=assignments.find(row=>row.id===klass.assignmentId);
    const programme=programmeById.get(klass.subjectProgramId);
    if(!finalMemberships.some(member=>member.id===assignment?.teacher_membership_id && member.school_id===klass.schoolId) ||
      finalGrants.filter(grant=>grant.teacher_membership_id===assignment?.teacher_membership_id && grant.school_id===klass.schoolId && grant.subject_id===programme?.subject_id).length!==1)throw new Error("academic_context_unavailable");
  }
  contextualClasses.forEach((klass,index)=>{
    klass.academicContext=finalContexts[index];
    klass.isActive=klass.isActive && !finalContexts[index].readOnlyHistory;
  });
  const currentOptions=institutionalOptions.filter(option=>finalMemberships.some(member=>member.id===option.teacherMembershipId && member.school_id===option.schoolId) &&
    finalGrants.filter(grant=>grant.teacher_membership_id===option.teacherMembershipId && grant.school_id===option.schoolId && grant.subject_id===programmeById.get(option.subjectProgramId)?.subject_id).length===1);
  if (requestedClassId && !classPayload.some(klass=>klass.id===requestedClassId)) throw new AcademicContextDenied();
  if (requestedSelection && !classPayload.some(klass=>klass.assignmentId===requestedSelection.assignmentId)) throw new Error("academic_context_unavailable");
  const selectedClass = requestedSelection
    ? classPayload.find((klass) => klass.assignmentId === requestedSelection.assignmentId)
    : classPayload.find((klass) => klass.isActive) ?? classPayload[0];
  return {
    teacher: { id: teacherId, displayName },
    institutionalTeacher: true, institutionalOptions:currentOptions, classes: classPayload,
    unitCode: selectedClass?.selectedUnit?.unitCode ?? null,
    curriculumReleaseId: selectedClass?.selectedUnit?.curriculumReleaseId ?? null,
    skills: selectedClass?.skills ?? [],
    totals: {
      classes: classPayload.length,
      students: new Set(classPayload.flatMap((klass) => klass.students.map((student: any) => student.id))).size,
      studentsNeedingSupport: new Set(classPayload.flatMap((klass) => klass.students
        .filter((student: any) => student.weakSkills?.some((skill: any) => skill.band === "needs_support"))
        .map((student: any) => student.id))).size,
    },
  };
}
