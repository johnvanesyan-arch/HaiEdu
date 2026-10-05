import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAuthorizedStudentLearningContext,StudentLearningContextDenied} from '../supabase/functions/_shared/student-learning-context.mjs';
import {contextFixture,id,now} from './fixtures/learning-context.mjs';
const resolve=(f,choice=f.choice,user=id(1))=>resolveAuthorizedStudentLearningContext(f.admin,user,choice,now);

test('student context uses exact institutional IDs and frozen chapter metadata',async()=>{
  const f=contextFixture(),c=await resolve(f);assert.equal(c.schoolId,id(10));assert.equal(c.classId,id(109));assert.equal(c.unitCode,'SUBJECT-0-UNIT-0');assert.equal(c.unitTitleHy,'Սառեցված վերնագիր');
});
test('two chapters and two subjects resolve independently without inferred routes or grade defaults',async()=>{
  const f=contextFixture();const a=await resolve(f),b=await resolve(f,{...f.choice,unitId:id(121)}),c=await resolve(f,{...f.choice,enrollmentId:id(212),curriculumReleaseId:id(204),unitId:id(220)});
  assert.notEqual(a.unitId,b.unitId);assert.notEqual(a.subjectId,c.subjectId);assert.equal(c.gradeNumber,8);assert.notEqual(a.curriculumReleaseId,c.curriculumReleaseId);
  await assert.rejects(resolve(f,{...f.choice,curriculumReleaseId:c.curriculumReleaseId,unitId:c.unitId}),StudentLearningContextDenied);
  await assert.rejects(resolve(f,{...f.choice,unitId:c.unitId}),StudentLearningContextDenied);
});
test('another school requires that students own enrollment; subject matching alone cannot grant access',async()=>{
  const f=contextFixture();await assert.rejects(resolve(f,{...f.choice,enrollmentId:id(312)}),StudentLearningContextDenied);
  assert.equal((await resolve(f,{...f.choice,enrollmentId:id(312)},id(2))).schoolId,id(20));
});
for(const [label,table,change,index] of [
 ['ended enrollment','institutional_class_enrollments',{valid_to:now.toISOString()},0],
 ['future enrollment','institutional_class_enrollments',{valid_from:'2026-10-06T00:00:00Z'},0],
 ['suspended student','profiles',{account_status:'suspended'},0],
 ['ended student membership','institutional_memberships',{status:'ended'},0],
 ['membership in another school','institutional_memberships',{school_id:id(20)},0],
 ['assignment in another class','teacher_assignments',{class_id:id(209)},0],
 ['ended teacher assignment','teacher_assignments',{valid_to:now.toISOString()},0],
 ['archived class','classes',{is_active:false},0],
 ['class in another school','classes',{school_id:id(20)},0],
 ['wrong class grade','classes',{grade_id:id(203)},0],
 ['setup year','academic_years',{status:'setup'},0],
 ['malformed year dates','academic_years',{ends_on:'invalid'},0],
 ['closed year dates','academic_years',{ends_on:'2026-09-30'},0],
 ['draft programme','subject_programs',{status:'draft'},0],
 ['future programme','subject_programs',{effective_from:'2026-10-06'},0],
 ['draft release','curriculum_releases',{status:'draft'},0],
 ['retired release','curriculum_releases',{status:'retired'},0],
 ['expired release','curriculum_releases',{effective_to:'2026-10-04'},0],
 ['unit missing from release','curriculum_release_units',{unit_id:id(999)},0],
 ['unit with another programme','units',{subject_program_id:id(201)},0],
 ['invalid snapshot sequence','curriculum_release_units',{sequence_order_snapshot:null},0],
 ['ended teacher membership','institutional_memberships',{status:'ended'},1],
 ['suspended teacher account','profiles',{account_status:'suspended'},2],
 ['revoked subject authorization','teacher_subject_authorizations',{status:'revoked'},0],
 ['unpublished subject','subjects',{status:'draft'},0],
])test(`student resolver denies ${label}`,async()=>{const f=contextFixture();Object.assign(f.tables[table][index],change);await assert.rejects(resolve(f),StudentLearningContextDenied);});
test('legacy membership without exact institutional enrollment never silently selects a class',async()=>{
 const f=contextFixture();f.tables.institutional_class_enrollments=[];await assert.rejects(resolve(f),StudentLearningContextDenied);
});
