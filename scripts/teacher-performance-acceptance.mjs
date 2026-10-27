import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {waitForRelease} from './wait-for-production-release.mjs';
const phase=process.env.TEACHER_PERF_PHASE??'baseline',site='https://www.haiedu.am';
const fixture=JSON.parse(process.env.QA_TENANT_FIXTURES_JSON??'{}');
const config=await readFile(new URL('../web/config.js',import.meta.url),'utf8');
const url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
const report={scope:'Read-only teacher performance',phase,revision:process.env.GITHUB_SHA,startedAt:new Date().toISOString(),status:'running',samples:[],checks:[],profile:{browser:'Chromium',runner:'GitHub ubuntu-latest',viewport:'1365x950',cpu:'unthrottled shared runner',network:'CDP 4G: 150 ms latency, 1.6 Mbps down, 750 Kbps up',cold:'fresh browser context and HTTP cache',warm:'same context reload',iterations:10},budgets:{usefulHomeP95Ms:3000,selectedClassP95Ms:2000,loadedNavigationP95Ms:200}};
let browser,stage='preflight';const sessions=[];
function check(label,passed){report.checks.push({label,passed});if(!passed)throw Error(label);}
const quantile=(a,q)=>a.toSorted((a,b)=>a-b)[Math.ceil(a.length*q)-1];
async function save(){await mkdir('qa-results',{recursive:true});await writeFile('qa-results/teacher-performance.json',JSON.stringify(report,null,2));}
async function api(token,fn,body){const start=performance.now();const res=await fetch(`${url}/functions/v1/${fn}`,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const raw=await res.text();return {status:res.status,data:JSON.parse(raw),ms:performance.now()-start,bytes:Buffer.byteLength(raw),serverTiming:res.headers.get('server-timing')};}
try{
 check('reviewed main and designated two-school fixtures',process.env.GITHUB_REF==='refs/heads/main'&&fixture.dedicatedQa===true&&fixture.A?.schoolId!==fixture.B?.schoolId);
 await waitForRelease({expectedCommit:process.env.GITHUB_SHA});
 browser=await chromium.launch({headless:true});
 for(const side of ['A','B']){
  stage=side+': login';const email=process.env[`QA_SCHOOL_${side}_TEACHER_EMAIL`],password=process.env[`QA_SCHOOL_${side}_TEACHER_PASSWORD`];
  check(side+': credentials configured',Boolean(email&&password));
  const login=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(30000)});
  const session=await login.json();session.expires_at??=Math.floor(Date.now()/1000)+Number(session.expires_in);check(side+': designated teacher identity',login.ok&&session.user?.id===fixture[side].teacherId);sessions.push(session);
  const base=await api(session.access_token,'get-teacher-dashboard',{});check(side+': initial authorized directory',base.status===200&&base.data.classes.some(c=>c.id===fixture[side].classId));
  report.checks.push({label:side+': fixture size',active:base.data.classes.filter(c=>c.isActive).length,archived:base.data.classes.filter(c=>!c.isActive).length});
  const klass=base.data.classes.find(c=>c.id===fixture[side].classId);
  const option=klass.unitOptions.find(x=>x.unitId!==klass.selectedUnit?.unitId&&!x.readOnlyHistory)??klass.unitOptions.find(x=>x.unitId!==klass.selectedUnit?.unitId);
  check(side+': unit-switch fixture exists',Boolean(option));
  const foreign=fixture[side==='A'?'B':'A'];const denied=await api(session.access_token,'get-teacher-dashboard',{selection:{assignmentId:foreign.assignmentId,curriculumReleaseId:foreign.curriculumReleaseId,unitId:foreign.unitId},...(phase==='after'?{readMode:'class',classId:foreign.classId}:{})});
  check(side+': foreign class denied',denied.status===403);
  for(let iteration=0;iteration<10;iteration++){
   const context=await browser.newContext({viewport:{width:1365,height:950},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:site,localStorage:[{name:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,value:JSON.stringify(session)}]}]}});
   let requests=[],blocked=0;
   await context.route('**/functions/v1/**',route=>{const req=route.request(),fn=new URL(req.url()).pathname.split('/').pop();let b={};try{b=req.postDataJSON()??{};}catch{}
    const allowed=['get-teacher-dashboard','get-teacher-student','get-profile'].includes(fn)||(fn==='manage-student-invitation'&&b.action==='list')||(fn==='manage-written-work'&&['queue','inspect'].includes(b.action));
    if(req.method()==='OPTIONS'||allowed)return route.continue();blocked++;return route.abort();});
   const page=await context.newPage();page.setDefaultTimeout(45000);
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8});
   page.on('requestfinished',req=>{const p=new URL(req.url()).pathname;if(p.includes('/functions/v1/')||p.includes('/rest/v1/'))requests.push(req);});
   async function measure(scenario,action,ready){stage=`${side}:${iteration}:${scenario}`;requests=[];const start=performance.now();await action();await ready();const ms=performance.now()-start;
    const calls=[];for(const req of requests){const res=await req.response();const size=await req.sizes().catch(()=>({responseBodySize:0}));calls.push({endpoint:new URL(req.url()).pathname,ms:req.timing().responseEnd,status:res?.status(),bytes:size.responseBodySize,serverTiming:await res?.headerValue('server-timing')});}
    report.samples.push({side,iteration,scenario,ms,requestCount:calls.length,bytes:calls.reduce((n,c)=>n+c.bytes,0),calls});await save();
   }
   const homeReady=()=>expect(page.locator('#dashboardPanel')).toBeVisible();
   await measure('cold-home',()=>page.goto(site+'/teacher.html?view=home',{waitUntil:'domcontentloaded'}),homeReady);
   await measure('warm-home',()=>page.reload({waitUntil:'domcontentloaded'}),homeReady);
   await measure('classes',()=>page.locator('.hm-role-nav a[href$="view=classes"]').click(),()=>expect(page.locator('#classList .teacher-class-button').filter({hasText:klass.name})).toBeVisible());
   await measure('archive',()=>page.locator('.hm-role-nav a[href$="view=archive"]').click(),()=>expect(page.locator('.archive-group').first()).toBeVisible());
   await page.locator('.hm-role-nav a[href$="view=classes"]').click();await expect(page.locator('#classList')).toBeVisible();
   await measure('selected-class',()=>page.locator('#classList .teacher-class-button').filter({hasText:klass.name}).click(),()=>expect(page.locator('#rosterAnalyticsCard')).toBeVisible());
   await measure('unit-switch',()=>page.locator('#teacherUnitFilter').selectOption(option.curriculumReleaseId+':'+option.unitId),async()=>{await expect(page.locator('#teacherUnitFilter')).toHaveValue(option.curriculumReleaseId+':'+option.unitId);await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();await expect(page.locator('#matrixUnitTitle')).toHaveText(option.unitTitleHy);});
   await measure('review',()=>page.locator('#teacherOpenWrittenWork').click(),()=>expect(page.locator('[data-writing-filter]')).toBeVisible());
   check(side+': no browser mutations in sample '+iteration,blocked===0);await context.close();
   console.log(`${side} sample ${iteration+1}/10 complete`);
  }
 }
 report.summary=[];
 for(const side of ['A','B'])for(const scenario of [...new Set(report.samples.map(s=>s.scenario))]){const rows=report.samples.filter(s=>s.side===side&&s.scenario===scenario);report.summary.push({side,scenario,n:rows.length,p50Ms:quantile(rows.map(s=>s.ms),.5),p95Ms:quantile(rows.map(s=>s.ms),.95),medianRequests:quantile(rows.map(s=>s.requestCount),.5),medianBytes:quantile(rows.map(s=>s.bytes),.5)});}
 report.status='passed';console.log(JSON.stringify(report.summary));
}catch{report.status='failed';report.failedStage=stage;process.exitCode=1;console.error('Teacher performance acceptance failed at '+stage);}
finally{for(const s of sessions)await fetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+s.access_token}}).catch(()=>{});await browser?.close();report.finishedAt=new Date().toISOString();await save();}
