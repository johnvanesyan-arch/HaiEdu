import test,{before,after} from 'node:test';

async function teacherFixture(t,{history=false}={}) {
 const context=await browser.newContext();t.after(()=>context.close());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=(await readFile(new URL('../../web/teacher.html',import.meta.url),'utf8')).replace(/<script\b[\s\S]*?<\/script>/g,'').replace('</head>','<style>.hidden{display:none!important}</style></head>').replace('</body>','<script type="module" src="./teacher.js"></script></body>');
 await page.addInitScript(({history})=>{
  window.__teacherPending=[];window.__teacherListeners=[];
  const units=[1,2].map(n=>({assignmentId:'assignment-a',curriculumReleaseId:'release-a',unitId:'unit-'+n,unitSequence:n,unitTitleHy:'Գլուխ '+n,releaseNumber:1}));
  const dashboard=()=>({teacher:{id:'teacher-a',displayName:'Fixture teacher'},institutionalTeacher:true,institutionalOptions:[],totals:{classes:2,students:0,studentsNeedingSupport:0},classes:['a','b'].map(key=>({id:'class-'+key,name:'Դասարան '+key,isActive:!history,schoolId:'school-a',assignmentId:'assignment-'+key,academicYear:'2026',gradeNumber:8,schoolName:'Դպրոց',subjectName:'Առարկա',studentCount:0,students:[],skills:[],unitOptions:units,selectedUnit:units[0],analyticsAvailable:true}))});
  window.__client={auth:{getSession:async()=>({data:{session:{user:{id:'teacher-a'}}}}),onAuthStateChange:fn=>window.__teacherListeners.push(fn)},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'teacher',account_status:'active'}})})})}),functions:{invoke:async(name,{body})=>{
   if(name==='get-teacher-dashboard'){
    if(body.selection?.unitId==='unit-2')return await new Promise(resolve=>window.__teacherPending.push(()=>{const d=dashboard();d.classes[0].selectedUnit=d.classes[0].unitOptions[1];resolve({data:d});}));
    return {data:dashboard()};
   }
   if(name==='manage-student-invitation')return {data:{invitations:[],joinCodes:[]}};
   throw Error(name);
  }}};
 },{history});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="public";'});
  if(url.pathname==='/teacher.html')return route.fulfill({contentType:'text/html',body:html});
  if(url.origin===origin&&/\.(mjs|js)$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8')});
  return route.abort();
 });
 await page.goto(origin+'/teacher.html?view=class&class=class-a');
 await page.waitForFunction(()=>document.getElementById('institutionalSelectedName').textContent==='Դասարան a');
 return {page,errors};
}
test('a late teacher chapter response cannot overwrite a newly selected classroom',async t=>{
 const {page,errors}=await teacherFixture(t);
 await page.locator('#teacherUnitFilter').selectOption('release-a:unit-2');
 await page.waitForFunction(()=>window.__teacherPending.length===1);
 assert.equal(await page.locator('#matrixAnalyticsCard').isVisible(),false);
 await page.evaluate(()=>document.querySelectorAll('#classList .teacher-class-button')[1].click());
 assert.equal(await page.locator('#institutionalSelectedName').innerText(),'Դասարան b');
 await page.evaluate(()=>window.__teacherPending.shift()());await page.waitForTimeout(60);
 assert.equal(await page.locator('#institutionalSelectedName').innerText(),'Դասարան b');
 assert.equal(await page.locator('#teacherUnitFilter').inputValue(),'release-a:unit-1');
 assert.deepEqual(errors,[]);
});
test('teacher sign-out invalidates a pending chapter response and clears the evidence drawer',async t=>{
 const {page,errors}=await teacherFixture(t);
 await page.locator('#teacherUnitFilter').selectOption('release-a:unit-2');
 await page.waitForFunction(()=>window.__teacherPending.length===1);
 await page.evaluate(()=>{document.getElementById('studentDrawerContent').textContent='Private evidence';document.getElementById('studentDrawer').classList.remove('hidden');window.__teacherListeners.forEach(fn=>fn('SIGNED_OUT',null));});
 await page.evaluate(()=>window.__teacherPending.shift()());await page.waitForTimeout(60);
 assert.equal(await page.locator('#dashboardPanel').isVisible(),false);
 assert.equal(await page.locator('#studentDrawer').isVisible(),false);
 assert.equal(await page.locator('#studentDrawerContent').textContent(),'');
 assert.deepEqual(errors,[]);
});
test('historical classroom navigation retains the exact release and chapter selection',async t=>{
 const {page,errors}=await teacherFixture(t,{history:true});
 await page.locator('#teacherUnitFilter').selectOption('release-a:unit-2');
 await page.waitForFunction(()=>window.__teacherPending.length===1);
 await page.evaluate(()=>window.__teacherPending.shift()());
 await page.waitForFunction(()=>new URL(location.href).searchParams.get('unit')==='unit-2');
 const selection=new URL(page.url()).searchParams;
 assert.equal(selection.get('source'),'archive');
 assert.equal(selection.get('assignment'),'assignment-a');
 assert.equal(selection.get('release'),'release-a');
 assert.deepEqual(errors,[]);
});

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
let browser;
before(async()=>{browser=await chromium.launch({headless:true});});
after(async()=>{await browser?.close();});
const origin='https://learning-context.test';
const id=n=>`71000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const contexts=[1,2].map(n=>({enrollmentId:id(1),curriculumReleaseId:id(2),unitId:id(n+2),subjectProgramId:id(5),unitSequence:n,unitTitleHy:n===1?'Գլուխ Ա':'Գլուխ Բ',subjectNameHy:'Առարկա',gradeLabelHy:'8-րդ դասարան',gradeNumber:8,schoolName:'Դպրոց Ա',className:'8Ա',academicYearLabel:'2026–2027',releaseNumber:2}));
const href=n=>`/course.html?enrollment=${id(1)}&release=${id(2)}&unit=${id(n+2)}`;
async function fixture(t,{holdFirst=false,player=false,retired=false,completeAfterAnswer=false,splitReleases=false}={}) {
 const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({contexts,holdFirst,player,retired,completeAfterAnswer,id})=>{
  window.__requests=[];window.__pending=[];window.__listeners=[];
  const dashboard=(unit)=>({dashboardVersion:'v1',practiceAccess:{unlocked:true},baseline:{correct:0,answered:5,percent:0},skills:[{id:contexts[0].subjectProgramId,code:'S',nameHy:'Հմտություն',ready:true}],history:[],modes:Object.fromEntries(['diagnostic','practice','mastery_check','chapter_review'].map(mode=>[mode,{status:'configured',questions:unit===contexts[0].unitId?5:9,hintsAllowed:mode==='practice'||mode==='chapter_review',minimumPercent:mode==='mastery_check'?70:null,minimumCorrectBySkill:{[contexts[0].subjectProgramId]:1}}]))});
  window.__client={auth:{getSession:async()=>({data:{session:{user:{id}}}}),onAuthStateChange:fn=>window.__listeners.push(fn)},functions:{invoke:async(name,{body})=>{
    window.__requests.push({name,body});
    if(name==='get-student-classes')return{data:{contexts,navigationVersion:'v1'}};
    if(name==='get-student-dashboard'){
      if(holdFirst&&body.unitId===contexts[0].unitId)return await new Promise(resolve=>window.__pending.push(()=>resolve({data:dashboard(body.unitId)})));
      const result=dashboard(body.unitId);if(retired){result.modes.practice={status:'unconfigured'};result.activeSession={id:'session-fixture',mode:'practice',answered:0,planned:9,policyBindingId:'original-binding'};}return{data:result};
    }
    if(name==='get-mastery-check-status')return{data:{assessmentPolicy:{plannedQuestionCount:9,minimumPercent:null,hintsAllowed:true}}};
    if(name==='start-learning-session')return{data:{session:{id:'session-fixture',mode:body.mode}}};
    if(name==='get-session-item') {
      if(completeAfterAnswer&&window.__answered)return{data:{complete:true,summary:{correct:9,answered:9,percent:100}}};
      return{data:{complete:false,session:{id:'session-fixture',mode:'practice',position:completeAfterAnswer?9:1,total:9},sessionItemId:'served-fixture',item:{id:'item-fixture',type:'true_false',promptHy:'Ճի՞շտ է։',stimulus:{}},remediation:{available:true}}};
    }
    if(name==='submit-answer')return await new Promise(resolve=>window.__pending.push(()=>{window.__answered=true;resolve({data:{grading:{correct:true}}});}));
    if(name==='get-remediation-help')return{data:{titleHy:'Հուշում',contentHy:'Փորձեք ևս մեկ անգամ',moreHelpAvailable:false}};
    throw Error(name);
  }}};
 },{contexts:contexts.map((c,i)=>splitReleases&&i===1?{...c,curriculumReleaseId:id(20),releaseNumber:3}:c),holdFirst,player,retired,completeAfterAnswer,id:id(10)});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="public";'});
  if(url.pathname==='/course.html')return route.fulfill({contentType:'text/html',body:'<html><head><style>.hidden{display:none}</style></head><body data-student-page="course"><nav class="amp-nav-list"></nav><h1 id="courseTitle"></h1><p id="courseSubtitle"></p><div id="courseLoading"></div><main id="courseContent"></main><script type="module" src="./course-page.js"></script><script type="module" src="./student-courses.js"></script><script type="module" src="./course-gate.js"></script></body></html>'});
  if(url.origin===origin&&/\.(mjs|js)$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8')});
  return route.abort();
 });
 await page.goto(origin+href(player?2:1)+(player?'&action=practice':''));return{page,errors};
}
test('one course spans independently released chapters without changing either release identity',async t=>{
 const {page,errors}=await fixture(t,{splitReleases:true});
 await page.waitForSelector('.course-chapters a');
 assert.equal(await page.locator('.amp-nav-list a[href*="view=courses"]').count(),1);
 const chapters=page.locator('.course-chapters a');assert.equal(await chapters.count(),2);
 assert.equal(new URL(await chapters.nth(0).getAttribute('href'),origin).searchParams.get('release'),id(2));
 assert.equal(new URL(await chapters.nth(1).getAttribute('href'),origin).searchParams.get('release'),id(20));
 await chapters.nth(1).click();
 await page.waitForFunction(()=>document.getElementById('courseTitle').textContent.includes('Գլուխ Բ'));
 assert.equal(new URL(page.url()).searchParams.get('release'),id(20));
 assert.equal(await page.locator('.amp-nav-list a[href*="view=courses"]').count(),1);
 assert.equal(await page.locator('.course-chapters a[aria-current=page]').innerText(),'Գլուխ Բ');
 assert.equal(await page.evaluate(()=>window.__requests.filter(x=>x.name==='get-student-dashboard').at(-1).body.curriculumReleaseId),id(20));
 assert.deepEqual(errors,[]);
});
test('native context switching clears old cards and rejects a late dashboard response',async t=>{
 const {page,errors}=await fixture(t,{holdFirst:true});
 await page.waitForFunction(()=>window.__pending.length===1);
 await page.evaluate(url=>{history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'));},href(2));
 await page.waitForFunction(()=>document.getElementById('courseTitle').textContent.includes('Գլուխ Բ'));
 assert.match(await page.locator('#courseContent').innerText(),/9 հարց/);
 await page.evaluate(()=>window.__pending.shift()());
 await page.waitForTimeout(60);
 assert.match(await page.locator('#courseTitle').innerText(),/Գլուխ Բ/);
 assert.doesNotMatch(await page.locator('#courseContent').innerText(),/5 հարց/);
 assert.deepEqual(errors,[]);
});
test('a malformed URL fails closed; sign-out clears private course evidence and navigation',async t=>{
 const {page,errors}=await fixture(t);
 await page.waitForFunction(()=>document.getElementById('courseTitle').textContent.includes('Գլուխ Ա'));
 await page.evaluate(()=>{history.pushState({},'','?unit=forged');dispatchEvent(new PopStateEvent('popstate'));});
 await page.waitForFunction(()=>document.getElementById('courseContent').textContent==='Ընտրեք դասընթացը գլխավոր էջից։');
 assert.doesNotMatch(await page.locator('#courseContent').innerText(),/0\/5/);
 await page.evaluate(()=>window.__listeners.forEach(fn=>fn('SIGNED_OUT',null)));
 assert.equal(await page.locator('#courseContent').innerText(),'');assert.doesNotMatch(await page.locator('.amp-nav-list').innerText(),/Առարկա/);assert.deepEqual(errors,[]);
});
test('configured player uses served counts, prevents duplicate answers and ignores old-account responses',async t=>{
 const {page,errors}=await fixture(t,{player:true});
 await page.waitForSelector('#learningPlayer input[name=answer]');
 assert.match(await page.locator('#learningPlayer').innerText(),/Հարց 1\/9/);
 await page.locator('#learningPlayer input[value=true]').check();
 await page.evaluate(()=>{const f=document.querySelector('#learningPlayer form');f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await page.waitForFunction(()=>window.__pending.length===1);
 assert.equal(await page.evaluate(()=>window.__requests.filter(x=>x.name==='submit-answer').length),1);
 await page.evaluate(()=>window.__listeners.forEach(fn=>fn('SIGNED_OUT',null)));
 await page.evaluate(()=>window.__pending.shift()());await page.waitForTimeout(60);
 assert.equal(await page.locator('#courseContent').innerText(),'');assert.deepEqual(errors,[]);
});

test('an active bound session resumes using original instructions after its prospective blueprint retires',async t=>{
 const {page,errors}=await fixture(t,{player:true,retired:true});
 await page.waitForSelector('#learningPlayer input[name=answer]');
 assert.match(await page.locator('#learningPlayer').innerText(),/Սեսիայի սկզբնական կանոններ՝ 9 հարց/);
 assert.equal(await page.evaluate(()=>window.__requests.filter(x=>x.name==='get-mastery-check-status')[0].body.sessionId),'session-fixture');
 assert.deepEqual(errors,[]);
});
test('completion refresh returns to the dashboard without starting another session',async t=>{
 const {page,errors}=await fixture(t,{player:true,completeAfterAnswer:true});
 await page.waitForSelector('#learningPlayer input[name=answer]');
 await page.locator('#learningPlayer input[value=true]').check();
 await page.locator('#learningPlayer button[type=submit]').click();
 await page.waitForFunction(()=>window.__pending.length===1);
 await page.evaluate(()=>window.__pending.shift()());
 await page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'}).click();
 await page.locator('#learningPlayer button').filter({hasText:'Թարմացնել արդյունքները'}).click();
 await page.waitForFunction(()=>!new URL(location.href).searchParams.has('action')&&document.getElementById('learningPlayer')?.children.length===0);
 assert.equal(await page.evaluate(()=>window.__requests.filter(x=>x.name==='start-learning-session').length),1);
 assert.deepEqual(errors,[]);
});
