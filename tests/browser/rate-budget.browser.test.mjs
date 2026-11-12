import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {learnerFixture} from '../fixtures/request-count-browser.mjs';
import {staffFixture} from '../fixtures/staff-rate-browser.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const expected='Խնդրում ենք սպասել 60 վայրկյան և կրկին փորձել։';
async function refuse(page,name,{wait=true,held=false}={}){
  await page.evaluate(({name,wait,held})=>{
    const client=window.__haieduSupabaseClient??window.__client,original=client.functions.invoke;
    window.__rateCalls=[];
    client.functions.invoke=async(fn,args)=>{
      if(fn!==name)return original(fn,args);
      window.__rateCalls.push({name:fn,body:args.body});
      if(held)await new Promise(resolve=>window.__releaseRate=resolve);
      return {data:null,error:{context:new Response(JSON.stringify({error:'rate_limit_exceeded',...(wait?{retryAfterSeconds:60}:{})}),{status:429,headers:wait?{'Retry-After':'60'}:{}})}};
    };
  },{name,wait,held});
}
async function screenshot(page,name){if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/bf16-'+name+'.png',fullPage:true});}}

for(const width of [375,1280])for(const scale of [100,200])test(`student refusal retains its code and reflows at ${width}/${scale}%`,async t=>{
  const {page,errors}=await learnerFixture(browser,t,{route:'join.html'});
  await page.setViewportSize({width,height:1000});await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',scale);
  await page.waitForFunction(()=>!document.querySelector('#joinBtn').disabled);await refuse(page,'join-class');
  await page.locator('#joinCode').fill('ABCD2345');await page.locator('#joinBtn').click();await expect(page.locator('#message')).toHaveText(expected);
  await expect(page.locator('#joinCode')).toHaveValue('ABCD2345');await expect(page.locator('#joinBtn')).toBeEnabled();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__rateCalls.length),1,'no automatic write retry');
  await screenshot(page,'student-'+width+'-'+scale);assert.deepEqual(errors,[]);
});

test('late refusal cannot overwrite the next account or restore a signed-out form',async t=>{
  const {page,errors}=await learnerFixture(browser,t,{route:'join.html'});await page.waitForFunction(()=>!document.querySelector('#joinBtn').disabled);
  await refuse(page,'join-class',{held:true});await page.locator('#joinCode').fill('ABCD2345');await page.locator('#joinBtn').click();await page.waitForFunction(()=>window.__releaseRate);
  await page.evaluate(()=>{window.__client.auth.signOut();window.__releaseRate();});
  await expect(page.locator('#joinBtn')).toBeDisabled();await expect(page.locator('#message')).not.toHaveText(expected);assert.deepEqual(errors,[]);
});

for(const width of [390,1280])test(`teacher draft stays editable after a definite refusal at ${width}/200%`,async t=>{
  const bc=await browser.newContext({viewport:{width,height:1000}});t.after(()=>bc.close());const page=await bc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__calls=[];window.__listeners=[];window.__client={auth:{getSession:async()=>({data:{session:{user:{id:'teacher'}}}}),onAuthStateChange:fn=>{window.__listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};}},functions:{invoke:async(name,{body})=>{window.__calls.push({name,body});return {data:null,error:{context:new Response(JSON.stringify({error:'rate_limit_exceeded',retryAfterSeconds:60}),{status:429})}};}}};
  });
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='https://rate-teacher.test')return route.abort();
    if(u.pathname==='/harness')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="hy"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/written-work.css"><link rel="stylesheet" href="/writing-assignments.css"><body><main><div id="root"></div></main><script type="module">import{mountTeacherTaskEditor}from'/teacher-task-editor.mjs';document.documentElement.style.fontSize='200%';window.__view=mountTeacherTaskEditor({root:document.querySelector('#root'),client:window.__client,actorId:'teacher',context:{assignmentId:'synthetic',curriculumReleaseId:'synthetic',unitId:'synthetic'}});</script></body></html>`});
    try{return route.fulfill({body:await readFile(new URL('../../web'+u.pathname,import.meta.url)),contentType:/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('https://rate-teacher.test/harness');await page.locator('[data-field=title]').fill('Իմ դասարանի առաջադրանքը');await page.locator('[data-field=instructions]').fill('Կարդացեք և բացատրեք պատասխանը։');await page.locator('[data-field=text]').fill('Սկզբնական նյութը մնում է էջում։');
  await page.locator('[data-editor-save]').click();await expect(page.locator('[data-editor-message]')).toHaveText(expected);
  await expect(page.locator('[data-field=title]')).toHaveValue('Իմ դասարանի առաջադրանքը');await expect(page.locator('[data-field=text]')).toHaveValue('Սկզբնական նյութը մնում է էջում։');
  await expect(page.locator('[data-field=title]')).toBeEnabled();await expect(page.locator('[data-editor-save]')).toBeEnabled();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.equal(await page.evaluate(()=>window.__calls.length),1);await screenshot(page,'teacher-'+width);assert.deepEqual(errors,[]);
});

for(const width of [390,1280])test(`school invitation retains its email after refusal at ${width}/200%`,async t=>{
  const {page,errors}=await staffFixture(browser,t,'school-admin',{width,large:true});await page.locator('#teacherSchool option').first().waitFor({state:'attached'});
  await page.evaluate(()=>document.querySelector('#teacherSubject').innerHTML='<option value="fixture-programme">Փորձնական առարկա</option>');
  await refuse(page,'provision-staff-account');await page.locator('.hm-role-nav a[href="#teacherPanel"]').click();await page.locator('#teacherEmail').fill('synthetic@example.invalid');
  await page.locator('#teacherForm button[type=submit]').click();await expect(page.locator('#teacherMessage')).toHaveText(expected);await expect(page.locator('#teacherEmail')).toHaveValue('synthetic@example.invalid');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.equal(await page.evaluate(()=>window.__rateCalls.length),1);await screenshot(page,'school-'+width);assert.deepEqual(errors,[]);
});

test('master admin search refusal shows the wait without an unhandled promise or clearing the query',async t=>{
  const {page,errors}=await staffFixture(browser,t,'admin');await page.locator('[data-open-school]').first().waitFor();await refuse(page,'get-admin-dashboard');
  await page.locator('#schoolSearch').fill('Իմ դպրոցը');await page.locator('#schoolSearchForm button[type=submit]').click();await expect(page.locator('#consoleMessage')).toHaveText(expected);
  await expect(page.locator('#schoolSearch')).toHaveValue('Իմ դպրոցը');assert.equal(await page.evaluate(()=>window.__rateCalls.length),1);assert.deepEqual(errors,[]);
});
