import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

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

async function fixture(t, { width=1280, active=true, player=false, contextIndex=0, denied=false, route='course.html', tab='assessment', locked=false, manySkills=false }={}) {
  const context=await browser.newContext({ viewport:{ width, height:900 } });
  t.after(() => context.close());
  const page=await context.newPage(), errors=[];
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ contexts, active, denied, studentId, selected, locked, manySkills }) => {
    window.__calls=[]; window.__listeners=[];
    const dashboard=()=>({ dashboardVersion:'v1', practiceAccess:{ unlocked:!locked }, baseline:locked?null:{ correct:16, answered:20, percent:80 },
      latestDiagnostic:locked?null:{correct:16,answered:20,percent:80,completedAt:'2026-10-01T19:47:56.15+00:00'},
      progress:{completedSkills:3,totalSkills:10,percent:30},
      activeSession:active ? { id:'active-fixture', mode:'practice', answered:5, planned:8, policyBindingId:'fixture-binding' } : null,
      skills:Array.from({length:manySkills?10:1},(_,n)=>({ id:selected.subjectProgramId+'-'+n, code:(selected.extensionKey?'PHY7-U01-':'MATH8-U02-')+'S'+String(n+1).padStart(2,'0'), nameHy:selected.extensionKey?'Ֆիզիկական երևույթների ճանաչում և համեմատություն':'Կիրառական խնդիրների լուծում և արդյունքների համեմատություն', ready:n<3, mastery:{ percent:75-n, evidenceCount:8 } })),
      history:[{ id:'completed-fixture', mode:'practice', correct:6, answered:8, percent:75, completedAt:'2026-10-01T19:47:56.15+00:00', curriculumReleaseId:selected.curriculumReleaseId, blueprintId:'fixture-blueprint', policyBindingId:'fixture-binding', modelId:'fixture-model', runtimeBuildId:'fixture-runtime', academicMasteryPolicyId:'fixture-lifecycle', provenanceStatus:'registered_legacy' }],
      modes:Object.fromEntries(['diagnostic','practice','mastery_check','chapter_review'].map(mode => [mode, { status:'configured', questions:8, hintsAllowed:mode==='practice'||mode==='chapter_review', minimumPercent:mode==='mastery_check'?80:null, minimumCorrectBySkill:{} }]))
    });
    window.__client={ auth:{ getSession:async()=>({ data:{ session:{ user:{ id:studentId } } } }), getUser:async()=>({ data:{ user:{ id:studentId } } }), onAuthStateChange:fn=>window.__listeners.push(fn) }, from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'student',account_status:'active'}})})})}), functions:{ invoke:async(name,{body})=>{
      window.__calls.push({name,body});
      if(name==='get-student-classes') return { data:{ contexts:denied?[]:contexts, navigationVersion:'v1' } };
      if(name==='get-student-dashboard') return { data:body.navigation?{contexts:denied?[]:contexts,navigationVersion:'v1'}:dashboard() };
      if(name==='start-learning-session') return { data:{ session:{ id:'player-fixture', mode:body.mode } } };
      if(name==='get-mastery-check-status') return { data:{ eligible:false,requiredSkills:[],messageHy:'Ամրապնդեք պահանջվող հմտությունները։', assessmentPolicy:{ plannedQuestionCount:8, hintsAllowed:true } } };
      if(name==='get-chapter-mastery-lifecycle') return {data:{lifecycleState:'not_started',attemptsUsed:0}};
      if(name==='get-session-item') return { data:{ complete:false, session:{ id:'player-fixture', mode:'practice', position:1,total:8 }, skill:dashboard().skills[0], sessionItemId:'item-fixture', item:{ id:'question-fixture', code:'QA-001', difficulty:2, type:'true_false', promptHy:'Կարդացեք պնդումը և ընտրեք պատասխանը։', stimulus:{} }, remediation:{ available:false } } };
      throw Error('Unexpected API '+name);
    } } };
  }, { contexts, active, denied, studentId:id(10), selected:contexts[contextIndex], locked, manySkills });
  await page.route('**/*', async route => {
    const url=new URL(route.request().url());
    if(url.origin==='https://esm.sh') return route.fulfill({ contentType:'text/javascript',body:'export const createClient=()=>window.__client;' });
    if(url.pathname==='/config.js') return route.fulfill({ contentType:'text/javascript',body:'export const SUPABASE_URL="https://fixture.invalid";export const SUPABASE_PUBLISHABLE_KEY="fixture-only";' });
    if(url.origin!==origin || url.pathname.includes('..')) return route.abort();
    try {
      const body=await readFile(new URL('../../web'+url.pathname,import.meta.url));
      const contentType=url.pathname.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(url.pathname)?'text/javascript':url.pathname.endsWith('.css')?'text/css':'image/svg+xml';
      return route.fulfill({contentType,body});
    } catch { return route.fulfill({status:404,body:'Not found'}); }
  });
  const selected=contexts[contextIndex];
  const params=new URLSearchParams({ enrollment:selected.enrollmentId, release:selected.curriculumReleaseId, unit:selected.unitId, tab, ...(player?{action:'practice'}:{}) });
  await page.goto(origin+'/'+route+'?'+params);
  if(route==='course.html') await page.waitForFunction(denied=>(denied || document.querySelector('.amp-course-link')) && document.getElementById('courseLoading').classList.contains('hidden'),denied);
  else await page.waitForFunction(()=>document.querySelector('.amp-course-link') && !document.body.dataset.roleRouting);
  return {page,errors};
}

async function capture(page, name, metrics) {
  if(!process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR) return;
  const dir=path.resolve(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR);
  await mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});
  await writeFile(path.join(dir,name+'.json'),JSON.stringify(metrics,null,2)+'\n');
}

for(const width of [1280,768,360]) test(`full student assessment shell is readable and contained at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{width});
  const metrics=await page.evaluate(()=>{
    const table=document.querySelector('#courseContent table'), cell=table.querySelector('td');
    const nav=document.querySelector('.amp-mobile-nav');
    return { viewport:innerWidth, documentWidth:document.documentElement.scrollWidth,
      tableCollapse:getComputedStyle(table).borderCollapse, cellPadding:parseFloat(getComputedStyle(cell).paddingTop),
      rawDateVisible:[...document.querySelectorAll('#courseContent td')].some(el=>/^\d{4}-\d\d-\d\dT/.test(el.textContent.trim())),
      emptyParagraphs:[...document.querySelectorAll('#courseContent > p')].filter(el=>!el.textContent.trim()).length,
      emptyPlayerDisplay:getComputedStyle(document.getElementById('learningPlayer')).display,
      dateText:document.querySelector('#courseContent time')?.textContent,
      clippedTabs:[...document.querySelectorAll('.course-tabs a')].filter(el=>el.scrollWidth>el.clientWidth+1).length,
      mobileWidth:nav.clientWidth, mobileLastRight:nav.lastElementChild.getBoundingClientRect().right,
      resumeHref:[...document.querySelectorAll('#courseContent a')].find(el=>el.textContent.startsWith('Շարունակել'))?.href
    };
  });
  await capture(page,'assessment-'+width,metrics);
  assert.equal(metrics.tableCollapse,'collapse','History lost its table styling');
  assert.ok(metrics.cellPadding>=10,'History rows need readable cell spacing');
  assert.equal(metrics.rawDateVisible,false,'Student history must format timestamps');
  assert.match(metrics.dateText,/^\d{2}\.\d{2}\.\d{4} · \d{2}:\d{2}$/,'History must remain readable without Armenian locale data');
  assert.equal(metrics.clippedTabs,0,'Tab labels must fit their buttons');
  assert.equal(metrics.emptyParagraphs,0,'Empty sections must not add blank grid rows');
  assert.equal(metrics.emptyPlayerDisplay,'none','An inactive player must not occupy layout space');
  assert.ok(metrics.documentWidth<=width+1,'The document must not overflow horizontally');
  if(width<=820) assert.ok(Math.abs(metrics.mobileLastRight-metrics.mobileWidth)<=2,'Mobile navigation must use its full width');
  assert.ok(metrics.resumeHref.includes('action=practice'));
  assert.deepEqual(errors,[]);
  await page.getByRole('link',{name:'Առաջընթաց',exact:true}).last().click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('tab')==='progress' && document.querySelectorAll('#courseContent table').length===2);
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
  assert.equal(await page.locator('.amp-course-link').count(),0);
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
  await page.locator('#courseContent details summary').click();
  assert.match(await page.locator('#courseContent details').innerText(),/fixture-blueprint/);
  assert.match(await page.locator('#courseContent details').innerText(),/fixture-runtime/);
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
    tables:[...document.querySelectorAll('#courseContent table')].map(el=>({collapse:getComputedStyle(el).borderCollapse,padding:parseFloat(getComputedStyle(el.querySelector('td')).paddingTop)}))
  }));
  await capture(page,tab+'-'+width,metrics);
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
for(const width of [360,1280]) for(const [route,ready] of studentRoutes) test(`student route ${route} retains its complete interface at ${width}px`,async t=>{
  const {page,errors}=await fixture(t,{width,route,manySkills:true});
  await page.waitForSelector(ready,{state:'visible'});
  if(route==='mastery.html') await page.waitForFunction(()=>document.getElementById('masteryStateBadge').textContent!=='Բեռնվում է');
  const metrics=await page.evaluate(()=>{
    const sublinks=document.querySelector('.amp-course-sublinks'),small=document.querySelector('.amp-course-link small');
    return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
      navLayout:getComputedStyle(sublinks).display,navMetaDisplay:getComputedStyle(small).display,
      unstyledSheets:[...document.querySelectorAll('link[rel=stylesheet]')].filter(el=>!el.sheet).map(el=>el.href),
      clippedControls:[...document.querySelectorAll('button,a.button-link,a.ghost')].filter(el=>el.getClientRects().length && el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())
    };
  });
  await capture(page,route.replace('.html','')+'-'+width,metrics);
  assert.equal(new URL(page.url()).pathname,'/'+route,'The entitled student must stay on the requested page');
  assert.equal(metrics.navLayout,'grid','Every student page must load the course navigation styles');
  assert.equal(metrics.navMetaDisplay,'block','Class and school metadata need their own line');
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
