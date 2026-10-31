import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';

let browser;
before(async()=>browser=await chromium.launch({headless:true}));
after(async()=>browser?.close());
const id=n=>'79000000-0000-4000-8000-'+String(n).padStart(12,'0');
const modules={
 student:['student-teacher-tasks.mjs','mountStudentTeacherTasks','manage-teacher-task-student-work','inbox'],
 review:['teacher-task-review.mjs','mountTeacherTaskReview','manage-teacher-task-review','queue'],
 send:['teacher-task-send.mjs','mountTeacherTaskSend','manage-teacher-task-delivery','preview'],
 editor:['teacher-task-editor.mjs','mountTeacherTaskEditor','manage-teacher-task-sources','open'],
};
for(const [kind,[file,mount,endpoint,action]]of Object.entries(modules))test(kind+' permits navigation during a clean read without treating it as saved work',async t=>{
 const bc=await browser.newContext({viewport:{width:768,height:960},serviceWorkers:'block'});t.after(()=>bc.close());
 const page=await bc.newPage(),errors=[],dialogs=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
 const context={assignmentId:id(1),curriculumReleaseId:id(2),unitId:id(3)};
 const draft={id:id(4),revision:1,definition:{schemaVersion:'teacher-task-v1',title:'Saved task',instructions:'Read the source.',source:{kind:'pdf',attachmentId:id(5)},response:{kind:'text'},assessment:{kind:'feedback'}}};
 await page.addInitScript(({actorId,context,draft,endpoint,action})=>{
  const session={user:{id:actorId}};window.__readCalls=[];window.__readOptions={actorId,context,draft};
  window.__client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},functions:{invoke:async(name,{body})=>{
   window.__readCalls.push({name,body});if(name!==endpoint||body.action!==action)throw Error('Unexpected mutation in read-only fixture');
   return new Promise(resolve=>window.__releaseRead=resolve);
  }}};
 },{actorId:id(10),context,draft,endpoint,action});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://read-navigation.test')return route.abort();
  if(u.pathname==='/outside')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="hy"><h1>Այլ էջ</h1></html>'});
  if(u.pathname==='/harness')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="hy"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/written-work.css"><link rel="stylesheet" href="/writing-assignments.css"><body><main><a href="/outside">Բացել այլ էջ</a><div id="root"></div></main><script type="module">import{${mount}}from'/${file}';window.__view=${mount}({root:document.querySelector('#root'),client:window.__client,...window.__readOptions});</script></body></html>`});
  try{return route.fulfill({body:await readFile(new URL('../../web'+u.pathname,import.meta.url)),contentType:/\.m?js$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://read-navigation.test/harness');await page.waitForFunction(()=>Boolean(window.__view));
 if(kind==='editor')await page.locator('[data-editor-pdf]').click();
 await page.waitForFunction(()=>window.__readCalls.length===1);await expect(page.locator('#root')).toHaveAttribute('aria-busy','true');
 assert.deepEqual(await page.evaluate(()=>({canLeave:window.__view.canLeave(),hasUnsaved:window.__view.hasUnsaved()})),{canLeave:true,hasUnsaved:false});
 await page.getByRole('link',{name:'Բացել այլ էջ',exact:true}).click();await expect(page).toHaveURL('https://read-navigation.test/outside');await expect(page.getByRole('heading')).toHaveText('Այլ էջ');
 assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);
});
