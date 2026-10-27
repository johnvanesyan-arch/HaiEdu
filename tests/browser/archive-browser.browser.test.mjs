import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
let browser;before(async()=>{browser=await chromium.launch({headless:true});});after(async()=>browser?.close());
for(const width of [320,768,1280])test(`archive collapses, pages, searches and keeps class actions at ${width}px`,async t=>{
 const context=await browser.newContext({viewport:{width,height:900}});t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='https://archive.test')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="hy"><meta charset="UTF-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/teacher.css"><link rel="stylesheet" href="/ux.css"><link rel="stylesheet" href="/role-layout.css"><a class="skip-link" href="#archive">Անցնել հիմնական բովանդակությանը</a><main class="shell"><h1>Արխիվացված դասարաններ</h1><section class="notice"><span>Յուրացման շեմերը և միջամտության առաջարկությունները դեռևս փորձնական են և պետք է վավերացվեն պիլոտի ընթացքում։</span></section><div class="teacher-collection-heading"><h3>Արխիվացված դասարաններ</h3><span class="teacher-archive-count">31</span></div><div id="archive" class="teacher-archive-browser"></div><output id="opened"></output></main><script type="module">
   import {renderArchive} from '/archive-browser.mjs';
   const items=Array.from({length:31},(_,i)=>({name:'Ֆիզիկա '+i,year:i<27?'2026–2027':'2025–2026'}));
   renderArchive(document.querySelector('#archive'),{items,groupLabel:x=>x.year,searchText:x=>x.name+' '+x.year,renderItem:x=>{const b=document.createElement('button');b.className='teacher-class-button';b.textContent=x.name;b.onclick=()=>document.querySelector('#opened').textContent=x.name;return b;}});
  </script></html>`});
  const body=await readFile(new URL('../../web'+u.pathname,import.meta.url));return route.fulfill({body,contentType:u.pathname.endsWith('.mjs')?'text/javascript':'text/css'});
 });
 await page.goto('https://archive.test/');await page.locator('.archive-group').first().waitFor();
 assert.equal(await page.locator('.archive-group').count(),2);assert.equal(await page.locator('.archive-group[open]').count(),0);assert.equal(await page.locator('.teacher-class-button').count(),0);
 const summary=page.locator('.archive-group summary').first();await summary.focus();await summary.press('Enter');
 await page.waitForFunction(()=>document.querySelectorAll('.teacher-class-button').length===12);
 await page.locator('.archive-more:visible').click();assert.equal(await page.locator('.teacher-class-button').count(),24);
 await page.getByLabel('Որոնել արխիվում').fill('Ֆիզիկա 29');assert.equal(await page.locator('.teacher-class-button').count(),1);await page.getByRole('button',{name:'Ֆիզիկա 29',exact:true}).click();assert.equal(await page.locator('#opened').textContent(),'Ֆիզիկա 29');
 await page.getByLabel('Որոնել արխիվում').fill('անհայտ');assert.equal(await page.locator('.archive-group').count(),0);
 await page.getByLabel('Որոնել արխիվում').fill('');assert.equal(await page.locator('.archive-group[open]').count(),0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'collection heading and count must reflow at 200% text');assert.deepEqual(errors,[]);
});
