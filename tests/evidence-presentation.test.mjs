import test from 'node:test';
import assert from 'node:assert/strict';
import {evidencePurposeGroups,evidenceSeparationMarkup,renderEvidenceGroups} from '../web/analytics-provenance.mjs';
import {skillEvidenceMarkup,skillEvidenceState,skillAttentionBand} from '../web/teacher-skill-evidence.mjs';
import {aggregateSchoolPerformanceAnalytics} from '../supabase/functions/_shared/school-performance-analytics.ts';

const contract=(mode,build='build-a')=>({mode,releaseId:'release',unitId:'unit',blueprintId:'blueprint-'+mode,policyBindingId:'binding-'+mode,modelId:'model',academicPolicyId:'policy',runtimeBuildId:build,provenanceStatus:'exact',modelProvenanceStatus:'exact',runtimeProvenanceStatus:'exact'});
const estimate=(mode,percent,build='build-a',lastAttemptAt='2026-11-04T09:00:00Z')=>({contract:contract(mode,build),percent,score:percent/100,status:percent<45?'needs_support':'secure',band:percent<45?'needs_support':'secure',evidenceCount:4,sessionCount:2,lastAttemptAt});

test('purpose sections put practice before baseline and retain every original version without mutation',()=>{
  const rows=[estimate('diagnostic',88),estimate('practice',38,'old','2026-10-01T00:00:00Z'),estimate('practice',75,'new')];
  const before=structuredClone(rows),groups=evidencePurposeGroups(rows);
  assert.deepEqual(groups.map(g=>g.mode),['practice','diagnostic']);
  assert.deepEqual(groups[0].entries.map(r=>r.contract.runtimeBuildId),['new','old']);
  assert.equal(groups[0].entries[1],rows[1]);assert.equal(groups.flatMap(g=>g.entries).length,3);
  assert.deepEqual(rows,before);
});

test('a different runtime alone never becomes proof of compatible scoring or a different model',()=>{
  const rows=[estimate('practice',38,'old'),estimate('practice',75,'new')];
  const html=evidenceSeparationMarkup(rows);
  assert.match(html,/համատեղելիությունը հաստատված չէ/);assert.match(html,/չեն միավորվում/);
  assert.doesNotMatch(html,/տարբեր են.*մոդել|Տարբեր են.*մոդել/);
  const changed=structuredClone(rows);changed[1].contract.modelId='other-model';
  assert.match(evidenceSeparationMarkup(changed),/հաշվարկի մոդելները/);
});

test('teacher purpose sections preserve all percentages, attention and original runtime IDs',()=>{
  const row={skillId:'s',code:'SYN-U-S01',nameHy:'Հմտություն',status:'mixed_contracts',band:'not_assessed',percent:null,evidenceCount:12,
    estimates:[estimate('diagnostic',88),estimate('practice',38,'old'),estimate('practice',75,'new')]};
  const before=structuredClone(row),html=skillEvidenceMarkup([row],'SYN-U',{subjectNameHy:'Առարկա',gradeLabelHy:'Դասարան',unitTitleHy:'Գլուխ'});
  assert.equal(skillEvidenceState(row).kind,'separate');assert.equal(skillAttentionBand(row),'needs_support');
  assert.ok(html.indexOf('data-evidence-purpose="practice"')<html.indexOf('data-evidence-purpose="diagnostic"'));
  for(const value of ['38%','75%','88%','old','new','4 պատասխան · 2 աշխատանք','Առարկա · Դասարան · Գլուխ'])assert.ok(html.includes(value),value);
  assert.match(html,/evidence-other-versions/);assert.match(html,/2 առանձին ցուցանիշ/);
  assert.deepEqual(row,before);
});

test('English and Physics labels remain context data and do not alter evidence classification',()=>{
  const row={skillId:'s',code:'ANY-U-S01',nameHy:'Հմտություն',...estimate('practice',75)};
  for(const subjectNameHy of ['Անգլերեն','Ֆիզիկա']){
    const html=skillEvidenceMarkup([row],'ANY-U',{subjectNameHy,gradeLabelHy:'7-րդ դասարան',unitTitleHy:'Ընտրված գլուխ'});
    assert.ok(html.includes(subjectNameHy));assert.match(html,/Կայուն · 75%/);assert.equal(skillAttentionBand(row),null);
  }
});

function schoolFixture(){
  const enrollments=['a','b'].map(id=>({id:'enrollment-'+id,student_id:'student-'+id,school_id:'school',academic_year_id:'year',class_id:'class-'+id,teacher_assignment_id:'assignment-'+id,subject_program_id:'programme'}));
  const sessions=enrollments.flatMap((e,index)=>['build-a','build-b'].map((build,n)=>({id:'session-'+index+'-'+n,student_id:e.student_id,institutional_class_enrollment_id:e.id,school_id:e.school_id,academic_year_id:e.academic_year_id,class_id:e.class_id,teacher_assignment_id:e.teacher_assignment_id,subject_program_id:e.subject_program_id,
    academic_context_status:'exact',mode:'practice',status:'completed',curriculum_release_id:'release',governed_unit_id:'unit',unit_code:'ANY-U',assessment_blueprint_id:'blueprint',assessment_policy_binding_id:'binding',learning_model_configuration_id:'model',runtime_build_id:build,
    answered_count:5,correct_count:index?0:4,completed_at:'2026-11-04T09:00:00Z'})));
  return {enrollments,sessions,reviewSessions:[]};
}

test('school evidence keeps classes and runtime versions separate while descriptive totals reconcile',()=>{
  const input=schoolFixture(),before=structuredClone(input),result=aggregateSchoolPerformanceAnalytics(input);
  assert.equal(result.evidenceGroups.length,4);
  assert.equal(result.evidence.completedSessions,4);assert.equal(result.enrollment.students,2);
  assert.equal(result.evidenceGroups.reduce((n,g)=>n+g.sessions,0),4);
  assert.equal(result.evidenceGroups.reduce((n,g)=>n+g.answered,0),20);
  assert.equal(result.evidenceGroups.reduce((n,g)=>n+g.correct,0),8);
  for(const klass of ['class-a','class-b'])assert.equal(result.evidenceGroups.filter(g=>g.context.classId===klass).length,2);
  assert.equal(result.evidenceGroups.filter(g=>g.accuracy===0).length,2);
  assert.deepEqual(input,before);
});

test('school and master presentation shows programme/class/chapter and retains exact hidden provenance',()=>{
  const analytics=aggregateSchoolPerformanceAnalytics(schoolFixture());
  const payload={scope:{history:true},options:{programmes:[{id:'programme',label:'Առարկա · 7-րդ դասարան'}],classes:[{id:'class-a',label:'7 Ա'},{id:'class-b',label:'7 Բ'}],releases:[{id:'release',subjectProgramId:'programme',label:'Թողարկում 1'}],units:[{id:'unit',curriculumReleaseId:'release',label:'Գլուխ I'}]},analytics};
  const before=structuredClone(payload),root={innerHTML:''};renderEvidenceGroups(root,payload);
  for(const value of ['Առարկա · 7-րդ դասարան','7 Ա','7 Բ','Գլուխ I','Թողարկում 1','0/5','0%','build-a','build-b'])assert.ok(root.innerHTML.includes(value),value);
  assert.match(root.innerHTML,/4 առանձին արդյունք/);assert.match(root.innerHTML,/evidence-other-versions/);
  assert.equal((root.innerHTML.match(/class="card evidence-version"/g)??[]).length,4);
  assert.equal((root.innerHTML.match(/evidence-technical-details/g)??[]).length,4);
  assert.deepEqual(payload,before);
});

test('unknown purposes and untrusted labels are literal text without losing original evidence',()=>{
  const root={innerHTML:''};renderEvidenceGroups(root,{options:{classes:[{id:'class',label:'<img onerror=bad()>'}]},analytics:{evidenceGroups:[{mode:'__proto__',context:{classId:'class'},sessions:1,correct:0,answered:1,accuracy:0,contract:{runtimeBuildId:'<script>bad()</script>'}}]}});
  assert.doesNotMatch(root.innerHTML,/<img|<script>/);assert.match(root.innerHTML,/&lt;img/);assert.match(root.innerHTML,/&lt;script/);
  assert.match(root.innerHTML,/Ուսումնական աշխատանք/);assert.match(root.innerHTML,/0\/1/);assert.match(root.innerHTML,/0%/);
});

test('an empty selected scope has an explicit empty result without a fabricated score',()=>{
  const root={innerHTML:''};renderEvidenceGroups(root,{analytics:{evidenceGroups:[]}});
  assert.match(root.innerHTML,/ավարտված աշխատանք դեռ չկա/);assert.doesNotMatch(root.innerHTML,/0\/0|0%/);
});
