// Original student/teacher documents against the owned real service stack.
import assert from 'node:assert/strict';
import path from 'node:path';
import {expect} from '@playwright/test';
const studentContext=s=>({enrollmentId:s.enrollment,curriculumReleaseId:s.release,unitId:s.unit});
const teacherContext=s=>({assignmentId:s.assignment,curriculumReleaseId:s.release,unitId:s.unit});
export async function runPilotJourney({page,fixture,target,check,diagnostics}) {
  const records=new Map();let current,retainedToken=null;
  const positive=(r,label)=>{assert.equal(r.status,200,label+': '+(r.value?.error??r.status));return r.value;};
  const denied=(r,label)=>assert.ok([403,404].includes(r.status),label+': '+JSON.stringify(r));
  const student=school=>fixture.accounts.find(a=>a.role==='student'&&a.school===school.label);
  const teacher=school=>fixture.accounts.find(a=>a.role==='teacher'&&a.school===school.label);
  const foreign=school=>fixture.schools.find(s=>s.label!==school.label);
  const course=(s,extra)=>target.frontendOrigin+'/course.html?'+new URLSearchParams({enrollment:s.enrollment,release:s.release,unit:s.unit,...extra});
  const teacherHref=(s,view)=>target.frontendOrigin+'/teacher.html?'+new URLSearchParams({view,class:s.class,assignment:s.assignment,release:s.release,unit:s.unit});
  async function signin(account) {
    current=account;retainedToken=null;await page.goto(target.frontendOrigin+'/account-access');
    await page.locator('#loginEmail').fill(account.email);await page.locator('#loginPassword').fill(account.password);
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(target.frontendOrigin+({student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[account.role]));
    await expect(page.getByRole('button',{name:'Դուրս գալ',exact:true})).toBeVisible();
  }
  async function request(endpoint,body={},authentication='session',method='POST') {
    return page.evaluate(async ({base,key,endpoint,body,authentication,method,retainedToken})=>{
      const session=Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')).map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token);
      const token=session?.access_token??retainedToken;if(!token)throw Error('real_local_session_required');
      const headers={apikey:key,'Content-Type':'application/json'};
      if(authentication!=='none')headers.Authorization='Bearer '+(authentication==='session'?token:'invalid-token');
      const r=await fetch(base+endpoint,{method,headers,redirect:'error',...(method==='GET'?{}:{body:JSON.stringify(body)})});
      let value=null,sha256=null,bytes=0;
      if((r.headers.get('content-type')??'').includes('json'))value=await r.json();
      else {const data=await r.arrayBuffer();bytes=data.byteLength;sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');}
      return {status:r.status,value,bytes,sha256,cache:r.headers.get('cache-control')};
    },{base:target.backendOrigin,key:fixture.anonKey,endpoint,body,authentication,method,retainedToken});
  }
  const call=(name,body,auth)=>request('/functions/v1/'+name,body,auth);
  async function signout(probes=[]) {
    for(const [name,body] of probes)for(const auth of ['none','invalid'])assert.equal((await call(name,body,auth)).status,401,'missing/malformed identity denied');
    retainedToken=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')).map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token).access_token);
    await page.getByRole('button',{name:'Դուրս գալ',exact:true}).click();
    if(current.role==='student')await expect(page.locator('#publicEntry')).toBeVisible();else await page.waitForURL(target.frontendOrigin+'/account-access');
    for(const [name,body] of probes)assert.ok([401,403].includes((await call(name,body)).status),'revoked session denied');
    if(probes.length)check(current.school+' '+current.role+': writing/audio missing, malformed and revoked identities refused');
    retainedToken=null;
  }
  const writingBody=(s,action,payload={})=>({action,context:studentContext(s),payload});
  async function openWriting(s){await page.goto(course(s,{tab:'writing',writingTask:s.writingTask}));}
  async function openReview(s){await page.goto(teacherHref(s,'review'));await page.locator('[data-writing-open]').click();await expect(page.locator('[data-writing-feedback]')).toBeVisible();}
  try {
    for(const s of fixture.schools) {
      await signin(teacher(s));
      await page.goto(teacherHref(s,'assign-writing'));
      await page.locator('[data-wa-task]').click();await page.locator('[data-wa-recipients]').click();
      await page.locator('[name=writingAudience][value=selected]').check();await page.locator('[data-wa-recipient="'+s.enrollment+'"]').check();
      const sent=page.waitForRequest(r=>r.url().endsWith('/functions/v1/manage-writing-assignments')&&r.postDataJSON()?.action==='assign');
      await page.locator('[data-wa-send]').click();const intent=(await sent).postDataJSON();
      await expect(page.locator('[data-wa-step]')).toContainText('Հաստատում');
      positive(await call('manage-writing-assignments',intent),'identical assignment retry');
      denied(await call('manage-writing-assignments',{action:'catalog',context:teacherContext(foreign(s)),payload:{}}),'foreign teacher writing catalog');
      check(s.label+' teacher: real selected-recipient writing delivery and identical retry; foreign catalog refused');
      await signout([['manage-writing-assignments',{action:'catalog',context:teacherContext(s),payload:{}}]]);
    }
    for(const s of fixture.schools) {
      await signin(student(s));
      const inbox=positive(await call('manage-writing-assignments',{action:'inbox',context:{},payload:{}}),'own writing inbox');
      assert.equal(inbox.assignments.length,1);assert.equal(inbox.assignments[0].task.id,s.writingTask);
      await openWriting(s);await expect(page.locator('[data-writing-text]')).toBeVisible();
      const text='Synthetic '+s.label+' first response describes a fictional blue classroom chair.';
      await page.locator('[data-writing-text]').fill(text);await page.locator('[data-writing-save]').click();
      await expect(page.locator('[data-writing-message]')).toHaveText('Սևագիրը պահպանված է։');
      await page.reload();await expect(page.locator('[data-writing-text]')).toHaveValue(text);
      const draft=positive(await call('manage-written-work',writingBody(s,'open',{taskId:s.writingTask})),'own saved draft');
      denied(await call('manage-written-work',writingBody(s,'open',{taskId:foreign(s).writingTask})),'foreign task using own context');
      denied(await call('manage-written-work',writingBody(foreign(s),'tasks')),'foreign writing context');
      const stale=await call('manage-written-work',writingBody(s,'save',{taskId:s.writingTask,text:'Stale write must not replace draft',expectedRevision:0}));
      assert.equal(stale.status,409,'stale draft revision refused');
      await signout();await signin(teacher(s));
      const queue=positive(await call('manage-written-work',{action:'queue',context:teacherContext(s),payload:{}}),'teacher draft privacy');
      assert.equal(queue.queue.length,0,'unsubmitted writing stays out of teacher queue');
      denied(await call('manage-teacher-feedback',{action:'open',context:teacherContext(s),payload:{workId:draft.work.id}}),'unsubmitted draft hidden from teacher');
      check(s.label+' teacher: unsubmitted learner draft is absent from queue and cannot be opened');
      await signout();await signin(student(s));await openWriting(s);
      await expect(page.locator('[data-writing-text]')).toHaveValue(text);
      const submission=page.waitForRequest(r=>r.url().endsWith('/functions/v1/manage-written-work')&&r.postDataJSON()?.action==='submit');
      await page.locator('[data-writing-submit]').click();const intent=(await submission).postDataJSON();
      await expect(page.locator('[data-writing-text]')).toHaveCount(0);
      assert.equal((await call('manage-written-work',intent)).status,409,'duplicate submission denied');
      records.set(s.label,{workId:draft.work.id,text});
      check(s.label+' student: native writing draft, reload, submission; stale edit, duplicate submission and foreign work refused');
      await signout([['manage-written-work',writingBody(s,'open',{taskId:s.writingTask})]]);
    }
    for(const s of fixture.schools) {
      await signin(teacher(s));await openReview(s);
      await expect(page.locator('.written-response')).toContainText(records.get(s.label).text);
      await page.locator('[data-writing-feedback]').fill('Synthetic '+s.label+': explain why this object is useful.');
      await page.locator('[data-writing-return]').click();
      await expect(page.locator('[data-writing-message]')).toContainText('վերադարձվել');
      denied(await call('manage-teacher-feedback',{action:'open',context:teacherContext(s),payload:{workId:records.get(foreign(s).label).workId}}),'foreign feedback with own teacher context');
      check(s.label+' teacher: native feedback and return for revision; foreign written work refused');
      await signout();
    }
    for(const s of fixture.schools) {
      await signin(student(s));await openWriting(s);
      await expect(page.locator('[data-writing-latest-feedback]')).toContainText('Synthetic '+s.label);
      await expect(page.locator('[data-writing-latest-feedback]')).not.toContainText('Synthetic '+foreign(s).label);
      await page.locator('[data-writing-text]').fill('Synthetic '+s.label+' revised response explains that this fictional chair helps a learner sit comfortably.');
      await page.locator('[data-writing-submit]').click();await expect(page.locator('[data-writing-text]')).toHaveCount(0);
      check(s.label+' student: returned feedback shown and revised work submitted through original page');await signout();
    }
    for(const s of fixture.schools) {
      await signin(teacher(s));await openReview(s);
      await page.locator('[data-writing-score=task]').selectOption('3');await page.locator('[data-writing-score=clarity]').selectOption('2');
      await page.locator('[data-writing-feedback]').fill('Synthetic '+s.label+': clear explanation; review the last sentence.');
      await page.locator('[data-writing-grade]').click();await expect(page.locator('.written-score')).toContainText('5/6');
      check(s.label+' teacher: revised work graded and feedback published through original page');
      await signout([['manage-teacher-feedback',{action:'open',context:teacherContext(s),payload:{workId:records.get(s.label).workId}}]]);
    }
    for(const s of fixture.schools) {
      await signin(student(s));await openWriting(s);await expect(page.locator('.written-score')).toContainText('5/6');
      await expect(page.locator('[data-writing-text]')).toHaveCount(0);
      const work=positive(await call('manage-written-work',writingBody(s,'open',{taskId:s.writingTask})),'reviewed work history');
      assert.equal(work.submissions.length,2);assert.ok(work.submissions.some(x=>x.text===records.get(s.label).text));
      if(s.label==='A') {
        for(const width of [390,1365]) {
          await page.setViewportSize({width,height:900});
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'written result fits viewport');
          await page.screenshot({path:path.join(fixture.screenshotDir,'A-written-reviewed-'+width+'.png'),fullPage:true});
        }
      }
      check(s.label+' student: final grade and feedback visible; original submission preserved');
      for(const mode of ['diagnostic','practice']) {
        const started=page.waitForResponse(r=>r.url().endsWith('/functions/v1/start-learning-session')&&r.request().method()==='POST');
        await page.goto(course(s,{action:mode}));const response=await started;assert.equal(response.status(),200);const launch=await response.json();
        records.get(s.label)[mode]={sessionId:launch.session.id};
        for(let ordinal=1;ordinal<=2;ordinal++) {
          await expect(page.locator('#learningPlayer h2')).toContainText('Հարց '+ordinal+'/');
          const served=positive(await call('get-session-item',{sessionId:launch.session.id}),'current audio item');
          const audioRequest={sessionId:launch.session.id,sessionItemId:served.sessionItemId,...(mode==='diagnostic'?{playbackPolicy:'assessed-recording-v1'}:{})};
          records.get(s.label)[mode]=audioRequest;
          if(mode==='diagnostic') {
            await expect(page.locator('[data-audio-questions] > li')).toHaveCount(2);
            await expect(page.locator('[data-audio-count]')).toContainText((ordinal-1)+'/2');
            if(ordinal===1)await expect(page.locator('#learningPlayer button[type=submit]')).toBeDisabled();
            const bytes=await call('get-learning-audio',{...audioRequest,action:'load'});positive(bytes,'private recording bytes');
            assert.equal(bytes.sha256,s.audio[mode].sha256);assert.equal(bytes.bytes,s.audio[mode].bytes);assert.match(bytes.cache,/no-store/);
            await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
            await page.locator('[data-audio-play]').click();
            if(ordinal===1) {
              await expect.poll(()=>page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThan(.4);
              const paused=page.waitForResponse(r=>r.url().endsWith('/functions/v1/get-learning-audio')&&r.request().postDataJSON()?.action==='pause');
              await page.getByRole('button',{name:'Դադարեցնել',exact:true}).click();
              const pauseResponse=await paused;assert.equal(pauseResponse.status(),200);
              const checkpoint=await pauseResponse.json();assert.ok(checkpoint.resumePositionMs>=400);
              await page.reload();await expect(page.locator('[data-audio-count]')).toContainText('0/2');
              await page.locator('[data-audio-play]').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
              // Observe the real media play event; do not synthesize playback or
              // alter the clock/position to manufacture completion evidence.
              await page.locator('audio').evaluate(a=>a.addEventListener('play',()=>{a.dataset.bf21ResumedAt=String(a.currentTime);},{once:true}));
              await page.locator('[data-audio-play]').click();
              await expect.poll(()=>page.locator('audio').getAttribute('data-bf21-resumed-at')).not.toBeNull();
              assert.ok(Number(await page.locator('audio').getAttribute('data-bf21-resumed-at'))>=checkpoint.resumePositionMs/1000-.05,'native audio resumes the persisted checkpoint');
            }
            await expect(page.locator('[data-audio-count]')).toContainText(ordinal+'/2',{timeout:15000});
            if(ordinal===2) {
              await page.reload();await expect(page.locator('[data-audio-play]')).toBeDisabled();
              assert.equal((await call('get-learning-audio',{...audioRequest,action:'load'})).status,409,'third recording play refused');
            }
          } else {
            await expect(page.locator('#learningPlayer button[type=submit]')).toBeDisabled();
            await page.locator('.learning-audio button').click();await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
            await page.locator('audio').evaluate(a=>a.play());
            await expect(page.locator('#learningPlayer button[type=submit]')).toBeEnabled();
          }
          await page.getByRole('radio',{name:new RegExp('Correct '+s.label)}).check();await page.locator('#learningPlayer button[type=submit]').click();
          await page.getByRole('button',{name:'Հաջորդը',exact:true}).click();
        }
        await expect(page.getByRole('button',{name:'Թարմացնել արդյունքները',exact:true})).toBeVisible();
        check(s.label+' student: native '+mode+' audio completion'+(mode==='diagnostic'?', interrupted playback resumes, shared two-play limit and reload retention':', replayable recording gates answers'));
      }
      const other=foreign(s);
      for(const audio of Object.values(s.audio)) {
        const direct=await request('/storage/v1/object/authenticated/bf21-audio/'+audio.objectPath,{},'session','GET');
        assert.ok([400,401,403,404].includes(direct.status),'direct private audio denied');
        const publicResult=await request('/storage/v1/object/public/bf21-audio/'+audio.objectPath,{},'none','GET');
        assert.ok([400,401,403,404].includes(publicResult.status),'public audio denied');
      }
      denied(await call('get-learning-audio',{action:'catalog',itemId:other.assessmentItems[0]}),'student cannot preview foreign recording');
      await page.goto(target.frontendOrigin+'/index.html');
      if(s.label==='A')await page.screenshot({path:path.join(fixture.screenshotDir,'A-pilot-completed.png'),fullPage:true});
      check(s.label+' student: direct/public recording downloads and staff preview refused');
      await signout([['get-learning-audio',{...records.get(s.label).diagnostic,action:'state'}]]);
    }
    for(const s of fixture.schools) {
      for(const role of ['student','teacher','school_admin']) {
        const actor=fixture.accounts.find(a=>a.school===s.label&&a.role===role);await signin(actor);
        denied(await call('get-learning-audio',{...records.get(foreign(s).label).diagnostic,action:'state'}),'foreign/incorrect role recording access');
        if(role!=='teacher')denied(await call('manage-teacher-feedback',{action:'open',context:teacherContext(s),payload:{workId:records.get(s.label).workId}}),'teacher-only feedback access');
        check(s.label+' '+role+': cross-school audio and role-specific writing access enforced');await signout();
      }
    }
    assert.equal(diagnostics.filter(d=>d.pageError||d.status>=500).length,0,'unexpected pilot script or service errors');
  } catch(error) {
    await page.screenshot({path:path.join(fixture.screenshotDir,'pilot-failure.png'),fullPage:true}).catch(()=>{});
    let message=String(error.stack??error)+' '+JSON.stringify(diagnostics.slice(-60));
    for(const secret of [...fixture.accounts.flatMap(a=>[a.email,a.password]),fixture.anonKey,retainedToken].filter(Boolean))message=message.replaceAll(secret,'[local-secret]');
    throw Error(message);
  }
}
