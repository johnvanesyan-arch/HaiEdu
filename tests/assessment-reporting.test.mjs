import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessmentRules,assessmentResultMarkup,assessmentScopeText,assessmentScopeMarkup,assessmentGroupMarkup} from '../web/assessment-reporting.mjs';
import {renderEvidenceGroups} from '../web/analytics-provenance.mjs';

const manifest=JSON.parse(readFileSync('docs/content/english-7-unit-01-release-configuration.json','utf8'));
const policy=manifest.policies.find(p=>p.mode==='mastery_check');
const groups=policy.reportingGroups.map(g=>({key:g.key,label:g.label,earned:0,possible:g.skillIds.reduce((n,id)=>n+policy.questionCountBySkill[id],0),percent:0,determinesPass:true}));
const result=()=>({schemaVersion:'haiedu-assessment-result-v3',passed:true,score:{earned:22.5,possible:28,percent:80.36},groups:structuredClone(groups)});

test('English rules present the approved four-domain 5/15/4/4 scope without claiming writing or speaking',()=>{
 const html=assessmentRules(policy);
 for(const expected of ['Բառապաշար՝ 5 հարց','Քերականություն՝ 15 հարց','Ընթերցանություն՝ 4 հարց','Ունկնդրում՝ 4 հարց','80%',assessmentScopeText])assert.ok(html.includes(expected));
 assert.doesNotMatch(html,/ENG7|CEFR|Գրավոր խոսք|Բանավոր խոսք/);
 assert.deepEqual(groups.map(g=>g.possible),[5,15,4,4]);
});

test('display follows the saved pass decision even when rounded percentage looks sufficient',()=>{
 const saved=result();saved.passed=false;saved.score={earned:26,possible:28,percent:92.86};
 assert.match(assessmentResultMarkup(saved),/Ստուգարքը չի անցել/);
 saved.score={earned:22.3888,possible:28,percent:80};
 const html=assessmentResultMarkup(saved);assert.match(html,/Ստուգարքը չի անցել/);assert.doesNotMatch(html,/Ստուգարքն անցած է/);
 assert.ok(html.includes(assessmentScopeText));
});

test('completed Diagnostic is descriptive even with perfect scores; Mastery is explicitly scoped',()=>{
 const saved=result();saved.score=null;saved.passed=null;saved.groups.forEach(g=>{g.earned=g.possible;g.percent=100;g.determinesPass=false;});
 const diagnostic=assessmentResultMarkup(saved);
 assert.doesNotMatch(diagnostic,/Ստուգարքն անցած է|Ստուգարքը չի անցել|հանձնելիս/);
 assert.ok(diagnostic.includes(assessmentScopeText));
 const mastery=assessmentResultMarkup(result());assert.match(mastery,/Ստուգարքն անցած է · 22.5\/28 միավոր/);
 for(const g of groups)assert.ok(mastery.includes(g.label));
});

test('historical v2 results retain their own assessed denominator and supporting groups',()=>{
 const saved={schemaVersion:'haiedu-assessment-result-v2',passed:true,score:{correct:8,answered:10,percent:80},overallScore:{correct:14,answered:16,percent:87.5},groups:[{label:'Mandatory',correct:8,answered:10,percent:80,determinesPass:true},{label:'Supporting',correct:2,answered:2,percent:100,determinesPass:false},{label:'Additional',correct:4,answered:4,percent:100,determinesPass:false}]};
 const html=assessmentResultMarkup(saved);assert.match(html,/Ստուգարքն անցած է · 8\/10/);assert.match(html,/Supporting՝ 2\/2/);assert.match(html,/Additional՝ 4\/4/);assert.doesNotMatch(html,/14\/16/);assert.ok(html.includes(assessmentScopeText));
});

test('teacher and school aggregate renderer keeps saved group scopes separate',()=>{
 const root={innerHTML:''};
 renderEvidenceGroups(root,{analytics:{evidenceGroups:[{mode:'mastery_check',sessions:2,correct:42,answered:56,accuracy:75,reportingGroups:groups,passScore:{earned:45,possible:56},masteryPassed:1,contract:{policyBindingId:'english-fixture'}},{mode:'mastery_check',sessions:1,correct:8,answered:10,accuracy:80,reportingGroups:[{label:'Different scope',correct:8,answered:10,determinesPass:true}],passScore:{correct:8,answered:10},masteryPassed:1,contract:{policyBindingId:'other-fixture'}}]}});
 assert.ok(root.innerHTML.includes(assessmentScopeText));assert.match(root.innerHTML,/Ստուգարքն անցած աշխատանքներ՝ 1\/2/);assert.match(root.innerHTML,/Ստուգարքն անցած աշխատանքներ՝ 1\/1/);assert.match(root.innerHTML,/Different scope՝ 8\/10/);
 for(const g of groups)assert.ok(root.innerHTML.includes(g.label));
});

test('configured group labels remain escaped and are not interpreted as a subject or HTML',()=>{
 const saved=result();saved.groups=[{...groups[0],label:'<img src=x onerror=alert(1)>',determinesPass:false}];
 const html=assessmentResultMarkup(saved);assert.doesNotMatch(html,/<img|հանձնելիս/);assert.match(html,/&lt;img/);
 assert.equal(assessmentResultMarkup(null),'');assert.equal(assessmentResultMarkup({schemaVersion:'unknown'}),'');
});

test('saved v2/v3 groups distinguish no assessment from a genuine zero without changing the saved result',()=>{
 for(const points of [false,true]){
  const group=points?{earned:0,possible:3}:{correct:0,answered:3};
  const empty=points?{earned:0,possible:0}:{correct:0,answered:0};
  const saved={schemaVersion:'haiedu-assessment-result-v'+(points?3:2),score:null,passed:null,groups:[{label:'Assessed',...group,percent:0},{label:'Other group',...empty,percent:null}]};
  const before=structuredClone(saved),html=assessmentResultMarkup(saved);
  assert.match(html,/Assessed՝ 0\/3(?: միավոր)? · 0%/);
  assert.match(html,/data-assessment-state="unassessed">Other group՝ Չի գնահատվել/);
  assert.doesNotMatch(html,/0\/0|Ստուգարքն անցած է|Ստուգարքը չի անցել/);
  assert.deepEqual(saved,before);
 }
 for(const group of [{possible:null,earned:0},{possible:3,earned:null},{possible:0,earned:2}]){
  const html=assessmentGroupMarkup({label:'Unavailable',...group},{points:true});
  assert.match(html,/data-assessment-state="unavailable"/);assert.match(html,/Տվյալը հասանելի չէ/);assert.doesNotMatch(html,/Չի գնահատվել|NaN|undefined/);
 }
});

test('history can retain one accessible scope explanation while standalone results keep their full scope',()=>{
 const saved=result(),standalone=assessmentResultMarkup(saved),row=assessmentResultMarkup(saved,{includeScope:false});
 assert.ok(standalone.includes(assessmentScopeText));assert.ok(!row.includes(assessmentScopeText));
 const section=assessmentScopeMarkup({disclosure:true})+row+row;
 assert.equal((section.match(/data-assessment-scope/g)??[]).length,1);
 assert.match(section,/<details class="assessment-scope"><summary>Արդյունքների սահմանները<\/summary>/);
 assert.match(row,/Ստուգարքն անցած է · 22.5\/28 միավոր/);
});

test('school and master aggregates use the same empty-group distinction without combining contracts or adding percentages',()=>{
 const payload={analytics:{evidenceGroups:[{mode:'practice',sessions:2,correct:0,answered:3,accuracy:0,reportingGroups:[{label:'Observed zero',earned:0,possible:3,percent:0},{label:'Not assessed',earned:0,possible:0,percent:null}],contract:{policyBindingId:'points-contract'}},{mode:'practice',sessions:1,correct:2,answered:3,accuracy:66.67,reportingGroups:[{label:'Legacy group',correct:2,answered:3},{label:'Legacy empty',correct:0,answered:0}],contract:{policyBindingId:'legacy-contract'}}]}};
 const before=structuredClone(payload),root={innerHTML:''};renderEvidenceGroups(root,payload);
 assert.match(root.innerHTML,/Observed zero՝ 0\/3 միավոր<\/p>/);assert.match(root.innerHTML,/Legacy group՝ 2\/3/);
 assert.equal((root.innerHTML.match(/data-assessment-state="unassessed"/g)??[]).length,2);
 assert.doesNotMatch(root.innerHTML,/0\/0|Ստուգարքն անցած է|Ստուգարքը չի անցել/);
 assert.ok(root.innerHTML.includes('points-contract')&&root.innerHTML.includes('legacy-contract'));
 assert.deepEqual(payload,before);
});
