import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});});after(async()=>browser?.close());
const origin='https://review-navigation.test';
async function fixture(t,{width=1365}={}){
 const context=await browser.newContext({viewport:{width,height:740}});t.after(()=>context.close());const page=await context.newPage(),errors=[],calls=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 const grades=[{id:'g7',number:7,labelHy:'7-րդ դասարան'},{id:'g8',number:8,labelHy:'8-րդ դասարան'}],subjects=[{id:'s1',nameHy:'Առարկա Ա'},{id:'s2',nameHy:'Առարկա Բ'}];
 const programs=subjects.map((s,i)=>({id:'p'+i,subjectId:s.id,gradeId:grades[i].id,gradeNumber:grades[i].number,gradeLabelHy:grades[i].labelHy,subjectNameHy:s.nameHy,subjectNameEn:'Subject '+i,versionLabel:'Release '+i}));
 const units=programs.flatMap(p=>[0,1].map(i=>({id:p.id+'u'+i,programId:p.id,code:p.id+'-U'+i,titleHy:'Բաժին '+i,sequenceOrder:i})));
 const items=units.flatMap((u,index)=>Array.from({length:12},(_,i)=>{const program=programs.find(p=>p.id===u.programId);return{id:u.id+'i'+i,code:`${u.id}-Q${String(i).padStart(2,'0')}`,promptHy:'Target question '+i,type:'single_choice',versionNo:1,difficulty:2,itemFamily:'fixture',config:{},skill:{code:'SKILL',nameHy:'Հմտություն'},reviewStatus:i<3?'needs_review':'approved',latestQa:{passed:index===1?false:true,versionNo:1},curriculum:{program,unit:u,subject:subjects.find(s=>s.id===program.subjectId),grade:grades.find(g=>g.id===program.gradeId)}};}));
 const dashboard={catalog:{programs,units,subjects,grades},items,stats:{}};
 await page.addInitScript(()=>{let session={user:{id:sessionStorage.getItem('fixture-actor')||'actor-A'}};const listeners=[];window.__authEvent=(event,id)=>{session=id?{user:{id}}:null;if(id)sessionStorage.setItem('fixture-actor',id);listeners.forEach(fn=>fn(event,session));};window.__client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session?.user}}),onAuthStateChange:fn=>{listeners.push(fn);queueMicrotask(()=>fn('INITIAL_SESSION',session));return{data:{subscription:{unsubscribe(){}}}};},signOut:async()=>window.__authEvent('SIGNED_OUT',null)},functions:{invoke:async(name,{body})=>{const r=await fetch('/fixture-api',{method:'POST',body:JSON.stringify({name,body})});if(!r.ok)return{error:{context:r,message:'Fixture failure'}};return{data:await r.json()};}}};});
 let hold=null,failure=null;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="fixture-only";'});
  if(url.pathname==='/fixture-api'){
   const {name,body}=route.request().postDataJSON();calls.push({name,body});let data={};
   if(failure&&(failure.action===body.action||failure.action===name)){const value=failure;failure=null;return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify(value.payload)});}
   if(name==='get-content-quality-dashboard')data=dashboard;
   if(name==='get-content-review-history')data={item:items.find(i=>i.id===body.itemId),reviews:[]};
   if(body.action==='get_item_detail'){const item=items.find(i=>i.id===body.itemId);data={detail:{item,options:[{key:'A',contentHy:'One'},{key:'B',contentHy:'Two'}],answerKey:{answer:'A'},editing:{contentEditable:!item.retiredAt&&!item.generated,reason:item.retiredAt?"retired_item_not_editable":item.generated?"generated_variant_requires_template_edit":null},misconceptions:[]}};}
   if(body.action==='run_qa'){items.find(i=>i.id===body.itemId).latestQa={passed:true,versionNo:items.find(i=>i.id===body.itemId).versionNo};data={qa:{passed:true}};}
   if(body.action==='save_content_revision'){const item=items.find(i=>i.id===body.itemId);item.versionNo++;item.promptHy=body.payload.promptHy;item.reviewStatus='needs_review';item.latestQa=null;}
   if(body.action==='approve'){items.find(i=>i.id===body.itemId).reviewStatus='approved';}
   if(hold&&body.action===hold.action){const slot=hold;hold=null;await new Promise(resolve=>slot.resolve=resolve);}
   return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  }
  if(url.origin===origin&&/\.(html|css|js|mjs|svg)$/.test(url.pathname))return route.fulfill({contentType:url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.svg')?'image/svg+xml':'text/javascript',body:await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8')});
  return route.abort();
 });
 return{page,errors,calls,items,failNext(action,payload){failure={action,payload};},holdNext(action){const slot={action,resolve:null};hold=slot;return slot;},async bank(){await page.goto(origin+'/content-bank.html?program=p1&unit=p1u1');await expect(page.locator('#console')).toBeVisible();await expect(page.locator('#unitFilter')).toHaveValue('p1u1');await page.locator('#searchInput').fill('Target');await page.locator('.advanced-filter-box summary').click();await page.locator('#reviewFilter').selectOption('needs_review');await page.locator('#qaFilter').selectOption('pass');await expect(page.locator('#itemRows tr:visible')).toHaveCount(3);}};
}
for(const width of [1365,390])test(`bank return restores scope, filters and scroll; next/previous stay in the chosen list at ${width}px`,async t=>{
 const ui=await fixture(t,{width}),p=ui.page;await ui.bank();await p.locator('#itemRows tr:visible').nth(1).click();await expect(p.locator('#reviewListPosition')).toContainText('2 / 3');await expect(p.locator('#nextReviewItem')).toBeEnabled();
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/review-item-navigation-${width}.png`,fullPage:true});}
 const saved=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('haiedu:review-navigation:v1:'+new URLSearchParams(location.search).get('nav'))));assert.deepEqual(saved.ids,['p1u1i0','p1u1i1','p1u1i2']);
 await p.locator('#nextReviewItem').click();await expect(p.locator('#reviewListPosition')).toContainText('3 / 3');await expect(p.locator('#nextReviewItem')).toBeDisabled();await p.locator('#previousReviewItem').click();await expect(p.locator('#reviewListPosition')).toContainText('2 / 3');
 await p.locator('#returnToReviewList').click();await expect(p.locator('#console')).toBeVisible();for(const [id,value] of Object.entries(saved.filters))await expect(p.locator('#'+id)).toHaveValue(value);await expect(p.locator('#itemRows tr:visible')).toHaveCount(3);await expect.poll(()=>p.evaluate(()=>window.scrollY)).toBeCloseTo(saved.scrollY,0);await expect(p.locator('.advanced-filter-box')).toHaveAttribute('open','');
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/review-bank-return-${width}.png`,fullPage:true});}assert.deepEqual(ui.errors,[]);
});
test('review queue restores its search and tab, and approval keeps a stable next-item order',async t=>{
 const ui=await fixture(t),p=ui.page;await p.goto(origin+'/content-review.html?queue=needs_review');await expect(p.locator('#console')).toBeVisible();await p.locator('#queueSearch').fill('p1u1');await expect(p.locator('#queueList a')).toHaveCount(3);await p.locator('#queueList a').first().click();await expect(p.locator('#reviewListPosition')).toContainText('1 / 3');await expect(p.locator('#previousReviewItem')).toBeDisabled();
 await p.locator('[data-item-tab-button=review]').click();await p.locator('#approveBtn').click();await expect(p.locator('#consoleMessage')).toContainText('հաստատված');await p.locator('#nextReviewItem').click();await expect(p.locator('.detail-heading h2')).toHaveText('p1u1-Q01');
 await p.locator('#returnToReviewList').click();await expect(p.locator('#queueSearch')).toHaveValue('p1u1');await expect(p.locator('[data-queue=needs_review]')).toHaveClass(/active/);await expect(p.locator('#queueList a')).toHaveCount(2);assert.deepEqual(ui.errors,[]);
});
test('dirty next navigation can be cancelled; pending QA cannot navigate or submit twice',async t=>{
 const ui=await fixture(t),p=ui.page;await ui.bank();await p.locator('#itemRows tr:visible').first().click();await expect(p.locator('#nextReviewItem')).toBeEnabled();await p.locator('[data-item-tab-button=content]').click();await p.locator('#editPromptHy').fill('Unsaved change');
 p.once('dialog',d=>d.dismiss());await p.locator('#nextReviewItem').click();await expect(p.locator('#editPromptHy')).toHaveValue('Unsaved change');await expect(p.locator('#reviewListPosition')).toContainText('1 / 3');
 p.once('dialog',d=>d.accept());await p.locator('#nextReviewItem').click();await expect(p.locator('#reviewListPosition')).toContainText('2 / 3');await p.locator('[data-item-tab-button=review]').click();const pending=ui.holdNext('run_qa');await p.locator('#runQaBtn').evaluate(b=>{b.click();b.click();});await expect.poll(()=>typeof pending.resolve).toBe('function');await expect(p.locator('#nextReviewItem')).toBeDisabled();assert.equal(ui.calls.filter(c=>c.body.action==='run_qa').length,1);pending.resolve();await expect(p.locator('#nextReviewItem')).toBeEnabled();assert.deepEqual(ui.errors,[]);
});
test('direct links and different accounts cannot inherit another list; signout clears navigation during a pending request',async t=>{
 const ui=await fixture(t),p=ui.page;await p.goto(origin+'/content-item.html?id=p1u1i0');await expect(p.locator('.detail-heading')).toBeVisible();await expect(p.locator('#reviewListNavigation')).toBeHidden();
 await ui.bank();await p.locator('#itemRows tr:visible').first().click();await expect(p.locator('#nextReviewItem')).toBeEnabled();const url=p.url();await p.locator('[data-item-tab-button=review]').click();const pending=ui.holdNext('run_qa');await p.locator('#runQaBtn').click();await expect.poll(()=>typeof pending.resolve).toBe('function');await p.evaluate(()=>window.__authEvent('SIGNED_OUT',null));pending.resolve();await expect(p.locator('#console')).toBeHidden();assert.equal(await p.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('haiedu:review-navigation:')).length),0);
 await p.evaluate(()=>window.__authEvent('SIGNED_IN','actor-B'));await p.goto(url);await expect(p.locator('.detail-heading')).toBeVisible();await expect(p.locator('#reviewListNavigation')).toBeHidden();assert.deepEqual(ui.errors,[]);
});

test('browser Back restores the list; expired or blocked storage leaves item links usable',async t=>{
 const ui=await fixture(t),p=ui.page;await ui.bank();await p.locator('#itemRows tr:visible').first().click();await expect(p.locator('#nextReviewItem')).toBeEnabled();
 await p.goBack();await expect(p.locator('#unitFilter')).toHaveValue('p1u1');await expect(p.locator('#searchInput')).toHaveValue('Target');await expect(p.locator('#reviewFilter')).toHaveValue('needs_review');await expect(p.locator('#itemRows tr:visible')).toHaveCount(3);
 await p.locator('#itemRows tr:visible').first().click();await expect(p.locator('#nextReviewItem')).toBeEnabled();await p.evaluate(()=>{const key='haiedu:review-navigation:v1:'+new URLSearchParams(location.search).get('nav'),value=JSON.parse(sessionStorage.getItem(key));value.savedAt=0;sessionStorage.setItem(key,JSON.stringify(value));});await p.reload();await expect(p.locator('.detail-heading')).toBeVisible();await expect(p.locator('#reviewListNavigation')).toBeHidden();
 await ui.bank();await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Storage unavailable','SecurityError');};});await p.locator('#itemRows tr:visible').first().click();await expect(p.locator('.detail-heading')).toBeVisible();await expect(p.locator('#reviewListNavigation')).toBeHidden();assert.deepEqual(ui.errors,[]);
});

for(const width of [1365,390])test(`one action panel guides save, QA and review across tabs at ${width}px`,async t=>{
 const ui=await fixture(t,{width}),p=ui.page;ui.items.find(i=>i.id==='p1u1i0').latestQa=null;
 await p.goto(origin+'/content-item.html?id=p1u1i0');await expect(p.locator('#actionStatusTitle')).toContainText('գործարկել QA');await expect(p.locator('#saveRevisionBtn')).toBeDisabled();await expect(p.locator('#saveStatusReason')).toContainText('Չպահպանված փոփոխություններ չկան');await expect(p.locator('#approveBtn')).toBeDisabled();await expect(p.locator('#reviewStatusReason')).toContainText('չի անցել QA');
 await p.locator('[data-item-tab-button=content]').click();await p.locator('#editPromptHy').fill('Revised question');await expect(p.locator('#actionStatusTitle')).toContainText('պահպանել');await expect(p.locator('#runQaBtn')).toBeDisabled();await expect(p.locator('#qaStatusReason')).toContainText('Նախ պահպանեք');await expect(p.locator('#saveRevisionBtn')).toBeEnabled();
 const pending=ui.holdNext('save_content_revision');await p.locator('#saveRevisionBtn').evaluate(b=>{b.click();b.click();});await expect.poll(()=>typeof pending.resolve).toBe('function');await expect(p.locator('#editPromptHy')).toBeDisabled();await expect(p.locator('#actionStatusTitle')).toContainText('պահպանվում');assert.equal(ui.calls.filter(c=>c.body.action==='save_content_revision').length,1);pending.resolve();
 await expect(p.locator('#runQaBtn')).toBeEnabled();await expect(p.locator('#actionStatusTitle')).toContainText('գործարկել QA');await p.locator('#runQaBtn').click();await expect(p.locator('#approveBtn')).toBeEnabled();await expect(p.locator('#actionStatusTitle')).toContainText('ստուգել և հաստատել');
 for(const tab of ['preview','metadata','review','history']){await p.locator(`[data-item-tab-button=${tab}]`).click();await expect(p.locator('#actionStatusPanel')).toBeVisible();await expect(p.locator('#approveBtn')).toBeVisible();}
 assert.equal(await p.locator('#saveRevisionBtn').count(),1);assert.equal(await p.locator('#runQaBtn').count(),1);assert.equal(await p.locator('#approveBtn').count(),1);
 for(const [id,reason] of [['saveRevisionBtn','saveStatusReason'],['runQaBtn','qaStatusReason'],['approveBtn','reviewStatusReason']])await expect(p.locator('#'+id)).toHaveAttribute('aria-describedby',reason);
 await p.locator('#approveBtn').click();await expect(p.locator('#actionStatusTitle')).toContainText('բովանդակային հաստատում ունի');await expect(p.locator('#approveBtn')).toBeDisabled();await expect(p.locator('#reviewStatusReason')).toContainText('արդեն հաստատված');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await p.locator('[data-item-tab-button=preview]').click();await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"});});await p.screenshot({path:`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/review-action-panel-${width}.png`,fullPage:true});}assert.deepEqual(ui.errors,[]);
});
test('server-required QA rerun and failed read show actionable blockers without re-enabling stale approval',async t=>{
 const ui=await fixture(t),p=ui.page;await p.goto(origin+'/content-item.html?id=p1u1i0');await expect(p.locator('#approveBtn')).toBeEnabled();ui.failNext('approve',{requiresQaRerun:true,errors:['missing_answer_key']});await p.locator('#approveBtn').click();await expect(p.locator('#actionStatusTitle')).toContainText('կրկին գործարկել QA');await expect(p.locator('#approveBtn')).toBeDisabled();await expect(p.locator('#actionStatusFeedback')).not.toBeEmpty();
 await p.locator('#refreshBtn').click();await expect(p.locator('#runQaBtn')).toBeEnabled();await expect(p.locator('#approveBtn')).toBeDisabled();ui.failNext('get-content-quality-dashboard',{error:'Fixture refresh failed'});await p.locator('#runQaBtn').click();await expect(p.locator('#actionStatusTitle')).toContainText('թարմացնել տվյալները');await expect(p.locator('#approveBtn')).toBeDisabled();await expect(p.locator('#runQaBtn')).toBeDisabled();await expect(p.locator('#actionStatusFeedback')).toContainText('Fixture refresh failed');await p.locator('#actionStatusDetails').click();await expect(p.locator('#approveBtn')).toBeEnabled();assert.deepEqual(ui.errors,[]);
});
test('archived, generated, failed QA and SME states explain their separate constraints',async t=>{
 const ui=await fixture(t),p=ui.page;const archived=ui.items.find(i=>i.id==='p1u1i0'),generated=ui.items.find(i=>i.id==='p1u1i1'),failed=ui.items.find(i=>i.id==='p1u1i2');archived.retiredAt='2026-10-24';generated.generated=true;generated.validationState='provisional_no_sme_review';failed.latestQa={passed:false,versionNo:1,errors:['missing_answer_key']};
 await p.goto(origin+'/content-item.html?id='+archived.id);await expect(p.locator('#actionStatusTitle')).toContainText('արխիվացված');for(const id of ['saveRevisionBtn','runQaBtn','approveBtn'])await expect(p.locator('#'+id)).toBeDisabled();await p.locator('#actionStatusDetails').click();await expect(p.locator('#restoreBtn')).toBeVisible();
 await p.goto(origin+'/content-item.html?id='+generated.id);await expect(p.locator('#saveStatusReason')).toContainText('ձևանմուշ');await expect(p.locator('#saveRevisionBtn')).toBeDisabled();await expect(p.locator('#approveBtn')).toBeEnabled();await expect(p.locator('#actionStatusGovernance')).toContainText('SME');
 await p.goto(origin+'/content-item.html?id='+failed.id);await expect(p.locator('#actionStatusTitle')).toContainText('ուսումնասիրել QA-ի խնդիրները');await expect(p.locator('#approveBtn')).toBeDisabled();await p.locator('#actionStatusDetails').click();await expect(p.locator('#technicalQaSection .error-list')).toBeVisible();assert.deepEqual(ui.errors,[]);
});
