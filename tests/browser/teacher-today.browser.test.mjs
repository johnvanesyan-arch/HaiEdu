import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {todayFixture,id} from '../fixtures/teacher-today-browser.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>browser?.close());
const summary=p=>p.locator('[data-today-summary]');
const calls=(p,fn)=>p.evaluate(fn=>window.__today.calls.filter(c=>c.fn===fn),fn);

test('teacher Home balances classroom progress and review with readable keyboard paths',async t=>{
 const {page:p,errors}=await todayFixture(browser,t);
 await expect(summary(p)).toContainText('2 դասընթացի գրավոր');
 await p.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1280,768,390]){
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const selector of ['[data-home-progress]','[data-home-review]']){
   const link=p.locator(selector);await expect(link).toBeVisible();await link.focus();
   assert.equal(await link.evaluate(e=>e===document.activeElement),true);
  }
  const bad=await p.locator('.teacher-home-paths').evaluate(root=>{
   const errors=[];
   for(const el of root.querySelectorAll('strong,span')){
    const box=el.getBoundingClientRect(),node=el.firstChild;
    if(el.scrollWidth>el.clientWidth+1||box.right>innerWidth+1)errors.push(el.textContent);
    for(const word of node.textContent.matchAll(/\S+/gu)){
     const r=document.createRange();r.setStart(node,word.index);r.setEnd(node,word.index+word[0].length);
     const rects=[...r.getClientRects()].filter(r=>r.width>0);
     if(rects.some(r=>Math.abs(r.top-rects[0].top)>1)||rects.some(r=>r.left<box.left-1||r.right>box.right+1))errors.push(word[0]);
    }
   }
   return errors;
  });
  assert.deepEqual(bad,[],String(width));
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-home-balanced-'+width+'.png',fullPage:true});}
 }
 await p.evaluate(()=>document.documentElement.style.fontSize='100%');
 await p.locator('[data-home-progress]').click();await expect(p.locator('#teacherClassesView')).toBeVisible();
 assert.equal(new URL(p.url()).searchParams.get('view'),'classes');
 await p.locator('.hm-role-nav a[href="./teacher.html?view=home"]').click();
 await p.locator('[data-home-review]').click();await expect(p.locator('[data-review-class]')).toBeVisible();
 assert.equal(new URL(p.url()).searchParams.get('view'),'review');assert.deepEqual(errors,[]);
});

test('Today opens exact work directly, reloads context, reviews and advances across units without analytics fanout',async t=>{
 const {page:p,errors}=await todayFixture(browser,t);
 await expect(summary(p)).toContainText('2 դասընթացի գրավոր');
 assert.equal((await calls(p,'get-teacher-workspace')).length,0);
 assert.equal((await calls(p,'get-teacher-dashboard')).length,1);
 const first=await p.locator('[data-today-open]').first().getAttribute('data-today-open');
 await p.locator('[data-today-continue] button').click();
 await p.locator('[data-writing-feedback]').waitFor();
 assert.equal(new URL(p.url()).searchParams.get('todayWork'),first);
 let writing=await calls(p,'manage-teacher-feedback');
 assert.deepEqual(writing.map(c=>c.body.action),['open']);
 assert.equal((await calls(p,'get-teacher-dashboard')).length,1);
 const exact=writing[0].body.context;
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-today-review.png'});}
 await p.reload();await p.locator('[data-writing-feedback]').waitFor();
 assert.equal(new URL(p.url()).searchParams.get('todayWork'),first);
 writing=await calls(p,'manage-teacher-feedback');assert.deepEqual(writing[0].body.context,exact);
 await p.locator('[data-writing-feedback]').fill('Synthetic review acknowledgment.');
 for(const field of await p.locator('[data-writing-score]').all())await field.selectOption('2');
 await p.locator('[data-writing-grade]').click();await expect(summary(p)).toContainText('1 դասընթացի գրավոր');
 await expect(p.locator('.written-score')).toBeVisible();
 assert.equal(await p.locator(`[data-today-open="${first}"]`).count(),0);
 await p.locator('[data-today-next]').click();await p.locator('[data-writing-feedback]').waitFor();
 assert.notEqual(new URL(p.url()).searchParams.get('todayWork'),first);
 writing=await calls(p,'manage-teacher-feedback');
 assert.notEqual(writing.at(-1).body.context.unitId,exact.unitId);
 assert.equal((await calls(p,'get-teacher-dashboard')).filter(c=>c.body.readMode==='class').length,0);
 await p.locator('[data-today-back]').click();await expect(summary(p)).toContainText('1 դասընթացի գրավոր');
 assert.equal(new URL(p.url()).searchParams.has('todayWork'),false);
 await p.locator('button[data-today-filter]').first().click();await expect(summary(p)).toContainText('ընտրված դասարանում');
 assert.equal(new URL(p.url()).searchParams.get('queueAssignment'),id(351));
 await p.reload();await expect(summary(p)).toContainText('ընտրված դասարանում');
 await p.locator('[data-today-all]').click();await expect(summary(p)).toContainText('բոլոր ակտիվ');
 assert.deepEqual(errors,[]);
});

test('Today handles pagination, unknown and denied states, unsaved navigation, and an old account response',async t=>{
 const {page:p,errors}=await todayFixture(browser,t,{count:14});
 await expect(summary(p)).toContainText('14 դասընթացի գրավոր');
 assert.equal(await p.locator('.today-work-row').count(),12);
 const firstPage=await p.locator('.today-work-row [data-today-open]').evaluateAll(nodes=>nodes.map(n=>n.dataset.todayOpen));
 await p.locator('[data-today-more]').click();await expect(p.locator('.today-work-row')).toHaveCount(2);
 const lastPage=await p.locator('.today-work-row [data-today-open]').evaluateAll(nodes=>nodes.map(n=>n.dataset.todayOpen));
 assert.ok(lastPage.every(id=>!firstPage.includes(id)));
 await p.locator('[data-today-first]').click();await expect(p.locator('.today-work-row')).toHaveCount(12);
 await p.evaluate(()=>window.__today.fail.push('get-teacher-workspace'));await p.locator('[data-today-refresh]').click();
 await expect(summary(p)).toContainText('չբեռնվեց');assert.doesNotMatch(await summary(p).innerText(),/^0 /);
 assert.equal(await p.locator('.today-class-card').count(),0);
 await p.evaluate(()=>window.__today.fail=[]);await p.locator('[data-today-refresh]').click();await expect(summary(p)).toContainText('14 դասընթացի գրավոր');
 await p.locator('[data-today-continue] button').click();await p.evaluate(()=>window.__today.holds.push('manage-teacher-feedback:save_draft'));await p.locator('[data-writing-feedback]').fill('Unsaved synthetic feedback');
 const reviewURL=p.url();p.once('dialog',d=>d.dismiss());await p.locator('#refreshBtn').click();
 assert.equal(await p.locator('[data-writing-feedback]').inputValue(),'Unsaved synthetic feedback');
 p.once('dialog',d=>d.dismiss());await p.locator('.hm-role-nav a[href$="view=classes"]').first().click();
 assert.equal(p.url(),reviewURL);assert.equal(await p.locator('[data-writing-feedback]').inputValue(),'Unsaved synthetic feedback');
 p.once('dialog',d=>d.accept());await p.evaluate(classId=>{history.pushState({},'', '/teacher.html?view=class&class='+classId);dispatchEvent(new PopStateEvent('popstate'));},id(321));
 await p.locator('#teacherClassDetailView:not(.hidden)').waitFor();assert.equal(await p.locator('#teacherToday').innerText(),'');
 assert.equal(await p.locator('[data-writing-feedback]').count(),0);await p.evaluate(()=>window.__today.release());
 await p.locator('.hm-role-nav a[href$="view=home"]').first().click();await expect(summary(p)).toContainText('14 դասընթացի գրավոր');
 let count=(await calls(p,'get-teacher-workspace')).length;await p.locator('[data-today-refresh]').click();await expect(p.locator('[data-today-refresh]')).toBeEnabled();
 assert.equal((await calls(p,'get-teacher-workspace')).length,count+1);
 await p.evaluate(()=>window.__today.holds.push('get-teacher-workspace'));await p.locator('[data-today-refresh]').click();
 await p.waitForFunction(()=>window.__today.resolvers.length===1);
 await p.evaluate(()=>window.__today.switchActor(21));await expect(summary(p)).toContainText('0 դասընթացի գրավոր');
 await p.evaluate(()=>window.__today.release());await expect(summary(p)).toContainText('0 դասընթացի գրավոր');
 assert.equal(await p.locator('.today-work-row').count(),0);
 assert.equal(await p.evaluate(actor=>sessionStorage.getItem('haiedu:teacher-recent:v1:'+actor),id(20)),null);
 assert.doesNotMatch(await p.locator('[data-today-cards]').innerText(),/School A/);
 await p.goto('https://today.test/teacher.html?view=home&todayWork='+firstPage[0]);await expect(summary(p)).toContainText('14 դասընթացի գրավոր');
 // Reload creates a fresh synthetic teacher A session; a foreign selector must still fail closed.
 await p.goto('https://today.test/teacher.html?view=home&todayWork='+id(9999));await expect(summary(p)).toContainText('այլևս հասանելի չէ');
 assert.equal(await p.locator('[data-writing-feedback]').count(),0);
 await p.locator('[data-today-all]').click();await expect(summary(p)).toContainText('14 դասընթացի գրավոր');
 assert.deepEqual(errors,[]);
});

test('live class cards use governed subject art, exact links and account-scoped recent hints at narrow and enlarged sizes',async t=>{
 const {page:p,errors}=await todayFixture(browser,t,{count:0});
 await expect(summary(p)).toContainText('0 դասընթացի գրավոր');
 assert.equal(await p.locator('.today-class-card').count(),1);
 assert.ok(await p.locator('.today-class-card svg').count());
 const link=p.locator('.today-class-card a');const href=new URL(await link.getAttribute('href'),p.url());
 assert.equal(href.searchParams.get('class'),id(321));assert.equal(href.searchParams.get('assignment'),id(351));assert.equal(href.searchParams.get('view'),'class');
 await p.emulateMedia({reducedMotion:'reduce'});
 for(const width of [360,768,1280]){
  await p.setViewportSize({width,height:1000});
  for(const font of ['100%','200%']){
   await p.evaluate(font=>document.documentElement.style.fontSize=font,font);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width} ${font}: ${JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,e.getBoundingClientRect().width]).slice(-12)))}`);
   await p.locator('[data-today-refresh]').focus();assert.equal(await p.locator('[data-today-refresh]').evaluate(e=>e===document.activeElement),true);
  }
 }
 await p.evaluate(()=>{document.documentElement.style.fontSize='100%';document.activeElement?.blur();window.scrollTo(0,0);});
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-today-wide.png',fullPage:true});await p.setViewportSize({width:360,height:900});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-today-mobile.png',fullPage:true});}
 await p.evaluate(async()=>{const {rememberTeacherClass}=await import('/teacher-today.mjs');rememberTeacherClass('71000000-0000-4000-8000-000000000020','71000000-0000-4000-8000-000000000321');});
 await p.reload();await expect(p.locator('.today-class-card .staff-status')).toHaveText('Վերջերս բացված');
 await p.evaluate(()=>window.__today.switchActor(null));await p.locator('#authPanel:not(.hidden)').waitFor();
 assert.equal(await p.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('haiedu:teacher-recent:')).length),0);
 assert.equal(await p.locator('.today-class-card').count(),0);assert.deepEqual(errors,[]);
});

test('teacher SDK bundle constructs the existing client locally and old-server Home fallback stays functional',async t=>{
 const {page:p,errors}=await todayFixture(browser,t,{count:0,combined:false});
 assert.equal((await calls(p,'get-teacher-workspace')).length,1);
 const result=await p.evaluate(async()=>{const {createClient}=await import('/teacher-dependencies.bundle.mjs');const client=createClient('https://synthetic.invalid','synthetic-publishable-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data,error}=await client.auth.getSession();return {empty:data.session===null,ok:!error};});
 assert.deepEqual(result,{empty:true,ok:true});assert.deepEqual(errors,[]);
});

test('a delayed combined Home response cannot replace a newly signed-in teachers queue or multiply refresh handlers',async t=>{
 const {page:p,errors}=await todayFixture(browser,t);
 await p.evaluate(()=>window.__today.holds.push('get-teacher-dashboard'));await p.locator('#refreshBtn').click();
 await p.waitForFunction(()=>window.__today.resolvers.length===1);
 await p.evaluate(()=>window.__today.switchActor(21));await expect(summary(p)).toContainText('0 դասընթացի գրավոր');
 await p.evaluate(()=>window.__today.release());await expect(summary(p)).toContainText('0 դասընթացի գրավոր');
 assert.equal(await p.locator('.today-work-row').count(),0);
 const before=(await calls(p,'get-teacher-workspace')).length;await p.locator('[data-today-refresh]').click();await expect(p.locator('[data-today-refresh]')).toBeEnabled();
 assert.equal((await calls(p,'get-teacher-workspace')).length,before+1);assert.deepEqual(errors,[]);
});
