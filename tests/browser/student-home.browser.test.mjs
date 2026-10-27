import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {installStudentHomeFixture} from '../fixtures/student-home-fixture.mjs';
const origin='https://student-home.test';
const id=n=>`76000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let browser;
before(async()=>{browser=await chromium.launch({headless:true});});
after(async()=>{await browser?.close();});
async function fixture(t,{width=1280,view='',selected=false,...options}={}) {
  const context=await browser.newContext({viewport:{width,height:960}});t.after(()=>context.close());
  const page=await context.newPage(),errors=[]; page.setDefaultTimeout(8000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(`window.__client=(${installStudentHomeFixture.toString()})(${JSON.stringify(options)});`);
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin==='https://esm.sh')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>window.__client;'});
    if(url.pathname==='/config.js')return route.fulfill({contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic";'});
    if(url.origin!==origin || url.pathname.includes('..'))return route.abort();
    try {
      const body=await readFile(new URL('../../web'+url.pathname,import.meta.url));
      return route.fulfill({body,contentType:url.pathname.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(url.pathname)?'text/javascript':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.ttf')?'font/ttf':'image/svg+xml'});
    } catch { return route.fulfill({status:404,body:'Not found'}); }
  });
  const params=new URLSearchParams(view?{view}:{});
  if(selected)for(const[k,v]of Object.entries({enrollment:id(6),release:id(7),unit:id(8)}))params.set(k,v);
  await page.goto(origin+'/index.html?'+params);
  if(options.signedOut)await page.locator('#publicEntry:not(.hidden)').waitFor();
  else await page.waitForFunction(()=>document.querySelector('#studentCourseSelect, [data-retry-access], .amp-subject-card') || document.querySelector('#multiSubjectHome')?.textContent.includes('Հասանելի դասընթացներ դեռ չկան'));
  await page.evaluate(()=>document.fonts.ready);
  return {page,errors};
}
async function choose(page,course=6,program=9,unit=8,release=7) {
  await page.locator('#studentCourseSelect').selectOption(id(course)+':'+id(program));
  await page.locator('#studentUnitSelect').selectOption(id(course)+':'+id(release)+':'+id(unit));
}
for(const width of [320,360,768,1280])test(`Forest Home is readable and contained at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{width,selected:true});
  await page.locator('.student-continue').waitFor();
  const metrics=await page.evaluate(()=>({
    width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    canvas:getComputedStyle(document.body).backgroundColor,
    font:document.fonts.check('16px "Noto Sans Armenian"','Հայերեն English'),
    clipped:[...document.querySelectorAll('button,a.button-link,.amp-mobile-link,.amp-nav-link')].filter(el=>el.getClientRects().length && el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim()),
    smallTargets:[...document.querySelectorAll('button,a.student-continue,select,.amp-mobile-link')].filter(el=>el.getClientRects().length && !el.disabled && el.getBoundingClientRect().height<44).map(el=>el.textContent.trim()),
  }));
  assert.ok(metrics.scrollWidth<=width+1,JSON.stringify(metrics));assert.deepEqual(metrics.clipped,[]);assert.deepEqual(metrics.smallTargets,[]);
  assert.equal(metrics.canvas,'rgb(245, 246, 239)');assert.equal(metrics.font,true);
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){const dir=path.resolve(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR);await mkdir(dir,{recursive:true});await page.screenshot({path:path.join(dir,'forest-home-'+width+'.png'),fullPage:true});await writeFile(path.join(dir,'forest-home-'+width+'.json'),JSON.stringify(metrics,null,2));}
  assert.deepEqual(errors,[]);
});
test('Home never chooses a default subject or starts a session; selection preserves release and active target',async t=>{
  const {page,errors}=await fixture(t);
  assert.equal(await page.locator('#studentCourseSelect').inputValue(),'');
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.filter(c=>c.name==='get-student-dashboard'&&!c.body.navigation).length),0);
  await choose(page);await page.locator('.student-continue').waitFor();
  const href=await page.locator('.student-continue').getAttribute('href');
  assert.match(href,new RegExp('release='+id(7)));assert.match(href,new RegExp('skill='+id(70)));
  await choose(page,1,4,5,20);await page.locator('.student-continue').waitFor();
  assert.match(await page.locator('.student-continue').getAttribute('href'),new RegExp('release='+id(20)));
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.some(c=>c.name==='start-learning-session')),false);
  assert.deepEqual(errors,[]);
});
test('late unit responses and revoked access cannot restore old Home actions',async t=>{
  const {page,errors}=await fixture(t,{held:true});
  await choose(page);await page.waitForFunction(()=>window.__homeFixture.pending.length>0);
  await choose(page,1,4,5,20);await page.waitForFunction(()=>window.__homeFixture.pending.length>1);
  await page.evaluate(()=>window.__homeFixture.release());await page.locator('.student-continue').waitFor();
  assert.match(await page.locator('.student-continue').getAttribute('href'),new RegExp('release='+id(20)));
  await page.evaluate(()=>{window.__homeFixture.hold();});await choose(page);
  await page.waitForFunction(()=>window.__homeFixture.pending.length>0);
  await page.evaluate(()=>window.__homeFixture.revoke());await page.getByText('Ձեր ուսուցումը սկսվում է այստեղ',{exact:true}).waitFor();
  await page.evaluate(()=>window.__homeFixture.release());assert.equal(await page.locator('.student-continue').count(),0);
  assert.deepEqual(errors,[]);
});
test('same-account refresh keeps selection and focus; account switch rejects prior pending work',async t=>{
  const {page,errors}=await fixture(t,{selected:true});
  await page.locator('.student-continue').waitFor();await page.locator('#studentUnitSelect').focus();
  const value=await page.locator('#studentUnitSelect').inputValue();
  await page.evaluate(()=>window.__homeFixture.refresh());
  await page.waitForFunction(()=>document.querySelector('.student-continue'));
  assert.equal(await page.locator('#studentUnitSelect').inputValue(),value);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'studentUnitSelect');
  await page.evaluate(()=>window.__homeFixture.hold());await choose(page,1,4,5,20);
  await page.waitForFunction(()=>window.__homeFixture.pending.length>0);
  await page.evaluate(()=>window.__homeFixture.switchAccount());
  await page.waitForFunction(()=>document.querySelectorAll('.amp-subject-card').length===1);
  await page.evaluate(()=>window.__homeFixture.release());
  assert.equal(await page.locator('.student-continue').count(),0);
  assert.match(await page.locator('.amp-subject-card').innerText(),/8-րդ դասարան/);
  assert.deepEqual(errors,[]);
});
test('course and work views retain context, keyboard disclosures and course-only progress',async t=>{
  const {page,errors}=await fixture(t,{view:'work',selected:true,width:360});
  assert.equal(await page.locator('.amp-mobile-link').count(),4);
  assert.equal(await page.locator('.amp-mobile-nav').getByText('Առաջընթաց',{exact:true}).count(),0);
  assert.equal(await page.locator('.amp-mobile-nav').getByText('Իմ աշխատանքները',{exact:true}).count(),1);
  for(const link of await page.locator('.amp-subject-card > a').all())assert.match(await link.getAttribute('href'),/tab=writing/);
  const details=page.locator('.student-unit-links').first();await details.locator('summary').press('Enter');assert.equal(await details.getAttribute('open'),'');
  assert.ok(await page.locator('[href*="materials"]').count()>=2);
  assert.equal(await page.locator('.amp-mobile-link[aria-label="Հավելյալ նյութեր"]').innerText(),'Նյութեր');
  assert.deepEqual(errors,[]);
});
for(const width of [360,1280])test(`My work owns the complete writing journey at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{view:'work',selected:true,width,writingTasks:true,active:false});
  const nav=width===360?'.amp-mobile-nav':'.amp-side-nav';
  await page.locator('.amp-subject-card').filter({hasText:'Անգլերեն'}).getByRole('link',{name:'Բացել գրավոր աշխատանքները',exact:true}).click();
  await page.locator('.written-list article').first().waitFor();
  const assertWork=async()=>{
    assert.equal(new URL(page.url()).searchParams.get('tab'),'writing');
    assert.match(await page.locator(nav+' a[aria-current="page"]').innerText(),/Իմ աշխատանքները/);
    assert.equal(await page.locator('#courseCollectionLabel').innerText(),'ԻՄ ԱՇԽԱՏԱՆՔՆԵՐԸ');
    assert.equal(await page.locator('.written-list article').count(),3);
    assert.match(await page.locator('.written-list').innerText(),/Սևագիր/);
    assert.match(await page.locator('.written-list').innerText(),/Սպասում է ստուգման/);
    assert.match(await page.locator('.written-list').innerText(),/Ստուգված է/);
    assert.equal(await page.locator('.course-mode-card').count(),0);
    const back=new URL(await page.locator('#courseCollectionLink').getAttribute('href'),origin);
    const here=new URL(page.url());
    assert.equal(back.searchParams.get('view'),'work');
    for(const key of ['enrollment','release','unit'])assert.equal(back.searchParams.get(key),here.searchParams.get(key));
    assert.equal(await page.evaluate(()=>window.__homeFixture.calls.some(c=>c.name==='start-learning-session'||c.name==='manage-written-work'&&c.body.action!=='tasks')),false);
  };
  await assertWork();
  await page.locator('.course-chapters a').filter({hasText:'Երաժշտությունը մեր կյանքում'}).click();
  await page.locator('.written-list article').first().waitFor();
  assert.equal(new URL(page.url()).searchParams.get('unit'),id(10));
  await assertWork();
  await page.reload();await page.locator('.written-list article').first().waitFor();await assertWork();
  await page.locator('#courseCollectionLink').click();await page.locator('.amp-subject-card').first().waitFor();
  assert.equal(new URL(page.url()).searchParams.get('view'),'work');
  assert.equal(new URL(page.url()).searchParams.get('unit'),id(10));
  await page.locator(nav).getByRole('link',{name:'Դասընթացներ',exact:true}).click();
  await page.locator('.amp-subject-card').filter({hasText:'Անգլերեն'}).getByRole('link',{name:'Բացել դասընթացը',exact:true}).click();
  await page.locator('.course-mode-card').first().waitFor();
  assert.match(await page.locator(nav+' a[aria-current="page"]').innerText(),/Դասընթացներ/);
  assert.equal(await page.locator('.written-work').count(),0);
  await page.locator('.course-tabs').getByRole('link',{name:'Գրավոր աշխատանքներ',exact:true}).click();
  await page.locator('.written-list article').first().waitFor();await assertWork();
  await page.evaluate(()=>window.__homeFixture.switchAccount());
  await page.waitForFunction(()=>document.getElementById('courseContent').textContent.includes('Ընտրված դասընթացն այս պահին հասանելի չէ'));
  assert.equal(await page.locator('.written-work').count(),0);
  assert.equal(await page.locator('#courseCollectionLink').getAttribute('href'),'./index.html?view=work');
  assert.deepEqual(errors,[]);
});
test('empty, failed and recovered course access are distinct; signed-out Home stays public',async t=>{
  const empty=await fixture(t,{empty:true});assert.match(await empty.page.locator('#multiSubjectHome').innerText(),/Հասանելի դասընթացներ դեռ չկան/);
  const failed=await fixture(t,{error:true});await failed.page.locator('[data-retry-access]').waitFor();
  await failed.page.evaluate(()=>window.__homeFixture.recover());await failed.page.locator('#studentCourseSelect').waitFor();
  const signedOut=await fixture(t,{signedOut:true});assert.equal(await signedOut.page.locator('.amp-side-nav').isVisible(),false);
  assert.deepEqual([...empty.errors,...failed.errors,...signedOut.errors],[]);
});
test('both Home logout entries share one request and clear prior navigation',async t=>{
  const {page,errors}=await fixture(t,{selected:true});await page.locator('.student-continue').waitFor();
  await page.evaluate(()=>{document.querySelector('[data-student-signout]').click();document.getElementById('signOutBtn').click();});
  await page.locator('#publicEntry:not(.hidden)').waitFor();
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.filter(c=>c.name==='signOut').length),1);
  assert.equal(await page.locator('.student-continue').count(),0);
  assert.equal(await page.locator('.amp-nav-list a[href*="enrollment="]').count(),0);
  assert.deepEqual(errors,[]);
});

test('a late signout response cannot erase a newer login',async t=>{
  const {page,errors}=await fixture(t,{selected:true,signOutHeld:true});
  await page.locator('.student-continue').waitFor();
  await page.locator('[data-student-signout]').click();
  await page.waitForFunction(()=>window.__homeFixture.pending.length===1);
  await page.evaluate(()=>window.__homeFixture.switchAccount());
  await page.waitForFunction(()=>document.querySelectorAll('.amp-subject-card').length===1);
  await page.evaluate(()=>window.__homeFixture.release());
  await page.waitForFunction(()=>!document.getElementById('signOutBtn').disabled);
  assert.match(await page.locator('.amp-subject-card').innerText(),/8-րդ դասարան/);
  assert.equal(await page.locator('#publicEntry').isVisible(),false);
  assert.deepEqual(errors,[]);
});

test('Home supports reduced motion, keyboard skip and larger text',async t=>{
  const {page,errors}=await fixture(t,{selected:true});
  await page.locator('.student-continue').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addStyleTag({content:'html {font-size:200%!important;}'});
  await page.locator('.skip-link').focus();
  await page.locator('.skip-link').press('Enter');
  const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,focus:document.activeElement.id,transition:getComputedStyle(document.querySelector('.student-continue')).transitionDuration}));
  assert.ok(metrics.scrollWidth<=metrics.width+1);assert.equal(metrics.focus,'mainContent');
  assert.equal(metrics.transition,'0s');assert.deepEqual(errors,[]);
});

for(const view of ['courses','work'])test(`all eight subject illustrations and unknown fallback render in ${view}`,async t=>{
 const {page,errors}=await fixture(t,{view,allSubjects:true,width:360});
 const art=await page.locator('.student-card-art svg').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.subjectArt,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,hidden:n.getAttribute('aria-hidden'),paths:n.innerHTML})));
 assert.equal(art.length,9);assert.deepEqual(art.map(a=>a.key).sort(),['english','physics','mathematics','armenian','chemistry','geography','biology','history','generic'].sort());
 assert.equal(new Set(art.map(a=>a.paths)).size,9);assert.ok(art.every(a=>a.width>=150&&a.height>=90&&a.hidden==='true'),JSON.stringify(art));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
});
for(const width of [320,768,1280])test(`public landing uses Forest at ${width}px with unchanged access routes`,async t=>{
 const {page,errors}=await fixture(t,{signedOut:true,width});
 const colors=await page.evaluate(()=>({canvas:getComputedStyle(document.querySelector('#publicEntry')).backgroundColor,ink:getComputedStyle(document.querySelector('#publicEntry')).color,button:getComputedStyle(document.querySelector('.public-button')).backgroundColor,title:getComputedStyle(document.querySelector('#publicTitle')).color,overflow:document.documentElement.scrollWidth>innerWidth+1}));
 assert.deepEqual(colors,{canvas:'rgb(245, 246, 239)',ink:'rgb(35, 57, 47)',button:'rgb(40, 91, 69)',title:'rgb(35, 57, 47)',overflow:false});
 assert.ok(await page.locator('.public-entry a[href="./account-access"]').count()>=4);
 assert.equal(await page.locator('.public-entry a[href="./account-access?view=register"]').count(),2);
 assert.deepEqual(errors,[]);
});
