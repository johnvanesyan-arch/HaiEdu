// Native student pages and unchanged local services; no learner history is seeded.
import assert from 'node:assert/strict';
import path from 'node:path';
import {expect} from '@playwright/test';

const selection=s=>({enrollmentId:s.enrollment,curriculumReleaseId:s.release,unitId:s.unit});
const courseUrl=(origin,s,mode)=>origin+'/course.html?'+new URLSearchParams({
  enrollment:s.enrollment,release:s.release,unit:s.unit,...(mode?{action:mode}:{})});

export async function runMasteryJourney({page,fixture,target,check,diagnostics}) {
  const evidence=new Map();let currentAccount,retainedToken=null;
  const positive=(r,label)=>{assert.equal(r.status,200,label+': '+(r.value?.error??r.status));return r.value;};
  const refused=(r,label)=>assert.ok([403,404].includes(r.status),label+': '+r.status);
  const schoolFor=a=>fixture.schools.find(s=>s.label===a.school);
  const otherFor=a=>fixture.schools.find(s=>s.label!==a.school);
  const screenshot=name=>page.screenshot({path:path.join(fixture.screenshotDir,name+'.png'),fullPage:true});
  async function signIn(account) {
    currentAccount=account;retainedToken=null;
    await page.goto(target.frontendOrigin+'/account-access');
    await page.locator('#loginEmail').fill(account.email);
    await page.locator('#loginPassword').fill(account.password);
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(target.frontendOrigin+({student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[account.role]));
    await expect(page.getByRole('button',{name:'Դուրս գալ',exact:true})).toBeVisible();
  }
  async function call(name,body,authentication='session') {
    return page.evaluate(async ({base,key,name,body,authentication,retainedToken})=>{
      const session=Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))
        .map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token);
      const token=session?.access_token??retainedToken;
      if(!token)throw Error('real_local_session_required');
      const headers={apikey:key,'Content-Type':'application/json'};
      if(authentication==='session')headers.Authorization='Bearer '+token;
      if(authentication==='invalid')headers.Authorization='Bearer invalid-token';
      const r=await fetch(base+'/functions/v1/'+name,{method:'POST',headers,body:JSON.stringify(body),redirect:'error'});
      return {status:r.status,value:await r.json()};
    },{base:target.backendOrigin,key:fixture.anonKey,name,body,authentication,retainedToken});
  }
  async function signOut(probes=[]) {
    for(const [name,body] of probes)for(const identity of ['none','invalid'])
      assert.equal((await call(name,body,identity)).status,401,'missing/malformed mastery identity: '+name);
    if(probes.length)retainedToken=await page.evaluate(()=>Object.keys(localStorage)
      .filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))
      .map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token).access_token);
    await page.getByRole('button',{name:'Դուրս գալ',exact:true}).click();
    if(currentAccount.role==='student')await expect(page.locator('#publicEntry')).toBeVisible();
    else await page.waitForURL(target.frontendOrigin+'/account-access');
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))),false);
    for(const [name,body] of probes)assert.ok([401,403].includes((await call(name,body)).status),'revoked mastery session: '+name);
    if(probes.length)check(currentAccount.school+' '+currentAccount.role+': missing/malformed and revoked identity refused by all Mastery services');
    retainedToken=null;
  }
  const start=(school,mode)=>call('start-learning-session',{...selection(school),mode});
  const lifecycle=async school=>positive(await call('get-chapter-mastery-lifecycle',{
    ...selection(school),mode:'mastery_check'}),'read lifecycle');
  async function stateIs(school,state,attempts,passedOn=null) {
    const data=await lifecycle(school);
    assert.equal(data.lifecycle?.lifecycle_state,state);
    assert.equal(data.lifecycle?.attempts_used,attempts);
    assert.equal(data.lifecycle?.passed_on_attempt,passedOn);
    return data;
  }
  const answerProbes=(school,record)=>[
    ['start-learning-session',{...selection(school),mode:'mastery_check'}],
    ['get-mastery-check-status',{sessionId:record.sessionId}],
    ['get-chapter-mastery-lifecycle',{...selection(school),mode:'mastery_check'}],
    ['get-session-item',{sessionId:record.sessionId}],
    ['submit-mastery-answer',record.answer],
    ['submit-answer',record.answer],
    ['get-remediation-help',{sessionId:record.sessionId,sessionItemId:record.answer.sessionItemId,hintState:{level:0,afterAnswer:false}}],
  ];
  async function complete(school,mode,correct,{attemptNumber,beforeAnswer,afterFirst}={}) {
    const answers=Array.isArray(correct)?correct:[correct,correct];
    const correctCount=answers.filter(Boolean).length;
    const started=page.waitForResponse(r=>r.url()===target.backendOrigin+'/functions/v1/start-learning-session'&&r.request().method()==='POST');
    await page.goto(courseUrl(target.frontendOrigin,school,mode));
    const response=await started;
    const launched=positive({status:response.status(),value:await response.json()},'native '+mode+' start');
    const sessionId=launched.session?.id;assert.ok(sessionId);
    assert.equal(launched.session.mode,mode);
    if(attemptNumber)assert.equal(launched.session.mastery_attempt_number,attemptNumber);
    const repeated=await Promise.all([start(school,mode),start(school,mode)]);
    for(const r of repeated){const resumed=positive(r,'duplicate start resumes');assert.equal(resumed.session.id,sessionId);assert.equal(resumed.resumed,true);}
    const items=[];let firstAnswer,finalAnswer;
    for(let ordinal=1;ordinal<=2;ordinal++) {
      await expect(page.locator('#learningPlayer h2')).toHaveText('Հարց '+ordinal+'/2');
      const item=positive(await call('get-session-item',{sessionId}),'own active item');
      assert.equal(item.session.position,ordinal);assert.equal(item.session.mode,mode);
      assert.equal(item.item.answer,undefined);assert.equal(item.item.answerKey,undefined);
      items.push(item.item.id);
      if(ordinal===1&&beforeAnswer)await beforeAnswer({sessionId,item});
      if(ordinal===2) {
        const resumed=page.waitForResponse(r=>r.url()===target.backendOrigin+'/functions/v1/start-learning-session'&&r.request().method()==='POST');
        await page.reload();const rr=await resumed;
        const data=positive({status:rr.status(),value:await rr.json()},'reload resume');
        assert.equal(data.session.id,sessionId);assert.equal(data.resumed,true);
        await expect(page.locator('#learningPlayer h2')).toHaveText('Հարց 2/2');
        const again=positive(await call('get-session-item',{sessionId}),'same unanswered item after reload');
        assert.equal(again.sessionItemId,item.sessionItemId);assert.deepEqual(again.item.options,item.item.options);
      }
      if(mode==='mastery_check') {
        assert.equal(item.remediation.available,false);await expect(page.locator('#learningPlayer [data-help]')).toHaveCount(0);
        const help=await call('get-remediation-help',{sessionId,sessionItemId:item.sessionItemId,hintState:{level:0,afterAnswer:false}});
        assert.equal(help.status,409);assert.equal(help.value.error,'help_not_available_in_assessment');
      }
      await page.getByRole('radio',{name:(answers[ordinal-1]?'Correct ':'Other ')+school.label,exact:true}).check();
      const endpoint=mode==='mastery_check'?'submit-mastery-answer':'submit-answer';
      const sent=page.waitForResponse(r=>r.url()===target.backendOrigin+'/functions/v1/'+endpoint&&r.request().method()==='POST');
      await page.locator('#learningPlayer button[type=submit]').click();
      const accepted=await sent,answer=accepted.request().postDataJSON();
      const result=positive({status:accepted.status(),value:await accepted.json()},'native answer accepted');
      firstAnswer??=answer;finalAnswer=result;
      const duplicate=positive(await call(endpoint,answer),'identical submitted answer retry');
      assert.equal(duplicate.attemptId,result.attemptId,'same attempt identity on retry');
      const conflict=await call(endpoint,{...answer,response:{value:answer.response.value==='A'?'B':'A'}});
      assert.equal(conflict.status,409);assert.equal(conflict.value.error,'answer_response_conflict');
      if(mode==='mastery_check'&&ordinal===1) {
        assert.equal(result.revealCorrect,false);assert.equal(result.grading,undefined);
        assert.equal(result.finalResult??null,null,'result withheld until all answers');
        await expect(page.locator('#learningPlayer [data-feedback]')).toContainText('Արդյունքները կտեսնեք ավարտից հետո');
      }
      await expect(page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'})).toBeVisible();
      if(ordinal===1&&afterFirst)await afterFirst({sessionId});
      await page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'}).click();
    }
    await expect(page.locator('#learningPlayer h2')).toHaveText('Աշխատանքն ավարտված է');
    const completed=positive(await call('get-session-item',{sessionId}),'completed result');
    assert.equal(completed.complete,true);assert.equal(completed.summary.answered,2);
    assert.equal(completed.summary.correct,correctCount);assert.equal(completed.summary.percent,correctCount*50);
    assert.equal(completed.session.status,'completed');
    if(mode==='mastery_check') {
      assert.equal(finalAnswer.finalResult.passed,correctCount===2);
      assert.equal(finalAnswer.finalResult.score.percent,correctCount*50);
      await expect(page.locator('#learningPlayer')).toContainText(correctCount*50+'%');
      await screenshot(school.label+'-mastery-'+attemptNumber+'-completed');
    }
    await page.locator('#learningPlayer button').filter({hasText:'Թարմացնել արդյունքները'}).click();
    await expect(page.locator('#courseContent article').first()).toBeVisible();
    return {sessionId,answer:firstAnswer,items};
  }
  try {
    for(const account of fixture.accounts.filter(a=>a.role==='student')) {
      const school=schoolFor(account),other=otherFor(account);
      await signIn(account);
      const gated=await start(school,'mastery_check');
      assert.equal(gated.status,409);assert.equal(gated.value.error,'chapter_diagnostic_required');
      refused(await start(other,'mastery_check'),'foreign context start');
      assert.equal((await lifecycle(school)).lifecycle?.id??null,null,'read-only status does not create a lifecycle');
      await complete(school,'diagnostic',true);
      const notReady=await start(school,'mastery_check');
      assert.equal(notReady.status,409);assert.equal(notReady.value.error,'skills_not_ready');
      const earlyReview=await start(school,'chapter_review');
      assert.equal(earlyReview.status,409);assert.equal(earlyReview.value.error,'chapter_review_not_available');
      await complete(school,'practice',true);
      const ready=await lifecycle(school);assert.ok(ready.readiness.length&&ready.readiness.every(s=>s.ready));
      check(school.label+' student: baseline, readiness and initial Review gates enforced without seeded learner evidence');
      const records=[];
      const maximum=school.label==='A'?2:3;
      for(let attemptNumber=1;attemptNumber<=maximum;attemptNumber++) {
        const passed=school.label==='A'&&attemptNumber===2;
        const answers=school.label==='A'&&attemptNumber===1?[true,false]:passed;
        const record=await complete(school,'mastery_check',answers,{attemptNumber});records.push(record);
        assert.equal(new Set(records.flatMap(r=>r.items)).size,attemptNumber*2,'protected forms are disjoint across attempts');
        const terminal=passed||attemptNumber===3;
        const expected=passed?'mastery_passed':terminal?'mastery_failed_final':'review_required_attempt_'+(attemptNumber+1);
        await stateIs(school,expected,attemptNumber,passed?attemptNumber:null);
        check(school.label+' student: Mastery '+attemptNumber+' result, deferred feedback, disjoint items, reload and duplicate-answer/start integrity');
        const denied=await start(school,'mastery_check');
        assert.equal(denied.status,409);assert.equal(denied.value.error,'mastery_check_not_allowed');
        await stateIs(school,expected,attemptNumber,passed?attemptNumber:null);
        if(!terminal) {
          await complete(school,'chapter_review',true,{afterFirst:async({sessionId})=>{
            await stateIs(school,expected,attemptNumber);
            const resumed=positive(await start(school,'mastery_check'),'unfinished review remains active');
            assert.equal(resumed.session.id,sessionId);assert.equal(resumed.session.mode,'chapter_review');assert.equal(resumed.modeConflict,true);
          }});
          await stateIs(school,'mastery_retry_'+(attemptNumber+1)+'_ready',attemptNumber);
          check(school.label+' student: complete required Review unlocks attempt '+(attemptNumber+1)+'; partial Review does not');
        }
      }
      const terminal=school.label==='A'?'mastery_passed':'mastery_failed_final';
      await complete(school,'chapter_review',true);
      await stateIs(school,terminal,maximum,school.label==='A'?2:null);
      const retry=await start(school,'mastery_check');assert.equal(retry.status,409);assert.equal(retry.value.error,'mastery_check_not_allowed');
      await page.reload();await expect(page.getByRole('link',{name:'Բացել՝ Յուրացման ստուգում',exact:true})).toHaveCount(0);
      await expect(page.getByRole('link',{name:'Բացել՝ Գլխի կրկնություն',exact:true})).toBeVisible();
      await screenshot(school.label+'-terminal-review-available');
      evidence.set(school.label,records);
      check(school.label+' student: optional Review after '+(school.label==='A'?'passing':'final failure')+' cannot reopen Mastery despite unused protected forms');
      await signOut(answerProbes(school,records[0]));
    }
    for(const account of fixture.accounts) {
      const school=schoolFor(account),other=otherFor(account);
      await signIn(account);
      if(account.role==='student') {
        for(const [name,body] of answerProbes(other,evidence.get(other.label)[0]))refused(await call(name,body),'foreign '+name);
        const history=positive(await call('get-student-dashboard',selection(school)),'own result history');
        const own=evidence.get(school.label),foreign=new Set(evidence.get(other.label).map(r=>r.sessionId));
        assert.ok(own.every(r=>history.history.some(s=>s.id===r.sessionId)),'all own Mastery results retained');
        assert.ok(history.history.every(s=>!foreign.has(s.id)),'foreign results absent');
        check(school.label+' student: own Mastery history retained and foreign starts, status, answers, items and help refused');
      } else {
        for(const [name,body] of answerProbes(school,evidence.get(school.label)[0]))refused(await call(name,body),'staff cannot act as learner: '+name);
        for(const [name,body] of answerProbes(other,evidence.get(other.label)[0]))refused(await call(name,body),'staff foreign learner: '+name);
        check(school.label+' '+account.role+': own-school and foreign learner-only Mastery operations refused');
      }
      await signOut();
    }
    assert.equal(diagnostics.filter(d=>d.pageError).length,0,'native Mastery page errors');
    assert.equal(diagnostics.filter(d=>d.status>=500).length,0,'local Mastery server errors');
  } catch(error) {
    await screenshot('mastery-failure').catch(()=>{});
    let message=String(error.stack??error)+' '+JSON.stringify(diagnostics);
    for(const secret of [...fixture.accounts.flatMap(a=>[a.email,a.password]),fixture.anonKey,retainedToken].filter(Boolean))message=message.replaceAll(secret,'[local-secret]');
    throw Error(message);
  }
}
