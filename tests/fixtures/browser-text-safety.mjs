// Explicit synthetic identities/services. Actual page controllers and renderers run.
export function installAdminTextFixture({payload}){
 const session={user:{id:'bf13-admin'}};
 window.__textCalls=[];
 const profile={id:session.user.id,role:'admin',account_status:'active'};
 const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),
  mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})},
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:profile})};return q;},
  functions:{invoke:async(name,{body})=>{
   window.__textCalls.push({name,action:body.action??body.view});
   if(name!=='get-admin-dashboard'||body.view!=='overview')throw Error('Unexpected synthetic admin action');
   return{data:{actor:profile,summary:{activeSchools:1,activeSchoolAdmins:1,activeTeachers:1,attentionCount:3},
    attention:[{label:payload,detail:payload,href:'javascript:window.__unsafeText++'},
     {label:'Valid internal destination',href:'./admin-security.html'},
     {label:'Foreign destination',href:'https://outside.invalid/admin'}],
    recentAudit:[{action:payload,actorDisplayName:payload,targetDisplayName:payload,createdAt:'2026-11-01T00:00:00Z'}]}};
  }}};
 window.__haieduSupabaseClient=client;
}

export function installTaskTextFixture({teacher,payload,url}){
 const actor=teacher?'bf13-teacher':'bf13-student';
 const context={assignmentId:'fixture-teacher-assignment',enrollmentId:'fixture-enrollment',curriculumReleaseId:'fixture-release',unitId:'fixture-unit'};
 const definition={version:1,locale:'hy',title:payload,instructions:payload,source:{kind:'link',url},response:{kind:'link'},assessment:{kind:'feedback'}};
 const review={decision:'reviewed',feedback:payload,scores:{},reason:payload};
 const student={version:'teacher-task-student-work-v1',assignment:{id:'fixture-task',context,definition,subjectName:payload,className:payload,unitTitle:payload,cancelled:false},
  work:{state:'reviewed',revision:1,content:{kind:'link',url},submissions:[{id:'fixture-submission',content:{kind:'link',url},reviews:[{version:1,review}]}]}};
 const record={version:'teacher-task-review-v1',submission:{id:'fixture-submission',studentName:payload,definition,state:'reviewed',editable:false,content:{kind:'link',url},reviews:[{version:1,review}],history:[]},draft:{revision:1,review}};
 const session={user:{id:actor}};window.__textCalls=[];
 window.__taskActor=actor;window.__taskContext=context;
 window.__taskClient={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  functions:{invoke:async(name,{body})=>{
   window.__textCalls.push({name,action:body.action});
   if(body.action!=='open')throw Error('Unexpected synthetic task mutation');
   if(name===(teacher?'manage-teacher-task-review':'manage-teacher-task-student-work'))return{data:teacher?record:student};
   throw Error('Unexpected synthetic task service');
  }}};
}

export function installAuthFlowFixture(){
 window.__authCalls=[];
 const profile={id:'bf13-auth-user',role:'teacher',account_status:'active'};
 const client={auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:{id:profile.id}}}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  signInWithPassword:async({password})=>{window.__authCalls.push('signIn');return{error:password==='synthetic-correct-password'?null:{message:'Invalid login credentials'}};},
  resetPasswordForEmail:async(_email,{redirectTo})=>{window.__authCalls.push('reset');window.__resetRedirect=redirectTo;return{error:null};}},
  from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:profile})};return q;},
  functions:{invoke:async()=>{throw Error('Unexpected synthetic Auth fixture service');}}};
 window.__haieduSupabaseClient=client;
}
