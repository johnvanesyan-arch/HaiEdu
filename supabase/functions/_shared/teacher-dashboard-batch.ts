import {getInstitutionalTeacherDashboard} from './institutional-teacher-dashboard.ts';
import {loadExactInstitutionalClassAnalytics} from './institutional-teacher-analytics.ts';
import {authorizeTeacherAcademicRows,AcademicContextDenied,type TeacherAcademicSelection} from './academic-context.ts';
// Signature/user verification happens in the handler. This claim is only an
// input to the database live-session gate, never an authorization decision.
function sessionClaim(token:string){try{
 const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
 const id=JSON.parse(atob(p+'='.repeat((4-p.length%4)%4))).session_id;
 return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)?id:null;
}catch{return null;}}

// Request-local snapshots only. The final read is made after all evidence reads,
// and every expiry check uses the clock after that read has completed.
function contextFromRows(actor:string,selection:TeacherAcademicSelection,r:any,now:Date){
 const assignment=r.assignments.find((a:any)=>a.id===selection.assignmentId);
 const programme=r.programmes.find((p:any)=>p.id===assignment?.subject_program_id);
 return authorizeTeacherAcademicRows(actor,selection,{
  assignment,programme,profile:r.profile,grants:r.grants,
  membership:r.memberships.find((m:any)=>m.id===assignment?.teacher_membership_id),
  klass:r.classes.find((c:any)=>c.id===assignment?.class_id),year:r.years.find((y:any)=>y.id===assignment?.academic_year_id),
  release:r.releases.find((x:any)=>x.id===selection.curriculumReleaseId),unit:r.units.find((u:any)=>u.id===selection.unitId),
  releaseUnitRow:r.releaseUnits.find((l:any)=>l.curriculum_release_id===selection.curriculumReleaseId&&l.unit_id===selection.unitId),
  subject:r.subjects.find((s:any)=>s.id===programme?.subject_id),grade:r.grades.find((g:any)=>g.id===programme?.grade_id),
 },now);
}
export class TeacherDashboardReadError extends Error {
 status:number;
 constructor(status:number,code:string){super(code);this.status=status;}
}
export async function readBatchedTeacherDashboard(admin:any,actor:string,token:string,request:any){
 const session=sessionClaim(token);
 if(!session)throw new TeacherDashboardReadError(403,'account_or_session_inactive');
 async function rpc(name:string,args:any){
  const {data,error}=await admin.rpc(name,{p_actor:actor,p_session:session,...args});
  if(error){
   const denied=error.code==='42501';
   throw new TeacherDashboardReadError(denied?403:503,denied?'academic_context_unavailable':'teacher_dashboard_unavailable');
  }
  if(!data)throw new TeacherDashboardReadError(503,'teacher_dashboard_unavailable');
  return data;
 }
 const gate=()=>rpc('service_teacher_dashboard_actor',{});
 if(request.readMode==='directory'){
  const data=request.workspace!==undefined
   ? await rpc('service_teacher_dashboard_home',{p_workspace:request.workspace})
   : await rpc('service_teacher_dashboard_directory',{p_archive:request.archive??false,p_offset:request.offset??0,p_search:request.search?.trim()??''});
  const finalActor=await gate();
  if(finalActor.institutionalTeacher!==data.institutionalTeacher)throw new AcademicContextDenied();
  // No evidence is returned by this metadata-only path.
  const {profile:_profile,...directory}=data;
  return {...directory,teacher:{id:actor,displayName:finalActor.profile.display_name?.trim()||'Ուսուցիչ'},institutionalTeacher:finalActor.institutionalTeacher,progressive:true,
   totals:{classes:data.directory.activeCount,students:null,studentsNeedingSupport:null}};
 }
 const selection=request.selection??null;
 const classId=request.classId??null,assignmentId=request.assignmentId??selection?.assignmentId??null;
 const args={p_class:classId,p_assignment:assignmentId};
 const initial=await rpc('service_teacher_dashboard_initial',{...args,p_release:selection?.curriculumReleaseId??null,p_unit:selection?.unitId??null});
 const rows=initial.rows;
 if(!rows.institutionalTeacher)return null; // Preserve the isolated schoolless adapter.
 if(!rows.assignments.length)throw new AcademicContextDenied();
 if(classId&&!assignmentId)rows.assignments=rows.assignments.slice(0,1);
 return getInstitutionalTeacherDashboard(admin,actor,rows.profile.display_name?.trim()||'Ուսուցիչ',selection,classId,assignmentId,{
  rows,
  analytics:async(context:any,students:any[])=>{
   if(!students.length)return {skills:[],students:[]};
   if(initial.selected?.assignmentId!==context.assignmentId||initial.selected?.curriculumReleaseId!==context.curriculumReleaseId||initial.selected?.unitId!==context.unitId||!initial.evidence)throw new TeacherDashboardReadError(503,'teacher_dashboard_unavailable');
   const evidence=initial.evidence;
   return loadExactInstitutionalClassAnalytics(admin,context,students,{...evidence,roster:rows});
  },
  final:async(selections:TeacherAcademicSelection[],classes:any[])=>{
   const fresh=await rpc('service_teacher_dashboard_rows',args),now=new Date();
   const contexts=selections.map(s=>contextFromRows(actor,s,fresh,now));
   for(const klass of classes){
    const a=fresh.assignments.find((a:any)=>a.id===klass.assignmentId);
    const c=fresh.classes.find((c:any)=>c.id===a?.class_id),y=fresh.years.find((y:any)=>y.id===a?.academic_year_id);
    const p=fresh.programmes.find((p:any)=>p.id===a?.subject_program_id);
    if(!a||!c||!y||!p||c.id!==klass.id||c.school_id!==a.school_id||c.academic_year_id!==a.academic_year_id||
      c.subject_id!==p.subject_id||c.grade_id!==p.grade_id||p.status!=='published'||y.school_id!==a.school_id||
      !['active','closed','archived'].includes(y.status)||a.valid_from.slice(0,10)>y.ends_on||(a.valid_to&&a.valid_to.slice(0,10)<y.starts_on))throw new AcademicContextDenied();
    const ctx=contexts.find(ctx=>ctx.assignmentId===klass.assignmentId);
    const today=now.toISOString().slice(0,10);
    const history=ctx?.readOnlyHistory??(a.status==='ended'||!c.is_active||y.status!=='active'||today<y.starts_on||today>y.ends_on);
    const valid=(r:any)=>r&&['active',...(history?['ended']:[])].includes(r.status)&&Date.parse(r.valid_from)<=now.getTime()&&(history||!r.valid_to||Date.parse(r.valid_to)>now.getTime());
    klass.students=klass.students.filter((s:any)=>{
     const e=fresh.enrollments.find((e:any)=>e.id===(s.institutionalClassEnrollmentId??s.enrollmentId)&&e.student_id===s.id&&e.teacher_assignment_id===a.id&&e.class_id===c.id&&e.school_id===a.school_id&&e.academic_year_id===a.academic_year_id&&e.subject_program_id===p.id);
     const profile=fresh.studentProfiles.find((p:any)=>p.id===s.id);
     const m=fresh.studentMemberships.find((m:any)=>m.id===e?.student_membership_id&&m.person_id===s.id&&m.school_id===a.school_id&&m.role==='student');
     return valid(e)&&valid(m)&&profile?.role==='student'&&profile.account_status==='active';
    });
    klass.studentCount=klass.students.length;
    klass.activeStudents=klass.students.filter((s:any)=>s.latestActivityAt).length;
    klass.needingSupport=klass.students.filter((s:any)=>s.weakSkills?.some((k:any)=>k.band==='needs_support')).length;
   }
   return [contexts,{data:fresh.memberships},{data:fresh.grants}];
  },
 });
}
