// Child of run-local-staging.py. The parent owns the backend and supplies only
// synthetic sign-in accounts and the public local key, never its service key.
import assert from 'node:assert/strict';
import {cp,mkdir,mkdtemp,readFile,rm,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {runAssessmentFilesJourney} from './local-staging-assessment-files.mjs';
import {dashboardReady,dashboardInteraction,dashboardSignedOut,dashboardScreenshots,dashboardLateLogout} from './local-staging-dashboard-checks.mjs';
import {buildWebAssets,digest} from './build-web-assets.mjs';
import {serveWeb} from '../tests/fixtures/built-web-server.mjs';
import {STAGING_VERSION,loopbackOrigin,guardedStagingFetch,stagingUrl} from './staging-target.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
assert.equal(process.argv.length,4,'Expected private owned fixture and output paths');
const fixture=JSON.parse(await readFile(process.argv[2],'utf8'));
loopbackOrigin(fixture.backendOrigin);
assert.match(fixture.runId,/^[a-f0-9]{24}$/);
assert.match(fixture.sourceCommit,/^[a-f0-9]{40}$/);
assert.ok(['two-school-dashboards-v2','two-school-assessment-files-v3'].includes(fixture.fixtureVersion));
assert.equal(fixture.accounts.length,6);
assert.equal(fixture.schools.length,2);
for(const account of fixture.accounts) {
  assert.match(account.email,/^[a-f0-9]{24}@example\.invalid$/);
  assert.ok(['student','teacher','school_admin'].includes(account.role));
  assert.ok(['A','B'].includes(account.school));
}
assert.equal(new Set(fixture.accounts.map(a=>a.school+':'+a.role)).size,6);
await mkdir(fixture.screenshotDir,{recursive:true});
const checks=[];
const check=name=>{checks.push(name);console.log('PASS '+name);};
const temporary=await mkdtemp(path.join(tmpdir(),'haiedu-bf21-web-'));
let server,browser;
try {
  await cp(path.join(root,'web'),path.join(temporary,'web'),{recursive:true});
  await mkdir(path.join(temporary,'scripts'));
  for(const name of ['package.json','package-lock.json','scripts/build-web-assets.mjs','scripts/build-teacher-entry.mjs'])await cp(path.join(root,name),path.join(temporary,name));
  await symlink(path.join(root,'node_modules'),path.join(temporary,'node_modules'),'dir');
  const configPath=path.join(temporary,'web/config.js');
  const original=await readFile(configPath,'utf8');
  const config=original.replace(/^export const SUPABASE_URL = .*;$/m,`export const SUPABASE_URL = ${JSON.stringify(fixture.backendOrigin)};`)
    .replace(/^export const SUPABASE_PUBLISHABLE_KEY = .*;$/m,`export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(fixture.anonKey)};`);
  assert.notEqual(config,original);
  assert.ok(config.includes(fixture.backendOrigin)&&!config.includes('xzyjvwiiibuarpotppid'));
  await writeFile(configPath,config);
  // The local provider has CAPTCHA disabled. Browser requests are restricted
  // to the two owned origins below. This is
  // generated staging configuration, not a change to production's protection.
  await writeFile(path.join(temporary,'web/auth-challenge-config.mjs'),
    'export const AUTH_CHALLENGE=Object.freeze({enabled:false,provider:"turnstile",siteKey:""});\n');
  execFileSync(process.execPath,['scripts/build-teacher-entry.mjs'],{cwd:temporary,stdio:'pipe'});
  const manifest=await buildWebAssets({root:temporary,update:true});
  server=await serveWeb(path.join(temporary,'dist-web'));
  const owned={runId:fixture.runId,sourceCommit:fixture.sourceCommit,fixtureVersion:fixture.fixtureVersion,
    backendOrigin:fixture.backendOrigin,frontendOrigin:server.origin,buildId:manifest.buildId};
  const target={schemaVersion:STAGING_VERSION,kind:'owned-local',...owned};
  await writeFile(path.join(temporary,'dist-web/staging-target.json'),JSON.stringify(target));
  const fetchLocal=guardedStagingFetch(target,owned);
  const identity=await (await fetchLocal('/_local/identity')).json();
  assert.deepEqual(identity,{kind:'owned-local',runId:fixture.runId,sourceCommit:fixture.sourceCommit});
  assert.equal((await fetchLocal('/auth/v1/health',{headers:{apikey:fixture.anonKey}})).status,200,'owned_auth_gateway_ready');
  assert.deepEqual(await (await fetchLocal(server.origin+'/staging-target.json')).json(),target);
  const servedManifest=await (await fetchLocal(server.origin+'/asset-manifest.json')).json();
  assert.equal(servedManifest.buildId,manifest.buildId);
  assert.equal(manifest.inputs['web/config.js'],digest(config));
  // Verify every served build asset, not only a self-reported build label.
  for(const [name,asset] of Object.entries(manifest.assets)) {
    const response=await fetchLocal(server.origin+'/'+name);
    assert.equal(response.status,200);
    assert.equal(digest(Buffer.from(await response.arrayBuffer())),asset.sha256);
  }
  check('owned target identity and separate browser build verified before sign-in');
  browser=await chromium.launch({headless:true,...(process.env.WRITING_QA_CHROMIUM?{executablePath:process.env.WRITING_QA_CHROMIUM}:{})});
  const blocked=[];
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.routeWebSocket('**/*',websocket=>{blocked.push('websocket-outside-dashboard-scope');websocket.close();});
  await context.route('**/*',async route=>{
    try {stagingUrl(target,route.request().url());}
    catch {blocked.push('outside-owned-origins');await route.abort('blockedbyclient');return;}
    const response=await route.fetch({maxRedirects:0});
    if(response.status()>=300&&response.status()<400) {
      blocked.push('http-redirect');await route.abort('blockedbyclient');return;
    }
    await route.fulfill({response});
  });
  const diagnostics=[];
  context.on('page',page=>{
  page.on('pageerror',error=>diagnostics.push({pageError:error.name,message:error.message}));
  page.on('response',response=>{
    const url=new URL(response.url());
    if(url.origin===target.backendOrigin)diagnostics.push({path:url.pathname,status:response.status()});
  });
  });
  const page=await context.newPage();
  if(fixture.fixtureVersion==='two-school-assessment-files-v3') {
    await runAssessmentFilesJourney({page,fixture,target,check,diagnostics});
  } else for(const account of ['student','teacher','school_admin'].flatMap(role=>['A','B'].map(school=>fixture.accounts.find(a=>a.role===role&&a.school===school)))) {
    const school=fixture.schools.find(s=>s.label===account.school);
    const other=fixture.schools.find(s=>s.label!==account.school);
    const destination={student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[account.role];
    let retainedToken=null;
    try {
      await page.goto(server.origin+'/account-access');
      assert.equal(await page.locator('meta[name="haiedu-build"]').getAttribute('content'),manifest.buildId);
      await page.locator('#loginEmail').fill(account.email);
      await page.locator('#loginPassword').fill(account.password);
      await page.locator('#loginForm button[type="submit"]').click();
      try {await page.waitForURL(server.origin+destination,{timeout:20000});}
      catch {
        let message=JSON.stringify({diagnostics,notice:await page.locator('#loginMessage').textContent().catch(()=>null),blocked});
        for(const secret of [account.email,account.password,fixture.anonKey])message=message.replaceAll(secret,'[local-secret]');
        throw Error('local_signin_failed '+message);
      }
      await dashboardReady(page,account,school,other);
      if(account.school==='A')await dashboardScreenshots(page,account,fixture.screenshotDir);
      await dashboardInteraction(page,account,school);
      assert.equal(diagnostics.filter(d=>d.pageError||d.status>=400).length,0,'dashboard_initial_network_and_script_errors');
      check(account.school+' '+account.role+': actual dashboard, owned class data and navigation');
      async function call(endpoint,body={},authentication='session',method='POST') {
        return page.evaluate(async ({base,anonKey,endpoint,body,authentication,method,retainedToken})=>{
          const session=Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))
            .map(k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}}).find(v=>v?.access_token)??(retainedToken?{access_token:retainedToken}:null);
          if(!session)throw Error('real_browser_session_required');
          const headers={apikey:anonKey,'Content-Type':'application/json'};
          if(authentication!=='none')headers.Authorization='Bearer '+(authentication==='session'?session.access_token:'invalid-token');
          const response=await fetch(base+endpoint,{method,headers,redirect:'error',...(method==='GET'?{}:{body:JSON.stringify(body)})});
          const text=await response.text();let value;try{value=JSON.parse(text);}catch{value=null;}
          return {status:response.status,value};
        },{base:target.backendOrigin,anonKey:fixture.anonKey,endpoint,body,authentication,method,retainedToken});
      }
      let response=await call('/rest/v1/profiles?select=id,role',{},'session','GET');
      assert.equal(response.status,200,'own_profile_status');
      // Student RLS is strictly own-profile; staff may also see their school's
      // members. In all cases the other school's accounts must remain hidden.
      assert.ok(response.value.some(p=>p.id===account.id&&p.role===account.role),'own_profile_visible');
      const foreignActors=new Set(fixture.accounts.filter(a=>a.school!==account.school).map(a=>a.id));
      assert.ok(response.value.every(p=>!foreignActors.has(p.id)),'foreign_profiles_hidden');
      const service={student:'get-student-classes',teacher:'get-teacher-dashboard',school_admin:'get-school-admin-overview'}[account.role];
      const body=account.role==='teacher'?{readMode:'directory'}:{};
      response=await call('/functions/v1/'+service,body);
      assert.equal(response.status,200,account.role+'_service_'+(response.value?.error??'status'));
      if(account.role==='school_admin') {
        assert.deepEqual(response.value.schools.map(s=>s.id),[school.school]);
        assert.equal(response.value.schools[0].counts.students,1);
        assert.equal(response.value.schools[0].counts.teachers,1);
        assert.deepEqual(response.value.schools[0].teachers[0].classes.map(c=>c.id),[school.class]);
      } else {
        assert.deepEqual(response.value.classes.map(c=>c.id),[school.class]);
        if(account.role==='student')assert.deepEqual(response.value.classes.map(c=>c.subjectId),[school.subject]);
      }
      assert.ok(!JSON.stringify(response.value).includes(other.class),'foreign_class_absent');
      check(account.school+' '+account.role+': real browser sign-in, role handoff and school-scoped service read');
      const wrongService=account.role==='student'?'get-school-admin-overview':'get-student-classes';
      response=await call('/functions/v1/'+wrongService);
      assert.equal(response.status,403,'wrong_role_refused');
      if(account.role==='teacher') {
        response=await call('/functions/v1/get-teacher-dashboard',{readMode:'class',classId:other.class,assignmentId:other.assignment});
        assert.equal(response.status,403,'cross_school_class_refused');
      } else if(account.role==='student') {
        response=await call('/functions/v1/get-student-dashboard',{enrollmentId:other.enrollment,curriculumReleaseId:other.release,unitId:other.unit});
        assert.equal(response.status,403,'cross_school_learning_context_refused');
      } else {
        for(const foreignService of ['get-school-teachers','get-school-performance-analytics']) {
          response=await call('/functions/v1/'+foreignService,{schoolId:other.school});
          assert.equal(response.status,403,'cross_school_dashboard_refused');
        }
      }
      for(const auth of ['none','invalid']) {
        response=await call('/functions/v1/'+service,body,auth);
        assert.equal(response.status,401,'missing_or_malformed_identity_refused');
      }
      response=await call('/rest/v1/rpc/service_reserve_session_rate_budgets',{});
      assert.ok([401,403,404].includes(response.status),'privileged_rpc_refused');
      retainedToken=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')).map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token).access_token);
      if(account.school==='A') {
        await dashboardLateLogout(page,account,school,other,target.backendOrigin);
        check(account.school+' '+account.role+': cross-tab sign-out keeps delayed real data hidden');
      }
      await dashboardSignedOut(page,account.role,account.school==='A');
      check(account.school+' '+account.role+': UI sign-out and private-page reopening hide prior data');
      response=await call('/functions/v1/'+service,body);
      assert.ok([401,403].includes(response.status),'revoked_session_refused');
      assert.equal(diagnostics.filter(d=>d.pageError).length,0,'dashboard_journey_script_errors');
      check(account.school+' '+account.role+': wrong-role, missing/malformed and revoked-session access refused');
    } catch(error) {
      await page.screenshot({path:path.join(fixture.screenshotDir,account.school+'-'+account.role+'-failure.png'),fullPage:true}).catch(()=>{});
      let message=String(error.stack??error)+' '+JSON.stringify(diagnostics);
      for(const secret of [...fixture.accounts.flatMap(a=>[a.email,a.password]),fixture.anonKey,retainedToken].filter(Boolean))message=message.replaceAll(secret,'[local-secret]');
      throw Error(message);
    } finally {diagnostics.length=0;retainedToken=null;}
  }
  assert.equal(blocked.length,0,'unexpected_browser_network_destination');
  await writeFile(process.argv[3],JSON.stringify({passed:true,buildId:manifest.buildId,
    checks,accounts:6,schools:2,subjects:2,browserNetworkRefusals:blocked.length,
    boundary:fixture.fixtureVersion==='two-school-assessment-files-v3'?'Real local sign-in, native assessment completion and private file/student submission/teacher review through unchanged services in two fictional schools. No hosted or production acceptance claim.':'Real local sign-in, unmodified dashboard documents and services for two fictional schools; same-browser account switching and UI logout. Synthetic navigation curriculum only; no assessment, file, hosted or production acceptance claim.'},null,2)+'\n');
} finally {
  await browser?.close();await server?.close();await rm(temporary,{recursive:true,force:true});
}
