// Original pages and unchanged services in the owned local stack only.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {expect} from '@playwright/test';
import {pdf} from '../tests/fixtures/synthetic-task-documents.mjs';

const teacherContext=s=>({assignmentId:s.assignment,curriculumReleaseId:s.release,unitId:s.unit});
const studentContext=(s,a)=>({enrollmentId:a.enrollment??s.enrollment,curriculumReleaseId:s.release,unitId:s.unit});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function runResourceJourney({page,fixture,target,check,diagnostics}) {
  const records=new Map();let current,retainedToken=null;
  const actor=(s,kind)=>fixture.accounts.find(a=>a.school===s.label&&a.case===kind);
  const foreign=s=>fixture.schools.find(o=>o.label!==s.label);
  const positive=(r,label)=>{assert.equal(r.status,200,label+': '+(r.value?.error??r.status));return r.value;};
  const denied=(r,label)=>assert.ok([403,404].includes(r.status),label+': '+JSON.stringify(r));
  const body=(action,context,payload={})=>({action,context,payload});
  const library=s=>target.frontendOrigin+'/resource-library.html?'+new URLSearchParams({assignment:s.assignment,release:s.release,unit:s.unit,intent:'assign'});
  const work=()=>target.frontendOrigin+'/index.html?view=work';
  async function signin(account) {
    current=account;retainedToken=null;
    await page.goto(target.frontendOrigin+'/account-access');
    await page.locator('#loginEmail').fill(account.email);await page.locator('#loginPassword').fill(account.password);
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(target.frontendOrigin+({student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[account.role]));
    await expect(page.getByRole('button',{name:'Դուրս գալ',exact:true})).toBeVisible();
  }
  async function request(endpoint,payload={},authentication='session',method='POST') {
    return page.evaluate(async ({base,key,endpoint,payload,authentication,method,retainedToken})=>{
      const session=Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')).map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token);
      const token=session?.access_token??retainedToken;if(!token)throw Error('real_local_session_required');
      const headers={apikey:key,'Content-Type':'application/json'};
      if(authentication!=='none')headers.Authorization='Bearer '+(authentication==='session'?token:'invalid-token');
      const r=await fetch(base+endpoint,{method,headers,redirect:'error',...(method==='GET'?{}:{body:JSON.stringify(payload)})});
      let value=null,hash=null,bytes=0;
      if((r.headers.get('content-type')??'').includes('json'))value=await r.json();
      else {const data=await r.arrayBuffer();bytes=data.byteLength;hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');}
      return {status:r.status,value,hash,bytes,cache:r.headers.get('cache-control'),mime:r.headers.get('content-type')};
    },{base:target.backendOrigin,key:fixture.anonKey,endpoint,payload,authentication,method,retainedToken});
  }
  const call=(service,payload,authentication)=>request('/functions/v1/'+service,payload,authentication);
  const assignment=(action,context={},payload={})=>call('manage-resource-assignments',body(action,context,payload));
  const material=(action,context,payload={})=>call('manage-supplementary-resources',body(action,context,payload));
  async function signout(probes=[]) {
    for(const [service,payload] of probes)for(const authentication of ['none','invalid'])assert.equal((await call(service,payload,authentication)).status,401,'missing/malformed identity refused');
    retainedToken=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')).map(k=>JSON.parse(localStorage.getItem(k))).find(v=>v?.access_token).access_token);
    await page.goto(target.frontendOrigin+({student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[current.role]));
    await page.getByRole('button',{name:'Դուրս գալ',exact:true}).click();
    if(current.role==='student')await expect(page.locator('#publicEntry')).toBeVisible();else await page.waitForURL(target.frontendOrigin+'/account-access');
    for(const [service,payload] of probes)assert.ok([401,403].includes((await call(service,payload)).status),'revoked identity refused');
    if(probes.length)check(current.school+' '+current.case+': resource services reject missing, malformed and revoked sessions');
    retainedToken=null;
  }
  async function inbox() {
    const direct=positive(await assignment('inbox'),'resource inbox').assignments;
    const combined=positive(await call('get-student-work',{action:'inbox',payload:{state:'current'}}),'combined work inbox');
    assert.equal(combined.sources.material.status,'ok');
    assert.deepEqual(combined.items.filter(x=>x.source==='material').map(x=>x.row.id).sort(),direct.map(x=>x.id).sort());
    return direct;
  }
  async function download(id) {
    const event=page.waitForEvent('download');await page.locator('[data-assignment-open="'+id+'"]').click();
    const file=await event;assert.equal(sha(await readFile(await file.path())),sha(pdf),'native download exact PDF');
    assert.match(file.suggestedFilename(),/^haiedu-assignment-/);
  }
  async function send(s,mode) {
    const saved=records.get(s.label);await page.goto(library(s));
    await page.locator('[data-resource-assign="'+saved.material.id+'"]').click();
    await expect(page.locator('[data-assignment-send]')).toBeVisible();
    const preview=positive(await assignment('preview',teacherContext(s),{materialId:saved.material.id}),'recipient preview');
    assert.deepEqual(preview.roster.map(x=>x.enrollmentId).sort(),[s.enrollment,actor(s,'peer').enrollment].sort(),'only this class in roster');
    await page.locator('[name=assignmentAudience][value='+mode+']').check();
    if(mode==='selected')await page.locator('[data-recipient="'+s.enrollment+'"]').check();
    const instructions='Synthetic '+s.label+' '+mode+' instructions';await page.locator('[data-assignment-instructions]').fill(instructions);
    const sent=[];const listener=r=>{if(r.url().endsWith('/functions/v1/manage-resource-assignments')&&r.postDataJSON()?.action==='assign')sent.push(r.postDataJSON());};
    page.on('request',listener);
    try {
      // Exercise two synchronous user clicks; the actual UI's busy guard must
      // prevent a second request. The later concurrent retries test the server.
      await page.locator('[data-assignment-send]').evaluate(button=>{button.click();button.click();});
      await expect(page.locator('.assignment-receipt-id')).toBeVisible();
    } finally {page.off('request',listener);}
    assert.equal(sent.length,1,'double click emits one assignment request');
    const id=(await page.locator('.assignment-receipt-id').innerText()).trim();
    const result=positive(await assignment('get',teacherContext(s),{id}),'durable assignment receipt');
    assert.equal(result.assignment.recipientCount,mode==='class'?2:1);
    const replies=await Promise.all([call('manage-resource-assignments',sent[0]),call('manage-resource-assignments',sent[0])]);
    for(const r of replies){const replay=positive(r,'concurrent identical retry');assert.equal(replay.assignment.id,id);assert.equal(replay.replayed,true);}
    const conflict=structuredClone(sent[0]);conflict.payload.instructions+=' changed';assert.equal((await call('manage-resource-assignments',conflict)).status,409,'changed request ID reuse refused');
    saved[mode]={id,instructions};
    await page.reload();
    const listed=positive(await assignment('list',teacherContext(s)),'assignment survives teacher reload');
    assert.equal(listed.assignments.filter(a=>a.id===id).length,1);
    check(s.label+' teacher: '+mode+' recipients, double click, concurrent retries, conflicting reuse and reload');
  }
  try {
    for(const s of fixture.schools) {
      await signin(actor(s,'teacher'));
      await page.goto(target.frontendOrigin+'/teacher.html?'+new URLSearchParams({view:'class',class:s.class,assignment:s.assignment,release:s.release,unit:s.unit}));
      await page.locator('#teacherResourcesLink').click();await page.locator('[data-resource-new]').click();
      await page.locator('[data-resource-file]').setInputFiles({name:'synthetic-'+s.label+'.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
      await expect(page.locator('[data-resource-file-status]')).toContainText('պատրաստ');
      await page.locator('[name=title]').fill('Synthetic '+s.label+' class reading');
      await page.locator('[name=sourceReference]').fill('Original fictional local QA document');
      await page.locator('[name=rightsConfirmed]').check();await page.locator('[name=assessmentSafe]').check();
      await page.locator('[data-resource-publish-library]').click();
      await expect(page.locator('[data-resource-compose-status]')).toContainText('Առաջադրանք չի ուղարկվել');
      const items=positive(await material('list',teacherContext(s)),'published library').materials;assert.equal(items.length,1);
      const m=items[0];assert.equal(m.status,'published');assert.equal(m.fileBytes,pdf.byteLength);
      const full=positive(await material('get',teacherContext(s),{id:m.id}),'publication audit');assert.equal(full.material.qa.passed,true);
      assert.deepEqual(full.events.map(e=>e.event).sort(),['created','file_attached','published','qa']);
      assert.equal(positive(await assignment('list',teacherContext(s)),'publication alone creates no assignment').assignments.length,0);
      records.set(s.label,{material:m});
      check(s.label+' teacher: native private PDF upload, QA and optional library publication without sending');
      await send(s,'selected');
      denied(await assignment('list',teacherContext(foreign(s))),'foreign teacher context');
      await signout();
    }
    for(const s of fixture.schools)for(const kind of ['student','peer','other_class']) {
      const a=actor(s,kind),r=records.get(s.label);await signin(a);await page.goto(work());
      const items=await inbox();assert.equal(items.length,kind==='student'?1:0);
      await expect(page.locator('[data-assignment-open]')).toHaveCount(kind==='student'?1:0);
      const optional=positive(await material('list',studentContext(s,a)),'own class library').materials;
      assert.deepEqual(optional.map(m=>m.id),kind==='other_class'?[]:[r.material.id],'library excludes other classes and schools');
      denied(await material('get',studentContext(s,a),{id:records.get(foreign(s).label).material.id}),'foreign material metadata refused');
      denied(await material('open',studentContext(s,a),{id:records.get(foreign(s).label).material.id}),'foreign material download refused');
      denied(await material('open',studentContext(foreign(s),{}),{id:records.get(foreign(s).label).material.id}),'forged foreign material context refused');
      if(kind==='student') {
        await expect(page.locator('[data-work-items]')).toContainText(r.selected.instructions);
        await download(r.selected.id);await page.reload();await expect(page.locator('[data-assignment-open]')).toHaveCount(1);await download(r.selected.id);
        const bytes=await assignment('open',studentContext(s,a),{id:r.selected.id});positive(bytes,'assigned bytes');assert.equal(bytes.hash,sha(pdf));assert.match(bytes.cache,/no-store/);
        check(s.label+' selected student: native task, instructions, exact PDF, reload and repeated download');
      } else {
        denied(await assignment('open',studentContext(s,a),{id:r.selected.id}),'unselected assignment denied');
        denied(await assignment('get',studentContext(s,a),{id:r.selected.id}),'unselected assignment metadata denied');
        if(kind==='peer')assert.equal((await material('open',studentContext(s,a),{id:r.material.id})).hash,sha(pdf),'unselected classmate may download optional class-library bytes');
        if(kind==='other_class')denied(await material('open',studentContext(s,a),{id:r.material.id}),'other-class material denied');
        check(s.label+' '+kind+': selected task and instructions hidden; class-library boundary preserved');
      }
      for(const action of ['get','open'])denied(await assignment(action,studentContext(s,a),{id:records.get(foreign(s).label).selected.id}),'foreign assignment refused');
      denied(await assignment('open',studentContext(foreign(s),{}),{id:records.get(foreign(s).label).selected.id}),'forged foreign enrollment refused');
      await signout([['manage-resource-assignments',body('inbox',{})],['manage-supplementary-resources',body('list',studentContext(s,a))]]);
    }
    for(const s of fixture.schools){await signin(actor(s,'teacher'));await send(s,'class');await signout();}
    for(const s of fixture.schools)for(const kind of ['student','peer','other_class']) {
      const a=actor(s,kind),r=records.get(s.label);await signin(a);await page.goto(work());
      const expected=kind==='student'?2:kind==='peer'?1:0;assert.equal((await inbox()).length,expected);
      await expect(page.locator('[data-assignment-open]')).toHaveCount(expected);
      if(kind!=='other_class'){await download(r.class.id);await page.reload();await expect(page.locator('[data-assignment-open]')).toHaveCount(expected);}
      else denied(await assignment('open',studentContext(s,a),{id:r.class.id}),'other-class class assignment denied');
      check(s.label+' '+kind+': whole-class delivery reaches exactly the enrolled class');await signout();
    }
    for(const s of fixture.schools)for(const kind of ['teacher','school_admin','student']) {
      await signin(actor(s,kind));const r=records.get(s.label),other=records.get(foreign(s).label);
      if(kind!=='teacher')denied(await assignment('preview',teacherContext(s),{materialId:r.material.id}),'teacher-only recipient roster refused');
      denied(await assignment('get',kind==='student'?studentContext(s,actor(s,kind)):teacherContext(s),{id:other.class.id}),'cross-school assignment refused');
      if(kind==='school_admin')denied(await material('get',teacherContext(s),{id:r.material.id}),'school admin cannot assume material teacher role');
      const privileged=await request('/rest/v1/rpc/service_resource_assignments',{p_actor_id:actor(s,'teacher').id,p_auth_session_id:'00000000-0000-4000-8000-000000000001',p_action:'list',p_context:teacherContext(s),p_payload:{}});
      assert.ok([401,403,404].includes(privileged.status),'privileged resource RPC refused');
      check(s.label+' '+kind+': school/role boundaries and privileged direct RPC enforced');
      await signout(kind==='teacher'?[['manage-resource-assignments',body('list',teacherContext(s))],['manage-supplementary-resources',body('list',teacherContext(s))]]:[]);
    }
    for(const s of fixture.schools) {
      const r=records.get(s.label);await signin(actor(s,'teacher'));await page.goto(library(s));
      await page.locator('[data-resource-assignment-history]').click();await page.locator('[data-assignment-inspect="'+r.selected.id+'"]').click();
      await page.locator('.assignment-cancel summary').click();await page.locator('[data-assignment-cancel-reason]').fill('Synthetic class plan changed');
      await page.locator('[data-assignment-cancel]').click();await expect(page.locator('.assignment-receipt h4')).toContainText('չեղարկված');
      const again=positive(await assignment('cancel',teacherContext(s),{id:r.selected.id,revision:1,reason:'Synthetic class plan changed'}),'identical cancel retry');assert.equal(again.assignment.revision,2);
      check(s.label+' teacher: native cancellation and identical retry preserve one cancellation');await signout();
      await signin(actor(s,'student'));await page.goto(work());await expect(page.locator('[data-assignment-open]')).toHaveCount(1);
      await page.locator('[data-work-history] summary').click();await expect(page.locator('[data-work-history-items]')).toContainText(r.selected.instructions);
      assert.equal(await page.locator('[data-work-history-items] [data-assignment-open]').count(),0);
      denied(await assignment('open',studentContext(s,actor(s,'student')),{id:r.selected.id}),'canceled assignment denied');await download(r.class.id);
      check(s.label+' student: cancellation retained in history, canceled download refused, other assignment still works');await signout();
      await signin(actor(s,'teacher'));await page.goto(library(s));await page.locator('[data-resource-edit="'+r.material.id+'"]').click();
      await page.locator('[name=reason]').fill('Synthetic material withdrawn after test');
      await page.getByText('Հրապարակում և նյութի կառավարում',{exact:true}).click();
      await page.locator('[data-resource-action=withdraw]').click();await expect(page.locator('[data-resource-message]')).toContainText('այլևս հասանելի չէ');
      check(s.label+' teacher: native withdrawal removes published material access');await signout();
      await signin(actor(s,'student'));await page.goto(work());
      const items=await inbox();assert.equal(items.length,1);assert.equal(items[0].available,false);await expect(page.locator('[data-work-items]')).toContainText('Նյութը հասանելի չէ');
      assert.equal(await page.locator('[data-assignment-open]').count(),0);
      denied(await assignment('open',studentContext(s,actor(s,'student')),{id:r.class.id}),'withdrawn assigned file denied');
      denied(await material('open',studentContext(s,actor(s,'student')),{id:r.material.id}),'withdrawn library file denied');
      if(s.label==='A')for(const width of [390,1365]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(fixture.screenshotDir,'resource-withdrawn-'+width+'.png'),fullPage:true});}
      check(s.label+' student: withdrawal preserves task history but prevents both download routes');await signout();
    }
    assert.equal(diagnostics.filter(d=>d.pageError||d.status>=500).length,0,'resource journey script/service errors');
  } catch(error) {
    await page.screenshot({path:path.join(fixture.screenshotDir,'resources-failure.png'),fullPage:true}).catch(()=>{});
    let message=String(error.stack??error)+' '+JSON.stringify(diagnostics.slice(-50));
    for(const secret of [...fixture.accounts.flatMap(a=>[a.email,a.password]),fixture.anonKey,retainedToken].filter(Boolean))message=message.replaceAll(secret,'[local-secret]');
    throw Error(message);
  }
}
