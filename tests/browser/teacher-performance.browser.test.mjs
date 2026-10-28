import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {fixture} from '../fixtures/teacher-performance-browser.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const calls=page=>page.evaluate(()=>window.__teacherFixture.calls);
const nav=(page,v)=>page.locator('.hm-role-nav a[href$="view='+v+'"]').click();
for(const archives of [1,1000])test(`home discovery and loaded navigation avoid detail/invitation reads with ${archives} archives`,async t=>{
 const {page,errors}=await fixture(browser,t,{archives});let c=await calls(page);assert.equal(c.length,1);assert.equal(c[0].body.readMode,'directory');await expect(page.locator('#supportCount')).toHaveText('—');
 await nav(page,'classes');await expect(page.locator('#classList .teacher-class-button')).toHaveCount(2);await nav(page,'home');await nav(page,'classes');assert.equal((await calls(page)).length,1);
 await page.locator('#classList .teacher-class-button').first().click();await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();c=await calls(page);assert.equal(c.filter(r=>r.body.readMode==='class').length,1);assert.equal(c.filter(r=>r.fn==='manage-student-invitation').length,0);
 await page.locator('#institutionalInvitationHistory summary').click();await expect.poll(async()=>(await calls(page)).filter(r=>r.fn==='manage-student-invitation').length).toBe(1);assert.deepEqual(errors,[]);
});
test('archive loads one bounded page, searches the whole collection and preserves direct class access',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'archive');await expect(page.locator('.archive-group')).toHaveCount(1);assert.equal((await calls(page)).filter(r=>r.body.archive).length,1);await page.locator('#archiveLoadMore').click();await expect.poll(async()=>(await calls(page)).filter(r=>r.body.archive).length).toBe(2);
 await page.locator('#archiveServerQuery').fill('Արխիվ 059');await expect.poll(async()=>(await calls(page)).some(r=>r.body.search==='Արխիվ 059')).toBe(true);await expect(page.locator('.archive-group summary')).toContainText('1 դասարան');await page.locator('.archive-group summary').click();await page.locator('#archivedClassList .teacher-class-button').click();await expect(page.locator('#institutionalSelectedName')).toHaveText('Արխիվ 059');assert.deepEqual(errors,[]);
});
test('late class results and failed unit reads cannot overwrite the new view; retry retains the requested unit',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'classes');await page.evaluate(()=>window.__teacherFixture.holds.push('class:a'));await page.locator('#classList .teacher-class-button').first().click();await expect(page.locator('#classLoading')).toBeVisible();await nav(page,'classes');await page.locator('#classList .teacher-class-button').nth(1).click();await expect(page.locator('#institutionalSelectedName')).toHaveText('Բ Դասարան');await page.evaluate(()=>window.__teacherFixture.release('class:a'));await expect(page.locator('#institutionalSelectedName')).toHaveText('Բ Դասարան');
 await page.evaluate(()=>window.__teacherFixture.fail.push('class:b'));await page.locator('#teacherUnitFilter').selectOption('release-a:unit-2');await expect(page.locator('#teacherClassRetry')).toBeVisible();await expect(page.locator('#rosterAnalyticsCard')).toBeHidden();await page.evaluate(()=>window.__teacherFixture.fail=[]);await page.locator('#teacherClassRetry').click();await expect(page.locator('#teacherUnitFilter')).toHaveValue('release-a:unit-2');await expect(page.locator('#matrixUnitTitle')).toHaveText('Բաժին 2');assert.deepEqual(errors,[]);
});
test('account switch clears pending reads and uses only the new actor response',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'classes');await page.evaluate(()=>window.__teacherFixture.holds.push('class:a'));await page.locator('#classList .teacher-class-button').first().click();await page.evaluate(()=>{const s=window.__teacherFixture;s.actor='teacher-b';s.listeners.forEach(fn=>fn('SIGNED_IN',{user:{id:s.actor,email:'new@example.invalid'}}));});await expect(page.locator('#dashboardPanel')).toBeVisible();await page.evaluate(()=>window.__teacherFixture.release('class:a'));await expect(page.locator('#teacherEmail')).toHaveValue('new@example.invalid');assert.deepEqual(errors,[]);
});
test('leaving an archive search cancels its debounce and ignores an already pending directory result',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'archive');await expect(page.locator('.archive-group')).toHaveCount(1);
 await page.locator('#archiveServerQuery').fill('Արխիվ 059');await nav(page,'classes');await page.locator('#classList .teacher-class-button').first().click();await expect(page.locator('#institutionalSelectedName')).toHaveText('Ա Դասարան');
 await nav(page,'archive');await page.evaluate(()=>window.__teacherFixture.holds.push('directory:true'));await page.locator('#archiveServerQuery').fill('Արխիվ 058');await expect.poll(async()=>(await calls(page)).some(r=>r.body.search==='Արխիվ 058')).toBe(true);
 await nav(page,'classes');await page.locator('#classList .teacher-class-button').nth(1).click();await expect(page.locator('#institutionalSelectedName')).toHaveText('Բ Դասարան');await page.evaluate(()=>window.__teacherFixture.release('directory:true'));await expect(page.locator('#institutionalSelectedName')).toHaveText('Բ Դասարան');await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();assert.deepEqual(errors,[]);
});

test('initial directory failure offers a retry without another sign-in',async t=>{
 const {page,errors}=await fixture(browser,t,{initialFailure:true});await expect(page.locator('#teacherLoading')).toBeHidden();await expect(page.locator('#dashboardPanel')).toBeHidden();
 await page.evaluate(()=>window.__teacherFixture.fail=[]);await page.locator('#teacherDashboardRetry').click();await expect(page.locator('#dashboardPanel')).toBeVisible();await expect(page.locator('#teacherDashboardRetry')).toBeHidden();assert.equal((await calls(page)).length,2);assert.deepEqual(errors,[]);
});

test('library, resource assignment and writing review have separate context-scoped entry points without eager review reads',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'classes');await page.locator('#classList .teacher-class-button').first().click();await expect(page.locator('#teacherWorkflowEntries')).toBeVisible();
 assert.equal(await page.locator('#teacherWrittenWorkCard #teacherResourcesLink').count(),0);
 for(const [id,intent] of [['teacherResourcesLink',null],['teacherAssignResourceLink','assign']]){
  const u=new URL(await page.locator('#'+id).getAttribute('href'),page.url());assert.equal(u.searchParams.get('assignment'),'assignment-a');assert.equal(u.searchParams.get('unit'),'unit-1');assert.equal(u.searchParams.get('intent'),intent);
 }
 assert.equal((await calls(page)).filter(x=>x.fn==='manage-written-work').length,0);
 await page.locator('#teacherOpenWrittenWork').click();await expect(page.locator('[data-writing-filter]')).toBeVisible();assert.equal((await calls(page)).filter(x=>x.fn==='manage-written-work').length,1);
 await page.locator('#teacherUnitFilter').selectOption('release-a:unit-2');await expect.poll(async()=>new URL(await page.locator('#teacherAssignResourceLink').getAttribute('href'),page.url()).searchParams.get('unit')).toBe('unit-2');
 await nav(page,'classes');assert.equal(await page.locator('#teacherResourcesLink').getAttribute('href'),null);
 assert.equal(await page.locator('#teacherAssignResourceLink').getAttribute('href'),null);assert.deepEqual(errors,[]);
});
test('teacher workflow cards reflow at narrow and enlarged text sizes without losing action focus',async t=>{
 const {page,errors}=await fixture(browser,t);await nav(page,'classes');await page.locator('#classList .teacher-class-button').first().click();await expect(page.locator('#teacherWorkflowEntries')).toBeVisible();
 for(const width of [360,768,1280]){
  await page.setViewportSize({width,height:960});await page.addStyleTag({content:'html{font-size:200%}'});
  const box=await page.locator('#teacherWorkflowEntries').evaluate(e=>({right:e.getBoundingClientRect().right,scroll:e.scrollWidth,width:e.clientWidth}));assert.ok(box.right<=width+1&&box.scroll<=box.width+1,JSON.stringify({width,...box}));
  await page.locator('#teacherAssignResourceLink').focus();assert.equal(await page.locator('#teacherAssignResourceLink').evaluate(e=>e===document.activeElement),true);
 }
 assert.deepEqual(errors,[]);
});
