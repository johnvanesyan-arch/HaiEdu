import test,{before,after} from 'node:test';
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
async function fixture(t,{holdFirst=false,player=false}={}) {
 const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({contexts,holdFirst,player,id})=>{
  window.__requests=[];window.__pending=[];window.__listeners=[];
  const dashboard=(unit)=>({dashboardVersion:'v1',practiceAccess:{unlocked:true},baseline:{correct:0,answered:5,percent:0},skills:[{id:contexts[0].subjectProgramId,code:'S',nameHy:'Հմտություն',ready:true}],history:[],modes:Object.fromEntries(['diagnostic','practice','mastery_check','chapter_review'].map(mode=>[mode,{status:'configured',questions:unit===contexts[0].unitId?5:9,hintsAllowed:mode==='practice'||mode==='chapter_review',minimumPercent:mode==='mastery_check'?70:null,minimumCorrectBySkill:{[contexts[0].subjectProgramId]:1}}]))});
  window.__client={auth:{getSession:async()=>({data:{session:{user:{id}}}}),onAuthStateChange:fn=>window.__listeners.push(fn)},functions:{invoke:async(name,{body})=>{
    window.__requests.push({name,body});
    if(name==='get-student-classes')return{data:{contexts,navigationVersion:'v1'}};
    if(name==='get-student-dashboard'){
      if(holdFirst&&body.unitId===contexts[0].unitId)return await new Promise(resolve=>window.__pending.push(()=>resolve({data:dashboard(body.unitId)})));
      return{data:dashboard(body.unitId)};
    }
    if(name==='start-learning-session')return{data:{session:{id:'session-fixture',mode:body.mode}}};
    if(name==='get-session-item')return{data:{complete:false,session:{id:'session-fixture',mode:'practice',position:1,total:9},sessionItemId:'served-fixture',item:{id:'item-fixture',type:'true_false',promptHy:'Ճի՞շտ է։',stimulus:{}},remediation:{available:true}}};
    if(name==='submit-answer')return await new Promise(resolve=>window.__pending.push(()=>resolve({data:{grading:{correct:true}}})));
    if(name==='get-remediation-help')return{data:{titleHy:'Հուշում',contentHy:'Փորձեք ևս մեկ անգամ',moreHelpAvailable:false}};
    throw Error(name);
  }}};
 },{contexts,holdFirst,player,id:id(10)});
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
 await page.waitForFunction(()=>document.getElementById('courseContent').textContent==='invalid_context_selection');
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
