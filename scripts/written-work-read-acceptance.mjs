import {allowedBrowserRequest,anonymousDashboardDenied} from './chapter-ii-pilot-read-acceptance.mjs';

// Called only inside the guarded, main-only Chapter VI production acceptance.
// No writing content or student responses are created by this read-only probe.
export function writingReadAllowed({pathname,method,body,search}) {
  if(allowedBrowserRequest({pathname,method,body,search}))return true;
  if(method!=='POST')return false;
  if(pathname==='/functions/v1/get-teacher-dashboard')return true;
  if(pathname==='/functions/v1/manage-student-invitation')return body?.action==='list';
  if(pathname==='/functions/v1/manage-teacher-feedback')return ['open','snippets'].includes(body?.action);
  return pathname==='/functions/v1/manage-written-work' && ['tasks','queue'].includes(body?.action);
}

export async function writtenWorkReadAcceptance({fixture,contexts,sessions,url,request,check}) {
  const select=c=>({enrollmentId:c.enrollmentId,curriculumReleaseId:c.curriculumReleaseId,unitId:c.unitId});
  const call=(actor,action,context)=>request(actor,'/functions/v1/manage-written-work',{action,context,payload:{}});
  for(const side of ['A','B']){
    const own=contexts[side][0],other=contexts[side==='A'?'B':'A'][0];
    const student=await call(`${side}_student`,'tasks',select(own));
    check(`${side}: writing task list is authorized and empty before content onboarding`,student.status===200&&student.data?.version==='written-work-v1'&&student.data.tasks?.length===0,student.status);
    const teacher=await call(`${side}_teacher`,'queue',{assignmentId:fixture[side].assignmentId,curriculumReleaseId:own.curriculumReleaseId,unitId:own.unitId});
    check(`${side}: teacher writing queue is authorized and empty`,teacher.status===200&&teacher.data?.version==='written-work-v1'&&teacher.data.queue?.length===0,teacher.status);
    const foreign=await call(`${side}_student`,'tasks',select(other));
    check(`${side}: writing denies foreign enrollment`,foreign.status===403&&foreign.data?.error==='written_context_unavailable',foreign.status);
    const foreignTeacher=await call(`${side}_teacher`,'queue',{assignmentId:fixture[side==='A'?'B':'A'].assignmentId,curriculumReleaseId:own.curriculumReleaseId,unitId:own.unitId});
    check(`${side}: writing denies foreign teacher assignment`,foreignTeacher.status===403&&foreignTeacher.data?.error==='written_context_unavailable',foreignTeacher.status);
    for(const role of ['student','teacher'])for(const table of ['written_task_versions','written_work','written_submissions','written_reviews','learning_response_drafts']){
      const column=table==='learning_response_drafts'?'session_item_id':'id';
      const r=await request(`${side}_${role}`,`/rest/v1/${table}?select=${column}&limit=1`,null,'GET');
      check(`${side}_${role}: direct ${table} read denied`,r.status===403&&r.data?.code==='42501',r.status);
    }
  }
  const anon=await call(null,'tasks',select(contexts.A[0]));check('anonymous writing access denied',anonymousDashboardDenied(anon),anon.status);
  const {chromium,expect:baseExpect}=await import('@playwright/test');const expect=baseExpect.configure({timeout:30000});
  const browser=await chromium.launch({headless:true});
  try{for(const side of ['A','B'])for(const role of ['student','teacher']){
    const context=await browser.newContext({viewport:role==='student'?{width:390,height:844}:{width:1365,height:950},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:'https://www.haiedu.am',localStorage:[{name:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,value:JSON.stringify(sessions.get(`${side}_${role}`))}]}]}});
    let blocked=0,errors=0;
    try{
      await context.route(`${url}/**`,async route=>{const req=route.request(),u=new URL(req.url());let body;try{body=req.postDataJSON();}catch{}if(!writingReadAllowed({pathname:u.pathname,method:req.method(),body,search:u.search})){blocked++;return route.abort();}return route.continue();});
      const page=await context.newPage();page.on('pageerror',()=>errors++);const c=contexts[side][0];
      if(role==='student'){
        await page.goto(`https://www.haiedu.am/course.html?enrollment=${c.enrollmentId}&release=${c.curriculumReleaseId}&unit=${c.unitId}&tab=writing`);
        await expect(page.locator('.written-list')).toContainText('գրավոր առաջադրանք դեռ չի հրապարակվել');
      }else{
        await page.goto(`https://www.haiedu.am/teacher.html?view=class&class=${fixture[side].classId}`);
        await page.locator('#teacherOpenWrittenWork').click();
        await expect(page.locator('.written-list')).toContainText('աշխատանքներ չկան');
      }
      check(`${side}_${role}: native writing workspace loads with no errors or attempted writes`,errors===0&&blocked===0);
      check(`${side}_${role}: writing workspace has no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }finally{await context.close();}
  }}finally{await browser.close();}
}
