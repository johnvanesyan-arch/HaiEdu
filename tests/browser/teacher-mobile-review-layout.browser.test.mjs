import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {fixture} from '../fixtures/teacher-performance-browser.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
for(const width of [390,430])test('teacher review remains inside '+width+'px phone viewport at ordinary and doubled text',async t=>{
 const {page,errors}=await fixture(browser,t,{viewport:{width,height:width===390?844:932},mobile:true});
 await page.locator('.hm-role-nav a[href$="view=classes"]').click();
 await page.locator('#classList .teacher-class-button').first().click();
 await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();
 await page.locator('#teacherOpenWrittenWork').click();
 await expect(page.locator('[data-writing-filter]')).toBeVisible();
 for(const size of [100,200]){
  await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);
  const box=await page.evaluate(()=>{const root=document.documentElement,main=document.querySelector('#mainContent'),r=main.getBoundingClientRect();return{viewport:innerWidth,scrollX,scroll:root.scrollWidth,client:root.clientWidth,left:r.left,right:r.right,offenders:[...main.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.right>innerWidth+1;}).map(e=>({tag:e.tagName,id:e.id,classes:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,12)};});
  assert.ok(box.scroll<=box.client+1&&box.left>=-1&&box.right<=width+1,JSON.stringify({size,...box}));
 }
 assert.deepEqual(errors,[]);
});
