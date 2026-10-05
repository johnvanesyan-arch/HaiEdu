export const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const now = new Date('2026-10-05T12:00:00Z');
const active = { status:'active',valid_from:'2026-09-01T00:00:00Z',valid_to:null };
export function contextFixture() {
  const tables = {profiles:[],institutional_class_enrollments:[],institutional_memberships:[],teacher_assignments:[],classes:[],academic_years:[],subject_programs:[],curriculum_releases:[],units:[],curriculum_release_units:[],subjects:[],grades:[],teacher_subject_authorizations:[],assessment_blueprints:[]};
  tables.profiles.push({id:id(1),role:'student',account_status:'active'},{id:id(2),role:'student',account_status:'active'});
  // Two subjects, two chapters per release and a second school's enrollment.
  for (let n=0;n<3;n++) {
    const k=100+n*100, school=n===2?id(20):id(10), student=n===2?id(2):id(1);
    const programme=n===2?id(101):id(k+1), subject=n===2?id(102):id(k+2), grade=n===2?id(103):id(k+3), release=n===2?id(104):id(k+4);
    tables.profiles.push({id:id(k+5),role:'teacher',account_status:'active'});
    tables.institutional_memberships.push({id:id(k+6),school_id:school,person_id:student,role:'student',...active},{id:id(k+7),school_id:school,person_id:id(k+5),role:'teacher',...active});
    tables.teacher_subject_authorizations.push({id:id(k+8),school_id:school,teacher_membership_id:id(k+7),subject_id:subject,...active});
    tables.classes.push({id:id(k+9),school_id:school,academic_year_id:id(k+10),subject_id:subject,grade_id:grade,is_active:true});
    tables.academic_years.push({id:id(k+10),school_id:school,status:'active',starts_on:'2026-09-01',ends_on:'2027-08-31'});
    tables.teacher_assignments.push({id:id(k+11),school_id:school,academic_year_id:id(k+10),class_id:id(k+9),teacher_membership_id:id(k+7),subject_program_id:programme,...active});
    tables.institutional_class_enrollments.push({id:id(k+12),school_id:school,academic_year_id:id(k+10),class_id:id(k+9),student_membership_id:id(k+6),student_id:student,teacher_assignment_id:id(k+11),subject_program_id:programme,...active});
    if(n===2)continue;
    tables.subject_programs.push({id:programme,subject_id:subject,grade_id:grade,status:'published',effective_from:'2026-09-01',effective_to:null});
    tables.subjects.push({id:subject,code:n===0?'subject-a':'subject-b',name_hy:'Փորձնական առարկա',status:'published'});
    tables.grades.push({id:grade,grade_number:n===0?7:8,label_hy:'Դասարան'});
    tables.curriculum_releases.push({id:release,subject_program_id:programme,status:'pilot',effective_from:'2026-09-01',effective_to:null});
    for(let u=0;u<2;u++){
      tables.units.push({id:id(k+20+u),subject_program_id:programme,code:'MUTABLE',title_hy:'Խմբագրական վերնագիր'});
      tables.curriculum_release_units.push({curriculum_release_id:release,unit_id:id(k+20+u),unit_code_snapshot:`SUBJECT-${n}-UNIT-${u}`,title_hy_snapshot:'Սառեցված վերնագիր',sequence_order_snapshot:u+1});
      for(const [m,mode] of ['diagnostic','practice','mastery_check','chapter_review'].entries())tables.assessment_blueprints.push({id:id(k+30+u*10+m),curriculum_release_id:release,unit_id:id(k+20+u),purpose:mode,status:'pilot',version_number:1,published_at:'2026-09-01T00:00:00Z',configuration_snapshot:{}});
    }
  }
  const calls=[];let live=true, user=id(1), authValid=true;
  const admin={auth:{getUser:async()=>({data:{user:authValid?{id:user}:null}})},from(table){
    const filters=[];let order=null,limit=Infinity;
    const q={select(columns){calls.push({table,columns,filters});return q;},eq(k,v){filters.push([k,v]);return q;},in(k,v){filters.push([k,v,true]);return q;},order(k,options){order=[k,options.ascending];return q;},limit(n){limit=n;return q;},
      result(){let rows=structuredClone(tables[table]||[]).filter(r=>filters.every(([k,v,isIn])=>isIn?v.includes(r[k]):r[k]===v));if(order)rows.sort((a,b)=>order[1]?a[order[0]]-b[order[0]]:b[order[0]]-a[order[0]]);return rows.slice(0,limit);},
      async maybeSingle(){const rows=q.result();return {data:rows.length===1?rows[0]:null,error:rows.length>1?{message:'ambiguous fixture'}:null};},
      then(resolve,reject){return Promise.resolve({data:q.result(),error:null}).then(resolve,reject);}};return q;
  }};
  return {tables,calls,admin,liveSession:async()=>live,setLive:v=>{live=v;},setUser:v=>{user=v;},setValid:v=>{authValid=v;},choice:{enrollmentId:id(112),curriculumReleaseId:id(104),unitId:id(120),mode:'diagnostic'}};
}
export function policyFixture(scope) {
  return {schemaVersion:'haiedu-assessment-policy-v1',policyKey:'fixture-policy',version:1,...scope,
    plannedQuestionCount:4,questionCountBySkill:{[id(501)]:1,[id(502)]:3},
    learningModelConfigurationId:id(601),academicMasteryPolicyId:id(602),
    responseTypes:['single_choice','true_false'],scoringStrategy:'selected-response-v1',hintsAllowed:false,baselineRequired:false,maximumCompletedBaselines:1};
}
