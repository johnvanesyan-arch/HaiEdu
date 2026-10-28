import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {fixture,id,context} from '../fixtures/written-work-api.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});});after(async()=>browser?.close());
const origin='https://written-work.test';
const href='/course.html?enrollment='+id(371)+'&release='+id(501)+'&unit='+id(511)+'&tab=writing';
async function pageFixture(t,f,teacher=false,{mobile=false}={}){
 const bc=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:1000}});t.after(()=>bc.close());const page=await bc.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const selector=context(0,teacher);
 await page.addInitScript(({teacher,actor,selector})=>{
  const listeners=new Set();window.__writingListeners=listeners;window.__writingCalls=[];
  const session={user:{id:actor}};
  window.__client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{listeners.add(fn);return{data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:teacher?'teacher':'student',account_status:'active'}})})})}),functions:{invoke:async(name,{body})=>{
   window.__writingCalls.push({name,body});const response=await fetch('/fixture-rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,body})});const data=await response.json();return response.ok?{data}:{data,error:{message:data.error}};
  }}};
 },{teacher,actor:id(teacher?20:10),selector});
 const contextInfo={...context(),subjectProgramId:id(201),subjectNameHy:'Փորձնական առարկա',gradeLabelHy:'7-րդ դասարան',gradeNumber:7,schoolName:'Փորձնական դպրոց',className:'7Ա',academicYearLabel:'2026–2027',unitSequence:1,unitTitleHy:'Փորձնական բաժին',releaseNumber:1};
 let hold=null;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="public";'});
  if(url.pathname==='/fixture-rpc'){
   const {name,body}=route.request().postDataJSON();let data,status=200;
   if(name==='manage-teacher-feedback'){const response=await f.feedbackRequest(body,20);status=response.status;data=await response.json();if(hold&&body.action===hold.action){const release=hold;hold=null;await new Promise(resolve=>{release.resolve=resolve;});}}
   else if(name==='manage-written-work'){const response=await f.request(body,teacher?20:10);status=response.status;data=await response.json();if(hold&&body.action===hold.action){const release=hold;hold=null;await new Promise(resolve=>{release.resolve=resolve;});}}
   else if(name==='get-student-classes')data={contexts:[contextInfo],navigationVersion:'fixture'};
   else if(name==='get-student-dashboard'){const r=await f.admin.rpc('service_student_learning_dashboard',{p_student_id:id(10),p_auth_session_id:id(401),p_enrollment_id:id(371),p_release_id:id(501),p_unit_id:id(511)});if(r.error)throw Error(r.error.message);data=r.data;}
   else if(name==='get-teacher-dashboard')data={teacher:{id:id(20),displayName:'Փորձնական ուսուցիչ'},institutionalTeacher:true,institutionalOptions:[],totals:{classes:1,students:1,studentsNeedingSupport:0},classes:[{id:id(321),assignmentId:id(351),name:'7Ա',isActive:true,schoolId:id(301),academicYear:'2026–2027',gradeNumber:7,schoolName:'Փորձնական դպրոց',subjectName:'Փորձնական առարկա',studentCount:1,students:[],skills:[],unitOptions:[{assignmentId:id(351),curriculumReleaseId:id(501),unitId:id(511),unitSequence:1,unitTitleHy:'Փորձնական բաժին',releaseNumber:1}],selectedUnit:{curriculumReleaseId:id(501),unitId:id(511),unitSequence:1,unitTitleHy:'Փորձնական բաժին',releaseNumber:1},analyticsAvailable:true}]};
   else if(name==='manage-student-invitation')data={invitations:[],joinCodes:[]};
   else throw Error('Unexpected fixture API '+name);
   if(name==='get-teacher-dashboard')data.classes[0].unitOptions.push({...data.classes[0].unitOptions[0],unitId:id(512),unitSequence:2,unitTitleHy:'Երկրորդ փորձնական բաժին'});
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  }
  if(url.origin===origin&&/\.(html|css|js|mjs)$/.test(url.pathname)){
   let source=await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8');
   if(url.pathname.endsWith('.html'))source=source.replace(/<script\b[\s\S]*?<\/script>/g,'').replace('</body>',`<script type="module" src="./${teacher?'teacher':'course-page'}.js"></script></body>`);
   return route.fulfill({contentType:url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':'text/javascript',body:source});
  }
  return route.abort();
 });
 await page.goto(origin+(teacher?'/teacher.html?view=class&class='+id(321):href));
 if(teacher)await page.locator('#teacherOpenWrittenWork').click();
 await page.waitForSelector('.written-work');
 return{page,errors,holdNext(action){const slot={action,resolve:null};hold=slot;return slot;}};
}
test('actual student and teacher workspaces complete draft, submit, return, revision, grading and feedback against SQL',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const learner=await pageFixture(t,f,false,{mobile:true});const marker=await pageFixture(t,f,true);const s=learner.page,m=marker.page;
 await s.locator('[data-writing-open]').click();await s.locator('[data-writing-text]').fill('My synthetic first draft describes a blue jacket.');
 await s.evaluate(actor=>[...window.__writingListeners].forEach(fn=>fn('TOKEN_REFRESHED',{user:{id:actor}})),id(10));assert.equal(await s.locator('[data-writing-text]').inputValue(),'My synthetic first draft describes a blue jacket.');
 await s.locator('[data-writing-save]').click();await s.waitForFunction(()=>document.querySelector('[data-writing-message]').textContent==='Սևագիրը պահպանված է։');
 await m.locator('[data-writing-refresh]').click();assert.equal(await m.locator('[data-writing-open]').count(),0);
 await s.evaluate(()=>{const form=document.querySelector('[data-writing-form]');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await s.waitForSelector('.written-response');assert.equal((await f.db.query('select count(*) n from written_submissions')).rows[0].n,1);
 await m.locator('[data-writing-refresh]').click();await m.locator('[data-writing-open]').click();const heldFeedback=marker.holdNext('save_draft');await m.locator('[data-writing-feedback]').fill('Add a reason for your choice.');await m.locator('[data-writing-feedback]').press('Control+s');
 await new Promise((resolve,reject)=>{const end=Date.now()+5000;const check=()=>heldFeedback.resolve?resolve():Date.now()>end?reject(Error('No held feedback save')):setTimeout(check,20);check();});
 m.once('dialog',d=>d.dismiss());await m.locator('#teacherOpenWrittenWork').click();assert.equal(await m.locator('[data-writing-feedback]').inputValue(),'Add a reason for your choice.');
 m.once('dialog',d=>d.dismiss());await m.locator('#teacherUnitFilter').selectOption(id(501)+':'+id(512));
 assert.equal(await m.locator('#teacherUnitFilter').inputValue(),id(501)+':'+id(511));
 assert.equal(await m.locator('[data-writing-feedback]').inputValue(),'Add a reason for your choice.');
 heldFeedback.resolve();await m.locator('[data-writing-return]').click();await m.waitForFunction(()=>document.querySelector('[data-writing-message]').textContent.includes('վերադարձվել'));
 await s.reload();await s.locator('[data-writing-open]').click();await s.locator('[data-writing-text]').fill('My revised description explains that the blue jacket is comfortable and suitable for school.');await s.locator('[data-writing-submit]').click();await s.waitForSelector('.written-response');
 await m.locator('[data-writing-back]').click();await m.locator('[data-writing-open]').click();for(const [key,value] of Object.entries({task:3,organisation:2,vocabulary:2,grammar:2}))await m.locator(`[data-writing-score="${key}"]`).selectOption(String(value));
 await m.locator('[data-writing-feedback]').fill('Your reason is clear. Check sentence endings.');await m.locator('[data-writing-grade]').click();await m.waitForSelector('.written-score');
 await s.reload();await s.locator('[data-writing-open]').click();await s.waitForSelector('.written-score');assert.equal(await s.locator('.written-score').innerText(),'Արդյունք՝ 9/12');assert.equal(await s.locator('[data-writing-text]').count(),0);
 assert.match(await s.locator('.written-feedback').first().innerText(),/Check sentence endings/);
 assert.equal((await f.db.query('select count(*) n from written_submissions')).rows[0].n,2);assert.equal((await f.db.query('select count(*) n from written_reviews')).rows[0].n,2);
 assert.ok(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await s.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/writing-student-mobile.png',fullPage:true});await m.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/writing-teacher-desktop.png',fullPage:true});}
 assert.deepEqual(learner.errors,[]);assert.deepEqual(marker.errors,[]);
});
test('late autosave responses cannot restore private work after sign-out; draft HTML remains inert',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const learner=await pageFixture(t,f);const s=learner.page;
 await s.locator('[data-writing-open]').click();const held=learner.holdNext('save');await s.locator('[data-writing-text]').fill('<img src=x onerror="window.__writingXss=true">');await s.locator('[data-writing-save]').click();
 await new Promise((resolve,reject)=>{const end=Date.now()+5000;const check=()=>held.resolve?resolve():Date.now()>end?reject(Error('No held save')):setTimeout(check,20);check();});
 await s.evaluate(()=>[...window.__writingListeners].forEach(fn=>fn('SIGNED_OUT',null)));held.resolve();await s.waitForTimeout(80);assert.equal(await s.locator('#courseContent').innerText(),'');assert.equal(await s.evaluate(()=>window.__writingXss),undefined);assert.deepEqual(learner.errors,[]);
});

test('accepted English writing definition completes separately from automatic evidence in a synthetic governed scope',async t=>{
 const materials=JSON.parse(await readFile('docs/content/english-7-unit-01-materials.json','utf8'));
 const accepted=materials.materials.find(m=>m.materialKey==='ENG7-U01-W01');
 const f=await fixture({primaryTask:{definition:accepted.definition,taskKey:accepted.materialKey}});t.after(()=>f.db.close());
 // Exact accepted content, disposable identities and synthetic reviewer only.
 // This is not a production approval, learner session or specialist marking.
 const evidence=async()=>({sessions:(await f.db.query('select * from learning_sessions order by id')).rows,mastery:(await f.db.query('select * from student_skill_mastery_by_release order by curriculum_release_id,student_id,skill_id')).rows});
 const before=await evidence();
 const learner=await pageFixture(t,f,false,{mobile:true}),marker=await pageFixture(t,f,true),s=learner.page,m=marker.page;
 await s.locator('[data-writing-open]').click();
 assert.equal(await s.locator('.written-work h3').first().innerText(),accepted.definition.title);
 assert.equal(await s.locator('[data-writing-assistance]').innerText(),accepted.definition.assistance.policy);
 assert.equal(await s.locator('[data-writing-text]').getAttribute('spellcheck'),'false');
 assert.match(await s.locator('[data-writing-scope]').innerText(),/չի որոշում դրա արդյունքը/);
 assert.match(await s.locator('.written-work').innerText(),/80–100 բառ/);
 await s.locator('.written-rubric summary').click();
 for(const criterion of accepted.definition.criteria)assert.ok((await s.locator('.written-rubric').innerText()).includes(criterion.descriptors[3]));
 // Exercise the accepted word-count convention without publishing a model answer.
 const text=Array(79).fill('fixture').concat("don't",'blue-green').join(' ');
 await s.locator('[data-writing-text]').fill(text);assert.equal(await s.locator('[data-writing-count]').innerText(),'81 բառ');
 await s.locator('[data-writing-save]').click();await s.waitForFunction(()=>document.querySelector('[data-writing-message]').textContent==='Սևագիրը պահպանված է։');
 await m.locator('[data-writing-refresh]').click();assert.equal(await m.locator('[data-writing-open]').count(),0);
 await s.reload();await s.locator('[data-writing-open]').click();assert.equal(await s.locator('[data-writing-text]').inputValue(),text);
 await s.locator('[data-writing-submit]').click();await s.waitForSelector('.written-response');assert.equal(await s.locator('.written-score').count(),0);
 assert.match(await s.locator('.written-work').innerText(),/Սպասում է ուսուցչի ստուգմանը/);
 const foreign=await f.request({action:'inspect',context:context(2,true),payload:{workId:(await f.db.query('select id from written_work')).rows[0].id}},21);
 assert.equal(foreign.status,403);
 await m.locator('[data-writing-refresh]').click();await m.locator('[data-writing-open]').click();
 assert.equal(await m.locator('[data-writing-assistance]').innerText(),accepted.definition.assistance.policy);
 for(const criterion of accepted.definition.criteria)await m.locator(`[data-writing-score="${criterion.key}"]`).selectOption('2');
 await m.locator('[data-writing-feedback]').fill('Synthetic workflow check; these marks do not evaluate language quality.');
 await m.locator('[data-writing-grade]').click();await m.waitForSelector('.written-score');
 await s.reload();await s.locator('[data-writing-open]').click();await s.waitForSelector('.written-score');
 assert.equal(await s.locator('.written-score').innerText(),'Արդյունք՝ 8/12');
 assert.doesNotMatch(await s.locator('.written-work').innerText(),/Ստուգարքն անցած է|Ստուգարքը չի անցել/);
 assert.deepEqual(await evidence(),before);
 const other=await f.request({action:'tasks',context:context(1),payload:{}});assert.ok((await other.json()).tasks.every(task=>task.title!==accepted.definition.title));
 assert.ok(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await s.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/english-writing-mobile.png',fullPage:true});await m.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/english-writing-teacher.png',fullPage:true});}
 assert.deepEqual(learner.errors,[]);assert.deepEqual(marker.errors,[]);
});
