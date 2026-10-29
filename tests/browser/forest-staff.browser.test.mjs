import {keyboardSkipAcceptance} from '../fixtures/keyboard-acceptance.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {fixture as teacherFixture} from '../fixtures/teacher-performance-browser.mjs';
let browser;
before(async()=>browser=await chromium.launch({headless:true}));
after(async()=>browser?.close());

async function pageFixture(t,file,{gate,master=false}={}) {
  const context=await browser.newContext({viewport:{width:1280,height:960},serviceWorkers:'block'});
  t.after(()=>context.close());
  const page=await context.newPage();page.setDefaultTimeout(5000);
  const errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.__haieduSupabaseClient={auth:{getSession:async()=>({data:{session:null}})}};});
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!=='https://forest.test'){remote.push(u.href);return route.abort();}
    const name=u.pathname;
    try {
      // Staff page tests exercise native layout and the real role shell, with
      // authorization outcomes simulated. They do not claim signed-in acceptance.
      const blocked=gate&&/\.m?js$/.test(name)&&!['/role-layout.js','/ux.js','/config.js'].includes(name);
      const body=blocked?'':await readFile(new URL('../../web'+name,import.meta.url));
      return route.fulfill({body,contentType:name.endsWith('.html')?'text/html':/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});
    }catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('https://forest.test/'+file);
  if(gate) {
    await page.evaluate(({gate,master})=>{
      document.getElementById(gate).classList.remove('hidden');
      if(master)document.getElementById('overviewPanel').classList.add('hidden');
      const button=document.getElementById('signOutBtn');
      if(button){button.classList.remove('hidden');window.__signouts=0;button.addEventListener('click',()=>window.__signouts++);}
    },{gate,master});
    await expect(page.locator('.hm-role-sidebar:not(.hm-role-sidebar-loading)')).toBeVisible();
  }
  return {page,errors,remote};
}
async function snapshot(page,name) {
  const dir=process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR;
  if(dir){await mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/forest-${name}.png`,fullPage:true});}
}
async function noPageOverflow(page,label) {
  const m=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,
    outside:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0&&!e.closest('.table-wrap,.hm-role-nav')).slice(0,8).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));
  assert.ok(m.scroll<=m.width+1,`${label}: ${JSON.stringify(m)}`);
}

const pages=[
  ['teacher.html','dashboardPanel'],['school-admin.html','overviewPanel'],['school-teacher.html','teacherDetailPanel'],
  ['admin.html','console'],['admin-security.html','securityConsole'],
  ...['content','content-review','content-bank','content-item','content-curriculum','content-evidence','content-materials','content-misconceptions'].map(n=>[n+'.html','console']),
  ['content-guides.html','guideConsole'],
];
for(const [file,gate] of pages)test(`Forest staff ${file}: role layout, compact account/logout, text enlargement and keyboard`,async t=>{
  const {page,errors,remote}=await pageFixture(t,file,{gate});
  await keyboardSkipAcceptance(page);
  for(const width of [1280,768,360]) {
    await page.setViewportSize({width,height:960});
    for(const scale of [100,200]) {
      await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',scale);
      await noPageOverflow(page,`${file}/${width}/${scale}`);
      const account=page.locator('.hm-role-foot a[href="./privacy.html"]');
      await expect(account).toBeVisible();await account.focus();
      assert.equal(await account.evaluate(e=>e===document.activeElement),true);
      assert.ok(await account.evaluate(e=>e.getBoundingClientRect().height>=44));
      const signout=page.locator('.hm-role-foot .hm-sidebar-signout');
      await expect(signout).toBeVisible();
      assert.ok(await signout.evaluate(e=>e.getBoundingClientRect().height>=44));
      assert.equal(await page.locator('body[data-haiedu-student]').count(),0);
      assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(245, 246, 239)');
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='100%');
    if(['teacher.html','school-admin.html','admin.html','content-review.html'].includes(file)&&width!==768)await snapshot(page,`${file.replace('.html','')}-${width}`);
  }
  await page.locator('.hm-role-foot .hm-sidebar-signout').click();
  assert.equal(await page.evaluate(()=>window.__signouts),1,'the shared logout delegates once to the existing authorized controller');
  await page.evaluate(gate=>{document.getElementById(gate).classList.add('hidden');document.getElementById('authPanel')?.classList.remove('hidden');document.getElementById('signedOut')?.classList.remove('hidden');},gate);
  await expect(page.locator('.hm-role-breadcrumb')).toHaveCount(0);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
});

test('school administration switches to master presentation without inheriting school navigation',async t=>{
  const {page,errors}=await pageFixture(t,'school-admin.html',{gate:'masterPanel',master:true});
  assert.equal(await page.locator('.hm-role-sidebar').getAttribute('data-workspace'),'Հարթակի ադմին');
  await expect(page.locator('.hm-role-nav a[href="./admin.html#accountsSection"]')).toBeVisible();
  assert.deepEqual(errors,[]);
});

test('real teacher Home → Classes → Review retains lazy requests, exact context and Forest controls',async t=>{
  const {page,errors}=await teacherFixture(browser,t);
  const nav=view=>page.locator(`.hm-role-nav a[href$="view=${view}"]`).click();
  assert.equal(await page.locator('.hm-role-nav [aria-current="page"]').count(),1,'an external library destination must not inherit the Home selection');
  await expect(page.locator('.hm-role-foot a[href="./teacher-workspace-preview.html"]')).toHaveCount(0);
  await expect(page.locator('.hm-role-nav a[href="./teacher.html?view=review"]')).toBeVisible();
  await nav('classes');
  const card=page.locator('#classList .teacher-class-button').first();
  assert.equal(await card.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)','class selection cards must not inherit the primary action fill');
  await card.click();
  await expect(page.locator('.hm-role-breadcrumb')).toContainText('Ընտրված դասարան');
  assert.equal(await page.evaluate(()=>window.__teacherFixture.calls.filter(c=>c.fn==='manage-written-work').length),0);
  await page.locator('#teacherOpenWrittenWork').click();
  await expect(page.locator('[data-writing-filter]')).toBeVisible();
  assert.equal(await page.evaluate(()=>window.__teacherFixture.calls.filter(c=>c.fn==='manage-written-work').length),1);
  await noPageOverflow(page,'real teacher review');await snapshot(page,'teacher-class-review-1280');
  await nav('classes');await nav('home');
  assert.equal(await page.locator('.hm-role-breadcrumb').count(),1);
  assert.deepEqual(errors,[]);
});

test('teacher preview Home → Classes → Review is interactive, local and resets after reload',async t=>{
  const {page,errors,remote}=await pageFixture(t,'teacher-workspace-preview.html');
  await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('#previewMain')).toBeFocused();
  await expect(page.locator('.preview-notice')).toContainText('հորինված տվյալներ');
  await snapshot(page,'preview-home-1280');
  await page.locator('[data-preview-view="classes"]').click();
  await expect(page.locator('[data-preview-view="classes"]')).toHaveAttribute('aria-current','page');
  await expect(page.locator('.preview-class-card')).toHaveCount(3);
  assert.deepEqual(await page.locator('[data-subject-art]').evaluateAll(es=>es.map(e=>e.dataset.subjectArt)),['english','physics','mathematics']);
  await page.locator('[data-preview-class="english"]').click();
  await expect(page.locator('[data-preview-item]')).toHaveCount(2);
  await snapshot(page,'preview-review-1280');
  await page.locator('#previewFeedback').fill('Հստակ օրինակ է։ Փորձեք ավելացնել հիմնավորում։');
  await page.locator('#previewFeedbackForm button').click();
  await expect(page.locator('[data-preview-item]')).toHaveCount(1);
  await expect(page.locator('#previewMessage')).toContainText('Ոչինչ չի ուղարկվել');
  await page.reload();await expect(page.locator('[data-preview-item]')).toHaveCount(2);
  await page.locator('[data-preview-view="classes"]').click();await page.locator('[data-preview-class="math"]').click();
  await expect(page.locator('.preview-response')).toContainText('Հերթը դատարկ է');
  for(const state of ['loading','empty','error','archived','ready']) {
    await page.locator('#previewScenario').selectOption(state);
    if(state==='loading')await expect(page.locator('#previewContent')).toHaveAttribute('aria-busy','true');
    if(state==='error'){await expect(page.locator('[role=alert]')).toBeVisible();await page.locator('[data-preview-retry]').click();assert.equal(await page.locator('#previewScenario').inputValue(),'ready');}
    if(state==='archived'){assert.equal(await page.locator('.preview-archive details').getAttribute('open'),null);await page.locator('.preview-archive summary').click();await expect(page.locator('.preview-class-card')).toHaveCount(2);}
    await noPageOverflow(page,'preview '+state);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  assert.equal(await page.evaluate(()=>localStorage.length),0);
});

test('teacher preview remains usable at 360/768/1280, 200% text and reduced motion in every state',async t=>{
  const {page,errors}=await pageFixture(t,'teacher-workspace-preview.html');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [360,768,1280])for(const scale of [100,200]) {
    await page.setViewportSize({width,height:960});await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',scale);
    for(const state of ['ready','empty','loading','error','archived']) {
      await page.locator('#previewScenario').selectOption(state);
      for(const view of ['home','classes','review']) {
        await page.locator(`[data-preview-view="${view}"]`).click();
        await expect(page.locator(`[data-preview-view="${view}"]`)).toHaveAttribute('aria-current','page');
        await noPageOverflow(page,`preview/${width}/${scale}/${state}/${view}`);
      }
    }
    if(scale===100&&width===360){await page.locator('#previewScenario').selectOption('ready');await snapshot(page,'preview-review-360');}
  }
  assert.deepEqual(errors,[]);
});
