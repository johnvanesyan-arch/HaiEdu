import test,{before,after} from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';import {chromium} from '@playwright/test';
import {fixture,id,context,token} from '../fixtures/supplementary-resources-api.mjs';
import {published,call,prepared,materialCall,addLearner} from '../fixtures/resource-assignments-db.mjs';
import {installStudentHomeFixture} from '../fixtures/student-home-fixture.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>browser?.close());
const origin='https://assignments.test';
async function surface(t,f,{actor=20,width=1280}={}){
 const bc=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});t.after(()=>bc.close());const page=await bc.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));let held=null,drop=null;
 const contexts=(await materialCall(f.db,'contexts',{}, {actor:10})).contexts;
 await page.addInitScript('window.__baseStudent=('+installStudentHomeFixture.toString()+')('+JSON.stringify({contexts,actorId:id(actor)})+');');
 await page.addInitScript(({actor,identity,token})=>{
  const listeners=[];let session={user:{id:identity}};window.__assignmentCalls=[];
  const base=window.__baseStudent;
  const teacherAuth={
   getSession:async()=>({data:{session}}),
   onAuthStateChange:fn=>{
    listeners.push(fn);
    return {data:{subscription:{unsubscribe(){
     const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);
    }}}};
   }
  };
  const client=actor===10?base:{auth:teacherAuth};
  const oldInvoke=base.functions.invoke;
  client.functions={invoke:async(name,{body})=>{
   if(!['manage-resource-assignments','manage-supplementary-resources'].includes(name))return oldInvoke(name,{body});
   const action=body instanceof FormData?JSON.parse(body.get('request')).action:body.action;window.__assignmentCalls.push({name,body:body instanceof FormData?JSON.parse(body.get('request')):body});
   const r=await fetch('/fixture/'+name,{method:'POST',headers:{Authorization:'Bearer '+token,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});
   const data=r.headers.get('content-type')==='application/pdf'?await r.blob():await r.json();return r.ok?{data}:{data,error:{message:data.error}};
  }};
  window.__assignmentSwitch=()=>{session={user:{id:'different-account'}};listeners.forEach(fn=>fn('SIGNED_IN',session));};
  window.__assignmentLogout=()=>{session=null;listeners.forEach(fn=>fn('SIGNED_OUT',null));};window.__client=client;
 },{actor,identity:id(actor),token:token(actor)});
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic";'});
  if(u.pathname.startsWith('/fixture/')){
   const body=req.headers()['content-type']?.startsWith('multipart/')?JSON.parse((await new Request('https://fixture.invalid',{method:'POST',headers:req.headers(),body:req.postDataBuffer()}).formData()).get('request')):req.postDataJSON(),handler=u.pathname.endsWith('manage-resource-assignments')?f.handleAssignments:f.handle;
   const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:req.headers(),body:req.postDataBuffer()}));
   if(held?.action===body.action){const slot=held;held=null;await new Promise(resolve=>{slot.release=resolve;});}
   if(drop===body.action){drop=null;return route.fulfill({status:503,contentType:'application/json',body:'{"error":"transport_unknown"}'});}
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(u.origin!==origin)return route.abort();
  try{return route.fulfill({body:await readFile('web'+u.pathname),contentType:u.pathname.endsWith('.html')?'text/html':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.ttf')?'font/ttf':u.pathname.endsWith('.svg')?'image/svg+xml':'text/javascript'});}catch{return route.fulfill({status:404,body:'Not found'});}
 });
 const c=context(0,true),params=new URLSearchParams(actor===20?{assignment:c.assignmentId,release:c.curriculumReleaseId,unit:c.unitId}:{view:'work'});
 await page.goto(origin+'/'+(actor===20?'resource-library':'index')+'.html?'+params);
 if(actor===20)await page.waitForFunction(()=>document.querySelector('[data-resource-list]')?.getAttribute('aria-busy')==='false');
 else await page.locator('[data-assignment-list]').waitFor();
 return {page,errors,hold(action){held={action};return held;},dropNextSend(action='assign'){drop=action;}};
}
async function compose(p){await p.locator('[data-resource-assign]').first().click();await p.locator('[data-assignment-send]').waitFor();}

test('teacher class send survives lost response without duplicates and arrives in actual My work page',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await addLearner(f.db);await published(f.db);
 const teacher=await surface(t,f),student=await surface(t,f,{actor:10,width:360}),p=teacher.page,s=student.page;
 await compose(p);assert.match(await p.locator('[data-recipient-summary]').innerText(),/2/);
 await p.locator('[data-assignment-instructions]').fill('Compare the two ideas before class.');
 teacher.dropNextSend();await p.locator('[data-assignment-send]').click();await p.locator('[data-assignment-retry-send]:not([hidden])').waitFor();
 await p.locator('[data-assignment-retry-send]').click();await p.locator('.assignment-receipt').waitFor();
 assert.equal((await f.db.query('select count(*)::int n from resource_assignments')).rows[0].n,1);
 const calls=await p.evaluate(()=>window.__assignmentCalls.filter(c=>c.body.action==='assign'));assert.equal(calls.length,2);assert.deepEqual(calls[0].body,calls[1].body);
 await s.locator('[data-assignment-refresh]').click();await s.locator('[data-assignment-open]').waitFor();assert.match(await s.locator('.assignment-instructions').innerText(),/Compare the two ideas/);
 assert.equal(new URL(s.url()).searchParams.get('view'),'work');
 for(const href of await s.locator('.amp-subject-card .button-link').evaluateAll(xs=>xs.map(x=>x.getAttribute('href'))))assert.match(href,/tab=writing/);
 await s.locator('[data-assignment-open]').click();await s.locator('dialog[open]').waitFor();assert.equal(await s.locator('dialog a').getAttribute('rel'),'noopener noreferrer');await s.keyboard.press('Escape');
 await p.locator('[data-assignment-inspect]').click();await p.locator('.assignment-cancel summary').click();await p.locator('[data-assignment-cancel-reason]').fill('Class plan changed.');await p.locator('[data-assignment-cancel]').click();await p.waitForFunction(()=>document.querySelector('.assignment-receipt h4')?.textContent.includes('չեղարկված'));
 await s.locator('[data-assignment-refresh]').click();await s.locator('.assignment-empty').waitFor();await s.locator('[data-assignment-history] summary').click();await s.locator('.assignment-card').waitFor();assert.equal(await s.locator('[data-assignment-open]').count(),0);
 assert.deepEqual(teacher.errors,[]);assert.deepEqual(student.errors,[]);
});
test('selected learner snapshot excludes an eligible classmate, stale roster requires a fresh preview',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await addLearner(f.db);await published(f.db);
 const {page:p,errors}=await surface(t,f);await compose(p);await p.locator('[name=assignmentAudience][value=selected]').check();
 await p.locator('[data-recipient="'+id(9112)+'"]').check();assert.match(await p.locator('[data-recipient-summary]').innerText(),/1/);
 await addLearner(f.db,13);await p.locator('[data-assignment-send]').click();
 await p.waitForFunction(()=>document.querySelector('[data-recipient-summary]')?.textContent.includes('3'));
 assert.equal((await f.db.query('select count(*)::int n from resource_assignments')).rows[0].n,0);
 await p.locator('[name=assignmentAudience][value=selected]').check();await p.locator('[data-recipient="'+id(9112)+'"]').check();await p.locator('[data-assignment-send]').click();await p.locator('.assignment-receipt').waitFor();
 assert.equal((await call(f.db,'inbox',{}, {actor:10})).assignments.length,0);assert.equal((await call(f.db,'inbox',{}, {actor:12})).assignments.length,1);assert.deepEqual(errors,[]);
});
test('late preview cannot repopulate a different class; account change clears recipient data',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await published(f.db);const ui=await surface(t,f),p=ui.page,held=ui.hold('preview');
 await p.locator('[data-resource-assign]').first().click();await p.waitForFunction(()=>window.__assignmentCalls.some(c=>c.body.action==='preview'));
 await p.locator('[data-resource-context]').selectOption('');while(!held.release)await new Promise(r=>setTimeout(r,10));held.release();await p.waitForTimeout(100);
 assert.equal(await p.locator('[data-assignment-send]').count(),0);
 await p.locator('[data-resource-context]').selectOption('0');await p.locator('[data-resource-assign]').first().waitFor();await compose(p);
 await p.evaluate(()=>window.__assignmentSwitch());assert.equal(await p.locator('[data-recipient]').count(),0);assert.deepEqual(ui.errors,[]);
});
for(const width of [360,768,1280])test('assignment controls remain usable at '+width+'px and 200% text',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await addLearner(f.db);await published(f.db);
 const {page:p,errors}=await surface(t,f,{width});await compose(p);await p.locator('[name=assignmentAudience][value=selected]').check();await p.locator('[data-recipient-search]').fill('learner 12');
 await p.waitForFunction(()=>document.querySelectorAll('[data-recipient]').length===1);
 await p.locator('[data-recipient]').focus();await p.keyboard.press('Space');assert.match(await p.locator('[data-recipient-summary]').innerText(),/1/);
 await p.addStyleTag({content:'html{font-size:200%}'});
 const dimensions=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(x=>x.getClientRects().length&&x.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(x=>({tag:x.tagName,cls:x.className,right:x.getBoundingClientRect().right})),contentOverflow:[...document.querySelectorAll('body *')].filter(x=>x.getClientRects().length&&x.scrollWidth>x.clientWidth+2&&getComputedStyle(x).overflowX==='visible').map(x=>({tag:x.tagName,cls:x.className,scroll:x.scrollWidth,client:x.clientWidth,text:x.textContent.trim().slice(0,60)})).slice(-20),buttons:[...document.querySelectorAll('.resource-assignment-workspace button')].filter(x=>x.getClientRects().length&&!x.disabled).map(x=>x.getBoundingClientRect().height)}));
 assert.ok(dimensions.scroll<=width+1,JSON.stringify(dimensions));assert.ok(dimensions.buttons.every(x=>x>=44),JSON.stringify(dimensions));assert.deepEqual(errors,[]);
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/assignment-compose-'+width+'.png',fullPage:true});}
});

const pdfUpload={name:'class_reading.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nSynthetic browser assignment\n%%EOF\n')};
async function fillPdf(p,upload=pdfUpload){
 await p.locator('[data-resource-new]').click();
 assert.equal(await p.locator('[name=format]').inputValue(),'pdf');
 await p.locator('[data-resource-file]').setInputFiles(upload);
 await p.waitForFunction(()=>document.querySelector('[data-resource-file-status]')?.textContent.includes('պատրաստ'));
 assert.equal(await p.locator('[name=title]').inputValue(),'class reading');
 await p.locator('[name=sourceReference]').fill('Original synthetic test material');
 await p.locator('[name=rightsConfirmed]').check();await p.locator('[name=assessmentSafe]').check();
}
test('file-first teacher creation publishes and hands off to selected recipients, then actual My work downloads exact PDF',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await addLearner(f.db);
 const teacher=await surface(t,f,{width:360}),student=await surface(t,f,{actor:10,width:360});const p=teacher.page,s=student.page;
 await fillPdf(p);assert.equal(await p.locator('.resource-extra-fields').getAttribute('open'),null);
 await p.locator('[data-resource-publish-assign]').click();await p.locator('[data-assignment-send]').waitFor();
 assert.equal((await f.db.query('select count(*)::int n from resource_assignments')).rows[0].n,0,'publication does not send silently');
 await p.locator('[name=assignmentAudience][value=selected]').check();await p.locator('[data-recipient="'+context(0).enrollmentId+'"]').check();
 await p.locator('[data-assignment-send]').click();await p.locator('.assignment-receipt').waitFor();
 await s.locator('[data-assignment-refresh]').click();await s.locator('[data-assignment-open]').waitFor();
 const download=s.waitForEvent('download');await s.locator('[data-assignment-open]').click();const result=await download;
 assert.deepEqual(await readFile(await result.path()),pdfUpload.buffer);
 assert.equal((await call(f.db,'inbox',{}, {actor:12})).assignments.length,0);
 assert.equal((await f.db.query('select count(*)::int n from supplementary_resource_versions')).rows[0].n,1);
 assert.deepEqual(teacher.errors,[]);assert.deepEqual(student.errors,[]);
});
test('invalid and oversized PDF are rejected before draft creation; optional description and metadata stay optional',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {page:p}=await surface(t,f);await p.locator('[data-resource-new]').click();
 for(const upload of [{...pdfUpload,buffer:Buffer.from('not a pdf')},{...pdfUpload,buffer:Buffer.alloc(5*1024*1024+1)}]){
  await p.locator('[data-resource-file]').setInputFiles(upload);await p.locator('[data-resource-file-status].bad').waitFor();
  assert.equal((await f.db.query('select count(*)::int n from supplementary_resource_versions')).rows[0].n,0);
 }
});
test('lost upload response resumes the same draft without duplicating or attaching another file',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const ui=await surface(t,f),p=ui.page;await fillPdf(p,{...pdfUpload,mimeType:''});ui.dropNextSend('upload');
 await p.locator('[data-resource-publish-assign]').click();await p.locator('[data-resource-compose-status].bad').waitFor();
 assert.equal((await f.db.query('select count(*)::int n from supplementary_resource_versions')).rows[0].n,1);
 await p.locator('[data-resource-publish-assign]').click();await p.locator('[data-assignment-send]').waitFor();
 const calls=await p.evaluate(()=>window.__assignmentCalls.map(x=>x.body.action));assert.equal(calls.filter(x=>x==='create').length,1);assert.equal(calls.filter(x=>x==='upload').length,1);
 assert.equal((await f.db.query('select count(*)::int n from supplementary_resource_versions')).rows[0].n,1);assert.deepEqual(ui.errors,[]);
});
test('lost create response blocks an unsafe repeated create and exposes recovery; in-flight upload locks context changes',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const ui=await surface(t,f),p=ui.page;await fillPdf(p);ui.dropNextSend('create');
 await p.locator('[data-resource-publish-assign]').click();await p.locator('[data-resource-recover]:not([hidden])').waitFor();
 assert.equal(await p.locator('[data-resource-publish-assign]').isDisabled(),true);
 assert.equal((await f.db.query('select count(*)::int n from supplementary_resource_versions')).rows[0].n,1);
 await p.locator('[data-resource-recover]').click();await p.locator('[data-resource-edit]').click();await p.locator('[data-resource-file]').setInputFiles(pdfUpload);await p.waitForFunction(()=>document.querySelector('[data-resource-file-status]')?.textContent.includes('պատրաստ'));
 const held=ui.hold('upload');await p.locator('[data-resource-publish-assign]').click();
 await p.waitForFunction(()=>window.__assignmentCalls.some(x=>x.body.action==='upload'));
 assert.equal(await p.locator('[data-resource-context]').isDisabled(),true);
 while(!held.release)await new Promise(r=>setTimeout(r,10));held.release();await p.locator('[data-assignment-send]').waitFor();
 assert.equal((await f.db.query('select count(*)::int n from supplementary_resource_versions')).rows[0].n,1);assert.deepEqual(ui.errors,[]);
});
for(const width of [360,768,1280])test('file-first form reflows at '+width+'px and 200% text with keyboard focus',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {page:p,errors}=await surface(t,f,{width});await fillPdf(p);await p.addStyleTag({content:'html{font-size:200%}'});
 const layout=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,80)})).slice(-12)}));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/resource-form-layout-'+width+'.png',fullPage:true});}
 assert.ok(layout.scroll<=width+1,JSON.stringify(layout));
 await p.locator('[data-resource-publish-assign]').focus();assert.equal(await p.locator('[data-resource-publish-assign]').evaluate(e=>e===document.activeElement),true);
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/resource-pdf-first-'+width+'.png',fullPage:true});}
 assert.deepEqual(errors,[]);
});

test('sign-out during upload stops the publication chain and clears the local file',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const ui=await surface(t,f),p=ui.page;await fillPdf(p);const held=ui.hold('upload');
 await p.locator('[data-resource-publish-assign]').click();while(!held.release)await new Promise(r=>setTimeout(r,10));
 await p.evaluate(()=>window.__assignmentLogout());held.release();await p.waitForTimeout(100);
 assert.match(await p.locator('#resourceRoot').innerText(),/Մուտք գործեք/);assert.equal(await p.locator('[data-resource-file]').count(),0);
 const actions=await p.evaluate(()=>window.__assignmentCalls.map(x=>x.body.action));assert.equal(actions.includes('publish'),false);assert.equal(actions.includes('qa'),false);
 assert.deepEqual(ui.errors,[]);
});
