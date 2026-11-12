import {readFile} from 'node:fs/promises';
// Actual staff pages with synthetic roles and DTOs; no hosted services.
export async function staffFixture(browser,t,file,{width=1280,large=false,evidence=false}={}){
 const role=file==='admin'?'admin':'school_admin';
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});t.after(()=>context.close());
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({role,large,evidence})=>{
  const classes=[{id:'archived-a',name:'Պահպանված դասարան Ա',isActive:false,subjectProgramIds:['a']},{id:'current-b',name:'Ընթացիկ դասարան Բ',isActive:true,subjectProgramIds:['b']},{id:'current-a',name:'Ընթացիկ դասարան Ա',isActive:true,subjectProgramIds:['a']}];
  const school={id:'school-a',name:'Փորձնական դպրոց',schoolCode:'SYNTHETIC'};
  window.__calls=[];window.__held=[];
  const groups=evidence?['diagnostic','practice','practice'].map((mode,index)=>({mode,sessions:1,correct:index===1?0:4,answered:5,accuracy:index===1?0:80,lastActivityAt:'2026-11-0'+(index+1)+'T10:00:00Z',context:{classId:'current-a',subjectProgramId:'a',unitCode:'SYN-U'},contract:{mode,releaseId:'release-a',unitId:index===1?null:'unit-a',blueprintId:'blueprint-'+mode,policyBindingId:'binding-'+mode,modelId:'model-a',runtimeBuildId:'build-'+index}})):[];
  const analytics=body=>({scope:{...body,academicYearId:'year-a'},options:{academicYears:[{id:'year-a',label:'2026–2027'}],programmes:[{id:'a',label:'Առարկա Ա'},{id:'b',label:'Առարկա Բ'}],classes,releases:evidence?[{id:'release-a',label:'Թողարկում 1',subjectProgramId:'a'}]:[],units:evidence?[{id:'unit-a',unitCode:'SYN-U',curriculumReleaseId:'release-a',label:'Փորձնական գլուխ'}]:[]},analytics:{enrollment:{students:2,contexts:2},participation:{students:1,rate:50},diagnostic:{completedContexts:evidence?1:0,eligibleContexts:2,completionRate:evidence?50:0,averageAccuracy:evidence?80:null},mastery:{attemptedContexts:0,passedContexts:0,passRate:null},evidence:{exactSessions:groups.length,completedSessions:groups.length},chapterReview:{completedSessions:0},evidenceGroups:groups}});
  window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'actor'}}}}),getUser:async()=>({data:{user:{id:'actor'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},from:table=>({select(){return this;},eq(){return this;},order:async()=>({data:[{...school,school_code:school.schoolCode}]}),maybeSingle:async()=>({data:{role,account_status:'active'}})}),functions:{invoke:async(name,{body})=>{
   window.__calls.push({name,body});
   if(name==='get-school-performance-analytics'){
    if(window.__holdAnalytics)await new Promise(resolve=>window.__held.push(resolve));
    return{data:analytics(body)};
   }
   if(name==='get-school-teachers')return{data:{teachers:[{membership_id:'teacher-a',display_name:'Փորձնական ուսուցիչ',email:'synthetic@example.test',membership_status:'active',account_status:'active',subjects:[],classes}]}};
   if(name==='get-school-admin-overview')return{data:{schools:[{...school,teachers:[{membershipId:'teacher-a',displayName:'Փորձնական ուսուցիչ',subjects:[],classes:classes.map(c=>({...c,academicYear:'2026–2027',students:[]}))}]}]}};
   if(name==='manage-school-academic-year')return{data:{years:[]}};
   if(name==='get-school-subject-options')return{data:{subjects:[]}};
   if(name==='manage-staff-invitation')return{data:{invitations:[]}};
   if(name==='get-admin-dashboard'){
    const actor={id:'actor',role:'admin'};
    if(body.view==='school_detail')return{data:{actor,school,admins:[],teachers:[{id:'teacher-a',displayName:'Փորձնական ուսուցիչ',accountStatus:'active',membershipStatus:'active',subjects:[],classes:classes.map(c=>({...c,active:c.isActive,academicYear:'2026–2027',studentCount:0}))}]}};
    if(body.view==='schools')return{data:{actor,schools:[school],total:1,page:1}};
    return{data:{actor,summary:{},attention:[],recentAudit:[]}};
   }
   throw Error('Unexpected isolated endpoint '+name);
  }}};
  if(large)document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='32px');
 },{role,large,evidence});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/supabase-browser.bundle.mjs')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__haieduSupabaseClient;'});
  if(u.origin!=='https://class-history.test')return route.abort();
  try{return route.fulfill({body:await readFile(new URL('../../web'+u.pathname,import.meta.url)),contentType:u.pathname.endsWith('.html')?'text/html':/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.ttf')?'font/ttf':'image/svg+xml'});}catch{return route.fulfill({status:404,body:''});}
 });
 const params=file==='school-teacher'?'?school=school-a&membership=teacher-a':file==='admin'?'#schoolsSection':'';
 await page.goto(`https://class-history.test/${file}.html${params}`);
 return{page,errors};
}
