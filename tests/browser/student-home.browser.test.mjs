import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
import {installStudentHomeFixture} from '../fixtures/student-home-fixture.mjs';
import {mobileUnitLink} from '../../scripts/mobile-qa-navigation.mjs';
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
    if(url.pathname==='/supabase-browser.bundle.mjs')return route.fulfill({contentType:'text/javascript',body:'export const createClient=()=>{window.__sdkConstructions=(window.__sdkConstructions||0)+1;return window.__client;};'});
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
test('Home modules share one SDK client and load no teacher bundle',async t=>{
  const {page,errors}=await fixture(t,{width:390,selected:true});
  await page.locator('.student-continue').waitFor();
  assert.equal(await page.evaluate(()=>window.__sdkConstructions),1);
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/supabase-browser.bundle.mjs').length),1);
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>new URL(e.name).hostname==='esm.sh'||new URL(e.name).pathname.includes('teacher-dependencies'))),false);
});

test('mobile acceptance selects the chapter link when primary course entry has the same destination',async t=>{
  const {page,errors}=await fixture(t,{width:390,view:'courses',active:false});
  const {card,link}=mobileUnitLink(page,id(8));
  await expect(card).toHaveCount(1);
  // Reproduce the original harness ambiguity on the real renderer.
  assert.equal(await card.locator(`a[href*="unit=${id(8)}"]`).count(),2);
  await card.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(link).toHaveCount(1);await expect(link).toBeVisible();
  await link.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#courseSubtitle')).toContainText('Անգլերեն');
  assert.equal(new URL(page.url()).searchParams.get('unit'),id(8));
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.some(c=>c.name==='start-learning-session')),false);
  assert.deepEqual(errors,[]);
});
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
  const details=page.locator('.student-unit-links').first();await details.locator('summary').press('Enter');await expect(details).toHaveAttribute('open','');
  assert.ok(await page.locator('[href*="materials"]').count()>=2);
  assert.equal(await page.locator('.amp-mobile-link[aria-label="Նյութերի գրադարան"]').innerText(),'Գրադարան');
  assert.deepEqual(errors,[]);
});
test('My work unit link opens writing while the independent custom-task inbox is still loading',async t=>{
  const {page,errors}=await fixture(t,{view:'work',selected:true,width:360,writingTasks:true,active:false,holdCustomInbox:true});
  await page.waitForFunction(()=>window.__homeFixture.calls.some(c=>c.name==='manage-teacher-task-student-work'&&c.body.action==='inbox'));
  const card=page.locator('.amp-subject-card').filter({hasText:'Անգլերեն'});await card.locator('.student-unit-links summary').click();
  await card.locator('.student-unit-links a[href*="unit='+id(8)+'"][href*="tab=writing"]').click();await page.locator('.written-list article').first().waitFor();
  assert.equal(new URL(page.url()).searchParams.get('tab'),'writing');assert.equal(await page.locator('.course-mode-card').count(),0);assert.deepEqual(errors,[]);
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
test('a subject without published writing stays in My work and explains its empty state',async t=>{
  const {page,errors}=await fixture(t,{view:'work',width:360,active:false});
  await page.locator('.amp-subject-card').filter({hasText:'Ֆիզիկա'}).getByRole('link',{name:'Բացել գրավոր աշխատանքները',exact:true}).click();
  await page.getByText('Այս գլխի համար գրավոր առաջադրանք դեռ չի հրապարակվել։',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('tab'),'writing');
  assert.equal(new URL(page.url()).searchParams.get('enrollment'),id(1));
  assert.match(await page.locator('.amp-mobile-nav a[aria-current="page"]').innerText(),/Իմ աշխատանքները/);
  assert.equal(await page.locator('.course-mode-card').count(),0);
  assert.equal(await page.locator('.written-list article').count(),0);
  await page.locator('#courseCollectionLink').click();await page.locator('.amp-subject-card').first().waitFor();
  const back=new URL(page.url());assert.equal(back.searchParams.get('view'),'work');assert.equal(back.searchParams.get('enrollment'),id(1));
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
 // Phones show the artwork beside the course text (7 November review C2), so it is smaller but still legible.
 assert.equal(new Set(art.map(a=>a.paths)).size,9);assert.ok(art.every(a=>a.width>=88&&a.height>=50&&a.hidden==='true'),JSON.stringify(art));
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
for(const width of [375,1280])test(`Home leads with the next learning step at ${width}px; course choice and the pilot note follow`,async t=>{
  const {page,errors}=await fixture(t,{width,selected:true});
  await page.locator('.student-continue').waitFor();
  const layout=await page.evaluate(()=>{
    const next=document.querySelector('#studentNextStep'),select=document.querySelector('#studentCourseSelect'),cards=document.querySelector('#mySubjects');
    const note=document.querySelector('.student-pilot-note'),panel=document.querySelector('#modePanel'),action=document.querySelector('.student-continue');
    const nav=[...document.querySelectorAll('.amp-mobile-nav')].find(el=>el.getClientRects().length&&getComputedStyle(el).position==='fixed');
    const after=(a,b)=>Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      nextBeforeSelect:after(next,select),selectBeforeCards:after(select,cards),noteAfterContent:after(panel,note),
      welcome:document.querySelectorAll('#multiSubjectHome .student-home-welcome').length,
      sectionTitle:next.closest('section')?.querySelector('h2')?.id,
      actionVisible:action.getBoundingClientRect().bottom<=innerHeight-(nav?nav.getBoundingClientRect().height:0),
      note:{bg:getComputedStyle(note).backgroundColor,fg:getComputedStyle(note).color},
    };
  });
  assert.deepEqual(layout,{nextBeforeSelect:true,selectBeforeCards:true,noteAfterContent:true,welcome:0,sectionTitle:'studentNextTitle',actionVisible:true,
    note:{bg:'rgb(238, 241, 235)',fg:'rgb(88, 105, 95)'}});
  assert.deepEqual(errors,[]);
});
test('Home without a selection points to the course lists below; Courses opens on the course list',async t=>{
  const {page,errors}=await fixture(t);
  await expect(page.locator('#studentNextStep')).toContainText('ստորև');
  assert.equal(await page.locator('#multiSubjectHome .student-home-welcome').count(),0);
  const courses=await fixture(t,{view:'courses'});
  await courses.page.locator('#mySubjects').waitFor();
  assert.equal(await courses.page.locator('#multiSubjectHome .student-home-welcome').count(),0,'No decorative banner (review C1)');
  assert.equal(await courses.page.locator('#multiSubjectHome > :first-child').getAttribute('id'),'mySubjects');
  assert.deepEqual([...errors,...courses.errors],[]);
});

// Home mockup step 1: greeting by the student's own display name and the unit path,
// both from requests Home already makes (role check; selected-unit dashboard).
test('Home greets the student and shows the selected unit path from the same requests',async t=>{
  const {page,errors}=await fixture(t,{width:390,selected:true,displayName:'Անի Պետրոսյան'});
  await expect(page.locator('.topbar h1')).toHaveText('Բարև, Անի Պետրոսյան');
  const path=page.locator('#studentPath .student-path');
  await expect(path.locator('li')).toHaveCount(3);
  await expect(path.locator('li strong')).toHaveText(['Ախտորոշիչ','Վարժանք','Յուրացման ստուգում']);
  assert.deepEqual(await path.locator('li').evaluateAll(l=>l.map(e=>e.dataset.pathState)),['done','current','locked']);
  await expect(path).toContainText('պատասխանված է 3 / 8');
  assert.equal(await path.textContent().then(t=>/12|75%/.test(t)),false,'No diagnostic score on Home');
  // Order: next step, then path, then the selectors; one dashboard read for both.
  assert.ok(await page.evaluate(()=>{const n=document.querySelector('.student-next-section'),p=document.querySelector('#studentPath'),s=document.querySelector('.student-selection');return n.compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING&&p.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING;}));
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.filter(c=>c.name==='get-student-dashboard'&&!c.body.navigation).length),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
});
test('Home path stays hidden without a selection and greets plainly without a name',async t=>{
  const {page,errors}=await fixture(t,{required:true});
  await expect(page.locator('.topbar h1')).toHaveText('Գլխավոր');
  await expect(page.locator('#studentPath')).toBeEmpty();
  await choose(page);
  await expect(page.locator('#studentPath li')).toHaveCount(3);
  assert.deepEqual(await page.locator('#studentPath li').evaluateAll(l=>l.map(e=>e.dataset.pathState)),['next','locked','locked']);
  assert.deepEqual(errors,[]);
});

// Home mockup step 2: compact course cards (readiness on the selected course only),
// a teacher-feedback card from the read-only combined list, and the desktop layout.
test('Home course cards are compact, keep their hooks and show readiness only for the selected course',async t=>{
  const {page,errors}=await fixture(t,{width:390,selected:true});
  const cards=page.locator('#mySubjects .amp-subject-card');
  await expect(page.locator('.student-course-compact.is-selected')).toHaveCount(1);
  assert.equal(await page.locator('#mySubjects .student-card-art').count(),0,'No large artwork on Home');
  const selected=page.locator('.student-course-compact.is-selected');
  await expect(selected.locator('.student-course-kicker')).toBeVisible();
  await expect(selected.locator('.student-course-readiness-line')).toContainText('2 / 5');
  assert.equal(await page.locator('.student-course-compact:not(.is-selected) .student-course-readiness-slot:not(:empty)').count(),0);
  // The production acceptance hooks remain: card, unit list behind the summary, unit links.
  const first=cards.first();await first.locator('summary').click();
  await expect(first.locator('.amp-subject-class-list a').first()).toBeVisible();
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.filter(c=>c.name==='get-student-dashboard'&&!c.body.navigation).length),1,'No dashboard read per course');
  // Courses view keeps its full cards.
  const courses=await fixture(t,{view:'courses'});
  assert.ok(await courses.page.locator('#mySubjects .student-card-art').count()>0);
  assert.deepEqual([...errors,...courses.errors],[]);
});
test('Home feedback card lists work returned for revision and opens My work on «Returned»',async t=>{
  const {page,errors}=await fixture(t,{width:390,workItems:true,combinedWork:true});
  const card=page.locator('#studentFeedback .student-feedback-card');
  await expect(card).toContainText('Ձեր աշխատանքը վերադարձվել է վերանայման');
  await expect(card).toContainText('Լաբորատոր աշխատանքի շտկում');
  assert.equal(await page.evaluate(()=>window.__homeFixture.calls.filter(c=>c.name==='get-student-work').length),1);
  assert.deepEqual(await page.evaluate(()=>window.__homeFixture.calls.find(c=>c.name==='get-student-work').body),{action:'inbox',payload:{state:'current'}});
  await card.locator('a').click();
  await page.locator('.student-work-toolbar').waitFor();
  await expect(page.locator('[data-work-filter="returned"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.student-work-item h3').first()).toHaveText('Լաբորատոր աշխատանքի շտկում');
  assert.deepEqual(errors,[]);
});
test('Home without returned work, or when the list fails, shows no feedback card',async t=>{
  for(const options of [{},{workItems:true,combinedWork:'unavailable'}]){
    const {page,errors}=await fixture(t,{width:390,...options});
    await expect.poll(()=>page.evaluate(()=>window.__homeFixture.calls.some(c=>c.name==='get-student-work'))).toBe(true);
    await page.waitForTimeout(200);
    await expect(page.locator('#studentFeedback')).toBeEmpty();
    assert.deepEqual(errors,[]);
  }
});
test('Home desktop places the path beside the next step and the feedback beside the courses',async t=>{
  const {page,errors}=await fixture(t,{width:1280,selected:true,workItems:true,combinedWork:true});
  await page.locator('#studentPath li').first().waitFor();await page.locator('.student-feedback-card').waitFor();
  const box=s=>page.locator(s).boundingBox();
  const [next,path,courses,feedback]=await Promise.all(['.student-next-section','#studentPath','#mySubjects','#studentFeedback'].map(box));
  assert.ok(path.x>next.x+next.width-1,'Path is right of the next step');
  assert.ok(feedback.x>courses.x+courses.width-1,'Feedback is right of the courses');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Phone keeps one column.
  await page.setViewportSize({width:390,height:900});
  const [n2,p2]=await Promise.all(['.student-next-section','#studentPath'].map(box));
  assert.ok(p2.y>=n2.y+n2.height-1,'Path below the next step on a phone');
  assert.deepEqual(errors,[]);
});


// Phase 2a (7 November review): the next step names the concrete step, stays an entry
// link (Home never starts an attempt, 16.5B.1), is the one hero card, and shows its
// context once; readiness appears in the path and the selected course card only.
test('Home next step names the concrete step and links without starting an attempt',async t=>{
  for (const [options,title,action] of [
    [{required:true},'Սկսեք ախտորոշիչից','Անցնել ախտորոշիչին'],
    [{active:false},'Շարունակեք վարժանքով','Անցնել վարժանքին'],
    [{active:false,lifecycle:'mastery_retry_1_ready'},'Կարող եք անցնել յուրացման ստուգմանը','Անցնել ստուգմանը'],
    [{},'Շարունակեք այնտեղից, որտեղ կանգ եք առել','Շարունակել'],
  ]) {
    const {page,errors}=await fixture(t,{width:390,selected:true,...options});
    const card=page.locator('#studentNextStep .student-next');
    await expect(card.locator('h3')).toHaveText(title);
    await expect(card.locator('.student-continue')).toHaveText(action);
    const href=new URL(await card.locator('.student-continue').getAttribute('href'),page.url());
    if (title!=='Շարունակեք այնտեղից, որտեղ կանգ եք առել') {
      assert.equal(href.searchParams.has('action'),false,title+': entry link only');
      assert.equal(href.searchParams.get('tab'),'assessment');
    }
    assert.equal(await card.locator('.student-context').evaluate(e=>e.innerText.includes('\n')),false,'One context line');
    assert.equal(await page.locator('.student-readiness-ring').count(),0,'No readiness ring (shown in the path)');
    assert.equal(await card.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(230, 240, 230)','Hero card');
    assert.deepEqual(errors,[]);
  }
});
test('Home dropdowns name the course and unit without repeating class, school or release',async t=>{
  const {page,errors}=await fixture(t,{width:390,selected:true});
  const courses=await page.locator('#studentCourseSelect option:not([value=""])').allTextContents();
  assert.ok(courses.every(label=>!label.includes('Փորձնական')),'No school in course options: '+courses.join(' | '));
  assert.equal(new Set(courses).size,courses.length,'Options stay distinguishable');
  const units=await page.locator('#studentUnitSelect option:not([value=""])').allTextContents();
  assert.ok(units.every(label=>!label.includes('Թողարկում')),'No release number when unit titles differ');
  assert.deepEqual(errors,[]);
});
test('Home and Courses put the join link after the course list; cards show the course illustration',async t=>{
  for (const view of ['','courses']) {
    const {page,errors}=await fixture(t,{width:390,view,selected:view===''});
    const list=page.locator('#mySubjects');await list.waitFor();
    assert.equal(await list.locator('.amp-subjects-heading a').count(),0,'No link inside the heading row');
    const hint=list.locator('.student-join-hint a');
    await expect(hint).toHaveAttribute('href','./join.html');
    assert.ok(await page.evaluate(()=>Boolean(document.querySelector('#mySubjects .amp-subject-grid').compareDocumentPosition(document.querySelector('.student-join-hint'))&Node.DOCUMENT_POSITION_FOLLOWING)));
    if (view==='') assert.ok(await page.locator('.student-course-compact .student-course-mark svg').count()>0);
    else {
      const card=page.locator('#mySubjects .amp-subject-card').first();
      const [art,title]=await Promise.all([card.locator('.student-card-art').boundingBox(),card.locator('h3').boundingBox()]);
      assert.ok(title.x>art.x+art.width-1,'Artwork beside the title on a phone');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    assert.deepEqual(errors,[]);
  }
});
