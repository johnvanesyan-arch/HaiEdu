// Manual, bounded production QA. Never invoked by the isolated test suite.
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateActivation,configuration,english,writingTaskId,writingTask,guideContract,englishReadAllowed} from '../../scripts/english-unit2-pilot-read-acceptance.mjs';
import {roles,sides} from '../../scripts/sprint-14-isolation.mjs';
import {clientHeaders} from '../../scripts/chapter-ii-pilot-read-acceptance.mjs';
import {waitForRelease} from '../../scripts/wait-for-production-release.mjs';

const root=new URL('../../',import.meta.url),site='https://www.haiedu.am';
const json=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
export const designated=(await json('docs/qa/additional-programme-fixtures.json')).contexts.filter(c=>c.curriculumReleaseId===english.curriculumReleaseId&&c.unitId===english.unitId).sort((a,b)=>a.side.localeCompare(b.side));
export const contract=await json('docs/qa/english-unit2-learner-contract.json');
export const selection=c=>({enrollmentId:c.enrollmentId,curriculumReleaseId:c.curriculumReleaseId,unitId:c.unitId});
const staff=c=>({assignmentId:c.teacherAssignmentId,curriculumReleaseId:c.curriculumReleaseId,unitId:c.unitId});
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export const maximumPracticeSessions=contract.maximumPracticeSessions;
const sha=value=>createHash('sha256').update(value).digest('hex');
let accepted=new Map();

// The protected response fixture is injected only into the manual QA step.
// Its public manifest pins bytes and scope; no answers enter git or artifacts.
export function loadResponseFixture(encoded,manifest=contract){
 if(typeof encoded!=='string'||encoded.length>48000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Error('Private fixture encoding');
 const raw=gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:250000});
 if(sha(raw)!==manifest.responseFixture.sha256)throw Error('Private fixture fingerprint');
 const data=JSON.parse(raw);
 if(data.schemaVersion!=='haiedu-english-unit2-private-responses-v1'||!equal(data.scope,english)
  ||!equal(manifest.scope,english)||Object.keys(data.items??{}).length!==manifest.responseFixture.itemCount
  ||Object.entries(data.items).some(([id,v])=>!UUID.test(id)||!['single_choice','typed_fields','matching','ordering'].includes(v.type)
   ||!/^[a-f0-9]{64}$/.test(v.promptSha256)|| (v.type==='single_choice'?!/^[a-f0-9]{64}$/.test(v.correctOptionSha256):!v.response)))throw Error('Private fixture scope');
 return new Map(Object.entries(data.items));
}

export function syntheticResponse(item,source=accepted.get(item?.id),wrong=false){
 if(!source||source.type!==item.type||sha(item.promptHy??'')!==source.promptSha256)throw Error('Unrecognized accepted item');
 if(item.type==='single_choice'){
  const correct=item.options?.filter(o=>sha(o.content_hy)===source.correctOptionSha256);
  if(correct?.length!==1)throw Error('Ambiguous choice presentation');
  const choice=wrong?item.options.find(o=>o.option_key!==correct[0].option_key):correct[0];
  if(!choice)throw Error('No deliberate incorrect response');
  return {value:choice.option_key};
 }
 if(wrong)throw Error('Deliberate failure requires a choice item');
 return structuredClone(source.response);
}

const intents={diagnostic:['diagnostic'],practice:['readiness'],chapter_review:['review'],mastery_check:['technical_exit','failed','passed']};
export function validResume(report,runId){
 return report?.schemaVersion==='haiedu-english-unit2-learner-qa-v1'&&report.workflowRunId===String(runId)
  &&equal(report.scope,english)&&report.studentId===designated[0].studentId&&report.status!=='passed'
  &&report.responseFixtureSha256===contract.responseFixture.sha256
  &&!report.unexpectedSessionId&&Array.isArray(report.sessions)&&report.sessions.length<=maximumPracticeSessions+5
  &&report.sessions.every(s=>UUID.test(s.id)&&intents[s.mode]?.includes(s.intent)
   &&['active','completed','technical_unscored'].includes(s.status)
   &&Number.isInteger(s.answered)&&s.answered>=0&&s.answered<=24
   &&(!s.responses||Array.isArray(s.responses)&&s.responses.every(x=>UUID.test(x.itemId)&&Number.isInteger(x.position)&&x.position>0&&x.position<=24&&typeof x.wrong==='boolean')))
  &&new Set(report.sessions.map(s=>s.id)).size===report.sessions.length
  &&report.sessions.filter(s=>s.mode==='diagnostic').length<=1&&report.sessions.filter(s=>s.mode==='chapter_review').length<=1
  &&report.sessions.filter(s=>s.mode==='practice').length<=maximumPracticeSessions
  &&['technical_exit','failed','passed'].every(intent=>report.sessions.filter(s=>s.mode==='mastery_check'&&s.intent===intent).length<=1)
  &&(!report.workId||UUID.test(report.workId));
}

export function writingProjectionAvailable(tasks){
 const t=tasks?.tasks?.[0];
 return tasks?.version==='written-work-v1'&&tasks.tasks.length===1&&t.id===writingTask.id&&t.version===writingTask.version
  &&t.title===writingTask.title&&t.locale===writingTask.locale&&t.available===true&&t.baselineRequired===false;
}

// A browser cannot broaden the run to another learner, release, session, item
// or task. Denial probes are issued explicitly by the runner, never by this UI.
export function browserAllowed({actor,pathname,method,search='',body,ledger,current}){
 if(englishReadAllowed({pathname,method,search,body}))return true;
 if(method!=='POST')return false;
 const fn=pathname.replace('/functions/v1/',''),c=designated[0];
 if(actor==='A_teacher'&&['get-teacher-dashboard','get-teacher-student','manage-student-invitation'].includes(fn))return fn!=='manage-student-invitation'||body?.action==='list';
 if(fn==='manage-written-work'){
  if(actor==='A_student'&&equal(body?.context,selection(c))&&['tasks','open','save','submit'].includes(body.action))
   return body.action==='tasks'||body.payload?.taskId===writingTaskId;
  if(actor==='A_teacher'&&equal(body?.context,staff(c))&&['queue','inspect','review'].includes(body.action))
   return body.action==='queue'||Boolean(ledger.workId&&body.payload?.workId===ledger.workId);
  return false;
 }
 if(actor!=='A_student'||!current)return false;
 if(fn==='start-learning-session')return equal(selection(body),selection(c))&&body.mode===current.mode
   &&(body.targetSkillId??null)===(current.targetSkillId??null);
 if(!ledger.sessions.some(s=>s.id===body?.sessionId)||body.sessionId!==current.id)return false;
 if(['get-session-item','get-mastery-check-status'].includes(fn))return Object.keys(body).length===1;
 if(['submit-answer','submit-mastery-answer','get-learning-audio'].includes(fn))return body.sessionItemId===current.sessionItemId
   &&(fn==='get-learning-audio'?(['state','load','begin','progress','complete','pause','failed','started','completed'].includes(body.action)||(body.action==='cancel'&&current.intent==='technical_exit'&&current.faultInjected===true))
    :body.itemId===current.itemId&&fn===(current.mode==='mastery_check'?'submit-mastery-answer':'submit-answer'));
 return false;
}

async function main(){
 const report={schemaVersion:'haiedu-english-unit2-learner-qa-v1',checkpoint:'16.1C.37',scope:english,studentId:designated[0].studentId,
  workflowRunId:String(process.env.GITHUB_RUN_ID),revision:process.env.GITHUB_SHA,status:'running',startedAt:new Date().toISOString(),
  responseFixtureSha256:contract.responseFixture.sha256,checks:[],sessions:[],audio:[],workId:null,limitations:['Synthetic designated QA learner; not learner attainment or specialist approval.',
   'One diagnostic and three mastery forms are retained as exposed, including one technical exit; no reset or unseen-form claim.',
   'Synthetic incorrect responses exercise failed Mastery and Review; they are not learner attainment. Existing concurrency and cross-subject checks are reused.']};
 const sessions=new Map();let request,browser,current=null,stage='preflight',blocked=0,pageErrors=0;
 const out='qa-results/english-unit2-learner-acceptance.json';
 const save=async()=>{await mkdir('qa-results',{recursive:true});await writeFile(out+'.tmp',JSON.stringify(report,null,2),{mode:0o600});await rename(out+'.tmp',out);};
 const check=(label,passed,httpStatus)=>{report.checks.push({label,status:passed?'passed':'failed',...(httpStatus===undefined?{}:{httpStatus})});if(!passed)throw Error('Acceptance assertion');};
 const api=async(actor,fn,body={})=>{const r=await request(actor,`/functions/v1/${fn}`,body);check(`${stage}: ${fn} authorized response`,r.status===200,r.status);return r.data;};
 const a=designated[0],b=designated[1];
 try{
  accepted=loadResponseFixture(process.env.QA_ENGLISH_UNIT2_RESPONSES);delete process.env.QA_ENGLISH_UNIT2_RESPONSES;
  check('exact protected response fixture and configuration',equal(contract.scope,english)&&contract.responseFixture.protectedConfigurationSha256===configuration.protectedConfigurationSha256&&configuration.policies.find(p=>p.mode==='mastery_check').readinessSkillIds.includes(contract.practiceListeningSkillId));
  const fixture=JSON.parse(process.env.QA_TENANT_FIXTURES_JSON??'{}');
  const credentials=Object.fromEntries(sides.flatMap(side=>roles.map(role=>[`${side}_${role}`,{email:process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_EMAIL`],password:process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_PASSWORD`]}])));
  check('exact main, activation, owner direction and six designated identities',validateActivation({activation:await json('docs/evidence/english-7-unit-02-pilot-activation.json'),fixture,credentials,revision:report.revision,ref:process.env.GITHUB_REF}).length===0
   &&designated.every(c=>['studentId','teacherId','adminId','schoolId'].every(k=>c[k]===fixture[c.side][k])));
  check('manual dispatch only',process.env.GITHUB_EVENT_NAME==='workflow_dispatch');
  if(process.env.QA_RESUME_RUN_ID){
   const prior=JSON.parse(await readFile('qa-resume/english-unit2-learner-acceptance.json','utf8'));
   check('resume only a known incomplete bounded run',validResume(prior,process.env.QA_RESUME_RUN_ID));
   report.resumedFrom={runId:prior.workflowRunId,revision:prior.revision,sha256:digest(prior)};
   for(const key of ['sessions','audio','workId','preserved','writingBaseline','writingChecks','initialState','readinessVerified'])if(prior[key]!==undefined)report[key]=prior[key];
  }
  report.frontendCommit=(await waitForRelease({expectedCommit:report.revision,timeoutMs:60000})).commit;
  const config=await readFile(new URL('web/config.js',root),'utf8');
  const url=config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1],key=config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
  check('public client bound to existing HaiEdu project',url==='https://xzyjvwiiibuarpotppid.supabase.co'&&Boolean(key));
  request=async(actor,endpoint,body={})=>{
   try{const r=await fetch(url+endpoint,{method:'POST',redirect:'error',headers:clientHeaders(key,sessions.get(actor)?.access_token),body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});return {status:r.status,data:await r.json().catch(()=>null)};}catch{return {status:0,data:null};}
  };
  for(const side of sides)for(const role of roles){const actor=`${side}_${role}`,r=await request(null,'/auth/v1/token?grant_type=password',credentials[actor]);
   if(r.data?.access_token)sessions.set(actor,{...r.data,expires_at:r.data.expires_at??Math.floor(Date.now()/1000)+Number(r.data.expires_in)});
   check(`${actor}: exact designated account authenticated`,r.status===200&&r.data?.user?.id===fixture[side][`${role}Id`],r.status);
  }
  const dashboard=()=>api('A_student','get-student-dashboard',selection(a));
  const initial=await dashboard(),owned=new Set(report.sessions.map(s=>s.id));
  check('no unrelated existing attempts or active work',initial.history.every(s=>owned.has(s.id))&&(!initial.activeSession||owned.has(initial.activeSession.id))
    &&(!initial.baseline||report.sessions.some(s=>s.mode==='diagnostic')));
  const tasks=await api('A_student','manage-written-work',{action:'tasks',context:selection(a),payload:{}});
  check('published W01 has an available matching learner projection',writingProjectionAvailable(tasks));
  check('no unrelated writing work',!tasks.tasks[0].workId||tasks.tasks[0].workId===report.workId);
  report.initialState??={history:initial.history.length,activeSession:initial.activeSession?.id??null,writingWork:tasks.tasks[0].workId??null};
  const preserved=[];
  for(const side of sides){
   const nav=await api(`${side}_student`,'get-student-classes',{});
   check(`${side}: exact designated English enrollment`,nav.contexts.some(c=>equal(selection(c),selection(designated.find(d=>d.side===side)))));
   for(const c of nav.contexts){if(side==='A'&&equal(selection(c),selection(a)))continue;
    const d=await api(`${side}_student`,'get-student-dashboard',selection(c));preserved.push({actor:`${side}_student`,context:selection(c),sha256:digest(d)});
   }
  }
  if(report.preserved)check('previous preserved contexts still identical',equal(report.preserved,preserved));else report.preserved=preserved;
  await save();
  const {chromium,expect:baseExpect}=await import('@playwright/test'),expect=baseExpect.configure({timeout:30000});
  browser=await chromium.launch({headless:true});
  async function pageFor(actor,mobile=false){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:950},serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:site,localStorage:[{name:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`,value:JSON.stringify(sessions.get(actor))}]}]}});
   await context.route(`${url}/**`,async route=>{const req=route.request(),u=new URL(req.url());let body;try{body=req.postDataJSON();}catch{body=null;}
    if(!browserAllowed({actor,pathname:u.pathname,search:u.search,method:req.method(),body,ledger:report,current})){blocked++;return route.abort();}
    // Abort only one owned assessed-audio load. The real player must report
    // failure and offer the normal unscored exit; no server state is forged.
    if(actor==='A_student'&&current?.intent==='technical_exit'&&current.faultArmed&&!current.faultInjected
     &&u.pathname==='/functions/v1/get-learning-audio'&&body?.action==='load'&&body.sessionId===current.id&&body.sessionItemId===current.sessionItemId){
     current.faultInjected=true;await save();return route.abort('failed');
    }return route.continue();});
   const p=await context.newPage();p.on('pageerror',()=>pageErrors++);p.setDefaultTimeout(30000);
   p.on('response',async response=>{
    if(response.url().startsWith(url+'/functions/v1/')&&response.status()>=400){
     const data=await response.json().catch(()=>null);
     (report.httpFailures??=[]).push({stage,endpoint:new URL(response.url()).pathname,status:response.status(),errorCode:/^[a-z_]+$/.test(data?.error??'')?data.error:'unavailable'});
    }
   });return p;
  }
  const learner=await pageFor('A_student');
  const href=(extras={})=>`${site}/course.html?${new URLSearchParams({...{enrollment:a.enrollmentId,release:a.curriculumReleaseId,unit:a.unitId},...extras})}`;
  const item=()=>api('A_student','get-session-item',{sessionId:current.id});
  async function display(data,reload=false){
   current.sessionItemId=data.sessionItemId;current.itemId=data.item.id;
   if(reload)await learner.goto(href({action:current.mode,...(current.targetSkillId?{skill:current.targetSkillId}:{})}),{waitUntil:'domcontentloaded'});
   await expect(learner.locator('#learningPlayer h2')).toHaveText(`Հարց ${data.session.position}/${data.session.total}`);
   check(`${current.mode} ${data.session.position}: served accepted question displayed`,(await learner.locator('#learningPlayer').innerText()).includes(data.item.promptHy));
  }
  async function audio(data){
   const s=data.item.stimulus;if(s?.kind!=='audio')return;
   check('audio has no transcript, source path or URL',s.transcriptAvailable===false&&!Object.keys(s).some(k=>/transcript$|objectPath|signedUrl|bucketId/i.test(k)));
   const root=learner.locator('#governedStimulus'),media=root.locator('audio');
   if(s.playbackPolicy==='assessed-recording-v1'){
    check('assessed shared recording policy and question group',s.playback.maximumPlays===2&&s.questions.length>=2);
    await expect(root.locator('[data-audio-questions] li')).toHaveCount(s.questions.length);
    const before=s.playback.completedPlays;
    for(let n=before;n<2;n++){
     if(await media.evaluate(el=>!el.getAttribute('src'))){
      await root.locator('[data-audio-play]').click(); // Load real private MP3 bytes.
      await expect(root.locator('[data-audio-play]')).toBeEnabled();
     }
     await root.locator('[data-audio-play]').click();
     if(!report.audio.some(x=>x.pauseResume)&&n===0){
      await learner.waitForFunction(()=>document.querySelector('#governedStimulus audio')?.currentTime>=2);
      await root.getByRole('button',{name:'Դադարեցնել',exact:true}).click();
      await expect(root.getByRole('status')).toContainText('դադարեցված');
      const state=await api('A_student','get-learning-audio',{sessionId:current.id,sessionItemId:current.sessionItemId,playbackPolicy:'assessed-recording-v1',action:'state'});
      check('pause persists a positive checkpoint without consuming a play',state.completedPlays===0&&state.resumePositionMs>0);
      await display(await item(),true);
      await root.locator('[data-audio-play]').click();await expect(root.locator('[data-audio-play]')).toBeEnabled();await root.locator('[data-audio-play]').click();
      report.audio.push({sessionId:current.id,audioVersionId:s.audioVersionId,pauseResume:true});await save();
     }
     await expect(root.locator('[data-audio-count]')).toContainText(`${n+1}/2`,{timeout:s.durationMs+45000});
     check('real-time audio completes at normal playback rate',await media.evaluate(el=>el.playbackRate===1));
    }
    await expect(root.locator('[data-audio-play]')).toBeDisabled();
    const denial=await request('A_student','/functions/v1/get-learning-audio',{sessionId:current.id,sessionItemId:current.sessionItemId,playbackPolicy:'assessed-recording-v1',action:'begin',clientId:randomUUID(),playId:randomUUID(),positionMs:0});
    check('server rejects a third assessed play',denial.status===409&&denial.data?.error==='audio_play_limit_reached',denial.status);
    await display(await item(),true);await expect(root.locator('[data-audio-count]')).toContainText('2/2');await expect(root.locator('[data-audio-play]')).toBeDisabled();
    report.audio.push({sessionId:current.id,sessionItemId:current.sessionItemId,audioVersionId:s.audioVersionId,mode:current.mode,completedPlays:2,sharedCountOnEntry:before,thirdPlayHttp:denial.status});
   }else{
    check('practice uses replayable policy',s.playbackPolicy==='replayable-practice-v1');
    await root.getByRole('button',{name:'Բեռնել ձայնագրությունը',exact:true}).click();await expect(media).toBeVisible();
    const plays=report.audio.some(x=>x.practiceThreePlays)?1:3;
    for(let n=0;n<plays;n++){
     await media.evaluate(el=>el.play());
     await learner.waitForFunction(()=>document.querySelector('#governedStimulus audio')?.ended,null,{timeout:s.durationMs+45000});
     await expect(root.getByRole('status')).toContainText('Ձայնագրությունն ավարտված է');
     check(`practice replay ${n+1}: real audio at normal speed`,await media.evaluate(el=>el.ended&&el.playbackRate===1));
    }
    report.audio.push({sessionId:current.id,sessionItemId:current.sessionItemId,audioVersionId:s.audioVersionId,mode:current.mode,completedPlays:plays,practiceThreePlays:plays===3});
   }
   check('audio player has no horizontal overflow',await learner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await save();
  }
  async function technicalExit(data){
   current.faultArmed=true;await save();
   const root=learner.locator('#governedStimulus');
   if(!current.faultInjected)await root.locator('[data-audio-play]').click();
   await expect(root.getByRole('button',{name:'Ավարտել՝ առանց գնահատման',exact:true})).toBeVisible();
   const cancelled=learner.waitForResponse(r=>r.url()===`${url}/functions/v1/get-learning-audio`&&r.request().postDataJSON()?.action==='cancel');
   await root.getByRole('button',{name:'Ավարտել՝ առանց գնահատման',exact:true}).click();
   const response=await cancelled,result=await response.json();
   check('normal audio failure exit retains exposure without scoring',response.status()===200&&result.endedUnscored===true&&result.sourceExposureRetained===true,response.status());
   await expect(learner.locator('#learningPlayer')).toContainText('Գնահատվող փորձ չի օգտագործվել');
   current.status='technical_unscored';current.audioVersionId=data.item.stimulus.audioVersionId;
   report.audio.push({sessionId:current.id,audioVersionId:current.audioVersionId,technicalExit:true,sourceExposureRetained:true,scoredAttemptCharged:false});
   await save();current=null;
  }
  async function completeSession(mode,targetSkillId=null,intent=mode==='practice'?'readiness':mode==='chapter_review'?'review':mode){
   stage=`${mode}:${intent}`;let d=await dashboard();
   const existing=report.sessions.find(s=>s.mode===mode&&s.intent===intent&&s.status==='active');
   if(d.activeSession){check('resume only recorded active session',Boolean(existing&&existing.id===d.activeSession.id&&existing.mode===mode));current=existing;}
   else{
    const maximum=mode==='practice'?maximumPracticeSessions:mode==='mastery_check'?3:1;
    check('bounded normal learner session start',!existing&&report.sessions.filter(s=>s.mode===mode).length<maximum
      &&(mode!=='mastery_check'||!report.sessions.some(s=>s.intent===intent)));
    const started=await api('A_student','start-learning-session',{...selection(a),mode,...(targetSkillId?{targetSkillId}:{})});
    check('new session id is unique',UUID.test(started.session?.id)&&!report.sessions.some(s=>s.id===started.session.id));
    current={id:started.session.id,mode,intent,targetSkillId,status:'active',answered:0,responses:[]};report.sessions.push(current);await save();
   }
   const assessed=['diagnostic','mastery_check'].includes(mode);
   await learner.setViewportSize(mode==='mastery_check'?{width:390,height:844}:{width:1365,height:950});
   let data=await item();
   if(!data.complete)await display(data,true);
   while(!data.complete){
    check('bounded expected session count and accepted item',data.session.mode===mode&&data.session.total===(mode==='practice'?8:mode==='chapter_review'?12:24)&&accepted.has(data.item.id));
    if(data.item.stimulus?.kind==='text')check('shared reading passage displayed',(await learner.locator('#governedStimulus').innerText()).trim().length>0&&Boolean(data.item.taskSet));
    if(intent==='technical_exit'&&data.item.stimulus?.kind==='audio'){await technicalExit(data);return;}
    await audio(data);
    // Persist the response decision before submission so a continuation makes
    // the same deliberate error without storing any answer text or key.
    let decision=current.responses.find(x=>x.position===data.session.position);
    if(!decision){decision={position:data.session.position,itemId:data.item.id,wrong:intent==='failed'&&data.item.type==='single_choice'&&current.responses.filter(x=>x.wrong).length<7};current.responses.push(decision);await save();}
    check('response decision belongs to this served position',decision.itemId===data.item.id);
    const answer=syntheticResponse(data.item,undefined,decision.wrong);
    if(answer.value)await learner.locator(`#learningPlayer input[name="answer"][value="${answer.value}"]`).check();
    else if(answer.fields)for(const [key,value] of Object.entries(answer.fields))await learner.locator(`[data-typed-field="${key}"]`).fill(value);
    else for(const [key,value] of Object.entries(answer.pairs??answer.sequence))await learner.locator(`[data-arrangement-field="${key}"]`).selectOption(value);
    const endpoint=mode==='mastery_check'?'submit-mastery-answer':'submit-answer';
    const submitted=learner.waitForResponse(r=>r.url()===`${url}/functions/v1/${endpoint}`&&r.request().postDataJSON()?.saveDraft!==true);
    await learner.locator('#learningPlayer button[type="submit"]').click();
    const response=await submitted,result=await response.json();
    check(`${mode} ${data.session.position}: answer accepted`,response.status()===200&&(assessed?result.accepted===true:UUID.test(result.attemptId)),response.status());
    if(assessed)check('assessed response withholds individual grading',result.revealCorrect===false&&!result.grading);
    else check('practice or review receives correct feedback',result.grading?.correct===true||result.grading?.score===1);
    current.answered=data.session.position;await save();
    data=await item();if(!data.complete){current.sessionItemId=data.sessionItemId;current.itemId=data.item.id;}
    await learner.locator('#learningPlayer').getByRole('button',{name:'Հաջորդը',exact:true}).click();
    if(!data.complete)await display(data);
   }
   check('technical scenario must exit at an audio item',intent!=='technical_exit');
   await expect(learner.locator('#learningPlayer h2')).toHaveText('Աշխատանքն ավարտված է');
   const result=data.assessmentResult;
   if(assessed){
    const wrong=current.responses.filter(x=>x.wrong).length;
    check(`${mode}: four complete original score groups`,result?.schemaVersion==='haiedu-assessment-result-v3'&&result.groups.length===4&&result.groups.every(g=>g.possible>0&&g.earned<=g.possible)
     &&result.groups.reduce((n,g)=>n+g.earned,0)===24-wrong&&result.groups.reduce((n,g)=>n+g.possible,0)===24);
    for(const g of result.groups)await expect(learner.locator('#learningPlayer')).toContainText(g.label);
    await expect(learner.locator('#learningPlayer [data-assessment-scope]')).toBeVisible();
    if(mode==='mastery_check')check('mastery follows the exact deliberate result',wrong===(intent==='failed'?7:0)&&result.passed===(intent==='passed')&&result.score?.earned===24-wrong&&result.score?.possible===24);
    current.result=result;
   }
   check(`${mode}: completion layout fits viewport`,await learner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await learner.locator('#learningPlayer').screenshot({path:`qa-results/${mode}-${intent}-complete.png`});
   current.status='completed';delete current.sessionItemId;delete current.itemId;await save();current=null;
  }
  // Reconcile only recorded sessions. An interrupted cancellation can be
  // replayed idempotently; it never starts another form or clears exposure.
  for(const s of report.sessions.filter(s=>s.status==='active')){
   const h=initial.history.find(h=>h.id===s.id);if(h){s.status='completed';s.answered=h.answered;s.result=h.assessmentResult;}
   else if(s.intent==='technical_exit'&&s.faultInjected&&!initial.activeSession){
    const done=await api('A_student','get-learning-audio',{sessionId:s.id,sessionItemId:s.sessionItemId,playbackPolicy:'assessed-recording-v1',action:'cancel'});
    check('reconcile owned technical exit without a new form',done.endedUnscored===true&&done.sourceExposureRetained===true);s.status='technical_unscored';
   }
  }
  if(!report.sessions.some(s=>s.mode==='diagnostic'&&s.status==='completed'))await completeSession('diagnostic');
  let progress=await dashboard();
  const guides=await api('A_student','get-unit-guides',selection(a));
  check('all eight published guides project exactly after Diagnostic',guideContract(guides,progress)&&(progress.activeSession?true:guides.availability==='available'));
  const startedMastery=report.sessions.some(s=>s.mode==='mastery_check');
  if(!startedMastery){
   for(let n=0;!progress.skills.every(s=>s.ready===true)||!report.sessions.some(s=>s.mode==='practice'&&s.status==='completed')||!report.audio.some(x=>x.practiceThreePlays);n++){
    check('readiness uses bounded ordinary practice, never a database override',n<maximumPracticeSessions);
    const active=report.sessions.find(s=>s.mode==='practice'&&s.status==='active');
    const weak=progress.skills.find(s=>s.ready!==true);
    const listening=progress.skills.find(s=>s.code==='ENG7-U02-S12');
    // Force an ordinary listening practice session only if the readiness route
    // has not already exercised three real plays of a replayable recording.
    const target=active?.targetSkillId??weak?.id??(!report.audio.some(x=>x.practiceThreePlays)?(listening?.id??contract.practiceListeningSkillId):null);
    check('listening practice has a registered core skill',Boolean(weak||active||report.audio.some(x=>x.practiceThreePlays)||target));
    await completeSession('practice',target);progress=await dashboard();
   }
   check('all nine skills ready through retained answers',progress.skills.length===9&&progress.skills.every(s=>s.ready===true));
   report.readinessVerified=true;await save();
  }
  const done=intent=>report.sessions.some(s=>s.intent===intent&&['completed','technical_unscored'].includes(s.status));
  if(!done('technical_exit'))await completeSession('mastery_check',null,'technical_exit');
  if(!report.sessions.some(s=>s.intent==='failed')){progress=await dashboard();check('technical exit does not consume a scored attempt',progress.lifecycle?.attemptsUsed===0&&!progress.activeSession);}
  if(!done('failed'))await completeSession('mastery_check',null,'failed');
  if(!report.sessions.some(s=>s.intent==='review')){
   progress=await dashboard();check('failed first scored Mastery requires Review',progress.lifecycle?.state==='review_required_attempt_2'&&progress.lifecycle.attemptsUsed===1);
   const denied=await request('A_student','/functions/v1/start-learning-session',{...selection(a),mode:'mastery_check'});
   if(denied.status===200&&UUID.test(denied.data?.session?.id)){report.unexpectedSessionId=denied.data.session.id;await save();}
   check('server blocks retake before required Review',denied.status===409&&denied.data?.error==='mastery_check_not_allowed',denied.status);
  }
  if(!done('review'))await completeSession('chapter_review');
  if(!report.sessions.some(s=>s.intent==='passed')){progress=await dashboard();check('completed Review opens second scored Mastery',progress.lifecycle?.state==='mastery_retry_2_ready'&&progress.lifecycle.attemptsUsed===1);}
  if(!done('passed'))await completeSession('mastery_check',null,'passed');
  progress=await dashboard();check('two scored attempts and passed lifecycle after one unscored exit',progress.lifecycle?.state==='mastery_passed'&&progress.lifecycle.attemptsUsed===2&&progress.lifecycle.passedOnAttempt===2);
  report.learningSummary={sessionCount:report.sessions.length,answered:report.sessions.reduce((n,s)=>n+s.answered,0),skillsReady:progress.skills.filter(s=>s.ready).length,lifecycle:progress.lifecycle,masteryFormsConsumed:3,scoredMasteryAttempts:2};
  check('assessed, replayable and technical-exit audio were exercised',report.audio.some(x=>x.mode==='diagnostic')&&report.audio.some(x=>x.mode==='mastery_check')&&report.audio.some(x=>x.practiceThreePlays)&&done('technical_exit'));
  await save();
  // Writing is a separate retained workflow; scores below are synthetic test
  // values, not a linguistic evaluation or the independent specialist gate.
  stage='writing';await learner.setViewportSize({width:390,height:844});report.writingBaseline??=digest(await dashboard());
  const teacher=await pageFor('A_teacher');
  const workApi=(actor,action,payload={})=>api(actor,'manage-written-work',{action,context:actor==='A_student'?selection(a):staff(a),payload});
  async function studentWork(){await learner.goto(href({tab:'writing'}));await learner.locator(`[data-writing-open="${writingTaskId}"]`).click();return workApi('A_student','open',{taskId:writingTaskId});}
  async function teacherQueue(){await teacher.goto(`${site}/teacher.html?${new URLSearchParams({view:'class',class:a.classId,assignment:a.teacherAssignmentId,release:a.curriculumReleaseId,unit:a.unitId})}`);await teacher.locator('#teacherOpenWrittenWork').click();await expect(teacher.locator('.written-list')).toBeVisible();}
  report.writingPhase='open';let model=await studentWork();
  if(!model.work||model.work.state==='draft'){
   report.writingPhase='draft-and-submit';
   const synthetic=Array(79).fill('fixture').concat("don't",'blue-green').join(' ');
   await learner.locator('[data-writing-text]').fill(synthetic);await expect(learner.locator('[data-writing-count]')).toHaveText('81 բառ');
   await learner.locator('[data-writing-save]').click();await expect(learner.locator('[data-writing-message]')).toHaveText('Սևագիրը պահպանված է։');
   model=await workApi('A_student','open',{taskId:writingTaskId});report.workId=model.work.id;await save();
   await teacherQueue();check('unsubmitted draft is absent from teacher queue',await teacher.locator(`[data-writing-open="${report.workId}"]`).count()===0);
   await studentWork();check('draft reload preserves synthetic text',await learner.locator('[data-writing-text]').inputValue()===synthetic);
   await learner.locator('[data-writing-submit]').click();await expect(learner.locator('[data-writing-message]')).toHaveText('Աշխատանքը ներկայացված է ուսուցչին։');
   await expect(learner.locator('[data-writing-text]')).toHaveCount(0);await expect(learner.locator('.written-response')).toBeVisible();
   check('pending writing is not a zero score',await learner.locator('.written-score').count()===0);report.writingChecks={draftReload:true,privateDraft:true,pendingNotZero:true};await save();
   model=await workApi('A_student','open',{taskId:writingTaskId});
  }
  if(model.work?.state==='submitted'&&model.submissions.length===1){
   report.writingPhase='return';await teacherQueue();await teacher.locator(`[data-writing-open="${report.workId}"]`).click();
   await teacher.locator('[data-writing-feedback]').fill('Synthetic workflow check: please revise this test response. This is not an evaluation of language quality.');
   await teacher.locator('[data-writing-return]').click();await expect(teacher.locator('[data-writing-message]')).toContainText('վերադարձվել');
   report.writingChecks.returned=true;await save();model=await studentWork();
  }
  if(model.work?.state==='changes_requested'){
   report.writingPhase='resubmit';
   await learner.locator('[data-writing-text]').fill(Array(80).fill('revised-fixture').concat("don't",'blue-green').join(' '));
   await learner.locator('[data-writing-submit]').click();await expect(learner.locator('[data-writing-message]')).toHaveText('Աշխատանքը ներկայացված է ուսուցչին։');
   await expect(learner.locator('[data-writing-text]')).toHaveCount(0);await expect(learner.locator('.written-response')).toBeVisible();
   check('revised submission remains pending without zero',await learner.locator('.written-score').count()===0);report.writingChecks.resubmitted=true;await save();model=await workApi('A_student','open',{taskId:writingTaskId});
  }
  if(model.work?.state==='submitted'&&model.submissions.length===2){
   report.writingPhase='mark';
   await teacherQueue();await teacher.locator(`[data-writing-open="${report.workId}"]`).click();
   for(const criterion of model.task.definition.criteria)await teacher.locator(`[data-writing-score="${criterion.key}"]`).selectOption('2');
   await teacher.locator('[data-writing-feedback]').fill('Synthetic workflow check; these marks do not evaluate language quality.');
   await teacher.locator('[data-writing-grade]').click();await expect(teacher.locator('.written-score')).toHaveText('Արդյունք՝ 8/12');report.writingChecks.marked=true;await save();
  }
  report.writingPhase='feedback';model=await studentWork();await expect(learner.locator('.written-score')).toHaveText('Արդյունք՝ 8/12');
  check('two retained submissions and return plus marking history',model.work.state==='reviewed'&&model.submissions.length===2&&model.submissions.reduce((n,s)=>n+s.reviews.length,0)===2);
  await expect(learner.locator('.written-feedback').first()).toContainText('Synthetic workflow check');
  check('marked writing retains four criterion scores',model.task.definition.criteria.length===4);
  check('writing leaves automatic evidence byte-identical',digest(await dashboard())===report.writingBaseline);
  check('mobile writing fits viewport',await learner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await learner.locator('.written-work').screenshot({path:'qa-results/writing-feedback-mobile.png'});
  report.writingSummary={workId:report.workId,state:model.work.state,submissions:2,reviews:2,criterionCount:4,syntheticScore:8,possible:12,automaticEvidenceUnchanged:true};await save();
  stage='staff and isolation';
  const detail=await api('A_teacher','get-teacher-student',{...staff(a),classId:a.classId,studentId:a.studentId});
  for(const own of report.sessions.filter(s=>['diagnostic','mastery_check'].includes(s.mode)&&s.status==='completed')){
   const found=detail.sessions?.find(s=>s.id===own.id);check(`${own.mode}:${own.intent}: matching teacher retains identical four-group result`,equal(found?.reporting,own.result));
  }
  const school=await api('A_admin','get-school-performance-analytics',{schoolId:a.schoolId,subjectProgramId:a.subjectProgramId,classId:a.classId,curriculumReleaseId:a.curriculumReleaseId,unitId:a.unitId});
  check('school evidence retains approved policy groups',Array.isArray(school.analytics?.evidenceGroups)&&['diagnostic','mastery_check'].every(mode=>school.analytics.evidenceGroups.some(g=>g.contract?.releaseId===a.curriculumReleaseId&&g.mode===mode&&g.reportingGroups?.length===4)));
  for(const mode of ['diagnostic','mastery_check']){
   const own=report.sessions.filter(s=>s.mode===mode&&s.status==='completed'),group=school.analytics.evidenceGroups.find(g=>g.contract?.releaseId===a.curriculumReleaseId&&g.mode===mode);
   check(`${mode}: school sums scored results and excludes the unscored exit`,group.sessions===own.length&&own[0].result.groups.every(g=>group.reportingGroups.some(x=>x.key===g.key
     &&x.earned===own.reduce((n,s)=>n+s.result.groups.find(y=>y.key===g.key).earned,0)&&x.possible===own.reduce((n,s)=>n+s.result.groups.find(y=>y.key===g.key).possible,0))));
  }
  for(const [actor,fn,body] of [
   ['B_student','get-student-dashboard',selection(a)],
   ['B_student','manage-written-work',{action:'open',context:selection(a),payload:{taskId:writingTaskId}}],
   ['B_teacher','manage-written-work',{action:'inspect',context:staff(b),payload:{workId:report.workId}}],
   ['B_teacher','get-teacher-student',{...staff(a),classId:a.classId,studentId:a.studentId}],
   ['A_teacher','manage-written-work',{action:'queue',context:staff(b),payload:{}}],
  ]){const r=await request(actor,`/functions/v1/${fn}`,body);check(`${actor}: foreign ${fn} denied without content`,r.status===403&&Object.keys(r.data??{}).length===1,r.status);}
  for(const preserved of report.preserved){const d=await api(preserved.actor,'get-student-dashboard',preserved.context);check('other learner and all other release dashboards remain identical',digest(d)===preserved.sha256);}
  check('native browser has no unapproved requests or JavaScript errors',blocked===0&&pageErrors===0);
  await waitForRelease({expectedCommit:report.revision,timeoutMs:15000});check('production remains on exact reviewed revision',true);
 }catch(error){report.failure={stage,...(stage==='writing'?{writingPhase:report.writingPhase}:{}),errorType:error?.name??'Error'};if(!report.checks.some(c=>c.status==='failed'))report.checks.push({label:`${stage}: acceptance unfinished; raw errors withheld`,status:'failed'});}
 finally{
  await browser?.close();
  for(const [actor] of sessions){const r=await request(actor,'/auth/v1/logout?scope=local');report.checks.push({label:`${actor}: close only this authentication session`,status:[200,204].includes(r.status)?'passed':'failed',httpStatus:r.status});}
  report.status=report.checks.some(c=>c.status==='failed')?'failed':'passed';report.finishedAt=new Date().toISOString();await save();
  console.log(`English Unit 2 learner acceptance: ${report.status}; ${report.checks.filter(c=>c.status==='passed').length}/${report.checks.length} checks; retained sessions ${report.sessions.length}.`);process.exitCode=report.status==='passed'?0:1;
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Learner acceptance evidence unavailable.');process.exitCode=1;});
