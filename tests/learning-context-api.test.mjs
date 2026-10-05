import test from 'node:test';
import assert from 'node:assert/strict';
import {createLearningContextHandler} from '../supabase/functions/_shared/learning-context-handler.mjs';
import {contextFixture,id,policyFixture} from './fixtures/learning-context.mjs';
function api(){const f=contextFixture();const handler=createLearningContextHandler({createAdmin:()=>f.admin,hasActiveLiveSession:f.liveSession,env:{url:'fixture',key:'fixture'}});return {...f,request:body=>handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify(body??f.choice)}))};}
test('live student receives selected context and unconfigured policy without any content, session or evidence writes',async()=>{
 const f=api(),r=await f.request(),b=await r.json();assert.equal(r.status,200);assert.equal(b.context.enrollmentId,id(112));assert.equal(b.assessmentPolicyStatus,'unconfigured');assert.equal(b.assessmentPolicy,null);assert.equal(b.readOnly,true);assert.equal(r.headers.get('Cache-Control'),'no-store');
 assert.equal(f.calls.some(c=>['attempts','learning_sessions','items','item_answer_keys','student_skill_mastery'].includes(c.table)),false);
});
test('second chapter blueprint is selected by exact unit even within one release',async()=>{
 const f=api(),a=await (await f.request()).json(),b=await (await f.request({...f.choice,unitId:id(121)})).json();assert.notEqual(a.blueprint.id,b.blueprint.id);assert.equal(b.context.unitSequence,2);
});
test('declared versioned policy is bound to server-derived context; mismatched policy fails closed',async()=>{
 const f=api(),bp=f.tables.assessment_blueprints[0];bp.configuration_snapshot.assessmentPolicy=policyFixture({subjectProgramId:id(101),curriculumReleaseId:id(104),unitId:id(120),mode:'diagnostic'});
 assert.equal((await (await f.request()).json()).assessmentPolicyStatus,'declared');bp.configuration_snapshot.assessmentPolicy.unitId=id(121);assert.equal((await f.request()).status,503);
});
test('draft, missing and ambiguous blueprints never fall through to another chapter',async()=>{
 for(const change of ['draft','missing','ambiguous']){const f=api();if(change==='draft')f.tables.assessment_blueprints[0].status='draft';if(change==='missing')f.tables.assessment_blueprints.shift();if(change==='ambiguous')f.tables.assessment_blueprints.push({...f.tables.assessment_blueprints[0],id:id(900)});assert.equal((await f.request()).status,503);}
});
test('invalid authentication, departed session, wrong role and archived account stop before context reads',async()=>{
 for(const change of ['auth','session','role','account']){const f=api();if(change==='auth')f.setValid(false);if(change==='session')f.setLive(false);if(change==='role')f.tables.profiles[0].role='teacher';if(change==='account')f.tables.profiles[0].account_status='archived';const r=await f.request();assert.ok([401,403].includes(r.status));assert.equal(f.calls.some(c=>c.table==='institutional_class_enrollments'),false);}
});
test('forged actor, class, policy and another students enrollment are rejected',async()=>{
 const f=api();for(const field of ['studentId','classId','schoolId','assessmentPolicy'])assert.equal((await f.request({...f.choice,[field]:id(2)})).status,400);
 assert.equal((await f.request({...f.choice,enrollmentId:id(312)})).status,403);
});
test('service errors never disclose private database details',async()=>{
 const f=api();f.admin.from=()=>{throw new Error('private SQL details');};const r=await f.request();assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'learning_context_service_unavailable'});
});
test('a session revoked while context is loading receives no context response',async()=>{
 const f=contextFixture();let checks=0;const handler=createLearningContextHandler({createAdmin:()=>f.admin,hasActiveLiveSession:async()=>++checks===1,env:{url:'fixture',key:'fixture'}});
 const r=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify(f.choice)}));assert.equal(checks,2);assert.equal(r.status,403);assert.deepEqual(await r.json(),{error:'account_or_session_inactive'});
});
