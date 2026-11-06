import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {learnerFixture,id} from '../fixtures/request-count-browser.mjs';
import {fixture as teacherFixture} from '../fixtures/teacher-performance-browser.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const settle=page=>page.waitForFunction(()=>window.__requestCounts.active===0);
test('failed SDK confirmation on explicit Home refresh clears access without an unhandled error or service call',async t=>{
 const {page,errors}=await learnerFixture(browser,t);await page.locator('.student-continue').waitFor();await settle(page);
 const before=await page.evaluate(()=>{const count=window.__requestCounts.calls.length;window.__client.auth.getSession=async()=>{throw Error('Synthetic session failure');};document.getElementById('refreshDashboardBtn').click();return count;});
 await expect(page.locator('.amp-subject-card')).toHaveCount(0);await expect(page.locator('[data-retry-access]')).toBeVisible();
 assert.equal(await page.evaluate(()=>window.__requestCounts.calls.length),before);assert.equal(await page.evaluate(()=>window.__HAIEDU_DASHBOARD__),null);assert.deepEqual(errors,[]);
});
test('Home refuses a stale SDK account snapshot and recovers only after current session confirmation',async t=>{
 const {page,errors}=await learnerFixture(browser,t);await page.locator('.student-continue').waitFor();await settle(page);
 const before=await page.evaluate(async()=>{const client=window.__client,old=await client.auth.getSession();window.__originalGetSession=client.auth.getSession;client.auth.getSession=async()=>old;window.__homeFixture.switchAccount();return window.__requestCounts.calls.length;});
 await page.waitForTimeout(150);await expect(page.locator('.amp-subject-card')).toHaveCount(0);
 assert.equal(await page.evaluate(()=>window.__requestCounts.calls.length),before);
 await page.evaluate(()=>{window.__client.auth.getSession=window.__originalGetSession;window.__homeFixture.recover();});
 await expect(page.locator('.amp-subject-card')).toHaveCount(1);await expect(page.locator('.amp-subject-card')).toContainText('Մաթեմատիկա');assert.deepEqual(errors,[]);
});
test('legacy Home card and shell share one pending read and discard old membership after account change',async t=>{
 const {page,errors}=await learnerFixture(browser,t,{route:'legacy-class.html'});await page.locator('#homeClassCard').waitFor();await settle(page);
 assert.equal(await page.evaluate(()=>window.__requestCounts.calls.filter(c=>c.name==='get-student-classes').length),1);
 await page.evaluate(()=>{window.__requestCounts.joined=true;window.__requestCounts.holds.push('get-student-classes');window.__homeFixture.recover();});
 await page.waitForFunction(()=>window.__requestCounts.pending.length===1);
 await page.evaluate(()=>{window.__requestCounts.joined=false;window.__homeFixture.switchAccount();window.__requestCounts.release('get-student-classes');});
 await expect(page.locator('#homeClassTitle')).toContainText('Միացեք');await expect(page.locator('#homeClassList')).toBeEmpty();assert.deepEqual(errors,[]);
});
test('Home refresh, revocation and restored page use fresh navigation without multiplying access readers',async t=>{
 const {page,errors}=await learnerFixture(browser,t);await page.locator('.student-continue').waitFor();await settle(page);
 await page.evaluate(()=>window.__homeFixture.refresh());await settle(page);await page.locator('.student-continue').waitFor();
 await page.evaluate(()=>window.__homeFixture.revoke());await expect(page.locator('.amp-subject-card')).toHaveCount(0);await settle(page);
 const before=await page.evaluate(()=>window.__requestCounts.calls.length);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await page.waitForFunction(n=>window.__requestCounts.calls.length>n,before);await settle(page);
 assert.equal(await page.evaluate(()=>window.__requestCounts.calls.filter(c=>c.name==='get-student-classes').length),0);assert.deepEqual(errors,[]);
});
for(const event of ['switch','signout'])test('late Home navigation cannot restore an old account after '+event,async t=>{
 const {page,errors}=await learnerFixture(browser,t);await page.locator('.student-continue').waitFor();await settle(page);
 await page.evaluate(()=>{window.__requestCounts.holds.push('get-student-dashboard');window.__homeFixture.recover();});
 await page.waitForFunction(()=>window.__requestCounts.pending.length>0);
 await page.evaluate(event=>event==='switch'?window.__homeFixture.switchAccount():window.__client.auth.signOut(),event);
 await page.evaluate(()=>window.__requestCounts.release('get-student-dashboard'));await settle(page);
 if(event==='switch'){await expect(page.locator('.amp-subject-card')).toHaveCount(1);await expect(page.locator('.amp-subject-card')).toContainText('Մաթեմատիկա');}
 else await expect(page.locator('#publicEntry')).toBeVisible();
 await expect(page.locator('.student-continue')).toHaveCount(0);assert.deepEqual(errors,[]);
});
test('course refresh rejects delayed old membership, respects revoked selection and rereads on history navigation',async t=>{
 const {page,errors}=await learnerFixture(browser,t,{route:'course.html'});await page.locator('.course-tabs').first().waitFor();await settle(page);
 await page.evaluate(()=>{window.__requestCounts.holds.push('get-student-classes');window.__homeFixture.recover();});
 await page.waitForFunction(()=>window.__requestCounts.pending.length>0);
 await page.evaluate(()=>window.__homeFixture.switchAccount());await page.evaluate(()=>window.__requestCounts.release('get-student-classes'));
 await expect(page.locator('#courseContent')).toContainText('Ընտրված դասընթացն այս պահին հասանելի չէ');await expect(page.locator('.course-tabs')).toHaveCount(0);
 await page.evaluate(({enrollment,release,unit})=>{history.pushState({},'',`?enrollment=${enrollment}&release=${release}&unit=${unit}`);dispatchEvent(new PopStateEvent('popstate'));},{enrollment:id(11),release:id(12),unit:id(13)});
 await expect(page.locator('#courseTitle')).toContainText('Մաթեմատիկա');await page.goBack();await expect(page.locator('#courseContent')).toContainText('Ընտրված դասընթացն այս պահին հասանելի չէ');assert.deepEqual(errors,[]);
});
test('same-account token refresh keeps an active answer and starts no second learning session',async t=>{
 const {page,errors}=await learnerFixture(browser,t,{route:'course.html',action:'practice'});await page.locator('#learningPlayer form').waitFor();
 const answer=page.locator('#learningPlayer input[value=true]');await answer.check();await answer.focus();
 await page.evaluate(()=>window.__homeFixture.refresh());await page.waitForFunction(()=>window.__requestCounts.calls.filter(c=>c.name==='get-student-classes').length===2);await settle(page);
 await expect(answer).toBeChecked();assert.equal(await answer.evaluate(e=>e===document.activeElement),true);
 assert.equal(await page.evaluate(()=>window.__requestCounts.calls.filter(c=>c.name==='start-learning-session').length),1);
 await page.evaluate(()=>window.__homeFixture.revoke());await expect(page.locator('#learningPlayer form')).toHaveCount(0);assert.deepEqual(errors,[]);
});
test('join invalidates a pending pre-join read, submits once and verifies membership with a fresh read',async t=>{
 const {page,errors}=await learnerFixture(browser,t,{route:'join.html'});await expect(page.locator('#joinBtn')).toBeEnabled();await settle(page);
 await page.evaluate(async()=>{window.__requestCounts.holds.push('get-student-classes');const {learnerAccess}=await import('/learner-access.mjs');window.__preJoin=learnerAccess(window.__client).read();});await page.waitForFunction(()=>window.__requestCounts.pending.length===1);
 await page.locator('#joinCode').fill('ABCDEFGH');await page.locator('#joinBtn').click();
 await page.evaluate(()=>document.getElementById('joinBtn').dispatchEvent(new MouseEvent('click')));
 await page.waitForFunction(()=>window.__requestCounts.pending.length===2);
 const calls=await page.evaluate(()=>window.__requestCounts.calls);assert.equal(calls.filter(c=>c.name==='join-class').length,1);
 await page.evaluate(()=>window.__requestCounts.release('get-student-classes'));await expect(page.locator('#message')).toContainText('Միացաք');
 await page.evaluate(()=>window.__homeFixture.switchAccount());await page.waitForTimeout(600);assert.equal(new URL(page.url()).pathname,'/join.html');await expect(page.locator('#message')).not.toContainText('Միացաք');assert.deepEqual(errors,[]);
});
test('late join mutation response cannot verify or redirect a different account',async t=>{
 const {page,errors}=await learnerFixture(browser,t,{route:'join.html'});await expect(page.locator('#joinBtn')).toBeEnabled();await settle(page);
 await page.evaluate(()=>window.__requestCounts.holds.push('join-class'));await page.locator('#joinCode').fill('ABCDEFGH');await page.locator('#joinBtn').click();
 await page.waitForFunction(()=>window.__requestCounts.pending.some(p=>p.name==='join-class'));await page.evaluate(()=>window.__homeFixture.switchAccount());await page.evaluate(()=>window.__requestCounts.release('join-class'));
 await page.waitForTimeout(650);assert.equal(new URL(page.url()).pathname,'/join.html');await expect(page.locator('#message')).not.toContainText('Միացաք');assert.deepEqual(errors,[]);
});
test('teacher selector handoff still requests fresh authorized work and fails closed after revocation',async t=>{
 const {page,errors}=await teacherFixture(browser,t,{startUrl:'https://teacher.test/teacher.html?view=class&class=a&assignment=assignment-a&release=release-a&unit=unit-1'});
 await expect(page.locator('#teacherAssignWritingLink')).toHaveAttribute('href',/view=assign-writing/);
 await page.evaluate(()=>window.__teacherFixture.denied.push('manage-writing-assignments'));await page.locator('#teacherAssignWritingLink').click();await expect(page.locator('[data-wa-read-retry]')).toBeVisible();
 await expect(page.locator('[data-wa-task]')).toHaveCount(0);await expect(page.locator('[data-wa-send]')).toHaveCount(0);assert.deepEqual(errors,[]);
});
test('teacher class-to-review reuses only selectors and freshly authorizes the exact work queue',async t=>{
 const {page,errors}=await teacherFixture(browser,t,{startUrl:'https://teacher.test/teacher.html?view=class&class=a&assignment=assignment-a&release=release-a&unit=unit-2'});
 await expect(page.locator('#teacherAssignWritingLink')).toHaveAttribute('href',/unit=unit-2/);
 const before=await page.evaluate(()=>window.__teacherFixture.calls.length);
 await page.locator('.hm-role-nav a[href="./teacher.html?view=review"]').click();await page.waitForFunction(()=>window.__teacherFixture.queueStates.length===1);
 const calls=await page.evaluate(n=>window.__teacherFixture.calls.slice(n),before);
 assert.equal(calls.filter(c=>c.fn==='get-teacher-dashboard'&&c.body.readMode==='class').length,0);
 const queue=calls.filter(c=>c.fn==='manage-written-work');assert.equal(queue.length,1);assert.deepEqual(queue[0].body.context,{assignmentId:'assignment-a',curriculumReleaseId:'release-a',unitId:'unit-2'});assert.deepEqual(errors,[]);
});
test('teacher token rotation prevents selector handoff and forces a fresh exact-context read',async t=>{
 const {page,errors}=await teacherFixture(browser,t,{startUrl:'https://teacher.test/teacher.html?view=class&class=a&assignment=assignment-a&release=release-a&unit=unit-1'});
 await expect(page.locator('#teacherAssignWritingLink')).toHaveAttribute('href',/view=assign-writing/);
 const before=await page.evaluate(()=>{const s=window.__teacherFixture;s.listeners.forEach(fn=>fn('TOKEN_REFRESHED',{user:{id:s.actor},access_token:'new-synthetic'}));return s.calls.length;});
 await page.locator('#teacherAssignWritingLink').click();await expect(page.locator('[data-wa-body]')).toContainText('հրապարակված գրավոր առաջադրանք դեռ չկա');
 const calls=await page.evaluate(n=>window.__teacherFixture.calls.slice(n),before);assert.equal(calls.filter(c=>c.fn==='get-teacher-dashboard'&&c.body.readMode==='class').length,1);assert.equal(calls.filter(c=>c.fn==='manage-writing-assignments').length,1);assert.deepEqual(errors,[]);
});
