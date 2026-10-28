import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {todayFixture,id} from '../fixtures/teacher-today-browser.mjs';
let browser;before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>browser?.close());
const summary=p=>p.locator('[data-today-summary]');
const calls=(p,fn)=>p.evaluate(fn=>window.__today.calls.filter(c=>c.fn===fn),fn);

test('Today opens exact work directly, reloads context, reviews and advances across units without analytics fanout',async t=>{
 const {page:p,errors}=await todayFixture(browser,t);
 await expect(summary(p)).toContainText('2 աշխատանք');
 assert.equal((await calls(p,'get-teacher-workspace')).length,1);
 assert.equal((await calls(p,'get-teacher-dashboard')).length,1);
 const first=await p.locator('[data-today-open]').first().getAttribute('data-today-open');
 await p.locator('[data-today-continue] button').click();
 await p.locator('[data-writing-feedback]').waitFor();
 assert.equal(new URL(p.url()).searchParams.get('todayWork'),first);
 let writing=await calls(p,'manage-written-work');
 assert.deepEqual(writing.map(c=>c.body.action),['inspect']);
 assert.equal((await calls(p,'get-teacher-dashboard')).length,1);
 const exact=writing[0].body.context;
 await p.reload();await p.locator('[data-writing-feedback]').waitFor();
 assert.equal(new URL(p.url()).searchParams.get('todayWork'),first);
 writing=await calls(p,'manage-written-work');assert.deepEqual(writing[0].body.context,exact);
 await p.locator('[data-writing-feedback]').fill('Synthetic review acknowledgment.');
 for(const field of await p.locator('[data-writing-score]').all())await field.selectOption('2');
 await p.locator('[data-writing-grade]').click();await expect(summary(p)).toContainText('1 աշխատանք');
 await expect(p.locator('.written-score')).toBeVisible();
 assert.equal(await p.locator(`[data-today-open="${first}"]`).count(),0);
 await p.locator('[data-today-next]').click();await p.locator('[data-writing-feedback]').waitFor();
 assert.notEqual(new URL(p.url()).searchParams.get('todayWork'),first);
 writing=await calls(p,'manage-written-work');
 assert.notEqual(writing.at(-1).body.context.unitId,exact.unitId);
 assert.equal((await calls(p,'get-teacher-dashboard')).filter(c=>c.body.readMode==='class').length,0);
 await p.locator('[data-today-back]').click();await expect(summary(p)).toContainText('1 աշխատանք');
 assert.equal(new URL(p.url()).searchParams.has('todayWork'),false);
 await p.locator('button[data-today-filter]').first().click();await expect(summary(p)).toContainText('ընտրված դասարանում');
 assert.equal(new URL(p.url()).searchParams.get('queueAssignment'),id(351));
 await p.reload();await expect(summary(p)).toContainText('ընտրված դասարանում');
 await p.locator('[data-today-all]').click();await expect(summary(p)).toContainText('բոլոր ակտիվ');
 assert.deepEqual(errors,[]);
});

test('Today handles pagination, unknown and denied states, unsaved navigation, and an old account response',async t=>{
 const {page:p,errors}=await todayFixture(browser,t,{count:14});
 await expect(summary(p)).toContainText('14 աշխատանք');
 assert.equal(await p.locator('.today-work-row').count(),12);
 const firstPage=await p.locator('.today-work-row [data-today-open]').evaluateAll(nodes=>nodes.map(n=>n.dataset.todayOpen));
 await p.locator('[data-today-more]').click();await expect(p.locator('.today-work-row')).toHaveCount(2);
 const lastPage=await p.locator('.today-work-row [data-today-open]').evaluateAll(nodes=>nodes.map(n=>n.dataset.todayOpen));
 assert.ok(lastPage.every(id=>!firstPage.includes(id)));
 await p.locator('[data-today-first]').click();await expect(p.locator('.today-work-row')).toHaveCount(12);
 await p.evaluate(()=>window.__today.fail.push('get-teacher-workspace'));await p.locator('[data-today-refresh]').click();
 await expect(summary(p)).toContainText('չբեռնվեց');assert.doesNotMatch(await summary(p).innerText(),/^0 /);
 assert.equal(await p.locator('.today-class-card').count(),0);
 await p.evaluate(()=>window.__today.fail=[]);await p.locator('[data-today-refresh]').click();await expect(summary(p)).toContainText('14 աշխատանք');
 await p.locator('[data-today-continue] button').click();await p.locator('[data-writing-feedback]').fill('Unsaved synthetic feedback');
 const reviewURL=p.url();p.once('dialog',d=>d.dismiss());await p.locator('a[href*="view=classes"]').first().click();
 assert.equal(p.url(),reviewURL);assert.equal(await p.locator('[data-writing-feedback]').inputValue(),'Unsaved synthetic feedback');
 p.once('dialog',d=>d.accept());await p.locator('a[href*="view=classes"]').first().click();
 assert.equal(await p.locator('[data-writing-feedback]').count(),0);
 await p.locator('a[href*="view=home"]').first().click();await expect(summary(p)).toContainText('14 աշխատանք');
 let count=(await calls(p,'get-teacher-workspace')).length;await p.locator('[data-today-refresh]').click();await expect(p.locator('[data-today-refresh]')).toBeEnabled();
 assert.equal((await calls(p,'get-teacher-workspace')).length,count+1);
 await p.evaluate(()=>window.__today.holds.push('get-teacher-workspace'));await p.locator('[data-today-refresh]').click();
 await p.waitForFunction(()=>window.__today.resolvers.length===1);
 await p.evaluate(()=>window.__today.switchActor(21));await expect(summary(p)).toContainText('0 աշխատանք');
 await p.evaluate(()=>window.__today.release());await expect(summary(p)).toContainText('0 աշխատանք');
 assert.equal(await p.locator('.today-work-row').count(),0);
 assert.equal(await p.evaluate(actor=>sessionStorage.getItem('haiedu:teacher-recent:v1:'+actor),id(20)),null);
 assert.doesNotMatch(await p.locator('[data-today-cards]').innerText(),/School A/);
 await p.goto('https://today.test/teacher.html?view=home&todayWork='+firstPage[0]);await expect(summary(p)).toContainText('14 աշխատանք');
 // Reload creates a fresh synthetic teacher A session; a foreign selector must still fail closed.
 await p.goto('https://today.test/teacher.html?view=home&todayWork='+id(9999));await expect(summary(p)).toContainText('այլևս հասանելի չէ');
 assert.equal(await p.locator('[data-writing-feedback]').count(),0);
 await p.locator('[data-today-all]').click();await expect(summary(p)).toContainText('14 աշխատանք');
 assert.deepEqual(errors,[]);
});

test('live class cards use governed subject art, exact links and account-scoped recent hints at narrow and enlarged sizes',async t=>{
 const {page:p,errors}=await todayFixture(browser,t,{count:0});
 await expect(summary(p)).toContainText('0 աշխատանք');
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
 await p.evaluate(()=>document.documentElement.style.fontSize='100%');
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-today-wide.png',fullPage:true});await p.setViewportSize({width:360,height:900});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-today-mobile.png',fullPage:true});}
 await p.evaluate(async()=>{const {rememberTeacherClass}=await import('/teacher-today.mjs');rememberTeacherClass('71000000-0000-4000-8000-000000000020','71000000-0000-4000-8000-000000000321');});
 await p.reload();await expect(p.locator('.today-class-card .staff-status')).toHaveText('Վերջերս բացված');
 await p.evaluate(()=>window.__today.switchActor(null));await p.locator('#authPanel:not(.hidden)').waitFor();
 assert.equal(await p.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('haiedu:teacher-recent:')).length),0);
 assert.equal(await p.locator('.today-class-card').count(),0);assert.deepEqual(errors,[]);
});
