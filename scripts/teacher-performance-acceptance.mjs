import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect as baseExpect} from '@playwright/test';
import {waitForRelease} from './wait-for-production-release.mjs';
import {installTeacherHomeReadiness} from './teacher-home-readiness.mjs';
const fixtureScope=process.env.TEACHER_PERF_SCOPE??'all';
const phase=process.env.TEACHER_PERF_PHASE??'baseline',site='https://www.haiedu.am';
// Assertion timeouts are independent of page.setDefaultTimeout. The old page
// routinely takes longer than Playwright's default five seconds to become usable.
const expect=baseExpect.configure({timeout:45000});
const fixture=JSON.parse(process.env.QA_TENANT_FIXTURES_JSON??'{}');
const config=await readFile(new URL('../web/config.js',import.meta.url),'utf8');
const url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
const report={scope:'Read-only teacher performance',phase,fixtureScope,revision:process.env.GITHUB_SHA,startedAt:new Date().toISOString(),status:'running',samples:[],checks:[],profile:{browser:'Chromium',runner:'GitHub ubuntu-latest',viewport:'1365x950',cpu:'unthrottled shared runner',network:'CDP 4G: 150 ms latency, 1.6 Mbps down, 750 Kbps up',cold:'fresh browser context and HTTP cache',warm:'same context reload',iterations:10},budgets:{usefulHomeP95Ms:3000,selectedClassP95Ms:2000,loadedNavigationP95Ms:200}};
let browser,stage='preflight';const sessions=[];
function check(label,passed){report.checks.push({label,passed});if(!passed)throw Error(label);}
const quantile=(a,q)=>a.toSorted((a,b)=>a-b)[Math.ceil(a.length*q)-1];
async function save(){await mkdir('qa-results',{recursive:true});await writeFile('qa-results/teacher-performance.json',JSON.stringify(report,null,2));}
async function api(token,fn,body){const start=performance.now();const res=await fetch(`${url}/functions/v1/${fn}`,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const raw=await res.text();return {status:res.status,data:JSON.parse(raw),ms:performance.now()-start,bytes:Buffer.byteLength(raw),serverTiming:res.headers.get('server-timing')};}
try{
 check('reviewed main and designated two-school fixtures',process.env.GITHUB_REF==='refs/heads/main'&&['baseline','after'].includes(phase)&&['all','A','B'].includes(fixtureScope)&&fixture.dedicatedQa===true&&fixture.A?.schoolId!==fixture.B?.schoolId);
 await waitForRelease({expectedCommit:process.env.GITHUB_SHA});
 browser=await chromium.launch({headless:true});
 for(const side of (fixtureScope==='all'?['A','B']:[fixtureScope])){
  stage=side+': login';const email=process.env[`QA_SCHOOL_${side}_TEACHER_EMAIL`],password=process.env[`QA_SCHOOL_${side}_TEACHER_PASSWORD`];
  check(side+': credentials configured',Boolean(email&&password));
  const login=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(30000)});
  const session=await login.json();session.expires_at??=Math.floor(Date.now()/1000)+Number(session.expires_in);check(side+': designated teacher identity',login.ok&&session.user?.id===fixture[side].teacherId);sessions.push(session);
  const base=await api(session.access_token,'get-teacher-dashboard',{readMode:'directory'});check(side+': initial authorized directory',base.status===200&&base.data.classes.some(c=>c.id===fixture[side].classId));
  report.checks.push({label:side+': fixture size',active:base.data.directory.activeCount,archived:base.data.directory.archiveCount});
  const detail=await api(session.access_token,'get-teacher-dashboard',{readMode:'class',classId:fixture[side].classId});check(side+': authorized exact class',detail.status===200);const klass=detail.data.classes.find(c=>c.id===fixture[side].classId);
  const option=klass.unitOptions.find(x=>x.unitId!==klass.selectedUnit?.unitId&&!x.readOnlyHistory)??klass.unitOptions.find(x=>x.unitId!==klass.selectedUnit?.unitId);
  check(side+': unit-switch fixture exists',Boolean(option));
  const foreign=fixture[side==='A'?'B':'A'];const denied=await api(session.access_token,'get-teacher-dashboard',{selection:{assignmentId:foreign.assignmentId,curriculumReleaseId:foreign.curriculumReleaseId,unitId:foreign.unitId},readMode:'class',classId:foreign.classId});
  check(side+': foreign class denied',denied.status===403);
  let responseFixture=null;
  for(const c of base.data.classes.filter(c=>c.isActive)){
   const d=c.id===klass.id?detail:await api(session.access_token,'get-teacher-dashboard',{readMode:'class',classId:c.id});
   check(side+': response candidate authorized',d.status===200);
   for(const u of d.data.classes.find(x=>x.id===c.id).unitOptions.filter(u=>!u.readOnlyHistory)){
    const selection={assignmentId:u.assignmentId,curriculumReleaseId:u.curriculumReleaseId,unitId:u.unitId};
    const q=await api(session.access_token,'manage-written-work',{action:'queue',context:selection,payload:{state:'all',offset:0}});
    check(side+': response queue authorized',q.status===200);
    const work=q.data.queue.find(w=>['submitted','reviewed','changes_requested'].includes(w.state));
    if(work){responseFixture={classId:c.id,selection,workId:work.id,state:work.state};break;}
   }
   if(responseFixture)break;
  }
  report.responseFixtures??=[];report.responseFixtures.push({side,available:Boolean(responseFixture),state:responseFixture?.state??null});
  report.checks.push({label:side+': response fixture state',state:responseFixture?.state??'unavailable'});
  for(let iteration=0;iteration<10;iteration++){
   const context=await browser.newContext({viewport:{width:1365,height:950},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:site,localStorage:[{name:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,value:JSON.stringify(session)}]}]}});
   await context.addInitScript(installTeacherHomeReadiness);
   let requests=[],blocked=0;const pageErrors=[];
   await context.route('**/functions/v1/**',route=>{const req=route.request(),fn=new URL(req.url()).pathname.split('/').pop();let b={};try{b=req.postDataJSON()??{};}catch{}
    const allowed=['get-teacher-dashboard','get-teacher-workspace','get-teacher-student','get-profile'].includes(fn)||(fn==='manage-student-invitation'&&b.action==='list')||(fn==='manage-written-work'&&['queue','inspect'].includes(b.action))||(fn==='manage-teacher-feedback'&&['open','snippets'].includes(b.action));
    if(req.method()==='OPTIONS'||allowed)return route.continue();blocked++;return route.abort();});
   const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>pageErrors.push(e.name));
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8});
   page.on('request',req=>{const p=new URL(req.url()).pathname;if(p.includes('/functions/v1/')||p.includes('/rest/v1/'))requests.push(req);});
   async function measure(scenario,action,ready){stage=`${side}:${iteration}:${scenario}`;requests=[];const start=performance.now(),startEpochMs=Date.now();await action();await ready();const ms=performance.now()-start;
    const calls=[];for(const req of requests){const res=await req.response();await res?.finished();const size=await req.sizes().catch(()=>({responseBodySize:0}));calls.push({endpoint:new URL(req.url()).pathname,ms:req.timing().responseEnd,status:res?.status(),bytes:size.responseBodySize,serverTiming:await res?.headerValue('server-timing')});}
    let readiness=null;
    if(['cold-home','warm-home'].includes(scenario)){
     await page.waitForFunction(()=>Number.isFinite(window.__haieduTeacherHomeTiming?.readyAtEpochMs),null,{timeout:5000});
     readiness=await page.evaluate(start=>({method:window.__haieduTeacherHomeTiming.version,ms:window.__haieduTeacherHomeTiming.readyAtEpochMs-start,
      navigation:(()=>{const n=performance.getEntriesByType('navigation')[0];return {responseEnd:n.responseEnd,domInteractive:n.domInteractive,domContentLoaded:n.domContentLoadedEventEnd};})(),
      resources:performance.getEntriesByType('resource').filter(e=>new URL(e.name).origin===location.origin).slice(0,100).map(e=>({path:new URL(e.name).pathname,startTime:e.startTime,duration:e.duration,encodedBodySize:e.encodedBodySize,transferSize:e.transferSize}))}),startEpochMs);
     check(side+': exact visible Home milestone in sample '+iteration,Number.isFinite(readiness.ms)&&readiness.ms>=0&&readiness.ms<=Date.now()-startEpochMs+100);
    }
    report.samples.push({side,iteration,scenario,ms,...(readiness?{readiness}:{}),requestCount:calls.length,bytes:calls.reduce((n,c)=>n+c.bytes,0),calls});await save();
   }
   const homeReady=async()=>{await expect(page.locator('#dashboardPanel')).toBeVisible();await expect(page.locator('[data-today-refresh]')).toBeEnabled();await expect(page.locator('[data-today-time]')).toContainText('Ստուգված է՝');};
   await measure('cold-home',()=>page.goto(site+'/teacher.html?view=home',{waitUntil:'domcontentloaded'}),homeReady);
   await measure('warm-home',()=>page.reload({waitUntil:'domcontentloaded'}),homeReady);
   await measure('classes',()=>page.locator('.hm-role-nav a[href$="view=classes"]').click(),()=>expect(page.locator('#classList .teacher-class-button').filter({hasText:klass.name})).toBeVisible());
   await measure('archive',()=>page.locator('.hm-role-nav a[href$="view=archive"]').click(),()=>expect(page.locator('.archive-group').first()).toBeVisible());
   await page.locator('.hm-role-nav a[href$="view=classes"]').click();await expect(page.locator('#classList')).toBeVisible();
   await measure('selected-class',()=>page.locator('#classList .teacher-class-button').filter({hasText:klass.name}).click(),()=>expect(page.locator('#rosterAnalyticsCard')).toBeVisible());
   await measure('unit-switch',()=>page.locator('#teacherUnitFilter').selectOption(option.curriculumReleaseId+':'+option.unitId),async()=>{await expect(page.locator('#teacherUnitFilter')).toHaveValue(option.curriculumReleaseId+':'+option.unitId);await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();await expect(page.locator('#matrixUnitTitle')).toHaveText(option.unitTitleHy);});
   await measure('review',()=>page.locator('#teacherOpenWrittenWork').click(),()=>expect(page.locator('[data-writing-filter]')).toBeVisible());
   if(responseFixture){const responseUrl=new URL(site+'/teacher.html');responseUrl.searchParams.set('view','class');responseUrl.searchParams.set('class',responseFixture.classId);for(const [k,v] of Object.entries(responseFixture.selection))responseUrl.searchParams.set(({assignmentId:'assignment',curriculumReleaseId:'release',unitId:'unit'})[k],v);
   await page.goto(responseUrl.href,{waitUntil:'domcontentloaded'});await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();await page.locator('#teacherOpenWrittenWork').click();await expect(page.locator('[data-writing-filter]')).toBeVisible();await page.locator('[data-writing-filter]').selectOption('all');const responseButton=page.locator('[data-writing-open="'+responseFixture.workId+'"]');await expect(responseButton).toBeVisible();
   await measure('response-open',()=>responseButton.click(),async()=>{await expect(page.locator('.written-submitted .written-response')).toBeVisible();await expect(page.locator('.written-submitted .written-response')).not.toBeEmpty();});
   }
   check(side+': no page errors in sample '+iteration,pageErrors.length===0);
   check(side+': no browser mutations in sample '+iteration,blocked===0);await context.close();
   console.log(`${side} sample ${iteration+1}/10 complete`);
  }
 }
 report.summary=[];
 for(const side of ['A','B'])for(const scenario of [...new Set(report.samples.map(s=>s.scenario))]){const rows=report.samples.filter(s=>s.side===side&&s.scenario===scenario);if(!rows.length)continue;report.summary.push({side,scenario,n:rows.length,p50Ms:quantile(rows.map(s=>s.ms),.5),p95Ms:quantile(rows.map(s=>s.ms),.95),medianRequests:quantile(rows.map(s=>s.requestCount),.5),medianBytes:quantile(rows.map(s=>s.bytes),.5)});}
 await waitForRelease({expectedCommit:process.env.GITHUB_SHA});check('production source unchanged after measurement',true);
 report.budgetResults=['cold-home','warm-home','selected-class','classes'].map(scenario=>{const rows=report.samples.filter(s=>s.scenario===scenario),limitMs=scenario==='selected-class'?2000:scenario==='classes'?200:3000,p95Ms=quantile(rows.map(s=>s.ms),.95);return {scenario,p95Ms,limitMs,met:p95Ms<=limitMs};});
 report.timingInstrumentation={legacy:'Node elapsed time until the existing Playwright polling assertions finish; retained unchanged for paired comparison.',readiness:'Same visible dashboard + enabled Today refresh + checked snapshot predicate, observed on an animation frame after DOM changes; whole navigation starts at the same Node action timestamp.',baseline:'Earlier reports have no exact DOM timestamp. Do not compare their polling elapsed times as exact historical readiness or claim a like-for-like exact readiness improvement.'};
 report.homeReadinessBudgetResults=['cold-home','warm-home'].map(scenario=>{const rows=report.samples.filter(s=>s.scenario===scenario),p95Ms=quantile(rows.map(s=>s.readiness.ms),.95);return {scenario,method:'visible-home-today-v1',n:rows.length,p95Ms,limitMs:3000,met:p95Ms<=3000,pollingP95Ms:quantile(rows.map(s=>s.ms),.95)};});
 report.status='passed';report.statusMeaning='All guarded read-only journeys completed; budgetResults separately records performance targets.';console.log(JSON.stringify(report.summary));
}catch(error){report.status='failed';report.failedStage=stage;report.errorName=error?.name;report.timeout=/timeout|timed out/i.test(error?.message??'');process.exitCode=1;console.error('Teacher performance acceptance failed at '+stage+' ('+report.errorName+', timeout='+report.timeout+')');}
finally{for(const s of sessions){let ok=false;try{ok=(await fetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+s.access_token},signal:AbortSignal.timeout(30000)})).ok;}catch{}report.checks.push({label:'local QA session closed',passed:ok});if(!ok){report.status='failed';process.exitCode=1;}}await browser?.close();report.finishedAt=new Date().toISOString();await save();}
