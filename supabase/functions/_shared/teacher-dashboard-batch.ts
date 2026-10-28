import {getInstitutionalTeacherDashboard} from './institutional-teacher-dashboard.ts';
import {loadExactInstitutionalClassAnalytics} from './institutional-teacher-analytics.ts';
import {authorizeTeacherAcademicRows,AcademicContextDenied,type TeacherAcademicSelection} from './academic-context.ts';
import {verifiedSessionClaim} from './governed-learning-runtime.mjs';

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
 const session=verifiedSessionClaim(token);
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
  const data=await rpc('service_teacher_dashboard_directory',{p_archive:request.archive??false,p_offset:request.offset??0,p_search:request.search?.trim()??''});
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
 const rows=await rpc('service_teacher_dashboard_rows',args);
 if(!rows.institutionalTeacher)return null; // Preserve the isolated schoolless adapter.
 if(!rows.assignments.length)throw new AcademicContextDenied();
 if(classId&&!assignmentId)rows.assignments=rows.assignments.slice(0,1);
 let finalRows:Promise<any>|null=null;
 const revalidate=()=>finalRows??=(rpc('service_teacher_dashboard_rows',args));
 return getInstitutionalTeacherDashboard(admin,actor,rows.profile.display_name?.trim()||'Ուսուցիչ',selection,classId,assignmentId,{
  rows,
  analytics:async(context:any,students:any[])=>{
   if(!students.length)return {skills:[],students:[]};
   const evidence=await rpc('service_teacher_dashboard_evidence',{p_assignment:context.assignmentId,p_release:context.curriculumReleaseId,p_unit:context.unitId});
   return loadExactInstitutionalClassAnalytics(admin,context,students,{...evidence,revalidate});
  },
  final:async(selections:TeacherAcademicSelection[])=>{
   const fresh=await revalidate(),now=new Date();
   return [selections.map(s=>contextFromRows(actor,s,fresh,now)),{data:fresh.memberships},{data:fresh.grants}];
  },
 });
}
