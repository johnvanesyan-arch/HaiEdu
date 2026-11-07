import {wordBreaks} from '../fixtures/word-boundaries.mjs';
import {checkNavigation} from '../fixtures/navigation-readability.mjs';
import {mobileNavigationLayout} from '../../scripts/mobile-navigation-layout.mjs';
import {historyEntries,historyReadability} from '../fixtures/assessment-history.mjs';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

// Real student HTML, shell, modules and styles. Only auth/Edge responses are
// synthetic; no production identity, content, credentials or evidence is used.
const origin = 'https://student-workspace.test';
const id = n => `74000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const contexts = [
  { enrollmentId:id(1), curriculumReleaseId:id(2), unitId:id(3), subjectProgramId:id(4), unitSequence:1, subjectNameHy:'Ֆիզիկա', gradeLabelHy:'7-րդ դասարան', gradeNumber:7, unitTitleHy:'Բնության ուսումնասիրության ֆիզիկական մեթոդները', className:'Փորձնական դասարան 7Ա', schoolName:'Փորձնական դպրոց', academicYearLabel:'2026–2027', releaseNumber:1, extensionKey:'legacy-physics7-u01-v1' },
  { enrollmentId:id(5), curriculumReleaseId:id(6), unitId:id(7), subjectProgramId:id(8), unitSequence:2, subjectNameHy:'Մաթեմատիկա', gradeLabelHy:'8-րդ դասարան', gradeNumber:8, unitTitleHy:'Կիրառական խնդիրների լուծում', className:'Փորձնական դասարան 8Բ', schoolName:'Մեկ այլ դպրոց', academicYearLabel:'2026–2027', releaseNumber:2 }
];
let browser;
before(async () => { browser = await chromium.launch({ headless:true }); });
after(async () => { await browser?.close(); });

for(const kind of ['legacy','points'])for(const width of [390,768,1280])test(`Mastery ${kind} requirements use readable names once at ${width}px with enlarged text`,async t=>{
 const {page,errors}=await fixture(t,{width,active:false,contextIndex:1,configuredRules:kind});
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');
 const rule=page.locator('.assessment-skill-rules');await expect(rule).toHaveCount(1);
 assert.equal(await rule.getAttribute('open'),null);
 await rule.locator('summary').focus();await page.keyboard.press('Enter');
 await expect(rule.locator('li')).toHaveText('Կիրառական խնդիրների լուծում և արդյունքների համեմատություն՝ 2');await expect(rule.locator('li')).toBeVisible();
 const text=await page.locator('#courseContent').innerText();assert.doesNotMatch(text.split('Հմտություններ')[0],/MATH8|minimumCorrectBySkill/);
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:[...document.querySelectorAll('.assessment-skill-rules li,.assessment-skill-rules summary')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)}));
 assert.equal(metrics.overflow,false,JSON.stringify(metrics));assert.deepEqual(metrics.clipped,[]);
 await capture(page,'readable-mastery-requirements-'+kind+'-'+width,metrics);assert.deepEqual(await wordBreaks(page,'.course-mode-card .student-rule-details'),[]);assert.deepEqual(errors,[]);
});

for(const width of [390,768,1280])test(`focused Mastery player retains full words and thresholds at ${width}px/200%`,async t=>{
 const {page,errors}=await fixture(t,{width,active:false,player:true,contextIndex:1,configuredRules:'points'});
 await page.locator('#learningPlayer form').waitFor();
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');
 const rule=page.locator('#learningPlayer .assessment-skill-rules');
 await rule.locator('summary').focus();await page.keyboard.press('Enter');
 await expect(rule.locator('li')).toHaveText('Կիրառական խնդիրների լուծում և արդյունքների համեմատություն՝ 2');await expect(rule.locator('li')).toBeVisible();
 assert.equal(await page.locator('#learningPlayer .student-rule-details').getAttribute('open'),'');
 const metrics={words:await wordBreaks(page,'#learningPlayer .student-rule-details'),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)};
 await capture(page,'readable-mastery-player-points-'+width,metrics);
 assert.deepEqual(metrics.words,[]);assert.equal(metrics.overflow,false);assert.deepEqual(errors,[]);
});

async function fixture(t, { width=1280, active=true, player=false, contextIndex=0, denied=false, route='course.html', tab='assessment', locked=false, manySkills=false, reportingHistory=null, configuredRules=false, availableContexts=contexts, submitResult=null }={}) {
  const context=await browser.newContext({ viewport:{ width, height:900 } });
  t.after(() => context.close());
  const page=await context.newPage(), errors=[];
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ contexts, active, denied, studentId, selected, locked, manySkills, reportingHistory, configuredRules, submitResult }) => {
    window.__calls=[]; window.__listeners=[]; window.__authorizedContexts=contexts;
    const dashboard=()=>({ dashboardVersion:'v1', practiceAccess:{ unlocked:!locked }, baseline:locked?null:{ correct:16, answered:20, percent:80 },
      latestDiagnostic:locked?null:{correct:16,answered:20,percent:80,completedAt:'2026-10-01T19:47:56.15+00:00'},
      progress:{completedSkills:3,totalSkills:10,percent:30},
      activeSession:active ? { id:'active-fixture', mode:'practice', answered:5, planned:8, policyBindingId:'fixture-binding' } : null,
      skills:Array.from({length:manySkills?10:1},(_,n)=>({ id:selected.subjectProgramId+'-'+n, code:(selected.extensionKey?'PHY7-U01-':'MATH8-U02-')+'S'+String(n+1).padStart(2,'0'), nameHy:selected.extensionKey?'Ֆիզիկական երևույթների ճանաչում և համեմատություն':'Կիրառական խնդիրների լուծում և արդյունքների համեմատություն', ready:n<3, mastery:{ percent:75-n, evidenceCount:8 } })),
      history:reportingHistory??[{ id:'completed-fixture', mode:'practice', correct:6, answered:8, percent:75, completedAt:'2026-10-01T19:47:56.15+00:00', curriculumReleaseId:selected.curriculumReleaseId, blueprintId:'fixture-blueprint', policyBindingId:'fixture-binding', modelId:'fixture-model', runtimeBuildId:'fixture-runtime', academicMasteryPolicyId:'fixture-lifecycle', provenanceStatus:'registered_legacy' }],
      modes:Object.fromEntries(['diagnostic','practice','mastery_check','chapter_review'].map(mode => [mode, { status:'configured', questions:8, hintsAllowed:mode==='practice'||mode==='chapter_review', minimumPercent:mode==='mastery_check'?80:null, minimumCorrectBySkill:configuredRules&&mode==='mastery_check'?{[selected.subjectProgramId+'-0']:2}:{}, ...(configuredRules==='points'&&mode==='mastery_check'?{schemaVersion:'haiedu-assessment-policy-v4',questionCountBySkill:{[selected.subjectProgramId+'-0']:8},scoredSkillIds:[selected.subjectProgramId+'-0'],reportingGroups:[{label:'Գնահատվող հմտություն',skillIds:[selected.subjectProgramId+'-0']}],responseTypes:['true_false','typed_fields','matching','ordering']}: {}) }]))
    });
    window.__client={ auth:{ getSession:async()=>({ data:{ session:{ user:{ id:studentId } } } }), getUser:async()=>({ data:{ user:{ id:studentId } } }), onAuthStateChange:fn=>window.__listeners.push(fn) }, from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'student',account_status:'active'}})})})}), functions:{ invoke:async(name,{body})=>{
      window.__calls.push({name,body});
      if(name==='get-student-classes') return { data:{ contexts:denied?[]:window.__authorizedContexts, navigationVersion:'v1' } };
      if(name==='get-student-dashboard') return { data:body.navigation?{contexts:denied?[]:window.__authorizedContexts,navigationVersion:'v1'}:dashboard() };
      if(name==='get-unit-guides') return {data:{guidesVersion:'unit-guides-v1',availability:'available',guides:[{id:'guide',schemaVersion:'teaching-guide-v1',locale:'en',title:'Read for meaning',text:'Identify the main idea, then find details.',workedExample:'Compare the reasons given by the speakers.'}]}};
      if(name==='manage-written-work') {
        if(body.action==='tasks')return {data:{version:'written-work-v1',tasks:[{id:'task',title:'My view',locale:'en',available:true,state:'changes_requested'}]}};
        if(body.action==='open')return {data:{version:'written-work-v1',task:{definition:{title:'My view',locale:'en',prompt:'Explain your view with reasons.',minWords:40,maxWords:70,assistance:{spellcheck:false},criteria:[{key:'meaning',label:'Meaning',descriptors:['Developing','Clear']}] }},work:{state:'changes_requested'},draftText:'My draft.',submissions:[{version:1,text:'My first response.',wordCount:3,submittedAt:'2026-10-01T10:00:00Z',reviews:[{decision:'return',feedback:'Give one more reason.',createdAt:'2026-10-02T10:00:00Z'}]}]}};
      }
      if(name==='start-learning-session') return { data:{ session:{ id:'player-fixture', mode:body.mode } } };
      if(name==='get-mastery-check-status') return { data:{ eligible:false,requiredSkills:[],messageHy:'Ամրապնդեք պահանջվող հմտությունները։', assessmentPolicy:{ ...(configuredRules==='points'?dashboard().modes.mastery_check:{}), plannedQuestionCount:8, hintsAllowed:configuredRules!=='points' } } };
      if(name==='get-chapter-mastery-lifecycle') return {data:{lifecycleState:'not_started',attemptsUsed:0}};
      // Opt-in practice answer outcomes; 'drop-then-correct' loses the first reply (unknown outcome).
      if(name==='submit-answer'&&submitResult){window.__submits=(window.__submits||0)+1;if(submitResult==='drop-then-correct'&&window.__submits===1)return {data:null,error:new Error('network lost')};return {data:{grading:{correct:submitResult!=='incorrect'}}};}
      if(name==='get-session-item') return { data:{ complete:false, session:{ id:'player-fixture', mode:configuredRules==='points'?'mastery_check':'practice', position:1,total:8 }, skill:dashboard().skills[0], sessionItemId:'item-fixture', item:{ id:'question-fixture', code:'QA-001', difficulty:2, type:'true_false', promptHy:'Կարդացեք պնդումը և ընտրեք պատասխանը։', stimulus:{} }, remediation:{ available:false } } };
      throw Error('Unexpected API '+name);
    } } };
  }, { contexts:availableContexts, active, denied, studentId:id(10), selected:availableContexts[contextIndex], locked, manySkills, reportingHistory, configuredRules, submitResult });
  await page.route('**/*', async route => {
    const url=new URL(route.request().url());
    if(url.pathname==='/supabase-browser.bundle.mjs') return route.fulfill({ contentType:'text/javascript',body:'export const createClient=()=>window.__client;' });
    if(url.pathname==='/config.js') return route.fulfill({ contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="fixture-only";' });
    if(url.origin!==origin || url.pathname.includes('..')) return route.abort();
    try {
      const body=await readFile(new URL('../../web'+url.pathname,import.meta.url));
      const contentType=url.pathname.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(url.pathname)?'text/javascript':url.pathname.endsWith('.css')?'text/css':'image/svg+xml';
      return route.fulfill({contentType,body});
    } catch { return route.fulfill({status:404,body:'Not found'}); }
  });
  const selected=availableContexts[contextIndex];
  const params=new URLSearchParams({ enrollment:selected.enrollmentId, release:selected.curriculumReleaseId, unit:selected.unitId, tab, ...(player?{action:configuredRules==='points'?'mastery_check':'practice'}:{}) });
  await page.goto(origin+'/'+route+'?'+params);
  if(route==='course.html') await page.waitForFunction(denied=>(denied || document.querySelector('.amp-nav-list a[href*="view=courses"]')) && document.getElementById('courseLoading').classList.contains('hidden'),denied);
  else await page.waitForFunction(()=>document.querySelector('.amp-nav-list a[href*="view=courses"]') && !document.body.dataset.roleRouting);
  return {page,errors};
}

const releasedPhysics = [contexts[0], ...[
  'Նյութի կառուցվածքը', 'Մեխանիկական շարժում', 'Մարմինների փոխազդեցությունը',
  'Աշխատանք և հզորություն', 'Ճնշում։ Ճնշումն առօրյա կյանքում և տեխնիկայում'
].map((title, n) => ({...contexts[0], curriculumReleaseId:id(100+n), unitId:id(200+n),
  unitSequence:n+2, unitTitleHy:title, releaseNumber:n+2, extensionKey:null}))];
const otherClass = {...contexts[0], enrollmentId:id(999), className:'Մյուս դասարան'};
const releasedContexts = [...releasedPhysics].reverse().concat(contexts[1], otherClass);
const selectedPhysics = releasedContexts.findIndex(c=>c===contexts[0]);

test('student Home, legacy topics and every course tab agree on the six released chapters', async t => {
  const {page,errors}=await fixture(t,{route:'index.html',active:false,availableContexts:releasedContexts,contextIndex:selectedPhysics});
  const selected=releasedPhysics[0];
  await page.goto(origin+'/index.html?'+new URLSearchParams({view:'courses',enrollment:selected.enrollmentId,release:selected.curriculumReleaseId,unit:selected.unitId}));
  const card=page.locator('.amp-subject-card').filter({has:page.locator(`.amp-subject-class-list a[href*="unit=${selected.unitId}"][href*="enrollment=${selected.enrollmentId}"]`)});
  await card.locator('summary').click();
  await expect(card.locator('.amp-subject-class-list a')).toHaveText(releasedPhysics.map(c=>c.unitTitleHy+' · Թողարկում '+c.releaseNumber));
  await card.locator('> a').click();
  await page.getByRole('link',{name:'Դիտել դասընթացի թեմաները',exact:true}).click();
  const chapters=page.locator('[data-student-chapter-navigation]');
  await expect(chapters.locator('nav a')).toHaveText(releasedPhysics.map(c=>c.unitTitleHy));
  await expect(page.locator('body')).not.toContainText('Հետագայում');
  await expect(page.locator('body')).not.toContainText('չեն ակտիվացվել');
  await expect(chapters.locator('[aria-current=page]')).toHaveText(selected.unitTitleHy);
  await chapters.getByRole('link',{name:releasedPhysics[5].unitTitleHy,exact:true}).click();
  for(const [tab,label] of [['course','Դասընթաց'],['assessment','Գնահատումներ'],['progress','Առաջընթաց'],['guides','Ուղեցույցներ'],['writing','Գրավոր աշխատանքներ']]) {
    if(tab!=='course')await page.locator('.course-tabs').getByRole('link',{name:label,exact:true}).click();
    await expect(page.locator('.course-chapters a')).toHaveText(releasedPhysics.map(c=>c.unitTitleHy));
    const url=new URL(page.url());assert.equal(url.searchParams.get('unit'),releasedPhysics[5].unitId);assert.equal(url.searchParams.get('release'),releasedPhysics[5].curriculumReleaseId);assert.equal(url.searchParams.get('enrollment'),selected.enrollmentId);
    await expect(page.locator('#courseTitle')).toContainText(releasedPhysics[5].unitTitleHy);
  }
  assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name==='start-learning-session'||c.name==='submit-answer')),false);
  assert.deepEqual(errors,[]);
});

test('every legacy student entry lists only the released units of the selected enrollment', async t => {
  const {page,errors}=await fixture(t,{route:'physics-7.html',active:false,availableContexts:releasedContexts,contextIndex:selectedPhysics});
  for(const route of ['physics-7.html','assessment.html','progress.html','diagnostic.html','mastery.html','practice.html']) {
    const selected=releasedPhysics[0];
    await page.goto(origin+'/'+route+'?'+new URLSearchParams({enrollment:selected.enrollmentId,release:selected.curriculumReleaseId,unit:selected.unitId}));
    const links=page.locator('[data-student-chapter-navigation] nav a');
    await expect(links,route).toHaveText(releasedPhysics.map(c=>c.unitTitleHy));
    for(const href of await links.evaluateAll(nodes=>nodes.map(n=>n.href)))assert.equal(new URL(href).searchParams.get('enrollment'),selected.enrollmentId);
    const current=page.locator('[data-student-chapter-navigation] [aria-current=page]');await expect(current).toHaveText(selected.unitTitleHy);
    if(route==='practice.html') {
      await page.getByRole('radio',{name:'Ճիշտ է',exact:true}).waitFor();
      await expect(page.locator('[data-student-chapter-navigation]')).toBeHidden();
      const url=new URL(page.url());assert.equal(url.searchParams.get('enrollment'),selected.enrollmentId);assert.equal(url.searchParams.get('release'),selected.curriculumReleaseId);assert.equal(url.searchParams.get('unit'),selected.unitId);
    }
    assert.equal(new URL(page.url()).pathname,'/'+route);
  }
  assert.deepEqual(errors,[]);
});

test('chapter refresh retains keyboard state and access revocation clears prior chapter links', async t => {
  const {page,errors}=await fixture(t,{route:'physics-7.html',active:false,availableContexts:releasedContexts,contextIndex:selectedPhysics});
  const chapters=page.locator('[data-student-chapter-navigation]'),details=chapters.locator('details');
  await expect(details).toHaveAttribute('open','');await details.locator('summary').press('Enter');await expect(details).not.toHaveAttribute('open','');
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await expect(details).not.toHaveAttribute('open','');await expect(details.locator('summary')).toBeFocused();
  await expect(chapters).toHaveCount(1);
  await page.evaluate(()=>{window.__authorizedContexts=[];window.dispatchEvent(new Event('haiedu-refresh-courses'));});
  await page.waitForURL('**/index.html?course=required');
  await expect(page.locator('[data-student-chapter-navigation] nav a')).toHaveCount(0);
  assert.deepEqual(errors,[]);
});

test('released chapter navigation retains readable words at mobile and desktop text sizes', async t => {
  const {page,errors}=await fixture(t,{route:'physics-7.html',active:false,availableContexts:releasedContexts,contextIndex:selectedPhysics});
  const chapters=page.locator('[data-student-chapter-navigation]');await expect(chapters.locator('nav a')).toHaveCount(6);
  for(const width of [390,1280])for(const scale of [100,200]) {
    await page.setViewportSize({width,height:960});await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',scale);
    const words=await wordBreaks(page,'[data-student-chapter-navigation], .subject-stat, .subject-heading, .chapter-header, .topic-head h3, .skill-browser-copy h4');
    const metrics=await chapters.evaluate(el=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,right:el.getBoundingClientRect().right,left:el.getBoundingClientRect().left,overflow:el.scrollWidth>el.clientWidth+1,outside:[...document.querySelectorAll('main.shell *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,20).map(e=>({tag:e.tagName,className:typeof e.className==='string'?e.className:'',right:e.getBoundingClientRect().right,text:e.textContent.trim().slice(0,80)}))}));
    await capture(page,`released-chapters-${width}-${scale}`,{...metrics,words});
    assert.deepEqual(words,[]);assert.equal(metrics.overflow,false);assert.ok(metrics.right<=width+1);assert.ok(metrics.left>=-1);assert.ok(metrics.documentWidth<=width+1,JSON.stringify(metrics));
  }
  assert.deepEqual(errors,[]);
});

async function capture(page, name, metrics) {
  if(!process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR) return;
  const dir=path.resolve(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR);
  await mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});
  await writeFile(path.join(dir,name+'.json'),JSON.stringify(metrics,null,2)+'\n');
}

test('full student shell switches between course documents without browser errors or learning writes', async t => {
  const {page,errors}=await fixture(t,{active:false,route:'index.html'});
  for (const selected of [contexts[0],contexts[1],contexts[0]]) {
    await page.locator('.amp-side-nav a[href*="view=courses"]').click();
    const card=page.locator('#mySubjects .amp-subject-card').filter({has:page.locator(`.amp-subject-class-list a[href*="unit=${selected.unitId}"]`)});
    await card.locator('summary').click();
    const link=card.locator(`.amp-subject-class-list a[href*="unit=${selected.unitId}"]`);
    assert.equal(await link.count(),1);
    await link.click();
    await page.waitForFunction(title=>document.getElementById('courseTitle').textContent.includes(title),selected.unitTitleHy);
    await page.waitForFunction(()=>document.getElementById('courseLoading').classList.contains('hidden'));
    assert.equal(new URL(page.url()).searchParams.get('unit'),selected.unitId);
    assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name==='start-learning-session')),false);
  }
  assert.deepEqual(errors,[]);
});

for(const width of [1280,768,360]) test(`full student assessment shell is readable and contained at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{width});
  const metrics=await page.evaluate(()=>{
    const record=document.querySelector('#courseContent .assessment-history-list>li');
    const nav=document.querySelector('.amp-mobile-nav');
    return { viewport:innerWidth, documentWidth:document.documentElement.scrollWidth,
      historyDisplay:getComputedStyle(record.parentElement).display, recordPadding:parseFloat(getComputedStyle(record).paddingTop),
      rawDateVisible:[...document.querySelectorAll('#courseContent .assessment-history-list time')].some(el=>/^\d{4}-\d\d-\d\dT/.test(el.textContent.trim())),
      emptyParagraphs:[...document.querySelectorAll('#courseContent > p')].filter(el=>!el.textContent.trim()).length,
      emptyPlayerDisplay:getComputedStyle(document.getElementById('learningPlayer')).display,
      dateText:document.querySelector('#courseContent time')?.textContent,
      clippedTabs:[...document.querySelectorAll('.course-tabs a')].filter(el=>el.scrollWidth>el.clientWidth+1).length,
      mobileWidth:nav.clientWidth, mobileLastRight:nav.lastElementChild.getBoundingClientRect().right,
      resumeHref:[...document.querySelectorAll('#courseContent a')].find(el=>el.textContent.startsWith('Շարունակել'))?.href
    };
  });
  await capture(page,'shared-assessment-'+width,metrics);
  assert.equal(metrics.historyDisplay,'grid','History must retain its readable activity list');
  assert.ok(metrics.recordPadding>=10,'Saved activities need readable spacing');
  assert.equal(metrics.rawDateVisible,false,'Student history must format timestamps');
  assert.match(metrics.dateText,/^\d{2}\.\d{2}\.\d{4} · \d{2}:\d{2}$/,'History must remain readable without Armenian locale data');
  assert.equal(metrics.clippedTabs,0,'Tab labels must fit their buttons');
  assert.equal(metrics.emptyParagraphs,0,'Empty sections must not add blank grid rows');
  assert.equal(metrics.emptyPlayerDisplay,'none','An inactive player must not occupy layout space');
  assert.ok(metrics.documentWidth<=width+1,'The document must not overflow horizontally');
  if(width<=1100) assert.ok(Math.abs(metrics.mobileWidth-width)<=2,'The mobile menu must use the viewport width');
  assert.ok(metrics.resumeHref.includes('action=practice'));
  assert.deepEqual(errors,[]);
  await page.getByRole('link',{name:'Առաջընթաց',exact:true}).last().click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('tab')==='progress' && document.querySelectorAll('#courseContent table').length===1 && document.querySelector('#courseContent .assessment-history-list>li'));
  assert.match(await page.locator('#courseContent').innerText(),/75%/);
  assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name==='start-learning-session')),false);
});

test('governed student player keeps radio controls beside readable options',async t=>{
  const {page,errors}=await fixture(t,{width:360,active:false,player:true,contextIndex:1});
  await page.waitForSelector('#learningPlayer input[type=radio]');
  const metrics=await page.locator('#learningPlayer input[type=radio]').first().evaluate(el=>({ width:el.getBoundingClientRect().width, optionWidth:el.closest('label').getBoundingClientRect().width, documentWidth:document.documentElement.scrollWidth }));
  await capture(page,'player-360',metrics);
  assert.ok(metrics.width<=24,'A radio control must not expand to the full option width');
  assert.ok(metrics.optionWidth>metrics.width*3);
  assert.ok(metrics.documentWidth<=361);
  assert.deepEqual(errors,[]);
});

test('full-shell signed-out state clears student evidence',async t=>{
  const {page,errors}=await fixture(t);
  await page.evaluate(()=>window.__listeners.forEach(fn=>fn('SIGNED_OUT',null)));
  assert.equal(await page.locator('#courseContent').innerText(),'');
  assert.equal(await page.locator('.amp-nav-list a[href*="enrollment="]').count(),0);
  assert.deepEqual(errors,[]);
});

test('an unavailable enrollment exposes no student evidence in the full shell',async t=>{
  const {page,errors}=await fixture(t,{denied:true});
  assert.match(await page.locator('#courseContent').innerText(),/Ընտրված դասընթացն այս պահին հասանելի չէ/);
  assert.equal(await page.locator('#courseContent table').count(),0);
  assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name==='get-student-dashboard')),false);
  assert.deepEqual(errors,[]);
});

test('expanded provenance stays contained at 200 percent text size',async t=>{
  const {page,errors}=await fixture(t);
  await page.addStyleTag({content:'html { font-size: 200%; }'});
  const provenance=page.locator('#courseContent .assessment-history-list>li details');
  await provenance.locator('summary').click();
  assert.match(await provenance.innerText(),/fixture-blueprint/);
  assert.match(await provenance.innerText(),/fixture-runtime/);
  const metrics=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    crowdedNavLinks:[...document.querySelectorAll('.amp-nav-link')].filter(el=>{
      const label=el.lastElementChild.getBoundingClientRect(), link=el.getBoundingClientRect();
      return label.top<link.top-1 || label.bottom>link.bottom+1;
    }).length,
    clippedNavLabels:[...document.querySelectorAll('.amp-nav-link > span:last-child')].filter(el=>el.scrollWidth>el.clientWidth+1).length
  }));
  await capture(page,'assessment-text-200',metrics);
  assert.ok(metrics.documentWidth<=metrics.viewport+1);
  assert.equal(metrics.crowdedNavLinks,0,'Larger text must not overlap adjacent sidebar links');
  assert.equal(metrics.clippedNavLabels,0,'Larger Armenian labels must fit the sidebar');
  assert.deepEqual(errors,[]);
});

for(const width of [360,768,1920]) for(const tab of ['course','progress']) test(`shared ${tab} view keeps ten Armenian skill rows styled at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{width,tab,manySkills:true});
  const table=page.locator('.course-data-section table').first();
  assert.equal(await table.locator('tbody tr').count(),10);
  assert.equal(await table.locator('thead th').count(),tab==='progress'?3:4);
  const metrics=await page.evaluate(()=>({
    viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    // Phone skill cards move row spacing from the cell to the card; either must stay readable.
    tables:[...document.querySelectorAll('#courseContent table')].map(el=>{const cell=getComputedStyle(el.querySelector('td')),card=cell.display==='block'?getComputedStyle(el.querySelector('tbody tr')):null;return {collapse:getComputedStyle(el).borderCollapse,padding:card?Math.min(parseFloat(card.paddingTop),parseFloat(card.paddingLeft)):parseFloat(cell.paddingTop)};})
  }));
  await capture(page,'shared-'+tab+'-'+width,metrics);
  assert.ok(metrics.documentWidth<=width+1);
  assert.ok(metrics.tables.every(table=>table.collapse==='collapse' && table.padding>=10));
  assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name==='start-learning-session')),false);
  if(tab==='progress') assert.equal(await table.getByRole('link').count(),0);
  assert.deepEqual(errors,[]);
});

const studentRoutes=[
  ['index.html','#multiSubjectHome .amp-subject-card'],
  ['physics-7.html','#subjectContent:not(.hidden)'],
  ['assessment.html','#assessmentContent:not(.hidden)'],
  ['progress.html','#progressContent:not(.hidden)'],
  ['diagnostic.html','#resultPanel:not(.hidden)'],
  ['mastery.html','#stateCard'],
  ['practice.html','#practicePanel:not(.hidden) input[type=radio]']
];
for(const width of [320,360,1280]) for(const [route,ready] of studentRoutes) test(`student route ${route} retains its complete interface at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{width,route,manySkills:true});
  await page.waitForSelector(ready,{state:'visible'});
  if(route==='practice.html'&&width===320)t.diagnostic('BF07_LEGACY_PRACTICE '+JSON.stringify(await page.evaluate(()=>window.__calls)));
  if(route==='mastery.html') await page.waitForFunction(()=>document.getElementById('masteryStateBadge').textContent!=='Բեռնվում է');
  const metrics=await page.evaluate(()=>{
    const nav=document.querySelector('.amp-nav-list');
    return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
      primaryLinks:nav.querySelectorAll('a').length,globalProgress:[...nav.querySelectorAll('a')].some(a=>a.textContent.includes('Առաջընթաց')),
      canvas:getComputedStyle(document.body).backgroundColor,
      unstyledSheets:[...document.querySelectorAll('link[rel=stylesheet]')].filter(el=>!el.sheet).map(el=>el.href),
      clippedControls:[...document.querySelectorAll('button,a.button-link,a.ghost')].filter(el=>el.getClientRects().length && el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())
    };
  });
  await capture(page,route.replace('.html','')+'-'+width,metrics);
  assert.equal(new URL(page.url()).pathname,'/'+route,'The entitled student must stay on the requested page');
  assert.equal(metrics.primaryLinks,4,'Every student page retains the same primary navigation including supplementary materials');
  assert.equal(metrics.globalProgress,false,'Progress belongs inside a course');
  assert.equal(metrics.canvas,'rgb(245, 246, 239)');
  assert.deepEqual(metrics.unstyledSheets,[]);
  assert.ok(metrics.documentWidth<=width+1,JSON.stringify(metrics));
  assert.deepEqual(metrics.clippedControls,[]);
  assert.deepEqual(errors,[]);
});

test('shared assessment entry presents a styled diagnostic prerequisite without opening practice',async t=>{
  const {page,errors}=await fixture(t,{active:false,locked:true,contextIndex:1,width:360});
  assert.equal(await page.locator('.course-mode-card').count(),4);
  assert.match(await page.locator('#courseContent').innerText(),/Նախ ավարտեք այս գլխի ախտորոշիչը/);
  assert.equal(await page.locator('.course-mode-card a').count(),1);
  assert.match(await page.locator('.course-mode-card a').getAttribute('href'),/action=diagnostic/);
  await capture(page,'assessment-locked-360',{});
  assert.deepEqual(errors,[]);
});

for(const tab of ['guides','writing'])test(`Forest ${tab} keeps accessible disclosure and authored content at 320px`,async t=>{
 const {page,errors}=await fixture(t,{width:320,tab,contextIndex:1,active:false});
 if(tab==='guides'){
  await page.locator('.unit-guide summary').waitFor();await page.locator('.unit-guide summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.unit-guide-content p').first().isVisible(),true);
 }else{
  await page.locator('[data-writing-open]').click();await page.locator('[data-writing-text]').waitFor();
  assert.equal(await page.locator('[data-writing-text]').inputValue(),'My draft.');
  assert.match(await page.locator('.written-feedback').first().innerText(),/Give one more reason/);
  assert.equal(await page.locator('.written-feedback').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 235, 250)');
  await page.locator('.written-rubric summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.written-rubric section').isVisible(),true);
 }
 assert.equal(await page.locator('.student-course-hero').isVisible(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(await page.evaluate(()=>window.__calls.some(c=>c.name==='start-learning-session'||(c.name==='manage-written-work'&&!['tasks','open'].includes(c.body.action)))),false);
 assert.deepEqual(errors,[]);
});
test('generic focused player retains readable rules and suppresses competing overview',async t=>{
 const {page,errors}=await fixture(t,{width:768,active:false,player:true,contextIndex:1});
 await page.locator('#learningPlayer form').waitFor();
 assert.equal(await page.locator('.student-course-hero').isVisible(),false);
 assert.equal(await page.locator('.amp-side-nav').isVisible(),false);
 await page.setViewportSize({width:320,height:900});
 assert.equal(await page.locator('.amp-mobile-nav').isVisible(),false);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(await page.locator('#learningPlayer .student-rule-details').getAttribute('open'),'');
 await page.locator('#learningPlayer summary').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#learningPlayer .student-rule-details').getAttribute('open'),null);
 assert.equal(await page.locator('#learningPlayer button[type=submit]').isVisible(),true);
 assert.deepEqual(errors,[]);
});
test('student saved Practice cards retain assessed zeros, historical scales and accessible scope without a wide history table',async t=>{
  const {page:p,errors}=await fixture(t,{contextIndex:1,tab:'progress',active:false,reportingHistory:historyEntries()});
  const history=p.locator('section[aria-labelledby=courseHistoryTitle]');
  await expect(history.locator('.assessment-history-list>li')).toHaveCount(3);await expect(history.locator('table')).toHaveCount(0);
  await expect(history.locator('[data-assessment-state=unassessed]')).toHaveCount(3);assert.doesNotMatch(await history.innerText(),/0\/0/);
  await expect(history).toContainText('0/3 միավոր · 0%');await expect(history).toContainText('2/3 · 66.67%');
  await expect(history).toContainText('Ստուգարքը չի անցել · 22.39/28 միավոր · 80%');
  await expect(history.locator('[data-assessment-scope]')).toHaveCount(1);await expect(history.locator('[data-assessment-scope]')).toBeHidden();
  await history.locator('.assessment-scope summary').focus();await p.keyboard.press('Enter');
  await expect(history.locator('[data-assessment-scope]')).toBeVisible();await expect(history.locator('[data-assessment-scope]')).toContainText('ամբողջ դասընթացի ընդհանուր գնահատականը չէ');await p.keyboard.press('Enter');
  for(const [n,record] of (await history.locator('.assessment-history-list>li').all()).entries()){
    await record.locator('details summary').click();await expect(record).toContainText('policy-'+n);await record.locator('details summary').click();
  }
  await p.emulateMedia({reducedMotion:'reduce'});
  for(const width of [1280,960,768,390,360]){
    await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
    if(width<=1100){await expect(p.locator('.amp-side-nav')).toBeHidden();await expect(p.locator('.amp-mobile-nav')).toBeVisible();}
    const versions=history.locator('.assessment-history-list>li').first().locator('details summary');await versions.click();
    assert.deepEqual(await p.evaluate(historyReadability,'section[aria-labelledby=courseHistoryTitle]'),[],String(width)+' expanded versions');await versions.click();
    await history.locator('h2').scrollIntoViewIfNeeded();assert.deepEqual(await p.evaluate(historyReadability,'section[aria-labelledby=courseHistoryTitle]'),[],String(width));
    await history.locator('.assessment-history-list>li').first().evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/student-practice-history-'+width+'.png'});}
  }
  await p.setViewportSize({width:1280,height:1000});await p.evaluate(()=>document.documentElement.style.fontSize='100%');await history.locator('h2').scrollIntoViewIfNeeded();
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR)await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/student-practice-history-normal.png'});
  assert.equal(await p.evaluate(()=>window.__calls.some(c=>!['get-student-dashboard','get-student-classes'].includes(c.name))),false);
  assert.deepEqual(errors,[]);
});


test('shared student navigation keeps full labels, keyboard access and exact governed links at enlarged text',async t=>{
  const {page,errors}=await fixture(t,{contextIndex:1,active:false,tab:'progress'});
  await page.emulateMedia({reducedMotion:'reduce'});
  const original=await page.locator('.amp-nav-list a').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),label:e.textContent.trim(),current:e.getAttribute('aria-current')})));
  assert.equal(original.length,4);
  for(const link of original){const url=new URL(link.href,'https://student-workspace.test');assert.equal(url.searchParams.get('release'),contexts[1].curriculumReleaseId);assert.equal(url.searchParams.get('unit'),contexts[1].unitId);}
  const rows=[];
  for(const width of [1280,960,768,449,430,390,375,360,320])for(const scale of [100,200]){
    await page.setViewportSize({width,height:960});await page.evaluate(s=>document.documentElement.style.fontSize=s+'%',scale);
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    if(width<=1100){
      const visible=await page.locator('.amp-mobile-nav').evaluate(el=>({
        layout:el.dataset.layout,position:getComputedStyle(el).position,height:el.getBoundingClientRect().height,viewportHeight:innerHeight,
        overflow:el.scrollWidth>el.clientWidth+1,
        clipped:[...el.querySelectorAll('a')].filter(a=>{const r=a.getBoundingClientRect(),n=el.getBoundingClientRect();return r.left<n.left-1||r.right>n.right+1;}).map(a=>a.textContent),
        bottom:el.getBoundingClientRect().bottom,mainTop:document.querySelector('main.shell').getBoundingClientRect().top,
        reserved:parseFloat(document.body.style.getPropertyValue('--amp-mobile-nav-space')),
      }));
      assert.equal(visible.overflow,false,JSON.stringify(visible));assert.deepEqual(visible.clipped,[],JSON.stringify(visible));
      assert.deepEqual((await page.evaluate(mobileNavigationLayout)).errors,[],`${width}/${scale} mobile layout`);
      if(visible.layout==='fixed'){assert.ok(visible.height<=visible.viewportHeight*.2+1);assert.ok(visible.reserved>=visible.height);}
      else{assert.equal(visible.position,'relative');assert.equal(visible.reserved,0);assert.ok(visible.bottom<=visible.mainTop+1);}
      await capture(page,`bf10-navigation-${width}-${scale}`,visible);
    }
    const navigation=await checkNavigation(page);
    if(navigation.errors.length)await capture(page,`navigation-failure-${width}-${scale}`,navigation);
    assert.deepEqual(navigation.errors,[],`${width}/${scale}`);
    assert.deepEqual(await page.locator('.amp-nav-list a').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),label:e.textContent.trim(),current:e.getAttribute('aria-current')}))),original);
    if(width<=1100){
      const bar=page.locator('.amp-mobile-nav');await expect(bar).toBeVisible();
      const bounds=await bar.evaluate(e=>({height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e.firstElementChild).fontSize)}));
      if(await bar.getAttribute('data-layout')==='fixed')assert.ok(bounds.height<=960*.2+1,`fixed menu must leave the workspace visible: ${JSON.stringify(bounds)}`);
      assert.equal(await bar.locator('a').count(),4);
    }
    rows.push({width,textScale:scale,controls:navigation.links,keyboard:true,fullWords:true,contextPreserved:true});
    if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR&&[1280,360].includes(width)){
      await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/navigation-student-${width}-${scale}.png`});
    }
  }
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR)await writeFile(`${process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR}/navigation-student.json`,JSON.stringify(rows,null,2)+'\n');
  assert.equal(await page.evaluate(()=>window.__calls.some(c=>!['get-student-dashboard','get-student-classes'].includes(c.name))),false);
  assert.deepEqual(errors,[]);
});

test('mobile navigation settles after repeated setup, text changes and orientation changes without replacing a focused link',async t=>{
  const {page,errors}=await fixture(t,{width:390,contextIndex:1,active:false});
  const link=page.locator('.amp-mobile-nav a').last();await link.focus();
  const href=await link.getAttribute('href');
  const state=await page.evaluate(async()=>{
    const {installStudentMobileNavigation}=await import('/student-mobile-navigation.mjs');
    const nav=document.querySelector('.amp-mobile-nav'),first=installStudentMobileNavigation(nav);
    const same=Array.from({length:20},()=>installStudentMobileNavigation(nav)===first).every(Boolean);
    for(let i=0;i<20;i++)first.refresh();
    for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);
    let changes=0;const observer=new MutationObserver(records=>{changes+=records.length;});
    observer.observe(nav,{attributes:true});observer.observe(document.body,{attributes:true,attributeFilter:['style']});
    for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);
    observer.disconnect();return {same,changes};
  });
  assert.deepEqual(state,{same:true,changes:0});
  for(const [width,height,scale] of [[320,568,200],[844,390,100],[390,844,100]]){
    await page.setViewportSize({width,height});await page.evaluate(s=>document.documentElement.style.fontSize=s+'%',scale);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),href);
    assert.equal(await page.locator('.amp-mobile-nav').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  }
  // The same renderer can replace its labels on a fresh course-access event.
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await expect(page.locator('.amp-mobile-nav a')).toHaveCount(4);
  assert.equal(await page.evaluate(()=>window.__calls.some(c=>!['get-student-dashboard','get-student-classes'].includes(c.name))),false);
  assert.deepEqual(errors,[]);
});

for(const [result,outcome,colour] of [['correct','correct','rgb(231, 245, 238)'],['incorrect','incorrect','rgb(255, 242, 222)']])test(`practice shows the skill, progress and a ${outcome} outcome in its semantic colour`,async t=>{
 const {page,errors}=await fixture(t,{width:390,active:false,player:true,contextIndex:1,submitResult:result});
 await page.locator('#learningPlayer form').waitFor();
 await expect(page.locator('#learningPlayer .learning-skill')).not.toHaveText('');
 assert.equal(await page.locator('#learningPlayer .learning-progress').getAttribute('aria-hidden'),'true');
 assert.equal(await page.locator('#learningPlayer .learning-progress > span').evaluate(el=>el.style.width),'13%');
 await page.locator('#learningPlayer input[name=answer]').first().check();await page.locator('#learningPlayer button[type=submit]').click();
 const feedback=page.locator('#learningPlayer [data-feedback]');
 await expect(feedback).toContainText(result==='correct'?'Ճիշտ պատասխան։':'Պատասխանը սխալ է։');
 assert.equal(await feedback.getAttribute('data-outcome'),outcome);
 assert.equal(await feedback.evaluate(el=>getComputedStyle(el).backgroundColor),colour);
 await expect(page.locator('#learningPlayer').getByRole('button',{name:'Հաջորդը',exact:true})).toBeVisible();
 assert.deepEqual(errors,[]);
});

test('a lost practice reply shows an attention recovery that keeps the answer, then clears on retry',async t=>{
 const {page,errors}=await fixture(t,{width:390,active:false,player:true,contextIndex:1,submitResult:'drop-then-correct'});
 await page.locator('#learningPlayer form').waitFor();
 await page.locator('#learningPlayer input[name=answer]').first().check();await page.locator('#learningPlayer button[type=submit]').click();
 const feedback=page.locator('#learningPlayer [data-feedback]'),panel=feedback;
 await expect(panel).toHaveAttribute('data-recovery','uncertain');
 await expect(panel.locator('.answer-recovery-title')).toHaveText('Կապը ընդհատվեց');
 await expect(panel).toContainText('Պատասխանի գրանցումը դեռ հաստատված չէ');
 await expect(panel.locator('.answer-recovery-kept')).toHaveText('Ձեր պատասխանը մնում է այս էջում՝ անփոփոխ։');
 assert.equal(await feedback.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 242, 222)','Unknown outcome is attention, not error');
 assert.equal(await page.locator('#learningPlayer input[name=answer]').first().isChecked(),true,'The chosen answer stays on the page');
 await expect(page.locator('#learningPlayer button[type=submit]')).toHaveText('Կրկին փորձել');
 await page.locator('#learningPlayer button[type=submit]').click();
 await expect(feedback).toContainText('Ճիշտ պատասխան։');
 assert.equal(await feedback.getAttribute('data-recovery'),null,'Recovery styling disappears with the result');
 assert.equal(await feedback.getAttribute('data-outcome'),'correct');
 assert.equal(await page.evaluate(()=>window.__submits),2);
 assert.deepEqual(errors,[]);
});
