import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {fixture,id} from '../fixtures/unit-materials-api.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});});after(async()=>browser?.close());
const origin='https://unit-materials.test';
async function pageFixture(t,f,{mobile=false,aal='aal2'}={}){
 const bc=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:1000}});t.after(()=>bc.close());const page=await bc.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({actor,aal})=>{
  const listeners=new Set();window.__materialListeners=listeners;window.__materialCalls=[];window.__materialAal=aal;
  const session={user:{id:actor}};window.__client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),onAuthStateChange:fn=>{listeners.add(fn);return{data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:window.__materialAal}}),listFactors:async()=>({data:{totp:[{id:'fixture-factor',status:'verified',factor_type:'totp'}]}}),challengeAndVerify:async({code})=>{if(code!=='123456')return{error:{message:'Synthetic incorrect code'}};window.__materialAal='aal2';listeners.forEach(fn=>fn('MFA_CHALLENGE_VERIFIED',session));return{data:{}};}},signOut:async()=>{listeners.forEach(fn=>fn('SIGNED_OUT',null));return{};}},functions:{invoke:async(name,{body})=>{window.__materialCalls.push({name,body});const response=await fetch('/fixture-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,body,aal:window.__materialAal})});const data=await response.json();return response.ok?{data}:{data,error:{message:data.error,context:response}};}}};
 },{actor:id(30),aal});
 let hold=null;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="public";'});
  if(url.pathname==='/fixture-api'){
   const {name,body,aal}=route.request().postDataJSON();assert.equal(name,'manage-unit-materials');const response=await f.request(body.action,body.payload,{aal});const result=await response.text();
   if(hold&&body.action===hold.action){const slot=hold;hold=null;await new Promise(resolve=>{slot.resolve=resolve;});}
   return route.fulfill({status:response.status,contentType:'application/json',body:result});
  }
  if(url.origin===origin&&/\.(html|css|js|mjs|svg)$/.test(url.pathname)){
   const source=await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8');return route.fulfill({contentType:url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.svg')?'image/svg+xml':'text/javascript',body:source});
  }
  return route.abort();
 });
 await page.goto(origin+'/content-materials.html');await expect(page.locator('#console')).toBeVisible();await expect(page.locator('.material-entry')).toHaveCount(6);
 return{page,errors,holdNext(action){const slot={action,resolve:null};hold=slot;return slot;}};
}
test('native reviewer page preserves dirty edits on auth refresh, creates a revision and verifies MFA before approval',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {page,errors}=await pageFixture(t,f,{aal:'aal1'});await page.locator(`#materialList [data-open="${id(2000)}"]`).click();await expect(page.locator('[data-field=text]')).toHaveValue('A teaching explanation.');
 await page.locator('#materialEdit > summary').click();await page.locator('[data-field=text]').fill('Revised from the native browser.');
 await page.evaluate(actor=>window.__materialListeners.forEach(fn=>fn('TOKEN_REFRESHED',{user:{id:actor}})),id(30));assert.equal(await page.locator('[data-field=text]').inputValue(),'Revised from the native browser.');
 page.once('dialog',d=>d.dismiss());await page.locator('#refreshMaterials').click();assert.equal(await page.locator('[data-field=text]').inputValue(),'Revised from the native browser.');
 await expect(page.locator('[data-action=approve]')).toBeDisabled();await page.locator('#materialReason').fill('Clarify teaching explanation');await page.locator('[data-action=revise]').click();await expect(page.locator('#materialMessage')).toContainText('Նոր տարբերակը պահպանված');
 await page.locator('[data-action=qa]').click();await expect(page.locator('[data-action=approve]')).toBeEnabled();page.once('dialog',d=>d.accept());await page.locator('[data-action=approve]').click();await expect(page.locator('.material-mfa')).toBeVisible();
 assert.equal((await f.db.query("select count(*)::int n from unit_material_versions where status='approved'")).rows[0].n,0);await page.locator('.material-mfa input').fill('123456');await page.locator('[data-verify]').click();await expect(page.locator('#materialMessage')).toContainText('Նյութը հաստատված');
 const approved=(await f.db.query("select * from unit_material_versions where status='approved'")).rows[0];assert.equal(approved.version_no,2);assert.equal(approved.reviewed_by,id(30));assert.equal(approved.definition.text,'Revised from the native browser.');assert.deepEqual(errors,[]);
});
test('late selection and signout responses cannot restore old material; repeated clicks submit only once',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const ui=await pageFixture(t,f),p=ui.page;const held=ui.holdNext('get');await p.locator(`#materialList [data-open="${id(2000)}"]`).click();await expect.poll(()=>typeof held.resolve).toBe('function');await p.locator(`#materialList [data-open="${id(2001)}"]`).click();await expect(p.locator('.material-reading')).toContainText('Write');held.resolve();await expect(p.locator('.material-reading')).toContainText('Write');
 const qa=ui.holdNext('qa');await p.locator('[data-action=qa]').evaluate(b=>{b.click();b.click();});await expect.poll(()=>typeof qa.resolve).toBe('function');assert.equal(await p.evaluate(()=>window.__materialCalls.filter(x=>x.body.action==='qa').length),1);
 await p.evaluate(()=>window.__materialListeners.forEach(fn=>fn('SIGNED_OUT',null)));qa.resolve();await expect(p.locator('#console')).toBeHidden();await expect(p.locator('#materialEditor')).toBeEmpty();await expect(p.locator('#authPanel')).toBeVisible();assert.deepEqual(ui.errors,[]);
});
test('mobile reviewer exposes teaching order, rubric and private practice package with no horizontal overflow',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {page,errors}=await pageFixture(t,f,{mobile:true});await page.locator(`#materialList [data-open="${id(2001)}"]`).click();await expect(page.locator('.material-rubric fieldset')).toHaveCount(4);await expect(page.locator('#materialEditor')).toContainText('PRIVATE PRACTICE MODEL');await expect(page.locator('#materialEditor')).toContainText('Before a fixture activity');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));assert.equal(await page.locator('.hm-role-nav a[href="./content-materials.html"]').count(),1);
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/unit-materials-mobile.png',fullPage:true});}assert.deepEqual(errors,[]);
});
test('filters separate curriculum scopes, clear together, and refresh preserves the selected material',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {page,errors}=await pageFixture(t,f);
 const options=await page.locator('#unitFilter option').allTextContents();assert.equal(options.length,4);
 await page.locator('#unitFilter').selectOption({index:1});await expect(page.locator('.material-entry')).toHaveCount(2);
 await page.locator('#kindFilter').selectOption('writing');await expect(page.locator('.material-entry')).toHaveCount(1);
 await page.locator('#materialSearch').fill('no matching material');await expect(page.locator('.material-entry')).toHaveCount(0);
 await page.locator('#clearMaterialFilters').click();await expect(page.locator('.material-entry')).toHaveCount(6);await expect(page.locator('#materialSearch')).toBeFocused();
 await page.locator(`#materialList [data-open="${id(2000)}"]`).click();await expect(page.locator('.material-reading')).toContainText('A teaching explanation.');await expect(page.locator('[data-field=text]')).toBeHidden();
 await page.locator('#refreshMaterials').click();await expect(page.locator('#materialMessage')).toHaveText('Ցանկը թարմացված է։');await expect(page.locator(`#materialList [data-open="${id(2000)}"]`)).toHaveAttribute('aria-current','true');await expect(page.locator('.material-reading')).toContainText('A teaching explanation.');
 await page.locator('[data-action=qa]').click();await expect(page.locator('[data-action=approve]')).toBeEnabled();await expect(page.locator('#refreshMaterials')).toBeEnabled();await page.locator('#statusFilter').selectOption('ready');await expect(page.locator('.material-entry')).toHaveCount(1);
 for(const width of [360,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`no horizontal overflow at ${width}`);}
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/unit-materials-desktop.png',fullPage:true});}assert.deepEqual(errors,[]);
});
test('a failed material request offers retry and a failed refresh retains unsaved edits',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {page,errors}=await pageFixture(t,f);
 await page.route('**/fixture-api',async route=>{if(route.request().postDataJSON().body.action==='get')return route.fulfill({status:500,contentType:'application/json',body:'{"error":"unavailable"}'});return route.fallback();});
 await page.locator(`#materialList [data-open="${id(2000)}"]`).click();await expect(page.locator('#materialEditor')).toContainText('Նյութը չբեռնվեց');await page.unroute('**/fixture-api');await page.locator('#materialEditor [data-open]').click();await expect(page.locator('.material-reading')).toContainText('A teaching explanation.');
 await page.locator('#materialEdit > summary').click();await page.locator('[data-field=text]').fill('Unsaved text');
 await page.route('**/fixture-api',async route=>{if(route.request().postDataJSON().body.action==='list')return route.fulfill({status:500,contentType:'application/json',body:'{"error":"unavailable"}'});return route.fallback();});
 page.once('dialog',d=>d.accept());await page.locator('#refreshMaterials').click();await expect(page.locator('#materialMessage')).toHaveClass('bad');await expect(page.locator('[data-field=text]')).toHaveValue('Unsaved text');await expect(page.locator('[data-field=text]')).toBeEnabled();await expect(page.locator('[data-action=revise]')).toBeEnabled();assert.deepEqual(errors,[]);
});

test('refresh cancels pending selection, suppresses duplicate loads and cannot restore a signed-out workspace',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const ui=await pageFixture(t,f),p=ui.page;const get=ui.holdNext('get');await p.locator(`#materialList [data-open="${id(2000)}"]`).click();await expect.poll(()=>typeof get.resolve).toBe('function');
 await p.locator('#refreshMaterials').click();await expect(p.locator('#materialEditor')).toContainText('Ընտրեք նյութ');get.resolve();await expect(p.locator('.material-reading')).toHaveCount(0);
 const list=ui.holdNext('list');await p.locator('#refreshMaterials').evaluate(b=>{b.click();b.click();});await expect.poll(()=>typeof list.resolve).toBe('function');assert.equal(await p.evaluate(()=>window.__materialCalls.filter(x=>x.body.action==='list').length),3);
 await p.evaluate(()=>window.__materialListeners.forEach(fn=>fn('SIGNED_OUT',null)));list.resolve();await expect(p.locator('#console')).toBeHidden();await expect(p.locator('#materialEditor')).toBeEmpty();await expect(p.locator('#materialMessage')).toBeEmpty();assert.deepEqual(ui.errors,[]);
});
