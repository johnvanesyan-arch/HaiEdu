import test from 'node:test';
import assert from 'node:assert/strict';
import {readLearningSelection,groupLearningContexts,contextHref,sameContext,sameCourse,resolveNavigationContext} from '../web/learning-navigation.mjs';
import {registeredExtensionHref} from '../web/learning-extensions.mjs';
import {estimateScopedEvidence} from '../supabase/functions/_shared/analytics-evidence.mjs';
import {aggregateSchoolPerformanceAnalytics} from '../supabase/functions/_shared/school-performance-analytics.ts';
const id=n=>`71000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const context={enrollmentId:id(1),curriculumReleaseId:id(2),unitId:id(3),subjectProgramId:id(4),subjectNameHy:'Առարկա',gradeNumber:8,unitSequence:1};
test('navigation groups disjoint releases by course while preserving every exact chapter context',()=>{
 const contexts=[context,{...context,enrollmentId:id(11),schoolId:id(12)},{...context,unitId:id(13),unitSequence:2},{...context,curriculumReleaseId:id(14)}];
 const groups=groupLearningContexts(contexts);assert.equal(groups.length,2);assert.equal(groups.find(x=>x.enrollmentId===id(1)).units.length,3);
 assert.deepEqual(new Set(groups.find(x=>x.enrollmentId===id(1)).units.map(x=>x.curriculumReleaseId)),new Set([id(2),id(14)]));
 const selection=readLearningSelection(new URL(contextHref(context),'https://test.invalid').search);assert.ok(sameContext(context,selection));
});
test('the same enrollment identifier cannot merge distinct programmes and duplicate contexts are not repeated',()=>{
 const second={...context,subjectProgramId:id(40),unitId:id(41),curriculumReleaseId:id(42)};
 const groups=groupLearningContexts([context,{...context},second]);assert.equal(groups.length,2);assert.ok(groups.every(g=>g.units.length===1));
});
test('active course identity spans chapter releases but preserves enrollment and programme boundaries',()=>{
 const secondChapter={...context,curriculumReleaseId:id(14),unitId:id(13)};
 assert.equal(sameCourse(context,secondChapter),true);
 assert.equal(sameContext(context,secondChapter),false);
 assert.equal(sameCourse(context,{...secondChapter,enrollmentId:id(11)}),false);
 assert.equal(sameCourse(context,{...secondChapter,subjectProgramId:id(40)}),false);
 assert.equal(sameCourse(null,context),false);
});
for(const bad of ['?unit='+id(3),'?enrollment='+id(1)+'&release='+id(2),'?enrollment=x&release='+id(2)+'&unit='+id(3),'?enrollment='+id(1)+'&release='+id(2)+'&unit='+id(3)+'&unit='+id(13)])test('incomplete/malformed/duplicate selection fails closed: '+bad,()=>assert.throws(()=>readLearningSelection(bad)));
test('only a uniquely authorized explicit registered extension can supply a legacy shortcut',()=>{
 const legacy={...context,extensionKey:'legacy-physics7-u01-v1'};
 assert.equal(resolveNavigationContext([legacy,{...legacy,enrollmentId:id(11)}],null,legacy.extensionKey),null);
 assert.equal(registeredExtensionHref(legacy.extensionKey,'practice',context),null);
 assert.match(registeredExtensionHref(legacy.extensionKey,'practice',legacy),/enrollment=/);
});
const model={id:'model-a',configuration:{mastery:{priorAlpha:2,priorBeta:2,minimumEvidenceCount:3,needsSupportBelow:.45,secureAtOrAbove:.72,hintedPositiveMultiplier:.65,incorrectEvidenceHintReduction:false,difficultyWeight:{formula:'0.8 + 0.1*difficulty',difficultyMin:1,difficultyMax:5}}}};
test('analytics uses the original frozen difficulty and explicit model; never a mutable item or default model',()=>{
 const rows=[{score:1,frozenItem:{difficulty:2},items:{difficulty:5}}];assert.equal(estimateScopedEvidence(rows,model).percent,60);
 assert.equal(estimateScopedEvidence(rows,null).percent,null);assert.equal(estimateScopedEvidence([{score:1,items:{difficulty:2}}],model).percent,null);
 const changed=structuredClone(model);changed.configuration.mastery.priorAlpha=8;assert.equal(estimateScopedEvidence(rows,changed).percent,82);
});
test('school evidence pairs enrollment with its actual student and separates original contracts',()=>{
 const enrollments=[{id:'ea',student_id:'sa'},{id:'eb',student_id:'sb'}];
 const session={institutional_class_enrollment_id:'ea',student_id:'sa',curriculum_release_id:'r',unit_code:'reused',mode:'diagnostic',status:'completed',academic_context_status:'exact',answered_count:4,correct_count:3,assessment_blueprint_id:'bp',learning_model_configuration_id:'m'};
 const result=aggregateSchoolPerformanceAnalytics({enrollments,sessions:[{...session,id:'a'},{...session,id:'b',learning_model_configuration_id:'other'},{...session,id:'forged',student_id:'sb'}],reviewSessions:[]});
 assert.equal(result.evidence.exactSessions,2);assert.equal(result.diagnostic.averageAccuracy,null);assert.equal(result.evidenceGroups.length,2);assert.ok(result.evidenceGroups.every(g=>g.accuracy===75));
});
