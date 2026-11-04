import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {preflight,browserAllowed,frozenResponse,digest,scope} from './live/answer-recovery-acceptance.mjs';
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const fixture={dedicatedQa:true},credentials={};
for(const [i,side] of ['A','B'].entries()){
 fixture[side]=Object.fromEntries(['schoolId','classId','assignmentId','adminId','teacherId','studentId'].map((key,j)=>[key,id(1+i*10+j)]));
 Object.assign(fixture[side],{curriculumReleaseId:scope.curriculumReleaseId,unitId:scope.unitId});
 for(const role of ['admin','teacher','student'])credentials[`${side}_${role}`]={email:`${side}-${role}@example.invalid`,password:'synthetic-test-only'};
}
const env={GITHUB_REPOSITORY:'johnvanesyan-arch/HaiEdu',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',QA_EXECUTE:'true',GITHUB_SHA:'a'.repeat(40)};
const dashboard={skills:[{id:id(30)}],activeSession:null,latestDiagnostic:null};
const ledger={sessionId:id(31)},current={sessionItemId:id(32),item:{id:scope.allowedItemIds[0],type:'single_choice'}};
const body={sessionId:ledger.sessionId,sessionItemId:current.sessionItemId,itemId:current.item.id,response:{value:'A'},responseTimeMs:250,hintUsed:false};
const allowed=(fn,body,extra={})=>browserAllowed({pathname:'/functions/v1/'+fn,method:'POST',body,ledger,current,...extra});
test('live recovery requires explicit main dispatch and six designated identities',()=>{
 assert.equal(preflight({env,fixture,credentials,dashboard}),true);
 for(const [key,value] of [['GITHUB_REPOSITORY','other/repo'],['GITHUB_REF','refs/pull/1/merge'],['GITHUB_EVENT_NAME','push'],['QA_EXECUTE','false'],['GITHUB_SHA','main']])assert.equal(preflight({env:{...env,[key]:value},fixture,credentials,dashboard}),false);
 assert.equal(preflight({env,fixture:{...fixture,dedicatedQa:false},credentials,dashboard}),false);
 assert.equal(preflight({env,fixture,credentials:{},dashboard}),false);
});
test('live recovery refuses existing learner work or another release',()=>{
 for(const changed of [{activeSession:{id:id(40)}},{latestDiagnostic:{id:id(41)}},{skills:[]}])assert.equal(preflight({env,fixture,credentials,dashboard:{...dashboard,...changed}}),false);
 assert.equal(preflight({env,fixture:{...fixture,B:{...fixture.B,curriculumReleaseId:id(42)}},credentials,dashboard}),false);
});
test('browser mutation guard allows only the owned diagnostic item and bounded resume',()=>{
 assert.equal(allowed('submit-answer',body),true);
 for(const field of ['sessionId','sessionItemId','itemId'])assert.equal(allowed('submit-answer',{...body,[field]:id(45)}),false);
 for(const changed of [{hintUsed:true},{responseTimeMs:NaN},{responseTimeMs:-1},{response:null},{extra:'unexpected'}])assert.equal(allowed('submit-answer',{...body,...changed}),false);
 assert.equal(allowed('start-learning-session',{mode:'diagnostic'}),true);
 assert.equal(allowed('start-learning-session',{mode:'diagnostic'},{ledger:{}}),false);
 for(const fn of ['submit-mastery-answer','get-remediation-help','manage-written-work','manage-student-invitation'])assert.equal(allowed(fn,body),false);
 assert.equal(allowed('start-learning-session',{mode:'mastery_check'}),false);
 assert.equal(allowed('get-session-item',{sessionId:id(46)}),false);
 assert.equal(allowed('get-session-item',{sessionId:ledger.sessionId}),true);
 assert.equal(allowed('submit-answer',body,{method:'DELETE'}),false);
 assert.equal(allowed('submit-answer',body,{method:'OPTIONS'}),true);
});
test('normal result telemetry requires an observed own recommendation',()=>{
 const rec={recommendationInstanceId:id(47),eventType:'shown',surface:'diagnostic_result'};
 assert.equal(allowed('record-recommendation-event',rec),false);
 assert.equal(allowed('record-recommendation-event',rec,{recommendations:new Set([id(47)])}),true);
 assert.equal(allowed('record-recommendation-event',{...rec,eventType:'clicked'},{recommendations:new Set([id(47)])}),false);
});
test('frozen receipt comparison ignores only the replay marker',()=>{
 const original={attemptId:id(50),session:{answered_count:1},accepted:true};
 assert.equal(digest(original),digest(frozenResponse({...original,replayed:true})));
 assert.notEqual(digest(original),digest(frozenResponse({...original,replayed:true,session:{answered_count:2}})));
 assert.deepEqual(original,{attemptId:id(50),session:{answered_count:1},accepted:true});
});
test('production recovery is manual, source guarded, serialized and credential bounded',async()=>{
 const workflow=await readFile('.github/workflows/live-answer-recovery-acceptance.yml','utf8');
 assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/^  (push|pull_request):/m);
 assert.match(workflow,/default: false/);assert.match(workflow,/test "\$GITHUB_REF" = refs\/heads\/main/);
 assert.match(workflow,/group: sprint-14-isolation-qa\n  cancel-in-progress: false\n  queue: max/);
 assert.match(workflow,/node scripts\/wait-for-production-release.mjs/);
 assert.ok(workflow.indexOf('Require all five release jobs')<workflow.indexOf('QA_SCHOOL_A_ADMIN_EMAIL:'));
 assert.doesNotMatch(workflow,/SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
 assert.equal(scope.maximumAnswers,20);assert.equal(scope.maximumSessions,1);
});
