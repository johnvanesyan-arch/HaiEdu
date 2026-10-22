import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {fixture,id,selection,launch,finish,readiness} from '../fixtures/unit-guides-api.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true,...(process.env.GUIDES_QA_CHROMIUM?{executablePath:process.env.GUIDES_QA_CHROMIUM}:{})});});after(async()=>browser?.close());
const origin='https://unit-guides.test';
const href=i=>'/course.html?'+new URLSearchParams({enrollment:selection(i).enrollmentId,release:selection(i).curriculumReleaseId,unit:selection(i).unitId,tab:'guides'});
async function pageFixture(t,f,mobile=false){
 const bc=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:1000}});t.after(()=>bc.close());const page=await bc.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(actor=>{
  const listeners=new Set();let session={user:{id:actor}};window.__guideCalls=[];window.__guideInFlight=0;
  window.__guideAuth=next=>{session=next;listeners.forEach(fn=>fn(next?'TOKEN_REFRESHED':'SIGNED_OUT',next));};
  window.__client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{listeners.add(fn);return{data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};}},functions:{invoke:async(name,{body})=>{
   window.__guideCalls.push({name,body});window.__guideInFlight++;try{const r=await fetch('/fixture-rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,body})});const data=await r.json();return r.ok?{data}:{data,error:{message:data.error}};}finally{window.__guideInFlight--;}
  }}};
 },id(10));
 let hold=null,fail=false;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="public";'});
  if(url.pathname==='/fixture-rpc'){
   const {name,body}=route.request().postDataJSON();let data,status=200;
   if(name==='get-unit-guides'){
    if(fail){fail=false;status=503;data={error:'guides_service_unavailable'};}
    else{const r=await f.request(body);status=r.status;data=await r.json();}
    if(hold){const held=hold;hold=null;await new Promise(resolve=>{held.resolve=resolve;});}
   }else{
    const args={p_student_id:id(10),p_auth_session_id:id(401)};
    let rpc;if(name==='get-student-classes')rpc='service_student_learning_navigation';
    else if(name==='get-student-dashboard'){rpc='service_student_learning_dashboard';Object.assign(args,{p_enrollment_id:body.enrollmentId,p_release_id:body.curriculumReleaseId,p_unit_id:body.unitId});}
    else throw Error('Unexpected guide fixture API '+name);
    const r=await f.admin.rpc(rpc,args);data=r.error?{error:r.error.message}:r.data;status=r.error?403:200;
   }
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  }
  if(url.origin===origin&&/\.(html|css|js|mjs)$/.test(url.pathname)){
   let source=await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8');
   if(url.pathname.endsWith('.html'))source=source.replace(/<script\b[\s\S]*?<\/script>/g,'').replace('</body>','<script type="module" src="./course-page.js"></script></body>');
   return route.fulfill({contentType:url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':'text/javascript',body:source});
  }
  return route.abort();
 });
 await page.goto(origin+href(0));await page.waitForSelector('.unit-guides');
 return{page,errors,holdNext(){const h={resolve:null};hold=h;return h;},failNext(){fail=true;}};
}
async function baseline(f,i=0){const s=await launch(f.db,i);await finish(f.db,s.session.id);}
async function held(h){await expect.poll(()=>Boolean(h.resolve)).toBe(true);}

test('course guide tab uses real SQL gates, native expandable text and independent chapter navigation',async t=>{
 const f=await fixture();t.after(()=>f.db.close());for(const n of [2000,2002,2004])await f.approve(id(n));
 const {page,errors}=await pageFixture(t,f);await expect(page.locator('[data-guides-body]')).toContainText('ախտորոշիչն ավարտելուց հետո');
 await baseline(f);await page.locator('[data-guides-refresh]').click();await expect(page.locator('.unit-guide summary')).toHaveText('Synthetic guide 0');
 await page.locator('.unit-guide summary').click();await expect(page.locator('.unit-guide-content p').first()).toBeVisible();
 assert.equal(await page.locator('.unit-guide-content p').first().getAttribute('lang'),'en');
 await page.evaluate(actor=>window.__guideAuth({user:{id:actor}}),id(10));assert.equal(await page.locator('.unit-guide').getAttribute('open'),'');
 const before=await page.evaluate(()=>window.__guideCalls.filter(c=>c.name==='get-unit-guides').length);
 await page.evaluate(()=>{for(let n=0;n<5;n++)window.dispatchEvent(new Event('focus'));});
 await expect(page.locator('[data-guides-refresh]')).toBeEnabled();
 assert.equal(await page.evaluate(()=>window.__guideCalls.filter(c=>c.name==='get-unit-guides').length),before+1);
 await page.goto(origin+href(1));await expect(page.locator('[data-guides-body]')).toContainText('ախտորոշիչն ավարտելուց հետո');assert.equal(await page.locator('.unit-guide').count(),0);
 await baseline(f,1);await page.locator('[data-guides-refresh]').click();await expect(page.locator('.unit-guide summary')).toHaveText('Synthetic guide 1');
 await page.goto(origin+href(0));await expect(page.locator('.unit-guide summary')).toHaveText('Synthetic guide 0');
 await readiness(f.db);const m=await launch(f.db,0,'mastery_check');await page.locator('[data-guides-refresh]').click();await expect(page.locator('[data-guides-body]')).toContainText('ընթացիկ ստուգման ժամանակ');assert.equal(await page.locator('.unit-guide').count(),0);
 await finish(f.db,m.session.id);await page.locator('[data-guides-refresh]').click();await expect(page.locator('.unit-guide summary')).toHaveText('Synthetic guide 0');
 assert.deepEqual(errors,[]);
});

test('mobile guides retain reviewed order, inert content and responsive reading without reviewer packages',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await baseline(f);
 const original=(await f.call('get',{id:id(2000)})).material;
 const m=(await f.call('revise',{id:original.id,fingerprint:original.fingerprint,definition:{...original.definition,title:'<img src=x onerror="window.__guideXss=true">',text:'A long teaching explanation. '.repeat(180)},reviewPackage:original.review_package,reason:'Synthetic rendering case'})).material;
 await f.approve(m.id);
 for(const [n,key,order]of [[2091,'z-later',7],[2092,'a-middle',3]]){
  await f.db.query("insert into unit_material_versions(id,subject_program_id,curriculum_release_id,unit_id,material_key,kind,version_no,sequence_order,definition,review_package,fingerprint) values($1,$2,$3,$4,$5,'guide',1,$6,$7,$8,'')",[id(n),id(201),id(501),id(511),key,order,JSON.stringify({...original.definition,title:key}),JSON.stringify(original.review_package)]);await f.approve(id(n));
 }
 const {page,errors}=await pageFixture(t,f,true);await expect(page.locator('.unit-guide')).toHaveCount(3);
 assert.deepEqual(await page.locator('.unit-guide summary').allTextContents(),[m.definition.title,'a-middle','z-later']);
 await page.locator('.unit-guide summary').first().click();assert.equal(await page.locator('.unit-guide img').count(),0);assert.equal(await page.evaluate(()=>window.__guideXss),undefined);
 assert.doesNotMatch(await page.locator('#courseContent').innerText(),/PRIVATE PRACTICE MODEL|fixture-source|workloadProposal/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/unit-guides-mobile.png',fullPage:true});}
 assert.deepEqual(errors,[]);
});

test('failed reads are retryable; late guide replies cannot restore old chapter or signed-out content',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await baseline(f);await baseline(f,1);await f.approve(id(2000));await f.approve(id(2002));
 const c=await pageFixture(t,f),p=c.page;await expect(p.locator('.unit-guide')).toHaveCount(1);
 c.failNext();await p.locator('[data-guides-refresh]').click();await expect(p.locator('[data-guides-body]')).toContainText('Չհաջողվեց');assert.equal(await p.locator('.unit-guide').count(),0);
 await p.locator('[data-guides-refresh]').click();await expect(p.locator('.unit-guide')).toHaveCount(1);
 const old=c.holdNext();await p.locator('[data-guides-refresh]').click();await held(old);
 await p.evaluate(path=>{history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));},href(1));await expect(p.locator('.unit-guide summary')).toHaveText('Synthetic guide 1');old.resolve();
 await p.waitForFunction(()=>window.__guideInFlight===0);await expect(p.locator('.unit-guide summary')).toHaveText('Synthetic guide 1');
 const signed=c.holdNext();await p.locator('[data-guides-refresh]').click();await held(signed);await p.evaluate(()=>window.__guideAuth(null));signed.resolve();
 await p.waitForFunction(()=>window.__guideInFlight===0);await expect(p.locator('#courseContent')).toBeEmpty();assert.deepEqual(c.errors,[]);
});
