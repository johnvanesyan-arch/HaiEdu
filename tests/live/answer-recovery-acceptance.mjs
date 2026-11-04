// One manual, retained designated-QA baseline. Never run by ordinary unit tests.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {validateFixture,runIsolation,roles,sides} from '../../scripts/sprint-14-isolation.mjs';
import {allowedBrowserRequest,clientHeaders} from '../../scripts/chapter-ii-pilot-read-acceptance.mjs';
import {waitForRelease} from '../../scripts/wait-for-production-release.mjs';
export const scope=JSON.parse(await readFile(new URL('../../docs/qa/live-answer-recovery-scope.json',import.meta.url),'utf8'));
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
export const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export const digest=x=>createHash('sha256').update(canonical(x)).digest('hex');
export function frozenResponse(x){const copy=structuredClone(x);delete copy.replayed;return copy;}
export function preflight({env,fixture,credentials,dashboard}){
 return env.GITHUB_REPOSITORY==='johnvanesyan-arch/HaiEdu'&&env.GITHUB_REF==='refs/heads/main'
  &&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.QA_EXECUTE==='true'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')
  &&validateFixture(fixture,credentials).length===0&&scope.dedicatedQa===true&&scope.maximumSessions===1&&scope.maximumAnswers===20
  &&fixture.B.curriculumReleaseId===scope.curriculumReleaseId&&fixture.B.unitId===scope.unitId
  &&dashboard&&Array.isArray(dashboard.skills)&&dashboard.skills.length>0&&!dashboard.activeSession&&!dashboard.latestDiagnostic;
}
export function browserAllowed({pathname,method,search='',body,ledger,current,recommendations=new Set()}){
 if(method==='OPTIONS')return true;
 const fn=pathname.replace('/functions/v1/','');
 if(['start-learning-session','get-session-item','submit-answer','submit-mastery-answer','get-mastery-check-status','get-chapter-mastery-lifecycle','record-recommendation-event','get-remediation-help'].includes(fn)){
  if(method!=='POST')return false;
  if(fn==='start-learning-session')return uuid(ledger.sessionId)&&canonical(body)==='{"mode":"diagnostic"}';
  if(fn==='get-session-item'||fn==='get-mastery-check-status'||fn==='get-chapter-mastery-lifecycle')return uuid(ledger.sessionId)&&body?.sessionId===ledger.sessionId&&Object.keys(body).length===1;
  if(fn==='record-recommendation-event')return Object.keys(body??{}).sort().join(',')==='eventType,recommendationInstanceId,surface'&&body.eventType==='shown'&&body.surface==='diagnostic_result'&&recommendations.has(body.recommendationInstanceId);
  return fn==='submit-answer'&&uuid(ledger.sessionId)&&body?.sessionId===ledger.sessionId&&body.sessionItemId===current?.sessionItemId
   &&body.itemId===current?.item?.id&&scope.allowedItemIds.includes(body.itemId)&&scope.responseTypes.includes(current.item.type)
   &&Object.keys(body).every(k=>['sessionId','sessionItemId','itemId','response','responseTimeMs','hintUsed'].includes(k))
   &&Boolean(body.response)&&typeof body.response==='object'&&!Array.isArray(body.response)&&body.hintUsed===false&&Number.isFinite(body.responseTimeMs)&&body.responseTimeMs>=0;
 }
 if(fn==='get-student-dashboard'&&method==='POST'&&canonical(body)==='{}')return true;
 return allowedBrowserRequest({pathname,method,search,body});
}
export function evidenceProjection(d){return {activeSession:d.activeSession,latestDiagnostic:d.latestDiagnostic,
 skills:(d.skills??[]).map(s=>({id:s.id,code:s.code,mastery:s.mastery,diagnostic:s.diagnostic,score:s.score,evidenceCount:s.evidenceCount,status:s.status}))};}
async function main(){
 const env=process.env,fixture=JSON.parse(env.QA_TENANT_FIXTURES_JSON??'{}'),credentials=Object.fromEntries(sides.flatMap(s=>roles.map(r=>[`${s}_${r}`,{email:env[`QA_SCHOOL_${s}_${r.toUpperCase()}_EMAIL`],password:env[`QA_SCHOOL_${s}_${r.toUpperCase()}_PASSWORD`]}])));
 const report={schemaVersion:'haiedu-live-answer-recovery-v1',revision:env.GITHUB_SHA,workflowRunId:env.GITHUB_RUN_ID,status:'running',startedAt:new Date().toISOString(),case:scope.case,checks:[],sessionId:null,answers:[],recoveries:[],cleanup:[],limitations:[scope.retention,'Fresh legacy diagnostic UI and API only; governed/stalled/other-interface coverage remains isolated CI.','Personal usability, physical-device, MFA and independent approval are not claimed.']};
 const out='qa-results/live-answer-recovery.json',sessions=new Map(),closed=new Set();let browser,request,current,firstPayload,lastPayload,lastResult,stage='preflight',blocked=0;const pageErrors=[];
 const save=async()=>{await mkdir('qa-results',{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n',{mode:0o600});};
 const check=(label,passed,status)=>{report.checks.push({label,status:passed?'passed':'failed',...(status===undefined?{}:{httpStatus:status})});if(!passed)throw Error('Acceptance assertion');};
 const call=async(actor,fn,body={})=>{const r=await request(actor,`/functions/v1/${fn}`,body);check(`${stage}: ${fn} authorized response`,r.status===200,r.status);return r.data;};
 try{
  check('manual reviewed main, explicit execution and six designated identities',env.GITHUB_REPOSITORY==='johnvanesyan-arch/HaiEdu'&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.QA_EXECUTE==='true'&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&validateFixture(fixture,credentials).length===0);
  report.frontendCommit=(await waitForRelease({expectedCommit:env.GITHUB_SHA,timeoutMs:60000})).commit;
  const config=await readFile('web/config.js','utf8'),url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
  check('existing public HaiEdu client only',url==='https://xzyjvwiiibuarpotppid.supabase.co'&&Boolean(key));
  request=async(actor,endpoint,body={})=>{try{const r=await fetch(url+endpoint,{method:'POST',redirect:'error',headers:clientHeaders(key,sessions.get(actor)?.access_token),body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});return{status:r.status,data:await r.json().catch(()=>null)};}catch{return{status:0,data:null};}};
  report.isolationBefore=await runIsolation({fixture,credentials,url,key,revision:env.GITHUB_SHA});check('all54 preflight isolation controls',report.isolationBefore.status==='passed'&&report.isolationBefore.checks.length===54);
  for(const side of sides)for(const role of roles){const actor=`${side}_${role}`,r=await request(null,'/auth/v1/token?grant_type=password',credentials[actor]);if(r.data?.access_token)sessions.set(actor,{...r.data,expires_at:r.data.expires_at??Math.floor(Date.now()/1000)+r.data.expires_in});check(`${actor}: exact designated identity`,r.status===200&&r.data?.user?.id===fixture[side][`${role}Id`],r.status);}
  const initial=await call('B_student','get-student-dashboard',{});check('one unused designated diagnostic; no existing work may resume',preflight({env,fixture,credentials,dashboard:initial}));
  const preserved=digest(evidenceProjection(await call('A_student','get-student-dashboard',{})));
  const nav=await call('B_student','get-student-classes',{}),context=nav.contexts?.filter(c=>c.classId===fixture.B.classId&&c.curriculumReleaseId===scope.curriculumReleaseId&&c.unitId===scope.unitId);
  check('exact designated learner navigation context',context?.length===1&&uuid(context[0].enrollmentId));
  stage='start';const started=await call('B_student','start-learning-session',{mode:'diagnostic'});
  check('exact new bounded registered diagnostic session',uuid(started.session?.id)&&started.resumed!==true&&started.session.mode==='diagnostic'&&started.session.planned_item_count===scope.maximumAnswers&&started.session.curriculum_release_id===scope.curriculumReleaseId&&started.session.assessment_blueprint_id===scope.blueprintId);
  report.sessionId=started.session.id;await save();
  const item=()=>call('B_student','get-session-item',{sessionId:report.sessionId});current=await item();
  const {chromium,expect:baseExpect}=await import('@playwright/test'),expect=baseExpect.configure({timeout:30000});browser=await chromium.launch({headless:true});
  const origin='https://www.haiedu.am',bc=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin,localStorage:[{name:'sb-xzyjvwiiibuarpotppid-auth-token',value:JSON.stringify(sessions.get('B_student'))}]}]}});
  const captures=new Map(),recommendations=new Set();
  await bc.route(url+'/**',async route=>{
   const req=route.request(),u=new URL(req.url());let body;try{body=req.postDataJSON();}catch{body=null;}
   if(!browserAllowed({pathname:u.pathname,method:req.method(),search:u.search,body,ledger:report,current,recommendations})){blocked++;return route.abort();}
   if(req.method()==='OPTIONS'){await route.continue();return;}
   const fn=u.pathname.replace('/functions/v1/','');
   if(fn==='submit-answer'){
    const response=await route.fetch(),result=await response.json();
    if(response.status()!==200){await route.fulfill({response});return;}
    const key=body.sessionItemId,prior=captures.get(key);
    if(!prior){const entry={payload:structuredClone(body),result};captures.set(key,entry);if(current.session.position===1||current.session.position===current.session.total){entry.lost=true;await route.abort('failed');return;}}
    else{prior.retriedPayload=structuredClone(body);prior.retriedResult=result;}
    await route.fulfill({response});return;
   }
   if(fn==='get-student-dashboard'){const response=await route.fetch(),d=await response.json();if(uuid(d?.recommendation?.instanceId))recommendations.add(d.recommendation.instanceId);await route.fulfill({response});return;}
   await route.continue();
  });
  const page=await bc.newPage();page.on('pageerror',()=>pageErrors.push('page_error'));
  await page.goto(origin+'/diagnostic.html?'+new URLSearchParams({enrollment:context[0].enrollmentId,release:scope.curriculumReleaseId,unit:scope.unitId}),{waitUntil:'domcontentloaded'});
  await page.locator('#startBtn').click();
  for(let n=1;n<=scope.maximumAnswers;n++){
   stage='answer-'+n;check('owned approved item and original count/position',!current.complete&&current.session.position===n&&current.session.total===scope.maximumAnswers&&scope.allowedItemIds.includes(current.item.id)&&scope.responseTypes.includes(current.item.type));
   await expect(page.locator('#progressText')).toHaveText(`${n} / ${scope.maximumAnswers}`);
   if(current.item.type==='single_choice'||current.item.type==='true_false')await page.locator('#answerArea input[name=answer]').first().check();
   else{await page.locator('#numericAnswer').fill('0');if(current.item.type==='quantity')await page.locator('#unitAnswer').fill('m');}
   await page.locator('#submitBtn').click();
   if(n===1||n===scope.maximumAnswers){
    await expect(page.locator('#submitBtn')).toHaveText('Կրկին փորձել');await expect(page.locator('#feedback')).toContainText('գրանցումը դեռ հաստատված չէ');
    check('uncertain answer fields remain locked',await page.locator('#answerArea input').first().isDisabled());
    const before=digest(evidenceProjection(await call('B_student','get-student-dashboard',{})));
    await page.locator('#submitBtn').click();await expect(page.locator('#nextBtn')).toBeVisible();
    const captured=captures.get(current.sessionItemId);check('retry sends identical immutable request',canonical(captured.payload)===canonical(captured.retriedPayload));
    check('original saved response and attempt restored',captured.retriedResult.replayed===true&&digest(frozenResponse(captured.result))===digest(frozenResponse(captured.retriedResult))&&captured.result.attemptId===captured.retriedResult.attemptId);
    check('retry leaves counters/mastery projection unchanged',before===digest(evidenceProjection(await call('B_student','get-student-dashboard',{}))));
    check('friendly recovery text hides internal endpoint errors',!(await page.locator('#feedback').innerText()).includes('Edge Function'));
    report.recoveries.push({position:n,committedHttpStatus:200,responseDiscarded:true,requestSha256:digest(captured.payload),responseSha256:digest(frozenResponse(captured.result)),attemptId:captured.result.attemptId,identicalRequest:true,unchangedEvidence:true});
    await page.locator('#questionPanel').screenshot({path:`qa-results/recovery-${n}.png`});
   }else await expect(page.locator('#nextBtn')).toBeVisible();
   const captured=captures.get(current.sessionItemId);check('one accepted attempt advances once',uuid(captured?.result?.attemptId)&&captured.result.session.answered_count===n);
   firstPayload??=captured.payload;lastPayload=captured.payload;lastResult=captured.result;
   report.answers.push({position:n,sessionItemId:current.sessionItemId,attemptId:captured.result.attemptId});await save();
   await page.locator('#nextBtn').click();
   if(n<scope.maximumAnswers)current=await item();
  }
  await expect(page.locator('#resultPanel')).toBeVisible();
  check('two real lost replies recovered and no duplicate local attempts',report.recoveries.length===2&&new Set(report.answers.map(a=>a.attemptId)).size===scope.maximumAnswers);
  const completed=await item();check('original diagnostic completed at its original20-item bound',completed.complete===true&&completed.summary?.answered===scope.maximumAnswers);
  const before=digest(evidenceProjection(await call('B_student','get-student-dashboard',{}))),replay=await call('B_student','submit-answer',lastPayload);
  check('completed final item replays original frozen feedback',replay.replayed===true&&digest(frozenResponse(replay))===digest(frozenResponse(lastResult)));
  check('completed replay changes no counters/evidence',before===digest(evidenceProjection(await call('B_student','get-student-dashboard',{}))));
  const conflict=await request('B_student','/functions/v1/submit-answer',{...firstPayload,responseTimeMs:firstPayload.responseTimeMs+1});check('changed retry is a conflict without feedback',conflict.status===409&&conflict.data?.error==='answer_response_conflict'&&Object.keys(conflict.data).length===1,conflict.status);
  const foreign=await request('A_student','/functions/v1/submit-answer',lastPayload);check('another QA learner receives no saved result',foreign.status===409&&foreign.data?.error==='session_not_active'&&Object.keys(foreign.data).length===1,foreign.status);
  check('original other learner evidence unchanged',preserved===digest(evidenceProjection(await call('A_student','get-student-dashboard',{}))));
  const logout=await request('B_student','/auth/v1/logout?scope=local');closed.add('B_student');report.cleanup.push({actor:'B_student',status:logout.status});check('close only this QA authentication session',logout.status===204,logout.status);
  const revoked=await request('B_student','/functions/v1/submit-answer',lastPayload);check('revoked session cannot recover saved feedback',revoked.status===403&&revoked.data?.error==='account_or_session_inactive'&&Object.keys(revoked.data).length===1,revoked.status);
  await browser.close();browser=null;report.isolationAfter=await runIsolation({fixture,credentials,url,key,revision:env.GITHUB_SHA});check('all54 postflight isolation controls',report.isolationAfter.status==='passed'&&report.isolationAfter.checks.length===54);
  check('no unapproved browser write or page exception',blocked===0&&pageErrors.length===0);report.status='passed';
 }catch{report.status='failed';report.failedStage=stage;process.exitCode=1;}
 finally{await browser?.close();for(const [actor] of sessions){if(closed.has(actor))continue;const r=await request(actor,'/auth/v1/logout?scope=local');report.cleanup.push({actor,status:r.status});if(r.status!==204){report.status='failed';process.exitCode=1;}}report.finishedAt=new Date().toISOString();await save();console.log(`Live answer recovery: ${report.status}; ${report.checks.filter(x=>x.status==='passed').length}/${report.checks.length} checks; retained diagnostic answers=${report.answers.length}.`);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
