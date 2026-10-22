import test from 'node:test';
import assert from 'node:assert/strict';
import { additionalContexts, ownNavigation, ownStudentClasses } from '../scripts/qa-programme-fixtures.mjs';

const f = { schoolId:'school-a',classId:'class-a',assignmentId:'assignment-a',studentId:'student-a',teacherId:'teacher-a',adminId:'admin-a' };
const c = { ...f,baseClassId:f.classId,baseAssignmentId:f.assignmentId,classId:'extra-class',teacherAssignmentId:'extra-assignment',enrollmentId:'extra-enrollment',subjectProgramId:'extra-programme',curriculumReleaseId:'extra-release',unitId:'extra-unit' };
const manifest = { schemaVersion:'haiedu-designated-programme-fixtures-v1',dedicatedQa:true,contexts:[c] };

test('multiple subject classes require the exact designated people and base assignment',()=>{
  assert.deepEqual(additionalContexts(f,manifest),[c]);
  for(const k of ['schoolId','studentId','teacherId','adminId','classId','assignmentId']) assert.deepEqual(additionalContexts({...f,[k]:'other'},manifest),[]);
  assert.throws(()=>additionalContexts(f,{...manifest,dedicatedQa:false}));
});
test('navigation admits exact extra programme contexts and rejects foreign or mixed identities',()=>{
  const original={schoolId:f.schoolId,classId:f.classId};
  assert.equal(ownNavigation([original,c],f,manifest),true);
  for(const k of ['schoolId','classId','teacherAssignmentId','enrollmentId','subjectProgramId','curriculumReleaseId','unitId']) assert.equal(ownNavigation([original,{...c,[k]:'other'}],f,manifest),false,k);
  assert.equal(ownNavigation([],f,manifest),false);
});
test('class projection requires all registered classes exactly once and rejects arbitrary same-school classes',()=>{
  const classes=[{id:f.classId},{id:c.classId}];
  assert.equal(ownStudentClasses({classes},f,manifest),true);
  for(const x of [classes.slice(0,1),[classes[0],classes[0]],[...classes,{id:'other'}],[classes[0],{id:'other'}]]) assert.equal(ownStudentClasses({classes:x},f,manifest),false);
});
test('existing synthetic fixtures retain the original single-class contract',()=>{
  const other={...f,studentId:'unregistered'};
  assert.equal(ownStudentClasses({classes:[{id:f.classId}]},other,manifest),true);
  assert.equal(ownNavigation([c],other,manifest),false);
});
