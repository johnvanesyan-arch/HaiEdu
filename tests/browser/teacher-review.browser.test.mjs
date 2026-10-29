import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {fixture} from '../fixtures/teacher-performance-browser.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const nav=(p,v)=>p.locator(`.hm-role-nav a[href="./teacher.html?view=${v}"]`).click();
const ready=p=>expect(p.locator('[data-review-class]')).toBeEnabled();
const choose=async(p,n='0')=>{await p.locator('[data-review-class]').selectOption(n);await expect(p.locator('[data-writing-state="submitted"]')).toBeVisible();};

test('permanent writing review offers explicit class/unit and four state filters without eager queue fanout',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'review');await ready(page);
 await expect(page.locator('.hm-role-nav [aria-current="page"]')).toHaveText('Գրավորի ստուգում');
 assert.equal(await page.locator('a[href="./teacher-workspace-preview.html"]').count(),0);
 assert.equal((await page.evaluate(()=>window.__teacherFixture.calls)).filter(r=>r.fn==='manage-written-work').length,0);
 await choose(page);await page.locator('[data-writing-state="reviewed"]').click();await expect(page.locator('[data-writing-state="reviewed"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-writing-state="changes_requested"]').click();await expect(page.locator('[data-writing-state="changes_requested"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-writing-state="all"]').click();await expect(page.locator('[data-writing-state="all"]')).toHaveAttribute('aria-pressed','true');
 assert.deepEqual(await page.evaluate(()=>window.__teacherFixture.queueStates),['submitted','reviewed','changes_requested','all']);
 await page.locator('[data-review-unit]').selectOption('1');await expect(page.locator('[data-review-context]')).toContainText('Բաժին 2');await expect(page.locator('[data-writing-state="all"]')).toHaveAttribute('aria-pressed','true');
 assert.equal(new URL(page.url()).searchParams.get('unit'),'unit-2');assert.equal(new URL(page.url()).searchParams.get('state'),'all');assert.deepEqual(errors,[]);
});
test('a direct reviewed-work link retains its exact release/unit and state on clean entry and browser back',async t=>{
 const {page,errors}=await fixture(browser,t,{startUrl:'https://teacher.test/teacher?view=review&class=a&assignment=assignment-a&release=release-a&unit=unit-2&state=reviewed'});
 await expect(page.locator('[data-review-context]')).toContainText('Բաժին 2');await expect(page.locator('[data-writing-state="reviewed"]')).toHaveAttribute('aria-pressed','true');
 const reads=await page.evaluate(()=>window.__teacherFixture.calls.filter(r=>r.fn==='get-teacher-dashboard'));assert.equal(reads.filter(r=>r.body.readMode==='class').length,1);assert.equal(reads.at(-1).body.selection.unitId,'unit-2');
 await nav(page,'home');await page.goBack();await expect(page.locator('[data-writing-state="reviewed"]')).toHaveAttribute('aria-pressed','true');assert.deepEqual(errors,[]);
});
test('late class and writing replies cannot repaint a new class, a new page or an account',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'review');await ready(page);await page.evaluate(()=>window.__teacherFixture.holds.push('class:a'));
 await page.locator('[data-review-class]').selectOption('0');await page.locator('[data-review-class]').selectOption('1');await expect(page.locator('[data-review-context]')).toContainText('Բ Դասարան');
 await page.evaluate(()=>window.__teacherFixture.release('class:a'));await expect(page.locator('[data-review-context]')).toContainText('Բ Դասարան');
 await page.evaluate(()=>window.__teacherFixture.holds.push('manage-written-work'));await page.locator('[data-writing-state="reviewed"]').click();await nav(page,'classes');await page.evaluate(()=>window.__teacherFixture.release('manage-written-work'));await expect(page.locator('#teacherReviewRoot')).toBeEmpty();
 await nav(page,'review');await ready(page);await choose(page);await page.evaluate(()=>{const s=window.__teacherFixture;s.actor='teacher-b';s.listeners.forEach(fn=>fn('SIGNED_IN',{user:{id:s.actor,email:'new@example.invalid'}}));});
 await expect(page.locator('#teacherEmail')).toHaveValue('new@example.invalid');await expect(page.locator('#teacherReviewRoot')).toBeEmpty();await expect(page.locator('#teacherHomeView')).toBeVisible();assert.deepEqual(errors,[]);
});
test('failed exact-unit read clears old work and retry retains requested unit; archive discovery stays separate',async t=>{
 const {page,errors}=await fixture(browser,t,{archives:30});await nav(page,'review');await ready(page);await choose(page);
 await page.evaluate(()=>window.__teacherFixture.fail.push('class:a'));await page.locator('[data-review-unit]').selectOption('1');await expect(page.locator('[data-review-retry]')).toBeVisible();await expect(page.locator('[data-review-writing]')).toBeEmpty();
 await page.evaluate(()=>window.__teacherFixture.fail=[]);await page.locator('[data-review-retry]').click();await expect(page.locator('[data-review-context]')).toContainText('Բաժին 2');
 await page.locator('[data-review-source]').selectOption('archive');await ready(page);await expect(page.locator('[data-review-writing]')).toBeEmpty();await page.locator('[data-review-more]').click();await expect(page.locator('[data-review-class] option')).toHaveCount(31);assert.deepEqual(errors,[]);
});
test('review controls and status filters remain usable at 360px and 200 percent text',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'review');await ready(page);await choose(page);
 await page.setViewportSize({width:360,height:960});await page.addStyleTag({content:'html{font-size:200%}'});
 const padding=await page.locator('.teacher-review-picker').evaluate(e=>parseFloat(getComputedStyle(e).paddingInlineStart));assert.ok(padding>=16);
 const colors=await page.locator('.written-state-filters').evaluate(e=>[...e.querySelectorAll('button')].map(b=>({selected:b.getAttribute('aria-pressed')==='true',bg:getComputedStyle(b).backgroundColor})));assert.notEqual(colors.find(b=>b.selected).bg,colors.find(b=>!b.selected).bg);
 const box=await page.locator('#teacherReviewRoot').evaluate(e=>({right:e.getBoundingClientRect().right,scroll:e.scrollWidth,width:e.clientWidth}));assert.ok(box.right<=361&&box.scroll<=box.width+1,JSON.stringify(box));
 await page.locator('[data-writing-state="reviewed"]').focus();assert.equal(await page.locator('[data-writing-state="reviewed"]').evaluate(e=>e===document.activeElement),true);
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-writing-review-360.png',fullPage:true});await page.setViewportSize({width:1280,height:960});await page.addStyleTag({content:'html{font-size:100%}'});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-writing-review-1280.png',fullPage:true});}
 assert.deepEqual(errors,[]);
});

test('dedicated review uses actual submission/feedback SQL and protects unsaved text on selection and page changes',async t=>{
 const {todayFixture,id}=await import('../fixtures/teacher-today-browser.mjs');
 const {page:p,db,errors}=await todayFixture(browser,t,{count:1});await nav(p,'review');await ready(p);await choose(p);await p.locator('[data-writing-open]').click();await expect(p.locator('[data-writing-feedback]')).toBeVisible();
 await p.evaluate(()=>window.__today.holds.push('manage-teacher-feedback:save_draft'));await p.locator('[data-writing-feedback]').fill('A private unfinished review');
 p.once('dialog',d=>d.dismiss());await p.locator('[data-review-source]').selectOption('archive');await expect(p.locator('[data-review-source]')).toHaveValue('active');await expect(p.locator('[data-writing-feedback]')).toHaveValue('A private unfinished review');
 p.once('dialog',d=>d.dismiss());await nav(p,'classes');await expect(p.locator('[data-writing-feedback]')).toHaveValue('A private unfinished review');
 await p.evaluate(()=>window.__today.release());await p.locator('[data-feedback-save]').click();await expect(p.locator('[data-feedback-status]')).toContainText('Սևագիրը պահպանված է');
 for(const select of await p.locator('[data-writing-score]').all())await select.selectOption('2');
 await p.locator('[data-writing-grade]').click();await expect(p.locator('.written-score')).toBeVisible();
 assert.equal((await db.query('select count(*) n from written_reviews')).rows[0].n,1);
 // Receipt is checked against the same real service fixture by the existing
 // feedback suite; this case exercises publication from the new entry point.
 assert.equal((await db.query("select state from written_work where task_version_id=$1",[id(6000)])).rows[0].state,'reviewed');
 await p.locator('[data-writing-back]').click();await p.locator('[data-writing-state="reviewed"]').click();await expect(p.locator('[data-writing-open]')).toHaveCount(1);assert.deepEqual(errors,[]);
});
