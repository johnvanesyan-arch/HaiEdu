import {readFile} from 'node:fs/promises';
const writingFixtures=JSON.parse(await readFile(new URL('../docs/qa/additional-programme-fixtures.json',import.meta.url),'utf8')).contexts;
const sameTuple=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>b[k]===v);
// Complements resource delivery with read-only, designated-account journeys.
export function createUsabilityReads({fixture,roles,sides,request,browserContext,check,report}){
 const readableTasks=new Map();
 function scope(actor){return writingFixtures.find(c=>c.side===actor[0]&&c.teacherId===fixture[actor[0]].teacherId&&c.studentId===fixture[actor[0]].studentId);}
 function context(actor){const f=scope(actor);return !f?null:actor.endsWith('teacher')?{assignmentId:f.teacherAssignmentId,curriculumReleaseId:f.curriculumReleaseId,unitId:f.unitId}:{enrollmentId:f.enrollmentId,curriculumReleaseId:f.curriculumReleaseId,unitId:f.unitId};}
 function allowed(actor,fn,body){return fn==='get-my-privacy'||(fn==='manage-written-work'&&(actor.endsWith('teacher')||actor.endsWith('student'))&&sameTuple(body.context,context(actor))&&(['tasks','queue'].includes(body.action)||(body.action==='open'&&actor.endsWith('student')&&readableTasks.get(actor)===body.payload?.taskId)));}
 async function verify(){
  report.writingReceiptCoverage=[];
  for(const side of sides){
   const student=side+'_student',teacher=side+'_teacher',f=scope(student);check(side+': governed writing fixture configured',Boolean(f));
   const tasks=await request(student,'/functions/v1/manage-written-work',{action:'tasks',context:context(student),payload:{}});
   check(side+': writing discovery is read only',tasks.status===200&&tasks.data?.version==='written-work-v1');
   const reviewed=tasks.data.tasks.find(t=>t.state==='reviewed');let existing=null;
   if(reviewed){readableTasks.set(student,reviewed.id);const r=await request(student,'/functions/v1/manage-written-work',{action:'open',context:context(student),payload:{taskId:reviewed.id}});check(side+': pre-existing reviewed work available',r.status===200&&r.data.work?.state==='reviewed'&&r.data.submissions?.at(-1)?.reviews?.length>0);existing=r.data.work.id;}
   const bc=await browserContext(student);try{
    const p=await bc.newPage();p.setDefaultTimeout(45000);
    await p.goto('https://www.haiedu.am/index.html?'+new URLSearchParams({view:'work',enrollment:f.enrollmentId,release:f.curriculumReleaseId,unit:f.unitId}));
    const card=p.locator('.amp-subject-card').filter({has:p.locator('a[href*="enrollment='+f.enrollmentId+'"]')});await card.waitFor();
    const match='a[href*="enrollment='+f.enrollmentId+'"][href*="release='+f.curriculumReleaseId+'"][href*="unit='+f.unitId+'"][href*="tab=writing"]';
    await card.locator('.student-unit-links summary').click();await card.locator('.student-unit-links '+match).click();await p.locator('.written-list').waitFor();
    check(side+': My work opens writing instead of Courses',await p.locator('.amp-nav-link[aria-current="page"]').innerText()==='Իմ աշխատանքները'&&new URL(p.url()).searchParams.get('tab')==='writing');
    if(reviewed){await p.locator('[data-writing-open="'+reviewed.id+'"]').click();await p.locator('.written-feedback').first().waitFor();check(side+': learner sees existing teacher feedback and score',await p.locator('.written-score').count()>0);}
    await p.locator('#courseCollectionLink').click();await p.locator('.amp-subject-card').first().waitFor();const back=new URL(p.url());check(side+': writing returns to exact My work context',back.searchParams.get('view')==='work'&&back.searchParams.get('enrollment')===f.enrollmentId&&back.searchParams.get('unit')===f.unitId);
   }finally{await bc.close();}
   const tc=await browserContext(teacher);try{
    const p=await tc.newPage();p.setDefaultTimeout(45000);
    await p.goto('https://www.haiedu.am/teacher?'+new URLSearchParams({view:'review',class:f.classId,assignment:f.teacherAssignmentId,release:f.curriculumReleaseId,unit:f.unitId,state:'reviewed'}));await p.locator('[data-writing-state="reviewed"][aria-pressed="true"]').waitFor();
    if(existing){await p.locator('[data-writing-open="'+existing+'"]').click();await p.locator('[data-writing-feedback]').waitFor();check(side+': teacher and learner open the same existing reviewed response',await p.locator('.written-score').count()>0);}
    report.writingReceiptCoverage.push({side,existingReviewedResponse:Boolean(existing),productionWritingMutation:false});
    await p.locator('.hm-role-nav a[href="./teacher.html?view=archive"]').click();await p.locator('#archiveServerQuery').waitFor();check(side+': archive remains separate and searchable',await p.locator('#teacherArchiveView').isVisible()&&!await p.locator('#teacherReviewView').isVisible());
   }finally{await tc.close();}
  }
  for(const side of sides)for(const role of roles){
   const actor=side+'_'+role,bc=await browserContext(actor);try{
    const p=await bc.newPage();p.setDefaultTimeout(45000);await p.goto('https://www.haiedu.am/privacy.html');await p.locator('#accountRole').filter({hasText:role==='student'?'Աշակերտ':role==='teacher'?'Ուսուցիչ':'Դպրոցի ադմին'}).waitFor();
    const expected=role==='student'?'/index.html':role==='teacher'?'/teacher.html':'/school-admin.html',back=new URL(await p.locator('#accountHomeLink').getAttribute('href'),p.url());check(actor+': account returns to its own role',back.pathname===expected);
    check(actor+': account theme keeps student/staff separation',await p.locator('body').evaluate((e,student)=>e.hasAttribute('data-haiedu-student')===student&&e.hasAttribute('data-staff-account')===!student,role==='student'));
   }finally{await bc.close();}
  }
 }
 return {allowed,verify};
}
