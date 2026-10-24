import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});});
after(async()=>browser?.close());
// Real page/controller/styles; synthetic authenticated catalogue. No production data.
for(const width of [1365,390])test(`curriculum subjects toggle independently by mouse and keyboard at ${width}px`,async t=>{
 const context=await browser.newContext({viewport:{width,height:900}});t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const dashboard={catalog:{programs:[{id:'p1',gradeLabelHy:'7-րդ դասարան',subjectNameHy:'Ֆիզիկա',versionLabel:'Ծրագիր 1'},{id:'p2',gradeLabelHy:'8-րդ դասարան',subjectNameHy:'Ֆիզիկա',versionLabel:'Ծրագիր 2'},{id:'p3',gradeLabelHy:'7-րդ դասարան',subjectNameHy:'Անգլերեն',versionLabel:'Ծրագիր 3'}],units:[{id:'u1',programId:'p1',code:'UNIT-1',titleHy:'Առաջին բաժին'},{id:'u2',programId:'p2',code:'UNIT-2',titleHy:'Երկրորդ բաժին'}]},items:[{curriculum:{program:{id:'p1'},unit:{id:'u1'}},reviewStatus:'approved',latestQa:{passed:true}},{curriculum:{program:{id:'p2'},unit:{id:'u2'}},reviewStatus:'needs_review',latestQa:{passed:false}}]};
 await page.addInitScript(d=>{const session={user:{id:'fixture-reviewer'}};window.__client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},functions:{invoke:async()=>({data:d})}};},dashboard);
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
  if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="fixture-only";'});
  if(url.origin==='https://coverage.test'&&/\.(html|css|js|mjs|svg)$/.test(url.pathname))return route.fulfill({contentType:url.pathname.endsWith('.html')?'text/html':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.svg')?'image/svg+xml':'text/javascript',body:await readFile(new URL('../../web'+url.pathname,import.meta.url),'utf8')});
  return route.abort();
 });
 await page.goto('https://coverage.test/content-curriculum.html');await expect(page.locator('#console')).toBeVisible();
 const cards=page.locator('.curriculum-program-card');await expect(cards).toHaveCount(3);
 for(let i=0;i<3;i++){await expect(cards.nth(i).locator('summary')).toBeVisible();await expect(cards.nth(i).locator('.curriculum-units')).toBeHidden();}
 await expect(cards.nth(1).locator('summary')).toContainText('1 QA խնդիր');
 await cards.nth(0).locator('summary').click();await expect(cards.nth(0).locator('.curriculum-units')).toBeVisible();await expect(cards.nth(1).locator('.curriculum-units')).toBeHidden();
 await expect(cards.nth(0).getByRole('link',{name:'Բացել բանկում'})).toHaveAttribute('href','./content-bank.html?program=p1&unit=u1');
 await cards.nth(1).locator('summary').focus();await page.keyboard.press('Enter');await expect(cards.nth(1).locator('.curriculum-units')).toBeVisible();await expect(cards.nth(0).locator('.curriculum-units')).toBeVisible();
 await page.keyboard.press('Space');await expect(cards.nth(1).locator('.curriculum-units')).toBeHidden();await expect(cards.nth(1).locator('summary')).toBeFocused();
 await cards.nth(2).locator('summary').click();await expect(cards.nth(2).locator('.curriculum-units')).toContainText('Այս ծրագրի համար բաժիններ չկան։');
 await cards.nth(0).locator('summary').click();await cards.nth(2).locator('summary').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/curriculum-collapsed-${width}.png`,fullPage:true});}
});
