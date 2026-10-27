import test from 'node:test';
import assert from 'node:assert/strict';
import {homeLearningSummary} from '../web/student-home-model.mjs';
import {studentHomeHref,contextHref} from '../web/learning-navigation.mjs';
const id=n=>`76000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const context={enrollmentId:id(1),curriculumReleaseId:id(2),unitId:id(3)};
test('Home preserves the exact active session scope, skill and registered extension boundary',()=>{
  const data={activeSession:{mode:'practice',answered:3,planned:8,policyBindingId:'old-binding',targetSkillId:id(8)},modes:{practice:{status:'unconfigured'}},skills:[]};
  const summary=homeLearningSummary(context,data);
  assert.equal(summary.href,contextHref(context,'assessment',{action:'practice',skill:id(8)}));
  assert.match(summary.count,/3 \/ 8/);
  assert.equal(summary.readiness,null);
  const legacy={...context,extensionKey:'legacy-physics7-u01-v1'};
  data.activeSession.policyBindingId=null; data.modes.practice.extensionKey=legacy.extensionKey;
  assert.match(homeLearningSummary(legacy,data).href,/^\.\/practice.html\?enrollment=/);
});
test('Home distinguishes required readiness, missing evidence and diagnostic entry without starting work',()=>{
  const data={practiceAccess:{unlocked:false},skills:[{ready:true},{ready:false},{ready:false,requiredForReadiness:false}]};
  assert.deepEqual(homeLearningSummary(context,data).readiness,{ready:1,required:2});
  assert.equal(homeLearningSummary(context,data).href,contextHref(context,'assessment'));
  data.skills.push({ready:null});
  assert.equal(homeLearningSummary(context,data).readiness,null);
  data.activeSession={mode:'future-mode'};
  assert.equal(homeLearningSummary(context,data).href,contextHref(context,'course'));
});
test('Home navigation carries enrollment, release and unit without player actions or invalid selectors',()=>{
  const url=new URL(studentHomeHref('work',context),'https://fixture.invalid');
  assert.equal(url.searchParams.get('view'),'work');
  assert.equal(url.searchParams.get('release'),id(2));
  assert.equal(url.searchParams.has('action'),false);
  assert.throws(()=>studentHomeHref('home',{...context,unitId:'other'}),/invalid_context_selection/);
});
