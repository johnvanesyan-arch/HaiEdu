import test from 'node:test';
import assert from 'node:assert/strict';
import {homeLearningSummary,homeLearningPath} from '../web/student-home-model.mjs';
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

const configured=Object.fromEntries(['diagnostic','practice','mastery_check'].map(m=>[m,{status:'configured'}]));
const states=data=>homeLearningPath({modes:configured,...data}).map(s=>[s.mode,s.state,s.detail]);
test('Home path mirrors the course page sequence without scores or eligibility of its own',()=>{
  // Before the diagnostic: practice and the check are locked; no score is ever shown.
  assert.deepEqual(states({practiceAccess:{unlocked:false},skills:[{ready:false},{ready:false}]}),[
    ['diagnostic','next','Հաջորդ քայլը'],['practice','locked','Կբացվի ախտորոշիչից հետո'],
    ['mastery_check','locked','Կբացվի, երբ 2 պահանջվող հմտություններն էլ պատրաստ լինեն']]);
  assert.equal(states({activeSession:{mode:'diagnostic',answered:4,planned:20},practiceAccess:{unlocked:false},skills:[]})[0][2],'Ընթացքի մեջ է · պատասխանված է 4 / 20');
  const after={baseline:{correct:16,answered:20,percent:80},practiceAccess:{unlocked:true}};
  const practising=states({...after,skills:[{ready:true},{ready:false},{ready:false,requiredForReadiness:false}]});
  assert.deepEqual(practising[0],['diagnostic','done','Ավարտված է']);
  assert.deepEqual(practising[1],['practice','current','Ընթացքի մեջ է · պատրաստ է 1 / 2 պահանջվող հմտություն']);
  assert.equal(practising[2][1],'locked');
  assert.ok(practising.every(([, ,d])=>!/16|80%/.test(d)),'No assessment score on Home');
  // The check opens only on the same evidence the course page uses; an active session defers it.
  assert.deepEqual(states({...after,skills:[{ready:true},{ready:true}]})[2],['mastery_check','next','Հասանելի է']);
  assert.equal(states({...after,activeSession:{mode:'practice',answered:1,planned:8},skills:[{ready:true}]})[2][2],'Հասանելի կլինի ընթացիկ աշխատանքն ավարտելուց հետո');
  assert.equal(states({...after,lifecycle:{state:'mastery_retry_2_ready'},skills:[{ready:false}]})[2][1],'next');
  assert.equal(states({...after,lifecycle:{state:'review_required_attempt_2'},skills:[{ready:false}]})[2][2],'Նախ ավարտեք պարտադիր կրկնությունը');
  assert.deepEqual(states({...after,lifecycle:{state:'mastery_passed'},skills:[]})[2],['mastery_check','done','Հանձնված է']);
  assert.deepEqual(states({...after,lifecycle:{state:'mastery_failed_final'},skills:[]})[2],['mastery_check','done','Ավարտված է']);
  // Unknown readiness never claims a count; unconfigured modes say so.
  assert.equal(states({...after,skills:[{ready:null}]})[2][2],'Կբացվի, երբ պահանջվող հմտությունները պատրաստ լինեն');
  assert.deepEqual(homeLearningPath({modes:{},skills:[]}).map(s=>s.state),['unavailable','unavailable','unavailable']);
});

test('Home next step follows the path and never adds a player action (16.5B.1)',()=>{
  const cfg={diagnostic:{status:'configured',questions:20},practice:{status:'configured'},mastery_check:{status:'configured'}};
  const cases=[
    [{practiceAccess:{unlocked:false},modes:cfg,skills:[{ready:false}]},'Անցնել ախտորոշիչին','assessment'],
    [{practiceAccess:{unlocked:false},modes:{},skills:[]},'Անցնել գնահատումներին','assessment'],
    [{practiceAccess:{unlocked:true},baseline:{},modes:cfg,skills:[{ready:true},{ready:false}]},'Անցնել վարժանքին','assessment'],
    [{practiceAccess:{unlocked:true},baseline:{},modes:cfg,skills:[{ready:true}]},'Անցնել ստուգմանը','assessment'],
    [{practiceAccess:{unlocked:true},baseline:{},modes:{},skills:[]},'Բացել դասընթացը','course'],
  ];
  for (const [data,action,tab] of cases) {
    const summary=homeLearningSummary(context,data), url=new URL(summary.href,'https://fixture.invalid');
    assert.equal(summary.action,action);
    assert.equal(url.searchParams.get('tab'),tab);
    assert.equal(url.searchParams.has('action'),false,action);
  }
  assert.match(homeLearningSummary(context,cases[0][0]).description,/^20 հարց/);
});
