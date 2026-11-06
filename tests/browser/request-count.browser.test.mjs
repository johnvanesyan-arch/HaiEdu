import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {learnerFixture} from '../fixtures/request-count-browser.mjs';
import {fixture as teacherFixture} from '../fixtures/teacher-performance-browser.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
async function receipt(t,name,data){
 t.diagnostic('BF07_REQUEST_COUNTS '+JSON.stringify({name,...data}));
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await writeFile(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/bf07-'+name+'.json',JSON.stringify(data,null,2)+'\n');}
}
for(const [name,options,ready] of [['home',{},'.amp-subject-card'],['course',{route:'course.html'},'.course-tabs'],['first-question',{route:'course.html',action:'practice'},'#learningPlayer form']])test('BF07 native request measurement: '+name,async t=>{
 const {page,errors}=await learnerFixture(browser,t,options);await page.locator(ready).first().waitFor();
 // Includes the legacy Home 550ms startup timer and queued INITIAL_SESSION.
 await page.waitForTimeout(700);await page.waitForFunction(()=>window.__requestCounts.active===0);
 const calls=await page.evaluate(()=>window.__requestCounts.calls);
 await receipt(t,name,{calls,counts:Object.fromEntries([...new Set(calls.map(c=>c.name))].map(n=>[n,calls.filter(c=>c.name===n).length]))});
 assert.equal(calls.filter(c=>c.name==='get-student-classes').length,name==='home'?0:1);
 assert.equal(calls.filter(c=>c.name==='get-student-dashboard').length,name==='home'?2:1);
 assert.deepEqual(errors,[]);assert.equal(calls.filter(c=>c.name==='start-learning-session').length,name==='first-question'?1:0);
});
test('BF07 native teacher class-to-writing request measurement',async t=>{
 const {page,errors}=await teacherFixture(browser,t,{startUrl:'https://teacher.test/teacher.html?view=class&class=a&assignment=assignment-a&release=release-a&unit=unit-1'});
 await expect(page.locator('#teacherAssignWritingLink')).toHaveAttribute('href',/view=assign-writing/);
 const before=await page.evaluate(()=>window.__teacherFixture.calls.length);
 await page.locator('#teacherAssignWritingLink').click();await expect(page.locator('[data-wa-body]')).toContainText('հրապարակված գրավոր առաջադրանք դեռ չկա');
 const calls=await page.evaluate(n=>window.__teacherFixture.calls.slice(n),before);await receipt(t,'teacher-class-writing',{calls});
 assert.equal(calls.filter(c=>c.fn==='get-teacher-dashboard'&&c.body.readMode==='class').length,0);
 assert.equal(calls.filter(c=>c.fn==='manage-writing-assignments'&&c.body.action==='catalog').length,1);assert.deepEqual(errors,[]);
});
