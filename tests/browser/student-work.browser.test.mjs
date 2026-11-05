// My work: one status filter and one refresh across teacher tasks, writing
// assignments and material assignments. Synthetic fixture only; no production
// credentials, learners or writes.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {installStudentHomeFixture} from '../fixtures/student-home-fixture.mjs';
const origin='https://student-home.test';
let browser;
before(async()=>{browser=await chromium.launch({headless:true});});
after(async()=>{await browser?.close();});
async function work(t,{width=1280,...options}={}) {
  const context=await browser.newContext({viewport:{width,height:900}});t.after(()=>context.close());
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(`window.__client=(${installStudentHomeFixture.toString()})(${JSON.stringify(options)});`);
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/supabase-browser.bundle.mjs')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
    if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic";'});
    if(url.origin!==origin||url.pathname.includes('..'))return route.abort();
    try {
      const body=await readFile(new URL('../../web'+url.pathname,import.meta.url));
      return route.fulfill({body,contentType:url.pathname.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(url.pathname)?'text/javascript':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.ttf')?'font/ttf':'image/svg+xml'});
    } catch { return route.fulfill({status:404,body:'Not found'}); }
  });
  await page.goto(origin+'/index.html?view=work');
  await page.locator('.student-work-toolbar').waitFor();
  return {page,errors};
}
const inboxCalls=page=>page.evaluate(()=>Object.fromEntries(['manage-teacher-task-student-work','manage-writing-assignments','manage-resource-assignments'].map(name=>[name,window.__homeFixture.calls.filter(c=>c.name===name&&c.body.action==='inbox').length])));
const visibleStates=page=>page.locator('.student-work-sources [data-work-state]:visible').evaluateAll(cards=>cards.map(card=>card.dataset.workState));

for(const width of [375,1280]) test(`My work leads with one status filter and one refresh at ${width}px`,async t=>{
  const {page,errors}=await work(t,{width,workItems:true});
  assert.equal(await page.locator('#multiSubjectHome .student-home-welcome').count(),0,'No decorative banner on My work');
  const filters=page.locator('.student-work-filter [data-work-filter]');
  await expect(filters).toHaveText(['Կատարելու · 3','Վերադարձված · 2','Ներկայացված · 2']);
  assert.deepEqual(await filters.evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-pressed'))),['true','false','false']);
  assert.equal(await page.locator('[data-work-refresh]').count(),1);
  assert.equal(await page.locator('[data-task-refresh],[data-wa-refresh],.assignment-heading [data-assignment-refresh]').count(),0,'Per-source refresh buttons give way to the single refresh');
  const layout=await page.evaluate(()=>{
    const buttons=[...document.querySelectorAll('.student-work-toolbar button')].map(b=>b.getBoundingClientRect());
    return {minTarget:Math.min(...buttons.map(r=>Math.min(r.width,r.height))),overflow:document.documentElement.scrollWidth>innerWidth+1,
      toolbarBeforeSources:Boolean(document.querySelector('.student-work-toolbar').compareDocumentPosition(document.querySelector('.student-work-sources'))&Node.DOCUMENT_POSITION_FOLLOWING),
      splitWords:[...document.querySelectorAll('.student-work-filter button span:first-child')].filter(s=>s.getClientRects().length>1).length};
  });
  assert.ok(layout.minTarget>=44,`Toolbar targets stay at least 44px (${layout.minTarget})`);
  assert.equal(layout.overflow,false);assert.equal(layout.toolbarBeforeSources,true);assert.equal(layout.splitWords,0,'Filter labels never break inside a word');
  assert.deepEqual(errors,[]);
});

test('status filter shows one state across all sources and keeps cancelled history visible',async t=>{
  const {page,errors}=await work(t,{workItems:true});
  assert.deepEqual(await visibleStates(page),['todo','todo','todo']);
  await page.locator('[data-work-filter=returned]').click();
  assert.deepEqual(await visibleStates(page),['returned','returned']);
  await expect(page.locator('.student-work-sources h4:visible')).toHaveText(['Լաբորատոր աշխատանքի շտկում','Ստուգված շարադրություն']);
  await expect(page.locator('#studentResourceAssignments .student-work-none')).toHaveText('Այս վիճակով աշխատանք այստեղ չկա։');
  await page.locator('[data-work-filter=submitted]').click();
  assert.deepEqual(await visibleStates(page),['submitted','submitted']);
  assert.equal(await page.locator('[data-work-filter=submitted]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-task-history] summary').click();
  await expect(page.locator('[data-task-history] h4')).toHaveText('Չեղարկված առաջադրանք');
  assert.equal(await page.locator('[data-task-history] article').isVisible(),true,'Cancelled items are never hidden by the status filter');
  assert.deepEqual(errors,[]);
});

test('one refresh reloads every source once and keeps the chosen filter',async t=>{
  const {page,errors}=await work(t,{workItems:true});
  await expect(page.locator('[data-work-count=todo]')).toHaveText(' · 3');
  await page.locator('[data-work-filter=returned]').click();
  const first=await inboxCalls(page);
  await page.locator('[data-work-refresh]').click();
  await page.waitForFunction(previous=>Object.entries(previous).every(([name,count])=>window.__homeFixture.calls.filter(c=>c.name===name&&c.body.action==='inbox').length===count+1),first);
  await expect(page.locator('[data-work-count=returned]')).toHaveText(' · 2');
  assert.equal(await page.locator('[data-work-filter=returned]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(await visibleStates(page),['returned','returned']);
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.some(c=>/submit|save|start-learning-session/.test(c.body?.action??c.name))),false,'Refreshing never writes');
  assert.deepEqual(errors,[]);
});

test('counts mark unloaded pages and stay hidden while a source shows its history',async t=>{
  const {page,errors}=await work(t,{workItems:true,workMore:true});
  await expect(page.locator('[data-work-count=todo]')).toHaveText(' · 3+');
  await page.locator('[data-wa-history] summary').click();
  await page.waitForFunction(()=>window.__homeFixture.calls.some(c=>c.name==='manage-writing-assignments'&&c.body.payload?.state==='history'));
  await expect(page.locator('[data-work-count=todo]')).toHaveText('');
  await page.locator('[data-wa-history] summary').click();
  await expect(page.locator('[data-work-count=todo]')).toHaveText(' · 3+');
  assert.deepEqual(errors,[]);
});

test('an empty My work has no counts noise and still offers the single refresh',async t=>{
  const {page,errors}=await work(t,{width:375});
  await expect(page.locator('[data-work-count=todo]')).toHaveText(' · 0');
  assert.equal(await page.locator('.student-work-none').count(),0,'No filter note when a source has no items at all');
  assert.equal(await page.locator('[data-work-refresh]').isVisible(),true);
  assert.deepEqual(errors,[]);
});

test('compact phone header keeps the account button beside the page title',async t=>{
  const {page,errors}=await work(t,{width:375});
  const m=await page.evaluate(()=>{
    const bar=document.querySelector('main.shell > .topbar'),title=bar.querySelector('h1').getBoundingClientRect(),account=bar.querySelector('.student-account-link').getBoundingClientRect();
    return {height:Math.round(bar.getBoundingClientRect().height),beside:account.left>=title.right-1&&account.top<title.bottom,target:Math.min(account.width,account.height)};
  });
  assert.equal(m.beside,true,'Account button sits beside the title');
  assert.ok(m.height<=120,`Header stays compact (${m.height}px)`);
  assert.ok(m.target>=44);
  assert.deepEqual(errors,[]);
});
