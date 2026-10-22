import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { english, configuration, decision, configurationPath, decisionPath, policyFields,
  validateActivation, englishContract, guideContract, englishReadAllowed, runReadChecks, writingTaskId } from '../scripts/english-unit1-pilot-read-acceptance.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = p => readFile(p).then(b => createHash('sha256').update(b).digest('hex'));
const configurationSha256 = await hash(configurationPath), decisionManifestSha256 = await hash(decisionPath);
const materials = JSON.parse(await readFile('docs/content/english-7-unit-01-materials.json', 'utf8'));
const copy = structuredClone;
function inputs() {
  const fixture = { dedicatedQa: true }, credentials = {};
  for (const [n, side] of ['A','B'].entries()) {
    fixture[side] = Object.fromEntries(['schoolId','classId','assignmentId','adminId','teacherId','studentId'].map((k,i) => [k,id(n*20+i+1)]));
    Object.assign(fixture[side], { curriculumReleaseId: id(80), unitId: id(81) });
    for (const role of ['admin','teacher','student']) credentials[`${side}_${role}`] = { email: `${side}_${role}@example.invalid`, password: 'synthetic' };
  }
  // Synthetic owner decision exercises schema guards only, never human consent.
  const activation = { schemaVersion: 'haiedu-english-unit1-activation-v1', status: 'activated', activatedAt: '2026-10-22T00:00:00Z', releaseStatus: 'pilot',
    scope: english, configurationSha256, decisionManifestSha256, specialistGate: 'pending', independentSmeApproved: false, unseenAssessmentClaim: false, verifiedReadback: true,
    ownerAuthorization: { action: 'activate_provisional_pilot', scope: english, decisionManifestSha256, ownerDirection: 'SYNTHETIC TEST ONLY', recordedAt: '2026-10-22T00:00:00Z',
      specialistReview: 'deferred', learnerSourceUseConfirmed: true, recordingProviderVoiceUseBasis: 'synthetic', textbookAdaptationUseBasis: 'synthetic' } };
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
      {...common,...english,enrollmentId:id(110+n),teacherAssignmentId:id(120+n),unitTitleHy:'Անգլերեն'}];
    dashboards[side]=contexts[side].map(c=>dashboard(c));
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
      assert.equal(body.action,'tasks');return {status:200,data:{version:'written-work-v1',tasks:[{id:writingTaskId,version:1,available:true,baselineRequired:false}]}};
    }
    const index=contexts[side].findIndex(c=>['enrollmentId','curriculumReleaseId','unitId'].every(k=>c[k]===body[k]));
    if(role!=='student'||index<0)return {status:403,data:{error:'learning_context_unavailable'}};
    if(endpoint.endsWith('/get-unit-guides'))return {status:200,data:{guidesVersion:'unit-guides-v1',readOnly:true,availability:'diagnostic_required',guides:[]}};
    assert.equal(endpoint,'/functions/v1/get-student-dashboard');return {status:200,data:copy(dashboards[side][index])};
  };
  const check=(label,passed)=>{checks.push({label,passed});assert.ok(passed,label);};
  return {request,check,calls,checks,contexts,dashboards};
}

test('English live acceptance rejects preparation, wrong source decisions, PRs and nondesignated identities',()=>{
  const input=inputs();assert.deepEqual(validateActivation(input),[]);
  for(const change of [x=>x.activation.status='prepared',x=>x.activation.releaseStatus='production',x=>x.activation.scope={...english,unitId:id(500)},
    x=>x.activation.configurationSha256='0'.repeat(64),x=>x.activation.decisionManifestSha256='0'.repeat(64),x=>delete x.activation.ownerAuthorization,
    x=>x.activation.ownerAuthorization.learnerSourceUseConfirmed=false,x=>x.activation.ownerAuthorization.recordingProviderVoiceUseBasis='',
    x=>x.activation.ownerAuthorization.textbookAdaptationUseBasis='',x=>x.activation.ownerAuthorization.specialistReview='approved',
    x=>x.activation.specialistGate='passed',x=>x.activation.independentSmeApproved=true,x=>x.activation.unseenAssessmentClaim=true,
    x=>x.activation.verifiedReadback=false,x=>x.ref='refs/pull/1/merge',x=>x.fixture.dedicatedQa=false,x=>x.credentials.B_student=x.credentials.A_student]){
    const changed=copy(input);change(changed);assert.ok(validateActivation(changed).length);
  }
});
test('English policy reads reject changed minima, model, scope, response types and leaked content',()=>{
  const d=dashboard({...english,enrollmentId:id(100)});assert.equal(englishContract(d,d.context),true);
  for(const change of [x=>x.modes.mastery_check.minimumPercent=75,x=>x.modes.mastery_check.schemaVersion='haiedu-assessment-policy-v3',
    x=>x.modes.practice.learningModelConfigurationId=id(600),x=>x.modes.diagnostic.responseTypes=['single_choice'],
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
  const full={...response,availability:'available',guides:materials.materials.filter(m=>m.kind==='guide').map(m=>({id:m.id,version:m.versionNo,sequenceOrder:m.sequenceOrder,
    schemaVersion:m.definition.schemaVersion,title:m.definition.title,text:m.definition.text,workedExample:m.definition.workedExample,locale:m.definition.locale}))};
  assert.equal(guideContract(full,d),true);
  for(const change of [x=>x.guides.reverse(),x=>x.guides.pop(),x=>x.guides[0].text+='changed',x=>x.guides[0].reviewedBy=id(1)]){
    const changed=copy(full);change(changed);assert.equal(guideContract(changed,d),false);
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
  await assert.rejects(runReadChecks({...input,...m}),/exactly one designated English/);
  assert.equal(m.calls.length,1);
});
test('changed preserved learner evidence fails the end-of-run comparison',async()=>{
  const input=inputs(),m=mock(input),r=await runReadChecks({...input,...m});m.dashboards.A[0].history.push({id:id(999)});
  await assert.rejects(r.verifyPreserved(),/learning state preserved/);
});
test('pending release decision accounts for every linked source without claiming permissions or activation',()=>{
  assert.equal(decision.learnerActivationAuthorized,false);assert.equal(decision.productionWrites,0);
  assert.equal(decision.configuration.sha256,configurationSha256);
  assert.equal(decision.sourceInventory.audio.length,14);assert.equal(decision.sourceInventory.taskSets.length,27);
  assert.equal(decision.sourceInventory.taskSets.filter(x=>x.kind==='text').length,13);
  assert.deepEqual(new Set(decision.sourceInventory.taskSets.filter(x=>x.kind==='audio').map(x=>x.audioVersionId)),new Set(decision.sourceInventory.audio.map(x=>x.id)));
  assert.equal(decision.requiredOwnerRecord.learnerSourceUseConfirmed,null);
  assert.equal(decision.requiredOwnerRecord.recordingProviderVoiceUseBasis,null);
  assert.equal(decision.requiredOwnerRecord.textbookAdaptationUseBasis,null);
});
