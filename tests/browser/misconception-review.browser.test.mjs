import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin='https://misconception-review.test';
let browser;
before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>{await browser?.close();});
async function fixture(t,{width=1280,aal='aal2',denied=false}={}){
 const ctx=await browser.newContext({viewport:{width,height:900}});t.after(()=>ctx.close());const page=await ctx.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({aal,denied})=>{
  let assurance=aal,sessionUser='fixture-user';const listeners=[],id='30000000-0000-4000-8000-000000000021',second='30000000-0000-4000-8000-000000000022';
  const definition=(key=id)=>({id:key,title_hy:key===id?'Փորձնական թյուր պատկերացում':'Երկրորդ սահմանում',description_hy:'Սահմանման հայերեն նկարագրություն',status:'draft',code:'TEST_CODE',skill_code:'SUBJECT-U02-S03',skill_name_hy:'Փորձնական հմտություն',skill_id:'skill',subject_name_hy:'Փորձնական առարկա',grade_label_hy:'7-րդ դասարան',units:[],mapping_count:1});
  const detail=(key=id)=>({definition:definition(key),mappings:[{itemId:'item',itemCode:'ITEM-01',version:1,promptHy:'Հարցի ձևակերպումը',responseKey:'B',responseText:'Կապված սխալ պատասխանը'}],history:[],expectedToken:'a'.repeat(32)});
  const state=window.__mc={calls:[],delayDetail:null,pendingDetail:null,delayMutation:false,pendingMutation:null,mutationError:null,id,second,detail,verified:0,signOuts:0,factors:[{id:'totp',status:'verified',friendly_name:'Authenticator'}],removed:[]};
  window.__authEvent=(event,user='fixture-user')=>{sessionUser=event==='SIGNED_OUT'?null:user;listeners.forEach(fn=>fn(event,sessionUser?{user:{id:sessionUser}}:null));};
  window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:sessionUser?{user:{id:sessionUser}}:null}}),signOut:async()=>{state.signOuts++;window.__authEvent('SIGNED_OUT');return {};},onAuthStateChange:fn=>listeners.push(fn),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:assurance}}),listFactors:async()=>({data:{all:state.factors,totp:state.factors}}),enroll:async()=>{const f={id:'owned-pending',status:'unverified',totp:{secret:'fixture-only'}};state.factors.push(f);return {data:f};},unenroll:async({factorId})=>{state.removed.push({factorId,user:sessionUser});state.factors=state.factors.filter(f=>f.id!==factorId);return {};},challengeAndVerify:async()=>{assurance='aal2';state.verified++;return {};}}},functions:{invoke:async(name,{body})=>{
   state.calls.push(body);if(denied)return {data:{error:'content_authoring_role_required'}};
   if(body.action==='list')return {data:{actor:{role:'content_admin',aal:assurance},definitions:[definition(),definition(second)],counts:{draft:40,active:13},filters:{subjects:[],grades:[],units:[],skills:[]},total:2}};
   if(body.action==='detail'){if(state.delayDetail===body.id)return new Promise(resolve=>{state.pendingDetail=()=>resolve({data:detail(body.id)});});return {data:detail(body.id)};}
   if(state.mutationError)return {data:{error:state.mutationError}};
   const result=detail(body.id);result.definition.status=body.action==='approve'?'active':'draft';
   if(state.delayMutation)return new Promise(resolve=>{state.pendingMutation=()=>resolve({data:result});});return {data:result};
  }}};
 },{aal,denied});
 await ctx.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.href==='https://esm.sh/@supabase/supabase-js@2')return route.fulfill({contentType:'text/javascript',body:'export function createClient(){return window.__haieduSupabaseClient}'});
  if(u.origin!==origin)return route.abort();
  const name=u.pathname.slice(1);if(!/^[a-z0-9.-]+$/.test(name))return route.abort();
  try{let body=await readFile(new URL('../../web/'+name,import.meta.url),'utf8');if(name.endsWith('.html'))body=body.replace('<script type="module" src="./ux.js"></script>','');return route.fulfill({contentType:name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript',body});}catch{return route.abort();}
 });
 await page.goto(origin+'/content-misconceptions.html');
 if(denied)await page.locator('#authMessage').filter({hasText:'հասանելի չէ'}).waitFor();else await page.locator('[data-mc-id]').first().waitFor();
 return {page,errors};
}
async function openFirst(page){await page.locator('[data-mc-id]').first().click();await page.locator('#mcTitle').waitFor();}
async function ready(page){await page.locator('#mcReason').fill('Ստուգել եմ սահմանումը և պատասխանները։');await page.locator('#mcAcknowledged').check();}
test('review page, navigation and Armenian controls fit desktop and mobile without overflow',async t=>{
 for(const width of [1280,390]){const {page,errors}=await fixture(t,{width});
  const layout=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect();const form=rect('#mcFilters'),label=rect('#mcFilters label'),refresh=rect('#mcFilters button[type="submit"]'),clear=rect('#mcClear'),cards=[...document.querySelectorAll('.mc-row')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y};});return {padding:label.x-form.x,sameRow:Math.abs(refresh.y-clear.y)<1,adjacent:clear.x>=refresh.right+8,inside:clear.right<=form.right-12,cards};});
  assert.ok(layout.padding>=16);assert.ok(layout.sameRow&&layout.adjacent&&layout.inside);
  assert.equal(await page.locator('#mcDetail').isHidden(),true);
  if(width===1280)assert.ok(layout.cards[1].x>layout.cards[0].x);else assert.ok(layout.cards[1].y>layout.cards[0].y);
  await openFirst(page);assert.equal(await page.locator('#mcDetail').isVisible(),true);assert.equal(await page.locator('.hm-role-sidebar a[href="./content-misconceptions.html"]').count(),1);assert.equal(await page.locator('#mcApprove').isDisabled(),true);
  assert.ok(await page.locator('#mcDetail').textContent().then(t=>t.includes('Կապված սխալ պատասխանը')));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 }
});
test('draft changes block approval; pending mutation cannot be submitted twice',async t=>{
 const {page,errors}=await fixture(t);await openFirst(page);await ready(page);await page.locator('#mcTitle').fill('Փոփոխված վերնագիր');assert.equal(await page.locator('#mcApprove').isDisabled(),true);assert.equal(await page.locator('#mcSave').isEnabled(),true);
 await page.locator('#mcTitle').fill('Փորձնական թյուր պատկերացում');await ready(page);await page.evaluate(()=>{__mc.delayMutation=true;const b=document.getElementById('mcApprove');b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 await page.waitForFunction(()=>Boolean(__mc.pendingMutation));assert.equal(await page.evaluate(()=>__mc.calls.filter(x=>x.action==='approve').length),1);
 await page.evaluate(()=>__mc.pendingMutation());await page.waitForFunction(()=>!document.getElementById('mcApprove'));assert.deepEqual(errors,[]);
});
test('late detail responses cannot replace another definition or reappear after sign-out',async t=>{
 const {page,errors}=await fixture(t);await page.evaluate(()=>{__mc.delayDetail=__mc.id;});await page.locator('[data-mc-id]').first().click();await page.waitForFunction(()=>Boolean(__mc.pendingDetail));await page.locator('[data-mc-id]').nth(1).click();await page.locator('#mcTitle').waitFor();await page.evaluate(()=>__mc.pendingDetail());assert.equal(await page.locator('#mcTitle').inputValue(),'Երկրորդ սահմանում');
 await page.evaluate(()=>{__mc.delayDetail=__mc.id;__mc.pendingDetail=null;});await page.locator('[data-mc-id]').first().click();await page.waitForFunction(()=>Boolean(__mc.pendingDetail));await page.evaluate(()=>{__authEvent('SIGNED_OUT');__mc.pendingDetail();});await page.waitForTimeout(100);assert.equal(await page.locator('#console').isHidden(),true);assert.equal(await page.locator('#mcDetail').textContent(),'');assert.deepEqual(errors,[]);
});
test('stale approval keeps edits visible and requires a fresh review',async t=>{
 const {page}=await fixture(t);await openFirst(page);await ready(page);await page.evaluate(()=>{__mc.mutationError='stale_misconception_review';});await page.locator('#mcApprove').click();await page.locator('#mcMessage').filter({hasText:'փոխվել են'}).waitFor();assert.equal(await page.locator('#mcApprove').isDisabled(),true);assert.equal(await page.locator('#mcReloadDetail').isEnabled(),true);
});
test('MFA verification does not approve automatically and signed-out/wrong-role users see no definitions',async t=>{
 const {page,errors}=await fixture(t,{aal:'aal1'});await openFirst(page);await ready(page);await page.locator('#mcApprove').click();await page.locator('#mcMfaCode').fill('123456');await page.locator('#mcMfaBody button').click();await page.waitForFunction(()=>!document.getElementById('mcMfa').open);assert.equal(await page.evaluate(()=>__mc.calls.filter(x=>x.action==='approve').length),0);await page.locator('#mcApprove').click();await page.waitForFunction(()=>__mc.calls.some(x=>x.action==='approve'));assert.deepEqual(errors,[]);
 const denied=await fixture(t,{denied:true});assert.equal(await denied.page.locator('#console').isHidden(),true);assert.equal(await denied.page.locator('#mcList').textContent(),'');
});

test('standard sidebar sign-out ends the session once and removes protected content',async t=>{
 const {page,errors}=await fixture(t);await openFirst(page);
 await page.locator('.hm-sidebar-signout').click();
 await page.waitForFunction(()=>document.getElementById('console').classList.contains('hidden'));
 assert.equal(await page.evaluate(()=>__mc.signOuts),1);assert.equal(await page.locator('#mcDetail').textContent(),'');assert.deepEqual(errors,[]);
});
test('interrupted MFA keeps owned cleanup pending and never removes factors under another identity',async t=>{
 const {page,errors}=await fixture(t,{aal:'aal1'});await openFirst(page);await ready(page);await page.evaluate(()=>{__mc.factors=[];});
 await page.locator('#mcApprove').click();await page.locator('#mcMfaCode').waitFor();
 await page.evaluate(()=>__authEvent('SIGNED_IN','second-user'));await page.waitForFunction(()=>!document.getElementById('mcMfa').open);
 assert.equal(await page.evaluate(()=>__mc.removed.length),0);
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('haiedu:misconception-review:pending-factors'))[0].userId),'fixture-user');
 await page.evaluate(()=>__authEvent('SIGNED_IN','fixture-user'));await page.locator('[data-mc-id]').first().waitFor();await openFirst(page);await ready(page);await page.locator('#mcApprove').click();await page.locator('#mcMfaCode').waitFor();
 assert.deepEqual(await page.evaluate(()=>__mc.removed),[{factorId:'owned-pending',user:'fixture-user'}]);
 await page.locator('#mcMfaClose').click();await page.locator('.hm-sidebar-signout').click();await page.waitForFunction(()=>__mc.signOuts===1);
 assert.deepEqual(errors,[]);
});
test('cleanup preserves an owned factor that completed verification before reload',async t=>{
 const {page}=await fixture(t,{aal:'aal1'});
 await page.evaluate(()=>sessionStorage.setItem('haiedu:misconception-review:pending-factors',JSON.stringify([{id:'totp',userId:'fixture-user'}])));
 await page.reload();await page.locator('[data-mc-id]').first().waitFor();await openFirst(page);await ready(page);await page.locator('#mcApprove').click();await page.locator('#mcMfaCode').waitFor();
 assert.equal(await page.evaluate(()=>__mc.removed.length),0);assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('haiedu:misconception-review:pending-factors')).length),0);
});
