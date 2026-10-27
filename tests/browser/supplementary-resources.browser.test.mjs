import test,{before,after} from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';import {chromium} from '@playwright/test';
import {fixture,id,context,token} from '../fixtures/supplementary-resources-api.mjs';
import {call,definition} from '../fixtures/supplementary-resources-db.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>browser?.close());
const origin='https://resources.test';
async function surface(t,f,actor=10,width=1280){const bc=await browser.newContext({viewport:{width,height:950}});t.after(()=>bc.close());const page=await bc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let held=null;
 await page.addInitScript(({actor,id,token})=>{window.__listeners=[];window.__session={user:{id}};window.__resourceCalls=[];window.__aal='aal1';window.__client={auth:{getSession:async()=>({data:{session:window.__session}}),onAuthStateChange:fn=>{window.__listeners.push(fn);return{data:{subscription:{unsubscribe(){}}}};},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:window.__aal}}),listFactors:async()=>({data:{totp:[{id:'fixture-factor',status:'verified',factor_type:'totp'}]}}),challengeAndVerify:async()=>{window.__aal='aal2';return{data:{}};}}},functions:{invoke:async(name,{body})=>{
 window.__resourceCalls.push({name,action:body instanceof FormData?'upload':body.action});const r=await fetch('/fixture/'+name,{method:'POST',headers:{Authorization:'Bearer '+token.replace('PLACEHOLDER',window.__aal),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});const data=r.headers.get('content-type')==='application/pdf'?await r.blob():await r.json();return r.ok?{data}:{data,error:{message:data.error}};}}};},{actor,id:id(actor),token:token(actor)});
 // Ensure tests use server-verified fixture assurance; client cannot pass p_aal in request JSON.
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(u.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="public";'});
  if(u.pathname==='/fixture/manage-supplementary-resources'){
   const action=req.headers()['content-type']?.startsWith('multipart/')?'upload':req.postDataJSON().action;
   const response=await f.handle(new Request('https://fixture.invalid/materials',{method:'POST',headers:req.headers(),body:req.postDataBuffer()}));
   if(held?.action===action){const slot=held;held=null;await new Promise(resolve=>{slot.release=resolve;});}
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(u.pathname==='/fixture/get-student-classes'){const data=await call(f.db,'contexts',{}, {actor:10});return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}
  if(u.origin===origin){try{const b=await readFile('web'+u.pathname);return route.fulfill({body:b,contentType:u.pathname.endsWith('.html')?'text/html':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.svg')?'image/svg+xml':'text/javascript'});}catch{}}
  return route.abort();
 });
 const c=context(0,actor===20),p=new URLSearchParams({release:c.curriculumReleaseId,unit:c.unitId,...(actor===20?{assignment:c.assignmentId}:actor===10?{enrollment:c.enrollmentId}:{})});
 await page.goto(origin+'/'+(actor===10?'materials':'resource-library')+'.html?'+p);await page.waitForSelector('[data-resource-context]');await page.waitForFunction(()=>!document.querySelector('[data-resource-list]')?.hasAttribute('aria-busy')||document.querySelector('[data-resource-list]')?.getAttribute('aria-busy')==='false');
 return{page,errors,hold(action){held={action};return held;}};
}
const key=m=>({id:m.id,fingerprint:m.fingerprint});
test('teacher authoring → QA → publication → student search/open → revision/withdrawal uses real handler and SQL',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const staff=await surface(t,f,20),student=await surface(t,f,10,360),p=staff.page,s=student.page;
 await p.locator('[data-resource-new]').click();await p.locator('[name=title]').fill('Լրացուցիչ ընթերցանություն');await p.locator('[name=description]').fill('Կարդացեք և համեմատեք գաղափարները։');await p.locator('[name=goal]').fill('Բացատրել գլխավոր միտքը');await p.locator('[name=topic]').fill('Բացահայտումներ');await p.locator('[name=url]').fill('https://example.org/reading');await p.locator('[name=sourceReference]').fill('Synthetic teacher authored fixture');await p.locator('[name=rightsConfirmed]').check();await p.locator('[name=assessmentSafe]').check();await p.locator('[name=recommended]').check();
 await p.locator('[data-resource-form] button[type=submit]').click();await p.waitForSelector('[data-resource-action=qa]');
 await p.locator('[data-resource-action=qa]').click();await p.waitForFunction(()=>!document.querySelector('[data-resource-action=publish]').disabled);await p.locator('[data-resource-action=publish]').click();await p.waitForFunction(()=>document.querySelector('[data-resource-message]').textContent.includes('հրապարակված'));
 await s.locator('[data-resource-refresh]').click();await s.waitForSelector('[data-resource-open]');assert.equal(await s.locator('.resource-recommended').innerText(),'Ուսուցչի առաջարկ');
 await s.locator('[data-filter=query]').fill('գլխավոր');await s.locator('[data-filter=query]').press('End');assert.equal(await s.locator('.resource-card').count(),1);assert.equal(await s.locator('[data-filter=query]').evaluate(e=>e===document.activeElement),true);
 await s.locator('[data-purpose=practice]').click();assert.equal(await s.locator('.resource-card').count(),0);await s.locator('[data-filter-reset]').click();assert.equal(await s.locator('.resource-card').count(),1);
 await s.locator('[data-resource-open]').click();await s.waitForSelector('dialog[open]');assert.equal(await s.locator('dialog a').getAttribute('rel'),'noopener noreferrer');await s.locator('dialog button').click();
 assert.ok(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.locator('[name=title]').fill('Նոր տարբերակ');await p.locator('[name=reason]').fill('Clarify title');await p.locator('[data-resource-form] button[type=submit]').click();await p.waitForFunction(()=>document.querySelector('[data-resource-editor] h2').textContent.includes('v2'));
 await s.locator('[data-resource-refresh]').click();await s.waitForSelector('[data-resource-open]');assert.equal(await s.locator('.resource-card h3').innerText(),'Լրացուցիչ ընթերցանություն');
 await p.locator('[name=reason]').fill('Withdraw fixture');await p.locator('[data-resource-action=withdraw]').click();await p.waitForFunction(()=>document.querySelector('[data-resource-message]').textContent.includes('այլևս'));
 await s.locator('[data-resource-open]').click();await s.waitForFunction(()=>document.querySelector('[data-resource-message]').textContent.includes('փոխարինվել'));await s.locator('[data-resource-refresh]').click();await s.waitForFunction(()=>document.querySelector('[data-resource-list]').textContent.includes('դեռ նյութեր չկան'));
 assert.deepEqual(staff.errors,[]);assert.deepEqual(student.errors,[]);
});
test('PDF upload and authorized download work in native browser; later file replacement requires a new version',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const d={...definition,format:'pdf'};delete d.url;const m=(await call(f.db,'create',{definition:d})).material;
 const staff=await surface(t,f,20),p=staff.page;await p.locator('[data-resource-edit]').click();await p.locator('[data-resource-file]').setInputFiles({name:'fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nBrowser fixture\n%%EOF\n')});await p.locator('[data-resource-action=upload]').click();await p.waitForFunction(()=>document.querySelector('[data-resource-message]').textContent.includes('կցված'));
 await p.locator('[data-resource-action=qa]').click();await p.waitForFunction(()=>!document.querySelector('[data-resource-action=publish]').disabled);await p.locator('[data-resource-action=publish]').click();await p.waitForFunction(()=>document.querySelector('[data-resource-message]').textContent.includes('հրապարակված'));
 const student=await surface(t,f,10,768),s=student.page;const downloaded=s.waitForEvent('download');await s.locator('[data-resource-open]').click();assert.match((await downloaded).suggestedFilename(),/^haiedu-material-/);assert.equal(await p.locator('[data-resource-file]').count(),0);assert.deepEqual(staff.errors,[]);assert.deepEqual(student.errors,[]);
});
test('late private responses cannot restore prior account content; search focus, responsive layout and reduced motion',async t=>{
 const f=await fixture();t.after(()=>f.db.close());let m=(await call(f.db,'create',{definition:{...definition,title:'<img src=x onerror="window.XSS=true">',estimatedMinutes:15}})).material;await call(f.db,'qa',key(m));await call(f.db,'publish',key(m));
 const student=await surface(t,f,10),p=student.page;await p.waitForSelector('.resource-card');assert.equal(await p.evaluate(()=>window.XSS),undefined);
 for(const width of [360,768,1280]){await p.setViewportSize({width,height:950});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),String(width));}
 for(const width of [360,640,768,1280]){await p.setViewportSize({width,height:950});await p.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200% text at '+width);await p.evaluate(()=>document.documentElement.style.fontSize='');}
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.resource-card').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await p.setViewportSize({width:1280,height:950});if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/supplementary-student-desktop.png',fullPage:true});}
 const held=student.hold('get'); // Student list is the pending private response here.
 held.action='list';await p.locator('[data-resource-refresh]').click();await new Promise((resolve,reject)=>{const end=Date.now()+5000;const tick=()=>held.release?resolve():Date.now()>end?reject(Error('No held response')):setTimeout(tick,20);tick();});
 await p.evaluate(()=>window.__listeners.forEach(fn=>fn('SIGNED_OUT',null)));held.release();await p.waitForTimeout(100);assert.equal(await p.locator('.resource-card').count(),0);assert.match(await p.locator('#resourceRoot').innerText(),/Մուտք գործեք/);assert.deepEqual(student.errors,[]);
});
test('a late editor read cannot overwrite a newly opened resource draft',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await call(f.db,'create',{definition});const staff=await surface(t,f,20),p=staff.page;await p.waitForSelector('[data-resource-edit]');const held=staff.hold('get');await p.locator('[data-resource-edit]').click();
 await new Promise((resolve,reject)=>{const end=Date.now()+5000;const tick=()=>held.release?resolve():Date.now()>end?reject(Error('No held editor')):setTimeout(tick,20);tick();});
 await p.locator('[data-resource-new]').click();await p.locator('[name=title]').fill('A new unsaved resource');held.release();await p.waitForTimeout(80);assert.equal(await p.locator('[name=title]').inputValue(),'A new unsaved resource');assert.equal(await p.locator('[data-resource-action=publish]').count(),0);assert.deepEqual(staff.errors,[]);
});
