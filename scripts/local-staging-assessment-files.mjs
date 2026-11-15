// Real browser sessions, original pages and actual local services. Preparation
// uses teacher APIs; no page content, Auth event or API result is fabricated.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {expect} from '@playwright/test';
import {pdf,docxBytes} from '../tests/fixtures/synthetic-task-documents.mjs';

const studentContext=s=>({enrollmentId:s.enrollment,curriculumReleaseId:s.release,unitId:s.unit});
const teacherContext=s=>({assignmentId:s.assignment,curriculumReleaseId:s.release,unitId:s.unit});
const taskDefinition=label=>({schemaVersion:'teacher-task-v1',title:'Synthetic file task '+label,
  instructions:'Synthetic local test. Read the PDF and submit a fictional document.',
  source:{kind:'pdf',attachmentId:null},response:{kind:'document',allowedFormats:['pdf','docx']},
  assessment:{kind:'feedback'}});
const contextHref=(origin,s,action)=>origin+'/course.html?'+new URLSearchParams({
  enrollment:s.enrollment,release:s.release,unit:s.unit,...(action?{action}:{})});
const taskHref=(origin,s,id)=>origin+'/index.html?'+new URLSearchParams({view:'work',teacherTask:id,
  taskEnrollment:s.enrollment,taskRelease:s.release,taskUnit:s.unit});

export async function runAssessmentFilesJourney({page,fixture,target,check,diagnostics}) {
  const artifacts=new Map(),sessions=new Map();
  let currentAccount,retainedToken=null;
  const positive=(r,label)=>{assert.equal(r.status,200,label+': '+(r.value?.error??r.status));return r.value;};
  const denied=(r,label)=>assert.ok([403,404].includes(r.status),label+': '+r.status);
  const schoolFor=a=>fixture.schools.find(s=>s.label===a.school);
  const otherFor=a=>fixture.schools.find(s=>s.label!==a.school);
  async function signIn(account) {
    currentAccount=account;retainedToken=null;
    await page.goto(target.frontendOrigin+'/account-access');
    await page.locator('#loginEmail').fill(account.email);
    await page.locator('#loginPassword').fill(account.password);
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(target.frontendOrigin+({student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[account.role]));
    await expect(page.getByRole('button',{name:'Դուրս գալ',exact:true})).toBeVisible();
  }
  async function signOut(probes=[]) {
    for(const [name,body] of probes)for(const authentication of ['none','invalid']) {
      assert.equal((await request('/functions/v1/'+name,body,null,'POST',authentication)).status,401,'missing/malformed file or assessment identity');
    }
    if(probes.length)retainedToken=await page.evaluate(()=>Object.keys(localStorage)
      .filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))
      .map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token).access_token);
    await page.getByRole('button',{name:'Դուրս գալ',exact:true}).click();
    if(currentAccount.role==='student')await expect(page.locator('#publicEntry')).toBeVisible();
    else {await page.waitForURL(target.frontendOrigin+'/account-access');await expect(page.locator('#loginEmail')).toBeVisible();}
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))),false);
    for(const [name,body] of probes)assert.ok([401,403].includes((await call(name,body)).status),'revoked file or assessment session refused');
    if(probes.length)check(currentAccount.school+' '+currentAccount.role+': missing/malformed identity and revoked session refused for '+probes.map(([name])=>name).join(', '));
    retainedToken=null;
  }
  // Only generated local tokens are retained privately for the logout probe;
  // they are never written to a receipt or printed with diagnostics.
  async function request(endpoint,body={},file=null,method='POST',authentication='session') {
    return page.evaluate(async ({base,anonKey,endpoint,body,file,method,authentication,retainedToken})=>{
      const session=Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))
        .map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token)??(retainedToken?{access_token:retainedToken}:null);
      if(!session)throw Error('real_local_session_required');
      const headers={apikey:anonKey};
      if(authentication==='session')headers.Authorization='Bearer '+session.access_token;
      if(authentication==='invalid')headers.Authorization='Bearer invalid-token';
      let payload;
      if(method!=='GET') {
        if(file){payload=new FormData();payload.set('request',JSON.stringify(body));payload.set('file',new Blob([new Uint8Array(file.bytes)],{type:file.mime}),file.name);}
        else {headers['Content-Type']='application/json';payload=JSON.stringify(body);}
      }
      const r=await fetch(base+endpoint,{method,headers,body:payload,redirect:'error'});
      const contentType=r.headers.get('content-type')??'';
      const value=contentType.includes('json')?await r.json():null;
      return {status:r.status,value};
    },{base:target.backendOrigin,anonKey:fixture.anonKey,endpoint,body,file,method,authentication,retainedToken});
  }
  const call=(name,body,file=null)=>request('/functions/v1/'+name,body,file);
  const sourceFile={name:'synthetic-source.pdf',mime:'application/pdf',bytes:[...pdf]};
  async function download(button,expected,name) {
    const pending=page.waitForEvent('download');await button.click();const result=await pending;
    assert.equal(result.suggestedFilename(),name);
    assert.deepEqual(await readFile(await result.path()),Buffer.from(expected),'exact private document bytes');
  }
  async function screenshot(name) {
    await page.screenshot({path:path.join(fixture.screenshotDir,name+'.png'),fullPage:true});
  }
  try {
    // Teachers prepare real deliveries before learners open their work lists.
    for(const account of fixture.accounts.filter(a=>a.role==='teacher')) {
      const school=schoolFor(account),context=teacherContext(school);
      await signIn(account);
      let definition=taskDefinition(account.school);
      let data=positive(await call('manage-teacher-task-drafts',{action:'create',context,
        payload:{requestId:crypto.randomUUID(),definition}}),'create teacher draft');
      let draft=data.draft;
      const asset=positive(await call('manage-teacher-task-sources',{action:'upload',context,
        payload:{draftId:draft.id,requestId:crypto.randomUUID()}},sourceFile),'upload private source');
      assert.equal(asset.bytes,pdf.length);
      definition={...definition,source:{kind:'pdf',attachmentId:asset.id}};
      draft=positive(await call('manage-teacher-task-drafts',{action:'save',context,
        payload:{id:draft.id,expectedRevision:draft.revision,definition}}),'bind private source').draft;
      const preview=positive(await call('manage-teacher-task-delivery',{action:'preview',context,payload:{id:draft.id}}),'preview recipients');
      const delivery=positive(await call('manage-teacher-task-delivery',{action:'assign',context,payload:{
        id:draft.id,expectedRevision:draft.revision,definition,requestId:crypto.randomUUID(),
        rosterFingerprint:preview.rosterFingerprint,mode:'class',enrollmentIds:[]}}),'deliver task').delivery;
      artifacts.set(account.school,{deliveryId:delivery.id,sourceId:asset.id,sourcePath:draft.id+'/'+asset.id+'.pdf'});
      // Actual Storage receives these requests with the browser's limited role.
      const direct=await request('/storage/v1/object/authenticated/teacher-task-files/'+draft.id+'/'+asset.id+'.pdf',{},null,'GET');
      assert.ok([400,401,403,404].includes(direct.status),'direct private object access denied');
      const publicFile=await request('/storage/v1/object/public/teacher-task-files/'+draft.id+'/'+asset.id+'.pdf',{},null,'GET','none');
      assert.ok([400,401,403,404].includes(publicFile.status),'private bucket never serves public bytes');
      check(account.school+' teacher: private source upload and authorized delivery; direct/public Storage access refused');
      await signOut([['manage-teacher-task-sources',{action:'open',context,payload:{id:asset.id}}]]);
    }
    for(const account of fixture.accounts.filter(a=>a.role==='student')) {
      const school=schoolFor(account),other=otherFor(account),context=studentContext(school);
      const artifact=artifacts.get(account.school),foreign=artifacts.get(other.label);
      await signIn(account);
      const gated=await call('start-learning-session',{...context,mode:'practice'});
      assert.equal(gated.status,409);assert.equal(gated.value.error,'chapter_diagnostic_required');
      denied(await call('start-learning-session',{...studentContext(other),mode:'diagnostic'}),'foreign assessment context');
      const keys=await request('/rest/v1/item_answer_keys?select=item_id,answer',{},null,'GET');
      assert.ok(keys.status===403||keys.status===200&&Array.isArray(keys.value)&&keys.value.length===0,'answer keys hidden from learner');
      check(account.school+' student: diagnostic prerequisite, foreign context and hidden answer keys enforced');
      for(const mode of ['diagnostic','practice']) {
        const started=page.waitForResponse(r=>r.url()===target.backendOrigin+'/functions/v1/start-learning-session'&&r.request().method()==='POST');
        await page.goto(contextHref(target.frontendOrigin,school,mode));
        const startResponse=await started;assert.equal(startResponse.status(),200);
        const launched=await startResponse.json();assert.ok(launched.session?.id,'real learning session returned');
        sessions.set(account.school+':'+mode,launched.session.id);
        for(let ordinal=1;ordinal<=2;ordinal++) {
          await expect(page.locator('#learningPlayer h2')).toContainText('Հարց '+ordinal+'/');
          if(ordinal===2){await page.reload();await expect(page.locator('#learningPlayer h2')).toContainText('Հարց 2/');}
          await page.getByRole('radio',{name:new RegExp('Correct '+account.school)}).check();
          const sent=page.waitForRequest(r=>r.url()===target.backendOrigin+'/functions/v1/submit-answer');
          await page.locator('#learningPlayer button[type=submit]').click();
          const answer=(await sent).postDataJSON();
          await expect(page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'})).toBeVisible();
          positive(await call('submit-answer',answer),'same answer retry');
          const conflict=await call('submit-answer',{...answer,response:{value:answer.response.value==='A'?'B':'A'}});
          assert.equal(conflict.status,409,'changed answer retry refused');
          await page.locator('#learningPlayer button').filter({hasText:'Հաջորդը'}).click();
        }
        await expect(page.locator('#learningPlayer button').filter({hasText:'Թարմացնել արդյունքները'})).toBeVisible();
        if(account.school==='A')await screenshot('A-'+mode+'-completed');
        await page.locator('#learningPlayer button').filter({hasText:'Թարմացնել արդյունքները'}).click();
        await expect(page.locator('#courseContent article').first()).toBeVisible();
        check(account.school+' student: native '+mode+' completion, reload/resume and idempotent answers');
      }
      // The original My work document performs every learner file mutation.
      await page.goto(taskHref(target.frontendOrigin,school,artifact.deliveryId));
      await expect(page.locator('[data-task-file]')).toBeVisible();
      await download(page.locator('[data-task-source]'),pdf,'haiedu-task.pdf');
      denied(await call('manage-teacher-task-student-files',{action:'source',context,payload:{id:foreign.deliveryId}}),'foreign task source');
      const invalid={name:'broken.pdf',mime:'application/pdf',bytes:[1,2,3]};
      const bad=await call('manage-teacher-task-student-files',{action:'upload',context,
        payload:{id:artifact.deliveryId,requestId:crypto.randomUUID(),format:'pdf'}},invalid);
      assert.equal(bad.status,400,'invalid document refused');
      await page.locator('[data-task-file]').setInputFiles({name:'answer.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
      await page.locator('[data-task-save]').click();
      await expect(page.locator('[data-task-status]')).toContainText('Սևագիրը պահպանված է');
      await download(page.locator('[data-task-document]'),pdf,'haiedu-response.pdf');
      const docx=docxBytes();
      await page.locator('[data-task-file]').setInputFiles({name:'answer.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from(docx)});
      await page.locator('[data-task-save]').click();
      await expect(page.locator('[data-task-status]')).toContainText('Սևագիրը պահպանված է');
      await page.reload();await expect(page.locator('[data-task-submit]')).toBeVisible();
      await download(page.locator('[data-task-document]'),docx,'haiedu-response.docx');
      await page.locator('[data-task-submit]').click();
      await expect(page.locator('[data-task-status]')).toContainText('Ներկայացումը հաստատված է');
      await page.reload();await expect(page.locator('[data-task-file]')).toHaveCount(0);
      await download(page.locator('[data-task-document]'),docx,'haiedu-response.docx');
      const opened=positive(await call('manage-teacher-task-student-work',{action:'open',context,payload:{id:artifact.deliveryId}}),'read own submitted task');
      assert.equal(opened.work.submissions.length,1);artifact.submissionId=opened.work.submissions[0].id;
      artifact.fileId=opened.work.document.id;
      if(account.school==='A')await screenshot('A-student-file-submitted');
      check(account.school+' student: actual PDF/DOCX upload, saved draft, reload, submission and exact private downloads');
      check(account.school+' student: invalid file and foreign source refused');
      await signOut([
        ['manage-teacher-task-student-files',{action:'open',context,payload:{id:artifact.deliveryId,fileId:artifact.fileId}}],
        ['get-session-item',{sessionId:sessions.get(account.school+':practice')}]
      ]);
    }
    for(const account of fixture.accounts.filter(a=>a.role==='teacher')) {
      const school=schoolFor(account),other=otherFor(account),context=teacherContext(school);
      await signIn(account);
      const queue=positive(await call('manage-teacher-task-review',{action:'queue',context,payload:{offset:0,state:'submitted'}}),'own submitted queue');
      assert.equal(queue.entries.length,1);const submission=queue.entries[0].id;
      assert.equal(submission,artifacts.get(account.school).submissionId);
      const url=target.frontendOrigin+'/teacher.html?'+new URLSearchParams({view:'review',taskKind:'custom',
        class:school.class,assignment:school.assignment,release:school.release,unit:school.unit,taskSubmission:submission});
      await page.goto(url);await expect(page.locator('[data-tr-document]')).toBeVisible();
      await download(page.locator('[data-tr-document]'),docxBytes(),'haiedu-response.docx');
      await page.getByText('Առաջադրանքը',{exact:true}).click();
      await download(page.locator('[data-tr-source]'),pdf,'haiedu-task.pdf');
      await page.locator('[data-tr-feedback]').fill('Synthetic review '+account.school+': document received.');
      await page.locator('[data-tr-save]').click();
      await expect(page.locator('[data-tr-status]')).toContainText('Սևագիրը պահպանված է');
      await page.locator('[data-tr-publish=reviewed]').click();
      await expect(page.locator('[data-tr-status]')).toContainText('Հրապարակումը հաստատված է');
      denied(await call('manage-teacher-task-review',{action:'queue',context:teacherContext(other),payload:{offset:0,state:'submitted'}}),'foreign teacher queue');
      denied(await call('manage-teacher-task-review-files',{action:'file',context,payload:{submissionId:artifacts.get(other.label).submissionId}}),'foreign submission file with own teacher context');
      if(account.school==='A')await screenshot('A-teacher-file-reviewed');
      check(account.school+' teacher: actual review page downloads, private feedback save and publication');
      await signOut([['manage-teacher-task-review-files',{action:'file',context,payload:{submissionId:submission}}]]);
    }
    for(const account of fixture.accounts.filter(a=>a.role==='student')) {
      const school=schoolFor(account),other=otherFor(account),artifact=artifacts.get(account.school),foreign=artifacts.get(other.label);
      await signIn(account);
      await page.goto(taskHref(target.frontendOrigin,school,artifact.deliveryId));
      await expect(page.locator('[data-task-feedback]')).toContainText('Synthetic review '+account.school);
      await expect(page.locator('body')).not.toContainText('Synthetic review '+other.label);
      denied(await call('get-session-item',{sessionId:sessions.get(other.label+':diagnostic')}),'foreign completed assessment');
      denied(await call('manage-teacher-task-review-files',{action:'file',context:teacherContext(school),payload:{submissionId:artifact.submissionId}}),'student cannot use teacher file endpoint');
      denied(await call('manage-teacher-task-student-work',{action:'open',context:studentContext(school),payload:{id:foreign.deliveryId}}),'foreign submitted work');
      denied(await call('manage-teacher-task-student-files',{action:'open',context:studentContext(school),payload:{id:artifact.deliveryId,fileId:foreign.fileId}}),'foreign file with own task context');
      check(account.school+' student: own published feedback visible; foreign history/work and teacher file access refused');
      await signOut();
    }
    for(const account of fixture.accounts.filter(a=>a.role==='school_admin')) {
      const school=schoolFor(account),artifact=artifacts.get(account.school);
      await signIn(account);
      denied(await call('start-learning-session',{...studentContext(school),mode:'diagnostic'}),'administrator cannot start learner assessment');
      denied(await call('manage-teacher-task-review-files',{action:'file',context:teacherContext(school),payload:{submissionId:artifact.submissionId}}),'administrator cannot read teacher response file');
      check(account.school+' administrator: learner assessment and teacher-only file access refused');
      await signOut();
    }
    assert.equal(diagnostics.filter(d=>d.pageError).length,0,'native assessment/file script errors');
    assert.equal(diagnostics.filter(d=>d.status>=500).length,0,'unexpected local service errors');
  } catch(error) {
    await screenshot('assessment-files-failure').catch(()=>{});
    let message=String(error.stack??error)+' '+JSON.stringify(diagnostics);
    for(const secret of [...fixture.accounts.flatMap(a=>[a.email,a.password]),fixture.anonKey,retainedToken].filter(Boolean))message=message.replaceAll(secret,'[local-secret]');
    throw Error(message);
  }
}
