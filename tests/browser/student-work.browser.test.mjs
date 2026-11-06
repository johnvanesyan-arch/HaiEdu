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

// Combined list (get-student-work). Without the endpoint the suites above cover the fallback sections.
const listTitles=page=>page.locator('[data-work-items] .student-work-item:visible h3').allInnerTexts();
for(const width of [375,1280])test(`My work shows one newest-first list with exact counts across sources at ${width}px`,async t=>{
  const {page,errors}=await work(t,{width,workItems:true,combinedWork:true});
  await page.locator('[data-work-items] .student-work-item').first().waitFor();
  assert.equal(await page.locator('.student-work-sources,#studentCustomTasks,#studentWritingAssignments,#studentResourceAssignments').count(),0,'No per-source sections in list mode');
  await expect(page.locator('.student-work-filter [data-work-filter]')).toHaveText(['Կատարելու · 4','Վերադարձված · 2','Ներկայացված · 2']);
  assert.deepEqual(await listTitles(page),['Ֆիզիկայի չափումներ','Նախագծի պլան','Գրավոր սևագիր','Լրացուցիչ վարժություններ'],'To-do items from all three sources, newest first');
  assert.deepEqual(await page.locator('[data-work-items] .student-work-item').evaluateAll(n=>n.map(e=>e.dataset.workSource)),['task','task','writing','material']);
  await page.locator('[data-work-filter=returned]').click();
  assert.deepEqual(await listTitles(page),['Լաբորատոր աշխատանքի շտկում','Ստուգված շարադրություն']);
  assert.equal(await page.locator('[data-work-items] [data-work-chip=returned]').first().evaluate(e=>getComputedStyle(e).color),'rgb(116, 83, 165)');
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('.student-work-toolbar button,.student-work-toolbar select,.student-work-item button')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect()).filter(r=>r.height<44).length}));
  assert.equal(layout.overflow,false);assert.equal(layout.small,0,'Controls keep 44px targets');
  assert.deepEqual(errors,[]);
});

test('course filter narrows the list and its counts; one refresh reloads the single endpoint',async t=>{
  const {page,errors}=await work(t,{workItems:true,combinedWork:true});
  const select=page.locator('[data-work-course-filter]');await expect(select).toBeVisible();
  await expect(select.locator('option')).toHaveText(['Բոլոր դասընթացները','Ֆիզիկա · 7Ա','Անգլերեն · 7Ա']);
  await select.selectOption({label:'Ֆիզիկա · 7Ա'});
  assert.deepEqual(await listTitles(page),['Ֆիզիկայի չափումներ']);
  await expect(page.locator('.student-work-filter [data-work-filter]')).toHaveText(['Կատարելու · 1','Վերադարձված · 0','Ներկայացված · 0']);
  const calls=()=>page.evaluate(()=>window.__homeFixture.calls.filter(c=>c.name==='get-student-work').length);
  const before=await calls();await page.locator('[data-work-refresh]').click();
  await expect.poll(calls).toBe(before+1);
  assert.notEqual(await select.inputValue(),'','The chosen course survives a refresh');
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.some(c=>['manage-teacher-task-student-work','manage-writing-assignments','manage-resource-assignments'].includes(c.name))),false,'List mode reads only the combined endpoint');
  assert.deepEqual(errors,[]);
});

test('a source that fails is named, counts are withheld and the rest of the list stays usable',async t=>{
  const {page,errors}=await work(t,{workItems:true,combinedWork:true,combinedWorkSourceFail:'writing'});
  await expect(page.locator('.student-work-unavailable')).toHaveText('Չհաջողվեց բեռնել՝ Գրավոր առաջադրանք։ Սեղմեք «Թարմացնել»։');
  await expect(page.locator('[data-work-count=todo]')).toHaveText('');
  assert.deepEqual(await listTitles(page),['Ֆիզիկայի չափումներ','Նախագծի պլան','Լրացուցիչ վարժություններ']);
  assert.deepEqual(errors,[]);
});

test('unloaded pages mark counts with + and history shows cancelled work without actions',async t=>{
  const {page,errors}=await work(t,{workItems:true,combinedWork:true,workMore:true});
  await expect(page.locator('[data-work-count=todo]')).toHaveText(' · 4+');
  await page.locator('[data-work-history] summary').click();
  await expect(page.locator('[data-work-history-items] h3')).toHaveText(['Չեղարկված առաջադրանք']);
  assert.equal(await page.locator('[data-work-history-items] [data-work-state]').count(),0,'Cancelled work is never counted or filtered');
  assert.deepEqual(errors,[]);
});

test('opening a writing assignment from the list uses its existing open request and lands on the pinned task',async t=>{
  const {page,errors}=await work(t,{width:375,workItems:true,combinedWork:true});
  await page.locator('[data-work-items] .student-work-item').filter({hasText:'Գրավոր սևագիր'}).getByRole('button',{name:'Շարունակել գրելը'}).click();
  await page.waitForURL(url=>new URL(url).searchParams.get('tab')==='writing');
  const url=new URL(page.url());assert.equal(url.searchParams.get('writingTask'),'76000000-0000-4000-8000-000000000620');assert.equal(url.searchParams.get('enrollment'),'76000000-0000-4000-8000-000000000006');
  assert.deepEqual(errors,[]);
});

test('without the combined endpoint My work falls back to the three source sections',async t=>{
  const {page,errors}=await work(t,{workItems:true,combinedWork:'unavailable'});
  await page.locator('.student-work-sources').waitFor();
  await expect(page.locator('.student-work-filter [data-work-filter]')).toHaveText(['Կատարելու · 3','Վերադարձված · 2','Ներկայացված · 2']);
  assert.equal(await page.locator('[data-work-items]').count(),0);
  assert.deepEqual(errors,[]);
});

test('list buttons keep the per-source selectors that production acceptance uses',async t=>{
  const {page,errors}=await work(t,{workItems:true,combinedWork:true});
  await page.locator('[data-work-items] .student-work-item').first().waitFor();
  await expect(page.locator('[data-assignment-open="76000000-0000-4000-8000-000000000630"]')).toBeVisible();
  await expect(page.locator('[data-wa-open="76000000-0000-4000-8000-000000000610"]')).toBeVisible();
  await expect(page.locator('[data-task-body] article').filter({hasText:'Նախագծի պլան'}).locator('[data-task-open]')).toBeVisible();
  assert.deepEqual(errors,[]);
});

// Production acceptance (writing delivery) reuses an approved task the QA learner already
// finished, so the new assignment arrives as «reviewed» and sits under its own state tab,
// not the default «To do». The acceptance must open that tab, in list and fallback mode.
for(const combinedWork of [true,false])test(`a reviewed writing assignment is found under its state tab (${combinedWork?'combined list':'fallback sections'})`,async t=>{
  const {workBucket}=await import('../../web/student-work-hub.mjs');
  const {page,errors}=await work(t,{workItems:true,combinedWork});
  const title=page.locator('h3,h4',{hasText:'Ստուգված շարադրություն'});
  await page.locator('[data-work-filter="todo"][aria-pressed="true"]').waitFor();
  await expect(title,'Not shown on the default «To do» tab').toBeHidden();
  // The acceptance step: choose the item's state tab, then find its writing button.
  await page.locator(`[data-work-filter="${workBucket('writing','reviewed')}"]`).click();
  await expect(page.locator('article',{has:title}).locator('[data-wa-open]')).toBeVisible();
  assert.deepEqual(errors,[]);
});
