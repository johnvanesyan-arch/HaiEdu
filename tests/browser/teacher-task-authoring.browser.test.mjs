import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {authoringFixture,id,context,token} from '../fixtures/teacher-task-authoring-api.mjs';
let browser;
before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
async function surface(t,{width=1280,large=false}={}){
 const f=await authoringFixture();t.after(()=>f.db.close());
 const bc=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});t.after(()=>bc.close());const page=await bc.newPage(),errors=[];let drop=null,hold=null;
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.addInitScript(({actor,credential,scope,large})=>{
  let session={user:{id:actor}},listeners=[];window.__calls=[];window.__actor=actor;window.__scope=scope;window.__large=large;
  window.__client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{listeners.push(fn);return{data:{subscription:{unsubscribe(){listeners=listeners.filter(f=>f!==fn);}}}};}},functions:{invoke:async(name,{body})=>{
   window.__calls.push({name,body:body instanceof FormData?JSON.parse(body.get('request')):body});
   const multipart=body instanceof FormData,r=await fetch('/fixture/'+name,{method:'POST',headers:{Authorization:'Bearer '+credential,...(multipart?{}:{'Content-Type':'application/json'})},body:multipart?body:JSON.stringify(body)});
   const data=r.headers.get('content-type')?.includes('application/pdf')?await r.blob():await r.json();return r.ok?{data}:{data,error:{message:data.error}};
  }}};
  window.__switch=()=>{session={user:{id:'other'}};[...listeners].forEach(f=>f('SIGNED_IN',session));};
 },{actor:id(20),credential:token(20),scope:context(0,true),large});
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin!=='https://authoring.test')return route.abort();
  if(u.pathname.startsWith('/fixture/')){
   const handler=u.pathname.endsWith('manage-writing-assignments')?f.handle:u.pathname.endsWith('manage-teacher-task-sources')?f.handleSource:f.handleDraft;
   const request=new Request('https://fixture.invalid',{method:'POST',headers:req.headers(),body:req.postDataBuffer()});let action;
   if(req.headers()['content-type']?.includes('json'))action=req.postDataJSON().action;
   const response=await handler(request);
   if(hold&&hold.action===action){const slot=hold;hold=null;await new Promise(r=>slot.release=r);}
   if(drop===action){drop=null;return route.fulfill({status:503,contentType:'application/json',body:'{"error":"unknown_transport"}'});}
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(u.pathname==='/harness')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="hy"><meta charset="utf-8"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/role-layout.css"><link rel="stylesheet" href="/writing-assignments.css"><body data-role-workspace="teacher" class="hm-role-workspace"><main style="max-width:65rem;margin:auto;padding:1rem"><a href="/outside">Գլխավոր էջ</a><div id="root"></div></main><script type="module">import{mountTeacherAssignmentWorkspace}from"/writing-assignments.mjs";if(window.__large)document.documentElement.style.fontSize="32px";window.__view=mountTeacherAssignmentWorkspace({root:document.querySelector("#root"),client:window.__client,actorId:window.__actor,context:window.__scope});</script>'});
  try{return route.fulfill({body:await readFile(new URL('../../web'+u.pathname,import.meta.url)),contentType:u.pathname.endsWith('.mjs')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://authoring.test/harness');await page.locator('[data-wa-custom]').click();await expect(page.locator('[data-drafts-new]')).toBeVisible();
 return{...f,page,errors,drop(action){drop=action;},hold(action){const slot={action};hold=slot;return slot;}};
}
async function fill(p,title='Class task'){
 await p.locator('[data-drafts-new]').click();await p.locator('[data-field=title]').fill(title);await p.locator('[data-field=instructions]').fill('Read the task and explain your answer.');await p.locator('[data-field=text]').fill('First paragraph.\n\nSecond paragraph.');
}
async function save(p){await p.locator('[data-editor-save]').click();await expect(p.locator('[data-editor-message]')).toContainText('Սևագիրը պահպանված է');}
test('all nine independent source/response drafts save through actual SQL/Edge without sending learner work',async t=>{
 const f=await surface(t),p=f.page;
 for(const source of ['text','pdf','link'])for(const response of ['text','document','link']){
  await fill(p,source+' / '+response);await p.locator('[data-field=sourceKind]').selectOption(source);
  if(source==='pdf'){await p.locator('[data-editor-file]').setInputFiles({name:'task.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n')});await p.locator('[data-field=sourceKind]').selectOption('text');await save(p);assert.equal(await p.evaluate(()=>window.__view.hasUnsaved()),false);await p.locator('[data-field=sourceKind]').selectOption('pdf');await expect(p.locator('[data-editor-filename]')).toContainText('task.pdf');}
  if(source==='link')await p.locator('[data-field=sourceUrl]').fill('https://example.org/task');
  await p.locator('[data-field=responseKind]').selectOption(response);if(response==='document')await p.locator('[data-editor-formats]').selectOption('docx');
  await save(p);if(source==='pdf'){const downloaded=p.waitForEvent('download');await p.locator('[data-editor-pdf]').click();assert.equal((await downloaded).suggestedFilename(),'haiedu-task.pdf');}await p.locator('[data-editor-close]').click();await expect(p.locator('[data-drafts-new]')).toBeVisible();
 }
 const drafts=(await f.db.query('select definition from teacher_task_drafts')).rows;assert.equal(drafts.length,9);assert.equal(new Set(drafts.map(r=>r.definition.source.kind+'/'+r.definition.response.kind)).size,9);assert.ok(drafts.filter(r=>r.definition.response.kind==='document').every(r=>r.definition.response.allowedFormats.join()==='docx'));
 assert.equal((await f.db.query('select count(*)::int n from writing_assignments')).rows[0].n,0);assert.equal((await f.db.query('select count(*)::int n from written_work')).rows[0].n,0);await p.locator('article').filter({hasText:'pdf / link'}).locator('[data-drafts-copy]').click();await expect(p.locator('[data-editor-message]')).toContainText('PDF-ը պետք է կցել նորից');await expect(p.locator('[data-editor-pdf]')).toHaveCount(0);assert.deepEqual(f.errors,[]);
});
test('unknown draft save fences edits, navigation/logout, retries one nonce and ignores late account responses',async t=>{
 const f=await surface(t),p=f.page;await fill(p);f.drop('create');await p.locator('[data-editor-save]').click();await expect(p.locator('[data-editor-retry]')).toBeVisible();await expect(p.locator('[data-field=title]')).toBeDisabled();await p.locator('a[href="/outside"]').click();await expect(p).toHaveURL(/harness/);
 assert.equal(await p.evaluate(()=>document.dispatchEvent(new CustomEvent('haiedu-before-signout',{cancelable:true}))),false);
 await p.locator('[data-editor-retry]').click();await expect(p.locator('[data-editor-message]')).toContainText('Սևագիրը պահպանված է');const creates=await p.evaluate(()=>window.__calls.filter(c=>c.name==='manage-teacher-task-drafts'&&c.body.action==='create'));assert.equal(creates.length,2);assert.deepEqual(creates[0],creates[1]);assert.equal((await f.db.query('select count(*)::int n from teacher_task_drafts')).rows[0].n,1);
 await p.locator('[data-field=title]').fill('Later save');const held=f.hold('save');await p.locator('[data-editor-save]').click();await p.waitForFunction(()=>window.__calls.some(c=>c.body.action==='save'));while(!held.release)await new Promise(r=>setTimeout(r,10));await p.evaluate(()=>window.__switch());held.release();await expect(p.locator('#root')).toContainText('Հաշիվը փոխվել է');await expect(p.locator('[data-field=title]')).toHaveCount(0);assert.deepEqual(f.errors,[]);
});
test('conflict preserves text until deliberate reload, and reuse creates a separate editable draft',async t=>{
 const f=await surface(t),p=f.page;await fill(p);await save(p);const original=(await f.db.query('select id,definition from teacher_task_drafts')).rows[0];
 const newer={...original.definition,title:'Saved from another window'};await f.db.query('select service_teacher_task_drafts($1,$2,$3,$4,$5)',[id(20),id(420),'save',JSON.stringify(context(0,true)),JSON.stringify({id:original.id,expectedRevision:1,definition:newer})]);
 await p.locator('[data-field=title]').fill('My unsaved title');await p.locator('[data-editor-save]').click();await expect(p.locator('[data-editor-reload]')).toBeVisible();await expect(p.locator('[data-field=title]')).toHaveValue('My unsaved title');
 p.once('dialog',d=>d.accept());await p.locator('[data-editor-reload]').click();await expect(p.locator('[data-field=title]')).toHaveValue(newer.title);await p.locator('[data-editor-close]').click();await p.locator('[data-drafts-copy]').click();await expect(p.locator('[data-editor-message]')).toContainText('նոր սևագիր');await p.locator('[data-field=title]').fill('My separate copy');await save(p);
 assert.equal((await f.db.query('select count(*)::int n from teacher_task_drafts')).rows[0].n,2);assert.equal((await f.db.query('select definition from teacher_task_drafts where id=$1',[original.id])).rows[0].definition.title,newer.title);await p.locator('[data-editor-close]').click();for(let i=0;i<2;i++){const before=await p.evaluate(()=>window.__calls.filter(c=>c.name==='manage-teacher-task-drafts'&&c.body.action==='list').length);await p.locator('[data-drafts-close]').click();await p.locator('[data-wa-custom]').click();await expect(p.locator('[data-drafts-new]')).toBeVisible();assert.equal(await p.evaluate(()=>window.__calls.filter(c=>c.name==='manage-teacher-task-drafts'&&c.body.action==='list').length),before+1);}assert.deepEqual(f.errors,[]);
});
for(const width of [390,768,1280])test('draft editor conditional fields reflow at '+width+'px with 200% text',async t=>{
 const f=await surface(t,{width,large:true}),p=f.page;await fill(p);await p.locator('[data-field=sourceKind]').selectOption('pdf');await p.locator('[data-field=responseKind]').selectOption('document');await p.locator('details summary').click();await p.locator('[data-field=assessmentKind]').selectOption('criteria');await p.locator('[data-criterion-field=label]').fill('Clear explanation');await p.evaluate(()=>document.fonts.ready);assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'32px');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('main *')].map(e=>({tag:e.tagName,selector:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(r=>r.right>innerWidth+1))));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-task-editor-'+width+'-200.png',fullPage:true});}assert.deepEqual(f.errors,[]);
});
