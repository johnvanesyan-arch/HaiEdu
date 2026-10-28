import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
for(const width of [360,768,1280])test('teacher procedure guide is readable and keyboard usable at '+width+'px and enlarged text',async t=>{
 const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage(),errors=[],serviceCalls=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname.includes('/functions/v1/'))serviceCalls.push(u.pathname);if(u.origin!=='https://guide.test')return route.abort();try{const b=await readFile('web'+u.pathname);return route.fulfill({body:b,contentType:u.pathname.endsWith('.html')?'text/html':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.ttf')?'font/ttf':'image/svg+xml'});}catch{return route.fulfill({status:404,body:''});}});
 await page.goto('https://guide.test/teacher-workflows.html');
 for(const a of await page.locator('.workflow-nav a').evaluateAll(xs=>xs.map(x=>x.getAttribute('href'))))assert.equal(await page.locator(a).count(),1);
 assert.match(await page.locator('#future').innerText(),/ԴԵՌ ՀԱՍԱՆԵԼԻ ՉԷ/);assert.match(await page.locator('#future').innerText(),/PDF առաջադրանքի պատասխանի/);assert.equal(await page.locator('#future button, #future input').count(),0);
 for(const size of [100,200]){await page.addStyleTag({content:'html{font-size:'+size+'%}'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px, '+size+'%');}
 await page.locator('.workflow-nav a[href="#assign"]').focus();await page.keyboard.press('Enter');await page.waitForURL(url=>url.hash==='#assign');assert.equal(new URL(page.url()).hash,'#assign');
 assert.deepEqual(errors,[]);assert.deepEqual(serviceCalls,[],'informational guide does not invoke account/data mutations');
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await page.addStyleTag({content:'html{font-size:100%}'});await page.goto('https://guide.test/teacher-workflows.html');await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-workflows-'+width+'.png',fullPage:true});}
});
