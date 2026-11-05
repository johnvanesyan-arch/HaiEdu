// Course page focus: three primary sections, current work first, no decorative
// banner on the course tab and phone skill cards. Synthetic fixture only; no
// production credentials, learners or writes.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {installStudentHomeFixture} from '../fixtures/student-home-fixture.mjs';
const origin='https://student-home.test';
const id=n=>`76000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let browser;
before(async()=>{browser=await chromium.launch({headless:true});});
after(async()=>{await browser?.close();});
async function course(t,{width=1280,height=900,tab='',unit=8,...options}={}) {
  const context=await browser.newContext({viewport:{width,height}});t.after(()=>context.close());
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
  const params=new URLSearchParams({enrollment:id(6),release:id(7),unit:id(unit)});
  if(tab)params.set('tab',tab);
  await page.goto(origin+'/course.html?'+params);
  await page.waitForFunction(()=>document.querySelector('#courseContent .course-tabs')&&document.getElementById('courseLoading').classList.contains('hidden'));
  await page.evaluate(()=>document.fonts.ready);
  return {page,errors};
}
const noLearningWrites=page=>page.evaluate(()=>window.__homeFixture.calls.some(c=>['start-learning-session','submit-answer'].includes(c.name)));

for(const width of [375,1280]) test(`course tab leads with current work under three primary sections at ${width}px`,async t=>{
  const {page,errors}=await course(t,{width});
  const primary=page.locator('.course-tabs-primary a'),secondary=page.locator('.course-tabs-secondary a');
  await expect(primary).toHaveText(['Գնահատումներ','Դասընթաց','Առաջընթաց']);
  await expect(secondary).toHaveText(['Ուղեցույցներ','Գրավոր աշխատանքներ','Նյութերի գրադարան']);
  assert.equal(await page.locator('.course-tabs a[aria-current=page]').innerText(),'Դասընթաց');
  const hrefs=await secondary.evaluateAll(links=>links.map(a=>new URL(a.href)));
  assert.equal(hrefs[0].searchParams.get('tab'),'guides');assert.equal(hrefs[1].searchParams.get('tab'),'writing');
  for(const url of hrefs.slice(0,2))assert.equal(url.searchParams.get('unit'),id(8));
  assert.equal(await page.locator('.student-course-hero').count(),0,'The course tab has no decorative banner');
  const layout=await page.evaluate(()=>{
    const nav=document.querySelector('#courseContent .course-tabs'),resume=document.querySelector('.course-active-session'),overview=document.querySelector('.course-overview');
    const tops=[...document.querySelectorAll('.course-tabs-primary a')].map(a=>Math.round(a.getBoundingClientRect().top));
    const targets=[...document.querySelectorAll('.course-tabs a')].map(a=>a.getBoundingClientRect()).map(r=>Math.min(r.width,r.height));
    return {resumeFollowsNav:nav.nextElementSibling===resume,resumeBeforeOverview:Boolean(resume.compareDocumentPosition(overview)&Node.DOCUMENT_POSITION_FOLLOWING),
      oneRow:new Set(tops).size===1,minTarget:Math.min(...targets),clipped:[...document.querySelectorAll('.course-tabs a')].filter(a=>a.scrollWidth>a.clientWidth+1).length,
      bar:document.querySelector('.course-session-bar')?.getAttribute('aria-hidden'),barWidth:document.querySelector('.course-session-bar > span')?.style.width,
      overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(layout.resumeFollowsNav,true,'Current work comes directly after the section navigation');
  assert.equal(layout.resumeBeforeOverview,true);
  assert.equal(layout.oneRow,true,'Three primary sections share one row');
  assert.ok(layout.minTarget>=44,`Section links keep 44px targets (${layout.minTarget})`);
  assert.equal(layout.clipped,0);
  assert.equal(layout.bar,'true');assert.equal(layout.barWidth,'38%');
  assert.equal(layout.overflow,false);
  const resume=page.locator('.course-active-session a.course-resume');
  await expect(resume).toHaveText('Շարունակել · Վարժանք');
  assert.match(await resume.getAttribute('href'),/action=practice/);
  await expect(page.locator('.course-data-section .student-course-readiness strong')).toHaveText('2 / 5');
  assert.equal(await noLearningWrites(page),false);
  assert.deepEqual(errors,[]);
});

test('phone skills render as accessible cards while desktop keeps the table',async t=>{
  const {page,errors}=await course(t,{width:375,active:false});
  assert.equal(await page.locator('.course-table').getAttribute('role'),'table');
  const skillRows=await page.locator('.course-table tbody tr').count();assert.ok(skillRows>0);
  assert.equal(await page.locator('.course-table').getByRole('row').count(),skillRows+1,'Header and skill rows keep their table-row role in the card layout');
  const phone=await page.evaluate(()=>{
    const row=document.querySelector('.course-table tbody tr'),head=document.querySelector('.course-table thead').getBoundingClientRect(),cells=[...row.children];
    return {display:getComputedStyle(row).display,radius:parseFloat(getComputedStyle(row).borderTopLeftRadius),headWidth:head.width,
      badge:cells[2].getBoundingClientRect(),action:cells[3].getBoundingClientRect(),name:cells[0].getBoundingClientRect(),
      overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(phone.display,'grid');assert.ok(phone.radius>=12);assert.ok(phone.headWidth<=1,'Column headings stay available to assistive technology only');
  const middle=r=>r.top+r.height/2;
  assert.ok(Math.abs(middle(phone.badge)-middle(phone.action))<=2,'Readiness and practice action share one line');
  assert.ok(phone.action.left>phone.badge.right,'The practice action sits beside the readiness badge');
  assert.ok(phone.name.bottom<=phone.badge.top);
  assert.equal(phone.overflow,false);
  await expect(page.locator('.course-table tbody tr').first().getByRole('link',{name:'Վարժանք',exact:true})).toBeVisible();
  await page.setViewportSize({width:1280,height:900});
  assert.equal(await page.locator('.course-table tbody tr').first().evaluate(row=>getComputedStyle(row).display),'table-row');
  await expect(page.locator('.course-table thead')).toBeVisible();
  assert.deepEqual(errors,[]);
});

test('other tabs keep their heading banner and secondary sections show the current page',async t=>{
  const progress=await course(t,{width:375,tab:'progress'});
  await expect(progress.page.locator('.student-course-hero')).toBeVisible();
  await expect(progress.page.locator('.student-course-hero .student-course-readiness strong')).toHaveText('2 / 5');
  assert.equal(await progress.page.locator('.course-tabs a[aria-current=page]').innerText(),'Առաջընթաց');
  const guides=await course(t,{width:375,tab:'guides'});
  await expect(guides.page.locator('.student-course-hero')).toBeVisible();
  assert.equal(await guides.page.locator('.course-tabs-secondary a[aria-current=page]').innerText(),'Ուղեցույցներ');
  assert.equal(await guides.page.locator('.course-tabs-primary a[aria-current=page]').count(),0);
  await expect(guides.page.locator('.course-tabs-primary a')).toHaveCount(3);
  assert.deepEqual([...progress.errors,...guides.errors],[]);
});

test('a many-chapter course keeps the selected chapter visible in one phone row',async t=>{
  const titles=['Նյութի կառուցվածքը','Մեխանիկական շարժում','Մարմինների փոխազդեցությունը','Աշխատանք և հզորություն','Ես աշխարհում․ իմ բնավորությունն ու հագուստի ոճը','Ճնշում։ Ճնշումն առօրյա կյանքում և տեխնիկայում'];
  const contexts=titles.map((unitTitleHy,n)=>({enrollmentId:id(6),curriculumReleaseId:id(7),unitId:n===4?id(8):id(500+n),subjectProgramId:id(9),unitSequence:n+1,subjectCode:'english',subjectNameHy:'Անգլերեն',gradeLabelHy:'7-րդ դասարան',gradeNumber:7,unitTitleHy,className:'7Ա',schoolName:'Փորձնական դպրոց Ա',academicYearLabel:'2026–2027',releaseNumber:1}));
  const {page,errors}=await course(t,{width:375,contexts});
  const chapters=page.locator('.course-chapters a');
  await expect(chapters).toHaveText(titles);
  const row=await page.evaluate(()=>{
    const nav=document.querySelector('.course-chapters'),box=nav.getBoundingClientRect(),current=nav.querySelector('[aria-current=page]').getBoundingClientRect();
    return {tops:new Set([...nav.querySelectorAll('a')].map(a=>Math.round(a.getBoundingClientRect().top))).size,scrolls:nav.scrollWidth>nav.clientWidth,
      visible:current.left>=box.left-1&&current.right<=box.right+1,pageScrollY:scrollY,overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(row.tops,1,'Chapters share one row on phones');
  assert.equal(row.scrolls,true);
  assert.equal(row.visible,true,'The selected chapter is scrolled into view horizontally');
  assert.equal(row.pageScrollY,0,'Revealing the chapter never scrolls the page vertically');
  assert.equal(row.overflow,false);
  await Promise.all([page.waitForURL(url=>new URL(url).searchParams.get('unit')===id(501)),chapters.nth(1).click()]);
  await page.waitForFunction(()=>document.querySelector('.course-chapters')&&document.getElementById('courseLoading').classList.contains('hidden'));
  await expect(page.locator('.course-chapters a[aria-current=page]')).toHaveText(titles[1]);
  assert.equal(await noLearningWrites(page),false);
  assert.deepEqual(errors,[]);
});
