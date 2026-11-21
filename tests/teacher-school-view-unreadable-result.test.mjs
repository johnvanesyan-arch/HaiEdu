// School teacher view: an unreadable saved result record stays neutral everywhere (Codex independent review,
// 21 November 2026). Real analytics builder plus the real school renderers; DOM writes are captured in stubs,
// so this is not a browser or backend integration test.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const delivered = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const candidate = delivered;
const moduleAt = (root, path) => import(pathToFileURL(`${root}/${path}`).href);
const reporting = await moduleAt(candidate, 'web/assessment-reporting.mjs');
const skills = await moduleAt(delivered, 'web/teacher-skill-evidence.mjs');
const provenance = await moduleAt(delivered, 'web/analytics-provenance.mjs');
const dates = await moduleAt(delivered, 'web/teacher-dates.mjs');
const {escapeHtml} = await moduleAt(delivered, 'web/text-safety.mjs');
const {buildExactInstitutionalStudentAnalytics} = await moduleAt(delivered, 'supabase/functions/_shared/institutional-teacher-analytics.ts');
const source = await readFile(`${candidate}/web/teacher.js`, 'utf8');
const rendererSource = source.slice(source.indexOf('const SCHOOL_MODE_LABELS ='), source.indexOf('let drawerLoadVersion=0;'));
assert.ok(rendererSource.includes('function renderSchoolRoster('));
assert.ok(rendererSource.includes('function renderSchoolStudentPanel('));
const badRecords = [
  {schemaVersion:'future-result-schema', passed:true},
  {schemaVersion:'haiedu-assessment-result-v2', passed:true, score:{correct:21,answered:20,percent:105},groups:[]},
  false,
];
function payload(record, result='failed') {
  return buildExactInstitutionalStudentAnalytics({
    student:{id:'synthetic-student',displayName:'Synthetic student',enrollmentId:'synthetic-enrollment'},
    context:{unitCode:'SYNTHETIC-U01'},skills:[],attempts:[],reviewSessions:[],
    sessions:[{id:'synthetic-check',student_id:'synthetic-student',institutional_class_enrollment_id:'synthetic-enrollment',
      curriculum_release_id:'synthetic-release',mode:'mastery_check',status:'completed',
      started_at:'2026-11-20T10:00:00Z',completed_at:'2026-11-20T10:05:00Z',
      academic_mastery_policy_id:'synthetic-policy',originalLifecyclePolicy:{maximum_mastery_attempts:3},
      assessment_result:result,score_percent:75,correct_count:15,answered_count:20,planned_item_count:20,
      metadata:record == null ? {} : {assessmentResultReporting:record}}],
  });
}
function render(data) {
  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id)) nodes.set(id,{innerHTML:'',textContent:'',querySelectorAll:()=>[]});
    return nodes.get(id);
  };
  const klass={students:[data],name:'Synthetic class',selectedUnit:{unitTitleHy:'Synthetic unit'}};
  const scope=vm.createContext({...reporting,...skills,...provenance,...dates,escapeHtml,$,
    dashboard:{institutionalTeacher:true},rosterQuery:'',openStudent:()=>{},shortSkillCode:x=>x,
    reviewData:data,reviewClass:klass});
  vm.runInContext(rendererSource,scope);
  vm.runInContext('renderSchoolRoster(reviewClass); renderSchoolStudentPanel(reviewData,reviewClass,null,null);',scope);
  return {row:$('roster').innerHTML,panel:$('studentDrawerContent').innerHTML};
}
const plain=html=>html.replace(/<[^>]+>/g,' ');

test('real analytics builder passes unknown saved format to both latest check and session history',()=>{
  const data=payload(badRecords[0]);
  assert.deepEqual(data.latestMasteryCheck.assessmentResult,badRecords[0]);
  assert.deepEqual(data.sessions[0].reporting,badRecords[0]);
  assert.equal(data.latestMasteryCheck.result,'failed');
  assert.equal(data.intervention.action,'required_chapter_review');
});
test('real analytics builder also preserves malformed current schema and false JSON',()=>{
  for(const record of badRecords.slice(1)) {
    const data=payload(record);
    assert.deepEqual(data.latestMasteryCheck.assessmentResult,record);
    assert.deepEqual(data.sessions[0].reporting,record);
  }
});
test('roster gives unknown/unreadable saved records a neutral status',()=>{
  for(const record of badRecords) {
    const {row}=render(payload(record));
    assert.doesNotMatch(row,/school-pill (?:passed|not-passed)/);
    assert.match(row,/Տվյալը հասանելի չէ/);
  }
});
test('panel check box stays neutral and does not fall back to the raw score',()=>{
  for(const record of badRecords) {
    const data=payload(record);
    const html=reporting.schoolCheckResultMarkup(data.latestMasteryCheck,data.sessions);
    assert.doesNotMatch(html,/data-testid="school-check-status"/);
    assert.match(html,/data-assessment-state="unavailable"/);
    assert.doesNotMatch(plain(html),/75%|15\s*\/\s*20/);
  }
});
test('attempt history stays neutral for each unreadable saved record',()=>{
  for(const record of badRecords) {
    const html=reporting.schoolAttemptMarkup(payload(record).sessions[0]);
    assert.doesNotMatch(plain(html),/Ստուգարքն անցած է|Ստուգարքը չի անցել|75%|15\s*\/\s*20/);
    assert.match(html,/data-assessment-state="unavailable"/);
  }
});
test('unreadable pass:true never causes the panel to say required review is optional',()=>{
  const data=payload(badRecords[0]);
  const {panel}=render(data);
  assert.match(panel,/Առաջնահերթ քայլ՝ ավարտել պահանջվող Գլխի կրկնությունը։/);
  assert.doesNotMatch(panel,/Գլխի կրկնությունը պարտադիր չէ։/);
});
test('older no-record pass/fail keeps the stored status and real session counts',()=>{
  for(const status of ['passed','failed']) {
    const data=payload(null,status);
    const {row,panel}=render(data);
    assert.match(row,new RegExp(`school-pill ${status==='passed'?'passed':'not-passed'}`));
    assert.match(panel,/15 \/ 20 · 75%/);
    assert.equal(panel.includes('Գլխի կրկնությունը պարտադիր չէ։'),status==='passed');
  }
});
test('supported saved result remains authoritative, including I-2 deciding score and points',()=>{
  const goodV2={schemaVersion:'haiedu-assessment-result-v2',passed:true,score:{correct:15,answered:18,percent:83},groups:[
    {label:'Scored',determinesPass:true,correct:15,answered:18,percent:83},
    {label:'Additional',determinesPass:false,correct:0,answered:2,percent:0}]};
  const data=payload(goodV2,'passed'),{row,panel}=render(data);
  assert.match(row,/school-pill passed/);
  assert.match(panel,/15\/18 · 83%/);
  assert.match(panel,/Additional՝ 0\/2 · 0%/);
  assert.doesNotMatch(panel,/75%|15 \/ 20/);
  const points={schemaVersion:'haiedu-assessment-result-v3',passed:false,score:{earned:7.5,possible:10,percent:75},groups:[]};
  assert.match(reporting.schoolCheckResultMarkup(payload(points).latestMasteryCheck),/7\.5\/10 միավոր · 75%/);
});
