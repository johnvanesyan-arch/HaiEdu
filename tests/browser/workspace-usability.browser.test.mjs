import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {keyboardSkipAcceptance} from '../fixtures/keyboard-acceptance.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());

test('every shared UX consumer keeps a readable keyboard route into its actual main content',async()=>{
 const names=(await readdir('web')).filter(n=>n.endsWith('.html')),consumers=[];
 for(const name of names){const html=await readFile('web/'+name,'utf8');if(/(?:href=["']\.\/ux\.css|src=["']\.\/ux\.js)/.test(html))consumers.push(name);}
 assert.ok(consumers.length>=28,'consumer audit must not silently narrow');const rows=[];
 for(const name of consumers){
  const bc=await browser.newContext({viewport:{width:768,height:960},reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   await bc.addInitScript(()=>{window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:null}})}};});
   const errors=[],p=await bc.newPage();p.on('pageerror',e=>errors.push(e.message));
   await bc.route('**/*',async r=>{
    const u=new URL(r.request().url());if(u.origin!=='https://ux-consumers.test')throw Error('Unexpected external request');
    try{let bytes=await readFile('web'+u.pathname);const js=/\.m?js$/.test(u.pathname);
     // Actual HTML/CSS and shared UX, with business/auth modules deliberately
     // absent. Resolve only the fixture presentation hold which that absent
     // router would normally clear; the production role guard stays intact.
     // This verifies the shared component, not a signed-in journey.
     if(u.pathname.endsWith('.html')){
      let html=bytes.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\sdata-role-routing="pending"/,'');
      // With the role controller deliberately absent, model its no-session
      // landing state explicitly. Its two main regions otherwise retain the
      // pre-routing placeholder state; signed-in shell journeys run separately.
      if(name==='index.html')html=html.replace('id="publicEntry" class="public-entry hidden"','id="publicEntry" class="public-entry"').replace('<main class="shell" id="mainContent">','<main class="shell hidden" id="mainContent">');
      bytes=Buffer.from(html.replace('</body>','<script type="module" src="./ux.js"></script></body>'));
     }
     if(js&&!['/ux.js','/config.js'].includes(u.pathname))bytes=Buffer.from('');
     await r.fulfill({body:bytes,contentType:u.pathname.endsWith('.html')?'text/html':js?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});
    }catch{await r.fulfill({status:404,body:''});}
   });
   await p.goto('https://ux-consumers.test/'+name);
   for(const width of [360,768,1280])for(const textScale of [100,200]){
    await p.setViewportSize({width,height:960});await p.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',textScale);
    await keyboardSkipAcceptance(p);await p.locator('a.skip-link').first().focus();await p.locator('a.skip-link').first().press('Enter');
    const target=await p.locator('a.skip-link').first().getAttribute('href');assert.ok(/^#[A-Za-z][\w-]*$/.test(target),name);await expect(p.locator(target),name).toBeVisible();await expect(p.locator(target),name).toBeFocused();assert.deepEqual(errors,[],name);
    rows.push({page:name,width,textScale,keyboard:true,contrast:true,reducedMotion:true,scope:'actual page styles/shared UX; resolved presentation only; isolated auth/business modules; index guest landing'});
   }
  }finally{await bc.close();}
 }
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await writeFile(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/b123-ux-consumers.json',JSON.stringify(rows,null,2));}
});

test('teacher refresh and logout ask before abandoning private feedback and refresh confirms only once',async t=>{
 const {todayFixture}=await import('../fixtures/teacher-today-browser.mjs');const {page:p,errors}=await todayFixture(browser,t,{count:1});
 await p.locator('[data-today-continue] button').click();await p.locator('[data-writing-feedback]').waitFor();
 await p.evaluate(()=>{window.__today.signOutCount=0;window.__haieduSupabaseClient.auth.signOut=async()=>{window.__today.signOutCount++;return{error:Error('Synthetic signout must not be reached')};};window.__today.holds.push('manage-teacher-feedback:save_draft');});
 await p.locator('[data-writing-feedback]').fill('Private feedback stays while I cancel leaving.');let dialogs=0;
 p.once('dialog',async d=>{dialogs++;await d.dismiss();});await p.locator('#refreshBtn').click();await expect(p.locator('[data-writing-feedback]')).toHaveValue('Private feedback stays while I cancel leaving.');assert.equal(dialogs,1);
 p.once('dialog',async d=>{dialogs++;await d.dismiss();});await p.locator('.hm-sidebar-signout').click();assert.equal(await p.evaluate(()=>window.__today.signOutCount),0);await expect(p.locator('[data-writing-feedback]')).toHaveValue('Private feedback stays while I cancel leaving.');assert.equal(dialogs,2);
 const accept=async d=>{dialogs++;await d.accept();};p.on('dialog',accept);await p.locator('#refreshBtn').click();await p.locator('[data-today-continue] button').waitFor();p.off('dialog',accept);assert.equal(dialogs,3);
 await p.evaluate(()=>window.__today.release());assert.deepEqual(errors,[]);
});
