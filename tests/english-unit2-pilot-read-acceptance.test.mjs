import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { english, configuration, decision, configurationPath, decisionPath, policyFields,
  validateActivation, englishContract, guideContract, englishReadAllowed, runReadChecks, writingTaskId, writingTask, preservedEnglish, readContract, readContractPath, guideProjectionMatches } from '../scripts/english-unit2-pilot-read-acceptance.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = p => readFile(p).then(b => createHash('sha256').update(b).digest('hex'));
const configurationSha256 = await hash(configurationPath), decisionManifestSha256 = await hash(decisionPath);
const readContractSha256 = await hash(readContractPath);
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const copy = structuredClone;
function inputs() {
  const fixture = { dedicatedQa: true }, credentials = {};
  for (const [n, side] of ['A','B'].entries()) {
    fixture[side] = Object.fromEntries(['schoolId','classId','assignmentId','adminId','teacherId','studentId'].map((k,i) => [k,id(n*20+i+1)]));
    Object.assign(fixture[side], { curriculumReleaseId: id(80), unitId: id(81) });
    for (const role of ['admin','teacher','student']) credentials[`${side}_${role}`] = { email: `${side}_${role}@example.invalid`, password: 'synthetic' };
  }
  // Synthetic owner decision exercises schema guards only, never human consent.
  const activation = { schemaVersion: 'haiedu-english-unit2-activation-v1', status: 'activated', activatedAt: '2026-10-22T00:00:00Z', releaseStatus: 'pilot',
    scope: english, configurationSha256, decisionManifestSha256, readContractSha256, protectedConfigurationSha256: configuration.protectedConfigurationSha256, sourceProtectionVerified: true, specialistGate: 'pending', independentSmeApproved: false, unseenAssessmentClaim: false, verifiedReadback: true,
    ownerAuthorization: { action: 'activate_provisional_pilot', scope: english, decisionManifestSha256, ownerDirection: 'SYNTHETIC TEST ONLY', recordedAt: '2026-10-22T00:00:00Z',
      specialistReview: 'deferred' } };
  return { fixture, credentials, activation, revision: 'a'.repeat(40), ref: 'refs/heads/main' };
}
function dashboard(context) {
  const required = configuration.policies.find(p=>p.mode==='mastery_check').readinessSkillIds;
  return { dashboardVersion:'authorized-learning-dashboard-v1',readOnly:true,context,maximumAttempts:3,
    skills:required.map(id=>({id,requiredForReadiness:true,ready:false})),baseline:null,activeSession:null,history:[],
    practiceAccess:{unlocked:false,reason:'chapter_diagnostic_required'},lifecycle:null,
    modes:Object.fromEntries(configuration.policies.map(p=>[p.mode,{...Object.fromEntries(policyFields.map(k=>[k,p[k]??null])),status:'configured',questions:p.plannedQuestionCount,policyVersion:p.version}])) };
}
function mock(input, alter = () => null) {
  const contexts={},dashboards={},calls=[],checks=[];
  for (const [n,side] of ['A','B'].entries()) {
    const common={schoolId:input.fixture[side].schoolId,classId:input.fixture[side].classId};
    contexts[side]=[{...common,enrollmentId:id(100+n),subjectProgramId:id(300),teacherAssignmentId:input.fixture[side].assignmentId,curriculumReleaseId:id(80),unitId:id(81)},
      {...common,...english,enrollmentId:id(110+n),teacherAssignmentId:id(120+n),unitTitleHy:'Անգլերեն'},
      {...common,...preservedEnglish,enrollmentId:id(110+n),teacherAssignmentId:id(120+n),unitTitleHy:'Unit 1'}];
    dashboards[side]=contexts[side].map(c=>dashboard(c));
    dashboards[side][2].history=[{id:id(500+n),unitId:preservedEnglish.unitId}];
    dashboards[side][0].baseline={id:id(400+n),curriculumReleaseId:id(80)};
  }
  const request=async(actor,endpoint,body)=>{
    calls.push({actor,endpoint,body});const changed=alter({actor,endpoint,body,contexts,dashboards});if(changed)return changed;
    if(!actor)return {status:401,data:{error:'unauthorized'}};
    const [side,role]=actor.split('_');
    if(endpoint.endsWith('/get-student-classes'))return {status:200,data:{contexts:contexts[side]}};
    if(endpoint.endsWith('/manage-written-work')){
      const own=contexts[side][1],selection=body.context;
      const valid=selection.curriculumReleaseId===english.curriculumReleaseId&&selection.unitId===english.unitId;
      if(body.action==='queue')return role==='teacher'&&valid&&selection.assignmentId===own.teacherAssignmentId?{status:200,data:{version:'written-work-v1',queue:[]}}:{status:403,data:{error:'written_context_unavailable'}};
      if(role!=='student'||!valid||selection.enrollmentId!==own.enrollmentId)return {status:403,data:{error:'written_context_unavailable'}};
      assert.equal(body.action,'tasks');return {status:200,data:{version:'written-work-v1',tasks:[{...writingTask,available:true}]}};
    }
    const index=contexts[side].findIndex(c=>['enrollmentId','curriculumReleaseId','unitId'].every(k=>c[k]===body[k]));
    if(role!=='student'||index<0)return {status:403,data:{error:'learning_context_unavailable'}};
    if(endpoint.endsWith('/get-unit-guides'))return {status:200,data:{guidesVersion:'unit-guides-v1',readOnly:true,availability:'diagnostic_required',guides:[]}};
    assert.equal(endpoint,'/functions/v1/get-student-dashboard');return {status:200,data:copy(dashboards[side][index])};
  };
  const check=(label,passed)=>{checks.push({label,passed});assert.ok(passed,label);};
  return {request,check,calls,checks,contexts,dashboards};
}

test('English live acceptance rejects preparation, wrong hashes or owner decisions, PRs and nondesignated identities',()=>{
  const input=inputs();assert.deepEqual(validateActivation(input),[]);
  for(const change of [x=>x.activation.status='prepared',x=>x.activation.releaseStatus='production',x=>x.activation.scope={...english,unitId:id(500)},
    x=>x.activation.configurationSha256='0'.repeat(64),x=>x.activation.decisionManifestSha256='0'.repeat(64),x=>delete x.activation.ownerAuthorization,
    x=>x.activation.sourceProtectionVerified=false,x=>x.activation.protectedConfigurationSha256='0'.repeat(64),
    x=>x.activation.readContractSha256='0'.repeat(64),x=>x.activation.ownerAuthorization.specialistReview='approved',
    x=>x.activation.specialistGate='passed',x=>x.activation.independentSmeApproved=true,x=>x.activation.unseenAssessmentClaim=true,
    x=>x.activation.verifiedReadback=false,x=>x.ref='refs/pull/1/merge',x=>x.fixture.dedicatedQa=false,x=>x.credentials.B_student=x.credentials.A_student]){
    const changed=copy(input);change(changed);assert.ok(validateActivation(changed).length);
  }
});
test('English policy reads reject changed minima, model, scope, response types and leaked content',()=>{
  const d=dashboard({...english,enrollmentId:id(100)});assert.equal(englishContract(d,d.context),true);
  for(const change of [x=>x.modes.mastery_check.minimumPercent=75,x=>x.modes.mastery_check.schemaVersion='haiedu-assessment-policy-v3',
    x=>x.modes.practice.learningModelConfigurationId=id(600),x=>x.modes.diagnostic.responseTypes=['typed_fields'],
    x=>x.modes.mastery_check.minimumCorrectBySkill[configuration.policies[0].deliveredSkillIds[0]]=0,
    x=>x.skills[0].requiredForReadiness=false,x=>x.skills.push(x.skills[0]),x=>x.modes.mastery_check.reportingGroups.pop(),
    x=>delete x.modes.practice.minimumPercent,x=>x.context.subjectProgramId=id(700),x=>x.answerKey='protected']){
    const changed=copy(d);change(changed);assert.equal(englishContract(changed,d.context),false);
  }
});
test('guide acceptance respects diagnostic and assessment gates, then checks exact lesson order and public projection',()=>{
  const d=dashboard({...english,enrollmentId:id(100)}),response={guidesVersion:'unit-guides-v1',readOnly:true,availability:'diagnostic_required',guides:[]};
  assert.equal(guideContract(response,d),true);assert.equal(guideContract({...response,availability:'available'},d),false);
  d.activeSession={mode:'diagnostic'};assert.equal(guideContract({...response,availability:'assessment_active'},d),true);
  d.activeSession=null;d.baseline={id:id(600)};
  const full={...response,availability:'available',guides:[
    {id:id(1),version:1,sequenceOrder:1,title:'SYNTHETIC',text:'Synthetic guide',workedExample:{steps:['one']},locale:'en',schemaVersion:'unit-guide-v1'},
    {id:id(2),version:1,sequenceOrder:2,title:'SYNTHETIC 2',text:'Synthetic guide 2',workedExample:{steps:['two']},locale:'en',schemaVersion:'unit-guide-v1'},
  ]};
  const expected={count:2,projectionSha256:digest(full.guides)};
  assert.equal(guideProjectionMatches(full.guides,expected),true);
  assert.equal(guideProjectionMatches(full.guides.map(g=>Object.fromEntries(Object.entries(g).reverse())),expected),true);
  assert.equal(guideContract(full,d),false); // synthetic content cannot substitute for the eight accepted guides
  for(const change of [x=>x.guides.reverse(),x=>x.guides.pop(),x=>x.guides[0].text+='changed',x=>x.guides[0].reviewedBy=id(1)]){
    const changed=copy(full);change(changed);assert.equal(guideProjectionMatches(changed.guides,expected),false);
  }
});
test('production browser allowlist blocks writing opens/saves, answers, playback and unexpected bodies',()=>{
  const context={enrollmentId:id(1),curriculumReleaseId:english.curriculumReleaseId,unitId:english.unitId};
  assert.equal(englishReadAllowed({pathname:'/functions/v1/manage-written-work',method:'POST',body:{action:'tasks',context,payload:{}}}),true);
  assert.equal(englishReadAllowed({pathname:'/functions/v1/get-unit-guides',method:'POST',body:context}),true);
  for(const action of ['open','save','submit','review','queue','inspect'])assert.equal(englishReadAllowed({pathname:'/functions/v1/manage-written-work',method:'POST',body:{action,context,payload:{}}}),false);
  for(const endpoint of ['get-learning-audio','get-next-item','submit-answer','start-diagnostic','start-practice','get-learning-task-set'])assert.equal(englishReadAllowed({pathname:`/functions/v1/${endpoint}`,method:'POST',body:context}),false);
  assert.equal(englishReadAllowed({pathname:'/functions/v1/manage-written-work',method:'POST',body:{action:'tasks',context,payload:{text:'write'}}}),false);
  assert.equal(englishReadAllowed({pathname:'/functions/v1/get-unit-guides',method:'POST',body:{...context,studentId:id(9)}}),false);
});
test('two-school English reads preserve existing programmes and never request learning mutations',async()=>{
  const input=inputs(),m=mock(input),r=await runReadChecks({...input,...m});await r.verifyPreserved();
  assert.ok(m.checks.length>=32);assert.ok(m.calls.every(c=>['get-student-classes','get-student-dashboard','get-unit-guides','manage-written-work'].some(n=>c.endpoint.endsWith('/'+n))));
  assert.ok(m.calls.filter(c=>c.endpoint.endsWith('/manage-written-work')).every(c=>['tasks','queue'].includes(c.body.action)));
  assert.ok(m.calls.some(c=>c.body?.enrollmentId===m.contexts.B[1].enrollmentId&&c.actor==='A_student'));
});
test('missing English enrollment fails rather than substituting another programme or creating membership',async()=>{
  const input=inputs(),m=mock(input,({endpoint,contexts})=>endpoint.endsWith('/get-student-classes')?{status:200,data:{contexts:[contexts.A[0]]}}:null);
  await assert.rejects(runReadChecks({...input,...m}),/exactly one designated Unit 2/);
  assert.equal(m.calls.length,1);
});
test('changed preserved learner evidence fails the end-of-run comparison',async()=>{
  const input=inputs(),m=mock(input),r=await runReadChecks({...input,...m});m.dashboards.A[0].history.push({id:id(999)});
  await assert.rejects(r.verifyPreserved(),/learning state preserved/);
});
test('Unit 1 shares the English enrollment; mixed releases/units are explicitly denied without clearing Unit 1 evidence',async()=>{
  const input=inputs(),m=mock(input),r=await runReadChecks({...input,...m});await r.verifyPreserved();
  assert.equal(m.contexts.A[1].enrollmentId,m.contexts.A[2].enrollmentId);
  for(const endpoint of ['get-student-dashboard','get-unit-guides','manage-written-work']) {
    const mixed=m.calls.filter(c=>c.endpoint.endsWith('/'+endpoint)).map(c=>c.body.context??c.body)
      .filter(c=>c.enrollmentId===m.contexts.A[1].enrollmentId);
    assert.ok(mixed.some(c=>c.curriculumReleaseId===english.curriculumReleaseId&&c.unitId===preservedEnglish.unitId));
    assert.ok(mixed.some(c=>c.curriculumReleaseId===preservedEnglish.curriculumReleaseId&&c.unitId===english.unitId));
  }
  m.dashboards.A[2].history=[];await assert.rejects(r.verifyPreserved(),/learning state preserved/);
});
test('mixed Unit 1/Unit 2 scope returning a schema error or data never passes as authorization denial',async()=>{
  for(const response of [{status:400,data:{error:'invalid_request'}},{status:200,data:{}},{status:403,data:{error:'learning_context_unavailable',detail:'leak'}}]) {
    const input=inputs(),m=mock(input,({endpoint,body})=>endpoint.endsWith('/get-student-dashboard')&&body.curriculumReleaseId===english.curriculumReleaseId&&body.unitId===preservedEnglish.unitId?response:null);
    await assert.rejects(runReadChecks({...input,...m}),/mixed unit/);
  }
});
test('separate writing task must match accepted identity, version, title, locale and baseline treatment',async()=>{
  for(const field of ['id','version','title','locale','baselineRequired','available']) {
    const input=inputs(),m=mock(input,({endpoint,body})=>endpoint.endsWith('/manage-written-work')&&body.action==='tasks'?{status:200,data:{version:'written-work-v1',tasks:[{...writingTask,available:true,[field]:'wrong'}]}}:null);
    await assert.rejects(runReadChecks({...input,...m}),/accepted separate W01/);
  }
});
test('final packet binds the accepted configuration, source allocation and existing use instructions without activation',async()=>{
  assert.equal(decision.learnerActivationAuthorized,false);assert.equal(decision.productionWrites,0);
  assert.equal(decision.configuration.sha256,configurationSha256);
  assert.equal(decision.configuration.protectedConfigurationSha256,configuration.protectedConfigurationSha256);
  assert.equal(decision.readContract.sha256,readContractSha256);assert.deepEqual(readContract.scope,english);
  assert.equal(readContract.guides.count,8);assert.equal(readContract.guides.identities.length,8);
  assert.deepEqual(readContract.guides.identities.map(g=>g.sequenceOrder),[1,2,3,4,5,6,7,8]);
  const inventory=decision.sourceInventory,active=inventory.initiallyAllocatedTaskSets,optional=inventory.optionalTaskSetsOutsideInitialAllocation;
  assert.equal(inventory.audio.length,14);assert.equal(active.length,25);assert.equal(optional.length,3);
  assert.equal(active.filter(x=>x.kind==='text').length,14);assert.equal(active.filter(x=>x.kind==='audio').length,11);
  assert.equal(inventory.audio.filter(x=>x.initiallyAllocated).length,11);
  assert.deepEqual(new Set([...active,...optional].filter(x=>x.kind==='audio').map(x=>x.audioVersionId)),new Set(inventory.audio.map(x=>x.id)));
  assert.equal(decision.requiredOwnerRecord.ownerDirection,null);
  assert.equal(decision.sourceUse.basis,'existing_owner_course_instructions');assert.equal(decision.sourceUse.repeatOwnerContentAudioReviewRequired,false);
  assert.equal(decision.proposal.specialistReview,'deferred');assert.equal(decision.proposal.independentSmeApproved,false);
  assert.equal(decision.proposal.unseenAssessmentClaim,false);assert.equal(decision.sourceProtection.unit1PublicBankExceptionInherited,false);
  for(const [file,sha] of Object.entries(decision.existingEvidence)) assert.equal(await hash(file),sha,file);
});
