import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
import {serveSecurityWeb} from '../fixtures/browser-security-server.mjs';
import {buildWebAssets,projectRoot} from '../../scripts/build-web-assets.mjs';
import {installSignedOutClient} from '../fixtures/built-web-server.mjs';
import {installStudentHomeFixture} from '../fixtures/student-home-fixture.mjs';
import {installTeacherPerformanceFixture} from '../fixtures/teacher-performance-browser.mjs';
import {installAdminTextFixture,installTaskTextFixture,installAuthFlowFixture} from '../fixtures/browser-text-safety.mjs';

let browser,server,scratch,outdir,manifest;
before(async()=>{
 scratch=await mkdtemp(path.join(tmpdir(),'haiedu-bf13-'));
 outdir=path.join(projectRoot,'dist-web-security');
 manifest=await buildWebAssets({archive:path.join(scratch,'archive'),outdir,update:true});
 // The canonical build inlines these controllers. The standalone boundary
 // fixtures execute the same real source modules copied to the build directory;
 // the 29 page boots and Home/teacher/admin cases below use canonical bundles.
 const task='/student-teacher-tasks.mjs',review='/teacher-task-review.mjs';
 const html='<!doctype html><meta charset="utf-8"><main id="root"></main><script type="module" src="/__security/tasks.mjs"></script>';
 server=await serveSecurityWeb({root:outdir,routes:{
  '/__security/tasks.html':['text/html',html],
  '/__security/tasks.mjs':['text/javascript',`
   import {mountStudentTeacherTasks} from '${task}';
   import {mountTeacherTaskReview} from '${review}';
   const root=document.getElementById('root');
   if(new URLSearchParams(location.search).get('teacher'))mountTeacherTaskReview({root,client:window.__taskClient,actorId:window.__taskActor,context:window.__taskContext,initialSubmissionId:'fixture-submission'});
   else mountStudentTeacherTasks({root,client:window.__taskClient,actorId:window.__taskActor});
  `],
 }});
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await server?.close();if(scratch)await rm(scratch,{recursive:true,force:true});if(outdir)await rm(outdir,{recursive:true,force:true});});

async function pageFor(t,{allowedOrigins=[server.origin]}={}){
 const context=await browser.newContext({serviceWorkers:'block'});t.after(()=>context.close());
 const page=await context.newPage();page.setDefaultTimeout(5000);
 const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__unsafeText=0;window.__policyEvents=[];
  document.addEventListener('securitypolicyviolation',event=>window.__policyEvents.push({directive:event.effectiveDirective,disposition:event.disposition}));
 });
 page.__security={errors,external};
 await context.route('**/*',route=>{if(allowedOrigins.includes(new URL(route.request().url()).origin))return route.continue();external.push(new URL(route.request().url()).origin);return route.abort();});
 return page;
}

async function cleanApplication(page){
 assert.equal(await page.evaluate(()=>window.__unsafeText),0);
 assert.equal(await page.locator('[onerror],[onload]').count(),0);
 assert.deepEqual(page.__security.errors,[]);assert.deepEqual(page.__security.external,[]);
 assert.deepEqual(await page.evaluate(()=>window.__policyEvents),[],'Legitimate application behavior has no observed report-only violation');
}

const pages=Object.keys(JSON.parse(await readFile(new URL('../../web-build/current.json',import.meta.url))).pages);
for(const file of pages)test(`security headers and report-only CSP preserve compiled signed-out ${file}`,async t=>{
 const page=await pageFor(t);await page.addInitScript(installSignedOutClient);
 const response=await page.goto(server.origin+'/'+file);await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('meta[name="haiedu-build"]').getAttribute('content'),manifest.buildId);
 assert.equal(response.headers()['x-content-type-options'],'nosniff');
 assert.equal(response.headers()['referrer-policy'],'strict-origin-when-cross-origin');
 assert.equal(response.headers()['x-frame-options'],'SAMEORIGIN');
 assert.match(response.headers()['content-security-policy-report-only'],/default-src 'none'/);
 await cleanApplication(page);
});

const payload='<img src=x onerror="window.__unsafeText++"> Հայերեն & " \' </textarea><script>window.__unsafeText++</script>';

test('compiled student Home renders synthetic stored context names as literal text',async t=>{
 const page=await pageFor(t);
 await page.addInitScript(`window.__haieduSupabaseClient=(${installStudentHomeFixture.toString()})({contexts:[{enrollmentId:'76000000-0000-4000-8000-000000000001',curriculumReleaseId:'76000000-0000-4000-8000-000000000002',unitId:'76000000-0000-4000-8000-000000000003',subjectProgramId:'76000000-0000-4000-8000-000000000004',unitSequence:1,subjectCode:'synthetic',subjectNameHy:${JSON.stringify(payload)},gradeLabelHy:'Դասարան',gradeNumber:7,unitTitleHy:${JSON.stringify(payload)},className:${JSON.stringify(payload)},schoolName:${JSON.stringify(payload)},academicYearLabel:'2026–2027',releaseNumber:1}]});`);
 await page.goto(server.origin+'/index.html?view=courses');await expect(page.locator('.amp-subject-card')).toBeVisible();
 assert.ok((await page.locator('.amp-subject-card').innerText()).includes(payload));
 await cleanApplication(page);
});

test('compiled school teacher renders stored roster and skill metadata without executing it',async t=>{
 const page=await pageFor(t),skill={skillId:'s1',code:'SYN-S01',nameHy:payload,status:'secure',band:'secure',percent:90,evidenceCount:4};
 const student={id:'fixture-student',displayName:payload,matrix:[skill],weakSkills:[],latestActivityAt:null};
 await page.addInitScript(installTeacherPerformanceFixture,{archives:0,initialFailure:false,institutionalTeacher:true,analytics:{students:[student],studentCount:1,skills:[skill]},studentDetails:{student,skills:[skill],matrix:[skill],recentAttempts:[],sessions:[]}});
 await page.goto(server.origin+'/teacher.html?view=classes');await page.locator('#classList .teacher-class-button').first().click();
 await page.locator('#matrixSkillNames summary').click();await expect(page.locator('#matrixSkillNameList dd')).toHaveText(payload);
 await expect(page.locator('.student-matrix-name button')).toHaveText(payload);await cleanApplication(page);
});

test('compiled admin renders stored names literally and permits only same-origin attention links',async t=>{
 const page=await pageFor(t);await page.addInitScript(installAdminTextFixture,{payload});
 await page.goto(server.origin+'/admin.html');await expect(page.locator('#attentionList article')).toHaveCount(3);
 assert.ok((await page.locator('#recentActivity').innerText()).includes(payload));
 await expect(page.locator('#attentionList a')).toHaveCount(1);await expect(page.locator('#attentionList a')).toHaveAttribute('href','./admin-security.html');
 assert.ok((await page.evaluate(()=>window.__textCalls)).every(c=>c.name==='get-admin-dashboard'&&c.action==='overview'));
 await cleanApplication(page);
});

for(const teacher of [false,true])for(const url of ['javascript:window.__unsafeText++','data:text/html,test','http://example.org','https://name:pass@example.org'])test(`${teacher?'teacher review':'student task history'} displays invalid synthetic links as inert text: ${url.split(':')[0]}`,async t=>{
 const page=await pageFor(t);await page.addInitScript(installTaskTextFixture,{teacher,payload,url});
 const query=teacher?'?teacher=1':'?teacherTask=fixture-task&taskEnrollment=fixture-enrollment&taskRelease=fixture-release&taskUnit=fixture-unit';
 await page.goto(server.origin+'/__security/tasks.html'+query);
 const body=page.locator(teacher?'[data-tr-body]':'[data-task-body]');await expect(body.locator('h4').first()).toHaveText(payload);
 assert.ok((await body.innerText()).includes(url));assert.equal(await body.locator('a').count(),0);
 assert.ok((await page.evaluate(()=>window.__textCalls)).every(c=>c.action==='open'));
 await cleanApplication(page);
});

for(const teacher of [false,true])test(`${teacher?'teacher review':'student task history'} retains valid HTTPS links and quoted text`,async t=>{
 const page=await pageFor(t),url='https://example.org/document?a=1&b=2#part';await page.addInitScript(installTaskTextFixture,{teacher,payload,url});
 const query=teacher?'?teacher=1':'?teacherTask=fixture-task&taskEnrollment=fixture-enrollment&taskRelease=fixture-release&taskUnit=fixture-unit';
 await page.goto(server.origin+'/__security/tasks.html'+query);
 const body=page.locator(teacher?'[data-tr-body]':'[data-task-body]');await expect(body.locator('h4').first()).toHaveText(payload);
 await expect(body.locator('a')).toHaveCount(teacher?2:3);
 for(const link of await body.locator('a').all()){
  assert.equal(await link.getAttribute('href'),url);assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
 }
 await cleanApplication(page);
});

test('browser refuses a script response with the wrong MIME type',async t=>{
 const page=await pageFor(t),response=await page.goto(server.origin+'/__security/mime.html');
 await page.waitForFunction(()=>window.__mimeReady===true);
 assert.equal(await page.evaluate(()=>window.__wrongMimeExecuted===true),false,'An incorrectly typed script must not execute');
 assert.equal(response.headers()['x-content-type-options'],'nosniff');
});

test('report-only CSP observes an inline-script violation without claiming enforcement',async t=>{
 const page=await pageFor(t),response=await page.goto(server.origin+'/__security/policy.html');
 await page.waitForFunction(()=>window.__policyReady===true);
 await expect.poll(()=>page.evaluate(()=>window.__violations.some(v=>v.directive==='script-src-elem'&&v.disposition==='report')),{timeout:1500}).toBe(true);
 assert.equal(await page.evaluate(()=>window.__inlinePolicyProbe),true,'The benign probe demonstrates that report-only is monitoring, not enforcement');
 assert.match(response.headers()['content-security-policy-report-only'],/script-src 'self'/);
});

test('framing allows a same-origin host and refuses a foreign-origin host',async t=>{
 const same=await pageFor(t);await same.addInitScript(()=>window.addEventListener('message',e=>{if(e.data==='bf13-frame-loaded')window.__frameLoaded=true;}));
 await same.goto(server.origin+'/__security/frame-host.html');
 await expect.poll(()=>same.evaluate(()=>window.__frameLoaded===true)).toBe(true);
 const foreign=await serveSecurityWeb({root:outdir,routes:{'/__security/host.html':['text/html',`<!doctype html><meta charset="utf-8"><iframe src="${server.origin}/__security/frame-target.html"></iframe>`]}});t.after(()=>foreign.close());
 const page=await pageFor(t,{allowedOrigins:[server.origin,foreign.origin]});
 await page.addInitScript(()=>window.addEventListener('message',e=>{if(e.data==='bf13-frame-loaded')window.__frameLoaded=true;}));
 const before=server.requests.filter(r=>r.path==='/__security/frame-target.html').length;
 await page.goto(foreign.origin+'/__security/host.html');await page.waitForLoadState('networkidle');
 assert.ok(server.requests.filter(r=>r.path==='/__security/frame-target.html').length>before,'The browser fetched the protected target');
 assert.equal(await page.evaluate(()=>window.__frameLoaded===true),false,'SAMEORIGIN prevents the target document executing in a foreign frame');
});

test('external navigation sends only the origin in its referrer and keeps external links usable',async t=>{
 const foreign=await serveSecurityWeb({root:outdir});t.after(()=>foreign.close());
 const page=await pageFor(t,{allowedOrigins:[server.origin,foreign.origin]});
 await page.goto(server.origin+'/__security/empty.html?private=synthetic-query');
 await page.evaluate(url=>{const a=document.createElement('a');a.id='external';a.href=url;a.textContent='External fixture';document.body.append(a);},foreign.origin+'/__security/empty.html');
 await page.locator('#external').click();await page.waitForURL(foreign.origin+'/__security/empty.html');
 const request=foreign.requests.find(r=>r.path==='/__security/empty.html');assert.equal(request.referrer,server.origin+'/');
 await cleanApplication(page);
});

test('permissions retain same-origin microphone access while disabling unused camera and location',async t=>{
 const page=await pageFor(t);await page.goto(server.origin+'/__security/empty.html');
 const permissions=await page.evaluate(()=>Object.fromEntries(['microphone','camera','geolocation'].map(name=>[name,document.featurePolicy.allowsFeature(name)])));
 assert.deepEqual(permissions,{microphone:true,camera:false,geolocation:false});await cleanApplication(page);
});

test('native blob download and audio decoding remain usable under the candidate headers',async t=>{
 const page=await pageFor(t);await page.goto(server.origin+'/__security/empty.html');
 await page.evaluate(()=>{
  const a=document.createElement('a');a.id='download';a.download='fixture.pdf';a.textContent='Download';a.href=URL.createObjectURL(new Blob(['%PDF-1.4\n%%EOF'],{type:'application/pdf'}));document.body.append(a);
 });
 const pending=page.waitForEvent('download');await page.locator('#download').click();const download=await pending;
 assert.equal(download.suggestedFilename(),'fixture.pdf');assert.equal(await download.failure(),null);
 const audio=await page.evaluate(async()=>{
  const bytes=new ArrayBuffer(44+1600),view=new DataView(bytes),text=(offset,value)=>[...value].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,1600,true);
  const url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'})),player=new Audio();
  try{const loaded=new Promise((resolve,reject)=>{player.onloadedmetadata=resolve;player.onerror=()=>reject(Error('Fixture audio decode failed'));});player.src=url;player.load();await loaded;return{duration:player.duration,ready:player.readyState};}finally{player.src='';URL.revokeObjectURL(url);}
 });
 assert.ok(audio.duration>0);assert.ok(audio.ready>=1);await cleanApplication(page);
});

test('governed HTTPS learning images retain their supported origin contract and literal alt text',async t=>{
 const page=await pageFor(t);let intercepted=0;
 await page.context().route('https://images.example.invalid/diagram.svg',async route=>{intercepted++;await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="green"/></svg>'});});
 await page.goto(server.origin+'/__security/empty.html');
 await page.evaluate(async alt=>{const {renderLearningStimulus}=await import('/learning-stimulus.mjs');renderLearningStimulus(document.getElementById('fixture'),{kind:'image',url:'https://images.example.invalid/diagram.svg',altHy:alt});},payload);
 await expect.poll(()=>page.locator('#fixture img').evaluate(img=>img.naturalWidth)).toBe(32);
 assert.equal(intercepted,1);await expect(page.locator('#fixture img')).toHaveAttribute('alt',payload);await cleanApplication(page);
});

test('compiled login preserves rejection, retry and same-origin role navigation with synthetic Auth',async t=>{
 const page=await pageFor(t);await page.addInitScript(installAuthFlowFixture);await page.goto(server.origin+'/account-access.html');
 await page.locator('#loginEmail').fill(['bf13','example.invalid'].join('@'));await page.locator('#loginPassword').fill('synthetic-invalid-password');
 await page.locator('#loginForm button[type=submit]').click();await expect(page.locator('#loginMessage')).not.toHaveText('');
 assert.deepEqual(await page.evaluate(()=>window.__authCalls),['signIn']);await expect(page.locator('#loginForm button[type=submit]')).toBeEnabled();
 await page.locator('#loginPassword').fill('synthetic-correct-password');await page.locator('#loginForm button[type=submit]').click();await page.waitForURL(server.origin+'/teacher.html');
 await cleanApplication(page);
});

test('compiled reset form preserves its validation and same-origin recovery destination',async t=>{
 const page=await pageFor(t);await page.addInitScript(installAuthFlowFixture);await page.goto(server.origin+'/account-access.html?view=reset');
 await page.locator('#resetForm button[type=submit]').click();assert.deepEqual(await page.evaluate(()=>window.__authCalls),[]);
 await page.locator('#resetEmail').fill(['bf13','example.invalid'].join('@'));await page.locator('#resetForm button[type=submit]').click();await expect(page.locator('#resetMessage')).not.toHaveText('');
 assert.deepEqual(await page.evaluate(()=>window.__authCalls),['reset']);assert.equal(await page.evaluate(()=>window.__resetRedirect),server.origin+'/account-access');
 await cleanApplication(page);
});

test('the real bundled Auth SDK can reach the configured origin through an intercepted synthetic response',async t=>{
 const page=await pageFor(t);let intercepted=0;
 const {SUPABASE_URL}=await import('../../web/config.js');
 await page.context().route(SUPABASE_URL+'/auth/v1/token*',async route=>{
  intercepted++;const request=route.request();
  await route.fulfill({status:request.method()==='OPTIONS'?204:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':server.origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':request.headers()['access-control-request-headers']??'apikey, authorization, content-type, x-client-info, x-supabase-api-version'},body:request.method()==='OPTIONS'?'':JSON.stringify({error:'invalid_grant',error_description:'synthetic-only'})});
 });
 await page.goto(server.origin+'/__security/empty.html');
 const result=await page.evaluate(async({sdk,url})=>{
  const {createClient}=await import(sdk);const client=createClient(url,'synthetic-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await client.auth.signInWithPassword({email:['bf13','example.invalid'].join('@'),password:'synthetic-only'});
  return{session:data.session,name:error?.name,status:error?.status};
 },{sdk:manifest.entries['supabase-browser.bundle.mjs'],url:SUPABASE_URL});
 assert.ok(intercepted>0);assert.equal(result.session,null);assert.equal(result.name,'AuthApiError');assert.equal(result.status,400);await cleanApplication(page);
});
