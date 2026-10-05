import test from 'node:test';
import assert from 'node:assert/strict';
import {readAssessmentPolicy,AssessmentPolicyInvalid} from '../supabase/functions/_shared/assessment-policy.mjs';
import {id,policyFixture} from './fixtures/learning-context.mjs';
const scope={subjectProgramId:id(101),curriculumReleaseId:id(104),unitId:id(120),mode:'diagnostic'};
test('missing policy remains unconfigured; no subject or scoring default is invented',()=>assert.equal(readAssessmentPolicy({},scope),null));
test('unequal explicit skill counts and different subject policies remain isolated and detached from source',()=>{
 const a=policyFixture(scope),b=policyFixture({...scope,subjectProgramId:id(201),curriculumReleaseId:id(204),unitId:id(220)});b.plannedQuestionCount=6;b.questionCountBySkill={[id(801)]:4,[id(802)]:2};
 const x=readAssessmentPolicy({assessmentPolicy:a},scope),y=readAssessmentPolicy({assessmentPolicy:b},b);x.questionCountBySkill[id(501)]=9;assert.equal(a.questionCountBySkill[id(501)],1);assert.equal(y.plannedQuestionCount,6);
 assert.throws(()=>readAssessmentPolicy({assessmentPolicy:b},scope),AssessmentPolicyInvalid);
});
test('mastery can explicitly exclude additional skills from per-skill passing without losing their question counts',()=>{
 const p=policyFixture({...scope,mode:'mastery_check'});delete p.maximumCompletedBaselines;p.baselineRequired=true;p.minimumPercent=80;p.minimumCorrectBySkill={[id(501)]:1};
 assert.deepEqual(readAssessmentPolicy({assessmentPolicy:p},p).minimumCorrectBySkill,{[id(501)]:1});
});
for(const [label,changes] of [
 ['unsupported schema',{schemaVersion:'unknown'}],['cross-unit policy',{unitId:id(121)}],['cross-release policy',{curriculumReleaseId:id(204)}],['missing version',{version:undefined}],
 ['count mismatch',{plannedQuestionCount:20}],['numeric strings',{plannedQuestionCount:'4'}],['negative skill allocation',{questionCountBySkill:{[id(501)]:-1}}],
 ['unknown capability',{responseTypes:['essay']}],['unregistered scoring',{scoringStrategy:'ai-grader'}],['protected hints',{hintsAllowed:true}],['second baseline',{maximumCompletedBaselines:2}],
 ['unknown fields',{unreviewedOverride:true}],['null contract',null]
])test(`policy rejects ${label}`,()=>{const p=changes===null?null:{...policyFixture(scope),...changes};assert.throws(()=>readAssessmentPolicy({assessmentPolicy:p},scope),AssessmentPolicyInvalid);});
